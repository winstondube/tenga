# Tenga API

The site stays static on GitHub Pages. This adds the three things a static page
cannot do:

1. **Keep orders somewhere both of you can see them.** Today an order exists
   only in the browser that made it.
2. **Send the messages the app currently only pretends to send.**
3. **Be told by PayPal directly that money arrived**, server to server, rather
   than taking the buyer's browser at its word.

## What it costs

Cloudflare Workers and D1, on the free tier: **£0**. 100,000 requests a day and
5GB of storage, which is far beyond anything Tenga will do for a long time. The
site itself stays on GitHub Pages, also free. The only bill is the domain.

The paid tier, if it is ever needed, is $5/month.

## Running it

```bash
npm install
npx wrangler d1 create tenga          # put the id into wrangler.toml
npm run db:init:local                 # schema into the local database
node seed.mjs ops@tenga.uk 'a long passphrase' > /tmp/seed.sql
npx wrangler d1 execute tenga --local --file=/tmp/seed.sql
npm run dev                           # http://127.0.0.1:8787
API=http://127.0.0.1:8787 SEED_PW='a long passphrase' npm test
```

Going live:

```bash
npm run db:init                       # schema into the real database
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_SECRET
npx wrangler secret put PAYPAL_WEBHOOK_ID
npx wrangler secret put RESEND_KEY
npm run deploy
```

## Decisions worth knowing

**The order is stored as JSON in one column.** The app already owns that shape,
and keeping a second copy of it in columns means two definitions that drift.
The columns beside it exist only so the server can find, filter and secure rows
without parsing every one.

**Money is integer pence.** Floats lose pennies.

**The server owns identity and money.** A PATCH from the browser cannot change
a reference, a token, a collection code or what has been paid. It can only
change the parts a person is allowed to edit.

**A missing order and a forbidden order return the same 404**, so the API
cannot be used to discover which references exist.

**Lookup needs the reference and a contact on the order.** References run in
sequence, so a reference alone is a guess away from someone else's order.

## PayPal

The rule the code exists to enforce: **the browser never decides that money
arrived, and never decides how much.**

- We create the PayPal order with the amount from our own database. A browser
  asking to pay £1 for a £150 order gets a PayPal order for £150.
- The buyer's browser reporting a successful capture changes nothing.
- An order is marked paid **only** by `PAYMENT.CAPTURE.COMPLETED` arriving on
  the webhook, with its signature verified by PayPal's own API.
- The capture id is unique in the database, so a replayed webhook is a no-op
  rather than a second payment.
- With no `PAYPAL_WEBHOOK_ID` set, verification fails closed: every webhook is
  refused. It cannot be accidentally left open.

### Setting it up, in this order

1. A PayPal **Business** account.
2. developer.paypal.com, signed in with it, Apps & Credentials, create an app.
   Take the **Client ID** and **Secret** from the Sandbox tab first.
3. `npm run deploy` so the API has a public URL.
4. Back in the dashboard, Webhooks, add one pointing at
   `https://<your-worker>.workers.dev/paypal/webhook`, subscribed to
   `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED` and
   `PAYMENT.CAPTURE.REFUNDED`. Take the **Webhook ID**.
5. Set the three secrets, then repeat 2 and 4 with the Live tab when you are
   ready to take real money, and set `PAYPAL_ENV = "live"`.

## Still to build

- The app talking to this instead of localStorage
- WhatsApp sending (email is done)

## Why PBKDF2 is at 100k, not 600k

A Worker on the free tier gets 10ms of CPU per request. 210,000 PBKDF2 rounds
costs about 16ms, so login returned a 500 in production while passing locally,
where no such limit exists. It is now 100,000 rounds, about 7.7ms.

The iteration count is what protects a **guessable** password in a leaked
database. Staff passwords here are generated, 24 random characters, so the
search space does the work instead: no iteration count makes that crackable,
and none would save "summer2026". `seed.mjs` enforces a 16-character floor,
which is the assumption this rests on.

If staff accounts ever get human-chosen passwords, raise the rounds and move
the Worker to the paid plan.

## Live

- API: `https://tenga-api.winstondube.workers.dev`
- Database: D1 `tenga`, region WEUR
- Email: verified from `tengauk.com`, send-only key scoped to that domain
