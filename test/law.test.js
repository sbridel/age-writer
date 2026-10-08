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
{ // 1.16 : une ligne de valeur physique enregistrée comme ligne inconnue par une ancienne version est oubliée sans frais
  let n3 = 1e12; const st3 = {};
  const l3 = new Law(st3, { dryMinutes: () => 1, healPerDay: () => 0.05, now: () => n3, ignored: (raw) => /^mass\s*:\s*\d/.test(raw) });
  const U3 = (ids, unk) => ({ resolved: { lines: [...ids.map((id) => ({ entry: { id } })), ...unk.map((raw) => ({ unknown: true, raw }))], matter: { written: [], reactions: [] } } });
  l3.observe("Lava", U3(["lava"], ["mass: 2"]), n3);
  n3 += 10 * 60000;
  assert.strictEqual(l3.observe("Lava", U3(["lava"], []), n3), null, "la ligne mass: 2 n'est plus une altération");
  assert.strictEqual(l3.effective("Lava"), 0);
}


// fissures : elles s'ouvrent avec l'âge du livre ; elles n'abîment qu'un monde déjà instable ; celles des grottes jamais
{
  const { fissureStrain } = require("../src/law");
  let t = 5e12; const lw = new Law({}, { dryMinutes: () => 15, healPerDay: () => 0.05, now: () => t });
  assert.strictEqual(lw.opening("Neuf", 7), 0, "Âge inconnu : fissure fermée");
  lw.observe("Neuf", A(["stone"]), t);
  assert.strictEqual(lw.opening("Neuf", 7), 0, "livre du jour : fermée");
  t += 3.5 * 86400000; assert.ok(Math.abs(lw.opening("Neuf", 7) - 0.5) < 1e-9, "à mi-chemin : à moitié ouverte");
  t += 10 * 86400000; assert.strictEqual(lw.opening("Neuf", 7), 1, "puis grande ouverte, pas davantage");
  assert.strictEqual(lw.opening("Neuf", 0), 1, "0 jour : toujours grande ouverte");
  lw.state.ages.Vieux = { ids: [], changedAt: 0, extra: 0, at: 0, log: [] }; // ancien état sans `born`
  assert.strictEqual(lw.opening("Vieux", 7), 0, "ancien livre : naît à sa première lecture"); t += 7 * 86400000; assert.strictEqual(lw.opening("Vieux", 7), 1);

  const mk = (fissure, stability) => ({ fissure, stability, axisStability: { cosmological: stability }, verdict: "x" });
  assert.strictEqual(fissureStrain(mk("open", 90), 1).stability, 90, "monde stable : la fissure ne le déstabilise pas");
  assert.strictEqual(fissureStrain(mk("cave", 60), 1).stability, 60, "fissure de grotte : jamais d'instabilité");
  assert.strictEqual(fissureStrain(mk("open", 60), 0).stability, 60, "fissure fermée : rien");
  const half = fissureStrain(mk("submarine", 70), 0.5), full = fissureStrain(mk("open", 70), 1);
  assert.ok(half.stability === 45 && half.verdict === "unstable" && full.stability === 20 && full.verdict === "dying", "monde instable : plus elle s'ouvre, plus elle l'abîme");
  assert.strictEqual(fissureStrain(mk(null, 60), 1).stability, 60, "sans fissure : rien");

  // condamnation : une demi-vie. Plus le monde est instable, plus vite il est condamné ; stable, la marge se reconstitue ; condamné, c'est définitif
  const { condemnDays } = require("../src/law");
  assert.ok(Math.abs(condemnDays(74) - 14 * Math.pow(0.5, 0.1)) < 1e-9 && condemnDays(74) > 13, "à 74 % : environ deux semaines de marge");
  assert.ok(Math.abs(condemnDays(65) - 7) < 1e-9 && Math.abs(condemnDays(55) - 3.5) < 1e-9, "une demi-vie tous les 10 points");
  assert.ok(condemnDays(10) < 0.2 && condemnDays(0) < 0.1, "très instable : condamné très vite (en heures)");
  const fresh = (name) => { const l = new Law({}, { dryMinutes: () => 15, healPerDay: () => 0.05, now: () => c }); l.observe(name, A(["stone"]), c); return l; };
  let c = 7e12;
  let lc = fresh("A"); lc.tend("A", 55, 1); c += 3.4 * 86400000; assert.strictEqual(lc.tend("A", 55, 1), false, "55 % : un peu moins de 3,5 jours de marge (le temps compte par pas de 2 jours au plus)");
  c = 7e12; lc = fresh("B"); lc.tend("B", 55, 1); for (let i = 0; i < 4; i++) { c += 1 * 86400000; lc.tend("B", 55, 1); } assert.strictEqual(lc.get("B").condemned > 0, true, "à 55 %, quatre jours : condamné");
  c = 7e12; lc = fresh("C"); lc.tend("C", 10, 1); c += 0.3 * 86400000; assert.strictEqual(lc.tend("C", 10, 1), true, "à 10 % : condamné en quelques heures");
  c = 7e12; lc = fresh("D"); lc.tend("D", 70, 1); c += 1 * 86400000; assert.strictEqual(lc.tend("D", 70, 1), false, "70 % : de la marge"); c += 1 * 86400000; assert.strictEqual(lc.tend("D", 70, 1), false);
  c = 7e12; lc = fresh("E"); lc.tend("E", 30, 0.2); c += 1 * 86400000; assert.strictEqual(lc.tend("E", 30, 0.2), false, "fissure à peine ouverte : la marge fond lentement");
  c = 7e12; lc = fresh("F"); lc.tend("F", 45, 1); c += 1 * 86400000; lc.tend("F", 45, 1); const d1 = lc.get("F").dose; c += 1 * 86400000; lc.tend("F", 100, 1); assert.ok(lc.get("F").dose < d1 * 0.6 && lc.get("F").dose > 0, "stable : la marge se reconstitue, elle double chaque jour");
  c = 7e12; lc = fresh("G"); lc.tend("G", 10, 1); c += 1 * 86400000; lc.tend("G", 10, 1); c += 1 * 86400000; assert.strictEqual(lc.tend("G", 100, 1), true, "définitif : même corrigé ensuite, « beyond repair »");
  assert.strictEqual(lc.tend("Inconnu", 10, 1), false, "Âge inconnu : rien");

  // la fin d'un Âge condamné : on brûle le livre, la fin se joue en direct, puis il est détruit pour toujours
  const { BURN_SECONDS, DOOM_IDLE } = require("../src/law");
  c = 7e12; lc = fresh("Z"); assert.strictEqual(lc.doom("Z"), 0, "Âge sain : aucun effondrement"); assert.strictEqual(lc.burn("Z"), false, "on ne brûle pas un Âge qui n'est pas condamné");
  lc.tend("Z", 10, 1); c += 1 * 86400000; lc.tend("Z", 10, 1); assert.ok(lc.condemned("Z"));
  assert.strictEqual(lc.doom("Z"), DOOM_IDLE, "condamné : l'effondrement commence"); assert.strictEqual(lc.destroyed("Z"), false);
  assert.strictEqual(lc.burn("Z"), true); c += BURN_SECONDS * 500;
  assert.ok(Math.abs(lc.doom("Z") - (DOOM_IDLE + (1 - DOOM_IDLE) / 2)) < 1e-9 && lc.burning("Z") && !lc.destroyed("Z"), "à mi-chemin de la fin, en direct");
  c += BURN_SECONDS * 600; assert.strictEqual(lc.doom("Z"), 1); assert.ok(lc.destroyed("Z") && !lc.burning("Z"), "détruit"); assert.strictEqual(lc.burn("Z"), false);
  assert.strictEqual(lc.tend("Z", 100, 0), true, "et rien ne le ramène");
}

// les valeurs physiques écrites : un changement coûte en proportion (échelle logarithmique), une valeur écrite ou effacée coûte un élément
{
  const { physChange } = require("../src/law");
  const small = physChange({ rotation: 24 }, { rotation: 30 }), big = physChange({ rotation: 24 }, { rotation: 500 });
  assert.ok(small.cost > 0 && big.cost > small.cost * 5 && big.cost < 0.25, "changer plus coûte plus (24 h → 500 h > 24 h → 30 h)");
  assert.deepStrictEqual(big.removed, ["rotation: 24"]); assert.deepStrictEqual(big.added, ["rotation: 500"]);
  assert.strictEqual(physChange({ rotation: 24 }, { rotation: 24.01 }).cost, 0, "un changement minuscule ne coûte rien");
  assert.ok(Math.abs(physChange({}, { rotation: 20 }).cost - 0.06) < 1e-9 && Math.abs(physChange({ rotation: 20 }, {}).cost - 0.06) < 1e-9, "écrire ou effacer une ligne : un élément");
  assert.ok(Math.abs(physChange({ rotation: 1 }, { rotation: 1e5 }).cost - 0.6) < 1e-9, "toute l'étendue : le plein tarif");
  assert.ok(physChange({ water: 0 }, { water: 5 }).cost > 0.29 && physChange({ water: 0 }, { water: 5 }).cost < 0.31, "échelle linéaire pour les valeurs qui ne s'étalent pas sur des ordres de grandeur");

  let c = 9e12; const l = new Law({}, { dryMinutes: () => 15, healPerDay: () => 0.05, now: () => c });
  assert.strictEqual(l.observe("Phys", A(["stone"]), c, { rotation: 24 }), null);
  c += 60000; assert.strictEqual(l.observe("Phys", A(["stone"]), c, { rotation: 500 }), null, "encre fraîche : gratuit");
  c += 20 * 60000; assert.strictEqual(l.observe("Phys", A(["stone"]), c, { rotation: 500 }), null, "rien de changé");
  const ev2 = l.observe("Phys", A(["stone"]), c + 1, { rotation: 5000 });
  assert.ok(ev2 && ev2.cost > 0.1 && ev2.removed[0] === "rotation: 500" && ev2.added[0] === "rotation: 5000" && Math.abs(l.effective("Phys") - ev2.cost) < 1e-9, "encre sèche : la valeur changée altère l'Âge, en proportion");
  c += 60000; assert.strictEqual(l.observe("Phys", A(["stone"]), c, { rotation: 24 }), null, "puis encre fraîche : gratuit");
  const l2 = new Law({}, { dryMinutes: () => 15, healPerDay: () => 0.05, now: () => c }); l2.observe("Old", A(["stone"]), c); delete l2.state.ages.Old.phys; c += 99 * 60000; // ancien état
  assert.strictEqual(l2.observe("Old", A(["stone"]), c, { rotation: 20 }), null, "ancien état sans valeurs mémorisées : les valeurs d'aujourd'hui servent de référence, sans frais");
  c += 99 * 60000; const ev4 = l2.observe("Old", A(["stone", "heat"]), c, { rotation: 20 }); assert.ok(ev4 && Math.abs(ev4.cost - 0.06) < 1e-9, "et les éléments coûtent comme avant");
}
