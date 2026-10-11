"use strict";
/**
 * Les niveaux de rigueur (claude/RIGUEUR-ET-STATUT-D-ECRIVAIN.md) : à quel point les lois de l'écriture comptent.
 *
 *   gentle    (doux, par défaut)  aucune nouvelle pénalité ; ce que le dosage apporte de bon reste (peu d'eau = moins de clash)
 *   balanced  (équilibré)         les lois comptent, à la moitié de leur coût
 *   strict                        plein coût sur les familles cochées ; les autres se comportent comme « équilibré »
 *   extreme   (extrême)           tout compte, partout, à plein coût
 *
 * Cinq familles de lois : physique, sol, vie, étendue (et dosage), équilibre. Sol, vie et équilibre n'ont pas encore d'effet
 * (tranches suivantes) : leur poids est déjà lu ici, pour que les réglages ne changent plus.
 * Fonctions pures : elles ne lisent que les réglages.
 */
const LEVELS = ["gentle", "balanced", "strict", "extreme"];
const FAMILIES = ["physics", "soil", "life", "extent", "balance"];
const DEFAULT_LEVEL = "gentle";
/** En strict, les familles cochées par défaut : toutes (on en décoche pour alléger). */
const DEFAULT_FAMILIES = FAMILIES.slice();
/** Pour le palier « Maître » : au moins ce nombre de familles cochées en strict. */
const TITLE_MIN_FAMILIES = 3;

const levelOf = (ext) => (ext && LEVELS.includes(ext.rigor) ? ext.rigor : DEFAULT_LEVEL);
const familiesOf = (ext) => (ext && Array.isArray(ext.rigorFamilies) ? ext.rigorFamilies.filter((f) => FAMILIES.includes(f)) : DEFAULT_FAMILIES.slice());

/** Part du coût d'une famille de lois qui compte : 0 (rien), 0,5 (moitié) ou 1 (plein). */
function weight(level, families, family) {
  if (level === "extreme") return 1;
  if (level === "balanced") return 0.5;
  if (level === "strict") return (families || []).includes(family) ? 1 : 0.5;
  return 0;
}
/** { physics, soil, life, extent, balance } → poids, d'après les réglages. */
function weightsOf(ext) {
  const level = levelOf(ext), fams = familiesOf(ext), out = {};
  for (const f of FAMILIES) out[f] = weight(level, fams, f);
  return out;
}
/** Un Âge écrit à ce niveau compte-t-il pour le palier « Maître » (strict avec assez de familles) ? Voir le statut d'écrivain. */
function countsForStrictTitle(ext) { return levelOf(ext) === "strict" && familiesOf(ext).length >= TITLE_MIN_FAMILIES; }

module.exports = { LEVELS, FAMILIES, DEFAULT_LEVEL, DEFAULT_FAMILIES, TITLE_MIN_FAMILIES, levelOf, familiesOf, weight, weightsOf, countsForStrictTitle };
