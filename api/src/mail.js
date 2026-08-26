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
function wrap({ heading, lines, code, action, motto }) {
  const p = lines.map(l => `<p style="margin:0 0 14px;line-height:1.6">${l}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#F0F3F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#101614">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F3F0;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #DDE4DF;border-radius:10px">
  <tr><td style="padding:20px 24px;border-bottom:1px solid #EDF1EE;font-weight:700;letter-spacing:-.01em">tenga<span style="color:#B8862F">uk</span></td></tr>
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
    ${motto ? `<b style="color:#101614">${esc(motto)}</b><br>` : ''}
    Tenga UK, a buy-for-me and forwarding service. Cargo handled by third party carriers.
  </td></tr>
</table></td></tr></table></body></html>`;
}

/* Shorthands, so twenty templates stay readable and consistent. */
const track = (o, site) => ({ label: 'Track this order', href: `${site}/#/track/${o.ref}/${o.token}` });
const quoteLink = (o, site) => ({ label: 'See the quote and pay', href: `${site}/#/quote/${o.ref}/${o.token}` });
const who = o => esc((o.recipient && o.recipient.name) || (o.customer && o.customer.name) || 'the recipient');
/* Vars arrive from whichever screen triggered the email. Missing ones must
   never print "undefined" at a customer, so everything reads through here. */
const v = (x, k, fallback) => {
  const got = x && x[k];
  return (got === undefined || got === null || got === '') ? (fallback || '') : esc(String(got));
};

export const TEMPLATES = {
  'Request received': (o, site, x, motto) => ({
    subject: `We have your request, ${firstName(o)} · ${o.ref}`,
    html: wrap({ motto, heading: 'We have your request',
      lines: ['We are checking the current price, availability and UK delivery cost on every link you sent.',
              'You will get one quote with a single total, and nothing is bought until you approve it.'],
      action: track(o, site) })
  }),

  'More information required': (o, site, x, motto) => ({
    subject: `We need one thing before we can quote ${o.ref}`,
    html: wrap({ motto, heading: 'One thing before we can price this',
      lines: [v(x, 'need', 'We need a little more detail on one of your links before we can give you a firm price.'),
              'Reply to this email and we will pick it up from there.'],
      action: track(o, site) })
  }),

  'Quote ready': (o, site, x, motto) => ({
    subject: `Your quote for ${o.ref} · ${v(x, 'total')}`,
    html: wrap({ motto, heading: 'Your quote is ready',
      lines: [`Your total is <b>${v(x, 'total')}</b>, shipping included, with nothing to pay on arrival.`,
              `Prices move, so it holds for ${v(x, 'mins', '60')} minutes. After that we recheck and resend.`],
      action: quoteLink(o, site) })
  }),

  'Quote expiring': (o, site, x, motto) => ({
    subject: `Your quote for ${o.ref} expires shortly`,
    html: wrap({ motto, heading: 'Your quote expires shortly',
      lines: [`${v(x, 'total')} for ${esc(o.ref)}, shipping included.`,
              'Prices at the shops move during the day, so once it lapses we have to recheck and send a new one. Nothing is lost if it does.'],
      action: quoteLink(o, site) })
  }),

  'Payment received': (o, site, x, motto) => ({
    subject: `Payment received for ${o.ref} · keep your collection code`,
    html: wrap({ motto, heading: 'Thank you, that is paid',
      lines: [`We have received ${v(x, 'amount')} and we will now place the order with the shop.`,
              `Whoever collects brings this code <b>and photo ID in the name of ${who(o)}</b> to <b>${v(x, 'where', 'our Harare collection point')}</b>. We cannot hand the order over without both.`],
      code: o.collectCode, action: track(o, site) })
  }),

  'Retailer purchase completed': (o, site, x, motto) => ({
    subject: `Bought for ${o.ref}`,
    html: wrap({ motto, heading: 'We have bought it',
      lines: [`Your order is placed with the shop${x && x.orderNumber ? `, their reference ${v(x, 'orderNumber')}` : ''}.`,
              'Next it comes to our UK address, where we check it against what you asked for before it goes anywhere near a shipment.'],
      action: track(o, site) })
  }),

  'Product unavailable': (o, site, x, motto) => ({
    subject: `One item on ${o.ref} is not available`,
    html: wrap({ motto, heading: 'One item is not available',
      lines: [`<b>${v(x, 'item', 'One of your items')}</b> ${v(x, 'reason', 'is not available to buy')}.`,
              v(x, 'outcome', 'It has been taken off your order and anything you paid for it is refunded. The rest of your order is unaffected.')],
      action: track(o, site) })
  }),

  'Substitute approval required': (o, site, x, motto) => ({
    subject: `${o.ref} needs a decision from you`,
    html: wrap({ motto, heading: 'We need a decision',
      lines: [`<b>${v(x, 'item', 'One of your items')}</b> ${v(x, 'reason', 'is not available')}.`,
              v(x, 'options', 'You told us a substitute is acceptable. Reply and tell us to go ahead, or to cancel that item and refund it.'),
              'Nothing happens on this item until you answer, and the rest of your order carries on as normal.'],
      action: track(o, site) })
  }),

  'Retailer dispatched': (o, site, x, motto) => ({
    subject: `The shop has dispatched part of ${o.ref}`,
    html: wrap({ motto, heading: 'On its way to us',
      lines: ['The shop has dispatched your item to our UK address.',
              'We check everything against what you asked for when it lands, then it joins the next shipment.'],
      action: track(o, site) })
  }),

  'Goods received in the UK': (o, site, x, motto) => ({
    subject: `${o.ref} has arrived at our UK address`,
    html: wrap({ motto, heading: 'Everything is here and checked',
      lines: ['Your order has arrived with us and passed inspection against what you asked for.',
              'Next we weigh the parcel and put it on the next shipment.'],
      action: track(o, site) })
  }),

  'Goods issue identified': (o, site, x, motto) => ({
    subject: `A problem with one item on ${o.ref}`,
    html: wrap({ motto, heading: 'We found a problem',
      lines: [`We checked your order in and found an issue with <b>${v(x, 'item', 'one of your items')}</b>.`,
              v(x, 'detail', 'We are taking it up with the shop. Nothing ships until it is sorted, and we will tell you the outcome either way.')],
      action: track(o, site) })
  }),

  'Cargo payment required': (o, site, x, motto) => ({
    subject: `Shipping for ${o.ref} is ${v(x, 'amount')}`,
    html: wrap({ motto, heading: 'Your parcel has been weighed',
      lines: [`It came to <b>${v(x, 'kg', 'its final weight')}</b>, so shipping to Zimbabwe is <b>${v(x, 'amount')}</b>.`,
              'It goes on the next shipment once this is paid.'],
      action: track(o, site) })
  }),

  'Cargo payment reminder': (o, site, x, motto) => ({
    subject: `${o.ref} is waiting on shipping payment`,
    html: wrap({ motto, heading: 'Still waiting on shipping',
      lines: [`Your parcel is packed and ready, and ${v(x, 'amount')} of shipping is outstanding.`,
              'Shipments leave monthly, so paying before the cut off is the difference between this one and next month.'],
      action: track(o, site) })
  }),

  'Cargo payment received': (o, site, x, motto) => ({
    subject: `Shipping paid for ${o.ref}`,
    html: wrap({ motto, heading: 'Shipping is paid',
      lines: [`Thank you, we have received ${v(x, 'amount')}.`,
              'Your parcel goes on the next shipment out.'],
      action: track(o, site) })
  }),

  'Additional payment required': (o, site, x, motto) => ({
    subject: `${o.ref} needs a further ${v(x, 'amount')}`,
    html: wrap({ motto, heading: 'A further payment is needed',
      lines: [v(x, 'reason', 'The price at the shop has moved since we quoted you.'),
              `We need a further <b>${v(x, 'amount')}</b> before we can finish the purchase. If you would rather not, tell us and we will cancel and refund instead.`],
      action: track(o, site) })
  }),

  'Handed to cargo company': (o, site, x, motto) => ({
    subject: `${o.ref} is on its way to Zimbabwe`,
    html: wrap({ motto, heading: 'On its way',
      lines: [`Your parcel has been handed to ${v(x, 'company', 'the cargo company')}${x && x.reference ? `, reference ${v(x, 'reference')}` : ''}.`,
              'We will tell you when it lands and is ready to collect.'],
      action: track(o, site) })
  }),

  'Packed for Zimbabwe': (o, site, x, motto) => ({
    subject: `${o.ref} is packed for the next shipment`,
    html: wrap({ motto, heading: 'Packed and ready',
      lines: ['Your parcel is packed and allocated to the next shipment out.'],
      action: track(o, site) })
  }),

  'In transit to Zimbabwe': (o, site, x, motto) => ({
    subject: `${o.ref} is in transit`,
    html: wrap({ motto, heading: 'In transit',
      lines: ['Your parcel has left the UK.',
              'We will tell you when it lands and is ready to collect. There is nothing you need to do in the meantime.'],
      action: track(o, site) })
  }),

  'Customs clearance': (o, site, x, motto) => ({
    subject: `${o.ref} is clearing customs`,
    html: wrap({ motto, heading: 'Clearing customs',
      lines: ['Your parcel has landed and is going through customs clearance.',
              'Nothing to pay and nothing to do. We will message you the moment it is ready to collect.'],
      action: track(o, site) })
  }),

  'Arrived in Zimbabwe': (o, site, x, motto) => ({
    subject: `${o.ref} has landed in Zimbabwe`,
    html: wrap({ motto, heading: 'Landed',
      lines: ['Your parcel is in Zimbabwe and on its way to the collection point.',
              'Do not travel yet. We will email you the moment it is actually there, and that email is the one to act on.'],
      action: track(o, site) })
  }),

  'Ready for collection': (o, site, x, motto) => ({
    subject: `${o.ref} has arrived in Harare`,
    html: wrap({ motto, heading: 'Ready to collect',
      lines: [`Your order has landed and is ready at <b>${v(x, 'where', 'our Harare collection point')}</b>.`,
              `Bring this code and photo ID in the name of ${who(o)}. We cannot hand it over without both.`],
      code: o.collectCode, action: { label: 'Where to collect', href: `${site}/collection/` } })
  }),

  'Out for delivery': (o, site, x, motto) => ({
    subject: `${o.ref} is out for delivery`,
    html: wrap({ motto, heading: 'Out for delivery',
      lines: [`Your order is on its way to ${who(o)}.`,
              'Have the collection code and photo ID ready, as they are needed on handover.'],
      code: o.collectCode, action: track(o, site) })
  }),

  'Item cancelled and refunded': (o, site, x, motto) => ({
    subject: `One item on ${o.ref} has been cancelled and refunded`,
    html: wrap({ motto, heading: 'Cancelled and refunded',
      lines: [`<b>${v(x, 'item', 'One item')}</b> has been cancelled${x && x.reason ? `, ${v(x, 'reason')}` : ''}.`,
              `${v(x, 'amount', 'What you paid for it')} is on its way back to you. Refunds usually show within a few working days, depending on your bank.`,
              'The rest of your order carries on as normal.'],
      action: track(o, site) })
  }),

  'Refund issued': (o, site, x, motto) => ({
    subject: `Refund of ${v(x, 'amount')} for ${o.ref}`,
    html: wrap({ motto, heading: 'Refund on its way',
      lines: [`We have refunded <b>${v(x, 'amount')}</b>.`,
              v(x, 'reason', 'It usually shows within a few working days, depending on your bank.')],
      action: track(o, site) })
  }),

  'Delivered': (o, site, x, motto) => ({
    subject: `${o.ref} has been collected`,
    html: wrap({ motto, heading: 'Collected',
      lines: [`${o.ref} has been handed over. Thank you for using Tenga.`,
              'If anything is not right, reply to this email and a person will read it.'],
      action: null })
  })
};

const firstName = o => String((o.customer && o.customer.name) || '').split(' ')[0] || 'there';

export async function send(env, { ref, type, to, channel = 'Email', order, vars = {} }) {
  const site = String(env.SITE_ORIGINS || '').split(',')[0] || '';
  const build = TEMPLATES[type];
  if (!build) throw new Error('no template for ' + type);
  const { subject, html } = build({ ...order, ref }, site, vars, env.MOTTO || '');

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
