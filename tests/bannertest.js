// Every status a paid order can reach must produce a banner that matches it.
require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
eval(js + `
const o=S.orders.find(x=>payTotals(x).initialPaid>0) || S.orders[0];
o.payments=[{id:'p1',type:'initial',provider:'Card',amount:100,currency:'GBP',status:'Payment completed',paidAt:Date.now(),held:false}];
o.quote={id:'q1',deliveryOverrides:{},adjustments:[],sentAt:Date.now()-1000,expiresAt:Date.now()+9e6,expiryMins:60,status:'Accepted'};

const wrong=[];
for(const s of ALL_STATUSES){
  o.status=s;
  const line=customerStatusLine(o);
  const claimsQuoteComing=/quote is on its way/.test(line.text);
  const past = /cargo|transit|Zimbabwe|Customs|collection|Delivered|consolidation|final weight|Out for delivery/i.test(s);
  if(claimsQuoteComing) wrong.push(s+'  ->  '+line.text.slice(0,60));
  else if(past && /checking price/.test(line.text)) wrong.push(s+' (stale) -> '+line.text.slice(0,60));
}
console.log('statuses checked:', ALL_STATUSES.length);
console.log('paid orders still told "your quote is on its way":', wrong.length);
wrong.forEach(w=>console.log('  ', w));
console.log('');
for(const s of ['Awaiting final weight','Assigned to cargo batch','Handed to cargo company','In transit to Zimbabwe','Customs clearance','Arrived in Zimbabwe','Ready for collection','Out for delivery','Delivered']){
  o.status=s; const l=customerStatusLine(o);
  console.log(s.padEnd(26), '|', l.text);
}
`);
