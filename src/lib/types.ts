// Core data model. Every money value is an integer number of CENTS.
// Never store dollars as floating point: 0.1 + 0.2 !== 0.3.

export type Person = {
  id: string;
  name: string;
};

export type Item = {
  id: string;
  name: string;
  /** Line total in cents (quantity already multiplied in). */
  priceCents: number;
  /** IDs of the people sharing this item. Empty = not yet assigned. */
  sharedBy: string[];
};

export type TipMode =
  | { kind: 'receipt' } // use the tip printed on the receipt
  | { kind: 'percent'; percent: number } // % of the food subtotal
  | { kind: 'amount'; cents: number }; // a fixed amount

export type Bill = {
  merchant: string;
  currency: string;
  items: Item[];
  taxCents: number;
  /** Tip printed on the receipt (0 if none). */
  receiptTipCents: number;
  tipMode: TipMode;
  people: Person[];
  /** The person who paid the restaurant and is owed money by everyone else. */
  payerId: string | null;
};

/** What the AI (or the demo) hands back after reading a receipt. */
export type ScannedReceipt = {
  merchant: string;
  currency: string;
  items: { name: string; priceCents: number }[];
  subtotalCents: number | null;
  taxCents: number;
  tipCents: number;
  totalCents: number | null;
};

export type PersonShare = {
  personId: string;
  name: string;
  foodCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  items: { name: string; shareCents: number; splitWays: number }[];
};

export type SplitResult = {
  shares: PersonShare[];
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  grandTotalCents: number;
};
