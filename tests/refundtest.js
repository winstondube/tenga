require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
eval(js + `
const st=S.settings;
const mk=(prices)=>{
  const o={ref:'T',token:'t',status:'Received and checked',items:prices.map((p,i)=>newItem(
    {url:'https://www.asos.com/thing-'+i,retailerId:'asos',retailerName:'ASOS',name:'Item '+(i+1),displayedPrice:p,confirmedPrice:p,qty:1})),
    quote:{deliveryOverrides:{},adjustments:[],sentAt:1,expiresAt:9e15,status:'Sent'},payments:[],refunds:[],timeline:[],cargo:{}};
  o.items.forEach(i=>i.itemStatus='Approved');
  return o;
};

console.log('policy: handling '+st.returnAdminPct+'% min '+money(st.returnAdminMin)+', notice '+st.returnNoticeDays+' working days');
console.log('');

// one item, whole order cancelled
let o=mk([104]);
let q=quoteCalc(o);
let r=refundCalc(o,o.items[0],0);
console.log('SOLE ITEM, whole order cancelled');
console.log('  paid                '+money(q.total));
console.log('  product back        '+money(r.product));
console.log('  handling           -'+money(r.admin));
console.log('  shipping back      +'+money(r.shipping)+'   (nothing sails)');
console.log('  refund              '+money(r.refund));
console.log('  we keep             '+money(r.fee)+' fee');
console.log('');

// two items, one cancelled: shipping must NOT come back here
o=mk([104,60]);
r=refundCalc(o,o.items[0],0);
console.log('TWO ITEMS, one cancelled');
console.log('  product back        '+money(r.product));
console.log('  handling           -'+money(r.admin));
console.log('  shipping back      +'+money(r.shipping)+'   (parcel still sails, weigh-in settles it)');
console.log('  refund              '+money(r.refund));
console.log('  double refund risk: '+(r.shipping===0?'none':'YES, BUG'));
console.log('');

// shop keeps a restocking fee
o=mk([104]);
r=refundCalc(o,o.items[0],15);
console.log('SHOP KEEPS GBP15 RESTOCKING');
console.log('  refund              '+money(r.refund)+'  (104 - 15 shop - '+money(r.admin)+' handling + '+money(r.shipping)+' shipping)');
console.log('');

// cheap item: the floor has to bite
o=mk([12]);
r=refundCalc(o,o.items[0],0);
console.log('CHEAP ITEM GBP12');
console.log('  5% would be         '+money(round2(12*0.05)));
console.log('  floor applied       '+money(r.admin)+'   '+(r.admin===st.returnAdminMin?'yes':'NO, FLOOR NOT APPLIED'));
console.log('');

// already sailed
o=mk([104]); o.status='In transit to Zimbabwe';
console.log('AFTER DEPARTURE');
console.log('  hasSailed           '+hasSailed(o)+'   (cancel is refused)');
console.log('  before departure    '+hasSailed(mk([104])));
`);
