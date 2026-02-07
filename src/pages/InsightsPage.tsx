/**
 * Insights Page
 * AI-powered spending analysis, anomaly detection, and recommendations
 * Tier-One Standards: Real-time data, visualizations, actionable insights
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Heart,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Loader2,
  Target,
  Wallet,
  PiggyBank,
  Shield,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/lib/formatters/currency';
import {
  getInsightsSummary,
  type InsightsSummary,
  type Anomaly,
  type SavingsRecommendation,
  type SpendingPattern,
  type FinancialHealthScore,
} from '@/lib/services/insightsService';

// ==================== COMPONENTS ====================

function HealthScoreRing({
  score,
  size = 160,
  strokeWidth = 12,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Amber
    if (score >= 40) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  const getLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const color = getColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <motion.span
          className="text-4xl font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ color }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-gray-500 mt-1">{getLabel(score)}</span>
      </div>
    </div>
  );
}

function HealthBreakdownItem({
  label,
  score,
  description,
  delay = 0,
}: {
  label: string;
  score: number;
  description: string;
  delay?: number;
}) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="space-y-1"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getColor(score)}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: delay + 0.2, duration: 0.5 }}
        />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </motion.div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const severityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  const severityIcons = {
    high: AlertTriangle,
    medium: AlertCircle,
    low: AlertCircle,
  };

  const Icon = severityIcons[anomaly.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${severityColors[anomaly.severity]}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{anomaly.description}</p>
          <p className="text-sm opacity-80 mt-1">{anomaly.details}</p>
          {anomaly.transaction && (
            <p className="text-xs mt-2 opacity-60">
              {anomaly.transaction.date} • {formatINR(anomaly.transaction.amount)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RecommendationCard({
  recommendation,
  isExpanded,
  onToggle,
}: {
  recommendation: SavingsRecommendation;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const typeIcons = {
    reduce_spending: TrendingDown,
    increase_savings: PiggyBank,
    optimize_budget: Target,
    achieve_goal: TrendingUp,
    build_emergency: Shield,
  };

  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  const Icon = typeIcons[recommendation.type];

  return (
    <motion.div
      layout
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor:
              recommendation.priority === 'high'
                ? '#FEE2E2'
                : recommendation.priority === 'medium'
                ? '#FEF3C7'
                : '#DBEAFE',
          }}
        >
          <Icon
            className="w-5 h-5"
            style={{
              color:
                recommendation.priority === 'high'
                  ? '#DC2626'
                  : recommendation.priority === 'medium'
                  ? '#D97706'
                  : '#2563EB',
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">
              {recommendation.title}
            </span>
            <div
              className={`w-2 h-2 rounded-full ${priorityColors[recommendation.priority]}`}
            />
          </div>
          <p className="text-sm text-gray-500 line-clamp-2">
            {recommendation.description}
          </p>
          {recommendation.potentialSavings > 0 && (
            <p className="text-sm font-medium text-emerald-600 mt-1">
              Potential savings: {formatINR(recommendation.potentialSavings)}
            </p>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100"
          >
            <div className="p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Action Steps:
              </p>
              <ul className="space-y-2">
                {recommendation.actionable.map((action, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SpendingPatternCard({ pattern }: { pattern: SpendingPattern }) {
  const trendIcons = {
    increasing: ArrowUpRight,
    decreasing: ArrowDownRight,
    stable: Minus,
  };

  const trendColors = {
    increasing: 'text-red-500',
    decreasing: 'text-emerald-500',
    stable: 'text-gray-500',
  };

  const TrendIcon = trendIcons[pattern.trend];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white rounded-xl border border-gray-200"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{pattern.categoryName}</span>
        <div className={`flex items-center gap-1 text-sm ${trendColors[pattern.trend]}`}>
          <TrendIcon className="w-4 h-4" />
          <span>
            {pattern.trend === 'stable'
              ? 'Stable'
              : `${Math.abs(pattern.trendPercentage).toFixed(0)}%`}
          </span>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {formatINR(pattern.totalSpent)}
      </p>
      <p className="text-sm text-gray-500">
        {pattern.transactionCount} transactions • Avg {formatINR(pattern.averageTransaction)}
      </p>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function InsightsPage() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('health');
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load insights
  const loadInsights = async () => {
    try {
      const data = await getInsightsSummary();
      setInsights(data);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadInsights();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-violet-500 mx-auto animate-spin mb-4" />
          <p className="text-gray-600">Analyzing your finances...</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Unable to load insights</p>
          <Button onClick={loadInsights} className="mt-4">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">AI Insights</h1>
              <p className="text-violet-200 text-sm">Powered by analytics</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="px-4 pb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-violet-200 text-xs">Income</p>
              <p className="font-bold">{formatINR(insights.totalIncome, { compact: true })}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-violet-200 text-xs">Expenses</p>
              <p className="font-bold">{formatINR(insights.totalExpenses, { compact: true })}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-violet-200 text-xs">Savings Rate</p>
              <p className="font-bold">{insights.savingsRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="health" className="text-xs">
              <Heart className="w-4 h-4 mr-1" />
              Health
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs">
              <TrendingUp className="w-4 h-4 mr-1" />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="text-xs">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="tips" className="text-xs">
              <Lightbulb className="w-4 h-4 mr-1" />
              Tips
            </TabsTrigger>
          </TabsList>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center mb-6">
                  <HealthScoreRing score={insights.healthScore.overall} />
                  <p className="text-gray-500 mt-4 text-center text-sm">
                    Your Financial Health Score
                  </p>
                </div>

                <div className="space-y-4">
                  <HealthBreakdownItem
                    label="Savings Rate"
                    score={insights.healthScore.breakdown.savingsRate.score}
                    description={insights.healthScore.breakdown.savingsRate.description}
                    delay={0.1}
                  />
                  <HealthBreakdownItem
                    label="Budget Adherence"
                    score={insights.healthScore.breakdown.budgetAdherence.score}
                    description={insights.healthScore.breakdown.budgetAdherence.description}
                    delay={0.2}
                  />
                  <HealthBreakdownItem
                    label="Expense Stability"
                    score={insights.healthScore.breakdown.expenseStability.score}
                    description={insights.healthScore.breakdown.expenseStability.description}
                    delay={0.3}
                  />
                  <HealthBreakdownItem
                    label="Goal Progress"
                    score={insights.healthScore.breakdown.goalProgress.score}
                    description={insights.healthScore.breakdown.goalProgress.description}
                    delay={0.4}
                  />
                  <HealthBreakdownItem
                    label="Debt Management"
                    score={insights.healthScore.breakdown.debtManagement.score}
                    description={insights.healthScore.breakdown.debtManagement.description}
                    delay={0.5}
                  />
                </div>
              </CardContent>
            </Card>

            {insights.healthScore.recommendations.length > 0 && (
              <Card className="bg-violet-50 border-violet-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-violet-500" />
                    <span className="font-medium text-violet-700">Quick Tips</span>
                  </div>
                  <ul className="space-y-2">
                    {insights.healthScore.recommendations.map((rec, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-violet-600"
                      >
                        <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            {insights.spendingPatterns.length > 0 ? (
              <>
                <p className="text-sm text-gray-500">
                  Spending trends over the last 90 days
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {insights.spendingPatterns.slice(0, 6).map((pattern, index) => (
                    <SpendingPatternCard key={pattern.categoryId} pattern={pattern} />
                  ))}
                </div>
              </>
            ) : (
              <Card className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Not enough data for pattern analysis</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add more transactions to see spending patterns
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-4">
            {insights.anomalies.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {insights.anomalies.length} unusual activities detected
                  </p>
                  <Badge variant="secondary">Last 30 days</Badge>
                </div>
                <div className="space-y-3">
                  {insights.anomalies.map((anomaly) => (
                    <AnomalyCard key={anomaly.id} anomaly={anomaly} />
                  ))}
                </div>
              </>
            ) : (
              <Card className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-gray-700 font-medium">All Clear!</p>
                <p className="text-sm text-gray-500 mt-2">
                  No unusual spending patterns detected
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-4">
            {insights.recommendations.length > 0 ? (
              <>
                <p className="text-sm text-gray-500">
                  {insights.recommendations.length} personalized recommendations
                </p>
                <div className="space-y-3">
                  {insights.recommendations.map((rec) => (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      isExpanded={expandedRec === rec.id}
                      onToggle={() =>
                        setExpandedRec(expandedRec === rec.id ? null : rec.id)
                      }
                    />
                  ))}
                </div>
              </>
            ) : (
              <Card className="p-8 text-center">
                <Lightbulb className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <p className="text-gray-700 font-medium">Great Job!</p>
                <p className="text-sm text-gray-500 mt-2">
                  Your finances are in good shape. Keep it up!
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
