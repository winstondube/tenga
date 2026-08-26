/* Shared helpers. Deliberately small: the pricing lives in the app and the
   server does not duplicate it, because two copies of pricing is two prices. */

export const now = () => Date.now();
export const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });
export const bad = (msg, status = 400) => json({ error: msg }, status);

/* Money is integer pence everywhere it is stored. Floats lose pennies. */
export const toPence = n => Math.round(Number(n || 0) * 100);
export const fromPence = p => Math.round(Number(p || 0)) / 100;

/* Read aloud at a counter, so no O/0 or I/1/L. */
const CODE_ALPHABET = 'ACDEFHJKMNPQRTUVWXY3479';
export function collectCode() {
  const b = crypto.getRandomValues(new Uint8Array(6));
  let s = '';
  for (const n of b) s += CODE_ALPHABET[n % CODE_ALPHABET.length];
  return s.slice(0, 3) + '-' + s.slice(3);
}
export const token = () => 't_' + [...crypto.getRandomValues(new Uint8Array(16))]
  .map(n => n.toString(36)).join('').slice(0, 22);

/* Passwords and session ids.
 *
 * 100k PBKDF2 rounds, not the 600k OWASP suggests, because a Worker on the
 * free tier gets 10ms of CPU and 210k rounds alone costs 16ms. The iteration
 * count is what protects a GUESSABLE password in a leaked database. These
 * passwords are generated, 22 random characters, so the search space does the
 * work instead: no iteration count makes that crackable, and none saves a
 * password like "summer2026". Hence the length floor in seed.mjs, which is the
 * assumption this rests on. If staff accounts ever get human-chosen passwords,
 * this number has to go up and the Worker has to move to the paid plan. */
const PBKDF2_ROUNDS = 100000;
export async function hashPw(pw, saltHex) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ROUNDS, hash: 'SHA-256' }, key, 256);
  return bytesToHex(salt) + '$' + bytesToHex(new Uint8Array(bits));
}
export async function verifyPw(pw, stored) {
  const [salt] = String(stored || '').split('$');
  if (!salt) return false;
  const again = await hashPw(pw, salt);
  return timingSafeEqual(again, stored);
}
export function timingSafeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
const bytesToHex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
const hexToBytes = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));

export async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return bytesToHex(new Uint8Array(d));
}

/* Same checks the browser runs, because a browser can be bypassed. */
export const looksLikeEmail = v => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(String(v || '').trim());
export const digitsOnly = v => String(v || '').replace(/[^0-9]/g, '');

export async function audit(env, { ref, action, before, after, reason, actor, ip }) {
  await env.DB.prepare(
    `INSERT INTO audit (ref,action,before_val,after_val,reason,actor,ip_hash,created_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(ref || null, action, before ?? null, after ?? null, reason ?? null,
         actor || 'system', ip ? await sha256Hex(ip) : null, now()).run();
}

/* One place decides who may see an order, so it cannot be forgotten. */
export function mayReadOrder(row, { staff, token: t, who }) {
  if (staff) return true;
  if (t && timingSafeEqual(t, row.token)) return true;
  if (who) {
    const w = String(who).trim().toLowerCase();
    if (row.email && row.email.toLowerCase() === w) return true;
    const asked = digitsOnly(w);
    if (asked.length >= 6) {
      for (const p of [digitsOnly(row.phone), digitsOnly(row.recipient_phone)]) {
        if (p && (p.endsWith(asked) || asked.endsWith(p))) return true;
      }
    }
  }
  return false;
}

/* What a customer is allowed to see, which is not the whole document. */
export function publicView(row) {
  const doc = JSON.parse(row.doc);
  return {
    ref: row.ref, token: row.token, status: row.status, shipMode: row.ship_mode,
    collectCode: row.paid_pence > 0 ? row.collect_code : null,
    createdAt: row.created_at,
    customer: doc.customer, recipient: doc.recipient,
    items: doc.items, quote: doc.quote, payments: doc.payments,
    timeline: doc.timeline, cargo: doc.cargo, refunds: doc.refunds
  };
}


/* Rate limiting.
 *
 * There was none. Eight wrong passwords went through in two seconds with no
 * 429, which turns a password into an offline-speed guessing problem played
 * at network speed. Winston's passwords are generated and 24 characters, so
 * this is defence in depth rather than the only thing standing there, but the
 * customer lookup has no such protection behind it at all.
 *
 * Kept in D1 rather than in memory because a Worker isolate is not a place
 * state survives, and a counter that resets whenever Cloudflare feels like it
 * is not a rate limit.
 */
export async function rateLimit(env, key, { max = 8, windowMs = 900000, blockMs = 900000 } = {}) {
  const t = now();
  const row = await env.DB.prepare('SELECT n, first_at, until FROM attempts WHERE k = ?').bind(key).first();

  if (row && row.until && row.until > t) {
    return { ok: false, retryAfter: Math.ceil((row.until - t) / 1000) };
  }
  // A window that has passed, or a block that has expired, starts again.
  if (!row || (t - row.first_at) > windowMs || (row.until && row.until <= t)) {
    await env.DB.prepare(
      `INSERT INTO attempts (k,n,first_at,until) VALUES (?,0,?,NULL)
       ON CONFLICT(k) DO UPDATE SET n=0, first_at=excluded.first_at, until=NULL`
    ).bind(key, t).run();
    return { ok: true, remaining: max };
  }
  return { ok: true, remaining: Math.max(0, max - row.n) };
}

/* Called only when an attempt actually failed. A correct password costs
   nothing, so normal use never walks toward a block. */
export async function rateFail(env, key, { max = 8, windowMs = 900000, blockMs = 900000 } = {}) {
  const t = now();
  await env.DB.prepare(
    `INSERT INTO attempts (k,n,first_at,until) VALUES (?,1,?,NULL)
     ON CONFLICT(k) DO UPDATE SET n = attempts.n + 1`
  ).bind(key, t).run();
  const row = await env.DB.prepare('SELECT n FROM attempts WHERE k = ?').bind(key).first();
  if (row && row.n >= max) {
    await env.DB.prepare('UPDATE attempts SET until = ? WHERE k = ?').bind(t + blockMs, key).run();
    return { blocked: true, seconds: Math.ceil(blockMs / 1000) };
  }
  return { blocked: false };
}

export async function rateClear(env, key) {
  await env.DB.prepare('DELETE FROM attempts WHERE k = ?').bind(key).run();
}
