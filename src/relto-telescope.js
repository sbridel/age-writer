"use strict";
// Le télescope du Relto (page « telescope ») : un instrument de laiton au sommet du mont. Étape 1 : trouver le Great Zero.
//   Sur l'île : la lunette sur son trépied, au sommet du mont (sans la page Montagnes, la page apporte son rocher) ; un clic y mène.
//   Sa vue : à gauche l'OCULAIRE (le ciel vu dans la lunette, son petit anneau de visée), à droite deux MOLETTES, Torahn et
//   Élévation (la couronne avance de 25 crans, le moyeu d'un cran : 100 torantee ou 1 shahfee), leurs valeurs en chiffres
//   D'ni, et la PLAQUE où s'inscrit le Zéro une fois trouvé. Sous l'oculaire, une ligne de mots dit ce qu'on voit.
// Comme au KI, l'élévation s'affiche négative au-dessus du plan du Zéro (T.kiElev) ; une infobulle le rappelle.
// Le signal reste dans la fiction : de loin, une lueur diffuse qui bat au rythme du prorahn (l'heure D'ni), irrégulière ;
// de près, elle se resserre en un point dans le champ, qu'on amène dans l'anneau ; au bord, elle se fixe. Pas de distance chiffrée.
// La visée et le Zéro trouvé sont gardés par Relto (`opts.telescopeGet / telescopeSet`, clé T.keyOf(nom, graine)).
// Étape 2 : un LUTRIN au pied de l'instrument reçoit le livre d'un Âge (‹ › pour choisir). Le Zéro trouvé, les molettes
// visent alors où le Zéro apparaît VU DE CET ÂGE (les indices de l'arpenteur), et une troisième molette, le RETARD du pouls,
// accorde l'écho de l'Âge sur le battement du Relto. Dans la tolérance, le système d'étoile de l'Âge est situé : la plaque
// grave sa position GZCS (l'instrument fait lui-même la différence Relto → Zéro moins Âge → Zéro). Modèle : src/starsystem.js.
// Tout est dessiné ici, en coordonnées logiques 640 × 360. Le modèle (pur) est dans src/telescope.js.
const { rng, fnv, clamp, mix, rgba, frac, lerp } = require("./util");
const T = require("./telescope");
const SS = require("./starsystem");
const DT = require("./dnitime");
const { makeT } = require("./i18n");

const W = 640, H = 360, GY = 208;
const EYE = { x: 196, y: 150, r: 116 }, FIELD = 30; // l'oculaire montre ±30 crans fins autour de la visée
const NT = T.TURN / T.NOTCH; // crans fins par tour (625)
const WHEELS = { torahn: { x: 438, y: 112 }, elev: { x: 560, y: 112 } }, RING0 = 34, HUB0 = 15;
const PLATE = { x: 392, y: 214, w: 214, h: 58 }, BACK = { x: 0, y: 330, w: W, h: 30 };
const SPLATE = { x: 452, y: 210, w: 158, h: 62 }, DELAY = { x: 414, y: 236 }, DRING = 22, DHUB = 9; // étape 2 : la plaque du système et la molette du retard
const LECTERN = { x: 54, y: 302 }, TEXT_X = 372; // le lutrin, sur le sol à gauche ; la ligne de mots se décale à droite quand il est là
const PULSE_MS = DT.MS_PER_HAHR / DT.PRO_PER_HAHR; // un prorahn (≈ 1,39 s) : le pouls du Zéro bat l'heure D'ni
const EN = makeT(() => "en");
const tOf = (r) => (r.opts && typeof r.opts.t === "function" ? r.opts.t : EN);
const now = (r) => (r.nowOverride != null ? r.nowOverride : Date.now());
/** Le numéro du prorahn en cours : la scintillation du signal change à chaque battement. */
const beatOf = (r) => Math.floor((now(r) - DT.REF) / PULSE_MS);
const fnvKey = (k) => fnv(String(k)) >>> 0;
/** L'écho de l'Âge face au battement du Relto (étape 2) : ensemble, presque, en retard, en avance. */
const echoWords = (t, dd) => ({ one: t("sys.echo.one"), near: t("sys.echo.near"), late: t("sys.echo.late"), early: t("sys.echo.early") })[SS.echoWord(dd)];
/** Les paliers de mots du signal (T.signal().band), du vide au bord de l'anneau. */
const bandWords = (t, b) => [t("tel.band.void"), t("tel.band.faint"), t("tel.band.far"), t("tel.band.near"), t("tel.band.close"), t("tel.band.edge")][b] || "";
const axisName = (t, axis) => (axis === "torahn" ? t("tel.torahn") : axis === "delay" ? t("sys.delay.name") : t("tel.elev"));

// ---- état et gestes ---------------------------------------------------------------------------------
/** L'état du télescope pour la scène courante : relu (visée, trouvé) quand le Relto change de nom ou de graine. */
function state(r) {
  const sc = r.scene || {}, key = T.keyOf(sc.name, sc.seed), gen = r.opts.telescopeGen ? r.opts.telescopeGen() : 0; // gen : change quand le Zéro est oublié (commande)
  if (!r.telescope || r.telescope.key !== key || r.telescope.gen !== gen) {
    const g = r.opts.telescopeGet ? r.opts.telescopeGet(key) : null, zero = T.greatZero(sc.name, sc.seed), q = rng((sc.seed ^ 0x7e1e5c0) >>> 0), stars = [];
    for (let i = 0; i < 1400; i++) stars.push({ u: q() * NT, v: (q() * 2 - 1) * (T.ELEV_MAX + FIELD), m: q(), tw: q() * 6.283 }); // u en crans fins, v en shahfeetee
    r.telescope = { key, gen, zero, aim: T.normAim(g), found: !!(g && g.found), at: g && g.at ? T.normAim(g.at) : null, stars, anim: null,
      dial: SS.normDial(g && g.dial), systems: g && g.systems && typeof g.systems === "object" ? { ...g.systems } : {}, book: null };
  }
  return r.telescope;
}

/** Les systèmes situés du Relto courant (pour l'Imageur) : l'état ouvert s'il existe, sinon l'état gardé. */
function systemsOf(r) {
  const sc = r.scene || {}, key = T.keyOf(sc.name, sc.seed);
  if (r.telescope && r.telescope.key === key) return { found: r.telescope.found, systems: r.telescope.systems };
  const g = r.opts && r.opts.telescopeGet ? r.opts.telescopeGet(key) : null;
  return { found: !!(g && g.found), systems: (g && g.systems) || {} };
}

/** Le livre posé sur le lutrin : `idx` −1 = lutrin vide (on cherche le Zéro du Relto), sinon un Âge de l'étagère. */
function bookLoad(r, i) {
  const st = state(r), ages = (r.scene && r.scene.ages) || [], n = ages.length + 1;
  const idx = ((((i + 1) % n) + n) % n) - 1;
  if (idx < 0) { st.book = null; return; }
  const age = ages[idx], book = (st.book = { idx, age, data: null, loading: true });
  if (!r.opts.onImagerAge) { book.loading = false; return; }
  Promise.resolve(r.opts.onImagerAge(age)).then((d) => { if (st.book !== book) return; book.loading = false; book.data = d || null; if (!r.running) r.draw(0); }, () => { book.loading = false; });
}
/** Le système de l'Âge sur le lutrin (ou null), et si l'on mesure (le Zéro du Relto est trouvé). */
function bookSystem(st) { const sys = st.book && st.book.data && st.book.data.system; return sys && sys.clue ? sys : null; }
function measuring(st) { return !!(st.found && bookSystem(st)); }

/** Un geste : `{ axis, delta }` (molette ; delta en torantee ou shahfeetee), `{ setZero: true }` (régler les molettes sur la plaque). */
function act(r, a) {
  const st = state(r), sfx = (k, s) => { if (r.opts.onTelescopeSound) r.opts.onTelescopeSound(k, s); };
  if (a.book) { bookLoad(r, (st.book ? st.book.idx : -1) + a.book); sfx("turn", 0.5); return; }
  if (measuring(st)) return actSystem(r, st, a, sfx);
  const before = T.signal(st.aim, st.zero), from = st.aim;
  const axis = a.axis ? T.axisOf(a.axis) : null;
  if (a.setZero) { if (!st.found) return; st.aim = T.normAim({ torahn: st.zero.torahn, elev: st.zero.elevation }); sfx("turn", 1); }
  else if (axis) { st.aim = T.turn(st.aim, axis, a.delta); sfx(Math.abs(a.delta) >= T.STEP[axis].rim ? "turn" : "tick", before.s); }
  else return;
  const after = T.signal(st.aim, st.zero);
  if (!r.opts.reducedMotion) st.anim = { from, t0: r.telescopeT || 0 };
  if (axis) r.wheelSpin = { ...(r.wheelSpin || {}), [axis]: r.telescopeT || 0 };
  sfx("ping", T.observe(after, beatOf(r), fnvKey(st.key)).s); // le pouls entendu scintille, comme celui qu'on voit
  if (after.found && !st.found) { st.found = true; st.at = { torahn: st.aim.torahn, elev: st.aim.elev }; sfx("found", 1); }
  if (r.opts.telescopeSet) r.opts.telescopeSet(st.key, T.saved(st));
}

/** Étape 2 : un geste quand un livre est sur le lutrin et le Zéro trouvé (les molettes portent le réglage `dial`). */
function actSystem(r, st, a, sfx) {
  const sys = bookSystem(st), clue = sys.clue, before = SS.measure(st.dial, clue), from = st.dial;
  const axis = a.axis === "delay" ? "delay" : a.axis ? T.axisOf(a.axis) : null;
  if (a.setSystem) { if (!st.systems[sys.key]) return; st.dial = SS.normDial({ torahn: clue.torahn, elev: clue.elevation, delay: clue.delay }); sfx("turn", 1); }
  else if (a.setZero) return;
  else if (axis) { st.dial = SS.turnDial(st.dial, axis, a.delta); const S = axis === "delay" ? SS.STEP_DELAY : T.STEP[axis]; sfx(Math.abs(a.delta) >= S.rim ? "turn" : "tick", before.s); }
  else return;
  const after = SS.measure(st.dial, clue);
  if (!r.opts.reducedMotion) st.anim = { from, t0: r.telescopeT || 0 };
  if (axis) r.wheelSpin = { ...(r.wheelSpin || {}), [axis]: r.telescopeT || 0 };
  sfx("ping", T.observe(after, beatOf(r), fnvKey(st.key + sys.key)).s);
  if (after.located && !st.systems[sys.key]) { st.systems = { ...st.systems, [sys.key]: SS.record(sys, st.zero, st.dial, now(r)) }; sfx("found", 1); }
  if (r.opts.telescopeSet) r.opts.telescopeSet(st.key, T.saved(st));
}

// ---- petits dessins -----------------------------------------------------------------------------------
function plate(ctx, c, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, c("#a8843c")); g.addColorStop(0.5, c("#6b5126")); g.addColorStop(1, c("#8a6a2e"));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = c("#3b2a1b"); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = c("#3b2a1b"); for (const [px, py] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.283); ctx.fill(); }
}
/** Une valeur gravée en chiffres D'ni (base 25), centrée en `cx` ; négative : un trait devant, comme au KI. */
function engraved(r, ctx, v, cx, y, size, col) {
  const n = Math.round(Math.abs(v)), neg = Math.round(v) < 0, dash = neg ? size * 0.55 : 0;
  const w = (r.dni && r.dni.widthOf ? r.dni.widthOf(n, size) : String(n).length * size * 0.6) + dash, x = cx - w / 2;
  if (neg) { ctx.fillStyle = col; ctx.fillRect(x, y + size * 0.47, size * 0.4, Math.max(1.2, size * 0.09)); }
  if (r.dni && r.dni.drawNumber) r.dni.drawNumber(ctx, n, x + dash, y, size, col);
  else { ctx.fillStyle = col; ctx.font = `${size}px serif`; ctx.fillText(String(n), x + dash, y + size); }
}
/** Une molette : couronne moletée (25 crans) et moyeu (un cran fin). Moitié gauche « − », droite « + ». */
function wheel(r, ctx, c, axis, W0, value, span, shown, tm, o = {}) {
  const t = tOf(r), { x, y } = W0, a = -Math.PI / 2 + (value / span) * Math.PI * 2, name = axisName(t, axis), S = o.step || T.STEP[axis], RING = o.ring || RING0, HUB = o.hub || HUB0;
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(x, y + RING + 5, RING * 0.9, 5, 0, 0, 6.283); ctx.fill();
  const g = ctx.createRadialGradient(x - RING * 0.35, y - RING * 0.4, 3, x, y, RING); g.addColorStop(0, c("#f3dca0")); g.addColorStop(0.55, c("#b8913f")); g.addColorStop(1, c("#5a4322"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, RING, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3a2a14"); ctx.lineWidth = 1;
  for (let i = 0; i < 25; i++) { const q = a + (i / 25) * 6.283; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (RING - 6), y + Math.sin(q) * (RING - 6)); ctx.lineTo(x + Math.cos(q) * RING, y + Math.sin(q) * RING); ctx.stroke(); } // 25 crans
  ctx.fillStyle = c("#2a1d13"); ctx.beginPath(); ctx.arc(x, y, RING - 9, 0, 6.283); ctx.fill();
  const hg = ctx.createRadialGradient(x - 4, y - 5, 1, x, y, HUB); hg.addColorStop(0, c("#f3dca0")); hg.addColorStop(1, c("#7a5c28")); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, HUB, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#1b130d"); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (HUB - 3), y + Math.sin(a) * (HUB - 3)); ctx.stroke(); // l'index du moyeu
  ctx.fillStyle = c("#e0c27a"); ctx.beginPath(); ctx.arc(x + Math.cos(a) * (RING - 3), y + Math.sin(a) * (RING - 3), 2.4, 0, 6.283); ctx.fill(); // le repère de la couronne
  if (r.wheelSpin && r.wheelSpin[axis] && tm - r.wheelSpin[axis] < 0.25) { ctx.strokeStyle = rgba(243, 220, 160, 0.5 * (1 - (tm - r.wheelSpin[axis]) / 0.25)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, RING + 3, 0, 6.283); ctx.stroke(); }
  const small = RING < RING0, unit = axis === "torahn" ? t("tel.unit.torahn") : axis === "delay" ? t("sys.unit.delay") : t("tel.unit.elev");
  ctx.fillStyle = c("#e9dcb8"); ctx.font = small ? "italic 11px serif" : "italic 13px serif"; ctx.textAlign = "center"; ctx.fillText(name, x, y + RING + (small ? 14 : 22)); ctx.textAlign = "left";
  engraved(r, ctx, shown, x, y + RING + (small ? 18 : 30), small ? 9 : 12, "#e0c27a");
  r.hot.push({ x: x - RING, y: y + RING + 4, w: RING * 2, h: small ? 26 : 40, tip: unit }); // le nom et la valeur : l'unité (et le sens du KI)
  // couronne d'abord, moyeu ensuite : la dernière zone posée l'emporte (hit cherche de la fin vers le début)
  r.hot.push({ x: x - RING - 4, y: y - RING - 4, w: RING + 4, h: RING * 2 + 8, tip: `${name} — ${t("tel.ring.minus")}`, tel: { axis, delta: -S.rim } });
  r.hot.push({ x, y: y - RING - 4, w: RING + 4, h: RING * 2 + 8, tip: `${name} — ${t("tel.ring.plus")}`, tel: { axis, delta: S.rim } });
  r.hot.push({ x: x - HUB - 2, y: y - HUB - 2, w: HUB + 2, h: HUB * 2 + 4, tip: `${name} — ${t("tel.hub.minus")}`, tel: { axis, delta: -S.hub } });
  r.hot.push({ x, y: y - HUB - 2, w: HUB + 2, h: HUB * 2 + 4, tip: `${name} — ${t("tel.hub.plus")}`, tel: { axis, delta: S.hub } });
}

/** La visée affichée, en crans fins (u) et shahfeetee (v) : glisse de l'ancienne vers la nouvelle (au plus court sur le cercle). */
function shownAim(st, tm) { // st : { aim, anim } (la visée du Zéro, ou le réglage d'un Âge)
  const cur = { u: st.aim.torahn / T.NOTCH, v: st.aim.elev }, a = st.anim; if (!a || tm < a.t0 || tm - a.t0 >= 0.35) return cur;
  const p = 1 - Math.pow(1 - (tm - a.t0) / 0.35, 2), g = T.gap(a.from, { torahn: st.aim.torahn, elevation: st.aim.elev });
  return { u: (a.from.torahn + g.dt * p) / T.NOTCH, v: lerp(a.from.elev, st.aim.elev, p) };
}

/** L'oculaire : le ciel vu dans la lunette, le pouls du Zéro, l'anneau de visée. Coordonnées en crans fins. */
function eyepiece(r, ctx, c, st, sig, tm, ms, echo = null) {
  const { x: cx, y: cy, r: R } = EYE, k = R / FIELD, aim = shownAim(st, tm), tol = T.TOL.torahn / T.NOTCH;
  // le fût de laiton autour
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.arc(cx + 6, cy + 8, R + 22, 0, 6.283); ctx.fill();
  const fr = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); fr.addColorStop(0, c("#c9a24e")); fr.addColorStop(0.5, c("#6b5126")); fr.addColorStop(1, c("#b8913f"));
  ctx.fillStyle = fr; ctx.beginPath(); ctx.arc(cx, cy, R + 18, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3b2a1b"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R + 9, 0, 6.283); ctx.stroke();
  for (let i = 0; i < 25; i++) { const q = (i / 25) * 6.283 - Math.PI / 2 - (aim.u / NT) * 6.283; ctx.beginPath(); ctx.moveTo(cx + Math.cos(q) * (R + 11), cy + Math.sin(q) * (R + 11)); ctx.lineTo(cx + Math.cos(q) * (R + (i % 5 ? 14 : 17)), cy + Math.sin(q) * (R + (i % 5 ? 14 : 17))); ctx.stroke(); } // le cercle gradué tourne avec le Torahn
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip();
  const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, R); bg.addColorStop(0, "#0b1022"); bg.addColorStop(1, "#03050c"); ctx.fillStyle = bg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  // les étoiles, à leur place dans le ciel du Relto : elles défilent quand on tourne (sens horaire : le ciel glisse vers la gauche)
  for (const s of st.stars) {
    let du = s.u - aim.u; du -= Math.round(du / NT) * NT;
    const dv = s.v - aim.v; if (Math.abs(du) > FIELD + 2 || Math.abs(dv) > FIELD + 2) continue;
    const a = (0.35 + 0.65 * s.m) * (0.75 + 0.25 * Math.sin(tm * 1.7 + s.tw)), px = cx + du * k, py = cy - dv * k;
    ctx.fillStyle = rgba(225, 232, 255, a); ctx.fillRect(px, py, 0.8 + s.m * 1.6, 0.8 + s.m * 1.6);
  }
  // le pouls du Zéro : il bat au prorahn ; loin, il hésite et se dilue ; près, il se resserre et se fixe
  const s = sig.s, beat = frac((ms - DT.REF) / PULSE_MS), { amp } = T.pulseOf(s, Math.floor((ms - DT.REF) / PULSE_MS)), pulse = (0.35 + 0.65 * Math.exp(-beat * (2 + 5 * s)) * amp);
  let lag = st.aim.torahn / T.NOTCH - aim.u; lag -= Math.round(lag / NT) * NT; // la visée affichée glisse encore : au plus court sur le cercle
  const haze = clamp(1 - sig.d / (FIELD * 1.4)), dx = sig.dt / T.NOTCH + lag, dy = sig.de + (st.aim.elev - aim.v);
  const hx = cx + dx * k * haze, hy = cy - dy * k * haze, hr = lerp(R * 1.1, 5 + 10 * (1 - s), haze);
  const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr); hg.addColorStop(0, rgba(150, 230, 215, clamp(s * 0.9 * pulse))); hg.addColorStop(0.5, rgba(127, 214, 200, clamp(s * 0.35 * pulse))); hg.addColorStop(1, "rgba(127,214,200,0)");
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  if (haze > 0.05) { ctx.fillStyle = rgba(235, 255, 250, clamp(haze * (0.4 + 0.6 * pulse))); ctx.beginPath(); ctx.arc(hx, hy, 1.2 + 1.8 * haze, 0, 6.283); ctx.fill(); } // le point, dans le champ
  ctx.restore();
  // l'anneau de visée (la tolérance) et la croisée
  ctx.strokeStyle = sig.found ? "rgba(127,214,200,0.9)" : "rgba(224,194,122,0.55)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, (tol + 0.5) * k, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = "rgba(224,194,122,0.25)"; ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx - (tol + 2) * k, cy); ctx.moveTo(cx + (tol + 2) * k, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy - (tol + 2) * k); ctx.moveTo(cx, cy + (tol + 2) * k); ctx.lineTo(cx, cy + R); ctx.stroke();
  if (sig.found) { ctx.strokeStyle = rgba(127, 214, 200, 0.5 + 0.3 * Math.exp(-beat * 4)); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, (tol + 0.5) * k + 4 + 6 * beat, 0, 6.283); ctx.stroke(); }
  if (echo && haze > 0.05) { // l'écho de l'Âge : un cercle d'ambre qui bat avec son retard ; accordé, il bat avec le pouls
    const eb = frac(beat - echo.off), ea = clamp(haze) * (0.25 + 0.6 * Math.exp(-eb * 5)) * (echo.ok ? 0.4 : 1);
    ctx.strokeStyle = rgba(240, 184, 96, ea); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hx, hy, 4 + 14 * eb, 0, 6.283); ctx.stroke();
  }
  const vg = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)"); ctx.fillStyle = vg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  const gl = ctx.createLinearGradient(cx - R, cy - R, cx, cy); gl.addColorStop(0, "rgba(255,255,255,0.08)"); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); // reflet de la lentille
  ctx.restore();
  const t = tOf(r); r.hot.push({ x: cx - R, y: cy - R, w: R * 2, h: R * 2, tip: echo ? t("sys.eyepiece") : t("tel.eyepiece") });
}

/** Le lutrin : le livre de l'Âge dont on reporte les indices (‹ › pour choisir ; vide : on cherche le Zéro du Relto). */
function lectern(r, ctx, c, st) {
  const t = tOf(r), { x, y } = LECTERN, book = st.book, ages = (r.scene && r.scene.ages) || [];
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(x - 3, y - 36, 6, 36); ctx.fillRect(x - 18, y - 3, 36, 4);
  ctx.save(); ctx.translate(x, y - 40); ctx.rotate(-0.18);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(-38, -12, 76, 22);
  if (book) {
    ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(-35, -10, 34, 18); ctx.fillRect(1, -10, 34, 18);
    ctx.strokeStyle = c("#9a8a6a"); ctx.lineWidth = 0.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-31, -5 + i * 5); ctx.lineTo(-5, -5 + i * 5); ctx.moveTo(5, -5 + i * 5); ctx.lineTo(31, -5 + i * 5); ctx.stroke(); }
    const sys = bookSystem(st); if (sys && st.systems[sys.key]) { ctx.fillStyle = "#7fd6c8"; ctx.beginPath(); ctx.arc(29, 4, 2.4, 0, 6.283); ctx.fill(); } // la marque d'un système situé
  } else { ctx.fillStyle = c("#4a3a2a"); ctx.fillRect(-35, -10, 70, 18); }
  ctx.restore();
  ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillStyle = "#e0c27a";
  ctx.fillText(book ? book.age.name : ages.length ? t("sys.lectern.empty") : t("sys.lectern.none"), x + 6, y + 16, 104); ctx.textAlign = "left";
  if (ages.length) for (const [dx, sym, d] of [[-46, "‹", -1], [46, "›", 1]]) { ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.fillText(sym, x + dx, y - 34); ctx.textAlign = "left"; r.hot.push({ x: x + dx - 11, y: y - 52, w: 22, h: 26, tip: d < 0 ? t("sys.lectern.prev") : t("sys.lectern.next"), tel: { book: d } }); }
  r.hot.push({ x: x - 34, y: y - 58, w: 68, h: 58, tip: book ? `${book.age.name} — ${st.found ? t("sys.lectern.book") : t("sys.lectern.nozero")}` : t("sys.lectern.tip"), tel: ages.length ? { book: 1 } : undefined });
}

/** La vue du télescope : le sommet la nuit, l'oculaire, les deux molettes, la plaque, la ligne de mots. */
function drawTelescopeRoom(r, ctx, sc, sky, tm) {
  const t = tOf(r), st = state(r), ms = now(r), amb = 0.6 + 0.4 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  const sys0 = bookSystem(st), sig = st.found && sys0 ? T.observe(SS.measure(st.dial, sys0.clue), beatOf(r), fnvKey(st.key + sys0.key)) : T.observe(T.signal(st.aim, st.zero), beatOf(r), fnvKey(st.key));
  r.telescopeT = tm;
  // le pouls à l'oreille : une note douce à chaque prorahn, tant qu'on regarde dans l'oculaire (même scintillation, mêmes battements manqués que la lueur)
  { const b = beatOf(r); if (r.telescopePulse != null && b !== r.telescopePulse && r.opts.onTelescopeSound) { const p = T.pulseOf(sig.s, b); if (!p.skip) r.opts.onTelescopeSound("pulse", sig.s * p.amp); } r.telescopePulse = b; }
  // l'intérieur de l'observatoire : la coupole sombre et ses nervures, la fente ouverte sur le ciel, le grand tube, le sol de pierre
  const dg = ctx.createRadialGradient(W / 2, 300, 40, W / 2, 300, 520); dg.addColorStop(0, c("#2b2621")); dg.addColorStop(1, c("#0d0b0a")); ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
  const SL = { x: 318, w: 52 }; // la fente de la coupole, entre l'oculaire et le panneau
  ctx.save(); ctx.beginPath(); ctx.rect(SL.x, 0, SL.w, 286); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, 286); g.addColorStop(0, mix("#04060d", sky.top, 0.35)); g.addColorStop(1, mix("#0a0c14", sky.bottom, 0.3)); ctx.fillStyle = g; ctx.fillRect(SL.x, 0, SL.w, 286);
  const q = rng(((sc.seed || 0) ^ 0x51a7) >>> 0); for (let i = 0; i < 70; i++) { const x = SL.x + q() * SL.w, y = q() * 260, a = (0.2 + 0.5 * q()) * (0.6 + 0.4 * (sky.night == null ? 1 : sky.night)); ctx.fillStyle = rgba(230, 236, 255, a); ctx.fillRect(x, y, 1, 1); }
  ctx.restore();
  ctx.strokeStyle = c("#4a3a26"); ctx.lineWidth = 3; ctx.strokeRect(SL.x - 1.5, -2, SL.w + 3, 289); // les bords de la fente (les volets ouverts)
  ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1.4; // les nervures de la coupole
  for (let k = 1; k <= 4; k++) { const y0 = 286 - k * 62; ctx.beginPath(); ctx.moveTo(0, y0 + 30); ctx.quadraticCurveTo(SL.x / 2, y0 - 4, SL.x - 2, y0); ctx.moveTo(SL.x + SL.w + 2, y0); ctx.quadraticCurveTo((SL.x + SL.w + W) / 2, y0 - 4, W, y0 + 30); ctx.stroke(); }
  for (const x of [24, 150, 250, 420, 520, 620]) { ctx.beginPath(); const L = x < SL.x; ctx.moveTo(x, 286); ctx.quadraticCurveTo(x + (L ? 40 : -40), 110, L ? SL.x - 4 : SL.x + SL.w + 4, 0); ctx.stroke(); }
  const pg = ctx.createLinearGradient(0, 286, 0, H); pg.addColorStop(0, c("#3a3530")); pg.addColorStop(1, c("#1a1714")); ctx.fillStyle = pg; ctx.fillRect(0, 286, W, H - 286);
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; for (let x = 0; x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x + (x / 46 % 2) * 20, 286); ctx.lineTo(x + (x / 46 % 2) * 20, H); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, 312); ctx.lineTo(W, 312); ctx.stroke();
  // le corps de l'instrument : un panneau de laiton sombre derrière les molettes
  ctx.fillStyle = c("#1b130d"); ctx.fillRect(374, 34, 250, 252); ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1.2; ctx.strokeRect(374.5, 34.5, 249, 251);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(330, 140, 46, 20); // le bras qui relie l'oculaire au panneau
  const sys = bookSystem(st), meas = !!(st.found && sys);
  if (meas) { // étape 2 : les molettes portent les indices de l'Âge ; l'oculaire montre son écho
    const m = SS.measure(st.dial, sys.clue), seen = T.observe(m, beatOf(r), fnvKey(st.key + sys.key)), view = { aim: st.dial, anim: st.anim, stars: st.stars };
    eyepiece(r, ctx, c, view, seen, tm, ms, { off: SS.echoOffset(m.dd), ok: m.delayOk });
    wheel(r, ctx, c, "torahn", WHEELS.torahn, st.dial.torahn, T.TURN, st.dial.torahn, tm);
    wheel(r, ctx, c, "elev", WHEELS.elev, st.dial.elev + T.ELEV_MAX, 2 * T.ELEV_MAX + 1, T.kiElev(st.dial.elev), tm);
    wheel(r, ctx, c, "delay", DELAY, st.dial.delay, SS.DELAY_MAX + 1, st.dial.delay, tm, { step: SS.STEP_DELAY, ring: DRING, hub: DHUB });
    systemPlate(r, ctx, c, st, sys);
    const done = !!st.systems[sys.key], line = m.located ? t("sys.located") : bandWords(t, seen.band);
    ctx.font = "italic 14px serif"; ctx.textAlign = "center"; ctx.fillStyle = m.located ? "#9fe6da" : "#e9dcb8"; ctx.fillText(line, TEXT_X, 306, 500); ctx.textAlign = "left";
    const sub = m.located ? "" : seen.band >= 2 ? echoWords(t, m.dd) : done ? t("sys.charted") : "";
    if (sub) { ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(233,220,184,0.8)"; ctx.fillText(sub, TEXT_X, 323, 500); ctx.textAlign = "left"; }
  } else {
    eyepiece(r, ctx, c, st, sig, tm, ms);
    wheel(r, ctx, c, "torahn", WHEELS.torahn, st.aim.torahn, T.TURN, st.aim.torahn, tm);
    wheel(r, ctx, c, "elev", WHEELS.elev, st.aim.elev + T.ELEV_MAX, 2 * T.ELEV_MAX + 1, T.kiElev(st.aim.elev), tm);
    // la plaque : vierge tant que le Zéro n'est pas trouvé ; ensuite ses coordonnées gravées en chiffres D'ni (élévation au sens du KI)
    plate(ctx, c, PLATE.x, PLATE.y, PLATE.w, PLATE.h);
    ctx.fillStyle = c("#2a1d13"); ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillText(t("tel.plate.title"), PLATE.x + PLATE.w / 2, PLATE.y + 15); ctx.textAlign = "left";
    if (st.found) {
      const ink = c("#1b130d");
      engraved(r, ctx, st.zero.torahn, PLATE.x + 62, PLATE.y + 26, 17, ink);
      engraved(r, ctx, T.kiElev(st.zero.elevation), PLATE.x + 160, PLATE.y + 26, 17, ink);
      r.hot.push({ ...PLATE, tip: t("tel.plate.found"), tel: { setZero: true } });
    } else {
      ctx.strokeStyle = rgba(43, 29, 19, 0.35); ctx.lineWidth = 1; for (const x0 of [PLATE.x + 30, PLATE.x + 136]) { ctx.beginPath(); ctx.moveTo(x0, PLATE.y + 44); ctx.lineTo(x0 + 50, PLATE.y + 44); ctx.stroke(); }
      r.hot.push({ ...PLATE, tip: t("tel.plate.blank") });
    }
    // la ligne de mots, sous l'oculaire
    const tx = st.book ? TEXT_X : W / 2, line = st.found && sig.found ? t("tel.found") : bandWords(t, sig.band); // ce qu'on voit, rien de plus : à toi de comparer
    ctx.font = "italic 14px serif"; ctx.textAlign = "center"; ctx.fillStyle = sig.found ? "#9fe6da" : "#e9dcb8"; ctx.fillText(line, tx, 306, 500); ctx.textAlign = "left";
    const sub = st.book && !st.found ? t("sys.needzero") : st.found && !sig.found ? t("tel.charted") : "";
    if (sub) { ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(233,220,184,0.75)"; ctx.fillText(sub, tx, 323, 500); ctx.textAlign = "left"; }
  }
  if (((r.scene && r.scene.ages) || []).length || st.book) lectern(r, ctx, c, st);
  // redescendre
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
  ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.fillText("︾", W / 2, BACK.y + 20); ctx.textAlign = "left";
  r.hot.push({ ...BACK, tip: t("tel.back"), go: "island" });
}

/**
 * La plaque du système (étape 2) : vierge tant que le système de l'Âge n'est pas situé ; ensuite sa position GZCS gravée en
 * chiffres D'ni (Torahn, élévation au sens du KI, distance), calculée par l'instrument. Un clic y ramène les molettes.
 */
function systemPlate(r, ctx, c, st, sys) {
  const t = tOf(r), P = SPLATE, got = st.systems[sys.key];
  plate(ctx, c, P.x, P.y, P.w, P.h);
  ctx.fillStyle = c("#2a1d13"); ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillText(t("sys.plate.title"), P.x + P.w / 2, P.y + 14, P.w - 16); ctx.textAlign = "left";
  if (got) {
    const ink = c("#1b130d");
    engraved(r, ctx, got.torahn, P.x + 32, P.y + 24, 13, ink);
    engraved(r, ctx, T.kiElev(got.elevation), P.x + 80, P.y + 24, 13, ink);
    engraved(r, ctx, got.distance, P.x + 128, P.y + 24, 13, ink);
    r.hot.push({ ...P, tip: t("sys.plate.found"), tel: { setSystem: true } });
  } else {
    ctx.strokeStyle = rgba(43, 29, 19, 0.35); ctx.lineWidth = 1; for (const x0 of [P.x + 16, P.x + 64, P.x + 112]) { ctx.beginPath(); ctx.moveTo(x0, P.y + 44); ctx.lineTo(x0 + 32, P.y + 44); ctx.stroke(); }
    r.hot.push({ ...P, tip: t("sys.plate.blank") });
  }
}

/**
 * Sur l'île : un petit observatoire au sommet du mont (`lay.mount`) : un tambour de pierre, une coupole de cuivre vert-de-gris
 * fendue, d'où dépasse le tube. Une fenêtre s'allume le soir. Un clic mène à sa vue. Une fois le Zéro trouvé, une petite lueur
 * bat au bout du tube, au rythme du prorahn.
 */
function drawOnIsland(r, ctx, sky, tm) {
  const { x: mx, h } = r.lay.mount, amb = 0.4 + 0.6 * sky.ambient, c = (col) => mix("#05060c", col, amb), bx = r.lay.mount.tx != null ? r.lay.mount.tx : mx - 6, by = r.lay.mount.ty != null ? r.lay.mount.ty + 0.5 : GY - h + 5; // posé sur la terrasse taillée par drawMount
  const night = sky.night == null ? 0 : sky.night, found = state(r).found;
  ctx.save(); ctx.translate(bx, by); ctx.scale(1.3, 1.3); ctx.translate(-bx, -by); // à l'échelle de la cabane
  // (le sommet est aplani en terrasse par le dessin du mont : drawMount(…, terrace))
  // le tambour de pierre
  const sg = ctx.createLinearGradient(bx - 9, 0, bx + 9, 0); sg.addColorStop(0, c("#8d8578")); sg.addColorStop(1, c("#4f4a43")); ctx.fillStyle = sg; ctx.fillRect(bx - 9, by - 8, 18, 8);
  ctx.strokeStyle = c("#3a352f"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(bx - 9, by - 4); ctx.lineTo(bx + 9, by - 4); ctx.stroke();
  ctx.fillStyle = c("#2a2018"); ctx.fillRect(bx - 1.6, by - 5, 3.2, 5); // la porte
  if (night > 0.3) { ctx.fillStyle = rgba(255, 196, 120, 0.5 + 0.4 * night); ctx.fillRect(bx + 4, by - 6.5, 2, 2); } // une fenêtre éclairée le soir
  // la coupole et sa fente
  const dg = ctx.createLinearGradient(bx - 9, by - 18, bx + 9, by - 8); dg.addColorStop(0, c("#9fc3b0")); dg.addColorStop(1, c("#4d6f61")); ctx.fillStyle = dg;
  ctx.beginPath(); ctx.moveTo(bx - 9.5, by - 8); ctx.arc(bx, by - 8, 9.5, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(bx, by - 8); ctx.rotate(0.35); ctx.fillStyle = c("#1a1714"); ctx.fillRect(-1.6, -9.6, 3.2, 9); ctx.restore();
  // le tube qui sort de la fente
  ctx.save(); ctx.translate(bx + 1, by - 12); ctx.rotate(-1.22); const g = ctx.createLinearGradient(0, -1.6, 0, 1.6); g.addColorStop(0, c("#e8c97a")); g.addColorStop(1, c("#7a5c28")); ctx.fillStyle = g; ctx.fillRect(0, -1.2, 7.5, 2.4);
  if (found) { const beat = frac((now(r) - DT.REF) / PULSE_MS), a = 0.35 + 0.5 * Math.exp(-beat * 4) * (0.5 + 0.5 * (sky.night == null ? 0.5 : sky.night)); const gl = ctx.createRadialGradient(8.5, 0, 0, 8.5, 0, 5); gl.addColorStop(0, rgba(160, 235, 220, a)); gl.addColorStop(1, "rgba(160,235,220,0)"); ctx.fillStyle = gl; ctx.fillRect(3.5, -5, 10, 10); }
  ctx.restore();
  ctx.restore();
  const t = tOf(r); r.hot.push({ x: bx - 16, y: by - 34, w: 32, h: 36, tip: found ? t("tel.island.found") : t("tel.island"), go: "telescope" });
  void tm;
}

module.exports = { drawTelescopeRoom, drawOnIsland, state, act, systemsOf, bookLoad, EYE, WHEELS, PLATE, SPLATE, DELAY, LECTERN, FIELD, PULSE_MS };
