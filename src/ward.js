"use strict";
/*
 * La garde (claude/DESIGN-art-bahro.md §4), modèle pur. Le cachet apparaît sur le bureau de l'atelier quand la bande du haut des fresques a été vue
 * (six révélations). Un Livre scellé garde le serpent au dos et au médaillon : rien ne se porte de cet Âge ni vers lui (choix de l'auteur, 25 oct. :
 * le sceau refuse dès qu'on l'a, avant comme après le 17). Le Livre reste écrivable et liable : le serpent ne touche que les Bahro.
 * Sceller ne défait pas un portage déjà là (encre sèche, loi 15) : le fragment reste tel qu'il était à la dernière lecture, il ne respire plus.
 * État, dans la réserve du Relto (src/entry.js, poolExt) : `X.ward[graine] = date`, `X.carryKept[graine|ligne] = fragment`.
 */
const FC = require("./fresco");

/** Le cachet est-il sur le bureau ? Quand la bande du haut (celle des Bahro, le serpent compris) a été vue. */
const sealHere = (cave) => !!cave && (cave.revealed || 0) >= FC.BANDS;

const wardsOf = (X) => (X.ward && typeof X.ward === "object" ? X.ward : (X.ward = {}));
/** Cet Âge est-il gardé ? */
const isWarded = (X, seed) => !!(X && X.ward && typeof X.ward === "object" && X.ward[String(seed)]);
/** Scelle ou descelle ; renvoie vrai si le Livre est maintenant gardé. */
function toggle(X, seed) {
  const w = wardsOf(X), k = String(seed);
  if (w[k]) { delete w[k]; return false; }
  w[k] = Date.now(); return true;
}

/* ce qui était porté : la dernière lecture d'un fragment, pour le garder tel quel si un sceau tombe ensuite */
const keptKey = (seed, raw) => String(seed) + "|" + String(raw || "").trim().replace(/\s+/g, " ").toLowerCase();
const FIELDS = ["what", "contra", "from", "path", "ids", "srcStability", "srcFreq"];
/** Retient un fragment lu ; renvoie vrai s'il a changé depuis la dernière fois (il faut sauver). */
function keep(X, seed, raw, frag) {
  const store = X.carryKept && typeof X.carryKept === "object" ? X.carryKept : (X.carryKept = {}), k = keptKey(seed, raw);
  const next = {}; for (const f of FIELDS) if (frag[f] != null) next[f] = Array.isArray(frag[f]) ? frag[f].slice() : frag[f];
  const prev = store[k];
  if (prev && JSON.stringify(prev) === JSON.stringify(next)) return false;
  store[k] = next; return true;
}
/** Le fragment gardé pour cette ligne, ou null. */
function kept(X, seed, raw) {
  const k = X && X.carryKept && X.carryKept[keptKey(seed, raw)];
  return k && Array.isArray(k.ids) && k.ids.length ? { ...k, ids: k.ids.slice() } : null;
}

module.exports = { sealHere, isWarded, toggle, keptKey, keep, kept };
