// Run with: npm test   (uses Node's built-in test runner + native TypeScript stripping)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSplit, proportionalFloor, resolveTipCents } from './split.ts';
import { parseCents, formatCents } from './money.ts';
import type { Bill } from './types.ts';

const people = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Ben' },
  { id: 'c', name: 'Cy' },
];

function bill(partial: Partial<Bill>): Bill {
  return {
    merchant: 'Test',
    currency: 'USD',
    items: [],
    taxCents: 0,
    receiptTipCents: 0,
    tipMode: { kind: 'receipt' },
    people,
    payerId: 'a',
    ...partial,
  };
}

const sum = (xs: number[]) => xs.reduce((x, y) => x + y, 0);

test('shares always add up to the exact grand total', () => {
  const b = bill({
    items: [
      { id: '1', name: 'Pizza', priceCents: 1000, sharedBy: ['a', 'b', 'c'] },
      { id: '2', name: 'Soda', priceCents: 299, sharedBy: ['b'] },
      { id: '3', name: 'Salad', priceCents: 1301, sharedBy: ['a', 'c'] },
    ],
    taxCents: 211,
    tipMode: { kind: 'percent', percent: 18 },
  });
  const r = computeSplit(b);
  assert.equal(sum(r.shares.map((s) => s.totalCents)), r.grandTotalCents);
  assert.equal(r.subtotalCents, 2600);
  assert.equal(r.tipCents, 468);
  assert.equal(r.grandTotalCents, 2600 + 211 + 468);
});

test('leftover cents from an uneven item go to the payer', () => {
  const r = computeSplit(
    bill({ items: [{ id: '1', name: 'Pizza', priceCents: 1000, sharedBy: ['a', 'b', 'c'] }], payerId: 'b' }),
  );
  const [ana, ben, cy] = r.shares;
  assert.equal(ana.foodCents, 333);
  assert.equal(cy.foodCents, 333);
  assert.equal(ben.foodCents, 334); // payer absorbs the extra cent
});

test('tax and tip are proportional to what each person ordered', () => {
  const r = computeSplit(
    bill({
      items: [
        { id: '1', name: 'Steak', priceCents: 3000, sharedBy: ['a'] },
        { id: '2', name: 'Fries', priceCents: 1000, sharedBy: ['b'] },
      ],
      people: people.slice(0, 2),
      taxCents: 400,
      receiptTipCents: 800,
    }),
  );
  assert.deepEqual(
    r.shares.map((s) => [s.taxCents, s.tipCents]),
    [
      [300, 600],
      [100, 200],
    ],
  );
});

test('people who ordered nothing pay nothing', () => {
  const r = computeSplit(
    bill({ items: [{ id: '1', name: 'Tea', priceCents: 450, sharedBy: ['a'] }], taxCents: 40, receiptTipCents: 50 }),
  );
  assert.equal(r.shares[1].totalCents, 0);
  assert.equal(r.shares[2].totalCents, 0);
  assert.equal(r.shares[0].totalCents, 540);
});

test('tip modes', () => {
  const items = [{ id: '1', name: 'X', priceCents: 4567, sharedBy: ['a'] }];
  assert.equal(resolveTipCents(bill({ items, receiptTipCents: 700 })), 700);
  assert.equal(resolveTipCents(bill({ items, tipMode: { kind: 'amount', cents: 999 } })), 999);
  assert.equal(resolveTipCents(bill({ items, tipMode: { kind: 'percent', percent: 20 } })), 913); // 913.4
  assert.equal(resolveTipCents(bill({ items, tipMode: { kind: 'percent', percent: 17.5 } })), 799); // 799.225
});

test('fuzz: 2,000 random bills never lose or invent a cent', () => {
  let seed = 42;
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  for (let run = 0; run < 2000; run++) {
    const n = 1 + rand(7);
    const ps = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    const items = Array.from({ length: 1 + rand(10) }, (_, i) => {
      const sharedBy = ps.filter(() => rand(2) === 0).map((p) => p.id);
      return { id: `i${i}`, name: `I${i}`, priceCents: 1 + rand(5000), sharedBy: sharedBy.length ? sharedBy : [ps[0].id] };
    });
    const r = computeSplit(
      bill({ people: ps, items, payerId: ps[rand(n)].id, taxCents: rand(900), tipMode: { kind: 'percent', percent: rand(30) } }),
    );
    assert.equal(sum(r.shares.map((s) => s.totalCents)), r.grandTotalCents);
    assert.ok(r.shares.every((s) => s.totalCents >= 0));
  }
});

test('proportionalFloor reports leftover', () => {
  assert.deepEqual(proportionalFloor(100, [1, 1, 1]), { parts: [33, 33, 33], leftover: 1 });
  assert.deepEqual(proportionalFloor(50, [0, 0]), { parts: [0, 0], leftover: 50 });
});

test('parseCents and formatCents', () => {
  assert.equal(parseCents('12.5'), 1250);
  assert.equal(parseCents('$1,234.99'), 123499);
  assert.equal(parseCents('0.07'), 7);
  assert.equal(parseCents('-3'), -300);
  assert.equal(parseCents('abc'), null);
  assert.equal(parseCents('1.234'), null);
  assert.equal(formatCents(123456), '$1,234.56');
  assert.equal(formatCents(-5), '-$0.05');
});
