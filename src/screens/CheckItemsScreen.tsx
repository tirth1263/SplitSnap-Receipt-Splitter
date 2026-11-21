import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Banner, Button, Card, Field, SectionTitle } from '../ui/components';
import { MoneyInput } from '../ui/MoneyInput';
import { colors, font, radius, space } from '../ui/theme';
import { formatCents } from '../lib/money';
import type { Bill } from '../lib/types';
import type { BillAction } from '../lib/billReducer';

type Props = {
  bill: Bill;
  dispatch: React.Dispatch<BillAction>;
  receiptTotalCents: number | null;
  onNext: () => void;
};

export function CheckItemsScreen({ bill, dispatch, receiptTotalCents, onNext }: Props) {
  const subtotal = bill.items.reduce((s, it) => s + it.priceCents, 0);
  const computedTotal = subtotal + bill.taxCents + bill.receiptTipCents;
  const mismatch = receiptTotalCents != null && receiptTotalCents !== computedTotal;
  const validItems = bill.items.filter((it) => it.name.trim() && it.priceCents !== 0);
  const canContinue = validItems.length > 0;
  const symbol = formatCents(0, bill.currency).replace(/[\d.,\s-]/g, '') || '';

  return (
    <View style={{ gap: space(4) }}>
      <SectionTitle title="Check the items" subtitle="Fix anything the AI misread. Tap a name or price to edit it." />

      <Field label="Place" placeholder="Restaurant name" value={bill.merchant} onChangeText={(t) => dispatch({ type: 'setMerchant', merchant: t })} />

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {bill.items.map((item, i) => (
          <View key={item.id} style={[styles.row, i > 0 && styles.rowBorder]}>
            <TextInput
              value={item.name}
              placeholder="Item name"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel={`Item ${i + 1} name`}
              onChangeText={(t) => dispatch({ type: 'updateItem', id: item.id, patch: { name: t } })}
              style={styles.name}
            />
            <View style={{ width: 120 }}>
              <MoneyInput
                cents={item.priceCents}
                prefix={symbol}
                accessibilityLabel={`Item ${i + 1} price`}
                onChange={(c) => dispatch({ type: 'updateItem', id: item.id, patch: { priceCents: c } })}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name || 'item'}`}
              onPress={() => dispatch({ type: 'removeItem', id: item.id })}
              style={styles.remove}
              hitSlop={8}
            >
              <Text style={{ color: colors.inkFaint, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={() => dispatch({ type: 'addItem' })} style={[styles.row, styles.rowBorder, { justifyContent: 'center' }]}>
          <Text style={{ color: colors.brand, fontWeight: '700' }}>＋ Add item</Text>
        </Pressable>
      </Card>

      <View style={{ flexDirection: 'row', gap: space(3) }}>
        <View style={{ flex: 1 }}>
          <MoneyInput label="Tax & fees" prefix={symbol} cents={bill.taxCents} onChange={(c) => dispatch({ type: 'setTax', cents: c })} />
        </View>
        <View style={{ flex: 1 }}>
          <MoneyInput label="Tip on receipt" prefix={symbol} cents={bill.receiptTipCents} onChange={(c) => dispatch({ type: 'setReceiptTip', cents: c })} />
        </View>
      </View>

      <Card style={{ gap: space(2) }}>
        <Line label="Items subtotal" value={formatCents(subtotal, bill.currency)} />
        <Line label="Tax & fees" value={formatCents(bill.taxCents, bill.currency)} />
        {bill.receiptTipCents ? <Line label="Tip on receipt" value={formatCents(bill.receiptTipCents, bill.currency)} /> : null}
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <Line label="Total" value={formatCents(computedTotal, bill.currency)} bold />
      </Card>

      {mismatch ? (
        <Banner tone="warn">
          Heads up: the receipt total says {formatCents(receiptTotalCents!, bill.currency)}, but these lines add up to{' '}
          {formatCents(computedTotal, bill.currency)}. An item may have been misread.
        </Banner>
      ) : null}

      <Button label="Looks good: add people" disabled={!canContinue} onPress={onNext} />
    </View>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={[font.body, bold && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[font.body, font.mono, bold && { fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(2), paddingHorizontal: space(3), paddingVertical: space(2), minHeight: 56 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  name: { flex: 1, fontSize: 15, color: colors.ink, minHeight: 44, outlineStyle: 'none' } as never,
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
});
