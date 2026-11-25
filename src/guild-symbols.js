"use strict";
/**
 * Les symboles des cinq guildes, dessinés par l'auteur (croquis du 25 nov. 2026, mis au propre ; voir claude/DESIGN-symboles-des-guildes.md).
 * Chacun tient dans un cercle de rayon 1. `draw(ctx, guild, x, y, R, col, w, hole)` : `col` le trait, `w` son épaisseur (en unités du cercle),
 * `hole` la couleur du vide (le fond). Les caractères des adversaires d'Ahyoheek portent chacun une guilde (`OF`).
 */
const TAU = Math.PI * 2;
const OF = { faithful: "archivistes", mimic: "ecrivains", sly: "messagers", collector: "cartographes", wary: "mainteneurs" };
const GUILDS = ["archivistes", "ecrivains", "messagers", "cartographes", "mainteneurs"];
/* la couleur de chaque guilde (la robe, la bannière) et celle de son fil (le galon, la broderie) */
const COL = { archivistes: [190, 140, 52], ecrivains: [34, 30, 34], messagers: [238, 206, 70], cartographes: [64, 196, 200], mainteneurs: [122, 30, 46] };
const THREAD = { archivistes: "#ffde8c", ecrivains: "#c23a48", messagers: "#5a3a10", cartographes: "#ffde8c", mainteneurs: "#ffde8c" };
let ctx = null;
const L = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); };
const M = (f) => { for (const d of [-1, 1]) f(d); };
const SYM={
 mainteneurs(ink,hole){ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(0,-0.56,0.2,0,TAU);ctx.stroke();
  M(d=>{ctx.beginPath();ctx.moveTo(0,-0.14);ctx.lineTo(d*0.6,-0.46);ctx.lineTo(d*0.6,0.5);ctx.quadraticCurveTo(d*0.26,0.6,0,0.985);ctx.stroke();});L([[0,-0.14],[0,0.985]]);ctx.stroke();},
 /* les messagers : un oiseau aux ailes de plumes, au-dessus d'un livre ouvert où l'on a glissé une lettre */
 messagers(ink,hole){ctx.beginPath();ctx.arc(0,0,1,Math.PI*0.84,Math.PI*1.1);ctx.stroke();ctx.beginPath();ctx.arc(0,0,1,-Math.PI*0.1,Math.PI*0.16);ctx.stroke(); /* le cercle, en deux arcs derrière les ailes */
  ctx.beginPath();ctx.moveTo(-0.44,-0.5);ctx.bezierCurveTo(-0.3,-0.74,0.3,-0.74,0.44,-0.5);ctx.quadraticCurveTo(0.16,-0.3,0,0.02);ctx.quadraticCurveTo(-0.16,-0.3,-0.44,-0.5);ctx.closePath();ctx.stroke(); /* le corps de l'oiseau */
  M(d=>{const rx=d*0.32,ry=-0.2;[[-1.3,0.86],[-1.0,0.8],[-0.72,0.7],[-0.46,0.58]].forEach(([ang,len])=>{const a=d>0?ang:Math.PI-ang,ex=rx+Math.cos(a)*len,ey=ry+Math.sin(a)*len,nx=-Math.sin(a)*0.11,ny=Math.cos(a)*0.11,mx=(rx+ex)/2,my=(ry+ey)/2;
    ctx.beginPath();ctx.moveTo(rx,ry);ctx.quadraticCurveTo(mx+nx,my+ny,ex,ey);ctx.quadraticCurveTo(mx-nx,my-ny,rx,ry);ctx.closePath();ctx.stroke();});}); /* les ailes : quatre plumes chacune, en éventail */
  M(d=>{L([[d*0.05,0.12],[d*0.5,0.0],[d*0.94,0.5],[d*0.05,0.6]]);ctx.closePath();ctx.stroke(); /* la page */
   for(const k of [0.1,0.2]){ctx.beginPath();ctx.moveTo(d*0.88,0.5+k);ctx.quadraticCurveTo(d*0.46,0.66+k,d*0.05,0.6+k);ctx.stroke();}}); /* les pages dessous */
  L([[0,0.12],[0,0.82]]);ctx.stroke();
  ctx.save();ctx.translate(0.47,0.27);ctx.rotate(-0.2);ctx.strokeRect(-0.15,-0.1,0.3,0.2);L([[-0.15,-0.1],[0,0.02],[0.15,-0.1]]);ctx.stroke();ctx.restore();}, /* la lettre, sur la page droite */
 /* les cartographes : un soleil de seize rayons ; dedans, un compas ouvert (sa charnière, ses deux branches, la traverse), un point au centre, des traits de visée */
 cartographes(ink,hole){ctx.beginPath();ctx.arc(0,0,0.6,0,TAU);ctx.stroke();
  for(let k=0;k<16;k++){const a=-Math.PI/2+k*TAU/16,long=k%2===0,r1=long?1.02:0.88,w=0.09;ctx.beginPath();ctx.moveTo(Math.cos(a-w)*0.66,Math.sin(a-w)*0.66);ctx.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a+w)*0.66,Math.sin(a+w)*0.66);ctx.closePath();ctx.stroke();} /* les rayons, longs et courts */
  for(const a of [-Math.PI*0.75,-Math.PI*0.25,Math.PI,0]){ctx.beginPath();ctx.moveTo(Math.cos(a)*0.38,Math.sin(a)*0.38);ctx.lineTo(Math.cos(a)*0.54,Math.sin(a)*0.54);ctx.stroke();} /* les traits de visée */
  ctx.beginPath();ctx.arc(0,-0.42,0.07,0,TAU);ctx.stroke(); /* la charnière */
  M(d=>{L([[d*0.05,-0.36],[d*0.3,0.38],[d*0.24,0.46]]);ctx.stroke();}); /* les branches et leurs pointes */
  L([[-0.24,0.22],[0.24,0.22]]);ctx.stroke(); /* la traverse */
  ctx.beginPath();ctx.arc(0,0.02,0.06,0,TAU);ctx.stroke();},
 /* les écrivains (second croquis de l'auteur) : un cercle ouvert en bas, d'où sort la pointe d'une plume ; le bec épouse le haut du cercle,
  * ses flancs descendent, puis se resserrent en un col jusqu'à la pointe ; l'arête, l'œil, la fente */
 ecrivains(ink,hole){const cy=-0.04,R=0.94,ang=(x,y)=>Math.atan2(y-cy,x);
  ctx.beginPath();ctx.arc(0,cy,R,0,TAU);ctx.stroke(); /* le cercle, complet ; la pointe de la plume le traverse */
  M(d=>{const a0=ang(d*0.6,-0.72);ctx.beginPath();ctx.moveTo(Math.cos(a0)*R,cy+Math.sin(a0)*R);ctx.quadraticCurveTo(d*0.5,-0.2,d*0.54,0.26);ctx.quadraticCurveTo(d*0.32,0.34,d*0.2,0.56);ctx.lineTo(d*0.05,1.04);ctx.stroke();}); /* les flancs, le col, qui finissent en deux pointes */
  M(d=>{L([[d*0.05,-0.97],[d*0.05,0.06]]);ctx.stroke();L([[d*0.05,0.27],[d*0.05,1.03]]);ctx.stroke();}); /* l'arête, la fente */
  ctx.beginPath();ctx.arc(0,0.165,0.11,0,TAU);ctx.stroke();}, /* l'œil */
 /* les archivistes (« Book ») : deux cercles ; dedans, une enclume (une barre aux bouts évasés), un corps à fenêtre, deux ailes, une pointe */
 archivistes(ink,hole){for(const r of [1,0.88]){ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(-0.5,-0.62);ctx.lineTo(0.5,-0.62);ctx.quadraticCurveTo(0.46,-0.5,0.36,-0.48);ctx.lineTo(0.12,-0.46);ctx.lineTo(0.1,-0.34);ctx.lineTo(-0.1,-0.34);ctx.lineTo(-0.12,-0.46);ctx.lineTo(-0.36,-0.48);ctx.quadraticCurveTo(-0.46,-0.5,-0.5,-0.62);ctx.closePath();ctx.stroke(); /* l'enclume */
  ctx.strokeRect(-0.28,-0.3,0.56,0.82); ctx.strokeRect(-0.16,-0.06,0.32,0.18); /* le corps, sa fenêtre */
  M(d=>{L([[d*0.28,-0.28],[d*0.66,0.16],[d*0.42,0.46],[d*0.28,0.46]]);ctx.stroke();}); /* les ailes */
  L([[-0.06,0.52],[0,0.68],[0.06,0.52]]);ctx.stroke();}, /* la pointe */
};

function draw(c2, guild, x, y, R, col, w = 0.07, hole = "rgba(0,0,0,0)") {
  if (!SYM[guild]) return; ctx = c2; ctx.save(); ctx.translate(x, y); ctx.scale(R, R); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
  SYM[guild](col, hole); ctx.restore(); ctx = null;
}
module.exports = { draw, OF, GUILDS, COL, THREAD };
