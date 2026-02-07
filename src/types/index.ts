// ============================================
// FinTrace - TypeScript Type Definitions
// ============================================

// ============================================
// Utility Types
// ============================================

export type UUID = string;

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

export type DateString = string; // ISO 8601 format

// Generate UUID with fallback for browsers without crypto.randomUUID
export function generateId(): UUID {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// Enums
// ============================================

export enum AccountType {
  BANK = 'bank',
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  WALLET = 'wallet',
  INVESTMENT = 'investment',
  LOAN = 'loan',
  OTHER = 'other',
}

export enum TransactionType {
  EXPENSE = 'expense',
  INCOME = 'income',
  TRANSFER = 'transfer',
}

export enum CategoryType {
  EXPENSE = 'expense',
  INCOME = 'income',
  TRANSFER = 'transfer',
}

export enum LoanType {
  HOME = 'home',
  VEHICLE = 'vehicle',
  CAR = 'car',
  PERSONAL = 'personal',
  EDUCATION = 'education',
  GOLD = 'gold',
  CREDIT_CARD = 'credit_card',
  BUSINESS = 'business',
  LAP = 'lap', // Loan Against Property
  OTHER = 'other',
}

export enum LoanStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  DEFAULTED = 'defaulted',
  FORECLOSED = 'foreclosed',
}

export enum EMIStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  PARTIAL = 'partial',
  SKIPPED = 'skipped',
}

// Investment type - using string literal union for flexibility
export type InvestmentType =
  | 'mutual_fund'
  | 'stocks'
  | 'fixed_deposit'
  | 'recurring_deposit'
  | 'ppf'
  | 'epf'
  | 'nps'
  | 'gold'
  | 'real_estate'
  | 'crypto'
  | 'bonds'
  | 'other';

// Investment transaction type - using string literal union
export type InvestmentTransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'sip'
  | 'interest'
  | 'maturity'
  | 'bonus';

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
}

export enum BudgetPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum FamilyRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum InsightType {
  SPENDING_PATTERN = 'spending_pattern',
  SAVINGS_TIP = 'savings_tip',
  ANOMALY = 'anomaly',
  FORECAST = 'forecast',
  BUDGET_ALERT = 'budget_alert',
  GOAL_PROGRESS = 'goal_progress',
  LOAN_INSIGHT = 'loan_insight',
  INVESTMENT_TIP = 'investment_tip',
}

export enum InsightPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationType {
  BUDGET_EXCEEDED = 'budget_exceeded',
  BUDGET_WARNING = 'budget_warning',
  GOAL_ACHIEVED = 'goal_achieved',
  EMI_DUE = 'emi_due',
  EMI_OVERDUE = 'emi_overdue',
  BILL_REMINDER = 'bill_reminder',
  INSIGHT = 'insight',
  FAMILY_ACTIVITY = 'family_activity',
  SYSTEM = 'system',
}

// Tax section - supports both enum values and string literals
export type TaxSection =
  | '80C'
  | '80D'
  | '80E'
  | '24b'
  | '80G'
  | '80CCD(1B)'
  | 'none'
  | string;

// ============================================
// Base Entity
// ============================================

export interface BaseEntity {
  id: UUID;
  createdAt: DateString;
  updatedAt: DateString;
}

// ============================================
// User & Family
// ============================================

export interface User extends BaseEntity {
  email: string;
  name: string;
  avatarUrl?: string;
  phone?: string;

  // Settings
  defaultCurrency: Currency;
  locale: string;
  dateFormat: string;

  // Security
  pinHash?: string;
  biometricEnabled: boolean;
  autoLockMinutes: number;

  // Family
  familyId?: UUID;

  // Sync
  lastSyncAt?: DateString;
  syncEnabled: boolean;
}

export interface Family extends BaseEntity {
  name: string;
  createdBy: UUID;
  inviteCode: string;

  settings: {
    currency: Currency;
    sharedBudgetEnabled: boolean;
    activityFeedEnabled: boolean;
  };
}

export interface FamilyMember extends BaseEntity {
  familyId: UUID;
  userId: UUID;
  role: FamilyRole;
  nickname?: string;

  // Permissions
  canViewOthersTransactions: boolean;
  canEditSharedBudgets: boolean;
  canInviteMembers: boolean;

  joinedAt: DateString;
}

export interface FamilyActivity extends BaseEntity {
  familyId: UUID;
  userId: UUID;
  userName: string;

  action: string;
  entityType: string;
  entityId?: UUID;

  description: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Account
// ============================================

export interface Account extends BaseEntity {
  userId: UUID;

  name: string;
  type: AccountType;
  balance: number; // Current balance in smallest unit (paise for INR)
  initialBalance: number;
  currency: Currency;

  // Bank details (for bank accounts)
  bankName?: string;
  accountNumber?: string; // Last 4 digits only for display
  ifscCode?: string;

  // Credit card specific
  creditLimit?: number;
  billingDay?: number; // Day of month
  dueDay?: number;

  // Wallet specific
  walletProvider?: string; // Paytm, PhonePe, Google Pay, etc.

  // Display
  icon: string;
  color: string;
  isDefault: boolean;
  isArchived: boolean;
  includeInTotal: boolean;

  // Family sharing
  isFamilyShared: boolean;
  familyId?: UUID;

  // Metadata
  notes?: string;
  sortOrder: number;
}

// ============================================
// Category
// ============================================

export interface Category extends BaseEntity {
  userId?: UUID; // null for default categories

  name: string;
  type: CategoryType;
  icon: string;
  color: string;

  parentId?: UUID; // For subcategories

  // Budget integration
  budgetDefault?: number;

  // Auto-categorization
  keywords: string[]; // Keywords for auto-matching
  merchantPatterns: string[]; // Regex patterns for merchants

  isSystem: boolean; // Cannot be deleted
  isArchived: boolean;
  sortOrder: number;
}

// ============================================
// Transaction
// ============================================

export interface Transaction extends BaseEntity {
  userId: UUID;

  type: TransactionType;
  amount: number; // Always positive, in smallest unit
  currency: Currency;

  // Accounts
  accountId: UUID;
  toAccountId?: UUID; // For transfers

  // Categorization
  categoryId: UUID;
  subcategoryId?: UUID;

  // Details
  description: string;
  notes?: string;

  // Merchant/Payee
  payee?: string;
  merchantName?: string;
  merchantCategory?: string;

  // Date & Time
  date: DateString;
  time?: string; // HH:mm format

  // Location
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };

  // Tags
  tagIds: UUID[];

  // Attachments
  receiptUrl?: string;
  attachments: string[];

  // UPI/Payment
  upiId?: string;
  transactionRef?: string; // Bank reference number
  paymentMethod?: string; // UPI, NEFT, IMPS, Cash, Card

  // Recurring
  isRecurring: boolean;
  recurringId?: UUID;

  // Family
  isFamilyTransaction: boolean;
  familyId?: UUID;
  splitDetails?: TransactionSplit[];

  // Import
  importSource?: string; // 'sms', 'email', 'csv', 'pdf', 'ocr', 'voice'
  importRef?: string;

  // Status
  isPending: boolean;
  isExcludedFromStats: boolean;

  // Loan/EMI
  loanId?: UUID;
  emiScheduleId?: UUID;
}

export interface TransactionSplit {
  userId: UUID;
  userName: string;
  amount: number;
  isPaid: boolean;
  paidAt?: DateString;
}

// ============================================
// Tag
// ============================================

export interface Tag extends BaseEntity {
  userId: UUID;

  name: string;
  color: string;
  icon?: string;

  // Usage tracking
  usageCount: number;
  lastUsedAt?: DateString;
}

// ============================================
// Budget
// ============================================

export interface Budget extends BaseEntity {
  userId: UUID;

  name: string;

  // Period - supports both string literals and enum
  period: BudgetPeriod | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate: DateString;
  endDate?: DateString; // For custom periods

  // Amount
  amount: number; // Budget limit
  spent: number; // Current spent (calculated)
  rollover: boolean; // Rollover unused amount
  rolloverAmount: number;
  carryOver: boolean; // Legacy support

  // Categories - supports both single and multiple
  categoryId?: UUID; // Single category (legacy support)
  categoryIds: UUID[]; // Empty means all categories

  // Accounts
  accountIds: UUID[]; // Empty means all accounts

  // Alerts
  alertThreshold: number; // Percentage (e.g., 80 for 80%)
  alertAt: number[]; // Multiple thresholds [50, 80, 100]

  // Display
  color?: string;

  // Family
  isFamilyBudget: boolean;
  familyId?: UUID;

  notes?: string;
  isArchived: boolean;
}

// ============================================
// Goal
// ============================================

export interface Goal extends BaseEntity {
  userId: UUID;

  name: string;
  description?: string;
  icon: string;
  color: string;

  // Target
  targetAmount: number;
  currentAmount: number;
  currency: Currency;

  // Timeline
  targetDate: DateString; // Required - when to achieve the goal
  startDate: DateString;
  completedDate?: DateString; // When the goal was completed

  // Priority
  priority: 'high' | 'medium' | 'low';

  // Linked account
  linkedAccountId?: UUID;

  // Status
  status: GoalStatus;

  // Auto-save
  autoSaveEnabled: boolean;
  autoSaveAmount?: number;
  autoSaveFrequency?: RecurrenceFrequency;

  // Family
  isFamilyGoal: boolean;
  familyId?: UUID;
}

export interface GoalContribution extends BaseEntity {
  goalId: UUID;
  userId: UUID;

  amount: number;
  note?: string;

  transactionId?: UUID;
}

// ============================================
// Loan
// ============================================

export interface Loan extends BaseEntity {
  userId: UUID;

  name: string;
  type: LoanType;

  // Loan details
  lender: string;
  lenderName?: string; // Alias for lender
  lenderType: 'bank' | 'nbfc' | 'personal' | 'other';
  accountNumber?: string;

  // Amount
  principalAmount: number;
  interestRate: number; // Annual percentage
  interestType: 'fixed' | 'floating';

  // Outstanding
  outstandingPrincipal: number;
  outstandingInterest: number;

  // EMI
  emiAmount: number;
  emiDay: number; // Day of month
  tenure: number; // Total months
  remainingTenure: number;

  // Calculated totals
  totalInterest: number;
  totalPaid: number;
  totalPayable: number;
  totalInterestPayable: number;

  // Dates
  startDate: DateString;
  endDate: DateString;
  disbursementDate: DateString;
  firstEmiDate: DateString;
  lastEmiDate: DateString;

  // Pre-closure
  preClosurePenalty?: number; // Percentage
  partPaymentAllowed: boolean;

  // Tax benefits
  taxSection?: TaxSection;
  principalTaxBenefit: boolean;
  interestTaxBenefit: boolean;

  // Status
  status: LoanStatus;
  closedDate?: DateString;

  // Linked account
  linkedAccountId?: UUID;

  // Family
  isFamilyLoan: boolean;

  notes?: string;
  icon: string;
  color: string;
}

export interface EMISchedule extends BaseEntity {
  loanId: UUID;

  emiNumber: number;
  dueDate: DateString;

  // Breakdown
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  totalAmount: number;

  // Balances
  openingBalance: number;
  closingBalance: number;
  outstandingAfter: number;

  // Payment info
  paidDate?: DateString;
  paidAmount?: number;

  // Status
  status: EMIStatus;
}

export interface EMIPayment extends BaseEntity {
  loanId: UUID;
  emiScheduleId: UUID;
  userId: UUID;

  paidDate: DateString;
  paidAmount: number;
  totalPaid: number;

  principalPaid: number;
  interestPaid: number;
  lateFee?: number;

  // Prepayment tracking
  isPrepayment?: boolean;
  prepaymentAmount?: number;

  transactionId?: UUID;
  paymentMethod?: string;
  reference?: string;

  notes?: string;
}

// ============================================
// Investment
// ============================================

export interface Investment extends BaseEntity {
  userId: UUID;

  name: string;
  type: InvestmentType;

  // Identifiers
  symbol?: string; // Stock symbol, MF scheme code
  isin?: string;
  folioNumber?: string;

  // Holdings
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;

  // Values
  investedAmount: number;
  currentValue: number;

  // For FD/RD
  interestRate?: number;
  maturityDate?: DateString;
  maturityAmount?: number;
  compoundingFrequency?: 'monthly' | 'quarterly' | 'yearly';

  // Broker/Platform
  broker?: string;
  accountNumber?: string;

  // Tax
  isTaxSaving: boolean;
  taxSection?: TaxSection;

  // Metadata
  currency: Currency;
  notes?: string;

  lastUpdatedAt: DateString;
}

export interface InvestmentTransaction extends BaseEntity {
  investmentId: UUID;
  userId: UUID;

  type: InvestmentTransactionType;
  date: DateString;

  quantity: number;
  price: number;
  amount: number;

  fees: number;
  taxes: number;

  notes?: string;
}

// ============================================
// Recurring Transaction
// ============================================

export interface RecurringTransaction extends BaseEntity {
  userId: UUID;

  name: string;

  // Template
  type: TransactionType;
  amount: number;
  currency: Currency;
  accountId: UUID;
  toAccountId?: UUID;
  categoryId: UUID;
  payee?: string;
  notes?: string;

  // Schedule
  frequency: RecurrenceFrequency;
  startDate: DateString;
  endDate?: DateString;
  nextOccurrence: DateString;

  // Day specification
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly

  // Settings
  autoCreate: boolean;
  reminderDays: number; // Days before to remind

  // Tracking
  lastCreatedDate?: DateString;
  totalCreated: number;

  isActive: boolean;
}

// ============================================
// Insight
// ============================================

export interface Insight extends BaseEntity {
  userId: UUID;

  type: InsightType;
  category?: string;

  title: string;
  description: string;

  priority: InsightPriority;

  // Action
  actionType?: string;
  actionData?: Record<string, unknown>;

  // Status
  isRead: boolean;
  isDismissed: boolean;
  isActedUpon: boolean;

  validUntil?: DateString;

  // Related entities
  relatedTransactionIds?: UUID[];
  relatedCategoryId?: UUID;
}

// ============================================
// Notification
// ============================================

export interface Notification extends BaseEntity {
  userId: UUID;

  type: NotificationType;
  title: string;
  message: string;

  // Related entity
  entityType?: string;
  entityId?: UUID;

  // Action
  actionUrl?: string;

  // Status
  isRead: boolean;
  readAt?: DateString;

  // Schedule
  scheduledFor?: DateString;
  sentAt?: DateString;
}

// ============================================
// Voice & OCR
// ============================================

export interface VoiceEntry extends BaseEntity {
  userId: UUID;

  audioUrl?: string;
  transcript: string;

  parsedData?: {
    amount?: number;
    type?: TransactionType;
    categoryId?: UUID;
    description?: string;
    payee?: string;
    date?: DateString;
  };

  confidenceScore: number;

  transactionId?: UUID;

  status: 'pending' | 'processed' | 'failed';
  errorMessage?: string;
}

export interface ReceiptScan extends BaseEntity {
  userId: UUID;

  imageUrl: string;

  rawText?: string;

  extractedData?: {
    merchantName?: string;
    amount?: number;
    date?: DateString;
    items?: Array<{ name: string; amount: number }>;
    gstNumber?: string;
    paymentMethod?: string;
  };

  confidenceScore: number;

  transactionId?: UUID;

  status: 'pending' | 'processed' | 'failed';
  errorMessage?: string;
}

// ============================================
// App Settings
// ============================================

export interface AppSettings {
  id: 'app_settings';

  // User preferences
  theme: 'light' | 'dark' | 'system';
  language: string;

  // Currency & Format
  defaultCurrency: Currency;
  numberFormat: 'indian' | 'international';
  dateFormat: string;

  // Privacy
  hideBalances: boolean;
  requireAuthOnLaunch: boolean;

  // Notifications
  notificationsEnabled: boolean;
  emiReminders: boolean;
  budgetAlerts: boolean;
  dailyDigest: boolean;

  // Sync
  syncEnabled: boolean;
  lastSyncAt?: DateString;

  // Onboarding
  onboardingCompleted: boolean;

  // Feature flags
  voiceEntryEnabled: boolean;
  ocrEnabled: boolean;
  aiInsightsEnabled: boolean;
}

// ============================================
// Sync Types
// ============================================

export interface SyncLog extends BaseEntity {
  entityType: string;
  entityId: UUID;
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  syncedAt?: DateString;
  status: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
}

// ============================================
// Summary Types (for queries)
// ============================================

export interface AccountSummary {
  totalBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  accountsByType: Record<AccountType, number>;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
  byCategory: Array<{
    categoryId: UUID;
    categoryName: string;
    amount: number;
    count: number;
  }>;
  byDay: Array<{
    date: string;
    income: number;
    expense: number;
  }>;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  percentUsed: number;
  budgets: Array<{
    budgetId: UUID;
    name: string;
    amount: number;
    spent: number;
    remaining: number;
    percentUsed: number;
  }>;
}

export interface LoanSummary {
  totalOutstanding: number;
  monthlyEmi: number;
  nextEmiDate?: DateString;
  nextEmiAmount?: number;
  loans: Array<{
    loanId: UUID;
    name: string;
    outstanding: number;
    emiAmount: number;
    nextDue?: DateString;
  }>;
}

export interface InvestmentSummary {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  returnsPercentage: number;
  byType: Record<InvestmentType, {
    invested: number;
    current: number;
    returns: number;
  }>;
}

// ============================================
// Filter Types
// ============================================

export interface TransactionFilters {
  startDate?: DateString;
  endDate?: DateString;
  type?: TransactionType;
  categoryIds?: UUID[];
  accountIds?: UUID[];
  tagIds?: UUID[];
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
  payee?: string;
  isRecurring?: boolean;
  isPending?: boolean;
}

export interface DateRange {
  start: DateString;
  end: DateString;
}
