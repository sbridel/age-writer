"use strict";
/**
 * Points d'accroche entre le moteur d'origine et la couche d'extension (src/entry.js les remplace au démarrage).
 * Les valeurs par défaut rendent le moteur identique à la 1.3.0.
 *   src      texte du bloc `age` en cours d'analyse (posé par analyseAge, lu par les hooks)
 *   adjust   retraite le résultat d'une analyse (loi du changement, livre-piège, pages abîmées, quantités)
 *   written  ensemble des symboles « déjà répondus » avant le tirage des pages ouvertes
 *   w        poids d'une option du tirage (solitude)
 *   skip     vrai pour une ligne du bloc `age` qui appartient à l'extension (ni symbole inconnu, ni page)
 */
const hooks = {
  src: null,
  adjust: (analysis) => analysis,
  written: (set) => set,
  w: (slotName, option) => option.weight,
  skip: () => false,
};

module.exports = { hooks };
