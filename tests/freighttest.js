// Sea is priced by the space in a box, air by the kilo. The two cross over,
// so the important thing to pin is that we recommend the right one.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

eval(js + `
const st=S.settings;
console.log('box '+st.seaBoxMmL+'x'+st.seaBoxMmW+'x'+st.seaBoxMmH+'mm = '+boxLitres()+' L');
console.log('usable at '+st.packEfficiencyPct+'%: '+usableLitres()+' L, so '+money(seaRate())+' per litre');
console.log('air '+money(st.airRate)+' per kg');
console.log('crossover density: '+round2(seaRate()/st.airRate*1000)+' kg per cubic metre');
console.log('');

const one=(cat,qty)=>({items:[Object.assign(newItem({url:'https://www.asos.com/x',retailerId:'asos',retailerName:'ASOS',name:'x',displayedPrice:50,confirmedPrice:50,qty:qty||1}),{category:cat,itemStatus:'Approved'})]});

console.log('category      litres    kg   fit/box       sea       air   cheaper');
for(const cat of Object.keys(CAT_L)){
  const o=one(cat);
  const e=estimateCargo(o);
  const fit=Math.floor(usableLitres()/CAT_L[cat]);
  console.log(cat.padEnd(12),
    String(e.litres).padStart(6), String(e.kg).padStart(5), String(fit).padStart(9),
    money(e.sea.amount).padStart(10), money(e.air.amount).padStart(10),
    ('  '+e.cheaper).padStart(9));
}
console.log('');

// the recommendation has to fire for the two different reasons
const bulky=one('hairpiece');
const qb=quoteCalc(Object.assign({quote:null},bulky));
console.log('bulky cheap order  -> adviseAir', qb.adviseAir, '| cheaper:', qb.cheaper, '| saves', money(qb.saving));

const dear=one('fragrance');
dear.items[0].confirmedPrice=400; dear.items[0].displayedPrice=400;
const qd=quoteCalc(Object.assign({quote:null},dear));
console.log('expensive dense    -> adviseAir', qd.adviseAir, '| cheaper:', qd.cheaper, '(advised anyway: over '+money(st.adviseAirOver)+')');

const small=one('skincare');
const qs=quoteCalc(Object.assign({quote:null},small));
console.log('small cheap dense  -> adviseAir', qs.adviseAir, '| cheaper:', qs.cheaper);
console.log('');

// picking air must actually change the quote
const a=quoteCalc(Object.assign({quote:null,shipMode:'air'},one('hairpiece')));
const b=quoteCalc(Object.assign({quote:null,shipMode:'sea'},one('hairpiece')));
console.log('same wig, air total', money(a.total), '| sea total', money(b.total));
console.log('mode actually changes the total:', a.total!==b.total);
console.log('');

// reconciliation: sea measures the carton, air weighs it
const o=Object.assign({quote:null,shipMode:'sea',cargo:{l:30,w:20,h:8}},one('hairpiece'));
const cs=cargoCalc(o);
o.shipMode='air'; o.cargo={actualWeight:0.35,l:30,w:20,h:8};
const ca=cargoCalc(o);
console.log('sea actual: '+cs.basis+' -> '+money(cs.total));
console.log('air actual: '+ca.basis+' -> '+money(ca.total));
console.log('');
console.log('sea charges volume, not weight :', cs.chargeable===cs.litres);
console.log('air charges weight or volumetric:', ca.chargeable>=0.35);
`);
