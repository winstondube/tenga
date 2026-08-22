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

/* Passwords and session ids. PBKDF2 because Workers give us WebCrypto and
   nothing else worth using; the iteration count is the security. */
export async function hashPw(pw, saltHex) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, key, 256);
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
