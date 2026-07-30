require('./harness.js');
const fs=require('fs');
const js=fs.readFileSync('check.js','utf8');
const test=`
S.session='admin';  // operations is gated now, sign in so the admin views are actually rendered
const routes=['#/','#/request','#/lookup','#/admin','#/admin/orders?q=all','#/admin/retailers','#/admin/settings','#/admin/batches','#/admin/finance','#/admin/reports','#/admin/audit'];
Object.keys(QMAP).forEach(k=>routes.push('#/admin/orders?q='+k));
S.orders.forEach(o=>routes.push('#/track/'+o.ref+'/'+o.token,'#/quote/'+o.ref+'/'+o.token,'#/submitted/'+o.ref,'#/pay/'+o.ref+'/'+o.token+'/initial','#/pay/'+o.ref+'/'+o.token+'/cargo'));
S.orders.forEach(o=>routes.push('#/admin/order/'+o.ref));
let bad=0;
const tabs=['review','quote','payments','purchase','receiving','cargo','comms','history'];
for(const r of routes){
  const isOrder=r.includes('/admin/order/');
  for(const t of (isOrder?tabs:['review'])){
    VIEW.adminTab=t; location.hash=r;
    try{ render(); const h=getHTML();
      if(/Something went wrong/.test(h)){console.log('RENDER ERROR',r,t,h.slice(0,300));bad++}
      if(/>undefined</.test(h)||/undefined<\\/b>/.test(h)){console.log('UNDEFINED leak',r,t);bad++}
    }catch(e){console.log('THROW',r,t,e.message);bad++}
  }
}
console.log('routes x tabs tested, failures:',bad);
const o=S.orders[0];
o.items.forEach(i=>i.confirmedPrice=i.displayedPrice);
const q=quoteCalc(o);
console.log('O1 product',q.productTotal,'delivery',q.deliveryTotal,'fee',q.fee,'total',q.total,'groups',q.groups.length);
console.log('Example A expect 54 ->',quoteCalc({items:[{retailerId:'boots',retailerName:'Boots',confirmedPrice:40,qty:1}],quote:{deliveryOverrides:{boots:4}}}).total);
console.log('Example B expect 120 ->',quoteCalc({items:[{retailerId:'boots',retailerName:'Boots',confirmedPrice:100,qty:1}],quote:{deliveryOverrides:{boots:0}}}).total);
console.log('minSpend at 39 (expect false):',quoteCalc({items:[{retailerId:'boots',confirmedPrice:39,qty:1}],quote:{deliveryOverrides:{boots:0}}}).meetsMin);
console.log('free-delivery: Boots 30 subtotal ->',quoteCalc({items:[{retailerId:'boots',retailerName:'Boots',confirmedPrice:30,qty:1}],quote:{}}).deliveryTotal);
console.log('two retailers separate delivery ->',JSON.stringify(quoteCalc({items:[{retailerId:'boots',retailerName:'Boots',confirmedPrice:20,qty:1},{retailerId:'superdrug',retailerName:'Superdrug',confirmedPrice:15,qty:1}],quote:{}}).groups.map(g=>[g.name,g.delivery])));
const o5=S.orders.find(x=>x.cargo&&x.cargo.actualWeight);
console.log('cargo calc',JSON.stringify(cargoCalc(o5)));
console.log('extract boots:',JSON.stringify(extract('https://www.boots.com/no7-serum-50ml-10281142')));
console.log('extract unknown:',JSON.stringify(extract('https://www.randomshop.co.uk/thing')).slice(0,120));
console.log('extract shein(disabled):',extract('https://shein.co.uk/x').reason);
console.log('restricted hit:',restrictedHits('Bblonde Peroxide Developer 30 vol'));
`;
eval(js+test);
