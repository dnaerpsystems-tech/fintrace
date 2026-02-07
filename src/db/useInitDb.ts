// ============================================
// FinTrace - Database Initialization Hook
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { db } from './index';
import { defaultCategories, defaultAppSettings } from './seed';
import type { Category } from '../types';

export interface DbInitState {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  stats: {
    categoriesCount: number;
    accountsCount: number;
    transactionsCount: number;
  } | null;
}

export interface UseInitDbReturn extends DbInitState {
  reinitialize: () => Promise<void>;
  resetDatabase: () => Promise<void>;
}

/**
 * Hook to initialize the database on app start
 * - Seeds default categories if empty
 * - Sets up default app settings
 * - Handles migrations
 */
export function useInitDb(): UseInitDbReturn {
  const [state, setState] = useState<DbInitState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    stats: null,
  });

  const initializeDatabase = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if database is accessible
      await db.open();

      // Seed default categories if empty
      const categoryCount = await db.categories.count();
      if (categoryCount === 0) {
        console.log('[FinTrace DB] Seeding default categories...');
        const now = new Date().toISOString();
        const categoriesWithTimestamps: Category[] = defaultCategories.map((cat) => ({
          ...cat,
          createdAt: now,
          updatedAt: now,
        }));
        await db.categories.bulkAdd(categoriesWithTimestamps);
        console.log(`[FinTrace DB] Seeded ${categoriesWithTimestamps.length} categories`);
      }

      // Initialize app settings if not exists
      const existingSettings = await db.appSettings.get('app_settings');
      if (!existingSettings) {
        console.log('[FinTrace DB] Initializing app settings...');
        await db.appSettings.add(defaultAppSettings);
        console.log('[FinTrace DB] App settings initialized');
      }

      // Get database stats
      const [categories, accounts, transactions] = await Promise.all([
        db.categories.count(),
        db.accounts.count(),
        db.transactions.count(),
      ]);

      const stats = {
        categoriesCount: categories,
        accountsCount: accounts,
        transactionsCount: transactions,
      };

      console.log('[FinTrace DB] Database initialized successfully', stats);

      setState({
        isInitialized: true,
        isLoading: false,
        error: null,
        stats,
      });
    } catch (error) {
      console.error('[FinTrace DB] Database initialization failed:', error);
      setState({
        isInitialized: false,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Unknown database error'),
        stats: null,
      });
    }
  }, []);

  const reinitialize = useCallback(async () => {
    await initializeDatabase();
  }, [initializeDatabase]);

  const resetDatabase = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('[FinTrace DB] Resetting database...');

      // Clear all tables
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

      console.log('[FinTrace DB] Database cleared, re-seeding...');

      // Re-initialize with default data
      await initializeDatabase();
    } catch (error) {
      console.error('[FinTrace DB] Database reset failed:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Database reset failed'),
      }));
    }
  }, [initializeDatabase]);

  // Initialize on mount
  useEffect(() => {
    initializeDatabase();
  }, [initializeDatabase]);

  return {
    ...state,
    reinitialize,
    resetDatabase,
  };
}

/**
 * Check if the database needs migration
 */
export async function checkDatabaseVersion(): Promise<{
  currentVersion: number;
  needsMigration: boolean;
}> {
  const currentVersion = db.verno;
  return {
    currentVersion,
    needsMigration: false,
  };
}

/**
 * Export database for backup
 */
export async function exportDatabaseBackup(): Promise<string> {
  const data: Record<string, unknown[]> = {};

  data.accounts = await db.accounts.toArray();
  data.categories = await db.categories.toArray();
  data.transactions = await db.transactions.toArray();
  data.budgets = await db.budgets.toArray();
  data.goals = await db.goals.toArray();
  data.goalContributions = await db.goalContributions.toArray();
  data.loans = await db.loans.toArray();
  data.emiSchedules = await db.emiSchedules.toArray();
  data.emiPayments = await db.emiPayments.toArray();
  data.investments = await db.investments.toArray();
  data.investmentTransactions = await db.investmentTransactions.toArray();
  data.tags = await db.tags.toArray();
  data.recurringTransactions = await db.recurringTransactions.toArray();
  data.appSettings = await db.appSettings.toArray();

  const backup = {
    version: db.verno,
    exportedAt: new Date().toISOString(),
    data,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Import database from backup
 */
export async function importDatabaseBackup(backupJson: string): Promise<{
  success: boolean;
  imported: Record<string, number>;
  errors: string[];
}> {
  const errors: string[] = [];
  const imported: Record<string, number> = {};

  try {
    const backup = JSON.parse(backupJson);

    if (!backup.data) {
      throw new Error('Invalid backup format: missing data');
    }

    await db.transaction(
      'rw',
      [
        db.accounts,
        db.categories,
        db.transactions,
        db.budgets,
        db.goals,
        db.goalContributions,
        db.loans,
        db.emiSchedules,
        db.emiPayments,
        db.investments,
        db.investmentTransactions,
        db.tags,
        db.recurringTransactions,
        db.appSettings,
      ],
      async () => {
        // Helper to safely import a table
        const safeImport = async <T>(
          name: string,
          data: T[] | undefined,
          bulkFn: (items: T[]) => Promise<unknown>
        ) => {
          if (data && Array.isArray(data) && data.length > 0) {
            try {
              await bulkFn(data);
              imported[name] = data.length;
            } catch (e) {
              errors.push(`Error importing ${name}: ${e}`);
            }
          }
        };

        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('accounts', backup.data.accounts, (d) => db.accounts.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('categories', backup.data.categories, (d) => db.categories.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('transactions', backup.data.transactions, (d) => db.transactions.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('budgets', backup.data.budgets, (d) => db.budgets.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('goals', backup.data.goals, (d) => db.goals.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('goalContributions', backup.data.goalContributions, (d) => db.goalContributions.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('loans', backup.data.loans, (d) => db.loans.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('emiSchedules', backup.data.emiSchedules, (d) => db.emiSchedules.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('emiPayments', backup.data.emiPayments, (d) => db.emiPayments.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('investments', backup.data.investments, (d) => db.investments.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('investmentTransactions', backup.data.investmentTransactions, (d) => db.investmentTransactions.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('tags', backup.data.tags, (d) => db.tags.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('recurringTransactions', backup.data.recurringTransactions, (d) => db.recurringTransactions.bulkPut(d as any));
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        // biome-ignore lint/suspicious/noExplicitAny: Import requires any
        await safeImport('appSettings', backup.data.appSettings, (d) => db.appSettings.bulkPut(d as any));
      }
    );

    return { success: errors.length === 0, imported, errors };
  } catch (error) {
    return {
      success: false,
      imported,
      errors: [...errors, `Import failed: ${error}`],
    };
  }
}

/**
 * Get database size estimation
 */
export async function getDatabaseSize(): Promise<{
  estimatedSize: string;
  tablesSizes: Record<string, number>;
}> {
  const tablesSizes: Record<string, number> = {};

  tablesSizes.accounts = await db.accounts.count();
  tablesSizes.categories = await db.categories.count();
  tablesSizes.transactions = await db.transactions.count();
  tablesSizes.budgets = await db.budgets.count();
  tablesSizes.goals = await db.goals.count();
  tablesSizes.loans = await db.loans.count();
  tablesSizes.investments = await db.investments.count();
  tablesSizes.tags = await db.tags.count();
  tablesSizes.notifications = await db.notifications.count();
  tablesSizes.insights = await db.insights.count();

  const totalRecords = Object.values(tablesSizes).reduce((sum, count) => sum + count, 0);
  const estimatedBytes = totalRecords * 500;

  let estimatedSize: string;
  if (estimatedBytes < 1024) {
    estimatedSize = `${estimatedBytes} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    estimatedSize = `${(estimatedBytes / 1024).toFixed(2)} KB`;
  } else {
    estimatedSize = `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return { estimatedSize, tablesSizes };
}

export default useInitDb;
