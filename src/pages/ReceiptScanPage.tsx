/**
 * Receipt Scan Page
 * OCR-based receipt scanning and transaction extraction
 * Tier-One Standards: Image preprocessing, real-time OCR, data extraction
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  X,
  Check,
  AlertCircle,
  Loader2,
  Edit3,
  Save,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Trash2,
  Receipt,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  processReceipt,
  preprocessImage,
  type ExtractedReceiptData,
  type OCRProgress,
} from '@/lib/services/ocrService';

// ==================== COMPONENTS ====================

function ImagePreview({
  imageUrl,
  onRemove,
}: {
  imageUrl: string;
  onRemove: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-2xl overflow-hidden bg-gray-900"
    >
      <div
        className="overflow-hidden"
        style={{ maxHeight: '300px' }}
      >
        <img
          src={imageUrl}
          alt="Receipt"
          className="w-full object-contain transition-transform"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          className="p-1 text-white/70 hover:text-white"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white text-xs w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.25))}
          className="p-1 text-white/70 hover:text-white"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function ProgressIndicator({ progress }: { progress: OCRProgress }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 text-center space-y-4"
    >
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
      <div>
        <p className="font-medium text-gray-900">{progress.message}</p>
        <p className="text-sm text-gray-500 mt-1">{progress.progress}% complete</p>
      </div>
      <Progress value={progress.progress} className="h-2" />
    </motion.div>
  );
}

function ExtractedDataPreview({
  data,
  onEdit,
}: {
  data: ExtractedReceiptData;
  onEdit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Extracted Data</h3>
        <div className="flex items-center gap-2">
          <Badge
            variant={data.confidence > 0.5 ? 'default' : 'secondary'}
            className={data.confidence > 0.5 ? 'bg-emerald-500' : ''}
          >
            {Math.round(data.confidence * 100)}% confident
          </Badge>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-gray-50 to-white">
        <CardContent className="p-4 space-y-4">
          {/* Merchant */}
          {data.merchantName && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Merchant</p>
                <p className="font-medium text-gray-900">{data.merchantName}</p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-emerald-600">
                {data.total ? formatINR(data.total) : 'Not detected'}
              </p>
            </div>
          </div>

          {/* Date */}
          {data.date && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">{data.date}</p>
              </div>
            </div>
          )}

          {/* Payment Method */}
          {data.paymentMethod && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-900">{data.paymentMethod}</p>
              </div>
            </div>
          )}

          {/* Items */}
          {data.items.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Items ({data.items.length})
                </span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {data.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-700 truncate flex-1">
                      {item.quantity && `${item.quantity}x `}
                      {item.name}
                    </span>
                    <span className="font-medium text-gray-900 ml-2">
                      {formatINR(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GST Number */}
          {data.gstNumber && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">GST Number</span>
                <span className="font-mono text-gray-700">{data.gstNumber}</span>
              </div>
            </div>
          )}

          {/* Tax breakdown */}
          {(data.subtotal || data.tax) && (
            <div className="pt-2 border-t border-gray-100 space-y-1">
              {data.subtotal && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700">{formatINR(data.subtotal)}</span>
                </div>
              )}
              {data.tax && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-700">{formatINR(data.tax)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
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
  data: ExtractedReceiptData;
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  onSave: (transaction: Partial<Transaction>) => void;
}) {
  const [amount, setAmount] = useState(data.total ? (data.total / 100).toString() : '');
  const [categoryId, setCategoryId] = useState('shopping');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [date, setDate] = useState(data.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(
    data.merchantName ? `Purchase at ${data.merchantName}` : 'Receipt transaction'
  );
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const amountInPaise = Math.round(Number.parseFloat(amount) * 100);

    if (Number.isNaN(amountInPaise) || amountInPaise <= 0) {
      return;
    }

    onSave({
      type: TransactionType.EXPENSE,
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
          <SheetTitle>Create Transaction</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 overflow-y-auto pb-20">
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
                {categories.map((category) => (
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

function RawTextSheet({
  isOpen,
  onClose,
  text,
}: {
  isOpen: boolean;
  onClose: () => void;
  text: string;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Raw OCR Text</SheetTitle>
        </SheetHeader>

        <div className="mt-4 overflow-y-auto h-full pb-10">
          <pre className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {text}
          </pre>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== MAIN COMPONENT ====================

export default function ReceiptScanPage() {
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active data
  const activeAccounts = (accounts || []).filter(a => !a.isArchived);
  const expenseCategories = (categories || []).filter(
    c => !c.isArchived && c.type === 'expense'
  );

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setError(null);
    setExtractedData(null);
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
  }, []);

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
      // Reset input
      e.target.value = '';
    },
    [handleFileSelect]
  );

  // Remove image
  const handleRemoveImage = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageFile(null);
    setImageUrl(null);
    setExtractedData(null);
    setError(null);
  }, [imageUrl]);

  // Process receipt
  const handleProcess = useCallback(async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Preprocess image
      setProgress({
        status: 'loading',
        progress: 0,
        message: 'Preparing image...',
      });

      const processedCanvas = await preprocessImage(imageFile);

      // Process with OCR
      const result = await processReceipt(processedCanvas, setProgress);

      if (result.success && result.data) {
        setExtractedData(result.data);
      } else {
        setError(result.error || 'Failed to process receipt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process receipt');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [imageFile]);

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
          description: transactionData.description || 'Receipt transaction',
          date: transactionData.date || new Date().toISOString().split('T')[0],
          notes: transactionData.notes,
          payee: extractedData?.merchantName || undefined,
          tagIds: [],
          attachments: imageUrl ? [imageUrl] : [],
          isRecurring: false,
          isFamilyTransaction: false,
          isPending: false,
          isExcludedFromStats: false,
          importSource: 'ocr',
          receiptUrl: imageUrl || undefined,
          createdAt: now,
          updatedAt: now,
        };

        await db.transactions.add(transaction);

        // Update account balance
        const account = await db.accounts.get(transaction.accountId);
        if (account) {
          await db.accounts.update(account.id, {
            balance: account.balance - transaction.amount,
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
    [activeAccounts, navigate, extractedData, imageUrl]
  );

  // Quick save
  const handleQuickSave = useCallback(() => {
    if (!extractedData || !extractedData.total) {
      setShowEditSheet(true);
      return;
    }

    const defaultAccount = activeAccounts.find(a => a.isDefault) || activeAccounts[0];

    handleSaveTransaction({
      type: TransactionType.EXPENSE,
      amount: extractedData.total,
      categoryId: 'shopping',
      accountId: defaultAccount?.id,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      description: extractedData.merchantName
        ? `Purchase at ${extractedData.merchantName}`
        : 'Receipt transaction',
    });
  }, [extractedData, activeAccounts, handleSaveTransaction]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Scan Receipt</h1>
            <p className="text-amber-100 text-sm">Extract transaction from photo</p>
          </div>
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

        {/* Image Selection or Preview */}
        {!imageUrl ? (
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Upload Receipt Photo
                </h2>
                <p className="text-sm text-gray-500">
                  Take a photo or select from gallery
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                >
                  <Camera className="w-8 h-8 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700">Camera</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700">Gallery</span>
                </button>
              </div>

              {/* Hidden inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleInputChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Image Preview */}
            <ImagePreview imageUrl={imageUrl} onRemove={handleRemoveImage} />

            {/* Processing Progress */}
            {isProcessing && progress && (
              <Card>
                <ProgressIndicator progress={progress} />
              </Card>
            )}

            {/* Process Button */}
            {!isProcessing && !extractedData && (
              <Button
                onClick={handleProcess}
                className="w-full bg-amber-500 hover:bg-amber-600 h-12"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Extract Data from Receipt
              </Button>
            )}

            {/* Retry Button */}
            {!isProcessing && extractedData && extractedData.confidence < 0.3 && (
              <Button
                onClick={handleProcess}
                variant="outline"
                className="w-full"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Retry Processing
              </Button>
            )}
          </div>
        )}

        {/* Extracted Data Preview */}
        {extractedData && !isProcessing && (
          <>
            <ExtractedDataPreview
              data={extractedData}
              onEdit={() => setShowEditSheet(true)}
            />

            {/* View Raw Text */}
            <Button
              variant="ghost"
              onClick={() => setShowRawText(true)}
              className="w-full text-gray-500"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Raw Text
            </Button>

            {/* Action Buttons */}
            <div className="flex gap-3">
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
                disabled={isSaving || !extractedData.total}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </>
        )}

        {/* Tips */}
        {!imageUrl && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <h3 className="font-medium text-amber-800 mb-2">Tips for best results:</h3>
              <ul className="space-y-1.5 text-sm text-amber-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Ensure good lighting and flat surface</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Capture the entire receipt in frame</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Keep the camera steady and in focus</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Avoid shadows and reflections</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Sheet */}
      {extractedData && (
        <EditTransactionSheet
          isOpen={showEditSheet}
          onClose={() => setShowEditSheet(false)}
          data={extractedData}
          accounts={activeAccounts.map(a => ({ id: a.id, name: a.name }))}
          categories={expenseCategories.map(c => ({ id: c.id, name: c.name }))}
          onSave={(tx) => {
            setShowEditSheet(false);
            handleSaveTransaction(tx);
          }}
        />
      )}

      {/* Raw Text Sheet */}
      {extractedData && (
        <RawTextSheet
          isOpen={showRawText}
          onClose={() => setShowRawText(false)}
          text={extractedData.rawText}
        />
      )}
    </div>
  );
}
