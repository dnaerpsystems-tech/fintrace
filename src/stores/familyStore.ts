/**
 * Family Store
 * Manages family/workspace state
 */

import { create } from 'zustand';
import {
  familyApi,
  type Family,
  type FamilyMember,
  type FamilyInvite,
  ApiRequestError,
} from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface FamilyState {
  // Data
  family: Family | null;
  members: FamilyMember[];
  pendingInvites: FamilyInvite[];

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFamily: () => Promise<void>;
  sendInvite: (email: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER') => Promise<void>;
  cancelInvite: (inviteId: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER') => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  leaveFamily: () => Promise<void>;
  transferOwnership: (newOwnerId: string) => Promise<void>;
  clearError: () => void;
}

// =============================================================================
// Store
// =============================================================================

export const useFamilyStore = create<FamilyState>((set, get) => ({
  // Initial state
  family: null,
  members: [],
  pendingInvites: [],
  isLoading: false,
  error: null,

  /**
   * Fetch family details
   */
  fetchFamily: async () => {
    set({ isLoading: true, error: null });

    try {
      const family = await familyApi.getFamily();
      set({
        family,
        members: family.members,
        pendingInvites: family.pendingInvites,
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Failed to load family details';
      set({ isLoading: false, error: message });
    }
  },

  /**
   * Send invite to a new member
   */
  sendInvite: async (email, role) => {
    set({ isLoading: true, error: null });

    try {
      const invite = await familyApi.sendInvite({ email, role });
      set((state) => ({
        pendingInvites: [...state.pendingInvites, invite],
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Failed to send invite';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Cancel a pending invite
   */
  cancelInvite: async (inviteId) => {
    set({ isLoading: true, error: null });

    try {
      await familyApi.cancelInvite(inviteId);
      set((state) => ({
        pendingInvites: state.pendingInvites.filter((i) => i.id !== inviteId),
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Failed to cancel invite';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Update member role
   */
  updateMemberRole: async (memberId, role) => {
    set({ isLoading: true, error: null });

    try {
      const updatedMember = await familyApi.updateMemberRole(memberId, { role });
      set((state) => ({
        members: state.members.map((m) =>
          m.id === memberId ? updatedMember : m
        ),
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Failed to update member role';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Remove a member from family
   */
  removeMember: async (memberId) => {
    set({ isLoading: true, error: null });

    try {
      await familyApi.removeMember(memberId);
      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Failed to remove member';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Leave the family
   */
  leaveFamily: async () => {
    set({ isLoading: true, error: null });

    try {
      await familyApi.leaveFamily();
      set({
        family: null,
        members: [],
        pendingInvites: [],
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Failed to leave family';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Transfer ownership to another member
   */
  transferOwnership: async (newOwnerId) => {
    set({ isLoading: true, error: null });

    try {
      await familyApi.transferOwnership(newOwnerId);
      // Refresh family data
      await get().fetchFamily();
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Failed to transfer ownership';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
}));

// =============================================================================
// Selectors
// =============================================================================

export const selectFamily = (state: FamilyState) => state.family;
export const selectMembers = (state: FamilyState) => state.members;
export const selectPendingInvites = (state: FamilyState) => state.pendingInvites;
export const selectMemberCount = (state: FamilyState) => state.members.length;
export const selectInviteCount = (state: FamilyState) => state.pendingInvites.length;

export default useFamilyStore;
