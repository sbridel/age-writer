"use strict";
/*
 * Ahyoheek, la table de jeu (le modèle : src/ahyoheek.js). Dans la serre (l'accord) : une petite table de pierre à cinq branches, sur l'allée.
 * Sur le bureau (le commandement) : la même, en réduction, posée à gauche. De près (vue « ahyoheek ») : la table vue d'en haut, de biais ;
 * une place à chaque branche, un chiffre D'ni gravé au bord ; à chaque place un projecteur, et le signe joué y monte en hologramme
 * (rouge la plume, bleu le scarabée, vert le Livre de liaison) ; au centre, une vasque de lumière d'où monte l'anneau des trois signes,
 * le glyphe du jeu en son cœur (en lettres D'ni, si une police D'ni est là ; sinon l'anneau seul). Nos trois projecteurs, devant nous.
 */
const { rgba } = require("./util");
const AH = require("./ahyoheek");
const W = 640, H = 360, TAU = Math.PI * 2;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const q = (k) => { let h = 2166136261; for (const ch of String(k)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
/** Le glyphe du centre : les lettres d'« ahyoheek » posées l'une sur l'autre (lettre@x,y,taille,rotation ; x, y en points pour une taille 30). */
const GLYPH = "E@8,14.7,0.92 o@-6.3,13.1,0.93,-13 a@-2.5,-2.6,0.92,10 h@-4.8,5.7,0.93,-20 y@-8.9,16.4,0.76,-2", GLYPH_SIZE = 50;

/* les chiffres D'ni, le tracé simple du plugin (src/dni.js, simplePaths : repère 0..100, cadre 4..96) */
const P = (u, v) => [4 + 92 * u, 4 + 92 * v];
const UNITS = [null, (c) => { c.moveTo(...P(0.5, 0)); c.lineTo(...P(0.5, 1)); }, (c) => { c.moveTo(...P(0, 0.1)); c.bezierCurveTo(...P(0.46, 0.26), ...P(0.46, 0.74), ...P(0, 0.9)); }, (c) => { c.moveTo(...P(0.5, 0)); c.lineTo(...P(0, 0.5)); c.lineTo(...P(0.5, 1)); }, (c) => { c.moveTo(...P(0.52, 1)); c.lineTo(52.8, 31.6); c.lineTo(96, 31.6); }];
const FIVES = [null, (c) => { c.moveTo(4, 50); c.lineTo(96, 50); }, (c) => { c.moveTo(...P(0, 1)); c.bezierCurveTo(...P(0.1, 0.6), ...P(0.9, 0.6), ...P(1, 1)); }, (c) => { c.moveTo(...P(0, 0.46)); c.lineTo(...P(0.5, 1)); c.lineTo(...P(1, 0.46)); }, (c) => { c.moveTo(30.7, 4); c.lineTo(30.7, 50); c.lineTo(96, 50); }];
function numeral(ctx, v, x, y, size, col, neg) {
  v = Math.max(0, Math.min(24, Math.abs(v | 0)));
  ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 100, size / 100);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 8; ctx.lineCap = "square"; ctx.lineJoin = "miter";
  ctx.beginPath(); ctx.rect(4, 4, 92, 92); if (FIVES[Math.floor(v / 5)]) FIVES[Math.floor(v / 5)](ctx); if (UNITS[v % 5]) UNITS[v % 5](ctx); ctx.stroke();
  if (v === 0) ctx.fillRect(43, 43, 14, 14);
  ctx.restore();
  if (neg) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, size * 0.09); ctx.beginPath(); ctx.moveTo(x - size * 0.95, y); ctx.lineTo(x - size * 0.65, y); ctx.stroke(); } /* moins : un trait devant le cadre */
}
/** La plume (un bec de plume) et le Livre de liaison (ouvert, la page de gauche nue, le panneau à droite), en trait ; frame : dans un cadre carré. */
function sign(ctx, kind, x, y, s, col, frame) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = Math.max(1.2, s * 0.11);
  if (frame) { ctx.save(); ctx.lineCap = "square"; ctx.lineJoin = "miter"; ctx.strokeRect(-s, -s, s * 2, s * 2); ctx.restore(); }
  const k = s * 0.72; ctx.beginPath();
  if (kind === "pen") { ctx.moveTo(0, k); ctx.bezierCurveTo(-k * 0.15, k * 0.5, -k * 0.62, k * 0.05, -k * 0.55, -k * 0.55); ctx.lineTo(-k * 0.42, -k * 0.95); ctx.lineTo(k * 0.42, -k * 0.95); ctx.lineTo(k * 0.55, -k * 0.55); ctx.bezierCurveTo(k * 0.62, k * 0.05, k * 0.15, k * 0.5, 0, k); ctx.moveTo(0, k); ctx.lineTo(0, -k * 0.05); ctx.moveTo(k * 0.12, -k * 0.2); ctx.arc(0, -k * 0.2, k * 0.12, 0, TAU); ctx.moveTo(-k * 0.42, -k * 0.62); ctx.lineTo(k * 0.42, -k * 0.62); }
  else if (kind === "page") { ctx.moveTo(-k * 1.02, -k * 0.62); ctx.lineTo(-k * 1.02, k * 0.7); ctx.quadraticCurveTo(-k * 0.5, k * 0.55, 0, k * 0.78); ctx.quadraticCurveTo(k * 0.5, k * 0.55, k * 1.02, k * 0.7); ctx.lineTo(k * 1.02, -k * 0.62); ctx.moveTo(0, -k * 0.5); ctx.quadraticCurveTo(-k * 0.45, -k * 0.72, -k * 0.92, -k * 0.6); ctx.lineTo(-k * 0.92, k * 0.58); ctx.quadraticCurveTo(-k * 0.45, k * 0.45, 0, k * 0.66); ctx.quadraticCurveTo(k * 0.45, k * 0.45, k * 0.92, k * 0.58); ctx.lineTo(k * 0.92, -k * 0.6); ctx.quadraticCurveTo(k * 0.45, -k * 0.72, 0, -k * 0.5); ctx.lineTo(0, k * 0.66); ctx.rect(k * 0.24, -k * 0.38, k * 0.5, k * 0.44); }
  ctx.stroke(); ctx.restore();
}
/** Le scarabée de la serre (src/relto-scarabs.js), en contour lumineux de la couleur c (mis en cache par taille et couleur), tête en haut. */
const BCACHE = new Map();
function beetleImg(s, c) {
  const key = Math.round(s) + "|" + c.join(","); if (BCACHE.has(key)) return BCACHE.get(key);
  const n = Math.ceil(s * 3.2), cv = document.createElement("canvas"); cv.width = cv.height = n; const g = cv.getContext("2d");
  const mask = document.createElement("canvas"); mask.width = mask.height = n; const m = mask.getContext("2d"); require("./relto-scarabs").beetle(m, n / 2, n / 2, s, -Math.PI / 2, 0, { air: true });
  m.globalCompositeOperation = "source-in"; m.fillStyle = "#fff"; m.fillRect(0, 0, n, n); /* la silhouette pleine */
  const w = Math.max(1.2, s * 0.09); g.fillStyle = rgba(c[0], c[1], c[2], 1);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.drawImage(mask, Math.cos(a) * w, Math.sin(a) * w); } /* la silhouette, élargie d'un trait */
  g.globalCompositeOperation = "source-in"; g.fillRect(0, 0, n, n); g.globalCompositeOperation = "destination-out"; g.drawImage(mask, 0, 0); /* moins la silhouette : il reste le contour */
  g.globalCompositeOperation = "source-over"; g.strokeStyle = rgba(c[0], c[1], c[2], 1); g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(n / 2, n / 2 - s * 0.12); g.lineTo(n / 2, n / 2 + s * 0.95); g.stroke(); /* la jointure des élytres */
  g.beginPath(); g.moveTo(n / 2 - s * 0.55, n / 2 - s * 0.12); g.quadraticCurveTo(n / 2, n / 2 - s * 0.28, n / 2 + s * 0.55, n / 2 - s * 0.12); g.stroke(); /* le bord du corselet */
  if (BCACHE.size > 40) BCACHE.clear(); BCACHE.set(key, cv); return cv;
}
function beetleAt(ctx, x, y, s, c, alpha, lighter) { const im = beetleImg(s, c); ctx.save(); ctx.globalAlpha = alpha; if (lighter) ctx.globalCompositeOperation = "lighter"; ctx.drawImage(im, x - im.width / 2, y - im.height / 2); ctx.restore(); }
/** Un signe, quel qu'il soit : le scarabée en contour, les deux autres en trait. */
function anySign(ctx, kind, x, y, s, c, alpha, lighter) { if (kind === "beetle") beetleAt(ctx, x, y, s * 0.9, c, alpha, lighter); else sign(ctx, kind, x, y, s, rgba(c[0], c[1], c[2], alpha), false); }

/* les hologrammes : rouge la plume, bleu le scarabée, vert le Livre de liaison */
const HC = { pen: [255, 84, 70], beetle: [80, 150, 255], page: [80, 235, 135] };
const up = (c, d) => c.map((v) => Math.min(255, v + d));
/** Un projecteur rond, encastré dans la pierre ; lit : il projette. */
function emitter(ctx, x, y, r, col, lit) {
  ctx.fillStyle = "#1a140e"; ctx.beginPath(); ctx.ellipse(x, y, r * 1.2, r * 0.48, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#a9773a"; ctx.lineWidth = 1.6; ctx.stroke();
  const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, col ? rgba(col[0], col[1], col[2], lit ? 0.9 : 0.35) : "#2a2018"); g.addColorStop(1, col ? rgba(col[0], col[1], col[2], 0) : "#1a140e");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, TAU); ctx.fill();
}
/** Les hologrammes vacillent, et de temps en temps « glitchent » : un instant (un cinquième de seconde, toutes les quatre ou cinq secondes,
 *  jamais tous ensemble), la figure se découpe en bandes qui glissent de côté et sa lumière hoquette. Renvoie { on, a } : glitch en cours, et la lumière (0 à 1). */
function glitchOf(t, seed) {
  if (!t) return { on: false, a: 1 }; /* mouvement réduit : rien ne bouge */
  const ph = (t * (0.21 + (seed % 5) * 0.013) + seed * 0.37) % 1, on = ph < 0.045, tick = Math.floor(t * 30);
  const wob = 0.9 + 0.1 * Math.sin(t * 2.3 + seed * 1.7); /* le vacillement lent */
  return { on, tick, a: on ? wob * (0.35 + 0.65 * q("gl" + seed + "_" + tick)) : wob };
}
/** Dessine `paint` (une figure centrée en x, cy, de demi-taille s) avec son glitch : en bandes décalées s'il est en cours. */
function glitchy(ctx, x, cy, s, gl, seed, paint) {
  if (!gl.on) { paint(0); return; }
  const band = s * 0.28; for (let y0 = cy - s * 1.3, b = 0; y0 < cy + s * 1.3; y0 += band, b++) { const dx = (q("gx" + seed + "_" + gl.tick + "_" + b) - 0.5) * s * 0.5;
    ctx.save(); ctx.beginPath(); ctx.rect(x - s * 2, y0, s * 4, band + 0.5); ctx.clip(); paint(dx); ctx.restore(); }
}
/** L'hologramme d'un signe, debout au-dessus de son projecteur : le cône de lumière, la figure, les lignes de balayage. a : 0 à 1. */
function holo(ctx, kind, x, y, s, a, t, seed) {
  const c = HC[kind], gl = glitchOf(t, seed), fl = (0.85 + 0.15 * Math.sin(t * 23 + seed * 7) * Math.sin(t * 7.3 + seed)) * gl.a, A = a * fl, cy = y - s * 1.55;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const cone = ctx.createLinearGradient(0, y, 0, cy - s); cone.addColorStop(0, rgba(c[0], c[1], c[2], 0.32 * A)); cone.addColorStop(1, rgba(c[0], c[1], c[2], 0));
  ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(x - s * 0.35, y); ctx.lineTo(x - s * 1.25, cy - s); ctx.lineTo(x + s * 1.25, cy - s); ctx.lineTo(x + s * 0.35, y); ctx.closePath(); ctx.fill();
  const halo = ctx.createRadialGradient(x, cy, s * 0.2, x, cy, s * 1.6); halo.addColorStop(0, rgba(c[0], c[1], c[2], 0.28 * A)); halo.addColorStop(1, rgba(c[0], c[1], c[2], 0)); ctx.fillStyle = halo; ctx.fillRect(x - s * 1.6, cy - s * 1.6, s * 3.2, s * 3.2);
  ctx.shadowColor = rgba(c[0], c[1], c[2], A); ctx.shadowBlur = kind === "beetle" ? 0 : s * 0.5;
  glitchy(ctx, x, cy, s, gl, seed, (dx) => anySign(ctx, kind, x + dx, cy, s, kind === "beetle" ? c : up(c, 70), kind === "beetle" ? 0.9 * A : 0.95 * A, true));
  ctx.shadowBlur = 0; ctx.strokeStyle = rgba(c[0], c[1], c[2], 0.18 * A); ctx.lineWidth = 1;
  const off = (t * 18 + seed * 5) % 3; for (let yy = cy - s * 1.1 + off; yy < cy + s * 1.1; yy += 3) { ctx.beginPath(); ctx.moveTo(x - s * 1.05, yy); ctx.lineTo(x + s * 1.05, yy); ctx.stroke(); } /* le balayage */
  ctx.restore();
}
/** La place qui gagne la manche : une flaque de lumière d'or sous elle, et deux anneaux d'or qui battent autour du projecteur. */
function winMark(ctx, x, y, r, t) {
  const p = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.4); g.addColorStop(0, rgba(255, 200, 110, 0.5)); g.addColorStop(1, rgba(255, 170, 80, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 3.4, r * 1.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(255, 210, 130, 0.85); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r * 1.55, r * 0.66, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(255, 210, 130, 0.5 * (1 - p)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r * (1.6 + p * 0.9), r * (0.68 + p * 0.38), 0, 0, TAU); ctx.stroke(); /* l'onde qui s'éloigne */
  ctx.restore();
}
/** Les jetons gagnés, devant une place : trois colonnes (scarabée, plume, livre), un petit disque de lumière par manche gagnée avec ce signe ;
 *  trois d'un même signe : la colonne s'aligne et s'illumine d'or. dir : vers où la pile monte (−1 vers le haut, +1 vers le bas). */
function tokens(h, x, y, won, t, dir = -1, s = 4.4) {
  AH.SIGNS.forEach((k, i) => { const n = Math.min(4, won[k] || 0), c = HC[k], full = (won[k] || 0) >= 3, cx = x + (i - 1) * s * 3.1;
    if (full) { const g = h.createLinearGradient(0, y, 0, y + dir * s * 7); g.addColorStop(0, rgba(255, 210, 120, 0.4)); g.addColorStop(1, rgba(255, 210, 120, 0)); h.fillStyle = g; h.fillRect(cx - s * 1.6, Math.min(y, y + dir * s * 7) - s, s * 3.2, s * 9); }
    for (let j = 0; j < n; j++) { const cy = y + dir * j * s * 2.05, f = 0.85 + 0.15 * Math.sin(t * 2.3 + i * 2 + j);
      h.fillStyle = rgba(c[0], c[1], c[2], 0.22 * f); h.beginPath(); h.ellipse(cx, cy, s * 1.25, s * 0.95, 0, 0, TAU); h.fill(); /* le disque */
      h.strokeStyle = full ? rgba(255, 215, 130, 0.9 * f) : rgba(c[0], c[1], c[2], 0.75 * f); h.lineWidth = 1; h.stroke();
      anySign(h, k, cx, cy, s * 0.62, k === "beetle" ? c : up(c, 50), 0.95 * f, true); }
    if (!n) { h.strokeStyle = rgba(c[0], c[1], c[2], 0.12); h.lineWidth = 0.8; h.beginPath(); h.ellipse(cx, y, s * 1.25, s * 0.95, 0, 0, TAU); h.stroke(); } }); /* la place du premier jeton, à peine marquée */
}
/** Les figurines posées aux places occupées, en trois jeux (on change de jeu en touchant l'une d'elles). Toutes ont le même socle : un plot
 *  rond de pierre, avec sur sa face avant un cartouche de laiton où le chiffre D'ni de la place est gravé. Dessus :
 *  0, une statuette en robe de guilde à capuchon, les mains jointes dans les manches, l'emblème de sa guilde sur un médaillon d'or émaillé ;
 *  1, une stèle, la lettre D'ni du caractère gravée et teintée ; 2, une lampe de rue en petit, sur son pilier, le verre teinté par caractère
 *  (un médaillon ovale à côtes, un verre haut où monte un éventail de feuilles, ou une lanterne carrée à rayons).
 *  Les couleurs (ambre, violet, ivoire, rose, jais) ne sont aucune de celles du jeu. */
/* chaque caractère porte la couleur d'une guilde D'ni : le fidèle, les archivistes (or) ; l'imitateur, les écrivains (noir, liseré rouge
 * sombre) ; le malin, les messagers (jaune) ; le collectionneur, les cartographes (turquoise) ; le méfiant, les mainteneurs (bordeaux).
 * FIG_COL : la robe ; FIG_LIT : ce qui luit (émail, verre, lettre), quand ce n'est pas la même. Les emblèmes sont inventés, d'après le métier. */
const FIG_COL = { faithful: [190, 140, 52], mimic: [34, 30, 34], sly: [238, 206, 70], collector: [64, 196, 200], wary: [122, 30, 46] };
const FIG_LIT = { mimic: [168, 40, 52], wary: [176, 52, 72] };
const FIG_LETTER = { faithful: "b", mimic: "d", sly: "g", collector: "k", wary: "t" };
const FIGS = 3;
const STONE = (ctx, x0, x1) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "#4a4032"); g.addColorStop(0.38, "#b4a384"); g.addColorStop(0.6, "#9a8a6c"); g.addColorStop(1, "#3a3226"); return g; };
const ROBE = (ctx, x0, x1, c) => { const m = (k) => rgba(Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k), 1), g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, m(0.32)); g.addColorStop(0.38, m(0.78)); g.addColorStop(0.6, m(0.6)); g.addColorStop(1, m(0.26)); return g; }; /* la robe, de la couleur de la guilde */
/** L'emblème, en trait d'or sur l'émail : inventé d'après le métier de la guilde. */
function emblem(ctx, char, x, y, s, col = "#ffe6a8") {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s * 0.13; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
  if (char === "faithful") { /* les archivistes : trois tablettes empilées, un anneau au-dessus (ce qu'on garde) */
    for (let k = 0; k < 3; k++) { const yy = y + s * (0.05 + k * 0.22), w = s * (0.36 + k * 0.08); ctx.strokeRect(x - w, yy, 2 * w, s * 0.14); }
    ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * 0.18, 0, TAU); ctx.stroke(); }
  else if (char === "mimic") { /* les écrivains : un trait d'encre qui boucle sur lui-même, posé sur une ligne (le geste d'écrire) */
    ctx.moveTo(x - s * 0.6, y + s * 0.2); ctx.bezierCurveTo(x - s * 0.1, y + s * 0.3, x + s * 0.35, y - s * 0.7, x, y - s * 0.45); ctx.bezierCurveTo(x - s * 0.35, y - s * 0.2, x + s * 0.2, y + s * 0.3, x + s * 0.6, y - s * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.6, y + s * 0.5); ctx.lineTo(x + s * 0.6, y + s * 0.5); ctx.stroke(); }
  else if (char === "sly") { /* les messagers : un pli scellé, deux traits de vitesse derrière lui */
    ctx.strokeRect(x - s * 0.3, y - s * 0.32, s * 0.85, s * 0.6); ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.32); ctx.lineTo(x + s * 0.125, y + s * 0.05); ctx.lineTo(x + s * 0.55, y - s * 0.32); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + s * 0.125, y + s * 0.08, s * 0.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s * 0.7, y - s * 0.12); ctx.lineTo(x - s * 0.42, y - s * 0.12); ctx.moveTo(x - s * 0.62, y + s * 0.12); ctx.lineTo(x - s * 0.42, y + s * 0.12); ctx.stroke(); }
  else if (char === "collector") { /* les cartographes : des lignes de niveau autour d'un sommet, une petite croix à côté */
    for (const [rx, ry, dx] of [[0.6, 0.42, 0], [0.4, 0.27, 0.05], [0.18, 0.12, 0.08]]) { ctx.beginPath(); ctx.ellipse(x + s * dx - s * 0.1, y + s * 0.05, s * rx, s * ry, -0.3, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x + s * 0.45, y - s * 0.62); ctx.lineTo(x + s * 0.45, y - s * 0.34); ctx.moveTo(x + s * 0.31, y - s * 0.48); ctx.lineTo(x + s * 0.59, y - s * 0.48); ctx.stroke(); }
  else { /* les mainteneurs : un rempart à créneaux, une porte en arc (ce qu'on garde en état, et sûr) */
    ctx.moveTo(x - s * 0.55, y + s * 0.5); ctx.lineTo(x - s * 0.55, y - s * 0.35); for (let k = 0; k < 4; k++) { const x0 = x - s * 0.55 + k * s * 0.275; ctx.lineTo(x0, y - s * 0.55); ctx.lineTo(x0 + s * 0.14, y - s * 0.55); ctx.lineTo(x0 + s * 0.14, y - s * 0.35); ctx.lineTo(x0 + s * 0.275, y - s * 0.35); }
    ctx.lineTo(x + s * 0.55, y - s * 0.55); ctx.lineTo(x + s * 0.55, y + s * 0.5); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.17, y + s * 0.5); ctx.lineTo(x - s * 0.17, y + s * 0.08); ctx.arc(x, y + s * 0.08, s * 0.17, Math.PI, TAU); ctx.lineTo(x + s * 0.17, y + s * 0.5); ctx.stroke(); }
  ctx.restore();
}
function figurine(ctx, x, y, char, num, set = 0, fam = null, a = 1) {
  const robe = FIG_COL[char] || FIG_COL.wary, c = FIG_LIT[char] || robe, top = -6;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(1.3, 1.3);
  /* le socle : l'ombre, le flanc, le dessus ; le cartouche et son chiffre sur la face avant */
  ctx.fillStyle = rgba(0, 0, 0, 0.38); ctx.beginPath(); ctx.ellipse(1.5, 1.2, 10, 3.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = STONE(ctx, -8.5, 8.5); ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 2.9, 0, 0, Math.PI); ctx.lineTo(-8.5, top); ctx.lineTo(8.5, top); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#c4b496"; ctx.beginPath(); ctx.ellipse(0, top, 8.5, 2.9, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(60, 48, 30, 0.6); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(0, top, 7.2, 2.4, 0, 0, TAU); ctx.stroke(); /* le liseré du dessus */
  ctx.fillStyle = "#6a4a1c"; ctx.fillRect(-2.9, top + 2.1, 5.8, 4.6); ctx.fillStyle = "#c99a52"; ctx.fillRect(-2.5, top + 2.5, 5, 3.8); /* le cartouche */
  numeral(ctx, num, 0, top + 4.4, 3.2, "#3a240c");
  if (set === 1) { /* la stèle */
    ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.beginPath(); ctx.ellipse(0, top, 5.2, 1.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = STONE(ctx, -5, 5); ctx.beginPath(); ctx.moveTo(-5, top); ctx.lineTo(-4.4, top - 15); ctx.quadraticCurveTo(0, top - 21, 4.4, top - 15); ctx.lineTo(5, top); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(40, 30, 18, 0.5); ctx.lineWidth = 0.5; ctx.stroke();
    ctx.strokeStyle = rgba(255, 240, 210, 0.25); ctx.beginPath(); ctx.moveTo(-3.3, top - 2); ctx.lineTo(-3, top - 14); ctx.quadraticCurveTo(0, top - 18.5, 3, top - 14); ctx.lineTo(3.3, top - 2); ctx.stroke(); /* le cadre gravé */
    if (fam) { ctx.font = `9px ${fam}`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; const ch = FIG_LETTER[char] || "b", m = ctx.measureText(ch), wd = Math.max(1, (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width)), ht = Math.max(1, (m.actualBoundingBoxAscent || 6) + (m.actualBoundingBoxDescent || 0)), k = Math.min(1, 5.2 / wd, 8.5 / ht);
      ctx.save(); ctx.translate(0, top - 9); ctx.scale(k, k); ctx.translate(((m.actualBoundingBoxLeft || 0) - (m.actualBoundingBoxRight || 0)) / 2, ((m.actualBoundingBoxAscent || 0) - (m.actualBoundingBoxDescent || 0)) / 2); ctx.fillStyle = rgba(c[0], c[1], c[2], 0.95); ctx.fillText(ch, 0, 0); ctx.restore(); } /* la lettre, ramenée dans le cadre gravé et centrée sur son encre */
    else emblem(ctx, char, 0, top - 9, 4.5, rgba(c[0], c[1], c[2], 0.95)); }
  else if (set === 2) { /* la lampe de rue D'ni, en petit : un pilier de pierre carré à chapiteau, et dessus un verre serti de plomb,
     * aux reflets changeants autour de la teinte du caractère ; trois formes : le médaillon ovale à côtes, le verre haut en éventail, la lanterne à rayons */
    const kind = { faithful: "oval", mimic: "fan", sly: "rays", collector: "oval", wary: "fan" }[char] || "oval", P = top - 4.5;
    ctx.fillStyle = "#2e3532"; ctx.fillRect(-3, P, 6, 4.8); ctx.fillStyle = "#4c5753"; ctx.fillRect(-3, P, 1.8, 4.8); /* le fût */
    ctx.fillStyle = "#5c6862"; ctx.fillRect(-4, P - 1.4, 8, 1.6); ctx.fillStyle = "#3a4440"; ctx.fillRect(-4, P + 0.2, 8, 0.5); /* le chapiteau */
    const shift = (d) => [Math.min(255, Math.max(0, c[0] + d[0])), Math.min(255, Math.max(0, c[1] + d[1])), Math.min(255, Math.max(0, c[2] + d[2]))];
    const glassG = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1), a1 = shift([90, 60, 70]), a2 = shift([30, -10, 60]), a3 = shift([-40, 40, 30]); g.addColorStop(0, rgba(...a1, 1)); g.addColorStop(0.45, rgba(...a2, 1)); g.addColorStop(1, rgba(...a3, 1)); return g; }; /* le verre irisé */
    const lead = "#1c2220";
    const gy = kind === "oval" ? P - 8 : P - 7.5, glow = ctx.createRadialGradient(0, gy, 1, 0, gy, 16); glow.addColorStop(0, rgba(c[0], c[1], c[2], 0.32)); glow.addColorStop(1, rgba(c[0], c[1], c[2], 0)); ctx.fillStyle = glow; ctx.fillRect(-16, gy - 16, 32, 32);
    if (kind === "oval") { /* le médaillon à l'abeille, en vitrail géométrique : un fond d'alvéoles hexagonales, une abeille faite de formes simples
       * (un losange pour la tête, des chevrons pour le corps, deux triangles par aile), tout serti de plomb */
      ctx.fillStyle = "#3e4844"; ctx.beginPath(); ctx.ellipse(0, gy, 5.6, 6.8, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#7a8680"; ctx.lineWidth = 0.4; ctx.stroke();
      ctx.fillStyle = glassG(gy - 5.8, gy + 5.8); ctx.beginPath(); ctx.ellipse(0, gy, 4.5, 5.8, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, gy, 4.5, 5.8, 0, 0, TAU); ctx.clip(); ctx.strokeStyle = lead; ctx.lineWidth = 0.3;
      ctx.strokeStyle = rgba(28, 34, 32, 0.45); const hr = 1.9; for (let row = -3; row <= 3; row++) for (let col = -2; col <= 2; col++) { const hx0 = col * hr * 1.73 + (row % 2 ? hr * 0.865 : 0), hy0 = gy + row * hr * 1.5; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(hx0 + Math.cos(a) * hr, hy0 + Math.sin(a) * hr); } ctx.closePath(); ctx.stroke(); } /* les alvéoles, en plomb fin */
      ctx.strokeStyle = lead; ctx.lineWidth = 0.45;
      for (const d of [-1, 1]) for (const [y0, y1, w] of [[-1.6, 0.2, 4.1], [0.4, 1.8, 3.2]]) { ctx.fillStyle = rgba(240, 244, 250, 0.9); ctx.beginPath(); ctx.moveTo(d * 0.95, gy + y0 + 0.5); ctx.lineTo(d * w, gy + y0 - 1.4); ctx.lineTo(d * (w - 0.3), gy + y1); ctx.closePath(); ctx.fill(); ctx.stroke(); } /* les ailes, en triangles */
      ctx.fillStyle = "#3a2810"; ctx.beginPath(); ctx.moveTo(0, gy - 3.9); ctx.lineTo(0.8, gy - 3.1); ctx.lineTo(0, gy - 2.3); ctx.lineTo(-0.8, gy - 3.1); ctx.closePath(); ctx.fill(); /* la tête, en losange */
      ctx.fillRect(-0.9, gy - 2.2, 1.8, 1.6); /* le thorax */
      const band = ["#f0c040", "#3a2810", "#f0c040", "#3a2810", "#f0c040"]; for (let k = 0; k < 5; k++) { const y = gy - 0.4 + k * 0.95, w = 1.5 - k * 0.22; ctx.fillStyle = band[k]; ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(0, y + 0.45); ctx.lineTo(w, y); ctx.lineTo(w, y + 0.95); ctx.lineTo(0, y + 1.4); ctx.lineTo(-w, y + 0.95); ctx.closePath(); ctx.fill(); } /* le corps, en chevrons */
      ctx.fillStyle = "#3a2810"; ctx.beginPath(); ctx.moveTo(-0.4, gy + 4.4); ctx.lineTo(0, gy + 5.3); ctx.lineTo(0.4, gy + 4.4); ctx.fill(); /* le dard */
      ctx.beginPath(); ctx.moveTo(-0.3, gy - 3.8); ctx.lineTo(-1.3, gy - 5); ctx.moveTo(0.3, gy - 3.8); ctx.lineTo(1.3, gy - 5); ctx.stroke(); /* les antennes, droites */
      ctx.restore(); }
    else if (kind === "fan") { /* le verre haut, à dôme, où monte un éventail de feuilles comme une main ouverte */
      const y0 = P - 1.4, y1 = P - 14; ctx.fillStyle = "#3e4844"; ctx.fillRect(-3.8, y0 - 1.2, 7.6, 1.3); ctx.fillRect(-3.8, y1 + 0.6, 7.6, 1); /* bague du bas, bague du haut */
      ctx.fillStyle = glassG(y1, y0); ctx.beginPath(); ctx.moveTo(-3.2, y0 - 1.2); ctx.lineTo(-3.2, y1 + 5); ctx.quadraticCurveTo(-3.2, y1 + 0.6, 0, y1 + 0.6); ctx.quadraticCurveTo(3.2, y1 + 0.6, 3.2, y1 + 5); ctx.lineTo(3.2, y0 - 1.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = lead; ctx.lineWidth = 0.4; ctx.stroke();
      ctx.save(); ctx.clip(); const by = y0 - 1.6; ctx.fillStyle = rgba(...shift([-60, 30, -10]), 0.9);
      for (const a of [-0.95, -0.5, 0, 0.5, 0.95]) { const tx = Math.sin(a) * 3.6, ty = by - Math.cos(a) * 7.6; ctx.beginPath(); ctx.moveTo(0, by); ctx.quadraticCurveTo(tx * 0.3 - 1, (by + ty) / 2, tx, ty); ctx.quadraticCurveTo(tx * 0.3 + 1, (by + ty) / 2, 0, by); ctx.fill(); ctx.stroke(); } /* les feuilles */
      ctx.beginPath(); ctx.moveTo(-3.2, y1 + 4.4); ctx.quadraticCurveTo(0, y1 + 3, 3.2, y1 + 4.4); ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#5c6862"; ctx.beginPath(); ctx.moveTo(-1.6, y1 + 0.6); ctx.quadraticCurveTo(0, y1 - 1.6, 1.6, y1 + 0.6); ctx.fill(); } /* le petit fleuron */
    else { /* la lanterne : une caisse de pierre, le verre partagé en rayons autour d'un rond, un arc en haut */
      const x0 = -4.6, y0 = P - 13.4, w = 9.2, h = 12; ctx.fillStyle = "#3e4844"; ctx.fillRect(x0, y0, w, h); ctx.fillStyle = "#5c6862"; ctx.fillRect(x0 - 0.6, y0 - 1, w + 1.2, 1.2);
      ctx.fillStyle = glassG(y0 + 1, y0 + h - 1); ctx.fillRect(x0 + 0.9, y0 + 0.9, w - 1.8, h - 1.8);
      ctx.save(); ctx.beginPath(); ctx.rect(x0 + 0.9, y0 + 0.9, w - 1.8, h - 1.8); ctx.clip(); ctx.strokeStyle = lead; ctx.lineWidth = 0.45; const ry = y0 + h * 0.56;
      ctx.beginPath(); ctx.arc(0, ry, 1.5, 0, TAU); ctx.stroke(); for (let k = 0; k < 10; k++) { const a = Math.PI + k * Math.PI / 9; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 1.5, ry + Math.sin(a) * 1.5); ctx.lineTo(Math.cos(a) * 6, ry + Math.sin(a) * 6); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(x0 + w, ry); ctx.stroke(); ctx.beginPath(); ctx.arc(0, ry, 3.3, Math.PI, TAU); ctx.stroke(); ctx.restore(); } }
  else { /* la statuette : la robe de la guilde, évasée, les manches jointes, le capuchon, le médaillon */
    const g = ROBE(ctx, -6, 6, robe);
    ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.beginPath(); ctx.ellipse(0, top, 6, 1.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6, top + 0.4); ctx.quadraticCurveTo(-4.6, top - 8, -3.4, top - 13); ctx.lineTo(3.4, top - 13); ctx.quadraticCurveTo(4.6, top - 8, 6, top + 0.4); ctx.quadraticCurveTo(0, top + 1.8, -6, top + 0.4); ctx.fill(); /* la robe, l'ourlet bombé */
    ctx.strokeStyle = rgba(40, 32, 20, 0.45); ctx.lineWidth = 0.45; for (const dx of [-2.2, 0.4, 2.8]) { ctx.beginPath(); ctx.moveTo(dx * 0.6, top - 7); ctx.quadraticCurveTo(dx, top - 3, dx * 1.2, top + 0.6); ctx.stroke(); } /* les plis */
    ctx.fillStyle = rgba(Math.round(robe[0] * 0.5), Math.round(robe[1] * 0.5), Math.round(robe[2] * 0.5), 1); ctx.beginPath(); ctx.ellipse(0, top - 7.4, 3.9, 1.6, 0, 0, TAU); ctx.fill(); /* les manches jointes */
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-3.6, top - 12.6); ctx.quadraticCurveTo(-4.2, top - 19.5, 0, top - 20.2); ctx.quadraticCurveTo(4.2, top - 19.5, 3.6, top - 12.6); ctx.quadraticCurveTo(0, top - 11.4, -3.6, top - 12.6); ctx.fill(); /* le capuchon */
    ctx.fillStyle = "#1a160f"; ctx.beginPath(); ctx.ellipse(0, top - 15.4, 1.9, 2.4, 0, 0, TAU); ctx.fill(); /* le visage, dans l'ombre */
    const my = top - 9.6, R = 4.3, e = rgba(Math.round(c[0] * 0.55), Math.round(c[1] * 0.55), Math.round(c[2] * 0.55), 1);
    ctx.fillStyle = "#8a6428"; ctx.beginPath(); ctx.arc(0, my, R + 0.5, 0, TAU); ctx.fill(); ctx.fillStyle = "#e0b462"; ctx.beginPath(); ctx.arc(0, my, R, 0, TAU); ctx.fill(); /* la bague d'or */
    ctx.fillStyle = e; ctx.beginPath(); ctx.arc(0, my, R - 0.6, 0, TAU); ctx.fill(); /* l'émail */
    emblem(ctx, char, 0, my, R - 0.9); }
  ctx.restore();
}
/** La lumière d'un objet qu'on survole (au lieu d'une infobulle) : un halo chaud, doux. */
function hoverGlow(ctx, x, y, r, col = [255, 205, 120]) { const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, rgba(col[0], col[1], col[2], 0.38)); g.addColorStop(1, rgba(col[0], col[1], col[2], 0)); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore(); }

/* ---- le glyphe du centre, en lettres D'ni ---- */
function glyphParts(spec) { return String(spec || "").trim().split(/\s+/).filter(Boolean).map((tok) => { const m = tok.match(/^(.+?)@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?(?:,(-?\d+(?:\.\d+)?))?$/); return m ? { ch: m[1], dx: +m[2], dy: +m[3], k: m[4] ? +m[4] : 1, r: m[5] ? +m[5] : 0 } : { ch: tok, dx: 0, dy: 0, k: 1, r: 0 }; }); }
const PARTS = glyphParts(GLYPH);
function paintGlyph(g, fam, x0, y0) { const z = GLYPH_SIZE / 30; for (const p of PARTS) { g.font = `${Math.round(GLYPH_SIZE * p.k)}px ${fam}`; g.save(); g.translate(x0 + p.dx * z, y0 + p.dy * z); g.rotate(p.r * Math.PI / 180); g.fillText(p.ch, 0, 0); g.restore(); } }
/** Le glyphe en hologramme (mis en cache par police) : bleu, plus clair en haut, plus profond en bas, strié de lignes de balayage. */
function glyphImg(r, fam) {
  if (r._ahyGlyph && r._ahyGlyph.fam === fam) return r._ahyGlyph.cv;
  const N = 180, cv = document.createElement("canvas"); cv.width = cv.height = N; const g = cv.getContext("2d"), m = inkMid(r, fam);
  const grad = g.createLinearGradient(0, N * 0.2, 0, N * 0.8); grad.addColorStop(0, "rgb(140,195,255)"); grad.addColorStop(0.5, "rgb(80,140,240)"); grad.addColorStop(1, "rgb(50,95,210)");
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = grad; paintGlyph(g, fam, N / 2 - m.mx, N / 2 - m.my);
  g.globalCompositeOperation = "destination-out"; g.fillStyle = "rgba(0,0,0,0.55)"; for (let y = 0; y < N; y += 3) g.fillRect(0, y, N, 1); /* les lignes de balayage */
  r._ahyGlyph = { fam, cv }; return cv;
}
/** Le milieu de l'encre du glyphe, mesuré une fois par police (les lettres n'ont pas toutes la même chasse : on le centre sur ce qu'on voit). */
function inkMid(r, fam) {
  if (r._ahyInk && r._ahyInk.fam === fam) return r._ahyInk;
  const N = 300, cv = document.createElement("canvas"); cv.width = cv.height = N; const g = cv.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; paintGlyph(g, fam, N / 2, N / 2);
  const d = g.getImageData(0, 0, N, N).data; let x0 = N, y0 = N, x1 = -1, y1 = -1; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return (r._ahyInk = { fam, mx: x1 < 0 ? 0 : (x0 + x1) / 2 - N / 2, my: x1 < 0 ? 0 : (y0 + y1) / 2 - N / 2 });
}

/* ---- l'état : la partie en cours, et ce qu'on garde (adversaires, niveau, rang) ---- */
/* les places occupées autour de la table (1 à 4, la 0 est la mienne) : on invite un joueur en touchant un siège libre, on le renvoie en touchant le sien */
const SEAT_ORDER = [2, 3, 1, 4];
function seatsOf(s) { const ok = Array.isArray(s.seats) ? [...new Set(s.seats.filter((k) => [1, 2, 3, 4].includes(k)))] : []; return ok.length ? ok : SEAT_ORDER.slice(0, Math.max(1, Math.min(4, s.n | 0 || 2))); }
function saved(r) { const s = (r.opts && r.opts.ahyState && r.opts.ahyState()) || {}, seats = seatsOf(s); return { seats, n: seats.length, level: ["easy", "mid", "hard", "rank"].includes(s.level) ? s.level : "rank", rank: Math.max(0, s.rank | 0), log: Array.isArray(s.log) ? s.log.slice(0, 40) : [], figs: [0, 1, 2].includes(s.figs) ? s.figs : 0 }; }
function save(r, patch) { const s = { ...saved(r), ...patch }; s.seats = seatsOf(s); s.n = s.seats.length; if (r.opts && r.opts.onAhyoheek) r.opts.onAhyoheek(s); r._ahySaved = s; return s; }
function cur(r) { return r._ahySaved || saved(r); }
function state(r) { if (!r.ahy || !r.ahy.G) { const s = cur(r); r.ahy = { ...(r.ahy || {}), G: AH.newGame({ n: s.n, level: s.level, rank: s.rank }) }; } return r.ahy; }

/** Un clic dans la vue : un signe, la table (la suite), un réglage. */
function act(r, a) {
  const st = state(r), G = st.G;
  if (a.sign) { if (G.phase === "choose") { if (!st.clock) arm(r); if (!st.clock.mine) pickMine(r, a.sign, false); } }
  else if (a.next) { if (G.phase === "reveal") { if (AH.next(G)) { settle(r); if (G.phase === "choose") arm(r); else if (G.phase === "won") snd(r, G.end.i === 0 ? "game" : "gameLost"); } } }
  else if (a.seat != null) { const seats = cur(r).seats, k = a.seat, has = seats.includes(k); if (has && seats.length === 1) return; /* il faut au moins un adversaire */
    const s = save(r, { seats: has ? seats.filter((x) => x !== k) : [...seats, k] }); st.G = AH.newGame(s); st.clock = null; snd(r, has ? "leave" : "join"); }
  else if (a.level) { const L = ["easy", "mid", "hard", "rank"], lv = a.lv != null ? L[a.lv] : L[(L.indexOf(cur(r).level) + 1) % 4]; if (lv === cur(r).level) return; const s = save(r, { level: lv }); st.G = AH.newGame(s); st.clock = null; snd(r, "button"); }
  else if (a.start) { st.press = ["start", now()]; snd(r, "button"); /* le bouton d'ambre : lancer (la partie, ou la manche suivante) */
    if (G.phase === "won") { st.G = AH.newGame(cur(r)); st.clock = null; arm(r); }
    else if (G.phase === "reveal") act(r, { next: true });
    else if (!st.clock) arm(r); }
  else if (a.wait) { st.press = ["wait", now()]; st.G = AH.newGame(cur(r)); st.clock = null; snd(r, "button"); } /* le bouton de bronze : la table se remet en attente, l'anneau revient au glyphe */
  else if (a.figs) { save(r, { figs: (cur(r).figs + 1) % FIGS }); snd(r, "button"); } /* toucher une figurine : tout le jeu change */
  else if (a.panel) { st.panel = a.panel; snd(r, "button"); } /* la plaque des règles, le registre */
  else if (a.close) st.panel = null;
}
const snd = (r, k) => { if (r.opts && r.opts.onAhySound) r.opts.onAhySound(k); };
/* ---- la manche, comme à la table d'Uru : un compte à rebours de dix secondes au cœur de l'anneau ; chacun pose son signe quand il veut
 * (un chevron blanc s'allume devant lui sur la vasque) ; quand tout le monde a posé, on dévoile ; à zéro, un signe est joué au hasard pour qui n'a pas choisi. */
const COUNT = 10000, now = () => Date.now();
/** La manche commence : le compte part, chaque adversaire posera son signe à un moment à lui (entre 1,5 et 8 secondes). */
function arm(r) { const st = r.ahy, n = now(); st.clock = { end: n + COUNT, vt: st.G.opp.map(() => n + 1500 + Math.random() * 6500), heard: st.G.opp.map(() => false), sec: COUNT / 1000, seen: n, mine: null, revealAt: 0, late: false }; snd(r, "start"); }
/** Je pose mon signe : ceux qui n'ont pas encore choisi se décident vite, puis on dévoile. */
function pickMine(r, sign, late) {
  const c = r.ahy.clock, n = now(); c.mine = sign; c.late = late; snd(r, "mine");
  c.vt = c.vt.map((v) => (v > n ? n + 150 + Math.random() * 450 : v)); c.revealAt = Math.max(n + 500, ...c.vt) + 350;
}
/** À chaque image : le temps passe (une pause de l'affichage, l'onglet caché, ne compte pas) ; à zéro, le hasard joue pour moi ; puis le dévoilement. */
function tick(r) {
  const st = r.ahy, c = st.clock, G = st.G; if (!c || G.phase !== "choose") return;
  const n = now(); if (n - c.seen > 1500) { const d = n - c.seen; c.end += d; c.vt = c.vt.map((v) => v + d); if (c.revealAt) c.revealAt += d; } c.seen = n;
  const sec = Math.max(0, Math.ceil((c.end - n) / 1000)); if (c.sec == null) c.sec = sec; if (sec < c.sec) { c.sec = sec; if (!c.mine && sec > 0) snd(r, "tick"); } /* chaque seconde : un tic, et l'anneau tourne d'un cran */
  c.heard = c.heard || []; c.vt.forEach((v, i) => { if (!c.heard[i] && n >= v) { c.heard[i] = true; if (!c.mine) snd(r, "set"); } }); /* un adversaire pose son signe (après le mien, ils se décident ensemble : on ne les entend pas un à un) */
  if (!c.mine && n >= c.end) pickMine(r, AH.SIGNS[Math.floor(Math.random() * 3)], true);
  if (c.mine && n >= c.revealAt) { st.clock = null; if (AH.play(G, c.mine)) { settle(r); st.late = c.late ? G.round : null; snd(r, "reveal");
    if (G.phase === "won") snd(r, G.end.i === 0 ? "game" : "gameLost"); else if (G.winners && G.winners.length) snd(r, G.winners.includes(0) ? "win" : "lose"); } }
}
/** Une partie qui vient de finir : le rang bouge (une fois), si on joue « selon le rang ». */
function settle(r) { const G = r.ahy.G; if (G.phase === "won" && !G.ranked) { G.ranked = true; const c = cur(r), A = [G.me, ...G.opp], w = A[G.end.i];
  const entry = { at: Date.now(), n: G.opp.length, level: G.level, won: G.end.i === 0, by: G.end.why && G.end.why.sign ? G.end.why.sign : SIGNS_BEST(w), rounds: G.round }; /* une ligne au registre */
  save(r, { rank: c.level === "rank" ? AH.rankAfter(G, c.rank) : c.rank, log: [entry, ...(c.log || [])].slice(0, 40) }); } }
const SIGNS_BEST = (p) => AH.SIGNS.slice().sort((a, b) => (p.won[b] || 0) - (p.won[a] || 0))[0];

/* ---- la lumière sale des hologrammes : tout ce qui est projeté se dessine sur un calque à part, qu'on crible de grain (une neige qui bouge),
 * puis qu'on pose deux fois en lumière ajoutée, une fois flou, une fois net : rien n'y est tout à fait propre ---- */
function holoLayer(r, ctx) {
  const cv0 = ctx.canvas; let L = r._ahyLayer; if (!L || L.width !== cv0.width || L.height !== cv0.height) { L = document.createElement("canvas"); L.width = cv0.width; L.height = cv0.height; r._ahyLayer = L; }
  const h = L.getContext("2d"); h.setTransform(1, 0, 0, 1, 0, 0); h.globalCompositeOperation = "source-over"; h.globalAlpha = 1; h.clearRect(0, 0, L.width, L.height); h.setTransform(ctx.getTransform()); return h;
}
let NOISE = null;
function noiseTile() { if (NOISE) return NOISE; const n = 96, cv = document.createElement("canvas"); cv.width = cv.height = n; const g = cv.getContext("2d"), im = g.createImageData(n, n); for (let i = 0; i < n * n; i++) { const v = Math.random(); im.data[i * 4 + 3] = Math.round(255 * v * v); } g.putImageData(im, 0, 0); return (NOISE = cv); }
function holoComposite(ctx, h, t) {
  const L = h.canvas, sc = ctx.getTransform().a || 1, tile = noiseTile(), k = t ? Math.floor(t * 24) : 0, ox = Math.floor(q("nx" + k) * 96), oy = Math.floor(q("ny" + k) * 96);
  h.save(); h.setTransform(sc * 1.3, 0, 0, sc * 1.3, -ox * sc, -oy * sc); h.globalCompositeOperation = "destination-out"; h.globalAlpha = 0.7; h.fillStyle = h.createPattern(tile, "repeat"); h.fillRect(0, 0, L.width / sc + 200, L.height / sc + 200); h.restore(); /* le grain */
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${(2.2 * sc).toFixed(1)}px)`; ctx.globalAlpha = 0.75; ctx.drawImage(L, 0, 0); ctx.filter = "none"; /* le halo trouble */
  ctx.globalAlpha = 0.8; ctx.drawImage(L, 0, 0); ctx.restore();
}
/* ---- la vue rapprochée ---- */
/** Le fond de la salle, selon d'où l'on vient : la serre (le jeu dans la serre), ou l'atelier (le bureau, la cheminée de la cabane).
 *  Au fond un mur, devant un sol en perspective ; tout reste sombre pour que les hologrammes se lisent. */
function room(ctx, from, t) {
  const serre = !["desk", "cabin"].includes(from), WALL = 104;
  /* le sol */
  const fl = ctx.createLinearGradient(0, WALL - 10, 0, H); fl.addColorStop(0, serre ? "#1c140c" : "#1e130a"); fl.addColorStop(1, serre ? "#3a2414" : "#3c2614"); ctx.fillStyle = fl; ctx.fillRect(0, 0, W, H);
  if (serre) for (let k = 0; k < 14; k++) { const y0 = 70 + k * k * 1.75, h = 3 + k * 1.3, w = 22 + k * 5.5, off = (k % 2) * w / 2; for (let x = -w + off; x < W + w; x += w) { const v = q("b" + k + "_" + Math.round(x)); ctx.fillStyle = rgba(96 + v * 50, 54 + v * 26, 30 + v * 12, 0.12 + k * 0.022); ctx.fillRect(x + 1, y0 + 1, w - 2, h - 1); } } /* les tomettes */
  else { for (let k = 0; k < 14; k++) { const y0 = 70 + k * k * 1.75, h = 3 + k * 1.3; ctx.fillStyle = rgba(150, 96, 52, 0.08 + k * 0.016); ctx.fillRect(0, y0, W, h - 0.8); ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(0, y0 + h - 0.8, W, 0.8); /* les lames du parquet */
      const L = 60 + k * 14; for (let x = (q("p" + k) * L) - L; x < W; x += L) { ctx.fillRect(x, y0, 0.8, h - 0.8); } } }
  /* le mur du fond */
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, WALL); ctx.clip();
  if (serre) { /* la verrière : des baies en arc, des meneaux de fer, le vert des plantes derrière le verre et devant */
    const sky = ctx.createLinearGradient(0, 0, 0, WALL); sky.addColorStop(0, "#14241f"); sky.addColorStop(1, "#0c1510"); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, WALL);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba(30, 60, 36, 0.35 + q("lf" + i) * 0.3); ctx.beginPath(); ctx.ellipse(q("lx" + i) * W, 40 + q("ly" + i) * 60, 10 + q("lw" + i) * 22, 4 + q("lh" + i) * 8, q("lr" + i) * 3, 0, TAU); ctx.fill(); } /* les feuillages, derrière le verre */
    const bay = 58; ctx.strokeStyle = "#0a0f0c"; ctx.lineWidth = 3;
    for (let x = -bay / 2 + ((W / 2) % bay); x < W + bay; x += bay) { ctx.beginPath(); ctx.moveTo(x, WALL); ctx.lineTo(x, 26); ctx.quadraticCurveTo(x, 4, x + bay / 2, -2); ctx.quadraticCurveTo(x + bay, 4, x + bay, 26); ctx.stroke(); /* la baie */
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + bay / 2, 2); ctx.lineTo(x + bay / 2, WALL); ctx.moveTo(x, 54); ctx.lineTo(x + bay, 54); ctx.stroke(); ctx.lineWidth = 3; /* les meneaux */
      ctx.fillStyle = rgba(190, 230, 210, 0.04 + 0.02 * Math.sin(t * 0.3 + x)); ctx.fillRect(x + 4, 30, bay / 2 - 8, 20); } /* un reflet sur le verre */
    for (let i = 0; i < 26; i++) { const x = q("fx" + i) * W, h = 14 + q("fh" + i) * 26; ctx.fillStyle = rgba(18, 38, 22, 0.9); ctx.beginPath(); ctx.ellipse(x, WALL - h * 0.4, 6 + q("fw" + i) * 10, h * 0.5, (q("fr" + i) - 0.5) * 0.8, 0, TAU); ctx.fill(); } /* les plantes, devant, au pied de la verrière */
    ctx.fillStyle = "#2a1e14"; ctx.fillRect(0, WALL - 6, W, 6); } /* le muret */
  else { /* l'atelier : des boiseries, deux rayonnages de livres et de bocaux, la lueur d'une lampe */
    ctx.fillStyle = "#1e1309"; ctx.fillRect(0, 0, W, WALL);
    for (let x = 0; x < W; x += 34) { ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(x, 0, 1.2, WALL); ctx.fillStyle = rgba(120, 76, 40, 0.08 + q("pn" + x) * 0.06); ctx.fillRect(x + 1.2, 0, 32.8, WALL); } /* les panneaux */
    for (const sy of [34, 70]) { ctx.fillStyle = "#3a2410"; ctx.fillRect(0, sy, W, 3.5); ctx.fillStyle = rgba(0, 0, 0, 0.4); ctx.fillRect(0, sy + 3.5, W, 3); /* la planche */
      let x = 4; while (x < W) { const v = q("bk" + sy + "_" + x), w = 4 + v * 5, h = 14 + q("bh" + sy + "_" + x) * 12; if (v < 0.12) { x += 14; continue; }
        if (v > 0.86) { ctx.fillStyle = rgba(150, 170, 150, 0.22); ctx.fillRect(x, sy - 12, 10, 12); ctx.fillStyle = rgba(200, 170, 90, 0.3); ctx.fillRect(x, sy - 13, 10, 1.6); x += 13; continue; } /* un bocal */
        const tone = [[96, 52, 30], [70, 50, 36], [110, 84, 46], [60, 40, 52], [88, 70, 40]][Math.floor(q("bc" + x + sy) * 5)]; ctx.fillStyle = rgba(tone[0], tone[1], tone[2], 0.9); ctx.fillRect(x, sy - h, w, h); ctx.fillStyle = rgba(210, 170, 100, 0.25); ctx.fillRect(x, sy - h + 3, w, 0.8); x += w + 0.8; } }
    const lamp = ctx.createRadialGradient(110, 18, 2, 110, 18, 120); lamp.addColorStop(0, rgba(255, 190, 110, 0.28)); lamp.addColorStop(1, rgba(255, 170, 90, 0)); ctx.fillStyle = lamp; ctx.fillRect(0, 0, W, WALL);
    ctx.fillStyle = "#2a1a0c"; ctx.fillRect(0, WALL - 8, W, 8); ctx.fillStyle = rgba(200, 150, 80, 0.2); ctx.fillRect(0, WALL - 8, W, 1); } /* la plinthe */
  ctx.restore();
  const shade = ctx.createLinearGradient(0, WALL - 14, 0, WALL + 20); shade.addColorStop(0, rgba(0, 0, 0, 0)); shade.addColorStop(0.4, rgba(0, 0, 0, 0.35)); shade.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = shade; ctx.fillRect(0, WALL - 14, W, 34); /* l'ombre au pied du mur */
}
const C = { x: 320, y: 182 }, RX = 250, RY = 132;
const seatAt = (k) => { const a = Math.PI / 2 + k * TAU / 5; return [C.x + Math.cos(a) * RX * 0.66, C.y + Math.sin(a) * RY * 0.66]; };
const MINE = (i) => [286 + i * 34, 250];
function drawGame(r, ctx, sc, sky, t) {
  state(r); tick(r);
  const hx = typeof document !== "undefined" && ctx.canvas && ctx.getTransform ? holoLayer(r, ctx) : ctx; /* le calque des hologrammes */
  const st = r.ahy, G = st.G, T = TR(r), hov = r.hover && r.hover.ahy && r.hover.ahy.sign, reveal = G.phase !== "choose", seats = [0, ...cur(r).seats].slice(0, G.opp.length + 1), clk = st.clock, nowMs = now(), idle = !clk && !reveal, between = idle || G.phase === "won";
  const out = (i) => !!(G.sudden && !G.sudden.includes(i)); /* manche décisive : ceux qui n'y sont pas restent dans l'ombre */
  const isWin = (i) => !!(G.winners && G.winners.includes(i)), anyWin = !!(G.winners && G.winners.length);
  const hv = (id) => !!(r.hover && r.hover.ahy && r.hover.ahy.id === id); /* ce qu'on survole s'éclaire (plus d'infobulle) */
  const TIP = [320, 314]; /* la pointe de ma branche */
  if (G.phase === "reveal") r.hot.push({ x: 60, y: 40, w: 520, h: 300, ahy: { next: true } }); /* la manche montrée : toucher la table pour la suite */
  /* la salle : un sol de briques chaudes, la roche sombre au fond, une lumière chaude sur la table */
  room(ctx, st.from, t);
  const lamp = ctx.createRadialGradient(C.x, C.y, 30, C.x, C.y, 360); lamp.addColorStop(0, rgba(255, 180, 100, 0.26)); lamp.addColorStop(1, rgba(255, 150, 70, 0)); ctx.fillStyle = lamp; ctx.fillRect(0, 0, W, H);
  /* la table : cinq branches aux bords creusés, sur un pied ; une place au bout de chaque branche */
  const poly = (rx, ry, dy = 0) => { ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * TAU / 5, b = a + TAU / 10, a2 = a + TAU / 5, Q = (ang, f) => [C.x + Math.cos(ang) * rx * f, C.y + dy + Math.sin(ang) * ry * f];
      const tip = Q(a, 1), v = Q(b, 0.5), tip2 = Q(a2, 1), c1 = Q(a + TAU / 20, 0.66), c2 = Q(b + TAU / 20, 0.66); if (!k) ctx.moveTo(...tip); ctx.quadraticCurveTo(...c1, ...v); ctx.quadraticCurveTo(...c2, ...tip2); } ctx.closePath(); };
  const stool = (x, y, s) => { ctx.fillStyle = rgba(0, 0, 0, 0.4); ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.9, s * 1.1, s * 0.3, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#3a2c20"; ctx.fillRect(x - s * 0.22, y, s * 0.44, s * 0.9); const g = ctx.createLinearGradient(0, y - s * 0.3, 0, y + s * 0.3); g.addColorStop(0, "#9a8a72"); g.addColorStop(1, "#5a4c3c"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.32, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#4a3e30"; ctx.beginPath(); ctx.ellipse(x, y + s * 0.12, s, s * 0.32, 0, 0, Math.PI); ctx.fill(); };
  for (let k = 1; k < 5; k++) { if (!seats.includes(k)) continue; const a = Math.PI / 2 + k * TAU / 5; if (Math.sin(a) > 0.2) continue; stool(C.x + Math.cos(a) * RX * 1.12, C.y + Math.sin(a) * RY * 1.2 - 6, 15); } /* les tabourets des places occupées, au fond */
  ctx.fillStyle = rgba(0, 0, 0, 0.5); poly(RX * 1.02, RY * 1.04, 24); ctx.fill();
  ctx.fillStyle = "#1c150f"; ctx.beginPath(); ctx.ellipse(C.x, C.y + 40, 70, 26, 0, 0, TAU); ctx.fill(); /* le pied */
  ctx.fillStyle = "#2c2118"; poly(RX, RY, 13); ctx.fill(); ctx.strokeStyle = "#6e4c24"; ctx.lineWidth = 1; poly(RX, RY, 13); ctx.stroke(); /* la tranche */
  const top = ctx.createRadialGradient(C.x - 50, C.y - 50, 20, C.x, C.y, RX); top.addColorStop(0, "#5e4c3a"); top.addColorStop(1, "#2e241a"); ctx.fillStyle = top; poly(RX, RY); ctx.fill();
  ctx.save(); poly(RX, RY); ctx.clip(); for (let i = 0; i < 110; i++) { ctx.fillStyle = rgba(0, 0, 0, 0.08 + q("g" + i) * 0.1); ctx.beginPath(); ctx.arc(C.x + (q("gx" + i) - 0.5) * RX * 2, C.y + (q("gy" + i) - 0.5) * RY * 2, 0.8 + q("gs" + i) * 2.4, 0, TAU); ctx.fill(); } ctx.restore(); /* le grain de la pierre */
  ctx.strokeStyle = "#b07c3c"; ctx.lineWidth = 3; poly(RX, RY); ctx.stroke(); ctx.strokeStyle = rgba(255, 210, 140, 0.35); ctx.lineWidth = 1; poly(RX * 0.97, RY * 0.96); ctx.stroke(); /* le bord de bronze */
  ctx.strokeStyle = rgba(176, 124, 60, 0.6); ctx.lineWidth = 1.4; poly(RX * 0.86, RY * 0.86); ctx.stroke(); ctx.setLineDash([2, 4]); poly(RX * 0.8, RY * 0.8); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(176, 124, 60, 0.7); ctx.beginPath(); ctx.ellipse(C.x, C.y - 4, 84, 34, 0, 0, TAU); ctx.stroke(); /* la bande ornée, le cercle du centre */
  /* au centre : la vasque de lumière, d'où monte l'anneau */
  const bx = C.x, by = C.y - 4; ctx.fillStyle = "#1a120c"; ctx.beginPath(); ctx.ellipse(bx, by, 62, 24, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#b07c3c"; ctx.lineWidth = 2.5; ctx.stroke();
  const pool = ctx.createRadialGradient(bx, by, 4, bx, by, 58); pool.addColorStop(0, rgba(170, 205, 235, 0.55)); pool.addColorStop(0.6, rgba(100, 150, 200, 0.35)); pool.addColorStop(1, rgba(60, 100, 150, 0.12)); ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(bx, by, 56, 20, 0, 0, TAU); ctx.fill();
  /* les chevrons, sur la vasque, un devant chaque joueur : éteint, il n'a pas encore choisi ; blanc, il a posé son signe ; au dévoilement, celui qui gagne prend la couleur de son signe */
  seats.forEach((k, i) => { if (out(i)) return; const a = Math.PI / 2 + k * TAU / 5, hw = TAU / 10 - 0.07, done = reveal || (clk && (i === 0 ? !!clk.mine : nowMs >= clk.vt[i - 1])), p = i === 0 ? G.me : G.opp[i - 1];
    const col = reveal && isWin(i) && p.play ? rgba(...up(HC[p.play], 30), 0.92) : done ? rgba(235, 240, 250, reveal && anyWin ? 0.32 : 0.72) : rgba(255, 255, 255, 0.06);
    ctx.fillStyle = col; ctx.beginPath(); for (let j = 0; j <= 12; j++) { const th = a - hw + (2 * hw * j) / 12; ctx.lineTo(bx + Math.cos(th) * 54, by + Math.sin(th) * 19.5); } for (let j = 12; j >= 0; j--) { const th = a - hw + (2 * hw * j) / 12; ctx.lineTo(bx + Math.cos(th) * 40, by + Math.sin(th) * 13.5); } ctx.closePath(); ctx.fill(); });
  /* les places : un chiffre D'ni gravé au bord, éteint si personne n'y joue */
  for (let k = 1; k < 5; k++) { if (seats.includes(k)) continue; const a = Math.PI / 2 + k * TAU / 5; numeral(ctx, k + 1, C.x + Math.cos(a) * RX * 0.9, C.y + Math.sin(a) * RY * 0.9, 12, k === 0 ? "#c99a52" : rgba(169, 119, 58, 0.35)); } /* gravés au bord : les sièges libres (les occupés ont leur figurine ; ma pointe, la plaque des règles) */
  for (let k = 1; k < 5; k++) { if (seats.includes(k)) continue; const [x, y] = seatAt(k); /* un siège libre : le projecteur éteint, couvert ; entre deux parties, on y invite un joueur */
    emitter(ctx, x, y, 18, null, false); ctx.strokeStyle = rgba(169, 119, 58, 0.35); ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.ellipse(x, y, 26, 11, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (between) { if (hv("seat" + k)) hoverGlow(ctx, x, y, 30); r.hot.push({ x: x - 28, y: y - 18, w: 56, h: 32, ahy: { seat: k, id: "seat" + k } }); } }
  const figHot = []; /* posées après les places : la figurine l'emporte sur son siège */
  G.opp.forEach((o, i) => { const k = seats[i + 1], [x, y] = seatAt(k), dim = out(i + 1);
    if (dim) ctx.globalAlpha = 0.35;
    if (isWin(i + 1)) winMark(ctx, x, y, 18, t); emitter(ctx, x, y, 18, reveal && o.play ? HC[o.play] : null, reveal); if (reveal && o.play) holo(hx, o.play, x, y, isWin(i + 1) ? 28 : 22, isWin(i + 1) ? 1 : anyWin ? 0.28 : 0.8, t, i + 1);
    { const a = Math.PI / 2 + k * TAU / 5; const fx = C.x + Math.cos(a) * RX * 0.86, fy = C.y + Math.sin(a) * RY * 0.86; if (hv("fig" + k)) hoverGlow(ctx, fx, fy - 10, 22); figurine(ctx, fx, fy, o.char, k + 1, cur(r).figs, r.dni && r.dni.fontFamily && r.dni.fontFamily()); if (!clk || reveal) figHot.push({ x: fx - 14, y: fy - 36, w: 28, h: 40, ahy: { figs: true, id: "fig" + k } }); } /* la figurine, au bout de sa branche ; la toucher change de jeu */
    { const side = Math.abs(x - C.x) > 100; tokens(hx, x + (x < C.x - 5 ? -1 : 1) * (side ? 66 : 62), y + (side ? 2 : 10), o.won, t, -1, 5.4); } /* ses jetons, à côté */
    ctx.globalAlpha = 1;
    r.hot.push({ x: x - 24, y: y - 40, w: 48, h: 54, ahy: G.phase === "reveal" ? { next: true } : between ? { seat: k, id: "seat" + k } : {} }); });
  r.hot.push(...figHot);
  /* l'anneau : un cercle de lumière debout au-dessus de la vasque, les trois signes dessus, le glyphe du jeu au cœur */
  { const cx = C.x, cy = C.y - 86, R = 62, fl = 0.9 + 0.1 * Math.sin(t * 17) * Math.sin(t * 5.1);
    hx.save(); hx.globalCompositeOperation = "lighter";
    const beam = hx.createLinearGradient(0, C.y - 4, 0, cy - R); beam.addColorStop(0, rgba(140, 180, 230, 0.12)); beam.addColorStop(1, rgba(170, 210, 255, 0)); hx.fillStyle = beam; hx.beginPath(); hx.moveTo(cx - 50, C.y - 4); hx.lineTo(cx - R - 10, cy - R); hx.lineTo(cx + R + 10, cy - R); hx.lineTo(cx + 50, C.y - 4); hx.closePath(); hx.fill();
    /* l'anneau tourne d'un cran (un tiers de tour : chaque signe prend la place du suivant), d'un coup sec : à chaque seconde pendant le compte, plus lentement sinon */
    const per = clk && !reveal ? 1 : 3, el = r.opts && r.opts.reducedMotion ? 0 : clk && !reveal ? (COUNT - (clk.end - nowMs)) / 1000 : nowMs / 1000 / per, kk = Math.floor(el), fe = Math.min(1, (el - kk) / (0.22 / per)), rot = ((kk % 3) + 1 - (1 - fe) ** 3) * TAU / 3; /* modulo 3 : le canvas compte ses angles en petite précision, un angle énorme y perd l'arc */
    const pos = { beetle: -Math.PI / 2 + rot, page: Math.PI / 2 + Math.PI / 3 + rot, pen: Math.PI / 2 - Math.PI / 3 + rot }; /* au départ, le scarabée en haut, le livre en bas à gauche, la plume en bas à droite */
    hx.shadowColor = rgba(160, 200, 240, 0.6 * fl); hx.shadowBlur = 5; hx.strokeStyle = rgba(150, 185, 225, 0.38 * fl);
    const gap = 0.36, ang = [pos.beetle, pos.pen, pos.page]; /* dans l'ordre du tour */ for (let i = 0; i < 3; i++) { const a0 = ang[i] + gap, a1 = (i < 2 ? ang[i + 1] : ang[0] + TAU) - gap; hx.lineWidth = 2.5; hx.beginPath(); hx.arc(cx, cy, R, a0, a1); hx.stroke(); hx.lineWidth = 1; hx.beginPath(); hx.arc(cx, cy, R - 7, a0 + 0.06, a1 - 0.06); hx.stroke(); } /* trois arcs, ouverts là où sont les signes */
    const fam = r.dni && r.dni.fontFamily && r.dni.fontFamily();
    const wonSign = reveal && anyWin ? [G.me, ...G.opp][G.winners[0]].play : null;
    if (clk && !reveal) { const left = Math.max(0, Math.ceil((clk.end - nowMs) / 1000)); hx.shadowColor = rgba(170, 210, 255, 0.8 * fl); hx.shadowBlur = 8; const gl = glitchOf(t, 21); glitchy(hx, cx, cy, 23, gl, 21, (dx) => numeral(hx, left, cx + dx, cy, 46, rgba(170, 210, 250, 0.7 * fl * gl.a))); hx.shadowBlur = 5; } /* le compte à rebours, en chiffre D'ni */
    else if (fam && typeof document !== "undefined") { const im = glyphImg(r, fam), gl = glitchOf(t, 23); hx.shadowColor = rgba(90, 150, 240, 0.9 * fl); hx.shadowBlur = 12;
      glitchy(hx, cx, cy, 40, gl, 23, (dx) => { hx.globalAlpha = 0.75 * fl * gl.a; hx.drawImage(im, cx + dx - im.width / 2, cy - im.height / 2); hx.globalAlpha = 1; }); hx.shadowBlur = 5; } /* le glyphe, en lettres D'ni ; sans police D'ni, l'anneau reste vide en son cœur */
    for (const k of AH.SIGNS) { const a = pos[k], x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, c = HC[k], lit = wonSign === k, dim = wonSign && !lit, z = lit ? 1.25 + 0.06 * Math.sin(t * 5) : 1; /* le signe qui gagne la manche s'illumine sur l'anneau ; les deux autres s'éteignent un peu */
      if (lit) { const g = hx.createRadialGradient(x, y, 2, x, y, 34); g.addColorStop(0, rgba(c[0], c[1], c[2], 0.22 * fl)); g.addColorStop(1, rgba(c[0], c[1], c[2], 0)); hx.fillStyle = g; hx.fillRect(x - 34, y - 34, 68, 68); }
      hx.shadowColor = rgba(c[0], c[1], c[2], (lit ? 1 : 0.8) * fl); hx.shadowBlur = k === "beetle" ? 0 : lit ? 8 : 6; anySign(hx, k, x, y, (k === "beetle" ? 16.5 : 17) * z, k === "beetle" ? (lit ? up(c, 30) : c) : up(c, lit ? 45 : 40), (dim ? 0.3 : lit ? 0.85 : 0.9) * fl, true); }
    hx.restore();
    if (reveal) r.hot.push({ x: cx - R - 16, y: cy - R - 16, w: 2 * R + 32, h: 2 * R + 32, ahy: { next: true } }); }
  /* ma place, devant : mes trois projecteurs ; au survol, le signe se lève ; joué, il reste levé */
  AH.SIGNS.forEach((k, i) => { const [x, y] = MINE(i), picked = G.me.play === k, posed = clk && clk.mine === k;
    emitter(ctx, x, y, 13, HC[k], !reveal ? hov === k || posed : picked);
    if (!reveal && clk && clk.mine) { if (posed) holo(hx, k, x, y, 18, 0.6, t, 9); else { ctx.save(); ctx.translate(x, y); ctx.scale(1, k === "beetle" ? 0.5 : 0.45); anySign(ctx, k, 0, 0, k === "beetle" ? 8.5 : 10, HC[k], 0.3, false); ctx.restore(); } }
    else if (!reveal) { if (hov === k) holo(hx, k, x, y, 18, 0.8, t, 9); else { ctx.save(); ctx.translate(x, y); ctx.scale(1, k === "beetle" ? 0.5 : 0.45); anySign(ctx, k, 0, 0, k === "beetle" ? 8.5 : 10, HC[k], 0.8, false); ctx.restore(); } r.hot.push({ x: x - 17, y: y - 30, w: 34, h: 42, ahy: { sign: k } }); }
    else if (picked) { if (isWin(0)) winMark(ctx, x, y, 13, t); holo(hx, k, x, y, isWin(0) ? 28 : 22, isWin(0) ? 1 : anyWin ? 0.28 : 0.8, t, 0); } });
  tokens(hx, 266, 238, G.me.won, t, -1, 3.8); /* mes jetons, à gauche de mes projecteurs, au creux de la table */
  /* encastrés à fleur de pierre sur ma branche, sous mes projecteurs : à gauche le bouton d'ambre (lancer), à droite le bouton de bronze
   * (remettre la table en attente) ; à la pointe, la plaque des règles. À droite de la table, l'écran des scores. */
  const pressed = (k) => st.press && st.press[0] === k && nowMs - st.press[1] < 180;
  const inlay = (x, y, rx, ry, glass, id, act, glyph) => { const pr = pressed(id); if (hv(id)) hoverGlow(ctx, x, y, rx * 3);
    ctx.fillStyle = "#c99a52"; ctx.beginPath(); ctx.ellipse(x, y, rx + 1.6, ry + 1, 0, 0, TAU); ctx.fill(); /* la bague de bronze, au ras de la pierre */
    ctx.fillStyle = "#2a1c0e"; ctx.beginPath(); ctx.ellipse(x, y, rx + 0.4, ry + 0.3, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 0.5, x, y, rx); for (const [o, c] of glass) g.addColorStop(o, c); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx * (pr ? 0.86 : 1), ry * (pr ? 0.86 : 1), 0, 0, TAU); ctx.fill();
    if (glyph) glyph(x, y); r.hot.push({ x: x - rx - 5, y: y - ry - 6, w: 2 * rx + 10, h: 2 * ry + 12, ahy: { ...act, id } }); };
  { const call = (idle && G.round === 0) || G.phase === "won" ? 0.5 + 0.5 * Math.sin(t * 3) : 0; if (call) hoverGlow(ctx, 301, 283, 14 + 4 * call, [255, 180, 80]);
    inlay(301, 283, 6.2, 3.4, [[0, "#fff0b0"], [0.5, "#f0a840"], [1, "#8a4a10"]], "start", { start: true }); }
  inlay(339, 283, 6.2, 3.4, [[0, "#e9c27a"], [0.6, "#a8783a"], [1, "#5a3c1a"]], "wait", { wait: true }, (x, y) => { ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(x, y, 3.4, 1.8, 0, 0, TAU); ctx.stroke(); }); /* l'anneau, gravé */
  { const x = TIP[0], y = 301; if (hv("rules")) hoverGlow(ctx, x, y, 18); /* la plaque des règles, à fleur, à la pointe */
    ctx.fillStyle = "#9a7838"; ctx.beginPath(); ctx.moveTo(x - 9, y - 2.6); ctx.lineTo(x + 9, y - 2.6); ctx.lineTo(x + 7, y + 2.6); ctx.lineTo(x - 7, y + 2.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#d8b070"; ctx.lineWidth = 0.6; ctx.stroke();
    AH.SIGNS.forEach((k, i) => { ctx.save(); ctx.translate(x - 5 + i * 5, y); ctx.scale(1, 0.55); anySign(ctx, k, 0, 0, 1.8, [50, 34, 14], 0.9, false); ctx.restore(); });
    r.hot.push({ x: x - 12, y: y - 6, w: 24, h: 12, ahy: { panel: "rules", id: "rules" } }); }
  screen(r, ctx, hx, G, seats, reveal, between, t, hv);
  if (hx !== ctx) holoComposite(ctx, hx, t);
  require("./relto-atelier").backButton(r, ctx, T("ahy.back." + (["desk", "cabin"].includes(st.from) ? st.from : "serre")), ["desk", "cabin"].includes(st.from) ? st.from : "serre");
  if (st.panel) panel(r, ctx, st.panel, t);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; /* remis comme ailleurs : l'infobulle s'écrit à gauche */
  void sc; void sky;
}

/** L'écran des scores : un projecteur rond posé au sol, à droite de la table (une vasque de laiton à anneaux, couverte d'un verre gravé),
 *  qui projette au-dessus de lui un tableau de lumière, sans cadre : une ligne par place (son chiffre, ses signes gagnés, ses points de la
 *  manche). Sur le rebord avant, quatre plots à fleur pour le niveau (1, 2, 3, puis le rang). Table en attente : la projection montre les
 *  dernières parties du registre (un clic l'ouvre en entier). */
function screen(r, ctx, hx, G, seats, reveal, between, t, hv) {
  const bx = 596, by = 276, A = [G.me, ...G.opp], c0 = cur(r), fl = 0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 3.7);
  const brass = (x0, x1) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "#5a3c14"); g.addColorStop(0.45, "#d0a050"); g.addColorStop(1, "#5a3c14"); return g; };
  /* la vasque : l'ombre, la tranche, trois anneaux de laiton, le verre gravé au centre */
  ctx.fillStyle = rgba(0, 0, 0, 0.45); ctx.beginPath(); ctx.ellipse(bx + 3, by + 9, 44, 13, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#3a2810"; ctx.beginPath(); ctx.ellipse(bx, by + 5, 40, 12, 0, 0, TAU); ctx.fill(); ctx.fillRect(bx - 40, by, 80, 5);
  ctx.fillStyle = brass(bx - 40, bx + 40); ctx.beginPath(); ctx.ellipse(bx, by, 40, 12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#4a3418"; ctx.beginPath(); ctx.ellipse(bx, by, 34, 10, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = brass(bx - 31, bx + 31); ctx.beginPath(); ctx.ellipse(bx, by, 31, 9.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#16201c"; ctx.beginPath(); ctx.ellipse(bx, by, 27, 8, 0, 0, TAU); ctx.fill(); /* le verre */
  ctx.strokeStyle = rgba(200, 220, 200, 0.18); ctx.lineWidth = 0.6; for (const k of [0.75, 0.45]) { ctx.beginPath(); ctx.ellipse(bx, by, 27 * k, 8 * k, 0, 0, TAU); ctx.stroke(); }
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.ellipse(bx + Math.cos(a) * 16, by + Math.sin(a) * 4.8, 2.4, 0.9, 0, 0, TAU); ctx.stroke(); } /* les petits cercles gravés */
  ctx.fillStyle = rgba(255, 255, 255, 0.1); ctx.beginPath(); ctx.ellipse(bx - 8, by - 3, 12, 2.4, -0.1, 0, TAU); ctx.fill(); /* le reflet sur le verre */
  /* la projection : un faisceau qui monte du verre, puis le tableau qui flotte, sans cadre */
  const py0 = 122, py1 = 236, pcx = bx + 2, ink = (a) => rgba(170, 210, 245, a * fl);
  hx.save(); hx.globalCompositeOperation = "lighter";
  const glass = hx.createRadialGradient(bx, by, 1, bx, by, 26); glass.addColorStop(0, rgba(150, 200, 255, 0.45 * fl)); glass.addColorStop(1, rgba(80, 140, 220, 0)); hx.fillStyle = glass; hx.beginPath(); hx.ellipse(bx, by, 27, 8, 0, 0, TAU); hx.fill();
  const beam = hx.createLinearGradient(0, by, 0, py0); beam.addColorStop(0, rgba(140, 185, 240, 0.16 * fl)); beam.addColorStop(0.5, rgba(140, 185, 240, 0.07 * fl)); beam.addColorStop(1, rgba(140, 185, 240, 0)); hx.fillStyle = beam;
  hx.beginPath(); hx.moveTo(bx - 24, by); hx.lineTo(pcx - 36, py0); hx.lineTo(pcx + 36, py0); hx.lineTo(bx + 24, by); hx.closePath(); hx.fill();
  const back = hx.createRadialGradient(pcx, (py0 + py1) / 2 - 10, 4, pcx, (py0 + py1) / 2 - 10, 60); back.addColorStop(0, rgba(90, 140, 210, 0.12 * fl)); back.addColorStop(1, rgba(90, 140, 210, 0)); hx.fillStyle = back; hx.fillRect(pcx - 60, py0 - 20, 120, py1 - py0); /* une lueur, pas un cadre */
  const rows = Math.max(seats.length, 1), gap = 20, yA = py0 + 18;
  if (G.round === 0 && !r.ahy.clock && (c0.log || []).length) { /* en attente : le registre */
    const L5 = (c0.log || []).slice(0, 5);
    L5.forEach((e, i) => { const y = yA + i * gap; anySign(hx, e.by || "pen", pcx - 18, y, 5, HC[e.by || "pen"], 0.8 * fl, true); numeral(hx, e.n, pcx + 2, y, 9, ink(0.75));
      hx.fillStyle = e.won ? rgba(255, 210, 120, 0.85 * fl) : ink(0.22); hx.beginPath(); hx.arc(pcx + 20, y, 3, 0, TAU); hx.fill(); });
    r.hot.push({ x: pcx - 34, y: py0, w: 68, h: L5.length * gap + 10, ahy: { panel: "ledger", id: "screen" } }); if (hv("screen")) hoverGlow(ctx, pcx, py0 + 50, 50, [150, 200, 245]); }
  else seats.forEach((k, i) => { const p = A[i], y = yA + i * gap, win = !!(G.winners && G.winners.includes(i)); void rows; /* les scores, une ligne par place */
    if (win) { const g = hx.createLinearGradient(pcx - 34, 0, pcx + 34, 0); g.addColorStop(0, rgba(255, 200, 110, 0)); g.addColorStop(0.5, rgba(255, 200, 110, 0.22 * fl)); g.addColorStop(1, rgba(255, 200, 110, 0)); hx.fillStyle = g; hx.fillRect(pcx - 34, y - 8, 68, 16); }
    numeral(hx, k + 1, pcx - 26, y, 7, ink(i === 0 ? 0.95 : 0.6));
    AH.SIGNS.forEach((sg, j) => { const n = p.won[sg] || 0, xx = pcx - 12 + j * 12; anySign(hx, sg, xx, y - 3, 2.9, HC[sg], (n ? 0.85 : 0.28) * fl, true); numeral(hx, n, xx, y + 4.5, 4.5, n >= 3 ? rgba(255, 210, 120, fl) : ink(n ? 0.75 : 0.28)); });
    if (reveal && p.pts != null) numeral(hx, p.pts, pcx + 27, y, 6.5, p.pts > 0 ? rgba(255, 210, 120, fl) : ink(0.45), p.pts < 0); });
  /* les quatre plots du niveau, à fleur sur le rebord avant */
  const LV = ["easy", "mid", "hard", "rank"], li = LV.indexOf(c0.level);
  for (let i = 0; i < 4; i++) { const a = Math.PI * (0.8 - i * 0.2), kx = bx + Math.cos(a) * 37, ky = by + Math.sin(a) * 11, on = i === li, id = "lv" + i;
    ctx.fillStyle = "#2a1c0c"; ctx.beginPath(); ctx.ellipse(kx, ky, 3.6, 2.1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = on ? "#ffd890" : "#8a6a38"; ctx.beginPath(); ctx.ellipse(kx, ky, 2.8, 1.5, 0, 0, TAU); ctx.fill();
    if (on) { const g = hx.createRadialGradient(kx, ky, 0.5, kx, ky, 8); g.addColorStop(0, rgba(255, 200, 110, 0.55 * fl)); g.addColorStop(1, rgba(255, 200, 110, 0)); hx.fillStyle = g; hx.fillRect(kx - 8, ky - 8, 16, 16); }
    numeral(hx, i < 3 ? i + 1 : c0.rank, kx, ky + 8, 5, on ? rgba(255, 220, 140, fl) : ink(0.4)); /* sous chaque plot, son chiffre en lumière : 1, 2, 3 ; puis le rang */
    if (hv(id)) hoverGlow(ctx, kx, ky, 10, [255, 205, 120]);
    if (between) r.hot.push({ x: kx - 6, y: ky - 5, w: 12, h: 16, ahy: { level: true, lv: i, id } }); }
  hx.restore();
}

/** La plaque des règles (en signes, sans un mot) ou le registre des parties, ouverts devant soi ; un clic les referme. */
function panel(r, ctx, kind, t) {
  ctx.fillStyle = rgba(0, 0, 0, 0.55); ctx.fillRect(0, 0, W, H);
  if (kind === "rules") { const x0 = 170, y0 = 70, w = 300, h = 210, g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, "#b08a48"); g.addColorStop(1, "#6e5226"); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = "#e0bc78"; ctx.lineWidth = 2; ctx.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
    const ink = [44, 30, 12], P3 = { beetle: [320, 104], pen: [392, 168], page: [248, 168] }; /* le cycle : chaque signe bat le suivant */
    for (const k of AH.SIGNS) anySign(ctx, k, ...P3[k], 15, ink, 0.95, false);
    const arrow = (a, b) => { const [x1, y1] = a, [x2, y2] = b, d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d, sx = x1 + ux * 24, sy = y1 + uy * 24, ex = x2 - ux * 24, ey = y2 - uy * 24; ctx.strokeStyle = rgba(...ink, 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * 7 - uy * 4, ey - uy * 7 + ux * 4); ctx.lineTo(ex - ux * 7 + uy * 4, ey - uy * 7 - ux * 4); ctx.closePath(); ctx.fillStyle = rgba(...ink, 0.9); ctx.fill(); };
    arrow(P3.beetle, P3.pen); arrow(P3.pen, P3.page); arrow(P3.page, P3.beetle);
    for (let i = 0; i < 3; i++) anySign(ctx, "pen", 268 + i * 22, 240, 8, ink, 0.95, false); ctx.strokeStyle = rgba(...ink, 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(342, 234); ctx.lineTo(352, 240); ctx.lineTo(342, 246); ctx.stroke(); /* trois d'un même signe → */
    ctx.fillStyle = rgba(...ink, 0.9); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 4.5 : 10; ctx.lineTo(372 + Math.cos(a) * rr, 240 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); } /* l'étoile de la victoire */
  else { const T = TR(r), log = cur(r).log || [], x0 = 150, y0 = 40, w = 340, h = 280; ctx.fillStyle = "#e8dcbc"; ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = "#8a6a40"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 6, y0 + 6, w - 12, h - 12);
    ctx.fillStyle = "#3a2410"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.font = "italic 15px Georgia, serif"; ctx.fillText(T("ahy.ledger"), x0 + w / 2, y0 + 30);
    ctx.font = "12px Georgia, serif"; ctx.textAlign = "left";
    if (!log.length) { ctx.textAlign = "center"; ctx.fillStyle = "#7a6040"; ctx.fillText(T("ahy.ledger.empty"), x0 + w / 2, y0 + 70); }
    log.slice(0, 11).forEach((e, i) => { const y = y0 + 56 + i * 20, d = new Date(e.at), dt = d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      ctx.fillStyle = "#3a2410"; ctx.fillText(dt, x0 + 18, y); ctx.fillText(T("ahy.ledger.vs", { n: e.n }) + " · " + T("ahy.lvl." + e.level), x0 + 128, y);
      anySign(ctx, e.by || "pen", x0 + 278, y - 4, 5.5, [58, 36, 16], 0.9, false); ctx.fillStyle = e.won ? "#2a5a2a" : "#7a2a1a"; ctx.fillText(e.won ? "✓" : "✗", x0 + 298, y); });
    ctx.textAlign = "left"; }
  r.hot.push({ x: 0, y: 0, w: W, h: H, ahy: { close: true } }); void t;
}

/* ---- dans les pièces ---- */
/** Dans la serre (l'accord) : la table de pierre à cinq branches, au fond de l'allée, son anneau qui luit à peine. */
function inSerre(r, ctx, t, night) {
  const x = 330, y = 272, s = 0.2, T = TR(r);
  ctx.save(); ctx.translate(x, y); ctx.scale(1.25, 1.25);
  ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.beginPath(); ctx.ellipse(3, 14, 34, 6, 0, 0, TAU); ctx.fill(); /* l'ombre */
  ctx.fillStyle = "#4a3e32"; ctx.fillRect(-6, -2, 12, 15); ctx.fillStyle = "#3a3028"; ctx.beginPath(); ctx.ellipse(0, 13, 12, 3, 0, 0, TAU); ctx.fill(); /* le pied */
  const poly = (rx, ry, dy) => { ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * TAU / 5, b = a + TAU / 10, a2 = a + TAU / 5, Q = (ang, f) => [Math.cos(ang) * rx * f, dy + Math.sin(ang) * ry * f]; const tip = Q(a, 1), v = Q(b, 0.5), tip2 = Q(a2, 1), c1 = Q(a + TAU / 20, 0.66), c2 = Q(b + TAU / 20, 0.66); if (!k) ctx.moveTo(...tip); ctx.quadraticCurveTo(...c1, ...v); ctx.quadraticCurveTo(...c2, ...tip2); } ctx.closePath(); };
  ctx.fillStyle = "#2c2118"; poly(RX * s * 0.62, RY * s * 0.42, 2.5); ctx.fill(); /* la tranche */
  ctx.fillStyle = "#6a5644"; poly(RX * s * 0.62, RY * s * 0.42, 0); ctx.fill(); ctx.strokeStyle = "#b07c3c"; ctx.lineWidth = 1; ctx.stroke(); /* le plateau, cerclé de bronze */
  const fl = 0.75 + 0.25 * Math.sin(t * 1.7), gl = ctx.createRadialGradient(0, -1, 0, 0, -1, 10); gl.addColorStop(0, rgba(170, 205, 235, (0.45 + 0.3 * night) * fl)); gl.addColorStop(1, rgba(120, 170, 220, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(0, -1, 10, 4, 0, 0, TAU); ctx.fill(); /* la vasque */
  ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = rgba(150, 185, 225, (0.22 + 0.25 * night) * fl); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -11, 7, 0, TAU); ctx.stroke(); /* l'anneau, debout */
  for (const [k, dx, dy] of [["beetle", 0, -18], ["page", -6, -7], ["pen", 6, -7]]) { const c = HC[k]; ctx.fillStyle = rgba(c[0], c[1], c[2], (0.35 + 0.3 * night) * fl); ctx.beginPath(); ctx.arc(dx, dy, 1.1, 0, TAU); ctx.fill(); }
  ctx.restore();
  r.hot.push({ x: x - 36, y: y - 30, w: 72, h: 48, tip: T("ahy.table"), go: "ahyoheek" }); r.ahy = { ...(r.ahy || {}), from: "serre" };
}
/** Sur le bureau (le commandement) : la même table, en réduction, sur un socle de laiton, à gauche du livre. c : la teinte de la pièce. */
function onDesk(r, ctx, c, t) {
  const x = 46, y = 322, T = TR(r);
  ctx.save(); ctx.translate(x, y); ctx.scale(1.35, 1.35);
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.ellipse(3, 9, 30, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = c("#5a3c1e"); ctx.beginPath(); ctx.ellipse(0, 6, 26, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = c("#b08a3a"); ctx.beginPath(); ctx.ellipse(0, 3, 26, 6, 0, 0, TAU); ctx.fill(); /* le socle */
  const poly = (rx, ry, dy) => { ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * TAU / 5, b = a + TAU / 10, a2 = a + TAU / 5, Q = (ang, f) => [Math.cos(ang) * rx * f, dy + Math.sin(ang) * ry * f]; const tip = Q(a, 1), v = Q(b, 0.5), tip2 = Q(a2, 1), c1 = Q(a + TAU / 20, 0.66), c2 = Q(b + TAU / 20, 0.66); if (!k) ctx.moveTo(...tip); ctx.quadraticCurveTo(...c1, ...v); ctx.quadraticCurveTo(...c2, ...tip2); } ctx.closePath(); };
  ctx.fillStyle = c("#2c2118"); poly(24, 9, 1.5); ctx.fill(); ctx.fillStyle = c("#5e4c3a"); poly(24, 9, -1); ctx.fill(); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 0.9; ctx.stroke();
  const fl = 0.75 + 0.25 * Math.sin(t * 1.7); ctx.globalCompositeOperation = "lighter";
  const gl = ctx.createRadialGradient(0, -1, 0, 0, -1, 8); gl.addColorStop(0, rgba(170, 205, 235, 0.5 * fl)); gl.addColorStop(1, rgba(120, 170, 220, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(0, -1, 8, 3, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(150, 185, 225, 0.4 * fl); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -9, 6, 0, TAU); ctx.stroke();
  for (const [k, dx, dy] of [["beetle", 0, -15], ["page", -5, -6], ["pen", 5, -6]]) { const cc = HC[k]; ctx.fillStyle = rgba(cc[0], cc[1], cc[2], 0.55 * fl); ctx.beginPath(); ctx.arc(dx, dy, 1, 0, TAU); ctx.fill(); }
  ctx.restore();
  r.hot.push({ x: x - 40, y: y - 30, w: 80, h: 46, tip: T("ahy.table"), go: "ahyoheek" }); r.ahy = { ...(r.ahy || {}), from: "desk" };
}

/** Sur le manteau de la cheminée : un petit projecteur de bronze, et au-dessus l'anneau des trois signes en miniature, qui tourne d'un cran et vacille. */
function onMantel(r, ctx, x, y, t) {
  const T = TR(r), gl = glitchOf(t, 31), fl = (0.85 + 0.15 * Math.sin(t * 19) * Math.sin(t * 6.1)) * gl.a, cy = y - 22, R = 11;
  ctx.save();
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.ellipse(x + 1.5, y - 0.5, 11, 2.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#4a3418"; ctx.fillRect(x - 9, y - 5, 18, 5); ctx.fillStyle = "#a8783a"; ctx.beginPath(); ctx.ellipse(x, y - 5, 9, 2.4, 0, 0, TAU); ctx.fill(); /* le socle */
  ctx.fillStyle = rgba(150, 190, 240, 0.7 * fl); ctx.beginPath(); ctx.ellipse(x, y - 5, 5, 1.3, 0, 0, TAU); ctx.fill(); /* la lentille */
  ctx.globalCompositeOperation = "lighter";
  const beam = ctx.createLinearGradient(0, y - 5, 0, cy - R); beam.addColorStop(0, rgba(140, 180, 230, 0.22 * fl)); beam.addColorStop(1, rgba(140, 180, 230, 0)); ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(x - 4, y - 5); ctx.lineTo(x - R - 3, cy - R); ctx.lineTo(x + R + 3, cy - R); ctx.lineTo(x + 4, y - 5); ctx.closePath(); ctx.fill();
  const el = r.opts && r.opts.reducedMotion ? 0 : t / 3, kk = Math.floor(el), fe = Math.min(1, (el - kk) / 0.07), rot = ((kk % 3) + 1 - (1 - fe) ** 3) * TAU / 3, dx = gl.on ? (q("mg" + gl.tick) - 0.5) * 4 : 0;
  const pos = { beetle: -Math.PI / 2 + rot, pen: Math.PI / 6 + rot, page: Math.PI * 5 / 6 + rot };
  ctx.strokeStyle = rgba(150, 185, 225, 0.5 * fl); ctx.lineWidth = 0.9; const ang = [pos.beetle, pos.pen, pos.page]; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + dx, cy, R, ang[i] + 0.45, (i < 2 ? ang[i + 1] : ang[0] + TAU) - 0.45); ctx.stroke(); }
  for (const k of AH.SIGNS) { const c = HC[k]; anySign(ctx, k, x + dx + Math.cos(pos[k]) * R, cy + Math.sin(pos[k]) * R, k === "beetle" ? 3.6 : 3.4, k === "beetle" ? c : up(c, 40), 0.85 * fl, true); }
  const g = ctx.createRadialGradient(x, cy, 0, x, cy, 6); g.addColorStop(0, rgba(170, 205, 245, 0.5 * fl)); g.addColorStop(1, rgba(170, 205, 245, 0)); ctx.fillStyle = g; ctx.fillRect(x - 6, cy - 6, 12, 12); /* le cœur, où serait le glyphe */
  ctx.restore();
  r.hot.push({ x: x - 18, y: cy - R - 8, w: 36, h: y - cy + R + 8, tip: T("ahy.mantel"), go: "ahyoheek" }); r.ahy = { ...(r.ahy || {}), from: "cabin" };
}

module.exports = { onMantel, drawGame, inSerre, onDesk, act, state, GLYPH, HC };
