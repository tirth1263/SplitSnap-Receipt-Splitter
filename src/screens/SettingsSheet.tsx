import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, Card, Field } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';
import { getApiKey, setApiKey } from '../lib/storage';

type Props = { visible: boolean; onClose: (changed: boolean) => void };

export function SettingsSheet({ visible, onClose }: Props) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (visible) getApiKey().then((k) => setSaved(k));
  }, [visible]);

  const save = async () => {
    await setApiKey(key);
    setKey('');
    onClose(true);
  };
  const clear = async () => {
    await setApiKey(null);
    setSaved(null);
    onClose(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => onClose(false)}>
      <Pressable style={styles.backdrop} onPress={() => onClose(false)} accessibilityLabel="Close settings" />
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ gap: space(4), padding: space(5) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={font.title}>Settings</Text>
            <Button label="Done" variant="ghost" small onPress={() => onClose(false)} />
          </View>

          <Card style={{ gap: space(3) }}>
            <Text style={font.h2}>AI receipt scanning</Text>
            <Text style={[font.small, { lineHeight: 20 }]}>
              SplitSnap reads receipts with Claude, Anthropic's vision AI. The app is free and open source. To scan, paste your own Anthropic API key
              (each scan costs well under a cent). The key is saved only on this device and sent only to api.anthropic.com.
            </Text>
            {saved ? (
              <Banner>Key saved: {saved.slice(0, 10)}…{saved.slice(-4)}</Banner>
            ) : null}
            <Field
              label={saved ? 'Replace key' : 'Anthropic API key'}
              placeholder="sk-ant-..."
              value={key}
              onChangeText={setKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <Button label="Save key" small style={{ flex: 1 }} disabled={!key.trim()} onPress={save} />
              {saved ? <Button label="Remove" small variant="danger" style={{ flex: 1 }} onPress={clear} /> : null}
            </View>
            <Pressable onPress={() => Linking.openURL('https://platform.claude.com/settings/keys')}>
              <Text style={{ color: colors.brand, fontWeight: '700' }}>Get an API key ↗</Text>
            </Pressable>
          </Card>

          <Card style={{ gap: space(2) }}>
            <Text style={font.h2}>SplitSnap Pro (coming soon)</Text>
            <Text style={[font.small, { lineHeight: 20 }]}>
              Free: 5 scans a month on the hosted service. Pro: unlimited scans, saved history, and one-tap Venmo / PayPal request links, for a
              small yearly fee.
            </Text>
          </Card>

          <Text style={[font.small, { textAlign: 'center' }]}>No accounts. No tracking. Splits are calculated on your device.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,32,27,0.45)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
});
