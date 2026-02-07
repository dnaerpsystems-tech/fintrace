/**
 * Transactions Page
 * List all transactions with search, filter, and navigation to detail
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Search,
  ShoppingCart,
  Coffee,
  Briefcase,
  Zap,
  Smartphone,
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
  ArrowLeftRight,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { SkeletonTransactionsPage, EmptyState } from '@/components/shared';
import { useTransactions, useCategories } from '@/db/hooks';
import { TransactionType, type Transaction } from '@/types';
import { formatINR } from '@/lib/formatters/currency';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  groceries: ShoppingCart,
  food: Coffee,
  salary: Briefcase,
  utilities: Zap,
  bills: Smartphone,
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
  other: MoreHorizontal,
};

function groupTransactionsByDate(transactions: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!groups.has(tx.date)) groups.set(tx.date, []);
    groups.get(tx.date)!.push(tx);
  }
  return groups;
}

function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

export function TransactionsPage() {
  const navigate = useNavigate();
  const { transactions, isLoading } = useTransactions('default-user', { limit: 100 });
  const { categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string }>();
    categories?.forEach(cat => map.set(cat.id, { name: cat.name, icon: cat.icon, color: cat.color }));
    return map;
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    let filtered = [...transactions];
    if (filterType !== 'all') filtered = filtered.filter(tx => tx.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => tx.description.toLowerCase().includes(q) || categoryMap.get(tx.categoryId)?.name.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterType, searchQuery, categoryMap]);

  const groupedTransactions = useMemo(() => groupTransactionsByDate(filteredTransactions), [filteredTransactions]);

  return (
    <Page>
      <Header title="Transactions" showBack rightActions={
        <motion.button className={`p-2 rounded-full ${showFilters ? 'bg-emerald-100' : ''}`} whileTap={{ scale: 0.9 }} onClick={() => setShowFilters(!showFilters)}>
          <Filter className={`w-5 h-5 ${showFilters ? 'text-emerald-600' : ''}`} />
        </motion.button>
      } />

      <div className="px-4 space-y-4 pb-6">
        <motion.div className="relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input type="text" placeholder="Search transactions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-11 pl-10 pr-10 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
        </motion.div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 overflow-x-auto pb-1">
              {[{ value: 'all', label: 'All' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfers' }].map(f => (
                <button key={f.value} onClick={() => setFilterType(f.value as TransactionType | 'all')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filterType === f.value ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {f.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && <SkeletonTransactionsPage />}

        {!isLoading && filteredTransactions.length === 0 && !searchQuery && (
          <EmptyState
            title="No transactions yet"
            description="Start tracking your income and expenses by adding your first transaction."
            action={{ label: "Add Transaction", onClick: () => navigate('/add') }}
          />
        )}

        {!isLoading && filteredTransactions.length === 0 && searchQuery && (
          <EmptyState
            title="No results found"
            description={`No transactions matching "${searchQuery}"`}
          />
        )}

        {!isLoading && filteredTransactions.length > 0 && Array.from(groupedTransactions.entries()).map(([date, txs], i) => (
          <motion.div key={date} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <h3 className="ios-caption uppercase tracking-wide mb-2">{getDateLabel(date)}</h3>
            <div className="ios-card divide-y divide-border">
              {txs.map(tx => {
                const cat = categoryMap.get(tx.categoryId);
                const Icon = CATEGORY_ICONS[cat?.icon || 'other'] || MoreHorizontal;
                const isIncome = tx.type === TransactionType.INCOME;
                const isTransfer = tx.type === TransactionType.TRANSFER;
                return (
                  <motion.div key={tx.id} className="ios-list-item cursor-pointer" onClick={() => navigate(`/transactions/${tx.id}`)} whileTap={{ scale: 0.98 }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat?.color ? `${cat.color}20` : '#f3f4f6' }}>
                      {isTransfer ? <ArrowLeftRight className="w-5 h-5 text-blue-500" /> : <Icon className="w-5 h-5" style={{ color: cat?.color || '#6b7280' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-500 truncate">{cat?.name || 'Uncategorized'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isIncome ? 'text-emerald-600' : isTransfer ? 'text-blue-600' : 'text-gray-900'}`}>
                        {isIncome ? '+' : ''}{formatINR(tx.amount)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}

        {!isLoading && filteredTransactions.length === 0 && (
          <motion.div className="ios-card p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{searchQuery ? 'No Results' : 'No Transactions'}</h3>
            <p className="text-sm text-gray-500">{searchQuery ? 'Try a different search term' : 'Start adding transactions to see them here'}</p>
          </motion.div>
        )}
      </div>
    </Page>
  );
}

export default TransactionsPage;
