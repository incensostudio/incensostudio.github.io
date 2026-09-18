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

> ⚠️ Important: do **not** use Supabase's built-in "Messagebird" dropdown under
> Authentication → Providers. That integration is currently broken and rejects
> modern Bird `bk_` keys. We use the **Send SMS hook + our function** instead,
> which talks to Bird's current API. (Leaving Phone enabled is fine; the hook
> overrides the dropdown.)

## Part A — Get your Bird account + three values  (~20 min)

1. Go to **bird.com** and sign up with your business email.
2. Add a little credit / payment method (SMS is pay-as-you-go, a few cents each).
3. Create an **SMS channel**: in Bird, go to **Channels → add an SMS channel**
   and connect a sender (a name like "INCENSO", or a virtual number Bird sells
   you if Lebanon needs one). This is what lets the account actually send SMS.
4. Now collect **three** things and paste them into a note:
   - **Access key** — Settings → **Developers / API access → Access keys** →
     create a **live** key (starts with `bk_`).
   - **Workspace ID** — a long id (UUID). You'll see it in the browser address
     bar when logged in: `app.bird.com/workspaces/`**`<this part>`**`/…`, or
     under **Settings → Workspace**.
   - **SMS Channel ID** — open the SMS channel you just made; its id (UUID) is
     in the address bar or the channel's settings/overview.

> Send me a screenshot of any screen and I'll point at the exact value to copy.

---

## Part B — Connect it to your sign-in  (~10 min, in Supabase)

Open your project at **supabase.com** → your Incenso project.

1. **Phone sign-in on.** Authentication → **Sign In / Providers** → **Phone** →
   on → Save. (You already did this. The "Messagebird" dropdown here is ignored
   once the hook below is on — leave it as-is.)
2. **Turn on the code sender.** Authentication → **Hooks** → **Send SMS hook** →
   **Enable** → **HTTPS** → paste the function address:
   `https://gcqkkruzgxpqpqxeymqx.supabase.co/functions/v1/send-sms-otp`
   Save. Supabase shows a **secret** starting with `v1,whsec_…` — copy it.
3. **Give the function its keys.** **Edge Functions** → **send-sms-otp** →
   **Secrets** (Manage secrets). Add these four:

   | Name | Value |
   |---|---|
   | `SEND_SMS_HOOK_SECRET` | the `v1,whsec_…` secret from step 2 |
   | `BIRD_API_KEY` | your `bk_…` access key |
   | `BIRD_WORKSPACE_ID` | your workspace UUID |
   | `BIRD_SMS_CHANNEL_ID` | your SMS channel UUID |

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
4. Back in Supabase → **Edge Functions → send-sms-otp → Secrets**, add:

   | Name | Value |
   |---|---|
   | `BIRD_WA_CHANNEL_ID` | the WhatsApp channel ID (UUID) |
   | `BIRD_WA_TEMPLATE_PROJECT_ID` | the approved template's project ID |
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
