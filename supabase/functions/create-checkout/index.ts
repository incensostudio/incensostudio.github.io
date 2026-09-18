// Creates a Stripe Checkout Session for an order / gift card / booking.
// The amount is taken from the row already saved in the database (never from the
// browser) and clamped to a catalogue maximum. Card details never touch our site.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}
const clamp = (amount: number, cap: number) => (cap && cap > 0 ? Math.min(amount, cap) : amount)

// The row is saved by the browser's background write, which may land a moment
// after this call. Retry a few times before giving up.
async function readRow(admin: any, table: string, col: string, val: string, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const { data } = await admin.from(table).select('*').eq(col, val).maybeSingle()
    if (data) return data
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

async function orderCap(admin: any, items: any[]) {
  try {
    const names = (items || []).map((i) => i.name).filter(Boolean)
    if (!names.length) return 0
    const { data } = await admin.from('web_products').select('name, price').in('name', names)
    const price: Record<string, number> = Object.fromEntries((data ?? []).map((p: any) => [p.name, p.price]))
    let cap = 0
    for (const it of items) cap += (price[it.name] ?? it.price ?? 0) * (it.q ?? 1)
    return cap + 5 // allow for shipping
  } catch (_e) { return 0 }
}
async function bookingCap(admin: any, services: string[]) {
  try {
    if (!services || !services.length) return 0
    const { data } = await admin.from('web_services').select('name, price').in('name', services)
    const price: Record<string, number> = Object.fromEntries((data ?? []).map((s: any) => [s.name, s.price]))
    let cap = 0
    for (const n of services) cap += price[n] ?? 0
    return cap
  } catch (_e) { return 0 }
}
async function profileEmail(admin: any, uid: string | null | undefined) {
  if (!uid) return null
  try {
    const { data } = await admin.from('profiles').select('email').eq('id', uid).maybeSingle()
    return data && data.email ? data.email : null
  } catch (_e) { return null }
}
// Gift rows carry buyer_phone but not always a buyer_id — fall back to matching the
// profile by phone so the buyer's e-mail is prefilled on Stripe just like orders/bookings.
async function profileEmailByPhone(admin: any, phone: string | null | undefined) {
  if (!phone) return null
  try {
    const d = String(phone).replace(/\D/g, '')
    if (d.length < 6) return null
    const { data } = await admin.from('profiles').select('email, phone').not('email', 'is', null).limit(500)
    const hit = (data ?? []).find((p: any) => {
      const pd = String(p.phone || '').replace(/\D/g, '')
      return pd.length >= 6 && (pd === d || pd.endsWith(d) || d.endsWith(pd))
    })
    return hit && hit.email ? hit.email : null
  } catch (_e) { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  try {
    const { kind, ref, origin } = await req.json()
    if (!['order', 'gift', 'booking'].includes(kind) || !ref) return json({ error: 'bad request' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: secrets } = await admin.from('app_secrets').select('name, value').in('name', ['stripe_secret_key'])
    const sk = Object.fromEntries((secrets ?? []).map((s: any) => [s.name, s.value]))['stripe_secret_key']
    if (!sk) return json({ error: 'stripe not configured' }, 500)

    const base = (typeof origin === 'string' && /^https:\/\/(www\.)?incensostudio\.com$/.test(origin))
      ? origin : 'https://incensostudio.com'

    let amount = 0, label = '', email: string | null = null, success = '', cancel = '', topup = false

    if (kind === 'order') {
      const o = await readRow(admin, 'orders', 'ref', ref)
      if (!o) return json({ error: 'not found' }, 404)
      amount = clamp(Math.round(Number(o.to_pay ?? o.total ?? 0)), await orderCap(admin, o.items || []))
      label = 'Incenso Studio — order ' + ref
      email = o.email || await profileEmail(admin, o.user_id)
      success = `${base}/checkout?order=${ref}&paid=1`
      cancel = `${base}/checkout?order=${ref}`
    } else if (kind === 'gift') {
      const g = await readRow(admin, 'gift_cards', 'code', ref)
      if (!g) return json({ error: 'not found' }, 404)
      amount = Math.round(Number(g.amount ?? 0))
      if (amount < 10 || amount > 1000) return json({ error: 'amount out of range' }, 400)
      label = 'Incenso Studio — gift card ' + ref
      email = await profileEmail(admin, g.buyer_id) || await profileEmailByPhone(admin, g.buyer_phone)
      success = `${base}/gift-card?code=${ref}&paid=1`
      cancel = `${base}/gift-card?code=${ref}`
    } else {
      const b = await readRow(admin, 'bookings', 'ref', ref)
      if (!b) return json({ error: 'not found' }, 404)
      const extra = b.extra || null
      topup = !!(extra && extra.status === 'pending' && /card/i.test(String(extra.pay || '')))
      const raw = topup ? Number(extra.amount || 0) : Number(b.paid ?? 0)
      amount = clamp(Math.round(raw), await bookingCap(admin, b.services || []))
      label = 'Incenso Studio — appointment ' + ref + (topup ? ' (balance)' : '')
      email = await profileEmail(admin, b.user_id)
      success = `${base}/booking?ref=${ref}&paid=1`
      cancel = `${base}/booking?ref=${ref}`
    }

    if (!(amount > 0)) return json({ error: 'nothing to pay' }, 400)
    const cents = amount * 100

    const form = new URLSearchParams()
    form.set('mode', 'payment')
    form.set('success_url', success)
    form.set('cancel_url', cancel)
    form.set('client_reference_id', ref)
    form.set('metadata[kind]', kind)
    form.set('metadata[ref]', ref)
    form.set('metadata[topup]', topup ? '1' : '0')
    form.set('payment_intent_data[metadata][kind]', kind)
    form.set('payment_intent_data[metadata][ref]', ref)
    form.set('payment_intent_data[metadata][topup]', topup ? '1' : '0')
    form.set('line_items[0][quantity]', '1')
    form.set('line_items[0][price_data][currency]', 'usd')
    form.set('line_items[0][price_data][unit_amount]', String(cents))
    form.set('line_items[0][price_data][product_data][name]', label)
    if (email) form.set('customer_email', email)

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + sk, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const session = await res.json()
    if (!res.ok) return json({ error: 'stripe error', detail: session?.error?.message }, 502)

    await admin.from('payments').insert({
      kind, ref, amount_cents: cents, currency: 'usd', stripe_session_id: session.id, status: 'pending',
    })
    return json({ url: session.url, id: session.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
