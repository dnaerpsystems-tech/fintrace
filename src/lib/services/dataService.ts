/**
 * Data Service - Import/Export Functionality
 * Handles backup, restore, and data migration
 * Tier-One Standards: Validation, error handling, data integrity
 */

import { db } from '@/db';
import type {
  Account,
  Transaction,
  Budget,
  Goal,
  GoalContribution,
  Loan,
  EMIPayment,
  Investment,
  InvestmentTransaction,
  Category,
} from '@/types';
import { format } from 'date-fns';

// ==================== TYPES ====================

export interface ExportData {
  version: string;
  exportedAt: string;
  userId: string;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  goalContributions: GoalContribution[];
  loans: Loan[];
  emiPayments: EMIPayment[];
  investments: Investment[];
  investmentTransactions: InvestmentTransaction[];
  categories: Category[];
}

export interface ExportOptions {
  includeAccounts?: boolean;
  includeTransactions?: boolean;
  includeBudgets?: boolean;
  includeGoals?: boolean;
  includeLoans?: boolean;
  includeInvestments?: boolean;
  includeCategories?: boolean;
  dateRange?: { start: Date; end: Date };
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    accounts: number;
    transactions: number;
    budgets: number;
    goals: number;
    loans: number;
    investments: number;
  };
  errors: string[];
}

export interface CSVExportOptions {
  type: 'transactions' | 'accounts' | 'investments';
  dateRange?: { start: Date; end: Date };
}

// ==================== CONSTANTS ====================

const EXPORT_VERSION = '1.0.0';
const DEFAULT_USER_ID = 'default-user';

// ==================== VALIDATION ====================

/**
 * Validate export data structure
 */
function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'string') return false;
  if (typeof obj.exportedAt !== 'string') return false;
  if (!Array.isArray(obj.accounts)) return false;
  if (!Array.isArray(obj.transactions)) return false;

  return true;
}

/**
 * Validate account data
 */
function validateAccountData(account: unknown): boolean {
  if (!account || typeof account !== 'object') return false;

  const obj = account as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.balance === 'number'
  );
}

/**
 * Validate transaction data
 */
function validateTransactionData(transaction: unknown): boolean {
  if (!transaction || typeof transaction !== 'object') return false;

  const obj = transaction as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.amount === 'number' &&
    typeof obj.accountId === 'string' &&
    typeof obj.categoryId === 'string'
  );
}

// ==================== EXPORT FUNCTIONS ====================

/**
 * Export all data to JSON
 */
export async function exportToJSON(
  options: ExportOptions = {}
): Promise<ExportData> {
  const {
    includeAccounts = true,
    includeTransactions = true,
    includeBudgets = true,
    includeGoals = true,
    includeLoans = true,
    includeInvestments = true,
    includeCategories = true,
    dateRange,
  } = options;

  const exportData: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    userId: DEFAULT_USER_ID,
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    goalContributions: [],
    loans: [],
    emiPayments: [],
    investments: [],
    investmentTransactions: [],
    categories: [],
  };

  // Export accounts
  if (includeAccounts) {
    exportData.accounts = await db.accounts
      .where({ userId: DEFAULT_USER_ID })
      .toArray();
  }

  // Export transactions
  if (includeTransactions) {
    let transactions = await db.transactions
      .where({ userId: DEFAULT_USER_ID })
      .toArray();

    // Filter by date range if specified
    if (dateRange) {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');
      transactions = transactions.filter(
        t => t.date >= startStr && t.date <= endStr
      );
    }

    exportData.transactions = transactions;
  }

  // Export budgets
  if (includeBudgets) {
    exportData.budgets = await db.budgets
      .where({ userId: DEFAULT_USER_ID })
      .toArray();
  }

  // Export goals
  if (includeGoals) {
    exportData.goals = await db.goals
      .where({ userId: DEFAULT_USER_ID })
      .toArray();

    exportData.goalContributions = await db.goalContributions
      .where({ userId: DEFAULT_USER_ID })
      .toArray();
  }

  // Export loans
  if (includeLoans) {
    exportData.loans = await db.loans
      .where({ userId: DEFAULT_USER_ID })
      .toArray();

    exportData.emiPayments = await db.emiPayments
      .where({ userId: DEFAULT_USER_ID })
      .toArray();
  }

  // Export investments
  if (includeInvestments) {
    exportData.investments = await db.investments
      .where({ userId: DEFAULT_USER_ID })
      .toArray();

    exportData.investmentTransactions = await db.investmentTransactions
      .where({ userId: DEFAULT_USER_ID })
      .toArray();
  }

  // Export categories
  if (includeCategories) {
    exportData.categories = await db.categories.toArray();
  }

  return exportData;
}

/**
 * Download export as JSON file
 */
export async function downloadAsJSON(
  options: ExportOptions = {}
): Promise<void> {
  const data = await exportToJSON(options);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const filename = `fintrace-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;

  downloadBlob(blob, filename);
}

/**
 * Export transactions to CSV
 */
export async function exportToCSV(
  options: CSVExportOptions
): Promise<string> {
  let csv = '';

  if (options.type === 'transactions') {
    let transactions = await db.transactions
      .where({ userId: DEFAULT_USER_ID })
      .toArray();

    // Filter by date range
    if (options.dateRange) {
      const startStr = format(options.dateRange.start, 'yyyy-MM-dd');
      const endStr = format(options.dateRange.end, 'yyyy-MM-dd');
      transactions = transactions.filter(
        t => t.date >= startStr && t.date <= endStr
      );
    }

    // Get categories for mapping
    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    // Get accounts for mapping
    const accounts = await db.accounts.toArray();
    const accountMap = new Map(accounts.map(a => [a.id, a.name]));

    // CSV Header
    csv = 'Date,Type,Description,Category,Account,Amount (₹),Notes\n';

    // CSV Rows
    for (const t of transactions.sort((a, b) => b.date.localeCompare(a.date))) {
      const row = [
        t.date,
        t.type,
        escapeCsvField(t.description),
        categoryMap.get(t.categoryId) || 'Unknown',
        accountMap.get(t.accountId) || 'Unknown',
        (t.amount / 100).toFixed(2),
        escapeCsvField(t.notes || ''),
      ];
      csv += row.join(',') + '\n';
    }
  } else if (options.type === 'accounts') {
    const accounts = await db.accounts
      .where({ userId: DEFAULT_USER_ID })
      .toArray();

    csv = 'Name,Type,Balance (₹),Bank Name,Include in Total,Created At\n';

    for (const a of accounts) {
      const row = [
        escapeCsvField(a.name),
        a.type,
        (a.balance / 100).toFixed(2),
        escapeCsvField(a.bankName || ''),
        a.includeInTotal ? 'Yes' : 'No',
        a.createdAt,
      ];
      csv += row.join(',') + '\n';
    }
  } else if (options.type === 'investments') {
    const investments = await db.investments
      .where({ userId: DEFAULT_USER_ID })
      .toArray();

    csv = 'Name,Type,Symbol,Quantity,Avg Buy Price (₹),Current Price (₹),Invested (₹),Current Value (₹),Return (%)\n';

    for (const inv of investments) {
      const returnPct = inv.investedAmount > 0
        ? ((inv.currentValue - inv.investedAmount) / inv.investedAmount) * 100
        : 0;

      const row = [
        escapeCsvField(inv.name),
        inv.type,
        inv.symbol || '',
        inv.quantity.toString(),
        (inv.avgBuyPrice / 100).toFixed(2),
        (inv.currentPrice / 100).toFixed(2),
        (inv.investedAmount / 100).toFixed(2),
        (inv.currentValue / 100).toFixed(2),
        returnPct.toFixed(2),
      ];
      csv += row.join(',') + '\n';
    }
  }

  return csv;
}

/**
 * Download CSV file
 */
export async function downloadAsCSV(
  options: CSVExportOptions
): Promise<void> {
  const csv = await exportToCSV(options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  const filename = `fintrace-${options.type}-${format(new Date(), 'yyyy-MM-dd')}.csv`;

  downloadBlob(blob, filename);
}

// ==================== IMPORT FUNCTIONS ====================

/**
 * Import data from JSON
 */
export async function importFromJSON(
  jsonData: string | ExportData,
  options: { merge?: boolean; replace?: boolean } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    message: '',
    imported: {
      accounts: 0,
      transactions: 0,
      budgets: 0,
      goals: 0,
      loans: 0,
      investments: 0,
    },
    errors: [],
  };

  try {
    // Parse JSON if string
    const data: ExportData = typeof jsonData === 'string'
      ? JSON.parse(jsonData)
      : jsonData;

    // Validate structure
    if (!validateExportData(data)) {
      result.message = 'Invalid export data format';
      return result;
    }

    // Clear existing data if replacing
    if (options.replace) {
      await db.transaction('rw', [
        db.accounts,
        db.transactions,
        db.budgets,
        db.goals,
        db.goalContributions,
        db.loans,
        db.emiPayments,
        db.investments,
        db.investmentTransactions,
      ], async () => {
        await db.accounts.where({ userId: DEFAULT_USER_ID }).delete();
        await db.transactions.where({ userId: DEFAULT_USER_ID }).delete();
        await db.budgets.where({ userId: DEFAULT_USER_ID }).delete();
        await db.goals.where({ userId: DEFAULT_USER_ID }).delete();
        await db.goalContributions.where({ userId: DEFAULT_USER_ID }).delete();
        await db.loans.where({ userId: DEFAULT_USER_ID }).delete();
        await db.emiPayments.where({ userId: DEFAULT_USER_ID }).delete();
        await db.investments.where({ userId: DEFAULT_USER_ID }).delete();
        await db.investmentTransactions.where({ userId: DEFAULT_USER_ID }).delete();
      });
    }

    // Import accounts
    if (data.accounts?.length) {
      for (const account of data.accounts) {
        if (validateAccountData(account)) {
          try {
            await db.accounts.put({
              ...account,
              userId: DEFAULT_USER_ID,
            });
            result.imported.accounts++;
          } catch (error) {
            result.errors.push(`Account "${account.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    // Import transactions
    if (data.transactions?.length) {
      for (const transaction of data.transactions) {
        if (validateTransactionData(transaction)) {
          try {
            await db.transactions.put({
              ...transaction,
              userId: DEFAULT_USER_ID,
            });
            result.imported.transactions++;
          } catch (error) {
            result.errors.push(`Transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    // Import budgets
    if (data.budgets?.length) {
      for (const budget of data.budgets) {
        try {
          await db.budgets.put({
            ...budget,
            userId: DEFAULT_USER_ID,
          });
          result.imported.budgets++;
        } catch (error) {
          result.errors.push(`Budget "${budget.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Import goals
    if (data.goals?.length) {
      for (const goal of data.goals) {
        try {
          await db.goals.put({
            ...goal,
            userId: DEFAULT_USER_ID,
          });
          result.imported.goals++;
        } catch (error) {
          result.errors.push(`Goal "${goal.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Import goal contributions
    if (data.goalContributions?.length) {
      for (const contribution of data.goalContributions) {
        try {
          await db.goalContributions.put({
            ...contribution,
            userId: DEFAULT_USER_ID,
          });
        } catch {
          // Silent fail for contributions
        }
      }
    }

    // Import loans
    if (data.loans?.length) {
      for (const loan of data.loans) {
        try {
          await db.loans.put({
            ...loan,
            userId: DEFAULT_USER_ID,
          });
          result.imported.loans++;
        } catch (error) {
          result.errors.push(`Loan "${loan.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Import loan payments
    if (data.emiPayments?.length) {
      for (const payment of data.emiPayments) {
        try {
          await db.emiPayments.put({
            ...payment,
            userId: DEFAULT_USER_ID,
          });
        } catch {
          // Silent fail for payments
        }
      }
    }

    // Import investments
    if (data.investments?.length) {
      for (const investment of data.investments) {
        try {
          await db.investments.put({
            ...investment,
            userId: DEFAULT_USER_ID,
          });
          result.imported.investments++;
        } catch (error) {
          result.errors.push(`Investment "${investment.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Import investment transactions
    if (data.investmentTransactions?.length) {
      for (const transaction of data.investmentTransactions) {
        try {
          await db.investmentTransactions.put({
            ...transaction,
            userId: DEFAULT_USER_ID,
          });
        } catch {
          // Silent fail
        }
      }
    }

    result.success = true;
    result.message = `Successfully imported data: ${result.imported.accounts} accounts, ${result.imported.transactions} transactions`;

    return result;
  } catch (error) {
    result.message = error instanceof Error ? error.message : 'Import failed';
    return result;
  }
}

/**
 * Import from file input
 */
export async function importFromFile(
  file: File,
  options: { merge?: boolean; replace?: boolean } = {}
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const result = await importFromJSON(content, options);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to read file',
          imported: { accounts: 0, transactions: 0, budgets: 0, goals: 0, loans: 0, investments: 0 },
          errors: [],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        message: 'Failed to read file',
        imported: { accounts: 0, transactions: 0, budgets: 0, goals: 0, loans: 0, investments: 0 },
        errors: [],
      });
    };

    reader.readAsText(file);
  });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV field
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  accounts: number;
  transactions: number;
  budgets: number;
  goals: number;
  loans: number;
  investments: number;
  categories: number;
  totalRecords: number;
}> {
  const [accounts, transactions, budgets, goals, loans, investments, categories] = await Promise.all([
    db.accounts.where({ userId: DEFAULT_USER_ID }).count(),
    db.transactions.where({ userId: DEFAULT_USER_ID }).count(),
    db.budgets.where({ userId: DEFAULT_USER_ID }).count(),
    db.goals.where({ userId: DEFAULT_USER_ID }).count(),
    db.loans.where({ userId: DEFAULT_USER_ID }).count(),
    db.investments.where({ userId: DEFAULT_USER_ID }).count(),
    db.categories.count(),
  ]);

  return {
    accounts,
    transactions,
    budgets,
    goals,
    loans,
    investments,
    categories,
    totalRecords: accounts + transactions + budgets + goals + loans + investments,
  };
}

// ==================== EXPORTS ====================

export const dataService = {
  exportToJSON,
  downloadAsJSON,
  exportToCSV,
  downloadAsCSV,
  importFromJSON,
  importFromFile,
  getStorageStats,
};

export default dataService;
