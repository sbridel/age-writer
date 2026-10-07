const assert = require("assert");
const { Law, adjustAnalysis, describeChange } = require("../src/law");
const A = (ids, unk = []) => ({ resolved: { lines: [...ids.map((id) => ({ entry: { id } })), ...unk.map((raw) => ({ unknown: true, raw }))], matter: { written: [], reactions: [] } } });
let now = 1e12; const st = {};
const law = new Law(st, { dryMinutes: () => 15, healPerDay: () => 0.05, now: () => now });
assert.strictEqual(law.observe("Marsh", A(["heat", "stone"]), now), null);        // première vue
now += 60000; assert.strictEqual(law.observe("Marsh", A(["rain", "stone"]), now), null); // encre fraîche : gratuit
assert.strictEqual(law.effective("Marsh"), 0);
now += 20 * 60000;                                                                 // l'encre a séché
const ev = law.observe("Marsh", A(["heat", "stone"]), now);
assert.ok(ev && ev.cost > 0.1 && ev.cost < 0.13, "coût deux éléments");
assert.deepStrictEqual(ev.added, ["heat"]); assert.deepStrictEqual(ev.removed, ["rain"]);
assert.ok(Math.abs(law.effective("Marsh") - 0.12) < 1e-9);
now += 2 * 86400000; assert.ok(Math.abs(law.effective("Marsh") - 0.02) < 1e-6, "guérison");
now += 5 * 86400000; assert.strictEqual(law.effective("Marsh"), 0);
assert.strictEqual(law.observe("Marsh", A(["heat", "stone"]), now), null);        // inchangé
// plafond par édition + total
now += 20 * 60000; const big = law.observe("Marsh", A(["a", "b", "c", "d", "e", "f", "g"]), now); assert.strictEqual(big.cost, 0.3);
// ajustement du verdict
const r = { axisStability: { weather: 90 }, stability: 90, verdict: "stable" };
adjustAnalysis(r, 0.3); assert.strictEqual(r.axisStability.alteration, 70); assert.strictEqual(r.stability, 70); assert.strictEqual(r.verdict, "unstable");
const r2 = { axisStability: {}, stability: 100, verdict: "stable" }; adjustAnalysis(r2, 0.7); assert.strictEqual(r2.verdict, "dying");
assert.strictEqual(adjustAnalysis({ axisStability: {}, stability: 100, verdict: "stable" }, 0).verdict, "stable");
// renommage : pas d'altération
law.rename("Marsh", "Fen", A(["x"])); assert.ok(law.get("Fen") && !law.get("Marsh"));
const t = (k, v) => ({ "law.became": `${v && v.a} -> ${v && v.b}`, "law.removed": "-" + (v && v.a), "law.added": "+" + (v && v.a) }[k]);
assert.strictEqual(describeChange({ added: ["rain"], removed: ["heat"] }, t), "heat -> rain");
{ // saut de ligne / espace insécable / casse sur une ligne inconnue : pas d'altération
  const U = (raw) => ({ resolved: { lines: [{ unknown: true, raw }], matter: { written: [], reactions: [] } } });
  let n2 = 1e9; const l2 = new Law({}, { dryMinutes: () => 1, healPerDay: () => 0.05, now: () => n2 });
  l2.observe("W", U("library"), n2); n2 += 3600000;
  assert.strictEqual(l2.observe("W", U("library\u00a0 "), n2), null); assert.strictEqual(l2.observe("W", U(" Library\n"), n2 + 1), null);
  assert.strictEqual(l2.effective("W"), 0);
}
console.log("law: ok");
