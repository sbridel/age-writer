"use strict";
/**
 * Le dessin des fresques de la caverne, du cartouche et de la dalle aux yeux (étape 4c ; règles dans src/fresco.js).
 * Signes originaux, dans l'esprit des peintures rupestres : ocre sur pierre, traits tremblés au doigt, un clair pour les
 * détails ; rien des glyphes de Cyan. Chaque signe se dessine dans un carré de -10 à 10, au tracé légèrement tremblé
 * (déterministe : la même paroi à chaque descente).
 */
const { rgba, clamp, fnv } = require("./util");
const F = require("./fresco");
const TAU = Math.PI * 2, OCHRE = "#c8702e", PALE = "#e8dcc0";
/* la paroi : cinq bandes du joueur, la sixième aux Bahro ; le cartouche et la dalle à gauche, au bord de l'eau */
const BAND_Y = (b) => 236 - b * 35, WALL_X0 = 150, WALL_X1 = 622;
const CART = { x: 26, y: 208, w: 108, h: 34 }, SLAB = { x: 80, y: 300, r: 22, ring: 38, stone: 10 };

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
  unfinished_horizon: (b) => { b.line([[-10, 5], [2, 5]]); b.ring(-2, 5, 7, 7, 2.6, Math.PI, Math.PI * 1.62); b.line([[-7, -5], [-9, -8]], 1.8); b.line([[-2, -4], [-2, -8]], 1.8); for (const [x, w] of [[5, 1.6], [7.5, 1.2], [9.6, 0.8]]) b.line([[x, 5], [x + 1, 5]], w * 1.6); },
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
function sign(ctx, id, x, y, s, a, seed) {
  const fn = SIGNS[id]; if (!fn || a <= 0.01) return;
  const k = s / 10; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.globalAlpha = a; ctx.strokeStyle = OCHRE; ctx.fillStyle = OCHRE; ctx.lineCap = "round"; ctx.lineJoin = "round";
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

/** Le cartouche : six cases au-dessus de la dalle ; les glyphes trouvés y sont tous, les autres restent de la pierre nue. */
function drawCartouche(ctx, code, found, a, key) {
  if (a <= 0.01) return;
  const { x, y, w, h } = CART, b = brush(ctx, key + "cart", 1);
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = OCHRE; ctx.lineCap = "round";
  b.line([[x + 4, y], [x + w - 4, y], [x + w, y + 4], [x + w, y + h - 4], [x + w - 4, y + h], [x + 4, y + h], [x, y + h - 4], [x, y + 4], [x + 4, y]], 2.2);
  for (let i = 1; i < 6; i++) { ctx.fillStyle = OCHRE; ctx.fillRect(x + (w * i) / 6 - 0.6, y + h / 2 - 1, 1.2, 2); }
  ctx.restore();
  code.forEach((g, i) => { const cx = x + (w * (i + 0.5)) / 6, cy = y + h / 2; if (i < found) sign(ctx, F.ELEMENTS[g], cx, cy, 7.2, a, key + "c" + i); });
}

/**
 * La dalle aux yeux. `st` : { lit (0..1, la lueur), seen, open, stones (glyphes montrés), turnAt: { i, at } }. Les yeux
 * restent faiblement allumés une fois vus ; ils éclairent assez les pierres pour qu'on les tourne dans le noir.
 */
function drawSlab(r, ctx, st, now, t, tr) {
  const { x, y } = SLAB, seenA = st.seen ? 1 : 0, A = Math.max(st.lit, st.open ? 0.75 : seenA * 0.38); if (A <= 0.01) return;
  ctx.save(); ctx.globalAlpha = A;
  const g = ctx.createRadialGradient(x - 6, y - 8, 2, x, y, SLAB.r + 4); g.addColorStop(0, "#3a3a34"); g.addColorStop(1, "#16170f"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, SLAB.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(150, 130, 100, 0.5); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, SLAB.r, 0, TAU); ctx.stroke();
  if (st.open) { /* ouverte : la pierre s'est fendue, il en vient un souffle bleu */
    const gap = 5; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(x - gap, y - SLAB.r + 2); ctx.lineTo(x + gap, y - SLAB.r + 2); ctx.lineTo(x + gap * 0.6, y + SLAB.r - 2); ctx.lineTo(x - gap * 0.6, y + SLAB.r - 2); ctx.closePath(); ctx.fill();
    const bl = ctx.createLinearGradient(0, y - SLAB.r, 0, y + SLAB.r); bl.addColorStop(0, rgba(110, 160, 255, 0.0)); bl.addColorStop(0.5, rgba(110, 160, 255, 0.35 + 0.1 * Math.sin(t * 1.4))); bl.addColorStop(1, rgba(110, 160, 255, 0)); ctx.fillStyle = bl; ctx.fillRect(x - gap, y - SLAB.r, gap * 2, SLAB.r * 2);
  }
  ctx.restore();
  /* les yeux : faibles une fois vus, vifs quand la dalle est ouverte */
  const eye = clamp(st.open ? 1 : Math.max(st.lit * 0.8, seenA * 0.35)) * (0.85 + 0.15 * Math.sin(t * 0.9));
  for (const dx of [-8, 8]) {
    const ex = x + dx, ey = y - 6, gg = ctx.createRadialGradient(ex, ey, 0.5, ex, ey, 9); gg.addColorStop(0, rgba(200, 235, 255, 0.55 * eye)); gg.addColorStop(1, rgba(120, 180, 255, 0)); ctx.fillStyle = gg; ctx.fillRect(ex - 9, ey - 9, 18, 18);
    ctx.save(); ctx.globalAlpha = Math.max(A, eye); ctx.strokeStyle = rgba(220, 200, 160, 0.8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex - 6, ey); ctx.quadraticCurveTo(ex, ey - 4.5, ex + 6, ey); ctx.quadraticCurveTo(ex, ey + 4.5, ex - 6, ey); ctx.stroke();
    ctx.fillStyle = rgba(210, 240, 255, 0.25 + 0.75 * eye); ctx.beginPath(); ctx.arc(ex, ey, 1.9, 0, TAU); ctx.fill(); ctx.restore();
  }
  /* les six pierres, chacune avec son glyphe ; celle qu'on vient de tourner tourne encore un peu */
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU, sx = x + Math.cos(a) * SLAB.ring, sy = y + Math.sin(a) * SLAB.ring * 0.92, turning = st.turnAt && st.turnAt.i === i ? clamp((now - st.turnAt.at) / 350) : 1;
    const hov = r.hover && r.hover.caveSlab === i + 1;
    ctx.save(); ctx.globalAlpha = A; ctx.translate(sx, sy); ctx.rotate((1 - turning) * -1.05);
    const sg = ctx.createRadialGradient(-3, -3, 1, 0, 0, SLAB.stone); sg.addColorStop(0, hov ? "#5a5648" : "#45423a"); sg.addColorStop(1, "#1d1c17"); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, SLAB.stone, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(150, 130, 100, 0.45); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    if (st.stones) sign(ctx, F.ELEMENTS[st.stones[i]], sx, sy, 6.4, A * (st.open ? 1 : 0.95), "slab" + i);
    if (st.seen && !st.open) r.hot.push({ x: sx - SLAB.stone - 2, y: sy - SLAB.stone - 2, w: SLAB.stone * 2 + 4, h: SLAB.stone * 2 + 4, tip: tr("cave.slab.stone"), caveSlab: i + 1 });
  }
  if (st.seen || st.lit > 0.2) r.hot.push({ x: x - SLAB.r, y: y - SLAB.r, w: SLAB.r * 2, h: SLAB.r * 2, tip: st.open ? tr("cave.slab.open") : tr("cave.slab") });
}

module.exports = { SIGNS, sign, ageSign, drawFrescoes, drawCartouche, drawSlab, BAND_Y, CART, SLAB, WALL_X0, WALL_X1 };
