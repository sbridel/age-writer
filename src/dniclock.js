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

// ---- les anneaux de la sphère armillaire (vue rapprochée, src/relto-clock.js) -----------------------------------
// Quatre anneaux portent les unités, du dehors au dedans : vailee (10 par hahr), yahr (29 par vailee), gahrtahvo (5 par yahr),
// tahvo (25 par gahrtahvo). Chacun fait un tour par cycle de l'unité qui le contient. Un index fixe, en haut, lit chaque anneau :
// le chiffre de l'unité en cours est sous l'index (au milieu de l'unité, il y est exactement).
const PRO_MS = DT.MS_PER_HAHR / DT.PRO_PER_HAHR; // un prorahn, en ms
const RINGS = [ // size : durée d'une unité en prorahn ; base : premier chiffre gravé (le vailee et le yahr comptent depuis 1)
  { key: "vailee", n: 10, size: 29 * 78125, base: 1 },
  { key: "yahr", n: 29, size: 78125, base: 1 },
  { key: "gahrtahvo", n: 5, size: 15625, base: 0 },
  { key: "tahvo", n: 25, size: 625, base: 0 },
];
const GLOW_MS = 6000; // un chiffre qui change luit, puis s'éteint en 6 s

/** Position continue dans le hahr en cours, en prorahn (0 ≤ p < PRO_PER_HAHR). */
function proInHahr(ms) {
  const delta = Number(ms) - DT.REF, y = Math.floor(delta / DT.MS_PER_HAHR), p = ((delta - y * DT.MS_PER_HAHR) / DT.MS_PER_HAHR) * DT.PRO_PER_HAHR;
  return Number.isFinite(p) ? Math.min(DT.PRO_PER_HAHR - 1e-6, Math.max(0, p)) : 0;
}

/**
 * Les anneaux à l'instant `ms` : pour chacun `{ key, n, base, value (chiffre gravé sous l'index), index (0..n−1), pos (0..1 dans son
 * cycle), angle (rotation de l'anneau, radians), elapsed (ms depuis le début de l'unité en cours) }`. Le chiffre i est gravé à
 * l'angle `angle + (i + 0.5) / n · 2π` compté depuis l'index (en haut, sens horaire).
 */
function rings(ms = Date.now()) {
  const p = proInHahr(ms);
  return RINGS.map((u) => {
    const cyc = u.size * u.n, inCyc = p % cyc, index = Math.min(u.n - 1, Math.floor(inCyc / u.size)), pos = inCyc / cyc;
    return { key: u.key, n: u.n, base: u.base, value: index + u.base, index, pos, angle: -pos * 2 * Math.PI, elapsed: (inCyc - index * u.size) * PRO_MS };
  });
}

/** Angle (radians, depuis l'index) où se trouve le chiffre i d'un anneau ; ramené dans ]−π, π]. */
function digitAngle(ring, i) { let a = ring.angle + ((i + 0.5) / ring.n) * 2 * Math.PI; a = a % (2 * Math.PI); if (a > Math.PI) a -= 2 * Math.PI; if (a <= -Math.PI) a += 2 * Math.PI; return a; }

/** Lueur d'un chiffre qui vient de changer (1 au changement, 0 après `fade` ms) : discrète, sans compteur. */
function glowAt(elapsed, fade = GLOW_MS) { return elapsed >= 0 && elapsed < fade ? Math.pow(1 - elapsed / fade, 2) : 0; }

/** Les lueurs de chaque anneau à l'instant `ms` : `{ vailee, yahr, gahrtahvo, tahvo }` (mouvement réduit : tout à 0). */
function glows(ms = Date.now(), still = false) {
  const o = {}; for (const r of rings(ms)) o[r.key] = still ? 0 : glowAt(r.elapsed); return o;
}

module.exports = { MS_PER_YAHR, DRIFT, synced, driftYahr, reltoDate, PRO_MS, RINGS, GLOW_MS, proInHahr, rings, digitAngle, glowAt, glows };
