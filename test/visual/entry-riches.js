const G = require("./genscene");
const base = { verdict: "stable", unrest: 0.2, suns: 1, skyStated: true, moon: false, cycle: "steady", chaos: false, veil: false, auroras: false, eclipses: false, starfall: false, rain: false, storm: false, wind: false, fog: false, lightning: false, heat: false, hail: false, steam: false, dust: false, ash: false, lava: false, water: false, ice: false, sand: false, trees: 3, burnt: false, fire: false, moths: false, glow: false, eyes: false, ruins: ["door", "tablet", "lamp"], lampLit: false, tabletAwake: false, fissure: null, extras: [], sunHues: [], world: null, riches: [], scars: [], seed: 777 };
const shots = [
  ["or, argent, gemmes", { riches: ["gold", "silver", "gems"] }],
  ["+ sol calciné, air empoisonné", { riches: ["gold", "silver", "gems"], scars: ["scorched_surface", "poisoned_air"], burnt: true, trees: 3 }],
  ["+ sol stérile, creux, ciel de cendres", { riches: ["gold", "silver", "gems"], scars: ["barren_soil", "hollowed_ground", "ashen_sky"], trees: 0, ash: true }],
  ["many: ruins, trees", { trees: 3, amt: { ruins: 2, trees: 2 } }],
  ["few: ruins, trees", { trees: 3, amt: { ruins: 0.4, trees: 0.4 } }],
  ["many: rain, fog, clouds (eau)", { water: true, rain: true, fog: true, amt: { rain: 2, fog: 2, clouds: 2 } }],
];
module.exports = { run(host) { for (const [l, o] of shots) { const d = document.createElement("div"); d.style.cssText = "display:inline-block;margin:5px;font:11px sans-serif;color:#ccc"; const c = document.createElement("canvas"); c.width = 320; c.height = 192; c.style.cssText = "display:block;border:1px solid #cdbd94"; d.appendChild(c); d.appendChild(document.createTextNode(l)); host.appendChild(d); G.paint(c.getContext("2d"), G.build({ ...base, ...o }, 320, 192), 0.3, { day: 0.4, clock: 12 }); } } };
