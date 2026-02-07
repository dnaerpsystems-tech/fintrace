/**
 * Transaction Detail Page
 * View and edit transaction details
 * Tier-One Standards: Full CRUD, validation, confirmation dialogs
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  X,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  AlertTriangle,
  Loader2,
  Repeat,
  ShoppingCart,
  Coffee,
  Briefcase,
  Zap,
  Car,
  Home,
  Heart,
  GraduationCap,
  Film,
  Gift,
  Fuel,
  Shirt,
  Plane,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatINR, parseAmount } from '@/lib/formatters/currency';
import { useTransactions, useAccounts, useCategories } from '@/db/hooks';
import { TransactionType, type Transaction } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  groceries: ShoppingCart,
  food: Coffee,
  salary: Briefcase,
  utilities: Zap,
  bills: Zap,
  transport: Car,
  housing: Home,
  health: Heart,
  education: GraduationCap,
  entertainment: Film,
  gifts: Gift,
  fuel: Fuel,
  shopping: Shirt,
  travel: Plane,
  freelance: Briefcase,
  investment: Briefcase,
  other_income: Briefcase,
  personal_care: Heart,
  receipt: FileText,
  other: MoreHorizontal,
};

// Format helpers
function formatTransactionDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy');
}

function getRelativeTimeStr(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

// ==================== TYPES ====================

interface EditableTransaction {
  description: string;
  amount: string;
  date: string;
  categoryId: string;
  accountId: string;
  notes: string;
  isRecurring: boolean;
}

// ==================== COMPONENTS ====================

function TransactionTypeIcon({ type }: { type: TransactionType }) {
  if (type === TransactionType.INCOME) {
    return (
      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
        <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
      </div>
    );
  }
  if (type === TransactionType.TRANSFER) {
    return (
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
        <ArrowLeftRight className="w-6 h-6 text-blue-600" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
      <ArrowUpRight className="w-6 h-6 text-red-600" />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`font-medium ${valueColor || 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function TransactionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Hooks
  const { getTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories, expenseCategories, incomeCategories } = useCategories();

  // State
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditableTransaction>({
    description: '',
    amount: '',
    date: '',
    categoryId: '',
    accountId: '',
    notes: '',
    isRecurring: false,
  });

  // Load transaction
  useEffect(() => {
    async function loadTransaction() {
      if (!id) {
        setError('Transaction ID not provided');
        setIsLoading(false);
        return;
      }

      try {
        const txn = await getTransaction(id);
        if (!txn) {
          setError('Transaction not found');
        } else {
          setTransaction(txn);
          setEditData({
            description: txn.description,
            amount: (txn.amount / 100).toFixed(2),
            date: txn.date,
            categoryId: txn.categoryId,
            accountId: txn.accountId,
            notes: txn.notes || '',
            isRecurring: txn.isRecurring,
          });
        }
      } catch (err) {
        setError('Failed to load transaction');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTransaction();
  }, [id, getTransaction]);

  // Get category and account names
  const category = useMemo(() => {
    return categories?.find((c) => c.id === transaction?.categoryId);
  }, [categories, transaction]);

  const account = useMemo(() => {
    return accounts?.find((a) => a.id === transaction?.accountId);
  }, [accounts, transaction]);

  const availableCategories = useMemo(() => {
    if (!transaction) return [];
    return transaction.type === TransactionType.EXPENSE
      ? expenseCategories
      : transaction.type === TransactionType.INCOME
      ? incomeCategories
      : [];
  }, [transaction, expenseCategories, incomeCategories]);

  // Handlers
  const handleSave = async () => {
    if (!transaction) return;

    const amount = parseAmount(editData.amount);
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (!editData.description.trim()) {
      setError('Description is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateTransaction(transaction.id, {
        description: editData.description.trim(),
        amount,
        date: editData.date,
        categoryId: editData.categoryId,
        accountId: editData.accountId,
        notes: editData.notes.trim() || undefined,
        isRecurring: editData.isRecurring,
      });

      // Reload transaction
      const updated = await getTransaction(transaction.id);
      if (updated) {
        setTransaction(updated);
      }

      setIsEditing(false);
    } catch (err) {
      setError('Failed to update transaction');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    setIsDeleting(true);

    try {
      await deleteTransaction(transaction.id);
      navigate('/transactions', { replace: true });
    } catch (err) {
      setError('Failed to delete transaction');
      console.error(err);
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    if (transaction) {
      setEditData({
        description: transaction.description,
        amount: (transaction.amount / 100).toFixed(2),
        date: transaction.date,
        categoryId: transaction.categoryId,
        accountId: transaction.accountId,
        notes: transaction.notes || '',
        isRecurring: transaction.isRecurring,
      });
    }
    setIsEditing(false);
    setError(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Transaction</h1>
        </div>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium">{error}</p>
            <Button
              onClick={() => navigate('/transactions')}
              variant="outline"
              className="mt-4"
            >
              Go to Transactions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  const CategoryIcon = CATEGORY_ICONS[category?.icon || 'receipt'] || CATEGORY_ICONS.receipt;

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
              <h1 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Transaction' : 'Transaction Details'}
              </h1>
              <p className="text-sm text-gray-500">
                {getRelativeTimeStr(transaction.createdAt)}
              </p>
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <Edit3 className="w-5 h-5 text-gray-600" />
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this transaction and update your account balance.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEdit}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Check className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Amount Card */}
        <Card className="overflow-hidden">
          <div
            className={`p-6 ${
              transaction.type === TransactionType.INCOME
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : transaction.type === TransactionType.TRANSFER
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                : 'bg-gradient-to-br from-red-500 to-rose-600'
            } text-white`}
          >
            <div className="flex items-center justify-between mb-4">
              <TransactionTypeIcon type={transaction.type} />
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium capitalize">
                {transaction.type}
              </span>
            </div>

            {isEditing ? (
              <div>
                <Label className="text-white/80 text-sm">Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/80">
                    {transaction.type === TransactionType.INCOME ? '+' : '-'}₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editData.amount}
                    onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                    className="w-full bg-transparent text-4xl font-bold text-white placeholder-white/50 border-none focus:outline-none pl-12"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-white/80 text-sm mb-1">Amount</p>
                <p className="text-4xl font-bold">
                  {transaction.type === TransactionType.INCOME ? '+' : '-'}
                  {formatINR(transaction.amount)}
                </p>
              </>
            )}
          </div>
        </Card>

        {/* Details Card */}
        <Card>
          <CardContent className="p-4">
            {isEditing ? (
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <Input
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                {/* Date */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Date</Label>
                  <Input
                    type="date"
                    value={editData.date}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                {/* Category */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Category</Label>
                  <select
                    value={editData.categoryId}
                    onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })}
                    className="w-full mt-1.5 p-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Account</Label>
                  <select
                    value={editData.accountId}
                    onChange={(e) => setEditData({ ...editData, accountId: e.target.value })}
                    className="w-full mt-1.5 p-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                  >
                    {accounts?.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Notes</Label>
                  <Textarea
                    value={editData.notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditData({ ...editData, notes: e.target.value })}
                    placeholder="Add notes..."
                    className="mt-1.5 min-h-[80px]"
                  />
                </div>

                {/* Recurring */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Repeat className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Recurring Transaction</span>
                  </div>
                  <Switch
                    checked={editData.isRecurring}
                    onCheckedChange={(checked) => setEditData({ ...editData, isRecurring: checked })}
                  />
                </div>
              </div>
            ) : (
              <>
                <DetailRow
                  icon={FileText}
                  label="Description"
                  value={transaction.description}
                />
                <DetailRow
                  icon={Calendar}
                  label="Date"
                  value={formatTransactionDate(transaction.date)}
                />
                <DetailRow
                  icon={Tag}
                  label="Category"
                  value={category?.name || 'Unknown'}
                />
                <DetailRow
                  icon={CreditCard}
                  label="Account"
                  value={account?.name || 'Unknown'}
                />
                {transaction.payee && (
                  <DetailRow
                    icon={FileText}
                    label="Payee"
                    value={transaction.payee}
                  />
                )}
                {transaction.notes && (
                  <DetailRow
                    icon={FileText}
                    label="Notes"
                    value={transaction.notes}
                  />
                )}
                {transaction.isRecurring && (
                  <DetailRow
                    icon={Repeat}
                    label="Type"
                    value="Recurring Transaction"
                    valueColor="text-blue-600"
                  />
                )}
                <DetailRow
                  icon={Clock}
                  label="Created"
                  value={formatTransactionDate(transaction.createdAt)}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Metadata Card */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Transaction ID</span>
              <span className="font-mono text-xs">{transaction.id.slice(0, 8)}...</span>
            </div>
            {transaction.updatedAt !== transaction.createdAt && (
              <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                <span>Last Updated</span>
                <span>{getRelativeTimeStr(transaction.updatedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
