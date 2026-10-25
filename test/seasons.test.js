"use strict";
// Les saisons dans la fenêtre (src/seasons.js ; docs/DESIGN-physique.md §12 bis, palier 3) : le jour de l'année, ce qu'il fait au décor, la récolte.
const assert = require("assert");
const SSN = require("../src/seasons");
const G = require("../src/genscene");
const P = require("../src/physics");
const { analyseAgeBase } = require("../src/engine/analysis");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const DAY = 86400000;

/* le jour de l'année : par graine et date, l'année en jours réels */
const u0 = SSN.phaseOf("Vallon", 1e12, 365.25);
ok(u0 === SSN.phaseOf("Vallon", 1e12, 365.25), "la même graine, le même jour");
ok(SSN.phaseOf("Vallon", 1e12, 365.25) !== SSN.phaseOf("Bascule", 1e12, 365.25), "deux graines, deux jours");
const d1 = SSN.phaseOf("Vallon", 1e12 + 36.525 * DAY, 365.25) - u0; ok(Math.abs(((d1 + 1) % 1) - 0.1) < 1e-9, "36 jours sur 365 : un dixième d'année");
const d2 = SSN.phaseOf("Vallon", 1e12 + 90 * DAY, 900) - SSN.phaseOf("Vallon", 1e12, 900); ok(Math.abs(((d2 + 1) % 1) - 0.1) < 1e-9, "une année de 900 jours met 900 jours réels");
ok(SSN.nameOf(0) === "winter" && SSN.nameOf(0.25) === "spring" && SSN.nameOf(0.5) === "summer" && SSN.nameOf(0.75) === "autumn" && SSN.nameOf(0.95) === "winter", "les quatre noms");

/* ce que fait la saison : rien sous le seuil, rien sur une face figée */
const W = (o) => ({ Ts: 288, seasonAmp: 15, locked: false, stars: 1, water: "liquid", P: 1, ...o });
ok(SSN.lookOf(W({ seasonAmp: 5 }), 0) === null, "saisons douces : rien");
ok(SSN.lookOf(W({ locked: true }), 0) === null, "face figée : rien");
ok(SSN.lookOf(W({ stars: 0 }), 0) === null, "sans étoile : rien");
ok(SSN.lookOf(W(), null) === null, "sans jour fourni : rien");
const wi = SSN.lookOf(W(), 0), sp = SSN.lookOf(W(), 0.25), su = SSN.lookOf(W(), 0.5), au = SSN.lookOf(W(), 0.75);
ok(wi.name === "winter" && Math.abs(wi.T - 273) < 0.01 && wi.cold > 0.5 && wi.vig < 0.01 && wi.sun < 0.01, "plein hiver : froid, rien ne pousse, soleil bas");
ok(su.name === "summer" && Math.abs(su.T - 303) < 0.01 && su.warm > 0.5 && su.vig > 0.99 && su.sun > 0.99 && su.snow === 0, "plein été");
ok(sp.bloom > 0.5 && sp.fall === 0 && au.fall > 0.5 && au.bloom === 0, "le printemps fleurit, l'automne défeuille");
ok(SSN.lookOf(W(), 0.13).bloom > 0.4 && SSN.lookOf(W(), 0.37).bloom > 0.4 && SSN.lookOf(W(), 0.63).fall > 0.4 && SSN.lookOf(W(), 0.87).fall > 0.4, "pétales et feuilles couvrent toute leur saison, pas seulement son cœur");
ok(SSN.lookOf(W(), 0).rainToSnow === 1 && SSN.lookOf(W({ Ts: 300 }), 0).rainToSnow === 0, "sous zéro la pluie est toute neige ; à +12 °C, rien ne change");
ok(SSN.lookOf(W({ Ts: 280 }), 0).snow > 0.5, "hiver à −8 °C : la neige tient");
ok(SSN.lookOf(W({ Ts: 280, water: "dry" }), 0).snow === 0, "sans eau : pas de neige");
ok(SSN.lookOf(W({ Ts: 280, P: 0 }), 0).snow === 0, "sans air : pas de neige");
ok(SSN.lookOf(W({ seasonAmp: 30 }), 0).cold > SSN.lookOf(W({ seasonAmp: 9 }), 0).cold, "plus d'amplitude, plus de contraste");

/* la récolte : une saison favorise, n'interdit rien */
ok(Object.keys(SSN.richFor(["ash", "peat"], wi)).length === 0, "l'hiver ne favorise rien");
ok(SSN.richFor(["ash", "peat"], su).ash === true && !SSN.richFor(["ash", "peat"], su).peat, "l'été : les cendres");
ok(SSN.richFor(["ash", "peat", "silt"], au).peat && SSN.richFor(["ash", "peat", "silt"], au).silt && !SSN.richFor(["ash", "peat", "silt"], au).ash, "l'automne : la tourbe et le limon");
ok(SSN.richFor(["humus"], sp).humus === true && Object.keys(SSN.richFor(["ash"], sp)).length === 0, "le printemps : le terreau, et seulement s'il est donné");
ok(Object.keys(SSN.richFor(["ash"], null)).length === 0, "sans saison : rien");

/* la fenêtre : la saison se peint sans NaN, et un Âge sans jour garde son image */
const chk = (x) => { if (typeof x === "number" && !Number.isFinite(x)) throw new Error("NaN dans le rendu"); };
const grad = { addColorStop: (o, c) => { chk(o); if (/NaN/.test(c)) throw new Error("couleur NaN"); } };
let calls = 0;
const ctx = new Proxy({}, { get: (_, k) => (k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : k === "measureText" ? () => ({ width: 1 }) : (...a) => { a.forEach(chk); calls++; }), set: (_, k, v) => { if (/NaN/.test(String(v))) throw new Error("NaN : " + String(k)); return true; } });
const txt = "single_sun\nwater\nmeadow\ngreat_tree\nrain\nflowers", a = analyseAgeBase(txt, { seed: "Vallon", draw: false });
a.physics = P.physicsOf(a, txt + "\ntilt: 24", "Vallon", "easy");
ok(a.physics.w.seasonAmp >= 8, "l'Âge d'essai a des saisons marquées (" + a.physics.w.seasonAmp.toFixed(1) + " K)");
ok(G.sceneOf(a, "Vallon").season === null || G.sceneOf(a, "Vallon").season === undefined || !G.sceneOf(a, "Vallon").season, "sans jour fourni : la fenêtre ne change pas");
for (const u of [0, 0.25, 0.5, 0.75]) {
  a.seasonU = u; const S = G.sceneOf(a, "Vallon"); ok(S.season && S.season.name === SSN.nameOf(u), "la scène porte la saison " + SSN.nameOf(u));
  const m = G.build(S, 300, 176); calls = 0; G.paint(ctx, m, 0.35, {}); ok(calls > 500, "la saison se peint (" + calls + " appels)");
}
console.log(`seasons.test: ${n} vérifications`);
