// Helpers for turning human-typed money into integer cents and back.

/**
 * Parse "12.5", "$12.50", "1,234.99" or "12" into cents.
 * Returns null when the text is not a valid amount.
 * Parses the string digit-by-digit so no floating point is involved.
 */
export function parseCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === '' || cleaned === '-' || cleaned === '.') {
    return null;
  }
  const negative = cleaned.startsWith('-');
  const [whole = '0', frac = ''] = cleaned.replace('-', '').split('.');
  const cents = Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2));
  return negative ? -cents : cents;
}

const SYMBOLS: Record<string, string> = {
  USD: '$', CAD: '$', AUD: '$', NZD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
};

/** Format cents as "$12.34" (or "-$1.00"). */
export function formatCents(cents: number, currency = 'USD'): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const symbol = SYMBOLS[currency.toUpperCase()] ?? '';
  const body = `${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
  return symbol ? `${sign}${symbol}${body}` : `${sign}${body} ${currency.toUpperCase()}`;
}

/** Cents → plain editable text, e.g. 1250 → "12.50". */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
