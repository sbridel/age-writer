"use strict";
// 2.5 « ce que le cadre ne montre pas » : quand le soleil (ou la lune) n'est pas dans l'image, la lumière dit où il est ; la grotte pèse moins.
const assert = require("assert");
const G = require("../src/genscene");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const m = { W: 640, H: 384 }, at = (x, y, e = 0.8) => G.sunWhere(m, [{ x, y, e, r: 30 }]);
ok(at(320, 100).length === 0, "dans le cadre : aucun signe");
ok(at(320, -60)[0].where === "above", "juste au-dessus du cadre : une lueur au bord haut");
ok(at(320, -400)[0].where === "behind", "très haut, sorti par le haut d'une vue au levant : dans le dos");
ok(at(-640, 260)[0].where === "behind", "face au pôle à midi (renvoyé hors cadre à gauche) : dans le dos");
ok(at(320, -60, 0.01).length === 0, "sous l'horizon (nuit) : rien");
ok(at(320, -60)[0].k > at(320, -200)[0].k, "plus il est loin du bord, plus la lueur faiblit");
/* la grotte : un point de liaison sur neuf environ, pas un sur six */
const base = { verdict: "stable", unrest: 0, suns: 1, ruins: [], trees: 0, terrain: "mountains", soil: "stone" };
let cave = 0, N = 2000; for (let s = 1; s <= N; s++) { const S = { ...base, seed: (s * 2654435761) >>> 0 }; const v = G.viewOfForTest(S, new Set(["stone"]), null); if (v.kind === "cave") cave++; }
ok(cave / N > 0.07 && cave / N < 0.13, `sans fissure, la grotte est tirée une fois sur dix environ (${cave} / ${N})`);
let cf = 0; for (let s = 1; s <= N; s++) { const S = { ...base, seed: (s * 2654435761) >>> 0 }; const v = G.viewOfForTest(S, new Set(["stone", "cave_fissure"]), null); if (v.kind === "cave") cf++; }
ok(cf / N > 0.32 && cf / N < 0.45, `avec la fissure de caverne, on y arrive à peu près une fois sur trois (${cf} / ${N})`);
console.log(`sunsign.test.js : ${n} vérifications ok`);
