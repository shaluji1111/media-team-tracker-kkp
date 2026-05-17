import { MIN_PRODUCTIVE_HOURS } from './constants';
import type { TeamMetric } from '../types';

export function employeeDailyScore(totalMinutes: number | null, approvedLeave = false): number | null {
  if (approvedLeave || totalMinutes === null || totalMinutes <= 0) {
    return null;
  }
  return Math.min((totalMinutes / 60 / MIN_PRODUCTIVE_HOURS) * 100, 100);
}

export function cumulativeScore(totalMinutes: number): number {
  return (totalMinutes / 60 / MIN_PRODUCTIVE_HOURS) * 100;
}

export function averageNullable(values: Array<number | null | undefined>): number | null {
  const scored = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (scored.length === 0) {
    return null;
  }
  return scored.reduce((sum, value) => sum + value, 0) / scored.length;
}

export function statusForMinutes(totalMinutes: number | null, approvedLeave = false): TeamMetric['status'] {
  if (approvedLeave) {
    return 'on_leave';
  }
  if (totalMinutes === null || totalMinutes <= 0) {
    return 'no_data';
  }
  const hours = totalMinutes / 60;
  if (hours >= MIN_PRODUCTIVE_HOURS) {
    return 'on_track';
  }
  if (hours >= 3) {
    return 'at_risk';
  }
  return 'flagged';
}

export function formatScore(score: number | null | undefined): string {
  return typeof score === 'number' ? `${Math.round(score)}%` : '-';
}

export function formatHoursFromMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) {
    return '-';
  }
  return `${(minutes / 60).toFixed(1)}h`;
}

