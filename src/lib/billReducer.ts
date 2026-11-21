import type { Bill, Item, ScannedReceipt, TipMode } from './types';

let counter = 0;
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export const emptyBill: Bill = {
  merchant: '',
  currency: 'USD',
  items: [],
  taxCents: 0,
  receiptTipCents: 0,
  tipMode: { kind: 'percent', percent: 18 },
  people: [],
  payerId: null,
};

export type BillAction =
  | { type: 'loadReceipt'; receipt: ScannedReceipt }
  | { type: 'startManual' }
  | { type: 'setMerchant'; merchant: string }
  | { type: 'addItem' }
  | { type: 'updateItem'; id: string; patch: Partial<Pick<Item, 'name' | 'priceCents'>> }
  | { type: 'removeItem'; id: string }
  | { type: 'setTax'; cents: number }
  | { type: 'setReceiptTip'; cents: number }
  | { type: 'setTipMode'; mode: TipMode }
  | { type: 'addPerson'; name: string }
  | { type: 'renamePerson'; id: string; name: string }
  | { type: 'removePerson'; id: string }
  | { type: 'setPayer'; id: string }
  | { type: 'toggleShare'; itemId: string; personId: string }
  | { type: 'shareWithEveryone'; itemId: string }
  | { type: 'assignRemainingToEveryone' }
  | { type: 'reset' };

export function billReducer(bill: Bill, action: BillAction): Bill {
  switch (action.type) {
    case 'loadReceipt': {
      const r = action.receipt;
      return {
        ...emptyBill,
        people: bill.people, // keep the crew if they're splitting another receipt
        payerId: bill.payerId,
        merchant: r.merchant,
        currency: r.currency || 'USD',
        items: r.items.map((it) => ({ id: newId('item'), name: it.name, priceCents: it.priceCents, sharedBy: [] })),
        taxCents: r.taxCents,
        receiptTipCents: r.tipCents,
        tipMode: r.tipCents > 0 ? { kind: 'receipt' } : { kind: 'percent', percent: 18 },
      };
    }
    case 'startManual':
      return {
        ...emptyBill,
        people: bill.people,
        payerId: bill.payerId,
        items: [{ id: newId('item'), name: '', priceCents: 0, sharedBy: [] }],
      };
    case 'setMerchant':
      return { ...bill, merchant: action.merchant };
    case 'addItem':
      return { ...bill, items: [...bill.items, { id: newId('item'), name: '', priceCents: 0, sharedBy: [] }] };
    case 'updateItem':
      return { ...bill, items: bill.items.map((it) => (it.id === action.id ? { ...it, ...action.patch } : it)) };
    case 'removeItem':
      return { ...bill, items: bill.items.filter((it) => it.id !== action.id) };
    case 'setTax':
      return { ...bill, taxCents: action.cents };
    case 'setReceiptTip':
      return { ...bill, receiptTipCents: action.cents };
    case 'setTipMode':
      return { ...bill, tipMode: action.mode };
    case 'addPerson': {
      const name = action.name.trim();
      if (!name) return bill;
      const person = { id: newId('p'), name };
      return { ...bill, people: [...bill.people, person], payerId: bill.payerId ?? person.id };
    }
    case 'renamePerson':
      return { ...bill, people: bill.people.map((p) => (p.id === action.id ? { ...p, name: action.name } : p)) };
    case 'removePerson': {
      const people = bill.people.filter((p) => p.id !== action.id);
      return {
        ...bill,
        people,
        payerId: bill.payerId === action.id ? (people[0]?.id ?? null) : bill.payerId,
        items: bill.items.map((it) => ({ ...it, sharedBy: it.sharedBy.filter((id) => id !== action.id) })),
      };
    }
    case 'setPayer':
      return { ...bill, payerId: action.id };
    case 'toggleShare':
      return {
        ...bill,
        items: bill.items.map((it) => {
          if (it.id !== action.itemId) return it;
          const has = it.sharedBy.includes(action.personId);
          return {
            ...it,
            sharedBy: has ? it.sharedBy.filter((id) => id !== action.personId) : [...it.sharedBy, action.personId],
          };
        }),
      };
    case 'shareWithEveryone': {
      const all = bill.people.map((p) => p.id);
      return {
        ...bill,
        items: bill.items.map((it) =>
          it.id === action.itemId ? { ...it, sharedBy: it.sharedBy.length === all.length ? [] : all } : it,
        ),
      };
    }
    case 'assignRemainingToEveryone': {
      const all = bill.people.map((p) => p.id);
      return { ...bill, items: bill.items.map((it) => (it.sharedBy.length ? it : { ...it, sharedBy: all })) };
    }
    case 'reset':
      return { ...emptyBill, people: bill.people, payerId: bill.payerId };
  }
}
