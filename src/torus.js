"use strict";
/*
 * Le tore (claude/DESIGN-art-bahro.md §13.3) : quand deux Âges se portent l'un l'autre, ils forment un seul monde en anneau, et la fenêtre est posée
 * sur son sol. L'autre côté de l'anneau barre le ciel : une terre, pas un fil (mers, fleuves, chaînes, massifs, nuages, et la nuit ses feux).
 * Large aux pieds (tout près), mince au sommet (le point le plus loin), mangée par l'air à mesure. Peinte derrière nos crêtes et nos nuages,
 * devant les étoiles ; le soleil, au centre de l'anneau, passe devant elle.
 *
 * Plusieurs formes (choix de l'auteur, 25 oct.) : chaque Âge a la sienne, tirée de sa graine et de celle de l'Âge qui le porte, toujours la même.
 *   K2  l'anneau part du haut de nos crêtes, en nos couleurs, et devient l'autre Âge au sommet (la forme choisie, deux fois plus fréquente)
 *   D1  une arche haute, dont le sommet touche le haut du ciel
 *   E1  une arche plus basse, tout entière dans le ciel
 *   E2  plus basse encore, l'autre monde posé sur nos montagnes ; nos couleurs aux pieds
 *   F1  la terre au-dessus de nous : l'arche sort par le haut, ses montagnes pendent
 *
 *   paintTorus(ctx, model, t, { fam, key, form, night, air })   fam : la famille de sol de l'autre Âge ; air : la couleur du ciel
 *   formOf(key)  → le nom de la forme de cet Âge
 */
const { rng, fnv } = require("./util");

const TAU = Math.PI * 2;
/** La couleur d'une famille de sol vue de loin : [sombre, clair] (partagée avec src/genscene.js). */
const FAM_RGB = { forest: [[46, 92, 58], [92, 140, 86]], desert: [[176, 132, 82], [222, 186, 128]], ice: [[176, 196, 214], [236, 244, 250]], water: [[40, 86, 120], [96, 150, 182]], stone: [[86, 88, 96], [140, 142, 150]], fire: [[70, 30, 24], [200, 86, 40]], salt: [[206, 190, 196], [244, 236, 238]] };
/** Le relief, commun à toutes les formes (l'auteur trouvait l'anneau lisse) : montagnes qui pendent, bord dentelé, massifs, chaînes. */
const RELIEF = { hang: 0.18, rough: 0.15, massifs: 1.8, chainK: 2.2, farHaze: 0.28, footHaze: 0.5 };
/* rx, ry : les rayons de l'arche (part de la largeur, part de la hauteur du ciel) ; wTop, wFoot : la demi-largeur de la bande au sommet, aux pieds */
const FORMS = {
  K2: { weight: 2, foot: true, rx: 0.52, ry: 0.36, wTop: 0.2, wFoot: 0.55, farHaze: 0.25, footHaze: 0.05, own: true, hang: 0.12, rough: 0.14 },
  D1: { weight: 1, rx: 0.58, ry: 0.84, wTop: 0.13, wFoot: 0.55, farHaze: 0.3 },
  E1: { weight: 1, rx: 0.58, ry: 0.62, wTop: 0.2, wFoot: 0.5 },
  E2: { weight: 1, rx: 0.62, ry: 0.5, wTop: 0.22, wFoot: 0.45, farHaze: 0.25, footHaze: 0.1, own: true, hang: 0.12 },
  F1: { weight: 1, rx: 0.6, ry: 1.12, wTop: 0.3, wFoot: 0.5, farHaze: 0.22, hang: 0.12 },
};
const NAMES = Object.keys(FORMS), TOTAL = NAMES.reduce((s, k) => s + FORMS[k].weight, 0);

/** La forme de cet Âge : tirée une fois de sa clé, la même à chaque lecture. */
function formOf(key) {
  let r = fnv("torus|" + String(key || "")) % TOTAL;
  for (const k of NAMES) { if (r < FORMS[k].weight) return k; r -= FORMS[k].weight; }
  return NAMES[0];
}

const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rgb = (c, al = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, al)).toFixed(3)})`;

function paintTorus(g, m, t, o = {}) {
  const F = { ...RELIEF, ...(FORMS[o.form] || FORMS.K2) }, { W, hz, pal } = m, fam = FAM_RGB[o.fam] || FAM_RGB.stone, N = 140;
  const air = o.air || [160, 182, 200], night = Math.max(0, Math.min(1, o.night || 0));
  const ridgeY = (x) => m.ridges.reduce((lo, rg) => { const n = rg.xs.length - 1, f = Math.max(0, Math.min(n, (x / W) * n)), i = Math.floor(f), y = rg.xs[i] + (rg.xs[Math.min(n, i + 1)] - rg.xs[i]) * (f - i); return Math.min(lo, y); }, hz);
  const cx = W * 0.5, cy = F.foot ? (ridgeY(0) + ridgeY(W)) / 2 : hz; /* K2 : l'anneau part du haut de nos crêtes aux bords de l'image */
  const rx = W * F.rx, ry = hz * F.ry, wTop = hz * F.wTop, wFoot = hz * F.wFoot;
  const seg = (a) => wTop + (wFoot - wTop) * Math.pow(Math.abs(Math.cos(a)), 2.2); /* la perspective de l'anneau */
  const P = (a, r) => [cx + Math.cos(a) * (rx + r), cy + Math.sin(a) * (ry + r)];
  const A = (u) => Math.PI + u * Math.PI;
  const hazeOf = (a) => { const c = Math.abs(Math.cos(a)); return Math.min(0.8, 0.08 + F.farHaze * (1 - c) + F.footHaze * Math.pow(c, 5)); };
  const dk = (c, k) => mix(c, [0, 0, 0], k * night), sea = dk([46, 88, 122], 0.45), lo = dk(fam[0], 0.3), hi = dk(fam[1], 0.4);
  const own = F.own ? { lo: dk(mix(pal.rock, pal.ground, 0.5), 0.3), hi: dk(pal.ground, 0.4) } : null; /* nos couleurs aux pieds, les siennes au sommet */
  const blendAt = (a) => (own ? Math.pow(1 - Math.abs(Math.cos(a)), 1.3) : 1);
  const loAt = (a) => (own ? mix(own.lo, lo, blendAt(a)) : lo), hiAt = (a) => (own ? mix(own.hi, hi, blendAt(a)) : hi);
  const q = rng(fnv("torus-land|" + String(o.key || "")));
  const tone = []; for (let k = 0; k < N + 80; k++) tone.push(q());
  const lakes = []; for (let i = 0; i < 14; i++) lakes.push({ u0: q(), len: 0.03 + 0.08 * q(), v: -0.75 + 1.3 * q(), h: 0.08 + 0.14 * q() });
  const chains = []; for (let i = 0; i < 18; i++) chains.push({ u0: q(), len: 0.04 + 0.1 * q(), v: -0.7 + 1.3 * q(), amp: 0.3 + 0.7 * q() });
  const rivers = []; for (let i = 0; i < 7; i++) rivers.push({ u: q(), wob: q() });
  /* un quadrilatère de la bande, un peu débordant pour qu'aucun fil de fond ne passe entre deux morceaux */
  const quad = (a0, a1, r0a, r0b, r1a, r1b, col) => {
    const e = 0.004, [xa, ya] = P(a0 - e, r0a), [xb, yb] = P(a1 + e, r1a), [xc, yc] = P(a1 + e, r1b), [xd, yd] = P(a0 - e, r0b);
    g.fillStyle = col; g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.lineTo(xc, yc); g.lineTo(xd, yd); g.closePath(); g.fill();
  };
  const edge = (r, n2) => { g.beginPath(); for (let k = 0; k <= n2; k++) { const a = A(k / n2), [x, y] = P(a, r(a, k / n2)); k ? g.lineTo(x, y) : g.moveTo(x, y); } };
  const bumpy = (u, f0, f1) => { const i = Math.floor(u * f0 + f1) % tone.length, j = (i + 1) % tone.length, f = (u * f0) % 1; return tone[i] + (tone[j] - tone[i]) * f; };
  g.save();
  /* la terre, d'un bord à l'autre : claire au bord intérieur (le soleil), sombre vers le bord extérieur (l'ombre du tube) */
  for (let k = 0; k < N; k++) {
    const a0 = A(k / N), a1 = A((k + 1) / N), am = (a0 + a1) / 2, w0 = seg(a0), w1 = seg(a1), h0 = hazeOf(am), base = mix(loAt(am), hiAt(am), 0.3 + 0.5 * tone[k]);
    for (let j = 0; j < 6; j++) {
      const v0 = -1 + (j / 6) * 2, v1 = Math.min(1, -1 + ((j + 1) / 6) * 2 + 0.03), sh = (j < 5 ? 0.15 + 0.08 * j : 0.6) * (own ? 0.4 + 0.6 * blendAt(am) : 1);
      quad(a0, a1, w0 * v0, w0 * v1, w1 * v0, w1 * v1, rgb(mix(mix(base, [10, 12, 18], sh), air, h0), 0.96));
    }
  }
  /* les mers : des lacs allongés le long de l'anneau */
  for (const L of lakes) for (let u = L.u0; u < L.u0 + L.len; u += 1 / N) {
    const a0 = A(u), a1 = A(Math.min(L.u0 + L.len, u + 1 / N)), w0 = seg(a0), w1 = seg(a1), e = Math.sin(((u - L.u0) / L.len) * Math.PI), h = L.h * e;
    quad(a0, a1, w0 * (L.v - h), w0 * (L.v + h), w1 * (L.v - h), w1 * (L.v + h), rgb(mix(sea, air, hazeOf(a0)), 0.95));
  }
  /* les massifs : l'ombre d'un côté, la lumière de l'autre */
  for (let i = 0; i < 90; i++) {
    const u = tone[(i * 3) % tone.length] * 0.96 + 0.02, v = -0.75 + 1.4 * tone[(i * 5 + 1) % tone.length], a = A(u), w = seg(a), c = Math.abs(Math.cos(a)), h0 = hazeOf(a);
    if (c > 0.9) continue; /* près des pieds, ils paraîtraient énormes */
    const sw = Math.min(8, w * F.massifs * (0.05 + 0.12 * tone[(i * 7 + 2) % tone.length]) * (0.6 + 0.6 * c)), sh = Math.min(3.5, w * F.massifs * (0.03 + 0.05 * tone[(i * 11 + 3) % tone.length])), [x, y] = P(a, w * v), rot = a + Math.PI / 2 + (tone[i % tone.length] - 0.5) * 0.8;
    g.fillStyle = rgb(mix(mix(loAt(a), [8, 10, 16], 0.55), air, h0), 0.8); g.beginPath(); g.ellipse(x + 0.6, y + 0.9, sw, sh, rot, 0, TAU); g.fill();
    g.fillStyle = rgb(mix(mix(hiAt(a), [250, 250, 246], 0.25), air, h0), 0.55); g.beginPath(); g.ellipse(x - 0.4, y - 0.6, sw * 0.8, sh * 0.55, rot, 0, TAU); g.fill();
  }
  /* les chaînes : l'ombre de la crête, puis la neige sur l'arête */
  g.lineCap = "round";
  for (const C of chains) {
    g.beginPath(); let first = true;
    for (let u = C.u0; u < C.u0 + C.len; u += 0.6 / N) { const a = A(u), w = seg(a), i = Math.floor(u * N) % tone.length, [x, y] = P(a, w * (C.v + 0.12 * C.amp * (tone[i] - 0.5))); if (first) g.moveTo(x, y); else g.lineTo(x, y); first = false; }
    const am = A(C.u0 + C.len / 2); if (Math.abs(Math.cos(am)) > 0.9) continue;
    g.lineWidth = Math.min(3, (0.6 + seg(am) * 0.04) * F.chainK); g.strokeStyle = rgb(mix(mix(loAt(am), [10, 12, 18], 0.5), air, hazeOf(am)), 0.8); g.stroke();
    g.lineWidth = Math.min(1, Math.max(0.5, seg(am) * 0.015)); g.strokeStyle = rgb(mix([235, 240, 246], air, hazeOf(am)), 0.5 * (1 - night)); g.stroke();
  }
  /* les fleuves, de la montagne à la mer, en travers de l'anneau */
  for (const R of rivers) {
    const a = A(R.u), w = seg(a); if (Math.abs(Math.cos(a)) > 0.88) continue; g.beginPath();
    for (let v = -0.8; v <= 0.6; v += 0.1) { const [x, y] = P(a + 0.012 * Math.sin(v * 7 + R.wob * 9), w * v); if (v === -0.8) g.moveTo(x, y); else g.lineTo(x, y); }
    g.lineWidth = Math.min(1, Math.max(0.4, w * 0.012)); g.strokeStyle = rgb(mix([200, 225, 240], air, hazeOf(a)), 0.55); g.stroke();
  }
  /* le bord intérieur : des montagnes en profil, qui pendent vers nous, plus hautes vers le sommet */
  const hangH = (a, u) => seg(a) * F.hang * (0.25 + 0.75 * bumpy(u, 97, 0)) * (0.3 + 0.7 * (1 - Math.abs(Math.cos(a))));
  edge((a, u) => -seg(a) - hangH(a, u), N * 2); for (let k = N * 2; k >= 0; k--) { const a = A(k / (N * 2)), [x, y] = P(a, -seg(a) + 0.5); g.lineTo(x, y); }
  g.closePath(); g.fillStyle = rgb(mix(mix(own ? own.lo : lo, [10, 12, 18], 0.35), air, 0.25), 0.95); g.fill();
  edge((a, u) => -seg(a) - hangH(a, u), N * 2); g.lineWidth = 0.8; g.strokeStyle = `rgba(245,248,252,${(0.4 * (1 - night) + 0.08).toFixed(3)})`; g.stroke(); /* la neige sur l'arête, face au soleil */
  /* le bord extérieur : l'épaisseur du tube, noire d'ombre, et des massifs en profil qui en dépassent */
  for (let k = 0; k < N; k++) { const a0 = A(k / N), a1 = A((k + 1) / N), w0 = seg(a0), w1 = seg(a1); quad(a0, a1, w0 * 0.86, w0 * 1.02, w1 * 0.86, w1 * 1.02, rgb(mix([12, 14, 20], air, hazeOf(a0) * 0.5), 0.85)); }
  edge((a, u) => seg(a) * 1.02 + seg(a) * F.rough * (0.2 + 0.8 * bumpy(u, 61, 7)), N * 2); for (let k = N * 2; k >= 0; k--) { const a = A(k / (N * 2)), [x, y] = P(a, seg(a) * 0.9); g.lineTo(x, y); }
  g.closePath(); g.fillStyle = rgb(mix([12, 14, 20], air, 0.2), 0.9); g.fill();
  /* ses nuages : petits, allongés le long de l'anneau, avec leur ombre ; aucun près des pieds (ils y paraîtraient énormes) */
  for (let k = 0; k < 60; k++) {
    const u = (tone[k] + t * 0.015) % 1, a = A(u), c = Math.abs(Math.cos(a)); if (c > 0.82) continue;
    const w = seg(a), v = -0.85 + 1.5 * tone[k + 3], [x, y] = P(a, w * v), sw = Math.min(5.5, w * (0.05 + 0.08 * tone[k + 5])), sh = Math.max(0.7, Math.min(1.6, w * 0.025));
    g.fillStyle = `rgba(10,12,18,${(0.16 * (1 - night)).toFixed(3)})`; g.beginPath(); g.ellipse(x + 1, y + 1.5, sw, sh, a + Math.PI / 2, 0, TAU); g.fill();
    g.fillStyle = `rgba(248,250,252,${((0.5 + 0.25 * (1 - c)) * (1 - 0.75 * night)).toFixed(3)})`; g.beginPath(); g.ellipse(x, y, sw, sh, a + Math.PI / 2, 0, TAU); g.fill();
  }
  /* la nuit : ses feux, et la lune dans ses mers */
  if (night > 0.3) {
    for (let k = 0; k < 90; k++) { const a = A(tone[k % tone.length] * 0.9 + 0.05), w = seg(a), [x, y] = P(a, w * (-0.7 + 1.3 * tone[(k * 7) % tone.length])); g.fillStyle = `rgba(255,190,110,${((0.35 + 0.45 * Math.abs(Math.sin(t * 5 + k))) * night).toFixed(3)})`; g.fillRect(x, y, 1, 1); }
    for (const L of lakes) { const a = A(L.u0 + L.len / 2), w = seg(a), [x, y] = P(a, w * L.v), r = w * L.h * 1.2 + 1, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(210,225,245,${(0.45 * night).toFixed(3)})`); gr.addColorStop(1, "rgba(210,225,245,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  }
  /* l'eau qui court : des reflets qui glissent sur ses mers */
  g.globalCompositeOperation = "lighter";
  for (let k = 0; k < 8; k++) {
    const L = lakes[k % lakes.length], a = A(L.u0 + ((t * 0.05 + k / 8) % 1) * L.len), w = seg(a), [x, y] = P(a, w * L.v), r = 1.5 + w * 0.05, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(225,242,255,${(0.4 * (1 - night) + 0.1).toFixed(3)})`); gr.addColorStop(1, "rgba(225,242,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
}

module.exports = { FAM_RGB, FORMS, formOf, paintTorus };
