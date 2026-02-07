/**
 * ProgressBar - Reusable memoized progress indicator
 */

import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, type StatusType } from '@/lib/constants';

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  status?: StatusType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  status = 'good',
  showLabel = false,
  size = 'md',
  className,
  animate = true,
}: ProgressBarProps) {
  const percentage = useMemo(() => {
    const pct = (value / max) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }, [value, max]);

  const statusColor = STATUS_COLORS[status];

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">{value.toFixed(0)}%</span>
          <span className={statusColor.text}>{status}</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full',
            statusColor.bg,
            animate && 'transition-all duration-500 ease-out'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
