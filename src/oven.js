"use strict";
/**
 * La machine du Relto (claude/DESIGN-reve-et-caverne-bahro.md, section 2, étape 4a′) : le four d'Er'cana, contre la cabane. Pur.
 *
 * Les doses : un clic sur une trémie fait tomber une mesure dans la colonne de mélange (cinq au plus, trois d'un même
 * ingrédient au plus ; une mesure donne une capsule) ; un clic sur la colonne la vide dans les trémies. Puis deux curseurs
 * gradués comme à Er'cana (temps, température : 0 à 50) et la presse (0 à 50 : la densité de la capsule, donc ce qu'elle
 * fait dans l'eau). On ferme la porte : la colonne se vide dans le four, la cuisson prend un vrai temps (un cran de temps
 * = 15 s), puis la fournée attend sur le plateau à cinq alvéoles.
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
 * La qualité (section 16.1) : dans la tolérance, le blanc ou l'ambré sont « approximatifs » ; pile sur les crans de temps et de
 * température (40-20 ; 30-30, ou la fournée pleine à temps 1 au plus, température 50), ils sont « nets » : un blanc net
 * éclaire 15 s au lieu de 8, un ambré net laisse deux colonies au lieu d'une. Rien ne le chiffre : la fournée le dit en phrases.
 */
const H = require("./harvest");
const STEP_MS = 15000, MAX_LEVER = 3, MAX_TOTAL = 5, SCALE = 50;
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const near = (v, target, tol = 2) => Math.abs(v - target) <= tol;

/** Les réglages et la fournée (créés à la demande) : { levers: [4], time, temp, press, batch: { at, dur, kind, n } | null }. */
function stateOf(ext) {
  const o = ext.oven && typeof ext.oven === "object" ? ext.oven : (ext.oven = {});
  /* la colonne : les mesures dans l'ordre où elles sont tombées ; `levers` en est le compte par ingrédient (cendres, terreau, limon, tourbe) */
  o.column = Array.isArray(o.column) ? o.column.filter((id) => H.INGREDIENTS.includes(id)).slice(0, MAX_TOTAL) : [];
  o.levers = H.INGREDIENTS.map((id) => o.column.filter((x) => x === id).length);
  for (const k of ["time", "temp", "press"]) o[k] = clampInt(o[k], 0, SCALE);
  if (o.batch && (typeof o.batch !== "object" || !(o.batch.n > 0))) o.batch = null;
  if (!("batch" in o)) o.batch = null;
  if (o.burnt && (typeof o.burnt !== "object" || !(o.burnt.at > 0))) delete o.burnt;
  return o;
}

/** Ce que donnent ces réglages : { kind: "white" | "amber" | "grey" | "dust", n, fine? } ou null (rien à cuire). */
function resultOf(s) {
  const [a, h, si, p] = s.levers, n = a + h + si + p, { time, temp, press } = s;
  if (n < 1 || n > MAX_TOTAL || !(time > 0)) return null;
  if (press < 8) return { kind: "dust", n };
  const mineral = h === 0 && p === 0 && a > si && si > 0 && a / n <= 0.8, organic = a === 0 && si === 0 && h > p && p > 0 && h / n <= 0.8;
  if (mineral && near(time, 40) && near(temp, 20) && press >= 38) return { kind: "white", n, fine: time === 40 && temp === 20 };
  if (organic && press >= 10 && press <= 22 && ((near(time, 30) && near(temp, 30)) || (n === MAX_TOTAL && time <= 3 && temp >= 47))) return { kind: "amber", n, fine: (time === 30 && temp === 30) || (n === MAX_TOTAL && time <= 1 && temp === SCALE) };
  return { kind: "grey", n };
}

/** Où en est la fournée : null (rien), { phase: "cooking", k (0..1), left (ms) } ou { phase: "done", kind, n }. */
function phaseOf(o, now) {
  const b = o && o.batch; if (!b) return null;
  const k = (now - b.at) / b.dur;
  return k < 1 ? { phase: "cooking", k: Math.max(0, k), left: Math.max(0, b.at + b.dur - now), kind: b.kind, n: b.n, fine: !!b.fine } : { phase: "done", kind: b.kind, n: b.n, fine: !!b.fine };
}

/**
 * Un réglage : "add" (i : une mesure de cette trémie tombe dans la colonne), "empty" (la colonne retourne aux trémies),
 * "time" / "temp" / "press" (v : la valeur). Refusé pendant la cuisson et tant qu'une fournée attend. Renvoie true, ou la
 * raison du refus ("full", "max", "none:<id>").
 */
function set(ext, what, arg, now) {
  const o = stateOf(ext); if (phaseOf(o, now)) return false;
  const st = H.stateOf(ext).stock;
  if (what === "add") {
    const id = H.INGREDIENTS[clampInt(arg, 0, 3)];
    if (o.column.length >= MAX_TOTAL) return "full";
    if (o.column.filter((x) => x === id).length >= MAX_LEVER) return "max";
    if (st[id] < 1) return "none:" + id;
    st[id] -= 1; o.column.push(id); o.levers = H.INGREDIENTS.map((x) => o.column.filter((y) => y === x).length); return true;
  }
  if (what === "empty") { for (const id of o.column) st[id] += 1; o.column = []; o.levers = [0, 0, 0, 0]; return true; }
  if (what === "time" || what === "temp" || what === "press") { o[what] = clampInt(arg, 0, SCALE); return true; }
  return false;
}

/** Fermer la porte : la colonne se vide dans le four et la cuisson commence. Renvoie null (c'est parti) ou la raison du refus. */
function start(ext, now) {
  const o = stateOf(ext); if (phaseOf(o, now)) return "busy";
  const res = resultOf(o); if (!res) return o.column.length ? "notime" : "empty";
  o.batch = { at: now, dur: o.time * STEP_MS, kind: res.kind, n: res.n, fine: !!res.fine, layers: o.column.slice() }; /* les mesures sont déjà sorties des trémies */
  o.column = []; o.levers = [0, 0, 0, 0];
  return null;
}

/** Prendre la fournée sur le plateau : les capsules vont sur l'étagère (la poussière, nulle part). Renvoie { kind, n } ou null. */
function collect(ext, now) {
  const o = stateOf(ext), ph = phaseOf(o, now); if (!ph || ph.phase !== "done") return null;
  if (ph.kind !== "dust") { const P = H.pelletsOf(ext); P[ph.kind] += ph.n; if (ph.fine && P.fine && ph.kind in P.fine) P.fine[ph.kind] += ph.n; }
  o.batch = null; return { kind: ph.kind, n: ph.n, fine: !!ph.fine };
}

/** La vidange, sous le plateau : la fournée finie part par la grille sans toucher l'étagère (pour une fournée ratée). Renvoie { kind, n } ou null. */
function drain(ext, now) {
  const o = stateOf(ext), ph = phaseOf(o, now); if (!ph || ph.phase !== "done") return null;
  o.batch = null; o.burnt = { at: now, kind: ph.kind, drain: true }; return { kind: ph.kind, n: ph.n };
}

/**
 * Le feu : jeter au four une capsule de l'étagère ("white", "amber", "grey"). Pas pendant la cuisson (la porte est fermée).
 * Renvoie null (elle brûle ; `o.burnt` garde l'instant et la sorte, pour la fumée) ou la raison du refus ("busy", "none").
 */
function burn(ext, kind, now) {
  const o = stateOf(ext), ph = phaseOf(o, now); if (ph && ph.phase === "cooking") return "busy";
  const P = H.pelletsOf(ext); if (!["white", "amber", "grey"].includes(kind) || !(P[kind] > 0)) return "none";
  P[kind] -= 1; H.pelletsOf(ext); o.burnt = { at: now, kind }; return null; /* on jette d'abord un approximatif : le tas garde ses nets tant qu'il peut */
}

module.exports = { STEP_MS, MAX_LEVER, MAX_TOTAL, SCALE, stateOf, resultOf, phaseOf, set, start, collect, drain, burn };
