/**
 * Goal Service - Tier-One Business Logic
 * Handles savings goals with offline-first API integration
 * - Online: Uses API, caches to Dexie
 * - Offline: Uses Dexie, queues changes for sync
 */

import { db } from '@/db';
import {
  generateId,
  type Goal,
  type GoalContribution,
  GoalStatus,
  type UUID
} from '@/types';
import { validateGoal, type GoalInput } from '@/lib/validators';
import { calculateGoalProgress, GOAL_PRIORITIES, type GoalProgress } from '@/lib/calculations/budget';
import { format, differenceInDays, differenceInMonths, addMonths } from 'date-fns';
import { goalApi, networkStatus } from '@/lib/api';

// ==================== TYPES ====================

export interface CreateGoalInput {
  name: string;
  icon?: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: Date;
  priority?: 'high' | 'medium' | 'low';
  color?: string;
  description?: string;
  linkedAccountId?: string;
}

export interface GoalWithProgress extends Goal {
  progress: GoalProgress;
  contributions: GoalContribution[];
  linkedAccountName?: string;
}

export interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalSavedAmount: number;
  overallProgress: number;
  goalsOnTrack: number;
  goalsBehind: number;
  nextMilestone: { goalId: string; goalName: string; amount: number; date: Date } | null;
}

export interface ContributionInput {
  goalId: string;
  amount: number;
  note?: string;
  transactionId?: string;
  date?: Date;
}

// ==================== OFFLINE QUEUE MANAGEMENT ====================

interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADD_CONTRIBUTION' | 'DELETE_CONTRIBUTION';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'fintrace_goal_sync_queue';

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

function queueForSync(
  operation: SyncQueueItem['operation'],
  entityId: string,
  data: Record<string, unknown>
): void {
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

// ==================== GOAL CRUD ====================

/**
 * Create a new goal
 */
export async function createGoal(
  input: CreateGoalInput,
  userId: string
): Promise<string> {
  // Validate input
  const validation = validateGoal({
    name: input.name,
    targetAmount: input.targetAmount,
    targetDate: input.targetDate,
    priority: input.priority,
  });

  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  const goalId = generateId();
  const now = new Date().toISOString();

  const goal: Goal = {
    id: goalId,
    userId,
    name: input.name,
    description: input.description,
    icon: input.icon || 'Target',
    targetAmount: input.targetAmount,
    currentAmount: input.currentAmount || 0,
    currency: 'INR',
    targetDate: format(input.targetDate, 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-dd'),
    priority: input.priority || 'medium',
    status: GoalStatus.ACTIVE,
    color: input.color || '#06B6D4',
    linkedAccountId: input.linkedAccountId,
    autoSaveEnabled: false,
    isFamilyGoal: false,
    createdAt: now,
    updatedAt: now,
  };

  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiGoal = await goalApi.create({
        name: input.name,
        description: input.description,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount,
        targetDate: goal.targetDate,
        icon: input.icon,
        color: input.color,
        priority: input.priority?.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
        linkedAccountId: input.linkedAccountId,
      });
      goal.id = apiGoal.id;
      await db.goals.add(goal);

      // Create initial contribution if currentAmount > 0
      if (input.currentAmount && input.currentAmount > 0) {
        await addContribution(
          {
            goalId: goal.id,
            amount: input.currentAmount,
            note: 'Initial savings',
          },
          userId
        );
      }

      return apiGoal.id;
    } catch (error) {
      console.warn('API create failed, saving locally:', error);
    }
  }

  // Offline: Save locally and queue for sync
  await db.goals.add(goal);
  queueForSync('CREATE', goalId, goal as unknown as Record<string, unknown>);

  // Create initial contribution if currentAmount > 0
  if (input.currentAmount && input.currentAmount > 0) {
    await addContribution(
      {
        goalId,
        amount: input.currentAmount,
        note: 'Initial savings',
      },
      userId
    );
  }

  return goalId;
}

/**
 * Update a goal
 */
export async function updateGoal(
  goalId: string,
  updates: Partial<CreateGoalInput>
): Promise<void> {
  const goal = await db.goals.get(goalId);
  if (!goal) {
    throw new Error('Goal not found');
  }

  const now = new Date().toISOString();
  const updateData: Partial<Goal> = {
    ...updates,
    targetDate: updates.targetDate
      ? format(updates.targetDate, 'yyyy-MM-dd')
      : goal.targetDate,
    updatedAt: now,
  };

  // Check if goal is completed
  if (updates.currentAmount !== undefined) {
    const newAmount = updates.currentAmount;
    const target = updates.targetAmount ?? goal.targetAmount;

    if (newAmount >= target && goal.status === GoalStatus.ACTIVE) {
      updateData.status = GoalStatus.COMPLETED;
      updateData.completedDate = now.split('T')[0];
    }
  }

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await goalApi.update(goalId, {
        name: updates.name,
        description: updates.description,
        targetAmount: updates.targetAmount,
        currentAmount: updates.currentAmount,
        targetDate: updateData.targetDate,
        icon: updates.icon,
        color: updates.color,
        priority: updates.priority?.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW' | undefined,
        linkedAccountId: updates.linkedAccountId,
      });
    } catch (error) {
      console.warn('API update failed, queuing for sync:', error);
      queueForSync('UPDATE', goalId, updateData as Record<string, unknown>);
    }
  } else {
    queueForSync('UPDATE', goalId, updateData as Record<string, unknown>);
  }

  await db.goals.update(goalId, updateData);
}

/**
 * Archive a goal (without completing)
 */
export async function archiveGoal(goalId: string): Promise<void> {
  const updateData = {
    status: GoalStatus.ARCHIVED,
    updatedAt: new Date().toISOString(),
  };

  if (networkStatus.isOnline()) {
    try {
      await goalApi.update(goalId, { status: 'CANCELLED' });
    } catch (error) {
      console.warn('API archive failed, queuing for sync:', error);
      queueForSync('UPDATE', goalId, updateData);
    }
  } else {
    queueForSync('UPDATE', goalId, updateData);
  }

  await db.goals.update(goalId, updateData);
}

/**
 * Delete a goal and its contributions
 */
export async function deleteGoal(goalId: string): Promise<void> {
  if (networkStatus.isOnline()) {
    try {
      await goalApi.delete(goalId);
    } catch (error) {
      console.warn('API delete failed, queuing for sync:', error);
      queueForSync('DELETE', goalId, { id: goalId });
    }
  } else {
    queueForSync('DELETE', goalId, { id: goalId });
  }

  await db.transaction('rw', [db.goals, db.goalContributions], async () => {
    await db.goalContributions.where({ goalId }).delete();
    await db.goals.delete(goalId);
  });
}

/**
 * Complete a goal manually
 */
export async function completeGoal(goalId: string): Promise<void> {
  const now = new Date().toISOString();
  const updateData = {
    status: GoalStatus.COMPLETED,
    completedDate: now.split('T')[0],
    updatedAt: now,
  };

  if (networkStatus.isOnline()) {
    try {
      await goalApi.update(goalId, { status: 'COMPLETED' });
    } catch (error) {
      console.warn('API complete failed, queuing for sync:', error);
      queueForSync('UPDATE', goalId, updateData);
    }
  } else {
    queueForSync('UPDATE', goalId, updateData);
  }

  await db.goals.update(goalId, updateData);
}

/**
 * Reactivate a goal
 */
export async function reactivateGoal(goalId: string): Promise<void> {
  const updateData = {
    status: GoalStatus.ACTIVE,
    completedDate: undefined,
    updatedAt: new Date().toISOString(),
  };

  if (networkStatus.isOnline()) {
    try {
      await goalApi.update(goalId, { status: 'ACTIVE' });
    } catch (error) {
      console.warn('API reactivate failed, queuing for sync:', error);
      queueForSync('UPDATE', goalId, updateData);
    }
  } else {
    queueForSync('UPDATE', goalId, updateData);
  }

  await db.goals.update(goalId, updateData);
}

// ==================== CONTRIBUTIONS ====================

/**
 * Add a contribution to a goal
 */
export async function addContribution(
  input: ContributionInput,
  userId: string
): Promise<string> {
  const goal = await db.goals.get(input.goalId);
  if (!goal) {
    throw new Error('Goal not found');
  }

  if (input.amount <= 0) {
    throw new Error('Contribution amount must be positive');
  }

  const contributionId = generateId();
  const now = new Date().toISOString();
  const contributionDate = input.date
    ? format(input.date, 'yyyy-MM-dd')
    : now.split('T')[0];

  const contribution: GoalContribution = {
    id: contributionId,
    goalId: input.goalId,
    userId,
    amount: input.amount,
    note: input.note,
    transactionId: input.transactionId,
    createdAt: now,
    updatedAt: now,
  };

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      const apiContribution = await goalApi.addContribution(input.goalId, {
        amount: input.amount,
        date: contributionDate,
        notes: input.note,
      });
      contribution.id = apiContribution.id;
    } catch (error) {
      console.warn('API add contribution failed, queuing for sync:', error);
      queueForSync('ADD_CONTRIBUTION', contributionId, contribution as unknown as Record<string, unknown>);
    }
  } else {
    queueForSync('ADD_CONTRIBUTION', contributionId, contribution as unknown as Record<string, unknown>);
  }

  await db.transaction('rw', [db.goals, db.goalContributions], async () => {
    await db.goalContributions.add(contribution);

    const newAmount = goal.currentAmount + input.amount;
    const updateData: Partial<Goal> = {
      currentAmount: newAmount,
      updatedAt: now,
    };

    // Check if goal is now complete
    if (newAmount >= goal.targetAmount && goal.status === GoalStatus.ACTIVE) {
      updateData.status = GoalStatus.COMPLETED;
      updateData.completedDate = now.split('T')[0];
    }

    await db.goals.update(input.goalId, updateData);
  });

  return contribution.id;
}

/**
 * Remove a contribution
 */
export async function removeContribution(contributionId: string): Promise<void> {
  const contribution = await db.goalContributions.get(contributionId);
  if (!contribution) {
    throw new Error('Contribution not found');
  }

  const goal = await db.goals.get(contribution.goalId);
  if (!goal) {
    throw new Error('Goal not found');
  }

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await goalApi.deleteContribution(contribution.goalId, contributionId);
    } catch (error) {
      console.warn('API delete contribution failed, queuing for sync:', error);
      queueForSync('DELETE_CONTRIBUTION', contributionId, {
        goalId: contribution.goalId,
        contributionId,
      });
    }
  } else {
    queueForSync('DELETE_CONTRIBUTION', contributionId, {
      goalId: contribution.goalId,
      contributionId,
    });
  }

  await db.transaction('rw', [db.goals, db.goalContributions], async () => {
    await db.goalContributions.delete(contributionId);

    const newAmount = Math.max(0, goal.currentAmount - contribution.amount);

    await db.goals.update(contribution.goalId, {
      currentAmount: newAmount,
      status: goal.status === GoalStatus.COMPLETED && newAmount < goal.targetAmount
        ? GoalStatus.ACTIVE
        : goal.status,
      completedDate: newAmount < goal.targetAmount ? undefined : goal.completedDate,
      updatedAt: new Date().toISOString(),
    });
  });
}

/**
 * Get contributions for a goal
 */
export async function getContributions(goalId: string): Promise<GoalContribution[]> {
  // Try to fetch from API if online
  if (networkStatus.isOnline()) {
    try {
      const apiContributions = await goalApi.getContributions(goalId);
      // Update local cache
      for (const c of apiContributions) {
        const existing = await db.goalContributions.get(c.id);
        if (!existing) {
          await db.goalContributions.add({
            id: c.id,
            goalId,
            userId: '',
            amount: c.amount,
            note: c.notes || undefined,
            createdAt: c.createdAt,
            updatedAt: c.createdAt,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch contributions from API:', error);
    }
  }

  return db.goalContributions
    .where({ goalId })
    .reverse()
    .sortBy('createdAt');
}

// ==================== PROGRESS & ANALYTICS ====================

/**
 * Get goal with calculated progress
 */
export async function getGoalWithProgress(goalId: string): Promise<GoalWithProgress | null> {
  const goal = await db.goals.get(goalId);
  if (!goal) return null;

  const contributions = await getContributions(goalId);

  const progress = calculateGoalProgress({
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetDate: new Date(goal.targetDate),
    priority: goal.priority as 'high' | 'medium' | 'low',
  });

  // Get linked account name if exists
  let linkedAccountName: string | undefined;
  if (goal.linkedAccountId) {
    const account = await db.accounts.get(goal.linkedAccountId);
    linkedAccountName = account?.name;
  }

  return {
    ...goal,
    progress,
    contributions,
    linkedAccountName,
  };
}

/**
 * Get all goals with progress
 */
export async function getGoalsWithProgress(
  userId: string,
  status?: GoalStatus
): Promise<GoalWithProgress[]> {
  // Try to refresh from API if online
  if (networkStatus.isOnline()) {
    try {
      const apiGoals = await goalApi.getAll();
      for (const g of apiGoals) {
        const existing = await db.goals.get(g.id);
        if (existing) {
          await db.goals.update(g.id, {
            name: g.name,
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            status: g.status.toLowerCase() as GoalStatus,
            updatedAt: g.updatedAt,
          });
        } else {
          await db.goals.add({
            id: g.id,
            userId,
            name: g.name,
            description: g.description || undefined,
            icon: g.icon,
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            currency: 'INR',
            targetDate: g.targetDate || '',
            startDate: g.createdAt.split('T')[0],
            priority: g.priority.toLowerCase() as 'high' | 'medium' | 'low',
            status: g.status.toLowerCase() as GoalStatus,
            color: g.color,
            linkedAccountId: g.linkedAccountId || undefined,
            autoSaveEnabled: false,
            isFamilyGoal: false,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch goals from API:', error);
    }
  }

  let goals = await db.goals.where({ userId }).toArray();

  if (status) {
    goals = goals.filter(g => g.status === status);
  }

  const goalsWithProgress: GoalWithProgress[] = [];

  for (const goal of goals) {
    const progress = calculateGoalProgress({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: new Date(goal.targetDate),
      priority: goal.priority as 'high' | 'medium' | 'low',
    });

    const contributions = await getContributions(goal.id);

    let linkedAccountName: string | undefined;
    if (goal.linkedAccountId) {
      const account = await db.accounts.get(goal.linkedAccountId);
      linkedAccountName = account?.name;
    }

    goalsWithProgress.push({
      ...goal,
      progress,
      contributions,
      linkedAccountName,
    });
  }

  // Sort by priority and deadline
  goalsWithProgress.sort((a, b) => {
    // First by status (active first)
    if (a.status !== b.status) {
      return a.status === GoalStatus.ACTIVE ? -1 : 1;
    }

    // Then by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] -
                         priorityOrder[b.priority as keyof typeof priorityOrder];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by deadline
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
  });

  return goalsWithProgress;
}

/**
 * Get goal summary for dashboard
 */
export async function getGoalSummary(userId: string): Promise<GoalSummary> {
  const goals = await getGoalsWithProgress(userId);

  const activeGoals = goals.filter(g => g.status === GoalStatus.ACTIVE);
  const completedGoals = goals.filter(g => g.status === GoalStatus.COMPLETED);

  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSavedAmount = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTargetAmount > 0
    ? (totalSavedAmount / totalTargetAmount) * 100
    : 0;

  let goalsOnTrack = 0;
  let goalsBehind = 0;
  let nextMilestone: GoalSummary['nextMilestone'] = null;

  for (const goal of activeGoals) {
    if (goal.progress.onTrack) {
      goalsOnTrack++;
    } else {
      goalsBehind++;
    }

    // Find next milestone (goal closest to completion or deadline)
    const remaining = goal.targetAmount - goal.currentAmount;
    const daysLeft = goal.progress.daysLeft;

    if (!nextMilestone ||
        (remaining > 0 && daysLeft > 0 && daysLeft < differenceInDays(new Date(nextMilestone.date), new Date()))) {
      nextMilestone = {
        goalId: goal.id,
        goalName: goal.name,
        amount: remaining,
        date: new Date(goal.targetDate),
      };
    }
  }

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    totalTargetAmount,
    totalSavedAmount,
    overallProgress,
    goalsOnTrack,
    goalsBehind,
    nextMilestone,
  };
}

/**
 * Get suggested monthly contribution for a goal
 */
export function getSuggestedContribution(
  goal: Goal
): { monthly: number; weekly: number; daily: number } {
  const remaining = goal.targetAmount - goal.currentAmount;

  if (remaining <= 0) {
    return { monthly: 0, weekly: 0, daily: 0 };
  }

  const targetDate = new Date(goal.targetDate);
  const now = new Date();

  const monthsLeft = Math.max(1, differenceInMonths(targetDate, now));
  const weeksLeft = Math.max(1, Math.ceil(differenceInDays(targetDate, now) / 7));
  const daysLeft = Math.max(1, differenceInDays(targetDate, now));

  return {
    monthly: Math.ceil(remaining / monthsLeft),
    weekly: Math.ceil(remaining / weeksLeft),
    daily: Math.ceil(remaining / daysLeft),
  };
}

/**
 * Auto-contribute from linked account balance changes
 */
export async function autoContributeFromAccount(
  accountId: string,
  balanceIncrease: number,
  userId: string
): Promise<string[]> {
  // Find goals linked to this account
  const linkedGoals = await db.goals
    .where({ userId, linkedAccountId: accountId })
    .filter(g => g.status === GoalStatus.ACTIVE)
    .toArray();

  if (linkedGoals.length === 0) return [];

  const contributionIds: string[] = [];

  // Distribute the balance increase among linked goals by priority
  linkedGoals.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] -
           priorityOrder[b.priority as keyof typeof priorityOrder];
  });

  let remainingAmount = balanceIncrease;

  for (const goal of linkedGoals) {
    if (remainingAmount <= 0) break;

    const needed = goal.targetAmount - goal.currentAmount;
    const contribution = Math.min(remainingAmount, needed);

    if (contribution > 0) {
      const id = await addContribution(
        {
          goalId: goal.id,
          amount: contribution,
          note: 'Auto-contribution from linked account',
        },
        userId
      );
      contributionIds.push(id);
      remainingAmount -= contribution;
    }
  }

  return contributionIds;
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
          const goal = await db.goals.get(item.entityId);
          if (goal) {
            await goalApi.create({
              name: goal.name,
              description: goal.description,
              targetAmount: goal.targetAmount,
              currentAmount: goal.currentAmount,
              targetDate: goal.targetDate,
              icon: goal.icon,
              color: goal.color,
              priority: goal.priority?.toUpperCase() as any,
              linkedAccountId: goal.linkedAccountId,
            });
          }
          break;
        case 'UPDATE':
          await goalApi.update(item.entityId, item.data as any);
          break;
        case 'DELETE':
          await goalApi.delete(item.entityId);
          break;
        case 'ADD_CONTRIBUTION':
          const contribData = item.data as any;
          await goalApi.addContribution(contribData.goalId, {
            amount: contribData.amount,
            notes: contribData.note,
          });
          break;
        case 'DELETE_CONTRIBUTION':
          const deleteData = item.data as any;
          await goalApi.deleteContribution(deleteData.goalId, deleteData.contributionId);
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

export const goalService = {
  createGoal,
  updateGoal,
  archiveGoal,
  deleteGoal,
  completeGoal,
  reactivateGoal,
  addContribution,
  removeContribution,
  getContributions,
  getGoalWithProgress,
  getGoalsWithProgress,
  getGoalSummary,
  getSuggestedContribution,
  autoContributeFromAccount,
  syncPendingChanges,
};

export default goalService;
