require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
eval(js + `
const st=S.settings;
console.log('settings: rate GBP'+st.cargoRate+'/kg, min GBP'+st.cargoMin+', clearance GBP'+st.clearance+
            ', margin '+st.cargoSafetyPct+'%, tolerance GBP'+st.cargoTolerance);
console.log('');
console.log('  kg |  shown rate | shown min | freight | clearance |   total | parts add up?');
let allAddUp=true;
for(const kg of [0.65,1,1.58,2,4,10]){
  const items=[{itemStatus:'Approved',qty:1,estKg:kg-(st.packagingKg||0),estKgManual:true,attrs:{},category:'other'}];
  const e=estimateCargo({items});
  const sum=Math.round((e.freight+e.clearance)*100)/100;
  const ok=Math.abs(sum-e.amount)<0.005;
  if(!ok)allAddUp=false;
  console.log(String(e.kg).padStart(5),'| GBP'+String(e.rate).padStart(8),'| GBP'+String(e.min).padStart(6),
              '| GBP'+String(e.freight).padStart(6),'| GBP'+String(e.clearance).padStart(6),
              '| GBP'+String(e.amount).padStart(6),'|', ok?'yes':'NO');
}
console.log('');
console.log('every quote line reconciles to the total :', allAddUp);
console.log('clearance quoted at the true pass-through:', estimateCargo({items:[]}).clearance === st.clearance + st.localDelivery);
`);
