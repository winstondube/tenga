// Recording that we told the customer, and telling them, were two different
// things for the whole life of this app. Every message row said "Delivered"
// and nothing left the building, because API.sendMessage was defined and never
// called. The existing tests passed throughout, because they asserted on the
// local record, which is exactly the thing that was lying.
//
// So this asserts on the network instead: what was actually requested, of what
// endpoint, in what order.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

const CALLS = [];
global.window.TENGA_API = 'https://api.example.com';
global.fetch = (url, opts = {}) => {
  CALLS.push({ url: String(url), method: opts.method || 'GET',
               body: opts.body ? JSON.parse(opts.body) : null });
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 'm_1', sent: true }) });
};
const listeners = {};
global.document.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn) };
global.confirm = () => true;
global.click = dataset => {
  const el = { dataset, tagName: 'BUTTON', classList: { contains: () => false }, closest: s => s === '[data-act]' ? el : null };
  (listeners.click || []).forEach(fn => fn({ target: el, preventDefault() {}, stopPropagation() {} }));
};

eval(js + `
(async () => {
const wait = () => new Promise(r => setTimeout(r, 30));
const posts = t => CALLS.filter(c => c.method === 'POST' && c.url.includes('/messages') && c.body && c.body.type === t);
const saves = ref => CALLS.filter(c => c.method === 'PATCH' && c.url.includes(ref));

S.session = 'admin';

console.log('APPROVING A QUOTE');
const o = S.orders.find(x => x.quote && !x.quote.sentAt && !payTotals(x).initialPaid) || S.orders[0];
o.quote = o.quote || { deliveryOverrides:{}, adjustments:[], expiryMins:45, status:'Draft' };
o.quote.sentAt = null;
CALLS.length = 0;
click({ act:'approveQuote', ref:o.ref });
await wait();

const q = posts('Quote ready');
console.log('  asked the server to email the quote :', q.length === 1 ? 'yes' : 'NO (' + q.length + ' times)');
console.log('  to the right order                  :', q.length ? q[0].url.includes(o.ref) : false);
console.log('  carrying our expiry, not its default:', q.length ? (q[0].body.vars && typeof q[0].body.vars.mins === 'number') : false, q.length && q[0].body.vars ? q[0].body.vars.mins : '');

// The server builds the email from the order it holds. Sending before the
// edit lands quotes the total from before the edit.
const iSave = CALLS.findIndex(c => c.method === 'PATCH' && c.url.includes(o.ref));
const iSend = CALLS.findIndex(c => c.method === 'POST' && c.url.includes('/messages'));
console.log('  saved the order BEFORE emailing it  :', iSave !== -1 && iSave < iSend, 'save@' + iSave + ' send@' + iSend);

const rec = S.messages.find(m => m.ref === o.ref && m.type === 'Quote ready');
console.log('  the record says what really happened:', rec ? rec.status : 'no record');

console.log('');
console.log('ARRIVING IN HARARE');
const p = S.orders.find(x => payTotals(x).initialPaid > 0 && x.collectCode) || o;
p.collectCode = p.collectCode || 'KMP-4T9';
S.messages = S.messages.filter(m => !(m.ref === p.ref && m.type === 'Ready for collection'));
CALLS.length = 0;
setStatus(p, 'Ready for collection');
await wait();
const c = posts('Ready for collection');
console.log('  asked the server to email the code  :', c.length === 1 ? 'yes' : 'NO (' + c.length + ' times)');

// Twice would mean two "your parcel is here" emails for one parcel.
CALLS.length = 0;
setStatus(p, 'Delivered');
setStatus(p, 'Ready for collection');
await wait();
console.log('  and never a second time             :', posts('Ready for collection').length === 0);

console.log('');
console.log('WHAT WE MUST NOT SEND');
// The server sends these two itself, on order creation and on the PayPal
// webhook. Sending them from here as well would send them twice.
CALLS.length = 0;
logMsg(o.ref, 'Request received', 'Email', 'a@b.com', 'x');
logMsg(o.ref, 'Payment received', 'Email', 'a@b.com', 'x');
await wait();
console.log('  request received, sent by the server:', posts('Request received').length === 0 ? 'not duplicated' : 'DUPLICATED');
console.log('  payment received, sent by the webhook:', posts('Payment received').length === 0 ? 'not duplicated' : 'DUPLICATED');

// And the types with no template behind them must not claim delivery.
CALLS.length = 0;
const noTemplate = logMsg(o.ref, 'Cargo payment required', 'WhatsApp', '+263771234567', 'x');
await wait();
console.log('  a type with no template sends nothing:', CALLS.length === 0);
console.log('  and does not claim to be delivered   :', noTemplate.status !== 'Delivered', '->', noTemplate.status);

console.log('');
console.log('WHEN THE SERVER REFUSES');
global.fetch = () => Promise.resolve({ ok:false, status:500, json:()=>Promise.resolve({error:'boom'}) });
S.messages = S.messages.filter(m => !(m.ref === o.ref && m.type === 'Quote ready'));
const failed = logMsg(o.ref, 'Quote ready', 'Email', 'a@b.com', 'x');
await wait();
console.log('  the failure is on the record, not hidden:', /not sent/i.test(failed.status), '->', failed.status);

console.log('');
console.log('THE ARRIVAL PROMPT');
global.fetch = (url, opts = {}) => { CALLS.push({url:String(url),method:opts.method||'GET',
  body:opts.body?JSON.parse(opts.body):null});
  return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({id:'m',sent:true})}) };
const paid = S.orders.filter(x => x.collectCode).slice(0, 2);
S.messages = S.messages.filter(m => m.type !== 'Ready for collection');
S.batches = [{ id:'B-TEST', status:'Arrived in Zimbabwe', orders: paid.map(x => x.ref) }];
let landed = arrivedBatchesToTell();
console.log('  a landed batch is flagged           :', landed.length === 1 && landed[0].waiting.length === paid.length,
  landed.length ? landed[0].waiting.length + ' waiting' : 'not flagged');
console.log('  and the dashboard says so           :', /has arrived in Harare/.test(adminDash()));

CALLS.length = 0;
click({ act:'tellBatch', batch:'B-TEST' });
await wait();
console.log('  one press emails all of them        :', posts('Ready for collection').length === paid.length,
  posts('Ready for collection').length + ' of ' + paid.length);
console.log('  the prompt then clears              :', arrivedBatchesToTell().length === 0);

CALLS.length = 0;
click({ act:'tellBatch', batch:'B-TEST' });
await wait();
console.log('  pressing it again sends nothing     :', posts('Ready for collection').length === 0);

// A batch still at sea must not prompt anyone.
S.messages = S.messages.filter(m => m.type !== 'Ready for collection');
S.batches = [{ id:'B-SEA', status:'In transit to Zimbabwe', orders: paid.map(x => x.ref) }];
console.log('  a batch still in transit does not   :', arrivedBatchesToTell().length === 0);
})();
`);
