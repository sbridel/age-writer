"use strict";
/**
 * Points d'accroche entre le moteur d'origine et la couche d'extension (src/entry.js les remplace au démarrage).
 * Les valeurs par défaut rendent le moteur identique à la 1.3.0.
 *   src      texte du bloc `age` en cours d'analyse (posé par analyseAge, lu par les hooks)
 *   adjust   retraite le résultat d'une analyse (loi du changement, livre-piège, pages abîmées, quantités)
 *   written  ensemble des symboles « déjà répondus » avant le tirage des pages ouvertes
 *   w        poids d'une option du tirage (solitude)
 *   skip     vrai pour une ligne du bloc `age` qui appartient à l'extension (ni symbole inconnu, ni page)
 *   norm     ramène une ligne à son symbole (`rain: sometimes, dawn` → `rain`, météo vivante) ; identité par défaut
 */
const hooks = {
  src: null,
  adjust: (analysis) => analysis,
  written: (set) => set,
  w: (slotName, option) => option.weight,
  skip: () => false,
  norm: (line) => line,
  noDraw: () => false, // vrai pour une graine dont les pages ouvertes ne sont pas tirées (Âges de l'histoire, au début)
  known: () => null, // chemin d'une note → ensemble des blocs que la palette du livre peut montrer (null : tous) ; l'histoire n'y met que ce qui a été appris
  ghosts: () => 0, // palette limitée : combien de glyphes non appris s'y devinent par groupe (silhouettes pâles, sans nom, non cliquables)
  ghostTip: () => "Not learned yet",
  ghostWord: (word) => word, // un mot descripteur d'un glyphe non appris, dans la langue de l'interface
  ghostSky: (category, phrase) => phrase, // l'indice d'un glyphe du ciel non appris, dans la langue de l'interface
  fissureNote: () => "", // la ligne du panneau quand la fissure abîme un monde instable (loi 14, Durée)
  lifeNote: () => "", // la ligne du panneau sur la vie et le sol (boucle, échelles, sol, énergie)
  dosageNote: () => "", // la ligne du panneau sur ce que le dosage a changé (vide : rien à dire)
  depthNote: () => "", // (texte du bloc, graine) → la phrase du panneau sur la profondeur de l'équilibre (test par retrait ; vide : rien à dire)
  seedName: null, // chemin d'une note d'Âge → sa graine (`age_seed`), ou null : le nom de la note
};

module.exports = { hooks };
