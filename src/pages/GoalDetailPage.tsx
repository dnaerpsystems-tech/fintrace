/**
 * Goal Detail Page
 * View goal progress, contributions, and add new contributions
 * Tier-One Standards: Full CRUD, progress visualization, suggestions
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Target,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Wallet,
  Check,
  X,
  Edit3,
  Trash2,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Banknote,
  PiggyBank,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { formatINR, parseAmount } from '@/lib/formatters/currency';
import { formatDate, getRelativeTime } from '@/lib/formatters/date';
import {
  getGoalWithProgress,
  addContribution,
  removeContribution,
  getSuggestedContribution,
  deleteGoal,
  completeGoal,
  type GoalWithProgress,
} from '@/lib/services/goalService';
import { GoalStatus, type GoalContribution } from '@/types';
import { format, differenceInDays, differenceInMonths } from 'date-fns';

// ==================== CONSTANTS ====================

const GOAL_ICONS: Record<string, React.ElementType> = {
  Target,
  Car: TrendingUp,
  Home: PiggyBank,
  Plane: Sparkles,
  GraduationCap: Target,
  Heart: Target,
  Shield: Target,
  Smartphone: Target,
};

const DEFAULT_USER_ID = 'default-user';

// ==================== COMPONENTS ====================

function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 12,
  color = '#10B981',
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-2xl font-bold">{Math.min(percentage, 100).toFixed(0)}%</span>
        <span className="text-xs text-gray-500">Complete</span>
      </div>
    </div>
  );
}

function ContributionCard({
  contribution,
  onDelete,
}: {
  contribution: GoalContribution;
  onDelete: () => void;
}) {
  return (
    <motion.div
      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
        <Banknote className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-emerald-600">+{formatINR(contribution.amount)}</p>
        <p className="text-xs text-gray-500">{contribution.note || 'Contribution'}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-400">
          {getRelativeTime(new Date(contribution.createdAt))}
        </p>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-500 mt-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function AddContributionSheet({
  isOpen,
  onClose,
  onSave,
  suggestedAmounts,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, note: string) => Promise<void>;
  suggestedAmounts: { daily: number; weekly: number; monthly: number };
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const amountValue = parseAmount(amount);
    if (amountValue <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(amountValue, note);
      setAmount('');
      setNote('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contribution');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount((value / 100).toFixed(2));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Add Contribution</SheetTitle>
          <SheetDescription>Track your savings progress</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Quick Amount Suggestions */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Quick Add
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleQuickAmount(suggestedAmounts.daily)}
                className="p-3 rounded-xl border-2 border-gray-200 hover:border-emerald-500 transition-colors text-center"
              >
                <p className="text-sm text-gray-500">Daily</p>
                <p className="font-semibold text-gray-900">{formatINR(suggestedAmounts.daily)}</p>
              </button>
              <button
                onClick={() => handleQuickAmount(suggestedAmounts.weekly)}
                className="p-3 rounded-xl border-2 border-gray-200 hover:border-emerald-500 transition-colors text-center"
              >
                <p className="text-sm text-gray-500">Weekly</p>
                <p className="font-semibold text-gray-900">{formatINR(suggestedAmounts.weekly)}</p>
              </button>
              <button
                onClick={() => handleQuickAmount(suggestedAmounts.monthly)}
                className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 transition-colors text-center"
              >
                <p className="text-sm text-emerald-600">Monthly</p>
                <p className="font-semibold text-emerald-700">{formatINR(suggestedAmounts.monthly)}</p>
              </button>
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <Label>Amount</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <Label>Note (optional)</Label>
            <Input
              placeholder="e.g., Bonus savings"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || !amount}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          >
            {isSaving ? 'Adding...' : 'Add Contribution'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusBadge({ status, isOnTrack }: { status: string; isOnTrack: boolean }) {
  if (status === 'completed') {
    return (
      <span className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
        <Check className="w-3 h-3" />
        Completed
      </span>
    );
  }

  if (isOnTrack) {
    return (
      <span className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        On Track
      </span>
    );
  }

  return (
    <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" />
      Behind
    </span>
  );
}

// ==================== MAIN COMPONENT ====================

export default function GoalDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // State
  const [goal, setGoal] = useState<GoalWithProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteContribId, setDeleteContribId] = useState<string | null>(null);
  const [showDeleteGoal, setShowDeleteGoal] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load goal data
  useEffect(() => {
    async function loadGoal() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getGoalWithProgress(id);
        setGoal(data);
      } catch (err) {
        console.error('Error loading goal:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadGoal();
  }, [id]);

  // Suggested contributions
  const suggestedAmounts = useMemo(() => {
    if (!goal) return { daily: 0, weekly: 0, monthly: 0 };
    return getSuggestedContribution(goal);
  }, [goal]);

  // Handlers
  const handleAddContribution = async (amount: number, note: string) => {
    if (!goal) return;

    await addContribution(
      {
        goalId: goal.id,
        amount,
        note: note || undefined,
      },
      DEFAULT_USER_ID
    );

    // Refresh goal data
    const updated = await getGoalWithProgress(goal.id);
    setGoal(updated);
    setResult({ type: 'success', message: 'Contribution added!' });
  };

  const handleDeleteContribution = async () => {
    if (!deleteContribId || !goal) return;

    try {
      await removeContribution(deleteContribId);
      const updated = await getGoalWithProgress(goal.id);
      setGoal(updated);
      setResult({ type: 'success', message: 'Contribution removed' });
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to remove contribution' });
    } finally {
      setDeleteContribId(null);
    }
  };

  const handleDeleteGoal = async () => {
    if (!goal) return;

    try {
      await deleteGoal(goal.id);
      navigate('/goals', { replace: true });
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to delete goal' });
      setShowDeleteGoal(false);
    }
  };

  const handleCompleteGoal = async () => {
    if (!goal) return;

    try {
      await completeGoal(goal.id);
      const updated = await getGoalWithProgress(goal.id);
      setGoal(updated);
      setResult({ type: 'success', message: 'Goal marked as complete!' });
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to complete goal' });
    }
  };

  // Auto-hide result
  if (result) {
    setTimeout(() => setResult(null), 3000);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Not found
  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold">Goal</h1>
        </div>
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Goal not found</p>
          <Button onClick={() => navigate('/goals')} variant="outline" className="mt-4">
            Go to Goals
          </Button>
        </Card>
      </div>
    );
  }

  const isCompleted = goal.status === GoalStatus.COMPLETED;
  const daysLeft = goal.progress.daysLeft;
  const monthsLeft = goal.progress.monthsLeft;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{goal.name}</h1>
              <p className="text-sm text-gray-500">
                {isCompleted ? 'Completed' : `${daysLeft} days left`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDeleteGoal(true)}
            className="w-10 h-10 rounded-full hover:bg-red-100 flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Progress Card */}
        <Card className="overflow-hidden">
          <div
            className="p-6 text-white"
            style={{
              background: `linear-gradient(135deg, ${goal.color || '#06B6D4'}, ${goal.color || '#06B6D4'}dd)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Current Progress</p>
                <p className="text-3xl font-bold">{formatINR(goal.currentAmount)}</p>
                <p className="text-white/70 text-sm mt-1">
                  of {formatINR(goal.targetAmount)} target
                </p>
              </div>
              <ProgressRing
                percentage={goal.progress.percentage}
                size={100}
                strokeWidth={10}
                color="#fff"
              />
            </div>

            <div className="mt-4">
              <Progress
                value={goal.progress.percentage}
                className="h-2 bg-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-white/70 text-xs">Remaining</p>
                <p className="font-semibold">{formatINR(goal.progress.remaining)}</p>
              </div>
              <div>
                <p className="text-white/70 text-xs">Target Date</p>
                <p className="font-semibold">{format(new Date(goal.targetDate), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Status Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-gray-500">
                    {isCompleted
                      ? 'Goal achieved!'
                      : monthsLeft > 0
                      ? `${monthsLeft} months remaining`
                      : `${daysLeft} days remaining`}
                  </p>
                </div>
              </div>
              <StatusBadge status={goal.progress.status} isOnTrack={goal.progress.onTrack} />
            </div>
          </CardContent>
        </Card>

        {/* Suggested Savings */}
        {!isCompleted && goal.progress.remaining > 0 && (
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <p className="font-medium text-amber-800">Suggested Savings</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-white/70 rounded-lg">
                  <p className="text-xs text-gray-500">Daily</p>
                  <p className="font-semibold text-gray-900">{formatINR(suggestedAmounts.daily)}</p>
                </div>
                <div className="text-center p-2 bg-white/70 rounded-lg">
                  <p className="text-xs text-gray-500">Weekly</p>
                  <p className="font-semibold text-gray-900">{formatINR(suggestedAmounts.weekly)}</p>
                </div>
                <div className="text-center p-2 bg-amber-100 rounded-lg">
                  <p className="text-xs text-amber-600">Monthly</p>
                  <p className="font-semibold text-amber-700">{formatINR(suggestedAmounts.monthly)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contributions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Contributions ({goal.contributions.length})
            </h3>
            {!isCompleted && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1 text-sm text-emerald-600 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            )}
          </div>

          {goal.contributions.length > 0 ? (
            <div className="space-y-2">
              {goal.contributions.slice(0, 10).map((contribution) => (
                <ContributionCard
                  key={contribution.id}
                  contribution={contribution}
                  onDelete={() => setDeleteContribId(contribution.id)}
                />
              ))}
              {goal.contributions.length > 10 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  + {goal.contributions.length - 10} more contributions
                </p>
              )}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <PiggyBank className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No contributions yet</p>
              <Button
                onClick={() => setIsAddOpen(true)}
                variant="outline"
                className="mt-3"
              >
                Add First Contribution
              </Button>
            </Card>
          )}
        </div>

        {/* Complete Goal Button */}
        {!isCompleted && goal.progress.percentage >= 100 && (
          <Button
            onClick={handleCompleteGoal}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          >
            <Check className="w-5 h-5 mr-2" />
            Mark as Complete
          </Button>
        )}

        {/* Add Contribution FAB */}
        {!isCompleted && (
          <motion.button
            onClick={() => setIsAddOpen(true)}
            className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center"
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </div>

      {/* Add Contribution Sheet */}
      <AddContributionSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddContribution}
        suggestedAmounts={suggestedAmounts}
      />

      {/* Delete Contribution Dialog */}
      <AlertDialog open={!!deleteContribId} onOpenChange={() => setDeleteContribId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contribution?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the contribution and decrease your goal progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContribution} className="bg-red-500 hover:bg-red-600">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Goal Dialog */}
      <AlertDialog open={showDeleteGoal} onOpenChange={setShowDeleteGoal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this goal and all its contributions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Toast */}
      <AnimatePresence>
        {result && (
          <motion.div
            className={`fixed bottom-24 left-4 right-4 p-4 rounded-xl shadow-lg z-50 ${
              result.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            } text-white`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <div className="flex items-center gap-3">
              {result.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              <p className="font-medium">{result.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
