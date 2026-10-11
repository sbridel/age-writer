"use strict";
// L'emblème de l'auteur (dessiné ici, aucun asset) : un disque de laiton et d'émail rouge, quatre plumes en diagonale, un cercle central au glyphe,
// un anneau, quatre plumes à perle. Version simplifiée, aplats et reflets, pour s'accorder au reste du Relto.
const { rgba, mix } = require("./util");
/** Le glyphe central : les contours (en unités du rayon du cercle) tracés d'après le dessin de l'auteur ; le remplissage pair-impair laisse les jours. */
const GLYPH = [[[0.745,-0.511],[0.689,-0.574],[0.477,-0.574],[0.362,-0.528],[0.315,-0.481],[0.247,-0.383],[0.221,-0.315],[0.489,-0.328],[0.604,-0.345],[0.685,-0.409],[0.745,-0.494]],[[0.315,-0.396],[0.328,-0.421],[0.353,-0.434],[0.434,-0.421],[0.451,-0.387],[0.43,-0.37],[0.336,-0.366],[0.319,-0.374]],[[0.289,-0.855],[0.157,-0.889],[0.085,-0.894],[-0.038,-0.838],[-0.06,-0.851],[-0.072,-0.889],[-0.132,-0.894],[-0.251,-0.868],[-0.404,-0.809],[-0.464,-0.774],[-0.651,-0.54],[-0.757,-0.37],[-0.783,-0.306],[-0.621,-0.498],[-0.511,-0.609],[-0.421,-0.664],[-0.353,-0.677],[-0.336,-0.668],[-0.332,-0.651],[-0.506,-0.46],[-0.6,-0.323],[-0.609,-0.294],[-0.498,-0.409],[-0.366,-0.515],[-0.26,-0.574],[-0.238,-0.557],[-0.238,-0.506],[-0.264,-0.396],[-0.366,-0.162],[-0.477,0.043],[-0.37,0.009],[-0.332,0.021],[-0.315,0.051],[-0.613,0.651],[-0.587,0.685],[-0.557,0.698],[-0.532,0.728],[-0.477,0.732],[-0.315,0.698],[-0.064,0.604],[-0.047,0.609],[0.038,0.706],[0.106,0.74],[0.217,0.736],[0.251,0.723],[0.26,0.698],[0.311,0.702],[0.357,0.681],[0.481,0.583],[0.613,0.43],[0.74,0.234],[0.898,-0.06],[0.894,-0.089],[0.877,-0.081],[0.655,0.217],[0.489,0.383],[0.4,0.443],[0.336,0.46],[0.289,0.46],[0.26,0.451],[0.251,0.43],[0.43,0.289],[0.566,0.157],[0.719,-0.043],[0.779,-0.149],[0.779,-0.166],[0.583,0.047],[0.443,0.157],[0.23,0.277],[0.145,0.311],[0.115,0.302],[-0.043,-0.115],[-0.043,-0.14],[0.298,-0.834]],[[0.094,0.417],[0.128,0.404],[0.17,0.417],[0.217,0.485],[0.302,0.515],[0.319,0.536],[0.315,0.553],[0.294,0.562],[0.157,0.515],[0.098,0.455]],[[-0.2,0.238],[-0.153,0.345],[-0.157,0.37],[-0.183,0.383],[-0.281,0.383],[-0.289,0.362],[-0.23,0.243]],[[0.009,-0.638],[0.017,-0.626],[0.013,-0.604],[-0.162,-0.26],[-0.183,-0.247],[-0.255,-0.247],[-0.264,-0.268],[-0.191,-0.391],[-0.094,-0.621],[-0.068,-0.638]]];
const glyphPath = (ctx, k) => { ctx.beginPath(); for (const poly of GLYPH) { poly.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k))); ctx.closePath(); } };

/** Une plume, d'après le dessin de l'auteur (unités du rayon, quart haut-gauche) : l'arête intérieure, l'épaule qui balaie vers la pointe, la tige et sa perle. `sx`, `sy` : miroirs. */
const PEN_EDGES = [[[-0.318, -0.873], [-0.33, -0.74, -0.27, -0.69, -0.215, -0.63], [-0.205, -0.58, -0.235, -0.52, -0.246, -0.441]], [[-0.595, -0.719], [-0.5, -0.7, -0.45, -0.64, -0.448, -0.534], [-0.43, -0.51, -0.33, -0.495, -0.246, -0.441]]];
const PENS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
const edgesPath = (ctx, k, sx, sy) => { ctx.beginPath(); for (const [m, ...cs] of PEN_EDGES) { ctx.moveTo(m[0] * k * sx, m[1] * k * sy); for (const q of cs) ctx.bezierCurveTo(q[0] * k * sx, q[1] * k * sy, q[2] * k * sx, q[3] * k * sy, q[4] * k * sx, q[5] * k * sy); } };
const shaftPath = (ctx, k, sx, sy) => { ctx.beginPath(); ctx.moveTo(-0.462 * k * sx, -0.801 * k * sy); ctx.lineTo(-0.257 * k * sx, -0.452 * k * sy); };
const beadAt = (ctx, k, sx, sy, r) => { ctx.beginPath(); ctx.arc(-0.329 * k * sx, -0.579 * k * sy, r * k, 0, 6.283); };

/** Dessine l'emblème centré en (cx, cy), de rayon `R`. `c` : filtre de couleur (lumière ambiante), facultatif ; `t` : temps (un reflet qui glisse). */
function drawEmblem(ctx, cx, cy, R, c = (h) => h, t = 0) {
  const GOLD = c("#d8a448"), GOLD_L = c("#f2cf7a"), GOLD_D = c("#8a5e22"), RED = c("#7a1410"), RED_D = c("#3a0806");
  ctx.save(); ctx.translate(cx, cy); ctx.lineCap = "round"; ctx.lineJoin = "round";
  // fond d'émail
  ctx.fillStyle = RED_D; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  const eg = ctx.createRadialGradient(0, R * 0.2, R * 0.1, 0, 0, R * 0.95); eg.addColorStop(0, c("#a01e14")); eg.addColorStop(1, RED); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(0, 0, R * 0.93, 0, 6.283); ctx.fill();
  // les quatre plumes : épaule et arête en filet d'or, tige fine, grosse perle
  for (const [sx, sy] of PENS) {
    edgesPath(ctx, R, sx, sy); ctx.strokeStyle = GOLD; ctx.lineWidth = Math.max(0.8, R * 0.016); ctx.stroke();
    shaftPath(ctx, R, sx, sy); ctx.strokeStyle = GOLD_D; ctx.lineWidth = R * 0.03; ctx.stroke(); ctx.strokeStyle = GOLD_L; ctx.lineWidth = R * 0.016; ctx.stroke();
    beadAt(ctx, R, sx, sy, 0.036); ctx.fillStyle = GOLD; ctx.fill(); ctx.strokeStyle = GOLD_D; ctx.lineWidth = Math.max(0.6, R * 0.01); ctx.stroke(); beadAt(ctx, R, sx, sy, 0.014); ctx.fillStyle = RED_D; ctx.fill();
  }
  // le cercle central et son glyphe
  ctx.fillStyle = c("#4a0c08"); ctx.beginPath(); ctx.arc(0, 0, R * 0.485, 0, 6.283); ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = R * 0.035; ctx.stroke(); ctx.lineWidth = R * 0.012; ctx.beginPath(); ctx.arc(0, 0, R * 0.455, 0, 6.283); ctx.stroke();
  ctx.fillStyle = GOLD_L; glyphPath(ctx, R * 0.47); ctx.fill("evenodd"); ctx.strokeStyle = GOLD_D; ctx.lineWidth = Math.max(0.5, R * 0.01); ctx.stroke();
  // l'anneau extérieur, avec un reflet qui glisse
  const rg = ctx.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, GOLD_L); rg.addColorStop(0.5, GOLD); rg.addColorStop(1, GOLD_D); ctx.strokeStyle = rg; ctx.lineWidth = R * 0.075; ctx.beginPath(); ctx.arc(0, 0, R * 0.965, 0, 6.283); ctx.stroke();
  const sh = (t * 0.4) % 6.283; ctx.strokeStyle = rgba(255, 250, 220, 0.4); ctx.lineWidth = R * 0.025; ctx.beginPath(); ctx.arc(0, 0, R * 0.965, sh, sh + 0.5); ctx.stroke();
  ctx.restore();
}

/**
 * Le même emblème en sceau de cire : un disque aux bords ondulés, un bourrelet, et le dessin en relief (reflet en haut à gauche, ombre en bas à droite).
 * `wax` : la couleur de la cire (bordeaux par défaut).
 */
function drawSeal(ctx, cx, cy, R, c = (h) => h, t = 0, wax = "#7c1f2c") {
  const W0 = c(wax), W_L = c(mix(wax, "#ffd7d0", 0.28)), W_D = c(mix(wax, "#14040a", 0.55)), FIELD = c(mix(wax, "#2a0508", 0.35)), RED = c("#8a1a14"), ORANGE = c("#c2561c"), BROWN = c("#4a0c08");
  ctx.save(); ctx.translate(cx, cy); ctx.lineCap = "round"; ctx.lineJoin = "round";
  const raise = (draw, d = Math.max(0.8, R * 0.025), base = W0) => { // un élément en relief : ombre, reflet, puis la cire elle-même
    ctx.save(); ctx.translate(d, d); ctx.fillStyle = ctx.strokeStyle = W_D; draw(); ctx.restore();
    ctx.save(); ctx.translate(-d * 0.8, -d * 0.8); ctx.fillStyle = ctx.strokeStyle = W_L; draw(); ctx.restore();
    ctx.fillStyle = ctx.strokeStyle = base; draw();
  };
  // le disque de cire, bords ondulés, et son ombre sur le papier
  const edge = (r) => { ctx.beginPath(); for (let i = 0; i <= 72; i++) { const a = (i / 72) * 6.283, k = 1 + 0.012 * Math.sin(a * 2 + 0.6) + 0.007 * Math.sin(a * 5 + 1.9); const x = Math.cos(a) * r * k, y = Math.sin(a) * r * k; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); };
  ctx.fillStyle = "rgba(40,10,10,0.35)"; ctx.save(); ctx.translate(R * 0.06, R * 0.09); edge(R); ctx.fill(); ctx.restore();
  const wg = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 1.05); wg.addColorStop(0, W_L); wg.addColorStop(0.35, W0); wg.addColorStop(1, W_D); ctx.fillStyle = wg; edge(R); ctx.fill();
  ctx.lineWidth = R * 0.06; ctx.strokeStyle = W_D; ctx.save(); ctx.translate(R * 0.02, R * 0.02); edge(R * 0.955); ctx.stroke(); ctx.restore(); ctx.strokeStyle = W_L; ctx.save(); ctx.translate(-R * 0.02, -R * 0.02); edge(R * 0.955); ctx.stroke(); ctx.restore(); ctx.strokeStyle = W0; edge(R * 0.955); ctx.stroke(); // le bourrelet
  // le champ en creux, sombre en haut, ambré en bas
  ctx.fillStyle = FIELD; ctx.beginPath(); ctx.arc(0, 0, R * 0.85, 0, 6.283); ctx.fill();
  const pg = ctx.createLinearGradient(0, -R * 0.85, 0, R * 0.85); pg.addColorStop(0, BROWN); pg.addColorStop(0.38, c("#5a0e0a")); pg.addColorStop(0.5, RED); pg.addColorStop(0.7, c("#9a3a14")); pg.addColorStop(1, ORANGE); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, R * 0.85, 0, 6.283); ctx.fill();
  const gl = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 0.85); gl.addColorStop(0, "rgba(0,0,0,0)"); gl.addColorStop(1, "rgba(20,0,0,0.35)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, R * 0.85, 0, 6.283); ctx.fill();
  // les quatre plumes en relief : épaule et arête, tige, perle
  for (const [sx, sy] of PENS) {
    raise(() => { edgesPath(ctx, R, sx, sy); ctx.lineWidth = Math.max(0.9, R * 0.022); ctx.stroke(); });
    raise(() => { shaftPath(ctx, R, sx, sy); ctx.lineWidth = R * 0.026; ctx.stroke(); });
    raise(() => { beadAt(ctx, R, sx, sy, 0.036); ctx.fill(); }); ctx.fillStyle = FIELD; beadAt(ctx, R, sx, sy, 0.014); ctx.fill();
  }
  // le cercle central en relief, son champ plat, et le glyphe
  ctx.fillStyle = c(mix(wax, "#000000", 0.12)); ctx.beginPath(); ctx.arc(0, 0, R * 0.47, 0, 6.283); ctx.fill();
  raise(() => { ctx.lineWidth = R * 0.035; ctx.beginPath(); ctx.arc(0, 0, R * 0.485, 0, 6.283); ctx.stroke(); ctx.lineWidth = R * 0.014; ctx.beginPath(); ctx.arc(0, 0, R * 0.45, 0, 6.283); ctx.stroke(); }); // double anneau
  raise(() => { glyphPath(ctx, R * 0.47); ctx.fill("evenodd"); }, Math.max(0.6, R * 0.018));
  const sh = (t * 0.3) % 6.283; ctx.strokeStyle = "rgba(255,225,215,0.28)"; ctx.lineWidth = R * 0.03; ctx.beginPath(); ctx.arc(0, 0, R * 0.955, sh, sh + 0.45); ctx.stroke(); // un reflet de cire qui glisse
  ctx.restore();
}

module.exports = { drawEmblem, drawSeal };
