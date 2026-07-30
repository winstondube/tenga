require('./harness.js');
const js = require('fs').readFileSync('check.js','utf8');
const test = `
const cases=[
 ['Dior Jadore Intense Parfum 100ml','fragrance'],
 ['K by Dolce&Gabbana Eau de Parfum Intense 50ml','fragrance'],
 ['Sol de Janeiro Cheirosa 62 Body Mist','fragrance'],
 ['Brazilian Body Wave Bundle 22 Inch','hairpiece'],
 ['13x4 HD Lace Frontal Wig Straight','hairpiece'],
 ['NARS Radiant Creamy Concealer','makeup'],
 ['Fenty Beauty Pro Filtr Foundation 240','makeup'],
 ['Cantu Shea Butter Leave-In Conditioning Repair Cream','haircare'],
 ['CeraVe Moisturising Lotion 473ml','skincare'],
 ['The Ordinary Niacinamide 10% + Zinc 1%','skincare'],
 ['Palmers Cocoa Butter Formula 400ml','skincare'],
 ['Nike Air Force 1 White','footwear'],
 ['Adidas Samba OG Trainers','footwear'],
 ['Nike Tech Fleece Hoodie Black','clothing'],
 ['Zara Pleated Midi Skirt','clothing'],
 ['Random Unbranded Widget','other']
];
let pass=0;
cases.forEach(function(c){
 var d=detectCategory(c[0]);
 var ok=d.k===c[1];
 if(ok)pass++;
 console.log((ok?'  ok  ':'  XX  ')+String(d.k).padEnd(11)+(d.confident?'confident':'ASKS USER')+'   '+c[0]+(ok?'':'   expected '+c[1]));
});
console.log(pass+'/'+cases.length+' correct');
console.log('');
['fragrance','hairpiece','footwear','makeup'].forEach(function(k){
  console.log(k.padEnd(10)+' -> '+catFieldList(k).map(function(f){return f.label}).join(', '));
});
`;
eval(js + test);
