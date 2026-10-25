"use strict";
/*
 * La cave sous la machine (src/cellar.js pour le modèle) : une voûte de pierre sous l'appentis, une échelle qui remonte par
 * la trappe, une lampe. À gauche, l'étagère : une rangée par matière (cendres, terreau, limon, tourbe), un bocal par saison
 * de récolte (une étiquette : flocon, fleur, soleil, feuille, trait pour « sans saison ») et, au bout, le bocal scellé du bon
 * grain. À droite, l'établi et son tamis ; dessous, le compost ; contre le mur, le monte-charge vers les trémies.
 * Un bocal se prend en main (comme le cachet) et se pose : sur le tamis (il se trie), au compost, au monte-charge (il monte se
 * vider dans sa trémie) ; ailleurs, il retourne à sa place. Jamais deux sens au même clic.
 *
 * État : r.opts.cellarState() → l'état de `src/cellar.js` ; r.opts.onCellar(action, id, slot) → une phrase, ou rien.
 * La main : r.jarHeld = { id, slot } ; l'animation du tamis : r.cellarFx = { at, id, good, bad }.
 */
const { mix, rgba, clamp, rng } = require("./util");
const OV = require("./relto-oven");
const W = 640, H = 360, TAU = Math.PI * 2;
const IDS = ["ash", "humus", "silt", "peat"], SLOTS = ["winter", "spring", "summer", "autumn", "none", "good"];
const SHELF_Y = [118, 176, 234, 292], JAR_X = (k) => (k < 5 ? 112 + k * 52 : 112 + 5 * 52 + 18), JW = 30, JH = 38;
const SIEVE = [528, 206], BIN = [480, 252, 124, 48], LIFT = [572, 52, 52, 128], LADDER = [20, 64];
const FULL = 12, FX_MS = 1400;
/* trois habits, comme l'appentis (normal, Verrière, Château) ; aucune zone cliquable ne change de l'un à l'autre */
const skinOf = (r) => (r.castleOn && r.castleOn() ? "castle" : r.glassOn && r.glassOn() ? "glass" : "plain");
const KIT = {
  plain: { bg: "#1d1a17", brick: ["#26221e", "#3a332c"], vault: "#4a4036", vaultTop: "#0e0c0a", floor: "#191512", floorFleck: "#221d18", post: "#3a2a1c", board: "#5a4430", boardHi: "#6e5640", wood: "#4a3624", woodHi: "#5e4630", rung: "#5a4430", plate: "#2a1e14", rule: "#7a5a2a", rim: "#7a5a36", lamp: "#6a5030", light: [255, 190, 100] },
  castle: { bg: "#1c1b21", brick: ["#2c2a33", "#3e3b47"], vault: "#5e5966", vaultTop: "#121117", floor: "#24222a", floorFleck: "#2e2c35", post: "#2a2a30", board: "#3a2a1e", boardHi: "#4e3a2a", wood: "#3a2a1e", woodHi: "#4e3a2a", rung: "#4a3a2a", plate: "#1a1a20", rule: "#c9a24e", rim: "#6c6872", lamp: "#3a3a42", light: [255, 180, 110] },
  glass: { bg: "#0e1d1a", brick: ["#132824", "#1c3631"], vault: "#b5652a", vaultTop: "#0a1513", floor: "#111317", floorFleck: "#1f4a46", post: "#b5652a", board: "#3a2418", boardHi: "#5a3a22", wood: "#3a2418", woodHi: "#5a3a22", rung: "#5a3a22", plate: "#5a2e12", rule: "#e6a06a", rim: "#b5652a", lamp: "#b5652a", light: [255, 200, 140] },
};
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const nowOf = (r) => (r.nowOverride != null ? r.nowOverride : Date.now());
const stateOf = (r) => (r.opts && typeof r.opts.cellarState === "function" ? r.opts.cellarState() || {} : {});

/** L'étiquette d'un bocal de saison : un petit papier pendu au col, son signe à l'encre. */
function tag(ctx, c, x, y, slot) {
  ctx.fillStyle = c("#d9ccb0"); ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.lineTo(x + 6, y + 11); ctx.lineTo(x - 6, y + 11); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c("#3a2a1a"); ctx.fillStyle = c("#3a2a1a"); ctx.lineWidth = 0.9; const cx = x, cy = y + 5.5;
  if (slot === "winter") { for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(cx - 3.6 * Math.cos(a), cy - 3.6 * Math.sin(a)); ctx.lineTo(cx + 3.6 * Math.cos(a), cy + 3.6 * Math.sin(a)); ctx.stroke(); } }
  else if (slot === "spring") { for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5 - Math.PI / 2; ctx.beginPath(); ctx.arc(cx + 2.4 * Math.cos(a), cy + 2.4 * Math.sin(a), 1.2, 0, TAU); ctx.fill(); } ctx.fillStyle = c("#a86a3a"); ctx.beginPath(); ctx.arc(cx, cy, 1, 0, TAU); ctx.fill(); }
  else if (slot === "summer") { ctx.beginPath(); ctx.arc(cx, cy, 1.9, 0, TAU); ctx.fill(); for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8; ctx.beginPath(); ctx.moveTo(cx + 2.8 * Math.cos(a), cy + 2.8 * Math.sin(a)); ctx.lineTo(cx + 4.3 * Math.cos(a), cy + 4.3 * Math.sin(a)); ctx.stroke(); } }
  else if (slot === "autumn") { ctx.fillStyle = c("#8a4a1a"); ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.quadraticCurveTo(cx + 4, cy - 1, cx, cy + 4); ctx.quadraticCurveTo(cx - 4, cy - 1, cx, cy - 4); ctx.fill(); ctx.strokeStyle = c("#3a2a1a"); ctx.beginPath(); ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 4.5); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(cx - 3.5, cy); ctx.lineTo(cx + 3.5, cy); ctx.stroke(); }
}

/**
 * Un bocal de verre, debout, le fond en (x, y). `jar` : { n, rich } (saison) ou { n } (bon grain). Un bocal mêlé se voit en
 * veines, riche et pauvre en bandes égales, sans dire la part de chacun ; tout riche ou tout pauvre se voit uni.
 */
function jarDraw(ctx, c, id, slot, x, y, jar, seed, lit = 1) {
  const n = Math.max(0, (jar && jar.n) || 0), good = slot === "good", rich = good ? n : Math.min(n, (jar && jar.rich) || 0);
  const x0 = x - JW / 2, top = y - JH, body = () => { ctx.beginPath(); ctx.moveTo(x0 + 3, top + 6); ctx.lineTo(x0 + JW - 3, top + 6); ctx.quadraticCurveTo(x0 + JW, top + 7, x0 + JW, top + 12); ctx.lineTo(x0 + JW, y - 3); ctx.quadraticCurveTo(x0 + JW, y, x0 + JW - 3, y); ctx.lineTo(x0 + 3, y); ctx.quadraticCurveTo(x0, y, x0, y - 3); ctx.lineTo(x0, top + 12); ctx.quadraticCurveTo(x0, top + 7, x0 + 3, top + 6); ctx.closePath(); };
  ctx.save(); body(); ctx.fillStyle = rgba(150, 175, 185, 0.10 * lit); ctx.fill(); ctx.clip();
  if (n > 0) {
    const lvl = y - 2 - (JH - 10) * clamp(n / FULL), hh = y - lvl;
    if (rich === n || rich === 0) OV.stuff(ctx, c, id, x0, lvl, JW, hh + 1, seed, rich === 0);
    else { const bands = 4; for (let i = 0; i < bands; i++) { const by = lvl + (i * hh) / bands; OV.stuff(ctx, c, id, x0, by, JW, hh / bands + 1, seed + i, i % 2 === 1); } } /* mêlé : des veines */
    ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(x0, lvl, JW, 1);
  }
  ctx.fillStyle = rgba(255, 255, 255, 0.12 * lit); ctx.fillRect(x0 + 4, top + 10, 3, JH - 16);
  ctx.restore();
  body(); ctx.strokeStyle = c(mix("#8aa0a6", "#000000", 0.35)); ctx.lineWidth = 1.1; ctx.stroke();
  /* le col et le couvercle : bois pour la saison, cire et ficelle pour le bon grain */
  ctx.fillStyle = c(good ? "#5a3020" : "#6a4a2a"); ctx.fillRect(x0 + 4, top + 1, JW - 8, 6); ctx.fillStyle = c(good ? "#7a4028" : "#8a6a3e"); ctx.fillRect(x0 + 4, top + 1, JW - 8, 1.5);
  if (good) { ctx.fillStyle = c("#a8382a"); ctx.beginPath(); ctx.arc(x, top + 4, 4.2, 0, TAU); ctx.fill(); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 6, top + 9); ctx.quadraticCurveTo(x, top + 12, x + 6, top + 9); ctx.stroke(); ctx.fillStyle = c("#e0b070"); ctx.beginPath(); ctx.arc(x, top + 4, 1.4, 0, TAU); ctx.fill(); }
  else tag(ctx, c, x + JW / 2 - 1, top + 8, slot);
}

function room(ctx, c, sky, t, skin) {
  const K = KIT[skin], rr = rng(23), fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.3);
  ctx.fillStyle = c(K.bg); ctx.fillRect(0, 0, W, H);
  if (skin === "castle") { /* de grands blocs de pierre froide, assisés */
    for (let row = 0; row < 12; row++) for (let col = 0; col < 10; col++) { const w = 60 + rr() * 16, x = col * 70 - (row % 2) * 32 + rr() * 4, y = 20 + row * 25; ctx.fillStyle = c(mix(K.brick[0], K.brick[1], rr())); ctx.fillRect(x, y, w, 22); }
  } else for (let row = 0; row < 16; row++) for (let col = 0; col < 13; col++) { const w = 44 + rr() * 18, x = col * 52 - (row % 2) * 24 + rr() * 5, y = 20 + row * 20; ctx.fillStyle = c(mix(K.brick[0], K.brick[1], rr())); ctx.beginPath(); ctx.rect(x, y, w, 17); ctx.fill(); }
  const vg = ctx.createLinearGradient(0, 0, 0, 90); vg.addColorStop(0, c(K.vaultTop)); vg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, 90);
  if (skin === "castle") { /* la voûte d'ogives : deux arcs brisés, leur nervure, deux colonnes engagées */
    ctx.fillStyle = c(K.vaultTop); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 70); ctx.quadraticCurveTo(480, -10, 320, 40); ctx.quadraticCurveTo(160, -10, 0, 70); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c(K.vault); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 70); ctx.quadraticCurveTo(160, -10, 320, 40); ctx.quadraticCurveTo(480, -10, W, 70); ctx.stroke();
    ctx.strokeStyle = c("#7a7682"); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 73); ctx.quadraticCurveTo(160, -7, 320, 43); ctx.quadraticCurveTo(480, -7, W, 73); ctx.stroke();
    for (const x of [450, 634]) { ctx.fillStyle = c("#4a4652"); ctx.fillRect(x - 6, 60, 12, 240); ctx.fillStyle = c("#6a6672"); ctx.fillRect(x - 6, 60, 2.5, 240); ctx.fillStyle = c("#5e5966"); ctx.fillRect(x - 9, 56, 18, 6); }
  } else {
    ctx.fillStyle = c(K.vaultTop); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 76); ctx.quadraticCurveTo(W / 2, -30, 0, 76); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c(K.vault); ctx.lineWidth = skin === "glass" ? 2.5 : 3; ctx.beginPath(); ctx.moveTo(0, 76); ctx.quadraticCurveTo(W / 2, -30, W, 76); ctx.stroke();
    if (skin === "glass") { ctx.strokeStyle = c("#e6a06a"); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 80); ctx.quadraticCurveTo(W / 2, -26, W, 80); ctx.stroke(); }
  }
  /* le sol : terre battue, dalles de pierre, ou mosaïque */
  if (skin === "glass") require("./relto-glass").darkMosaic(ctx, c, 298, W, H);
  else if (skin === "castle") { ctx.fillStyle = c(K.floor); ctx.fillRect(0, 298, W, 62); ctx.strokeStyle = c("#1a1920"); ctx.lineWidth = 1; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 80 + 10, 298); ctx.lineTo(i * 80 - 30, H); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, 322); ctx.lineTo(W, 322); ctx.stroke(); }
  else { ctx.fillStyle = c(K.floor); ctx.fillRect(0, 298, W, 62); ctx.fillStyle = c(K.floorFleck); for (let i = 0; i < 40; i++) ctx.fillRect(rr() * W, 302 + rr() * 54, 2 + rr() * 6, 1); }
  /* la lampe, au faîte */
  if (skin === "glass") { /* une coupole de verre coloré, à la Tiffany, sur sa chaîne de cuivre */
    ctx.strokeStyle = c(K.lamp); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(330, 16); ctx.lineTo(330, 38); ctx.stroke();
    const panes = ["#c67a3e", "#3a6a62", "#d8a84e", "#3a6a62", "#c67a3e"]; for (let i = 0; i < 5; i++) { const a0 = Math.PI + (i * Math.PI) / 5, a1 = a0 + Math.PI / 5; ctx.fillStyle = `rgba(${i % 2 ? "120,190,170" : "240,170,90"},${0.55 + 0.3 * fl})`; ctx.beginPath(); ctx.moveTo(330, 40); ctx.arc(330, 54, 16, a0, a1); ctx.closePath(); ctx.fill(); void panes; }
    ctx.strokeStyle = c("#5a2e12"); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(330, 54, 16, Math.PI, TAU); ctx.lineTo(314, 54); ctx.stroke(); ctx.fillStyle = c(K.lamp); ctx.fillRect(312, 53, 36, 2.5); ctx.beginPath(); ctx.arc(330, 38, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(255, 220, 160, 0.8 * fl); ctx.beginPath(); ctx.ellipse(330, 58, 5, 2.5, 0, 0, TAU); ctx.fill();
  } else if (skin === "castle") { /* une lanterne de fer à quatre vitres, pendue à sa chaîne */
    ctx.strokeStyle = c("#2a2a30"); ctx.lineWidth = 1.2; for (let y = 22; y < 40; y += 4) { ctx.beginPath(); ctx.ellipse(330, y, 1.4, 2, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = rgba(255, 190, 110, 0.85 * fl); ctx.fillRect(323, 46, 14, 16); ctx.fillStyle = rgba(255, 245, 210, 0.9 * fl); ctx.beginPath(); ctx.ellipse(330, 55, 2, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = c(K.lamp); ctx.lineWidth = 1.6; ctx.strokeRect(323, 46, 14, 16); ctx.beginPath(); ctx.moveTo(330, 46); ctx.lineTo(330, 62); ctx.stroke();
    ctx.fillStyle = c(K.lamp); ctx.beginPath(); ctx.moveTo(320, 46); ctx.lineTo(330, 38); ctx.lineTo(340, 46); ctx.closePath(); ctx.fill(); ctx.fillRect(321, 62, 18, 3); ctx.fillStyle = c("#c9a24e"); ctx.fillRect(321, 62, 18, 0.8);
  } else {
    ctx.strokeStyle = c("#2a241e"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(330, 24); ctx.lineTo(330, 44); ctx.stroke();
    ctx.fillStyle = c(K.lamp); ctx.fillRect(323, 44, 14, 4); ctx.fillStyle = rgba(255, 200, 110, 0.9 * fl); ctx.beginPath(); ctx.ellipse(330, 54, 4, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = c(K.lamp); ctx.lineWidth = 1.4; ctx.strokeRect(322, 46, 16, 16);
  }
  if (skin === "glass") require("./relto-glass").cornerVines(ctx, c, 0, 0, W, 298); /* les rinceaux de cuivre aux coins */
}

/** Le halo de la lampe, par-dessus tout (la cave n'a pas d'autre lumière). */
function lampGlow(ctx, t, skin) {
  const L = KIT[skin].light, fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.3), g = ctx.createRadialGradient(330, 60, 20, 330, 120, 430);
  g.addColorStop(0, rgba(L[0], L[1], L[2], 0.12 * fl)); g.addColorStop(0.5, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.5)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function ladder(r, ctx, c, tr, skin) {
  const [x, w] = LADDER, K = KIT[skin];
  ctx.fillStyle = rgba(255, 220, 160, 0.08); ctx.beginPath(); ctx.moveTo(x - 6, 0); ctx.lineTo(x + w + 6, 0); ctx.lineTo(x + w + 30, 300); ctx.lineTo(x - 20, 300); ctx.closePath(); ctx.fill(); /* le jour de l'appentis, qui tombe par la trappe */
  ctx.fillStyle = c(K.wood); ctx.fillRect(x, 0, 5, 300); ctx.fillRect(x + w - 5, 0, 5, 300);
  for (let y = 18; y < 300; y += 26) { ctx.fillStyle = c(K.rung); ctx.fillRect(x + 3, y, w - 6, 4); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x + 3, y + 4, w - 6, 1.5); }
  r.hot.push({ x: x - 6, y: 0, w: w + 12, h: 300, tip: tr("cellar.up"), go: "oven" });
}

function shelves(r, ctx, c, st, tr, held, skin) {
  const jars = st.jars || {}, K = KIT[skin];
  /* les montants et les planches */
  ctx.fillStyle = c(K.post); for (const x of [92, 422]) ctx.fillRect(x, 70, skin === "glass" ? 4 : 7, 230);
  if (skin === "glass") { ctx.strokeStyle = c("#e6a06a"); ctx.lineWidth = 1.2; for (const x of [94, 424]) { ctx.beginPath(); ctx.arc(x, 66, 5, Math.PI * 0.5, Math.PI * 2.2); ctx.stroke(); } } /* la Verrière : des montants de cuivre, une crosse en tête */
  if (skin === "castle") { ctx.fillStyle = c("#4a4a52"); for (const x of [92, 422]) for (const y of SHELF_Y) ctx.fillRect(x - 1, y - 3, 9, 2); } /* le Château : des ferrures aux montants */
  SHELF_Y.forEach((y) => { ctx.fillStyle = c(K.board); ctx.fillRect(88, y, 342, 5); ctx.fillStyle = c(K.boardHi); ctx.fillRect(88, y, 342, 1.2); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(88, y + 5, 342, 3); });
  IDS.forEach((id, row) => {
    const y = SHELF_Y[row];
    /* la plaque de la rangée, sur le montant : la matière, en petit */
    ctx.fillStyle = c(K.plate); ctx.fillRect(98, y - 30, 4, 22);
    SLOTS.forEach((slot, k) => {
      const x = JAR_X(k), jar = (jars[id] || {})[slot] || { n: 0, rich: 0 }, isHeld = held && held.id === id && held.slot === slot;
      if (isHeld) { ctx.strokeStyle = rgba(201, 162, 78, 0.35); ctx.setLineDash([2, 2]); ctx.strokeRect(x - JW / 2, y - JH, JW, JH); ctx.setLineDash([]); return; } /* sa place vide, en pointillé */
      jarDraw(ctx, c, id, slot, x, y, jar, 31 + row * 13 + k * 7, jar.n > 0 ? 1 : 0.6);
      const name = tr("cellar.jar." + id) + " · " + tr("cellar.slot." + slot), amt = tr(jar.n <= 0 ? "cellar.amt.empty" : jar.n < 4 ? "cellar.amt.low" : jar.n < FULL ? "cellar.amt.half" : "cellar.amt.full");
      r.hot.push({ x: x - JW / 2 - 4, y: y - JH - 4, w: JW + 8, h: JH + 6, tip: name + " — " + amt + (held ? "" : jar.n > 0 ? ". " + tr("cellar.take") : ""), cellar: held ? "back" : jar.n > 0 ? "take" : null, id, slot });
    });
  });
  /* la séparation du bon grain : un filet d'ocre entre les saisons et le bocal scellé */
  ctx.fillStyle = c(K.rule); ctx.fillRect(JAR_X(4) + 26, 74, 1.5, 222);
}

function bench(r, ctx, c, st, tr, held, now, skin) {
  const K = KIT[skin];
  /* l'établi */
  ctx.fillStyle = c(K.wood); ctx.fillRect(468, 222, 146, 8); ctx.fillStyle = c(skin === "glass" ? "#b5652a" : K.woodHi); ctx.fillRect(468, 222, 146, 2);
  ctx.fillStyle = c(skin === "glass" ? "#5a2e12" : K.post); for (const x of [474, 602]) ctx.fillRect(x, 230, 6, 70);
  /* le tamis : un cercle de bois et sa toile, sur trois pieds */
  const [sx, sy] = SIEVE;
  ctx.strokeStyle = c("#3a2a1c"); ctx.lineWidth = 2; for (const dx of [-26, 0, 26]) { ctx.beginPath(); ctx.moveTo(sx + dx * 0.8, sy + 6); ctx.lineTo(sx + dx, 222); ctx.stroke(); }
  ctx.fillStyle = c("#2a2018"); ctx.beginPath(); ctx.ellipse(sx, sy, 36, 10, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(sx, sy, 32, 8, 0, 0, TAU); ctx.clip(); ctx.strokeStyle = rgba(160, 140, 110, 0.5); ctx.lineWidth = 0.6;
  for (let i = -34; i <= 34; i += 4) { ctx.beginPath(); ctx.moveTo(sx + i, sy - 10); ctx.lineTo(sx + i, sy + 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx - 36, sy + i * 0.3); ctx.lineTo(sx + 36, sy + i * 0.3); ctx.stroke(); }
  ctx.restore(); ctx.strokeStyle = c(K.rim); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy, 36, 10, 0, 0, TAU); ctx.stroke();
  r.hot.push({ x: sx - 40, y: sy - 16, w: 80, h: 30, tip: held ? tr(held.slot === "good" ? "cellar.sieve.good" : "cellar.sieve.drop") : tr("cellar.sieve"), cellar: held ? "sieve" : null });
  /* le compost : une caisse de planches, sa terre noire, plus haute à chaque mesure */
  const [bx, by, bw, bh] = BIN, parts = Math.max(0, st.compost || 0);
  ctx.fillStyle = c("#120e0b"); ctx.fillRect(bx + 4, by + 6, bw - 8, bh - 6);
  const lv = by + bh - 10 - parts * 7; ctx.fillStyle = c("#2a1c12"); ctx.beginPath(); ctx.moveTo(bx + 4, by + bh); ctx.lineTo(bx + 4, lv + 4); ctx.quadraticCurveTo(bx + bw / 2, lv - 4, bx + bw - 4, lv + 4); ctx.lineTo(bx + bw - 4, by + bh); ctx.closePath(); ctx.fill();
  const q = rng(77); ctx.fillStyle = c("#3a2a1c"); for (let i = 0; i < 18; i++) ctx.fillRect(bx + 8 + q() * (bw - 16), lv + 2 + q() * 10, 2, 1.4);
  ctx.fillStyle = c(K.wood); for (let i = 0; i < 3; i++) { ctx.fillRect(bx, by + i * 16 + 6, bw, 9); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(bx, by + i * 16 + 15, bw, 1.5); ctx.fillStyle = c(K.wood); }
  ctx.fillStyle = c(skin === "glass" ? "#b5652a" : K.post); ctx.fillRect(bx - 2, by, 5, bh); ctx.fillRect(bx + bw - 3, by, 5, bh);
  r.hot.push({ x: bx - 2, y: by - 6, w: bw + 4, h: bh + 6, tip: held ? tr("cellar.compost.drop") : tr("cellar.compost") + " — " + tr(parts ? "cellar.compost.some" : "cellar.compost.none"), cellar: held ? "compost" : null });
  /* le monte-charge : une gaine de planches dans le mur, une poulie, un panier sur sa corde */
  const [lx, ly, lw, lh] = LIFT;
  ctx.fillStyle = c("#0e0b09"); ctx.fillRect(lx, ly, lw, lh); ctx.strokeStyle = c(skin === "glass" ? "#b5652a" : skin === "castle" ? "#5e5966" : K.wood); ctx.lineWidth = 4; ctx.strokeRect(lx, ly, lw, lh);
  ctx.fillStyle = c("#6a5a48"); ctx.beginPath(); ctx.arc(lx + lw / 2, ly + 10, 6, 0, TAU); ctx.fill(); ctx.fillStyle = c("#2a2018"); ctx.beginPath(); ctx.arc(lx + lw / 2, ly + 10, 2, 0, TAU); ctx.fill();
  const fx = r.cellarFx, up = fx && fx.kind === "lift" ? clamp((now - fx.at) / FX_MS) : 0, basketY = ly + lh - 30 - up * (lh - 44);
  ctx.strokeStyle = c("#a89070"); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx + lw / 2 - 4, ly + 12); ctx.lineTo(lx + lw / 2 - 4, basketY); ctx.moveTo(lx + lw / 2 + 4, ly + 12); ctx.lineTo(lx + lw / 2 + 4, basketY); ctx.stroke();
  ctx.fillStyle = c(K.board); ctx.fillRect(lx + 8, basketY, lw - 16, 18); ctx.strokeStyle = c("#3a2a1c"); ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(lx + 8 + (i * (lw - 16)) / 4, basketY); ctx.lineTo(lx + 8 + (i * (lw - 16)) / 4, basketY + 18); ctx.stroke(); }
  r.hot.push({ x: lx - 4, y: ly - 4, w: lw + 8, h: lh + 8, tip: held ? tr("cellar.lift.drop") : tr("cellar.lift"), cellar: held ? "lift" : null });
}

/** Le tamis au travail : le bocal renversé au-dessus, les grains qui tombent, le bon dans le bocal scellé, le mauvais au compost. */
function sieveFx(ctx, c, now, fx) {
  const k = clamp((now - fx.at) / FX_MS); if (k >= 1) return;
  const [sx, sy] = SIEVE, q = rng(fx.at % 997), shake = Math.sin(k * 40) * 2.5 * (1 - k);
  ctx.save(); ctx.translate(shake, 0);
  for (let i = 0; i < 26; i++) { const ph = (k * 2.2 + q()) % 1, x = sx - 26 + q() * 52, poor = i % 3 === 0 && fx.bad > 0; if (poor) { const y = sy + 6 + ph * 40; ctx.fillStyle = rgba(120, 100, 80, 0.8 * (1 - k)); ctx.fillRect(x, y, 2, 2); } else if (fx.good > 0) { const y = sy - 8 - (1 - ph) * 6; ctx.fillStyle = rgba(220, 200, 150, 0.6 * (1 - k)); ctx.fillRect(x, y, 1.6, 1.6); } }
  ctx.restore();
}

/** Le bocal en main suit le curseur (d'une pièce à l'autre, comme le cachet ; relto-render l'appelle aussi). */
function drawHeldJar(r, ctx, x, y) {
  const h = r.jarHeld; if (!h) return;
  const st = stateOf(r), jar = ((st.jars || {})[h.id] || {})[h.slot] || { n: 0 };
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8; ctx.translate(x, y + JH / 2); ctx.rotate(-0.12);
  jarDraw(ctx, (s) => s, h.id, h.slot, 0, 0, jar, 99, 1); ctx.restore();
}

function drawCellar(r, ctx, sc, sky, t) {
  const tr = TR(r), st = stateOf(r), now = nowOf(r), amb = 0.55 + 0.45 * clamp(sky && sky.ambient != null ? sky.ambient : 1), c = (h) => mix("#05060c", h, 0.75 + 0.25 * amb), held = r.jarHeld || null;
  const skin = skinOf(r);
  room(ctx, c, sky, t, skin); ladder(r, ctx, c, tr, skin); shelves(r, ctx, c, st, tr, held, skin); bench(r, ctx, c, st, tr, held, now, skin);
  if (r.cellarFx && r.cellarFx.kind === "sieve") sieveFx(ctx, c, now, r.cellarFx);
  lampGlow(ctx, t, skin);
  void sc;
}

module.exports = { drawCellar, drawHeldJar, jarDraw, SLOTS, SIEVE, LIFT, BIN, FX_MS };
