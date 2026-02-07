/**
 * StatsPage - Statistics and Analytics with Real Data
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Loader2,
} from "lucide-react";
import { format, subMonths, subWeeks, subYears, addMonths, addWeeks, addYears, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Page } from "@/components/layout/Page";
import {
  SpendingDonutChart,
  TrendBarChart,
  CashFlowChart,
  CHART_COLORS,
  type CategoryData,
  type TrendData,
  type CashFlowData,
} from "@/components/charts";
import { formatINR } from "@/lib/formatters/currency";
import {
  getTransactionStats,
  getSpendingTrend,
  getTopCategories,
  type TransactionStats
} from "@/lib/services/transactionService";
import { SkeletonStatsPage, InlineError } from "@/components/shared";
import { useCategories } from "@/db/hooks";

// ============================================
// Types
// ============================================

type Period = "week" | "month" | "year" | "custom";

interface SummaryCard {
  title: string;
  value: number;
  change: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

interface TopCategory {
  name: string;
  amount: number;
  percent: number;
  color: string;
  icon: string;
  transactionCount: number;
}

const DEFAULT_USER_ID = 'default-user';

// Category icon mapping
const categoryIconMap: Record<string, string> = {
  food: '🍔',
  shopping: '🛍️',
  transport: '🚗',
  utilities: '📱',
  entertainment: '🎬',
  health: '💊',
  education: '📚',
  travel: '✈️',
  housing: '🏠',
  other: '📦',
};

// ============================================
// Animated Counter Component
// ============================================

function AnimatedCounter({
  value,
  prefix = "₹",
  duration = 1000
}: {
  value: number;
  prefix?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Easing function (ease-out)
      const eased = 1 - (1 - progress) ** 3;

      const currentValue = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  // Format with Indian numbering
  const formatted = displayValue >= 100
    ? formatINR(displayValue, { showSymbol: false })
    : displayValue.toLocaleString('en-IN');

  return (
    <span className="rupee">
      {prefix}
      {formatted}
    </span>
  );
}

// ============================================
// Summary Card Component
// ============================================

function SummaryCardComponent({
  card,
  index,
}: {
  card: SummaryCard;
  index: number;
}) {
  const Icon = card.icon;
  const isPositive = card.change >= 0;

  return (
    <motion.div
      className="flex-shrink-0 w-40 ios-card p-4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${card.iconColor}`} />
        </div>
        {card.change !== 0 && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${
            isPositive ? "text-emerald-500" : "text-rose-500"
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(card.change)}%
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
      <p className="text-lg font-bold">
        <AnimatedCounter value={card.value} prefix={card.title === "Transactions" ? "" : "₹"} />
      </p>
    </motion.div>
  );
}

// ============================================
// Period Selector Component
// ============================================

function PeriodSelector({
  period,
  setPeriod,
  dateRange,
  onNavigate,
}: {
  period: Period;
  setPeriod: (p: Period) => void;
  dateRange: { start: Date; end: Date };
  onNavigate: (direction: "prev" | "next") => void;
}) {
  const periods: { value: Period; label: string }[] = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
  ];

  const formatDateRange = () => {
    if (period === "year") {
      return format(dateRange.start, "yyyy");
    }
    if (period === "month") {
      return format(dateRange.start, "MMMM yyyy");
    }
    return `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`;
  };

  return (
    <div className="space-y-3">
      {/* Period tabs */}
      <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
        {periods.map((p) => (
          <motion.button
            key={p.value}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              period === p.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setPeriod(p.value)}
            whileTap={{ scale: 0.98 }}
          >
            {p.label}
          </motion.button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <motion.button
          className="p-2 rounded-lg hover:bg-muted"
          onClick={() => onNavigate("prev")}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>{formatDateRange()}</span>
        </div>
        <motion.button
          className="p-2 rounded-lg hover:bg-muted"
          onClick={() => onNavigate("next")}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}

// ============================================
// Top Categories List Component
// ============================================

function TopCategoriesList({ categories }: { categories: TopCategory[] }) {
  if (categories.length === 0) {
    return (
      <div className="ios-card p-8 text-center">
        <p className="text-muted-foreground">No spending data yet</p>
      </div>
    );
  }

  return (
    <div className="ios-card divide-y divide-border">
      {categories.map((category, index) => (
        <motion.div
          key={category.name}
          className="ios-list-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + index * 0.1 }}
        >
          {/* Rank */}
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {index + 1}
          </div>

          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: `${category.color}20` }}
          >
            {category.icon}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium truncate">{category.name}</p>
              <p className="font-semibold">
                {formatINR(category.amount)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: category.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${category.percent}%` }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8">
                {category.percent.toFixed(0)}%
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// Main StatsPage Component
// ============================================

export function StatsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);

  const { categories: allCategories } = useCategories();

  // Create category map
  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; icon: string }>();
    if (allCategories) {
      for (const cat of allCategories) {
        map.set(cat.id, {
          name: cat.name,
          color: cat.color,
          icon: categoryIconMap[cat.icon] || '📦'
        });
      }
    }
    return map;
  }, [allCategories]);

  // Calculate date range based on period and offset
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case "week":
        start = startOfWeek(subWeeks(now, -offset), { weekStartsOn: 1 });
        end = endOfWeek(subWeeks(now, -offset), { weekStartsOn: 1 });
        break;
      case "year":
        start = startOfYear(subYears(now, -offset));
        end = endOfYear(subYears(now, -offset));
        break;

      default:
        start = startOfMonth(subMonths(now, -offset));
        end = endOfMonth(subMonths(now, -offset));
        break;
    }

    return { start, end };
  }, [period, offset]);

  // Fetch data when period or offset changes
  useEffect(() => {
    async function loadData() {
      setError(null);
      setError(null);
      setIsLoading(true);
      try {
        // Get transaction stats
        const statsData = await getTransactionStats(
          DEFAULT_USER_ID,
          dateRange.start,
          dateRange.end
        );
        setStats(statsData);

        // Get top categories
        const topCats = await getTopCategories(
          DEFAULT_USER_ID,
          dateRange.start,
          dateRange.end,
          5
        );

        // Transform to CategoryData for donut chart
        const catData: CategoryData[] = topCats.map((cat, index) => ({
          name: cat.categoryName,
          value: cat.total,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }));
        setCategoryData(catData);

        // Transform to TopCategory for list
        const topCatList: TopCategory[] = topCats.map((cat, index) => {
          const catInfo = categoryMap.get(cat.categoryId);
          return {
            name: cat.categoryName,
            amount: cat.total,
            percent: cat.percentage,
            color: catInfo?.color || CHART_COLORS[index % CHART_COLORS.length],
            icon: catInfo?.icon || '📦',
            transactionCount: 0, // Would need separate query
          };
        });
        setTopCategories(topCatList);

        // Get spending trend (handle 'custom' by defaulting to 'month')
        const trendPeriod: 'week' | 'month' | 'year' = period === 'custom' ? 'month' : period;
        const trend = await getSpendingTrend(DEFAULT_USER_ID, trendPeriod);
        const trendFormatted: TrendData[] = trend.map(t => ({
          period: period === 'year'
            ? format(new Date(t.date + '-01'), 'MMM')
            : format(new Date(t.date), period === 'week' ? 'EEE' : 'dd'),
          income: t.income,
          expense: t.expense,
        }));
        setTrendData(trendFormatted);

        // Build cash flow data
        let runningBalance = 0;
        const cashFlow: CashFlowData[] = trend.map(t => {
          runningBalance += t.income - t.expense;
          return {
            date: period === 'year'
              ? format(new Date(t.date + '-01'), 'MMM')
              : format(new Date(t.date), period === 'week' ? 'EEE' : 'dd'),
            balance: runningBalance,
            income: t.income,
            expense: t.expense,
          };
        });
        setCashFlowData(cashFlow);

      } catch (error) {
        console.error('Error loading stats:', error);
        setError(error instanceof Error ? error.message : 'Failed to load stats');
        setError(error instanceof Error ? error.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [dateRange, period, categoryMap]);

  // Summary cards
  const summaryCards: SummaryCard[] = stats ? [
    {
      title: "Total Spending",
      value: stats.totalExpense,
      change: 0, // Would need previous period comparison
      icon: TrendingDown,
      iconColor: "text-rose-500",
      iconBg: "bg-rose-500/10",
    },
    {
      title: "Total Income",
      value: stats.totalIncome,
      change: 0,
      icon: TrendingUp,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      title: "Net Savings",
      value: stats.netFlow,
      change: stats.totalIncome > 0 ? Math.round((stats.netFlow / stats.totalIncome) * 100) : 0,
      icon: Wallet,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10",
    },
    {
      title: "Transactions",
      value: stats.transactionCount,
      change: 0,
      icon: Receipt,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
    },
  ] : [];

  const handleNavigate = (direction: "prev" | "next") => {
    setOffset((prev) => (direction === "prev" ? prev - 1 : prev + 1));
  };

  const handleCategoryClick = (category: CategoryData) => {
    // Could navigate to category details
    console.log('Category clicked:', category);
  };

  return (
    <Page>
      <Header
        title="Statistics"
        rightActions={
          <motion.button
            className="p-2 rounded-full hover:bg-muted"
            whileTap={{ scale: 0.9 }}
          >
            <Filter className="w-5 h-5 text-foreground" />
          </motion.button>
        }
      />

      <div className="px-4 space-y-6 pb-6">
        {/* Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PeriodSelector
            period={period}
            setPeriod={(p) => {
              setPeriod(p);
              setOffset(0);
            }}
            dateRange={dateRange}
            onNavigate={handleNavigate}
          />
        </motion.div>

        {isLoading ? (
          <SkeletonStatsPage />
        ) : error ? (
          <InlineError message={error} onRetry={() => window.location.reload()} />
        ) : (
          <>
            {/* Summary Cards (Horizontal Scroll) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="ios-title mb-3">Overview</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {summaryCards.map((card, index) => (
                  <SummaryCardComponent key={card.title} card={card} index={index} />
                ))}
              </div>
            </motion.div>

            {/* Spending by Category (Donut Chart) */}
            {categoryData.length > 0 && (
              <motion.div
                className="ios-card p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="ios-title mb-4">Spending by Category</h3>
                <SpendingDonutChart
                  data={categoryData}
                  totalAmount={stats?.totalExpense || 0}
                  onCategoryClick={handleCategoryClick}
                />
              </motion.div>
            )}

            {/* Income vs Expense Trend (Bar Chart) */}
            {trendData.length > 0 && (
              <motion.div
                className="ios-card p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="ios-title mb-4">Income vs Expense</h3>
                <TrendBarChart data={trendData} />
              </motion.div>
            )}

            {/* Cash Flow Chart (Area Chart) */}
            {cashFlowData.length > 0 && (
              <motion.div
                className="ios-card p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="ios-title">Cash Flow</h3>
                  {cashFlowData.length > 1 && (
                    <div className="flex items-center gap-1 text-sm">
                      {cashFlowData[cashFlowData.length - 1].balance >
                       cashFlowData[0].balance ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-500 font-medium">Growing</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 text-rose-500" />
                          <span className="text-rose-500 font-medium">Declining</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <CashFlowChart data={cashFlowData} />
              </motion.div>
            )}

            {/* Top Spending Categories (List) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="ios-title mb-3">Top Categories</h3>
              <TopCategoriesList categories={topCategories} />
            </motion.div>

            {/* Insights Section */}
            {stats && stats.largestExpense && (
              <motion.div
                className="ios-card p-5 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">💡</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-violet-600 dark:text-violet-400 mb-1">
                      Smart Insight
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Your largest expense this {period} was "{stats.largestExpense.description}"
                      at {formatINR(stats.largestExpense.amount)}.
                      {stats.averageExpense > 0 && (
                        <> Your average expense is {formatINR(stats.averageExpense)}.</>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {stats?.transactionCount === 0 && (
              <div className="ios-card p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">No Data Yet</h4>
                <p className="text-sm text-gray-500">
                  Add some transactions to see your statistics
                </p>
              </div>
            )}
          </>
        )}

        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </div>
    </Page>
  );
}

export default StatsPage;
