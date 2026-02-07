/**
 * Goal API
 * API wrapper for goal-related endpoints
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  icon: string;
  color: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  linkedAccountId: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed
  progress?: number;
  monthlyRequired?: number;
  isOnTrack?: boolean;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateGoalDto {
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  icon?: string;
  color?: string;
  priority?: Goal['priority'];
  linkedAccountId?: string;
}

export interface UpdateGoalDto extends Partial<CreateGoalDto> {
  status?: Goal['status'];
}

export interface AddContributionDto {
  amount: number;
  date?: string;
  notes?: string;
}

// =============================================================================
// API Functions
// =============================================================================

export const goalApi = {
  /**
   * Get all goals
   */
  async getAll(): Promise<Goal[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch goals.');
    }
    return api.get<Goal[]>('/goals');
  },

  /**
   * Get goal by ID
   */
  async getById(id: string): Promise<Goal> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch goal.');
    }
    return api.get<Goal>(`/goals/${id}`);
  },

  /**
   * Create a new goal
   */
  async create(data: CreateGoalDto): Promise<Goal> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot create goal.');
    }
    return api.post<Goal>('/goals', data);
  },

  /**
   * Update a goal
   */
  async update(id: string, data: UpdateGoalDto): Promise<Goal> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update goal.');
    }
    return api.put<Goal>(`/goals/${id}`, data);
  },

  /**
   * Delete a goal
   */
  async delete(id: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete goal.');
    }
    return api.delete(`/goals/${id}`);
  },

  /**
   * Add contribution to goal
   */
  async addContribution(goalId: string, data: AddContributionDto): Promise<GoalContribution> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot add contribution.');
    }
    return api.post<GoalContribution>(`/goals/${goalId}/contributions`, data);
  },

  /**
   * Get contributions for a goal
   */
  async getContributions(goalId: string): Promise<GoalContribution[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch contributions.');
    }
    return api.get<GoalContribution[]>(`/goals/${goalId}/contributions`);
  },

  /**
   * Delete a contribution
   */
  async deleteContribution(goalId: string, contributionId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete contribution.');
    }
    return api.delete(`/goals/${goalId}/contributions/${contributionId}`);
  },
};

export default goalApi;
