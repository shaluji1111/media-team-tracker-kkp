import { describe, expect, it } from 'vitest';

import { isValidJsid, jsidToAuthEmail, normalizeJsid } from './jsid';

describe('JSID helpers', () => {
  it('normalizes compact employee IDs', () => {
    expect(normalizeJsid(' js-3001 ')).toBe('JS3001');
  });

  it('validates compact JSID format while accepting hyphenated input', () => {
    expect(isValidJsid('JS0001')).toBe(true);
    expect(isValidJsid('JS-0001')).toBe(true);
    expect(isValidJsid('AB-0001')).toBe(false);
  });

  it('maps JSID to hidden auth email', () => {
    expect(jsidToAuthEmail('JS-0001')).toBe('js0001@worktrack.local');
  });
});
