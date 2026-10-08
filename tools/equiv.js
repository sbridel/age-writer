// Non-régression : compare deux builds (main.js de référence, main.js à vérifier) sur 600 Âges tirés au hasard :
// mêmes entrées ⇒ mêmes analyses, glyphes, SVG et textes.   node tools/equiv.js <référence/main.js> [dist/main.js]
// --no-prose : ne compare pas les textes (quand on change exprès la génération de prose).
// (a servi à prouver que la dé-minification du moteur 1.3 n'a rien changé au comportement de la 1.6.3).
const Module=require("module"),fs=require("fs");
const {JSDOM}=require("jsdom");
const dom=new JSDOM("<body></body>",{pretendToBeVisual:true});global.window=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;
global.matchMedia=dom.window.matchMedia=()=>({matches:false,addEventListener(){}});
class P{constructor(a,m){this.app=a;this.manifest=m;return new Proxy(this,{get:(t,k)=>k in t?t[k]:(k==='loadData'?async()=>null:()=>{})})}}
const ob={Plugin:P,ItemView:class{constructor(){}},PluginSettingTab:class{},Setting:class{},Notice:class{},TFile:class{},MarkdownRenderChild:class{},FuzzySuggestModal:class{},MarkdownView:class{},stringifyYaml:()=>""};
let R=Math.random;Math.random=()=>R();function load(f){const m=new Module(f);m.paths=[];const o=Module.prototype.require;m.require=n=>n==="obsidian"?ob:o.call(m,n);m._compile(fs.readFileSync(f,"utf8"),f);return m.exports.default}
const app={vault:{on(){}},workspace:{on(){},onLayoutReady(){},getActiveFile(){return null}},metadataCache:{on(){}}};
function core(f){const C=load(f);let got=null;Object.defineProperty(C.prototype,"core",{configurable:true,set(v){got=v;throw new Error("STOP")}});const p=new C(app,{version:"x"});return p.onload().then(()=>got,()=>got)}
let seed=1;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const SYMS="single_sun twin_suns starless companion_moon steady_cycle erratic_cycle frozen_cycle stable_orbit shifting_orbit chaotic_orbit close_binary_orbit wide_binary_orbit auroras recurring_eclipses permanent_veil starfall water lava stone sand salt ash iron crystal strange_stone deep_cold pressure spore seed vine fern great_tree moth grazer burrower hunter drifter tablet lamp bridge door book wind rain fog lightning heat fissure cave_fissure submarine_fissure no_fissure frozen_world lava_world desert_world ocean_world jungle_world gold silver gems scorched_surface poisoned_air many\\ water few\\ lava trap\\ book mechanism:\\ water_valve damaged_pages=2 fx:\\ tv bogus_symbol".split(" ").map(s=>s.replace(/\\/g,"")).join(" ").replace(/many water/,"many water").split(" ");
(async()=>{const A=await core(require("path").resolve(process.argv.slice(2).filter(a=>!a.startsWith("--"))[0])),B=await core(require("path").resolve(process.argv.slice(2).filter(a=>!a.startsWith("--"))[1]||require("path").join(__dirname,"..","dist","main.js")));
let n=0,bad=0;

for(let i=0;i<600;i++){
 const lines=[];const k=Math.floor(rnd()*9);for(let j=0;j<k;j++)lines.push(SYMS[Math.floor(rnd()*SYMS.length)]);
 if(rnd()<.3)lines.push("link: [[X"+i%3+"]]");if(rnd()<.2)lines.push("return: [[Home]]");if(rnd()<.2)lines.push("seed: "+i);
 const src=lines.join("\n"),name="Age"+(i%17);
 const ra=A.analyse(src,{seed:name}),rb=B.analyse(src,{seed:name});
 const ja=JSON.stringify(ra),jb=JSON.stringify(rb);n++;
 if(ja!==jb){bad++;if(bad<4)console.log("DIFF analyse",JSON.stringify(src),"\n",ja.slice(0,300),"\n",jb.slice(0,300));continue}
 for(const [lab,fa,fb] of [["glyphs",()=>A.glyphs(ra,true),()=>B.glyphs(rb,true)],["svg",()=>A.glyphs(ra).map(g=>A.glyphSvg(g.id,0,0,64,g.severity)).join(""),()=>B.glyphs(rb).map(g=>B.glyphSvg(g.id,0,0,64,g.severity)).join("")],...(process.argv.includes("--no-prose")?[]:[["prose",()=>{let q=7;R=()=>{q=(q*1664525+1013904223)>>>0;return q/4294967296};const s=A.prose(ra.resolved);return s},()=>{let q=7;R=()=>{q=(q*1664525+1013904223)>>>0;return q/4294967296};const s=B.prose(rb.resolved);return s}]])]){
  const x=JSON.stringify(fa()),y=JSON.stringify(fb());if(x!==y){bad++;if(bad<6)console.log("DIFF",lab,JSON.stringify(src),x.slice(0,200),y.slice(0,200))}}
}
console.log(n+" cas comparés,",bad,"différence(s)");process.exit(bad?1:0);})();
