"use strict";
/**
 * Dégâts procéduraux de la fenêtre de liaison.
 *  - pages abîmées  → zones persistantes d'un des quatre styles (décalage, séparation des couleurs, image figée, tache d'encre) ;
 *  - pages arrachées → trous aux bords déchirés (polygone irrégulier tiré de la graine) ;
 *  - fissures       → fractures ramifiées, qui s'allongent à mesure que l'instabilité monte.
 * Tout est tiré de la graine : même livre, mêmes dégâts, au même endroit.
 */
const { rng, fnv, clamp, frac } = require("./util");

const TAU = Math.PI * 2, KINDS = ["shift", "rgb", "freeze", "bleed"];

/** Plan des dégâts d'un livre : zones (abîmées) et trous (arrachées). Pur. */
function plan(seed, dmg, W, H) {
  const r = rng(fnv(String(seed) + "|dmg")), d = Math.min(12, Math.max(0, (dmg && dmg.damaged) | 0)), m = Math.min(6, Math.max(0, (dmg && dmg.removed) | 0));
  const off = Math.floor(r() * 4); // décalage propre au livre : quatre pages donnent quatre styles différents
  const zones = Array.from({ length: d }, (_, i) => {
    const kind = KINDS[(i + off) % 4], h = H * (0.07 + r() * 0.13);
    return { kind, y: r() * (H - h), h, x: r() < 0.5 ? 0 : r() * W * 0.45, w: W * (0.5 + r() * 0.5), p: r() * TAU, k: 0.4 + r() * 0.8 };
  });
  const holes = Array.from({ length: m }, () => {
    const n = 16, radii = Array.from({ length: n }, () => 0.62 + r() * 0.75);
    for (let k = 0; k < n; k++) radii[k] = (radii[k] + radii[(k + 1) % n] + radii[(k + n - 1) % n]) / 3 + (r() - 0.5) * 0.22; // irrégulier mais sans pointes isolées
    return { x: W * (0.12 + 0.76 * r()), y: H * (0.14 + 0.72 * r()), rad: W * (0.06 + r() * 0.07), radii, rot: r() * TAU, p: r() * TAU };
  });
  return { zones, holes };
}

/** Fractures ramifiées : un tableau de fractures, chacune un tableau de branches { pts:[[x,y]…], len }. Pur. */
function branchCracks(r, W, H, count = 12) {
  const out = [];
  for (let c = 0; c < count; c++) {
    const edge = r() < 0.5, x0 = r() * W, y0 = edge ? 0 : r() * H, branches = []; let budget = 70;
    const grow = (x, y, a, steps, depth) => {
      const pts = [[x, y]]; let len = 0;
      for (let i = 0; i < steps && budget > 0; i++, budget--) {
        a += (r() - 0.5) * 1.0; const s = 6 + r() * 9; x += Math.cos(a) * s; y += Math.sin(a) * s; len += s; pts.push([x, y]);
        if (depth < 3 && r() < 0.2) grow(x, y, a + (r() < 0.5 ? -1 : 1) * (0.55 + r() * 0.7), Math.floor(steps * 0.45), depth + 1);
      }
      branches.push({ pts, len, depth });
    };
    grow(x0, y0, edge ? Math.PI / 2 + (r() - 0.5) : r() * TAU, 8 + Math.floor(r() * 5), 0);
    branches.sort((a, b) => a.depth - b.depth); out.push(branches);
  }
  return out;
}

/** Trace les fractures : `reveal` (0..1) est la part de chaque branche déjà ouverte. */
function drawCracks(ctx, cracks, count, reveal, t) {
  for (let i = 0; i < count; i++) {
    const br = cracks[i % cracks.length], fl = 0.55 + 0.45 * Math.sin(t * 3 + i);
    for (const [w, col] of [[3.2, "rgba(255,255,255,0.10)"], [1.1, `rgba(225,238,255,${(0.55 + 0.4 * fl).toFixed(2)})`]]) {
      ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.beginPath();
      for (const b of br) {
        const n = Math.max(1, Math.floor((b.pts.length - 1) * clamp(reveal * (1.15 - 0.2 * b.depth)))); // les branches filles s'ouvrent plus tard
        ctx.lineWidth = w * (1 - b.depth * 0.22);
        for (let k = 0; k <= n && k < b.pts.length; k++) k ? ctx.lineTo(b.pts[k][0], b.pts[k][1]) : ctx.moveTo(b.pts[k][0], b.pts[k][1]);
      }
      ctx.stroke();
    }
  }
}

/**
 * Dessine zones abîmées et trous par-dessus l'image.
 * @param img    image courante (après filtre)       frozen : copie plus ancienne de l'image (zones « figées »)
 * @param part   "zones" | "holes" | rien (les deux) : les trous se dessinent après les teintes pour rester visibles
 */
function drawDamage(ctx, pl, img, iw, ih, W, H, t, frozen, noise, part) {
  const ry = ih / H;
  if (part !== "holes") for (const z of pl.zones) {
    const y = z.y, h = z.h, on = Math.sin(TAU * (t * 0.35 * z.k) + z.p) > -0.35; // la zone « respire » : elle se manifeste par intermittence
    if (z.kind === "bleed") { // tache d'encre : trois lobes qui gonflent
      for (let k = 0; k < 3; k++) {
        const cx = z.x + z.w * (0.25 + 0.25 * k), cy = y + h / 2, rad = h * 1.5 * (1.0 + 0.25 * Math.sin(TAU * (t * 0.2 * z.k) + z.p + k)) * (0.8 + 0.2 * (k % 2));
        const g = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad); g.addColorStop(0, "rgba(10,6,4,0.92)"); g.addColorStop(0.6, "rgba(30,18,10,0.6)"); g.addColorStop(1, "rgba(30,18,10,0)");
        ctx.fillStyle = g; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }
      continue;
    }
    if (!on) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(z.x, y, Math.min(z.w, W - z.x), h); ctx.clip();
    if (z.kind === "shift") {
      const dx = (Math.sin(TAU * t * 5 * z.k + z.p) * 0.6 + Math.sign(Math.sin(z.p)) * 0.4) * (9 + 16 * z.k);
      ctx.drawImage(img, 0, y * ry, iw, Math.max(1, h * ry), dx, y, W, h);
      ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(z.x, y, z.w, h); ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(z.x, y, z.w, 1); ctx.fillRect(z.x, y + h - 1, z.w, 1);
    } else if (z.kind === "rgb") {
      const o = 3 + 6 * z.k; ctx.globalAlpha = 0.55; ctx.drawImage(img, 0, y * ry, iw, Math.max(1, h * ry), o, y, W, h); ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,30,70,0.3)"; ctx.fillRect(z.x + o, y, z.w, h); ctx.fillStyle = "rgba(30,220,255,0.3)"; ctx.fillRect(z.x - o, y, z.w, h);
    } else if (frozen) { // figé : le bandeau montre une image plus ancienne, en retard sur le reste
      ctx.drawImage(frozen, 0, y, W, h, 0, y, W, h); ctx.fillStyle = "rgba(130,140,150,0.32)"; ctx.fillRect(z.x, y, z.w, h); ctx.fillStyle = "rgba(0,0,0,0.3)"; for (let yy = y; yy < y + h; yy += 2) ctx.fillRect(z.x, yy, z.w, 1);
    }
    ctx.restore();
  }
  if (part !== "zones") for (const hl of pl.holes) { // pages arrachées : trou aux bords déchirés
    const pulse = 1 + 0.04 * Math.sin(TAU * (t * 0.3) + hl.p), n = hl.radii.length;
    const path = (k) => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = hl.rot + (i % n) / n * TAU, rr = hl.rad * hl.radii[i % n] * pulse * k; i ? ctx.lineTo(hl.x + Math.cos(a) * rr * 1.25, hl.y + Math.sin(a) * rr) : ctx.moveTo(hl.x + Math.cos(a) * rr * 1.25, hl.y + Math.sin(a) * rr); } ctx.closePath(); };
    path(1.18); ctx.fillStyle = "rgba(70,44,24,0.55)"; ctx.fill(); // bord brûlé
    path(1); ctx.fillStyle = "#0a0809"; ctx.fill();
    if (noise) { ctx.save(); path(1); ctx.clip(); ctx.globalAlpha = 0.28; ctx.drawImage(noise, -Math.floor(frac(t * 7 + hl.p) * 64), -Math.floor(frac(t * 5 + hl.p) * 64), W + 64, H + 64); ctx.restore(); }
    path(1.02); ctx.strokeStyle = "rgba(225,205,165,0.35)"; ctx.lineWidth = 1; ctx.stroke(); // tranche du papier
  }
}

module.exports = { plan, branchCracks, drawCracks, drawDamage, KINDS };
