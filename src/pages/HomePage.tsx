/**
 * HomePage - Dashboard with real data
 * Shows balance, quick actions, and recent transactions
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  PieChart,
  ShoppingCart,
  Coffee,
  Briefcase,
  Zap,
  Utensils,
  Car,
  Home,
  Smartphone,
  Heart,
  GraduationCap,
  Plane,
  Gift,
  Film,
  Wallet,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Page } from "@/components/layout/Page";
import { SyncIndicator } from "@/components/sync";
import { SkeletonHomePage, InlineError } from "@/components/shared";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { formatINR } from '@/lib/formatters/currency';
import { formatDate, getRelativeTime } from '@/lib/formatters/date';
import { useAccounts, useTransactions, useCategories } from '@/db/hooks';
import { getAccountSummary, type AccountSummary } from '@/lib/services/accountService';
import { getTransactionStats, getRecentTransactions, type TransactionWithDetails } from '@/lib/services/transactionService';
import { getBudgetAlerts, type BudgetAlert } from '@/lib/services/budgetService';
import { startOfMonth, endOfMonth } from 'date-fns';
import { TransactionType, type Category } from '@/types';

// Icon components for categories
const categoryIcons: Record<string, React.ElementType> = {
  shopping: ShoppingCart,
  food: Utensils,
  coffee: Coffee,
  income: Briefcase,
  utilities: Zap,
  transport: Car,
  housing: Home,
  phone: Smartphone,
  health: Heart,
  education: GraduationCap,
  travel: Plane,
  gifts: Gift,
  entertainment: Film,
  salary: Briefcase,
  investment: TrendingUp,
  other: Wallet,
};

// Default user ID
const DEFAULT_USER_ID = 'default-user';

export function HomePage() {
  const navigate = useNavigate();

  // State
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithDetails[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<{ income: number; expense: number } | null>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);

  // Hooks
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { categories } = useCategories();

  // Create category icon map
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    if (categories) {
      for (const cat of categories) {
        map.set(cat.id, cat);
      }
    }
    return map;
  }, [categories]);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      // Load account summary
      const summary = await getAccountSummary(DEFAULT_USER_ID);
      setAccountSummary(summary);

      // Load recent transactions
      const transactions = await getRecentTransactions(DEFAULT_USER_ID, 10);
      setRecentTransactions(transactions);

      // Load monthly stats
      const now = new Date();
      const stats = await getTransactionStats(
        DEFAULT_USER_ID,
        startOfMonth(now),
        endOfMonth(now)
      );
      setMonthlyStats({
        income: stats.totalIncome,
        expense: stats.totalExpense,
      });

      // Load budget alerts
      const alerts = await getBudgetAlerts(DEFAULT_USER_ID);
      setBudgetAlerts(alerts);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData(false); // Don't show full loading skeleton on refresh
    setIsRefreshing(false);
  };

  const quickActions = [
    {
      icon: ArrowDownLeft,
      label: "Income",
      color: "bg-green-500/10",
      iconColor: "text-green-500",
      action: () => navigate("/add?type=income"),
    },
    {
      icon: ArrowUpRight,
      label: "Expense",
      color: "bg-red-500/10",
      iconColor: "text-red-500",
      action: () => navigate("/add?type=expense"),
    },
    {
      icon: ArrowLeftRight,
      label: "Transfer",
      color: "bg-purple-500/10",
      iconColor: "text-purple-500",
      action: () => navigate("/add?type=transfer"),
    },
    {
      icon: PieChart,
      label: "Budget",
      color: "bg-blue-500/10",
      iconColor: "text-blue-500",
      action: () => navigate("/budgets"),
    },
  ];

  // Calculate displayed values
  const totalBalance = accountSummary?.totalBalance || 0;
  const monthlyIncome = monthlyStats?.income || 0;
  const monthlyExpense = monthlyStats?.expense || 0;
  const hasData = accounts && accounts.length > 0;

  // Show loading skeleton
  if (isLoading && !accountSummary) {
    return (
      <Page>
        <Header
          title="FinTrace"
          rightActions={
            <div className="flex items-center gap-1">
              <SyncIndicator />
            </div>
          }
        />
        <SkeletonHomePage />
      </Page>
    );
  }

  return (
    <Page enablePullToRefresh onRefresh={handleRefresh}>
      <Header
        title="FinTrace"
        rightActions={
          <div className="flex items-center gap-1">
            <SyncIndicator />
            <motion.button
              className="p-2 rounded-full hover:bg-muted"
              whileTap={{ scale: 0.9 }}
            >
              <Search className="w-5 h-5 text-foreground" />
            </motion.button>
            <motion.button
              className="p-2 rounded-full hover:bg-muted relative"
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/notifications')}
            >
              <Bell className="w-5 h-5 text-foreground" />
              {budgetAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              )}
            </motion.button>
          </div>
        }
      />

      {/* Error State */}
      {error && (
        <div className="px-4 mb-4">
          <InlineError message={error} onRetry={() => loadDashboardData()} />
        </div>
      )}

      <div className="px-4 space-y-6">
        {/* Balance Card */}
        <motion.div
          className="rounded-2xl p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full border-4 border-white" />
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full border-4 border-white" />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/90 text-sm">Total Balance</p>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {showBalance ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>

            <h2 className="text-3xl font-bold text-white">
              {showBalance ? formatINR(totalBalance) : '₹ ••••••'}
            </h2>

            <div className="flex items-center gap-4 mt-4">
              <div>
                <p className="text-white/80 text-xs flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Income
                </p>
                <p className="text-lg font-semibold text-white">
                  {showBalance ? formatINR(monthlyIncome, { compact: true }) : '••••'}
                </p>
              </div>
              <div className="w-px h-8 bg-white/30" />
              <div>
                <p className="text-white/80 text-xs flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Expenses
                </p>
                <p className="text-lg font-semibold text-white">
                  {showBalance ? formatINR(monthlyExpense, { compact: true }) : '••••'}
                </p>
              </div>
            </div>

            {/* Net savings indicator */}
            {monthlyIncome > 0 && (
              <div className="mt-4 pt-3 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-xs">This month's savings</span>
                  <span className={`text-sm font-semibold ${
                    monthlyIncome > monthlyExpense ? 'text-emerald-200' : 'text-red-200'
                  }`}>
                    {showBalance ? formatINR(monthlyIncome - monthlyExpense, { showSign: true }) : '••••'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className={`rounded-xl p-4 ${
              budgetAlerts[0].type === 'over' ? 'bg-red-50 border border-red-200' :
              budgetAlerts[0].type === 'danger' ? 'bg-orange-50 border border-orange-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <p className={`text-sm font-medium ${
                budgetAlerts[0].type === 'over' ? 'text-red-700' :
                budgetAlerts[0].type === 'danger' ? 'text-orange-700' :
                'text-yellow-700'
              }`}>
                {budgetAlerts[0].message}
              </p>
              {budgetAlerts.length > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  +{budgetAlerts.length - 1} more alerts
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="ios-title mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  className="ios-card p-3 flex flex-col items-center gap-2"
                  whileTap={{ scale: 0.95 }}
                  onClick={action.action}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${action.iconColor}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="ios-title">Recent Transactions</h3>
            <button
              className="text-primary text-sm font-medium"
              onClick={() => navigate("/transactions")}
            >
              See All
            </button>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="ios-card divide-y divide-border">
              {recentTransactions.map((tx) => {
                const category = categoryMap.get(tx.categoryId);
                const iconKey = category?.icon || 'other';
                const Icon = categoryIcons[iconKey] || Wallet;
                const isIncome = tx.type === TransactionType.INCOME;
                const isTransfer = tx.type === TransactionType.TRANSFER;

                return (
                  <motion.div
                    key={tx.id}
                    className="ios-list-item cursor-pointer"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/transactions/${tx.id}`)}
                  >
                    <div
                      className="category-icon flex items-center justify-center"
                      style={{
                        backgroundColor: category?.color ? `${category.color}20` : '#f3f4f6'
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: category?.color || '#6b7280' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tx.description}</p>
                      <p className="ios-caption truncate">
                        {tx.categoryName || 'Uncategorized'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          isIncome ? "amount-income" :
                          isTransfer ? "text-purple-500" :
                          "amount-expense"
                        }`}
                      >
                        {isIncome ? "+" : isTransfer ? "" : "-"}
                        {formatINR(tx.amount, { showSymbol: true })}
                      </p>
                      <p className="ios-caption">
                        {getRelativeTime(new Date(tx.date))}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="ios-card p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">No transactions yet</h4>
              <p className="text-sm text-gray-500 mb-4">
                Start tracking your expenses and income
              </p>
              <motion.button
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium"
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/add')}
              >
                Add Transaction
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Quick Stats Cards */}
        {hasData && accountSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-3"
          >
            <div
              className="ios-card p-4 cursor-pointer"
              onClick={() => navigate('/accounts')}
            >
              <p className="text-xs text-gray-500 mb-1">Accounts</p>
              <p className="text-lg font-bold text-gray-900">
                {accountSummary.totalAccounts}
              </p>
              <p className="text-xs text-emerald-500">
                {formatINR(accountSummary.netWorth, { compact: true })} net worth
              </p>
            </div>

            <div
              className="ios-card p-4 cursor-pointer"
              onClick={() => navigate('/loans')}
            >
              <p className="text-xs text-gray-500 mb-1">Liabilities</p>
              <p className="text-lg font-bold text-red-500">
                {formatINR(accountSummary.totalLiabilities, { compact: true })}
              </p>
              <p className="text-xs text-gray-400">
                Credit & Loans
              </p>
            </div>
          </motion.div>
        )}

        {/* Install App Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <InstallPrompt variant="card" />
        </motion.div>

        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </div>
    </Page>
  );
}

export default HomePage;
