"use strict";
/**
 * Le microscope de l'atelier (claude/DESIGN-reve-et-caverne-bahro.md, section 12). Pur.
 *
 * Le flacon : on le remplit au bassin de la caverne ; il garde l'eau du jour où on l'a puisée (`ext.cave.flask` : l'instant,
 * les colonies, le dernier repas, et si le lac venait d'être gavé). L'oculaire la lit sans chiffre : combien de cellules, leur
 * éclat (nourries ces jours-ci ou des braises), leur rythme (elles s'allument plus fort au début de chaque gahrtahvo, cinq fois
 * par yahr : l'heure D'ni, pas la nôtre), leur état (elles se divisent, elles dorment, ou elles ont crevé en rafale).
 */
const DAY = 86400000, FEEDS_KEPT = 12, BURST = 3;

/** Les repas du lac (les ambrés tombés dans le bassin), du plus ancien au plus récent ; on en garde douze. */
function logFeed(cv, at) { cv.feeds = (Array.isArray(cv.feeds) ? cv.feeds.filter((x) => x > 0) : []).concat([at]).slice(-FEEDS_KEPT); }

/** Remplir le flacon au bassin, à l'instant `now`. */
function sample(cv, now) {
  const feeds = Array.isArray(cv.feeds) ? cv.feeds : [], recent = feeds.filter((x) => x <= now && now - x < DAY).length;
  cv.flask = { at: now, colonies: Math.max(0, cv.colonies || 0), fedAt: cv.fedAt || 0, burst: recent >= BURST };
  return cv.flask;
}

/** Le rythme D'ni (0..1) : un pic au début de chaque gahrtahvo, qui retombe en une heure environ. */
function rhythm(now) {
  const DC = require("./dniclock"), u = DC.rings(now).find((x) => x.key === "tahvo"), f = u ? u.pos : 0; /* l'anneau des tahvo fait un tour par gahrtahvo */
  return Math.pow((1 + Math.cos(2 * Math.PI * f)) / 2, 6);
}

/**
 * Ce que montre la goutte : { dry } (pas de flacon) ou { cells, fresh (0..1 : nourries ces jours-ci → 1, oubliées → 0),
 * divide (part de cellules qui se divisent), dormant, burst, seed }.
 */
function paramsOf(flask) {
  if (!flask || !(flask.at > 0)) return { dry: true };
  const c = Math.max(0, flask.colonies || 0), days = flask.fedAt > 0 ? (flask.at - flask.fedAt) / DAY : Infinity;
  const fresh = days < 2 ? 1 : days < 5 ? 1 - (days - 2) / 3 : 0;
  return { dry: false, cells: c ? Math.min(90, 2 + Math.round(c * 1.2)) : 0, fresh, divide: fresh > 0.7 && !flask.burst ? 0.14 : 0, dormant: fresh < 0.2 && c > 0, burst: !!flask.burst && c > 0, seed: Math.floor(flask.at / 1000) % 100000 };
}

module.exports = { DAY, BURST, logFeed, sample, rhythm, paramsOf };
