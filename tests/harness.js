global.localStorage={_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}};
let lastHTML='';
const fakeEl={innerHTML:'',dataset:{},value:'',checked:false,textContent:'',appendChild(){},remove(){},closest(){return null},querySelector(){return null}};
global.LISTENERS={input:[],change:[],click:[]};
global.document={addEventListener(t,fn){(LISTENERS[t]=LISTENERS[t]||[]).push(fn)},querySelector(s){return s==='#app'?{set innerHTML(v){lastHTML=v},get innerHTML(){return lastHTML}}:null},
 getElementById(){return null},querySelectorAll(){return []},createElement(){return Object.assign({},fakeEl)},body:{appendChild(){}}};
global.window={addEventListener(){},scrollY:0,scrollTo(){}};
global.location={hash:''};
global.confirm=()=>true; global.prompt=()=>'test';
global.getHTML=()=>lastHTML;
