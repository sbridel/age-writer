"use strict";
// Les mots descripteurs des blocs (« heavy, bitter, patient ») sont en anglais dans le moteur et dans les blocs ajoutés par l'extension.
// Cette table donne leur équivalent français, au masculin singulier (les lettres du mentor les citent après « celui qui est… »).
// Un mot sans équivalent (un bloc de la bibliothèque de l'utilisateur, par exemple) reste tel quel. Le test `story.test.js` vérifie
// qu'aucun descripteur d'un bloc écrivable ne manque : un bloc de plus avec des mots nouveaux, c'est ici qu'on les ajoute.
const FR = {
  absolute: "absolu", arched: "arqué", beautiful: "beau", biting: "mordant", bitter: "amer", black: "noir", blind: "aveugle", bound: "relié",
  branching: "ramifié", bright: "éclatant", brittle: "cassant", carved: "gravé", clear: "limpide", closed: "fermé", cold: "froid", cracked: "craquelé",
  damp: "humide", dark: "sombre", deep: "profond", dense: "dense", drawn: "attiré", drifting: "dérivant", dry: "sec", dull: "terne",
  echoing: "résonnant", falling: "tombant", fine: "fin", flat: "plat", fleeting: "fugace", fluid: "fluide", folded: "replié", fragrant: "parfumé",
  green: "vert", grey: "gris", hard: "dur", heavy: "lourd", hidden: "caché", hissing: "sifflant", hollow: "creux", hot: "chaud",
  humming: "bourdonnant", hushed: "feutré", immense: "immense", incandescent: "incandescent", jagged: "dentelé", labyrinthine: "labyrinthique",
  lean: "maigre", "light-shy": "fuyant la lumière", listening: "à l'écoute", low: "bas", luminous: "lumineux", molten: "en fusion",
  muffling: "ouaté", narrow: "étroit", old: "vieux", open: "ouvert", ornate: "orné", pale: "pâle", patient: "patient", poor: "pauvre",
  quiet: "calme", reaching: "tendu", restless: "agité", rich: "riche", roaring: "rugissant", rooted: "enraciné", round: "rond", ruined: "en ruine",
  scattered: "éparpillé", sealed: "scellé", seamless: "sans couture", searing: "brûlant", sharp: "acéré", shifting: "mouvant", shimmering: "chatoyant",
  shut: "clos", silent: "silencieux", silken: "soyeux", silver: "argenté", slow: "lent", small: "petit", soft: "doux", solid: "solide",
  soundless: "sans bruit", sour: "aigre", spinning: "tournoyant", split: "fendu", steady: "régulier", still: "immobile", submerged: "immergé",
  sudden: "soudain", swaying: "ondoyant", tall: "haut", thick: "épais", thin: "ténu", tireless: "infatigable", translucent: "translucide",
  trembling: "tremblant", turning: "tournant", unread: "non lu", vast: "vaste", violet: "violet", waiting: "en attente", warm: "tiède",
  wary: "méfiant", watchful: "vigilant", weightless: "sans poids", white: "blanc", wrong: "dérangeant",
};

/** Un descripteur en français (le mot lui-même s'il n'a pas d'équivalent). */
const tr = (word) => FR[word] || word;

module.exports = { FR, tr };
