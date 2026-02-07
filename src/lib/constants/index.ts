/**
 * Centralized Constants
 * Single source of truth for all app configuration
 */

// ==================== APP CONFIG ====================
export const APP_CONFIG = {
  name: 'FinTrace',
  version: '1.0.0',
  currency: 'INR',
  currencySymbol: '₹',
  locale: 'en-IN',
  dateFormat: 'dd/MM/yyyy',
  financialYearStart: 4, // April
} as const;

// ==================== ACCOUNT TYPES ====================
export const ACCOUNT_TYPES = {
  bank: { label: 'Bank Account', icon: 'Building2', color: '#3B82F6' },
  cash: { label: 'Cash', icon: 'Wallet', color: '#10B981' },
  credit_card: { label: 'Credit Card', icon: 'CreditCard', color: '#F97316' },
  wallet: { label: 'Digital Wallet', icon: 'Smartphone', color: '#8B5CF6' },
  investment: { label: 'Investment', icon: 'TrendingUp', color: '#06B6D4' },
} as const;

export type AccountType = keyof typeof ACCOUNT_TYPES;

// ==================== TRANSACTION TYPES ====================
export const TRANSACTION_TYPES = {
  income: { label: 'Income', color: '#10B981', sign: '+' },
  expense: { label: 'Expense', color: '#EF4444', sign: '-' },
  transfer: { label: 'Transfer', color: '#6B7280', sign: '' },
} as const;

export type TransactionType = keyof typeof TRANSACTION_TYPES;

// ==================== LOAN TYPES ====================
export const LOAN_TYPES = {
  home: { label: 'Home Loan', icon: 'Home', defaultRate: 8.5, maxTenure: 360, color: '#3B82F6' },
  car: { label: 'Car Loan', icon: 'Car', defaultRate: 9.5, maxTenure: 84, color: '#F59E0B' },
  personal: { label: 'Personal Loan', icon: 'User', defaultRate: 12.0, maxTenure: 60, color: '#8B5CF6' },
  education: { label: 'Education Loan', icon: 'GraduationCap', defaultRate: 10.0, maxTenure: 180, color: '#06B6D4' },
  gold: { label: 'Gold Loan', icon: 'Gem', defaultRate: 11.0, maxTenure: 36, color: '#EAB308' },
  business: { label: 'Business Loan', icon: 'Briefcase', defaultRate: 14.0, maxTenure: 60, color: '#64748B' },
  credit_card: { label: 'Credit Card', icon: 'CreditCard', defaultRate: 36.0, maxTenure: 60, color: '#EF4444' },
  other: { label: 'Other Loan', icon: 'FileText', defaultRate: 12.0, maxTenure: 120, color: '#6B7280' },
} as const;

export type LoanType = keyof typeof LOAN_TYPES;

// ==================== BUDGET PERIODS ====================
export const BUDGET_PERIODS = {
  weekly: { label: 'Weekly', days: 7 },
  monthly: { label: 'Monthly', days: 30 },
  yearly: { label: 'Yearly', days: 365 },
} as const;

export type BudgetPeriod = keyof typeof BUDGET_PERIODS;

// ==================== GOAL PRIORITIES ====================
export const GOAL_PRIORITIES = {
  high: { label: 'High', color: '#EF4444', bgColor: '#FEE2E2' },
  medium: { label: 'Medium', color: '#F59E0B', bgColor: '#FEF3C7' },
  low: { label: 'Low', color: '#3B82F6', bgColor: '#DBEAFE' },
} as const;

export type GoalPriority = keyof typeof GOAL_PRIORITIES;

// ==================== GOAL ICONS ====================
export const GOAL_ICONS = {
  car: { icon: 'Car', label: 'Car' },
  home: { icon: 'Home', label: 'Home' },
  travel: { icon: 'Plane', label: 'Travel' },
  education: { icon: 'GraduationCap', label: 'Education' },
  wedding: { icon: 'Heart', label: 'Wedding' },
  emergency: { icon: 'Shield', label: 'Emergency' },
  retirement: { icon: 'Armchair', label: 'Retirement' },
  gadget: { icon: 'Smartphone', label: 'Gadget' },
  custom: { icon: 'Target', label: 'Custom' },
} as const;

export type GoalIcon = keyof typeof GOAL_ICONS;

// ==================== INVESTMENT TYPES ====================
export const INVESTMENT_TYPES = {
  mutual_fund: { label: 'Mutual Funds', icon: 'TrendingUp', color: '#10B981' },
  stocks: { label: 'Stocks', icon: 'BarChart3', color: '#3B82F6' },
  fd: { label: 'Fixed Deposit', icon: 'Landmark', color: '#F59E0B' },
  rd: { label: 'Recurring Deposit', icon: 'Repeat', color: '#8B5CF6' },
  ppf: { label: 'PPF', icon: 'Shield', color: '#06B6D4' },
  nps: { label: 'NPS', icon: 'Building', color: '#EC4899' },
  gold: { label: 'Gold', icon: 'Gem', color: '#EAB308' },
  real_estate: { label: 'Real Estate', icon: 'Home', color: '#64748B' },
  crypto: { label: 'Crypto', icon: 'Bitcoin', color: '#F97316' },
  other: { label: 'Other', icon: 'Wallet', color: '#6B7280' },
} as const;

export type InvestmentType = keyof typeof INVESTMENT_TYPES;

// ==================== STATUS COLORS ====================
export const STATUS_COLORS = {
  good: { text: 'text-emerald-500', bg: 'bg-emerald-500', light: 'bg-emerald-50' },
  warning: { text: 'text-yellow-500', bg: 'bg-yellow-500', light: 'bg-yellow-50' },
  danger: { text: 'text-orange-500', bg: 'bg-orange-500', light: 'bg-orange-50' },
  over: { text: 'text-red-500', bg: 'bg-red-500', light: 'bg-red-50' },
} as const;

export type StatusType = keyof typeof STATUS_COLORS;

// ==================== VALIDATION LIMITS ====================
export const LIMITS = {
  amount: { min: 1, max: 100000000000 }, // 100 crore
  rate: { min: 0, max: 50 },
  tenure: { min: 1, max: 360 },
  emiDay: { min: 1, max: 28 },
  nameLength: { min: 1, max: 100 },
  descriptionLength: { max: 200 },
  pinLength: [4, 6] as const,
} as const;

// ==================== ROUTES ====================
export const ROUTES = {
  home: '/',
  stats: '/stats',
  add: '/add',
  invest: '/invest',
  more: '/more',
  transactions: '/transactions',
  loans: '/loans',
  loansAdd: '/loans/add',
  budgets: '/budgets',
  goals: '/goals',
  accounts: '/accounts',
  emiCalculator: '/emi-calculator',
  settings: '/settings',
} as const;
