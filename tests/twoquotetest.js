// The customer is quoted both routes and pays whichever they prefer. The route
// is only decided by that press, and it has to change what we charge.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

const listeners = {};
global.document.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn) };
// every confirmation ticked, which the pay action insists on
global.document.querySelectorAll = sel => sel === '.qc' ? [{checked:true},{checked:true},{checked:true},{checked:true},{checked:true}] : [];
global.click = dataset => {
  const el = { dataset, tagName:'BUTTON', classList:{contains:()=>false}, closest:s => s==='[data-act]' ? el : null };
  (listeners.click || []).forEach(fn => fn({ target: el, preventDefault(){}, stopPropagation(){} }));
};

eval(js + `
const mk=(cat,qty,price)=>{
  const o=newOrder({});
  o.items=[Object.assign(newItem({url:'https://www.lookfantastic.com/thing-30ml/1234.html',retailerId:'lookfantastic',
    retailerName:'LookFantastic',displayedPrice:price,confirmedPrice:price,qty:qty,name:'Thing'}),{category:cat,itemStatus:'Approved'})];
  o.customer={name:'W',email:'w@example.com',whatsapp:'+44'};
  o.recipient={name:'T',phone:'+263',town:'Harare',country:'Zimbabwe'};
  o.quote={id:'q',deliveryOverrides:{},adjustments:[],sentAt:Date.now(),expiresAt:Date.now()+9e6,expiryMins:60,status:'Sent'};
  S.orders.push(o); return o;
};

console.log('both routes are quoted on the same goods\\n');
console.log('order                       goods    sea    air   cheaper');
for(const [label,cat,qty,price] of [['a few serums','skincare',3,15],['a wig','hairpiece',1,60],['trainers','footwear',1,95]]){
  const o=mk(cat,qty,price);
  const sea=quoteCalc(Object.assign({},o,{shipMode:'sea'}));
  const air=quoteCalc(Object.assign({},o,{shipMode:'air'}));
  const goods=round2(sea.total-sea.cargoEst);
  console.log(label.padEnd(24), money(goods).padStart(8), money(sea.total).padStart(7), money(air.total).padStart(7),
    ('  '+(air.total<sea.total?'air':'sea')).padStart(9));
}

console.log('');
console.log('the customer picks, and it changes the bill');
const o=mk('hairpiece',1,60);
const sea=quoteCalc(Object.assign({},o,{shipMode:'sea'})), air=quoteCalc(Object.assign({},o,{shipMode:'air'}));
console.log('  quoted   sea '+money(sea.total)+'   air '+money(air.total));
console.log('  default before choosing :', o.shipMode);
location.hash='#/quote/'+o.ref+'/'+o.token;
click({act:'pay', ref:o.ref, mode:'air'});
const paid=o.payments.filter(p=>p.type==='initial').slice(-1)[0];
console.log('  after pressing pay by air:', o.shipMode);
console.log('  amount on the payment   :', money(paid.amount));
console.log('  matches the air quote   :', paid.amount===air.total);
console.log('  route written to the log:', S.audit.some(a=>a.ref===o.ref&&/chose the route/i.test(a.action)));

console.log('');
const o2=mk('hairpiece',1,60);
location.hash='#/quote/'+o2.ref+'/'+o2.token;
click({act:'pay', ref:o2.ref, mode:'sea'});
const p2=o2.payments.filter(p=>p.type==='initial').slice(-1)[0];
console.log('  same order paid by sea  :', money(p2.amount), '| matches sea quote:', p2.amount===quoteCalc(Object.assign({},o2,{shipMode:'sea'})).total);
console.log('  the two differ          :', p2.amount!==paid.amount);
`);
