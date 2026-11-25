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
/** Les figurines posées aux places occupées, en trois jeux (on change de jeu en touchant l'une d'elles) :
 *  0, des statuettes en robe de guilde, une écharpe de couleur par caractère ; 1, des stèles gravées, une lettre D'ni par caractère ;
 *  2, des lampes-tambours miniatures, le verre teinté par caractère. Sur le socle, le chiffre D'ni de la place. */
const FIG_COL = { faithful: [90, 140, 220], mimic: [90, 190, 120], sly: [210, 80, 60], collector: [225, 170, 60], wary: [150, 100, 200] };
const FIG_LETTER = { faithful: "b", mimic: "d", sly: "g", collector: "k", wary: "t" };
const FIGS = 3;
function figurine(ctx, x, y, char, num, set = 0, fam = null, a = 1) {
  const c = FIG_COL[char] || FIG_COL.wary;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(1.3, 1.3); x = 0; y = 0;
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.ellipse(x + 1.5, y + 1.5, 9, 3, 0, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(x - 8, 0, x + 8, 0); g.addColorStop(0, "#4e4436"); g.addColorStop(0.4, "#a8977a"); g.addColorStop(1, "#3e362a");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 8, 2.8, 0, 0, TAU); ctx.fill(); ctx.fillRect(x - 8, y - 4, 16, 4); ctx.fillStyle = "#b8a888"; ctx.beginPath(); ctx.ellipse(x, y - 4, 8, 2.8, 0, 0, TAU); ctx.fill(); /* le socle */
  if (set === 1) { /* la stèle : une dalle à sommet arrondi, la lettre du caractère gravée et un peu dorée */
    const sg = ctx.createLinearGradient(x - 6, 0, x + 6, 0); sg.addColorStop(0, "#5a5040"); sg.addColorStop(0.45, "#b0a080"); sg.addColorStop(1, "#4a4232"); ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(x - 5.5, y - 4); ctx.lineTo(x - 5, y - 18); ctx.quadraticCurveTo(x, y - 25, x + 5, y - 18); ctx.lineTo(x + 5.5, y - 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(40, 30, 18, 0.6); ctx.lineWidth = 0.6; ctx.stroke();
    if (fam) { ctx.font = `11px ${fam}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = rgba(c[0], c[1], c[2], 0.95); ctx.fillText(FIG_LETTER[char] || "b", x, y - 13); }
    else { ctx.fillStyle = rgba(c[0], c[1], c[2], 0.95); ctx.beginPath(); ctx.arc(x, y - 13, 2.2, 0, TAU); ctx.fill(); } }
  else if (set === 2) { /* la lampe-tambour : un tambour de verre teinté entre deux bagues de laiton, qui luit doucement */
    const glow = ctx.createRadialGradient(x, y - 13, 1, x, y - 13, 16); glow.addColorStop(0, rgba(c[0], c[1], c[2], 0.35)); glow.addColorStop(1, rgba(c[0], c[1], c[2], 0)); ctx.fillStyle = glow; ctx.fillRect(x - 16, y - 29, 32, 32);
    ctx.fillStyle = "#3a2a16"; ctx.fillRect(x - 0.8, y - 7, 1.6, 3); /* la tige */
    const gl = ctx.createLinearGradient(x - 5, 0, x + 5, 0); gl.addColorStop(0, rgba(c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 1)); gl.addColorStop(0.45, rgba(Math.min(255, c[0] + 70), Math.min(255, c[1] + 70), Math.min(255, c[2] + 70), 1)); gl.addColorStop(1, rgba(c[0] * 0.45, c[1] * 0.45, c[2] * 0.45, 1));
    ctx.fillStyle = gl; ctx.fillRect(x - 5, y - 18, 10, 11);
    ctx.strokeStyle = rgba(40, 26, 10, 0.55); ctx.lineWidth = 0.6; for (const dx of [-2.5, 0, 2.5]) { ctx.beginPath(); ctx.moveTo(x + dx, y - 18); ctx.lineTo(x + dx, y - 7); ctx.stroke(); } /* les plombs */
    ctx.fillStyle = "#c99a52"; ctx.beginPath(); ctx.ellipse(x, y - 7, 6, 1.8, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y - 18, 6, 1.8, 0, 0, TAU); ctx.fill(); /* les bagues */
    ctx.fillStyle = "#8a6430"; ctx.beginPath(); ctx.moveTo(x - 4, y - 19); ctx.quadraticCurveTo(x, y - 25, x + 4, y - 19); ctx.closePath(); ctx.fill(); /* le petit dôme */ }
  else { /* la statuette en robe de guilde : une robe longue et évasée, un capuchon, une écharpe de couleur en travers */
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.quadraticCurveTo(x - 4.5, y - 13, x - 3, y - 17); ctx.lineTo(x + 3, y - 17); ctx.quadraticCurveTo(x + 4.5, y - 13, x + 6, y - 4); ctx.closePath(); ctx.fill(); /* la robe */
    ctx.beginPath(); ctx.arc(x, y - 19.5, 3.3, 0, TAU); ctx.fill(); /* la tête */
    ctx.fillStyle = "#6a5c46"; ctx.beginPath(); ctx.moveTo(x - 4, y - 17); ctx.quadraticCurveTo(x - 4.2, y - 24.5, x, y - 24.5); ctx.quadraticCurveTo(x + 4.2, y - 24.5, x + 4, y - 17); ctx.quadraticCurveTo(x, y - 19, x - 4, y - 17); ctx.fill(); /* le capuchon */
    ctx.fillStyle = "#1c1810"; ctx.beginPath(); ctx.ellipse(x, y - 19.5, 2, 2.2, 0, 0, TAU); ctx.fill(); /* le visage, dans l'ombre */
    ctx.fillStyle = rgba(c[0], c[1], c[2], 1); ctx.beginPath(); ctx.moveTo(x - 3.4, y - 16.5); ctx.lineTo(x - 1.6, y - 16.5); ctx.lineTo(x + 5.2, y - 6); ctx.lineTo(x + 3.2, y - 5.6); ctx.closePath(); ctx.fill(); /* l'écharpe, de l'épaule à la hanche */ }
  numeral(ctx, num, x, y - 2, 4.4, "#2a2216"); /* le chiffre de la place, gravé sur le socle */
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
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#140d08"); bg.addColorStop(0.35, "#22160d"); bg.addColorStop(1, "#3a2414"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < 14; k++) { const y0 = 70 + k * k * 1.75, h = 3 + k * 1.3, w = 22 + k * 5.5, off = (k % 2) * w / 2; for (let x = -w + off; x < W + w; x += w) { const v = q("b" + k + "_" + Math.round(x)); ctx.fillStyle = rgba(96 + v * 50, 54 + v * 26, 30 + v * 12, 0.12 + k * 0.022); ctx.fillRect(x + 1, y0 + 1, w - 2, h - 1); } } /* les briques, en perspective */
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

/** L'écran des scores, à la manière de l'Imageur mural : une dalle de pierre sombre contre le mur, à droite de la table, entre deux montants
 *  de laiton ; en haut un médaillon en étoile ; au centre un grand médaillon ovale, gravé d'un motif D'ni, où les lignes s'allument en lumière
 *  pâle (une par place : son chiffre, ses signes gagnés, ses points de la manche) ; en bas l'œilleton rond, et autour quatre pastilles pour le
 *  niveau (1, 2, 3, puis le rang). Table en attente : le médaillon montre les dernières parties du registre (un clic l'ouvre en entier). */
function screen(r, ctx, hx, G, seats, reveal, between, t, hv) {
  const cx = 595, cy = 102, ox = 38, oy = 54, A = [G.me, ...G.opp], c0 = cur(r), fl = 0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 3.7);
  const sx0 = 553, sx1 = 637, sy0 = 14, sy1 = 200; /* la dalle */
  const sl = ctx.createLinearGradient(sx0, 0, sx1, 0); sl.addColorStop(0, "#15120f"); sl.addColorStop(0.5, "#24201b"); sl.addColorStop(1, "#13100d"); ctx.fillStyle = sl; ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
  for (let i = 0; i < 70; i++) { ctx.fillStyle = rgba(0, 0, 0, 0.12 + q("sg" + i) * 0.12); ctx.fillRect(sx0 + q("sx" + i) * (sx1 - sx0), sy0 + q("sy" + i) * (sy1 - sy0), 1 + q("sw" + i) * 2, 1 + q("sh" + i) * 2); } /* le grain */
  ctx.strokeStyle = rgba(0, 0, 0, 0.6); ctx.lineWidth = 1; ctx.strokeRect(sx0 + 0.5, sy0 + 0.5, sx1 - sx0 - 1, sy1 - sy0 - 1);
  const brass = (x0, x1) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "#4a3214"); g.addColorStop(0.45, "#b88c48"); g.addColorStop(1, "#4a3214"); return g; };
  for (const mx of [sx0 + 4, sx1 - 9]) { ctx.fillStyle = brass(mx, mx + 5); ctx.fillRect(mx, sy0 + 14, 5, sy1 - sy0 - 28); /* les montants */
    for (const yy of [cy - 30, cy + 30]) { ctx.fillRect(mx + (mx < cx ? 5 : -7), yy - 2, 7, 4); ctx.fillStyle = "#2a1c0c"; ctx.beginPath(); ctx.arc(mx + 2.5, yy, 1.2, 0, TAU); ctx.fill(); ctx.fillStyle = brass(mx, mx + 5); } } /* leurs pattes, qui tiennent le médaillon */
  /* l'ovale : une bague de laiton, l'attache en haut, la queue en bas jusqu'à l'œilleton */
  ctx.fillStyle = brass(cx - 6, cx + 6); ctx.beginPath(); ctx.moveTo(cx - 5, cy - oy - 12); ctx.lineTo(cx + 5, cy - oy - 12); ctx.lineTo(cx + 3, cy - oy); ctx.lineTo(cx - 3, cy - oy); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 14, cy + oy - 4); ctx.lineTo(cx + 14, cy + oy - 4); ctx.lineTo(cx + 8, cy + oy + 18); ctx.lineTo(cx - 8, cy + oy + 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = brass(cx - ox - 4, cx + ox + 4); ctx.beginPath(); ctx.ellipse(cx, cy, ox + 4, oy + 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#0b0c0d"; ctx.beginPath(); ctx.ellipse(cx, cy, ox, oy, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, ox, oy, 0, 0, TAU); ctx.clip(); /* le motif gravé : un treillis fin, deux cercles, quatre petites boucles */
  ctx.strokeStyle = rgba(150, 150, 140, 0.13); ctx.lineWidth = 0.6; for (let k = -12; k <= 12; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 7 - 70, cy - 70); ctx.lineTo(cx + k * 7 + 70, cy + 70); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + k * 7 + 70, cy - 70); ctx.lineTo(cx + k * 7 - 70, cy + 70); ctx.stroke(); }
  ctx.strokeStyle = rgba(170, 170, 160, 0.2); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(cx, cy, ox - 6, oy - 8, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, cy, 9, 13, 0, 0, TAU); ctx.stroke();
  for (const [dx, dy] of [[0, -28], [0, 28], [-19, 0], [19, 0]]) { ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy, 4, 5, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
  /* l'étoile, en haut de la dalle */
  { const x = cx, y = sy0 + 12; ctx.fillStyle = brass(x - 9, x + 9); ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + k * Math.PI / 8, rr = k % 2 ? 4.5 : 9; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.fillStyle = "#2a1c0c"; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill(); }
  /* l'œilleton, sous la queue */
  const ey = cy + oy + 26; ctx.fillStyle = brass(cx - 10, cx + 10); ctx.beginPath(); ctx.arc(cx, ey, 9, 0, TAU); ctx.fill(); ctx.fillStyle = "#0a0d12"; ctx.beginPath(); ctx.arc(cx, ey, 6, 0, TAU); ctx.fill();
  const ink = (a) => rgba(170, 205, 235, a * fl);
  hx.save(); hx.globalCompositeOperation = "lighter";
  const lens = hx.createRadialGradient(cx - 2, ey - 2, 0.5, cx, ey, 6); lens.addColorStop(0, rgba(150, 200, 255, 0.6 * fl)); lens.addColorStop(1, rgba(40, 80, 140, 0.1)); hx.fillStyle = lens; hx.beginPath(); hx.arc(cx, ey, 6, 0, TAU); hx.fill();
  hx.fillStyle = rgba(70, 110, 160, 0.07 * fl); hx.beginPath(); hx.ellipse(cx, cy, ox, oy, 0, 0, TAU); hx.fill(); /* la lueur du médaillon allumé */
  const rows = Math.max(seats.length, 1), gap = Math.min(18, 76 / rows), yA = cy - (gap * (rows - 1)) / 2;
  if (G.round === 0 && !r.ahy.clock && (c0.log || []).length) { /* en attente : le registre */
    const L5 = (c0.log || []).slice(0, 5), gp = 17, yb = cy - (gp * (L5.length - 1)) / 2;
    L5.forEach((e, i) => { const y = yb + i * gp; anySign(hx, e.by || "pen", cx - 18, y, 5, HC[e.by || "pen"], 0.8 * fl, true); numeral(hx, e.n, cx + 2, y, 9, ink(0.75));
      hx.fillStyle = e.won ? rgba(255, 210, 120, 0.85 * fl) : ink(0.22); hx.beginPath(); hx.arc(cx + 20, y, 3, 0, TAU); hx.fill(); });
    r.hot.push({ x: cx - ox, y: cy - oy, w: 2 * ox, h: 2 * oy, ahy: { panel: "ledger", id: "screen" } }); if (hv("screen")) hoverGlow(ctx, cx, cy, 52, [150, 200, 245]); }
  else seats.forEach((k, i) => { const p = A[i], y = yA + i * gap, win = !!(G.winners && G.winners.includes(i)); /* les scores, une ligne par place */
    if (win) { const g = hx.createLinearGradient(cx - 34, 0, cx + 34, 0); g.addColorStop(0, rgba(255, 200, 110, 0)); g.addColorStop(0.5, rgba(255, 200, 110, 0.2 * fl)); g.addColorStop(1, rgba(255, 200, 110, 0)); hx.fillStyle = g; hx.fillRect(cx - 34, y - 8, 68, 16); }
    numeral(hx, k + 1, cx - 26, y, 7, ink(i === 0 ? 0.95 : 0.6));
    AH.SIGNS.forEach((sg, j) => { const n = p.won[sg] || 0, xx = cx - 12 + j * 12; anySign(hx, sg, xx, y - 3, 2.9, HC[sg], (n ? 0.85 : 0.28) * fl, true); numeral(hx, n, xx, y + 4.5, 4.5, n >= 3 ? rgba(255, 210, 120, fl) : ink(n ? 0.75 : 0.28)); });
    if (reveal && p.pts != null) numeral(hx, p.pts, cx + 27, y, 6.5, p.pts > 0 ? rgba(255, 210, 120, fl) : ink(0.45), p.pts < 0); });
  /* les quatre pastilles du niveau, en arc autour de l'œilleton */
  const LV = ["easy", "mid", "hard", "rank"], li = LV.indexOf(c0.level);
  for (let i = 0; i < 4; i++) { const a = Math.PI * (0.95 - i * 0.3), kx = cx + Math.cos(a) * 25, ky = ey + Math.sin(a) * 6 + 5, on = i === li, id = "lv" + i;
    ctx.fillStyle = "#6a4a20"; ctx.beginPath(); ctx.arc(kx, ky, 6, 0, TAU); ctx.fill(); ctx.fillStyle = "#14100c"; ctx.beginPath(); ctx.arc(kx, ky, 4.8, 0, TAU); ctx.fill();
    if (on) { const g = hx.createRadialGradient(kx, ky, 0.5, kx, ky, 9); g.addColorStop(0, rgba(255, 200, 110, 0.45 * fl)); g.addColorStop(1, rgba(255, 200, 110, 0)); hx.fillStyle = g; hx.fillRect(kx - 9, ky - 9, 18, 18); }
    numeral(hx, i < 3 ? i + 1 : c0.rank, kx, ky, 5.5, on ? rgba(255, 220, 140, fl) : ink(0.5)); /* 1, 2, 3 ; puis le rang lui-même */
    if (hv(id)) hoverGlow(ctx, kx, ky, 12, [150, 200, 245]);
    if (between) r.hot.push({ x: kx - 7, y: ky - 7, w: 14, h: 14, ahy: { level: true, lv: i, id } }); }
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
