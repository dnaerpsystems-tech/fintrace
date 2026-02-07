/**
 * Category API
 * API wrapper for category-related endpoints
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'INCOME' | 'EXPENSE' | 'BOTH';
  parentId: string | null;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  icon: string;
  color: string;
  type: Category['type'];
  parentId?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  isArchived?: boolean;
}

// =============================================================================
// API Functions
// =============================================================================

export const categoryApi = {
  /**
   * Get all categories
   */
  async getAll(): Promise<Category[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch categories.');
    }
    return api.get<Category[]>('/categories');
  },

  /**
   * Get category by ID
   */
  async getById(id: string): Promise<Category> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch category.');
    }
    return api.get<Category>(`/categories/${id}`);
  },

  /**
   * Create a new category
   */
  async create(data: CreateCategoryDto): Promise<Category> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot create category.');
    }
    return api.post<Category>('/categories', data);
  },

  /**
   * Update a category
   */
  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update category.');
    }
    return api.put<Category>(`/categories/${id}`, data);
  },

  /**
   * Delete a category (only custom categories)
   */
  async delete(id: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete category.');
    }
    return api.delete(`/categories/${id}`);
  },
};

export default categoryApi;
