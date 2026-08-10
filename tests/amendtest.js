// The desk flow: it arrives priced, we amend or approve, approving sends.
// An amendment must survive the approval, and the customer must be charged the
// amended figure, not the one the machine guessed.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

const listeners = {};
global.document.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn) };
global.confirm = () => true;
global.click = dataset => {
  const el = { dataset, tagName:'BUTTON', classList:{contains:()=>false}, closest:s => s==='[data-act]' ? el : null };
  (listeners.click || []).forEach(fn => fn({ target: el, preventDefault(){}, stopPropagation(){} }));
};
const fire = (type, dataset, value) => {
  const el = { dataset, type:'number', value:String(value) };
  (listeners[type] || []).forEach(fn => fn({ target: el }));
};

eval(js + `
const mk=()=>{
  const o=newOrder({});
  o.customer={name:'Winston Dube',email:'w@example.com',whatsapp:'+447700900123'};
  o.recipient={name:'Tendai Moyo',phone:'+263771234567',town:'Harare',country:'Zimbabwe'};
  o.items=[Object.assign(newItem({url:'https://www.lookfantastic.com/serum-30ml/1.html',retailerId:'lookfantastic',
    retailerName:'LookFantastic',displayedPrice:11,qty:2,name:'The Ordinary Niacinamide 30ml'}),{category:'skincare',itemStatus:'Awaiting review'})];
  S.orders.push(o); autoQuote(o); return o;
};

console.log('1. IT ARRIVES PRICED');
const o=mk();
let q=quoteCalc(o);
console.log('   status          :', o.status);
console.log('   auto-priced at  :', money(q.total), '= '+money(q.productTotal)+' goods + '+money(q.deliveryTotal)+' postage + '+money(q.fee)+' fee + '+money(q.cargoEst)+' shipping');
console.log('   customer told   :', S.messages.some(m=>m.ref===o.ref)?'SOMETHING WAS SENT':'nothing yet');

console.log('');
console.log('2. WE AMEND IT');
location.hash='#/admin/order/'+o.ref;
VIEW.adminTab='review';
const it=o.items[0];
// the shop is actually charging more than the customer reported
fire('input',{item:it.id,k:'confirmedPrice'},13.5);
// and it is a bigger bottle than the category assumes
fire('input',{item:it.id,k:'estKg'},0.55);
// postage for this retailer is wrong on file
fire('input',{ret:'lookfantastic',k:'delivery'},4.5);
// and a goodwill line, with a reason, as a real amendment would carry
o.quote.adjustments.push({delta:-3,reason:'Goodwill, late quote',by:'Admin (demo)',at:Date.now()});
q=quoteCalc(o);
console.log('   confirmed price :', it.confirmedPrice, '(customer had reported '+it.displayedPrice+')');
console.log('   weight override :', it.estKg, 'kg, honoured:', it.estKgManual===true);
console.log('   amended total   :', money(q.total));
console.log('   still unsent    :', !(o.quote&&o.quote.sentAt));

console.log('');
console.log('3. WE APPROVE');
const before=q.total;
click({act:'approveQuote', ref:o.ref});
q=quoteCalc(o);
const p=o.payments.filter(x=>x.type==='initial').slice(-1)[0];
const msg=S.messages.find(m=>m.ref===o.ref&&m.type==='Quote ready');
console.log('   status          :', o.status);
console.log('   sent            :', !!(o.quote&&o.quote.sentAt));
console.log('   amount charged  :', money(p.amount));
console.log('   matches amended :', p.amount===before, before!==quoteCalc(Object.assign({},o,{items:[Object.assign({},it,{confirmedPrice:null})]})).total?'(and differs from the auto figure)':'');
console.log('   price NOT reset to what the customer reported:', it.confirmedPrice===13.5);
console.log('   customer emailed:', !!msg);

console.log('');
console.log('4. WHAT WAS ACTUALLY PULLED, versus assumed');
const ex=extract('https://www.lookfantastic.com/the-ordinary-niacinamide-10-zinc-1-30ml/11363576.html');
console.log('   from the link   : name "'+ex.name+'", size '+ex.size+', shop '+ex.retailerName);
console.log('   from our records: UK postage for that shop');
console.log('   from the customer: the price');
console.log('   assumed by us   : weight and volume, from the product kind');
`);
