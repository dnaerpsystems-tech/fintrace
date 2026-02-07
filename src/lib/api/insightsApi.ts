/**
 * Insights API
 * Tier-one API wrapper for AI-powered financial insights
 * Includes spending analysis, anomaly detection, and recommendations
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export type InsightType =
  | 'SPENDING_ALERT'
  | 'BUDGET_WARNING'
  | 'SAVING_TIP'
  | 'GOAL_MILESTONE'
  | 'ANOMALY_DETECTED'
  | 'RECURRING_DETECTED'
  | 'TREND_ANALYSIS'
  | 'CASH_FLOW_FORECAST';

export type InsightPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type AnomalyType =
  | 'UNUSUAL_AMOUNT'
  | 'UNUSUAL_FREQUENCY'
  | 'UNUSUAL_CATEGORY'
  | 'UNUSUAL_TIME'
  | 'DUPLICATE_TRANSACTION'
  | 'UNUSUAL_MERCHANT';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type RecommendationType =
  | 'REDUCE_SPENDING'
  | 'INCREASE_SAVINGS'
  | 'OPTIMIZE_BUDGET'
  | 'ACHIEVE_GOAL'
  | 'BUILD_EMERGENCY'
  | 'PAY_DEBT'
  | 'INVEST_SURPLUS';

export type HealthTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

// Insight entity from server
export interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  isDismissed: boolean;
  validUntil: string | null;
  actionUrl: string | null;
  createdAt: string;
}

// Spending pattern analysis
export interface SpendingPattern {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  trendPercentage: number;
  comparedToLastPeriod: number;
  dayOfWeekDistribution: number[]; // Index 0 = Sunday
  topPayees: Array<{ name: string; amount: number; count: number }>;
}

// Anomaly detection
export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  transactionId: string | null;
  title: string;
  description: string;
  details: string;
  amount: number | null;
  expectedAmount: number | null;
  deviation: number | null;
  detectedAt: string;
  isResolved: boolean;
}

// Savings recommendation
export interface SavingsRecommendation {
  id: string;
  type: RecommendationType;
  priority: InsightPriority;
  title: string;
  description: string;
  potentialSavings: number;
  confidenceScore: number;
  actionable: string[];
  relatedCategoryId: string | null;
  relatedGoalId: string | null;
  relatedBudgetId: string | null;
}

// Financial health score breakdown
export interface HealthScoreBreakdown {
  score: number;
  weight: number;
  description: string;
  tips: string[];
}

export interface FinancialHealthScore {
  overall: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    savingsRate: HealthScoreBreakdown;
    budgetAdherence: HealthScoreBreakdown;
    expenseStability: HealthScoreBreakdown;
    goalProgress: HealthScoreBreakdown;
    debtManagement: HealthScoreBreakdown;
    emergencyFund: HealthScoreBreakdown;
  };
  trend: HealthTrend;
  monthOverMonthChange: number;
  recommendations: string[];
  lastCalculated: string;
}

// Cash flow forecast
export interface CashFlowForecast {
  date: string;
  projectedBalance: number;
  projectedIncome: number;
  projectedExpense: number;
  confidence: number;
  warnings: string[];
}

// Monthly summary
export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
    trend: 'UP' | 'DOWN' | 'SAME';
  }>;
  budgetPerformance: {
    onTrack: number;
    warning: number;
    exceeded: number;
  };
  goalContributions: number;
  loanPayments: number;
}

// Comprehensive insights summary
export interface InsightsSummary {
  period: {
    start: string;
    end: string;
  };
  financials: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
    averageDailySpend: number;
  };
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    amount: number;
    percentage: number;
    trend: number;
  }>;
  anomalies: Anomaly[];
  recommendations: SavingsRecommendation[];
  healthScore: FinancialHealthScore;
  spendingPatterns: SpendingPattern[];
  recentInsights: Insight[];
  forecast: CashFlowForecast[];
}

// Filters for insights
export interface InsightsFilters {
  startDate?: string;
  endDate?: string;
  types?: InsightType[];
  priority?: InsightPriority;
  isRead?: boolean;
  isDismissed?: boolean;
}

// =============================================================================
// API Functions
// =============================================================================

export const insightsApi = {
  /**
   * Get comprehensive insights summary
   */
  async getSummary(period?: 'week' | 'month' | 'quarter' | 'year'): Promise<InsightsSummary> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch insights.');
    }
    const query = period ? `?period=${period}` : '';
    return api.get<InsightsSummary>(`/insights/summary${query}`);
  },

  /**
   * Get all insights with filters
   */
  async getInsights(filters?: InsightsFilters): Promise<{
    insights: Insight[];
    total: number;
    unreadCount: number;
  }> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch insights.');
    }
    const params = new URLSearchParams();
    if (filters) {
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.types) params.append('types', filters.types.join(','));
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
      if (filters.isDismissed !== undefined) params.append('isDismissed', String(filters.isDismissed));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/insights${query}`);
  },

  /**
   * Mark insight as read
   */
  async markAsRead(insightId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update insight.');
    }
    return api.patch(`/insights/${insightId}/read`, {});
  },

  /**
   * Dismiss an insight
   */
  async dismiss(insightId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot dismiss insight.');
    }
    return api.patch(`/insights/${insightId}/dismiss`, {});
  },

  /**
   * Get financial health score
   */
  async getHealthScore(): Promise<FinancialHealthScore> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch health score.');
    }
    return api.get<FinancialHealthScore>('/insights/health-score');
  },

  /**
   * Get health score history for trend analysis
   */
  async getHealthScoreHistory(
    months = 6
  ): Promise<Array<{ month: string; score: number }>> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch health history.');
    }
    return api.get(`/insights/health-score/history?months=${months}`);
  },

  /**
   * Get spending patterns by category
   */
  async getSpendingPatterns(
    period?: 'month' | 'quarter' | 'year'
  ): Promise<SpendingPattern[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch spending patterns.');
    }
    const query = period ? `?period=${period}` : '';
    return api.get<SpendingPattern[]>(`/insights/spending-patterns${query}`);
  },

  /**
   * Detect anomalies in transactions
   */
  async detectAnomalies(daysBack?: number): Promise<Anomaly[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot detect anomalies.');
    }
    const query = daysBack ? `?days=${daysBack}` : '';
    return api.get<Anomaly[]>(`/insights/anomalies${query}`);
  },

  /**
   * Resolve an anomaly (mark as reviewed)
   */
  async resolveAnomaly(anomalyId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot resolve anomaly.');
    }
    return api.patch(`/insights/anomalies/${anomalyId}/resolve`, {});
  },

  /**
   * Get personalized savings recommendations
   */
  async getRecommendations(): Promise<SavingsRecommendation[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch recommendations.');
    }
    return api.get<SavingsRecommendation[]>('/insights/recommendations');
  },

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(recommendationId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot dismiss recommendation.');
    }
    return api.patch(`/insights/recommendations/${recommendationId}/dismiss`, {});
  },

  /**
   * Get cash flow forecast
   */
  async getCashFlowForecast(days?: number): Promise<CashFlowForecast[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch forecast.');
    }
    const query = days ? `?days=${days}` : '';
    return api.get<CashFlowForecast[]>(`/insights/cash-flow-forecast${query}`);
  },

  /**
   * Get monthly summaries for trend analysis
   */
  async getMonthlySummaries(months?: number): Promise<MonthlySummary[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch monthly summaries.');
    }
    const query = months ? `?months=${months}` : '';
    return api.get<MonthlySummary[]>(`/insights/monthly-summaries${query}`);
  },

  /**
   * Get spending comparison (this period vs last period)
   */
  async getSpendingComparison(period: 'week' | 'month' | 'quarter'): Promise<{
    currentPeriod: { income: number; expense: number; savings: number };
    previousPeriod: { income: number; expense: number; savings: number };
    changePercent: { income: number; expense: number; savings: number };
    categoryChanges: Array<{
      categoryId: string;
      categoryName: string;
      current: number;
      previous: number;
      changePercent: number;
    }>;
  }> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch comparison.');
    }
    return api.get(`/insights/spending-comparison?period=${period}`);
  },

  /**
   * Get subscription detection and analysis
   */
  async getSubscriptionAnalysis(): Promise<{
    detected: Array<{
      payee: string;
      amount: number;
      frequency: 'weekly' | 'monthly' | 'yearly';
      nextExpected: string;
      totalYearly: number;
    }>;
    totalMonthly: number;
    totalYearly: number;
    suggestions: string[];
  }> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot analyze subscriptions.');
    }
    return api.get('/insights/subscriptions');
  },

  /**
   * Trigger insight regeneration
   */
  async regenerateInsights(): Promise<{ generated: number }> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot regenerate insights.');
    }
    return api.post<{ generated: number }>('/insights/regenerate', {});
  },
};

export default insightsApi;
