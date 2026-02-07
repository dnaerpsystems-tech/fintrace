/**
 * Budget Detail Page
 * Shows detailed breakdown of a single budget
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Trash2, TrendingUp, TrendingDown, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ProgressBar, AmountDisplay } from '@/components/shared';
import { SpendingDonutChart } from '@/components/charts';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatIndianCurrency } from '@/lib/services/exportService';

export default function BudgetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch budget
  const budget = useLiveQuery(
    () => id ? db.budgets.get(id) : undefined,
    [id]
  );

  // Fetch category
  const category = useLiveQuery(
    () => budget?.categoryId ? db.categories.get(budget.categoryId) : undefined,
    [budget?.categoryId]
  );

  // Fetch transactions for this budget period
  const transactions = useLiveQuery(async () => {
    if (!budget) return [];

    const now = new Date();
    let startDate: Date;
    const endDate = new Date();

    // Calculate period based on budget type
    switch (budget.period) {
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const query = db.transactions
      .where('date')
      .between(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], true, true)
      .filter(t => t.type === 'expense');

    if (budget.categoryId) {
      const txs = await query.toArray();
      return txs.filter(t => t.categoryId === budget.categoryId);
    }

    return query.toArray();
  }, [budget]);

  // Calculate spending
  const { spent, remaining, percentage, dailyAverage, projectedSpend, status } = useMemo(() => {
    if (!budget || !transactions) {
      return { spent: 0, remaining: 0, percentage: 0, dailyAverage: 0, projectedSpend: 0, status: 'on-track' };
    }

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const remainingAmount = budget.amount - totalSpent;
    const pct = Math.min((totalSpent / budget.amount) * 100, 100);

    // Calculate daily average
    const now = new Date();
    let startDate: Date;
    let daysInPeriod: number;

    switch (budget.period) {
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        daysInPeriod = 7;
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        daysInPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        daysInPeriod = 365;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        daysInPeriod = 30;
    }

    const daysPassed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = daysInPeriod - daysPassed;
    const avgDaily = totalSpent / daysPassed;
    const projected = totalSpent + (avgDaily * daysRemaining);

    let budgetStatus = 'on-track';
    if (pct >= 100) budgetStatus = 'exceeded';
    else if (pct >= 80) budgetStatus = 'warning';

    return {
      spent: totalSpent,
      remaining: remainingAmount,
      percentage: pct,
      dailyAverage: avgDaily,
      projectedSpend: projected,
      status: budgetStatus
    };
  }, [budget, transactions]);

  // Group transactions by category for chart
  const categoryBreakdown = useMemo(() => {
    if (!transactions) return [];

    const groups: Record<string, number> = {};
    transactions.forEach(t => {
      const catId = t.categoryId || 'uncategorized';
      groups[catId] = (groups[catId] || 0) + t.amount;
    });

    return Object.entries(groups).map(([id, amount]) => ({
      id,
      amount,
      percentage: (amount / spent) * 100
    }));
  }, [transactions, spent]);

  if (!budget) {
    return (
      <Page>
        <Header title="Budget Details" showBack />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading...</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Header
        title={budget.name || category?.name || 'Budget Details'}
        showBack
        rightActions={
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/budgets/edit/${id}`)}>
              <Edit2 className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-6 pb-24">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`p-6 ${
            status === 'exceeded' ? 'bg-red-50 border-red-200' :
            status === 'warning' ? 'bg-amber-50 border-amber-200' :
            'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {status === 'exceeded' ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : status === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                )}
                <span className={`font-medium ${
                  status === 'exceeded' ? 'text-red-700' :
                  status === 'warning' ? 'text-amber-700' :
                  'text-emerald-700'
                }`}>
                  {status === 'exceeded' ? 'Budget Exceeded!' :
                   status === 'warning' ? 'Approaching Limit' :
                   'On Track'}
                </span>
              </div>
              <Badge variant={budget.period === 'monthly' ? 'default' : 'secondary'}>
                {budget.period}
              </Badge>
            </div>

            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-1">Spent</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatIndianCurrency(spent)}
              </p>
              <p className="text-sm text-gray-500">
                of {formatIndianCurrency(budget.amount)} budget
              </p>
            </div>

            <Progress
              value={percentage}
              className={`h-3 ${
                status === 'exceeded' ? 'bg-red-200' :
                status === 'warning' ? 'bg-amber-200' :
                'bg-emerald-200'
              }`}
            />

            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-600">{percentage.toFixed(0)}% used</span>
              <span className={remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {remaining >= 0 ? formatIndianCurrency(remaining) + ' left' : formatIndianCurrency(Math.abs(remaining)) + ' over'}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Daily Average</span>
              </div>
              <p className="text-xl font-semibold text-gray-900">
                {formatIndianCurrency(dailyAverage)}
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Projected</span>
              </div>
              <p className={`text-xl font-semibold ${
                projectedSpend > budget.amount ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {formatIndianCurrency(projectedSpend)}
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">Transactions</span>
              </div>
              <p className="text-xl font-semibold text-gray-900">
                {transactions?.length || 0}
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">Avg per Txn</span>
              </div>
              <p className="text-xl font-semibold text-gray-900">
                {transactions?.length ? formatIndianCurrency(spent / transactions.length) : '₹0'}
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Transactions</h3>

            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 10).map((tx, index) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    onClick={() => navigate(`/transactions/${tx.id}`)}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{tx.description || 'Transaction'}</p>
                      <p className="text-sm text-gray-500">{tx.date}</p>
                    </div>
                    <p className="font-semibold text-red-600">
                      -{formatIndianCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No transactions in this budget period
              </p>
            )}

            {transactions && transactions.length > 10 && (
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => navigate('/transactions')}
              >
                View All Transactions
              </Button>
            )}
          </Card>
        </motion.div>
      </div>
    </Page>
  );
}
