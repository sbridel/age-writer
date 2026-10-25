"use strict";
// La garde (src/ward.js ; claude/DESIGN-art-bahro.md §4) : le cachet arrive avec la bande du haut ; sceller, desceller ; le fragment retenu ; le serpent au médaillon.
const assert = require("assert");
const W = require("../src/ward");
const FC = require("../src/fresco");
const { coverSvg } = require("../src/cover");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

ok(!W.sealHere(null) && !W.sealHere({ revealed: FC.BANDS - 1 }) && W.sealHere({ revealed: FC.BANDS }), "le cachet : sur le bureau quand la bande du haut a été vue (six révélations)");
const X = {};
ok(!W.isWarded(X, 42) && W.toggle(X, 42) === true && W.isWarded(X, 42) && W.isWarded(X, "42"), "sceller : le serpent sur le Livre");
ok(W.toggle(X, 42) === false && !W.isWarded(X, 42) && !W.isWarded(null, 42), "desceller : un clic sur un Livre scellé");
const frag = { what: "sky", contra: false, from: "Ash", path: "a.md", ids: ["twin_suns", "steady_cycle"], srcStability: 90, srcFreq: 0.5, loop: true };
ok(W.keep(X, 7, "carry: sky from Ash", frag) === true && W.keep(X, 7, "carry:  sky  from Ash", frag) === false, "retenir : une fois, puis rien à sauver tant qu'il ne change pas");
const k = W.kept(X, 7, "Carry: sky from Ash"); ok(k && k.ids.join() === "twin_suns,steady_cycle" && k.loop === undefined, "le fragment retenu, sans ce qui ne se garde pas");
k.ids.push("x"); ok(W.kept(X, 7, "carry: sky from Ash").ids.length === 2, "le fragment retenu ne se modifie pas de dehors");
ok(W.keep(X, 7, "carry: sky from Ash", { ...frag, ids: ["red_sun"] }) === true && W.kept(X, 7, "carry: sky from Ash").ids[0] === "red_sun" && W.kept(X, 8, "carry: sky from Ash") === null, "il suit la source tant qu'aucun sceau n'est posé ; chaque Âge le sien");

const dni = { widthOf: () => 40, numberSvg: () => '<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>', hasFont: () => false, textStack: () => "serif" };
const base = { name: "Torus", number: 12, sobriety: 0.9, dni, glyph: () => "", glyphIds: [], label: "Descriptive book" };
ok(!/polyline/.test(coverSvg(base)) && /polyline/.test(coverSvg({ ...base, ward: true })), "le serpent au médaillon d'un Livre gardé");
ok(/polyline/.test(coverSvg({ ...base, sobriety: 0.1, ward: true })) && !/polyline/.test(coverSvg({ ...base, sobriety: 0.1 })), "sans médaillon : le serpent frappé sous le nom");

console.log(`ward.test.js : ${n} vérifications ok`);
