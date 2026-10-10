"use strict";
const G = require("./genscene");
const base = { verdict: "stable", unrest: 0, suns: 1, skyStated: true, moon: false, cycle: "steady", chaos: false, veil: false, auroras: false, eclipses: false, starfall: false, rain: false, storm: false, wind: false, fog: false, lightning: false, heat: false, hail: false, steam: false, dust: false, ash: false, lava: false, water: false, ice: false, sand: false, trees: 0, burnt: false, fire: false, moths: false, glow: false, eyes: false, ruins: [], lampLit: false, tabletAwake: false, fissure: null };
const CASES = [
  ["Marais (eau, brume, arbres)", { water: true, fog: true, trees: 3, moths: true, moon: true }, 1111, 0.3],
  ["Désert (sable, soleils, vent)", { sand: true, suns: 2, wind: true, dust: true, ruins: ["tablet", "door"], heat: true }, 2222, 0.35],
  ["Volcan (lave, cendre)", { lava: true, ash: true, trees: 3, burnt: true, fissure: "open" }, 3333, 0.1],
  ["Glace (aurore, nuit)", { ice: true, auroras: true, suns: 0, moon: true, starfall: true, ruins: ["lamp"], lampLit: true }, 4444, 0.5],
  ["Orage (foudre, pluie)", { storm: true, rain: true, lightning: true, wind: true, trees: 5, ruins: ["bridge"] }, 5555, 0.4],
  ["Sous-marine (fissure)", { water: true, fissure: "submarine", suns: 2, eclipses: true }, 6666, 0.3],
  ["Grotte (chasseurs)", { fissure: "cave", eyes: true, trees: 5, glow: true, cycle: "frozen" }, 7777, 0.5],
  ["Même contenu, autre graine A", { trees: 5 }, 8881, 0.3],
  ["Même contenu, autre graine B", { trees: 5 }, 8882, 0.3],
  ["Même contenu, autre graine C", { trees: 5 }, 8883, 0.3],
  ["Pluie + grêle + vapeur", { rain: true, hail: true, steam: true, trees: 3, water: true }, 9991, 0.45],
  ["Biblio : books closed rich (géo)", { trees: 0, water: false, extras: [{ id: "books", axis: "geological", words: ["closed", "rich"] }] }, 1212, 0.3],
  ["Biblio : moonmilk pale thick patient", { extras: [{ id: "moonmilk", axis: "geological", words: ["pale", "thick", "patient"] }, { id: "halo", axis: "cosmological", words: ["vast", "humming"] }] }, 1313, 0.35],
  ["Biblio : reeds + veil + echo", { water: true, extras: [{ id: "reeds", axis: "ecological", words: ["thin", "swift"] }, { id: "veil", axis: "meteorological", words: ["pale", "slow"] }, { id: "echo", axis: "metaphysical", words: ["wrong", "listening"] }] }, 1414, 0.5],
  ["Biblio : crystal sharp humming", { sand: true, extras: [{ id: "shards", axis: "geological", words: ["sharp", "humming", "pale"] }] }, 1515, 0.3],
  ["Ceinture d'astéroïdes", { belt: "belt", suns: 1, ruins: ["tablet"] }, 2021, 0.3, { clock: 40, day: 0.5 }],
  ["Champ d'astéroïdes", { belt: "field", suns: 1, ruins: ["bridge"], trees: 3 }, 2022, 0.3, { clock: 10, day: 0.45 }],
  ["Champ : une chute", { belt: "field", suns: 1, water: true, trees: 3 }, 2023, 0.3, { clock: 40 + 3.6, day: 0.5 }],
  ["Planète à anneaux (nuit)", { rings: true, suns: 0, skyStated: true, moon: true, water: true }, 2024, 0.3, { clock: 10, day: 0.05 }],
  ["Comète", { comet: true, suns: 1, sand: true }, 2025, 0.3, { clock: 20, day: 0.2 }],
  ["Soleil vert", { suns: 1, sunHues: [[150, 255, 150]], trees: 5, water: true }, 2026, 0.3, { day: 0.5 }],
  ["Deux soleils : rouge + bleu", { suns: 2, sunHues: [[255, 110, 80], [140, 190, 255]], sand: true }, 2027, 0.3, { day: 0.45 }],
  ["Soleil violet, ceinture, anneaux", { suns: 1, sunHues: [[200, 140, 255]], belt: "belt", rings: true, water: true, trees: 3 }, 2028, 0.3, { clock: 70, day: 0.4 }],
  ["Même Âge : matin", { suns: 1, water: true, trees: 3, ruins: ["door"] }, 2029, 0.3, { day: 0.12, season: 0 }],
  ["Même Âge : midi (hiver)", { suns: 1, water: true, trees: 3, ruins: ["door"] }, 2029, 0.3, { day: 0.35, season: -1 }],
  ["Même Âge : midi (été)", { suns: 1, water: true, trees: 3, ruins: ["door"] }, 2029, 0.3, { day: 0.35, season: 1 }],
  ["Même Âge : soir", { suns: 1, water: true, trees: 3, ruins: ["door"] }, 2029, 0.3, { day: 0.62, season: 0 }],
  ["Soleil noir (midi)", { suns: 1, sunHues: [[70, 34, 40]], blackSun: true, trees: 3, water: true, ruins: ["tablet"] }, 2030, 0.3, { day: 0.4 }],
  ["Soleil noir derrière les crêtes (aube)", { suns: 1, sunHues: [[70, 34, 40]], blackSun: true, terrain: "mountains", trees: 2 }, 2033, 0.3, { day: 0.06 }],
  ["Soleil noir (désert, matin)", { suns: 1, sunHues: [[70, 34, 40]], blackSun: true, sand: true, wind: true }, 2031, 0.3, { day: 0.15 }],
  ["Sans soleil, étoiles", { suns: 0, skyStated: true, moon: true, ruins: ["door", "tablet"], tabletAwake: true }, 9992, 0.2],
  ["Herbe (grass)", { grass: true }, 3031, 0.3, { day: 0.4 }],
  ["Grotte de jour (herbe, collines)", { fissure: "cave", grass: true, trees: 3 }, 3035, 0.3, { day: 0.4 }],
  ["Prairie + vent (meadow, plains)", { grass: true, meadow: true, wind: true, terrain: "plains" }, 3032, 0.3, { day: 0.45 }],
  ["Herbe au bord d'un lac", { grass: true, water: true, shore: "grass", trees: 3 }, 3033, 0.3, { day: 0.4 }],
  ["Prairie au crépuscule", { grass: true, meadow: true, flowers: true }, 3034, 0.3, { day: 0.85 }],
];
function run(host) {
  for (const [label, o, seed, ph, po] of CASES) {
    const S = { ...base, ...o, seed }, W = 320, H = 192, wrap = document.createElement("div");
    wrap.style.cssText = "display:inline-block;margin:6px;width:320px;font:11px sans-serif;color:#ccc";
    const c = document.createElement("canvas"); c.width = W; c.height = H; c.style.cssText = "display:block;border:1px solid #cdbd94";
    wrap.appendChild(c); wrap.appendChild(document.createTextNode(label)); host.appendChild(wrap);
    G.paint(c.getContext("2d"), G.build(S, W, H), ph, po);
  }
  // le périscope : les quatre directions et le zénith d'un même Âge (les éléments uniques : de face seulement)
  const V = require("./genviews");
  for (const [label, o, seed, ph, po] of LOOKS) {
    const S = { ...base, ...o, seed }, W = 320, H = 192, m0 = G.build(S, W, H);
    for (const look of [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]]) {
      const wrap = document.createElement("div"); wrap.style.cssText = "display:inline-block;margin:6px;width:320px;font:11px sans-serif;color:#ccc";
      const c = document.createElement("canvas"); c.width = W; c.height = H; c.style.cssText = "display:block;border:1px solid #cdbd94";
      wrap.appendChild(c); wrap.appendChild(document.createTextNode(label + " — " + (look[1] ? "zénith" : "direction " + look[0]))); host.appendChild(wrap);
      if (look[1]) { const sq = document.createElement("canvas"); sq.width = sq.height = 368; V.paintZenith(sq.getContext("2d"), m0, ph, po || {}); const g = c.getContext("2d"); g.drawImage(sq, (W - 368) / 2, (H - 368) / 2); }
      else V.paintLook(c.getContext("2d"), m0, ph, po || {}, look[0], 0);
    }
  }
}
const LOOKS = [
  ["Ruines, tornade, arc-en-ciel", { suns: 1, ruins: ["tablet", "door"], tornado: true, rainbow: true, rain: true, water: true, trees: 3, remnants: ["pulsar"] }, 4041, 0.3, { day: 0.4 }],
  ["Deux soleils, désert", { suns: 2, sand: true, ruins: ["bridge", "lamp"], extras: [{ id: "shards", axis: "geological", words: ["sharp", "pale"] }] }, 4042, 0.3, { day: 0.4 }],
];
module.exports = { run };
