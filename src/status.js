"use strict";
/**
 * Le statut d'écrivain (claude/RIGUEUR-ET-STATUT-D-ECRIVAIN.md) : un titre qui RECONNAÎT ce que le joueur a réussi, sans jamais rien verrouiller.
 * On monte d'un palier quand un Âge est resté stable SEPT JOURS de suite à un niveau de rigueur :
 *   0 Apprenti (départ) · 1 Scribe (doux) · 2 Seltahn aguerri (équilibré) · 3 Maître (strict, au moins 3 familles) · 4 Grand Maître (extrême)
 * Le titre est global (le plus haut palier atteint, quel que soit l'Âge) et ne redescend jamais. Le premier Âge tenu sept jours est le « Korfah ».
 * Les jours sont des jours écoulés (l'horloge, pas les ouvertures) ; l'Âge est vérifié à chaque lecture. Changer de rigueur (ou de familles cochées en strict)
 * ou retomber sous « stable » remet le compte à zéro. État sérialisable : { tier, korfah, ages: { [nom]: { key, since } } }. Fonction pure à l'horloge près.
 */
const RG = require("./rigor");

const DAY = 86400000, HOLD_DAYS = 7, STABLE_AT = 75;
const TITLES = ["apprentice", "scribe", "seltahn", "master", "grandmaster"];
/** Le titre en mots D'ni (dictionnaires : shelahtahn = scribe, seltahn = écrivain d'Âges, nahvah = maître ; « rehnahvah pah » est une forme reconstruite, non canon). Aucun mot connu pour apprenti : la plaque porte le verbe tahgayr (« apprendre »), pas un faux nom de personne. */
const DNI_WORDS = ["tahgayr", "shelahtahn", "seltahn", "nahvah", "rehnahvah pah"];

/** Le palier que donne un Âge tenu sous ces réglages (strict avec moins de trois familles : il compte comme équilibré). */
function tierOf(ext) {
  const lv = RG.levelOf(ext);
  return lv === "gentle" ? 1 : lv === "balanced" ? 2 : lv === "extreme" ? 4 : RG.countsForStrictTitle(ext) ? 3 : 2;
}
/** Ce qui doit rester pareil pour que le compte continue : le niveau et, en strict, les familles cochées. */
function keyOf(ext) { const lv = RG.levelOf(ext); return lv === "strict" ? "strict:" + RG.familiesOf(ext).join(",") : lv; }

class Status {
  /** @param state l'objet sérialisable (modifié en place) ; @param o.now l'horloge (millisecondes) */
  constructor(state, o) { this.s = state; if (!this.s.ages) this.s.ages = {}; if (typeof this.s.tier !== "number") this.s.tier = 0; this.now = (o && o.now) || Date.now; }
  tier() { return this.s.tier; }
  title() { return TITLES[this.s.tier]; }
  korfah() { return this.s.korfah || 0; }
  /** Les jours tenus par un Âge sous les réglages d'aujourd'hui (0 s'il n'est pas stable ou si le niveau a changé). */
  heldDays(name, ext) { const a = this.s.ages[name]; return a && a.since && a.key === keyOf(ext) ? Math.max(0, (this.now() - a.since) / DAY) : 0; }
  /**
   * À appeler quand un Âge est analysé. Renvoie null, ou { tier, korfah } si cette lecture fait monter le titre (korfah : vrai pour le tout premier Âge tenu).
   * @param stability  la stabilité (0 à 100) de l'Âge tel qu'il est écrit
   */
  watch(name, stability, ext) {
    const now = this.now(), key = keyOf(ext); let a = this.s.ages[name];
    if (!(stability >= STABLE_AT)) { if (a) this.s.ages[name] = { key, since: null }; return null; }
    if (!a || a.key !== key || !a.since) a = this.s.ages[name] = { key, since: now };
    if (now - a.since < HOLD_DAYS * DAY) return null;
    const tier = tierOf(ext), first = !this.s.korfah; let up = null;
    if (first) { this.s.korfah = now; up = { tier: Math.max(tier, this.s.tier), korfah: true }; }
    if (tier > this.s.tier) { this.s.tier = tier; up = { tier, korfah: first }; }
    return up;
  }
  forget(name) { delete this.s.ages[name]; }
  rename(from, to) { if (this.s.ages[from]) { this.s.ages[to] = this.s.ages[from]; delete this.s.ages[from]; } }
}

module.exports = { DAY, HOLD_DAYS, STABLE_AT, TITLES, DNI_WORDS, tierOf, keyOf, Status };
