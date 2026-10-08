"use strict";
// Retouches du 8 oct. : chiffre D'ni absent de la police (le 12 = « " »), référence complète bilingue.
const assert = require("assert"); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
// faux canvas : la police « Dni » n'a pas le caractère « " » (elle prend la largeur de la police de secours)
const W = { serif: 40, "sans-serif": 44, monospace: 60 };
global.document = { createElement: () => ({ getContext: () => { const c = { font: "", measureText(ch) { const fam = c.font.replace(/^\d+px\s+/, ""); return { width: fam === "Dni" ? (ch === '"' ? W.serif : 70) : (W[fam] || 50) }; } }; return c; } }) };
const { Dni, FONT_CHARS } = require("../src/dni");
const d = new Dni({ getMode: () => "font" }); d.fontFamily = () => "Dni"; d.mode = () => "font";
ok(FONT_CHARS[12] === '"', "le 12 est le guillemet");
ok(d.glyphMissing(12) === true, "12 absent de la police → détecté");
ok(d.glyphMissing(5) === false && d.glyphMissing(0) === false, "les autres chiffres sont présents");
const svg12 = d.digitInner(12, 0, 0, 20, "#fff", "font"), svg5 = d.digitInner(5, 0, 0, 20, "#fff", "font");
ok(!/<text/.test(svg12) && /<path/.test(svg12), "SVG : le 12 retombe sur le tracé procédural");
ok(/<text/.test(svg5), "SVG : un chiffre présent reste en police");
const calls = []; const ctx = { save() {}, restore() {}, translate() {}, scale() {}, stroke() {}, fill() {}, fillText: (t) => calls.push(t), set font(v) {}, set textAlign(v) {}, set textBaseline(v) {}, set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set lineCap(v) {}, set lineJoin(v) {} };
global.Path2D = class {}; d.drawNumber(ctx, 12, 0, 0, 20); ok(!calls.length, "canvas : le 12 n'est pas écrit comme un guillemet");
d.drawNumber(ctx, 5, 0, 0, 20); ok(calls.length === 1 && calls[0] === "5", "canvas : le 5 s'écrit avec la police");
// référence complète : même structure en français et en anglais
const src = require("fs").readFileSync(require("path").join(__dirname, "../src/guide.js"), "utf8");
const { REF_EN } = require("../src/guide-ref-en");
const m = /const REF_FR = (\[[\s\S]*?\n\]);\n/.exec(src); ok(!!m, "REF_FR trouvée");
const REF_FR = eval(m[1]);
ok(REF_EN.length === REF_FR.length && REF_EN.every((t, i) => t.id === REF_FR[i].id && t.icon === REF_FR[i].icon && t.body.length === REF_FR[i].body.length), "référence EN : mêmes rubriques et blocs que la FR");
const ticks = (t) => String(t).split("`").length - 1;
ok(REF_EN.every((t, i) => t.body.every((b, j) => { const f = REF_FR[i].body[j]; return Object.keys(b)[0] === Object.keys(f)[0] && (b.ul ? b.ul.length === f.ul.length && b.ul.every((x, k) => ticks(x) === ticks(f.ul[k])) : b.p ? ticks(b.p) === ticks(f.p) : b.code ? b.code === f.code : true); })), "référence EN : mêmes types de blocs, mêmes segments de code");
console.log(`polish : ${n} vérifications, tout passe`);
