/**
 * App.tsx - Main Application Entry
 * Optimized with:
 * - React.lazy for code splitting
 * - Suspense for loading states
 * - ErrorBoundary for error handling
 * - AuthProvider for authentication
 * - ProtectedRoute for route protection
 * - Security wrapper with PIN lock
 */

import { Suspense, lazy, useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SkeletonPage } from "@/components/shared/Skeleton";
import { AuthProvider, ProtectedRoute } from "@/components/auth";
import { shouldLockApp, updateLastActivity, getSecurityState } from "@/lib/services/securityService";
import { useAutoSync } from "@/hooks/useAutoSync";
import { UpdatePrompt, initUpdateListener } from "@/components/pwa/UpdatePrompt";

// ==================== LAZY LOADED PAGES ====================
// Code splitting for better initial load performance

// Auth Pages
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));

// Main Pages
const HomePage = lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })));
const StatsPage = lazy(() => import("@/pages/StatsPage").then(m => ({ default: m.StatsPage })));
const InvestPage = lazy(() => import("@/pages/InvestPage").then(m => ({ default: m.InvestPage })));
const MorePage = lazy(() => import("@/pages/MorePage").then(m => ({ default: m.MorePage })));
const AddTransactionPage = lazy(() => import("@/pages/AddTransactionPage").then(m => ({ default: m.AddTransactionPage })));
const TransactionsPage = lazy(() => import("@/pages/TransactionsPage").then(m => ({ default: m.TransactionsPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const LoansPage = lazy(() => import("@/pages/LoansPage"));
const AddLoanPage = lazy(() => import("@/pages/AddLoanPage"));
const LoanDetailPage = lazy(() => import("@/pages/LoanDetailPage"));
const BudgetsPage = lazy(() => import("@/pages/BudgetsPage"));
const GoalsPage = lazy(() => import("@/pages/GoalsPage"));
const AccountsPage = lazy(() => import("@/pages/AccountsPage"));
const EMICalculatorPage = lazy(() => import("@/pages/EMICalculatorPage"));
const SecuritySettingsPage = lazy(() => import("@/pages/SecuritySettingsPage"));
const PinLockPage = lazy(() => import("@/pages/PinLockPage"));
const AddAccountPage = lazy(() => import("@/pages/AddAccountPage"));
const AddGoalPage = lazy(() => import("@/pages/AddGoalPage"));
const AddBudgetPage = lazy(() => import("@/pages/AddBudgetPage"));
const PrepaymentCalculatorPage = lazy(() => import("@/pages/PrepaymentCalculatorPage"));
const DataManagementPage = lazy(() => import("@/pages/DataManagementPage"));
const AddInvestmentPage = lazy(() => import("@/pages/AddInvestmentPage"));
const TransactionDetailPage = lazy(() => import("@/pages/TransactionDetailPage"));
const RecurringTransactionsPage = lazy(() => import("@/pages/RecurringTransactionsPage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const GoalDetailPage = lazy(() => import("@/pages/GoalDetailPage"));
const BankImportPage = lazy(() => import("@/pages/BankImportPage"));
const InsightsPage = lazy(() => import("@/pages/InsightsPage"));
const VoiceEntryPage = lazy(() => import("@/pages/VoiceEntryPage"));
const ReceiptScanPage = lazy(() => import("@/pages/ReceiptScanPage"));
const FamilyPage = lazy(() => import("@/pages/FamilyPage"));
const AcceptInvitePage = lazy(() => import("@/pages/AcceptInvitePage"));
const FamilySettingsPage = lazy(() => import("@/pages/FamilySettingsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
// New Pages
const BudgetDetailPage = lazy(() => import("@/pages/BudgetDetailPage"));
const AccountDetailPage = lazy(() => import("@/pages/AccountDetailPage"));
const TaxSummaryPage = lazy(() => import("@/pages/TaxSummaryPage"));
const NetWorthPage = lazy(() => import("@/pages/NetWorthPage"));
const Form26ASPage = lazy(() => import("@/pages/Form26ASPage"));
const CreditScorePage = lazy(() => import("@/pages/CreditScorePage"));
const BankLinkingPage = lazy(() => import("@/pages/BankLinkingPage"));
const NotificationSettingsPage = lazy(() => import("@/pages/NotificationSettingsPage"));
const GSTInvoicePage = lazy(() => import("@/pages/GSTInvoicePage"));
const AnalyticsDashboardPage = lazy(() => import("@/pages/AnalyticsDashboardPage"));
const PortfolioPage = lazy(() => import("@/pages/PortfolioPage"));
const ThemeSettingsPage = lazy(() => import("@/pages/ThemeSettingsPage"));

// ==================== LOADING FALLBACK ====================
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SkeletonPage />
    </div>
  );
}

// ==================== SECURITY WRAPPER ====================
function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check lock status on mount
  useEffect(() => {
    const checkLock = () => {
      const state = getSecurityState();
      if (state.isPinEnabled) {
        setIsLocked(shouldLockApp());
      }
      setIsChecking(false);
    };

    checkLock();
  }, []);

  // Update activity on user interaction
  useEffect(() => {
    const handleActivity = () => {
      if (!isLocked) {
        updateLastActivity();
      }
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isLocked]);

  // Check lock status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLocked) {
        const state = getSecurityState();
        if (state.isPinEnabled && shouldLockApp()) {
          setIsLocked(true);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isLocked]);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  if (isChecking) {
    return <PageLoader />;
  }

  if (isLocked) {
    return (
      <Suspense fallback={<PageLoader />}>
        <PinLockPage onUnlock={handleUnlock} />
      </Suspense>
    );
  }

  return <>{children}</>;
}

// ==================== AUTO SYNC WRAPPER ====================
function AutoSyncWrapper({ children }: { children: React.ReactNode }) {
  // Auto-sync pending changes every 5 minutes
  useAutoSync({
    interval: 5 * 60 * 1000, // 5 minutes
    syncOnFocus: true,
    syncOnOnline: true,
    onSyncComplete: (result) => {
      if (result.synced > 0) {
        console.log(`Auto-sync: ${result.synced} items synced`);
      }
    },
    onSyncError: (error) => {
      console.error('Auto-sync error:', error);
    },
  });

  return <>{children}</>;
}

// ==================== PROTECTED ROUTES WRAPPER ====================
function ProtectedApp() {
  return (
    <ProtectedRoute>
      <SecurityWrapper>
        <AutoSyncWrapper>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Main tabs */}
            <Route path="/" element={
              <ErrorBoundary>
                <HomePage />
              </ErrorBoundary>
            } />
            <Route path="/stats" element={
              <ErrorBoundary>
                <StatsPage />
              </ErrorBoundary>
            } />
            <Route path="/add" element={
              <ErrorBoundary>
                <AddTransactionPage />
              </ErrorBoundary>
            } />
            <Route path="/invest" element={
              <ErrorBoundary>
                <InvestPage />
              </ErrorBoundary>
            } />
            <Route path="/invest/add" element={
              <ErrorBoundary>
                <AddInvestmentPage />
              </ErrorBoundary>
            } />
            <Route path="/more" element={
              <ErrorBoundary>
                <MorePage />
              </ErrorBoundary>
            } />

            {/* Transactions */}
            <Route path="/transactions" element={
              <ErrorBoundary>
                <TransactionsPage />
              </ErrorBoundary>
            } />
            <Route path="/transactions/:id" element={
              <ErrorBoundary>
                <TransactionDetailPage />
              </ErrorBoundary>
            } />

            {/* Loans */}
            <Route path="/loans" element={
              <ErrorBoundary>
                <LoansPage />
              </ErrorBoundary>
            } />
            <Route path="/loans/add" element={
              <ErrorBoundary>
                <AddLoanPage />
              </ErrorBoundary>
            } />
            <Route path="/loans/:id" element={
              <ErrorBoundary>
                <LoanDetailPage />
              </ErrorBoundary>
            } />
            <Route path="/loans/:id/prepay" element={
              <ErrorBoundary>
                <PrepaymentCalculatorPage />
              </ErrorBoundary>
            } />
            <Route path="/prepay-calculator" element={
              <ErrorBoundary>
                <PrepaymentCalculatorPage />
              </ErrorBoundary>
            } />

            {/* Budgets & Goals */}
            <Route path="/budgets" element={
              <ErrorBoundary>
                <BudgetsPage />
              </ErrorBoundary>
            } />
            <Route path="/budgets/add" element={
              <ErrorBoundary>
                <AddBudgetPage />
              </ErrorBoundary>
            } />
            <Route path="/budgets/:id" element={
              <ErrorBoundary>
                <BudgetDetailPage />
              </ErrorBoundary>
            } />
            <Route path="/goals" element={
              <ErrorBoundary>
                <GoalsPage />
              </ErrorBoundary>
            } />
            <Route path="/goals/add" element={
              <ErrorBoundary>
                <AddGoalPage />
              </ErrorBoundary>
            } />
            <Route path="/goals/:id" element={
              <ErrorBoundary>
                <GoalDetailPage />
              </ErrorBoundary>
            } />

            {/* Accounts */}
            <Route path="/accounts" element={
              <ErrorBoundary>
                <AccountsPage />
              </ErrorBoundary>
            } />
            <Route path="/accounts/add" element={
              <ErrorBoundary>
                <AddAccountPage />
              </ErrorBoundary>
            } />
            <Route path="/accounts/:id" element={
              <ErrorBoundary>
                <AccountDetailPage />
              </ErrorBoundary>
            } />

            {/* Tools */}
            <Route path="/emi-calculator" element={
              <ErrorBoundary>
                <EMICalculatorPage />
              </ErrorBoundary>
            } />
            <Route path="/recurring" element={
              <ErrorBoundary>
                <RecurringTransactionsPage />
              </ErrorBoundary>
            } />
            <Route path="/categories" element={
              <ErrorBoundary>
                <CategoriesPage />
              </ErrorBoundary>
            } />

            {/* Data Management */}
            <Route path="/data-management" element={
              <ErrorBoundary>
                <DataManagementPage />
              </ErrorBoundary>
            } />
            <Route path="/tax-summary" element={
              <ErrorBoundary>
                <TaxSummaryPage />
              </ErrorBoundary>
            } />
            <Route path="/networth" element={
              <ErrorBoundary>
                <NetWorthPage />
              </ErrorBoundary>
            } />
            <Route path="/form-26as" element={
              <ErrorBoundary>
                <Form26ASPage />
              </ErrorBoundary>
            } />
            <Route path="/credit-score" element={
              <ErrorBoundary>
                <CreditScorePage />
              </ErrorBoundary>
            } />
            <Route path="/bank-linking" element={
              <ErrorBoundary>
                <BankLinkingPage />
              </ErrorBoundary>
            } />
            <Route path="/gst-invoices" element={
              <ErrorBoundary>
                <GSTInvoicePage />
              </ErrorBoundary>
            } />
            <Route path="/notification-settings" element={
              <ErrorBoundary>
                <NotificationSettingsPage />
              </ErrorBoundary>
            } />
            <Route path="/analytics" element={
              <ErrorBoundary>
                <AnalyticsDashboardPage />
              </ErrorBoundary>
            } />
            <Route path="/portfolio" element={
              <ErrorBoundary>
                <PortfolioPage />
              </ErrorBoundary>
            } />
            <Route path="/theme" element={
              <ErrorBoundary>
                <ThemeSettingsPage />
              </ErrorBoundary>
            } />
            <Route path="/import-statement" element={
              <ErrorBoundary>
                <BankImportPage />
              </ErrorBoundary>
            } />
            <Route path="/insights" element={
              <ErrorBoundary>
                <InsightsPage />
              </ErrorBoundary>
            } />
            <Route path="/voice-entry" element={
              <ErrorBoundary>
                <VoiceEntryPage />
              </ErrorBoundary>
            } />
            <Route path="/scan-receipt" element={
              <ErrorBoundary>
                <ReceiptScanPage />
              </ErrorBoundary>
            } />

            {/* Family */}
            <Route path="/family" element={
              <ErrorBoundary>
                <FamilyPage />
              </ErrorBoundary>
            } />
            <Route path="/family/settings" element={
              <ErrorBoundary>
                <FamilySettingsPage />
              </ErrorBoundary>
            } />

            {/* Notifications */}
            <Route path="/notifications" element={
              <ErrorBoundary>
                <NotificationsPage />
              </ErrorBoundary>
            } />

            {/* Settings */}
            <Route path="/settings" element={
              <ErrorBoundary>
                <SettingsPage />
              </ErrorBoundary>
            } />
            <Route path="/settings/notifications" element={
              <ErrorBoundary>
                <SettingsPage />
              </ErrorBoundary>
            } />
            <Route path="/settings/security" element={
              <ErrorBoundary>
                <SecuritySettingsPage />
              </ErrorBoundary>
            } />
            <Route path="/settings/appearance" element={
              <ErrorBoundary>
                <SettingsPage />
              </ErrorBoundary>
            } />
          </Route>
        </Routes>
        </AutoSyncWrapper>
      </SecurityWrapper>
    </ProtectedRoute>
  );
}

// ==================== APP COMPONENT ====================
function App() {
  // Initialize update listener on mount
  useEffect(() => {
    initUpdateListener();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/invite/accept" element={<AcceptInvitePage />} />
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              } />

              {/* Protected App Routes */}
              <Route path="/*" element={<ProtectedApp />} />
            </Routes>
          </Suspense>
          {/* PWA Update Prompt */}
          <UpdatePrompt />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
