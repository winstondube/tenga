// Sea is sold in standard sizes. The sizes have to be quotable without
// measuring anything, and a partly-full box still has to pay for itself.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

eval(js + `
const st=S.settings;
console.log('box '+boxLitres()+' L gross, '+usableLitres()+' L of goods, costs '+money(st.seaBoxPrice));
console.log('');
console.log('the space divides into '+st.cellsPerArchiveBox+' cells of '+st.cellMmL+'x'+st.cellMmW+'x'+st.cellMmH+'mm');
console.log('');
console.log('box     size mm            cells   holds    price   per cell   a full box sold as these');
let bad=[], lastPer=Infinity;
st.seaBoxes.forEach(b=>{
  const cap=boxCapacityL(b), fit=Math.floor(st.cellsPerArchiveBox/b.cells);
  const rev=round2(fit*b.price), per=round2(b.price/b.cells);
  if(per>lastPer)bad.push('NO, '+b.name+' costs more per cell than the box below it');
  lastPer=per;
  console.log(b.name.padEnd(7), (b.mm.join('x')).padEnd(18), String(b.cells).padStart(5),
    (cap+' L').padStart(8), money(b.price).padStart(9), money(per).padStart(10),
    ('   '+fit+' x = '+money(rev)+(rev>=st.seaBoxPrice?'  covers it':'  SHORT')));
});
console.log('');
console.log('bigger boxes are cheaper per cell:', bad.length?bad.join('; '):'yes');
console.log('boxes all fit the archive box   :', st.seaBoxes.every(b=>b.mm[0]<=453&&b.mm[1]<=366&&b.mm[2]<=326));
console.log('');

// quoting must never need a measurement, just a size that fits
console.log('goods      -> box quoted                        price   cells   spare');
[0.5,4,4.7,9,18,19,38,39,90].forEach(L=>{
  const t=seaBoxFor(L);
  console.log((L+' L').padStart(7), '->', t.name.padEnd(33), money(t.price).padStart(7),
    String(t.cells).padStart(7), (t.headroom+' L').padStart(8));
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
console.log('scenario                        cells  fill   collected   cost   margin');
scenarios.forEach(([name,orders])=>{
  const e=boxEconomics(orders);
  console.log(name.padEnd(32), (e.cells+'/'+e.capacity).padStart(5),
    (e.fillPct+'%').padStart(6), money(e.revenue).padStart(11), money(e.cost).padStart(7),
    (money(e.margin)+(e.pays?'':'  need '+e.needCells+' more')).padStart(9));
});
`);
