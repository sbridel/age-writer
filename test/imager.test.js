"use strict";
// L'Imageur du Relto : cibles tirées du ciel de l'Âge, phase qui dérive, netteté, commandes, indices.
const assert = require("assert");
const I = require("../src/imager");
const { analyseAgeBase } = require("../src/engine/analysis");
const P = require("../src/physics"), { hooks } = require("../src/engine/hooks");
const skip0 = hooks.skip; hooks.skip = (l) => P.isPhysicsLine(l);
const A = (src, name) => { const a = analyseAgeBase(src, { seed: name }); return P.applyPhysics(a, P.physicsOf(a, src, name), "easy"); };
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const earth = I.targetsOf(A("single_sun\nsteady_cycle\nstable_orbit\nwater\nstone\nrotation: 24\natmosphere: 1", "Terre"), "Terre");
ok(Math.abs(earth.freq - 12) <= 1 && Math.abs(earth.amp - 12) <= 1, `jour de 24 h, 1 bar : milieu de cadran (${earth.freq}, ${earth.amp})`);
const fast = I.targetsOf(A("single_sun\nsteady_cycle\nwater\nrotation: 6", "Toupie"), "Toupie"), slow = I.targetsOf(A("single_sun\nsteady_cycle\nwater\nrotation: 96", "Lente"), "Lente");
ok(fast.freq > earth.freq && slow.freq < earth.freq, "jour court : fréquence haute ; jour long : basse");
const thin = I.targetsOf(A("single_sun\nsteady_cycle\nthin_air\nstone", "Cime"), "Cime"), thick = I.targetsOf(A("single_sun\nsteady_cycle\nthick_air\nstone", "Brume"), "Brume");
ok(thin.amp < thick.amp, `air mince : onde faible ; épais : ample (${thin.amp} < ${thick.amp})`);
const aur = I.targetsOf(A("single_sun\nsteady_cycle\nauroras\nwater\nrotation: 20", "Aurore"), "Aurore"), dead = I.targetsOf(A("single_sun\nsteady_cycle\ndead_core\nwater\nrotation: 20", "Mort"), "Mort");
ok(aur.harm > dead.harm, "aurores et champ : harmoniques ; noyau mort : presque rien");
ok(["freq", "amp", "harm"].every((k) => [earth, fast, slow, thin, thick, aur, dead].every((t) => Number.isInteger(t[k]) && t[k] >= 0 && t[k] <= 24)), "valeurs de 0 à 24 (chiffres D'ni)");
ok(JSON.stringify(I.targetsOf(A("single_sun\nwater", "X"), "X")) === JSON.stringify(I.targetsOf(A("single_sun\nwater", "X"), "X")), "déterministe");
const pols = new Set(); for (let i = 0; i < 40; i++) pols.add(I.targetsOf(A("single_sun\nwater", "P" + i), "P" + i).pol); ok(pols.size === 2, "polarité tirée de la graine : + ou −");
ok(I.targetsOf(null, "Vide").freq === 12, "sans analyse : valeurs neutres");

// phase : dérive au rythme du jour de l'Âge ; un monde figé ne bouge presque pas
const t0 = 1.8e12, H = 3600000;
ok(Math.abs(I.phaseAt(earth, t0 + 24 * H) - I.phaseAt(earth, t0)) < 0.01 || Math.abs(Math.abs(I.phaseAt(earth, t0 + 24 * H) - I.phaseAt(earth, t0)) - 25) < 0.01, "un jour de l'Âge = un tour de phase");
const lock = I.targetsOf(A("red_sun\nfrozen_cycle\nwater", "Figé"), "Figé");
ok(I.phaseGap(I.phaseAt(lock, t0), I.phaseAt(lock, t0 + 24 * H)) < 0.05, "monde figé : la phase dérive à peine");
ok(I.phaseGap(3, 3) === 0 && I.phaseGap(0, 12.5) === 1 && Math.abs(I.phaseGap(24, 1) - 2 / 12.5) < 1e-9, "écart de phase circulaire");

// netteté : parfaite quand tout est aligné, brouillée par la polarité, décroît avec l'écart
const tuned = { pol: earth.pol, freq: earth.freq, amp: earth.amp, harm: earth.harm, phase: I.phaseAt(earth, t0) };
ok(I.sharpness(tuned, earth, t0) > 0.99, "accord parfait : image nette");
ok(I.sharpness({ ...tuned, pol: -tuned.pol }, earth, t0) < 0.36, "polarité inversée : presque tout se brouille");
ok(I.sharpness({ ...tuned, freq: tuned.freq + 1 }, earth, t0) < I.sharpness(tuned, earth, t0) && I.sharpness({ ...tuned, freq: tuned.freq + 6 }, earth, t0) < I.sharpness({ ...tuned, freq: tuned.freq + 1 }, earth, t0), "plus on s'écarte, plus c'est flou");
ok(I.sharpness(tuned, earth, t0 + 6 * H) < 0.6, "six heures plus tard, il faut reprendre la phase");
ok(I.beatsOf(tuned, earth, t0) === "unison" && I.beatsOf({ ...tuned, freq: tuned.freq + 9 > 24 ? tuned.freq - 9 : tuned.freq + 9 }, earth, t0) === "hiss" && I.beatsOf({ ...tuned, pol: -tuned.pol }, earth, t0) === "opposed", "battements : unisson, grésillement, opposition");

// commandes
ok(I.turn(I.START, "pol").pol === -1 && I.turn(I.START, "freq", 30).freq === 24 && I.turn(I.START, "amp", -30).amp === 0, "levier et molettes bornés");
ok(I.turn({ ...I.START, phase: 24.5 }, "phase", 1).phase === 0 && I.turn({ ...I.START, phase: 0 }, "phase", -1).phase === 24.5, "la roue de phase fait le tour");
ok(JSON.stringify(I.normalize({ freq: "7", pol: -3, phase: 26 })) === JSON.stringify({ pol: -1, freq: 7, amp: 12, harm: 6, phase: 1 }), "réglage mémorisé relu proprement");

// indices
const hf = I.hints(aur, "fr"), he = I.hints(aur, "en");
ok(/bourdonne/.test(hf.line) && /hums/.test(he.line) && hf.values.freq === aur.freq && !("phase" in hf.values), "indices : une phrase et les valeurs fixes, jamais la phase");
hooks.skip = skip0;
console.log(`imager.test.js : ${n} vérifications OK`);
