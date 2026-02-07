/**
 * Conflict Resolution Dialog
 * Handles sync conflicts between local and server data
 * Tier-One Standards: Clear UI for conflict resolution with merge support
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Cloud,
  Smartphone,
  ArrowRight,
  Check,
  X,
  Merge,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useSyncStore, type SyncState } from '@/stores/syncStore';
import type { SyncConflict } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

interface ConflictResolutionDialogProps {
  open: boolean;
  onClose: () => void;
}

type Resolution = 'LOCAL' | 'SERVER' | 'MERGE';

// =============================================================================
// Helper Functions
// =============================================================================

function getEntityTypeName(type: string): string {
  const names: Record<string, string> = {
    account: 'Account',
    transaction: 'Transaction',
    category: 'Category',
    budget: 'Budget',
    goal: 'Goal',
    loan: 'Loan',
    investment: 'Investment',
  };
  return names[type] || type;
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, ' ');
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    // Assume amounts in paise
    if (value >= 100) {
      return `₹${(value / 100).toLocaleString('en-IN')}`;
    }
    return value.toString();
  }
  if (typeof value === 'string') {
    // Check if ISO date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return new Date(value).toLocaleDateString('en-IN');
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// =============================================================================
// Components
// =============================================================================

function ConflictCard({
  conflict,
  isSelected,
  resolution,
  onSelect,
  onResolve,
}: {
  conflict: SyncConflict;
  isSelected: boolean;
  resolution: Resolution | null;
  onSelect: () => void;
  onResolve: (resolution: Resolution) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Get the changed fields
  const localData = conflict.localChange.data || {};
  const serverData = conflict.serverChange.data || {};
  const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)]);
  const changedFields = Array.from(allKeys).filter(
    (key) => JSON.stringify(localData[key]) !== JSON.stringify(serverData[key])
  );

  return (
    <motion.div
      className={`border rounded-xl overflow-hidden ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer bg-gray-50 flex items-center gap-3"
        onClick={onSelect}
      >
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">
            {getEntityTypeName(conflict.entityType)} Conflict
          </p>
          <p className="text-sm text-gray-500 truncate">
            {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} differ
          </p>
        </div>
        {resolution && (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <Check className="w-3 h-3 mr-1" />
            {resolution === 'LOCAL' ? 'Keep Local' : resolution === 'SERVER' ? 'Use Server' : 'Merged'}
          </Badge>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="p-1 rounded-full hover:bg-gray-200"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200">
          {/* Comparison */}
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {/* Local Data */}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">Your Device</span>
              </div>
              <div className="space-y-1">
                {changedFields.map((field) => (
                  <div key={field} className="text-sm">
                    <span className="text-gray-500">{formatFieldName(field)}:</span>
                    <span className="ml-1 text-gray-900 font-medium">
                      {formatFieldValue(localData[field])}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Modified {formatDistanceToNow(new Date(conflict.localChange.clientTimestamp), { addSuffix: true })}
              </p>
            </div>

            {/* Server Data */}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">Server</span>
              </div>
              <div className="space-y-1">
                {changedFields.map((field) => (
                  <div key={field} className="text-sm">
                    <span className="text-gray-500">{formatFieldName(field)}:</span>
                    <span className="ml-1 text-gray-900 font-medium">
                      {formatFieldValue(serverData[field])}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Modified {formatDistanceToNow(new Date(conflict.serverChange.serverTimestamp || ''), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Choose which version to keep:</p>
            <div className="flex gap-2">
              <Button
                variant={resolution === 'LOCAL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onResolve('LOCAL')}
                className={resolution === 'LOCAL' ? 'bg-blue-500 hover:bg-blue-600' : ''}
              >
                <Smartphone className="w-4 h-4 mr-1" />
                Keep Local
              </Button>
              <Button
                variant={resolution === 'SERVER' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onResolve('SERVER')}
                className={resolution === 'SERVER' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
              >
                <Cloud className="w-4 h-4 mr-1" />
                Use Server
              </Button>
              <Button
                variant={resolution === 'MERGE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onResolve('MERGE')}
                className={resolution === 'MERGE' ? 'bg-purple-500 hover:bg-purple-600' : ''}
              >
                <Merge className="w-4 h-4 mr-1" />
                Merge (Server wins)
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ConflictResolutionDialog({ open, onClose }: ConflictResolutionDialogProps) {
  const conflicts = useSyncStore((state: SyncState) => state.conflicts);
  const resolveConflict = useSyncStore((state: SyncState) => state.resolveConflict);

  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [isResolving, setIsResolving] = useState(false);

  // Handle resolve single conflict
  const handleResolve = (conflictId: string, resolution: Resolution) => {
    setResolutions((prev) => ({ ...prev, [conflictId]: resolution }));
  };

  // Handle resolve all
  const handleResolveAll = async () => {
    setIsResolving(true);

    try {
      for (const conflict of conflicts) {
        const resolution = resolutions[conflict.id];
        if (resolution) {
          await resolveConflict(conflict.id, resolution);
        }
      }
      onClose();
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    } finally {
      setIsResolving(false);
    }
  };

  // Check if all conflicts are resolved
  const allResolved = conflicts.every((c) => resolutions[c.id]);
  const resolvedCount = Object.keys(resolutions).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Sync Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} found between your local
            data and the server. Please review and resolve each conflict.
          </DialogDescription>
        </DialogHeader>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              isSelected={selectedConflict === conflict.id}
              resolution={resolutions[conflict.id] || null}
              onSelect={() => setSelectedConflict(conflict.id)}
              onResolve={(resolution) => handleResolve(conflict.id, resolution)}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 py-2 border-t border-gray-100">
          <p className="text-sm text-gray-500 flex-1">
            {resolvedCount} of {conflicts.length} resolved
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allLocal: Record<string, Resolution> = {};
              conflicts.forEach((c) => {
                allLocal[c.id] = 'LOCAL';
              });
              setResolutions(allLocal);
            }}
          >
            Keep All Local
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allServer: Record<string, Resolution> = {};
              conflicts.forEach((c) => {
                allServer[c.id] = 'SERVER';
              });
              setResolutions(allServer);
            }}
          >
            Use All Server
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isResolving}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleResolveAll}
            disabled={!allResolved || isResolving}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {isResolving ? (
              <>Resolving...</>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Apply Resolutions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictResolutionDialog;
