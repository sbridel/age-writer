"use strict";
/**
 * Baykh, le jeu des routes du salon : la table basse devant le canapé (dans le salon), et la vue de la partie (vue `baykh`).
 * Les règles et l'adversaire sont dans `src/baykh.js`. Tout se joue sans texte :
 *  - le cadran au bord de la table : la taille (3 à 8, en chiffres D'ni) ; le bouton de bronze : une partie neuve ;
 *  - au début, toucher une réserve choisit sa couleur (les claires commencent toujours) ;
 *  - toucher une case vide y pose une Voie ; toucher d'abord sa réserve redresse la pièce en Verrou ; toucher sa Clef de voûte la prend ;
 *  - toucher une pile qu'on tient la prend (toucher encore : une pièce de moins), puis toucher les cases en ligne pour semer ;
 *  - le coffret : sa Clef de voûte (la statuette, l'abeille, la main, l'aiguille D'ni gothique) ; la machine prend la sienne au hasard ;
 *  - quatre plots : le niveau (facile, moyen, difficile, ou selon le rang).
 * Les pièces suivent l'habit du salon : la pierre (par défaut), le verre et le cuivre (la Verrière : ambre contre vert d'eau),
 * l'ivoire, l'ébène et l'or en octogones (le Château). Règles d'après le Tak de James Ernest et Patrick Rothfuss.
 */
const B = require("./baykh");
const { rgba, mix } = require("./util");
const W = 640, H = 360, TAU = Math.PI * 2;
const CAPS = ["robe", "bee", "hand", "needle"];
const LEVELS = ["easy", "mid", "hard", "rank"];
const T = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const levelOf = (s) => (s.level === "rank" ? (s.rank >= 6 ? "hard" : s.rank >= 3 ? "mid" : "easy") : s.level);

/* ---------------------------------------------------------------- l'état ---------------------------------------------------------------- */
function saved(r) {
  const s = (r.opts && r.opts.baykhState && r.opts.baykhState()) || {};
  return { n: [3, 4, 5, 6, 7, 8].includes(s.n) ? s.n : 5, side: s.side === 1 ? 1 : 0, cap: CAPS.includes(s.cap) ? s.cap : "robe", level: LEVELS.includes(s.level) ? s.level : "mid",
    rank: Math.max(0, s.rank | 0), log: Array.isArray(s.log) ? s.log.slice(0, 40) : [] };
}
function cur(r) { return r._bkSaved || saved(r); }
function save(r, patch) { const s = { ...cur(r), ...patch }; r._bkSaved = s; if (r.opts && r.opts.onBaykh) r.opts.onBaykh(s); return s; }
function snd(r, k) { if (r.opts && r.opts.onAhySound) try { r.opts.onAhySound(k); } catch (e) { /* rien */ } }
function state(r) {
  if (!r.bk || !r.bk.G) { const s = cur(r); r.bk = { ...(r.bk || {}), G: B.newGame(s.n), sel: null, hand: null, botCap: CAPS[Math.floor(Math.random() * CAPS.length)], started: false }; }
  return r.bk;
}
function fresh(r) { const s = cur(r), st = state(r); st.G = B.newGame(s.n); st.sel = null; st.hand = null; st.started = false; st.botCap = CAPS[Math.floor(Math.random() * CAPS.length)]; st.done = false; }
/** Après mon coup, ou au départ si je joue les sombres : la machine réfléchit un instant, puis joue. */
function botTurn(r) {
  const st = state(r), s = cur(r); if (st.G.end || st.G.turn === s.side || st.thinking) return;
  st.thinking = true; const G0 = st.G;
  setTimeout(() => { st.thinking = false; if (st.G !== G0 || st.G.end) return; const m = B.think(st.G, levelOf(s)); if (!m) return; st.G = B.apply(st.G, m); st.lastBot = { m, at: Date.now() }; snd(r, "set"); settle(r); if (r.draw && !r.running) r.draw(0); }, 520);
}
/** La fin : le registre, le rang. */
function settle(r) {
  const st = state(r), G = st.G; if (!G.end || st.done) return; st.done = true; const s = cur(r), won = G.end.win === s.side;
  snd(r, won ? "game" : G.end.win === -1 ? "lose" : "gameLost");
  const log = [{ at: Date.now(), n: G.n, level: s.level, won, draw: G.end.win === -1, by: G.end.by }, ...s.log].slice(0, 40);
  save(r, { log, rank: won ? s.rank + 1 : s.rank });
}
function play(r, mv) {
  const st = state(r); if (!B.legal(st.G, mv)) { snd(r, "lose"); return false; }
  st.G = B.apply(st.G, mv); st.sel = null; st.hand = null; st.started = true; snd(r, "set"); settle(r); botTurn(r); return true;
}

/** Où peut aller la prochaine pièce de la main : la case où l'on est (on y en laisse une de plus), ou la suivante en ligne (libre, ou un Verrou
 *  si l'on ne porte plus que sa Clef). Au premier pas, les quatre voisines. */
function nextCells(G, h) {
  const n = G.n, left = h.take - h.drops.reduce((p, q) => p + q, 0); if (left <= 0) return [];
  const src = G.board[h.from], hand = src.slice(src.length - h.take), carried = hand.slice(hand.length - left), capOnly = left === 1 && carried[0].k === "c";
  const out = []; if (h.drops.length) out.push(h.pos);
  const px = h.pos % n, py = (h.pos / n) | 0;
  for (let d = 0; d < 4; d++) { if (h.d != null && d !== h.d) continue; const [dx, dy] = B.DIRS[d], X = px + dx, Y = py + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
    const j = Y * n + X, tp = B.top(G, j); if (!tp || tp.k === "f" || (tp.k === "w" && capOnly)) out.push(j); }
  return out;
}
/** La partie telle qu'elle serait avec la main en cours : les piles semées, et ce qui reste en main (au-dessus de la case où l'on est). */
function preview(G, h) {
  const board = G.board.map((s2) => s2.slice()), src = board[h.from], hand = src.splice(src.length - h.take, h.take), n = G.n;
  let x = h.from % n, y = (h.from / n) | 0;
  h.drops.forEach((k) => { const [dx, dy] = B.DIRS[h.d]; x += dx; y += dy; const pos = y * n + x, dst = board[pos], tp = dst[dst.length - 1]; if (tp && tp.k === "w") dst[dst.length - 1] = { ...tp, k: "f" }; dst.push(...hand.splice(0, k)); });
  return { board, floating: hand, at: h.drops.length ? h.pos : h.from };
}
/** Ce que fait un clic sur la vue (la zone porte `baykh: {...}`). */
function act(r, a) {
  const st = state(r), s = cur(r), G = st.G, n = G.n, mine = G.turn === s.side && !G.end && !st.thinking;
  if (a.side != null) { if (!st.started && G.ply === 0) { if (a.side !== s.side) { save(r, { side: a.side }); snd(r, "join"); } st.started = true; botTurn(r); return; }
    if (a.side === s.side && mine) { if (G.ply < 2) { st.sel = "f"; return; } if (G.res[s.side].s <= 0) return; st.sel = st.sel === "w" ? null : "w"; st.hand = null; snd(r, "tick"); } return; } /* la réserve : la prochaine pièce posée sera un Verrou (ou de nouveau une Voie) */
  if (a.capPick) { if (mine && G.ply >= 2 && G.res[s.side].c > 0) { st.sel = st.sel === "c" ? null : "c"; st.hand = null; snd(r, "tick"); } return; }
  if (a.box) { if (!st.started || G.end || G.ply === 0) { save(r, { cap: CAPS[(CAPS.indexOf(s.cap) + 1) % CAPS.length] }); snd(r, "tick"); } return; }
  if (a.dial) { if (!st.started || G.end || G.ply === 0) { save(r, { n: s.n >= 8 ? 3 : s.n + 1 }); fresh(r); snd(r, "tick"); } return; }
  if (a.fresh) { fresh(r); snd(r, "leave"); return; }
  if (a.confirm) { const h = st.hand; if (h && h.drops.length && h.take === h.drops.reduce((p, q) => p + q, 0)) { if (!play(r, { t: "m", i: h.from, d: h.d, drops: h.drops.slice() })) st.hand = null; } return; }
  if (a.cancel) { st.hand = null; snd(r, "leave"); return; }
  if (a.level != null) { if (!st.started || G.end || G.ply === 0) { save(r, { level: LEVELS[a.level] }); snd(r, "tick"); } return; }
  if (a.cell == null || !mine) return;
  if (!st.started) { st.started = true; } /* toucher le plateau, c'est jouer les claires : on commence */
  const i = a.cell, x = i % n, y = (i / n) | 0, stack = G.board[i], top = stack[stack.length - 1];
  if (st.hand) { /* on sème la pile prise : chaque toucher pose une pièce ; rien n'est joué avant la confirmation */
    const h = st.hand, left = h.take - h.drops.reduce((p, q) => p + q, 0);
    if (i === h.from && h.drops.length === 0) { h.take = h.take > 1 ? h.take - 1 : Math.min(n, stack.length); snd(r, "tick"); return; } /* toucher encore la pile : une pièce de moins */
    if (i === h.from) { st.hand = null; snd(r, "leave"); return; } /* revenir à la pile : on repose tout */
    const nx = nextCells(G, h); if (left <= 0 || !nx.includes(i)) { snd(r, "lose"); return; }
    if (i === h.pos) h.drops[h.drops.length - 1]++; else { h.d = B.DIRS.findIndex(([a2, b2]) => a2 === x - (h.pos % n) && b2 === y - ((h.pos / n) | 0)); h.pos = i; h.drops.push(1); }
    snd(r, "tick"); return;
  }
  if (!stack.length) { if (G.ply < 2) { play(r, { t: "p", i, k: "f" }); return; } play(r, { t: "p", i, k: st.sel || "f" }); return; } /* une case vide : une Voie, sauf si l'on a redressé un Verrou ou pris sa Clef */
  if (top.p === s.side && G.ply >= 2) { st.hand = { from: i, pos: i, take: Math.min(n, stack.length), d: null, drops: [] }; st.sel = null; snd(r, "tick"); }
}

/* ---------------------------------------------------------------- les habits ---------------------------------------------------------------- */
/* les couleurs du Château (choix de l'auteur) : le bordeaux des tentures contre le bleu nuit, le filet d'or */
const CASTLE_C = [["#8a2838", "#661a28", "#40101a"], ["#2a3f7a", "#1c2c5a", "#101a3a"]];
function habit(r) {
  if (r.castleOn && r.castleOn()) return { kind: "castle", bg: ["#2a0e1c", "#12060c"], rim: ["#7a5a1a", "#f0cc6a", "#6a4a10"], sq: ["#d8d2c6", "#b9b2a4"], line: "rgba(80,60,40,.5)",
    C: CASTLE_C, table: "#3a2414", shape: "oct", fil: "#e8c060" };
  if (r.glassOn && r.glassOn()) return { kind: "glass", bg: ["#14221c", "#0a120e"], rim: ["#5a2e12", "#c87a3a", "#4a2410"], sq: ["rgba(190,215,205,.62)", "rgba(160,190,180,.56)"], line: "rgba(120,70,30,.75)",
    C: [["rgba(236,178,84,.95)", "rgba(204,144,56,.96)", "rgba(160,104,30,.96)"], ["rgba(96,176,160,.95)", "rgba(62,138,124,.96)", "rgba(36,96,86,.96)"]], table: "#3a2416", shape: "square", fil: "#c87a3a" };
  return { kind: "stone", bg: ["#2a1c12", "#140d08"], rim: ["#6a4a1c", "#c99a52", "#5a3c14"], sq: ["#8a8272", "#7c7466"], line: "rgba(30,22,14,.55)",
    C: [["#e6e0cf", "#c8c0aa", "#a8a08a"], ["#3a3e44", "#26292e", "#16181b"]], table: "#4b3220", shape: "square", fil: null };
}

/* ---------------------------------------------------------------- la géométrie ---------------------------------------------------------------- */
/** Le plateau en légère perspective : (u, v) dans [0, 1]² → l'écran ; z en largeurs de case. */
function frame(n, o = {}) {
  const cx = o.cx || 320, top = o.top || 58, bot = o.bot || 300, wT = o.wT || 250, wB = o.wB || 370;
  const P = (u, v) => { const y = top + (bot - top) * v, hw = (wT + (wB - wT) * v) / 2; return [cx - hw + 2 * hw * u, y]; };
  const cellW = (v) => (wT + (wB - wT) * v) / n, P3 = (u, v, z) => { const [x, y] = P(u, v); return [x, y - z * cellW(v)]; };
  return { n, P, P3, cellW, top, bot, cx, wT, wB };
}
const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
const area = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const SHAPE = (oct, r) => (oct ? [...Array(8)].map((_, k) => { const a = Math.PI / 8 + k * TAU / 8, R = r / Math.cos(Math.PI / 8); return [Math.cos(a) * R, Math.sin(a) * R]; }) : [[-r, -r], [r, -r], [r, r], [-r, r]]);

/** Une pièce en volume : couchée (la forme à plat, épaisse de t) ou debout (la même forme dressée, de biais) ; seules les faces tournées vers nous sont peintes. */
function piece(ctx, F, Hb, i, j, p, { stand = false, lvl = 0, hi = 0 } = {}) {
  const { n } = F, col = Hb.C[p], r = 0.36, t = 0.13, cu = (i + 0.5) / n, cv = (j + 0.5) / n, sh = SHAPE(Hb.shape === "oct", r), z0 = lvl * t;
  const toUV = (du, dv) => [cu + du / n, cv + dv / n];
  let A, Bf;
  if (!stand) { A = sh.map(([a, b]) => [...toUV(a, b), z0]); Bf = sh.map(([a, b]) => [...toUV(a, b), z0 + t]); }
  else { const th = Math.PI / 4, d = [Math.cos(th), Math.sin(th)], nn = [-Math.sin(th), Math.cos(th)];
    const at = (a, b, s) => [...toUV(a * d[0] + s * nn[0], (a * d[1] + s * nn[1]) * 0.9), z0 + (b + r)];
    A = sh.map(([a, b]) => at(a, -b, -t / 2)); Bf = sh.map(([a, b]) => at(a, -b, t / 2)); }
  const pr = (q) => F.P3(...q), c0 = F.P(cu, cv);
  if (lvl < 0.5) ctx.fillStyle = "rgba(0,0,0,.28)", poly(ctx, (stand ? [...A, ...Bf] : A).map(([u, v]) => { const [x, y] = F.P(u, v); return [x + 3, y + 3]; }).sort((a, b) => Math.atan2(a[1] - c0[1], a[0] - c0[0]) - Math.atan2(b[1] - c0[1], b[0] - c0[0]))), ctx.fill(); /* l'ombre, seulement au sol */
  const k = sh.length, sgn = Math.sign(area(Bf.map(pr))) || 1;
  for (let q = 0; q < k; q++) { const f = [A[q], A[(q + 1) % k], Bf[(q + 1) % k], Bf[q]].map(pr); if (Math.sign(area(f)) !== sgn) continue; poly(ctx, f); ctx.fillStyle = col[2]; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = 0.5; ctx.stroke(); }
  for (const [face, fill] of [[A.map(pr).reverse(), col[1]], [Bf.map(pr), col[0]]]) {
    if (Math.sign(area(face)) !== sgn) continue; poly(ctx, face); ctx.fillStyle = fill; ctx.fill();
    if (Hb.kind === "glass") { ctx.strokeStyle = Hb.fil; ctx.lineWidth = 1.1; ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.arc(face[0][0] * 0.78 + face[2][0] * 0.22, face[0][1] * 0.78 + face[2][1] * 0.22, 1.6, 0, TAU); ctx.fill(); }
    if (Hb.kind === "castle") { const m = face.reduce((s, q) => [s[0] + q[0] / face.length, s[1] + q[1] / face.length], [0, 0]); poly(ctx, face.map(([x, y]) => [m[0] + (x - m[0]) * 0.72, m[1] + (y - m[1]) * 0.72])); ctx.strokeStyle = Hb.fil; ctx.lineWidth = 0.9; ctx.stroke(); }
    if (Hb.kind === "stone") { ctx.strokeStyle = p ? "rgba(255,255,255,.07)" : "rgba(120,100,70,.28)"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(...face[0]); ctx.lineTo(...face[Math.floor(face.length / 2)]); ctx.stroke(); }
  }
  if (hi) { const face = Bf.map(pr); poly(ctx, face); ctx.fillStyle = rgba(255, 214, 130, 0.35 * hi); ctx.fill(); }
}

/** La Clef de voûte : quatre modèles, de la couleur du joueur. */
function capstone(ctx, F, Hb, i, j, p, kind, lvl = 0, hi = 0) {
  const { n } = F, cu = (i + 0.5) / n, cv = (j + 0.55) / n, [x, y0] = F.P(cu, cv), y = y0 - lvl * 0.13 * F.cellW(cv), s = F.cellW(cv) / 26, col = Hb.C[p];
  const lin = (x0, x1, st) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); st.forEach((k, q) => g.addColorStop(q / (st.length - 1), k)); return g; };
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + 3, y + 3, 9 * s, 3.2 * s, 0, 0, TAU); ctx.fill();
  if (hi) { const g = ctx.createRadialGradient(x, y - 14 * s, 1, x, y - 14 * s, 20 * s); g.addColorStop(0, rgba(255, 214, 130, 0.4 * hi)); g.addColorStop(1, rgba(255, 214, 130, 0)); ctx.fillStyle = g; ctx.fillRect(x - 20 * s, y - 34 * s, 40 * s, 40 * s); }
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (kind === "robe") { /* la statuette en robe à capuchon, liseré d'or, sur un socle carré */
    ctx.fillStyle = col[1]; ctx.fillRect(-7, -3, 14, 3); ctx.fillStyle = col[0]; ctx.fillRect(-7, -4.5, 14, 1.6);
    const g = lin(-6, 6, [col[2], col[0], col[1], col[2]]); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(-4.6, -12, -3.4, -17); ctx.lineTo(3.4, -17); ctx.quadraticCurveTo(4.6, -12, 6, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(0, -11.4, 3.9, 1.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-3.6, -16.6); ctx.quadraticCurveTo(-4.2, -23.5, 0, -24.2); ctx.quadraticCurveTo(4.2, -23.5, 3.6, -16.6); ctx.quadraticCurveTo(0, -15.4, -3.6, -16.6); ctx.fill();
    ctx.fillStyle = "#1a160f"; ctx.beginPath(); ctx.ellipse(0, -19.4, 1.9, 2.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#e8c06a"; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-5.7, -4.2); ctx.quadraticCurveTo(0, -2.7, 5.7, -4.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3.5, -16.8); ctx.quadraticCurveTo(-3.9, -23.1, 0, -23.7); ctx.quadraticCurveTo(3.9, -23.1, 3.5, -16.8); ctx.stroke(); }
  else if (kind === "bee" || kind === "hand") { /* les lampes de l'auteur, sur leur pilier ; le verre de la couleur du joueur */
    ctx.fillStyle = "#3e4844"; ctx.fillRect(-3, -5, 6, 5); ctx.fillStyle = "#5c6862"; ctx.fillRect(-4, -6.4, 8, 1.6);
    const tint = Hb.kind === "glass" ? (p ? [96, 176, 160] : [236, 178, 84]) : p ? [110, 120, 150] : [244, 200, 140];
    require("./relto-ahyoheek").lampGlass(ctx, kind === "bee" ? "oval" : "rays", tint, -5.2, 1); }
  else { /* l'aiguille D'ni gothique : une ogive, deux filets de laiton, un cœur poli, un petit glyphe à la base */
    ctx.fillStyle = lin(-9, 9, [col[2], col[0], col[1], col[2]]); /* la couleur du joueur (obsidienne ou pierre claire par défaut) */
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-8, -7); ctx.quadraticCurveTo(-7, -21, 0, -35); ctx.quadraticCurveTo(7, -21, 8, -7); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#d8b050"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(8, -7); ctx.stroke();
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 5.3, -7); ctx.quadraticCurveTo(d * 4.8, -18, 0, -30); ctx.stroke(); }
    ctx.fillStyle = col[0]; ctx.beginPath(); ctx.moveTo(-2.6, -8); ctx.quadraticCurveTo(-2.6, -18, 0, -24); ctx.quadraticCurveTo(2.6, -18, 2.6, -8); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fill(); /* le cœur poli : la couleur, éclaircie */
    ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, -3.6, 2.1, Math.PI * 0.15, Math.PI * 1.85); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-2.6, -1.3); ctx.lineTo(2.6, -1.3); ctx.stroke(); }
  ctx.restore();
}

/** Un chiffre D'ni (0 à 24) gravé : le cadre, les traits de 1 à 4, les cinq, dix, quinze, vingt (dessin du plugin). */
function numeral(ctx, v, x, y, s, col) { try { return require("./relto-ahyoheek").numeral ? require("./relto-ahyoheek").numeral(ctx, v, x, y, s, col) : null; } catch (e) { return null; } }

/* ---------------------------------------------------------------- la vue ---------------------------------------------------------------- */
function drawBaykh(r, ctx, sc, sky, t) {
  const st = state(r), s = cur(r), G = st.G, n = G.n, Hb = habit(r), F = frame(n), me = s.side, bot = 1 - me, now = Date.now(), tr = T(r);
  const hv = (id) => r.hover && r.hover.baykh && r.hover.baykh.id === id;
  /* le fond : le salon, sombre, la table basse vue de près */
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, Hb.bg[0]); bg.addColorStop(1, Hb.bg[1]); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const lamp = ctx.createRadialGradient(320, 40, 10, 320, 40, 360); lamp.addColorStop(0, "rgba(255,200,130,.16)"); lamp.addColorStop(1, "rgba(255,200,130,0)"); ctx.fillStyle = lamp; ctx.fillRect(0, 0, W, H);
  const quad = (a, b2, c2, d2) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b2); ctx.lineTo(...c2); ctx.lineTo(...d2); ctx.closePath(); };
  ctx.fillStyle = Hb.table; quad(F.P(-0.2, 1.2), F.P(1.2, 1.2), F.P(1.18, -0.14), F.P(-0.18, -0.14)); ctx.fill(); /* le plateau de la table */
  ctx.fillStyle = "rgba(0,0,0,.35)"; quad(F.P(-0.2, 1.2), F.P(1.2, 1.2), [F.P(1.2, 1.2)[0], F.P(1.2, 1.2)[1] + 10], [F.P(-0.2, 1.2)[0], F.P(-0.2, 1.2)[1] + 10]); ctx.fill();
  /* la grille et son bord */
  const rg = ctx.createLinearGradient(F.P(-0.05, 0)[0], 0, F.P(1.05, 0)[0], 0); Hb.rim.forEach((k, q) => rg.addColorStop(q / 2, k)); ctx.fillStyle = rg; quad(F.P(-0.05, 1.05), F.P(1.05, 1.05), F.P(1.05, -0.05), F.P(-0.05, -0.05)); ctx.fill();
  const road = G.end && G.end.by === "road" ? new Set(G.end.path) : null, glow = 0.6 + 0.4 * Math.sin(t * 3);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = j * n + i; quad(F.P(i / n, j / n), F.P((i + 1) / n, j / n), F.P((i + 1) / n, (j + 1) / n), F.P(i / n, (j + 1) / n)); ctx.fillStyle = Hb.sq[(i + j) % 2]; ctx.fill(); ctx.strokeStyle = Hb.line; ctx.lineWidth = Hb.kind === "glass" ? 1.4 : 0.9; ctx.stroke();
    if (hv("c" + k) || (st.hand && st.hand.from === k)) { ctx.fillStyle = "rgba(255,220,150,.18)"; ctx.fill(); }
    if (road && road.has(k)) { ctx.fillStyle = rgba(255, 210, 120, 0.28 * glow); ctx.fill(); }
    if (st.lastBot && now - st.lastBot.at < 1600 && (st.lastBot.m.i === k)) { ctx.fillStyle = rgba(150, 200, 255, 0.22 * (1 - (now - st.lastBot.at) / 1600)); ctx.fill(); } /* là où la machine vient de jouer */
    const a = F.P(i / n, j / n), b2 = F.P((i + 1) / n, (j + 1) / n); r.hot.push({ x: a[0], y: a[1], w: b2[0] - a[0], h: b2[1] - a[1], baykh: { cell: k, id: "c" + k } });
  }
  /* les pièces, du fond vers l'avant ; la pile prise en main est soulevée */
  const hand = st.hand, pv = hand ? preview(G, hand) : null, board = pv ? pv.board : G.board, nx = hand ? new Set(nextCells(G, hand)) : null;
  if (nx) for (const k of nx) { const i = k % n, j = (k / n) | 0, pulse = 0.55 + 0.45 * Math.sin(t * 5); quad(F.P(i / n, j / n), F.P((i + 1) / n, j / n), F.P((i + 1) / n, (j + 1) / n), F.P(i / n, (j + 1) / n)); ctx.fillStyle = rgba(255, 214, 130, 0.22 * pulse); ctx.fill(); ctx.strokeStyle = rgba(255, 214, 130, 0.6 * pulse); ctx.lineWidth = 1.4; ctx.stroke(); } /* où la pièce suivante peut aller */
  const towers = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, stack = board[k];
    stack.forEach((pc, l) => {
      const hi = road && road.has(k) && l === stack.length - 1 ? glow : 0;
      if (pc.k === "c") capstone(ctx, F, Hb, i, j, pc.p, pc.p === me ? s.cap : st.botCap, l, hi);
      else piece(ctx, F, Hb, i, j, pc.p, { stand: pc.k === "w", lvl: l, hi });
    });
    if (pv && pv.at === k) pv.floating.forEach((pc, l) => { const lv = stack.length + 1.6 + l; if (pc.k === "c") capstone(ctx, F, Hb, i, j, pc.p, pc.p === me ? s.cap : st.botCap, lv, 0.8); else piece(ctx, F, Hb, i, j, pc.p, { stand: pc.k === "w", lvl: lv, hi: 0.8 }); }); /* ce qui reste en main, soulevé */
    if (stack.length > 1) { const [x0, y0] = F.P(i / n, j / n), [x1, y1] = F.P((i + 1) / n, (j + 1) / n), up = stack.length * 0.13 * F.cellW((j + 0.5) / n); towers.push({ x: x0, y: y0 - up, w: x1 - x0, h: y1 - y0 + up, baykh: { cell: k, id: "c" + k } }); }
  }
  r.hot.push(...towers); /* une tour se touche sur toute sa hauteur, pas seulement à son pied */
  /* pendant qu'on sème : deux boutons à fleur, au bord avant — l'ambre joue le coup (quand la main est vide), le bronze repose tout */
  if (hand) { const fy = F.P(0.5, 1.12)[1] + 4, done = hand.drops.length && hand.take === hand.drops.reduce((p, q) => p + q, 0);
    for (const [bx, kind] of [[300, "confirm"], [340, "cancel"]]) { const on = kind === "cancel" || done, pulse = kind === "confirm" && done ? 0.7 + 0.3 * Math.sin(t * 5) : 1;
      ctx.fillStyle = "#2a1a0c"; ctx.beginPath(); ctx.ellipse(bx, fy, 11, 4.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = kind === "confirm" ? (on ? rgba(255, 196, 96, pulse) : "#6a5030") : (hv("cancel") ? "#c08a50" : "#8a5a2a"); ctx.beginPath(); ctx.ellipse(bx, fy - 0.5, 9, 3.6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = kind === "confirm" ? "rgba(60,30,0,.7)" : "rgba(40,20,4,.8)"; ctx.lineWidth = 1.1; ctx.beginPath();
      if (kind === "confirm") { ctx.moveTo(bx - 3.5, fy - 0.5); ctx.lineTo(bx - 1, fy + 1.2); ctx.lineTo(bx + 4, fy - 2); } else { ctx.moveTo(bx - 3, fy - 2); ctx.lineTo(bx + 3, fy + 1); ctx.moveTo(bx + 3, fy - 2); ctx.lineTo(bx - 3, fy + 1); } ctx.stroke(); /* deux signes gravés : le trait qui valide, la croix qui repose */
      if (on) r.hot.push({ x: bx - 14, y: fy - 9, w: 28, h: 18, baykh: { [kind]: true, id: kind } }); } }
  /* les réserves : les claires à gauche, les sombres à droite ; une pile de tuiles, et la Clef à côté */
  for (const p of [0, 1]) {
    const left = p === 0, bx = left ? 62 : 578, by = 292, R = G.res[p], sel = p === me && st.sel, mineTurn = G.turn === me && !G.end && p === me;
    const RF = frame(1, { cx: bx, top: by - 22, bot: by + 8, wT: 50, wB: 56 }), hcount = Math.min(18, Math.ceil(R.s / (n >= 7 ? 3 : 2)));
    for (let l = 0; l < hcount; l++) piece(ctx, RF, Hb, 0, 0, p, { lvl: l * 0.9 });
    if (sel === "w") piece(ctx, RF, Hb, 0, 0, p, { stand: true, lvl: hcount * 0.9 + 0.2, hi: 1 }); /* la pièce redressée en Verrou */
    const zone = { x: bx - 34, y: by - 30 - hcount * 4, w: 68, h: 46 + hcount * 4 };
    if (!st.started && G.ply === 0) { const g = ctx.createRadialGradient(bx, by - 18, 2, bx, by - 18, 46); g.addColorStop(0, rgba(255, 220, 150, (hv("side" + p) ? 0.3 : 0.12) * (0.7 + 0.3 * Math.sin(t * 2 + p)))); g.addColorStop(1, "rgba(255,220,150,0)"); ctx.fillStyle = g; ctx.fillRect(bx - 50, by - 70, 100, 100); } /* au début : on choisit sa couleur */
    else if (mineTurn && hv("side" + p)) { const g = ctx.createRadialGradient(bx, by - 18, 2, bx, by - 18, 40); g.addColorStop(0, "rgba(255,220,150,.2)"); g.addColorStop(1, "rgba(255,220,150,0)"); ctx.fillStyle = g; ctx.fillRect(bx - 45, by - 60, 90, 90); }
    r.hot.push({ ...zone, baykh: { side: p, id: "side" + p } });
    for (let c = 0; c < R.c; c++) { const CF = frame(1, { cx: bx + (left ? 40 : -40) + (c ? (left ? 16 : -16) : 0), top: by - 4, bot: by + 18, wT: 34, wB: 38 }); capstone(ctx, CF, Hb, 0, 0, p, p === me ? s.cap : st.botCap, 0, p === me && sel === "c" ? 1 : 0);
      if (p === me) r.hot.push({ x: CF.cx - 16, y: by - 40, w: 32, h: 60, baykh: { capPick: true, id: "cap" + c } }); }
  }
  /* au bord avant de la table : le coffret des Clefs, le cadran de la taille, le bouton de bronze, les plots du niveau */
  const fx = F.P(0.5, 1.12)[1], between = !st.started || G.end || G.ply === 0;
  { const x = 170, y = fx + 2; ctx.fillStyle = "#3a2410"; ctx.fillRect(x - 30, y - 6, 60, 14); ctx.fillStyle = "#c99a52"; ctx.fillRect(x - 30, y - 6, 60, 1.4); /* le coffret, ouvert */
    CAPS.forEach((k, q) => { const CF = frame(1, { cx: x - 21 + q * 14, top: y - 2, bot: y + 4, wT: 14, wB: 15 }); capstone(ctx, CF, Hb, 0, 0, me, k, 0, k === s.cap ? 0.9 : 0); });
    if (between) r.hot.push({ x: x - 32, y: y - 26, w: 64, h: 36, baykh: { box: true, id: "box" } }); if (hv("box")) { ctx.strokeStyle = "rgba(255,220,150,.4)"; ctx.strokeRect(x - 31, y - 7, 62, 16); } }
  { const x = 470, y = fx + 4; ctx.fillStyle = "#5a3c14"; ctx.beginPath(); ctx.ellipse(x, y + 1, 17, 6.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#c99a52"; ctx.beginPath(); ctx.ellipse(x, y, 15, 5.6, 0, 0, TAU); ctx.fill(); /* le cadran */
    for (let k = 3; k <= 8; k++) { const a = Math.PI * (1.08 + (k - 3) / 5 * 0.84), on = k === n; numeral(ctx, k, x + Math.cos(a) * 11, y + Math.sin(a) * 4.2, 3.6, on ? "#2a1000" : "rgba(60,40,16,.55)"); }
    const a = Math.PI * (1.08 + (n - 3) / 5 * 0.84); ctx.strokeStyle = "#2a1c0c"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 3); ctx.stroke();
    if (between) r.hot.push({ x: x - 18, y: y - 8, w: 36, h: 16, baykh: { dial: true, id: "dial" } }); if (hv("dial")) { ctx.strokeStyle = "rgba(255,220,150,.5)"; ctx.beginPath(); ctx.ellipse(x, y, 17, 6.5, 0, 0, TAU); ctx.stroke(); } }
  { const x = 510, y = fx + 4; ctx.fillStyle = "#3a2410"; ctx.beginPath(); ctx.ellipse(x, y, 7, 2.8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = hv("fresh") ? "#e0a868" : "#a8743a"; ctx.beginPath(); ctx.ellipse(x, y - 0.4, 5.6, 2.2, 0, 0, TAU); ctx.fill(); /* le bouton de bronze, à fleur */
    r.hot.push({ x: x - 9, y: y - 6, w: 18, h: 12, baykh: { fresh: true, id: "fresh" } }); }
  { const li = LEVELS.indexOf(s.level); for (let q = 0; q < 4; q++) { const x = 230 + q * 14, y = fx + 5, on = q === li; ctx.fillStyle = "#3a2410"; ctx.beginPath(); ctx.ellipse(x, y, 4, 1.8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = on ? "#ffd890" : "#8a6a38"; ctx.beginPath(); ctx.ellipse(x, y - 0.3, 3, 1.2, 0, 0, TAU); ctx.fill();
    numeral(ctx, q < 3 ? q + 1 : s.rank, x, y + 6, 3.4, on ? "#ffd890" : "rgba(200,170,110,.5)");
    if (between) r.hot.push({ x: x - 6, y: y - 5, w: 12, h: 14, baykh: { level: q, id: "lv" + q } }); } }
  /* la fin : une lueur sur la réserve du vainqueur */
  if (G.end && G.end.win >= 0) { const bx = G.end.win === 0 ? 62 : 578, g = ctx.createRadialGradient(bx, 270, 4, bx, 270, 70); g.addColorStop(0, rgba(255, 210, 120, 0.35 * glow)); g.addColorStop(1, "rgba(255,210,120,0)"); ctx.fillStyle = g; ctx.fillRect(bx - 70, 200, 140, 140); }
  if (st.thinking) { const x = bot === 0 ? 62 : 578; ctx.fillStyle = rgba(150, 200, 255, 0.25 + 0.2 * Math.sin(t * 6)); ctx.beginPath(); ctx.arc(x, 330, 2.5, 0, TAU); ctx.fill(); } /* la machine réfléchit */
  require("./relto-atelier").backButton(r, ctx, tr("baykh.back"), "lounge");
}

/** La table basse du salon, devant le canapé : le plateau posé dessus, deux poufs. Un clic : la partie. */
function loungeTable(r, ctx, c, tr) {
  const Hb = habit(r), x = 320, y = 286;
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + 4, y + 30, 92, 11, 0, 0, TAU); ctx.fill();
  for (const dx of [-120, 120]) { ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x + dx + 3, y + 32, 21, 5.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = c(Hb.kind === "castle" ? "#1f3a30" : "#5b2b3a"); ctx.beginPath(); ctx.ellipse(x + dx, y + 14, 19, 6.5, 0, 0, TAU); ctx.fill(); ctx.fillRect(x + dx - 19, y + 14, 38, 13); ctx.fillStyle = c(Hb.kind === "castle" ? "#12241d" : "#44202c"); ctx.beginPath(); ctx.ellipse(x + dx, y + 27, 19, 5.5, 0, 0, Math.PI); ctx.fill(); } /* les poufs */
  ctx.fillStyle = c(Hb.table); for (const dx of [-74, 74]) ctx.fillRect(x + dx - 4, y + 4, 8, 26);
  ctx.beginPath(); ctx.moveTo(x - 88, y + 8); ctx.lineTo(x + 88, y + 8); ctx.lineTo(x + 80, y - 6); ctx.lineTo(x - 80, y - 6); ctx.closePath(); ctx.fillStyle = c(mix(Hb.table, "#000000", 0.2)); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 80, y - 6); ctx.lineTo(x + 80, y - 6); ctx.lineTo(x + 70, y - 18); ctx.lineTo(x - 70, y - 18); ctx.closePath(); ctx.fillStyle = c(mix(Hb.table, "#ffffff", 0.08)); ctx.fill();
  const F = frame(5, { cx: x, top: y - 17, bot: y - 7, wT: 62, wB: 78 }), quad = (a, b2, c2, d2) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b2); ctx.lineTo(...c2); ctx.lineTo(...d2); ctx.closePath(); };
  ctx.fillStyle = c(Hb.rim[1]); quad(F.P(-0.05, 1.05), F.P(1.05, 1.05), F.P(1.05, -0.05), F.P(-0.05, -0.05)); ctx.fill();
  ctx.fillStyle = c(Hb.sq[0]); quad(F.P(0, 1), F.P(1, 1), F.P(1, 0), F.P(0, 0)); ctx.fill();
  ctx.strokeStyle = "rgba(30,22,14,.45)"; ctx.lineWidth = 0.4; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(...F.P(k / 5, 0)); ctx.lineTo(...F.P(k / 5, 1)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(...F.P(0, k / 5)); ctx.lineTo(...F.P(1, k / 5)); ctx.stroke(); }
  /* quelques pièces de la dernière partie, en petit */
  const st = r.bk && r.bk.G, G = st && st.n === 5 ? st : null;
  for (const [i, p] of G ? G.board.map((s2, k) => [k, s2.length ? s2[s2.length - 1].p : -1]).filter(([, p]) => p >= 0) : [[11, 0], [12, 0], [13, 1], [7, 1], [17, 0]]) {
    const [px, py] = F.P(((i % 5) + 0.5) / 5, (((i / 5) | 0) + 0.5) / 5); ctx.fillStyle = c(Hb.C[p][0]); ctx.fillRect(px - 2.6, py - 1.6, 5.2, 2.6); }
  r.hot.push({ x: x - 90, y: y - 22, w: 180, h: 54, tip: tr("baykh.table"), go: "baykh" });
}

module.exports = { drawBaykh, loungeTable, act, state, cur, habit, frame, piece, capstone, CAPS, LEVELS };
