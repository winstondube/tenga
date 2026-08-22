/* Sending, and remembering that we sent.
 *
 * Every attempt is written to `messages` whether or not a provider is wired up,
 * so "did the customer actually get told" is answerable from one place rather
 * than from a provider dashboard nobody checks. With no key configured it
 * records the message as queued and sends nothing, which keeps the whole flow
 * runnable without an account.
 */
import { now } from './lib.js';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* One template, so every email looks like the same company sent it. */
function wrap({ heading, lines, code, action }) {
  const p = lines.map(l => `<p style="margin:0 0 14px;line-height:1.6">${l}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#F0F3F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#101614">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F3F0;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #DDE4DF;border-radius:10px">
  <tr><td style="padding:20px 24px;border-bottom:1px solid #EDF1EE;font-weight:700;letter-spacing:-.01em">tenga<span style="color:#0B5D4E">.uk</span></td></tr>
  <tr><td style="padding:24px">
    <h1 style="margin:0 0 14px;font-size:20px;font-weight:650;letter-spacing:-.01em">${esc(heading)}</h1>
    ${p}
    ${code ? `<div style="margin:18px 0;padding:14px;border:1px dashed #B8862F;border-radius:8px;text-align:center">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6B7C75">Collection code</div>
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:30px;font-weight:700;letter-spacing:.1em;margin-top:4px">${esc(code)}</div>
    </div>` : ''}
    ${action ? `<a href="${esc(action.href)}" style="display:inline-block;background:#0B5D4E;color:#fff;text-decoration:none;padding:11px 18px;border-radius:7px;font-weight:600">${esc(action.label)}</a>` : ''}
  </td></tr>
  <tr><td style="padding:16px 24px;border-top:1px solid #EDF1EE;font-size:12px;color:#6B7C75">
    Tenga UK, a buy-for-me and forwarding service. Cargo handled by third party carriers.
  </td></tr>
</table></td></tr></table></body></html>`;
}

export const TEMPLATES = {
  'Request received': (o, site) => ({
    subject: `We have your request, ${firstName(o)} · ${o.ref}`,
    html: wrap({ heading: 'We have your request',
      lines: ['We are checking the current price, availability and UK delivery cost on every link you sent.',
              'You will get one quote with a single total, and nothing is bought until you approve it.'],
      action: { label: 'Track this order', href: `${site}/#/track/${o.ref}/${o.token}` } })
  }),
  'Quote ready': (o, site, x) => ({
    subject: `Your quote for ${o.ref} · ${x.total}`,
    html: wrap({ heading: `Your quote is ready`,
      lines: [`Your total is <b>${esc(x.total)}</b>, shipping included, with nothing to pay on arrival.`,
              `Prices move, so it holds for ${esc(x.mins)} minutes. After that we recheck and resend.`],
      action: { label: 'See the quote and pay', href: `${site}/#/quote/${o.ref}/${o.token}` } })
  }),
  'Payment received': (o, site, x) => ({
    subject: `Payment received for ${o.ref} · keep your collection code`,
    html: wrap({ heading: 'Thank you, that is paid',
      lines: [`We have received ${esc(x.amount)} and we will now place the order with the shop.`,
              `Whoever collects in Harare brings this code <b>and photo ID in the name of ${esc(o.recipient && o.recipient.name)}</b>. We cannot hand the order over without both.`],
      code: o.collectCode,
      action: { label: 'Track this order', href: `${site}/#/track/${o.ref}/${o.token}` } })
  }),
  'Ready for collection': (o, site) => ({
    subject: `${o.ref} has arrived in Harare`,
    html: wrap({ heading: 'Ready to collect',
      lines: ['Your order has landed and is ready at our Harare collection point.',
              `Bring this code and photo ID in the name of ${esc(o.recipient && o.recipient.name)}.`],
      code: o.collectCode,
      action: { label: 'Where to collect', href: `${site}/collection/` } })
  })
};
const firstName = o => String((o.customer && o.customer.name) || '').split(' ')[0] || 'there';

export async function send(env, { ref, type, to, channel = 'Email', order, vars = {} }) {
  const site = String(env.SITE_ORIGINS || '').split(',')[0] || '';
  const build = TEMPLATES[type];
  if (!build) throw new Error('no template for ' + type);
  const { subject, html } = build({ ...order, ref }, site, vars);

  const id = crypto.randomUUID();
  const row = (status, providerId, error) => env.DB.prepare(
    `INSERT INTO messages (id,ref,type,channel,recipient,body,status,provider_id,error,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, ref, type, channel, to, subject, status, providerId || null, error || null, now()).run();

  if (!env.RESEND_KEY) { await row('Queued, no provider configured'); return { id, sent: false } }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html })
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) { await row('Failed', null, JSON.stringify(out).slice(0, 300)); return { id, sent: false, error: out } }
    await row('Delivered', out.id);
    return { id, sent: true, providerId: out.id };
  } catch (e) {
    await row('Failed', null, String(e).slice(0, 300));
    return { id, sent: false, error: String(e) };
  }
}
