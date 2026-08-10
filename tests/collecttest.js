// Nothing is handed over without a code and ID, so the code has to exist, be
// readable aloud, reach the customer, and never change.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

eval(js + `
console.log('code format');
const codes=Array.from({length:2000},()=>collectCode());
const bad=codes.filter(c=>!/^[ACDEFHJKMNPQRTUVWXY3479]{3}-[ACDEFHJKMNPQRTUVWXY3479]{3}$/.test(c));
console.log('  example                    :', codes[0], codes[1], codes[2]);
console.log('  all well formed            :', bad.length===0);
console.log('  no O 0 I 1 L to misread    :', !codes.join('').match(/[OI01L]/));
console.log('  collisions in 2000         :', 2000-new Set(codes).size);
console.log('  possible codes             :', Math.pow(23,6).toLocaleString('en-GB'));

console.log('');
console.log('every order carries one');
const o=newOrder({});
o.customer={name:'Winston Dube',email:'w@example.com',whatsapp:'+447700900123'};
o.recipient={name:'Tendai Moyo',phone:'+263771234567',town:'Harare'};
o.items=[Object.assign(newItem({url:'https://www.lookfantastic.com/thing-30ml/1.html',retailerId:'lookfantastic',
  retailerName:'LookFantastic',displayedPrice:60,confirmedPrice:60,qty:1,name:'Thing'}),{category:'skincare',itemStatus:'Approved'})];
o.quote={id:'q',deliveryOverrides:{},adjustments:[],sentAt:Date.now(),expiresAt:Date.now()+9e6,expiryMins:60,status:'Sent'};
S.orders.push(o);
const code=o.collectCode;
console.log('  code on the order          :', code);

console.log('');
console.log('it reaches the customer');
o.payments.push({id:'p1',type:'initial',provider:'Card',amount:quoteCalc(o).total,currency:'GBP',status:'Payment completed',paidAt:Date.now(),held:false});
applyPaymentEffects(o,o.payments[0]);
const payMsg=S.messages.find(m=>m.ref===o.ref&&m.type==='Payment received');
console.log('  payment email sent         :', !!payMsg);
console.log('  contains the code          :', !!payMsg&&payMsg.body.includes(code));
console.log('  names who must show ID     :', !!payMsg&&payMsg.body.includes('Tendai Moyo'));

console.log('');
console.log('and again when it lands');
['Received and checked','Awaiting final weight','Ready for cargo','Handed to cargo company','In transit to Zimbabwe','Arrived in Zimbabwe','Ready for collection'].forEach(st=>setStatus(o,st));
const arr=S.messages.filter(m=>m.ref===o.ref&&m.type==='Ready for collection');
console.log('  arrival message sent       :', arr.length===1, arr.length>1?'SENT '+arr.length+' TIMES':'');
console.log('  contains the code          :', arr.length&&arr[0].body.includes(code));
console.log('  says photo ID              :', arr.length&&/photo ID/i.test(arr[0].body));
setStatus(o,'Out for delivery'); setStatus(o,'Ready for collection');
console.log('  not repeated on a re-entry :', S.messages.filter(m=>m.ref===o.ref&&m.type==='Ready for collection').length===1);

console.log('');
console.log('  code unchanged all journey :', o.collectCode===code);
location.hash='#/track/'+o.ref+'/'+o.token;
const html=viewTrack(o.ref,o.token);
console.log('  shown on the tracking page :', html.includes(code));
console.log('  hidden before payment      :', !viewTrack(S.orders[0].ref,S.orders[0].token).includes(S.orders[0].collectCode) || payTotals(S.orders[0]).initialPaid>0);
`);
