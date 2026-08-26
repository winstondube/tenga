// The new operations screens, rendered. Templates fail silently: a missing
// helper prints "undefined" and a missing number prints "NaN", and both look
// like content. So render every one and read what came out.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

// The inbox only exists with a server, so pretend one is configured. Nothing
// is fetched: loadInbox bails on S.session, and we set the data by hand.
global.window.TENGA_API = 'https://tenga-api.example.com';
global.fetch = () => Promise.reject(new Error('the view must not need the network to render'));

eval(js + `
const bad = h => {
  const hits = [];
  if (/\\bNaN\\b/.test(h)) hits.push('NaN');
  if (/\\bundefined\\b/.test(h)) hits.push('undefined');
  if (/\\[object Object\\]/.test(h)) hits.push('[object Object]');
  if (/\\$\\{/.test(h)) hits.push('an unrendered template hole');
  return hits;
};

console.log('GUIDED TOUR');
S.session='admin';
const g = adminGuide();
console.log('  steps                :', TOUR_STEPS.length);
console.log('  every one has a tip  :', TOUR_STEPS.every(x=>x.tip && x.tip.length>10));
console.log('  starts from the page :', g.includes('tourStart'));
console.log('  names the collection :', g.includes('Mbare Grillz'));
console.log('  renders clean        :', bad(g).length ? 'NO -> '+bad(g).join(', ') : 'yes');

// The one that matters: a step pointing at an anchor nobody put in the markup
// would silently fall back to a centred card, on every run, forever.
const markup = [viewAdmin(['dash'],{}), viewAdmin(['orders'],{q:'all'}), viewAdmin(['inbox'],{}),
                viewAdmin(['finance'],{}), viewAdmin(['batches'],{}), viewAdmin(['retailers'],{}),
                viewAdmin(['settings'],{}), viewAdmin(['audit'],{})].join('');
const orderRef = (S.orders.find(o=>o.quote&&!o.quote.sentAt&&!payTotals(o).initialPaid)||S.orders[0]).ref;
const orderPage = viewAdmin(['order',orderRef],{});
const all = markup + orderPage;
const anch = st => Array.isArray(st.a) ? st.a : [st.a];
const missing = TOUR_STEPS.filter(st => !anch(st).some(a => all.includes('data-tour="'+a+'"')));
console.log('  every anchor exists  :', missing.length ? 'NO -> '+missing.map(x=>anch(x).join('/')).join(', ') : 'yes');

// And each anchor must be on the page the step navigates to, not merely
// somewhere in the app.
const pageFor = { '#/admin':viewAdmin(['dash'],{}), '#/admin/orders?q=all':viewAdmin(['orders'],{q:'all'}),
  '#/admin/inbox':viewAdmin(['inbox'],{}), '#/admin/finance':viewAdmin(['finance'],{}),
  '#/admin/batches':viewAdmin(['batches'],{}), '#/admin/retailers':viewAdmin(['retailers'],{}),
  '#/admin/settings':viewAdmin(['settings'],{}), '#/admin/audit':viewAdmin(['audit'],{}), 'ORDER':orderPage };
const wrongPage = TOUR_STEPS.filter(st => {
  const html = pageFor[st.h];
  return html && !anch(st).some(a => html.includes('data-tour="'+a+'"'));
});
console.log('  anchor is on its page:', wrongPage.length ? 'NO -> '+wrongPage.map(x=>x.t+' wants '+anch(x).join('/')).join('; ') : 'yes');
console.log('  the order step finds an order:', tourOrderHash().startsWith('#/admin/order/'), tourOrderHash());

// Walking it without a browser: every step must resolve to a hash.
TOUR.on=true; TOUR.i=0;
const hashes = TOUR_STEPS.map((st,i)=>tourHash(st));
console.log('  every step has a hash:', hashes.every(h=>h.indexOf('#/')===0) ? 'yes' : 'NO -> '+hashes.join(' '));
console.log('  no step points nowhere:', hashes.filter(h=>!h).length===0);
TOUR.on=false;

console.log('');
console.log('INBOX, EMPTY');
INBOX.loaded=true; INBOX.threads=[]; INBOX.unread=0;
let h = adminInbox();
console.log('  says what to expect :', h.includes('help@tengauk.com'));
console.log('  renders clean       :', bad(h).length ? 'NO -> '+bad(h).join(', ') : 'yes');

console.log('');
console.log('INBOX, WITH MAIL');
INBOX.unread=2;
INBOX.threads=[
 { threadKey:'TU-1041', ref:'TU-1041', total:3, unread:1, lastAt:Date.now()-3600e3,
   last:{ direction:'in', from_addr:'buyer@example.com', to_addr:'help@tengauk.com',
          subject:'Question about TU-1041', snippet:'Can you get the 100ml instead?' } },
 { threadKey:'new@example.com', ref:null, total:1, unread:1, lastAt:Date.now()-7200e3,
   last:{ direction:'in', from_addr:'new@example.com', to_addr:'help@tengauk.com',
          subject:'do you ship to Bulawayo?', snippet:'Hello, I wanted to ask' } },
 { threadKey:'quiet@example.com', ref:null, total:2, unread:0, lastAt:Date.now()-86400e3,
   last:{ direction:'out', from_addr:'help@tengauk.com', to_addr:'quiet@example.com',
          subject:'Re: a question', snippet:'Yes, that is fine.' } }
];
h = adminInbox();
console.log('  all three threads   :', ['TU-1041','new@example.com','quiet@example.com'].every(k=>h.includes(k)));
console.log('  unread is flagged   :', h.includes('unread') && h.includes('new</span>'));
console.log('  a read one is not   :', !/quiet@example.com[^]*?new<\\/span>/.test(h));
console.log('  order links through  :', h.includes('#/admin/order/TU-1041'));
console.log('  our own reply marked :', h.includes('You: '));
console.log('  renders clean       :', bad(h).length ? 'NO -> '+bad(h).join(', ') : 'yes');

console.log('');
console.log('ONE CONVERSATION');
INBOX.thread={ key:'TU-1041', messages:[
 { id:'1', thread_key:'TU-1041', ref:'TU-1041', direction:'in', from_addr:'buyer@example.com',
   to_addr:'help@tengauk.com', subject:'Question about TU-1041',
   body_text:'Can you get the 100ml instead?', attachments:1, read_at:null, created_at:Date.now()-3600e3 },
 { id:'2', thread_key:'TU-1041', ref:'TU-1041', direction:'out', from_addr:'help@tengauk.com',
   to_addr:'buyer@example.com', subject:'Re: Question about TU-1041',
   body_text:'Yes, we can. It changes the price by 4 pounds.', attachments:0,
   read_at:Date.now(), created_at:Date.now()-1800e3 }
]};
h = inboxThread('TU-1041');
console.log('  both messages shown :', h.includes('Can you get the 100ml') && h.includes('changes the price'));
console.log('  ours is marked ours :', h.includes('mail-out') && h.includes('mail-in'));
console.log('  reply box addressed :', h.includes('Reply to buyer@example.com'));
console.log('  attachment noted    :', h.includes('1 attachment'));
console.log('  links to the order  :', h.includes('#/admin/order/TU-1041'));
console.log('  renders clean       :', bad(h).length ? 'NO -> '+bad(h).join(', ') : 'yes');

console.log('');
console.log('A THREAD STILL LOADING, AND ONE THAT FAILED');
INBOX.thread={ key:'TU-1041', messages:null };
h = inboxThread('TU-1041');
console.log('  says loading        :', h.includes('Loading'));
console.log('  renders clean       :', bad(h).length ? 'NO -> '+bad(h).join(', ') : 'yes');
INBOX.thread={ key:'TU-1041', messages:[], error:'http 500' };
h = inboxThread('TU-1041');
console.log('  shows the error     :', h.includes('http 500'));
console.log('  no reply box with nothing to reply to:', !h.includes('Send reply'));
console.log('  renders clean       :', bad(h).length ? 'NO -> '+bad(h).join(', ') : 'yes');

console.log('');
console.log('THE RAIL');
S.session='admin'; location.hash='#/admin/inbox';
INBOX.unread=2;
const rail = viewAdmin(['inbox'],{});
console.log('  inbox is in the rail:', rail.includes('#/admin/inbox'));
console.log('  unread count shown  :', /cnt hot">2</.test(rail));
console.log('  tour is pinned last :', rail.indexOf('rail-foot') > rail.indexOf('#/admin/audit'));
console.log('  tour links to itself:', rail.includes('#/admin/guide'));
console.log('  renders clean       :', bad(rail).length ? 'NO -> '+bad(rail).join(', ') : 'yes');

console.log('');
console.log('WITHOUT A SERVER, the inbox should explain itself rather than break');
API.base='';
h = adminInbox();
console.log('  explains why empty  :', h.includes('needs the server'));
console.log('  renders clean       :', bad(h).length ? 'NO -> '+bad(h).join(', ') : 'yes');
`);
