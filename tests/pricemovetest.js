require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
eval(js + `
const strip=h=>h.replace(/<[^>]+>/g,'').replace(/\\s+/g,' ').trim();
const cases=[
  ['reported 100, shop 104', 100, 104],
  ['reported 100, shop 96 ', 100, 96],
  ['reported 100, shop 100', 100, 100],
  ['reported nothing       ', null, 104],
  ['never confirmed        ', 100, null],
];
for(const [label,said,now] of cases){
  const out=priceMoved({displayedPrice:said, confirmedPrice:now});
  console.log(label, '->', out? strip(out) : '(nothing shown)');
}
console.log('');
// and prove it reaches the real customer quote page
const o=S.orders.find(x=>x.quote&&x.quote.sentAt&&!payTotals(x).initialPaid);
if(o){ const it=o.items[0]; it.displayedPrice=100; it.confirmedPrice=104;
  const h=viewQuote(o.ref,o.token);
  console.log('appears on the live quote page:', /You told us/.test(h));
} else console.log('no unpaid sent quote in the seed to check');
`);
