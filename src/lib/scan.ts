import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { RECEIPT_PROMPT, ReceiptSchema, toScannedReceipt } from './receiptSchema';
import { getApiKey, getDeviceId, getScansUsedThisMonth, setScansUsedThisMonth, FREE_SCANS_PER_MONTH } from './storage';
import type { ScannedReceipt } from './types';

export const MODEL = 'claude-opus-5-5';

/**
 * Where receipt photos get read:
 *  - "server": the Supabase Edge Function (EXPO_PUBLIC_SCAN_URL). The API key
 *    lives on the server and the server enforces the 5-free-scans-per-month limit.
 *  - "byok":   "bring your own key". The user pasted their own Anthropic key in
 *    Settings, and the app calls Claude directly. Handy for the public web demo.
 *  - "none":   neither is set up; the user can still try the demo receipt or type items in.
 */
export type ScanMode = 'server' | 'byok' | 'none';

const SCAN_URL = process.env.EXPO_PUBLIC_SCAN_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function getScanMode(): Promise<ScanMode> {
  if (await getApiKey()) return 'byok';
  if (SCAN_URL) return 'server';
  return 'none';
}

export class ScanError extends Error {
  constructor(
    message: string,
    public code: 'limit' | 'not_receipt' | 'auth' | 'network' | 'unknown' = 'unknown',
  ) {
    super(message);
  }
}

export type ScanInput = { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' };

export async function scanReceipt(image: ScanInput): Promise<{ receipt: ScannedReceipt; scansLeft: number | null }> {
  const mode = await getScanMode();
  let receipt: ScannedReceipt;
  let scansLeft: number | null = null;

  if (mode === 'byok') {
    receipt = await scanWithOwnKey(image, (await getApiKey())!);
  } else if (mode === 'server') {
    ({ receipt, scansLeft } = await scanWithServer(image));
    await setScansUsedThisMonth(FREE_SCANS_PER_MONTH - (scansLeft ?? FREE_SCANS_PER_MONTH));
  } else {
    throw new ScanError('Scanning is not set up yet. Add your Anthropic API key in Settings, or try the demo receipt.', 'auth');
  }

  if (receipt.items.length === 0) {
    throw new ScanError("Couldn't find any items. Is that a receipt? Try a sharper, flatter photo.", 'not_receipt');
  }
  return { receipt, scansLeft };
}

async function scanWithServer(image: ScanInput) {
  const deviceId = await getDeviceId();
  let res: Response;
  try {
    res = await fetch(SCAN_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY } : {}),
      },
      body: JSON.stringify({ image: image.base64, mediaType: image.mediaType, deviceId }),
    });
  } catch {
    throw new ScanError('No connection. Check your internet and try again.', 'network');
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 429) {
    throw new ScanError(`You've used your ${FREE_SCANS_PER_MONTH} free scans this month. Upgrade to Pro for unlimited scans.`, 'limit');
  }
  if (!res.ok) throw new ScanError(body?.error ?? `Scan failed (${res.status}).`);
  return { receipt: body.receipt as ScannedReceipt, scansLeft: (body.scansLeft as number) ?? null };
}

async function scanWithOwnKey(image: ScanInput, apiKey: string): Promise<ScannedReceipt> {
  // The key never leaves this device except to go straight to api.anthropic.com.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // if a safety classifier declines, retry on a fallback model
      output_config: { format: betaZodOutputFormat(ReceiptSchema) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: RECEIPT_PROMPT },
          ],
        },
      ],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      throw new ScanError("The AI couldn't read this image. Try another photo.", 'not_receipt');
    }
    return toScannedReceipt(response.parsed_output);
  } catch (err) {
    if (err instanceof ScanError) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new ScanError('That API key was rejected. Check it in Settings.', 'auth');
    if (err instanceof Anthropic.RateLimitError) throw new ScanError('Too many requests right now. Wait a moment and retry.', 'limit');
    if (err instanceof Anthropic.APIConnectionError) throw new ScanError('No connection to the AI service. Try again.', 'network');
    if (err instanceof Anthropic.APIError) throw new ScanError(`AI service error: ${err.message}`);
    throw new ScanError('Something went wrong while reading the receipt.');
  }
}

export async function getScansUsed() {
  return getScansUsedThisMonth();
}
