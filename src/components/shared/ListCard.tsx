/**
 * ListCard - Reusable list item card with icon and actions
 */

import React, { memo, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface ListCardProps {
  icon?: ReactNode;
  iconBgClass?: string;
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
  rightLabel?: string;
  rightValue?: string;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export const ListCard = memo(function ListCard({
  icon,
  iconBgClass = 'bg-gray-100',
  title,
  subtitle,
  rightContent,
  rightLabel,
  rightValue,
  showChevron = true,
  onClick,
  className,
  children,
}: ListCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          {icon && (
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', iconBgClass)}>
              {icon}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
          </div>

          {/* Right Content */}
          {rightContent ? (
            rightContent
          ) : (rightLabel || rightValue) ? (
            <div className="text-right flex-shrink-0">
              {rightLabel && <p className="text-xs text-gray-500">{rightLabel}</p>}
              {rightValue && <p className="font-semibold text-gray-900">{rightValue}</p>}
            </div>
          ) : null}

          {/* Chevron */}
          {showChevron && onClick && (
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          )}
        </div>

        {/* Additional Content */}
        {children && <div className="mt-3">{children}</div>}
      </CardContent>
    </Card>
  );
});

ListCard.displayName = 'ListCard';

export default ListCard;
