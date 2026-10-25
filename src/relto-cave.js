"use strict";
/**
 * La caverne Bahro, sous le Relto (claude/DESIGN-reve-et-caverne-bahro.md, étape 4b ; modèle : la grotte aux granulés
 * d'Uru, The Path of the Shell). Deux niveaux, tout dessiné ici (aucun asset) :
 * - **le haut** (`cavetop`) : une salle sèche, à peine éclairée d'en haut ; un trou au centre ; l'étagère où s'accumulent
 *   les granulés cuits par la machine du Relto (src/harvest.js, `ext.pellets` : blancs et gris), comptés en entailles ; un bouton de pierre qui en lâche un ; une
 *   faille vers le bas ;
 * - **le bas** (`cavebottom`) : le noir complet, un bassin. Le granulé tombe pendant FALL_MS (une minute) ; s'il est bon et qu'on est
 *   en bas quand il touche l'eau, la lueur des algues monte le long des parois pendant LIGHT_MS et révèle les peintures,
 *   et les traces des Bahro (on ne les voit jamais) : leurs ombres qui fuient sur la paroi, leurs mains encore humides. Un granulé raté flotte et
 *   fume en vert. Trop tard : l'eau est déjà noire.
 * On y descend par une faille dans le sol du cellier (l'escalier de la crypte au Château).
 * État (dans le plugin, `ext.pellets`, `ext.cave`) : r.opts.caveState(), onCaveDrop(), onCaveSeen(), onCaveSfx(kind).
 */
const { mix, rgba, clamp, fnv } = require("./util");
const W = 640, H = 360, TAU = Math.PI * 2;
const FALL_MS = 60000, LIGHT_MS = 15000; /* la chute : une minute (90 s, c'était long) ; la lumière : 15 s au plus (un blanc net) */
/** Combien dure la lumière d'un granulé lâché (section 16.1) : un blanc net 15 s, un approximatif 8 s ; l'ambré et le gris, 10 s. */
const lightOf = (drop) => (drop && drop.q === "good" ? (drop.fine ? 15000 : 8000) : 10000);
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const nowOf = (r) => (r.nowOverride || Date.now());
const stateOf = (r) => (r.opts && typeof r.opts.caveState === "function" ? r.opts.caveState() || {} : {});

/** La phase d'un granulé lâché : "falling" (il tombe), "lit" (bon, il touche l'eau : k ms depuis le choc), "fizz" (raté), null. */
function phaseOf(drop, now) {
  if (!drop || !drop.at) return null;
  const k = now - drop.at - FALL_MS;
  if (k < 0) return { kind: "falling", k: now - drop.at };
  if (k < lightOf(drop)) return { L: lightOf(drop), kind: drop.q === "good" ? "lit" : drop.q === "amber" ? "feed" : "fizz", k };
  return null;
}

/** Une trappe dans le sol du cellier, sur la caverne : de bois cerclé de fer (de bronze à la Verrière, de pierre à anneau de fer au Château). */
function vaultCrack(r, ctx, c, castle, t) {
  const x = 60, y = 290, w = 120, h = 46, tr = TR(r), hov = r.hover && r.hover.go === "cavetop", glass = !castle && r.glassOn && r.glassOn();
  if (castle) { require("./relto-castle").stoneTrap(ctx, c, x + w / 2, y + h / 2, w * 0.86, h * 0.72); /* le Château : une trappe de pierre à anneau de fer, comme celle de la cabane */
  } else if (glass) { require("./relto-glass").bronzeTrap(ctx, c, x + w / 2, y + h / 2, w * 0.86, h * 0.72); } /* la Verrière : une trappe de bronze */
  else { /* une trappe de bois dans le sol, cerclée de fer, un anneau */
    const cx = x + w / 2, cy = y + h / 2, tw = w * 0.84, th = h * 0.7, sk = th * 0.35, quad = () => { ctx.beginPath(); ctx.moveTo(cx - tw / 2 + sk, cy - th / 2); ctx.lineTo(cx + tw / 2 - sk, cy - th / 2); ctx.lineTo(cx + tw / 2, cy + th / 2); ctx.lineTo(cx - tw / 2, cy + th / 2); ctx.closePath(); };
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(cx - tw / 2 - 3, cy - th / 2 - 2, tw + 6, th + 5);
    const g = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0); g.addColorStop(0, c("#3e2c1c")); g.addColorStop(0.5, c("#5a4028")); g.addColorStop(1, c("#34251a")); ctx.fillStyle = g; quad(); ctx.fill();
    ctx.save(); quad(); ctx.clip(); ctx.strokeStyle = c("#22180f"); ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { const xx = cx - tw / 2 + (tw * i) / 6; ctx.beginPath(); ctx.moveTo(xx + sk * (1 - i / 3), cy - th / 2); ctx.lineTo(xx, cy + th / 2); ctx.stroke(); }
    ctx.fillStyle = c("#2a2a2e"); ctx.fillRect(cx - tw / 2, cy - th * 0.18, tw, 3); ctx.fillRect(cx - tw / 2, cy + th * 0.22, tw, 3); ctx.restore();
    ctx.strokeStyle = c("#1a1410"); ctx.lineWidth = 1.4; quad(); ctx.stroke();
    ctx.strokeStyle = c(hov ? "#8a8a90" : "#5a5a60"); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 6, 3, 0, 0, TAU); ctx.stroke(); /* l'anneau */
  }
  const g = ctx.createRadialGradient(x + w / 2, y + h * 0.7, 2, x + w / 2, y + h * 0.7, w * 0.6); g.addColorStop(0, rgba(120, 200, 170, (hov ? 0.14 : 0.0) * (0.7 + 0.3 * Math.sin(t * 0.8)))); g.addColorStop(1, rgba(120, 200, 170, 0)); ctx.fillStyle = g; ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
  r.hot.push({ x, y: y - 6, w, h: h + 6, tip: tr("cave.trap"), go: "cavetop" });
}

/**
 * L'or, l'argent et les gemmes dans les parois (pages « gold », « silver », « gems ») : des filons et des pierres serties
 * dans la roche, qui ne se voient que là où la lumière les touche. `light(x, y)` : 0 (le noir) à 1 (en pleine lumière).
 * `tint` : la couleur de la lumière (le jour, ou le vert des algues). Déterministe : la graine du Relto.
 */
function caveOre(r, ctx, light, t, tint) {
  const adds = (r.scene && r.scene.additions) || [], seed = (r.scene && r.scene.seed) || 1;
  const free = (x, y) => !(x > 30 && x < 210 && y > 132 && y < 214) && !(x > 560 && x < 624 && y > 90) && !(x > 470 && x < 545 && y > 190) && !(x > 340 && x < 372 && y < 135);
  for (const kind of ["gold", "silver", "gems"]) {
    const a = adds.find((x) => x.type === kind); if (!a) continue;
    const d = clamp(a.density == null ? 0.6 : a.density), q = (k) => (fnv(seed + kind + k) % 10000) / 10000, n = Math.round(4 + d * 8);
    for (let i = 0; i < n; i++) {
      let x = 24 + q("x" + i) * (W - 48), y = 44 + q("y" + i) * 200; if (!free(x, y)) continue;
      const L = light(x, y); if (L <= 0.02) continue;
      if (kind === "gems") {
        const PAL = [[214, 60, 80], [60, 190, 120], [70, 120, 220], [170, 90, 210], [240, 190, 70]], col = PAL[Math.floor(q("c" + i) * PAL.length)], sz = 2.2 + q("s" + i) * 2.8, pulse = 0.6 + 0.4 * Math.sin(t * 1.3 + i * 2.1);
        const g = ctx.createRadialGradient(x, y, 0.5, x, y, sz * 3); g.addColorStop(0, rgba(col[0], col[1], col[2], 0.35 * L * pulse)); g.addColorStop(1, rgba(col[0], col[1], col[2], 0)); ctx.fillStyle = g; ctx.fillRect(x - sz * 3, y - sz * 3, sz * 6, sz * 6);
        ctx.fillStyle = rgba(col[0], col[1], col[2], 0.9 * L); ctx.beginPath(); ctx.moveTo(x, y - sz); ctx.lineTo(x + sz * 0.8, y - sz * 0.2); ctx.lineTo(x + sz * 0.5, y + sz * 0.8); ctx.lineTo(x - sz * 0.6, y + sz * 0.7); ctx.lineTo(x - sz * 0.8, y - sz * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(255, 255, 255, 0.6 * L * pulse); ctx.fillRect(x - sz * 0.3, y - sz * 0.6, 1, 1);
      } else {
        const base = kind === "gold" ? [214, 170, 60] : [200, 210, 224], pts = [[x, y]], len = 6 + Math.floor(q("l" + i) * 4), dir = q("dir" + i) < 0.5 ? 1 : -1, slope = (q("sl" + i) - 0.5) * 0.8;
        for (let k = 0; k < len; k++) { x += dir * (7 + q("dx" + i + k) * 7); y += (slope + (q("dy" + i + k) - 0.5) * 0.5) * 8; pts.push([x, y]); } /* un filon suit la roche : une longue ligne souple */
        const line = (rgb, w, al) => { ctx.strokeStyle = rgba(Math.min(255, rgb[0] * tint[0]), Math.min(255, rgb[1] * tint[1]), Math.min(255, rgb[2] * tint[2]), al); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j < pts.length - 1; j++) { const mx = (pts[j][0] + pts[j + 1][0]) / 2, my = (pts[j][1] + pts[j + 1][1]) / 2; ctx.quadraticCurveTo(pts[j][0], pts[j][1], mx, my); } ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.stroke(); };
        ctx.lineCap = "round"; line(base.map((v) => v * 0.5), 3, 0.5 * L); line(base, 1.3, 0.95 * L);
        const tw = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.3), [gx, gy] = pts[Math.floor(pts.length / 2)]; if (tw > 0.65) { ctx.fillStyle = rgba(255, 250, 225, (tw - 0.65) * 2.4 * L); ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, TAU); ctx.fill(); } /* un éclat qui prend la lumière */
      }
    }
  }
}

/** Le relief des parois : une silhouette de caverne, au gré d'une graine. */
function walls(ctx, fill, seed) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H);
  for (let x = W; x >= 0; x -= 20) { const k = fnv(seed + "|" + x); ctx.lineTo(x, H - 60 - (k % 30)); }
  ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
}

function drawCaveTop(r, ctx, sc, sky, t) {
  const tr = TR(r), st = stateOf(r), now = nowOf(r), ph = phaseOf(st.drop, now), c = (h) => mix("#05060c", h, 0.75), q = (k) => (fnv("cavetop" + k) % 1000) / 1000;
  const day = clamp(sky && sky.ambient != null ? sky.ambient : 0.6), night = clamp(sky && sky.night != null ? sky.night : 0.3);
  /* la paroi du fond : de la roche en masses, pas un mur */
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#100d0b"); bg.addColorStop(0.55, "#1e1813"); bg.addColorStop(1, "#0b0907"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 22; i++) { /* des pans de roche, chacun sa teinte, éclairés par le haut */
    const x = q("m" + i) * W, y = 20 + q("n" + i) * 220, w = 60 + q("o" + i) * 120, h = 40 + q("p" + i) * 70, g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, rgba(70, 58, 46, 0.35)); g.addColorStop(1, rgba(10, 8, 6, 0.35)); ctx.fillStyle = g; ctx.beginPath();
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, rr = 0.75 + q("r" + i + k) * 0.35, px = x + Math.cos(a) * w / 2 * rr, py = y + Math.sin(a) * h / 2 * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 7; i++) { const k = fnv("strata" + i); ctx.strokeStyle = rgba(110, 92, 72, 0.14); ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= W; x += 14) { const y = 46 + i * 30 + 6 * Math.sin(x / 60 + k) + 3 * Math.sin(x / 23 + k * 2); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  /* le plafond, ses stalactites, et la fente par où tombe le jour (le ciel suit l'heure) */
  const sk = mix(mix("#0a1020", "#9cc3e6", day), "#ff9a5a", clamp((sky && sky.dusk) || 0) * 0.4);
  const shut = !!st.shut; /* la trappe de pierre, sur la fente du plafond : fermée, plus un rai de jour */
  ctx.fillStyle = shut ? "#16120e" : sk; ctx.beginPath(); ctx.moveTo(296, 0); ctx.lineTo(344, 0); ctx.lineTo(334, 14); ctx.lineTo(306, 12); ctx.closePath(); ctx.fill();
  if (shut) { ctx.fillStyle = rgba(220, 215, 190, 0.18 * (0.3 + day)); ctx.fillRect(300, 12, 32, 0.8); } /* un fil de jour sous la dalle */
  else if (night > 0.6) { ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(318, 5, 1, 1); }
  ctx.fillStyle = "#0a0806"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(296, 0); ctx.lineTo(306, 12); ctx.lineTo(334, 14); ctx.lineTo(344, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 30);
  for (let x = W; x >= 0; x -= 12) { const deep = q("st" + x) > 0.72 ? 18 + q("sd" + x) * 30 : 4 + q("se" + x) * 10; ctx.lineTo(x - 3, 26 + deep * 0.3); ctx.lineTo(x - 6, 24 + deep); ctx.lineTo(x - 9, 26 + deep * 0.3); }
  ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
  const shaft = ctx.createLinearGradient(320, 0, 320, 270), sa = 0.08 + 0.14 * day; shaft.addColorStop(0, rgba(220, 215, 190, sa)); shaft.addColorStop(1, rgba(220, 215, 190, 0));
  if (!shut) { ctx.fillStyle = shaft; ctx.beginPath(); ctx.moveTo(304, 10); ctx.lineTo(336, 10); ctx.lineTo(420, 270); ctx.lineTo(220, 270); ctx.closePath(); ctx.fill(); }
  /* la chaîne de la trappe, qui pend du plafond, et son anneau */
  { const cx = 356, sway = Math.sin(t * 0.6) * 1.2; ctx.strokeStyle = rgba(120, 104, 84, 0.85); ctx.lineWidth = 1.2; for (let y = 14; y < 112; y += 5) { ctx.beginPath(); ctx.ellipse(cx + sway * (y / 112), y, 1.4, 2.4, 0, 0, TAU); ctx.stroke(); }
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(cx + sway, 118 + (shut ? 4 : 0), 5, 0, TAU); ctx.stroke(); }
  r.hot.push({ x: 344, y: 60, w: 24, h: 70, tip: shut ? tr("cave.hatch.open") : tr("cave.hatch.shut"), caveHatch: true });
  /* des gouttes qui tombent des stalactites, de loin en loin */
  for (let i = 0; i < 3; i++) { const x = [140, 452, 560][i], p = ((t * 0.35 + i * 0.37) % 1); if (p < 0.6) { const y = 50 + (p / 0.6) * 210; ctx.fillStyle = rgba(170, 200, 210, 0.5); ctx.fillRect(x, y, 1, 3); } }
  /* le sol : inégal, humide, des cailloux ; la lumière s'y pose autour du trou */
  ctx.fillStyle = c("#2a231c"); ctx.beginPath(); ctx.moveTo(0, 268); for (let x = 0; x <= W; x += 32) ctx.lineTo(x, 262 + q("f" + x) * 8); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  const pool = ctx.createRadialGradient(320, 290, 20, 320, 290, 200); pool.addColorStop(0, rgba(200, 190, 160, 0.10 * (0.4 + day))); pool.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = pool; ctx.fillRect(100, 240, 440, 120);
  for (let i = 0; i < 26; i++) { const x = q("pb" + i) * W, y = 272 + q("pc" + i) * 80; if (Math.abs(x - 320) < 120 && y < 330) continue; ctx.fillStyle = c(q("pd" + i) < 0.5 ? "#3a3128" : "#2e2720"); ctx.beginPath(); ctx.ellipse(x, y, 3 + q("pe" + i) * 6, 1.6 + q("pf" + i) * 2, 0, 0, TAU); ctx.fill(); }
  /* le trou : un cercle de pierres taillées (ce n'est pas un trou naturel) */
  const hole = ctx.createRadialGradient(320, 292, 10, 320, 288, 92); hole.addColorStop(0, "#000"); hole.addColorStop(0.75, "#020203"); hole.addColorStop(1, "#0d0b09");
  ctx.fillStyle = c("#3a3128"); ctx.beginPath(); ctx.ellipse(320, 286, 106, 33, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = hole; ctx.beginPath(); ctx.ellipse(320, 288, 90, 25, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(150, 170, 160, 0.05); ctx.beginPath(); ctx.ellipse(320, 284, 60, 10, 0, 0, TAU); ctx.fill(); /* un peu de brume monte */
  for (let i = 0; i < 18; i++) { const a0 = (i / 18) * TAU, a1 = ((i + 0.86) / 18) * TAU; ctx.fillStyle = c(i % 3 ? "#4e4337" : "#433a2f"); ctx.beginPath(); ctx.ellipse(320, 287, 104, 32, 0, a0, a1); ctx.ellipse(320, 288, 91, 26, 0, a1, a0, true); ctx.closePath(); ctx.fill(); if (i % 3 === 0) { const mx = 320 + Math.cos((a0 + a1) / 2) * 98, my = 287 + Math.sin((a0 + a1) / 2) * 29; ctx.strokeStyle = rgba(20, 16, 12, 0.6); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(mx - 2, my - 1); ctx.lineTo(mx + 2, my + 1); ctx.stroke(); } }
  if (ph && ph.kind === "falling" && ph.k < 1600) { const qq = ph.k / 1600, y = 230 + qq * 70, rad = 4 * (1 - qq * 0.8); ctx.save(); ctx.translate(320, y); ctx.rotate(qq * 5); ctx.globalAlpha = 0.95; require("./relto-oven").pill(ctx, 0, 0, st.drop.q === "good" ? "white" : st.drop.q === "amber" ? "amber" : "grey", Math.max(0.1, rad / 4)); ctx.restore(); } /* la pilule tombe en tournant */
  r.hot.push({ x: 216, y: 256, w: 208, h: 64, tip: tr("cave.hole") });
  /* la niche, creusée dans la paroi : les pilules y sont couchées ; dessous, les entailles qui les comptent */
  ctx.fillStyle = "#070605"; ctx.beginPath(); ctx.moveTo(38, 186); ctx.lineTo(38, 156); ctx.quadraticCurveTo(40, 140, 120, 138); ctx.quadraticCurveTo(200, 140, 202, 156); ctx.lineTo(202, 186); ctx.closePath(); ctx.fill();
  const nl = ctx.createLinearGradient(0, 140, 0, 186); nl.addColorStop(0, rgba(60, 50, 40, 0.0)); nl.addColorStop(1, rgba(60, 50, 40, 0.35)); ctx.fillStyle = nl; ctx.fill();
  ctx.strokeStyle = rgba(120, 100, 78, 0.35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(38, 186); ctx.lineTo(38, 156); ctx.quadraticCurveTo(40, 140, 120, 138); ctx.quadraticCurveTo(200, 140, 202, 156); ctx.lineTo(202, 186); ctx.stroke();
  ctx.fillStyle = c("#4a3f33"); ctx.fillRect(34, 180, 172, 6); ctx.fillStyle = rgba(0, 0, 0, 0.45); ctx.fillRect(34, 186, 172, 3); /* le rebord */
  const good = Math.max(0, st.good || 0), amber = Math.max(0, st.amber || 0), bad = Math.max(0, st.bad || 0), PILL = require("./relto-oven").pill;
  r.hot.push({ x: 36, y: 138, w: 170, h: 76, tip: good || bad || amber ? tr("cave.shelf", { g: good, a: amber, b: bad }) : tr("cave.shelf.empty") }); /* sous les tas : chaque tas a sa zone, par-dessus */
  [["white", good, 54], ["amber", amber, 108], ["grey", bad, 160]].forEach(([kind, n, gx]) => { /* trois petits tas, un par sorte ; celui qu'on a choisi est éclairé */
    if (!n) return;
    if (st.pick === kind) { const hg = ctx.createRadialGradient(gx + 6, 176, 2, gx + 6, 176, 22); hg.addColorStop(0, rgba(230, 210, 160, 0.22)); hg.addColorStop(1, rgba(230, 210, 160, 0)); ctx.fillStyle = hg; ctx.fillRect(gx - 18, 156, 48, 30); }
    for (let j = 0; j < Math.min(n, 6); j++) { const p3 = j % 3, row = Math.floor(j / 3); PILL(ctx, p3 === 2 ? gx + 6 : gx + p3 * 12, (p3 === 2 ? 172 : 177.2) - row * 9.5, kind, 0.85); }
    r.hot.push({ x: gx - 10, y: 150, w: 34, h: 34, tip: tr("cave.pick." + kind, { n }) + ((st.fine || {})[kind] > 0 ? " " + tr("pellet.fine." + kind, { f: st.fine[kind] }) : "") + (st.pick === kind ? "" : " " + tr("cave.pick.choose")), cavePick: kind });
  });
  ctx.strokeStyle = rgba(200, 170, 120, 0.55); ctx.lineWidth = 1.4; /* les entailles Bahro, gravées dans la roche : une par granulé blanc, par cinq barrées */
  for (let i = 0; i < Math.min(good, 40); i++) { const grp = Math.floor(i / 5), j = i % 5, x = 44 + grp * 22 + j * 3.4, y = 198; if (j < 4) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y + 12); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(x - 14, y + 10); ctx.lineTo(x + 1, y + 2); ctx.stroke(); } }
  /* le bouton : une colonne de pierre taillée, une pierre ronde marquée d'une main, enfoncée tant que le granulé tombe */
  const down = !!(ph && ph.kind === "falling"), hov = r.hover && r.hover.caveDrop;
  const col = ctx.createLinearGradient(488, 0, 528, 0); col.addColorStop(0, c("#2e2720")); col.addColorStop(0.45, c("#4a3f33")); col.addColorStop(1, c("#221d18")); ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(484, 268); ctx.lineTo(490, 226); ctx.quadraticCurveTo(508, 220, 526, 226); ctx.lineTo(532, 268); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#54483a"); ctx.beginPath(); ctx.ellipse(508, 220, 26, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = c("#3a3128"); ctx.beginPath(); ctx.ellipse(508, 222, 26, 7, 0, 0, Math.PI); ctx.fill();
  const by = 211 + (down ? 4 : 0), bg2 = ctx.createRadialGradient(504, by - 2, 1, 508, by, 15); bg2.addColorStop(0, hov && !down ? "#d8c49a" : "#a8946e"); bg2.addColorStop(1, "#4a3f33");
  ctx.fillStyle = bg2; ctx.beginPath(); ctx.ellipse(508, by, 15, down ? 4 : 7, 0, 0, TAU); ctx.fill();
  if (!down) { ctx.fillStyle = rgba(40, 30, 20, 0.55); ctx.beginPath(); ctx.ellipse(508, by + 1, 4, 2.2, 0, 0, TAU); ctx.fill(); for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.ellipse(502 + f * 4, by - 2.6 - (f === 1 || f === 2 ? 0.6 : 0), 0.9, 2.2, (f - 1.5) * 0.15, 0, TAU); ctx.fill(); } } /* une main gravée, aux doigts longs */
  r.hot.push({ x: 478, y: 196, w: 60, h: 74, tip: down ? tr("cave.button.down") : good + bad + amber > 0 ? tr("cave.button") : tr("cave.button.empty"), caveDrop: !down && good + bad + amber > 0 });
  /* la faille vers le bas, dans la paroi de droite : des bords déchirés, un peu de vert qui luit au fond */
  const fh = r.hover && r.hover.go === "cavebottom";
  const crack = () => { ctx.beginPath(); ctx.moveTo(584, 96); ctx.lineTo(592, 104); ctx.lineTo(604, 110); ctx.lineTo(600, 140); ctx.lineTo(598, 170); ctx.lineTo(606, 196); ctx.lineTo(612, 230); ctx.lineTo(604, 250); ctx.lineTo(600, 266); ctx.lineTo(572, 266); ctx.lineTo(578, 240); ctx.lineTo(582, 214); ctx.lineTo(576, 184); ctx.lineTo(574, 150); ctx.lineTo(580, 120); ctx.closePath(); };
  ctx.strokeStyle = rgba(120, 100, 80, 0.3); ctx.lineWidth = 3; crack(); ctx.stroke();
  ctx.fillStyle = "#000"; crack(); ctx.fill();
  const gl = ctx.createLinearGradient(0, 266, 0, 160); gl.addColorStop(0, rgba(90, 200, 150, fh ? 0.28 : 0.12 + 0.04 * Math.sin(t * 1.3))); gl.addColorStop(1, rgba(90, 200, 150, 0)); ctx.save(); crack(); ctx.clip(); ctx.fillStyle = gl; ctx.fillRect(560, 150, 60, 120); ctx.restore();
  r.hot.push({ x: 566, y: 96, w: 52, h: 172, tip: tr("cave.down"), go: "cavebottom" });
  caveOre(r, ctx, (x, y) => { const cone = clamp(1 - Math.abs(x - 320) / (18 + (y / 270) * 105)); return shut ? 0.12 : 0.22 + 0.78 * cone; }, t, [1, 1, 0.95]); /* les minerais des pages, dans la roche : ils prennent le rai de jour */
  if (shut) { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H); } /* la trappe fermée : la caverne retourne au noir */
  /* des taches de mousse qui luit, çà et là */
  for (let i = 0; i < 9; i++) { const x = q("gx" + i) * W, y = 60 + q("gy" + i) * 190, a = 0.18 + 0.1 * Math.sin(t * 0.8 + i); ctx.fillStyle = rgba(110, 210, 160, a); ctx.beginPath(); ctx.arc(x, y, 1 + q("gr" + i) * 1.4, 0, TAU); ctx.fill(); }
  const v = ctx.createRadialGradient(W / 2, H / 2, 140, W / 2, H / 2, 420); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  require("./relto-atelier").backButton(r, ctx, tr("cave.back.vault"), "vault");
  void sc;
}

/**
 * Les Bahro ne se montrent pas : on voit leurs traces. Quand la lueur monte, de grandes ombres glissent sur la paroi
 * (portées par ce qui se tient entre l'eau et la roche, qu'on ne voit jamais) et s'éloignent ; à côté des peintures,
 * des empreintes de mains fraîches, ocre et humides, luisent, coulent un peu, et pâlissent quand la lumière baisse.
 * `k` : ms depuis le choc ; `a` : l'intensité (la lueur, et ce qu'elle a atteint).
 */
function traces(ctx, k, a, seenAt, t, hands) {
  if (a <= 0.01) return;
  const go = clamp(k / 6500); /* elles fuient : à 6,5 s, elles ont quitté la lumière */
  for (const [x0, dir, y, hgt, sp] of [[150, -1, 190, 150, 120], [470, 1, 175, 170, 150], [560, 1, 205, 120, 90]]) {
    const x = x0 + dir * go * go * sp, al = a * seenAt(y + hgt / 2) * (1 - go) * 0.8; if (al <= 0.01) continue;
    const g = ctx.createRadialGradient(x, y, 4, x, y, hgt * 0.55); g.addColorStop(0, rgba(2, 8, 6, al)); g.addColorStop(0.6, rgba(2, 8, 6, al * 0.6)); g.addColorStop(1, rgba(2, 8, 6, 0));
    ctx.save(); ctx.translate(x, y); ctx.rotate(dir * 0.12 + Math.sin(t * 0.9 + x0) * 0.03); ctx.scale(0.42, 1); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, hgt * 0.55, 0, TAU); ctx.fill(); ctx.restore();
  }
  for (const [x, y, rot, s2] of hands || [[214, 200, -0.3, 1.1], [236, 214, 0.15, 1], [432, 182, 0.4, 1.15]]) { /* les mains, encore humides : près de ce qu'ils viennent de peindre */
    const al = a * seenAt(y); if (al <= 0.01) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s2, s2); ctx.globalAlpha = al;
    ctx.fillStyle = "#d8803e"; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#d8803e"; ctx.lineWidth = 3; ctx.lineCap = "round"; for (let f = 0; f < 5; f++) { const an = -2.5 + f * 0.4, len = f === 0 ? 11 : 16; ctx.beginPath(); ctx.moveTo(Math.cos(an) * 6, Math.sin(an) * 7); ctx.lineTo(Math.cos(an) * len, Math.sin(an) * (len + 2)); ctx.stroke(); }
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(2, 7); ctx.lineTo(2.4, 7 + 6 * go + 3); ctx.stroke(); /* une coulure */
    ctx.fillStyle = "rgba(255,230,190,0.55)"; ctx.beginPath(); ctx.ellipse(-2, -3, 2.2, 1, -0.5, 0, TAU); ctx.fill(); /* le mouillé, qui prend la lumière */
    ctx.restore();
  }
}

function drawCaveBottom(r, ctx, sc, sky, t) {
  const tr = TR(r), st = stateOf(r), now = nowOf(r), ph = phaseOf(st.drop, now), seed = "cave";
  ctx.fillStyle = "#010203"; ctx.fillRect(0, 0, W, H);
  /* le bassin, à peine deviné ; des gouttes qui tombent dans le noir */
  ctx.strokeStyle = "rgba(90,120,130,0.10)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(320, 300, 170, 30, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 4; i++) { const k = fnv("drip" + i), x = 160 + (k % 320), q = ((t * 0.25 + i * 0.27) % 1); ctx.fillStyle = rgba(160, 190, 200, 0.25 * (1 - q)); ctx.fillRect(x, 40 + q * 250, 1, 3); }
  const kLit = ph && ph.kind === "lit" ? ph.k : -1, dim = kLit < 0 ? 1 : 1 - 0.9 * (kLit < 120 ? kLit / 120 : kLit < 700 ? 1 : Math.max(0, 1 - (kLit - 700) / 2200)); /* le creux : le blanc chasse le vert, puis le lac revient */
  /* le lac : chaque ambré y a laissé une colonie, jamais perdue ; nourries ces derniers jours elles pulsent, négligées elles restent des braises */
  { const n = Math.min(240, st.colonies || 0), fresh = clamp(1 - (now - (st.fedAt || 0)) / (3 * 86400000)), q = (k) => (fnv("colony" + k) % 10000) / 10000;
    for (let i = 0; i < n; i++) { const a = q("a" + i) * TAU, rr = Math.sqrt(q("r" + i)), x = 320 + Math.cos(a) * 160 * rr, y = 300 + Math.sin(a) * 26 * rr, s2 = 2 + q("s" + i) * 4, al = dim * (0.22 + 0.45 * fresh) * (0.75 + 0.25 * Math.sin(t * (0.6 + q("p" + i)) + i));
      const g = ctx.createRadialGradient(x, y, 0.5, x, y, s2 * 2.4); g.addColorStop(0, rgba(255, 170, 80, al)); g.addColorStop(1, rgba(255, 140, 60, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s2 * 2.4, s2 * 0.9, 0, 0, TAU); ctx.fill(); } }
  let lit = 0, reveal = 0;
  if (ph && ph.kind === "lit") {
    const k = ph.k, hold = ph.L - 2500; lit = k < 2500 ? k / 2500 : k < hold ? 1 : Math.max(0, 1 - (k - hold) / 2500); reveal = Math.min(H, (k / 3200) * H) * (k < hold ? 1 : lit); /* la lueur monte en 3 s, tient, puis retombe */
    const fx = (r._caveFx = r._caveFx || {}); if (!fx[st.drop.at]) { fx[st.drop.at] = true; if (r.opts.onCaveSfx) { r.opts.onCaveSfx("splash"); setTimeout(() => r.opts.onCaveSfx("scratch"), 1400); setTimeout(() => r.opts.onCaveSfx("cry"), 3200); } if (r.opts.onCaveSeen) r.opts.onCaveSeen(); }
  } else if (ph && ph.kind === "feed") { /* l'ambré : pas d'éclair, il fond et l'eau s'éclaire d'orangé, doucement */
    const fx = (r._caveFx = r._caveFx || {}); if (!fx[st.drop.at]) { fx[st.drop.at] = true; if (r.opts.onCaveSfx) r.opts.onCaveSfx("splash"); if (r.opts.onCaveSeen) r.opts.onCaveSeen(); }
    const k = ph.k / ph.L, a = Math.sin(Math.PI * k), g = ctx.createRadialGradient(320, 300, 4, 320, 300, 170); g.addColorStop(0, rgba(255, 190, 110, 0.6 * a)); g.addColorStop(0.4, rgba(255, 150, 70, 0.25 * a)); g.addColorStop(1, rgba(255, 140, 60, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(320, 300, 175, 34, 0, 0, TAU); ctx.fill();
  } else if (ph && ph.kind === "fizz") {
    const fx = (r._caveFx = r._caveFx || {}); if (!fx[st.drop.at]) { fx[st.drop.at] = true; if (r.opts.onCaveSfx) r.opts.onCaveSfx("fizz"); }
  }
  /* 4c : jusqu'où monte la lueur (une bande de plus par révélation), et ce que le lac éclaire sans elle (ses degrés) */
  const FR = require("./relto-fresco"), FC = require("./fresco"), name = (r.scene && r.scene.name) || "Relto", rseed = (r.scene && r.scene.seed) || 0, key = require("./telescope").keyOf(name, rseed);
  const revealed = st.revealed || 0, degree = FC.lakeDegree(st.colonies, st.fedAt, now), nFlash = lit > 0 ? Math.max(1, FC.bandsLit(revealed, degree, true)) : 0, nPerm = FC.bandsLit(revealed, degree, false);
  if (lit > 0) reveal = Math.min(reveal, H - FR.BAND_Y(nFlash - 1) + 24 + (nFlash >= FC.BANDS ? 40 : 0));
  const permA = (degree >= 3 ? 0.62 : degree >= 2 ? 0.42 : 0) * dim;
  if (permA > 0) { /* le lac vivant éclaire le bas de la paroi, sans éclair ; rendu à sa lumière, toute la caverne */
    const top = degree >= 3 ? 0 : FR.BAND_Y(0) - 40, gp = ctx.createLinearGradient(0, H, 0, top); gp.addColorStop(0, rgba(60, 200, 140, 0.30 * permA)); gp.addColorStop(1, rgba(40, 140, 110, 0));
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, H - top); ctx.clip(); ctx.globalAlpha = permA * 0.8; walls(ctx, "#1b2a24", seed); ctx.restore(); ctx.fillStyle = gp; ctx.fillRect(0, top, W, H - top);
  }
  if (lit > 0) {
    const g = ctx.createLinearGradient(0, H, 0, H - reveal); g.addColorStop(0, rgba(150, 205, 235, 0.5 * lit)); g.addColorStop(0.7, rgba(110, 160, 200, 0.24 * lit)); g.addColorStop(1, rgba(60, 90, 130, 0)); /* une lumière froide, blanc-bleu : pas le vert du lac */ /* la paroi, dans la lueur des algues */
    ctx.save(); ctx.beginPath(); ctx.rect(0, H - reveal, W, reveal); ctx.clip(); ctx.globalAlpha = lit; walls(ctx, "#1e2630", seed); ctx.restore(); /* la paroi n'apparaît que là où la lueur est montée */
    ctx.fillStyle = g; ctx.fillRect(0, H - reveal, W, reveal);
    ctx.save(); ctx.beginPath(); ctx.rect(0, H - reveal, W, reveal); ctx.clip(); for (let i = 0; i < 9; i++) { const kk = fnv("bstrata" + i); ctx.strokeStyle = rgba(30, 60, 50, 0.4 * lit); ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= W; x += 16) { const y = 30 + i * 28 + 6 * Math.sin(x / 60 + kk); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } ctx.restore();
    const rising = ph.k < ph.L - 2500 && reveal < H - 4; /* la crête de la vague, tant qu'elle monte */
    if (rising) { const yc = H - reveal, cg = ctx.createLinearGradient(0, yc - 6, 0, yc + 34); cg.addColorStop(0, rgba(210, 235, 255, 0)); cg.addColorStop(0.25, rgba(210, 235, 255, 0.32 * lit)); cg.addColorStop(1, rgba(210, 235, 255, 0)); ctx.fillStyle = cg; ctx.fillRect(0, yc - 6, W, 40); }
    caveOre(r, ctx, (x, y) => (y > H - reveal ? lit * clamp((y - (H - reveal)) / 40) : 0), t, [0.8, 1.15, 0.95]); /* l'or, l'argent, les gemmes s'allument dans la lueur verte */
  }
  const reached = (y) => (lit > 0 ? lit * clamp((reveal - (H - y)) / 40) : 0);
  const wonders = r.opts && typeof r.opts.wonders === "function" ? r.opts.wonders() || {} : {};
  const SK = (r.opts && typeof r.opts.stoneState === "function" && r.opts.stoneState()) || {}; /* après le 17 (src/story-stone.js) : dans le commandement, plus une fresque nouvelle, plus une trace */
  const items = FC.itemsOf((r.scene && r.scene.ages) || [], wonders).filter((it) => SK.cut == null || !(it.at > SK.cut));
  FR.drawFrescoes(ctx, items, (b, y) => Math.max(b < nFlash ? reached(y) : 0, b < nPerm ? permA * 1.3 : 0), key); /* l'histoire du joueur, la plus récente près de l'eau ; tout en haut, les Bahro */
  require("./relto-stars").gate(r, ctx, degree, t); /* le lac vivant ouvre le chemin d'en bas (section 15) */
  const slab = FC.slabOf(name, rseed, ((st.slabs || {})[key] || {}).turns);
  FR.drawVeinCode(ctx, slab.code, FC.glyphsFound(revealed), (y) => Math.max(reached(y), degree >= 3 && revealed > 0 ? 0.6 : 0), key); /* le code, le long de la veine : tout ce qui est trouvé, à chaque éclair ; la dalle est dans la chambre des souvenirs */
  if (lit > 0) {
    const seen = (y) => clamp((reveal - (H - y + 20)) / 50); /* la lueur doit les avoir atteintes */
    if (SK.traces !== false) traces(ctx, ph.k, lit, seen, t, FR.handsNear(items, key)); /* les Bahro : leurs ombres qui fuient, leurs mains encore humides ; jamais eux */
    const pg = ctx.createRadialGradient(320, 300, 4, 320, 300, 180); pg.addColorStop(0, rgba(235, 248, 255, 0.95 * lit)); pg.addColorStop(0.3, rgba(150, 200, 240, 0.42 * lit)); pg.addColorStop(1, rgba(80, 120, 170, 0)); ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(320, 300, 175, 32, 0, 0, TAU); ctx.fill();
  }
  if (ph && ph.kind === "fizz") { /* le raté : il flotte, et fume en vert */
    const k = ph.k / ph.L; ctx.save(); ctx.translate(320, 298 + Math.sin(t * 2) * 1.2); ctx.rotate(Math.sin(t * 0.7) * 0.15); require("./relto-oven").pill(ctx, 0, 0, "grey", 1); ctx.restore(); /* la pilule grise flotte, couchée */
    for (let i = 0; i < 6; i++) { const q = ((t * 0.4 + i / 6) % 1), x = 320 + Math.sin(i * 2 + t) * 8 * q; ctx.fillStyle = rgba(120, 200, 80, 0.25 * (1 - q) * (1 - k)); ctx.beginPath(); ctx.arc(x, 290 - q * 90, 6 + q * 14, 0, TAU); ctx.fill(); }
  }
  { const canSample = !!(r.available && r.available().scope); r.hot.push({ x: 150, y: 270, w: 340, h: 60, tip: (lit > 0 ? tr("cave.pool.lit") : tr("cave.pool")) + (canSample ? " — " + tr("cave.pool.sample") : ""), ...(canSample ? { caveSample: true } : {}) }); } /* le flacon du microscope se remplit ici */
  require("./relto-atelier").backButton(r, ctx, tr("cave.up"), "cavetop");
  void sc; void sky;
}

module.exports = { drawCaveTop, drawCaveBottom, vaultCrack, phaseOf, lightOf, FALL_MS, LIGHT_MS };
