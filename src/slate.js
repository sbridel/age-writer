"use strict";
/*
 * L'ardoise (claude/DESIGN-art-bahro.md §5, §6, §16), modèle pur. Cette première partie : la reconnaissance au trait.
 * On trace à la souris, au trackpad ou au doigt, en un ou plusieurs traits ; l'ardoise compare l'ensemble aux dix-huit éléments de la planche
 * des fresques (src/relto-fresco.js, SIGNS : les gabarits sont tirés du même code qui peint les parois, rien de neuf à dessiner).
 * Méthode : nuage de points (l'ordre et le sens des traits ne comptent pas), recentré, mis à l'échelle, rééchantillonné, apparié au plus proche
 * (famille « $P », Vatavu, Anthony, Wobbrock 2012). Le meilleur ne compte que s'il est sous le seuil et nettement devant le second ;
 * sinon le trait reste tel quel (« ils ne comprendront peut-être pas »).
 */
const TAU = Math.PI * 2;
/** Les dix-huit éléments d'Âge de la planche (DESIGN-reve §13.6). */
const ELEMENTS = ["water", "fire", "tree", "mountain", "sun", "moon", "rain", "beast", "bird", "fish", "stone", "grass", "cloud", "wind", "snow", "lava", "cave", "island"];
const N = 40; /* points par nuage */

/* ---- les gabarits : on rejoue les signes de la planche avec un pinceau qui note les traits au lieu de peindre ---- */
function densify(pts, step = 0.8) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; if (!i) { out.push([p[0], p[1]]); continue; }
    const q = pts[i - 1], d = Math.hypot(p[0] - q[0], p[1] - q[1]), n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) out.push([q[0] + ((p[0] - q[0]) * k) / n, q[1] + ((p[1] - q[1]) * k) / n]);
  }
  return out;
}
function recorder() {
  const strokes = [];
  const arc = (x, y, rx, ry, a0, a1) => { const n = Math.max(6, Math.round((Math.abs(a1 - a0) * Math.max(rx, ry)) / 0.8)), p = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } return p; };
  return {
    strokes,
    line(pts) { strokes.push(densify(pts)); },
    shape(pts) { strokes.push(densify(pts.concat([pts[0]]))); },
    fill() { /* les détails clairs ne se tracent pas à la craie */ },
    ring(x, y, rx, ry = rx, w, a0 = 0, a1 = TAU) { strokes.push(arc(x, y, rx, ry, a0, a1)); },
    disc(x, y, r) { if (r >= 2.5) strokes.push(arc(x, y, r, r, 0, TAU)); },
  };
}
const NOCTX = { set fillStyle(v) { void v; }, get fillStyle() { return ""; }, set strokeStyle(v) { void v; }, get strokeStyle() { return ""; }, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, globalAlpha: 1 };
let TEMPLATES = null;
/** Les traits d'un élément de la planche, dans son carré de -10 à 10. */
function strokesOf(id) {
  const fn = require("./relto-fresco").SIGNS[id]; if (!fn) return [];
  const rec = recorder(); fn(rec, NOCTX); return rec.strokes;
}
/*
 * Ce qu'un humain dessine vraiment, pour les quatre signes qui agissent (§6) : la planche met quatre gouttes et huit rayons, la main en met
 * trois ou cinq, quatre ou six. Comptées comme le même signe ; dans le même carré de -10 à 10 que la planche.
 */
const arcP = (x, y, rx, ry, a0, a1) => { const n = 24, p = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } return p; };
const drops = (k) => Array.from({ length: k }, (_, i) => { const x = -6 + (12 * i) / Math.max(1, k - 1); return densify([[x, 1], [x - 2, 9]]); });
const rays = (k, r0 = 7, r1 = 10) => Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return densify([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]]); });
const VARIANTS = {
  rain: [[arcP(0, -3, 8, 4, Math.PI, TAU), ...drops(3)], [arcP(0, -3, 8, 4, Math.PI, TAU), ...drops(5)], [arcP(0, -3, 8, 4, Math.PI, TAU), ...drops(2)]],
  sun: [[arcP(0, 0, 4.5, 4.5, 0, TAU), ...rays(4)], [arcP(0, 0, 4.5, 4.5, 0, TAU), ...rays(6)], [arcP(0, 0, 5, 5, 0, TAU), ...rays(8, 5, 10)]],
  moon: [[arcP(0, 0, 8, 8, Math.PI * 0.35, Math.PI * 1.65).concat(arcP(3.5, 0, 6.5, 6.5, Math.PI * 1.45, Math.PI * 0.55))]],
  fire: [[densify([[0, -10], [4, -3], [6, 3], [3, 8], [-3, 8], [-6, 3], [-3, -3], [0, -10]])]],
};
function templates() {
  if (!TEMPLATES) {
    TEMPLATES = [...ELEMENTS, "serpent"].map((id) => ({ id, cloud: cloudOf(strokesOf(id)) })); /* le serpent se reconnaît aussi : il est refusé avec effroi */
    for (const [id, list] of Object.entries(VARIANTS)) for (const st of list) TEMPLATES.push({ id, cloud: cloudOf(st), variant: true });
  }
  return TEMPLATES;
}

/* ---- le nuage de points ---- */
/** Rééchantillonne l'ensemble des traits à N points répartis selon la longueur ; chaque trait garde sa part. */
function resample(strokes, n = N) {
  const segs = strokes.filter((s) => s.length).map((s) => (s.length === 1 ? [s[0], [s[0][0] + 0.01, s[0][1]]] : s));
  let total = 0; for (const s of segs) for (let i = 1; i < s.length; i++) total += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  if (!(total > 0)) return [];
  const I = total / (n - 1), out = []; let D = 0;
  for (const s0 of segs) {
    const s = s0.map((p) => [p[0], p[1]]); out.push([s[0][0], s[0][1]]);
    for (let i = 1; i < s.length; i++) {
      const d = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
      if (D + d >= I && d > 0) { const t = (I - D) / d, q = [s[i - 1][0] + t * (s[i][0] - s[i - 1][0]), s[i - 1][1] + t * (s[i][1] - s[i - 1][1])]; out.push(q); s.splice(i, 0, q); D = 0; }
      else D += d;
    }
    D = 0;
  }
  while (out.length > n) out.splice(Math.floor(out.length / 2), 1);
  while (out.length < n) out.push(out[out.length - 1].slice());
  return out;
}
/** Recentré sur son centre de gravité, mis à l'échelle par son plus grand côté (la forme garde ses proportions : l'eau reste large). */
function normalize(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, cx = 0, cy = 0;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const s = Math.max(x1 - x0, y1 - y0) || 1;
  const p = pts.map(([x, y]) => [(x - x0) / s, (y - y0) / s]);
  for (const [x, y] of p) { cx += x; cy += y; }
  cx /= p.length; cy /= p.length;
  return p.map(([x, y]) => [x - cx, y - cy]);
}
const cloudOf = (strokes) => { const r = resample(strokes); return r.length ? normalize(r) : []; };
function cloudDistance(a, b, start) {
  const n = a.length, used = new Array(n).fill(false); let sum = 0, i = start;
  do {
    let best = -1, min = Infinity;
    for (let j = 0; j < n; j++) if (!used[j]) { const d = (a[i][0] - b[j][0]) ** 2 + (a[i][1] - b[j][1]) ** 2; if (d < min) { min = d; best = j; } }
    used[best] = true; sum += (1 - ((i - start + n) % n) / n) * Math.sqrt(min); i = (i + 1) % n;
  } while (i !== start);
  return sum;
}
function matchCloud(a, b) {
  const n = a.length, step = Math.max(1, Math.floor(Math.sqrt(n))); let min = Infinity;
  for (let i = 0; i < n; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  return min;
}

/* ---- reconnaître ---- */
const TILTS = [0, -0.2, 0.2, -0.38, 0.38];
const rotate = (c, a) => { const cs = Math.cos(a), sn = Math.sin(a); return c.map(([x, y]) => [cs * x - sn * y, sn * x + cs * y]); };
/** Le seuil (au-delà, rien ne ressemble) et la marge (le meilleur doit être nettement devant le second). Réglés sur test/slate.test.js. */
const ACCEPT = 1.9, MARGIN = 0.88;
/**
 * Reconnaît un signe : `strokes` = [[ [x, y], … ], …] (coordonnées libres). Renvoie { id, d, second } ou { id: null, … } si rien ne ressemble assez.
 */
function recognize(strokes) {
  const pts = (strokes || []).filter((s) => s && s.length);
  if (!pts.length) return { id: null, d: Infinity, second: null };
  const c = cloudOf(pts); if (c.length < N) return { id: null, d: Infinity, second: null };
  const tilted = TILTS.map((a) => (a ? rotate(c, a) : c)); /* à la souris on trace rarement droit : un peu d'inclinaison est permise */
  const best = new Map();
  for (const t of templates()) { const d = Math.min(...tilted.map((cc, i) => matchCloud(cc, t.cloud) * (1 + (0.04 * Math.abs(TILTS[i])) / 0.2))); if (!best.has(t.id) || d < best.get(t.id)) best.set(t.id, d); } /* un signe et ses variantes : la meilleure compte */
  const scored = [...best].map(([id, d]) => ({ id, d })).sort((x, y) => x.d - y.d);
  const [b, s] = scored, ok = b.d <= ACCEPT && b.d <= MARGIN * s.d;
  return { id: ok ? b.id : null, d: b.d, second: s.id, d2: s.d, ranked: scored.slice(0, 4) };
}
/** Sépare les traits en groupes par leur position (un second signe se trace à côté du premier) : intervalles horizontaux qui ne se recouvrent pas. */
function groups(strokes, gapRatio = 0.08) {
  const items = (strokes || []).filter((s) => s && s.length).map((s) => { let x0 = Infinity, x1 = -Infinity; for (const [x] of s) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } return { s, x0, x1 }; }).sort((a, b) => a.x0 - b.x0);
  if (!items.length) return [];
  const span = items[items.length - 1].x1 - items[0].x0 || 1, gap = span * gapRatio, out = [];
  for (const it of items) { const g = out[out.length - 1]; if (g && it.x0 <= g.x1 + gap) { g.strokes.push(it.s); g.x1 = Math.max(g.x1, it.x1); } else out.push({ strokes: [it.s], x0: it.x0, x1: it.x1 }); }
  return out.map((g) => g.strokes);
}
/**
 * Lit l'ardoise : un ou deux signes (au-delà, ils ne comprennent pas). Renvoie { signs: [id|null, …], groups: n }.
 * Un groupe non reconnu donne null à sa place : l'ardoise garde le trait tel quel.
 */
function read(strokes) {
  const gs = groups(strokes);
  if (gs.length > 2) return { signs: [null], groups: gs.length };
  return { signs: gs.map((g) => recognize(g).id), groups: gs.length };
}


/* =========================================================================================================================
 * Le cycle (§5, §5 bis, §16) : l'ardoise arrive au matin après le 17 ; on y trace un ou deux signes ; au prochain Livre de ce Relto qu'on
 * ouvre, elle quitte le bureau et l'acte a lieu dans cet Âge pour la journée ; le lendemain elle est revenue, effacée.
 * État dans la réserve du Relto : X.slate = { strokes, signs, at, sent: { seed, name, signs, effect, day, outcome } | null }.
 * ========================================================================================================================= */
const DAY = 86400000;
const dayOf = (now) => Math.floor(now / DAY); /* le même jour que la récolte (src/harvest.js) */
/** Les intentions qu'ils reconnaissent : un signe seul, ou une paire (l'ordre ne compte pas). */
const SINGLE = { rain: "rain", fire: "heat", sun: "time", moon: "night" };
const PAIRS = { "fire+rain": "steam", "moon+rain": "mist", "fire+sun": "summer", "moon+sun": "longnight" };
/** Ce que l'Âge doit avoir pour que l'intention découle de lui (loi 11 ; dans l'accord seulement) : de l'eau, du feu, quelque chose qui vit. */
const NEEDS = { rain: ["water"], heat: ["fire"], steam: ["water", "fire"], mist: ["water"], summer: ["living"], time: [], night: [], longnight: [] };
const EFFECTS = Object.keys(NEEDS);

/** L'intention que disent les signes : une des huit, "serpent" (refusé avec effroi), "mute" (ils n'ont pas compris), ou null (rien de tracé). */
function effectOf(signs) {
  const list = (signs || []).filter((x) => x !== undefined);
  if (!list.length) return null;
  if (list.includes("serpent")) return "serpent";
  if (list.some((x) => !x)) return "mute";
  const u = [...new Set(list)].sort();
  if (u.length === 1) return SINGLE[u[0]] || "mute";
  return PAIRS[u.join("+")] || "mute";
}
/** L'ardoise est-elle arrivée ? Au matin après la fin du 17, dans les deux fins. `st` : l'état de l'histoire du Relto. */
function arrived(st, now) {
  const s = st && st.stone; if (!s || !s.ending || !(s.endedAt > 0)) return false;
  return now >= require("./story-hear").morningAfter(s.endedAt);
}
/** L'état de l'ardoise (créé à la demande) ; un acte d'un autre jour est passé : elle est revenue, effacée. */
function stateOf(X, now) {
  const sl = X.slate && typeof X.slate === "object" ? X.slate : (X.slate = { strokes: [], signs: [], at: 0, sent: null });
  if (!Array.isArray(sl.strokes)) sl.strokes = [];
  if (!Array.isArray(sl.signs)) sl.signs = [];
  if (sl.sent && sl.sent.day < dayOf(now)) { sl.strokes = []; sl.signs = []; sl.at = 0; sl.sent = null; }
  return sl;
}
/** Est-elle sur le bureau ? (absente le jour d'un acte) */
const onDesk = (X, now) => !stateOf(X, now).sent;
/** Trace : les traits de la journée (on peut en ajouter tant qu'elle est là) ; l'ardoise relit l'ensemble. Renvoie { signs, effect }. */
function trace(X, strokes, now) {
  const sl = stateOf(X, now); if (sl.sent) return null;
  sl.strokes = (strokes || []).map((st) => st.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
  sl.signs = read(sl.strokes).signs; sl.at = now;
  return { signs: sl.signs.slice(), effect: effectOf(sl.signs) };
}
/** La main à plat : tout s'efface (jamais l'écrit, seulement les intentions). */
function erase(X, now) { const sl = stateOf(X, now); if (sl.sent) return false; sl.strokes = []; sl.signs = []; sl.at = 0; return true; }
/** Ce qui manque à l'Âge pour cette intention (vide si elle découle de lui). `has` : { water, fire, living }. */
const missing = (effect, has) => (NEEDS[effect] || []).filter((k) => !(has && has[k]));
/**
 * Un Livre de ce Relto s'ouvre : l'ardoise part-elle, et que devient l'intention ? `age` : { seed, name, warded, has: { water, fire, living } }.
 * `ending` : "accord" ou "command". Renvoie l'issue : "none" (rien de tracé, ou déjà partie), "wait" (un Livre gardé : elle attend le suivant),
 * "stay" (le serpent : personne ne vient la prendre), "mute" (ils n'ont pas compris), "refused" (l'accord : elle ne découle pas de l'Âge), "done".
 */
function send(X, age, ending, now) {
  const sl = stateOf(X, now); if (sl.sent) return "none";
  const effect = effectOf(sl.signs); if (!effect) return "none";
  if (effect === "serpent") return "stay";
  if (age.warded) return "wait";
  let outcome = "done";
  if (effect === "mute") outcome = "mute";
  else if (ending === "accord" && missing(effect, age.has).length) outcome = "refused";
  sl.sent = { seed: String(age.seed), name: age.name || "", signs: sl.signs.slice(), effect, day: dayOf(now), outcome };
  return outcome;
}
/** Le serpent tracé : au matin, le trait est effacé (personne n'est venu). */
function morningWipe(X, now) { const sl = stateOf(X, now); if (effectOf(sl.signs) === "serpent" && sl.at && dayOf(sl.at) < dayOf(now)) { sl.strokes = []; sl.signs = []; sl.at = 0; return true; } return false; }
/** L'acte du jour dans cet Âge : { effect, fertile } ou null. Dans le commandement, l'acte n'engendre rien (fertile faux). */
function actOf(X, seed, ending, now) {
  const sl = X && X.slate; if (!sl || !sl.sent || sl.sent.day !== dayOf(now) || sl.sent.outcome !== "done" || sl.sent.seed !== String(seed)) return null;
  return { effect: sl.sent.effect, fertile: ending === "accord", gift: false };
}
/**
 * Les dons de l'accord : de loin en loin (un jour sur trente environ, pour chaque Âge), un Âge reçoit sans qu'on ait rien demandé ;
 * seulement ce qui découle de lui (la pluie s'il a de l'eau, sinon l'été d'un jour s'il vit). Renvoie l'intention, ou null.
 */
function giftFor(key, seed, has, now) {
  const { fnv } = require("./util");
  if (fnv("slate-gift|" + key + "|" + seed + "|" + dayOf(now)) % 30 !== 0) return null;
  return ["rain", "summer"].find((e) => !missing(e, has).length) || null;
}
/**
 * La récolte du jour changée par l'intention (§6 ; l'accord seulement : dans le commandement, rien ne change). `gives` : la liste du jour.
 * La sorte change, jamais la qualité, sauf la brume (le terreau d'une mesure pauvre compte riche ce jour-là). Renvoie { list, richFor }.
 */
function harvestOf(gives, effect) {
  let list = (gives || []).slice(); const richFor = {};
  const swap = (a, b) => { list = list.map((x) => (x === a ? b : x)); };
  const twice = (id) => { if (list.includes(id)) list.push(id); };
  if (effect === "rain") swap("ash", "silt"); /* l'eau sur les cendres : du limon */
  else if (effect === "heat") swap("peat", "ash"); /* la tourbe sèche : des cendres */
  else if (effect === "steam") { swap("ash", "silt"); twice("silt"); } /* l'eau et le feu ensemble */
  else if (effect === "mist") { if (list.includes("humus")) richFor.humus = true; }
  else if (effect === "summer") twice("peat"); /* le vivant travaille */
  else if (effect === "longnight") twice("humus"); /* la décomposition travaille */
  return { list, richFor };
}

module.exports = { ELEMENTS, N, ACCEPT, MARGIN, strokesOf, templates, resample, normalize, cloudOf, matchCloud, recognize, groups, read,
  DAY, dayOf, SINGLE, PAIRS, NEEDS, EFFECTS, effectOf, arrived, stateOf, onDesk, trace, erase, missing, send, morningWipe, actOf, giftFor, harvestOf };
