import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, Card } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';
import { pickReceiptPhoto } from '../lib/image';
import { getScanMode, scanReceipt, ScanError, type ScanMode } from '../lib/scan';
import { FREE_SCANS_PER_MONTH, getScansUsedThisMonth } from '../lib/storage';
import { SAMPLE_RECEIPT } from '../lib/sample';
import type { ScannedReceipt } from '../lib/types';

type Props = {
  onScanned: (receipt: ScannedReceipt) => void;
  onManual: () => void;
  onOpenSettings: () => void;
  settingsVersion: number;
};

export function SnapScreen({ onScanned, onManual, onOpenSettings, settingsVersion }: Props) {
  const [mode, setMode] = useState<ScanMode>('none');
  const [used, setUsed] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getScanMode().then(setMode);
    getScansUsedThisMonth().then(setUsed);
  }, [settingsVersion]);

  const start = useCallback(
    async (source: 'camera' | 'library') => {
      setError(null);
      if (mode === 'none') {
        setError('To read real receipts, add your Anthropic API key in Settings (it stays on this device). Or try the demo receipt below.');
        return;
      }
      try {
        const photo = await pickReceiptPhoto(source);
        if (!photo) return;
        setPreview(photo.uri);
        setBusy(true);
        const { receipt } = await scanReceipt(photo.input);
        setUsed(await getScansUsedThisMonth());
        onScanned(receipt);
      } catch (e) {
        setError(e instanceof ScanError || e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setBusy(false);
      }
    },
    [mode, onScanned],
  );

  return (
    <View style={{ gap: space(5) }}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>RECEIPT SPLITTER</Text>
        <Text style={styles.heroTitle}>Snap the bill.{'\n'}Split it fairly.</Text>
        <Text style={styles.heroSub}>
          AI reads every item. Everyone taps what they ate. Tax and tip are shared in proportion, down to the cent.
        </Text>
      </View>

      {busy && preview ? (
        <Card style={{ alignItems: 'center', gap: space(3) }}>
          <Image source={{ uri: preview }} style={styles.preview} resizeMode="cover" />
          <Text style={font.h2}>Reading your receipt…</Text>
          <Text style={font.small}>This usually takes a few seconds.</Text>
        </Card>
      ) : null}

      {error ? <Banner tone="error">{error}</Banner> : null}

      <View style={{ gap: space(3) }}>
        <Button
          label={Platform.OS === 'web' ? 'Take or upload a photo' : 'Take a photo'}
          icon="📷"
          loading={busy}
          onPress={() => start('camera')}
        />
        <Button label="Choose from library" icon="🖼️" variant="secondary" disabled={busy} onPress={() => start('library')} />
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={font.small}>or</Text>
        <View style={styles.divider} />
      </View>

      <View style={{ flexDirection: 'row', gap: space(3) }}>
        <Button label="Try a demo receipt" variant="secondary" small style={{ flex: 1 }} onPress={() => onScanned(SAMPLE_RECEIPT)} />
        <Button label="Type items in" variant="secondary" small style={{ flex: 1 }} onPress={onManual} />
      </View>

      <Card style={{ gap: space(2), backgroundColor: colors.brandSoft, borderColor: colors.brandSoft }}>
        <Text style={[font.small, { color: colors.brand, fontWeight: '700' }]}>
          {mode === 'server'
            ? `Free plan · ${Math.max(0, FREE_SCANS_PER_MONTH - used)} of ${FREE_SCANS_PER_MONTH} scans left this month`
            : mode === 'byok'
              ? 'Scanning with your own Anthropic key · unlimited'
              : 'AI scanning is off'}
        </Text>
        <Text style={[font.small, { color: colors.brand }]}>
          {mode === 'none'
            ? 'Paste an Anthropic API key in Settings to scan real receipts. The key is stored only on this device.'
            : 'Photos are only used to read the receipt. They are never stored.'}
        </Text>
        <Button label="Settings" icon="⚙️" variant="ghost" small style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} onPress={onOpenSettings} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space(2), paddingTop: space(2) },
  kicker: { fontSize: 12, letterSpacing: 2, fontWeight: '800', color: colors.accent },
  heroTitle: { fontSize: 36, lineHeight: 40, fontWeight: '900', color: colors.ink, letterSpacing: -1 },
  heroSub: { fontSize: 16, lineHeight: 23, color: colors.inkSoft },
  preview: { width: 120, height: 160, borderRadius: radius.md, backgroundColor: colors.line },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  divider: { flex: 1, height: 1, backgroundColor: colors.line },
});
