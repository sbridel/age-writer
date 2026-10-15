"use strict";
// La Verrière (page `page_glasshouse`) : l'habit art nouveau des pièces du Relto — verre vert d'eau et ambre en ogives, nervures
// de cuivre, rinceaux au plomb, lianes, mosaïque. Seulement l'enveloppe : aucune zone cliquable n'est ajoutée, déplacée ni masquée
// (claude/DESIGN-verriere-art-nouveau.md ; test/glasshouse.test.js compare les zones avec et sans la page).
const { clamp, mix, rgba, rng } = require("./util");

const COPPER = "#b5652a", COPPER_HI = "#e6a06a", COPPER_LO = "#5a2e12", LEAD = "#0f2f2c";

/** Une ogive (arc brisé) de `xa` à `xb`, sommet à `top`, pieds à `base`. */
function ogive(ctx, xa, xb, top, base, keep = false) {
  const m = (xa + xb) / 2, k = (xb - xa) * 0.55;
  if (!keep) ctx.beginPath(); ctx.moveTo(xa, base); ctx.lineTo(xa, top + k); ctx.quadraticCurveTo(xa, top + k * 0.2, m, top); ctx.quadraticCurveTo(xb, top + k * 0.2, xb, top + k); ctx.lineTo(xb, base); ctx.closePath();
}

/** La couleur du verre selon l'heure : le jour, la lumière du dehors le traverse ; la nuit, il prend la pénombre et la lueur du feu. */
function glassTones(c, sky, warm) {
  const day = clamp(sky.ambient == null ? 0.6 : sky.ambient), w = clamp(warm || 0);
  const teal = mix(mix("#10302c", "#7fd6c8", day), "#c98a32", w * 0.25), teal2 = mix(mix("#0a1e1c", "#2f8a82", day), "#7a4a1e", w * 0.2);
  const amb = mix(mix("#3a2412", "#ffd27a", day * 0.9 + w * 0.3), "#ffb14a", w * 0.2), amb2 = mix("#2a170a", "#c9702a", day * 0.8 + w * 0.3);
  return { teal: c(teal), teal2: c(teal2), amb: c(amb), amb2: c(amb2) };
}

/** Un panneau de verre en ogive avec son rinceau au plomb (tige en coup de fouet, deux paires de feuilles, un bourgeon) et son cadre de cuivre. */
function pane(ctx, c, xa, xb, top, base, g1, g2, motif = true, lw = 3) {
  const gr = ctx.createLinearGradient(0, top, 0, base); gr.addColorStop(0, g1); gr.addColorStop(1, g2);
  ctx.fillStyle = gr; ogive(ctx, xa, xb, top, base); ctx.fill();
  if (motif) {
    const m = (xa + xb) / 2, h = base - top, s = Math.min(1, (xb - xa) / 40);
    ctx.save(); ogive(ctx, xa, xb, top, base); ctx.clip();
    ctx.strokeStyle = rgba(15, 47, 44, 0.85); ctx.lineWidth = 1.6 * s + 0.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(m, base); ctx.bezierCurveTo(m - 8 * s, base - h * 0.3, m + 8 * s, base - h * 0.55, m, top + h * 0.22); ctx.stroke();
    for (const [f, sp] of [[0.38, 1], [0.62, 0.8]]) {
      const y = base - h * f;
      ctx.beginPath(); ctx.moveTo(m, y); ctx.quadraticCurveTo(m - 14 * s * sp, y - 4, m - 11 * s * sp, y - 14 * s * sp); ctx.moveTo(m, y); ctx.quadraticCurveTo(m + 14 * s * sp, y - 4, m + 11 * s * sp, y - 14 * s * sp); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(m, top + h * 0.17, 4 * s + 1, 6 * s + 1.5, 0, 0, 6.283); ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = lw; ogive(ctx, xa, xb, top, base); ctx.stroke();
  ctx.strokeStyle = rgba(230, 160, 106, 0.55); ctx.lineWidth = 0.8; ogive(ctx, xa + lw * 0.6, xb - lw * 0.6, top + lw, base); ctx.stroke();
}

/** Une liane qui monte le long d'un montant (de `y0` à `y1`), avec ses feuilles. */
function vine(ctx, c, x, y0, y1, dir, seed) {
  const q = rng(seed), n = Math.max(3, Math.round((y0 - y1) / 16));
  ctx.strokeStyle = c("#3b8f6a"); ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y0);
  for (let i = 1; i <= n; i++) { const y = y0 - ((y0 - y1) * i) / n; ctx.quadraticCurveTo(x + dir * (4 + q() * 5) * (i % 2 ? 1 : -1), y + (y0 - y1) / n / 2, x + dir * q() * 2, y); }
  ctx.stroke(); ctx.fillStyle = c("#4bb08a");
  for (let i = 1; i < n; i++) { const y = y0 - ((y0 - y1) * i) / n, s = i % 2 ? 1 : -1; ctx.beginPath(); ctx.ellipse(x + dir * s * 4, y + 2, 4, 2.2, dir * s * 0.6, 0, 6.283); ctx.fill(); }
}

/** Un pot de cuivre suspendu à une chaîne, ses retombées de feuillage. */
function hangingPot(ctx, c, x, top, len, t) {
  const sw = Math.sin(t * 0.7 + x) * 0.8, y = top + len;
  ctx.strokeStyle = c("#8a6a3a"); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + sw, y - 9); ctx.stroke();
  ctx.fillStyle = c(COPPER); ctx.beginPath(); ctx.moveTo(x + sw - 9, y - 9); ctx.lineTo(x + sw + 9, y - 9); ctx.quadraticCurveTo(x + sw + 8, y + 3, x + sw, y + 4); ctx.quadraticCurveTo(x + sw - 8, y + 3, x + sw - 9, y - 9); ctx.fill();
  ctx.fillStyle = c(COPPER_HI); ctx.fillRect(x + sw - 9, y - 10, 18, 1.6);
  ctx.strokeStyle = c("#3b8f6a"); ctx.lineWidth = 1.3; ctx.fillStyle = c("#4bb08a");
  for (const [dx, dl] of [[-7, 22], [6, 16], [-1, 28]]) {
    ctx.beginPath(); ctx.moveTo(x + sw + dx, y - 8); ctx.quadraticCurveTo(x + sw + dx * 1.8, y + dl * 0.4, x + sw + dx * 1.2, y + dl); ctx.stroke();
    for (let k = 0.35; k < 1; k += 0.3) { ctx.beginPath(); ctx.ellipse(x + sw + dx * (1 + k * 0.4), y + dl * k, 3, 1.7, dx > 0 ? 0.5 : -0.5, 0, 6.283); ctx.fill(); }
  }
}

/**
 * La cabane habillée : le mur du haut devient verrière (fond vert profond, panneaux en ogive là où le mur se voit), le plafond
 * des nervures de cuivre en arcs, un lambris de bois garde le bas du mur (le panneau secret s'y fond comme avant) ; le sol, une
 * mosaïque. Appelé à la place des planches : les meubles, la porte, la fenêtre, la cheminée se dessinent ensuite, comme d'habitude.
 */
function cabinWalls(r, ctx, c, sky, t, FLOOR) {
  const W = 640, RAIL = 170, warm = 0.15, G = glassTones(c, sky, warm);
  // le fond : vert d'eau sombre, derrière tout
  const bg = ctx.createLinearGradient(0, 0, 0, RAIL); bg.addColorStop(0, c("#16302d")); bg.addColorStop(1, c("#1d3a36")); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, RAIL);
  // les panneaux de verre, là où le mur se voit : au-dessus de la porte (l'imposte ambre, dessinée avec la porte), autour de la fenêtre,
  // de part et d'autre du conduit de la cheminée
  for (const [xa, xb, top, base, amber] of [[0, 16, 40, RAIL, false], [452, 480, 34, 104, false], [600, 638, 34, 104, false], [620, 640, 118, RAIL, false], [440, 450, 118, RAIL, false]]) pane(ctx, c, xa, xb, top, base, amber ? G.amb : G.teal, amber ? G.amb2 : G.teal2, xb - xa > 20, 2.5);
  // le plafond : une poutre de cuivre et des arcs brisés qui retombent sur les trois colonnes
  const cg = ctx.createLinearGradient(0, 0, 0, 26); cg.addColorStop(0, c(COPPER_LO)); cg.addColorStop(0.5, c(COPPER)); cg.addColorStop(1, c(COPPER_LO)); ctx.fillStyle = cg; ctx.fillRect(0, 0, W, 22);
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 3;
  for (const [a, b] of [[-80, 120], [120, 320], [320, 520], [520, 720]]) { ctx.beginPath(); ctx.moveTo(a, 22); ctx.quadraticCurveTo(a, 40, (a + b) / 2, 46); ctx.quadraticCurveTo(b, 40, b, 22); ctx.stroke(); }
  ctx.strokeStyle = rgba(230, 160, 106, 0.6); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, 21); ctx.lineTo(W, 21); ctx.stroke();
  for (const x of [120, 320, 520]) { // les colonnes : un fût de cuivre et un chapiteau en feuilles
    ctx.fillStyle = c(COPPER); ctx.fillRect(x - 5, 0, 10, 40); ctx.fillStyle = c(COPPER_HI); ctx.fillRect(x - 3, 0, 2, 40);
    ctx.fillStyle = c("#4bb08a"); for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 7, 36, 6, 2.6, s * 0.5, 0, 6.283); ctx.fill(); }
  }
  // le lambris du bas : les mêmes planches que la cabane (le panneau qui pivote s'y fond comme avant), sous une cimaise de cuivre
  const q = rng(0xcab1);
  ctx.fillStyle = c("#5a4330"); ctx.fillRect(0, RAIL, W, FLOOR - RAIL);
  for (let x = 0; x < W; x += 40) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 220, 170, 0.04 + q() * 0.05); ctx.fillRect(x, RAIL, 40, FLOOR - RAIL); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x, RAIL, 1.5, FLOOR - RAIL); }
  ctx.fillStyle = c(COPPER); ctx.fillRect(0, RAIL - 3, W, 5); ctx.fillStyle = c(COPPER_HI); ctx.fillRect(0, RAIL - 3, W, 1.2);
}

/**
 * Le sol : une mosaïque de tesselles ocre et brun, une frise vert d'eau au pied du mur, deux anneaux de cuivre autour du tapis.
 * Un millier de tesselles : dessinées une fois en pleine lumière dans une toile à part, puis posées et assombries d'un voile (même
 * résultat que d'assombrir chaque couleur : c(h) est un mélange linéaire vers la nuit).
 */
let floorCache = null;
function cabinFloor(ctx, c, FLOOR, amb = 1, H = 360, W = 640) {
  if (!floorCache && typeof document !== "undefined") {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H - FLOOR; const g = cv.getContext("2d");
    if (g) { paintFloor(g, (h) => h, 0, H - FLOOR, W); floorCache = cv; }
  }
  if (floorCache) ctx.drawImage(floorCache, 0, FLOOR); else paintFloor(ctx, (h) => h, FLOOR, H, W);
  if (amb < 1) { ctx.fillStyle = rgba(5, 6, 12, 1 - amb); ctx.fillRect(0, FLOOR, W, H - FLOOR); }
  void c;
}
function paintFloor(ctx, c, FLOOR, H, W) {
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#3a3129")); fg.addColorStop(1, c("#221b15")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  const q = rng(0x7e55e);
  for (let row = 0, y = FLOOR + 2; y < H; row++) {
    const th = 4 + row * 0.9, tw = th * 1.5; // les tesselles grandissent vers soi : la perspective
    for (let x = -((row * 7) % tw); x < W; x += tw + 1) { const v = q(); ctx.fillStyle = c(v < 0.45 ? "#5a4a3a" : v < 0.85 ? "#4a3e32" : "#6b5638"); ctx.fillRect(x, y, tw, th); }
    y += th + 1;
  }
  ctx.fillStyle = c("#2a5a54"); ctx.fillRect(0, FLOOR + 1, W, 4); ctx.fillStyle = c("#c39a48"); ctx.fillRect(0, FLOOR + 5, W, 1.2);
  const ry = FLOOR + 72; // le tapis est à 322 pour un sol à 250
  ctx.strokeStyle = c("#b5652a"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(262, ry, 186, 29, 0, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = "rgba(195,154,72,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(262, ry, 196, 32, 0, 0, 6.283); ctx.stroke();
}

/** La fenêtre de la cabane, en ogive : bordure de petits verres colorés, montants de cuivre ; le ciel se voit au centre. */
function cabinWindowFrame(ctx, c, sky, wx, wy, ww, wh) {
  const G = glassTones(c, sky, 0.1), xa = wx - 8, xb = wx + ww + 8, top = wy - 38, base = wy + wh;
  // la bordure de verre coloré (autour du clair) : un anneau en ogive, puis le clair découpé dedans
  ctx.save(); ogive(ctx, xa, xb, top, base); ogive(ctx, wx, wx + ww, wy - 22, base, true); ctx.clip("evenodd");
  const gr = ctx.createLinearGradient(0, top, 0, base); gr.addColorStop(0, G.amb); gr.addColorStop(0.35, G.teal); gr.addColorStop(1, G.teal2); ctx.fillStyle = gr; ctx.fillRect(xa, top, xb - xa, base - top);
  ctx.strokeStyle = rgba(15, 47, 44, 0.8); ctx.lineWidth = 1; for (let y = top + 10; y < base; y += 12) { ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 4; ogive(ctx, xa, xb, top, base); ctx.stroke();
  ctx.lineWidth = 2; ogive(ctx, wx, wx + ww, wy - 22, base); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy - 22); ctx.lineTo(wx + ww / 2, base); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  ctx.fillStyle = c(COPPER); ctx.fillRect(xa - 2, base + 2, xb - xa + 4, 5); ctx.fillStyle = c(COPPER_HI); ctx.fillRect(xa - 2, base + 2, xb - xa + 4, 1.2); // le rebord, où la longue-vue est posée
}
/** Le clair de la fenêtre en ogive (pour y peindre le ciel). */
function cabinWindowClip(ctx, wx, wy, ww, wh) { ogive(ctx, wx, wx + ww, wy - 22, wy + wh); }

/** La porte : une ogive de verre ambre au plomb (un soleil, une tige), cadre de cuivre, sous une imposte vert d'eau. */
function cabinDoor(ctx, c, sky, dx, dy, dw, FLOOR, fl) {
  const G = glassTones(c, sky, 0.2), top = dy - 26;
  pane(ctx, c, dx - 6, dx + dw + 6, top - 30, top + 10, G.teal, G.teal2, false, 3); // l'imposte, au-dessus
  ctx.fillStyle = c(COPPER_LO); ogive(ctx, dx - 4, dx + dw + 4, top, FLOOR); ctx.fill();
  const gr = ctx.createLinearGradient(0, top, 0, FLOOR); gr.addColorStop(0, G.amb); gr.addColorStop(1, G.amb2); ctx.fillStyle = gr; ogive(ctx, dx, dx + dw, top + 4, FLOOR - 2); ctx.fill();
  ctx.save(); ogive(ctx, dx, dx + dw, top + 4, FLOOR - 2); ctx.clip();
  const m = dx + dw / 2, sy = top + 34; ctx.strokeStyle = rgba(90, 46, 18, 0.85); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(m, sy, 9, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(m, sy, 4, 0, 6.283); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(m + Math.cos(a) * 11, sy + Math.sin(a) * 11); ctx.lineTo(m + Math.cos(a) * 16, sy + Math.sin(a) * 16); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(m, sy + 16); ctx.bezierCurveTo(m - 10, sy + 50, m + 10, sy + 80, m, FLOOR); ctx.stroke();
  for (const y of [sy + 60, sy + 95]) { ctx.beginPath(); ctx.moveTo(m, y); ctx.quadraticCurveTo(m - 16, y - 6, m - 14, y - 18); ctx.moveTo(m, y); ctx.quadraticCurveTo(m + 16, y - 6, m + 14, y - 18); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 3; ogive(ctx, dx, dx + dw, top + 4, FLOOR - 2); ctx.stroke();
  ctx.fillStyle = c("#e6c37a"); ctx.beginPath(); ctx.arc(dx + dw - 9, dy + 70, 3, 0, 6.283); ctx.fill(); // la poignée, à sa place
  void fl;
}

/** Le jour, les vitraux jettent sur le sol des taches vert d'eau et ambre qui glissent avec l'heure. */
function lightPatches(ctx, sky, hour, FLOOR) {
  const day = clamp(((sky.ambient == null ? 0.6 : sky.ambient) - 0.3) / 0.5); if (day <= 0) return;
  const p = clamp((hour - 7) / 11), shift = (p - 0.5) * 120;
  for (const [x, y, rx, col] of [[150, FLOOR + 40, 60, [127, 214, 200]], [230, FLOOR + 62, 40, [255, 210, 122]], [520, FLOOR + 30, 46, [127, 214, 200]], [380, FLOOR + 76, 52, [127, 214, 200]]]) {
    const cx = x + shift, g = ctx.createRadialGradient(cx, y, 2, cx, y, rx); g.addColorStop(0, rgba(col[0], col[1], col[2], 0.22 * day)); g.addColorStop(1, rgba(col[0], col[1], col[2], 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, y, rx, rx * 0.28, 0, 0, 6.283); ctx.fill();
  }
}

/** Les plantes, en dernier : une liane sur le bord gauche, une autre sur le montant de la fenêtre, un pot suspendu près du conduit. */
function cabinPlants(ctx, c, t) {
  vine(ctx, c, 6, 250, 50, 1, 0x71e1);
  vine(ctx, c, 92, 168, 60, 1, 0x71e2);
  hangingPot(ctx, c, 618, 22, 40, t);
}

/** Une plaque de cuivre rivée (le panneau derrière la petite bibliothèque, sous la Verrière) : un rinceau gravé, quatre rivets. */
function copperPlate(ctx, c, x, y, w, h, shade = 1) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, c("#8a4a1e")); g.addColorStop(0.45, c("#c98a52")); g.addColorStop(1, c("#6b3a16"));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = rgba(60, 28, 8, 0.55 * shade); ctx.lineWidth = 1; ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
  const m = x + w / 2; ctx.strokeStyle = rgba(60, 28, 8, 0.4 * shade); ctx.lineWidth = 1.1; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(m, y + h - 8); ctx.bezierCurveTo(m - 7, y + h * 0.62, m + 7, y + h * 0.42, m, y + 14); ctx.stroke();
  for (const f of [0.62, 0.42]) { const yy = y + h * f; ctx.beginPath(); ctx.moveTo(m, yy); ctx.quadraticCurveTo(m - 12, yy - 3, m - 10, yy - 11); ctx.moveTo(m, yy); ctx.quadraticCurveTo(m + 12, yy - 3, m + 10, yy - 11); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(m, y + 11, 3, 4.5, 0, 0, 6.283); ctx.stroke();
  ctx.fillStyle = c("#e6a06a"); for (const [rx, ry] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) { ctx.beginPath(); ctx.arc(rx, ry, 1.6, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = rgba(255, 230, 180, 0.12 * shade); ctx.fillRect(x + 2, y + 2, w - 4, 2);
}

/** Les montants d'un meuble sous la Verrière : bois sombre et filet de cuivre. */
function copperEdge(ctx, c, x, y, w, h) { ctx.fillStyle = c("#2a1a12"); ctx.fillRect(x, y, w, h); ctx.fillStyle = c(COPPER); ctx.fillRect(x + 1, y, 1.4, h); ctx.fillRect(x + w - 2.4, y, 1.4, h); }

/** Le fronton de l'étagère des Âges : un arc brisé de bois sombre bordé de cuivre, un fleuron au sommet. */
function shelfCrest(ctx, c, x0, w, y0) {
  const m = x0 + w / 2, top = y0 - 26;
  ctx.fillStyle = c("#2a1a12"); ctx.beginPath(); ctx.moveTo(x0 - 7, y0 - 8); ctx.quadraticCurveTo(x0 + w * 0.25, y0 - 12, m - 18, top + 6); ctx.quadraticCurveTo(m, top - 2, m + 18, top + 6); ctx.quadraticCurveTo(x0 + w * 0.75, y0 - 12, x0 + w + 7, y0 - 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = c(COPPER); ctx.beginPath(); ctx.ellipse(m, top + 2, 3.5, 5, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3b8f6a"); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(m - 4, top + 6); ctx.quadraticCurveTo(m - 16, top + 4, m - 24, top + 10); ctx.moveTo(m + 4, top + 6); ctx.quadraticCurveTo(m + 16, top + 4, m + 24, top + 10); ctx.stroke();
}

/** Les pieds de la table en coup de fouet (cuivre et bois sombre), un filet de cuivre au bord du plateau. */
function tableLegs(ctx, c, tx, tw, ty) {
  ctx.strokeStyle = c("#2a1a12"); ctx.lineWidth = 6; ctx.lineCap = "round";
  for (const [x, d] of [[tx + 10, 1], [tx + tw - 10, -1]]) { ctx.beginPath(); ctx.moveTo(x, ty + 8); ctx.bezierCurveTo(x + d * 8, ty + 24, x - d * 6, ty + 40, x + d * 2, ty + 56); ctx.stroke(); }
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 1.2;
  for (const [x, d] of [[tx + 10, 1], [tx + tw - 10, -1]]) { ctx.beginPath(); ctx.moveTo(x - d * 2, ty + 8); ctx.bezierCurveTo(x + d * 6, ty + 24, x - d * 8, ty + 40, x, ty + 56); ctx.stroke(); }
  ctx.fillStyle = c("#2a1a12"); ctx.fillRect(tx + 2, ty + 8, tw - 4, 6);
}

module.exports = { copperPlate, copperEdge, shelfCrest, tableLegs,  ogive, glassTones, pane, vine, hangingPot, cabinWalls, cabinFloor, cabinWindowFrame, cabinWindowClip, cabinDoor, lightPatches, cabinPlants, COPPER, COPPER_HI, COPPER_LO, LEAD };
