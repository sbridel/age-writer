"use strict";
/**
 * Le microscope de l'atelier (claude/DESIGN-reve-et-caverne-bahro.md, section 12) : l'objet, sur le bureau à gauche de la lampe,
 * avec son flacon ; et la vue dans l'oculaire (`scope`) : un champ rond, l'eau du flacon, les algues en cellules vertes. Rien n'est
 * dit, tout se voit : combien, quel éclat, quel rythme (l'heure D'ni), quel état. Trois coupelles, à droite, versent une miette
 * de granulé dans la goutte sans dépenser le granulé : l'ambré nourrit, le blanc éclaire et tue, le gris fait se recroqueviller.
 * La miette ne vit que le temps de la vue (`r.scopeCrumb`) ; le lac n'en sait rien.
 *
 * État (dans le plugin) : r.opts.scopeState() → { flask, pellets } ; le flacon se remplit au bassin (src/relto-cave.js).
 */
const { rng, clamp, mix, rgba } = require("./util");
const S = require("./scope");
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const W = 640, H = 360, TAU = Math.PI * 2;
const FIELD = { x: 290, y: 180, r: 150 }, DISHES = { x: 566, ys: [112, 182, 252] }, KINDS = ["amber", "white", "grey"];
const PEL = { white: ["#f2f1ea", "#c3c8cc"], amber: ["#e09a4a", "#9a5a22"], grey: ["#8a8580", "#5a5652"] };

/** L'objet, sur le bureau : pied en fer à cheval, potence courbe, platine, miroir, tube incliné, vis ; le flacon à côté. Mêmes zones sous tous les habits. */
function drawMicroscope(r, ctx, c, skin, x, base, flask) {
  const tr = TR(r), s = 0.82, metal = skin === "castle" ? ["#2a2a30", "#b08a3a", "#e0c070"] : skin === "glass" ? ["#5a2e12", "#b5652a", "#e6a06a"] : ["#6a4e1a", "#b08a3a", "#e8c878"], [D, B, HI] = metal.map(c);
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.ellipse(2, 2, 30, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = D; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(20, -6); ctx.lineTo(-20, -6); ctx.closePath(); ctx.fill(); ctx.fillStyle = B; ctx.fillRect(-24, -5, 48, 3);
  ctx.lineCap = "round"; ctx.strokeStyle = D; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(6, -6); ctx.quadraticCurveTo(14, -40, 2, -58); ctx.stroke(); ctx.strokeStyle = B; ctx.lineWidth = 4; ctx.stroke(); ctx.lineCap = "butt";
  ctx.fillStyle = D; ctx.fillRect(-18, -30, 30, 3); ctx.fillStyle = B; ctx.fillRect(-18, -33, 30, 3); ctx.fillStyle = c("#9ad8e8"); ctx.fillRect(-12, -35, 16, 2);
  ctx.fillStyle = D; ctx.beginPath(); ctx.arc(-4, -22, 5, 0, TAU); ctx.fill(); ctx.fillStyle = B; ctx.beginPath(); ctx.arc(-4, -22, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = rgba(255, 255, 255, 0.35); ctx.beginPath(); ctx.arc(-5, -23, 1.2, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(-4, -58); ctx.rotate(0.35);
  ctx.fillStyle = D; ctx.fillRect(-5, -30, 10, 34); ctx.fillStyle = B; ctx.fillRect(-4, -30, 6, 34); ctx.fillStyle = HI; ctx.fillRect(-3, -30, 1.5, 34);
  ctx.fillStyle = D; ctx.fillRect(-6, -34, 12, 5); ctx.fillRect(-4, 2, 8, 8); ctx.fillStyle = c("#223"); ctx.fillRect(-3, 9, 6, 2); ctx.fillStyle = B; ctx.fillRect(-7, -12, 14, 3);
  ctx.restore();
  ctx.fillStyle = D; ctx.beginPath(); ctx.arc(10, -44, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = B; ctx.beginPath(); ctx.arc(10, -44, 2.2, 0, TAU); ctx.fill();
  ctx.restore();
  /* le flacon, à droite du pied */
  const fx = x + 34, full = !!(flask && flask.at > 0);
  ctx.save(); ctx.translate(fx, base);
  ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.beginPath(); ctx.ellipse(1, 1, 9, 2.5, 0, 0, TAU); ctx.fill();
  const body = () => { ctx.beginPath(); ctx.moveTo(-4, -24); ctx.lineTo(4, -24); ctx.lineTo(4, -14); ctx.quadraticCurveTo(10, -10, 9, 0); ctx.lineTo(-9, 0); ctx.quadraticCurveTo(-10, -10, -4, -14); ctx.closePath(); };
  ctx.fillStyle = rgba(180, 220, 230, 0.28); body(); ctx.fill();
  if (full) { ctx.save(); body(); ctx.clip(); ctx.fillStyle = rgba(30, 60, 50, 0.85); ctx.fillRect(-10, -9, 20, 9); if (flask.colonies > 0) { ctx.fillStyle = rgba(120, 230, 170, 0.75); for (const [a, b] of [[-3, -4], [2, -2], [4, -6], [-5, -2]].slice(0, Math.min(4, 1 + Math.floor(flask.colonies / 20)))) ctx.fillRect(a, b, 1.3, 1.3); } ctx.restore(); }
  ctx.strokeStyle = rgba(220, 240, 245, 0.6); ctx.lineWidth = 1; body(); ctx.stroke(); ctx.fillStyle = c("#6a4a30"); ctx.fillRect(-5, -27, 10, 4);
  ctx.restore();
  r.hot.push({ x: x - 24, y: base - 80, w: 46, h: 84, tip: tr("scope.tip"), go: "scope" });
  r.hot.push({ x: fx - 11, y: base - 30, w: 22, h: 32, tip: full ? tr("scope.flask.full") : tr("scope.flask.empty") });
}

/** Une algue : un disque vert luisant, un noyau clair, des cils. `glow` 0..1 ; `pale` : éteinte. */
function cell(ctx, x, y, rad, k, glow, pale) {
  if (glow > 0.02) { const g = ctx.createRadialGradient(x, y, rad * 0.5, x, y, rad * 3.2); g.addColorStop(0, rgba(150, 255, 190, 0.35 * glow)); g.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * 3.2, 0, TAU); ctx.fill(); }
  /* une cellule éteinte (oubliée) est une braise : sombre, son noyau à peine rouge */
  const life = 0.3 + 0.7 * glow, emb = clamp(1 - glow * 6);
  ctx.fillStyle = pale ? rgba(90, 110, 90, 0.5) : rgba(70 - 30 * emb, 160 - 90 * emb, 110 - 70 * emb, 0.3 + 0.6 * life); ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.82, k, 0, TAU); ctx.fill();
  ctx.strokeStyle = pale ? rgba(120, 130, 110, 0.45) : rgba(170, 240, 190, 0.15 + 0.7 * glow); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = pale ? rgba(60, 70, 60, 0.8) : emb > 0.5 ? rgba(190, 90, 50, 0.55) : rgba(220, 255, 230, 0.35 + 0.65 * glow); ctx.beginPath(); ctx.arc(x + rad * 0.2, y - rad * 0.1, rad * 0.28, 0, TAU); ctx.fill();
  ctx.strokeStyle = pale ? rgba(120, 130, 110, 0.3) : rgba(170, 240, 190, 0.1 + 0.35 * glow); for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + k; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.82); ctx.lineTo(x + Math.cos(a) * (rad + 4), y + Math.sin(a) * (rad * 0.82 + 4)); ctx.stroke(); }
}
/** Une enveloppe crevée : un arc ouvert, le contenu répandu. */
function burst(ctx, x, y, rad, k) {
  ctx.strokeStyle = rgba(120, 140, 120, 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rad, k, k + 4.2); ctx.stroke();
  ctx.fillStyle = rgba(90, 160, 110, 0.18); ctx.beginPath(); ctx.ellipse(x + 6, y + 4, rad * 1.6, rad * 0.9, k, 0, TAU); ctx.fill();
}

function drawScope(r, ctx, sc, sky, t) {
  const tr = TR(r), st = (r.opts && r.opts.scopeState && r.opts.scopeState()) || {}, P = S.paramsOf(st.flask), pel = st.pellets || {}, now = r.nowOverride != null ? r.nowOverride : Date.now();
  const { x: cx, y: cy, r: R } = FIELD;
  ctx.fillStyle = "#050607"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  const bg = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, R); bg.addColorStop(0, P.dry ? "#2a2a24" : "#1c2a2a"); bg.addColorStop(0.7, P.dry ? "#1a1a16" : "#0f1b1c"); bg.addColorStop(1, "#060a0b"); ctx.fillStyle = bg; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  const q = rng((P.seed || 7) + 11);
  if (P.dry) { /* une lame sèche : des craquelures, du sel */
    ctx.strokeStyle = rgba(200, 190, 160, 0.25); ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { let x = cx + (q() - 0.5) * 2 * R, y = cy + (q() - 0.5) * 2 * R; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (q() - 0.5) * 40; y += (q() - 0.5) * 40; ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.fillStyle = rgba(230, 225, 210, 0.2); for (let i = 0; i < 60; i++) ctx.fillRect(cx + (q() - 0.5) * 2 * R, cy + (q() - 0.5) * 2 * R, 1.4, 1.4);
  } else {
    for (let i = 0; i < 70; i++) { ctx.fillStyle = rgba(180, 200, 190, 0.04 + q() * 0.08); ctx.beginPath(); ctx.arc(cx + (q() - 0.5) * 2 * R + Math.sin(t * 0.2 + i) * 3, cy + (q() - 0.5) * 2 * R, 0.6 + q() * 1.6, 0, TAU); ctx.fill(); } /* des poussières d'eau */
    const rh = S.rhythm(now), crumb = r.scopeCrumb, e = crumb ? (now - crumb.at) / 1000 : -1, mx = cx - 8, my = cy + 10;
    const weak = !!(crumb && crumb.kind === "amber" && !(((pel.fine || {}).amber || 0) > 0)); /* la miette vient du meilleur ambré qu'on ait ; s'ils sont tous approximatifs, elles mangent mollement (section 18) */
    /* la miette : un éclat de granulé au milieu de la goutte */
    if (crumb) {
      const col = PEL[crumb.kind] || PEL.grey, rad = crumb.kind === "amber" ? Math.max(3, 10 - e * 0.9) : crumb.kind === "white" ? 9 : 8;
      if (crumb.kind === "amber") { ctx.fillStyle = rgba(217, 138, 58, 0.25 * clamp(e / 2)); for (let i = 0; i < 40; i++) { const a = q() * TAU, d = q() * Math.min(110, 20 + e * 12); ctx.beginPath(); ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d * 0.8, 1 + q() * 1.8, 0, TAU); ctx.fill(); } }
      if (crumb.kind === "grey") { const g = ctx.createRadialGradient(mx, my, 4, mx, my, 40 + e * 14); g.addColorStop(0, rgba(140, 150, 120, 0.3)); g.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R); }
      ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(mx, my, rad * 1.5, rad, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(mx + rad * 0.4, my + rad * 0.3, rad * 0.8, rad * 0.4, 0.3, 0, TAU); ctx.fill();
    }
    /* les cellules : leur place est tirée de la graine du flacon ; elles dérivent, pulsent, s'allument au rythme D'ni */
    const n = P.cells, glowBase = P.dormant ? 0.06 : P.fresh * (0.35 + 0.65 * rh);
    if (!n) { cell(ctx, cx + 90, cy + 60, 7, 0.4, 0, true); cell(ctx, cx - 110, cy - 40, 6, 1.1, 0, true); } /* une goutte vide : deux cellules éteintes, rien */
    const cq = rng((P.seed || 7) * 31 + 5);
    for (let i = 0; i < n; i++) {
      const a = cq() * TAU, d = Math.sqrt(cq()) * R * 0.92, ph = cq() * TAU; let x = cx + Math.cos(a) * d + Math.sin(t * 0.13 + ph) * 5, y = cy + Math.sin(a) * d + Math.cos(t * 0.11 + ph) * 4;
      let rad = (P.cells > 40 ? 5 : 7) + cq() * 5, k = cq() * 3, glow = clamp(glowBase * (0.75 + 0.25 * Math.sin(t * 1.3 + ph))), pale = false, dead = P.burst && cq() < 0.45, twin = !dead && i < n * P.divide;
      if (crumb && e >= 0) {
        const dx = x - mx, dy = y - my, dist = Math.hypot(dx, dy);
        if (crumb.kind === "amber" && dist < (weak ? 70 : 120)) { const pull = clamp(e / (weak ? 10 : 6)) * (weak ? 0.18 : 0.45); x -= dx * pull; y -= dy * pull; glow = Math.max(glow, clamp(e / 3) * (weak ? 0.45 : 0.95)); if (!weak && e > 3 && i % 2 === 0) twin = true; } /* elles mangent, et se divisent */
        if (crumb.kind === "white") { if (dist < 85 && e > 0.6) dead = true; else glow = Math.max(glow, Math.max(0, 1 - e / 2)); } /* un flash : celles qui sont près s'ouvrent et meurent */
        if (crumb.kind === "grey" && dist < 110) { const k2 = clamp(e / 3); rad *= 1 - 0.45 * k2; glow *= 1 - k2; pale = k2 > 0.6; } /* elles se recroquevillent */
      }
      if (dead) { burst(ctx, x, y, rad, k); continue; }
      if (twin) { const sp = 3 + 3 * (0.5 + 0.5 * Math.sin(t * 0.5 + ph)); cell(ctx, x - sp, y, rad * 0.85, k, glow, pale); cell(ctx, x + sp, y, rad * 0.85, k + 1, glow, pale); ctx.strokeStyle = rgba(220, 255, 230, 0.5 * glow + 0.15); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - rad * 0.7); ctx.lineTo(x, y + rad * 0.7); ctx.stroke(); }
      else cell(ctx, x, y, rad, k, glow, pale);
    }
    if (crumb && crumb.kind === "white" && e >= 0 && e < 2.5) { const f = e < 0.3 ? e / 0.3 : Math.max(0, 1 - (e - 0.3) / 2.2), g = ctx.createRadialGradient(mx, my, 4, mx, my, R * 1.2); g.addColorStop(0, rgba(225, 240, 255, 0.85 * f)); g.addColorStop(1, rgba(200, 225, 255, 0)); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R); }
  }
  ctx.restore();
  /* la bague de l'oculaire, un reflet */
  ctx.strokeStyle = "#1a1410"; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, TAU); ctx.stroke(); ctx.strokeStyle = "#b08a3a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, TAU); ctx.stroke();
  ctx.fillStyle = rgba(255, 255, 255, 0.07); ctx.beginPath(); ctx.ellipse(cx - 70, cy - 80, 50, 22, -0.6, 0, TAU); ctx.fill();
  r.hot.push({ x: cx - R * 0.7, y: cy - R * 0.7, w: R * 1.4, h: R * 1.4, tip: P.dry ? tr("scope.dry") : tr("scope.field") });
  /* les trois coupelles : une miette de granulé, sans le dépenser */
  KINDS.forEach((k, i) => {
    const y = DISHES.ys[i], x = DISHES.x, has = (pel[k] || 0) > 0, dishKey = "scope.dish." + k;
    ctx.globalAlpha = has ? 1 : 0.35;
    ctx.fillStyle = "#2a2622"; ctx.beginPath(); ctx.ellipse(x, y + 7, 36, 11, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#4a4440"; ctx.beginPath(); ctx.ellipse(x, y + 3, 33, 10, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#b08a3a"; ctx.lineWidth = 1.2; ctx.stroke();
    if (has) { const col = PEL[k]; for (const [dx, dy, s] of [[-9, 3, 1.4], [7, 4, 1.1], [0, -1, 1], [13, 0, 0.7]]) { ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 3.4 * s, 2.2 * s, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(x + dx + 0.8, y + dy + 0.6, 1.6 * s, 0.9 * s, 0.3, 0, TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
    r.hot.push({ x: x - 38, y: y - 18, w: 76, h: 38, tip: has ? tr(dishKey) : tr("scope.dish.none"), ...(has && !P.dry ? { scopeCrumb: k } : {}) });
  });
  require("./relto-atelier").backButton(r, ctx, tr("scope.back"), "desk");
  void sc; void sky; void mix;
}

module.exports = { drawMicroscope, drawScope, FIELD, DISHES };
