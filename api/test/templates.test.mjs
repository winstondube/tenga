/* Twenty-five templates, none of which a customer should ever see broken.
 *
 * Two failure modes matter here and neither throws:
 *   - a var the sending screen forgot to pass, printing "undefined" at a
 *     customer inside an otherwise perfect sentence
 *   - a type the app is willing to send that the server cannot build, which
 *     fails only in production, only for that one message
 */
import { TEMPLATES } from '../src/mail.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log('  ok   ', label) }
  else { fail++; console.log('  FAIL ', label, ' -> ', detail || '') }
};

const order = {
  ref: 'TU-1041', token: 't_abc', collectCode: 'KMP-4T9',
  customer: { name: 'Rutendo Chikafu', email: 'r@example.com' },
  recipient: { name: 'Tendai Moyo', phone: '+263771234567' }
};
const SITE = 'https://tengauk.com';
const MOTTO = 'Shop UK. Collect in Harare.';
const names = Object.keys(TEMPLATES);

console.log(`\nevery template renders, with nothing passed to it`);
{
  // The worst case: the screen that triggered it passed no vars at all.
  let bad = [];
  for (const t of names) {
    let out;
    try { out = TEMPLATES[t](order, SITE, {}, MOTTO) }
    catch (e) { bad.push(t + ' threw ' + e.message); continue }
    const h = out.html || '', s = out.subject || '';
    if (/undefined|NaN|\[object Object\]/.test(h + s)) bad.push(t + ' printed a placeholder');
    if (!s) bad.push(t + ' has no subject');
    if (!/tengauk|Tenga/i.test(h)) bad.push(t + ' does not look like ours');
  }
  ok(`all ${names.length} render with no vars`, !bad.length, bad.join('; '));
}

console.log('\nwith the vars they are actually given');
{
  const vars = { total: '£93.85', amount: '£12.40', mins: 45, where: 'Mbare Grillz, Harare',
                 item: 'No7 Protect And Perfect Serum 50ml', reason: 'is out of stock',
                 outcome: 'We have cancelled it.', options: 'Reply and tell us which.',
                 kg: '4.2 kg', company: 'Zim Cargo', reference: 'ZC-88120',
                 orderNumber: 'BOO-773311', need: 'Which shade did you want?',
                 detail: 'The shop sent the wrong size.' };
  let bad = [];
  for (const t of names) {
    const out = TEMPLATES[t](order, SITE, vars, MOTTO);
    const both = out.subject + out.html;
    if (/undefined|NaN|\[object Object\]/.test(both)) bad.push(t);
  }
  ok('none print a placeholder', !bad.length, bad.join(', '));
}

console.log('\nthings a customer relies on');
{
  const t = (n, v = {}) => TEMPLATES[n](order, SITE, v, MOTTO);
  ok('the collection email carries the code', t('Ready for collection').html.includes('KMP-4T9'));
  ok('and names who must show ID', t('Ready for collection').html.includes('Tendai Moyo'));
  ok('the payment email carries the code too', t('Payment received', { amount: '£93.85' }).html.includes('KMP-4T9'));
  ok('the quote email links to the quote, not the tracker',
     t('Quote ready', { total: '£93.85' }).html.includes('/#/quote/TU-1041/t_abc'));
  ok('the arrival warning says do not travel yet',
     /do not travel yet/i.test(t('Arrived in Zimbabwe').html));
  ok('a refund names the amount', t('Refund issued', { amount: '£12.40' }).subject.includes('£12.40'));
  ok('every subject names the order',
     names.filter(n => !t(n, { total: '£1', amount: '£1' }).subject.includes('TU-1041')).length === 0,
     names.filter(n => !t(n, { total: '£1', amount: '£1' }).subject.includes('TU-1041')).join(', '));
}

console.log('\nhtml a mail client will not mangle');
{
  let bad = [];
  for (const t of names) {
    const h = TEMPLATES[t](order, SITE, { total: '£1', amount: '£1' }, MOTTO).html;
    // Gmail strips <style> blocks and external css, so every rule has to be
    // inline on the element it applies to.
    if (/<style/i.test(h)) bad.push(t + ' uses a style block');
    if (/class=/i.test(h)) bad.push(t + ' uses a class');
    if (!/<!doctype html>/i.test(h)) bad.push(t + ' has no doctype');
  }
  ok('all inline, no stylesheets or classes', !bad.length, bad.join('; '));
}

console.log('\nthe app and the server agree on what can be sent');
{
  // A type the app will try to send that the server cannot build fails only
  // in production, only for that one message, and only for that one customer.
  const appSrc = readFileSync(new URL('../../src/app.html', import.meta.url), 'utf8');
  const block = appSrc.split('const MAILABLE=new Set([')[1].split('])')[0];
  const mailable = [...block.matchAll(/'([^']+)'/g)].map(m => m[1]);
  const missing = mailable.filter(t => !TEMPLATES[t]);
  ok(`all ${mailable.length} types the panel sends have a template`, !missing.length, missing.join(', '));

  // The reverse is the bug this whole area already had once: a template that
  // exists and is never reachable.
  const SERVER_SENDS = ['Request received', 'Payment received'];
  const orphans = names.filter(t => !mailable.includes(t) && !SERVER_SENDS.includes(t));
  ok('and no template is unreachable', !orphans.length, orphans.join(', '));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
