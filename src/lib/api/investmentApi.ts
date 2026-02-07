/**
 * Investment API
 * Tier-one API wrapper for investment portfolio management
 * Handles mutual funds, stocks, FDs, PPF, NPS, gold, crypto, and more
 */

import { api, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export type InvestmentType =
  | 'MUTUAL_FUND'
  | 'STOCKS'
  | 'FIXED_DEPOSIT'
  | 'PPF'
  | 'NPS'
  | 'GOLD'
  | 'REAL_ESTATE'
  | 'CRYPTO'
  | 'BONDS'
  | 'OTHER';

export type InvestmentTransactionType = 'BUY' | 'SELL' | 'SIP' | 'DIVIDEND' | 'BONUS' | 'SPLIT';

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  symbol: string | null;
  isin: string | null;
  folioNumber: string | null;
  broker: string | null;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  currency: string;
  isTaxSaving: boolean;
  taxSection: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lastUpdatedAt: string;
  // Computed fields from server
  absoluteReturn?: number;
  percentageReturn?: number;
  xirr?: number;
  holdingPeriod?: number;
  isProfit?: boolean;
}

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  type: InvestmentTransactionType;
  quantity: number;
  price: number;
  amount: number;
  fees: number;
  taxes: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateInvestmentDto {
  name: string;
  type: InvestmentType;
  symbol?: string;
  isin?: string;
  folioNumber?: string;
  broker?: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  isTaxSaving?: boolean;
  taxSection?: string;
  notes?: string;
}

export interface UpdateInvestmentDto extends Partial<CreateInvestmentDto> {}

export interface AddInvestmentTransactionDto {
  type: InvestmentTransactionType;
  quantity: number;
  price: number;
  amount: number;
  fees?: number;
  taxes?: number;
  date?: string;
  notes?: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  absoluteReturn: number;
  percentageReturn: number;
  todayChange: number;
  todayChangePercent: number;
  xirr: number | null;
  allocationByType: Array<{
    type: InvestmentType;
    investedAmount: number;
    currentValue: number;
    absoluteReturn: number;
    percentageReturn: number;
    allocation: number;
  }>;
  topPerformers: Investment[];
  topLosers: Investment[];
}

export interface TaxSavingSummary {
  section80C: {
    invested: number;
    limit: number;
    remaining: number;
    investments: Investment[];
  };
  section80CCD: {
    invested: number;
    limit: number;
    remaining: number;
    investments: Investment[];
  };
  totalTaxBenefit: number;
}

export interface InvestmentMarketData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  lastUpdated: string;
}

// =============================================================================
// API Functions
// =============================================================================

export const investmentApi = {
  /**
   * Get all investments
   */
  async getAll(): Promise<Investment[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch investments.');
    }
    return api.get<Investment[]>('/investments');
  },

  /**
   * Get investment by ID
   */
  async getById(id: string): Promise<Investment> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch investment.');
    }
    return api.get<Investment>(`/investments/${id}`);
  },

  /**
   * Create a new investment
   */
  async create(data: CreateInvestmentDto): Promise<Investment> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot create investment.');
    }
    return api.post<Investment>('/investments', data);
  },

  /**
   * Update an investment
   */
  async update(id: string, data: UpdateInvestmentDto): Promise<Investment> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update investment.');
    }
    return api.put<Investment>(`/investments/${id}`, data);
  },

  /**
   * Delete an investment
   */
  async delete(id: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete investment.');
    }
    return api.delete(`/investments/${id}`);
  },

  /**
   * Update current price for an investment
   */
  async updatePrice(id: string, price: number): Promise<Investment> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot update price.');
    }
    return api.patch<Investment>(`/investments/${id}/price`, { currentPrice: price });
  },

  /**
   * Get portfolio summary with returns and allocation
   */
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch portfolio summary.');
    }
    return api.get<PortfolioSummary>('/investments/portfolio/summary');
  },

  /**
   * Get investments by type
   */
  async getByType(type: InvestmentType): Promise<Investment[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch investments.');
    }
    return api.get<Investment[]>(`/investments/type/${type}`);
  },

  /**
   * Add transaction to investment (buy, sell, SIP, dividend, etc.)
   */
  async addTransaction(
    investmentId: string,
    data: AddInvestmentTransactionDto
  ): Promise<InvestmentTransaction> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot add transaction.');
    }
    return api.post<InvestmentTransaction>(
      `/investments/${investmentId}/transactions`,
      data
    );
  },

  /**
   * Get transactions for an investment
   */
  async getTransactions(investmentId: string): Promise<InvestmentTransaction[]> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch transactions.');
    }
    return api.get<InvestmentTransaction[]>(
      `/investments/${investmentId}/transactions`
    );
  },

  /**
   * Delete a transaction
   */
  async deleteTransaction(investmentId: string, transactionId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot delete transaction.');
    }
    return api.delete(`/investments/${investmentId}/transactions/${transactionId}`);
  },

  /**
   * Get tax saving investments summary (80C, 80CCD, etc.)
   */
  async getTaxSavingSummary(): Promise<TaxSavingSummary> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch tax summary.');
    }
    return api.get<TaxSavingSummary>('/investments/tax-saving/summary');
  },

  /**
   * Refresh prices from market data
   */
  async refreshPrices(): Promise<{ updated: number; failed: number }> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot refresh prices.');
    }
    return api.post<{ updated: number; failed: number }>('/investments/refresh-prices', {});
  },

  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<InvestmentMarketData> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch market data.');
    }
    return api.get<InvestmentMarketData>(`/investments/market/${symbol}`);
  },

  /**
   * Search investments (stocks, mutual funds, etc.)
   */
  async search(query: string, type?: InvestmentType): Promise<Array<{
    symbol: string;
    name: string;
    type: InvestmentType;
    exchange?: string;
  }>> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot search investments.');
    }
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    return api.get(`/investments/search?${params.toString()}`);
  },

  /**
   * Get investment performance history
   */
  async getPerformanceHistory(
    investmentId: string,
    period: '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'
  ): Promise<Array<{ date: string; value: number; invested: number }>> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot fetch performance history.');
    }
    return api.get(`/investments/${investmentId}/performance?period=${period}`);
  },

  /**
   * Import investments from broker statement
   */
  async importFromStatement(file: File): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    if (!networkStatus.isOnline()) {
      throw new Error('You are offline. Cannot import statement.');
    }
    return api.upload('/investments/import', file);
  },
};

export default investmentApi;
