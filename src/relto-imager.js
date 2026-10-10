"use strict";
// L'Imageur du Relto : une chambre de pierre froide. Une machine, pas un écran à onglets : chaque commande a sa place.
//   Vue d'ensemble : le lutrin (le livre de l'Âge), l'ÉCRAN de laiton où l'Âge apparaît, la manivelle et le levier du
//   périscope de part et d'autre de l'écran, la jauge et le VERROU à droite ; en bas, l'établi et ses trois postes,
//   chacun avec sa lampe : I le râtelier à cristaux, II le banc optique, III le régulateur. Un clic sur un poste : on s'en
//   approche (gros plan) ; « reculer » ramène à l'ensemble. En gros plan, l'écran reste visible en haut à droite.
//   I   : huit cristaux sur un râtelier, quatre logements ; on prend un cristal, on le pose (src/imager.js, place).
//   II  : trois verres de couleur qui coulissent sur leurs rails, un iris à lamelles et son levier, un comparateur
//         (à gauche la lumière de l'étoile, à droite celle du faisceau).
//   III : le tube cathodique (les deux ondes), l'inverseur de polarité, quatre boutons, un voltmètre.
// Verrouillé, la machine suit l'Âge seule ; les commandes ne bougent plus ; le périscope tourne (quatre directions) et
// s'incline (zénith, horizon, sous l'eau). Tout est dessiné ici, en coordonnées logiques 640 × 360.
// Étape 2 du télescope : quand le système d'étoile de l'Âge est situé (r.imagerCal()), un MICROMÈTRE de synchro apparaît
// entre l'écran et le verrou, avec sa petite fenêtre à réticule ; synchronisé, l'image s'aiguise (r.imagerSeen()) et un
// cartouche au bas de l'écran dit l'heure là-bas et les coordonnées KIPS (src/calibration.js). Sans calibration : rien ne change.
const { rng, clamp, mix, rgba, frac } = require("./util");
const I = require("./imager");
const GI = require("./imager-guild");
const CAL = require("./calibration");
const TEL = require("./telescope");
const BEAM = require("./beam");
const { makeT } = require("./i18n");
const V = require("./genviews");
const W = 640, H = 360, FLOOR = 300;
const SCREEN = { x: 178, y: 18, w: 300, h: 172 }, MINI = { x: 404, y: 16, w: 220, h: 126 };
const GAUGE = { x: 584, y: 52, r: 26 }, LOCK = { x: 584, y: 150 }, CRANK = { x: 146, y: 74, r: 15 }, TILT = { x: 508, y: 104 };
const STATIONS = { cry: { x: 148, y: 222, w: 146, h: 74, tip: "Crystal rack" }, lens: { x: 300, y: 222, w: 160, h: 74, tip: "Optical bench" }, atmo: { x: 466, y: 222, w: 160, h: 74, tip: "Regulator" } };
const LABEL = { freq: "Frequency", amp: "Amplitude", harm: "Harmonics", phase: "Phase", pol: "Polarity switch", r: "Red glass", g: "Green glass", b: "Blue glass", iris: "Iris" };
const GLASS = { r: [230, 70, 60], g: [80, 200, 110], b: [80, 120, 240] };
const BACK = { x: 0, y: 330, w: W, h: 30 };
const TRANSCRIBE = { x: 30, y: 256, w: 92, h: 17 }; // la plaque « Transcrire ce monde », sous le livre vierge (mode Guilde)
const MICRO = { x: 524, y: 192, r: 13, hub: 6, win: { x: 494, y: 160, w: 60, h: 14 }, span: 6 }; // le micromètre de synchro ; la fenêtre montre ±6 crans
const EN = makeT(() => "en");
const tOf = (r) => (r.opts && typeof r.opts.t === "function" ? r.opts.t : EN);
const tx = (r) => ({ t: tOf(r) }); // tx(r).t("clé") : là où `t` est déjà le temps de l'animation

/** L'onde d'un ciel (ou d'un réglage) : `s` = { pol, freq, amp, harm }, `phase` de 0 à 25, dans le rectangle `b`. */
function wavePath(ctx, s, phase, b) {
  const cycles = 0.75 + s.freq * 0.25, A = (6 + s.amp * 2.4) * (b.h / 156), h = s.harm / 24, ph = (phase / I.TURN) * Math.PI * 2, cy = b.y + b.h / 2;
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const x = b.x + (i / 96) * b.w, u = (i / 96) * Math.PI * 2 * cycles + ph;
    const y = cy - s.pol * (A * Math.sin(u) + A * 0.35 * h * Math.sin(3 * u + ph));
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
}

/** Valeur en chiffres D'ni (ou en chiffres, faute de mieux). */
function number(r, ctx, v, x, y, size = 13) {
  if (r.dni && r.dni.drawNumber) r.dni.drawNumber(ctx, Math.floor(v), x - size * 0.6, y, size, "#e0c27a");
  else { ctx.fillStyle = "#e0c27a"; ctx.font = `${size}px serif`; ctx.textAlign = "center"; ctx.fillText(String(Math.floor(v)), x, y + size); ctx.textAlign = "left"; }
}

/** Une lampe de laiton : éteinte, ambre, verte. */
function lamp(ctx, x, y, state, R = 4.5) {
  const col = state === "green" ? [127, 214, 200] : state === "amber" ? [240, 184, 96] : state === "red" ? [200, 70, 50] : null;
  ctx.fillStyle = "#1b130d"; ctx.beginPath(); ctx.arc(x, y, R + 2, 0, 6.283); ctx.fill();
  ctx.fillStyle = col ? rgba(...col, 1) : "#2a2016"; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
  if (col) { const g = ctx.createRadialGradient(x, y, 0, x, y, R * 4); g.addColorStop(0, rgba(...col, 0.45)); g.addColorStop(1, rgba(...col, 0)); ctx.fillStyle = g; ctx.fillRect(x - R * 4, y - R * 4, R * 8, R * 8); }
}

/** Plaque de laiton (biseau, rivets). */
function plate(ctx, c, x, y, w, h, rivets = true) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, c("#a8843c")); g.addColorStop(0.5, c("#6b5126")); g.addColorStop(1, c("#8a6a2e"));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = c("#3b2a1b"); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (rivets) { ctx.fillStyle = c("#3b2a1b"); for (const [px, py] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.283); ctx.fill(); } }
}

/** Un bouton moleté (moitié gauche « − », moitié droite « + »). */
function knob(r, ctx, key, x, y, value, max, c, R = 17, locked = false) {
  const a = -Math.PI * 0.75 + (value / max) * Math.PI * 1.5;
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(x, y + R + 3, R * 0.9, 4, 0, 0, 6.283); ctx.fill();
  const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, 2, x, y, R); g.addColorStop(0, c("#f3dca0")); g.addColorStop(0.55, c("#b8913f")); g.addColorStop(1, c("#5a4322"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3a2a14"); ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) { const q = (i / 24) * 6.283; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (R - 3), y + Math.sin(q) * (R - 3)); ctx.lineTo(x + Math.cos(q) * R, y + Math.sin(q) * R); ctx.stroke(); }
  ctx.strokeStyle = c("#1b130d"); ctx.lineWidth = R / 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (R - 5), y + Math.sin(a) * (R - 5)); ctx.stroke();
  ctx.strokeStyle = rgba(201, 162, 78, 0.6); ctx.lineWidth = 1;
  for (let i = 0; i <= 12; i++) { const q = -Math.PI * 0.75 + (i / 12) * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (R + 3), y + Math.sin(q) * (R + 3)); ctx.lineTo(x + Math.cos(q) * (R + (i % 3 ? 5 : 8)), y + Math.sin(q) * (R + (i % 3 ? 5 : 8))); ctx.stroke(); }
  number(r, ctx, value, x, y + R + 10, 14);
  const tip = locked ? `${LABEL[key]} — held by the lock` : null;
  r.hot.push({ x: x - R - 6, y: y - R - 6, w: R + 6, h: R * 2 + 12, tip: tip || `${LABEL[key]} −`, imager: { key, delta: -1 } });
  r.hot.push({ x, y: y - R - 6, w: R + 6, h: R * 2 + 12, tip: tip || `${LABEL[key]} +`, imager: { key, delta: 1 } });
}

/**
 * Chaque cristal a son allure : sa TEINTE vient du domaine de sa page (ciel violet, terre ambre, météo bleue, vivant vert,
 * métaphysique pâle), sa FORME de la page elle-même (prisme, aiguille, géode, lentille), et son glyphe est gravé dedans.
 */
const CRY_TINT = { cosmological: [196, 168, 255], geological: [236, 186, 104], weather: [140, 196, 255], ecological: [140, 222, 156], metaphysical: [228, 222, 244] };
const SKY_IDS = new Set(require("./sky").SKY_BLOCKS.map((b) => b.id));
const WATERY = /water|rain|drizzle|snow|ice|fog|mist|sea|ocean|lake|river|marsh|delta|brine|meltwater|kelp|coral|rime|hail|steam|cloud/;
function crystalAxis(id) {
  if (WATERY.test(String(id))) return "weather"; // l'eau sous toutes ses formes : bleue, quel que soit son domaine
  if (/hill|mountain|plain|canyon|stone|rock|sand|lava|obsidian|crystal|iron|copper|gold|silver|gem|salt|glass|fissure|rift|geyser|core|ash|cave/.test(String(id))) return "geological"; // la terre : ambre
  if (/fern|tree|grove|vine|moss|seed|sapling|spore|flower|grass|meadow|moth|grazer|herd|hunter|pack|bird|burrow|warren|drifter|spider|lichen|fungus|bloom|glowvine/.test(String(id))) return "ecological"; // le vivant : vert
  let ax = null; try { const b = require("./engine/registry").blockById.get(id); ax = b && b.axis; } catch (e) { ax = null; }
  if (!ax && SKY_IDS.has(id)) ax = "cosmological";
  return CRY_TINT[ax] ? ax : SKY_IDS.has(id) || /sun|moon|star|orbit|cycle|eclipse|aurora/.test(String(id)) ? "cosmological" : ax === "meteorological" ? "weather" : CRY_TINT[ax] ? ax : "metaphysical";
}
function crystalShape(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 4; }
/** Un cristal debout portant la page gravée ; `glow` : 0 ou « ok » (vert d'eau). */
function crystal(r, ctx, x, y, w, h, id, glow, t, i = 0) {
  const top = y - h, tint = CRY_TINT[crystalAxis(id)] || CRY_TINT.metaphysical, shape = id ? crystalShape(id) : 0, [tr, tg, tb] = tint;
  const path = () => {
    ctx.beginPath();
    if (shape === 1) { ctx.moveTo(x, top - w * 0.7); ctx.lineTo(x + w * 0.32, top + h * 0.15); ctx.lineTo(x + w * 0.28, y); ctx.lineTo(x - w * 0.28, y); ctx.lineTo(x - w * 0.32, top + h * 0.15); } // l'aiguille
    else if (shape === 2) { for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 3, rx = w * 0.55, ry = h * 0.5; ctx.lineTo(x + Math.cos(a) * rx, top + h * 0.5 + Math.sin(a) * ry); } } // la géode (hexagone)
    else if (shape === 3) { ctx.moveTo(x, top - w * 0.2); ctx.lineTo(x + w * 0.55, top + h * 0.45); ctx.lineTo(x, y); ctx.lineTo(x - w * 0.55, top + h * 0.45); } // la lentille (losange)
    else { ctx.moveTo(x, top - w * 0.45); ctx.lineTo(x + w / 2, top); ctx.lineTo(x + w / 2, y); ctx.lineTo(x - w / 2, y); ctx.lineTo(x - w / 2, top); } // le prisme
    ctx.closePath();
  };
  const g = ctx.createLinearGradient(x - w / 2, top, x + w / 2, y); g.addColorStop(0, rgba(Math.min(255, tr + 30), Math.min(255, tg + 30), Math.min(255, tb + 30), 0.75)); g.addColorStop(0.5, rgba(tr * 0.75, tg * 0.75, tb * 0.75, 0.6)); g.addColorStop(1, rgba(tr * 0.4, tg * 0.4, tb * 0.4, 0.7));
  path(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(Math.min(255, tr + 30), Math.min(255, tg + 30), Math.min(255, tb + 30), 0.8); ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = rgba(255, 255, 255, 0.22); ctx.beginPath(); ctx.moveTo(x, top - (shape === 1 ? w * 0.7 : shape === 2 ? 0 : w * 0.3)); ctx.lineTo(x, y); ctx.stroke(); // l'arête
  if (glow) { ctx.save(); const f = 0.65 + 0.25 * Math.sin(t * 3 + i); ctx.shadowColor = rgba(127, 214, 200, 0.9); ctx.shadowBlur = 10; ctx.strokeStyle = rgba(160, 235, 222, f); ctx.lineWidth = 2.2; path(); ctx.stroke(); ctx.restore(); } // juste : un liseré lumineux, la teinte du cristal reste visible
  const img = id && r.opts.glyphImage ? r.opts.glyphImage(id) : null, gs = Math.min(w - 6, h * 0.6) * (shape === 1 ? 0.75 : 1);
  if (img && img.complete !== false && img.width) ctx.drawImage(img, x - gs / 2, top + (h - gs) / 2, gs, gs);
  else if (id) { ctx.fillStyle = "#e0c27a"; ctx.font = "8px serif"; ctx.textAlign = "center"; ctx.fillText(String(id).replace(/_/g, " ").slice(0, 9), x, top + h / 2 + 3); ctx.textAlign = "left"; }
}

/** L'écran de laiton dans le rectangle `S`, avec l'Âge (ou la neige). */
function drawScreen(r, ctx, S, st, cl, t, c) {
  if (st.target && r.imagerSeen) cl = r.imagerSeen(); // calibré : l'image s'aiguise (sans calibration, la même netteté)
  const k = cl.total, s = st.settings, tg = st.target, sc = S.w / 300, fw = 10 * sc;
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(S.x - fw * 0.6, S.y + fw * 0.6, S.w + fw * 1.4, S.h + fw * 1.4);
  const fr = ctx.createLinearGradient(S.x, S.y, S.x + S.w, S.y + S.h); fr.addColorStop(0, c("#c9a24e")); fr.addColorStop(0.5, c("#7a5c28")); fr.addColorStop(1, c("#b8913f"));
  ctx.fillStyle = fr; ctx.fillRect(S.x - fw, S.y - fw, S.w + fw * 2, S.h + fw * 2);
  ctx.fillStyle = c("#3b2a1b"); for (const [x, y] of [[S.x - fw / 2, S.y - fw / 2], [S.x + S.w + fw / 2, S.y - fw / 2], [S.x - fw / 2, S.y + S.h + fw / 2], [S.x + S.w + fw / 2, S.y + S.h + fw / 2], [S.x + S.w / 2, S.y - fw / 2], [S.x + S.w / 2, S.y + S.h + fw / 2]]) { ctx.beginPath(); ctx.arc(x, y, 2.2 * sc, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = "#060a0b"; ctx.fillRect(S.x, S.y, S.w, S.h);
  ctx.save(); ctx.beginPath(); ctx.rect(S.x, S.y, S.w, S.h); ctx.clip();
  const v = st.view && r.imagerView(st, t);
  if (v && cl.atmo > 0.02) {
    const ghost = (1 - cl.cry) * 14 * sc; // cristaux faux : l'image se dédouble
    const put = (img, dx, dy, al) => {
      ctx.globalAlpha = al;
      try { ctx.filter = `blur(${(((1 - cl.atmo) * 6 + (1 - cl.cry) * 1.5) * sc).toFixed(1)}px) saturate(${(0.25 + 0.75 * cl.atmo).toFixed(2)})`; } catch (e) { /* filtre absent */ }
      ctx.drawImage(img, S.x + dx, S.y + dy, S.w, S.h);
      if (ghost > 1) { ctx.globalAlpha = al * 0.45; ctx.drawImage(img, S.x + dx + ghost, S.y + dy - ghost * 0.4, S.w, S.h); }
      try { ctx.filter = "none"; } catch (e) { /* filtre absent */ }
      ctx.globalAlpha = 1;
    };
    const base = (0.2 + 0.8 * cl.atmo) * (ghost > 1 ? 0.6 : 1);
    if (v.prev) { const p = 1 - Math.pow(1 - clamp(v.p), 2), dx = v.dx * S.w, dy = v.dy * S.h; put(v.prev, -dx * p, -dy * p, base); put(v.cur, dx * (1 - p), dy * (1 - p), base); } // on tourne, on lève les yeux : la vue glisse
    else put(v.cur, 0, 0, base);
    if (cl.lens < 0.995) { // lentilles fausses : la lumière du faisceau teinte l'image
      const sum = Math.max(1, s.r + s.g + s.b), beam = [s.r, s.g, s.b].map((x) => Math.round(70 + (185 * x * 3) / (sum * 1.6)));
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = rgba(...beam.map((x) => Math.min(255, x)), 0.75 * (1 - cl.lens)); ctx.fillRect(S.x, S.y, S.w, S.h); ctx.restore();
      ctx.fillStyle = rgba(0, 0, 0, 0.35 * Math.min(1, Math.abs(s.iris - (tg && tg.lens ? tg.lens.iris : s.iris)) / 12)); ctx.fillRect(S.x, S.y, S.w, S.h); // iris trop ouvert ou trop fermé
    }
  }
  const nz = rng(Math.floor(t * 12)); ctx.fillStyle = rgba(170, 230, 220, (st.guild && !st.world ? 0.04 : 0.3) * (1 - cl.atmo)); for (let i = 0; i < 260 * (1 - cl.atmo) * sc; i++) ctx.fillRect(S.x + nz() * S.w, S.y + nz() * S.h, 1.4, 1.4); // neige (mode Guilde, aucun monde : presque rien, la fenêtre reste noire)
  ctx.strokeStyle = rgba(127, 214, 200, 0.12 * (1 - k)); ctx.lineWidth = 1; for (let y = S.y; y < S.y + S.h; y += 4) { ctx.beginPath(); ctx.moveTo(S.x, y + frac(t) * 4); ctx.lineTo(S.x + S.w, y + frac(t) * 4); ctx.stroke(); } // balayage
  const gl = ctx.createLinearGradient(S.x, S.y, S.x + S.w * 0.6, S.y + S.h); gl.addColorStop(0, "rgba(255,255,255,0.10)"); gl.addColorStop(0.4, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fillRect(S.x, S.y, S.w, S.h); // reflet du verre
  const vg = ctx.createRadialGradient(S.x + S.w / 2, S.y + S.h / 2, S.h * 0.4, S.x + S.w / 2, S.y + S.h / 2, S.w * 0.65); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = vg; ctx.fillRect(S.x, S.y, S.w, S.h);
  ctx.restore();
  if (s.lock) lamp(ctx, S.x + S.w + fw / 2, S.y + S.h / 2, "green", 2.5 * sc); // le sceau du verrou
}

/** Le fond d'une chambre de pierre (et sa fente où passe une aurore). */
function room(ctx, c, t) {
  const wg = ctx.createLinearGradient(0, 0, 0, FLOOR); wg.addColorStop(0, c("#232b35")); wg.addColorStop(1, c("#161c23")); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, FLOOR);
  const q = rng(0x1a6e); ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
  for (let y = 18; y < FLOOR; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); for (let x = (y / 26) % 2 ? 0 : 30; x < W; x += 60 + q() * 10) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26); ctx.stroke(); } }
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#2e343c")); fg.addColorStop(1, c("#171a1f")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = c("#0d1014"); ctx.fillRect(0, FLOOR - 3, W, 4);
  ctx.fillStyle = "#06080c"; ctx.fillRect(120, 6, 40, 6);
  const ag = ctx.createLinearGradient(120, 6, 160, 6); ag.addColorStop(0, rgba(80, 220, 160, 0.18 + 0.1 * Math.sin(t * 0.7))); ag.addColorStop(1, rgba(150, 120, 230, 0.22)); ctx.fillStyle = ag; ctx.fillRect(122, 7, 36, 4);
}

/** L'établi vu de près (gros plans) : le mur en haut, la table de bois et de laiton. */
function bench(ctx, c, y0) {
  const tg = ctx.createLinearGradient(0, y0, 0, H); tg.addColorStop(0, c("#4a3523")); tg.addColorStop(1, c("#24180f")); ctx.fillStyle = tg; ctx.fillRect(0, y0, W, H - y0);
  ctx.fillStyle = c("#6b5126"); ctx.fillRect(0, y0 - 4, W, 5);
  ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1; for (let y = y0 + 14; y < H; y += 17) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + 3, W * 0.6, y - 3, W, y + 1); ctx.stroke(); }
}

/** Reculer (gros plan → ensemble). */
function backStrip(r, ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
  ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.fillText("︾", W / 2, BACK.y + 20); ctx.textAlign = "left";
  r.hot.push({ ...BACK, tip: "Step back", imager: { station: null } });
}

// ---- vue d'ensemble ---------------------------------------------------------------------------------
function overview(r, ctx, st, cl, t, c, now) {
  const s = st.settings, k = cl.total, tg = st.target, locked = s.lock, ready = !locked && k >= I.LOCK_AT;
  room(ctx, c, t);
  ctx.fillStyle = c("#0b0d11"); ctx.fillRect(10, 150, 24, FLOOR - 150); ctx.strokeStyle = c("#3a4048"); ctx.strokeRect(10, 150, 24, FLOOR - 150);
  r.hot.push({ x: 8, y: 148, w: 28, h: FLOOR - 146, tip: "Door — back outside", go: "island" });
  drawScreen(r, ctx, SCREEN, st, cl, t, c);
  r.hot.push({ x: SCREEN.x, y: SCREEN.y, w: SCREEN.w, h: SCREEN.h, tip: st.guild ? (k > 0.9 && st.planet ? (st.world.unwritten ? tx(r).t("guild.unwritten.screen") : st.age.name) : st.world ? tx(r).t("guild.screen.blur") : tx(r).t("guild.screen.dark")) : k > 0.9 && st.age ? st.age.name : "The screen" });

  // le périscope : la manivelle (azimut) à gauche de l'écran, le levier d'inclinaison à droite ; libres une fois verrouillé
  const K = CRANK, ang = (s.az / 4) * Math.PI * 2 + (st.crankSpin || 0);
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(K.x + 8, K.y - 3, 16, 6);
  ctx.strokeStyle = c("#b8913f"); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(K.x, K.y, K.r, 0, 6.283); ctx.stroke();
  for (let i = 0; i < 4; i++) { const a = ang + (i / 4) * Math.PI * 2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(K.x, K.y); ctx.lineTo(K.x + Math.cos(a) * K.r, K.y + Math.sin(a) * K.r); ctx.stroke(); }
  const hx = K.x + Math.cos(ang) * K.r, hy = K.y + Math.sin(ang) * K.r; ctx.fillStyle = c("#e0c27a"); ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, 6.283); ctx.fill();
  // la rose : quatre crans, l'aiguille montre la direction
  const rx = K.x, ry = K.y + 40; ctx.fillStyle = c("#1b130d"); ctx.beginPath(); ctx.arc(rx, ry, 13, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; ctx.stroke();
  for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i / 4) * Math.PI * 2; ctx.fillStyle = i === s.az && locked ? "#7fd6c8" : c("#8a6a2e"); ctx.beginPath(); ctx.arc(rx + Math.cos(a) * 9, ry + Math.sin(a) * 9, i === 0 ? 2.2 : 1.5, 0, 6.283); ctx.fill(); }
  const na = -Math.PI / 2 + (s.az / 4) * Math.PI * 2; ctx.strokeStyle = locked ? "#f0b860" : c("#5a4322"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(na) * 8, ry + Math.sin(na) * 8); ctx.stroke();
  const ctip = locked ? "Periscope crank" : "Periscope crank — free once the lock holds";
  r.hot.push({ x: K.x - K.r - 6, y: K.y - K.r - 6, w: K.r + 6, h: K.r * 2 + 12 + 40, tip: ctip + (locked ? " — turn left" : ""), imager: { key: "az", delta: -1 } });
  r.hot.push({ x: K.x, y: K.y - K.r - 6, w: K.r + 6, h: K.r * 2 + 12 + 40, tip: ctip + (locked ? " — turn right" : ""), imager: { key: "az", delta: 1 } });
  const T = TILT, under = V.hasUnder(st.model), pos = { 1: T.y - 40, 0: T.y, [-1]: T.y + 40 };
  ctx.fillStyle = c("#1b130d"); ctx.fillRect(T.x - 5, T.y - 48, 10, 96); ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; ctx.strokeRect(T.x - 5, T.y - 48, 10, 96);
  for (const v of [1, 0, -1]) { ctx.fillStyle = c("#8a6a2e"); ctx.fillRect(T.x + 7, pos[v] - 1, 6, 2); }
  ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(T.x + 20, pos[1], 3, 0, 6.283); ctx.stroke(); // gravures : un astre en haut, une vague en bas
  ctx.strokeStyle = under ? c("#8a6a2e") : c("#3b2a1b"); ctx.beginPath(); for (let i = 0; i <= 8; i++) { const x = T.x + 16 + i, y = pos[-1] + Math.sin(i * 0.9) * 2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  const ky = pos[s.tilt] != null ? pos[s.tilt] : T.y; ctx.strokeStyle = c("#b8913f"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(T.x, ky); ctx.lineTo(T.x - 14, ky); ctx.stroke();
  const kg = ctx.createRadialGradient(T.x - 16, ky - 2, 1, T.x - 15, ky, 6); kg.addColorStop(0, "#f3dca0"); kg.addColorStop(1, "#6b5126"); ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(T.x - 15, ky, 5, 0, 6.283); ctx.fill();
  for (const v of [1, 0, -1]) r.hot.push({ x: T.x - 22, y: pos[v] - 16, w: 46, h: 32, tip: !locked ? "Tilt lever — free once the lock holds" : v > 0 ? "Look up" : v < 0 ? (under ? "Look under the water" : "Look down (no water here)") : "Look at the horizon", imager: { tilt: v } });

  // la jauge et le verrou
  const Gg = GAUGE; ctx.fillStyle = c("#1b130d"); ctx.beginPath(); ctx.arc(Gg.x, Gg.y, Gg.r + 5, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(Gg.x, Gg.y, Gg.r, Math.PI, 0); ctx.stroke();
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; ctx.beginPath(); ctx.moveTo(Gg.x + Math.cos(a) * (Gg.r - 5), Gg.y + Math.sin(a) * (Gg.r - 5)); ctx.lineTo(Gg.x + Math.cos(a) * Gg.r, Gg.y + Math.sin(a) * Gg.r); ctx.stroke(); }
  const ga = Math.PI * (1 + (I.LOCK_AT)); ctx.strokeStyle = "rgba(127,214,200,0.7)"; ctx.beginPath(); ctx.arc(Gg.x, Gg.y, Gg.r - 2, ga, Math.PI * 2); ctx.stroke(); // la zone où le verrou prend
  const nd = Math.PI + clamp(k + 0.015 * Math.sin(t * 9) * (1 - k)) * Math.PI; ctx.strokeStyle = "#f0b860"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Gg.x, Gg.y); ctx.lineTo(Gg.x + Math.cos(nd) * (Gg.r - 3), Gg.y + Math.sin(nd) * (Gg.r - 3)); ctx.stroke();
  r.hot.push({ x: Gg.x - Gg.r, y: Gg.y - Gg.r, w: Gg.r * 2, h: Gg.r + 6, tip: "Clarity gauge" });
  const L = LOCK; plate(ctx, c, L.x - 26, L.y - 58, 52, 112);
  ctx.fillStyle = c("#1b130d"); ctx.fillRect(L.x - 4, L.y - 40, 8, 80);
  const lx = L.x, ly = L.y + (locked ? 30 : -30);
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(lx + (locked ? 10 : -10), ly); ctx.stroke(); ctx.lineCap = "butt";
  const lg = ctx.createRadialGradient(lx + (locked ? 9 : -11), ly - 2, 1, lx + (locked ? 10 : -10), ly, 9); lg.addColorStop(0, "#f3dca0"); lg.addColorStop(1, "#6b5126"); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx + (locked ? 10 : -10), ly, 8, 0, 6.283); ctx.fill();
  lamp(ctx, L.x, L.y - 50, locked ? "green" : ready ? "amber" : st.age ? "red" : null, 4);
  r.hot.push({ x: L.x - 28, y: L.y - 60, w: 56, h: 116, tip: locked ? "The lock — pull to release" : ready ? "The lock — the image is clear: pull" : "The lock — it only holds a clear image", imager: { lock: true } });
  const cal = r.imagerCal ? r.imagerCal() : null;
  if (cal) { micrometer(r, ctx, c, cal, t); cartouche(r, ctx, cal); }

  if (st.guild) blankBook(r, ctx, st, c);
  else { // le lutrin : le livre de l'Âge visé ; ‹ › pour changer de livre
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(70, 200, 8, FLOOR - 200); ctx.fillRect(52, FLOOR - 6, 44, 6);
  ctx.save(); ctx.translate(74, 196); ctx.rotate(-0.18);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(-46, -6, 92, 30);
  ctx.fillStyle = c(st.age ? "#e8dcc0" : "#6a6050"); ctx.fillRect(-43, -4, 42, 25); ctx.fillRect(1, -4, 42, 25);
  ctx.strokeStyle = c("#9a8a6a"); ctx.lineWidth = 0.6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-38, 2 + i * 5); ctx.lineTo(-6, 2 + i * 5); ctx.stroke(); }
  if (st.age && st.thumb) ctx.drawImage(st.thumb, 5, -1, 34, 20);
  ctx.restore();
  ctx.fillStyle = "#e0c27a"; ctx.font = "italic 12px serif"; ctx.textAlign = "center"; ctx.fillText(st.age ? st.age.name : st.empty ? "(no Age on the shelf)" : "…", 74, 238); ctx.textAlign = "left";
  for (const [dx, sym, d] of [[-56, "‹", -1], [56, "›", 1]]) { ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.fillText(sym, 74 + dx, 203); ctx.textAlign = "left"; r.hot.push({ x: 74 + dx - 12, y: 182, w: 24, h: 28, tip: d < 0 ? "Previous book" : "Next book", imager: { book: d } }); }
  r.hot.push({ x: 28, y: 180, w: 92, h: 66, tip: st.age ? `${st.age.name} — on the lectern` : "Lectern", imager: { book: 1 } });
  }

  // l'établi et ses trois postes
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(140, 218, 492, FLOOR - 218); ctx.fillStyle = c("#5a4322"); ctx.fillRect(136, 212, 500, 8);
  ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; ctx.strokeRect(140, 218, 492, FLOOR - 218);
  // le petit cristal qui projette sur l'écran
  const px = 196, py = 210, beam = ctx.createLinearGradient(px, py, SCREEN.x + 60, SCREEN.y + SCREEN.h); beam.addColorStop(0, rgba(127, 214, 200, 0.06 + 0.14 * k)); beam.addColorStop(1, "rgba(127,214,200,0)");
  ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(px - 3, py - 8); ctx.lineTo(SCREEN.x + 10, SCREEN.y + SCREEN.h - 20); ctx.lineTo(SCREEN.x + 70, SCREEN.y + SCREEN.h); ctx.lineTo(px + 3, py - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(160, 230, 220, 0.55 + 0.3 * k); ctx.beginPath(); ctx.moveTo(px, py - 14); ctx.lineTo(px + 5, py - 7); ctx.lineTo(px, py); ctx.lineTo(px - 5, py - 7); ctx.closePath(); ctx.fill();
  const lit = (key) => (locked || cl[key] > 0.9 ? "green" : null);
  if (st.guild) guildRackMini(ctx, c, st, lit);
  else { // I. le râtelier
    const b = STATIONS.cry; ctx.fillStyle = c("#2a1d13"); ctx.fillRect(b.x + 8, b.y + 44, b.w - 24, 10);
    const C = tg && tg.crystals;
    for (let i = 0; i < 8; i++) { if (C && s.cry.includes(i)) continue; const x = b.x + 16 + i * 14; ctx.fillStyle = rgba(170, 225, 220, 0.55); ctx.beginPath(); ctx.moveTo(x, b.y + 30); ctx.lineTo(x + 4, b.y + 34); ctx.lineTo(x + 4, b.y + 46); ctx.lineTo(x - 4, b.y + 46); ctx.lineTo(x - 4, b.y + 34); ctx.closePath(); ctx.fill(); }
    plate(ctx, c, b.x + 8, b.y + 4, b.w - 40, 22, false);
    for (let i = 0; i < 4; i++) { const x = b.x + 22 + i * 25, ok = I.crystalOk(tg, s.cry[i]); ctx.fillStyle = "#1b130d"; ctx.fillRect(x - 6, b.y + 9, 12, 12); if (s.cry[i] >= 0) { ctx.fillStyle = ok ? rgba(127, 214, 200, 0.8) : rgba(170, 225, 220, 0.35); ctx.fillRect(x - 3, b.y + 6, 6, 12); } } // un logement juste s'allume (mode facile)
    lamp(ctx, b.x + b.w - 14, b.y + 14, lit("cry"));
  }
  { // II. le banc optique
    const b = STATIONS.lens; ctx.fillStyle = c("#1b130d"); ctx.fillRect(b.x + 6, b.y + 40, b.w - 12, 4);
    ctx.fillStyle = c("#6b5126"); ctx.fillRect(b.x + 6, b.y + 30, 18, 18); ctx.fillStyle = rgba(255, 230, 170, 0.5 + 0.2 * Math.sin(t * 2)); ctx.beginPath(); ctx.arc(b.x + 24, b.y + 39, 3, 0, 6.283); ctx.fill(); // la lampe
    for (const [i, key] of ["r", "g", "b"].entries()) { const x = b.x + 34 + (s[key] / I.MAX) * 70 + i * 4, y = b.y + 32 + i * 0; ctx.fillStyle = rgba(...GLASS[key], 0.75); ctx.beginPath(); ctx.ellipse(x, y + 6, 3, 9, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1; ctx.stroke(); }
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x + 132, b.y + 30, 12, 0, 6.283); ctx.stroke(); ctx.fillStyle = "#06080a"; ctx.beginPath(); ctx.arc(b.x + 132, b.y + 30, 3 + (s.iris / I.MAX) * 8, 0, 6.283); ctx.fill(); // l'iris
    lamp(ctx, b.x + b.w - 14, b.y + 10, lit("lens"));
  }
  { // III. le régulateur
    const b = STATIONS.atmo, crt = { x: b.x + 8, y: b.y + 6, w: 62, h: 40 };
    ctx.fillStyle = "#061a14"; ctx.fillRect(crt.x, crt.y, crt.w, crt.h); ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 2; ctx.strokeRect(crt.x, crt.y, crt.w, crt.h);
    ctx.save(); ctx.beginPath(); ctx.rect(crt.x, crt.y, crt.w, crt.h); ctx.clip();
    if (tg && !(st.guild && !st.planet)) { wavePath(ctx, I.effective(s, tg, now), s.lock ? I.phaseAt(tg, now) : s.phase, crt); ctx.strokeStyle = "rgba(120,255,170,0.85)"; ctx.lineWidth = 1; ctx.stroke(); } // mode Guilde : le tube dort tant que les cristaux ne tiennent pas une planète
    ctx.restore();
    for (let i = 0; i < 4; i++) { const x = b.x + 86 + (i % 2) * 22, y = b.y + 14 + Math.floor(i / 2) * 22; ctx.fillStyle = c("#b8913f"); ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill(); }
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x + 138, b.y + 50); ctx.lineTo(b.x + 138 + (s.pol > 0 ? 6 : -6), b.y + 34); ctx.stroke();
    lamp(ctx, b.x + b.w - 10, b.y + 10, lit("atmo"));
  }
  for (const [key, b] of Object.entries(STATIONS)) r.hot.push({ x: b.x, y: b.y, w: b.w, h: b.h, tip: `${b.tip} — come closer`, imager: { station: key } });
}

/**
 * Le micromètre de synchro (étape 2) : un petit tambour moleté (couronne : cinq crans ; moyeu : un demi-cran) et, au-dessus,
 * sa fenêtre à réticule où passe la planète quand on approche de sa place sur l'orbite. Synchronisé : la fenêtre s'allume.
 */
function micrometer(r, ctx, c, cal, t) {
  const tt = tOf(r), M = MICRO, wn = M.win, a = -Math.PI / 2 + (cal.reading / CAL.TURN) * Math.PI * 2;
  // la fenêtre : un réticule vertical ; la planète, un point, décalée de l'écart (visible à ±6 crans)
  ctx.fillStyle = c("#1b130d"); ctx.fillRect(wn.x - 3, wn.y - 3, wn.w + 6, wn.h + 6);
  ctx.fillStyle = "#04080a"; ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
  ctx.save(); ctx.beginPath(); ctx.rect(wn.x, wn.y, wn.w, wn.h); ctx.clip();
  const cx = wn.x + wn.w / 2, cy = wn.y + wn.h / 2;
  if (Math.abs(cal.gap) <= M.span) { const px = cx + (cal.gap / M.span) * (wn.w / 2 - 3), tw = 0.6 + 0.4 * Math.sin(t * 5); ctx.fillStyle = rgba(235, 245, 255, 0.55 + 0.4 * tw * (1 - Math.abs(cal.gap) / M.span)); ctx.beginPath(); ctx.arc(px, cy, 1.6, 0, 6.283); ctx.fill(); }
  ctx.strokeStyle = cal.synced ? rgba(127, 214, 200, 0.5 + 0.4 * cal.q) : "rgba(224,194,122,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, wn.y); ctx.lineTo(cx, wn.y + wn.h); ctx.stroke();
  ctx.restore();
  r.hot.push({ x: wn.x - 3, y: wn.y - 3, w: wn.w + 6, h: wn.h + 6, tip: cal.synced ? (cal.certain ? tt("cal.window.synced") : tt("cal.window.drift")) : tt("cal.window") });
  // le tambour
  const g = ctx.createRadialGradient(M.x - 4, M.y - 5, 1, M.x, M.y, M.r); g.addColorStop(0, c("#f3dca0")); g.addColorStop(0.55, c("#b8913f")); g.addColorStop(1, c("#5a4322"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(M.x, M.y, M.r, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3a2a14"); ctx.lineWidth = 0.8; for (let i = 0; i < 25; i++) { const q = a + (i / 25) * 6.283; ctx.beginPath(); ctx.moveTo(M.x + Math.cos(q) * (M.r - 3), M.y + Math.sin(q) * (M.r - 3)); ctx.lineTo(M.x + Math.cos(q) * M.r, M.y + Math.sin(q) * M.r); ctx.stroke(); }
  ctx.fillStyle = c("#2a1d13"); ctx.beginPath(); ctx.arc(M.x, M.y, M.hub + 1.5, 0, 6.283); ctx.fill();
  ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(M.x, M.y, M.hub, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#1b130d"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(M.x, M.y); ctx.lineTo(M.x + Math.cos(a) * (M.hub - 1), M.y + Math.sin(a) * (M.hub - 1)); ctx.stroke();
  lamp(ctx, M.x + M.r + 7, M.y - M.r + 2, cal.synced ? (cal.certain ? "green" : "amber") : null, 2.6);
  const name = tt("cal.micro");
  r.hot.push({ x: M.x - M.r - 4, y: M.y - M.r - 4, w: M.r + 4, h: M.r * 2 + 8, tip: `${name} — ${tt("cal.rim.minus")}`, tipBelow: true, imager: { sync: -10 } });
  r.hot.push({ x: M.x, y: M.y - M.r - 4, w: M.r + 4, h: M.r * 2 + 8, tip: `${name} — ${tt("cal.rim.plus")}`, tipBelow: true, imager: { sync: 10 } });
  r.hot.push({ x: M.x - M.hub - 2, y: M.y - M.hub - 2, w: M.hub + 2, h: M.hub * 2 + 4, tip: `${name} — ${tt("cal.hub.minus")}`, tipBelow: true, imager: { sync: -1 } });
  r.hot.push({ x: M.x, y: M.y - M.hub - 2, w: M.hub + 2, h: M.hub * 2 + 4, tip: `${name} — ${tt("cal.hub.plus")}`, tipBelow: true, imager: { sync: 1 } });
}

/** Le cartouche au bas de l'écran (étape 2) : l'heure là-bas, en mots et en chiffres D'ni (gahrtahvo · tahvo), et les coordonnées KIPS. */
function cartouche(r, ctx, cal) {
  const tt = tOf(r), S = SCREEN, lang = tt("cal.lang"), y = S.y + S.h - 18, lt = cal.lt;
  ctx.fillStyle = "rgba(4,8,10,0.62)"; ctx.fillRect(S.x, y, S.w, 18);
  ctx.font = "italic 11px serif"; ctx.fillStyle = cal.synced ? (cal.certain ? "#cfeee7" : "rgba(240,200,140,0.9)") : "rgba(233,220,184,0.7)";
  const words = CAL.timeWords(lt, lang); ctx.fillText(words, S.x + 6, y + 13, 130);
  const wOf = (v, size) => (r.dni && r.dni.widthOf ? r.dni.widthOf(Math.round(Math.abs(v)), size) : String(Math.round(Math.abs(v))).length * size * 0.6);
  const dn = (v, x, size, col) => { if (r.dni && r.dni.drawNumber) r.dni.drawNumber(ctx, Math.round(Math.abs(v)), x, y + (18 - size) / 2, size, col); else { ctx.fillStyle = col; ctx.font = `${size}px serif`; ctx.fillText(String(Math.round(Math.abs(v))), x, y + 13); } return wOf(v, size); };
  let x = S.x + 6 + Math.min(130, ctx.measureText(words).width) + 8;
  if (lt.known) { const col = cal.certain ? "#9fe6da" : "rgba(240,200,140,0.9)"; x += dn(lt.gahr, x, 10, col) + 2; ctx.fillStyle = col; ctx.fillText(":", x, y + 13); x += 5; x += dn(lt.tahvo, x, 10, col); }
  r.hot.push({ x: S.x, y, w: x - S.x + 4, h: 18, tip: lt.known ? tt("cal.time.tip") : tt("cal.time.unknown.tip") });
  // KIPS : Torahn · élévation (au sens du KI) · distance le long du faisceau, en rahnfee (src/beam.js), comme sur un KI, en petit à droite
  if (cal.synced) {
    const size = 8, kx = S.x + S.w - 6, fr = BEAM.digitsOf(cal.sys.distance), vals = [cal.sys.torahn, TEL.kiElev(cal.sys.elevation)], w = (v) => wOf(v, size) + (v < 0 ? 4 : 0);
    const fw = r.dni && r.dni.fractionWidth ? r.dni.fractionWidth(fr, size) : 24;
    let px = Math.max(x + 10, kx - vals.reduce((a, v) => a + w(v) + 6, 0) - fw);
    const x0 = px, col = "rgba(224,194,122,0.9)"; for (const v of vals) { if (v < 0) { ctx.fillStyle = col; ctx.fillRect(px, y + 8.5, 3, 1); px += 4; } px += dn(v, px, size, col) + 6; }
    if (r.dni && r.dni.drawFraction) r.dni.drawFraction(ctx, fr, px, y + (18 - size) / 2, size, col); else { ctx.fillStyle = col; ctx.fillText(fr.join("."), px, y + 13); }
    r.hot.push({ x: x0 - 4, y, w: kx - x0 + 8, h: 18, tip: tt("cal.kips.tip") });
  }
}

// ---- mode Guilde : le livre vierge ---------------------------------------------------------------------
/** Le monde est-il formé (cristaux justes, image nette ou tenue par le verrou) ? Son nom s'inscrit alors sur la page. */
function formed(r, st) { return !!(st.guild && st.planet && st.world && (st.settings.lock || (r.imagerClarity ? r.imagerClarity().total : 0) >= I.LOCK_AT)); }
/**
 * Le livre vierge, fixé dans l'appareil (pas de ‹ ›) : une fenêtre noire sur sa page droite, qui montre le monde quand il se
 * forme ; sur la page gauche, le nom s'inscrit à l'encre quand l'image tient. Il se souvient des mondes déjà formés.
 */
function blankBook(r, ctx, st, c) {
  const t = tOf(r), on = formed(r, st), u = on && st.world.unwritten ? st.world.unwritten : null, name = on && !u ? String(st.world.age.name) : "";
  if (u) return unwrittenBook(r, ctx, st, c, u);
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(70, 200, 8, FLOOR - 200); ctx.fillRect(52, FLOOR - 6, 44, 6);
  ctx.fillStyle = c("#5a4322"); ctx.fillRect(38, 214, 72, 4); // le support de laiton qui le tient
  ctx.save(); ctx.translate(74, 196); ctx.rotate(-0.18);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(-46, -6, 92, 30);
  ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(-43, -4, 42, 25); ctx.fillRect(1, -4, 42, 25);
  ctx.fillStyle = "#05080a"; ctx.fillRect(5, -1, 34, 20); // la fenêtre noire
  if (on && st.thumb) ctx.drawImage(st.thumb, 5, -1, 34, 20);
  if (on) { ctx.fillStyle = "#3b2a1b"; ctx.font = "italic 6px serif"; ctx.textAlign = "center"; ctx.fillText(name, -22, 10, 38); ctx.textAlign = "left"; } // l'encre du nom
  else { ctx.strokeStyle = c("#c8baa0"); ctx.lineWidth = 0.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-38, 4 + i * 5); ctx.lineTo(-6, 4 + i * 5); ctx.stroke(); } }
  const ghost = on ? [] : ghostIds(st);
  if (ghost.length) ghostGlyphs(r, ctx, ghost);
  ctx.restore();
  ctx.fillStyle = "#e0c27a"; ctx.font = "italic 12px serif"; ctx.textAlign = "center"; ctx.fillText(on ? name : t("guild.book"), 74, 238, 120); ctx.textAlign = "left";
  const seen = st.g.seen.length ? " — " + t("guild.book.seen", { names: st.g.seen.join(", ") }) : "";
  r.hot.push({ x: 28, y: 180, w: 92, h: 66, tip: (on ? t("guild.book.formed", { name }) : t("guild.book.tip") + (ghost.length ? " " + t("guild.book.ghost") : "")) + seen });
}
/** Les cristaux de l'étoile que tient le télescope (le premier de ses Âges, par nom, comme sa lumière) : ce qui transparaît. */
function ghostIds(st) {
  if (!st.star) return [];
  const list = (st.cands || []).filter((x) => GI.starOf(x) === st.star && GI.crystalIds(x).length).sort((a, b) => String(a.age.name).localeCompare(String(b.age.name)));
  return list.length ? GI.crystalIds(list[0]).slice(0, GI.SLOTS) : [];
}
/**
 * Les glyphes qui transparaissent sur la page gauche du livre vierge, vus à travers le papier : pâles, à l'envers (en miroir),
 * deux par ligne. Ils disent quelles pages chercher, pas lesquelles sont déjà posées.
 */
function ghostGlyphs(r, ctx, ids) {
  ctx.save(); ctx.globalAlpha = 0.2; ctx.scale(-1, 1); // le verso : en miroir
  ids.forEach((id, i) => {
    const gx = 8 + (i % 2) * 17, gy = -2 + Math.floor(i / 2) * 11, gs = 10, img = r.opts.glyphImage ? r.opts.glyphImage(id) : null;
    if (img && img.complete !== false && img.width) ctx.drawImage(img, gx, gy, gs, gs);
    else { ctx.fillStyle = "#3b2a1b"; ctx.font = "italic 4px serif"; ctx.fillText(String(id).replace(/_/g, " ").slice(0, 8), gx - 2, gy + 6, 16); }
  });
  ctx.restore();
}
/**
 * Le livre vierge quand il montre un monde que personne n'a écrit : pas de nom ; quelques mots de sa description en encre
 * pâle sur la page gauche ; sous le livre, « un monde que personne n'a écrit » et la plaque « Transcrire ce monde ».
 */
function unwrittenBook(r, ctx, st, c, u) {
  const t = tOf(r), done = st.transcribed && st.transcribed.key === u.key ? st.transcribed.name : null;
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(70, 200, 8, FLOOR - 200); ctx.fillRect(52, FLOOR - 6, 44, 6);
  ctx.fillStyle = c("#5a4322"); ctx.fillRect(38, 214, 72, 4);
  ctx.save(); ctx.translate(74, 196); ctx.rotate(-0.18);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(-46, -6, 92, 30);
  ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(-43, -4, 42, 25); ctx.fillRect(1, -4, 42, 25);
  ctx.fillStyle = "#05080a"; ctx.fillRect(5, -1, 34, 20);
  if (st.thumb) ctx.drawImage(st.thumb, 5, -1, 34, 20);
  const words = String(u.words || "").split(/\s+/).filter(Boolean); // l'encre qui hésite : quelques mots, pâles, sans nom
  ctx.fillStyle = "rgba(59,42,27,0.55)"; ctx.font = "italic 4.5px serif";
  for (let i = 0; i < 3; i++) { const line = words.slice(i * 2, i * 2 + 2).join(" "); if (line) ctx.fillText(line, -40, 3 + i * 6, 36); }
  ctx.restore();
  ctx.fillStyle = "#cfe3dc"; ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillText(t("guild.unwritten.book"), 74, 238, 128);
  if (u.words) { ctx.fillStyle = "rgba(233,220,184,0.7)"; ctx.font = "italic 9px serif"; ctx.fillText(u.words, 74, 250, 128); }
  ctx.textAlign = "left";
  const P = TRANSCRIBE; plate(ctx, c, P.x, P.y, P.w, P.h, false);
  ctx.fillStyle = c("#1b130d"); ctx.font = "italic 9px serif"; ctx.textAlign = "center"; ctx.fillText(done ? t("guild.transcribe.done") : t("guild.transcribe"), P.x + P.w / 2, P.y + 12, P.w - 8); ctx.textAlign = "left";
  r.hot.push({ x: 28, y: 180, w: 92, h: 62, tip: t("guild.unwritten.tip") + (u.words ? ` — « ${u.words} »` : "") });
  r.hot.push({ ...P, tip: done ? t("guild.transcribed", { name: done }) : t("guild.transcribe.tip"), imager: { transcribe: true } });
}
/** Vue d'ensemble, station I en mode Guilde : quatre logements (verts, ambre) et les cristaux de la rangée. */
function guildRackMini(ctx, c, st, lit) {
  const b = STATIONS.cry, slots = GI.slotsOf(st.g.cry, st.world ? GI.crystalIds(st.world) : []);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(b.x + 8, b.y + 44, b.w - 24, 10);
  const shown = GI.rackPage(GI.rackOf(st.ages || [], st.cands), st.g.page);
  shown.forEach((id, i) => { if (st.g.cry.includes(id)) return; const x = b.x + 16 + i * 14; ctx.fillStyle = rgba(170, 225, 220, 0.55); ctx.beginPath(); ctx.moveTo(x, b.y + 30); ctx.lineTo(x + 4, b.y + 34); ctx.lineTo(x + 4, b.y + 46); ctx.lineTo(x - 4, b.y + 46); ctx.lineTo(x - 4, b.y + 34); ctx.closePath(); ctx.fill(); });
  plate(ctx, c, b.x + 8, b.y + 4, b.w - 40, 22, false);
  slots.forEach((q, i) => { const x = b.x + 22 + i * 25; ctx.fillStyle = "#1b130d"; ctx.fillRect(x - 6, b.y + 9, 12, 12); if (q.id) { ctx.fillStyle = st.planet ? rgba(127, 214, 200, 0.8) : rgba(170, 225, 220, 0.35); ctx.fillRect(x - 3, b.y + 6, 6, 12); } }); // l'Art de la Guilde : tous ensemble, seulement quand tous sont justes
  lamp(ctx, b.x + b.w - 14, b.y + 14, st.planet ? "green" : lit("cry"));
}

/** Gros plan I en mode Guilde : le râtelier des glyphes connus (par rangées de huit, ‹ ›), quatre logements. */
function closeCryGuild(r, ctx, st, cl, t, c) {
  const s = st.settings, hand = st.hand, ids = st.world ? GI.crystalIds(st.world) : [], slots = GI.slotsOf(st.g.cry, ids);
  room(ctx, c, t); bench(ctx, c, 186);
  drawScreen(r, ctx, MINI, st, cl, t, c);
  plate(ctx, c, 24, 26, 360, 140);
  ctx.fillStyle = c("#1b130d"); ctx.font = "bold 13px serif"; ctx.fillText("I", 36, 46);
  for (let i = 0; i < GI.SLOTS; i++) {
    const x = 74 + i * 88, y = 146, q = slots[i], lifted = hand && hand.slot === i;
    ctx.fillStyle = "#120c08"; ctx.beginPath(); ctx.ellipse(x, y, 26, 7, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.5; ctx.stroke();
    const all = st.planet && q.id; // l'Art de la Guilde : les quatre s'allument ensemble, et seulement quand tous sont justes
    if (all) { const g = ctx.createRadialGradient(x, y, 2, x, y, 34); g.addColorStop(0, "rgba(127,214,200,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(x - 34, y - 34, 68, 68); }
    if (q.id) crystal(r, ctx, x, y - (lifted ? 16 : 2), 40, 92, q.id, all ? "ok" : 0, t, i);
    if (lifted) { ctx.strokeStyle = "rgba(240,184,96,0.8)"; ctx.setLineDash([3, 3]); ctx.strokeRect(x - 30, y - 128, 60, 136); ctx.setLineDash([]); }
    r.hot.push({ x: x - 34, y: y - 120, w: 68, h: 132, tip: s.lock ? tx(r).t("guild.lock.cry") : q.id ? `${q.id.replace(/_/g, " ")} — ${tx(r).t("cry.slot.back")}` : tx(r).t("guild.slot.empty"), imager: { slot: i } });
  }
  if (st.planet) { ctx.fillStyle = "#9fe6da"; ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillText(tx(r).t("guild.planet"), 204, 180, 340); ctx.textAlign = "left"; }
  // le râtelier : les glyphes connus, huit par rangée ; un cristal posé laisse sa cheville vide
  const rack = GI.rackOf(st.ages || [], st.cands), n = GI.pages(rack), shown = GI.rackPage(rack, st.g.page);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(18, 298, 604, 18); ctx.fillStyle = c("#4b3626"); ctx.fillRect(18, 294, 604, 6);
  shown.forEach((id, j) => {
    const x = 56 + j * 76, y = 296, placed = st.g.cry.includes(id), held = hand && hand.id === id && hand.slot == null;
    ctx.fillStyle = c("#6b5126"); ctx.fillRect(x - 3, y - 12, 6, 12);
    if (!placed) crystal(r, ctx, x, y - (held ? 22 : 4), 30, 70, id, held ? "half" : 0, t, j);
    r.hot.push({ x: x - 32, y: y - 92, w: 64, h: 100, tip: s.lock ? tx(r).t("guild.lock.cry") : placed ? `${id.replace(/_/g, " ")} — ${tx(r).t("cry.slot.back")}` : `${id.replace(/_/g, " ")} — ${tx(r).t("cry.rack.put")}`, imager: { rack: id } });
  });
  if (!rack.length) { ctx.fillStyle = "rgba(233,220,184,0.75)"; ctx.font = "italic 12px serif"; ctx.textAlign = "center"; ctx.fillText(tx(r).t("guild.rack.none"), W / 2, 270, 560); ctx.textAlign = "left"; }
  if (n > 1) {
    ctx.fillStyle = "#e0c27a"; ctx.font = "11px serif"; ctx.textAlign = "center"; ctx.fillText(`${st.g.page % n + 1} / ${n}`, W / 2, 196); ctx.textAlign = "left";
    for (const [x, sym, d] of [[10, "‹", -1], [W - 10, "›", 1]]) { ctx.fillStyle = rgba(224, 194, 122, 0.9); ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.fillText(sym, x, 268); ctx.textAlign = "left"; r.hot.push({ x: x - 10, y: 240, w: 20, h: 40, tip: d < 0 ? tx(r).t("guild.rack.prev") : tx(r).t("guild.rack.next"), imager: { rackPage: d } }); }
  }
  backStrip(r, ctx);
}

// ---- I. le râtelier à cristaux -----------------------------------------------------------------------
function closeCry(r, ctx, st, cl, t, c) {
  const s = st.settings, tg = st.target, C = tg && tg.crystals, hand = st.hand;
  room(ctx, c, t); bench(ctx, c, 186);
  drawScreen(r, ctx, MINI, st, cl, t, c);
  // la plaque aux quatre logements
  plate(ctx, c, 24, 26, 360, 140);
  ctx.fillStyle = c("#1b130d"); ctx.font = "bold 13px serif"; ctx.fillText("I", 36, 46);
  for (let i = 0; i < 4; i++) {
    const x = 74 + i * 88, y = 146, opt = s.cry[i], id = C && opt >= 0 ? C.options[opt] : null, ok = !!id && I.crystalOk(tg, opt), half = false, lifted = hand && hand.slot === i; // l'ordre ne compte pas : un bon cristal s'allume où qu'il soit
    ctx.fillStyle = "#120c08"; ctx.beginPath(); ctx.ellipse(x, y, 26, 7, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.5; ctx.stroke();
    if (ok || half) { const g = ctx.createRadialGradient(x, y, 2, x, y, 34); g.addColorStop(0, ok ? "rgba(127,214,200,0.45)" : "rgba(240,184,96,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(x - 34, y - 34, 68, 68); }
    if (C && id) crystal(r, ctx, x, y - (lifted ? 16 : 2), 40, 92, id, ok ? "ok" : 0, t, i);
    if (lifted) { ctx.strokeStyle = "rgba(240,184,96,0.8)"; ctx.setLineDash([3, 3]); ctx.strokeRect(x - 30, y - 128, 60, 136); ctx.setLineDash([]); }
    r.hot.push({ x: x - 34, y: y - 120, w: 68, h: 132, tip: s.lock ? tx(r).t("guild.lock.cry") : id ? `${id.replace(/_/g, " ")} — ${tx(r).t("cry.slot.back")}` : tx(r).t("guild.slot.empty"), imager: { slot: i } });
  }
  // le râtelier : les huit cristaux ; ceux qui sont posés laissent leur cheville vide
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(18, 298, 604, 18); ctx.fillStyle = c("#4b3626"); ctx.fillRect(18, 294, 604, 6);
  const n = C ? C.options.length : 8;
  for (let j = 0; j < n; j++) {
    const x = 56 + j * 76, y = 296, placed = s.cry.includes(j), held = hand && hand.opt === j && hand.slot == null;
    ctx.fillStyle = c("#6b5126"); ctx.fillRect(x - 3, y - 12, 6, 12); // la cheville
    if (C && !placed) crystal(r, ctx, x, y - (held ? 22 : 4), 30, 70, C.options[j], held ? "half" : 0, t, j);
    r.hot.push({ x: x - 32, y: y - 92, w: 64, h: 100, tip: s.lock ? tx(r).t("guild.lock.cry") : placed ? tx(r).t("cry.slot.back") : (C ? C.options[j].replace(/_/g, " ") + " — " : "") + tx(r).t("cry.rack.put"), imager: { rack: j } });
  }
  backStrip(r, ctx);
}

// ---- II. le banc optique -----------------------------------------------------------------------------
const RAIL = { x0: 78, x1: 566 }; // de la lampe (à droite) au prisme (à gauche)
function closeLens(r, ctx, st, cl, t, c) {
  const s = st.settings, tg = st.target, L = st.guild ? st.light : tg && tg.lens; // mode Guilde : la lumière que renvoie le télescope (sinon, le noir)
  room(ctx, c, t); bench(ctx, c, 176);
  drawScreen(r, ctx, MINI, st, cl, t, c);
  // le comparateur : deux demi-champs dans un oculaire de laiton
  const O = { x: 104, y: 86, r: 54 };
  const rg = ctx.createRadialGradient(O.x - 14, O.y - 18, 4, O.x, O.y, O.r + 12); rg.addColorStop(0, c("#c9a24e")); rg.addColorStop(0.6, c("#6b5126")); rg.addColorStop(1, c("#3b2a1b"));
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(O.x, O.y, O.r + 12, 0, 6.283); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(O.x, O.y, O.r, 0, 6.283); ctx.clip();
  const tcol = L ? L.rgb : [30, 30, 30], mx = Math.max(1, s.r, s.g, s.b), mine = [s.r, s.g, s.b].map((v) => Math.round((255 * v) / mx)), dim = (col, iris) => col.map((v) => v * (0.35 + 0.65 * (1 - Math.abs(iris - 12) / 24)));
  ctx.fillStyle = rgba(...dim(tcol, L ? L.iris : 12).map(Math.round), 1); ctx.fillRect(O.x - O.r, O.y - O.r, O.r, O.r * 2);
  ctx.fillStyle = rgba(...dim(mine, s.iris).map(Math.round), 1); ctx.fillRect(O.x, O.y - O.r, O.r, O.r * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(O.x - 1, O.y - O.r, 2, O.r * 2);
  const vg = ctx.createRadialGradient(O.x, O.y, O.r * 0.5, O.x, O.y, O.r); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)"); ctx.fillStyle = vg; ctx.fillRect(O.x - O.r, O.y - O.r, O.r * 2, O.r * 2);
  ctx.restore();
  r.hot.push({ x: O.x - O.r, y: O.y - O.r, w: O.r * 2, h: O.r * 2, tip: st.guild ? (L ? tx(r).t("guild.comp.lit") : tx(r).t("guild.comp.dark")) : "Comparator — left: the star's light · right: your beam" });
  // l'iris à lamelles et son levier sur un arc
  const Ir = { x: 296, y: 100, r: 50 }, open = 6 + (s.iris / I.MAX) * 34;
  ctx.fillStyle = c("#3b2a1b"); ctx.beginPath(); ctx.arc(Ir.x, Ir.y, Ir.r + 8, 0, 6.283); ctx.fill();
  ctx.fillStyle = "#05070a"; ctx.beginPath(); ctx.arc(Ir.x, Ir.y, Ir.r, 0, 6.283); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(Ir.x, Ir.y, Ir.r, 0, 6.283); ctx.clip();
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + s.iris * 0.04; ctx.fillStyle = i % 2 ? c("#4b4a48") : c("#3a3936"); ctx.beginPath(); ctx.moveTo(Ir.x + Math.cos(a) * open, Ir.y + Math.sin(a) * open); ctx.lineTo(Ir.x + Math.cos(a) * Ir.r * 1.4, Ir.y + Math.sin(a) * Ir.r * 1.4); ctx.lineTo(Ir.x + Math.cos(a + 0.9) * Ir.r * 1.4, Ir.y + Math.sin(a + 0.9) * Ir.r * 1.4); ctx.lineTo(Ir.x + Math.cos(a + 0.75) * open, Ir.y + Math.sin(a + 0.75) * open); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 0.8; ctx.stroke(); }
  ctx.restore();
  const arc = (v) => Math.PI * 1.15 + (v / I.MAX) * Math.PI * 0.7, AR = Ir.r + 20;
  ctx.strokeStyle = c("#1b130d"); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(Ir.x, Ir.y, AR, arc(0), arc(I.MAX)); ctx.stroke();
  ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; for (let v = 0; v <= I.MAX; v += 4) { const a = arc(v); ctx.beginPath(); ctx.moveTo(Ir.x + Math.cos(a) * (AR + 4), Ir.y + Math.sin(a) * (AR + 4)); ctx.lineTo(Ir.x + Math.cos(a) * (AR + 9), Ir.y + Math.sin(a) * (AR + 9)); ctx.stroke(); }
  const ia = arc(s.iris); ctx.strokeStyle = c("#b8913f"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Ir.x + Math.cos(ia) * (Ir.r + 4), Ir.y + Math.sin(ia) * (Ir.r + 4)); ctx.lineTo(Ir.x + Math.cos(ia) * (AR + 6), Ir.y + Math.sin(ia) * (AR + 6)); ctx.stroke();
  ctx.fillStyle = c("#e0c27a"); ctx.beginPath(); ctx.arc(Ir.x + Math.cos(ia) * (AR + 7), Ir.y + Math.sin(ia) * (AR + 7), 4.5, 0, 6.283); ctx.fill();
  number(r, ctx, s.iris, Ir.x, Ir.y + Ir.r + 10, 14);
  for (let v = 0; v <= I.MAX; v++) { const a = arc(v), x = Ir.x + Math.cos(a) * AR, y = Ir.y + Math.sin(a) * AR; r.hot.push({ x: x - 7, y: y - 9, w: 14, h: 18, tip: s.lock ? "Iris — held by the lock" : LABEL.iris, imager: { key: "iris", value: v } }); }
  // le banc : la lampe à droite envoie un rayon le long de chaque rail ; chaque verre teinte le rayon de sa couleur, d'autant plus
  // qu'il est avancé ; les trois rayons se rejoignent dans le prisme, à gauche, et le mélange monte jusqu'au comparateur
  const LAMP = { x: 584, y: 192, w: 36, h: 108 }, PRISM = { x: 46, y: 248 }, flick = 0.9 + 0.1 * Math.sin(t * 2.3);
  const lg = ctx.createLinearGradient(LAMP.x, 0, LAMP.x + LAMP.w, 0); lg.addColorStop(0, c("#7a5c28")); lg.addColorStop(1, c("#3b2a1b"));
  ctx.fillStyle = lg; ctx.fillRect(LAMP.x, LAMP.y, LAMP.w, LAMP.h); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1; ctx.strokeRect(LAMP.x + 0.5, LAMP.y + 0.5, LAMP.w - 1, LAMP.h - 1);
  for (let i = 0; i < 3; i++) { const y = 210 + i * 38, hg = ctx.createRadialGradient(LAMP.x, y, 0, LAMP.x, y, 16); hg.addColorStop(0, rgba(255, 244, 214, 0.95 * flick)); hg.addColorStop(1, rgba(255, 232, 180, 0)); ctx.fillStyle = hg; ctx.fillRect(LAMP.x - 16, y - 16, 32, 32); }
  for (const [i, key] of ["r", "g", "b"].entries()) {
    const y = 210 + i * 38, v = s[key], k = v / I.MAX, x = RAIL.x0 + k * (RAIL.x1 - RAIL.x0), G3 = GLASS[key];
    // le rail, gradué du sombre au saturé : on voit d'un coup d'œil où l'on en est
    const rg2 = ctx.createLinearGradient(RAIL.x0, 0, RAIL.x1, 0); rg2.addColorStop(0, c("#1b130d")); rg2.addColorStop(1, rgba(...G3.map((q) => q * 0.55), 1));
    ctx.fillStyle = rg2; ctx.fillRect(RAIL.x0 - 6, y + 6, RAIL.x1 - RAIL.x0 + 12, 4);
    ctx.fillStyle = c("#1b130d"); ctx.fillRect(RAIL.x0 - 6, y + 2, RAIL.x1 - RAIL.x0 + 12, 4);
    ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; for (let q = 0; q <= I.MAX; q++) { const gx = RAIL.x0 + (q / I.MAX) * (RAIL.x1 - RAIL.x0); ctx.beginPath(); ctx.moveTo(gx, y + 10); ctx.lineTo(gx, y + (q % 4 ? 13 : 16)); ctx.stroke(); }
    // le rayon : blanc de la lampe jusqu'au verre, puis de la couleur du verre (d'autant plus vive qu'il est avancé) jusqu'au prisme
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const wb = ctx.createLinearGradient(LAMP.x, 0, x, 0); wb.addColorStop(0, rgba(255, 244, 214, 0.5 * flick)); wb.addColorStop(1, rgba(255, 244, 214, 0.22 * flick)); ctx.fillStyle = wb; ctx.fillRect(x, y - 3, LAMP.x - x, 6);
    ctx.fillStyle = rgba(...G3, (0.12 + 0.6 * k) * flick); ctx.fillRect(PRISM.x + 8, y - 3, x - PRISM.x - 8, 6);
    ctx.restore();
    // le verre : un disque teinté dans sa monture de laiton, sur un chariot ; plus il est avancé, plus il est saturé
    ctx.fillStyle = c("#6b5126"); ctx.fillRect(x - 10, y + 1, 20, 7); ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(x - 2, y - 4, 4, 6);
    ctx.fillStyle = c("#b8913f"); ctx.beginPath(); ctx.arc(x, y - 14, 15, 0, 6.283); ctx.fill();
    const gg = ctx.createRadialGradient(x - 5, y - 19, 1, x, y - 14, 12); gg.addColorStop(0, rgba(255, 255, 255, 0.75)); gg.addColorStop(0.3, rgba(...G3, 0.35 + 0.6 * k)); gg.addColorStop(1, rgba(...G3.map((q) => q * (0.3 + 0.4 * k)), 0.95));
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y - 14, 12, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#e0c27a"); ctx.lineWidth = 1; ctx.stroke();
    number(r, ctx, v, x, y + 17, 10);
    for (let q = 0; q <= I.MAX; q++) { const gx = RAIL.x0 + (q / I.MAX) * (RAIL.x1 - RAIL.x0), hw = (RAIL.x1 - RAIL.x0) / I.MAX; r.hot.push({ x: gx - hw / 2, y: y - 32, w: hw, h: 50, tip: s.lock ? `${LABEL[key]} — held by the lock` : LABEL[key], imager: { key, value: q } }); }
  }
  // le prisme qui rassemble les trois rayons, et le mélange qui monte jusqu'au comparateur
  const mine3 = [s.r, s.g, s.b].map((v) => Math.round((255 * v) / Math.max(1, s.r, s.g, s.b))), lvl = 0.25 + 0.65 * (1 - Math.abs(s.iris - 12) / 24);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = rgba(...mine3, 0.35 * lvl * flick); ctx.beginPath(); ctx.moveTo(PRISM.x - 4, PRISM.y - 40); ctx.lineTo(PRISM.x + 10, PRISM.y - 40); ctx.lineTo(O.x + 10, O.y + O.r + 10); ctx.lineTo(O.x - 10, O.y + O.r + 10); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = c("#6b5126"); ctx.beginPath(); ctx.moveTo(PRISM.x - 14, PRISM.y + 48); ctx.lineTo(PRISM.x + 14, PRISM.y + 48); ctx.lineTo(PRISM.x + 14, PRISM.y - 48); ctx.closePath(); ctx.fill();
  const pg2 = ctx.createLinearGradient(PRISM.x - 10, 0, PRISM.x + 12, 0); pg2.addColorStop(0, rgba(220, 235, 255, 0.25)); pg2.addColorStop(1, rgba(...mine3, 0.45 * lvl)); ctx.fillStyle = pg2;
  ctx.beginPath(); ctx.moveTo(PRISM.x - 9, PRISM.y + 44); ctx.lineTo(PRISM.x + 11, PRISM.y + 44); ctx.lineTo(PRISM.x + 11, PRISM.y - 40); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c("#e0c27a"); ctx.lineWidth = 1; ctx.stroke();
  r.hot.push({ x: PRISM.x - 14, y: PRISM.y - 48, w: 28, h: 96, tip: tx(r).t("lens.prism") });
  // l'aide en mots (réglage « Aide aux lentilles ») : sous l'écran, ce que l'œil lit dans le comparateur
  if (L && (!r.opts.lensHints || r.opts.lensHints())) {
    const T = tx(r).t, cname = (k) => T(`lens.c.${k}`), parts = I.lensWords(s, L) || [];
    // une seule ligne, dans la bande libre entre le cadre de l'écran et le bord du banc : jamais sur l'écran
    const line = parts.map((p) => T(p.key, { c: p.vars.c ? cname(p.vars.c) : "" })).join(" ");
    ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillStyle = rgba(224, 194, 122, 0.9);
    ctx.fillText(line, MINI.x + MINI.w / 2, MINI.y + MINI.h + 26, MINI.w + 24);
    ctx.textAlign = "left";
  }
  backStrip(r, ctx);
}

// ---- III. le régulateur ------------------------------------------------------------------------------
function closeAtmo(r, ctx, st, cl, t, c, now) {
  const s = st.settings, tg = st.target;
  room(ctx, c, t); bench(ctx, c, 196);
  drawScreen(r, ctx, MINI, st, cl, t, c);
  // le tube cathodique : la trace du ciel (large, pâle), la trace du réglage (fine, vive)
  const T = { x: 34, y: 24, w: 340, h: 156 };
  plate(ctx, c, T.x - 14, T.y - 12, T.w + 28, T.h + 24);
  ctx.fillStyle = "#04120d"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(T.x, T.y, T.w, T.h, 14) : ctx.rect(T.x, T.y, T.w, T.h); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(T.x, T.y, T.w, T.h, 14) : ctx.rect(T.x, T.y, T.w, T.h); ctx.clip();
  ctx.strokeStyle = "rgba(60,140,100,0.25)"; ctx.lineWidth = 1; for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(T.x + (i * T.w) / 8, T.y); ctx.lineTo(T.x + (i * T.w) / 8, T.y + T.h); ctx.stroke(); } for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(T.x, T.y + (i * T.h) / 4); ctx.lineTo(T.x + T.w, T.y + (i * T.h) / 4); ctx.stroke(); }
  ctx.lineCap = "round";
  const asleep = st.guild && !st.planet, searching = asleep && GI.full(st.g.cry); // mode Guilde : la trace du ciel n'apparaît qu'une planète tenue ; quatre cristaux posés, le régulateur cherche
  if (tg && !asleep) { wavePath(ctx, tg, I.phaseAt(tg, now), T); ctx.strokeStyle = "rgba(90,220,150,0.28)"; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = "rgba(120,255,170,0.35)"; ctx.lineWidth = 2.5; ctx.stroke(); }
  const e = tg ? I.effective(s, tg, now) : s; wavePath(ctx, e, e.phase, T); ctx.strokeStyle = "rgba(190,255,210,0.95)"; ctx.lineWidth = 1.4; ctx.stroke();
  const gl = ctx.createRadialGradient(T.x + T.w * 0.3, T.y + T.h * 0.2, 4, T.x + T.w / 2, T.y + T.h / 2, T.w * 0.7); gl.addColorStop(0, "rgba(255,255,255,0.07)"); gl.addColorStop(1, "rgba(0,0,0,0.35)"); ctx.fillStyle = gl; ctx.fillRect(T.x, T.y, T.w, T.h);
  ctx.restore();
  if (asleep) { ctx.fillStyle = "rgba(120,255,170,0.45)"; ctx.font = "italic 12px serif"; ctx.textAlign = "center"; ctx.fillText(tx(r).t(searching ? "guild.tube.search" : "guild.tube.asleep"), T.x + T.w / 2, T.y + T.h - 14, T.w - 30); ctx.textAlign = "left"; }
  r.hot.push({ x: T.x, y: T.y, w: T.w, h: T.h, tip: searching ? tx(r).t("guild.tube.search.tip") : asleep ? tx(r).t("guild.tube.tip") : "Cathode tube — the Age's sky (wide trace) and your tuning (bright trace)" });
  // le voltmètre : la seule mesure du régulateur
  const M = { x: 560, y: 196, r: 40 }; plate(ctx, c, M.x - 52, M.y - 44, 104, 58, false);
  ctx.fillStyle = c("#e8dcc0"); ctx.beginPath(); ctx.arc(M.x, M.y, M.r, Math.PI * 1.1, Math.PI * 1.9); ctx.lineTo(M.x, M.y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2a14"; ctx.lineWidth = 1; for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.15 + 0.7 * (i / 10)); ctx.beginPath(); ctx.moveTo(M.x + Math.cos(a) * (M.r - 8), M.y + Math.sin(a) * (M.r - 8)); ctx.lineTo(M.x + Math.cos(a) * (M.r - 2), M.y + Math.sin(a) * (M.r - 2)); ctx.stroke(); }
  const ma = Math.PI * (1.15 + 0.7 * clamp(cl.atmo + 0.01 * Math.sin(t * 13) * (1 - cl.atmo))); ctx.strokeStyle = "#7a1d10"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(M.x, M.y); ctx.lineTo(M.x + Math.cos(ma) * (M.r - 4), M.y + Math.sin(ma) * (M.r - 4)); ctx.stroke();
  r.hot.push({ x: M.x - 50, y: M.y - 44, w: 100, h: 56, tip: "Voltmeter — how well the sky holds" });
  // l'inverseur de polarité et les quatre boutons
  const lx = 70, ly = 270, up = s.pol > 0;
  plate(ctx, c, lx - 26, ly - 46, 52, 84);
  ctx.fillStyle = c("#1b130d"); ctx.fillRect(lx - 6, ly - 30, 12, 50);
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(lx, ly - 4); ctx.lineTo(lx, up ? ly - 36 : ly + 28); ctx.stroke(); ctx.lineCap = "butt";
  const kg = ctx.createRadialGradient(lx - 2, (up ? ly - 38 : ly + 26), 1, lx, up ? ly - 36 : ly + 28, 9); kg.addColorStop(0, "#f3dca0"); kg.addColorStop(1, "#6b5126"); ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(lx, up ? ly - 36 : ly + 28, 8, 0, 6.283); ctx.fill();
  ctx.fillStyle = "#1b130d"; ctx.font = "bold 14px serif"; ctx.textAlign = "center"; ctx.fillText("+", lx + 16, ly - 30); ctx.fillText("−", lx + 16, ly + 32); ctx.textAlign = "left";
  r.hot.push({ x: lx - 28, y: ly - 48, w: 56, h: 88, tip: s.lock ? "Polarity — held by the lock" : LABEL.pol, imager: { key: "pol", delta: 0 } });
  for (const [i, key] of ["freq", "amp", "harm", "phase"].entries()) knob(r, ctx, key, 176 + i * 100, 266, s.lock && key === "phase" && tg ? I.phaseAt(tg, now) : s[key], key === "phase" ? I.TURN : I.MAX, c, 28, s.lock);
  backStrip(r, ctx);
}

/** Petite plaque de laiton en bas à droite : couper le bourdon (haut-parleur) ou régler son volume (cinq crans). */
function humPlate(r, ctx, c, onConsole = false) {
  const h = r.opts.imagerHum ? r.opts.imagerHum() : { on: true, vol: 1 }, x = onConsole ? 528 : W - 100, y = onConsole ? 276 : 334, w = 92, hh = onConsole ? 18 : 22;
  plate(ctx, c, x, y, w, hh, false);
  const on = h.on && h.vol > 0; ctx.save(); if (onConsole) ctx.translate(0, -2);
  ctx.fillStyle = c("#1b130d"); ctx.beginPath(); ctx.moveTo(x + 8, y + 9); ctx.lineTo(x + 12, y + 9); ctx.lineTo(x + 17, y + 5); ctx.lineTo(x + 17, y + 17); ctx.lineTo(x + 12, y + 13); ctx.lineTo(x + 8, y + 13); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c("#1b130d"); ctx.lineWidth = 1.4;
  if (on) { for (const k of [1, 2]) { ctx.beginPath(); ctx.arc(x + 17, y + 11, 3 + k * 2.4, -0.9, 0.9); ctx.stroke(); } }
  else { ctx.beginPath(); ctx.moveTo(x + 21, y + 7); ctx.lineTo(x + 29, y + 15); ctx.moveTo(x + 29, y + 7); ctx.lineTo(x + 21, y + 15); ctx.stroke(); }
  ctx.fillStyle = c("#1b130d"); ctx.font = "bold 12px serif"; ctx.textAlign = "center"; ctx.fillText("−", x + 40, y + 15); ctx.fillText("+", x + w - 8, y + 15); ctx.textAlign = "left";
  for (let i = 0; i < 5; i++) { ctx.fillStyle = on && i < Math.round(h.vol * 5) ? c("#f2d27a") : c("#3b2a1b"); ctx.fillRect(x + 48 + i * 7, y + 8 + (4 - i) * 0.0, 4, 6 + i); }
  ctx.restore();
  r.hot.push({ x, y, w: 30, h: hh, tip: on ? "Hum: on (click to mute)" : "Hum: off (click to restore)", imager: { hum: { toggle: true } } });
  r.hot.push({ x: x + 33, y, w: 14, h: hh, tip: "Hum quieter", imager: { hum: { delta: -1 } } });
  r.hot.push({ x: x + w - 14, y, w: 14, h: hh, tip: "Hum louder", imager: { hum: { delta: 1 } } });
}

function drawImagerRoom(r, ctx, sc, sky, t) {
  const st = r.imagerState(), amb = 0.65 + 0.35 * sky.ambient, c = (h) => mix("#05060c", h, amb), now = r.imagerNow();
  const tg = st.target, cl = tg ? I.clarity(st.settings, tg, now) : { cry: 0, lens: 0, atmo: 0, total: 0 };
  r.imagerT = t;
  if (st.station === "cry") (st.guild ? closeCryGuild : closeCry)(r, ctx, st, cl, t, c);
  else if (st.station === "lens") closeLens(r, ctx, st, cl, t, c);
  else if (st.station === "atmo") closeAtmo(r, ctx, st, cl, t, c, now);
  else overview(r, ctx, st, cl, t, c, now);
  if (r.opts.onImagerTune && !(Math.abs(t - (r.imagerTunedAt || -9)) < 1)) { r.imagerTunedAt = t; r.opts.onImagerTune(st); } // la phase dérive : le bourdon suit, une fois par seconde
  humPlate(r, ctx, c, !st.station); // vue d'ensemble : sur la console, avec le reste ; gros plans : en bas à droite
  const S = st.station ? MINI : SCREEN, k = cl.total;
  const lg2 = ctx.createRadialGradient(S.x + S.w / 2, S.y + S.h / 2, 30, S.x + S.w / 2, S.y + S.h / 2, 420); lg2.addColorStop(0, rgba(127, 214, 200, 0.03 + 0.08 * k)); lg2.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = lg2; ctx.fillRect(0, 0, W, H);
  const vgr = ctx.createRadialGradient(W / 2, H / 2, 180, W / 2, H / 2, 430); vgr.addColorStop(0, "rgba(0,0,0,0)"); vgr.addColorStop(1, "rgba(0,0,0,0.4)"); ctx.fillStyle = vgr; ctx.fillRect(0, 0, W, H);
}

/**
 * Peint la vue de l'Âge à l'heure de l'Âge (un monde figé ne bouge pas) dans `canvas` (300 × 176) : de face, ou, le
 * périscope libre, dans la direction `look.az` et l'inclinaison `look.tilt`. `sq` : un canvas carré pour le zénith.
 */
function paintView(canvas, model, target, t, now, look = null, sq = null) {
  const g = canvas.getContext("2d"); if (!g || !model) return null;
  const hours = target && target.hours ? target.hours : 24, day = frac(now / (hours * 3600000)), o = { day, clock: t, season: 0 };
  const az = look ? look.az || 0 : 0, tilt = look ? look.tilt || 0 : 0;
  if (tilt > 0 && sq) { // le zénith tourne avec l'azimut
    V.paintZenith(sq.getContext("2d"), model, frac(t / 8), o);
    g.save(); g.fillStyle = "#000"; g.fillRect(0, 0, canvas.width, canvas.height); g.translate(canvas.width / 2, canvas.height / 2); g.rotate((az * Math.PI) / 2); g.drawImage(sq, -sq.width / 2, -sq.height / 2); g.restore();
  } else V.paintLook(g, model, frac(t / 8), o, az, tilt > 0 ? 0 : tilt);
  return canvas;
}

module.exports = { drawImagerRoom, paintView, wavePath, formed, STATIONS, SCREEN, MINI, LOCK, CRANK, TILT, TRANSCRIBE, W, H };
