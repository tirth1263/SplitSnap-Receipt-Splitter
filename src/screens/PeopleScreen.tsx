import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card, Field, SectionTitle, Banner } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';
import type { Bill } from '../lib/types';
import type { BillAction } from '../lib/billReducer';

type Props = { bill: Bill; dispatch: React.Dispatch<BillAction>; onNext: () => void };

export function PeopleScreen({ bill, dispatch, onNext }: Props) {
  const [name, setName] = useState('');

  const add = () => {
    if (!name.trim()) return;
    dispatch({ type: 'addPerson', name });
    setName('');
  };

  return (
    <View style={{ gap: space(4) }}>
      <SectionTitle title="Who's splitting?" subtitle="Just first names. No accounts, no sign-ups. Mark who paid the bill." />

      <View style={{ flexDirection: 'row', gap: space(2), alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            placeholder="Add a name, e.g. Maya"
            value={name}
            onChangeText={setName}
            onSubmitEditing={add}
            returnKeyType="done"
            autoCapitalize="words"
            accessibilityLabel="Person's name"
            blurOnSubmit={false}
          />
        </View>
        <Button label="Add" small onPress={add} disabled={!name.trim()} style={{ minHeight: 48 }} />
      </View>

      {bill.people.length === 0 ? (
        <Banner>Add yourself and your friends. You can rename or remove people anytime.</Banner>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {bill.people.map((p, i) => {
            const isPayer = bill.payerId === p.id;
            return (
              <View key={p.id} style={[styles.row, i > 0 && styles.border]}>
                <Avatar name={p.name} index={i} />
                <Text style={[font.body, { flex: 1, fontWeight: '600' }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isPayer }}
                  accessibilityLabel={`${p.name} paid the bill`}
                  onPress={() => dispatch({ type: 'setPayer', id: p.id })}
                  style={[styles.payer, isPayer && styles.payerActive]}
                >
                  <Text style={[styles.payerText, isPayer && { color: '#fff' }]}>{isPayer ? '💳 Paid' : 'Paid?'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${p.name}`}
                  hitSlop={8}
                  onPress={() => dispatch({ type: 'removePerson', id: p.id })}
                  style={{ padding: 6 }}
                >
                  <Text style={{ color: colors.inkFaint, fontSize: 18 }}>✕</Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
      )}

      {bill.people.length === 1 ? <Banner tone="warn">Add at least one more person to split with.</Banner> : null}

      <Button label="Next: who had what" disabled={bill.people.length < 2} onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingHorizontal: space(4), paddingVertical: space(3) },
  border: { borderTopWidth: 1, borderTopColor: colors.line },
  payer: { paddingHorizontal: space(3), paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  payerActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  payerText: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
});
