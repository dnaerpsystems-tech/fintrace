/**
 * Auto Sync Hook
 * Automatically syncs pending changes:
 * - Every 5 minutes when app is active
 * - When app comes back online
 * - When app regains focus
 */

import { useEffect, useRef, useCallback } from 'react';
import { unifiedSyncService } from '@/lib/services/unifiedSyncService';
import { networkStatus } from '@/lib/api';

interface UseAutoSyncOptions {
  /** Sync interval in milliseconds (default: 5 minutes) */
  interval?: number;
  /** Whether to sync on focus (default: true) */
  syncOnFocus?: boolean;
  /** Whether to sync on online (default: true) */
  syncOnOnline?: boolean;
  /** Callback when sync completes */
  onSyncComplete?: (result: { synced: number; failed: number }) => void;
  /** Callback when sync fails */
  onSyncError?: (error: Error) => void;
}

export function useAutoSync(options: UseAutoSyncOptions = {}) {
  const {
    interval = 5 * 60 * 1000, // 5 minutes
    syncOnFocus = true,
    syncOnOnline = true,
    onSyncComplete,
    onSyncError,
  } = options;

  const isActiveRef = useRef(true);
  const lastSyncRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync function with debounce protection
  const performSync = useCallback(async (force = false) => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncRef.current;

    // Debounce: don't sync if synced within last 30 seconds (unless forced)
    if (!force && timeSinceLastSync < 30000) {
      return;
    }

    // Don't sync if offline
    if (!networkStatus.isOnline()) {
      return;
    }

    // Don't sync if no pending changes
    const pendingCount = unifiedSyncService.getPendingCount();
    if (pendingCount === 0) {
      return;
    }

    try {
      lastSyncRef.current = now;
      const result = await unifiedSyncService.syncAll();

      if (onSyncComplete) {
        onSyncComplete(result);
      }
    } catch (error) {
      console.error('Auto-sync failed:', error);
      if (onSyncError && error instanceof Error) {
        onSyncError(error);
      }
    }
  }, [onSyncComplete, onSyncError]);

  // Set up periodic sync
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        performSync();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval, performSync]);

  // Handle visibility change (app active/inactive)
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = document.visibilityState === 'visible';

      // Sync when becoming visible (after being hidden for a while)
      if (isActiveRef.current && syncOnFocus) {
        performSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncOnFocus, performSync]);

  // Handle window focus
  useEffect(() => {
    if (!syncOnFocus) return;

    const handleFocus = () => {
      isActiveRef.current = true;
      performSync();
    };

    const handleBlur = () => {
      isActiveRef.current = false;
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [syncOnFocus, performSync]);

  // Handle online/offline
  useEffect(() => {
    if (!syncOnOnline) return;

    const unsubscribe = networkStatus.subscribe((online) => {
      if (online) {
        // Delay sync slightly to allow connection to stabilize
        setTimeout(() => performSync(true), 1000);
      }
    });

    return unsubscribe;
  }, [syncOnOnline, performSync]);

  // Return manual sync trigger
  return {
    sync: () => performSync(true),
    getPendingCount: unifiedSyncService.getPendingCount,
    getStatus: unifiedSyncService.getStatus,
  };
}

export default useAutoSync;
