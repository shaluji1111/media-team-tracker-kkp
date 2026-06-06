import { addDays, differenceInCalendarDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import { BUSINESS_TIME_ZONE } from './constants';
import type { ReportOptions } from '../types';

export function todayInBusinessTz(date = new Date()): string {
  return format(toZonedTime(date, BUSINESS_TIME_ZONE), 'yyyy-MM-dd');
}

export function businessDateFor(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return todayInBusinessTz(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);
}

export function formatDate(value: string | Date): string {
  const date =
    typeof value === 'string'
      ? /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00+05:30`)
        : new Date(value)
      : value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);
}

export function businessWeekStart(value = new Date()): string {
  const zoned = toZonedTime(value, BUSINESS_TIME_ZONE);
  return format(startOfWeek(zoned, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function businessDateFromInput(value: string): Date {
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  return new Date(`${normalized}T00:00:00+05:30`);
}

export function reportDateRange(options?: Partial<ReportOptions>): { startDate: string; endDate: string; days: number } {
  const period = options?.period ?? 'daily';
  const date = options?.date || todayInBusinessTz();
  const parsed = businessDateFromInput(date);

  if (period === 'weekly') {
    const startDate = businessWeekStart(parsed);
    const start = businessDateFromInput(startDate);
    const endDate = format(addDays(start, 6), 'yyyy-MM-dd');
    return { startDate, endDate, days: 7 };
  }

  if (period === 'monthly') {
    const start = startOfMonth(parsed);
    const end = endOfMonth(parsed);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      days: differenceInCalendarDays(end, start) + 1,
    };
  }

  const startDate = format(parsed, 'yyyy-MM-dd');
  return { startDate, endDate: startDate, days: 1 };
}

export function withinHours(value: string, hours: number, now = new Date()): boolean {
  return now.getTime() - new Date(value).getTime() <= hours * 60 * 60 * 1000;
}
