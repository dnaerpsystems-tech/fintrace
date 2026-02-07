/**
 * AmountDisplay - Reusable memoized currency display component
 * Optimized for performance with React.memo
 */

import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatINR, type FormatOptions } from '@/lib/formatters/currency';
import { useShowBalances } from '@/stores/appStore';

export interface AmountDisplayProps {
  amount: number; // in paise
  className?: string;
  showSign?: boolean;
  compact?: boolean;
  colorize?: boolean; // green for positive, red for negative
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  hideIfZero?: boolean;
  respectVisibility?: boolean; // respect global balance visibility setting
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
};

export const AmountDisplay = memo(function AmountDisplay({
  amount,
  className,
  showSign = false,
  compact = false,
  colorize = false,
  size = 'md',
  hideIfZero = false,
  respectVisibility = false,
}: AmountDisplayProps) {
  const showBalances = useShowBalances();

  const formattedAmount = useMemo(() => {
    const options: FormatOptions = {
      showSymbol: true,
      showSign,
      compact,
    };
    return formatINR(amount, options);
  }, [amount, showSign, compact]);

  const colorClass = useMemo(() => {
    if (!colorize) return '';
    if (amount > 0) return 'text-emerald-500';
    if (amount < 0) return 'text-red-500';
    return 'text-gray-500';
  }, [colorize, amount]);

  if (hideIfZero && amount === 0) {
    return null;
  }

  if (respectVisibility && !showBalances) {
    return (
      <span className={cn(sizeClasses[size], className)}>
        ₹ ••••••
      </span>
    );
  }

  return (
    <span className={cn(sizeClasses[size], colorClass, className)}>
      {formattedAmount}
    </span>
  );
});

AmountDisplay.displayName = 'AmountDisplay';

export default AmountDisplay;
