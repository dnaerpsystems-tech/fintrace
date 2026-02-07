/**
 * Validators for all entities
 * Returns typed validation results
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ==================== TRANSACTION VALIDATOR ====================

export interface TransactionInput {
  amount?: number;
  categoryId?: string;
  accountId?: string;
  date?: Date;
  description?: string;
  type?: 'income' | 'expense' | 'transfer';
  toAccountId?: string;
}

export function validateTransaction(data: TransactionInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Amount validation
  if (data.amount === undefined || data.amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required', code: 'REQUIRED' });
  } else if (data.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be greater than 0', code: 'MIN_VALUE' });
  } else if (data.amount > 100000000000) { // 100 crore max
    errors.push({ field: 'amount', message: 'Amount exceeds maximum limit', code: 'MAX_VALUE' });
  }

  // Category validation (not required for transfers)
  if (data.type !== 'transfer' && !data.categoryId) {
    errors.push({ field: 'categoryId', message: 'Category is required', code: 'REQUIRED' });
  }

  // Account validation
  if (!data.accountId) {
    errors.push({ field: 'accountId', message: 'Account is required', code: 'REQUIRED' });
  }

  // Transfer validation
  if (data.type === 'transfer' && !data.toAccountId) {
    errors.push({ field: 'toAccountId', message: 'Destination account is required for transfers', code: 'REQUIRED' });
  }

  if (data.type === 'transfer' && data.accountId === data.toAccountId) {
    errors.push({ field: 'toAccountId', message: 'Cannot transfer to the same account', code: 'SAME_ACCOUNT' });
  }

  // Date validation
  if (!data.date) {
    errors.push({ field: 'date', message: 'Date is required', code: 'REQUIRED' });
  } else {
    const date = new Date(data.date);
    if (Number.isNaN(date.getTime())) {
      errors.push({ field: 'date', message: 'Invalid date', code: 'INVALID_DATE' });
    }
  }

  // Description validation
  if (data.description && data.description.length > 200) {
    errors.push({ field: 'description', message: 'Description must be 200 characters or less', code: 'MAX_LENGTH' });
  }

  return { isValid: errors.length === 0, errors };
}

// ==================== ACCOUNT VALIDATOR ====================

export interface AccountInput {
  name?: string;
  type?: 'bank' | 'cash' | 'credit_card' | 'wallet' | 'investment';
  balance?: number;
  color?: string;
}

export function validateAccount(data: AccountInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Account name is required', code: 'REQUIRED' });
  } else if (data.name.length > 50) {
    errors.push({ field: 'name', message: 'Name must be 50 characters or less', code: 'MAX_LENGTH' });
  }

  // Type validation
  const validTypes = ['bank', 'cash', 'credit_card', 'wallet', 'investment'];
  if (!data.type) {
    errors.push({ field: 'type', message: 'Account type is required', code: 'REQUIRED' });
  } else if (!validTypes.includes(data.type)) {
    errors.push({ field: 'type', message: 'Invalid account type', code: 'INVALID_TYPE' });
  }

  return { isValid: errors.length === 0, errors };
}

// ==================== LOAN VALIDATOR ====================

export interface LoanInput {
  name?: string;
  type?: string;
  principal?: number;
  annualRate?: number;
  tenureMonths?: number;
  startDate?: Date;
  emiDay?: number;
}

export function validateLoan(data: LoanInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Loan name is required', code: 'REQUIRED' });
  } else if (data.name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be 100 characters or less', code: 'MAX_LENGTH' });
  }

  // Principal validation
  if (data.principal === undefined || data.principal === null) {
    errors.push({ field: 'principal', message: 'Principal amount is required', code: 'REQUIRED' });
  } else if (data.principal <= 0) {
    errors.push({ field: 'principal', message: 'Principal must be greater than 0', code: 'MIN_VALUE' });
  } else if (data.principal > 1000000000000) { // 100 crore max
    errors.push({ field: 'principal', message: 'Principal exceeds maximum limit', code: 'MAX_VALUE' });
  }

  // Interest rate validation
  if (data.annualRate === undefined || data.annualRate === null) {
    errors.push({ field: 'annualRate', message: 'Interest rate is required', code: 'REQUIRED' });
  } else if (data.annualRate < 0) {
    errors.push({ field: 'annualRate', message: 'Interest rate cannot be negative', code: 'MIN_VALUE' });
  } else if (data.annualRate > 50) {
    errors.push({ field: 'annualRate', message: 'Interest rate cannot exceed 50%', code: 'MAX_VALUE' });
  }

  // Tenure validation
  if (data.tenureMonths === undefined || data.tenureMonths === null) {
    errors.push({ field: 'tenureMonths', message: 'Tenure is required', code: 'REQUIRED' });
  } else if (data.tenureMonths < 1) {
    errors.push({ field: 'tenureMonths', message: 'Tenure must be at least 1 month', code: 'MIN_VALUE' });
  } else if (data.tenureMonths > 360) {
    errors.push({ field: 'tenureMonths', message: 'Tenure cannot exceed 30 years (360 months)', code: 'MAX_VALUE' });
  }

  // EMI day validation
  if (data.emiDay !== undefined) {
    if (data.emiDay < 1 || data.emiDay > 28) {
      errors.push({ field: 'emiDay', message: 'EMI day must be between 1 and 28', code: 'INVALID_RANGE' });
    }
  }

  // Start date validation
  if (!data.startDate) {
    errors.push({ field: 'startDate', message: 'Start date is required', code: 'REQUIRED' });
  }

  return { isValid: errors.length === 0, errors };
}

// ==================== BUDGET VALIDATOR ====================

export interface BudgetInput {
  categoryId?: string;
  amount?: number;
  period?: 'weekly' | 'monthly' | 'yearly';
  alertThreshold?: number;
}

export function validateBudget(data: BudgetInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Category validation
  if (!data.categoryId) {
    errors.push({ field: 'categoryId', message: 'Category is required', code: 'REQUIRED' });
  }

  // Amount validation
  if (data.amount === undefined || data.amount === null) {
    errors.push({ field: 'amount', message: 'Budget amount is required', code: 'REQUIRED' });
  } else if (data.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be greater than 0', code: 'MIN_VALUE' });
  }

  // Period validation
  const validPeriods = ['weekly', 'monthly', 'yearly'];
  if (!data.period) {
    errors.push({ field: 'period', message: 'Period is required', code: 'REQUIRED' });
  } else if (!validPeriods.includes(data.period)) {
    errors.push({ field: 'period', message: 'Invalid period', code: 'INVALID_TYPE' });
  }

  // Alert threshold validation
  if (data.alertThreshold !== undefined) {
    if (data.alertThreshold < 0 || data.alertThreshold > 100) {
      errors.push({ field: 'alertThreshold', message: 'Alert threshold must be between 0 and 100', code: 'INVALID_RANGE' });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ==================== GOAL VALIDATOR ====================

export interface GoalInput {
  name?: string;
  targetAmount?: number;
  targetDate?: Date;
  priority?: 'high' | 'medium' | 'low';
}

export function validateGoal(data: GoalInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Goal name is required', code: 'REQUIRED' });
  } else if (data.name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be 100 characters or less', code: 'MAX_LENGTH' });
  }

  // Target amount validation
  if (data.targetAmount === undefined || data.targetAmount === null) {
    errors.push({ field: 'targetAmount', message: 'Target amount is required', code: 'REQUIRED' });
  } else if (data.targetAmount <= 0) {
    errors.push({ field: 'targetAmount', message: 'Target must be greater than 0', code: 'MIN_VALUE' });
  }

  // Target date validation
  if (!data.targetDate) {
    errors.push({ field: 'targetDate', message: 'Target date is required', code: 'REQUIRED' });
  } else {
    const date = new Date(data.targetDate);
    if (Number.isNaN(date.getTime())) {
      errors.push({ field: 'targetDate', message: 'Invalid date', code: 'INVALID_DATE' });
    } else if (date <= new Date()) {
      errors.push({ field: 'targetDate', message: 'Target date must be in the future', code: 'FUTURE_DATE' });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ==================== PIN VALIDATOR ====================

export function validatePIN(pin: string, confirmPin?: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!pin) {
    errors.push({ field: 'pin', message: 'PIN is required', code: 'REQUIRED' });
  } else if (!/^\d{4}$|^\d{6}$/.test(pin)) {
    errors.push({ field: 'pin', message: 'PIN must be 4 or 6 digits', code: 'INVALID_FORMAT' });
  }

  if (confirmPin !== undefined && pin !== confirmPin) {
    errors.push({ field: 'confirmPin', message: 'PINs do not match', code: 'MISMATCH' });
  }

  // Check for common weak PINs
  const weakPins = ['0000', '1111', '1234', '4321', '0123', '9999', '000000', '111111', '123456'];
  if (weakPins.includes(pin)) {
    errors.push({ field: 'pin', message: 'PIN is too weak. Choose a stronger PIN.', code: 'WEAK_PIN' });
  }

  return { isValid: errors.length === 0, errors };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get first error message for a field
 */
export function getFieldError(result: ValidationResult, field: string): string | undefined {
  return result.errors.find((e) => e.field === field)?.message;
}

/**
 * Check if a specific field has errors
 */
export function hasFieldError(result: ValidationResult, field: string): boolean {
  return result.errors.some((e) => e.field === field);
}

/**
 * Get all error messages as a single string
 */
export function getErrorSummary(result: ValidationResult): string {
  return result.errors.map((e) => e.message).join('. ');
}
