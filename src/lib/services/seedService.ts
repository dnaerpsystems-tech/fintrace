/**
 * Seed Service - Demo Data Generation
 * Creates realistic sample data for new users to explore the app
 * Tier-One Standards: Pure functions, validation, comprehensive coverage
 */

import { db } from '@/db';
import {
  generateId,
  AccountType,
  TransactionType,
  LoanType,
  LoanStatus,
  GoalStatus,
  type Account,
  type Transaction,
  type Budget,
  type Goal,
  type Loan,
  type Investment,
} from '@/types';
import { format, subDays, subMonths, addMonths } from 'date-fns';
import { calculateEMI } from '@/lib/calculations/loan';

// ==================== CONSTANTS ====================

const DEFAULT_USER_ID = 'default-user';

// Demo accounts configuration
const DEMO_ACCOUNTS: Array<{
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  bankName?: string;
}> = [
  {
    name: 'HDFC Savings',
    type: AccountType.BANK,
    balance: 8542800, // ₹85,428 in paise
    color: '#3B82F6',
    icon: 'Building2',
    bankName: 'HDFC Bank',
  },
  {
    name: 'Cash Wallet',
    type: AccountType.CASH,
    balance: 1250000, // ₹12,500
    color: '#10B981',
    icon: 'Wallet',
  },
  {
    name: 'ICICI Credit Card',
    type: AccountType.CREDIT_CARD,
    balance: -2347500, // ₹23,475 liability
    color: '#F97316',
    icon: 'CreditCard',
    bankName: 'ICICI Bank',
  },
  {
    name: 'Paytm Wallet',
    type: AccountType.WALLET,
    balance: 342000, // ₹3,420
    color: '#8B5CF6',
    icon: 'Smartphone',
  },
  {
    name: 'SBI Salary Account',
    type: AccountType.BANK,
    balance: 4521500, // ₹45,215
    color: '#06B6D4',
    icon: 'Building2',
    bankName: 'State Bank of India',
  },
];

// Demo transactions for the last 30 days
const TRANSACTION_TEMPLATES: Array<{
  type: TransactionType;
  description: string;
  categoryId: string;
  minAmount: number;
  maxAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
}> = [
  // Expenses
  { type: TransactionType.EXPENSE, description: 'Grocery Shopping', categoryId: 'groceries', minAmount: 100000, maxAmount: 350000, frequency: 'weekly' },
  { type: TransactionType.EXPENSE, description: 'Swiggy Order', categoryId: 'food', minAmount: 20000, maxAmount: 80000, frequency: 'daily' },
  { type: TransactionType.EXPENSE, description: 'Zomato Dinner', categoryId: 'food', minAmount: 30000, maxAmount: 120000, frequency: 'weekly' },
  { type: TransactionType.EXPENSE, description: 'Uber Ride', categoryId: 'transport', minAmount: 15000, maxAmount: 45000, frequency: 'weekly' },
  { type: TransactionType.EXPENSE, description: 'Petrol', categoryId: 'fuel', minAmount: 100000, maxAmount: 250000, frequency: 'weekly' },
  { type: TransactionType.EXPENSE, description: 'Electricity Bill', categoryId: 'utilities', minAmount: 150000, maxAmount: 350000, frequency: 'monthly' },
  { type: TransactionType.EXPENSE, description: 'Mobile Recharge', categoryId: 'utilities', minAmount: 29900, maxAmount: 99900, frequency: 'monthly' },
  { type: TransactionType.EXPENSE, description: 'Amazon Shopping', categoryId: 'shopping', minAmount: 50000, maxAmount: 500000, frequency: 'weekly' },
  { type: TransactionType.EXPENSE, description: 'Flipkart Order', categoryId: 'shopping', minAmount: 80000, maxAmount: 300000, frequency: 'weekly' },
  { type: TransactionType.EXPENSE, description: 'Netflix Subscription', categoryId: 'entertainment', minAmount: 64900, maxAmount: 64900, frequency: 'monthly' },
  { type: TransactionType.EXPENSE, description: 'Gym Membership', categoryId: 'health', minAmount: 200000, maxAmount: 200000, frequency: 'monthly' },
  { type: TransactionType.EXPENSE, description: 'Coffee at Starbucks', categoryId: 'food', minAmount: 25000, maxAmount: 55000, frequency: 'weekly' },
  { type: TransactionType.EXPENSE, description: 'House Rent', categoryId: 'housing', minAmount: 2500000, maxAmount: 2500000, frequency: 'monthly' },
  { type: TransactionType.EXPENSE, description: 'Medicine', categoryId: 'health', minAmount: 20000, maxAmount: 80000, frequency: 'monthly' },
  { type: TransactionType.EXPENSE, description: 'Movie Tickets', categoryId: 'entertainment', minAmount: 40000, maxAmount: 100000, frequency: 'monthly' },
  { type: TransactionType.EXPENSE, description: 'Hair Salon', categoryId: 'personal_care', minAmount: 30000, maxAmount: 80000, frequency: 'monthly' },

  // Income
  { type: TransactionType.INCOME, description: 'Salary Credit', categoryId: 'salary', minAmount: 8500000, maxAmount: 8500000, frequency: 'monthly' },
  { type: TransactionType.INCOME, description: 'Freelance Project', categoryId: 'freelance', minAmount: 150000, maxAmount: 500000, frequency: 'monthly' },
  { type: TransactionType.INCOME, description: 'Dividend Income', categoryId: 'investment', minAmount: 50000, maxAmount: 150000, frequency: 'monthly' },
  { type: TransactionType.INCOME, description: 'Cashback Reward', categoryId: 'other_income', minAmount: 5000, maxAmount: 25000, frequency: 'weekly' },
];

// Demo budgets
const DEMO_BUDGETS: Array<{
  name: string;
  categoryId: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  color: string;
}> = [
  { name: 'Food & Dining', categoryId: 'food', amount: 1500000, period: 'monthly', color: '#F97316' },
  { name: 'Shopping', categoryId: 'shopping', amount: 800000, period: 'monthly', color: '#8B5CF6' },
  { name: 'Transportation', categoryId: 'transport', amount: 500000, period: 'monthly', color: '#3B82F6' },
  { name: 'Entertainment', categoryId: 'entertainment', amount: 300000, period: 'monthly', color: '#EC4899' },
  { name: 'Utilities', categoryId: 'utilities', amount: 400000, period: 'monthly', color: '#10B981' },
  { name: 'Groceries', categoryId: 'groceries', amount: 1000000, period: 'monthly', color: '#06B6D4' },
];

// Demo goals
const DEMO_GOALS: Array<{
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  targetMonthsAway: number;
  priority: 'high' | 'medium' | 'low';
  color: string;
}> = [
  { name: 'Emergency Fund', icon: 'Shield', targetAmount: 50000000, currentAmount: 32500000, targetMonthsAway: 6, priority: 'high', color: '#EF4444' },
  { name: 'New iPhone', icon: 'Smartphone', targetAmount: 15000000, currentAmount: 8500000, targetMonthsAway: 3, priority: 'medium', color: '#8B5CF6' },
  { name: 'Vacation to Goa', icon: 'Plane', targetAmount: 8000000, currentAmount: 2500000, targetMonthsAway: 4, priority: 'medium', color: '#06B6D4' },
  { name: 'Home Down Payment', icon: 'Home', targetAmount: 200000000, currentAmount: 45000000, targetMonthsAway: 24, priority: 'high', color: '#10B981' },
  { name: 'Car Upgrade', icon: 'Car', targetAmount: 80000000, currentAmount: 15000000, targetMonthsAway: 18, priority: 'low', color: '#F59E0B' },
];

// Demo loans
const DEMO_LOANS: Array<{
  name: string;
  type: LoanType;
  principalAmount: number;
  interestRate: number;
  tenure: number;
  monthsElapsed: number;
  lenderName: string;
}> = [
  {
    name: 'Home Loan - Flat',
    type: LoanType.HOME,
    principalAmount: 350000000, // ₹35L
    interestRate: 8.5,
    tenure: 240, // 20 years
    monthsElapsed: 24,
    lenderName: 'HDFC Home Finance',
  },
  {
    name: 'Car Loan - Honda City',
    type: LoanType.CAR,
    principalAmount: 80000000, // ₹8L
    interestRate: 9.5,
    tenure: 60, // 5 years
    monthsElapsed: 18,
    lenderName: 'ICICI Bank',
  },
];

// Demo investments
const DEMO_INVESTMENTS: Array<{
  name: string;
  type: 'mutual_fund' | 'stocks' | 'fixed_deposit' | 'ppf' | 'nps' | 'gold';
  symbol?: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  isTaxSaving: boolean;
  taxSection?: string;
}> = [
  {
    name: 'Nifty 50 Index Fund',
    type: 'mutual_fund',
    symbol: 'NIFTY50',
    quantity: 100,
    avgBuyPrice: 18500,
    currentPrice: 21250,
    isTaxSaving: false,
  },
  {
    name: 'HDFC Bank',
    type: 'stocks',
    symbol: 'HDFCBANK',
    quantity: 50,
    avgBuyPrice: 145000,
    currentPrice: 162500,
    isTaxSaving: false,
  },
  {
    name: 'Reliance Industries',
    type: 'stocks',
    symbol: 'RELIANCE',
    quantity: 25,
    avgBuyPrice: 235000,
    currentPrice: 248000,
    isTaxSaving: false,
  },
  {
    name: 'Axis ELSS Tax Saver',
    type: 'mutual_fund',
    symbol: 'AXISELSS',
    quantity: 200,
    avgBuyPrice: 4500,
    currentPrice: 5200,
    isTaxSaving: true,
    taxSection: '80C',
  },
  {
    name: 'Public Provident Fund',
    type: 'ppf',
    quantity: 1,
    avgBuyPrice: 150000000, // ₹1.5L yearly for 2 years
    currentPrice: 165000000, // With 7.1% interest
    isTaxSaving: true,
    taxSection: '80C',
  },
  {
    name: 'National Pension Scheme',
    type: 'nps',
    quantity: 1,
    avgBuyPrice: 50000000, // ₹50K
    currentPrice: 58000000,
    isTaxSaving: true,
    taxSection: '80CCD(1B)',
  },
  {
    name: 'Sovereign Gold Bond',
    type: 'gold',
    symbol: 'SGB2024',
    quantity: 10, // 10 grams
    avgBuyPrice: 520000, // ₹5200/gram
    currentPrice: 615000, // ₹6150/gram
    isTaxSaving: false,
  },
  {
    name: 'ICICI FD',
    type: 'fixed_deposit',
    quantity: 1,
    avgBuyPrice: 100000000, // ₹1L
    currentPrice: 107200000, // 7.2% interest
    isTaxSaving: true,
    taxSection: '80C',
  },
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate random amount between min and max
 */
function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random date within the last N days
 */
function randomDate(daysBack: number): Date {
  const days = Math.floor(Math.random() * daysBack);
  return subDays(new Date(), days);
}

/**
 * Check if demo data already exists
 */
async function hasDemoData(): Promise<boolean> {
  const accountCount = await db.accounts.where({ userId: DEFAULT_USER_ID }).count();
  return accountCount > 0;
}

// ==================== SEEDING FUNCTIONS ====================

/**
 * Seed demo accounts
 */
async function seedAccounts(): Promise<Map<string, string>> {
  const accountIdMap = new Map<string, string>();
  const now = new Date().toISOString();

  for (let i = 0; i < DEMO_ACCOUNTS.length; i++) {
    const config = DEMO_ACCOUNTS[i];
    const accountId = generateId();
    accountIdMap.set(config.name, accountId);

    const account: Account = {
      id: accountId,
      userId: DEFAULT_USER_ID,
      name: config.name,
      type: config.type,
      balance: config.balance,
      initialBalance: config.balance,
      currency: 'INR',
      color: config.color,
      icon: config.icon,
      isDefault: i === 0,
      isArchived: false,
      isFamilyShared: false,
      includeInTotal: true,
      sortOrder: i,
      bankName: config.bankName,
      createdAt: now,
      updatedAt: now,
    };

    await db.accounts.add(account);
  }

  return accountIdMap;
}

/**
 * Seed demo transactions
 */
async function seedTransactions(accountIdMap: Map<string, string>): Promise<void> {
  const now = new Date();
  const nowStr = now.toISOString();
  const transactions: Transaction[] = [];

  // Get primary account IDs
  const primaryAccountId = accountIdMap.get('HDFC Savings') || '';
  const salaryAccountId = accountIdMap.get('SBI Salary Account') || '';
  const creditCardId = accountIdMap.get('ICICI Credit Card') || '';
  const cashWalletId = accountIdMap.get('Cash Wallet') || '';

  // Generate transactions for the last 60 days
  for (let day = 0; day < 60; day++) {
    const date = subDays(now, day);
    const dateStr = format(date, 'yyyy-MM-dd');

    for (const template of TRANSACTION_TEMPLATES) {
      let shouldAdd = false;

      switch (template.frequency) {
        case 'daily':
          shouldAdd = Math.random() > 0.5; // 50% chance each day
          break;
        case 'weekly':
          shouldAdd = day % 7 === Math.floor(Math.random() * 7) && Math.random() > 0.3;
          break;
        case 'monthly':
          shouldAdd = day % 30 === (template.type === TransactionType.INCOME ? 1 : Math.floor(Math.random() * 28));
          break;
        case 'once':
          shouldAdd = day === Math.floor(Math.random() * 60);
          break;
      }

      if (shouldAdd) {
        // Choose account based on transaction type
        let accountId = primaryAccountId;
        if (template.type === TransactionType.INCOME && template.categoryId === 'salary') {
          accountId = salaryAccountId;
        } else if (template.categoryId === 'shopping' && Math.random() > 0.5) {
          accountId = creditCardId;
        } else if (template.description.includes('Coffee') || template.description.includes('Uber')) {
          accountId = Math.random() > 0.5 ? cashWalletId : primaryAccountId;
        }

        const transaction: Transaction = {
          id: generateId(),
          userId: DEFAULT_USER_ID,
          type: template.type,
          amount: randomAmount(template.minAmount, template.maxAmount),
          currency: 'INR',
          accountId,
          categoryId: template.categoryId,
          description: template.description,
          date: dateStr,
          tagIds: [],
          attachments: [],
          isRecurring: template.frequency === 'monthly',
          isFamilyTransaction: false,
          isPending: false,
          isExcludedFromStats: false,
          createdAt: nowStr,
          updatedAt: nowStr,
        };

        transactions.push(transaction);
      }
    }
  }

  // Bulk insert
  await db.transactions.bulkAdd(transactions);
}

/**
 * Seed demo budgets
 */
async function seedBudgets(): Promise<void> {
  const now = new Date();
  const nowStr = now.toISOString();
  const startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const endDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

  for (const config of DEMO_BUDGETS) {
    // Calculate spent amount based on existing transactions
    const transactions = await db.transactions
      .where({ userId: DEFAULT_USER_ID, categoryId: config.categoryId })
      .filter(t => t.type === TransactionType.EXPENSE && t.date >= startDate && t.date <= endDate)
      .toArray();

    const spent = transactions.reduce((sum, t) => sum + t.amount, 0);

    const budget: Budget = {
      id: generateId(),
      userId: DEFAULT_USER_ID,
      name: config.name,
      categoryId: config.categoryId,
      categoryIds: [config.categoryId],
      accountIds: [],
      amount: config.amount,
      spent,
      period: config.period,
      startDate,
      endDate,
      alertThreshold: 80,
      alertAt: [50, 80, 100],
      rollover: false,
      rolloverAmount: 0,
      carryOver: false,
      isArchived: false,
      isFamilyBudget: false,
      color: config.color,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await db.budgets.add(budget);
  }
}

/**
 * Seed demo goals
 */
async function seedGoals(): Promise<void> {
  const now = new Date();
  const nowStr = now.toISOString();

  for (const config of DEMO_GOALS) {
    const targetDate = addMonths(now, config.targetMonthsAway);

    const goal: Goal = {
      id: generateId(),
      userId: DEFAULT_USER_ID,
      name: config.name,
      icon: config.icon,
      targetAmount: config.targetAmount,
      currentAmount: config.currentAmount,
      currency: 'INR',
      targetDate: format(targetDate, 'yyyy-MM-dd'),
      startDate: format(now, 'yyyy-MM-dd'),
      priority: config.priority,
      status: GoalStatus.ACTIVE,
      color: config.color,
      autoSaveEnabled: false,
      isFamilyGoal: false,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await db.goals.add(goal);
  }
}

/**
 * Seed demo loans
 */
async function seedLoans(): Promise<void> {
  const now = new Date();
  const nowStr = now.toISOString();

  for (const config of DEMO_LOANS) {
    const startDate = subMonths(now, config.monthsElapsed);
    const endDate = addMonths(startDate, config.tenure);

    // Calculate EMI - using 3 arguments
    const emiResult = calculateEMI(
      config.principalAmount,
      config.interestRate,
      config.tenure
    );
    const emi = emiResult.emi;
    const totalInterest = emiResult.totalInterest;

    // Calculate outstanding principal (simplified)
    const paidEMIs = config.monthsElapsed;
    const totalPaid = emi * paidEMIs;
    const monthlyRate = config.interestRate / 100 / 12;
    let balance = config.principalAmount;

    for (let i = 0; i < paidEMIs; i++) {
      const interest = Math.round(balance * monthlyRate);
      const principal = emi - interest;
      balance -= principal;
    }

    const loan: Loan = {
      id: generateId(),
      userId: DEFAULT_USER_ID,
      name: config.name,
      type: config.type,
      lender: config.lenderName,
      lenderName: config.lenderName,
      lenderType: 'bank',
      principalAmount: config.principalAmount,
      outstandingPrincipal: Math.max(0, balance),
      outstandingInterest: Math.max(0, totalInterest - (totalPaid - (config.principalAmount - balance))),
      interestRate: config.interestRate,
      interestType: 'fixed',
      tenure: config.tenure,
      remainingTenure: config.tenure - config.monthsElapsed,
      emiAmount: emi,
      emiDay: 5,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      disbursementDate: format(startDate, 'yyyy-MM-dd'),
      firstEmiDate: format(addMonths(startDate, 1), 'yyyy-MM-dd'),
      lastEmiDate: format(endDate, 'yyyy-MM-dd'),
      totalInterest: totalInterest,
      totalPaid: totalPaid,
      totalPayable: emiResult.totalPayment,
      totalInterestPayable: totalInterest,
      partPaymentAllowed: true,
      principalTaxBenefit: false,
      interestTaxBenefit: false,
      status: LoanStatus.ACTIVE,
      isFamilyLoan: false,
      icon: 'FileText',
      color: '#3B82F6',
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await db.loans.add(loan);
  }
}

/**
 * Seed demo investments
 */
async function seedInvestments(): Promise<void> {
  const now = new Date();
  const nowStr = now.toISOString();
  const lastUpdated = subDays(now, Math.floor(Math.random() * 3)).toISOString();

  for (const config of DEMO_INVESTMENTS) {
    const investedAmount = config.quantity * config.avgBuyPrice;
    const currentValue = config.quantity * config.currentPrice;

    const investment: Investment = {
      id: generateId(),
      userId: DEFAULT_USER_ID,
      name: config.name,
      type: config.type,
      symbol: config.symbol,
      quantity: config.quantity,
      avgBuyPrice: config.avgBuyPrice,
      currentPrice: config.currentPrice,
      investedAmount,
      currentValue,
      currency: 'INR',
      isTaxSaving: config.isTaxSaving,
      taxSection: config.taxSection,
      createdAt: nowStr,
      updatedAt: nowStr,
      lastUpdatedAt: lastUpdated,
    };

    await db.investments.add(investment);
  }
}

// ==================== MAIN FUNCTIONS ====================

/**
 * Seed all demo data
 */
export async function seedDemoData(force = false): Promise<{
  success: boolean;
  message: string;
  accountsCreated: number;
  transactionsCreated: number;
}> {
  try {
    // Check if demo data exists
    if (!force && await hasDemoData()) {
      return {
        success: true,
        message: 'Demo data already exists',
        accountsCreated: 0,
        transactionsCreated: 0,
      };
    }

    // Clear existing data if forcing
    if (force) {
      await clearAllData();
    }

    // Seed in order
    console.log('Seeding demo accounts...');
    const accountIdMap = await seedAccounts();

    console.log('Seeding demo transactions...');
    await seedTransactions(accountIdMap);

    console.log('Seeding demo budgets...');
    await seedBudgets();

    console.log('Seeding demo goals...');
    await seedGoals();

    console.log('Seeding demo loans...');
    await seedLoans();

    console.log('Seeding demo investments...');
    await seedInvestments();

    // Get counts
    const accountsCreated = await db.accounts.where({ userId: DEFAULT_USER_ID }).count();
    const transactionsCreated = await db.transactions.where({ userId: DEFAULT_USER_ID }).count();

    return {
      success: true,
      message: 'Demo data seeded successfully',
      accountsCreated,
      transactionsCreated,
    };
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      accountsCreated: 0,
      transactionsCreated: 0,
    };
  }
}

/**
 * Clear all user data
 */
export async function clearAllData(): Promise<void> {
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

/**
 * Check if user has any data
 */
export async function hasUserData(): Promise<boolean> {
  const counts = await Promise.all([
    db.accounts.where({ userId: DEFAULT_USER_ID }).count(),
    db.transactions.where({ userId: DEFAULT_USER_ID }).count(),
  ]);
  return counts.some(c => c > 0);
}

// ==================== EXPORTS ====================

export const seedService = {
  seedDemoData,
  clearAllData,
  hasUserData,
};

export default seedService;
