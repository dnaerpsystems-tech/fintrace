/**
 * IFSC Code Lookup Service
 * Uses Razorpay's IFSC API for bank details
 */

export interface IFSCDetails {
  BANK: string;
  IFSC: string;
  BRANCH: string;
  ADDRESS: string;
  CITY: string;
  DISTRICT: string;
  STATE: string;
  CONTACT?: string;
  UPI?: boolean;
  RTGS?: boolean;
  NEFT?: boolean;
  IMPS?: boolean;
  MICR?: string;
  SWIFT?: string;
}

const IFSC_API_BASE = 'https://ifsc.razorpay.com';

/**
 * Lookup IFSC code details
 */
export async function lookupIFSC(ifscCode: string): Promise<IFSCDetails | null> {
  try {
    // Validate IFSC format (11 characters, first 4 alpha, 5th is 0)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
      throw new Error('Invalid IFSC code format');
    }

    const response = await fetch(`${IFSC_API_BASE}/${ifscCode.toUpperCase()}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch IFSC details');
    }

    const data = await response.json();
    return data as IFSCDetails;
  } catch (error) {
    console.error('IFSC lookup error:', error);
    return null;
  }
}

/**
 * Get bank name from IFSC code (first 4 characters)
 */
export function getBankCodeFromIFSC(ifscCode: string): string {
  return ifscCode.substring(0, 4).toUpperCase();
}

/**
 * Common Indian bank codes
 */
export const BANK_CODES: Record<string, string> = {
  'HDFC': 'HDFC Bank',
  'ICIC': 'ICICI Bank',
  'SBIN': 'State Bank of India',
  'UTIB': 'Axis Bank',
  'KKBK': 'Kotak Mahindra Bank',
  'YESB': 'Yes Bank',
  'IDFB': 'IDFC First Bank',
  'INDB': 'IndusInd Bank',
  'PUNB': 'Punjab National Bank',
  'BARB': 'Bank of Baroda',
  'CNRB': 'Canara Bank',
  'UBIN': 'Union Bank of India',
  'BKID': 'Bank of India',
  'CBIN': 'Central Bank of India',
  'IDIB': 'Indian Bank',
  'IOBA': 'Indian Overseas Bank',
  'PSIB': 'Punjab & Sind Bank',
  'UCBA': 'UCO Bank',
  'FDRL': 'Federal Bank',
  'KARB': 'Karnataka Bank',
  'SYNB': 'Syndicate Bank',
  'ALLA': 'Allahabad Bank',
  'CORP': 'Corporation Bank',
  'ORBC': 'Oriental Bank of Commerce',
  'ANDB': 'Andhra Bank',
  'VIJB': 'Vijaya Bank',
  'RATN': 'RBL Bank',
  'JAKA': 'Jammu & Kashmir Bank',
  'KVBL': 'Karur Vysya Bank',
  'TMBL': 'Tamilnad Mercantile Bank',
  'CSBK': 'City Union Bank',
  'SIBL': 'South Indian Bank',
  'DLXB': 'Dhanlaxmi Bank',
  'SRCB': 'Saraswat Co-operative Bank',
  'COSB': 'Cosmos Co-operative Bank',
  'PAYT': 'Paytm Payments Bank',
  'AIRP': 'Airtel Payments Bank',
  'JIOP': 'Jio Payments Bank',
  'PYTM': 'Paytm Payments Bank',
  'FINO': 'Fino Payments Bank',
  'NSPB': 'NSDL Payments Bank'
};

/**
 * Get bank name from bank code
 */
export function getBankName(bankCode: string): string {
  return BANK_CODES[bankCode.toUpperCase()] || bankCode;
}

/**
 * Validate IFSC code format
 */
export function isValidIFSC(ifscCode: string): boolean {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifscCode.toUpperCase());
}

/**
 * Format account number for display (mask middle digits)
 */
export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  const visible = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4);
  return masked + visible;
}

/**
 * Detect UPI app from transaction description
 */
export function detectUPIApp(description: string): string | null {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('gpay') || lowerDesc.includes('google pay')) return 'Google Pay';
  if (lowerDesc.includes('phonepe')) return 'PhonePe';
  if (lowerDesc.includes('paytm')) return 'Paytm';
  if (lowerDesc.includes('bhim')) return 'BHIM';
  if (lowerDesc.includes('amazonpay') || lowerDesc.includes('amazon pay')) return 'Amazon Pay';
  if (lowerDesc.includes('whatsapp')) return 'WhatsApp Pay';
  if (lowerDesc.includes('cred')) return 'CRED';
  if (lowerDesc.includes('mobikwik')) return 'MobiKwik';
  if (lowerDesc.includes('freecharge')) return 'Freecharge';
  
  return null;
}

/**
 * Detect payment type from description
 */
export function detectPaymentType(description: string): 'UPI' | 'NEFT' | 'RTGS' | 'IMPS' | 'CARD' | 'CASH' | 'OTHER' {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('upi') || lowerDesc.includes('@')) return 'UPI';
  if (lowerDesc.includes('neft')) return 'NEFT';
  if (lowerDesc.includes('rtgs')) return 'RTGS';
  if (lowerDesc.includes('imps')) return 'IMPS';
  if (lowerDesc.includes('card') || lowerDesc.includes('pos') || lowerDesc.includes('atm')) return 'CARD';
  if (lowerDesc.includes('cash') || lowerDesc.includes('withdrawal')) return 'CASH';
  
  return 'OTHER';
}

export const ifscService = {
  lookupIFSC,
  getBankCodeFromIFSC,
  getBankName,
  isValidIFSC,
  maskAccountNumber,
  detectUPIApp,
  detectPaymentType,
  BANK_CODES
};
