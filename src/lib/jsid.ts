const JSID_PATTERN = /^JS\d{4}$/;

export function normalizeJsid(value: string): string {
  const compact = value.trim().toUpperCase().replace(/\s+/g, '').replace('-', '');
  // Accept both JS0001 and JS-0001 input; always output JS0001
  if (/^JS\d{4}$/.test(compact)) {
    return compact;
  }
  return compact;
}

export function isValidJsid(value: string): boolean {
  return JSID_PATTERN.test(normalizeJsid(value));
}

export function jsidToAuthEmail(jsid: string): string {
  return `${normalizeJsid(jsid).toLowerCase()}@worktrack.local`;
}

export function makeDefaultPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}


