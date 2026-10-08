"use strict";
// 1.18 : blocs de terrain (src/terrain.js) et lieux (src/places.js) : reconnus, contredits, décrits, jamais tirés au sort,
// et lus par la fenêtre générative (relief, eau).
const assert = require("assert");
const { analyseAgeBase } = require("../src/engine/analysis");
const { drawOpenSlots } = require("../src/engine/draw");
const { describeAge } = require("../src/engine/prose");
const { builtinLibrary } = require("../src/engine/registry");
const { SKY_ENTRIES } = require("../src/engine/data/sky");
const T = require("../src/terrain"), P = require("../src/places"), G = require("../src/genscene");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const A = (src) => analyseAgeBase(src, { seed: "Terrain", draw: false });

// reconnaissance : aucun bloc n'est pris pour un symbole inconnu
for (const id of T.IDS) {
  const a = A(id);
  ok(a.resolved.lines.some((l) => !l.unknown && l.entry && l.entry.id === id), `terrain « ${id} » reconnu`);
  ok(SKY_ENTRIES.find((e) => e.id === id).axis === "cosmological", `terrain « ${id} » : axe du registre de ciel`);
}
const lib = builtinLibrary();
for (const id of P.IDS) {
  const b = lib.blocks.find((x) => x.id === id);
  ok(b && b.writable && b.descriptors.length >= 2 && b.presence, `lieu « ${id} » : bloc écrivable, descripteurs et phrase`);
  ok(A(id).resolved.matter.written.includes(id), `lieu « ${id} » écrit dans la matière`);
}
ok(lib.blocks.find((x) => x.id === "spiders").axis === "ecological" && lib.blocks.find((x) => x.id === "garden").axis === "metaphysical", "axes des lieux");

// contradictions entre terrains
const stab = (src) => A(src).stability;
ok(stab("plains\nmountains") < stab("plains") && stab("plains\nmountains") < stab("hills\nmountains"), "plaines + montagnes : forte ; collines + montagnes : moyenne");
ok(A("plains\nmountains").resolved.triggered.some((t) => t.severity === "strong"), "plaines + montagnes : tension forte");
ok(stab("river\ndesert_world") < stab("desert_world"), "rivière + désert coûte");
ok(stab("river\nlake\ndelta") >= stab("river\ndesert_world"), "les eaux se marient entre elles");

// phrases : chaque terrain a sa phrase dans la description
for (const id of T.IDS) {
  const lines = new Set(T.SKY_PROSE[id].map((s) => s.toLowerCase()));
  let seen = false;
  for (let i = 0; i < 40 && !seen; i++) { const text = describeAge(A(id).resolved).toLowerCase(); seen = [...lines].some((s) => text.includes(s)); }
  ok(seen, `phrase du terrain « ${id} »`);
}
ok(/library with no roof/i.test(describeAge(A("ruined_library").resolved)) && /light sends them away/i.test(describeAge(A("spiders").resolved)), "phrases des lieux");

// jamais tirés au sort
const banned = new Set([...T.IDS, ...P.IDS]);
for (let i = 0; i < 80; i++) for (const id of drawOpenSlots({ written: new Set(), seed: "S" + i, pull: 8 }).map((p) => (p && (p.id || p)) || "")) ok(!banned.has(id), `« ${id} » n'est jamais tiré`);

// physique : la montagne veut une tectonique, le delta de l'eau liquide
const B = require("../src/physics/blocks");
ok(B.BLOCKS.mountains.needs.some((x) => x[0] === "plateTectonics") && B.BLOCKS.delta.needs.some((x) => x[0] === "liquidWater") && B.BLOCKS.spiders.needs.some((x) => x[0] === "prey"), "exigences physiques");
ok(B.BUILDERS.includes("ruined_library") && B.BUILDERS.includes("garden"), "les lieux bâtis sont des traces de bâtisseurs");

// fenêtre générative : relief et eau
const an = (ids) => ({ verdict: "stable", stability: 90, resolved: { lines: ids.map((id) => ({ entry: { id } })), matter: { written: [], reactions: [] } } });
const height = (ids) => { const m = G.build(G.sceneOf(an(ids), "Same"), 320, 192); return { count: m.ridges.length, span: Math.max(...m.ridges.map((rg) => Math.max(...rg.xs) - Math.min(...rg.xs))) }; };
const plains = height(["single_sun", "plains"]), hills = height(["single_sun", "hills"]), mount = height(["single_sun", "mountains"]);
ok(plains.count === 2 && mount.count === 4, "nombre de chaînes : 2 pour les plaines, 4 pour les montagnes");
ok(plains.span < hills.span && hills.span < mount.span, `relief croissant : plaines ${plains.span.toFixed(1)} < collines ${hills.span.toFixed(1)} < montagnes ${mount.span.toFixed(1)}`);
ok(G.sceneOf(an(["single_sun", "mountains"]), "x").terrain === "mountains" && G.sceneOf(an(["single_sun"]), "x").terrain === null, "scène : terrain lu, absent par défaut");
for (const id of T.WATER_IDS) ok(G.sceneOf(an(["single_sun", id]), "x").water === true && G.sceneOf(an(["single_sun", id]), "x").shore, `« ${id} » allume l'eau et un rivage`);
ok(G.sceneOf(an(["single_sun", "marsh"]), "x").fog === true, "le marais ajoute de la brume");
ok(G.sceneOf(an(["desert_world", "river"]), "x").water === false, "un monde de désert garde son sable sec (la tension est dite par la stabilité)");
// sans bloc de terrain, la fenêtre est exactement celle d'avant
const before = G.build(G.sceneOf(an(["single_sun", "water"]), "Same"), 320, 192), again = G.build(G.sceneOf(an(["single_sun", "water"]), "Same"), 320, 192);
ok(JSON.stringify([...before.ridges[0].xs]) === JSON.stringify([...again.ridges[0].xs]), "déterminisme");

// peinture : aucune erreur, aucun nombre infini
const log = []; const g = new Proxy({}, { get: (_, k) => (k === "canvas" ? { width: 320, height: 192 } : k === "createLinearGradient" || k === "createRadialGradient" ? () => ({ addColorStop() {} }) : (...a) => { a.forEach((x) => typeof x === "number" && assert(Number.isFinite(x), "valeur non finie")); log.push(k); }), set: () => true });
for (const id of T.IDS) { G.paint(g, G.build(G.sceneOf(an(["single_sun", id]), "P" + id), 320, 192), 0.3); }
ok(log.length > 100, "peinture de chaque terrain");
console.log(`terrain.test.js : ${n} vérifications, tout passe`);
