"use strict";
const { LinkFx } = require("./linkfx");
const base = { verdict: "stable", unrest: 0, suns: 1, skyStated: true, moon: false, cycle: "steady", chaos: false, veil: false, auroras: false, eclipses: false, starfall: false, rain: false, storm: false, wind: false, fog: false, lightning: false, heat: false, hail: false, steam: false, dust: false, ash: false, lava: false, water: true, ice: false, sand: false, trees: 3, burnt: false, fire: false, moths: false, glow: false, eyes: false, ruins: ["door"], lampLit: false, tabletAwake: false, fissure: null };
const CASES = [
  ["intact (stable)", 0.05, { damaged: 0, removed: 0 }, []],
  ["2 pages abîmées", 0.2, { damaged: 2, removed: 0 }, []],
  ["4 pages abîmées", 0.35, { damaged: 4, removed: 0 }, []],
  ["1 page arrachée", 0.25, { damaged: 0, removed: 1 }, []],
  ["4 abîmées + 3 arrachées", 0.9, { damaged: 4, removed: 3 }, [{ severity: "strong" }]],
  ["fissures seules (u=0.5, strong)", 0.5, null, [{ severity: "strong" }, { severity: "medium" }]],
  ["fissures (u=0.85)", 0.85, null, [{ severity: "strong" }, { severity: "strong" }]],
  ["autre graine, 3 abîmées", 0.3, { damaged: 3, removed: 1 }, []],
];
function run(host) {
  CASES.forEach(([label, u, dmg, trig], n) => {
    const wrap = document.createElement("div"); wrap.style.cssText = "display:inline-block;margin:6px;width:320px;font:11px sans-serif;color:#ccc";
    const win = document.createElement("div"); win.style.cssText = "position:relative;width:320px;height:192px;background:#050505;border:1px solid #cdbd94;overflow:hidden";
    const src = document.createElement("canvas"); src.width = 240; src.height = 144; src.style.cssText = "display:block;width:100%;height:100%"; win.appendChild(src);
    wrap.appendChild(win); wrap.appendChild(document.createTextNode(label)); host.appendChild(wrap);
    const fx = new LinkFx(win, src, { unrest: u, triggered: trig, seed: "dmg" + (n === 7 ? 99 : 1), mode: "classic", strength: 1, gen: { ...base, seed: 4242 + (n === 7 ? 5 : 0) }, dmg });
    fx.rr = (function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(777 + n);
    for (let i = 0; i < 6; i++) fx.tick(3200 + i * 70);
  });
}
module.exports = { run };
