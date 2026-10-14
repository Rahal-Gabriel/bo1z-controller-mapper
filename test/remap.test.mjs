import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert';
const D=new URL('../extension/', import.meta.url).pathname;
const ctx={console,Math,JSON,Array,Set,Number,String};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['remap-core.js','capture.js']) vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx);
const core=ctx.BO1PadRemapCore,cap=ctx.BO1Capture;
const HAT=v=>-1+v*2/7, HREST=3.2857;
// controle cru igual ao do usuario: 14 botoes, 12 eixos, hat no 11, analogico dir com drift em A2
const restAx=[0,0,-0.3,0,0,0,1.0,0,0,0,0,HREST];
function pad(ax={},bt={}){const axes=restAx.slice();for(const k in ax)axes[k]=ax[k];
 const buttons=Array.from({length:14},(_,i)=>({pressed:!!bt[i],value:bt[i]?1:0}));
 return {id:'NSW wired controller (Vendor: 20d6 Product: a713)',index:0,connected:true,mapping:'',timestamp:1,axes,buttons};}
const rest=cap.averageRest([cap.snapshot(pad()),cap.snapshot(pad())]);
// fisico: LS x=A0,y=A1 ; RS x=A2 (drift),y=A5 ; botoes Switch: Y0 B1 A2 X3 L4 R5 ZL6 ZR7 -8 +9 LS10 RS11 Home12 Cap13 ; dpad hat A11
const inputs=[ [{0:1}],[{1:1}],[{2:1}],[{5:1}],
 [{},{1:1}],[{},{2:1}],[{},{0:1}],[{},{3:1}],[{},{4:1}],[{},{5:1}],[{},{6:1}],[{},{7:1}],[{},{8:1}],[{},{9:1}],[{},{10:1}],[{},{11:1}],
 [{11:HAT(0)}],[{11:HAT(4)}],[{11:HAT(6)}],[{11:HAT(2)}],[{},{12:1}]];
const STEPS=[0,1,2,3].map(t=>({kind:'axis',target:t})).concat([...Array(17).keys()].map(t=>({kind:'button',target:t})));
const results=[];
STEPS.forEach((s,k)=>{const used={keys:new Set(),stickAxes:new Set()};
 for(let j=0;j<k;j++){const r=results[j];if(!r)continue;if(STEPS[j].kind==='axis')used.stickAxes.add(r.i);else used.keys.add(cap.keyOf(r));}
 // ruido: ao apertar botao, analogico esq levemente mexido
 const [ax,bt]=inputs[k];const src=cap.detect(cap.snapshot(pad({...ax},bt)),rest,s,used);
 assert(src,'sem captura no passo '+k);results[k]=src;
 assert(!cap.detect(cap.snapshot(pad()),rest,s,used)); assert(cap.released(cap.snapshot(pad()),rest));
});
const map={padId:pad().id,buttons:{},axes:{}};STEPS.forEach((s,k)=>(s.kind==='axis'?map.axes:map.buttons)[s.target]=results[k]);
cap.finalizeHat(map.buttons);
console.log(JSON.stringify(map.buttons[12]),JSON.stringify(map.axes[2]));
const v=(ax,bt)=>core.virtualPad(pad(ax,bt),map);
assert.equal(v().mapping,'standard');assert.equal(v().buttons.length,17);assert.equal(v().axes.length,4);
assert(v().buttons.every(b=>!b.pressed),'nada apertado em repouso');
assert(v().axes.every(a=>Math.abs(a)<1e-9),'eixos centrados (drift corrigido)');
assert(v({},{1:1}).buttons[0].pressed); assert(v({},{2:1}).buttons[1].pressed); assert(v({},{7:1}).buttons[7].pressed);
assert.equal(v({2:1}).axes[2],1); assert.equal(v({2:-1}).axes[2],-1); assert.equal(v({1:-1}).axes[1],-1);
// diagonal cima-direita aciona cima e direita
const d=v({11:HAT(1)}).buttons; assert(d[12].pressed&&d[15].pressed&&!d[13].pressed&&!d[14].pressed);
assert(v({11:HAT(4)}).buttons[13].pressed);
// matches por vendor/product mesmo com id diferente
assert(core.matches({id:'xyz (Vendor: 20d6 Product: a713) outro'},map));
// remap.js: patch do getGamepads
const raw=pad({},{1:1});
const n={};function Navigator(){} Navigator.prototype.getGamepads=function(){return [raw,null];};
const win={Navigator,document:{documentElement:{getAttribute:()=>JSON.stringify(map)}},console,JSON,Array};
win.globalThis=win;win.window=win;win.BO1PadRemapCore=core;vm.createContext(win);
vm.runInContext(fs.readFileSync(D+'remap.js','utf8'),win);
const out=vm.runInContext('new Navigator().getGamepads()',win);
assert.equal(out[0].mapping,'standard');assert(out[0].buttons[0].pressed);assert.equal(out[1],null);
console.log('OK - todos os testes passaram');
