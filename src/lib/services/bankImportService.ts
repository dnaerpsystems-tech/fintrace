/**
 * Bank Import Service - Tier-One Standards
 * Handles bank statement parsing, CSV import, column mapping,
 * and auto-categorization of transactions
 */

import { db } from '@/db';
import {
  generateId,
  TransactionType,
  type Transaction,
  type Category,
} from '@/types';
import { format, parse, isValid } from 'date-fns';
import { categorizeUPITransaction, detectUPIApp, parseUPIReference } from './upiCategorizationService';

// ==================== TYPES ====================

export interface BankStatementRow {
  date: string;
  description: string;
  debit?: number;
  credit?: number;
  amount?: number;
  balance?: number;
  reference?: string;
  [key: string]: string | number | undefined;
}

export interface ColumnMapping {
  date: string;
  description: string;
  debit?: string;
  credit?: string;
  amount?: string;
  balance?: string;
  reference?: string;
}

export interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName?: string;
  balance?: number;
  reference?: string;
  matchedRule?: string;
  isValid: boolean;
  errors: string[];
}

export interface BankImportResult {
  success: boolean;
  message: string;
  totalRows: number;
  imported: number;
  skipped: number;
  errors: string[];
  transactions: ParsedTransaction[];
}

export interface BankConfig {
  name: string;
  dateFormats: string[];
  columnMapping: ColumnMapping;
  amountFormat: 'separate' | 'combined'; // separate = debit/credit columns, combined = single amount
  amountSign?: 'negative_debit' | 'positive_credit'; // for combined format
  skipRows?: number; // header rows to skip
  encoding?: string;
}

export interface AutoCategorizeRule {
  id: string;
  name: string;
  patterns: string[];
  categoryId: string;
  priority: number;
  isSystem?: boolean;
}

// ==================== BANK CONFIGURATIONS ====================

export const BANK_CONFIGS: Record<string, BankConfig> = {
  hdfc: {
    name: 'HDFC Bank',
    dateFormats: ['dd/MM/yyyy', 'dd/MM/yy', 'dd-MM-yyyy'],
    columnMapping: {
      date: 'Date',
      description: 'Narration',
      debit: 'Withdrawal Amt.',
      credit: 'Deposit Amt.',
      balance: 'Closing Balance',
      reference: 'Chq./Ref.No.',
    },
    amountFormat: 'separate',
    skipRows: 0,
  },
  sbi: {
    name: 'State Bank of India',
    dateFormats: ['dd MMM yyyy', 'dd/MM/yyyy', 'dd-MM-yyyy'],
    columnMapping: {
      date: 'Txn Date',
      description: 'Description',
      debit: 'Debit',
      credit: 'Credit',
      balance: 'Balance',
      reference: 'Ref No./Cheque No.',
    },
    amountFormat: 'separate',
    skipRows: 0,
  },
  icici: {
    name: 'ICICI Bank',
    dateFormats: ['dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd'],
    columnMapping: {
      date: 'Transaction Date',
      description: 'Transaction Remarks',
      debit: 'Withdrawal Amount (INR )',
      credit: 'Deposit Amount (INR )',
      balance: 'Balance (INR )',
      reference: 'Transaction ID',
    },
    amountFormat: 'separate',
    skipRows: 0,
  },
  axis: {
    name: 'Axis Bank',
    dateFormats: ['dd-MM-yyyy', 'dd/MM/yyyy'],
    columnMapping: {
      date: 'Trans Date',
      description: 'Particulars',
      debit: 'Debit',
      credit: 'Credit',
      balance: 'Balance',
      reference: 'Chq No',
    },
    amountFormat: 'separate',
    skipRows: 0,
  },
  kotak: {
    name: 'Kotak Mahindra Bank',
    dateFormats: ['dd/MM/yyyy', 'dd-MM-yyyy'],
    columnMapping: {
      date: 'Date',
      description: 'Description',
      debit: 'Dr',
      credit: 'Cr',
      balance: 'Balance',
      reference: 'Ref No',
    },
    amountFormat: 'separate',
    skipRows: 0,
  },
  generic: {
    name: 'Generic CSV',
    dateFormats: ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'dd-MM-yyyy'],
    columnMapping: {
      date: 'date',
      description: 'description',
      amount: 'amount',
    },
    amountFormat: 'combined',
    amountSign: 'negative_debit',
    skipRows: 0,
  },
};

// ==================== AUTO-CATEGORIZATION RULES ====================

export const DEFAULT_CATEGORIZATION_RULES: AutoCategorizeRule[] = [
  // Salary & Income
  {
    id: 'salary',
    name: 'Salary',
    patterns: ['salary', 'payroll', 'stipend', 'wages'],
    categoryId: 'salary',
    priority: 10,
    isSystem: true,
  },
  {
    id: 'interest',
    name: 'Interest Income',
    patterns: ['interest credited', 'int.pd', 'int pd', 'interest paid'],
    categoryId: 'investment',
    priority: 9,
    isSystem: true,
  },
  {
    id: 'dividend',
    name: 'Dividend',
    patterns: ['dividend', 'div credit'],
    categoryId: 'investment',
    priority: 9,
    isSystem: true,
  },

  // Food & Dining
  {
    id: 'swiggy',
    name: 'Swiggy',
    patterns: ['swiggy', 'bundl tech'],
    categoryId: 'food',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'zomato',
    name: 'Zomato',
    patterns: ['zomato', 'zomato media'],
    categoryId: 'food',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    patterns: ['restaurant', 'cafe', 'food court', 'starbucks', 'mcdonald', 'kfc', 'pizza', 'dominos', 'burger'],
    categoryId: 'food',
    priority: 7,
    isSystem: true,
  },

  // Transport
  {
    id: 'uber',
    name: 'Uber',
    patterns: ['uber', 'uber india'],
    categoryId: 'transport',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'ola',
    name: 'Ola',
    patterns: ['ola', 'ani technologies'],
    categoryId: 'transport',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'fuel',
    name: 'Fuel',
    patterns: ['petrol', 'diesel', 'fuel', 'indian oil', 'hp petroleum', 'bharat petroleum', 'bpcl', 'iocl', 'hpcl'],
    categoryId: 'fuel',
    priority: 7,
    isSystem: true,
  },
  {
    id: 'metro',
    name: 'Metro',
    patterns: ['metro rail', 'dmrc', 'mmrc', 'bmrc'],
    categoryId: 'transport',
    priority: 7,
    isSystem: true,
  },

  // Shopping
  {
    id: 'amazon',
    name: 'Amazon',
    patterns: ['amazon', 'amzn', 'a]mn'],
    categoryId: 'shopping',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    patterns: ['flipkart', 'fk-'],
    categoryId: 'shopping',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'myntra',
    name: 'Myntra',
    patterns: ['myntra'],
    categoryId: 'shopping',
    priority: 8,
    isSystem: true,
  },

  // Utilities
  {
    id: 'electricity',
    name: 'Electricity',
    patterns: ['electricity', 'elec bill', 'bescom', 'tata power', 'adani electricity', 'msedcl', 'bses'],
    categoryId: 'utilities',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'mobile',
    name: 'Mobile Recharge',
    patterns: ['jio', 'airtel', 'vodafone', 'vi prepaid', 'bsnl', 'mobile recharge'],
    categoryId: 'utilities',
    priority: 7,
    isSystem: true,
  },
  {
    id: 'internet',
    name: 'Internet',
    patterns: ['broadband', 'wifi', 'act fibernet', 'hathway', 'airtel xstream'],
    categoryId: 'utilities',
    priority: 7,
    isSystem: true,
  },
  {
    id: 'gas',
    name: 'Gas',
    patterns: ['indane', 'bharatgas', 'hp gas', 'lpg', 'piped gas'],
    categoryId: 'utilities',
    priority: 7,
    isSystem: true,
  },

  // Entertainment
  {
    id: 'netflix',
    name: 'Netflix',
    patterns: ['netflix'],
    categoryId: 'entertainment',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    patterns: ['spotify'],
    categoryId: 'entertainment',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'hotstar',
    name: 'Disney+ Hotstar',
    patterns: ['hotstar', 'disney'],
    categoryId: 'entertainment',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'prime',
    name: 'Amazon Prime',
    patterns: ['prime video', 'prime membership'],
    categoryId: 'entertainment',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'movies',
    name: 'Movies',
    patterns: ['bookmyshow', 'pvr', 'inox', 'cinepolis', 'movie ticket'],
    categoryId: 'entertainment',
    priority: 7,
    isSystem: true,
  },

  // Health & Medical
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    patterns: ['pharmacy', 'pharma', 'apollo', 'medplus', 'netmeds', 'pharmeasy', '1mg'],
    categoryId: 'health',
    priority: 7,
    isSystem: true,
  },
  {
    id: 'hospital',
    name: 'Hospital',
    patterns: ['hospital', 'clinic', 'diagnostic', 'pathology', 'lab'],
    categoryId: 'health',
    priority: 6,
    isSystem: true,
  },

  // Housing
  {
    id: 'rent',
    name: 'Rent',
    patterns: ['rent', 'house rent', 'monthly rent'],
    categoryId: 'housing',
    priority: 8,
    isSystem: true,
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    patterns: ['maintenance', 'society', 'association'],
    categoryId: 'housing',
    priority: 7,
    isSystem: true,
  },

  // Education
  {
    id: 'school',
    name: 'School',
    patterns: ['school fee', 'tuition', 'academy', 'institute'],
    categoryId: 'education',
    priority: 7,
    isSystem: true,
  },
  {
    id: 'courses',
    name: 'Online Courses',
    patterns: ['udemy', 'coursera', 'skillshare', 'linkedin learning'],
    categoryId: 'education',
    priority: 7,
    isSystem: true,
  },

  // Insurance
  {
    id: 'insurance',
    name: 'Insurance',
    patterns: ['insurance', 'lic', 'hdfc life', 'icici pru', 'max life', 'sbi life', 'term plan', 'policy premium'],
    categoryId: 'insurance',
    priority: 8,
    isSystem: true,
  },

  // Investments
  {
    id: 'mutual_fund',
    name: 'Mutual Funds',
    patterns: ['mutual fund', 'mf purchase', 'sip', 'zerodha', 'groww', 'kuvera', 'paytm money'],
    categoryId: 'investment',
    priority: 7,
    isSystem: true,
  },
  {
    id: 'stocks',
    name: 'Stock Trading',
    patterns: ['nse', 'bse', 'stock', 'trading', 'share'],
    categoryId: 'investment',
    priority: 6,
    isSystem: true,
  },

  // Bank Charges
  {
    id: 'bank_charges',
    name: 'Bank Charges',
    patterns: ['annual fee', 'service charge', 'sms charges', 'debit card fee', 'credit card fee', 'bank charges'],
    categoryId: 'bank_fees',
    priority: 9,
    isSystem: true,
  },

  // ATM
  {
    id: 'atm',
    name: 'ATM Withdrawal',
    patterns: ['atm', 'cash withdrawal', 'cash wdl'],
    categoryId: 'atm',
    priority: 9,
    isSystem: true,
  },

  // Transfer
  {
    id: 'transfer',
    name: 'Transfer',
    patterns: ['neft', 'imps', 'rtgs', 'upi', 'transfer to', 'transfer from'],
    categoryId: 'transfer',
    priority: 5,
    isSystem: true,
  },
];

// ==================== CSV PARSING ====================

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvString: string, delimiter = ','): Record<string, string>[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  // Parse header
  const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim());

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() || '';
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Detect CSV delimiter
 */
export function detectDelimiter(csvString: string): string {
  const firstLine = csvString.split('\n')[0];
  const delimiters = [',', ';', '\t', '|'];

  let bestDelimiter = ',';
  let maxCount = 0;

  for (const delimiter of delimiters) {
    const count = firstLine.split(delimiter).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * Get column headers from CSV
 */
export function getCSVHeaders(csvString: string): string[] {
  const delimiter = detectDelimiter(csvString);
  const firstLine = csvString.split('\n')[0];
  return parseCSVLine(firstLine, delimiter).map(h => h.trim());
}

// ==================== DATE PARSING ====================

/**
 * Parse date with multiple format attempts
 */
export function parseDate(dateString: string, formats: string[]): Date | null {
  const cleaned = dateString.trim();

  for (const fmt of formats) {
    try {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      // Try next format
    }
  }

  // Try native Date parsing as fallback
  try {
    const parsed = new Date(cleaned);
    if (isValid(parsed)) {
      return parsed;
    }
  } catch {
    // Failed
  }

  return null;
}

// ==================== AMOUNT PARSING ====================

/**
 * Parse amount string to number (in paise)
 */
export function parseAmountString(amountStr: string | undefined | null): number {
  if (!amountStr || amountStr.trim() === '' || amountStr === '-') {
    return 0;
  }

  // Remove currency symbols and commas
  const cleaned = amountStr
    .replace(/[₹$€£¥,\s]/g, '')
    .replace(/^-+/, '-')
    .trim();

  if (!cleaned || cleaned === '-') {
    return 0;
  }

  const parsed = Number.parseFloat(cleaned);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  // Convert to paise (multiply by 100)
  return Math.round(parsed * 100);
}

// ==================== AUTO-CATEGORIZATION ====================

/**
 * Auto-categorize a transaction based on description
 * Enhanced with UPI transaction detection and categorization
 */
export function autoCategorize(
  description: string,
  type: TransactionType,
  customRules: AutoCategorizeRule[] = []
): { categoryId: string; ruleName?: string; upiApp?: string; merchant?: string } {
  const lowerDesc = description.toLowerCase();

  // Combine custom rules with defaults, prioritizing custom
  const allRules = [...customRules, ...DEFAULT_CATEGORIZATION_RULES]
    .sort((a, b) => b.priority - a.priority);

  // First, try pattern-based rules
  for (const rule of allRules) {
    for (const pattern of rule.patterns) {
      if (lowerDesc.includes(pattern.toLowerCase())) {
        return {
          categoryId: rule.categoryId,
          ruleName: rule.name,
        };
      }
    }
  }

  // Try UPI-specific categorization for better accuracy
  const upiRef = parseUPIReference(description);
  if (upiRef.upiId || lowerDesc.includes('upi') || lowerDesc.includes('@')) {
    const upiResult = categorizeUPITransaction({
      description,
      amount: 0,
      type: type === TransactionType.INCOME ? 'CREDIT' : 'DEBIT',
      upiId: upiRef.upiId,
    });

    // Only use UPI result if confidence is high enough
    if (upiResult.confidence >= 0.6) {
      // Map UPI category to our category IDs
      const categoryMap: Record<string, string> = {
        'Food & Dining': 'food',
        'Shopping': 'shopping',
        'Transportation': 'transport',
        'Entertainment': 'entertainment',
        'Utilities': 'utilities',
        'Healthcare': 'healthcare',
        'Insurance': 'insurance',
        'Investment': 'investment',
        'Education': 'education',
        'Transfer': 'transfer',
        'EMI': 'emi',
        'Groceries': 'groceries',
        'Travel': 'travel',
        'Housing': 'housing',
        'Salary': 'salary',
        'Interest': 'interest',
        'Cash': 'cash',
        'Bank Charges': 'bank_charges',
      };

      const categoryId = categoryMap[upiResult.category] ||
                         (type === TransactionType.INCOME ? 'other_income' : 'other');

      return {
        categoryId,
        ruleName: upiResult.merchant || upiResult.category,
        upiApp: upiRef.upiId ? detectUPIApp(upiRef.upiId) || undefined : undefined,
        merchant: upiResult.merchant,
      };
    }
  }

  // Default categories
  if (type === TransactionType.INCOME) {
    return { categoryId: 'other_income' };
  }
  return { categoryId: 'other' };
}

// ==================== BANK DETECTION ====================

/**
 * Detect bank from CSV headers
 */
export function detectBank(headers: string[]): string {
  const headerStr = headers.join(' ').toLowerCase();

  if (headerStr.includes('narration') && headerStr.includes('withdrawal amt')) {
    return 'hdfc';
  }
  if (headerStr.includes('txn date') && headerStr.includes('ref no')) {
    return 'sbi';
  }
  if (headerStr.includes('transaction remarks') && headerStr.includes('inr')) {
    return 'icici';
  }
  if (headerStr.includes('particulars') && headerStr.includes('trans date')) {
    return 'axis';
  }
  if (headerStr.includes('dr') && headerStr.includes('cr')) {
    return 'kotak';
  }

  return 'generic';
}

// ==================== MAIN IMPORT FUNCTION ====================

/**
 * Parse bank statement and return transactions
 */
export async function parseBankStatement(
  csvContent: string,
  bankId: string,
  accountId: string,
  customMapping?: Partial<ColumnMapping>,
  customRules?: AutoCategorizeRule[]
): Promise<BankImportResult> {
  const result: BankImportResult = {
    success: false,
    message: '',
    totalRows: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    transactions: [],
  };

  try {
    // Get bank config
    const bankConfig = BANK_CONFIGS[bankId] || BANK_CONFIGS.generic;

    // Parse CSV
    const delimiter = detectDelimiter(csvContent);
    const rows = parseCSV(csvContent, delimiter);
    result.totalRows = rows.length;

    if (rows.length === 0) {
      result.message = 'No data rows found in CSV';
      return result;
    }

    // Merge custom mapping with bank config
    const mapping: ColumnMapping = {
      ...bankConfig.columnMapping,
      ...customMapping,
    };

    // Get categories for name lookup
    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    // Parse each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors: string[] = [];

      // Parse date
      const dateValue = row[mapping.date] || '';
      const parsedDate = parseDate(dateValue, bankConfig.dateFormats);

      if (!parsedDate) {
        errors.push(`Invalid date: "${dateValue}"`);
      }

      // Parse description
      const description = (row[mapping.description] || '').trim();
      if (!description) {
        errors.push('Missing description');
      }

      // Parse amount
      let amount = 0;
      let type = TransactionType.EXPENSE;

      if (bankConfig.amountFormat === 'separate') {
        const debit = parseAmountString(row[mapping.debit || '']);
        const credit = parseAmountString(row[mapping.credit || '']);

        if (credit > 0) {
          amount = credit;
          type = TransactionType.INCOME;
        } else if (debit > 0) {
          amount = debit;
          type = TransactionType.EXPENSE;
        } else {
          errors.push('No amount found');
        }
      } else {
        // Combined amount format
        const amountValue = parseAmountString(row[mapping.amount || '']);

        if (amountValue === 0) {
          errors.push('No amount found');
        } else if (bankConfig.amountSign === 'negative_debit') {
          if (amountValue < 0) {
            amount = Math.abs(amountValue);
            type = TransactionType.EXPENSE;
          } else {
            amount = amountValue;
            type = TransactionType.INCOME;
          }
        } else {
          amount = Math.abs(amountValue);
          type = amountValue >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
        }
      }

      // Skip zero amount transactions
      if (amount === 0 && errors.length === 0) {
        result.skipped++;
        continue;
      }

      // Auto-categorize
      const { categoryId, ruleName } = autoCategorize(description, type, customRules);

      // Parse optional fields
      const balance = parseAmountString(row[mapping.balance || '']);
      const reference = (row[mapping.reference || ''] || '').trim();

      // Create parsed transaction
      const transaction: ParsedTransaction = {
        id: generateId(),
        date: parsedDate ? format(parsedDate, 'yyyy-MM-dd') : '',
        description,
        amount,
        type,
        categoryId,
        categoryName: categoryMap.get(categoryId),
        balance: balance || undefined,
        reference: reference || undefined,
        matchedRule: ruleName,
        isValid: errors.length === 0,
        errors,
      };

      result.transactions.push(transaction);

      if (errors.length > 0) {
        result.errors.push(`Row ${i + 2}: ${errors.join(', ')}`);
      }
    }

    // Count valid transactions
    const validCount = result.transactions.filter(t => t.isValid).length;
    result.imported = validCount;
    result.skipped = result.totalRows - validCount;
    result.success = validCount > 0;
    result.message = `Parsed ${validCount} of ${result.totalRows} transactions`;

    return result;
  } catch (error) {
    result.message = error instanceof Error ? error.message : 'Failed to parse CSV';
    result.errors.push(result.message);
    return result;
  }
}

/**
 * Import parsed transactions to database
 */
export async function importTransactions(
  transactions: ParsedTransaction[],
  accountId: string,
  userId: string,
  skipDuplicates = true
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const result = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Get existing transactions for duplicate detection
  let existingDescriptions: Set<string> = new Set();

  if (skipDuplicates) {
    const existing = await db.transactions
      .where({ userId, accountId })
      .toArray();

    existingDescriptions = new Set(
      existing.map(t => `${t.date}-${t.description}-${t.amount}`)
    );
  }

  const now = new Date().toISOString();
  const transactionsToAdd: Transaction[] = [];

  for (const parsed of transactions) {
    if (!parsed.isValid) {
      result.skipped++;
      continue;
    }

    // Check for duplicates
    const key = `${parsed.date}-${parsed.description}-${parsed.amount}`;
    if (skipDuplicates && existingDescriptions.has(key)) {
      result.skipped++;
      continue;
    }

    const transaction: Transaction = {
      id: parsed.id,
      userId,
      type: parsed.type,
      amount: parsed.amount,
      currency: 'INR',
      accountId,
      categoryId: parsed.categoryId,
      description: parsed.description,
      date: parsed.date,
      tagIds: [],
      attachments: [],
      isRecurring: false,
      isFamilyTransaction: false,
      isPending: false,
      isExcludedFromStats: parsed.type === TransactionType.TRANSFER,
      notes: parsed.reference ? `Ref: ${parsed.reference}` : undefined,
      createdAt: now,
      updatedAt: now,
    };

    transactionsToAdd.push(transaction);
    existingDescriptions.add(key);
  }

  // Bulk add transactions
  if (transactionsToAdd.length > 0) {
    try {
      await db.transactions.bulkAdd(transactionsToAdd);
      result.imported = transactionsToAdd.length;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Failed to import transactions');
    }
  }

  return result;
}

// ==================== CUSTOM RULES MANAGEMENT ====================

const CUSTOM_RULES_KEY = 'fintrace_categorization_rules';

/**
 * Get custom categorization rules
 */
export function getCustomRules(): AutoCategorizeRule[] {
  try {
    const stored = localStorage.getItem(CUSTOM_RULES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save custom categorization rules
 */
export function saveCustomRules(rules: AutoCategorizeRule[]): void {
  localStorage.setItem(CUSTOM_RULES_KEY, JSON.stringify(rules));
}

/**
 * Add a custom categorization rule
 */
export function addCustomRule(rule: Omit<AutoCategorizeRule, 'id'>): AutoCategorizeRule {
  const rules = getCustomRules();
  const newRule: AutoCategorizeRule = {
    ...rule,
    id: generateId(),
    isSystem: false,
  };
  rules.push(newRule);
  saveCustomRules(rules);
  return newRule;
}

/**
 * Delete a custom categorization rule
 */
export function deleteCustomRule(ruleId: string): void {
  const rules = getCustomRules().filter(r => r.id !== ruleId);
  saveCustomRules(rules);
}

// ==================== EXPORTS ====================

export const bankImportService = {
  parseCSV,
  getCSVHeaders,
  detectDelimiter,
  detectBank,
  parseDate,
  parseAmountString,
  autoCategorize,
  parseBankStatement,
  importTransactions,
  getCustomRules,
  saveCustomRules,
  addCustomRule,
  deleteCustomRule,
  BANK_CONFIGS,
  DEFAULT_CATEGORIZATION_RULES,
};

export default bankImportService;
