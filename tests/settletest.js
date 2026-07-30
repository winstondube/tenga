require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
eval(js + `
const st=S.settings;
const o=S.orders[0];
o.items=[{id:'i1',itemStatus:'Approved',qty:1,estKg:0.7,estKgManual:true,attrs:{},category:'clothing',
          confirmedPrice:104,displayedPrice:104,retailerId:'asos',url:'https://www.asos.com/x',name:'Jeans'}];
o.quote={id:'q',deliveryOverrides:{},adjustments:[],sentAt:Date.now(),expiresAt:Date.now()+9e6,expiryMins:60,status:'Sent'};
const q=quoteCalc(o);
console.log('quoted shipping (padded)  GBP'+q.cargoEst);
console.log('');
console.log('weighed |  vol |  true cost | difference | what happens');
for(const [w,l,wd,h] of [[0.6,0,0,0],[0.95,0,0,0],[1.4,32,24,16],[2.2,0,0,0],[0.7,0,0,0]]){
  o.cargo={actualWeight:w, l:l||'', w:wd||'', h:h||''};
  const c=cargoCalc(o);
  const diff=Math.round((c.total-q.cargoEst)*100)/100;
  const act=Math.abs(diff)<=st.cargoTolerance ? 'rounding, nothing to settle'
          : diff>0 ? 'ask the customer for GBP'+diff.toFixed(2)
                   : 'refund GBP'+Math.abs(diff).toFixed(2)+' to the customer';
  console.log(String(w).padStart(6)+'kg |'+String(c.vol||'-').padStart(5)+' | GBP'+String(c.total).padStart(6)+
              ' |'+(diff>0?'+':'')+String(diff).padStart(7)+' | '+act);
}
`);
