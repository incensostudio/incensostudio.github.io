// Incenso Studio — Send SMS Hook for Supabase Auth (delivers over WhatsApp via Bird).
//
// Supabase Auth calls this whenever it needs to deliver a phone sign-in code.
// It replaces Supabase's built-in sender and delivers the code over WhatsApp
// using Bird's approved authentication template ("bird_otp"). Confirmed working
// against Bird's regional API (eu1.platform.bird.com) with a real device.
//
// Required secrets (Supabase -> Edge Functions -> send-sms-otp -> Secrets):
//   SEND_SMS_HOOK_SECRET   Standard-Webhooks secret from the Send SMS hook
//                          (starts with "v1,whsec_")
//   BIRD_API_KEY           your Bird workspace API key (starts with "bk_")
// Optional:
//   BIRD_REGION            region from the key prefix; default "eu1"
//   BIRD_WA_TEMPLATE_SLUG  approved template slug; default "bird_otp"
//   BIRD_WA_LANG           template language code; default "en"

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const rawSecret = Deno.env.get('SEND_SMS_HOOK_SECRET') ?? ''
const hookSecrets = rawSecret.split('|').map((s) => s.trim().replace('v1,whsec_', '')).filter(Boolean)

const BIRD_KEY = Deno.env.get('BIRD_API_KEY') || ''
const REGION = Deno.env.get('BIRD_REGION') || 'eu1';
const TEMPLATE = Deno.env.get('BIRD_WA_TEMPLATE_SLUG') || 'bird_otp';
const LANG = Deno.env.get('BIRD_WA_LANG') || 'en';
const BIRD_URL = `https://${REGION}.platform.bird.com/v1/whatsapp/messages`;

const digits = (p: string) => String(p || '').replace(/\D/g, '');

const fail = (message: string, code = 500) =>
  new Response(JSON.stringify({ error: { http_code: code, message } }), {
    status: code, headers: { 'Content-Type': 'application/json' },
  });

// Deliver the code over WhatsApp using Bird's approved authentication template.
async function sendWhatsApp(to: string, code: string): Promise<void> {
  const res = await fetch(BIRD_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BIRD_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: '+' + to,
      template: {
        slug: TEMPLATE,
        language: LANG,
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Bird WhatsApp ${res.status}: ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('not allowed', 405);
  if (!hookSecrets.length) return fail('SEND_SMS_HOOK_SECRET not set', 500);
  if (!BIRD_KEY) return fail('BIRD_API_KEY not set', 500);

  // 1) Verify the request really came from Supabase Auth (Standard Webhooks signature)
  const raw = await req.text();
  const headers = Object.fromEntries(req.headers);
  let payload: any = null;
  for (const secret of hookSecrets) {
    try { payload = new Webhook(secret).verify(raw, headers); break; } catch (_e) { /* try next secret */ }
  }
  if (!payload) return fail('invalid signature', 401);

  const to = digits(payload?.user?.phone || '');
  const code = String(payload?.sms?.otp || '');
  if (!to || !code) return fail('missing phone or otp', 400);

  try {
    await sendWhatsApp(to, code);
  } catch (e) {
    console.error('[Incenso OTP] WhatsApp send failed:', e);
    return fail('whatsapp send failed: ' + (e instanceof Error ? e.message : String(e)), 500);
  }
  return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
});
