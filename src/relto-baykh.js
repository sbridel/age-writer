"use strict";
/**
 * Baykh, le jeu des routes du salon : la table basse devant le canapé (dans le salon), et la vue de la partie (vue `baykh`).
 * Les règles et l'adversaire sont dans `src/baykh.js`. Tout se joue sans texte :
 *  - une vraie table basse : le plateau posé dessus, les réserves de part et d'autre, la stèle de la guilde adverse ; sous le dessus, une tablette
 *    (le coffret, le bouton de la vue, le carnet) ; dans le chant, le tiroir des réglages : la taille (3 à 8, en chiffres D'ni), le niveau, une partie neuve ;
 *  - au début, toucher une réserve choisit sa couleur (les claires commencent toujours) ;
 *  - toucher une case vide y pose une Voie ; toucher d'abord sa réserve redresse la pièce en Verrou ; toucher sa Clef de voûte la prend ;
 *  - toucher une pile qu'on tient la prend (toucher encore : une pièce de moins), puis toucher les cases en ligne pour semer ; toute la pile semée,
 *    toucher la réserve d'en face joue le coup (on passe la main), revenir à la pile de départ repose tout ;
 *  - vu de dessus : aucun bouton ; toucher le bois de la table, c'est se rasseoir ;
 *  - le coffret : sa Clef de voûte (la statuette, l'abeille, la main, l'aiguille D'ni gothique) ; la machine prend la sienne au hasard ;
 *  - dans le tiroir, quatre plots : le niveau (facile, moyen, difficile, ou selon le rang).
 * Les pièces suivent l'habit du salon : la pierre (par défaut), le verre et le cuivre (la Verrière : ambre contre vert d'eau),
 * l'ivoire, l'ébène et l'or en octogones (le Château). Règles d'après le Tak de James Ernest et Patrick Rothfuss.
 */
const B = require("./baykh");
const GS = require("./guild-symbols"); /* la machine joue pour une guilde, tirée à chaque partie */
const { rgba, mix } = require("./util");
const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const W = 640, H = 360, TAU = Math.PI * 2;
/** L'échelle de chaque Clef : les lampes un peu plus grandes ; les deux gothiques à flèche ramenées à la hauteur de la tour (l'auteur les trouvait trop grosses : 194 et 172 px contre 130 en 5×5). */
const KEY_SCALE = { bee: 1.3, hand: 1.3, rayonnant: 0.67, flamboyant: 0.76 };
const CAPS = ["robe", "bee", "hand", "needle", "rayonnant", "flamboyant", "tower", "clock"]; /* la statuette, les deux lampes, et les quatre pistes gothiques de l'auteur (l'aiguille D'ni, le rayonnant, le flamboyant, la tour) */
/* les couleurs d'une Clef de voûte (une pièce à soi, pas forcément assortie) : celle du joueur, ou un émail, un métal, une pierre */
const CAP_COLS = { mine: null, gold: ["#f0cc6a", "#c8983a", "#7a5a1a"], silver: ["#e6eaee", "#aab0b8", "#6a7078"], copper: ["#e8956a", "#b8643a", "#6a3a1c"],
  lapis: ["#4a6cc0", "#2a4890", "#142458"], jade: ["#6ac0a0", "#3a8e70", "#1c5440"], ruby: ["#c83848", "#8e2030", "#4e0c18"], obsidian: ["#44464e", "#1e2026", "#08080a"], ivory: ["#f6eedb", "#e0d4b8", "#b8aa88"] };
const COL_KEYS = Object.keys(CAP_COLS);
const LEVELS = ["easy", "mid", "hard", "rank"];
const T = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const levelOf = (s) => (s.level === "rank" ? (s.rank >= 6 ? "hard" : s.rank >= 3 ? "mid" : "easy") : s.level);

/* ---------------------------------------------------------------- l'état ---------------------------------------------------------------- */
function saved(r) {
  const s = (r.opts && r.opts.baykhState && r.opts.baykhState()) || {};
  return { n: [3, 4, 5, 6, 7, 8].includes(s.n) ? s.n : 5, side: s.side === 1 ? 1 : 0, cap: CAPS.includes(s.cap) ? s.cap : "robe", capCol: COL_KEYS.includes(s.capCol) ? s.capCol : "mine", level: LEVELS.includes(s.level) ? s.level : "mid",
    rank: Math.max(0, s.rank | 0), top: !!s.top, shut: !!s.shut, game: s.game && typeof s.game === "object" ? s.game : null, bot: s.bot && CAPS.includes(s.bot.cap) ? s.bot : null, log: Array.isArray(s.log) ? s.log.slice(0, 40) : [] };
}
function cur(r) { return r._bkSaved || saved(r); }
function save(r, patch) { const s = { ...cur(r), ...patch }; r._bkSaved = s; if (r.opts && r.opts.onBaykh) r.opts.onBaykh(s); return s; }
function snd(r, k) { if (r.opts && r.opts.onAhySound) try { r.opts.onAhySound(k); } catch (e) { /* rien */ } }
function state(r) {
  if (!r.bk || !r.bk.G) { const s = cur(r), G = restore(s.game), b = s.bot || {};
    r.bk = { ...(r.bk || {}), G: G || B.newGame(s.n), sel: null, hand: null, botCap: b.cap && b.cap !== s.cap ? b.cap : otherCap(s.cap), botCol: COL_KEYS.includes(b.col) ? b.col : COL_KEYS[Math.floor(Math.random() * COL_KEYS.length)], botGuild: GS.GUILDS.includes(b.guild) ? b.guild : GS.GUILDS[Math.floor(Math.random() * 5)], started: !!(G && G.ply > 0), done: !!(G && G.end) };
    if (G && !G.end) botTurn(r); } /* la partie laissée sur la table reprend là où on l'a quittée ; si c'était à la machine, elle joue */
  return r.bk;
}
/** La partie gardée (dans l'état du plugin) : sa taille, ses piles, ses réserves, à qui le tour. Vérifiée avant d'être reprise. */
function keep(r) { const st = r.bk, G = st && st.G; if (!G) return; save(r, { game: G.ply ? { n: G.n, board: G.board, res: G.res, turn: G.turn, ply: G.ply } : null, bot: { cap: st.botCap, col: st.botCol, guild: st.botGuild } }); }
function restore(g) {
  try { if (!g || ![3, 4, 5, 6, 7, 8].includes(g.n) || !Array.isArray(g.board) || g.board.length !== g.n * g.n) return null;
    const ok = (pc) => pc && (pc.p === 0 || pc.p === 1) && ["f", "w", "c"].includes(pc.k);
    if (!g.board.every((st) => Array.isArray(st) && st.every(ok))) return null;
    const G = B.newGame(g.n); G.board = g.board.map((st) => st.map((pc) => ({ p: pc.p, k: pc.k }))); G.res = [0, 1].map((p) => ({ s: Math.max(0, g.res[p].s | 0), c: Math.max(0, g.res[p].c | 0) }));
    G.turn = g.turn === 1 ? 1 : 0; G.ply = Math.max(0, g.ply | 0); G.end = B.verdict(G, 1 - G.turn); return G; } catch (e) { return null; } }
/** La Clef de la maison : jamais le même modèle que la mienne (demande de l'auteur). */
function otherCap(mine) { const pool = CAPS.filter((k) => k !== mine); return pool[Math.floor(Math.random() * pool.length)]; }
function fresh(r) { const s = cur(r), st = state(r); st.G = B.newGame(s.n); st.sel = null; st.hand = null; st.started = false; st.botCap = otherCap(s.cap); st.botCol = COL_KEYS[Math.floor(Math.random() * COL_KEYS.length)]; st.botGuild = GS.GUILDS[Math.floor(Math.random() * 5)]; st.done = false; keep(r); }
/** Après mon coup, ou au départ si je joue les sombres : la machine réfléchit un instant, puis joue. */
function botTurn(r) {
  const st = state(r), s = cur(r); if (st.G.end || st.G.turn === s.side || st.thinking) return;
  st.thinking = true; const G0 = st.G;
  setTimeout(() => { st.thinking = false; if (st.G !== G0 || st.G.end) return; const m = B.think(st.G, levelOf(s)); if (!m) return; st.prev = st.G; st.G = B.apply(st.G, m); st.lastBot = { m, at: Date.now() }; snd(r, "set"); settle(r); keep(r); if (r.draw && !r.running) r.draw(0); }, 520);
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
  st.G = B.apply(st.G, mv); st.sel = null; st.hand = null; st.started = true; snd(r, "set"); settle(r); keep(r); botTurn(r); return true;
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
    if (a.side !== s.side && mine && st.hand) { const h = st.hand; if (h.drops.length && h.take === h.drops.reduce((p, q) => p + q, 0) && !play(r, { t: "m", i: h.from, d: h.d, drops: h.drops.slice() })) st.hand = null; return; } /* toucher la réserve d'en face quand toute la pile est semée : on passe la main, le coup est joué */
    if (a.side === s.side && mine) { if (G.ply < 2) { st.sel = "f"; return; } if (G.res[s.side].s <= 0) return; st.sel = st.sel === "w" ? null : "w"; st.hand = null; snd(r, "tick"); } return; } /* la réserve : la prochaine pièce posée sera un Verrou (ou de nouveau une Voie) */
  if (a.capPick) { if (mine && G.ply >= 2 && G.res[s.side].c > 0) { st.sel = st.sel === "c" ? null : "c"; st.hand = null; snd(r, "tick"); } return; }
  if (a.boxTop) { const now = Date.now(); if (st.topTap && now - st.topTap < 450) { st.topTap = 0; save(r, { shut: !s.shut }); snd(r, s.shut ? "open" : "tick"); } else st.topTap = now; return; } /* deux taps sur le dessus du coffret : il se ferme, ou se rouvre */
  if (a.box) { if (!s.shut && (!st.started || G.end || G.ply === 0)) { st.box = true; snd(r, "open"); } return; } /* le coffret ouvert : l'écrin */
  if (a.boxClose) { st.box = false; st.ledger = false; st.drawer = false; snd(r, "tick"); return; }
  if (a.drawer) { st.drawer = true; st.hand = null; snd(r, "open"); return; } /* le tiroir des réglages s'ouvre */
  if (a.wood) { if (s.top) { save(r, { top: false }); snd(r, "tick"); } return; } /* vu d'en haut : toucher le bois de la table, c'est se rasseoir */
  if (a.ledger) { st.ledger = true; snd(r, "open"); return; }
  if (a.pickCap) { save(r, { cap: a.pickCap }); if (st.botCap === a.pickCap) { st.botCap = otherCap(a.pickCap); keep(r); } snd(r, "tick"); return; } /* je prends la Clef de la maison : elle en change */
  if (a.pickCol) { save(r, { capCol: a.pickCol }); snd(r, "tick"); return; }
  if (a.dial) { if (!st.started || G.end || G.ply === 0) { save(r, { n: s.n >= 8 ? 3 : s.n + 1 }); fresh(r); snd(r, "tick"); } return; }
  if (a.fresh) { fresh(r); st.drawer = false; snd(r, "leave"); return; }
  if (a.topView) { save(r, { top: !s.top }); snd(r, "tick"); return; } /* se pencher au-dessus de la table, ou se rasseoir */
  if (a.level != null) { if (!st.started || G.end || G.ply === 0) { save(r, { level: LEVELS[a.level] }); snd(r, "tick"); } return; }
  if (a.cell != null && G.end) { const now = Date.now(); if (st.boardTap && now - st.boardTap < 450) { st.boardTap = 0; fresh(r); snd(r, "leave"); } else st.boardTap = now; return; } /* la partie finie : deux taps sur le plateau en relancent une (demande de l'auteur) */
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
const CASTLE_C = [["#6e1e2c", "#521624", "#300a12"], ["#2a3f7a", "#1c2c5a", "#101a3a"]];
function habit(r) {
  if (r.castleOn && r.castleOn()) return { kind: "castle", bg: ["#2a0e1c", "#12060c"], rim: ["#7a5a1a", "#f0cc6a", "#6a4a10"], sq: ["#d8d2c6", "#b9b2a4"], line: "rgba(80,60,40,.5)",
    C: CASTLE_C, table: "#3a2414", shape: "oct", fil: "#e8c060", trim: "#e8c060", velvet: "#3a0e1a" };
  if (r.glassOn && r.glassOn()) return { kind: "glass", bg: ["#14221c", "#0a120e"], rim: ["#5a2e12", "#c87a3a", "#4a2410"], sq: ["rgba(190,215,205,.62)", "rgba(160,190,180,.56)"], line: "rgba(120,70,30,.75)",
    C: [["rgba(236,178,84,.95)", "rgba(204,144,56,.96)", "rgba(160,104,30,.96)"], ["rgba(96,176,160,.95)", "rgba(62,138,124,.96)", "rgba(36,96,86,.96)"]], table: "#3a2416", shape: "square", fil: "#c87a3a", trim: "#c87a3a", velvet: "#143a32" };
  return { kind: "stone", bg: ["#2a1c12", "#140d08"], rim: ["#6a4a1c", "#c99a52", "#5a3c14"], sq: ["#8a8272", "#7c7466"], line: "rgba(30,22,14,.55)",
    C: [["#e6e0cf", "#c8c0aa", "#a8a08a"], ["#3a3e44", "#26292e", "#16181b"]], table: "#4b3220", shape: "square", fil: null, trim: "#c99a52", velvet: "#4a1a22" };
}

/* ---------------------------------------------------------------- la géométrie ---------------------------------------------------------------- */
/** Le plateau en légère perspective : (u, v) dans [0, 1]² → l'écran ; z en largeurs de case. */
function frame(n, o = {}) {
  const cx = o.cx || 320, top = o.top || 58, bot = o.bot || 300, wT = o.wT || 250, wB = o.wB || 370;
  const P = (u, v) => { const y = top + (bot - top) * v, hw = (wT + (wB - wT) * v) / 2; return [cx - hw + 2 * hw * u, y]; };
  const zk = o.zk || 1, cellW = (v) => (wT + (wB - wT) * v) / n, P3 = (u, v, z) => { const [x, y] = P(u, v); return [x, y - z * zk * cellW(v)]; };
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
  }
  if (hi) { const face = Bf.map(pr); poly(ctx, face); ctx.fillStyle = rgba(255, 214, 130, 0.35 * hi); ctx.fill(); }
}

/** La Clef de voûte : quatre modèles, de la couleur du joueur. */
function capstone(ctx, F, Hb, i, j, p, kind, lvl = 0, hi = 0, colKey = "mine") {
  const { n } = F, cu = (i + 0.5) / n, cv = (j + 0.55) / n, [x, y0] = F.P(cu, cv), y = y0 - lvl * 0.13 * F.cellW(cv), s = F.cellW(cv) / 26 * (KEY_SCALE[kind] || 1), /* l'échelle de chaque modèle (choix de l'auteur) */ col = CAP_COLS[colKey] || Hb.C[p];
  const lin = (x0, x1, st) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); st.forEach((k, q) => g.addColorStop(q / (st.length - 1), k)); return g; };
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + 3, y + 3, 9 * s, 3.2 * s, 0, 0, TAU); ctx.fill();
  if (hi) { const g = ctx.createRadialGradient(x, y - 14 * s, 1, x, y - 14 * s, 20 * s); g.addColorStop(0, rgba(255, 214, 130, 0.4 * hi)); g.addColorStop(1, rgba(255, 214, 130, 0)); ctx.fillStyle = g; ctx.fillRect(x - 20 * s, y - 34 * s, 40 * s, 40 * s); }
  const gold = lin(-10, 10, ["#6a4a10", "#ffd870", "#f0cc6a", "#5a3a08"]);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (kind === "robe") { /* la statuette en robe à capuchon, liseré d'or, sur un socle carré */
    ctx.fillStyle = col[1]; ctx.fillRect(-7, -3, 14, 3); ctx.fillStyle = col[0]; ctx.fillRect(-7, -4.5, 14, 1.6);
    const g = lin(-6, 6, [col[2], col[0], col[1], col[2]]); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(-4.6, -12, -3.4, -17); ctx.lineTo(3.4, -17); ctx.quadraticCurveTo(4.6, -12, 6, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(0, -11.4, 3.9, 1.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-3.6, -16.6); ctx.quadraticCurveTo(-4.2, -23.5, 0, -24.2); ctx.quadraticCurveTo(4.2, -23.5, 3.6, -16.6); ctx.quadraticCurveTo(0, -15.4, -3.6, -16.6); ctx.fill();
    ctx.fillStyle = "#1a160f"; ctx.beginPath(); ctx.ellipse(0, -19.4, 1.9, 2.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#e8c06a"; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-5.7, -4.2); ctx.quadraticCurveTo(0, -2.7, 5.7, -4.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3.5, -16.8); ctx.quadraticCurveTo(-3.9, -23.1, 0, -23.7); ctx.quadraticCurveTo(3.9, -23.1, 3.5, -16.8); ctx.stroke(); }
  else if (kind === "bee" || kind === "hand") { /* les lampes de l'auteur, sur un pied doré comme les autres Clefs (l'auteur n'aimait pas le pilier de pierre) ; le verre de la couleur du joueur */
    ctx.fillStyle = gold; ctx.beginPath(); ctx.ellipse(0, -0.8, 5.2, 1.4, 0, 0, TAU); ctx.fill(); ctx.fillRect(-5.2, -1.8, 10.4, 1); /* la base */
    ctx.beginPath(); ctx.moveTo(-3.2, -1.8); ctx.quadraticCurveTo(-1.2, -2.6, -1.3, -4.4); ctx.lineTo(1.3, -4.4); ctx.quadraticCurveTo(1.2, -2.6, 3.2, -1.8); ctx.closePath(); ctx.fill(); /* le fût, galbé */
    ctx.fillRect(-3.8, -6.4, 7.6, 2); ctx.fillStyle = "rgba(255,240,190,.55)"; ctx.fillRect(-3.8, -6.4, 7.6, 0.5); ctx.fillStyle = "rgba(60,36,6,.45)"; ctx.fillRect(-3.8, -4.7, 7.6, 0.3); /* la bague qui tient le verre */
    const tint = CAP_COLS[colKey] ? hex(CAP_COLS[colKey][0]) : Hb.kind === "glass" ? (p ? [96, 176, 160] : [236, 178, 84]) : p ? [110, 120, 150] : [244, 200, 140];
    require("./relto-ahyoheek").lampGlass(ctx, kind === "bee" ? "oval" : "rays", tint, -5.2, 1); }
else if (kind === "rayonnant" || kind === "flamboyant") {
    const st = lin(-9, 9, [col[2], col[0], col[1], col[2]]), dark = "rgba(0,0,0,.58)";
    const fleuron = (y) => { ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(0, y - 4.6); ctx.quadraticCurveTo(1.2, y - 2.2, 0, y - 0.2); ctx.quadraticCurveTo(-1.2, y - 2.2, 0, y - 4.6); ctx.fill();
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, y - 1); ctx.quadraticCurveTo(d * 2.4, y - 2.6, d * 2.2, y - 0.4); ctx.quadraticCurveTo(d * 1, y - 0.6, 0, y - 0.2); ctx.fill(); } ctx.fillRect(-1.3, y - 0.3, 2.6, 0.8); };
    const pinnacle = (x, y0, h) => { ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(x - 1.4, y0); ctx.lineTo(x, y0 - h); ctx.lineTo(x + 1.4, y0); ctx.closePath(); ctx.fill(); ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(x, y0 - h - 0.6, 0.8, 0, TAU); ctx.fill(); };
    ctx.fillStyle = col[1]; ctx.fillRect(-10, -3, 20, 3); ctx.fillStyle = col[0]; ctx.fillRect(-9, -5, 18, 2.2); /* le socle à deux degrés */
    if (kind === "rayonnant") { /* le rayonnant : un baldaquin à deux arcs brisés sous leurs gâbles, des pinacles aux angles, une flèche élancée à crochets, un fleuron */
      ctx.fillStyle = st; for (const dx of [-8, -3, 3, 8]) ctx.fillRect(dx - 1, -19.5, 2, 14.5); /* les colonnettes */
      for (const cx of [-5.5, 5.5]) {
        ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(cx - 2, -5); ctx.lineTo(cx - 2, -14); ctx.quadraticCurveTo(cx - 2, -17.6, cx, -19.6); ctx.quadraticCurveTo(cx + 2, -17.6, cx + 2, -14); ctx.lineTo(cx + 2, -5); ctx.closePath(); ctx.fill(); /* l'arc brisé, ajouré */
        ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(cx - 3.8, -19); ctx.lineTo(cx, -28); ctx.lineTo(cx + 3.8, -19); ctx.closePath(); ctx.fill(); /* le gâble */
        ctx.strokeStyle = gold; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.arc(cx, -22.4, 1.2, 0, TAU); ctx.stroke(); } /* un oculus doré dans le gâble */
      for (const dx of [-9, 9]) pinnacle(dx, -19, 13);
      ctx.fillStyle = st; ctx.fillRect(-3, -28, 6, 9.5); ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-1, -19.5); ctx.lineTo(-1, -24.5); ctx.lineTo(0, -26); ctx.lineTo(1, -24.5); ctx.lineTo(1, -19.5); ctx.closePath(); ctx.fill(); /* le tambour, sa lancette */
      ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(-3.4, -28); ctx.lineTo(0, -54); ctx.lineTo(3.4, -28); ctx.closePath(); ctx.fill(); /* la flèche */
      ctx.fillStyle = gold; for (let k = 0; k < 5; k++) { const yy = -31 - k * 4.8, w = 3.4 * (1 - (-yy - 28) / 26); for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * w, yy); ctx.quadraticCurveTo(d * (w + 1.9), yy - 0.6, d * (w + 1.3), yy - 2.3); ctx.lineTo(d * w * 0.7, yy - 1.4); ctx.closePath(); ctx.fill(); } } /* les crochets */
      fleuron(-54); }
    else { /* le flamboyant : un arc en accolade sur deux piliers, ajouré d'un remplage en flammes (soufflets, mouchettes), des pinacles, des crochets, un fleuron */
      ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(-9, -20); ctx.bezierCurveTo(-9, -30, -2, -30, -1.2, -40); ctx.lineTo(0, -47); ctx.lineTo(1.2, -40); ctx.bezierCurveTo(2, -30, 9, -30, 9, -20); ctx.lineTo(9, -5); ctx.closePath(); ctx.fill(); /* l'accolade */
      ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-6.4, -5); ctx.lineTo(-6.4, -17); ctx.bezierCurveTo(-6.4, -24, -2, -27, 0, -32); ctx.bezierCurveTo(2, -27, 6.4, -24, 6.4, -17); ctx.lineTo(6.4, -5); ctx.closePath(); ctx.fill(); /* le vide de l'arc */
      ctx.strokeStyle = st; ctx.lineCap = "round"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -16); ctx.stroke(); /* le meneau */
      for (const d of [-1, 1]) {
        ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, -16); ctx.bezierCurveTo(d * 1, -20, d * 6.4, -18, d * 6.3, -13.5); ctx.stroke(); /* l'arc des lancettes */
        ctx.beginPath(); ctx.moveTo(d * 0.3, -16.4); ctx.bezierCurveTo(d * 5, -19, d * 5.6, -24.5, d * 0.8, -29.5); ctx.stroke(); /* la nervure qui monte en flamme */
        ctx.lineWidth = 0.75; ctx.beginPath(); ctx.moveTo(d * 1, -19); ctx.bezierCurveTo(d * 4.4, -20, d * 4, -24.5, d * 1.2, -26.5); ctx.bezierCurveTo(d * 2.6, -23.5, d * 2.4, -21, d * 1, -19); ctx.stroke(); } /* la mouchette */
      ctx.lineCap = "butt";
      for (const d of [-1, 1]) pinnacle(d * 9, -20, 15);
      ctx.fillStyle = gold; for (const [px, py] of [[-6.6, -27], [-3.3, -32.5], [-1.5, -38.5]]) for (const sg of [1, -1]) { const x = px * sg; ctx.beginPath(); ctx.moveTo(x, py); ctx.quadraticCurveTo(x - sg * 1.9, py - 1, x - sg * 1.3, py - 2.7); ctx.lineTo(x + sg * 0.3, py - 1.4); ctx.closePath(); ctx.fill(); } /* les crochets le long de l'accolade */
      fleuron(-47); }
  }
else if (kind === "clock") { /* l'horloge D'ni, en petit : la sphère armillaire sur son pilier ; ses quatre anneaux tournent à l'heure D'ni réelle */
    const st = lin(-6, 6, [col[2], col[0], col[1], col[2]]), R = require("./dniclock").rings(Date.now());
    ctx.fillStyle = col[1]; ctx.fillRect(-7, -3, 14, 3); ctx.fillStyle = col[0]; ctx.fillRect(-6, -4.6, 12, 1.8); /* le socle */
    ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(-2.4, -4.6); ctx.lineTo(-1.6, -16); ctx.lineTo(1.6, -16); ctx.lineTo(2.4, -4.6); ctx.closePath(); ctx.fill(); /* le pilier */
    ctx.fillStyle = gold; ctx.fillRect(-3.2, -17, 6.4, 1.4); /* le chapiteau */
    const cy = -25.5, ring = (rx, ry, rot, w, c2) => { ctx.strokeStyle = c2; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, rot, 0, TAU); ctx.stroke(); };
    ctx.fillStyle = "rgba(255,220,150,.12)"; ctx.beginPath(); ctx.arc(0, cy, 9, 0, TAU); ctx.fill();
    R.forEach((u, q) => { const rr = 9.4 - q * 2.1, a = u.angle; ring(rr, rr * Math.abs(Math.cos(a * 0.5 + q)) * 0.9 + 0.6, q * 0.5, q ? 0.9 : 1.2, q % 2 ? gold : st);
      const px = Math.cos(a - Math.PI / 2) * rr, py = Math.sin(a - Math.PI / 2) * rr * 0.6; ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(px, cy + py, 0.7, 0, TAU); ctx.fill(); }); /* les anneaux, et la perle qui marque chacun */
    ctx.fillStyle = col[0]; ctx.beginPath(); ctx.arc(0, cy, 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(0, cy - 11); ctx.lineTo(1, cy - 9.6); ctx.lineTo(-1, cy - 9.6); ctx.closePath(); ctx.fill(); } /* le cœur, l'index en haut */
else if (kind === "tower") { const x = 0, y = 0, s = 1, body = lin(-8, 8, [col[2], col[0], col[1], col[2]]); /* la tour : massive, à créneaux, un lys d'or en façade, un toit en pointe */
  ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(x-9*s,y);ctx.lineTo(x-7.5*s,y-22*s);ctx.lineTo(x+7.5*s,y-22*s);ctx.lineTo(x+9*s,y);ctx.closePath();ctx.fill();
  ctx.fillStyle=col[0];ctx.fillRect(x-8.5*s,y-25*s,17*s,3*s);for(const dx of [-8.5,-4.7,-0.9,2.9,6.7]){ctx.fillRect(x+(dx)*s,y-28*s,1.8*s,3*s);} /* les créneaux */
  ctx.fillStyle=col[1];ctx.beginPath();ctx.moveTo(x-6*s,y-28*s);ctx.lineTo(x,y-38*s);ctx.lineTo(x+6*s,y-28*s);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=0.5*s;for(let k=1;k<6;k++){ctx.beginPath();ctx.moveTo(x-8*s,y-k*4*s);ctx.lineTo(x+8*s,y-k*4*s);ctx.stroke();}
  ctx.fillStyle=gold;ctx.beginPath();ctx.moveTo(x,y-19*s);ctx.quadraticCurveTo(x+2.2*s,y-15*s,x,y-12*s);ctx.quadraticCurveTo(x-2.2*s,y-15*s,x,y-19*s);ctx.fill();for(const d of [-1,1]){ctx.beginPath();ctx.moveTo(x,y-13*s);ctx.quadraticCurveTo(x+d*4.5*s,y-16*s,x+d*3.8*s,y-11.5*s);ctx.quadraticCurveTo(x+d*2*s,y-13*s,x,y-12*s);ctx.fill();}ctx.fillRect(x-2.6*s,y-12.6*s,5.2*s,1.1*s); /* un lys d'or en façade */}
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
/* ---------------------------------------------------------------- la table basse (2.11.2) ---------------------------------------------------------------- */
/* Une vraie table : un dessus de bois veiné au chant fin, quatre pieds tournés, une tablette basse entre les pieds. Le plateau de jeu est posé
 * par-dessus ; le dessus n'a plus que lui, les deux réserves, les Clefs et la stèle de la maison. Sur la tablette : le coffret, le bouton de la vue,
 * le carnet. Les réglages (niveau, taille, partie neuve) sont rangés dans le tiroir du chant. Choix de l'auteur, 26 nov. 2026. */
const PERSP = { cx: 320, top: 14, bot: 262, wT: 330, wB: 410 }, ABOVE = { cx: 320, top: 6, bot: 330, wT: 324, wB: 324, zk: 0.32 }; /* le plateau aussi grand que la table le permet (demande de l'auteur) */
const RES_X = [56, 584], RES_Y = { persp: 196, top: 140 }, DRAWER = { x: 262, y: 284, w: 116, h: 26 };
function grain(ctx, pts, base) { /* le bois : un dégradé et quelques veines */
  const ys = pts.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys), g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, mix(base, "#000000", 0.08)); g.addColorStop(1, mix(base, "#ffffff", 0.1)); poly(ctx, pts); ctx.fillStyle = g; ctx.fill();
  ctx.save(); poly(ctx, pts); ctx.clip(); ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.lineWidth = 1;
  for (let y = y0 + 4; y < y1; y += 9) { const k = y * 0.37; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(200, y + 3 * Math.sin(k), 440, y - 3 * Math.cos(k), W, y + 2); ctx.stroke(); } ctx.restore(); }
function leg(ctx, Hb, x, y0, y1) { const g = ctx.createLinearGradient(x - 9, 0, x + 9, 0); g.addColorStop(0, mix(Hb.table, "#000000", 0.4)); g.addColorStop(0.5, mix(Hb.table, "#ffffff", 0.08)); g.addColorStop(1, mix(Hb.table, "#000000", 0.5));
  ctx.fillStyle = g; poly(ctx, [[x - 9, y0], [x + 9, y0], [x + 6, y1], [x - 6, y1]]); ctx.fill(); ctx.fillStyle = Hb.trim; ctx.fillRect(x - 8, y0 + 18, 16, 1.6); }
/** Un bouton encastré, assez grand pour le doigt ; `sign` grave son signe. */
function knob(ctx, x, y, rx, ry, face, sign, lit) {
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(x, y + 1.5, rx + 2.5, ry + 1.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#2a1a0c"; ctx.beginPath(); ctx.ellipse(x, y, rx + 2, ry + 1.2, 0, 0, TAU); ctx.fill();
  if (lit) { const g = ctx.createRadialGradient(x, y, 1, x, y, rx * 2.2); g.addColorStop(0, rgba(255, 200, 110, 0.45 * lit)); g.addColorStop(1, "rgba(255,200,110,0)"); ctx.fillStyle = g; ctx.fillRect(x - rx * 2.5, y - rx * 2.5, rx * 5, rx * 5); }
  const g = ctx.createLinearGradient(0, y - ry, 0, y + ry); g.addColorStop(0, face[0]); g.addColorStop(1, face[1]); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 0.6, rx, ry, 0, 0, TAU); ctx.fill();
  if (sign) { ctx.strokeStyle = "rgba(40,20,4,.85)"; ctx.lineWidth = 1.4; ctx.beginPath(); sign(x, y - 0.6); ctx.stroke(); } }
const BRASS = ["#e0b462", "#a8783a"], BRASS_HI = ["#f4cc80", "#c08a48"], BRONZE = ["#c8925a", "#8a5a2a"], BRONZE_HI = ["#e0a868", "#a0703a"];
/** Le coffret des Clefs, couché sur la tablette : ouvert sur le côté qui nous fait face (les Clefs debout sur le velours, le couvercle rabattu devant)
 *  entre deux parties ; fermé pendant une partie (on ne change pas de Clef en jouant). */
function casket(ctx, Hb, x, y, open, me, s, hi) {
  const w = 68, h = 27, d = 11;
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(x - w / 2 + 4, y + 3, w, 6);
  poly(ctx, [[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 - d * 0.6, y - h - d], [x - w / 2 + d * 0.6, y - h - d]]); ctx.fillStyle = "#6a4426"; ctx.fill();
  ctx.fillStyle = "#4a2e16"; ctx.fillRect(x - w / 2, y - h, w, h);
  if (open) { ctx.fillStyle = Hb.velvet; ctx.fillRect(x - w / 2 + 3, y - h + 3, w - 6, h - 6);
    CAPS.forEach((k, q) => { const F = frame(1, { cx: x - w / 2 + 8 + q * 7.4, top: y - 8, bot: y - 4.5, wT: 6.3, wB: 6.7 }); capstone(ctx, F, Hb, 0, 0, me, k, 0, k === s.cap ? 0.9 : 0, s.capCol); });
    poly(ctx, [[x - w / 2, y], [x + w / 2, y], [x + w / 2 + 2, y + 8], [x - w / 2 - 2, y + 8]]); ctx.fillStyle = "#5a3a1e"; ctx.fill(); ctx.fillStyle = Hb.trim; ctx.fillRect(x - w / 2 - 2, y + 7, w + 4, 1.4); }
  else { ctx.fillStyle = "#5a3a1e"; ctx.fillRect(x - w / 2 + 1, y - h + 1, w - 2, h - 2); ctx.fillStyle = Hb.trim; ctx.fillRect(x - w / 2, y - h, w, 1.4); ctx.fillRect(x - w / 2, y - 1.4, w, 1.4);
    ctx.fillRect(x - 4, y - h / 2 - 4, 8, 8); ctx.fillStyle = "#5a3a1e"; ctx.fillRect(x - 1.2, y - h / 2 - 1.5, 2.4, 4); }
  if (hi) { ctx.fillStyle = "rgba(255,220,150,.10)"; poly(ctx, [[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - h], [x + w / 2 - d * 0.6, y - h - d], [x - w / 2 + d * 0.6, y - h - d], [x - w / 2, y - h]]); ctx.fill(); } } /* survolé : le bois s'éclaire un peu, sans cadre (le cadre de survol est un réglage) */
/** Le carnet des parties, fermé, posé à plat sur la tablette : la couverture de cuir vue en légère perspective, le dos arrondi à gauche,
 *  la tranche des pages devant, des coins de laiton, un signet qui pend. */
function book(ctx, x, y, hi) {
  const w = 58, d = 20, th = 7, k = 5; /* largeur, profondeur vue, épaisseur, fuite */
  const bl = [x - w / 2, y], br = [x + w / 2, y], tr = [x + w / 2 - k, y - d], tl = [x - w / 2 + k, y - d];
  ctx.fillStyle = "rgba(0,0,0,.42)"; ctx.beginPath(); ctx.ellipse(x + 4, y + th + 2, w / 2 + 4, 4, 0, 0, TAU); ctx.fill();
  poly(ctx, [[bl[0] + 3, y], [br[0], y], [br[0], y + th], [bl[0] + 3, y + th]]); ctx.fillStyle = "#efe4c8"; ctx.fill(); /* la tranche des pages */
  ctx.strokeStyle = "rgba(120,100,70,.45)"; ctx.lineWidth = 0.6; for (let q = 1; q < 4; q++) { ctx.beginPath(); ctx.moveTo(bl[0] + 4, y + q * th / 4); ctx.lineTo(br[0] - 1, y + q * th / 4); ctx.stroke(); }
  ctx.fillStyle = "#4a2014"; ctx.fillRect(bl[0] + 2, y + th - 1.4, w - 2, 1.6); ctx.fillRect(br[0] - 1.6, y, 1.6, th); /* le plat du dessous */
  ctx.fillStyle = "#3a160e"; ctx.beginPath(); ctx.moveTo(bl[0] + 3, y); ctx.quadraticCurveTo(bl[0] - 3, y + th / 2, bl[0] + 3, y + th); ctx.lineTo(bl[0] + 5, y + th); ctx.lineTo(bl[0] + 5, y); ctx.closePath(); ctx.fill(); /* le dos arrondi */
  const g = ctx.createLinearGradient(0, y - d, 0, y); g.addColorStop(0, hi ? "#7a3a26" : "#6a301e"); g.addColorStop(1, hi ? "#5e2a1a" : "#4e2216"); poly(ctx, [bl, br, tr, tl]); ctx.fillStyle = g; ctx.fill(); /* la couverture */
  ctx.strokeStyle = "rgba(220,170,100,.35)"; ctx.lineWidth = 0.8; poly(ctx, [[bl[0] + 9, y - 3], [br[0] - 4, y - 3], [tr[0] - 4, y - d + 3], [tl[0] + 8, y - d + 3]]); ctx.stroke(); /* un filet doré, à froid */
  ctx.fillStyle = "#3a160e"; poly(ctx, [bl, [bl[0] + 6, y], [tl[0] + 5, y - d], tl]); ctx.fill(); /* le cuir du dos, sur le plat */
  ctx.fillStyle = "#d8aa5e"; for (const [cx, cy, sx] of [[br[0], y, -1], [tr[0], y - d, -1]]) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * 6, cy); ctx.lineTo(cx, cy + (cy === y ? -5 : 5)); ctx.closePath(); ctx.fill(); } /* les coins de laiton */
  { const sx = x + 10, sy = y + th * 0.45, ex = sx + 8, ey = y + th + 4.5; ctx.fillStyle = hi ? "#e0b462" : "#b0483a"; /* le signet : il sort d'entre les pages, au milieu de la tranche, et retombe sur la tablette */
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 3, sy); ctx.quadraticCurveTo(sx + 3.6, y + th + 2, ex + 3, ey); ctx.lineTo(ex + 1.5, ey - 1.6); ctx.lineTo(ex, ey); ctx.quadraticCurveTo(sx + 0.6, y + th + 2.5, sx, sy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(sx, sy, 3, 0.8); } /* l'ombre des pages sur le ruban */
}
/** La stèle de la maison : une petite stèle de laiton dressée face au joueur, derrière la réserve de la machine. Au milieu, un émail aux couleurs
 *  de sa guilde, comme ses bannières du couloir : le fond dans sa couleur, le symbole dans celle de son fil (demande de l'auteur). */
function stele(ctx, Hb, x, y, guild) {
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, 26, 5, 0, 0, TAU); ctx.fill(); /* l'ombre reste sur la table */
  ctx.fillStyle = mix(Hb.table, "#000000", 0.3); ctx.fillRect(x - 26, y - 4, 52, 8);
  const arch = (k) => { ctx.beginPath(); ctx.moveTo(x - 22 + k, y - 4 - k); ctx.lineTo(x - 22 + k, y - 46); ctx.quadraticCurveTo(x, y - 60 + k * 1.3, x + 22 - k, y - 46); ctx.lineTo(x + 22 - k, y - 4 - k); ctx.closePath(); };
  const g = ctx.createLinearGradient(x - 24, 0, x + 24, 0); g.addColorStop(0, "#8a6428"); g.addColorStop(0.45, "#e8c070"); g.addColorStop(1, "#7a5420"); ctx.fillStyle = g; arch(0); ctx.fill(); ctx.strokeStyle = "#5a3c14"; ctx.lineWidth = 1.2; ctx.stroke();
  const c = GS.COL[guild] || [122, 30, 46], e = ctx.createLinearGradient(0, y - 54, 0, y - 6); e.addColorStop(0, `rgb(${c.map((v) => Math.round(v + (255 - v) * 0.16)).join(",")})`); e.addColorStop(1, `rgb(${c.map((v) => Math.round(v * 0.72)).join(",")})`);
  ctx.fillStyle = e; arch(4); ctx.fill(); ctx.strokeStyle = "rgba(60,36,10,.7)"; ctx.lineWidth = 1; ctx.stroke(); /* l'émail, serti dans le laiton */
  ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.ellipse(x - 8, y - 40, 5, 9, -0.3, 0, TAU); ctx.fill(); /* un reflet sur l'émail */
  GS.draw(ctx, guild, x, y - 28, 15, GS.THREAD[guild] || "#ffde8c", 0.1); }
function drawBaykh(r, ctx, sc, sky, t) {
  const st = state(r), s = cur(r), G = st.G, n = G.n, Hb = habit(r), top = s.top, F = frame(n, top ? ABOVE : PERSP), me = s.side, bot = 1 - me, now = Date.now(), tr = T(r);
  const hv = (id) => r.hover && r.hover.baykh && r.hover.baykh.id === id, between = !st.started || G.end || G.ply === 0;
  const hand = st.hand, ready = !!(hand && hand.drops.length && hand.take === hand.drops.reduce((p, q) => p + q, 0)); /* toute la pile est semée : le coup attend qu'on passe la main */
  const quad = (a, b2, c2, d2) => poly(ctx, [a, b2, c2, d2]);
  if (top) { grain(ctx, [[0, H], [W, H], [W, 0], [0, 0]], Hb.table); /* vu d'en haut, la table remplit tout : on en sort en touchant le bois */
    for (const z of [{ x: 0, y: 0, w: 130, h: H }, { x: 510, y: 0, w: 130, h: H }, { x: 130, y: 346, w: 380, h: H - 346 }]) r.hot.push({ ...z, baykh: { wood: true, id: "wood" } }); }
  else {
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, Hb.bg[0]); bg.addColorStop(1, Hb.bg[1]); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const lamp = ctx.createRadialGradient(320, 30, 10, 320, 30, 380); lamp.addColorStop(0, "rgba(255,200,130,.16)"); lamp.addColorStop(1, "rgba(255,200,130,0)"); ctx.fillStyle = lamp; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.ellipse(320, 359, 330, 8, 0, 0, TAU); ctx.fill();
    leg(ctx, Hb, 70, 298, 318); leg(ctx, Hb, 570, 298, 318); /* les pieds arrière */
    grain(ctx, [[22, 346], [618, 346], [596, 306], [44, 306]], mix(Hb.table, "#000000", 0.12)); ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(44, 306, 552, 8); /* la tablette basse, juste sous le dessus */
    ctx.fillStyle = mix(Hb.table, "#000000", 0.4); ctx.fillRect(22, 346, 596, 8); ctx.fillStyle = Hb.trim; ctx.fillRect(22, 346, 596, 1.2);
    casket(ctx, Hb, 150, 342, between && !s.shut, me, s, hv("box") || hv("boxTop")); /* fermé pendant une partie ; entre deux, ouvert sauf si on l'a fermé */
    if (between) { if (!s.shut) r.hot.push({ x: 108, y: 315, w: 84, h: 39, baykh: { box: true, id: "box" } }); r.hot.push({ x: 108, y: 298, w: 84, h: 17, baykh: { boxTop: true, id: "boxTop" } }); }
    knob(ctx, 320, 326, 18, 7.6, hv("top") ? BRASS_HI : BRASS, (x, y) => ctx.rect(x - 5, y - 3, 10, 5.6)); r.hot.push({ x: 292, y: 306, w: 56, h: 40, baykh: { topView: true, id: "top" } }); /* le seul bouton : la vue de dessus */
    book(ctx, 490, 334, hv("ledger")); r.hot.push({ x: 456, y: 308, w: 68, h: 44, baykh: { ledger: true, id: "ledger" } });
    leg(ctx, Hb, 26, 296, 360); leg(ctx, Hb, 614, 296, 360); /* les pieds avant */
    grain(ctx, [[8, 292], [632, 292], [600, 4], [40, 4]], Hb.table);
    ctx.fillStyle = mix(Hb.table, "#000000", 0.35); ctx.fillRect(8, 292, 624, 10); ctx.fillStyle = Hb.trim; ctx.fillRect(8, 292, 624, 1.2); /* le chant, fin */
    ctx.fillStyle = mix(Hb.table, "#000000", 0.25); ctx.fillRect(270, 293, 100, 9); ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 1; ctx.strokeRect(270.5, 293.5, 99, 8);
    ctx.fillStyle = hv("drawer") ? "#f4cc80" : "#d8aa5e"; ctx.fillRect(306, 296, 28, 3); r.hot.push({ ...DRAWER, baykh: { drawer: true, id: "drawer" } }); /* le tiroir des réglages, sa poignée */
    stele(ctx, Hb, bot === 0 ? RES_X[0] + 10 : RES_X[1] - 12, 62, st.botGuild || "mainteneurs");
  }
  /* le plateau, posé sur la table : son ombre, son épaisseur, son bord */
  ctx.fillStyle = "rgba(0,0,0,.45)"; quad(...[[-0.06, 1.06], [1.06, 1.06], [1.06, -0.06], [-0.06, -0.06]].map(([u, v]) => { const [x, y] = F.P(u, v); return [x + 6, y + 8]; })); ctx.fill();
  if (!top) { const a = F.P(-0.06, 1.06), b2 = F.P(1.06, 1.06); quad(a, b2, [b2[0], b2[1] + 9], [a[0], a[1] + 9]); ctx.fillStyle = mix(Hb.table, "#000000", 0.3); ctx.fill(); ctx.fillStyle = Hb.trim; ctx.fillRect(a[0], a[1] + 8, b2[0] - a[0], 1.2); }
  const rg = ctx.createLinearGradient(F.P(-0.06, 0)[0], 0, F.P(1.06, 0)[0], 0); Hb.rim.forEach((k, q) => rg.addColorStop(q / 2, k)); ctx.fillStyle = rg; quad(F.P(-0.06, 1.06), F.P(1.06, 1.06), F.P(1.06, -0.06), F.P(-0.06, -0.06)); ctx.fill();
  const road = G.end && G.end.by === "road" ? new Set(G.end.path) : null, glow = 0.6 + 0.4 * Math.sin(t * 3);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = j * n + i; quad(F.P(i / n, j / n), F.P((i + 1) / n, j / n), F.P((i + 1) / n, (j + 1) / n), F.P(i / n, (j + 1) / n)); ctx.fillStyle = Hb.sq[(i + j) % 2]; ctx.fill(); ctx.strokeStyle = Hb.line; ctx.lineWidth = Hb.kind === "glass" ? 1.4 : 0.9; ctx.stroke();
    if (hv("c" + k) || (hand && hand.from === k)) { ctx.fillStyle = "rgba(255,220,150,.18)"; ctx.fill(); }
    if (road && road.has(k)) { ctx.fillStyle = rgba(255, 210, 120, 0.28 * glow); ctx.fill(); }
    if (st.lastBot && now - st.lastBot.at < 1600 && (st.lastBot.m.i === k)) { ctx.fillStyle = rgba(150, 200, 255, 0.22 * (1 - (now - st.lastBot.at) / 1600)); ctx.fill(); } /* là où la machine vient de jouer */
    const a = F.P(i / n, j / n), b2 = F.P((i + 1) / n, (j + 1) / n); r.hot.push({ x: a[0], y: a[1], w: b2[0] - a[0], h: b2[1] - a[1], baykh: { cell: k, id: "c" + k } });
  }
  /* les pièces, du fond vers l'avant ; la pile prise en main est soulevée */
  const pv = hand ? preview(G, hand) : null, board = pv ? pv.board : G.board, nx = hand ? new Set(nextCells(G, hand)) : null;
  if (nx) for (const k of nx) { const i = k % n, j = (k / n) | 0, pulse = 0.55 + 0.45 * Math.sin(t * 5); quad(F.P(i / n, j / n), F.P((i + 1) / n, j / n), F.P((i + 1) / n, (j + 1) / n), F.P(i / n, (j + 1) / n)); ctx.fillStyle = rgba(255, 214, 130, 0.22 * pulse); ctx.fill(); ctx.strokeStyle = rgba(255, 214, 130, 0.6 * pulse); ctx.lineWidth = 1.4; ctx.stroke(); } /* où la pièce suivante peut aller */
  const towers = [], fall = new Map(), lb = st.lastBot, el = lb && !r.opts.reducedMotion ? now - lb.at : Infinity; /* le coup de la machine : ses pièces descendent en place, case après case */
  if (el < 1200) { const m = lb.m; if (m.t === "p") fall.set(m.i, { c: 1, d: 0 }); else { let x = m.i % n, y = (m.i / n) | 0; const [dx, dy] = B.DIRS[m.d]; m.drops.forEach((c, q) => { x += dx; y += dy; fall.set(y * n + x, { c, d: q * 140 }); }); } }
  if (el < 1200 && r.draw && !r.running) setTimeout(() => { if (!r.running) r.draw(0); }, 30);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, stack = board[k], fl = fall.get(k);
    stack.forEach((pc, l) => {
      const hi = road && road.has(k) && l === stack.length - 1 ? glow : 0, p = fl && l >= stack.length - fl.c ? Math.max(0, Math.min(1, (el - fl.d) / 320)) : 1, up = (1 - p) * (1 - p) * 7;
      if (pc.k === "c") capstone(ctx, F, Hb, i, j, pc.p, pc.p === me ? s.cap : st.botCap, l + up, hi, pc.p === me ? s.capCol : st.botCol);
      else piece(ctx, F, Hb, i, j, pc.p, { stand: pc.k === "w", lvl: l + up, hi });
    });
    if (pv && pv.at === k) pv.floating.forEach((pc, l) => { const lv = stack.length + 1.6 + l; if (pc.k === "c") capstone(ctx, F, Hb, i, j, pc.p, pc.p === me ? s.cap : st.botCap, lv, 0.8, pc.p === me ? s.capCol : st.botCol); else piece(ctx, F, Hb, i, j, pc.p, { stand: pc.k === "w", lvl: lv, hi: 0.8 }); }); /* ce qui reste en main, soulevé */
    if (stack.length > 1) { const [x0, y0] = F.P(i / n, j / n), [x1, y1] = F.P((i + 1) / n, (j + 1) / n), up = stack.length * 0.13 * F.cellW((j + 0.5) / n) * (top ? ABOVE.zk : 1); towers.push({ x: x0, y: y0 - up, w: x1 - x0, h: y1 - y0 + up, baykh: { cell: k, id: "c" + k } }); }
  }
  r.hot.push(...towers); /* une tour se touche sur toute sa hauteur, pas seulement à son pied */
  /* les réserves, sur la table, de part et d'autre du plateau : les claires à gauche, les sombres à droite ; les Clefs devant */
  for (const p of [0, 1]) {
    const bx = RES_X[p], by = top ? RES_Y.top : RES_Y.persp, R = G.res[p], sel = p === me && st.sel, mineTurn = G.turn === me && !G.end && p === me;
    const RF = frame(1, top ? { cx: bx, top: by - 26, bot: by + 6, wT: 56, wB: 56, zk: ABOVE.zk } : { cx: bx, top: by - 24, bot: by + 6, wT: 54, wB: 60 }), hcount = Math.min(12, Math.ceil(R.s / (n >= 7 ? 4 : 3)));
    const lit = (!st.started && G.ply === 0) ? (hv("side" + p) ? 0.3 : 0.12) * (0.7 + 0.3 * Math.sin(t * 2 + p)) /* au début : on choisit sa couleur */
      : (ready && p === bot) ? (hv("side" + p) ? 0.55 : 0.36) * (0.75 + 0.25 * Math.sin(t * 4)) /* le coup est prêt : la réserve d'en face s'éclaire ; la toucher passe la main */
        : (mineTurn && hv("side" + p)) ? 0.2 : 0;
    if (lit) { const g = ctx.createRadialGradient(bx, by - 26, 4, bx, by - 26, 72); g.addColorStop(0, rgba(255, 214, 130, lit)); g.addColorStop(1, "rgba(255,214,130,0)"); ctx.fillStyle = g; ctx.fillRect(bx - 74, by - 100, 148, 150); }
    for (let l = 0; l < hcount; l++) piece(ctx, RF, Hb, 0, 0, p, { lvl: l * 0.9 });
    if (sel === "w") piece(ctx, RF, Hb, 0, 0, p, { stand: true, lvl: hcount * 0.9 + 0.2, hi: 1 }); /* la pièce redressée en Verrou */
    const tall = hcount * (top ? 2.2 : 6.4); r.hot.push({ x: bx - 36, y: by - 34 - tall, w: 72, h: 48 + tall, baykh: { side: p, id: "side" + p } });
    for (let c = 0; c < R.c; c++) { const cx = top ? bx : bx + (c - (R.c - 1) / 2) * 40, cy = top ? 196 + c * 44 : 258;
      const CF = frame(1, { cx, top: cy - 8, bot: cy + 12, wT: top ? 30 : 36, wB: top ? 30 : 40 }); capstone(ctx, CF, Hb, 0, 0, p, p === me ? s.cap : st.botCap, 0, p === me && sel === "c" ? 1 : 0, p === me ? s.capCol : st.botCol);
      if (p === me) r.hot.push({ x: cx - 18, y: cy - 34, w: 36, h: 50, baykh: { capPick: true, id: "cap" + c } }); }
  }
  /* la fin : une lueur sur la réserve du vainqueur ; la machine qui réfléchit : une petite lueur bleue au pied de sa réserve */
  if (G.end && G.end.win >= 0) { const bx = RES_X[G.end.win], by = top ? RES_Y.top : RES_Y.persp, g = ctx.createRadialGradient(bx, by - 20, 4, bx, by - 20, 70); g.addColorStop(0, rgba(255, 210, 120, 0.35 * glow)); g.addColorStop(1, "rgba(255,210,120,0)"); ctx.fillStyle = g; ctx.fillRect(bx - 70, by - 90, 140, 140); }
  if (st.thinking) { ctx.fillStyle = rgba(150, 200, 255, 0.25 + 0.2 * Math.sin(t * 6)); ctx.beginPath(); ctx.arc(RES_X[bot], (top ? RES_Y.top : RES_Y.persp) + 16, 2.5, 0, TAU); ctx.fill(); }
  if (st.ledger) ledger(r, ctx, Hb, s, hv); else if (st.box) capBox(r, ctx, Hb, s, me, t, hv); else if (st.drawer) drawer(r, ctx, Hb, s, between, hv); else require("./relto-atelier").backButton(r, ctx, tr("baykh.back"), "lounge");
}
/** Le tiroir des réglages, tiré, vu d'en haut : trois cases de velours — le niveau (quatre plots, leurs chiffres dessous), la taille (le cadran),
 *  une partie neuve (le bouton de bronze). Le niveau et la taille ne se changent qu'entre deux parties. Toucher hors du tiroir le referme. */
function drawer(r, ctx, Hb, s, between, hv) {
  ctx.fillStyle = "rgba(4,3,2,.62)"; ctx.fillRect(0, 0, W, H); r.hot.push({ x: 0, y: 0, w: W, h: H, baykh: { boxClose: true, id: "boxClose" } });
  const x0 = 130, y0 = 70, w = 380, h = 210, dim = between ? 1 : 0.45; ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(x0 + 6, y0 + 8, w, h);
  const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, mix(Hb.table, "#ffffff", 0.08)); g.addColorStop(1, mix(Hb.table, "#000000", 0.25)); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = mix(Hb.table, "#000000", 0.5); ctx.fillRect(x0 + 10, y0 + 10, w - 20, h - 20); ctx.fillStyle = Hb.trim; ctx.fillRect(x0, y0 + h - 3, w, 3); ctx.fillRect(x0 + w / 2 - 22, y0 + h + 1, 44, 5);
  r.hot.push({ x: x0, y: y0, w, h, baykh: { id: "drawerIn" } });
  const comp = (x, y, ww, hh) => { const v = ctx.createLinearGradient(0, y, 0, y + hh); v.addColorStop(0, "rgba(0,0,0,.5)"); v.addColorStop(0.3, Hb.velvet); v.addColorStop(1, mix(Hb.velvet, "#000000", 0.25)); ctx.fillStyle = v; ctx.fillRect(x, y, ww, hh); };
  comp(x0 + 18, y0 + 18, 150, h - 36); comp(x0 + 176, y0 + 18, 110, h - 36); comp(x0 + 294, y0 + 18, 68, h - 36);
  ctx.save(); ctx.globalAlpha = dim;
  const li = LEVELS.indexOf(s.level);
  for (let q = 0; q < 4; q++) { const x = x0 + 40 + q * 35, y = y0 + 92, on = q === li; knob(ctx, x, y, 12, 11, on ? ["#fff0b0", "#ffc860"] : hv("lv" + q) ? ["#b89a60", "#8a6a38"] : ["#9a7a48", "#6a4e28"], null, on ? 1 : 0);
    numeral(ctx, q < 3 ? q + 1 : s.rank, x, y + 28, 9, on ? "#ffd890" : "rgba(220,190,130,.6)");
    if (between) r.hot.push({ x: x - 17, y: y - 16, w: 34, h: 54, baykh: { level: q, id: "lv" + q } }); }
  { const x = x0 + 231, y = y0 + 96; knob(ctx, x, y, 40, 38, hv("dial") ? BRASS_HI : BRASS);
    for (let k = 3; k <= 8; k++) { const a = Math.PI * (1.12 + (k - 3) / 5 * 0.76); numeral(ctx, k, x + Math.cos(a) * 27, y + Math.sin(a) * 26, 7.5, k === s.n ? "#2a1000" : "rgba(60,40,16,.55)"); }
    const a = Math.PI * (1.12 + (s.n - 3) / 5 * 0.76); ctx.strokeStyle = "#2a1c0c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + Math.cos(a) * 22, y + 4 + Math.sin(a) * 22); ctx.stroke(); ctx.fillStyle = "#2a1c0c"; ctx.beginPath(); ctx.arc(x, y + 4, 3, 0, TAU); ctx.fill();
    if (between) r.hot.push({ x: x - 46, y: y - 44, w: 92, h: 92, baykh: { dial: true, id: "dial" } }); }
  ctx.restore();
  knob(ctx, x0 + 328, y0 + 96, 20, 19, hv("fresh") ? BRONZE_HI : BRONZE, (x, y) => ctx.arc(x, y, 8, 0.5, TAU - 0.3)); r.hot.push({ x: x0 + 302, y: y0 + 70, w: 52, h: 52, baykh: { fresh: true, id: "fresh" } }); /* une partie neuve */
}

/** Le carnet ouvert : les dernières parties, une ligne chacune, sans texte : la taille (en chiffre D'ni), le niveau (de un à trois plots),
 *  comment elle a fini (une route, ou les Voies comptées) et qui l'a gagnée (un sceau d'or, éteint si perdue, à moitié si nulle). */
function ledger(r, ctx, Hb, s, hv) {
  ctx.fillStyle = "rgba(4,3,2,.62)"; ctx.fillRect(0, 0, W, H); r.hot.push({ x: 0, y: 0, w: W, h: H, baykh: { boxClose: true, id: "boxClose" } });
  const x0 = 150, y0 = 40, w = 340, h = 280; ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(x0 + 6, y0 + 8, w, h); ctx.fillStyle = "#5a2a1a"; ctx.fillRect(x0 - 6, y0 - 6, w + 12, h + 12); /* la couverture */
  for (const [px, ww] of [[x0, w / 2 - 2], [x0 + w / 2 + 2, w / 2 - 2]]) { const g = ctx.createLinearGradient(px, 0, px + ww, 0); g.addColorStop(0, "#efe4c8"); g.addColorStop(1, "#e2d4b2"); ctx.fillStyle = g; ctx.fillRect(px, y0, ww, h); }
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x0 + w / 2 - 3, y0, 6, h); r.hot.push({ x: x0, y: y0, w, h, baykh: { id: "ledgerIn" } });
  const ink = "rgba(60,36,16,.85)", L = s.log.slice(0, 24);
  if (!L.length) { ctx.strokeStyle = "rgba(60,36,16,.3)"; ctx.lineWidth = 1; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x0 + 20, y0 + 40 + k * 32); ctx.lineTo(x0 + w / 2 - 20, y0 + 40 + k * 32); ctx.stroke(); } return; } /* rien encore : des lignes vides */
  L.forEach((e, q) => { const col = q < 12 ? 0 : 1, row = q % 12, x = x0 + 18 + col * (w / 2 + 2), y = y0 + 22 + row * 21.5;
    numeral(ctx, e.n, x + 8, y, 7, ink); /* la taille */
    const lv = { easy: 1, mid: 2, hard: 3, rank: 3 }[e.level] || 2; for (let k = 0; k < 3; k++) { ctx.fillStyle = k < lv ? ink : "rgba(60,36,16,.2)"; ctx.beginPath(); ctx.arc(x + 30 + k * 6, y, 1.8, 0, TAU); ctx.fill(); } /* le niveau */
    ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.beginPath(); if (e.by === "road") { ctx.moveTo(x + 58, y + 3); ctx.bezierCurveTo(x + 64, y - 5, x + 70, y + 5, x + 78, y - 3); } else { for (let k = 0; k < 3; k++) ctx.rect(x + 58 + k * 7, y - 2.5, 5, 5); } ctx.stroke(); /* une route, ou les Voies comptées */
    const sx = x + 120; ctx.fillStyle = e.won ? "#c8963a" : e.draw ? "rgba(200,150,58,.5)" : "rgba(60,36,16,.25)"; ctx.beginPath(); ctx.arc(sx, y, 5, 0, TAU); ctx.fill(); /* le sceau */
    if (e.won) { ctx.strokeStyle = "#7a4a10"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(sx, y, 3, 0, TAU); ctx.stroke(); } });
}
/** Le coffret des Clefs de voûte, ouvert : un écrin de bois doublé de velours ; à gauche, sa Clef en grand ; à droite, les quatre modèles
 *  dans leurs logements, et dessous les pastilles des couleurs (la sienne, puis l'or, l'argent, le cuivre, le lapis, le jade, le rubis,
 *  l'obsidienne, l'ivoire). Toucher hors de l'écrin le referme. */
function capBox(r, ctx, Hb, s, me, t, hv) {
  ctx.fillStyle = "rgba(4,3,2,.62)"; ctx.fillRect(0, 0, W, H); r.hot.push({ x: 0, y: 0, w: W, h: H, baykh: { boxClose: true, id: "boxClose" } });
  const x0 = 110, y0 = 52, w = 420, h = 250, velvet = Hb.velvet;
  ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(x0 + 6, y0 + 8, w, h);
  const wood = ctx.createLinearGradient(0, y0, 0, y0 + h); wood.addColorStop(0, "#5a3a1e"); wood.addColorStop(1, "#3a2410"); ctx.fillStyle = wood; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = "#c99a52"; ctx.fillRect(x0, y0, w, 2); ctx.fillRect(x0, y0 + h - 2, w, 2); /* les filets de laiton */
  const vel = (x, y, ww, hh) => { const g = ctx.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, "rgba(0,0,0,.45)"); g.addColorStop(0.25, velvet); g.addColorStop(1, mix(velvet, "#000000", 0.25)); ctx.fillStyle = g; ctx.fillRect(x, y, ww, hh); };
  r.hot.push({ x: x0, y: y0, w, h, baykh: { id: "boxIn" } }); /* l'intérieur ne referme pas */
  /* sa Clef, en grand, dans le grand logement */
  vel(x0 + 14, y0 + 14, 150, h - 28);
  { const F = frame(1, { cx: x0 + 89, top: y0 + 200, bot: y0 + 222, wT: 84, wB: 88 }); capstone(ctx, F, Hb, 0, 0, me, s.cap, 0, 0.5 + 0.2 * Math.sin(t * 2), s.capCol); }
  /* les quatre modèles */
  CAPS.forEach((k, q) => { const x = x0 + 180 + q * 28, y = y0 + 14, on = k === s.cap; vel(x, y, 25, 120);
    if (on || (hv("m" + k) && r.opts.hoverFrame !== false)) { ctx.strokeStyle = on ? "#f0cc6a" : "rgba(240,204,106,.45)"; ctx.lineWidth = on ? 1.6 : 1; ctx.strokeRect(x + 0.5, y + 0.5, 24, 119); }
    const F = frame(1, { cx: x + 12.5, top: y + 90, bot: y + 104, wT: 26, wB: 28 }); capstone(ctx, F, Hb, 0, 0, me, k, 0, 0, s.capCol);
    r.hot.push({ x, y, w: 25, h: 120, baykh: { pickCap: k, id: "m" + k } }); });
  /* les couleurs : des pastilles d'émail, de métal ou de pierre ; la première, la couleur du joueur */
  vel(x0 + 180, y0 + 146, 224, h - 160);
  COL_KEYS.forEach((k, q) => { const cx = x0 + 198 + (q % 5) * 47, cy = y0 + 170 + Math.floor(q / 5) * 40, on = k === s.capCol, c = CAP_COLS[k] || Hb.C[me];
    const g = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 12); g.addColorStop(0, c[0]); g.addColorStop(0.7, c[1]); g.addColorStop(1, c[2]); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, TAU); ctx.fill();
    if (k === "mine") { ctx.fillStyle = Hb.C[1 - me][1]; ctx.beginPath(); ctx.arc(cx, cy, 11, -Math.PI / 4, Math.PI * 3 / 4); ctx.fill(); ctx.strokeStyle = "rgba(255,240,200,.5)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, TAU); ctx.stroke(); } /* la sienne : moitié claire, moitié sombre (elle suit la couleur jouée) */
    ctx.strokeStyle = on ? "#f0cc6a" : hv("k" + k) ? "rgba(240,204,106,.6)" : "rgba(0,0,0,.4)"; ctx.lineWidth = on ? 2 : 1; ctx.beginPath(); ctx.arc(cx, cy, on ? 14 : 12, 0, TAU); ctx.stroke();
    r.hot.push({ x: cx - 16, y: cy - 16, w: 32, h: 32, baykh: { pickCol: k, id: "k" + k } }); });
}

/** La table basse du salon, devant le canapé : le plateau posé dessus, deux poufs. Un clic : la partie. */
function loungeTable(r, ctx, c0, tr) {
  /* la teinte du salon (c0) ne lit que l'hexadécimal : les verres de la Verrière, en rgba, sont d'abord rendus opaques (sinon tout sortait d'une seule couleur) */
  const hex = (col) => { const m = /^rgba?\(([^)]+)\)/.exec(col); if (!m) return col; const [R, G2, B2] = m[1].split(",").map((v) => Math.max(0, Math.min(255, Math.round(parseFloat(v))))); return "#" + [R, G2, B2].map((v) => v.toString(16).padStart(2, "0")).join(""); };
  const c = (col) => c0(hex(col)), Hb = habit(r), x = 320, y = 286;
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + 4, y + 30, 92, 11, 0, 0, TAU); ctx.fill();
  for (const dx of [-120, 120]) { ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x + dx + 3, y + 32, 21, 5.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = c(Hb.kind === "castle" ? "#1f3a30" : "#5b2b3a"); ctx.beginPath(); ctx.ellipse(x + dx, y + 14, 19, 6.5, 0, 0, TAU); ctx.fill(); ctx.fillRect(x + dx - 19, y + 14, 38, 13); ctx.fillStyle = c(Hb.kind === "castle" ? "#12241d" : "#44202c"); ctx.beginPath(); ctx.ellipse(x + dx, y + 27, 19, 5.5, 0, 0, Math.PI); ctx.fill(); } /* les poufs */
  ctx.fillStyle = c(Hb.table); for (const dx of [-74, 74]) ctx.fillRect(x + dx - 4, y + 4, 8, 26);
  ctx.beginPath(); ctx.moveTo(x - 88, y + 8); ctx.lineTo(x + 88, y + 8); ctx.lineTo(x + 80, y - 6); ctx.lineTo(x - 80, y - 6); ctx.closePath(); ctx.fillStyle = c(mix(Hb.table, "#000000", 0.2)); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 80, y - 6); ctx.lineTo(x + 80, y - 6); ctx.lineTo(x + 70, y - 18); ctx.lineTo(x - 70, y - 18); ctx.closePath(); ctx.fillStyle = c(mix(Hb.table, "#ffffff", 0.08)); ctx.fill();
  /* la partie en cours, lisible de loin : celle de la table si on y est passé, sinon celle qui est gardée ; le plateau prend tout le dessus */
  const G = (r.bk && r.bk.G) || restore(cur(r).game), n = G ? G.n : cur(r).n;
  const F = frame(n, { cx: x, top: y - 18, bot: y - 7, wT: 124, wB: 140 }), quad = (a, b2, c2, d2) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b2); ctx.lineTo(...c2); ctx.lineTo(...d2); ctx.closePath(); };
  ctx.fillStyle = c(Hb.rim[1]); quad(F.P(-0.04, 1.06), F.P(1.04, 1.06), F.P(1.04, -0.06), F.P(-0.04, -0.06)); ctx.fill();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { quad(F.P(i / n, (j + 1) / n), F.P((i + 1) / n, (j + 1) / n), F.P((i + 1) / n, j / n), F.P(i / n, j / n)); ctx.fillStyle = c(Hb.sq[(i + j) % 2]); ctx.fill(); }
  if (G) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { /* du fond vers l'avant : chaque pile, en petit relief, sa couleur au sommet */
    const st2 = G.board[j * n + i]; if (!st2.length) continue; const t = st2[st2.length - 1], [px, py] = F.P((i + 0.5) / n, (j + 0.72) / n), w = F.cellW((j + 0.5) / n) * 0.54, h = 1.3 * Math.min(st2.length, 5);
    const [top0, side] = Hb.C[t.p];
    if (t.k === "w") { ctx.fillStyle = c(side); ctx.fillRect(px - w * 0.18, py - h - 5, w * 0.36, h + 5); ctx.fillStyle = c(top0); ctx.fillRect(px - w * 0.18, py - h - 5, w * 0.36, 1.4); continue; } /* un Verrou, debout */
    const ry = w * 0.2, face = (cy) => { ctx.beginPath(); /* la forme de l'habit, comme à la table : carrée, ou octogonale au Château */
      if (Hb.shape === "oct") for (let q = 0; q < 8; q++) { const a = (q + 0.5) * TAU / 8; ctx[q ? "lineTo" : "moveTo"](px + Math.cos(a) * w / 2, cy + Math.sin(a) * ry); }
      else { ctx.moveTo(px - w / 2, cy + ry); ctx.lineTo(px + w / 2, cy + ry); ctx.lineTo(px + w / 2 - 1, cy - ry); ctx.lineTo(px - w / 2 + 1, cy - ry); }
      ctx.closePath(); };
    const half = Hb.shape === "oct" ? (w / 2) * Math.cos(TAU / 16) : w / 2;
    ctx.fillStyle = c(side); ctx.fillRect(px - half, py - h + (Hb.shape === "oct" ? 0 : ry), half * 2, h + (Hb.shape === "oct" ? ry : 0) + 0.6); face(py); ctx.fill(); /* le flanc */
    ctx.fillStyle = c(top0); face(py - h); ctx.fill(); /* le dessus */
    if (t.k === "c") { ctx.fillRect(px - w * 0.16, py - h - 3.6, w * 0.32, 3.6); } /* une Clef : un petit fût */
  }
  r.hot.push({ x: x - 90, y: y - 26, w: 180, h: 58, tip: tr("baykh.table"), go: "baykh" });
}

module.exports = { drawBaykh, loungeTable, act, state, cur, habit, frame, piece, capstone, CAPS, LEVELS };
