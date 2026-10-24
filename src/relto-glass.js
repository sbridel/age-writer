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

/**
 * Les motifs au plomb : des fleurs et des feuillages art nouveau, tous de notre main. `kind` : « whip » (tige en coup de fouet,
 * feuilles, bourgeon), « iris » (trois pétales qui retombent, feuilles en lame), « lily » (lys en trompette), « poppy » (pavot rond
 * à cœur), « ginkgo » (éventails sur une tige), « tulip » (tulipe en coupe), « fern » (crosse qui se déroule). `m` : l'axe, `top`/`base` :
 * le haut et le bas du dessin, `s` : l'échelle (1 pour un panneau de 40 px de large). Trace seulement (la couleur et l'épaisseur sont
 * celles du contexte).
 */
const MOTIFS = ["whip", "iris", "lily", "poppy", "ginkgo", "tulip", "fern"];
function motif(ctx, kind, m, top, base, s = 1) {
  const h = base - top, L = (y, dx1, dy1, dx2, dy2) => { ctx.beginPath(); ctx.moveTo(m, y); ctx.quadraticCurveTo(m + dx1 * s, y + dy1 * s, m + dx2 * s, y + dy2 * s); ctx.stroke(); };
  const stem = (topY, sway = 8) => { ctx.beginPath(); ctx.moveTo(m, base); ctx.bezierCurveTo(m - sway * s, base - h * 0.3, m + sway * s, base - h * 0.55, m, topY); ctx.stroke(); };
  if (kind === "iris") {
    const fy = top + h * 0.25; stem(fy + 6 * s, 3);
    ctx.beginPath(); ctx.moveTo(m, fy + 6 * s); ctx.quadraticCurveTo(m - 2 * s, fy - 10 * s, m, fy - 14 * s); ctx.quadraticCurveTo(m + 2 * s, fy - 10 * s, m, fy + 6 * s); ctx.stroke(); // le pétale dressé
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(m, fy + 2 * s); ctx.bezierCurveTo(m + d * 12 * s, fy - 6 * s, m + d * 16 * s, fy + 6 * s, m + d * 9 * s, fy + 12 * s); ctx.stroke(); } // les deux qui retombent
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(m, base); ctx.quadraticCurveTo(m + d * 10 * s, base - h * 0.35, m + d * 6 * s, base - h * 0.62); ctx.stroke(); } // les feuilles en lame
  } else if (kind === "lily") {
    const fy = top + h * 0.2; stem(fy + 12 * s, 6);
    ctx.beginPath(); ctx.moveTo(m - 3 * s, fy + 12 * s); ctx.lineTo(m - 9 * s, fy - 2 * s); ctx.quadraticCurveTo(m - 13 * s, fy - 8 * s, m - 6 * s, fy - 6 * s); ctx.moveTo(m + 3 * s, fy + 12 * s); ctx.lineTo(m + 9 * s, fy - 2 * s); ctx.quadraticCurveTo(m + 13 * s, fy - 8 * s, m + 6 * s, fy - 6 * s); ctx.stroke(); // la trompette et ses lèvres
    ctx.beginPath(); ctx.moveTo(m, fy + 10 * s); ctx.lineTo(m, fy - 8 * s); ctx.stroke(); for (const d of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(m + d * 3 * s, fy - 9 * s, 1 * s + 0.3, 0, 6.283); ctx.stroke(); } // les étamines
    L(base - h * 0.4, -12, -4, -10, -16); L(base - h * 0.55, 12, -4, 10, -16);
  } else if (kind === "poppy") {
    const fy = top + h * 0.26, r = 9 * s; stem(fy + r, 10);
    for (let i = 0; i < 5; i++) { const a = (i * 2 * Math.PI) / 5 - Math.PI / 2; ctx.beginPath(); ctx.ellipse(m + Math.cos(a) * r * 0.6, fy + Math.sin(a) * r * 0.6, r * 0.55, r * 0.4, a, 0, 6.283); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(m, fy, r * 0.28, 0, 6.283); ctx.stroke();
    L(base - h * 0.3, -10, 2, -12, -10); L(base - h * 0.42, 10, 2, 12, -10);
    ctx.beginPath(); ctx.arc(m + 8 * s, base - h * 0.62, 2.4 * s, 0, 6.283); ctx.stroke(); // un bouton qui penche
  } else if (kind === "ginkgo") {
    stem(top + h * 0.18, 5);
    for (const [f, d] of [[0.25, -1], [0.45, 1], [0.65, -1], [0.82, 1]]) {
      const y = top + h * f, x = m + d * 3 * s, a = d > 0 ? -0.35 : Math.PI + 0.35; // un éventail au bout d'un pétiole
      const ex = x + Math.cos(a) * 9 * s, ey = y + Math.sin(a) * 9 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.arc(ex, ey, 6 * s, a - 0.9, a + 0.9); ctx.closePath(); ctx.stroke();
    }
  } else if (kind === "tulip") {
    const fy = top + h * 0.24; stem(fy + 8 * s, 4);
    ctx.beginPath(); ctx.moveTo(m - 8 * s, fy - 6 * s); ctx.quadraticCurveTo(m - 9 * s, fy + 9 * s, m, fy + 9 * s); ctx.quadraticCurveTo(m + 9 * s, fy + 9 * s, m + 8 * s, fy - 6 * s); ctx.lineTo(m + 4 * s, fy - 1 * s); ctx.lineTo(m, fy - 8 * s); ctx.lineTo(m - 4 * s, fy - 1 * s); ctx.closePath(); ctx.stroke(); // la coupe à trois pointes
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(m, base - h * 0.08); ctx.bezierCurveTo(m + d * 14 * s, base - h * 0.2, m + d * 12 * s, base - h * 0.42, m + d * 4 * s, base - h * 0.5); ctx.stroke(); } // deux larges feuilles
  } else if (kind === "fern") {
    ctx.beginPath(); ctx.moveTo(m, base); ctx.bezierCurveTo(m - 4 * s, base - h * 0.4, m + 6 * s, base - h * 0.7, m, top + h * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(m - 4 * s, top + h * 0.2, 4 * s, 0, Math.PI * 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(m - 4 * s, top + h * 0.2, 1.6 * s, 0, Math.PI * 1.4); ctx.stroke(); // la crosse
    for (let k = 0; k < 6; k++) { const y = base - h * (0.12 + k * 0.11), w = (11 - k * 1.2) * s; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(m, y); ctx.quadraticCurveTo(m + d * w * 0.6, y - 2 * s, m + d * w, y - 6 * s); ctx.stroke(); } }
  } else { // « whip » : tige en coup de fouet, deux paires de feuilles, un bourgeon
    stem(top + h * 0.22, 8);
    for (const [f, sp] of [[0.38, 1], [0.62, 0.8]]) { const y = base - h * f; L(y, -14 * sp, -4 / s, -11 * sp, -14 * sp); L(y, 14 * sp, -4 / s, 11 * sp, -14 * sp); }
    ctx.beginPath(); ctx.ellipse(m, top + h * 0.17, 4 * s + 1, 6 * s + 1.5, 0, 0, 6.283); ctx.stroke();
  }
}

/** Un panneau de verre en ogive avec son motif au plomb (`kind` : un nom de MOTIFS, ou faux pour aucun) et son cadre de cuivre. */
function pane(ctx, c, xa, xb, top, base, g1, g2, kind = "whip", lw = 3) {
  const gr = ctx.createLinearGradient(0, top, 0, base); gr.addColorStop(0, g1); gr.addColorStop(1, g2);
  ctx.fillStyle = gr; ogive(ctx, xa, xb, top, base); ctx.fill();
  if (kind) {
    const m = (xa + xb) / 2, s = Math.min(1, (xb - xa) / 40);
    ctx.save(); ogive(ctx, xa, xb, top, base); ctx.clip();
    ctx.strokeStyle = rgba(15, 47, 44, 0.85); ctx.lineWidth = 1.6 * s + 0.4; ctx.lineCap = "round";
    motif(ctx, kind === true ? "whip" : kind, m, top + (xb - xa) * 0.25, base, s);
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
  for (const [xa, xb, top, base, kind] of [[0, 16, 40, RAIL, null], [452, 480, 34, 104, "iris"], [600, 638, 34, 104, "lily"], [620, 640, 118, RAIL, null], [440, 450, 118, RAIL, null]]) pane(ctx, c, xa, xb, top, base, G.teal, G.teal2, kind, 2.5);
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

/** La porte : une ogive de verre ambre au plomb (un soleil, une tige), cadre de cuivre, sous une imposte (traverse de cuivre entre les deux). */
let DOOR_STYLE = "nouveau"; // « double » : l'imposte en ogive au-dessus de la porte en ogive ; « single » : une seule grande ogive, coupée par la traverse
function setDoorStyle(v) { DOOR_STYLE = ["single", "double"].includes(v) ? v : "nouveau"; }
function cabinDoor(ctx, c, sky, dx, dy, dw, FLOOR, fl) {
  if (DOOR_STYLE === "single") return cabinDoorSingle(ctx, c, sky, dx, dy, dw, FLOOR);
  if (DOOR_STYLE === "nouveau") return cabinDoorNouveau(ctx, c, sky, dx, dy, dw, FLOOR);
  const G = glassTones(c, sky, 0.2), top = dy - 16;
  // l'imposte : une ogive de verre vert d'eau au-dessus de la porte, séparée d'elle par une traverse de cuivre (rien ne se chevauche),
  // l'œil-de-bœuf en son cœur ; elle s'arrête avant la grande fenêtre
  const ib = top + 2, it = ib - 50; pane(ctx, c, dx + 2, dx + dw - 2, it, ib, G.teal, G.teal2, false, 2.5);
  cabinOculus(ctx, c, sky, dx + dw / 2, ib - 18, 11);
  ctx.fillStyle = c(COPPER); ctx.fillRect(dx - 4, ib, dw + 8, 4); ctx.fillStyle = c(COPPER_HI); ctx.fillRect(dx - 4, ib, dw + 8, 1.1); // la traverse
  ctx.fillStyle = c(COPPER_LO); ogive(ctx, dx - 4, dx + dw + 4, top + 6, FLOOR); ctx.fill();
  const gr = ctx.createLinearGradient(0, top, 0, FLOOR); gr.addColorStop(0, G.amb); gr.addColorStop(1, G.amb2); ctx.fillStyle = gr; ogive(ctx, dx, dx + dw, top + 10, FLOOR - 2); ctx.fill();
  ctx.save(); ogive(ctx, dx, dx + dw, top + 10, FLOOR - 2); ctx.clip();
  const m = dx + dw / 2, sy = top + 46; ctx.strokeStyle = rgba(90, 46, 18, 0.85); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(m, sy, 9, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(m, sy, 4, 0, 6.283); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(m + Math.cos(a) * 11, sy + Math.sin(a) * 11); ctx.lineTo(m + Math.cos(a) * 16, sy + Math.sin(a) * 16); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(m, sy + 16); ctx.bezierCurveTo(m - 10, sy + 50, m + 10, sy + 80, m, FLOOR); ctx.stroke();
  for (const y of [sy + 60, sy + 95]) { ctx.beginPath(); ctx.moveTo(m, y); ctx.quadraticCurveTo(m - 16, y - 6, m - 14, y - 18); ctx.moveTo(m, y); ctx.quadraticCurveTo(m + 16, y - 6, m + 14, y - 18); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 3; ogive(ctx, dx, dx + dw, top + 10, FLOOR - 2); ctx.stroke();
  ctx.fillStyle = c("#e6c37a"); ctx.beginPath(); ctx.arc(dx + dw - 9, dy + 70, 3, 0, 6.283); ctx.fill(); // la poignée, à sa place
  void fl;
}

/** L'œil-de-bœuf au-dessus de la porte : un rond de verre clair (on y voit le ciel), une rosace au plomb en pétales, un anneau de cuivre. */
function cabinOculus(ctx, c, sky, x, y, r) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.clip();
  const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, sky.top); g.addColorStop(1, sky.bottom); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  const G = glassTones(c, sky, 0.1); ctx.fillStyle = G.amb; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; // le cœur ambre
  ctx.strokeStyle = rgba(15, 47, 44, 0.85); ctx.lineWidth = 1.3; ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, b = a + Math.PI / 8; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); ctx.quadraticCurveTo(x + Math.cos(b) * r * 0.85, y + Math.sin(b) * r * 0.85, x + Math.cos(a + Math.PI / 4) * r * 0.3, y + Math.sin(a + Math.PI / 4) * r * 0.3); ctx.stroke(); } // huit pétales
  ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, 6.283); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = rgba(230, 160, 106, 0.6); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, r - 2.2, 0, 6.283); ctx.stroke();
  ctx.fillStyle = c(COPPER_HI); for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (r + 0.5), y + Math.sin(a) * (r + 0.5), 1.4, 0, 6.283); ctx.fill(); } // quatre rivets
}

/**
 * La porte à deux battants (art nouveau) : une ouverture en plein cintre, un encadrement de bois irisé (vert et rose), et dans chaque
 * battant un grand ovale de verre clair rayonné au plomb, cerné d'une bordure de petites fleurs (roses, pâles, vertes) entre des filets
 * dorés ; un panneau plein en bas, deux poignées de laiton au milieu. La zone cliquable ne change pas.
 */
function cabinDoorNouveau(ctx, c, sky, dx, dy, dw, FLOOR) {
  const xa = dx - 4, xb = dx + dw + 4, m = dx + dw / 2, top = 58, rr = (xb - xa) / 2, day = clamp(sky.ambient == null ? 0.6 : sky.ambient);
  const arch = (x0, x1, y0, y1) => { const r0 = (x1 - x0) / 2, cx = (x0 + x1) / 2; ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0 + r0 * 0.7); ctx.ellipse(cx, y0 + r0 * 0.7, r0, r0 * 0.7, 0, Math.PI, 2 * Math.PI); ctx.lineTo(x1, y1); ctx.closePath(); };
  // l'encadrement : un bois irisé, des veines vertes et roses
  const fr = ctx.createLinearGradient(xa - 6, 0, xb + 6, 0); fr.addColorStop(0, c("#4a6a4a")); fr.addColorStop(0.3, c("#8a5a5a")); fr.addColorStop(0.5, c("#5a7a5a")); fr.addColorStop(0.7, c("#9a6a5a")); fr.addColorStop(1, c("#4a6a4a"));
  ctx.fillStyle = fr; arch(xa - 6, xb + 6, top - 6, FLOOR); ctx.fill();
  ctx.strokeStyle = rgba(30, 20, 10, 0.5); ctx.lineWidth = 1; arch(xa - 6, xb + 6, top - 6, FLOOR); ctx.stroke();
  // les deux battants : leur haut suit le cintre
  for (const [l0, l1] of [[xa, m], [m, xb]]) {
    ctx.save(); arch(xa, xb, top, FLOOR); ctx.clip(); ctx.beginPath(); ctx.rect(l0, 0, l1 - l0, FLOOR); ctx.clip();
    const lw = l1 - l0, lm = (l0 + l1) / 2;
    // le fond de la bordure : verre vert d'eau et bleu, comme un feuillage
    const bg = ctx.createLinearGradient(0, top, 0, FLOOR); bg.addColorStop(0, c(mix("#2f6a6a", "#7fd6c8", day * 0.6))); bg.addColorStop(1, c(mix("#1f4a5a", "#5aa8b8", day * 0.5))); ctx.fillStyle = bg; ctx.fillRect(l0, top - 30, lw, FLOOR - top + 30);
    // l'ovale clair, rayonné au plomb (comme une toile)
    const oy = (top + FLOOR - 34) / 2 + 4, orx = lw * 0.3, ory = (FLOOR - 34 - top) * 0.36;
    ctx.fillStyle = c(mix("#9ac8d0", "#dff4f4", day)); ctx.beginPath(); ctx.ellipse(lm, oy, orx, ory, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = rgba(200, 162, 78, 0.75); ctx.lineWidth = 0.5;
    for (let k = 0; k < 14; k++) { const a = (k * Math.PI) / 7; ctx.beginPath(); ctx.moveTo(lm, oy); ctx.lineTo(lm + Math.cos(a) * orx, oy + Math.sin(a) * ory); ctx.stroke(); }
    for (const f of [0.35, 0.65]) { ctx.beginPath(); ctx.ellipse(lm, oy, orx * f, ory * f, 0, 0, 6.283); ctx.stroke(); }
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(lm, oy, orx, ory, 0, 0, 6.283); ctx.stroke();
    // la bordure de fleurs : roses, pâles, et des feuilles, tout autour de l'ovale
    const q = rng(l0 < m ? 0xf10e : 0xf10f), N = 46;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * 6.283 + q() * 0.1, rx2 = orx + 3 + q() * (lw * 0.5 - orx - 5), ry2 = ory + 4 + q() * 14, x = lm + Math.cos(a) * rx2, y = oy + Math.sin(a) * ry2;
      if (y > FLOOR - 36) continue;
      ctx.fillStyle = c(["#3f8a5a", "#4f9a6a"][k % 2]); ctx.beginPath(); ctx.ellipse(x + 2, y + 2, 2.2, 1, a, 0, 6.283); ctx.fill(); // une feuille
      const col = ["#d88aa0", "#f2e6d4", "#c86a8a", "#f0d8c8", "#e8a0b4"][Math.floor(q() * 5)], pr = 1.1 + q() * 0.6;
      ctx.fillStyle = c(col); for (let p = 0; p < 5; p++) { const b = (p * 2 * Math.PI) / 5; ctx.beginPath(); ctx.arc(x + Math.cos(b) * pr, y + Math.sin(b) * pr, pr * 0.85, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = c("#e8c060"); ctx.beginPath(); ctx.arc(x, y, pr * 0.45, 0, 6.283); ctx.fill();
    }
    // le panneau plein du bas, du même bois irisé
    const pg = ctx.createLinearGradient(l0, 0, l1, 0); pg.addColorStop(0, c("#5a7a5a")); pg.addColorStop(0.5, c("#9a6a6a")); pg.addColorStop(1, c("#6a8a5a")); ctx.fillStyle = pg; ctx.fillRect(l0, FLOOR - 32, lw, 32);
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 0.9; ctx.strokeRect(l0 + 4, FLOOR - 28, lw - 8, 22);
    ctx.restore();
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1; ctx.strokeRect(l0 + 2.5, FLOOR - 34, lw - 5, 1); // le filet doré au-dessus du panneau
  }
  ctx.strokeStyle = c("#3a4a2a"); ctx.lineWidth = 2.4; arch(xa, xb, top, FLOOR); ctx.stroke(); ctx.beginPath(); ctx.moveTo(m, top); ctx.lineTo(m, FLOOR); ctx.stroke(); // les montants
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 0.9; arch(xa + 2.5, xb - 2.5, top + 2.5, FLOOR); ctx.stroke();
  ctx.fillStyle = c("#e6c37a"); for (const s2 of [-1, 1]) { ctx.fillRect(m + s2 * 2.6 - 1, dy + 60, 2, 16); ctx.beginPath(); ctx.arc(m + s2 * 2.6, dy + 68, 1.6, 0, 6.283); ctx.fill(); } // les deux poignées
  void rr;
}

/** La porte en une seule grande ogive : l'imposte remplit l'arc (l'œil-de-bœuf au cœur), la traverse coupe net, le battant est droit dessous. */
function cabinDoorSingle(ctx, c, sky, dx, dy, dw, FLOOR) {
  const G = glassTones(c, sky, 0.2), xa = dx - 4, xb = dx + dw + 4, top = 46, tr = dy - 2;
  ctx.fillStyle = c(COPPER_LO); ogive(ctx, xa, xb, top, FLOOR); ctx.fill();
  ctx.save(); ogive(ctx, xa + 3, xb - 3, top + 3, tr); ctx.clip(); const ig = ctx.createLinearGradient(0, top, 0, tr); ig.addColorStop(0, G.teal); ig.addColorStop(1, G.teal2); ctx.fillStyle = ig; ctx.fillRect(xa, top, xb - xa, tr - top); ctx.restore(); // l'imposte : tout l'arc
  cabinOculus(ctx, c, sky, dx + dw / 2, (top + tr) / 2 + 8, 13);
  ctx.fillStyle = c(COPPER); ctx.fillRect(xa, tr, xb - xa, 5); ctx.fillStyle = c(COPPER_HI); ctx.fillRect(xa, tr, xb - xa, 1.2); // la traverse
  const gr = ctx.createLinearGradient(0, tr + 5, 0, FLOOR); gr.addColorStop(0, G.amb); gr.addColorStop(1, G.amb2); ctx.fillStyle = gr; ctx.fillRect(dx, tr + 5, dw, FLOOR - tr - 7); // le battant, droit
  const m = dx + dw / 2, sy = tr + 30; ctx.strokeStyle = rgba(90, 46, 18, 0.85); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(m, sy, 9, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(m, sy, 4, 0, 6.283); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(m + Math.cos(a) * 11, sy + Math.sin(a) * 11); ctx.lineTo(m + Math.cos(a) * 16, sy + Math.sin(a) * 16); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(m, sy + 16); ctx.bezierCurveTo(m - 10, sy + 50, m + 10, sy + 80, m, FLOOR - 2); ctx.stroke();
  for (const y of [sy + 60, sy + 95]) { ctx.beginPath(); ctx.moveTo(m, y); ctx.quadraticCurveTo(m - 16, y - 6, m - 14, y - 18); ctx.moveTo(m, y); ctx.quadraticCurveTo(m + 16, y - 6, m + 14, y - 18); ctx.stroke(); }
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 2.5; ctx.strokeRect(dx, tr + 5, dw, FLOOR - tr - 7);
  ctx.lineWidth = 3.5; ogive(ctx, xa, xb, top, FLOOR); ctx.stroke();
  ctx.fillStyle = c("#e6c37a"); ctx.beginPath(); ctx.arc(dx + dw - 9, dy + 70, 3, 0, 6.283); ctx.fill(); // la poignée, à sa place
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
  ctx.strokeStyle = rgba(60, 28, 8, 0.4 * shade); ctx.lineWidth = 1.1; ctx.lineCap = "round"; motif(ctx, "poppy", x + w / 2, y + 10, y + h - 7, 1); // un pavot gravé
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

/**
 * La salle de l'Imageur sous la Verrière : le mur de pierre froide devient une verrière sombre (vert d'eau presque noir : la salle
 * reste une chambre noire), deux hautes baies à ses bords (fougère, ginkgo) ; en vue d'ensemble, la fente d'aurore devient une
 * rosace où l'aurore passe, en lents reflets verts et violets ; le sol, une mosaïque sombre.
 */
function imagerRoom(ctx, c, t, FLOOR, overview, W = 640, H = 360) {
  const bg = ctx.createLinearGradient(0, 0, 0, FLOOR); bg.addColorStop(0, c("#12262a")); bg.addColorStop(1, c("#0b1719")); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, FLOOR);
  const G = { teal: c("#1f5a54"), teal2: c("#0e2a28") };
  if (overview) { // les deux vitraux ne vivent que dans la vue d'ensemble, là où le mur est dégagé : ni la longue-vue ni la jauge ne les chevauchent ; dans les gros plans, les postes les auraient couverts
    pane(ctx, c, 12, 38, 66, 142, G.teal, G.teal2, "fern", 2.5);
    pane(ctx, c, 620, 638, 30, FLOOR - 92, G.teal, G.teal2, "ginkgo", 2.5);
  }
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 2; for (const x of [172, 486]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FLOOR); ctx.stroke(); } // deux nervures
  ctx.fillStyle = c(COPPER); ctx.fillRect(0, 0, W, 4); ctx.fillStyle = c(COPPER_HI); ctx.fillRect(0, 3, W, 1);
  if (overview) { // la rosace : l'aurore la traverse
    const x = 96, y = 40, r = 27, a = t * 0.15;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.clip();
    const g = ctx.createLinearGradient(x - r * Math.cos(a), y - r, x + r * Math.cos(a), y + r);
    g.addColorStop(0, rgba(80, 220, 160, 0.55 + 0.15 * Math.sin(t * 0.7))); g.addColorStop(0.5, rgba(40, 90, 110, 0.6)); g.addColorStop(1, rgba(150, 120, 230, 0.6 + 0.12 * Math.sin(t * 0.5 + 1)));
    ctx.fillStyle = c("#081014"); ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.strokeStyle = rgba(10, 20, 22, 0.9); ctx.lineWidth = 1.4; ctx.lineCap = "round";
    for (let i = 0; i < 12; i++) { const b = (i * Math.PI) / 6, e = b + Math.PI / 12; ctx.beginPath(); ctx.moveTo(x + Math.cos(b) * 8, y + Math.sin(b) * 8); ctx.quadraticCurveTo(x + Math.cos(e) * r * 1.05, y + Math.sin(e) * r * 1.05, x + Math.cos(b + Math.PI / 6) * 8, y + Math.sin(b + Math.PI / 6) * 8); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.283); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c(COPPER); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = rgba(230, 160, 106, 0.6); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(x, y, r + 3.5, 0, 6.283); ctx.stroke();
    const glow = ctx.createRadialGradient(x, y + 40, 4, x, y + 60, 120); glow.addColorStop(0, rgba(110, 200, 180, 0.08)); glow.addColorStop(1, rgba(110, 200, 180, 0)); ctx.fillStyle = glow; ctx.fillRect(0, 0, 300, FLOOR);
  }
  darkMosaic(ctx, c, FLOOR, W, H);
}

/** Un sol de mosaïque sombre (salle de l'Imageur, observatoire), une frise vert d'eau au pied du mur. */
function darkMosaic(ctx, c, FLOOR, W = 640, H = 360) {
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#22262c")); fg.addColorStop(1, c("#111317")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  const q = rng(0x1ea6e);
  for (let row = 0, y = FLOOR + 2; y < H; row++) { const th = 4 + row * 1.2, tw = th * 1.5; for (let x = -((row * 7) % tw); x < W; x += tw + 1) { const v = q(); ctx.fillStyle = c(v < 0.5 ? "#26292e" : v < 0.88 ? "#212428" : "#2f2a24"); ctx.fillRect(x, y, tw, th); } y += th + 1; }
  ctx.fillStyle = c("#1f4a46"); ctx.fillRect(0, FLOOR - 1, W, 3);
}

/** Des rinceaux de cuivre aux quatre coins d'un cadre (x, y, w, h) : une crosse et deux feuilles, tournées vers l'intérieur. */
function cornerVines(ctx, c, x, y, w, h) {
  ctx.strokeStyle = c(COPPER_HI); ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.fillStyle = c(COPPER);
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(cx + sx * 3, cy + sy * 3); ctx.bezierCurveTo(cx + sx * 18, cy + sy * 2, cx + sx * 20, cy + sy * 14, cx + sx * 12, cy + sy * 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + sx * 12, cy + sy * 9, 2.4, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + sx * 3, cy + sy * 3); ctx.bezierCurveTo(cx + sx * 2, cy + sy * 18, cx + sx * 14, cy + sy * 20, cx + sx * 12, cy + sy * 12); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + sx * 22, cy + sy * 5, 3.4, 1.6, sx * sy * 0.4, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + sx * 5, cy + sy * 22, 1.6, 3.4, sx * sy * 0.4, 0, 6.283); ctx.fill();
  }
}

/** L'établi vu de près, sous la Verrière : bois sombre, un filet de cuivre au bord. */
function imagerBench(ctx, c, y0, W = 640, H = 360) {
  const tg = ctx.createLinearGradient(0, y0, 0, H); tg.addColorStop(0, c("#3a2418")); tg.addColorStop(1, c("#1a0f0a")); ctx.fillStyle = tg; ctx.fillRect(0, y0, W, H - y0);
  ctx.fillStyle = c(COPPER); ctx.fillRect(0, y0 - 4, W, 5); ctx.fillStyle = c(COPPER_HI); ctx.fillRect(0, y0 - 4, W, 1.2);
  ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1; for (let y = y0 + 14; y < H; y += 17) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + 3, W * 0.6, y - 3, W, y + 1); ctx.stroke(); }
}

/**
 * Une liane de cuivre qui s'enroule autour d'un fût (x, de y0 en bas à y1 en haut, demi-largeur hw) : deux brins qui se croisent,
 * des feuilles aux croisements, une vrille en haut. `k` : l'échelle (1 pour la vue rapprochée de l'horloge).
 */
function pillarVine(ctx, c, x, y0, y1, hw, k = 1) {
  const n = 3, step = (y0 - y1) / n;
  ctx.lineCap = "round";
  for (const ph of [0, 1]) {
    ctx.strokeStyle = c(ph ? COPPER : COPPER_HI); ctx.lineWidth = 2.2 * k; ctx.beginPath(); ctx.moveTo(x + (ph ? hw : -hw), y0);
    for (let i = 0; i < n; i++) { const ya = y0 - step * i, s = (i + ph) % 2 ? 1 : -1; ctx.bezierCurveTo(x + s * hw * 1.25, ya - step * 0.3, x - s * hw * 1.25, ya - step * 0.7, x - s * hw, ya - step); }
    ctx.stroke();
  }
  ctx.fillStyle = c("#4b8a62");
  for (let i = 0; i < n; i++) { const y = y0 - step * (i + 0.5); for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * hw * 1.15, y, 5 * k, 2.4 * k, s * 0.5, 0, 6.283); ctx.fill(); } }
  ctx.strokeStyle = c(COPPER_HI); ctx.lineWidth = 1.4 * k; ctx.beginPath(); ctx.arc(x + hw * 0.6, y1 - 4 * k, 4 * k, Math.PI * 0.2, Math.PI * 1.7); ctx.stroke(); // la vrille
}

/** Une fenêtre ronde habillée : un anneau de verre coloré (vert d'eau et ambre en alternance, au plomb) autour du clair, cerclé de cuivre. */
function roundWindowRing(ctx, c, sky, x, y, r, buds = true) {
  const G = glassTones(c, sky, 0.1), ri = r * 0.7, n = 12;
  for (let i = 0; i < n; i++) {
    const a0 = (i * 2 * Math.PI) / n, a1 = ((i + 1) * 2 * Math.PI) / n;
    ctx.fillStyle = i % 2 ? G.teal : G.amb; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.arc(x, y, ri, a1, a0, true); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = rgba(15, 47, 44, 0.85); ctx.lineWidth = 1.1;
  for (let i = 0; i < n; i++) { const a = (i * 2 * Math.PI) / n; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * ri, y + Math.sin(a) * ri); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
  if (buds) for (let i = 0; i < n; i++) { const a = ((i + 0.5) * 2 * Math.PI) / n, m = (r + ri) / 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * m, y + Math.sin(a) * m, 2.2, 1.2, a, 0, 6.283); ctx.stroke(); } // un bourgeon dans chaque verre
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, ri, 0, 6.283); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = rgba(230, 160, 106, 0.6); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, r + 2.6, 0, 6.283); ctx.stroke();
}

/**
 * Le fauteuil de l'atelier sous la Verrière : un dossier en fer à cheval, cloué de cuivre, des accoudoirs qui finissent en crosse,
 * des pieds en coup de fouet. Les couleurs sont celles de la housse du jour (`cover.back`, `cover.seat`) : le camouflage du chat
 * suit la même étoffe, et l'assise reste où elle était (le chat s'y roule au même endroit).
 */
function armchair(ctx, c, ax, ay, cover) {
  ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.beginPath(); ctx.ellipse(ax + 26, ay + 8, 38, 4, 0, 0, 6.283); ctx.fill(); // l'ombre au sol
  ctx.strokeStyle = c("#2a1a12"); ctx.lineWidth = 3.4; ctx.lineCap = "round"; // les pieds
  for (const [x, d] of [[ax - 4, -1], [ax + 56, 1]]) { ctx.beginPath(); ctx.moveTo(x, ay + 2); ctx.bezierCurveTo(x + d * 2, ay + 6, x - d * 3, ay + 9, x + d * 3, ay + 13); ctx.stroke(); ctx.fillStyle = c(COPPER); ctx.beginPath(); ctx.arc(x + d * 3, ay + 13, 1.6, 0, 6.283); ctx.fill(); }
  // le dossier en fer à cheval
  const back = () => { ctx.beginPath(); ctx.moveTo(ax - 1, ay + 2); ctx.lineTo(ax - 1, ay - 38); ctx.bezierCurveTo(ax - 1, ay - 64, ax + 53, ay - 64, ax + 53, ay - 38); ctx.lineTo(ax + 53, ay + 2); ctx.closePath(); };
  ctx.fillStyle = c(cover.back); back(); ctx.fill();
  ctx.strokeStyle = c("#2a1a12"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax - 1, ay + 2); ctx.lineTo(ax - 1, ay - 38); ctx.bezierCurveTo(ax - 1, ay - 64, ax + 53, ay - 64, ax + 53, ay - 38); ctx.lineTo(ax + 53, ay + 2); ctx.stroke();
  ctx.fillStyle = c(COPPER_HI); for (let i = 0; i <= 10; i++) { const u = i / 10, x = (1 - u) ** 3 * (ax - 1) + 3 * (1 - u) ** 2 * u * (ax - 1) + 3 * (1 - u) * u * u * (ax + 53) + u ** 3 * (ax + 53), y = (1 - u) ** 3 * (ay - 38) + 3 * (1 - u) ** 2 * u * (ay - 64) + 3 * (1 - u) * u * u * (ay - 64) + u ** 3 * (ay - 38); ctx.beginPath(); ctx.arc(x, y + 3, 1, 0, 6.283); ctx.fill(); } // les clous
  ctx.strokeStyle = rgba(0, 0, 0, 0.18); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax + 26, ay - 54); ctx.lineTo(ax + 26, ay - 28); ctx.stroke(); // un capiton
  // les accoudoirs en crosse, puis l'assise
  ctx.fillStyle = c(cover.seat);
  for (const [x, d] of [[ax - 8, -1], [ax + 46, 1]]) {
    ctx.beginPath(); ctx.moveTo(x, ay + 6); ctx.lineTo(x, ay - 24); ctx.quadraticCurveTo(x + 7, ay - 34, x + 14, ay - 24); ctx.lineTo(x + 14, ay + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c("#2a1a12"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x + 7 + d * 1, ay - 23, 4, 0, 6.283); ctx.stroke(); // la crosse
    ctx.strokeStyle = c(COPPER); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 7 + d * 1, ay - 23, 1.6, 0, 6.283); ctx.stroke();
  }
  ctx.fillRect(ax + 4, ay - 26, 44, 28);
  ctx.fillStyle = c(COPPER); ctx.fillRect(ax - 8, ay + 4, 68, 1.6); // un jonc de cuivre au bas de la ceinture
}

/**
 * Une lampe à abat-jour de verre au plomb (art nouveau) : une coupole de petits verres ambre, vert d'eau et vert feuille, cernés de
 * plomb, une frise de feuilles au bord, un pied de bronze qui monte du socle comme une tige. `lx` : l'axe ; `top`/`edge` : le haut et
 * le bord de la coupole ; `rx` : sa demi-largeur ; `foot`/`base` : le pied (de `edge` à `foot`) et la demi-largeur du socle. Allumée,
 * la coupole luit de l'intérieur.
 */
function tiffanyLamp(ctx, c, lx, top, edge, rx, foot, base, on, fl = 1) {
  const k = rx / 40, glow = on ? clamp(0.55 + 0.15 * fl) : 0;
  // le pied de bronze : une tige qui s'évase en racines sur le socle
  ctx.fillStyle = c("#6b4a22"); ctx.beginPath(); ctx.moveTo(lx - 2.5 * k, edge); ctx.lineTo(lx + 2.5 * k, edge); ctx.quadraticCurveTo(lx + 3 * k, foot - 10 * k, lx + base, foot); ctx.lineTo(lx - base, foot); ctx.quadraticCurveTo(lx - 3 * k, foot - 10 * k, lx - 2.5 * k, edge); ctx.fill();
  ctx.strokeStyle = c("#a8783a"); ctx.lineWidth = 1 * k + 0.3; ctx.beginPath(); ctx.moveTo(lx, edge); ctx.quadraticCurveTo(lx + 2 * k, foot - 12 * k, lx + base * 0.7, foot - 1); ctx.stroke();
  ctx.fillStyle = c("#4a3218"); ctx.fillRect(lx - base - 2 * k, foot - 1, 2 * base + 4 * k, 3 * k + 1);
  // la coupole : un demi-ovale découpé en verres
  const dome = () => { ctx.beginPath(); ctx.moveTo(lx - rx, edge); ctx.bezierCurveTo(lx - rx, top + (edge - top) * 0.1, lx - rx * 0.4, top, lx, top); ctx.bezierCurveTo(lx + rx * 0.4, top, lx + rx, top + (edge - top) * 0.1, lx + rx, edge); ctx.closePath(); };
  ctx.save(); dome(); ctx.clip();
  const cols = ["#c98a32", "#4f9e8a", "#7a9a3a", "#d9a84a", "#3f7f74"], rows = 4, h = edge - top;
  for (let i = 0; i < rows; i++) { const y0 = top + (h * i) / rows, n = 4 + i * 2; for (let j = 0; j < n; j++) { const x0 = lx - rx + (2 * rx * j) / n; ctx.fillStyle = mix(c(cols[(i * 3 + j) % cols.length]), "#ffe2a0", glow * 0.45); ctx.fillRect(x0, y0, 2 * rx / n + 0.5, h / rows + 0.5); } }
  ctx.strokeStyle = rgba(30, 20, 10, 0.85); ctx.lineWidth = 0.9 * k + 0.2;
  for (let i = 1; i < rows; i++) { const y = top + (h * i) / rows; ctx.beginPath(); ctx.moveTo(lx - rx, y); ctx.lineTo(lx + rx, y); ctx.stroke(); }
  for (let i = 0; i < rows; i++) { const y0 = top + (h * i) / rows, n = 4 + i * 2; for (let j = 1; j < n; j++) { const x = lx - rx + (2 * rx * j) / n; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h / rows); ctx.stroke(); } }
  ctx.restore();
  ctx.strokeStyle = c("#5a3a18"); ctx.lineWidth = 1.6 * k + 0.3; dome(); ctx.stroke();
  // la frise du bord : des feuilles qui pendent
  ctx.fillStyle = mix(c("#5a7a2a"), "#c8e090", glow * 0.3);
  for (let j = 0; j < 9; j++) { const x = lx - rx + 2 + ((2 * rx - 4) * j) / 8; ctx.beginPath(); ctx.ellipse(x, edge + 2.4 * k, 2.6 * k + 0.4, 3.6 * k + 0.6, 0, 0, 6.283); ctx.fill(); }
  // une frise de volutes au plomb, au bas de la coupole (comme les crosses d'un vitrail)
  ctx.save(); dome(); ctx.clip(); ctx.strokeStyle = rgba(30, 20, 10, 0.9); ctx.lineWidth = 1.1 * k + 0.2;
  const fy = edge - (edge - top) * 0.2, nS = 6; for (let j = 0; j < nS; j++) { const x = lx - rx + (2 * rx * (j + 0.5)) / nS, w = rx / nS; ctx.beginPath(); ctx.arc(x - w * 0.35, fy, w * 0.45, Math.PI * 0.2, Math.PI * 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(x + w * 0.35, fy, w * 0.45, Math.PI * 1.4, Math.PI * 0.8, true); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = c("#6b4a22"); ctx.beginPath(); ctx.arc(lx, top - 2 * k, 2.6 * k + 0.4, 0, 6.283); ctx.fill(); // le fleuron
  ctx.beginPath(); ctx.moveTo(lx - 1.6 * k, top - 3 * k); ctx.lineTo(lx, top - 11 * k); ctx.lineTo(lx + 1.6 * k, top - 3 * k); ctx.closePath(); ctx.fill(); // sa pointe
}

/**
 * Un tapis ouvragé (art nouveau) : un fond, une bordure à rinceaux (une liane continue et ses feuilles), un médaillon central en lys,
 * des écoinçons de feuillage. `col` : { field, border, vine, gold }.
 */
function ornateRug(ctx, c, cx, cy, rx, ry, col) {
  ctx.fillStyle = c(col.border); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = c(col.field); ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.86, ry * 0.7, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c(col.gold); ctx.lineWidth = 1.4; for (const f of [0.97, 0.86]) { ctx.beginPath(); ctx.ellipse(cx, cy, rx * f, ry * (f === 0.97 ? 0.94 : 0.7), 0, 0, 6.283); ctx.stroke(); }
  // la liane de la bordure : une onde qui fait le tour, une feuille à chaque creux
  ctx.strokeStyle = c(col.vine); ctx.lineWidth = 1.2; ctx.beginPath(); const N = 64, rm = 0.915;
  for (let i = 0; i <= N; i++) { const a = (i / N) * 6.283, w = 1 + 0.035 * Math.sin(i * 1.5); const x = cx + Math.cos(a) * rx * rm * w, y = cy + Math.sin(a) * ry * (rm - 0.1) * (1 + 0.12 * Math.sin(i * 1.5)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke(); ctx.fillStyle = c(col.vine);
  for (let i = 0; i < N; i += 4) { const a = (i / N) * 6.283; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * rx * rm, cy + Math.sin(a) * ry * (rm - 0.1), 3, 1.2, a + 0.6, 0, 6.283); ctx.fill(); }
  // le médaillon : un lys stylisé, vu à plat (écrasé par la perspective)
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx * 2.2);
  ctx.strokeStyle = c(col.gold); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.2, rx * 0.06, 0, 0, 6.283); ctx.stroke();
  ctx.fillStyle = c(col.vine); for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * rx * 0.1, -rx * 0.05, d * rx * 0.17, 0); ctx.quadraticCurveTo(d * rx * 0.1, rx * 0.03, 0, 0); ctx.fill(); }
  ctx.fillStyle = c(col.gold); ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.025, rx * 0.04, 0, 0, 6.283); ctx.fill();
  ctx.restore();
  for (const d of [-1, 1]) { ctx.strokeStyle = c(col.vine); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(cx + d * rx * 0.36, cy); ctx.bezierCurveTo(cx + d * rx * 0.5, cy - ry * 0.4, cx + d * rx * 0.62, cy + ry * 0.3, cx + d * rx * 0.72, cy - ry * 0.1); ctx.stroke(); } // deux rinceaux de part et d'autre
}

/** La trappe du coffre sous la Verrière : bronze patiné, un anneau et une rosace d'argent incrustés (même place, même forme). */
function bronzeTrap(ctx, c, cx, cy, w, h) {
  const sk = h * 0.35, quad = () => { ctx.beginPath(); ctx.moveTo(cx - w / 2 + sk, cy - h / 2); ctx.lineTo(cx + w / 2 - sk, cy - h / 2); ctx.lineTo(cx + w / 2, cy + h / 2); ctx.lineTo(cx - w / 2, cy + h / 2); ctx.closePath(); };
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.moveTo(cx - w / 2 + sk - 4, cy - h / 2 - 3); ctx.lineTo(cx + w / 2 - sk + 4, cy - h / 2 - 3); ctx.lineTo(cx + w / 2 + 4, cy + h / 2 + 3); ctx.lineTo(cx - w / 2 - 4, cy + h / 2 + 3); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2); g.addColorStop(0, c("#7a4e22")); g.addColorStop(0.5, c("#a8743a")); g.addColorStop(1, c("#5e3a18"));
  ctx.fillStyle = g; quad(); ctx.fill(); ctx.strokeStyle = c("#3a2410"); ctx.lineWidth = 1.4; ctx.stroke();
  ctx.save(); quad(); ctx.clip();
  ctx.strokeStyle = c("#c8ccd2"); ctx.lineWidth = 1; // la rosace d'argent incrustée : un anneau, huit pétales écrasés
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.3, h * 0.32, 0, 0, 6.283); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * w * 0.17, cy + Math.sin(a) * h * 0.18, w * 0.07, h * 0.06, a, 0, 6.283); ctx.stroke(); }
  ctx.strokeStyle = rgba(120, 200, 180, 0.35); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.44, h * 0.42, 0, 0, 6.283); ctx.stroke(); // un peu de vert-de-gris au bord
  ctx.restore();
  ctx.fillStyle = c("#d8dce2"); for (const fy of [-0.34, 0.34]) for (const fx of [-0.36, 0.36]) { ctx.beginPath(); ctx.arc(cx + fx * w, cy + fy * h, 1.4, 0, 6.283); ctx.fill(); } // rivets d'argent
  ctx.strokeStyle = c("#e6e9ee"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 6, 2.6, 0, 0, 6.283); ctx.stroke(); // l'anneau de traction, d'argent
}

/**
 * La flaque de lumière colorée, posée APRÈS les objets du plateau : elle les teinte aussi (un carnet blanc prend le vert et l'ambre).
 * Une passe « multiply » colore ce qui est clair, puis la lueur (`lampGlow` sans halo de mur) éclaire.
 */
function lampPool(ctx, lx, pool, rx, fl = 1) {
  const W2 = rx * 2.3, H2 = rx * 0.95, a = 0.85 + 0.15 * fl;
  ctx.save(); ctx.globalCompositeOperation = "multiply";
  for (const [dx, col, al] of [[-0.55, [150, 225, 210], 0.55], [0.55, [255, 205, 150], 0.5], [0.15, [205, 230, 170], 0.3]]) {
    const cx = lx + dx * W2 * 0.5, g = ctx.createRadialGradient(cx, pool, 2, cx, pool, W2 * 0.55); g.addColorStop(0, rgba(col[0], col[1], col[2], al * a)); g.addColorStop(1, rgba(col[0], col[1], col[2], 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, pool, W2 * 0.55, H2 * 0.6, 0, 0, 6.283); ctx.fill();
  }
  ctx.restore();
  lampGlow(ctx, lx, pool - 200, pool, rx, fl, false);
}

/**
 * La lumière colorée d'une lampe à verre au plomb : un halo sur le mur autour de la coupole (vert d'eau, ambre), puis une flaque de
 * lumière sur le plateau, mêlée de taches des couleurs des verres (elles tremblent avec la flamme). `lx` : l'axe ; `edge` : le bord
 * de la coupole ; `pool` : le plateau, sous la lampe ; `rx` : la demi-largeur de la coupole ; `wall` : dessiner le halo du mur.
 */
function lampGlow(ctx, lx, edge, pool, rx, fl = 1, wall = true) {
  const k = rx / 40, a = 0.85 + 0.15 * fl;
  ctx.save(); ctx.globalCompositeOperation = "screen";
  if (wall) for (const [dx, col, R, al] of [[-0.5, [40, 200, 180], 90, 0.35], [0.5, [255, 140, 30], 80, 0.32], [0, [110, 200, 60], 60, 0.2]]) {
    const g = ctx.createRadialGradient(lx + dx * rx, edge - rx * 0.6, 4, lx + dx * rx, edge - rx * 0.6, R * k); g.addColorStop(0, rgba(col[0], col[1], col[2], al * a)); g.addColorStop(1, rgba(col[0], col[1], col[2], 0));
    ctx.fillStyle = g; ctx.fillRect(lx - R * k * 1.6, edge - rx * 0.6 - R * k, R * k * 3.2, R * k * 2);
  }
  if (pool == null) { ctx.restore(); return; }
  // la flaque sur le plateau : chaude au centre, colorée sur les bords
  const W2 = rx * 2.3, H2 = rx * 0.95; // une flaque resserrée autour du pied
  for (const [dx, col, al] of [[0, [230, 180, 110], 0.1], [-0.55, [70, 170, 155], 0.22], [0.55, [220, 140, 60], 0.2], [0.15, [120, 170, 80], 0.13]]) {
    const cx = lx + dx * W2 * 0.5, g = ctx.createRadialGradient(cx, pool, 2, cx, pool, W2 * 0.55); g.addColorStop(0, rgba(col[0], col[1], col[2], al * a)); g.addColorStop(1, rgba(col[0], col[1], col[2], 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, pool, W2 * 0.55, H2 * 0.55, 0, 0, 6.283); ctx.fill();
  }
  // les taches des verres : de petites lueurs colorées éparses, au bord de la flaque
  const q = rng(0x71ff), cols = [[70, 180, 165], [230, 150, 60], [120, 180, 80], [200, 120, 150]];
  for (let i = 0; i < 8; i++) { const ang = q() * 6.283, rr = 0.35 + q() * 0.6, x = lx + Math.cos(ang) * W2 * 0.5 * rr, y = pool + Math.sin(ang) * H2 * 0.5 * rr, col = cols[i % 4], s = (3 + q() * 5) * k; const g = ctx.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, rgba(col[0], col[1], col[2], 0.28 * a)); g.addColorStop(1, rgba(col[0], col[1], col[2], 0)); ctx.fillStyle = g; ctx.fillRect(x - s, y - s, 2 * s, 2 * s); }
  ctx.restore();
}

/**
 * La porte de l'atelier sous la Verrière : un bois sombre aux reflets irisés, un encadrement de cuivre au cintre surbaissé (la lucarne est
 * juste au-dessus), des moulures en coup de fouet, un vitrail ovale à lys dans le haut, une poignée de cuivre en feuille.
 */
function atelierDoor(ctx, c, sky, dx, dy, dw, FLOOR) {
  const G = glassTones(c, sky, 0.25), m = dx + dw / 2, top = dy - 6, sp = dy + 10;
  const arch = (k) => { ctx.beginPath(); ctx.moveTo(dx - k, FLOOR); ctx.lineTo(dx - k, sp); ctx.quadraticCurveTo(m, top - k * 1.6, dx + dw + k, sp); ctx.lineTo(dx + dw + k, FLOOR); ctx.closePath(); };
  ctx.fillStyle = c(COPPER_LO); arch(5); ctx.fill(); ctx.strokeStyle = c(COPPER_HI); ctx.lineWidth = 1; arch(5); ctx.stroke();
  const g = ctx.createLinearGradient(dx, 0, dx + dw, 0); g.addColorStop(0, c("#3a2416")); g.addColorStop(0.5, c("#4a2e1c")); g.addColorStop(1, c("#2a1a10")); ctx.fillStyle = g; arch(0); ctx.fill();
  ctx.save(); arch(0); ctx.clip(); for (let i = 0; i < 5; i++) { ctx.strokeStyle = rgba(i % 2 ? 120 : 200, i % 2 ? 190 : 120, i % 2 ? 160 : 170, 0.07); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx + 6 + i * 12, FLOOR); ctx.bezierCurveTo(dx + i * 12, FLOOR - 60, dx + 14 + i * 12, dy + 60, dx + 4 + i * 12, top); ctx.stroke(); } ctx.restore(); // les veines irisées
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 1.4; for (const s2 of [-1, 1]) { const x0 = m + s2 * (dw / 2 - 7); ctx.beginPath(); ctx.moveTo(x0, FLOOR - 8); ctx.lineTo(x0, dy + 70); ctx.bezierCurveTo(x0, dy + 52, m + s2 * 4, dy + 66, m + s2 * 2, dy + 50); ctx.stroke(); } // les moulures en coup de fouet
  const ox = m, oy = dy + 30; ctx.fillStyle = G.amb; ctx.beginPath(); ctx.ellipse(ox, oy, 14, 19, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = rgba(40, 24, 10, 0.65); ctx.lineWidth = 1; ctx.lineCap = "round"; motif(ctx, "lily", ox, oy - 15, oy + 18, 0.42); ctx.lineCap = "butt";
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(ox, oy, 14, 19, 0, 0, 6.283); ctx.stroke(); // le vitrail ovale
  const hx = dx + dw - 10, hy = dy + 70; ctx.fillStyle = c(COPPER_HI); ctx.beginPath(); ctx.moveTo(hx, hy - 8); ctx.quadraticCurveTo(hx + 5, hy, hx, hy + 9); ctx.quadraticCurveTo(hx - 5, hy, hx, hy - 8); ctx.fill(); ctx.fillStyle = c(COPPER_LO); ctx.beginPath(); ctx.arc(hx, hy, 1.6, 0, 6.283); ctx.fill(); // la poignée, une feuille de cuivre
}

/**
 * Un vitrail opaque (la Verrière vue du dehors, l'appentis de la machine) : une ogive de verres sertis de plomb, dans les
 * couleurs du hublot de l'atelier — vert d'eau et orange doux — et un motif art nouveau : une bordure orangée qui suit
 * l'ogive, une tige en coup de fouet, deux feuilles, une fleur en tulipe. On ne voit pas à travers ; la nuit, il s'allume.
 * `lit` : 0 (le jour) à 1 (allumé la nuit). `c` : la couleur de la scène.
 */
function stainedBay(ctx, c, xa, xb, top, base, lit, seed = 1, plain = false) {
  const m = (xa + xb) / 2, w = xb - xa, hgt = base - top, L = clamp(lit), glow = (h, g) => mix(c(h), g, clamp(L * 0.9)), dir = seed % 2 ? 1 : -1;
  const TEAL = glow("#5fb8a8", "#a8f0e0"), TEAL2 = glow("#2f7a70", "#6fd0c0"), TEAL3 = glow("#1f5a52", "#4fb0a0"), ORA = glow("#d88a4a", "#ffc890"), ORA2 = glow("#b0602a", "#f0a060");
  if (plain) { glassOnly(ctx, c, xa, xb, top, base, seed, [TEAL, TEAL2, TEAL3, glow("#7fc8b8", "#c0f8ec")], [ORA, ORA2]); return; }
  ctx.save(); ogive(ctx, xa, xb, top, base); ctx.clip();
  const bg = ctx.createLinearGradient(0, top, 0, base); bg.addColorStop(0, TEAL); bg.addColorStop(1, TEAL2); ctx.fillStyle = bg; ctx.fillRect(xa - 1, top - 1, w + 2, hgt + 2);
  /* la bordure orangée, le long de l'ogive */
  ctx.strokeStyle = ORA2; ctx.lineWidth = w * 0.16; ogive(ctx, xa, xb, top, base); ctx.stroke();
  /* la tige, en coup de fouet, et deux feuilles */
  const fy = top + hgt * 0.34, stem = () => { ctx.beginPath(); ctx.moveTo(m - dir * w * 0.1, base); ctx.bezierCurveTo(m + dir * w * 0.22, base - hgt * 0.3, m - dir * w * 0.2, fy + hgt * 0.25, m, fy + hgt * 0.06); };
  for (const [k, s2] of [[0.62, 1], [0.44, -1]]) { const ly = top + hgt * k, lx = m + s2 * w * 0.05; ctx.fillStyle = TEAL3; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + s2 * w * 0.28, ly - hgt * 0.1, lx + s2 * w * 0.34, ly - hgt * 0.2); ctx.quadraticCurveTo(lx + s2 * w * 0.08, ly - hgt * 0.12, lx, ly); ctx.fill(); }
  /* la fleur, en tulipe */
  ctx.fillStyle = ORA; ctx.beginPath(); ctx.moveTo(m - w * 0.2, fy - hgt * 0.06); ctx.quadraticCurveTo(m - w * 0.22, fy + hgt * 0.08, m, fy + hgt * 0.09); ctx.quadraticCurveTo(m + w * 0.22, fy + hgt * 0.08, m + w * 0.2, fy - hgt * 0.06); ctx.lineTo(m + w * 0.08, fy - hgt * 0.01); ctx.lineTo(m, fy - hgt * 0.1); ctx.lineTo(m - w * 0.08, fy - hgt * 0.01); ctx.closePath(); ctx.fill();
  /* le plomb */
  ctx.strokeStyle = c(LEAD); ctx.lineWidth = 0.6; ctx.lineCap = "round";
  stem(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(m - w * 0.2, fy - hgt * 0.06); ctx.quadraticCurveTo(m - w * 0.22, fy + hgt * 0.08, m, fy + hgt * 0.09); ctx.quadraticCurveTo(m + w * 0.22, fy + hgt * 0.08, m + w * 0.2, fy - hgt * 0.06); ctx.lineTo(m + w * 0.08, fy - hgt * 0.01); ctx.lineTo(m, fy - hgt * 0.1); ctx.lineTo(m - w * 0.08, fy - hgt * 0.01); ctx.closePath(); ctx.stroke();
  const inset = w * 0.08, k = (xb - xa - 2 * inset) * 0.55; ctx.beginPath(); ctx.moveTo(xa + inset, base); ctx.lineTo(xa + inset, top + inset + k); ctx.quadraticCurveTo(xa + inset, top + inset + k * 0.2, m, top + inset); ctx.quadraticCurveTo(xb - inset, top + inset + k * 0.2, xb - inset, top + inset + k); ctx.lineTo(xb - inset, base); ctx.stroke();
  for (const y of [top + hgt * 0.78, top + hgt * 0.9]) { ctx.beginPath(); ctx.moveTo(xa, y); ctx.quadraticCurveTo(m, y - hgt * 0.03, xb, y); ctx.stroke(); }
  ctx.restore();
}

/**
 * Un vitrail sans dessin : seulement du verre, en morceaux sertis de plomb. Des bandes qui suivent l'ogive, recoupées en
 * éclats irréguliers, presque tous vert d'eau (quatre tons), quelques-uns orange doux ; une pierre ronde au sommet.
 */
function glassOnly(ctx, c, xa, xb, top, base, seed, teals, oranges) {
  const m = (xa + xb) / 2, w = xb - xa, hgt = base - top, q = rng(0x9a55 + seed * 131);
  ctx.save(); ogive(ctx, xa, xb, top, base); ctx.clip();
  const rows = Math.max(5, Math.round(hgt / (w * 0.42))), cols = 3, pts = [];
  for (let r = 0; r <= rows; r++) { const row = []; for (let k = 0; k <= cols; k++) { const edge = k === 0 || k === cols || r === 0 || r === rows; row.push([xa + (w * k) / cols + (edge ? 0 : (q() - 0.5) * w * 0.22), top + (hgt * r) / rows + (edge ? 0 : (q() - 0.5) * hgt / rows * 0.5)]); } pts.push(row); }
  const lead = c(LEAD);
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const a = pts[r][k], b = pts[r][k + 1], d = pts[r + 1][k + 1], e = pts[r + 1][k], split = q() < 0.5;
    const tris = split ? [[a, b, d], [a, d, e]] : [[a, b, e], [b, d, e]];
    for (const t of tris) { ctx.fillStyle = q() < 0.16 ? oranges[Math.floor(q() * oranges.length)] : teals[Math.floor(q() * teals.length)]; ctx.beginPath(); ctx.moveTo(t[0][0], t[0][1]); ctx.lineTo(t[1][0], t[1][1]); ctx.lineTo(t[2][0], t[2][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = lead; ctx.lineWidth = 0.6; ctx.stroke(); }
  }
  /* un léger éclat, comme un verre ancien qui n'est pas plan */
  ctx.fillStyle = rgba(255, 255, 255, 0.08); for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(xa + q() * w, top + q() * hgt, w * 0.08, 1.2, q() * 3, 0, Math.PI * 2); ctx.fill(); }
  /* la bordure : une bande d'orange doux le long de l'ogive, et la pierre ronde au sommet */
  ctx.strokeStyle = oranges[1]; ctx.lineWidth = w * 0.1; ogive(ctx, xa, xb, top, base); ctx.stroke();
  const inset = w * 0.1, kk = (w - 2 * inset) * 0.55; ctx.strokeStyle = lead; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(xa + inset, base); ctx.lineTo(xa + inset, top + inset + kk); ctx.quadraticCurveTo(xa + inset, top + inset + kk * 0.2, m, top + inset); ctx.quadraticCurveTo(xb - inset, top + inset + kk * 0.2, xb - inset, top + inset + kk); ctx.lineTo(xb - inset, base); ctx.stroke();
  const jy = top + w * 0.38, jr = w * 0.09; ctx.fillStyle = oranges[0]; ctx.beginPath(); ctx.arc(m, jy, jr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/**
 * Du verre en éclats sertis de plomb (comme dans la pièce de la machine), dans une forme quelconque : `clip()` trace le
 * contour. Vert d'eau en quatre tons, quelques éclats orange doux. `lit` : 0 (le jour) à 1 (allumé).
 */
function shards(ctx, c, x0, x1, top, bottom, clip, lit = 0.4, seed = 1) {
  const L = clamp(lit), glow = (h, g) => mix(c(h), g, clamp(L * 0.9)), teals = [glow("#5fb8a8", "#a8f0e0"), glow("#2f7a70", "#6fd0c0"), glow("#1f5a52", "#4fb0a0"), glow("#7fc8b8", "#c0f8ec")], oranges = [glow("#d88a4a", "#ffc890"), glow("#b0602a", "#f0a060")];
  const w = x1 - x0, h = bottom - top, q = rng(0x5a4d + seed * 97), cols = Math.max(4, Math.round(w / 12)), rows = Math.max(3, Math.round(h / 11)), pts = [];
  ctx.save(); clip(); ctx.clip();
  for (let r = 0; r <= rows; r++) { const row = []; for (let k = 0; k <= cols; k++) { const edge = k === 0 || k === cols || r === 0 || r === rows; row.push([x0 + (w * k) / cols + (edge ? 0 : (q() - 0.5) * (w / cols) * 0.7), top + (h * r) / rows + (edge ? 0 : (q() - 0.5) * (h / rows) * 0.7)]); } pts.push(row); }
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const a = pts[r][k], b = pts[r][k + 1], d = pts[r + 1][k + 1], e = pts[r + 1][k], tris = q() < 0.5 ? [[a, b, d], [a, d, e]] : [[a, b, e], [b, d, e]];
    for (const t of tris) { ctx.fillStyle = q() < 0.16 ? oranges[Math.floor(q() * 2)] : teals[Math.floor(q() * 4)]; ctx.beginPath(); ctx.moveTo(t[0][0], t[0][1]); ctx.lineTo(t[1][0], t[1][1]); ctx.lineTo(t[2][0], t[2][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(LEAD); ctx.lineWidth = 0.6; ctx.stroke(); }
  }
  ctx.restore();
}

/**
 * Une grille dans l'esprit des entrées de métro de Guimard, posée devant une vitre : rien de régulier. Des tiges qui
 * montent du bas en coup de fouet, s'épaississent et s'amincissent, se séparent en branches qui finissent en bourgeons ;
 * au milieu, un cartouche en écusson. `clip()` trace le contour de la vitre.
 */
function guimardGrille(ctx, c, x0, x1, top, bottom, clip, seed = 1, cartouche = true) {
  const q = rng(0x6a1d + seed * 53), iron = c("#0c1410"), hi = rgba(170, 210, 180, 0.45), w = x1 - x0, h = bottom - top, n = Math.max(3, Math.round(w / 9));
  ctx.save(); clip(); ctx.clip(); ctx.lineCap = "round";
  const stroke = (fn, lw) => { ctx.strokeStyle = iron; ctx.lineWidth = lw; fn(); ctx.stroke(); ctx.strokeStyle = hi; ctx.lineWidth = Math.max(0.35, lw * 0.28); fn(); ctx.stroke(); };
  const bud = (x, y, a, s) => { ctx.fillStyle = iron; ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s, a, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = hi; ctx.beginPath(); ctx.ellipse(x - s * 0.15, y - s * 0.3, s * 0.15, s * 0.35, a, 0, Math.PI * 2); ctx.fill(); };
  for (let i = 0; i < n; i++) {
    const bx = x0 + (w * (i + 0.5)) / n + (q() - 0.5) * (w / n) * 0.6, lean = (q() - 0.5) * w * 0.25, ty = top + q() * h * 0.25, mx = bx + lean, my = top + h * (0.35 + q() * 0.3);
    stroke(() => { ctx.beginPath(); ctx.moveTo(bx, bottom + 2); ctx.bezierCurveTo(bx - lean * 0.6, my + h * 0.2, mx + lean * 0.4, my, mx, ty); }, 2.6 - q() * 0.6); /* la tige, en coup de fouet */
    if (q() < 0.8) { const sy = my + (bottom - my) * q() * 0.6, sx = bx + (mx - bx) * 0.5, dir = q() < 0.5 ? -1 : 1, ex = sx + dir * (6 + q() * 10), ey = sy - 6 - q() * 12;
      stroke(() => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + dir * 2, sy - 8, ex, ey); }, 1.2); bud(ex, ey, dir * 0.5, 2.2 + q() * 1.2); } /* une branche, son bourgeon */
    bud(mx, ty, (q() - 0.5) * 0.6, 2.6 + q() * 1.6);
  }
  for (const k of [0.3, 0.66]) { const yy = top + h * k; stroke(() => { ctx.beginPath(); ctx.moveTo(x0 - 2, yy); ctx.bezierCurveTo(x0 + w * 0.3, yy - h * 0.06, x0 + w * 0.7, yy + h * 0.06, x1 + 2, yy); }, 2.2); } /* deux traverses qui ondulent : une vraie grille */
  if (cartouche) { /* le cartouche, en écusson, au milieu en bas */
    const cx = (x0 + x1) / 2, cy = top + h * 0.7, rw = Math.min(14, w * 0.14), rh = Math.min(h * 0.32, rw * 1.3);
    ctx.fillStyle = iron; ctx.beginPath(); ctx.moveTo(cx, cy - rh); ctx.bezierCurveTo(cx + rw * 1.2, cy - rh, cx + rw, cy + rh * 0.4, cx, cy + rh); ctx.bezierCurveTo(cx - rw, cy + rh * 0.4, cx - rw * 1.2, cy - rh, cx, cy - rh); ctx.fill();
    ctx.fillStyle = c("#2f5a48"); ctx.beginPath(); ctx.ellipse(cx, cy - rh * 0.1, rw * 0.45, rh * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    stroke(() => { ctx.beginPath(); ctx.moveTo(cx - rw * 1.6, cy - rh * 0.6); ctx.quadraticCurveTo(cx - rw * 1.2, cy - rh * 1.4, cx - rw * 0.3, cy - rh * 1.05); ctx.moveTo(cx + rw * 1.6, cy - rh * 0.6); ctx.quadraticCurveTo(cx + rw * 1.2, cy - rh * 1.4, cx + rw * 0.3, cy - rh * 1.05); }, 1.4);
  }
  ctx.restore();
}

/**
 * Un lampadaire à la manière du métro de Guimard : une tige de fonte verte qui monte d'un socle évasé, se recourbe comme
 * une tige de fleur qui ploie, et porte, sous un calice de feuilles de fonte, une lampe rouge en bouton qui pend et luit.
 * `dir` : vers où elle se penche (1 : à droite, −1 : à gauche).
 */
function guimardLamp(ctx, c, x, base, top, dir, glowK = 1) {
  const iron = c("#2a4632"), iron2 = c("#1a2e22"), hi = rgba(170, 220, 180, 0.35), cx = x + dir * 16, cy = top + 4; /* le calice, au bout de la crosse */
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.fillStyle = iron; ctx.beginPath(); ctx.moveTo(x - 8, base); ctx.quadraticCurveTo(x - 3, base - 12, x - 2.2, base - 26); ctx.lineTo(x + 2.2, base - 26); ctx.quadraticCurveTo(x + 3, base - 12, x + 8, base); ctx.closePath(); ctx.fill(); /* le socle évasé, comme une racine */
  const stem = () => { ctx.beginPath(); ctx.moveTo(x, base - 24); ctx.bezierCurveTo(x - dir * 5, base - (base - top) * 0.5, x - dir * 4, top - 14, x + dir * 6, top - 12); ctx.quadraticCurveTo(cx + dir * 4, top - 10, cx, cy - 2); };
  ctx.strokeStyle = iron2; ctx.lineWidth = 4.2; stem(); ctx.stroke(); ctx.strokeStyle = iron; ctx.lineWidth = 2.8; stem(); ctx.stroke(); ctx.strokeStyle = hi; ctx.lineWidth = 0.8; stem(); ctx.stroke(); /* la tige qui ploie */
  ctx.strokeStyle = iron; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - dir * 2, base - (base - top) * 0.55); ctx.bezierCurveTo(x - dir * 12, base - (base - top) * 0.62, x - dir * 12, base - (base - top) * 0.78, x - dir * 5, base - (base - top) * 0.8); ctx.stroke(); /* une feuille, en volute */
  const ly = cy + 6; /* la lampe pend sous le calice, son col dedans */
  ctx.fillStyle = iron; ctx.fillRect(cx - 1.6, cy - 2, 3.2, 6); /* le col de fonte, qui tient la lampe */
  const g = ctx.createRadialGradient(cx, ly, 1, cx, ly, 30); g.addColorStop(0, rgba(255, 110, 70, 0.5 * glowK)); g.addColorStop(1, rgba(255, 90, 60, 0)); ctx.fillStyle = g; ctx.fillRect(cx - 30, ly - 30, 60, 60);
  const bg = ctx.createRadialGradient(cx - dir * 1.5, ly + 1, 0.5, cx, ly, 8); bg.addColorStop(0, "#ffe0b8"); bg.addColorStop(0.3, "#ff6a3a"); bg.addColorStop(1, "#8a1a12"); ctx.fillStyle = bg;
  ctx.beginPath(); ctx.moveTo(cx - 6, ly - 4); ctx.bezierCurveTo(cx - 8, ly + 5, cx - 3, ly + 10, cx, ly + 10); ctx.bezierCurveTo(cx + 3, ly + 10, cx + 8, ly + 5, cx + 6, ly - 4); ctx.closePath(); ctx.fill(); /* le bouton de verre rouge, en tulipe renversée */
  ctx.strokeStyle = rgba(120, 20, 10, 0.5); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(cx - 2.5, ly - 3); ctx.quadraticCurveTo(cx - 3, ly + 5, cx - 0.5, ly + 9.5); ctx.moveTo(cx + 2.5, ly - 3); ctx.quadraticCurveTo(cx + 3, ly + 5, cx + 0.5, ly + 9.5); ctx.stroke(); /* les côtes du verre */
  /* le calice : trois feuilles de fonte qui enveloppent le haut de la lampe et se recourbent */
  for (const [ox, sp] of [[-1, -1], [0, 0], [1, 1]]) {
    ctx.fillStyle = sp ? iron : iron2; ctx.beginPath(); ctx.moveTo(cx + ox * 1.5, cy - 3); ctx.bezierCurveTo(cx + sp * 9, cy - 3, cx + sp * 10, cy + 5, cx + sp * 7.5, cy + 9); ctx.quadraticCurveTo(cx + sp * 4, cy + 4, cx + ox * 1.5 - sp * 1, cy - 1); ctx.closePath(); ctx.fill();
    if (sp) { ctx.strokeStyle = hi; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(cx + ox * 1.5, cy - 2); ctx.quadraticCurveTo(cx + sp * 8, cy - 1, cx + sp * 7.5, cy + 8); ctx.stroke(); }
  }
  ctx.fillStyle = iron; ctx.beginPath(); ctx.ellipse(cx, cy - 3, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
}

/**
 * Une grille de fer forgé art nouveau, posée devant une vitre (le cellier : une chambre forte) : des barreaux qui ondulent
 * comme des tiges, une traverse, des volutes et quelques feuilles. `clip()` trace le contour de la vitre (déjà commencé).
 */
function ironGrille(ctx, c, x0, x1, top, bottom, clip, seed = 1) {
  const q = rng(0x1f0 + seed * 17), iron = c("#14110f"), hi = rgba(150, 130, 100, 0.35), w = x1 - x0, h = bottom - top, n = Math.max(3, Math.round(w / 9));
  ctx.save(); clip(); ctx.clip(); ctx.lineCap = "round";
  const bar = (fn, lw) => { ctx.strokeStyle = iron; ctx.lineWidth = lw; fn(); ctx.stroke(); ctx.strokeStyle = hi; ctx.lineWidth = Math.max(0.4, lw * 0.3); fn(); ctx.stroke(); };
  for (let i = 1; i < n; i++) { const x = x0 + (w * i) / n, sway = (i % 2 ? 1 : -1) * w * 0.035; bar(() => { ctx.beginPath(); ctx.moveTo(x, bottom + 2); ctx.bezierCurveTo(x + sway, bottom - h * 0.35, x - sway, top + h * 0.35, x, top - 2); }, 1.6); }
  const ty = top + h * 0.62; bar(() => { ctx.beginPath(); ctx.moveTo(x0 - 2, ty); ctx.quadraticCurveTo((x0 + x1) / 2, ty - h * 0.08, x1 + 2, ty); }, 1.8); /* la traverse */
  for (let i = 0; i < n - 1; i++) { /* des volutes sur la traverse, une sur deux vers le haut */
    const x = x0 + (w * (i + 0.5)) / n, up = i % 2 ? -1 : 1, rr = Math.min(w / n, h * 0.25) * 0.45;
    bar(() => { ctx.beginPath(); for (let a = 0; a < Math.PI * 2.2; a += 0.25) { const k = rr * (1 - a / (Math.PI * 2.6)); const px = x + Math.cos(a) * k, py = ty - up * (rr + Math.sin(a) * k); a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } }, 1.1);
  }
  for (let i = 0; i < Math.max(2, n - 2); i++) { const x = x0 + q() * w, y = top + q() * h * 0.5, a = q() * Math.PI; ctx.fillStyle = iron; ctx.beginPath(); ctx.ellipse(x, y, 3, 1.3, a, 0, Math.PI * 2); ctx.fill(); } /* quelques feuilles */
  ctx.restore();
}

/** Le verre dépoli de la coupole, patiné vert-de-gris (opaque, veiné comme une pierre), dans le chemin courant déjà découpé. */
function frostedDome(ctx, c, x0, y0, x1, y1, lit, seed = 1) {
  const L = clamp(lit), g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, mix(c("#8ab8a6"), "#c8f0dc", L * 0.7)); g.addColorStop(0.6, mix(c("#4f8a7a"), "#7fd0b8", L * 0.7)); g.addColorStop(1, mix(c("#2f5a50"), "#4f9a84", L * 0.7));
  ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  const q = rng(0xd0e + seed), w = x1 - x0, h = y1 - y0;
  ctx.lineCap = "round";
  for (let i = 0; i < 14; i++) { /* des veines, comme dans un verre coulé */
    const x = x0 + q() * w, y = y0 + q() * h; ctx.strokeStyle = q() < 0.6 ? rgba(225, 250, 238, 0.16 + L * 0.08) : rgba(14, 40, 34, 0.18); ctx.lineWidth = 0.5 + q() * 0.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + w * 0.1 * (q() - 0.3), y + h * 0.2 * (q() - 0.5), x + w * 0.2 * (q() - 0.2), y + h * 0.2 * (q() - 0.5), x + w * 0.25 * (q() - 0.1), y + h * 0.15 * (q() - 0.5)); ctx.stroke();
  }
  ctx.fillStyle = rgba(255, 255, 255, 0.10 + L * 0.05); ctx.beginPath(); ctx.ellipse(x0 + w * 0.36, y0 + h * 0.3, w * 0.16, h * 0.08, -0.35, 0, Math.PI * 2); ctx.fill(); /* le reflet */
}

/**
 * L'œil-de-bœuf grillagé de la chambre forte (maquette 4a) : un rond noir (rien derrière, la pierre), une toile dans un coin,
 * sept rayons de fer en spirale avec leurs bourgeons et des volutes, un moyeu, une goutte ; une bague de cuivre rivetée et
 * deux volutes de cuivre de part et d'autre.
 */
function roundGrille(ctx, c, cx, cy, R, seed = 4) {
  const TAU = Math.PI * 2, iron = c("#0c1410"), hi = rgba(170, 210, 180, 0.45), q = rng(seed);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.fillStyle = c("#03060a"); ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, R); g.addColorStop(0, rgba(40, 70, 60, 0.18)); g.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.strokeStyle = rgba(200, 210, 215, 0.35); ctx.lineWidth = 0.5; /* la toile */
  for (let i = 0; i < 6; i++) { const a = Math.PI * 1.05 + i * 0.11; ctx.beginPath(); ctx.moveTo(cx + R - 1, cy - R + 1); ctx.lineTo(cx + R - 1 + Math.cos(a) * 20, cy - R + 1 + Math.sin(a) * 20); ctx.stroke(); }
  for (let r = 5; r < 20; r += 4.5) { ctx.beginPath(); ctx.arc(cx + R - 1, cy - R + 1, r, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke(); }
  ctx.lineCap = "round";
  const st = (fn, lw) => { ctx.strokeStyle = iron; ctx.lineWidth = lw; fn(); ctx.stroke(); ctx.strokeStyle = hi; ctx.lineWidth = lw * 0.3; fn(); ctx.stroke(); };
  const bud = (x, y, a, s) => { ctx.fillStyle = iron; ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s, a, 0, TAU); ctx.fill(); };
  const n = 7, tw = 0.9;
  for (let i = 0; i < n; i++) {
    const a0 = i * TAU / n + 0.3, a1 = a0 + tw * 0.5, a2 = a0 + tw;
    st(() => { ctx.beginPath(); ctx.moveTo(cx + Math.cos(a0) * 3, cy + Math.sin(a0) * 3); ctx.bezierCurveTo(cx + Math.cos(a1) * R * 0.45, cy + Math.sin(a1) * R * 0.45, cx + Math.cos(a2) * R * 0.8, cy + Math.sin(a2) * R * 0.8, cx + Math.cos(a2 + 0.15) * (R + 2), cy + Math.sin(a2 + 0.15) * (R + 2)); }, 2.2);
    bud(cx + Math.cos(a0 + tw * 0.7) * R * 0.62, cy + Math.sin(a0 + tw * 0.7) * R * 0.62, a0 + tw, 2.2 + q());
    if (i % 2) { const sx = cx + Math.cos(a0 + 0.25) * R * 0.3, sy = cy + Math.sin(a0 + 0.25) * R * 0.3; st(() => { ctx.beginPath(); ctx.moveTo(sx, sy); for (let t = 0; t < Math.PI * 1.8; t += 0.3) { const k = 5 * (1 - t / (Math.PI * 2.2)); ctx.lineTo(sx + Math.cos(a0 - t) * k, sy + Math.sin(a0 - t) * k); } }, 1.2); }
  }
  ctx.fillStyle = iron; ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, TAU); ctx.fill(); ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(cx - 1, cy - 1, 1, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(170, 200, 210, 0.7); ctx.fillRect(cx - 6, cy + 10, 1, 3); /* une goutte */
  ctx.restore();
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, TAU); ctx.stroke();
  ctx.strokeStyle = c(COPPER_HI); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5, 0, TAU); ctx.stroke();
  ctx.fillStyle = c(COPPER); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (R + 1), cy + Math.sin(a) * (R + 1), 1.6, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = c(COPPER); ctx.lineWidth = 1.4; ctx.lineCap = "round";
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * (R + 2), cy + 6); ctx.quadraticCurveTo(cx + s * (R + 16), cy + 2, cx + s * (R + 14), cy - 10); ctx.quadraticCurveTo(cx + s * (R + 10), cy - 14, cx + s * (R + 8), cy - 8); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx + s * (R + 8), cy - 9, 2.4, 1.1, s * 0.8, 0, TAU); ctx.fill(); }
  ctx.lineCap = "butt";
}

module.exports = { roundGrille, shards, guimardGrille, guimardLamp, ironGrille, stainedBay, frostedDome,  atelierDoor, lampPool, lampGlow, cabinDoorNouveau, setDoorStyle, cabinDoorSingle, tiffanyLamp, ornateRug, bronzeTrap, armchair, roundWindowRing, pillarVine, darkMosaic, cornerVines, imagerRoom, imagerBench, cabinOculus, MOTIFS, motif, copperPlate, copperEdge, shelfCrest, tableLegs,  ogive, glassTones, pane, vine, hangingPot, cabinWalls, cabinFloor, cabinWindowFrame, cabinWindowClip, cabinDoor, lightPatches, cabinPlants, COPPER, COPPER_HI, COPPER_LO, LEAD };
