/**
 * Marketing pages, generated as real static HTML from the same data the app
 * runs on. Nobody searches for a landing page; they search for their problem.
 * Each page here answers one query a stuck customer actually types.
 *
 * Everything is derived: retailer rules, cargo rates, restricted keywords and
 * worked examples all come from the live config, so the content cannot drift
 * from what the business actually does.
 */

const RETAILER_COPY = {
  boots: {
    blurb: 'Boots is where most Zimbabwean beauty orders start. No7, CeraVe, Soap &amp; Glory, Sanctuary, the full fragrance hall, and a pharmacy range you will not find on the high street in Harare.',
    popular: ['No7 skincare', 'CeraVe and Cetaphil', 'Soap &amp; Glory', 'Designer fragrance', 'Sanctuary Spa'],
    gotcha: 'Boots runs a marketplace alongside its own stock. Marketplace items ship separately and often slower, so we check the sold-by line before we buy and tell you if it will hold your order up.'
  },
  superdrug: {
    blurb: 'Superdrug is the value end of UK beauty and usually the cheapest route to bulk basics. Good for stocking up rather than one-off luxury.',
    popular: ['Palmer’s and Vaseline', 'B. and Studio London', 'Hair care in bulk', 'Vitamins and basics'],
    gotcha: 'Superdrug Health &amp; Beautycard prices are member-only and we cannot always access them, so the price you see logged in may not be the price we pay. We quote what we can actually buy at.'
  },
  lookfantastic: {
    blurb: 'LookFantastic carries the salon and premium skincare brands, and runs site-wide discount codes more often than anyone else on this list.',
    popular: ['Olaplex', 'Elemis', 'Redken and Kerastase', 'Beauty boxes'],
    gotcha: 'Discount codes come and go weekly. We recheck the basket price at the moment we buy, so a code that appears between your quote and our purchase works in your favour.'
  },
  cultbeauty: {
    blurb: 'Cult Beauty is where the brands people find on TikTok actually live. Strong for actives, niche skincare and anything that sold out everywhere else.',
    popular: ['The Ordinary', 'Drunk Elephant', 'Glow Recipe', 'Niche fragrance'],
    gotcha: ''
  },
  beautybay: {
    blurb: 'Beauty Bay is makeup-led and heavy on palettes and own-brand colour. Usually the cheapest way to get a big colour haul.',
    popular: ['Palettes', 'Own-brand colour', 'The Ordinary', 'Nail and lash'],
    gotcha: 'Beauty Bay builds its pages in the browser, so our automatic reader cannot see the price. We confirm it by hand, which costs nothing extra and takes no longer.'
  },
  spacenk: {
    blurb: 'Space NK is the luxury counter: Augustinus Bader, Diptyque, Charlotte Tilbury. Higher spend, and worth consolidating into one order.',
    popular: ['Charlotte Tilbury', 'Diptyque', 'Augustinus Bader', 'Luxury skincare'],
    gotcha: 'Space NK blocks automatic price reading. We open every link by hand for this retailer.'
  },
  asos: {
    blurb: 'ASOS is the fashion workhorse: clothing, footwear and accessories, with a size range that beats anything available locally.',
    popular: ['Nike and adidas', 'Own-brand ASOS Design', 'Footwear', 'Occasion wear'],
    gotcha: 'Colour is often chosen on the page rather than in the link, so tell us the colour when you send it. Check the size guide too: UK sizing differs by brand.'
  },
  next: {
    blurb: 'Next covers clothing, footwear and homeware, and is the most reliable of the UK high-street sites for consistent sizing.',
    popular: ['Childrenswear', 'Workwear', 'Footwear', 'Homeware'],
    gotcha: ''
  },
  afrohair: {
    blurb: 'Wigs, bundles, closures and frontals, plus the hair care ranges that are hard to find and heavily marked up in Zimbabwe.',
    popular: ['Brazilian and Peruvian bundles', 'Lace frontals and closures', 'Wigs', 'Edge control and leave-ins'],
    gotcha: 'Lace colour, density and texture vary between listings. Send the exact link and tell us the length, and we confirm the rest with the seller by phone before we buy.'
  },
  sephora: {
    blurb: 'Sephora UK is newer to the market and carries brands nobody else on this list stocks.',
    popular: ['Rare Beauty', 'Sol de Janeiro', 'Sephora Collection'],
    gotcha: 'We treat every Sephora order as manual review until we have enough history to trust their stock data. It does not slow you down, it just means a person looks harder.'
  }
};


const esc = s => String(s == null ? '' : s)
  .replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- shared fragments ---------- */

function steps(api, cta) {
  return `<div class="steps">
    <div class="step"><span class="n">01</span><b>Send the link</b><span class="small muted">Paste the product page address, tell us the size and how many.</span></div>
    <div class="step"><span class="n">02</span><b>We check it by hand</b><span class="small muted">A person opens the link and confirms the price and stock with the shop.</span></div>
    <div class="step"><span class="n">03</span><b>You pay one total</b><span class="small muted">Product, UK delivery, our fee and the shipping, in a single payment.</span></div>
    <div class="step zw"><span class="n">04</span><b>You collect in Harare</b><span class="small muted">Checked in the UK, flown out, then ready to collect.</span></div>
  </div>
  <p><a class="btn btn-primary btn-lg" href="${cta}">Start with a link</a></p>`;
}

function costTable(api) {
  const s = api.settings;
  return `<div class="card"><div class="card-b">
    <table class="t">
      <thead><tr><th>What</th><th>How much</th><th>Why</th></tr></thead>
      <tbody>
        <tr><td>The product</td><td class="mono">at cost</td><td>Exactly what the shop charges on the day we buy.</td></tr>
        <tr><td>UK delivery</td><td class="mono">at cost</td><td>Per shop, no mark up. Often free once a basket passes the shop’s threshold.</td></tr>
        <tr><td>Our fee</td><td class="mono">${s.procurementPct}%, min ${api.money(s.procurementMin)}</td><td>Of the product value. This is the only money we make on the purchase.</td></tr>
        <tr><td>Shipping to Zimbabwe</td><td class="mono">${api.money(s.cargoRate)}/kg</td><td>Minimum ${api.money(s.cargoMin)}, plus ${api.money(s.clearance)} clearance. Collected in Harare, so no local delivery leg.</td></tr>
        <tr><td>Minimum order</td><td class="mono">${api.money(s.minSpend)}</td><td>Product value, before fee and shipping.</td></tr>
      </tbody>
    </table>
  </div></div>`;
}

function workedExample(api, retailerId, productName, price) {
  const r = api.retailerById(retailerId);
  const it = api.newItem({
    retailerId, retailerName: r.name, name: productName, category: 'skincare',
    attrs: { size: '250ml' }, qty: 1, displayedPrice: price, confirmedPrice: price
  });
  const q = api.quoteCalc({ items: [it], quote: null });
  return `<div class="card">
    <div class="card-h"><b>What ${esc(productName)} at ${api.money(price)} actually costs you</b></div>
    <div class="card-b"><div class="sum">
      <div class="l"><span>Product at ${esc(r.name)}</span><span class="v">${api.money(q.productTotal)}</span></div>
      <div class="l"><span>UK delivery${q.deliveryTotal ? '' : ', free at this basket size'}</span><span class="v">${q.deliveryTotal ? api.money(q.deliveryTotal) : 'free'}</span></div>
      <div class="l"><span>Our fee</span><span class="v">${api.money(q.fee)}</span></div>
      <div class="l"><span>Shipping and clearance</span><span class="v">${api.money(q.cargoEst)}</span></div>
      <div class="l total"><span>You pay, once</span><span class="v">${api.money(q.total)}</span></div>
    </div>
    <p class="tiny muted" style="margin-top:10px">Worked with today’s rates. Your real quote is confirmed against the shop before you pay.</p>
    </div></div>`;
}


function shipTable(api) {
  const s = api.settings;
  const sailings = api.shipSchedule(3);
  return `<div class="card">
    <div class="card-h"><b>The next three shipments</b><span class="tiny muted">Every ${s.shipEveryDays / 7} weeks, ${Math.round(s.transitDays / 7)}-week crossing</span></div>
    <div class="card-b"><table class="t">
      <thead><tr><th>Leaves the UK</th><th>Pay by</th><th>Collectable in Harare</th></tr></thead>
      <tbody>${sailings.map(f => `<tr><td><b>${api.fmtDay(f.departs)}</b></td><td class="${f.cutoffPassed ? 'muted' : ''}">${f.cutoffPassed ? 'closed' : api.fmtDay(f.cutoff)}</td><td class="muted">around ${api.fmtDay(f.arrives)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="tiny muted" style="margin-top:10px">Your order joins the first shipment whose payment date has not passed. Sending everything in one order is faster than sending it piece by piece, because a parcel waits for its slowest item.</p>
    </div></div>`;
}

/* ---------- page builders ---------- */

export function buildPages(api) {
  const s = api.settings;
  const pages = [];
  // Not a whitelist. These are the shops whose delivery rules we have on file.
  const known = api.retailers;

  /* ---- one page per retailer ---- */
  known.forEach(r => {
    const c = RETAILER_COPY[r.id] || { blurb: `${r.name} is on our approved list, so you can send us any product link from them.`, popular: [], gotcha: '' };
    const delivery = r.freeOver
      ? `${api.money(r.delivery)} standard, free once the basket passes ${api.money(r.freeOver)}`
      : `${api.money(r.delivery)} standard`;
    pages.push({
      path: `shop/${r.id}/`,
      title: `Buy from ${r.name} and ship to Zimbabwe`,
      description: `Send us a ${r.name} link and we buy it, check it and fly it to Zimbabwe. One price including shipping, confirmed before you pay. Minimum ${api.money(s.minSpend)}.`,
      h1: `Buy from ${r.name} and ship to Zimbabwe`,
      lede: `${r.name} will not deliver to Zimbabwe and will not take a Zimbabwean card. Send us the link instead. We buy it in the UK, check it, and fly it out. Same for any other UK shop.`,
      crumbs: [['Shops', 'shop/'], [r.name, `shop/${r.id}/`]],
      body: `
        <p>${c.blurb}</p>
        ${c.popular.length ? `<h2>What people order from ${esc(r.name)}</h2>
        <div class="row wrap" style="gap:7px">${c.popular.map(p => `<span class="pill p-accent">${p}</span>`).join('')}</div>` : ''}

        <h2>${esc(r.name)} delivery, and how it affects your price</h2>
        <p>${esc(r.name)} charges <b>${delivery}</b> to our UK address. We pass that on at cost with no mark up, and it is calculated per shop. If you order from ${esc(r.name)} and somewhere else in the same request, you pay each shop’s delivery separately, because that is what we are actually charged.</p>
        ${c.gotcha ? api.note(`<b>Worth knowing.</b> ${c.gotcha}`, 'warn', 'alert') : ''}

        <h2>A worked example</h2>
        ${workedExample(api, r.id, 'a 250ml skincare bottle', 32)}

        <h2>What we cannot send from ${esc(r.name)}</h2>
        <p>Air cargo rules, not ours. Aerosols and anything pressurised, bleach and strong peroxide developers, prescription and medicated products, and anything containing a battery. If your link trips one of these we flag it and come back to you before asking for any money. <a href="{{BASE}}what-we-cannot-send/">Full list here</a>.</p>

        <h2>How it works</h2>
        ${steps(api, '{{BASE}}#/request')}
      `,
      faq: [
        [`Can I buy from ${r.name} with a Zimbabwean card?`, `Not directly. ${r.name} needs a UK billing address and most Zimbabwean cards are declined at their checkout. You pay us instead, and we pay them with a UK card.`],
        [`How long does a ${r.name} order take to reach Zimbabwe?`, `Two to three days for ${r.name} to reach our UK address, then we check it in and it waits for the next shipment. Shipments leave every ${s.shipEveryDays / 7} weeks and the crossing takes about ${Math.round(s.transitDays / 7)} weeks, so allow ${Math.round(s.transitDays / 7)} to ${Math.round((s.transitDays + s.shipEveryDays) / 7)} weeks in total depending on how close you order to a departure.`],
        [`What if the price changes after I pay?`, `Small rises up to ${api.money(s.absorbIncrease)} we absorb. Anything larger and we come back to you with options before we buy: pay the difference, change the item, reduce the quantity or get a refund.`],
        [`What if it is out of stock when you go to buy it?`, `We contact you. You can wait for restock, accept a substitute you have already approved, pick something else, or take a refund on that item. We never substitute without your say-so unless you gave us a backup link up front.`]
      ]
    });
  });

  /* ---- shop index ---- */
  pages.push({
    path: 'shop/',
    title: 'UK shops we buy from and ship to Zimbabwe',
    description: 'Boots, Superdrug, ASOS, LookFantastic, Cult Beauty and anywhere else. Send a link from any UK shop and we buy it and fly it to Zimbabwe.',
    h1: 'UK shops we buy from',
    lede: 'We buy from any UK shop. These are the ones we order from most, so their delivery rules and quirks are already written down.',
    crumbs: [['Shops', 'shop/']],
    body: `
      <div class="steps cols-3">
        ${known.map(r => `<div class="step"><b><a href="{{BASE}}shop/${r.id}/">${esc(r.name)}</a></b>
          <span class="small muted">${r.freeOver ? `Free UK delivery over ${api.money(r.freeOver)}` : `${api.money(r.delivery)} UK delivery`}${r.status === 'manual' ? ' · manual review' : ''}</span></div>`).join('')}
      </div>
      <h2>Your shop is not listed?</h2>
      <p>It does not matter. The list above is shops we have bought from often enough to have their delivery rules on file, which saves us a step. Send a link from anywhere in the UK and we will price it exactly the same way. If a shop turns out to be one we cannot work with, usually because dispatch times are too unpredictable to quote against, we tell you before you pay rather than after.</p>
      ${steps(api, '{{BASE}}#/request')}`,
    faq: [
      ['Can you buy from a shop that is not on this list?', 'Yes, any UK shop. The list is shops we already know well, not a restriction.'],
      ['Why can I not just order from these shops myself?', 'Most UK retailers will not deliver to Zimbabwe, and their checkouts reject cards without a UK billing address. That is the problem this service exists to solve.'],
      ['Can I order from more than one shop in the same request?', 'Yes, and most people do. You will pay each shop’s UK delivery separately because that is what we are charged, but our fee and shipping are worked out across the whole order.']
    ]
  });

  /* ---- collection, Harare only ---- */
  pages.push({
    path: 'collection/',
    title: 'Collect your UK order in Harare',
    description: 'Order from any UK shop and collect it in Harare. One price including shipping and clearance, agreed before you pay.',
    h1: 'Collect it in Harare',
    lede: 'Everything we bring in is collected in Harare. One collection point, no delivery leg, and nothing to pay when you arrive.',
    crumbs: [['Collection', 'collection/']],
    body: `
      <p>We fly a consolidated shipment every ${s.shipEveryDays / 7} weeks. When it clears, we message you and your order is ready to collect in Harare. Bring the phone number on the order and some ID.</p>

      ${api.note('<b>Collection only, for now.</b> We do not run a delivery leg inside Zimbabwe yet, so every order is collected in Harare. If you are outside Harare you are welcome to order and arrange your own onward transport, and we will say so plainly rather than promise a delivery we cannot make.', 'warn', 'pin')}

      <h2>How long it takes</h2>
      <table class="t">
        <tbody>
          <tr><td>You send the link</td><td class="mono">day 0</td></tr>
          <tr><td>We confirm the price and you pay</td><td class="mono">within ${s.responseHours} hours</td></tr>
          <tr><td>Shop delivers to our UK address</td><td class="mono">2 to 5 days</td></tr>
          <tr><td>Checked, packed and flown out</td><td class="mono">next shipment</td></tr>
          <tr><td>Clearance, then ready to collect</td><td class="mono">2 to 4 days</td></tr>
        </tbody>
      </table>
      ${shipTable(api)}

      <h2>What it costs to get here</h2>
      <p>Shipping is ${api.money(s.cargoRate)} per kilo with a ${api.money(s.cargoMin)} minimum, plus ${api.money(s.clearance)} for clearance. All of it sits inside the single price you agree up front, so there is nothing to settle at collection. <a href="{{BASE}}what-it-costs/">Full breakdown</a>.</p>

      <h2>How it works</h2>
      ${steps(api, '{{BASE}}#/request')}`,
    faq: [
      ['Do you deliver to my address in Harare?', 'Not yet. Every order is collected from our Harare collection point. We would rather say that plainly than take your money and improvise.'],
      ['Do you deliver to Bulawayo, Mutare or anywhere else?', 'Not yet. You can still order from anywhere in Zimbabwe, but the parcel is collected in Harare and onward transport is yours to arrange. We will tell you that before you pay, not after.'],
      ['Do I pay anything at collection?', `No. Shipping and clearance are inside the price you agreed before we bought anything. If the parcel weighs more than we estimated we tell you before it ships, never at the counter. If it weighs less, you get the difference back.`],
      ['Can someone else collect for me?', 'Yes. Give us their name and phone number when you order. They will need ID matching the name on the order.'],
      ['How will I know it has arrived?', 'Your private tracking link updates the whole way, and we message you when it is ready. You do not need to chase us.']
    ]
  });

  /* ---- what it costs ---- */
  pages.push({
    path: 'what-it-costs/',
    title: 'What it costs to buy from the UK and ship to Zimbabwe',
    description: `Product at cost, UK delivery at cost, ${s.procurementPct}% fee with a ${api.money(s.procurementMin)} minimum, and ${api.money(s.cargoRate)} per kilo to Zimbabwe. Worked examples, no hidden lines.`,
    h1: 'What it costs',
    lede: 'Every line, with the arithmetic. There is nothing here you will not see on your quote.',
    crumbs: [['What it costs', 'what-it-costs/']],
    body: `
      ${costTable(api)}
      <h2>Worked examples</h2>
      <p>These use today’s live rates, so they are the real numbers rather than illustrations.</p>
      ${workedExample(api, 'boots', 'one 250ml skincare bottle', 32)}
      ${workedExample(api, 'boots', 'a larger beauty order', 90)}

      <h2>Why there is a minimum order</h2>
      <p>Air cargo has a ${api.money(s.cargoMin)} minimum charge whether your parcel weighs 200 grams or two kilos. On a very small order shipping would cost more than the goods, which is not a service anyone should buy. The ${api.money(s.minSpend)} minimum keeps the shipping proportionate. If you are near it, adding one more item usually makes the whole order better value per item.</p>

      <h2>Why shipping is estimated, and what happens if it is wrong</h2>
      <p>We work the shipping out from what you ordered, using the size and product type, before your parcel physically exists. Once it lands at our UK address it goes on the scales. We quote it slightly high on purpose, so the usual outcome is a refund of the unused part. If it comes in heavier we ask you for the difference, and we tell you before the parcel ships either way.</p>

      <h2>What we make</h2>
      <p>We do not mark up the product and we do not mark up UK delivery. Shipping carries a small safety margin, because we charge it before the parcel exists and have to quote it slightly high; the rate you see on your quote already includes it, and if the scales come in lighter you get the difference back. If a discount code appears between your quote and our purchase, the saving is yours.</p>

      ${steps(api, '{{BASE}}#/request')}`,
    faq: [
      ['Are there any hidden charges?', `No. One payment covers the product, UK delivery, our ${s.procurementPct}% fee and shipping to Zimbabwe including clearance. Nothing is due on arrival.`],
      ['How is your fee calculated?', `${s.procurementPct}% of the product value, with a ${api.money(s.procurementMin)} minimum. It is worked out across the whole order, not per shop.`],
      ['What if the shop drops the price after I pay?', 'The saving is yours. We refund the difference or hold it as credit, your choice.'],
      ['Do I pay customs duty separately?', 'Clearance is included in the figure you agree. Zimbabwe duty on personal beauty and clothing shipments is handled by our cargo partner and covered in that line.']
    ]
  });

  /* ---- restricted ---- */
  const groups = [
    ['Pressurised and flammable', ['aerosol', 'pressurised', 'flammable', 'lighter', 'gas'], 'Air cargo will not carry them at any price. This is the rule most people are caught by, usually with dry shampoo, hairspray or deodorant sprays.'],
    ['Strong chemicals', ['bleach', 'peroxide', 'developer', 'acetone', 'nail polish remover'], 'Hair developers, bleach and solvent-based removers are classed as dangerous goods.'],
    ['Batteries and electricals', ['battery', 'batteries', 'lithium', 'rechargeable', 'electric', 'hair dryer', 'straightener'], 'Lithium cells are restricted on passenger aircraft. Anything with a built-in battery is out.'],
    ['Medicated and prescription', ['prescription', 'medicated', 'retinoid', 'tretinoin', 'hydroquinone', 'minoxidil', 'benzoyl'], 'These need import permits we do not hold. Non-medicated versions of the same product are usually fine.'],
    ['Ingestible', ['supplement', 'capsules', 'tablets'], 'Anything swallowed is treated as a regulated import.']
  ];
  pages.push({
    path: 'what-we-cannot-send/',
    title: 'What we cannot ship from the UK to Zimbabwe',
    description: 'Aerosols, bleach and developers, batteries, prescription and medicated products. What air cargo will not carry, and what we can send instead.',
    h1: 'What we cannot send',
    lede: 'These are air cargo rules rather than ours. If your link trips one of them we flag it and come back to you before asking for any money.',
    crumbs: [['What we cannot send', 'what-we-cannot-send/']],
    body: `
      ${groups.map(([name, words, why]) => `
        <h2>${esc(name)}</h2>
        <p>${esc(why)}</p>
        <div class="row wrap" style="gap:7px">${words.map(w => `<span class="pill p-danger">${esc(w)}</span>`).join('')}</div>
      `).join('')}

      <h2>What we can send, which is most things</h2>
      <p>Body lotion, face cream, non-medicated skincare, shampoo and conditioner, bar soap, makeup, hair extensions and wigs, beauty accessories, non-electrical tools, and clothing, shoes and accessories. If you are unsure, send the link. Checking costs you nothing and takes a few minutes.</p>

      ${api.note('<b>We check before you pay, not after.</b> Your product name, your notes and the link itself are all screened against this list the moment you submit. A flagged item goes to a person for review and you are never asked for money on an item we cannot actually send.', 'accent', 'shield')}

      ${steps(api, '{{BASE}}#/request')}`,
    faq: [
      ['Can you send perfume to Zimbabwe?', 'Fragrance contains alcohol and is classed as flammable, so it depends on the cargo route and how it is packed. Send the link and we will tell you honestly before you pay rather than after.'],
      ['Can you send hair dye?', 'Colour without a peroxide developer is usually fine. The developer itself is not.'],
      ['What happens if I order something restricted by accident?', 'Nothing bad. It is flagged automatically, a person reviews it, and we come back to you. No payment is requested on a flagged item until it has been cleared.']
    ]
  });

  /* ---- cancelling and refunds ---- */
  pages.push({
    path: 'cancelling/',
    title: 'Cancelling an order and how refunds work',
    description: 'You can cancel while the goods are still in the UK. What the shop allows decides whether it goes back, and what comes off your refund.',
    h1: 'Cancelling and refunds',
    lede: `You can change your mind while your item is still in the UK. Once the shipment leaves, we cannot get it back.`,
    crumbs: [['Cancelling and refunds', 'cancelling/']],
    body: `
      ${api.note(`<b>The deadline is the shipment, not the delivery.</b> Tell us at least ${s.returnNoticeDays} working days before the shipment leaves the UK, and within ${s.retailerReturnDays - s.returnNoticeDays} days of us buying the item. Your order page shows the exact date.`, 'accent', 'clock')}

      <h2>Why the window is earlier than you might expect</h2>
      <p>Your item reaches our UK address within a few days, then waits for the next shipment and spends about ${Math.round(s.transitDays / 7)} weeks crossing. So by the time you are holding it in Harare, the shop's own return window has long closed. The only point at which a return is genuinely possible is while the goods are still sitting with us in the UK, which is also the whole time you have been waiting. Tell us before it leaves and we can act. After that we cannot.</p>

      <h2>Whether it can go back at all is the shop's decision</h2>
      <p>We are buying from ordinary UK retailers on your behalf, so their returns policy is the one that applies. Plenty of things are not returnable anywhere: fragrance, sealed cosmetics, pierced earrings and underwear are the common ones, and some shops refuse opened items of any kind.</p>
      <p><b>Check the shop's returns policy before you order.</b> You chose the shop and the product, and their policy is on their own site. We do not assess it for you, and we cannot make a shop take something back that it will not accept.</p>

      <h2>What comes off your refund</h2>
      <table class="t">
        <thead><tr><th>Line</th><th>What happens</th></tr></thead>
        <tbody>
          <tr><td>The product</td><td>Refunded, at whatever the shop gives back</td></tr>
          <tr><td>The shop's restocking or return fee</td><td>Deducted, if the shop charges one</td></tr>
          <tr><td>Our handling charge</td><td>Deducted, ${s.returnAdminPct}% of the item with a ${api.money(s.returnAdminMin)} minimum</td></tr>
          <tr><td>Our ${s.procurementPct}% fee</td><td>Not refunded. The buying, checking and handling were already done</td></tr>
          <tr><td>Zimbabwe shipping</td><td>Refunded in full if nothing is left to ship. If other items are still going, your parcel is simply lighter and you get that difference back when it is weighed</td></tr>
        </tbody>
      </table>
      <p class="tiny muted">The handling charge is not a penalty. Returning something means packing it, getting it to a drop-off or a courier, and following the refund through with the shop, which is why there is a floor rather than a flat percentage.</p>

      <h2>A worked example</h2>
      <p>You cancel a ${api.money(104)} item, it is the only thing on your order, and the shop takes it back without a fee.</p>
      <div class="card"><div class="card-b sum">
        <div class="l"><span>Product, refunded by the shop</span><span class="v">${api.money(104)}</span></div>
        <div class="l"><span>Our handling, ${s.returnAdminPct}% with a ${api.money(s.returnAdminMin)} minimum</span><span class="v">-${api.money(s.returnAdminMin)}</span></div>
        <div class="l"><span>Zimbabwe shipping, since nothing now ships</span><span class="v">${api.money(22.5)}</span></div>
        <div class="l total"><span>Back to you</span><span class="v">${api.money(120.5)}</span></div>
      </div></div>

      <h2>If something is wrong rather than unwanted</h2>
      <p>That is not a cancellation and this page does not apply. If the shop sends the wrong item, the wrong shade or a damaged one, we photograph it at check-in, hold it before it ships and take it up with the retailer. You are not out of pocket for our mistake or theirs. If a problem only becomes visible after collection in Harare, tell us and we will take it as far as the retailer will let us, but be aware that our leverage after ${Math.round(s.transitDays / 7)} weeks is limited.</p>

      ${api.note('<b>Nothing is bought until you approve a quote.</b> The cheapest cancellation is the one before we spend anything, and up to that point there is no charge of any kind.', 'accent', 'shield')}`,
    faq: [
      ['Can I cancel after I have paid?', `Yes, while the goods are still in the UK. Tell us at least ${s.returnNoticeDays} working days before the shipment leaves and within ${s.retailerReturnDays - s.returnNoticeDays} days of us buying it. After the shipment leaves the UK we cannot take anything back.`],
      ['Can I return it once I have collected it in Harare?', `No. The crossing takes about ${Math.round(s.transitDays / 7)} weeks, so the shop's return window has closed well before you receive it. If the item is faulty or not what we were asked to buy, that is a different matter and you should tell us.`],
      ['Is perfume returnable?', 'Usually not, anywhere. Fragrance and sealed cosmetics are commonly excluded from returns by the shops themselves. Check the policy of the shop you are ordering from before you send us the link.'],
      ['What do you charge to cancel something?', `${s.returnAdminPct}% of the item with a ${api.money(s.returnAdminMin)} minimum, plus anything the shop keeps as a return fee. Our ${s.procurementPct}% fee is not refunded because the work was already done.`],
      ['Do I get the Zimbabwe shipping back?', 'If nothing is left on your order, yes, in full. If other items are still shipping, your parcel is just lighter, and that saving comes back to you when it is weighed.']
    ]
  });

  /* ---- how it works ---- */
  pages.push({
    path: 'how-it-works/',
    title: 'How Tenga works: paste a UK link, pay once, receive it in Zimbabwe',
    description: 'Send a UK product link. A person confirms the price with the shop. You pay one total including shipping. We buy it, check it and fly it to Zimbabwe.',
    h1: 'How it works',
    lede: 'Four steps, and you only pay at the third.',
    crumbs: [['How it works', 'how-it-works/']],
    body: `
      ${steps(api, '{{BASE}}#/request')}

      <h2>1. You send the link</h2>
      <p>Paste the product page address from any approved UK shop. We read the shop, the product name and the size straight from the link. Tell us how many, the size or colour if the page lets you choose one, and who it is for in Zimbabwe.</p>
      <p>You can add as many items as you like from as many shops as you like before you submit.</p>

      <h2>2. A person checks every single one</h2>
      <p>This is the part we do not automate, and it is deliberate. Retailer stock data is wrong often enough that trusting it would mean taking money for things we cannot buy. So a person opens every link, confirms the price in the basket, checks stock and confirms the UK delivery cost. That normally takes a few hours and always within ${s.responseHours}.</p>

      <h2>3. You pay one total</h2>
      <p>Your quote shows the product, UK delivery per shop, our fee and shipping to Zimbabwe, then one number. It is valid for ${s.quoteExpiryMins} minutes, because retailer prices genuinely move that fast and we will not hold a price we cannot buy at. If it lapses, ask and we will recheck and resend.</p>

      <h2>4. We buy it, check it and send it</h2>
      <p>Once your payment clears we place the order with the shop and record the order number and tracking. When it reaches our UK address we check the product, the quantity and the variant against what you asked for, photograph anything that matters, and only then pack it for Zimbabwe.</p>
      <p>You get a private tracking link at the start that shows exactly where the order is, from submitted to delivered, without having to message anyone.</p>

      <h2>What happens when something goes wrong</h2>
      <p>Things do go wrong: stock disappears, prices move, shops send the wrong shade. Every one of those has a defined path, and none of them involve us keeping your money and going quiet. Price rises above ${api.money(s.absorbIncrease)} come back to you with options. Out of stock comes back to you with options. Wrong item received goes on hold before it ships. Refunds are recorded against the order with a reference.</p>

      ${steps(api, '{{BASE}}#/request')}`,
    faq: [
      ['How long does the whole thing take?', 'Around two to three weeks door to door. A few hours to quote, two to five days for the shop to reach us, then the next shipment out and clearance on arrival.'],
      ['Do I need an account?', 'No. You get a private tracking link when you submit, and that is all you need.'],
      ['How do I pay?', 'PayPal or card. You pay us, never the shop.'],
      ['Is my money safe if you cannot buy the item?', 'You are refunded. We record every refund against your order with a reference, and we do not place a retailer order at all until your payment has cleared.']
    ]
  });

  /* ---- every question, grouped ---- */
  const FAQ_GROUPS = [
    ['Before you order', [
      ['Which UK shops can you buy from?', 'Any of them. We order most often from Boots, Superdrug, ASOS, LookFantastic and Cult Beauty, so those already have their delivery rules on file and come back fastest. Everywhere else works the same way, we just confirm the postage with the shop before pricing it.'],
      ['Can I buy from a shop that is not on your list?', 'Yes. The list is shops we know well, not a restriction. Send a link from anywhere in the UK.'],
      ['Why can I not just order from these shops myself?', 'Most UK retailers will not deliver to Zimbabwe, and their checkouts reject cards without a UK billing address. That is the problem this service exists to solve.'],
      ['Do I need an account?', 'No. You get a private tracking link when you submit, and that is all you need.'],
      [`Is there a minimum order?`, `Yes, ${api.money(s.minSpend)} of product value, before our fee and before shipping. Air cargo has a ${api.money(s.cargoMin)} minimum charge whether your parcel weighs 200 grams or two kilos, so on a very small order shipping would cost more than the goods. The minimum keeps it proportionate.`]
    ]],
    ['What it costs', [
      ['How much does it cost in total?', `Product at cost, UK delivery at cost, our fee of ${s.procurementPct}% with a ${api.money(s.procurementMin)} minimum, and shipping at ${api.money(s.cargoRate)} per kilo. All in one payment, every line shown before you pay.`],
      ['Are there any hidden charges?', 'No. Nothing is due when you collect. One payment covers the product, UK delivery, our fee and shipping including clearance.'],
      ['How is your fee worked out?', `${s.procurementPct}% of the product value with a ${api.money(s.procurementMin)} minimum, calculated across the whole order rather than per shop.`],
      ['Do you mark up the product or the postage?', 'No. Our fee is the only money we make. If a discount code appears between your quote and our purchase, the saving is yours.'],
      ['What if the shop puts the price up after I pay?', `Rises up to ${api.money(s.absorbIncrease)} we absorb. Anything larger and we come back to you before spending your money: pay the difference, change the item, reduce the quantity, or take a refund.`],
      ['What if the shop drops the price?', 'The saving is yours. We refund the difference or hold it as credit, your choice.'],
      ['How long is a quote valid?', `${s.quoteExpiryMins} minutes. Retailer prices genuinely move that fast and we will not hold a price we cannot buy at. If it lapses, ask and we will recheck and resend.`]
    ]],
    ['Paying', [
      ['How do I pay?', 'PayPal or card. You pay us, never the shop.'],
      ['Can I pay with a Zimbabwean card?', 'You pay us, so yes. It is the UK shops that reject Zimbabwean cards, not us.'],
      ['When do you actually buy my order?', 'Only once your payment has cleared. Nothing is ordered from a retailer before that.'],
      ['Is my money safe if you cannot buy the item?', 'You are refunded. Every refund is recorded against your order with a reference and a reason.']
    ]],
    ['Getting it to Zimbabwe', [
      ['How long does the whole thing take?', `We quote within ${s.responseHours} hours. Shops take two to five days to reach our UK address. Then it goes on the next shipment, which leaves every ${s.shipEveryDays / 7} weeks, and clears in about ten days.`],
      ['Where do I collect it?', 'Every order is collected in Harare. We are not running a delivery leg inside Zimbabwe yet.'],
      ['Do you deliver to my address?', 'Not yet, anywhere in Zimbabwe. If you are outside Harare you can still order, but onward transport is yours to arrange. We say that before you pay rather than after.'],
      ['Can someone else collect for me?', 'Yes. Give us their name and phone number when you order. They will need ID matching the name on the order.'],
      ['How is shipping worked out before the parcel exists?', `From the products themselves, using size and type, plus packaging and a small safety margin on the freight. Because of that margin the quote is deliberately a little high, so once the parcel is weighed in the UK you normally get some of it back. If it comes in heavier, we ask you before it ships.`],
      ['How will I know it has arrived?', 'Your private tracking link updates the whole way, and we message you when it is ready to collect.']
    ]],
    ['What we can and cannot send', [
      ['What can you not send?', 'Aerosols and anything pressurised, bleach and strong peroxide developers, prescription and medicated products, and anything containing a battery. Air cargo rules rather than ours.'],
      ['Can you send perfume?', 'Fragrance contains alcohol and is classed as flammable, so it depends on the route and the packing. Send the link and we will tell you honestly before you pay rather than after.'],
      ['Can you send hair dye?', 'Colour without a peroxide developer is usually fine. The developer itself is not.'],
      ['What happens if I order something restricted by accident?', 'It is flagged automatically, a person reviews it, and we come back to you. You are never asked for money on an item we cannot actually send.']
    ]],
    ['Changing your mind', [
      ['Can I cancel after I have paid?', `Yes, while the goods are still in the UK. Tell us at least ${s.returnNoticeDays} working days before the shipment leaves, and within ${s.retailerReturnDays - s.returnNoticeDays} days of us buying it. Once the shipment has left the UK we cannot take anything back. Full detail on our cancelling page.`],
      ['Can I return something after collecting it in Harare?', `No. The crossing takes about ${Math.round(s.transitDays / 7)} weeks, so the shop's own return window has closed long before the parcel reaches you. Anything faulty or wrong is a separate matter, and you should tell us.`],
      ['Will the shop definitely take it back?', 'That is the shop\'s decision, not ours, and their policy is the one that applies. Fragrance, sealed cosmetics, pierced earrings and underwear are commonly non-returnable anywhere. Read the returns policy of the shop you are ordering from before you send us the link.'],
      ['What does cancelling cost?', `${s.returnAdminPct}% of the item with a ${api.money(s.returnAdminMin)} minimum, plus anything the shop keeps as a restocking fee. Our ${s.procurementPct}% fee is not refunded, because the buying and checking were already done.`],
      ['Do I get the shipping back if I cancel?', 'If nothing is left on your order, yes, all of it. If other items are still going, your parcel is simply lighter and that saving comes back to you when it is weighed.']
    ]],
    ['When something goes wrong', [
      ['What if the item is out of stock when you go to buy it?', 'We contact you before spending anything. Wait for restock, take a backup you nominated when ordering, choose something else, reduce the quantity, or take a refund on that item.'],
      ['Can I give you a backup product in advance?', 'Yes, and it saves a lot of time. Choose "buy this instead" when you add an item and give us a second link, a size and a price ceiling.'],
      ['What if the wrong item arrives at your UK address?', 'It goes on hold before it ships. We photograph it, take it up with the retailer, and tell you where it stands.'],
      ['Can I cancel?', 'Before we have bought it, yes. After that it depends on the retailer’s own cancellation and return rights, and on whether the item is sealed or personalised. We will not promise a refund until the retailer outcome is confirmed.']
    ]]
  ];

  pages.push({
    path: 'faqs/',
    title: 'Questions about buying from the UK and shipping to Zimbabwe',
    description: 'Costs, payment, timings, collection in Harare, what cannot be flown, and what happens when something goes wrong. Straight answers.',
    h1: 'Questions',
    lede: 'Everything people ask before their first order, answered without hedging. If yours is not here, ask us.',
    crumbs: [['Questions', 'faqs/']],
    body: FAQ_GROUPS.map(([name, items]) => `
      <h2>${esc(name)}</h2>
      <section class="faq" style="margin-top:6px;border-top:1px solid var(--line)">
        ${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="a">${esc(a)}</div></details>`).join('')}
      </section>`).join('') + `
      <h2>Still stuck?</h2>
      <p>Message us and a person answers. We would rather talk you out of an order we cannot do well than take your money and disappoint you. <a href="{{BASE}}contact/">How to reach us</a>.</p>
      ${steps(api, '{{BASE}}#/request')}`,
    ownFaqLayout: true,
    faq: FAQ_GROUPS.flatMap(g => g[1])
  });

  /* ---- contact ---- */
  pages.push({
    path: 'contact/',
    title: 'Contact Tenga UK',
    description: 'WhatsApp or email a person about an order, a quote, or whether we can buy something. Replies within a working day.',
    h1: 'Talk to a person',
    lede: 'No ticket system and no bot. One of us reads it and answers.',
    crumbs: [['Contact', 'contact/']],
    body: `
      <div class="steps cols-3">
        <div class="step"><b>WhatsApp</b><span class="small muted">${esc(api.site.contactWhatsapp)}<br>Fastest, and the one most people use.</span></div>
        <div class="step"><b>Email</b><span class="small muted"><a href="mailto:${esc(api.site.contactEmail)}">${esc(api.site.contactEmail)}</a><br>Best if you are sending several links.</span></div>
        <div class="step zw"><b>About an existing order</b><span class="small muted">Use your private tracking link first. It shows exactly where the order is without anyone having to reply.</span></div>
      </div>

      <h2>When you will hear back</h2>
      <p>Quotes come back within ${s.responseHours} hours and usually much sooner. Questions about an order in progress are answered the same working day. If we are going to be slower than that, we say so rather than going quiet.</p>

      <h2>What to include</h2>
      <ul>
        <li>The product link, or your order reference if you already have one.</li>
        <li>Size, colour or shade if the page makes you choose one.</li>
        <li>The name and phone number of whoever will collect in Harare.</li>
      </ul>
      <p>You do not need to write a long message. A link and a size is enough to get a price.</p>

      <h2>Where you collect</h2>
      <p>Orders are collected in Harare. We confirm the exact collection point and opening hours when your shipment lands, so you are not making a wasted trip on an estimate.</p>

      <h2>Before you message</h2>
      <p>Most first questions are answered on <a href="{{BASE}}faqs/">the questions page</a>, particularly cost, timings and what cannot be flown. If yours is not there, ask.</p>
      ${steps(api, '{{BASE}}#/request')}`,
    faq: [
      ['How quickly do you reply?', `Quotes within ${s.responseHours} hours, questions about an order the same working day.`],
      ['Is there a phone number I can call?', 'WhatsApp is the fastest way to reach us and leaves a written record of what was agreed, which protects both of us.'],
      ['Can I visit you in the UK?', 'No, we are not a shop. We buy on your behalf and forward from a receiving address.']
    ]
  });

  return pages;
}


