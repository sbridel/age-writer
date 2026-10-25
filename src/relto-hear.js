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
/* ---- l'encrier de l'atelier, en scarabée ; le porte-plume ---- */
const SKINS = {
  plain: { lo: "#2a1d10", mid: "#6b4a22", hi: "#c39a4a", edge: "#e2c27a", enamel: null },
  castle: { lo: "#17161b", mid: "#3a3742", hi: "#8a8698", edge: "#d6b05a", enamel: null },
  glass: { lo: "#123a34", mid: "#2f6b5c", hi: "#7fc4ad", edge: "#d48a4a", enamel: ["#1d4f6e", "#2f8a7a", "#9a6fc0"] },
};
/**
 * L'encrier de l'atelier : un scarabée vu d'au-dessus, la tête vers nous. Ses élytres sont le couvercle ; `o.open` (0 à 1) les écarte et montre
 * l'encre au creux du corps. `o.hum` : l'encre frémit (chapitre 14) ; fermé, le dos tremble à peine. `o.skin` : plain (bronze), castle (fer noirci, or),
 * glass (émail irisé, cuivre). (x, y) : le centre ; `s` : la demi-largeur.
 */
function scarab(ctx, c, x, y, s, t, o = {}) {
  const K = SKINS[o.skin || "plain"], hum = o.hum || 0, SQ = 0.8, lw = (k) => Math.max(0.6, s * k);
  ctx.save(); ctx.translate(x, y);
  const sh = ctx.createRadialGradient(s * 0.1, s * 0.25, 1, s * 0.1, s * 0.25, s * 1.3); sh.addColorStop(0, rgba(0, 0, 0, 0.5)); sh.addColorStop(1, rgba(0, 0, 0, 0));
  ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(s * 0.1, s * 0.2, s * 1.25, s * 0.95, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.scale(1, SQ);
  /* les pattes, sous le corps : courtes, épaisses, en deux segments ; les antérieures dentelées, tournées vers l'avant */
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const leg = (pts, w) => { ctx.strokeStyle = c(K.lo); ctx.lineWidth = lw(w); ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s))); ctx.stroke(); ctx.strokeStyle = rgba(255, 230, 170, 0.18); ctx.lineWidth = lw(w * 0.3); ctx.stroke(); };
  for (const sd of [-1, 1]) {
    leg([[sd * 0.42, 0.38], [sd * 0.72, 0.5], [sd * 0.74, 0.8]], 0.1);
    ctx.strokeStyle = c(K.lo); ctx.lineWidth = lw(0.045); for (let k = 0; k < 3; k++) { const yy = s * (0.6 + k * 0.08), xx = sd * s * 0.74; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + sd * s * 0.08, yy - s * 0.02); ctx.stroke(); }
    leg([[sd * 0.48, 0.0], [sd * 0.8, -0.06], [sd * 0.86, -0.34]], 0.1);
    leg([[sd * 0.42, -0.3], [sd * 0.7, -0.5], [sd * 0.64, -0.82]], 0.1);
  }
  ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  /* la tête : un chaperon en éventail à six dents courtes, deux yeux sur les côtés */
  ctx.fillStyle = c(K.mid); ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.52);
  for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.1 + 0.8 * (i / 12)), rr = s * (i % 2 ? 0.36 : 0.31); ctx.lineTo(-Math.cos(a) * rr, s * 0.52 + Math.sin(a) * rr * 0.8); }
  ctx.lineTo(s * 0.3, s * 0.52); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(K.edge); ctx.lineWidth = lw(0.022); ctx.stroke();
  ctx.fillStyle = c(K.lo); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * s * 0.27, s * 0.6, s * 0.05, s * 0.07, 0, 0, TAU); ctx.fill(); }
  /* le corselet : large, coins arrondis, le reflet en haut à gauche comme le dos */
  const pg = ctx.createRadialGradient(-s * 0.2, s * 0.24, 1, 0, s * 0.38, s * 0.7);
  if (K.enamel) { pg.addColorStop(0, c(K.enamel[2])); pg.addColorStop(0.5, c(K.enamel[1])); pg.addColorStop(1, c(K.enamel[0])); } else { pg.addColorStop(0, c(K.hi)); pg.addColorStop(0.55, c(K.mid)); pg.addColorStop(1, c(K.lo)); }
  ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.14); ctx.bezierCurveTo(-s * 0.66, s * 0.42, -s * 0.5, s * 0.58, -s * 0.24, s * 0.58); ctx.lineTo(s * 0.24, s * 0.58); ctx.bezierCurveTo(s * 0.5, s * 0.58, s * 0.66, s * 0.42, s * 0.6, s * 0.14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgba(0, 0, 0, 0.22); for (let k = 0; k < 14; k++) { const u = (fnv("pr" + k) % 100) / 100 - 0.5, v = (fnv("pv" + k) % 100) / 100; ctx.beginPath(); ctx.arc(u * s * 0.9, s * (0.24 + v * 0.28), lw(0.012), 0, TAU); ctx.fill(); } /* le corselet grenu */
  /* un élytre (sd : -1 gauche, +1 droite), pivoté sur son épaule de `a` radians vers l'extérieur */
  const elytron = (sd, a) => {
    ctx.save(); ctx.translate(sd * s * 0.5, s * 0.12); ctx.rotate(sd * a); ctx.translate(-sd * s * 0.5, -s * 0.12);
    const eg = ctx.createRadialGradient(sd * s * 0.25 - s * 0.05, -s * 0.5, 1, sd * s * 0.2, -s * 0.3, s * 0.9);
    if (K.enamel) { eg.addColorStop(0, c(K.enamel[2])); eg.addColorStop(0.45, c(K.enamel[1])); eg.addColorStop(1, c(K.enamel[0])); } else { eg.addColorStop(0, c(K.hi)); eg.addColorStop(0.5, c(K.mid)); eg.addColorStop(1, c(K.lo)); }
    ctx.fillStyle = eg; ctx.beginPath(); ctx.moveTo(0, s * 0.16); ctx.lineTo(sd * s * 0.58, s * 0.16); ctx.bezierCurveTo(sd * s * 0.7, -s * 0.5, sd * s * 0.32, -s * 0.96, 0, -s * 0.98); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c(K.edge); ctx.lineWidth = lw(0.03); ctx.stroke();
    ctx.strokeStyle = rgba(0, 0, 0, 0.28); ctx.lineWidth = lw(0.016); for (const k of [0.17, 0.32, 0.45]) { ctx.beginPath(); ctx.moveTo(sd * s * k, s * 0.12); ctx.quadraticCurveTo(sd * s * (k + 0.06), -s * 0.5, sd * s * k * 0.55, -s * 0.88); ctx.stroke(); }
    if (sd < 0) { ctx.fillStyle = rgba(255, 245, 220, K.enamel ? 0.22 : 0.16); ctx.beginPath(); ctx.ellipse(-s * 0.28, -s * 0.55, s * 0.08, s * 0.3, 0.2, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  const op = Math.max(0, Math.min(1, o.open || 0)), ang = op * 0.62, shake = hum > 0 && op < 0.05 ? hum * 0.025 * Math.sin(t * 61) : 0; /* fermé, quand l'encre frémit dessous, le dos tremble à peine */
  if (op > 0) { /* le creux du corps, et le puits d'encre dessous */
    ctx.fillStyle = c(K.lo); ctx.beginPath(); ctx.moveTo(-s * 0.56, s * 0.16); ctx.bezierCurveTo(-s * 0.66, -s * 0.45, -s * 0.3, -s * 0.9, 0, -s * 0.92); ctx.bezierCurveTo(s * 0.3, -s * 0.9, s * 0.66, -s * 0.45, s * 0.56, s * 0.16); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  if (op > 0) { /* le puits : l'encre remplit le creux du corps, un mince rebord de laiton ; les cercles naissent d'un côté, là où tombe la goutte */
    ctx.save(); ctx.scale(1, SQ);
    const pot = () => { ctx.beginPath(); ctx.moveTo(-s * 0.46, s * 0.08); ctx.bezierCurveTo(-s * 0.54, -s * 0.4, -s * 0.26, -s * 0.78, 0, -s * 0.8); ctx.bezierCurveTo(s * 0.26, -s * 0.78, s * 0.54, -s * 0.4, s * 0.46, s * 0.08); ctx.closePath(); };
    pot(); ctx.fillStyle = c("#07090d"); ctx.fill(); ctx.strokeStyle = c(K.edge); ctx.lineWidth = lw(0.03); ctx.stroke();
    ctx.save(); pot(); ctx.clip(); ctx.fillStyle = rgba(150, 200, 235, 0.16); ctx.beginPath(); ctx.ellipse(-s * 0.2, -s * 0.55, s * 0.08, s * 0.22, 0.25, 0, TAU); ctx.fill();
    inkRipples(ctx, s * 0.1, -s * 0.22, s * 0.5, s * 0.5, hum, t); ctx.restore();
    ctx.restore();
  }
  ctx.save(); ctx.scale(1, SQ); elytron(-1, ang + shake); elytron(1, ang - shake); ctx.restore();
  ctx.restore();
}

/** Le porte-plume, couché : (x, y) la pointe, `len` la longueur, `a` l'angle (vers le manche), `o.w` l'épaisseur. Plume d'acier fendue, virole et bulbe dorés, manche noir laqué qui s'effile, une tige dorée enroulée. */
function dipPen(ctx, c, x, y, len, a, o = {}) {
  const gold = o.skin === "castle" ? ["#7a5a1e", "#d6b05a", "#f3dc96"] : o.skin === "glass" ? ["#7a3e1a", "#d48a4a", "#f2c08e"] : ["#7a5a1e", "#c9a24e", "#f0d68e"], w = Math.max(1.6, o.w || len * 0.03);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  /* l'ombre sur le bureau */
  ctx.fillStyle = rgba(0, 0, 0, 0.32); ctx.beginPath(); ctx.moveTo(len * 0.02, w * 0.9); ctx.lineTo(len * 1.0, w * 1.1); ctx.lineTo(len * 1.0, w * 2.0); ctx.lineTo(len * 0.02, w * 1.4); ctx.fill();
  /* la plume : un fer d'acier, fendu, percé */
  const nibC = ["#4a525e", "#a8b2be", "#e6ecf2"], ferC = gold;
  const nl = len * 0.14, ng = ctx.createLinearGradient(0, -w * 0.6, 0, w * 0.6); ng.addColorStop(0, c(nibC[2])); ng.addColorStop(0.5, c(nibC[1])); ng.addColorStop(1, c(nibC[0]));
  ctx.fillStyle = ng; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(nl * 0.35, -w * 0.08, nl * 0.6, -w * 0.42, nl, -w * 0.4); ctx.lineTo(nl, w * 0.4); ctx.bezierCurveTo(nl * 0.6, w * 0.42, nl * 0.35, w * 0.08, 0, 0); ctx.fill(); /* effilée : la pointe très fine */
  ctx.strokeStyle = rgba(40, 25, 5, 0.75); ctx.lineWidth = Math.max(0.5, w * 0.12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(nl * 0.55, 0); ctx.stroke();
  ctx.fillStyle = rgba(40, 25, 5, 0.85); ctx.beginPath(); ctx.arc(nl * 0.62, 0, Math.max(0.4, w * 0.11), 0, TAU); ctx.fill();
  ctx.fillStyle = c("#0a0c12"); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(nl * 0.2, -w * 0.07); ctx.lineTo(nl * 0.2, w * 0.07); ctx.fill(); /* la pointe, tachée d'encre */
  /* la virole : un fût doré cerclé (cuivre à la Verrière) */
  const fx = nl, fl = len * 0.13, fg = ctx.createLinearGradient(0, -w, 0, w); fg.addColorStop(0, c(ferC[2])); fg.addColorStop(0.45, c(ferC[1])); fg.addColorStop(1, c(ferC[0]));
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(fx, -w * 0.46); ctx.lineTo(fx + fl, -w * 0.78); ctx.lineTo(fx + fl, w * 0.78); ctx.lineTo(fx, w * 0.46); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(60, 40, 8, 0.6); ctx.lineWidth = Math.max(0.4, w * 0.1); for (const k of [0.15, 0.22, 0.85, 0.92]) { ctx.beginPath(); ctx.moveTo(fx + fl * k, -w * 0.75); ctx.lineTo(fx + fl * k, w * 0.75); ctx.stroke(); }
  /* un bulbe doré juste après la virole, puis le manche noir laqué, long, qui s'effile jusqu'à une pointe fine */
  const bx = fx + fl, bl = w * 2.2;
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(bx, -w * 0.78); ctx.bezierCurveTo(bx + bl * 0.3, -w * 1.15, bx + bl * 0.7, -w * 1.15, bx + bl, -w * 0.72); ctx.lineTo(bx + bl, w * 0.72); ctx.bezierCurveTo(bx + bl * 0.7, w * 1.15, bx + bl * 0.3, w * 1.15, bx, w * 0.78); ctx.closePath(); ctx.fill();
  const hx = bx + bl, hl = len - hx, hg = ctx.createLinearGradient(0, -w, 0, w); hg.addColorStop(0, c("#3a3d46")); hg.addColorStop(0.35, c("#16171c")); hg.addColorStop(1, c("#050507"));
  ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(hx, -w * 0.72); ctx.bezierCurveTo(hx + hl * 0.3, -w * 0.82, hx + hl * 0.7, -w * 0.6, len, -w * 0.26); ctx.quadraticCurveTo(len + w * 0.3, 0, len, w * 0.26); ctx.bezierCurveTo(hx + hl * 0.7, w * 0.6, hx + hl * 0.3, w * 0.82, hx, w * 0.72); ctx.closePath(); ctx.fill();
  { /* un motif doré qui court le long du manche : une tige qui s'enroule, des feuilles à chaque tour, de plus en plus serrés vers la pointe */
    const half = (u) => w * (0.72 - 0.46 * u * u), n = 7;
    ctx.strokeStyle = c(gold[1]); ctx.lineWidth = Math.max(0.5, w * 0.13); ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const u = i / 120, X = hx + hl * 0.03 + (hl * 0.92) * u, Y = Math.sin(u * n * TAU) * half(u) * 0.62; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke();
    ctx.fillStyle = c(gold[2]); for (let k = 0; k < n * 2; k++) { const u = (k + 0.5) / (n * 2), X = hx + hl * 0.03 + hl * 0.92 * u, Y = Math.sin(u * n * TAU) * half(u) * 0.62, sd = k % 2 ? 1 : -1; ctx.save(); ctx.translate(X, Y); ctx.rotate(sd * 0.6); ctx.beginPath(); ctx.ellipse(w * 0.22, 0, w * 0.24 * (1 - u * 0.5), w * 0.1, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = c(gold[1]); ctx.lineWidth = Math.max(0.4, w * 0.08); ctx.beginPath(); ctx.moveTo(len - w * 0.6, -w * 0.24); ctx.lineTo(len - w * 0.6, w * 0.24); ctx.stroke(); /* un filet au bout */
  }
  ctx.strokeStyle = rgba(255, 255, 255, 0.28); ctx.lineWidth = Math.max(0.4, w * 0.14); ctx.beginPath(); ctx.moveTo(hx + hl * 0.04, -w * 0.4); ctx.bezierCurveTo(hx + hl * 0.3, -w * 0.48, hx + hl * 0.65, -w * 0.28, len - w, -w * 0.05); ctx.stroke();
  ctx.restore();
}
/** Le scarabée vu de profil (la vue de la pièce) : (x, y) le point où il touche le bureau, sous son ventre ; `s` sa demi-longueur ; la tête à gauche. */
function scarabSide(ctx, c, x, y, s, t, o = {}) {
  const K = SKINS[o.skin || "plain"], hum = o.hum || 0, lw = (k) => Math.max(0.5, s * k), tr = hum > 0 ? hum * s * 0.02 * Math.sin(t * 61) : 0;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = rgba(0, 0, 0, 0.32); ctx.beginPath(); ctx.ellipse(0, s * 0.06, s * 1.15, s * 0.16, 0, 0, TAU); ctx.fill(); /* l'ombre */
  ctx.strokeStyle = c(K.lo); ctx.lineCap = "round"; ctx.lineWidth = lw(0.09); /* les pattes : trois visibles, pliées, qui touchent le bureau */
  for (const [ax, kx, fx] of [[-0.55, -0.8, -0.72], [-0.1, -0.2, -0.05], [0.4, 0.62, 0.78]]) { ctx.beginPath(); ctx.moveTo(ax * s, -s * 0.22); ctx.lineTo(kx * s, -s * 0.08); ctx.lineTo(fx * s, 0); ctx.stroke(); }
  ctx.lineCap = "butt";
  const dome = (x0, x1, h, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, -s * 0.2); ctx.bezierCurveTo(x0, -s * (0.2 + h * 0.9), x1, -s * (0.2 + h * 0.9), x1, -s * 0.2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(K.edge); ctx.lineWidth = lw(0.03); ctx.stroke(); };
  /* la tête, devant, avec le chaperon qui avance ; puis le corselet ; puis le dos bombé, qui tremble à peine quand l'encre frémit */
  dome(-s * 1.05, -s * 0.62, 0.38, c(K.mid));
  ctx.fillStyle = c(K.lo); ctx.beginPath(); ctx.ellipse(-s * 0.9, -s * 0.38, s * 0.04, s * 0.05, 0, 0, TAU); ctx.fill(); /* l'œil */
  dome(-s * 0.68, -s * 0.18, 0.62, c(K.hi));
  const g = ctx.createLinearGradient(0, -s * 1.1, 0, -s * 0.2); if (K.enamel) { g.addColorStop(0, c(K.enamel[2])); g.addColorStop(0.5, c(K.enamel[1])); g.addColorStop(1, c(K.enamel[0])); } else { g.addColorStop(0, c(K.hi)); g.addColorStop(0.5, c(K.mid)); g.addColorStop(1, c(K.lo)); }
  ctx.save(); ctx.translate(0, tr); dome(-s * 0.24, s * 1.0, 0.92, g);
  ctx.strokeStyle = rgba(0, 0, 0, 0.28); ctx.lineWidth = lw(0.016); for (const k of [0.1, 0.4, 0.7]) { ctx.beginPath(); ctx.moveTo(-s * 0.24 + s * 1.24 * k, -s * 0.2); ctx.quadraticCurveTo(-s * 0.2 + s * 1.2 * k, -s * 0.75, -s * 0.05 + s * 0.9 * k, -s * 1.0); ctx.stroke(); } /* les stries */
  ctx.fillStyle = rgba(255, 245, 220, K.enamel ? 0.22 : 0.16); ctx.beginPath(); ctx.ellipse(s * 0.15, -s * 0.85, s * 0.22, s * 0.08, -0.15, 0, TAU); ctx.fill(); ctx.restore();
  ctx.restore();
}
module.exports = { linkStone, inkRipples, scarab, scarabSide, dipPen, GLOW };
