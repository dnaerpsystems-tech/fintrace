/**
 * Export Service
 * Handles PDF and Excel export functionality
 * With Indian number formatting (Lakh/Crore)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatDate } from '@/lib/formatters/date';
import type { Transaction, Account, Category } from '@/types';

// ============================================
// Types
// ============================================

export interface ExportOptions {
  title: string;
  subtitle?: string;
  dateRange?: { start: Date; end: Date };
  format: 'pdf' | 'excel';
}

export interface TransactionExportData {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

export interface ReportExportData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  accountBalances: Array<{
    account: string;
    type: string;
    balance: number;
  }>;
  topExpenses: Array<{
    description: string;
    amount: number;
    date: string;
    category: string;
  }>;
}

export interface TaxReportData {
  section80C: {
    ppf: number;
    elss: number;
    lifeInsurance: number;
    homeLoanPrincipal: number;
    tuitionFees: number;
    nsc: number;
    sukanyaSamriddhi: number;
    other: number;
    total: number;
    limit: number;
  };
  section80D: {
    selfPremium: number;
    parentsPremium: number;
    preventiveCheckup: number;
    total: number;
    limit: number;
  };
  section24b: {
    homeLoanInterest: number;
    limit: number;
  };
  section80E: {
    educationLoanInterest: number;
  };
  section80TTA: {
    savingsInterest: number;
    limit: number;
  };
  hra: {
    basicSalary: number;
    hraReceived: number;
    rentPaid: number;
    isMetro: boolean;
    exemption: number;
  };
  tdsDeducted: number;
  totalDeductions: number;
}

// ============================================
// Helper Functions
// ============================================

export function formatIndianCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  let formatted: string;

  if (absAmount >= 10000000) {
    formatted = '\u20B9' + (absAmount / 10000000).toFixed(2) + ' Cr';
  } else if (absAmount >= 100000) {
    formatted = '\u20B9' + (absAmount / 100000).toFixed(2) + ' L';
  } else {
    formatted = '\u20B9' + absAmount.toLocaleString('en-IN');
  }

  return amount < 0 ? '-' + formatted : formatted;
}

function getCategoryName(categoryId: string | undefined, categories: Category[]): string {
  if (!categoryId) return 'Uncategorized';
  const category = categories.find(c => c.id === categoryId);
  return category?.name || 'Uncategorized';
}

function getAccountName(accountId: string | undefined, accounts: Account[]): string {
  if (!accountId) return 'Unknown';
  const account = accounts.find(a => a.id === accountId);
  return account?.name || 'Unknown';
}

// ============================================
// PDF Export Functions
// ============================================

export async function exportTransactionsToPDF(
  data: TransactionExportData,
  options: ExportOptions
): Promise<void> {
  const doc = new jsPDF();
  const { transactions, accounts, categories } = data;

  doc.setFontSize(20);
  doc.setTextColor(16, 185, 129);
  doc.text(options.title, 14, 20);

  if (options.subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(options.subtitle, 14, 28);
  }

  if (options.dateRange) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(
      'Period: ' + formatDate(options.dateRange.start) + ' to ' + formatDate(options.dateRange.end),
      14, 35
    );
  }

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('Total Income: ' + formatIndianCurrency(income), 14, 45);
  doc.text('Total Expense: ' + formatIndianCurrency(expense), 14, 52);
  doc.text('Net: ' + formatIndianCurrency(income - expense), 14, 59);

  const tableData = transactions.map(t => [
    formatDate(new Date(t.date)),
    t.description || '-',
    getCategoryName(t.categoryId, categories),
    getAccountName(t.accountId, accounts),
    t.type.charAt(0).toUpperCase() + t.type.slice(1),
    formatIndianCurrency(t.amount)
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['Date', 'Description', 'Category', 'Account', 'Type', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 45 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20 },
      5: { cellWidth: 30, halign: 'right' }
    }
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      'Generated by FinTrace on ' + formatDate(new Date()) + ' | Page ' + i + ' of ' + pageCount,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(options.title.replace(/\s+/g, '_') + '_' + formatDate(new Date()) + '.pdf');
}

export async function exportReportToPDF(
  data: ReportExportData,
  options: ExportOptions
): Promise<void> {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129);
  doc.text(options.title, 14, 20);

  if (options.subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(options.subtitle, 14, 28);
  }

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Financial Summary', 14, 45);

  doc.setFontSize(11);
  const summaryY = 55;
  doc.text('Total Income:', 14, summaryY);
  doc.setTextColor(34, 197, 94);
  doc.text(formatIndianCurrency(data.summary.totalIncome), 60, summaryY);

  doc.setTextColor(0);
  doc.text('Total Expense:', 14, summaryY + 8);
  doc.setTextColor(239, 68, 68);
  doc.text(formatIndianCurrency(data.summary.totalExpense), 60, summaryY + 8);

  doc.setTextColor(0);
  doc.text('Net Savings:', 14, summaryY + 16);
  doc.text(formatIndianCurrency(data.summary.netSavings), 60, summaryY + 16);

  doc.setTextColor(0);
  doc.text('Savings Rate:', 14, summaryY + 24);
  doc.text(data.summary.savingsRate.toFixed(1) + '%', 60, summaryY + 24);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Spending by Category', 14, summaryY + 40);

  autoTable(doc, {
    startY: summaryY + 48,
    head: [['Category', 'Amount', 'Percentage', 'Transactions']],
    body: data.categoryBreakdown.map(c => [
      c.category,
      formatIndianCurrency(c.amount),
      c.percentage.toFixed(1) + '%',
      c.count.toString()
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    styles: { fontSize: 10 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Account Balances', 14, finalY);

  autoTable(doc, {
    startY: finalY + 8,
    head: [['Account', 'Type', 'Balance']],
    body: data.accountBalances.map(a => [
      a.account,
      a.type,
      formatIndianCurrency(a.balance)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 10 }
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      'Generated by FinTrace on ' + formatDate(new Date()) + ' | Page ' + i + ' of ' + pageCount,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(options.title.replace(/\s+/g, '_') + '_' + formatDate(new Date()) + '.pdf');
}

export async function exportTaxReportToPDF(
  data: TaxReportData,
  financialYear: string
): Promise<void> {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129);
  doc.text('Tax Deduction Summary', 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text('Financial Year: ' + financialYear, 14, 28);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Section 80C Investments (Limit: Rs.1,50,000)', 14, 45);

  const section80CData = [
    ['PPF Contribution', formatIndianCurrency(data.section80C.ppf)],
    ['ELSS Mutual Funds', formatIndianCurrency(data.section80C.elss)],
    ['Life Insurance Premium', formatIndianCurrency(data.section80C.lifeInsurance)],
    ['Home Loan Principal', formatIndianCurrency(data.section80C.homeLoanPrincipal)],
    ['Children Tuition Fees', formatIndianCurrency(data.section80C.tuitionFees)],
    ['NSC', formatIndianCurrency(data.section80C.nsc)],
    ['Sukanya Samriddhi', formatIndianCurrency(data.section80C.sukanyaSamriddhi)],
    ['Other 80C', formatIndianCurrency(data.section80C.other)],
    ['TOTAL', formatIndianCurrency(Math.min(data.section80C.total, data.section80C.limit))]
  ];

  autoTable(doc, {
    startY: 52,
    body: section80CData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right', cellWidth: 50 } }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text('Section 80D Health Insurance', 14, currentY);

  const section80DData = [
    ['Self & Family Premium', formatIndianCurrency(data.section80D.selfPremium)],
    ['Parents Premium', formatIndianCurrency(data.section80D.parentsPremium)],
    ['Preventive Checkup', formatIndianCurrency(data.section80D.preventiveCheckup)],
    ['TOTAL', formatIndianCurrency(Math.min(data.section80D.total, data.section80D.limit))]
  ];

  autoTable(doc, {
    startY: currentY + 7,
    body: section80DData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right', cellWidth: 50 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text('Section 24(b) Home Loan Interest', 14, currentY);

  autoTable(doc, {
    startY: currentY + 7,
    body: [
      ['Home Loan Interest', formatIndianCurrency(data.section24b.homeLoanInterest)],
      ['Eligible (Max Rs.2L)', formatIndianCurrency(Math.min(data.section24b.homeLoanInterest, data.section24b.limit))]
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right', cellWidth: 50 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129);
  doc.text('Total Deductions: ' + formatIndianCurrency(data.totalDeductions), 14, currentY);

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    'Generated by FinTrace | This is for reference only. Consult a CA for tax filing.',
    14,
    doc.internal.pageSize.height - 10
  );

  doc.save('Tax_Report_' + financialYear.replace(/\s+/g, '_') + '.pdf');
}

// ============================================
// Excel Export Functions
// ============================================

export async function exportTransactionsToExcel(
  data: TransactionExportData,
  options: ExportOptions
): Promise<void> {
  const { transactions, accounts, categories } = data;

  const excelData = transactions.map(t => ({
    'Date': formatDate(new Date(t.date)),
    'Description': t.description || '-',
    'Category': getCategoryName(t.categoryId, categories),
    'Account': getAccountName(t.accountId, accounts),
    'Type': t.type.charAt(0).toUpperCase() + t.type.slice(1),
    'Amount': t.amount,
    'Note': t.notes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  ws['!cols'] = [
    { wch: 12 },
    { wch: 35 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const summaryData = [
    { 'Metric': 'Total Income', 'Value': income },
    { 'Metric': 'Total Expense', 'Value': expense },
    { 'Metric': 'Net Savings', 'Value': income - expense },
    { 'Metric': 'Total Transactions', 'Value': transactions.length }
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, options.title.replace(/\s+/g, '_') + '_' + formatDate(new Date()) + '.xlsx');
}

export async function exportReportToExcel(
  data: ReportExportData,
  options: ExportOptions
): Promise<void> {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    { 'Metric': 'Total Income', 'Amount': data.summary.totalIncome },
    { 'Metric': 'Total Expense', 'Amount': data.summary.totalExpense },
    { 'Metric': 'Net Savings', 'Amount': data.summary.netSavings },
    { 'Metric': 'Savings Rate', 'Amount': data.summary.savingsRate.toFixed(1) + '%' }
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const categoryData = data.categoryBreakdown.map(c => ({
    'Category': c.category,
    'Amount': c.amount,
    'Percentage': c.percentage.toFixed(1) + '%',
    'Transactions': c.count
  }));
  const categoryWs = XLSX.utils.json_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(wb, categoryWs, 'Categories');

  const accountData = data.accountBalances.map(a => ({
    'Account': a.account,
    'Type': a.type,
    'Balance': a.balance
  }));
  const accountWs = XLSX.utils.json_to_sheet(accountData);
  XLSX.utils.book_append_sheet(wb, accountWs, 'Accounts');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, options.title.replace(/\s+/g, '_') + '_' + formatDate(new Date()) + '.xlsx');
}

export async function exportTaxReportToExcel(
  data: TaxReportData,
  financialYear: string
): Promise<void> {
  const wb = XLSX.utils.book_new();

  const section80CData = [
    { 'Investment': 'PPF', 'Amount': data.section80C.ppf },
    { 'Investment': 'ELSS', 'Amount': data.section80C.elss },
    { 'Investment': 'Life Insurance', 'Amount': data.section80C.lifeInsurance },
    { 'Investment': 'Home Loan Principal', 'Amount': data.section80C.homeLoanPrincipal },
    { 'Investment': 'Tuition Fees', 'Amount': data.section80C.tuitionFees },
    { 'Investment': 'NSC', 'Amount': data.section80C.nsc },
    { 'Investment': 'Sukanya Samriddhi', 'Amount': data.section80C.sukanyaSamriddhi },
    { 'Investment': 'Other', 'Amount': data.section80C.other },
    { 'Investment': 'TOTAL', 'Amount': data.section80C.total },
    { 'Investment': 'Eligible (Max 1.5L)', 'Amount': Math.min(data.section80C.total, 150000) }
  ];
  const ws80C = XLSX.utils.json_to_sheet(section80CData);
  XLSX.utils.book_append_sheet(wb, ws80C, 'Section 80C');

  const section80DData = [
    { 'Type': 'Self Premium', 'Amount': data.section80D.selfPremium },
    { 'Type': 'Parents Premium', 'Amount': data.section80D.parentsPremium },
    { 'Type': 'Checkup', 'Amount': data.section80D.preventiveCheckup },
    { 'Type': 'TOTAL', 'Amount': data.section80D.total }
  ];
  const ws80D = XLSX.utils.json_to_sheet(section80DData);
  XLSX.utils.book_append_sheet(wb, ws80D, 'Section 80D');

  const summaryData = [
    { 'Description': 'Total Deductions', 'Amount': data.totalDeductions },
    { 'Description': 'TDS Deducted', 'Amount': data.tdsDeducted }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'Tax_Report_' + financialYear.replace(/\s+/g, '_') + '.xlsx');
}

export const exportService = {
  exportTransactionsToPDF,
  exportTransactionsToExcel,
  exportReportToPDF,
  exportReportToExcel,
  exportTaxReportToPDF,
  exportTaxReportToExcel,
  formatIndianCurrency
};
