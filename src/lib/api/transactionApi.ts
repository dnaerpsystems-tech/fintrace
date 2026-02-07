/**
 * Transaction API
 * API wrapper for transaction-related endpoints
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  date: string;
  description: string | null;
  notes: string | null;
  payee: string | null;
  location: string | null;
  isRecurring: boolean;
  recurringId: string | null;
  attachments: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Relations
  account?: {
    id: string;
    name: string;
    type: string;
  };
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export interface CreateTransactionDto {
  accountId: string;
  categoryId: string;
  type: Transaction['type'];
  amount: number;
  date: string;
  description?: string;
  notes?: string;
  payee?: string;
  location?: string;
  isRecurring?: boolean;
  recurringId?: string;
  attachments?: string[];
  tags?: string[];
}

export interface UpdateTransactionDto extends Partial<CreateTransactionDto> {}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: Transaction['type'];
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  transactionCount: number;
  averageTransaction: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  byDay: Array<{
    date: string;
    income: number;
    expense: number;
  }>;
}

// =============================================================================
// API Functions
// =============================================================================

export const transactionApi = {
  /**
   * Get transactions with optional filters
   */
  async getAll(filters?: TransactionFilters): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch transactions.');
    }
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/transactions${query}`);
  },

  /**
   * Get transaction by ID
   */
  async getById(id: string): Promise<Transaction> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch transaction.');
    }
    return api.get<Transaction>(`/transactions/${id}`);
  },

  /**
   * Create a new transaction
   */
  async create(data: CreateTransactionDto): Promise<Transaction> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot create transaction.');
    }
    return api.post<Transaction>('/transactions', data);
  },

  /**
   * Update a transaction
   */
  async update(id: string, data: UpdateTransactionDto): Promise<Transaction> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update transaction.');
    }
    return api.put<Transaction>(`/transactions/${id}`, data);
  },

  /**
   * Delete a transaction
   */
  async delete(id: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete transaction.');
    }
    return api.delete(`/transactions/${id}`);
  },

  /**
   * Get transaction statistics
   */
  async getStats(startDate?: string, endDate?: string): Promise<TransactionStats> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch stats.');
    }
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<TransactionStats>(`/transactions/stats${query}`);
  },

  /**
   * Bulk delete transactions
   */
  async bulkDelete(ids: string[]): Promise<{ deleted: number }> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete transactions.');
    }
    return api.post<{ deleted: number }>('/transactions/bulk-delete', { ids });
  },
};

export default transactionApi;
