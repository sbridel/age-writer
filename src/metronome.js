"use strict";
/**
 * Le métronome de l'observatoire, modèle pur : un balancier de laiton qui bat le prorahn, mécaniquement. Comme la
 * pierre-calendrier, il compte bien mais ne connaît pas l'heure : il est seulement en phase avec le pouls du Great Zero.
 *
 * Chaque prorahn est un battement : le balancier est à l'une de ses deux extrémités (`swing` = ±1) à chaque prorahn
 * entier, exactement quand le vrai pouls du Zéro culmine (src/relto-telescope.js : lueur maximale à `frac(...) = 0`).
 * Une source d'une autre période (la fausse ligne de Me'erta, ≈ 1,06 prorahn ; un pulsar, une étoile à neutrons) culmine
 * à d'autres instants : `slip` mesure son décalage contre le balancier, battement après battement.
 * Testé dans test/instruments.test.js.
 */
const DT = require("./dnitime");

const PRORAHN_MS = DT.MS_PER_HAHR / DT.PRO_PER_HAHR; // ≈ 1,39 s
const AMPLITUDE = 0.11; // l'angle extrême du balancier, en radians (dessin)

/** La position en battements (prorahn, ou périodes de `period` prorahn) depuis la référence D'ni. */
function beatPos(ms, period = 1) { return (ms - DT.REF) / (PRORAHN_MS * (period > 0 ? period : 1)); }
/** Le numéro du battement en cours (comme le pouls du Zéro). */
function tickOf(ms) { return Math.floor(beatPos(ms)); }
/** Le balancier, de −1 à 1 : ±1 aux extrémités, à chaque prorahn entier ; il change de côté à chaque battement. */
function swing(ms) { return Math.cos(Math.PI * beatPos(ms)); }
/** Le côté (1 ou −1) où le balancier frappe au battement `n`. */
function sideOf(n) { return ((n % 2) + 2) % 2 === 0 ? 1 : -1; }
/** L'instant (ms) du `k`-ième sommet d'une source de période `period` (en prorahn). */
function peakAt(k, period = 1) { return DT.REF + k * period * PRORAHN_MS; }
/**
 * Le décalage (en fraction de prorahn, de −0,5 à 0,5) entre le `k`-ième sommet d'une source de période `period` et le
 * battement du balancier le plus proche : 0 pour le vrai pouls ; il glisse de période en période pour la fausse ligne.
 */
function slip(k, period = 1) { const t = k * period; return t - Math.round(t); }
/** Le Great Zero frappe plus fort une fois par gorahn (tous les 25 battements) : le coup « marqué » du balancier (extension assumée). */
const GORAHN = 25;
function isMarked(n) { return ((Math.round(n) % GORAHN) + GORAHN) % GORAHN === 0; }

module.exports = { GORAHN, isMarked, PRORAHN_MS, AMPLITUDE, beatPos, tickOf, swing, sideOf, peakAt, slip };
