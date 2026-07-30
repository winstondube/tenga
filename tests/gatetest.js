require('./harness.js');
const js=require('fs').readFileSync('check.js','utf8');
const test=[
"S.session=null;",
"location.hash='#/admin'; render();",
"var h=getHTML();",
"console.log('signed out -> admin route shows lock :', h.indexOf('Operations is staff only')>=0);",
"console.log('signed out -> dashboard hidden       :', h.indexOf('Needs a person')<0);",
"console.log('signed out -> topbar shows Sign in   :', h.indexOf('data-act=\"signin\"')>=0);",
"console.log('signed out -> no role toggle         :', h.indexOf('data-act=\"role\"')<0);",
"S.session='admin'; render(); h=getHTML();",
"console.log('signed in  -> dashboard renders      :', h.indexOf('Open orders')>=0);",
"console.log('signed in  -> role toggle back       :', h.indexOf('data-act=\"role\"')>=0);",
"console.log('signed in  -> Sign out present       :', h.indexOf('data-act=\"signout\"')>=0);",
"S.signinOpen=true; location.hash='#/'; S.session=null; render(); h=getHTML();",
"console.log('modal opens with both choices        :', h.indexOf('Continue as a customer')>=0 && h.indexOf('Staff sign in')>=0);"
].join("\n");
eval(js+test);
