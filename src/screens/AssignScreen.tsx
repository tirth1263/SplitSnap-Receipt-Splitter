import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Banner, Button, SectionTitle } from '../ui/components';
import { colors, font, personColors, radius, space } from '../ui/theme';
import { formatCents } from '../lib/money';
import { unassignedItems } from '../lib/split';
import type { Bill } from '../lib/types';
import type { BillAction } from '../lib/billReducer';

type Props = { bill: Bill; dispatch: React.Dispatch<BillAction>; onNext: () => void };

/**
 * "Pass the phone" assignment: pick whose turn it is, then tap everything they had.
 * Tapping an item someone else already has makes it shared (split evenly).
 */
export function AssignScreen({ bill, dispatch, onNext }: Props) {
  const [activeId, setActiveId] = useState(bill.people[0]?.id ?? '');
  const activeIndex = Math.max(0, bill.people.findIndex((p) => p.id === activeId));
  const active = bill.people[activeIndex];
  const activeColor = personColors[activeIndex % personColors.length];
  const remaining = unassignedItems(bill).length;

  return (
    <View style={{ gap: space(4) }}>
      <SectionTitle title="Who had what?" subtitle="Pick a person, then tap what they ate. Tap an item for more than one person to share it." />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2), paddingVertical: 2 }}>
        {bill.people.map((p, i) => {
          const selected = p.id === activeId;
          const color = personColors[i % personColors.length];
          return (
            <Pressable
              key={p.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActiveId(p.id)}
              style={[styles.personTab, selected && { borderColor: color, backgroundColor: color + '18' }]}
            >
              <Avatar name={p.name} index={i} size={28} />
              <Text style={[styles.personName, selected && { color }]}>{p.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ gap: space(2) }}>
        {bill.items.map((item) => {
          const mine = active ? item.sharedBy.includes(active.id) : false;
          const ways = item.sharedBy.length;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: mine }}
              accessibilityLabel={`${item.name}, ${formatCents(item.priceCents, bill.currency)}`}
              onPress={() => active && dispatch({ type: 'toggleShare', itemId: item.id, personId: active.id })}
              style={({ pressed }) => [
                styles.item,
                mine && { borderColor: activeColor, backgroundColor: activeColor + '10' },
                ways === 0 && styles.itemUnassigned,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.check, mine && { backgroundColor: activeColor, borderColor: activeColor }]}>
                {mine ? <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text> : null}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[font.body, { fontWeight: '600' }]}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {ways === 0 ? (
                    <Text style={[font.small, { color: colors.danger }]}>Nobody yet</Text>
                  ) : (
                    <>
                      {item.sharedBy.map((id) => {
                        const idx = bill.people.findIndex((p) => p.id === id);
                        return idx >= 0 ? <Avatar key={id} name={bill.people[idx].name} index={idx} size={20} /> : null;
                      })}
                      {ways > 1 ? (
                        <Text style={font.small}>
                          {' '}
                          split {ways} ways · {formatCents(Math.floor(item.priceCents / ways), bill.currency)} each
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={[font.body, font.mono, { fontWeight: '700' }]}>{formatCents(item.priceCents, bill.currency)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${item.name} with everyone`}
                  onPress={() => dispatch({ type: 'shareWithEveryone', itemId: item.id })}
                  hitSlop={6}
                >
                  <Text style={styles.everyone}>{ways === bill.people.length ? 'Clear' : 'Everyone'}</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </View>

      {remaining > 0 ? (
        <View style={{ gap: space(2) }}>
          <Banner tone="warn">
            {remaining} item{remaining === 1 ? '' : 's'} still unassigned.
          </Banner>
          <Button label="Split the rest evenly among everyone" variant="secondary" small onPress={() => dispatch({ type: 'assignRemainingToEveryone' })} />
        </View>
      ) : null}

      <Button label="See who owes what" disabled={remaining > 0} onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  personTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingLeft: 4,
    paddingRight: space(3),
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  personName: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(3),
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  itemUnassigned: { borderStyle: 'dashed' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  everyone: { fontSize: 12, fontWeight: '700', color: colors.brand },
});
