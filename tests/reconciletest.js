// The invariant: reconcile at the rate we quoted. Settling against our own cost
// hands the margin back on every order, which is exactly what used to happen.
require('./harness.js');
const js = require('fs').readFileSync('check.js', 'utf8');

eval(js + `
const st=S.settings;
const mk=(mode,cat,q)=>({ref:'X',token:'t',status:'Received and checked',shipMode:mode,payments:[],refunds:[],timeline:[],
  items:[Object.assign(newItem({url:'https://x.co.uk/a',retailerId:null,retailerName:'x',displayedPrice:60,confirmedPrice:60,qty:q,name:'a'}),{category:cat,itemStatus:'Approved'})],
  quote:{deliveryOverrides:{},adjustments:[],sentAt:1,expiresAt:9e15,status:'Sent'},cargo:{}});
const idFor=name=>(st.seaBoxes.find(b=>b.name===String(name).split(' ')[0])||{}).id;

let bad=[];
console.log('nothing changed, nothing to settle');
console.log('mode  order                quoted    actual   settle');
for(const [mode,cat,qty] of [['sea','skincare',8],['sea','fragrance',3],['sea','clothing',2],
                             ['air','skincare',8],['air','hairpiece',1],['air','footwear',1]]){
  const o=mk(mode,cat,qty), q=quoteCalc(o);
  o.cargo = mode==='sea' ? {boxId:idFor(q.seaTier)} : {actualWeight:round2(q.cargoKg-st.packagingKg)};
  const c=cargoCalc(o), diff=round2(c.total-q.cargoEst);
  if(Math.abs(diff)>st.cargoTolerance) bad.push(mode+'/'+cat+' settles '+money(diff));
  console.log(mode.padEnd(5), (cat+' x'+qty).padEnd(20), money(q.cargoEst).padStart(8), money(c.total).padStart(9), money(diff).padStart(8));
}
console.log('');
console.log('every unchanged order settles to zero:', bad.length?bad.join('; '):'yes');

console.log('');
console.log('and a genuine change still settles');
let o=mk('sea','skincare',8); let q=quoteCalc(o);
o.cargo={boxId:idFor('Half')};
console.log('  needed a Half instead of a '+q.seaTier+' :', money(round2(cargoCalc(o).total-q.cargoEst)), 'to ask for');
o=mk('air','skincare',8); q=quoteCalc(o);
o.cargo={actualWeight:round2(q.cargoKg-st.packagingKg-0.8)};
console.log('  came in 0.8 kg light             :', money(round2(cargoCalc(o).total-q.cargoEst)), 'to refund');

console.log('');
console.log('the margin we actually keep');
const per=st.cellsPerArchiveBox;
st.seaBoxes.forEach(b=>{
  const cost=round2(b.cells/per*st.seaBoxPrice)+b.card;
  console.log('  sea '+b.name.padEnd(6)+' charge '+money(b.price).padStart(8)+'  cost '+money(cost).padStart(8)+'  margin '+money(round2(b.price-cost)).padStart(7)+'  '+Math.round((b.price-cost)/b.price*100)+'%');
});
o=mk('air','skincare',8); q=quoteCalc(o);
const airCost=round2(q.cargoKg*st.airRate);
console.log('  air          charge '+money(q.cargoFreight).padStart(8)+'  cost '+money(airCost).padStart(8)+'  margin '+money(round2(q.cargoFreight-airCost)).padStart(7)+'  '+Math.round((q.cargoFreight-airCost)/q.cargoFreight*100)+'%');
`);
