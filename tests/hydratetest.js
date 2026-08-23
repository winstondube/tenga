// One order missing a field took out the whole operations screen, because the
// queue counts walk every order. Anything from the server gets completed first.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');
global.location.hash = '#/admin';

eval(js + `
const partial = {
  ref:'TU-9001', token:'t_x', status:'Request submitted', shipMode:'sea',
  customer:{name:'W',email:'w@example.com',whatsapp:'+44'},
  recipient:{name:'T',phone:'+263'},
  items:[{name:'A thing', url:'https://x.co.uk/a', retailerName:'x', qty:1, displayedPrice:11}]
};
const h = hydrateOrder(partial);
let bad = [];
for (const k of ['quote','payments','refunds','cargo','timeline','holds','batchId'])
  if (h[k] === undefined) bad.push('order missing ' + k);
for (const k of ['restricted','attrs','itemStatus','id','qty','issues'])
  if (h.items[0][k] === undefined) bad.push('item missing ' + k);
console.log('a partial order is completed :', bad.length ? bad.join('; ') : 'yes');
console.log('  its own values are kept    :', h.ref==='TU-9001' && h.items[0].name==='A thing' && h.items[0].displayedPrice===11);
console.log('  timeline is never empty    :', Array.isArray(h.timeline) && h.timeline.length>0);

// the real failure: does the admin view survive it?
S.session='admin';
S.orders=[hydrateOrder(partial)];
let threw=null;
try { location.hash='#/admin'; render();
      location.hash='#/admin/order/TU-9001'; render(); }
catch(e){ threw=e.message }
const html=getHTML();
console.log('');
console.log('operations screen renders   :', !threw && !/Something went wrong/.test(html), threw||'');

// and the unhydrated version is exactly what used to break it
S.orders=[partial];
let threw2=null;
try { location.hash='#/admin'; render() } catch(e){ threw2=e.message }
const broke = threw2 || /Something went wrong/.test(getHTML());
console.log('without hydration it breaks :', broke ? 'yes, which is why this exists' : 'no longer reproduces');
process.exit(bad.length || threw ? 1 : 0);
`);
