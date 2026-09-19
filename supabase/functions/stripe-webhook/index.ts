// Stripe webhook: verifies the signature and marks the order / gift / booking paid.
//
// IMPORTANT: this function MUST be deployed with verify_jwt = FALSE. Stripe signs
// requests with its own header (checked below), not a Supabase JWT, so leaving
// Supabase's JWT gate on makes the platform reject every Stripe call before this
// code runs — silently breaking all card payments.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function verify(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts: Record<string, string> = {}
    for (const kv of sigHeader.split(',')) { const [k, v] = kv.split('='); if (k && v) parts[k.trim()] = v.trim() }
    const t = parts['t']; const v1 = parts['v1']
    if (!t || !v1) return false
    // reject very old timestamps (5 min tolerance)
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`))
    const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
    if (hex.length !== v1.length) return false
    let ok = 0
    for (let i = 0; i < hex.length; i++) ok |= hex.charCodeAt(i) ^ v1.charCodeAt(i)
    return ok === 0
  } catch (_e) { return false }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 })
  const sig = req.headers.get('stripe-signature') || ''
  const raw = await req.text()

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: secrets } = await admin.from('app_secrets').select('name, value').in('name', ['stripe_webhook_secret'])
  const whsec = Object.fromEntries((secrets ?? []).map((s: any) => [s.name, s.value]))['stripe_webhook_secret']
  if (!whsec) return new Response('not configured', { status: 500 })
  if (!(await verify(raw, sig, whsec))) return new Response('bad signature', { status: 400 })

  let event: any
  try { event = JSON.parse(raw) } catch (_e) { return new Response('bad json', { status: 400 }) }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const s = event.data.object
      if (s.payment_status === 'paid') {
        const kind = s.metadata?.kind
        const ref = s.metadata?.ref || s.client_reference_id
        await admin.from('payments').update({
          status: 'paid', stripe_payment_intent: s.payment_intent || null, raw: event,
        }).eq('stripe_session_id', s.id)

        if (kind === 'order' && ref) {
          // A paid pickup order is ready to collect right away (fires the pickup message);
          // a shipped one goes to preparing until it's handed to a courier.
          const { data: o } = await admin.from('orders').select('method').eq('ref', ref).maybeSingle()
          const pickup = !o || String(o.method || '') !== 'Shipped'
          await admin.from('orders').update({ pay_status: 'paid', status: pickup ? 'Ready for pickup' : 'Paid · preparing' }).eq('ref', ref)
        } else if (kind === 'booking' && ref) {
          const isTopup = s.metadata?.topup === '1'
          const { data: b } = await admin.from('bookings').select('paid, due, extra').eq('ref', ref).maybeSingle()
          if (isTopup) {
            // Top-ups are tracked in `extra` (an array of {amount,pay,status}) and shown
            // separately — don't fold them into `paid`. The card checkout covered every
            // pending card top-up, so mark them all paid; leave Whish/OMT top-ups pending.
            const raw = b && b.extra
            const arr = Array.isArray(raw) ? raw : (raw && raw.amount ? [raw] : [])
            const next = arr.map((e: any) => (e && e.status === 'pending' && /card/i.test(String(e.pay || '')) ? { ...e, status: 'paid' } : e))
            await admin.from('bookings').update({ pay_status: 'paid', status: 'Upcoming', extra: next }).eq('ref', ref)
          } else {
            const paid = (Number(b?.paid) || 0) + (Number(b?.due) || 0)
            await admin.from('bookings').update({ pay_status: 'paid', status: 'Upcoming', paid, due: 0 }).eq('ref', ref)
          }
        } else if (kind === 'gift' && ref) {
          await admin.from('gift_cards').update({ status: 'Active', confirmed: true }).eq('code', ref)
        }
      }
    } else if (event.type === 'checkout.session.expired') {
      const s = event.data.object
      await admin.from('payments').update({ status: 'expired' }).eq('stripe_session_id', s.id)
    }
  } catch (e) {
    // Log but still 200 so Stripe doesn't hammer retries on a transient DB blip.
    console.error('[stripe-webhook]', e)
  }
  return new Response('ok', { status: 200 })
})
