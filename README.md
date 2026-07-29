# Tenga UK

A buy-for-me and forwarding service. Customers send links to products sold by approved UK retailers, we confirm the real price and availability by hand, they pay one quote, we buy the item, check it, and forward it to Zimbabwe.

The platform is deliberately **not** a shop. There is no catalogue, no stock, no product descriptions of our own. The proposition is one line:

> Paste a UK product link, receive a confirmed quote, pay, and have the item purchased and forwarded to Zimbabwe.

**Live prototype:** https://winstondube.github.io/tenga/

---

## What this repo currently is

A clickable prototype, not the product. One self-contained HTML file, no server, no database. All state lives in the browser's `localStorage`, so anyone opening the link gets their own private copy of the demo data and cannot affect anyone else's.

It exists so the operating model can be reviewed and argued with before anything expensive gets built.

### Running it

Open `index.html` in a browser. That is the whole thing. There is nothing to install.

To rebuild after editing the source:

```
node build.mjs
```

### Layout

```
src/app.html    source of truth: markup, styles and application logic
build.mjs       wraps src/app.html into a complete document
index.html      built output, served by GitHub Pages. Do not edit by hand
docs/           product notes
```

`src/app.html` is a fragment with no `<head>` because it is also published as a Claude artifact, where the runtime supplies the document shell. `build.mjs` supplies that shell for the standalone build. One source, two homes.

---

## The two surfaces

Switch between them with **Customer / Operations** in the top bar.

**Customer.** Link submission with provisional extraction, multi-item basket, variant and substitution questions per item, request confirmation with reference, private tracking page, quote with confirmations, demo checkout.

**Operations.** Queue rail with live counts, dashboard, and an eight-tab order record: Review, Quote, Payments, Purchase, UK receiving, Cargo, Messages, History. Plus retailer configuration, restricted keywords, business rules, cargo batches, finance, reports and an audit log.

Seven demo orders are seeded at different stages so the queues are populated on first open. **Reset demo** in the top bar restores them.

---

## Business rules the prototype enforces

| Rule | Value |
|---|---|
| Minimum product spend | £40 per request, before fee, UK delivery and cargo |
| Procurement fee | 20% of product value, minimum £10 |
| Fee basis | Combined product value (configurable to per-retailer) |
| UK retailer delivery | At cost, calculated **separately per retailer** |
| Quote expiry | 60 minutes, configurable per quote |
| Price rise absorbed at purchase | Up to £2, above that the customer decides |
| Zimbabwe cargo | Separate payment, estimated at quote, confirmed on the scales |

Worked examples from the spec, both verified in the build:

- £40 product + £4 UK delivery + £10 fee = **£54**
- £100 product + £0 UK delivery + £20 fee = **£120**

### Gates that cannot be skipped

- A quote cannot be built until every item has a confirmed price.
- A quote cannot be built while any restricted-keyword flag is unresolved.
- A quote is never sent without an administrator pressing send.
- An order does not enter the purchasing queue until payment is completed.
- Links from unapproved retailers never proceed to quotation automatically.

Every price change, manual adjustment, refund, restriction clearance and status move is written to the audit log with before, after, reason, actor and timestamp.

---

## What is deliberately faked

The prototype demonstrates the flow. These parts are simulated and will need real implementations.

**Product extraction is real, but limited.** See the section below.

**Payments.** No provider is connected. The demo checkout marks a payment complete without money moving. Paying by PayPal in the demo deliberately lands as *Payment held* rather than completed, so the float decision is visible.

**Messages.** Email and WhatsApp are logged against the order, not sent.

**Attachments.** Invoices, receipts and photographs are recorded as filenames. There is no upload.

---

## Reading a product link

The retailer is matched from the domain. The product name and size are parsed from the URL slug, which works offline and instantly. The app then fetches the retailer page through a public CORS relay and parses the shop's own structured data: schema.org `Product` JSON-LD first, then Open Graph, then microdata. Relays are raced rather than tried in turn, so a dead one does not hold up a live one.

**No price is ever invented.** An earlier build hashed the URL to generate a plausible-looking price. A fabricated number that renders like a confirmed one is worse than no number at all, so it was removed. Where a price cannot be read, the field stays empty and the customer can type what they can see. Admin review records the difference between *read from page* and *customer reported*.

### Which retailers can be read

Tested 29 July 2026, against the live sites.

| Retailer | Automated read | Why |
|---|---|---|
| Boots | No | Imperva bot interstitial, "Pardon Our Interruption" |
| Superdrug | No | 403 Access Denied |
| ASOS | No | Connection refused to automated clients |
| Next | No | 403 on product paths |
| Beauty Bay | No | Client-rendered, 4.9 KB shell with no product data |
| LookFantastic | Likely | Serves full HTML including JSON-LD |
| Cult Beauty | Likely | Serves full HTML including JSON-LD |
| Space NK | Likely | Serves full HTML including prices |

The two highest-volume retailers are the two hardest blocked, and the public relays are themselves unreliable.

### The bookmarklet

A retailer can block a server. It cannot block the customer's own browser, which is already past the bot check with the price rendered on screen. So the price is read from there instead.

Open **"Shops that hide their prices from us"** on the request page and drag **Send to Tenga** to the bookmarks bar. Pressing it on any product page lifts the retailer's own data out of the live DOM and opens Tenga with it filled in.

Three layers are tried, most trustworthy first:

| Layer | Source | Trust |
|---|---|---|
| `schema.org` `Product` JSON-LD | Retailer stating its own price | High |
| `product:price:amount`, `itemprop=price` | Retailer stating its own price | High |
| Elements whose class or id says "price" | Reading the rendered page | Best effort, flagged |

The layer used is recorded and displayed, and carries through to admin review, so a price scraped from page text is visibly weaker than one the retailer stated.

**Verified on a live Boots page, 29 July 2026.** Boots publishes no JSON-LD, so layer 2 supplied £67.20, matching the displayed price. The same page also carries £84.00 (was), £1,344.00 (per litre), £16.80 (payment split) and £3.95 (delivery), any of which a naive text search would have picked instead. Only Boots has been tested end to end.

Images are matched on alt text against the product name and need a 70% match, never picked by size: the largest images on a Boots product page are "customers also bought". Boots' CDN refuses hotlinks, so imports from there show the generated swatch rather than a photo.

### Where this leaves extraction

A typing-saver, not a dependency. The service works entirely without it, which is what the spec prescribes: extracted information is provisional and an administrator confirms every price before a quote goes out.

When there is a backend, one endpoint calling a scraping service with residential proxies and JS rendering would cover the blocked retailers server-side. Around $30 to $50 a month.

---

## Route to production

The prototype's data model maps onto a real schema directly: orders, items, quotes, payments, purchases, receipts, cargo records, messages, audit entries.

Roughly in order of what unblocks the business:

1. **Server and database.** Nothing is real until orders survive a browser refresh on someone else's machine.
2. **Payments.** PayPal Business checkout first, then card via Stripe. Webhooks drive payment status, not the UI.
3. **Transactional email.** Quote sent, payment received, cargo payment required. These are the messages the business cannot operate without.
4. **Extraction service.** Start with the three or four retailers that account for most requests. Manual entry stays as the fallback forever.
5. **WhatsApp.** The channel most customers will actually read.
6. **File uploads.** Retailer invoices and goods-in photographs, for disputes.

Out of scope until the manual process has been proven at volume: automated retailer checkout, a product catalogue, live stock, cargo company API integration, customer accounts, a mobile app.

---

## Notes

Demo data is fictional. Customer names, retailer order numbers, tracking numbers and payment references are invented.

Website designed and built by [LaunchSite](https://welaunchsites.com/).
