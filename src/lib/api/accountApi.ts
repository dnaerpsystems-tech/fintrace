/**
 * Account API
 * API wrapper for account-related endpoints
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface Account {
  id: string;
  name: string;
  type: 'BANK' | 'CASH' | 'CREDIT_CARD' | 'WALLET' | 'INVESTMENT' | 'LOAN' | 'OTHER';
  balance: number;
  currency: string;
  color: string | null;
  icon: string | null;
  institution: string | null;
  accountNumber: string | null;
  includeInTotal: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountDto {
  name: string;
  type: Account['type'];
  balance?: number;
  currency?: string;
  color?: string;
  icon?: string;
  institution?: string;
  accountNumber?: string;
  includeInTotal?: boolean;
}

export interface UpdateAccountDto extends Partial<CreateAccountDto> {
  isArchived?: boolean;
}

export interface AccountSummary {
  totalBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  accountsByType: Record<string, { count: number; balance: number }>;
}

// =============================================================================
// API Functions
// =============================================================================

export const accountApi = {
  /**
   * Get all accounts
   */
  async getAll(): Promise<Account[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch accounts.');
    }
    return api.get<Account[]>('/accounts');
  },

  /**
   * Get account by ID
   */
  async getById(id: string): Promise<Account> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch account.');
    }
    return api.get<Account>(`/accounts/${id}`);
  },

  /**
   * Create a new account
   */
  async create(data: CreateAccountDto): Promise<Account> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot create account.');
    }
    return api.post<Account>('/accounts', data);
  },

  /**
   * Update an account
   */
  async update(id: string, data: UpdateAccountDto): Promise<Account> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update account.');
    }
    return api.put<Account>(`/accounts/${id}`, data);
  },

  /**
   * Delete an account
   */
  async delete(id: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete account.');
    }
    return api.delete(`/accounts/${id}`);
  },

  /**
   * Get account summary (totals and breakdown)
   */
  async getSummary(): Promise<AccountSummary> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch summary.');
    }
    return api.get<AccountSummary>('/accounts/summary');
  },

  /**
   * Transfer between accounts
   */
  async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description?: string
  ): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot transfer.');
    }
    return api.post('/accounts/transfer', {
      fromAccountId,
      toAccountId,
      amount,
      description,
    });
  },
};

export default accountApi;
