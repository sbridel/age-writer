"use strict";
/**
 * Le dessin des fresques de la caverne, du code le long de la veine et de la dalle de la chambre des souvenirs (étape 4c, retouchée
 * le 25 oct. : claude/DESIGN-art-bahro.md §11 ; règles dans src/fresco.js).
 * Signes originaux, dans l'esprit des peintures rupestres : ocre sur pierre, traits tremblés au doigt, un clair pour les
 * détails ; rien des glyphes de Cyan. Chaque signe se dessine dans un carré de -10 à 10, au tracé légèrement tremblé
 * (déterministe : la même paroi à chaque descente).
 */
const { rgba, clamp, fnv } = require("./util");
const F = require("./fresco");
const TAU = Math.PI * 2, OCHRE = "#c8702e", PALE = "#e8dcc0";
/* la paroi : cinq bandes du joueur, la sixième aux Bahro ; le cartouche et la dalle à gauche, au bord de l'eau */
const BAND_Y = (b) => 236 - b * 35, WALL_X0 = 150, WALL_X1 = 556; /* à droite, derrière le bassin : la paroi où s'ouvre le passage (section 15) */

/** Un pinceau tremblé : la graine fait le tremblement, l'échelle `k` ramène les épaisseurs en pixels. */
function brush(ctx, seed, k) {
  let n = 0; const j = () => ((fnv(seed + "|" + n++) % 1000) / 1000 - 0.5) * 0.7;
  const path = (pts, close) => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i]; if (!i) { ctx.moveTo(x + j(), y + j()); continue; }
      const [px, py] = pts[i - 1], mx = (px + x) / 2 + j() * 1.4, my = (py + y) / 2 + j() * 1.4; ctx.quadraticCurveTo(mx, my, x + j(), y + j());
    }
    if (close) ctx.closePath();
  };
  return {
    line(pts, w = 2.6) { ctx.lineWidth = (w + j() * 0.6) / k; path(pts); ctx.stroke(); },
    shape(pts, w = 2.4) { ctx.lineWidth = w / k; path(pts, true); ctx.stroke(); },
    fill(pts) { path(pts, true); ctx.fill(); },
    ring(x, y, rx, ry = rx, w = 2.4, a0 = 0, a1 = TAU) { const n2 = Math.max(6, Math.round((a1 - a0) / 0.5)), pts = []; for (let i = 0; i <= n2; i++) { const a = a0 + ((a1 - a0) * i) / n2; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } this.line(pts, w); },
    disc(x, y, r) { ctx.beginPath(); ctx.ellipse(x + j() * 0.5, y + j() * 0.5, r, r * (0.9 + j() * 0.2), 0, 0, TAU); ctx.fill(); },
  };
}

/** Une silhouette debout (tête, corps, bras, jambes) ; `arms` : "down", "up", "out". Sert aux scènes et aux Bahro. */
function figure(b, x, y, s, arms = "down", head = 0) {
  b.disc(x + head * s, y - 7 * s, 1.9 * s);
  b.line([[x, y - 5 * s], [x, y + 2 * s]], 2.4);
  b.line([[x, y + 2 * s], [x - 2.4 * s, y + 8 * s]], 2.2); b.line([[x, y + 2 * s], [x + 2.4 * s, y + 8 * s]], 2.2);
  const ay = arms === "up" ? -7 : arms === "out" ? -3 : 2;
  b.line([[x - 3.6 * s, y + ay * s], [x, y - 3.5 * s], [x + 3.6 * s, y + ay * s]], 2.1);
}

/** Les signes : éléments d'Âge, le joueur, les merveilles en scènes, les Bahro. `pale` : la couleur des détails. */
const SIGNS = {
  water: (b) => { for (const y of [-5, 0, 5]) b.line([[-9, y], [-6, y - 2.5], [-3, y], [0, y - 2.5], [3, y], [6, y - 2.5], [9, y]]); },
  fire: (b, ctx) => { b.shape([[0, -10], [4, -3], [6, 3], [3, 8], [-3, 8], [-6, 3], [-3, -1], [-2, 2], [0, -10]]); ctx.fillStyle = PALE; b.fill([[0, -2], [2, 3], [0, 7], [-2, 3]]); },
  tree: (b) => { b.line([[0, 10], [0, -2]], 3); b.line([[0, 2], [-6, -5]]); b.line([[0, 0], [6, -6]]); b.line([[0, -2], [0, -9]]); b.line([[-6, -5], [-8, -8]], 1.8); b.line([[6, -6], [8, -9]], 1.8); },
  mountain: (b) => { b.line([[-10, 8], [-3, -7], [2, 2], [5, -3], [10, 8]]); b.line([[-5, -3], [-3, -7], [-1, -3]], 1.6); },
  sun: (b) => { b.ring(0, 0, 4.5); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.line([[Math.cos(a) * 7, Math.sin(a) * 7], [Math.cos(a) * 10, Math.sin(a) * 10]], 2); } },
  moon: (b) => { b.ring(0, 0, 8, 8, 2.6, Math.PI * 0.35, Math.PI * 1.65); b.ring(3.5, 0, 6.5, 6.5, 2, Math.PI * 0.55, Math.PI * 1.45); },
  rain: (b) => { b.ring(0, -3, 8, 4, 2.6, Math.PI, TAU); for (const x of [-6, -2, 2, 6]) b.line([[x, 1], [x - 2, 9]], 2); },
  beast: (b) => { b.line([[-8, -1], [6, -1]], 3); for (const x of [-7, -4, 3, 6]) b.line([[x, -1], [x - 0.5, 7]], 2); b.line([[6, -1], [9, -5]], 2.6); b.line([[8, -5], [6, -9]], 1.8); b.line([[9, -5], [11, -9]], 1.8); b.line([[-8, -1], [-10, 2]], 1.8); },
  bird: (b) => { b.line([[-10, -2], [-5, -6], [0, 0], [5, -6], [10, -2]], 2.6); b.line([[0, 0], [0, 4]], 2); },
  fish: (b, ctx) => { b.shape([[-8, 0], [-2, -5], [5, 0], [-2, 5]]); b.line([[5, 0], [10, -4], [10, 4], [5, 0]], 2); ctx.fillStyle = PALE; b.disc(-4.5, -1, 1); },
  stone: (b) => { b.shape([[-8, 5], [-7, -3], [-1, -7], [6, -5], [8, 2], [4, 7], [-4, 7]]); b.line([[-1, -7], [1, -1], [-2, 4]], 1.6); },
  grass: (b) => { b.line([[-9, 8], [9, 8]], 2); for (const [x, h, l] of [[-6, -6, -2], [-2, -9, -1], [2, -7, 1], [6, -5, 2]]) b.line([[x, 8], [x + l, h]], 2); },
  cloud: (b) => { b.ring(-4.5, 1, 4.5, 4.5, 2.4, Math.PI * 0.95, Math.PI * 1.75); b.ring(1, -1.5, 5.5, 5.5, 2.4, Math.PI * 1.1, Math.PI * 1.95); b.ring(6, 1.5, 3.8, 3.8, 2.4, Math.PI * 1.35, Math.PI * 2.2); b.line([[-9, 2.5], [9.5, 2.5]], 2.2); },
  wind: (b) => { b.line([[-10, -4], [2, -4], [6, -7], [3, -9], [0, -7]], 2.2); b.line([[-10, 1], [5, 1], [9, 4], [6, 7], [3, 5]], 2.2); b.line([[-8, 6], [-1, 6]], 1.8); },
  snow: (b) => { for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI + Math.PI / 2, c = Math.cos(a) * 9, s = Math.sin(a) * 9; b.line([[-c, -s], [c, s]], 2.2); } for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 2, x = Math.cos(a) * 6, y = Math.sin(a) * 6; b.line([[x + Math.cos(a + 1) * 2.5, y + Math.sin(a + 1) * 2.5], [x, y], [x + Math.cos(a - 1) * 2.5, y + Math.sin(a - 1) * 2.5]], 1.4); } },
  lava: (b, ctx) => { b.line([[-10, 9], [-3, -5], [3, -5], [10, 9]]); ctx.fillStyle = PALE; b.fill([[-2, -5], [2, -5], [1, 1], [3, 8], [-1, 8], [0, 1]]); b.line([[-1, -7], [-2, -10]], 1.6); b.line([[1, -7], [3, -10]], 1.6); },
  cave: (b, ctx) => { b.line([[-10, 9], [-8, -2], [-3, -8], [3, -8], [8, -2], [10, 9]], 3); b.line([[-5, 9], [-4, 0], [0, -3], [4, 0], [5, 9]], 1.8); ctx.fillStyle = PALE; b.disc(0, 4, 1.3); },
  island: (b) => { b.ring(0, 3, 7, 6, 2.6, Math.PI, TAU); b.line([[-10, 4], [-6, 2.5], [-3, 4], [3, 4], [6, 2.5], [10, 4]], 2); b.line([[-8, 8], [-4, 6.5], [0, 8], [4, 6.5], [8, 8]], 1.6); },
  /* le joueur */
  hand: (b) => { b.disc(0, 3, 4.6); for (let f = 0; f < 5; f++) { const a = -2.6 + f * 0.43, l = f === 0 ? 7.5 : 10; b.line([[Math.cos(a) * 4, 3 + Math.sin(a) * 4], [Math.cos(a) * l, 3 + Math.sin(a) * l]], 2.2); } },
  writer: (b) => { figure(b, -2, 0, 1, "down"); b.line([[1, -1], [6, -3], [9, -9]], 1.8); },
  book: (b) => { b.line([[-9, -4], [-1, -2], [-1, 7], [-9, 5], [-9, -4]]); b.line([[9, -4], [1, -2], [1, 7], [9, 5], [9, -4]]); },
  house: (b) => { b.shape([[-7, 8], [-7, -1], [0, -8], [7, -1], [7, 8]]); b.line([[-2, 8], [-2, 3], [2, 3], [2, 8]], 1.8); },
  link: (b) => { b.ring(-4, 0, 5); b.ring(4, 0, 5); },
  /* les merveilles, en scènes */
  unfinished_horizon: (b) => { b.line([[-10, 5], [1.5, 5]]); b.ring(-5, 5, 5.5, 5.5, 2.4, Math.PI, Math.PI * 1.5); for (const a of [1.62, 1.76, 1.9]) b.disc(-5 + Math.cos(Math.PI * a) * 5.5, 5 + Math.sin(Math.PI * a) * 5.5, 0.7); b.disc(6.5, -6, 1.8); b.line([[6.5, -4], [6.8, 3]], 2.3); b.line([[6.8, 3], [4.6, 9.5]], 2); b.line([[6.8, 3], [9, 9.5]], 2); b.line([[6.5, -2.5], [4, 1], [2, 4.6]], 2); b.line([[6.6, -2.5], [9.4, 0.5]], 1.8); },
  orphan_colour: (b, ctx) => { b.disc(-5, -5, 3.6); b.line([[-10, 8], [10, 8]], 2); figure(b, 4, 0, 0.9, "down"); ctx.fillStyle = PALE; b.disc(-5, -5, 1); },
  breathing_mirrors: (b) => { b.ring(-4, 3, 5, 2.4); b.ring(5, 4, 4, 2); b.ring(-4, 3, 7.5, 4, 1.4, Math.PI * 1.1, Math.PI * 1.9); b.ring(5, 4, 6, 3.4, 1.4, Math.PI * 1.1, Math.PI * 1.9); },
  visiting_weight: (b) => { b.shape([[-5, -9], [5, -9], [6, -4], [-6, -4]]); b.line([[0, -2], [0, 0]], 1.6); figure(b, 0, 3.5, 0.75, "up"); b.line([[-10, 9.5], [10, 9.5]], 1.8); },
  wind_learned: (b) => { b.line([[-10, 6], [10, 6]], 2); for (const y of [7.8, 9.4]) b.line([[-8, y], [8, y]], 1.2); b.line([[-10, -5], [0, -5], [4, -8], [1, -10]], 2); b.line([[-6, -1], [5, -1], [8, 1]], 2); figure(b, 7, -1, 0.55, "out"); },
  reading_rain: (b) => { for (const x of [-6, -1, 4]) b.line([[x, -10], [x - 1.5, -4]], 1.8); b.shape([[-9, 9], [-8, 0], [8, 0], [9, 9]]); for (const [x, y] of [[-5, 3], [-1, 5], [3, 3], [5, 6]]) b.line([[x, y], [x + 1.5, y]], 1.4); },
  ceiling_sea: (b) => { b.line([[-10, -8], [-6, -6], [-2, -8], [2, -6], [6, -8], [10, -6]]); b.line([[-10, -10], [10, -10]], 1.6); for (const x of [-4, 3]) b.line([[x, -4], [x, -1.5]], 1.6); figure(b, 0, 3, 0.65, "up"); },
  fit_through_moths: (b) => { b.line([[-1.5, -10], [-1.5, 10]], 3); b.line([[1.5, -10], [1.5, 10]], 3); for (const [x, y] of [[-7, -4], [0, 1], [7, 5]]) { b.line([[x - 3, y - 2], [x, y], [x + 3, y - 2]], 1.8); b.line([[x - 2.5, y + 2], [x, y], [x + 2.5, y + 2]], 1.4); } },
  mosaic: (b, ctx) => { b.shape([[0, 9], [-5, 3], [-6, -4], [-2, -9], [0, -6], [2, -9], [6, -4], [5, 3]]); ctx.strokeStyle = PALE; for (const [x0, x1] of [[-3, -1], [0, 0], [3, 1]]) b.line([[x0, -5], [x1 * 0.5, 0], [x1, 6]], 1.4); ctx.strokeStyle = OCHRE; },
  ringed_ground: (b) => { for (const r of [2, 4.5, 7, 9.5]) b.ring(0.4 * r, 0, r, r * 0.8, r > 8 ? 2.4 : 1.8); },
  drinking_roots: (b, ctx) => { b.line([[0, -10], [0, 1]], 3); b.line([[0, -6], [-5, -9]], 2); b.line([[0, -5], [5, -9]], 2); for (const x of [-5, 0, 5]) b.line([[0, 1], [x, 6]], 1.8); b.line([[-10, 7], [-5, 6], [0, 8], [5, 6], [10, 7]], 2); ctx.fillStyle = PALE; for (const [x, y] of [[-3, 3.5], [3, 3.5], [0, 5]]) b.disc(x, y, 0.9); },
  living_mist: (b, ctx) => { b.line([[-9, -1], [-6, -6], [-1, -8], [4, -6], [8, -3], [9, 1]], 2.4); b.line([[-9, -1], [-7, 4], [-4, 1], [-2, 6], [1, 2], [4, 7], [6, 2], [9, 1]], 1.8); ctx.fillStyle = PALE; b.disc(-2, -3, 1); b.disc(3, -3, 1); },
  day_aurora: (b) => { b.ring(0, 7, 4, 4, 2.4, Math.PI, TAU); for (const [y, a] of [[-8, 2], [-4, 1.5]]) b.line([[-10, y], [-6, y - a], [-2, y + a], [2, y - a], [6, y + a], [10, y]], 1.8); b.line([[-10, 7], [10, 7]], 1.6); },
  blooming_ice: (b, ctx) => { SIGNS.snow(b, ctx); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 2; ctx.fillStyle = PALE; b.disc(Math.cos(a) * 9.5, Math.sin(a) * 9.5, 1.2); } },
  rust_held_bridge: (b) => { b.ring(0, 6, 9, 9, 2.6, Math.PI, TAU); b.line([[-10, -3], [10, -3]], 2); for (let x = -7; x <= 7; x += 3.5) { b.line([[x - 1.5, -3], [x + 1.5, 3]], 1.2); b.line([[x + 1.5, -3], [x - 1.5, 3]], 1.2); } },
  many_one: (b) => { b.line([[-1, 0], [1, -2], [3, 0], [2, 4], [-3, 5], [-7, 1], [-6, -5], [0, -9], [7, -7], [9, 0], [6, 7]], 2.4); for (const [x, y] of [[-1, 0], [-7, 1], [7, -7], [6, 7]]) { b.line([[x - 1, y + 1], [x - 1, y + 3]], 1.2); b.line([[x + 1, y + 1], [x + 1, y + 3]], 1.2); } },
  early_echo: (b, ctx) => { const a0 = ctx.globalAlpha; figure(b, -5, 0, 1, "out"); ctx.globalAlpha = a0 * 0.55; figure(b, 1, 0, 1, "out"); ctx.globalAlpha = a0 * 0.25; figure(b, 7, 0, 1, "out"); ctx.globalAlpha = a0; },
  /* les Bahro, tout en haut */
  chained: (b, ctx) => { b.disc(0, -7, 2.2); b.line([[0, -5], [-1, 1], [0, 5]], 2.6); b.line([[0, 5], [-4, 8], [-1, 10]], 2.2); b.line([[0, 5], [4, 9]], 2.2); b.line([[-0.5, -3], [-5, 1], [-3, 5]], 2); b.line([[0, -3], [5, 0], [3, 5]], 2); ctx.strokeStyle = PALE; for (let i = 0; i < 4; i++) b.ring(-2 + i * 1.6, 5.8, 0.9, 0.7, 1.1); ctx.strokeStyle = OCHRE; },
  serpent: (b, ctx) => { b.line([[-10, 6], [-6, 2], [-2, 6], [2, 2], [5, -2], [3, -6], [6, -8]], 2.8); ctx.fillStyle = OCHRE; b.disc(7, -8.5, 2); b.line([[9, -9], [10.5, -8], [9, -7.5]], 1); },
  stonesign: (b, ctx) => { b.ring(0, 0, 8); b.line([[0, -10], [0, 10]], 2.4); b.line([[-7, 7], [7, -7]], 2.2); ctx.fillStyle = PALE; b.disc(0, 0, 1.6); },
  eye: (b, ctx) => { b.line([[-10, 0], [-4, -5], [4, -5], [10, 0], [4, 5], [-4, 5], [-10, 0]], 2.4); ctx.fillStyle = OCHRE; b.disc(0, 0, 2.8); ctx.fillStyle = PALE; b.disc(-0.8, -0.8, 0.8); },
  cry: (b) => { b.ring(2.2, -7.5, 2.4); b.line([[0.5, -5.5], [0, 2]], 2.4); b.ring(3.5, -8.4, 0.9, 0.9, 1.2); b.line([[0, -3], [-6, -10]], 2.1); b.line([[0, -3], [5, -10]], 2.1); b.line([[0, 2], [-3, 9]], 2.1); b.line([[0, 2], [3, 9]], 2.1); },
  hands: (b, ctx) => { ctx.save(); ctx.translate(-5, 1.5); ctx.rotate(-0.3); ctx.scale(0.78, 0.78); SIGNS.hand(b, ctx); ctx.restore(); ctx.save(); ctx.translate(5, -1.5); ctx.rotate(0.25); ctx.scale(0.78, 0.78); SIGNS.hand(b, ctx); ctx.restore(); },
};

/** Un signe à (x, y), demi-largeur `s` px, opacité `a`. */
function sign(ctx, id, x, y, s, a, seed, col) {
  const fn = SIGNS[id]; if (!fn || a <= 0.01) return;
  const k = s / 10; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.globalAlpha = a; ctx.strokeStyle = col || OCHRE; ctx.fillStyle = col || OCHRE; ctx.lineCap = "round"; ctx.lineJoin = "round";
  fn(brush(ctx, seed || id, k), ctx); ctx.restore();
}
/** Le signe d'un Âge : l'élément principal au centre, les autres petits autour. */
function ageSign(ctx, parts, x, y, s, a, seed) {
  const P = [[-0.95, -0.7], [0.95, -0.7], [0, 1.05]];
  sign(ctx, parts[0], x, y, s * 0.78, a, seed + "|0");
  parts.slice(1).forEach((p, i) => sign(ctx, p, x + P[i][0] * s, y + P[i][1] * s, s * 0.36, a * 0.95, seed + "|" + (i + 1)));
}

/** Où se peint le signe `i` de la bande `b` (jitter tiré de la graine du Relto) et à quelle échelle. */
function slot(b, i, n, key) {
  const q = (k) => (fnv(key + "|slot|" + b + "|" + i + "|" + k) % 1000) / 1000, span = WALL_X1 - WALL_X0, step = span / n;
  return { x: WALL_X0 + step * (i + 0.5) + (q("x") - 0.5) * step * 0.3, y: BAND_Y(b) + (q("y") - 0.5) * 8, s: (b === F.BANDS - 1 ? 11.5 : 12.5) + q("s") * 2.5 };
}

/**
 * Les fresques. `vis(b, y)` : 0..1, ce que la lumière laisse voir à la bande b, à la hauteur y. `ages`, `wonders` : de la
 * scène ; `key` : la graine du Relto (place des signes).
 */
function drawFrescoes(ctx, items, vis, key) {
  const bands = F.bandsOf(items);
  bands.forEach((band, b) => band.forEach((it, i) => {
    const p = slot(b, i, F.PER_BAND, key), a = vis(b, p.y) * 0.85; if (a <= 0.01) return;
    if (it.kind === "wonder") sign(ctx, it.id, p.x, p.y, p.s, a, key + it.id); else ageSign(ctx, it.parts, p.x, p.y, p.s, a, key + it.id);
  }));
  F.BAHRO_ROW.forEach((id, i) => { const p = slot(F.BANDS - 1, i, F.BAHRO_ROW.length, key), a = vis(F.BANDS - 1, p.y) * 0.85; if (a > 0.01) sign(ctx, id, p.x, p.y, p.s, a, key + "bahro" + i); });
}

/**
 * Le code, à gauche du bassin : peint le long d'une veine claire de la roche (du quartz) qui monte de l'eau en ondulant.
 * Le départ est une main peinte au pied de la veine, la leur : on lit à partir de la main, en remontant la veine. Chaque
 * éclair monte plus haut (une bande par révélation), donc chaque éclair montre deux glyphes de plus ; les places pas encore
 * révélées sont dans le noir. Pas de cadre, pas de flèche, pas de serpent (l'auteur, 25 oct. : il leur fait peur).
 * `vis(y)` : 0..1, ce que la lumière laisse voir à la hauteur y.
 */
const VEIN = [[84, 280], [70, 266], [58, 250], [68, 234], [56, 216], [64, 200], [54, 186], [58, 176]]; /* tout sur la paroi : son pied (y 284 et plus) est le sol, rien n'y est peint */
const VEIN_HAND = { x: 100, y: 274 };
/** Un point de la veine, à la fraction u (0 au bord de l'eau, 1 en haut). */
function veinAt(u) {
  const n = VEIN.length - 1, f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i, [x0, y0] = VEIN[i], [x1, y1] = VEIN[i + 1];
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
}
/** Où se peint le glyphe `i` du code : en remontant la veine, une fois d'un côté, une fois de l'autre. */
function veinSlot(i) {
  const p = veinAt([0.1, 0.26, 0.42, 0.56, 0.74, 0.88][i]), side = i % 2 ? 1 : -1;
  return { x: p.x + 15 * side, y: p.y };
}
function drawVeinCode(ctx, code, found, vis, key) {
  /* la veine : un filon de roche claire, irrégulier, qui accroche la lumière, segment par segment selon ce qui est éclairé */
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  const mid = (i) => [(VEIN[i][0] + VEIN[i + 1][0]) / 2, (VEIN[i][1] + VEIN[i + 1][1]) / 2], last = VEIN.length - 1;
  for (let i = 0; i <= last; i++) { /* une courbe lisse par les milieux ; chaque morceau selon ce que la lumière en a atteint */
    const [px, py] = VEIN[i], from = i === 0 ? VEIN[0] : mid(i - 1), to = i === last ? VEIN[last] : mid(i), a = vis(py); if (a <= 0.01) continue;
    for (const [w, al, c] of [[7, 0.14, [196, 200, 188]], [3.2, 0.2, [214, 218, 206]], [1.1, 0.38, [236, 238, 228]]]) { ctx.strokeStyle = rgba(c[0], c[1], c[2], al * a); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.quadraticCurveTo(px, py, to[0], to[1]); ctx.stroke(); }
    for (let k = 0; k < 2; k++) { const q = (fnv(key + "vs" + i + "|" + k) % 1000) / 1000; ctx.fillStyle = rgba(244, 248, 238, 0.55 * a); ctx.fillRect(from[0] + (to[0] - from[0]) * q - 0.6 + ((fnv(key + "vx" + i + k) % 5) - 2), from[1] + (to[1] - from[1]) * q - 0.6, 1.3, 1.3); } /* des grains qui brillent */
  }
  ctx.restore();
  const ha = vis(VEIN_HAND.y); /* la main, au pied de la veine : on commence ici */
  if (ha > 0.01) { ctx.save(); ctx.translate(VEIN_HAND.x, VEIN_HAND.y); ctx.rotate(0.35); sign(ctx, "hand", 0, 0, 8, ha * 0.9, key + "veinhand"); ctx.restore(); }
  code.forEach((g, i) => { if (i >= found) return; const p = veinSlot(i), a = vis(p.y); if (a > 0.01) sign(ctx, F.ELEMENTS[g], p.x, p.y, 8.5, a * 0.9, key + "c" + i); });
}

/**
 * La dalle, dans la chambre des souvenirs (déménagée de la caverne le 25 oct. : on lit le code en bas, on l'entre ici).
 * Une dalle couchée à fleur d'eau, vue un peu d'en haut ; six pierres taillées encastrées en anneau, chacune gravée en
 * creux ; au centre une vasque d'eau immobile, noire, qui reflète les étoiles (le Rêve est le miroir de Serenia). Pas
 * d'yeux, pas de visage (l'auteur, 25 oct.). Les six justes : l'eau de la vasque s'éclaire de bleu ; on y regarde pour
 * rêver. `st` : { open, stones, turnAt: { i, at }, dreamTip }.
 */
const SLAB = { x: 320, y: 290, rx: 140, ry: 50, ring: 96, ringY: 0.4, stone: 17, squash: 0.52, pool: 36 };
/** Vue un peu d'en haut : x, z (z < 0 au fond) sur le plan de la dalle ; le fond se resserre un peu (la perspective). */
const proj = (px, pz) => [px * (1 + 0.1 * (pz / 125)), pz * SLAB.ringY];
/* une dalle carrée, posée de biais dans l'eau, un coin cassé au fond à droite, des bords à grands éclats */
const DALLE = [[-138, -118], [-60, -126], [20, -122], [84, -128], [112, -104], [134, -84], [138, -10], [142, 70], [136, 122], [40, 128], [-50, 124], [-134, 120], [-140, 40], [-136, -40]].map(([px, pz]) => proj(px + ((fnv("dl" + px) % 7) - 3), pz));
function stonePath(ctx, i, s) { /* une pierre taillée, à facettes, un peu de travers */
  ctx.beginPath(); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + (fnv("st" + i) % 100) / 100, rr = s * (0.86 + ((fnv("st" + i + "|" + k) % 100) / 100) * 0.22); k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
}
function carved(ctx, id, x, y, s, a, seed) { /* un glyphe gravé en creux : le bord bas-droit prend la lumière, le fond est sombre */
  sign(ctx, id, x + 0.7, y + 0.8, s, a * 0.55, seed, "rgb(176,184,200)");
  sign(ctx, id, x, y, s, a * 0.95, seed, "#0b0c10");
}
const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); };
function drawSlab(r, ctx, st, now, t, tr) {
  const { x, y } = SLAB, open = !!st.open;
  ctx.save(); ctx.translate(x, y);
  /* l'épaisseur de la dalle, qui sort à peine de l'eau, puis son dessus */
  ctx.save(); ctx.translate(0, 9); poly(ctx, DALLE); ctx.fillStyle = "#0e1016"; ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(0, 4); ctx.scale(1.04, 1.12); poly(ctx, DALLE); ctx.fillStyle = rgba(140, 170, 230, 0.08); ctx.fill(); ctx.restore(); /* l'eau qui lèche le bord */
  const g = ctx.createLinearGradient(0, -SLAB.ry, 0, SLAB.ry); g.addColorStop(0, "#3c414e"); g.addColorStop(1, "#22252d");
  poly(ctx, DALLE); ctx.fillStyle = g; ctx.fill();
  ctx.save(); poly(ctx, DALLE); ctx.clip();
  for (let i = 0; i < 120; i++) { const k = fnv("grain" + i); ctx.fillStyle = k % 3 ? rgba(150, 160, 180, 0.10) : rgba(0, 0, 0, 0.22); ctx.fillRect((k % 280) - 140, ((k >>> 8) % 110) - 55, 1.3, 1); }
  for (let i = 0; i < 4; i++) { const k = fnv("dcrack" + i), a0 = (k % 628) / 100; ctx.strokeStyle = rgba(8, 9, 12, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.cos(a0) * SLAB.rx, Math.sin(a0) * SLAB.ry); ctx.lineTo(Math.cos(a0) * SLAB.rx * 0.82 + ((k >>> 4) % 9) - 4, Math.sin(a0) * SLAB.ry * 0.8); ctx.stroke(); } /* des éclats au bord */
  ctx.restore();
  ctx.strokeStyle = rgba(190, 205, 235, 0.24); ctx.lineWidth = 1; ctx.beginPath(); DALLE.slice(0, 6).forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); /* l'arête du fond prend la lueur des orbes */
  /* la vasque : une eau noire, immobile, qui reflète les étoiles ; ouverte, elle s'éclaire de bleu, et des poussières en montent */
  const pr = SLAB.pool, pry = pr * SLAB.ringY;
  ctx.fillStyle = "#07080c"; ctx.beginPath(); ctx.ellipse(0, 0, pr + 5, pry + 3, 0, 0, TAU); ctx.fill(); /* la margelle creusée */
  const wg = ctx.createRadialGradient(-6, -3, 1, 0, 0, pr); wg.addColorStop(0, open ? rgba(170, 210, 255, 0.85) : "#1a2236"); wg.addColorStop(1, open ? rgba(60, 100, 190, 0.6) : "#0b0f1a"); /* fermée : l'eau sombre qui prend le bleu de la chambre */
  ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(0, 0, pr, pry, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, pr, pry, 0, 0, TAU); ctx.clip();
  for (let i = 0; i < 14; i++) { const k = fnv("pstar" + i), a = 0.25 + 0.5 * Math.sin(t * 0.7 + i) ** 2; ctx.fillStyle = rgba(210, 225, 255, open ? a * 0.4 : a * 0.6); ctx.fillRect((k % (pr * 2)) - pr, ((k >>> 9) % Math.round(pry * 2)) - pry, 1, 1); } /* les étoiles de la chambre, dans l'eau */
  ctx.strokeStyle = rgba(200, 220, 255, 0.12 + (open ? 0.1 : 0)); ctx.lineWidth = 0.8; const ph = (t * 0.25) % 1; ctx.beginPath(); ctx.ellipse(0, 0, pr * ph, pry * ph, 0, 0, TAU); ctx.stroke(); /* un cercle lent sur l'eau */
  ctx.restore();
  if (open) { const lg = ctx.createLinearGradient(0, 0, 0, -70); lg.addColorStop(0, rgba(140, 190, 255, 0.28 + 0.06 * Math.sin(t * 1.3))); lg.addColorStop(1, rgba(140, 190, 255, 0)); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-pr * 0.9, 0); ctx.lineTo(pr * 0.9, 0); ctx.lineTo(pr * 0.5, -70); ctx.lineTo(-pr * 0.5, -70); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 9; i++) { const q = (t * 0.12 + i / 9) % 1, k = fnv("pdust" + i); ctx.fillStyle = rgba(210, 230, 255, 0.7 * (1 - q)); ctx.fillRect(((k % 60) - 30) * (1 - q * 0.4), -q * 80, 1.4, 1.4); } } /* des poussières qui montent, comme à la fissure */
  /* l'entaille, devant la pierre du fond : on commence ici, et on suit le soleil */
  { const ny = proj(0, -SLAB.ring)[1] - SLAB.stone * SLAB.squash - 5; ctx.strokeStyle = "#08090c"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-4, ny - 2); ctx.lineTo(0, ny + 1); ctx.lineTo(4, ny - 2); ctx.stroke(); ctx.strokeStyle = rgba(176, 184, 200, 0.5); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-3.4, ny - 1); ctx.lineTo(0.5, ny + 1.8); ctx.stroke(); }
  ctx.restore();
  /* la dalle entière d'abord : ses pierres et sa vasque, déclarées après, passent devant elle au clic (la dernière zone déclarée l'emporte) */
  r.hot.push({ x: x - SLAB.rx, y: y - SLAB.ry, w: SLAB.rx * 2, h: SLAB.ry * 2, tip: open ? tr("cave.slab.open") : tr("cave.slab") });
  /* les six pierres : taillées, encastrées dans la dalle (un joint sombre autour), gravées ; vues un peu d'en haut */
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU, [ox, oy] = proj(Math.cos(a) * SLAB.ring, Math.sin(a) * SLAB.ring), sx = x + ox, sy = y + oy, turning = st.turnAt && st.turnAt.i === i ? clamp((now - st.turnAt.at) / 300) : 1, hov = r.hover && r.hover.caveSlab === i + 1, rot = (1 - turning) * -1.05;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1, SLAB.squash);
    ctx.save(); ctx.scale(1.12, 1.12); stonePath(ctx, i, SLAB.stone); ctx.fillStyle = "#08090c"; ctx.fill(); ctx.restore(); /* le logement, creusé dans la dalle */
    ctx.rotate(rot);
    const sg = ctx.createLinearGradient(-SLAB.stone, -SLAB.stone, SLAB.stone, SLAB.stone); sg.addColorStop(0, hov ? "#6a6f7c" : "#555a66"); sg.addColorStop(1, hov ? "#2c2f37" : "#22252c");
    stonePath(ctx, i, SLAB.stone); ctx.fillStyle = sg; ctx.fill(); ctx.strokeStyle = rgba(190, 200, 220, 0.25); ctx.lineWidth = 1.2; ctx.stroke();
    if (st.stones) carved(ctx, F.ELEMENTS[st.stones[i]], 0, 0, 10, 1, "slab" + i);
    ctx.restore();
    if (!open) r.hot.push({ x: sx - SLAB.stone - 2, y: sy - SLAB.stone * SLAB.squash - 3, w: SLAB.stone * 2 + 4, h: SLAB.stone * SLAB.squash * 2 + 6, tip: tr("cave.slab.stone"), caveSlab: i + 1 });
  }
  if (open && st.dreamTip) r.hot.push({ x: x - SLAB.pool, y: y - SLAB.pool * 0.5, w: SLAB.pool * 2, h: SLAB.pool, tip: st.dreamTip, dreamGo: true }); /* la vasque : le rêve (étape 4d) */
}

/** Les mains mouillées (src/relto-cave.js, traces) : tout près du signe le plus récent, comme s'ils venaient de le peindre. */
function handsNear(items, key) {
  if (!items || !items.length) return null;
  const p = slot(0, 0, F.PER_BAND, key);
  return [[p.x - p.s - 9, p.y + 4, -0.35, 1.05], [p.x + p.s + 8, p.y - 3, 0.3, 1]];
}

module.exports = { handsNear, slot, SIGNS, sign, ageSign, drawFrescoes, drawVeinCode, veinSlot, drawSlab, BAND_Y, VEIN, SLAB, WALL_X0, WALL_X1 };
