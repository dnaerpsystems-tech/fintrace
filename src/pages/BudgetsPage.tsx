/**
 * BudgetsPage - Budget Management with Real Data
 * Shows budget summary and category-wise budgets with spending tracking
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ShoppingBag, Utensils, Car, Home, Zap, Smartphone,
  Heart, GraduationCap, Plane, Gift, MoreHorizontal, TrendingUp,
  AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page } from '@/components/layout/Page';
import { SkeletonBudgetsPage, InlineError, EmptyState } from '@/components/shared';
import { formatINR } from '@/lib/formatters/currency';
import { getPeriodLabel } from '@/lib/formatters/date';
import {
  getBudgetSummary,
  type BudgetSummary,
} from '@/lib/services/budgetService';
import {
  getBudgetStatusColor,
  getBudgetStatusBg,
  type BudgetPeriod,
  type BudgetStatus
} from '@/lib/calculations/budget';
import { useCategories } from '@/db/hooks';

// Category icons mapping
const categoryIcons: Record<string, React.ElementType> = {
  shopping: ShoppingBag,
  food: Utensils,
  transport: Car,
  housing: Home,
  utilities: Zap,
  phone: Smartphone,
  health: Heart,
  education: GraduationCap,
  travel: Plane,
  gifts: Gift,
  other: MoreHorizontal,
};

const DEFAULT_USER_ID = 'default-user';

export default function BudgetsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);

  const { categories } = useCategories();

  // Create category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string }>();
    if (categories) {
      for (const cat of categories) {
        map.set(cat.id, { name: cat.name, icon: cat.icon, color: cat.color });
      }
    }
    return map;
  }, [categories]);

  // Load budget data
  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const data = await getBudgetSummary(DEFAULT_USER_ID, period);
      setSummary(data);
    } catch (err) {
      console.error('Error loading budgets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load budgets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: BudgetStatus) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'danger':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'over':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Page>
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          </div>
        </div>
        <SkeletonBudgetsPage />
      </Page>
    );
  }

  // Error state
  if (error) {
    return (
      <Page>
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          </div>
        </div>
        <div className="px-4 py-8">
          <InlineError message={error} onRetry={() => loadData()} />
        </div>
      </Page>
    );
  }

  return (
    <Page enablePullToRefresh onRefresh={handleRefresh}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
            <p className="text-sm text-gray-500 mt-1">{getPeriodLabel('month')}</p>
          </div>
          <Button
            onClick={() => navigate('/budgets/add')}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Period Tabs */}
        <div className="px-4 pb-3">
          <Tabs value={period} onValueChange={(v: string) => setPeriod(v as BudgetPeriod)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Empty state */}
      {(!summary || summary.budgets.length === 0) && (
        <div className="px-4 py-8">
          <EmptyState
            icon={TrendingUp}
            title="No Budgets Yet"
            description="Set budgets to track your spending and stay on target"
            action={{
              label: "Create Budget",
              onClick: () => navigate('/budgets/add'),
            }}
          />
        </div>
      )}

      {/* Content */}
      {summary && summary.budgets.length > 0 && (
        <>
          {/* Summary Card */}
          <div className="px-4 py-4">
            <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-violet-100 text-sm font-medium">Total Budget</p>
                    <p className="text-3xl font-bold mt-1">{formatINR(summary.totalBudgeted)}</p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-violet-100">
                      {formatINR(summary.totalSpent)} spent
                    </span>
                    <span className="text-violet-100">
                      {summary.overallPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(summary.overallPercentage, 100)}
                    className="h-2.5 bg-white/20"
                  />
                </div>

                <div className="flex gap-6">
                  <div>
                    <p className="text-violet-100 text-xs">Remaining</p>
                    <p className="text-lg font-semibold">
                      {summary.totalRemaining >= 0
                        ? formatINR(summary.totalRemaining)
                        : `-${formatINR(Math.abs(summary.totalRemaining))}`
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-violet-100 text-xs">Categories</p>
                    <p className="text-lg font-semibold">{summary.budgets.length}</p>
                  </div>
                  <div>
                    <p className="text-violet-100 text-xs">At Risk</p>
                    <p className="text-lg font-semibold">{summary.budgetsAtRisk + summary.budgetsOverspent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budgets List */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Category Budgets</h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-3 pb-24">
              <AnimatePresence>
                {summary.budgets.map((budget, index) => {
                  const categoryInfo = budget.categoryId ? categoryMap.get(budget.categoryId) : undefined;
                  const iconKey = categoryInfo?.icon || budget.categoryIcon || 'other';
                  const Icon = categoryIcons[iconKey] || MoreHorizontal;
                  const color = categoryInfo?.color || budget.categoryColor || '#6B7280';
                  const categoryName = categoryInfo?.name || budget.categoryName || 'Unknown';
                  const result = budget.status;

                  return (
                    <motion.div
                      key={budget.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${color}20` }}
                            >
                              <Icon className="w-6 h-6" style={{ color }} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">{categoryName}</h3>
                                {getStatusIcon(result.status)}
                              </div>

                              {/* Progress */}
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-gray-500">
                                    {formatINR(result.spent)} / {formatINR(result.budgeted)}
                                  </span>
                                  <span className={getBudgetStatusColor(result.status)}>
                                    {result.percentage.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${getBudgetStatusBg(result.status)}`}
                                    style={{ width: `${Math.min(result.percentage, 100)}%` }}
                                  />
                                </div>
                              </div>

                              {/* Remaining / Over */}
                              <div className="flex items-center justify-between mt-2">
                                {result.isOverBudget ? (
                                  <p className="text-sm text-red-500 font-medium">
                                    Over by {formatINR(Math.abs(result.remaining))}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-500">
                                    {formatINR(result.remaining)} left
                                  </p>
                                )}
                                <p className="text-xs text-gray-400">
                                  {result.daysRemaining} days left
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {/* FAB */}
      <motion.button
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center z-20"
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/budgets/add')}
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </Page>
  );
}
