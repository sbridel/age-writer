"use strict";
/**
 * Le RAHNFEE, unité du faisceau (invention de fan, annoncée comme telle : ce n'est pas un mot D'ni attesté).
 *
 * De prorahn + shahfee : la longueur que parcourt le pouls du Great Zero dans le faisceau pendant UN PRORAHN.
 *   1 rahnfee (pluriel rahnfeetee) = 25³ = 15 625 shahfeetee de faisceau.
 * Aucune conversion en kilomètres : le faisceau est le trajet du pouls à travers l'Art, pas une distance dans l'espace.
 *
 * Lecture en base 25 : une longueur de faisceau s'écrit « 0 · a b c » rahnfee, chaque chiffre D'ni valant 1/25, 1/625,
 * 1/15 625 de rahnfee. C'est le même entier que la valeur en shahfeetee, lu après le point (15 625 = 25³) : rien n'est
 * arrondi au troisième chiffre. Le retard de la molette (crans de 25 shahfeetee) se lit avec deux chiffres : 625 crans
 * font un rahnfee, un cran est un 625ᵉ de rahnfee.
 *
 * Portée (fiction) : au-delà d'un rahnfee, le pouls se mêlerait au battement suivant du balancier. Aucune étoile n'y est
 * (SS.SYS_DIST : 15 000 au plus) ; une lecture s'arrête donc juste sous un rahnfee (`digitsOf`, `clamp`).
 *
 * Module pur : testé dans test/starsystem.test.js.
 */
const RAHNFEE = 15625;           // shahfeetee de faisceau par rahnfee (25³) : le trajet du pouls en un prorahn
const PLACES = 3;                // trois chiffres après le point : un shahfee près
const DELAY_PLACES = 2;          // la molette du retard : un cran = 25 shahfeetee = un 625ᵉ de rahnfee
const REACH = RAHNFEE - 1;       // la plus longue lecture : juste sous un rahnfee

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** Une longueur de faisceau (shahfeetee) en rahnfee (nombre réel). Non fini → 0. */
function rahnfeeOf(sf) { return num(sf) / RAHNFEE; }
/** La longueur (shahfeetee) d'un nombre de rahnfee. */
function shahfeeteeOf(rf) { return num(rf) * RAHNFEE; }
/** Une longueur ramenée dans la portée du pouls : de 0 à juste sous un rahnfee. */
function clamp(sf) { return Math.max(0, Math.min(REACH, num(sf))); }
/** Dans la portée (strictement moins d'un rahnfee) ? */
function within(sf) { return Number.isFinite(Number(sf)) && Number(sf) >= 0 && Number(sf) < RAHNFEE; }

/**
 * Les chiffres D'ni d'une longueur de faisceau `sf` (shahfeetee), en rahnfee : [entier, f1, …, f`places`], chacun de 0 à 24
 * (f1 = 25ᵉ, f2 = 625ᵉ, f3 = 15 625ᵉ). Arrondi au dernier chiffre. `clamp` (par défaut) : la lecture s'arrête juste sous un
 * rahnfee (au-delà, le pouls se mêle au battement suivant) ; sans lui, l'entier peut dépasser 0.
 */
function digitsOf(sf, places = PLACES, { clamp: cl = true } = {}) {
  const p = Math.max(0, Math.min(6, Math.round(num(places)))), den = Math.pow(25, p), unit = RAHNFEE / den;
  let n = Math.round(Math.max(0, num(sf)) / unit);
  if (cl) n = Math.min(n, den - 1);
  const out = [];
  for (let i = 0; i < p; i++) { out.unshift(n % 25); n = Math.floor(n / 25); }
  out.unshift(n);
  return out;
}
/** La longueur (shahfeetee) que disent des chiffres [entier, f1, …] : l'inverse de `digitsOf`. */
function fromDigits(digits) {
  const d = Array.isArray(digits) && digits.length ? digits : [0];
  return d.slice(1).reduce((a, v, i) => a + num(v) * RAHNFEE / Math.pow(25, i + 1), num(d[0]) * RAHNFEE);
}

/** Le retard de la molette (`notches`, crans de `unit` shahfeetee) en chiffres de rahnfee : [0, a, b], a·25 + b = crans. */
function delayDigits(notches, unit = 25) { return digitsOf(num(notches) * unit, DELAY_PLACES); }
/** Le retard en fraction de battement (de prorahn) : le pouls arrive d'autant après le balancier. */
function lateOf(notches, unit = 25) { return Math.max(0, num(notches) * unit) / RAHNFEE; }

/**
 * La fraction `f` (de rahnfee, ou de battement) en paliers de mots : 0 presque rien, 1 un rien, puis la plus proche des
 * fractions nommées (`NAMED` : cinquièmes, quarts, tiers, demi), enfin `NAMED.length + 2` presque un entier.
 */
const NAMED = [1 / 5, 1 / 4, 1 / 3, 2 / 5, 1 / 2, 3 / 5, 2 / 3, 3 / 4, 4 / 5];
const BANDS = NAMED.length + 3;
function fracBand(f) {
  const x = Math.max(0, num(f));
  if (x < 0.04) return 0;
  if (x < 0.13) return 1;
  if (x >= 0.9) return BANDS - 1;
  let best = 0; for (let i = 1; i < NAMED.length; i++) if (Math.abs(NAMED[i] - x) < Math.abs(NAMED[best] - x)) best = i;
  return best + 2;
}

module.exports = { RAHNFEE, PLACES, DELAY_PLACES, REACH, NAMED, BANDS, rahnfeeOf, shahfeeteeOf, clamp, within, digitsOf, fromDigits, delayDigits, lateOf, fracBand };
