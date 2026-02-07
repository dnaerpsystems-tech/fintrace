/**
 * Credit Score Estimation Page
 * Visual credit score gauge with factor breakdown and recommendations
 */

import { useState, useEffect, useMemo } from 'react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  creditScoreService,
  generateMockFinancialData,
  type CreditScoreResult,
  type FinancialData
} from '@/lib/services/creditScoreService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  Wallet,
  Calendar,
  Layers,
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
  Lightbulb,
  Shield
} from 'lucide-react';

// ============================================
// Credit Score Gauge Component
// ============================================

function CreditScoreGauge({ score, rating, color }: { score: number; rating: string; color: string }) {
  const [animatedScore, setAnimatedScore] = useState(300);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = (score - 300) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setAnimatedScore(Math.round(300 + increment * currentStep));
      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedScore(score);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [score]);

  // Calculate gauge rotation (180 degrees for 300-900 range)
  const rotation = ((animatedScore - 300) / 600) * 180;

  return (
    <div className="relative w-64 h-40 mx-auto">
      {/* Gauge Background */}
      <svg viewBox="0 0 200 120" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Score segments */}
        <path
          d="M 20 100 A 80 80 0 0 1 56 36"
          fill="none"
          stroke="#ef4444"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M 56 36 A 80 80 0 0 1 100 20"
          fill="none"
          stroke="#f97316"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M 100 20 A 80 80 0 0 1 144 36"
          fill="none"
          stroke="#eab308"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M 144 36 A 80 80 0 0 1 168 60"
          fill="none"
          stroke="#22c55e"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M 168 60 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#10b981"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Needle */}
        <g transform={`rotate(${rotation - 90}, 100, 100)`}>
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="35"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle
            cx="100"
            cy="100"
            r="8"
            fill={color}
          />
        </g>
      </svg>

      {/* Score Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <motion.span
          key={animatedScore}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold"
          style={{ color }}
        >
          {animatedScore}
        </motion.span>
        <span className="text-sm font-medium text-gray-500">{rating}</span>
      </div>

      {/* Range labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-xs text-gray-400">
        <span>300</span>
        <span>900</span>
      </div>
    </div>
  );
}

// ============================================
// Factor Card Component
// ============================================

function FactorCard({
  title,
  icon: Icon,
  score,
  weight,
  details,
  color
}: {
  title: string;
  icon: React.ElementType;
  score: number;
  weight: number;
  details: string[];
  color: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{title}</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${getScoreColor(score)}`}>
                  {getScoreLabel(score)}
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={score} className="h-2 flex-1" />
              <span className="text-xs text-gray-500">{(weight * 100).toFixed(0)}% impact</span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {details.map((detail, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{detail}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ============================================
// Main Component
// ============================================

export default function CreditScorePage() {
  const [loading, setLoading] = useState(true);
  const [scoreResult, setScoreResult] = useState<CreditScoreResult | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);

  const refreshScore = async () => {
    setLoading(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const data = generateMockFinancialData();
    const result = creditScoreService.calculate(data);

    setFinancialData(data);
    setScoreResult(result);
    setLoading(false);
  };

  useEffect(() => {
    refreshScore();
  }, []);

  const scoreChange = useMemo(() => {
    // Simulated score change from last month
    return Math.floor(Math.random() * 30) - 10;
  }, [scoreResult]);

  if (loading || !scoreResult) {
    return (
      <Page>
        <Header title="Credit Score" showBack />
        <div className="px-4 py-8">
          <Card className="p-8 flex flex-col items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            >
              <RefreshCw className="w-8 h-8 text-emerald-500" />
            </motion.div>
            <p className="mt-4 text-gray-500">Calculating your credit score...</p>
          </Card>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Header title="Credit Score" showBack />
      <div className="px-4 pb-24 space-y-6">
        {/* Header Card with Score Gauge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full translate-y-24 -translate-x-24" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-gray-300">Credit Score Estimate</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshScore}
                  className="text-gray-300 hover:text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <CreditScoreGauge
                score={scoreResult.score}
                rating={scoreResult.rating}
                color={scoreResult.ratingColor}
              />

              <div className="flex items-center justify-center gap-4 mt-6">
                <div className="flex items-center gap-1">
                  {scoreChange >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  <span className={scoreChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {scoreChange >= 0 ? '+' : ''}{scoreChange} pts
                  </span>
                  <span className="text-gray-400 text-sm">from last month</span>
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-gray-400">
                <Clock className="w-3 h-3 inline mr-1" />
                Updated {new Date(scoreResult.lastUpdated).toLocaleDateString('en-IN')}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Score Range Legend */}
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">Score Range</h3>
          <div className="flex gap-1">
            <div className="flex-1 text-center">
              <div className="h-2 bg-red-500 rounded-l-full"></div>
              <span className="text-xs text-gray-500 mt-1">Poor<br/>300-649</span>
            </div>
            <div className="flex-1 text-center">
              <div className="h-2 bg-orange-500"></div>
              <span className="text-xs text-gray-500 mt-1">Fair<br/>650-699</span>
            </div>
            <div className="flex-1 text-center">
              <div className="h-2 bg-yellow-500"></div>
              <span className="text-xs text-gray-500 mt-1">Good<br/>700-749</span>
            </div>
            <div className="flex-1 text-center">
              <div className="h-2 bg-green-500"></div>
              <span className="text-xs text-gray-500 mt-1">V.Good<br/>750-799</span>
            </div>
            <div className="flex-1 text-center">
              <div className="h-2 bg-emerald-500 rounded-r-full"></div>
              <span className="text-xs text-gray-500 mt-1">Excellent<br/>800-900</span>
            </div>
          </div>
        </Card>

        {/* Factor Breakdown */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-600" />
            Score Factors
          </h3>
          <div className="space-y-3">
            <FactorCard
              title="Payment History"
              icon={Calendar}
              score={scoreResult.factors.paymentHistory.score}
              weight={scoreResult.factors.paymentHistory.weight}
              details={scoreResult.factors.paymentHistory.details}
              color="#10b981"
            />
            <FactorCard
              title="Credit Utilization"
              icon={CreditCard}
              score={scoreResult.factors.creditUtilization.score}
              weight={scoreResult.factors.creditUtilization.weight}
              details={scoreResult.factors.creditUtilization.details}
              color="#3b82f6"
            />
            <FactorCard
              title="Credit Age"
              icon={Clock}
              score={scoreResult.factors.creditAge.score}
              weight={scoreResult.factors.creditAge.weight}
              details={scoreResult.factors.creditAge.details}
              color="#8b5cf6"
            />
            <FactorCard
              title="Credit Mix"
              icon={Layers}
              score={scoreResult.factors.creditMix.score}
              weight={scoreResult.factors.creditMix.weight}
              details={scoreResult.factors.creditMix.details}
              color="#f59e0b"
            />
            <FactorCard
              title="Recent Inquiries"
              icon={Search}
              score={scoreResult.factors.recentInquiries.score}
              weight={scoreResult.factors.recentInquiries.weight}
              details={scoreResult.factors.recentInquiries.details}
              color="#ec4899"
            />
          </div>
        </div>

        {/* Recommendations */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Recommendations to Improve
          </h3>
          <div className="space-y-3">
            {scoreResult.recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg"
              >
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-amber-600">{index + 1}</span>
                </div>
                <p className="text-sm text-gray-700">{rec}</p>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Financial Summary */}
        {financialData && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Your Credit Profile
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-sm text-gray-500">Credit Cards</span>
                <p className="text-xl font-bold text-gray-900">{financialData.creditCards.length}</p>
                <p className="text-xs text-gray-400">
                  Total limit: ₹{(financialData.creditCards.reduce((s, c) => s + c.limit, 0) / 100000).toFixed(1)}L
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-sm text-gray-500">Active Loans</span>
                <p className="text-xl font-bold text-gray-900">{financialData.loans.length}</p>
                <p className="text-xs text-gray-400">
                  Total EMI: ₹{financialData.loans.reduce((s, l) => s + l.emiAmount, 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-sm text-gray-500">Hard Inquiries</span>
                <p className="text-xl font-bold text-gray-900">{financialData.recentHardInquiries}</p>
                <p className="text-xs text-gray-400">Last 12 months</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-sm text-gray-500">Utilization</span>
                <p className="text-xl font-bold text-gray-900">
                  {financialData.creditCards.length > 0 ?
                    Math.round((financialData.creditCards.reduce((s, c) => s + c.currentBalance, 0) /
                    financialData.creditCards.reduce((s, c) => s + c.limit, 0)) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-400">Credit card usage</p>
              </div>
            </div>
          </Card>
        )}

        {/* Disclaimer */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Disclaimer</h4>
              <p className="text-sm text-blue-700 mt-1">
                This is an estimated credit score based on your financial behavior patterns.
                For your official CIBIL, Experian, or CRIF score, please check with the respective credit bureaus.
                This estimation is for educational purposes only.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
