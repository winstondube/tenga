require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
eval(js + `
const st=S.settings, D=86400000;
const f=(t)=>new Date(t).toDateString().slice(4);
console.log('departures every '+st.shipEveryDays+' days, crossing '+st.transitDays+' days, pay by '+st.shipCutoffDays+' days before');
console.log('');
const sail=shipSchedule(3);
console.log('leaves UK        pay by           collectable in Harare');
sail.forEach(x=>console.log(f(x.departs).padEnd(17)+f(x.cutoff).padEnd(17)+f(x.arrives)));
console.log('');
const dep=sail[0].departs, arr=sail[0].arrives;
console.log('crossing on the next shipment :', Math.round((arr-dep)/D), 'days');
console.log('');
// best and worst case a customer can experience
const best=Math.round(st.transitDays/7);
const worst=Math.round((st.transitDays+st.shipEveryDays)/7);
console.log('order just before the cutoff  : about '+best+' weeks');
console.log('order just after a departure  : about '+worst+' weeks');
console.log('');
console.log('site claims 10-day crossing?  :', Math.round((arr-dep)/D)===10 ? 'STILL WRONG' : 'no, fixed');
`);
