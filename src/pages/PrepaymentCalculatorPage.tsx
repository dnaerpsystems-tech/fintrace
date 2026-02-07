/**
 * Prepayment Calculator Page
 * Calculate impact of loan prepayment on tenure and interest
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calculator, TrendingDown, Clock, IndianRupee,
  CheckCircle2, ArrowDown, Percent, Calendar, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/lib/formatters/currency';
import { calculatePrepaymentImpact, type LoanInput } from '@/lib/calculations/loan';
import { getLoanWithDetails, type LoanWithSchedule } from '@/lib/services/loanService';
import { SkeletonPage } from '@/components/shared/Skeleton';

export default function PrepaymentCalculatorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // State
  const [loanData, setLoanData] = useState<LoanWithSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [prepaymentAmount, setPrepaymentAmount] = useState(0);
  const [prepaymentPercent, setPrepaymentPercent] = useState(10);
  const [reduceEMI, setReduceEMI] = useState(false); // false = reduce tenure, true = reduce EMI

  // Fetch loan details if id provided
  useEffect(() => {
    async function fetchLoan() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getLoanWithDetails(id);
        setLoanData(data);

        if (data) {
          // Set initial prepayment to 10% of outstanding
          const initialPrepay = Math.round(data.outstandingPrincipal * 0.1);
          setPrepaymentAmount(initialPrepay);
        }
      } catch (error) {
        console.error('Error fetching loan:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLoan();
  }, [id]);

  // Calculate prepayment impact
  const impact = useMemo(() => {
    if (!loanData) return null;

    const loanInput: LoanInput = {
      principal: loanData.principalAmount,
      annualRate: loanData.interestRate,
      tenureMonths: loanData.tenure,
      startDate: new Date(loanData.startDate),
      emiDay: loanData.emiDay,
    };

    const paidEMIs = loanData.tenure - loanData.remainingTenure;

    return calculatePrepaymentImpact(
      loanInput,
      prepaymentAmount,
      reduceEMI,
      paidEMIs
    );
  }, [loanData, prepaymentAmount, reduceEMI]);

  // Update amount when percentage changes
  const handlePercentChange = (percent: number) => {
    setPrepaymentPercent(percent);
    if (loanData) {
      setPrepaymentAmount(Math.round(loanData.outstandingPrincipal * percent / 100));
    }
  };

  // Handle prepayment amount input
  const handleAmountChange = (amount: number) => {
    setPrepaymentAmount(amount);
    if (loanData && loanData.outstandingPrincipal > 0) {
      setPrepaymentPercent(Math.round((amount / loanData.outstandingPrincipal) * 100));
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  // Standalone calculator mode (no loan selected)
  if (!loanData) {
    return <StandaloneCalculator />;
  }

  const maxPrepayment = loanData.outstandingPrincipal;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Prepayment Calculator</h1>
            <p className="text-blue-100 text-sm">{loanData.name}</p>
          </div>
        </div>

        {/* Loan Summary */}
        <div className="px-4 pb-6 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-100 text-xs">Outstanding</p>
              <p className="text-lg font-semibold">{formatINR(loanData.outstandingPrincipal)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-100 text-xs">Remaining EMIs</p>
              <p className="text-lg font-semibold">{loanData.remainingTenure}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-100 text-xs">Current EMI</p>
              <p className="text-lg font-semibold">{formatINR(loanData.emiAmount)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-100 text-xs">Interest Rate</p>
              <p className="text-lg font-semibold">{loanData.interestRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Prepayment Amount */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-blue-500" />
              Prepayment Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount Input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <Input
                type="number"
                value={prepaymentAmount / 100}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAmountChange(Number(e.target.value) * 100)}
                className="pl-8 text-lg h-12"
                max={maxPrepayment / 100}
              />
            </div>

            {/* Percentage Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Percentage of Outstanding</span>
                <span className="text-sm font-semibold text-blue-600">{prepaymentPercent}%</span>
              </div>
              <Slider
                value={[prepaymentPercent]}
                onValueChange={(value: number[]) => handlePercentChange(value[0])}
                min={1}
                max={100}
                step={1}
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 flex-wrap">
              {[10, 25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => handlePercentChange(percent)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    prepaymentPercent === percent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {percent}%
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prepayment Strategy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Prepayment Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={reduceEMI ? 'emi' : 'tenure'} onValueChange={(v) => setReduceEMI(v === 'emi')}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="tenure" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Reduce Tenure
                </TabsTrigger>
                <TabsTrigger value="emi" className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Reduce EMI
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tenure" className="mt-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Reduce Tenure</p>
                      <p className="text-blue-600">
                        Your EMI stays the same, but you'll repay the loan faster
                        and save more on interest.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="emi" className="mt-4">
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-green-500 mt-0.5" />
                    <div className="text-sm text-green-700">
                      <p className="font-medium mb-1">Reduce EMI</p>
                      <p className="text-green-600">
                        Your tenure stays the same, but your monthly EMI
                        will be reduced.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Impact Comparison */}
        {impact && (
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Impact Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Interest Saved */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/20 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">Interest Saved</p>
                    <p className="text-2xl font-bold">{formatINR(impact.interestSaved)}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>

              {/* Tenure/EMI Reduction */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/20 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    {reduceEMI ? (
                      <>
                        <p className="text-emerald-100 text-sm">New EMI</p>
                        <p className="text-2xl font-bold">{formatINR(impact.newEMI || 0)}</p>
                        <p className="text-emerald-100 text-xs mt-1">
                          Down from {formatINR(loanData.emiAmount)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-emerald-100 text-sm">Tenure Reduction</p>
                        <p className="text-2xl font-bold">{impact.tenureReduction} months</p>
                        <p className="text-emerald-100 text-xs mt-1">
                          {Math.floor(impact.tenureReduction / 12)} years {impact.tenureReduction % 12} months saved
                        </p>
                      </>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {reduceEMI ? <IndianRupee className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                </div>
              </motion.div>

              {/* New Loan End Date */}
              {!reduceEMI && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/20 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm">New Loan End Date</p>
                      <p className="text-lg font-bold">
                        {(() => {
                          const currentEnd = new Date(loanData.endDate);
                          const newEnd = new Date(currentEnd);
                          newEnd.setMonth(newEnd.getMonth() - impact.tenureReduction);
                          return newEnd.toLocaleDateString('en-IN', {
                            month: 'short',
                            year: 'numeric',
                          });
                        })()}
                      </p>
                      <p className="text-emerald-100 text-xs mt-1">
                        Original: {new Date(loanData.endDate).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full h-12 bg-blue-500 hover:bg-blue-600"
            onClick={() => navigate(`/loans/${id}/prepay/confirm`, {
              state: { prepaymentAmount, reduceEMI, impact }
            })}
            disabled={prepaymentAmount <= 0}
          >
            Proceed with Prepayment
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(-1)}
          >
            Back to Loan
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 text-center">
          * Calculations are estimates. Actual savings may vary based on bank processing
          and any applicable charges.
        </p>
      </div>
    </div>
  );
}

// ==================== STANDALONE CALCULATOR ====================

function StandaloneCalculator() {
  const navigate = useNavigate();

  // Loan inputs
  const [principal, setPrincipal] = useState(5000000 * 100); // 50L in paise
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(20);
  const [prepaymentAmount, setPrepaymentAmount] = useState(500000 * 100); // 5L in paise
  const [paidYears, setPaidYears] = useState(5);
  const [reduceEMI, setReduceEMI] = useState(false);

  // Calculate impact
  const impact = useMemo(() => {
    const tenureMonths = tenureYears * 12;
    const paidMonths = paidYears * 12;

    const loanInput: LoanInput = {
      principal,
      annualRate: interestRate,
      tenureMonths,
      startDate: new Date(),
      emiDay: 1,
    };

    return calculatePrepaymentImpact(loanInput, prepaymentAmount, reduceEMI, paidMonths);
  }, [principal, interestRate, tenureYears, prepaymentAmount, paidYears, reduceEMI]);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Prepayment Calculator</h1>
            <p className="text-blue-100 text-sm">Calculate your savings</p>
          </div>
        </div>

        <div className="px-4 pb-6 pt-2">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
            <Calculator className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Loan Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Loan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Principal */}
            <div>
              <Label className="text-sm">Loan Amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  type="number"
                  value={principal / 100}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrincipal(Number(e.target.value) * 100)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <div className="flex justify-between mb-1">
                <Label className="text-sm">Interest Rate</Label>
                <span className="text-sm font-semibold">{interestRate}%</span>
              </div>
              <Slider
                value={[interestRate]}
                onValueChange={(v: number[]) => setInterestRate(v[0])}
                min={5}
                max={15}
                step={0.1}
              />
            </div>

            {/* Tenure */}
            <div>
              <div className="flex justify-between mb-1">
                <Label className="text-sm">Loan Tenure</Label>
                <span className="text-sm font-semibold">{tenureYears} years</span>
              </div>
              <Slider
                value={[tenureYears]}
                onValueChange={(v: number[]) => setTenureYears(v[0])}
                min={1}
                max={30}
                step={1}
              />
            </div>

            {/* Years Paid */}
            <div>
              <div className="flex justify-between mb-1">
                <Label className="text-sm">EMIs Already Paid</Label>
                <span className="text-sm font-semibold">{paidYears} years</span>
              </div>
              <Slider
                value={[paidYears]}
                onValueChange={(v: number[]) => setPaidYears(Math.min(v[0], tenureYears - 1))}
                min={0}
                max={Math.max(1, tenureYears - 1)}
                step={1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prepayment Amount */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Prepayment Amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <Input
                type="number"
                value={prepaymentAmount / 100}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrepaymentAmount(Number(e.target.value) * 100)}
                className="pl-8 text-lg h-12"
              />
            </div>

            <Tabs value={reduceEMI ? 'emi' : 'tenure'} onValueChange={(v) => setReduceEMI(v === 'emi')}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="tenure">Reduce Tenure</TabsTrigger>
                <TabsTrigger value="emi">Reduce EMI</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-lg font-semibold">Your Savings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-emerald-100 text-xs">Interest Saved</p>
                <p className="text-xl font-bold">{formatINR(impact.interestSaved)}</p>
              </div>

              {reduceEMI ? (
                <div className="bg-white/20 rounded-xl p-3">
                  <p className="text-emerald-100 text-xs">New EMI</p>
                  <p className="text-xl font-bold">{formatINR(impact.newEMI || 0)}</p>
                </div>
              ) : (
                <div className="bg-white/20 rounded-xl p-3">
                  <p className="text-emerald-100 text-xs">Tenure Reduced</p>
                  <p className="text-xl font-bold">{impact.tenureReduction} mo</p>
                </div>
              )}
            </div>

            {!reduceEMI && (
              <p className="text-sm text-emerald-100 text-center">
                Pay off your loan {Math.floor(impact.tenureReduction / 12)} years{' '}
                {impact.tenureReduction % 12} months earlier!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
