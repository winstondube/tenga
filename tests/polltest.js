require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
const test=[
"[['Mystery Object 500','Boots'],['Baby Wipes 64 pack','Boots'],['Chelsea Boots Black','Next'],['Nike Air Force 1','ASOS']].forEach(function(c){",
"  var d=detectCategory(c[0],c[1]);",
"  console.log('  '+String(d.k).padEnd(10)+(d.confident?'confident':'ASKS USER')+'   \"'+c[0]+'\" from '+c[1]);",
"});"
].join("\n");
eval(js+test);
