"use strict";
/**
 * La profondeur d'un équilibre (claude/DESIGN-profondeur-d-equilibre.md), par le TEST PAR RETRAIT :
 * le moteur retire chaque ligne écrite, une à une, relance l'analyse et regarde si l'Âge tombe sous le seuil stable.
 *   thread  (sur le fil)  au moins une ligne, retirée, fait tomber l'Âge sous « stable » : elle le porte
 *   held    (tenu)        aucune ne le fait tomber, mais l'une au moins le fragilise nettement (WEAKEN points et plus)
 *   deep    (profond)     aucun retrait ne le fait tomber ni ne le fragilise
 * Seul un Âge stable a une profondeur (un Âge instable est déjà tombé). Aucun chiffre n'est montré : une phrase.
 * Les pages ouvertes ne sont PAS tirées dans ces essais (on juge ce que le joueur a écrit, pas la chance du tirage).
 * Fonction pure : l'analyse est fournie (`analyse(texte) → { stability }`), la couche d'extension la branche sur le moteur.
 */
const STABLE_AT = 75, WEAKEN = 10, MAX_LINES = 24, MIN_LINES_DEEP = 5;
const SKIP_LINE = /^\s*(#|seed\s*:|link\s*:|return\s*:|panel\s*:)/i;

/** Les lignes qu'on peut retirer : ni vides, ni réglages (graine, liens, quantités, physique, taille…). */
function removable(src, isConfig) {
  const lines = String(src || "").split("\n"), idx = [];
  lines.forEach((raw, i) => { const l = raw.trim(); if (l && !SKIP_LINE.test(l) && !(isConfig && isConfig(l))) idx.push(i); });
  return { lines, idx };
}

/**
 * @param src      le texte du bloc `age`
 * @param analyse  (texte) → analyse (avec `.stability`) ; sans tirage des pages ouvertes
 * @param isConfig (ligne) → vrai pour une ligne de réglage qui ne se retire pas
 * @returns null si l'Âge n'est pas stable (ou n'a rien à retirer), sinon { state, pillars: [ligne…], weak: [ligne…], base }
 */
function depthOf(src, analyse, isConfig) {
  const base = analyse(src); if (!base || base.stability < STABLE_AT) return null;
  const { lines, idx } = removable(src, isConfig);
  if (!idx.length) return null;
  const pillars = [], weak = [];
  for (const i of idx.slice(0, MAX_LINES)) {
    const without = lines.filter((_, j) => j !== i).join("\n");
    const r = analyse(without); if (!r) continue;
    const text = lines[i].trim();
    if (r.stability < STABLE_AT) pillars.push({ line: text, drop: base.stability - r.stability });
    else if (base.stability - r.stability >= WEAKEN) weak.push({ line: text, drop: base.stability - r.stability });
  }
  const state = pillars.length ? "thread" : weak.length ? "held" : "deep";
  pillars.sort((a, b) => b.drop - a.drop); weak.sort((a, b) => b.drop - a.drop);
  return { state, pillars, weak, base: base.stability, lines: idx.length };
}

/** La phrase du panneau (anglais ou français). Le nom du pilier est la ligne écrite, entre guillemets. */
const TEXT = {
  en: {
    deep: "It rests like a marble at the bottom of a bowl: take almost anything away and it holds.",
    held: (p) => `It holds, but ${p} carries more of it than the rest.`,
    thread: (p, n) => (n > 1 ? `It holds by a thread: without ${p}, and a few others, everything gives way.` : `It holds by a thread: without ${p}, everything gives way.`),
  },
  fr: {
    deep: "Il repose comme une bille au fond d'un bol : retire presque n'importe quoi, il tient.",
    held: (p) => `Il tient, mais ${p} le porte plus que le reste.`,
    thread: (p, n) => (n > 1 ? `Il tient sur le fil : sans ${p}, et quelques autres, tout cède.` : `Il tient sur le fil : sans ${p}, tout cède.`),
  },
};
function note(d, fr) {
  if (!d) return "";
  const T = fr ? TEXT.fr : TEXT.en, q = (x) => `« ${x} »`;
  if (d.state === "deep") return d.lines >= MIN_LINES_DEEP ? T.deep : ""; // « profond » ne se dit que d'un Âge qui a de la matière (un Âge de deux lignes l'est sans mérite)
  if (d.state === "held") return T.held(q(d.weak[0].line));
  return T.thread(q(d.pillars[0].line), d.pillars.length);
}

module.exports = { STABLE_AT, WEAKEN, MAX_LINES, MIN_LINES_DEEP, removable, depthOf, note };
