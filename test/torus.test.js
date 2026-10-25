"use strict";
// Le tore (src/torus.js ; claude/DESIGN-art-bahro.md §13.3) : chaque Âge a sa forme, toujours la même ; toutes se peignent, de jour et de nuit.
const assert = require("assert");
const TOR = require("../src/torus");
const G = require("../src/genscene");
const { analyseAgeBase } = require("../src/engine/analysis");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

/* la forme : tirée de la clé, stable, et toutes les formes sortent */
ok(TOR.formOf("Torus|Night Side") === TOR.formOf("Torus|Night Side"), "la même clé, la même forme");
const seen = {}; for (let i = 0; i < 600; i++) { const f = TOR.formOf("Âge " + i + "|Source"); ok(TOR.FORMS[f], "une forme connue : " + f); seen[f] = (seen[f] || 0) + 1; }
ok(Object.keys(TOR.FORMS).every((k) => seen[k] > 30), "toutes les formes sortent (" + JSON.stringify(seen) + ")");
ok(seen.K2 > seen.D1 && seen.K2 > seen.F1, "K2, la forme choisie, sort plus souvent");

/* la peinture : un faux canevas qui refuse tout nombre qui n'en est pas un */
const chk = (x) => { if (typeof x === "number" && !Number.isFinite(x)) throw new Error("NaN dans le rendu"); };
const grad = { addColorStop: (o, c) => { chk(o); if (/NaN/.test(c)) throw new Error("couleur NaN"); } };
let calls = 0;
const ctx = new Proxy({}, { get: (_, k) => (k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : (...a) => { a.forEach(chk); calls++; }), set: (_, k, v) => { if (/NaN/.test(String(v))) throw new Error("NaN : " + String(k)); return true; } });
const an = analyseAgeBase("single_sun\nsteady_cycle\nwater\nfern\ngrass", { seed: "Torus", draw: false });
const m = G.build(G.sceneOf(an, "Torus"), 300, 176);
for (const form of Object.keys(TOR.FORMS)) for (const fam of Object.keys(TOR.FAM_RGB)) for (const night of [0, 1]) {
  calls = 0; TOR.paintTorus(ctx, m, 0.35, { fam, key: "Torus|" + fam, form, night, air: [150, 170, 190] });
  ok(calls > 500, `${form}, ${fam}, ${night ? "nuit" : "jour"} : la terre se peint (${calls} appels)`);
}

/* la scène : la boucle, sans exiger d'eau ; la famille vient du lieu porté de l'autre Âge */
const looped = { ...an, carry: { loop: true, fragments: [{ what: "forest", from: "Night Side", loop: true }] } };
const S = G.sceneOf(looped, "Torus");
ok(S.loop && S.loopFam === "forest" && TOR.FORMS[S.torus] && S.torus === TOR.formOf("Torus|Night Side"), "la scène porte la boucle, la famille et la forme");
const dry = analyseAgeBase("single_sun\nsteady_cycle\nsand", { seed: "Dry", draw: false });
ok(G.sceneOf({ ...dry, carry: { loop: true, fragments: [{ what: "sky", from: "X", loop: true }] } }, "Dry").loopFam === "stone", "un ciel porté en boucle : la terre de l'autre est de pierre");
ok(!G.sceneOf(an, "Torus").loop, "sans boucle, pas de tore");
calls = 0; G.paint(ctx, G.build(S, 300, 176), 0.35, {}); ok(calls > 800, "la fenêtre entière se peint avec le tore");

console.log(`torus.test.js : ${n} vérifications ok`);
