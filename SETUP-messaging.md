# Turning on sign-in codes (SMS now, WhatsApp later)

Your website already asks customers for their phone number and a 6-digit code
to sign in. The code below is fully built — these steps just connect the
account that actually sends the text. You do them once.

Everything technical is already deployed:
- A function called **send-sms-otp** lives in your Supabase project and sends
  the codes. Its address is:
  `https://gcqkkruzgxpqpqxeymqx.supabase.co/functions/v1/send-sms-otp`
- It can send by **SMS** today and by **WhatsApp** later, with no code changes.

---

## Part A — Get a MessageBird (Bird) account  (~15 min)

1. Go to **bird.com** and sign up. Use your business email.
2. Add a little credit / a payment method (SMS is pay-as-you-go, a few cents
   each).
3. Find your **API access key** (Bird calls it an *access key* or *API key*).
   It's usually under **Settings → Developers / API access → Access keys**.
   Create a **live** key and copy it somewhere safe.
4. Set a **sender name** so texts show as being from you. "Incenso" works in
   most of the world. (If Lebanon rejects a name sender, Bird will tell you —
   then you buy a small virtual number from them instead. I'll help if so.)

> If you get stuck creating the account or finding the key, send me a
> screenshot of the screen you're on and I'll point to the exact button.

---

## Part B — Connect it to your sign-in  (~10 min, in Supabase)

Open your project at **supabase.com** → your Incenso project.

1. **Turn on phone sign-in.** Left menu → **Authentication** →
   **Sign In / Providers** → enable **Phone**. Save.
2. **Turn on the code sender.** Left menu → **Authentication** → **Hooks** →
   **Send SMS** → choose **HTTPS** and paste the function address:
   `https://gcqkkruzgxpqpqxeymqx.supabase.co/functions/v1/send-sms-otp`
   Save. Supabase shows a **secret** that starts with `v1,whsec_…` — copy it.
3. **Give the function its keys.** Left menu → **Edge Functions** →
   **Secrets** (or **Manage secrets**). Add these three:

   | Name | Value |
   |---|---|
   | `SEND_SMS_HOOK_SECRET` | the `v1,whsec_…` secret you just copied |
   | `MESSAGEBIRD_API_KEY` | your live access key from Part A |
   | `MESSAGEBIRD_ORIGINATOR` | `Incenso` (or your bought number) |

   Save.

That's it — SMS sign-in is now live. Test it: open the website, sign in with
your own phone, and you should get the code by text.

---

## Part C — Add WhatsApp (do this after Part B is working)

WhatsApp codes need Meta's approval, which is why we do it second. Nothing on
the site changes — we just flip WhatsApp on in the same function.

1. In Bird, start a **WhatsApp channel**: connect a phone number (a fresh one
   you don't use for personal WhatsApp) and complete **Meta Business
   verification**. Bird walks you through it. This part can take a few days on
   Meta's side — that's normal.
2. Create an **authentication template** (the message that carries the code)
   and submit it for approval. Bird has a ready-made "one-time passcode"
   template — use that.
3. Once approved, note four things from Bird: the **channel ID**, the template
   **namespace**, the **template name**, and its **language** (e.g. `en`).
4. Back in Supabase → **Edge Functions → Secrets**, add:

   | Name | Value |
   |---|---|
   | `MESSAGEBIRD_WA_CHANNEL_ID` | the WhatsApp channel ID |
   | `MESSAGEBIRD_WA_NAMESPACE` | the template namespace |
   | `MESSAGEBIRD_WA_TEMPLATE` | the template name |
   | `OTP_CHANNELS` | `whatsapp,sms` |

   `OTP_CHANNELS = whatsapp,sms` means: try WhatsApp first, and if it can't be
   delivered, fall back to SMS automatically. (Use `whatsapp` alone for
   WhatsApp-only, or leave it out for SMS-only.)

Send me a message when you reach this part and I'll double-check the template
setup with you — the WhatsApp piece is the fiddliest and I'd rather verify it
live than have a code not arrive.

---

### Good to know
- The sending key never touches the website — it only lives in Supabase, so
  it can't leak from a customer's browser.
- You can change the message wording anytime by adding an `OTP_MESSAGE` secret
  containing `{code}` where the number should go.
- If a code doesn't arrive, Supabase → **Edge Functions → send-sms-otp →
  Logs** shows exactly why (e.g. "insufficient balance", "sender not allowed").
