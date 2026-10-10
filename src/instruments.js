"use strict";
/**
 * Le réglage des instruments (télescope et Imageur) : `ext.instrumentsMode`.
 *  - "easy" (par défaut) : l'observatoire dit après chaque geste si la lueur s'avive ou pâlit, la scintillation est faible,
 *    la fausse ligne de Me'erta n'apparaît jamais, les étoiles mortes ne font que brouiller un peu l'image ;
 *  - "guild" (« L'Art de la Guilde ») : le comportement de la 1.19 (scintillation forte, fausse ligne, faux pouls, lumière courbée).
 * Toute autre valeur (ou rien) se lit comme "easy". Les autres modules lisent ce réglage par `isGuild(ext)`.
 * Module pur.
 */
const MODES = ["easy", "guild"];
const DEFAULT_MODE = "easy";
/** Le mode des instruments d'un objet de réglages (`plugin.ext`) ; une chaîne est aussi acceptée. */
function modeOf(ext) { const v = ext && typeof ext === "object" ? ext.instrumentsMode : ext; return v === "guild" ? "guild" : DEFAULT_MODE; }
/** Vrai si les instruments demandent l'Art de la Guilde. */
function isGuild(ext) { return modeOf(ext) === "guild"; }

module.exports = { MODES, DEFAULT_MODE, modeOf, isGuild };
