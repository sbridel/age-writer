"use strict";
/**
 * La récolte (claude/DESIGN-reve-et-caverne-bahro.md, section 2, étape 4a′). Pur.
 *
 * Les Âges ne donnent pas de granulés : ils donnent des **ingrédients**, que la machine du Relto cuit. Seuls certains
 * Âges donnent ce qu'il faut : les quatre sols les plus fertiles, comme les quatre silos d'Er'cana. Un Âge lu donne
 * **une mesure de chaque ingrédient qu'il a écrit**, une fois par jour, **si quelque chose y pousse** (un sol mort ne
 * donne rien). Jamais rétroactif : un jour sans lecture ne donne rien. Le tiré ne compte pas : la recette commence dans
 * l'écriture.
 *
 * **La qualité** (section 18) : une mesure est **riche** si l'Âge qui la donne est stable, sans cicatrice ni maladie, le
 * jour où il la donne ; **pauvre** sinon. Le stock garde, pour chaque ingrédient, combien de ses mesures sont riches
 * (`rich`, jamais plus que le stock) ; la trémie verse d'abord ses riches.
 *
 * Les granulés cuits (la machine) vivent dans `ext.pellets` : { white, amber, grey, fine: { white, amber } }.
 */
const LF = require("./life");
const DAY = 86400000;
/** Les quatre ingrédients, dans l'ordre des trémies : cendres, terreau, limon, tourbe. */
const INGREDIENTS = ["ash", "humus", "silt", "peat"];
const KINDS = ["white", "amber", "grey"];

/**
 * Ce qu'un Âge donne : les ingrédients écrits **ou nés d'une réaction** (le limon ne s'écrit pas : il naît de l'eau sur
 * les cendres ; loi 11, ce qui découle de l'écrit), si quelque chose pousse. `present` : tous ses blocs, tirés compris ;
 * `made` : les produits de ses réactions.
 */
function givesOf(written, present, made) {
  const w = new Set([...(written || []), ...(made || [])]), p = present || w;
  if (!LF.ROLES.producer.some((id) => p.has(id))) return [];
  if (w.has("water") && ROCK.some((id) => w.has(id))) w.add("silt"); /* l'eau qui broie la roche écrite : un limon de quartz (choix de l'auteur, 26 oct.) */
  if (w.has("clay")) w.add("silt"); /* l'argile donne un limon, de la sorte de l'Âge (genèse) */
  return INGREDIENTS.filter((id) => w.has(id));
}
/*
 * La genèse (choix de l'auteur, 26 oct. 2026) : une matière dépend de ce qui l'a faite, et l'Âge le sait déjà ; rien ne s'écrit de plus.
 * - la cendre est **volcanique** (verre, silice : minéral pur) si l'Âge a de la lave ou ce qui en naît ; **de foyer** (potasse, calcium :
 *   le squelette du vivant brûlé) sinon ; sans volcan ni feu, elle n'a pas de genèse et reste pauvre ;
 * - le limon est **volcanique** (argiles, fertile) dans un Âge volcanique ; **de quartz** (l'eau qui broie la roche) sinon.
 */
const VOLCANIC = ["lava", "lava_world", "obsidian", "crying_obsidian", "whispering_obsidian", "ash_cloud", "ashen_sky", "molten_core", "glass", "singing_glass", "basalt", "basalt_columns"];
const BURNT = ["wildfire", "charred_grove", "scorched_surface", "cinderbloom", "scorched_moths"];
const ROCK = ["stone", "sand", "crystal", "granite", "basalt"];
function genesisOf(present) {
  const p = present instanceof Set ? present : new Set(present || []), has = (l) => l.some((id) => p.has(id)), volcanic = has(VOLCANIC);
  return { ash: volcanic ? "volcanic" : "hearth", ashBorn: volcanic || has(BURNT), silt: volcanic ? "volcanic" : "quartz" };
}
/** La sorte d'une mesure de cette matière, dans un Âge de cette genèse. */
const sortOf = (id, g) => (id === "ash" ? g.ash : id === "silt" ? g.silt : id);

/**
 * L'état de la récolte (créé à la demande) : { stock: { ash, humus, silt, peat }, rich: { idem, ≤ stock }, last: { [Âge]: jour },
 * lastRich: { [Âge]: vrai si la mesure du jour était riche } }. Une récolte d'avant la qualité compte comme riche.
 */
function stateOf(ext) {
  const h = ext.harvest && typeof ext.harvest === "object" ? ext.harvest : (ext.harvest = {});
  if (!h.stock || typeof h.stock !== "object") h.stock = {};
  for (const id of INGREDIENTS) h.stock[id] = Math.max(0, Math.floor(Number(h.stock[id]) || 0));
  if (!h.rich || typeof h.rich !== "object") h.rich = { ...h.stock }; /* avant la qualité : le bénéfice du doute */
  for (const id of INGREDIENTS) h.rich[id] = Math.min(h.stock[id], Math.max(0, Math.floor(Number(h.rich[id]) || 0)));
  /* la file de chaque trémie (la cave, src/cellar.js) : ce qui est monté d'en bas, dans l'ordre où on l'a versé (vrai = riche) ;
     le reste du stock (d'avant la cave) se verse comme avant, riches d'abord, avant la file */
  if (!h.queue || typeof h.queue !== "object") h.queue = {};
  for (const id of INGREDIENTS) { const q = Array.isArray(h.queue[id]) ? h.queue[id].map(item) : []; h.queue[id] = q.slice(Math.max(0, q.length - h.stock[id])); } /* chaque mesure : { r: riche, s: sa sorte } */
  if (!h.last || typeof h.last !== "object") h.last = {};
  if (!h.lastRich || typeof h.lastRich !== "object") h.lastRich = {};
  return h;
}

/**
 * La mesure qu'un Âge donne aujourd'hui est-elle riche ? Stable, sans cicatrice, sans maladie, pas condamné. `a` : l'analyse
 * (verdict, scars, resolved.scars, condemned).
 */
function richOf(a) {
  if (!a || a.condemned) return false;
  const scars = [...((a && a.scars) || []), ...((a && a.resolved && a.resolved.scars) || [])].filter(Boolean);
  return a.verdict === "stable" && scars.length === 0;
}

/**
 * Un Âge est lu (pas un essai) : s'il donne et n'a pas déjà donné aujourd'hui, ses mesures vont aux trémies, riches ou
 * pauvres selon `rich` (ce qu'il est à la première lecture du jour : la qualité du jour ne change plus). Renvoie la liste, ou null.
 */
function gather(ext, age, list, now, rich = true, into = null) {
  if (!age || !list || !list.length) return null;
  const h = stateOf(ext), day = Math.floor(now / DAY);
  if (h.last[age] === day) return null;
  const rk = (id) => (rich && typeof rich === "object" ? !!rich[id] : !!rich); /* riche ou pauvre, par mesure (la brume de l'ardoise : le terreau compte riche) */
  h.last[age] = day; h.lastRich[age] = list.every(rk);
  for (const id of list) { if (into) into(id, rk(id)); else { h.stock[id] += 1; if (rk(id)) h.rich[id] += 1; } } /* `into` : la cave (src/cellar.js) reçoit la mesure au lieu de la trémie */
  return list.slice();
}
/** A-t-il donné aujourd'hui ? (la ligne de l'onglet Détails) */
function gatheredToday(ext, age, now) { const h = ext && ext.harvest; return !!(h && h.last && h.last[age] === Math.floor(now / DAY)); }
/** Ce qu'il a donné aujourd'hui était-il riche ? (null s'il n'a rien donné) */
function richToday(ext, age, now) { if (!gatheredToday(ext, age, now)) return null; const h = ext.harvest; return !(h.lastRich && h.lastRich[age] === false); }
/** Prendre une mesure de `id` au stock : d'abord une riche. Renvoie true (riche), false (pauvre) ou null (vide). */
/** Une mesure de la file : { r: riche, s: sa sorte (null : d'avant la genèse) } ; un booléen d'hier en devient une. */
const item = (x) => (x && typeof x === "object" ? { r: x.r === true, s: typeof x.s === "string" ? x.s : null } : { r: x === true, s: null });
/** Prendre une mesure : { rich, sort }, ou null. D'avant la cave : riches d'abord, sorte inconnue ; montée de la cave : dans l'ordre, avec sa sorte. */
function takeOne(ext, id) {
  const h = stateOf(ext); if (!(h.stock[id] > 0)) return null;
  const q = h.queue[id], qRich = q.filter((x) => x.r).length, old = h.stock[id] - q.length;
  if (old > 0) { h.stock[id] -= 1; if (h.rich[id] - qRich > 0) { h.rich[id] -= 1; return { rich: true, sort: null }; } return { rich: false, sort: null }; }
  const m = q.shift(); h.stock[id] -= 1; if (m.r) h.rich[id] = Math.max(0, h.rich[id] - 1); return { rich: m.r, sort: m.s };
}
/** Prendre une mesure : riche ou pauvre (null : la trémie est vide). */
function take(ext, id) { const m = takeOne(ext, id); return m ? m.rich : null; }
/** Rendre une mesure au stock (la colonne reversée) : elle retourne en tête de la file, avec sa sorte, elle ressortira la première. */
function giveBack(ext, id, rich, sort = null) { const h = stateOf(ext); h.stock[id] += 1; if (rich) h.rich[id] += 1; h.queue[id].unshift({ r: !!rich, s: sort || null }); }
/** Le monte-charge de la cave verse dans la trémie, dans cet ordre ({ r, s }, ou vrai = riche). */
function pour(ext, id, order) { const h = stateOf(ext); for (const x of order || []) { const m = item(x); h.stock[id] += 1; if (m.r) h.rich[id] += 1; h.queue[id].push(m); } }

/** Les granulés cuits (créés à la demande) : { white, amber, grey }. Reprend l'étagère de l'ancienne étape 4a (good → white, bad → grey). */
function pelletsOf(ext) {
  const p = ext.pellets && typeof ext.pellets === "object" ? ext.pellets : (ext.pellets = {});
  if ("good" in p || "bad" in p || "last" in p) { p.white = (p.white || 0) + (p.good || 0); p.grey = (p.grey || 0) + (p.bad || 0); delete p.good; delete p.bad; delete p.last; }
  for (const k of KINDS) p[k] = Math.max(0, Math.floor(Number(p[k]) || 0));
  /* la qualité (section 18) : parmi les blancs et les ambrés, les nets (toutes leurs mesures étaient riches) ; jamais plus que le tas */
  const f = p.fine && typeof p.fine === "object" ? p.fine : (p.fine = {}); for (const k of ["white", "amber"]) f[k] = Math.min(p[k], Math.max(0, Math.floor(Number(f[k]) || 0)));
  return p;
}

module.exports = { INGREDIENTS, KINDS, DAY, VOLCANIC, BURNT, ROCK, givesOf, genesisOf, sortOf, stateOf, richOf, gather, gatheredToday, richToday, take, takeOne, giveBack, pour, pelletsOf };
