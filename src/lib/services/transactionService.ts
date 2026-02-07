/**
 * Transaction Service - Tier-One Business Logic
 * Handles transactions with offline-first API integration
 * - Online: Uses API, caches to Dexie
 * - Offline: Uses Dexie, queues changes for sync
 */

import { db } from '@/db';
import { generateId, type Transaction, TransactionType } from '@/types';
import { validateTransaction } from '@/lib/validators';
import { transactionApi, networkStatus } from '@/lib/api';
import { startOfMonth, endOfMonth, format, subMonths, subDays } from 'date-fns';

// =============================================================================
// Types
// =============================================================================

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  accountId: string;
  categoryId: string;
  description: string;
  date?: Date;
  toAccountId?: string;
  payee?: string;
  notes?: string;
  tagIds?: string[];
  attachments?: string[];
  isRecurring?: boolean;
  recurringId?: string;
  isPending?: boolean;
  location?: { name: string; latitude?: number; longitude?: number };
}

export interface TransactionWithDetails extends Transaction {
  accountName?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  categoryIds?: string[];
  accountIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
  isRecurring?: boolean;
  isPending?: boolean;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  transactionCount: number;
  averageExpense: number;
  largestExpense: Transaction | null;
  byCategory: Map<string, { total: number; count: number }>;
  byDay: Map<string, { income: number; expense: number }>;
}

export interface SpendingTrend {
  date: string;
  income: number;
  expense: number;
  net: number;
}

// =============================================================================
// Offline Queue Management
// =============================================================================

interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'fintrace_transaction_sync_queue';

function getSyncQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSyncQueue(queue: SyncQueueItem[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }
}

function queueForSync(operation: 'CREATE' | 'UPDATE' | 'DELETE', entityId: string, data: Record<string, unknown>): void {
  const queue = getSyncQueue();
  queue.push({
    id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    operation,
    entityId,
    data,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  });
  saveSyncQueue(queue);
}

// =============================================================================
// Transaction CRUD
// =============================================================================

/**
 * Create a new transaction
 */
export async function createTransaction(input: CreateTransactionInput, userId: string): Promise<string> {
  const validation = validateTransaction({
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    categoryId: input.categoryId,
    description: input.description,
    date: input.date,
  });

  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  const transactionId = generateId();
  const now = new Date().toISOString();
  const transactionDate = input.date ? format(input.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  const transaction: Transaction = {
    id: transactionId,
    userId,
    type: input.type,
    amount: input.amount,
    currency: 'INR',
    accountId: input.accountId,
    toAccountId: input.toAccountId,
    categoryId: input.categoryId,
    description: input.description,
    payee: input.payee,
    notes: input.notes,
    date: transactionDate,
    tagIds: input.tagIds || [],
    attachments: input.attachments || [],
    isRecurring: input.isRecurring || false,
    recurringId: input.recurringId,
    isFamilyTransaction: false,
    isPending: input.isPending || false,
    isExcludedFromStats: input.type === TransactionType.TRANSFER,
    location: input.location,
    createdAt: now,
    updatedAt: now,
  };

  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiTransaction = await transactionApi.create({
        accountId: input.accountId,
        categoryId: input.categoryId,
        type: input.type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'TRANSFER',
        amount: input.amount,
        date: transactionDate,
        description: input.description,
        notes: input.notes,
        payee: input.payee,
        isRecurring: input.isRecurring,
        tags: input.tagIds,
      });
      transaction.id = apiTransaction.id;

      // Save to local cache and update account balance
      await db.transaction('rw', [db.transactions, db.accounts], async () => {
        await db.transactions.add(transaction);
        await updateAccountBalance(input.accountId, input.amount, input.type, input.toAccountId, input.isPending);
      });

      return apiTransaction.id;
    } catch (error) {
      console.warn('API create failed, saving locally:', error);
    }
  }

  // Offline: Save locally and queue for sync
  await db.transaction('rw', [db.transactions, db.accounts], async () => {
    await db.transactions.add(transaction);
    await updateAccountBalance(input.accountId, input.amount, input.type, input.toAccountId, input.isPending);
  });

  queueForSync('CREATE', transactionId, transaction as unknown as Record<string, unknown>);
  return transactionId;
}

// Helper to update account balance
async function updateAccountBalance(
  accountId: string,
  amount: number,
  type: TransactionType,
  toAccountId?: string,
  isPending?: boolean
): Promise<void> {
  if (isPending) return;

  const now = new Date().toISOString();
  const account = await db.accounts.get(accountId);
  if (!account) return;

  let newBalance = account.balance;
  if (type === TransactionType.EXPENSE) {
    newBalance -= amount;
  } else if (type === TransactionType.INCOME) {
    newBalance += amount;
  } else if (type === TransactionType.TRANSFER && toAccountId) {
    newBalance -= amount;
    const toAccount = await db.accounts.get(toAccountId);
    if (toAccount) {
      await db.accounts.update(toAccountId, { balance: toAccount.balance + amount, updatedAt: now });
    }
  }

  await db.accounts.update(accountId, { balance: newBalance, updatedAt: now });
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(transactionId: string, updates: Partial<CreateTransactionInput>): Promise<void> {
  const existingTransaction = await db.transactions.get(transactionId);
  if (!existingTransaction) {
    throw new Error('Transaction not found');
  }

  const now = new Date().toISOString();

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await transactionApi.update(transactionId, {
        accountId: updates.accountId,
        categoryId: updates.categoryId,
        type: updates.type?.toUpperCase() as 'INCOME' | 'EXPENSE' | 'TRANSFER' | undefined,
        amount: updates.amount,
        date: updates.date ? format(updates.date, 'yyyy-MM-dd') : undefined,
        description: updates.description,
        notes: updates.notes,
        payee: updates.payee,
      });
    } catch (error) {
      console.warn('API update failed, queuing for sync:', error);
      queueForSync('UPDATE', transactionId, updates as Record<string, unknown>);
    }
  } else {
    queueForSync('UPDATE', transactionId, updates as Record<string, unknown>);
  }

  // Update local DB with balance adjustments
  await db.transaction('rw', [db.transactions, db.accounts], async () => {
    // Reverse old transaction's effect
    if (!existingTransaction.isPending) {
      await reverseTransactionBalance(existingTransaction);
    }

    // Apply new transaction
    const newAmount = updates.amount ?? existingTransaction.amount;
    const newType = updates.type || existingTransaction.type;
    const newAccountId = updates.accountId || existingTransaction.accountId;
    const isPending = updates.isPending ?? existingTransaction.isPending;

    if (!isPending) {
      await updateAccountBalance(newAccountId, newAmount, newType, updates.toAccountId || existingTransaction.toAccountId, false);
    }

    await db.transactions.update(transactionId, {
      ...updates,
      date: updates.date ? format(updates.date, 'yyyy-MM-dd') : existingTransaction.date,
      updatedAt: now,
    });
  });
}

// Helper to reverse transaction balance
async function reverseTransactionBalance(transaction: Transaction): Promise<void> {
  const now = new Date().toISOString();
  const account = await db.accounts.get(transaction.accountId);
  if (!account) return;

  let revertedBalance = account.balance;
  if (transaction.type === TransactionType.EXPENSE) {
    revertedBalance += transaction.amount;
  } else if (transaction.type === TransactionType.INCOME) {
    revertedBalance -= transaction.amount;
  } else if (transaction.type === TransactionType.TRANSFER && transaction.toAccountId) {
    revertedBalance += transaction.amount;
    const toAccount = await db.accounts.get(transaction.toAccountId);
    if (toAccount) {
      await db.accounts.update(transaction.toAccountId, { balance: toAccount.balance - transaction.amount, updatedAt: now });
    }
  }

  await db.accounts.update(transaction.accountId, { balance: revertedBalance, updatedAt: now });
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  const transaction = await db.transactions.get(transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await transactionApi.delete(transactionId);
    } catch (error) {
      console.warn('API delete failed, queuing for sync:', error);
      queueForSync('DELETE', transactionId, { id: transactionId });
    }
  } else {
    queueForSync('DELETE', transactionId, { id: transactionId });
  }

  await db.transaction('rw', [db.transactions, db.accounts], async () => {
    if (!transaction.isPending) {
      await reverseTransactionBalance(transaction);
    }
    await db.transactions.delete(transactionId);
  });
}

// =============================================================================
// Query Operations
// =============================================================================

/**
 * Get transactions with filters
 */
export async function getTransactions(
  userId: string,
  filters?: TransactionFilters,
  limit?: number
): Promise<TransactionWithDetails[]> {
  // Try to fetch from API if online (for fresh data)
  if (networkStatus.isOnline() && !filters?.startDate) {
    try {
      const result = await transactionApi.getAll({
        type: filters?.type?.toUpperCase() as 'INCOME' | 'EXPENSE' | 'TRANSFER' | undefined,
        startDate: filters?.startDate ? format(filters.startDate, 'yyyy-MM-dd') : undefined,
        endDate: filters?.endDate ? format(filters.endDate, 'yyyy-MM-dd') : undefined,
        minAmount: filters?.minAmount,
        maxAmount: filters?.maxAmount,
        search: filters?.searchQuery,
        limit: limit || 50,
      });

      // Cache to local DB
      for (const tx of result.transactions) {
        const existing = await db.transactions.get(tx.id);
        if (!existing) {
          await db.transactions.add({
            id: tx.id,
            userId,
            type: tx.type.toLowerCase() as TransactionType,
            amount: tx.amount,
            currency: 'INR',
            accountId: tx.accountId,
            categoryId: tx.categoryId,
            description: tx.description || '',
            date: tx.date,
            tagIds: tx.tags || [],
            attachments: tx.attachments || [],
            isRecurring: tx.isRecurring,
            isFamilyTransaction: false,
            isPending: false,
            isExcludedFromStats: tx.type === 'TRANSFER',
            payee: tx.payee ?? undefined,
            notes: tx.notes ?? undefined,
            createdAt: tx.createdAt,
            updatedAt: tx.updatedAt,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch transactions from API:', error);
    }
  }

  // Query local DB
  let transactions = await db.transactions.where({ userId }).reverse().sortBy('date');

  if (filters) {
    if (filters.startDate) {
      const startStr = format(filters.startDate, 'yyyy-MM-dd');
      transactions = transactions.filter(t => t.date >= startStr);
    }
    if (filters.endDate) {
      const endStr = format(filters.endDate, 'yyyy-MM-dd');
      transactions = transactions.filter(t => t.date <= endStr);
    }
    if (filters.type) {
      transactions = transactions.filter(t => t.type === filters.type);
    }
    if (filters.categoryIds?.length) {
      transactions = transactions.filter(t => filters.categoryIds!.includes(t.categoryId));
    }
    if (filters.accountIds?.length) {
      transactions = transactions.filter(t => filters.accountIds!.includes(t.accountId));
    }
    if (filters.minAmount !== undefined) {
      transactions = transactions.filter(t => t.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      transactions = transactions.filter(t => t.amount <= filters.maxAmount!);
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(query) ||
        t.payee?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query)
      );
    }
    if (filters.isRecurring !== undefined) {
      transactions = transactions.filter(t => t.isRecurring === filters.isRecurring);
    }
    if (filters.isPending !== undefined) {
      transactions = transactions.filter(t => t.isPending === filters.isPending);
    }
  }

  if (limit) {
    transactions = transactions.slice(0, limit);
  }

  // Enrich with details
  const categories = await db.categories.toArray();
  const accounts = await db.accounts.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const accountMap = new Map(accounts.map(a => [a.id, a]));

  return transactions.map(t => {
    const category = categoryMap.get(t.categoryId);
    const account = accountMap.get(t.accountId);
    return {
      ...t,
      accountName: account?.name,
      categoryName: category?.name,
      categoryIcon: category?.icon,
      categoryColor: category?.color,
    };
  });
}

/**
 * Get recent transactions for dashboard
 */
export async function getRecentTransactions(userId: string, limit = 10): Promise<TransactionWithDetails[]> {
  return getTransactions(userId, undefined, limit);
}

// =============================================================================
// Analytics
// =============================================================================

/**
 * Get transaction statistics for a period
 */
export async function getTransactionStats(userId: string, startDate: Date, endDate: Date): Promise<TransactionStats> {
  // Try API first
  if (networkStatus.isOnline()) {
    try {
      const apiStats = await transactionApi.getStats(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      return {
        totalIncome: apiStats.totalIncome,
        totalExpense: apiStats.totalExpense,
        netFlow: apiStats.netFlow,
        transactionCount: apiStats.transactionCount,
        averageExpense: apiStats.averageTransaction,
        largestExpense: null,
        byCategory: new Map(apiStats.byCategory.map(c => [c.categoryId, { total: c.amount, count: c.count }])),
        byDay: new Map(apiStats.byDay.map(d => [d.date, { income: d.income, expense: d.expense }])),
      };
    } catch (error) {
      console.warn('Failed to fetch stats from API:', error);
    }
  }

  // Calculate locally
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const transactions = await db.transactions
    .where({ userId })
    .filter(t => t.date >= startStr && t.date <= endStr && !t.isExcludedFromStats)
    .toArray();

  let totalIncome = 0;
  let totalExpense = 0;
  let expenseCount = 0;
  let largestExpense: Transaction | null = null;
  const byCategory = new Map<string, { total: number; count: number }>();
  const byDay = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    if (t.type === TransactionType.INCOME) {
      totalIncome += t.amount;
    } else if (t.type === TransactionType.EXPENSE) {
      totalExpense += t.amount;
      expenseCount++;
      if (!largestExpense || t.amount > largestExpense.amount) {
        largestExpense = t;
      }
    }

    if (!byCategory.has(t.categoryId)) {
      byCategory.set(t.categoryId, { total: 0, count: 0 });
    }
    const cat = byCategory.get(t.categoryId)!;
    cat.total += t.amount;
    cat.count++;

    if (!byDay.has(t.date)) {
      byDay.set(t.date, { income: 0, expense: 0 });
    }
    const day = byDay.get(t.date)!;
    if (t.type === TransactionType.INCOME) day.income += t.amount;
    else if (t.type === TransactionType.EXPENSE) day.expense += t.amount;
  }

  return {
    totalIncome,
    totalExpense,
    netFlow: totalIncome - totalExpense,
    transactionCount: transactions.length,
    averageExpense: expenseCount > 0 ? totalExpense / expenseCount : 0,
    largestExpense,
    byCategory,
    byDay,
  };
}

/**
 * Get spending trend for charts
 */
export async function getSpendingTrend(userId: string, period: 'week' | 'month' | 'year'): Promise<SpendingTrend[]> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week': startDate = subDays(now, 7); break;
    case 'month': startDate = subDays(now, 30); break;
    case 'year': startDate = subMonths(now, 12); break;
  }

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(now, 'yyyy-MM-dd');

  const transactions = await db.transactions
    .where({ userId })
    .filter(t => t.date >= startStr && t.date <= endStr && !t.isExcludedFromStats)
    .toArray();

  const byDate = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    const dateKey = period === 'year' ? format(new Date(t.date), 'yyyy-MM') : t.date;
    if (!byDate.has(dateKey)) byDate.set(dateKey, { income: 0, expense: 0 });

    const day = byDate.get(dateKey)!;
    if (t.type === TransactionType.INCOME) day.income += t.amount;
    else if (t.type === TransactionType.EXPENSE) day.expense += t.amount;
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  return sortedDates.map(dateKey => {
    const { income, expense } = byDate.get(dateKey)!;
    return { date: dateKey, income, expense, net: income - expense };
  });
}

/**
 * Get top spending categories
 */
export async function getTopCategories(
  userId: string,
  startDate: Date,
  endDate: Date,
  limit = 5
): Promise<Array<{ categoryId: string; categoryName: string; total: number; percentage: number }>> {
  const stats = await getTransactionStats(userId, startDate, endDate);
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  return Array.from(stats.byCategory.entries())
    .filter(([catId]) => {
      const cat = categoryMap.get(catId);
      return cat?.type === 'expense';
    })
    .map(([categoryId, { total }]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId)?.name || 'Unknown',
      total,
      percentage: stats.totalExpense > 0 ? (total / stats.totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/**
 * Sync pending offline changes
 */
export async function syncPendingChanges(): Promise<{ synced: number; failed: number }> {
  if (!networkStatus.isOnline()) return { synced: 0, failed: 0 };

  const queue = getSyncQueue();
  let synced = 0;
  let failed = 0;
  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      switch (item.operation) {
        case 'CREATE':
          const tx = await db.transactions.get(item.entityId);
          if (tx) {
            await transactionApi.create({
              accountId: tx.accountId,
              categoryId: tx.categoryId,
              type: tx.type.toUpperCase() as any,
              amount: tx.amount,
              date: tx.date,
              description: tx.description,
            });
          }
          break;
        case 'UPDATE':
          await transactionApi.update(item.entityId, item.data as any);
          break;
        case 'DELETE':
          await transactionApi.delete(item.entityId);
          break;
      }
      synced++;
    } catch {
      if (item.retryCount < 3) {
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
      }
      failed++;
    }
  }

  saveSyncQueue(remaining);
  return { synced, failed };
}

// =============================================================================
// Exports
// =============================================================================

export const transactionService = {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactions,
  getRecentTransactions,
  getTransactionStats,
  getSpendingTrend,
  getTopCategories,
  syncPendingChanges,
};

export default transactionService;
