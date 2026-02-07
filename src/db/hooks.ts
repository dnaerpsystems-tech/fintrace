// ============================================
// FinTrace - Database React Hooks
// ============================================

import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import { db } from './index';
import {
  generateId,
  type Account,
  type Category,
  type Transaction,
  type Budget,
  type Goal,
  type GoalContribution,
  type Loan,
  type EMISchedule,
  type EMIPayment,
  type Investment,
  type InvestmentTransaction,
  type Tag,
  type RecurringTransaction,
  type Insight,
  type Notification,
  type TransactionFilters,
  type AppSettings,
  type UUID,
  type DateString,
  AccountType,
  TransactionType,
  CategoryType,
  LoanStatus,
  GoalStatus,
  EMIStatus,
} from '../types';

// ============================================
// Utility Functions
// ============================================

const now = (): DateString => new Date().toISOString();

// Overloaded withTimestamps for proper typing
function withTimestamps<T extends object>(
  data: T,
  isNew: true
): T & { createdAt: DateString; updatedAt: DateString };
function withTimestamps<T extends object>(
  data: T,
  isNew: false
): T & { updatedAt: DateString };
function withTimestamps<T extends object>(
  data: T,
  isNew = true
// biome-ignore lint/suspicious/noExplicitAny: TypeScript overload requires any return
): any {
  const timestamp = now();
  if (isNew) {
    return { ...data, createdAt: timestamp, updatedAt: timestamp };
  }
  return { ...data, updatedAt: timestamp };
}

// Default user ID for single-user mode (until auth is implemented)
const DEFAULT_USER_ID = 'default-user';

// ============================================
// useAccounts Hook
// ============================================

export interface UseAccountsReturn {
  accounts: Account[] | undefined;
  isLoading: boolean;
  getAccount: (id: UUID) => Promise<Account | undefined>;
  getAccountsByType: (type: AccountType) => Account[];
  createAccount: (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  updateAccount: (id: UUID, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: UUID) => Promise<void>;
  updateBalance: (id: UUID, amount: number, operation: 'add' | 'subtract' | 'set') => Promise<void>;
  getTotalBalance: () => number;
  archiveAccount: (id: UUID) => Promise<void>;
}

export function useAccounts(userId: UUID = DEFAULT_USER_ID): UseAccountsReturn {
  const accounts = useLiveQuery(
    () => db.accounts.where({ userId }).and((acc) => !acc.isArchived).sortBy('sortOrder'),
    [userId]
  );

  const isLoading = accounts === undefined;

  const getAccount = useCallback(async (id: UUID) => {
    return db.accounts.get(id);
  }, []);

  const getAccountsByType = useCallback(
    (type: AccountType): Account[] => {
      return accounts?.filter((acc) => acc.type === type) || [];
    },
    [accounts]
  );

  const createAccount = useCallback(
    async (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const account = withTimestamps({ ...data, id, userId }, true);
      await db.accounts.add(account);
      return id;
    },
    [userId]
  );

  const updateAccount = useCallback(async (id: UUID, data: Partial<Account>) => {
    await db.accounts.update(id, withTimestamps(data, false));
  }, []);

  const deleteAccount = useCallback(async (id: UUID) => {
    // Check if account has transactions
    const transactionCount = await db.transactions.where({ accountId: id }).count();
    if (transactionCount > 0) {
      throw new Error('Cannot delete account with transactions. Archive it instead.');
    }
    await db.accounts.delete(id);
  }, []);

  const updateBalance = useCallback(
    async (id: UUID, amount: number, operation: 'add' | 'subtract' | 'set') => {
      const account = await db.accounts.get(id);
      if (!account) throw new Error('Account not found');

      let newBalance: number;
      switch (operation) {
        case 'add':
          newBalance = account.balance + amount;
          break;
        case 'subtract':
          newBalance = account.balance - amount;
          break;
        case 'set':
          newBalance = amount;
          break;
      }

      await db.accounts.update(id, { balance: newBalance, updatedAt: now() });
    },
    []
  );

  const getTotalBalance = useCallback((): number => {
    if (!accounts) return 0;
    return accounts.reduce((sum, acc) => {
      // Credit cards and loans have negative balance representation
      if (acc.type === AccountType.CREDIT_CARD || acc.type === AccountType.LOAN) {
        return sum - Math.abs(acc.balance);
      }
      return sum + acc.balance;
    }, 0);
  }, [accounts]);

  const archiveAccount = useCallback(async (id: UUID) => {
    await db.accounts.update(id, { isArchived: true, updatedAt: now() });
  }, []);

  return {
    accounts,
    isLoading,
    getAccount,
    getAccountsByType,
    createAccount,
    updateAccount,
    deleteAccount,
    updateBalance,
    getTotalBalance,
    archiveAccount,
  };
}

// ============================================
// useCategories Hook
// ============================================

export interface UseCategoriesReturn {
  categories: Category[] | undefined;
  expenseCategories: Category[];
  incomeCategories: Category[];
  transferCategories: Category[];
  isLoading: boolean;
  getCategory: (id: UUID) => Promise<Category | undefined>;
  getCategoryByName: (name: string, type: CategoryType) => Category | undefined;
  createCategory: (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  updateCategory: (id: UUID, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: UUID) => Promise<void>;
  archiveCategory: (id: UUID) => Promise<void>;
}

export function useCategories(userId?: UUID): UseCategoriesReturn {
  const allCategories = useLiveQuery(
    () => db.categories.toArray(),
    []
  );

  const filteredCategories = useMemo(() => {
    return allCategories?.filter((cat) => !cat.isArchived && (cat.isSystem || cat.userId === userId)) || [];
  }, [allCategories, userId]);

  const isLoading = allCategories === undefined;

  const expenseCategories = useMemo(
    () => filteredCategories.filter((cat) => cat.type === CategoryType.EXPENSE).sort((a, b) => a.sortOrder - b.sortOrder),
    [filteredCategories]
  );

  const incomeCategories = useMemo(
    () => filteredCategories.filter((cat) => cat.type === CategoryType.INCOME).sort((a, b) => a.sortOrder - b.sortOrder),
    [filteredCategories]
  );

  const transferCategories = useMemo(
    () => filteredCategories.filter((cat) => cat.type === CategoryType.TRANSFER).sort((a, b) => a.sortOrder - b.sortOrder),
    [filteredCategories]
  );

  const getCategory = useCallback(async (id: UUID) => {
    return db.categories.get(id);
  }, []);

  const getCategoryByName = useCallback(
    (name: string, type: CategoryType): Category | undefined => {
      return filteredCategories.find(
        (cat) => cat.name.toLowerCase() === name.toLowerCase() && cat.type === type
      );
    },
    [filteredCategories]
  );

  const createCategory = useCallback(
    async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const category = withTimestamps({ ...data, id }, true);
      await db.categories.add(category);
      return id;
    },
    []
  );

  const updateCategory = useCallback(async (id: UUID, data: Partial<Category>) => {
    const category = await db.categories.get(id);
    if (category?.isSystem) {
      throw new Error('Cannot modify system categories');
    }
    await db.categories.update(id, withTimestamps(data, false));
  }, []);

  const deleteCategory = useCallback(async (id: UUID) => {
    const category = await db.categories.get(id);
    if (category?.isSystem) {
      throw new Error('Cannot delete system categories');
    }
    // Check if category is used
    const transactionCount = await db.transactions.where({ categoryId: id }).count();
    if (transactionCount > 0) {
      throw new Error('Cannot delete category with transactions. Archive it instead.');
    }
    await db.categories.delete(id);
  }, []);

  const archiveCategory = useCallback(async (id: UUID) => {
    const category = await db.categories.get(id);
    if (category?.isSystem) {
      throw new Error('Cannot archive system categories');
    }
    await db.categories.update(id, { isArchived: true, updatedAt: now() });
  }, []);

  return {
    categories: filteredCategories,
    expenseCategories,
    incomeCategories,
    transferCategories,
    isLoading,
    getCategory,
    getCategoryByName,
    createCategory,
    updateCategory,
    deleteCategory,
    archiveCategory,
  };
}

// ============================================
// useTransactions Hook
// ============================================

export interface UseTransactionsReturn {
  transactions: Transaction[] | undefined;
  isLoading: boolean;
  getTransaction: (id: UUID) => Promise<Transaction | undefined>;
  getTransactionsByDateRange: (startDate: DateString, endDate: DateString) => Promise<Transaction[]>;
  createTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  updateTransaction: (id: UUID, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: UUID) => Promise<void>;
  getFilteredTransactions: (filters: TransactionFilters) => Promise<Transaction[]>;
  getRecentTransactions: (limit?: number) => Transaction[];
  getTotalByType: (type: TransactionType, startDate?: DateString, endDate?: DateString) => Promise<number>;
}

export function useTransactions(
  userId: UUID = DEFAULT_USER_ID,
  options?: {
    startDate?: DateString;
    endDate?: DateString;
    limit?: number;
    accountId?: UUID;
    categoryId?: UUID;
  }
): UseTransactionsReturn {
  const { startDate, endDate, limit = 50, accountId, categoryId } = options || {};

  const transactions = useLiveQuery(async () => {
    let query = db.transactions.where({ userId });

    if (accountId) {
      query = db.transactions.where({ userId, accountId });
    }

    if (categoryId) {
      query = db.transactions.where({ userId, categoryId });
    }

    let results = await query.reverse().sortBy('date');

    if (startDate) {
      results = results.filter((t) => t.date >= startDate);
    }

    if (endDate) {
      results = results.filter((t) => t.date <= endDate);
    }

    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }, [userId, startDate, endDate, limit, accountId, categoryId]);

  const isLoading = transactions === undefined;

  const getTransaction = useCallback(async (id: UUID) => {
    return db.transactions.get(id);
  }, []);

  const getTransactionsByDateRange = useCallback(
    async (start: DateString, end: DateString): Promise<Transaction[]> => {
      return db.transactions
        .where({ userId })
        .filter((t) => t.date >= start && t.date <= end)
        .toArray();
    },
    [userId]
  );

  const createTransaction = useCallback(
    async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const transaction = withTimestamps({ ...data, id }, true);

      await db.transaction('rw', [db.transactions, db.accounts], async () => {
        await db.transactions.add(transaction);

        // Update account balance
        const account = await db.accounts.get(data.accountId);
        if (account) {
          let newBalance = account.balance;
          if (data.type === TransactionType.EXPENSE) {
            newBalance -= data.amount;
          } else if (data.type === TransactionType.INCOME) {
            newBalance += data.amount;
          } else if (data.type === TransactionType.TRANSFER && data.toAccountId) {
            newBalance -= data.amount;
            // Update destination account
            const toAccount = await db.accounts.get(data.toAccountId);
            if (toAccount) {
              await db.accounts.update(data.toAccountId, {
                balance: toAccount.balance + data.amount,
                updatedAt: now(),
              });
            }
          }
          await db.accounts.update(data.accountId, { balance: newBalance, updatedAt: now() });
        }
      });

      return id;
    },
    []
  );

  const updateTransaction = useCallback(async (id: UUID, data: Partial<Transaction>) => {
    const oldTransaction = await db.transactions.get(id);
    if (!oldTransaction) throw new Error('Transaction not found');

    await db.transaction('rw', [db.transactions, db.accounts], async () => {
      // Reverse the old transaction's effect on balance
      const oldAccount = await db.accounts.get(oldTransaction.accountId);
      if (oldAccount) {
        let revertedBalance = oldAccount.balance;
        if (oldTransaction.type === TransactionType.EXPENSE) {
          revertedBalance += oldTransaction.amount;
        } else if (oldTransaction.type === TransactionType.INCOME) {
          revertedBalance -= oldTransaction.amount;
        } else if (oldTransaction.type === TransactionType.TRANSFER && oldTransaction.toAccountId) {
          revertedBalance += oldTransaction.amount;
          const oldToAccount = await db.accounts.get(oldTransaction.toAccountId);
          if (oldToAccount) {
            await db.accounts.update(oldTransaction.toAccountId, {
              balance: oldToAccount.balance - oldTransaction.amount,
              updatedAt: now(),
            });
          }
        }
        await db.accounts.update(oldTransaction.accountId, { balance: revertedBalance, updatedAt: now() });
      }

      // Apply the new transaction
      const newTransaction = { ...oldTransaction, ...data };
      const newAccount = await db.accounts.get(newTransaction.accountId);
      if (newAccount) {
        let newBalance = newAccount.balance;
        if (newTransaction.type === TransactionType.EXPENSE) {
          newBalance -= newTransaction.amount;
        } else if (newTransaction.type === TransactionType.INCOME) {
          newBalance += newTransaction.amount;
        } else if (newTransaction.type === TransactionType.TRANSFER && newTransaction.toAccountId) {
          newBalance -= newTransaction.amount;
          const newToAccount = await db.accounts.get(newTransaction.toAccountId);
          if (newToAccount) {
            await db.accounts.update(newTransaction.toAccountId, {
              balance: newToAccount.balance + newTransaction.amount,
              updatedAt: now(),
            });
          }
        }
        await db.accounts.update(newTransaction.accountId, { balance: newBalance, updatedAt: now() });
      }

      await db.transactions.update(id, withTimestamps(data, false));
    });
  }, []);

  const deleteTransaction = useCallback(async (id: UUID) => {
    const transaction = await db.transactions.get(id);
    if (!transaction) throw new Error('Transaction not found');

    await db.transaction('rw', [db.transactions, db.accounts], async () => {
      // Reverse the transaction's effect on balance
      const account = await db.accounts.get(transaction.accountId);
      if (account) {
        let newBalance = account.balance;
        if (transaction.type === TransactionType.EXPENSE) {
          newBalance += transaction.amount;
        } else if (transaction.type === TransactionType.INCOME) {
          newBalance -= transaction.amount;
        } else if (transaction.type === TransactionType.TRANSFER && transaction.toAccountId) {
          newBalance += transaction.amount;
          const toAccount = await db.accounts.get(transaction.toAccountId);
          if (toAccount) {
            await db.accounts.update(transaction.toAccountId, {
              balance: toAccount.balance - transaction.amount,
              updatedAt: now(),
            });
          }
        }
        await db.accounts.update(transaction.accountId, { balance: newBalance, updatedAt: now() });
      }

      await db.transactions.delete(id);
    });
  }, []);

  const getFilteredTransactions = useCallback(
    async (filters: TransactionFilters): Promise<Transaction[]> => {
      let results = await db.transactions.where({ userId }).toArray();

      if (filters.startDate) {
        results = results.filter((t) => filters.startDate && filters.startDate && t.date >= filters.startDate);
      }
      if (filters.endDate) {
        results = results.filter((t) => filters.endDate && filters.endDate && t.date <= filters.endDate);
      }
      if (filters.type) {
        results = results.filter((t) => t.type === filters.type);
      }
      if (filters.categoryIds?.length) {
        results = results.filter((t) => filters.categoryIds?.includes(t.categoryId));
      }
      if (filters.accountIds?.length) {
        results = results.filter((t) => filters.accountIds?.includes(t.accountId));
      }
      if (filters.tagIds?.length) {
        results = results.filter((t) => t.tagIds.some((tagId) => filters.tagIds?.includes(tagId)));
      }
      if (filters.minAmount !== undefined) {
        results = results.filter((t) => filters.minAmount !== undefined && filters.minAmount !== undefined && t.amount >= filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        results = results.filter((t) => filters.maxAmount !== undefined && filters.maxAmount !== undefined && t.amount <= filters.maxAmount);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        results = results.filter(
          (t) =>
            t.description.toLowerCase().includes(query) ||
            t.payee?.toLowerCase().includes(query) ||
            t.notes?.toLowerCase().includes(query)
        );
      }
      if (filters.payee) {
        results = results.filter((t) => t.payee?.toLowerCase().includes(filters.payee?.toLowerCase() || ''));
      }
      if (filters.isRecurring !== undefined) {
        results = results.filter((t) => t.isRecurring === filters.isRecurring);
      }
      if (filters.isPending !== undefined) {
        results = results.filter((t) => t.isPending === filters.isPending);
      }

      return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [userId]
  );

  const getRecentTransactions = useCallback(
    (limit = 10): Transaction[] => {
      return transactions?.slice(0, limit) || [];
    },
    [transactions]
  );

  const getTotalByType = useCallback(
    async (type: TransactionType, start?: DateString, end?: DateString): Promise<number> => {
      let results = await db.transactions.where({ userId, type }).toArray();

      if (start) {
        results = results.filter((t) => t.date >= start);
      }
      if (end) {
        results = results.filter((t) => t.date <= end);
      }

      return results.reduce((sum, t) => sum + t.amount, 0);
    },
    [userId]
  );

  return {
    transactions,
    isLoading,
    getTransaction,
    getTransactionsByDateRange,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getFilteredTransactions,
    getRecentTransactions,
    getTotalByType,
  };
}

// ============================================
// useBudgets Hook
// ============================================

export interface UseBudgetsReturn {
  budgets: Budget[] | undefined;
  isLoading: boolean;
  getBudget: (id: UUID) => Promise<Budget | undefined>;
  getActiveBudgets: () => Budget[];
  createBudget: (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  updateBudget: (id: UUID, data: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: UUID) => Promise<void>;
  updateSpent: (id: UUID, spent: number) => Promise<void>;
  archiveBudget: (id: UUID) => Promise<void>;
}

export function useBudgets(userId: UUID = DEFAULT_USER_ID): UseBudgetsReturn {
  const budgets = useLiveQuery(
    () => db.budgets.where({ userId }).filter((b) => !b.isArchived).toArray(),
    [userId]
  );

  const isLoading = budgets === undefined;

  const getBudget = useCallback(async (id: UUID) => {
    return db.budgets.get(id);
  }, []);

  const getActiveBudgets = useCallback((): Budget[] => {
    const today = new Date().toISOString().split('T')[0];
    return budgets?.filter((b) => b.startDate <= today && (!b.endDate || b.endDate >= today)) || [];
  }, [budgets]);

  const createBudget = useCallback(
    async (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const budget = withTimestamps({ ...data, id, userId }, true);
      await db.budgets.add(budget);
      return id;
    },
    [userId]
  );

  const updateBudget = useCallback(async (id: UUID, data: Partial<Budget>) => {
    await db.budgets.update(id, withTimestamps(data, false));
  }, []);

  const deleteBudget = useCallback(async (id: UUID) => {
    await db.budgets.delete(id);
  }, []);

  const updateSpent = useCallback(async (id: UUID, spent: number) => {
    await db.budgets.update(id, { spent, updatedAt: now() });
  }, []);

  const archiveBudget = useCallback(async (id: UUID) => {
    await db.budgets.update(id, { isArchived: true, updatedAt: now() });
  }, []);

  return {
    budgets,
    isLoading,
    getBudget,
    getActiveBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    updateSpent,
    archiveBudget,
  };
}

// ============================================
// useGoals Hook
// ============================================

export interface UseGoalsReturn {
  goals: Goal[] | undefined;
  isLoading: boolean;
  getGoal: (id: UUID) => Promise<Goal | undefined>;
  getActiveGoals: () => Goal[];
  createGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  updateGoal: (id: UUID, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: UUID) => Promise<void>;
  addContribution: (goalId: UUID, amount: number, note?: string) => Promise<UUID>;
  getContributions: (goalId: UUID) => Promise<GoalContribution[]>;
  completeGoal: (id: UUID) => Promise<void>;
}

export function useGoals(userId: UUID = DEFAULT_USER_ID): UseGoalsReturn {
  const goals = useLiveQuery(
    () => db.goals.where({ userId }).toArray(),
    [userId]
  );

  const isLoading = goals === undefined;

  const getGoal = useCallback(async (id: UUID) => {
    return db.goals.get(id);
  }, []);

  const getActiveGoals = useCallback((): Goal[] => {
    return goals?.filter((g) => g.status === GoalStatus.ACTIVE) || [];
  }, [goals]);

  const createGoal = useCallback(
    async (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const goal = withTimestamps({ ...data, id, userId }, true);
      await db.goals.add(goal);
      return id;
    },
    [userId]
  );

  const updateGoal = useCallback(async (id: UUID, data: Partial<Goal>) => {
    await db.goals.update(id, withTimestamps(data, false));
  }, []);

  const deleteGoal = useCallback(async (id: UUID) => {
    await db.transaction('rw', [db.goals, db.goalContributions], async () => {
      await db.goalContributions.where({ goalId: id }).delete();
      await db.goals.delete(id);
    });
  }, []);

  const addContribution = useCallback(
    async (goalId: UUID, amount: number, note?: string): Promise<UUID> => {
      const id = generateId();
      const contribution = withTimestamps({
        id,
        goalId,
        userId,
        amount,
        note,
      }, true);

      await db.transaction('rw', [db.goals, db.goalContributions], async () => {
        await db.goalContributions.add(contribution);
        const goal = await db.goals.get(goalId);
        if (goal) {
          const newAmount = goal.currentAmount + amount;
          const newStatus = newAmount >= goal.targetAmount ? GoalStatus.COMPLETED : goal.status;
          await db.goals.update(goalId, {
            currentAmount: newAmount,
            status: newStatus,
            updatedAt: now(),
          });
        }
      });

      return id;
    },
    [userId]
  );

  const getContributions = useCallback(async (goalId: UUID): Promise<GoalContribution[]> => {
    return db.goalContributions.where({ goalId }).reverse().sortBy('createdAt');
  }, []);

  const completeGoal = useCallback(async (id: UUID) => {
    await db.goals.update(id, { status: GoalStatus.COMPLETED, updatedAt: now() });
  }, []);

  return {
    goals,
    isLoading,
    getGoal,
    getActiveGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    getContributions,
    completeGoal,
  };
}

// ============================================
// useLoans Hook
// ============================================

export interface UseLoansReturn {
  loans: Loan[] | undefined;
  isLoading: boolean;
  getLoan: (id: UUID) => Promise<Loan | undefined>;
  getActiveLoans: () => Loan[];
  createLoan: (data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  updateLoan: (id: UUID, data: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: UUID) => Promise<void>;
  closeLoan: (id: UUID) => Promise<void>;
  getEMISchedule: (loanId: UUID) => Promise<EMISchedule[]>;
  createEMISchedule: (loanId: UUID, schedules: Omit<EMISchedule, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  recordEMIPayment: (payment: Omit<EMIPayment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  getUpcomingEMIs: (days?: number) => Promise<EMISchedule[]>;
  getOverdueEMIs: () => Promise<EMISchedule[]>;
  getTotalOutstanding: () => number;
  getTotalMonthlyEMI: () => number;
}

export function useLoans(userId: UUID = DEFAULT_USER_ID): UseLoansReturn {
  const loans = useLiveQuery(
    () => db.loans.where({ userId }).toArray(),
    [userId]
  );

  const isLoading = loans === undefined;

  const getLoan = useCallback(async (id: UUID) => {
    return db.loans.get(id);
  }, []);

  const getActiveLoans = useCallback((): Loan[] => {
    return loans?.filter((l) => l.status === LoanStatus.ACTIVE) || [];
  }, [loans]);

  const createLoan = useCallback(
    async (data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const loan = withTimestamps({ ...data, id, userId }, true);
      await db.loans.add(loan);
      return id;
    },
    [userId]
  );

  const updateLoan = useCallback(async (id: UUID, data: Partial<Loan>) => {
    await db.loans.update(id, withTimestamps(data, false));
  }, []);

  const deleteLoan = useCallback(async (id: UUID) => {
    await db.transaction('rw', [db.loans, db.emiSchedules, db.emiPayments], async () => {
      const schedules = await db.emiSchedules.where({ loanId: id }).toArray();
      for (const schedule of schedules) {
        await db.emiPayments.where({ emiScheduleId: schedule.id }).delete();
      }
      await db.emiSchedules.where({ loanId: id }).delete();
      await db.loans.delete(id);
    });
  }, []);

  const closeLoan = useCallback(async (id: UUID) => {
    await db.loans.update(id, {
      status: LoanStatus.CLOSED,
      closedDate: now(),
      outstandingPrincipal: 0,
      outstandingInterest: 0,
      remainingTenure: 0,
      updatedAt: now(),
    });
  }, []);

  const getEMISchedule = useCallback(async (loanId: UUID): Promise<EMISchedule[]> => {
    return db.emiSchedules.where({ loanId }).sortBy('emiNumber');
  }, []);

  const createEMISchedule = useCallback(
    async (_loanId: UUID, schedules: Omit<EMISchedule, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const schedulesWithIds = schedules.map((s) => withTimestamps({ ...s, id: generateId() }, true));
      await db.emiSchedules.bulkAdd(schedulesWithIds);
    },
    []
  );

  const recordEMIPayment = useCallback(
    async (payment: Omit<EMIPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const emiPayment = withTimestamps({ ...payment, id }, true);

      await db.transaction('rw', [db.emiPayments, db.emiSchedules, db.loans], async () => {
        await db.emiPayments.add(emiPayment);

        // Update EMI schedule status
        await db.emiSchedules.update(payment.emiScheduleId, {
          status: EMIStatus.PAID,
        });

        // Update loan outstanding and remaining tenure
        const loan = await db.loans.get(payment.loanId);
        if (loan) {
          await db.loans.update(payment.loanId, {
            outstandingPrincipal: loan.outstandingPrincipal - payment.principalPaid,
            outstandingInterest: loan.outstandingInterest - payment.interestPaid,
            remainingTenure: Math.max(0, loan.remainingTenure - 1),
            updatedAt: now(),
          });
        }
      });

      return id;
    },
    []
  );

  const getUpcomingEMIs = useCallback(async (days = 30): Promise<EMISchedule[]> => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    return db.emiSchedules
      .where('status')
      .equals(EMIStatus.PENDING)
      .filter((s) => s.dueDate >= todayStr && s.dueDate <= futureDateStr)
      .sortBy('dueDate');
  }, []);

  const getOverdueEMIs = useCallback(async (): Promise<EMISchedule[]> => {
    const today = new Date().toISOString().split('T')[0];
    return db.emiSchedules
      .where('status')
      .equals(EMIStatus.PENDING)
      .filter((s) => s.dueDate < today)
      .toArray();
  }, []);

  const getTotalOutstanding = useCallback((): number => {
    if (!loans) return 0;
    return loans
      .filter((l) => l.status === LoanStatus.ACTIVE)
      .reduce((sum, l) => sum + l.outstandingPrincipal + l.outstandingInterest, 0);
  }, [loans]);

  const getTotalMonthlyEMI = useCallback((): number => {
    if (!loans) return 0;
    return loans
      .filter((l) => l.status === LoanStatus.ACTIVE)
      .reduce((sum, l) => sum + l.emiAmount, 0);
  }, [loans]);

  return {
    loans,
    isLoading,
    getLoan,
    getActiveLoans,
    createLoan,
    updateLoan,
    deleteLoan,
    closeLoan,
    getEMISchedule,
    createEMISchedule,
    recordEMIPayment,
    getUpcomingEMIs,
    getOverdueEMIs,
    getTotalOutstanding,
    getTotalMonthlyEMI,
  };
}

// ============================================
// useInvestments Hook
// ============================================

export interface UseInvestmentsReturn {
  investments: Investment[] | undefined;
  isLoading: boolean;
  getInvestment: (id: UUID) => Promise<Investment | undefined>;
  createInvestment: (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  updateInvestment: (id: UUID, data: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: UUID) => Promise<void>;
  addInvestmentTransaction: (data: Omit<InvestmentTransaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  getInvestmentTransactions: (investmentId: UUID) => Promise<InvestmentTransaction[]>;
  getTotalInvested: () => number;
  getTotalCurrentValue: () => number;
  getTotalReturns: () => { absolute: number; percentage: number };
  getTaxSavingInvestments: () => Investment[];
}

export function useInvestments(userId: UUID = DEFAULT_USER_ID): UseInvestmentsReturn {
  const investments = useLiveQuery(
    () => db.investments.where({ userId }).toArray(),
    [userId]
  );

  const isLoading = investments === undefined;

  const getInvestment = useCallback(async (id: UUID) => {
    return db.investments.get(id);
  }, []);

  const createInvestment = useCallback(
    async (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const investment = withTimestamps({ ...data, id, userId }, true);
      await db.investments.add(investment);
      return id;
    },
    [userId]
  );

  const updateInvestment = useCallback(async (id: UUID, data: Partial<Investment>) => {
    await db.investments.update(id, withTimestamps(data, false));
  }, []);

  const deleteInvestment = useCallback(async (id: UUID) => {
    await db.transaction('rw', [db.investments, db.investmentTransactions], async () => {
      await db.investmentTransactions.where({ investmentId: id }).delete();
      await db.investments.delete(id);
    });
  }, []);

  const addInvestmentTransaction = useCallback(
    async (data: Omit<InvestmentTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const transaction = withTimestamps({ ...data, id }, true);

      await db.transaction('rw', [db.investments, db.investmentTransactions], async () => {
        await db.investmentTransactions.add(transaction);

        // Update investment holdings
        const investment = await db.investments.get(data.investmentId);
        if (investment) {
          let newQuantity = investment.quantity;
          let newInvestedAmount = investment.investedAmount;

          if (data.type === 'buy' || data.type === 'sip') {
            newQuantity += data.quantity;
            newInvestedAmount += data.amount;
          } else if (data.type === 'sell') {
            newQuantity -= data.quantity;
            newInvestedAmount -= data.amount;
          }

          const newAvgPrice = newQuantity > 0 ? newInvestedAmount / newQuantity : 0;
          const newCurrentValue = newQuantity * investment.currentPrice;

          await db.investments.update(data.investmentId, {
            quantity: newQuantity,
            avgBuyPrice: newAvgPrice,
            investedAmount: newInvestedAmount,
            currentValue: newCurrentValue,
            updatedAt: now(),
          });
        }
      });

      return id;
    },
    []
  );

  const getInvestmentTransactions = useCallback(async (investmentId: UUID): Promise<InvestmentTransaction[]> => {
    return db.investmentTransactions.where({ investmentId }).reverse().sortBy('date');
  }, []);

  const getTotalInvested = useCallback((): number => {
    if (!investments) return 0;
    return investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  }, [investments]);

  const getTotalCurrentValue = useCallback((): number => {
    if (!investments) return 0;
    return investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  }, [investments]);

  const getTotalReturns = useCallback((): { absolute: number; percentage: number } => {
    const invested = getTotalInvested();
    const current = getTotalCurrentValue();
    const absolute = current - invested;
    const percentage = invested > 0 ? (absolute / invested) * 100 : 0;
    return { absolute, percentage };
  }, [getTotalInvested, getTotalCurrentValue]);

  const getTaxSavingInvestments = useCallback((): Investment[] => {
    return investments?.filter((inv) => inv.isTaxSaving) || [];
  }, [investments]);

  return {
    investments,
    isLoading,
    getInvestment,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    addInvestmentTransaction,
    getInvestmentTransactions,
    getTotalInvested,
    getTotalCurrentValue,
    getTotalReturns,
    getTaxSavingInvestments,
  };
}

// ============================================
// useTags Hook
// ============================================

export interface UseTagsReturn {
  tags: Tag[] | undefined;
  isLoading: boolean;
  getTag: (id: UUID) => Promise<Tag | undefined>;
  createTag: (data: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  updateTag: (id: UUID, data: Partial<Tag>) => Promise<void>;
  deleteTag: (id: UUID) => Promise<void>;
  incrementUsage: (id: UUID) => Promise<void>;
  getPopularTags: (limit?: number) => Tag[];
}

export function useTags(userId: UUID = DEFAULT_USER_ID): UseTagsReturn {
  const tags = useLiveQuery(
    () => db.tags.where({ userId }).sortBy('usageCount'),
    [userId]
  );

  const isLoading = tags === undefined;

  const getTag = useCallback(async (id: UUID) => {
    return db.tags.get(id);
  }, []);

  const createTag = useCallback(
    async (data: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const tag = withTimestamps({ ...data, id, userId }, true);
      await db.tags.add(tag);
      return id;
    },
    [userId]
  );

  const updateTag = useCallback(async (id: UUID, data: Partial<Tag>) => {
    await db.tags.update(id, withTimestamps(data, false));
  }, []);

  const deleteTag = useCallback(async (id: UUID) => {
    await db.tags.delete(id);
  }, []);

  const incrementUsage = useCallback(async (id: UUID) => {
    const tag = await db.tags.get(id);
    if (tag) {
      await db.tags.update(id, {
        usageCount: tag.usageCount + 1,
        lastUsedAt: now(),
        updatedAt: now(),
      });
    }
  }, []);

  const getPopularTags = useCallback(
    (limit = 10): Tag[] => {
      return [...(tags || [])].sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
    },
    [tags]
  );

  return {
    tags,
    isLoading,
    getTag,
    createTag,
    updateTag,
    deleteTag,
    incrementUsage,
    getPopularTags,
  };
}

// ============================================
// useRecurringTransactions Hook
// ============================================

export interface UseRecurringTransactionsReturn {
  recurringTransactions: RecurringTransaction[] | undefined;
  isLoading: boolean;
  getRecurringTransaction: (id: UUID) => Promise<RecurringTransaction | undefined>;
  getActiveRecurring: () => RecurringTransaction[];
  getDueRecurring: () => RecurringTransaction[];
  createRecurringTransaction: (data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  updateRecurringTransaction: (id: UUID, data: Partial<RecurringTransaction>) => Promise<void>;
  deleteRecurringTransaction: (id: UUID) => Promise<void>;
  pauseRecurring: (id: UUID) => Promise<void>;
  resumeRecurring: (id: UUID) => Promise<void>;
  processRecurring: (id: UUID) => Promise<UUID>;
}

export function useRecurringTransactions(userId: UUID = DEFAULT_USER_ID): UseRecurringTransactionsReturn {
  const recurringTransactions = useLiveQuery(
    () => db.recurringTransactions.where({ userId }).toArray(),
    [userId]
  );

  const isLoading = recurringTransactions === undefined;

  const getRecurringTransaction = useCallback(async (id: UUID) => {
    return db.recurringTransactions.get(id);
  }, []);

  const getActiveRecurring = useCallback((): RecurringTransaction[] => {
    return recurringTransactions?.filter((r) => r.isActive) || [];
  }, [recurringTransactions]);

  const getDueRecurring = useCallback((): RecurringTransaction[] => {
    const today = new Date().toISOString().split('T')[0];
    return recurringTransactions?.filter((r) => r.isActive && r.nextOccurrence <= today) || [];
  }, [recurringTransactions]);

  const createRecurringTransaction = useCallback(
    async (data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const recurring = withTimestamps({ ...data, id, userId }, true);
      await db.recurringTransactions.add(recurring);
      return id;
    },
    [userId]
  );

  const updateRecurringTransaction = useCallback(async (id: UUID, data: Partial<RecurringTransaction>) => {
    await db.recurringTransactions.update(id, withTimestamps(data, false));
  }, []);

  const deleteRecurringTransaction = useCallback(async (id: UUID) => {
    await db.recurringTransactions.delete(id);
  }, []);

  const pauseRecurring = useCallback(async (id: UUID) => {
    await db.recurringTransactions.update(id, { isActive: false, updatedAt: now() });
  }, []);

  const resumeRecurring = useCallback(async (id: UUID) => {
    await db.recurringTransactions.update(id, { isActive: true, updatedAt: now() });
  }, []);

  const processRecurring = useCallback(async (id: UUID): Promise<UUID> => {
    const recurring = await db.recurringTransactions.get(id);
    if (!recurring) throw new Error('Recurring transaction not found');

    // Create the actual transaction
    const transactionId = generateId();
    const transaction = withTimestamps({
      id: transactionId,
      userId: recurring.userId,
      type: recurring.type,
      amount: recurring.amount,
      currency: recurring.currency,
      accountId: recurring.accountId,
      toAccountId: recurring.toAccountId,
      categoryId: recurring.categoryId,
      description: recurring.name,
      payee: recurring.payee,
      notes: recurring.notes,
      date: recurring.nextOccurrence,
      tagIds: [],
      attachments: [],
      isRecurring: true,
      recurringId: id,
      isFamilyTransaction: false,
      isPending: false,
      isExcludedFromStats: false,
    }, true);

    // Calculate next occurrence based on frequency
    const nextDate = new Date(recurring.nextOccurrence);
    switch (recurring.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    await db.transaction('rw', [db.transactions, db.recurringTransactions, db.accounts], async () => {
      await db.transactions.add(transaction);

      // Update account balance
      const account = await db.accounts.get(recurring.accountId);
      if (account) {
        let newBalance = account.balance;
        if (recurring.type === TransactionType.EXPENSE) {
          newBalance -= recurring.amount;
        } else if (recurring.type === TransactionType.INCOME) {
          newBalance += recurring.amount;
        }
        await db.accounts.update(recurring.accountId, { balance: newBalance, updatedAt: now() });
      }

      // Update recurring transaction
      await db.recurringTransactions.update(id, {
        lastCreatedDate: recurring.nextOccurrence,
        nextOccurrence: nextDate.toISOString().split('T')[0],
        totalCreated: recurring.totalCreated + 1,
        updatedAt: now(),
      });
    });

    return transactionId;
  }, []);

  return {
    recurringTransactions,
    isLoading,
    getRecurringTransaction,
    getActiveRecurring,
    getDueRecurring,
    createRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    pauseRecurring,
    resumeRecurring,
    processRecurring,
  };
}

// ============================================
// useInsights Hook
// ============================================

export interface UseInsightsReturn {
  insights: Insight[] | undefined;
  unreadInsights: Insight[];
  isLoading: boolean;
  getInsight: (id: UUID) => Promise<Insight | undefined>;
  createInsight: (data: Omit<Insight, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  markAsRead: (id: UUID) => Promise<void>;
  dismissInsight: (id: UUID) => Promise<void>;
  markAsActedUpon: (id: UUID) => Promise<void>;
  clearOldInsights: (olderThanDays?: number) => Promise<number>;
}

export function useInsights(userId: UUID = DEFAULT_USER_ID): UseInsightsReturn {
  const insights = useLiveQuery(
    () =>
      db.insights
        .where({ userId })
        .filter((i) => !i.isDismissed)
        .reverse()
        .sortBy('createdAt'),
    [userId]
  );

  const isLoading = insights === undefined;

  const unreadInsights = useMemo(() => {
    return insights?.filter((i) => !i.isRead) || [];
  }, [insights]);

  const getInsight = useCallback(async (id: UUID) => {
    return db.insights.get(id);
  }, []);

  const createInsight = useCallback(
    async (data: Omit<Insight, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const insight = withTimestamps({ ...data, id, userId }, true);
      await db.insights.add(insight);
      return id;
    },
    [userId]
  );

  const markAsRead = useCallback(async (id: UUID) => {
    await db.insights.update(id, { isRead: true, updatedAt: now() });
  }, []);

  const dismissInsight = useCallback(async (id: UUID) => {
    await db.insights.update(id, { isDismissed: true, updatedAt: now() });
  }, []);

  const markAsActedUpon = useCallback(async (id: UUID) => {
    await db.insights.update(id, { isActedUpon: true, isRead: true, updatedAt: now() });
  }, []);

  const clearOldInsights = useCallback(async (olderThanDays = 30): Promise<number> => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffStr = cutoffDate.toISOString();

    const oldInsights = await db.insights
      .where({ userId })
      .filter((i) => i.createdAt < cutoffStr && (i.isDismissed || i.isActedUpon))
      .toArray();

    await db.insights.bulkDelete(oldInsights.map((i) => i.id));
    return oldInsights.length;
  }, [userId]);

  return {
    insights,
    unreadInsights,
    isLoading,
    getInsight,
    createInsight,
    markAsRead,
    dismissInsight,
    markAsActedUpon,
    clearOldInsights,
  };
}

// ============================================
// useNotifications Hook
// ============================================

export interface UseNotificationsReturn {
  notifications: Notification[] | undefined;
  unreadCount: number;
  isLoading: boolean;
  getNotification: (id: UUID) => Promise<Notification | undefined>;
  createNotification: (data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UUID>;
  markAsRead: (id: UUID) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: UUID) => Promise<void>;
  clearOldNotifications: (olderThanDays?: number) => Promise<number>;
}

export function useNotifications(userId: UUID = DEFAULT_USER_ID): UseNotificationsReturn {
  const notifications = useLiveQuery(
    () => db.notifications.where({ userId }).reverse().sortBy('createdAt'),
    [userId]
  );

  const isLoading = notifications === undefined;

  const unreadCount = useMemo(() => {
    return notifications?.filter((n) => !n.isRead).length || 0;
  }, [notifications]);

  const getNotification = useCallback(async (id: UUID) => {
    return db.notifications.get(id);
  }, []);

  const createNotification = useCallback(
    async (data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<UUID> => {
      const id = generateId();
      const notification = withTimestamps({ ...data, id, userId }, true);
      await db.notifications.add(notification);
      return id;
    },
    [userId]
  );

  const markAsRead = useCallback(async (id: UUID) => {
    await db.notifications.update(id, { isRead: true, readAt: now(), updatedAt: now() });
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = await db.notifications.where({ userId }).filter((n) => !n.isRead).toArray();
    const timestamp = now();
    for (const n of unread) {
      await db.notifications.update(n.id, { isRead: true, readAt: timestamp, updatedAt: timestamp });
    }
  }, [userId]);

  const deleteNotification = useCallback(async (id: UUID) => {
    await db.notifications.delete(id);
  }, []);

  const clearOldNotifications = useCallback(
    async (olderThanDays = 30): Promise<number> => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffStr = cutoffDate.toISOString();

      const oldNotifications = await db.notifications
        .where({ userId })
        .filter((n) => n.createdAt < cutoffStr && n.isRead)
        .toArray();

      await db.notifications.bulkDelete(oldNotifications.map((n) => n.id));
      return oldNotifications.length;
    },
    [userId]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    getNotification,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearOldNotifications,
  };
}

// ============================================
// useAppSettings Hook
// ============================================

export interface UseAppSettingsReturn {
  settings: AppSettings | undefined;
  isLoading: boolean;
  updateSettings: (data: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export function useAppSettings(): UseAppSettingsReturn {
  const settings = useLiveQuery(() => db.appSettings.get('app_settings'), []);

  const isLoading = settings === undefined;

  const updateSettings = useCallback(async (data: Partial<AppSettings>) => {
    const existing = await db.appSettings.get('app_settings');
    if (existing) {
      await db.appSettings.update('app_settings', data);
    } else {
      await db.appSettings.add({ id: 'app_settings', ...data } as AppSettings);
    }
  }, []);

  const resetSettings = useCallback(async () => {
    const { defaultAppSettings } = await import('./seed');
    await db.appSettings.put(defaultAppSettings);
  }, []);

  return {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
  };
}
