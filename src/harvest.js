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
  return INGREDIENTS.filter((id) => w.has(id));
}

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
  for (const id of INGREDIENTS) { const q = Array.isArray(h.queue[id]) ? h.queue[id].map((x) => x === true) : []; h.queue[id] = q.slice(Math.max(0, q.length - h.stock[id])); }
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
function take(ext, id) {
  const h = stateOf(ext); if (!(h.stock[id] > 0)) return null;
  const q = h.queue[id], qRich = q.filter(Boolean).length, old = h.stock[id] - q.length;
  if (old > 0) { h.stock[id] -= 1; if (h.rich[id] - qRich > 0) { h.rich[id] -= 1; return true; } return false; } /* d'avant la cave : riches d'abord, comme toujours */
  const r = q.shift() === true; h.stock[id] -= 1; if (r) h.rich[id] = Math.max(0, h.rich[id] - 1); return r; /* monté de la cave : dans l'ordre */
}
/** Rendre une mesure au stock (la colonne reversée) : elle retourne en tête de la file, elle ressortira la première. */
function giveBack(ext, id, rich) { const h = stateOf(ext); h.stock[id] += 1; if (rich) h.rich[id] += 1; h.queue[id].unshift(!!rich); }
/** Le monte-charge de la cave verse dans la trémie, dans cet ordre (vrai = riche). */
function pour(ext, id, order) { const h = stateOf(ext); for (const r of order || []) { h.stock[id] += 1; if (r) h.rich[id] += 1; h.queue[id].push(!!r); } }

/** Les granulés cuits (créés à la demande) : { white, amber, grey }. Reprend l'étagère de l'ancienne étape 4a (good → white, bad → grey). */
function pelletsOf(ext) {
  const p = ext.pellets && typeof ext.pellets === "object" ? ext.pellets : (ext.pellets = {});
  if ("good" in p || "bad" in p || "last" in p) { p.white = (p.white || 0) + (p.good || 0); p.grey = (p.grey || 0) + (p.bad || 0); delete p.good; delete p.bad; delete p.last; }
  for (const k of KINDS) p[k] = Math.max(0, Math.floor(Number(p[k]) || 0));
  /* la qualité (section 18) : parmi les blancs et les ambrés, les nets (toutes leurs mesures étaient riches) ; jamais plus que le tas */
  const f = p.fine && typeof p.fine === "object" ? p.fine : (p.fine = {}); for (const k of ["white", "amber"]) f[k] = Math.min(p[k], Math.max(0, Math.floor(Number(f[k]) || 0)));
  return p;
}

module.exports = { INGREDIENTS, KINDS, DAY, givesOf, stateOf, richOf, gather, gatheredToday, richToday, take, giveBack, pour, pelletsOf };
