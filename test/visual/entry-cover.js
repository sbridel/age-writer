"use strict";
const { Dni } = require("./dni"); const { coverSvg } = require("./cover");
function run(host) {
  const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
  const glyph = (id, x, y, s) => `<g transform="translate(${x},${y}) scale(${s / 100})"><path d="M50 10L90 50L50 90L10 50Z" fill="none" stroke="currentColor" stroke-width="6"/><text x="50" y="58" font-size="26" text-anchor="middle" fill="currentColor">${id.slice(0, 2)}</text></g>`;
  const names = [["Glass Marsh", 7421, "stable", ["water", "moth"]], ["Ash Tower", 118330, "unstable", ["lava", "ash"]], ["Dead Orchard", 52, "dying", ["fern", "vine"]], ["Salt Court", 9021, "stable", ["sand", "salt"]], ["Cold Pillar", 3321, "unstable", ["deep_cold"]], ["Iron Bay", 71, "stable", ["stone", "iron"]], ["The Quiet Lens", 5512, "stable", ["starless"]], ["Sunder Reach", 640, "dying", []]];
  host.innerHTML = names.map(([n, num, v, world]) => `<div style="display:inline-block;width:300px;margin:6px">${coverSvg({ name: n, number: num, seedNumber: 19991118, dni, glyph, glyphIds: ["single_sun", "water", "wind", "fog", "moth", "tablet", "lamp", "salt"], verdict: v, world })}</div>`).join("");
}
module.exports = { run };
