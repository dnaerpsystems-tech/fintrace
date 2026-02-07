/**
 * Loan Service - Tier-One Business Logic
 * Handles loan management with offline-first API integration
 * - Online: Uses API, caches to Dexie
 * - Offline: Uses Dexie, queues changes for sync
 */

import { db } from '@/db';
import { generateId, type Loan, type EMISchedule, type EMIPayment, LoanStatus, EMIStatus, type LoanType, type UUID } from '@/types';
import { calculateEMI, generateAmortizationSchedule, calculateLoanProgress, calculatePrepaymentImpact, type LoanInput as CalcLoanInput } from '@/lib/calculations/loan';
import { validateLoan, type LoanInput as ValidatorLoanInput } from '@/lib/validators';
import { addMonths, format } from 'date-fns';
import { loanApi, networkStatus } from '@/lib/api';

// ==================== TYPES ====================

export interface CreateLoanInput {
  name: string;
  type: string;
  lender: string;
  principal: number; // in paise
  annualRate: number;
  tenureMonths: number;
  emiDay: number;
  startDate: Date;
  linkedAccountId?: string;
  notes?: string;
  taxSection?: string;
}

export interface LoanWithSchedule extends Loan {
  schedule: EMISchedule[];
  progress: LoanProgressInfo;
}

export interface LoanProgressInfo {
  totalPaid: number;
  principalPaid: number;
  interestPaid: number;
  outstandingPrincipal: number;
  percentageComplete: number;
  emisPaid: number;
  emisRemaining: number;
  nextEMIDate: Date;
  nextEMIAmount: number;
  isOverdue: boolean;
  overdueAmount: number;
  overdueCount: number;
}

export interface LoanSummary {
  totalLoans: number;
  activeLoans: number;
  totalOutstanding: number;
  totalMonthlyEMI: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  upcomingEMIs: { loanId: string; loanName: string; amount: number; dueDate: string }[];
  overdueEMIs: { loanId: string; loanName: string; amount: number; dueDate: string }[];
}

// ==================== OFFLINE QUEUE MANAGEMENT ====================

interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'RECORD_PAYMENT';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'fintrace_loan_sync_queue';

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

// ==================== LOAN CREATION ====================

/**
 * Create a new loan with EMI schedule
 */
export async function createLoan(input: CreateLoanInput, userId: string): Promise<string> {
  // Validate input
  const validation = validateLoan({
    name: input.name,
    type: input.type,
    principal: input.principal,
    annualRate: input.annualRate,
    tenureMonths: input.tenureMonths,
    emiDay: input.emiDay,
    startDate: input.startDate,
  } as ValidatorLoanInput);

  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  // Calculate EMI
  const emiResult = calculateEMI(
    input.principal,
    input.annualRate,
    input.tenureMonths
  );
  const emi = emiResult.emi;
  const totalInterest = emiResult.totalInterest;
  const totalPayment = emiResult.totalPayment;

  const loanId = generateId();
  const now = new Date().toISOString();

  // Create loan record
  const loan: Loan = {
    id: loanId,
    userId,
    name: input.name,
    type: input.type as LoanType,
    lender: input.lender,
    lenderName: input.lender,
    lenderType: 'bank',
    principalAmount: input.principal,
    interestRate: input.annualRate,
    interestType: 'fixed',
    tenure: input.tenureMonths,
    emiAmount: emi,
    emiDay: input.emiDay,
    startDate: format(input.startDate, 'yyyy-MM-dd'),
    endDate: format(addMonths(input.startDate, input.tenureMonths), 'yyyy-MM-dd'),
    disbursementDate: format(input.startDate, 'yyyy-MM-dd'),
    firstEmiDate: format(addMonths(input.startDate, 1), 'yyyy-MM-dd'),
    lastEmiDate: format(addMonths(input.startDate, input.tenureMonths), 'yyyy-MM-dd'),
    status: LoanStatus.ACTIVE,
    outstandingPrincipal: input.principal,
    outstandingInterest: totalInterest,
    remainingTenure: input.tenureMonths,
    totalInterest: totalInterest,
    totalPaid: 0,
    totalPayable: totalPayment,
    totalInterestPayable: totalInterest,
    partPaymentAllowed: true,
    principalTaxBenefit: false,
    interestTaxBenefit: false,
    isFamilyLoan: false,
    linkedAccountId: input.linkedAccountId,
    taxSection: input.taxSection,
    notes: input.notes,
    icon: 'FileText',
    color: '#3B82F6',
    createdAt: now,
    updatedAt: now,
  };

  // Generate EMI schedule
  const scheduleInput: CalcLoanInput = {
    principal: input.principal,
    annualRate: input.annualRate,
    tenureMonths: input.tenureMonths,
    startDate: input.startDate,
    emiDay: input.emiDay,
  };

  const amortization = generateAmortizationSchedule(scheduleInput);
  const emiSchedules: EMISchedule[] = amortization.map((entry) => ({
    id: generateId(),
    loanId,
    emiNumber: entry.month,
    dueDate: format(entry.date, 'yyyy-MM-dd'),
    emiAmount: entry.emi,
    principalComponent: entry.principalComponent,
    interestComponent: entry.interestComponent,
    totalAmount: entry.emi,
    openingBalance: entry.openingBalance,
    closingBalance: entry.closingBalance,
    outstandingAfter: entry.closingBalance,
    status: EMIStatus.PENDING,
    createdAt: now,
    updatedAt: now,
  }));

  // Try API first if online
  if (networkStatus.isOnline()) {
    try {
      const apiLoan = await loanApi.create({
        name: input.name,
        type: input.type.toUpperCase() as 'HOME' | 'CAR' | 'PERSONAL' | 'EDUCATION' | 'BUSINESS' | 'GOLD' | 'OTHER',
        principalAmount: input.principal,
        interestRate: input.annualRate,
        tenure: input.tenureMonths,
        startDate: loan.startDate,
        lender: input.lender,
        linkedAccountId: input.linkedAccountId,
      });
      loan.id = apiLoan.id;

      // Update schedule with new loan ID
      for (const schedule of emiSchedules) {
        schedule.loanId = apiLoan.id;
      }

      await db.transaction('rw', [db.loans, db.emiSchedules], async () => {
        await db.loans.add(loan);
        await db.emiSchedules.bulkAdd(emiSchedules);
      });

      return apiLoan.id;
    } catch (error) {
      console.warn('API create failed, saving locally:', error);
    }
  }

  // Offline: Save locally and queue for sync
  await db.transaction('rw', [db.loans, db.emiSchedules], async () => {
    await db.loans.add(loan);
    await db.emiSchedules.bulkAdd(emiSchedules);
  });

  queueForSync('CREATE', loanId, loan as unknown as Record<string, unknown>);
  return loanId;
}

// ==================== LOAN RETRIEVAL ====================

/**
 * Get loan with full schedule and progress
 */
export async function getLoanWithDetails(loanId: string): Promise<LoanWithSchedule | null> {
  const loan = await db.loans.get(loanId);
  if (!loan) return null;

  const schedule = await db.emiSchedules.where({ loanId }).sortBy('emiNumber');
  const progress = await calculateProgress(loan, schedule);

  return {
    ...loan,
    schedule,
    progress,
  };
}

/**
 * Calculate loan progress from schedule
 */
async function calculateProgress(loan: Loan, schedule: EMISchedule[]): Promise<LoanProgressInfo> {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const paidSchedules = schedule.filter(s => s.status === EMIStatus.PAID);
  const pendingSchedules = schedule.filter(s => s.status === EMIStatus.PENDING);
  const overdueSchedules = pendingSchedules.filter(s => s.dueDate < todayStr);

  const principalPaid = paidSchedules.reduce((sum, s) => sum + s.principalComponent, 0);
  const interestPaid = paidSchedules.reduce((sum, s) => sum + s.interestComponent, 0);
  const totalPaid = principalPaid + interestPaid;

  const overdueAmount = overdueSchedules.reduce((sum, s) => sum + s.emiAmount, 0);

  // Find next pending EMI
  const nextEMI = pendingSchedules
    .filter(s => s.dueDate >= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return {
    totalPaid,
    principalPaid,
    interestPaid,
    outstandingPrincipal: loan.outstandingPrincipal,
    percentageComplete: (principalPaid / loan.principalAmount) * 100,
    emisPaid: paidSchedules.length,
    emisRemaining: pendingSchedules.length,
    nextEMIDate: nextEMI ? new Date(nextEMI.dueDate) : new Date(),
    nextEMIAmount: nextEMI?.emiAmount || 0,
    isOverdue: overdueSchedules.length > 0,
    overdueAmount,
    overdueCount: overdueSchedules.length,
  };
}

/**
 * Get loan summary for dashboard
 */
export async function getLoanSummary(userId: string): Promise<LoanSummary> {
  // Try to refresh from API if online
  if (networkStatus.isOnline()) {
    try {
      const apiLoans = await loanApi.getAll();
      for (const l of apiLoans) {
        const existing = await db.loans.get(l.id);
        if (existing) {
          await db.loans.update(l.id, {
            name: l.name,
            totalPaid: l.totalPaid,
            remainingTenure: l.tenure - Math.floor((l.totalPaid / l.principalAmount) * l.tenure),
            status: l.status.toLowerCase() as LoanStatus,
            updatedAt: l.updatedAt,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch loans from API:', error);
    }
  }

  const loans = await db.loans.where({ userId }).toArray();
  const activeLoans = loans.filter(l => l.status === LoanStatus.ACTIVE);

  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysLater = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

  // Get all pending EMIs for active loans
  const activeLoanIds = activeLoans.map(l => l.id);
  const allSchedules = await db.emiSchedules
    .where('loanId')
    .anyOf(activeLoanIds)
    .and(s => s.status === EMIStatus.PENDING)
    .toArray();

  const upcomingEMIs = allSchedules
    .filter(s => s.dueDate >= today && s.dueDate <= thirtyDaysLater)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
    .map(s => {
      const loan = activeLoans.find(l => l.id === s.loanId);
      return {
        loanId: s.loanId,
        loanName: loan?.name || 'Unknown',
        amount: s.emiAmount,
        dueDate: s.dueDate,
      };
    });

  const overdueEMIs = allSchedules
    .filter(s => s.dueDate < today)
    .map(s => {
      const loan = activeLoans.find(l => l.id === s.loanId);
      return {
        loanId: s.loanId,
        loanName: loan?.name || 'Unknown',
        amount: s.emiAmount,
        dueDate: s.dueDate,
      };
    });

  // Calculate totals
  const paidSchedules = await db.emiSchedules
    .where('loanId')
    .anyOf(activeLoanIds)
    .and(s => s.status === EMIStatus.PAID)
    .toArray();

  return {
    totalLoans: loans.length,
    activeLoans: activeLoans.length,
    totalOutstanding: activeLoans.reduce((sum, l) => sum + l.outstandingPrincipal + l.outstandingInterest, 0),
    totalMonthlyEMI: activeLoans.reduce((sum, l) => sum + l.emiAmount, 0),
    totalPrincipalPaid: paidSchedules.reduce((sum, s) => sum + s.principalComponent, 0),
    totalInterestPaid: paidSchedules.reduce((sum, s) => sum + s.interestComponent, 0),
    upcomingEMIs,
    overdueEMIs,
  };
}

// ==================== EMI PAYMENT ====================

/**
 * Record an EMI payment
 */
export async function recordEMIPayment(
  emiScheduleId: string,
  paidDate: Date,
  userId: string,
  transactionId?: string,
  lateFee?: number,
  notes?: string
): Promise<void> {
  const emi = await db.emiSchedules.get(emiScheduleId);
  if (!emi) throw new Error('EMI schedule not found');

  if (emi.status === EMIStatus.PAID) {
    throw new Error('EMI already paid');
  }

  const now = new Date().toISOString();
  const paidDateStr = format(paidDate, 'yyyy-MM-dd');
  const totalPaidAmount = emi.emiAmount + (lateFee || 0);

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await loanApi.recordPayment(emi.loanId, {
        amount: totalPaidAmount,
        paidDate: paidDateStr,
        emiNumber: emi.emiNumber,
        notes,
      });
    } catch (error) {
      console.warn('API record payment failed, queuing for sync:', error);
      queueForSync('RECORD_PAYMENT', emiScheduleId, {
        loanId: emi.loanId,
        amount: totalPaidAmount,
        paidDate: paidDateStr,
        emiNumber: emi.emiNumber,
        notes,
      });
    }
  } else {
    queueForSync('RECORD_PAYMENT', emiScheduleId, {
      loanId: emi.loanId,
      amount: totalPaidAmount,
      paidDate: paidDateStr,
      emiNumber: emi.emiNumber,
      notes,
    });
  }

  await db.transaction('rw', [db.emiSchedules, db.emiPayments, db.loans], async () => {
    // Update EMI status
    await db.emiSchedules.update(emiScheduleId, {
      status: EMIStatus.PAID,
      paidDate: paidDateStr,
      paidAmount: totalPaidAmount,
      updatedAt: now,
    });

    // Record payment
    const payment: EMIPayment = {
      id: generateId(),
      loanId: emi.loanId,
      emiScheduleId,
      userId,
      paidDate: paidDateStr,
      paidAmount: totalPaidAmount,
      totalPaid: totalPaidAmount,
      principalPaid: emi.principalComponent,
      interestPaid: emi.interestComponent,
      transactionId,
      notes,
      createdAt: now,
      updatedAt: now,
    };
    await db.emiPayments.add(payment);

    // Update loan outstanding
    const loan = await db.loans.get(emi.loanId);
    if (loan) {
      const newOutstandingPrincipal = loan.outstandingPrincipal - emi.principalComponent;
      const newOutstandingInterest = loan.outstandingInterest - emi.interestComponent;
      const newRemainingTenure = loan.remainingTenure - 1;

      // Check if loan is fully paid
      const newStatus = newRemainingTenure <= 0 ? LoanStatus.CLOSED : loan.status;

      await db.loans.update(emi.loanId, {
        outstandingPrincipal: Math.max(0, newOutstandingPrincipal),
        outstandingInterest: Math.max(0, newOutstandingInterest),
        remainingTenure: Math.max(0, newRemainingTenure),
        totalPaid: (loan.totalPaid || 0) + totalPaidAmount,
        status: newStatus,
        closedDate: newStatus === LoanStatus.CLOSED ? paidDateStr : undefined,
        updatedAt: now,
      });
    }
  });
}

// ==================== PREPAYMENT ====================

/**
 * Process a loan prepayment
 */
export async function processLoanPrepayment(
  loanId: string,
  prepaymentAmount: number,
  reduceEMI: boolean,
  userId: string,
  transactionId?: string
): Promise<{ interestSaved: number; tenureReduction: number; newEMI?: number }> {
  const loan = await db.loans.get(loanId);
  if (!loan) throw new Error('Loan not found');

  if (loan.status !== LoanStatus.ACTIVE) {
    throw new Error('Loan is not active');
  }

  if (prepaymentAmount > loan.outstandingPrincipal) {
    throw new Error('Prepayment amount exceeds outstanding principal');
  }

  // Calculate prepayment impact
  const scheduleInput: CalcLoanInput = {
    principal: loan.principalAmount,
    annualRate: loan.interestRate,
    tenureMonths: loan.tenure,
    startDate: new Date(loan.startDate),
    emiDay: loan.emiDay,
  };

  const paidEMIs = loan.tenure - loan.remainingTenure;
  const impact = calculatePrepaymentImpact(scheduleInput, prepaymentAmount, reduceEMI, paidEMIs);

  const now = new Date().toISOString();

  await db.transaction('rw', [db.loans, db.emiSchedules, db.emiPayments], async () => {
    // Record prepayment
    const payment: EMIPayment = {
      id: generateId(),
      loanId,
      emiScheduleId: '', // No specific EMI for prepayment
      userId,
      paidDate: format(new Date(), 'yyyy-MM-dd'),
      paidAmount: prepaymentAmount,
      totalPaid: prepaymentAmount,
      principalPaid: prepaymentAmount,
      interestPaid: 0,
      isPrepayment: true,
      prepaymentAmount: prepaymentAmount,
      notes: `Prepayment - ${reduceEMI ? 'Reduced EMI' : 'Reduced Tenure'}`,
      transactionId,
      createdAt: now,
      updatedAt: now,
    };
    await db.emiPayments.add(payment);

    // Update loan
    const newOutstanding = loan.outstandingPrincipal - prepaymentAmount;

    if (reduceEMI && impact.newEMI) {
      // Keep tenure, reduce EMI
      await db.loans.update(loanId, {
        outstandingPrincipal: newOutstanding,
        emiAmount: impact.newEMI,
        totalPaid: (loan.totalPaid || 0) + prepaymentAmount,
        updatedAt: now,
      });

      // Update remaining EMI schedules
      const pendingSchedules = await db.emiSchedules
        .where({ loanId })
        .filter(s => s.status === EMIStatus.PENDING)
        .toArray();

      // Recalculate schedule with new EMI
      const newSchedule = generateAmortizationSchedule({
        principal: newOutstanding,
        annualRate: loan.interestRate,
        tenureMonths: pendingSchedules.length,
        startDate: new Date(pendingSchedules[0]?.dueDate || new Date()),
        emiDay: loan.emiDay,
      });

      for (let i = 0; i < pendingSchedules.length && i < newSchedule.length; i++) {
        await db.emiSchedules.update(pendingSchedules[i].id, {
          emiAmount: newSchedule[i].emi,
          principalComponent: newSchedule[i].principalComponent,
          interestComponent: newSchedule[i].interestComponent,
          totalAmount: newSchedule[i].emi,
          openingBalance: newSchedule[i].openingBalance,
          closingBalance: newSchedule[i].closingBalance,
          outstandingAfter: newSchedule[i].closingBalance,
          updatedAt: now,
        });
      }
    } else {
      // Keep EMI, reduce tenure
      const tenureReduction = impact.tenureReduction;

      await db.loans.update(loanId, {
        outstandingPrincipal: newOutstanding,
        remainingTenure: loan.remainingTenure - tenureReduction,
        outstandingInterest: loan.outstandingInterest - impact.interestSaved,
        totalPaid: (loan.totalPaid || 0) + prepaymentAmount,
        updatedAt: now,
      });

      // Delete extra EMI schedules
      const pendingSchedules = await db.emiSchedules
        .where({ loanId })
        .filter(s => s.status === EMIStatus.PENDING)
        .sortBy('emiNumber');

      // Remove schedules from the end
      const schedulesToDelete = pendingSchedules.slice(-tenureReduction);
      for (const schedule of schedulesToDelete) {
        await db.emiSchedules.delete(schedule.id);
      }

      // Recalculate remaining schedules
      const remainingSchedules = pendingSchedules.slice(0, -tenureReduction);
      const newSchedule = generateAmortizationSchedule({
        principal: newOutstanding,
        annualRate: loan.interestRate,
        tenureMonths: remainingSchedules.length,
        startDate: new Date(remainingSchedules[0]?.dueDate || new Date()),
        emiDay: loan.emiDay,
      });

      for (let i = 0; i < remainingSchedules.length && i < newSchedule.length; i++) {
        await db.emiSchedules.update(remainingSchedules[i].id, {
          principalComponent: newSchedule[i].principalComponent,
          interestComponent: newSchedule[i].interestComponent,
          totalAmount: newSchedule[i].emi,
          openingBalance: newSchedule[i].openingBalance,
          closingBalance: newSchedule[i].closingBalance,
          outstandingAfter: newSchedule[i].closingBalance,
          updatedAt: now,
        });
      }
    }
  });

  return {
    interestSaved: impact.interestSaved,
    tenureReduction: impact.tenureReduction,
    newEMI: impact.newEMI,
  };
}

// ==================== LOAN CLOSURE ====================

/**
 * Close a loan (foreclosure or regular closure)
 */
export async function closeLoan(loanId: string, isForeclosure = false): Promise<void> {
  const loan = await db.loans.get(loanId);
  if (!loan) throw new Error('Loan not found');

  const now = new Date().toISOString();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Try API first
  if (networkStatus.isOnline()) {
    try {
      await loanApi.update(loanId, {
        status: isForeclosure ? 'CLOSED' : 'CLOSED',
      });
    } catch (error) {
      console.warn('API close loan failed, queuing for sync:', error);
      queueForSync('UPDATE', loanId, {
        status: isForeclosure ? LoanStatus.FORECLOSED : LoanStatus.CLOSED,
        closedDate: todayStr,
      });
    }
  } else {
    queueForSync('UPDATE', loanId, {
      status: isForeclosure ? LoanStatus.FORECLOSED : LoanStatus.CLOSED,
      closedDate: todayStr,
    });
  }

  await db.transaction('rw', [db.loans, db.emiSchedules], async () => {
    await db.loans.update(loanId, {
      status: isForeclosure ? LoanStatus.FORECLOSED : LoanStatus.CLOSED,
      closedDate: todayStr,
      outstandingPrincipal: 0,
      outstandingInterest: 0,
      remainingTenure: 0,
      updatedAt: now,
    });

    // Mark all pending EMIs as skipped
    const pendingSchedules = await db.emiSchedules
      .where({ loanId })
      .filter(s => s.status === EMIStatus.PENDING)
      .toArray();

    for (const schedule of pendingSchedules) {
      await db.emiSchedules.update(schedule.id, {
        status: EMIStatus.SKIPPED,
        updatedAt: now,
      });
    }
  });
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
          const loan = await db.loans.get(item.entityId);
          if (loan) {
            await loanApi.create({
              name: loan.name,
              type: loan.type.toUpperCase() as any,
              principalAmount: loan.principalAmount,
              interestRate: loan.interestRate,
              tenure: loan.tenure,
              startDate: loan.startDate,
              lender: loan.lender,
              linkedAccountId: loan.linkedAccountId,
            });
          }
          break;
        case 'UPDATE':
          await loanApi.update(item.entityId, item.data as any);
          break;
        case 'DELETE':
          await loanApi.delete(item.entityId);
          break;
        case 'RECORD_PAYMENT':
          const paymentData = item.data as any;
          await loanApi.recordPayment(paymentData.loanId, {
            amount: paymentData.amount,
            paidDate: paymentData.paidDate,
            emiNumber: paymentData.emiNumber,
            notes: paymentData.notes,
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

export const loanService = {
  createLoan,
  getLoanWithDetails,
  getLoanSummary,
  recordEMIPayment,
  processLoanPrepayment,
  closeLoan,
  syncPendingChanges,
};

export default loanService;
