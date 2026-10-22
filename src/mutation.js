"use strict";
/**
 * La mutation des Âges et la symbiose (claude/DESIGN-mutation-des-ages.md ; page 19 du Rehevkor, « le couple chanté »,
 * claude/DESIGN-accord-trois-ecritures.md). Pur : l'état d'un Âge (`a`, celui de src/law.js, `state.ages[nom]`) et une
 * analyse ; aucun accès au coffre, aucune horloge propre (`now` est passé).
 *
 * - **La pression** : un Âge sous 75 l'accumule (pleine en PRESSURE_DAYS jours), un Âge stable la voit retomber (moitié
 *   par jour). Pleine, elle noue une **symbiose** : deux éléments qui se contredisent se lient et se soutiennent. Une longue
 *   absence ne compte que deux jours (comme la marge de vie de la loi 14).
 * - **L'événement rarissime** : une chance sur RARE_ODDS par jour, une seule fois par Âge, même stable (seule exception).
 * - **La symbiose** rembourse le coût de sa contradiction sur son axe : plafond CAP par Âge, chaque union suivante compte
 *   moitié moins (rendement décroissant, jamais d'empilement). Seule la symbiose née d'une mutation donne ce soutien
 *   (option A) : l'écrit, lui, achète de la capacité (src/capacity.js), jamais les deux sur la même paire.
 * - **La clef de voûte** (la pierre de vie de Serenia) : l'élément du ciel de la paire. Qu'un des deux manque, l'union tombe
 *   (loi 2, Couple : la fragilité) ; qu'il revienne, elle reprend.
 * - **Elle vieillit** (la chambre qui se fane, loi 14) : AGE_DAYS jours sans retouche de l'Âge, elle se fane (moitié du
 *   soutien) ; une retouche la ravive (`care`).
 * - **Fin par construction** : une union ne fait que rembourser une contradiction qui existe, le plafond est borné, une paire
 *   ne se noue qu'une fois : le nombre de mutations utiles est fini. Rien à nouer : pas de mutation.
 */
const { CONTRADICTION_COST } = require("./engine/rules");
const { REACTION_COST } = require("./engine/data/matter");
const { blockById } = require("./engine/registry");
const HARMFUL = new Set(["violent", "corrosive", "decaying"]); /* les réactions qui abîment : deux matières qui se contredisent */
const { fnv } = require("./util");

const DAY = 86400000;
const STABLE_AT = 75;
const PRESSURE_DAYS = 4;   // jours sous 75 pour remplir la pression
const RARE_ODDS = 300;     // l'événement rarissime : une chance sur 300 par jour, une fois par Âge
const CAP = 0.15;          // soutien total des symbioses d'un Âge (15 points)
const AGE_DAYS = 25;       // une union laissée sans retouche se fane au bout de 25 jours
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const keyOf = (a, b) => [a, b].sort().join("|");

/** L'état de mutation d'un Âge, créé à la demande. */
function stateOf(a) {
  if (!a.mut || typeof a.mut !== "object") a.mut = { pressure: 0, at: 0, list: [], rare: null, rareDay: -1 };
  if (!Array.isArray(a.mut.list)) a.mut.list = [];
  return a.mut;
}

/**
 * Ce qu'une symbiose peut nouer : deux éléments qui se contredisent. Les contradictions du ciel et de la matière
 * (`triggered`) et les réactions qui abîment (violente, corrosive, qui pourrit : l'eau et la lave). Écrites seulement
 * (une page tirée est réglée par les cicatrices), hors fissure. Rendu normalisé : { a, b, axis, cost, kind }.
 */
function bindable(r) {
  const res = r && r.resolved; if (!res) return [];
  const drawn = new Set((res.drawn || []).map((p) => p.id)), fis = (x) => x === "fissure" || /_fissure$/.test(x);
  const out = [];
  for (const c of res.triggered || []) if (c && c.a && c.b && CONTRADICTION_COST[c.severity] && !drawn.has(c.a) && !drawn.has(c.b) && !fis(c.a) && !fis(c.b)) out.push({ a: c.a, b: c.b, axis: c.axis || "cosmological", cost: CONTRADICTION_COST[c.severity], kind: "clash" });
  for (const x of (res.matter && res.matter.reactions) || []) {
    if (!x || !HARMFUL.has(x.type) || drawn.has(x.a) || drawn.has(x.b) || fis(x.a) || fis(x.b)) continue;
    const cost = x.cost != null ? x.cost : REACTION_COST[x.type], rb = blockById.get(x.result) || blockById.get(x.shown);
    if (cost > 0) out.push({ a: x.a, b: x.b, axis: (rb && rb.axis) || "geological", cost, kind: "reaction" });
  }
  return out;
}
/** La clef de voûte d'une paire : l'élément du ciel s'il y en a un, sinon le plus lourd (à égalité, le premier) : c'est lui que la fragilité vise. */
function keystoneOf(c) {
  const A = blockById.get(c.a), B = blockById.get(c.b);
  if (c.kind === "clash") return c.a;
  return (B && A && (B.weight || 0) > (A.weight || 0)) ? c.b : c.a;
}

/** Le soutien de la i-ème union (0, 1, 2…) : plafond partagé, moitié moins à chaque union. */
function shareOf(i) { return CAP * Math.pow(0.5, i); } /* 0,15 ; 0,075 ; 0,0375… : le total reste borné par CAP (applySymbioses, `left`) */

/**
 * Applique les symbioses d'un Âge à son analyse (sans rien changer à l'état) : chaque union dont les deux éléments sont là
 * rembourse le coût de sa contradiction, dans la limite de sa part et du plafond. Renvoie une analyse neuve, avec
 * `symbioses` : [{ a, b, keystone, axis, active, withered, support }] (support en points 0..1).
 */
function applySymbioses(r, a, now) {
  const list = a && a.mut && Array.isArray(a.mut.list) ? a.mut.list : [];
  if (!r || !list.length) return r;
  const live = new Map(bindable(r).map((c) => [keyOf(c.a, c.b), c]));
  const axes = { ...(r.axisStability || {}) }, out = [];
  let left = CAP, rank = 0;
  for (const s of list) {
    if (s.type !== "symbiosis") continue;
    const c = live.get(keyOf(s.a, s.b)), withered = !!(s.cared > 0 && now - s.cared >= AGE_DAYS * DAY);
    if (!c) { out.push({ a: s.a, b: s.b, keystone: s.keystone, axis: s.axis, active: false, withered, support: 0 }); continue; }
    const axis = c.axis || s.axis || "cosmological";
    let support = Math.min(c.cost, shareOf(rank), left) * (withered ? 0.5 : 1);
    support = Math.max(0, support); left -= support; rank++;
    if (axes[axis] != null) axes[axis] = Math.min(100, Math.round(axes[axis] + support * 100));
    out.push({ a: s.a, b: s.b, keystone: s.keystone, axis, active: true, withered, support });
  }
  const vals = Object.values(axes), min = vals.length ? Math.min(...vals) : r.stability;
  const stability = Math.min(100, Math.max(r.stability, min)); /* une union ne fait jamais baisser un Âge */
  return { ...r, axisStability: axes, stability, verdict: stability >= STABLE_AT ? "stable" : stability >= 40 ? "unstable" : "dying", symbioses: out };
}

/** La tension d'un Âge : la somme des coûts de ses contradictions encore à nouer (celles qu'aucune union ne tient). */
function tensionOf(r, a) {
  const tied = new Set(((a && a.mut && a.mut.list) || []).map((s) => keyOf(s.a, s.b)));
  return bindable(r).filter((c) => !tied.has(keyOf(c.a, c.b))).reduce((n, c) => n + c.cost, 0);
}

/** L'union à nouer : la contradiction encore libre la plus coûteuse (à égalité, la première par ordre alphabétique : reproductible). */
function pickPair(r, a) {
  const tied = new Set(stateOf(a).list.map((s) => keyOf(s.a, s.b)));
  const free = bindable(r).filter((c) => !tied.has(keyOf(c.a, c.b)));
  if (!free.length) return null;
  free.sort((x, y) => y.cost - x.cost || keyOf(x.a, x.b).localeCompare(keyOf(y.a, y.b)));
  return free[0];
}

/**
 * Le temps passe pour un Âge (à chaque lecture qui n'est pas un essai) : la pression monte ou retombe ; pleine, ou à
 * l'événement rarissime, une symbiose se noue. `stability` : la stabilité du monde (avant les unions). Renvoie la mutation
 * née maintenant ({ type, a, b, keystone, axis, rare }) ou null. Le plafond atteint, plus rien ne se noue.
 */
function tick(a, r, name, now) {
  if (!a || !r) return null;
  const m = stateOf(a), dt = m.at > 0 ? Math.min(2, Math.max(0, (now - m.at) / DAY)) : 0; m.at = now;
  const stable = r.stability >= STABLE_AT;
  m.pressure = stable ? (m.pressure || 0) * Math.pow(0.5, dt) : clamp((m.pressure || 0) + dt / PRESSURE_DAYS);
  const used = m.list.filter((s) => s.type === "symbiosis").length;
  if (used >= 4) return null; /* au-delà de quatre unions, la part de la suivante est négligeable : la suite est finie */
  let rare = false;
  const day = Math.floor(now / DAY);
  if (m.rare == null && m.rareDay !== day) { m.rareDay = day; if (fnv(`${name}|rare|${day}`) % RARE_ODDS === 0) rare = true; }
  if (!(m.pressure >= 1) && !rare) return null;
  const c = pickPair(r, a);
  if (!c) { if (m.pressure >= 1) m.pressure = 0; return null; } /* rien à nouer : la pression retombe sans rien changer */
  const s = { type: "symbiosis", a: c.a, b: c.b, kind: c.kind, keystone: keystoneOf(c), axis: c.axis, at: now, cared: now, rare };
  m.list.push(s); m.pressure = 0; if (rare) m.rare = now;
  return s;
}

/** Une retouche de l'Âge (la loi du changement l'a vue) : ses unions sont ravivées. */
function care(a, now) { if (a && a.mut && Array.isArray(a.mut.list)) for (const s of a.mut.list) s.cared = now; }

module.exports = { applySymbioses, tick, care, tensionOf, bindable, keystoneOf, pickPair, stateOf, shareOf, CAP, PRESSURE_DAYS, RARE_ODDS, AGE_DAYS, DAY };
