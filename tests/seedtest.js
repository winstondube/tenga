require('./harness.js');
const js = require('fs').readFileSync('check.js','utf8');
const test = `
// seeded orders must have migrated cleanly from the old flat fields
S.orders.forEach(function(o){
  o.items.forEach(function(it){
    var leftover=['size','colour','shade','scent','variant'].filter(function(k){return it[k]!==undefined});
    console.log(o.ref.padEnd(8)+catOf(it.category).label.padEnd(26)+'| '+(attrText(it)||'(no options)').padEnd(30)+'| '+it.name.slice(0,34)+(leftover.length?'  LEFTOVER:'+leftover:''));
  });
});
`;
eval(js + test);
