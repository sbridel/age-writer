"use strict";
// L'ardoise (src/slate.js ; claude/DESIGN-art-bahro.md §16) : la reconnaissance au trait, sur des tracés bruités et des tracés simplifiés « à la souris ».
const assert = require("assert");
const S = require("../src/slate");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

/* les gabarits viennent de la planche */
ok(S.ELEMENTS.length === 18 && S.ELEMENTS.every((id) => S.strokesOf(id).length >= 1), "dix-huit éléments, chacun tiré de la planche des fresques");
ok(S.recognize([]).id === null && S.read([]).signs.length === 0, "une ardoise vide : rien");

/* chaque gabarit, tel quel, à une autre taille et ailleurs, se reconnaît */
for (const id of S.ELEMENTS) { const st = S.strokesOf(id).map((s) => s.map(([x, y]) => [300 + x * 9, 120 + y * 9])); ok(S.recognize(st).id === id, `${id} : le signe de la planche, agrandi, se reconnaît (${JSON.stringify(S.recognize(st).ranked.slice(0, 2).map((r) => r.id + " " + r.d.toFixed(2)))})`); }

/* des tracés bruités : à la souris, maladroits */
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, g = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return u - 3; };
function messy(strokes, lvl) {
  const rot = g() * 0.12 * lvl, cs = Math.cos(rot), sn = Math.sin(rot), scale = 6 + rnd() * 10;
  let st = strokes.map((s) => s.slice());
  st = st.map((s) => { const ox = g() * 0.5 * lvl, oy = g() * 0.5 * lvl, ph = rnd() * 6, w = 0.6 * lvl; let p = s.map(([x, y], i) => [x + ox + Math.sin(i * 0.3 + ph) * w + g() * 0.35 * lvl, y + oy + Math.cos(i * 0.27 + ph) * w + g() * 0.35 * lvl]); if (rnd() < 0.5) p = p.reverse(); return p; });
  st.sort(() => rnd() - 0.5);
  return st.map((s) => s.map(([x, y]) => [100 + scale * (cs * x - sn * y), 80 + scale * (sn * x + cs * y)]));
}
const ACT = ["rain", "fire", "sun", "moon"];
let falseAct = 0, total = 0;
for (const id of S.ELEMENTS) {
  let good = 0;
  for (let k = 0; k < 12; k++) { const r = S.recognize(messy(S.strokesOf(id), 1)); total++; if (r.id === id) good++; if (r.id && r.id !== id && ACT.includes(r.id)) falseAct++; }
  if (ACT.includes(id)) ok(good >= 9, `${id} : reconnu ${good}/12 sur des tracés maladroits`);
}
ok(falseAct <= 1, `presque rien ne devient par erreur un signe qui agit (${falseAct}/${total})`);

/* des gribouillis : refusés */
let acc = 0; for (let k = 0; k < 120; k++) { const out = [], m = 1 + Math.floor(rnd() * 3); for (let j = 0; j < m; j++) { let x = rnd() * 20 - 10, y = rnd() * 20 - 10; const s = []; for (let i = 0; i < 30; i++) { x += g() * 1.5; y += g() * 1.5; s.push([x, y]); } out.push(s); } const r = S.recognize(out); if (r.id && ACT.includes(r.id)) acc++; }
ok(acc <= 3, `un gribouillis ne devient presque jamais un signe qui agit (${acc}/120)`);

/* des tracés simplifiés, comme on les ferait vraiment à la souris */
const arc = (cx, cy, rx, ry, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const seg = (a, b, k = 6) => Array.from({ length: k + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / k, a[1] + ((b[1] - a[1]) * i) / k]);
const simple = {
  rain: [arc(100, 70, 40, 20, Math.PI, 2 * Math.PI), seg([75, 85], [68, 120]), seg([95, 85], [88, 120]), seg([115, 85], [108, 120])],
  sun: [arc(100, 100, 20, 20, 0, 2 * Math.PI, 24), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * 2 * Math.PI; return seg([100 + Math.cos(a) * 30, 100 + Math.sin(a) * 30], [100 + Math.cos(a) * 46, 100 + Math.sin(a) * 46], 3); })],
  moon: [arc(100, 100, 40, 40, Math.PI * 0.35, Math.PI * 1.65, 24), arc(118, 100, 32, 32, Math.PI * 0.55, Math.PI * 1.45, 18)],
  fire: [[[100, 50], [118, 82], [126, 110], [112, 132], [88, 132], [74, 110], [88, 92], [92, 104], [100, 50]]],
};
for (const [id, st] of Object.entries(simple)) { const r = S.recognize(st); ok(r.id === id, `${id} : un tracé simplifié à la souris se reconnaît (${r.ranked.slice(0, 2).map((x) => x.id + " " + x.d.toFixed(2)).join(", ")})`); }

/* deux signes, côte à côte */
const shift = (st, dx) => st.map((s) => s.map(([x, y]) => [x + dx, y]));
const two = S.read([...simple.rain, ...shift(simple.fire, 160)]);
ok(two.groups === 2 && two.signs.join() === "rain,fire", "deux signes côte à côte : la pluie et le feu (" + two.signs.join() + ")");
ok(S.read([...simple.rain, ...shift(simple.fire, 160), ...shift(simple.sun, 320)]).signs.join() === "", "trois signes : ils ne comprennent pas");
ok(S.read(simple.sun).signs.join() === "sun" && S.read(simple.sun).groups === 1, "un seul signe en plusieurs traits reste un signe");

/* ---- le cycle ---- */
{
  const DAY = S.DAY, T0 = Date.UTC(2026, 10, 2, 10), sign = (id, dx = 0) => S.strokesOf(id).map((st) => st.map(([x, y]) => [200 + dx + x * 8, 150 + y * 8]));
  ok(S.recognize(sign("serpent")).id === "serpent", "le serpent se reconnaît (pour être refusé)");
  ok(S.effectOf(["rain"]) === "rain" && S.effectOf(["fire"]) === "heat" && S.effectOf(["sun"]) === "time" && S.effectOf(["moon"]) === "night", "cinq signes : pluie, chaleur, temps, nuit (la main est un geste)");
  ok(S.effectOf(["fire", "rain"]) === "steam" && S.effectOf(["rain", "moon"]) === "mist" && S.effectOf(["sun", "fire"]) === "summer" && S.effectOf(["moon", "sun"]) === "longnight", "quatre paires, dans les deux ordres");
  ok(S.effectOf(["tree"]) === "mute" && S.effectOf([null]) === "mute" && S.effectOf(["rain", "tree"]) === "mute" && S.effectOf(["rain", "serpent"]) === "serpent" && S.effectOf([]) === null, "un arbre : ils ne comprennent pas ; le serpent l'emporte sur tout");
  /* l'arrivée : au matin après la fin du 17 */
  const end = new Date(2026, 10, 1, 21).getTime();
  ok(!S.arrived({}, end) && !S.arrived({ stone: { ending: "accord", endedAt: end } }, end + 3600000) && S.arrived({ stone: { ending: "command", endedAt: end } }, new Date(2026, 10, 2, 7).getTime()), "l'ardoise arrive au matin après le 17, dans les deux fins");
  /* tracer, puis ouvrir un Livre */
  const X = {}, has = { water: true, fire: false, living: true };
  ok(S.onDesk(X, T0) && S.trace(X, sign("rain"), T0).effect === "rain" && X.slate.signs.join() === "rain", "tracer la pluie : elle reconnaît");
  ok(S.erase(X, T0) && !X.slate.signs.length && S.send(X, { seed: 1, has }, "accord", T0) === "none", "la main à plat : tout s'efface ; un Livre ouvert ensuite : rien ne part");
  S.trace(X, [...sign("rain"), ...sign("fire", 220)], T0);
  ok(S.effectOf(X.slate.signs) === "steam", "la pluie et le feu, côte à côte : la vapeur (" + X.slate.signs.join() + ")");
  ok(S.send(X, { seed: 9, warded: true, has }, "accord", T0) === "wait" && S.onDesk(X, T0), "un Livre gardé n'est pas « ouvert » pour elle : elle attend le suivant");
  ok(S.send(X, { seed: 1, name: "Marais", has }, "accord", T0) === "refused" && !S.onDesk(X, T0) && !S.actOf(X, 1, "accord", T0), "l'accord : la vapeur sur un monde sans feu ne découle de rien, refusée ; elle part quand même pour la journée");
  ok(S.onDesk(X, T0 + DAY) && !X.slate.signs.length, "le lendemain : revenue, effacée");
  S.trace(X, sign("rain"), T0 + DAY);
  ok(S.send(X, { seed: 1, name: "Marais", has }, "accord", T0 + DAY) === "done" && S.actOf(X, 1, "accord", T0 + DAY).effect === "rain" && S.actOf(X, 1, "accord", T0 + DAY).fertile && !S.actOf(X, 2, "accord", T0 + DAY), "la pluie sur un monde qui a de l'eau : il pleut, ce jour-là, dans cet Âge seulement");
  ok(!S.actOf(X, 1, "accord", T0 + 2 * DAY), "l'acte vaut un jour");
  const Y = {}; S.trace(Y, [...sign("rain"), ...sign("fire", 220)], T0);
  ok(S.send(Y, { seed: 1, has }, "command", T0) === "done" && S.actOf(Y, 1, "command", T0).effect === "steam" && !S.actOf(Y, 1, "command", T0).fertile, "le commandement : jamais refusée, et ça n'engendre rien");
  const Z = {}; S.trace(Z, sign("serpent"), T0);
  ok(S.send(Z, { seed: 1, has }, "command", T0) === "stay" && S.onDesk(Z, T0) && S.morningWipe(Z, T0 + DAY) && !Z.slate.signs.length, "le serpent : personne ne vient la prendre ; au matin, le trait est effacé");
  const M = {}; S.trace(M, sign("tree"), T0); ok(S.send(M, { seed: 1, has }, "accord", T0) === "mute" && !S.onDesk(M, T0) && !S.actOf(M, 1, "accord", T0), "un arbre : ils l'ont regardé et sont repartis ; elle revient effacée");
  /* la récolte du jour, dons */
  ok(S.harvestOf(["ash", "humus"], "rain").list.join() === "silt,humus" && S.harvestOf(["peat"], "heat").list.join() === "ash", "la pluie : les cendres donnent du limon ; la chaleur : la tourbe sèche donne des cendres");
  ok(S.harvestOf(["ash"], "steam").list.join() === "silt,silt" && S.harvestOf(["peat"], "summer").list.join() === "peat,peat" && S.harvestOf(["humus"], "longnight").list.join() === "humus,humus" && S.harvestOf(["humus"], "mist").richFor.humus, "vapeur : limon double ; été : tourbe double ; nuit qui s'attarde : terreau double ; brume : le terreau compte riche");
  ok(S.harvestOf(["ash"], "time").list.join() === "ash" && S.harvestOf([], "rain").list.length === 0, "le temps ne change rien ; un Âge qui ne donne rien ne donne toujours rien");
  let gifts = 0; for (let d = 0; d < 300; d++) { const w = S.giftFor("Relto#1", 1, { water: true }, T0 + d * DAY), l = S.giftFor("Relto#1", 2, { living: true }, T0 + d * DAY), z = S.giftFor("Relto#1", 3, {}, T0 + d * DAY); if (w) { gifts++; ok(w === "rain", "un don découle de l'Âge : la pluie là où il y a de l'eau"); } if (l) ok(l === "summer", "l'été d'un jour là où quelque chose vit"); ok(z === null, "rien pour un Âge sans eau ni vie"); }
  ok(gifts >= 4 && gifts <= 25, "les dons : de loin en loin (" + gifts + " en 300 jours, pour un Âge)");
}

/* la fenêtre d'un jour d'acte : la nuit à contre-horloge, la vapeur ; rien ne casse */
{
  const G = require("../src/genscene"), { analyseAgeBase } = require("../src/engine/analysis");
  const chk = (x) => { if (typeof x === "number" && !Number.isFinite(x)) throw new Error("NaN"); };
  const grad = { addColorStop: (o, c) => { chk(o); if (/NaN/.test(c)) throw new Error("NaN"); } };
  const ctx = new Proxy({}, { get: (_, k) => (k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : (...a) => a.forEach(chk)), set: (_, k, v) => { if (/NaN/.test(String(v))) throw new Error("NaN " + String(k)); return true; } });
  const base = analyseAgeBase("single_sun\nsteady_cycle\nwater\nash\ngrass", { seed: "Jour", draw: false });
  for (const effect of S.EFFECTS) { const sc = G.sceneOf({ ...base, slateAct: { effect, fertile: true } }, "Jour"); G.paint(ctx, G.build(sc, 300, 176), 0.4, {}); ok(true, effect + " : la fenêtre se peint"); }
  const night = G.sceneOf({ ...base, slateAct: { effect: "night", fertile: false } }, "Jour"), steam = G.sceneOf({ ...base, slateAct: { effect: "steam", fertile: true } }, "Jour");
  ok(night.forceNight && steam.rain && steam.steam && steam.heat && !G.sceneOf(base, "Jour").forceNight, "la nuit à contre-horloge ; la vapeur : pluie, chaleur, vapeur");
}

console.log(`slate.test.js : ${n} vérifications ok`);
