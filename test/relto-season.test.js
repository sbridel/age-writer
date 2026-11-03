"use strict";
// ESSAI 2.6 : saisons et météo du Relto (src/relto-season.js) : le vrai calendrier, un temps tiré par demi-heure, toujours le même pour un même instant.
const assert = require("assert"); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const R = require("../src/relto-season");
const at = (m, d, h = 12) => Date.UTC(2026, m, d, h);
ok(R.reltoSeason(1, at(0, 15)).season === "winter" && R.reltoSeason(1, at(3, 20)).season === "spring" && R.reltoSeason(1, at(6, 15)).season === "summer" && R.reltoSeason(1, at(9, 20)).season === "autumn", "nord : hiver en janvier, printemps en avril, été en juillet, automne en octobre");
ok(R.reltoSeason(1, at(0, 15), { south: true }).season === "summer", "sud : l'été en janvier");
ok(JSON.stringify(R.reltoSeason(42, at(10, 3, 15))) === JSON.stringify(R.reltoSeason(42, at(10, 3, 15))), "le même instant donne le même ciel");
let snowJuly = 0, snowJan = 0, changes = 0, prev = null;
for (let k = 0; k < 2000; k++) { const a = R.reltoSeason(7, at(6, 1) + k * R.SLOT).wx.state, b = R.reltoSeason(7, at(0, 1) + k * R.SLOT).wx.state; if (a === "snow") snowJuly++; if (b === "snow") snowJan++; if (prev && b !== prev) changes++; prev = b; }
ok(snowJuly === 0 && snowJan > 100, `la neige l'hiver, jamais l'été (${snowJan} / ${snowJuly})`);
ok(changes < 1100, `le temps dure : il ne change pas à chaque demi-heure (${changes} changements sur 2000)`);
const w = R.reltoSeason(3, at(0, 20)), s = R.reltoSeason(3, at(3, 25)), a = R.reltoSeason(3, at(10, 1));
ok(w.bare > 0.5 && w.snowCover > 0 && s.blossom > 0 && a.tint > 0.5 && a.leaves > 0.3, "hiver : branches nues et neige au sol ; printemps : fleurs ; automne : feuilles rousses qui tombent");
const mid = R.reltoSeason(5, at(10, 3, 10)), wx = mid.wx; ok(["clouds", "grey", "rain", "snow", "fog", "storm"].every((k) => wx[k] >= 0 && wx[k] <= 1), "les intensités restent entre 0 et 1 (fondu compris)");
console.log(`relto-season : ${n} vérifications OK`);
