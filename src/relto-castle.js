"use strict";
// Le Château (page page_castle) : gothique romantique, à la manière du XIXe siècle qui rêve de cathédrales. Granit clair et ardoise
// dehors ; dedans, la pierre en haut des murs, le noyer (lambris, galerie, escalier à vis, parquet), le fer forgé, le velours et l'or
// patiné, la chandelle pour lumière. Rien de ruiné. Comme la Verrière : le même mobilier, un autre habit ; aucune zone cliquable ne
// bouge (test/castle.test.js). Maquette et décisions : claude/DESIGN-chateau-gothique.md (Projet).
const { rng, clamp, mix, rgba } = require("./util");

const STONE = "#6e6876", STONE_HI = "#9a95a3", STONE_LO = "#3e3a46";
const WALNUT = "#3a2619", WALNUT_HI = "#5a3a26", WALNUT_LO = "#1e130d";
const IRON = "#23212a", GOLD = "#c9a24e", GOLD_HI = "#e8c97a", VELVET = "#7a1f2b", VELVET_LO = "#4a1020", PURPLE = "#4a1830";

/** Un arc brisé : piédroits de `base` à `spring`, puis deux arcs qui se rejoignent en `apex`. Chemin seul (à remplir, tracer ou découper). */
function pointed(ctx, xa, xb, apex, spring, base) {
  const m = (xa + xb) / 2, k = (xb - xa) * 0.12;
  ctx.beginPath(); ctx.moveTo(xa, base); ctx.lineTo(xa, spring);
  ctx.quadraticCurveTo(xa + k, apex + (spring - apex) * 0.25, m, apex);
  ctx.quadraticCurveTo(xb - k, apex + (spring - apex) * 0.25, xb, spring);
  ctx.lineTo(xb, base);
}

/** Un appareil de pierre : assises et joints, dans le rectangle (x, y, w, h). */
function ashlar(ctx, c, x, y, w, h, base = STONE, rowH = 16, seed = 0x5a5e) {
  const q = rng(seed);
  ctx.fillStyle = c(base); ctx.fillRect(x, y, w, h);
  for (let yy = y, row = 0; yy < y + h; yy += rowH, row++) {
    for (let xx = x - (row % 2) * 18; xx < x + w; xx += 36) { const v = q(); ctx.fillStyle = rgba(v < 0.5 ? 255 : 0, v < 0.5 ? 245 : 0, 235, 0.025 + q() * 0.045); ctx.fillRect(Math.max(x, xx), yy, Math.min(36, x + w - xx), Math.min(rowH, y + h - yy)); }
    ctx.fillStyle = rgba(0, 0, 0, 0.26); ctx.fillRect(x, yy, w, 1);
    for (let xx = x - (row % 2) * 18; xx < x + w; xx += 36) if (xx > x) ctx.fillRect(xx, yy, 1, Math.min(rowH, y + h - yy));
  }
}

/** Des lambris de noyer : panneaux encadrés, une cimaise à filet d'or en haut. */
function wainscot(ctx, c, x, y, w, h, panel = 64) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c(WALNUT)); g.addColorStop(1, c(WALNUT_LO)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  for (let xx = x + 6; xx + panel - 6 <= x + w; xx += panel) {
    ctx.strokeStyle = rgba(0, 0, 0, 0.4); ctx.lineWidth = 2; ctx.strokeRect(xx, y + 10, panel - 12, h - 20);
    ctx.strokeStyle = rgba(255, 220, 170, 0.06); ctx.lineWidth = 1; ctx.strokeRect(xx + 4, y + 14, panel - 20, h - 28);
    ctx.strokeStyle = rgba(0, 0, 0, 0.28); ctx.beginPath(); ctx.moveTo(xx + (panel - 12) / 2, y + 18); ctx.lineTo(xx + (panel - 12) / 2 - 6, y + h / 2); ctx.lineTo(xx + (panel - 12) / 2, y + h - 18); ctx.lineTo(xx + (panel - 12) / 2 + 6, y + h / 2); ctx.closePath(); ctx.stroke(); // un losange sculpté
  }
  ctx.fillStyle = c(WALNUT_HI); ctx.fillRect(x, y - 3, w, 5); ctx.fillStyle = c(GOLD); ctx.fillRect(x, y - 3, w, 1.1);
}

/** Les murs de la cabane : pierre appareillée en haut, poutres de noyer au plafond, lambris de noyer à mi-hauteur. */
function cabinWalls(r, ctx, c, sky, t, FLOOR) {
  const W = 640, RAIL = 168;
  ashlar(ctx, c, 0, 0, W, RAIL, STONE, 16, 0xca57);
  ctx.fillStyle = c(WALNUT_LO); ctx.fillRect(0, 0, W, 20); ctx.fillStyle = c(WALNUT); ctx.fillRect(0, 17, W, 4); ctx.fillStyle = c(GOLD); ctx.fillRect(0, 20, W, 0.9);
  for (const x of [120, 320, 520]) { // les poutres, sur des corbeaux de pierre
    ctx.fillStyle = c(WALNUT_LO); ctx.fillRect(x - 9, 0, 18, 30); ctx.fillStyle = c(WALNUT); ctx.fillRect(x - 9, 0, 3, 30);
    ctx.fillStyle = c(STONE_HI); ctx.beginPath(); ctx.moveTo(x - 12, 30); ctx.lineTo(x + 12, 30); ctx.lineTo(x + 6, 40); ctx.lineTo(x - 6, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(x - 6, 38, 12, 2);
  }
  wainscot(ctx, c, 0, RAIL, W, FLOOR - RAIL, 64);
}

/** Le sol : un parquet de noyer en pointe de Hongrie, en perspective ; un seuil de dalles devant la porte. */
function cabinFloor(ctx, c, FLOOR, H = 360, W = 640, threshold = true) {
  const g = ctx.createLinearGradient(0, FLOOR, 0, H); g.addColorStop(0, c("#4a3222")); g.addColorStop(1, c("#1f140d")); ctx.fillStyle = g; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  const rows = [FLOOR, FLOOR + 12, FLOOR + 26, FLOOR + 43, FLOOR + 64, FLOOR + 90, H];
  ctx.strokeStyle = rgba(0, 0, 0, 0.32); ctx.lineWidth = 1;
  for (let i = 0; i + 1 < rows.length; i++) {
    const y0 = rows[i], y1 = rows[i + 1], hh = y1 - y0, step = hh * 1.6;
    ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(W, y1); ctx.stroke();
    for (let x = -step + ((i % 2) * step) / 2; x < W + step; x += step) { ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + step / 2, y0); ctx.lineTo(x + step, y1); ctx.stroke(); }
  }
  ctx.fillStyle = rgba(255, 220, 170, 0.035); for (let i = 0; i < 6; i++) ctx.fillRect(0, rows[i] + 1, W, 1);
  if (!threshold) return;
  // le seuil : des dalles de pierre devant la porte
  const sx = 0, sw = 112; const sg = ctx.createLinearGradient(0, FLOOR, 0, H); sg.addColorStop(0, c("#4a4752")); sg.addColorStop(1, c("#25232b")); ctx.fillStyle = sg;
  ctx.beginPath(); ctx.moveTo(sx, FLOOR); ctx.lineTo(sx + sw, FLOOR); ctx.lineTo(sx + sw + 22, H); ctx.lineTo(sx, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(0, 0, 0, 0.35); for (const y of [FLOOR + 22, FLOOR + 54]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sw + (y - FLOOR) * 0.2, y); ctx.stroke(); }
  for (const [x, y0, y1] of [[52, FLOOR, FLOOR + 22], [30, FLOOR + 22, FLOOR + 54], [80, FLOOR + 22, FLOOR + 54], [56, FLOOR + 54, H]]) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
  ctx.fillStyle = c(WALNUT_HI); ctx.beginPath(); ctx.moveTo(sw, FLOOR); ctx.lineTo(sw + 3, FLOOR); ctx.lineTo(sw + 25, H); ctx.lineTo(sw + 22, H); ctx.closePath(); ctx.fill();
}

/** Un tapis pourpre à galon d'or et lys aux points cardinaux. */
function rug(ctx, c, cx, cy, rx, ry, field = PURPLE) {
  ctx.fillStyle = c(field); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c(VELVET_LO); ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy, rx - 4, ry - 2.5, 0, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(cx, cy, rx - 12, ry - 5, 0, 0, 6.283); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.78, ry * 0.6, 0, 0, 6.283); ctx.stroke();
  ctx.fillStyle = c(GOLD); for (const [dx, dy, s] of [[0, -ry * 0.6, 1], [0, ry * 0.6, 1], [-rx * 0.78, 0, 0.8], [rx * 0.78, 0, 0.8], [0, 0, 1.3]]) lys(ctx, cx + dx, cy + dy, 3.2 * s);
}

/** Un petit lys héraldique (vu de face, écrasé pour le sol ou droit pour un mur), centré en (x, y). */
function lys(ctx, x, y, s, flat = true) {
  const k = flat ? 0.45 : 1;
  ctx.beginPath(); ctx.moveTo(x, y - 2 * s * k); ctx.quadraticCurveTo(x + s * 0.8, y - s * k, x, y + s * 0.4 * k); ctx.quadraticCurveTo(x - s * 0.8, y - s * k, x, y - 2 * s * k); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 1.6, y - s * 1.2 * k, x + s * 1.3, y + s * 0.5 * k); ctx.quadraticCurveTo(x + s * 0.7, y + s * 0.2 * k, x, y + s * 0.3 * k); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - s * 1.6, y - s * 1.2 * k, x - s * 1.3, y + s * 0.5 * k); ctx.quadraticCurveTo(x - s * 0.7, y + s * 0.2 * k, x, y + s * 0.3 * k); ctx.fill();
  ctx.fillRect(x - s * 0.9, y + s * 0.35 * k, s * 1.8, Math.max(0.6, s * 0.3 * k));
}

/** La fenêtre de la cabane : une fenêtre en arc brisé (le ciel se dessine dans ce découpage). */
function cabinWindowClip(ctx, wx, wy, ww, wh) { pointed(ctx, wx, wx + ww, wy - 28, wy + 6, wy + wh); ctx.closePath(); }
/** L'encadrement : pierre moulurée, meneau et traverse, un vitrail rouge et violet dans l'arc (rosace, deux lancettes, une chauve-souris devant la lune). */
function cabinWindowFrame(ctx, c, sky, wx, wy, ww, wh) {
  const head = wy + 18, night = clamp(sky.night == null ? 0.3 : sky.night);
  ctx.save(); cabinWindowClip(ctx, wx, wy, ww, wh); ctx.clip(); // le vitrail : la tête de l'arc, au-dessus de la traverse
  const gg = ctx.createLinearGradient(0, wy - 28, 0, head); gg.addColorStop(0, c(PURPLE)); gg.addColorStop(1, c(VELVET)); ctx.globalAlpha = 0.78 + 0.12 * night; ctx.fillStyle = gg; ctx.fillRect(wx, wy - 30, ww, head - wy + 30); ctx.globalAlpha = 1;
  const rx = wx + ww / 2, ry = wy - 6, rr = 10;
  ctx.fillStyle = mix(c("#2e4068"), "#9db4d6", 0.25 * night); ctx.beginPath(); ctx.arc(rx, ry, rr, 0, 6.283); ctx.fill();
  ctx.fillStyle = c("#e9eef7"); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(rx + 3, ry - 3, 3.2, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; // la lune
  ctx.fillStyle = c("#120a0e"); ctx.beginPath(); ctx.moveTo(rx - 1, ry + 1); ctx.quadraticCurveTo(rx - 4, ry - 1.5, rx - 7.5, ry + 0.5); ctx.quadraticCurveTo(rx - 4.5, ry + 1, rx - 1, ry + 3); ctx.quadraticCurveTo(rx + 2.5, ry + 1, rx + 5.5, ry + 0.5); ctx.quadraticCurveTo(rx + 2, ry - 1.5, rx - 1, ry + 1); ctx.fill(); // une chauve-souris, une seule
  ctx.strokeStyle = rgba(18, 10, 14, 0.9); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(rx, ry, rr, 0, 6.283); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr); ctx.lineTo(rx + Math.cos(a) * (rr + 7), ry + Math.sin(a) * (rr + 7)); ctx.stroke(); }
  for (const s of [-1, 1]) { const lx = rx + s * 22; ctx.fillStyle = c(GOLD); ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(lx, head - 6, 3, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(lx - 5, head); ctx.lineTo(lx - 5, head - 8); ctx.quadraticCurveTo(lx, head - 15, lx + 5, head - 8); ctx.lineTo(lx + 5, head); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = c(IRON); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx, head); ctx.lineTo(wx + ww, head); ctx.moveTo(wx + ww / 2, head); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh * 0.62); ctx.lineTo(wx + ww, wy + wh * 0.62); ctx.stroke(); // meneau et traverses
  ctx.lineWidth = 1; ctx.strokeStyle = rgba(18, 10, 14, 0.5); for (let k = 1; k < 4; k++) { const yy = head + ((wy + wh - head) * k) / 4; ctx.beginPath(); ctx.moveTo(wx, yy); ctx.lineTo(wx + ww, yy); ctx.stroke(); } // les plombs des carreaux
  ctx.strokeStyle = c(STONE); ctx.lineWidth = 8; pointed(ctx, wx - 4, wx + ww + 4, wy - 33, wy + 6, wy + wh + 3); ctx.stroke();
  ctx.strokeStyle = c(STONE_HI); ctx.lineWidth = 1.3; pointed(ctx, wx - 8, wx + ww + 8, wy - 37.5, wy + 6, wy + wh + 3); ctx.stroke();
  ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; pointed(ctx, wx, wx + ww, wy - 28.5, wy + 6, wy + wh); ctx.stroke();
  ctx.fillStyle = c(STONE_HI); ctx.fillRect(wx - 12, wy + wh + 2, ww + 24, 6); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(wx - 12, wy + wh + 7, ww + 24, 2); // l'appui de pierre
}

/** La porte : bois noir sous un arc brisé de pierre, pentures de fer cloutées, un heurtoir à tête de loup. */
function cabinDoor(ctx, c, sky, dx, dy, dw, FLOOR, rise = 20) {
  const apex = dy - rise, spring = dy + 14;
  ctx.fillStyle = c(STONE); pointed(ctx, dx - 7, dx + dw + 7, apex - 8, spring, FLOOR); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c(STONE_HI); ctx.lineWidth = 1.2; pointed(ctx, dx - 7, dx + dw + 7, apex - 8, spring, FLOOR); ctx.stroke();
  for (let y = spring + 8; y < FLOOR; y += 18) { ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(dx - 7, y, 7, 1); ctx.fillRect(dx + dw, y + 9, 7, 1); } // les claveaux des piédroits
  const g = ctx.createLinearGradient(dx, 0, dx + dw, 0); g.addColorStop(0, c("#1e1a1c")); g.addColorStop(1, c("#0e0c0e")); ctx.fillStyle = g; pointed(ctx, dx, dx + dw, apex, spring, FLOOR - 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(0, 0, 0, 0.6); ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { const x = dx + (i * dw) / 4; ctx.beginPath(); ctx.moveTo(x, apex + 8 + Math.abs(i - 2) * 6); ctx.lineTo(x, FLOOR - 2); ctx.stroke(); }
  ctx.strokeStyle = rgba(255, 230, 200, 0.04); for (let i = 1; i < 4; i++) { const x = dx + (i * dw) / 4 + 1; ctx.beginPath(); ctx.moveTo(x, apex + 10 + Math.abs(i - 2) * 6); ctx.lineTo(x, FLOOR - 2); ctx.stroke(); }
  for (const y of [dy + 34, FLOOR - 40]) { // les pentures : une barre de fer qui finit en volute, des clous
    ctx.fillStyle = c(IRON); ctx.fillRect(dx, y - 2.5, dw - 10, 5); ctx.strokeStyle = c(IRON); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(dx + dw - 10, y); ctx.quadraticCurveTo(dx + dw - 2, y - 2, dx + dw - 5, y - 8); ctx.stroke();
    ctx.fillStyle = c("#4a4752"); for (let x = dx + 6; x < dx + dw - 12; x += 11) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 6.283); ctx.fill(); }
  }
  const kx = dx + dw - 16, ky = dy + 74; // le heurtoir : une tête de loup et son anneau, en laiton
  ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.moveTo(kx - 5, ky - 3); ctx.lineTo(kx - 4, ky - 9); ctx.lineTo(kx - 1.5, ky - 5); ctx.lineTo(kx + 1.5, ky - 5); ctx.lineTo(kx + 4, ky - 9); ctx.lineTo(kx + 5, ky - 3); ctx.lineTo(kx + 2, ky + 3); ctx.lineTo(kx - 2, ky + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#17141a"); ctx.fillRect(kx - 2.6, ky - 3, 1.4, 1.4); ctx.fillRect(kx + 1.2, ky - 3, 1.4, 1.4);
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(kx, ky + 8, 5, 0, 6.283); ctx.stroke();
}

/** Le panneau secret derrière la petite bibliothèque : une dalle de pierre et son anneau de fer, enchâssée dans le lambris. */
function slab(ctx, c, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, c("#5e5966")); g.addColorStop(1, c("#3a3741")); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = rgba(0, 0, 0, 0.45); ctx.lineWidth = 1.2; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.strokeStyle = rgba(255, 245, 235, 0.08); ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(x + w * 0.3, y + h * 0.4, w * 0.25, 1); ctx.fillRect(x + w * 0.55, y + h * 0.7, w * 0.3, 1);
  ctx.strokeStyle = c(IRON); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2 + 4, 6, 0, 6.283); ctx.stroke(); ctx.fillStyle = c(IRON); ctx.fillRect(x + w / 2 - 2.5, y + h / 2 - 4, 5, 4);
}

/** Le manteau de la cheminée : pierre claire moulurée, un écusson pourpre à lys d'or sur le conduit. */
function mantel(ctx, c, x, y, w, h, crest = null) {
  ctx.fillStyle = c("#7a7683"); ctx.fillRect(x, y, w, h); ctx.fillStyle = c(STONE_HI); ctx.fillRect(x, y, w, 1.6); ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.fillRect(x, y + h - 2, w, 2);
  for (let xx = x + 8; xx < x + w - 6; xx += 10) { ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(xx, y + h - 4, 5, 2); } // une frise de denticules
  if (crest) { const [ex, ey] = crest; ctx.fillStyle = c(VELVET); ctx.beginPath(); ctx.moveTo(ex - 10, ey); ctx.lineTo(ex + 10, ey); ctx.lineTo(ex + 10, ey + 11); ctx.quadraticCurveTo(ex + 10, ey + 19, ex, ey + 23); ctx.quadraticCurveTo(ex - 10, ey + 19, ex - 10, ey + 11); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(GOLD); ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = c(GOLD); lys(ctx, ex, ey + 11, 3.2, false); }
}

/** Deux chenets de fer en forme de dragon, de part et d'autre du feu. */
function andirons(ctx, c, xa, xb, y) {
  for (const [x, s] of [[xa, 1], [xb, -1]]) {
    ctx.fillStyle = c(IRON); ctx.beginPath(); ctx.moveTo(x - 3 * s, y); ctx.lineTo(x - 3 * s, y - 12); ctx.quadraticCurveTo(x - 2 * s, y - 20, x + 4 * s, y - 20); ctx.lineTo(x + 8 * s, y - 17); ctx.lineTo(x + 4 * s, y - 15); ctx.quadraticCurveTo(x + 1 * s, y - 14, x + 2 * s, y - 8); ctx.lineTo(x + 3 * s, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c(GOLD); ctx.fillRect(x + 4 * s - 0.6, y - 19, 1.2, 1.2);
  }
}

/** L'étagère des Âges : montants de noyer à filet d'or, un fronton en arc brisé à pinacles ; les rayons et les livres à leur place. */
function shelf(ctx, c, x0, w, y0, FLOOR, RH) {
  for (const x of [x0 - 7, x0 + w - 2]) { ctx.fillStyle = c(WALNUT); ctx.fillRect(x, y0 - 8, 9, FLOOR - y0 + 8); ctx.fillStyle = c(GOLD); ctx.fillRect(x + 1, y0 - 8, 1.1, FLOOR - y0 + 8); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x + 7, y0 - 8, 2, FLOOR - y0 + 8); }
  ctx.fillStyle = c(WALNUT); ctx.fillRect(x0 - 7, y0 - 10, w + 14, 10); ctx.fillStyle = c(GOLD); ctx.fillRect(x0 - 7, y0 - 2, w + 14, 1.2);
  ctx.fillStyle = c(WALNUT_LO); pointed(ctx, x0 + w * 0.32, x0 + w * 0.68, y0 - 34, y0 - 14, y0 - 10); ctx.closePath(); ctx.fill(); // le fronton
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 1; pointed(ctx, x0 + w * 0.32, x0 + w * 0.68, y0 - 34, y0 - 14, y0 - 10); ctx.stroke();
  ctx.fillStyle = c(GOLD); lys(ctx, x0 + w / 2, y0 - 19, 3, false);
  for (const x of [x0 - 3, x0 + w + 2]) { ctx.fillStyle = c(WALNUT); ctx.beginPath(); ctx.moveTo(x - 4, y0 - 10); ctx.lineTo(x, y0 - 26); ctx.lineTo(x + 4, y0 - 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(x, y0 - 27, 1.4, 0, 6.283); ctx.fill(); } // pinacles
  for (let rw = 0; rw < 3; rw++) { ctx.fillStyle = c(WALNUT); ctx.fillRect(x0, y0 + RH * (rw + 1) - 3, w, 5); ctx.fillStyle = c(GOLD); ctx.fillRect(x0, y0 + RH * (rw + 1) - 3, w, 0.9); }
}

/** La table : un plateau de chêne noir à filet d'or sur deux tréteaux de fer en X. */
function table(ctx, c, tx, tw, ty) {
  ctx.strokeStyle = c(IRON); ctx.lineWidth = 3; ctx.lineCap = "round";
  for (const x of [tx + 22, tx + tw - 22]) { ctx.beginPath(); ctx.moveTo(x - 12, ty + 56); ctx.quadraticCurveTo(x, ty + 30, x + 12, ty + 6); ctx.moveTo(x + 12, ty + 56); ctx.quadraticCurveTo(x, ty + 30, x - 12, ty + 6); ctx.stroke(); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(x, ty + 31, 1.8, 0, 6.283); ctx.fill(); }
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx + 22, ty + 31); ctx.lineTo(tx + tw - 22, ty + 31); ctx.stroke(); ctx.lineCap = "butt";
  ctx.fillStyle = c("#3a2c24"); ctx.fillRect(tx, ty, tw, 8); ctx.fillStyle = c("#5a4434"); ctx.fillRect(tx, ty, tw, 1.8); ctx.fillStyle = c("#241a14"); ctx.fillRect(tx + 2, ty + 8, tw - 4, 4); ctx.fillStyle = c(GOLD); ctx.fillRect(tx, ty + 6, tw, 1);
}

/** Un chandelier de fer à trois branches ; la chandelle du milieu reste celle de la table (dessinée ensuite à sa place). */
function candelabrum(ctx, c, cx, ty, fl) {
  ctx.strokeStyle = c(IRON); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx + 3.5, ty - 1); ctx.lineTo(cx + 3.5, ty - 6); ctx.moveTo(cx - 6, ty - 10); ctx.quadraticCurveTo(cx + 3.5, ty - 2, cx + 13, ty - 10); ctx.stroke();
  ctx.fillStyle = c(IRON); ctx.beginPath(); ctx.ellipse(cx + 3.5, ty - 0.5, 6, 1.8, 0, 0, 6.283); ctx.fill();
  for (const x of [cx - 8, cx + 11]) { ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(x, ty - 20, 4, 10); const f = clamp(0.75 * fl + 0.2); ctx.fillStyle = rgba(255, 190, 80, f); ctx.beginPath(); ctx.ellipse(x + 2, ty - 24, 1.6, 3.6 * f, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = c(IRON); ctx.fillRect(x - 1, ty - 11, 6, 1.6); }
}

/** Une applique de fer forgé et sa chandelle, au mur ; `glowR` > 0 : sa lueur. */
function sconce(ctx, c, x, y, fl, night, glowR = 46) {
  ctx.strokeStyle = c(IRON); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.quadraticCurveTo(x - 8, y + 8, x, y); ctx.stroke(); ctx.fillStyle = c(IRON); ctx.fillRect(x - 3, y - 1, 6, 2); ctx.fillRect(x - 1.5, y + 13, 3, 5);
  ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(x - 1.5, y - 9, 3, 8); const f = clamp(0.75 * fl + 0.2); ctx.fillStyle = rgba(255, 190, 80, f); ctx.beginPath(); ctx.ellipse(x, y - 12.5, 1.5, 3.4 * f, 0, 0, 6.283); ctx.fill();
  if (glowR > 0) { const g = ctx.createRadialGradient(x, y - 12, 1, x, y - 12, glowR); g.addColorStop(0, rgba(255, 190, 90, (0.1 + 0.22 * night) * fl)); g.addColorStop(1, rgba(255, 190, 90, 0)); ctx.fillStyle = g; ctx.fillRect(x - glowR, y - 12 - glowR, glowR * 2, glowR * 2); }
}

/** Le clair de lune qui tombe de la fenêtre sur le parquet, la nuit. */
function moonPatch(ctx, sky, wx, wy, ww, wh, FLOOR) {
  const n = clamp(sky.night == null ? 0 : sky.night); if (n < 0.2) return;
  ctx.fillStyle = rgba(157, 180, 214, 0.08 * n); ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx + ww + 80, FLOOR + 70); ctx.lineTo(wx + 30, FLOOR + 70); ctx.closePath(); ctx.fill();
}

/** Les murs de l'atelier : pierre appareillée jusqu'au lambris de chêne fumé (à `rail`), le même plancher en pointe de Hongrie. */
function atelierWalls(ctx, c, FLOOR, rail, W = 640) { ashlar(ctx, c, 0, 0, W, rail, STONE, 16, 0xa7e1); wainscot(ctx, c, 0, rail, W, FLOOR - rail, 70); }

/** La galerie : une boiserie de noyer en arcs brisés, à faire derrière les livres (les rayons et les livres restent dessinés par l'atelier). */
function galleryBays(ctx, c, W, GALLERY) {
  ctx.fillStyle = c("#1e130d"); ctx.fillRect(0, 0, W, GALLERY);
  for (let sx = 120; sx < W - 20; sx += 130) {
    ctx.fillStyle = c("#2a1a12"); pointed(ctx, sx - 2, sx + 120, 2, 22, GALLERY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c(GOLD); ctx.lineWidth = 1.1; pointed(ctx, sx - 2, sx + 120, 2, 22, GALLERY); ctx.stroke();
    ctx.fillStyle = c("#140c08"); ctx.fillRect(sx - 10, 0, 7, GALLERY); ctx.fillStyle = c(WALNUT_HI); ctx.fillRect(sx - 10, 0, 1.4, GALLERY); // les pilastres
  }
  ctx.fillStyle = c("#2e1c12"); ctx.fillRect(0, 0, W, 5); ctx.fillStyle = c(GOLD); ctx.fillRect(0, 4, W, 0.8);
}

/** La balustrade de la galerie : noyer sculpté, balustres tournés, médaillons dorés, main courante à filet d'or. */
function balustrade(ctx, c, W, GALLERY) {
  ctx.fillStyle = c(WALNUT); ctx.fillRect(0, GALLERY - 4, W, 8); ctx.fillStyle = c(WALNUT_HI); ctx.fillRect(0, GALLERY + 4, W, 3); // le plancher de la galerie
  for (let x = 6; x < W; x += 24) { // les balustres : un fût renflé, deux bagues
    ctx.fillStyle = c(WALNUT); ctx.fillRect(x, GALLERY + 7, 4, 20);
    ctx.fillStyle = c(WALNUT_HI); ctx.beginPath(); ctx.ellipse(x + 2, GALLERY + 15, 3.4, 4.5, 0, 0, 6.283); ctx.fill(); ctx.fillRect(x - 1, GALLERY + 9, 6, 1.6); ctx.fillRect(x - 1, GALLERY + 22, 6, 1.6);
    if (x % 96 === 54) { ctx.strokeStyle = c(GOLD); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x + 14, GALLERY + 16, 3.4, 0, 6.283); ctx.stroke(); }
  }
  ctx.fillStyle = c(WALNUT_HI); ctx.fillRect(0, GALLERY + 26, W, 4); ctx.fillStyle = c(GOLD); ctx.fillRect(0, GALLERY + 26, W, 1);
}

/** L'escalier à vis de noyer (à la place de l'échelle, dans sa colonne `x`…`x + w`) : fût central, marches qui tournent, limon en hélice, main courante dorée. */
function spiralStair(ctx, c, x, w, top, bottom) {
  const cx = x + w / 2, R = w / 2 + 2, step = 13, n = Math.floor((bottom - top) / step);
  ctx.fillStyle = rgba(0, 0, 0, 0.4); ctx.beginPath(); ctx.ellipse(cx, bottom, R + 5, 4.5, 0, 0, 6.283); ctx.fill();
  const tread = (i, front) => { // une marche : un coin qui part du fût, vu de dessus et de face (son nez)
    const y = bottom - 5 - i * step, side = i % 2 ? -1 : 1, ex = cx + side * R;
    ctx.fillStyle = c(front ? "#6a4a32" : "#3a2619"); ctx.beginPath(); ctx.moveTo(cx, y - 1); ctx.lineTo(ex, y - 6); ctx.lineTo(ex, y - 2); ctx.lineTo(cx, y + 3); ctx.closePath(); ctx.fill(); // le dessus
    ctx.fillStyle = c(front ? "#3a2619" : "#1e130d"); ctx.beginPath(); ctx.moveTo(cx, y + 3); ctx.lineTo(ex, y - 2); ctx.lineTo(ex, y + 2); ctx.lineTo(cx, y + 6); ctx.closePath(); ctx.fill(); // le nez
    if (front) { ctx.fillStyle = c("#8a6448"); ctx.beginPath(); ctx.moveTo(cx, y - 1); ctx.lineTo(ex, y - 6); ctx.lineTo(ex, y - 5); ctx.lineTo(cx, y); ctx.closePath(); ctx.fill(); }
  };
  // la main courante : une hélice, vue de côté (une sinusoïde) ; sa moitié arrière passe derrière le fût
  const helix = (back, col, lw, dy) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round"; let on = false; ctx.beginPath();
    for (let y = bottom - 23; y >= top + 4; y -= 1) { const ph = ((bottom - 23 - y) / step) * Math.PI, xx = cx + Math.cos(ph) * (R - 1), isBack = Math.sin(ph) < 0;
      if (isBack === back) { on ? ctx.lineTo(xx, y + dy) : ctx.moveTo(xx, y + dy); on = true; } else on = false; }
    ctx.stroke(); ctx.lineCap = "butt"; };
  for (let i = 0; i < n; i++) if (i % 2) tread(i, false); // les marches de derrière, la rampe de derrière, puis le fût, puis le devant
  helix(true, c("#2e1d13"), 2.6, 0);
  ctx.fillStyle = c(WALNUT_LO); ctx.fillRect(cx - 3, top, 6, bottom - top); ctx.fillStyle = c(WALNUT_HI); ctx.fillRect(cx - 1.5, top, 1.4, bottom - top);
  for (let y = top + 10; y < bottom; y += 26) { ctx.fillStyle = c(WALNUT_HI); ctx.fillRect(cx - 4, y, 8, 2); } // les bagues du fût
  for (let i = 0; i < n; i++) if (!(i % 2)) tread(i, true);
  for (let i = 0; i < n; i++) if (!(i % 2)) { const y = bottom - 5 - i * step, ex = cx + R - 2; ctx.fillStyle = c(WALNUT_HI); ctx.fillRect(ex - 1, y - 17, 2.2, 12); ctx.beginPath(); ctx.ellipse(ex + 0.1, y - 11, 1.9, 2.8, 0, 0, 6.283); ctx.fill(); } // un balustre tourné au bout des marches de devant
  helix(false, c(WALNUT), 3, 0); helix(false, rgba(201, 162, 78, 0.6), 0.8, -1.2); // la rampe de devant, un filet d'or
  ctx.fillStyle = c(WALNUT_HI); ctx.beginPath(); ctx.arc(cx, top + 1, 3.6, 0, 6.283); ctx.fill(); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(cx, top, 1.5, 0, 6.283); ctx.fill(); // la boule au sommet du fût
  ctx.fillStyle = c(WALNUT); ctx.fillRect(x + w - 4, bottom - 28, 6, 28); ctx.fillStyle = c(WALNUT_HI); ctx.fillRect(x + w - 4, bottom - 28, 1.4, 28); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(x + w - 1, bottom - 31, 2.4, 0, 6.283); ctx.fill(); // le pilastre de départ
}

/** La rosace de pierre (la fenêtre ronde de l'atelier, sous le Château) : un remplage à huit rayons et des pétales rouges dans la couronne ; le clair au milieu. */
function rosette(ctx, c, sky, x, y, r) {
  const ri = r * 0.66, n = 8;
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.arc(x, y, ri, 0, 6.283, true); ctx.clip("evenodd");
  ctx.fillStyle = c(PURPLE); ctx.globalAlpha = 0.8; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.globalAlpha = 1;
  for (let i = 0; i < n; i++) { // des pétales en amande pointue (pas des ovales : sur la planche des chiffres, on les lirait comme des zéros)
    const a = ((i + 0.5) * 2 * Math.PI) / n, m = (r + ri) / 2, px = x + Math.cos(a) * m, py = y + Math.sin(a) * m, L = (r - ri) * 0.62, Wd = (r - ri) * 0.42, tx = -Math.sin(a), ty = Math.cos(a), nx = Math.cos(a), ny = Math.sin(a);
    ctx.fillStyle = c(i % 2 ? VELVET : "#8a5a20"); ctx.beginPath(); ctx.moveTo(px - tx * L, py - ty * L); ctx.quadraticCurveTo(px + nx * Wd, py + ny * Wd, px + tx * L, py + ty * L); ctx.quadraticCurveTo(px - nx * Wd, py - ny * Wd, px - tx * L, py - ty * L); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = c(STONE_HI); ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) { const a = (i * 2 * Math.PI) / n; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * ri, y + Math.sin(a) * ri); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
  ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, ri, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = c(STONE); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(x, y, r + 5.4, 0, 6.283); ctx.stroke();
}

/** Le fauteuil de l'atelier sous le Château : un trône bas à haut dossier en arc brisé, la housse du jour en velours, des clous d'or, des pieds en volute ; l'assise reste à sa place (le chat s'y roule). */
function throne(ctx, c, ax, ay, cover) {
  ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.beginPath(); ctx.ellipse(ax + 26, ay + 8, 40, 4, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = c(WALNUT_LO); pointed(ctx, ax - 3, ax + 55, ay - 76, ay - 54, ay + 2); ctx.closePath(); ctx.fill(); // le bâti du dossier
  ctx.fillStyle = c(cover.back); pointed(ctx, ax + 2, ax + 50, ay - 70, ay - 52, ay - 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 1.2; pointed(ctx, ax - 3, ax + 55, ay - 76, ay - 54, ay + 2); ctx.stroke();
  ctx.fillStyle = c(GOLD); for (let k = 0; k < 7; k++) { const u = k / 6, px = ax + 2 + u * 48; ctx.beginPath(); ctx.arc(px, ay - 52 - Math.sin(u * Math.PI) * 14, 1, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(ax + 26, ay - 80, 2, 0, 6.283); ctx.fill();
  ctx.fillStyle = c(cover.seat); ctx.fillRect(ax - 8, ay - 30, 14, 36); ctx.fillRect(ax + 46, ay - 30, 14, 36); ctx.fillRect(ax + 4, ay - 26, 44, 28);
  ctx.fillStyle = c(WALNUT); ctx.fillRect(ax - 9, ay - 32, 16, 4); ctx.fillRect(ax + 45, ay - 32, 16, 4); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(ax - 1, ay - 30, 2.2, 0, 6.283); ctx.arc(ax + 53, ay - 30, 2.2, 0, 6.283); ctx.fill(); // les accoudoirs et leurs pommeaux
  ctx.strokeStyle = c(WALNUT_LO); ctx.lineWidth = 3.2; ctx.lineCap = "round"; for (const [x, d] of [[ax - 4, -1], [ax + 56, 1]]) { ctx.beginPath(); ctx.moveTo(x, ay + 4); ctx.quadraticCurveTo(x + d * 4, ay + 9, x + d * 2, ay + 13); ctx.stroke(); } ctx.lineCap = "butt";
}

/** Un chandelier à trois branches, grand, posé sur un pied (la lampe du bureau sous le Château) ; `on` : les chandelles brûlent. */
function candlestand(ctx, c, x, top, base, on, fl, scale = 1) {
  const s = scale;
  ctx.strokeStyle = c(IRON); ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, top + 8 * s); ctx.moveTo(x - 10 * s, top + 4 * s); ctx.quadraticCurveTo(x, top + 16 * s, x + 10 * s, top + 4 * s); ctx.stroke();
  ctx.fillStyle = c(IRON); ctx.beginPath(); ctx.ellipse(x, base, 8 * s, 2.4 * s, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(x, top + 10 * s, 1.6 * s, 0, 6.283); ctx.fill();
  for (const dx of [-10, 0, 10]) { const cx = x + dx * s, ct = top + (dx ? -4 : -8) * s; ctx.fillStyle = c(IRON); ctx.fillRect(cx - 2.6 * s, ct + 8 * s, 5.2 * s, 1.6 * s); ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(cx - 1.6 * s, ct, 3.2 * s, 8 * s);
    if (on) { const f = clamp(0.75 * fl + 0.2); ctx.fillStyle = rgba(255, 190, 80, f); ctx.beginPath(); ctx.ellipse(cx, ct - 3 * s, 1.6 * s, 3.4 * s * f, 0, 0, 6.283); ctx.fill(); } else { ctx.fillStyle = c("#2a2420"); ctx.fillRect(cx - 0.4 * s, ct - 2 * s, 0.8 * s, 2 * s); } }
}
/** La lueur chaude d'un chandelier sur ce qui l'entoure (pas de couleur, contrairement à la lampe de la Verrière). */
function candleGlow(ctx, x, y, R, fl, night = 0.5) { const g = ctx.createRadialGradient(x, y, 2, x, y, R); g.addColorStop(0, rgba(255, 196, 110, (0.14 + 0.16 * night) * fl)); g.addColorStop(1, rgba(255, 190, 90, 0)); ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2); }

/** Un cadre doré (tableau, bureau). */
function goldFrame(ctx, c, x, y, w, h, lw = 3) { ctx.strokeStyle = c("#a2812f"); ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); ctx.strokeStyle = c(GOLD_HI); ctx.lineWidth = 0.8; ctx.strokeRect(x - lw / 2 + 0.5, y - lw / 2 + 0.5, w + lw - 1, h + lw - 1); }

/** La trappe du coffre sous le Château : une dalle de pierre à anneau de fer, scellée dans le parquet (même rectangle que la trappe de fer). */
function stoneTrap(ctx, c, cx, cy, w, h) {
  const x = cx - w / 2, y = cy - h / 2;
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + w - 6, y); ctx.lineTo(x + w + 2, y + h + 2); ctx.lineTo(x - 2, y + h + 2); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c("#5e5966")); g.addColorStop(1, c("#3a3741")); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + w - 6, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c(STONE_HI); ctx.lineWidth = 1; ctx.stroke(); ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.35); ctx.lineTo(x + w * 0.5, y + h * 0.4); ctx.stroke();
  ctx.strokeStyle = c(IRON); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 7, 3, 0, 0, 6.283); ctx.stroke(); ctx.fillStyle = c(IRON); ctx.fillRect(cx - 2.5, cy - 3, 5, 3);
}

/** La salle de l'Imageur sous le Château : une chambre de pierre sombre, sol de dalles ; en vue d'ensemble seulement, deux lancettes étroites et une petite rose (aux places dégagées des vitraux de la Verrière : rien ne chevauche les instruments). */
function imagerRoom(ctx, c, t, FLOOR, overview, W = 640, H = 360) {
  ashlar(ctx, c, 0, 0, W, FLOOR, "#3a3644", 22, 0x1a6e);
  const vg = ctx.createLinearGradient(0, 0, 0, FLOOR); vg.addColorStop(0, rgba(0, 0, 0, 0.35)); vg.addColorStop(1, rgba(0, 0, 0, 0.05)); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, FLOOR);
  ctx.fillStyle = c(WALNUT_LO); ctx.fillRect(0, 0, W, 5); ctx.fillStyle = c(GOLD); ctx.fillRect(0, 4, W, 0.8);
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#34303c")); fg.addColorStop(1, c("#17151b")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; for (const y of [FLOOR + 14, FLOOR + 34, FLOOR + 62]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let i = 0; i < 12; i++) { const x = i * 58 + 18; ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x - (x - 320) * 0.2, H); ctx.stroke(); }
  ctx.fillStyle = c("#0d0c10"); ctx.fillRect(0, FLOOR - 3, W, 4);
  if (overview) {
    for (const [xa, xb, top, base] of [[12, 38, 66, 142], [620, 638, 30, FLOOR - 92]]) { // deux lancettes de verre sombre, rouge et violet
      const gg = ctx.createLinearGradient(0, top, 0, base); gg.addColorStop(0, c(PURPLE)); gg.addColorStop(1, c(VELVET_LO)); ctx.fillStyle = gg; pointed(ctx, xa, xb, top, top + (xb - xa) * 0.9, base); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(18, 10, 14, 0.85); ctx.lineWidth = 1; for (let y = top + (xb - xa) * 1.2; y < base; y += 14) { ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke(); }
      ctx.strokeStyle = c(STONE_HI); ctx.lineWidth = 3; pointed(ctx, xa, xb, top, top + (xb - xa) * 0.9, base); ctx.stroke();
    }
    const x = 96, y = 40, rr = 26, a = t * 0.15; // la petite rose : l'aurore la traverse, comme la fente de la salle
    const g = ctx.createLinearGradient(x - rr * Math.cos(a), y - rr, x + rr * Math.cos(a), y + rr); g.addColorStop(0, rgba(80, 220, 160, 0.5 + 0.15 * Math.sin(t * 0.7))); g.addColorStop(0.5, rgba(40, 60, 90, 0.6)); g.addColorStop(1, rgba(150, 120, 230, 0.55));
    ctx.fillStyle = c("#081014"); ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill();
    rosette(ctx, c, null, x, y, rr);
  } else { ctx.fillStyle = "#06080c"; ctx.fillRect(120, 6, 40, 6); const ag = ctx.createLinearGradient(120, 6, 160, 6); ag.addColorStop(0, rgba(80, 220, 160, 0.18 + 0.1 * Math.sin(t * 0.7))); ag.addColorStop(1, rgba(150, 120, 230, 0.22)); ctx.fillStyle = ag; ctx.fillRect(122, 7, 36, 4); }
}
/** L'établi vu de près sous le Château : chêne noir, filet d'or. */
function imagerBench(ctx, c, y0, W = 640, H = 360) {
  const tg = ctx.createLinearGradient(0, y0, 0, H); tg.addColorStop(0, c("#3a2e28")); tg.addColorStop(1, c("#17110e")); ctx.fillStyle = tg; ctx.fillRect(0, y0, W, H - y0);
  ctx.fillStyle = c("#4a3e36"); ctx.fillRect(0, y0 - 4, W, 5); ctx.fillStyle = c(GOLD); ctx.fillRect(0, y0 - 4, W, 1);
  ctx.strokeStyle = rgba(0, 0, 0, 0.2); ctx.lineWidth = 1; for (let y = y0 + 14; y < H; y += 17) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + 3, W * 0.6, y - 3, W, y + 1); ctx.stroke(); }
}
/** Une porte étroite en arc brisé (la porte de l'Imageur) : bois noir, une penture, un encadrement de pierre. */
function narrowDoor(ctx, c, x, top, w, base) {
  ctx.fillStyle = c(STONE); pointed(ctx, x - 3, x + w + 3, top - 12, top + 6, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#120f12"); pointed(ctx, x, x + w, top - 8, top + 6, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(0, 0, 0, 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + w / 2, top - 4); ctx.lineTo(x + w / 2, base); ctx.stroke();
  ctx.fillStyle = c(IRON); ctx.fillRect(x, top + 30, w - 4, 3); ctx.fillRect(x, base - 26, w - 4, 3); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(x + w - 6, (top + base) / 2 + 6, 1.6, 0, 6.283); ctx.fill();
}

module.exports = { STONE, STONE_HI, STONE_LO, WALNUT, WALNUT_HI, WALNUT_LO, IRON, GOLD, GOLD_HI, VELVET, VELVET_LO, PURPLE, pointed, ashlar, wainscot, lys, cabinWalls, cabinFloor, rug, cabinWindowClip, cabinWindowFrame, cabinDoor, slab, mantel, andirons, shelf, table, candelabrum, sconce, moonPatch, atelierWalls, galleryBays, balustrade, spiralStair, rosette, throne, candlestand, candleGlow, goldFrame, stoneTrap, imagerRoom, imagerBench, narrowDoor };
