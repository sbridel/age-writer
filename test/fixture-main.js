"use strict";var W=require("obsidian");var Ye={createGrammar:function(l){return{}}};var he=/```age[ \t]*\r?\n([\s\S]*?)```/g;var je={draw:!0,pull:6};var an={};var Ki=(e,o)=>{for(var t in o)Object.defineProperty(e,t,{get:o[t],enumerable:!0})},Ji=e=>{var r={};for(var k of Object.keys(e))Object.defineProperty(r,k,{get:()=>e[k],enumerable:!0});return r};
/* --- extraits fidèles du main.js minifié 1.3.0 (ancres) ; le reste est remplacé par des doublures --- */
var q=new Map,Fe=new Set,ci=(e,o)=>[e,o].sort().join("+");
function se(e){return e.replace(/^.*\//,"").replace(/\.md$/i,"")}
function ce(e){let o=[...e.matchAll(/```age[ \t]*\r?\n([\s\S]*?)```/g)].map(t=>t[1]);return o.length?o.join(`
`):null}
function Be(e){let o=new Set;for(let t of e.matchAll(he))for(let i of t[1].split(`
`)){let r=i.trim();r&&!r.startsWith("#")&&!/^(link|return|panel|seed)\s*:/i.test(r)&&o.add(r)}return o}
var L=(e,o,t)=>({id:e,weight:o,...t?{when:t}:{}}),Er=[{name:"ruins",pick:"each",options:[L("tablet",.06),L("lamp",.04)]},{name:"fauna",pick:"one",options:[L("moth",.1),L("hunter",.04),L(null,50)]}];
function Pi(e,o={}){let t=o.draw??je.draw,i=o.pull??je.pull,r=[],s=new Set,n=[],a=[],c,g,h;for(let M of e.split(`
`)){let T=M.trim();if(T===""||T.startsWith("#"))continue;let p=T.match(/^seed\s*:\s*(.*)$/i);if(p){p[1].trim()&&(h=p[1].trim());continue}r.push({raw:T,unknown:!0})}return{lines:r,triggered:[],costByAxis:{cosmological:r.filter(x=>x.unknown).length*.1},matter:{written:[],reactions:[]},links:a,drawn:[],seed:h}}
function $i(e){let{written:o,seed:t,pull:i}=e,r=new Set(o),s=[];for(let n of Er){let a=()=>.5,c=new Set(r),g=h=>1;if(n.pick==="one"){let u=x=>!0,l=n.options.map(x=>u(x)?x.weight*g(x.id):0);s.push({slot:n.name,l})}else for(let h of n.options){let u=a();if(r.has(h.id))continue;let l=h.weight*g(h.id);u<l&&(r.add(h.id),s.push({id:h.id,slot:n.name,chance:l}))}}return s}
var drawFixture=function(w){return $i({written:w,seed:"fixture"})}; // appelant du tirage, comme dans le vrai moteur (ancre « questions déjà répondues »)
var Q=[{id:"starfall",category:"phenomenon",label:"Starfall",axis:"cosmological",weight:.05,proseTag:"#starfall#"}],qt={stars:"single_sun",cycle:"steady_cycle"};var Vt=[],Kt=[],Qt=[],ii=[],si=[],li=[];var ot=[...Vt,...Kt,...Qt,...ii,...si,...li];var gt=[],$r=[];gt.push(...$r);var Si={lone_star:["a"]};
var Kr=e=>e>=75?"stable":e>=40?"unstable":"dying";
function oe(e,o){let t=Pi(e,o),i={};for(let[g,h]of Object.entries(t.costByAxis))h>0&&(i[g]=Math.max(0,Math.min(100,Math.round(100-h*100))));let a=Object.values(i),c=a.length?Math.min(...a):100;return{resolved:t,verdict:Kr(c),stability:c,axisStability:i,links:t.links,returnTo:t.returnTo}}
function Te(e,o=!1){let t=e.resolved,i=new Map;let s=[];for(let n of t.lines)n.entry&&s.push({id:n.entry.id});return s}
function fe(e,o,t,i,r="none"){let s=i/100,n=r==="none"?"":"x";return`<g transform="translate(${o},${t}) scale(${s})"></g>`}
function Ze(e){let o=Ye.createGrammar({});return"prose"}
var Re=class extends W.ItemView{constructor(t,i){super(t);this.plugin=i;this.mode="descriptive"}async render(){this.rendered=(this.rendered||0)+1}};
var Je=class extends W.PluginSettingTab{constructor(t,i){super(t,i);this.plugin=i}display(){this.containerEl.empty()}};
var Qe=class Qe extends W.Plugin{constructor(){super(...arguments);this.settings={}}async onload(){await this.loadSettings();this.registerView("v",t=>new Re(t,this))}async loadSettings(){this.settings=Object.assign({},await this.loadData())}async saveSettings(){await this.saveData(this.settings)}onunload(){}renderAgePanel(t,i,r){}mountGenerated(){}mountWindow(){}redrawEverything(){}};
var Xe=Qe;
Ki(an,{default:()=>Xe});module.exports=Ji(an);
