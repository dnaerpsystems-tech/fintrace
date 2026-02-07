/**
 * Sync API
 * API wrapper for data synchronization endpoints
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface SyncChange {
  id: string;
  entityType: 'account' | 'transaction' | 'category' | 'budget' | 'goal' | 'loan' | 'investment';
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  clientTimestamp: string;
  serverTimestamp?: string;
}

export interface SyncPushRequest {
  changes: SyncChange[];
  lastSyncTimestamp: string;
}

export interface SyncPushResponse {
  processed: number;
  conflicts: SyncConflict[];
  serverTimestamp: string;
}

export interface SyncPullRequest {
  lastSyncTimestamp: string;
  entityTypes?: string[];
}

export interface SyncPullResponse {
  changes: SyncChange[];
  serverTimestamp: string;
  hasMore: boolean;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localChange: SyncChange;
  serverChange: SyncChange;
  resolvedAt: string | null;
  resolution: 'LOCAL' | 'SERVER' | 'MERGE' | null;
}

export interface SyncStatus {
  lastSyncTimestamp: string | null;
  pendingChanges: number;
  conflicts: number;
  isFullSyncRequired: boolean;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'LOCAL' | 'SERVER' | 'MERGE';
  mergedData?: Record<string, unknown>;
}

// =============================================================================
// API Functions
// =============================================================================

export const syncApi = {
  /**
   * Push local changes to server
   */
  async push(request: SyncPushRequest): Promise<SyncPushResponse> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot sync.');
    }
    return api.post<SyncPushResponse>('/sync/push', request);
  },

  /**
   * Pull changes from server
   */
  async pull(request: SyncPullRequest): Promise<SyncPullResponse> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot sync.');
    }
    return api.post<SyncPullResponse>('/sync/pull', request);
  },

  /**
   * Get sync status
   */
  async getStatus(): Promise<SyncStatus> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot get status.');
    }
    return api.get<SyncStatus>('/sync/status');
  },

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(resolution: ConflictResolution): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot resolve conflict.');
    }
    return api.post(`/sync/conflicts/${resolution.conflictId}/resolve`, {
      resolution: resolution.resolution,
      mergedData: resolution.mergedData,
    });
  },

  /**
   * Get all unresolved conflicts
   */
  async getConflicts(): Promise<SyncConflict[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot get conflicts.');
    }
    return api.get<SyncConflict[]>('/sync/conflicts');
  },

  /**
   * Force full sync (clear local and pull all data)
   */
  async fullSync(): Promise<SyncPullResponse> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot sync.');
    }
    return api.post<SyncPullResponse>('/sync/full', {});
  },
};

export default syncApi;
