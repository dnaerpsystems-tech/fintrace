/**
 * UPI Transaction Auto-Categorization Service
 * Comprehensive merchant pattern matching for Indian UPI transactions
 */

// ============================================
// Types
// ============================================

export interface UPITransaction {
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  upiId?: string;
}

export interface CategorizedTransaction {
  category: string;
  subcategory?: string;
  merchant?: string;
  confidence: number;
  tags: string[];
}

// ============================================
// Merchant Patterns Database
// ============================================

const MERCHANT_PATTERNS: Record<string, {
  category: string;
  subcategory?: string;
  patterns: (string | RegExp)[];
  tags?: string[];
}> = {
  // Food & Dining
  'Swiggy': {
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    patterns: ['swiggy', /swiggy.*ltd/i, /bundl.*technologies/i],
    tags: ['food-delivery', 'online-order'],
  },
  'Zomato': {
    category: 'Food & Dining',
    subcategory: 'Food Delivery',
    patterns: ['zomato', /zomato.*ltd/i, /zomato.*private/i],
    tags: ['food-delivery', 'online-order'],
  },
  'Dominos': {
    category: 'Food & Dining',
    subcategory: 'Restaurant',
    patterns: ['dominos', 'domino', /jubilant.*food/i],
    tags: ['pizza', 'fast-food'],
  },
  'McDonalds': {
    category: 'Food & Dining',
    subcategory: 'Restaurant',
    patterns: ['mcdonald', 'mcdonalds', /mcd.*restaurant/i],
    tags: ['fast-food', 'burger'],
  },
  'KFC': {
    category: 'Food & Dining',
    subcategory: 'Restaurant',
    patterns: ['kfc', /kentucky.*fried/i],
    tags: ['fast-food', 'chicken'],
  },
  'Pizza Hut': {
    category: 'Food & Dining',
    subcategory: 'Restaurant',
    patterns: ['pizzahut', 'pizza hut'],
    tags: ['pizza', 'fast-food'],
  },
  'Starbucks': {
    category: 'Food & Dining',
    subcategory: 'Cafe',
    patterns: ['starbucks', /tata.*starbucks/i],
    tags: ['coffee', 'cafe'],
  },
  'Cafe Coffee Day': {
    category: 'Food & Dining',
    subcategory: 'Cafe',
    patterns: ['ccd', 'cafe coffee day', /coffee.*day/i],
    tags: ['coffee', 'cafe'],
  },

  // Shopping - Online
  'Amazon': {
    category: 'Shopping',
    subcategory: 'Online Shopping',
    patterns: ['amazon', /amazon.*pay/i, /amazon.*seller/i, /amzn/i],
    tags: ['e-commerce', 'online'],
  },
  'Flipkart': {
    category: 'Shopping',
    subcategory: 'Online Shopping',
    patterns: ['flipkart', /flipkart.*internet/i, /fk.*retail/i],
    tags: ['e-commerce', 'online'],
  },
  'Myntra': {
    category: 'Shopping',
    subcategory: 'Fashion',
    patterns: ['myntra', /myntra.*designs/i],
    tags: ['fashion', 'clothing', 'online'],
  },
  'Ajio': {
    category: 'Shopping',
    subcategory: 'Fashion',
    patterns: ['ajio', /reliance.*ajio/i],
    tags: ['fashion', 'clothing', 'online'],
  },
  'Nykaa': {
    category: 'Shopping',
    subcategory: 'Beauty',
    patterns: ['nykaa', /nykaa.*e.*retail/i, /fsn.*e.*commerce/i],
    tags: ['beauty', 'cosmetics', 'online'],
  },
  'Meesho': {
    category: 'Shopping',
    subcategory: 'Online Shopping',
    patterns: ['meesho', /fashnear.*technologies/i],
    tags: ['e-commerce', 'reseller'],
  },

  // Groceries
  'BigBasket': {
    category: 'Groceries',
    subcategory: 'Online Grocery',
    patterns: ['bigbasket', /innovative.*retail/i, /supermarket.*grocery/i],
    tags: ['grocery', 'online'],
  },
  'Zepto': {
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    patterns: ['zepto', /kiranakart/i],
    tags: ['grocery', 'quick-commerce'],
  },
  'Blinkit': {
    category: 'Groceries',
    subcategory: 'Quick Commerce',
    patterns: ['blinkit', 'grofers', /blink.*commerce/i],
    tags: ['grocery', 'quick-commerce'],
  },
  'JioMart': {
    category: 'Groceries',
    subcategory: 'Online Grocery',
    patterns: ['jiomart', /reliance.*retail/i],
    tags: ['grocery', 'online'],
  },
  'DMart': {
    category: 'Groceries',
    subcategory: 'Supermarket',
    patterns: ['dmart', 'd-mart', /avenue.*supermarts/i],
    tags: ['grocery', 'supermarket'],
  },
  'More': {
    category: 'Groceries',
    subcategory: 'Supermarket',
    patterns: [/more.*retail/i, /more.*supermarket/i],
    tags: ['grocery', 'supermarket'],
  },

  // Transportation
  'Uber': {
    category: 'Transportation',
    subcategory: 'Ride Hailing',
    patterns: ['uber', /uber.*india/i],
    tags: ['cab', 'ride'],
  },
  'Ola': {
    category: 'Transportation',
    subcategory: 'Ride Hailing',
    patterns: ['ola', /ani.*technologies/i, /ola.*cabs/i],
    tags: ['cab', 'ride'],
  },
  'Rapido': {
    category: 'Transportation',
    subcategory: 'Ride Hailing',
    patterns: ['rapido', /roppen.*transportation/i],
    tags: ['bike-taxi', 'ride'],
  },
  'IndianRailways': {
    category: 'Transportation',
    subcategory: 'Train',
    patterns: ['irctc', /indian.*railway/i, /rail.*ticket/i],
    tags: ['train', 'travel'],
  },
  'RedBus': {
    category: 'Transportation',
    subcategory: 'Bus',
    patterns: ['redbus', /ibibo.*group/i, /red.*bus/i],
    tags: ['bus', 'travel'],
  },
  'Petrol Pump': {
    category: 'Transportation',
    subcategory: 'Fuel',
    patterns: [/petrol/i, /fuel/i, /hp.*retail/i, /indian.*oil/i, /bharat.*petroleum/i, /iocl/i, /bpcl/i, /hpcl/i],
    tags: ['fuel', 'petrol'],
  },

  // Entertainment
  'Netflix': {
    category: 'Entertainment',
    subcategory: 'Streaming',
    patterns: ['netflix', /netflix.*services/i],
    tags: ['ott', 'streaming'],
  },
  'Amazon Prime': {
    category: 'Entertainment',
    subcategory: 'Streaming',
    patterns: [/prime.*video/i, /amazon.*prime/i],
    tags: ['ott', 'streaming'],
  },
  'Hotstar': {
    category: 'Entertainment',
    subcategory: 'Streaming',
    patterns: ['hotstar', 'disney+', /disney.*plus/i, /star.*india/i],
    tags: ['ott', 'streaming'],
  },
  'Spotify': {
    category: 'Entertainment',
    subcategory: 'Music',
    patterns: ['spotify', /spotify.*ab/i],
    tags: ['music', 'streaming'],
  },
  'YouTube Premium': {
    category: 'Entertainment',
    subcategory: 'Streaming',
    patterns: [/youtube.*premium/i, /google.*youtube/i],
    tags: ['ott', 'streaming'],
  },
  'PVR': {
    category: 'Entertainment',
    subcategory: 'Movies',
    patterns: ['pvr', /pvr.*cinemas/i, /pvr.*limited/i],
    tags: ['movies', 'cinema'],
  },
  'INOX': {
    category: 'Entertainment',
    subcategory: 'Movies',
    patterns: ['inox', /inox.*leisure/i],
    tags: ['movies', 'cinema'],
  },
  'BookMyShow': {
    category: 'Entertainment',
    subcategory: 'Tickets',
    patterns: ['bookmyshow', /bigtree.*entertainment/i],
    tags: ['tickets', 'entertainment'],
  },

  // Utilities
  'Electricity': {
    category: 'Utilities',
    subcategory: 'Electricity',
    patterns: [/electricity/i, /power.*bill/i, /bescom/i, /tata.*power/i, /adani.*electricity/i, /discom/i, /msedcl/i, /bses/i],
    tags: ['bill', 'electricity'],
  },
  'Water': {
    category: 'Utilities',
    subcategory: 'Water',
    patterns: [/water.*bill/i, /water.*supply/i, /jal.*board/i],
    tags: ['bill', 'water'],
  },
  'Gas': {
    category: 'Utilities',
    subcategory: 'Gas',
    patterns: [/gas.*bill/i, /lpg/i, /indane/i, /bharatgas/i, /hp.*gas/i, /piped.*gas/i],
    tags: ['bill', 'gas'],
  },
  'Airtel': {
    category: 'Utilities',
    subcategory: 'Mobile/Internet',
    patterns: ['airtel', /bharti.*airtel/i],
    tags: ['telecom', 'mobile', 'broadband'],
  },
  'Jio': {
    category: 'Utilities',
    subcategory: 'Mobile/Internet',
    patterns: ['jio', /reliance.*jio/i, /jio.*infocomm/i],
    tags: ['telecom', 'mobile', 'broadband'],
  },
  'Vi': {
    category: 'Utilities',
    subcategory: 'Mobile/Internet',
    patterns: [/vodafone.*idea/i, /vi /i, /vi\./i],
    tags: ['telecom', 'mobile'],
  },
  'BSNL': {
    category: 'Utilities',
    subcategory: 'Mobile/Internet',
    patterns: ['bsnl', /bharat.*sanchar/i],
    tags: ['telecom', 'mobile', 'broadband'],
  },

  // Healthcare
  'Apollo': {
    category: 'Healthcare',
    subcategory: 'Hospital',
    patterns: ['apollo', /apollo.*hospitals/i, /apollo.*pharmacy/i],
    tags: ['hospital', 'pharmacy'],
  },
  'Fortis': {
    category: 'Healthcare',
    subcategory: 'Hospital',
    patterns: ['fortis', /fortis.*healthcare/i],
    tags: ['hospital'],
  },
  'Max Healthcare': {
    category: 'Healthcare',
    subcategory: 'Hospital',
    patterns: [/max.*healthcare/i, /max.*hospital/i],
    tags: ['hospital'],
  },
  'Practo': {
    category: 'Healthcare',
    subcategory: 'Consultation',
    patterns: ['practo', /practo.*technologies/i],
    tags: ['consultation', 'online'],
  },
  'PharmEasy': {
    category: 'Healthcare',
    subcategory: 'Pharmacy',
    patterns: ['pharmeasy', /api.*holdings/i],
    tags: ['pharmacy', 'medicines'],
  },
  '1mg': {
    category: 'Healthcare',
    subcategory: 'Pharmacy',
    patterns: ['1mg', 'onemg', /tata.*1mg/i],
    tags: ['pharmacy', 'medicines'],
  },
  'Netmeds': {
    category: 'Healthcare',
    subcategory: 'Pharmacy',
    patterns: ['netmeds', /reliance.*retail.*netmeds/i],
    tags: ['pharmacy', 'medicines'],
  },

  // Insurance
  'LIC': {
    category: 'Insurance',
    subcategory: 'Life Insurance',
    patterns: ['lic', /life.*insurance.*corporation/i],
    tags: ['life-insurance', 'premium'],
  },
  'HDFC Life': {
    category: 'Insurance',
    subcategory: 'Life Insurance',
    patterns: [/hdfc.*life/i, /hdfc.*standard.*life/i],
    tags: ['life-insurance', 'premium'],
  },
  'ICICI Prudential': {
    category: 'Insurance',
    subcategory: 'Life Insurance',
    patterns: [/icici.*prudential/i, /icici.*pru/i],
    tags: ['life-insurance', 'premium'],
  },
  'Digit Insurance': {
    category: 'Insurance',
    subcategory: 'General Insurance',
    patterns: [/digit.*insurance/i, /go.*digit/i],
    tags: ['general-insurance', 'premium'],
  },

  // Education
  'Byju': {
    category: 'Education',
    subcategory: 'EdTech',
    patterns: ['byju', /think.*learn/i, /byju.*classes/i],
    tags: ['edtech', 'learning'],
  },
  'Unacademy': {
    category: 'Education',
    subcategory: 'EdTech',
    patterns: ['unacademy', /sorting.*hat/i],
    tags: ['edtech', 'learning'],
  },
  'Coursera': {
    category: 'Education',
    subcategory: 'Online Course',
    patterns: ['coursera'],
    tags: ['edtech', 'courses'],
  },
  'Udemy': {
    category: 'Education',
    subcategory: 'Online Course',
    patterns: ['udemy'],
    tags: ['edtech', 'courses'],
  },

  // Investment
  'Zerodha': {
    category: 'Investment',
    subcategory: 'Stocks',
    patterns: ['zerodha', /zerodha.*broking/i],
    tags: ['stocks', 'trading'],
  },
  'Groww': {
    category: 'Investment',
    subcategory: 'Stocks',
    patterns: ['groww', /nextbillion.*technology/i],
    tags: ['stocks', 'mutual-funds'],
  },
  'Upstox': {
    category: 'Investment',
    subcategory: 'Stocks',
    patterns: ['upstox', /rksv.*securities/i],
    tags: ['stocks', 'trading'],
  },
  'MFU': {
    category: 'Investment',
    subcategory: 'Mutual Funds',
    patterns: [/mf.*utility/i, /mfu/i, /cams/i, /karvy/i],
    tags: ['mutual-funds', 'sip'],
  },
  'Coin': {
    category: 'Investment',
    subcategory: 'Mutual Funds',
    patterns: [/coin.*zerodha/i],
    tags: ['mutual-funds', 'sip'],
  },

  // Travel & Hotels
  'MakeMyTrip': {
    category: 'Travel',
    subcategory: 'Booking',
    patterns: ['makemytrip', 'mmt', /make.*my.*trip/i],
    tags: ['travel', 'booking'],
  },
  'Goibibo': {
    category: 'Travel',
    subcategory: 'Booking',
    patterns: ['goibibo', /ibibo.*group/i],
    tags: ['travel', 'booking'],
  },
  'OYO': {
    category: 'Travel',
    subcategory: 'Hotels',
    patterns: ['oyo', /oravel.*stays/i],
    tags: ['hotel', 'accommodation'],
  },
  'Cleartrip': {
    category: 'Travel',
    subcategory: 'Booking',
    patterns: ['cleartrip', /cleartrip.*private/i],
    tags: ['travel', 'booking'],
  },
  'Yatra': {
    category: 'Travel',
    subcategory: 'Booking',
    patterns: ['yatra', /yatra.*online/i],
    tags: ['travel', 'booking'],
  },

  // EMI & Loans
  'Bajaj Finserv': {
    category: 'EMI',
    subcategory: 'Consumer Loan',
    patterns: [/bajaj.*finserv/i, /bajaj.*finance/i],
    tags: ['emi', 'loan'],
  },
  'HDFC Bank EMI': {
    category: 'EMI',
    subcategory: 'Bank EMI',
    patterns: [/hdfc.*emi/i, /hdfc.*loan/i],
    tags: ['emi', 'bank-loan'],
  },
  'Home Credit': {
    category: 'EMI',
    subcategory: 'Consumer Loan',
    patterns: [/home.*credit/i],
    tags: ['emi', 'loan'],
  },

  // Digital Wallets / Payments
  'Paytm': {
    category: 'Transfer',
    subcategory: 'Wallet',
    patterns: ['paytm', /one97.*communications/i, /paytm.*payments/i],
    tags: ['wallet', 'payment'],
  },
  'PhonePe': {
    category: 'Transfer',
    subcategory: 'UPI',
    patterns: ['phonepe', /phonepe.*private/i],
    tags: ['upi', 'payment'],
  },
  'GPay': {
    category: 'Transfer',
    subcategory: 'UPI',
    patterns: ['gpay', 'googlepay', 'google pay', /google.*pay/i],
    tags: ['upi', 'payment'],
  },
  'BHIM': {
    category: 'Transfer',
    subcategory: 'UPI',
    patterns: ['bhim', /bhim.*upi/i],
    tags: ['upi', 'payment'],
  },
  'CRED': {
    category: 'Transfer',
    subcategory: 'Credit Card',
    patterns: ['cred', /dreamplug.*technologies/i],
    tags: ['credit-card', 'payment'],
  },
};

// ============================================
// UPI ID Patterns
// ============================================

const UPI_APP_PATTERNS: Record<string, string> = {
  '@okicici': 'iMobile Pay',
  '@okhdfcbank': 'HDFC PayZapp',
  '@oksbi': 'SBI YONO',
  '@okaxis': 'Axis Pay',
  '@ybl': 'PhonePe',
  '@ibl': 'PhonePe',
  '@paytm': 'Paytm',
  '@apl': 'Amazon Pay',
  '@axl': 'Amazon Pay',
  '@gpay': 'Google Pay',
  '@fbl': 'Google Pay',
  '@fam': 'Google Pay',
  '@rapl': 'WhatsApp Pay',
  '@waicici': 'WhatsApp Pay',
  '@cboi': 'BHIM',
  '@upi': 'BHIM',
  '@icici': 'ICICI Bank',
  '@sbi': 'SBI',
  '@hdfcbank': 'HDFC Bank',
  '@axisbank': 'Axis Bank',
  '@kotak': 'Kotak Bank',
  '@indus': 'IndusInd Bank',
  '@federal': 'Federal Bank',
  '@rbl': 'RBL Bank',
  '@boi': 'Bank of India',
  '@pnb': 'PNB',
};

// ============================================
// Categorization Functions
// ============================================

export function categorizeUPITransaction(transaction: UPITransaction): CategorizedTransaction {
  const description = transaction.description.toLowerCase();
  const upiId = transaction.upiId?.toLowerCase() || '';

  let bestMatch: CategorizedTransaction = {
    category: transaction.type === 'CREDIT' ? 'Other Income' : 'Other Expenses',
    confidence: 0,
    tags: [],
  };

  // Try merchant patterns
  for (const [merchantName, config] of Object.entries(MERCHANT_PATTERNS)) {
    for (const pattern of config.patterns) {
      const matches = typeof pattern === 'string'
        ? description.includes(pattern.toLowerCase()) || upiId.includes(pattern.toLowerCase())
        : pattern.test(description) || pattern.test(upiId);

      if (matches) {
        const confidence = typeof pattern === 'string' ? 0.8 : 0.9;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            category: config.category,
            subcategory: config.subcategory,
            merchant: merchantName,
            confidence,
            tags: config.tags || [],
          };
        }
      }
    }
  }

  // Additional pattern matching for common transactions
  if (bestMatch.confidence < 0.5) {
    // Salary detection
    if (/salary|payroll|wages|stipend/i.test(description)) {
      bestMatch = { category: 'Salary', confidence: 0.9, tags: ['income', 'salary'] };
    }
    // Interest income
    else if (/interest.*credit|int.*cr|interest.*received/i.test(description)) {
      bestMatch = { category: 'Interest', confidence: 0.85, tags: ['income', 'interest'] };
    }
    // Dividend
    else if (/dividend/i.test(description)) {
      bestMatch = { category: 'Investment', subcategory: 'Dividend', confidence: 0.9, tags: ['income', 'dividend'] };
    }
    // Rent
    else if (/rent|house.*rent|rental/i.test(description)) {
      bestMatch = { category: 'Housing', subcategory: 'Rent', confidence: 0.85, tags: ['rent'] };
    }
    // ATM
    else if (/atm|cash.*withdrawal/i.test(description)) {
      bestMatch = { category: 'Cash', subcategory: 'ATM Withdrawal', confidence: 0.95, tags: ['cash', 'atm'] };
    }
    // Bank charges
    else if (/bank.*charge|service.*charge|sms.*charge|debit.*card.*charge/i.test(description)) {
      bestMatch = { category: 'Bank Charges', confidence: 0.9, tags: ['fees', 'bank'] };
    }
    // EMI
    else if (/emi|equated.*monthly/i.test(description)) {
      bestMatch = { category: 'EMI', confidence: 0.85, tags: ['loan', 'emi'] };
    }
  }

  return bestMatch;
}

export function detectUPIApp(upiId: string): string | null {
  if (!upiId) return null;

  const lowerUpiId = upiId.toLowerCase();
  for (const [suffix, appName] of Object.entries(UPI_APP_PATTERNS)) {
    if (lowerUpiId.includes(suffix)) {
      return appName;
    }
  }
  return null;
}

export function extractMerchantFromNarration(narration: string): string | null {
  // Common patterns
  const patterns = [
    /paid to ([^/]+)/i,
    /received from ([^/]+)/i,
    /upi-([^-]+)-/i,
    /to ([^/]+?) via/i,
    /from ([^/]+?) via/i,
  ];

  for (const pattern of patterns) {
    const match = narration.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export function parseUPIReference(narration: string): {
  upiId?: string;
  utrNumber?: string;
  referenceId?: string;
} {
  const result: { upiId?: string; utrNumber?: string; referenceId?: string } = {};

  // Extract UPI ID
  const upiMatch = narration.match(/([a-zA-Z0-9._-]+@[a-zA-Z]+)/);
  if (upiMatch) {
    result.upiId = upiMatch[1];
  }

  // Extract UTR Number (12 digits)
  const utrMatch = narration.match(/\b(\d{12})\b/);
  if (utrMatch) {
    result.utrNumber = utrMatch[1];
  }

  // Extract Reference ID
  const refMatch = narration.match(/ref[.:]\s*([A-Z0-9]+)/i);
  if (refMatch) {
    result.referenceId = refMatch[1];
  }

  return result;
}

export function batchCategorize(transactions: UPITransaction[]): Map<number, CategorizedTransaction> {
  const results = new Map<number, CategorizedTransaction>();

  for (let i = 0; i < transactions.length; i++) {
    results.set(i, categorizeUPITransaction(transactions[i]));
  }

  return results;
}

export const upiCategorizationService = {
  categorize: categorizeUPITransaction,
  detectApp: detectUPIApp,
  extractMerchant: extractMerchantFromNarration,
  parseReference: parseUPIReference,
  batchCategorize,
  MERCHANT_PATTERNS,
  UPI_APP_PATTERNS,
};
