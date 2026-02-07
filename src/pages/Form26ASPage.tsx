/**
 * Form 26AS Style Tax Report Page
 * Comprehensive tax deduction and payment summary for ITR filing
 */

import { useState, useMemo } from 'react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatINR } from '@/lib/formatters/currency';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Building2,
  CreditCard,
  Landmark,
  Receipt,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  IndianRupee
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// Types
// ============================================

interface TDSEntry {
  id: string;
  deductorName: string;
  deductorTAN: string;
  section: string;
  grossAmount: number;
  tdsAmount: number;
  transactionDate: string;
  depositDate: string;
  status: 'verified' | 'pending' | 'mismatch';
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

interface AdvanceTax {
  id: string;
  challanNo: string;
  bsrCode: string;
  depositDate: string;
  amount: number;
  type: 'Advance Tax' | 'Self Assessment Tax' | 'Regular Assessment Tax';
}

interface TaxSummary {
  totalIncome: number;
  totalTDS: number;
  advanceTaxPaid: number;
  selfAssessmentTax: number;
  refundDue: number;
  additionalTaxDue: number;
}

// ============================================
// Mock Data (Replace with real data in production)
// ============================================

const mockTDSEntries: TDSEntry[] = [
  {
    id: '1',
    deductorName: 'ABC Technologies Pvt Ltd',
    deductorTAN: 'MUMT12345A',
    section: '192',
    grossAmount: 1800000,
    tdsAmount: 324000,
    transactionDate: '2025-03-31',
    depositDate: '2025-04-07',
    status: 'verified',
    quarter: 'Q4',
  },
  {
    id: '2',
    deductorName: 'HDFC Bank Ltd',
    deductorTAN: 'MUMH00001B',
    section: '194A',
    grossAmount: 85000,
    tdsAmount: 8500,
    transactionDate: '2025-06-30',
    depositDate: '2025-07-07',
    status: 'verified',
    quarter: 'Q1',
  },
  {
    id: '3',
    deductorName: 'XYZ Consulting Services',
    deductorTAN: 'DELX98765C',
    section: '194J',
    grossAmount: 250000,
    tdsAmount: 25000,
    transactionDate: '2025-09-15',
    depositDate: '2025-10-07',
    status: 'verified',
    quarter: 'Q2',
  },
  {
    id: '4',
    deductorName: 'SBI Mutual Fund',
    deductorTAN: 'MUMS00002D',
    section: '194K',
    grossAmount: 45000,
    tdsAmount: 4500,
    transactionDate: '2025-12-20',
    depositDate: '2025-01-07',
    status: 'pending',
    quarter: 'Q3',
  },
  {
    id: '5',
    deductorName: 'Infosys Ltd',
    deductorTAN: 'BLRI00003E',
    section: '192',
    grossAmount: 350000,
    tdsAmount: 70000,
    transactionDate: '2025-02-28',
    depositDate: '2025-03-07',
    status: 'verified',
    quarter: 'Q4',
  },
];

const mockAdvanceTax: AdvanceTax[] = [
  {
    id: '1',
    challanNo: '28765432109',
    bsrCode: '0002345',
    depositDate: '2025-06-15',
    amount: 50000,
    type: 'Advance Tax',
  },
  {
    id: '2',
    challanNo: '28765432110',
    bsrCode: '0002345',
    depositDate: '2025-09-15',
    amount: 50000,
    type: 'Advance Tax',
  },
  {
    id: '3',
    challanNo: '28765432111',
    bsrCode: '0002345',
    depositDate: '2025-12-15',
    amount: 75000,
    type: 'Advance Tax',
  },
  {
    id: '4',
    challanNo: '28765432112',
    bsrCode: '0002345',
    depositDate: '2026-03-15',
    amount: 25000,
    type: 'Advance Tax',
  },
];

// ============================================
// Component
// ============================================

// Helper to format currency (amounts are in rupees, convert to paise for formatINR)
const formatCurrency = (amount: number) => formatINR(amount * 100, { decimals: 0 });

export default function Form26ASPage() {
  const [selectedYear, setSelectedYear] = useState('2025-26');
  const [activeTab, setActiveTab] = useState('summary');

  const financialYears = [
    { value: '2025-26', label: 'FY 2025-26 (AY 2026-27)' },
    { value: '2024-25', label: 'FY 2024-25 (AY 2025-26)' },
    { value: '2023-24', label: 'FY 2023-24 (AY 2024-25)' },
  ];

  // Calculate summaries
  const summary = useMemo((): TaxSummary => {
    const totalTDS = mockTDSEntries.reduce((sum, entry) => sum + entry.tdsAmount, 0);
    const advanceTaxPaid = mockAdvanceTax.reduce((sum, entry) => sum + entry.amount, 0);
    const totalIncome = mockTDSEntries.reduce((sum, entry) => sum + entry.grossAmount, 0);

    // Simplified tax calculation (actual would use tax slabs)
    const estimatedTax = calculateEstimatedTax(totalIncome);
    const totalTaxPaid = totalTDS + advanceTaxPaid;

    return {
      totalIncome,
      totalTDS,
      advanceTaxPaid,
      selfAssessmentTax: 0,
      refundDue: totalTaxPaid > estimatedTax ? totalTaxPaid - estimatedTax : 0,
      additionalTaxDue: totalTaxPaid < estimatedTax ? estimatedTax - totalTaxPaid : 0,
    };
  }, [selectedYear]);

  const quarterlyBreakdown = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    return quarters.map(q => ({
      quarter: q,
      tds: mockTDSEntries.filter(e => e.quarter === q).reduce((sum, e) => sum + e.tdsAmount, 0),
      gross: mockTDSEntries.filter(e => e.quarter === q).reduce((sum, e) => sum + e.grossAmount, 0),
      entries: mockTDSEntries.filter(e => e.quarter === q).length,
    }));
  }, [selectedYear]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Form 26AS Style Tax Report', 14, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Financial Year: ${selectedYear}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 60, 32);

    let yPos = 50;

    // Summary Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Summary', 14, yPos);
    yPos += 10;

    const summaryData = [
      ['Total Gross Income', formatCurrency(summary.totalIncome)],
      ['Total TDS Deducted', formatCurrency(summary.totalTDS)],
      ['Advance Tax Paid', formatCurrency(summary.advanceTaxPaid)],
      ['Self Assessment Tax', formatCurrency(summary.selfAssessmentTax)],
      ['Total Tax Paid', formatCurrency(summary.totalTDS + summary.advanceTaxPaid)],
      ['Refund Due (if any)', formatCurrency(summary.refundDue)],
      ['Additional Tax Due (if any)', formatCurrency(summary.additionalTaxDue)],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Particulars', 'Amount (₹)']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 10 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // TDS Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Part A - Details of Tax Deducted at Source', 14, yPos);
    yPos += 10;

    const tdsData = mockTDSEntries.map(entry => [
      entry.deductorName,
      entry.deductorTAN,
      entry.section,
      formatCurrency(entry.grossAmount),
      formatCurrency(entry.tdsAmount),
      entry.status === 'verified' ? 'Verified' : 'Pending',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Deductor Name', 'TAN', 'Section', 'Gross Amount', 'TDS Amount', 'Status']],
      body: tdsData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Advance Tax Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Part B - Details of Advance Tax / Self Assessment Tax', 14, yPos);
    yPos += 10;

    const advanceTaxData = mockAdvanceTax.map(entry => [
      entry.challanNo,
      entry.bsrCode,
      new Date(entry.depositDate).toLocaleDateString('en-IN'),
      formatCurrency(entry.amount),
      entry.type,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Challan No.', 'BSR Code', 'Deposit Date', 'Amount', 'Type']],
      body: advanceTaxData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { halign: 'right' },
      },
    });

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${totalPages} | Generated by FinTrace | This is a summary report - Please verify with official Form 26AS`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`Form26AS_${selectedYear}.pdf`);
  };

  return (
    <Page>
      <Header title="Form 26AS Report" showBack />
      <div className="px-4 pb-24 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Form 26AS Style Report</h1>
                <p className="text-emerald-100 text-sm">Tax Credit Statement</p>
              </div>
            </div>
            <Button
              onClick={exportToPDF}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {financialYears.map(fy => (
                  <SelectItem key={fy.value} value={fy.value}>{fy.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-gray-500">Total TDS</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalTDS)}</p>
              <p className="text-xs text-gray-400 mt-1">{mockTDSEntries.length} deductors</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-3 mb-2">
                <Landmark className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-500">Advance Tax</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.advanceTaxPaid)}</p>
              <p className="text-xs text-gray-400 mt-1">{mockAdvanceTax.length} payments</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-3 mb-2">
                <IndianRupee className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-gray-500">Gross Income</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalIncome)}</p>
              <p className="text-xs text-gray-400 mt-1">From all sources</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className={`p-4 border-l-4 ${summary.refundDue > 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <div className="flex items-center gap-3 mb-2">
                {summary.refundDue > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-sm text-gray-500">
                  {summary.refundDue > 0 ? 'Refund Due' : 'Tax Due'}
                </span>
              </div>
              <p className={`text-xl font-bold ${summary.refundDue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.refundDue > 0 ? summary.refundDue : summary.additionalTaxDue)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Estimated</p>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="tds">TDS (Part A)</TabsTrigger>
            <TabsTrigger value="advance">Advance Tax</TabsTrigger>
            <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="summary" className="mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    Tax Credit Summary
                  </h3>
                  <div className="space-y-4">
                    <SummaryRow label="Total Gross Income (from TDS sources)" value={summary.totalIncome} />
                    <SummaryRow label="TDS Deducted (Section 192, 194A, 194J, etc.)" value={summary.totalTDS} />
                    <SummaryRow label="Advance Tax Paid" value={summary.advanceTaxPaid} />
                    <SummaryRow label="Self Assessment Tax Paid" value={summary.selfAssessmentTax} />
                    <div className="border-t border-gray-200 pt-4">
                      <SummaryRow
                        label="Total Tax Paid"
                        value={summary.totalTDS + summary.advanceTaxPaid + summary.selfAssessmentTax}
                        highlight
                      />
                    </div>
                    {summary.refundDue > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <SummaryRow label="Expected Refund" value={summary.refundDue} positive />
                      </div>
                    )}
                    {summary.additionalTaxDue > 0 && (
                      <div className="bg-red-50 p-4 rounded-lg">
                        <SummaryRow label="Additional Tax Due" value={summary.additionalTaxDue} negative />
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="tds" className="mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    Part A - Details of Tax Deducted at Source
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    TDS deducted by employers, banks, and other deductors
                  </p>
                </Card>

                {mockTDSEntries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{entry.deductorName}</h4>
                          <p className="text-sm text-gray-500">TAN: {entry.deductorTAN}</p>
                        </div>
                        <Badge variant={entry.status === 'verified' ? 'default' : 'secondary'}>
                          {entry.status === 'verified' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</>
                          ) : (
                            <><AlertCircle className="w-3 h-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Section</span>
                          <p className="font-medium">{entry.section}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Quarter</span>
                          <p className="font-medium">{entry.quarter}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Gross Amount</span>
                          <p className="font-medium">{formatCurrency(entry.grossAmount)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">TDS Amount</span>
                          <p className="font-medium text-emerald-600">{formatCurrency(entry.tdsAmount)}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </TabsContent>

            <TabsContent value="advance" className="mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-blue-600" />
                    Part B - Details of Advance Tax / Self Assessment Tax
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Tax paid directly to the government
                  </p>
                </Card>

                {mockAdvanceTax.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{entry.type}</h4>
                          <p className="text-sm text-gray-500">Challan: {entry.challanNo}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{formatCurrency(entry.amount)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">BSR Code</span>
                          <p className="font-medium">{entry.bsrCode}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Deposit Date</span>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(entry.depositDate).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </TabsContent>

            <TabsContent value="quarterly" className="mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    Quarterly TDS Breakdown
                  </h3>
                </Card>

                {quarterlyBreakdown.map((quarter, index) => (
                  <motion.div
                    key={quarter.quarter}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            index === 0 ? 'bg-emerald-100 text-emerald-600' :
                            index === 1 ? 'bg-blue-100 text-blue-600' :
                            index === 2 ? 'bg-amber-100 text-amber-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            <span className="font-bold">{quarter.quarter}</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Quarter {index + 1}</h4>
                            <p className="text-sm text-gray-500">{quarter.entries} deductions</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <span className="text-sm text-gray-500">Gross Amount</span>
                          <p className="font-semibold">{formatCurrency(quarter.gross)}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-lg">
                          <span className="text-sm text-gray-500">TDS Deducted</span>
                          <p className="font-semibold text-emerald-600">{formatCurrency(quarter.tds)}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>

        {/* Disclaimer */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Important Disclaimer</h4>
              <p className="text-sm text-amber-700 mt-1">
                This is a summary report based on your transaction data. For official ITR filing,
                please download your actual Form 26AS from the TRACES portal or Income Tax e-Filing website.
                Tax calculations shown are estimates and may vary based on your actual tax situation.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}

// ============================================
// Helper Components
// ============================================

function SummaryRow({
  label,
  value,
  highlight = false,
  positive = false,
  negative = false
}: {
  label: string;
  value: number;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${highlight ? 'font-semibold' : ''} text-gray-700`}>{label}</span>
      <span className={`font-semibold ${
        positive ? 'text-green-600' :
        negative ? 'text-red-600' :
        highlight ? 'text-emerald-600' :
        'text-gray-900'
      }`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// ============================================
// Tax Calculation Helper
// ============================================

function calculateEstimatedTax(income: number): number {
  // New Tax Regime (FY 2025-26) - Simplified
  // 0-3L: 0%
  // 3-7L: 5%
  // 7-10L: 10%
  // 10-12L: 15%
  // 12-15L: 20%
  // >15L: 30%

  let tax = 0;
  let remaining = income;

  if (remaining > 1500000) {
    tax += (remaining - 1500000) * 0.30;
    remaining = 1500000;
  }
  if (remaining > 1200000) {
    tax += (remaining - 1200000) * 0.20;
    remaining = 1200000;
  }
  if (remaining > 1000000) {
    tax += (remaining - 1000000) * 0.15;
    remaining = 1000000;
  }
  if (remaining > 700000) {
    tax += (remaining - 700000) * 0.10;
    remaining = 700000;
  }
  if (remaining > 300000) {
    tax += (remaining - 300000) * 0.05;
  }

  // Add 4% cess
  tax *= 1.04;

  return Math.round(tax);
}
