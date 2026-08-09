// A request should land on the desk already priced, and one press should send
// it. Nothing may reach the customer without that press.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

const FIELDS = { pName:'No7 Protect And Perfect Serum 50ml', pQty:'1', pPrice:'63.99',
                 pCat:'skincare', pSize:'100ml', pSecond:'', pSubs:'no', pSubsUrl:'', pSubsSize:'',
                 pSubsPrice:'', pNotes:'' };
const realGet = global.document.getElementById;
global.document.getElementById = id =>
  id in FIELDS ? { value: FIELDS[id], dataset:{}, focus(){}, scrollIntoView(){}, style:{} } : realGet(id);
const listeners = {};
global.document.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn) };
global.click = dataset => {
  const el = { dataset, tagName:'BUTTON', classList:{contains:()=>false}, closest:sel=>sel==='[data-act]'?el:null };
  (listeners.click || []).forEach(fn => fn({ target: el, preventDefault(){}, stopPropagation(){} }));
};

eval(js + `
const submit=(url,price,cat,name)=>{
  FIELDS.pPrice=String(price); FIELDS.pCat=cat; if(name)FIELDS.pName=name;
  const dr=draft();
  dr.pending=Object.assign({},extract(url),{qty:1});
  dr.pendingUrl=url;
  if(!addPending())throw new Error('addPending refused');
  Object.assign(dr.customer,{name:'Winston Dube',email:'w@example.com',whatsapp:'+447700900123'});
  Object.assign(dr.recipient,{name:'Tendai Moyo',phone:'+263771234567',country:'Zimbabwe'});
  click({act:'submitRequest'});
  return S.orders[S.orders.length-1];
};

console.log('KNOWN SHOP, PRICED, NOTHING RESTRICTED');
let o=submit('https://www.boots.com/no7-serum-50ml-10281142',63.99,'skincare');
let q=quoteCalc(o);
console.log('  status after submitting :', o.status);
console.log('  quote drafted           :', !!o.quote, o.quote&&o.quote.auto?'(automatically)':'');
console.log('  sent to the customer    :', !!(o.quote&&o.quote.sentAt));
console.log('  price already worked out:', money(q.total), '= '+money(q.productTotal)+' goods + '+money(q.deliveryTotal)+' postage + '+money(q.fee)+' fee + '+money(q.cargoEst)+' shipping');
console.log('  shipping box            :', q.seaTier, '('+q.sea.cells+' of 12 cells)');

console.log('');
console.log('one press to approve');
click({act:'approveQuote', ref:o.ref});
q=quoteCalc(o);
console.log('  status                  :', o.status);
console.log('  sent                    :', !!o.quote.sentAt);
console.log('  reported price confirmed:', o.items[0].confirmedPrice);
console.log('  customer was emailed    :', S.messages.some(m=>m.ref===o.ref&&/Quote ready/.test(m.type)));

console.log('');
console.log('CASES THAT MUST NOT SELF-PRICE');
const cases=[
 ['restricted item',   'https://www.boots.com/dolce-gabbana-light-blue-eau-de-toilette-100ml-1234567', 63.99, 'fragrance', 'Dolce Gabbana Light Blue Eau De Toilette 100ml'],
 ['shop we do not know','https://www.harrods.com/some-serum-50ml-p123', 340, 'skincare', 'Some Serum 50ml'],
];
for(const [label,url,price,cat,nm] of cases){
  const before=S.messages.length;
  const x=submit(url,price,cat,nm);
  console.log('  '+label.padEnd(21)+': status '+x.status.padEnd(28)+
    ' quote drafted '+(!!x.quote)+'   nothing sent '+(S.messages.length===before || !S.messages.slice(0,S.messages.length-before).some(m=>/Quote ready/.test(m.type))));
}

console.log('');
const nothingLeaked=S.orders.filter(x=>x.quote&&x.quote.sentAt).length;
console.log('orders created:', S.orders.length, '| quotes actually sent:', nothingLeaked, '(only the approved one)');
`);
