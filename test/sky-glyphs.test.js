"use strict";
// Glyphes du ciel étendu (src/sky.js) : chaque bloc a un vrai glyphe (plus de repli procédural), distinct de tous les autres,
// fait des mêmes formes que les glyphes d'origine, aux coordonnées finies dans le cadre 0..100.
const assert = require("assert"); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const G = require("../src/engine/glyphs");
const S = require("../src/sky");
const R = require("../src/engine/registry");
const { SKY_ENTRIES } = require("../src/engine/data/sky");

const ids = S.SKY_BLOCKS.map((b) => b.id);
for (const id of ["comet", "asteroid_belt", "asteroid_field", "planet_rings", "red_sun", "orange_sun", "white_sun", "blue_sun", "violet_sun", "black_sun", "green_sun"]) ok(ids.includes(id), `${id} est un bloc du ciel étendu`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const id of ids) {
  ok(G.GLYPHS[id] && !same(G.glyphShapes(id), G.proceduralGlyph(id)), `${id} : un vrai glyphe, pas le repli procédural`);
  const shapes = G.glyphShapes(id);
  ok(shapes.length >= 2 && shapes.every((s) => ["polygon", "polyline", "line", "rect"].includes(s.kind)), `${id} : formes connues`);
  const pts = shapes.flatMap((s) => s.pts || (s.a ? [s.a, s.b] : [[s.x, s.y]]));
  ok(pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100), `${id} : dans le cadre`);
  ok(/<(polygon|polyline|line)/.test(G.glyphSvg(id, 0, 0, 24)) && !/NaN|undefined/.test(G.glyphSvg(id, 0, 0, 24, "strong")), `${id} : SVG propre, même tremblant`);
}
// tous différents entre eux, et différents des glyphes du moteur
const svg = new Map(); for (const id of Object.keys(G.GLYPHS)) svg.set(id, G.glyphInner(id));
for (const id of ids) { const dup = [...svg].filter(([o, s]) => o !== id && s === svg.get(id)).map(([o]) => o); ok(!dup.length, `${id} : distinct (${dup.join(", ")})`); }
// les soleils de couleur ne se distinguent pas par la couleur (monochrome) : leurs formes diffèrent deux à deux
const suns = ids.filter((id) => S.HUES[id]); ok(suns.length === 7, "sept soleils de couleur");
for (let i = 0; i < suns.length; i++) for (let j = i + 1; j < suns.length; j++) ok(!same(G.glyphShapes(suns[i]), G.glyphShapes(suns[j])), `${suns[i]} ≠ ${suns[j]}`);
// plus aucun bloc de ciel qui s'écrit ne tombe dans le repli procédural
const sky = new Set(SKY_ENTRIES.map((e) => e.id).filter((id) => R.writableIds.has(id) || ids.includes(id)));
const procSky = [...sky].filter((id) => same(G.glyphShapes(id), G.proceduralGlyph(id)));
ok(!procSky.length, `blocs de ciel encore procéduraux : ${procSky.join(", ")}`);
console.log(`sky-glyphs : ${n} vérifications OK`);
