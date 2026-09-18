// Incenso Studio — Send SMS Hook for Supabase Auth.
//
// Supabase Auth calls this whenever it needs to deliver a phone sign-in code.
// It replaces the built-in SMS sender so we can use MessageBird / Bird and,
// later, WhatsApp — without ever putting the provider key in the website.
//
// Channels are chosen by the OTP_CHANNELS env var (comma-separated, in order):
//   "sms"            → SMS only (default; live today)
//   "whatsapp,sms"   → try WhatsApp first, fall back to SMS  (turn on later)
//   "whatsapp"       → WhatsApp only
// The WhatsApp path only runs once its env vars are set, so it stays dormant
// until your WhatsApp Business template is approved by Meta.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   SEND_SMS_HOOK_SECRET   the Standard-Webhooks secret shown when you enable
//                          the Send SMS hook (starts with "v1,whsec_")
//   MESSAGEBIRD_API_KEY    your MessageBird/Bird live access key
//   MESSAGEBIRD_ORIGINATOR sender name or number shown to the customer
//                          (e.g. "Incenso"); optional, defaults to "Incenso"
// Optional:
//   OTP_CHANNELS           default "sms"
//   OTP_MESSAGE            message text, must contain {code}; sensible default
// WhatsApp (set these only when your Meta template is approved):
//   MESSAGEBIRD_WA_CHANNEL_ID   the WhatsApp channel id in MessageBird
//   MESSAGEBIRD_WA_NAMESPACE    the template namespace
//   MESSAGEBIRD_WA_TEMPLATE     the approved authentication template name
//   MESSAGEBIRD_WA_LOCALE       template language code, default "en"

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const rawSecret = Deno.env.get('SEND_SMS_HOOK_SECRET') ?? ''
// Supabase can hold several secrets separated by "|" (for key rotation).
const hookSecrets = rawSecret.split('|').map((s) => s.trim().replace('v1,whsec_', '')).filter(Boolean)

const MB_KEY = Deno.env.get('MESSAGEBIRD_API_KEY') ?? ''
const MB_FROM = Deno.env.get('MESSAGEBIRD_ORIGINATOR') || 'Incenso'
const CHANNELS = (Deno.env.get('OTP_CHANNELS') || 'sms').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
const MSG_TEMPLATE = Deno.env.get('OTP_MESSAGE') || 'Your Incenso Studio code is {code}. It expires in 10 minutes. If this wasn’t you, ignore this message.';

// WhatsApp (dormant until these are set)
const WA_CHANNEL = Deno.env.get('MESSAGEBIRD_WA_CHANNEL_ID') || ''
const WA_NAMESPACE = Deno.env.get('MESSAGEBIRD_WA_NAMESPACE') || ''
const WA_TEMPLATE = Deno.env.get('MESSAGEBIRD_WA_TEMPLATE') || ''
const WA_LOCALE = Deno.env.get('MESSAGEBIRD_WA_LOCALE') || 'en'

const digits = (p: string) => String(p || '').replace(/\D/g, '');

const fail = (message: string, code = 500) =>
  new Response(JSON.stringify({ error: { http_code: code, message } }), {
    status: code, headers: { 'Content-Type': 'application/json' },
  });

// ---- SMS via MessageBird REST ----
async function sendSms(to: string, body: string): Promise<void> {
  const res = await fetch('https://rest.messagebird.com/messages', {
    method: 'POST',
    headers: { 'Authorization': `AccessKey ${MB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ originator: MB_FROM, recipients: [to], body }),
  });
  if (res.status < 200 || res.status >= 300) {
    const txt = await res.text();
    throw new Error(`MessageBird SMS ${res.status}: ${txt}`);
  }
}

// ---- WhatsApp via MessageBird Conversations API (template message) ----
async function sendWhatsApp(to: string, code: string): Promise<void> {
  if (!WA_CHANNEL || !WA_NAMESPACE || !WA_TEMPLATE) throw new Error('WhatsApp not configured');
  const res = await fetch('https://conversations.messagebird.com/v1/send', {
    method: 'POST',
    headers: { 'Authorization': `AccessKey ${MB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: '+' + to,
      from: WA_CHANNEL,
      type: 'hsm',
      content: {
        hsm: {
          namespace: WA_NAMESPACE,
          templateName: WA_TEMPLATE,
          language: { policy: 'deterministic', code: WA_LOCALE },
          params: [{ default: code }],
        },
      },
    }),
  });
  if (res.status < 200 || res.status >= 300) {
    const txt = await res.text();
    throw new Error(`MessageBird WhatsApp ${res.status}: ${txt}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('not allowed', 405);
  if (!hookSecrets.length) return fail('SEND_SMS_HOOK_SECRET not set', 500);
  if (!MB_KEY) return fail('MESSAGEBIRD_API_KEY not set', 500);

  // 1) Verify the request truly came from Supabase Auth (Standard Webhooks signature)
  const raw = await req.text();
  const headers = Object.fromEntries(req.headers);
  let payload: any = null;
  for (const secret of hookSecrets) {
    try { payload = new Webhook(secret).verify(raw, headers); break; } catch (_e) { /* try next */ }
  }
  if (!payload) return fail('invalid signature', 401);

  const to = digits(payload?.user?.phone || '');
  const code = String(payload?.sms?.otp || '');
  if (!to || !code) return fail('missing phone or otp', 400);

  const body = MSG_TEMPLATE.replace('{code}', code);

  // 2) Try each configured channel in order; succeed on the first that delivers.
  const errors: string[] = [];
  for (const ch of CHANNELS) {
    try {
      if (ch === 'sms') { await sendSms(to, body); return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); }
      if (ch === 'whatsapp') { await sendWhatsApp(to, code); return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); }
    } catch (e) {
      errors.push(`${ch}: ${e instanceof Error ? e.message : String(e)}`);
      console.error('[Incenso OTP]', ch, 'failed:', e);
    }
  }
  return fail('all channels failed — ' + errors.join(' | '), 500);
});
