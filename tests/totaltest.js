require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
const test=[
"function show(label,items){",
"  S.draft=null; var dr=draft(); dr.items=items.map(function(x){return newItem(x)});",
"  location.hash='#/request'; render();",
"  var h=getHTML();",
"  var q=quoteCalc({items:dr.items,quote:null});",
"  console.log(label);",
"  console.log('   product '+money(q.productTotal)+'  delivery '+money(q.deliveryTotal)+'  fee '+money(q.fee)+'  => PAY NOW '+money(q.total));",
"  console.log('   under-minimum note shown : '+(h.indexOf('under our')>=0));",
"  console.log('   meets-minimum tick shown : '+(h.indexOf('Meets the')>=0));",
"  console.log('   cargo estimate shown     : '+(h.indexOf('Zimbabwe shipping is separate')>=0));",
"  console.log('');",
"}",
"show('One Boots item at 25.00 (under the 40 minimum)',[{url:'https://www.boots.com/x-1',retailerId:'boots',retailerName:'Boots',name:'No7 Serum 50ml',displayedPrice:25,qty:1}]);",
"show('Two Boots items totalling 50.00 (free delivery over 25)',[{url:'https://www.boots.com/x-1',retailerId:'boots',retailerName:'Boots',name:'No7 Serum 50ml',displayedPrice:25,qty:2}]);",
"show('Boots 30 + Superdrug 15, two shops',[{url:'https://www.boots.com/x-1',retailerId:'boots',retailerName:'Boots',name:'No7 Serum',displayedPrice:30,qty:1},{url:'https://www.superdrug.com/x-2',retailerId:'superdrug',retailerName:'Superdrug',name:'Palmers Lotion',displayedPrice:15,qty:1}]);",
"S.draft=null; var dr=draft(); dr.items=[newItem({url:'https://www.boots.com/x',retailerId:'boots',retailerName:'Boots',name:'Thing',qty:1})];",
"location.hash='#/request'; render();",
"console.log('No prices entered -> prompt shown: '+(getHTML().indexOf('we will total it up for you')>=0));"
].join("\n");
eval(js+test);
