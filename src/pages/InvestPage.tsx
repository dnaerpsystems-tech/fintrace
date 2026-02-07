/**
 * InvestPage - Investment Portfolio Dashboard
 * Shows portfolio summary, asset allocation, and holdings with real data
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  LineChart,
  PieChart,
  Landmark,
  Star,
  Shield,
  Home,
  Bitcoin,
  FileText,
  Briefcase,
  Plus,
  ChevronRight,
  Loader2,
  RefreshCw,
  Lock,
  Target,
  Wallet,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Page } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatINR } from "@/lib/formatters/currency";
import { formatDate, getRelativeTime } from "@/lib/formatters/date";
import {
  getPortfolioSummary,
  getTaxSavingInvestments,
  INVESTMENT_TYPE_CONFIG,
  TAX_SECTIONS,
  type PortfolioSummary,
  type InvestmentWithReturns,
  type InvestmentType,
} from "@/lib/services/investmentService";
import { SpendingDonutChart, CHART_COLORS, type CategoryData } from "@/components/charts";

// ==================== CONSTANTS ====================

const DEFAULT_USER_ID = 'default-user';

// Icon mapping for investment types
const TYPE_ICONS: Record<InvestmentType, React.ElementType> = {
  mutual_fund: PieChart,
  stocks: LineChart,
  fixed_deposit: Lock,
  ppf: Shield,
  nps: Landmark,
  gold: Star,
  real_estate: Home,
  crypto: Bitcoin,
  bonds: FileText,
  other: Briefcase,
};

// Color mapping for investment types
const TYPE_COLORS: Record<InvestmentType, string> = {
  mutual_fund: '#8B5CF6',
  stocks: '#10B981',
  fixed_deposit: '#F59E0B',
  ppf: '#3B82F6',
  nps: '#06B6D4',
  gold: '#FBBF24',
  real_estate: '#EC4899',
  crypto: '#F97316',
  bonds: '#6366F1',
  other: '#6B7280',
};

// ==================== COMPONENTS ====================

/**
 * Portfolio Summary Card
 */
function PortfolioSummaryCard({
  summary,
  onRefresh,
  isRefreshing,
}: {
  summary: PortfolioSummary;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const isPositive = summary.absoluteReturn >= 0;

  return (
    <motion.div
      className="rounded-2xl p-6 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full border-4 border-white" />
        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full border-4 border-white" />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/90 text-sm">Total Portfolio Value</p>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <h2 className="text-3xl font-bold text-white">
          {formatINR(summary.currentValue)}
        </h2>

        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-300" />
            )}
            <span className={`font-medium ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
              {isPositive ? '+' : ''}{formatINR(summary.absoluteReturn)}
            </span>
            <span className={`text-sm ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
              ({isPositive ? '+' : ''}{summary.percentageReturn.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-white/70 text-xs">Invested</p>
            <p className="text-lg font-semibold">{formatINR(summary.totalInvested)}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs">Holdings</p>
            <p className="text-lg font-semibold">{summary.holdings.length}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Asset Allocation Chart
 */
function AssetAllocationChart({
  allocationByType,
  totalValue,
}: {
  allocationByType: Map<InvestmentType, { value: number; percentage: number }>;
  totalValue: number;
}) {
  const chartData: CategoryData[] = [];

  allocationByType.forEach((data, type) => {
    if (data.value > 0) {
      chartData.push({
        name: INVESTMENT_TYPE_CONFIG[type]?.label || type,
        value: data.value,
        color: TYPE_COLORS[type] || '#6B7280',
      });
    }
  });

  if (chartData.length === 0) {
    return (
      <div className="ios-card p-8 text-center">
        <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-muted-foreground">No investments yet</p>
      </div>
    );
  }

  return (
    <motion.div
      className="ios-card p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="ios-title mb-4">Asset Allocation</h3>
      <SpendingDonutChart
        data={chartData}
        totalAmount={totalValue}
      />
    </motion.div>
  );
}

/**
 * Investment Type Cards
 */
function InvestmentTypeCards({
  allocationByType,
  onClick,
}: {
  allocationByType: Map<InvestmentType, { value: number; percentage: number }>;
  onClick: (type: InvestmentType) => void;
}) {
  const types: InvestmentType[] = [
    'mutual_fund', 'stocks', 'fixed_deposit', 'gold', 'ppf', 'nps'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="ios-title mb-3">By Type</h3>
      <div className="grid grid-cols-2 gap-3">
        {types.map((type) => {
          const data = allocationByType.get(type);
          const config = INVESTMENT_TYPE_CONFIG[type];
          const Icon = TYPE_ICONS[type];
          const hasData = data && data.value > 0;

          return (
            <motion.div
              key={type}
              className={`ios-card p-4 cursor-pointer ${!hasData ? 'opacity-50' : ''}`}
              whileTap={{ scale: 0.98 }}
              onClick={() => onClick(type)}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                style={{ backgroundColor: `${TYPE_COLORS[type]}20` }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: TYPE_COLORS[type] }}
                />
              </div>
              <p className="font-medium text-sm">{config?.label || type}</p>
              <p className="text-lg font-semibold mt-1">
                {hasData ? formatINR(data.value) : '₹0'}
              </p>
              {hasData && (
                <p className="text-xs text-muted-foreground mt-1">
                  {data.percentage.toFixed(1)}% of portfolio
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Holdings List
 */
function HoldingsList({
  holdings,
  onHoldingClick,
}: {
  holdings: InvestmentWithReturns[];
  onHoldingClick: (holding: InvestmentWithReturns) => void;
}) {
  if (holdings.length === 0) {
    return null;
  }

  // Sort by current value
  const sortedHoldings = [...holdings].sort((a, b) => b.currentValue - a.currentValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="ios-title">Holdings</h3>
        <span className="text-xs text-muted-foreground">
          {holdings.length} investments
        </span>
      </div>
      <div className="ios-card divide-y divide-border">
        {sortedHoldings.slice(0, 10).map((holding) => {
          const Icon = TYPE_ICONS[holding.type as InvestmentType] || Briefcase;
          const color = TYPE_COLORS[holding.type as InvestmentType] || '#6B7280';

          return (
            <motion.div
              key={holding.id}
              className="ios-list-item cursor-pointer"
              whileTap={{ scale: 0.98 }}
              onClick={() => onHoldingClick(holding)}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{holding.name}</p>
                <p className="text-xs text-muted-foreground">
                  {holding.symbol || INVESTMENT_TYPE_CONFIG[holding.type as InvestmentType]?.label}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatINR(holding.currentValue)}</p>
                <div className="flex items-center justify-end gap-1">
                  {holding.isProfit ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      holding.isProfit ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {holding.isProfit ? '+' : ''}
                    {holding.percentageReturn.toFixed(2)}%
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Tax Savings Card (80C)
 */
function TaxSavingsCard({
  taxSavings,
}: {
  taxSavings: { section: string; amount: number; limit: number }[];
}) {
  const section80C = taxSavings.find(t => t.section === '80C');
  const section80CCD = taxSavings.find(t => t.section === '80CCD(1B)');

  if (!section80C && !section80CCD) {
    return null;
  }

  return (
    <motion.div
      className="ios-card p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-emerald-500" />
        <h3 className="ios-title">Tax Savings (FY 2025-26)</h3>
      </div>

      {section80C && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Section 80C</span>
            <span className="text-sm text-muted-foreground">
              {formatINR(section80C.amount)} / {formatINR(section80C.limit)}
            </span>
          </div>
          <Progress
            value={(section80C.amount / section80C.limit) * 100}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {section80C.amount >= section80C.limit
              ? 'Limit exhausted! Great job maximizing tax savings.'
              : `${formatINR(section80C.limit - section80C.amount)} more can be invested`}
          </p>
        </div>
      )}

      {section80CCD && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Section 80CCD(1B) - NPS</span>
            <span className="text-sm text-muted-foreground">
              {formatINR(section80CCD.amount)} / {formatINR(section80CCD.limit)}
            </span>
          </div>
          <Progress
            value={(section80CCD.amount / section80CCD.limit) * 100}
            className="h-2"
          />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Empty State
 */
function EmptyState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <motion.div
      className="ios-card p-8 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <TrendingUp className="w-10 h-10 text-violet-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Start Your Investment Journey
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        Track your mutual funds, stocks, FDs, PPF, and more all in one place
      </p>
      <Button onClick={onAddClick} className="bg-violet-500 hover:bg-violet-600">
        <Plus className="w-4 h-4 mr-2" />
        Add Investment
      </Button>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export function InvestPage() {
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [taxSavings, setTaxSavings] = useState<{ section: string; amount: number; limit: number }[]>([]);

  // Load data
  const loadData = async () => {
    try {
      const [portfolioData, taxData] = await Promise.all([
        getPortfolioSummary(DEFAULT_USER_ID),
        getTaxSavingInvestments(DEFAULT_USER_ID),
      ]);

      setSummary(portfolioData);

      // Format tax savings
      const taxSavingsList: { section: string; amount: number; limit: number }[] = [];
      if (taxData.total80C > 0) {
        taxSavingsList.push({
          section: '80C',
          amount: taxData.total80C,
          limit: taxData.limit80C,
        });
      }

      // Check for NPS investments
      const npsTotal = portfolioData.holdings
        .filter(h => h.type === 'nps')
        .reduce((sum, h) => sum + h.investedAmount, 0);

      if (npsTotal > 0) {
        taxSavingsList.push({
          section: '80CCD(1B)',
          amount: npsTotal,
          limit: TAX_SECTIONS['80CCD(1B)'].limit,
        });
      }

      setTaxSavings(taxSavingsList);
    } catch (error) {
      console.error('Error loading investment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleAddInvestment = () => {
    navigate('/invest/add');
  };

  const handleTypeClick = (type: InvestmentType) => {
    // Navigate to type-specific view (to be implemented)
    console.log('View type:', type);
  };

  const handleHoldingClick = (holding: InvestmentWithReturns) => {
    // Navigate to holding detail (to be implemented)
    console.log('View holding:', holding);
  };

  // Loading state
  if (isLoading) {
    return (
      <Page>
        <Header title="Investments" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </Page>
    );
  }

  // Empty state
  if (!summary || summary.holdings.length === 0) {
    return (
      <Page>
        <Header
          title="Investments"
          rightActions={
            <motion.button
              className="p-2 rounded-full hover:bg-muted"
              whileTap={{ scale: 0.9 }}
              onClick={handleAddInvestment}
            >
              <Plus className="w-5 h-5 text-foreground" />
            </motion.button>
          }
        />
        <div className="px-4 py-6">
          <EmptyState onAddClick={handleAddInvestment} />
        </div>
      </Page>
    );
  }

  return (
    <Page enablePullToRefresh onRefresh={handleRefresh}>
      <Header
        title="Investments"
        rightActions={
          <motion.button
            className="p-2 rounded-full hover:bg-muted"
            whileTap={{ scale: 0.9 }}
            onClick={handleAddInvestment}
          >
            <Plus className="w-5 h-5 text-foreground" />
          </motion.button>
        }
      />

      <div className="px-4 space-y-6 pb-6">
        {/* Portfolio Summary Card */}
        <PortfolioSummaryCard
          summary={summary}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Asset Allocation Chart */}
        <AssetAllocationChart
          allocationByType={summary.allocationByType}
          totalValue={summary.currentValue}
        />

        {/* Tax Savings Progress */}
        <TaxSavingsCard taxSavings={taxSavings} />

        {/* Investment Type Cards */}
        <InvestmentTypeCards
          allocationByType={summary.allocationByType}
          onClick={handleTypeClick}
        />

        {/* Holdings List */}
        <HoldingsList
          holdings={summary.holdings}
          onHoldingClick={handleHoldingClick}
        />

        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </div>
    </Page>
  );
}

export default InvestPage;
