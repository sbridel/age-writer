"use strict";

/* La salle de l'œuf (d'après la salle de l'œuf d'Uru). L'œuf flotte et tourne lentement ; sur le mur, la lumière marbrée, comme un reflet d'eau, glisse vers le haut. */
const W = 640, H = 360, TAU = Math.PI * 2;
let ctx = null; /* le contexte du dessin en cours (posé par drawEggRoom) */
const q = (k) => { let h = 2166136261; for (const ch of String(k)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
const { rgba } = require("./util");
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const layer = (draw) => { const c = document.createElement("canvas"); c.width = 1280; c.height = 720; const b = c.getContext("2d"); b.scale(2, 2); draw(b); return c; };

/* ---- le mur : une pierre marbrée sombre, bleu-vert, à grandes taches claires et sombres (raccordable de haut en bas) ---- */
const TW = 460, TH = 300;
function makeMarble() { const c = document.createElement("canvas"); c.width = TW * 2; c.height = TH * 2; const b = c.getContext("2d"); b.scale(2, 2);
  b.fillStyle = "#132529"; b.fillRect(0, 0, TW, TH);
  const blob = (seed, n, col, a, sz, blur) => { b.filter = `blur(${blur}px)`; for (let i = 0; i < n; i++) { const x = q(seed + "x" + i) * TW, y = q(seed + "y" + i) * TH, r = sz * (0.4 + q(seed + "r" + i)), k = 3 + Math.floor(q(seed + "k" + i) * 6);
      for (let j = 0; j < k; j++) { const xx = x + (q(seed + i + "dx" + j) - 0.5) * r * 2.2, yy = y + (q(seed + i + "dy" + j) - 0.5) * r * 1.2, rr = r * (0.35 + q(seed + i + "rr" + j) * 0.6);
        for (const dy of [-TH, 0, TH]) { b.fillStyle = rgba(col[0], col[1], col[2], a * (0.6 + 0.4 * q(seed + i + "a" + j))); b.beginPath(); b.ellipse(xx, yy + dy, rr * 1.5, rr, (q(seed + i + "t" + j) - 0.5) * 0.8, 0, TAU); b.fill(); } } } b.filter = "none"; };
  blob("d", 60, [4, 10, 12], 0.75, 16, 3); /* les veines sombres */
  blob("m", 70, [38, 78, 82], 0.6, 12, 2.5); /* le bleu-vert */
  blob("l", 45, [90, 150, 150], 0.55, 9, 2); /* les taches claires */
  blob("h", 30, [150, 205, 200], 0.4, 5, 1.5); /* les éclats */
  return c; }
/* ---- les fenêtres (hautes, en arc, un appui ; elles ne descendent pas jusqu'au sol), la corniche courbe au pied de l'œuf ---- */
function makeMid() { return layer((b) => {
  const win = (x, w) => { const y0 = 84, y1 = 238, fr = 9;
    b.fillStyle = "#3d5157"; b.beginPath(); b.moveTo(x - fr, y1 + fr); b.lineTo(x - fr, y0 + 16); b.quadraticCurveTo(x + w / 2, y0 - 26, x + w + fr, y0 + 16); b.lineTo(x + w + fr, y1 + fr); b.closePath(); b.fill(); /* le cadre de pierre */
    const fg = b.createLinearGradient(x - fr, 0, x + w + fr, 0); fg.addColorStop(0, "rgba(140,170,175,0.25)"); fg.addColorStop(0.5, "rgba(0,0,0,0)"); fg.addColorStop(1, "rgba(0,0,0,0.3)"); b.fillStyle = fg; b.fill();
    const g = b.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, "#1a1611"); g.addColorStop(1, "#2c241b"); b.fillStyle = g; b.beginPath(); b.moveTo(x, y1); b.lineTo(x, y0 + 18); b.quadraticCurveTo(x + w / 2, y0 - 10, x + w, y0 + 18); b.lineTo(x + w, y1); b.closePath(); b.fill(); /* le fond de la fenêtre, brun sombre */
    b.strokeStyle = "#7f959a"; b.lineWidth = 1.2; b.beginPath(); b.moveTo(x - fr, y0 + 16); b.quadraticCurveTo(x + w / 2, y0 - 26, x + w + fr, y0 + 16); b.stroke();
    b.strokeStyle = "#1a2428"; b.lineWidth = 1; b.beginPath(); b.moveTo(x, y1); b.lineTo(x, y0 + 18); b.quadraticCurveTo(x + w / 2, y0 - 10, x + w, y0 + 18); b.lineTo(x + w, y1); b.stroke();
    b.fillStyle = "#56696e"; b.fillRect(x - fr - 3, y1 + fr - 2, w + 2 * fr + 6, 5); b.fillStyle = "#22302f"; b.fillRect(x - fr - 3, y1 + fr + 3, w + 2 * fr + 6, 2); /* l'appui */ };
  win(158, 70); win(412, 70);
  /* loin en dessous, une bande de pierre courbe : le puits continue plus bas, on n'en voit pas le fond */
  b.fillStyle = "#0e1719"; b.beginPath(); b.moveTo(96, 330); b.lineTo(96, 300); b.quadraticCurveTo(320, 284, 544, 300); b.lineTo(544, 330); b.closePath(); b.fill();
  b.strokeStyle = "#2c3e40"; b.lineWidth = 1.6; b.beginPath(); b.moveTo(96, 300); b.quadraticCurveTo(320, 284, 544, 300); b.stroke();
  b.strokeStyle = "#06090a"; b.lineWidth = 1.2; b.beginPath(); b.moveTo(96, 307); b.quadraticCurveTo(320, 291, 544, 307); b.stroke();
}); }
/* ---- la passerelle de planches, les piliers de bois ---- */
function makeFg() { return layer((b) => {
  /* au premier plan : le rebord de la fenêtre par laquelle on regarde, de grosses planches de pierre usée */
  const pl = b.createLinearGradient(0, 312, 0, 352); pl.addColorStop(0, "#58706f"); pl.addColorStop(1, "#33403f"); b.fillStyle = pl; b.beginPath(); b.moveTo(128, 312); b.lineTo(512, 312); b.lineTo(540, 350); b.lineTo(100, 350); b.closePath(); b.fill();
  b.fillStyle = "#0b1011"; b.fillRect(96, 350, 448, 10); /* le dessous du rebord, dans l'ombre */
  /* l'embrasure : l'épaisseur du mur, de chaque côté ; le rebord va d'un côté à l'autre, il ne dépasse pas */
  for (const sd of [-1, 1]) { const xo = sd < 0 ? 96 : 544, xi = sd < 0 ? 128 : 512, g = b.createLinearGradient(xo, 0, xi, 0); g.addColorStop(0, "#0c1215"); g.addColorStop(1, "#1d2a2f"); b.fillStyle = g;
    b.beginPath(); b.moveTo(xo, 0); b.lineTo(xi, 0); b.lineTo(xi, 312); b.lineTo(xo, 350); b.closePath(); b.fill();
    b.strokeStyle = "rgba(0,0,0,0.45)"; b.lineWidth = 1; for (let k = 1; k < 4; k++) { const f = k / 4, x = xo + (xi - xo) * f; b.beginPath(); b.moveTo(x, 0); b.lineTo(x, 350 - 38 * f); b.stroke(); } /* les planches de l'embrasure */
    b.strokeStyle = "rgba(150,180,180,0.25)"; b.beginPath(); b.moveTo(xi, 0); b.lineTo(xi, 312); b.stroke(); }
  b.strokeStyle = "#151c1d"; b.lineWidth = 1.3; for (const y of [323, 336]) { const k = (y - 312) / 38; b.beginPath(); b.moveTo(128 - 28 * k, y); b.lineTo(512 + 28 * k, y); b.stroke(); } b.beginPath(); b.moveTo(420, 312); b.lineTo(428, 323); b.stroke(); b.beginPath(); b.moveTo(250, 323); b.lineTo(244, 336); b.stroke();
  b.fillStyle = "#8aa09e"; b.fillRect(128, 311, 384, 1.5);
  for (let i = 0; i < 220; i++) { b.fillStyle = rgba(10, 16, 18, 0.15 + q("pw" + i) * 0.25); b.fillRect(118 + q("px" + i) * 400, 313 + q("py" + i) * 36, 4 + q("pl" + i) * 18, 0.8); } for (let i = 0; i < 90; i++) { b.fillStyle = rgba(160, 190, 185, 0.12); b.fillRect(118 + q("qx" + i) * 400, 313 + q("qy" + i) * 36, 2 + q("ql" + i) * 8, 0.7); } /* la pierre usée */
  const pillar = (x0, x1) => { const g = b.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "#080d10"); g.addColorStop(0.55, "#1a252a"); g.addColorStop(1, "#080d10"); b.fillStyle = g; b.fillRect(x0, 0, x1 - x0, H);
    b.strokeStyle = "rgba(0,0,0,0.5)"; b.lineWidth = 1; for (let k = 0; k < 10; k++) { const x = x0 + q("pl" + x0 + k) * (x1 - x0); b.beginPath(); b.moveTo(x, 0); b.lineTo(x + (q("pk" + x0 + k) - 0.5) * 5, H); b.stroke(); }
    b.strokeStyle = "rgba(120,150,160,0.12)"; for (let k = 0; k < 6; k++) { const x = x0 + q("ph" + x0 + k) * (x1 - x0); b.beginPath(); b.moveTo(x, 0); b.lineTo(x + 2, H); b.stroke(); } };
  pillar(0, 96); pillar(544, 640);
}); }
let CACHE = null; /* les fonds peints une fois (au premier passage dans la salle) */
const cache = () => CACHE || (CACHE = { marble: makeMarble(), mid: makeMid(), fg: makeFg() });

/* ---- l'œuf ---- un volume de révolution, les sculptures posées en (u, v) : u l'angle autour, v de 0 (sommet) à 1 (bas) */
const E = { cx: 320, cy: 142, rx: 69, ry: 106 };
const prof = (v) => v < 0.66 ? Math.pow(Math.sin((v / 0.66) * Math.PI / 2), 0.72) : Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.66) / 0.34, 2.2))); /* pointu en haut, large aux deux tiers, le bas arrondi */
function proj(u, v, rot, cy) { const a = u + rot, r = E.rx * prof(v); return { x: E.cx + Math.sin(a) * r, y: cy - E.ry + v * 2 * E.ry, z: Math.cos(a) }; }
function eggPath(cy) { ctx.beginPath(); for (let i = 0; i <= 90; i++) { const v = i / 90; ctx.lineTo(E.cx + E.rx * prof(v), cy - E.ry + v * 2 * E.ry); } for (let i = 90; i >= 0; i--) { const v = i / 90; ctx.lineTo(E.cx - E.rx * prof(v), cy - E.ry + v * 2 * E.ry); } ctx.closePath(); }
const shade = (z, base) => base.map((c) => c * (0.35 + 0.65 * Math.max(0, z))); /* plus on tourne vers le bord, plus c'est sombre */
/* une surface en relief : contour en (u, v), remplie, avec son arête éclairée en haut et son ombre portée en bas */
function relief(pts, rot, cy, col, o = {}) {
  { const D = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], n = pts[(i + 1) % pts.length]; for (let k = 0; k < 12; k++) D.push([p[0] + (n[0] - p[0]) * k / 12, p[1] + (n[1] - p[1]) * k / 12]); } pts = D; } /* chaque bord découpé finement : sur la surface courbe, un bord droit en (u, v) se courbe */
  const P = pts.map((p) => proj(p[0], p[1], rot, cy)), zs = P.map((p) => p.z), z = zs.reduce((a, b) => a + b, 0) / zs.length; if (Math.max(...zs) < 0.02) return;
  const path = (dy = 0) => { ctx.beginPath(); P.forEach((p, i) => { const pp = p.z < 0 ? { x: E.cx + Math.sign(p.x - E.cx) * E.rx * prof(pts[i][1]), y: p.y } : p; i ? ctx.lineTo(pp.x, pp.y + dy) : ctx.moveTo(pp.x, pp.y + dy); }); ctx.closePath(); };
  const k = Math.min(1, Math.max(0, z + 0.25) / 0.6);
  if (!o.inset) { ctx.fillStyle = rgba(5, 10, 18, 0.55 * k); path(2.2); ctx.fill(); } /* l'ombre sous le relief */
  const c = shade(z, col); ctx.fillStyle = rgba(c[0], c[1], c[2], k); path(); ctx.fill();
  ctx.save(); path(); ctx.clip(); ctx.strokeStyle = rgba(225, 238, 245, (o.inset ? 0.18 : 0.5) * k); ctx.lineWidth = 1.6; path(o.inset ? 1.4 : -1.2); ctx.stroke(); ctx.restore(); /* l'arête éclairée */
  ctx.strokeStyle = rgba(8, 14, 22, 0.5 * k); ctx.lineWidth = 0.8; path(); ctx.stroke();
}
/* une courbe lisse (Catmull-Rom) en (u, v) → des points */
function smooth(pts, n = 8) { const cr = (a, b, c, d, f) => 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (3 * b - a - 3 * c + d) * f * f * f), out = [];
  for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; for (let k = 0; k < n; k++) { const f = k / n; out.push([cr(p0[0], p1[0], p2[0], p3[0], f), cr(p0[1], p1[1], p2[1], p3[1], f)]); } } out.push(pts[pts.length - 1]); return out; }
/* un ruban (une flamme) : une ligne centrale en (u, v) et une largeur qui s'effile au bout */
function ribbon(spine, w0, w1) { const S = smooth(spine, 10), L = [], R = []; S.forEach((p, i) => { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)], du = b[0] - a[0], dv = (b[1] - a[1]) * 1.9, d = Math.hypot(du, dv) || 1, w = w0 + (w1 - w0) * (i / (S.length - 1)); L.push([p[0] - dv / d * w, p[1] + du / d * w / 1.9]); R.push([p[0] + dv / d * w, p[1] - du / d * w / 1.9]); }); return [...L, ...R.reverse()]; }
const STONE = [150, 178, 198], STONE_D = [92, 118, 140], STONE_L = [176, 200, 216];
function face(u0, rot, cy) {
  for (const sd of [-1, 1]) {
    const U = (u) => u0 + sd * u;
    relief([[U(0.1), 0.6], [U(1.32), 0.6], [U(1.34), 0.98], [U(0.1), 0.98]], rot, cy, STONE_D, { inset: true }); /* le champ du bas, en creux, plus sombre */
    relief(ribbon([[0.14, 0.63], [0.36, 0.7], [0.5, 0.8], [0.74, 0.86], [0.96, 0.84]].map(([u, v]) => [U(u), v]), 0.11, 0.015), rot, cy, STONE_L); /* la grande flamme : elle part de la nervure et file vers le bord */
    relief(ribbon([[0.58, 0.63], [0.82, 0.69], [0.95, 0.76], [1.12, 0.79], [1.26, 0.72]].map(([u, v]) => [U(u), v]), 0.09, 0.012), rot, cy, STONE_L); /* la seconde, plus haut, qui se relève */
    relief(ribbon([[0.2, 0.86], [0.42, 0.92], [0.7, 0.95]].map(([u, v]) => [U(u), v]), 0.06, 0.01), rot, cy, STONE_L);
    relief([[U(0.07), 0.53], [U(1.08), 0.53], [U(1.2), 0.5], [U(1.3), 0.4], [U(1.38), 0.34], [U(1.4), 0.46], [U(1.36), 0.62], [U(1.12), 0.61], [U(0.07), 0.61]], rot, cy, STONE); /* le collier, à mi-hauteur, ses bouts relevés en cornes */
  }
  /* la nervure : une bande en relief du sommet au bas, cinq filets ; en bas, les filets s'écartent et s'enroulent */
  relief([[u0 - 0.075, 0.05], [u0 + 0.075, 0.05], [u0 + 0.075, 0.9], [u0 - 0.075, 0.9]], rot, cy, STONE_L);
  for (let k = -2; k <= 2; k++) { const S = smooth([[u0 + k * 0.03, 0.05], [u0 + k * 0.03, 0.82], [u0 + k * 0.09, 0.92], [u0 + k * 0.26, 0.97]], 10).map(([u, v]) => proj(u, v, rot, cy));
    for (let i = 0; i < S.length - 1; i++) { const z = (S[i].z + S[i + 1].z) / 2; if (z < 0.05) continue; ctx.strokeStyle = rgba(30, 44, 58, 0.6 * z); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(S[i].x, S[i].y); ctx.lineTo(S[i + 1].x, S[i + 1].y); ctx.stroke(); } }
}
function drawEgg(t) {
  const cy = E.cy + Math.sin(t * 0.55) * 4, rot = t * 0.12; /* il flotte, il tourne lentement */
  const g = ctx.createRadialGradient(E.cx - 22, cy - E.ry * 0.7, 4, E.cx, cy - E.ry * 0.05, E.ry * 1.2); g.addColorStop(0, "#b4cad8"); g.addColorStop(0.35, "#7d9ab0"); g.addColorStop(0.7, "#4a6680"); g.addColorStop(1, "#22344a");
  ctx.fillStyle = g; eggPath(cy); ctx.fill();
  ctx.save(); eggPath(cy); ctx.clip();
  for (let i = 0; i < 700; i++) { const p = proj(q("eu" + i) * TAU, q("ev" + i), rot, cy); if (p.z < 0) continue; ctx.fillStyle = q("ec" + i) < 0.75 ? rgba(20, 32, 48, (0.05 + q("ea" + i) * 0.1) * p.z) : rgba(210, 226, 236, 0.1 * p.z); ctx.beginPath(); ctx.ellipse(p.x, p.y, (0.6 + q("es" + i) * 2.4) * (0.4 + 0.6 * p.z), 0.6 + q("es" + i) * 2, 0, 0, TAU); ctx.fill(); } /* la pierre grenue, qui tourne avec lui */
  face(0, rot, cy); face(Math.PI, rot, cy);
  const vol = ctx.createLinearGradient(E.cx - E.rx, 0, E.cx + E.rx, 0); vol.addColorStop(0, "rgba(0,0,0,0.45)"); vol.addColorStop(0.32, "rgba(0,0,0,0)"); vol.addColorStop(0.75, "rgba(0,0,0,0.12)"); vol.addColorStop(1, "rgba(0,0,0,0.6)"); ctx.fillStyle = vol; ctx.fillRect(E.cx - E.rx, cy - E.ry, E.rx * 2, E.ry * 2); /* le volume : la lumière vient d'en haut, un peu à gauche */
  const low = ctx.createLinearGradient(0, cy - E.ry * 0.2, 0, cy + E.ry); low.addColorStop(0, "rgba(0,0,0,0)"); low.addColorStop(1, "rgba(5,10,20,0.45)"); ctx.fillStyle = low; ctx.fillRect(E.cx - E.rx, cy - E.ry, E.rx * 2, E.ry * 2);
  ctx.restore();
  for (const u0 of [0, Math.PI]) { const N = 16; for (let k = 0; k < N; k++) { const v0 = (k / N) * 0.16, v1 = ((k + 1) / N) * 0.16, a = proj(u0, v0, rot, cy), b = proj(u0, v1, rot, cy), z = (a.z + b.z) / 2; if (z < -0.15) continue;
      ctx.strokeStyle = rgba(6, 12, 18, Math.min(1, (z + 0.15) / 0.4)); ctx.lineCap = "round"; ctx.lineWidth = 4.4 * (1 - k / N) + 0.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } } /* la fente, au sommet : elle suit la nervure */
}
/* le cristal, au pied : une pyramide de glace bleue, posée sur la corniche */
function crystal(t) { const x = 320, y = 330, h = 40, w = 14, /* sa base est cachée par le rebord : on n'en voit que la pointe */ g = ctx.createRadialGradient(x, y - 8, 0, x, y - 8, 26); g.addColorStop(0, rgba(140, 200, 255, 0.25 + 0.05 * Math.sin(t * 1.3))); g.addColorStop(1, rgba(140, 200, 255, 0)); ctx.fillStyle = g; ctx.fillRect(x - 26, y - 34, 52, 52);
  ctx.fillStyle = "#6f9cc8"; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x - w, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#a9cdeb"; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + 2, y); ctx.lineTo(x - w, y); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 40; i++) { const u = q("cu" + i), v = q("cv" + i), xx = x - w + (u * 2 * w) * v + (1 - v) * w * 0 , yy = y - h + v * h; if (Math.abs(xx - x) > w * v) continue; ctx.fillStyle = rgba(230, 245, 255, 0.25 + q("ca" + i) * 0.3); ctx.fillRect(xx, yy, 1, 1); } /* le givre */ }
/** La salle de l'œuf (on y entre par une porte du couloir) : on la regarde depuis le rebord d'une fenêtre ; l'œuf de pierre flotte et tourne lentement dans le puits ; la lumière marbrée du mur glisse vers le haut. */
function drawEggRoom(r, c, sc, sky, t) {
  ctx = c; const C = cache(), T = TR(r); if (r.opts && r.opts.reducedMotion) t = 0;
  ctx.fillStyle = "#030608"; ctx.fillRect(0, 0, W, H);
  /* le mur marbré : la lumière glisse lentement vers le haut */
  { const off = (t * 7) % TH; ctx.save(); ctx.beginPath(); ctx.rect(96, 20, 448, 314); ctx.clip(); for (const k of [0, 1]) ctx.drawImage(C.marble, 0, 0, TW * 2, TH * 2, 90, 20 - off + k * TH, TW, TH); if (20 - off + 2 * TH < 334) ctx.drawImage(C.marble, 0, 0, TW * 2, TH * 2, 90, 20 - off + 2 * TH, TW, TH);
    const fade = ctx.createLinearGradient(0, 20, 0, 260); fade.addColorStop(0, "rgba(3,6,8,1)"); fade.addColorStop(0.5, "rgba(3,6,8,0.6)"); fade.addColorStop(1, "rgba(3,6,8,0.05)"); ctx.fillStyle = fade; ctx.fillRect(96, 20, 448, 314); ctx.restore(); } /* en haut, le noir */
  ctx.drawImage(C.mid, 0, 0, W, H);
  const beam = ctx.createLinearGradient(0, 0, 0, 290); beam.addColorStop(0, rgba(170, 200, 215, 0.2)); beam.addColorStop(1, rgba(150, 190, 210, 0)); ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(298, 0); ctx.lineTo(342, 0); ctx.lineTo(410, 290); ctx.lineTo(230, 290); ctx.closePath(); ctx.fill(); /* le rai de lumière d'en haut */
  const st = ctx.createRadialGradient(325, 6, 0, 325, 6, 7); st.addColorStop(0, "rgba(255,255,255,0.95)"); st.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = st; ctx.fillRect(315, -4, 20, 20);
  drawEgg(t); crystal(t);
  for (let i = 0; i < 50; i++) { const x = 250 + q("d" + i) * 150 + Math.sin(t * 0.3 + i) * 3, y = (q("dy" + i) * 280 + t * (2 + q("dv" + i) * 3)) % 280; ctx.fillStyle = rgba(220, 235, 245, 0.1 + q("da" + i) * 0.25); ctx.beginPath(); ctx.arc(x, y, 0.5 + q("ds" + i) * 0.7, 0, TAU); ctx.fill(); } /* la poussière dans le rai */
  ctx.drawImage(C.fg, 0, 0, W, H);
  r.hot.push({ x: E.cx - E.rx, y: E.cy - E.ry, w: E.rx * 2, h: E.ry * 2, tip: T("egg.egg") }); r.hot.push({ x: 300, y: 290, w: 40, h: 28, tip: T("egg.crystal") });
  require("./relto-atelier").backButton(r, ctx, T("egg.back"), "hall");
  void sc; void sky;
}
module.exports = { drawEggRoom };
