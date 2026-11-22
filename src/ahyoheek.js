"use strict";
/*
 * Ahyoheek, le jeu des trois signes (modèle pur, sans dessin) : le scarabée bat la plume, la plume bat le livre, le livre bat le scarabée.
 * De deux à cinq joueurs (toi et un à quatre adversaires, autour d'une table à cinq places). Chaque manche, tout le monde montre un signe en même temps ; chacun compte, contre
 * chaque autre joueur, +1 s'il le bat et −1 s'il est battu. Le meilleur total, s'il est positif, gagne la manche et emporte un objet du
 * signe qu'il a joué (plusieurs gagnants à égalité : chacun le sien). Le premier qui a trois objets d'un même signe gagne la partie ;
 * si plusieurs y arrivent dans la même manche, le plus d'objets en tout ; encore à égalité, des manches décisives entre eux seuls.
 * Les adversaires ont chacun un caractère (le fidèle, l'imitateur, le malin, le collectionneur, le méfiant), plus ou moins suivi selon le niveau ;
 * au niveau difficile, ils lisent tes habitudes. Le rang monte d'un cran à chaque partie gagnée et descend d'un à chaque partie perdue.
 * Rien ne se gagne d'autre que le rang (pour l'instant).
 */
const SIGNS = ["beetle", "pen", "page"];
const CHARS = ["faithful", "mimic", "sly", "collector", "wary"];
const LEVELS = ["easy", "mid", "hard"];
const beats = (a, b) => (a === "beetle" && b === "pen") || (a === "pen" && b === "page") || (a === "page" && b === "beetle");
const beaterOf = (s) => SIGNS.find((x) => beats(x, s));
const pick = (rnd) => SIGNS[Math.min(2, Math.floor(rnd() * 3))];
/** Le niveau joué : fixé, ou d'après le rang (0–2 facile, 3–5 moyen, 6 et plus difficile). */
const levelOf = (level, rank) => (LEVELS.includes(level) ? level : (rank || 0) < 3 ? "easy" : (rank || 0) < 6 ? "mid" : "hard");

/** Une partie neuve. o : { n (adversaires, 1 à 4), level ("easy" | "mid" | "hard" | "rank"), rank, rnd } */
function newGame(o = {}) {
  const rnd = o.rnd || Math.random, n = Math.max(1, Math.min(4, o.n | 0 || 2)), pool = CHARS.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const G = { level: levelOf(o.level, o.rank), phase: "choose", me: { won: {}, pts: null, play: null }, opp: [], hist: [], round: 0, sudden: null, winners: null, pending: null, end: null, said: { k: "choose" } };
  for (let i = 0; i < n; i++) G.opp.push({ char: pool[i % pool.length], fav: pick(rnd), won: {}, pts: null, play: null });
  return G;
}
const all = (G) => [G.me, ...G.opp];
const total = (p) => SIGNS.reduce((a, s) => a + (p.won[s] || 0), 0);

/** Ce que je vais probablement jouer, vu par un adversaire qui m'observe (deep : il retient ce qui suit d'habitude mon dernier coup). */
function predictMe(G, deep) {
  const h = G.hist; if (!h.length) return null;
  const near = SIGNS.filter((s) => (G.me.won[s] || 0) === 2);
  if (deep) { const last = h[h.length - 1], next = {}, freq = {}; for (let i = 0; i + 1 < h.length; i++) if (h[i] === last) next[h[i + 1]] = (next[h[i + 1]] || 0) + 1;
    h.slice(-8).forEach((s) => (freq[s] = (freq[s] || 0) + 1)); near.forEach((s) => (freq[s] = (freq[s] || 0) + 2));
    const score = (s) => (next[s] || 0) * 2 + (freq[s] || 0); return SIGNS.slice().sort((a, b) => score(b) - score(a))[0]; }
  return near.length ? near[0] : h[h.length - 1];
}

/** Le coup d'un adversaire : son caractère, plus ou moins suivi selon le niveau ; plus haut, il pare ce qui me ferait gagner, ou me lit. */
function oppPlay(G, o, rnd = Math.random) {
  const L = G.level, last = G.hist[G.hist.length - 1], habit = L === "easy" ? 0.8 : L === "mid" ? 0.5 : 0.35, r = rnd();
  const mine = SIGNS.filter((s) => (o.won[s] || 0) > 0).sort((a, b) => (o.won[b] || 0) - (o.won[a] || 0))[0];
  if (L === "hard" && r < 0.55) { const p = predictMe(G, true); if (p) return beaterOf(p); }
  if (L !== "easy" && r < (L === "hard" ? 0.7 : 0.3)) { const near = SIGNS.find((s) => (G.me.won[s] || 0) === 2); if (near) return beaterOf(near); if (mine && (o.won[mine] || 0) === 2) return mine; }
  if (rnd() < habit) {
    if (o.char === "faithful") return o.fav;
    if (o.char === "mimic") return last || o.fav;
    if (o.char === "sly") return last ? beaterOf(last) : o.fav;
    if (o.char === "collector") return mine || o.fav;
    if (o.char === "wary") { const p = predictMe(G, false); return p ? beaterOf(p) : o.fav; }
  }
  return pick(rnd);
}

/** Je joue `sign` : les adversaires jouent, la manche se compte. Renvoie vrai si la manche a eu lieu. G.said dit quoi annoncer. */
function play(G, sign, rnd = Math.random) {
  if (!G || G.phase !== "choose" || !SIGNS.includes(sign)) return false;
  G.round++; G.me.play = sign; G.opp.forEach((o) => (o.play = oppPlay(G, o, rnd)));
  const A = all(G);
  A.forEach((p) => { p.pts = 0; A.forEach((q) => { if (p !== q) { if (beats(p.play, q.play)) p.pts++; else if (beats(q.play, p.play)) p.pts--; } }); });
  const eligible = G.sudden ? A.filter((p, i) => G.sudden.includes(i)) : A, best = Math.max(...eligible.map((p) => p.pts));
  const win = best > 0 ? eligible.filter((p) => p.pts === best) : [];
  G.winners = win.map((p) => A.indexOf(p)); G.hist.push(sign);
  if (G.sudden) {
    if (win.length === 1) { finish(G, G.winners[0], { k: "sudden" }); return true; }
    G.phase = "reveal"; G.said = { k: "suddenAgain" }; G.pending = { sudden: G.sudden }; return true;
  }
  win.forEach((p) => (p.won[p.play] = (p.won[p.play] || 0) + 1));
  G.phase = "reveal"; G.said = win.length ? { k: "won", who: G.winners.map((i) => ({ i, sign: A[i].play })) } : { k: "nobody" };
  const done = A.map((p, i) => [i, SIGNS.some((s) => (p.won[s] || 0) >= 3)]).filter(([, d]) => d).map(([i]) => i);
  if (done.length === 1) G.pending = { end: done[0], why: { k: "three", sign: SIGNS.find((s) => (A[done[0]].won[s] || 0) >= 3) } };
  else if (done.length > 1) { const m = Math.max(...done.map((i) => total(A[i]))), top = done.filter((i) => total(A[i]) === m);
    G.pending = top.length === 1 ? { end: top[0], why: { k: "total" } } : { sudden: top }; }
  return true;
}

/** Après la manche montrée : on passe à la suivante (ou à la fin, ou aux manches décisives). */
function next(G) {
  if (!G || G.phase !== "reveal") return false;
  const p = G.pending; G.pending = null;
  if (p && p.end != null) { finish(G, p.end, p.why); return true; }
  G.phase = "choose"; G.winners = null; all(G).forEach((q) => { q.pts = null; q.play = null; });
  if (p && p.sudden) { G.sudden = p.sudden; G.said = { k: "sudden", who: p.sudden }; } else G.said = { k: "choose" };
  return true;
}
function finish(G, i, why) { G.phase = "won"; G.winners = [i]; G.end = { i, why }; G.said = { k: "end", i, why }; }
/** Le rang après une partie finie (une fois par partie) : +1 si je gagne, −1 sinon, jamais sous zéro. */
function rankAfter(G, rank) { if (!G || G.phase !== "won" || !G.end) return rank || 0; return Math.max(0, (rank || 0) + (G.end.i === 0 ? 1 : -1)); }

module.exports = { SIGNS, CHARS, LEVELS, beats, beaterOf, levelOf, newGame, oppPlay, predictMe, play, next, rankAfter, total };
