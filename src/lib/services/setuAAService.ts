/**
 * Setu Account Aggregator Service
 * Complete integration for bank statement fetching
 * https://docs.setu.co/data/account-aggregator
 */

// ============================================
// Types
// ============================================

export interface SetuConfig {
  clientId: string;
  clientSecret: string;
  productInstanceId: string;
  baseUrl: string;
  redirectUrl: string;
}

export interface ConsentRequest {
  customerId: string;
  mobileNumber: string;
  fiTypes: FIType[];
  purpose: string;
  fetchType: 'ONETIME' | 'PERIODIC';
  frequency?: {
    unit: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
    value: number;
  };
  dataRange: {
    from: string; // ISO date
    to: string;   // ISO date
  };
}

export interface ConsentResponse {
  id: string;
  url: string;
  status: ConsentStatus;
  createdAt: string;
  expiresAt: string;
}

export interface ConsentDetail {
  id: string;
  status: ConsentStatus;
  signedConsent?: string;
  accounts?: LinkedAccount[];
  createdAt: string;
  updatedAt: string;
}

export interface LinkedAccount {
  fiType: FIType;
  fipId: string;
  fipName: string;
  maskedAccNumber: string;
  accType: string;
  linkRefNumber: string;
}

export interface FIDataRequest {
  consentId: string;
  dateRange: {
    from: string;
    to: string;
  };
}

export interface FIDataResponse {
  sessionId: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  accounts?: AccountData[];
}

export interface AccountData {
  linkRefNumber: string;
  maskedAccNumber: string;
  fiType: FIType;
  profile?: BankProfile;
  summary?: AccountSummary;
  transactions?: BankTransaction[];
}

export interface BankProfile {
  holders: {
    name: string;
    email?: string;
    mobile?: string;
    pan?: string;
  }[];
}

export interface AccountSummary {
  currentBalance: number;
  currency: string;
  type: string;
  branch?: string;
  ifscCode?: string;
  openingDate?: string;
}

export interface BankTransaction {
  txnId: string;
  type: 'DEBIT' | 'CREDIT';
  mode: string;
  amount: number;
  balance: number;
  transactionTimestamp: string;
  valueDate: string;
  narration: string;
  reference?: string;
}

export type FIType =
  | 'DEPOSIT'
  | 'RECURRING_DEPOSIT'
  | 'TERM_DEPOSIT'
  | 'CREDIT_CARD'
  | 'MUTUAL_FUNDS'
  | 'ETF'
  | 'INSURANCE_POLICIES'
  | 'NPS'
  | 'GOVT_SECURITIES';

export type ConsentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'PAUSED';

// ============================================
// FIP (Financial Information Provider) List
// ============================================

export const SUPPORTED_FIPS = [
  { id: 'HDFC-FIP', name: 'HDFC Bank', logo: '/banks/hdfc.png' },
  { id: 'ICICI-FIP', name: 'ICICI Bank', logo: '/banks/icici.png' },
  { id: 'SBI-FIP', name: 'State Bank of India', logo: '/banks/sbi.png' },
  { id: 'AXIS-FIP', name: 'Axis Bank', logo: '/banks/axis.png' },
  { id: 'KOTAK-FIP', name: 'Kotak Mahindra Bank', logo: '/banks/kotak.png' },
  { id: 'YES-FIP', name: 'Yes Bank', logo: '/banks/yes.png' },
  { id: 'IDFC-FIP', name: 'IDFC First Bank', logo: '/banks/idfc.png' },
  { id: 'INDUSIND-FIP', name: 'IndusInd Bank', logo: '/banks/indusind.png' },
  { id: 'PNB-FIP', name: 'Punjab National Bank', logo: '/banks/pnb.png' },
  { id: 'BOB-FIP', name: 'Bank of Baroda', logo: '/banks/bob.png' },
  { id: 'CANARA-FIP', name: 'Canara Bank', logo: '/banks/canara.png' },
  { id: 'UNION-FIP', name: 'Union Bank of India', logo: '/banks/union.png' },
  { id: 'FEDERAL-FIP', name: 'Federal Bank', logo: '/banks/federal.png' },
  { id: 'RBL-FIP', name: 'RBL Bank', logo: '/banks/rbl.png' },
  { id: 'CITI-FIP', name: 'Citibank', logo: '/banks/citi.png' },
] as const;

// ============================================
// API Client
// ============================================

class SetuAAClient {
  private config: SetuConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  /**
   * Initialize the Setu AA client
   */
  initialize(config: SetuConfig) {
    this.config = config;
  }

  /**
   * Get access token (with caching)
   */
  private async getAccessToken(): Promise<string> {
    if (!this.config) {
      throw new Error('Setu AA client not initialized');
    }

    // Return cached token if valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Fetch new token
    const response = await fetch(`${this.config.baseUrl}/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: this.config.clientId,
        secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get Setu access token');
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.tokenExpiry = new Date(Date.now() + (data.expiresIn - 60) * 1000);

    return this.accessToken as string;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    if (!this.config) {
      throw new Error('Setu AA client not initialized');
    }

    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-product-instance-id': this.config.productInstanceId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a consent request
   */
  async createConsent(request: ConsentRequest): Promise<ConsentResponse> {
    const payload = {
      consentDuration: {
        unit: 'MONTH',
        value: 12,
      },
      dataLife: {
        unit: 'MONTH',
        value: 12,
      },
      fetchType: request.fetchType,
      frequency: request.frequency || { unit: 'DAILY', value: 1 },
      fiTypes: request.fiTypes,
      purpose: {
        code: '101',
        refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
        text: request.purpose,
        category: { type: 'Personal Finance' },
      },
      dataRange: request.dataRange,
      redirectUrl: this.config?.redirectUrl || '',
      context: [
        { key: 'customerId', value: request.customerId },
        { key: 'mobileNumber', value: request.mobileNumber },
      ],
    };

    return this.request<ConsentResponse>('/v2/consents', 'POST', payload);
  }

  /**
   * Get consent status
   */
  async getConsent(consentId: string): Promise<ConsentDetail> {
    return this.request<ConsentDetail>(`/v2/consents/${consentId}`);
  }

  /**
   * Revoke a consent
   */
  async revokeConsent(consentId: string): Promise<void> {
    await this.request(`/v2/consents/${consentId}`, 'DELETE');
  }

  /**
   * Create a data fetch session
   */
  async createDataSession(request: FIDataRequest): Promise<FIDataResponse> {
    return this.request<FIDataResponse>('/v2/sessions', 'POST', {
      consentId: request.consentId,
      dataRange: request.dateRange,
      format: 'json',
    });
  }

  /**
   * Get session data (polling)
   */
  async getSessionData(sessionId: string): Promise<FIDataResponse> {
    return this.request<FIDataResponse>(`/v2/sessions/${sessionId}`);
  }

  /**
   * Fetch financial data with polling
   */
  async fetchData(
    consentId: string,
    dateRange: { from: string; to: string },
    onProgress?: (status: string) => void
  ): Promise<AccountData[]> {
    // Create session
    onProgress?.('Creating data fetch session...');
    const session = await this.createDataSession({ consentId, dateRange });

    // Poll for data
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      onProgress?.(`Fetching data (attempt ${attempt + 1}/${maxAttempts})...`);

      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const result = await this.getSessionData(session.sessionId);

      if (result.status === 'READY' && result.accounts) {
        onProgress?.('Data fetched successfully!');
        return result.accounts;
      }

      if (result.status === 'FAILED') {
        throw new Error('Data fetch failed');
      }
    }

    throw new Error('Data fetch timed out');
  }
}

// ============================================
// Transaction Parser
// ============================================

export function parseAATransactions(
  accountData: AccountData[]
): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  balance: number;
  reference?: string;
  accountNumber: string;
  bankName?: string;
}> {
  const transactions: any[] = [];

  for (const account of accountData) {
    if (!account.transactions) continue;

    for (const tx of account.transactions) {
      transactions.push({
        date: tx.transactionTimestamp.split('T')[0],
        description: tx.narration,
        amount: tx.amount,
        type: tx.type === 'CREDIT' ? 'income' : 'expense',
        balance: tx.balance,
        reference: tx.reference || tx.txnId,
        accountNumber: account.maskedAccNumber,
      });
    }
  }

  // Sort by date descending
  return transactions.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// ============================================
// Export Singleton
// ============================================

export const setuAA = new SetuAAClient();

export const setuAAService = {
  client: setuAA,
  initialize: setuAA.initialize.bind(setuAA),
  createConsent: setuAA.createConsent.bind(setuAA),
  getConsent: setuAA.getConsent.bind(setuAA),
  revokeConsent: setuAA.revokeConsent.bind(setuAA),
  fetchData: setuAA.fetchData.bind(setuAA),
  parseTransactions: parseAATransactions,
  SUPPORTED_FIPS,
};
