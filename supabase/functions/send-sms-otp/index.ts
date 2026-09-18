// Incenso Studio — Send SMS Hook for Supabase Auth (Bird / MessageBird).
//
// Supabase Auth calls this whenever it needs to deliver a phone sign-in code.
// It replaces Supabase's built-in SMS sender (whose MessageBird option is
// currently broken with modern "bk_" keys) and talks to Bird's current API
// directly. SMS works today; WhatsApp is wired but dormant until its channel
// + template env vars are set.
//
// Channels are chosen by OTP_CHANNELS (comma-separated, in order):
//   "sms"          → SMS only (default; live today)
//   "whatsapp,sms" → try WhatsApp first, fall back to SMS (turn on later)
//   "whatsapp"     → WhatsApp only
//
// Required secrets (Supabase → Edge Functions → send-sms-otp → Secrets):
//   SEND_SMS_HOOK_SECRET   Standard-Webhooks secret from the Send SMS hook
//                          (starts with "v1,whsec_")
//   BIRD_API_KEY           your Bird access key (starts with "bk_")
//   BIRD_WORKSPACE_ID      Bird workspace ID (a UUID)
//   BIRD_SMS_CHANNEL_ID    the SMS channel ID (a UUID) from Bird
// Optional:
//   OTP_CHANNELS           default "sms"
//   OTP_MESSAGE            message text; must contain {code}
// WhatsApp (set only when your Bird WhatsApp channel + template are approved):
//   BIRD_WA_CHANNEL_ID          WhatsApp channel ID (UUID)
//   BIRD_WA_TEMPLATE_PROJECT_ID approved authentication template's project ID
//   BIRD_WA_TEMPLATE_VERSION    template version ID (optional)
//   BIRD_WA_LOCALE              template language code, default "en"

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const rawSecret = Deno.env.get('SEND_SMS_HOOK_SECRET') ?? ''
const hookSecrets = rawSecret.split('|').map((s) => s.trim().replace('v1,whsec_', '')).filter(Boolean)

// Accept either name for the key so it's forgiving to set up.
const BIRD_KEY = Deno.env.get('BIRD_API_KEY') || Deno.env.get('MESSAGEBIRD_API_KEY') || ''
const WORKSPACE = Deno.env.get('BIRD_WORKSPACE_ID') || ''
const SMS_CHANNEL = Deno.env.get('BIRD_SMS_CHANNEL_ID') || ''
const CHANNELS = (Deno.env.get('OTP_CHANNELS') || 'sms').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
const MSG_TEMPLATE = Deno.env.get('OTP_MESSAGE') || 'Your Incenso Studio code is {code}. It expires in a few minutes. If this wasn’t you, ignore this message.';

// WhatsApp (dormant until these are set)
const WA_CHANNEL = Deno.env.get('BIRD_WA_CHANNEL_ID') || ''
const WA_TEMPLATE = Deno.env.get('BIRD_WA_TEMPLATE_PROJECT_ID') || ''
const WA_VERSION = Deno.env.get('BIRD_WA_TEMPLATE_VERSION') || ''
const WA_LOCALE = Deno.env.get('BIRD_WA_LOCALE') || 'en'

const digits = (p: string) => String(p || '').replace(/\D/g, '');
const e164 = (p: string) => '+' + digits(p);

const fail = (message: string, code = 500) =>
  new Response(JSON.stringify({ error: { http_code: code, message } }), {
    status: code, headers: { 'Content-Type': 'application/json' },
  });

const birdUrl = (channelId: string) =>
  `https://api.bird.com/workspaces/${WORKSPACE}/channels/${channelId}/messages`;

// ---- SMS via Bird Channels API ----
async function sendSms(to: string, body: string): Promise<void> {
  if (!WORKSPACE || !SMS_CHANNEL) throw new Error('BIRD_WORKSPACE_ID or BIRD_SMS_CHANNEL_ID not set');
  const res = await fetch(birdUrl(SMS_CHANNEL), {
    method: 'POST',
    headers: { 'Authorization': `AccessKey ${BIRD_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receiver: { contacts: [{ identifierValue: e164(to) }] },
      body: { type: 'text', text: { text: body } },
    }),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Bird SMS ${res.status}: ${await res.text()}`);
  }
}

// ---- WhatsApp via Bird Channels API (approved template) ----
async function sendWhatsApp(to: string, code: string): Promise<void> {
  if (!WORKSPACE || !WA_CHANNEL || !WA_TEMPLATE) throw new Error('WhatsApp not configured');
  const template: Record<string, unknown> = {
    projectId: WA_TEMPLATE,
    locale: WA_LOCALE,
    parameters: [{ type: 'string', key: 'code', value: code }],
  };
  if (WA_VERSION) template.version = WA_VERSION;
  const res = await fetch(birdUrl(WA_CHANNEL), {
    method: 'POST',
    headers: { 'Authorization': `AccessKey ${BIRD_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receiver: { contacts: [{ identifierValue: e164(to) }] },
      template,
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
