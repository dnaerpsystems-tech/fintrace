/**
 * Credit Score Estimation Service
 * Estimates credit score based on financial behavior patterns
 * Note: This is an estimation tool, not an official credit bureau score
 */

// ============================================
// Types
// ============================================

export interface CreditFactors {
  paymentHistory: {
    score: number;
    weight: number;
    details: string[];
  };
  creditUtilization: {
    score: number;
    weight: number;
    details: string[];
  };
  creditAge: {
    score: number;
    weight: number;
    details: string[];
  };
  creditMix: {
    score: number;
    weight: number;
    details: string[];
  };
  recentInquiries: {
    score: number;
    weight: number;
    details: string[];
  };
}

export interface CreditScoreResult {
  score: number;
  rating: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Poor';
  ratingColor: string;
  factors: CreditFactors;
  recommendations: string[];
  lastUpdated: string;
}

export interface FinancialData {
  accounts: {
    type: string;
    balance: number;
    creditLimit?: number;
    openDate?: string;
  }[];
  loans: {
    type: string;
    principal: number;
    emiAmount: number;
    missedPayments: number;
    startDate: string;
  }[];
  creditCards: {
    limit: number;
    currentBalance: number;
    missedPayments: number;
    openDate: string;
  }[];
  recentHardInquiries: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

// ============================================
// Score Calculation
// ============================================

export function calculateCreditScore(data: FinancialData): CreditScoreResult {
  const factors: CreditFactors = {
    paymentHistory: calculatePaymentHistory(data),
    creditUtilization: calculateCreditUtilization(data),
    creditAge: calculateCreditAge(data),
    creditMix: calculateCreditMix(data),
    recentInquiries: calculateRecentInquiries(data),
  };

  // Calculate weighted score
  const weightedScore =
    (factors.paymentHistory.score * factors.paymentHistory.weight) +
    (factors.creditUtilization.score * factors.creditUtilization.weight) +
    (factors.creditAge.score * factors.creditAge.weight) +
    (factors.creditMix.score * factors.creditMix.weight) +
    (factors.recentInquiries.score * factors.recentInquiries.weight);

  // Convert to 300-900 scale (Indian credit score range)
  const score = Math.round(300 + (weightedScore / 100) * 600);
  const clampedScore = Math.max(300, Math.min(900, score));

  const rating = getScoreRating(clampedScore);
  const recommendations = generateRecommendations(factors, data);

  return {
    score: clampedScore,
    rating: rating.label,
    ratingColor: rating.color,
    factors,
    recommendations,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================
// Factor Calculations
// ============================================

function calculatePaymentHistory(data: FinancialData): CreditFactors['paymentHistory'] {
  const details: string[] = [];
  let score = 100;

  // Check loan payment history
  const totalMissedPayments = data.loans.reduce((sum, loan) => sum + loan.missedPayments, 0);
  const totalCCMissedPayments = data.creditCards.reduce((sum, cc) => sum + cc.missedPayments, 0);

  if (totalMissedPayments === 0 && totalCCMissedPayments === 0) {
    details.push('No missed payments - Excellent!');
  } else if (totalMissedPayments <= 2 && totalCCMissedPayments <= 2) {
    score -= 15;
    details.push('Few missed payments detected');
  } else if (totalMissedPayments <= 5 || totalCCMissedPayments <= 5) {
    score -= 30;
    details.push('Multiple missed payments affecting score');
  } else {
    score -= 50;
    details.push('Significant payment defaults detected');
  }

  // Check if has active loans with good standing
  const activeLoans = data.loans.filter(l => l.missedPayments === 0);
  if (activeLoans.length > 0) {
    details.push(`${activeLoans.length} loan(s) in good standing`);
  }

  return {
    score: Math.max(0, score),
    weight: 0.35, // 35% of total score
    details,
  };
}

function calculateCreditUtilization(data: FinancialData): CreditFactors['creditUtilization'] {
  const details: string[] = [];
  let score = 100;

  if (data.creditCards.length === 0) {
    details.push('No credit cards - Consider getting one to build credit');
    return { score: 60, weight: 0.30, details };
  }

  const totalLimit = data.creditCards.reduce((sum, cc) => sum + cc.limit, 0);
  const totalBalance = data.creditCards.reduce((sum, cc) => sum + cc.currentBalance, 0);
  const utilizationRate = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  if (utilizationRate <= 10) {
    details.push(`Very low utilization (${utilizationRate.toFixed(1)}%) - Excellent`);
  } else if (utilizationRate <= 30) {
    score -= 10;
    details.push(`Healthy utilization (${utilizationRate.toFixed(1)}%) - Good`);
  } else if (utilizationRate <= 50) {
    score -= 25;
    details.push(`Moderate utilization (${utilizationRate.toFixed(1)}%) - Fair`);
  } else if (utilizationRate <= 75) {
    score -= 40;
    details.push(`High utilization (${utilizationRate.toFixed(1)}%) - Reduce spending`);
  } else {
    score -= 60;
    details.push(`Very high utilization (${utilizationRate.toFixed(1)}%) - Critical`);
  }

  return {
    score: Math.max(0, score),
    weight: 0.30, // 30% of total score
    details,
  };
}

function calculateCreditAge(data: FinancialData): CreditFactors['creditAge'] {
  const details: string[] = [];
  let score = 100;

  // Get oldest credit account
  const allDates: Date[] = [];

  data.creditCards.forEach(cc => {
    if (cc.openDate) allDates.push(new Date(cc.openDate));
  });
  data.loans.forEach(loan => {
    if (loan.startDate) allDates.push(new Date(loan.startDate));
  });

  if (allDates.length === 0) {
    details.push('No credit history found');
    return { score: 40, weight: 0.15, details };
  }

  const oldestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const creditAgeMonths = Math.floor((Date.now() - oldestDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
  const creditAgeYears = Math.floor(creditAgeMonths / 12);

  if (creditAgeYears >= 7) {
    details.push(`${creditAgeYears}+ years of credit history - Excellent`);
  } else if (creditAgeYears >= 5) {
    score -= 10;
    details.push(`${creditAgeYears} years of credit history - Very Good`);
  } else if (creditAgeYears >= 3) {
    score -= 25;
    details.push(`${creditAgeYears} years of credit history - Good`);
  } else if (creditAgeYears >= 1) {
    score -= 40;
    details.push(`${creditAgeYears} year(s) of credit history - Building`);
  } else {
    score -= 60;
    details.push(`${creditAgeMonths} months of credit history - New`);
  }

  return {
    score: Math.max(0, score),
    weight: 0.15, // 15% of total score
    details,
  };
}

function calculateCreditMix(data: FinancialData): CreditFactors['creditMix'] {
  const details: string[] = [];
  let score = 100;

  const hasCreditCard = data.creditCards.length > 0;
  const hasHomeLoan = data.loans.some(l => l.type.toLowerCase().includes('home'));
  const hasAutoLoan = data.loans.some(l => l.type.toLowerCase().includes('vehicle') || l.type.toLowerCase().includes('car'));
  const hasPersonalLoan = data.loans.some(l => l.type.toLowerCase().includes('personal'));
  const hasEducationLoan = data.loans.some(l => l.type.toLowerCase().includes('education'));

  const creditTypes = [hasCreditCard, hasHomeLoan, hasAutoLoan, hasPersonalLoan, hasEducationLoan];
  const diversityCount = creditTypes.filter(Boolean).length;

  if (diversityCount >= 4) {
    details.push('Excellent credit mix diversity');
  } else if (diversityCount >= 3) {
    score -= 10;
    details.push('Good credit mix');
  } else if (diversityCount >= 2) {
    score -= 25;
    details.push('Moderate credit mix');
  } else if (diversityCount >= 1) {
    score -= 40;
    details.push('Limited credit types');
  } else {
    score -= 70;
    details.push('No credit accounts');
  }

  // Add specific details
  if (hasCreditCard) details.push('Has credit card(s)');
  if (hasHomeLoan) details.push('Has home loan (secured credit)');
  if (data.loans.length > 0) details.push(`${data.loans.length} active loan(s)`);

  return {
    score: Math.max(0, score),
    weight: 0.10, // 10% of total score
    details,
  };
}

function calculateRecentInquiries(data: FinancialData): CreditFactors['recentInquiries'] {
  const details: string[] = [];
  let score = 100;

  const inquiries = data.recentHardInquiries;

  if (inquiries === 0) {
    details.push('No recent credit inquiries - Excellent');
  } else if (inquiries <= 2) {
    score -= 10;
    details.push(`${inquiries} recent inquiry/inquiries - Minimal impact`);
  } else if (inquiries <= 4) {
    score -= 25;
    details.push(`${inquiries} recent inquiries - Moderate impact`);
  } else if (inquiries <= 6) {
    score -= 40;
    details.push(`${inquiries} recent inquiries - Noticeable impact`);
  } else {
    score -= 60;
    details.push(`${inquiries}+ recent inquiries - Significant impact`);
  }

  return {
    score: Math.max(0, score),
    weight: 0.10, // 10% of total score
    details,
  };
}

// ============================================
// Helpers
// ============================================

function getScoreRating(score: number): { label: CreditScoreResult['rating']; color: string } {
  if (score >= 800) return { label: 'Excellent', color: '#10b981' };
  if (score >= 750) return { label: 'Very Good', color: '#22c55e' };
  if (score >= 700) return { label: 'Good', color: '#84cc16' };
  if (score >= 650) return { label: 'Fair', color: '#eab308' };
  return { label: 'Poor', color: '#ef4444' };
}

function generateRecommendations(factors: CreditFactors, data: FinancialData): string[] {
  const recommendations: string[] = [];

  // Payment history recommendations
  if (factors.paymentHistory.score < 80) {
    recommendations.push('Set up autopay for all bills and EMIs to avoid missed payments');
    recommendations.push('Create payment reminders 5 days before due dates');
  }

  // Credit utilization recommendations
  if (factors.creditUtilization.score < 70) {
    recommendations.push('Try to keep credit card utilization below 30%');
    recommendations.push('Request a credit limit increase to improve utilization ratio');
    recommendations.push('Pay credit card bills before the statement date');
  }

  // Credit age recommendations
  if (factors.creditAge.score < 60) {
    recommendations.push('Keep your oldest credit accounts active');
    recommendations.push('Avoid closing old credit cards even if unused');
  }

  // Credit mix recommendations
  if (factors.creditMix.score < 70) {
    if (data.creditCards.length === 0) {
      recommendations.push('Consider getting a secured credit card to build credit history');
    }
    recommendations.push('A diverse mix of credit types can improve your score');
  }

  // Recent inquiries recommendations
  if (factors.recentInquiries.score < 70) {
    recommendations.push('Limit new credit applications for the next 6 months');
    recommendations.push('Rate-shop for loans within a 14-day window to minimize impact');
  }

  // General recommendations
  if (recommendations.length < 3) {
    recommendations.push('Maintain current good habits to preserve your credit score');
    recommendations.push('Check your credit report annually for errors');
  }

  return recommendations.slice(0, 5);
}

// ============================================
// Mock Data Generator (for demo)
// ============================================

export function generateMockFinancialData(): FinancialData {
  return {
    accounts: [
      { type: 'Savings', balance: 150000 },
      { type: 'Current', balance: 50000 },
    ],
    loans: [
      {
        type: 'Home Loan',
        principal: 5000000,
        emiAmount: 45000,
        missedPayments: 0,
        startDate: '2021-05-15',
      },
      {
        type: 'Personal Loan',
        principal: 200000,
        emiAmount: 8500,
        missedPayments: 1,
        startDate: '2024-01-10',
      },
    ],
    creditCards: [
      {
        limit: 300000,
        currentBalance: 45000,
        missedPayments: 0,
        openDate: '2019-08-20',
      },
      {
        limit: 150000,
        currentBalance: 25000,
        missedPayments: 0,
        openDate: '2022-03-15',
      },
    ],
    recentHardInquiries: 2,
    monthlyIncome: 150000,
    monthlyExpenses: 80000,
  };
}

export const creditScoreService = {
  calculate: calculateCreditScore,
  generateMockData: generateMockFinancialData,
};
