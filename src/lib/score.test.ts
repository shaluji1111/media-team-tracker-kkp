import { describe, expect, it } from 'vitest';

import { averageNullable, employeeDailyScore, statusForMinutes } from './score';

describe('score helpers', () => {
  it('returns null when no data exists yet', () => {
    expect(employeeDailyScore(null)).toBeNull();
    expect(averageNullable([null, undefined])).toBeNull();
  });

  it('caps daily employee score at 100 percent', () => {
    expect(employeeDailyScore(480)).toBe(100);
  });

  it('ignores null child scores in averages', () => {
    expect(averageNullable([100, null, 50])).toBe(75);
  });

  it('marks productivity status by required hour bands', () => {
    expect(statusForMinutes(null)).toBe('no_data');
    expect(statusForMinutes(120)).toBe('flagged');
    expect(statusForMinutes(240)).toBe('at_risk');
    expect(statusForMinutes(360)).toBe('on_track');
    expect(statusForMinutes(0, true)).toBe('on_leave');
  });
});

