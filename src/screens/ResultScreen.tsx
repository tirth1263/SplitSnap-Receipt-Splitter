import React, { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type HostInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Avatar, Banner, Button, Card, Chip, SectionTitle } from '../ui/components';
import { MoneyInput } from '../ui/MoneyInput';
import { colors, font, radius, space } from '../ui/theme';
import { formatCents } from '../lib/money';
import { computeSplit } from '../lib/split';
import { buildShareText, shareImage, shareText } from '../lib/share';
import type { Bill } from '../lib/types';
import type { BillAction } from '../lib/billReducer';

type Props = { bill: Bill; dispatch: React.Dispatch<BillAction>; onStartOver: () => void };

const PRESETS = [15, 18, 20, 25];

export function ResultScreen({ bill, dispatch, onStartOver }: Props) {
  const result = useMemo(() => computeSplit(bill), [bill]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sharing, setSharing] = useState<'text' | 'image' | null>(null);
  const shotRef = useRef<HostInstance>(null);
  const payer = bill.people.find((p) => p.id === bill.payerId);
  const fmt = (c: number) => formatCents(c, bill.currency);
  const tm = bill.tipMode;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const onShareText = async () => {
    setSharing('text');
    try {
      const how = await shareText(buildShareText(bill, result));
      if (how === 'copied') flash('Copied to clipboard. Paste it in your group chat.');
    } catch {
      flash("Couldn't open the share sheet.");
    } finally {
      setSharing(null);
    }
  };

  const onShareImage = async () => {
    if (!shotRef.current) return;
    setSharing('image');
    try {
      const uri = await captureRef(shotRef, {
        format: 'png',
        quality: 1,
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
      });
      const how = await shareImage(uri);
      if (how === 'downloaded') flash('Image saved. Send it to your friends.');
    } catch {
      flash("Couldn't create the image.");
    } finally {
      setSharing(null);
    }
  };

  return (
    <View style={{ gap: space(4) }}>
      <SectionTitle title="Who owes what" subtitle="Tax and tip are split in proportion to what each person ordered." />

      <Card style={{ gap: space(3) }}>
        <Text style={font.h2}>Tip</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
          {bill.receiptTipCents > 0 ? (
            <Chip label={`On receipt · ${fmt(bill.receiptTipCents)}`} active={tm.kind === 'receipt'} onPress={() => dispatch({ type: 'setTipMode', mode: { kind: 'receipt' } })} />
          ) : null}
          <Chip label="No tip" active={tm.kind === 'percent' && tm.percent === 0} onPress={() => dispatch({ type: 'setTipMode', mode: { kind: 'percent', percent: 0 } })} />
          {PRESETS.map((p) => (
            <Chip
              key={p}
              label={`${p}%`}
              active={tm.kind === 'percent' && tm.percent === p}
              onPress={() => dispatch({ type: 'setTipMode', mode: { kind: 'percent', percent: p } })}
            />
          ))}
          <Chip label="Custom" active={tm.kind === 'amount'} onPress={() => dispatch({ type: 'setTipMode', mode: { kind: 'amount', cents: result.tipCents } })} />
        </View>
        {tm.kind === 'amount' ? (
          <MoneyInput label="Tip amount" cents={tm.cents} onChange={(c) => dispatch({ type: 'setTipMode', mode: { kind: 'amount', cents: c } })} />
        ) : null}
      </Card>

      {/* Everything inside this view becomes the shareable image. */}
      <View ref={shotRef} collapsable={false} style={styles.shot}>
        <View style={styles.shotHeader}>
          <View>
            <Text style={styles.shotBrand}>SplitSnap</Text>
            <Text style={[font.h2, { color: '#fff' }]} numberOfLines={1}>
              {bill.merchant || 'Our bill'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#CFE3D9', fontSize: 12 }}>Total</Text>
            <Text style={[styles.shotTotal, font.mono]}>{fmt(result.grandTotalCents)}</Text>
          </View>
        </View>

        <View style={{ padding: space(3), gap: space(2) }}>
          {result.shares.map((s, i) => {
            const isPayer = payer?.id === s.personId;
            const open = expanded === s.personId;
            return (
              <Pressable
                key={s.personId}
                onPress={() => setExpanded(open ? null : s.personId)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={styles.personRow}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
                  <Avatar name={s.name} index={i} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={[font.body, { fontWeight: '700' }]}>{s.name}</Text>
                    <Text style={font.small}>
                      {isPayer ? 'Paid the bill' : payer && s.totalCents > 0 ? `Owes ${payer.name}` : s.totalCents === 0 ? 'Nothing to pay' : 'Share'}
                    </Text>
                  </View>
                  <Text style={[styles.amount, font.mono, isPayer && { color: colors.inkSoft }]}>{fmt(s.totalCents)}</Text>
                </View>
                {open ? (
                  <View style={styles.breakdown}>
                    {s.items.map((it, k) => (
                      <Row key={k} label={`${it.name}${it.splitWays > 1 ? ` (1/${it.splitWays})` : ''}`} value={fmt(it.shareCents)} />
                    ))}
                    <Row label="Tax share" value={fmt(s.taxCents)} />
                    <Row label="Tip share" value={fmt(s.tipCents)} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <View style={styles.summary}>
            <Row label="Food" value={fmt(result.subtotalCents)} />
            <Row label="Tax & fees" value={fmt(result.taxCents)} />
            <Row label="Tip" value={fmt(result.tipCents)} />
          </View>
        </View>
      </View>

      <Text style={[font.small, { textAlign: 'center' }]}>Tap a person to see their breakdown.</Text>

      {toast ? <Banner>{toast}</Banner> : null}

      <View style={{ flexDirection: 'row', gap: space(3) }}>
        <Button label="Share text" icon="💬" style={{ flex: 1 }} loading={sharing === 'text'} onPress={onShareText} />
        <Button label="Share image" icon="🖼️" variant="secondary" style={{ flex: 1 }} loading={sharing === 'image'} onPress={onShareImage} />
      </View>
      <Button label="Split another receipt" variant="ghost" onPress={onStartOver} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space(2) }}>
      <Text style={[font.small, { flex: 1 }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[font.small, font.mono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shot: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  shotHeader: {
    backgroundColor: colors.brand,
    padding: space(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: space(3),
  },
  shotBrand: { color: colors.accent, fontWeight: '900', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  shotTotal: { color: '#fff', fontSize: 26, fontWeight: '900' },
  personRow: { padding: space(3), borderRadius: radius.md, backgroundColor: colors.bg, gap: space(2) },
  amount: { fontSize: 20, fontWeight: '900', color: colors.ink },
  breakdown: { gap: 4, paddingLeft: 48, paddingTop: space(1) },
  summary: { gap: 4, paddingHorizontal: space(3), paddingTop: space(2), borderTopWidth: 1, borderTopColor: colors.line, marginTop: space(1) },
});
