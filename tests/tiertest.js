// Sea is sold in standard sizes. The sizes have to be quotable without
// measuring anything, and a partly-full box still has to pay for itself.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

eval(js + `
const st=S.settings;
console.log('box '+boxLitres()+' L gross, '+usableLitres()+' L of goods, costs '+money(st.seaBoxPrice));
console.log('');
console.log('size          up to      price    per L   how many fill a box   that box collects');
let bad=[];
let lastRate=Infinity;
st.seaTiers.forEach(t=>{
  const fit=Math.floor(usableLitres()/t.maxL);
  const rev=round2(fit*t.price);
  const perL=round2(t.price/t.maxL);
  if(perL>lastRate)bad.push('NO, '+t.name+' costs more per litre than the size below it');
  lastRate=perL;
  console.log(t.name.padEnd(13), (t.maxL+' L').padStart(6), money(t.price).padStart(10), money(perL).padStart(8),
    String(fit).padStart(20), (money(rev)+(rev>=st.seaBoxPrice?'  covers it':'  SHORT')).padStart(20));
});
console.log('');
console.log('bigger sizes are cheaper per litre:', bad.length?bad.join('; '):'yes');
console.log('');

// quoting must never need a measurement, just a size that fits
console.log('goods      -> size quoted                       price   headroom');
[0.5,2.9,3.1,8,17.9,25,39,41,80].forEach(L=>{
  const t=seaTierFor(L);
  console.log((L+' L').padStart(7), '->', t.name.padEnd(34), money(t.price).padStart(7),
    (t.headroom!=null?t.headroom+' L':'-').padStart(9));
});
console.log('');

// the thing Winston actually worried about: a box that does not fill
const mk=(cat,q)=>({status:'Paid — awaiting retailer purchase',shipMode:'sea',quote:null,payments:[{type:'initial',status:'Payment completed',amount:1,held:false}],
  items:[Object.assign(newItem({url:'https://x.co.uk/a',retailerId:null,retailerName:'x.co.uk',name:'a',displayedPrice:60,confirmedPrice:60,qty:q||1}),{category:cat,itemStatus:'Approved'})]});

const scenarios=[
  ['one Large customer only',        [mk('footwear',3)]],
  ['two Medium customers',           [mk('footwear',2),mk('footwear',2)]],
  ['a month of small beauty orders', Array.from({length:8},()=>mk('skincare',3))],
  ['one perfume, nothing else',      [mk('fragrance',1)]]
];
console.log('scenario                        litres  boxes  fill   collected   cost   margin');
scenarios.forEach(([name,orders])=>{
  const e=boxEconomics(orders);
  console.log(name.padEnd(32), String(e.litres).padStart(6), String(e.boxes).padStart(6),
    (e.fillPct+'%').padStart(6), money(e.revenue).padStart(11), money(e.cost).padStart(7),
    (money(e.margin)+(e.pays?'':'  SAIL AND LOSE')).padStart(9));
});
`);
