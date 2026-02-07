/**
 * AI Insights Service - Tier-One Standards
 * Provides intelligent spending analysis with offline-first API integration
 * - Online: Fetches insights from API for AI-powered analysis
 * - Offline: Calculates insights locally using Dexie data
 */

import { db } from '@/db';
import { TransactionType, type Transaction, type Budget, type Goal, type Account } from '@/types';
import { format, subDays, subMonths, startOfMonth, endOfMonth, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { formatINR } from '@/lib/formatters/currency';
import { insightsApi, networkStatus } from '@/lib/api';

// ==================== TYPES ====================

export interface SpendingPattern {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  dayOfWeekPattern: number[]; // Index 0 = Sunday
  timeOfDayPattern: { morning: number; afternoon: number; evening: number; night: number };
}

export interface Anomaly {
  id: string;
  type: 'unusual_amount' | 'unusual_frequency' | 'unusual_category' | 'unusual_time' | 'duplicate';
  severity: 'low' | 'medium' | 'high';
  transaction?: Transaction;
  description: string;
  details: string;
  detectedAt: string;
}

export interface SavingsRecommendation {
  id: string;
  type: 'reduce_spending' | 'increase_savings' | 'optimize_budget' | 'achieve_goal' | 'build_emergency';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSavings: number;
  actionable: string[];
  relatedCategoryId?: string;
  relatedGoalId?: string;
}

export interface FinancialHealthScore {
  overall: number; // 0-100
  breakdown: {
    savingsRate: { score: number; weight: number; description: string };
    budgetAdherence: { score: number; weight: number; description: string };
    expenseStability: { score: number; weight: number; description: string };
    goalProgress: { score: number; weight: number; description: string };
    debtManagement: { score: number; weight: number; description: string };
  };
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface InsightsSummary {
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  topCategories: { categoryId: string; name: string; amount: number; percentage: number }[];
  anomalies: Anomaly[];
  recommendations: SavingsRecommendation[];
  healthScore: FinancialHealthScore;
  spendingPatterns: SpendingPattern[];
}

// ==================== CONSTANTS ====================

const DEFAULT_USER_ID = 'default-user';

// Statistical thresholds for anomaly detection
const ANOMALY_THRESHOLDS = {
  amountDeviation: 2.5, // Standard deviations from mean
  frequencyDeviation: 2.0,
  duplicateWindow: 60, // Seconds for duplicate detection
  minTransactionsForPattern: 5,
};

// Category priority for recommendations
const DISCRETIONARY_CATEGORIES = [
  'food', 'shopping', 'entertainment', 'personal_care', 'subscriptions'
];

const ESSENTIAL_CATEGORIES = [
  'housing', 'utilities', 'health', 'education', 'transport'
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate mean and standard deviation
 */
function calculateStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return { mean, stdDev };
}

/**
 * Calculate Z-score
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Get category name from ID
 */
async function getCategoryName(categoryId: string): Promise<string> {
  const category = await db.categories.get(categoryId);
  return category?.name || 'Unknown';
}

// ==================== SPENDING PATTERN ANALYSIS ====================

/**
 * Analyze spending patterns by category
 */
export async function analyzeSpendingPatterns(
  userId: string = DEFAULT_USER_ID,
  daysBack = 90
): Promise<SpendingPattern[]> {
  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiPatterns = await insightsApi.getSpendingPatterns(
        daysBack <= 30 ? 'month' : daysBack <= 90 ? 'quarter' : 'year'
      );
      return apiPatterns.map(p => ({
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        totalSpent: p.totalSpent,
        transactionCount: p.transactionCount,
        averageTransaction: p.averageTransaction,
        trend: p.trend.toLowerCase() as 'increasing' | 'decreasing' | 'stable',
        trendPercentage: p.comparedToLastPeriod,
        dayOfWeekPattern: p.dayOfWeekDistribution,
        timeOfDayPattern: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      }));
    } catch (error) {
      console.warn('Failed to fetch spending patterns from API:', error);
    }
  }

  // Calculate locally
  const startDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
  const midDate = format(subDays(new Date(), daysBack / 2), 'yyyy-MM-dd');

  // Get transactions
  const transactions = await db.transactions
    .where({ userId })
    .filter(t =>
      t.type === TransactionType.EXPENSE &&
      t.date >= startDate &&
      !t.isExcludedFromStats
    )
    .toArray();

  // Get categories
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Group by category
  const byCategory = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!byCategory.has(tx.categoryId)) {
      byCategory.set(tx.categoryId, []);
    }
    byCategory.get(tx.categoryId)?.push(tx);
  }

  const patterns: SpendingPattern[] = [];

  for (const [categoryId, txs] of byCategory) {
    if (txs.length < ANOMALY_THRESHOLDS.minTransactionsForPattern) continue;

    // Calculate totals
    const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);
    const averageTransaction = totalSpent / txs.length;

    // Calculate trend (first half vs second half)
    const firstHalf = txs.filter(t => t.date < midDate);
    const secondHalf = txs.filter(t => t.date >= midDate);

    const firstHalfTotal = firstHalf.reduce((sum, t) => sum + t.amount, 0);
    const secondHalfTotal = secondHalf.reduce((sum, t) => sum + t.amount, 0);

    let trend: SpendingPattern['trend'] = 'stable';
    let trendPercentage = 0;

    if (firstHalfTotal > 0) {
      trendPercentage = ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100;
      if (trendPercentage > 15) trend = 'increasing';
      else if (trendPercentage < -15) trend = 'decreasing';
    }

    // Day of week pattern
    const dayOfWeekPattern = [0, 0, 0, 0, 0, 0, 0];
    for (const tx of txs) {
      const day = new Date(tx.date).getDay();
      dayOfWeekPattern[day] += tx.amount;
    }

    // Time of day pattern (mock based on transaction distribution)
    const timeOfDayPattern = {
      morning: Math.floor(txs.length * 0.2),
      afternoon: Math.floor(txs.length * 0.35),
      evening: Math.floor(txs.length * 0.35),
      night: Math.floor(txs.length * 0.1),
    };

    patterns.push({
      categoryId,
      categoryName: categoryMap.get(categoryId) || 'Unknown',
      totalSpent,
      transactionCount: txs.length,
      averageTransaction,
      trend,
      trendPercentage,
      dayOfWeekPattern,
      timeOfDayPattern,
    });
  }

  // Sort by total spent
  patterns.sort((a, b) => b.totalSpent - a.totalSpent);

  return patterns;
}

// ==================== ANOMALY DETECTION ====================

/**
 * Detect unusual transactions
 */
export async function detectAnomalies(
  userId: string = DEFAULT_USER_ID,
  daysBack = 30
): Promise<Anomaly[]> {
  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiAnomalies = await insightsApi.detectAnomalies(daysBack);
      return apiAnomalies.map(a => ({
        id: a.id,
        type: a.type.toLowerCase().replace('_transaction', '') as Anomaly['type'],
        severity: a.severity.toLowerCase() as 'low' | 'medium' | 'high',
        description: a.title,
        details: a.description,
        detectedAt: a.detectedAt,
      }));
    } catch (error) {
      console.warn('Failed to fetch anomalies from API:', error);
    }
  }

  // Calculate locally
  const startDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
  const historicalStart = format(subDays(new Date(), daysBack * 3), 'yyyy-MM-dd');

  // Get recent transactions
  const recentTransactions = await db.transactions
    .where({ userId })
    .filter(t =>
      t.type === TransactionType.EXPENSE &&
      t.date >= startDate &&
      !t.isExcludedFromStats
    )
    .toArray();

  // Get historical transactions for baseline
  const historicalTransactions = await db.transactions
    .where({ userId })
    .filter(t =>
      t.type === TransactionType.EXPENSE &&
      t.date >= historicalStart &&
      t.date < startDate &&
      !t.isExcludedFromStats
    )
    .toArray();

  const anomalies: Anomaly[] = [];

  // Calculate baseline stats by category
  const categoryStats = new Map<string, { mean: number; stdDev: number }>();
  const categoryGroups = new Map<string, number[]>();

  for (const tx of historicalTransactions) {
    if (!categoryGroups.has(tx.categoryId)) {
      categoryGroups.set(tx.categoryId, []);
    }
    categoryGroups.get(tx.categoryId)?.push(tx.amount);
  }

  for (const [categoryId, amounts] of categoryGroups) {
    categoryStats.set(categoryId, calculateStats(amounts));
  }

  // Check each recent transaction
  for (const tx of recentTransactions) {
    const stats = categoryStats.get(tx.categoryId);

    if (stats && stats.stdDev > 0) {
      const zScore = calculateZScore(tx.amount, stats.mean, stats.stdDev);

      // Unusual amount detection
      if (Math.abs(zScore) >= ANOMALY_THRESHOLDS.amountDeviation) {
        const categoryName = await getCategoryName(tx.categoryId);
        anomalies.push({
          id: `anomaly-amount-${tx.id}`,
          type: 'unusual_amount',
          severity: Math.abs(zScore) >= 3.5 ? 'high' : 'medium',
          transaction: tx,
          description: `Unusually ${zScore > 0 ? 'high' : 'low'} ${categoryName} expense`,
          details: `This ${formatINR(tx.amount)} transaction is ${Math.abs(zScore).toFixed(1)} standard deviations from your average ${categoryName} expense of ${formatINR(stats.mean)}.`,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // New category detection (unusual category)
    if (!categoryStats.has(tx.categoryId)) {
      const categoryName = await getCategoryName(tx.categoryId);
      const hasHistorical = historicalTransactions.some(
        h => h.categoryId === tx.categoryId
      );

      if (!hasHistorical) {
        anomalies.push({
          id: `anomaly-category-${tx.id}`,
          type: 'unusual_category',
          severity: 'low',
          transaction: tx,
          description: `New spending category: ${categoryName}`,
          details: `You haven't spent in this category in the past ${daysBack * 3} days.`,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Duplicate detection
  const sortedByTime = [...recentTransactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (let i = 1; i < sortedByTime.length; i++) {
    const current = sortedByTime[i];
    const previous = sortedByTime[i - 1];

    const timeDiff = (new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime()) / 1000;

    if (
      timeDiff <= ANOMALY_THRESHOLDS.duplicateWindow &&
      current.amount === previous.amount &&
      current.categoryId === previous.categoryId &&
      current.description === previous.description
    ) {
      const categoryName = await getCategoryName(current.categoryId);
      anomalies.push({
        id: `anomaly-duplicate-${current.id}`,
        type: 'duplicate',
        severity: 'medium',
        transaction: current,
        description: 'Potential duplicate transaction',
        details: `Two identical ${categoryName} transactions of ${formatINR(current.amount)} within ${ANOMALY_THRESHOLDS.duplicateWindow} seconds.`,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // Unusual frequency detection
  const recentCategoryCounts = new Map<string, number>();
  const historicalCategoryCounts = new Map<string, number>();

  for (const tx of recentTransactions) {
    recentCategoryCounts.set(
      tx.categoryId,
      (recentCategoryCounts.get(tx.categoryId) || 0) + 1
    );
  }

  for (const tx of historicalTransactions) {
    historicalCategoryCounts.set(
      tx.categoryId,
      (historicalCategoryCounts.get(tx.categoryId) || 0) + 1
    );
  }

  // Normalize by time period
  const recentDays = daysBack;
  const historicalDays = daysBack * 2;

  for (const [categoryId, recentCount] of recentCategoryCounts) {
    const historicalCount = historicalCategoryCounts.get(categoryId) || 0;
    const historicalRate = historicalCount / historicalDays;
    const recentRate = recentCount / recentDays;

    if (historicalRate > 0) {
      const frequencyChange = (recentRate - historicalRate) / historicalRate;

      if (frequencyChange > 1) { // More than doubled
        const categoryName = await getCategoryName(categoryId);
        anomalies.push({
          id: `anomaly-frequency-${categoryId}`,
          type: 'unusual_frequency',
          severity: frequencyChange > 2 ? 'high' : 'medium',
          description: `Increased ${categoryName} transaction frequency`,
          details: `You're making ${((frequencyChange + 1) * 100).toFixed(0)}% more ${categoryName} transactions than usual.`,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return anomalies;
}

// ==================== SAVINGS RECOMMENDATIONS ====================

/**
 * Generate personalized savings recommendations
 */
export async function generateRecommendations(
  userId: string = DEFAULT_USER_ID
): Promise<SavingsRecommendation[]> {
  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiRecommendations = await insightsApi.getRecommendations();
      return apiRecommendations.map(r => ({
        id: r.id,
        type: r.type.toLowerCase().replace(/_/g, '_') as SavingsRecommendation['type'],
        priority: r.priority.toLowerCase() as 'high' | 'medium' | 'low',
        title: r.title,
        description: r.description,
        potentialSavings: r.potentialSavings,
        actionable: r.actionable,
        relatedCategoryId: r.relatedCategoryId || undefined,
        relatedGoalId: r.relatedGoalId || undefined,
      }));
    } catch (error) {
      console.warn('Failed to fetch recommendations from API:', error);
    }
  }

  // Calculate locally
  const recommendations: SavingsRecommendation[] = [];
  const now = new Date();
  const thisMonth = {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
  const lastMonth = {
    start: format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'),
    end: format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'),
  };

  // Get data
  const [
    thisMonthTxs,
    lastMonthTxs,
    budgets,
    goals,
    accounts,
  ] = await Promise.all([
    db.transactions
      .where({ userId })
      .filter(t => t.date >= thisMonth.start && t.date <= thisMonth.end && !t.isExcludedFromStats)
      .toArray(),
    db.transactions
      .where({ userId })
      .filter(t => t.date >= lastMonth.start && t.date <= lastMonth.end && !t.isExcludedFromStats)
      .toArray(),
    db.budgets.where({ userId }).filter(b => !b.isArchived).toArray(),
    db.goals.where({ userId }).filter(g => g.status === 'active').toArray(),
    db.accounts.where({ userId }).filter(a => !a.isArchived).toArray(),
  ]);

  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Calculate monthly totals
  const thisMonthIncome = thisMonthTxs
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthExpense = thisMonthTxs
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const lastMonthExpense = lastMonthTxs
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  // Category spending this month
  const categorySpending = new Map<string, number>();
  for (const tx of thisMonthTxs) {
    if (tx.type === TransactionType.EXPENSE) {
      categorySpending.set(
        tx.categoryId,
        (categorySpending.get(tx.categoryId) || 0) + tx.amount
      );
    }
  }

  // Last month category spending for comparison
  const lastMonthCategorySpending = new Map<string, number>();
  for (const tx of lastMonthTxs) {
    if (tx.type === TransactionType.EXPENSE) {
      lastMonthCategorySpending.set(
        tx.categoryId,
        (lastMonthCategorySpending.get(tx.categoryId) || 0) + tx.amount
      );
    }
  }

  // 1. Discretionary spending reduction recommendations
  for (const categoryId of DISCRETIONARY_CATEGORIES) {
    const spending = categorySpending.get(categoryId) || 0;
    const lastMonthSpend = lastMonthCategorySpending.get(categoryId) || 0;

    if (spending > 0 && spending > lastMonthSpend * 1.2) { // 20% increase
      const categoryName = categoryMap.get(categoryId) || 'Unknown';
      const increase = spending - lastMonthSpend;

      recommendations.push({
        id: `reduce-${categoryId}`,
        type: 'reduce_spending',
        priority: spending > thisMonthIncome * 0.1 ? 'high' : 'medium',
        title: `Reduce ${categoryName} Spending`,
        description: `Your ${categoryName} spending is up ${formatINR(increase)} from last month.`,
        potentialSavings: increase,
        actionable: [
          `Set a monthly ${categoryName} budget`,
          'Look for alternatives or discounts',
          'Track individual purchases more closely',
        ],
        relatedCategoryId: categoryId,
      });
    }
  }

  // 2. Budget optimization recommendations
  for (const budget of budgets) {
    const categoryId = budget.categoryId || budget.categoryIds?.[0] || '';
    const spent = budget.spent;
    const limit = budget.amount;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    if (percentage > 90) {
      const categoryName = categoryMap.get(categoryId) || budget.name;
      recommendations.push({
        id: `budget-${budget.id}`,
        type: 'optimize_budget',
        priority: percentage > 100 ? 'high' : 'medium',
        title: `${categoryName} Budget Alert`,
        description: `You've used ${percentage.toFixed(0)}% of your ${categoryName} budget.`,
        potentialSavings: spent - limit,
        actionable: [
          'Review recent transactions in this category',
          'Consider increasing the budget if necessary',
          'Look for ways to reduce spending for the rest of the month',
        ],
      });
    }
  }

  // 3. Goal achievement recommendations
  for (const goal of goals) {
    const remaining = goal.targetAmount - goal.currentAmount;
    const targetDate = new Date(goal.targetDate);
    const daysLeft = differenceInDays(targetDate, now);

    if (daysLeft > 0 && remaining > 0) {
      const dailyNeeded = remaining / daysLeft;
      const monthlyNeeded = dailyNeeded * 30;

      const savingsRate = thisMonthIncome > 0
        ? (thisMonthIncome - thisMonthExpense) / thisMonthIncome
        : 0;

      if (monthlyNeeded > (thisMonthIncome - thisMonthExpense)) {
        recommendations.push({
          id: `goal-${goal.id}`,
          type: 'achieve_goal',
          priority: daysLeft < 60 ? 'high' : 'medium',
          title: `Accelerate "${goal.name}" Savings`,
          description: `You need to save ${formatINR(monthlyNeeded)}/month to reach your goal on time.`,
          potentialSavings: monthlyNeeded,
          actionable: [
            `Increase monthly contributions by ${formatINR(monthlyNeeded - (thisMonthIncome - thisMonthExpense))}`,
            'Cut discretionary spending temporarily',
            'Consider extending the target date if needed',
          ],
          relatedGoalId: goal.id,
        });
      }
    }
  }

  // 4. Emergency fund recommendation
  const totalBalance = accounts
    .filter(a => a.includeInTotal && a.type !== 'credit_card' && a.type !== 'loan')
    .reduce((sum, a) => sum + a.balance, 0);

  const monthlyExpenseAverage = (thisMonthExpense + lastMonthExpense) / 2;
  const emergencyMonths = monthlyExpenseAverage > 0 ? totalBalance / monthlyExpenseAverage : 0;

  if (emergencyMonths < 3) {
    const targetEmergencyFund = monthlyExpenseAverage * 6;
    const needed = targetEmergencyFund - totalBalance;

    recommendations.push({
      id: 'emergency-fund',
      type: 'build_emergency',
      priority: emergencyMonths < 1 ? 'high' : 'medium',
      title: 'Build Emergency Fund',
      description: `You have ${emergencyMonths.toFixed(1)} months of expenses saved. Aim for 6 months.`,
      potentialSavings: needed,
      actionable: [
        'Set aside a fixed amount each month for emergencies',
        'Keep emergency funds in a high-yield savings account',
        'Automate transfers to your emergency fund',
      ],
    });
  }

  // 5. General savings rate recommendation
  const savingsRate = thisMonthIncome > 0
    ? ((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100
    : 0;

  if (savingsRate < 20 && thisMonthIncome > 0) {
    const targetSavings = thisMonthIncome * 0.2;
    const currentSavings = thisMonthIncome - thisMonthExpense;
    const gap = targetSavings - currentSavings;

    if (gap > 0) {
      recommendations.push({
        id: 'increase-savings',
        type: 'increase_savings',
        priority: savingsRate < 10 ? 'high' : 'medium',
        title: 'Increase Savings Rate',
        description: `Your current savings rate is ${savingsRate.toFixed(0)}%. Aim for at least 20%.`,
        potentialSavings: gap,
        actionable: [
          'Review subscriptions and cancel unused ones',
          'Reduce dining out by cooking at home',
          'Set up automatic savings transfers',
          'Wait 24 hours before making non-essential purchases',
        ],
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

// ==================== FINANCIAL HEALTH SCORE ====================

/**
 * Calculate financial health score
 */
export async function calculateHealthScore(
  userId: string = DEFAULT_USER_ID
): Promise<FinancialHealthScore> {
  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiScore = await insightsApi.getHealthScore();
      return {
        overall: apiScore.overall,
        breakdown: {
          savingsRate: {
            score: apiScore.breakdown.savingsRate.score,
            weight: apiScore.breakdown.savingsRate.weight,
            description: apiScore.breakdown.savingsRate.description,
          },
          budgetAdherence: {
            score: apiScore.breakdown.budgetAdherence.score,
            weight: apiScore.breakdown.budgetAdherence.weight,
            description: apiScore.breakdown.budgetAdherence.description,
          },
          expenseStability: {
            score: apiScore.breakdown.expenseStability.score,
            weight: apiScore.breakdown.expenseStability.weight,
            description: apiScore.breakdown.expenseStability.description,
          },
          goalProgress: {
            score: apiScore.breakdown.goalProgress.score,
            weight: apiScore.breakdown.goalProgress.weight,
            description: apiScore.breakdown.goalProgress.description,
          },
          debtManagement: {
            score: apiScore.breakdown.debtManagement.score,
            weight: apiScore.breakdown.debtManagement.weight,
            description: apiScore.breakdown.debtManagement.description,
          },
        },
        trend: apiScore.trend.toLowerCase() as 'improving' | 'stable' | 'declining',
        recommendations: apiScore.recommendations,
      };
    } catch (error) {
      console.warn('Failed to fetch health score from API:', error);
    }
  }

  // Calculate locally
  const now = new Date();
  const thisMonth = {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
  const lastThreeMonths = format(subMonths(now, 3), 'yyyy-MM-dd');

  // Get data
  const [transactions, budgets, goals, loans, accounts] = await Promise.all([
    db.transactions.where({ userId }).filter(t => t.date >= lastThreeMonths).toArray(),
    db.budgets.where({ userId }).filter(b => !b.isArchived).toArray(),
    db.goals.where({ userId }).toArray(),
    db.loans.where({ userId }).filter(l => l.status === 'active').toArray(),
    db.accounts.where({ userId }).filter(a => !a.isArchived).toArray(),
  ]);

  // Calculate monthly stats
  const thisMonthTxs = transactions.filter(t => t.date >= thisMonth.start);
  const thisMonthIncome = thisMonthTxs
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  const thisMonthExpense = thisMonthTxs
    .filter(t => t.type === TransactionType.EXPENSE && !t.isExcludedFromStats)
    .reduce((sum, t) => sum + t.amount, 0);

  // 1. Savings Rate Score (30% weight)
  const savingsRate = thisMonthIncome > 0
    ? ((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100
    : 0;

  let savingsScore: number;
  if (savingsRate >= 30) savingsScore = 100;
  else if (savingsRate >= 20) savingsScore = 80;
  else if (savingsRate >= 10) savingsScore = 60;
  else if (savingsRate >= 0) savingsScore = 40;
  else savingsScore = 20;

  // 2. Budget Adherence Score (25% weight)
  let budgetScore = 100;
  if (budgets.length > 0) {
    let totalBudgeted = 0;
    let totalOverBudget = 0;

    for (const budget of budgets) {
      totalBudgeted += budget.amount;
      if (budget.spent > budget.amount) {
        totalOverBudget += budget.spent - budget.amount;
      }
    }

    if (totalBudgeted > 0) {
      const overBudgetPercent = (totalOverBudget / totalBudgeted) * 100;
      budgetScore = Math.max(0, 100 - overBudgetPercent * 2);
    }
  }

  // 3. Expense Stability Score (15% weight)
  const monthlyExpenses: number[] = [];
  for (let i = 0; i < 3; i++) {
    const monthStart = format(startOfMonth(subMonths(now, i)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(subMonths(now, i)), 'yyyy-MM-dd');
    const monthExpense = transactions
      .filter(t =>
        t.type === TransactionType.EXPENSE &&
        t.date >= monthStart &&
        t.date <= monthEnd &&
        !t.isExcludedFromStats
      )
      .reduce((sum, t) => sum + t.amount, 0);
    monthlyExpenses.push(monthExpense);
  }

  const { mean, stdDev } = calculateStats(monthlyExpenses);
  const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;
  let stabilityScore: number;
  if (coefficientOfVariation <= 10) stabilityScore = 100;
  else if (coefficientOfVariation <= 20) stabilityScore = 80;
  else if (coefficientOfVariation <= 30) stabilityScore = 60;
  else if (coefficientOfVariation <= 40) stabilityScore = 40;
  else stabilityScore = 20;

  // 4. Goal Progress Score (15% weight)
  let goalScore = 100;
  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    let onTrackCount = 0;
    for (const goal of activeGoals) {
      const progress = goal.currentAmount / goal.targetAmount;
      const timeProgress = 1 - (differenceInDays(new Date(goal.targetDate), now) /
        differenceInDays(new Date(goal.targetDate), new Date(goal.createdAt)));

      if (progress >= timeProgress * 0.8) { // Within 80% of expected
        onTrackCount++;
      }
    }
    goalScore = (onTrackCount / activeGoals.length) * 100;
  }

  // 5. Debt Management Score (15% weight)
  let debtScore = 100;
  const totalDebt = loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
  const totalAssets = accounts
    .filter(a => a.balance > 0 && a.type !== 'credit_card')
    .reduce((sum, a) => sum + a.balance, 0);

  if (totalDebt > 0) {
    const debtToAssetRatio = totalDebt / (totalAssets || 1);
    if (debtToAssetRatio <= 0.3) debtScore = 100;
    else if (debtToAssetRatio <= 0.5) debtScore = 80;
    else if (debtToAssetRatio <= 0.7) debtScore = 60;
    else if (debtToAssetRatio <= 1) debtScore = 40;
    else debtScore = 20;
  }

  // Calculate overall score
  const weights = {
    savingsRate: 0.30,
    budgetAdherence: 0.25,
    expenseStability: 0.15,
    goalProgress: 0.15,
    debtManagement: 0.15,
  };

  const overall = Math.round(
    savingsScore * weights.savingsRate +
    budgetScore * weights.budgetAdherence +
    stabilityScore * weights.expenseStability +
    goalScore * weights.goalProgress +
    debtScore * weights.debtManagement
  );

  // Generate recommendations based on lowest scores
  const recommendationTexts: string[] = [];
  const scores = [
    { name: 'savings', score: savingsScore },
    { name: 'budget', score: budgetScore },
    { name: 'stability', score: stabilityScore },
    { name: 'goals', score: goalScore },
    { name: 'debt', score: debtScore },
  ].sort((a, b) => a.score - b.score);

  for (const { name, score } of scores.slice(0, 2)) {
    if (score < 70) {
      switch (name) {
        case 'savings':
          recommendationTexts.push('Increase your savings rate by reducing discretionary spending');
          break;
        case 'budget':
          recommendationTexts.push('Review and adjust your budgets to better match your spending');
          break;
        case 'stability':
          recommendationTexts.push('Work on stabilizing monthly expenses for better predictability');
          break;
        case 'goals':
          recommendationTexts.push('Increase contributions to your savings goals');
          break;
        case 'debt':
          recommendationTexts.push('Focus on paying down debt faster');
          break;
      }
    }
  }

  return {
    overall,
    breakdown: {
      savingsRate: {
        score: savingsScore,
        weight: weights.savingsRate,
        description: `Savings rate: ${savingsRate.toFixed(0)}%`,
      },
      budgetAdherence: {
        score: budgetScore,
        weight: weights.budgetAdherence,
        description: `Budget compliance`,
      },
      expenseStability: {
        score: stabilityScore,
        weight: weights.expenseStability,
        description: `Month-to-month consistency`,
      },
      goalProgress: {
        score: goalScore,
        weight: weights.goalProgress,
        description: `Goal achievement progress`,
      },
      debtManagement: {
        score: debtScore,
        weight: weights.debtManagement,
        description: `Debt-to-asset ratio`,
      },
    },
    trend: overall >= 70 ? 'improving' : overall >= 50 ? 'stable' : 'declining',
    recommendations: recommendationTexts,
  };
}

// ==================== SUMMARY ====================

/**
 * Get comprehensive insights summary
 */
export async function getInsightsSummary(
  userId: string = DEFAULT_USER_ID
): Promise<InsightsSummary> {
  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiSummary = await insightsApi.getSummary('month');
      return {
        totalIncome: apiSummary.financials.totalIncome,
        totalExpenses: apiSummary.financials.totalExpenses,
        savingsRate: apiSummary.financials.savingsRate,
        topCategories: apiSummary.topCategories.map(c => ({
          categoryId: c.categoryId,
          name: c.categoryName,
          amount: c.amount,
          percentage: c.percentage,
        })),
        anomalies: apiSummary.anomalies.map(a => ({
          id: a.id,
          type: a.type.toLowerCase().replace('_transaction', '') as Anomaly['type'],
          severity: a.severity.toLowerCase() as 'low' | 'medium' | 'high',
          description: a.title,
          details: a.description,
          detectedAt: a.detectedAt,
        })),
        recommendations: apiSummary.recommendations.map(r => ({
          id: r.id,
          type: r.type.toLowerCase() as SavingsRecommendation['type'],
          priority: r.priority.toLowerCase() as 'high' | 'medium' | 'low',
          title: r.title,
          description: r.description,
          potentialSavings: r.potentialSavings,
          actionable: r.actionable,
          relatedCategoryId: r.relatedCategoryId || undefined,
          relatedGoalId: r.relatedGoalId || undefined,
        })),
        healthScore: {
          overall: apiSummary.healthScore.overall,
          breakdown: apiSummary.healthScore.breakdown,
          trend: apiSummary.healthScore.trend.toLowerCase() as 'improving' | 'stable' | 'declining',
          recommendations: apiSummary.healthScore.recommendations,
        },
        spendingPatterns: apiSummary.spendingPatterns.map(p => ({
          categoryId: p.categoryId,
          categoryName: p.categoryName,
          totalSpent: p.totalSpent,
          transactionCount: p.transactionCount,
          averageTransaction: p.averageTransaction,
          trend: p.trend.toLowerCase() as 'increasing' | 'decreasing' | 'stable',
          trendPercentage: p.comparedToLastPeriod,
          dayOfWeekPattern: p.dayOfWeekDistribution,
          timeOfDayPattern: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        })),
      };
    } catch (error) {
      console.warn('Failed to fetch insights summary from API:', error);
    }
  }

  // Calculate locally
  const now = new Date();
  const thisMonth = {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  };

  // Get this month's transactions
  const transactions = await db.transactions
    .where({ userId })
    .filter(t => t.date >= thisMonth.start && t.date <= thisMonth.end && !t.isExcludedFromStats)
    .toArray();

  // Get categories
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsRate = totalIncome > 0
    ? ((totalIncome - totalExpenses) / totalIncome) * 100
    : 0;

  // Top categories
  const categorySpending = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === TransactionType.EXPENSE) {
      categorySpending.set(
        tx.categoryId,
        (categorySpending.get(tx.categoryId) || 0) + tx.amount
      );
    }
  }

  const topCategories = Array.from(categorySpending.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryMap.get(categoryId) || 'Unknown',
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Get all insights in parallel
  const [anomalies, recommendations, healthScore, spendingPatterns] = await Promise.all([
    detectAnomalies(userId),
    generateRecommendations(userId),
    calculateHealthScore(userId),
    analyzeSpendingPatterns(userId),
  ]);

  return {
    totalIncome,
    totalExpenses,
    savingsRate,
    topCategories,
    anomalies,
    recommendations,
    healthScore,
    spendingPatterns,
  };
}

// ==================== EXPORTS ====================

export const insightsService = {
  analyzeSpendingPatterns,
  detectAnomalies,
  generateRecommendations,
  calculateHealthScore,
  getInsightsSummary,
};

export default insightsService;
