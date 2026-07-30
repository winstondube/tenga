require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
const test=[
"var rows=[];",
"for(var n=0;n<40;n++){ rows.push(choosePick(n).row) }",
"console.log('first two picks land on row:', rows[0], rows[1], '(0 = top row)');",
"var firstTwoAlwaysTop=true;",
"for(var t=0;t<300;t++){ if(choosePick(0).row!==0||choosePick(1).row!==0) firstTwoAlwaysTop=false }",
"console.log('300 trials, first two always top row:', firstTwoAlwaysTop);",
"var later={};",
"for(var t=0;t<600;t++){ var r=choosePick(2+Math.floor(Math.random()*10)).row; later[r]=(later[r]||0)+1 }",
"console.log('rows used after the first two:', JSON.stringify(later));",
"var idx={};",
"for(var t=0;t<400;t++){ var p=choosePick(0); idx[p.i]=1 }",
"console.log('distinct top-row items used by pick 1:', Object.keys(idx).length, 'of 10');",
"console.log('all indices within 0-29:', Object.keys(idx).every(function(k){return k>=0&&k<=29}));"
].join("\n");
eval(js+test);
