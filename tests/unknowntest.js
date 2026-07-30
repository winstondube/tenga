require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
const test=[
"function show(label,items){",
"  var its=items.map(function(x){return newItem(x)});",
"  var q=quoteCalc({items:its,quote:null});",
"  console.log(label);",
"  console.log('   deliveryUnknown : '+q.deliveryUnknown);",
"  console.log('   shown as        : '+(q.deliveryUnknown?'we confirm':money(q.deliveryTotal)));",
"  console.log('   total shown as  : '+(q.deliveryUnknown?'from ':'')+money(q.total));",
"  console.log('');",
"}",
"show('Known shop (Boots)',[{url:'https://www.boots.com/x-serum-50ml-1234567',retailerId:'boots',retailerName:'Boots',displayedPrice:32,qty:1}]);",
"show('Unknown shop (harrods.com)',[{url:'https://www.harrods.com/en-gb/shopping/guerlain-vanille-planifolia-50ml-p123',retailerId:null,retailerName:'harrods.com',displayedPrice:340,qty:1}]);",
"show('Mixed: Boots + harrods',[{url:'https://www.boots.com/x-serum-50ml-1234567',retailerId:'boots',retailerName:'Boots',displayedPrice:32,qty:1},{url:'https://www.harrods.com/y-p1',retailerId:null,retailerName:'harrods.com',displayedPrice:340,qty:1}]);",
"var o={items:[newItem({url:'https://www.harrods.com/y-p1',retailerId:null,retailerName:'harrods.com',displayedPrice:340,qty:1})],quote:{deliveryOverrides:{}}};",
"o.quote.deliveryOverrides['other:harrods.com']=12.5;",
"var q2=quoteCalc(o);",
"console.log('After admin sets delivery to 12.50: unknown='+q2.deliveryUnknown+'  delivery='+money(q2.deliveryTotal));"
].join("\n");
eval(js+test);
