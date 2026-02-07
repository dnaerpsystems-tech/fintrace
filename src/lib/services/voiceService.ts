/**
 * Voice Service - Tier-One Standards
 * Handles voice recognition using Web Speech API
 * and NLP parsing for transaction extraction
 */

import { db } from '@/db';
import {
  generateId,
  TransactionType,
  type Category,
  type Account,
  type VoiceEntry,
} from '@/types';
import { format, parse, isValid, addDays, subDays } from 'date-fns';

// ==================== TYPES ====================

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface ParsedVoiceTransaction {
  amount: number | null;
  type: TransactionType;
  categoryId: string | null;
  categoryName?: string;
  description: string;
  payee?: string;
  date: string;
  confidence: number;
  rawTranscript: string;
  suggestions: string[];
}

export interface VoiceServiceState {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  transcript: string;
  interimTranscript: string;
}

type VoiceCallback = (result: VoiceRecognitionResult) => void;
type ErrorCallback = (error: string) => void;

// ==================== CONSTANTS ====================

const DEFAULT_USER_ID = 'default-user';

// Number words mapping
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  lac: 100000,
  crore: 10000000,
};

// Multipliers
const MULTIPLIERS: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  k: 1000,
  lakh: 100000,
  lac: 100000,
  lakhs: 100000,
  lacs: 100000,
  crore: 10000000,
  crores: 10000000,
};

// Income keywords
const INCOME_KEYWORDS = [
  'received',
  'got',
  'earned',
  'income',
  'salary',
  'credited',
  'credit',
  'refund',
  'cashback',
  'bonus',
  'dividend',
  'interest',
  'transferred from',
  'sent by',
];

// Expense keywords
const EXPENSE_KEYWORDS = [
  'spent',
  'paid',
  'bought',
  'purchased',
  'expense',
  'debited',
  'debit',
  'ordered',
  'gave',
  'transferred to',
  'sent to',
  'bill',
];

// Date keywords
const DATE_KEYWORDS: Record<string, () => string> = {
  today: () => format(new Date(), 'yyyy-MM-dd'),
  yesterday: () => format(subDays(new Date(), 1), 'yyyy-MM-dd'),
  'day before yesterday': () => format(subDays(new Date(), 2), 'yyyy-MM-dd'),
  tomorrow: () => format(addDays(new Date(), 1), 'yyyy-MM-dd'),
};

// Category keyword mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['food', 'lunch', 'dinner', 'breakfast', 'meal', 'restaurant', 'cafe', 'coffee', 'tea', 'snack', 'swiggy', 'zomato', 'eating', 'pizza', 'burger'],
  transport: ['uber', 'ola', 'cab', 'taxi', 'auto', 'rickshaw', 'metro', 'bus', 'train', 'travel', 'commute', 'petrol', 'diesel', 'fuel'],
  shopping: ['amazon', 'flipkart', 'shopping', 'clothes', 'dress', 'shirt', 'shoes', 'electronics', 'gadget', 'myntra', 'purchase'],
  groceries: ['groceries', 'grocery', 'vegetables', 'fruits', 'milk', 'bread', 'supermarket', 'bigbasket', 'blinkit', 'zepto', 'instamart'],
  entertainment: ['movie', 'netflix', 'spotify', 'hotstar', 'prime', 'youtube', 'gaming', 'games', 'cinema', 'concert', 'show'],
  utilities: ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'phone', 'mobile', 'recharge', 'bill', 'dth'],
  health: ['medicine', 'doctor', 'hospital', 'clinic', 'pharmacy', 'medical', 'health', 'gym', 'fitness'],
  education: ['course', 'book', 'books', 'tuition', 'school', 'college', 'education', 'learning', 'udemy', 'coursera'],
  housing: ['rent', 'house', 'flat', 'apartment', 'maintenance', 'society', 'home'],
  insurance: ['insurance', 'lic', 'policy', 'premium', 'health insurance', 'life insurance'],
  investment: ['mutual fund', 'stocks', 'sip', 'investment', 'fd', 'fixed deposit', 'ppf', 'nps'],
  salary: ['salary', 'paycheck', 'wages', 'stipend', 'income'],
  freelance: ['freelance', 'client', 'project', 'consulting', 'gig'],
  other_income: ['refund', 'cashback', 'reward', 'bonus', 'dividend', 'interest'],
  transfer: ['transfer', 'sent', 'received', 'moved'],
  atm: ['atm', 'cash', 'withdrawal', 'withdrew'],
  personal_care: ['haircut', 'salon', 'spa', 'grooming', 'beauty'],
  subscriptions: ['subscription', 'membership', 'premium'],
};

// ==================== SPEECH RECOGNITION ====================

class VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onResultCallback: VoiceCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN'; // Indian English for better rupee recognition
    this.recognition.maxAlternatives = 3;

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          this.onResultCallback?.({
            transcript: transcript.trim(),
            confidence,
            isFinal: true,
          });
        } else {
          interimTranscript += transcript;
          this.onResultCallback?.({
            transcript: transcript.trim(),
            confidence,
            isFinal: false,
          });
        }
      }
    };

    this.recognition.onerror = (event) => {
      let errorMessage = 'Voice recognition error';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not found. Please check your device.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          errorMessage = 'Voice recognition stopped.';
          break;
        default:
          errorMessage = `Voice recognition error: ${event.error}`;
      }

      this.onErrorCallback?.(errorMessage);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  start(onResult: VoiceCallback, onError: ErrorCallback): void {
    if (!this.recognition) {
      onError('Voice recognition not supported in this browser');
      return;
    }

    if (this.isListening) {
      return;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      onError('Failed to start voice recognition');
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

// ==================== NLP PARSER ====================

/**
 * Parse amount from text
 */
function parseAmount(text: string): number | null {
  const lowerText = text.toLowerCase();

  // Match patterns like "500 rupees", "Rs. 500", "₹500", "5000", "5k", "5 thousand", "5 lakh"
  const patterns = [
    // Direct numbers with currency
    /(?:rs\.?|₹|rupees?|inr)\s*([0-9,]+(?:\.[0-9]+)?)/gi,
    // Number followed by currency
    /([0-9,]+(?:\.[0-9]+)?)\s*(?:rs\.?|₹|rupees?|inr)/gi,
    // Numbers with multipliers
    /([0-9,]+(?:\.[0-9]+)?)\s*(k|thousand|lakh|lac|lakhs|lacs|crore|crores)/gi,
    // Standalone numbers (4+ digits likely amounts)
    /\b([0-9]{4,})\b/g,
    // Word numbers
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s*(hundred|thousand|lakh|lac|crore)?\s*(and\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)?/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(lowerText);
    if (match) {
      pattern.lastIndex = 0; // Reset regex

      // Handle word numbers
      if (/^[a-z]/i.test(match[1])) {
        return parseWordNumber(match[0]);
      }

      // Clean and parse number
      const numStr = match[1].replace(/,/g, '');
      let num = Number.parseFloat(numStr);

      if (Number.isNaN(num)) continue;

      // Apply multiplier if present
      const multiplierMatch = match[2]?.toLowerCase();
      if (multiplierMatch && MULTIPLIERS[multiplierMatch]) {
        num *= MULTIPLIERS[multiplierMatch];
      }

      // Convert to paise (smallest unit)
      return Math.round(num * 100);
    }
  }

  // Try to find any number in the text
  const simpleMatch = lowerText.match(/\b([0-9]+(?:\.[0-9]+)?)\b/);
  if (simpleMatch) {
    const num = Number.parseFloat(simpleMatch[1]);
    if (!Number.isNaN(num) && num > 0) {
      return Math.round(num * 100);
    }
  }

  return null;
}

/**
 * Parse word numbers like "five hundred" or "two thousand"
 */
function parseWordNumber(text: string): number | null {
  const words = text.toLowerCase().split(/\s+/);
  let result = 0;
  let current = 0;

  for (const word of words) {
    if (word === 'and') continue;

    const num = NUMBER_WORDS[word];
    const mult = MULTIPLIERS[word];

    if (num !== undefined) {
      if (num >= 100) {
        current *= num;
      } else {
        current += num;
      }
    } else if (mult !== undefined) {
      current *= mult;
      result += current;
      current = 0;
    }
  }

  result += current;
  return result > 0 ? Math.round(result * 100) : null;
}

/**
 * Determine transaction type from text
 */
function parseTransactionType(text: string): TransactionType {
  const lowerText = text.toLowerCase();

  for (const keyword of INCOME_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return TransactionType.INCOME;
    }
  }

  for (const keyword of EXPENSE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return TransactionType.EXPENSE;
    }
  }

  // Default to expense
  return TransactionType.EXPENSE;
}

/**
 * Extract category from text
 */
async function parseCategory(
  text: string,
  transactionType: TransactionType
): Promise<{ categoryId: string | null; categoryName?: string }> {
  const lowerText = text.toLowerCase();

  // Try to match category keywords
  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        // Verify category exists
        const categories = await db.categories.toArray();
        const matchedCategory = categories.find(
          c => c.id === categoryId || c.name.toLowerCase() === categoryId
        );

        if (matchedCategory) {
          return {
            categoryId: matchedCategory.id,
            categoryName: matchedCategory.name,
          };
        }

        // Return the keyword as category ID even if not found
        return { categoryId, categoryName: categoryId };
      }
    }
  }

  // Return default category based on type
  if (transactionType === TransactionType.INCOME) {
    return { categoryId: 'other_income', categoryName: 'Other Income' };
  }
  return { categoryId: 'other', categoryName: 'Other' };
}

/**
 * Parse date from text
 */
function parseDate(text: string): string {
  const lowerText = text.toLowerCase();

  // Check for date keywords
  for (const [keyword, dateFunc] of Object.entries(DATE_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return dateFunc();
    }
  }

  // Try to parse date formats
  const datePatterns = [
    // "on 15th January", "15 Jan", "15/01", "15-01"
    /(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
  ];

  for (const pattern of datePatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      try {
        // Handle month name format
        if (match[2] && /[a-z]/i.test(match[2])) {
          const day = Number.parseInt(match[1]);
          const monthStr = match[2].toLowerCase();
          const monthNames: Record<string, number> = {
            january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
            april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
            august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
            november: 10, nov: 10, december: 11, dec: 11,
          };

          const month = monthNames[monthStr];
          if (month !== undefined) {
            const year = new Date().getFullYear();
            const date = new Date(year, month, day);
            if (isValid(date)) {
              return format(date, 'yyyy-MM-dd');
            }
          }
        }

        // Handle DD/MM or DD-MM format
        if (match[1] && match[2]) {
          const day = Number.parseInt(match[1]);
          const month = Number.parseInt(match[2]) - 1;
          const year = match[3] ? Number.parseInt(match[3]) : new Date().getFullYear();
          const fullYear = year < 100 ? 2000 + year : year;
          const date = new Date(fullYear, month, day);
          if (isValid(date)) {
            return format(date, 'yyyy-MM-dd');
          }
        }
      } catch {
        // Continue to default
      }
    }
  }

  // Default to today
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Extract payee/merchant from text
 */
function parsePayee(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  // Common patterns for payee extraction
  const patterns = [
    /(?:at|to|from|for)\s+([a-z\s]+?)(?:\s+for|\s+on|\s+today|\s+yesterday|\.|$)/i,
    /(?:paid|bought|ordered|received)\s+(?:from|to|at)\s+([a-z\s]+?)(?:\s+for|\s+on|\.|$)/i,
  ];

  for (const pattern of patterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      const payee = match[1].trim();
      // Filter out common words
      const skipWords = ['the', 'a', 'an', 'some', 'my', 'i', 'me'];
      if (!skipWords.includes(payee) && payee.length > 2) {
        return payee.charAt(0).toUpperCase() + payee.slice(1);
      }
    }
  }

  return undefined;
}

/**
 * Generate description from parsed data
 */
function generateDescription(
  text: string,
  categoryName?: string,
  payee?: string
): string {
  // Clean the transcript
  let desc = text
    .replace(/(?:rs\.?|₹|rupees?|inr)\s*[0-9,]+/gi, '')
    .replace(/[0-9,]+\s*(?:rs\.?|₹|rupees?|inr)/gi, '')
    .replace(/(?:today|yesterday|on\s+\d+)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  if (desc) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }

  // Fallback
  if (!desc || desc.length < 3) {
    if (payee) {
      desc = `Transaction at ${payee}`;
    } else if (categoryName) {
      desc = `${categoryName} transaction`;
    } else {
      desc = 'Voice transaction';
    }
  }

  return desc;
}

/**
 * Calculate confidence score based on parsed data
 */
function calculateConfidence(parsed: Partial<ParsedVoiceTransaction>): number {
  let score = 0;
  let factors = 0;

  // Amount found
  if (parsed.amount !== null && parsed.amount !== undefined) {
    score += 0.3;
    factors++;
  }

  // Category matched
  if (parsed.categoryId) {
    score += 0.25;
    factors++;
  }

  // Date parsed
  if (parsed.date) {
    score += 0.15;
    factors++;
  }

  // Payee found
  if (parsed.payee) {
    score += 0.15;
    factors++;
  }

  // Description has content
  if (parsed.description && parsed.description.length > 5) {
    score += 0.15;
    factors++;
  }

  return factors > 0 ? Math.min(score, 1) : 0;
}

/**
 * Generate suggestions for the user
 */
function generateSuggestions(parsed: ParsedVoiceTransaction): string[] {
  const suggestions: string[] = [];

  if (!parsed.amount) {
    suggestions.push('Say the amount (e.g., "500 rupees" or "five hundred")');
  }

  if (!parsed.categoryId || parsed.categoryId === 'other') {
    suggestions.push('Specify what it was for (e.g., "lunch", "groceries", "uber")');
  }

  if (!parsed.payee) {
    suggestions.push('Add where you spent (e.g., "at Swiggy", "to Amazon")');
  }

  return suggestions;
}

// ==================== MAIN PARSER ====================

/**
 * Parse voice transcript into transaction data
 */
export async function parseVoiceTranscript(
  transcript: string
): Promise<ParsedVoiceTransaction> {
  const amount = parseAmount(transcript);
  const type = parseTransactionType(transcript);
  const { categoryId, categoryName } = await parseCategory(transcript, type);
  const date = parseDate(transcript);
  const payee = parsePayee(transcript);
  const description = generateDescription(transcript, categoryName, payee);

  const parsed: ParsedVoiceTransaction = {
    amount,
    type,
    categoryId,
    categoryName,
    description,
    payee,
    date,
    confidence: 0,
    rawTranscript: transcript,
    suggestions: [],
  };

  parsed.confidence = calculateConfidence(parsed);
  parsed.suggestions = generateSuggestions(parsed);

  return parsed;
}

/**
 * Save voice entry to database
 */
export async function saveVoiceEntry(
  transcript: string,
  parsedData: ParsedVoiceTransaction,
  userId: string = DEFAULT_USER_ID
): Promise<VoiceEntry> {
  const now = new Date().toISOString();

  const entry: VoiceEntry = {
    id: generateId(),
    userId,
    transcript,
    parsedData: {
      amount: parsedData.amount || undefined,
      type: parsedData.type,
      categoryId: parsedData.categoryId || undefined,
      description: parsedData.description,
      payee: parsedData.payee,
      date: parsedData.date,
    },
    confidenceScore: parsedData.confidence,
    status: parsedData.confidence > 0.5 ? 'processed' : 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await db.voiceEntries.add(entry);

  return entry;
}

/**
 * Get recent voice entries
 */
export async function getRecentVoiceEntries(
  userId: string = DEFAULT_USER_ID,
  limit = 10
): Promise<VoiceEntry[]> {
  return db.voiceEntries
    .where({ userId })
    .reverse()
    .limit(limit)
    .toArray();
}

// ==================== SINGLETON INSTANCE ====================

let recognitionInstance: VoiceRecognitionService | null = null;

export function getVoiceRecognition(): VoiceRecognitionService {
  if (!recognitionInstance) {
    recognitionInstance = new VoiceRecognitionService();
  }
  return recognitionInstance;
}

// ==================== EXPORTS ====================

export const voiceService = {
  getVoiceRecognition,
  parseVoiceTranscript,
  saveVoiceEntry,
  getRecentVoiceEntries,
  parseAmount,
  parseDate,
  parseTransactionType,
};

export default voiceService;
