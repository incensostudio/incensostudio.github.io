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

---

## 1. How the two sides work together

- **Claude design** produces: the full designed pages (HTML + CSS), *prototype* behaviour in
  inline `<script>` (localStorage‑based, so the page is clickable on its own), and short plain‑
  English notes on how the real backend should behave.
- **Claude Code** replaces the prototype behaviour with the real backend (Supabase + Bird
  WhatsApp), deploys to GitHub Pages, and updates this contract.
- **Design and behaviour stay in the same page files** (we are *not* separating them). What keeps
  the handoff cheap is that the real backend attaches at a small, stable set of **seams** — keep
  those and everything re‑applies fast.

### The handoff format (what Claude design hands over)
1. The changed page file(s), full.
2. A short **“Changes since last handoff”** changelog: what changed visually, and — in plain
   English — any new or changed *behaviour* (“when they pick a date, only show free stylists”,
   “add a birthday field, required, save it”). No need to write real backend code; describe it.
3. If a brand‑new data field or message is introduced, say so explicitly so Claude Code adds the
   column / template.

### Rules for Claude design (the contract)
- **Keep the design tokens** in §4 (colours, fonts). The home‑page bar colour is `#f7f4eb`;
  every other page's browser theme colour is `#e5dcc9`.
- **Keep the shared `<script src>` includes** (§5) and their order. They provide sign‑in, gift
  cards, catalogue, products, phone input, QR and shared chrome.
- **Keep the element hooks** the shared scripts bind to (§5): the `id`s, `data-…` attributes and
  custom tags listed there. Restyle them, move them, rename their *labels* — but don't remove
  them or rename the hook itself.
- **Don't change the home‑page lattice, its sound, the story rings, or the theme colours** unless
  explicitly asked — that behaviour is delicate and hand‑tuned.
- Everything else — layout, spacing, colours within a page, imagery, copy, new sections,
  animations — is yours to change freely.

---

## 2. Architecture at a glance

- **Front end:** a static site (plain HTML/CSS/JS), deployed on **GitHub Pages** at
  `incensostudio.com` (repo `incensostudio/incensostudio.github.io`, branch `main`). No build
  step. Clean URLs (no `.html`).
- **Back end:** the browser talks **directly to Supabase** (Postgres + Auth + Edge Functions +
  cron). Access is protected by Row‑Level Security using a **public “publishable” key** (safe to
  ship in the page).
- **Messaging:** **Bird (MessageBird) WhatsApp** for sign‑in codes and all customer messages,
  triggered from the database.
- **Separate management app** (different repo) will later read the same database to run the
  salon. Not part of this site.

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
| `/terms` `/shipping` `/privacy` | same names | Legal pages |

---

## 4. Design system (tokens)

- **Fonts:** `Geist` (sans) and `Geist Mono` (mono), loaded from Google Fonts.
- **Colours:** `--bg-warm: #e5dcc9` (page background), `--fg-warm: #000000` (text), plus
  per‑page accent pastels. **Browser theme colour:** `#e5dcc9` on every page **except the home
  page**, which uses `#f7f4eb`.
- **Shared chrome:** the top bar (cart · wordmark · menu) and the footer (newsletter + open/closed
  ticker) are **injected by `assets/site.js`** on every page — don't hand‑code them; just keep
  loading `site.js`. Nav links are built there too.
- **Icons/favicons:** `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`.
- **Custom elements:** `<image-slot …>` is a placeholder that renders an image area (real photos
  drop in later). `<div class="phone-combo"><select class="pc-cc">…</select><input …></div>` is
  the country‑code + number field.

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
<script src="assets/auth.js"></script>        <!-- window.IncensoAuth — accounts, sign-in, refs -->
<script src="assets/gift.js"></script>        <!-- window.IncensoGift — gift cards -->
<script src="assets/products.js"></script>    <!-- window.IncensoProducts — shop products (shop only) -->
<script src="assets/catalog.js"></script>     <!-- window.IncensoCatalog — services/staff (book & menus) -->
<script src="assets/image-slot.js"></script>  <!-- <image-slot> element + window.IncensoQR -->
<script src="assets/site.js"></script>        <!-- shared header/footer + nav + behaviours -->
```

**Global helpers the pages call (don't rename):**
- `window.SB` — the Supabase client.
- `window.IncensoAuth` — `get() set() open() signedIn() nextRef('BK'|'OR'|'GF') flush()
  sendDetailOtp() verifyDetailOtp()` … the account object and sign‑in modal.
- `window.IncensoGift` — gift‑card lookups/creation.
- `window.IncensoProducts` / `window.IncensoCatalog` — data for shop / booking.
- `window.IncensoPhone.fill(root)` — populates country‑code selects.
- `window.IncensoQR(url)` — returns a QR SVG.

**Element hooks that must survive a redesign** (restyle freely, keep the hook):
- Account button anywhere: `data-account-btn` (opens sign‑in / goes to account).
- Phone fields: the `.phone-combo` wrapper with a `.pc-cc` `<select>` next to the number input.
- Sign‑up modal fields (rendered by `auth.js`): ids `auName`, `auEmail`, `auBirthday`, `auPhoto`.
- Account settings fields: ids `dName`, `dPhoneCC`, `dPhone`, `dEmail`, `dBirthday`, and the OTP
  box `detOtp` / `detCode` / `detConfirm`.
- Booking picker builds `/book?svc=<service>` and `/book?cat=<category>` links — keep that format.
- Cart badge: `.cart-badge`; “Add to cart” actions and product cards keep their existing
  data attributes so `products.js` can bind.

If a redesign needs a **new** field or button that should talk to the backend, just add it with a
clear `id`/`data-…` and describe it in the changelog — Claude Code wires it.

---

## 6. Data model (what exists in the database)

Website‑owned tables:
- `profiles` — one per member: `name, phone (+CC local), email, birthday, photo_url, prefs, tier,
  spend_12mo`. Tied to the phone sign‑in user.
- `bookings` — a member's appointments (ref `BK0001…`): services, stylist, date/time, price,
  pay status, status, deadlines.
- `orders` — shop orders (ref `OR0001…`): items, total, method, pay status, courier, deadlines.
- `gift_cards` — gift cards (ref `GF0001…`): amount, to/from, status, expiry, buyer/recipient.
- `restock_requests` — “tell me when it's back” per product.
- `newsletter` — phone sign‑ups.
- `web_products, web_services, web_staff, web_categories, web_config` — the **catalogue/config the
  site displays** (admin‑controlled).
- `ref_counters` — issues the sequential BK/OR/GF numbers.
- `wa_log` — record of WhatsApp messages sent.

Management‑owned (the site does **not** touch these): `clients` (~35 real clients kept for
migration), `appointments`, `desk_users`, `staff`, `services`, ledger tables. **Never reset or
write these from the website.**

**References:** bookings `BK####`, orders `OR####`, gift cards `GF####` (4 digits, no dash),
issued by the server via the `next_ref` function so they're globally unique.

---

## 7. Backend behaviours & the prototype→real map

When Claude design ships prototype (localStorage) behaviour, Claude Code swaps it for these:

| Feature | Prototype (design) | Real (Claude Code) |
|---|---|---|
| Sign‑in | fake code box | `IncensoAuth.open()` → Supabase phone OTP delivered by **WhatsApp (Bird)**; 6‑digit code |
| Account save | localStorage | `IncensoAuth.set()` → upserts `profiles`; navigations `await IncensoAuth.flush()` first |
| Change details | any code accepted | real OTP: `sendDetailOtp()`/`verifyDetailOtp()` before saving (phone change re‑verifies the new number) |
| Booking | local object | `await IncensoAuth.nextRef('BK')`, saved to `bookings`; availability from `day_busy` RPC |
| Order | local object | `nextRef('OR')`, saved to `orders` |
| Gift card | local object | `nextRef('GF')`, saved to `gift_cards`; redeem/refund via RPCs |
| Products | hard‑coded | `IncensoProducts` from `web_products` |
| Messages | none | DB triggers + a 15‑min cron send WhatsApp: booking/order confirmations, reminders, payment‑deadline nudges, auto‑cancels, gift delivery |

**Messaging note:** 35 branded WhatsApp templates are submitted to Meta and **pending approval**;
until approved the site uses Bird's generic approved templates, then switches automatically.

---

## 8. Not built yet (deliberately last)

- **Card payments** — the card form validates but doesn't charge; no processor connected yet.
  Whish/OMT are “scan QR, pay, confirm”. (QR images pending from the owner.)
- **The management system** — separate admin app + migrating the 35 saved clients.
- **Real images** — product/studio/staff photos and payment QR codes are placeholders.
- **WhatsApp sender branding** (name + logo) — pending Meta Business Verification.

---

## 9. Environment facts (for Claude Code)

- Repo: `incensostudio/incensostudio.github.io`, branch `main`; deploy = GitHub Pages (classic,
  auto‑build). Custom domain `incensostudio.com` (`CNAME`), `.nojekyll` present.
- Supabase project URL: `https://gcqkkruzgxpqpqxeymqx.supabase.co`; public key lives in
  `assets/supabase.js` (RLS‑protected — safe to ship).
- WhatsApp: Bird (MessageBird), EU region.
- Home page is `index.html`; the design package calls it `Home.html` — map Home → index and keep
  the lattice/sound/rings intact.
