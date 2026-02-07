/**
 * Net Worth Page
 * Shows total assets vs liabilities with historical trend
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet,
  CreditCard, Building2, PiggyBank,
  Landmark, ArrowUpRight, ArrowDownRight,
  ChevronRight, Calendar
} from 'lucide-react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashFlowChart } from '@/components/charts';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatIndianCurrency } from '@/lib/services/exportService';

export default function NetWorthPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '1y' | 'all'>('1y');

  // Fetch all accounts
  const accounts = useLiveQuery(() => db.accounts.toArray(), []);

  // Fetch all loans
  const loans = useLiveQuery(() => db.loans.toArray(), []);

  // Fetch all investments
  const investments = useLiveQuery(() => db.investments.toArray(), []);

  // Calculate assets and liabilities
  const { assets, liabilities, netWorth, assetBreakdown, liabilityBreakdown } = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    const assetItems: Array<{ name: string; type: string; amount: number; icon: string }> = [];
    const liabilityItems: Array<{ name: string; type: string; amount: number; icon: string }> = [];

    // Bank accounts as assets
    accounts?.forEach(acc => {
      if (acc.type !== 'credit_card' && acc.type !== 'loan') {
        totalAssets += acc.balance || 0;
        assetItems.push({
          name: acc.name,
          type: acc.type,
          amount: acc.balance || 0,
          icon: 'wallet'
        });
      } else if (acc.type === 'credit_card') {
        // Credit card balance is a liability
        const balance = acc.balance || 0;
        if (balance > 0) {
          totalLiabilities += balance;
          liabilityItems.push({
            name: acc.name,
            type: 'credit_card',
            amount: balance,
            icon: 'credit-card'
          });
        }
      }
    });

    // Investments as assets
    investments?.forEach(inv => {
      const value = inv.currentValue || inv.investedAmount || 0;
      totalAssets += value;
      assetItems.push({
        name: inv.name,
        type: inv.type,
        amount: value,
        icon: 'trending-up'
      });
    });

    // Loans as liabilities
    loans?.forEach(loan => {
      const outstanding = loan.outstandingPrincipal || 0;
      totalLiabilities += outstanding;
      liabilityItems.push({
        name: loan.name,
        type: loan.type,
        amount: outstanding,
        icon: 'landmark'
      });
    });

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      assetBreakdown: assetItems.sort((a, b) => b.amount - a.amount),
      liabilityBreakdown: liabilityItems.sort((a, b) => b.amount - a.amount)
    };
  }, [accounts, loans, investments]);

  // Group assets by type for chart
  const assetsByType = useMemo(() => {
    const groups: Record<string, number> = {};

    accounts?.forEach(acc => {
      if (acc.type !== 'credit_card' && acc.type !== 'loan') {
        groups[acc.type] = (groups[acc.type] || 0) + (acc.balance || 0);
      }
    });

    investments?.forEach(inv => {
      const type = 'investment';
      groups[type] = (groups[type] || 0) + (inv.currentValue || inv.investedAmount || 0);
    });

    return Object.entries(groups).map(([type, amount]) => ({
      type,
      amount,
      percentage: assets > 0 ? (amount / assets) * 100 : 0
    }));
  }, [accounts, investments, assets]);

  // Calculate net worth change (mock data for now)
  const netWorthChange = {
    amount: netWorth * 0.05, // 5% increase as placeholder
    percentage: 5,
    isPositive: true
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'savings': return <PiggyBank className="w-4 h-4" />;
      case 'current': return <Building2 className="w-4 h-4" />;
      case 'credit_card': return <CreditCard className="w-4 h-4" />;
      case 'investment': return <TrendingUp className="w-4 h-4" />;
      case 'wallet': case 'cash': return <Wallet className="w-4 h-4" />;
      default: return <Landmark className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'savings': return 'bg-emerald-100 text-emerald-600';
      case 'current': return 'bg-blue-100 text-blue-600';
      case 'credit_card': return 'bg-red-100 text-red-600';
      case 'investment': return 'bg-purple-100 text-purple-600';
      case 'wallet': case 'cash': return 'bg-amber-100 text-amber-600';
      case 'home': return 'bg-cyan-100 text-cyan-600';
      case 'vehicle': return 'bg-orange-100 text-orange-600';
      case 'personal': return 'bg-pink-100 text-pink-600';
      case 'education': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <Page>
      <Header title="Net Worth" showBack />

      <div className="p-4 space-y-6 pb-24">
        {/* Net Worth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`p-6 bg-gradient-to-br ${
            netWorth >= 0
              ? 'from-emerald-500 to-emerald-600'
              : 'from-red-500 to-red-600'
          } text-white`}>
            <p className="text-white/80 text-sm mb-1">Total Net Worth</p>
            <p className="text-4xl font-bold mb-2">
              {formatIndianCurrency(netWorth)}
            </p>

            <div className="flex items-center gap-2 text-sm">
              {netWorthChange.isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>
                {netWorthChange.isPositive ? '+' : ''}{formatIndianCurrency(netWorthChange.amount)}
                ({netWorthChange.percentage}%) this year
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Assets vs Liabilities Summary */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-gray-600">Total Assets</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {formatIndianCurrency(assets)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {assetBreakdown.length} accounts
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-4 border-l-4 border-l-red-500">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">Total Liabilities</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatIndianCurrency(liabilities)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {liabilityBreakdown.length} loans
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Debt to Asset Ratio */}
        {assets > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Debt to Asset Ratio</span>
                <span className={`text-sm font-semibold ${
                  (liabilities / assets) * 100 < 30 ? 'text-emerald-600' :
                  (liabilities / assets) * 100 < 60 ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {((liabilities / assets) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.min((liabilities / assets) * 100, 100)}
                className="h-2"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Healthy (&lt;30%)</span>
                <span>High (&gt;60%)</span>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Asset Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Assets</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/accounts')}>
                View All
              </Button>
            </div>

            {assetBreakdown.length > 0 ? (
              <div className="space-y-3">
                {assetBreakdown.slice(0, 5).map((asset, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(asset.type)}`}>
                        {getTypeIcon(asset.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{asset.name}</p>
                        <p className="text-sm text-gray-500 capitalize">
                          {asset.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-emerald-600">
                      {formatIndianCurrency(asset.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No assets added yet
              </p>
            )}
          </Card>
        </motion.div>

        {/* Liability Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Liabilities</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/loans')}>
                View All
              </Button>
            </div>

            {liabilityBreakdown.length > 0 ? (
              <div className="space-y-3">
                {liabilityBreakdown.slice(0, 5).map((liability, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(liability.type)}`}>
                        {getTypeIcon(liability.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{liability.name}</p>
                        <p className="text-sm text-gray-500 capitalize">
                          {liability.type.replace('_', ' ')} Loan
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-red-600">
                      {formatIndianCurrency(liability.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No liabilities tracked
              </p>
            )}
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/accounts/add')}
          >
            <Wallet className="w-5 h-5" />
            <span>Add Account</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/invest')}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Add Investment</span>
          </Button>
        </div>
      </div>
    </Page>
  );
}
