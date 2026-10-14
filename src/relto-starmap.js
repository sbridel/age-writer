"use strict";
// La carte des étoiles (télescope, étape 3) : un parchemin déroulé sur la table de l'observatoire. Au centre le Great Zero
// (une rose à huit pointes), le Relto (la petite île), chaque système situé (une étoile à l'encre, ses Âges en légende au survol),
// ses perturbateurs (signes de cinabre), des traits fins qui relient les étoiles voisines (la constellation), et pour chaque
// étoile un court trait de plomb vers l'endroit où son Âge voit vraiment le Zéro : sur la bonne ligne, il vise la rose ; sur
// la ligne de Me'erta, il la manque. Encre brune sur papier clair : lisible en thème clair comme sombre (le papier reste papier).
// Modèle : src/starmap.js. On y vient par le rouleau au mur de l'observatoire ; ︾ y ramène.
const { rng, clamp, rgba } = require("./util");
const T = require("./telescope");
const MAP = require("./starmap");
const TL = require("./relto-telescope");
const BEAM = require("./beam");
const { makeT } = require("./i18n");

const W = 640, H = 360, SHEET = { x: 70, y: 18, w: 500, h: 300 }, BACK = { x: 0, y: 314, w: W, h: 46 };
const EN = makeT(() => "en");
const tOf = (r) => (r.opts && typeof r.opts.t === "function" ? r.opts.t : EN);
const pertName = (t, kind) => (kind === "black_hole" ? t("map.pert.bh") : kind === "pulsar" ? t("map.pert.pulsar") : t("map.pert.ns"));
const INK = "#3b2a1b", INK2 = "#6b4a2a", RED = "#9b3b22", LEAD = "#5f6b78", SIG = "#2f8a82", SIG2 = "#62b8ae", NORTH = "#4b5f9a"; // SIG : le bleu du signal du télescope (#7fd6c8), foncé pour l'encre ; NORTH : la ligne de l'instrument

/** Une étoile à l'encre : quatre branches et un point (`big` : le système qui a plusieurs Âges). */
function inkStar(ctx, x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? s * 0.32 : s; ctx.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); }
  ctx.closePath(); ctx.fill();
}
/** Le signe d'un perturbateur, en cinabre. */
function pertSign(ctx, kind, x, y) {
  ctx.strokeStyle = RED; ctx.fillStyle = RED; ctx.lineWidth = 1.1;
  if (kind === "black_hole") { ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 7.5, -0.6, 1.2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 7.5, 2.5, 4.3); ctx.stroke(); ctx.fillStyle = "#1a0f0a"; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill(); }
  else if (kind === "pulsar") { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 8, y + 5); ctx.lineTo(x + 8, y - 5); ctx.stroke(); for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(x, y, 4.5, k > 0 ? -0.9 : 2.2, k > 0 ? -0.3 : 2.8); ctx.stroke(); } }
  else { ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 6.2, 0, 6.283); ctx.stroke(); }
}

/** La clé des mots qui disent la hauteur d'un point (au-dessus du plan = positif). */
function elevBand(z) { const a = Math.abs(Number(z) || 0); return a <= 5 ? "map.elev.on" : a <= 40 ? (z > 0 ? "map.elev.above" : "map.elev.below") : (z > 0 ? "map.elev.high" : "map.elev.deep"); }

/** La vue de la carte. */
function drawStarMap(r, ctx, sc, sky, tm) {
  // seuls les Âges choisis pour l'étagère s'affichent (noms et étoiles) ; la gravure, elle, reste : recocher un Âge le fait revenir sur la carte
  const st = TL.state(r), known = new Set(((sc && sc.ages) || []).map((a) => a && a.name).filter(Boolean));
  const systems = {}; for (const [k, rec] of Object.entries(st.found ? st.systems || {} : {})) { // un Âge qui n'est plus sur l'étagère : ni son nom, ni (s'il était seul) son étoile
    if (!(rec && Array.isArray(rec.ages) && rec.ages.length && known.size)) { systems[k] = rec; continue; }
    const ages = rec.ages.filter((n) => known.has(n)); if (ages.length) systems[k] = { ...rec, ages };
  }
  // l'étoile d'aujourd'hui de chaque Âge (son système, lu une fois dans son livre, en arrière-plan) : un Âge récrit peut avoir changé d'étoile
  const ages0 = (sc && sc.ages) || [];
  if (r.opts.onImagerAge && (!r.mapCur || r.mapCur.scene !== sc)) {
    const mc = (r.mapCur = { scene: sc, map: new Map(), ready: false });
    Promise.all(ages0.map((a) => Promise.resolve(r.opts.onImagerAge(a)).then((d) => { const k = d && d.system && d.system.key; if (k) mc.map.set(a.name, k); }, () => {})))
      .then(() => { mc.ready = true; if (r.mapCur === mc && r.view === "starmap" && !r.running) r.draw(0); });
  }
  const cur = r.mapCur && r.mapCur.ready ? r.mapCur.map : null, where = new Map();
  for (const [k, rec] of Object.entries(systems)) for (const n of (rec && rec.ages) || []) { if (!where.has(n)) where.set(n, []); where.get(n).push(k); }
  const moved = cur ? [...where.entries()].filter(([n, ks]) => cur.has(n) && ks.some((k) => k !== cur.get(n))).map(([n]) => n).sort((a, b) => a.localeCompare(b)) : [];
  const pages = 1 + moved.length; r.mapPage = Math.max(0, Math.min(pages - 1, r.mapPage || 0));
  // la première carte : chaque Âge à sa place d'aujourd'hui ; les suivantes, une par Âge qui a bougé : ses étoiles d'autrefois, puis l'actuelle
  const focus = r.mapPage ? moved[r.mapPage - 1] : null, view = {};
  if (focus) { for (const k of where.get(focus) || []) view[k] = { ...systems[k], ages: [focus] }; }
  else for (const [k, rec] of Object.entries(systems)) {
    if (!cur || !rec || !Array.isArray(rec.ages) || !rec.ages.length) { view[k] = rec; continue; }
    const a = rec.ages.filter((n) => !cur.has(n) || cur.get(n) === k); if (a.length) view[k] = { ...rec, ages: a };
  }
  const t = tOf(r), map = MAP.layout(st.zero, view, st.line), S = SHEET;
  // la table et le parchemin (taché, bords sombres), éclairé par une lampe
  const tg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 420); tg.addColorStop(0, "#4a3a2a"); tg.addColorStop(1, "#1c140e"); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(S.x + 6, S.y + 8, S.w, S.h);
  const pg = ctx.createRadialGradient(S.x + S.w * 0.45, S.y + S.h * 0.4, 30, S.x + S.w / 2, S.y + S.h / 2, S.w * 0.7); pg.addColorStop(0, "#f4ead2"); pg.addColorStop(0.75, "#e6d5ae"); pg.addColorStop(1, "#c9b083"); ctx.fillStyle = pg; ctx.fillRect(S.x, S.y, S.w, S.h);
  const q = rng(((sc.seed || 0) ^ 0x3a9) >>> 0); for (let i = 0; i < 14; i++) { const x = S.x + q() * S.w, y = S.y + q() * S.h, rr = 8 + q() * 30, g = ctx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, rgba(150, 110, 60, 0.07 + 0.06 * q())); g.addColorStop(1, "rgba(150,110,60,0)"); ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2); } // taches
  ctx.fillStyle = "#8a6a3a"; ctx.fillRect(S.x - 4, S.y - 3, S.w + 8, 6); ctx.fillRect(S.x - 4, S.y + S.h - 3, S.w + 8, 6); // les deux rouleaux
  ctx.strokeStyle = rgba(59, 42, 27, 0.5); ctx.lineWidth = 0.8; ctx.strokeRect(S.x + 10.5, S.y + 12.5, S.w - 21, S.h - 25);
  const box = { x: S.x + 14, y: S.y + 34, w: S.w - 28, h: S.h - 66 }, P0 = MAP.fit3(map, box, { turn: r.mapTurn || 0 }), bcx = box.x + box.w / 2, bcy = box.y + box.h / 2;
  // la loupe (`r.mapZoom` : facteur `k`, point visé `fx, fy` sur la carte entière) : tout s'agrandit autour du point visé
  const Z = r.mapZoom && r.mapZoom.k > 1 ? r.mapZoom : null; r.mapBox = { box, bcx, bcy, P0 };
  const P = Z ? { ...P0, R: P0.R * Z.k, hz: P0.hz * Z.k, ring: (d) => P0.ring(d) * Z.k, at: (x, y, z) => { const [px, py] = P0.at(x, y, z); return [bcx + (px - Z.fx) * Z.k, bcy + (py - Z.fy) * Z.k]; } } : P0;
  const [zx, zy] = P.at(0, 0, 0), TI = P.tilt; r.mapBox.zero = [zx, zy];
  // tout le parchemin : un clic y pose la loupe (agrandit autour de ce point) ; les étoiles et les boutons, posés ensuite, l'emportent
  r.hot.push({ x: box.x, y: box.y, w: box.w, h: box.h, tip: (Z ? t("map.drag") + " — " : "") + (Z && Z.k >= ZOOM_MAX ? t("map.loupe.max") : t("map.loupe")), mapAct: { zoomAt: true } });
  ctx.save(); ctx.beginPath(); if (Z) ctx.rect(S.x + 11, S.y + 46, S.w - 22, S.h - 76); else ctx.rect(S.x + 11, S.y + 13, S.w - 22, S.h - 26); ctx.clip(); // à la loupe : rien ne monte sur le titre ni ne descend sur la légende
  // cercles de distance (1 000, 2 500, 5 000, 10 000 shahfeetee : l'échelle va en racine carrée) et la ligne d'origine : le nord de la carte est la ligne où l'instrument est calé
  ctx.strokeStyle = rgba(107, 74, 42, 0.22); ctx.lineWidth = 0.7; ctx.setLineDash && ctx.setLineDash([2, 4]);
  for (const d of [1000, 2500, 5000, 10000, 15000]) { if (d > map.scale * 1.1) break; ctx.beginPath(); ctx.ellipse(zx, zy, P.ring(d), P.ring(d) * TI, 0, 0, 6.283); ctx.stroke(); }
  ctx.setLineDash && ctx.setLineDash([]);
  // la ligne de l'instrument tourne avec la carte (la rose de laiton dit où elle est) ; sa légende reste droite, au bout
  const [nx, ny] = P.rot(0, 1), nex = zx + nx * P.R, ney = zy - ny * P.R * TI, nl = Math.hypot(nex - zx, ney - zy) || 1, ux = (nex - zx) / nl, uy = (ney - zy) / nl;
  ctx.strokeStyle = NORTH; ctx.globalAlpha = 0.75; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(zx, zy); ctx.lineTo(nex + ux * 6, ney + uy * 6); ctx.stroke(); ctx.globalAlpha = 1;
  const nlx = nex + ux * 14, nly = ney + uy * 12 + 3;
  ctx.font = "italic 9px serif"; const northW = ctx.measureText(t("map.north")).width, RB = ROSE_BOX(S);
  if (!(nlx + northW / 2 > RB.x && nlx - northW / 2 < RB.x + RB.w && nly > RB.y && nly - 10 < RB.y + RB.h)) { ctx.fillStyle = NORTH; ctx.textAlign = "center"; ctx.fillText(t("map.north"), nlx, nly); ctx.textAlign = "left"; } // pas sous la rose
  // les étiquettes ne se chevauchent pas : chacune cherche, autour de son point, une place libre
  // les étiquettes ne se chevauchent pas : chacune cherche, autour de son point, une place libre ; d'abord tout près, puis plus loin
  // (reliée alors à son étoile par un trait fin). Elles s'écrivent à la fin, par-dessus les traits, avec un liseré de papier.
  const OFFS = [[9, -4], [9, 10], [-9, -4], [-9, 10], [0, -12], [0, 18], [12, -16], [-12, 20]];
  const taken = [], place = (x, y, w, h) => {
    for (const k of [1, 1.9, 2.8]) for (const [ox, oy] of OFFS) {
      const dx = ox > 0 ? ox * k : ox < 0 ? ox * k - w : -w / 2, dy = oy * k, b = { x: x + dx, y: y + dy - h, w, h };
      if (b.x < S.x + 14 || b.x + w > S.x + S.w - 14 || b.y < S.y + 34 || b.y + h > S.y + S.h - 30) continue;
      if (!taken.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y)) { taken.push(b); return [b.x, b.y + h - 2, k > 1, b]; }
    }
    return null;
  }, labels = [];
  // la constellation : chaque étoile reliée à sa plus proche voisine
  ctx.strokeStyle = rgba(59, 42, 27, 0.35); ctx.lineWidth = 0.8;
  for (const s of map.stars) { let best = null, bd = Infinity; for (const o of map.stars) { if (o === s) continue; const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < bd) { bd = d; best = o; } } if (best && s.key < best.key || (best && map.stars.length === 2)) { const [ax, ay] = P.at(s.x, s.y, s.z), [bx, by] = P.at(best.x, best.y, best.z); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); } }
  // le Great Zero : une rose des vents à huit pointes
  ctx.save(); ctx.translate(zx, zy); ctx.scale(1, Math.min(1, TI * 1.6)); ctx.rotate(P.turn || 0); // couchée avec le plan, tournée avec la carte
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, L = i % 2 ? 7 : 12; ctx.fillStyle = i % 2 ? SIG2 : SIG; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a - 0.25) * 3, -Math.cos(a - 0.25) * 3); ctx.lineTo(Math.sin(a) * L, -Math.cos(a) * L); ctx.lineTo(Math.sin(a + 0.25) * 3, -Math.cos(a + 0.25) * 3); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#f4ead2"; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, 6.283); ctx.fill(); ctx.restore();
  r.hot.push({ x: zx - 12, y: zy - 12, w: 24, h: 24, tip: t("map.zero") });
  // le Relto : une petite île
  // les fils à plomb : du pied (sur le plan) au point ; plein au-dessus du plan, pointillé dessous ; le plomb pend au bas du fil
  const plumb = (x, y, z, col = INK2) => {
    const [fx, fy] = P.at(x, y, 0), [tx, ty] = P.at(x, y, z), up = z > 0;
    ctx.strokeStyle = rgba(59, 42, 27, 0.5); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(fx, fy, 3.5, 3.5 * TI, 0, 0, 6.283); ctx.stroke();
    if (Math.abs(fy - ty) < 2) return;
    ctx.strokeStyle = up ? rgba(59, 42, 27, 0.7) : rgba(59, 42, 27, 0.5); ctx.lineWidth = 0.8; if (!up && ctx.setLineDash) ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]);
    const bx = fx, by = up ? fy : ty + 7; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx + 2, by - 0.5); ctx.arc(bx, by, 2, 0, Math.PI); ctx.lineTo(bx - 2, by - 0.5); ctx.closePath(); ctx.fill();
  };
  plumb(map.relto.x, map.relto.y, map.relto.z);
  for (const s of map.stars) plumb(s.x, s.y, s.z);
  const [rx, ry] = P.at(map.relto.x, map.relto.y, map.relto.z);
  ctx.fillStyle = "#7a8a5a"; ctx.beginPath(); ctx.ellipse(rx, ry, 6, 3.6, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(rx - 1.5, ry - 6, 3, 3.4); // la cabane
  taken.push({ x: zx - 12, y: zy - 12, w: 24, h: 24 }, { x: rx - 7, y: ry - 7, w: 14, h: 12 }, { x: nlx - northW / 2 - 2, y: nly - 10, w: northW + 4, h: 12 }, ROSE_BOX(S)); // la légende de la ligne de l'instrument aussi
  for (const s of map.stars) { const [sx, sy] = P.at(s.x, s.y, s.z); taken.push({ x: sx - 6, y: sy - 6, w: 12, h: 12 }); }
  labels.push({ x: rx, y: ry, text: t("map.relto"), font: "italic 10px serif" });
  r.hot.push({ x: rx - 10, y: ry - 10, w: 20, h: 20, tip: `${sc.name || "Relto"} — ${t("map.relto.tip")}` });
  if (focus) { // le chemin de l'Âge : de sa plus ancienne étoile à l'actuelle (dans l'ordre où son nom y a été gravé), en pointillés, une pointe à l'arrivée
    const when = (k) => { const rec = systems[k] || {}; return (rec.when && rec.when[focus]) || rec.at || 0; };
    const keys = (where.get(focus) || []).slice().sort((a, b) => (cur.get(focus) === a ? 1 : cur.get(focus) === b ? -1 : when(a) - when(b)));
    const pts = keys.map((k) => map.stars.find((x) => x.key === k)).filter(Boolean).map((x) => P.at(x.x, x.y, x.z));
    ctx.strokeStyle = rgba(47, 138, 130, 0.75); ctx.lineWidth = 1; ctx.setLineDash && ctx.setLineDash([4, 3]);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], a = Math.atan2(by - ay, bx - ax), e = 9;
      ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * e, ay + Math.sin(a) * e); ctx.lineTo(bx - Math.cos(a) * e, by - Math.sin(a) * e); ctx.stroke();
      ctx.setLineDash && ctx.setLineDash([]); const hx = bx - Math.cos(a) * e, hy = by - Math.sin(a) * e; ctx.fillStyle = rgba(47, 138, 130, 0.85); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(a - 0.45) * 6, hy - Math.sin(a - 0.45) * 6); ctx.lineTo(hx - Math.cos(a + 0.45) * 6, hy - Math.sin(a + 0.45) * 6); ctx.closePath(); ctx.fill(); ctx.setLineDash && ctx.setLineDash([4, 3]);
    }
    ctx.setLineDash && ctx.setLineDash([]);
  }
  // les étoiles situées, leurs perturbateurs, leur trait de plomb vers le Zéro
  for (const s of map.stars) {
    const [sx, sy] = P.at(s.x, s.y, s.z);
    for (const p of s.pert) { plumb(p.x, p.y, p.z, RED); const [px, py] = P.at(p.x, p.y, p.z); ctx.strokeStyle = rgba(155, 59, 34, 0.35); ctx.lineWidth = 0.6; ctx.setLineDash && ctx.setLineDash([1.5, 2.5]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]); pertSign(ctx, p.kind, px, py); r.hot.push({ x: px - 8, y: py - 8, w: 16, h: 16, tip: pertName(t, p.kind) }); }
    const len = 22, bad = s.miss > 2 * T.TOL.torahn, [rx2, ry2] = P.rot(s.ray.x, s.ray.y); // le trait : où l'Âge voit vraiment le Zéro (il tourne avec la carte)
    ctx.strokeStyle = bad ? RED : LEAD; ctx.lineWidth = bad ? 1.1 : 0.8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + rx2 * len, sy - ry2 * len * TI); ctx.stroke();
    if (bad) { ctx.fillStyle = RED; ctx.font = "bold 10px serif"; ctx.fillText("?", sx + rx2 * len + 2, sy - ry2 * len * TI + 3); }
    const former = !!(focus && cur && cur.get(focus) !== s.key); // une étoile d'autrefois de l'Âge suivi : pâle, cerclée de pointillés
    inkStar(ctx, sx, sy, s.ages.length > 1 ? 6.5 : 5, s.offLine || former ? "rgba(59,42,27,0.45)" : INK);
    if (former) { ctx.strokeStyle = rgba(59, 42, 27, 0.4); ctx.lineWidth = 0.7; ctx.setLineDash && ctx.setLineDash([1.5, 2]); ctx.beginPath(); ctx.arc(sx, sy, 8, 0, 6.283); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]); }
    if (s.offLine) { ctx.strokeStyle = RED; ctx.lineWidth = 0.8; ctx.setLineDash && ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 6.283); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]); }
    if (s.tri) { ctx.strokeStyle = LEAD; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(sx - 8, sy + 7); ctx.lineTo(sx, sy - 7); ctx.lineTo(sx + 8, sy + 7); ctx.closePath(); ctx.stroke(); } // triangulée
    const label = former ? t("map.former") : s.ages.length ? s.ages[0] + (s.ages.length > 1 ? " +" + (s.ages.length - 1) : "") : "";
    // les noms : au survol seulement (ou tenu, au doigt) ; le bouton « Aa » les montre tous. Sans place libre, le nom reste au survol
    const shown = r.mapNames || (r.hover && r.hover.starKey === s.key) || focus;
    if (label && shown) labels.push({ x: sx, y: sy, text: label, font: "italic 9.5px serif", hot: !r.mapNames && !focus });
    const tip = (s.ages.length ? s.ages.join(", ") : t("map.star.unnamed")) + (s.pert.length ? " — " + s.pert.map((p) => pertName(t, p.kind)).join(", ") : "") + (bad ? " — " + t("map.star.miss") : "") + " — " + t(elevBand(s.z));
    const rf = BEAM.rahnfeeOf(s.distance), far = rf >= 1 ? t("beam.far.beyond") : t("beam.far.line", { far: String(t("beam.far")).split("|")[BEAM.fracBand(rf)] }); // mondes lointains : au-delà d'un rahnfee // la distance le long du faisceau : en mots, puis en rahnfee (chiffres D'ni)
    r.hot.push({ x: sx - 9, y: sy - 9, w: 18, h: 18, tip: tip + " — " + far, frac: BEAM.digitsOf(s.distance), starKey: s.key });
  }
  // les noms, en dernier : liseré de papier pour rester lisibles par-dessus les traits ; un nom écarté est relié à son point
  ctx.lineJoin = "round";
  for (const L of labels) {
    ctx.font = L.font; const w = Math.min(120, ctx.measureText(L.text).width), at = place(L.x, L.y, w, 10); if (!at) continue;
    const [lx, ly, far, b] = at;
    if (far) { const tx = Math.max(b.x, Math.min(b.x + b.w, L.x)), ty = Math.max(b.y, Math.min(b.y + b.h, L.y)); ctx.strokeStyle = rgba(107, 74, 42, 0.45); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(tx, ty); ctx.stroke(); }
    ctx.strokeStyle = "rgba(240,230,205,0.9)"; ctx.lineWidth = 3; ctx.strokeText(L.text, lx, ly, 120);
    ctx.fillStyle = INK2; ctx.fillText(L.text, lx, ly, 120);
  }
  mapControls(r, ctx, map, P0, S);
  // l'échelle des hauteurs, gravée dans un coin : les fils ne sont pas à l'échelle des distances
  { const lx = S.x + 26, ly = S.y + S.h - 40, h = 50 * P.hz; ctx.strokeStyle = INK2; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - h); ctx.moveTo(lx - 3, ly); ctx.lineTo(lx + 3, ly); ctx.moveTo(lx - 3, ly - h); ctx.lineTo(lx + 3, ly - h); ctx.stroke();
    ctx.font = "italic 8.5px serif"; ctx.fillStyle = INK2; ctx.fillText(t("map.hscale"), lx + 6, ly - h / 2 + 3, 150); r.hot.push({ x: lx - 6, y: ly - h - 4, w: 150, h: h + 8, tip: t("map.hscale.tip") }); }
  ctx.restore();
  // le titre, la légende et, si besoin, l'avertissement de l'arpenteur
  ctx.font = "italic 13px serif"; ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.fillText(focus ? t("map.moved.title", { name: focus }) : t("map.title"), S.x + S.w / 2, S.y + 29, S.w - 80); ctx.textAlign = "left";
  if (pages > 1) { // feuilleter les cartes : la carte d'aujourd'hui, puis celle de chaque Âge qui a bougé
    ctx.font = "18px serif"; ctx.fillStyle = INK2;
    if (r.mapPage > 0) { ctx.fillText("‹", S.x + 20, S.y + 31); r.hot.push({ x: S.x + 12, y: S.y + 14, w: 22, h: 24, tip: r.mapPage === 1 ? t("map.page.now") : t("map.moved.title", { name: moved[r.mapPage - 2] }), mapPage: -1 }); }
    if (r.mapPage < pages - 1) { ctx.fillText("›", S.x + S.w - 28, S.y + 31); r.hot.push({ x: S.x + S.w - 34, y: S.y + 14, w: 22, h: 24, tip: t("map.moved.title", { name: moved[r.mapPage] }), mapPage: 1 }); }
    ctx.font = "italic 9px serif"; ctx.textAlign = "center"; ctx.fillText(`${r.mapPage + 1} / ${pages}`, S.x + S.w / 2, S.y + 42); ctx.textAlign = "left";
  }
  const bad = map.stars.filter((s) => s.miss > 2 * T.TOL.torahn).length, msg = !st.found ? t("map.nozero") : !map.stars.length ? t("map.empty") : bad ? (map.mixed ? t("map.warn.mixed") : t("map.warn.old")) : focus ? (cur.has(focus) && !map.stars.some((x) => x.key === cur.get(focus)) ? t("map.moved.uncharted") : t("map.moved.ok")) : t("map.ok");
  ctx.font = "italic 11px serif"; ctx.fillStyle = bad ? RED : INK2; ctx.textAlign = "center"; ctx.fillText(msg, S.x + S.w / 2, S.y + S.h - 20, S.w - 40); ctx.textAlign = "left";
  // redescendre à l'observatoire
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
  ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.fillText("︾", W / 2, BACK.y + 29); ctx.textAlign = "left";
  r.hot.push({ ...BACK, tip: t(r.mapFrom === "desk" ? "map.back.desk" : "map.back"), go: r.mapFrom === "desk" ? "desk" : "telescope" }); // on revient là d'où l'on vient
  void tm; void sky; void clamp;
}

/**
 * Les petits boutons gravés au bord droit du parchemin : « Aa » (les noms : au survol, ou tous), les quatre régions du ciel
 * (N, E, S, O : la loupe se pose sur ce quart) et ◎ (tout le ciel). Mêmes encres que la carte.
 */
const ZOOM_MAX = 4, REGIONS = [["N", 0], ["E", 1], ["S", 2], ["W", 3]];
function mapControls(r, ctx, map, P0, S) {
  const t = tOf(r), x = S.x + S.w - 30, z = r.mapZoom && r.mapZoom.k > 1 ? r.mapZoom : null;
  const btn = (y, label, on, tip, act) => {
    ctx.fillStyle = on ? rgba(59, 42, 27, 0.16) : rgba(240, 230, 205, 0.6); ctx.fillRect(x - 9, y - 9, 18, 18); ctx.strokeStyle = rgba(59, 42, 27, on ? 0.8 : 0.45); ctx.lineWidth = 0.8; ctx.strokeRect(x - 8.5, y - 8.5, 17, 17);
    ctx.font = on ? "bold italic 9.5px serif" : "italic 9.5px serif"; ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.fillText(label, x, y + 3.3); ctx.textAlign = "left";
    r.hot.push({ x: x - 10, y: y - 10, w: 20, h: 20, tip, mapAct: act });
  };
  btn(S.y + 56, "Aa", !!r.mapNames, r.mapNames ? t("map.names.all") : t("map.names.hover"), { names: true });
  const letters = String(t("map.regions")).split("|");
  REGIONS.forEach(([k, i], n) => btn(S.y + 82 + n * 22, letters[i] || k, !!(z && z.region === i), t("map.region.tip", { r: String(t("map.region.names")).split("|")[i] || k }), { region: i }));
  btn(S.y + 82 + 4 * 22 + 4, "◎", !z && !r.mapTurn, t("map.all"), { all: true });
  brassRose(r, ctx, S, t);
  void map; void P0;
}

/**
 * La rose de laiton, dans le coin bas droit du parchemin : elle montre où est le nord de la carte et la fait tourner. On la tourne
 * comme une molette (glisser autour de son centre : un cran par seizième de tour) ; un clic : un cran dans le sens des aiguilles
 * (Maj : dans l'autre sens). Le repère fixe, en haut, est le nord de la table.
 */
const ROSE_R = 13, ROSE_BOX = (S) => ({ x: S.x + S.w - 36 - ROSE_R - 3, y: S.y + S.h - 60 - ROSE_R - 3, w: 2 * ROSE_R + 6, h: 2 * ROSE_R + 6 }), TURN_STEP = Math.PI / 8;
function brassRose(r, ctx, S, t) {
  const cx = S.x + S.w - 36, cy = S.y + S.h - 60, R = ROSE_R, a = r.mapTurn || 0;
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.arc(cx + 1.5, cy + 2, R + 1, 0, 6.283); ctx.fill(); // l'ombre sur le papier
  const g = ctx.createRadialGradient(cx - 4, cy - 5, 2, cx, cy, R + 1); g.addColorStop(0, "#f0d790"); g.addColorStop(0.6, "#c39a48"); g.addColorStop(1, "#7d5a22");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill(); ctx.strokeStyle = "#5a3f17"; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
  ctx.strokeStyle = "rgba(70,46,15,0.75)"; ctx.lineWidth = 0.7; // seize crans gravés au bord
  for (let i = 0; i < 16; i++) { const b = (i * Math.PI) / 8, L = i % 4 ? 2 : 3.5; ctx.beginPath(); ctx.moveTo(Math.sin(b) * (R - 1), -Math.cos(b) * (R - 1)); ctx.lineTo(Math.sin(b) * (R - 1 - L), -Math.cos(b) * (R - 1 - L)); ctx.stroke(); }
  for (let i = 0; i < 4; i++) { const b = (i * Math.PI) / 2, L = i ? 7.5 : 9.5; ctx.fillStyle = i ? "#5a3f17" : RED; ctx.beginPath(); ctx.moveTo(Math.sin(b - 0.5) * 2.2, -Math.cos(b - 0.5) * 2.2); ctx.lineTo(Math.sin(b) * L, -Math.cos(b) * L); ctx.lineTo(Math.sin(b + 0.5) * 2.2, -Math.cos(b + 0.5) * 2.2); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#3b2a1b"; ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, 6.283); ctx.fill();
  ctx.restore();
  // le repère fixe (le nord de la table) : un petit triangle d'encre au-dessus de la rose
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(cx - 3, cy - R - 5); ctx.lineTo(cx + 3, cy - R - 5); ctx.lineTo(cx, cy - R - 1); ctx.closePath(); ctx.fill();
  const step = { kind: "map", x: cx, y: cy, fine: (d) => ({ turn: d }), coarse: (d) => ({ turn: d }), deg: 22.5, degRim: 22.5, hub: 0 };
  r.hot.push({ ...ROSE_BOX(S), tip: t("map.rose"), mapAct: { turn: 1 }, wc: step });
}

/** Tourner la carte à l'angle `to` (radians) ; la loupe, si elle est posée, suit le point qu'elle regardait. */
function turnTo(r, to) {
  const TAU = Math.PI * 2, from = r.mapTurn || 0; let a = ((to % TAU) + TAU) % TAU; if (Math.abs(a - TAU) < 1e-9 || Math.abs(a) < 1e-9) a = 0;
  const mb = r.mapBox, z = r.mapZoom && r.mapZoom.k > 1 ? r.mapZoom : null;
  if (z && mb) { const [fx, fy] = MAP.turnPoint(z.fx, z.fy, mb.P0.cx, mb.P0.cy, mb.P0.tilt, a - from); r.mapZoom = { ...z, fx, fy }; }
  r.mapTurn = a || 0;
}
/** Tirer le parchemin sous la loupe de `dx, dy` (unités du canevas) : le point visé glisse en sens inverse, sans quitter la carte. */
function pan(r, dx, dy) {
  const mb = r.mapBox, z = r.mapZoom && r.mapZoom.k > 1 ? r.mapZoom : null; if (!mb || !z) return false;
  const b = mb.box, fx = clamp(z.fx - dx / z.k, b.x, b.x + b.w), fy = clamp(z.fy - dy / z.k, b.y, b.y + b.h);
  r.mapZoom = { ...z, fx, fy }; return true;
}
/** L'angle (radians, sens horaire) d'un point du canevas autour du Zéro, mesuré sur le plan redressé. */
function angleAt(r, x, y) { const mb = r.mapBox, [zx, zy] = (mb && mb.zero) || [0, 0], TI = (mb && mb.P0.tilt) || 1; return Math.atan2(x - zx, (zy - y) / TI); }

/** Un geste sur la carte : la loupe (au point touché), une région du ciel, tout le ciel, les noms. `x, y` : le point touché (canevas). */
function act(r, a, x, y, e) {
  const mb = r.mapBox; if (!mb) return;
  if (a.names) { r.mapNames = !r.mapNames; return; }
  if (a.all) { r.mapZoom = null; r.mapTurn = 0; return; }
  if (a.turn) { const d = e && e.shiftKey ? -a.turn : a.turn; turnTo(r, (Math.round((r.mapTurn || 0) / TURN_STEP) + d) * TURN_STEP); return; } // la rose : un cran, calé sur les seize crans
  if (a.region != null) { // le quart du ciel : la loupe sur le centre de ses étoiles (ou, s'il est vide, sur le milieu de ce quart)
    const map = MAP.layout(TL.state(r).zero, TL.state(r).systems || {}, TL.state(r).line), dir = (q) => { const a2 = Math.atan2(q.x, q.y); return ((Math.round(a2 / (Math.PI / 2)) % 4) + 4) % 4; };
    const pts = map.stars.filter((q) => dir(q) === a.region).map((q) => mb.P0.at(q.x, q.y, q.z));
    const [fx, fy] = pts.length ? [pts.reduce((u, p) => u + p[0], 0) / pts.length, pts.reduce((u, p) => u + p[1], 0) / pts.length] : mb.P0.at(Math.sin((a.region * Math.PI) / 2) * map.scale * 0.3, Math.cos((a.region * Math.PI) / 2) * map.scale * 0.3, 0);
    r.mapZoom = r.mapZoom && r.mapZoom.region === a.region ? null : { k: 2.2, fx, fy, region: a.region }; return;
  }
  if (a.zoomAt) { // la loupe, posée là où l'on touche : ×2 à chaque fois, jusqu'à ×4 ; au-delà, un clic rend toute la carte
    const z = r.mapZoom && r.mapZoom.k > 1 ? r.mapZoom : null, ux = z ? z.fx + (x - mb.bcx) / z.k : x, uy = z ? z.fy + (y - mb.bcy) / z.k : y;
    r.mapZoom = z && z.k >= ZOOM_MAX ? null : { k: Math.min(ZOOM_MAX, (z ? z.k : 1) * 2), fx: ux, fy: uy };
  }
}

module.exports = { drawStarMap, SHEET, act, turnTo, pan, angleAt, TURN_STEP };
