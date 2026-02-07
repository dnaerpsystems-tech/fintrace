/**
 * Skeleton - Loading placeholder components
 * Tier-One Standards: Comprehensive loading states for all page types
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
}

export const Skeleton = memo(function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  );
});

Skeleton.displayName = 'Skeleton';

// ==================== PRESET SKELETONS ====================

export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
});

SkeletonCard.displayName = 'SkeletonCard';

export const SkeletonList = memo(function SkeletonList({ count = 3 }: { count?: number }) {
  const items = Array.from({ length: count }, (_, index) => `skeleton-item-${index}`);

  return (
    <div className="space-y-3">
      {items.map((id) => (
        <SkeletonCard key={id} />
      ))}
    </div>
  );
});

SkeletonList.displayName = 'SkeletonList';

export const SkeletonSummaryCard = memo(function SkeletonSummaryCard() {
  return (
    <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl p-5 animate-pulse">
      <Skeleton className="h-4 w-24 bg-white/30 mb-2" />
      <Skeleton className="h-8 w-40 bg-white/30 mb-4" />
      <div className="flex gap-6">
        <div>
          <Skeleton className="h-3 w-16 bg-white/30 mb-1" />
          <Skeleton className="h-5 w-24 bg-white/30" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 bg-white/30 mb-1" />
          <Skeleton className="h-5 w-24 bg-white/30" />
        </div>
      </div>
    </div>
  );
});

SkeletonSummaryCard.displayName = 'SkeletonSummaryCard';

export const SkeletonPage = memo(function SkeletonPage() {
  return (
    <div className="p-4 space-y-4">
      <SkeletonSummaryCard />
      <SkeletonList count={5} />
    </div>
  );
});

SkeletonPage.displayName = 'SkeletonPage';

// ==================== PAGE-SPECIFIC SKELETONS ====================

/**
 * Home Page Skeleton - Balance card + quick actions + transactions
 */
export const SkeletonHomePage = memo(function SkeletonHomePage() {
  return (
    <div className="px-4 space-y-6">
      {/* Balance Card */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-gray-300 to-gray-400 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24 bg-white/30" />
          <Skeleton className="h-8 w-8 rounded-full bg-white/20" />
        </div>
        <Skeleton className="h-10 w-48 bg-white/30 mb-4" />
        <div className="flex items-center gap-4">
          <div>
            <Skeleton className="h-3 w-12 bg-white/30 mb-1" />
            <Skeleton className="h-6 w-20 bg-white/30" />
          </div>
          <div className="w-px h-8 bg-white/30" />
          <div>
            <Skeleton className="h-3 w-12 bg-white/30 mb-1" />
            <Skeleton className="h-6 w-20 bg-white/30" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <Skeleton className="h-5 w-28 mb-3" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-3 flex flex-col items-center gap-2">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="bg-white rounded-xl divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

SkeletonHomePage.displayName = 'SkeletonHomePage';

/**
 * Transactions Page Skeleton
 */
export const SkeletonTransactionsPage = memo(function SkeletonTransactionsPage() {
  return (
    <div className="px-4 space-y-4">
      {/* Search Bar */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Transaction Groups */}
      {[1, 2].map((group) => (
        <div key={group}>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="bg-white rounded-xl divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-36 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

SkeletonTransactionsPage.displayName = 'SkeletonTransactionsPage';

/**
 * Accounts Page Skeleton
 */
export const SkeletonAccountsPage = memo(function SkeletonAccountsPage() {
  return (
    <div className="px-4 space-y-6">
      {/* Net Worth Card */}
      <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl p-5 animate-pulse">
        <Skeleton className="h-4 w-20 bg-white/30 mb-2" />
        <Skeleton className="h-8 w-36 bg-white/30 mb-4" />
        <div className="flex gap-4">
          <div className="flex-1">
            <Skeleton className="h-3 w-16 bg-white/30 mb-1" />
            <Skeleton className="h-5 w-24 bg-white/30" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-3 w-16 bg-white/30 mb-1" />
            <Skeleton className="h-5 w-24 bg-white/30" />
          </div>
        </div>
      </div>

      {/* Account List */}
      <div>
        <Skeleton className="h-4 w-20 mb-3" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

SkeletonAccountsPage.displayName = 'SkeletonAccountsPage';

/**
 * Budgets Page Skeleton
 */
export const SkeletonBudgetsPage = memo(function SkeletonBudgetsPage() {
  return (
    <div className="px-4 space-y-4">
      {/* Period Selector */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-64 rounded-lg" />
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Budget Cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
});

SkeletonBudgetsPage.displayName = 'SkeletonBudgetsPage';

/**
 * Goals Page Skeleton
 */
export const SkeletonGoalsPage = memo(function SkeletonGoalsPage() {
  return (
    <div className="px-4 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Goal Cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full mb-2" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

SkeletonGoalsPage.displayName = 'SkeletonGoalsPage';

/**
 * Loans Page Skeleton
 */
export const SkeletonLoansPage = memo(function SkeletonLoansPage() {
  return (
    <div className="px-4 space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl p-5 animate-pulse">
        <Skeleton className="h-4 w-28 bg-white/30 mb-2" />
        <Skeleton className="h-8 w-40 bg-white/30 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16 bg-white/30 mb-1" />
              <Skeleton className="h-5 w-20 bg-white/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Loan Cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4">
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-5 w-28 mb-1" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
});

SkeletonLoansPage.displayName = 'SkeletonLoansPage';

/**
 * Invest Page Skeleton
 */
export const SkeletonInvestPage = memo(function SkeletonInvestPage() {
  return (
    <div className="px-4 space-y-6">
      {/* Portfolio Summary */}
      <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl p-5 animate-pulse">
        <Skeleton className="h-4 w-32 bg-white/30 mb-2" />
        <Skeleton className="h-10 w-48 bg-white/30 mb-2" />
        <Skeleton className="h-6 w-24 bg-white/30 mb-4" />
        <div className="flex gap-4">
          <div className="flex-1">
            <Skeleton className="h-3 w-16 bg-white/30 mb-1" />
            <Skeleton className="h-5 w-24 bg-white/30" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-3 w-16 bg-white/30 mb-1" />
            <Skeleton className="h-5 w-20 bg-white/30" />
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      <div className="bg-white rounded-xl p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="flex items-center justify-center">
          <Skeleton className="w-40 h-40 rounded-full" />
        </div>
      </div>

      {/* Investment Types */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl p-3 flex flex-col items-center">
            <Skeleton className="w-12 h-12 rounded-xl mb-2" />
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
});

SkeletonInvestPage.displayName = 'SkeletonInvestPage';

/**
 * Stats Page Skeleton
 */
export const SkeletonStatsPage = memo(function SkeletonStatsPage() {
  return (
    <div className="px-4 space-y-6">
      {/* Period Selector */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-72 rounded-lg" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="bg-white rounded-xl p-4">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>

      <div className="bg-white rounded-xl p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
});

SkeletonStatsPage.displayName = 'SkeletonStatsPage';

/**
 * Notifications Page Skeleton
 */
export const SkeletonNotificationsPage = memo(function SkeletonNotificationsPage() {
  return (
    <div>
      {/* Actions Bar */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* Notification List */}
      <div className="divide-y divide-gray-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="w-7 h-7 rounded-full" />
              <Skeleton className="w-7 h-7 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

SkeletonNotificationsPage.displayName = 'SkeletonNotificationsPage';

/**
 * Generic inline loading spinner
 */
export const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  className
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn(
        'animate-spin rounded-full border-2 border-gray-200 border-t-emerald-500',
        sizes[size]
      )} />
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Full page loading state
 */
export const FullPageLoading = memo(function FullPageLoading({
  message = 'Loading...'
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <LoadingSpinner size="lg" className="mb-4" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
});

FullPageLoading.displayName = 'FullPageLoading';

export default Skeleton;
