/**
 * StatusBadge - Reusable status indicator badge
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';
import { STATUS_COLORS, type StatusType } from '@/lib/constants';

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const statusIcons = {
  good: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
  over: XCircle,
};

const statusLabels = {
  good: 'On Track',
  warning: 'Warning',
  danger: 'At Risk',
  over: 'Over Budget',
};

export const StatusBadge = memo(function StatusBadge({
  status,
  label,
  showIcon = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const Icon = statusIcons[status];
  const colors = STATUS_COLORS[status];
  const displayLabel = label || statusLabels[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        colors.light,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {displayLabel}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;
