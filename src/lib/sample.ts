import type { ScannedReceipt } from './types';

/** A realistic dinner receipt so anyone can try the whole flow without a photo or API key. */
export const SAMPLE_RECEIPT: ScannedReceipt = {
  merchant: 'Luigi’s Trattoria',
  currency: 'USD',
  items: [
    { name: 'Margherita Pizza', priceCents: 1650 },
    { name: 'Spaghetti Carbonara', priceCents: 1895 },
    { name: 'Caesar Salad', priceCents: 1100 },
    { name: 'Garlic Knots ×2', priceCents: 1300 },
    { name: 'Tiramisu', priceCents: 950 },
    { name: 'Lemonade', priceCents: 425 },
    { name: 'Craft IPA ×2', priceCents: 1600 },
  ],
  subtotalCents: 8920,
  taxCents: 792,
  tipCents: 0,
  totalCents: 9712,
};
