/**
 * Account Service - Tier-One Business Logic
 * Handles account management with offline-first API integration
 * - Online: Uses API, caches to Dexie
 * - Offline: Uses Dexie, queues changes for sync
 */

import { db } from '@/db';
import { generateId, type Account, AccountType, TransactionType, type Currency } from '@/types';
import { validateAccount } from '@/lib/validators';
import { accountApi, networkStatus } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance: number;
  currency?: Currency;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  includeInTotal?: boolean;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  notes?: string;
}

export interface AccountSummary {
  totalAccounts: number;
  totalBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountsByType: Record<string, { count: number; balance: number }>;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  date?: Date;
}

// =============================================================================
// Constants
// =============================================================================

const ACCOUNT_TYPE_CONFIG: Record<AccountType, {
  icon: string;
  color: string;
  isLiability: boolean;
  defaultName: string;
}> = {
  [AccountType.BANK]: { icon: 'Building2', color: '#3B82F6', isLiability: false, defaultName: 'Bank Account' },
  [AccountType.CASH]: { icon: 'Wallet', color: '#10B981', isLiability: false, defaultName: 'Cash' },
  [AccountType.CREDIT_CARD]: { icon: 'CreditCard', color: '#F97316', isLiability: true, defaultName: 'Credit Card' },
  [AccountType.WALLET]: { icon: 'PiggyBank', color: '#8B5CF6', isLiability: false, defaultName: 'Digital Wallet' },
  [AccountType.INVESTMENT]: { icon: 'TrendingUp', color: '#06B6D4', isLiability: false, defaultName: 'Investment Account' },
  [AccountType.LOAN]: { icon: 'FileText', color: '#EF4444', isLiability: true, defaultName: 'Loan Account' },
  [AccountType.OTHER]: { icon: 'Wallet', color: '#6B7280', isLiability: false, defaultName: 'Other Account' },
};

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

const SYNC_QUEUE_KEY = 'fintrace_account_sync_queue';

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
// Account CRUD
// =============================================================================

/**
 * Create a new account
 */
export async function createAccount(input: CreateAccountInput, userId: string): Promise<string> {
  const validation = validateAccount({
    name: input.name,
    type: input.type as 'bank' | 'cash' | 'credit_card' | 'wallet' | 'investment',
    balance: input.balance,
    color: input.color,
  });

  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  const accountId = generateId();
  const now = new Date().toISOString();
  const typeConfig = ACCOUNT_TYPE_CONFIG[input.type];

  if (input.isDefault) {
    await db.accounts.where({ userId }).modify({ isDefault: false });
  }

  const accountCount = await db.accounts.where({ userId }).count();

  const account: Account = {
    id: accountId,
    userId,
    name: input.name,
    type: input.type,
    balance: typeConfig.isLiability ? -Math.abs(input.balance) : input.balance,
    initialBalance: typeConfig.isLiability ? -Math.abs(input.balance) : input.balance,
    currency: input.currency || 'INR',
    color: input.color || typeConfig.color,
    icon: input.icon || typeConfig.icon,
    isDefault: input.isDefault || false,
    isArchived: false,
    isFamilyShared: false,
    includeInTotal: input.includeInTotal ?? true,
    sortOrder: accountCount,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    ifscCode: input.ifscCode,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiAccount = await accountApi.create({
        name: input.name,
        type: input.type.toUpperCase() as 'BANK' | 'CASH' | 'CREDIT_CARD' | 'WALLET' | 'INVESTMENT' | 'LOAN' | 'OTHER',
        balance: input.balance,
        currency: input.currency,
        color: input.color,
        icon: input.icon,
        institution: input.bankName,
        accountNumber: input.accountNumber,
        includeInTotal: input.includeInTotal,
      });
      account.id = apiAccount.id;
      await db.accounts.add(account);
      return apiAccount.id;
    } catch (error) {
      console.warn('API create failed, saving locally:', error);
    }
  }

  // Offline: Save locally and queue for sync
  await db.accounts.add(account);
  queueForSync('CREATE', accountId, account as unknown as Record<string, unknown>);
  return accountId;
}

/**
 * Get account by ID
 */
export async function getAccount(accountId: string): Promise<Account | null> {
  const account = await db.accounts.get(accountId);
  return account || null;
}

/**
 * Get all accounts for user
 */
export async function getAccounts(userId: string): Promise<Account[]> {
  // Try to refresh from API if online
  if (networkStatus.isOnline()) {
    try {
      const apiAccounts = await accountApi.getAll();
      // Cache to local DB
      await db.transaction('rw', db.accounts, async () => {
        for (const acc of apiAccounts) {
          const existing = await db.accounts.get(acc.id);
          if (existing) {
            await db.accounts.update(acc.id, {
              name: acc.name,
              balance: acc.balance,
              color: acc.color || undefined,
              icon: acc.icon || undefined,
              isArchived: acc.isArchived,
              includeInTotal: acc.includeInTotal,
              updatedAt: acc.updatedAt,
            });
          } else {
            await db.accounts.add({
              id: acc.id,
              userId,
              name: acc.name,
              type: acc.type.toLowerCase() as AccountType,
              balance: acc.balance,
              initialBalance: acc.balance,
              currency: (acc.currency || 'INR') as Currency,
              color: acc.color || '#6B7280',
              icon: acc.icon || 'Wallet',
              isDefault: false,
              isArchived: acc.isArchived,
              isFamilyShared: false,
              includeInTotal: acc.includeInTotal,
              sortOrder: 0,
              bankName: acc.institution || undefined,
              accountNumber: acc.accountNumber || undefined,
              createdAt: acc.createdAt,
              updatedAt: acc.updatedAt,
            });
          }
        }
      });
    } catch (error) {
      console.warn('Failed to fetch accounts from API:', error);
    }
  }

  return db.accounts.where({ userId }).filter(a => !a.isArchived).sortBy('sortOrder');
}

/**
 * Update account
 */
export async function updateAccount(accountId: string, updates: Partial<CreateAccountInput>): Promise<void> {
  const account = await db.accounts.get(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  const now = new Date().toISOString();
  const updateData: Partial<Account> = { updatedAt: now };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
  if (updates.includeInTotal !== undefined) updateData.includeInTotal = updates.includeInTotal;
  if (updates.bankName !== undefined) updateData.bankName = updates.bankName;
  if (updates.accountNumber !== undefined) updateData.accountNumber = updates.accountNumber;
  if (updates.ifscCode !== undefined) updateData.ifscCode = updates.ifscCode;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.currency !== undefined) updateData.currency = updates.currency;

  if (updates.balance !== undefined) {
    const type = updates.type ?? account.type;
    const typeConfig = ACCOUNT_TYPE_CONFIG[type];
    updateData.balance = typeConfig.isLiability ? -Math.abs(updates.balance) : updates.balance;
  }

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await accountApi.update(accountId, {
        name: updates.name,
        type: updates.type?.toUpperCase() as 'BANK' | 'CASH' | 'CREDIT_CARD' | 'WALLET' | 'INVESTMENT' | 'LOAN' | 'OTHER' | undefined,
        balance: updates.balance,
        color: updates.color,
        icon: updates.icon,
        institution: updates.bankName,
        accountNumber: updates.accountNumber,
        includeInTotal: updates.includeInTotal,
      });
    } catch (error) {
      console.warn('API update failed, queuing for sync:', error);
      queueForSync('UPDATE', accountId, updateData as Record<string, unknown>);
    }
  } else {
    queueForSync('UPDATE', accountId, updateData as Record<string, unknown>);
  }

  await db.accounts.update(accountId, updateData);
}

/**
 * Archive account (soft delete)
 */
export async function archiveAccount(accountId: string): Promise<void> {
  const account = await db.accounts.get(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  const pendingTransactions = await db.transactions.where({ accountId }).filter(t => t.isPending).count();
  if (pendingTransactions > 0) {
    throw new Error(`Cannot archive account with ${pendingTransactions} pending transactions`);
  }

  await db.accounts.update(accountId, {
    isArchived: true,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete account permanently
 */
export async function deleteAccount(accountId: string): Promise<void> {
  const account = await db.accounts.get(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  const transactionCount = await db.transactions.where({ accountId }).count();
  if (transactionCount > 0) {
    throw new Error(`Cannot delete account with ${transactionCount} transactions. Archive it instead.`);
  }

  if (networkStatus.isOnline()) {
    try {
      await accountApi.delete(accountId);
    } catch (error) {
      console.warn('API delete failed, queuing for sync:', error);
      queueForSync('DELETE', accountId, { id: accountId });
    }
  } else {
    queueForSync('DELETE', accountId, { id: accountId });
  }

  await db.accounts.delete(accountId);
}

// =============================================================================
// Balance Operations
// =============================================================================

/**
 * Update account balance
 */
export async function updateBalance(accountId: string, amount: number, operation: 'add' | 'subtract' | 'set'): Promise<number> {
  const account = await db.accounts.get(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  let newBalance: number;
  switch (operation) {
    case 'add': newBalance = account.balance + amount; break;
    case 'subtract': newBalance = account.balance - amount; break;
    case 'set': newBalance = amount; break;
  }

  await db.accounts.update(accountId, { balance: newBalance, updatedAt: new Date().toISOString() });
  return newBalance;
}

/**
 * Transfer between accounts
 */
export async function transferBetweenAccounts(input: TransferInput, userId: string): Promise<string> {
  const { fromAccountId, toAccountId, amount, description, date } = input;

  if (amount <= 0) throw new Error('Transfer amount must be positive');
  if (fromAccountId === toAccountId) throw new Error('Cannot transfer to the same account');

  const fromAccount = await db.accounts.get(fromAccountId);
  const toAccount = await db.accounts.get(toAccountId);
  if (!fromAccount || !toAccount) throw new Error('One or both accounts not found');

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await accountApi.transfer(fromAccountId, toAccountId, amount, description);
    } catch (error) {
      console.warn('API transfer failed:', error);
    }
  }

  const transactionId = generateId();
  const now = new Date().toISOString();
  const transactionDate = date ? date.toISOString().split('T')[0] : now.split('T')[0];

  await db.transaction('rw', [db.accounts, db.transactions], async () => {
    await db.accounts.update(fromAccountId, { balance: fromAccount.balance - amount, updatedAt: now });
    await db.accounts.update(toAccountId, { balance: toAccount.balance + amount, updatedAt: now });

    await db.transactions.add({
      id: transactionId,
      userId,
      type: TransactionType.TRANSFER,
      amount,
      currency: 'INR',
      accountId: fromAccountId,
      toAccountId,
      categoryId: 'transfer',
      description: description || `Transfer to ${toAccount.name}`,
      date: transactionDate,
      tagIds: [],
      attachments: [],
      isRecurring: false,
      isFamilyTransaction: false,
      isPending: false,
      isExcludedFromStats: true,
      createdAt: now,
      updatedAt: now,
    });
  });

  return transactionId;
}

// =============================================================================
// Summary & Analytics
// =============================================================================

/**
 * Get account summary for dashboard
 */
export async function getAccountSummary(userId: string): Promise<AccountSummary> {
  // Try API first
  if (networkStatus.isOnline()) {
    try {
      const summary = await accountApi.getSummary();
      return {
        totalAccounts: Object.values(summary.accountsByType).reduce((sum, t) => sum + t.count, 0),
        totalBalance: summary.totalBalance,
        totalAssets: summary.totalAssets,
        totalLiabilities: summary.totalLiabilities,
        netWorth: summary.totalAssets - summary.totalLiabilities,
        accountsByType: summary.accountsByType,
      };
    } catch (error) {
      console.warn('Failed to fetch summary from API:', error);
    }
  }

  // Calculate locally
  const accounts = await db.accounts.where({ userId }).filter(a => !a.isArchived).toArray();
  const accountsByType: Record<string, { count: number; balance: number }> = {};
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const account of accounts) {
    if (!accountsByType[account.type]) accountsByType[account.type] = { count: 0, balance: 0 };
    accountsByType[account.type].count++;
    accountsByType[account.type].balance += account.balance;

    if (account.includeInTotal) {
      if (account.balance >= 0) totalAssets += account.balance;
      else totalLiabilities += Math.abs(account.balance);
    }
  }

  return {
    totalAccounts: accounts.length,
    totalBalance: accounts.filter(a => a.includeInTotal).reduce((sum, a) => sum + a.balance, 0),
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    accountsByType,
  };
}

/**
 * Get all accounts grouped by type
 */
export async function getAccountsByType(userId: string): Promise<Map<AccountType, Account[]>> {
  const accounts = await db.accounts.where({ userId }).filter(a => !a.isArchived).sortBy('sortOrder');
  const grouped = new Map<AccountType, Account[]>();

  for (const account of accounts) {
    if (!grouped.has(account.type)) grouped.set(account.type, []);
    grouped.get(account.type)!.push(account);
  }

  return grouped;
}

/**
 * Set default account
 */
export async function setDefaultAccount(accountId: string, userId: string): Promise<void> {
  await db.transaction('rw', db.accounts, async () => {
    await db.accounts.where({ userId }).modify({ isDefault: false });
    await db.accounts.update(accountId, { isDefault: true, updatedAt: new Date().toISOString() });
  });
}

/**
 * Reorder accounts
 */
export async function reorderAccounts(accountIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', db.accounts, async () => {
    for (let i = 0; i < accountIds.length; i++) {
      await db.accounts.update(accountIds[i], { sortOrder: i, updatedAt: now });
    }
  });
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
          const account = await db.accounts.get(item.entityId);
          if (account) {
            await accountApi.create({
              name: account.name,
              type: account.type.toUpperCase() as any,
              balance: account.balance,
              color: account.color,
              icon: account.icon,
              includeInTotal: account.includeInTotal,
            });
          }
          break;
        case 'UPDATE':
          await accountApi.update(item.entityId, item.data as any);
          break;
        case 'DELETE':
          await accountApi.delete(item.entityId);
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

export const accountService = {
  createAccount,
  getAccount,
  getAccounts,
  updateAccount,
  archiveAccount,
  deleteAccount,
  updateBalance,
  transferBetweenAccounts,
  getAccountSummary,
  getAccountsByType,
  setDefaultAccount,
  reorderAccounts,
  syncPendingChanges,
  ACCOUNT_TYPE_CONFIG,
};

export default accountService;
