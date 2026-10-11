"use strict";
// Le courrier du mentor : une corbeille à lettres sur le bureau de l'atelier. Une seule note de courrier ; de temps en temps, au hasard après un délai,
// une lettre y arrive : elle parle d'un bloc que l'apprenti ne connaît pas encore (ses trois mots descripteurs, sa famille, son nom).
const R = require("./engine/registry");
const ST = require("./story");
const DFR = require("./descriptors-fr");
const MIN_MIN = 8, MAX_MIN = 25; // délai habituel entre deux lettres, en minutes
const RANGES = { fast: [2, 6], normal: [MIN_MIN, MAX_MIN], slow: [30, 90], daily: [22 * 60, 26 * 60] }; // selon le réglage `mailDelay` (« normal » si absent ou inconnu) ; daily : environ une lettre par jour
const FAMILY = { cosmological: { en: "sky", fr: "ciel" }, geological: { en: "ground", fr: "sol" }, ecological: { en: "living things", fr: "vivant" }, weather: { en: "weather", fr: "météo" }, metaphysical: { en: "the beyond", fr: "l'au-delà" } };
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** Les blocs dont une lettre peut parler : ceux qui s'écrivent, que l'apprenti ne connaît pas, et pas ceux de l'épreuve finale. */
function candidates(known, told) {
  const hold = new Set(ST.WORLDS.strange.ref || []), skip = new Set(told || []);
  return R.blockList.filter((b) => b.writable && b.descriptors && b.descriptors.length && !known.has(b.id) && !skip.has(b.id) && !hold.has(b.id)).map((b) => b.id).sort();
}
/** Le bloc de la prochaine lettre (au hasard, mais stable pour une graine et un rang), ou null s'il n'y en a plus. */
function pick(known, told, seed) {
  const c = candidates(known, told); return c.length ? c[hash(`${seed}:${(told || []).length}`) % c.length] : null;
}
/** Le texte de la lettre : la voix d'Adrin Vesparath, trois tournures qui alternent. */
function letter(id, lang, n) {
  const b = R.blockList.find((x) => x.id === id), fr = lang === "fr", d = (b.descriptors || []).map((w) => (fr ? DFR.tr(w) : w)).join(", "), fam = (FAMILY[b.axis] || { en: "the world", fr: "le monde" })[fr ? "fr" : "en"];
  const T = fr
    ? [`Un élève m'a demandé ce que voulait dire un mot que tu n'as pas encore croisé : celui qui est *${d}*. Il appartient à la famille « ${fam} ». Écris-le \`${id}\`.`, `Quelque chose pour ton carnet : quand tu veux dire *${d}*, la Guilde écrit \`${id}\`. C'est un mot de la famille « ${fam} ».`, `Je repensais à toi, ce matin. *${d}* : voilà ce que \`${id}\` fait à un monde. Range-le dans la famille « ${fam} ».`]
    : [`A pupil asked me about a word you have not met yet: the one that is *${d}*. It belongs with ${fam}. Write it \`${id}\`.`, `Something for your notebook: when you mean *${d}*, the Guild writes \`${id}\`. It is a word of ${fam}.`, `I was thinking of you this morning. *${d}*: that is what \`${id}\` does to a world. File it under ${fam}.`];
  return T[n % T.length] + (fr ? "\n\n— Adrin Vesparath, seltahn" : "\n\n— Adrin Vesparath, seltahn");
}
/** Délai (ms) jusqu'à la prochaine lettre ; `u` : un nombre entre 0 et 1 (le hasard) ; `mode` : `fast`, `normal`, `slow` ou `daily`. */
const delay = (u, mode) => { const [lo, hi] = RANGES[mode] || RANGES.normal; return Math.round((lo + (hi - lo) * u) * 60000); };

/**
 * Fait avancer le courrier d'une histoire. `st` : l'état de l'histoire (st.mail est créé au besoin).
 * Renvoie la lettre à ajouter à la note, ou null. Au premier appel, il ne fait que programmer l'arrivée.
 */
function step(st, now, known, seed, lang, rand, mode) {
  const m = st.mail || (st.mail = { at: 0, told: [], unread: false, note: "" });
  if (!m.at) { m.at = now + delay(rand(), mode); return null; }
  if (m.unread || now < m.at) return null;
  const id = pick(known, m.told, seed);
  if (!id) { m.at = now + 60 * 60000; return null; }
  const text = letter(id, lang, m.told.length); m.told.push(id); m.unread = true; m.at = 0;
  return { id, text };
}
/** Le joueur a ouvert la note : plus de courrier non lu ; la prochaine lettre est programmée. */
function read(st, now, rand, mode) { const m = st.mail; if (!m || !m.unread) return; m.unread = false; m.at = now + delay(rand(), mode); }

module.exports = { candidates, pick, letter, delay, step, read, MIN_MIN, MAX_MIN, RANGES };
