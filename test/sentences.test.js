"use strict";
// « Une phrase par point perdu » (claude/ROADMAP-lois-et-rigueur.md, risque 2 ; proposition du 12 oct.) :
// tout coût que l'extension applique à un Âge doit se dire en une phrase lisible, dans la description, le panneau ou le lutrin.
// Avec l'Observation (loi 4), la phrase peut mûrir (signe, symptôme, cause) : la phrase « signe » compte, il faut qu'elle existe.
// Le test rejoue la couche des quantités (src/amounts.js) pièce par pièce, avec les mêmes fonctions pures, sur le corpus et quelques cas
// choisis, aux quatre rigueurs. Les trous connus sont listés dans GAPS : chacun est une décision à prendre, pas un oubli.
const assert = require("assert");
const { hooks } = require("../src/engine/hooks");
const { analyseAgeBase } = require("../src/engine/analysis");
const reg = require("../src/engine/registry");
const { describeAge } = require("../src/engine/prose");
const { CONTRADICTION_COST } = require("../src/engine/rules");
const AM = require("../src/amounts"), DS = require("../src/dosage"), RG = require("../src/rigor"), LF = require("../src/life"), SC = require("../src/scarring"), LEC = require("../src/lectern");
hooks.skip = (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l);

// Trous connus (12 oct. 2026), montrés à l'auteur avant d'être comblés :
//  - amount : `many: gold` double le poids d'un bloc ; seul le chiffre par axe le montre (panneau, Grand Maître au lutrin) ;
//  - fissure : la fissure qui abîme un monde instable (src/law.js, fissureStrain) ne se dit que par le nom de l'axe « altération ».
//    (couche du plugin : hors de ce test, rappelée ici pour mémoire)
const GAPS = new Set(["amount"]);

const ages = [...require("./corpus/ages"),
  { id: "many-gold", seed: "S", lines: ["single_sun", "steady_cycle", "stone", "gold", "many: gold"] },
  { id: "big-desert-rain", seed: "S", lines: ["desert_world", "single_sun", "steady_cycle", "sand", "rain", "size: large"] },
  { id: "loop-open", seed: "S", lines: ["single_sun", "steady_cycle", "sand", "fern", "grass", "grazer"] },
  { id: "pellet-burn", seed: "S", lines: ["single_sun", "steady_cycle", "water", "fern", "pellet", "many: pellet"] },
];
const LEVELS = ["gentle", "balanced", "strict", "extreme"], STAGES = ["sign", "symptom", "cause"];
const found = new Map(); // trou → premier exemple
const missing = [];
const say = (ok, what, where) => { if (ok) return; if (GAPS.has(what)) { if (!found.has(what)) found.set(what, where); } else missing.push(`${what} @ ${where}`); };

for (const a of ages) for (const level of LEVELS) {
  const src = a.lines.join("\n"), weights = RG.weightsOf({ rigor: level }), size = DS.worldSize(src), amt = AM.parseAmounts(src);
  const base = analyseAgeBase(src, { seed: a.seed, draw: true });
  const out = AM.applyAmounts(base, amt, reg.blockById, { weights, size, seed: a.seed });
  const where = `${a.id} (${level})`, written = base.resolved.matter.written || [];
  const prose = describeAge(out.resolved, { seed: a.seed });
  const lectern = LEC.readOut(out, { tier: 1, fr: true, prose, dosage: DS.note(out.dosage, true) });
  const told = new Set(lectern.lines.map((l) => l.text));
  // 1. les quantités : un bloc pesant écrit en grande quantité
  for (const id of new Set(written)) { const b = reg.blockById.get(id), f = AM.factorOf(id, amt); if (b && b.weight > 0 && f > 1) say(false, "amount", `${where} : ${id}`); }
  // 2. les cicatrices tirées (et la maladie) : une phrase dans la description
  for (const x of out.scars || []) { const p = String(x.prose || (reg.blockById.get(x.id) || {}).presence || "").trim(); say(p && prose.toLowerCase().includes(p.toLowerCase()), "scar", `${where} : ${x.id}`); }
  const sc = SC.scarring(base.resolved, CONTRADICTION_COST);
  for (const x of (sc && sc.scars) || []) if (!written.includes(x.id)) say((out.scars || []).some((y) => y.id === x.id), "scar-kept", `${where} : ${x.id}`);
  // 3. le dosage : un coût positif (étendue, réaction naturelle, budget) se lit dans la ligne du dosage
  const dose = DS.dosage(base, (id) => AM.factorOf(id, amt), (id) => reg.blockById.get(id), { weight: weights.extent, size });
  if (dose && Object.values(dose.delta).some((d) => d > 1e-9)) say(!!DS.note(out.dosage, true) && !!DS.note(out.dosage, false), "dosage", where);
  // 4. la vie et le sol : chaque loi qui coûte a sa phrase, en deux langues, au lutrin (et la maladie à chacune de ses étapes)
  for (const n of (out.life && out.life.notes) || []) {
    if (!(n.cost > 0)) continue;
    say(!!LF.textOf(n, false) && !!LF.textOf(n, true), "life", `${where} : ${n.id}`);
    say(told.has(LF.textOf(n, true)), "life-told", `${where} : ${n.id}`);
    if (n.id === "blight") for (const stage of STAGES) say(!!LF.blightText({ ...n, stage }, true) && !!LF.blightText({ ...n, stage }, false) && !!LF.blightProse({ ...n, stage }), "blight-stage", `${where} : ${stage}`);
  }
}
assert.ok(!missing.length, `des points perdus sans phrase :\n${missing.slice(0, 12).join("\n")}`);
for (const g of GAPS) assert.ok(found.has(g), `le trou « ${g} » n'existe plus : le retirer de GAPS`);
console.log(`sentences.test.js ok (${ages.length} Âges × ${LEVELS.length} rigueurs ; trous connus : ${[...found].map(([g, w]) => `${g} [${w}]`).join(", ") || "aucun"})`);
