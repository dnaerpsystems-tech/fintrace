/**
 * Recurring Transactions Page
 * Manage recurring transactions like subscriptions, EMIs, and regular payments
 * Tier-One Standards: Full CRUD, validation, auto-processing alerts
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Repeat,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  Pause,
  Play,
  Trash2,
  ChevronRight,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  Zap,
  Edit3,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatINR, parseAmount } from '@/lib/formatters/currency';
import { formatDate, getRelativeTime } from '@/lib/formatters/date';
import { useRecurringTransactions, useAccounts, useCategories } from '@/db/hooks';
import { InlineError, EmptyState } from '@/components/shared';
import { TransactionType, type RecurrenceFrequency, type RecurringTransaction } from '@/types';

// ==================== CONSTANTS ====================

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const TYPE_COLORS = {
  expense: { bg: 'bg-red-100', text: 'text-red-600', icon: ArrowUpRight },
  income: { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: ArrowDownLeft },
  transfer: { bg: 'bg-blue-100', text: 'text-blue-600', icon: ArrowLeftRight },
};

// ==================== TYPES ====================

interface NewRecurringInput {
  name: string;
  type: TransactionType;
  amount: string;
  frequency: RecurrenceFrequency;
  categoryId: string;
  accountId: string;
  nextOccurrence: string;
  notes: string;
}

// ==================== COMPONENTS ====================

function RecurringCard({
  recurring,
  onProcess,
  onPause,
  onResume,
  onDelete,
  onClick,
  isProcessing,
  categoryName,
  accountName,
}: {
  recurring: RecurringTransaction;
  onProcess: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onClick: () => void;
  isProcessing: boolean;
  categoryName?: string;
  accountName?: string;
}) {
  const isDue = new Date(recurring.nextOccurrence) <= new Date();
  const typeConfig = TYPE_COLORS[recurring.type];
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div
      className={`ios-card p-4 ${!recurring.isActive ? 'opacity-60' : ''}`}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl ${typeConfig.bg} flex items-center justify-center`}>
          <TypeIcon className={`w-6 h-6 ${typeConfig.text}`} />
        </div>

        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{recurring.name}</p>
            {!recurring.isActive && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                Paused
              </span>
            )}
            {isDue && recurring.isActive && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                Due
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {categoryName} • {accountName}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <Repeat className="w-3 h-3" />
            <span className="capitalize">{recurring.frequency}</span>
            <span>•</span>
            <Calendar className="w-3 h-3" />
            <span>
              Next: {formatDate(new Date(recurring.nextOccurrence), 'short')}
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className={`font-bold ${recurring.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-gray-900'}`}>
            {recurring.type === TransactionType.INCOME ? '+' : ''}
            {formatINR(recurring.amount)}
          </p>

          <div className="flex items-center gap-1 mt-2">
            {recurring.isActive && isDue && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onProcess();
                }}
                disabled={isProcessing}
                className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-white" />
                )}
              </button>
            )}

            {recurring.isActive ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPause();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <Pause className="w-4 h-4 text-gray-600" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResume();
                }}
                className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"
              >
                <Play className="w-4 h-4 text-emerald-600" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AddRecurringSheet({
  isOpen,
  onClose,
  onSave,
  categories,
  accounts,
  expenseCategories,
  incomeCategories,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewRecurringInput) => Promise<void>;
  categories: any[];
  accounts: any[];
  expenseCategories: any[];
  incomeCategories: any[];
}) {
  const [formData, setFormData] = useState<NewRecurringInput>({
    name: '',
    type: TransactionType.EXPENSE,
    amount: '',
    frequency: 'monthly' as RecurrenceFrequency,
    categoryId: '',
    accountId: '',
    nextOccurrence: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCategories = formData.type === TransactionType.EXPENSE
    ? expenseCategories
    : incomeCategories;

  // Set default category when type changes
  const handleTypeChange = (type: TransactionType) => {
    setFormData({
      ...formData,
      type,
      categoryId: type === TransactionType.EXPENSE
        ? expenseCategories[0]?.id || ''
        : incomeCategories[0]?.id || '',
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    const amount = parseAmount(formData.amount);
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (!formData.categoryId) {
      setError('Category is required');
      return;
    }

    if (!formData.accountId) {
      setError('Account is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(formData);
      setFormData({
        name: '',
        type: TransactionType.EXPENSE,
        amount: '',
        frequency: 'monthly' as RecurrenceFrequency,
        categoryId: '',
        accountId: '',
        nextOccurrence: new Date().toISOString().split('T')[0],
        notes: '',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Add Recurring Transaction</SheetTitle>
          <SheetDescription>
            Set up a transaction that repeats automatically
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Transaction Type */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleTypeChange(TransactionType.EXPENSE)}
              className={`p-3 rounded-xl border-2 flex items-center gap-2 ${
                formData.type === TransactionType.EXPENSE
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200'
              }`}
            >
              <ArrowUpRight className={`w-5 h-5 ${formData.type === TransactionType.EXPENSE ? 'text-red-500' : 'text-gray-400'}`} />
              <span className={formData.type === TransactionType.EXPENSE ? 'text-red-700 font-medium' : 'text-gray-600'}>
                Expense
              </span>
            </button>
            <button
              onClick={() => handleTypeChange(TransactionType.INCOME)}
              className={`p-3 rounded-xl border-2 flex items-center gap-2 ${
                formData.type === TransactionType.INCOME
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200'
              }`}
            >
              <ArrowDownLeft className={`w-5 h-5 ${formData.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-gray-400'}`} />
              <span className={formData.type === TransactionType.INCOME ? 'text-emerald-700 font-medium' : 'text-gray-600'}>
                Income
              </span>
            </button>
          </div>

          {/* Name */}
          <div>
            <Label>Name</Label>
            <Input
              placeholder="e.g., Netflix Subscription, House Rent"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1.5"
            />
          </div>

          {/* Amount */}
          <div>
            <Label>Amount</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-8"
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <Label>Frequency</Label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as RecurrenceFrequency })}
              className="w-full mt-1.5 p-2.5 rounded-lg border border-gray-200 bg-white text-sm"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full mt-1.5 p-2.5 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="">Select category</option>
              {availableCategories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account */}
          <div>
            <Label>Account</Label>
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="w-full mt-1.5 p-2.5 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="">Select account</option>
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Next Occurrence */}
          <div>
            <Label>Next Occurrence</Label>
            <Input
              type="date"
              value={formData.nextOccurrence}
              onChange={(e) => setFormData({ ...formData, nextOccurrence: e.target.value })}
              className="mt-1.5"
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes (Optional)</Label>
            <Input
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
            disabled={isSaving}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          >
            {isSaving ? 'Saving...' : 'Add Recurring Transaction'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== MAIN COMPONENT ====================

export default function RecurringTransactionsPage() {
  const navigate = useNavigate();

  // Hooks
  const {
    recurringTransactions,
    isLoading,
    createRecurringTransaction,
    pauseRecurring,
    resumeRecurring,
    processRecurring,
    deleteRecurringTransaction,
  } = useRecurringTransactions();
  const { accounts } = useAccounts();
  const { categories, expenseCategories, incomeCategories } = useCategories();

  // State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Computed values
  const { activeRecurring, pausedRecurring, dueRecurring } = useMemo(() => {
    if (!recurringTransactions) {
      return { activeRecurring: [], pausedRecurring: [], dueRecurring: [] };
    }

    const today = new Date().toISOString().split('T')[0];
    const active = recurringTransactions.filter((r) => r.isActive);
    const paused = recurringTransactions.filter((r) => !r.isActive);
    const due = active.filter((r) => r.nextOccurrence <= today);

    return { activeRecurring: active, pausedRecurring: paused, dueRecurring: due };
  }, [recurringTransactions]);

  const totalMonthlyRecurring = useMemo(() => {
    if (!recurringTransactions) return 0;

    return recurringTransactions
      .filter((r) => r.isActive && r.type === TransactionType.EXPENSE)
      .reduce((sum, r) => {
        let monthlyAmount = r.amount;
        switch (r.frequency) {
          case 'daily':
            monthlyAmount = r.amount * 30;
            break;
          case 'weekly':
            monthlyAmount = r.amount * 4;
            break;
          case 'biweekly':
            monthlyAmount = r.amount * 2;
            break;
          case 'quarterly':
            monthlyAmount = r.amount / 3;
            break;
          case 'yearly':
            monthlyAmount = r.amount / 12;
            break;
        }
        return sum + monthlyAmount;
      }, 0);
  }, [recurringTransactions]);

  // Handlers
  const handleAddRecurring = async (data: NewRecurringInput) => {
    await createRecurringTransaction({
      userId: 'default-user',
      name: data.name.trim(),
      type: data.type,
      amount: parseAmount(data.amount),
      currency: 'INR',
      frequency: data.frequency,
      categoryId: data.categoryId,
      accountId: data.accountId,
      nextOccurrence: data.nextOccurrence,
      startDate: data.nextOccurrence,
      notes: data.notes.trim() || undefined,
      isActive: true,
      autoCreate: false,
      reminderDays: 1,
      totalCreated: 0,
    });

    setResult({ type: 'success', message: 'Recurring transaction added!' });
  };

  const handleProcess = async (id: string) => {
    setProcessingId(id);
    try {
      await processRecurring(id);
      setResult({ type: 'success', message: 'Transaction created successfully!' });
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to process transaction' });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseRecurring(id);
      setResult({ type: 'success', message: 'Recurring transaction paused' });
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to pause' });
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeRecurring(id);
      setResult({ type: 'success', message: 'Recurring transaction resumed' });
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to resume' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRecurringTransaction(deleteId);
      setResult({ type: 'success', message: 'Recurring transaction deleted' });
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to delete' });
    } finally {
      setDeleteId(null);
    }
  };

  const getCategoryName = (id: string) => categories?.find((c) => c.id === id)?.name;
  const getAccountName = (id: string) => accounts?.find((a) => a.id === id)?.name;

  // Auto-hide result
  if (result) {
    setTimeout(() => setResult(null), 3000);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
              <h1 className="text-xl font-bold text-gray-900">Recurring</h1>
              <p className="text-sm text-gray-500">
                {activeRecurring.length} active • {dueRecurring.length} due
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5" />
                <span className="font-medium">Monthly Recurring</span>
              </div>
              <span className="text-white/70 text-sm">
                {activeRecurring.length} active
              </span>
            </div>
            <p className="text-3xl font-bold">{formatINR(totalMonthlyRecurring)}</p>
            <p className="text-white/70 text-sm mt-1">
              Estimated monthly outflow
            </p>
          </CardContent>
        </Card>

        {/* Due Now */}
        {dueRecurring.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
                Due Now ({dueRecurring.length})
              </h3>
            </div>
            <div className="space-y-3">
              {dueRecurring.map((recurring) => (
                <RecurringCard
                  key={recurring.id}
                  recurring={recurring}
                  onProcess={() => handleProcess(recurring.id)}
                  onPause={() => handlePause(recurring.id)}
                  onResume={() => handleResume(recurring.id)}
                  onDelete={() => setDeleteId(recurring.id)}
                  onClick={() => {}}
                  isProcessing={processingId === recurring.id}
                  categoryName={getCategoryName(recurring.categoryId)}
                  accountName={getAccountName(recurring.accountId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Active */}
        {activeRecurring.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Active ({activeRecurring.length})
            </h3>
            <div className="space-y-3">
              {activeRecurring
                .filter((r) => !dueRecurring.includes(r))
                .map((recurring) => (
                  <RecurringCard
                    key={recurring.id}
                    recurring={recurring}
                    onProcess={() => handleProcess(recurring.id)}
                    onPause={() => handlePause(recurring.id)}
                    onResume={() => handleResume(recurring.id)}
                    onDelete={() => setDeleteId(recurring.id)}
                    onClick={() => {}}
                    isProcessing={processingId === recurring.id}
                    categoryName={getCategoryName(recurring.categoryId)}
                    accountName={getAccountName(recurring.accountId)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Paused */}
        {pausedRecurring.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Paused ({pausedRecurring.length})
            </h3>
            <div className="space-y-3">
              {pausedRecurring.map((recurring) => (
                <RecurringCard
                  key={recurring.id}
                  recurring={recurring}
                  onProcess={() => handleProcess(recurring.id)}
                  onPause={() => handlePause(recurring.id)}
                  onResume={() => handleResume(recurring.id)}
                  onDelete={() => setDeleteId(recurring.id)}
                  onClick={() => {}}
                  isProcessing={processingId === recurring.id}
                  categoryName={getCategoryName(recurring.categoryId)}
                  accountName={getAccountName(recurring.accountId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && recurringTransactions?.length === 0 && (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Repeat className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Recurring Transactions
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Set up recurring expenses like subscriptions, rent, or regular income
            </p>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recurring
            </Button>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Add Sheet */}
      <AddRecurringSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddRecurring}
        categories={categories || []}
        accounts={accounts || []}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring transaction. Any future occurrences will not be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
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
