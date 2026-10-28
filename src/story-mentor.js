"use strict";
/**
 * ESSAI : l'Âge du mentor. Pour les chapitres où l'on écrit un monde, Adrin Vesparath montre le sien :
 *  - toujours après la réussite (« voici comment je l'avais écrit, moi ») ;
 *  - en recours pendant le chapitre : quand on redemande un indice après le dernier (ou deux fois, s'il n'y en a pas),
 *    ou quand trois Livres différents, l'encre sèche, n'ont pas réussi le chapitre et que deux jours ont passé depuis son ouverture.
 * Son Âge est écrit sous la lettre du chapitre, dans la note, en citation (jamais dans un bloc `age` : il ne compte pas comme un Âge du dossier).
 * Le monde du mentor part du monde de départ du chapitre (story.js, WORLDS) ; pour « le monde difficile » et « le monde étrange »,
 * c'est le monde de référence, pour lequel le nom de la note a été choisi : il tient pour ce nom.
 */
const ST = require("./story");

const DAY = 86400000, TRIES = 3, WAIT = 2 * DAY;
const MENTOR = {
  rest: {
    lines: () => ["single_sun", "steady_cycle", "water", "fern", "grass"],
    why: { en: "A sky, water, and something that grows: three families, five pages, nothing that quarrels.", fr: "Un ciel, de l'eau, et quelque chose qui pousse : trois familles, cinq pages, rien qui se querelle." },
  },
  weather: {
    lines: () => ["single_sun", "steady_cycle", "water", "rain: sometimes, dawn"],
    why: { en: "The rain is the same; only its line changed: it now comes and goes, sometimes, at dawn.", fr: "La pluie est la même ; seule sa ligne a changé : elle vient et repart, parfois, à l'aube." },
  },
  laws: {
    lines: () => ["single_sun", "steady_cycle", "water", "salt", "mass: 0.9", "age: 4.5"],
    why: { en: "Two values and nothing more: a planet a little lighter than ours, as old as our own sun.", fr: "Deux valeurs et rien de plus : une planète un peu plus légère que la nôtre, aussi vieille que notre soleil." },
  },
  hard: {
    lines: () => ST.WORLDS.hard.ref.map((l) => (l === "rain" ? "rain: sometimes, dawn" : l)).concat(["mass: 1", "age: 4.5"]),
    why: { en: "Eight pages over four families, a rain that comes and goes, two values: each piece is simple, it is holding them all together that asks for care.", fr: "Huit pages sur quatre familles, une pluie qui vient et repart, deux valeurs : chaque morceau est simple, c'est de les tenir tous ensemble qui demande du soin." },
  },
  strange: {
    lines: () => ST.WORLDS.strange.ref.slice(),
    why: { en: "Nothing violent: the strange is born of gentle meetings. The stone wakes the tablet, the cold crystallises the rain.", fr: "Rien de violent : l'étrange naît de rencontres douces. La pierre réveille la tablette, le froid cristallise la pluie." },
  },
};
const has = (id) => !!MENTOR[id];

/** Le texte à écrire sous la lettre du chapitre. `kind` : "after" (réussi) ou "rescue" (recours). */
function section(id, lang, kind) {
  const m = MENTOR[id]; if (!m) return "";
  const fr = lang === "fr", head = fr ? "### Comment je l'aurais écrit" : "### How I would have written it";
  const intro = kind === "after"
    ? (fr ? "Tu as réussi. Voici comment je l'avais écrit, moi : ce n'est pas la seule façon, et la tienne tient aussi." : "You did it. Here is how I had written it myself: it is not the only way, and yours holds too.")
    : (fr ? "Tu cherches depuis un moment, et c'est bien : on apprend en cherchant. Voici comment je l'écrirais. Recopie-le dans le bloc si tu veux le voir tenir, mais essaie d'abord de comprendre pourquoi il tient." : "You have been searching for a while, and that is good: one learns by searching. Here is how I would write it. Copy it into the block if you want to see it hold, but try first to understand why it holds.");
  const lines = m.lines().map((l) => "> `" + l + "`").join("\n");
  return `\n\n---\n${head}\n\n${intro}\n\n${lines}\n\n${m.why[fr ? "fr" : "en"]}\n\n— Adrin Vesparath, seltahn\n`;
}

/** L'état du mentor dans l'état de l'histoire. */
const stateOf = (st) => st.mentor || (st.mentor = { given: {}, opened: {}, tries: {}, asked: {} });

/** Le chapitre en cours s'ouvre (une seule fois) ; on compte les Livres essayés depuis : nés après l'ouverture, l'encre sèche, sans avoir réussi. */
function track(st, id, ages, now, dryMs) {
  if (!has(id)) return false;
  const M = stateOf(st), t0 = M.opened[id] || (M.opened[id] = now), list = M.tries[id] || (M.tries[id] = []);
  let changed = false;
  for (const a of ages || []) if (a && a.path && (a.born || 0) >= t0 - 60000 && now - (a.born || 0) >= dryMs && !list.includes(a.path)) { list.push(a.path); changed = true; }
  return changed;
}
/** Le recours est-il dû ? (pas encore donné ; trois Livres et deux jours, ou un indice redemandé) */
function rescueDue(st, id, now) {
  if (!has(id)) return false; const M = stateOf(st); if (M.given[id]) return false;
  return !!M.asked[id] || ((M.tries[id] || []).length >= TRIES && now - (M.opened[id] || now) >= WAIT);
}
/** La commande d'indice : redemandée après le dernier indice (ou une seconde fois, s'il n'y a pas d'indice) → le recours. Renvoie true si le recours est dû maintenant. */
function askAgain(st, id, hintsLeft, hadHints) {
  if (!has(id)) return false; const M = stateOf(st); if (M.given[id]) return false;
  if (hintsLeft) return false;
  if (!hadHints && !M.asked[id + "#once"]) { M.asked[id + "#once"] = true; return false; } // sans indice : la première fois, le mentor encourage ; la seconde, il montre
  M.asked[id] = true; return true;
}
const give = (st, id, kind) => { stateOf(st).given[id] = kind; };
const given = (st, id) => (st.mentor && st.mentor.given && st.mentor.given[id]) || null;

module.exports = { MENTOR, TRIES, WAIT, has, section, stateOf, track, rescueDue, askAgain, give, given };
