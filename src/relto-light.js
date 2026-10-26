"use strict";
/*
 * La lumière des vitraux, comme dans les églises (27 oct. 2026, idée de l'auteur) : le jour, le soleil traverse les verres colorés et pose
 * sur le sol leur image, renversée, étirée, découpée par les plombs. Elle glisse avec l'heure : le matin longue et penchée d'un côté, à midi
 * courte et vive au pied du mur, le soir longue de l'autre côté et plus chaude ; la nuit, rien.
 * Une fenêtre se décrit en cellules : des polygones (coordonnées du mur) et leur couleur ; on projette chaque coin sur le sol.
 */
const { rgba } = require("./util");
const clamp = (v) => Math.max(0, Math.min(1, v));

/** Le soleil à l'heure dite : `el` sa hauteur (0 au lever et au coucher, 1 à midi), `az` d'où il vient (+1 le matin, −1 le soir), `day` la force du jour. Null la nuit. */
function sunOf(sky, hour) {
  const h = hour == null ? (sky && sky.hour != null ? sky.hour : 12) : hour, u = (h - 6) / 12;
  const day = clamp((((sky && sky.ambient) == null ? 0.7 : sky.ambient) - 0.3) / 0.5);
  if (u <= 0.02 || u >= 0.98 || day <= 0) return null;
  return { el: Math.sin(Math.PI * u), az: Math.cos(Math.PI * u), day };
}

/**
 * Pose sur le sol l'image d'un vitrail. cells : [{ pts: [[x, y]…], col: [r, g, b], a }] dans les coordonnées du mur.
 * o : { floor (le pied du mur), k (la portée : plus la fenêtre est haute, plus petit), cx (l'axe de la fenêtre), bottom (le bas de l'écran) }.
 */
function cast(ctx, sky, hour, cells, o) {
  const S = sunOf(sky, hour); if (!S) return;
  const K = (o.k || 1) * (1.35 - S.el), warm = 1 - S.el, power = S.day * (0.55 + 0.45 * Math.min(1, S.el * 2.2));
  const P = ([x, y]) => { const dy = Math.max(0, o.floor - y); return [x + S.az * dy * K * 0.55 + (x - o.cx) * dy * K * 0.006, o.floor + dy * K * 0.42]; };
  ctx.save(); ctx.beginPath(); ctx.rect(0, o.floor, 2000, (o.bottom || 360) - o.floor); ctx.clip();
  ctx.globalCompositeOperation = "lighter"; if ("filter" in ctx) ctx.filter = "blur(1.2px)";
  for (const c of cells) {
    const pts = c.pts.map(P), mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const r = Math.round(c.col[0] + (255 - c.col[0]) * 0.1 * warm), g = Math.round(c.col[1] * (1 - 0.12 * warm)), b = Math.round(c.col[2] * (1 - 0.3 * warm)); /* le soir, la lumière chauffe */
    ctx.fillStyle = rgba(r, g, b, Math.min(0.9, (c.a == null ? 0.62 : c.a * 2) * power));
    ctx.beginPath(); pts.forEach(([x, y], i) => { const px = mx + (x - mx) * 0.86, py = my + (y - my) * 0.86; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.fill(); /* rétréci vers son centre : le plomb laisse un trait sombre */
  }
  ctx.restore();
}

/** Les cellules d'une ogive : une grille sur sa boîte, gardée dedans (et hors d'un clair intérieur, si `hole`). col(u, v) donne la couleur (u, v de 0 à 1 dans la boîte), ou null. */
function archCells(xa, xb, top, spring, base, nx, ny, col, hole) {
  const inArch = (A, x, y) => { const hw = (A.xb - A.xa) / 2, m = (A.xa + A.xb) / 2, d = Math.abs(x - m) / hw; if (d > 1 || y > A.base) return false; return y >= A.top + (A.spring - A.top) * (1 - Math.sqrt(Math.max(0, 1 - d * d))); };
  const A = { xa, xb, top, spring, base }, out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const x0 = xa + (xb - xa) * i / nx, x1 = xa + (xb - xa) * (i + 1) / nx, y0 = top + (base - top) * j / ny, y1 = top + (base - top) * (j + 1) / ny, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (!inArch(A, cx, cy) || (hole && inArch(hole, cx, cy))) continue;
    const c = col((cx - xa) / (xb - xa), (cy - top) / (base - top), i, j); if (c) out.push({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col: c.col || c, a: c.a });
  }
  return out;
}

/** Les cellules d'une rosace : n secteurs entre ri et r (col(i)), et, si `clear`, le clair du milieu en quatre. */
function roseCells(x, y, r, ri, n, col, clear) {
  const out = [], seg = (a0, a1, r0, r1) => [[x + Math.cos(a0) * r0, y + Math.sin(a0) * r0], [x + Math.cos(a0) * r1, y + Math.sin(a0) * r1], [x + Math.cos((a0 + a1) / 2) * r1, y + Math.sin((a0 + a1) / 2) * r1], [x + Math.cos(a1) * r1, y + Math.sin(a1) * r1], [x + Math.cos(a1) * r0, y + Math.sin(a1) * r0]];
  for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2; out.push({ pts: seg(a0, a1, ri, r), col: col(i) }); }
  if (clear) for (let i = 0; i < 4; i++) { const a0 = (i / 4) * Math.PI * 2, a1 = ((i + 1) / 4) * Math.PI * 2; out.push({ pts: seg(a0, a1, 0.01, ri), col: clear, a: 0.16 }); }
  return out;
}

const RED = [214, 52, 60], PURP = [150, 70, 190], GOLDL = [255, 196, 90], BLUE = [70, 120, 230], CLEAR = [255, 246, 226], TEAL = [110, 214, 196], AMBER = [255, 196, 106];

/** La fenêtre de la cabane sous le Château : la tête de l'arc en vitrail rouge, violet et or (la rosace bleue au milieu), le clair dessous en quatre. */
function castleCabin(ctx, sky, hour, wx, wy, ww, wh, FLOOR) {
  const head = wy + 18, cells = archCells(wx, wx + ww, wy - 28, wy + 6, head, 7, 5, (u, v, i, j) => { const d = Math.hypot(u - 0.5, (v - 0.45) * 0.9); if (d < 0.16) return BLUE; return [RED, PURP, GOLDL, PURP, RED][(i + j) % 5]; });
  for (const [x0, x1] of [[wx, wx + ww / 2], [wx + ww / 2, wx + ww]]) for (const [y0, y1] of [[head, wy + wh / 2 + 9], [wy + wh / 2 + 9, wy + wh]]) cells.push({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col: CLEAR, a: 0.13 });
  cast(ctx, sky, hour, cells, { floor: FLOOR, k: 1.1, cx: wx + ww / 2 });
}
/** La fenêtre de la cabane sous la Verrière : la bordure de petits verres (ambre en haut, vert d'eau sur les côtés), le clair au milieu. */
function glassCabin(ctx, sky, hour, wx, wy, ww, wh, FLOOR) {
  const xa = wx - 8, xb = wx + ww + 8, top = wy - 38, base = wy + wh, k = (xb - xa) * 0.55, ki = ww * 0.55;
  const cells = archCells(xa, xb, top, top + k, base, 12, 14, (u, v, i, j) => (v < 0.3 ? AMBER : j % 3 === 0 ? [90, 170, 220] : TEAL), { xa: wx, xb: wx + ww, top: wy - 22, spring: wy - 22 + ki, base });
  cells.push(...archCells(wx, wx + ww, wy - 22, wy - 22 + ki, base, 2, 2, () => ({ col: CLEAR, a: 0.12 })));
  cast(ctx, sky, hour, cells, { floor: FLOOR, k: 1.1, cx: wx + ww / 2 });
}
/** La fenêtre ronde de l'atelier : la rosace du Château (pétales rouges et or), ou l'anneau de verre de la Verrière ; haute, sa lumière tombe loin. */
function atelierRose(ctx, sky, hour, x, y, r, skin, FLOOR) {
  const cells = skin === "castle" ? roseCells(x, y, r, r * 0.66, 8, (i) => (i % 2 ? PURP : [230, 150, 60]), CLEAR) : roseCells(x, y, r, r * 0.7, 12, (i) => (i % 2 ? TEAL : AMBER), CLEAR);
  cast(ctx, sky, hour, cells, { floor: FLOOR, k: 1.05, cx: x });
}

module.exports = { sunOf, cast, archCells, roseCells, castleCabin, glassCabin, atelierRose };
