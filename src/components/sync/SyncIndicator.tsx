/**
 * Sync Indicator Component
 * Displays sync status with pending count, online/offline state,
 * and sync progress in the header
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { unifiedSyncService, type SyncStatus } from '@/lib/services/unifiedSyncService';
import { networkStatus } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSyncStore } from '@/stores/syncStore';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';

interface SyncIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncIndicator({ className, showDetails = false }: SyncIndicatorProps) {
  const [status, setStatus] = useState<SyncStatus>(unifiedSyncService.getStatus());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  // Get conflict count from sync store
  const conflictCount = useSyncStore((s) => s.conflictCount);

  // Update status on mount and when queue changes
  useEffect(() => {
    const updateStatus = () => {
      setStatus(unifiedSyncService.getStatus());
    };

    updateStatus();

    // Listen for queue updates
    const handleQueueUpdate = () => updateStatus();
    window.addEventListener('sync:queue-updated', handleQueueUpdate);

    // Listen for online/offline
    const unsubscribe = networkStatus.subscribe(() => updateStatus());

    // Poll every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('sync:queue-updated', handleQueueUpdate);
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Manual sync handler
  const handleSync = useCallback(async () => {
    if (isSyncing || !status.isOnline) return;

    setIsSyncing(true);
    try {
      await unifiedSyncService.syncAll();
      setStatus(unifiedSyncService.getStatus());
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, status.isOnline]);

  // Determine indicator state
  const getIndicatorState = () => {
    if (!status.isOnline) return 'offline';
    if (conflictCount > 0) return 'conflict';
    if (isSyncing || status.isSyncing) return 'syncing';
    if (status.pendingCount > 0) return 'pending';
    if (status.lastError) return 'error';
    return 'synced';
  };

  const indicatorState = getIndicatorState();

  // Color and icon based on state
  const stateConfig = {
    offline: {
      icon: CloudOff,
      color: 'text-gray-400',
      bgColor: 'bg-gray-100',
      label: 'Offline',
    },
    syncing: {
      icon: Loader2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      label: 'Syncing...',
    },
    pending: {
      icon: Cloud,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100',
      label: `${status.pendingCount} pending`,
    },
    conflict: {
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      label: `${conflictCount} conflict${conflictCount !== 1 ? 's' : ''}`,
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      label: 'Sync error',
    },
    synced: {
      icon: Check,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-100',
      label: 'Synced',
    },
  };

  const config = stateConfig[indicatorState];
  const Icon = config.icon;

  // Handle click based on state
  const handleClick = () => {
    if (indicatorState === 'conflict') {
      setShowConflicts(true);
    } else {
      handleSync();
    }
  };

  // Compact mode (just icon with badge)
  if (!showDetails) {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={!status.isOnline || isSyncing}
          className={cn(
            'relative p-2 rounded-full transition-colors',
            config.bgColor,
            className
          )}
          title={config.label}
        >
          <Icon
            className={cn(
              'w-5 h-5 transition-all',
              config.color,
              indicatorState === 'syncing' && 'animate-spin'
            )}
          />
          {(status.pendingCount > 0 || conflictCount > 0) && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'absolute -top-1 -right-1 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center',
                conflictCount > 0 ? 'bg-orange-500' : 'bg-amber-500'
              )}
            >
              {conflictCount > 0
                ? (conflictCount > 9 ? '9+' : conflictCount)
                : (status.pendingCount > 9 ? '9+' : status.pendingCount)
              }
            </motion.span>
          )}
        </button>
        <ConflictResolutionDialog
          open={showConflicts}
          onClose={() => setShowConflicts(false)}
        />
      </>
    );
  }

  // Detailed mode (expandable card)
  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-colors',
          config.bgColor
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4',
            config.color,
            indicatorState === 'syncing' && 'animate-spin'
          )}
        />
        <span className={cn('text-sm font-medium', config.color)}>
          {config.label}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            config.color,
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50"
          >
            {/* Status Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', status.isOnline ? 'bg-emerald-500' : 'bg-gray-400')} />
                <span className="text-sm font-medium text-gray-700">
                  {status.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              {status.lastSyncTime && (
                <span className="text-xs text-gray-500">
                  Last sync: {new Date(status.lastSyncTime).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Pending by Type */}
            {status.pendingCount > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Pending Changes
                </h4>
                <div className="space-y-1">
                  {Object.entries(status.pendingByType)
                    .filter(([, count]) => count > 0)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 capitalize">{type}s</span>
                        <span className="font-medium text-amber-600">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {status.lastError && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600">{status.lastError}</p>
              </div>
            )}

            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={!status.isOnline || isSyncing || status.pendingCount === 0}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors',
                status.isOnline && status.pendingCount > 0
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync Now
                </>
              )}
            </button>

            {/* Synced State */}
            {status.pendingCount === 0 && status.isOnline && !status.lastError && (
              <div className="flex items-center justify-center gap-2 py-3 text-emerald-600">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">All changes synced</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SyncIndicator;

// Re-export types
export type { SyncIndicatorProps };
