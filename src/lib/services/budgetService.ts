/**
 * Budget Service - Tier-One Business Logic
 * Handles budget management with offline-first API integration
 * - Online: Uses API, caches to Dexie
 * - Offline: Uses Dexie, queues changes for sync
 */

import { db } from '@/db';
import { generateId, type Budget, type Transaction, TransactionType, type BudgetPeriod as TypeBudgetPeriod, type UUID } from '@/types';
import { validateBudget, type BudgetInput } from '@/lib/validators';
import {
  calculateBudgetStatus,
  aggregateBudgets,
  type BudgetPeriod,
  type BudgetResult
} from '@/lib/calculations/budget';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  addWeeks,
  addMonths,
  addYears,
  isWithinInterval
} from 'date-fns';
import { budgetApi, networkStatus } from '@/lib/api';

// ==================== TYPES ====================

export interface CreateBudgetInput {
  name: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  alertThreshold?: number;
  carryOver?: boolean;
  color?: string;
  notes?: string;
}

export interface BudgetWithStatus extends Budget {
  status: BudgetResult;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  budgetsOnTrack: number;
  budgetsOverspent: number;
  budgetsAtRisk: number;
  budgets: BudgetWithStatus[];
}

export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  categoryId: string;
  type: 'warning' | 'danger' | 'over';
  percentage: number;
  spent: number;
  limit: number;
  message: string;
}

// ==================== OFFLINE QUEUE MANAGEMENT ====================

interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'fintrace_budget_sync_queue';

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

// ==================== PERIOD UTILITIES ====================

/**
 * Get period date range
 */
function getPeriodDates(period: BudgetPeriod, referenceDate: Date = new Date()): {
  startDate: Date;
  endDate: Date;
} {
  switch (period) {
    case 'weekly':
      return {
        startDate: startOfWeek(referenceDate, { weekStartsOn: 1 }),
        endDate: endOfWeek(referenceDate, { weekStartsOn: 1 }),
      };
    case 'monthly':
      return {
        startDate: startOfMonth(referenceDate),
        endDate: endOfMonth(referenceDate),
      };
    case 'yearly':
      return {
        startDate: startOfYear(referenceDate),
        endDate: endOfYear(referenceDate),
      };
    default:
      return {
        startDate: startOfMonth(referenceDate),
        endDate: endOfMonth(referenceDate),
      };
  }
}

/**
 * Get next period start date
 */
function getNextPeriodStart(period: BudgetPeriod, currentStart: Date): Date {
  switch (period) {
    case 'weekly':
      return addWeeks(currentStart, 1);
    case 'monthly':
      return addMonths(currentStart, 1);
    case 'yearly':
      return addYears(currentStart, 1);
    default:
      return addMonths(currentStart, 1);
  }
}

/**
 * Normalize period to valid BudgetPeriod
 */
function normalizePeriod(period: string): BudgetPeriod {
  if (period === 'weekly' || period === 'monthly' || period === 'yearly') {
    return period;
  }
  return 'monthly';
}

// ==================== BUDGET CRUD ====================

/**
 * Create a new budget
 */
export async function createBudget(
  input: CreateBudgetInput,
  userId: string
): Promise<string> {
  // Validate input
  const validation = validateBudget({
    categoryId: input.categoryId,
    amount: input.amount,
    period: input.period,
    alertThreshold: input.alertThreshold,
  });

  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  // Check for existing budget on same category and period
  const existingBudget = await db.budgets
    .where({ userId })
    .filter(b =>
      b.categoryId === input.categoryId &&
      normalizePeriod(b.period as string) === input.period &&
      !b.isArchived
    )
    .first();

  if (existingBudget) {
    throw new Error('A budget already exists for this category and period');
  }

  const budgetId = generateId();
  const now = new Date().toISOString();
  const { startDate, endDate } = getPeriodDates(input.period);

  // Get category for color
  const category = await db.categories.get(input.categoryId);

  const budget: Budget = {
    id: budgetId,
    userId,
    name: input.name || category?.name || 'Budget',
    categoryId: input.categoryId,
    categoryIds: [input.categoryId],
    accountIds: [],
    amount: input.amount,
    spent: 0,
    period: input.period as TypeBudgetPeriod,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    alertThreshold: input.alertThreshold ?? 80,
    alertAt: [50, 80, 100],
    rollover: input.carryOver ?? false,
    rolloverAmount: 0,
    carryOver: input.carryOver ?? false,
    isArchived: false,
    isFamilyBudget: false,
    color: input.color || category?.color || '#10B981',
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiBudget = await budgetApi.create({
        name: budget.name,
        categoryId: input.categoryId,
        amount: input.amount,
        period: input.period.toUpperCase() as 'WEEKLY' | 'MONTHLY' | 'YEARLY',
        startDate: budget.startDate,
        endDate: budget.endDate || undefined,
        alertThreshold: input.alertThreshold,
      });
      budget.id = apiBudget.id;
      await db.budgets.add(budget);
      return apiBudget.id;
    } catch (error) {
      console.warn('API create failed, saving locally:', error);
    }
  }

  // Offline: Save locally and queue for sync
  await db.budgets.add(budget);
  queueForSync('CREATE', budgetId, budget as unknown as Record<string, unknown>);
  return budgetId;
}

/**
 * Update a budget
 */
export async function updateBudget(
  budgetId: string,
  updates: Partial<CreateBudgetInput>
): Promise<void> {
  const budget = await db.budgets.get(budgetId);
  if (!budget) {
    throw new Error('Budget not found');
  }

  const now = new Date().toISOString();
  const updateData: Partial<Budget> = {
    ...updates,
    updatedAt: now,
  };

  // Recalculate dates if period changed
  if (updates.period && updates.period !== normalizePeriod(budget.period as string)) {
    const { startDate, endDate } = getPeriodDates(updates.period);
    updateData.startDate = format(startDate, 'yyyy-MM-dd');
    updateData.endDate = format(endDate, 'yyyy-MM-dd');
  }

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await budgetApi.update(budgetId, {
        name: updates.name,
        categoryId: updates.categoryId,
        amount: updates.amount,
        period: updates.period?.toUpperCase() as 'WEEKLY' | 'MONTHLY' | 'YEARLY' | undefined,
        alertThreshold: updates.alertThreshold,
      });
    } catch (error) {
      console.warn('API update failed, queuing for sync:', error);
      queueForSync('UPDATE', budgetId, updateData as Record<string, unknown>);
    }
  } else {
    queueForSync('UPDATE', budgetId, updateData as Record<string, unknown>);
  }

  await db.budgets.update(budgetId, updateData);
}

/**
 * Archive a budget
 */
export async function archiveBudget(budgetId: string): Promise<void> {
  const updateData = {
    isArchived: true,
    updatedAt: new Date().toISOString(),
  };

  if (networkStatus.isOnline()) {
    try {
      await budgetApi.update(budgetId, { isActive: false });
    } catch (error) {
      console.warn('API archive failed, queuing for sync:', error);
      queueForSync('UPDATE', budgetId, updateData);
    }
  } else {
    queueForSync('UPDATE', budgetId, updateData);
  }

  await db.budgets.update(budgetId, updateData);
}

/**
 * Delete a budget permanently
 */
export async function deleteBudget(budgetId: string): Promise<void> {
  if (networkStatus.isOnline()) {
    try {
      await budgetApi.delete(budgetId);
    } catch (error) {
      console.warn('API delete failed, queuing for sync:', error);
      queueForSync('DELETE', budgetId, { id: budgetId });
    }
  } else {
    queueForSync('DELETE', budgetId, { id: budgetId });
  }

  await db.budgets.delete(budgetId);
}

// ==================== SPENDING CALCULATIONS ====================

/**
 * Calculate spending for a budget
 */
async function calculateBudgetSpending(
  budget: Budget,
  userId: string
): Promise<number> {
  const categoryId = budget.categoryId || budget.categoryIds?.[0];
  if (!categoryId) return 0;

  const transactions = await db.transactions
    .where({ userId, categoryId })
    .filter(t =>
      t.type === TransactionType.EXPENSE &&
      t.date >= budget.startDate &&
      (!budget.endDate || t.date <= budget.endDate) &&
      !t.isExcludedFromStats
    )
    .toArray();

  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Recalculate all budget spent amounts
 */
export async function recalculateBudgets(userId: string): Promise<void> {
  const budgets = await db.budgets
    .where({ userId })
    .filter(b => !b.isArchived)
    .toArray();

  const now = new Date().toISOString();

  for (const budget of budgets) {
    const spent = await calculateBudgetSpending(budget, userId);

    await db.budgets.update(budget.id, {
      spent,
      updatedAt: now,
    });
  }
}

/**
 * Roll over budgets to new period
 */
export async function rollOverBudgets(userId: string): Promise<number> {
  const budgets = await db.budgets
    .where({ userId })
    .filter(b => !b.isArchived && (b.carryOver || b.rollover))
    .toArray();

  const now = new Date();
  const nowStr = format(now, 'yyyy-MM-dd');
  let rolledOver = 0;

  for (const budget of budgets) {
    // Check if budget period has ended
    if (budget.endDate && budget.endDate < nowStr) {
      const period = normalizePeriod(budget.period as string);
      const { startDate, endDate } = getPeriodDates(period, now);

      // Calculate carry over amount
      const carryOverAmount = Math.max(0, budget.amount - budget.spent);

      await db.budgets.update(budget.id, {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        spent: 0,
        amount: budget.amount + carryOverAmount,
        rolloverAmount: carryOverAmount,
        updatedAt: new Date().toISOString(),
      });

      rolledOver++;
    }
  }

  return rolledOver;
}

// ==================== SUMMARY & STATUS ====================

/**
 * Get budget with calculated status
 */
export async function getBudgetWithStatus(
  budgetId: string,
  userId: string
): Promise<BudgetWithStatus | null> {
  const budget = await db.budgets.get(budgetId);
  if (!budget) return null;

  // Recalculate spending
  const spent = await calculateBudgetSpending(budget, userId);

  const categoryId = budget.categoryId || budget.categoryIds?.[0] || '';
  const period = normalizePeriod(budget.period as string);

  // Calculate status
  const status = calculateBudgetStatus(
    {
      id: budget.id,
      categoryId,
      amount: budget.amount,
      period,
      alertThreshold: budget.alertThreshold,
      carryOver: budget.carryOver || budget.rollover,
    },
    spent
  );

  // Get category details
  const category = categoryId ? await db.categories.get(categoryId) : null;

  return {
    ...budget,
    spent,
    status,
    categoryName: category?.name,
    categoryIcon: category?.icon,
    categoryColor: category?.color,
  };
}

/**
 * Get all budgets with status for a period
 */
export async function getBudgetSummary(
  userId: string,
  period?: BudgetPeriod
): Promise<BudgetSummary> {
  // Try to fetch from API if online
  if (networkStatus.isOnline()) {
    try {
      const apiSummary = await budgetApi.getSummary(period);
      // Update local cache
      const apiBudgets = await budgetApi.getAll();
      for (const b of apiBudgets) {
        const existing = await db.budgets.get(b.id);
        if (existing) {
          await db.budgets.update(b.id, {
            name: b.name,
            amount: b.amount,
            spent: b.spent,
            updatedAt: b.updatedAt,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch budgets from API:', error);
    }
  }

  // Get all active budgets from local DB
  let budgets = await db.budgets
    .where({ userId })
    .filter(b => !b.isArchived)
    .toArray();

  // Filter by period if specified
  if (period) {
    budgets = budgets.filter(b => normalizePeriod(b.period as string) === period);
  }

  // Get categories for enrichment
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Calculate status for each budget
  const budgetsWithStatus: BudgetWithStatus[] = [];

  for (const budget of budgets) {
    const spent = await calculateBudgetSpending(budget, userId);
    const categoryId = budget.categoryId || budget.categoryIds?.[0] || '';
    const normalizedPeriod = normalizePeriod(budget.period as string);

    const status = calculateBudgetStatus(
      {
        id: budget.id,
        categoryId,
        amount: budget.amount,
        period: normalizedPeriod,
        alertThreshold: budget.alertThreshold,
        carryOver: budget.carryOver || budget.rollover,
      },
      spent
    );

    const category = categoryId ? categoryMap.get(categoryId) : undefined;

    budgetsWithStatus.push({
      ...budget,
      spent,
      status,
      categoryName: category?.name,
      categoryIcon: category?.icon,
      categoryColor: category?.color,
    });
  }

  // Calculate totals
  const totalBudgeted = budgetsWithStatus.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetsWithStatus.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercentage = totalBudgeted > 0
    ? (totalSpent / totalBudgeted) * 100
    : 0;

  // Count by status
  let budgetsOnTrack = 0;
  let budgetsOverspent = 0;
  let budgetsAtRisk = 0;

  for (const b of budgetsWithStatus) {
    switch (b.status.status) {
      case 'good':
        budgetsOnTrack++;
        break;
      case 'over':
        budgetsOverspent++;
        break;
      case 'warning':
      case 'danger':
        budgetsAtRisk++;
        break;
    }
  }

  return {
    totalBudgeted,
    totalSpent,
    totalRemaining,
    overallPercentage,
    budgetsOnTrack,
    budgetsOverspent,
    budgetsAtRisk,
    budgets: budgetsWithStatus,
  };
}

// ==================== ALERTS ====================

/**
 * Get budget alerts
 */
export async function getBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
  const summary = await getBudgetSummary(userId);
  const alerts: BudgetAlert[] = [];

  for (const budget of summary.budgets) {
    if (budget.status.status === 'warning' ||
        budget.status.status === 'danger' ||
        budget.status.status === 'over') {

      const categoryId = budget.categoryId || budget.categoryIds?.[0] || '';
      let message: string;

      if (budget.status.isOverBudget) {
        message = `You've exceeded your ${budget.categoryName || 'budget'} by ${
          budget.status.percentage.toFixed(0)
        }%`;
      } else if (budget.status.status === 'danger') {
        message = `Your ${budget.categoryName || 'budget'} is almost exhausted (${
          budget.status.percentage.toFixed(0)
        }% used)`;
      } else {
        message = `You've used ${budget.status.percentage.toFixed(0)}% of your ${
          budget.categoryName || 'budget'
        }`;
      }

      alerts.push({
        budgetId: budget.id,
        budgetName: budget.name,
        categoryId,
        type: budget.status.status === 'over' ? 'over' :
              budget.status.status === 'danger' ? 'danger' : 'warning',
        percentage: budget.status.percentage,
        spent: budget.spent,
        limit: budget.amount,
        message,
      });
    }
  }

  // Sort by severity
  alerts.sort((a, b) => {
    const severityOrder = { over: 0, danger: 1, warning: 2 };
    return severityOrder[a.type] - severityOrder[b.type];
  });

  return alerts;
}

/**
 * Check if a transaction would breach any budget
 */
export async function checkBudgetBreach(
  userId: string,
  categoryId: string,
  amount: number
): Promise<BudgetAlert | null> {
  const budget = await db.budgets
    .where({ userId })
    .filter(b =>
      (b.categoryId === categoryId || b.categoryIds?.includes(categoryId)) &&
      !b.isArchived
    )
    .first();

  if (!budget) return null;

  const currentSpent = await calculateBudgetSpending(budget, userId);
  const newSpent = currentSpent + amount;
  const newPercentage = (newSpent / budget.amount) * 100;

  const categoryIdForAlert = budget.categoryId || budget.categoryIds?.[0] || categoryId;

  if (newPercentage >= 100) {
    return {
      budgetId: budget.id,
      budgetName: budget.name,
      categoryId: categoryIdForAlert,
      type: 'over',
      percentage: newPercentage,
      spent: newSpent,
      limit: budget.amount,
      message: `This transaction will exceed your ${budget.name} budget`,
    };
  } else if (newPercentage >= budget.alertThreshold) {
    return {
      budgetId: budget.id,
      budgetName: budget.name,
      categoryId: categoryIdForAlert,
      type: newPercentage >= 90 ? 'danger' : 'warning',
      percentage: newPercentage,
      spent: newSpent,
      limit: budget.amount,
      message: `This transaction will use ${newPercentage.toFixed(0)}% of your ${budget.name} budget`,
    };
  }

  return null;
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

// ==================== EXPORTS ====================

export const budgetService = {
  createBudget,
  updateBudget,
  archiveBudget,
  deleteBudget,
  recalculateBudgets,
  rollOverBudgets,
  getBudgetWithStatus,
  getBudgetSummary,
  getBudgetAlerts,
  checkBudgetBreach,
  syncPendingChanges,
  getPeriodDates,
};

export default budgetService;
