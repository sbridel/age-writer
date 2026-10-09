"use strict";
// Le télescope du Relto (page « telescope ») : un instrument de laiton au sommet du mont. Étape 1 : trouver le Great Zero.
//   Sur l'île : la lunette sur son trépied, au sommet du mont (sans la page Montagnes, la page apporte son rocher) ; un clic y mène.
//   Sa vue : à gauche l'OCULAIRE (le ciel vu dans la lunette, son petit anneau de visée), à droite deux MOLETTES, Toran et
//   Élévation (la couronne avance d'un chiffre D'ni, le moyeu d'un cran), leurs valeurs en chiffres D'ni, et la PLAQUE où
//   s'inscrit le Zéro une fois trouvé. Sous l'oculaire, une ligne de mots dit ce qu'on voit (vide, faible, lointain…).
// Le signal reste dans la fiction : de loin, une lueur diffuse qui bat au rythme du prorahn (l'heure D'ni), irrégulière ;
// de près, elle se resserre en un point dans le champ, qu'on amène dans l'anneau ; au bord, elle se fixe. Pas de distance chiffrée.
// La visée et le Zéro trouvé sont gardés par Relto (`opts.telescopeGet / telescopeSet`, clé T.keyOf(nom, graine)).
// Tout est dessiné ici, en coordonnées logiques 640 × 360. Le modèle (pur) est dans src/telescope.js.
const { rng, clamp, mix, rgba, frac, lerp } = require("./util");
const T = require("./telescope");
const DT = require("./dnitime");
const { makeT } = require("./i18n");

const W = 640, H = 360, GY = 208;
const EYE = { x: 196, y: 150, r: 116 }, FIELD = 30; // l'oculaire montre ±30 crans autour de la visée
const WHEELS = { toran: { x: 438, y: 112 }, elev: { x: 560, y: 112 } }, RING = 34, HUB = 15;
const PLATE = { x: 392, y: 214, w: 214, h: 58 }, BACK = { x: 0, y: 330, w: W, h: 30 };
const PULSE_MS = DT.MS_PER_HAHR / DT.PRO_PER_HAHR; // un prorahn (≈ 1,39 s) : le pouls du Zéro bat l'heure D'ni
const EN = makeT(() => "en");
const tOf = (r) => (r.opts && typeof r.opts.t === "function" ? r.opts.t : EN);
const now = (r) => (r.nowOverride != null ? r.nowOverride : Date.now());
/** Les paliers de mots du signal (T.signal().band), du vide au bord de l'anneau. */
const bandWords = (t, b) => [t("tel.band.void"), t("tel.band.faint"), t("tel.band.far"), t("tel.band.near"), t("tel.band.close"), t("tel.band.edge")][b] || "";

// ---- état et gestes ---------------------------------------------------------------------------------
/** L'état du télescope pour la scène courante : relu (visée, trouvé) quand le Relto change de nom ou de graine. */
function state(r) {
  const sc = r.scene || {}, key = T.keyOf(sc.name, sc.seed);
  if (!r.telescope || r.telescope.key !== key) {
    const g = r.opts.telescopeGet ? r.opts.telescopeGet(key) : null, zero = T.greatZero(sc.name, sc.seed), q = rng((sc.seed ^ 0x7e1e5c0) >>> 0), stars = [];
    for (let i = 0; i < 1400; i++) stars.push({ u: q() * T.TURN, v: (q() * 2 - 1) * (T.ELEV_MAX + FIELD), m: q(), tw: q() * 6.283 });
    r.telescope = { key, zero, aim: T.normAim(g ? { toran: g.toran, elev: g.elev } : null), found: !!(g && g.found), at: g && g.at ? T.normAim(g.at) : null, stars, trend: 0, anim: null };
  }
  return r.telescope;
}

/** Un geste : `{ axis, delta }` (molette), `{ setZero: true }` (régler les molettes sur la plaque). */
function act(r, a) {
  const st = state(r), before = T.signal(st.aim, st.zero), from = st.aim, sfx = (k, s) => { if (r.opts.onTelescopeSound) r.opts.onTelescopeSound(k, s); };
  if (a.setZero) { if (!st.found) return; st.aim = T.normAim({ toran: st.zero.toran, elev: st.zero.elevation }); sfx("turn", 1); }
  else if (a.axis) { st.aim = T.turn(st.aim, a.axis, a.delta); sfx(Math.abs(a.delta) >= T.COARSE ? "turn" : "tick", before.s); }
  else return;
  const after = T.signal(st.aim, st.zero);
  st.trend = after.s > before.s + 1e-9 ? 1 : after.s < before.s - 1e-9 ? -1 : 0;
  if (!r.opts.reducedMotion) st.anim = { from, t0: r.telescopeT || 0 };
  if (a.axis) r.wheelSpin = { ...(r.wheelSpin || {}), [a.axis]: r.telescopeT || 0 };
  sfx("ping", after.s);
  if (after.found && !st.found) { st.found = true; st.at = { toran: st.aim.toran, elev: st.aim.elev }; sfx("found", 1); }
  if (r.opts.telescopeSet) r.opts.telescopeSet(st.key, T.saved(st));
}

// ---- petits dessins -----------------------------------------------------------------------------------
function plate(ctx, c, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, c("#a8843c")); g.addColorStop(0.5, c("#6b5126")); g.addColorStop(1, c("#8a6a2e"));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = c("#3b2a1b"); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = c("#3b2a1b"); for (const [px, py] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.283); ctx.fill(); }
}
/** Une valeur gravée : chiffres D'ni (deux), précédés d'une petite flèche pour le signe de l'élévation. */
function engraved(r, ctx, v, x, y, size, col, signed) {
  const d = T.digits(v);
  if (signed) { ctx.fillStyle = col; ctx.beginPath(); if (d.neg) { ctx.moveTo(x - 9, y + size * 0.35); ctx.lineTo(x - 1, y + size * 0.35); ctx.lineTo(x - 5, y + size * 0.85); } else { ctx.moveTo(x - 9, y + size * 0.75); ctx.lineTo(x - 1, y + size * 0.75); ctx.lineTo(x - 5, y + size * 0.25); } ctx.closePath(); ctx.fill(); }
  if (r.dni && r.dni.drawNumber) { const w1 = r.dni.drawNumber(ctx, d.hi, x + 2, y, size, col); r.dni.drawNumber(ctx, d.lo, x + 2 + w1 + size * 0.3, y, size, col); }
  else { ctx.fillStyle = col; ctx.font = `${size}px serif`; ctx.fillText(`${d.hi}·${d.lo}`, x + 2, y + size); }
}
/** Une molette : couronne moletée (un chiffre D'ni par cran) et moyeu (un cran fin). Moitié gauche « − », droite « + ». */
function wheel(r, ctx, c, axis, W0, value, span, tm) {
  const t = tOf(r), { x, y } = W0, a = -Math.PI / 2 + (value / span) * Math.PI * 2;
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(x, y + RING + 5, RING * 0.9, 5, 0, 0, 6.283); ctx.fill();
  const g = ctx.createRadialGradient(x - RING * 0.35, y - RING * 0.4, 3, x, y, RING); g.addColorStop(0, c("#f3dca0")); g.addColorStop(0.55, c("#b8913f")); g.addColorStop(1, c("#5a4322"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, RING, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3a2a14"); ctx.lineWidth = 1;
  for (let i = 0; i < 25; i++) { const q = a + (i / 25) * 6.283; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (RING - 6), y + Math.sin(q) * (RING - 6)); ctx.lineTo(x + Math.cos(q) * RING, y + Math.sin(q) * RING); ctx.stroke(); } // 25 crans : un chiffre D'ni chacun
  ctx.fillStyle = c("#2a1d13"); ctx.beginPath(); ctx.arc(x, y, RING - 9, 0, 6.283); ctx.fill();
  const hg = ctx.createRadialGradient(x - 4, y - 5, 1, x, y, HUB); hg.addColorStop(0, c("#f3dca0")); hg.addColorStop(1, c("#7a5c28")); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, HUB, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#1b130d"); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (HUB - 3), y + Math.sin(a) * (HUB - 3)); ctx.stroke(); // l'index du moyeu
  ctx.fillStyle = c("#e0c27a"); ctx.beginPath(); ctx.arc(x + Math.cos(a) * (RING - 3), y + Math.sin(a) * (RING - 3), 2.4, 0, 6.283); ctx.fill(); // le repère de la couronne
  if (r.wheelSpin && r.wheelSpin[axis] && tm - r.wheelSpin[axis] < 0.25) { ctx.strokeStyle = rgba(243, 220, 160, 0.5 * (1 - (tm - r.wheelSpin[axis]) / 0.25)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, RING + 3, 0, 6.283); ctx.stroke(); }
  ctx.fillStyle = c("#e9dcb8"); ctx.font = "italic 13px serif"; ctx.textAlign = "center"; ctx.fillText(axis === "toran" ? t("tel.toran") : t("tel.elev"), x, y + RING + 22); ctx.textAlign = "left";
  engraved(r, ctx, axis === "toran" ? value : value - T.ELEV_MAX, x - 14, y + RING + 30, 13, "#e0c27a", axis === "elev");
  const name = axis === "toran" ? t("tel.toran") : t("tel.elev");
  // couronne d'abord, moyeu ensuite : la dernière zone posée l'emporte (hit cherche de la fin vers le début)
  r.hot.push({ x: x - RING - 4, y: y - RING - 4, w: RING + 4, h: RING * 2 + 8, tip: `${name} — ${t("tel.ring.minus")}`, tel: { axis, delta: -T.COARSE } });
  r.hot.push({ x, y: y - RING - 4, w: RING + 4, h: RING * 2 + 8, tip: `${name} — ${t("tel.ring.plus")}`, tel: { axis, delta: T.COARSE } });
  r.hot.push({ x: x - HUB - 2, y: y - HUB - 2, w: HUB + 2, h: HUB * 2 + 4, tip: `${name} — ${t("tel.hub.minus")}`, tel: { axis, delta: -1 } });
  r.hot.push({ x, y: y - HUB - 2, w: HUB + 2, h: HUB * 2 + 4, tip: `${name} — ${t("tel.hub.plus")}`, tel: { axis, delta: 1 } });
}

/** La visée affichée : glisse de l'ancienne vers la nouvelle (au plus court sur le cercle du Toran). */
function shownAim(st, tm) {
  const a = st.anim; if (!a || tm < a.t0 || tm - a.t0 >= 0.35) return { toran: st.aim.toran, elev: st.aim.elev };
  const p = 1 - Math.pow(1 - (tm - a.t0) / 0.35, 2), g = T.gap(a.from, { toran: st.aim.toran, elevation: st.aim.elev });
  return { toran: a.from.toran + g.dt * p, elev: lerp(a.from.elev, st.aim.elev, p) };
}

/** L'oculaire : le ciel vu dans la lunette, le pouls du Zéro, l'anneau de visée. */
function eyepiece(r, ctx, c, st, sig, tm, ms) {
  const { x: cx, y: cy, r: R } = EYE, k = R / FIELD, aim = shownAim(st, tm);
  // le fût de laiton autour
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.arc(cx + 6, cy + 8, R + 22, 0, 6.283); ctx.fill();
  const fr = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); fr.addColorStop(0, c("#c9a24e")); fr.addColorStop(0.5, c("#6b5126")); fr.addColorStop(1, c("#b8913f"));
  ctx.fillStyle = fr; ctx.beginPath(); ctx.arc(cx, cy, R + 18, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3b2a1b"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R + 9, 0, 6.283); ctx.stroke();
  for (let i = 0; i < 25; i++) { const q = (i / 25) * 6.283 - Math.PI / 2 - (aim.toran / T.TURN) * 6.283; ctx.beginPath(); ctx.moveTo(cx + Math.cos(q) * (R + 11), cy + Math.sin(q) * (R + 11)); ctx.lineTo(cx + Math.cos(q) * (R + (i % 5 ? 14 : 17)), cy + Math.sin(q) * (R + (i % 5 ? 14 : 17))); ctx.stroke(); } // le cercle gradué tourne avec le Toran
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip();
  const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, R); bg.addColorStop(0, "#0b1022"); bg.addColorStop(1, "#03050c"); ctx.fillStyle = bg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  // les étoiles, à leur place dans le ciel du Relto : elles défilent quand on tourne
  for (const s of st.stars) {
    let du = s.u - aim.toran; du -= Math.round(du / T.TURN) * T.TURN;
    const dv = s.v - aim.elev; if (Math.abs(du) > FIELD + 2 || Math.abs(dv) > FIELD + 2) continue;
    const a = (0.35 + 0.65 * s.m) * (0.75 + 0.25 * Math.sin(tm * 1.7 + s.tw)), px = cx + du * k, py = cy - dv * k;
    ctx.fillStyle = rgba(225, 232, 255, a); ctx.fillRect(px, py, 0.8 + s.m * 1.6, 0.8 + s.m * 1.6);
  }
  // le pouls du Zéro : il bat au prorahn ; loin, il hésite et se dilue ; près, il se resserre et se fixe
  const s = sig.s, beat = frac((ms - DT.REF) / PULSE_MS), jit = 1 - s, n = rng(Math.floor((ms - DT.REF) / PULSE_MS) ^ 0x2e70);
  const skip = n() < jit * 0.55, amp = skip ? 0.15 : 1 - jit * 0.6 * n(), pulse = (0.35 + 0.65 * Math.exp(-beat * (2 + 5 * s)) * amp);
  let lag = st.aim.toran - aim.toran; lag -= Math.round(lag / T.TURN) * T.TURN; // la visée affichée glisse encore : au plus court sur le cercle
  const haze = clamp(1 - sig.d / (FIELD * 1.4)), dx = sig.dt + lag, dy = sig.de + (st.aim.elev - aim.elev);
  const hx = cx + dx * k * haze, hy = cy - dy * k * haze, hr = lerp(R * 1.1, 5 + 10 * (1 - s), haze);
  const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr); hg.addColorStop(0, rgba(150, 230, 215, clamp(s * 0.9 * pulse))); hg.addColorStop(0.5, rgba(127, 214, 200, clamp(s * 0.35 * pulse))); hg.addColorStop(1, "rgba(127,214,200,0)");
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  if (haze > 0.05) { ctx.fillStyle = rgba(235, 255, 250, clamp(haze * (0.4 + 0.6 * pulse))); ctx.beginPath(); ctx.arc(hx, hy, 1.2 + 1.8 * haze, 0, 6.283); ctx.fill(); } // le point, dans le champ
  ctx.restore();
  // l'anneau de visée (la tolérance) et la croisée
  ctx.strokeStyle = sig.found ? "rgba(127,214,200,0.9)" : "rgba(224,194,122,0.55)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, (T.TOL + 0.5) * k, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = "rgba(224,194,122,0.25)"; ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx - (T.TOL + 2) * k, cy); ctx.moveTo(cx + (T.TOL + 2) * k, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy - (T.TOL + 2) * k); ctx.moveTo(cx, cy + (T.TOL + 2) * k); ctx.lineTo(cx, cy + R); ctx.stroke();
  if (sig.found) { ctx.strokeStyle = rgba(127, 214, 200, 0.5 + 0.3 * Math.exp(-beat * 4)); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, (T.TOL + 0.5) * k + 4 + 6 * beat, 0, 6.283); ctx.stroke(); }
  const vg = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)"); ctx.fillStyle = vg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  const gl = ctx.createLinearGradient(cx - R, cy - R, cx, cy); gl.addColorStop(0, "rgba(255,255,255,0.08)"); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); // reflet de la lentille
  ctx.restore();
  const t = tOf(r); r.hot.push({ x: cx - R, y: cy - R, w: R * 2, h: R * 2, tip: t("tel.eyepiece") });
}

/** La vue du télescope : le sommet la nuit, l'oculaire, les deux molettes, la plaque, la ligne de mots. */
function drawTelescopeRoom(r, ctx, sc, sky, tm) {
  const t = tOf(r), st = state(r), sig = T.signal(st.aim, st.zero), ms = now(r), amb = 0.6 + 0.4 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  r.telescopeT = tm;
  // le ciel du sommet (assombri : on regarde dans une lunette) et le parapet de pierre
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mix("#04060d", sky.top, 0.35)); g.addColorStop(1, mix("#0a0c14", sky.bottom, 0.3)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const q = rng(((sc.seed || 0) ^ 0x51a7) >>> 0); for (let i = 0; i < 70; i++) { const x = q() * W, y = q() * 220, a = (0.2 + 0.5 * q()) * (0.6 + 0.4 * (sky.night == null ? 1 : sky.night)); ctx.fillStyle = rgba(230, 236, 255, a); ctx.fillRect(x, y, 1, 1); }
  const pg = ctx.createLinearGradient(0, 286, 0, H); pg.addColorStop(0, c("#3a3530")); pg.addColorStop(1, c("#1a1714")); ctx.fillStyle = pg; ctx.fillRect(0, 286, W, H - 286);
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; for (let x = 0; x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x + (x / 46 % 2) * 20, 286); ctx.lineTo(x + (x / 46 % 2) * 20, H); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, 312); ctx.lineTo(W, 312); ctx.stroke();
  // le corps de l'instrument : un panneau de laiton sombre derrière les molettes
  ctx.fillStyle = c("#1b130d"); ctx.fillRect(374, 34, 250, 252); ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1.2; ctx.strokeRect(374.5, 34.5, 249, 251);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(330, 140, 46, 20); // le bras qui relie l'oculaire au panneau
  eyepiece(r, ctx, c, st, sig, tm, ms);
  wheel(r, ctx, c, "toran", WHEELS.toran, st.aim.toran, T.TURN, tm);
  wheel(r, ctx, c, "elev", WHEELS.elev, st.aim.elev + T.ELEV_MAX, 2 * T.ELEV_MAX + 1, tm);
  // la plaque : vierge tant que le Zéro n'est pas trouvé ; ensuite ses coordonnées gravées en chiffres D'ni
  plate(ctx, c, PLATE.x, PLATE.y, PLATE.w, PLATE.h);
  ctx.fillStyle = c("#2a1d13"); ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillText(t("tel.plate.title"), PLATE.x + PLATE.w / 2, PLATE.y + 15); ctx.textAlign = "left";
  if (st.found) {
    const ink = c("#1b130d");
    engraved(r, ctx, st.zero.toran, PLATE.x + 34, PLATE.y + 24, 18, ink, false);
    engraved(r, ctx, st.zero.elevation, PLATE.x + 134, PLATE.y + 24, 18, ink, true);
    r.hot.push({ ...PLATE, tip: t("tel.plate.found"), tel: { setZero: true } });
  } else {
    ctx.strokeStyle = rgba(43, 29, 19, 0.35); ctx.lineWidth = 1; for (const x0 of [PLATE.x + 34, PLATE.x + 134]) { ctx.beginPath(); ctx.moveTo(x0, PLATE.y + 44); ctx.lineTo(x0 + 44, PLATE.y + 44); ctx.stroke(); }
    r.hot.push({ ...PLATE, tip: t("tel.plate.blank") });
  }
  // la ligne de mots, sous l'oculaire
  const line = st.found && sig.found ? t("tel.found") : bandWords(t, sig.band) + (st.trend > 0 ? " " + t("tel.warmer") : st.trend < 0 ? " " + t("tel.colder") : "");
  ctx.font = "italic 14px serif"; ctx.textAlign = "center"; ctx.fillStyle = sig.found ? "#9fe6da" : "#e9dcb8"; ctx.fillText(line, W / 2, 306); ctx.textAlign = "left";
  if (st.found && !sig.found) { ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(233,220,184,0.75)"; ctx.fillText(t("tel.charted"), W / 2, 323); ctx.textAlign = "left"; }
  // redescendre
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
  ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.fillText("︾", W / 2, BACK.y + 20); ctx.textAlign = "left";
  r.hot.push({ ...BACK, tip: t("tel.back"), go: "island" });
}

/**
 * Sur l'île : la lunette sur son trépied, au sommet du mont (`lay.mount`). Un clic mène à sa vue. Une fois le Zéro trouvé,
 * une petite lueur bat au bout de la lunette, au rythme du prorahn.
 */
function drawOnIsland(r, ctx, sky, tm) {
  const { x: mx, h } = r.lay.mount, amb = 0.4 + 0.6 * sky.ambient, c = (col) => mix("#05060c", col, amb), bx = mx - 6, by = GY - h * 0.985;
  ctx.strokeStyle = c("#2a1d13"); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(bx, by - 7); ctx.lineTo(bx - 5, by + 1); ctx.moveTo(bx, by - 7); ctx.lineTo(bx + 5, by + 1); ctx.moveTo(bx, by - 7); ctx.lineTo(bx + 1, by + 1); ctx.stroke(); // le trépied
  ctx.save(); ctx.translate(bx, by - 8); ctx.rotate(-0.55);
  const g = ctx.createLinearGradient(0, -2.5, 0, 2.5); g.addColorStop(0, c("#e8c97a")); g.addColorStop(1, c("#7a5c28")); ctx.fillStyle = g;
  ctx.fillRect(-7, -1.8, 18, 3.6); ctx.fillRect(10, -2.4, 4, 4.8); ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(-9, -1.2, 2.4, 2.4); // tube, pare-soleil, oculaire
  const found = state(r).found;
  if (found) { const beat = frac((now(r) - DT.REF) / PULSE_MS), a = 0.35 + 0.5 * Math.exp(-beat * 4) * (0.5 + 0.5 * (sky.night == null ? 0.5 : sky.night)); const gl = ctx.createRadialGradient(14, 0, 0, 14, 0, 7); gl.addColorStop(0, rgba(160, 235, 220, a)); gl.addColorStop(1, "rgba(160,235,220,0)"); ctx.fillStyle = gl; ctx.fillRect(7, -7, 14, 14); }
  ctx.restore();
  const t = tOf(r); r.hot.push({ x: bx - 10, y: by - 20, w: 26, h: 24, tip: found ? t("tel.island.found") : t("tel.island"), go: "telescope" });
  void tm;
}

module.exports = { drawTelescopeRoom, drawOnIsland, state, act, EYE, WHEELS, PLATE, FIELD, PULSE_MS };
