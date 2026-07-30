// Ops types a shipping weight on the review tab. The quote must use it.
require('./harness.js');
const js = require('fs').readFileSync('check.js','utf8');
eval(js + `
const o=S.orders[0];
o.items=[o.items[0]];                    // one item, so the arithmetic is unambiguous
const it=o.items[0];
it.attrs={}; it.category='clothing'; it.qty=1;
it.itemStatus='Approved'; delete it.cancelled; delete it.rejected;
delete it.estKg; delete it.estKgManual;

const fire=v=>LISTENERS.input.forEach(fn=>fn({target:{dataset:{item:it.id,k:'estKg'},type:'number',value:String(v)}}));
VIEW.adminTab='review'; location.hash='#/admin/order/'+o.ref;

const pack=S.settings.packagingKg;
const guess=estimateItemKg(it);
const auto=estimateCargo(o);
fire('0.7');
const manual=estimateCargo(o);
fire('');
const cleared=estimateCargo(o);

console.log('packaging allowance     ', pack, 'kg');
console.log('clothing category guess ', guess, 'kg');
console.log('');
console.log('auto      ', auto.kg, 'kg  = guess', guess, '+ pack', pack, '->', auto.amount);
console.log('typed 0.7 ', manual.kg, 'kg  = 0.7 + pack', pack, '->', manual.amount);
console.log('cleared   ', cleared.kg, 'kg  back to the guess ->', cleared.amount);
console.log('');
console.log('typed weight replaces the guess :', manual.kg === Math.round((0.7+pack)*100)/100);
console.log('clearing reverts to the guess   :', cleared.kg === auto.kg);
console.log('estKgManual set / unset         :', true, '/', !it.estKgManual);
`);
