/**
 * Budget & Goals Calculations
 * All amounts in paise for precision
 */

import { differenceInDays, differenceInMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, addMonths } from 'date-fns';

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type BudgetStatus = 'good' | 'warning' | 'danger' | 'over';

export interface BudgetInput {
  id: string;
  categoryId: string;
  amount: number; // in paise
  period: BudgetPeriod;
  alertThreshold: number; // percentage (e.g., 80)
  carryOver: boolean;
}

export interface BudgetResult {
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
  isOverBudget: boolean;
  daysRemaining: number;
  dailyAllowance: number;
  projectedSpend: number;
  projectedStatus: BudgetStatus;
}

export interface GoalInput {
  id: string;
  name: string;
  targetAmount: number; // in paise
  currentAmount: number; // in paise
  targetDate: Date;
  priority: 'high' | 'medium' | 'low';
}

export interface GoalProgress {
  target: number;
  saved: number;
  remaining: number;
  percentage: number;
  daysLeft: number;
  monthsLeft: number;
  dailyNeeded: number;
  monthlyNeeded: number;
  weeklyNeeded: number;
  onTrack: boolean;
  projectedCompletion: Date | null;
  status: 'on_track' | 'behind' | 'ahead' | 'completed';
}

/**
 * Get period date boundaries
 */
export function getBudgetPeriodDates(
  period: BudgetPeriod,
  reference: Date = new Date()
): { start: Date; end: Date } {
  switch (period) {
    case 'weekly':
      return {
        start: startOfWeek(reference, { weekStartsOn: 1 }),
        end: endOfWeek(reference, { weekStartsOn: 1 }),
      };
    case 'monthly':
      return {
        start: startOfMonth(reference),
        end: endOfMonth(reference),
      };
    case 'yearly':
      return {
        start: startOfYear(reference),
        end: endOfYear(reference),
      };
    default:
      return {
        start: startOfMonth(reference),
        end: endOfMonth(reference),
      };
  }
}

/**
 * Calculate budget status
 */
export function calculateBudgetStatus(
  budget: BudgetInput,
  spent: number,
  reference: Date = new Date()
): BudgetResult {
  const { start, end } = getBudgetPeriodDates(budget.period, reference);
  const totalDays = differenceInDays(end, start) + 1;
  const daysElapsed = differenceInDays(reference, start) + 1;
  const daysRemaining = Math.max(0, differenceInDays(end, reference));

  const remaining = budget.amount - spent;
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const isOverBudget = spent > budget.amount;

  // Determine status
  let status: BudgetStatus;
  if (isOverBudget) {
    status = 'over';
  } else if (percentage >= 90) {
    status = 'danger';
  } else if (percentage >= budget.alertThreshold) {
    status = 'warning';
  } else {
    status = 'good';
  }

  // Daily allowance for remaining days
  const dailyAllowance = daysRemaining > 0 ? Math.floor(remaining / daysRemaining) : 0;

  // Projected spend based on current rate
  const dailyRate = daysElapsed > 0 ? spent / daysElapsed : 0;
  const projectedSpend = Math.round(dailyRate * totalDays);

  // Projected status
  let projectedStatus: BudgetStatus;
  const projectedPercentage = budget.amount > 0 ? (projectedSpend / budget.amount) * 100 : 0;
  if (projectedPercentage > 100) {
    projectedStatus = 'over';
  } else if (projectedPercentage >= 90) {
    projectedStatus = 'danger';
  } else if (projectedPercentage >= budget.alertThreshold) {
    projectedStatus = 'warning';
  } else {
    projectedStatus = 'good';
  }

  return {
    budgeted: budget.amount,
    spent,
    remaining,
    percentage: Math.min(percentage, 100),
    status,
    isOverBudget,
    daysRemaining,
    dailyAllowance,
    projectedSpend,
    projectedStatus,
  };
}

/**
 * Aggregate budgets for a period
 */
export function aggregateBudgets(
  budgets: BudgetInput[],
  spendingByCategory: Map<string, number>,
  reference: Date = new Date()
): {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  overallStatus: BudgetStatus;
  budgetResults: Map<string, BudgetResult>;
} {
  let totalBudgeted = 0;
  let totalSpent = 0;
  const budgetResults = new Map<string, BudgetResult>();

  for (const budget of budgets) {
    const spent = spendingByCategory.get(budget.categoryId) || 0;
    const result = calculateBudgetStatus(budget, spent, reference);
    budgetResults.set(budget.categoryId, result);

    totalBudgeted += budget.amount;
    totalSpent += spent;
  }

  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  let overallStatus: BudgetStatus;
  if (totalSpent > totalBudgeted) {
    overallStatus = 'over';
  } else if (overallPercentage >= 90) {
    overallStatus = 'danger';
  } else if (overallPercentage >= 80) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'good';
  }

  return {
    totalBudgeted,
    totalSpent,
    totalRemaining,
    overallPercentage,
    overallStatus,
    budgetResults,
  };
}

/**
 * Calculate goal progress
 */
export function calculateGoalProgress(goal: GoalInput): GoalProgress {
  const { targetAmount, currentAmount, targetDate } = goal;

  const today = new Date();
  const remaining = Math.max(0, targetAmount - currentAmount);
  const percentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const daysLeft = Math.max(0, differenceInDays(targetDate, today));
  const monthsLeft = Math.max(0, differenceInMonths(targetDate, today));

  // Calculate required contributions
  const dailyNeeded = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
  const weeklyNeeded = daysLeft > 0 ? Math.ceil((remaining / daysLeft) * 7) : remaining;
  const monthlyNeeded = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;

  // Determine if on track
  // Assume linear progress from start
  const totalDuration = differenceInDays(targetDate, new Date(goal.targetDate.getTime() - (daysLeft * 24 * 60 * 60 * 1000)));
  const expectedProgress = totalDuration > 0 ? ((totalDuration - daysLeft) / totalDuration) * 100 : 0;
  const onTrack = percentage >= expectedProgress * 0.9; // 90% of expected progress

  // Determine status
  let status: GoalProgress['status'];
  if (percentage >= 100) {
    status = 'completed';
  } else if (percentage >= expectedProgress) {
    status = 'ahead';
  } else if (percentage >= expectedProgress * 0.8) {
    status = 'on_track';
  } else {
    status = 'behind';
  }

  // Project completion date based on current rate
  let projectedCompletion: Date | null = null;
  if (currentAmount > 0 && remaining > 0) {
    const totalDaysFromStart = totalDuration - daysLeft;
    if (totalDaysFromStart > 0) {
      const dailyRate = currentAmount / totalDaysFromStart;
      const daysToComplete = Math.ceil(remaining / dailyRate);
      projectedCompletion = new Date(today.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
    }
  }

  return {
    target: targetAmount,
    saved: currentAmount,
    remaining,
    percentage: Math.min(percentage, 100),
    daysLeft,
    monthsLeft,
    dailyNeeded,
    weeklyNeeded,
    monthlyNeeded,
    onTrack,
    projectedCompletion,
    status,
  };
}

/**
 * Calculate savings rate
 */
export function calculateSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  const savings = income - expenses;
  return Math.max(0, (savings / income) * 100);
}

/**
 * Get budget status color
 */
export function getBudgetStatusColor(status: BudgetStatus): string {
  switch (status) {
    case 'good':
      return 'text-emerald-500';
    case 'warning':
      return 'text-yellow-500';
    case 'danger':
      return 'text-orange-500';
    case 'over':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get budget status background color
 */
export function getBudgetStatusBg(status: BudgetStatus): string {
  switch (status) {
    case 'good':
      return 'bg-emerald-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'danger':
      return 'bg-orange-500';
    case 'over':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Goal priority configuration
 */
export const GOAL_PRIORITIES = {
  high: { label: 'High', color: 'text-red-500', bgColor: 'bg-red-100' },
  medium: { label: 'Medium', color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
  low: { label: 'Low', color: 'text-blue-500', bgColor: 'bg-blue-100' },
} as const;

/**
 * Goal icons
 */
export const GOAL_ICONS = {
  car: 'Car',
  home: 'Home',
  travel: 'Plane',
  education: 'GraduationCap',
  wedding: 'Heart',
  emergency: 'Shield',
  retirement: 'Armchair',
  gadget: 'Smartphone',
  custom: 'Target',
} as const;
