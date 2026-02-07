/**
 * Budget API
 * API wrapper for budget-related endpoints
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface Budget {
  id: string;
  name: string;
  categoryId: string | null;
  amount: number;
  spent: number;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string | null;
  alertThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export interface CreateBudgetDto {
  name: string;
  categoryId?: string;
  amount: number;
  period: Budget['period'];
  startDate: string;
  endDate?: string;
  alertThreshold?: number;
}

export interface UpdateBudgetDto extends Partial<CreateBudgetDto> {
  isActive?: boolean;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  budgetsCount: number;
  overBudgetCount: number;
  budgets: Array<{
    id: string;
    name: string;
    amount: number;
    spent: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger' | 'over';
  }>;
}

// =============================================================================
// API Functions
// =============================================================================

export const budgetApi = {
  /**
   * Get all budgets
   */
  async getAll(): Promise<Budget[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch budgets.');
    }
    return api.get<Budget[]>('/budgets');
  },

  /**
   * Get budget by ID
   */
  async getById(id: string): Promise<Budget> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch budget.');
    }
    return api.get<Budget>(`/budgets/${id}`);
  },

  /**
   * Create a new budget
   */
  async create(data: CreateBudgetDto): Promise<Budget> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot create budget.');
    }
    return api.post<Budget>('/budgets', data);
  },

  /**
   * Update a budget
   */
  async update(id: string, data: UpdateBudgetDto): Promise<Budget> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update budget.');
    }
    return api.put<Budget>(`/budgets/${id}`, data);
  },

  /**
   * Delete a budget
   */
  async delete(id: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete budget.');
    }
    return api.delete(`/budgets/${id}`);
  },

  /**
   * Get budget summary
   */
  async getSummary(period?: string): Promise<BudgetSummary> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch summary.');
    }
    const query = period ? `?period=${period}` : '';
    return api.get<BudgetSummary>(`/budgets/summary${query}`);
  },
};

export default budgetApi;
