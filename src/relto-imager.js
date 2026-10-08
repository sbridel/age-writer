"use strict";
// L'Imageur du Relto : une chambre de pierre froide. À gauche, le lutrin où l'on pose le livre d'un Âge ; au milieu,
// l'instrument rond (ce qu'il montre dépend du réglage choisi) ; à droite, l'ÉCRAN où l'Âge apparaît, projeté par un
// petit cristal ; en bas, la console : trois plaques pour choisir le réglage (I cristaux, II lentilles, III atmosphère),
// chacune avec son voyant, puis les commandes du réglage choisi, et la jauge de netteté. Voir src/imager.js.
// Tout est dessiné ici, en coordonnées logiques 640 × 360 ; les zones cliquables portent `imager: …`.
const { rng, clamp, mix, rgba, frac } = require("./util");
const I = require("./imager");
const G = require("./genscene");
const W = 640, H = 360, FLOOR = 300;
const SCOPE = { x: 206, y: 112, r: 62 }, SCREEN = { x: 300, y: 20, w: 320, h: 186 }, GAUGE = { x: 584, y: 264, r: 26 };
const STAGES = [["cry", "I", "Crystals"], ["lens", "II", "Lenses"], ["atmo", "III", "Atmosphere"]];
const LABEL = { freq: "Frequency dial", amp: "Amplitude dial", harm: "Harmonic ring", phase: "Phase wheel", pol: "Polarity lever", r: "Red lens", g: "Green lens", b: "Blue lens", iris: "Iris" };
const LENS_TINT = { r: [230, 70, 60], g: [80, 200, 110], b: [80, 120, 240] };

/** L'onde d'un ciel (ou d'un réglage) sur l'instrument rond : `s` = { pol, freq, amp, harm }, `phase` de 0 à 25. */
function wavePath(ctx, s, phase, sc) {
  const cycles = 0.75 + s.freq * 0.25, A = (6 + s.amp * 2.4) * (sc.r / 78), h = s.harm / 24, ph = (phase / I.TURN) * Math.PI * 2;
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const x = sc.x - sc.r + (i / 64) * sc.r * 2, u = (i / 64) * Math.PI * 2 * cycles + ph;
    const y = sc.y - s.pol * (A * Math.sin(u) + A * 0.35 * h * Math.sin(3 * u + ph));
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
}

/** Valeur en chiffres D'ni (ou en chiffres, faute de mieux). */
function number(r, ctx, v, x, y, size = 13) {
  if (r.dni && r.dni.drawNumber) r.dni.drawNumber(ctx, Math.floor(v), x - size * 0.6, y, size, "#e0c27a");
  else { ctx.fillStyle = "#e0c27a"; ctx.font = `${size}px serif`; ctx.textAlign = "center"; ctx.fillText(String(Math.floor(v)), x, y + size); ctx.textAlign = "left"; }
}

/** Un bouton rond (laiton, ou verre teinté pour une lentille) avec son index ; moitié gauche « − », moitié droite « + ». */
function dial(r, ctx, key, x, y, value, max, c, tint) {
  const R = 17, a = -Math.PI * 0.75 + (value / max) * Math.PI * 1.5;
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(x, y + R + 3, R * 0.9, 4, 0, 0, 6.283); ctx.fill();
  const g = ctx.createRadialGradient(x - 6, y - 7, 2, x, y, R);
  if (tint) { g.addColorStop(0, rgba(255, 255, 255, 0.85)); g.addColorStop(0.35, rgba(...tint, 0.85)); g.addColorStop(1, rgba(...tint.map((v) => v * 0.35), 0.95)); }
  else { g.addColorStop(0, c("#f3dca0")); g.addColorStop(0.55, c("#b8913f")); g.addColorStop(1, c("#5a4322")); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
  ctx.strokeStyle = tint ? c("#c9a24e") : c("#3a2a14"); ctx.lineWidth = tint ? 2 : 1;
  if (tint) { ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.stroke(); } // monture de la lentille
  else for (let i = 0; i < 18; i++) { const q = (i / 18) * 6.283; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (R - 3), y + Math.sin(q) * (R - 3)); ctx.lineTo(x + Math.cos(q) * R, y + Math.sin(q) * R); ctx.stroke(); } // moletage
  ctx.strokeStyle = c("#1b130d"); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (R - 5), y + Math.sin(a) * (R - 5)); ctx.stroke();
  ctx.strokeStyle = rgba(201, 162, 78, 0.6); ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) { const q = -Math.PI * 0.75 + (i / 8) * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (R + 3), y + Math.sin(q) * (R + 3)); ctx.lineTo(x + Math.cos(q) * (R + 6), y + Math.sin(q) * (R + 6)); ctx.stroke(); }
  number(r, ctx, value, x, y + R + 8);
  r.hot.push({ x: x - R - 4, y: y - R - 4, w: R + 4, h: R * 2 + 8, tip: `${LABEL[key]} −`, imager: { key, delta: -1 } });
  r.hot.push({ x, y: y - R - 4, w: R + 4, h: R * 2 + 8, tip: `${LABEL[key]} +`, imager: { key, delta: 1 } });
}

/** Un cristal dans son logement : la page qu'il porte (glyphe de l'Âge, ou son nom faute d'image). */
function crystalSlot(r, ctx, i, x, y, id, c, t, right) {
  const w = 36, h = 46;
  ctx.fillStyle = c("#1b130d"); ctx.fillRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8); ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8);
  const hex = () => { ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y - h / 4); ctx.lineTo(x + w / 2, y + h / 4); ctx.lineTo(x, y + h / 2); ctx.lineTo(x - w / 2, y + h / 4); ctx.lineTo(x - w / 2, y - h / 4); ctx.closePath(); };
  const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2); g.addColorStop(0, rgba(200, 240, 235, 0.35)); g.addColorStop(1, rgba(60, 120, 130, 0.25));
  hex(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(200, 240, 235, 0.6); ctx.lineWidth = 1; ctx.stroke();
  if (right) { ctx.save(); hex(); ctx.clip(); ctx.fillStyle = rgba(127, 214, 200, 0.18 + 0.08 * Math.sin(t * 3 + i)); ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.restore(); }
  const img = r.opts.glyphImage ? r.opts.glyphImage(id) : null;
  if (img && img.complete !== false && img.width) ctx.drawImage(img, x - 14, y - 14, 28, 28);
  else { ctx.fillStyle = "#e0c27a"; ctx.font = "8px serif"; ctx.textAlign = "center"; ctx.fillText(String(id).replace(/_/g, " ").slice(0, 10), x, y + 3); ctx.textAlign = "left"; }
  r.hot.push({ x: x - w / 2 - 4, y: y - h / 2 - 4, w: w / 2 + 4, h: h + 8, tip: "Previous crystal", imager: { key: "cry" + i, delta: -1 } });
  r.hot.push({ x, y: y - h / 2 - 4, w: w / 2 + 4, h: h + 8, tip: "Next crystal", imager: { key: "cry" + i, delta: 1 } });
}

function drawImagerRoom(r, ctx, sc, sky, t) {
  const st = r.imagerState(), amb = 0.65 + 0.35 * sky.ambient, c = (h) => mix("#05060c", h, amb), now = r.imagerNow();
  const tg = st.target, s = st.settings, cl = tg ? I.clarity(s, tg, now) : { cry: 0, lens: 0, atmo: 0, total: 0 }, k = cl.total, stage = st.stage || 0;
  // la chambre : pierre froide, une fente haute où passe une aurore
  const wg = ctx.createLinearGradient(0, 0, 0, FLOOR); wg.addColorStop(0, c("#232b35")); wg.addColorStop(1, c("#161c23")); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, FLOOR);
  const q = rng(0x1a6e); ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
  for (let y = 18; y < FLOOR; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); for (let x = (y / 26) % 2 ? 0 : 30; x < W; x += 60 + q() * 10) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26); ctx.stroke(); } }
  ctx.fillStyle = "#06080c"; ctx.fillRect(120, 10, 40, 6);
  const ag = ctx.createLinearGradient(120, 10, 160, 10); ag.addColorStop(0, rgba(80, 220, 160, 0.18 + 0.1 * Math.sin(t * 0.7))); ag.addColorStop(1, rgba(150, 120, 230, 0.22)); ctx.fillStyle = ag; ctx.fillRect(122, 11, 36, 4);
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#2e343c")); fg.addColorStop(1, c("#171a1f")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = c("#0d1014"); ctx.fillRect(0, FLOOR - 3, W, 4);
  ctx.fillStyle = c("#0b0d11"); ctx.fillRect(10, 150, 24, FLOOR - 150); ctx.strokeStyle = c("#3a4048"); ctx.strokeRect(10, 150, 24, FLOOR - 150);
  r.hot.push({ x: 8, y: 148, w: 28, h: FLOOR - 146, tip: "Door — back outside", go: "island" });

  // L'ÉCRAN : cadre de laiton rivé, verre légèrement bombé ; l'Âge y apparaît
  const S = SCREEN;
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(S.x - 6, S.y + 6, S.w + 14, S.h + 14);
  const fr = ctx.createLinearGradient(S.x, S.y, S.x + S.w, S.y + S.h); fr.addColorStop(0, c("#c9a24e")); fr.addColorStop(0.5, c("#7a5c28")); fr.addColorStop(1, c("#b8913f"));
  ctx.fillStyle = fr; ctx.fillRect(S.x - 10, S.y - 10, S.w + 20, S.h + 20);
  ctx.fillStyle = c("#3b2a1b"); for (const [x, y] of [[S.x - 5, S.y - 5], [S.x + S.w + 5, S.y - 5], [S.x - 5, S.y + S.h + 5], [S.x + S.w + 5, S.y + S.h + 5], [S.x + S.w / 2, S.y - 5], [S.x + S.w / 2, S.y + S.h + 5]]) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.283); ctx.fill(); } // rivets
  ctx.fillStyle = "#060a0b"; ctx.fillRect(S.x, S.y, S.w, S.h);
  ctx.save(); ctx.beginPath(); ctx.rect(S.x, S.y, S.w, S.h); ctx.clip();
  const view = st.view && r.imagerView(st, t);
  if (view && cl.atmo > 0.02) {
    const ghost = (1 - cl.cry) * 14; // cristaux faux : l'image se dédouble
    ctx.globalAlpha = (0.2 + 0.8 * cl.atmo) * (ghost > 1 ? 0.6 : 1);
    try { ctx.filter = `blur(${((1 - cl.atmo) * 6 + (1 - cl.cry) * 1.5).toFixed(1)}px) saturate(${(0.25 + 0.75 * cl.atmo).toFixed(2)})`; } catch (e) { /* filtre absent */ }
    ctx.drawImage(view, S.x, S.y, S.w, S.h);
    if (ghost > 1) { ctx.globalAlpha = 0.45 * (0.2 + 0.8 * cl.atmo); ctx.drawImage(view, S.x + ghost, S.y - ghost * 0.4, S.w, S.h); }
    try { ctx.filter = "none"; } catch (e) { /* filtre absent */ }
    ctx.globalAlpha = 1;
    if (cl.lens < 0.995) { // lentilles fausses : la lumière du faisceau teinte l'image
      const sum = Math.max(1, s.r + s.g + s.b), beam = [s.r, s.g, s.b].map((v) => Math.round(70 + (185 * v * 3) / (sum * 1.6)));
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = rgba(...beam.map((v) => Math.min(255, v)), 0.75 * (1 - cl.lens)); ctx.fillRect(S.x, S.y, S.w, S.h); ctx.restore();
      ctx.fillStyle = rgba(0, 0, 0, 0.35 * Math.min(1, Math.abs(s.iris - (tg && tg.lens ? tg.lens.iris : s.iris)) / 12)); ctx.fillRect(S.x, S.y, S.w, S.h); // iris trop ouvert ou trop fermé
    }
  }
  const nz = rng(Math.floor(t * 12)); ctx.fillStyle = rgba(170, 230, 220, 0.3 * (1 - cl.atmo)); for (let i = 0; i < 260 * (1 - cl.atmo); i++) ctx.fillRect(S.x + nz() * S.w, S.y + nz() * S.h, 1.4, 1.4); // neige
  ctx.strokeStyle = rgba(127, 214, 200, 0.12 * (1 - k)); for (let y = S.y; y < S.y + S.h; y += 4) { ctx.beginPath(); ctx.moveTo(S.x, y + frac(t) * 4); ctx.lineTo(S.x + S.w, y + frac(t) * 4); ctx.stroke(); } // lignes de balayage
  const gl = ctx.createLinearGradient(S.x, S.y, S.x + S.w * 0.6, S.y + S.h); gl.addColorStop(0, "rgba(255,255,255,0.10)"); gl.addColorStop(0.4, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fillRect(S.x, S.y, S.w, S.h); // reflet du verre
  const vg = ctx.createRadialGradient(S.x + S.w / 2, S.y + S.h / 2, S.h * 0.4, S.x + S.w / 2, S.y + S.h / 2, S.w * 0.65); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = vg; ctx.fillRect(S.x, S.y, S.w, S.h);
  ctx.restore();
  r.hot.push({ x: S.x, y: S.y, w: S.w, h: S.h, tip: k > 0.9 && st.age ? st.age.name : "The screen" });

  // le petit cristal qui projette sur l'écran (un faisceau pâle monte vers le verre)
  const cx = 280, cy = 214;
  const beam = ctx.createLinearGradient(cx, cy, S.x + 40, S.y + S.h); beam.addColorStop(0, rgba(127, 214, 200, 0.12 + 0.25 * k)); beam.addColorStop(1, "rgba(127,214,200,0)");
  ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(cx - 3, cy - 8); ctx.lineTo(S.x + 6, S.y + S.h - 30); ctx.lineTo(S.x + 60, S.y + S.h); ctx.lineTo(cx + 3, cy - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(160, 230, 220, 0.55 + 0.3 * k); ctx.beginPath(); ctx.moveTo(cx, cy - 16); ctx.lineTo(cx + 6, cy - 8); ctx.lineTo(cx, cy); ctx.lineTo(cx - 6, cy - 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#8a6a2e"); ctx.fillRect(cx - 7, cy, 14, 8);

  // le lutrin : le livre de l'Âge visé ; ‹ › pour changer de livre
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

  // l'instrument rond : ce qu'il montre dépend du réglage choisi
  const O = SCOPE, rg = ctx.createRadialGradient(O.x - 18, O.y - 22, 4, O.x, O.y, O.r + 9); rg.addColorStop(0, c("#c9a24e")); rg.addColorStop(0.6, c("#6b5126")); rg.addColorStop(1, c("#3b2a1b"));
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(O.x, O.y, O.r + 9, 0, 6.283); ctx.fill();
  const sg = ctx.createRadialGradient(O.x, O.y, 0, O.x, O.y, O.r); sg.addColorStop(0, "#0f2a28"); sg.addColorStop(1, "#061312"); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(O.x, O.y, O.r, 0, 6.283); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(O.x, O.y, O.r - 1, 0, 6.283); ctx.clip();
  if (stage === 2) { // III. les deux ondes
    ctx.strokeStyle = "#173c38"; ctx.lineWidth = 1; for (const d of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(O.x - O.r, O.y + d * O.r); ctx.lineTo(O.x + O.r, O.y + d * O.r); ctx.stroke(); ctx.beginPath(); ctx.moveTo(O.x + d * O.r, O.y - O.r); ctx.lineTo(O.x + d * O.r, O.y + O.r); ctx.stroke(); }
    ctx.lineCap = "round";
    if (tg) { wavePath(ctx, tg, I.phaseAt(tg, now), O); ctx.strokeStyle = "rgba(127,214,200,0.75)"; ctx.lineWidth = 2.4; ctx.stroke(); }
    wavePath(ctx, s, s.phase, O); ctx.strokeStyle = "#f0b860"; ctx.lineWidth = 1.8; ctx.stroke();
  } else if (stage === 1) { // II. le champ partagé : à gauche la lumière de l'étoile, à droite celle du faisceau ; les anneaux de l'iris
    const L = tg && tg.lens, tcol = L ? L.rgb : [40, 40, 40], sum = Math.max(1, s.r, s.g, s.b), mine = [s.r, s.g, s.b].map((v) => Math.round((255 * v) / sum));
    ctx.fillStyle = rgba(...tcol, 0.9); ctx.fillRect(O.x - O.r, O.y - O.r, O.r, O.r * 2);
    ctx.fillStyle = rgba(...mine, 0.9); ctx.fillRect(O.x, O.y - O.r, O.r, O.r * 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(O.x - 1, O.y - O.r, 2, O.r * 2);
    if (L) { ctx.setLineDash([4, 3]); ctx.strokeStyle = "rgba(10,30,30,0.85)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(O.x, O.y, 6 + (L.iris / 24) * (O.r - 10), Math.PI / 2, Math.PI * 1.5); ctx.stroke(); ctx.setLineDash([]); }
    ctx.strokeStyle = "rgba(40,20,0,0.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(O.x, O.y, 6 + (s.iris / 24) * (O.r - 10), -Math.PI / 2, Math.PI / 2); ctx.stroke();
  } else { // I. la rosace de résonance : un pétale par cristal ; juste = vert d'eau, bonne page mal placée = ambre
    const C = tg && tg.crystals, n = C ? C.ids.length : 4;
    for (let i = 0; i < n; i++) {
      const pick = C ? C.options[s.cry[i]] : null, ok = C && pick === C.ids[i], half = C && !ok && C.ids.includes(pick), a = t * 0.3 + (i / n) * Math.PI * 2, jit = ok ? 0 : Math.sin(t * 9 + i) * 0.12;
      ctx.fillStyle = ok ? "rgba(127,214,200,0.85)" : half ? "rgba(240,184,96,0.6)" : "rgba(80,110,110,0.35)";
      ctx.beginPath(); ctx.ellipse(O.x + Math.cos(a + jit) * O.r * 0.42, O.y + Math.sin(a + jit) * O.r * 0.42, O.r * 0.36, O.r * 0.14, a + jit, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = cl.cry > 0.99 ? "#7fd6c8" : "#3a5050"; ctx.beginPath(); ctx.arc(O.x, O.y, 5, 0, 6.283); ctx.fill();
  }
  ctx.restore();
  r.hot.push({ x: O.x - O.r, y: O.y - O.r, w: O.r * 2, h: O.r * 2, tip: stage === 2 ? "The Age's sky (green) and your tuning (amber)" : stage === 1 ? "Left: the star's light · right: your beam" : "Resonance of the crystals" });

  // la console
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(130, 228, 500, 72); ctx.fillStyle = c("#5a4322"); ctx.fillRect(126, 222, 508, 8);
  ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; ctx.strokeRect(130, 228, 500, 72);
  // trois plaques : I, II, III, chacune avec son voyant
  STAGES.forEach(([key, roman], i) => {
    const x = 150, y = 238 + i * 20, on = stage === i, lit = cl[key] > 0.9;
    ctx.fillStyle = on ? c("#c9a24e") : c("#5a4322"); ctx.fillRect(x - 12, y, 40, 16);
    ctx.fillStyle = on ? "#1b130d" : "#e0c27a"; ctx.font = "bold 11px serif"; ctx.textAlign = "center"; ctx.fillText(roman, x + 4, y + 12); ctx.textAlign = "left";
    ctx.fillStyle = lit ? "#7fd6c8" : "#2a2016"; ctx.beginPath(); ctx.arc(x + 36, y + 8, 4, 0, 6.283); ctx.fill();
    if (lit) { ctx.fillStyle = "rgba(127,214,200,0.3)"; ctx.beginPath(); ctx.arc(x + 36, y + 8, 8, 0, 6.283); ctx.fill(); }
    r.hot.push({ x: x - 14, y: y - 1, w: 58, h: 18, tip: STAGES[i][2], imager: { stage: i } });
  });
  // les commandes du réglage choisi
  if (stage === 0) {
    const C = tg && tg.crystals, n = C ? C.ids.length : 4;
    for (let i = 0; i < n; i++) crystalSlot(r, ctx, i, 260 + i * 70, 262, C ? C.options[s.cry[i]] : "", c, t, C && C.options[s.cry[i]] === C.ids[i]);
  } else if (stage === 1) {
    for (const [i, key] of ["r", "g", "b"].entries()) dial(r, ctx, key, 262 + i * 68, 256, s[key], I.MAX, c, LENS_TINT[key]);
    dial(r, ctx, "iris", 478, 256, s.iris, I.MAX, c, null);
  } else {
    const lx = 226, ly = 262, up = s.pol > 0;
    ctx.fillStyle = c("#1b130d"); ctx.fillRect(lx - 13, ly - 4, 26, 30);
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(lx, ly + 18); ctx.lineTo(lx + (up ? 10 : -10), ly - 16); ctx.stroke();
    const kg = ctx.createRadialGradient(lx + (up ? 9 : -11), ly - 19, 1, lx + (up ? 10 : -10), ly - 18, 7); kg.addColorStop(0, "#f3dca0"); kg.addColorStop(1, "#6b5126"); ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(lx + (up ? 10 : -10), ly - 18, 6, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#e0c27a"; ctx.font = "13px serif"; ctx.textAlign = "center"; ctx.fillText("−", lx - 18, ly + 34); ctx.fillText("+", lx + 18, ly + 34); ctx.textAlign = "left";
    r.hot.push({ x: lx - 22, y: ly - 28, w: 44, h: 66, tip: LABEL.pol, imager: { key: "pol", delta: 0 } });
    for (const [i, key] of ["freq", "amp", "harm", "phase"].entries()) dial(r, ctx, key, 288 + i * 66, 256, s[key], key === "phase" ? I.TURN : I.MAX, c, null);
  }
  // la jauge de netteté (les trois réglages ensemble)
  const Gg = GAUGE; ctx.fillStyle = c("#1b130d"); ctx.beginPath(); ctx.arc(Gg.x, Gg.y, Gg.r + 5, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(Gg.x, Gg.y, Gg.r, Math.PI, 0); ctx.stroke();
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; ctx.beginPath(); ctx.moveTo(Gg.x + Math.cos(a) * (Gg.r - 5), Gg.y + Math.sin(a) * (Gg.r - 5)); ctx.lineTo(Gg.x + Math.cos(a) * Gg.r, Gg.y + Math.sin(a) * Gg.r); ctx.stroke(); }
  const na = Math.PI + clamp(k + 0.015 * Math.sin(t * 9) * (1 - k)) * Math.PI; ctx.strokeStyle = "#f0b860"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Gg.x, Gg.y); ctx.lineTo(Gg.x + Math.cos(na) * (Gg.r - 3), Gg.y + Math.sin(na) * (Gg.r - 3)); ctx.stroke();
  ctx.fillStyle = k > 0.9 ? "#7fd6c8" : "#4a3820"; ctx.beginPath(); ctx.arc(Gg.x, Gg.y + 14, 4.5, 0, 6.283); ctx.fill();
  if (k > 0.9) { const lg = ctx.createRadialGradient(Gg.x, Gg.y + 14, 0, Gg.x, Gg.y + 14, 16); lg.addColorStop(0, "rgba(127,214,200,0.5)"); lg.addColorStop(1, "rgba(127,214,200,0)"); ctx.fillStyle = lg; ctx.fillRect(Gg.x - 16, Gg.y - 2, 32, 32); }
  r.hot.push({ x: Gg.x - Gg.r, y: Gg.y - Gg.r, w: Gg.r * 2, h: Gg.r + 22, tip: "Clarity gauge" });

  if (r.opts.onImagerTune && !(Math.abs(t - (r.imagerTunedAt || -9)) < 1)) { r.imagerTunedAt = t; r.opts.onImagerTune(st); } // la phase dérive : le bourdon suit, une fois par seconde
  // lumière : la lueur de l'écran sur la chambre, puis la pénombre
  const lg2 = ctx.createRadialGradient(S.x + S.w / 2, S.y + S.h / 2, 30, S.x + S.w / 2, S.y + S.h / 2, 420); lg2.addColorStop(0, rgba(127, 214, 200, 0.03 + 0.08 * k)); lg2.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = lg2; ctx.fillRect(0, 0, W, H);
  const vgr = ctx.createRadialGradient(W / 2, H / 2, 180, W / 2, H / 2, 430); vgr.addColorStop(0, "rgba(0,0,0,0)"); vgr.addColorStop(1, "rgba(0,0,0,0.4)"); ctx.fillStyle = vgr; ctx.fillRect(0, 0, W, H);
}

/** Peint la vue de l'Âge (fenêtre générative) dans un petit canvas, à l'heure de l'Âge : un monde figé ne bouge pas. */
function paintView(canvas, model, target, t, now) {
  const g = canvas.getContext("2d"); if (!g || !model) return null;
  const hours = target && target.hours ? target.hours : 24, day = frac(now / (hours * 3600000));
  G.paint(g, model, frac(t / 8), { day, clock: t, season: 0 });
  return canvas;
}

module.exports = { drawImagerRoom, paintView, wavePath, STAGES, SCOPE, SCREEN, W, H };
