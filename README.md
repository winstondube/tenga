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
site.json              url, base path and indexable flag. SET BEFORE LAUNCH
src/app.html           source of truth: markup, styles and app logic
src/pages.mjs          marketing page content, generated from live config
build.mjs              builds everything below
index.html             the app, with the landing page pre-rendered
shop/<retailer>/       one page per approved retailer
delivery/<city>/       one page per destination
what-it-costs/         pricing with live worked examples
what-we-cannot-send/   restricted goods
how-it-works/
sitemap.xml, robots.txt
```

Generated files are built output. Do not edit them by hand; edit `src/` and rebuild.

`src/app.html` is a fragment with no `<head>` because it is also published as a Claude artifact, where the runtime supplies the document shell.

---

## Built for search from the start

The application is a single-page app, which is fine for the app and useless for search: a crawler that does not run JavaScript sees an empty `<div>`. So the build does two things about it.

**The landing page is pre-rendered.** `build.mjs` executes the app's own view functions in Node and writes the resulting HTML into `index.html`. A crawler sees the full hero, copy and images in view-source; the app then boots over the top. One source, no duplication, no drift.

**The marketing pages are real static HTML** at real URLs, generated from the live config. Retailer delivery rules, cargo rates, restricted keywords and every worked example come from the same data the app runs on, so the content cannot contradict what the business actually does. Change the fee in Settings and every page's arithmetic changes with it.

Each page carries a canonical, Open Graph tags, `BreadcrumbList` and `FAQPage` structured data. The home page adds `Organization` and `Service`.

Nobody searches for a landing page. They search for their problem, which is why the pages are shaped as *"Buy from Boots and ship to Zimbabwe"* and *"What we cannot send"* rather than as more sections on the homepage.

### Launch checklist

Everything below is `site.json`. Nothing else needs a find-and-replace.

1. Buy the domain.
2. Set `url` to the real origin, no trailing slash. Set `base` to `/`.
3. Create a `CNAME` file at the repo root containing the bare domain.
4. Point the DNS at GitHub Pages, or move the built output to any static host.
5. Set `indexable` to `true`. This flips the robots meta and swaps `robots.txt` from Disallow-all to Allow.
6. Rebuild, deploy, then submit `sitemap.xml` in Google Search Console.

Until step 5 the site is deliberately invisible to search, because the demo carries fictional customer data.

**Realistic expectation:** SEO on a new domain takes six to twelve months to compound. For this market the first customers will come from WhatsApp groups and Facebook, not Google. The value of getting this right now is that it starts compounding the day the domain goes live rather than the day someone remembers to do it.

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
| Minimum product spend | £40 per request, before fee, UK delivery and shipping |
| Procurement fee | 20% of product value, minimum £10 |
| Fee basis | Combined product value (configurable to per-retailer) |
| UK retailer delivery | At cost, calculated **separately per retailer** |
| Quote expiry | 60 minutes, configurable per quote |
| Price rise absorbed at purchase | Up to £2, above that the customer decides |
| Zimbabwe shipping | **Inside the single payment**, estimated at quote, reconciled on arrival |
| Sea freight | Bought **by the box**: 453 x 366 x 326 mm = 54.05 L for £120. Quoted at £2.96/L (usable litres), reconciled at £2.22/L (gross litres of the packed carton) |
| Air freight | £12.50/kg |
| Which is cheaper | Depends on **density, not size or price**. Crossover is ~237 kg/m³: cosmetics and liquids sail, clothing, shoes and wigs fly, usually for less money AND two months less waiting |
| Clearance | £6, quoted at cost and **never marked up** |
| Shipping tolerance | £0.50. Every real difference is refunded or asked for, not absorbed |
| Sea schedule | Monthly. Order by the 15th, goods with us by the 20th, handed over on the 25th |
| Sea crossing | 6 to 7 weeks, so 6-7 weeks best case and 10-11 weeks if you miss the 15th |
| Air | 5 to 7 days once the goods are with us, no sailing to wait for |
| Insurance | **None, at any price.** Not available for consumer goods into Zimbabwe. Partner has 5 years on the route with no major incident. Tracking on both routes |
| Cancellation deadline | 2 working days before departure, and within 28 days of purchase |
| Cancellation handling fee | 5% of the item, minimum £6, plus anything the shop withholds |

The 10% margin and the £0.50 tolerance work together deliberately: the quote is
padded, so the normal outcome after weighing is a small refund to the customer
rather than a silent gain to us. Raising the tolerance back up would turn that
padding into retained overcharge, which is what it used to be.

The two sea rates are not a markup on each other. Quoting works from the sum of
item volumes, which is the space the goods themselves occupy, so it divides by
the USABLE litres of a box: the void between things is already priced into that
smaller denominator. Reconciling works from the outer carton actually packed,
which already contains the void, so it divides by the GROSS litres. Charge the
carton at the quoting rate and the customer pays for the same empty space twice.

Worked examples from the spec, both verified in the build:

- £40 product + £4 UK delivery + £10 fee = **£54**
- £100 product + £0 UK delivery + £20 fee = **£120**

### Gates that cannot be skipped

- A quote cannot be built until every item has a confirmed price.
- A quote cannot be built while any restricted-keyword flag is unresolved.
- A quote is never sent without an administrator pressing send.
- An order does not enter the purchasing queue until payment is completed.
- An item cannot be cancelled once the shipment has left the UK; the action refuses.
- Shipping is not refunded on a partial cancellation, because the weigh-in already returns it.

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

## Tests

```bash
node tests/all.mjs           # everything
node tests/all.mjs refund    # just the refund tests
```

19 files, run against the current `src/app.html`. They eval the app's own
`<script>` block against a stubbed DOM, so they exercise the real pricing, the
real status machine and the real render functions rather than copies. That is
why they keep finding things: there is nothing to drift out of sync with.

`run.js` is the broad one, walking every route against every admin tab and
failing on a thrown error, an error view, or an `undefined` leaking into the
HTML. The rest are narrow and were each written to pin a specific bug found by
driving the app in a browser.

**Driving it in a real browser found bugs that reading it never did.** Five
real defects surfaced that way in one session: a shipping-weight field that
silently did nothing, two footers stacked on every page, the whole Zimbabwe leg
telling customers their quote was on its way, a hardcoded 10-day crossing that
was really 6 weeks, and a cancel button that refunded the full line with no
deductions. Prefer that over code review when checking this project.

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
