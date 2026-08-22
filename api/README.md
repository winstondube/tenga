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

## Still to build

- PayPal: create order, capture, and the webhook that is the only thing allowed
  to mark an order paid
- Email and WhatsApp sending, with the message row updated to what actually
  happened
- The app talking to this instead of localStorage
