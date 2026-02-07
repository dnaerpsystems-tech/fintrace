/**
 * Loan API
 * API wrapper for loan-related endpoints
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface Loan {
  id: string;
  name: string;
  type: 'HOME' | 'CAR' | 'PERSONAL' | 'EDUCATION' | 'BUSINESS' | 'GOLD' | 'OTHER';
  principalAmount: number;
  interestRate: number;
  tenure: number; // in months
  emiAmount: number;
  startDate: string;
  endDate: string;
  lender: string | null;
  accountNumber: string | null;
  linkedAccountId: string | null;
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
  totalPaid: number;
  remainingAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EMISchedule {
  month: number;
  date: string;
  emiAmount: number;
  principal: number;
  interest: number;
  balance: number;
  isPaid: boolean;
  paidDate: string | null;
  isOverdue: boolean;
}

export interface EMIPayment {
  id: string;
  loanId: string;
  amount: number;
  principal: number;
  interest: number;
  paidDate: string;
  emiNumber: number;
  notes: string | null;
  createdAt: string;
}

export interface CreateLoanDto {
  name: string;
  type: Loan['type'];
  principalAmount: number;
  interestRate: number;
  tenure: number;
  startDate: string;
  lender?: string;
  accountNumber?: string;
  linkedAccountId?: string;
}

export interface UpdateLoanDto extends Partial<CreateLoanDto> {
  status?: Loan['status'];
}

export interface RecordPaymentDto {
  amount: number;
  paidDate: string;
  emiNumber: number;
  notes?: string;
}

export interface PrepaymentAnalysis {
  originalTenure: number;
  originalTotalInterest: number;
  originalTotalPayment: number;
  newTenure: number;
  newTotalInterest: number;
  newTotalPayment: number;
  interestSaved: number;
  monthsReduced: number;
  newEmi?: number;
}

// =============================================================================
// API Functions
// =============================================================================

export const loanApi = {
  /**
   * Get all loans
   */
  async getAll(): Promise<Loan[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch loans.');
    }
    return api.get<Loan[]>('/loans');
  },

  /**
   * Get loan by ID
   */
  async getById(id: string): Promise<Loan> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch loan.');
    }
    return api.get<Loan>(`/loans/${id}`);
  },

  /**
   * Create a new loan
   */
  async create(data: CreateLoanDto): Promise<Loan> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot create loan.');
    }
    return api.post<Loan>('/loans', data);
  },

  /**
   * Update a loan
   */
  async update(id: string, data: UpdateLoanDto): Promise<Loan> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update loan.');
    }
    return api.put<Loan>(`/loans/${id}`, data);
  },

  /**
   * Delete a loan
   */
  async delete(id: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete loan.');
    }
    return api.delete(`/loans/${id}`);
  },

  /**
   * Get EMI schedule for a loan
   */
  async getSchedule(id: string): Promise<EMISchedule[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch schedule.');
    }
    return api.get<EMISchedule[]>(`/loans/${id}/schedule`);
  },

  /**
   * Record an EMI payment
   */
  async recordPayment(loanId: string, data: RecordPaymentDto): Promise<EMIPayment> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot record payment.');
    }
    return api.post<EMIPayment>(`/loans/${loanId}/payments`, data);
  },

  /**
   * Get payment history for a loan
   */
  async getPayments(loanId: string): Promise<EMIPayment[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch payments.');
    }
    return api.get<EMIPayment[]>(`/loans/${loanId}/payments`);
  },

  /**
   * Calculate prepayment impact
   */
  async calculatePrepayment(
    loanId: string,
    prepaymentAmount: number,
    reduceEmi: boolean
  ): Promise<PrepaymentAnalysis> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot calculate prepayment.');
    }
    return api.post<PrepaymentAnalysis>(`/loans/${loanId}/prepayment`, {
      prepaymentAmount,
      reduceEmi,
    });
  },
};

export default loanApi;
