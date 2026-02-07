/**
 * Investment Service - Tier-One Business Logic
 * Handles investment portfolio with offline-first API integration
 * - Online: Uses API, caches to Dexie
 * - Offline: Uses Dexie, queues changes for sync
 */

import { db } from '@/db';
import {
  generateId,
  type Investment,
  type InvestmentTransaction,
  type Currency,
  type UUID
} from '@/types';
import { format, differenceInDays, differenceInYears } from 'date-fns';
import { investmentApi, networkStatus } from '@/lib/api';

// ==================== TYPES ====================

export type InvestmentType = 'mutual_fund' | 'stocks' | 'fixed_deposit' | 'ppf' | 'nps' | 'gold' | 'real_estate' | 'crypto' | 'bonds' | 'other';

export interface CreateInvestmentInput {
  name: string;
  type: InvestmentType;
  symbol?: string;
  isin?: string;
  folioNumber?: string;
  broker?: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  isTaxSaving?: boolean;
  taxSection?: string;
  notes?: string;
}

export interface InvestmentWithReturns extends Investment {
  absoluteReturn: number;
  percentageReturn: number;
  xirr?: number;
  holdingPeriod: number;
  isProfit: boolean;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  absoluteReturn: number;
  percentageReturn: number;
  todayChange: number;
  todayChangePercent: number;
  allocationByType: Map<InvestmentType, { value: number; percentage: number }>;
  holdings: InvestmentWithReturns[];
  taxSavingInvestments: { section: string; amount: number; limit: number }[];
}

export interface InvestmentTransactionInput {
  investmentId: string;
  type: 'buy' | 'sell' | 'sip' | 'dividend' | 'bonus';
  quantity: number;
  price: number;
  amount: number;
  date?: Date;
  notes?: string;
}

// ==================== CONSTANTS ====================

export const INVESTMENT_TYPE_CONFIG: Record<InvestmentType, {
  label: string;
  icon: string;
  color: string;
  riskLevel: 'low' | 'medium' | 'high';
}> = {
  mutual_fund: { label: 'Mutual Funds', icon: 'LineChart', color: '#3B82F6', riskLevel: 'medium' },
  stocks: { label: 'Stocks', icon: 'TrendingUp', color: '#10B981', riskLevel: 'high' },
  fixed_deposit: { label: 'Fixed Deposits', icon: 'Lock', color: '#F59E0B', riskLevel: 'low' },
  ppf: { label: 'PPF', icon: 'Shield', color: '#8B5CF6', riskLevel: 'low' },
  nps: { label: 'NPS', icon: 'Landmark', color: '#06B6D4', riskLevel: 'low' },
  gold: { label: 'Gold', icon: 'Star', color: '#FBBF24', riskLevel: 'low' },
  real_estate: { label: 'Real Estate', icon: 'Home', color: '#EC4899', riskLevel: 'medium' },
  crypto: { label: 'Crypto', icon: 'Bitcoin', color: '#F97316', riskLevel: 'high' },
  bonds: { label: 'Bonds', icon: 'FileText', color: '#6366F1', riskLevel: 'low' },
  other: { label: 'Other', icon: 'Briefcase', color: '#6B7280', riskLevel: 'medium' },
};

export const TAX_SECTIONS = {
  '80C': { limit: 150000 * 100, label: 'Section 80C', description: 'ELSS, PPF, EPF, etc.' },
  '80CCD(1B)': { limit: 50000 * 100, label: 'Section 80CCD(1B)', description: 'Additional NPS' },
  '80D': { limit: 75000 * 100, label: 'Section 80D', description: 'Health Insurance' },
};

// ==================== OFFLINE QUEUE MANAGEMENT ====================

interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPDATE_PRICE' | 'ADD_TRANSACTION';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'fintrace_investment_sync_queue';

function getSyncQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSyncQueue(queue: SyncQueueItem[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }
}

function queueForSync(
  operation: SyncQueueItem['operation'],
  entityId: string,
  data: Record<string, unknown>
): void {
  const queue = getSyncQueue();
  queue.push({
    id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    operation,
    entityId,
    data,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  });
  saveSyncQueue(queue);
}

// ==================== INVESTMENT CRUD ====================

/**
 * Create a new investment
 */
export async function createInvestment(
  input: CreateInvestmentInput,
  userId: string
): Promise<string> {
  if (!input.name || input.name.trim().length < 2) {
    throw new Error('Investment name must be at least 2 characters');
  }

  if (input.quantity <= 0) {
    throw new Error('Quantity must be positive');
  }

  if (input.avgBuyPrice <= 0 || input.currentPrice <= 0) {
    throw new Error('Price must be positive');
  }

  const investmentId = generateId();
  const now = new Date().toISOString();

  const investedAmount = input.quantity * input.avgBuyPrice;
  const currentValue = input.quantity * input.currentPrice;

  const investment: Investment = {
    id: investmentId,
    userId,
    name: input.name,
    type: input.type,
    symbol: input.symbol,
    isin: input.isin,
    folioNumber: input.folioNumber,
    broker: input.broker,
    quantity: input.quantity,
    avgBuyPrice: input.avgBuyPrice,
    currentPrice: input.currentPrice,
    investedAmount,
    currentValue,
    currency: 'INR' as Currency,
    isTaxSaving: input.isTaxSaving || false,
    taxSection: input.taxSection,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
    lastUpdatedAt: now,
  };

  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiInvestment = await investmentApi.create({
        name: input.name,
        type: input.type.toUpperCase() as any,
        symbol: input.symbol,
        isin: input.isin,
        folioNumber: input.folioNumber,
        broker: input.broker,
        quantity: input.quantity,
        avgBuyPrice: input.avgBuyPrice,
        currentPrice: input.currentPrice,
        isTaxSaving: input.isTaxSaving,
        taxSection: input.taxSection,
        notes: input.notes,
      });
      investment.id = apiInvestment.id;
      await db.investments.add(investment);
      return apiInvestment.id;
    } catch (error) {
      console.warn('API create failed, saving locally:', error);
    }
  }

  // Offline: Save locally and queue for sync
  await db.investments.add(investment);
  queueForSync('CREATE', investmentId, investment as unknown as Record<string, unknown>);
  return investmentId;
}

/**
 * Update investment
 */
export async function updateInvestment(
  investmentId: string,
  updates: Partial<CreateInvestmentInput>
): Promise<void> {
  const investment = await db.investments.get(investmentId);
  if (!investment) {
    throw new Error('Investment not found');
  }

  const now = new Date().toISOString();

  // Build update data carefully
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.symbol !== undefined) updateData.symbol = updates.symbol;
  if (updates.isin !== undefined) updateData.isin = updates.isin;
  if (updates.folioNumber !== undefined) updateData.folioNumber = updates.folioNumber;
  if (updates.broker !== undefined) updateData.broker = updates.broker;
  if (updates.isTaxSaving !== undefined) updateData.isTaxSaving = updates.isTaxSaving;
  if (updates.taxSection !== undefined) updateData.taxSection = updates.taxSection;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  // Recalculate values if quantity or price changed
  const quantity = updates.quantity ?? investment.quantity;
  const avgBuyPrice = updates.avgBuyPrice ?? investment.avgBuyPrice;
  const currentPrice = updates.currentPrice ?? investment.currentPrice;

  if (updates.quantity !== undefined || updates.avgBuyPrice !== undefined || updates.currentPrice !== undefined) {
    updateData.quantity = quantity;
    updateData.avgBuyPrice = avgBuyPrice;
    updateData.currentPrice = currentPrice;
    updateData.investedAmount = quantity * avgBuyPrice;
    updateData.currentValue = quantity * currentPrice;
  }

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await investmentApi.update(investmentId, {
        name: updates.name,
        type: updates.type?.toUpperCase() as any,
        symbol: updates.symbol,
        isin: updates.isin,
        folioNumber: updates.folioNumber,
        broker: updates.broker,
        quantity: updates.quantity,
        avgBuyPrice: updates.avgBuyPrice,
        currentPrice: updates.currentPrice,
        isTaxSaving: updates.isTaxSaving,
        taxSection: updates.taxSection,
        notes: updates.notes,
      });
    } catch (error) {
      console.warn('API update failed, queuing for sync:', error);
      queueForSync('UPDATE', investmentId, updateData);
    }
  } else {
    queueForSync('UPDATE', investmentId, updateData);
  }

  await db.investments.update(investmentId, updateData);
}

/**
 * Delete investment and its transactions
 */
export async function deleteInvestment(investmentId: string): Promise<void> {
  if (networkStatus.isOnline()) {
    try {
      await investmentApi.delete(investmentId);
    } catch (error) {
      console.warn('API delete failed, queuing for sync:', error);
      queueForSync('DELETE', investmentId, { id: investmentId });
    }
  } else {
    queueForSync('DELETE', investmentId, { id: investmentId });
  }

  await db.transaction('rw', [db.investments, db.investmentTransactions], async () => {
    await db.investmentTransactions.where({ investmentId }).delete();
    await db.investments.delete(investmentId);
  });
}

/**
 * Update current price (for market updates)
 */
export async function updateCurrentPrice(
  investmentId: string,
  newPrice: number
): Promise<void> {
  const investment = await db.investments.get(investmentId);
  if (!investment) {
    throw new Error('Investment not found');
  }

  const now = new Date().toISOString();
  const updateData = {
    currentPrice: newPrice,
    currentValue: investment.quantity * newPrice,
    lastUpdatedAt: now,
    updatedAt: now,
  };

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await investmentApi.updatePrice(investmentId, newPrice);
    } catch (error) {
      console.warn('API update price failed, queuing for sync:', error);
      queueForSync('UPDATE_PRICE', investmentId, { price: newPrice });
    }
  } else {
    queueForSync('UPDATE_PRICE', investmentId, { price: newPrice });
  }

  await db.investments.update(investmentId, updateData);
}

// ==================== TRANSACTIONS ====================

/**
 * Add investment transaction (buy, sell, SIP, dividend)
 */
export async function addInvestmentTransaction(
  input: InvestmentTransactionInput,
  userId: string
): Promise<string> {
  const investment = await db.investments.get(input.investmentId);
  if (!investment) {
    throw new Error('Investment not found');
  }

  const transactionId = generateId();
  const now = new Date().toISOString();
  const transactionDate = input.date
    ? format(input.date, 'yyyy-MM-dd')
    : now.split('T')[0];

  const transaction: InvestmentTransaction = {
    id: transactionId,
    investmentId: input.investmentId,
    userId,
    type: input.type,
    quantity: input.quantity,
    price: input.price,
    amount: input.amount,
    fees: 0,
    taxes: 0,
    date: transactionDate,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      const apiTransaction = await investmentApi.addTransaction(input.investmentId, {
        type: input.type.toUpperCase() as any,
        quantity: input.quantity,
        price: input.price,
        amount: input.amount,
        date: transactionDate,
        notes: input.notes,
      });
      transaction.id = apiTransaction.id;
    } catch (error) {
      console.warn('API add transaction failed, queuing for sync:', error);
      queueForSync('ADD_TRANSACTION', transactionId, transaction as unknown as Record<string, unknown>);
    }
  } else {
    queueForSync('ADD_TRANSACTION', transactionId, transaction as unknown as Record<string, unknown>);
  }

  await db.transaction('rw', [db.investments, db.investmentTransactions], async () => {
    await db.investmentTransactions.add(transaction);

    // Update investment holdings
    let newQuantity = investment.quantity;
    let newInvestedAmount = investment.investedAmount;

    if (input.type === 'buy' || input.type === 'sip') {
      newQuantity += input.quantity;
      newInvestedAmount += input.amount;
    } else if (input.type === 'sell') {
      newQuantity -= input.quantity;
      // Proportional reduction in invested amount
      const proportionSold = input.quantity / investment.quantity;
      newInvestedAmount -= investment.investedAmount * proportionSold;
    }
    // Dividend and bonus don't affect quantity/invested amount

    const newAvgPrice = newQuantity > 0 ? newInvestedAmount / newQuantity : 0;
    const newCurrentValue = newQuantity * investment.currentPrice;

    await db.investments.update(input.investmentId, {
      quantity: newQuantity,
      avgBuyPrice: newAvgPrice,
      investedAmount: Math.max(0, newInvestedAmount),
      currentValue: newCurrentValue,
      updatedAt: now,
    });
  });

  return transaction.id;
}

/**
 * Get investment transactions
 */
export async function getInvestmentTransactions(
  investmentId: string
): Promise<InvestmentTransaction[]> {
  // Try to fetch from API if online
  if (networkStatus.isOnline()) {
    try {
      const apiTransactions = await investmentApi.getTransactions(investmentId);
      // Update local cache
      for (const t of apiTransactions) {
        const existing = await db.investmentTransactions.get(t.id);
        if (!existing) {
          await db.investmentTransactions.add({
            id: t.id,
            investmentId,
            userId: '',
            type: t.type.toLowerCase() as any,
            quantity: t.quantity,
            price: t.price,
            amount: t.amount,
            fees: t.fees,
            taxes: t.taxes,
            date: t.date,
            notes: t.notes || undefined,
            createdAt: t.createdAt,
            updatedAt: t.createdAt,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch transactions from API:', error);
    }
  }

  return db.investmentTransactions
    .where({ investmentId })
    .reverse()
    .sortBy('date');
}

// ==================== RETURNS CALCULATION ====================

/**
 * Calculate returns for an investment
 */
function calculateReturns(investment: Investment): InvestmentWithReturns {
  const absoluteReturn = investment.currentValue - investment.investedAmount;
  const percentageReturn = investment.investedAmount > 0
    ? (absoluteReturn / investment.investedAmount) * 100
    : 0;

  const createdDate = new Date(investment.createdAt);
  const holdingPeriod = differenceInDays(new Date(), createdDate);

  return {
    ...investment,
    absoluteReturn,
    percentageReturn,
    holdingPeriod,
    isProfit: absoluteReturn >= 0,
  };
}

// ==================== PORTFOLIO SUMMARY ====================

/**
 * Get complete portfolio summary
 */
export async function getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
  // Try to refresh from API if online
  if (networkStatus.isOnline()) {
    try {
      const apiSummary = await investmentApi.getPortfolioSummary();
      // We have fresh data from API, can use it
      // Also refresh individual investments
      const apiInvestments = await investmentApi.getAll();
      for (const inv of apiInvestments) {
        const existing = await db.investments.get(inv.id);
        if (existing) {
          await db.investments.update(inv.id, {
            name: inv.name,
            currentPrice: inv.currentPrice,
            currentValue: inv.currentValue,
            updatedAt: inv.updatedAt,
          });
        } else {
          await db.investments.add({
            id: inv.id,
            userId,
            name: inv.name,
            type: inv.type.toLowerCase() as InvestmentType,
            symbol: inv.symbol || undefined,
            isin: inv.isin || undefined,
            folioNumber: inv.folioNumber || undefined,
            broker: inv.broker || undefined,
            quantity: inv.quantity,
            avgBuyPrice: inv.avgBuyPrice,
            currentPrice: inv.currentPrice,
            investedAmount: inv.investedAmount,
            currentValue: inv.currentValue,
            currency: inv.currency as Currency,
            isTaxSaving: inv.isTaxSaving,
            taxSection: inv.taxSection || undefined,
            notes: inv.notes || undefined,
            createdAt: inv.createdAt,
            updatedAt: inv.updatedAt,
            lastUpdatedAt: inv.lastUpdatedAt,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch portfolio from API:', error);
    }
  }

  const investments = await db.investments.where({ userId }).toArray();

  // Calculate totals
  let totalInvested = 0;
  let currentValue = 0;
  const allocationByType = new Map<InvestmentType, { value: number; percentage: number }>();
  const holdings: InvestmentWithReturns[] = [];

  for (const inv of investments) {
    totalInvested += inv.investedAmount;
    currentValue += inv.currentValue;

    // Track allocation by type
    const type = inv.type as InvestmentType;
    if (!allocationByType.has(type)) {
      allocationByType.set(type, { value: 0, percentage: 0 });
    }
    const typeAlloc = allocationByType.get(type)!;
    typeAlloc.value += inv.currentValue;

    // Add to holdings with returns
    holdings.push(calculateReturns(inv));
  }

  // Calculate allocation percentages
  for (const [type, alloc] of allocationByType) {
    alloc.percentage = currentValue > 0 ? (alloc.value / currentValue) * 100 : 0;
  }

  // Calculate overall returns
  const absoluteReturn = currentValue - totalInvested;
  const percentageReturn = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

  // Calculate tax saving investments
  const taxSavingInvestments = [];
  for (const [section, config] of Object.entries(TAX_SECTIONS)) {
    const sectionTotal = investments
      .filter(inv => inv.isTaxSaving && inv.taxSection === section)
      .reduce((sum, inv) => sum + inv.investedAmount, 0);

    if (sectionTotal > 0) {
      taxSavingInvestments.push({
        section,
        amount: sectionTotal,
        limit: config.limit,
      });
    }
  }

  // Sort holdings by value
  holdings.sort((a, b) => b.currentValue - a.currentValue);

  return {
    totalInvested,
    currentValue,
    absoluteReturn,
    percentageReturn,
    todayChange: 0, // Would need price history
    todayChangePercent: 0,
    allocationByType,
    holdings,
    taxSavingInvestments,
  };
}

/**
 * Get investments by type
 */
export async function getInvestmentsByType(
  userId: string,
  type: InvestmentType
): Promise<InvestmentWithReturns[]> {
  const investments = await db.investments
    .where({ userId, type })
    .toArray();

  return investments.map(calculateReturns);
}

/**
 * Get tax saving investments for 80C calculation
 */
export async function getTaxSavingInvestments(userId: string): Promise<{
  total80C: number;
  limit80C: number;
  remaining80C: number;
  investments: InvestmentWithReturns[];
}> {
  const investments = await db.investments
    .where({ userId })
    .filter(inv => inv.isTaxSaving && inv.taxSection === '80C')
    .toArray();

  const total80C = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const limit80C = TAX_SECTIONS['80C'].limit;

  return {
    total80C,
    limit80C,
    remaining80C: Math.max(0, limit80C - total80C),
    investments: investments.map(calculateReturns),
  };
}

/**
 * Sync pending offline changes
 */
export async function syncPendingChanges(): Promise<{ synced: number; failed: number }> {
  if (!networkStatus.isOnline()) return { synced: 0, failed: 0 };

  const queue = getSyncQueue();
  let synced = 0;
  let failed = 0;
  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      switch (item.operation) {
        case 'CREATE':
          const investment = await db.investments.get(item.entityId);
          if (investment) {
            await investmentApi.create({
              name: investment.name,
              type: investment.type.toUpperCase() as any,
              symbol: investment.symbol,
              isin: investment.isin,
              folioNumber: investment.folioNumber,
              broker: investment.broker,
              quantity: investment.quantity,
              avgBuyPrice: investment.avgBuyPrice,
              currentPrice: investment.currentPrice,
              isTaxSaving: investment.isTaxSaving,
              taxSection: investment.taxSection,
              notes: investment.notes,
            });
          }
          break;
        case 'UPDATE':
          await investmentApi.update(item.entityId, item.data as any);
          break;
        case 'DELETE':
          await investmentApi.delete(item.entityId);
          break;
        case 'UPDATE_PRICE':
          const priceData = item.data as any;
          await investmentApi.updatePrice(item.entityId, priceData.price);
          break;
        case 'ADD_TRANSACTION':
          const txData = item.data as any;
          await investmentApi.addTransaction(txData.investmentId, {
            type: txData.type.toUpperCase(),
            quantity: txData.quantity,
            price: txData.price,
            amount: txData.amount,
            date: txData.date,
            notes: txData.notes,
          });
          break;
      }
      synced++;
    } catch {
      if (item.retryCount < 3) {
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
      }
      failed++;
    }
  }

  saveSyncQueue(remaining);
  return { synced, failed };
}

// ==================== EXPORTS ====================

export const investmentService = {
  createInvestment,
  updateInvestment,
  deleteInvestment,
  updateCurrentPrice,
  addInvestmentTransaction,
  getInvestmentTransactions,
  getPortfolioSummary,
  getInvestmentsByType,
  getTaxSavingInvestments,
  syncPendingChanges,
  INVESTMENT_TYPE_CONFIG,
  TAX_SECTIONS,
};

export default investmentService;
