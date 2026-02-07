/**
 * Multi-Currency Support Service
 * Handles foreign currency transactions, exchange rates, and conversions
 */

// ============================================
// Types
// ============================================

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  decimals: number;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: string;
}

export interface CurrencyConversion {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  timestamp: string;
}

// ============================================
// Supported Currencies
// ============================================

export const CURRENCIES: Record<string, Currency> = {
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', decimals: 2 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', decimals: 2 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', decimals: 2 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', decimals: 2 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', decimals: 2 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', decimals: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', decimals: 0 },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', decimals: 2 },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', decimals: 2 },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', decimals: 2 },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', decimals: 2 },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', decimals: 2 },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', decimals: 2 },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', decimals: 2 },
  QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', flag: '🇶🇦', decimals: 2 },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼', decimals: 3 },
  BHD: { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', flag: '🇧🇭', decimals: 3 },
  OMR: { code: 'OMR', name: 'Omani Rial', symbol: '﷼', flag: '🇴🇲', decimals: 3 },
};

// ============================================
// Exchange Rates (Mock - In production, use API)
// Base: INR
// ============================================

const EXCHANGE_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83.12,
  EUR: 90.45,
  GBP: 105.23,
  AED: 22.64,
  SGD: 61.85,
  AUD: 54.32,
  CAD: 61.45,
  JPY: 0.56,
  CNY: 11.52,
  CHF: 94.56,
  HKD: 10.65,
  NZD: 50.12,
  THB: 2.34,
  MYR: 17.65,
  SAR: 22.16,
  QAR: 22.83,
  KWD: 270.45,
  BHD: 220.56,
  OMR: 216.01,
};

// ============================================
// Core Functions
// ============================================

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(from: string, to: string): number {
  if (from === to) return 1;

  const fromRate = EXCHANGE_RATES_TO_INR[from];
  const toRate = EXCHANGE_RATES_TO_INR[to];

  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency: ${!fromRate ? from : to}`);
  }

  // Convert through INR as base
  return fromRate / toRate;
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string
): CurrencyConversion {
  const rate = getExchangeRate(from, to);
  const toAmount = amount * rate;

  return {
    fromAmount: amount,
    fromCurrency: from,
    toAmount: Math.round(toAmount * 100) / 100, // Round to 2 decimals
    toCurrency: to,
    rate,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format amount with currency symbol
 */
export function formatWithCurrency(
  amount: number,
  currencyCode: string,
  options?: {
    showCode?: boolean;
    compact?: boolean;
  }
): string {
  const currency = CURRENCIES[currencyCode];
  if (!currency) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }

  const formatter = new Intl.NumberFormat(getLocaleForCurrency(currencyCode), {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: options?.compact ? 0 : currency.decimals,
    maximumFractionDigits: currency.decimals,
    notation: options?.compact ? 'compact' : 'standard',
  });

  return formatter.format(amount);
}

/**
 * Get locale for currency formatting
 */
function getLocaleForCurrency(currencyCode: string): string {
  const localeMap: Record<string, string> = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
    AED: 'ar-AE',
    SGD: 'en-SG',
    AUD: 'en-AU',
    CAD: 'en-CA',
  };
  return localeMap[currencyCode] || 'en-US';
}

/**
 * Get all available currencies
 */
export function getAvailableCurrencies(): Currency[] {
  return Object.values(CURRENCIES);
}

/**
 * Get currency by code
 */
export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES[code];
}

/**
 * Parse amount from foreign currency to INR (in paise)
 */
export function toINRPaise(amount: number, fromCurrency: string): number {
  if (fromCurrency === 'INR') {
    return Math.round(amount * 100);
  }

  const conversion = convertCurrency(amount, fromCurrency, 'INR');
  return Math.round(conversion.toAmount * 100);
}

/**
 * Convert INR paise to foreign currency
 */
export function fromINRPaise(paiseAmount: number, toCurrency: string): number {
  const inrAmount = paiseAmount / 100;

  if (toCurrency === 'INR') {
    return inrAmount;
  }

  const conversion = convertCurrency(inrAmount, 'INR', toCurrency);
  return conversion.toAmount;
}

// ============================================
// Preferences
// ============================================

const PREFS_KEY = 'currency_preferences';

interface CurrencyPreferences {
  baseCurrency: string;
  recentCurrencies: string[];
  showExchangeRates: boolean;
}

const DEFAULT_PREFS: CurrencyPreferences = {
  baseCurrency: 'INR',
  recentCurrencies: ['USD', 'EUR', 'GBP', 'AED'],
  showExchangeRates: true,
};

export function getCurrencyPreferences(): CurrencyPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore
  }
  return DEFAULT_PREFS;
}

export function saveCurrencyPreferences(prefs: Partial<CurrencyPreferences>): void {
  const current = getCurrencyPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
}

export function addRecentCurrency(code: string): void {
  const prefs = getCurrencyPreferences();
  const recent = [code, ...prefs.recentCurrencies.filter(c => c !== code)].slice(0, 5);
  saveCurrencyPreferences({ recentCurrencies: recent });
}

// ============================================
// Export Service
// ============================================

export const currencyService = {
  CURRENCIES,
  getExchangeRate,
  convertCurrency,
  formatWithCurrency,
  getAvailableCurrencies,
  getCurrency,
  toINRPaise,
  fromINRPaise,
  getCurrencyPreferences,
  saveCurrencyPreferences,
  addRecentCurrency,
};
