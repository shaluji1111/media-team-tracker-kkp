import { format, startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import { BUSINESS_TIME_ZONE } from './constants';

export function todayInBusinessTz(date = new Date()): string {
  return format(toZonedTime(date, BUSINESS_TIME_ZONE), 'yyyy-MM-dd');
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

export function withinHours(value: string, hours: number, now = new Date()): boolean {
  return now.getTime() - new Date(value).getTime() <= hours * 60 * 60 * 1000;
}
