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
function cabinDoor(ctx, c, sky, dx, dy, dw, FLOOR, fl) {
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
  pane(ctx, c, 38, 66, 66, FLOOR - 92, G.teal, G.teal2, "fern", 2.5);
  pane(ctx, c, 612, 638, 30, FLOOR - 92, G.teal, G.teal2, "ginkgo", 2.5);
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
function roundWindowRing(ctx, c, sky, x, y, r) {
  const G = glassTones(c, sky, 0.1), ri = r * 0.7, n = 12;
  for (let i = 0; i < n; i++) {
    const a0 = (i * 2 * Math.PI) / n, a1 = ((i + 1) * 2 * Math.PI) / n;
    ctx.fillStyle = i % 2 ? G.teal : G.amb; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.arc(x, y, ri, a1, a0, true); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = rgba(15, 47, 44, 0.85); ctx.lineWidth = 1.1;
  for (let i = 0; i < n; i++) { const a = (i * 2 * Math.PI) / n; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * ri, y + Math.sin(a) * ri); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
  for (let i = 0; i < n; i++) { const a = ((i + 0.5) * 2 * Math.PI) / n, m = (r + ri) / 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * m, y + Math.sin(a) * m, 2.2, 1.2, a, 0, 6.283); ctx.stroke(); } // un bourgeon dans chaque verre
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

module.exports = { armchair, roundWindowRing, pillarVine, darkMosaic, cornerVines, imagerRoom, imagerBench, cabinOculus, MOTIFS, motif, copperPlate, copperEdge, shelfCrest, tableLegs,  ogive, glassTones, pane, vine, hangingPot, cabinWalls, cabinFloor, cabinWindowFrame, cabinWindowClip, cabinDoor, lightPatches, cabinPlants, COPPER, COPPER_HI, COPPER_LO, LEAD };
