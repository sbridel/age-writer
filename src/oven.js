"use strict";
/**
 * La machine du Relto (claude/DESIGN-reve-et-caverne-bahro.md, section 2, étape 4a′) : le four d'Er'cana, contre la cabane. Pur.
 *
 * Sept réglages : quatre leviers (cendres, terreau, limon, tourbe : 0 à 3 mesures chacun, cinq au plus en tout, une mesure
 * donne une capsule), deux curseurs gradués comme à Er'cana (temps, température : 0 à 50) et la presse (0 à 50 : la densité
 * de la capsule, donc ce qu'elle fait dans l'eau). On ferme la porte : les mesures quittent les trémies, la cuisson prend
 * un vrai temps (un cran de temps = 15 s), puis la fournée attend sur le plateau à cinq alvéoles.
 *
 * Les recettes ne sont dites nulle part dans le jeu (ni dans le guide) : on apprend en ratant. Le clin d'œil à Uru est gardé
 * sur les curseurs (40-20 pour le blanc, 30-30 ou 1,5-50 pour l'orange). Tolérance : deux crans.
 * - blanc (l'éclair de la caverne) : du minéral (cendres et limon, plus de cendres que de limon, rien d'organique),
 *   temps 40, température 20, pressé fort (38 et plus : dense, il coule jusqu'aux algues du fond) ;
 * - ambré (le lac) : de l'organique (terreau et tourbe, plus de terreau que de tourbe, rien de minéral), pressé peu
 *   (10 à 22 : léger, il flotte et se dissout à la surface), soit temps 30 / température 30, soit vite (une fournée pleine,
 *   temps 3 au plus, température 47 et plus : on paie la vitesse en matière) ;
 * - pas assez pressé (moins de 8) : la fournée s'effrite, il ne reste qu'une poussière ;
 * - tout le reste : gris (il flotte et fume).
 */
const H = require("./harvest");
const STEP_MS = 15000, MAX_LEVER = 3, MAX_TOTAL = 5, SCALE = 50;
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const near = (v, target, tol = 2) => Math.abs(v - target) <= tol;

/** Les réglages et la fournée (créés à la demande) : { levers: [4], time, temp, press, batch: { at, dur, kind, n } | null }. */
function stateOf(ext) {
  const o = ext.oven && typeof ext.oven === "object" ? ext.oven : (ext.oven = {});
  o.levers = Array.isArray(o.levers) && o.levers.length === 4 ? o.levers.map((v) => clampInt(v, 0, MAX_LEVER)) : [0, 0, 0, 0];
  for (const k of ["time", "temp", "press"]) o[k] = clampInt(o[k], 0, SCALE);
  if (o.batch && (typeof o.batch !== "object" || !(o.batch.n > 0))) o.batch = null;
  if (!("batch" in o)) o.batch = null;
  return o;
}

/** Ce que donnent ces réglages : { kind: "white" | "amber" | "grey" | "dust", n } ou null (rien à cuire). */
function resultOf(s) {
  const [a, h, si, p] = s.levers, n = a + h + si + p, { time, temp, press } = s;
  if (n < 1 || n > MAX_TOTAL || !(time > 0)) return null;
  if (press < 8) return { kind: "dust", n };
  const mineral = h === 0 && p === 0 && a > si && si > 0 && a / n <= 0.8, organic = a === 0 && si === 0 && h > p && p > 0 && h / n <= 0.8;
  if (mineral && near(time, 40) && near(temp, 20) && press >= 38) return { kind: "white", n };
  if (organic && press >= 10 && press <= 22 && ((near(time, 30) && near(temp, 30)) || (n === MAX_TOTAL && time <= 3 && temp >= 47))) return { kind: "amber", n };
  return { kind: "grey", n };
}

/** Où en est la fournée : null (rien), { phase: "cooking", k (0..1), left (ms) } ou { phase: "done", kind, n }. */
function phaseOf(o, now) {
  const b = o && o.batch; if (!b) return null;
  const k = (now - b.at) / b.dur;
  return k < 1 ? { phase: "cooking", k: Math.max(0, k), left: Math.max(0, b.at + b.dur - now), kind: b.kind, n: b.n } : { phase: "done", kind: b.kind, n: b.n };
}

/** Un réglage : "lever" (i : un cran de plus, 3 → 0 ; jamais plus de cinq en tout), "time" / "temp" / "press" (v : la valeur). Refusé pendant la cuisson. */
function set(ext, what, arg, now) {
  const o = stateOf(ext); if (phaseOf(o, now)) return false;
  if (what === "lever") {
    const i = clampInt(arg, 0, 3), others = o.levers.reduce((t, v, j) => t + (j === i ? 0 : v), 0);
    let v = o.levers[i] + 1; if (v > MAX_LEVER || others + v > MAX_TOTAL) v = 0;
    o.levers[i] = v; return true;
  }
  if (what === "time" || what === "temp" || what === "press") { o[what] = clampInt(arg, 0, SCALE); return true; }
  return false;
}

/** Fermer la porte : les mesures quittent les trémies et la cuisson commence. Renvoie null (c'est parti) ou la raison du refus. */
function start(ext, now) {
  const o = stateOf(ext); if (phaseOf(o, now)) return "busy";
  const res = resultOf(o); if (!res) return o.levers.some((v) => v) ? "notime" : "empty";
  const st = H.stateOf(ext).stock;
  const short = H.INGREDIENTS.find((id, i) => st[id] < o.levers[i]); if (short) return "short:" + short;
  H.INGREDIENTS.forEach((id, i) => { st[id] -= o.levers[i]; });
  o.batch = { at: now, dur: o.time * STEP_MS, kind: res.kind, n: res.n };
  return null;
}

/** Prendre la fournée sur le plateau : les capsules vont sur l'étagère (la poussière, nulle part). Renvoie { kind, n } ou null. */
function collect(ext, now) {
  const o = stateOf(ext), ph = phaseOf(o, now); if (!ph || ph.phase !== "done") return null;
  if (ph.kind !== "dust") { const P = H.pelletsOf(ext); P[ph.kind] += ph.n; }
  o.batch = null; return { kind: ph.kind, n: ph.n };
}

module.exports = { STEP_MS, MAX_LEVER, MAX_TOTAL, SCALE, stateOf, resultOf, phaseOf, set, start, collect };
