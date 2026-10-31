"use strict";
/**
 * 2.5 (I) : le feu du Relto. Un seul dessin pour la cheminée de la cabane, celle de l'atelier et le poêle du salon.
 *
 *   le bois   chaque foyer a son bois : une bûche brûle une heure, le foyer en tient quatre (une soirée) ; le temps passe même
 *             quand Obsidian est fermé. Puis les braises (une heure), puis la cendre froide. Le bûcher à côté ne se vide jamais.
 *   la couleur  sans page : celle du dernier Âge visité (par le panneau de liaison), selon la vraie chimie des flammes ; avec la
 *             page « Couleur du feu » : un clic sur le feu passe à la couleur suivante, et le choix est gardé.
 *
 * L'état tient dans `plugin.ext.reltoFire` : { until: { cabin, atelier, lounge } (l'heure où le bois finit), pick, last }.
 * Les fonctions d'état sont pures ; `drawFire`, `drawWoodpile` dessinent.
 */
const HOUR = 3600000, LOG = HOUR, MAX_LOGS = 4, EMBERS = HOUR, FIRST = 2 * HOUR;
const HEARTHS = ["cabin", "atelier", "lounge"];

/* les couleurs : [bord, milieu, cœur] ; teintes d'après les tests de flamme (référence de teintes seulement) */
const COLORS = [
  { id: "ordinary", fr: "le feu ordinaire", en: "the ordinary fire", c: [[255, 100, 25], [255, 175, 60], [255, 238, 170]] },
  { id: "lithium", fr: "rouge (lithium)", en: "red (lithium)", c: [[190, 15, 45], [235, 55, 80], [255, 175, 180]] },
  { id: "sodium", fr: "jaune (sodium)", en: "yellow (sodium)", c: [[255, 160, 0], [255, 210, 40], [255, 250, 190]] },
  { id: "potassium", fr: "lilas (potassium)", en: "lilac (potassium)", c: [[160, 100, 215], [200, 155, 240], [245, 228, 255]] },
  { id: "rubidium", fr: "rose (rubidium)", en: "pink (rubidium)", c: [[195, 45, 110], [235, 110, 160], [255, 212, 228]] },
  { id: "caesium", fr: "violet (césium)", en: "violet (caesium)", c: [[105, 70, 215], [150, 125, 245], [225, 215, 255]] },
  { id: "calcium", fr: "orange (calcium)", en: "orange (calcium)", c: [[235, 70, 15], [255, 125, 45], [255, 208, 160]] },
  { id: "strontium", fr: "rouge vif (strontium)", en: "bright red (strontium)", c: [[225, 15, 15], [255, 55, 35], [255, 180, 160]] },
  { id: "barium", fr: "vert pâle (baryum)", en: "pale green (barium)", c: [[130, 190, 70], [175, 228, 120], [235, 255, 205]] },
  { id: "copper", fr: "turquoise (cuivre)", en: "turquoise (copper)", c: [[15, 160, 150], [55, 215, 190], [200, 255, 240]] },
  { id: "iron", fr: "or (fer)", en: "gold (iron)", c: [[225, 140, 25], [250, 188, 70], [255, 236, 175]] },
  { id: "boron", fr: "vert (bore)", en: "green (boron)", c: [[30, 185, 55], [95, 238, 100], [210, 255, 200]] },
  { id: "blue", fr: "bleu (soufre, sélénium)", en: "blue (sulfur, selenium)", c: [[45, 75, 250], [80, 150, 255], [205, 232, 255]] },
  { id: "magnesium", fr: "blanc (magnésium)", en: "white (magnesium)", c: [[195, 205, 228], [232, 238, 250], [255, 255, 255]] },
  { id: "ghost", fr: "fantôme", en: "ghost", c: [[120, 150, 170], [170, 198, 210], [228, 240, 245]], ghost: true },
];
const BY_ID = Object.fromEntries(COLORS.map((x, i) => [x.id, i]));
const colorById = (id) => COLORS[BY_ID[id] != null ? BY_ID[id] : 0];

/**
 * La couleur du feu d'après un Âge (`ids` : ce qui y est, `verdict`). Un Âge mourant donne un feu fantôme ; sinon la flamme la plus
 * forte l'emporte, comme en vrai : le sodium d'abord, puis le cuivre, puis les autres.
 */
const ORDER = [
  ["sodium", ["salt", "salt_flats", "brine"]],
  ["copper", ["copper"]],
  ["potassium", ["ash", "charred_grove", "wildfire", "burnt", "lightning", "storm"]],
  ["calcium", ["chalk"]],
  ["iron", ["iron"]],
  ["blue", ["acid", "poisoned_air"]],
];
function colorOfAge(ids, verdict) {
  if (verdict === "dying") return "ghost";
  const has = (x) => (ids && typeof ids.has === "function" ? ids.has(x) : (ids || []).includes(x));
  for (const [id, keys] of ORDER) if (keys.some(has)) return id;
  return "ordinary";
}

/** Ce qui est dans un Âge, d'après son analyse (les lignes écrites, la matière, les réactions, les cicatrices). */
function idsOfAnalysis(a) {
  const res = a && a.resolved, ids = new Set(); if (!res) return ids;
  for (const l of res.lines || []) if (l.entry) ids.add(l.entry.id);
  for (const w of (res.matter && res.matter.written) || []) ids.add(w);
  for (const x of (res.matter && res.matter.reactions) || []) ids.add(x.result);
  for (const x of res.scars || []) ids.add(x.id);
  return ids;
}
/** Retenir la couleur du dernier Âge visité (dans `ext.reltoFire.last`). Renvoie la couleur. */
function rememberAge(ext, a) { if (!ext || !a) return null; const f = (ext.reltoFire = ext.reltoFire || {}); f.last = colorOfAge(idsOfAnalysis(a), a.verdict); return f.last; }

/** L'état d'un foyer à l'heure `now` : `until` l'heure où le bois finit (null : jamais allumé, le feu brûle depuis peu). */
function hearthOf(until, now) {
  if (until == null) until = now + FIRST;
  const rem = until - now;
  if (rem > 0) return { phase: "flame", level: Math.min(1, rem / (2 * LOG)), logs: Math.min(MAX_LOGS, Math.ceil(rem / LOG)), glow: 1 };
  const out = now - until;
  if (out < EMBERS) return { phase: "embers", level: 0, logs: 1, glow: 1 - out / EMBERS };
  return { phase: "cold", level: 0, logs: 0, glow: 0 };
}
/** Une bûche de plus : une heure de feu, quatre au plus. Renvoie le nouvel `until` (le même si le foyer est plein). */
function addLog(until, now) {
  const base = until == null ? now + FIRST : Math.max(until, now);
  return Math.min(now + MAX_LOGS * LOG, base + LOG);
}
const isFull = (until, now) => until != null && until - now > (MAX_LOGS - 1) * LOG;

/** La couleur affichée : la page passe avant ; sans page, le dernier Âge visité. */
function shownColor(st, hasPage) {
  st = st || {};
  if (hasPage && st.pick != null && COLORS[st.pick]) return COLORS[st.pick];
  return colorById(st.last || "ordinary");
}
/** Un clic sur le feu, avec la page : la couleur suivante (on part de celle qu'on voit). */
function nextPick(st) {
  st = st || {};
  const cur = st.pick != null ? st.pick : BY_ID[st.last || "ordinary"] || 0;
  return (cur + 1) % COLORS.length;
}

// ---- le dessin -----------------------------------------------------------------------------------------------
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Une bûche : un rondin d'écorce sombre, le bout coupé clair à cernes, des fentes de braise qui battent quand le feu est là. */
function oneLog(ctx, x, y, len, rr, a, lit, glow, col, t, seed) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = lit ? "#33201a" : "#2a2522"; ctx.beginPath(); ctx.moveTo(-len / 2, -rr); ctx.lineTo(len / 2, -rr * 0.92); ctx.quadraticCurveTo(len / 2 + rr * 0.5, 0, len / 2, rr * 0.92); ctx.lineTo(-len / 2, rr); ctx.quadraticCurveTo(-len / 2 - rr * 0.4, 0, -len / 2, -rr); ctx.fill();
  ctx.strokeStyle = lit ? "rgba(20,12,8,0.8)" : "rgba(30,28,26,0.8)"; ctx.lineWidth = 0.7; for (let k = 0; k < 3; k++) { const yy = -rr * 0.55 + k * rr * 0.5; ctx.beginPath(); ctx.moveTo(-len * 0.42, yy); ctx.lineTo(len * 0.38, yy + (k - 1) * 0.6); ctx.stroke(); } /* l'écorce */
  ctx.fillStyle = lit ? "#7a5232" : "#4a4440"; ctx.beginPath(); ctx.ellipse(len / 2, 0, rr * 0.42, rr * 0.9, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = lit ? "#5a3a22" : "#3a3633"; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(len / 2, 0, rr * 0.22, rr * 0.48, 0, 0, 6.283); ctx.stroke(); /* le bout coupé, ses cernes */
  if (glow > 0) for (let k = 0; k < 5; k++) { const f = 0.5 + 0.5 * Math.sin(t * (1.1 + k * 0.37) + k * 2.3 + seed * 5), xx = -len * 0.4 + k * len * 0.19, ember = mixc(col[0], [255, 70, 20], 0.55);
    ctx.strokeStyle = rgba(ember, glow * (0.3 + 0.6 * f)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xx, rr * 0.5); ctx.lineTo(xx + len * 0.08, rr * 0.15 + ((k + seed) % 2) * 1.5); ctx.stroke(); } /* les fentes de braise, sous le rondin */
  ctx.restore();
}
/** Les bûches dans le foyer : `n` bûches (0 à 4) croisées ; derrière, le lit de braises. `front` : les deux de devant seulement. */
function drawLogs(ctx, mx, by, w, n, glow, col, t, front) {
  const rr = Math.max(3, w * 0.055), len = w * 0.6, lit = n > 0;
  const all = [[-0.28, 0, -0.2, 0], [0.28, 0, 0.2, 1], [0, 1, -0.04, 2], [-0.1, 2, 0.12, 3]];
  const L = front ? all.slice(0, 2) : all.slice(0, Math.max(1, n));
  if (!front && glow > 0) { const bed = ctx.createRadialGradient(mx, by, 0, mx, by, w * 0.42); bed.addColorStop(0, rgba(mixc(col[0], [255, 80, 20], 0.5), 0.7 * glow)); bed.addColorStop(1, rgba(col[0], 0)); ctx.fillStyle = bed; ctx.save(); ctx.translate(mx, by); ctx.scale(1, 0.22); ctx.beginPath(); ctx.arc(0, 0, w * 0.42, 0, 6.283); ctx.restore(); ctx.fill();
    for (let k = 0; k < 14; k++) { const x = mx + (((k * 0.618) % 1) - 0.5) * w * 0.62, f = 0.5 + 0.5 * Math.sin(t * (1.7 + (k % 5) * 0.3) + k), ember = mixc(col[1], [255, 120, 30], 0.5); ctx.fillStyle = rgba(ember, glow * (0.4 + 0.6 * f)); ctx.beginPath(); ctx.arc(x, by + 1 + (k % 3), 1 + (k % 2) * 0.6, 0, 6.283); ctx.fill(); } } /* le lit de braises, des points qui battent */
  for (const [dx, row, a, sd] of (front ? L : L.slice().reverse())) oneLog(ctx, mx + dx * w * 0.36, by - rr - row * rr * 1.55, len, rr, a, lit, glow, col, t, sd);
}

/**
 * Le feu : des langues qui montent du lit de braises, plus hautes au milieu. Chacune est étroite au pied, s'élargit, puis s'effile en
 * pointe ; seul le haut ondule. Trois couches (un bord, un milieu, un cœur), quelques flammèches qui se détachent au-dessus, des
 * étincelles, et la lueur posée autour. `o` : { mx, by (le pied des flammes), w (la largeur du foyer), size (la hauteur à plein feu),
 * st (hearthOf), col (COLORS), t, logsDrawn }.
 */
function drawFire(ctx, o) {
  const { mx, by, w, size, st, col, t } = o, C = col.c, gh = col.ghost ? 0.55 : 1;
  if (o.logsDrawn !== false) drawLogs(ctx, mx, by + 4, w, st.logs, st.glow, C, t);
  if (st.phase === "cold") { ctx.fillStyle = "rgba(150,145,140,0.35)"; ctx.beginPath(); ctx.ellipse(mx, by + 3, w * 0.36, 2.4, 0, 0, 6.283); ctx.fill(); return; } /* la cendre froide */
  const lv = st.phase === "embers" ? 0 : 0.25 + 0.75 * st.level;
  if (lv <= 0) return;
  const n = Math.round(4 + 5 * lv), H0 = size * (0.55 + 0.6 * lv);
  ctx.save(); ctx.globalCompositeOperation = "lighter"; const hal = ctx.createRadialGradient(mx, by - H0 * 0.35, 0, mx, by - H0 * 0.35, H0 * 1.1); hal.addColorStop(0, rgba(C[1], 0.26 * gh)); hal.addColorStop(1, rgba(C[0], 0)); ctx.fillStyle = hal; ctx.fillRect(mx - H0 * 1.2, by - H0 * 1.5, H0 * 2.4, H0 * 1.8); ctx.restore(); /* la lueur */
  const tongues = [];
  for (let i = 0; i < n; i++) { const u0 = n === 1 ? 0 : (i / (n - 1) - 0.5) * (0.9 + 0.1 * Math.sin(i * 7.1)), ph = i * 2.39 + 0.7, fl = 0.5 + 0.5 * Math.sin(t * (3.1 + i * 0.23) + ph) * Math.sin(t * (1.9 + i * 0.41) + ph * 1.7);
    tongues.push({ x0: mx + u0 * w * 0.55 * (0.7 + 0.3 * lv), hh: H0 * (1 - 0.62 * Math.pow(Math.abs(u0) * 2, 1.6)) * (0.62 + 0.38 * fl) * (0.85 + 0.15 * Math.sin(i * 3.3)), ww: (w * 0.075 + 2.5) * (0.85 + 0.3 * lv), ph, back: i % 2 === 0 }); }
  const drawT = (T, layer) => {
    const { x0, hh, ww, ph } = T, m = 14, L = [], R = [];
    for (let k = 0; k <= m; k++) { const u = k / m, sway = Math.pow(u, 2) * ww * 1.1 * Math.sin(t * 3.3 + ph - u * 4.2) + Math.pow(u, 1.2) * ww * 0.3 * Math.sin(t * 1.3 + ph * 2), cx = x0 + sway, cy = by - u * hh;
      const hw = ww * Math.sin(Math.PI * Math.min(1, 0.18 + u * 0.95)) * Math.pow(1 - u, 0.55); L.push([cx - hw, cy]); R.push([cx + hw, cy]); }
    const shape = (kx, ky) => { const p = (P) => [x0 + (P[0] - x0) * kx, by - (by - P[1]) * ky]; ctx.beginPath(); ctx.moveTo(...p(L[0])); for (let k = 1; k < L.length; k++) { const a = p(L[k - 1]), b = p(L[k]); ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.lineTo(...p(L[L.length - 1])); for (let k = R.length - 1; k >= 0; k--) ctx.lineTo(...p(R[k])); ctx.closePath(); };
    if (layer === 0) { const g1 = ctx.createLinearGradient(0, by, 0, by - hh); g1.addColorStop(0, rgba(C[0], 0.95 * gh)); g1.addColorStop(0.55, rgba(C[0], 0.75 * gh)); g1.addColorStop(1, rgba(C[0], 0.05 * gh)); ctx.fillStyle = g1; shape(1, 1); ctx.fill(); } /* le bord */
    if (layer === 1) { const g2 = ctx.createLinearGradient(0, by, 0, by - hh * 0.75); g2.addColorStop(0, rgba(C[1], 0.95 * gh)); g2.addColorStop(0.7, rgba(C[1], 0.6 * gh)); g2.addColorStop(1, rgba(C[1], 0)); ctx.fillStyle = g2; shape(0.62, 0.75); ctx.fill(); } /* le milieu */
    if (layer === 2) { const g3 = ctx.createLinearGradient(0, by, 0, by - hh * 0.42); g3.addColorStop(0, rgba(C[2], 0.95 * gh)); g3.addColorStop(1, rgba(C[2], 0)); ctx.fillStyle = g3; shape(0.34, 0.42); ctx.fill(); } /* le cœur, au pied */
  };
  for (const T of tongues.filter((x) => x.back)) drawT(T, 0); /* les langues du fond, d'abord */
  for (const T of tongues.filter((x) => !x.back)) drawT(T, 0);
  for (const T of tongues) drawT(T, 1);
  for (const T of tongues) drawT(T, 2);
  for (let i = 0; i < Math.round(2 + 3 * lv); i++) { const T = tongues[(i * 3 + 1) % tongues.length], p = (t * 1.4 + i * 0.37) % 1, x = T.x0 + Math.sin(t * 3 + i) * T.ww * 0.6, y = by - T.hh * (0.95 + p * 0.45), r = T.ww * 0.35 * (1 - p); if (r < 0.4) continue;
    ctx.fillStyle = rgba(C[0], (1 - p) * 0.8 * gh); ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x - r * 0.6, y - r * 2, x, y - r * 3); ctx.quadraticCurveTo(x + r * 0.6, y - r * 2, x + r, y); ctx.closePath(); ctx.fill(); } /* des flammèches qui se détachent */
  if (o.logsDrawn !== false && st.logs >= 2) drawLogs(ctx, mx, by + 4, w, 2, st.glow, C, t, true); /* les deux bûches de devant, par-dessus le pied des flammes */
  for (let i = 0; i < Math.round(3 + 5 * lv); i++) { const p = (t * 0.45 + i * 0.173) % 1, x = mx + Math.sin(p * 8 + i * 2.7) * w * 0.18, y = by - H0 * 0.5 - p * H0 * 1.4; ctx.fillStyle = rgba(mixc(C[2], C[0], p), (1 - p) * 0.9 * gh); ctx.fillRect(x, y, 1.4, 1.4); } /* les étincelles */
}

/** La lueur du feu dans la pièce (plus faible quand il baisse, presque rien en braises). */
function fireGlow(ctx, mx, y, R, st, col, fl) {
  const C = col.c, a = (st.phase === "flame" ? 0.05 + 0.08 * st.level : st.phase === "embers" ? 0.03 * st.glow : 0) * (col.ghost ? 0.5 : 1) * (0.8 + 0.2 * fl);
  if (a <= 0) return;
  const g = ctx.createRadialGradient(mx, y, 0, mx, y, R); g.addColorStop(0, rgba(C[1], a)); g.addColorStop(1, rgba(C[1], 0)); ctx.fillStyle = g; ctx.fillRect(mx - R, y - R, 2 * R, 2 * R);
}

/** La couleur de la lumière que le feu jette dans la pièce (le feu ordinaire garde son orange d'avant). */
const glowColor = (col) => (col.id === "ordinary" ? [255, 150, 60] : mixc(col.c[0], col.c[1], 0.4));

/** Le bûcher : un panier de bois fendu, toujours plein. */
function drawWoodpile(ctx, x, y, w, c) {
  const h = w * 0.62;
  ctx.fillStyle = c("#2c2018"); ctx.fillRect(x, y - h * 0.55, w, h * 0.55); /* le panier */
  ctx.strokeStyle = c("#4a3626"); ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 1, y - (h * 0.55 * k) / 4); ctx.lineTo(x + w - 1, y - (h * 0.55 * k) / 4); ctx.stroke(); }
  const r = w / 7;
  for (let row = 0; row < 3; row++) for (let k = 0; k < 3 - (row === 2 ? 1 : 0); k++) { const cx = x + r * 1.3 + k * r * 2.2 + (row % 2) * r * 1.1, cy = y - h * 0.55 - r * 0.6 - row * r * 1.7; ctx.fillStyle = c("#5c3c24"); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#b48a5c"); ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#8a6440"); ctx.beginPath(); ctx.arc(cx, cy, r * 0.38, 0, 6.283); ctx.stroke(); } /* les bouts des bûches, cernes du bois */
}

/** Pour un foyer du Relto : son état et sa couleur (`r` : le dessinateur ; `r.opts.fireState()` : l'état gardé). */
function fireFor(r, hearth, now = Date.now()) {
  const fs = r && r.opts && typeof r.opts.fireState === "function" ? r.opts.fireState() || {} : {};
  const page = !!(r && r.scene && (r.scene.additions || []).some((a) => a.type === "firecolour"));
  return { st: hearthOf((fs.until || {})[hearth], now), col: shownColor(fs, page), page, full: isFull((fs.until || {})[hearth], now) };
}

module.exports = { glowColor, fireFor, idsOfAnalysis, rememberAge, HOUR, LOG, MAX_LOGS, EMBERS, HEARTHS, COLORS, colorById, colorOfAge, hearthOf, addLog, isFull, shownColor, nextPick, drawFire, drawLogs, fireGlow, drawWoodpile };
