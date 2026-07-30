require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
const test=[
"function preCargo(q){return round2(q.productTotal+q.deliveryTotal+q.fee)}",
"var a=quoteCalc({items:[newItem({retailerId:'boots',retailerName:'Boots',confirmedPrice:40,qty:1})],quote:{deliveryOverrides:{boots:4}}});",
"var b=quoteCalc({items:[newItem({retailerId:'boots',retailerName:'Boots',confirmedPrice:100,qty:1})],quote:{deliveryOverrides:{boots:0}}});",
"console.log('spec example A, product side (expect 54): '+money(preCargo(a))+'   + shipping '+money(a.cargoEst)+' = '+money(a.total));",
"console.log('spec example B, product side (expect 120): '+money(preCargo(b))+'  + shipping '+money(b.cargoEst)+' = '+money(b.total));",
"console.log('');",
"console.log('weight estimates by product kind:');",
"[['fragrance','100ml'],['fragrance','50ml'],['skincare','473ml'],['makeup',''],['footwear',''],['hairpiece','22 inch'],['clothing','']].forEach(function(c){",
"  var it=newItem({name:'x',category:c[0],attrs:{size:c[1]}});",
"  console.log('   '+c[0].padEnd(11)+(c[1]||'no size').padEnd(9)+' -> '+estimateItemKg(it)+' kg');",
"});",
"console.log('');",
"var o=S.orders.find(function(x){return x.cargo&&x.cargo.actualWeight});",
"var q=quoteCalc(o), actual=cargoCalc(o).total, diff=round2(actual-q.cargoEst);",
"console.log('reconciliation on '+o.ref+':');",
"console.log('   quoted  '+money(q.cargoEst)+'  (est '+q.cargoKg+' kg)');",
"console.log('   actual  '+money(actual)+'  ('+cargoCalc(o).chargeable+' kg on the scales)');",
"console.log('   diff    '+(diff>0?'+':'')+money(diff)+'  tolerance '+money(S.settings.cargoTolerance));",
"console.log('   action  '+(Math.abs(diff)<=S.settings.cargoTolerance?'absorb, tell nobody':diff>0?'ask for '+money(diff):'refund '+money(-diff)));"
].join("\n");
eval(js+test);
