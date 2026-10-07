"use strict";
/**
 * Couche physique : du bloc `age` à un monde physique cohérent.
 *
 *   1. les blocs et les lignes de valeurs (`mass: 2`, `age: 1.5`…) fixent une partie des paramètres ;
 *   2. le reste est TIRÉ de la graine de l'Âge, sous contraintes : on essaie plusieurs mondes
 *      possibles (toujours les mêmes pour la même graine) et l'on garde celui qui tient le mieux
 *      ce que l'auteur a écrit ;
 *   3. on calcule les grandeurs dérivées (lois de model.js) ;
 *   4. on liste ce qui ne tient pas (exigences de rules.js), avec pourquoi et comment s'en sortir.
 *
 * Rien ici ne touche au tirage des pages du moteur ni à la stabilité : c'est index.js qui décide,
 * selon le mode (facile / strict), ce que l'on en fait.
 */
const M = require("./model");
const { BLOCKS, HUE_MASS } = require("./blocks");
const { REQUIREMENTS, ASSERTIONS } = require("./rules");
const { hashSeed, rng } = require("../engine/draw");

const SEV_COST = { light: 0.1, medium: 0.2, strong: 0.35 };
const SEV_RANK = { light: 1, medium: 2, strong: 3 };
const CANDIDATES = 48;

// ---- lignes de valeurs ------------------------------------------------------------------------------
const KEYS = {
  mass: "mass", masse: "mass",
  radius: "radius", rayon: "radius",
  age: "age", "âge": "age",
  orbit: "orbit", orbite: "orbit", distance: "orbit",
  insolation: "insolation", flux: "insolation",
  star_mass: "starMass", "masse_étoile": "starMass", masse_etoile: "starMass",
  rotation: "rotation", spin: "rotation",
  core: "core", noyau: "core",
  atmosphere: "atmosphere", "atmosphère": "atmosphere", pressure: "atmosphere", pression: "atmosphere",
  water: "water", eau: "water",
  volatiles: "volatiles",
  albedo: "albedo", "albédo": "albedo",
  tides: "tides", "marées": "tides", marees: "tides",
};
const PHYS_RE = new RegExp(`^\\s*(${Object.keys(KEYS).join("|")})\\s*[:=]\\s*(.+?)\\s*$`, "i");
const WORDS = {
  core: { liquid: "liquid", liquide: "liquid", molten: "liquid", "fondu": "liquid", solid: "solid", solide: "solid", "figé": "solid", fige: "solid", frozen: "solid", none: "none", aucun: "none" },
  atmosphere: { none: "none", aucune: "none", vide: "none", thin: "thin", mince: "thin", "ténue": "thin", dense: "dense", thick: "dense", "épaisse": "dense", epaisse: "dense" },
};

/** Lit les lignes de valeurs physiques d'un bloc `age`. Renvoie `{ params, asserts }` (asserts : exigences écrites en mots). */
function parsePhysics(src) {
  const params = {}, asserts = [];
  for (const line of String(src || "").split("\n")) {
    const m = line.match(PHYS_RE); if (!m) continue;
    const key = KEYS[m[1].toLowerCase()], raw = m[2].trim().toLowerCase();
    const word = WORDS[key] && WORDS[key][raw];
    if (word) {
      if (key === "core") { if (word === "none") params.core = 0.02; else asserts.push("core_" + word); }
      if (key === "atmosphere") asserts.push("atmosphere_" + word);
      continue;
    }
    const n = raw.match(/^(-?\d+(?:[.,]\d+)?)\s*([a-zé]*)$/i); if (!n) continue;
    let v = Number(n[1].replace(",", ".")); const unit = n[2];
    if (!isFinite(v) || v < 0) continue;
    if (key === "age" && /^(ma|myr|my)$/.test(unit)) v /= 1000;
    if (key === "rotation" && /^(d|j|days?|jours?)$/.test(unit)) v *= 24;
    if (key === "core") { params.core = M.clamp(v, 0, 0.8); continue; }
    params[key] = v;
  }
  return { params, asserts };
}

// ---- tirage ----------------------------------------------------------------------------------------------
const logU = (r, a, b) => Math.exp(Math.log(a) + r() * (Math.log(b) - Math.log(a)));
function gauss(r) { const u = Math.max(r(), 1e-12), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const logN = (r, mid, sigma, lo, hi) => M.clamp(mid * Math.exp(sigma * gauss(r)), lo, hi);

/** Ce que les blocs écrits fixent : nombre d'étoiles, couleurs, lune, géante, albédo… */
function blockSettings(ids) {
  const s = { stars: null, hues: [], moon: false, giantHost: false, locked: false, chaoticAxis: false, binary: null, veil: 1, albedoAdd: 0, coreAdd: 0, water: null };
  for (const id of ids) {
    const b = BLOCKS[id]; if (!b || !b.set) continue;
    const t = b.set;
    if (t.stars != null) s.stars = s.stars == null ? t.stars : Math.max(s.stars, t.stars);
    if (t.hue && s.hues.length < 2) s.hues.push(t.hue);
    if (t.moon) s.moon = true;
    if (t.giantHost) s.giantHost = true;
    if (t.locked) s.locked = true;
    if (t.chaoticAxis) s.chaoticAxis = true;
    if (t.binary) s.binary = t.binary;
    if (t.veil) s.veil *= t.veil;
    if (t.albedoAdd) s.albedoAdd += t.albedoAdd;
    if (t.coreAdd) s.coreAdd += t.coreAdd;
    if (t.water != null) s.water = s.water == null ? t.water : t.water < 0.1 || s.water < 0.1 ? Math.min(s.water, t.water) : Math.max(s.water, t.water);
  }
  if (s.stars == null) s.stars = s.hues.length >= 2 ? 2 : 1;
  return s;
}

/** Un monde possible (paramètres libres tirés, paramètres écrits respectés). */
function candidate(r, set, written) {
  const stars = set.stars;
  const starMasses = [];
  for (let i = 0; i < stars; i++) {
    const hue = set.hues[i] || (i > 0 ? set.hues[0] : null);
    const range = hue ? HUE_MASS[hue] : [0.7, 1.3];
    starMasses.push(i === 0 && written.starMass ? written.starMass : logU(r, range[0], range[1]));
  }
  const p = {
    starMasses,
    S: written.insolation != null ? written.insolation : stars === 0 ? 0 : logN(r, 1, 0.35, 0.2, 3),
    orbit: written.orbit,
    M: written.mass != null ? M.clamp(written.mass, 0.01, 20) : logN(r, 1, 0.5, 0.05, 8),
    cmf: written.core != null ? written.core : M.clamp(0.33 + 0.06 * gauss(r) + set.coreAdd, 0.05, 0.75),
    ageRoll: r(),
    age: written.age,
    rotation: written.rotation != null ? written.rotation : logN(r, 24, 0.45, 6, 120),
    giantDays: logU(r, 1.5, 8),
    giantTides: logU(r, 0.1, 5),
    volatiles: written.volatiles != null ? written.volatiles : logN(r, 1, 0.5, 0.1, 5),
    water: written.water != null ? written.water : set.water != null ? set.water : 0.3,
  };
  return p;
}

/** Les grandeurs dérivées d'un monde possible : l'état `w` que lisent les exigences. */
function derive(p, set, written, ids) {
  const w = { ids, stars: set.stars, moon: set.moon, giantHost: set.giantHost, locked: set.locked, hues: set.hues };
  // L1 étoiles
  const lums = p.starMasses.map(M.starLuminosity);
  w.starMass = p.starMasses[0] || 0;
  w.starMasses = p.starMasses;
  w.starTemp = w.starMass ? M.starTemperature(w.starMass) : 0;
  w.starLife = p.starMasses.length ? Math.min(...p.starMasses.map(M.starLifetime)) : Infinity;
  const L = set.binary === "S" && lums.length > 1 ? lums[0] + 0.05 * lums[1] : lums.reduce((a, b) => a + b, 0);
  const hostMass = set.binary === "S" ? w.starMass : p.starMasses.reduce((a, b) => a + b, 0);
  w.L = L;
  // L2 orbite
  if (p.orbit != null && L > 0) { w.a = p.orbit; w.S = M.insolation(L, p.orbit); }
  else { w.S = p.S; w.a = M.distanceFor(L, p.S); }
  w.periodDays = M.orbitalPeriodDays(w.a, hostMass);
  // âge : jamais plus vieux que son étoile
  const maxAge = isFinite(w.starLife) ? Math.max(0.01, w.starLife * 0.95) : 12;
  w.age = p.age != null ? p.age : Math.min(maxAge, 0.5 + p.ageRoll * 8.5);
  w.ageCapped = p.age == null && w.age === maxAge;
  w.lockTime = M.tidalLockTime(w.a, hostMass || 1);
  if (set.locked) w.rotation = set.giantHost ? p.giantDays * 24 : w.periodDays * 24;
  else if (set.giantHost && written.rotation == null) w.rotation = p.giantDays * 24;
  else w.rotation = p.rotation;
  // L3 planète
  w.M = p.M; w.cmf = p.cmf;
  w.R = written.radius != null ? written.radius : M.planetRadius(p.M, p.cmf);
  w.g = M.gravity(w.M, w.R); w.vesc = M.escapeVelocity(w.M, w.R); w.rho = M.density(w.M, w.R);
  // L4 intérieur
  w.tidal = written.tides != null ? written.tides : (set.giantHost ? p.giantTides : 0) + (set.moon ? 0.03 : 0) + (set.locked && w.a < 0.2 ? 0.1 : 0);
  w.heat = M.internalHeat(w.M, w.R, w.age, w.tidal);
  w.volcanism = w.heat >= M.HEAT.volcanism; w.tectonics = w.heat >= M.HEAT.tectonics && w.M >= 0.5;
  w.liquidCore = w.heat >= M.HEAT.liquidCore;
  w.field = M.dynamo(w.heat, w.rotation, w.cmf);
  // L5 atmosphère : on essaie les trois régimes de l'eau (liquide, glace, sec) et l'on garde le premier
  // qui se confirme lui-même (supposer l'eau liquide donne bien une surface où elle est liquide, etc.)
  w.waterInv = p.water; w.volatiles = p.volatiles;
  const baseAlbedo = M.clamp(written.albedo != null ? written.albedo : 0.3 + set.albedoAdd, 0.02, 0.9);
  const atmos = (regime) => {
    const albedo = regime === "ice" && written.albedo == null && p.water > 0.1 ? Math.min(0.9, baseAlbedo + 0.2) : baseAlbedo;
    const Teq = M.equilibriumTemperature(w.S, albedo, w.heat);
    const keep = M.retention(w.vesc, Teq, w.S, w.field);
    const P = written.atmosphere != null ? written.atmosphere : M.surfacePressure({ volatiles: p.volatiles, heat: w.heat, keep, regime });
    const gh = M.greenhouse(Teq, P);
    const water = M.waterState(gh.Ts, P, p.water);
    const ok = regime === "liquid" ? water === "liquid" : regime === "ice" ? water === "ice" : water !== "liquid" && water !== "ice";
    return { regime, albedo, Teq, keep, P, tau: gh.tau, Ts: gh.Ts, water, ok };
  };
  const tries = p.water <= 0.05 ? [atmos("dry")] : [atmos("liquid"), atmos("ice"), atmos("dry")];
  const a = tries.find((x) => x.ok) || tries[0];
  Object.assign(w, { albedo: a.albedo, Teq: a.Teq, keep: a.keep, P: a.P, tau: a.tau, Ts: a.Ts, water: a.water, regime: a.regime, regimeStable: a.ok });
  const P = a.P;
  w.boil = M.boilingPoint(P);
  // L7 lumière au sol (voile, nuages épais)
  w.light = w.S * set.veil * (P > 10 ? 0.5 : 1);
  return w;
}

/** Exigences des blocs + exigences écrites → tensions (regroupées par exigence). */
function evaluate(w, ids, asserts) {
  const byReq = new Map();
  for (const id of ids) {
    const b = BLOCKS[id]; if (!b || !b.needs) continue;
    for (const [reqId, sev] of b.needs) {
      const req = REQUIREMENTS[reqId]; if (!req) continue;
      const cur = byReq.get(reqId) || { id: reqId, req, ids: [], sev: null };
      cur.ids.push(id);
      const s = sev || req.sev; if (!cur.sev || SEV_RANK[s] > SEV_RANK[cur.sev]) cur.sev = s;
      byReq.set(reqId, cur);
    }
  }
  for (const a of asserts) if (ASSERTIONS[a]) byReq.set(a, { id: a, req: ASSERTIONS[a], ids: [], sev: ASSERTIONS[a].sev, written: true });
  const tensions = [];
  for (const t of byReq.values()) if (!t.req.test(w)) tensions.push({ id: t.id, ids: t.ids, severity: t.sev, axis: t.req.axis, law: t.req.law, written: !!t.written });
  return tensions;
}
const costOf = (tensions) => tensions.reduce((s, t) => s + SEV_COST[t.severity], 0);

/**
 * Le monde physique d'un Âge. `ids` : symboles présents (écrits, tirés, nés de réactions) ;
 * `src` : texte du bloc (lignes de valeurs) ; `seed` : graine de l'Âge (même graine = même monde).
 */
function solve({ ids, src = "", seed = "" }) {
  const idSet = ids instanceof Set ? ids : new Set(ids);
  const { params: written, asserts } = parsePhysics(src);
  const set = blockSettings(idSet);
  const base = hashSeed(`${seed}|physics`);
  let best = null;
  for (let k = 0; k < CANDIDATES; k++) {
    const r = rng(base + k * 7919);
    const p = candidate(r, set, written);
    const w = derive(p, set, written, idSet);
    const tensions = evaluate(w, idSet, asserts);
    const cost = costOf(tensions);
    if (!best || cost < best.cost - 1e-9) best = { k, p, w, tensions, cost };
    if (cost === 0) break;
  }
  for (const t of best.tensions) t.hints = hintsFor(t, best, set, written, idSet);
  return { written, asserts, settings: set, candidate: best.k, params: best.p, w: best.w, tensions: best.tensions, cost: best.cost };
}

// ---- pistes chiffrées : « écris plutôt insolation: 1,4 » ------------------------------------------------
const GRID = {
  insolation: [0.005, 2000], age: [0.02, 13], mass: [0.02, 15], atmosphere: [0.001, 300], water: [0.01, 5], rotation: [4, 240],
};
const current = (key, w) => ({ insolation: w.S, age: w.age, mass: w.M, atmosphere: w.P, water: w.waterInv, rotation: w.rotation }[key]);
/** Arrondi à deux chiffres significatifs (ce que l'on écrirait à la main). */
const round2 = (v) => { const e = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / e) * e; };

/** Le monde, avec une seule valeur changée. */
function variant(best, set, written, ids, key, v) {
  const p = { ...best.p }, wr = { ...written };
  if (key === "insolation") { p.orbit = null; p.S = v; }
  else if (key === "age") p.age = v;
  else if (key === "mass") p.M = v;
  else if (key === "atmosphere") wr.atmosphere = v;
  else if (key === "water") p.water = v;
  else if (key === "rotation") p.rotation = v;
  return derive(p, set, wr, ids);
}

/** Pour une tension : la valeur la plus proche de l'actuelle qui la lève, paramètre par paramètre (au plus deux pistes). */
function hintsFor(t, best, set, written, ids) {
  const req = REQUIREMENTS[t.id] || ASSERTIONS[t.id];
  const out = [];
  for (const key of (req && req.search) || []) {
    if (key === "insolation" && set.stars === 0) continue;
    if (key === "rotation" && (set.locked || set.giantHost)) continue;
    const cur = current(key, best.w); if (!(cur > 0)) continue;
    const [lo, hi] = GRID[key]; let found = null;
    for (let i = 0; i <= 64; i++) {
      const v = Math.exp(Math.log(lo) + (i / 64) * (Math.log(hi) - Math.log(lo)));
      if (key === "age" && v > best.w.starLife * 0.95) continue;
      if (!req.test(variant(best, set, written, ids, key, v))) continue;
      const d = Math.abs(Math.log(v / cur));
      if (!found || d < found.d) found = { v, d };
    }
    if (!found) continue;
    let value = round2(found.v);
    if (!req.test(variant(best, set, written, ids, key, value))) value = found.v;
    out.push({ key, value, dir: value > cur ? "up" : "down" });
    if (out.length >= 2) break;
  }
  return out;
}

module.exports = { PHYS_RE, KEYS, SEV_COST, CANDIDATES, parsePhysics, blockSettings, candidate, derive, evaluate, solve };
