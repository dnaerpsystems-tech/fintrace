/**
 * Unified Sync Service - Tier-One Business Logic
 * Centralized offline-first sync management for all entity types
 * Handles queue management, sync operations, and conflict resolution
 */

import { db } from '@/db';
import {
  networkStatus,
  syncApi,
  accountApi,
  transactionApi,
  budgetApi,
  goalApi,
  loanApi,
  investmentApi,
  categoryApi,
} from '@/lib/api';
import { accountService } from './accountService';
import { transactionService } from './transactionService';
import { budgetService } from './budgetService';
import { goalService } from './goalService';
import { loanService } from './loanService';
import { investmentService } from './investmentService';

// =============================================================================
// Types
// =============================================================================

export type EntityType =
  | 'account'
  | 'transaction'
  | 'budget'
  | 'goal'
  | 'loan'
  | 'investment'
  | 'category';

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  entityType: EntityType;
  entityId: string;
  operation: OperationType;
  data: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
  lastError?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
  pendingByType: Record<EntityType, number>;
}

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
  errors: string[];
}

// =============================================================================
// Constants
// =============================================================================

const SYNC_QUEUE_KEY = 'fintrace_unified_sync_queue';
const SYNC_STATUS_KEY = 'fintrace_sync_status';
const MAX_RETRY_COUNT = 3;
const SYNC_BATCH_SIZE = 10;

// =============================================================================
// Queue Management
// =============================================================================

function getQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncQueueItem[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    // Dispatch event for listeners
    window.dispatchEvent(new CustomEvent('sync:queue-updated', { detail: { count: queue.length } }));
  }
}

function getSyncStatus(): Partial<SyncStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSyncStatus(status: Partial<SyncStatus>): void {
  if (typeof window !== 'undefined') {
    const current = getSyncStatus();
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({ ...current, ...status }));
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Add an item to the sync queue
 */
export function queueChange(
  entityType: EntityType,
  entityId: string,
  operation: OperationType,
  data: Record<string, unknown>
): void {
  const queue = getQueue();

  // Check for existing item with same entity - merge or replace
  const existingIndex = queue.findIndex(
    item => item.entityType === entityType && item.entityId === entityId
  );

  const newItem: SyncQueueItem = {
    id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    entityType,
    entityId,
    operation,
    data,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];

    // Handle operation merging logic
    if (existing.operation === 'CREATE' && operation === 'UPDATE') {
      // Merge update into create
      queue[existingIndex] = {
        ...existing,
        data: { ...existing.data, ...data },
        timestamp: newItem.timestamp,
      };
    } else if (existing.operation === 'CREATE' && operation === 'DELETE') {
      // Remove from queue entirely - was never synced
      queue.splice(existingIndex, 1);
    } else if (existing.operation === 'UPDATE' && operation === 'UPDATE') {
      // Merge updates
      queue[existingIndex] = {
        ...existing,
        data: { ...existing.data, ...data },
        timestamp: newItem.timestamp,
      };
    } else if (existing.operation === 'UPDATE' && operation === 'DELETE') {
      // Replace update with delete
      queue[existingIndex] = newItem;
    } else {
      // Replace entirely
      queue[existingIndex] = newItem;
    }
  } else {
    queue.push(newItem);
  }

  saveQueue(queue);

  // Auto-sync if online (debounced)
  if (networkStatus.isOnline()) {
    debouncedSync();
  }
}

/**
 * Get current sync status
 */
export function getStatus(): SyncStatus {
  const queue = getQueue();
  const stored = getSyncStatus();

  const pendingByType: Record<EntityType, number> = {
    account: 0,
    transaction: 0,
    budget: 0,
    goal: 0,
    loan: 0,
    investment: 0,
    category: 0,
  };

  for (const item of queue) {
    pendingByType[item.entityType]++;
  }

  return {
    isOnline: networkStatus.isOnline(),
    isSyncing: stored.isSyncing || false,
    pendingCount: queue.length,
    lastSyncTime: stored.lastSyncTime || null,
    lastError: stored.lastError || null,
    pendingByType,
  };
}

/**
 * Get pending count
 */
export function getPendingCount(): number {
  return getQueue().length;
}

/**
 * Clear all pending items (use with caution)
 */
export function clearQueue(): void {
  saveQueue([]);
  saveSyncStatus({ lastError: null });
}

/**
 * Sync all pending changes from unified queue and individual service queues
 */
export async function syncAll(): Promise<SyncResult> {
  if (!networkStatus.isOnline()) {
    return { synced: 0, failed: 0, remaining: getPendingCount(), errors: ['Offline'] };
  }

  saveSyncStatus({ isSyncing: true, lastError: null });

  // Also sync individual service queues in parallel
  const serviceResults = await Promise.allSettled([
    accountService.syncPendingChanges(),
    transactionService.syncPendingChanges(),
    budgetService.syncPendingChanges(),
    goalService.syncPendingChanges(),
    loanService.syncPendingChanges(),
    investmentService.syncPendingChanges(),
  ]);

  let serviceSynced = 0;
  let serviceFailed = 0;

  for (const result of serviceResults) {
    if (result.status === 'fulfilled') {
      serviceSynced += result.value.synced;
      serviceFailed += result.value.failed;
    }
  }

  const queue = getQueue();
  if (queue.length === 0 && serviceSynced === 0 && serviceFailed === 0) {
    saveSyncStatus({ isSyncing: false, lastSyncTime: new Date().toISOString() });
    return { synced: 0, failed: 0, remaining: 0, errors: [] };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const remainingQueue: SyncQueueItem[] = [];

  // Process in batches
  const batch = queue.slice(0, SYNC_BATCH_SIZE);

  for (const item of batch) {
    try {
      await syncItem(item);
      synced++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${item.entityType}/${item.entityId}: ${errorMessage}`);

      if (item.retryCount < MAX_RETRY_COUNT) {
        remainingQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastError: errorMessage,
        });
      } else {
        // Max retries exceeded - discard
        console.error(`Sync failed permanently for ${item.entityType}/${item.entityId}:`, error);
      }
      failed++;
    }
  }

  // Add remaining items that weren't processed
  const unprocessed = queue.slice(SYNC_BATCH_SIZE);
  const newQueue = [...remainingQueue, ...unprocessed];

  saveQueue(newQueue);
  saveSyncStatus({
    isSyncing: false,
    lastSyncTime: new Date().toISOString(),
    lastError: errors.length > 0 ? errors[0] : null,
  });

  // Continue syncing if there are more items
  if (newQueue.length > 0 && synced > 0) {
    setTimeout(() => syncAll(), 1000);
  }

  // Combine results from unified queue and individual services
  const totalSynced = synced + serviceSynced;
  const totalFailed = failed + serviceFailed;

  return { synced: totalSynced, failed: totalFailed, remaining: newQueue.length, errors };
}

/**
 * Sync a single item
 */
async function syncItem(item: SyncQueueItem): Promise<void> {
  switch (item.entityType) {
    case 'account':
      await syncAccount(item);
      break;
    case 'transaction':
      await syncTransaction(item);
      break;
    case 'budget':
      await syncBudget(item);
      break;
    case 'goal':
      await syncGoal(item);
      break;
    case 'loan':
      await syncLoan(item);
      break;
    case 'investment':
      await syncInvestment(item);
      break;
    case 'category':
      await syncCategory(item);
      break;
    default:
      throw new Error(`Unknown entity type: ${item.entityType}`);
  }
}

// =============================================================================
// Entity-Specific Sync Functions
// =============================================================================

async function syncAccount(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case 'CREATE':
      const account = await db.accounts.get(item.entityId);
      if (account) {
        await accountApi.create({
          name: account.name,
          type: account.type.toUpperCase() as any,
          balance: account.balance,
          currency: account.currency,
          color: account.color,
          icon: account.icon,
          institution: account.bankName,
          accountNumber: account.accountNumber,
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
}

async function syncTransaction(item: SyncQueueItem): Promise<void> {
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
          notes: tx.notes,
          payee: tx.payee,
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
}

async function syncBudget(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case 'CREATE':
      const budget = await db.budgets.get(item.entityId);
      if (budget) {
        await budgetApi.create({
          name: budget.name,
          categoryId: budget.categoryId || undefined,
          amount: budget.amount,
          period: budget.period.toUpperCase() as any,
          startDate: budget.startDate,
          endDate: budget.endDate || undefined,
          alertThreshold: budget.alertThreshold,
        });
      }
      break;
    case 'UPDATE':
      await budgetApi.update(item.entityId, item.data as any);
      break;
    case 'DELETE':
      await budgetApi.delete(item.entityId);
      break;
  }
}

async function syncGoal(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case 'CREATE':
      const goal = await db.goals.get(item.entityId);
      if (goal) {
        await goalApi.create({
          name: goal.name,
          description: goal.description || undefined,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate || undefined,
          icon: goal.icon,
          color: goal.color,
          priority: goal.priority?.toUpperCase() as any,
          linkedAccountId: goal.linkedAccountId || undefined,
        });
      }
      break;
    case 'UPDATE':
      await goalApi.update(item.entityId, item.data as any);
      break;
    case 'DELETE':
      await goalApi.delete(item.entityId);
      break;
  }
}

async function syncLoan(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case 'CREATE':
      const loan = await db.loans.get(item.entityId);
      if (loan) {
        await loanApi.create({
          name: loan.name,
          type: loan.type.toUpperCase() as any,
          principalAmount: loan.principalAmount,
          interestRate: loan.interestRate,
          tenure: loan.tenure,
          startDate: loan.startDate,
          lender: loan.lender || undefined,
          linkedAccountId: loan.linkedAccountId || undefined,
        });
      }
      break;
    case 'UPDATE':
      await loanApi.update(item.entityId, item.data as any);
      break;
    case 'DELETE':
      await loanApi.delete(item.entityId);
      break;
  }
}

async function syncInvestment(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case 'CREATE':
      const inv = await db.investments.get(item.entityId);
      if (inv) {
        await investmentApi.create({
          name: inv.name,
          type: inv.type.toUpperCase() as any,
          symbol: inv.symbol || undefined,
          isin: inv.isin || undefined,
          folioNumber: inv.folioNumber || undefined,
          broker: inv.broker || undefined,
          quantity: inv.quantity,
          avgBuyPrice: inv.avgBuyPrice,
          currentPrice: inv.currentPrice,
          isTaxSaving: inv.isTaxSaving,
          taxSection: inv.taxSection || undefined,
        });
      }
      break;
    case 'UPDATE':
      await investmentApi.update(item.entityId, item.data as any);
      break;
    case 'DELETE':
      await investmentApi.delete(item.entityId);
      break;
  }
}

async function syncCategory(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case 'CREATE':
      const cat = await db.categories.get(item.entityId);
      if (cat) {
        await categoryApi.create({
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type.toUpperCase() as any,
          parentId: cat.parentId || undefined,
        });
      }
      break;
    case 'UPDATE':
      await categoryApi.update(item.entityId, item.data as any);
      break;
    case 'DELETE':
      await categoryApi.delete(item.entityId);
      break;
  }
}

// =============================================================================
// Debounced Sync
// =============================================================================

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSync(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    syncAll().catch(console.error);
  }, 2000);
}

// =============================================================================
// Network Status Listener
// =============================================================================

if (typeof window !== 'undefined') {
  networkStatus.subscribe((online) => {
    if (online && getPendingCount() > 0) {
      // Sync when coming back online
      setTimeout(() => syncAll(), 1000);
    }
  });
}

// =============================================================================
// Exports
// =============================================================================

export const unifiedSyncService = {
  queueChange,
  getStatus,
  getPendingCount,
  clearQueue,
  syncAll,
};

export default unifiedSyncService;
