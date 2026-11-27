"use strict";
/**
 * Baykh (« le lien »), le jeu des routes du salon (pur, sans dessin). Règles d'après le Tak de James Ernest et Patrick Rothfuss.
 *
 * Deux joueurs : 0 (les claires, qui commencent toujours) et 1 (les sombres). Chacun a une réserve de pierres et de Clefs de voûte.
 * À son tour, on pose une pièce sur une case vide (une Voie couchée « f », un Verrou debout « w », ou une Clef de voûte « c »),
 * ou l'on déplace une pile dont on tient le sommet : on en prend au plus `n` pièces par le haut, on va en ligne droite et on en laisse
 * au moins une par case (on sème par le bas de ce qu'on porte). Rien ne se pose sur un Verrou ni sur une Clef ; une Clef seule,
 * en fin de course, écrase un Verrou (il redevient une Voie). Au premier tour, chacun pose une Voie de l'autre.
 * On gagne par une route : une chaîne de cases voisines (pas en diagonale), sommet à soi, Voie ou Clef, d'un bord à l'autre bord.
 * Un coup qui fait deux routes : celle du joueur qui joue gagne. Sinon, plateau plein ou réserve vide : les Voies au sommet comptent.
 *
 * Une pile est un tableau du bas vers le haut ; une pièce est { p: 0 | 1, k: "f" | "w" | "c" }.
 */
const RESERVE = { 3: [10, 0], 4: [15, 0], 5: [21, 1], 6: [30, 1], 7: [40, 2], 8: [50, 2] };
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function newGame(n = 5) {
  n = Math.max(3, Math.min(8, n | 0 || 5)); const [s, c] = RESERVE[n];
  return { n, board: Array.from({ length: n * n }, () => []), res: [{ s, c }, { s, c }], turn: 0, ply: 0, end: null, last: null };
}
const top = (G, i) => { const st = G.board[i]; return st.length ? st[st.length - 1] : null; };
const clone = (G) => ({ ...G, board: G.board.map((s) => s.slice()), res: G.res.map((r) => ({ ...r })) });

/** Les coups possibles pour le joueur dont c'est le tour. Un coup : { t: "p", i, k } (poser) ou { t: "m", i, d, drops } (déplacer). */
function moves(G) {
  if (G.end) return [];
  const { n, turn } = G, out = [], R = G.res[turn], first = G.ply < 2;
  for (let i = 0; i < n * n; i++) {
    if (G.board[i].length) continue;
    if (first) { out.push({ t: "p", i, k: "f" }); continue; }
    if (R.s > 0) { out.push({ t: "p", i, k: "f" }); out.push({ t: "p", i, k: "w" }); }
    if (R.c > 0) out.push({ t: "p", i, k: "c" });
  }
  if (first) return out;
  for (let i = 0; i < n * n; i++) {
    const st = G.board[i], h = st.length; if (!h || st[h - 1].p !== turn) continue;
    const x0 = i % n, y0 = (i / n) | 0, capTop = st[h - 1].k === "c";
    for (let d = 0; d < 4; d++) {
      const [dx, dy] = DIRS[d]; let free = 0, crush = false; /* jusqu'où peut-on aller : cases libres, puis peut-être un Verrou à écraser */
      for (let x = x0 + dx, y = y0 + dy; x >= 0 && y >= 0 && x < n && y < n; x += dx, y += dy) {
        const tp = top(G, y * n + x); if (!tp || tp.k === "f") { free++; continue; }
        if (tp.k === "w" && capTop) crush = true; break; }
      const maxC = Math.min(n, h);
      for (let carry = 1; carry <= maxC; carry++) {
        /* toutes les façons de semer `carry` pièces sur 1..free cases (au moins une par case) */
        const rec = (left, steps, acc) => {
          if (left === 0) { out.push({ t: "m", i, d, drops: acc.slice() }); return; }
          if (steps >= free) return;
          for (let k = 1; k <= left; k++) { acc.push(k); rec(left - k, steps + 1, acc); acc.pop(); } };
        rec(carry, 0, []);
        if (crush && free + 1 <= carry) { /* finir sur le Verrou : la dernière case reçoit la Clef seule */
          const rec2 = (left, steps, acc) => { if (steps === free) { if (left === 1) out.push({ t: "m", i, d, drops: [...acc, 1] }); return; }
            for (let k = 1; k <= left - 1; k++) { acc.push(k); rec2(left - k, steps + 1, acc); acc.pop(); } };
          rec2(carry, 0, []);
        }
      }
    }
  }
  return out;
}

/** Joue un coup (sans vérifier qu'il est légal : `legal` le fait) ; rend une nouvelle partie. */
function apply(G0, mv) {
  const G = clone(G0), { n, turn } = G, owner = G.ply < 2 ? 1 - turn : turn;
  if (mv.t === "p") { G.board[mv.i].push({ p: owner, k: mv.k }); if (mv.k === "c") G.res[owner].c--; else G.res[owner].s--; }
  else {
    const st = G.board[mv.i], carry = mv.drops.reduce((a, b) => a + b, 0), hand = st.splice(st.length - carry, carry), [dx, dy] = DIRS[mv.d];
    let x = mv.i % n, y = (mv.i / n) | 0;
    for (const k of mv.drops) { x += dx; y += dy; const dst = G.board[y * n + x], tp = dst[dst.length - 1];
      if (tp && tp.k === "w") dst[dst.length - 1] = { p: tp.p, k: "f" }; /* la Clef écrase le Verrou */
      dst.push(...hand.splice(0, k)); }
  }
  G.last = mv; G.ply++; G.turn = 1 - turn; G.end = verdict(G, turn); return G;
}
const same = (a, b) => a.t === b.t && a.i === b.i && (a.t === "p" ? a.k === b.k : a.d === b.d && a.drops.join() === b.drops.join());
function legal(G, mv) { return moves(G).some((m) => same(m, mv)); }

/** La route d'un joueur, s'il en a une : les cases qui la font (pour l'éclairer), sinon null. */
function road(G, p) {
  const { n } = G, mine = (i) => { const t = top(G, i); return t && t.p === p && t.k !== "w"; };
  for (const axis of [0, 1]) {
    const start = [], prev = new Map();
    for (let k = 0; k < n; k++) { const i = axis ? k : k * n; if (mine(i)) { start.push(i); prev.set(i, -1); } } /* bord gauche (axe 0) ou haut (axe 1) */
    const q = start.slice();
    while (q.length) { const i = q.shift(), x = i % n, y = (i / n) | 0;
      if ((axis === 0 && x === n - 1) || (axis === 1 && y === n - 1)) { const path = []; for (let j = i; j !== -1; j = prev.get(j)) path.push(j); return path; }
      for (const [dx, dy] of DIRS) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const j = Y * n + X; if (prev.has(j) || !mine(j)) continue; prev.set(j, i); q.push(j); } }
  }
  return null;
}
const flats = (G, p) => G.board.reduce((a, st) => a + (st.length && st[st.length - 1].p === p && st[st.length - 1].k === "f" ? 1 : 0), 0);

/** La fin, après le coup de `mover` : { win: 0 | 1 | -1 (nul), by: "road" | "flats", path? }. */
function verdict(G, mover) {
  const rm = road(G, mover), ro = road(G, 1 - mover);
  if (rm) return { win: mover, by: "road", path: rm };
  if (ro) return { win: 1 - mover, by: "road", path: ro };
  const full = G.board.every((st) => st.length), out = G.res.some((r) => r.s + r.c === 0);
  if (full || out) { const a = flats(G, 0), b = flats(G, 1); return { win: a > b ? 0 : b > a ? 1 : -1, by: "flats", count: [a, b] }; }
  return null;
}

/* ---------------------------------------------------------------- l'adversaire ---------------------------------------------------------------- */

/** Combien de cases manquent encore à `p` pour faire une route (0-1 : ses pièces de route ne coûtent rien, une case vide coûte 1, le reste barre). */
function gap(G, p) {
  const { n } = G, cost = (i) => { const t = top(G, i); if (!t) return 1; if (t.p === p && t.k !== "w") return 0; return Infinity; };
  let best = Infinity;
  for (const axis of [0, 1]) {
    const dist = new Array(n * n).fill(Infinity), dq = [];
    for (let k = 0; k < n; k++) { const i = axis ? k : k * n, c = cost(i); if (c < Infinity) { dist[i] = c; c ? dq.push(i) : dq.unshift(i); } }
    while (dq.length) { const i = dq.shift(), x = i % n, y = (i / n) | 0;
      for (const [dx, dy] of DIRS) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const j = Y * n + X, c = cost(j); if (c === Infinity) continue;
        const nd = dist[i] + c; if (nd < dist[j]) { dist[j] = nd; c ? dq.push(j) : dq.unshift(j); } } }
    for (let k = 0; k < n; k++) { const i = axis ? (n - 1) * n + k : k * n + n - 1; best = Math.min(best, dist[i]); } /* on arrive au bord opposé à celui d'où l'on part (avant 2.11.4, les deux axes étaient mélangés) */
  }
  return best;
}
/** La valeur d'une position pour `p` : sa route plus proche que celle de l'autre, ses Voies au sommet, ses piles tenues. */
function score(G, p) {
  if (G.end) return G.end.win === p ? 1e6 : G.end.win === -1 ? 0 : -1e6;
  const q = 1 - p, gm = gap(G, p), go = gap(G, q), big = G.n * 2;
  let s = ((go === Infinity ? big : go) - (gm === Infinity ? big : gm)) * 30 + (flats(G, p) - flats(G, q)) * 6;
  for (const st of G.board) { if (!st.length) continue; const t = st[st.length - 1], w = t.p === p ? 1 : -1; s += w * (st.length - 1) * 2; if (t.k === "c") s += w * 4; }
  if (G.turn === p && gm === 1) s += 200; if (G.turn === q && go === 1) s -= 400; /* une route à un coup : à prendre, ou à barrer d'urgence */
  return s;
}
/** Le coup de la machine. Niveaux : "easy" (prend une route offerte, sinon presque au hasard), "mid" (le meilleur coup à un pas,
 *  et ne laisse pas une route à un coup), "hard" (une recherche de plusieurs coups dans un quart de seconde, `search`). `rnd` : un hasard, pour varier. */
function think(G, level = "mid", rnd = Math.random) {
  const me = G.turn, all = moves(G); if (!all.length) return null;
  const wins = all.filter((m) => { const H = apply(G, m); return H.end && H.end.win === me; }); if (wins.length) return wins[Math.floor(rnd() * wins.length)];
  if (G.ply < 2) { const n = G.n, corners = all.filter((m) => [0, n - 1, n * (n - 1), n * n - 1].includes(m.i)); return (corners.length ? corners : all)[Math.floor(rnd() * (corners.length || all.length))]; } /* au premier tour, on donne à l'autre une Voie dans un coin */
  const loseNext = (H) => moves(H).some((m) => { const K = apply(H, m); return K.end && K.end.win === 1 - me; });
  if (level === "easy") {
    const pool = all.filter((m) => m.t === "p" ? m.k !== "c" || rnd() < 0.2 : rnd() < 0.3);
    if (rnd() < 0.5) { const safe = pool.filter((m) => !loseNext(apply(G, m))); if (safe.length) return safe[Math.floor(rnd() * safe.length)]; }
    return (pool.length ? pool : all)[Math.floor(rnd() * (pool.length || all.length))];
  }
  if (level === "hard") return search(G, rnd);
  const ranked = all.map((m) => { const H = apply(G, m); return { m, H, v: score(H, me) + rnd() * 3 }; }).sort((a, b) => b.v - a.v);
  for (const r of ranked.slice(0, 12)) if (!loseNext(r.H)) return r.m; return ranked[0].m;
}

/* ---------------------------------------------------------------- le difficile (2.11.4) ---------------------------------------------------------------- */
/* Une recherche alpha-bêta en approfondissement progressif, dans un quart de seconde, et un jugement plus fin des positions.
 * Mesurée contre l'ancien difficile : 20-0 en 5×5, 7-1 en 6×6, 6-0 en 7×7 et 8×8, 12-8 en 4×4 (claude/MESURE-baykh-difficile.md). */
const BIG = 1e9;
/** L'écart de route, en coût (Dijkstra à seaux) : ma Voie ou ma Clef 0, case vide 1, Voie adverse 2 (on la prend en montant dessus),
 *  mon Verrou 2, Verrou adverse 4 (seule ma Clef l'écrase), Clef adverse : barrage. */
function gapCost(G, p) {
  const { n } = G, N = n * n, cost = new Int32Array(N);
  for (let i = 0; i < N; i++) { const t = top(G, i); cost[i] = !t ? 1 : t.p === p ? (t.k === "w" ? 2 : 0) : t.k === "f" ? 2 : t.k === "w" ? 4 : 999; }
  let best = BIG; const dist = new Int32Array(N), maxD = 4 * N + 1;
  for (let axis = 0; axis < 2; axis++) {
    dist.fill(1e8); const buckets = Array.from({ length: maxD + 1 }, () => []); let found = BIG;
    for (let k = 0; k < n; k++) { const i = axis ? k : k * n; if (cost[i] < 999) { dist[i] = cost[i]; buckets[cost[i]].push(i); } }
    const relax = (j, d) => { const c = cost[j]; if (c >= 999) return; const nd = d + c; if (nd < dist[j] && nd <= maxD) { dist[j] = nd; buckets[nd].push(j); } };
    for (let d = 0; d <= maxD && d < found; d++) { const bk = buckets[d];
      for (let q = 0; q < bk.length; q++) { const u = bk[q]; if (dist[u] !== d) continue; const x = u % n, y = (u / n) | 0;
        if ((axis === 0 && x === n - 1) || (axis === 1 && y === n - 1)) { found = d; break; }
        if (x > 0) relax(u - 1, d); if (x < n - 1) relax(u + 1, d); if (y > 0) relax(u - n, d); if (y < n - 1) relax(u + n, d); } }
    best = Math.min(best, found);
  }
  return best;
}
/** La valeur d'une position pour `p`, au niveau difficile. */
function judge(G, p) {
  if (G.end) return G.end.win === p ? 1e6 - G.ply : G.end.win === -1 ? 0 : -1e6 + G.ply;
  const q = 1 - p, big = G.n * 3, gm = Math.min(gapCost(G, p), big), go = Math.min(gapCost(G, q), big);
  let s = (go - gm) * 40 + (flats(G, p) - flats(G, q)) * 10;
  for (const st of G.board) { const h = st.length; if (!h) continue; const t = st[h - 1], w = t.p === p ? 1 : -1;
    let own = 0; for (const pc of st) if (pc.p === t.p) own++; s += w * (own * 3 + (h - own)); /* tenir une pile, et ce qu'elle a pris */
    if (t.k === "c") s += w * 15; if (t.k === "w") s += w * 4; }
  s += (G.res[p].s - G.res[q].s) * 1.5;
  if (G.turn === p) s += 10; /* l'initiative */
  return s;
}
function search(G, rnd, budget = 250) {
  const me = G.turn, t0 = Date.now(), all = moves(G);
  const wins = all.filter((m) => { const H = apply(G, m); return H.end && H.end.win === me; }); if (wins.length) return wins[0];
  let timeout = false;
  const late = () => Date.now() - t0 > budget;
  function nega(H, depth, a, b) {
    if (late()) { timeout = true; return 0; }
    if (H.end || depth === 0) return judge(H, H.turn);
    if (depth === 1) { let best = -BIG, k = 0; for (const m of moves(H)) { const K = apply(H, m), v = -judge(K, K.turn); if (v > best) best = v; if (best >= b) break; if ((++k & 31) === 0 && late()) { timeout = true; return 0; } } return best; }
    let ms = moves(H).map((m) => { const K = apply(H, m); return { K, o: -judge(K, K.turn) }; }); if (late()) { timeout = true; return 0; }
    ms.sort((x, y) => y.o - x.o); if (depth <= 2 && ms.length > 24) ms = ms.slice(0, 24); /* près des feuilles, seuls les coups prometteurs */
    let best = -BIG;
    for (const { K } of ms) { const v = -nega(K, depth - 1, -b, -a); if (timeout) return 0; if (v > best) best = v; if (v > a) a = v; if (a >= b) break; }
    return best;
  }
  let root = all.map((m) => { const K = apply(G, m); return { m, K, v: -judge(K, K.turn) + rnd() * 2 }; }).sort((x, y) => y.v - x.v), bestM = root[0].m;
  const W = G.n <= 5 ? root.length : G.n === 6 ? 30 : 18; /* sur les grands plateaux, seuls les coups les plus prometteurs sont vus à fond */
  for (let depth = 2; depth <= 8; depth++) {
    let a = -BIG, bm = null; const scored = [];
    for (const r of root.slice(0, W)) { const v = -nega(r.K, depth - 1, -BIG, -a); if (timeout) break; r.s = v + rnd() * 2; scored.push(r); if (r.s > a) { a = r.s; bm = r.m; } }
    if (timeout) { if (bm && scored.length > Math.min(W, root.length) / 3) bestM = bm; break; } /* une profondeur à moitié vue : on ne garde son meilleur que si elle a vu assez de coups */
    bestM = bm; root = scored.sort((x, y) => y.s - x.s).concat(root.slice(W));
    if (Math.abs(a) > 5e5) break; /* une fin vue : inutile de chercher plus loin */
  }
  return bestM;
}

module.exports = { RESERVE, DIRS, newGame, moves, apply, legal, road, flats, verdict, gap, gapCost, score, judge, think, top };
