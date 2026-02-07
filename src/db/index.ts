// ============================================
// FinTrace - Dexie Database Setup
// ============================================

import Dexie, { type Table } from 'dexie';
import type {
  User,
  Family,
  FamilyMember,
  FamilyActivity,
  Account,
  Category,
  Transaction,
  Tag,
  Budget,
  Goal,
  GoalContribution,
  Loan,
  EMISchedule,
  EMIPayment,
  Investment,
  InvestmentTransaction,
  RecurringTransaction,
  Insight,
  Notification,
  VoiceEntry,
  ReceiptScan,
  AppSettings,
  SyncLog,
} from '../types';

// ============================================
// Database Class Definition
// ============================================

export class FinTraceDB extends Dexie {
  // Tables
  users!: Table<User>;
  families!: Table<Family>;
  familyMembers!: Table<FamilyMember>;
  familyActivities!: Table<FamilyActivity>;
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;
  tags!: Table<Tag>;
  budgets!: Table<Budget>;
  goals!: Table<Goal>;
  goalContributions!: Table<GoalContribution>;
  loans!: Table<Loan>;
  emiSchedules!: Table<EMISchedule>;
  emiPayments!: Table<EMIPayment>;
  investments!: Table<Investment>;
  investmentTransactions!: Table<InvestmentTransaction>;
  recurringTransactions!: Table<RecurringTransaction>;
  insights!: Table<Insight>;
  notifications!: Table<Notification>;
  voiceEntries!: Table<VoiceEntry>;
  receiptScans!: Table<ReceiptScan>;
  appSettings!: Table<AppSettings>;
  syncLogs!: Table<SyncLog>;

  constructor() {
    super('FinTraceDB');

    // ========================================
    // Schema Definition
    // ========================================
    // Indexes: ++ = auto-increment, & = unique, * = multi-entry, [a+b] = compound
    // ========================================

    this.version(1).stores({
      // User & Family
      users: 'id, email, familyId, createdAt',
      families: 'id, createdBy, inviteCode, createdAt',
      familyMembers: 'id, familyId, userId, role, [familyId+userId]',
      familyActivities: 'id, familyId, userId, createdAt, [familyId+createdAt]',

      // Accounts
      accounts: `
        id,
        userId,
        type,
        isDefault,
        isArchived,
        isFamilyShared,
        familyId,
        sortOrder,
        [userId+isArchived],
        [userId+type],
        createdAt
      `,

      // Categories
      categories: `
        id,
        userId,
        type,
        parentId,
        isSystem,
        isArchived,
        sortOrder,
        [userId+type],
        [type+isArchived],
        createdAt
      `,

      // Transactions - heavily indexed for fast queries
      transactions: `
        id,
        userId,
        type,
        accountId,
        toAccountId,
        categoryId,
        date,
        amount,
        payee,
        isRecurring,
        recurringId,
        isPending,
        loanId,
        emiScheduleId,
        isFamilyTransaction,
        familyId,
        *tagIds,
        [userId+date],
        [userId+type],
        [userId+categoryId],
        [userId+accountId],
        [userId+type+date],
        [accountId+date],
        [categoryId+date],
        createdAt,
        updatedAt
      `,

      // Tags
      tags: `
        id,
        userId,
        name,
        usageCount,
        [userId+name],
        createdAt
      `,

      // Budgets
      budgets: `
        id,
        userId,
        period,
        startDate,
        endDate,
        isArchived,
        isFamilyBudget,
        familyId,
        [userId+isArchived],
        [userId+period],
        createdAt
      `,

      // Goals
      goals: `
        id,
        userId,
        status,
        targetDate,
        isFamilyGoal,
        familyId,
        linkedAccountId,
        [userId+status],
        createdAt
      `,

      goalContributions: `
        id,
        goalId,
        userId,
        transactionId,
        [goalId+createdAt],
        createdAt
      `,

      // Loans
      loans: `
        id,
        userId,
        type,
        status,
        lender,
        emiDay,
        taxSection,
        linkedAccountId,
        [userId+status],
        [userId+type],
        createdAt
      `,

      emiSchedules: `
        id,
        loanId,
        emiNumber,
        dueDate,
        status,
        [loanId+emiNumber],
        [loanId+status],
        [loanId+dueDate],
        [status+dueDate]
      `,

      emiPayments: `
        id,
        loanId,
        emiScheduleId,
        paidDate,
        transactionId,
        [loanId+paidDate],
        createdAt
      `,

      // Investments
      investments: `
        id,
        userId,
        type,
        symbol,
        isin,
        folioNumber,
        isTaxSaving,
        taxSection,
        broker,
        [userId+type],
        [userId+isTaxSaving],
        createdAt,
        lastUpdatedAt
      `,

      investmentTransactions: `
        id,
        investmentId,
        userId,
        type,
        date,
        [investmentId+date],
        [userId+date],
        createdAt
      `,

      // Recurring Transactions
      recurringTransactions: `
        id,
        userId,
        frequency,
        nextOccurrence,
        isActive,
        accountId,
        categoryId,
        [userId+isActive],
        [userId+nextOccurrence],
        createdAt
      `,

      // Insights & Notifications
      insights: `
        id,
        userId,
        type,
        priority,
        isRead,
        isDismissed,
        validUntil,
        [userId+isRead],
        [userId+type],
        [userId+isDismissed],
        createdAt
      `,

      notifications: `
        id,
        userId,
        type,
        isRead,
        scheduledFor,
        sentAt,
        [userId+isRead],
        [userId+type],
        createdAt
      `,

      // Voice & OCR
      voiceEntries: `
        id,
        userId,
        status,
        transactionId,
        [userId+status],
        createdAt
      `,

      receiptScans: `
        id,
        userId,
        status,
        transactionId,
        [userId+status],
        createdAt
      `,

      // App Settings (singleton)
      appSettings: 'id',

      // Sync
      syncLogs: `
        id,
        entityType,
        entityId,
        action,
        status,
        [entityType+entityId],
        [status],
        createdAt
      `,
    });

    // ========================================
    // Hooks for automatic timestamps
    // ========================================

    this.accounts.hook('creating', (primKey, obj) => {
      const now = new Date().toISOString();
      obj.createdAt = now;
      obj.updatedAt = now;
    });

    this.accounts.hook('updating', (modifications) => {
      return { ...modifications, updatedAt: new Date().toISOString() };
    });

    this.transactions.hook('creating', (primKey, obj) => {
      const now = new Date().toISOString();
      obj.createdAt = now;
      obj.updatedAt = now;
    });

    this.transactions.hook('updating', (modifications) => {
      return { ...modifications, updatedAt: new Date().toISOString() };
    });

    // Add similar hooks for other tables that need timestamps
    const tablesWithTimestamps = [
      'categories',
      'budgets',
      'goals',
      'goalContributions',
      'loans',
      'investments',
      'investmentTransactions',
      'recurringTransactions',
      'insights',
      'notifications',
      'tags',
      'families',
      'familyMembers',
      'familyActivities',
      'voiceEntries',
      'receiptScans',
      'syncLogs',
    ] as const;

    // Note: Dexie hooks can't be dynamically added in a type-safe way
    // The above hooks for accounts and transactions serve as examples
    // In practice, you'd add hooks for each table or handle in the CRUD operations
  }
}

// ============================================
// Database Instance
// ============================================

export const db = new FinTraceDB();

// ============================================
// Helper Functions
// ============================================

/**
 * Clear all data from the database
 */
export async function clearDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.users,
      db.families,
      db.familyMembers,
      db.familyActivities,
      db.accounts,
      db.categories,
      db.transactions,
      db.tags,
      db.budgets,
      db.goals,
      db.goalContributions,
      db.loans,
      db.emiSchedules,
      db.emiPayments,
      db.investments,
      db.investmentTransactions,
      db.recurringTransactions,
      db.insights,
      db.notifications,
      db.voiceEntries,
      db.receiptScans,
      db.appSettings,
      db.syncLogs,
    ],
    async () => {
      await Promise.all([
        db.users.clear(),
        db.families.clear(),
        db.familyMembers.clear(),
        db.familyActivities.clear(),
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.tags.clear(),
        db.budgets.clear(),
        db.goals.clear(),
        db.goalContributions.clear(),
        db.loans.clear(),
        db.emiSchedules.clear(),
        db.emiPayments.clear(),
        db.investments.clear(),
        db.investmentTransactions.clear(),
        db.recurringTransactions.clear(),
        db.insights.clear(),
        db.notifications.clear(),
        db.voiceEntries.clear(),
        db.receiptScans.clear(),
        db.appSettings.clear(),
        db.syncLogs.clear(),
      ]);
    }
  );
}

/**
 * Export all data for backup
 */
export async function exportDatabase(): Promise<Record<string, unknown[]>> {
  const data: Record<string, unknown[]> = {};

  data.users = await db.users.toArray();
  data.families = await db.families.toArray();
  data.familyMembers = await db.familyMembers.toArray();
  data.familyActivities = await db.familyActivities.toArray();
  data.accounts = await db.accounts.toArray();
  data.categories = await db.categories.toArray();
  data.transactions = await db.transactions.toArray();
  data.tags = await db.tags.toArray();
  data.budgets = await db.budgets.toArray();
  data.goals = await db.goals.toArray();
  data.goalContributions = await db.goalContributions.toArray();
  data.loans = await db.loans.toArray();
  data.emiSchedules = await db.emiSchedules.toArray();
  data.emiPayments = await db.emiPayments.toArray();
  data.investments = await db.investments.toArray();
  data.investmentTransactions = await db.investmentTransactions.toArray();
  data.recurringTransactions = await db.recurringTransactions.toArray();
  data.insights = await db.insights.toArray();
  data.notifications = await db.notifications.toArray();
  data.voiceEntries = await db.voiceEntries.toArray();
  data.receiptScans = await db.receiptScans.toArray();
  data.appSettings = await db.appSettings.toArray();

  return data;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  stats.accounts = await db.accounts.count();
  stats.categories = await db.categories.count();
  stats.transactions = await db.transactions.count();
  stats.budgets = await db.budgets.count();
  stats.goals = await db.goals.count();
  stats.loans = await db.loans.count();
  stats.investments = await db.investments.count();
  stats.tags = await db.tags.count();

  return stats;
}

export default db;
