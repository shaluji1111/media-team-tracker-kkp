import { describe, expect, it } from 'vitest';

import { businessDateFor } from './dates';

describe('date helpers', () => {
  it('maps UTC timestamps to the configured business date', () => {
    expect(businessDateFor('2026-05-22T20:00:00.000Z')).toBe('2026-05-23');
  });
});
