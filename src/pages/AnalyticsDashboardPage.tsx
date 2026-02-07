/**
 * Analytics Dashboard Page
 * Comprehensive expense analytics with charts and insights
 */

import { useState, useMemo } from 'react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { formatINR } from '@/lib/formatters/currency';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Wallet,
  CreditCard,
  ShoppingBag,
  Car,
  Utensils,
  Film,
  Zap,
  Home,
  Heart
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface CategorySpending {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: React.ElementType;
  change: number;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

interface DailySpending {
  day: string;
  amount: number;
}

// ============================================
// Mock Data
// ============================================

const CATEGORY_SPENDING: CategorySpending[] = [
  { name: 'Shopping', amount: 4500000, percentage: 28, color: '#8b5cf6', icon: ShoppingBag, change: 12 },
  { name: 'Food & Dining', amount: 3200000, percentage: 20, color: '#f59e0b', icon: Utensils, change: -5 },
  { name: 'Transportation', amount: 2100000, percentage: 13, color: '#3b82f6', icon: Car, change: 8 },
  { name: 'Entertainment', amount: 1800000, percentage: 11, color: '#ec4899', icon: Film, change: 15 },
  { name: 'Utilities', amount: 1500000, percentage: 9, color: '#10b981', icon: Zap, change: 3 },
  { name: 'Housing', amount: 2000000, percentage: 12, color: '#6366f1', icon: Home, change: 0 },
  { name: 'Healthcare', amount: 1100000, percentage: 7, color: '#ef4444', icon: Heart, change: -10 },
];

const MONTHLY_TRENDS: MonthlyTrend[] = [
  { month: 'Sep', income: 15000000, expense: 12000000, savings: 3000000 },
  { month: 'Oct', income: 15500000, expense: 11500000, savings: 4000000 },
  { month: 'Nov', income: 16000000, expense: 13500000, savings: 2500000 },
  { month: 'Dec', income: 18000000, expense: 15000000, savings: 3000000 },
  { month: 'Jan', income: 15000000, expense: 11000000, savings: 4000000 },
  { month: 'Feb', income: 16200000, expense: 12500000, savings: 3700000 },
];

const DAILY_SPENDING: DailySpending[] = [
  { day: 'Mon', amount: 250000 },
  { day: 'Tue', amount: 180000 },
  { day: 'Wed', amount: 320000 },
  { day: 'Thu', amount: 150000 },
  { day: 'Fri', amount: 450000 },
  { day: 'Sat', amount: 580000 },
  { day: 'Sun', amount: 420000 },
];

// ============================================
// Helper
// ============================================

const formatCurrency = (amount: number) => formatINR(amount, { decimals: 0 });

// ============================================
// Components
// ============================================

function DonutChart({ data }: { data: CategorySpending[] }) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  let cumulativePercentage = 0;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        {data.map((item, index) => {
          const startAngle = cumulativePercentage * 3.6;
          cumulativePercentage += item.percentage;
          const endAngle = cumulativePercentage * 3.6;

          const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
          const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
          const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
          const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

          const largeArcFlag = item.percentage > 50 ? 1 : 0;

          return (
            <path
              key={index}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={item.color}
              className="transition-opacity hover:opacity-80"
            />
          );
        })}
        <circle cx="50" cy="50" r="25" fill="white" className="dark:fill-gray-900" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-gray-500">Total</p>
        <p className="text-sm font-bold">{formatCurrency(total)}</p>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: MonthlyTrend[] }) {
  const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expense)));

  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex gap-1 items-end h-32">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(item.income / maxValue) * 100}%` }}
              transition={{ delay: index * 0.1 }}
              className="w-3 bg-emerald-500 rounded-t"
              title={`Income: ${formatCurrency(item.income)}`}
            />
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(item.expense / maxValue) * 100}%` }}
              transition={{ delay: index * 0.1 + 0.05 }}
              className="w-3 bg-red-400 rounded-t"
              title={`Expense: ${formatCurrency(item.expense)}`}
            />
          </div>
          <span className="text-xs text-gray-500">{item.month}</span>
        </div>
      ))}
    </div>
  );
}

function WeeklyChart({ data }: { data: DailySpending[] }) {
  const maxValue = Math.max(...data.map(d => d.amount));

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(item.amount / maxValue) * 100}%` }}
            transition={{ delay: index * 0.05 }}
            className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t min-h-[4px]"
          />
          <span className="text-xs text-gray-500">{item.day}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function AnalyticsDashboardPage() {
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate summary metrics
  const summary = useMemo(() => {
    const currentMonth = MONTHLY_TRENDS[MONTHLY_TRENDS.length - 1];
    const previousMonth = MONTHLY_TRENDS[MONTHLY_TRENDS.length - 2];

    const incomeChange = ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100;
    const expenseChange = ((currentMonth.expense - previousMonth.expense) / previousMonth.expense) * 100;
    const savingsChange = ((currentMonth.savings - previousMonth.savings) / previousMonth.savings) * 100;

    const avgDailySpend = DAILY_SPENDING.reduce((sum, d) => sum + d.amount, 0) / 7;

    return {
      income: currentMonth.income,
      expense: currentMonth.expense,
      savings: currentMonth.savings,
      savingsRate: (currentMonth.savings / currentMonth.income) * 100,
      incomeChange,
      expenseChange,
      savingsChange,
      avgDailySpend,
    };
  }, []);

  return (
    <Page>
      <Header title="Analytics" showBack />

      <div className="px-4 pb-24 space-y-6">
        {/* Header with Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900">Financial Analytics</h2>
            <p className="text-sm text-gray-500">Track your spending patterns</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 opacity-80" />
                <Badge className={`${summary.incomeChange >= 0 ? 'bg-white/20' : 'bg-red-400/30'} text-white border-0`}>
                  {summary.incomeChange >= 0 ? '+' : ''}{summary.incomeChange.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-sm opacity-80">Income</p>
              <p className="text-xl font-bold">{formatCurrency(summary.income)}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-4 bg-gradient-to-br from-red-500 to-rose-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-5 h-5 opacity-80" />
                <Badge className={`${summary.expenseChange <= 0 ? 'bg-white/20' : 'bg-red-400/30'} text-white border-0`}>
                  {summary.expenseChange >= 0 ? '+' : ''}{summary.expenseChange.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-sm opacity-80">Expenses</p>
              <p className="text-xl font-bold">{formatCurrency(summary.expense)}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-5 h-5 text-blue-500" />
                <span className={`text-xs font-medium ${summary.savingsChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {summary.savingsChange >= 0 ? '+' : ''}{summary.savingsChange.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-gray-500">Savings</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.savings)}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-sm text-gray-500">Savings Rate</p>
              <p className="text-xl font-bold text-gray-900">{summary.savingsRate.toFixed(1)}%</p>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Weekly Spending */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Weekly Spending</h3>
                <Badge variant="secondary">
                  Avg: {formatCurrency(summary.avgDailySpend)}/day
                </Badge>
              </div>
              <WeeklyChart data={DAILY_SPENDING} />
            </Card>

            {/* Income vs Expense */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
              <BarChart data={MONTHLY_TRENDS} />
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded" />
                  <span className="text-sm text-gray-600">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded" />
                  <span className="text-sm text-gray-600">Expenses</span>
                </div>
              </div>
            </Card>

            {/* Top Expenses */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Top Expenses</h3>
              <div className="space-y-3">
                {CATEGORY_SPENDING.slice(0, 4).map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <motion.div
                      key={category.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: category.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{category.name}</span>
                          <span className="font-medium">{formatCurrency(category.amount)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${category.percentage}%` }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="mt-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">Spending by Category</h3>
              <DonutChart data={CATEGORY_SPENDING} />

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mt-6">
                {CATEGORY_SPENDING.map((category) => (
                  <div key={category.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-600">{category.name}</span>
                    <span className="text-sm font-medium text-gray-900 ml-auto">
                      {category.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Category Details */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Category Details</h3>
              <div className="space-y-3">
                {CATEGORY_SPENDING.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <motion.div
                      key={category.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: category.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{category.name}</p>
                        <p className="text-sm text-gray-500">{category.percentage}% of total</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(category.amount)}</p>
                        <p className={`text-xs flex items-center justify-end gap-1 ${
                          category.change >= 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {category.change >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {Math.abs(category.change)}%
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="mt-4 space-y-4">
            {/* Monthly Savings */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Savings Trend</h3>
              <div className="space-y-3">
                {MONTHLY_TRENDS.map((month, index) => {
                  const savingsRate = (month.savings / month.income) * 100;
                  return (
                    <motion.div
                      key={month.month}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{month.month}</span>
                        <span className="text-sm font-medium text-emerald-600">
                          {formatCurrency(month.savings)} ({savingsRate.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${savingsRate}%` }}
                          transition={{ delay: index * 0.1 + 0.2 }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>

            {/* Key Insights */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Key Insights</h3>
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm font-medium text-emerald-800">
                    Your savings rate improved by 8% this month
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Keep up the good work!
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">
                    Entertainment spending is 15% higher than last month
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Consider setting a budget limit
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    You spent most on weekends (Sat & Sun)
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Weekend spending accounts for 43% of weekly expenses
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  );
}
