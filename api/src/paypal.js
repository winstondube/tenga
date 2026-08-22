/* PayPal.
 *
 * The rule this file exists to enforce: the browser never decides that money
 * arrived, and never decides how much. We create the order with PayPal using
 * the amount from our own database, and we only mark it paid when PayPal tells
 * us so directly, on a webhook whose signature we have verified.
 *
 * The buyer's browser can say anything. PayPal's servers cannot.
 */
import { now, toPence, fromPence, audit } from './lib.js';

const api = env => env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function accessToken(env) {
  const creds = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`);
  const r = await fetch(`${api(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${creds}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) throw new Error('paypal auth failed: ' + r.status);
  return (await r.json()).access_token;
}

/* Create a PayPal order for an amount we worked out, not one we were handed. */
export async function createPayPalOrder(env, { ref, amountPence, kind, returnTo }) {
  const token = await accessToken(env);
  const value = fromPence(amountPence).toFixed(2);
  const r = await fetch(`${api(env)}/v2/checkout/orders`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json',
               'paypal-request-id': `${ref}-${kind}-${amountPence}` },   // idempotent
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `${ref}:${kind}`,
        custom_id: `${ref}:${kind}`,
        description: `Tenga UK order ${ref}`.slice(0, 127),
        amount: { currency_code: 'GBP', value }
      }],
      application_context: {
        brand_name: 'Tenga UK', locale: 'en-GB', user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',     // we are not shipping to them, we collect
        return_url: returnTo, cancel_url: returnTo
      }
    })
  });
  const out = await r.json();
  if (!r.ok) throw new Error('paypal create failed: ' + JSON.stringify(out).slice(0, 200));
  return { id: out.id, status: out.status };
}

/* Capture. Still not proof of payment on its own: the webhook is. */
export async function capturePayPalOrder(env, paypalOrderId) {
  const token = await accessToken(env);
  const r = await fetch(`${api(env)}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json',
               'paypal-request-id': `cap-${paypalOrderId}` }
  });
  const out = await r.json();
  return { ok: r.ok, body: out };
}

/* Ask PayPal whether the event really came from PayPal. Doing this by hand
   means implementing certificate-chain checking; PayPal will just tell us. */
export async function verifyWebhook(env, req, rawBody) {
  if (!env.PAYPAL_WEBHOOK_ID) return { verified: false, reason: 'no webhook id configured' };
  const h = n => req.headers.get(n) || '';
  const token = await accessToken(env);
  const r = await fetch(`${api(env)}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      auth_algo: h('paypal-auth-algo'),
      cert_url: h('paypal-cert-url'),
      transmission_id: h('paypal-transmission-id'),
      transmission_sig: h('paypal-transmission-sig'),
      transmission_time: h('paypal-transmission-time'),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody)
    })
  });
  const out = await r.json().catch(() => ({}));
  return { verified: out.verification_status === 'SUCCESS', reason: out.verification_status || r.status };
}

/* The only path that may mark an order paid. */
export async function applyWebhook(env, event) {
  const type = event.event_type || '';
  const res = event.resource || {};
  const custom = res.custom_id || (res.supplementary_data && res.supplementary_data.related_ids) || '';
  const [ref, kind = 'initial'] = String(custom).split(':');
  if (!ref) return { ignored: 'no order reference on the event' };

  const row = await env.DB.prepare('SELECT * FROM orders WHERE ref = ?').bind(ref).first();
  if (!row) return { ignored: 'unknown order ' + ref };

  const captureId = res.id;
  const amountPence = toPence(res.amount && res.amount.value);

  // A replayed webhook must be a no-op, not a second payment.
  const seen = await env.DB.prepare('SELECT id FROM payments WHERE provider_ref = ?').bind(captureId).first();
  if (seen) return { ignored: 'already recorded', captureId };

  if (type === 'PAYMENT.CAPTURE.COMPLETED') {
    await env.DB.prepare(
      `INSERT INTO payments (id,ref,kind,provider,provider_ref,amount_pence,currency,status,raw,created_at,paid_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), ref, kind, 'PayPal', captureId, amountPence,
           (res.amount && res.amount.currency_code) || 'GBP', 'Payment completed',
           JSON.stringify(event).slice(0, 8000), now(), now()).run();

    const paid = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount_pence),0) AS p FROM payments WHERE ref = ? AND status = 'Payment completed'`
    ).bind(ref).first();

    const doc = JSON.parse(row.doc);
    doc.payments = doc.payments || [];
    doc.payments.push({ id: captureId, type: kind, provider: 'PayPal',
      amount: fromPence(amountPence), currency: 'GBP', status: 'Payment completed',
      ref: captureId, createdAt: now(), paidAt: now(), held: false });
    doc.status = kind === 'initial' ? 'Paid — awaiting retailer purchase' : doc.status;
    doc.timeline = doc.timeline || [];
    doc.timeline.push({ status: doc.status, at: now(), note: 'PayPal capture ' + captureId, actor: 'PayPal' });

    await env.DB.prepare(
      'UPDATE orders SET status=?, paid_pence=?, doc=?, updated_at=? WHERE ref=?'
    ).bind(doc.status, paid.p, JSON.stringify(doc), now(), ref).run();

    await audit(env, { ref, action: 'Payment captured', after: '£' + fromPence(amountPence).toFixed(2),
                       actor: 'PayPal', reason: captureId });
    return { applied: 'paid', ref, amount: fromPence(amountPence), paidTotal: fromPence(paid.p) };
  }

  if (type === 'PAYMENT.CAPTURE.DENIED' || type === 'PAYMENT.CAPTURE.DECLINED') {
    await audit(env, { ref, action: 'Payment denied', actor: 'PayPal', reason: captureId });
    return { applied: 'denied', ref };
  }

  if (type === 'PAYMENT.CAPTURE.REFUNDED' || type === 'PAYMENT.CAPTURE.REVERSED') {
    await env.DB.prepare(
      `INSERT INTO payments (id,ref,kind,provider,provider_ref,amount_pence,currency,status,raw,created_at,paid_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), ref, kind, 'PayPal', captureId, -Math.abs(amountPence),
           'GBP', 'Payment refunded', JSON.stringify(event).slice(0, 8000), now(), now()).run();
    await audit(env, { ref, action: 'Payment refunded by PayPal',
                       after: '£' + fromPence(amountPence).toFixed(2), actor: 'PayPal', reason: captureId });
    return { applied: 'refunded', ref };
  }

  return { ignored: 'event type not handled: ' + type };
}
