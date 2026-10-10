"use strict";
/**
 * L'horloge D'ni du Relto et la dérive du calendrier.
 *
 * Tant que la page « D'ni clock » n'est pas attachée (elle se débloque quand le télescope a trouvé le Great Zero), le
 * Relto ne connaît la date que par sa pierre-calendrier, une horloge mécanique laissée sans réglage : elle dérive de
 * quelques yahr, d'un écart tiré de la graine du Relto (toujours le même pour un Relto donné), et l'heure se tait.
 * Une fois l'horloge attachée, son pilier capte le faisceau du Zéro comme une antenne : la date se recale, l'heure
 * s'affiche. (Que le faisceau porte le temps D'ni est une extension du lore, assumée : le canon n'en dit rien.)
 *
 * Module pur (sans DOM ni Obsidian) : testé dans test/dniclock.test.js.
 */
const DT = require("./dnitime");
const { rng } = require("./util");

const MS_PER_YAHR = DT.MS_PER_HAHR / 290;
const DRIFT = { min: 2, max: 7 }; // la pierre se trompe de 2 à 7 yahr, en avance ou en retard

/** L'horloge est-elle là (page attachée et active) ? */
function synced(scene) { return !!(scene && Array.isArray(scene.additions) && scene.additions.some((a) => a && a.type === "dniclock")); }

/** L'écart de la pierre-calendrier, en yahr (entier non nul, signé), tiré de la graine du Relto. */
function driftYahr(seed) {
  const r = rng(((Number(seed) || 0) ^ 0x0ca1e7da) >>> 0); r();
  const n = DRIFT.min + Math.floor(r() * (DRIFT.max - DRIFT.min + 1));
  return r() < 0.5 ? -n : n;
}

/** La date telle que le Relto la connaît : exacte avec l'horloge, décalée sans elle. `{ ...DT.fromDate(), synced, drift }` */
function reltoDate(scene, now = Date.now()) {
  const ok = synced(scene), drift = ok ? 0 : driftYahr(scene && scene.seed);
  return { ...DT.fromDate(now + drift * MS_PER_YAHR), synced: ok, drift };
}

module.exports = { MS_PER_YAHR, DRIFT, synced, driftYahr, reltoDate };
