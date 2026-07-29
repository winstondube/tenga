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

const DESTINATIONS = [
  { slug: 'harare', name: 'Harare', blurb: 'Our largest destination by a distance. Collection from Belgravia, or delivery across the northern and eastern suburbs.', areas: 'Mount Pleasant, Borrowdale, Avondale, Highlands, Belgravia, Msasa, Waterfalls, Chitungwiza' },
  { slug: 'bulawayo', name: 'Bulawayo', blurb: 'Weekly consolidation to Bulawayo, with collection from a depot on Fife Street.', areas: 'Hillside, Suburbs, Famona, Northend, Bradfield, Nkulumane' },
  { slug: 'mutare', name: 'Mutare', blurb: 'Delivered through our cargo partner’s Mutare branch, usually a day or two behind Harare.', areas: 'Murambi, Fairbridge Park, Dangamvura, Chikanga' },
  { slug: 'gweru', name: 'Gweru', blurb: 'Consolidated with the Harare shipment and forwarded on, so timings run a little longer.', areas: 'Mkoba, Windsor Park, Senga, Ascot' },
  { slug: 'masvingo', name: 'Masvingo', blurb: 'Forwarded from Harare after clearance. Collection is usually the quickest option here.', areas: 'Rujeko, Mucheke, Target Kopje' }
];

const esc = s => String(s == null ? '' : s)
  .replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- shared fragments ---------- */

function steps(api, cta) {
  return `<div class="steps">
    <div class="step"><span class="n">01</span><b>Send the link</b><span class="small muted">Paste the product page address, tell us the size and how many.</span></div>
    <div class="step"><span class="n">02</span><b>We check it by hand</b><span class="small muted">A person opens the link and confirms the price and stock with the shop.</span></div>
    <div class="step"><span class="n">03</span><b>You pay one total</b><span class="small muted">Product, UK delivery, our fee and the flight home, in a single payment.</span></div>
    <div class="step zw"><span class="n">04</span><b>It lands in Zimbabwe</b><span class="small muted">Checked in the UK, flown out, then delivered or collected.</span></div>
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
        <tr><td>Flight to Zimbabwe</td><td class="mono">${api.money(s.cargoRate)}/kg</td><td>Minimum ${api.money(s.cargoMin)}, plus ${api.money(s.clearance)} clearance and ${api.money(s.localDelivery)} local delivery.</td></tr>
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
      <div class="l"><span>Flight and clearance</span><span class="v">${api.money(q.cargoEst)}</span></div>
      <div class="l total"><span>You pay, once</span><span class="v">${api.money(q.total)}</span></div>
    </div>
    <p class="tiny muted" style="margin-top:10px">Worked with today’s rates. Your real quote is confirmed against the shop before you pay.</p>
    </div></div>`;
}

/* ---------- page builders ---------- */

export function buildPages(api) {
  const s = api.settings;
  const pages = [];
  const approved = api.retailers.filter(r => r.status !== 'disabled');

  /* ---- one page per retailer ---- */
  approved.forEach(r => {
    const c = RETAILER_COPY[r.id] || { blurb: `${r.name} is on our approved list, so you can send us any product link from them.`, popular: [], gotcha: '' };
    const delivery = r.freeOver
      ? `${api.money(r.delivery)} standard, free once the basket passes ${api.money(r.freeOver)}`
      : `${api.money(r.delivery)} standard`;
    pages.push({
      path: `shop/${r.id}/`,
      title: `Buy from ${r.name} and ship to Zimbabwe`,
      description: `Send us a ${r.name} link and we buy it, check it and fly it to Zimbabwe. One price including shipping, confirmed before you pay. Minimum ${api.money(s.minSpend)}.`,
      h1: `Buy from ${r.name} and ship to Zimbabwe`,
      lede: `${r.name} will not deliver to Zimbabwe and will not take a Zimbabwean card. Send us the link instead. We buy it in the UK, check it, and fly it out.`,
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
        [`How long does a ${r.name} order take to reach Zimbabwe?`, `Two to three days for ${r.name} to reach our UK address, then we check it in and put it on the next shipment. Allow around two to three weeks door to door, depending on the cargo schedule and clearance.`],
        [`What if the price changes after I pay?`, `Small rises up to ${api.money(s.absorbIncrease)} we absorb. Anything larger and we come back to you with options before we buy: pay the difference, change the item, reduce the quantity or get a refund.`],
        [`What if it is out of stock when you go to buy it?`, `We contact you. You can wait for restock, accept a substitute you have already approved, pick something else, or take a refund on that item. We never substitute without your say-so unless you gave us a backup link up front.`]
      ]
    });
  });

  /* ---- shop index ---- */
  pages.push({
    path: 'shop/',
    title: 'UK shops we buy from and ship to Zimbabwe',
    description: 'Boots, Superdrug, ASOS, LookFantastic, Cult Beauty and more. Send a link from any approved UK shop and we buy it and fly it to Zimbabwe.',
    h1: 'UK shops we buy from',
    lede: 'Send a product link from any of these and we can quote it. If your shop is not listed, send the link anyway and we will tell you whether we can buy there.',
    crumbs: [['Shops', 'shop/']],
    body: `
      <div class="steps" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
        ${approved.map(r => `<div class="step"><b><a href="{{BASE}}shop/${r.id}/">${esc(r.name)}</a></b>
          <span class="small muted">${r.freeOver ? `Free UK delivery over ${api.money(r.freeOver)}` : `${api.money(r.delivery)} UK delivery`}${r.status === 'manual' ? ' · manual review' : ''}</span></div>`).join('')}
      </div>
      <h2>Not on the list?</h2>
      <p>Send the link anyway. We add shops when enough people ask for them, and we will tell you honestly if a shop is one we cannot work with, usually because their dispatch times are too unpredictable to quote against.</p>
      ${steps(api, '{{BASE}}#/request')}`,
    faq: [
      ['Why can I not just order from these shops myself?', 'Most UK retailers will not deliver to Zimbabwe, and their checkouts reject cards without a UK billing address. That is the problem this service exists to solve.'],
      ['Can I order from more than one shop in the same request?', 'Yes, and most people do. You will pay each shop’s UK delivery separately because that is what we are charged, but our fee and the flight are worked out across the whole order.']
    ]
  });

  /* ---- destinations ---- */
  DESTINATIONS.forEach(d => {
    pages.push({
      path: `delivery/${d.slug}/`,
      title: `UK to ${d.name} delivery, shopping and forwarding`,
      description: `Order from UK shops and have it delivered or collected in ${d.name}. One price including the flight, confirmed before you pay.`,
      h1: `UK shopping delivered to ${d.name}`,
      lede: `Send a link from a UK shop and we buy it, check it in the UK and send it to ${d.name}. Collection or delivery, your choice.`,
      crumbs: [['Delivery', 'delivery/'], [d.name, `delivery/${d.slug}/`]],
      body: `
        <p>${d.blurb}</p>
        <h2>Areas we reach</h2>
        <p>${esc(d.areas)}. If your area is not listed, collection is always available, and we will tell you before you pay whether delivery to your address is possible.</p>

        <h2>How long it takes to ${esc(d.name)}</h2>
        <table class="t">
          <tbody>
            <tr><td>You send the link</td><td class="mono">day 0</td></tr>
            <tr><td>We confirm the price and you pay</td><td class="mono">within ${s.responseHours} hours</td></tr>
            <tr><td>Shop delivers to our UK address</td><td class="mono">2 to 5 days</td></tr>
            <tr><td>Checked, packed and flown out</td><td class="mono">next shipment</td></tr>
            <tr><td>Clearance and on to ${esc(d.name)}</td><td class="mono">2 to 4 days</td></tr>
          </tbody>
        </table>
        <p class="small muted">Around two to three weeks door to door in normal conditions. Consolidating several items into one order is faster than sending them separately, because everything waits for the slowest shop.</p>

        <h2>What it costs to ${esc(d.name)}</h2>
        <p>The flight is ${api.money(s.cargoRate)} per kilo with a ${api.money(s.cargoMin)} minimum, plus ${api.money(s.clearance)} clearance and ${api.money(s.localDelivery)} for local delivery. All of it is inside the single price you agree up front, so there is nothing to settle when the parcel arrives. <a href="{{BASE}}what-it-costs/">Full breakdown</a>.</p>

        <h2>How it works</h2>
        ${steps(api, '{{BASE}}#/request')}`,
      faq: [
        [`Do I pay anything when the parcel reaches ${d.name}?`, `No. Shipping and clearance are inside the price you agreed before we bought anything. The only exception is if the parcel weighs more than we estimated by more than ${api.money(s.cargoTolerance)}, in which case we tell you before it ships.`],
        [`Can someone else collect for me in ${d.name}?`, 'Yes. Give us their name and phone number when you order. They will need ID matching the name on the order.'],
        [`What if I am not in ${d.name}?`, 'We reach the main centres and can forward on from Harare to most towns. Tell us where you are when you send the link and we will price it honestly.']
      ]
    });
  });

  pages.push({
    path: 'delivery/',
    title: 'Where we deliver in Zimbabwe',
    description: 'Harare, Bulawayo, Mutare, Gweru and Masvingo. UK shopping delivered or collected, with shipping inside the price.',
    h1: 'Where we deliver in Zimbabwe',
    lede: 'Collection points in the main centres, delivery to most suburbs, and forwarding on from Harare for everywhere else.',
    crumbs: [['Delivery', 'delivery/']],
    body: `<div class="steps" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
        ${DESTINATIONS.map(d => `<div class="step zw"><b><a href="{{BASE}}delivery/${d.slug}/">${esc(d.name)}</a></b><span class="small muted">${esc(d.blurb)}</span></div>`).join('')}
      </div>
      ${steps(api, '{{BASE}}#/request')}`,
    faq: [['Do you deliver outside the main centres?', 'We forward on from Harare to most towns. Tell us where you are when you send the link and we will quote it before you commit.']]
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
      <p>Air cargo has a ${api.money(s.cargoMin)} minimum charge whether your parcel weighs 200 grams or two kilos. On a very small order the flight would cost more than the goods, which is not a service anyone should buy. The ${api.money(s.minSpend)} minimum keeps the shipping proportionate. If you are near it, adding one more item usually makes the whole order better value per item.</p>

      <h2>Why shipping is estimated, and what happens if it is wrong</h2>
      <p>We work the flight out from what you ordered, using the size and product type, before your parcel physically exists. Once it lands at our UK address it goes on the scales. If the real cost is within ${api.money(s.cargoTolerance)} of our estimate we absorb the difference and say nothing. Outside that, we either ask you for the difference or refund it, and we tell you before the parcel ships either way.</p>

      <h2>What we make</h2>
      <p>Our fee, and nothing else. We do not mark up the product, we do not mark up UK delivery, and we do not mark up the flight. If a discount code appears between your quote and our purchase, the saving is yours.</p>

      ${steps(api, '{{BASE}}#/request')}`,
    faq: [
      ['Are there any hidden charges?', `No. One payment covers the product, UK delivery, our ${s.procurementPct}% fee and the flight to Zimbabwe including clearance. Nothing is due on arrival.`],
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
      <p>Your quote shows the product, UK delivery per shop, our fee and the flight to Zimbabwe, then one number. It is valid for ${s.quoteExpiryMins} minutes, because retailer prices genuinely move that fast and we will not hold a price we cannot buy at. If it lapses, ask and we will recheck and resend.</p>

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

  return pages;
}

export { DESTINATIONS };
