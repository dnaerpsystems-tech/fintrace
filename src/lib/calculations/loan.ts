/**
 * Loan & EMI Calculations
 * All amounts in paise for precision
 */

import { addMonths, differenceInMonths } from 'date-fns';

export interface LoanInput {
  principal: number; // in paise
  annualRate: number; // percentage (e.g., 8.5 for 8.5%)
  tenureMonths: number;
  startDate: Date;
  emiDay: number; // 1-28
}

export interface EMIResult {
  emi: number; // in paise
  totalInterest: number; // in paise
  totalPayment: number; // in paise
  effectiveRate: number; // percentage
}

export interface AmortizationEntry {
  month: number;
  date: Date;
  openingBalance: number;
  emi: number;
  principalComponent: number;
  interestComponent: number;
  closingBalance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

export interface PrepaymentImpact {
  originalTenure: number;
  newTenure: number;
  tenureReduction: number;
  originalTotalInterest: number;
  newTotalInterest: number;
  interestSaved: number;
  newEMI?: number; // if reducing EMI instead of tenure
}

export interface LoanProgress {
  totalPaid: number;
  principalPaid: number;
  interestPaid: number;
  outstandingPrincipal: number;
  percentageComplete: number;
  emisPaid: number;
  emisRemaining: number;
  nextEMIDate: Date;
}

/**
 * Calculate EMI using the standard formula
 * EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
 * where:
 * P = Principal
 * r = Monthly interest rate (annual rate / 12 / 100)
 * n = Number of months
 */
export function calculateEMI(
  principalPaise: number,
  annualRate: number,
  tenureMonths: number
): EMIResult {
  // Convert to rupees for calculation, then back to paise
  const principal = principalPaise / 100;

  // Handle edge cases
  if (principal <= 0 || tenureMonths <= 0) {
    return { emi: 0, totalInterest: 0, totalPayment: 0, effectiveRate: 0 };
  }

  // Handle zero interest rate
  if (annualRate <= 0) {
    const emi = Math.round((principal / tenureMonths) * 100);
    return { emi, totalInterest: 0, totalPayment: principalPaise, effectiveRate: 0 };
  }

  const monthlyRate = annualRate / 12 / 100;
  const n = tenureMonths;

  // EMI formula
  const numerator = principal * monthlyRate * (1 + monthlyRate) ** n;
  const denominator = (1 + monthlyRate) ** n - 1;
  const emiRupees = numerator / denominator;

  const emi = Math.round(emiRupees * 100); // Convert to paise
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principalPaise;

  // Calculate effective annual rate
  const effectiveRate = annualRate; // For standard loans, effective = nominal

  return { emi, totalInterest, totalPayment, effectiveRate };
}

/**
 * Generate complete amortization schedule
 */
export function generateAmortizationSchedule(loan: LoanInput): AmortizationEntry[] {
  const { principal, annualRate, tenureMonths, startDate, emiDay } = loan;
  const { emi } = calculateEMI(principal, annualRate, tenureMonths);

  if (emi === 0) return [];

  const monthlyRate = annualRate / 12 / 100;
  const schedule: AmortizationEntry[] = [];

  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;

  for (let month = 1; month <= tenureMonths; month++) {
    const emiDate = getEMIDateForMonth(startDate, emiDay, month);
    const interestComponent = Math.round(balance * monthlyRate);
    let principalComponent = emi - interestComponent;

    // Last month adjustment to ensure balance becomes zero
    if (month === tenureMonths) {
      principalComponent = balance;
    }

    const closingBalance = Math.max(0, balance - principalComponent);
    cumulativePrincipal += principalComponent;
    cumulativeInterest += interestComponent;

    schedule.push({
      month,
      date: emiDate,
      openingBalance: balance,
      emi: month === tenureMonths ? principalComponent + interestComponent : emi,
      principalComponent,
      interestComponent,
      closingBalance,
      cumulativePrincipal,
      cumulativeInterest,
    });

    balance = closingBalance;
  }

  return schedule;
}

/**
 * Get EMI date for a specific month
 */
function getEMIDateForMonth(startDate: Date, emiDay: number, monthNumber: number): Date {
  const targetMonth = addMonths(startDate, monthNumber);
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();

  // Handle months with fewer days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(emiDay, daysInMonth);

  return new Date(year, month, day);
}

/**
 * Calculate impact of prepayment
 */
export function calculatePrepaymentImpact(
  loan: LoanInput,
  prepaymentAmount: number,
  reduceEMI = false,
  currentMonth = 0
): PrepaymentImpact {
  const original = calculateEMI(loan.principal, loan.annualRate, loan.tenureMonths);

  // Calculate outstanding balance after currentMonth EMIs
  const schedule = generateAmortizationSchedule(loan);
  const currentEntry = schedule[currentMonth] || schedule[0];
  const outstandingBalance = currentEntry?.openingBalance || loan.principal;

  // New principal after prepayment
  const newPrincipal = Math.max(0, outstandingBalance - prepaymentAmount);
  const remainingMonths = loan.tenureMonths - currentMonth;

  if (reduceEMI) {
    // Keep tenure, reduce EMI
    const newResult = calculateEMI(newPrincipal, loan.annualRate, remainingMonths);

    return {
      originalTenure: loan.tenureMonths,
      newTenure: loan.tenureMonths,
      tenureReduction: 0,
      originalTotalInterest: original.totalInterest,
      newTotalInterest: newResult.totalInterest,
      interestSaved: original.totalInterest - newResult.totalInterest,
      newEMI: newResult.emi,
    };
  }
    // Keep EMI, reduce tenure
    const newTenure = calculateNewTenure(newPrincipal, loan.annualRate, original.emi);
    const newResult = calculateEMI(newPrincipal, loan.annualRate, newTenure);

    return {
      originalTenure: loan.tenureMonths,
      newTenure: currentMonth + newTenure,
      tenureReduction: remainingMonths - newTenure,
      originalTotalInterest: original.totalInterest,
      newTotalInterest: newResult.totalInterest,
      interestSaved: original.totalInterest - newResult.totalInterest,
    };
}

/**
 * Calculate new tenure given principal and EMI
 */
function calculateNewTenure(principalPaise: number, annualRate: number, emiPaise: number): number {
  const principal = principalPaise / 100;
  const emi = emiPaise / 100;
  const monthlyRate = annualRate / 12 / 100;

  if (monthlyRate <= 0) {
    return Math.ceil(principal / emi);
  }

  // n = log(EMI / (EMI - P × r)) / log(1 + r)
  const numerator = Math.log(emi / (emi - principal * monthlyRate));
  const denominator = Math.log(1 + monthlyRate);

  return Math.ceil(numerator / denominator);
}

/**
 * Calculate loan progress based on payments made
 */
export function calculateLoanProgress(
  loan: LoanInput,
  paymentsMade: number
): LoanProgress {
  const schedule = generateAmortizationSchedule(loan);
  const { emi } = calculateEMI(loan.principal, loan.annualRate, loan.tenureMonths);

  const emisPaid = Math.min(paymentsMade, loan.tenureMonths);
  const emisRemaining = loan.tenureMonths - emisPaid;

  let principalPaid = 0;
  let interestPaid = 0;

  for (let i = 0; i < emisPaid && i < schedule.length; i++) {
    principalPaid += schedule[i].principalComponent;
    interestPaid += schedule[i].interestComponent;
  }

  const totalPaid = principalPaid + interestPaid;
  const outstandingPrincipal = loan.principal - principalPaid;
  const percentageComplete = (principalPaid / loan.principal) * 100;

  // Next EMI date
  const nextEMIDate = getEMIDateForMonth(loan.startDate, loan.emiDay, emisPaid + 1);

  return {
    totalPaid,
    principalPaid,
    interestPaid,
    outstandingPrincipal,
    percentageComplete,
    emisPaid,
    emisRemaining,
    nextEMIDate,
  };
}

/**
 * Compare two loans
 */
export function compareLoan(
  loan1: { principal: number; rate: number; tenure: number },
  loan2: { principal: number; rate: number; tenure: number }
): {
  loan1Result: EMIResult;
  loan2Result: EMIResult;
  emiDifference: number;
  interestDifference: number;
  recommendation: string;
} {
  const loan1Result = calculateEMI(loan1.principal, loan1.rate, loan1.tenure);
  const loan2Result = calculateEMI(loan2.principal, loan2.rate, loan2.tenure);

  const emiDifference = loan1Result.emi - loan2Result.emi;
  const interestDifference = loan1Result.totalInterest - loan2Result.totalInterest;

  let recommendation = '';
  if (interestDifference > 0) {
    recommendation = 'Loan 2 saves more on interest';
  } else if (interestDifference < 0) {
    recommendation = 'Loan 1 saves more on interest';
  } else {
    recommendation = 'Both loans have same total cost';
  }

  return {
    loan1Result,
    loan2Result,
    emiDifference,
    interestDifference,
    recommendation,
  };
}

/**
 * Get loan type configuration
 */
export const LOAN_TYPES = {
  home: { label: 'Home Loan', icon: 'Home', defaultRate: 8.5, maxTenure: 360 },
  car: { label: 'Car Loan', icon: 'Car', defaultRate: 9.5, maxTenure: 84 },
  personal: { label: 'Personal Loan', icon: 'User', defaultRate: 12.0, maxTenure: 60 },
  education: { label: 'Education Loan', icon: 'GraduationCap', defaultRate: 10.0, maxTenure: 180 },
  gold: { label: 'Gold Loan', icon: 'Gem', defaultRate: 11.0, maxTenure: 36 },
  business: { label: 'Business Loan', icon: 'Briefcase', defaultRate: 14.0, maxTenure: 60 },
  credit_card: { label: 'Credit Card', icon: 'CreditCard', defaultRate: 36.0, maxTenure: 60 },
  other: { label: 'Other Loan', icon: 'FileText', defaultRate: 12.0, maxTenure: 120 },
} as const;

export type LoanType = keyof typeof LOAN_TYPES;
