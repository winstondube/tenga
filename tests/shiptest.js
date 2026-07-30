require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
const test=[
"console.log('ANY SHOP NOW WORKS:');",
"[['https://www.boots.com/no7-serum-50ml-10281142','known'],",
" ['https://www.zara.com/uk/en/ribbed-dress-p0123.html','unknown'],",
" ['https://shein.co.uk/thing-p-99','was disabled'],",
" ['https://www.marksandspencer.com/x-cashmere-jumper/p/clp60123','unknown'],",
" ['https://www.johnlewis.com/thing/p123','unknown']].forEach(function(c){",
"  var r=extract(c[0]);",
"  console.log('  '+(r.ok?'ACCEPTED':'REJECTED')+'  '+String(r.retailerName).padEnd(16)+(r.newShop?'new shop':'known   ')+'  '+String(r.name).slice(0,34)+'   ['+c[1]+']');",
"});",
"console.log('');",
"console.log('SHIPPING CYCLE (anchor '+S.settings.shipAnchor+', every '+S.settings.shipEveryDays+' days):');",
"shipSchedule(3).forEach(function(x,i){",
"  console.log('  flight '+(i+1)+': departs '+fmtDay(x.departs)+'  in '+x.daysAway+' days  | pay by '+fmtDay(x.cutoff)+(x.cutoffPassed?'  (CLOSED)':'  ('+x.cutoffDays+' days left)'));",
"});",
"var n=nextShipment();",
"console.log('  -> next joinable flight: '+fmtDay(n.departs)+', pay by '+fmtDay(n.cutoff));",
"console.log('');",
"console.log('HOME FAQ entries: '+HOME_FAQ().length);",
"console.log('Retailers shown as examples: '+S.retailers.length+' (none excluded)');"
].join("\n");
eval(js+test);
