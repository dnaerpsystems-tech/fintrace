/**
 * Data Management Page
 * Import, Export, and Seed demo data
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Database,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  ChevronRight,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { formatINR } from '@/lib/formatters/currency';
import {
  downloadAsJSON,
  downloadAsCSV,
  importFromFile,
  getStorageStats,
  type ImportResult,
} from '@/lib/services/dataService';
import { seedDemoData, clearAllData, hasUserData } from '@/lib/services/seedService';
import { exportTransactionsToPDF, exportTransactionsToExcel, exportReportToPDF, exportReportToExcel } from '@/lib/services/exportService';
import { db } from '@/db';

// ==================== TYPES ====================

interface StorageStats {
  accounts: number;
  transactions: number;
  budgets: number;
  goals: number;
  loans: number;
  investments: number;
  categories: number;
  totalRecords: number;
}

// ==================== COMPONENTS ====================

/**
 * Action Card Component
 */
function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  variant = 'default',
  disabled = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
}) {
  const colorMap = {
    default: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
    danger: { bg: 'bg-red-500/10', text: 'text-red-500' },
  };

  const colors = colorMap[variant];

  return (
    <motion.button
      className={`w-full ios-card p-4 text-left ${disabled ? 'opacity-50' : ''}`}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </motion.button>
  );
}

/**
 * Stats Card Component
 */
function StatsCard({ stats }: { stats: StorageStats }) {
  const items = [
    { label: 'Accounts', value: stats.accounts },
    { label: 'Transactions', value: stats.transactions },
    { label: 'Budgets', value: stats.budgets },
    { label: 'Goals', value: stats.goals },
    { label: 'Loans', value: stats.loans },
    { label: 'Investments', value: stats.investments },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-gray-500" />
          <CardTitle className="text-lg">Storage Usage</CardTitle>
        </div>
        <CardDescription>
          {stats.totalRecords.toLocaleString()} total records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.label} className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Result Toast Component
 */
function ResultToast({
  result,
  onClose,
}: {
  result: { type: 'success' | 'error'; message: string } | null;
  onClose: () => void;
}) {
  if (!result) return null;

  return (
    <AnimatePresence>
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
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <XCircle className="w-6 h-6" />
          )}
          <p className="flex-1 font-medium">{result.message}</p>
          <button onClick={onClose} className="p-1">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== MAIN COMPONENT ====================

export default function DataManagementPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load stats on mount
  useState(() => {
    loadStats();
  });

  async function loadStats() {
    try {
      const storageStats = await getStorageStats();
      setStats(storageStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // Export handlers
  async function handleExportJSON() {
    setLoadingAction('export-json');
    try {
      await downloadAsJSON();
      setResult({ type: 'success', message: 'Data exported successfully!' });
    } catch (error) {
      setResult({ type: 'error', message: 'Export failed. Please try again.' });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleExportTransactionsCSV() {
    setLoadingAction('export-csv-transactions');
    try {
      await downloadAsCSV({ type: 'transactions' });
      setResult({ type: 'success', message: 'Transactions exported to CSV!' });
    } catch (error) {
      setResult({ type: 'error', message: 'Export failed. Please try again.' });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleExportInvestmentsCSV() {
    setLoadingAction('export-csv-investments');
    try {
      await downloadAsCSV({ type: 'investments' });
      setResult({ type: 'success', message: 'Investments exported to CSV!' });
    } catch (error) {
      setResult({ type: 'error', message: 'Export failed. Please try again.' });
    } finally {
      setLoadingAction(null);
    }
  }

  // Import handler
  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingAction('import');
    try {
      const importResult = await importFromFile(file, { merge: true });

      if (importResult.success) {
        setResult({
          type: 'success',
          message: `Imported ${importResult.imported.accounts} accounts, ${importResult.imported.transactions} transactions`,
        });
        await loadStats();
      } else {
        setResult({ type: 'error', message: importResult.message });
      }
    } catch (error) {
      setResult({ type: 'error', message: 'Import failed. Invalid file format.' });
    } finally {
      setLoadingAction(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  // Seed demo data
  async function handleSeedDemo() {
    setLoadingAction('seed');
    try {
      const seedResult = await seedDemoData(false);

      if (seedResult.success) {
        if (seedResult.accountsCreated > 0) {
          setResult({
            type: 'success',
            message: `Created ${seedResult.accountsCreated} accounts and ${seedResult.transactionsCreated} transactions`,
          });
        } else {
          setResult({ type: 'success', message: seedResult.message });
        }
        await loadStats();
      } else {
        setResult({ type: 'error', message: seedResult.message });
      }
    } catch (error) {
      setResult({ type: 'error', message: 'Failed to create demo data' });
    } finally {
      setLoadingAction(null);
    }
  }

  // Clear all data
  async function handleClearData() {
    setLoadingAction('clear');
    try {
      await clearAllData();
      setResult({ type: 'success', message: 'All data cleared successfully' });
      await loadStats();
    } catch (error) {
      setResult({ type: 'error', message: 'Failed to clear data' });
    } finally {
      setLoadingAction(null);
    }
  }

  // Auto-hide result after 3 seconds
  if (result) {
    setTimeout(() => setResult(null), 3000);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Data Management</h1>
            <p className="text-gray-500 text-sm">Backup, restore, and manage your data</p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="px-4 py-4 space-y-6">
        {/* Storage Stats */}
        {stats && <StatsCard stats={stats} />}

        {/* Export Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Export Data
          </h3>
          <div className="space-y-3">
            <ActionCard
              icon={FileJson}
              title="Export as JSON"
              description="Full backup including all data"
              onClick={handleExportJSON}
              variant="success"
              disabled={loadingAction !== null}
            />
            <ActionCard
              icon={FileSpreadsheet}
              title="Export Transactions (CSV)"
              description="For spreadsheet analysis"
              onClick={handleExportTransactionsCSV}
              variant="default"
              disabled={loadingAction !== null}
            />
            <ActionCard
              icon={FileSpreadsheet}
              title="Export Investments (CSV)"
              description="Portfolio holdings and returns"
              onClick={handleExportInvestmentsCSV}
              variant="default"
              disabled={loadingAction !== null}
            />
          </div>
        </div>

        {/* Import Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Import Data
          </h3>
          <div className="space-y-3">
            <ActionCard
              icon={Upload}
              title="Import from JSON"
              description="Restore from a previous backup"
              onClick={handleImportClick}
              variant="default"
              disabled={loadingAction !== null}
            />
          </div>
        </div>

        {/* Demo Data Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Demo Data
          </h3>
          <div className="space-y-3">
            <ActionCard
              icon={Sparkles}
              title="Load Demo Data"
              description="Populate app with sample transactions"
              onClick={handleSeedDemo}
              variant="warning"
              disabled={loadingAction !== null}
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3">
            Danger Zone
          </h3>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <motion.button
                className="w-full ios-card p-4 text-left border-red-200"
                whileTap={{ scale: 0.98 }}
                disabled={loadingAction !== null}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-red-600">Clear All Data</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Permanently delete all your data
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Clear All Data?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your accounts, transactions, budgets,
                  goals, loans, and investments. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearData}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Data Privacy</p>
                <p>
                  Your data is stored locally on your device using IndexedDB.
                  We don't have access to your financial data. Export regularly
                  to create backups.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading Overlay */}
      {loadingAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="font-medium text-gray-900">
              {loadingAction === 'export-json' && 'Exporting data...'}
              {loadingAction === 'export-csv-transactions' && 'Exporting transactions...'}
              {loadingAction === 'export-csv-investments' && 'Exporting investments...'}
              {loadingAction === 'import' && 'Importing data...'}
              {loadingAction === 'seed' && 'Creating demo data...'}
              {loadingAction === 'clear' && 'Clearing data...'}
            </p>
          </div>
        </div>
      )}

      {/* Result Toast */}
      <ResultToast result={result} onClose={() => setResult(null)} />
    </div>
  );
}
