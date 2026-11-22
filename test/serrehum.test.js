"use strict";
// 2.10.12 : l'accord — l'encrier répond aux scarabées de la serre (src/story-hear.js, `serreHum`), comme au chapitre 14.
const assert = require("assert");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const H = require("../src/story-hear");
const starts = []; let prev = 0, on = 0; for (let t = 0; t < 24 * 3600e3; t += 1000) { const v = H.serreHum(t); if (v > 0 && !prev) starts.push(t); prev = v; if (v > 0) on++; }
const gaps = starts.slice(1).map((s, i) => (s - starts[i]) / 60000);
ok(gaps.every((g) => g >= 10 && g <= 20), "d'un épisode au suivant : dix à vingt minutes");
ok(starts.length >= 70 && starts.length <= 100, "environ quatre par heure");
ok(H.serreHum(starts[3] + 1000) > 0.9, "il part fort, comme au chapitre 14");
ok(H.serreHum(starts[3] + 60000) < 0.6 && H.serreHum(starts[3] + 60000) > 0.25, "puis il retombe");
ok(H.serreHum(starts[3] + 95000) === 0 || H.serreHum(starts[3] + 95000) < 0.05, "en une minute et demie, c'est fini");
ok(on / 86400 < 0.15, "le reste du temps, l'encrier se tait");
const back = 5e6 + 777; ok(H.serreHum(back + 2000, back) > 0.9, "on revient de la serre : il frémit tout de suite");
ok(H.serreHum(back - 1000, back) === H.serreHum(back - 1000, 0), "avant le retour, rien de plus");
console.log("serrehum : " + n + " OK");
