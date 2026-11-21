import type { Bill, PersonShare, SplitResult } from './types';

/**
 * The split engine. Pure integer arithmetic, runs entirely on the phone.
 *
 * Rules:
 *  1. Each item is divided evenly between the people who shared it.
 *  2. Tax and tip are divided in proportion to each person's food subtotal
 *     (order more → pay more tax and tip).
 *  3. Everything is floored to whole cents. The handful of leftover cents that
 *     flooring leaves behind goes to the payer, so the shares always add up to
 *     the exact bill total and nobody is ever charged a phantom penny.
 *     Giving them to the payer is the fairest choice: the payer's share is money
 *     they owe themselves, so no friend ends up paying for rounding.
 */

/** Total tip in cents for the bill, given the chosen tip mode. */
export function resolveTipCents(bill: Bill): number {
  const subtotal = bill.items.reduce((sum, item) => sum + item.priceCents, 0);
  switch (bill.tipMode.kind) {
    case 'receipt':
      return bill.receiptTipCents;
    case 'amount':
      return bill.tipMode.cents;
    case 'percent':
      // Integer math: (subtotal * percent) / 100, rounded half-up to a cent.
      return Math.round((subtotal * Math.round(bill.tipMode.percent * 100)) / 10000);
  }
}

/**
 * Split `amount` cents in proportion to `weights`, flooring each part.
 * Returns the parts and how many cents were left over.
 */
export function proportionalFloor(amount: number, weights: number[]): { parts: number[]; leftover: number } {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0 || amount === 0) {
    return { parts: weights.map(() => 0), leftover: amount };
  }
  const parts = weights.map((w) => Math.floor((amount * w) / totalWeight));
  const leftover = amount - parts.reduce((a, b) => a + b, 0);
  return { parts, leftover };
}

export function unassignedItems(bill: Bill) {
  return bill.items.filter((item) => item.sharedBy.length === 0);
}

export function computeSplit(bill: Bill): SplitResult {
  const people = bill.people;
  const index = new Map(people.map((p, i) => [p.id, i]));
  // Who absorbs rounding leftovers: the payer, or the first person if nobody is marked.
  const payerIdx = bill.payerId != null && index.has(bill.payerId) ? index.get(bill.payerId)! : 0;

  const food = people.map(() => 0);
  const itemLines: PersonShare['items'][] = people.map(() => []);
  let foodLeftover = 0;

  for (const item of bill.items) {
    const sharers = item.sharedBy.filter((id) => index.has(id));
    if (sharers.length === 0) continue; // unassigned items are excluded (UI blocks this)
    const each = Math.floor(item.priceCents / sharers.length);
    foodLeftover += item.priceCents - each * sharers.length;
    for (const id of sharers) {
      const i = index.get(id)!;
      food[i] += each;
      itemLines[i].push({ name: item.name, shareCents: each, splitWays: sharers.length });
    }
  }
  if (people.length > 0) food[payerIdx] += foodLeftover;

  const subtotal = food.reduce((a, b) => a + b, 0);
  const taxCents = bill.taxCents;
  const tipCents = resolveTipCents(bill);

  const tax = proportionalFloor(taxCents, food);
  const tip = proportionalFloor(tipCents, food);
  if (people.length > 0) {
    tax.parts[payerIdx] += tax.leftover;
    tip.parts[payerIdx] += tip.leftover;
  }

  const shares: PersonShare[] = people.map((p, i) => ({
    personId: p.id,
    name: p.name,
    foodCents: food[i],
    taxCents: tax.parts[i] ?? 0,
    tipCents: tip.parts[i] ?? 0,
    totalCents: food[i] + (tax.parts[i] ?? 0) + (tip.parts[i] ?? 0),
    items: itemLines[i],
  }));

  return {
    shares,
    subtotalCents: subtotal,
    taxCents,
    tipCents,
    grandTotalCents: subtotal + taxCents + tipCents,
  };
}
