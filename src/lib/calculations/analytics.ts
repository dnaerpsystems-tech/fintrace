/**
 * Analytics & Aggregation Utilities
 * For spending analysis, trends, and insights
 */

import { startOfDay, startOfWeek, startOfMonth, format, differenceInDays } from 'date-fns';

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  categoryId: string;
  accountId: string;
  date: Date;
  description?: string;
}

export interface SpendingAnalytics {
  totalSpent: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  avgTransactionAmount: number;
  topCategories: CategorySpending[];
  dailyAverage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface CategorySpending {
  categoryId: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface CashFlowEntry {
  date: string;
  income: number;
  expense: number;
  net: number;
  cumulative: number;
}

export interface ComparisonResult {
  current: SpendingAnalytics;
  previous: SpendingAnalytics;
  spendingChange: number;
  spendingChangePercent: number;
  incomeChange: number;
  incomeChangePercent: number;
  savingsChange: number;
  savingsChangePercent: number;
  improved: boolean;
}

/**
 * Calculate spending analytics for a period
 */
export function calculateSpendingAnalytics(
  transactions: Transaction[],
  period: { start: Date; end: Date }
): SpendingAnalytics {
  const periodTransactions = transactions.filter(
    (t) => t.date >= period.start && t.date <= period.end
  );

  const expenses = periodTransactions.filter((t) => t.type === 'expense');
  const incomes = periodTransactions.filter((t) => t.type === 'income');

  const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  const transactionCount = periodTransactions.length;
  const avgTransactionAmount = transactionCount > 0
    ? Math.round(totalSpent / expenses.length)
    : 0;

  // Calculate top categories
  const categoryMap = new Map<string, { amount: number; count: number }>();
  for (const expense of expenses) {
    const existing = categoryMap.get(expense.categoryId) || { amount: 0, count: 0 };
    categoryMap.set(expense.categoryId, {
      amount: existing.amount + expense.amount,
      count: existing.count + 1,
    });
  }

  const topCategories: CategorySpending[] = Array.from(categoryMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      amount: data.amount,
      percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Calculate daily average
  const days = Math.max(1, differenceInDays(period.end, period.start) + 1);
  const dailyAverage = Math.round(totalSpent / days);

  // Trend calculation (simplified - compare first half to second half)
  const midpoint = new Date((period.start.getTime() + period.end.getTime()) / 2);
  const firstHalf = expenses.filter((t) => t.date < midpoint);
  const secondHalf = expenses.filter((t) => t.date >= midpoint);

  const firstHalfTotal = firstHalf.reduce((sum, t) => sum + t.amount, 0);
  const secondHalfTotal = secondHalf.reduce((sum, t) => sum + t.amount, 0);

  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendPercentage = 0;

  if (firstHalfTotal > 0) {
    trendPercentage = ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100;
    if (trendPercentage > 10) trend = 'up';
    else if (trendPercentage < -10) trend = 'down';
  }

  return {
    totalSpent,
    totalIncome,
    netSavings,
    savingsRate,
    transactionCount,
    avgTransactionAmount,
    topCategories,
    dailyAverage,
    trend,
    trendPercentage,
  };
}

/**
 * Compare two periods
 */
export function comparePeriods(
  current: SpendingAnalytics,
  previous: SpendingAnalytics
): ComparisonResult {
  const spendingChange = current.totalSpent - previous.totalSpent;
  const spendingChangePercent = previous.totalSpent > 0
    ? (spendingChange / previous.totalSpent) * 100
    : 0;

  const incomeChange = current.totalIncome - previous.totalIncome;
  const incomeChangePercent = previous.totalIncome > 0
    ? (incomeChange / previous.totalIncome) * 100
    : 0;

  const savingsChange = current.netSavings - previous.netSavings;
  const savingsChangePercent = previous.netSavings !== 0
    ? (savingsChange / Math.abs(previous.netSavings)) * 100
    : 0;

  // Improved if spending decreased or savings increased
  const improved = spendingChange < 0 || savingsChange > 0;

  return {
    current,
    previous,
    spendingChange,
    spendingChangePercent,
    incomeChange,
    incomeChangePercent,
    savingsChange,
    savingsChangePercent,
    improved,
  };
}

/**
 * Calculate cash flow over time
 */
export function calculateCashFlow(
  transactions: Transaction[],
  groupBy: 'day' | 'week' | 'month' = 'day'
): CashFlowEntry[] {
  const grouped = new Map<string, { income: number; expense: number }>();

  for (const transaction of transactions) {
    let key: string;
    switch (groupBy) {
      case 'week':
        key = format(startOfWeek(transaction.date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'month':
        key = format(startOfMonth(transaction.date), 'yyyy-MM');
        break;
      default:
        key = format(startOfDay(transaction.date), 'yyyy-MM-dd');
    }

    const existing = grouped.get(key) || { income: 0, expense: 0 };
    if (transaction.type === 'income') {
      existing.income += transaction.amount;
    } else if (transaction.type === 'expense') {
      existing.expense += transaction.amount;
    }
    grouped.set(key, existing);
  }

  // Sort by date and calculate cumulative
  const entries = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  let cumulative = 0;
  const result: CashFlowEntry[] = [];

  for (const [date, data] of entries) {
    const net = data.income - data.expense;
    cumulative += net;

    result.push({
      date,
      income: data.income,
      expense: data.expense,
      net,
      cumulative,
    });
  }

  return result;
}

/**
 * Group transactions by category
 */
export function groupByCategory(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const result = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const existing = result.get(transaction.categoryId) || [];
    existing.push(transaction);
    result.set(transaction.categoryId, existing);
  }

  return result;
}

/**
 * Group transactions by account
 */
export function groupByAccount(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const result = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const existing = result.get(transaction.accountId) || [];
    existing.push(transaction);
    result.set(transaction.accountId, existing);
  }

  return result;
}

/**
 * Sum transaction amounts
 */
export function sumTransactions(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Filter by type
 */
export function filterByType(
  transactions: Transaction[],
  type: 'income' | 'expense' | 'transfer'
): Transaction[] {
  return transactions.filter((t) => t.type === type);
}

/**
 * Get spending insights
 */
export function generateInsights(analytics: SpendingAnalytics): string[] {
  const insights: string[] = [];

  // Savings rate insight
  if (analytics.savingsRate >= 30) {
    insights.push(`Great job! You're saving ${analytics.savingsRate.toFixed(0)}% of your income.`);
  } else if (analytics.savingsRate >= 20) {
    insights.push(`Good savings rate of ${analytics.savingsRate.toFixed(0)}%. Try to reach 30%!`);
  } else if (analytics.savingsRate > 0) {
    insights.push(`Your savings rate is ${analytics.savingsRate.toFixed(0)}%. Consider reducing expenses.`);
  } else {
    insights.push(`You're spending more than you earn. Review your expenses.`);
  }

  // Top category insight
  if (analytics.topCategories.length > 0) {
    const top = analytics.topCategories[0];
    insights.push(`Your highest spending category uses ${top.percentage.toFixed(0)}% of your budget.`);
  }

  // Trend insight
  if (analytics.trend === 'up') {
    insights.push(`Spending is trending up by ${Math.abs(analytics.trendPercentage).toFixed(0)}% this period.`);
  } else if (analytics.trend === 'down') {
    insights.push(`Great! Spending decreased by ${Math.abs(analytics.trendPercentage).toFixed(0)}% this period.`);
  }

  return insights;
}
