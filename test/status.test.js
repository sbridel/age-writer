"use strict";
// Le statut d'écrivain : un Âge tenu stable sept jours à un niveau de rigueur donne le palier ; rien ne se perd, rien ne se verrouille.
const assert = require("assert");
const S = require("../src/status");
const DAY = S.DAY;
const mk = () => { let t = 1e12; const st = new S.Status({}, { now: () => t }); return { st, adv: (d) => { t += d * DAY; } }; };
const gentle = { rigor: "gentle" }, bal = { rigor: "balanced" }, ext = { rigor: "extreme" };
const strict3 = { rigor: "strict", rigorFamilies: ["physics", "life", "extent"] }, strict2 = { rigor: "strict", rigorFamilies: ["physics", "life"] };

assert.deepStrictEqual(S.TITLES, ["apprentice", "scribe", "seltahn", "master", "grandmaster"]);
assert.deepStrictEqual([gentle, bal, strict3, strict2, ext].map(S.tierOf), [1, 2, 3, 2, 4], "palier selon le niveau ; strict à deux familles compte comme équilibré");
{ const { st, adv } = mk();
  assert.strictEqual(st.tier(), 0); assert.strictEqual(st.title(), "apprentice", "Apprenti au départ");
  assert.strictEqual(st.watch("A", 90, gentle), null); adv(6.9); assert.strictEqual(st.watch("A", 90, gentle), null, "six jours et demi : pas encore");
  adv(0.2); const up = st.watch("A", 90, gentle); assert.deepStrictEqual(up, { tier: 1, korfah: true }, "sept jours tenus : Scribe, et le Korfah");
  assert.strictEqual(st.title(), "scribe"); assert.ok(st.korfah() > 0);
  assert.strictEqual(st.watch("A", 90, gentle), null, "pas de nouvelle annonce");
  // le Korfah n'est qu'une fois ; un palier plus haut monte le titre
  st.watch("B", 90, bal); adv(7); assert.deepStrictEqual(st.watch("B", 90, bal), { tier: 2, korfah: false }); assert.strictEqual(st.title(), "seltahn");
  // le titre ne redescend jamais : un Âge tenu en doux ensuite ne le change pas
  st.watch("C", 90, gentle); adv(7); assert.strictEqual(st.watch("C", 90, gentle), null); assert.strictEqual(st.tier(), 2);
}
{ const { st, adv } = mk(); // retomber sous stable remet à zéro
  st.watch("A", 90, gentle); adv(5); st.watch("A", 60, gentle); adv(5); assert.strictEqual(st.watch("A", 90, gentle), null, "cinq jours + chute + cinq jours : le compte repart");
  adv(7); assert.ok(st.watch("A", 90, gentle), "puis sept jours de plus : ça compte");
}
{ const { st, adv } = mk(); // changer de rigueur, ou de familles en strict, remet à zéro
  st.watch("A", 90, gentle); adv(6); st.watch("A", 90, bal); adv(2); assert.strictEqual(st.watch("A", 90, bal), null, "le niveau a changé : le compte repart");
  assert.strictEqual(st.heldDays("A", bal) > 1.9 && st.heldDays("A", gentle), 0, "jours tenus : seulement au niveau où l'Âge a tenu");
  st.watch("S", 90, strict3); adv(6); st.watch("S", 90, { rigor: "strict", rigorFamilies: ["physics", "life", "soil"] }); adv(2);
  assert.strictEqual(st.watch("S", 90, { rigor: "strict", rigorFamilies: ["physics", "life", "soil"] }), null, "changer les familles compte comme changer de niveau");
}
{ const { st, adv } = mk(); // Maître : strict, trois familles ; Grand Maître : extrême
  st.watch("M", 90, strict2); adv(7); assert.strictEqual(st.watch("M", 90, strict2).tier, 2, "strict à deux familles : pas Maître");
  st.watch("M2", 90, strict3); adv(7); assert.strictEqual(st.watch("M2", 90, strict3).tier, 3);
  st.watch("G", 90, ext); adv(7); assert.strictEqual(st.watch("G", 90, ext).tier, 4); assert.strictEqual(st.title(), "grandmaster");
}
{ const { st, adv } = mk(); // renommer garde le compte, oublier l'efface ; l'état est sérialisable
  st.watch("A", 90, gentle); adv(4); st.rename("A", "B"); adv(3.5); assert.ok(st.watch("B", 90, gentle), "l'Âge renommé garde ses jours");
  st.forget("B"); assert.strictEqual(st.heldDays("B", gentle), 0);
  const copy = JSON.parse(JSON.stringify(st.s)); assert.strictEqual(new S.Status(copy).tier(), 1);
}
assert.strictEqual(S.DNI_WORDS.length, 5); assert.strictEqual(S.DNI_WORDS[0], null, "aucun mot D'ni pour apprenti : pas de faux D'ni");
console.log("status.test.js : tout passe");
