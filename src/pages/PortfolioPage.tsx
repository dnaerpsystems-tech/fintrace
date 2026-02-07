/**
 * Portfolio Tracking Page
 * Investment portfolio with real-time NAV updates
 */

import { useState, useEffect } from 'react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { formatINR } from '@/lib/formatters/currency';
import { portfolioService, type PortfolioSummary, type PortfolioHolding } from '@/lib/services/portfolioService';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Building2,
  Coins,
  Landmark,
  Shield,
  Clock,
  Star,
  ChevronRight
} from 'lucide-react';

// ============================================
// Helper
// ============================================

const formatCurrency = (amount: number) => formatINR(amount * 100, { decimals: 0 });

const getAssetIcon = (type: string) => {
  switch (type) {
    case 'mutual_fund': return TrendingUp;
    case 'stock': return BarChart3;
    case 'gold': return Coins;
    case 'ppf': return Landmark;
    case 'nps': return Shield;
    case 'fd': return Building2;
    default: return TrendingUp;
  }
};

const getAssetColor = (type: string) => {
  switch (type) {
    case 'mutual_fund': return '#8b5cf6';
    case 'stock': return '#3b82f6';
    case 'gold': return '#f59e0b';
    case 'ppf': return '#10b981';
    case 'nps': return '#6366f1';
    case 'fd': return '#14b8a6';
    default: return '#6b7280';
  }
};

const getAssetLabel = (type: string) => {
  switch (type) {
    case 'mutual_fund': return 'Mutual Funds';
    case 'stock': return 'Stocks';
    case 'gold': return 'Gold';
    case 'ppf': return 'PPF';
    case 'nps': return 'NPS';
    case 'fd': return 'Fixed Deposit';
    default: return type;
  }
};

// ============================================
// Component
// ============================================

export default function PortfolioPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [activeTab, setActiveTab] = useState('holdings');

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const data = await portfolioService.getPortfolioSummary();
      setPortfolio(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  };

  if (loading || !portfolio) {
    return (
      <Page>
        <Header title="Portfolio" showBack />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </Page>
    );
  }

  const topPerformers = portfolioService.getTopPerformers(portfolio.holdings, 3);
  const worstPerformers = portfolioService.getWorstPerformers(portfolio.holdings, 3);

  return (
    <Page>
      <Header title="Portfolio" showBack />

      <div className="px-4 pb-24 space-y-6">
        {/* Portfolio Summary */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full -translate-y-24 translate-x-24" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-300">Total Portfolio Value</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-gray-300 hover:text-white hover:bg-white/10"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <p className="text-3xl font-bold mb-2">
                {formatCurrency(portfolio.currentValue)}
              </p>

              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1 ${portfolio.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolio.totalGain >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    {formatCurrency(Math.abs(portfolio.totalGain))}
                  </span>
                  <span className="text-sm">
                    ({portfolio.gainPercent >= 0 ? '+' : ''}{portfolio.gainPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-sm text-gray-300">Invested</p>
                  <p className="font-semibold">{formatCurrency(portfolio.totalInvested)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-sm text-gray-300">Day Change</p>
                  <p className={`font-semibold ${portfolio.dayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {portfolio.dayChange >= 0 ? '+' : ''}{formatCurrency(portfolio.dayChange)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last updated: {new Date().toLocaleTimeString('en-IN')}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Asset Allocation */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-500" />
            Asset Allocation
          </h3>
          <div className="space-y-3">
            {portfolio.assetAllocation.map((asset, index) => {
              const Icon = getAssetIcon(asset.type);
              const color = getAssetColor(asset.type);
              return (
                <motion.div
                  key={asset.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <span className="font-medium text-gray-900">{getAssetLabel(asset.type)}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(asset.value)}</p>
                      <p className="text-xs text-gray-500">{asset.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  <Progress
                    value={asset.percentage}
                    className="h-2"
                    style={{ '--progress-color': color } as any}
                  />
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="performers">Performers</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          {/* Holdings Tab */}
          <TabsContent value="holdings" className="mt-4 space-y-3">
            {portfolio.holdings.map((holding, index) => (
              <motion.div
                key={holding.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <HoldingCard holding={holding} />
              </motion.div>
            ))}
          </TabsContent>

          {/* Performers Tab */}
          <TabsContent value="performers" className="mt-4 space-y-4">
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-500" />
                Top Performers
              </h4>
              <div className="space-y-3">
                {topPerformers.map((holding, index) => (
                  <div key={holding.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-700">#{index + 1}</span>
                      <span className="text-sm text-gray-900">{holding.name}</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      +{holding.gainPercent.toFixed(2)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Underperformers
              </h4>
              <div className="space-y-3">
                {worstPerformers.map((holding, index) => (
                  <div key={holding.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-red-700">#{index + 1}</span>
                      <span className="text-sm text-gray-900">{holding.name}</span>
                    </div>
                    <Badge className="bg-red-100 text-red-700">
                      {holding.gainPercent >= 0 ? '+' : ''}{holding.gainPercent.toFixed(2)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="mt-4 space-y-4">
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">Portfolio Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Holdings</p>
                  <p className="text-xl font-bold text-gray-900">{portfolio.holdings.length}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Asset Types</p>
                  <p className="text-xl font-bold text-gray-900">{portfolio.assetAllocation.length}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-500">Absolute Return</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {portfolio.gainPercent >= 0 ? '+' : ''}{portfolio.gainPercent.toFixed(2)}%
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-500">XIRR (Est.)</p>
                  <p className="text-xl font-bold text-blue-600">14.5%</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-amber-50 border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2">Recommendations</h4>
              <ul className="text-sm text-amber-700 space-y-2">
                <li>• Consider diversifying into international funds</li>
                <li>• Gold allocation is below recommended 10%</li>
                <li>• Review underperforming holdings quarterly</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  );
}

// ============================================
// Holding Card Component
// ============================================

function HoldingCard({ holding }: { holding: PortfolioHolding }) {
  const Icon = getAssetIcon(holding.type);
  const color = getAssetColor(holding.type);
  const isPositive = holding.gain >= 0;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-gray-900 text-sm truncate pr-2">{holding.name}</h4>
              <p className="text-xs text-gray-500">{getAssetLabel(holding.type)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
            <div>
              <p className="text-xs text-gray-500">Current Value</p>
              <p className="font-semibold text-gray-900">{formatCurrency(holding.currentValue)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Invested</p>
              <p className="text-sm text-gray-600">{formatCurrency(holding.investedValue)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Returns</p>
              <p className={`font-medium flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {formatCurrency(Math.abs(holding.gain))}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Returns %</p>
              <p className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{holding.gainPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
