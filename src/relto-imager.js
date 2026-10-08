"use strict";
// L'Imageur du Relto : une chambre de pierre froide, un lutrin où l'on pose le livre d'un Âge, l'écran des ondes,
// le cristal où l'Âge apparaît, la jauge de netteté et la console (levier de polarité, molettes de fréquence et
// d'amplitude, anneau d'harmonique, roue de phase). Étape 1 : la synchronisation atmosphérique (voir src/imager.js).
// Tout est dessiné ici, en coordonnées logiques 640 × 360 ; les zones cliquables portent `imager: …`.
const { rng, clamp, mix, rgba, frac } = require("./util");
const I = require("./imager");
const G = require("./genscene");
const W = 640, H = 360, FLOOR = 300;
const SCOPE = { x: 236, y: 132, r: 78 }, CRYSTAL = { x: 420, y: 132, w: 112, h: 150 }, GAUGE = { x: 566, y: 120, r: 40 };
const DIALS = [["freq", 288], ["amp", 362], ["harm", 436], ["phase", 510]];
const LABEL = { freq: "Frequency dial", amp: "Amplitude dial", harm: "Harmonic ring", phase: "Phase wheel", pol: "Polarity lever" };

/** L'onde d'un ciel (ou d'un réglage) sur l'écran rond : `s` = { pol, freq, amp, harm }, `phase` en unités de 0 à 25. */
function wavePath(ctx, s, phase, sc) {
  const cycles = 0.75 + s.freq * 0.25, A = (6 + s.amp * 2.4) * (sc.r / 78), h = s.harm / 24, ph = (phase / I.TURN) * Math.PI * 2;
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const x = sc.x - sc.r + (i / 64) * sc.r * 2, u = (i / 64) * Math.PI * 2 * cycles + ph;
    const y = sc.y - s.pol * (A * Math.sin(u) + A * 0.35 * h * Math.sin(3 * u + ph));
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
}

/** Un bouton de laiton avec son index, et sa valeur en chiffres D'ni dessous ; deux moitiés cliquables (− / +). */
function dial(r, ctx, key, x, y, value, max, c, t) {
  const R = 19, a = -Math.PI * 0.75 + (value / max) * Math.PI * 1.5;
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(x, y + R + 3, R * 0.9, 4, 0, 0, 6.283); ctx.fill();
  const g = ctx.createRadialGradient(x - 6, y - 7, 2, x, y, R); g.addColorStop(0, c("#f3dca0")); g.addColorStop(0.55, c("#b8913f")); g.addColorStop(1, c("#5a4322"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3a2a14"); ctx.lineWidth = 1; for (let i = 0; i < 18; i++) { const q = (i / 18) * 6.283; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (R - 3), y + Math.sin(q) * (R - 3)); ctx.lineTo(x + Math.cos(q) * R, y + Math.sin(q) * R); ctx.stroke(); } // moletage
  ctx.strokeStyle = c("#1b130d"); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (R - 5), y + Math.sin(a) * (R - 5)); ctx.stroke();
  // graduations autour
  ctx.strokeStyle = rgba(201, 162, 78, 0.6); ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) { const q = -Math.PI * 0.75 + (i / 8) * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (R + 4), y + Math.sin(q) * (R + 4)); ctx.lineTo(x + Math.cos(q) * (R + 7), y + Math.sin(q) * (R + 7)); ctx.stroke(); }
  if (r.dni && r.dni.drawNumber) r.dni.drawNumber(ctx, Math.floor(value), x - 9, y + R + 9, 14, "#e0c27a"); else { ctx.fillStyle = "#e0c27a"; ctx.font = "11px serif"; ctx.textAlign = "center"; ctx.fillText(String(Math.floor(value)), x, y + R + 20); ctx.textAlign = "left"; }
  r.hot.push({ x: x - R - 4, y: y - R - 4, w: R + 4, h: R * 2 + 8, tip: `${LABEL[key]} −`, imager: { key, delta: -1 } });
  r.hot.push({ x, y: y - R - 4, w: R + 4, h: R * 2 + 8, tip: `${LABEL[key]} +`, imager: { key, delta: 1 } });
  void t;
}

function drawImagerRoom(r, ctx, sc, sky, t) {
  const st = r.imagerState(), amb = 0.6 + 0.4 * sky.ambient, c = (h) => mix("#05060c", h, amb), now = r.imagerNow();
  const tg = st.target, s = st.settings, k = tg ? I.sharpness(s, tg, now) : 0;
  // la chambre : pierre froide, une fente haute où passe une aurore
  const wg = ctx.createLinearGradient(0, 0, 0, FLOOR); wg.addColorStop(0, c("#1c232c")); wg.addColorStop(1, c("#11161c")); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, FLOOR);
  const q = rng(0x1a6e); ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
  for (let y = 18; y < FLOOR; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); for (let x = (y / 26) % 2 ? 0 : 30; x < W; x += 60 + q() * 10) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26); ctx.stroke(); } }
  ctx.fillStyle = "#06080c"; ctx.fillRect(300, 10, 40, 6);
  const ag = ctx.createLinearGradient(300, 10, 340, 10); ag.addColorStop(0, rgba(80, 220, 160, 0.15 + 0.1 * Math.sin(t * 0.7))); ag.addColorStop(1, rgba(150, 120, 230, 0.2)); ctx.fillStyle = ag; ctx.fillRect(302, 11, 36, 4);
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#2a2f36")); fg.addColorStop(1, c("#14171c")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = c("#0d1014"); ctx.fillRect(0, FLOOR - 3, W, 4);
  // la porte (retour à l'île)
  ctx.fillStyle = c("#0b0d11"); ctx.fillRect(10, 150, 26, FLOOR - 150); ctx.strokeStyle = c("#3a4048"); ctx.strokeRect(10, 150, 26, FLOOR - 150);
  r.hot.push({ x: 8, y: 148, w: 30, h: FLOOR - 146, tip: "Door — back outside", go: "island" });

  // le bâti de la machine : une table de laiton et de bois
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(150, 228, 470, 72); ctx.fillStyle = c("#5a4322"); ctx.fillRect(146, 222, 478, 8);
  ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; ctx.strokeRect(150, 228, 470, 72);

  // le lutrin : le livre de l'Âge visé ; ‹ › pour changer de livre
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(84, 200, 8, FLOOR - 200); ctx.fillRect(66, FLOOR - 6, 44, 6);
  ctx.save(); ctx.translate(88, 196); ctx.rotate(-0.18);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(-46, -6, 92, 30);
  ctx.fillStyle = c(st.age ? "#e8dcc0" : "#6a6050"); ctx.fillRect(-43, -4, 42, 25); ctx.fillRect(1, -4, 42, 25);
  ctx.strokeStyle = c("#9a8a6a"); ctx.lineWidth = 0.6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-38, 2 + i * 5); ctx.lineTo(-6, 2 + i * 5); ctx.stroke(); }
  if (st.age && tg) { // la fenêtre de liaison du livre, en miniature
    if (st.thumb) ctx.drawImage(st.thumb, 5, -1, 34, 20);
  }
  ctx.restore();
  ctx.fillStyle = "#e0c27a"; ctx.font = "italic 12px serif"; ctx.textAlign = "center"; ctx.fillText(st.age ? st.age.name : st.empty ? "(no Age on the shelf)" : "…", 88, 238); ctx.textAlign = "left";
  for (const [dx, sym, d] of [[-56, "‹", -1], [56, "›", 1]]) { ctx.fillStyle = rgba(224, 194, 122, 0.8); ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.fillText(sym, 88 + dx, 203); ctx.textAlign = "left"; r.hot.push({ x: 88 + dx - 12, y: 182, w: 24, h: 28, tip: d < 0 ? "Previous book" : "Next book", imager: { book: d } }); }
  r.hot.push({ x: 40, y: 180, w: 96, h: 66, tip: st.age ? `${st.age.name} — on the lectern` : "Lectern", imager: { book: 1 } });

  // l'écran des ondes
  const S = SCOPE, rg = ctx.createRadialGradient(S.x - 20, S.y - 24, 4, S.x, S.y, S.r + 10); rg.addColorStop(0, c("#c9a24e")); rg.addColorStop(0.6, c("#6b5126")); rg.addColorStop(1, c("#3b2a1b"));
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(S.x, S.y, S.r + 10, 0, 6.283); ctx.fill();
  const sg = ctx.createRadialGradient(S.x, S.y, 0, S.x, S.y, S.r); sg.addColorStop(0, "#0f2a28"); sg.addColorStop(1, "#061312"); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(S.x, S.y, S.r, 0, 6.283); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(S.x, S.y, S.r - 1, 0, 6.283); ctx.clip();
  ctx.strokeStyle = "#173c38"; ctx.lineWidth = 1; for (const d of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(S.x - S.r, S.y + d * S.r); ctx.lineTo(S.x + S.r, S.y + d * S.r); ctx.stroke(); ctx.beginPath(); ctx.moveTo(S.x + d * S.r, S.y - S.r); ctx.lineTo(S.x + d * S.r, S.y + S.r); ctx.stroke(); }
  ctx.lineCap = "round";
  if (tg) { wavePath(ctx, tg, I.phaseAt(tg, now), S); ctx.strokeStyle = "rgba(127,214,200,0.75)"; ctx.lineWidth = 2.6; ctx.stroke(); }
  wavePath(ctx, s, s.phase, S); ctx.strokeStyle = "#f0b860"; ctx.lineWidth = 2; ctx.stroke();
  if (k > 0.9) { ctx.fillStyle = rgba(127, 214, 200, 0.1 + 0.05 * Math.sin(t * 3)); ctx.fillRect(S.x - S.r, S.y - S.r, S.r * 2, S.r * 2); }
  ctx.restore();
  r.hot.push({ x: S.x - S.r, y: S.y - S.r, w: S.r * 2, h: S.r * 2, tip: "The wave screen: the Age's sky (green) and your tuning (amber)" });

  // le cristal : l'Âge s'y forme à mesure que l'on s'accorde
  const C = CRYSTAL, hex = () => { ctx.beginPath(); ctx.moveTo(C.x, C.y - C.h / 2); ctx.lineTo(C.x + C.w / 2, C.y - C.h * 0.28); ctx.lineTo(C.x + C.w / 2, C.y + C.h * 0.28); ctx.lineTo(C.x, C.y + C.h / 2); ctx.lineTo(C.x - C.w / 2, C.y + C.h * 0.28); ctx.lineTo(C.x - C.w / 2, C.y - C.h * 0.28); ctx.closePath(); };
  const aura = ctx.createRadialGradient(C.x, C.y, 10, C.x, C.y, C.h * 0.8); aura.addColorStop(0, rgba(127, 214, 200, 0.06 + 0.3 * k)); aura.addColorStop(1, "rgba(127,214,200,0)"); ctx.fillStyle = aura; ctx.fillRect(C.x - C.h, C.y - C.h, C.h * 2, C.h * 2);
  ctx.save(); hex(); ctx.clip(); ctx.fillStyle = "#081012"; ctx.fillRect(C.x - C.w / 2, C.y - C.h / 2, C.w, C.h);
  const view = st.view && r.imagerView(st, t);
  if (view) {
    ctx.globalAlpha = 0.25 + 0.75 * k;
    try { ctx.filter = `blur(${((1 - k) * 7).toFixed(1)}px) saturate(${(0.2 + 0.8 * k).toFixed(2)}) hue-rotate(${((1 - k) * 60).toFixed(0)}deg)`; } catch (e) { /* filtre absent */ }
    ctx.drawImage(view, C.x - C.h * 0.83, C.y - C.h / 2, C.h * 1.66, C.h);
    try { ctx.filter = "none"; } catch (e) { /* filtre absent */ }
    ctx.globalAlpha = 1;
  }
  const nz = rng(Math.floor(t * 12)); ctx.fillStyle = rgba(170, 230, 220, 0.3 * (1 - k)); for (let i = 0; i < 90 * (1 - k); i++) ctx.fillRect(C.x - C.w / 2 + nz() * C.w, C.y - C.h / 2 + nz() * C.h, 1.4, 1.4); // neige
  ctx.strokeStyle = rgba(127, 214, 200, 0.14 * (1 - k)); for (let y = C.y - C.h / 2; y < C.y + C.h / 2; y += 4) { ctx.beginPath(); ctx.moveTo(C.x - C.w / 2, y + frac(t) * 4); ctx.lineTo(C.x + C.w / 2, y + frac(t) * 4); ctx.stroke(); }
  ctx.restore();
  hex(); ctx.strokeStyle = rgba(200, 240, 235, 0.55); ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = c("#8a6a2e"); ctx.fillRect(C.x - 24, C.y + C.h / 2 - 2, 48, 8); ctx.fillRect(C.x - 6, C.y + C.h / 2 + 6, 12, 222 - (C.y + C.h / 2 + 6));
  r.hot.push({ x: C.x - C.w / 2, y: C.y - C.h / 2, w: C.w, h: C.h, tip: k > 0.9 ? (st.age ? st.age.name : "The crystal") : "The crystal" });

  // la jauge de netteté et son voyant
  const Gg = GAUGE; ctx.fillStyle = c("#2a1d13"); ctx.beginPath(); ctx.arc(Gg.x, Gg.y, Gg.r + 6, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(Gg.x, Gg.y, Gg.r, Math.PI, 0); ctx.stroke();
  for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; ctx.beginPath(); ctx.moveTo(Gg.x + Math.cos(a) * (Gg.r - 6), Gg.y + Math.sin(a) * (Gg.r - 6)); ctx.lineTo(Gg.x + Math.cos(a) * Gg.r, Gg.y + Math.sin(a) * Gg.r); ctx.stroke(); }
  const na = Math.PI + clamp(k + 0.015 * Math.sin(t * 9) * (1 - k)) * Math.PI; ctx.strokeStyle = "#f0b860"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Gg.x, Gg.y); ctx.lineTo(Gg.x + Math.cos(na) * (Gg.r - 4), Gg.y + Math.sin(na) * (Gg.r - 4)); ctx.stroke();
  ctx.fillStyle = k > 0.9 ? "#7fd6c8" : "#4a3820"; ctx.beginPath(); ctx.arc(Gg.x, Gg.y + 16, 5, 0, 6.283); ctx.fill();
  if (k > 0.9) { const lg = ctx.createRadialGradient(Gg.x, Gg.y + 16, 0, Gg.x, Gg.y + 16, 18); lg.addColorStop(0, "rgba(127,214,200,0.5)"); lg.addColorStop(1, "rgba(127,214,200,0)"); ctx.fillStyle = lg; ctx.fillRect(Gg.x - 18, Gg.y - 2, 36, 36); }
  r.hot.push({ x: Gg.x - Gg.r, y: Gg.y - Gg.r, w: Gg.r * 2, h: Gg.r + 24, tip: "Clarity gauge" });

  // la console : levier de polarité, molettes, anneau, roue
  const lx = 206, ly = 262, up = s.pol > 0;
  ctx.fillStyle = c("#1b130d"); ctx.fillRect(lx - 14, ly - 4, 28, 30);
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(lx, ly + 18); ctx.lineTo(lx + (up ? 10 : -10), ly - 16); ctx.stroke();
  const kg = ctx.createRadialGradient(lx + (up ? 9 : -11), ly - 19, 1, lx + (up ? 10 : -10), ly - 18, 7); kg.addColorStop(0, "#f3dca0"); kg.addColorStop(1, "#6b5126"); ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(lx + (up ? 10 : -10), ly - 18, 6, 0, 6.283); ctx.fill();
  ctx.fillStyle = "#e0c27a"; ctx.font = "13px serif"; ctx.textAlign = "center"; ctx.fillText("−", lx - 18, ly + 34); ctx.fillText("+", lx + 18, ly + 34); ctx.textAlign = "left";
  r.hot.push({ x: lx - 22, y: ly - 28, w: 44, h: 66, tip: LABEL.pol, imager: { key: "pol", delta: 0 } });
  for (const [key, x] of DIALS) dial(r, ctx, key, x, 258, key === "phase" ? s.phase : s[key], key === "phase" ? I.TURN : I.MAX, c, t);

  if (r.opts.onImagerTune && !(Math.abs(t - (r.imagerTunedAt || -9)) < 1)) { r.imagerTunedAt = t; r.opts.onImagerTune(st); } // la phase dérive : le bourdon suit, une fois par seconde
  // lumière : la lueur du cristal sur la chambre, puis la pénombre
  const lg2 = ctx.createRadialGradient(C.x, C.y, 20, C.x, C.y, 360); lg2.addColorStop(0, rgba(127, 214, 200, 0.04 + 0.1 * k)); lg2.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = lg2; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 420); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

/** Peint la vue de l'Âge (fenêtre générative) dans un petit canvas, à l'heure de l'Âge : un monde figé ne bouge pas. */
function paintView(canvas, model, target, t, now) {
  const g = canvas.getContext("2d"); if (!g || !model) return null;
  const hours = target && target.hours ? target.hours : 24, day = frac(now / (hours * 3600000));
  G.paint(g, model, frac(t / 8), { day, clock: t, season: 0 });
  return canvas;
}

module.exports = { drawImagerRoom, paintView, wavePath, DIALS, SCOPE, CRYSTAL, W, H };
