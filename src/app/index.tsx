import React, { useCallback, useReducer, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stepper } from '../ui/components';
import { colors, space } from '../ui/theme';
import { billReducer, emptyBill } from '../lib/billReducer';
import type { ScannedReceipt } from '../lib/types';
import { SnapScreen } from '../screens/SnapScreen';
import { CheckItemsScreen } from '../screens/CheckItemsScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { AssignScreen } from '../screens/AssignScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { SettingsSheet } from '../screens/SettingsSheet';

/** Snap → Check items → Add people → Assign → Result */
type Step = 0 | 1 | 2 | 3 | 4;

export default function Home() {
  const [bill, dispatch] = useReducer(billReducer, emptyBill);
  const [step, setStep] = useState<Step>(0);
  const [receiptTotal, setReceiptTotal] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const go = useCallback((s: Step) => {
    setStep(s);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const onScanned = useCallback(
    (receipt: ScannedReceipt) => {
      dispatch({ type: 'loadReceipt', receipt });
      setReceiptTotal(receipt.totalCents);
      go(1);
    },
    [go],
  );

  const leaveCheckStep = () => {
    // Drop blank rows the user added but never filled in.
    bill.items.filter((it) => !it.name.trim() && it.priceCents === 0).forEach((it) => dispatch({ type: 'removeItem', id: it.id }));
    go(2);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.column}>
            <View style={styles.topBar}>
              <Pressable onPress={() => step > 0 && go((step - 1) as Step)} disabled={step === 0} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
                <Text style={[styles.back, step === 0 && { opacity: 0 }]}>‹ Back</Text>
              </Pressable>
              <Text style={styles.logo}>
                Split<Text style={{ color: colors.accent }}>Snap</Text>
              </Text>
              <Pressable onPress={() => setSettingsOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Settings">
                <Text style={styles.gear}>⚙️</Text>
              </Pressable>
            </View>

            <Stepper step={step} />

            {step === 0 && (
              <SnapScreen
                onScanned={onScanned}
                onManual={() => {
                  dispatch({ type: 'startManual' });
                  setReceiptTotal(null);
                  go(1);
                }}
                onOpenSettings={() => setSettingsOpen(true)}
                settingsVersion={settingsVersion}
              />
            )}
            {step === 1 && <CheckItemsScreen bill={bill} dispatch={dispatch} receiptTotalCents={receiptTotal} onNext={leaveCheckStep} />}
            {step === 2 && <PeopleScreen bill={bill} dispatch={dispatch} onNext={() => go(3)} />}
            {step === 3 && <AssignScreen bill={bill} dispatch={dispatch} onNext={() => go(4)} />}
            {step === 4 && (
              <ResultScreen
                bill={bill}
                dispatch={dispatch}
                onStartOver={() => {
                  dispatch({ type: 'reset' });
                  go(0);
                }}
              />
            )}

            <Text style={styles.footer}>Made with Expo + Claude · Open source on GitHub</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SettingsSheet
        visible={settingsOpen}
        onClose={(changed) => {
          setSettingsOpen(false);
          if (changed) setSettingsVersion((v) => v + 1);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: space(4), paddingBottom: space(10) },
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: space(5) },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space(3) },
  back: { fontSize: 16, color: colors.brand, fontWeight: '700', width: 60 },
  logo: { fontSize: 20, fontWeight: '900', color: colors.brand, letterSpacing: -0.5 },
  gear: { fontSize: 20, width: 60, textAlign: 'right' },
  footer: { textAlign: 'center', color: colors.inkFaint, fontSize: 12, marginTop: space(4) },
});
