/* The inbox, offline.
 *
 * The parts worth testing are the ones that decide whether a stranger can put
 * words in a customer's mouth, and whether a conversation holds together.
 */
import { verifyInbound, receiveEmail, replyToThread, findRef, toSnippet } from '../src/inbox.js';

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log('  ok   ', label) }
  else { fail++; console.log('  FAIL ', label, ' -> ', detail || '') }
};

/* A D1 stand-in: enough SQL to run the module, none of the network. */
const makeDB = () => {
  const rows = [];
  return { rows, prepare(sql) {
    let b = [];
    const api = {
      bind(...a) { b = a; return api },
      async run() {
        if (/^INSERT INTO inbox/i.test(sql.trim())) {
          const out = sql.includes("'in'")
            ? { id:b[0], thread_key:b[1], ref:b[2], direction:'in', from_addr:b[3], to_addr:b[4],
                subject:b[5], body_text:b[6], snippet:b[7], message_id:b[8], provider_id:b[9],
                attachments:b[10], read_at:null, created_at:b[11] }
            : { id:b[0], thread_key:b[1], ref:b[2], direction:'out', from_addr:b[3], to_addr:b[4],
                subject:b[5], body_text:b[6], snippet:b[7], message_id:null, provider_id:b[8],
                attachments:0, read_at:b[9], created_at:b[10] };
          if (out.provider_id && rows.some(r => r.provider_id === out.provider_id))
            throw new Error('UNIQUE constraint failed: inbox.provider_id');
          rows.push(out);
        }
        return { success: true };
      },
      async first() {
        if (/SELECT id FROM inbox WHERE provider_id/i.test(sql)) return rows.find(r => r.provider_id === b[0]) || null;
        return null;
      },
      async all() { return { results: rows.filter(r => r.thread_key === b[0]) } }
    };
    return api;
  } };
};

const SECRET = 'whsec_' + btoa('a-signing-secret-of-some-length');
const sign = async (id, ts, body, secret = SECRET) => {
  const key = await crypto.subtle.importKey('raw',
    Uint8Array.from(atob(secret.replace(/^whsec_/, '')), c => c.charCodeAt(0)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  return 'v1,' + btoa(String.fromCharCode(...new Uint8Array(mac)));
};
const req = (headers) => ({ headers: { get: k => headers[k] ?? null } });

console.log('\nsignature verification');
{
  const body = JSON.stringify({ type: 'email.received' });
  const id = 'msg_1', ts = String(Math.floor(Date.now() / 1000));
  const env = { RESEND_WEBHOOK_SECRET: SECRET };

  let r = await verifyInbound(env, req({ 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': await sign(id, ts, body) }), body);
  ok('a correctly signed delivery is accepted', r.verified, r.reason);

  r = await verifyInbound(env, req({ 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': 'v1,' + btoa('nonsense') }), body);
  ok('a forged signature is refused', !r.verified, JSON.stringify(r));

  const sig = await sign(id, ts, body);
  r = await verifyInbound(env, req({ 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': sig }), body + ' ');
  ok('a tampered body is refused', !r.verified, JSON.stringify(r));

  const old = String(Math.floor(Date.now() / 1000) - 3600);
  r = await verifyInbound(env, req({ 'svix-id': id, 'svix-timestamp': old, 'svix-signature': await sign(id, old, body) }), body);
  ok('a replayed old delivery is refused', !r.verified, JSON.stringify(r));

  r = await verifyInbound(env, req({ 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': await sign(id, ts, body, 'whsec_' + btoa('the-wrong-secret-entirely')) }), body);
  ok('a signature from another secret is refused', !r.verified, JSON.stringify(r));

  r = await verifyInbound({}, req({ 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': await sign(id, ts, body) }), body);
  ok('with no secret configured it fails closed', !r.verified, JSON.stringify(r));

  r = await verifyInbound(env, req({}), body);
  ok('missing headers are refused', !r.verified, JSON.stringify(r));
}

console.log('\nfinding the order a message is about');
{
  ok('from the subject', findRef('Re: my order TU-1041 please') === 'TU-1041');
  ok('from quoted body text', findRef('...\n> Your quote for tu-1099 is ready') === 'TU-1099');
  ok('nothing to find is null', findRef('hello, do you ship to Bulawayo?') === null);
  ok('a bare number is not a reference', findRef('order 1041') === null);
}

console.log('\nthe preview line');
{
  const t = 'Yes that works, thank you.\n\nOn Tue, 12 Aug 2026 at 09:14, Tenga UK <help@tengauk.com> wrote:\n> Your quote is ready\n> Please pay';
  ok('quoted history is trimmed off', toSnippet(t) === 'Yes that works, thank you.', JSON.stringify(toSnippet(t)));
  ok('a long message is capped', toSnippet('x'.repeat(500)).length === 200);
}

console.log('\nstoring what arrived');
{
  const env = { DB: makeDB(), RESEND_KEY: null, MAIL_FROM: 'Tenga UK <help@tengauk.com>' };
  const ev = ts => ({ type: 'email.received', data: {
    email_id: 'e1', from: 'buyer@example.com', to: ['help@tengauk.com'],
    received_for: ['help@tengauk.com'], subject: 'Question about TU-1041',
    message_id: '<abc@mail.example.com>', attachments: [] } });

  let out = await receiveEmail(env, ev());
  ok('it is stored', !!out.stored, JSON.stringify(out));
  ok('and attached to the order named in the subject', out.ref === 'TU-1041', String(out.ref));
  ok('so the thread is keyed by the order', out.threadKey === 'TU-1041', String(out.threadKey));

  out = await receiveEmail(env, ev());
  ok('a redelivered webhook is ignored, not duplicated', !!out.ignored, JSON.stringify(out));
  ok('still exactly one row', env.DB.rows.length === 1, String(env.DB.rows.length));

  const stranger = { type: 'email.received', data: {
    email_id: 'e2', from: 'Someone <new@example.com>', received_for: ['help@tengauk.com'],
    subject: 'do you ship to Bulawayo?', attachments: [{ id: 'a1' }] } };
  out = await receiveEmail(env, stranger);
  ok('mail with no order is still kept', !!out.stored, JSON.stringify(out));
  ok('threaded by who wrote it', out.threadKey === 'new@example.com', String(out.threadKey));
  ok('the display name is stripped, so renaming does not fork the thread',
     env.DB.rows[1].from_addr === 'new@example.com', env.DB.rows[1].from_addr);
  const renamed = await receiveEmail(env, { type: 'email.received', data: {
    email_id: 'e3', from: 'Someone Else Entirely <NEW@Example.com>',
    received_for: ['help@tengauk.com'], subject: 'and one more thing' } });
  ok('same person, new display name and casing, same thread',
     renamed.threadKey === 'new@example.com', String(renamed.threadKey));
  ok('attachments are counted', env.DB.rows[1].attachments === 1, String(env.DB.rows[1].attachments));
  ok('it arrives unread', env.DB.rows[1].read_at === null);

  out = await receiveEmail(env, { type: 'email.received', data: {} });
  ok('an event with no email id is ignored', !!out.ignored, JSON.stringify(out));
}

console.log('\nreplying');
{
  const env = { DB: makeDB(), RESEND_KEY: null, MAIL_FROM: 'Tenga UK <help@tengauk.com>' };
  const out = await replyToThread(env, { threadKey: 'TU-1041', to: 'buyer@example.com',
    subject: 'Re: Question about TU-1041', text: 'Yes, we can get that.', ref: 'TU-1041',
    inReplyTo: '<abc@mail.example.com>' });
  ok('with no provider key it is recorded rather than lost', !!out.id && !out.sent, JSON.stringify(out));
  const row = env.DB.rows[0];
  ok('recorded as outbound', row.direction === 'out', row.direction);
  ok('in the same thread as the question', row.thread_key === 'TU-1041', row.thread_key);
  ok('addressed to the customer', row.to_addr === 'buyer@example.com', row.to_addr);
  ok('and marked read, because we wrote it', row.read_at !== null);
}



console.log('\nthe reply signature');
{
  const env = { DB: makeDB(), RESEND_KEY: null,
                MAIL_FROM: 'Tenga UK <help@tengauk.com>', MOTTO: 'Shop UK. Collect in Harare.' };
  let sent = null;
  let n = 0;
  globalThis.fetch = async (u, o) => { sent = JSON.parse(o.body); return { ok: true, json: async () => ({ id: 'x' + (++n) }) } };
  env.RESEND_KEY = 're_test';

  await replyToThread(env, { threadKey: 'TU-1041', to: 'buyer@example.com', subject: 'Re: hello',
    text: 'Yes, we can get that.', ref: 'TU-1041', staff: { name: 'Gerald', email: 'g@x.com' } });
  ok('signed as the team', /Tenga <span style="color:#B8862F">UK<\/span> Team/.test(sent.html), sent.html.slice(-300));
  ok('the gold matches the wordmark in the email header', /#B8862F/.test(sent.html));
  ok('never names the individual', !/Gerald/.test(sent.html));
  ok('no strapline describing ourselves', !/buy-for-me and Zimbabwe forwarding/.test(sent.html));
  // Deliberately absent: a reply should keep the conversation on email, where
  // it stays on file against the order.
  ok('no WhatsApp button pulling them off email', !/wa\.me/.test(sent.html), sent.html.slice(-300));
  ok('and no bare number either', !/7337 ?524515/.test(sent.html));
  ok('carries the motto', /Shop UK\. Collect in Harare\./.test(sent.html));

  await replyToThread(env, { threadKey: 'x2', to: 'b@e.com', subject: 's', text: 't', staff: null });
  ok('no staff at all still signs correctly', /Tenga <span[^>]*>UK<\/span> Team/.test(sent.html) && !/undefined/.test(sent.html));

  const noMotto = { ...env, MOTTO: '', DB: makeDB() };
  await replyToThread(noMotto, { threadKey: 'x3', to: 'b@e.com', subject: 's', text: 't', staff: null });
  ok('with no motto configured the signature is still valid',
     /Tenga <span[^>]*>UK<\/span> Team/.test(sent.html) && !/undefined/.test(sent.html), sent.html.slice(-200));
}

console.log('\nwho gets told a customer wrote in');
{
  let sent = null;
  const calls = [];
  globalThis.fetch = async (u, o) => {
    calls.push(String(u));
    if (String(u).endsWith('/emails')) sent = JSON.parse(o.body);
    // fetchBody reads .text(); the send path reads .json(). Both are stubbed,
    // because a stub that only satisfies one of them fails inside the module
    // rather than in the assertion, which tells you nothing.
    return { ok: true,
             text: async () => JSON.stringify({ text: 'hello', from: 'buyer@example.com' }),
             json: async () => ({ id: 'f' + calls.length }) };
  };
  const sends = () => calls.filter(u => u.endsWith('/emails')).length;
  const ev = id => ({ type: 'email.received', data: { email_id: id, from: 'buyer@example.com',
                      received_for: ['help@tengauk.com'], subject: 'hello' } });

  let env = { DB: makeDB(), RESEND_KEY: 're_x', MAIL_FROM: 'Tenga UK <help@tengauk.com>',
              FORWARD_TO: 'winstondube@gmail.com' };
  await receiveEmail(env, ev('f1'));
  ok('one address still works', Array.isArray(sent.to) && sent.to.length === 1, JSON.stringify(sent.to));

  env = { ...env, DB: makeDB(), FORWARD_TO: 'winstondube@gmail.com, gerald.dube23@gmail.com' };
  await receiveEmail(env, ev('f2'));
  ok('two addresses both get it', sent.to.length === 2 && sent.to.includes('gerald.dube23@gmail.com'), JSON.stringify(sent.to));
  ok('as ONE send, not two', sends() === 2, 'outbound sends: ' + sends() + ' for 2 messages');
  ok('whitespace around a comma is tolerated', sent.to.every(a => a === a.trim()), JSON.stringify(sent.to));

  env = { ...env, DB: makeDB(), FORWARD_TO: '' };
  const before = sends();
  await receiveEmail(env, ev('f3'));
  ok('with nobody configured it forwards nothing', sends() === before, 'extra sends: ' + (sends() - before));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
