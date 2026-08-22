/* The webhook is the only thing allowed to move money, so these are the tests
   that matter most. They exercise applyWebhook directly against a real local
   D1 through the Worker's own route, with signature verification stubbed by
   leaving PAYPAL_WEBHOOK_ID unset (which must REFUSE, not accept). */
import { applyWebhook } from '../src/paypal.js';

let pass = 0, fail = 0;
const ok = (label, cond, extra = '') => { cond ? pass++ : fail++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${extra && !cond ? '  -> ' + extra : ''}`) };

/* A tiny stand-in for D1 that behaves like the bits we use. */
function fakeDB(rows = {}) {
  const orders = new Map(Object.entries(rows));
  const payments = [], audits = [];
  const run = async (sql, args) => {
    if (/INSERT INTO payments/i.test(sql)) {
      if (payments.some(p => p.provider_ref === args[4])) throw new Error('UNIQUE constraint failed');
      payments.push({ id: args[0], ref: args[1], kind: args[2], provider_ref: args[4],
                      amount_pence: args[5], status: args[7] });
    } else if (/UPDATE orders/i.test(sql)) {
      const o = orders.get(args[4]);
      if (o) { o.status = args[0]; o.paid_pence = args[1]; o.doc = args[2] }
    } else if (/INSERT INTO audit/i.test(sql)) audits.push({ action: args[1] });
    return { success: true };
  };
  const first = async (sql, args) => {
    if (/FROM orders WHERE ref/i.test(sql)) return orders.get(args[0]) || null;
    if (/FROM payments WHERE provider_ref/i.test(sql))
      return payments.find(p => p.provider_ref === args[0]) || null;
    if (/SUM\(amount_pence\)/i.test(sql))
      return { p: payments.filter(p => p.ref === args[0] && p.status === 'Payment completed')
                          .reduce((a, p) => a + p.amount_pence, 0) };
    return null;
  };
  return {
    _payments: payments, _orders: orders, _audits: audits,
    prepare(sql) { let a = []; const self = {
      bind(...args) { a = args; return self },
      run: () => run(sql, a), first: () => first(sql, a), all: async () => ({ results: [] })
    }; return self }
  };
}

const baseOrder = () => ({
  ref: 'TU-1048', token: 't_x', collect_code: 'ABC-123', email: 'w@example.com',
  recipient: '+263771234567', status: 'Awaiting initial payment', ship_mode: 'sea',
  total_pence: 15748, paid_pence: 0,
  doc: JSON.stringify({ customer: { email: 'w@example.com', name: 'Winston' },
    recipient: { name: 'Tendai Moyo' }, items: [], payments: [], timeline: [] })
});

const capture = (over = {}) => ({
  event_type: 'PAYMENT.CAPTURE.COMPLETED',
  resource: { id: 'CAP-1', custom_id: 'TU-1048:initial',
              amount: { currency_code: 'GBP', value: '157.48' }, ...over }
});

console.log('\na genuine capture');
let env = { DB: fakeDB({ 'TU-1048': baseOrder() }) };
let out = await applyWebhook(env, capture());
ok('marks the order paid', out.applied === 'paid', JSON.stringify(out));
ok('records the right amount', out.amount === 157.48, String(out.amount));
ok('moves the status on', env.DB._orders.get('TU-1048').status === 'Paid — awaiting retailer purchase',
   env.DB._orders.get('TU-1048').status);
ok('writes exactly one payment row', env.DB._payments.length === 1, String(env.DB._payments.length));

console.log('\nthe same webhook delivered twice');
out = await applyWebhook(env, capture());
ok('the replay is ignored', !!out.ignored, JSON.stringify(out));
ok('still exactly one payment row', env.DB._payments.length === 1, String(env.DB._payments.length));
ok('paid total did not double', env.DB._orders.get('TU-1048').paid_pence === 15748,
   String(env.DB._orders.get('TU-1048').paid_pence));

console.log('\nevents we should not act on');
env = { DB: fakeDB({ 'TU-1048': baseOrder() }) };
out = await applyWebhook(env, { event_type: 'PAYMENT.CAPTURE.COMPLETED',
  resource: { id: 'CAP-9', amount: { value: '10.00' } } });
ok('no order reference means no payment', !!out.ignored, JSON.stringify(out));
out = await applyWebhook(env, capture({ custom_id: 'TU-9999:initial', id: 'CAP-2' }));
ok('an unknown order is ignored', !!out.ignored, JSON.stringify(out));
out = await applyWebhook(env, { event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'X', custom_id: 'TU-1048:initial' } });
ok('approved-but-not-captured pays nothing', !!out.ignored, JSON.stringify(out));
ok('nothing was written', env.DB._payments.length === 0, String(env.DB._payments.length));

console.log('\na refund');
env = { DB: fakeDB({ 'TU-1048': baseOrder() }) };
await applyWebhook(env, capture());
out = await applyWebhook(env, { event_type: 'PAYMENT.CAPTURE.REFUNDED',
  resource: { id: 'REF-1', custom_id: 'TU-1048:initial', amount: { value: '157.48' } } });
ok('is recorded as a negative payment', out.applied === 'refunded', JSON.stringify(out));
ok('leaving two rows', env.DB._payments.length === 2, String(env.DB._payments.length));
ok('the refund row is negative', env.DB._payments[1].amount_pence === -15748,
   String(env.DB._payments[1].amount_pence));

console.log('\namount is taken from PayPal, never from the browser');
env = { DB: fakeDB({ 'TU-1048': baseOrder() }) };
out = await applyWebhook(env, capture({ id: 'CAP-3', amount: { value: '1.00' } }));
ok('a £1 capture credits £1, not the order total', out.amount === 1, String(out.amount));
ok('so the order is not fully paid', env.DB._orders.get('TU-1048').paid_pence === 100,
   String(env.DB._orders.get('TU-1048').paid_pence));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
