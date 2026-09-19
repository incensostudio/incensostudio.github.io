// Incenso Studio — Send SMS Hook for Supabase Auth (delivers over WhatsApp via Bird).
//
// Supabase Auth calls this whenever it needs to deliver a phone sign-in code.
// It replaces Supabase's built-in sender and delivers the code over WhatsApp
// using Bird's approved authentication template ("bird_otp").
//
// Required secrets (Supabase -> Edge Functions -> send-sms-otp -> Secrets):
//   SEND_SMS_HOOK_SECRET   Standard-Webhooks secret from the Send SMS hook
//                          (starts with "v1,whsec_")
//   BIRD_API_KEY           your Bird workspace API key (starts with "bk_")
// Optional:
//   BIRD_REGION            region from the key prefix; default "eu1"
//   BIRD_WA_TEMPLATE_SLUG  approved template slug; default "bird_otp"
//   BIRD_WA_LANG           template language code; default "en"
//
// The WhatsApp sender ("from") is read from app_secrets.bird_from — the studio's
// approved WhatsApp Business number in E.164. Once a real number is connected,
// Bird REQUIRES `from` on every send (error E15017 without it). Falls back to the
// BIRD_WA_FROM env var, then to Bird auto-selecting the sender if neither is set.
// NOTE: bird_otp is a Bird-managed template whose sender Bird fixes, so `from` is
// not applied to it (Bird rejects `from` on managed templates, E15018). It only
// takes effect if BIRD_WA_TEMPLATE_SLUG is pointed at a custom auth template.

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// The approved WhatsApp Business sender number (E.164). Single source of truth in
// app_secrets so it matches send_wa; cached per cold start.
let _from: string | null = null;
async function senderFrom(): Promise<string> {
  if (_from !== null) return _from;
  try {
    const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      const admin = createClient(url, key);
      const { data } = await admin.from('app_secrets').select('value').eq('name', 'bird_from').maybeSingle();
      if (data && data.value) { _from = String(data.value); return _from; }
    }
  } catch (_e) { /* fall through */ }
  _from = Deno.env.get('BIRD_WA_FROM') || '';
  return _from;
}

// Deliver the code over WhatsApp using Bird's approved authentication template.
async function sendWhatsApp(to: string, code: string): Promise<void> {
  const from = await senderFrom();
  const body: any = {
    to: '+' + to,
    template: {
      slug: TEMPLATE,
      language: LANG,
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
      ],
    },
  };
  // Bird-managed templates (slug starts with 'bird_') fix their own sender and reject `from`.
  if (from && !TEMPLATE.startsWith('bird_')) body.from = from;
  const res = await fetch(BIRD_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BIRD_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
