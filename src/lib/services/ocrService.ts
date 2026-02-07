/**
 * OCR Service - Tier-One Standards
 * Handles receipt scanning using Tesseract.js
 * with specialized parsing for Indian receipts
 */

import { db } from '@/db';
import {
  generateId,
  TransactionType,
  type ReceiptScan,
} from '@/types';
import { format, parse, isValid } from 'date-fns';

// ==================== TYPES ====================

export interface OCRProgress {
  status: 'loading' | 'recognizing' | 'processing';
  progress: number;
  message: string;
}

export interface ExtractedReceiptData {
  merchantName: string | null;
  amount: number | null;
  date: string | null;
  items: Array<{ name: string; amount: number; quantity?: number }>;
  gstNumber: string | null;
  invoiceNumber: string | null;
  paymentMethod: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  confidence: number;
  rawText: string;
}

export interface ProcessReceiptResult {
  success: boolean;
  data: ExtractedReceiptData | null;
  error: string | null;
  receiptScan: ReceiptScan | null;
}

type ProgressCallback = (progress: OCRProgress) => void;

// ==================== CONSTANTS ====================

const DEFAULT_USER_ID = 'default-user';

// Common Indian merchant patterns
const MERCHANT_PATTERNS = [
  // Store name patterns
  /^([A-Z][A-Za-z\s&'.-]+)(?:\s+(?:store|mart|shop|restaurant|cafe|hotel|pvt|ltd|llp|inc))?\s*$/im,
  // Header patterns (usually first meaningful line)
  /^\s*([A-Z][A-Za-z0-9\s&'.-]{3,40})\s*$/m,
];

// GST Number pattern (Indian)
const GST_PATTERN = /\b(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1})\b/i;

// Invoice patterns
const INVOICE_PATTERNS = [
  /(?:invoice|bill|receipt|order)\s*(?:no|number|#|:)?\s*[:\s]*([A-Z0-9-]+)/i,
  /(?:txn|transaction|ref)\s*(?:id|no|#|:)?\s*[:\s]*([A-Z0-9-]+)/i,
];

// Date patterns
const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY
  { pattern: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, format: 'dd/MM/yyyy' },
  // DD MMM YYYY
  { pattern: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{4})/i, format: 'dd MMM yyyy' },
  // YYYY-MM-DD
  { pattern: /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, format: 'yyyy-MM-dd' },
];

// Amount patterns (Indian Rupees)
const AMOUNT_PATTERNS = [
  // Total amount patterns
  /(?:total|grand\s*total|net\s*amount|amount\s*payable|bill\s*amount|final\s*amount)\s*[:\s]*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
  // Rupee symbol patterns
  /(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
  // Amount at end of line
  /([0-9,]+(?:\.[0-9]{2})?)\s*(?:rs\.?|₹|inr)?$/gim,
];

// Tax patterns
const TAX_PATTERNS = [
  /(?:gst|cgst|sgst|igst|tax|vat)\s*(?:@\s*\d+%?)?\s*[:\s]*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
  /(?:cgst|sgst)\s*\d+%?\s*[:\s]*(?:rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
];

// Payment method patterns
const PAYMENT_PATTERNS = [
  /(?:paid\s+(?:by|via)|payment\s+(?:mode|method)|mode)\s*[:\s]*(\w+(?:\s+\w+)?)/i,
  /\b(cash|card|upi|gpay|paytm|phonepe|net\s*banking|debit\s*card|credit\s*card)\b/i,
];

// Item line patterns
const ITEM_PATTERNS = [
  // Item with quantity and price
  /^(.+?)\s+(\d+(?:\.\d+)?)\s*[xX×]\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{2})?)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{2})?)$/,
  // Item with just price at end
  /^(.+?)\s+(?:rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)$/,
  // Numbered item
  /^\d+[\.\)]\s*(.+?)\s+(?:rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)$/,
];

// ==================== TESSERACT WRAPPER ====================

/**
 * Dynamically load Tesseract.js
 */
async function loadTesseract(): Promise<typeof import('tesseract.js')> {
  try {
    const Tesseract = await import('tesseract.js');
    return Tesseract;
  } catch (error) {
    throw new Error('Failed to load OCR library. Please try again.');
  }
}

/**
 * Perform OCR on an image
 */
export async function performOCR(
  imageSource: File | string | HTMLImageElement | HTMLCanvasElement,
  onProgress?: ProgressCallback
): Promise<string> {
  const Tesseract = await loadTesseract();

  onProgress?.({
    status: 'loading',
    progress: 0,
    message: 'Loading OCR engine...',
  });

  try {
    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.({
            status: 'recognizing',
            progress: Math.round(m.progress * 100),
            message: 'Reading receipt...',
          });
        }
      },
    });

    onProgress?.({
      status: 'processing',
      progress: 100,
      message: 'Processing text...',
    });

    return result.data.text;
  } catch (error) {
    throw new Error('Failed to read receipt. Please try with a clearer image.');
  }
}

// ==================== RECEIPT PARSING ====================

/**
 * Extract merchant name from text
 */
function extractMerchantName(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Try first few lines (usually contains store name)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // Skip lines that look like dates, numbers, addresses
    if (/^\d/.test(line) || /address|phone|tel|fax|email|www|http/i.test(line)) {
      continue;
    }

    // Skip very short or very long lines
    if (line.length < 3 || line.length > 50) {
      continue;
    }

    // Check if it looks like a business name
    if (/^[A-Z][A-Za-z\s&'.-]+$/.test(line)) {
      return line;
    }
  }

  // Try merchant patterns
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length >= 3 && name.length <= 50) {
        return name;
      }
    }
  }

  return null;
}

/**
 * Extract GST number
 */
function extractGSTNumber(text: string): string | null {
  const match = text.match(GST_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Extract invoice number
 */
function extractInvoiceNumber(text: string): string | null {
  for (const pattern of INVOICE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract date from receipt
 */
function extractDate(text: string): string | null {
  for (const { pattern } of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        let day: number;
        let month: number;
        let year: number;

        // Handle different formats
        if (match[3] && /\d{4}/.test(match[3])) {
          // DD MMM YYYY format
          if (/[A-Za-z]/.test(match[2])) {
            day = Number.parseInt(match[1]);
            const monthStr = match[2].toLowerCase().substring(0, 3);
            const months: Record<string, number> = {
              jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
              jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
            };
            month = months[monthStr] ?? 0;
            year = Number.parseInt(match[3]);
          } else {
            // DD/MM/YYYY format
            day = Number.parseInt(match[1]);
            month = Number.parseInt(match[2]) - 1;
            year = Number.parseInt(match[3]);
          }
        } else if (match[1] && /\d{4}/.test(match[1])) {
          // YYYY-MM-DD format
          year = Number.parseInt(match[1]);
          month = Number.parseInt(match[2]) - 1;
          day = Number.parseInt(match[3]);
        } else {
          // DD/MM/YY format
          day = Number.parseInt(match[1]);
          month = Number.parseInt(match[2]) - 1;
          year = Number.parseInt(match[3]);
          if (year < 100) year += 2000;
        }

        const date = new Date(year, month, day);
        if (isValid(date)) {
          return format(date, 'yyyy-MM-dd');
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Extract amounts from receipt
 */
function extractAmounts(text: string): {
  total: number | null;
  subtotal: number | null;
  tax: number | null;
} {
  let total: number | null = null;
  let subtotal: number | null = null;
  let tax: number | null = null;

  // Find total amount
  const totalPatterns = [
    /(?:grand\s*total|total\s*amount|net\s*payable|amount\s*payable|bill\s*total)\s*[:\s]*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
    /total\s*[:\s]*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
  ];

  for (const pattern of totalPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const amount = Number.parseFloat(match[1].replace(/,/g, ''));
      if (!Number.isNaN(amount) && amount > 0) {
        if (!total || amount > total) {
          total = amount;
        }
      }
    }
  }

  // Find subtotal
  const subtotalMatch = text.match(
    /(?:sub\s*total|subtotal)\s*[:\s]*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{2})?)/i
  );
  if (subtotalMatch) {
    subtotal = Number.parseFloat(subtotalMatch[1].replace(/,/g, ''));
  }

  // Find tax
  for (const pattern of TAX_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const taxAmount = Number.parseFloat(match[1].replace(/,/g, ''));
      if (!Number.isNaN(taxAmount) && taxAmount > 0) {
        tax = (tax || 0) + taxAmount;
      }
    }
  }

  // Convert to paise
  return {
    total: total !== null ? Math.round(total * 100) : null,
    subtotal: subtotal !== null ? Math.round(subtotal * 100) : null,
    tax: tax !== null ? Math.round(tax * 100) : null,
  };
}

/**
 * Extract payment method
 */
function extractPaymentMethod(text: string): string | null {
  for (const pattern of PAYMENT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const method = match[1].trim().toLowerCase();

      // Normalize payment methods
      const normalizedMethods: Record<string, string> = {
        'cash': 'Cash',
        'card': 'Card',
        'credit card': 'Credit Card',
        'debit card': 'Debit Card',
        'upi': 'UPI',
        'gpay': 'Google Pay',
        'paytm': 'Paytm',
        'phonepe': 'PhonePe',
        'net banking': 'Net Banking',
        'netbanking': 'Net Banking',
      };

      return normalizedMethods[method] || method.charAt(0).toUpperCase() + method.slice(1);
    }
  }

  return null;
}

/**
 * Extract line items from receipt
 */
function extractItems(text: string): Array<{ name: string; amount: number; quantity?: number }> {
  const items: Array<{ name: string; amount: number; quantity?: number }> = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and headers
    if (!trimmedLine || trimmedLine.length < 5) continue;
    if (/total|subtotal|gst|cgst|sgst|tax|discount|cash|card|upi/i.test(trimmedLine)) continue;

    // Try item patterns
    for (const pattern of ITEM_PATTERNS) {
      const match = trimmedLine.match(pattern);
      if (match) {
        const name = match[1].trim();

        // Skip if name is too short or looks like metadata
        if (name.length < 2 || /^\d+$/.test(name)) continue;

        let amount: number;
        let quantity: number | undefined;

        if (match[4]) {
          // Has quantity and unit price
          quantity = Number.parseFloat(match[2]);
          amount = Number.parseFloat(match[4].replace(/,/g, ''));
        } else {
          amount = Number.parseFloat(match[2].replace(/,/g, ''));
        }

        if (!Number.isNaN(amount) && amount > 0) {
          items.push({
            name,
            amount: Math.round(amount * 100), // Convert to paise
            quantity,
          });
        }
        break;
      }
    }
  }

  return items;
}

/**
 * Calculate confidence score based on extracted data
 */
function calculateConfidence(data: Partial<ExtractedReceiptData>): number {
  let score = 0;
  let factors = 0;

  if (data.merchantName) {
    score += 0.2;
    factors++;
  }

  if (data.total !== null && data.total !== undefined) {
    score += 0.25;
    factors++;
  }

  if (data.date) {
    score += 0.15;
    factors++;
  }

  if (data.gstNumber) {
    score += 0.15;
    factors++;
  }

  if (data.items && data.items.length > 0) {
    score += 0.15;
    factors++;
  }

  if (data.paymentMethod) {
    score += 0.1;
    factors++;
  }

  return factors > 0 ? Math.min(score, 1) : 0;
}

/**
 * Parse receipt text and extract structured data
 */
export function parseReceiptText(rawText: string): ExtractedReceiptData {
  const merchantName = extractMerchantName(rawText);
  const gstNumber = extractGSTNumber(rawText);
  const invoiceNumber = extractInvoiceNumber(rawText);
  const date = extractDate(rawText);
  const { total, subtotal, tax } = extractAmounts(rawText);
  const paymentMethod = extractPaymentMethod(rawText);
  const items = extractItems(rawText);

  const data: ExtractedReceiptData = {
    merchantName,
    amount: total,
    date,
    items,
    gstNumber,
    invoiceNumber,
    paymentMethod,
    subtotal,
    tax,
    total,
    confidence: 0,
    rawText,
  };

  data.confidence = calculateConfidence(data);

  return data;
}

// ==================== MAIN FUNCTIONS ====================

/**
 * Process a receipt image and extract data
 */
export async function processReceipt(
  imageSource: File | string | HTMLCanvasElement,
  onProgress?: ProgressCallback,
  userId: string = DEFAULT_USER_ID
): Promise<ProcessReceiptResult> {
  try {
    // Perform OCR
    const rawText = await performOCR(imageSource, onProgress);

    if (!rawText || rawText.trim().length < 10) {
      return {
        success: false,
        data: null,
        error: 'Could not read text from image. Please try with a clearer photo.',
        receiptScan: null,
      };
    }

    // Parse receipt
    const data = parseReceiptText(rawText);

    // Create image URL if File or Canvas
    let imageUrl = '';
    if (imageSource instanceof File) {
      imageUrl = URL.createObjectURL(imageSource);
    } else if (imageSource instanceof HTMLCanvasElement) {
      imageUrl = imageSource.toDataURL('image/jpeg', 0.8);
    } else if (typeof imageSource === 'string') {
      imageUrl = imageSource;
    }

    // Save to database
    const now = new Date().toISOString();
    const receiptScan: ReceiptScan = {
      id: generateId(),
      userId,
      imageUrl,
      rawText,
      extractedData: {
        merchantName: data.merchantName || undefined,
        amount: data.amount || undefined,
        date: data.date || undefined,
        items: data.items,
        gstNumber: data.gstNumber || undefined,
        paymentMethod: data.paymentMethod || undefined,
      },
      confidenceScore: data.confidence,
      status: data.confidence > 0.4 ? 'processed' : 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await db.receiptScans.add(receiptScan);

    return {
      success: true,
      data,
      error: null,
      receiptScan,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Failed to process receipt',
      receiptScan: null,
    };
  }
}

/**
 * Get recent receipt scans
 */
export async function getRecentReceiptScans(
  userId: string = DEFAULT_USER_ID,
  limit = 10
): Promise<ReceiptScan[]> {
  return db.receiptScans
    .where({ userId })
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Delete a receipt scan
 */
export async function deleteReceiptScan(scanId: string): Promise<void> {
  await db.receiptScans.delete(scanId);
}

/**
 * Update receipt scan with transaction ID
 */
export async function linkReceiptToTransaction(
  scanId: string,
  transactionId: string
): Promise<void> {
  await db.receiptScans.update(scanId, {
    transactionId,
    status: 'processed',
    updatedAt: new Date().toISOString(),
  });
}

// ==================== IMAGE PREPROCESSING ====================

/**
 * Preprocess image for better OCR results
 */
export async function preprocessImage(
  imageFile: File
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      // Calculate dimensions (max 2000px)
      let width = img.width;
      let height = img.height;
      const maxSize = 2000;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Increase contrast
        const contrast = 1.3;
        const adjusted = ((gray - 128) * contrast) + 128;
        const clamped = Math.max(0, Math.min(255, adjusted));

        data[i] = clamped;
        data[i + 1] = clamped;
        data[i + 2] = clamped;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ==================== EXPORTS ====================

export const ocrService = {
  performOCR,
  parseReceiptText,
  processReceipt,
  getRecentReceiptScans,
  deleteReceiptScan,
  linkReceiptToTransaction,
  preprocessImage,
};

export default ocrService;
