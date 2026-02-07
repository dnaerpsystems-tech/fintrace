/**
 * Family API
 * API wrapper for family/workspace management endpoints
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface FamilyMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  avatarUrl: string | null;
}

export interface FamilyInvite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  members: FamilyMember[];
  pendingInvites: FamilyInvite[];
  createdAt: string;
  updatedAt: string;
}

export interface SendInviteDto {
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface UpdateMemberRoleDto {
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

// =============================================================================
// API Functions
// =============================================================================

export const familyApi = {
  /**
   * Get family details
   */
  async getFamily(): Promise<Family> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch family.');
    }
    return api.get<Family>('/family');
  },

  /**
   * Send invite to a new member
   */
  async sendInvite(data: SendInviteDto): Promise<FamilyInvite> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot send invite.');
    }
    return api.post<FamilyInvite>('/family/invite', data);
  },

  /**
   * Accept an invite (by token from email)
   */
  async acceptInvite(token: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot accept invite.');
    }
    return api.post(`/family/invites/${token}/accept`, {});
  },

  /**
   * Cancel a pending invite
   */
  async cancelInvite(inviteId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot cancel invite.');
    }
    return api.delete(`/family/invites/${inviteId}`);
  },

  /**
   * Update member role
   */
  async updateMemberRole(memberId: string, data: UpdateMemberRoleDto): Promise<FamilyMember> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update member.');
    }
    return api.put<FamilyMember>(`/family/members/${memberId}`, data);
  },

  /**
   * Remove a member from family
   */
  async removeMember(memberId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot remove member.');
    }
    return api.delete(`/family/members/${memberId}`);
  },

  /**
   * Leave the family (for non-owners)
   */
  async leaveFamily(): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot leave family.');
    }
    return api.post('/family/leave', {});
  },

  /**
   * Transfer ownership to another member
   */
  async transferOwnership(newOwnerId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot transfer ownership.');
    }
    return api.post('/family/transfer-ownership', { newOwnerId });
  },
};

export default familyApi;
