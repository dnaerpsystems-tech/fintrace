/**
 * Tax Summary Page
 * Indian Income Tax Deduction Tracker
 * Tracks 80C, 80D, 24(b), 80E, HRA exemptions
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Calculator,
  Landmark, Heart, Home, GraduationCap,
  PiggyBank, TrendingUp, Shield, Building2,
  ChevronRight, Plus, Info, CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatIndianCurrency, exportTaxReportToPDF, exportTaxReportToExcel, type TaxReportData } from '@/lib/services/exportService';

// Tax limits for FY 2025-26
const TAX_LIMITS = {
  section80C: 150000,
  section80D_self: 25000,
  section80D_parents: 50000,
  section80D_senior_parents: 100000,
  section80D_preventive: 5000,
  section24b_self_occupied: 200000,
  section24b_let_out: Number.POSITIVE_INFINITY,
  section80TTA: 10000,
  section80TTB_senior: 50000
};

interface TaxInvestment {
  id: string;
  category: string;
  section: string;
  name: string;
  amount: number;
  date?: string;
  notes?: string;
}

export default function TaxSummaryPage() {
  const navigate = useNavigate();
  const [financialYear, setFinancialYear] = useState('2025-26');
  const [isMetro, setIsMetro] = useState(true);
  const [showHRACalculator, setShowHRACalculator] = useState(false);

  // HRA inputs
  const [basicSalary, setBasicSalary] = useState(0);
  const [hraReceived, setHraReceived] = useState(0);
  const [rentPaid, setRentPaid] = useState(0);

  // Fetch investments tagged as tax-saving
  const investments = useLiveQuery(async () => {
    const allInvestments = await db.investments.toArray();
    return allInvestments.filter(inv =>
      inv.isTaxSaving ||
      inv.type === 'ppf' ||
      inv.type === 'epf' ||
      inv.type === 'nps' ||
      inv.taxSection === '80C' ||
      inv.taxSection === '80CCD'
    );
  }, []);

  // Fetch loans for 80C principal and 24b interest
  const loans = useLiveQuery(() => db.loans.toArray(), []);

  // Fetch transactions tagged as tax-related
  const taxTransactions = useLiveQuery(async () => {
    const categories = await db.categories.toArray();
    const taxCategories = categories.filter(c =>
      c.name.toLowerCase().includes('insurance') ||
      c.name.toLowerCase().includes('medical') ||
      c.name.toLowerCase().includes('health')
    );

    const categoryIds = taxCategories.map(c => c.id);
    const transactions = await db.transactions.toArray();

    return transactions.filter(t =>
      categoryIds.includes(t.categoryId || '') &&
      t.type === 'expense'
    );
  }, []);

  // Calculate Section 80C
  const section80C = useMemo(() => {
    let ppf = 0;
    let elss = 0;
    const lifeInsurance = 0;
    let homeLoanPrincipal = 0;
    const tuitionFees = 0;
    const nsc = 0;
    const sukanyaSamriddhi = 0;
    let other = 0;

    // From investments
    investments?.forEach(inv => {
      const amount = inv.investedAmount || 0;
      switch (inv.type) {
        case 'ppf': ppf += amount; break;
        case 'epf': ppf += amount; break; // EPF counts as 80C
        case 'mutual_fund':
          // Check if it's ELSS based on taxSection
          if (inv.taxSection === '80C' || inv.isTaxSaving) {
            elss += amount;
          }
          break;
        case 'nps': other += amount; break;
        default:
          // Other tax saving investments
          if (inv.isTaxSaving || inv.taxSection === '80C') {
            other += amount;
          }
          break;
      }
    });

    // From loans (home loan principal)
    loans?.forEach(loan => {
      if (loan.type === 'home') {
        homeLoanPrincipal += loan.totalPaid || 0;
      }
    });

    const total = ppf + elss + lifeInsurance + homeLoanPrincipal + tuitionFees + nsc + sukanyaSamriddhi + other;

    return {
      ppf,
      elss,
      lifeInsurance,
      homeLoanPrincipal,
      tuitionFees,
      nsc,
      sukanyaSamriddhi,
      other,
      total,
      limit: TAX_LIMITS.section80C,
      eligible: Math.min(total, TAX_LIMITS.section80C)
    };
  }, [investments, loans]);

  // Calculate Section 80D
  const section80D = useMemo(() => {
    let selfPremium = 0;
    const parentsPremium = 0;
    let preventiveCheckup = 0;

    // From transactions tagged as health insurance
    taxTransactions?.forEach(tx => {
      if (tx.description?.toLowerCase().includes('health insurance')) {
        selfPremium += tx.amount;
      }
      if (tx.description?.toLowerCase().includes('preventive') ||
          tx.description?.toLowerCase().includes('health checkup')) {
        preventiveCheckup += tx.amount;
      }
    });

    const total = selfPremium + parentsPremium + preventiveCheckup;
    const limit = TAX_LIMITS.section80D_self + TAX_LIMITS.section80D_parents;

    return {
      selfPremium,
      parentsPremium,
      preventiveCheckup,
      total,
      limit,
      eligible: Math.min(total, limit)
    };
  }, [taxTransactions]);

  // Calculate Section 24(b) - Home Loan Interest
  const section24b = useMemo(() => {
    let homeLoanInterest = 0;

    loans?.forEach(loan => {
      if (loan.type === 'home') {
        homeLoanInterest += loan.totalInterest || 0;
      }
    });

    return {
      homeLoanInterest,
      limit: TAX_LIMITS.section24b_self_occupied,
      eligible: Math.min(homeLoanInterest, TAX_LIMITS.section24b_self_occupied)
    };
  }, [loans]);

  // Calculate Section 80E - Education Loan Interest
  const section80E = useMemo(() => {
    let educationLoanInterest = 0;

    loans?.forEach(loan => {
      if (loan.type === 'education') {
        educationLoanInterest += loan.totalInterest || 0;
      }
    });

    return {
      educationLoanInterest,
      eligible: educationLoanInterest // No limit for 80E
    };
  }, [loans]);

  // Calculate Section 80TTA - Savings Interest
  const section80TTA = useMemo(() => {
    // This would come from income transactions tagged as interest
    const savingsInterest = 0; // TODO: Calculate from transactions

    return {
      savingsInterest,
      limit: TAX_LIMITS.section80TTA,
      eligible: Math.min(savingsInterest, TAX_LIMITS.section80TTA)
    };
  }, []);

  // Calculate HRA Exemption
  const hraExemption = useMemo(() => {
    if (basicSalary === 0 || hraReceived === 0 || rentPaid === 0) {
      return { exemption: 0, method: '' };
    }

    const annualBasic = basicSalary * 12;
    const annualHRA = hraReceived * 12;
    const annualRent = rentPaid * 12;

    // Three conditions for HRA exemption
    const actual_hra = annualHRA;
    const rent_minus_10 = Math.max(0, annualRent - (0.1 * annualBasic));
    const percentage_basic = isMetro ? 0.5 * annualBasic : 0.4 * annualBasic;

    const exemption = Math.min(actual_hra, rent_minus_10, percentage_basic);

    let method = '';
    if (exemption === actual_hra) method = 'Actual HRA received';
    else if (exemption === rent_minus_10) method = 'Rent paid minus 10% of basic';
    else method = isMetro ? '50% of basic salary (Metro)' : '40% of basic salary (Non-Metro)';

    return { exemption, method };
  }, [basicSalary, hraReceived, rentPaid, isMetro]);

  // Total deductions
  const totalDeductions = useMemo(() => {
    return section80C.eligible +
           section80D.eligible +
           section24b.eligible +
           section80E.eligible +
           section80TTA.eligible +
           hraExemption.exemption;
  }, [section80C, section80D, section24b, section80E, section80TTA, hraExemption]);

  // Export functions
  const handleExportPDF = () => {
    const data: TaxReportData = {
      section80C: { ...section80C },
      section80D: { ...section80D },
      section24b: { ...section24b },
      section80E: { ...section80E },
      section80TTA: { ...section80TTA },
      hra: {
        basicSalary: basicSalary * 12,
        hraReceived: hraReceived * 12,
        rentPaid: rentPaid * 12,
        isMetro,
        exemption: hraExemption.exemption
      },
      tdsDeducted: 0, // TODO: Get from transactions
      totalDeductions
    };

    exportTaxReportToPDF(data, financialYear);
  };

  const handleExportExcel = () => {
    const data: TaxReportData = {
      section80C: { ...section80C },
      section80D: { ...section80D },
      section24b: { ...section24b },
      section80E: { ...section80E },
      section80TTA: { ...section80TTA },
      hra: {
        basicSalary: basicSalary * 12,
        hraReceived: hraReceived * 12,
        rentPaid: rentPaid * 12,
        isMetro,
        exemption: hraExemption.exemption
      },
      tdsDeducted: 0,
      totalDeductions
    };

    exportTaxReportToExcel(data, financialYear);
  };

  return (
    <Page>
      <Header
        title="Tax Summary"
        showBack
        rightActions={
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleExportPDF}>
              <Download className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-6 pb-24">
        {/* Year Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">FY {financialYear}</h2>
            <p className="text-sm text-gray-500">Tax Deduction Summary</p>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-200">
            Old Regime
          </Badge>
        </div>

        {/* Total Deductions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5" />
              <span className="text-emerald-100">Total Eligible Deductions</span>
            </div>
            <p className="text-3xl font-bold mb-4">
              {formatIndianCurrency(totalDeductions)}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={handleExportPDF}
              >
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={handleExportExcel}
              >
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Section 80C */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Landmark className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Section 80C</h3>
                  <p className="text-sm text-gray-500">Investments & Savings</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatIndianCurrency(section80C.eligible)}</p>
                <p className="text-xs text-gray-500">of {formatIndianCurrency(section80C.limit)}</p>
              </div>
            </div>

            <Progress
              value={(section80C.total / section80C.limit) * 100}
              className="h-2 mb-4"
            />

            <div className="space-y-2 text-sm">
              {section80C.ppf > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">PPF</span>
                  <span className="font-medium">{formatIndianCurrency(section80C.ppf)}</span>
                </div>
              )}
              {section80C.elss > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">ELSS</span>
                  <span className="font-medium">{formatIndianCurrency(section80C.elss)}</span>
                </div>
              )}
              {section80C.lifeInsurance > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Life Insurance</span>
                  <span className="font-medium">{formatIndianCurrency(section80C.lifeInsurance)}</span>
                </div>
              )}
              {section80C.homeLoanPrincipal > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Home Loan Principal</span>
                  <span className="font-medium">{formatIndianCurrency(section80C.homeLoanPrincipal)}</span>
                </div>
              )}
              {section80C.sukanyaSamriddhi > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Sukanya Samriddhi</span>
                  <span className="font-medium">{formatIndianCurrency(section80C.sukanyaSamriddhi)}</span>
                </div>
              )}
              {section80C.total === 0 && (
                <p className="text-gray-500 text-center py-2">No investments tracked yet</p>
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full mt-3"
              onClick={() => navigate('/invest')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Investment
            </Button>
          </Card>
        </motion.div>

        {/* Section 80D */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Heart className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Section 80D</h3>
                  <p className="text-sm text-gray-500">Health Insurance</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatIndianCurrency(section80D.eligible)}</p>
                <p className="text-xs text-gray-500">of {formatIndianCurrency(section80D.limit)}</p>
              </div>
            </div>

            <Progress
              value={(section80D.total / section80D.limit) * 100}
              className="h-2 mb-4"
            />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Self & Family Premium</span>
                <span className="font-medium">{formatIndianCurrency(section80D.selfPremium)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Parents Premium</span>
                <span className="font-medium">{formatIndianCurrency(section80D.parentsPremium)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Preventive Checkup</span>
                <span className="font-medium">{formatIndianCurrency(section80D.preventiveCheckup)}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Section 24(b) - Home Loan Interest */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Home className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Section 24(b)</h3>
                  <p className="text-sm text-gray-500">Home Loan Interest</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatIndianCurrency(section24b.eligible)}</p>
                <p className="text-xs text-gray-500">of {formatIndianCurrency(section24b.limit)}</p>
              </div>
            </div>

            <Progress
              value={(section24b.homeLoanInterest / section24b.limit) * 100}
              className="h-2"
            />
          </Card>
        </motion.div>

        {/* Section 80E - Education Loan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Section 80E</h3>
                  <p className="text-sm text-gray-500">Education Loan Interest</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatIndianCurrency(section80E.eligible)}</p>
                <p className="text-xs text-gray-500">No limit</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* HRA Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowHRACalculator(!showHRACalculator)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">HRA Exemption</h3>
                  <p className="text-sm text-gray-500">House Rent Allowance</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{formatIndianCurrency(hraExemption.exemption)}</p>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showHRACalculator ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {showHRACalculator && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Basic Salary (Monthly)</Label>
                    <Input
                      type="number"
                      value={basicSalary || ''}
                      onChange={(e) => setBasicSalary(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>HRA Received (Monthly)</Label>
                    <Input
                      type="number"
                      value={hraReceived || ''}
                      onChange={(e) => setHraReceived(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label>Rent Paid (Monthly)</Label>
                  <Input
                    type="number"
                    value={rentPaid || ''}
                    onChange={(e) => setRentPaid(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Metro City (50% of Basic)</Label>
                  <Switch checked={isMetro} onCheckedChange={setIsMetro} />
                </div>

                {hraExemption.exemption > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Annual HRA Exemption: {formatIndianCurrency(hraExemption.exemption)}</span>
                    </div>
                    <p className="text-sm text-emerald-600 mt-1">
                      Based on: {hraExemption.method}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            This is for reference only. Please consult a Chartered Accountant for accurate tax calculations and filing.
          </p>
        </div>
      </div>
    </Page>
  );
}
