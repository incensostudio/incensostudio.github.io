# Turning on WhatsApp sign-in codes

Your website asks customers for their phone number and a 6-digit code to sign
in. The code delivery is fully built and **confirmed working** over WhatsApp
through Bird. These are the only steps left to switch it on for customers.

Everything technical is already deployed:
- Edge function **send-sms-otp** sends the code over WhatsApp using your
  Meta-approved Bird template (`bird_otp`). Confirmed on a real phone.
- Address: `https://gcqkkruzgxpqpqxeymqx.supabase.co/functions/v1/send-sms-otp`

## The confirmed working recipe (for reference)
- Host: `https://eu1.platform.bird.com/v1/whatsapp/messages` (EU region — this
  was the whole earlier headache; `api.bird.com` silently fails)
- Auth: `Authorization: Bearer <bird key>`
- Body: template `bird_otp`, language `en`, the code passed as the body
  parameter. No `from` needed (Bird-managed template picks its verified sender).

---

## Final steps to go live (in Supabase)

Open **supabase.com** -> your Incenso project.

1. **Phone sign-in is on.** Authentication -> Sign In / Providers -> Phone =
   enabled. (Already done. The "Messagebird" dropdown there is ignored once the
   hook below is on — leave it.)
2. **Turn on the code sender.** Authentication -> **Hooks** -> **Send SMS hook**
   -> Enable -> **HTTPS** -> paste the function address:
   `https://gcqkkruzgxpqpqxeymqx.supabase.co/functions/v1/send-sms-otp`
   Save. Copy the **secret** it shows (starts with `v1,whsec_`).
3. **Give the function its keys.** Edge Functions -> **send-sms-otp** ->
   **Secrets**. Add:

   | Name | Value |
   |---|---|
   | `SEND_SMS_HOOK_SECRET` | the `v1,whsec_…` secret from step 2 |
   | `BIRD_API_KEY` | your Bird workspace key (`bk_eu1_…`) |

   Save.

That's it — sign in on the website with a real phone number and the code
arrives on WhatsApp.

---

## Good to know
- The Bird key lives only in Supabase, never on the website.
- The code currently comes from a **Bird verification number**. To have it come
  from your own number/brand, create your own authentication template on your
  WhatsApp Business number and set `BIRD_WA_TEMPLATE_SLUG` to its slug. Optional.
- Arabic is available: set a `BIRD_WA_LANG` secret to `ar`.
- Your sending is on the **250 messages/day** starter tier until Meta raises it.
- If a code doesn't arrive: Edge Functions -> send-sms-otp -> **Logs** shows why.
