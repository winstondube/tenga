/* Mail sent to us.
 *
 * Resend receives it, tells us an email arrived, and we fetch the body. The
 * webhook carries metadata only, so there are always two calls: the signed
 * notification, then a read.
 *
 * Two things matter more than the plumbing:
 *
 *  1. A copy still goes to Winston's own inbox. That is the alert; the admin
 *     panel is where it gets answered. If forwarding fails the mail is still
 *     safely in the database, so the copy is best-effort and never blocks.
 *
 *  2. An unverified webhook is dropped. Anyone can POST to a public URL, and
 *     an inbox that shows forged mail is worse than no inbox.
 */
import { now, timingSafeEqual } from './lib.js';

const RESEND = 'https://api.resend.com';

/* Svix signing, which is what Resend uses. The secret is base64 after the
   whsec_ prefix, and the signed content is id.timestamp.body. */
export async function verifyInbound(env, req, raw) {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) return { verified: false, reason: 'no signing secret configured' };

  const id = req.headers.get('svix-id');
  const ts = req.headers.get('svix-timestamp');
  const sig = req.headers.get('svix-signature');
  if (!id || !ts || !sig) return { verified: false, reason: 'missing signature headers' };

  // A signature stays valid forever unless the timestamp is checked, so an
  // intercepted delivery could be replayed back at us indefinitely.
  const age = Math.abs(Math.floor(now() / 1000) - Number(ts));
  if (!Number.isFinite(age) || age > 300) return { verified: false, reason: 'timestamp outside tolerance' };

  const key = await crypto.subtle.importKey(
    'raw', b64ToBytes(String(secret).replace(/^whsec_/, '')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${raw}`));
  const mine = bytesToB64(new Uint8Array(mac));

  // The header can carry several signatures during a secret rotation, and any
  // one of them matching is a pass.
  const offered = String(sig).split(' ').map(s => s.split(',')[1]).filter(Boolean);
  const hit = offered.some(o => timingSafeEqual(o, mine));
  return hit ? { verified: true } : { verified: false, reason: 'signature did not match' };
}

const b64ToBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const bytesToB64 = b => btoa(String.fromCharCode(...b));

/* Order references look like TU-1041. Customers quote them in subjects and
   in quoted replies, which is the cheapest reliable way to attach mail to the
   thing it is about. */
export const findRef = s => {
  const m = String(s || '').match(/\bTU-\d{3,6}\b/i);
  return m ? m[0].toUpperCase() : null;
};

const stripHtml = h => String(h || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

/* Trim the quoted history off a reply so the list shows what was actually
   written rather than the whole chain again. */
export function toSnippet(text) {
  const cut = String(text || '')
    .split(/\n\s*(?:On .{0,120}wrote:|-{2,} ?Original Message|_{5,}|From: )/i)[0]
    .replace(/^>.*$/gm, '')
    .trim();
  return cut.slice(0, 200);
}

/* A From header is often `Some One <them@example.com>`. Threading and replying
   both key off the bare address, because the display name is theirs to change
   and changing it must not start a second conversation. */
const addr = v => {
  const s = String(Array.isArray(v) ? v[0] : v || '').trim();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
};

/* Fetch the body. The webhook deliberately does not carry it.
   Returns why it failed rather than just null: a message stored with no body
   is a bug you cannot diagnose from the row it leaves behind. */
export async function fetchBody(env, emailId) {
  if (!env.RESEND_KEY) return { ok: false, error: 'no api key configured' };
  let r;
  try {
    r = await fetch(`${RESEND}/emails/receiving/${emailId}`, {
      headers: { authorization: `Bearer ${env.RESEND_KEY}` }
    });
  } catch (e) { return { ok: false, error: String(e).slice(0, 200) } }
  const text = await r.text().catch(() => '');
  if (!r.ok) return { ok: false, status: r.status, error: text.slice(0, 300) };
  try { return { ok: true, data: JSON.parse(text) } }
  catch { return { ok: false, status: r.status, error: 'response was not json' } }
}

/* Pull the body again for a message we already have. Used when the first
   fetch failed, so a message is repairable instead of permanently blank. */
export async function refetchBody(env, row) {
  const got = await fetchBody(env, row.provider_id);
  if (!got.ok) return got;
  const text = got.data.text || stripHtml(got.data.html) || '';
  await env.DB.prepare('UPDATE inbox SET body_text = ?, snippet = ? WHERE id = ?')
    .bind(text.slice(0, 60000), toSnippet(text), row.id).run();
  return { ok: true, length: text.length };
}

/* Store one received email. Returns what happened, so the route can say so. */
export async function receiveEmail(env, event) {
  const d = (event && event.data) || {};
  if (!d.email_id) return { ignored: 'no email id' };

  // UNIQUE on provider_id is the real guard, but checking first keeps a
  // redelivery from spending an API call on a body we already have.
  const seen = await env.DB.prepare('SELECT id FROM inbox WHERE provider_id = ?').bind(d.email_id).first();
  if (seen) return { ignored: 'already stored', id: seen.id };

  const got = await fetchBody(env, d.email_id);
  const full = got.ok ? got.data : null;
  const text = (full && (full.text || stripHtml(full.html))) || '';
  const from = addr(d.from) || addr(full && full.from);
  const to = addr(d.received_for) || addr(d.to) || addr(full && full.to);
  const subject = String(d.subject || (full && full.subject) || '(no subject)').slice(0, 300);

  const ref = findRef(subject) || findRef(text);
  // Group by order when we know it, otherwise by who wrote, so a stranger's
  // exchange still reads as one conversation.
  const threadKey = ref || from.toLowerCase();

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO inbox (id,thread_key,ref,direction,from_addr,to_addr,subject,body_text,snippet,
                        message_id,provider_id,attachments,read_at,created_at)
     VALUES (?,?,?,'in',?,?,?,?,?,?,?,?,NULL,?)`
  ).bind(id, threadKey, ref, from, to, subject, text.slice(0, 60000),
         toSnippet(text), d.message_id || null, d.email_id,
         Array.isArray(d.attachments) ? d.attachments.length : 0, now()).run();

  // Best effort, and deliberately after the write.
  const forwarded = await forwardCopy(env, { from, to, subject, text, ref });
  return { stored: id, ref, threadKey, forwarded,
           bodyOk: got.ok, bodyError: got.ok ? null : (got.status ? got.status + ' ' + got.error : got.error) };
}

/* The alert copy. Winston reads mail on his phone; he answers it in the panel. */
async function forwardCopy(env, { from, to, subject, text, ref }) {
  const onward = env.FORWARD_TO;
  if (!onward || !env.RESEND_KEY) return false;
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const site = String(env.SITE_ORIGINS || '').split(',')[0] || '';
  try {
    const r = await fetch(`${RESEND}/emails`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [onward],
        // reply_to so hitting reply on the phone reaches the customer rather
        // than looping the forward back into our own inbox.
        reply_to: [from],
        subject: `[Tenga] ${subject}`,
        html: `<p style="font:13px -apple-system,sans-serif;color:#6B7C75;margin:0 0 12px">
          From <b>${esc(from)}</b> to ${esc(to)}${ref ? ` · order <b>${esc(ref)}</b>` : ''}<br>
          <a href="${esc(site)}/#/admin/inbox">Reply in the admin panel</a>, so the answer is on file.
        </p><hr style="border:none;border-top:1px solid #DDE4DF"><div style="white-space:pre-wrap;font:14px -apple-system,sans-serif">${esc(text).slice(0, 20000)}</div>`
      })
    });
    return r.ok;
  } catch { return false }
}

/* Replying. Sent as us, recorded in the same thread so the panel shows both
   halves of the conversation. */
export async function replyToThread(env, { threadKey, to, subject, text, ref, inReplyTo, staff }) {
  const id = crypto.randomUUID();
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Sign it with the person who wrote it. A reply from a named human reads
  // like a reply; a strapline describing our own business model does not.
  const who = (staff && staff.name && staff.name !== 'Operations') ? staff.name : '';
  // MAIL_FROM is "Tenga UK <help@tengauk.com>"; the signature wants the address.
  const from = (String(env.MAIL_FROM || '').match(/<([^>]+)>/) || [])[1]
             || String(env.MAIL_FROM || 'help@tengauk.com');
  const wa = env.CONTACT_WHATSAPP || '';
  const html = `<div style="white-space:pre-wrap;font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#101614">${esc(text)}</div>
    <p style="margin:22px 0 0;font:13px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#101614">
      ${who ? esc(who) + '<br>' : ''}<span style="color:#6B7C75">Tenga UK</span><br>
      <a href="mailto:${esc(from)}" style="color:#0B5D4E;text-decoration:none">${esc(from)}</a>${wa ? `<span style="color:#6B7C75"> · ${esc(wa)}</span>` : ''}
    </p>`;

  let providerId = null, ok = false, error = null;
  if (env.RESEND_KEY) {
    try {
      const r = await fetch(`${RESEND}/emails`, {
        method: 'POST',
        headers: { authorization: `Bearer ${env.RESEND_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: env.MAIL_FROM, to: [to], subject,
          html,
          // Keeps the reply inside the customer's existing thread rather than
          // starting a new one in their client.
          ...(inReplyTo ? { headers: { 'In-Reply-To': inReplyTo, 'References': inReplyTo } } : {})
        })
      });
      const out = await r.json().catch(() => ({}));
      ok = r.ok; providerId = out.id || null;
      if (!ok) error = JSON.stringify(out).slice(0, 300);
    } catch (e) { error = String(e).slice(0, 300) }
  }

  await env.DB.prepare(
    `INSERT INTO inbox (id,thread_key,ref,direction,from_addr,to_addr,subject,body_text,snippet,
                        message_id,provider_id,attachments,read_at,created_at)
     VALUES (?,?,?,'out',?,?,?,?,?,NULL,?,0,?,?)`
  ).bind(id, threadKey, ref || null, env.MAIL_FROM || 'help@tengauk.com', to, subject,
         text.slice(0, 60000), toSnippet(text), providerId, now(), now()).run();

  return { id, sent: ok, providerId, error };
}
