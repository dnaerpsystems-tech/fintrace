import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Building2, Wallet, CreditCard, PiggyBank, TrendingUp,
  ChevronRight, Eye, EyeOff, ArrowLeft
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonAccountsPage, EmptyState, InlineError } from '@/components/shared';
import { formatINR } from '@/lib/formatters/currency';
import { useAccounts } from '@/db/hooks';

// Account type icons
const accountIcons: Record<string, React.ElementType> = {
  bank: Building2,
  savings: Building2,
  current: Building2,
  cash: Wallet,
  credit_card: CreditCard,
  wallet: PiggyBank,
  investment: TrendingUp,
  loan: CreditCard,
  other: Wallet,
};

const accountColors: Record<string, string> = {
  bank: 'bg-blue-50 text-blue-500',
  savings: 'bg-blue-50 text-blue-500',
  current: 'bg-indigo-50 text-indigo-500',
  cash: 'bg-emerald-50 text-emerald-500',
  credit_card: 'bg-orange-50 text-orange-500',
  wallet: 'bg-violet-50 text-violet-500',
  investment: 'bg-cyan-50 text-cyan-500',
  loan: 'bg-red-50 text-red-500',
  other: 'bg-gray-50 text-gray-500',
};

export default function AccountsPage() {
  const navigate = useNavigate();
  const { accounts, isLoading } = useAccounts();
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    // Trigger a re-render by resetting error
    setError(null);
  };
  const [showBalances, setShowBalances] = useState(true);

  // Filter active accounts
  const activeAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(a => !a.isArchived);
  }, [accounts]);

  // Calculate totals
  const { totalBalance, totalAssets, totalLiabilities } = useMemo(() => {
    const includedAccounts = activeAccounts.filter(a => a.includeInTotal);

    const total = includedAccounts.reduce((sum, a) => sum + a.balance, 0);
    const assets = includedAccounts
      .filter(a => a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);
    const liabilities = Math.abs(
      includedAccounts
        .filter(a => a.balance < 0)
        .reduce((sum, a) => sum + a.balance, 0)
    );

    return { totalBalance: total, totalAssets: assets, totalLiabilities: liabilities };
  }, [activeAccounts]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Accounts</h1>
              <p className="text-sm text-gray-500">Manage your money</p>
            </div>
          </div>
        </div>
        <SkeletonAccountsPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Accounts</h1>
            <p className="text-sm text-gray-500">Manage your money</p>
          </div>
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            {showBalances ? (
              <Eye className="w-5 h-5 text-gray-600" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-4 py-4">
          <InlineError message={error} onRetry={refetch} />
        </div>
      )}

      {/* Net Worth Card */}
      <div className="px-4 py-4">
        <Card className="bg-gradient-to-br from-slate-700 to-slate-900 text-white border-0 shadow-lg">
          <CardContent className="p-5">
            <p className="text-slate-300 text-sm font-medium">Net Worth</p>
            <p className="text-3xl font-bold mt-1">
              {showBalances ? formatINR(totalBalance) : '₹ ••••••'}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-slate-400 text-xs">Assets</p>
                <p className="text-lg font-semibold text-emerald-400">
                  {showBalances ? formatINR(totalAssets, { compact: true }) : '••••'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Liabilities</p>
                <p className="text-lg font-semibold text-red-400">
                  {showBalances ? formatINR(totalLiabilities, { compact: true }) : '••••'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">All Accounts</h2>
          <span className="text-sm text-gray-500">{activeAccounts.length} accounts</span>
        </div>

        {activeAccounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            description="Add your bank accounts, wallets, and credit cards to start tracking."
            action={{
              label: 'Add Account',
              onClick: () => navigate('/accounts/add'),
            }}
          />
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {activeAccounts.map((account, index) => {
                const accountType = account.type.toLowerCase().replace(' ', '_');
                const Icon = accountIcons[accountType] || Wallet;
                const colorClass = accountColors[accountType] || 'bg-gray-50 text-gray-500';
                const isNegative = account.balance < 0;

                return (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/accounts/${account.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {/* Icon */}
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: account.color ? `${account.color}20` : undefined,
                              color: account.color || undefined
                            }}
                          >
                            <Icon className="w-6 h-6" style={{ color: account.color }} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{account.name}</h3>
                            <p className="text-xs text-gray-500 capitalize">
                              {account.bankName || account.type.replace('_', ' ')}
                            </p>
                          </div>

                          {/* Balance */}
                          <div className="text-right">
                            <p className={`font-semibold ${isNegative ? 'text-red-500' : 'text-gray-900'}`}>
                              {showBalances
                                ? formatINR(account.balance, { showSign: isNegative })
                                : '₹ ••••'
                              }
                            </p>
                            {!account.includeInTotal && (
                              <p className="text-xs text-gray-400">Excluded</p>
                            )}
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center z-20"
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/accounts/add')}
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
