/**
 * Date Formatting and Utilities
 * Includes Indian Financial Year support
 */

import { format, formatDistanceToNow, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, differenceInDays, differenceInMonths, addMonths, isSameDay, isToday, isYesterday, parseISO } from 'date-fns';

export type DateFormat = 'short' | 'medium' | 'long' | 'relative' | 'time' | 'datetime';
export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'financial_year';

/**
 * Format date for display
 */
export function formatDate(date: Date | string, formatType: DateFormat = 'medium'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (!d || Number.isNaN(d.getTime())) {
    return '';
  }

  switch (formatType) {
    case 'short':
      return format(d, 'dd/MM/yy');
    case 'medium':
      return format(d, 'dd MMM yyyy');
    case 'long':
      return format(d, 'EEEE, dd MMMM yyyy');
    case 'relative':
      return getRelativeTime(d);
    case 'time':
      return format(d, 'h:mm a');
    case 'datetime':
      return format(d, 'dd MMM, h:mm a');
    default:
      return format(d, 'dd MMM yyyy');
  }
}

/**
 * Get relative time description
 */
export function getRelativeTime(date: Date): string {
  if (isToday(date)) {
    return `Today, ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }

  const days = differenceInDays(new Date(), date);

  if (days < 7) {
    return `${days} days ago`;
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }

  return format(date, 'dd MMM yyyy');
}

/**
 * Get period date boundaries
 */
export function getPeriodDates(period: Period, reference: Date = new Date()): { start: Date; end: Date } {
  switch (period) {
    case 'day':
      return {
        start: startOfDay(reference),
        end: endOfDay(reference),
      };
    case 'week':
      return {
        start: startOfWeek(reference, { weekStartsOn: 1 }),
        end: endOfWeek(reference, { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        start: startOfMonth(reference),
        end: endOfMonth(reference),
      };
    case 'quarter': {
      const quarter = Math.floor(reference.getMonth() / 3);
      const quarterStart = new Date(reference.getFullYear(), quarter * 3, 1);
      return {
        start: startOfMonth(quarterStart),
        end: endOfMonth(addMonths(quarterStart, 2)),
      };
    }
    case 'year':
      return {
        start: startOfYear(reference),
        end: endOfYear(reference),
      };
    case 'financial_year':
      return getFinancialYear(reference);
    default:
      return {
        start: startOfMonth(reference),
        end: endOfMonth(reference),
      };
  }
}

/**
 * Get Indian Financial Year (April 1 - March 31)
 */
export function getFinancialYear(date: Date = new Date()): { start: Date; end: Date; label: string } {
  const year = date.getFullYear();
  const month = date.getMonth();

  // If before April, FY started last year
  const fyStartYear = month < 3 ? year - 1 : year;
  const fyEndYear = fyStartYear + 1;

  return {
    start: new Date(fyStartYear, 3, 1), // April 1
    end: new Date(fyEndYear, 2, 31, 23, 59, 59), // March 31
    label: `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)}`,
  };
}

/**
 * Get current financial quarter (Q1 = Apr-Jun, Q2 = Jul-Sep, etc.)
 */
export function getCurrentFinancialQuarter(date: Date = new Date()): number {
  const month = date.getMonth();
  // April = 0 (Q1), July = 1 (Q2), Oct = 2 (Q3), Jan = 3 (Q4)
  const fyMonth = (month + 9) % 12; // Shift so April = 0
  return Math.floor(fyMonth / 3) + 1;
}

/**
 * Get months between two dates
 */
export function getMonthsBetween(start: Date, end: Date): number {
  return differenceInMonths(end, start);
}

/**
 * Get days between two dates
 */
export function getDaysBetween(start: Date, end: Date): number {
  return differenceInDays(end, start);
}

/**
 * Check if date is in current period
 */
export function isInCurrentPeriod(date: Date, period: Period): boolean {
  const { start, end } = getPeriodDates(period);
  return date >= start && date <= end;
}

/**
 * Get period label
 */
export function getPeriodLabel(period: Period, reference: Date = new Date()): string {
  switch (period) {
    case 'day':
      return format(reference, 'EEEE, dd MMM');
    case 'week': {
      const weekStart = startOfWeek(reference, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(reference, { weekStartsOn: 1 });
      return `${format(weekStart, 'dd')} - ${format(weekEnd, 'dd MMM')}`;
    }
    case 'month':
      return format(reference, 'MMMM yyyy');
    case 'quarter':
      return `Q${getCurrentFinancialQuarter(reference)} ${format(reference, 'yyyy')}`;
    case 'year':
      return format(reference, 'yyyy');
    case 'financial_year':
      return getFinancialYear(reference).label;
    default:
      return format(reference, 'MMMM yyyy');
  }
}

/**
 * Generate array of dates in a range
 */
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(start);
  const endDate = startOfDay(end);

  while (current <= endDate) {
    dates.push(new Date(current));
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return dates;
}

/**
 * Get EMI due date for a given month
 */
export function getEMIDueDate(emiDay: number, monthOffset = 0, reference: Date = new Date()): Date {
  const targetMonth = addMonths(reference, monthOffset);
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();

  // Handle months with fewer days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(emiDay, daysInMonth);

  return new Date(year, month, day);
}
