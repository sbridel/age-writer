"use strict";
/*
 * Le chapitre 17, « La pierre » (claude/DESIGN-art-bahro.md §2, §15 ; DESIGN-reve-et-caverne-bahro.md §9), modèle pur.
 * La pierre secrète du tiroir porte le signe des parois. On l'emporte jusqu'à la chambre aux étoiles (ouverte au degré 2 du lac) et on la lâche
 * dans la fissure : elle tombe dans les étoiles, s'arrête, disparaît (choix de l'auteur, 25 oct. : on ne les voit jamais, comme le livre de Myst)
 * : **l'accord**. Ou elle reste au bureau un jour entier après que le chemin s'est ouvert : **le commandement**. Les deux closent ; la différence
 * est mécanique, jamais morale.
 * État : `ext.story[clé].stone = { pathAt, ending, endedAt, told }`.
 */
const DAY = 86400000;
/** Le degré du lac qui ouvre la chambre aux étoiles (src/relto-stars.js, gate). */
const PATH_DEGREE = 2;

const stoneOf = (st) => (st.stone && typeof st.stone === "object" ? st.stone : (st.stone = {}));
const doneHas = (st, id) => ((st && st.done) || []).includes(id);
/** Le 17 est-il le chapitre en cours ? (le 16 réussi, le 17 pas encore) */
const current = (st) => !!st && doneHas(st, "accord") && !doneHas(st, "stone");
/** La fin choisie : "accord", "command", ou null. */
const endingOf = (st) => (st && st.stone && st.stone.ending) || null;

/**
 * Le temps passe : le chemin s'ouvre (le lac au degré 2) et, un jour plus tard, si la pierre n'a pas été lâchée, c'est le commandement.
 * Le chemin ouvert une fois compte, même si le lac retombe. Renvoie vrai si l'état a changé (il faut sauver).
 */
function watch(st, degree, now) {
  if (!current(st)) return false;
  const s = stoneOf(st); if (s.ending) return false;
  let changed = false;
  if (!s.pathAt && degree >= PATH_DEGREE) { s.pathAt = now; changed = true; }
  if (s.pathAt && now - s.pathAt >= DAY) { s.ending = "command"; s.endedAt = s.pathAt + DAY; changed = true; }
  return changed;
}
/** Peut-on emporter la pierre ? Seulement pendant le 17, avant la fin. */
const canTake = (st) => current(st) && !endingOf(st);
/** La pierre lâchée dans la fissure : l'accord. Renvoie vrai si la fin vient d'être prise. */
function give(st, now) {
  if (!canTake(st)) return false;
  const s = stoneOf(st); s.ending = "accord"; s.endedAt = now; return true;
}
/** Le commandement vient d'arriver et n'a pas encore été dit (une seule fois). */
function tellCommand(st) {
  const s = st && st.stone; if (!s || s.ending !== "command" || s.told) return false;
  s.told = true; return true;
}

/* ce qui change ensuite dans la caverne (la fiche, choix de l'auteur) */
/** La chambre aux étoiles : vasques et ombres éteintes après l'une ou l'autre fin (ils lient ailleurs ; ou personne ne vient plus). */
const chamberDark = (st) => endingOf(st) === "command"; /* le commandement seul éteint la chambre ; dans l'accord ils y reviennent (26 oct. 2026) */
/** Les traces (ombres qui fuient, mains humides) et les cris : seulement dans l'accord. */
const tracesOn = (st) => endingOf(st) !== "command";
/** Les fresques : dans le commandement, plus une peinture nouvelle après la fin (la date de coupe), sinon null. */
const frescoCut = (st) => (endingOf(st) === "command" ? st.stone.endedAt || 0 : null);
/** Où est la pierre : "drawer" (dans le tiroir), "desk" (posée sur le bureau, à côté de la pierre de liaison : le commandement), "gone" (l'accord). */
const placeOf = (st) => (endingOf(st) === "accord" ? "gone" : endingOf(st) === "command" ? "desk" : "drawer");

module.exports = { DAY, PATH_DEGREE, current, endingOf, watch, canTake, give, tellCommand, chamberDark, tracesOn, frescoCut, placeOf };
