"use strict";
/* Le chapitre 14, dessin (claude/DESIGN-art-bahro.md §2–3) : la pierre de liaison, leur don, et l'encrier qui frémit. Rien d'écrit, rien de chiffré. */
const { rgba, fnv } = require("./util");
const FR = require("./relto-fresco");
const TAU = Math.PI * 2;

/* un galet : un contour irrégulier tiré d'une graine, jamais taillé (l'inverse de la tablette, qui l'est) */
function pebble(ctx, rx, ry, seed) {
  const ph = [1, 2, 3].map((i) => ((fnv(seed + "#" + i) % 628) / 100));
  ctx.beginPath();
  for (let k = 0; k <= 64; k++) {
    const a = (k / 64) * TAU, j = 1 + 0.06 * Math.sin(2 * a + ph[0]) + 0.035 * Math.sin(3 * a + ph[1]) + 0.018 * Math.sin(5 * a + ph[2]);
    const x = Math.cos(a) * rx * j, y = Math.sin(a) * ry * j;
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

const GLOW = { sea: [120, 228, 196], ochre: [236, 150, 80] };

/** La pierre de liaison, posée à plat : (x, y) son centre, `s` sa demi-largeur, `sq` l'écrasement de la vue (0.55 posée, 0.85 tenue). */
function linkStone(ctx, c, x, y, s, t, o = {}) {
  const sign = o.sign || "link", col = GLOW[o.glow || "sea"], sq = o.sq || 0.55, rx = s, ry = s * sq, th = s * (o.thick || 0.28);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot == null ? 0.08 : o.rot);
  /* l'ombre, en dégradé */
  const sh = ctx.createRadialGradient(s * 0.12, th + ry * 0.2, 1, s * 0.12, th + ry * 0.2, rx * 1.25);
  sh.addColorStop(0, rgba(0, 0, 0, 0.45)); sh.addColorStop(1, rgba(0, 0, 0, 0));
  ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(s * 0.12, th + ry * 0.25, rx * 1.25, ry * 1.1, 0, 0, TAU); ctx.fill();
  /* l'épaisseur : le flanc, plus sombre */
  for (let i = 4; i >= 1; i--) { ctx.save(); ctx.translate(0, (th * i) / 4); pebble(ctx, rx * (1 - 0.02 * i), ry, "lk"); ctx.fillStyle = c(i === 4 ? "#0b0c0f" : "#14151a"); ctx.fill(); ctx.restore(); }
  /* le dessus, poli par l'eau */
  pebble(ctx, rx, ry, "lk");
  const g = ctx.createLinearGradient(-rx, -ry, rx * 0.6, ry);
  g.addColorStop(0, c("#3a3d44")); g.addColorStop(0.55, c("#22242a")); g.addColorStop(1, c("#16171b"));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); pebble(ctx, rx, ry, "lk"); ctx.clip();
  const hl = ctx.createRadialGradient(-rx * 0.35, -ry * 0.45, 1, -rx * 0.35, -ry * 0.45, rx * 0.7);
  hl.addColorStop(0, rgba(220, 225, 235, 0.16)); hl.addColorStop(1, rgba(220, 225, 235, 0));
  ctx.fillStyle = hl; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
  if (s > 30) for (let i = 0; i < 70; i++) { const u = (fnv("sp" + i) % 1000) / 1000, v = (fnv("sq" + i) % 1000) / 1000, a = u * TAU, d = Math.sqrt(v); ctx.fillStyle = i % 3 ? rgba(0, 0, 0, 0.22) : rgba(200, 205, 215, 0.08); ctx.fillRect(Math.cos(a) * d * rx * 0.92, Math.sin(a) * d * ry * 0.92, 1.4, 1.1); } /* le grain de la pierre, de près */
  /* le signe, gravé en creux, qui luit : il respire lentement (pas au rythme de la tablette) */
  const br = 0.55 + 0.45 * Math.sin(t * 0.9 + 1.3), ss = s * 0.55;
  ctx.save(); ctx.scale(1, sq);
  for (const [dx, dy] of [[0.9, 1.1], [-0.5, 0.4], [0.5, -0.4]]) FR.sign(ctx, sign, dx * ss * 0.06, dy * ss * 0.06, ss, 0.7, "lk" + sign, "#050608"); /* le creux, plus large que le trait qui luit */
  ctx.shadowColor = rgba(col[0], col[1], col[2], 0.9); ctx.shadowBlur = s * 0.22 * br;
  FR.sign(ctx, sign, 0, 0, ss, 0.45 + 0.4 * br, "lk" + sign, rgba(col[0], col[1], col[2], 1));
  ctx.shadowBlur = 0; ctx.restore();
  ctx.restore();
  /* un halo très doux sur le plateau */
  const ha = ctx.createRadialGradient(0, 0, 1, 0, 0, rx * 1.6);
  ha.addColorStop(0, rgba(col[0], col[1], col[2], 0.07 * br)); ha.addColorStop(1, rgba(col[0], col[1], col[2], 0));
  ctx.fillStyle = ha; ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.6, ry * 1.8, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/** L'encre qui frémit : des cercles qui naissent au centre et s'élargissent jusqu'au bord. `k` : la force (0 à 1). */
function inkRipples(ctx, x, y, rx, ry, k, t) {
  if (!(k > 0.01)) return;
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.clip();
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.9 + i / 3) % 1;
    ctx.strokeStyle = rgba(170, 215, 245, 0.55 * k * (1 - p)); ctx.lineWidth = Math.max(0.6, rx * 0.07);
    ctx.beginPath(); ctx.ellipse(x, y, rx * p, ry * p, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
module.exports = { linkStone, inkRipples, GLOW };
