require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
// simulate a returning user whose saved settings predate the shipping cycle
const stale={v:1,settings:{procurementPct:20,procurementMin:10,minSpend:40,cargoRate:9.5,cargoMin:15,clearance:6,localDelivery:5},
 retailers:[],restricted:[],orders:[],audit:[],messages:[],batches:null,counter:1040,draft:null};
global.localStorage.setItem('tenga_uk_v1', JSON.stringify(stale));
const test=[
"console.log('shipAnchor after load :', S.settings.shipAnchor);",
"console.log('shipEveryDays         :', S.settings.shipEveryDays);",
"console.log('batches repaired      :', Array.isArray(S.batches));",
"console.log('restricted repaired   :', S.restricted.length+' keywords');",
"var n=nextShipment();",
"console.log('countdown             :', n.daysAway+' days');",
"console.log('departs               :', fmtDay(n.departs));",
"console.log('NaN or Invalid?       :', (isNaN(n.daysAway)||fmtDay(n.departs)==='Invalid Date')?'STILL BROKEN':'fixed');"
].join("\n");
eval(js+test);
