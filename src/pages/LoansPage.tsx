/**
 * LoansPage - Loan Management with Real Data
 * Shows loan summary and active loans with EMI tracking
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Home, Car, User, GraduationCap, Gem, Briefcase,
  CreditCard, FileText, ChevronRight, TrendingDown, Calendar,
  IndianRupee, Percent, Clock, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Page } from '@/components/layout/Page';
import { SkeletonLoansPage, InlineError, EmptyState } from '@/components/shared';
import { formatINR } from '@/lib/formatters/currency';
import { formatDate } from '@/lib/formatters/date';
import { LOAN_TYPES, type LoanType } from '@/lib/calculations/loan';
import { getLoanSummary, type LoanSummary } from '@/lib/services/loanService';

// Icon mapping
const loanIcons: Record<LoanType, React.ElementType> = {
  home: Home,
  car: Car,
  personal: User,
  education: GraduationCap,
  gold: Gem,
  business: Briefcase,
  credit_card: CreditCard,
  other: FileText,
};

const DEFAULT_USER_ID = 'default-user';

export default function LoansPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<LoanSummary | null>(null);

  // Load loan data
  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const data = await getLoanSummary(DEFAULT_USER_ID);
      setSummary(data);
    } catch (err) {
      console.error('Error loading loans:', err);
      setError(err instanceof Error ? err.message : 'Failed to load loans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <Page>
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Loans & EMI</h1>
            <p className="text-sm text-gray-500 mt-1">Track your loan repayments</p>
          </div>
        </div>
        <SkeletonLoansPage />
      </Page>
    );
  }

  // Error state
  if (error) {
    return (
      <Page>
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Loans & EMI</h1>
            <p className="text-sm text-gray-500 mt-1">Track your loan repayments</p>
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
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Loans & EMI</h1>
          <p className="text-sm text-gray-500 mt-1">Track your loan repayments</p>
        </div>
      </div>

      {/* Empty state */}
      {(!summary || summary.activeLoans === 0) && (
        <div className="px-4 py-8">
          <EmptyState
            icon={FileText}
            title="No Loans Yet"
            description="Add your first loan to start tracking EMIs"
            action={{
              label: "Add Loan",
              onClick: () => navigate('/loans/add'),
            }}
          />
        </div>
      )}

      {/* Content */}
      {summary && summary.activeLoans > 0 && (
        <>
          {/* Summary Card */}
          <div className="px-4 py-4">
            <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-rose-100 text-sm font-medium">Total Outstanding</p>
                    <p className="text-3xl font-bold mt-1">{formatINR(summary.totalOutstanding, { compact: true })}</p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                    <TrendingDown className="w-7 h-7" />
                  </div>
                </div>

                <div className="flex gap-6">
                  <div>
                    <p className="text-rose-100 text-xs">Monthly EMI</p>
                    <p className="text-lg font-semibold">{formatINR(summary.totalMonthlyEMI)}</p>
                  </div>
                  <div>
                    <p className="text-rose-100 text-xs">Active Loans</p>
                    <p className="text-lg font-semibold">{summary.activeLoans}</p>
                  </div>
                  <div>
                    <p className="text-rose-100 text-xs">Interest Paid</p>
                    <p className="text-lg font-semibold">{formatINR(summary.totalInterestPaid, { compact: true })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming EMIs */}
          {summary.upcomingEMIs.length > 0 && (
            <div className="px-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming EMIs</h2>
              <Card>
                <CardContent className="p-0 divide-y">
                  {summary.upcomingEMIs.slice(0, 3).map((emi) => (
                    <div key={`${emi.loanId}-${emi.dueDate}`} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{emi.loanName}</p>
                        <p className="text-xs text-gray-500">{formatDate(new Date(emi.dueDate), 'medium')}</p>
                      </div>
                      <p className="font-semibold text-rose-600">{formatINR(emi.amount)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Overdue EMIs Alert */}
          {summary.overdueEMIs.length > 0 && (
            <div className="px-4 mb-4">
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <p className="font-semibold text-red-700">Overdue EMIs ({summary.overdueEMIs.length})</p>
                  </div>
                  <div className="space-y-2">
                    {summary.overdueEMIs.slice(0, 2).map((emi) => (
                      <div key={`${emi.loanId}-${emi.dueDate}`} className="flex items-center justify-between text-sm">
                        <span className="text-red-600">{emi.loanName}</span>
                        <span className="font-medium text-red-700">{formatINR(emi.amount)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loans List */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Your Loans</h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-3 pb-24">
              <p className="text-sm text-gray-500">
                {summary.totalLoans} total loans • {summary.activeLoans} active
              </p>
              <p className="text-sm text-gray-600">
                Principal paid: {formatINR(summary.totalPrincipalPaid, { compact: true })}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="px-4 mt-6 pb-24">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Tools</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/emi-calculator')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">EMI Calculator</p>
                <p className="text-xs text-gray-500">Plan your loan</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/loan-compare')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Compare Loans</p>
                <p className="text-xs text-gray-500">Find best option</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAB */}
      <motion.button
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center z-20"
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/loans/add')}
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </Page>
  );
}
