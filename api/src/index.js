/* Tenga API.
 *
 * The site stays static on GitHub Pages. This adds the three things a static
 * page cannot do: keep orders somewhere both of us can see them, send the
 * messages the app currently only pretends to send, and be told by PayPal
 * directly that money arrived rather than taking the buyer's word for it.
 */
import { json, bad, now, toPence, fromPence, collectCode, token, verifyPw,
         looksLikeEmail, audit, mayReadOrder, publicView } from './lib.js';
import { send } from './mail.js';
import { createPayPalOrder, capturePayPalOrder, verifyWebhook, applyWebhook } from './paypal.js';
import { verifyInbound, receiveEmail, replyToThread, refetchBody } from './inbox.js';

const CORS = origin => ({
  'access-control-allow-origin': origin,
  'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-allow-credentials': 'true',
  'vary': 'origin'
});

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get('origin') || '';
    // Only our own sites may call this from a browser. Listed rather than
    // wildcarded, and it covers both hosts so moving to the real domain does
    // not need an API deploy.
    const origins = String(env.SITE_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const allowed = origins.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
    const cors = CORS(allowed ? origin : (origins[0] || ''));

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (origin && !allowed) return json({ error: 'origin not allowed' }, 403, cors);

    try {
      const r = await route(req, env, url, ctx);
      for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
      return r;
    } catch (e) {
      console.error(e && e.stack || e);
      return json({ error: 'server error' }, 500, cors);
    }
  }
};

async function route(req, env, url, ctx) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method;

  if (p === '/' || p === '/health') return json({ ok: true, service: 'tenga-api', time: now() });

  if (p === '/orders' && m === 'POST')       return createOrder(req, env);
  if (p === '/orders' && m === 'GET')        return listOrders(req, env, url);
  if (p === '/orders/lookup' && m === 'POST') return lookupOrder(req, env);

  const one = p.match(/^\/orders\/([A-Za-z0-9-]+)$/);
  if (one && m === 'GET')   return getOrder(req, env, url, one[1]);
  if (one && m === 'PATCH') return patchOrder(req, env, one[1]);

  const msgs = p.match(/^\/orders\/([A-Za-z0-9-]+)\/messages$/);
  if (msgs && m === 'GET')  return listMessages(req, env, msgs[1]);
  if (msgs && m === 'POST') return sendMessage(req, env, msgs[1]);

  const pay = p.match(/^\/orders\/([A-Za-z0-9-]+)\/paypal$/);
  if (pay && m === 'POST') return startPayPal(req, env, url, pay[1]);
  if (p === '/paypal/webhook' && m === 'POST') return paypalWebhook(req, env);

  if (p === '/email/inbound' && m === 'POST') return inboundEmail(req, env);
  if (p === '/inbox' && m === 'GET')          return listInbox(req, env, url);
  const thread = p.match(/^\/inbox\/([^/]+)$/);
  if (thread && m === 'GET')  return getThread(req, env, decodeURIComponent(thread[1]));
  const rep = p.match(/^\/inbox\/([^/]+)\/reply$/);
  if (rep && m === 'POST')    return replyThread(req, env, decodeURIComponent(rep[1]));
  const rd = p.match(/^\/inbox\/([^/]+)\/read$/);
  if (rd && m === 'POST')     return markRead(req, env, decodeURIComponent(rd[1]));
  const rfz = p.match(/^\/inbox\/message\/([^/]+)\/refetch$/);
  if (rfz && m === 'POST')    return refetchMessage(req, env, rfz[1]);

  if (p === '/staff/login'  && m === 'POST') return login(req, env);
  if (p === '/staff/logout' && m === 'POST') return logout(req, env);
  if (p === '/staff/me'     && m === 'GET')  return me(req, env);

  return bad('not found', 404);
}

/* ---------- staff auth ---------- */

async function currentStaff(req, env) {
  const cookie = req.headers.get('cookie') || '';
  const sid = (cookie.match(/(?:^|;\s*)tenga_s=([^;]+)/) || [])[1];
  if (!sid) return null;
  const row = await env.DB.prepare(
    `SELECT s.email, s.expires_at, st.name, st.role FROM sessions s
     JOIN staff st ON st.email = s.email WHERE s.id = ?`).bind(sid).first();
  if (!row || row.expires_at < now()) return null;
  return { email: row.email, name: row.name, role: row.role, sid };
}

async function login(req, env) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return bad('email and password required');
  const row = await env.DB.prepare('SELECT * FROM staff WHERE email = ?')
    .bind(String(email).toLowerCase().trim()).first();
  // Same work whether or not the account exists, so timing says nothing.
  const ok = row ? await verifyPw(password, row.pw_hash)
                 : await verifyPw(password, '00'.repeat(16) + '$' + '00'.repeat(32));
  if (!row || !ok) {
    await audit(env, { action: 'Staff sign in failed', after: String(email).slice(0, 60),
                       actor: 'anonymous', ip: req.headers.get('cf-connecting-ip') });
    return bad('those details do not match', 401);
  }
  const sid = token() + token();
  const expires = now() + 12 * 60 * 60 * 1000;
  await env.DB.prepare('INSERT INTO sessions (id,email,created_at,expires_at) VALUES (?,?,?,?)')
    .bind(sid, row.email, now(), expires).run();
  await env.DB.prepare('UPDATE staff SET last_seen = ? WHERE email = ?').bind(now(), row.email).run();
  await audit(env, { action: 'Staff signed in', actor: row.email, ip: req.headers.get('cf-connecting-ip') });
  return json({ email: row.email, name: row.name, role: row.role }, 200, {
    'set-cookie': `tenga_s=${sid}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=43200`
  });
}

async function logout(req, env) {
  const s = await currentStaff(req, env);
  if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(s.sid).run();
  return json({ ok: true }, 200, {
    'set-cookie': 'tenga_s=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
  });
}

async function me(req, env) {
  const s = await currentStaff(req, env);
  return s ? json(s) : json({ error: 'not signed in' }, 401);
}

/* ---------- orders ---------- */

async function nextRef(env) {
  const row = await env.DB.prepare(
    `SELECT ref FROM orders ORDER BY created_at DESC LIMIT 1`).first();
  const last = row ? parseInt(String(row.ref).replace(/\D/g, ''), 10) : 1040;
  return 'TU-' + (Number.isFinite(last) ? last + 1 : 1041);
}

async function createOrder(req, env) {
  const body = await req.json().catch(() => null);
  if (!body || !body.customer || !Array.isArray(body.items) || !body.items.length)
    return bad('an order needs a customer and at least one item');
  if (!looksLikeEmail(body.customer.email)) return bad('that email address does not look right');
  if (!body.customer.name || !body.recipient || !body.recipient.name || !body.recipient.phone)
    return bad('name, recipient name and recipient phone are required');
  if (body.items.length > 40) return bad('that is too many items for one order');

  const ref = await nextRef(env);
  // Store a complete order or none. A client that posts a partial item should
  // not be able to leave a row that breaks the operations screen for everyone.
  const items = body.items.map((it, i) => Object.assign({
    id: 'i_' + crypto.randomUUID().slice(0, 8), url: '', retailerId: null, retailerName: '',
    name: '', category: 'other', attrs: {}, qty: 1,
    displayedPrice: null, confirmedPrice: null, wasPrice: null, priceSource: '',
    image: null, availability: 'To be confirmed', extractOk: false,
    subsAllowed: 'no', subsUrl: '', subsSize: '', subsPrice: null, subsNotes: '',
    customerNotes: '', adminNotes: '', cancelIfUnavailable: false,
    restricted: [], restrictedCleared: false, itemStatus: 'Awaiting review',
    issues: [], purchase: null, received: null
  }, it));
  const doc = {
    ...body,
    items,
    ref,
    quote: null, batchId: null, holds: [], partOfLargerOrder: !!body.partOfLargerOrder,
    customerNotes: body.customerNotes || '',
    // Never trust these from the browser.
    status: 'Request submitted',
    payments: [], refunds: [], cargo: {},
    timeline: [{ status: 'Request submitted', at: now(), note: '', actor: 'Customer' }]
  };
  const tok = token(), code = collectCode();
  await env.DB.prepare(
    `INSERT INTO orders (ref,token,collect_code,email,phone,recipient,status,ship_mode,
      total_pence,paid_pence,doc,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(ref, tok, code,
    String(body.customer.email).toLowerCase().trim(),
    body.customer.whatsapp || '', body.recipient.phone || '',
    'Request submitted', body.shipMode === 'air' ? 'air' : 'sea',
    toPence(body.quotedTotal), 0, JSON.stringify(doc), now(), now()).run();

  await audit(env, { ref, action: 'Request submitted', after: String(body.items.length) + ' items',
                     actor: 'customer', ip: req.headers.get('cf-connecting-ip') });
  // Confirm it immediately. The one thing worse than a slow quote is silence.
  await send(env, { ref, type: 'Request received', to: doc.customer.email,
                    order: { ...doc, token: tok, collectCode: code },
                    vars: { where: env.COLLECT_AT } });
  // The code must come back, or the browser keeps the one it invented and the
  // customer arrives at the counter with a code that is not the one we hold.
  return json({ ref, token: tok, collectCode: code }, 201);
}

async function listOrders(req, env, url) {
  const staff = await currentStaff(req, env);
  if (!staff) return json({ error: 'staff only' }, 401);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);
  const status = url.searchParams.get('status');
  const q = status
    ? env.DB.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?').bind(status, limit)
    : env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').bind(limit);
  const { results } = await q.all();
  return json({ orders: results.map(r => ({ ...JSON.parse(r.doc), ref: r.ref, token: r.token,
    collectCode: r.collect_code, status: r.status, shipMode: r.ship_mode })) });
}

async function getOrder(req, env, url, ref) {
  const row = await env.DB.prepare('SELECT * FROM orders WHERE ref = ?').bind(ref).first();
  if (!row) return bad('not found', 404);
  const staff = await currentStaff(req, env);
  if (!mayReadOrder({ ...row, recipient_phone: row.recipient }, { staff, token: url.searchParams.get('token') }))
    return bad('not found', 404);   // same answer as a missing order, so it cannot be probed
  return json(staff ? { ...JSON.parse(row.doc), ref: row.ref, token: row.token,
                        collectCode: row.collect_code, status: row.status }
                    : publicView(row));
}

/* Reference alone is guessable, so this needs a contact on the order too. */
async function lookupOrder(req, env) {
  const { ref, who } = await req.json().catch(() => ({}));
  if (!ref || !who) return bad('reference and contact required');
  const row = await env.DB.prepare('SELECT * FROM orders WHERE UPPER(ref) = ?')
    .bind(String(ref).trim().toUpperCase()).first();
  const ip = req.headers.get('cf-connecting-ip');
  if (!row || !mayReadOrder({ ...row, recipient_phone: row.recipient }, { who })) {
    await audit(env, { ref: row ? row.ref : String(ref).slice(0, 20), action: 'Lookup failed',
                       actor: 'anonymous', ip });
    return bad('we cannot match that', 404);
  }
  await audit(env, { ref: row.ref, action: 'Order opened by lookup', actor: 'customer', ip });
  return json({ ref: row.ref, token: row.token });
}

async function patchOrder(req, env, ref) {
  const staff = await currentStaff(req, env);
  if (!staff) return json({ error: 'staff only' }, 401);
  const row = await env.DB.prepare('SELECT * FROM orders WHERE ref = ?').bind(ref).first();
  if (!row) return bad('not found', 404);
  const body = await req.json().catch(() => null);
  if (!body || !body.doc) return bad('doc required');

  const doc = body.doc;
  // The server owns money and identity; the client may not rewrite them.
  doc.ref = row.ref;
  const paid = (doc.payments || []).filter(p => /completed|held/i.test(p.status || ''))
    .reduce((a, p) => a + toPence(p.amount), 0);

  await env.DB.prepare(
    `UPDATE orders SET status=?, ship_mode=?, total_pence=?, paid_pence=?, doc=?, updated_at=? WHERE ref=?`
  ).bind(doc.status || row.status, doc.shipMode === 'air' ? 'air' : 'sea',
         toPence(body.total ?? 0), paid, JSON.stringify(doc), now(), ref).run();

  if (doc.status && doc.status !== row.status)
    await audit(env, { ref, action: 'Status changed', before: row.status, after: doc.status,
                       actor: staff.email, ip: req.headers.get('cf-connecting-ip') });
  return json({ ok: true, ref });
}


/* ---------- messages ---------- */

async function listMessages(req, env, ref) {
  const staff = await currentStaff(req, env);
  if (!staff) return json({ error: 'staff only' }, 401);
  const { results } = await env.DB.prepare(
    'SELECT id,type,channel,recipient,body,status,error,created_at FROM messages WHERE ref = ? ORDER BY created_at DESC'
  ).bind(ref).all();
  return json({ messages: results });
}

async function sendMessage(req, env, ref) {
  const staff = await currentStaff(req, env);
  if (!staff) return json({ error: 'staff only' }, 401);
  const { type, vars } = await req.json().catch(() => ({}));
  const row = await env.DB.prepare('SELECT * FROM orders WHERE ref = ?').bind(ref).first();
  if (!row) return bad('not found', 404);
  const doc = JSON.parse(row.doc);
  const order = { ...doc, ref: row.ref, token: row.token, collectCode: row.collect_code };
  const out = await send(env, { ref, type, to: row.email, order,
    vars: Object.assign({ total: '£' + fromPence(row.total_pence).toFixed(2),
                          amount: '£' + fromPence(row.paid_pence).toFixed(2),
                          mins: 60, where: env.COLLECT_AT }, vars || {}) });
  await audit(env, { ref, action: 'Message sent', after: type,
                     actor: staff.email, reason: out.sent ? 'delivered' : 'queued' });
  return json(out);
}


/* ---------- paypal ---------- */

/* The amount comes from our database. A browser asking to pay £1 for a £150
   order gets a PayPal order for £150. */
async function startPayPal(req, env, url, ref) {
  if (!env.PAYPAL_CLIENT_ID) return bad('payments are not configured yet', 503);
  const body = await req.json().catch(() => ({}));
  const { kind = 'initial', token: t } = body;
  const row = await env.DB.prepare('SELECT * FROM orders WHERE ref = ?').bind(ref).first();
  if (!row) return bad('not found', 404);

  const staff = await currentStaff(req, env);
  if (!mayReadOrder({ ...row, recipient_phone: row.recipient }, { staff, token: t }))
    return bad('not found', 404);

  const owed = row.total_pence - row.paid_pence;
  if (kind === 'initial' && owed <= 0) return bad('this order is already paid');
  // The body can only be read once, and for an initial payment the amount is
  // ours to decide anyway.
  const amountPence = kind === 'initial' ? owed : toPence(body.amount || 0);
  if (amountPence <= 0) return bad('nothing to pay');

  const site = String(env.SITE_ORIGINS || '').split(',')[0] || '';
  const order = await createPayPalOrder(env, {
    ref, amountPence, kind, returnTo: `${site}/#/track/${ref}/${row.token}`
  });
  await audit(env, { ref, action: 'PayPal order created',
                     after: '£' + fromPence(amountPence).toFixed(2), actor: 'customer', reason: order.id });
  return json({ paypalOrderId: order.id, amount: fromPence(amountPence) });
}

/* PayPal telling us directly. This is the only thing that marks an order paid. */
async function paypalWebhook(req, env) {
  const raw = await req.text();
  const check = await verifyWebhook(env, req, raw);
  if (!check.verified) {
    await audit(env, { action: 'PayPal webhook rejected', reason: String(check.reason).slice(0, 80),
                       actor: 'paypal', ip: req.headers.get('cf-connecting-ip') });
    // 200 so PayPal stops retrying something we will never accept.
    return json({ ok: false, reason: 'signature not verified' }, 200);
  }
  let event; try { event = JSON.parse(raw) } catch { return json({ ok: false }, 200) }
  const out = await applyWebhook(env, event);

  if (out.applied === 'paid') {
    const row = await env.DB.prepare('SELECT * FROM orders WHERE ref = ?').bind(out.ref).first();
    const doc = JSON.parse(row.doc);
    await send(env, { ref: out.ref, type: 'Payment received', to: row.email,
      order: { ...doc, ref: row.ref, token: row.token, collectCode: row.collect_code },
      vars: { amount: '£' + Number(out.amount).toFixed(2), where: env.COLLECT_AT } });
  }
  return json({ ok: true, ...out });
}


/* ---------- inbox ---------- */

/* Resend telling us mail arrived. Unverified deliveries are dropped, not
   stored: a public URL anyone can POST to must not be able to put words in a
   customer's mouth. 200 either way so Resend stops retrying what we refuse. */
async function inboundEmail(req, env) {
  const raw = await req.text();
  const check = await verifyInbound(env, req, raw);
  if (!check.verified) {
    await audit(env, { action: 'Inbound email rejected', reason: String(check.reason).slice(0, 80),
                       actor: 'resend', ip: req.headers.get('cf-connecting-ip') });
    return json({ ok: false, reason: 'signature not verified' }, 200);
  }
  let event; try { event = JSON.parse(raw) } catch { return json({ ok: false }, 200) }
  // Every outcome is recorded, including the ones we ignore. A delivery that
  // arrives and is silently dropped is indistinguishable from one that never
  // arrived at all, which makes the whole thing undiagnosable from here.
  if (event.type !== 'email.received') {
    await audit(env, { action: 'Inbound webhook ignored', reason: String(event.type).slice(0, 60),
                       actor: 'resend' });
    return json({ ok: true, ignored: event.type }, 200);
  }

  const out = await receiveEmail(env, event);
  if (out.stored) {
    await audit(env, { ref: out.ref || null, action: 'Email received',
                       reason: out.forwarded ? 'copy forwarded' : 'stored, copy NOT forwarded',
                       after: out.threadKey, actor: 'customer' });
  } else {
    await audit(env, { action: 'Inbound email not stored', reason: String(out.ignored).slice(0, 80),
                       actor: 'resend' });
  }
  return json({ ok: true, ...out });
}

/* One row per conversation, newest first, with the unread count the nav uses. */
async function listInbox(req, env, url) {
  const staff = await currentStaff(req, env);
  if (!staff) return bad('staff only', 401);

  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 200);
  const { results } = await env.DB.prepare(
    `SELECT thread_key,
            MAX(created_at)                                     AS last_at,
            COUNT(*)                                            AS total,
            SUM(CASE WHEN direction='in' AND read_at IS NULL THEN 1 ELSE 0 END) AS unread,
            MAX(ref)                                            AS ref
       FROM inbox
      GROUP BY thread_key
      ORDER BY last_at DESC
      LIMIT ?`).bind(limit).all();

  // The newest message of each thread, for the preview line.
  const threads = [];
  for (const t of (results || [])) {
    const last = await env.DB.prepare(
      `SELECT direction, from_addr, to_addr, subject, snippet, created_at
         FROM inbox WHERE thread_key = ? ORDER BY created_at DESC LIMIT 1`).bind(t.thread_key).first();
    threads.push({ threadKey: t.thread_key, ref: t.ref, total: t.total, unread: t.unread,
                   lastAt: t.last_at, last: last || null });
  }
  const un = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM inbox WHERE direction='in' AND read_at IS NULL`).first();
  return json({ threads, unread: (un && un.n) || 0 });
}

async function getThread(req, env, key) {
  const staff = await currentStaff(req, env);
  if (!staff) return bad('staff only', 401);
  const { results } = await env.DB.prepare(
    `SELECT id,thread_key,ref,direction,from_addr,to_addr,subject,body_text,snippet,
            message_id,attachments,read_at,created_at
       FROM inbox WHERE thread_key = ? ORDER BY created_at`).bind(key).all();
  if (!results || !results.length) return bad('not found', 404);
  return json({ threadKey: key, messages: results });
}

async function markRead(req, env, key) {
  const staff = await currentStaff(req, env);
  if (!staff) return bad('staff only', 401);
  await env.DB.prepare(
    `UPDATE inbox SET read_at = ? WHERE thread_key = ? AND direction='in' AND read_at IS NULL`
  ).bind(now(), key).run();
  return json({ ok: true });
}

/* Replying as the business. The address is taken from the thread, never from
   the browser, so a reply cannot be aimed somewhere new. */
async function replyThread(req, env, key) {
  const staff = await currentStaff(req, env);
  if (!staff) return bad('staff only', 401);
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').trim();
  if (!text) return bad('write something first');

  const last = await env.DB.prepare(
    `SELECT * FROM inbox WHERE thread_key = ? AND direction='in' ORDER BY created_at DESC LIMIT 1`
  ).bind(key).first();
  if (!last) return bad('nothing to reply to', 404);

  const subject = /^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject}`;
  const out = await replyToThread(env, {
    threadKey: key, to: last.from_addr, subject, text,
    ref: last.ref, inReplyTo: last.message_id, staff
  });
  await env.DB.prepare(
    `UPDATE inbox SET read_at = ? WHERE thread_key = ? AND direction='in' AND read_at IS NULL`
  ).bind(now(), key).run();
  await audit(env, { ref: last.ref || null, action: 'Replied to email',
                     after: last.from_addr, reason: out.sent ? 'sent' : (out.error || 'not sent'),
                     actor: staff.name || staff.email });
  return json(out);
}


/* Pull a body we failed to fetch the first time. Staff only. A message stored
   with an empty body is repairable rather than lost, and the provider's own
   error comes back rather than being swallowed. */
async function refetchMessage(req, env, id) {
  const staff = await currentStaff(req, env);
  if (!staff) return bad('staff only', 401);
  const row = await env.DB.prepare('SELECT * FROM inbox WHERE id = ?').bind(id).first();
  if (!row) return bad('not found', 404);
  if (!row.provider_id) return bad('this message has no provider id to fetch');
  const out = await refetchBody(env, row);
  await audit(env, { ref: row.ref || null, action: 'Email body refetched',
                     reason: out.ok ? out.length + ' characters' : String(out.status || '') + ' ' + String(out.error).slice(0, 60),
                     actor: staff.name || staff.email });
  return json(out);
}
