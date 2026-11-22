"use strict";
/*
 * Ahyoheek, la table de jeu (le modèle : src/ahyoheek.js). Dans la serre (l'accord) : une petite table de pierre à cinq branches, sur l'allée.
 * Sur le bureau (le commandement) : la même, en réduction, posée à gauche. De près (vue « ahyoheek ») : la table vue d'en haut, de biais ;
 * une place à chaque branche, un chiffre D'ni gravé au bord ; à chaque place un projecteur, et le signe joué y monte en hologramme
 * (rouge la plume, bleu le scarabée, vert le Livre de liaison) ; au centre, une vasque de lumière d'où monte l'anneau des trois signes,
 * le glyphe du jeu en son cœur (en lettres D'ni, si une police D'ni est là ; sinon l'anneau seul). Nos trois projecteurs, devant nous.
 */
const { rgba } = require("./util");
const AH = require("./ahyoheek");
const W = 640, H = 360, TAU = Math.PI * 2;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const q = (k) => { let h = 2166136261; for (const ch of String(k)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
/** Le glyphe du centre : les lettres d'« ahyoheek » posées l'une sur l'autre (lettre@x,y,taille,rotation ; x, y en points pour une taille 30). */
const GLYPH = "E@8,14.7,0.92 o@-6.3,13.1,0.93,-13 a@-2.5,-2.6,0.92,10 h@-4.8,5.7,0.93,-20 y@-8.9,16.4,0.76,-2", GLYPH_SIZE = 50;

/* les chiffres D'ni, le tracé simple du plugin (src/dni.js, simplePaths : repère 0..100, cadre 4..96) */
const P = (u, v) => [4 + 92 * u, 4 + 92 * v];
const UNITS = [null, (c) => { c.moveTo(...P(0.5, 0)); c.lineTo(...P(0.5, 1)); }, (c) => { c.moveTo(...P(0, 0.1)); c.bezierCurveTo(...P(0.46, 0.26), ...P(0.46, 0.74), ...P(0, 0.9)); }, (c) => { c.moveTo(...P(0.5, 0)); c.lineTo(...P(0, 0.5)); c.lineTo(...P(0.5, 1)); }, (c) => { c.moveTo(...P(0.52, 1)); c.lineTo(52.8, 31.6); c.lineTo(96, 31.6); }];
const FIVES = [null, (c) => { c.moveTo(4, 50); c.lineTo(96, 50); }, (c) => { c.moveTo(...P(0, 1)); c.bezierCurveTo(...P(0.1, 0.6), ...P(0.9, 0.6), ...P(1, 1)); }, (c) => { c.moveTo(...P(0, 0.46)); c.lineTo(...P(0.5, 1)); c.lineTo(...P(1, 0.46)); }, (c) => { c.moveTo(30.7, 4); c.lineTo(30.7, 50); c.lineTo(96, 50); }];
function numeral(ctx, v, x, y, size, col, neg) {
  v = Math.max(0, Math.min(24, Math.abs(v | 0)));
  ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 100, size / 100);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 8; ctx.lineCap = "square"; ctx.lineJoin = "miter";
  ctx.beginPath(); ctx.rect(4, 4, 92, 92); if (FIVES[Math.floor(v / 5)]) FIVES[Math.floor(v / 5)](ctx); if (UNITS[v % 5]) UNITS[v % 5](ctx); ctx.stroke();
  if (v === 0) ctx.fillRect(43, 43, 14, 14);
  ctx.restore();
  if (neg) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, size * 0.09); ctx.beginPath(); ctx.moveTo(x - size * 0.95, y); ctx.lineTo(x - size * 0.65, y); ctx.stroke(); } /* moins : un trait devant le cadre */
}
/** La plume (un bec de plume) et le Livre de liaison (ouvert, la page de gauche nue, le panneau à droite), en trait ; frame : dans un cadre carré. */
function sign(ctx, kind, x, y, s, col, frame) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = Math.max(1.2, s * 0.11);
  if (frame) { ctx.save(); ctx.lineCap = "square"; ctx.lineJoin = "miter"; ctx.strokeRect(-s, -s, s * 2, s * 2); ctx.restore(); }
  const k = s * 0.72; ctx.beginPath();
  if (kind === "pen") { ctx.moveTo(0, k); ctx.bezierCurveTo(-k * 0.15, k * 0.5, -k * 0.62, k * 0.05, -k * 0.55, -k * 0.55); ctx.lineTo(-k * 0.42, -k * 0.95); ctx.lineTo(k * 0.42, -k * 0.95); ctx.lineTo(k * 0.55, -k * 0.55); ctx.bezierCurveTo(k * 0.62, k * 0.05, k * 0.15, k * 0.5, 0, k); ctx.moveTo(0, k); ctx.lineTo(0, -k * 0.05); ctx.moveTo(k * 0.12, -k * 0.2); ctx.arc(0, -k * 0.2, k * 0.12, 0, TAU); ctx.moveTo(-k * 0.42, -k * 0.62); ctx.lineTo(k * 0.42, -k * 0.62); }
  else if (kind === "page") { ctx.moveTo(-k * 1.02, -k * 0.62); ctx.lineTo(-k * 1.02, k * 0.7); ctx.quadraticCurveTo(-k * 0.5, k * 0.55, 0, k * 0.78); ctx.quadraticCurveTo(k * 0.5, k * 0.55, k * 1.02, k * 0.7); ctx.lineTo(k * 1.02, -k * 0.62); ctx.moveTo(0, -k * 0.5); ctx.quadraticCurveTo(-k * 0.45, -k * 0.72, -k * 0.92, -k * 0.6); ctx.lineTo(-k * 0.92, k * 0.58); ctx.quadraticCurveTo(-k * 0.45, k * 0.45, 0, k * 0.66); ctx.quadraticCurveTo(k * 0.45, k * 0.45, k * 0.92, k * 0.58); ctx.lineTo(k * 0.92, -k * 0.6); ctx.quadraticCurveTo(k * 0.45, -k * 0.72, 0, -k * 0.5); ctx.lineTo(0, k * 0.66); ctx.rect(k * 0.24, -k * 0.38, k * 0.5, k * 0.44); }
  ctx.stroke(); ctx.restore();
}
/** Le scarabée de la serre (src/relto-scarabs.js), en contour lumineux de la couleur c (mis en cache par taille et couleur), tête en haut. */
const BCACHE = new Map();
function beetleImg(s, c) {
  const key = Math.round(s) + "|" + c.join(","); if (BCACHE.has(key)) return BCACHE.get(key);
  const n = Math.ceil(s * 3.2), cv = document.createElement("canvas"); cv.width = cv.height = n; const g = cv.getContext("2d");
  const mask = document.createElement("canvas"); mask.width = mask.height = n; const m = mask.getContext("2d"); require("./relto-scarabs").beetle(m, n / 2, n / 2, s, -Math.PI / 2, 0, { air: true });
  m.globalCompositeOperation = "source-in"; m.fillStyle = "#fff"; m.fillRect(0, 0, n, n); /* la silhouette pleine */
  const w = Math.max(1.2, s * 0.09); g.fillStyle = rgba(c[0], c[1], c[2], 1);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.drawImage(mask, Math.cos(a) * w, Math.sin(a) * w); } /* la silhouette, élargie d'un trait */
  g.globalCompositeOperation = "source-in"; g.fillRect(0, 0, n, n); g.globalCompositeOperation = "destination-out"; g.drawImage(mask, 0, 0); /* moins la silhouette : il reste le contour */
  g.globalCompositeOperation = "source-over"; g.strokeStyle = rgba(c[0], c[1], c[2], 1); g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(n / 2, n / 2 - s * 0.12); g.lineTo(n / 2, n / 2 + s * 0.95); g.stroke(); /* la jointure des élytres */
  g.beginPath(); g.moveTo(n / 2 - s * 0.55, n / 2 - s * 0.12); g.quadraticCurveTo(n / 2, n / 2 - s * 0.28, n / 2 + s * 0.55, n / 2 - s * 0.12); g.stroke(); /* le bord du corselet */
  if (BCACHE.size > 40) BCACHE.clear(); BCACHE.set(key, cv); return cv;
}
function beetleAt(ctx, x, y, s, c, alpha, lighter) { const im = beetleImg(s, c); ctx.save(); ctx.globalAlpha = alpha; if (lighter) ctx.globalCompositeOperation = "lighter"; ctx.drawImage(im, x - im.width / 2, y - im.height / 2); ctx.restore(); }
/** Un signe, quel qu'il soit : le scarabée en contour, les deux autres en trait. */
function anySign(ctx, kind, x, y, s, c, alpha, lighter) { if (kind === "beetle") beetleAt(ctx, x, y, s * 0.9, c, alpha, lighter); else sign(ctx, kind, x, y, s, rgba(c[0], c[1], c[2], alpha), false); }

/* les hologrammes : rouge la plume, bleu le scarabée, vert le Livre de liaison */
const HC = { pen: [255, 84, 70], beetle: [80, 150, 255], page: [80, 235, 135] };
const up = (c, d) => c.map((v) => Math.min(255, v + d));
/** Un projecteur rond, encastré dans la pierre ; lit : il projette. */
function emitter(ctx, x, y, r, col, lit) {
  ctx.fillStyle = "#1a140e"; ctx.beginPath(); ctx.ellipse(x, y, r * 1.2, r * 0.48, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#a9773a"; ctx.lineWidth = 1.6; ctx.stroke();
  const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, col ? rgba(col[0], col[1], col[2], lit ? 0.9 : 0.35) : "#2a2018"); g.addColorStop(1, col ? rgba(col[0], col[1], col[2], 0) : "#1a140e");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, TAU); ctx.fill();
}
/** Les hologrammes vacillent, et de temps en temps « glitchent » : un instant (un cinquième de seconde, toutes les quatre ou cinq secondes,
 *  jamais tous ensemble), la figure se découpe en bandes qui glissent de côté et sa lumière hoquette. Renvoie { on, a } : glitch en cours, et la lumière (0 à 1). */
function glitchOf(t, seed) {
  if (!t) return { on: false, a: 1 }; /* mouvement réduit : rien ne bouge */
  const ph = (t * (0.21 + (seed % 5) * 0.013) + seed * 0.37) % 1, on = ph < 0.045, tick = Math.floor(t * 30);
  const wob = 0.9 + 0.1 * Math.sin(t * 2.3 + seed * 1.7); /* le vacillement lent */
  return { on, tick, a: on ? wob * (0.35 + 0.65 * q("gl" + seed + "_" + tick)) : wob };
}
/** Dessine `paint` (une figure centrée en x, cy, de demi-taille s) avec son glitch : en bandes décalées s'il est en cours. */
function glitchy(ctx, x, cy, s, gl, seed, paint) {
  if (!gl.on) { paint(0); return; }
  const band = s * 0.28; for (let y0 = cy - s * 1.3, b = 0; y0 < cy + s * 1.3; y0 += band, b++) { const dx = (q("gx" + seed + "_" + gl.tick + "_" + b) - 0.5) * s * 0.5;
    ctx.save(); ctx.beginPath(); ctx.rect(x - s * 2, y0, s * 4, band + 0.5); ctx.clip(); paint(dx); ctx.restore(); }
}
/** L'hologramme d'un signe, debout au-dessus de son projecteur : le cône de lumière, la figure, les lignes de balayage. a : 0 à 1. */
function holo(ctx, kind, x, y, s, a, t, seed) {
  const c = HC[kind], gl = glitchOf(t, seed), fl = (0.85 + 0.15 * Math.sin(t * 23 + seed * 7) * Math.sin(t * 7.3 + seed)) * gl.a, A = a * fl, cy = y - s * 1.55;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const cone = ctx.createLinearGradient(0, y, 0, cy - s); cone.addColorStop(0, rgba(c[0], c[1], c[2], 0.32 * A)); cone.addColorStop(1, rgba(c[0], c[1], c[2], 0));
  ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(x - s * 0.35, y); ctx.lineTo(x - s * 1.25, cy - s); ctx.lineTo(x + s * 1.25, cy - s); ctx.lineTo(x + s * 0.35, y); ctx.closePath(); ctx.fill();
  const halo = ctx.createRadialGradient(x, cy, s * 0.2, x, cy, s * 1.6); halo.addColorStop(0, rgba(c[0], c[1], c[2], 0.28 * A)); halo.addColorStop(1, rgba(c[0], c[1], c[2], 0)); ctx.fillStyle = halo; ctx.fillRect(x - s * 1.6, cy - s * 1.6, s * 3.2, s * 3.2);
  ctx.shadowColor = rgba(c[0], c[1], c[2], A); ctx.shadowBlur = kind === "beetle" ? 0 : s * 0.5;
  glitchy(ctx, x, cy, s, gl, seed, (dx) => anySign(ctx, kind, x + dx, cy, s, kind === "beetle" ? c : up(c, 70), kind === "beetle" ? 0.9 * A : 0.95 * A, true));
  ctx.shadowBlur = 0; ctx.strokeStyle = rgba(c[0], c[1], c[2], 0.18 * A); ctx.lineWidth = 1;
  const off = (t * 18 + seed * 5) % 3; for (let yy = cy - s * 1.1 + off; yy < cy + s * 1.1; yy += 3) { ctx.beginPath(); ctx.moveTo(x - s * 1.05, yy); ctx.lineTo(x + s * 1.05, yy); ctx.stroke(); } /* le balayage */
  ctx.restore();
}
/** La place qui gagne la manche : une flaque de lumière d'or sous elle, et deux anneaux d'or qui battent autour du projecteur. */
function winMark(ctx, x, y, r, t) {
  const p = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.4); g.addColorStop(0, rgba(255, 200, 110, 0.5)); g.addColorStop(1, rgba(255, 170, 80, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 3.4, r * 1.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(255, 210, 130, 0.85); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r * 1.55, r * 0.66, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(255, 210, 130, 0.5 * (1 - p)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r * (1.6 + p * 0.9), r * (0.68 + p * 0.38), 0, 0, TAU); ctx.stroke(); /* l'onde qui s'éloigne */
  ctx.restore();
}
/** Ce qu'une place a gagné : les trois signes, chacun suivi de son compte en chiffre D'ni. */
function tally(ctx, x, y, s, won) {
  AH.SIGNS.forEach((k, i) => { const yy = y + (i - 1) * s * 2.5; anySign(ctx, k, x - s * 1.5, yy, s, HC[k], 0.9, false); const n = won[k] || 0; numeral(ctx, n, x + s * 0.9, yy, s * 2, n >= 3 ? "#ffcf7a" : n ? "#e0b46c" : rgba(200, 170, 120, 0.6)); });
}

/* ---- le glyphe du centre, en lettres D'ni ---- */
function glyphParts(spec) { return String(spec || "").trim().split(/\s+/).filter(Boolean).map((tok) => { const m = tok.match(/^(.+?)@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?(?:,(-?\d+(?:\.\d+)?))?$/); return m ? { ch: m[1], dx: +m[2], dy: +m[3], k: m[4] ? +m[4] : 1, r: m[5] ? +m[5] : 0 } : { ch: tok, dx: 0, dy: 0, k: 1, r: 0 }; }); }
const PARTS = glyphParts(GLYPH);
function paintGlyph(g, fam, x0, y0) { const z = GLYPH_SIZE / 30; for (const p of PARTS) { g.font = `${Math.round(GLYPH_SIZE * p.k)}px ${fam}`; g.save(); g.translate(x0 + p.dx * z, y0 + p.dy * z); g.rotate(p.r * Math.PI / 180); g.fillText(p.ch, 0, 0); g.restore(); } }
/** Le milieu de l'encre du glyphe, mesuré une fois par police (les lettres n'ont pas toutes la même chasse : on le centre sur ce qu'on voit). */
function inkMid(r, fam) {
  if (r._ahyInk && r._ahyInk.fam === fam) return r._ahyInk;
  const N = 300, cv = document.createElement("canvas"); cv.width = cv.height = N; const g = cv.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; paintGlyph(g, fam, N / 2, N / 2);
  const d = g.getImageData(0, 0, N, N).data; let x0 = N, y0 = N, x1 = -1, y1 = -1; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return (r._ahyInk = { fam, mx: x1 < 0 ? 0 : (x0 + x1) / 2 - N / 2, my: x1 < 0 ? 0 : (y0 + y1) / 2 - N / 2 });
}

/* ---- l'état : la partie en cours, et ce qu'on garde (adversaires, niveau, rang) ---- */
/* les places occupées autour de la table (1 à 4, la 0 est la mienne) : on invite un joueur en touchant un siège libre, on le renvoie en touchant le sien */
const SEAT_ORDER = [2, 3, 1, 4];
function seatsOf(s) { const ok = Array.isArray(s.seats) ? [...new Set(s.seats.filter((k) => [1, 2, 3, 4].includes(k)))] : []; return ok.length ? ok : SEAT_ORDER.slice(0, Math.max(1, Math.min(4, s.n | 0 || 2))); }
function saved(r) { const s = (r.opts && r.opts.ahyState && r.opts.ahyState()) || {}, seats = seatsOf(s); return { seats, n: seats.length, level: ["easy", "mid", "hard", "rank"].includes(s.level) ? s.level : "rank", rank: Math.max(0, s.rank | 0) }; }
function save(r, patch) { const s = { ...saved(r), ...patch }; s.seats = seatsOf(s); s.n = s.seats.length; if (r.opts && r.opts.onAhyoheek) r.opts.onAhyoheek(s); r._ahySaved = s; return s; }
function cur(r) { return r._ahySaved || saved(r); }
function state(r) { if (!r.ahy || !r.ahy.G) { const s = cur(r); r.ahy = { ...(r.ahy || {}), G: AH.newGame({ n: s.n, level: s.level, rank: s.rank }) }; } return r.ahy; }

/** Un clic dans la vue : un signe, la table (la suite), un réglage. */
function act(r, a) {
  const st = state(r), G = st.G;
  if (a.sign) { if (G.phase === "choose") { if (!st.clock) arm(r); if (!st.clock.mine) pickMine(r, a.sign, false); } }
  else if (a.next) { if (G.phase === "reveal") { if (AH.next(G)) { settle(r); if (G.phase === "choose") arm(r); else if (G.phase === "won") snd(r, G.end.i === 0 ? "game" : "gameLost"); } } }
  else if (a.seat != null) { const seats = cur(r).seats, k = a.seat, has = seats.includes(k); if (has && seats.length === 1) return; /* il faut au moins un adversaire */
    const s = save(r, { seats: has ? seats.filter((x) => x !== k) : [...seats, k] }); st.G = AH.newGame(s); st.clock = null; snd(r, has ? "leave" : "join"); }
  else if (a.level) { const L = ["easy", "mid", "hard", "rank"], s = save(r, { level: L[(L.indexOf(cur(r).level) + 1) % 4] }); st.G = AH.newGame(s); st.clock = null; snd(r, "button"); }
  else if (a.start) { st.press = now(); if (G.round > 0 || G.phase !== "choose" || st.clock) st.G = AH.newGame(cur(r)); st.clock = null; snd(r, "button"); arm(r); } /* le bouton : une partie neuve, et sa première manche part */
}
const snd = (r, k) => { if (r.opts && r.opts.onAhySound) r.opts.onAhySound(k); };
/* ---- la manche, comme à la table d'Uru : un compte à rebours de dix secondes au cœur de l'anneau ; chacun pose son signe quand il veut
 * (un chevron blanc s'allume devant lui sur la vasque) ; quand tout le monde a posé, on dévoile ; à zéro, un signe est joué au hasard pour qui n'a pas choisi. */
const COUNT = 10000, now = () => Date.now();
/** La manche commence : le compte part, chaque adversaire posera son signe à un moment à lui (entre 1,5 et 8 secondes). */
function arm(r) { const st = r.ahy, n = now(); st.clock = { end: n + COUNT, vt: st.G.opp.map(() => n + 1500 + Math.random() * 6500), heard: st.G.opp.map(() => false), sec: COUNT / 1000, seen: n, mine: null, revealAt: 0, late: false }; snd(r, "start"); }
/** Je pose mon signe : ceux qui n'ont pas encore choisi se décident vite, puis on dévoile. */
function pickMine(r, sign, late) {
  const c = r.ahy.clock, n = now(); c.mine = sign; c.late = late; snd(r, "mine");
  c.vt = c.vt.map((v) => (v > n ? n + 150 + Math.random() * 450 : v)); c.revealAt = Math.max(n + 500, ...c.vt) + 350;
}
/** À chaque image : le temps passe (une pause de l'affichage, l'onglet caché, ne compte pas) ; à zéro, le hasard joue pour moi ; puis le dévoilement. */
function tick(r) {
  const st = r.ahy, c = st.clock, G = st.G; if (!c || G.phase !== "choose") return;
  const n = now(); if (n - c.seen > 1500) { const d = n - c.seen; c.end += d; c.vt = c.vt.map((v) => v + d); if (c.revealAt) c.revealAt += d; } c.seen = n;
  const sec = Math.max(0, Math.ceil((c.end - n) / 1000)); if (c.sec == null) c.sec = sec; if (sec < c.sec) { c.sec = sec; if (!c.mine && sec > 0) snd(r, "tick"); } /* chaque seconde : un tic, et l'anneau tourne d'un cran */
  c.heard = c.heard || []; c.vt.forEach((v, i) => { if (!c.heard[i] && n >= v) { c.heard[i] = true; if (!c.mine) snd(r, "set"); } }); /* un adversaire pose son signe (après le mien, ils se décident ensemble : on ne les entend pas un à un) */
  if (!c.mine && n >= c.end) pickMine(r, AH.SIGNS[Math.floor(Math.random() * 3)], true);
  if (c.mine && n >= c.revealAt) { st.clock = null; if (AH.play(G, c.mine)) { settle(r); st.late = c.late ? G.round : null; snd(r, "reveal");
    if (G.phase === "won") snd(r, G.end.i === 0 ? "game" : "gameLost"); else if (G.winners && G.winners.length) snd(r, G.winners.includes(0) ? "win" : "lose"); } }
}
/** Une partie qui vient de finir : le rang bouge (une fois), si on joue « selon le rang ». */
function settle(r) { const G = r.ahy.G; if (G.phase === "won" && !G.ranked) { G.ranked = true; if (cur(r).level === "rank") save(r, { rank: AH.rankAfter(G, cur(r).rank) }); } }

/* ---- la vue rapprochée ---- */
const C = { x: 320, y: 182 }, RX = 250, RY = 132;
const seatAt = (k) => { const a = Math.PI / 2 + k * TAU / 5; return [C.x + Math.cos(a) * RX * 0.66, C.y + Math.sin(a) * RY * 0.66]; };
const MINE = (i) => [286 + i * 34, 250];
function drawGame(r, ctx, sc, sky, t) {
  state(r); tick(r);
  const st = r.ahy, G = st.G, T = TR(r), hov = r.hover && r.hover.ahy && r.hover.ahy.sign, reveal = G.phase !== "choose", seats = [0, ...cur(r).seats].slice(0, G.opp.length + 1), clk = st.clock, nowMs = now(), idle = !clk && !reveal, between = idle || G.phase === "won";
  const out = (i) => !!(G.sudden && !G.sudden.includes(i)); /* manche décisive : ceux qui n'y sont pas restent dans l'ombre */
  const isWin = (i) => !!(G.winners && G.winners.includes(i)), anyWin = !!(G.winners && G.winners.length);
  if (G.phase === "reveal") r.hot.push({ x: 60, y: 40, w: 520, h: 300, ahy: { next: true } }); /* la manche montrée : toucher la table pour la suite */
  else if (idle && G.round > 0) r.hot.push({ x: 60, y: 40, w: 520, h: 300, ahy: { next: true } });
  /* la salle : un sol de briques chaudes, la roche sombre au fond, une lumière chaude sur la table */
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#140d08"); bg.addColorStop(0.35, "#22160d"); bg.addColorStop(1, "#3a2414"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < 14; k++) { const y0 = 70 + k * k * 1.75, h = 3 + k * 1.3, w = 22 + k * 5.5, off = (k % 2) * w / 2; for (let x = -w + off; x < W + w; x += w) { const v = q("b" + k + "_" + Math.round(x)); ctx.fillStyle = rgba(96 + v * 50, 54 + v * 26, 30 + v * 12, 0.12 + k * 0.022); ctx.fillRect(x + 1, y0 + 1, w - 2, h - 1); } } /* les briques, en perspective */
  const lamp = ctx.createRadialGradient(C.x, C.y, 30, C.x, C.y, 360); lamp.addColorStop(0, rgba(255, 180, 100, 0.26)); lamp.addColorStop(1, rgba(255, 150, 70, 0)); ctx.fillStyle = lamp; ctx.fillRect(0, 0, W, H);
  /* la table : cinq branches aux bords creusés, sur un pied ; une place au bout de chaque branche */
  const poly = (rx, ry, dy = 0) => { ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * TAU / 5, b = a + TAU / 10, a2 = a + TAU / 5, Q = (ang, f) => [C.x + Math.cos(ang) * rx * f, C.y + dy + Math.sin(ang) * ry * f];
      const tip = Q(a, 1), v = Q(b, 0.5), tip2 = Q(a2, 1), c1 = Q(a + TAU / 20, 0.66), c2 = Q(b + TAU / 20, 0.66); if (!k) ctx.moveTo(...tip); ctx.quadraticCurveTo(...c1, ...v); ctx.quadraticCurveTo(...c2, ...tip2); } ctx.closePath(); };
  const stool = (x, y, s) => { ctx.fillStyle = rgba(0, 0, 0, 0.4); ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.9, s * 1.1, s * 0.3, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#3a2c20"; ctx.fillRect(x - s * 0.22, y, s * 0.44, s * 0.9); const g = ctx.createLinearGradient(0, y - s * 0.3, 0, y + s * 0.3); g.addColorStop(0, "#9a8a72"); g.addColorStop(1, "#5a4c3c"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.32, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#4a3e30"; ctx.beginPath(); ctx.ellipse(x, y + s * 0.12, s, s * 0.32, 0, 0, Math.PI); ctx.fill(); };
  for (let k = 1; k < 5; k++) { if (!seats.includes(k)) continue; const a = Math.PI / 2 + k * TAU / 5; if (Math.sin(a) > 0.2) continue; stool(C.x + Math.cos(a) * RX * 1.12, C.y + Math.sin(a) * RY * 1.2 - 6, 15); } /* les tabourets des places occupées, au fond */
  ctx.fillStyle = rgba(0, 0, 0, 0.5); poly(RX * 1.02, RY * 1.04, 24); ctx.fill();
  ctx.fillStyle = "#1c150f"; ctx.beginPath(); ctx.ellipse(C.x, C.y + 40, 70, 26, 0, 0, TAU); ctx.fill(); /* le pied */
  ctx.fillStyle = "#2c2118"; poly(RX, RY, 13); ctx.fill(); ctx.strokeStyle = "#6e4c24"; ctx.lineWidth = 1; poly(RX, RY, 13); ctx.stroke(); /* la tranche */
  const top = ctx.createRadialGradient(C.x - 50, C.y - 50, 20, C.x, C.y, RX); top.addColorStop(0, "#5e4c3a"); top.addColorStop(1, "#2e241a"); ctx.fillStyle = top; poly(RX, RY); ctx.fill();
  ctx.save(); poly(RX, RY); ctx.clip(); for (let i = 0; i < 110; i++) { ctx.fillStyle = rgba(0, 0, 0, 0.08 + q("g" + i) * 0.1); ctx.beginPath(); ctx.arc(C.x + (q("gx" + i) - 0.5) * RX * 2, C.y + (q("gy" + i) - 0.5) * RY * 2, 0.8 + q("gs" + i) * 2.4, 0, TAU); ctx.fill(); } ctx.restore(); /* le grain de la pierre */
  ctx.strokeStyle = "#b07c3c"; ctx.lineWidth = 3; poly(RX, RY); ctx.stroke(); ctx.strokeStyle = rgba(255, 210, 140, 0.35); ctx.lineWidth = 1; poly(RX * 0.97, RY * 0.96); ctx.stroke(); /* le bord de bronze */
  ctx.strokeStyle = rgba(176, 124, 60, 0.6); ctx.lineWidth = 1.4; poly(RX * 0.86, RY * 0.86); ctx.stroke(); ctx.setLineDash([2, 4]); poly(RX * 0.8, RY * 0.8); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(176, 124, 60, 0.7); ctx.beginPath(); ctx.ellipse(C.x, C.y - 4, 84, 34, 0, 0, TAU); ctx.stroke(); /* la bande ornée, le cercle du centre */
  /* au centre : la vasque de lumière, d'où monte l'anneau */
  const bx = C.x, by = C.y - 4; ctx.fillStyle = "#1a120c"; ctx.beginPath(); ctx.ellipse(bx, by, 62, 24, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#b07c3c"; ctx.lineWidth = 2.5; ctx.stroke();
  const pool = ctx.createRadialGradient(bx, by, 4, bx, by, 58); pool.addColorStop(0, rgba(170, 205, 235, 0.55)); pool.addColorStop(0.6, rgba(100, 150, 200, 0.35)); pool.addColorStop(1, rgba(60, 100, 150, 0.12)); ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(bx, by, 56, 20, 0, 0, TAU); ctx.fill();
  /* les chevrons, sur la vasque, un devant chaque joueur : éteint, il n'a pas encore choisi ; blanc, il a posé son signe ; au dévoilement, celui qui gagne prend la couleur de son signe */
  seats.forEach((k, i) => { if (out(i)) return; const a = Math.PI / 2 + k * TAU / 5, hw = TAU / 10 - 0.07, done = reveal || (clk && (i === 0 ? !!clk.mine : nowMs >= clk.vt[i - 1])), p = i === 0 ? G.me : G.opp[i - 1];
    const col = reveal && isWin(i) && p.play ? rgba(...up(HC[p.play], 30), 0.92) : done ? rgba(235, 240, 250, reveal && anyWin ? 0.32 : 0.72) : rgba(255, 255, 255, 0.06);
    ctx.fillStyle = col; ctx.beginPath(); for (let j = 0; j <= 12; j++) { const th = a - hw + (2 * hw * j) / 12; ctx.lineTo(bx + Math.cos(th) * 54, by + Math.sin(th) * 19.5); } for (let j = 12; j >= 0; j--) { const th = a - hw + (2 * hw * j) / 12; ctx.lineTo(bx + Math.cos(th) * 40, by + Math.sin(th) * 13.5); } ctx.closePath(); ctx.fill(); });
  /* les places : un chiffre D'ni gravé au bord, éteint si personne n'y joue */
  for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * TAU / 5; numeral(ctx, k + 1, C.x + Math.cos(a) * RX * 0.9, C.y + Math.sin(a) * RY * 0.9, 12, seats.includes(k) ? "#c99a52" : rgba(169, 119, 58, 0.35)); }
  for (let k = 1; k < 5; k++) { if (seats.includes(k)) continue; const [x, y] = seatAt(k); /* un siège libre : le projecteur éteint, couvert ; entre deux parties, on y invite un joueur */
    emitter(ctx, x, y, 18, null, false); ctx.strokeStyle = rgba(169, 119, 58, 0.35); ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.ellipse(x, y, 26, 11, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (between) r.hot.push({ x: x - 28, y: y - 18, w: 56, h: 32, tip: T("ahy.seat.free", { n: k + 1 }), ahy: { seat: k } }); }
  G.opp.forEach((o, i) => { const k = seats[i + 1], [x, y] = seatAt(k), dim = out(i + 1);
    if (dim) ctx.globalAlpha = 0.35;
    if (isWin(i + 1)) winMark(ctx, x, y, 18, t); emitter(ctx, x, y, 18, reveal && o.play ? HC[o.play] : null, reveal); if (reveal && o.play) holo(ctx, o.play, x, y, isWin(i + 1) ? 28 : 22, isWin(i + 1) ? 1 : anyWin ? 0.28 : 0.8, t, i + 1);
    tally(ctx, x + (x < C.x - 5 ? -84 : x > C.x + 5 ? 84 : 96), y - 6, 9, o.won);
    if (reveal && o.pts != null) numeral(ctx, o.pts, x, y + 32, 16, o.pts > 0 ? "#ffcf7a" : o.pts < 0 ? "#b0846a" : "#c99a52", o.pts < 0);
    ctx.globalAlpha = 1;
    r.hot.push({ x: x - 24, y: y - 40, w: 48, h: 54, tip: T(between ? "ahy.seat.taken" : "ahy.player", { n: k + 1 }), ahy: G.phase === "reveal" ? { next: true } : between ? { seat: k } : {} }); });
  /* l'anneau : un cercle de lumière debout au-dessus de la vasque, les trois signes dessus, le glyphe du jeu au cœur */
  { const cx = C.x, cy = C.y - 86, R = 62, fl = 0.9 + 0.1 * Math.sin(t * 17) * Math.sin(t * 5.1);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const beam = ctx.createLinearGradient(0, C.y - 4, 0, cy - R); beam.addColorStop(0, rgba(140, 180, 230, 0.12)); beam.addColorStop(1, rgba(170, 210, 255, 0)); ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(cx - 50, C.y - 4); ctx.lineTo(cx - R - 10, cy - R); ctx.lineTo(cx + R + 10, cy - R); ctx.lineTo(cx + 50, C.y - 4); ctx.closePath(); ctx.fill();
    /* l'anneau tourne d'un cran (un tiers de tour : chaque signe prend la place du suivant), d'un coup sec : à chaque seconde pendant le compte, plus lentement sinon */
    const per = clk && !reveal ? 1 : 3, el = r.opts && r.opts.reducedMotion ? 0 : clk && !reveal ? (COUNT - (clk.end - nowMs)) / 1000 : nowMs / 1000 / per, kk = Math.floor(el), fe = Math.min(1, (el - kk) / (0.22 / per)), rot = ((kk % 3) + 1 - (1 - fe) ** 3) * TAU / 3; /* modulo 3 : le canvas compte ses angles en petite précision, un angle énorme y perd l'arc */
    const pos = { beetle: -Math.PI / 2 + rot, page: Math.PI / 2 + Math.PI / 3 + rot, pen: Math.PI / 2 - Math.PI / 3 + rot }; /* au départ, le scarabée en haut, le livre en bas à gauche, la plume en bas à droite */
    ctx.shadowColor = rgba(160, 200, 240, 0.6 * fl); ctx.shadowBlur = 5; ctx.strokeStyle = rgba(150, 185, 225, 0.38 * fl);
    const gap = 0.36, ang = [pos.beetle, pos.pen, pos.page]; /* dans l'ordre du tour */ for (let i = 0; i < 3; i++) { const a0 = ang[i] + gap, a1 = (i < 2 ? ang[i + 1] : ang[0] + TAU) - gap; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R - 7, a0 + 0.06, a1 - 0.06); ctx.stroke(); } /* trois arcs, ouverts là où sont les signes */
    const fam = r.dni && r.dni.fontFamily && r.dni.fontFamily();
    const wonSign = reveal && anyWin ? [G.me, ...G.opp][G.winners[0]].play : null;
    if (clk && !reveal) { const left = Math.max(0, Math.ceil((clk.end - nowMs) / 1000)); ctx.shadowColor = rgba(170, 210, 255, 0.8 * fl); ctx.shadowBlur = 8; const gl = glitchOf(t, 21); glitchy(ctx, cx, cy, 23, gl, 21, (dx) => numeral(ctx, left, cx + dx, cy, 46, rgba(200, 225, 250, 0.85 * fl * gl.a))); ctx.shadowBlur = 5; } /* le compte à rebours, en chiffre D'ni */
    else if (wonSign) { const c = HC[wonSign]; ctx.shadowColor = rgba(c[0], c[1], c[2], fl); ctx.shadowBlur = wonSign === "beetle" ? 0 : 10; const gl = glitchOf(t, 22); glitchy(ctx, cx, cy, 30, gl, 22, (dx) => anySign(ctx, wonSign, cx + dx, cy, 30, wonSign === "beetle" ? c : up(c, 60), 0.95 * fl * gl.a, true)); ctx.shadowBlur = 5; } /* le signe qui gagne la manche */
    else if (fam && typeof document !== "undefined") { const m = inkMid(r, fam); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = rgba(190, 215, 245, 0.85 * fl); paintGlyph(ctx, fam, cx - m.mx, cy - m.my); } /* le glyphe, en lettres D'ni ; sans police D'ni, l'anneau reste vide en son cœur */
    for (const k of AH.SIGNS) { const a = pos[k], x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, c = HC[k]; ctx.shadowColor = rgba(c[0], c[1], c[2], 0.8 * fl); ctx.shadowBlur = k === "beetle" ? 0 : 6; anySign(ctx, k, x, y, k === "beetle" ? 16.5 : 17, k === "beetle" ? c : up(c, 40), 0.9 * fl, true); }
    ctx.restore();
    r.hot.push({ x: cx - R - 16, y: cy - R - 16, w: 2 * R + 32, h: 2 * R + 32, tip: T("ahy.rules"), ...(reveal ? { ahy: { next: true } } : {}) }); }
  /* ma place, devant : mes trois projecteurs ; au survol, le signe se lève ; joué, il reste levé */
  AH.SIGNS.forEach((k, i) => { const [x, y] = MINE(i), picked = G.me.play === k, posed = clk && clk.mine === k;
    emitter(ctx, x, y, 13, HC[k], !reveal ? hov === k || posed : picked);
    if (!reveal && clk && clk.mine) { if (posed) holo(ctx, k, x, y, 18, 0.6, t, 9); else { ctx.save(); ctx.translate(x, y); ctx.scale(1, k === "beetle" ? 0.5 : 0.45); anySign(ctx, k, 0, 0, k === "beetle" ? 8.5 : 10, HC[k], 0.3, false); ctx.restore(); } }
    else if (!reveal) { if (hov === k) holo(ctx, k, x, y, 18, 0.8, t, 9); else { ctx.save(); ctx.translate(x, y); ctx.scale(1, k === "beetle" ? 0.5 : 0.45); anySign(ctx, k, 0, 0, k === "beetle" ? 8.5 : 10, HC[k], 0.8, false); ctx.restore(); } r.hot.push({ x: x - 17, y: y - 30, w: 34, h: 42, tip: T("ahy.sign." + k), ahy: { sign: k } }); }
    else if (picked) { if (isWin(0)) winMark(ctx, x, y, 13, t); holo(ctx, k, x, y, isWin(0) ? 28 : 22, isWin(0) ? 1 : anyWin ? 0.28 : 0.8, t, 0); } });
  tally(ctx, 480, 292, 9, G.me.won);
  if (reveal && G.me.pts != null) numeral(ctx, G.me.pts, 238, 256, 16, G.me.pts > 0 ? "#ffcf7a" : G.me.pts < 0 ? "#b0846a" : "#c99a52", G.me.pts < 0);
  /* devant moi, à droite : le bouton de bronze (une partie neuve, et sa première manche part) ; à gauche, le cadran du niveau */
  { const x = 404, y = 258, pr = st.press && nowMs - st.press < 180 ? 2 : 0, glow = idle && G.round === 0 ? 0.5 + 0.5 * Math.sin(t * 3) : 0;
    ctx.fillStyle = rgba(0, 0, 0, 0.45); ctx.beginPath(); ctx.ellipse(x + 2, y + 6, 15, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#3a2a16"; ctx.beginPath(); ctx.ellipse(x, y + 3, 14, 5.5, 0, 0, TAU); ctx.fill(); /* le socle */
    if (glow) { const g = ctx.createRadialGradient(x, y, 2, x, y, 20); g.addColorStop(0, rgba(255, 200, 120, 0.35 * glow)); g.addColorStop(1, rgba(255, 180, 100, 0)); ctx.fillStyle = g; ctx.fillRect(x - 20, y - 20, 40, 40); } /* au repos, il appelle doucement la main */
    const g = ctx.createRadialGradient(x - 4, y - 3 + pr, 1, x, y + pr, 12); g.addColorStop(0, "#e9c27a"); g.addColorStop(0.6, "#a8783a"); g.addColorStop(1, "#5a3c1a"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + pr, 11, 4.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#6a4a20"; ctx.fillRect(x - 11, y + pr, 22, 3 - pr); ctx.beginPath(); ctx.ellipse(x, y + 3, 11, 4.6, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = rgba(60, 36, 12, 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y + pr, 5, 2.1, 0, 0, TAU); ctx.stroke(); /* le cercle gravé */
    r.hot.push({ x: x - 15, y: y - 10, w: 30, h: 20, tip: T(G.round === 0 && !clk ? "ahy.button.start" : "ahy.button.new"), ahy: { start: true } }); }
  { const x = 196, y = 262, s = cur(r), L = ["easy", "mid", "hard", "rank"], li = L.indexOf(s.level), lv = s.level === "rank" ? T("ahy.lvl.rank", { n: s.rank, l: T("ahy.lvl." + AH.levelOf("rank", s.rank)) }) : T("ahy.lvl." + s.level);
    ctx.fillStyle = rgba(0, 0, 0, 0.45); ctx.beginPath(); ctx.ellipse(x + 2, y + 4, 17, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#4a3418"; ctx.beginPath(); ctx.ellipse(x, y + 2, 16, 6.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#8e6430"; ctx.beginPath(); ctx.ellipse(x, y, 16, 6.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#c99a52"; ctx.lineWidth = 1; ctx.stroke(); /* le cadran */
    for (let i = 0; i < 4; i++) { const a = Math.PI + (i / 3) * Math.PI, on = i === li; ctx.fillStyle = on ? "#ffd890" : rgba(40, 26, 10, 0.8); ctx.beginPath(); ctx.arc(x + Math.cos(a) * 12.5, y + Math.sin(a) * 5, on ? 1.8 : 1.3, 0, TAU); ctx.fill(); } /* quatre crans : facile, moyen, difficile, selon le rang */
    const a = Math.PI + (li / 3) * Math.PI; ctx.strokeStyle = "#2a1a08"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 3.6); ctx.stroke(); ctx.lineCap = "butt"; /* l'aiguille */
    ctx.fillStyle = "#c99a52"; ctx.beginPath(); ctx.ellipse(x, y, 3, 1.4, 0, 0, TAU); ctx.fill();
    r.hot.push({ x: x - 18, y: y - 10, w: 36, h: 20, tip: T("ahy.dial", { l: lv }), ahy: { level: true } }); }
  require("./relto-atelier").backButton(r, ctx, T(st.from === "desk" ? "ahy.back.desk" : "ahy.back.serre"), st.from === "desk" ? "desk" : "serre");
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; /* remis comme ailleurs : l'infobulle s'écrit à gauche */
  void sc; void sky;
}

/* ---- dans les pièces ---- */
/** Dans la serre (l'accord) : la table de pierre à cinq branches, au fond de l'allée, son anneau qui luit à peine. */
function inSerre(r, ctx, t, night) {
  const x = 330, y = 272, s = 0.2, T = TR(r);
  ctx.save(); ctx.translate(x, y); ctx.scale(1.25, 1.25);
  ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.beginPath(); ctx.ellipse(3, 14, 34, 6, 0, 0, TAU); ctx.fill(); /* l'ombre */
  ctx.fillStyle = "#4a3e32"; ctx.fillRect(-6, -2, 12, 15); ctx.fillStyle = "#3a3028"; ctx.beginPath(); ctx.ellipse(0, 13, 12, 3, 0, 0, TAU); ctx.fill(); /* le pied */
  const poly = (rx, ry, dy) => { ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * TAU / 5, b = a + TAU / 10, a2 = a + TAU / 5, Q = (ang, f) => [Math.cos(ang) * rx * f, dy + Math.sin(ang) * ry * f]; const tip = Q(a, 1), v = Q(b, 0.5), tip2 = Q(a2, 1), c1 = Q(a + TAU / 20, 0.66), c2 = Q(b + TAU / 20, 0.66); if (!k) ctx.moveTo(...tip); ctx.quadraticCurveTo(...c1, ...v); ctx.quadraticCurveTo(...c2, ...tip2); } ctx.closePath(); };
  ctx.fillStyle = "#2c2118"; poly(RX * s * 0.62, RY * s * 0.42, 2.5); ctx.fill(); /* la tranche */
  ctx.fillStyle = "#6a5644"; poly(RX * s * 0.62, RY * s * 0.42, 0); ctx.fill(); ctx.strokeStyle = "#b07c3c"; ctx.lineWidth = 1; ctx.stroke(); /* le plateau, cerclé de bronze */
  const fl = 0.75 + 0.25 * Math.sin(t * 1.7), gl = ctx.createRadialGradient(0, -1, 0, 0, -1, 10); gl.addColorStop(0, rgba(170, 205, 235, (0.45 + 0.3 * night) * fl)); gl.addColorStop(1, rgba(120, 170, 220, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(0, -1, 10, 4, 0, 0, TAU); ctx.fill(); /* la vasque */
  ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = rgba(150, 185, 225, (0.22 + 0.25 * night) * fl); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -11, 7, 0, TAU); ctx.stroke(); /* l'anneau, debout */
  for (const [k, dx, dy] of [["beetle", 0, -18], ["page", -6, -7], ["pen", 6, -7]]) { const c = HC[k]; ctx.fillStyle = rgba(c[0], c[1], c[2], (0.35 + 0.3 * night) * fl); ctx.beginPath(); ctx.arc(dx, dy, 1.1, 0, TAU); ctx.fill(); }
  ctx.restore();
  r.hot.push({ x: x - 36, y: y - 30, w: 72, h: 48, tip: T("ahy.table"), go: "ahyoheek" }); r.ahy = { ...(r.ahy || {}), from: "serre" };
}
/** Sur le bureau (le commandement) : la même table, en réduction, sur un socle de laiton, à gauche du livre. c : la teinte de la pièce. */
function onDesk(r, ctx, c, t) {
  const x = 46, y = 322, T = TR(r);
  ctx.save(); ctx.translate(x, y); ctx.scale(1.35, 1.35);
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.ellipse(3, 9, 30, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = c("#5a3c1e"); ctx.beginPath(); ctx.ellipse(0, 6, 26, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = c("#b08a3a"); ctx.beginPath(); ctx.ellipse(0, 3, 26, 6, 0, 0, TAU); ctx.fill(); /* le socle */
  const poly = (rx, ry, dy) => { ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * TAU / 5, b = a + TAU / 10, a2 = a + TAU / 5, Q = (ang, f) => [Math.cos(ang) * rx * f, dy + Math.sin(ang) * ry * f]; const tip = Q(a, 1), v = Q(b, 0.5), tip2 = Q(a2, 1), c1 = Q(a + TAU / 20, 0.66), c2 = Q(b + TAU / 20, 0.66); if (!k) ctx.moveTo(...tip); ctx.quadraticCurveTo(...c1, ...v); ctx.quadraticCurveTo(...c2, ...tip2); } ctx.closePath(); };
  ctx.fillStyle = c("#2c2118"); poly(24, 9, 1.5); ctx.fill(); ctx.fillStyle = c("#5e4c3a"); poly(24, 9, -1); ctx.fill(); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 0.9; ctx.stroke();
  const fl = 0.75 + 0.25 * Math.sin(t * 1.7); ctx.globalCompositeOperation = "lighter";
  const gl = ctx.createRadialGradient(0, -1, 0, 0, -1, 8); gl.addColorStop(0, rgba(170, 205, 235, 0.5 * fl)); gl.addColorStop(1, rgba(120, 170, 220, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(0, -1, 8, 3, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(150, 185, 225, 0.4 * fl); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -9, 6, 0, TAU); ctx.stroke();
  for (const [k, dx, dy] of [["beetle", 0, -15], ["page", -5, -6], ["pen", 5, -6]]) { const cc = HC[k]; ctx.fillStyle = rgba(cc[0], cc[1], cc[2], 0.55 * fl); ctx.beginPath(); ctx.arc(dx, dy, 1, 0, TAU); ctx.fill(); }
  ctx.restore();
  r.hot.push({ x: x - 40, y: y - 30, w: 80, h: 46, tip: T("ahy.table"), go: "ahyoheek" }); r.ahy = { ...(r.ahy || {}), from: "desk" };
}

module.exports = { drawGame, inSerre, onDesk, act, state, GLYPH, HC };
