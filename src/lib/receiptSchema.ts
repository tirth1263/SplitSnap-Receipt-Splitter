import { z } from 'zod';
import type { ScannedReceipt } from './types';

/**
 * The JSON shape we ask the vision model to return. Kept in sync with
 * supabase/functions/scan-receipt/index.ts.
 * Amounts come back in cents (integers) so the phone never parses floats.
 */
export const ReceiptSchema = z.object({
  merchant: z.string().describe('Store or restaurant name, or "" if not visible'),
  currency: z.string().describe('ISO 4217 code, e.g. USD, EUR, INR. Guess from symbols/location; default USD'),
  items: z
    .array(
      z.object({
        name: z.string().describe('Short, human-friendly item name'),
        quantity: z.number().int().describe('Quantity, 1 if not printed'),
        line_total_cents: z.number().int().describe('Final price for this line in cents (quantity already applied)'),
      }),
    )
    .describe('Purchased items only. Exclude subtotal, tax, tip, total, payment and change lines'),
  subtotal_cents: z.number().int().nullable(),
  tax_cents: z.number().int().describe('Sum of all taxes and mandatory fees/service charges; 0 if none'),
  tip_cents: z.number().int().describe('Tip/gratuity already printed or written; 0 if none'),
  total_cents: z.number().int().nullable(),
});

export type ReceiptJson = z.infer<typeof ReceiptSchema>;

export const RECEIPT_PROMPT = `Read this receipt photo and extract it as JSON.
- List every purchased item with its final line price in cents. If a discount line belongs to an item, subtract it from that item; otherwise add it as an item with a negative price.
- Put all taxes and mandatory fees/service charges in tax_cents.
- Put any printed or handwritten tip in tip_cents (0 if none).
- If the image is not a receipt, return an empty items list.`;

export function toScannedReceipt(json: ReceiptJson): ScannedReceipt {
  return {
    merchant: json.merchant ?? '',
    currency: (json.currency || 'USD').toUpperCase().slice(0, 3),
    items: json.items.map((it) => ({
      name: it.quantity > 1 ? `${it.name} ×${it.quantity}` : it.name,
      priceCents: Math.round(it.line_total_cents),
    })),
    subtotalCents: json.subtotal_cents,
    taxCents: Math.round(json.tax_cents ?? 0),
    tipCents: Math.round(json.tip_cents ?? 0),
    totalCents: json.total_cents,
  };
}
