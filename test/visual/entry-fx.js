"use strict";
const { LinkFx } = require("./linkfx");
function scene() { // fausse « fenêtre » : ciel, soleil, sol, arbres
  const c = document.createElement("canvas"); c.width = 240; c.height = 144; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 104); gr.addColorStop(0, "#2a3f70"); gr.addColorStop(1, "#d9a070"); g.fillStyle = gr; g.fillRect(0, 0, 240, 144);
  g.fillStyle = "#f6e0a8"; g.beginPath(); g.arc(170, 60, 14, 0, 6.28); g.fill();
  g.fillStyle = "#14201f"; g.fillRect(0, 104, 240, 40);
  g.fillStyle = "#070b08"; for (let i = 0; i < 6; i++) { const x = 20 + i * 38; g.beginPath(); g.moveTo(x - 8, 108); g.lineTo(x, 70 - (i % 3) * 8); g.lineTo(x + 8, 108); g.fill(); }
  return c;
}
function run(host) {
  const levels = [[0.2, "TV (piège)", [], "tv"], [0.8, "dying + coupure", [], "classic", true],[0.04, "stable 96%", []], [0.3, "unstable 70%", []], [0.5, "unstable 50%", [{ severity: "medium" }]], [0.7, "unstable 30% + strong contradiction", [{ severity: "strong" }]], [0.9, "dying 10%", [{ severity: "strong" }, { severity: "strong" }]]];
  for (const [u, label, trig, md, unc] of levels) {
    const wrap = document.createElement("div"); wrap.style.cssText = "display:inline-block;margin:6px;width:300px;position:relative;font:11px sans-serif;color:#ccc";
    const win = document.createElement("div"); win.style.cssText = "position:relative;width:300px;height:180px;background:#050505;border:1px solid #cdbd94;overflow:hidden";
    const src = scene(); src.style.cssText = "display:block;width:100%;height:100%"; win.appendChild(src); wrap.appendChild(win);
    wrap.appendChild(document.createTextNode(label + "  u=" + u)); host.appendChild(wrap);
    const fx = new LinkFx(win, src, { unrest: u, triggered: trig, seed: "demo" + u, mode: md || "classic", strength: 1, uncertain: !!unc });
    if (unc) fx.dropUntil = 1e9;
    fx.rr = (function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(12345);
    for (let i = 0; i < 8; i++) fx.tick(1000 + i * 70); // quelques images pour installer les déchirures
  }
}
module.exports = { run };
