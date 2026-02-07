/**
 * Bank Import Page
 * Import transactions from bank statements (CSV)
 * Tier-One Standards: Column mapping, preview, validation, duplicate detection
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  Loader2,
  Download,
  Settings2,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Plus,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  SheetDescription,
} from '@/components/ui/sheet';
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
import { formatINR } from '@/lib/formatters/currency';
import { useAccounts, useCategories } from '@/db/hooks';
import { TransactionType } from '@/types';
import {
  parseBankStatement,
  importTransactions,
  getCSVHeaders,
  detectBank,
  detectDelimiter,
  BANK_CONFIGS,
  type ParsedTransaction,
  type ColumnMapping,
  type BankImportResult,
} from '@/lib/services/bankImportService';

// ==================== TYPES ====================

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

interface FileState {
  file: File | null;
  content: string;
  headers: string[];
  bankId: string;
  error: string | null;
}

// ==================== COMPONENTS ====================

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: { id: ImportStep; label: string }[];
  currentStep: ImportStep;
}) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = index < currentIndex;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  isComplete ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FileUploadZone({
  onFileSelect,
  isLoading,
}: {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  return (
    <motion.div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {isLoading ? (
        <div className="py-8">
          <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin mb-4" />
          <p className="text-gray-600">Processing file...</p>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Bank Statement
          </h3>
          <p className="text-gray-500 mb-4">
            Drag and drop your CSV file here, or click to browse
          </p>
          <input
            type="file"
            accept=".csv,.CSV"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button asChild variant="outline" className="cursor-pointer">
              <span>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Choose CSV File
              </span>
            </Button>
          </label>
          <p className="text-xs text-gray-400 mt-4">
            Supported formats: CSV (comma, semicolon, or tab separated)
          </p>
        </>
      )}
    </motion.div>
  );
}

function BankSelector({
  selectedBank,
  onSelect,
  detectedBank,
}: {
  selectedBank: string;
  onSelect: (bankId: string) => void;
  detectedBank: string;
}) {
  const banks = Object.entries(BANK_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Select Bank</Label>
        {detectedBank !== 'generic' && detectedBank !== selectedBank && (
          <Badge variant="secondary" className="text-xs">
            Detected: {BANK_CONFIGS[detectedBank]?.name}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {banks.slice(0, -1).map((bank) => (
          <motion.button
            key={bank.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(bank.id)}
            className={`p-3 rounded-xl border-2 text-left transition-colors ${
              selectedBank === bank.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2
                className={`w-5 h-5 ${
                  selectedBank === bank.id ? 'text-blue-500' : 'text-gray-400'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  selectedBank === bank.id ? 'text-blue-700' : 'text-gray-700'
                }`}
              >
                {bank.name}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
      <button
        onClick={() => onSelect('generic')}
        className={`w-full p-3 rounded-xl border-2 text-left transition-colors ${
          selectedBank === 'generic'
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2
              className={`w-5 h-5 ${
                selectedBank === 'generic' ? 'text-blue-500' : 'text-gray-400'
              }`}
            />
            <span
              className={`text-sm font-medium ${
                selectedBank === 'generic' ? 'text-blue-700' : 'text-gray-700'
              }`}
            >
              Other / Custom Mapping
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </button>
    </div>
  );
}

function ColumnMapper({
  headers,
  mapping,
  onChange,
  bankConfig,
}: {
  headers: string[];
  mapping: Partial<ColumnMapping>;
  onChange: (mapping: Partial<ColumnMapping>) => void;
  bankConfig: typeof BANK_CONFIGS[string];
}) {
  const requiredFields = ['date', 'description'];
  const amountFields =
    bankConfig.amountFormat === 'separate'
      ? ['debit', 'credit']
      : ['amount'];
  const optionalFields = ['balance', 'reference'];

  const allFields = [...requiredFields, ...amountFields, ...optionalFields];

  const fieldLabels: Record<string, string> = {
    date: 'Date',
    description: 'Description',
    debit: 'Debit Amount',
    credit: 'Credit Amount',
    amount: 'Amount',
    balance: 'Balance (Optional)',
    reference: 'Reference (Optional)',
  };

  const updateField = (field: string, value: string) => {
    onChange({
      ...mapping,
      [field]: value || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
        <Info className="w-5 h-5 text-blue-500" />
        <p className="text-sm text-blue-700">
          Map your CSV columns to the transaction fields below
        </p>
      </div>

      <div className="space-y-3">
        {allFields.map((field) => {
          const isRequired =
            requiredFields.includes(field) || amountFields.includes(field);
          const currentValue = mapping[field as keyof ColumnMapping] || '';

          return (
            <div key={field} className="flex items-center gap-3">
              <div className="w-1/3">
                <span className="text-sm font-medium text-gray-700">
                  {fieldLabels[field]}
                </span>
                {isRequired && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </div>
              <div className="flex-1">
                <Select
                  value={currentValue}
                  onValueChange={(value: string) => updateField(field, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransactionPreview({
  transactions,
  categories,
  showAll,
  onToggleShow,
}: {
  transactions: ParsedTransaction[];
  categories: Map<string, string>;
  showAll: boolean;
  onToggleShow: () => void;
}) {
  const displayTransactions = showAll
    ? transactions
    : transactions.slice(0, 10);

  const validCount = transactions.filter(t => t.isValid).length;
  const invalidCount = transactions.filter(t => !t.isValid).length;
  const incomeTotal = transactions
    .filter(t => t.isValid && t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions
    .filter(t => t.isValid && t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-3">
            <p className="text-xs text-emerald-600">Valid Transactions</p>
            <p className="text-xl font-bold text-emerald-700">{validCount}</p>
          </CardContent>
        </Card>
        {invalidCount > 0 && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3">
              <p className="text-xs text-red-600">Invalid / Skipped</p>
              <p className="text-xl font-bold text-red-700">{invalidCount}</p>
            </CardContent>
          </Card>
        )}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <p className="text-xs text-blue-600">Total Income</p>
            <p className="text-lg font-bold text-blue-700">
              {formatINR(incomeTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3">
            <p className="text-xs text-orange-600">Total Expense</p>
            <p className="text-lg font-bold text-orange-700">
              {formatINR(expenseTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {displayTransactions.map((tx, index) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`p-3 rounded-xl border ${
              tx.isValid
                ? 'bg-white border-gray-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">{tx.date}</span>
                  {tx.matchedRule && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-purple-100 text-purple-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {tx.matchedRule}
                    </Badge>
                  )}
                  {!tx.isValid && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Error
                    </Badge>
                  )}
                </div>
                <p className="font-medium text-gray-900 truncate">
                  {tx.description}
                </p>
                {tx.categoryName && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tx.categoryName}
                  </p>
                )}
                {tx.errors.length > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {tx.errors.join(', ')}
                  </p>
                )}
              </div>
              <span
                className={`text-sm font-semibold ${
                  tx.type === TransactionType.INCOME
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {tx.type === TransactionType.INCOME ? '+' : '-'}
                {formatINR(tx.amount)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {transactions.length > 10 && (
        <button
          onClick={onToggleShow}
          className="w-full py-2 text-sm text-blue-600 font-medium hover:text-blue-700"
        >
          {showAll
            ? "Show Less"
            : `Show All ${transactions.length} Transactions`}
        </button>
      )}
    </div>
  );
}

function ImportComplete({
  result,
  onDone,
  onImportMore,
}: {
  result: { imported: number; skipped: number };
  onDone: () => void;
  onImportMore: () => void;
}) {
  return (
    <motion.div
      className="text-center py-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h2>
      <p className="text-gray-600 mb-6">
        Successfully imported {result.imported} transactions
        {result.skipped > 0 && ` (${result.skipped} skipped)`}
      </p>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onImportMore}>
          <Plus className="w-4 h-4 mr-2" />
          Import More
        </Button>
        <Button onClick={onDone} className="bg-emerald-500 hover:bg-emerald-600">
          <Check className="w-4 h-4 mr-2" />
          Done
        </Button>
      </div>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function BankImportPage() {
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  // State
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileState, setFileState] = useState<FileState>({
    file: null,
    content: '',
    headers: [],
    bankId: 'generic',
    error: null,
  });
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [customMapping, setCustomMapping] = useState<Partial<ColumnMapping>>({});
  const [parseResult, setParseResult] = useState<BankImportResult | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Category map for preview
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    if (categories) {
      for (const cat of categories) {
        map.set(cat.id, cat.name);
      }
    }
    return map;
  }, [categories]);

  // Active accounts
  const activeAccounts = useMemo(() => {
    return (accounts || []).filter(a => !a.isArchived);
  }, [accounts]);

  // Set default account
  useMemo(() => {
    if (activeAccounts.length > 0 && !selectedAccountId) {
      const defaultAccount = activeAccounts.find(a => a.isDefault) || activeAccounts[0];
      setSelectedAccountId(defaultAccount.id);
    }
  }, [activeAccounts, selectedAccountId]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessing(true);
    setFileState(prev => ({ ...prev, error: null }));

    try {
      // Check file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Read file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      // Get headers and detect bank
      const headers = getCSVHeaders(content);
      const detectedBank = detectBank(headers);

      // Set initial mapping from bank config
      const bankConfig = BANK_CONFIGS[detectedBank];
      const initialMapping: Partial<ColumnMapping> = {};

      for (const [key, value] of Object.entries(bankConfig.columnMapping)) {
        if (headers.includes(value)) {
          initialMapping[key as keyof ColumnMapping] = value;
        }
      }

      setFileState({
        file,
        content,
        headers,
        bankId: detectedBank,
        error: null,
      });
      setCustomMapping(initialMapping);
      setStep('mapping');
    } catch (error) {
      setFileState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to process file',
      }));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle bank change
  const handleBankChange = useCallback(
    (bankId: string) => {
      setFileState(prev => ({ ...prev, bankId }));

      // Update mapping from new bank config
      const bankConfig = BANK_CONFIGS[bankId];
      const newMapping: Partial<ColumnMapping> = {};

      for (const [key, value] of Object.entries(bankConfig.columnMapping)) {
        if (fileState.headers.includes(value)) {
          newMapping[key as keyof ColumnMapping] = value;
        }
      }

      setCustomMapping(newMapping);
    },
    [fileState.headers]
  );

  // Validate mapping
  const isMappingValid = useMemo(() => {
    const bankConfig = BANK_CONFIGS[fileState.bankId];
    const hasDate = !!customMapping.date;
    const hasDescription = !!customMapping.description;

    if (bankConfig.amountFormat === 'separate') {
      return hasDate && hasDescription && (!!customMapping.debit || !!customMapping.credit);
    }
    return hasDate && hasDescription && !!customMapping.amount;
  }, [customMapping, fileState.bankId]);

  // Handle parse
  const handleParse = useCallback(async () => {
    if (!selectedAccountId) {
      return;
    }

    setIsProcessing(true);

    try {
      const result = await parseBankStatement(
        fileState.content,
        fileState.bankId,
        selectedAccountId,
        customMapping
      );

      setParseResult(result);
      setStep('preview');
    } catch (error) {
      setFileState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to parse statement',
      }));
    } finally {
      setIsProcessing(false);
    }
  }, [fileState.content, fileState.bankId, selectedAccountId, customMapping]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!parseResult || !selectedAccountId) return;

    setIsProcessing(true);
    setStep('importing');

    try {
      const result = await importTransactions(
        parseResult.transactions.filter(t => t.isValid),
        selectedAccountId,
        'default-user',
        true // skip duplicates
      );

      setImportResult(result);
      setStep('complete');
    } catch (error) {
      setFileState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to import transactions',
      }));
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [parseResult, selectedAccountId]);

  // Reset and import more
  const handleReset = useCallback(() => {
    setStep('upload');
    setFileState({
      file: null,
      content: '',
      headers: [],
      bankId: 'generic',
      error: null,
    });
    setCustomMapping({});
    setParseResult(null);
    setImportResult(null);
    setShowAllTransactions(false);
  }, []);

  // Steps config
  const steps: { id: ImportStep; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'mapping', label: 'Map' },
    { id: 'preview', label: 'Preview' },
    { id: 'complete', label: 'Done' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Import Statement</h1>
            <p className="text-sm text-gray-500">Import from bank CSV</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Step Indicator */}
        {step !== 'complete' && step !== 'importing' && (
          <StepIndicator steps={steps} currentStep={step} />
        )}

        {/* Error Display */}
        {fileState.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm">{fileState.error}</p>
            </div>
            <button
              onClick={() => setFileState(prev => ({ ...prev, error: null }))}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <FileUploadZone
              onFileSelect={handleFileSelect}
              isLoading={isProcessing}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  Supported Banks
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {Object.entries(BANK_CONFIGS)
                  .filter(([id]) => id !== 'generic')
                  .map(([id, config]) => (
                    <div
                      key={id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                    >
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{config.name}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Mapping */}
        {step === 'mapping' && (
          <div className="space-y-6">
            {/* File Info */}
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {fileState.file?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {fileState.headers.length} columns detected
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardContent>
            </Card>

            {/* Account Selection */}
            <div>
              <Label>Import to Account</Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bank Selection */}
            <BankSelector
              selectedBank={fileState.bankId}
              onSelect={handleBankChange}
              detectedBank={detectBank(fileState.headers)}
            />

            {/* Column Mapping */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Column Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <ColumnMapper
                  headers={fileState.headers}
                  mapping={customMapping}
                  onChange={setCustomMapping}
                  bankConfig={BANK_CONFIGS[fileState.bankId]}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={!isMappingValid || !selectedAccountId || isProcessing}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && parseResult && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Preview Transactions</span>
                  <Badge variant="secondary">
                    {parseResult.transactions.filter(t => t.isValid).length} to import
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionPreview
                  transactions={parseResult.transactions}
                  categories={categoryMap}
                  showAll={showAllTransactions}
                  onToggleShow={() => setShowAllTransactions(!showAllTransactions)}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('mapping')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  parseResult.transactions.filter(t => t.isValid).length === 0 ||
                  isProcessing
                }
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Import {parseResult.transactions.filter(t => t.isValid).length}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="py-16 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin mb-4" />
            <p className="text-gray-600">Importing transactions...</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && importResult && (
          <ImportComplete
            result={importResult}
            onDone={() => navigate('/transactions')}
            onImportMore={handleReset}
          />
        )}
      </div>
    </div>
  );
}
