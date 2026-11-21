import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { formatCents } from './money';
import type { Bill, SplitResult } from './types';

/** Plain-text summary that reads well in iMessage, WhatsApp, Slack… */
export function buildShareText(bill: Bill, result: SplitResult): string {
  const payer = bill.people.find((p) => p.id === bill.payerId);
  const fmt = (c: number) => formatCents(c, bill.currency);
  const lines = [
    `🧾 ${bill.merchant || 'Our bill'} — split with SplitSnap`,
    `Total ${fmt(result.grandTotalCents)} (food ${fmt(result.subtotalCents)} + tax ${fmt(result.taxCents)} + tip ${fmt(result.tipCents)})`,
    '',
  ];
  for (const s of result.shares) {
    if (payer && s.personId === payer.id) continue;
    if (s.totalCents === 0) continue;
    lines.push(payer ? `• ${s.name} owes ${payer.name} ${fmt(s.totalCents)}` : `• ${s.name}: ${fmt(s.totalCents)}`);
  }
  if (payer) {
    const own = result.shares.find((s) => s.personId === payer.id);
    lines.push(`• ${payer.name} paid (their share: ${fmt(own?.totalCents ?? 0)})`);
  }
  lines.push('', 'Tax & tip split in proportion to what each person ordered.');
  return lines.join('\n');
}

/** Returns 'shared' | 'copied' so the UI can show the right confirmation. */
export async function shareText(text: string): Promise<'shared' | 'copied'> {
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.share) {
      try {
        await nav.share({ text });
        return 'shared';
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return 'shared';
      }
    }
    await Clipboard.setStringAsync(text);
    return 'copied';
  }
  await Share.share({ message: text });
  return 'shared';
}

/** Share a captured PNG (file URI on native, data URI on web). */
export async function shareImage(uri: string): Promise<'shared' | 'downloaded'> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const file = new File([blob], 'splitsnap.png', { type: 'image/png' });
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'SplitSnap' });
        return 'shared';
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return 'shared';
      }
    }
    const a = document.createElement('a');
    a.href = uri;
    a.download = 'splitsnap.png';
    a.click();
    return 'downloaded';
  }
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share the split' });
  return 'shared';
}
