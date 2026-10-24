"use strict";
/**
 * La machine du Relto (étape 4a′ ; claude/DESIGN-reve-et-caverne-bahro.md, section 2) : le four d'Er'cana, dans un appentis
 * contre la cabane. Dehors, l'appentis (sa cheminée fume pendant la cuisson) ; dedans, la vue `oven` : quatre trémies de verre
 * (on voit ce qu'il y a dedans : cendres, terreau, limon, tourbe), leurs leviers de dose, la porte et sa vitre ronde, deux
 * curseurs gradués comme à Er'cana (temps, température), la presse et son manomètre, le plateau rond à cinq alvéoles, et
 * l'étagère des capsules cuites. Trois habits : normal (pierre et laiton), Verrière (verre et cuivre), Château (pierre
 * froide, lancette). Aucune zone cliquable ne change d'un habit à l'autre.
 *
 * État (dans le plugin) : r.opts.ovenState() → { oven, phase, stock, pellets } ; r.opts.onOven(action, arg) → un message, ou rien.
 */
const { mix, rgba, clamp, rng, frac } = require("./util");
const W = 640, H = 360, GY = 208, TAU = Math.PI * 2;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const nowOf = (r) => (r.nowOverride != null ? r.nowOverride : Date.now());
const stateOf = (r) => (r.opts && typeof r.opts.ovenState === "function" ? r.opts.ovenState(nowOf(r)) || {} : {});
const IDS = ["ash", "humus", "silt", "peat"];
const ING = { ash: { base: "#c9c5bb", dark: "#9c988e", kind: "powder" }, humus: { base: "#3a2a1f", dark: "#22170f", kind: "lumps" }, silt: { base: "#5f6f5c", dark: "#3e4a3c", kind: "gloss" }, peat: { base: "#7a4a2b", dark: "#4e2e19", kind: "fibre" } };
const FULL = 9; /* une trémie est pleine à neuf mesures */
const HOP = (i) => 236 + i * 56, DOOR = [286, 214, 38], SLIDERS = { time: 362, temp: 396 }, SL_Y = 162, SL_H = 104, WHEEL = [494, 214], GAUGE = [498, 160], TRAY = [286, 312];
const HOLES = [[-40, 2], [-20, -5], [0, 4], [20, -5], [40, 2]];
const skinOf = (r) => (r.castleOn && r.castleOn() ? "castle" : r.glassOn && r.glassOn() ? "glass" : "plain");
const TRIM = { plain: ["#b8955a", "#8a6d3e", "#e0c27a"], glass: ["#c67a3e", "#8a4a22", "#e6a06a"], castle: ["#a8a39a", "#6c6872", "#d8c88a"] };

/** Un tas d'ingrédient (la forme se voit) dans le rectangle donné, déjà découpé par l'appelant. */
function stuff(ctx, c, id, x, y, w, h, seed) {
  const g = ING[id], r = rng(seed);
  ctx.fillStyle = c(g.base); ctx.fillRect(x, y, w, h);
  if (g.kind === "powder") { ctx.globalAlpha = 0.5; for (let i = 0; i < 120; i++) { ctx.fillStyle = c(r() < 0.5 ? "#e4e0d6" : g.dark); ctx.fillRect(x + r() * w, y + r() * h, 1, 1); } ctx.globalAlpha = 1; ctx.fillStyle = rgba(255, 255, 255, 0.18); ctx.fillRect(x, y, w, 2); }
  if (g.kind === "lumps") for (let i = 0; i < 26; i++) { const cx = x + r() * w, cy = y + r() * h, rr = 1.2 + r() * 2.4; ctx.fillStyle = c(r() < 0.5 ? "#5a4030" : g.dark); ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.8, r() * 3, 0, TAU); ctx.fill(); }
  if (g.kind === "gloss") { ctx.fillStyle = c(g.dark); for (let i = 0; i < 6; i++) ctx.fillRect(x, y + (i + 0.5) * h / 6, w, 1); ctx.fillStyle = rgba(190, 215, 190, 0.35); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x + r() * w, y + r() * h, 3 + r() * 4, 0.9, 0, 0, TAU); ctx.fill(); } }
  if (g.kind === "fibre") { ctx.strokeStyle = c("#a8683a"); ctx.lineWidth = 0.8; for (let i = 0; i < 22; i++) { const sx = x + r() * w, sy = y + r() * h; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 3, sy - 2, sx + 5 + r() * 4, sy - 4 + r() * 3); ctx.stroke(); } ctx.fillStyle = c(g.dark); for (let i = 0; i < 20; i++) ctx.fillRect(x + r() * w, y + r() * h, 1.5, 1.5); }
}

/** Une capsule d'Er'cana, debout : un petit cylindre à bout arrondi. `crumb` : elle s'est effritée. */
function capsule(ctx, x, y, kind, s = 1, crumb = false, glow = 1) {
  const w = 7 * s, h = 13 * s, col = kind === "white" ? ["#f2f1ea", "#c9cdd0", rgba(190, 225, 255, 0.45 * glow)] : kind === "amber" ? ["#d98a3a", "#9a5a22", rgba(240, 160, 70, 0.4 * glow)] : ["#8a8580", "#5e5a56", null];
  if (col[2] && !crumb) { const g = ctx.createRadialGradient(x, y - h / 2, 1, x, y - h / 2, h); g.addColorStop(0, col[2]); g.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - h / 2, h, 0, TAU); ctx.fill(); }
  const gr = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, col[1]); gr.addColorStop(0.4, col[0]); gr.addColorStop(1, col[1]);
  ctx.fillStyle = gr; ctx.beginPath();
  if (crumb) { const hh = h * 0.55; ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - hh); ctx.lineTo(x - w / 4, y - hh - w * 0.3); ctx.lineTo(x - w / 10, y - hh + w * 0.1); ctx.lineTo(x + w / 6, y - hh - w * 0.4); ctx.lineTo(x + w / 2, y - hh + w * 0.15); ctx.lineTo(x + w / 2, y); }
  else { ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w / 2); ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y); }
  ctx.closePath(); ctx.fill();
  if (kind === "grey" && !crumb) { ctx.strokeStyle = "#3e3b38"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - 1, y - h + 3); ctx.lineTo(x + 1, y - h / 2); ctx.lineTo(x - 1.5, y - 2); ctx.stroke(); }
  if (crumb) { ctx.fillStyle = col[0]; const rr = rng(5 + Math.round(x)); for (let i = 0; i < 14; i++) { const d = 0.6 + rr() * 1.4; ctx.fillRect(x - w * 1.3 + rr() * w * 2.6, y - d - rr() * 2, d * s * 0.6, d * s * 0.5); } }
}

/** Les murs de la pièce, selon l'habit. */
function walls(r, ctx, c, sky, skin, t) {
  const night = clamp(sky.night == null ? 0 : sky.night), rr = rng(7);
  if (skin === "castle") {
    const L = require("./relto-castle-out").litStone(sky);
    ctx.fillStyle = c(L("#3a3742")); ctx.fillRect(0, 0, W, H);
    for (let row = 0; row < 14; row++) for (let col = 0; col < 10; col++) { const w = 58 + rr() * 16, x = col * 68 - (row % 2) * 30 + rr() * 4, y = row * 22; ctx.fillStyle = c(L(mix("#4a4652", "#6a6672", rr()))); ctx.fillRect(x, y, w, 19); }
    /* la voûte : deux arcs brisés et leur nervure */
    ctx.fillStyle = c("#24222a"); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 40); ctx.quadraticCurveTo(480, -6, 320, 34); ctx.quadraticCurveTo(160, -6, 0, 40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c("#7a7682"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 40); ctx.quadraticCurveTo(160, -6, 320, 34); ctx.quadraticCurveTo(480, -6, W, 40); ctx.stroke();
    for (const x of [44, 596]) { ctx.fillStyle = c("#5e5966"); ctx.fillRect(x - 8, 30, 16, 270); ctx.fillStyle = c("#7a7682"); ctx.fillRect(x - 8, 30, 3, 270); }
    /* la lancette */
    const CO = require("./relto-castle-out"); CO.lancet(ctx, 560, 112, 26, 62, c(CO.STONE_D)); CO.lancet(ctx, 560, 108, 18, 54, night > 0.5 ? "#141a33" : mix("#9cc3e6", "#d8e4f0", 0.3));
    ctx.strokeStyle = c("#3a3742"); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(560, 54); ctx.lineTo(560, 108); ctx.stroke();
  } else if (skin === "glass") {
    const GL = require("./relto-glass");
    ctx.fillStyle = c("#10241f"); ctx.fillRect(0, 0, W, H);
    GL.darkMosaic(ctx, c, 300, W, H);
    const day = clamp(sky.ambient == null ? 0.6 : sky.ambient), litIn = 0.25 + 0.55 * day; /* le jour traverse les vitraux */
    [[18, 92], [102, 176], [500, 562], [574, 634]].forEach(([xa, xb], i) => { GL.stainedBay(ctx, c, xa, xb, 20, 140, litIn, i + 1, true); ctx.strokeStyle = c(GL.COPPER); ctx.lineWidth = 3; GL.ogive(ctx, xa, xb, 20, 140); ctx.stroke(); }); /* des vitraux sans dessin, seulement du verre, sur les côtés ; derrière la machine, le mur */
    ctx.fillStyle = c("#2a1a12"); ctx.fillRect(0, 150, W, 6); ctx.fillStyle = c(GL.COPPER); ctx.fillRect(0, 150, W, 2);
    GL.cornerVines(ctx, c, 0, 0, W, 300);
  } else {
    ctx.fillStyle = c("#2b2824"); ctx.fillRect(0, 0, W, H);
    for (let row = 0; row < 14; row++) for (let col = 0; col < 12; col++) { const w = 46 + rr() * 20, x = col * 58 - (row % 2) * 26 + rr() * 6, y = row * 22; ctx.fillStyle = c(mix("#2f2a25", "#463d34", rr())); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, 19, 5) : ctx.rect(x, y, w, 19); ctx.fill(); }
    ctx.fillStyle = c("#3a2a1c"); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 14); ctx.lineTo(0, 34); ctx.fill();
    ctx.fillStyle = c("#4a3624"); for (const x of [40, 600]) ctx.fillRect(x, 0, 14, 300);
    ctx.fillStyle = night > 0.5 ? "#141a33" : mix(c("#9cc3e6"), "#9cc3e6", 0.5); ctx.fillRect(540, 60, 40, 36); ctx.strokeStyle = c("#3a2a1c"); ctx.lineWidth = 4; ctx.strokeRect(540, 60, 40, 36); ctx.beginPath(); ctx.moveTo(560, 60); ctx.lineTo(560, 96); ctx.stroke();
  }
  /* le sol (la Verrière a déjà sa mosaïque) */
  if (skin === "glass") return;
  ctx.fillStyle = c(skin === "castle" ? "#2a2830" : skin === "glass" ? "#1a2a26" : "#1e1a16"); ctx.fillRect(0, 300, W, 60);
  ctx.fillStyle = c(skin === "castle" ? "#34323a" : skin === "glass" ? "#24382f" : "#2a241e"); for (let i = 0; i < 9; i++) ctx.fillRect(i * 74, 300, 70, 3);
}

/** Un curseur vertical façon Er'cana : 0 à 50, une grande ligne tous les 5. */
function slider(ctx, c, trim, x, v) {
  const y = SL_Y, h = SL_H;
  ctx.fillStyle = c("#1a1b1e"); ctx.beginPath(); ctx.rect(x - 13, y - 6, 26, h + 12); ctx.fill(); ctx.strokeStyle = c(trim[1]); ctx.lineWidth = 1.5; ctx.stroke();
  for (let k = 0; k <= 50; k++) { const yy = y + h - k / 50 * h, big = k % 5 === 0; ctx.fillStyle = c(big ? "#e9dcc0" : "#7a6e5a"); ctx.fillRect(x - (big ? 10 : 6), yy, big ? 6 : 3, big ? 1.2 : 0.7); }
  ctx.fillStyle = "#0b0b0c"; ctx.fillRect(x - 1.5, y, 3, h);
  const vy = y + h - v / 50 * h; ctx.fillStyle = c(trim[0]); ctx.fillRect(x - 2, vy - 4, 13, 8); ctx.fillStyle = c(trim[2]); ctx.fillRect(x + 4, vy - 1, 6, 2);
}

/** Ce que vaut un réglage, en clair (l'infobulle, et le mot qui s'affiche quand on le change) : le temps dit aussi la durée réelle. */
function valueTip(tr, k, v) {
  const s = tr("oven.val." + k).replace("{v}", v);
  if (k !== "time") return s;
  const sec = v * 15, d = sec < 60 ? sec + " s" : sec % 60 ? Math.floor(sec / 60) + " min " + (sec % 60) + " s" : sec / 60 + " min";
  return s.replace("{d}", d);
}

/** Combien il reste dans une trémie, en mots (pas de chiffre : on le voit au verre). */
function amountWord(tr, n) { return tr(n <= 0 ? "oven.hop.empty" : n < 3 ? "oven.hop.low" : n < FULL ? "oven.hop.half" : "oven.hop.full"); }

/** La vue rapprochée : la machine. */
function drawOven(r, ctx, sc, sky, t) {
  const tr = TR(r), st = stateOf(r), o = st.oven || { levers: [0, 0, 0, 0], time: 0, temp: 0, press: 0 }, ph = st.phase || null, stock = st.stock || {}, P = st.pellets || {};
  const skin = skinOf(r), trim = TRIM[skin], night = clamp(sky.night == null ? 0 : sky.night), amb = 0.62 + 0.38 * clamp(sky.ambient == null ? 1 : sky.ambient), c = (h) => mix("#05060c", h, amb);
  const cooking = ph && ph.phase === "cooking", done = ph && ph.phase === "done";
  walls(r, ctx, c, sky, skin, t);
  /* l'étagère des capsules cuites, à gauche */
  ctx.fillStyle = c(skin === "glass" ? "#3a2416" : "#4a3624"); ctx.fillRect(66, 150, 110, 6); ctx.fillRect(66, 210, 110, 6);
  if (skin === "glass") { ctx.fillStyle = c(trim[0]); ctx.fillRect(66, 150, 110, 1.5); ctx.fillRect(66, 210, 110, 1.5); }
  const rows = [["white", P.white || 0], ["amber", P.amber || 0], ["grey", P.grey || 0]];
  rows.forEach(([k, n], i) => { const shown = Math.min(n, 6); for (let j = 0; j < shown; j++) capsule(ctx, 76 + i * 36 + (j % 3) * 9, j < 3 ? 150 : 210, k, 0.9, false, 0.7); });
  const total = (P.white || 0) + (P.amber || 0) + (P.grey || 0);
  r.hot.push({ x: 64, y: 120, w: 116, h: 96, tip: total ? tr("oven.shelf").replace("{w}", P.white || 0).replace("{a}", P.amber || 0).replace("{g}", P.grey || 0) : tr("oven.shelf.empty") });
  /* le conduit : un tuyau rond qui sort du flanc du four, un coude, des colliers, une clé de tirage, et monte au plafond */
  { const px = 455, r0 = 7, metal = skin === "glass" ? ["#5a2e12", "#c67a3e", "#3a1a0a"] : skin === "castle" ? ["#2a2a30", "#6c6c76", "#16161a"] : ["#26272b", "#5e6066", "#141518"];
    const tube = (x0, y0, x1, y1) => { const vert = x0 === x1, g = vert ? ctx.createLinearGradient(x0 - r0, 0, x0 + r0, 0) : ctx.createLinearGradient(0, y0 - r0, 0, y0 + r0); g.addColorStop(0, c(metal[2])); g.addColorStop(0.35, c(metal[1])); g.addColorStop(1, c(metal[0])); ctx.fillStyle = g; if (vert) ctx.fillRect(x0 - r0, Math.min(y0, y1), 2 * r0, Math.abs(y1 - y0)); else ctx.fillRect(Math.min(x0, x1), y0 - r0, Math.abs(x1 - x0), 2 * r0); };
    tube(px, 0, px, 168); tube(430, 176, px - r0 + 1, 176);
    const eg = ctx.createRadialGradient(px - r0, 176 - r0, 1, px - r0, 176 - r0, 2 * r0); eg.addColorStop(0, c(metal[1])); eg.addColorStop(1, c(metal[0])); ctx.fillStyle = eg; ctx.beginPath(); ctx.moveTo(px - r0, 168); ctx.lineTo(px + r0, 168); ctx.arc(px - r0, 168, 2 * r0, 0, Math.PI / 2); ctx.closePath(); ctx.fill(); /* le coude */
    ctx.fillStyle = c(trim[1]); for (const y of [30, 82, 134]) { ctx.fillRect(px - r0 - 1.5, y, 2 * r0 + 3, 3); ctx.fillStyle = c(trim[2]); ctx.fillRect(px - r0 - 1.5, y, 2 * r0 + 3, 0.8); ctx.fillStyle = c(trim[1]); } /* les colliers */
    ctx.fillRect(432, 176 - r0 - 1.5, 3, 2 * r0 + 3);
    /* la clé de tirage : un petit disque et sa poignée, sur le tuyau */
    ctx.fillStyle = c(trim[0]); ctx.beginPath(); ctx.arc(px, 108, 3, 0, TAU); ctx.fill(); ctx.strokeStyle = c(trim[0]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, 108); ctx.lineTo(px + 11, 104); ctx.stroke();
    if (cooking) { ctx.fillStyle = rgba(255, 140, 60, 0.25 + 0.1 * Math.sin(t * 6)); ctx.fillRect(px - r0 + 2, 150, 2 * r0 - 4, 2); } }
  /* les trémies et leurs robinets */
  IDS.forEach((id, i) => {
    const cx = HOP(i), top = 44, bot = 112, n = Math.max(0, stock[id] || 0), fill = clamp(n / FULL);
    const funnel = () => { ctx.beginPath(); ctx.moveTo(cx - 22, top); ctx.lineTo(cx + 22, top); ctx.lineTo(cx + 22, top + 40); ctx.lineTo(cx + 5, bot); ctx.lineTo(cx - 5, bot); ctx.lineTo(cx - 22, top + 40); ctx.closePath(); };
    ctx.save(); funnel(); ctx.fillStyle = rgba(160, 190, 200, 0.10); ctx.fill(); ctx.clip();
    if (n > 0) { const lvl = top + 4 + (1 - fill) * 64; stuff(ctx, c, id, cx - 24, lvl, 48, bot - lvl, 11 + i * 17); }
    ctx.fillStyle = rgba(255, 255, 255, 0.10); ctx.fillRect(cx - 18, top, 4, 60); ctx.restore();
    funnel(); ctx.strokeStyle = c(trim[0]); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = c(trim[1]); ctx.fillRect(cx - 24, top - 4, 48, 5); ctx.fillStyle = c(mix(trim[1], "#000", 0.25)); ctx.fillRect(cx - 4, bot, 8, 16);
    /* le robinet : une petite roue de laiton */
    ctx.strokeStyle = c(trim[0]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx + 10, bot + 9, 4, 0, TAU); ctx.moveTo(cx + 6, bot + 9); ctx.lineTo(cx + 14, bot + 9); ctx.moveTo(cx + 10, bot + 5); ctx.lineTo(cx + 10, bot + 13); ctx.stroke();
    r.hot.push({ x: cx - 24, y: top - 6, w: 48, h: bot - top + 26, tip: tr("oven.hop." + id) + " — " + amountWord(tr, n) + (cooking || done ? "" : ". " + tr("oven.hop.click")), oven: cooking || done ? null : "add", arg: i });
  });
  /* le corps du four */
  const bx = 200, by = 152, bw = 230, bh = 128;
  const grd = ctx.createLinearGradient(bx, by, bx + bw, by); grd.addColorStop(0, c("#26272b")); grd.addColorStop(0.5, c(skin === "castle" ? "#2e2e34" : "#34363b")); grd.addColorStop(1, c("#202125"));
  ctx.fillStyle = grd; ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.strokeStyle = c(trim[1]); ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = c(trim[1]); for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(bx + 12 + i * 25.8, by + 8, 1.8, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(bx + 12 + i * 25.8, by + bh - 8, 1.8, 0, TAU); ctx.fill(); }
  if (skin === "glass") { ctx.strokeStyle = c(trim[2]); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx + 20, by + 16); ctx.quadraticCurveTo(bx + 40, by + 4, bx + 64, by + 16); ctx.moveTo(bx + bw - 20, by + 16); ctx.quadraticCurveTo(bx + bw - 40, by + 4, bx + bw - 64, by + 16); ctx.stroke(); }
  /* le collecteur : les quatre goulottes se rejoignent et descendent dans la colonne de mélange */
  const col = (o.column || []), CX = 218, CT = 166, CH = 100, LH = CH / 5;
  ctx.strokeStyle = c(mix(trim[1], "#000", 0.2)); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(HOP(3), 128); ctx.lineTo(HOP(3), 136); ctx.lineTo(CX, 136); ctx.lineTo(CX, CT - 4); ctx.stroke();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(HOP(i), 128); ctx.lineTo(HOP(i), 136); ctx.stroke(); }
  ctx.strokeStyle = c(trim[0]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(HOP(3) + 2.5, 133.5); ctx.lineTo(CX + 2.5, 133.5); ctx.stroke();
  /* la colonne de verre : les mesures en couches, dans l'ordre où elles sont tombées ; cinq traits sur le verre */
  ctx.fillStyle = rgba(200, 220, 230, 0.10); ctx.fillRect(CX - 10, CT, 20, CH);
  col.forEach((id, k) => { const y = CT + CH - (k + 1) * LH; ctx.save(); ctx.beginPath(); ctx.rect(CX - 9, y, 18, LH); ctx.clip(); stuff(ctx, c, id, CX - 9, y, 18, LH, 31 + k * 7); ctx.restore(); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(CX - 9, y, 18, 0.8); });
  for (let k = 1; k <= 5; k++) { ctx.fillStyle = rgba(220, 230, 240, 0.4); ctx.fillRect(CX + 5, CT + CH - k * LH, 4, 0.7); }
  ctx.fillStyle = rgba(255, 255, 255, 0.12); ctx.fillRect(CX - 8, CT + 2, 3, CH - 4);
  ctx.strokeStyle = rgba(220, 230, 240, 0.55); ctx.lineWidth = 1; ctx.strokeRect(CX - 10, CT, 20, CH);
  ctx.fillStyle = c(trim[1]); ctx.fillRect(CX - 13, CT - 4, 26, 4); ctx.fillRect(CX - 13, CT + CH, 26, 4);
  r.hot.push({ x: CX - 14, y: CT - 6, w: 28, h: CH + 12, tip: col.length ? tr("oven.column") : tr("oven.column.empty"), oven: col.length && !cooking && !done ? "empty" : null });
  /* la porte et sa vitre */
  const [dx, dy, dr] = DOOR, hot = (o.temp || 0) / 50;
  ctx.fillStyle = c("#1b1c1f"); ctx.beginPath(); ctx.arc(dx, dy, dr + 8, 0, TAU); ctx.fill(); ctx.strokeStyle = c(trim[0]); ctx.lineWidth = 4; ctx.stroke();
  const in1 = ctx.createRadialGradient(dx, dy + 10, 2, dx, dy, dr);
  if (cooking) { const fl = 0.9 + 0.1 * Math.sin(t * 9) * Math.sin(t * 5.3); in1.addColorStop(0, `hsl(${40 - hot * 10}, 100%, ${(62 + hot * 26) * fl}%)`); in1.addColorStop(0.5, `hsl(${22 - hot * 6}, 90%, ${(34 + hot * 18) * fl}%)`); in1.addColorStop(1, "#3a1006"); }
  else { in1.addColorStop(0, "#2a2620"); in1.addColorStop(1, "#0e0d0c"); }
  ctx.fillStyle = in1; ctx.beginPath(); ctx.arc(dx, dy, dr, 0, TAU); ctx.fill();
  if (cooking) {
    ctx.fillStyle = rgba(255, 200, 120, 0.6); for (let i = 0; i < 7; i++) { const fx = dx - 27 + i * 9, fh = 14 - hot * 16 - (i % 3) * 5 + Math.sin(t * 8 + i) * 3; ctx.beginPath(); ctx.moveTo(fx - 4, dy + 32); ctx.quadraticCurveTo(fx, dy + fh, fx + 4, dy + 32); ctx.fill(); }
    /* le moule, sur sa grille : les capsules prennent forme, sombres d'abord, puis elles rougeoient en cuisant */
    const n = ph.n || 1, k = clamp(ph.k), gx0 = dx - 22, mw = 44; ctx.fillStyle = "#2a1a12"; ctx.fillRect(gx0, dy + 10, mw, 4); ctx.fillStyle = "#4a2a18"; for (let i = 0; i < 6; i++) ctx.fillRect(gx0 + 2 + i * 8, dy + 14, 2, 5);
    for (let j = 0; j < n; j++) { const x = dx - (n - 1) * 4.5 + j * 9, y = dy + 10, w = 6, hh = 11, body = mix("#1a1210", "#ff7a3a", k * 0.8), rim = mix("#3a2418", "#ffd08a", k);
      ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - hh + w / 2); ctx.arc(x, y - hh + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rim; ctx.lineWidth = 0.8; ctx.stroke(); }
  }
  ctx.fillStyle = rgba(255, 255, 255, 0.10); ctx.beginPath(); ctx.ellipse(dx - 14, dy - 16, 14, 6, -0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = c(trim[1]); ctx.fillRect(dx - dr - 14, dy - 14, 8, 28); ctx.fillStyle = c(trim[0]); ctx.fillRect(dx + dr + 4, dy - 4, 16, 8);
  const mins = cooking ? Math.ceil(ph.left / 60000) : 0;
  r.hot.push({ x: dx - dr - 8, y: dy - dr - 8, w: 2 * dr + 16, h: 2 * dr + 16, tip: cooking ? (mins > 1 ? tr("oven.door.cooking").replace("{m}", mins) : tr("oven.door.soon")) : done ? tr("oven.door.done") : tr("oven.door"), oven: cooking || done ? null : "door" });
  /* les deux curseurs */
  slider(ctx, c, trim, SLIDERS.time, o.time || 0); slider(ctx, c, trim, SLIDERS.temp, o.temp || 0);
  for (const k of ["time", "temp"]) { const v = o[k] || 0; r.hot.push({ x: SLIDERS[k] - 14, y: SL_Y - 8, w: 30, h: SL_H + 16, tip: valueTip(tr, k, v) + (cooking || done ? "" : " — " + tr("oven.slider.how")), oven: cooking || done ? null : k, slider: { y0: SL_Y, h: SL_H, knob: SL_Y + SL_H - v / 50 * SL_H }, val: v }); }
  /* la presse : le volant et son manomètre */
  const [wx, wy] = WHEEL, p = o.press || 0;
  ctx.fillStyle = c("#2a2b2f"); ctx.fillRect(430, wy - 6, 50, 12); ctx.fillStyle = c(trim[1]); ctx.fillRect(430, wy - 7, 50, 2);
  ctx.strokeStyle = c(trim[0]); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(wx, wy, 20, 0, TAU); ctx.stroke();
  const rot = p / 50 * Math.PI; for (let k = 0; k < 5; k++) { const a = rot + k * TAU / 5; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 20, wy + Math.sin(a) * 20); ctx.stroke(); ctx.fillStyle = c(trim[2]); ctx.beginPath(); ctx.arc(wx + Math.cos(a) * 20, wy + Math.sin(a) * 20, 2.6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = c(trim[0]); ctx.beginPath(); ctx.arc(wx, wy, 4, 0, TAU); ctx.fill();
  const [mx, my] = GAUGE, mr = 22;
  ctx.strokeStyle = c("#5a4a30"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, my + mr); ctx.lineTo(mx - 6, wy - 12); ctx.stroke();
  ctx.fillStyle = c("#e9dcc0"); ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill(); ctx.strokeStyle = c(trim[0]); ctx.lineWidth = 3; ctx.stroke();
  for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.75 + k / 10 * Math.PI * 1.5, ins = k % 2 ? 6 : 8; ctx.strokeStyle = k >= 8 ? "#a8342a" : "#3a2a1a"; ctx.lineWidth = k % 2 ? 0.8 : 1.6; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * (mr - 3), my + Math.sin(a) * (mr - 3)); ctx.lineTo(mx + Math.cos(a) * (mr - ins), my + Math.sin(a) * (mr - ins)); ctx.stroke(); }
  const na = Math.PI * 0.75 + p / 50 * Math.PI * 1.5; ctx.strokeStyle = "#1a0f08"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(na) * (mr - 5), my + Math.sin(na) * (mr - 5)); ctx.stroke(); ctx.fillStyle = "#1a0f08"; ctx.beginPath(); ctx.arc(mx, my, 2.2, 0, TAU); ctx.fill();
  r.hot.push({ x: mx - mr, y: my - mr, w: 2 * mr, h: 2 * mr, tip: valueTip(tr, "press", p) });
  r.hot.push({ x: wx - 24, y: wy - 24, w: 48, h: 48, tip: valueTip(tr, "press", p) + (cooking || done ? "" : " — " + tr("oven.press.how")), oven: cooking || done ? null : "press", wheel: true, val: p, y0: wy });
  /* le plateau à cinq alvéoles */
  const [tx, ty] = TRAY;
  ctx.fillStyle = c("#1a1b1e"); ctx.fillRect(tx - 8, 280, 16, 12);
  ctx.fillStyle = c("#3a3632"); ctx.beginPath(); ctx.ellipse(tx, ty, 64, 18, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = c(trim[1]); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = c("#57514a"); ctx.beginPath(); ctx.ellipse(tx, ty - 3, 58, 14, 0, 0, TAU); ctx.fill();
  const outN = done ? ph.n : 0, outK = done ? ph.kind : null;
  HOLES.forEach(([hx, hy], j) => { ctx.fillStyle = "#121110"; ctx.beginPath(); ctx.ellipse(tx + hx, ty - 3 + hy, 6, 2.6, 0, 0, TAU); ctx.fill(); if (j < outN) capsule(ctx, tx + hx, ty - 3 + hy, outK === "dust" ? "grey" : outK, 1, outK === "dust"); });
  r.hot.push({ x: tx - 66, y: ty - 26, w: 132, h: 46, tip: done ? (outK === "dust" ? tr("oven.tray.dust") : tr("oven.tray.take")) : tr("oven.tray"), oven: done ? "tray" : null });
  /* la lumière du feu sur la pièce ; la nuit, une lanterne */
  if (cooking) { const gl = ctx.createRadialGradient(dx, dy, 10, dx, dy, 260); gl.addColorStop(0, rgba(255, 150, 60, 0.12 + hot * 0.18)); gl.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); }
  if (night > 0.3) { const lx = skin === "castle" ? 112 : 134; ctx.fillStyle = "#e8b860"; ctx.fillRect(lx - 4, 60, 8, 12); const lg = ctx.createRadialGradient(lx, 66, 2, lx, 66, 110); lg.addColorStop(0, rgba(255, 200, 120, 0.35 * night)); lg.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); }
  require("./relto-atelier").backButton(r, ctx, tr("oven.back"), "island");
}

/**
 * Dehors : l'appentis contre la cabane (à sa gauche), sa porte basse, son chapeau d'aération qui fume pendant la cuisson
 * (la Verrière : une demi-coupole de verre ; le Château : une petite forge gothique au pinacle-cheminée). `hx` : le milieu de la cabane. Mêmes zones cliquables quel que soit l'habit.
 */
function leanTo(r, ctx, col, sky, t, hx) {
  const tr = TR(r), skin = skinOf(r), st = stateOf(r), ph = st.phase, cooking = ph && ph.phase === "cooking", night = clamp(sky.night == null ? 0 : sky.night);
  const x0 = hx - 60, x1 = skin === "glass" ? hx - 31 : hx - 28, top = GY - 30, low = GY - 22;
  let vent = null; /* d'où sort la fumée */
  if (skin === "castle") {
    /* une petite forge gothique, un peu plus petite que la chapelle et de la même pierre (grise et brune, moussue) :
       pignon d'ardoise raide, pinacle-cheminée au faîte, porte en lancette */
    const CO = require("./relto-castle-out"), fx0 = hx - 53, fx1 = hx - 21, fw = fx1 - fx0, ft = GY - 15, ax = (fx0 + fx1) / 2, ap = ft - 12;
    CO.slateRoof(ctx, col, fx0 - 3, ax, ap - 2, fx1 + 3, ft + 1, { step: 3, lw: 0.4 });
    const lg = ctx.createLinearGradient(fx0, 0, fx1, 0); ["#7c7771", "#5d5953", "#3f3c38"].forEach((h2, i) => lg.addColorStop(i / 2, col(h2)));
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(fx0, GY); ctx.lineTo(fx0, ft); ctx.lineTo(fx0 + 2, ft); ctx.lineTo(ax, ap + 3); ctx.lineTo(fx1 - 2, ft); ctx.lineTo(fx1, ft); ctx.lineTo(fx1, GY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(0, 0, 0, 0.13); for (let y = ft + 3.6; y < GY; y += 3.6) ctx.fillRect(fx0, y, fw, 0.6);
    ctx.fillStyle = col("#8c8780"); ctx.fillRect(fx0, ft - 1, fw, 1.2); /* le bandeau */
    { const q = rng(0xf0e9); for (let i = 0; i < 10; i++) { const x = fx0 - 2 + q() * (fw + 4), y = i < 6 ? GY - q() * 4 : ft + q() * 1.2; ctx.fillStyle = col(q() < 0.5 ? "#4f5c34" : "#5e6a3c"); ctx.beginPath(); ctx.ellipse(x, y, 1.2 + q() * 2, 0.7 + q() * 0.9, 0, 0, TAU); ctx.fill(); } } /* la mousse */
    /* le pinacle-cheminée, au faîte, dans la même pierre */
    ctx.fillStyle = col("#6e6a64"); ctx.fillRect(ax - 2, ap - 7, 4, 9); ctx.fillStyle = col("#8c8780"); ctx.beginPath(); ctx.moveTo(ax - 3, ap - 7); ctx.lineTo(ax, ap - 12); ctx.lineTo(ax + 3, ap - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col("#1a1820"); ctx.fillRect(ax - 1.2, ap - 6, 2.4, 1.6);
    CO.lancet(ctx, ax, GY, 8, 12, col("#1b1e2e")); if (cooking) CO.lancet(ctx, ax, GY - 1, 5.4, 9, mix(col("#3a1a10"), "#ff7a3a", 0.5 + 0.5 * night));
    vent = [ax + 1, ap - 11];
  } else if (skin === "glass") {
    /* une petite demi-coupole contre la cabane, sur un socle : un mur bas de mosaïque sombre, puis le verre (vert d'eau
       foncé, nervures de cuivre en éventail) à travers lequel on devine la machine ; porte en ogive ambrée */
    const GL = require("./relto-glass"), rx = x1 - x0, ry = 21, cy = GY - 10;
    ctx.save(); ctx.beginPath(); ctx.moveTo(x1, cy); ctx.ellipse(x1, cy, rx, ry, 0, Math.PI, 1.5 * Math.PI); ctx.closePath(); ctx.clip();
    GL.frostedDome(ctx, col, x0, cy - ry, x1, cy, night * (cooking ? 1 : 0.6), 3); /* le même verre dépoli que la coupole */
    ctx.fillStyle = rgba(8, 24, 22, 0.55); for (let i = 0; i < 3; i++) { const hx0 = x0 + 10 + i * 6; ctx.beginPath(); ctx.moveTo(hx0 - 2.5, cy - 12); ctx.lineTo(hx0 + 2.5, cy - 12); ctx.lineTo(hx0 + 0.8, cy - 6); ctx.lineTo(hx0 - 0.8, cy - 6); ctx.closePath(); ctx.fill(); } /* les trémies, en ombre derrière le verre */
    ctx.fillRect(x0 + 8, cy - 6, 16, 6);
    if (cooking) { const gl = ctx.createRadialGradient(x0 + 16, cy - 2, 1, x0 + 16, cy - 2, 16); gl.addColorStop(0, rgba(255, 160, 70, 0.55)); gl.addColorStop(1, rgba(255, 160, 70, 0)); ctx.fillStyle = gl; ctx.fillRect(x0, cy - ry, rx, ry); }
    ctx.fillStyle = rgba(255, 255, 255, 0.10); ctx.beginPath(); ctx.ellipse(x1 - rx * 0.35, cy - ry * 0.72, rx * 0.22, 2, -0.4, 0, TAU); ctx.fill(); /* un reflet */
    ctx.restore();
    ctx.strokeStyle = col(GL.COPPER); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x1, cy, rx, ry, 0, Math.PI, 1.5 * Math.PI); ctx.stroke();
    ctx.strokeStyle = col(GL.COPPER_HI); ctx.lineWidth = 0.8; for (const k of [0.22, 0.45, 0.7]) { const a = Math.PI + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(x1, cy); ctx.lineTo(x1 + Math.cos(a) * rx, cy + Math.sin(a) * ry); ctx.stroke(); }
    /* le socle : un mur bas de mosaïque, une bande de cuivre */
    ctx.fillStyle = col("#1c2a28"); ctx.fillRect(x0 - 1, cy, rx + 1, GY - cy);
    const q = rng(0x5ec1e); for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) { ctx.fillStyle = col(mix("#1f4a46", "#2f6a62", q())); ctx.fillRect(x0 + i * 3.4 + (row % 2) * 1.6, cy + 2 + row * 2.8, 2.8, 2.2); }
    ctx.fillStyle = col(GL.COPPER); ctx.fillRect(x0 - 1, cy - 1, rx + 1, 1.6);
    ctx.fillStyle = cooking ? mix(col("#c98a32"), "#ffb14a", 0.4 + 0.5 * night) : col("#a8702a"); GL.ogive(ctx, x0 + 7, x0 + 16, GY - 15, GY); ctx.fill(); ctx.strokeStyle = col(GL.COPPER); ctx.lineWidth = 0.8; GL.ogive(ctx, x0 + 7, x0 + 16, GY - 15, GY); ctx.stroke();
    /* le chapeau d'aération, en cuivre, sur la courbe */
    ctx.fillStyle = col(GL.COPPER); ctx.fillRect(x1 - 1.5, cy - ry, 2.5, GY - (cy - ry)); /* le pilier qui la porte contre la cabane */
    const vx = x0 + rx * 0.45, vy = cy - ry * Math.sqrt(1 - Math.pow(1 - 0.45, 2)) + 1.5; /* posé sur la courbe */
    ctx.fillStyle = col(GL.COPPER); ctx.fillRect(vx - 2.5, vy - 3, 5, 3.5); ctx.beginPath(); ctx.moveTo(vx - 4, vy - 3); ctx.quadraticCurveTo(vx, vy - 7, vx + 4, vy - 3); ctx.closePath(); ctx.fill();
    vent = [vx + 1, vy - 7];
  } else {
    ctx.fillStyle = col("#6e665c"); ctx.beginPath(); ctx.moveTo(x0, GY); ctx.lineTo(x0, low); ctx.lineTo(x1, top); ctx.lineTo(x1, GY); ctx.closePath(); ctx.fill();
    const rr = rng(3); for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) { ctx.fillStyle = col(mix("#625b52", "#8a8278", rr())); ctx.fillRect(x0 + 1 + i * 8 + (row % 2) * 3, GY - 20 + row * 5, 7, 4); }
    ctx.fillStyle = col("#4a3624"); ctx.beginPath(); ctx.moveTo(x0 - 5, low + 1); ctx.lineTo(x1 + 2, top - 3); ctx.lineTo(x1 + 2, top + 2); ctx.lineTo(x0 - 5, low + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col("#2a1f16"); ctx.fillRect(x0 + 9, GY - 15, 11, 15);
    if (cooking) { ctx.fillStyle = mix(col("#3a1a10"), "#ffa050", 0.35 + 0.6 * night); ctx.fillRect(x0 + 10, GY - 9, 9, 9); }
    /* pas de tuyau : un chapeau d'aération sur le toit */
    const vx = x0 + 16, vy = low + 1 + (top - 3 - (low + 1)) * (vx - (x0 - 5)) / (x1 + 2 - (x0 - 5)) + 1; /* posé sur le toit */
    ctx.fillStyle = col("#3a2a1c"); ctx.fillRect(vx - 3, vy - 4, 6, 4); ctx.fillStyle = col("#2a1f16"); ctx.fillRect(vx - 2, vy - 3, 4, 1); ctx.fillRect(vx - 2, vy - 1.5, 4, 1);
    ctx.fillStyle = col("#4a3624"); ctx.beginPath(); ctx.moveTo(vx - 5, vy - 4); ctx.lineTo(vx, vy - 8); ctx.lineTo(vx + 5, vy - 4); ctx.closePath(); ctx.fill();
    vent = [vx + 1, vy - 9];
  }
  if (cooking) {
    if (night > 0.3) { const gl = ctx.createRadialGradient(x0 + 15, GY - 6, 1, x0 + 15, GY - 6, 22); gl.addColorStop(0, rgba(255, 150, 60, 0.45 * night)); gl.addColorStop(1, rgba(255, 150, 60, 0)); ctx.fillStyle = gl; ctx.fillRect(x0 - 10, GY - 30, 50, 34); }
    for (let i = 0; i < 6; i++) { const p = frac(t * 0.16 + i / 6); ctx.fillStyle = night > 0.5 ? rgba(160, 160, 172, 0.3 * (1 - p)) : rgba(235, 235, 240, 0.45 * (1 - p)); ctx.beginPath(); ctx.arc(vent[0] + Math.sin(p * 6 + i) * 3 + p * 10, vent[1] - p * 36, 1.6 + p * 5, 0, TAU); ctx.fill(); }
  }
  r.hot.push({ x: hx - 62, y: GY - 34, w: 26, h: 34, tip: cooking ? tr("oven.out.cooking") : tr("oven.out"), go: "oven" });
}

module.exports = { valueTip, drawOven, leanTo, capsule, HOP, SLIDERS, SL_Y, SL_H, DOOR, TRAY, WHEEL };
