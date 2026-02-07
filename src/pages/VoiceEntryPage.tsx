/**
 * Voice Entry Page
 * Voice-enabled transaction creation using Web Speech API
 * Tier-One Standards: Real-time recognition, NLP parsing, transaction preview
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Volume2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  HelpCircle,
  Calendar,
  Wallet,
  Tag,
  FileText,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatINR } from '@/lib/formatters/currency';
import { useAccounts, useCategories } from '@/db/hooks';
import { db } from '@/db';
import {
  generateId,
  TransactionType,
  type Transaction,
} from '@/types';
import {
  getVoiceRecognition,
  parseVoiceTranscript,
  type ParsedVoiceTransaction,
  type VoiceRecognitionResult,
} from '@/lib/services/voiceService';

// ==================== CONSTANTS ====================

const EXAMPLE_PHRASES = [
  "Spent 500 rupees on lunch at Swiggy today",
  "Paid 2000 for groceries at BigBasket",
  "Received salary 50 thousand yesterday",
  "Uber ride to office 250 rupees",
  "Five hundred for coffee at Starbucks",
  "Electricity bill 1500 rupees",
  "Got cashback of 100 rupees",
  "Two thousand five hundred for shopping",
];

// ==================== COMPONENTS ====================

function VoiceWaveform({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-20">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className={`w-1 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
          animate={
            isActive
              ? {
                  height: [8, Math.random() * 60 + 20, 8],
                }
              : { height: 8 }
          }
          transition={{
            duration: 0.5,
            repeat: isActive ? Number.POSITIVE_INFINITY : 0,
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

function ParsedDataPreview({
  data,
  categoryName,
  onEdit,
}: {
  data: ParsedVoiceTransaction;
  categoryName?: string;
  onEdit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Parsed Transaction</h3>
        <div className="flex items-center gap-2">
          <Badge
            variant={data.confidence > 0.6 ? 'default' : 'secondary'}
            className={data.confidence > 0.6 ? 'bg-emerald-500' : ''}
          >
            {Math.round(data.confidence * 100)}% confident
          </Badge>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-gray-50 to-white">
        <CardContent className="p-4 space-y-3">
          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Amount</span>
            <span
              className={`text-2xl font-bold ${
                data.type === TransactionType.INCOME
                  ? 'text-emerald-600'
                  : 'text-red-600'
              }`}
            >
              {data.amount ? formatINR(data.amount) : '—'}
            </span>
          </div>

          {/* Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Type</span>
            <Badge
              variant={
                data.type === TransactionType.INCOME ? 'default' : 'destructive'
              }
            >
              {data.type === TransactionType.INCOME ? 'Income' : 'Expense'}
            </Badge>
          </div>

          {/* Category */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Category</span>
            <span className="font-medium text-gray-900">
              {categoryName || data.categoryName || 'Not detected'}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Date</span>
            <span className="font-medium text-gray-900">{data.date}</span>
          </div>

          {/* Description */}
          <div>
            <span className="text-sm text-gray-500">Description</span>
            <p className="font-medium text-gray-900 mt-1">{data.description}</p>
          </div>

          {/* Payee */}
          {data.payee && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Payee</span>
              <span className="font-medium text-gray-900">{data.payee}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">Tips:</p>
              <ul className="text-sm text-amber-600 mt-1 space-y-1">
                {data.suggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function EditTransactionSheet({
  isOpen,
  onClose,
  data,
  accounts,
  categories,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: ParsedVoiceTransaction;
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
  onSave: (transaction: Partial<Transaction>) => void;
}) {
  const [amount, setAmount] = useState(data.amount ? (data.amount / 100).toString() : '');
  const [type, setType] = useState<TransactionType>(data.type);
  const [categoryId, setCategoryId] = useState(data.categoryId || '');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [date, setDate] = useState(data.date);
  const [description, setDescription] = useState(data.description);
  const [notes, setNotes] = useState('');

  const filteredCategories = categories.filter(
    c => c.type === type || c.type === 'expense' || c.type === 'income'
  );

  const handleSave = () => {
    const amountInPaise = Math.round(Number.parseFloat(amount) * 100);

    if (Number.isNaN(amountInPaise) || amountInPaise <= 0) {
      return;
    }

    onSave({
      type,
      amount: amountInPaise,
      categoryId,
      accountId,
      date,
      description,
      notes: notes || undefined,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Edit Transaction</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 overflow-y-auto pb-20">
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`py-3 rounded-xl font-medium transition-colors ${
                type === TransactionType.EXPENSE
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setType(TransactionType.INCOME)}
              className={`py-3 rounded-xl font-medium transition-colors ${
                type === TransactionType.INCOME
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div>
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1.5 text-2xl font-bold text-center h-14"
            />
          </div>

          {/* Account */}
          <div>
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="mt-1.5"
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="mt-1.5"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              disabled={!amount || !categoryId || !accountId}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Transaction
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HelpSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>How to Use Voice Entry</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 overflow-y-auto">
          <p className="text-gray-600">
            Speak naturally about your transaction. Include the amount, what it was for,
            and optionally when it happened.
          </p>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Example phrases:</h4>
            <div className="space-y-2">
              {EXAMPLE_PHRASES.map((phrase, i) => (
                <div
                  key={i}
                  className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 flex items-start gap-2"
                >
                  <Volume2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>"{phrase}"</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Tips:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                <span>Say "today" or "yesterday" for dates</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                <span>Mention the category (food, transport, shopping, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                <span>Say "received" or "got" for income</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                <span>Use "thousand", "lakh" for larger amounts</span>
              </li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== MAIN COMPONENT ====================

export default function VoiceEntryPage() {
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  // State
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsedData, setParsedData] = useState<ParsedVoiceTransaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showHelpSheet, setShowHelpSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const recognitionRef = useRef(getVoiceRecognition());

  // Check support on mount
  useEffect(() => {
    setIsSupported(recognitionRef.current.isSupported());
  }, []);

  // Active accounts and categories
  const activeAccounts = (accounts || []).filter(a => !a.isArchived);
  const activeCategories = (categories || []).filter(c => !c.isArchived);

  // Get category name for display
  const getCategoryName = useCallback(
    (categoryId: string | null) => {
      if (!categoryId) return undefined;
      const category = activeCategories.find(c => c.id === categoryId);
      return category?.name;
    },
    [activeCategories]
  );

  // Handle voice result
  const handleVoiceResult = useCallback((result: VoiceRecognitionResult) => {
    if (result.isFinal) {
      setTranscript(prev => prev + (prev ? ' ' : '') + result.transcript);
      setInterimTranscript('');
    } else {
      setInterimTranscript(result.transcript);
    }
  }, []);

  // Handle voice error
  const handleVoiceError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setIsListening(false);
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setParsedData(null);

    recognitionRef.current.start(handleVoiceResult, handleVoiceError);
    setIsListening(true);
  }, [handleVoiceResult, handleVoiceError]);

  // Stop listening
  const stopListening = useCallback(async () => {
    recognitionRef.current.stop();
    setIsListening(false);

    // Parse the transcript
    if (transcript || interimTranscript) {
      setIsProcessing(true);
      try {
        const fullTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '');
        const parsed = await parseVoiceTranscript(fullTranscript);
        setParsedData(parsed);
      } catch (err) {
        setError('Failed to parse voice input');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [transcript, interimTranscript]);

  // Clear and retry
  const handleRetry = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setParsedData(null);
    setError(null);
  }, []);

  // Save transaction
  const handleSaveTransaction = useCallback(
    async (transactionData: Partial<Transaction>) => {
      if (!transactionData.amount || !transactionData.categoryId) {
        return;
      }

      setIsSaving(true);

      try {
        const now = new Date().toISOString();
        const transaction: Transaction = {
          id: generateId(),
          userId: 'default-user',
          type: transactionData.type || TransactionType.EXPENSE,
          amount: transactionData.amount,
          currency: 'INR',
          accountId: transactionData.accountId || activeAccounts[0]?.id || '',
          categoryId: transactionData.categoryId,
          description: transactionData.description || 'Voice transaction',
          date: transactionData.date || new Date().toISOString().split('T')[0],
          notes: transactionData.notes,
          tagIds: [],
          attachments: [],
          isRecurring: false,
          isFamilyTransaction: false,
          isPending: false,
          isExcludedFromStats: false,
          importSource: 'voice',
          createdAt: now,
          updatedAt: now,
        };

        await db.transactions.add(transaction);

        // Update account balance
        const account = await db.accounts.get(transaction.accountId);
        if (account) {
          const balanceChange =
            transaction.type === TransactionType.INCOME
              ? transaction.amount
              : -transaction.amount;
          await db.accounts.update(account.id, {
            balance: account.balance + balanceChange,
          });
        }

        // Navigate to transactions
        navigate('/transactions');
      } catch (err) {
        setError('Failed to save transaction');
      } finally {
        setIsSaving(false);
      }
    },
    [activeAccounts, navigate]
  );

  // Quick save (without editing)
  const handleQuickSave = useCallback(async () => {
    if (!parsedData || !parsedData.amount) {
      setShowEditSheet(true);
      return;
    }

    const defaultAccount = activeAccounts.find(a => a.isDefault) || activeAccounts[0];

    await handleSaveTransaction({
      type: parsedData.type,
      amount: parsedData.amount,
      categoryId: parsedData.categoryId || 'other',
      accountId: defaultAccount?.id,
      date: parsedData.date,
      description: parsedData.description,
    });
  }, [parsedData, activeAccounts, handleSaveTransaction]);

  // Not supported
  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Voice Entry</h1>
          </div>
        </div>

        <div className="px-4 py-8">
          <Card className="p-8 text-center">
            <MicOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Voice Entry Not Supported
            </h2>
            <p className="text-gray-500 mb-6">
              Your browser doesn't support voice recognition. Please try using
              Chrome, Edge, or Safari.
            </p>
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Voice Entry</h1>
              <p className="text-emerald-100 text-sm">Speak your transaction</p>
            </div>
          </div>
          <button
            onClick={() => setShowHelpSheet(true)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Voice Waveform & Controls */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            {/* Waveform */}
            <div className="mb-6">
              <VoiceWaveform isActive={isListening} />
            </div>

            {/* Transcript Display */}
            <div className="min-h-[80px] mb-6">
              {(transcript || interimTranscript) ? (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-gray-900">
                    {transcript}
                    <span className="text-gray-400">{interimTranscript && ` ${interimTranscript}`}</span>
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <p className="text-gray-400">
                    {isListening
                      ? 'Listening... Speak now'
                      : 'Tap the microphone to start speaking'}
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {/* Retry Button */}
              {(transcript || parsedData) && !isListening && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={handleRetry}
                  className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <RefreshCw className="w-6 h-6 text-gray-600" />
                </motion.button>
              )}

              {/* Main Mic Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={isListening ? stopListening : startListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                  isListening
                    ? 'bg-red-500 shadow-red-200'
                    : 'bg-emerald-500 shadow-emerald-200'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : isListening ? (
                  <Square className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </motion.button>

              {/* Placeholder for symmetry */}
              {(transcript || parsedData) && !isListening && (
                <div className="w-14 h-14" />
              )}
            </div>

            {/* Status Text */}
            <p className="text-center text-sm text-gray-500 mt-4">
              {isProcessing
                ? 'Processing...'
                : isListening
                ? 'Tap to stop'
                : 'Tap to start speaking'}
            </p>
          </CardContent>
        </Card>

        {/* Parsed Data Preview */}
        {parsedData && !isListening && (
          <ParsedDataPreview
            data={parsedData}
            categoryName={getCategoryName(parsedData.categoryId)}
            onEdit={() => setShowEditSheet(true)}
          />
        )}

        {/* Action Buttons */}
        {parsedData && !isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <Button
              variant="outline"
              onClick={() => setShowEditSheet(true)}
              className="flex-1"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={handleQuickSave}
              disabled={isSaving || !parsedData.amount}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </motion.div>
        )}

        {/* Example Phrases */}
        {!transcript && !parsedData && !isListening && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500">Try saying:</h3>
            <div className="space-y-2">
              {EXAMPLE_PHRASES.slice(0, 4).map((phrase, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-3 bg-white rounded-xl border border-gray-100 text-sm text-gray-600"
                >
                  "{phrase}"
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Sheet */}
      {parsedData && (
        <EditTransactionSheet
          isOpen={showEditSheet}
          onClose={() => setShowEditSheet(false)}
          data={parsedData}
          accounts={activeAccounts.map(a => ({ id: a.id, name: a.name }))}
          categories={activeCategories.map(c => ({ id: c.id, name: c.name, type: c.type }))}
          onSave={(tx) => {
            setShowEditSheet(false);
            handleSaveTransaction(tx);
          }}
        />
      )}

      {/* Help Sheet */}
      <HelpSheet isOpen={showHelpSheet} onClose={() => setShowHelpSheet(false)} />
    </div>
  );
}
