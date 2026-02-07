/**
 * Loan Detail Page
 * Comprehensive loan view with amortization, payments, and prepayment
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, ChevronDown, ChevronUp, CheckCircle2,
  Clock, CreditCard, FileText, Home, Car, User, GraduationCap,
  Gem, Briefcase, AlertCircle, TrendingDown, Percent, IndianRupee,
  Calculator, Wallet, Download, MoreVertical, Trash2, Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/formatters/currency';
import { formatDate } from '@/lib/formatters/date';
import { useLoans } from '@/db/hooks';
import { getLoanWithDetails, recordEMIPayment, type LoanWithSchedule } from '@/lib/services/loanService';
import { BottomSheet } from '@/components/shared/BottomSheet';
import { SkeletonPage } from '@/components/shared/Skeleton';
import { LOAN_TYPES, type LoanType } from '@/lib/constants';
import { EMIStatus, LoanStatus, type EMISchedule } from '@/types';

// Icon mapping
const loanIcons: Record<string, React.ElementType> = {
  home: Home,
  car: Car,
  personal: User,
  education: GraduationCap,
  gold: Gem,
  business: Briefcase,
  credit_card: CreditCard,
  other: FileText,
};

// Status colors
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  skipped: 'bg-gray-100 text-gray-500',
};

export default function LoanDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loanData, setLoanData] = useState<LoanWithSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaySheet, setShowPaySheet] = useState(false);
  const [selectedEMI, setSelectedEMI] = useState<string | null>(null);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  // Fetch loan details
  useEffect(() => {
    async function fetchLoan() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await getLoanWithDetails(id);
        setLoanData(data);

        // Auto-expand current year
        if (data) {
          const currentYear = new Date().getFullYear();
          setExpandedYear(currentYear);
        }
      } catch (error) {
        console.error('Error fetching loan:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLoan();
  }, [id]);

  // Group schedule by year
  const scheduleByYear = useMemo(() => {
    if (!loanData?.schedule) return new Map<number, EMISchedule[]>();

    const grouped = new Map<number, EMISchedule[]>();
    for (const emi of loanData.schedule) {
      const year = new Date(emi.dueDate).getFullYear();
      if (!grouped.has(year)) {
        grouped.set(year, []);
      }
      grouped.get(year)?.push(emi);
    }
    return grouped;
  }, [loanData?.schedule]);

  const handlePayEMI = async () => {
    if (!selectedEMI) return;

    try {
      await recordEMIPayment(selectedEMI, new Date(), 'default-user');
      setShowPaySheet(false);
      setSelectedEMI(null);

      // Refresh data
      if (id) {
        const data = await getLoanWithDetails(id);
        setLoanData(data);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  if (!loanData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Loan Not Found</h2>
          <p className="text-gray-500 mb-4">The loan you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/loans')}>Back to Loans</Button>
        </Card>
      </div>
    );
  }

  const Icon = loanIcons[loanData.type] || FileText;
  const loanConfig = LOAN_TYPES[loanData.type as LoanType] || LOAN_TYPES.other;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{loanData.name}</h1>
            <p className="text-rose-100 text-sm">{loanConfig.label}</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Loan Summary */}
        <div className="px-4 pb-6 pt-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-rose-100 text-sm">Outstanding Balance</p>
              <p className="text-3xl font-bold">
                {formatINR(loanData.outstandingPrincipal + loanData.outstandingInterest)}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-rose-100">
                {loanData.progress.percentageComplete.toFixed(0)}% completed
              </span>
              <span className="text-rose-100">
                {loanData.progress.emisPaid} / {loanData.tenure} EMIs
              </span>
            </div>
            <Progress
              value={loanData.progress.percentageComplete}
              className="h-2.5 bg-white/20"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-rose-100 text-xs">EMI Amount</p>
              <p className="font-semibold">{formatINR(loanData.emiAmount, { decimals: 0 })}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-rose-100 text-xs">Interest Rate</p>
              <p className="font-semibold">{loanData.interestRate}%</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-rose-100 text-xs">EMIs Left</p>
              <p className="font-semibold">{loanData.progress.emisRemaining}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {loanData.progress.isOverdue && (
        <div className="mx-4 -mt-3 mb-4">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-red-700">Overdue Payment</p>
                <p className="text-sm text-red-600">
                  {loanData.progress.overdueCount} EMI(s) overdue •{' '}
                  {formatINR(loanData.progress.overdueAmount)}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600"
                onClick={() => {
                  const overdueEMI = loanData.schedule.find(
                    s => s.status === EMIStatus.PENDING && new Date(s.dueDate) < new Date()
                  );
                  if (overdueEMI) {
                    setSelectedEMI(overdueEMI.id);
                    setShowPaySheet(true);
                  }
                }}
              >
                Pay Now
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Tabs */}
      <div className="px-4 py-4">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="prepay">Prepay</TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            {/* Next EMI Card */}
            {loanData.progress.emisRemaining > 0 && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-600 font-medium">Next EMI Due</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {formatINR(loanData.progress.nextEMIAmount)}
                      </p>
                      <p className="text-sm text-emerald-600">
                        {formatDate(loanData.progress.nextEMIDate, 'medium')}
                      </p>
                    </div>
                    <Button
                      className="bg-emerald-500 hover:bg-emerald-600"
                      onClick={() => {
                        const nextEMI = loanData.schedule.find(
                          s => s.status === EMIStatus.PENDING
                        );
                        if (nextEMI) {
                          setSelectedEMI(nextEMI.id);
                          setShowPaySheet(true);
                        }
                      }}
                    >
                      Pay EMI
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* EMI Schedule by Year */}
            <div className="space-y-3">
              {Array.from(scheduleByYear.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([year, emis]) => (
                  <Card key={year}>
                    <button
                      className="w-full p-4 flex items-center justify-between"
                      onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <span className="font-semibold">{year}</span>
                        <Badge variant="secondary">
                          {emis.filter(e => e.status === EMIStatus.PAID).length}/{emis.length} paid
                        </Badge>
                      </div>
                      {expandedYear === year ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedYear === year && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {emis.map((emi) => {
                              const isOverdue = emi.status === EMIStatus.PENDING &&
                                new Date(emi.dueDate) < new Date();

                              return (
                                <div
                                  key={emi.id}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                                >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    emi.status === EMIStatus.PAID
                                      ? 'bg-emerald-100'
                                      : isOverdue
                                        ? 'bg-red-100'
                                        : 'bg-gray-200'
                                  }`}>
                                    {emi.status === EMIStatus.PAID ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : isOverdue ? (
                                      <AlertCircle className="w-4 h-4 text-red-500" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">EMI #{emi.emiNumber}</span>
                                      <Badge
                                        className={`text-xs ${
                                          emi.status === EMIStatus.PAID
                                            ? statusColors.paid
                                            : isOverdue
                                              ? statusColors.overdue
                                              : statusColors.pending
                                        }`}
                                      >
                                        {emi.status === EMIStatus.PAID
                                          ? 'Paid'
                                          : isOverdue
                                            ? 'Overdue'
                                            : 'Pending'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      {formatDate(new Date(emi.dueDate), 'medium')}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <p className="font-semibold">
                                      {formatINR(emi.emiAmount, { decimals: 0 })}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      P: {formatINR(emi.principalComponent, { decimals: 0, showSymbol: false })} |
                                      I: {formatINR(emi.interestComponent, { decimals: 0, showSymbol: false })}
                                    </p>
                                  </div>

                                  {emi.status === EMIStatus.PENDING && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedEMI(emi.id);
                                        setShowPaySheet(true);
                                      }}
                                    >
                                      Pay
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Loan Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Principal Amount</p>
                    <p className="font-semibold">{formatINR(loanData.principalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Interest Rate</p>
                    <p className="font-semibold">{loanData.interestRate}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tenure</p>
                    <p className="font-semibold">{loanData.tenure} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">EMI Amount</p>
                    <p className="font-semibold">{formatINR(loanData.emiAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-semibold">{formatDate(new Date(loanData.startDate), 'medium')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-semibold">{formatDate(new Date(loanData.endDate), 'medium')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lender</p>
                    <p className="font-semibold">{loanData.lender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">EMI Due Date</p>
                    <p className="font-semibold">{loanData.emiDay}th of every month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Payable</span>
                    <span className="font-semibold">{formatINR(loanData.totalPayable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Interest</span>
                    <span className="font-semibold text-orange-500">
                      {formatINR(loanData.totalInterestPayable)}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Principal Paid</span>
                    <span className="font-semibold text-emerald-500">
                      {formatINR(loanData.progress.principalPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Paid</span>
                    <span className="font-semibold text-orange-500">
                      {formatINR(loanData.progress.interestPaid)}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Outstanding Principal</span>
                    <span className="font-semibold">{formatINR(loanData.outstandingPrincipal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Outstanding Interest</span>
                    <span className="font-semibold">{formatINR(loanData.outstandingInterest)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-6 rounded-full overflow-hidden flex mb-4">
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(loanData.principalAmount / loanData.totalPayable) * 100}%` }}
                  />
                  <div
                    className="bg-orange-400 transition-all"
                    style={{ width: `${(loanData.totalInterestPayable / loanData.totalPayable) * 100}%` }}
                  />
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm">Principal ({((loanData.principalAmount / loanData.totalPayable) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-400" />
                    <span className="text-sm">Interest ({((loanData.totalInterestPayable / loanData.totalPayable) * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prepay Tab */}
          <TabsContent value="prepay" className="space-y-4">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Make a Prepayment</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Reduce your loan tenure or EMI by making an extra payment
                </p>
                <Button
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={() => navigate(`/loans/${id}/prepay`)}
                >
                  Calculate Prepayment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Benefits of Prepayment</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Reduce total interest payable significantly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Become debt-free faster by reducing tenure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Lower monthly EMI burden for better cash flow</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>No prepayment charges on floating rate loans*</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Pay EMI Bottom Sheet */}
      <BottomSheet isOpen={showPaySheet} onClose={() => setShowPaySheet(false)}>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Pay EMI</h3>

          {selectedEMI && loanData.schedule.find(s => s.id === selectedEMI) && (
            <>
              {(() => {
                const emi = loanData.schedule.find(s => s.id === selectedEMI);
                if (!emi) return null;

                return (
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">EMI #{emi.emiNumber}</span>
                        <span className="text-gray-600">{formatDate(new Date(emi.dueDate), 'medium')}</span>
                      </div>
                      <div className="text-3xl font-bold text-center mb-4">
                        {formatINR(emi.emiAmount)}
                      </div>
                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="text-gray-500">Principal</p>
                          <p className="font-medium text-emerald-600">{formatINR(emi.principalComponent)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500">Interest</p>
                          <p className="font-medium text-orange-500">{formatINR(emi.interestComponent)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <div className="space-y-3">
                <Button
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600"
                  onClick={handlePayEMI}
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Record Payment
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPaySheet(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
