/**
 * Investment Portfolio Tracking Service
 * Tracks investments with real-time NAV updates
 */

// ============================================
// Types
// ============================================

export interface MutualFund {
  schemeCode: string;
  schemeName: string;
  fundHouse: string;
  category: string;
  nav: number;
  previousNav: number;
  navDate: string;
  change: number;
  changePercent: number;
}

export interface StockHolding {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  value: number;
  gain: number;
  gainPercent: number;
}

export interface PortfolioHolding {
  id: string;
  type: 'mutual_fund' | 'stock' | 'etf' | 'gold' | 'fd' | 'ppf' | 'nps';
  name: string;
  symbol?: string;
  schemeCode?: string;
  quantity: number;
  avgCost: number;
  currentValue: number;
  investedValue: number;
  gain: number;
  gainPercent: number;
  lastUpdated: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalGain: number;
  gainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: PortfolioHolding[];
  assetAllocation: { type: string; value: number; percentage: number }[];
}

// ============================================
// Mock NAV Data (In production, use MF API)
// ============================================

const MOCK_MUTUAL_FUNDS: Record<string, MutualFund> = {
  '119551': {
    schemeCode: '119551',
    schemeName: 'Axis Bluechip Fund - Direct Growth',
    fundHouse: 'Axis Mutual Fund',
    category: 'Large Cap',
    nav: 52.34,
    previousNav: 51.89,
    navDate: '2026-02-06',
    change: 0.45,
    changePercent: 0.87,
  },
  '120503': {
    schemeCode: '120503',
    schemeName: 'Parag Parikh Flexi Cap Fund - Direct Growth',
    fundHouse: 'PPFAS Mutual Fund',
    category: 'Flexi Cap',
    nav: 68.92,
    previousNav: 68.45,
    navDate: '2026-02-06',
    change: 0.47,
    changePercent: 0.69,
  },
  '122639': {
    schemeCode: '122639',
    schemeName: 'Mirae Asset Large Cap Fund - Direct Growth',
    fundHouse: 'Mirae Asset MF',
    category: 'Large Cap',
    nav: 95.67,
    previousNav: 94.82,
    navDate: '2026-02-06',
    change: 0.85,
    changePercent: 0.90,
  },
  '118989': {
    schemeCode: '118989',
    schemeName: 'SBI Small Cap Fund - Direct Growth',
    fundHouse: 'SBI Mutual Fund',
    category: 'Small Cap',
    nav: 142.56,
    previousNav: 141.23,
    navDate: '2026-02-06',
    change: 1.33,
    changePercent: 0.94,
  },
  '120716': {
    schemeCode: '120716',
    schemeName: 'UTI Nifty 50 Index Fund - Direct Growth',
    fundHouse: 'UTI Mutual Fund',
    category: 'Index Fund',
    nav: 156.78,
    previousNav: 155.92,
    navDate: '2026-02-06',
    change: 0.86,
    changePercent: 0.55,
  },
};

const MOCK_STOCKS: Record<string, StockHolding> = {
  'RELIANCE': {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    exchange: 'NSE',
    quantity: 0,
    avgPrice: 0,
    currentPrice: 2456.75,
    previousClose: 2442.30,
    change: 14.45,
    changePercent: 0.59,
    value: 0,
    gain: 0,
    gainPercent: 0,
  },
  'TCS': {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    exchange: 'NSE',
    quantity: 0,
    avgPrice: 0,
    currentPrice: 3845.20,
    previousClose: 3812.55,
    change: 32.65,
    changePercent: 0.86,
    value: 0,
    gain: 0,
    gainPercent: 0,
  },
  'INFY': {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    exchange: 'NSE',
    quantity: 0,
    avgPrice: 0,
    currentPrice: 1567.80,
    previousClose: 1558.45,
    change: 9.35,
    changePercent: 0.60,
    value: 0,
    gain: 0,
    gainPercent: 0,
  },
  'HDFCBANK': {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    exchange: 'NSE',
    quantity: 0,
    avgPrice: 0,
    currentPrice: 1678.90,
    previousClose: 1665.20,
    change: 13.70,
    changePercent: 0.82,
    value: 0,
    gain: 0,
    gainPercent: 0,
  },
  'ICICIBANK': {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    exchange: 'NSE',
    quantity: 0,
    avgPrice: 0,
    currentPrice: 1089.45,
    previousClose: 1082.30,
    change: 7.15,
    changePercent: 0.66,
    value: 0,
    gain: 0,
    gainPercent: 0,
  },
};

// ============================================
// Mock User Portfolio
// ============================================

const MOCK_PORTFOLIO: PortfolioHolding[] = [
  {
    id: '1',
    type: 'mutual_fund',
    name: 'Axis Bluechip Fund - Direct Growth',
    schemeCode: '119551',
    quantity: 1500,
    avgCost: 45.50,
    currentValue: 78510,
    investedValue: 68250,
    gain: 10260,
    gainPercent: 15.03,
    lastUpdated: '2026-02-07T10:00:00Z',
  },
  {
    id: '2',
    type: 'mutual_fund',
    name: 'Parag Parikh Flexi Cap Fund - Direct Growth',
    schemeCode: '120503',
    quantity: 800,
    avgCost: 55.00,
    currentValue: 55136,
    investedValue: 44000,
    gain: 11136,
    gainPercent: 25.31,
    lastUpdated: '2026-02-07T10:00:00Z',
  },
  {
    id: '3',
    type: 'stock',
    name: 'Reliance Industries Ltd',
    symbol: 'RELIANCE',
    quantity: 25,
    avgCost: 2200,
    currentValue: 61418.75,
    investedValue: 55000,
    gain: 6418.75,
    gainPercent: 11.67,
    lastUpdated: '2026-02-07T10:00:00Z',
  },
  {
    id: '4',
    type: 'stock',
    name: 'TCS',
    symbol: 'TCS',
    quantity: 10,
    avgCost: 3500,
    currentValue: 38452,
    investedValue: 35000,
    gain: 3452,
    gainPercent: 9.86,
    lastUpdated: '2026-02-07T10:00:00Z',
  },
  {
    id: '5',
    type: 'gold',
    name: 'Sovereign Gold Bond 2024-II',
    quantity: 5,
    avgCost: 5400,
    currentValue: 32500,
    investedValue: 27000,
    gain: 5500,
    gainPercent: 20.37,
    lastUpdated: '2026-02-07T10:00:00Z',
  },
  {
    id: '6',
    type: 'ppf',
    name: 'Public Provident Fund',
    quantity: 1,
    avgCost: 150000,
    currentValue: 168750,
    investedValue: 150000,
    gain: 18750,
    gainPercent: 12.50,
    lastUpdated: '2026-02-07T10:00:00Z',
  },
];

// ============================================
// API Functions
// ============================================

/**
 * Fetch mutual fund NAV
 */
export async function fetchMutualFundNAV(schemeCode: string): Promise<MutualFund | null> {
  // In production, call actual API:
  // const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);

  // For demo, return mock data
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_MUTUAL_FUNDS[schemeCode] || null;
}

/**
 * Fetch stock price
 */
export async function fetchStockPrice(symbol: string): Promise<StockHolding | null> {
  // In production, call actual API (NSE/BSE or third-party)

  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_STOCKS[symbol] || null;
}

/**
 * Get portfolio summary
 */
export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  // Update holdings with latest prices
  const updatedHoldings = await updateHoldingsWithLatestPrices(MOCK_PORTFOLIO);

  const totalInvested = updatedHoldings.reduce((sum, h) => sum + h.investedValue, 0);
  const currentValue = updatedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGain = currentValue - totalInvested;
  const gainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Calculate day change (mock)
  const dayChange = currentValue * 0.008; // ~0.8% change
  const dayChangePercent = 0.8;

  // Calculate asset allocation
  const allocationMap: Record<string, number> = {};
  for (const holding of updatedHoldings) {
    allocationMap[holding.type] = (allocationMap[holding.type] || 0) + holding.currentValue;
  }

  const assetAllocation = Object.entries(allocationMap).map(([type, value]) => ({
    type,
    value,
    percentage: (value / currentValue) * 100,
  }));

  return {
    totalInvested,
    currentValue,
    totalGain,
    gainPercent,
    dayChange,
    dayChangePercent,
    holdings: updatedHoldings,
    assetAllocation,
  };
}

/**
 * Update holdings with latest prices
 */
async function updateHoldingsWithLatestPrices(holdings: PortfolioHolding[]): Promise<PortfolioHolding[]> {
  const updated: PortfolioHolding[] = [];

  for (const holding of holdings) {
    let currentPrice: number | null = null;

    if (holding.type === 'mutual_fund' && holding.schemeCode) {
      const navData = await fetchMutualFundNAV(holding.schemeCode);
      if (navData) {
        currentPrice = navData.nav;
      }
    } else if (holding.type === 'stock' && holding.symbol) {
      const stockData = await fetchStockPrice(holding.symbol);
      if (stockData) {
        currentPrice = stockData.currentPrice;
      }
    }

    if (currentPrice) {
      const currentValue = holding.quantity * currentPrice;
      const gain = currentValue - holding.investedValue;
      const gainPercent = (gain / holding.investedValue) * 100;

      updated.push({
        ...holding,
        currentValue,
        gain,
        gainPercent,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      updated.push(holding);
    }
  }

  return updated;
}

/**
 * Search mutual funds
 */
export async function searchMutualFunds(query: string): Promise<MutualFund[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const results = Object.values(MOCK_MUTUAL_FUNDS).filter(
    fund => fund.schemeName.toLowerCase().includes(query.toLowerCase()) ||
            fund.fundHouse.toLowerCase().includes(query.toLowerCase())
  );

  return results;
}

/**
 * Search stocks
 */
export async function searchStocks(query: string): Promise<StockHolding[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const results = Object.values(MOCK_STOCKS).filter(
    stock => stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
             stock.name.toLowerCase().includes(query.toLowerCase())
  );

  return results;
}

/**
 * Get top performing holdings
 */
export function getTopPerformers(holdings: PortfolioHolding[], count = 5): PortfolioHolding[] {
  return [...holdings]
    .sort((a, b) => b.gainPercent - a.gainPercent)
    .slice(0, count);
}

/**
 * Get worst performing holdings
 */
export function getWorstPerformers(holdings: PortfolioHolding[], count = 5): PortfolioHolding[] {
  return [...holdings]
    .sort((a, b) => a.gainPercent - b.gainPercent)
    .slice(0, count);
}

/**
 * Calculate XIRR (simplified)
 */
export function calculateXIRR(
  cashFlows: { date: Date; amount: number }[]
): number {
  // Simplified XIRR calculation
  // In production, use a proper XIRR library

  if (cashFlows.length < 2) return 0;

  const firstDate = cashFlows[0].date;
  const lastDate = cashFlows[cashFlows.length - 1].date;
  const years = (lastDate.getTime() - firstDate.getTime()) / (365 * 24 * 60 * 60 * 1000);

  if (years <= 0) return 0;

  const totalInvested = cashFlows
    .filter(cf => cf.amount < 0)
    .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

  const currentValue = cashFlows
    .filter(cf => cf.amount > 0)
    .reduce((sum, cf) => sum + cf.amount, 0);

  if (totalInvested === 0) return 0;

  // Simple CAGR approximation
  const cagr = (Math.pow(currentValue / totalInvested, 1 / years) - 1) * 100;
  return Math.round(cagr * 100) / 100;
}

// ============================================
// Export Service
// ============================================

export const portfolioService = {
  fetchMutualFundNAV,
  fetchStockPrice,
  getPortfolioSummary,
  searchMutualFunds,
  searchStocks,
  getTopPerformers,
  getWorstPerformers,
  calculateXIRR,
  MOCK_MUTUAL_FUNDS,
  MOCK_STOCKS,
};
