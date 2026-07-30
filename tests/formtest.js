require('./harness.js');
const js = require('fs').readFileSync('check.js','utf8');
const test = [
"var cases=[['Dior Jadore Intense Parfum 100ml'],['13x4 Lace Frontal Wig'],['Nike Air Force 1 White'],['Mystery Object 500']];",
"cases.forEach(function(c){",
"  S.draft=null;",
"  var dr=draft();",
"  dr.pending={url:'https://www.boots.com/x-123',retailerId:'boots',retailerName:'Boots',name:c[0],size:'100ml',price:63.99,live:'ok',via:'meta',availability:'In stock',ok:true,reason:''};",
"  location.hash='#/request'; render();",
"  var h=getHTML();",
"  var labels=(h.match(/<label class=\"f\">[^<]{1,30}/g)||[]).map(function(x){return x.replace('<label class=\"f\">','').trim()});",
"  console.log(c[0]);",
"  console.log('   detected  : '+detectCategory(c[0]).k+(detectCategory(c[0]).confident?'':'  (ASKS USER)'));",
"  console.log('   fields    : '+labels.slice(0,10).join(' | '));",
"  console.log('   warns?    : '+(h.indexOf('Please choose')>=0));",
"  console.log('');",
"});"
].join("\n");
eval(js + test);
