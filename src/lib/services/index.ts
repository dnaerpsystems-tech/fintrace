/**
 * Services Barrel Export
 * All tier-one business logic services
 */

// Core services
export * from './loanService';
export * from './securityService';
export * from './seedService';
export * from './dataService';
export * from './bankImportService';
export * from './voiceService';
export * from './ocrService';
export * from './unifiedSyncService';

// Namespace exports for services with conflicting function names
// This avoids the syncPendingChanges collision
import * as accountServiceModule from './accountService';
import * as transactionServiceModule from './transactionService';
import * as budgetServiceModule from './budgetService';
import * as goalServiceModule from './goalService';
import * as investmentServiceModule from './investmentService';
import * as insightsServiceModule from './insightsService';

export const accountService = accountServiceModule;
export const transactionService = transactionServiceModule;
export const budgetService = budgetServiceModule;
export const goalService = goalServiceModule;
export const investmentService = investmentServiceModule;
export const insightsService = insightsServiceModule;

// Re-export commonly used functions directly
export { getAccountSummary, getAccount } from './accountService';
export { getTransactionStats, getRecentTransactions, getTransactions } from './transactionService';
export { getBudgetAlerts } from './budgetService';
export { getGoalWithProgress, addContribution, getContributions } from './goalService';
export { getInvestmentsByType, getInvestmentTransactions } from './investmentService';
export { getInsightsSummary } from './insightsService';

// Export service - exclude ExportOptions to avoid conflict with dataService
export {
  exportTransactionsToPDF,
  exportTransactionsToExcel,
  exportReportToPDF,
  exportReportToExcel,
  formatIndianCurrency,
  exportTaxReportToPDF,
  exportTaxReportToExcel,
  type TaxReportData,
  type TransactionExportData,
  type ReportExportData
} from './exportService';

// IFSC & AA services - using namespace to avoid conflicts
import * as ifscServiceModule from './ifscService';
import * as setuAAServiceModule from './setuAAService';
import * as upiCategorizationServiceModule from './upiCategorizationService';
import * as creditScoreServiceModule from './creditScoreService';

export const ifscService = ifscServiceModule;
export const setuAAService = setuAAServiceModule;
export const upiCategorization = upiCategorizationServiceModule;
export const creditScore = creditScoreServiceModule;

// Re-export commonly used functions
export { lookupIFSC, getBankName, BANK_CODES } from './ifscService';
export { categorizeUPITransaction, detectUPIApp } from './upiCategorizationService';
export { calculateCreditScore, generateMockFinancialData } from './creditScoreService';
export { pushNotificationService } from './pushNotificationService';
export { currencyService, CURRENCIES, convertCurrency, formatWithCurrency } from './currencyService';
export { themeService, ACCENT_COLORS } from './themeService';
export { portfolioService } from './portfolioService';
export { pwaInstallService } from './pwaInstallService';
