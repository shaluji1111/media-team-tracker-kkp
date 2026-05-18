const JSID_PATTERN = /^JS\d{4,5}$/;

export function normalizeJsid(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '');
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


