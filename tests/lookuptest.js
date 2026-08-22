// Order references run in sequence, so the lookup must not hand over an order
// to anyone who can count. It needs the reference AND a contact on the order.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

const listeners = {};
global.document.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn) };
global.click = dataset => {
  const el = { dataset, tagName:'BUTTON', classList:{contains:()=>false}, closest:s => s==='[data-act]' ? el : null };
  (listeners.click || []).forEach(fn => fn({ target: el, preventDefault(){}, stopPropagation(){} }));
};
const FIELDS = { lookupRef:'', lookupWho:'' };
const realGet = global.document.getElementById;
const stub = extra => Object.assign({
  value:'', dataset:{}, focus(){}, scrollIntoView(){}, remove(){}, appendChild(){},
  classList:{add(){},remove(){},toggle(){},contains:()=>false},
  style:{setProperty(){},removeProperty(){}},
  querySelector:()=>null, querySelectorAll:()=>[],
  set innerHTML(v){this._h=v}, get innerHTML(){return this._h||''}
}, extra||{});
// null for anything else, exactly like the harness, or runShelf walks a fake
// element's missing parentElement
global.document.getElementById = id => id in FIELDS ? stub({value:FIELDS[id]}) : null;
// the hero shelf only runs on the home view, so boot straight onto the lookup page
global.location.hash='#/lookup';

eval(js + `
const target=S.orders[0];
const tryIt=(ref,who)=>{
  FIELDS.lookupRef=ref; FIELDS.lookupWho=who;
  location.hash='#/lookup';
  click({act:'lookup'});
  return location.hash.startsWith('#/track/');
};

console.log('target order '+target.ref+', customer '+target.customer.email);
console.log('');
console.log('attempt                                              opens?');
const rows=[
 ['reference alone, no contact',            target.ref, ''],
 ['reference + wrong email',                target.ref, 'someone@else.com'],
 ['reference + wrong phone',                target.ref, '+263 99 999 9999'],
 ['reference + right email',                target.ref, target.customer.email],
 ['reference + right email, odd case',      target.ref, target.customer.email.toUpperCase()],
 ['reference + customer whatsapp',          target.ref, target.customer.whatsapp||'-'],
 ['reference + recipient phone',            target.ref, target.recipient.phone||'-'],
 ['wrong reference + right email',          'TU-9999',  target.customer.email],
 ['short digits, trying to brute force',    target.ref, '123']
];
let leaked=[];
for(const [label,ref,who] of rows){
  const ok=tryIt(ref,who);
  const shouldOpen=ref===target.ref && /right email|whatsapp|recipient phone/.test(label);
  if(ok!==shouldOpen) leaked.push(label+' -> '+(ok?'OPENED':'refused'));
  console.log('  '+label.padEnd(48)+(ok?'YES':'no'));
}
console.log('');
console.log('behaves as intended:', leaked.length?('NO -> '+leaked.join('; ')):'yes');

// the whole point: can a stranger walk the sequence?
let got=0;
for(const o of S.orders){ if(tryIt(o.ref,'')) got++; }
console.log('orders openable by reference alone:', got, 'of', S.orders.length);
`);
