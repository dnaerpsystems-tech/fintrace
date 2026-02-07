/**
 * Indian Currency Formatting Utilities
 * All amounts are stored in paise (1/100 of rupee) for precision
 */

export interface FormatOptions {
  showSymbol?: boolean;
  showSign?: boolean;
  compact?: boolean;
  decimals?: number;
}

const defaultOptions: FormatOptions = {
  showSymbol: true,
  showSign: false,
  compact: false,
  decimals: 2,
};

/**
 * Format Indian number with lakhs and crores
 * 1,00,000 = 1 lakh
 * 1,00,00,000 = 1 crore
 */
export function formatIndianNumber(num: number): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  if (absNum < 1000) {
    return (isNegative ? '-' : '') + absNum.toString();
  }

  const numStr = Math.floor(absNum).toString();
  const lastThree = numStr.slice(-3);
  const rest = numStr.slice(0, -3);

  let formatted = lastThree;
  if (rest.length > 0) {
    // Add commas every 2 digits for Indian numbering
    const pairs: string[] = [];
    let remaining = rest;
    while (remaining.length > 0) {
      if (remaining.length <= 2) {
        pairs.unshift(remaining);
        break;
      }
      pairs.unshift(remaining.slice(-2));
      remaining = remaining.slice(0, -2);
    }
    formatted = `${pairs.join(',')},${formatted}`;
  }

  return (isNegative ? '-' : '') + formatted;
}

/**
 * Format amount in paise to Indian rupee display
 */
export function formatINR(amountInPaise: number, options?: FormatOptions): string {
  const opts = { ...defaultOptions, ...options };

  if (amountInPaise === null || amountInPaise === undefined || Number.isNaN(amountInPaise)) {
    return opts.showSymbol ? '₹0' : '0';
  }

  const amountInRupees = amountInPaise / 100;
  const isNegative = amountInRupees < 0;
  const absAmount = Math.abs(amountInRupees);

  let formatted: string;

  if (opts.compact) {
    formatted = formatCompact(absAmount);
  } else {
    const intPart = Math.floor(absAmount);
    const decPart = Math.round((absAmount - intPart) * 100);

    if (opts.decimals === 0) {
      formatted = formatIndianNumber(Math.round(absAmount));
    } else {
      formatted = `${formatIndianNumber(intPart)}.${decPart.toString().padStart(2, '0')}`;
    }
  }

  let result = '';

  if (opts.showSign && !isNegative && amountInPaise > 0) {
    result += '+';
  }

  if (isNegative) {
    result += '-';
  }

  if (opts.showSymbol) {
    result += '₹';
  }

  result += formatted;

  return result;
}

/**
 * Format large numbers compactly (1.5L, 2.3Cr)
 */
function formatCompact(amount: number): string {
  if (amount >= 10000000) {
    // Crores (1Cr = 10,000,000)
    const crores = amount / 10000000;
    return `${crores.toFixed(crores >= 10 ? 1 : 2).replace(/\.?0+$/, '')}Cr`;
  }if (amount >= 100000) {
    // Lakhs (1L = 100,000)
    const lakhs = amount / 100000;
    return `${lakhs.toFixed(lakhs >= 10 ? 1 : 2).replace(/\.?0+$/, '')}L`;
  }if (amount >= 1000) {
    // Thousands
    const thousands = amount / 1000;
    return `${thousands.toFixed(thousands >= 10 ? 1 : 2).replace(/\.?0+$/, '')}K`;
  }
  return amount.toFixed(0);
}

/**
 * Parse user input string to paise
 */
export function parseAmount(input: string): number {
  if (!input) return 0;

  // Remove currency symbol, commas, spaces
  const cleaned = input.replace(/[₹,\s]/g, '').trim();

  // Handle compact formats
  const compactMatch = cleaned.match(/^([\d.]+)(Cr|L|K)?$/i);
  if (compactMatch) {
    let value = Number.parseFloat(compactMatch[1]);
    const suffix = (compactMatch[2] || '').toLowerCase();

    switch (suffix) {
      case 'cr':
        value *= 10000000;
        break;
      case 'l':
        value *= 100000;
        break;
      case 'k':
        value *= 1000;
        break;
    }

    return Math.round(value * 100); // Convert to paise
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

/**
 * Format amount for input display (no symbol, with decimals)
 */
export function formatForInput(amountInPaise: number): string {
  if (!amountInPaise) return '';
  return (amountInPaise / 100).toFixed(2);
}

/**
 * Get sign prefix for transaction type
 */
export function getAmountSign(type: 'income' | 'expense' | 'transfer'): string {
  switch (type) {
    case 'income':
      return '+';
    case 'expense':
      return '-';
    default:
      return '';
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format interest rate
 */
export function formatRate(rate: number): string {
  return `${rate.toFixed(2)}% p.a.`;
}
