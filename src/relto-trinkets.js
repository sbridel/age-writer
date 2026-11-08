"use strict";
/**
 * 2.9 : les pages trouvées dans les Âges (claude/DESIGN-pistes-8-nov.md, § 8). Chacune ajoute une petite chose à l'île du Relto ;
 * elles ne portent rien et n'achètent rien (loi des œuvres). Treize, par sorte de monde :
 *  mer et rivage : coquillages, bois flotté, boule de verre · désert : palme, rose des sables · rivière et moulin : girouette, meule ·
 *  roche et montagne : cristal, pierre levée · bois et prairie : plume, nichoir · glace : givre · un Âge laissé mourir : pierre fendue.
 * `draw` les pose sur l'île (sur la cabane quand elles y vont : girouette, boule de verre, givre, meule) ; `icon` les dessine seules (le livre des pages).
 */
const { clamp, mix, rgba, fnv } = require("./util");

const GY = 208, X0 = 152, X1 = 460;
const KINDS = {
  shells: { label: "Shells", fr: "Coquillages", world: "sea" }, driftwood: { label: "Driftwood", fr: "Bois flotté", world: "sea" }, glass_float: { label: "Glass float", fr: "Boule de verre", world: "sea" },
  palm: { label: "Palm", fr: "Palme", world: "desert" }, desert_rose: { label: "Desert rose", fr: "Rose des sables", world: "desert" },
  weathervane: { label: "Weathervane", fr: "Girouette", world: "river" }, millstone: { label: "Millstone", fr: "Meule", world: "river" },
  crystal: { label: "Crystal", fr: "Cristal", world: "rock" }, standing_stone: { label: "Standing stone", fr: "Pierre levée", world: "rock" },
  feather: { label: "Feather", fr: "Plume", world: "wood" }, nest_box: { label: "Nest box", fr: "Nichoir", world: "wood" },
  frost: { label: "Frost", fr: "Givre", world: "ice" }, split_stone: { label: "Split stone", fr: "Pierre fendue", world: "dying" },
};
const IDS = Object.keys(KINDS);

/** une place libre sur l'île pour une chose posée au sol (hors cabane, bassin, chat, piliers…), fixe pour une graine. */
function slotOf(R, asset, w = 14) {
  const lay = R.lay || {}, base = lay.solid || [], scan = (solid) => { const out = []; for (let x = X0 + w; x < X1 - w; x += 3) if (!solid.some(([a, b]) => x + w / 2 > a && x - w / 2 < b)) out.push(x); return out; };
  let free = scan(base.concat(R._trinketTaken || [])); if (!free.length) free = scan(base); /* plus de place libre : à côté d'une autre chose plutôt que rien */
  if (!free.length) return null; const x = free[(fnv(asset + ":" + (R.scene ? R.scene.seed : 0)) >>> 0) % free.length];
  (R._trinketTaken || (R._trinketTaken = [])).push([x - w / 2 - 3, x + w / 2 + 3]); return x;
}

/** dessine la chose `asset` sur l'île. */
function draw(ctx, R, asset, sky, t) {
  const amb = 0.4 + 0.6 * sky.ambient, col = (c) => mix("#05060c", c, amb), hut = R.scene && (R.scene.structures || []).includes("hut") && !(R.castleOn && R.castleOn()) && !(R.glassOn && R.glassOn()), hx = R.hutX;
  if (hut && asset === "weathervane") return vane(ctx, hx + 4, GY - 54, col, sky, t, 1);
  if (hut && asset === "glass_float") return floatOn(ctx, hx + 34, GY - 30, col, sky, t, 1);
  if (hut && asset === "frost") return frostOn(ctx, hx + 28 - 20, GY - 22, col, sky);
  if (hut && asset === "millstone") return millstone(ctx, hx - 38, GY, col, 1);
  const x = slotOf(R, asset, asset === "palm" || asset === "nest_box" ? 20 : 14); if (x == null) return;
  icon(ctx, asset, x, GY, 1, col, sky, t);
}

/** une chose seule, son pied en (x, gy), à l'échelle k (le livre des pages). */
function icon(ctx, asset, x, gy, k, col, sky, t) {
  col = col || ((c) => c); sky = sky || { ambient: 1, night: 0 }; t = t || 0;
  ctx.save(); ctx.translate(x, gy); ctx.scale(k, k); ctx.lineJoin = "round"; ctx.lineCap = "round";
  switch (asset) {
    case "shells": for (const [dx, s, c] of [[-8, 2.6, "#efe4d2"], [-2, 3.2, "#e8c9b6"], [5, 2.2, "#f4efe6"], [10, 2.8, "#d9b89a"]]) { ctx.fillStyle = col(c); ctx.beginPath(); ctx.moveTo(dx - s, 0); ctx.quadraticCurveTo(dx, -s * 2.2, dx + s, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = col("#9a7a62"); ctx.lineWidth = 0.4; for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(dx, -0.2); ctx.lineTo(dx + j * s * 0.7, -s * 1.3); ctx.stroke(); } } break;
    case "driftwood": ctx.strokeStyle = col("#cfc6b6"); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-14, -1.5); ctx.quadraticCurveTo(-2, -4, 12, -2); ctx.stroke(); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(2, -3.2); ctx.lineTo(8, -8); ctx.moveTo(-8, -2.5); ctx.lineTo(-12, -6); ctx.stroke(); ctx.strokeStyle = col("#9c9384"); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(8, -2.8); ctx.stroke(); break;
    case "glass_float": floatOn(ctx, 0, -12, col, sky, t, 1, true); break;
    case "palm": { ctx.strokeStyle = col("#7a6040"); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-2, -14, 3, -28); ctx.stroke(); ctx.strokeStyle = col("#6e5636"); ctx.lineWidth = 0.6; for (let j = 1; j < 9; j++) { const y = -j * 3; ctx.beginPath(); ctx.moveTo(-1.5 + j * 0.3, y); ctx.lineTo(1.5 + j * 0.3, y - 0.6); ctx.stroke(); }
      const sw = Math.sin(t * 0.9) * 1.2; ctx.strokeStyle = col("#3f7a3a"); ctx.lineWidth = 1.6; for (let j = 0; j < 7; j++) { const a = -Math.PI / 2 + (j - 3) * 0.48, L = 11 + (j % 2) * 2; ctx.beginPath(); ctx.moveTo(3, -28); ctx.quadraticCurveTo(3 + Math.cos(a) * L * 0.6, -28 + Math.sin(a) * L * 0.5 - 2, 3 + Math.cos(a) * L + sw, -28 + Math.sin(a) * L * 0.4 + 5); ctx.stroke(); } break; }
    case "desert_rose": ctx.fillStyle = col("#8a8682"); ctx.beginPath(); ctx.ellipse(0, -2.5, 8, 2.5, 0, 0, Math.PI * 2); ctx.fill(); for (const [dx, dy, r, a] of [[-3, -5, 3.4, -0.4], [2, -6, 3.8, 0.3], [0, -8.5, 3, 0], [4, -4, 2.6, 0.8]]) { ctx.fillStyle = col("#d8a878"); ctx.beginPath(); ctx.ellipse(dx, dy, r, r * 0.45, a, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = col("#a87a50"); ctx.lineWidth = 0.5; ctx.stroke(); } break;
    case "weathervane": vane(ctx, 0, -26, col, sky, t, 1); ctx.strokeStyle = col("#3a3028"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke(); break;
    case "millstone": millstone(ctx, 0, 0, col, 1); break;
    case "crystal": for (const [dx, h, a, c] of [[-3, 14, -0.25, "#bfe0f0"], [1, 19, 0.05, "#d8f0fa"], [5, 11, 0.35, "#a8d0e6"]]) { ctx.save(); ctx.translate(dx, 0); ctx.rotate(a); ctx.fillStyle = col(c); ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-2, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(2, -h * 0.75); ctx.lineTo(2, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba(255, 255, 255, 0.5 * (sky.ambient || 1)); ctx.fillRect(-1.6, -h * 0.72, 0.9, h * 0.6); ctx.restore(); }
      if ((sky.night || 0) > 0.3) { const g = ctx.createRadialGradient(1, -10, 0, 1, -10, 14); g.addColorStop(0, rgba(170, 220, 255, 0.3 * sky.night)); g.addColorStop(1, rgba(170, 220, 255, 0)); ctx.fillStyle = g; ctx.fillRect(-14, -24, 28, 28); } break; /* il luit un peu la nuit */
    case "standing_stone": ctx.fillStyle = col("#7c776e"); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4.5, -14); ctx.quadraticCurveTo(-1, -21, 3.5, -16); ctx.lineTo(4.5, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = col("#5a564f"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(1.5, -12); ctx.moveTo(-2, -15); ctx.arc(-0.5, -12, 1.6, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = col("#5f8a4a"); ctx.beginPath(); ctx.ellipse(-2, -1, 3, 1.2, 0, 0, Math.PI * 2); ctx.fill(); break; /* une spirale gravée, de la mousse au pied */
    case "feather": ctx.fillStyle = col("#5a6a7a"); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-2.5, -8); ctx.lineTo(2.5, -8); ctx.lineTo(3, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = col("#7a8a9a"); ctx.fillRect(-3, -8.5, 6, 1.2); /* le vase */
      ctx.save(); ctx.translate(0, -8); ctx.rotate(0.25 + Math.sin(t * 0.7) * 0.03); ctx.strokeStyle = col("#e8e2d6"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -18); ctx.stroke(); ctx.fillStyle = col("#d8d0c0"); ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(4, -11, 0.5, -19); ctx.quadraticCurveTo(-3, -11, 0, -4); ctx.fill(); ctx.restore(); break;
    case "nest_box": ctx.strokeStyle = col("#4a3a2a"); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke(); ctx.fillStyle = col("#8a6a44"); ctx.fillRect(-5, -32, 10, 10); ctx.fillStyle = col("#5a3e26"); ctx.beginPath(); ctx.moveTo(-7, -32); ctx.lineTo(0, -37); ctx.lineTo(7, -32); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#120c08"; ctx.beginPath(); ctx.arc(0, -27.5, 1.8, 0, Math.PI * 2); ctx.fill();
      if ((sky.night || 0) < 0.4 && Math.sin(t * 0.21) > 0.3) { ctx.fillStyle = col("#3a3a42"); ctx.beginPath(); ctx.ellipse(4.5, -38.5, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(6, -40, 1.1, 0, Math.PI * 2); ctx.fill(); } break; /* un oiseau, certains moments */
    case "frost": frostOn(ctx, -10, -20, col, sky); ctx.strokeStyle = col("#3a2a22"); ctx.lineWidth = 1; ctx.strokeRect(-10, -20, 20, 16); break;
    case "split_stone": ctx.fillStyle = col("#6a6660"); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-9, -8); ctx.lineTo(-4, -12); ctx.lineTo(-1.5, -12); ctx.lineTo(-2.5, -6); ctx.lineTo(-1, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(1.5, 0); ctx.lineTo(0.5, -5); ctx.lineTo(1.5, -12); ctx.lineTo(5, -11); ctx.lineTo(9, -6); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col("#2a2622"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-1.5, -12); ctx.lineTo(-2.5, -6); ctx.lineTo(-1, 0); ctx.moveTo(1.5, -12); ctx.lineTo(0.5, -5); ctx.lineTo(1.5, 0); ctx.stroke(); break; /* fendue en deux, la fente vide */
  }
  ctx.restore();
}

function vane(ctx, x, y, col, sky, t, k) {
  const a = Math.sin(t * 0.13) * 0.35 + Math.sin(t * 0.71) * 0.08, sx = Math.cos(a); /* elle tourne avec le vent du Relto */
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.strokeStyle = col("#2e2620"); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10); ctx.moveTo(-4, -4); ctx.lineTo(4, -4); ctx.moveTo(0, -4); ctx.lineTo(0, -4); ctx.stroke();
  ctx.font = "4px serif"; ctx.fillStyle = col("#2e2620"); ctx.textAlign = "center"; ctx.fillText("N", 0, -11.5);
  ctx.save(); ctx.translate(0, -7); ctx.scale(sx, 1); ctx.fillStyle = col("#3a3228"); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(4, 0); ctx.lineTo(4, -2.5); ctx.lineTo(6.5, 0.2); ctx.lineTo(4, 2.5); ctx.lineTo(4, 0.6); ctx.lineTo(-6, 0.6); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, 0.3); ctx.lineTo(-8, -2.4); ctx.lineTo(-4.5, 0.3); ctx.lineTo(-8, 2.8); ctx.closePath(); ctx.fill(); ctx.restore(); /* la flèche, sa queue en plumes */
  ctx.restore();
}
function floatOn(ctx, x, y, col, sky, t, k, alone) {
  const sw = Math.sin(t * 0.8) * 0.06; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(sw);
  ctx.strokeStyle = col("#8a7a62"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, alone ? -8 : -6); ctx.lineTo(0, 0); ctx.stroke();
  ctx.fillStyle = col("#2f7a5e"); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(0, 4.5, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = col("#a08a62"); ctx.lineWidth = 0.5; for (const a of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.sin(a) * 6, 4.5, 0, 9); ctx.stroke(); } /* le filet de corde */
  ctx.fillStyle = rgba(255, 255, 255, 0.55 * clamp(sky.ambient || 1)); ctx.beginPath(); ctx.arc(-1.5, 3, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function frostOn(ctx, x, y, col, sky) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = rgba(236, 246, 255, 0.75); ctx.lineWidth = 0.5;
  for (const [cx, cy, r] of [[2, 2, 5], [9, 3, 4], [4, 9, 4], [10, 10, 3]]) for (let j = 0; j < 6; j++) { const a = (j / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55); ctx.lineTo(cx + Math.cos(a + 0.5) * r * 0.75, cy + Math.sin(a + 0.5) * r * 0.75); ctx.stroke(); }
  ctx.fillStyle = rgba(236, 246, 255, 0.18); ctx.fillRect(0, 0, 20, 16); ctx.restore(); void col; void sky; /* sur la vitre, il ne fond pas */
}
function millstone(ctx, x, y, col, k) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = col("#8a847a"); ctx.beginPath(); ctx.ellipse(0, -8, 3.5, 8.5, 0.18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = col("#6e6960"); ctx.beginPath(); ctx.ellipse(1.6, -8, 1.4, 8, 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a1612"; ctx.beginPath(); ctx.ellipse(-0.2, -8, 0.9, 1.8, 0.18, 0, Math.PI * 2); ctx.fill(); ctx.restore(); /* debout contre le mur, de chant */
}

/** les pages que peut donner un monde (src/genscene.js : pageOf) */
const BY_WORLD = IDS.reduce((o, id) => { (o[KINDS[id].world] || (o[KINDS[id].world] = [])).push(id); return o; }, {});

module.exports = { KINDS, IDS, BY_WORLD, draw, icon };
