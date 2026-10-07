"use strict";
// Quantité de hasard : « Normal » = tirage d'avant, « Peu » tire moins, « Beaucoup » tire plus, tout reste déterministe.
const assert = require("assert");
const { resolveAge, setDrawSettings } = require("../src/engine/resolve");
const { DRAW_AMOUNT } = require("../src/engine/draw");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const ids = (src, amount, seed) => { setDrawSettings({ amount }); return resolveAge(src, { seed }).drawn.map((d) => d.id).join(","); };
const total = (src, amount) => { let t = 0; for (let i = 0; i < 120; i++) t += ids(src, amount, "S" + i).split(",").filter(Boolean).length; return t; };
const SRC = "water\nsingle_sun\nsteady_cycle\nwind";
ok(DRAW_AMOUNT.normal === 1, "Normal vaut 1");
let same = true; for (let i = 0; i < 40; i++) if (ids(SRC, 1, "A" + i) !== ids(SRC, DRAW_AMOUNT.normal, "A" + i)) same = false;
ok(same, "Normal = comportement inchangé");
ok(ids(SRC, DRAW_AMOUNT.few, "Z") === ids(SRC, DRAW_AMOUNT.few, "Z"), "déterministe par graine");
const few = total(SRC, DRAW_AMOUNT.few), norm = total(SRC, 1), many = total(SRC, DRAW_AMOUNT.many);
ok(few < norm && norm < many, `peu < normal < beaucoup (${few} < ${norm} < ${many})`);
ok(few < norm * 0.6, "« Peu » tire nettement moins");
setDrawSettings({ amount: 1 });
console.log(`✓ draw-amount.test.js (${n} contrôles)`);
