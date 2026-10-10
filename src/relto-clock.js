"use strict";
// L'horloge D'ni, vue rapprochée (vue `clock`, un clic sur la sphère armillaire de l'île) : la sphère en grand sur son pilier
// dans la brume. Quatre anneaux de laiton portent les unités D'ni, du dehors au dedans : vailee, yahr, gahrtahvo, tahvo
// (src/dniclock.js : `rings`). Chacun tourne à son rythme sous un index fixe, en haut ; ses chiffres D'ni y sont gravés.
// Quand une unité change, son chiffre luit un instant puis s'éteint (`glows`) : rien ne clignote, rien ne compte.
// Sur le socle, la date et l'heure en chiffres D'ni, et le nom du vailee. Au loin, la pierre-calendrier si sa page est là.
// Pas d'antenne ni de lueur qui bat : c'est l'observatoire qui répand le faisceau ; l'horloge, elle, garde l'heure.
// Mouvement réduit : la brume ne bouge pas, aucune lueur ; les anneaux montrent l'instant (redessinés à chaque geste).
// Tout est dessiné ici, en coordonnées logiques 640 × 360.
const { rng, clamp, mix, rgba } = require("./util");
const DT = require("./dnitime");
const DC = require("./dniclock");
const { makeT } = require("./i18n");

const W = 640, H = 360;
const C = { x: 262, y: 146 }; // le centre de la sphère
const BANDS = { vailee: [93, 108], yahr: [77, 92], gahrtahvo: [61, 76], tahvo: [45, 60] }; // rayons intérieur, extérieur
const GLOBE = 29, MERID = 117, BACK = { x: 0, y: 332, w: W, h: 28 };
const PLINTH = { x: 172, y: 280, w: 180, h: 46 };
const EN = makeT(() => "en");
const tOf = (r) => (r.opts && typeof r.opts.t === "function" ? r.opts.t : EN);
const nowOf = (r) => (r.nowOverride != null ? r.nowOverride : Date.now());

/** Ce que montre l'instrument à l'instant `ms` : la date (avec l'horloge, toujours juste), les anneaux et leurs lueurs. */
function reading(ms, still) {
  const rings = DC.rings(ms), glows = DC.glows(ms, still);
  return { date: DT.fromDate(ms), rings, glows };
}

/** Un anneau : bande de laiton, patine vert-de-gris, rainures, puis les chiffres gravés (tournés avec l'anneau). */
function ring(r, ctx, ring, [r0, r1], c, glow, seed) {
  const mid = (r0 + r1) / 2;
  // la bande
  const g = ctx.createRadialGradient(C.x - 30, C.y - 40, r0 * 0.4, C.x, C.y, r1 + 6);
  g.addColorStop(0, c("#e9cf8a")); g.addColorStop(0.55, c("#b88f45")); g.addColorStop(1, c("#6e5124"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C.x, C.y, r1, 0, 6.283); ctx.arc(C.x, C.y, r0, 6.283, 0, true); ctx.fill();
  // patine : des plaques de vert-de-gris, tirées de la graine, qui tournent avec l'anneau
  const q = rng(seed >>> 0); ctx.save(); ctx.translate(C.x, C.y); ctx.rotate(ring.angle);
  for (let i = 0; i < 9; i++) { const a = q() * 6.283, l = 0.15 + q() * 0.5; ctx.strokeStyle = rgba(86, 150, 128, 0.16 + q() * 0.2); ctx.lineWidth = (r1 - r0) * (0.3 + q() * 0.6); ctx.beginPath(); ctx.arc(0, 0, r0 + (r1 - r0) * (0.25 + q() * 0.5), a, a + l); ctx.stroke(); }
  // graduations entre les chiffres
  ctx.strokeStyle = rgba(40, 26, 10, 0.55); ctx.lineWidth = 0.8;
  for (let i = 0; i < ring.n; i++) { const a = (i / ring.n) * 6.283 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r0 + 1), Math.sin(a) * (r0 + 1)); ctx.lineTo(Math.cos(a) * (r0 + 4), Math.sin(a) * (r0 + 4)); ctx.moveTo(Math.cos(a) * (r1 - 4), Math.sin(a) * (r1 - 4)); ctx.lineTo(Math.cos(a) * (r1 - 1), Math.sin(a) * (r1 - 1)); ctx.stroke(); }
  ctx.restore();
  // rainures des bords
  ctx.strokeStyle = rgba(30, 20, 8, 0.6); ctx.lineWidth = 1; for (const rr of [r0, r1]) { ctx.beginPath(); ctx.arc(C.x, C.y, rr, 0, 6.283); ctx.stroke(); }
  ctx.strokeStyle = rgba(255, 240, 200, 0.22); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(C.x, C.y, r1 - 1.2, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
  // les chiffres gravés
  if (!r.dni) return;
  for (let i = 0; i < ring.n; i++) {
    const v = i + ring.base, a = DC.digitAngle(ring, i), cur = i === ring.index, two = v >= 25, size = two ? 7.4 : ring.n <= 10 ? 10.5 : 9;
    const w = r.dni.widthOf(v, size), x = C.x + Math.sin(a) * mid, y = C.y - Math.cos(a) * mid;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    if (cur && glow > 0.01) { // la lueur du changement : un halo chaud qui s'efface
      const R = size * 1.9, hg = ctx.createRadialGradient(0, 0, 0, 0, 0, R); hg.addColorStop(0, rgba(255, 232, 160, 0.95 * glow)); hg.addColorStop(0.5, rgba(255, 214, 120, 0.45 * glow)); hg.addColorStop(1, rgba(255, 214, 120, 0));
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hg; ctx.fillRect(-R, -R, 2 * R, 2 * R); ctx.restore();
    }
    r.dni.drawNumber(ctx, v, -w / 2 + 0.5, -size / 2 + 0.6, size, "rgba(255,244,214,0.28)"); // le bord éclairé de la gravure
    const ink = cur ? mix("#3a2408", "#fff1c8", clamp(glow)) : "#3a2a12";
    r.dni.drawNumber(ctx, v, -w / 2, -size / 2, size, cur ? ink : rgba(52, 36, 16, 0.82));
    ctx.restore();
  }
}

/** L'arrière-plan : ciel, brume lointaine, quelques pinacles, la pierre-calendrier au loin si sa page est là. */
function backdrop(r, ctx, sc, sky, t, c) {
  r.drawSky(ctx, sky, t, null);
  const fogC = r.cloudColor(sky), q = rng(((sc.seed || 0) ^ 0xc10c) >>> 0);
  for (const [x, top, w] of [[70, 196, 40], [520, 214, 34], [604, 186, 46], [400, 238, 22]]) {
    ctx.fillStyle = c("#4d463c"); ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(x - w / 2, 300); ctx.lineTo(x - w * 0.3, top + 8); ctx.lineTo(x, top); ctx.lineTo(x + w * 0.3, top + 6); ctx.lineTo(x + w / 2, 300); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (sc.additions.some((a) => a.type === "calendar")) { // la pierre-calendrier, loin à droite, son jour gravé : juste, puisque l'horloge est là
    const x = 470, y = 246, d = DC.reltoDate(sc, nowOf(r));
    ctx.save(); ctx.globalAlpha = 0.7;
    ctx.fillStyle = c("#5a5148"); ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y); ctx.lineTo(x + 5, y + 16); ctx.lineTo(x - 7, y + 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c("#7d7468"); ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 3, y - 40); ctx.lineTo(x + 2, y - 43); ctx.lineTo(x + 5, y); ctx.closePath(); ctx.fill();
    if (r.dni) { const s = 6.5, w = r.dni.widthOf(d.yahr, s); r.dni.drawNumber(ctx, d.yahr, x - w / 2, y - 30, s, `rgba(255,226,150,${(0.45 + 0.4 * (sky.night || 0)).toFixed(2)})`); }
    ctx.restore();
    r.hot.push({ x: x - 16, y: y - 44, w: 32, h: 60, tip: tOf(r)("clock.pinnacle", { name: d.name, yahr: d.yahr }) });
  }
  // la mer de brume
  const g = ctx.createLinearGradient(0, 220, 0, H); g.addColorStop(0, rgba(0, 0, 0, 0)); g.addColorStop(0.4, fogC); g.addColorStop(1, fogC);
  ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = g; ctx.fillRect(0, 220, W, H - 220);
  for (let i = 0; i < 14; i++) { const s = 60 + q() * 100, x = ((q() * (W + 240) + t * 4 * (0.6 + q())) % (W + 240)) - 120, y = 250 + q() * 80; ctx.drawImage(r.sprite, x - s, y - s * 0.3, s * 2, s * 0.6); }
  ctx.restore();
}

/** Le pilier : un îlot de roche moussue, le fût, le socle qui porte la lecture, le chapiteau et la fourche de laiton. */
function pillar(r, ctx, c) {
  const x = C.x;
  ctx.fillStyle = c("#4a433a"); ctx.beginPath(); ctx.moveTo(x - 120, 330); ctx.lineTo(x + 120, 330); ctx.lineTo(x + 70, 362); ctx.lineTo(x - 80, 362); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#5f7a42"); ctx.beginPath(); ctx.ellipse(x, 330, 120, 9, 0, 0, 6.283); ctx.fill();
  const sg = ctx.createLinearGradient(x - 30, 0, x + 30, 0); sg.addColorStop(0, c("#958c7e")); sg.addColorStop(0.6, c("#756d61")); sg.addColorStop(1, c("#4f4a42"));
  ctx.fillStyle = sg; ctx.fillRect(x - 24, 270, 48, 62); // le fût
  ctx.fillRect(PLINTH.x, PLINTH.y, PLINTH.w, PLINTH.h); // le socle
  ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(PLINTH.x + PLINTH.w - 22, PLINTH.y, 22, PLINTH.h); ctx.fillRect(x + 10, 324, 16, 8);
  ctx.strokeStyle = rgba(30, 24, 18, 0.45); ctx.lineWidth = 1; ctx.strokeRect(PLINTH.x + 5, PLINTH.y + 5, PLINTH.w - 10, PLINTH.h - 10);
  ctx.fillStyle = c("#8d8578"); ctx.fillRect(x - 32, 264, 64, 8); // le chapiteau
  // la fourche de laiton qui tient le méridien
  ctx.strokeStyle = c("#9a7838"); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, 265); ctx.lineTo(x, C.y + MERID - 2); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 28, 265); ctx.quadraticCurveTo(x - 30, C.y + MERID - 2, x - 50, C.y + MERID - 12); ctx.moveTo(x + 28, 265); ctx.quadraticCurveTo(x + 30, C.y + MERID - 2, x + 50, C.y + MERID - 12); ctx.stroke();
  // mousse au pied
  const q = rng(0x3055); ctx.fillStyle = c("#6f8f4a"); for (let i = 0; i < 18; i++) { const px = x - 28 + q() * 56; ctx.beginPath(); ctx.ellipse(px, 330 - q() * 3, 3 + q() * 4, 1.6, 0, 0, 6.283); ctx.fill(); }
}

/** La lecture gravée sur le socle : le hahr, le nom du vailee, le yahr ; dessous, gahrtahvo · tahvo · gorahn · prorahn. */
function plaque(r, ctx, d, c) {
  const t = tOf(r), cx = PLINTH.x + PLINTH.w / 2, ink = c("#2c2418"), lit = "rgba(255,240,205,0.25)";
  ctx.font = "italic 11px serif"; ctx.textAlign = "center";
  if (r.dni) {
    const s = 11, wH = r.dni.widthOf(d.hahr, s), wY = r.dni.widthOf(d.yahr, s); ctx.font = "italic 12px serif"; const wN = ctx.measureText(d.name).width + 12;
    let x = cx - (wH + wN + wY) / 2; const y = PLINTH.y + 10;
    r.dni.drawNumber(ctx, d.hahr, x + 0.5, y + 0.6, s, lit); r.dni.drawNumber(ctx, d.hahr, x, y, s, ink); x += wH;
    ctx.fillStyle = lit; ctx.fillText(d.name, x + wN / 2 + 0.5, y + s - 0.4); ctx.fillStyle = ink; ctx.fillText(d.name, x + wN / 2, y + s - 1); x += wN;
    r.dni.drawNumber(ctx, d.yahr, x + 0.5, y + 0.6, s, lit); r.dni.drawNumber(ctx, d.yahr, x, y, s, ink);
    const parts = [d.gahrtahvo, d.tahvo, d.gorahn, d.prorahn], s2 = 10, gap = 8, ws = parts.map((v) => r.dni.widthOf(v, s2)), tot = ws.reduce((a, b) => a + b, 0) + gap * 3;
    let x2 = cx - tot / 2; const y2 = PLINTH.y + 27;
    parts.forEach((v, i) => { r.dni.drawNumber(ctx, v, x2 + 0.5, y2 + 0.6, s2, lit); r.dni.drawNumber(ctx, v, x2, y2, s2, ink); x2 += ws[i]; if (i < 3) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x2 + gap / 2, y2 + s2 / 2, 1.1, 0, 6.283); ctx.fill(); } x2 += gap; });
  } else { ctx.fillStyle = ink; ctx.fillText(DT.format(d), cx, PLINTH.y + 28); }
  ctx.textAlign = "left";
  r.hot.push({ ...PLINTH, tip: t("clock.plinth", { time: DT.format(d) }) });
}

/** L'armature de la sphère : le méridien, l'horizon (qui passe derrière les anneaux), l'axe, l'index fixe en haut. */
function frameBack(ctx, c) {
  ctx.strokeStyle = c("#8a6a30"); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(C.x, C.y, MERID + 16, 26, -0.12, 0, 6.283); ctx.stroke(); // l'horizon
  ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(C.x - 150, C.y + 62); ctx.lineTo(C.x + 150, C.y - 62); ctx.stroke(); // l'axe du monde, incliné
}
function frameFront(ctx, c) {
  const g = ctx.createLinearGradient(C.x - MERID, C.y - MERID, C.x + MERID, C.y + MERID); g.addColorStop(0, c("#e2c07a")); g.addColorStop(0.5, c("#a7803c")); g.addColorStop(1, c("#5c4219"));
  ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(C.x, C.y, MERID - 3, 0, 6.283); ctx.stroke(); // le méridien
  ctx.strokeStyle = rgba(86, 150, 128, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(C.x, C.y, MERID - 3, 1.9, 2.6); ctx.arc(C.x, C.y, MERID - 3, 5.6, 5.95); ctx.stroke();
  // l'index : une flèche de laiton au sommet du méridien et une fenêtre fine qui descend sur les anneaux
  ctx.fillStyle = c("#f0d590"); ctx.beginPath(); ctx.moveTo(C.x - 7, C.y - MERID - 6); ctx.lineTo(C.x + 7, C.y - MERID - 6); ctx.lineTo(C.x, C.y - MERID + 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(30, 20, 8, 0.55); ctx.lineWidth = 0.8; ctx.stroke();
  // la fenêtre de lecture : une lame de verre posée sur les anneaux, sous l'index, bordée de laiton
  const y0 = C.y - BANDS.vailee[1] - 1, y1 = C.y - BANDS.tahvo[0] + 1, w0 = 12.5, w1 = 7.5;
  ctx.beginPath(); ctx.moveTo(C.x - w0, y0); ctx.lineTo(C.x + w0, y0); ctx.lineTo(C.x + w1, y1); ctx.lineTo(C.x - w1, y1); ctx.closePath();
  ctx.fillStyle = "rgba(236,248,240,0.2)"; ctx.fill(); ctx.strokeStyle = c("#d8b46a"); ctx.lineWidth = 1.4; ctx.stroke();
}

/** Le globe au cœur : il tourne doucement (immobile en mouvement réduit). */
function globe(ctx, c, t) {
  const g = ctx.createRadialGradient(C.x - 10, C.y - 12, 3, C.x, C.y, GLOBE); g.addColorStop(0, c("#f4e2b0")); g.addColorStop(0.6, c("#a88440")); g.addColorStop(1, c("#4d3815"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C.x, C.y, GLOBE, 0, 6.283); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(C.x, C.y, GLOBE - 1, 0, 6.283); ctx.clip();
  ctx.strokeStyle = rgba(60, 40, 14, 0.4); ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) { const ph = ((t * 0.04 + i / 4) % 1) * Math.PI, rx = GLOBE * Math.abs(Math.cos(ph)); ctx.beginPath(); ctx.ellipse(C.x, C.y, rx, GLOBE, 0, 0, 6.283); ctx.stroke(); }
  for (const y of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(C.x, C.y + y * GLOBE, GLOBE * Math.sqrt(1 - y * y), 3, 0, 0, 6.283); ctx.stroke(); }
  ctx.fillStyle = rgba(86, 150, 128, 0.3); ctx.beginPath(); ctx.ellipse(C.x + 8, C.y + 10, 12, 7, 0.6, 0, 6.283); ctx.fill();
  ctx.restore();
}

/** La vue rapprochée de l'horloge D'ni. */
function drawClockRoom(r, ctx, sc, sky, t) {
  const tt = tOf(r), still = !!(r.opts && r.opts.reducedMotion), ms = nowOf(r), rd = reading(ms, still);
  const amb = 0.6 + 0.4 * (sky.ambient == null ? 1 : sky.ambient), c = (h) => mix("#05060c", h, amb);
  r.clock = rd; // lu par les tests
  backdrop(r, ctx, sc, sky, t, c);
  pillar(r, ctx, c);
  frameBack(ctx, c);
  // ombre portée de la sphère sur la brume
  const sh = ctx.createRadialGradient(C.x, C.y + 6, 60, C.x, C.y + 6, MERID + 10); sh.addColorStop(0, rgba(0, 0, 0, 0.25)); sh.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = sh; ctx.fillRect(C.x - MERID - 12, C.y - MERID - 8, 2 * MERID + 24, 2 * MERID + 28);
  const byKey = {}; for (const x of rd.rings) byKey[x.key] = x;
  for (const k of ["vailee", "yahr", "gahrtahvo", "tahvo"]) ring(r, ctx, byKey[k], BANDS[k], c, rd.glows[k], (sc.seed || 0) ^ (k.length * 0x9e37));
  globe(ctx, c, t);
  frameFront(ctx, c);
  plaque(r, ctx, rd.date, c);
  // zones : chaque anneau, sous l'index ; le globe
  const d = rd.date, tips = { vailee: tt("clock.ring.vailee", { name: d.name, n: d.vailee }), yahr: tt("clock.ring.yahr", { n: d.yahr }), gahrtahvo: tt("clock.ring.gahrtahvo", { n: d.gahrtahvo }), tahvo: tt("clock.ring.tahvo", { n: d.tahvo }) };
  for (const k of ["vailee", "yahr", "gahrtahvo", "tahvo"]) { const [r0, r1] = BANDS[k]; r.hot.push({ x: C.x - 22, y: C.y - r1, w: 44, h: r1 - r0, tip: tips[k] }); }
  r.hot.push({ x: C.x - GLOBE, y: C.y - GLOBE, w: 2 * GLOBE, h: 2 * GLOBE, tip: tt("clock.globe") });
  // retour à l'île
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
  ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.fillText("︾", W / 2, BACK.y + 19); ctx.textAlign = "left";
  r.hot.push({ ...BACK, tip: tt("clock.back"), go: "island" });
}

module.exports = { drawClockRoom, reading, C, BANDS, BACK, PLINTH };
