/**
 * Account Detail Page
 * Shows detailed view of a single account with analytics
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit2, Trash2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Building2, CreditCard, Wallet, PiggyBank, Landmark, MoreHorizontal, Copy, CheckCircle } from 'lucide-react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendBarChart } from '@/components/charts';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatIndianCurrency } from '@/lib/services/exportService';
import { formatDate } from '@/lib/formatters/date';

const ACCOUNT_ICONS: Record<string, any> = {
  savings: PiggyBank,
  current: Building2,
  credit_card: CreditCard,
  cash: Wallet,
  wallet: Wallet,
  investment: TrendingUp,
  loan: Landmark,
  other: MoreHorizontal
};

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Fetch account
  const account = useLiveQuery(
    () => id ? db.accounts.get(id) : undefined,
    [id]
  );

  // Fetch transactions for this account
  const transactions = useLiveQuery(async () => {
    if (!id) return [];

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return db.transactions
      .where('accountId')
      .equals(id)
      .filter(t => new Date(t.date) >= startDate)
      .reverse()
      .sortBy('date');
  }, [id, timeRange]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        netFlow: 0,
        transactionCount: 0,
        avgTransaction: 0
      };
    }

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      netFlow: income - expense,
      transactionCount: transactions.length,
      avgTransaction: transactions.length > 0 ? (income + expense) / transactions.length : 0
    };
  }, [transactions]);

  // Group transactions by date for chart
  const chartData = useMemo(() => {
    if (!transactions) return [];

    const groups: Record<string, { income: number; expense: number }> = {};

    transactions.forEach(t => {
      const date = t.date.split('T')[0];
      if (!groups[date]) {
        groups[date] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        groups[date].income += t.amount;
      } else if (t.type === 'expense') {
        groups[date].expense += t.amount;
      }
    });

    return Object.entries(groups)
      .map(([date, data]) => ({
        period: date,
        income: data.income,
        expense: data.expense
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-30);
  }, [transactions]);

  const copyAccountNumber = () => {
    if (account?.accountNumber) {
      navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!account) {
    return (
      <Page>
        <Header title="Account Details" showBack />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading...</p>
        </div>
      </Page>
    );
  }

  const Icon = ACCOUNT_ICONS[account.type] || Wallet;

  return (
    <Page>
      <Header
        title={account.name}
        showBack
        rightActions={
          <Button variant="ghost" size="icon" onClick={() => navigate(`/accounts/edit/${id}`)}>
            <Edit2 className="w-5 h-5" />
          </Button>
        }
      />

      <div className="p-4 space-y-6 pb-24">
        {/* Account Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <div className="flex items-start justify-between mb-6">
              <div className="p-3 bg-white/20 rounded-xl">
                <Icon className="w-6 h-6" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {account.type.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="mb-4">
              <p className="text-emerald-100 text-sm mb-1">Current Balance</p>
              <p className="text-3xl font-bold">
                {formatIndianCurrency(account.balance || 0)}
              </p>
            </div>

            {account.bankName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-100">{account.bankName}</span>
                {account.accountNumber && (
                  <button
                    onClick={copyAccountNumber}
                    className="flex items-center gap-1 text-white/80 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        •••• {account.accountNumber.slice(-4)}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {account.ifscCode && (
              <p className="text-emerald-100 text-sm mt-1">
                IFSC: {account.ifscCode}
              </p>
            )}
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
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-gray-600">Income</span>
              </div>
              <p className="text-xl font-semibold text-emerald-600">
                {formatIndianCurrency(stats.totalIncome)}
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
                <ArrowUpRight className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">Expense</span>
              </div>
              <p className="text-xl font-semibold text-red-600">
                {formatIndianCurrency(stats.totalExpense)}
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
                <span className="text-sm text-gray-600">Net Flow</span>
              </div>
              <p className={`text-xl font-semibold ${stats.netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatIndianCurrency(stats.netFlow)}
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
                <span className="text-sm text-gray-600">Transactions</span>
              </div>
              <p className="text-xl font-semibold text-gray-900">
                {stats.transactionCount}
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Time Range Tabs */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Cash Flow Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Cash Flow</h3>
              <div className="h-48">
                <TrendBarChart data={chartData} />
              </div>
            </Card>
          </motion.div>
        )}

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
                View All
              </Button>
            </div>

            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 10).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                    onClick={() => navigate(`/transactions/${tx.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.type === 'income' ? 'bg-emerald-100' :
                        tx.type === 'expense' ? 'bg-red-100' :
                        'bg-blue-100'
                      }`}>
                        {tx.type === 'income' ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                        ) : tx.type === 'expense' ? (
                          <ArrowUpRight className="w-4 h-4 text-red-600" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tx.description || tx.payee || 'Transaction'}</p>
                        <p className="text-sm text-gray-500">{formatDate(new Date(tx.date))}</p>
                      </div>
                    </div>
                    <p className={`font-semibold ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatIndianCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No transactions for this period
              </p>
            )}
          </Card>
        </motion.div>
      </div>
    </Page>
  );
}
