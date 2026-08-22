/* Runs the real Worker against a real local D1, so what passes here is what
   Cloudflare will execute. Start it yourself with `npm run dev`, or let this
   spawn one. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.API || 'http://127.0.0.1:8787';
const ORIGIN = 'https://winstondube.github.io';
let pass = 0, fail = 0;
const ok = (label, cond, extra='') => { cond ? pass++ : fail++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${extra && !cond ? '  -> ' + extra : ''}`); };

const call = async (path, opts = {}) => {
  const r = await fetch(BASE + path, {
    ...opts,
    headers: { 'content-type': 'application/json', origin: ORIGIN, ...(opts.headers || {}) }
  });
  let body = null; try { body = await r.json() } catch {}
  return { status: r.status, body, cookie: r.headers.get('set-cookie') };
};

const ORDER = {
  customer: { name: 'Winston Dube', email: 'winstondube@gmail.com', whatsapp: '+447700900123' },
  recipient: { name: 'Tendai Moyo', phone: '+263771234567', town: 'Harare' },
  items: [{ name: 'The Ordinary Niacinamide 30ml', url: 'https://www.lookfantastic.com/x/1.html',
            retailerName: 'LookFantastic', qty: 1, displayedPrice: 11, category: 'skincare' }],
  shipMode: 'sea', quotedTotal: 74.99
};

console.log('\nhealth');
let r = await call('/health');
ok('the service answers', r.status === 200 && r.body.ok, JSON.stringify(r.body));

console.log('\ncreating an order');
r = await call('/orders', { method: 'POST', body: JSON.stringify(ORDER) });
ok('accepts a good order', r.status === 201 && !!r.body.ref, JSON.stringify(r.body));
const ref = r.body.ref, tok = r.body.token;

for (const [label, patch] of [
  ['refuses a bad email',       { customer: { ...ORDER.customer, email: 'not-an-email' } }],
  ['refuses no items',          { items: [] }],
  ['refuses a missing recipient', { recipient: { name: '', phone: '' } }]
]) {
  const res = await call('/orders', { method: 'POST', body: JSON.stringify({ ...ORDER, ...patch }) });
  ok(label, res.status === 400, res.status + ' ' + JSON.stringify(res.body));
}

console.log('\nwho can read it');
r = await call(`/orders/${ref}?token=${tok}`);
ok('the right token opens it', r.status === 200 && r.body.ref === ref);
ok('the collection code is hidden before payment', r.body.collectCode === null, String(r.body.collectCode));
r = await call(`/orders/${ref}?token=t_wrong`);
ok('a wrong token is refused', r.status === 404);
r = await call(`/orders/${ref}`);
ok('no token is refused', r.status === 404);
r = await call('/orders');
ok('the order list is staff only', r.status === 401);

console.log('\nlookup needs more than a reference');
r = await call('/orders/lookup', { method: 'POST', body: JSON.stringify({ ref }) });
ok('reference alone is refused', r.status === 400 || r.status === 404);
r = await call('/orders/lookup', { method: 'POST', body: JSON.stringify({ ref, who: 'someone@else.com' }) });
ok('a wrong contact is refused', r.status === 404);
r = await call('/orders/lookup', { method: 'POST', body: JSON.stringify({ ref, who: 'WINSTONDUBE@gmail.com' }) });
ok('the right email opens it, any case', r.status === 200 && r.body.token === tok);
r = await call('/orders/lookup', { method: 'POST', body: JSON.stringify({ ref, who: '771234567' }) });
ok('the recipient phone opens it', r.status === 200);

console.log('\nstaff');
r = await call('/staff/login', { method: 'POST', body: JSON.stringify({ email: 'ops@tenga.uk', password: 'wrong' }) });
ok('a wrong password is refused', r.status === 401);
r = await call('/staff/login', { method: 'POST', body: JSON.stringify({ email: 'ops@tenga.uk', password: process.env.SEED_PW || 'test-password-123' }) });
const authed = r.status === 200;
ok('seeded staff can sign in', authed, r.status + ' ' + JSON.stringify(r.body));
const cookie = (r.cookie || '').split(';')[0];
if (authed) {
  r = await call('/orders', { headers: { cookie } });
  ok('staff see the order list', r.status === 200 && Array.isArray(r.body.orders));
  r = await call(`/orders/${ref}`, { headers: { cookie } });
  ok('staff see an order without a token', r.status === 200 && r.body.collectCode);
}

console.log('\nmessages');
if (authed) {
  r = await call(`/orders/${ref}/messages`, { headers: { cookie } });
  ok('the request confirmation was recorded', r.status === 200 && r.body.messages.length >= 1,
     JSON.stringify(r.body).slice(0, 120));
  const first = r.body.messages[0] || {};
  ok('it names the customer as the recipient', first.recipient === ORDER.customer.email, first.recipient);
  ok('with no provider key it is queued, not silently lost',
     /Queued|Delivered/.test(first.status || ''), first.status);
  r = await call(`/orders/${ref}/messages`, { method: 'POST', headers: { cookie },
    body: JSON.stringify({ type: 'Payment received' }) });
  ok('staff can send a specific message', r.status === 200 && !!r.body.id, JSON.stringify(r.body));
  r = await call(`/orders/${ref}/messages`, { method: 'POST',
    body: JSON.stringify({ type: 'Payment received' }) });
  ok('a stranger cannot send messages as us', r.status === 401);
}

console.log('\npayments, before any credentials exist');
r = await call(`/orders/${ref}/paypal`, { method: 'POST', body: JSON.stringify({ token: tok }) });
ok('says so plainly rather than erroring', r.status === 503, r.status + ' ' + JSON.stringify(r.body));
r = await call('/paypal/webhook', { method: 'POST', body: JSON.stringify({
  event_type: 'PAYMENT.CAPTURE.COMPLETED',
  resource: { id: 'FORGED-1', custom_id: `${ref}:initial`, amount: { value: '157.48' } } }) });
ok('a forged webhook is refused', r.status === 200 && r.body.ok === false, JSON.stringify(r.body));
r = await call(`/orders/${ref}?token=${tok}`);
ok('and the order is still unpaid', !r.body.collectCode, String(r.body.collectCode));

console.log('\ncross origin');
const bad = await fetch(BASE + '/orders', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
ok('another site is refused', bad.status === 403, String(bad.status));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
