"use strict";
/**
 * La caverne Bahro, sous le Relto (claude/DESIGN-reve-et-caverne-bahro.md, étape 4b ; modèle : la grotte aux granulés
 * d'Uru, The Path of the Shell). Deux niveaux, tout dessiné ici (aucun asset) :
 * - **le haut** (`cavetop`) : une salle sèche, à peine éclairée d'en haut ; un trou au centre ; l'étagère où s'accumulent
 *   les granulés cuits par la machine du Relto (src/harvest.js, `ext.pellets` : blancs et gris), comptés en entailles ; un bouton de pierre qui en lâche un ; une
 *   faille vers le bas ;
 * - **le bas** (`cavebottom`) : le noir complet, un bassin. Le granulé tombe pendant FALL_MS (une minute) ; s'il est bon et qu'on est
 *   en bas quand il touche l'eau, la lueur des algues monte le long des parois pendant LIGHT_MS et révèle les peintures,
 *   et les Bahro, surpris en train de peindre, qui se fondent dans la roche quand elle baisse. Un granulé raté flotte et
 *   fume en vert. Trop tard : l'eau est déjà noire.
 * On y descend par une faille dans le sol du cellier (l'escalier de la crypte au Château).
 * État (dans le plugin, `ext.pellets`, `ext.cave`) : r.opts.caveState(), onCaveDrop(), onCaveSeen(), onCaveSfx(kind).
 */
const { mix, rgba, clamp, fnv } = require("./util");
const W = 640, H = 360, TAU = Math.PI * 2;
const FALL_MS = 60000, LIGHT_MS = 10000; /* la chute : une minute (90 s, c'était long) */
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const nowOf = (r) => (r.nowOverride || Date.now());
const stateOf = (r) => (r.opts && typeof r.opts.caveState === "function" ? r.opts.caveState() || {} : {});

/** La phase d'un granulé lâché : "falling" (il tombe), "lit" (bon, il touche l'eau : k ms depuis le choc), "fizz" (raté), null. */
function phaseOf(drop, now) {
  if (!drop || !drop.at) return null;
  const k = now - drop.at - FALL_MS;
  if (k < 0) return { kind: "falling", k: now - drop.at };
  if (k < LIGHT_MS) return { kind: drop.q === "good" ? "lit" : "fizz", k };
  return null;
}

/** Une faille dans le sol du cellier : quelques marches qui s'enfoncent dans le noir, un souffle froid. Au Château : l'escalier de la crypte. */
function vaultCrack(r, ctx, c, castle, t) {
  const x = 60, y = 290, w = 120, h = 46, tr = TR(r), hov = r.hover && r.hover.go === "cavetop";
  ctx.fillStyle = "rgba(0,0,0,0.92)"; ctx.beginPath();
  if (castle) { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 14, y + h); ctx.lineTo(x + 14, y + h); }
  else { ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 34, y - 2); ctx.lineTo(x + 70, y + 3); ctx.lineTo(x + w, y + 8); ctx.lineTo(x + w - 18, y + h - 6); ctx.lineTo(x + 52, y + h); ctx.lineTo(x + 12, y + h - 10); }
  ctx.closePath(); ctx.fill();
  for (let i = 0; i < 4; i++) { const yy = y + 8 + i * 9, inset = 16 + i * 8; ctx.fillStyle = c(castle ? "#4a4552" : "#3a3530"); ctx.globalAlpha = 0.8 - i * 0.18; ctx.fillRect(x + inset, yy, w - inset * 2, 3); } /* les marches, qui s'effacent */
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(x + w / 2, y + h * 0.7, 2, x + w / 2, y + h * 0.7, w * 0.6); g.addColorStop(0, rgba(120, 200, 170, (hov ? 0.18 : 0.08) * (0.7 + 0.3 * Math.sin(t * 0.8)))); g.addColorStop(1, rgba(120, 200, 170, 0)); ctx.fillStyle = g; ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
  r.hot.push({ x, y: y - 6, w, h: h + 6, tip: castle ? tr("cave.stairs") : tr("cave.crack"), go: "cavetop" });
}

/** Le relief des parois : une silhouette de caverne, au gré d'une graine. */
function walls(ctx, fill, seed) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H);
  for (let x = W; x >= 0; x -= 20) { const k = fnv(seed + "|" + x); ctx.lineTo(x, H - 60 - (k % 30)); }
  ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
}

function drawCaveTop(r, ctx, sc, sky, t) {
  const tr = TR(r), st = stateOf(r), now = nowOf(r), ph = phaseOf(st.drop, now), c = (h) => mix("#05060c", h, 0.75);
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#14110e"); bg.addColorStop(0.6, "#221c16"); bg.addColorStop(1, "#0c0a08"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const shaft = ctx.createLinearGradient(320, 0, 320, 260); shaft.addColorStop(0, "rgba(220,210,180,0.16)"); shaft.addColorStop(1, "rgba(220,210,180,0)"); /* un peu de jour, tombé d'une fente du plafond */
  ctx.fillStyle = shaft; ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(340, 0); ctx.lineTo(420, 260); ctx.lineTo(220, 260); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 9; i++) { const k = fnv("strata" + i); ctx.strokeStyle = rgba(90, 76, 60, 0.18); ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= W; x += 16) { const y = 30 + i * 26 + 5 * Math.sin(x / 70 + k); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  ctx.fillStyle = c("#2a231c"); ctx.fillRect(0, 262, W, H - 262); /* le sol */
  /* le trou, au centre */
  ctx.fillStyle = c("#3a3128"); ctx.beginPath(); ctx.ellipse(320, 286, 104, 32, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(320, 288, 90, 25, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, k = fnv("rim" + i) % 5; ctx.fillStyle = c(k % 2 ? "#4a3f33" : "#3e352b"); ctx.beginPath(); ctx.ellipse(320 + Math.cos(a) * 97, 288 + Math.sin(a) * 28, 9 + k, 5, a, 0, TAU); ctx.fill(); }
  if (ph && ph.kind === "falling" && ph.k < 1600) { const q = ph.k / 1600, y = 230 + q * 70, rad = 4 * (1 - q * 0.8); ctx.save(); ctx.translate(320, y); ctx.rotate(q * 5); ctx.globalAlpha = 0.95; require("./relto-oven").pill(ctx, 0, 0, st.drop.q === "good" ? "white" : "grey", Math.max(0.1, rad / 4)); ctx.restore(); } /* la pilule tombe en tournant */
  r.hot.push({ x: 216, y: 256, w: 208, h: 64, tip: tr("cave.hole") });
  /* l'étagère : les granulés, et les entailles qui les comptent */
  ctx.fillStyle = c("#3d3328"); ctx.fillRect(36, 176, 170, 9); ctx.fillStyle = rgba(0, 0, 0, 0.4); ctx.fillRect(36, 185, 170, 3);
  const good = Math.max(0, st.good || 0), bad = Math.max(0, st.bad || 0), shown = [...Array(Math.min(good, 12)).fill("g"), ...Array(Math.min(bad, Math.max(0, 14 - Math.min(good, 12)))).fill("b")];
  const PILL = require("./relto-oven").pill; /* des pilules, couchées en petits tas (deux dessous, une dessus) */
  shown.forEach((k, i) => { const grp = Math.floor(i / 3), p3 = i % 3, gx = 50 + grp * 30; PILL(ctx, p3 === 2 ? gx + 6 : gx + p3 * 12, p3 === 2 ? 168 : 173.2, k === "g" ? "white" : "grey", 0.85); });
  ctx.strokeStyle = rgba(200, 170, 120, 0.55); ctx.lineWidth = 1.4; /* les entailles Bahro : une par granulé blanc, par cinq barrées */
  for (let i = 0; i < Math.min(good, 40); i++) { const grp = Math.floor(i / 5), j = i % 5, x = 44 + grp * 22 + j * 3.4, y = 196; if (j < 4) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y + 12); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(x - 14, y + 10); ctx.lineTo(x + 1, y + 2); ctx.stroke(); } }
  r.hot.push({ x: 36, y: 160, w: 170, h: 54, tip: good || bad ? tr("cave.shelf", { g: good, b: bad }) : tr("cave.shelf.empty") });
  /* le bouton : une pierre ronde sur un socle, enfoncée tant que le granulé tombe */
  const down = !!(ph && ph.kind === "falling"), hov = r.hover && r.hover.caveDrop;
  ctx.fillStyle = c("#3a3128"); ctx.fillRect(486, 218, 44, 50); ctx.fillStyle = c("#4a3f33"); ctx.fillRect(482, 214, 52, 8);
  const bg2 = ctx.createRadialGradient(506, 207 + (down ? 4 : 0), 1, 508, 210 + (down ? 4 : 0), 13); bg2.addColorStop(0, hov && !down ? "#cdb88a" : "#9c8a66"); bg2.addColorStop(1, "#4a3f33");
  ctx.fillStyle = bg2; ctx.beginPath(); ctx.ellipse(508, 210 + (down ? 4 : 0), 14, down ? 4 : 7, 0, 0, TAU); ctx.fill();
  r.hot.push({ x: 478, y: 196, w: 60, h: 74, tip: down ? tr("cave.button.down") : good + bad > 0 ? tr("cave.button") : tr("cave.button.empty"), caveDrop: !down && good + bad > 0 });
  /* la faille vers le bas, dans la paroi de droite */
  const fh = r.hover && r.hover.go === "cavebottom";
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(584, 96); ctx.lineTo(604, 110); ctx.lineTo(598, 170); ctx.lineTo(612, 230); ctx.lineTo(600, 266); ctx.lineTo(572, 266); ctx.lineTo(582, 214); ctx.lineTo(574, 150); ctx.closePath(); ctx.fill();
  if (fh) { ctx.strokeStyle = rgba(120, 200, 170, 0.35); ctx.lineWidth = 1; ctx.stroke(); }
  r.hot.push({ x: 566, y: 96, w: 52, h: 172, tip: tr("cave.down"), go: "cavebottom" });
  const v = ctx.createRadialGradient(W / 2, H / 2, 140, W / 2, H / 2, 420); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.5)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  require("./relto-atelier").backButton(r, ctx, tr("cave.back.vault"), "vault");
  void sc; void sky; void t; void clamp;
}

/**
 * Un Bahro accroupi contre la paroi, le bras levé vers ce qu'il peint : une silhouette longue et voûtée (crâne allongé
 * vers l'arrière, épaules hautes, membres longs et maigres, jambes repliées), bordée de la lueur des algues.
 */
function bahro(ctx, x, y, s, flip, a, t) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.globalAlpha = a;
  const body = "#07090b", rim = "rgba(140,230,190,0.55)", lw = 1 / s, reach = 2 * Math.sin(t * 1.3);
  const limb = (pts, w) => { ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = body; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); ctx.strokeStyle = rim; ctx.lineWidth = lw; ctx.stroke(); };
  limb([[-6, -14], [-18, -4], [-8, 0], [-2, 0]], 5); /* la jambe arrière, repliée */
  limb([[4, -14], [-4, -6], [6, 0], [12, 0]], 5.5); /* la jambe avant */
  ctx.fillStyle = body; ctx.strokeStyle = rim; ctx.lineWidth = lw; /* le torse, penché vers la paroi, les épaules hautes */
  ctx.beginPath(); ctx.moveTo(-8, -12); ctx.quadraticCurveTo(-12, -30, -2, -40); ctx.quadraticCurveTo(8, -46, 16, -40); ctx.quadraticCurveTo(14, -26, 8, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -44); ctx.quadraticCurveTo(12, -54, 22, -54); ctx.quadraticCurveTo(30, -53, 32, -48); ctx.quadraticCurveTo(24, -45, 18, -40); ctx.quadraticCurveTo(10, -38, 10, -44); ctx.closePath(); ctx.fill(); ctx.stroke(); /* la tête, allongée */
  ctx.beginPath(); ctx.moveTo(12, -50); ctx.quadraticCurveTo(2, -58, -6, -54); ctx.lineWidth = 2.4 / s; ctx.strokeStyle = body; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = rim; ctx.stroke(); /* le crâne qui file vers l'arrière */
  limb([[12, -36], [26, -48 + reach], [36, -70 + reach], [40, -74 + reach]], 3.2); /* le bras levé, qui peint */
  limb([[4, -30], [12, -18], [20, -6]], 3); /* l'autre bras, appuyé */
  ctx.fillStyle = "rgba(230,200,120,0.9)"; ctx.beginPath(); ctx.arc(26, -50, 1.1, 0, TAU); ctx.fill(); /* l'œil, qui prend la lumière */
  ctx.restore();
}

/** Les peintures de la paroi (premier jet, étape 4b ; l'étape 4c y racontera l'histoire du joueur) : mains, spirales, entailles, ocre. */
function paintings(ctx, reveal, seed) {
  const marks = Array.from({ length: 14 }, (_, i) => { const k = fnv(seed + "|p" + i); return { x: 40 + (k % 560), y: 40 + ((k >>> 9) % 190), kind: (k >>> 17) % 4, s: 0.8 + ((k >>> 21) % 6) / 10 }; });
  for (const m of marks) {
    const vis = clamp((reveal - (H - m.y)) / 40); if (vis <= 0) continue; /* la lueur monte : on voit d'abord le bas */
    ctx.save(); ctx.translate(m.x, m.y); ctx.scale(m.s, m.s); ctx.globalAlpha = 0.75 * vis; ctx.strokeStyle = "#c0703a"; ctx.fillStyle = "#b5602e"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    if (m.kind === 0) { ctx.beginPath(); ctx.ellipse(0, 0, 7, 9, 0, 0, TAU); ctx.fill(); for (let f = 0; f < 5; f++) { const a = -2.4 + f * 0.42; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 18); ctx.stroke(); } }
    else if (m.kind === 1) { ctx.beginPath(); for (let a = 0; a < TAU * 2.5; a += 0.2) { const rr = 1.6 * a; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke(); }
    else if (m.kind === 2) { for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(j * 5 - 10, -8); ctx.lineTo(j * 5 - 9, 8); ctx.stroke(); } }
    else { ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI * 0.15, Math.PI * 1.25); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-14, 12); ctx.lineTo(0, -2); ctx.lineTo(14, 12); ctx.stroke(); }
    ctx.restore();
  }
}

function drawCaveBottom(r, ctx, sc, sky, t) {
  const tr = TR(r), st = stateOf(r), now = nowOf(r), ph = phaseOf(st.drop, now), seed = "cave";
  ctx.fillStyle = "#010203"; ctx.fillRect(0, 0, W, H);
  /* le bassin, à peine deviné ; des gouttes qui tombent dans le noir */
  ctx.strokeStyle = "rgba(90,120,130,0.10)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(320, 300, 170, 30, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 4; i++) { const k = fnv("drip" + i), x = 160 + (k % 320), q = ((t * 0.25 + i * 0.27) % 1); ctx.fillStyle = rgba(160, 190, 200, 0.25 * (1 - q)); ctx.fillRect(x, 40 + q * 250, 1, 3); }
  let lit = 0, reveal = 0;
  if (ph && ph.kind === "lit") {
    const k = ph.k; lit = k < 2500 ? k / 2500 : k < 7500 ? 1 : Math.max(0, 1 - (k - 7500) / 2500); reveal = Math.min(H, (k / 3200) * H) * (k < 7500 ? 1 : lit); /* la lueur monte en 3 s, tient, puis retombe */
    const fx = (r._caveFx = r._caveFx || {}); if (!fx[st.drop.at]) { fx[st.drop.at] = true; if (r.opts.onCaveSfx) { r.opts.onCaveSfx("splash"); setTimeout(() => r.opts.onCaveSfx("cry"), 2600); } if (r.opts.onCaveSeen) r.opts.onCaveSeen(); }
  } else if (ph && ph.kind === "fizz") {
    const fx = (r._caveFx = r._caveFx || {}); if (!fx[st.drop.at]) { fx[st.drop.at] = true; if (r.opts.onCaveSfx) r.opts.onCaveSfx("fizz"); }
  }
  if (lit > 0) {
    const g = ctx.createLinearGradient(0, H, 0, H - reveal); g.addColorStop(0, rgba(60, 220, 150, 0.55 * lit)); g.addColorStop(0.7, rgba(40, 160, 120, 0.25 * lit)); g.addColorStop(1, rgba(20, 90, 70, 0)); /* la paroi, dans la lueur des algues */
    ctx.save(); ctx.beginPath(); ctx.rect(0, H - reveal, W, reveal); ctx.clip(); ctx.globalAlpha = lit; walls(ctx, "#1b2a24", seed); ctx.restore(); /* la paroi n'apparaît que là où la lueur est montée */
    ctx.fillStyle = g; ctx.fillRect(0, H - reveal, W, reveal);
    for (let i = 0; i < 9; i++) { const kk = fnv("bstrata" + i); ctx.strokeStyle = rgba(30, 60, 50, 0.4 * lit); ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= W; x += 16) { const y = 30 + i * 28 + 6 * Math.sin(x / 60 + kk); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    paintings(ctx, reveal, seed);
    const shy = ph.k < 6000 ? lit : lit * Math.max(0, 1 - (ph.k - 6000) / 1800); /* les Bahro se fondent dans la roche avant que la lueur baisse */
    const seen = (y) => clamp((reveal - (H - y + 60)) / 50); /* la lueur doit les avoir atteints */
    bahro(ctx, 104, 262, 1.5, false, shy * seen(262), t); bahro(ctx, 516, 252, 1.3, true, shy * seen(252), t + 1); bahro(ctx, 582, 270, 1.05, true, shy * 0.8 * seen(270), t + 2);
    const pg = ctx.createRadialGradient(320, 300, 4, 320, 300, 180); pg.addColorStop(0, rgba(170, 255, 210, 0.9 * lit)); pg.addColorStop(0.3, rgba(80, 230, 160, 0.4 * lit)); pg.addColorStop(1, rgba(40, 160, 120, 0)); ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(320, 300, 175, 32, 0, 0, TAU); ctx.fill();
  }
  if (ph && ph.kind === "fizz") { /* le raté : il flotte, et fume en vert */
    const k = ph.k / LIGHT_MS; ctx.save(); ctx.translate(320, 298 + Math.sin(t * 2) * 1.2); ctx.rotate(Math.sin(t * 0.7) * 0.15); require("./relto-oven").pill(ctx, 0, 0, "grey", 1); ctx.restore(); /* la pilule grise flotte, couchée */
    for (let i = 0; i < 6; i++) { const q = ((t * 0.4 + i / 6) % 1), x = 320 + Math.sin(i * 2 + t) * 8 * q; ctx.fillStyle = rgba(120, 200, 80, 0.25 * (1 - q) * (1 - k)); ctx.beginPath(); ctx.arc(x, 290 - q * 90, 6 + q * 14, 0, TAU); ctx.fill(); }
  }
  r.hot.push({ x: 150, y: 270, w: 340, h: 60, tip: lit > 0 ? tr("cave.pool.lit") : tr("cave.pool") });
  require("./relto-atelier").backButton(r, ctx, tr("cave.up"), "cavetop");
  void sc; void sky;
}

module.exports = { drawCaveTop, drawCaveBottom, vaultCrack, phaseOf, FALL_MS, LIGHT_MS };
