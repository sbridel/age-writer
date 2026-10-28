"use strict";
/**
 * ESSAI (28 oct. soir) : les aurores, partagées par la fenêtre de liaison (src/genscene.js) et le ciel du Relto (src/relto-render.js).
 * D'après photos : des rideaux de rayons verticaux, doux et flous (peints en petit puis agrandis), un ourlet vert vif en bas, de hauts rayons
 * qui virent au rose-magenta vers le haut (plus ou moins selon l'Âge), une large lueur verte au-dessus de l'horizon ; deux ou trois rideaux plissés.
 * o : { W, H, hz (l'horizon), seed, t (la phase de la boucle, 0..1), ak (la force, 0..1), top (le pied du premier rideau, en fraction de H), gain }
 */
const TAU = Math.PI * 2, DOWN = 4, clampP = (v) => Math.max(0, Math.min(1, v));
const rng = (s) => () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
let LAYER = null;
function layerOf(W, H) {
  if (typeof document === "undefined") return null;
  try { const w = Math.ceil(W / DOWN), h = Math.ceil(H / DOWN); if (!LAYER) LAYER = document.createElement("canvas"); if (LAYER.width !== w) LAYER.width = w; if (LAYER.height !== h) LAYER.height = h;
    const x = LAYER.getContext("2d"); return x && typeof x.clearRect === "function" && typeof x.createLinearGradient === "function" ? x : null; } catch (e) { return null; }
}
/** les rideaux, peints dans `g` à l'échelle `k` (1 : pleine taille ; 1/DOWN : le calque flou) */
function paint(g, o, k) {
  const { W, H, hz, t, ak } = o, q = rng((o.seed ^ 0xa0e0a) >>> 0), n = 2 + (q() < 0.5 ? 1 : 0), top = o.top != null ? o.top : 0.3, gain = o.gain || 1, pinkAll = o.pink != null ? (q(), o.pink) : q();
  const S = (v) => v * k, dx = 1;
  { const gl = g.createLinearGradient(0, S(hz - H * 0.4), 0, S(hz)); gl.addColorStop(0, rgba([40, 200, 120], 0)); gl.addColorStop(0.7, rgba([60, 220, 130], 0.16 * ak * gain)); gl.addColorStop(1, rgba([80, 230, 140], 0.22 * ak * gain)); g.fillStyle = gl; g.fillRect(0, S(hz - H * 0.4), S(W), S(H * 0.4)); } /* la lueur verte basse */
  for (let c = 0; c < n; c++) {
    const y0 = H * (top + 0.07 * c + 0.04 * q()), A = H * (0.02 + 0.03 * q()), f = 0.6 + 1.0 * q(), ph = q() * TAU, dir = q() < 0.5 ? -1 : 1, u0 = q() * 0.2, u1 = 0.8 + q() * 0.2;
    const hh = H * (0.28 + 0.2 * q()) * (1 - 0.2 * c), far = 1 - 0.25 * c, pink = clampP(0.1 + 0.9 * pinkAll) * (0.6 + 0.4 * q());
    const gr = g.createLinearGradient(0, 0, 0, -1); /* le rideau en unités : 0 = l'ourlet, -1 = le haut des rayons */
    gr.addColorStop(0, rgba([170, 255, 200], 0.75)); gr.addColorStop(0.05, rgba([80, 250, 150], 0.7)); gr.addColorStop(0.3, rgba([60, 220, 140], 0.42));
    gr.addColorStop(0.55, rgba([120 + 100 * pink, 160 - 110 * pink, 150], 0.22 + 0.12 * pink)); gr.addColorStop(0.8, rgba([200, 50, 150], 0.18 * pink + 0.04)); gr.addColorStop(1, rgba([180, 40, 140], 0)); g.fillStyle = gr;
    for (let px = Math.floor(S(W * u0)); px <= S(W * u1); px += dx) {
      const x = px / k, u = x / W, env = Math.sin(Math.PI * (u - u0) / (u1 - u0)), base = y0 + A * Math.sin(u * TAU * f + ph + TAU * t * dir) + A * 0.4 * Math.sin(u * TAU * f * 2.7 + ph * 1.3 - TAU * t * 2 * dir);
      if (base > hz - 2) continue;
      const ray = 0.45 + 0.35 * Math.sin(u * 61 + ph + TAU * t * 2 * dir) * Math.sin(u * 23 - TAU * t) + 0.2 * Math.sin(u * 140 + ph * 3 + TAU * t * 3), h = hh * (0.5 + 0.5 * Math.sin(u * TAU * 1.3 + ph + TAU * t)) * (0.35 + 0.65 * env) * (0.75 + 0.5 * ray);
      const a = ak * far * env * (0.25 + 0.75 * ray) * gain; if (a < 0.01) continue;
      g.save(); g.globalAlpha = Math.min(1, a); g.translate(px, S(base)); g.scale(1, S(h)); g.fillRect(0, -1, dx + 0.3, 1 + S(H * 0.01) / S(h)); g.restore();
    }
  }
}
function curtains(g, o) {
  if (typeof g.save !== "function") return;
  const L = typeof g.drawImage === "function" ? layerOf(o.W, o.H) : null;
  if (!L) { g.save(); g.globalCompositeOperation = "lighter"; paint(g, o, 1); g.restore(); return; }
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = "source-over"; L.globalAlpha = 1; L.clearRect(0, 0, L.canvas.width, L.canvas.height); L.globalCompositeOperation = "lighter";
  paint(L, o, 1 / DOWN);
  g.save(); g.globalCompositeOperation = "lighter"; g.imageSmoothingEnabled = true; if ("imageSmoothingQuality" in g) g.imageSmoothingQuality = "high"; g.drawImage(L.canvas, 0, 0, o.W, o.H); g.restore(); /* agrandi : les rayons deviennent doux, comme sur les photos */
}
module.exports = { curtains };
