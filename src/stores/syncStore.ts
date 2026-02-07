/**
 * Sync Store
 * Manages data synchronization state between local and server
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { syncApi, type SyncChange, type SyncConflict, networkStatus } from '@/lib/api';
import { db } from '@/db';

// =============================================================================
// Types
// =============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface PendingChange {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}

export interface SyncState {
  // Status
  status: SyncStatus;
  lastSyncTimestamp: string | null;
  isOnline: boolean;

  // Pending changes
  pendingChanges: PendingChange[];
  pendingCount: number;

  // Conflicts
  conflicts: SyncConflict[];
  conflictCount: number;

  // Error
  error: string | null;

  // Actions
  initialize: () => void;
  queueChange: (change: Omit<PendingChange, 'id' | 'timestamp' | 'retryCount'>) => void;
  sync: () => Promise<void>;
  pullChanges: () => Promise<void>;
  pushChanges: () => Promise<void>;
  resolveConflict: (
    conflictId: string,
    resolution: 'LOCAL' | 'SERVER' | 'MERGE',
    mergedData?: Record<string, unknown>
  ) => Promise<void>;
  clearError: () => void;
  forceFullSync: () => Promise<void>;
}

// =============================================================================
// Store
// =============================================================================

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: 'idle',
      lastSyncTimestamp: null,
      isOnline: true,
      pendingChanges: [],
      pendingCount: 0,
      conflicts: [],
      conflictCount: 0,
      error: null,

      /**
       * Initialize sync store and set up network listeners
       */
      initialize: () => {
        // Set initial online status
        set({ isOnline: networkStatus.isOnline() });

        // Subscribe to network changes
        networkStatus.subscribe((online) => {
          set({ isOnline: online });

          // Auto-sync when coming back online
          if (online && get().pendingChanges.length > 0) {
            get().sync();
          }
        });
      },

      /**
       * Queue a change for sync
       */
      queueChange: (change) => {
        const newChange: PendingChange = {
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...change,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        };

        set((state) => ({
          pendingChanges: [...state.pendingChanges, newChange],
          pendingCount: state.pendingCount + 1,
        }));

        // Auto-sync if online
        if (get().isOnline) {
          // Debounce sync to batch changes
          setTimeout(() => {
            if (get().isOnline && get().status === 'idle') {
              get().sync();
            }
          }, 2000);
        }
      },

      /**
       * Full sync (push then pull)
       */
      sync: async () => {
        const { isOnline, status } = get();

        if (!isOnline) {
          set({ status: 'offline' });
          return;
        }

        if (status === 'syncing') return;

        set({ status: 'syncing', error: null });

        try {
          // Push local changes first
          await get().pushChanges();

          // Then pull remote changes
          await get().pullChanges();

          set({
            status: 'idle',
            lastSyncTimestamp: new Date().toISOString(),
          });
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof Error ? error.message : 'Sync failed',
          });
        }
      },

      /**
       * Push local changes to server
       */
      pushChanges: async () => {
        const { pendingChanges, lastSyncTimestamp } = get();

        if (pendingChanges.length === 0) return;

        try {
          const changes: SyncChange[] = pendingChanges.map((pc) => ({
            id: pc.id,
            entityType: pc.entityType as SyncChange['entityType'],
            entityId: pc.entityId,
            operation: pc.operation,
            data: pc.data,
            clientTimestamp: pc.timestamp,
          }));

          const response = await syncApi.push({
            changes,
            lastSyncTimestamp: lastSyncTimestamp || new Date(0).toISOString(),
          });

          // Remove successfully pushed changes
          const pushedIds = new Set(pendingChanges.map((c) => c.id));
          set((state) => ({
            pendingChanges: state.pendingChanges.filter((c) => !pushedIds.has(c.id)),
            pendingCount: 0,
            lastSyncTimestamp: response.serverTimestamp,
          }));

          // Handle conflicts
          if (response.conflicts.length > 0) {
            set((state) => ({
              conflicts: [...state.conflicts, ...response.conflicts],
              conflictCount: state.conflictCount + response.conflicts.length,
            }));
          }
        } catch (error) {
          // Increment retry count for failed changes
          set((state) => ({
            pendingChanges: state.pendingChanges.map((c) => ({
              ...c,
              retryCount: c.retryCount + 1,
            })),
          }));
          throw error;
        }
      },

      /**
       * Pull changes from server
       */
      pullChanges: async () => {
        const { lastSyncTimestamp } = get();

        try {
          const response = await syncApi.pull({
            lastSyncTimestamp: lastSyncTimestamp || new Date(0).toISOString(),
          });

          // Apply changes to local database
          for (const change of response.changes) {
            await applyChangeToLocal(change);
          }

          set({ lastSyncTimestamp: response.serverTimestamp });

          // Handle pagination if there are more changes
          if (response.hasMore) {
            await get().pullChanges();
          }
        } catch (error) {
          throw error;
        }
      },

      /**
       * Resolve a sync conflict
       */
      resolveConflict: async (conflictId, resolution, mergedData) => {
        try {
          await syncApi.resolveConflict({
            conflictId,
            resolution,
            mergedData,
          });

          // Remove resolved conflict
          set((state) => ({
            conflicts: state.conflicts.filter((c) => c.id !== conflictId),
            conflictCount: Math.max(0, state.conflictCount - 1),
          }));

          // Apply the resolution locally if needed
          const conflict = get().conflicts.find((c) => c.id === conflictId);
          if (conflict) {
            const changeToApply =
              resolution === 'LOCAL'
                ? conflict.localChange
                : resolution === 'SERVER'
                  ? conflict.serverChange
                  : { ...conflict.serverChange, data: mergedData || {} };
            await applyChangeToLocal(changeToApply);
          }
        } catch (error) {
          throw error;
        }
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set({ error: null, status: 'idle' });
      },

      /**
       * Force a full sync (clear local and pull all)
       */
      forceFullSync: async () => {
        if (!get().isOnline) {
          throw new Error('Cannot sync while offline');
        }

        set({ status: 'syncing', error: null });

        try {
          const response = await syncApi.fullSync();

          // Clear local data and apply all changes
          // Note: This is a destructive operation
          for (const change of response.changes) {
            await applyChangeToLocal(change);
          }

          set({
            status: 'idle',
            lastSyncTimestamp: response.serverTimestamp,
            pendingChanges: [],
            pendingCount: 0,
          });
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof Error ? error.message : 'Full sync failed',
          });
          throw error;
        }
      },
    }),
    {
      name: 'fintrace-sync',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastSyncTimestamp: state.lastSyncTimestamp,
        pendingChanges: state.pendingChanges,
        pendingCount: state.pendingCount,
      }),
    }
  )
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Apply a sync change to local database
 */
async function applyChangeToLocal(change: SyncChange): Promise<void> {
  const { entityType, entityId, operation, data } = change;

  try {
    switch (entityType) {
      case 'account':
        if (operation === 'DELETE') {
          await db.accounts.delete(entityId);
        } else {
          await db.accounts.put({ id: entityId, ...data } as any);
        }
        break;

      case 'transaction':
        if (operation === 'DELETE') {
          await db.transactions.delete(entityId);
        } else {
          await db.transactions.put({ id: entityId, ...data } as any);
        }
        break;

      case 'category':
        if (operation === 'DELETE') {
          await db.categories.delete(entityId);
        } else {
          await db.categories.put({ id: entityId, ...data } as any);
        }
        break;

      case 'budget':
        if (operation === 'DELETE') {
          await db.budgets.delete(entityId);
        } else {
          await db.budgets.put({ id: entityId, ...data } as any);
        }
        break;

      case 'goal':
        if (operation === 'DELETE') {
          await db.goals.delete(entityId);
        } else {
          await db.goals.put({ id: entityId, ...data } as any);
        }
        break;

      case 'loan':
        if (operation === 'DELETE') {
          await db.loans.delete(entityId);
        } else {
          await db.loans.put({ id: entityId, ...data } as any);
        }
        break;

      case 'investment':
        if (operation === 'DELETE') {
          await db.investments.delete(entityId);
        } else {
          await db.investments.put({ id: entityId, ...data } as any);
        }
        break;

      default:
        console.warn(`Unknown entity type: ${entityType}`);
    }
  } catch (error) {
    console.error(`Failed to apply change to ${entityType}:`, error);
    throw error;
  }
}

// =============================================================================
// Selectors
// =============================================================================

export const selectSyncStatus = (state: SyncState) => state.status;
export const selectIsOnline = (state: SyncState) => state.isOnline;
export const selectPendingCount = (state: SyncState) => state.pendingCount;
export const selectConflictCount = (state: SyncState) => state.conflictCount;
export const selectLastSyncTimestamp = (state: SyncState) => state.lastSyncTimestamp;

export default useSyncStore;
