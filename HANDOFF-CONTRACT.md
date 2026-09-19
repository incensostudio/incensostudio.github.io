# Incenso Studio — Design ↔ Backend Handoff Contract

**Purpose.** This is the single source of truth shared between **Claude design** (where the
site's look and prototype behaviour are built) and **Claude Code** (where the real backend —
database, sign‑in, WhatsApp, payments — is wired in and deployed). Paste this whole file into
Claude design at the start of any design session so it builds on the *latest* state and keeps
the seams stable. Claude Code keeps this file up to date in the repo after every change.

The goal: moving a change from Claude design → live site is **drop‑in**. Claude design owns the
design and describes the intended behaviour; Claude Code re‑applies the real backend at the few
documented seams. If the seams below are preserved, integration is mechanical (minutes, no
guesswork).

> **What changed since the last handoff (read first):** card payments are **live** now (Stripe
> hosted checkout); the studio's **own branded WhatsApp templates are approved** and send from the
> studio's own WhatsApp number; a booking can now carry **several separate top‑ups** (different pay
> methods) shown as their own lines; booking/order/gift view pages are **server‑authoritative and
> live‑refresh**. Details in §7, §8 and §10. None of this changes the design seams — it's mostly
> behaviour — but the payment breakdown UI (bookings especially) now renders a *list* of lines.

---

## 1. How the two sides work together

- **Claude design** produces: the full designed pages (HTML + CSS), *prototype* behaviour in
  inline `<script>` (localStorage‑based, so the page is clickable on its own), and short plain‑
  English notes on how the real backend should behave.
- **Claude Code** replaces the prototype behaviour with the real backend (Supabase + Stripe + Bird
  WhatsApp), deploys to GitHub Pages, and updates this contract.
- **Design and behaviour stay in the same page files** (we are *not* separating them). What keeps
  the handoff cheap is that the real backend attaches at a small, stable set of **seams** — keep
  those and everything re‑applies fast.

### The handoff format (what Claude design hands over)
1. The changed page file(s), full.
2. A short **"Changes since last handoff"** changelog: what changed visually, and — in plain
   English — any new or changed *behaviour*.
3. If a brand‑new data field or message is introduced, say so explicitly so Claude Code adds the
   column / template.

### Rules for Claude design (the contract)
- **Keep the design tokens** in §4 (colours, fonts). Home‑page bar colour `#f7f4eb`; every other
  page's browser theme colour `#e5dcc9`.
- **Keep the shared `<script src>` includes** (§5) and their order.
- **Keep the element hooks** the shared scripts bind to (§5): the `id`s, `data-…` attributes and
  custom tags. Restyle them, move them, rename their *labels* — but don't remove them or rename the
  hook itself.
- **A payment breakdown is a list, not a single line** (§7a). On a booking or order, render the
  payment summary as a repeatable set of rows (e.g. "$40 card", "$20 Whish Money · pending",
  "$25 OMT Pay · pending", "$15 at studio"), not one fixed field — a booking can hold multiple
  top‑ups of different methods, each its own row with its own status.
- **Don't change the home‑page lattice, its sound, the story rings, or the theme colours** unless
  explicitly asked — delicate and hand‑tuned.
- Everything else — layout, spacing, colours within a page, imagery, copy, new sections,
  animations — is yours to change freely.

---

## 2. Architecture at a glance

- **Front end:** a static site (plain HTML/CSS/JS), deployed on **GitHub Pages** at
  `incensostudio.com` (repo `incensostudio/incensostudio.github.io`, branch `main`). No build step.
  Clean URLs (no `.html`).
- **Back end:** the browser talks **directly to Supabase** (Postgres + Auth + Edge Functions +
  cron), protected by Row‑Level Security using a **public "publishable" key** (safe to ship).
- **Payments:** **Stripe Checkout** (hosted page) via two Supabase Edge Functions — the amount is
  always computed server‑side.
- **Messaging:** **Bird (MessageBird) WhatsApp** for sign‑in codes and all customer messages,
  triggered from the database, using the studio's own approved templates.
- **Separate management app** (different repo) will later read the same database. Not part of this
  site.

---

## 3. Pages & URLs

All lowercase, no `.html`. File name = URL.

| URL | File | What it is |
|---|---|---|
| `/` | `index.html` | Home — lattice hero (with sound), story rings, live Google reviews |
| `/shop` | `shop.html` | Product shop (products from the database) |
| `/hair` `/nails` `/makeup` `/brows-lashes` | same names | Service menus (per category) |
| `/book` | `book.html` | Booking flow: service → stylist → time → details → pay |
| `/work` | `work.html` | Our Work gallery |
| `/space` | `space.html` | The Space / studio |
| `/gift` | `gift.html` | Buy a gift card |
| `/gift-card` | `gift-card.html` | View a single gift card (by code) |
| `/cart` | `cart.html` | Shopping cart |
| `/checkout` | `checkout.html` | Shop checkout |
| `/account` | `account.html` | Member account: details, bookings, orders, gift balance, restocks |
| `/booking` | `booking.html` | View a single booking (by ref) |
| `/terms` `/shipping` `/privacy` | same names | Legal pages (still exist; the **home‑page footer no longer links them** — see §10) |

---

## 4. Design system (tokens)

- **Fonts:** `Geist` (sans) and `Geist Mono` (mono), from Google Fonts.
- **Colours:** `--bg-warm: #e5dcc9` (page background), `--fg-warm: #000000` (text), plus per‑page
  accent pastels. **Browser theme colour:** `#e5dcc9` on every page **except home**, which uses
  `#f7f4eb`.
- **Shared chrome:** top bar (cart · wordmark · menu) and footer (newsletter + open/closed ticker)
  are **injected by `assets/site.js`** on every page — don't hand‑code them; keep loading `site.js`.
- **Icons/favicons:** `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`.
- **Custom elements:** `<image-slot …>` renders a placeholder image area.
  `<div class="phone-combo"><select class="pc-cc">…</select><input …></div>` is the country‑code +
  number field.

### Mobile specifics currently in place
- Mobile nav ends with a paired **Account / Book Now** action row (`.m-actions`).
- Service menus fold into an accordion by group on phones.
- Footer is **hidden on mobile** on: `book`, `gift-card`, `checkout`, `gift`, `cart`, `account`.
- Shop's top bar is opaque with a cream cap so product photos never peek through on iOS scroll.

---

## 5. The integration seams (KEEP THESE)

The shared scripts below must stay loaded (in this order, after the Supabase CDN):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/supabase.js"></script>   <!-- creates window.SB (Supabase client) -->
<script src="assets/phone.js"></script>       <!-- window.IncensoPhone — fills .pc-cc selects -->
<script src="assets/auth.js"></script>        <!-- window.IncensoAuth — accounts, sign-in, refs, Stripe -->
<script src="assets/gift.js"></script>        <!-- window.IncensoGift — gift cards -->
<script src="assets/products.js"></script>    <!-- window.IncensoProducts — shop products (shop only) -->
<script src="assets/catalog.js"></script>     <!-- window.IncensoCatalog — services/staff (book & menus) -->
<script src="assets/image-slot.js"></script>  <!-- <image-slot> element + window.IncensoQR -->
<script src="assets/site.js"></script>        <!-- shared header/footer + nav + behaviours -->
```

**Global helpers the pages call (don't rename):**
- `window.SB` — the Supabase client.
- `window.IncensoAuth` — accounts + sign‑in + payments. Key methods:
  `get() set() open() close() signedIn() signOut() flush() resync()`,
  `nextRef('BK'|'OR'|'GF')`, `payLabel(booking)` (the one‑line payment summary),
  `exArr(booking)` (normalises a booking's top‑ups to an array), `orderTotal(o)`, `yearSpend(acc)`,
  `tierFor()/nextTier()`, `sendDetailOtp()/verifyDetailOtp()`, `removeRestock()`,
  and **`stripeCheckout(kind, ref)`** → redirects to Stripe's hosted page (`kind` =
  `'booking'|'order'|'gift'`).
- `window.IncensoGift` — gift‑card lookups/creation/redeem/refund.
- `window.IncensoProducts` / `window.IncensoCatalog` — data for shop / booking.
- `window.IncensoPhone.fill(root)` — populates country‑code selects.
- `window.IncensoQR(url)` — returns a QR SVG.

**Element hooks that must survive a redesign** (restyle freely, keep the hook):
- Account button anywhere: `data-account-btn`.
- Phone fields: the `.phone-combo` wrapper with a `.pc-cc` `<select>` next to the number input.
- Sign‑up modal fields (rendered by `auth.js`): ids `auName`, `auEmail`, `auBirthday`, `auPhoto`.
- Account settings fields: ids `dName`, `dPhoneCC`, `dPhone`, `dEmail`, `dBirthday`, and the OTP box
  `detOtp` / `detCode` / `detConfirm`.
- Booking picker builds `/book?svc=<service>` and `/book?cat=<category>` links — keep that format.
- Cart badge: `.cart-badge`; "Add to cart" actions and product cards keep their data attributes so
  `products.js` can bind.
- **Payment / return hooks (payments are live now):** the pay step submits and then calls
  `IncensoAuth.stripeCheckout(...)`, which redirects to Stripe; Stripe returns to the same page with
  `?paid=1`, and the view pages poll until the server confirms. Keep a pay button that can trigger
  this, and — on booking/gift view pages — the "finish your card payment / pay your top‑up" call to
  action (classes `bk-pay-again`, `bk-topup-again` on the booking view) so an unfinished card
  payment can be resumed. Restyle freely; keep the ability to trigger the checkout.

If a redesign needs a **new** field or button that should talk to the backend, add it with a clear
`id`/`data-…` and describe it in the changelog — Claude Code wires it.

---

## 6. Data model (what exists in the database)

Website‑owned tables:
- `profiles` — one per member: `name, phone (+CC local), email, birthday, photo_url, prefs, tier,
  spend_12mo`. Tied to the phone sign‑in user.
- `bookings` — a member's appointments (ref `BK0001…`): services, stylist, date/time, price,
  `paid` (confirmed money), `due` (cash at studio), `gift`, **`extra` (a JSON *array* of top‑ups —
  see §7a)**, pay status, status, deadlines, `final` (the closed bill once settled).
- `orders` — shop orders (ref `OR0001…`): items, total, method, pay status, courier, deadlines.
- `gift_cards` — gift cards (ref `GF0001…`): amount, to/from, status (Reserved→Active→Used, or
  Cancelled), expiry, buyer/recipient, `redemptions`.
- `restock_requests` — "tell me when it's back" per product.
- `newsletter` — phone sign‑ups.
- `web_products, web_services, web_staff, web_categories, web_config` — the catalogue/config the
  site displays (admin‑controlled).
- `ref_counters` — issues the sequential BK/OR/GF numbers.
- `payments` — Stripe checkout sessions.
- `wa_log` — record of WhatsApp messages sent (idempotency).
- `app_secrets` — server‑side keys/config (Bird key, Stripe keys, the WhatsApp sender number). Never
  exposed to the browser.

Management‑owned (the site does **not** touch these): `clients`, `appointments`, `desk_users`,
`staff`, `services`, ledger tables. **Never reset or write these from the website.**

**References:** `BK#### / OR#### / GF####` (4 digits, no dash), issued by the `next_ref` function.

---

## 7. Backend behaviours & the prototype→real map

When Claude design ships prototype (localStorage) behaviour, Claude Code swaps it for these:

| Feature | Prototype (design) | Real (Claude Code) |
|---|---|---|
| Sign‑in | fake code box | `IncensoAuth.open()` → Supabase phone OTP delivered by **WhatsApp (Bird)**; 6‑digit code |
| Account save | localStorage | `IncensoAuth.set()` → upserts `profiles`; navigations `await IncensoAuth.flush()` first |
| Change details | any code accepted | real OTP: `sendDetailOtp()`/`verifyDetailOtp()` before saving |
| Booking | local object | `await IncensoAuth.nextRef('BK')`, saved to `bookings`; view page is server‑authoritative |
| Order | local object | `nextRef('OR')`, saved to `orders` |
| Gift card | local object | `nextRef('GF')`, saved to `gift_cards`; redeem/refund via RPCs |
| Products | hard‑coded | `IncensoProducts` from `web_products` |
| **Card payment** | in‑page card form | **Stripe hosted checkout** via `stripeCheckout(kind, ref)`; the in‑page card fields are prototype only and do **not** charge — the real charge happens on Stripe's page, which returns with `?paid=1` |
| Messages | none | DB triggers + a 15‑min cron send WhatsApp from the studio's own number |

### 7a. The payment model (unified — design should reflect this in copy & layout)

Four methods, same rules across bookings, orders and gifts, with one cash difference:

- **Card** — confirmed instantly (Stripe).
- **Whish Money / OMT Pay** — manual verification by the studio; must be paid within **24 hours**
  or it auto‑cancels.
- **Cash (pay at studio)** — settled in person. **Bookings: no timer.** **Orders & gifts: a 3‑day
  hold**, then released.

**Booking top‑ups (why the breakdown is a list).** When a paid booking is edited to add services,
the difference becomes a **separate top‑up** kept per method. A booking's `extra` field is an array
like `[{amount, pay, status:'pending'|'paid', placedAt, deadline}]`. So a booking can read, e.g.,
"**$40 card · $20 Whish Money pending · $25 OMT Pay pending**". `IncensoAuth.payLabel(booking)`
produces the one‑line summary; a full breakdown (booking/account pages) should render one row per
piece: confirmed money, each top‑up (with method + pending/paid), gift, cash due, refunds. Design
this as a repeatable list, not fixed fields.

### 7b. Messaging (now live from the studio's number)

- The studio's **own branded WhatsApp templates are approved** and in use for orders, bookings,
  gifts, reminders, cancellations, refunds and restock — all sending from the studio's own
  WhatsApp Business number (stored server‑side; the customer **contact / Whish‑OMT transfer number
  shown on the site stays +961 71 930 290**).
- **Two messages still go from Bird's shared number for now** (pending Meta steps): **sign‑in OTP**
  (needs the number's *display name* approved) and **pay‑at‑studio booking confirmation** (one
  template still in review). They switch to the studio number automatically once approved. Design
  doesn't need to do anything here.

---

## 8. Not built yet (deliberately last)

- **The management system** — separate admin app + migrating the saved clients.
- **Real images** — product/studio/staff photos and the Whish/OMT payment QR codes are still
  placeholders (`<image-slot>`).
- **WhatsApp sender display name** — pending Meta approval; until then sign‑in codes come from the
  shared number (everything else already comes from the studio number).

> Card payments are **no longer** in this list — they are live (Stripe).

---

## 9. Environment facts (for Claude Code)

- Repo: `incensostudio/incensostudio.github.io`, branch `main`; deploy = GitHub Pages (classic).
  Custom domain `incensostudio.com` (`CNAME`), `.nojekyll` present.
- Supabase project URL: `https://gcqkkruzgxpqpqxeymqx.supabase.co`; public key in
  `assets/supabase.js` (RLS‑protected — safe to ship).
- Edge Functions: `create-checkout` (builds the Stripe session, amount from the DB row, `verify_jwt
  = true`), `stripe-webhook` (marks rows paid, **must stay `verify_jwt = false`**), `send-sms-otp`
  (WhatsApp OTP sender).
- Payments: Stripe Checkout (hosted). Keys/mode in `app_secrets`.
- WhatsApp: Bird (MessageBird), EU region; sender number in `app_secrets.bird_from`.
- Home page is `index.html`; the design package calls it `Home.html` — map Home → index and keep
  the lattice/sound/rings intact.

---

## 10. Keeping design in sync BOTH ways

Design can change in two places — in Claude design, and directly on the live site (bug fixes,
mobile tweaks). To stop the two from drifting:

- **The live site is the source of truth for design.** Before Claude design makes a new change, it
  must first absorb the "live‑side design changes" below so it doesn't undo them.
- **Every design change made on the live side is logged here in plain English.** Paste it into
  Claude design and ask it to apply these first; then make the new change.
- Alternative when in doubt: take the **current live page file from the repo** into Claude design as
  the starting point (it already contains every live change) and restyle from there.

### Live‑side design changes to mirror back into Claude design
*(made on the live site after the last design handoff — apply these to the Claude design project)*

1. **Clean lowercase URLs** — the URL map in §3. Internal links/nav use these.
2. **Birthday field (required)** — in the sign‑up modal and Account → details; a date field, not in
   the future.
3. **iOS button text colour** — buttons must set an explicit dark `color` (unset buttons render
   system‑blue on iPhone).
4. **Gift checkout default** — card inputs hidden by default ("Pay at the studio" is the default);
   they appear only when "Card" is chosen. (Same pattern on booking/checkout.)
5. **Shop product tint (mobile)** — hover/tap colour clears when you press elsewhere.
6. **Shop top bar (mobile)** — solid/opaque with a cream cap; no frosted blur on scroll.
7. **Footer hidden on mobile** on: `book`, `gift-card`, `checkout`, `gift`, `cart`, `account`.
8. **Gift page (mobile)** — the "Give someone the chair." heading is hidden on phones; card at top,
   sticky bottom pay bar.
9. **Theme colours confirmed** — home bar `#f7f4eb`, every other page `#e5dcc9`.
10. **Settings phone field** splits into country‑code select + local number; references shown as
    `BK#### / OR#### / GF####`.
11. **Payment breakdown is now a list (bookings & orders).** The booking/account payment summary
    renders one row per piece — confirmed money, each **top‑up** (method + `pending`/`paid`), gift,
    cash due, refunds — because a booking can hold several top‑ups of different methods. Keep this
    repeatable‑row layout; don't collapse it to a single "paid by X" line.
12. **Card pay = redirect to Stripe.** The in‑page card fields are visual only; on submit the flow
    redirects to Stripe's hosted page and returns with `?paid=1`. Booking/gift view pages show a
    "finish your card payment" / "pay your top‑up" button when a card payment was started but not
    completed (`bk-pay-again`, `bk-topup-again`).
13. **Booking/order/gift view pages are live** — they refresh from the server (poll + on focus), so
    the status/payment area re‑renders on its own. Keep a stable container for that summary.
14. **Whish/OMT deadlines in copy** — transfer instructions state an exact cut‑off (24h; for a
    booking, the earlier of 24h and the appointment). Cash pickup on orders/gifts states a 3‑day
    hold. Keep room for a deadline line / countdown.
15. **Home‑page footer** — the Terms / Shipping / Privacy links were **removed** from the home‑page
    footer (the legal pages still exist at their URLs).
16. **Sign‑in copy says "WhatsApp"** (not "text/SMS") — codes arrive on WhatsApp.
