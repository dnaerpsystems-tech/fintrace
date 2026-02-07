/**
 * GST Invoice Tracking Page
 * For business users to track GST invoices and calculate input tax credit
 */

import { useState, useMemo } from 'react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { formatINR } from '@/lib/formatters/currency';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Receipt,
  Calculator,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Calendar,
  Loader2,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// Types
// ============================================

interface GSTInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  vendorGSTIN: string;
  invoiceType: 'B2B' | 'B2C' | 'CDNR' | 'CDNUR';
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalValue: number;
  status: 'pending' | 'verified' | 'matched' | 'mismatched';
  placeOfSupply: string;
  reverseCharge: boolean;
  category: string;
  notes?: string;
  createdAt: string;
}

interface GSTSummary {
  totalInvoices: number;
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalCess: number;
  totalTax: number;
  inputTaxCredit: number;
  outputTaxLiability: number;
  netTaxPayable: number;
}

// ============================================
// Mock Data
// ============================================

const mockInvoices: GSTInvoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2026-001',
    invoiceDate: '2026-02-01',
    vendorName: 'Tech Solutions Pvt Ltd',
    vendorGSTIN: '29AABCT1234P1ZV',
    invoiceType: 'B2B',
    taxableValue: 10000000,
    cgst: 900000,
    sgst: 900000,
    igst: 0,
    cess: 0,
    totalValue: 11800000,
    status: 'verified',
    placeOfSupply: 'Karnataka',
    reverseCharge: false,
    category: 'IT Services',
    createdAt: '2026-02-01T10:30:00Z',
  },
  {
    id: '2',
    invoiceNumber: 'INV-2026-002',
    invoiceDate: '2026-02-03',
    vendorName: 'Office Supplies Co',
    vendorGSTIN: '27AADCO5678Q1ZX',
    invoiceType: 'B2B',
    taxableValue: 2500000,
    cgst: 0,
    sgst: 0,
    igst: 450000,
    cess: 0,
    totalValue: 2950000,
    status: 'matched',
    placeOfSupply: 'Maharashtra',
    reverseCharge: false,
    category: 'Office Supplies',
    createdAt: '2026-02-03T14:15:00Z',
  },
  {
    id: '3',
    invoiceNumber: 'INV-2026-003',
    invoiceDate: '2026-02-05',
    vendorName: 'Cloud Hosting Ltd',
    vendorGSTIN: '29AABCC9012R1ZY',
    invoiceType: 'B2B',
    taxableValue: 5000000,
    cgst: 900000,
    sgst: 900000,
    igst: 0,
    cess: 0,
    totalValue: 6800000,
    status: 'pending',
    placeOfSupply: 'Karnataka',
    reverseCharge: false,
    category: 'Cloud Services',
    createdAt: '2026-02-05T09:00:00Z',
  },
];

const GST_CATEGORIES = [
  'IT Services',
  'Cloud Services',
  'Office Supplies',
  'Professional Services',
  'Rent',
  'Utilities',
  'Travel',
  'Marketing',
  'Legal Services',
  'Accounting Services',
  'Other',
];

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

// ============================================
// Helper
// ============================================

const formatCurrency = (amount: number) => formatINR(amount, { decimals: 0 });

// ============================================
// Component
// ============================================

export default function GSTInvoicePage() {
  const [invoices, setInvoices] = useState<GSTInvoice[]>(mockInvoices);
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState<GSTInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newInvoice, setNewInvoice] = useState<Partial<GSTInvoice>>({
    invoiceType: 'B2B',
    reverseCharge: false,
    placeOfSupply: 'Karnataka',
    category: 'IT Services',
  });

  // Calculate summary
  const summary = useMemo((): GSTSummary => {
    const totalTaxableValue = invoices.reduce((sum, inv) => sum + inv.taxableValue, 0);
    const totalCGST = invoices.reduce((sum, inv) => sum + inv.cgst, 0);
    const totalSGST = invoices.reduce((sum, inv) => sum + inv.sgst, 0);
    const totalIGST = invoices.reduce((sum, inv) => sum + inv.igst, 0);
    const totalCess = invoices.reduce((sum, inv) => sum + inv.cess, 0);
    const totalTax = totalCGST + totalSGST + totalIGST + totalCess;

    // For demo, assuming this is input (purchases)
    const inputTaxCredit = totalTax;
    // Mock output liability
    const outputTaxLiability = 2500000;
    const netTaxPayable = Math.max(0, outputTaxLiability - inputTaxCredit);

    return {
      totalInvoices: invoices.length,
      totalTaxableValue,
      totalCGST,
      totalSGST,
      totalIGST,
      totalCess,
      totalTax,
      inputTaxCredit,
      outputTaxLiability,
      netTaxPayable,
    };
  }, [invoices]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.vendorGSTIN.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, filterStatus]);

  const handleAddInvoice = async () => {
    if (!newInvoice.invoiceNumber || !newInvoice.vendorName || !newInvoice.taxableValue) {
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const gstRate = 18; // Default 18%
    const taxableValue = Number(newInvoice.taxableValue) * 100; // Convert to paise
    const isInterstate = newInvoice.placeOfSupply !== 'Karnataka'; // Assuming business is in Karnataka

    const invoice: GSTInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: newInvoice.invoiceNumber || '',
      invoiceDate: newInvoice.invoiceDate || new Date().toISOString().split('T')[0],
      vendorName: newInvoice.vendorName || '',
      vendorGSTIN: newInvoice.vendorGSTIN || '',
      invoiceType: newInvoice.invoiceType as 'B2B',
      taxableValue,
      cgst: isInterstate ? 0 : Math.round(taxableValue * gstRate / 200),
      sgst: isInterstate ? 0 : Math.round(taxableValue * gstRate / 200),
      igst: isInterstate ? Math.round(taxableValue * gstRate / 100) : 0,
      cess: 0,
      totalValue: taxableValue + Math.round(taxableValue * gstRate / 100),
      status: 'pending',
      placeOfSupply: newInvoice.placeOfSupply || 'Karnataka',
      reverseCharge: newInvoice.reverseCharge || false,
      category: newInvoice.category || 'Other',
      notes: newInvoice.notes,
      createdAt: new Date().toISOString(),
    };

    setInvoices(prev => [...prev, invoice]);
    setShowAddDialog(false);
    setNewInvoice({
      invoiceType: 'B2B',
      reverseCharge: false,
      placeOfSupply: 'Karnataka',
      category: 'IT Services',
    });
    setIsSubmitting(false);
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('GST Invoice Summary', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 50, 20);

    let yPos = 45;

    // Summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, yPos);
    yPos += 8;

    const summaryData = [
      ['Total Invoices', summary.totalInvoices.toString()],
      ['Taxable Value', formatCurrency(summary.totalTaxableValue)],
      ['CGST', formatCurrency(summary.totalCGST)],
      ['SGST', formatCurrency(summary.totalSGST)],
      ['IGST', formatCurrency(summary.totalIGST)],
      ['Total Tax (ITC)', formatCurrency(summary.totalTax)],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Particulars', 'Amount']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Invoice Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Details', 14, yPos);
    yPos += 8;

    const invoiceData = invoices.map(inv => [
      inv.invoiceNumber,
      new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
      inv.vendorName,
      inv.vendorGSTIN,
      formatCurrency(inv.taxableValue),
      formatCurrency(inv.cgst + inv.sgst + inv.igst),
      inv.status,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Invoice #', 'Date', 'Vendor', 'GSTIN', 'Taxable', 'Tax', 'Status']],
      body: invoiceData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 7 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });

    doc.save(`GST_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getStatusBadge = (status: GSTInvoice['status']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'matched':
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle2 className="w-3 h-3 mr-1" />Matched</Badge>;
      case 'mismatched':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Mismatched</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Page>
      <Header title="GST Invoices" showBack />

      <div className="px-4 pb-24 space-y-6">
        {/* Summary Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Receipt className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">GST Summary</h2>
                <p className="text-emerald-100 text-sm">FY 2025-26 | February</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-sm text-emerald-100">Input Tax Credit</p>
                <p className="text-xl font-bold">{formatCurrency(summary.inputTaxCredit)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-sm text-emerald-100">Output Liability</p>
                <p className="text-xl font-bold">{formatCurrency(summary.outputTaxLiability)}</p>
              </div>
              <div className="col-span-2 bg-white/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-100">Net Tax Payable</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.netTaxPayable)}</p>
                  </div>
                  {summary.netTaxPayable === 0 ? (
                    <TrendingDown className="w-8 h-8 text-emerald-200" />
                  ) : (
                    <TrendingUp className="w-8 h-8 text-amber-200" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleExportPDF}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="flex-1 bg-white text-emerald-600 hover:bg-emerald-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Invoice
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="breakdown">Tax Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4 space-y-4">
            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="mismatched">Mismatched</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Invoice List */}
            {filteredInvoices.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No invoices found</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredInvoices.map((invoice, index) => (
                  <motion.div
                    key={invoice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{invoice.invoiceNumber}</h4>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <p className="text-sm text-gray-500">{invoice.vendorName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(invoice.totalValue)}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {invoice.vendorGSTIN}
                          </span>
                          <Badge variant="secondary">{invoice.invoiceType}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowViewDialog(invoice)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="breakdown" className="mt-4 space-y-4">
            {/* Tax Breakdown */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                Tax Breakdown
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Taxable Value</span>
                  <span className="font-medium">{formatCurrency(summary.totalTaxableValue)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">CGST</span>
                  <span className="font-medium">{formatCurrency(summary.totalCGST)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">SGST</span>
                  <span className="font-medium">{formatCurrency(summary.totalSGST)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">IGST</span>
                  <span className="font-medium">{formatCurrency(summary.totalIGST)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Cess</span>
                  <span className="font-medium">{formatCurrency(summary.totalCess)}</span>
                </div>
                <div className="flex justify-between py-2 bg-emerald-50 rounded-lg px-3">
                  <span className="font-semibold text-emerald-700">Total Input Tax Credit</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(summary.totalTax)}</span>
                </div>
              </div>
            </Card>

            {/* GSTR Summary */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">GSTR-3B Summary</h3>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">3.1 Output Tax Liability</span>
                  <span className="font-medium">{formatCurrency(summary.outputTaxLiability)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">4. Input Tax Credit (Eligible)</span>
                  <span className="font-medium text-emerald-600">-{formatCurrency(summary.inputTaxCredit)}</span>
                </div>
                <div className="flex justify-between py-2 bg-blue-50 rounded-lg px-3">
                  <span className="font-semibold text-blue-700">6. Net Tax Payable</span>
                  <span className="font-bold text-blue-700">{formatCurrency(summary.netTaxPayable)}</span>
                </div>
              </div>
            </Card>

            {/* Due Date Reminder */}
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">GSTR-3B Due Date</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    File your GSTR-3B for February 2026 by 20th March 2026 to avoid late fees.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Invoice Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add GST Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Number *</Label>
                <Input
                  value={newInvoice.invoiceNumber || ''}
                  onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                  placeholder="INV-2026-001"
                />
              </div>
              <div>
                <Label>Invoice Date *</Label>
                <Input
                  type="date"
                  value={newInvoice.invoiceDate || ''}
                  onChange={(e) => setNewInvoice({ ...newInvoice, invoiceDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Vendor Name *</Label>
              <Input
                value={newInvoice.vendorName || ''}
                onChange={(e) => setNewInvoice({ ...newInvoice, vendorName: e.target.value })}
                placeholder="Vendor Company Name"
              />
            </div>

            <div>
              <Label>Vendor GSTIN</Label>
              <Input
                value={newInvoice.vendorGSTIN || ''}
                onChange={(e) => setNewInvoice({ ...newInvoice, vendorGSTIN: e.target.value.toUpperCase() })}
                placeholder="29AABCT1234P1ZV"
                maxLength={15}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Type</Label>
                <Select
                  value={newInvoice.invoiceType}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, invoiceType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                    <SelectItem value="CDNR">Credit Note</SelectItem>
                    <SelectItem value="CDNUR">Debit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newInvoice.category}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Place of Supply</Label>
              <Select
                value={newInvoice.placeOfSupply}
                onValueChange={(value) => setNewInvoice({ ...newInvoice, placeOfSupply: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Taxable Value (₹) *</Label>
              <Input
                type="number"
                value={newInvoice.taxableValue || ''}
                onChange={(e) => setNewInvoice({ ...newInvoice, taxableValue: Number(e.target.value) })}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                GST @18% will be calculated automatically
              </p>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Input
                value={newInvoice.notes || ''}
                onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddInvoice}
              disabled={isSubmitting || !newInvoice.invoiceNumber || !newInvoice.vendorName || !newInvoice.taxableValue}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!showViewDialog} onOpenChange={() => setShowViewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>

          {showViewDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Invoice Number</Label>
                  <p className="font-medium">{showViewDialog.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Date</Label>
                  <p className="font-medium">
                    {new Date(showViewDialog.invoiceDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-gray-500">Vendor</Label>
                <p className="font-medium">{showViewDialog.vendorName}</p>
                <p className="text-sm text-gray-500">{showViewDialog.vendorGSTIN}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Taxable Value</Label>
                  <p className="font-medium">{formatCurrency(showViewDialog.taxableValue)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Total Value</Label>
                  <p className="font-medium">{formatCurrency(showViewDialog.totalValue)}</p>
                </div>
              </div>

              <Card className="p-3 bg-gray-50">
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <p className="text-gray-500">CGST</p>
                    <p className="font-medium">{formatCurrency(showViewDialog.cgst)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">SGST</p>
                    <p className="font-medium">{formatCurrency(showViewDialog.sgst)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">IGST</p>
                    <p className="font-medium">{formatCurrency(showViewDialog.igst)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Cess</p>
                    <p className="font-medium">{formatCurrency(showViewDialog.cess)}</p>
                  </div>
                </div>
              </Card>

              <div className="flex gap-2">
                <Badge variant="secondary">{showViewDialog.invoiceType}</Badge>
                <Badge variant="secondary">{showViewDialog.category}</Badge>
                {getStatusBadge(showViewDialog.status)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowViewDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
