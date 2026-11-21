// SplitSnap · scan-receipt Edge Function (Deno, Supabase)
//
// POST { image: <base64 JPEG/PNG/WebP>, mediaType: "image/jpeg", deviceId: "<uuid>" }
//  → 200 { receipt: ScannedReceipt, scansLeft: number }
//  → 429 { error } when the device used its free scans this month
//
// Secrets (supabase secrets set ...):
//   ANTHROPIC_API_KEY       required
//   FREE_SCANS_PER_MONTH    optional, default 5
//   PRO_DEVICE_IDS          optional, comma-separated device IDs with unlimited scans
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import Anthropic from 'npm:@anthropic-ai/sdk@1.12.0';
import { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@1.12.0/helpers/beta/zod';
import { z } from 'npm:zod@4.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-opus-5-5';
const FREE_LIMIT = Number(Deno.env.get('FREE_SCANS_PER_MONTH') ?? '5');
const PRO_DEVICES = new Set((Deno.env.get('PRO_DEVICE_IDS') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Keep in sync with src/lib/receiptSchema.ts
const ReceiptSchema = z.object({
  merchant: z.string(),
  currency: z.string(),
  items: z.array(z.object({ name: z.string(), quantity: z.number().int(), line_total_cents: z.number().int() })),
  subtotal_cents: z.number().int().nullable(),
  tax_cents: z.number().int(),
  tip_cents: z.number().int(),
  total_cents: z.number().int().nullable(),
});

const PROMPT = `Read this receipt photo and extract it as JSON.
- merchant: store/restaurant name ("" if not visible). currency: ISO 4217 code (default USD).
- items: every purchased item with quantity (1 if not printed) and final line price in cents. If a discount belongs to an item, subtract it; otherwise add it as an item with a negative price. Exclude subtotal, tax, tip, total, payment and change lines.
- tax_cents: all taxes and mandatory fees/service charges (0 if none).
- tip_cents: any printed or handwritten tip (0 if none).
- If the image is not a receipt, return an empty items list.`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { image?: string; mediaType?: string; deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { image, deviceId } = body;
  const mediaType = (['image/jpeg', 'image/png', 'image/webp'].includes(body.mediaType ?? '') ? body.mediaType : 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp';

  if (!image || typeof image !== 'string') return json({ error: 'Missing image' }, 400);
  if (!deviceId || !/^[0-9a-f-]{16,64}$/i.test(deviceId)) return json({ error: 'Missing deviceId' }, 400);
  if ((image.length * 3) / 4 > MAX_IMAGE_BYTES) return json({ error: 'Image too large (max 5 MB)' }, 413);

  // ---- Free-tier limit (atomic claim, refunded on failure) ----
  const month = new Date().toISOString().slice(0, 7);
  const isPro = PRO_DEVICES.has(deviceId);
  let used = 0;
  if (!isPro) {
    const { data, error } = await db.rpc('claim_scan', { p_device: deviceId, p_month: month, p_limit: FREE_LIMIT });
    if (error) return json({ error: 'Usage check failed' }, 500);
    if (data === -1) return json({ error: 'Free scan limit reached', scansLeft: 0 }, 429);
    used = data as number;
  }
  const refund = () => (isPro ? Promise.resolve() : db.rpc('refund_scan', { p_device: deviceId, p_month: month }));

  // ---- Ask Claude to read the receipt ----
  try {
    const response = await anthropic.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { format: betaZodOutputFormat(ReceiptSchema) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const r = response.parsed_output;
    if (response.stop_reason === 'refusal' || !r) {
      await refund();
      return json({ error: "Couldn't read this image. Try another photo." }, 422);
    }

    const receipt = {
      merchant: r.merchant ?? '',
      currency: (r.currency || 'USD').toUpperCase().slice(0, 3),
      items: r.items.map((it) => ({
        name: it.quantity > 1 ? `${it.name} ×${it.quantity}` : it.name,
        priceCents: Math.round(it.line_total_cents),
      })),
      subtotalCents: r.subtotal_cents,
      taxCents: Math.round(r.tax_cents ?? 0),
      tipCents: Math.round(r.tip_cents ?? 0),
      totalCents: r.total_cents,
    };
    if (receipt.items.length === 0) await refund(); // not a receipt: don't count it

    return json({ receipt, scansLeft: isPro ? 9999 : Math.max(0, FREE_LIMIT - (receipt.items.length ? used : used - 1)) });
  } catch (err) {
    await refund();
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'AI is busy, please retry in a moment.' }, 503);
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic error', err.status, err.message);
      return json({ error: 'AI service error. Please try again.' }, 502);
    }
    console.error(err);
    return json({ error: 'Unexpected error' }, 500);
  }
});
