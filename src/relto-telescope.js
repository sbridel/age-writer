"use strict";
// Le télescope du Relto (page « telescope ») : un instrument de laiton au sommet du mont. Étape 1 : trouver le Great Zero.
//   Sur l'île : la lunette sur son trépied, au sommet du mont (sans la page Montagnes, la page apporte son rocher) ; un clic y mène.
//   Sa vue : à gauche l'OCULAIRE (le ciel vu dans la lunette, son petit anneau de visée), à droite deux MOLETTES, Torahn et
//   Élévation (la couronne avance de 25 crans, le moyeu d'un cran : 100 torantee ou 1 shahfee), leurs valeurs en chiffres
//   D'ni, et la PLAQUE où s'inscrit le Zéro une fois trouvé. Sous l'oculaire, une ligne de mots dit ce qu'on voit.
// Comme au KI, l'élévation s'affiche négative au-dessus du plan du Zéro (T.kiElev) ; une infobulle le rappelle.
// Le signal reste dans la fiction : de loin, une lueur diffuse qui bat au rythme du prorahn (l'heure D'ni), irrégulière ;
// de près, elle se resserre en un point dans le champ, qu'on amène dans l'anneau ; au bord, elle se fixe. Pas de distance chiffrée.
// La visée et le Zéro trouvé sont gardés par Relto (`opts.telescopeGet / telescopeSet`, clé T.keyOf(nom, graine)).
// Étape 2 : un LUTRIN au pied de l'instrument reçoit le livre d'un Âge (‹ › pour choisir). Le Zéro trouvé, les molettes
// visent alors où le Zéro apparaît VU DE CET ÂGE (les indices de l'arpenteur), et une troisième molette, le RETARD du pouls,
// accorde l'écho de l'Âge sur le battement du Relto. Dans la tolérance, le système d'étoile de l'Âge est situé : la plaque
// grave sa position GZCS (l'instrument fait lui-même la différence Relto → Zéro moins Âge → Zéro). Modèle : src/starsystem.js.
// Étape 3 : la FAUSSE LIGNE de Me'erta (un second pouls, plus pâle, qui glisse contre l'horloge D'ni : si on l'amène dans
// l'anneau avant le vrai Zéro, l'instrument se cale dessus, `line` ≠ 0, et tout ce qu'il situe ensuite tourne d'autant ; viser
// le vrai Zéro le recale) ; les PERTURBATEURS (lumière courbée par un trou noir : une image brillante qui ne tient jamais, le
// vrai point pâle au bout d'un arc ; faux pouls d'un pulsar ou d'une étoile à neutrons : l'écho s'accorde sur lui) ; le levier
// de TRIANGULATION (deux étoiles situées voisines l'annulent) ; la CARTE DES ÉTOILES (vue `starmap`, `drawStarMap`).
// Réglage des instruments (src/instruments.js, `opts.instrumentsMode`) : en mode facile, « il s'avive / il pâlit » après chaque
// geste, scintillation faible, pas de fausse ligne, les étoiles mortes brouillent seulement l'image ; l'Art de la Guilde = la 1.19.
// Le MÉTRONOME (src/metronome.js), au mur de gauche, bat le prorahn : le vrai pouls culmine à chaque extrémité du balancier.
// Tout est dessiné ici, en coordonnées logiques 640 × 360. Le modèle (pur) est dans src/telescope.js.
const { rng, fnv, clamp, mix, rgba, frac, lerp } = require("./util");
const T = require("./telescope");
const SS = require("./starsystem");
const PS = require("./relto-passages");
const DT = require("./dnitime");
const { makeT } = require("./i18n");
const INS = require("./instruments");
const MET = require("./metronome");
const GI = require("./imager-guild");
const BEAM = require("./beam");
const VR = require("./relto-glass");
const CS = require("./relto-castle");

const W = 640, H = 360, GY = 208;
const EYE = { x: 196, y: 150, r: 116 }, FIELD = 30; // l'oculaire montre ±30 crans fins autour de la visée
const NT = T.TURN / T.NOTCH; // crans fins par tour (625)
// le panneau de l'instrument, de haut en bas : la plaque (Great Zero ou étoile de l'Âge), les deux grandes molettes, puis la rangée du retard
const WHEELS = { torahn: { x: 438, y: 146 }, elev: { x: 560, y: 146 } }, RING0 = 31, HUB0 = 14;
const PLATE = { x: 392, y: 42, w: 214, h: 56 }, BACK = { x: 0, y: 314, w: W, h: 46 };
const SPLATE = { x: 392, y: 40, w: 214, h: 58 }, DELAY = { x: 458, y: 254 }, DRING = 22, DHUB = 9; // étape 2 : la plaque du système et la molette du retard
const LECTERN = { x: 54, y: 302 }, TEXT_X = 372; // le lutrin, sur le sol à gauche ; la ligne de mots se décale à droite quand il est là
const PULSE_MS = DT.MS_PER_HAHR / DT.PRO_PER_HAHR; // un prorahn (≈ 1,39 s) : le pouls du Zéro bat l'heure D'ni
const EN = makeT(() => "en");
const tOf = (r) => (r.opts && typeof r.opts.t === "function" ? r.opts.t : EN);
/** Art de la Guilde, près d'une étoile morte non triangulée : deux pouls s'emmêlent dans l'écho ; il faut tenir la molette
 *  immobile sur le vrai retard ce nombre de battements, le temps qu'ils se séparent. Un passage en balayant ne situe plus rien. */
const HOLD_BEATS = 3;
/** La tourelle de verres (Art de la Guilde) : verre nu, verre d'écho (grossi), plaque de phase, les deux. Défaut : la plaque. */
const LENSES = ["bare", "echo", "plate", "both"], ZOOM = 3.4;
const lensOf = (st) => (LENSES.includes(st.lens) ? st.lens : "plate");
const TURRET = { x: 284, y: 238, r: 10 };
/** La prédiction hors du champ : sa lumière ne déborde sur le bord du verre qu'à moins de deux rayons d'oculaire (60 crans, ~35°). */
const GHOST_REACH = 2;
const now = (r) => (r.nowOverride != null ? r.nowOverride : Date.now());
/** Le numéro du prorahn en cours : la scintillation du signal change à chaque battement. */
const beatOf = (r) => Math.floor((now(r) - DT.REF) / PULSE_MS);
const fnvKey = (k) => fnv(String(k)) >>> 0;
/**
 * Le mode des instruments (src/instruments.js), lu à chaque dessin : `opts.instrumentsMode` (fonction ou chaîne). Facile par
 * défaut : mots « il s'avive / il pâlit », scintillation faible, pas de fausse ligne, étoiles mortes qui brouillent seulement.
 */
const guildOf = (r) => { const m = r.opts && r.opts.instrumentsMode; return INS.isGuild(typeof m === "function" ? m() : m); };
/** Ce que l'œil perçoit (T.observe), avec la scintillation du mode : pleine dans l'Art de la Guilde, bien plus faible en mode facile. */
const look = (r, sig, beat, salt) => T.observe(sig, beat, salt, guildOf(r) ? 1 : T.SCINT.easy);
/** Les signaux du lutrin vide (étape 1) : en mode facile, la ligne de Me'erta reste invisible. */
const linesOf = (r, st) => SS.lineSignals(st.aim, st.zero, st.old, { easy: !guildOf(r) });
/** Ce que l'oculaire montre d'un système (étapes 2 et 3) : en mode facile, ni leurre ni faux pouls. */
const scopeOf = (r, st, sys) => SS.scope(st.dial, sys, { tri: false, easy: !guildOf(r) }); // les balises ne filtrent rien : elles marquent une prédiction
/** Mode facile : après un geste, la lueur s'avive ou pâlit (le vrai signal, sans scintillation). */
const trendOf = (before, after) => (after > before + 1e-9 ? 1 : after < before - 1e-9 ? -1 : 0);
const trendWords = (t, k) => (k > 0 ? t("tel.warmer") : k < 0 ? t("tel.colder") : "");
const withTrend = (t, line, k) => (k ? line + " " + trendWords(t, k) : line);
/** L'écho de l'Âge face au battement du Relto (étape 2) : ensemble, presque, en retard, en avance. */
const echoWords = (t, dd) => ({ one: t("sys.echo.one"), near: t("sys.echo.near"), late: t("sys.echo.late"), early: t("sys.echo.early") })[SS.echoWord(dd)];
/** Le retard de la molette (crans) en mots : le pouls arrive une fraction de battement après le balancier (src/beam.js). */
const lateWords = (t, notches) => t("beam.late.line", { late: String(t("beam.late")).split("|")[BEAM.fracBand(BEAM.lateOf(notches, SS.DELAY_UNIT))] });
/** Les paliers de mots du signal (T.signal().band), du vide au bord de l'anneau. */
const bandWords = (t, b, guild = false) => [t("tel.band.void"), t("tel.band.faint"), t("tel.band.far"), t("tel.band.near"), t("tel.band.close"), t("tel.band.edge")][guild ? coarseBand(b) : b] || "";
/** Art de la Guilde : trois paliers seulement (rien, quelque chose, tout près) ; les mots orientent de loin, ils ne guident plus cran par cran. */
const coarseBand = (b) => (b <= 0 ? 0 : b <= 3 ? 1 : 4);
const axisName = (t, axis) => (axis === "torahn" ? t("tel.torahn") : axis === "delay" ? t("sys.delay.name") : t("tel.elev"));

// ---- état et gestes ---------------------------------------------------------------------------------
/** L'état du télescope pour la scène courante : relu (visée, trouvé) quand le Relto change de nom ou de graine. */
function state(r) {
  const sc = r.scene || {}, key = T.keyOf(sc.name, sc.seed), gen = r.opts.telescopeGen ? r.opts.telescopeGen() : 0; // gen : change quand le Zéro est oublié (commande)
  if (!r.telescope || r.telescope.key !== key || r.telescope.gen !== gen) {
    const g = r.opts.telescopeGet ? r.opts.telescopeGet(key) : null, zero = T.greatZero(sc.name, sc.seed), q = rng((sc.seed ^ 0x7e1e5c0) >>> 0), stars = [];
    for (let i = 0; i < 1400; i++) stars.push({ u: q() * NT, v: (q() * 2 - 1) * (T.ELEV_MAX + FIELD), m: q(), tw: q() * 6.283 }); // u en crans fins, v en shahfeetee
    r.telescope = { key, gen, zero, aim: T.normAim(g), found: !!(g && g.found), at: g && g.at ? T.normAim(g.at) : null, stars, anim: null,
      dial: SS.normDial(g && g.dial), systems: g && g.systems && typeof g.systems === "object" ? { ...g.systems } : {}, book: null,
      line: g && g.found && Number.isFinite(+g.line) ? Math.round(+g.line) : 0, old: SS.oldLine(zero, key), triFor: null, note: null, trend: 0, // étape 3 : la ligne où l'instrument est calé (0 : la vraie)
      aimed: g && g.aimedAt ? g.aimedAt : null, lens: g && LENSES.includes(g.lens) ? g.lens : null };
    const at = guild(r) && g && g.aimedAt && typeof g.book === "string" ? ((sc.ages || []).findIndex((a) => a.path === g.book)) : -1;
    if (at >= 0) bookLoad(r, at); // l'étoile tenue (mode Guilde) : son livre reste sur le lutrin
  }
  r.telescope.guild = guild(r); // mode facile : rien de plus n'est gardé
  return r.telescope;
}
/** Le Zéro tel que l'instrument le tient : le vrai, ou la fausse ligne s'il s'est calé dessus (Torahn et élévation). */
function heldZero(st) { return st.line && st.old && st.line === st.old.L ? { torahn: st.old.torahn, elevation: st.old.elevation, distance: st.old.distance } : { torahn: SS.believedZero(st.zero, st.line).torahn, elevation: st.zero.elevation, distance: st.zero.distance }; }
/** Les noms des Âges d'un système situé : gravés au lutrin (`ages`). */
function noteAge(r, st, key, name) {
  const rec = st.systems[key]; if (!rec || !name || (rec.ages || []).includes(name)) return;
  st.systems = { ...st.systems, [key]: { ...rec, ages: [...(rec.ages || []), name].sort(), when: { ...(rec.when || {}), [name]: Date.now() } } }; // `when` : quand ce nom y a été gravé (l'historique de la carte)
  if (r.opts.telescopeSet) r.opts.telescopeSet(st.key, saveOf(st));
}

/** Les systèmes situés du Relto courant (pour l'Imageur) : l'état ouvert s'il existe, sinon l'état gardé. */
function systemsOf(r) {
  const sc = r.scene || {}, key = T.keyOf(sc.name, sc.seed);
  if (r.telescope && r.telescope.key === key) return { found: r.telescope.found, systems: r.telescope.systems };
  const g = r.opts && r.opts.telescopeGet ? r.opts.telescopeGet(key) : null;
  return { found: !!(g && g.found), systems: (g && g.systems) || {} };
}

/**
 * L'étoile que le télescope tient, pour l'Imageur en mode Guilde (src/imager-guild.js) : un livre sur le lutrin, son étoile
 * déjà située, les trois molettes sur ses indices (dans la tolérance). Sinon null. Gardée dans l'état (`aimedAt`).
 */
function aimedKey(st) {
  const sys = st.found ? bookSystem(st) : null, rec = sys && st.systems[sys.key];
  return rec && (rec.line || 0) === st.line && SS.measure(st.dial, sys.clue).located ? sys.key : null;
}
const guild = (r) => !!(r.opts && typeof r.opts.instrumentsMode === "function" && r.opts.instrumentsMode() === "guild");
/** Garder l'état si l'étoile tenue a changé (on pose ou retire un livre). */
function keepAim(r, st) { if (st.guild && (st.aimed || null) !== aimedKey(st) && r.opts.telescopeSet) r.opts.telescopeSet(st.key, saveOf(st)); }

/** Le livre posé sur le lutrin : `idx` −1 = lutrin vide (on cherche le Zéro du Relto), sinon un Âge de l'étagère. */
function bookLoad(r, i) {
  const st = state(r), ages = (r.scene && r.scene.ages) || [], n = ages.length + 1;
  const idx = ((((i + 1) % n) + n) % n) - 1;
  if (idx < 0) { st.book = null; return; }
  const age = ages[idx], book = (st.book = { idx, age, data: null, loading: true });
  if (!r.opts.onImagerAge) { book.loading = false; return; }
  Promise.resolve(r.opts.onImagerAge(age)).then((d) => {
    if (st.book !== book) return; book.loading = false; book.data = d || null;
    const sys = d && d.system; if (sys && st.found) noteAge(r, st, sys.key, age.name); // un Âge d'un système déjà situé : son nom s'ajoute à la carte
    keepAim(r, st); // l'Imageur (mode Guilde) : la lumière suit le livre
    if (!r.running) r.draw(0);
  }, () => { book.loading = false; });
}
/** Le système de l'Âge sur le lutrin (ou null), et si l'on mesure (le Zéro du Relto est trouvé). */
function bookSystem(st) { const sys = st.book && st.book.data && st.book.data.system; return sys && sys.clue ? sys : null; }
function measuring(st) { return !!(st.found && bookSystem(st)); }

/** Un geste : `{ axis, delta }` (molette ; delta en torantee ou shahfeetee), `{ setZero: true }` (régler les molettes sur la plaque). */
function act(r, a) {
  const st = state(r), sfx = (k, s) => { if (r.opts.onTelescopeSound) r.opts.onTelescopeSound(k, s); };
  if (a.book) { bookLoad(r, (st.book ? st.book.idx : -1) + a.book); st.note = null; st.trend = 0; sfx("turn", 0.5); keepAim(r, st); return; }
  if (a.go) { r.setView(a.go); return; }
  if (a.eyeZoom) { r.eyeZoom = !r.eyeZoom; r.held = null; r.hover = null; return; } // mode tactile : l'oculaire agrandi (rien n'y reste tenu)
  if (a.lens) { if (!guildOf(r)) return; st.lens = LENSES[(LENSES.indexOf(lensOf(st)) + 1) % LENSES.length]; sfx("turn", 0.5); if (r.opts.telescopeSet) r.opts.telescopeSet(st.key, saveOf(st)); return; }
  if (a.axis || a.setZero || a.setSystem) { st.note = null; st.trend = 0; } // la phrase d'un geste précédent s'efface au geste suivant
  if (measuring(st)) return actSystem(r, st, a, sfx);
  const from = st.aim, before = linesOf(r, st).best;
  const axis = a.axis ? T.axisOf(a.axis) : null;
  if (a.setZero) { if (!st.found) return; const z = heldZero(st); st.aim = T.normAim({ torahn: z.torahn, elev: z.elevation }); sfx("turn", 1); }
  else if (axis) { st.aim = T.turn(st.aim, axis, a.delta); sfx(Math.abs(a.delta) >= T.STEP[axis].rim ? "turn" : "tick", before.s); }
  else return;
  const L = linesOf(r, st), after = L.best;
  if (!r.opts.reducedMotion) st.anim = { from, t0: r.telescopeT || 0 };
  if (axis) r.wheelSpin = { ...(r.wheelSpin || {}), [axis]: r.telescopeT || 0 };
  if (axis && !guildOf(r)) st.trend = trendOf(before.s, after.s); // mode facile : il s'avive, il pâlit
  sfx("ping", look(r, after, beatOf(r), fnvKey(st.key)).s); // le pouls entendu scintille, comme celui qu'on voit
  // étape 3 : la première fois, l'anneau se ferme sur la vraie ligne ou sur celle de Me'erta, et l'instrument se cale dessus ;
  // ensuite seule la vraie ligne le recale (une fois le vrai Zéro tenu, la ligne ancienne ne le reprend plus)
  const landed = L.true.found ? 0 : !st.found && L.old.found ? st.old.L : null;
  if (landed != null && (!st.found || st.line !== landed)) {
    const was = st.found; st.found = true; st.line = landed; st.at = { torahn: st.aim.torahn, elev: st.aim.elev };
    st.note = was ? "tel.recal.true" : null; sfx("found", 1);
  }
  if (r.opts.telescopeSet) r.opts.telescopeSet(st.key, saveOf(st));
}
/** L'état à garder : celui de l'étape 2 (T.saved), plus la ligne où l'instrument est calé si ce n'est pas la vraie. */
function saveOf(st) { const s = T.saved(st); if (st.found && st.line) s.line = st.line; if (st.guild && st.lens && st.lens !== "plate") s.lens = st.lens; const k = st.guild ? aimedKey(st) : null; st.aimed = k; if (k) { s.aimedAt = k; s.book = st.book.age.path; } return s; } // `aimedAt` : l'étoile tenue (l'Imageur, mode Guilde), et le livre qui la tient

/** Étape 2 : un geste quand un livre est sur le lutrin et le Zéro trouvé (les molettes portent le réglage `dial`). */
function actSystem(r, st, a, sfx) {
  const sys = bookSystem(st), clue = sys.clue, sc0 = scopeOf(r, st, sys), before = sc0.shown, from = st.dial, rec = st.systems[sys.key];
  const axis = a.axis === "delay" || a.axis === "beats" ? a.axis : a.axis ? T.axisOf(a.axis) : null;
  if (a.setSystem) { if (!rec) return; st.dial = SS.normDial({ torahn: clue.torahn, elev: clue.elevation, delay: clue.delay, beats: rec.beats != null ? rec.beats : clue.beats }); sfx("turn", 1); }
  else if (a.unchart) { if (!rec) return; const o = { ...st.systems }; delete o[sys.key]; st.systems = o; st.note = "sys.unchart.done"; sfx("turn", 0.4); if (r.opts.telescopeSet) r.opts.telescopeSet(st.key, saveOf(st)); return; }
  else if (a.triangulate) { // les balises : deux étoiles situées voisines, gravées sur la même ligne que l'instrument (Art de la Guilde)
    if (!guildOf(r)) return;
    const b = SS.beacons(sys, st.systems, st.line);
    st.note = !sys.perturbed ? "sys.tri.clear" : !b.ok ? "sys.tri.few" : !b.agree ? "sys.tri.disagree" : "sys.tri.agree";
    if (sys.perturbed && b.ok && b.agree) { st.triFor = sys.key; sfx("turn", 1); } else sfx("tick", 0.2);
    return;
  }
  else if (a.setZero) return;
  else if (axis === "beats") { st.dial = SS.turnDial(st.dial, "beats", 1); sfx("turn", 0.6); } // le compteur de battements : un déclic
  else if (axis) { st.dial = SS.turnDial(st.dial, axis, a.delta); const S = axis === "delay" ? SS.STEP_DELAY : T.STEP[axis]; sfx(Math.abs(a.delta) >= S.rim ? "turn" : "tick", before.s); }
  else return;
  const sc = scopeOf(r, st, sys), after = sc.m;
  if (!r.opts.reducedMotion) st.anim = { from, t0: r.telescopeT || 0 };
  if (axis) r.wheelSpin = { ...(r.wheelSpin || {}), [axis]: r.telescopeT || 0 };
  if (axis && axis !== "delay" && axis !== "beats" && !guildOf(r)) st.trend = trendOf(sc0.m.s, sc.m.s); // mode facile : il s'avive, il pâlit (le retard a son écho)
  sfx("ping", look(r, sc.shown, beatOf(r), fnvKey(st.key + sys.key)).s);
  // situé (l'anneau ne ment pas, perturbé ou non) : gravé sur la ligne où l'instrument est calé ; une étoile gravée sur une autre ligne est regravée
  const beatErr = st.dial.beats - (clue.beats || 0); // mauvais battement : regravée si le compte change
  st.hold = null;
  // le piège qui mord : la pose sur le FAUX pouls (la direction juste, le retard sur le faux) grave une étoile à une fausse distance
  const bite = needHold(r, sc) && sc.falseLock && after.found && !after.located ? st.dial.delay - clue.delay : 0;
  if ((after.located || bite) && (!rec || (rec.line || 0) !== st.line || (rec.beatErr || 0) !== beatErr || (rec.bite || 0) !== bite)) {
    if (needHold(r, sc)) st.hold = { key: sys.key, t0: now(r), bite }; // deux pouls emmêlés : rien ne se grave avant la pose
    else chart(r, st, sys, sfx);
  }
  if (r.opts.telescopeSet) r.opts.telescopeSet(st.key, saveOf(st));
}
const needHold = (r, sc) => guildOf(r) && !!sc.beat; // la pose : la plaque a toujours besoin d'exposition près d'un faux pouls (les balises ne l'en dispensent pas)
/** Grave l'étoile située sur la ligne où l'instrument est calé (une étoile gravée sur une autre ligne, ou au mauvais battement, est regravée). */
function chart(r, st, sys, sfx, bite = 0) {
  const rec = st.systems[sys.key], tri = st.triFor === sys.key, name = st.book && st.book.age ? st.book.age.name : null;
  st.systems = { ...st.systems, [sys.key]: SS.record(sys, st.zero, st.dial, now(r), { line: st.line, ages: [...((rec && rec.ages) || []), name].filter(Boolean), tri: tri && sys.perturbed, bite }) };
  st.note = rec ? "sys.recharted" : null; st.hold = null; sfx("found", 1);
  if (r.opts.telescopeSet) r.opts.telescopeSet(st.key, saveOf(st));
}

// ---- petits dessins -----------------------------------------------------------------------------------
function plate(ctx, c, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, c("#a8843c")); g.addColorStop(0.5, c("#6b5126")); g.addColorStop(1, c("#8a6a2e"));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = c("#3b2a1b"); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = c("#3b2a1b"); for (const [px, py] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.283); ctx.fill(); }
}
/**
 * Une valeur gravée en chiffres D'ni (base 25), centrée en `cx` ; négative : un trait devant, comme au KI. `v` peut aussi
 * être `{ frac: [entier, f1, …] }` : une longueur en rahnfee (src/beam.js), gravée « 0 · a b c » (Dni.drawFraction).
 */
function engraved(r, ctx, v, cx, y, size, col) {
  if (v && v.frac) { const w = engravedWidth(r, v, size), x = cx - w / 2; if (r.dni && r.dni.drawFraction) r.dni.drawFraction(ctx, v.frac, x, y, size, col); else { ctx.fillStyle = col; ctx.font = `${size}px serif`; ctx.fillText(fracText(v.frac), x, y + size); } return; }
  const n = Math.round(Math.abs(v)), neg = Math.round(v) < 0, dash = neg ? size * 0.55 : 0;
  const w = (r.dni && r.dni.widthOf ? r.dni.widthOf(n, size) : String(n).length * size * 0.6) + dash, x = cx - w / 2;
  if (neg) { ctx.fillStyle = col; ctx.fillRect(x, y + size * 0.47, size * 0.4, Math.max(1.2, size * 0.09)); }
  if (r.dni && r.dni.drawNumber) r.dni.drawNumber(ctx, n, x + dash, y, size, col);
  else { ctx.fillStyle = col; ctx.font = `${size}px serif`; ctx.fillText(String(n), x + dash, y + size); }
}
/** Sans police ni tracé D'ni (tests) : la même lecture en chiffres ordinaires, chaque place séparée. */
const fracText = (d) => d[0] + "." + d.slice(1).join(":");
/** Largeur gravée d'une valeur (chiffres D'ni, signe compris). */
function engravedWidth(r, v, size) {
  if (v && v.frac) return r.dni && r.dni.fractionWidth ? r.dni.fractionWidth(v.frac, size) : fracText(v.frac).length * size * 0.6;
  const n = Math.round(Math.abs(v)), dash = Math.round(v) < 0 ? size * 0.55 : 0;
  return (r.dni && r.dni.widthOf ? r.dni.widthOf(n, size) : String(n).length * size * 0.6) + dash;
}
/**
 * Une rangée de valeurs gravées sur une plaque : centrée dans [x0, x0 + w], espacée, et réduite si elle ne tient pas
 * (selon la police installée, les chiffres D'ni sont plus ou moins larges) : rien ne déborde du bord.
 */
function engravedRow(r, ctx, values, x0, w, y, size, col) {
  const gap = size * 0.9, total = (s) => values.reduce((a, v) => a + engravedWidth(r, v, s), 0) + gap * (s / size) * (values.length - 1);
  let s = size; const room = w - 12; if (total(s) > room) s = Math.max(6, size * (room / total(size)));
  let x = x0 + (w - total(s)) / 2; const dy = (size - s) / 2;
  for (const v of values) { const vw = engravedWidth(r, v, s); engraved(r, ctx, v, x + vw / 2, y + dy, s, col); x += vw + gap * (s / size); }
}
/** Une molette : couronne moletée (25 crans) et moyeu (un cran fin). Moitié gauche « − », droite « + ». */
function wheel(r, ctx, c, axis, W0, value, span, shown, tm, o = {}) {
  const t = tOf(r), { x, y } = W0, a = -Math.PI / 2 + (value / span) * Math.PI * 2, name = axisName(t, axis), S = o.step || T.STEP[axis], RING = o.ring || RING0, HUB = o.hub || HUB0;
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(x, y + RING + 5, RING * 0.9, 5, 0, 0, 6.283); ctx.fill();
  const g = ctx.createRadialGradient(x - RING * 0.35, y - RING * 0.4, 3, x, y, RING); g.addColorStop(0, c("#f3dca0")); g.addColorStop(0.55, c("#b8913f")); g.addColorStop(1, c("#5a4322"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, RING, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3a2a14"); ctx.lineWidth = 1;
  for (let i = 0; i < 25; i++) { const q = a + (i / 25) * 6.283; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (RING - 6), y + Math.sin(q) * (RING - 6)); ctx.lineTo(x + Math.cos(q) * RING, y + Math.sin(q) * RING); ctx.stroke(); } // 25 crans
  ctx.fillStyle = c("#2a1d13"); ctx.beginPath(); ctx.arc(x, y, RING - 9, 0, 6.283); ctx.fill();
  const hg = ctx.createRadialGradient(x - 4, y - 5, 1, x, y, HUB); hg.addColorStop(0, c("#f3dca0")); hg.addColorStop(1, c("#7a5c28")); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, HUB, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#1b130d"); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (HUB - 3), y + Math.sin(a) * (HUB - 3)); ctx.stroke(); // l'index du moyeu
  ctx.fillStyle = c("#e0c27a"); ctx.beginPath(); ctx.arc(x + Math.cos(a) * (RING - 3), y + Math.sin(a) * (RING - 3), 2.4, 0, 6.283); ctx.fill(); // le repère de la couronne
  if (r.wheelSpin && r.wheelSpin[axis] && tm - r.wheelSpin[axis] < 0.25) { ctx.strokeStyle = rgba(243, 220, 160, 0.5 * (1 - (tm - r.wheelSpin[axis]) / 0.25)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, RING + 3, 0, 6.283); ctx.stroke(); }
  const small = RING < RING0, unit = axis === "torahn" ? t("tel.unit.torahn") : axis === "delay" ? t("sys.unit.delay") : t("tel.unit.elev");
  // `side` (la molette du retard) : le nom et la lecture à droite de la molette, pour tenir dans le bas du panneau
  const lx = o.side ? x + RING + o.side : x, ly = o.side ? y - 9 : y + RING + (small ? 14 : 22), vy = o.side ? y - 4 : y + RING + (small ? 18 : 30);
  ctx.fillStyle = c("#e9dcb8"); ctx.font = small ? "italic 11px serif" : "italic 13px serif"; ctx.textAlign = "center"; ctx.fillText(name, lx, ly); ctx.textAlign = "left";
  engraved(r, ctx, shown, lx, vy, small ? 9 : 12, "#e0c27a");
  if (o.valueTip) { // le retard : le nom dit l'unité, la valeur dit le retard du pouls sur le balancier, en mots
    r.hot.push({ x: lx - 40, y: ly - 11, w: 80, h: 13, tip: unit });
    r.hot.push({ x: lx - 40, y: vy - 2, w: 80, h: 16, tip: o.valueTip });
  } else r.hot.push({ x: x - RING, y: y + RING + 4, w: RING * 2, h: small ? 26 : 40, tip: unit }); // le nom et la valeur : l'unité (et le sens du KI)
  // couronne d'abord, moyeu ensuite : la dernière zone posée l'emporte (hit cherche de la fin vers le début)
  // au doigt (mode tactile) : `wc`, la molette qu'on tourne en glissant autour de son centre (fin au moyeu, gros à la couronne)
  const wc = { x, y, hub: HUB, kind: "tel", fine: (d) => ({ axis, delta: d * S.hub }), coarse: (d) => ({ axis, delta: d * S.rim }) };
  r.hot.push({ x: x - RING - 4, y: y - RING - 4, w: RING + 4, h: RING * 2 + 8, tip: `${name} — ${t("tel.ring.minus")}`, tel: { axis, delta: -S.rim }, wc });
  r.hot.push({ x, y: y - RING - 4, w: RING + 4, h: RING * 2 + 8, tip: `${name} — ${t("tel.ring.plus")}`, tel: { axis, delta: S.rim }, wc });
  r.hot.push({ x: x - HUB - 2, y: y - HUB - 2, w: HUB + 2, h: HUB * 2 + 4, tip: `${name} — ${t("tel.hub.minus")}`, tel: { axis, delta: -S.hub }, wc });
  r.hot.push({ x, y: y - HUB - 2, w: HUB + 2, h: HUB * 2 + 4, tip: `${name} — ${t("tel.hub.plus")}`, tel: { axis, delta: S.hub }, wc });
}

/** La visée affichée, en crans fins (u) et shahfeetee (v) : glisse de l'ancienne vers la nouvelle (au plus court sur le cercle). */
function shownAim(st, tm) { // st : { aim, anim } (la visée du Zéro, ou le réglage d'un Âge)
  const cur = { u: st.aim.torahn / T.NOTCH, v: st.aim.elev }, a = st.anim; if (!a || tm < a.t0 || tm - a.t0 >= 0.35) return cur;
  const p = 1 - Math.pow(1 - (tm - a.t0) / 0.35, 2), g = T.gap(a.from, { torahn: st.aim.torahn, elevation: st.aim.elev });
  return { u: (a.from.torahn + g.dt * p) / T.NOTCH, v: lerp(a.from.elev, st.aim.elev, p) };
}

/**
 * Une autre source dans l'oculaire (étape 3), à sa place par rapport à la visée : `sig` (son écart et sa force), `period`
 * (en prorahn : la fausse ligne glisse contre l'horloge, le pulsar bat plus vite), `col` (teinte), `smear` (trou noir :
 * l'image étirée en arc vers le vrai point `smear`), `sharp` (faux pouls : des éclats brefs).
 */
function source(ctx, E, g, ms, lag) {
  const { cx, cy, k, R } = E, sig = g.sig, s = sig.s, per = PULSE_MS * (g.period || 1), b = frac((ms - DT.REF) / per), amp = T.pulseOf(s, Math.floor((ms - DT.REF) / per) ^ 0x51).amp;
  const pulse = g.sharp ? Math.exp(-b * 14) * amp : 0.35 + 0.65 * Math.exp(-b * (2 + 5 * s)) * amp, haze = clamp(1 - sig.d / (FIELD * 1.4)), [cr, cg, cb] = g.col;
  const hx = cx + (sig.dt / T.NOTCH + lag.u) * k * haze, hy = cy - (sig.de + lag.v) * k * haze, hr = lerp(R * 1.1, 4 + 9 * (1 - s), haze);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  if (g.smear && haze > 0.05) { // l'arc de lumière courbée : de l'image déviée vers le vrai point
    const tx = cx + (g.smear.dt / T.NOTCH + lag.u) * k * haze, ty = cy - (g.smear.de + lag.v) * k * haze, mx = (hx + tx) / 2 - (ty - hy) * 0.35, my = (hy + ty) / 2 + (tx - hx) * 0.35;
    ctx.strokeStyle = rgba(cr, cg, cb, clamp(s * 0.55 * pulse)); ctx.lineWidth = 2.4 * haze + 0.6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
    ctx.lineWidth = 6 * haze; ctx.strokeStyle = rgba(cr, cg, cb, clamp(s * 0.12 * pulse)); ctx.stroke();
  }
  const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr); hg.addColorStop(0, rgba(cr, cg, cb, clamp(s * 0.85 * pulse))); hg.addColorStop(0.5, rgba(cr, cg, cb, clamp(s * 0.3 * pulse))); hg.addColorStop(1, rgba(cr, cg, cb, 0));
  ctx.fillStyle = hg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  if (haze > 0.05) { ctx.fillStyle = rgba(Math.min(255, cr + 40), Math.min(255, cg + 30), Math.min(255, cb + 30), clamp(haze * (0.3 + 0.7 * pulse) * (g.sharp ? 1 : 0.8))); ctx.beginPath(); ctx.arc(hx, hy, 1 + 1.6 * haze, 0, 6.283); ctx.fill(); }
  ctx.restore();
  return { hx, hy, haze };
}

/** L'oculaire : le ciel vu dans la lunette, le pouls du Zéro, l'anneau de visée. Coordonnées en crans fins. `more` (étape 3) : d'autres sources, un second écho. */
function eyepiece(r, ctx, c, st, sig, tm, ms, echo = null, more = null) {
  const { x: cx, y: cy, r: R } = EYE, k = R / FIELD, aim = shownAim(st, tm), tol = T.TOL.torahn / T.NOTCH;
  // le fût de laiton autour
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.arc(cx + 6, cy + 8, R + 22, 0, 6.283); ctx.fill();
  const fr = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); fr.addColorStop(0, c("#c9a24e")); fr.addColorStop(0.5, c("#6b5126")); fr.addColorStop(1, c("#b8913f"));
  ctx.fillStyle = fr; ctx.beginPath(); ctx.arc(cx, cy, R + 18, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#3b2a1b"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R + 9, 0, 6.283); ctx.stroke();
  for (let i = 0; i < 25; i++) { const q = (i / 25) * 6.283 - Math.PI / 2 - (aim.u / NT) * 6.283; ctx.beginPath(); ctx.moveTo(cx + Math.cos(q) * (R + 11), cy + Math.sin(q) * (R + 11)); ctx.lineTo(cx + Math.cos(q) * (R + (i % 5 ? 14 : 17)), cy + Math.sin(q) * (R + (i % 5 ? 14 : 17))); ctx.stroke(); } // le cercle gradué tourne avec le Torahn
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip();
  const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, R); bg.addColorStop(0, "#0b1022"); bg.addColorStop(1, "#03050c"); ctx.fillStyle = bg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  // les étoiles, à leur place dans le ciel du Relto : elles défilent quand on tourne (sens horaire : le ciel glisse vers la gauche)
  for (const s of st.stars) {
    let du = s.u - aim.u; du -= Math.round(du / NT) * NT;
    const dv = s.v - aim.v; if (Math.abs(du) > FIELD + 2 || Math.abs(dv) > FIELD + 2) continue;
    const a = (0.35 + 0.65 * s.m) * (0.75 + 0.25 * Math.sin(tm * 1.7 + s.tw)), px = cx + du * k, py = cy - dv * k;
    ctx.fillStyle = rgba(225, 232, 255, a); ctx.fillRect(px, py, 0.8 + s.m * 1.6, 0.8 + s.m * 1.6);
  }
  // le pouls du Zéro : il bat au prorahn ; loin, il hésite et se dilue ; près, il se resserre et se fixe
  const s = sig.s, beat = frac((ms - DT.REF) / PULSE_MS), { amp } = T.pulseOf(s, Math.floor((ms - DT.REF) / PULSE_MS)), pulse = (0.35 + 0.65 * Math.exp(-beat * (2 + 5 * s)) * amp);
  let lag = st.aim.torahn / T.NOTCH - aim.u; lag -= Math.round(lag / NT) * NT; // la visée affichée glisse encore : au plus court sur le cercle
  const haze = clamp(1 - sig.d / (FIELD * 1.4)), dx = sig.dt / T.NOTCH + lag, dy = sig.de + (st.aim.elev - aim.v), blur = (more && more.blur) || 0;
  const wob = blur ? 1.4 * blur * haze : 0, hx = cx + dx * k * haze + wob * Math.sin(tm * 7.3), hy = cy - dy * k * haze + wob * Math.cos(tm * 5.9); // mode facile, près d'une étoile morte : l'image tremble un peu
  const hr = lerp(R * 1.1, 5 + 10 * (1 - s), haze) * (1 + 0.6 * blur);
  const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr); hg.addColorStop(0, rgba(150, 230, 215, clamp(s * 0.9 * pulse))); hg.addColorStop(0.5, rgba(127, 214, 200, clamp(s * 0.35 * pulse))); hg.addColorStop(1, "rgba(127,214,200,0)");
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  if (haze > 0.05) { ctx.fillStyle = rgba(235, 255, 250, clamp(haze * (0.4 + 0.6 * pulse) * (1 - 0.35 * blur))); ctx.beginPath(); ctx.arc(hx, hy, (1.2 + 1.8 * haze) * (1 + 0.8 * blur), 0, 6.283); ctx.fill(); } // le point, dans le champ (un peu flou près d'une étoile morte, en mode facile)
  ctx.restore();
  const lens = more && more.lens, rings = !lens || lens === "echo" || lens === "both", dial = !lens || lens === "plate" || lens === "both", Z = lens === "echo" || lens === "both" ? ZOOM : 1; // sans tourelle (mode facile) : tout, comme avant
  const lagUV = { u: lag, v: st.aim.elev - aim.v }, at = [];
  for (const g of (more && more.sources) || []) at.push(source(ctx, { cx, cy, k, R }, g, ms, lagUV)); // étape 3 : fausse ligne, image courbée, faux pouls
  // l'anneau de visée (la tolérance) et la croisée
  ctx.strokeStyle = sig.found ? "rgba(127,214,200,0.9)" : "rgba(224,194,122,0.55)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, (tol + 0.5) * k, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = "rgba(224,194,122,0.25)"; ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx - (tol + 2) * k, cy); ctx.moveTo(cx + (tol + 2) * k, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy - (tol + 2) * k); ctx.moveTo(cx, cy + (tol + 2) * k); ctx.lineTo(cx, cy + R); ctx.stroke();
  if (echo) { // le balancier relié à l'instrument : à chaque battement la croisée luit (en or au coup marqué du gorahn) ; l'écho juste naît sur cet éclair
    const bp = MET.beatPos(ms), bn = Math.floor(bp), fl = Math.exp(-(bp - bn) * 7), gold = MET.isMarked(bn);
    if (fl > 0.03) {
      ctx.strokeStyle = gold ? rgba(255, 214, 120, 0.85 * fl) : rgba(240, 220, 170, 0.55 * fl); ctx.lineWidth = gold ? 2.2 : 1.4;
      ctx.beginPath(); ctx.moveTo(cx - R * 0.55, cy); ctx.lineTo(cx - (tol + 2) * k, cy); ctx.moveTo(cx + (tol + 2) * k, cy); ctx.lineTo(cx + R * 0.55, cy); ctx.moveTo(cx, cy - R * 0.55); ctx.lineTo(cx, cy - (tol + 2) * k); ctx.moveTo(cx, cy + (tol + 2) * k); ctx.lineTo(cx, cy + R * 0.55); ctx.stroke();
    }
  }
  if (sig.found) { ctx.strokeStyle = rgba(127, 214, 200, 0.5 + 0.3 * Math.exp(-beat * 4)); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, (tol + 0.5) * k + 4 + 6 * beat, 0, 6.283); ctx.stroke(); }
  if (echo && rings && haze > 0.05) { // l'écho de l'Âge (verre d'écho : grossi, pour lire sa naissance d'un coup d'œil) : un cercle d'ambre qui bat avec son retard ; accordé, il bat avec le pouls
    const eb = frac(beat - echo.off), ea = clamp(haze) * (0.25 + 0.6 * Math.exp(-eb * 5)) * (echo.ok ? 0.4 : 1) * (echo.pale || 1);
    // le battement fort : le Zéro frappe plus fort une fois par gorahn ; son écho revient sur le coup marqué du balancier si le
    // compte de battements est juste, un coup plus tôt ou plus tard sinon (le mauvais battement)
    const etick = Math.floor((ms - DT.REF) / PULSE_MS - echo.off), strong = MET.isMarked(etick - (echo.shift || 0)) ? 1 : 0;
    ctx.strokeStyle = strong ? rgba(255, 214, 120, Math.min(1, ea * 1.6 + 0.2)) : rgba(240, 184, 96, ea); ctx.lineWidth = (strong ? 2.6 : 1.2) * (Z > 1 ? 1.5 : 1); ctx.beginPath(); ctx.arc(hx, hy, (4 + 14 * eb) * (strong ? 1.5 : 1) * Z, 0, 6.283); ctx.stroke();
  }
  if (more && more.echo3 && rings && haze > 0.05) { // la ligne de Me'erta, à sa période, un peu plus pâle
    const e3 = more.echo3, per = PULSE_MS * e3.period, b3 = frac((ms - DT.REF) / per - e3.off), ea = clamp(haze) * (0.25 + 0.55 * Math.exp(-b3 * 6)) * 0.85;
    ctx.strokeStyle = rgba(240, 184, 96, ea); ctx.lineWidth = 1.2 * (Z > 1 ? 1.5 : 1); ctx.beginPath(); ctx.arc(hx, hy, (5 + 16 * b3) * Z, 0, 6.283); ctx.stroke();
  }
  if (more && more.echo2 && rings && haze > 0.05) { // étape 3 : le faux pouls a son propre écho, plus vif ; celui du Zéro reste pâle dessous
    const e2 = more.echo2, per = PULSE_MS * e2.period, b2 = frac((ms - DT.REF) / per - e2.off), ea = clamp(haze) * (0.3 + 0.65 * Math.exp(-b2 * 6)) * (e2.ok ? 0.5 : 1);
    ctx.strokeStyle = rgba(240, 184, 96, ea); ctx.lineWidth = 1.3 * (Z > 1 ? 1.5 : 1); ctx.beginPath(); ctx.arc(hx, hy, (5 + 16 * b2) * Z, 0, 6.283); ctx.stroke();
  }
  if (more && more.ghost) { // la prédiction des balises : où le Zéro devrait apparaître d'ici (un anneau fantôme ; hors du champ, une lueur au bord, seulement de près)
    const gx = cx + (more.ghost.dt / T.NOTCH + lagUV.u) * k, gy = cy - (more.ghost.de + lagUV.v) * k, gd = Math.hypot(gx - cx, gy - cy);
    ctx.strokeStyle = "rgba(159,230,218,0.85)"; ctx.fillStyle = "rgba(159,230,218,0.85)"; ctx.lineWidth = 1.2;
    if (gd < R - 6) { ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(gx, gy, (tol + 0.5) * k, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
    else { // hors du champ : pas de flèche, la lumière prédite déborde sur le bord du verre, seulement de près (moins de deux rayons d'oculaire), et bat avec le pouls
      const dg = gd / k, a = clamp((GHOST_REACH * FIELD - dg) / ((GHOST_REACH - 1) * FIELD));
      if (a > 0.01) {
        const an = Math.atan2(gy - cy, gx - cx), ex = cx + Math.cos(an) * R, ey = cy + Math.sin(an) * R, bp = MET.beatPos(ms), fl = Math.exp(-(bp - Math.floor(bp)) * 4), hr = R * (0.3 + 0.3 * a);
        const hg = ctx.createRadialGradient(ex, ey, 0, ex, ey, hr); hg.addColorStop(0, rgba(159, 230, 218, 0.45 * a * (0.45 + 0.55 * fl))); hg.addColorStop(1, "rgba(159,230,218,0)");
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hg; ctx.fillRect(ex - hr, ey - hr, hr * 2, hr * 2);
        const sp = 0.18 + 0.22 * a; ctx.lineCap = "round"; // là où elle « tape » : un liseré de lumière sur le bord du verre
        ctx.strokeStyle = rgba(159, 230, 218, 0.7 * a * (0.4 + 0.6 * fl)); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5, an - sp, an + sp); ctx.stroke();
        ctx.strokeStyle = rgba(159, 230, 218, 0.25 * a * (0.4 + 0.6 * fl)); ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, R - 4, an - sp * 0.8, an + sp * 0.8); ctx.stroke(); ctx.restore();
      }
    }
  }
  if (more && more.phase && dial) phaseDial(ctx, cx, cy, R * 0.86, ms, more.phase.sources, more.phase.trace, more.phase.ghost);
  void at;
  const vg = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)"); ctx.fillStyle = vg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  const gl = ctx.createLinearGradient(cx - R, cy - R, cx, cy); gl.addColorStop(0, "rgba(255,255,255,0.08)"); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); // reflet de la lentille
  ctx.restore();
  const t = tOf(r); r.hot.push({ x: cx - R, y: cy - R, w: R * 2, h: R * 2, tip: echo ? t("sys.eyepiece") : t("tel.eyepiece"), ...(r.touch ? { tel: { eyeZoom: true } } : {}) }); // au doigt : un toucher l'agrandit
}

/**
 * Le cadran de phase : un arc gradué dans le verre, l'éclair du balancier toujours à midi. Le télescope n'est pas un
 * calculateur : il montre tout ce qui arrive. Art de la Guilde : chaque naissance d'un pouls laisse une marque qui s'efface
 * en quelques battements (`r.phaseTrace`, par source). Le pouls du Zéro (ou son écho) naît toujours au même endroit tant que la
 * molette ne bouge pas : ses marques s'empilent en un point net. La ligne de Me'erta (1,06) marche lentement autour du cadran ;
 * un pulsar rampe, une étoile à neutrons saute : aucun ne fait de pile. Tourner la molette brouille la trace, qui se reforme.
 * Manière facile : un seul point, en direct, sans trace (rien ne trompe).
 * `sources` : { key, period, off (en battements), s (force 0..1) }.
 */
const TRACE_BEATS = 8;
function phaseDial(ctx, cx, cy, Rd, ms, sources, trace, ghost = null) {
  const bp = MET.beatPos(ms), at = (ph) => -Math.PI / 2 + ph * 2 * Math.PI, P = (ph, rr) => [cx + Math.cos(at(ph)) * rr, cy + Math.sin(at(ph)) * rr];
  ctx.save();
  ctx.strokeStyle = "rgba(224,194,122,0.22)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, Rd, 0, 6.283); ctx.stroke();
  for (let i = -4; i <= 5; i++) { const ph = i / 10, [x0, y0] = P(ph, Rd - (i === 0 ? 7 : 3)), [x1, y1] = P(ph, Rd + 3); ctx.strokeStyle = i === 0 ? "rgba(255,214,120,0.8)" : "rgba(224,194,122,0.3)"; ctx.lineWidth = i === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  const fl = Math.exp(-(bp - Math.floor(bp)) * 7), [tx, ty] = P(0, Rd + 8); // midi : l'éclair du balancier
  ctx.fillStyle = MET.isMarked(Math.floor(bp)) ? `rgba(255,214,120,${0.35 + 0.65 * fl})` : `rgba(240,220,170,${0.25 + 0.6 * fl})`; ctx.beginPath(); ctx.moveTo(tx, ty + 5); ctx.lineTo(tx - 4, ty - 2); ctx.lineTo(tx + 4, ty - 2); ctx.closePath(); ctx.fill();
  const wrap = (ph) => ((ph % 1) + 1.5) % 1 - 0.5;
  if (ghost != null) { const [gx, gy] = P(wrap(ghost), Rd); ctx.strokeStyle = "rgba(159,230,218,0.9)"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(gx, gy, 6, 0, 6.283); ctx.stroke(); } // la prédiction : où l'écho devrait naître, avec ce retard
  if (!trace) { // manière facile : le point en direct du seul pouls qui compte
    const g = sources[0]; if (g) { const since = ((bp - g.off) % 1 + 1) % 1, gl = Math.exp(-since * 3), [x, y] = P(wrap(g.off), Rd); ctx.fillStyle = `rgba(255,196,110,${(0.65 + 0.35 * gl) * Math.max(0.3, g.s)})`; ctx.beginPath(); ctx.arc(x, y, 4 + 2 * gl, 0, 6.283); ctx.fill(); }
    ctx.restore(); return;
  }
  for (const g of sources) { // chaque pouls laisse sa marque à sa naissance ; les marques vieillissent et s'effacent
    const per = g.period || 1, kb = Math.floor(bp / per - g.off), birth = (kb + g.off) * per, marks = trace[g.key] || (trace[g.key] = []);
    if (!marks.length || marks[marks.length - 1].kb !== kb) marks.push({ kb, at: birth, ph: wrap(birth), s: g.s });
    while (marks.length && bp - marks[0].at > TRACE_BEATS) marks.shift();
    for (const m of marks) { const age = bp - m.at, a = 0.42 * Math.exp(-age / 3.5) * Math.max(0.45, m.s), [x, y] = P(m.ph, Rd); ctx.fillStyle = `rgba(255,196,110,${a})`; ctx.beginPath(); ctx.arc(x, y, 4.2 + 1.8 * Math.exp(-age * 3), 0, 6.283); ctx.fill(); }
  }
  for (const k of Object.keys(trace)) if (!sources.some((g) => g.key === k)) delete trace[k]; // une source disparue (livre changé, balises) : sa trace aussi
  ctx.restore();
}

/**
 * La tourelle de verres (Art de la Guilde), sur le fût de l'oculaire : un clic la tourne d'un cran. Verre nu (le ciel et le
 * point), verre d'écho (l'écho grossi), plaque de phase (le cadran et ses traces), les deux. Le choix est gardé par Relto.
 */
function turret(r, ctx, c, st) {
  const t = tOf(r), { x, y, r: R0 } = TURRET, cur = lensOf(st), i = LENSES.indexOf(cur), names = String(t("tel.lens.names")).split("|");
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(x + 1.5, y + 2.5, R0 + 1, 0, 6.283); ctx.fill();
  const g = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, R0); g.addColorStop(0, c("#f3dca0")); g.addColorStop(0.6, c("#b8913f")); g.addColorStop(1, c("#5a4322"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R0, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#3a2a14"); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = c("#1b130d"); ctx.beginPath(); ctx.arc(x, y, R0 - 3.5, 0, 6.283); ctx.fill();
  // le verre en place, au centre : nu (un cercle), écho (cercles grossis), plaque (un arc gradué), les deux
  ctx.strokeStyle = "#e0c27a"; ctx.lineWidth = 1;
  if (cur === "echo" || cur === "both") { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 6.283); ctx.stroke(); }
  if (cur === "plate" || cur === "both") { for (let k = -2; k <= 2; k++) { const q = -Math.PI / 2 + k * 0.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * 4, y + Math.sin(q) * 4); ctx.lineTo(x + Math.cos(q) * 5.6, y + Math.sin(q) * 5.6); ctx.stroke(); } }
  if (cur === "bare") { ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.283); ctx.stroke(); }
  for (let k = 0; k < 4; k++) { const q = -Math.PI / 2 + k * Math.PI / 2 - 0.0, px = x + Math.cos(q) * (R0 + 4), py = y + Math.sin(q) * (R0 + 4); ctx.fillStyle = k === i ? "#ffe2a0" : "rgba(224,194,122,0.35)"; ctx.beginPath(); ctx.arc(px, py, k === i ? 1.9 : 1.2, 0, 6.283); ctx.fill(); }
  r.hot.push({ x: x - R0 - 6, y: y - R0 - 6, w: (R0 + 6) * 2, h: (R0 + 6) * 2, tip: t("tel.lens.tip", { now: names[i] || "", next: names[(i + 1) % 4] || "" }), tel: { lens: 1 } });
}

/** Le lutrin : le livre de l'Âge dont on reporte les indices (‹ › pour choisir ; vide : on cherche le Zéro du Relto). */
function lectern(r, ctx, c, st) {
  const t = tOf(r), { x, y } = LECTERN, book = st.book, ages = (r.scene && r.scene.ages) || [];
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(x - 3, y - 36, 6, 36); ctx.fillRect(x - 18, y - 3, 36, 4);
  ctx.save(); ctx.translate(x, y - 40); ctx.rotate(-0.18);
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(-38, -12, 76, 22);
  if (book) {
    ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(-35, -10, 34, 18); ctx.fillRect(1, -10, 34, 18);
    ctx.strokeStyle = c("#9a8a6a"); ctx.lineWidth = 0.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-31, -5 + i * 5); ctx.lineTo(-5, -5 + i * 5); ctx.moveTo(5, -5 + i * 5); ctx.lineTo(31, -5 + i * 5); ctx.stroke(); }
    const sys = bookSystem(st); if (sys && st.systems[sys.key]) { ctx.fillStyle = "#7fd6c8"; ctx.beginPath(); ctx.arc(29, 4, 2.4, 0, 6.283); ctx.fill(); } // la marque d'un système situé
  } else { ctx.fillStyle = c("#4a3a2a"); ctx.fillRect(-35, -10, 70, 18); }
  ctx.restore();
  ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillStyle = "#e0c27a";
  ctx.fillText(book ? book.age.name : ages.length ? t("sys.lectern.empty") : t("sys.lectern.none"), x + 6, y + 16, 104); ctx.textAlign = "left";
  if (ages.length) for (const [dx, sym, d] of [[-46, "‹", -1], [46, "›", 1]]) { ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.fillText(sym, x + dx, y - 34); ctx.textAlign = "left"; r.hot.push({ x: x + dx - 11, y: y - 52, w: 22, h: 26, tip: d < 0 ? t("sys.lectern.prev") : t("sys.lectern.next"), tel: { book: d } }); }
  r.hot.push({ x: x - 34, y: y - 58, w: 68, h: 58, tip: book ? `${book.age.name} — ${st.found ? t("sys.lectern.book") : t("sys.lectern.nozero")}` : t("sys.lectern.tip"), tel: ages.length ? { book: 1 } : undefined });
}

/** La vue du télescope : le sommet la nuit, l'oculaire, les deux molettes, la plaque, la ligne de mots. */
function drawTelescopeRoom(r, ctx, sc, sky, tm) {
  const t = tOf(r), st = state(r), ms = now(r), amb = 0.6 + 0.4 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  const guild = guildOf(r), sys0 = bookSystem(st), lines = linesOf(r, st), sc0 = st.found && sys0 ? scopeOf(r, st, sys0) : null;
  const sig = sc0 ? look(r, sc0.shown, beatOf(r), fnvKey(st.key + sys0.key)) : look(r, lines.best, beatOf(r), fnvKey(st.key)); // ce qu'on entend : la source qu'on voit le mieux
  r.telescopeT = tm;
  // à l'oreille, à chaque battement : le tic du métronome (au prorahn), et le pouls de la source qu'on voit le mieux, à SA période
  // (le vrai Zéro tombe avec le tic ; la ligne de Me'erta s'en écarte peu à peu) ; un faux pouls a sa propre note, brève
  const sfx = (k, s) => { if (r.opts.onTelescopeSound) r.opts.onTelescopeSound(k, s); };
  { const b = beatOf(r); if (r.telescopePulse != null && b !== r.telescopePulse) sfx("metronome", 1); r.telescopePulse = b; }
  const heard = r.telescopeBeats || (r.telescopeBeats = {}), hear = (k, period, s, kind) => { const b = Math.floor(MET.beatPos(ms, period)); if (heard[k] && heard[k].p === period && b !== heard[k].b) { const p = T.pulseOf(s, b); if (!p.skip) sfx(kind, s * p.amp); } heard[k] = { b, p: period }; };
  hear("pulse", !sc0 && lines.best.line ? st.old.period : 1, sig.s, "pulse");
  if (sc0 && sc0.beat) hear("false", sc0.fx.beat.period, Math.max(0.15, sc0.true.s), "falsebeat"); else delete heard.false;
  if (sc0 && guild && st.old) hear("merta", st.old.period, Math.max(0.1, sig.s * 0.6), "pulse"); else delete heard.merta; // la ligne de Me'erta traverse les Âges : on l'entend glisser là aussi
  // l'intérieur de l'observatoire : la coupole sombre et ses nervures, la fente ouverte sur le ciel, le grand tube, le sol de pierre
  const glass = !!(r.glassOn && r.glassOn()); // la Verrière : coupole vert sombre, nervures et bords de cuivre, sol de mosaïque, coins du panneau en rinceaux
  const castle = !!(r.castleOn && r.castleOn()); // le Château : coupole de plomb, nervures de fer, dallage, panneau cerclé d'or
  const dg = ctx.createRadialGradient(W / 2, 300, 40, W / 2, 300, 520); dg.addColorStop(0, c(castle ? "#2a2834" : glass ? "#1e2e2b" : "#2b2621")); dg.addColorStop(1, c(castle ? "#0b0a10" : glass ? "#080d0c" : "#0d0b0a")); ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
  const SL = { x: 318, w: 52 }; // la fente de la coupole, entre l'oculaire et le panneau
  ctx.save(); ctx.beginPath(); ctx.rect(SL.x, 0, SL.w, 286); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, 286); g.addColorStop(0, mix("#04060d", sky.top, 0.35)); g.addColorStop(1, mix("#0a0c14", sky.bottom, 0.3)); ctx.fillStyle = g; ctx.fillRect(SL.x, 0, SL.w, 286);
  const q = rng(((sc.seed || 0) ^ 0x51a7) >>> 0); for (let i = 0; i < 70; i++) { const x = SL.x + q() * SL.w, y = q() * 260, a = (0.2 + 0.5 * q()) * (0.6 + 0.4 * (sky.night == null ? 1 : sky.night)); ctx.fillStyle = rgba(230, 236, 255, a); ctx.fillRect(x, y, 1, 1); }
  ctx.restore();
  ctx.strokeStyle = c(castle ? CS.IRON : glass ? VR.COPPER : "#4a3a26"); ctx.lineWidth = 3; ctx.strokeRect(SL.x - 1.5, -2, SL.w + 3, 289); if (castle) { ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.8; ctx.strokeRect(SL.x - 3.5, -2, SL.w + 7, 291); } // les bords de la fente (les volets ouverts)
  ctx.strokeStyle = castle ? c("#14121a") : glass ? c("#7a4422") : "rgba(0,0,0,0.45)"; ctx.lineWidth = castle ? 2.2 : glass ? 1.6 : 1.4; // les nervures de la coupole
  for (let k = 1; k <= 4; k++) { const y0 = 286 - k * 62; ctx.beginPath(); ctx.moveTo(0, y0 + 30); ctx.quadraticCurveTo(SL.x / 2, y0 - 4, SL.x - 2, y0); ctx.moveTo(SL.x + SL.w + 2, y0); ctx.quadraticCurveTo((SL.x + SL.w + W) / 2, y0 - 4, W, y0 + 30); ctx.stroke(); }
  for (const x of [24, 150, 250, 420, 520, 620]) { ctx.beginPath(); const L = x < SL.x; ctx.moveTo(x, 286); ctx.quadraticCurveTo(x + (L ? 40 : -40), 110, L ? SL.x - 4 : SL.x + SL.w + 4, 0); ctx.stroke(); }
  if (castle) { const pg = ctx.createLinearGradient(0, 286, 0, H); pg.addColorStop(0, c("#34303c")); pg.addColorStop(1, c("#17151b")); ctx.fillStyle = pg; ctx.fillRect(0, 286, W, H - 286); ctx.strokeStyle = "rgba(0,0,0,0.38)"; ctx.lineWidth = 1; for (const y of [298, 316, 342]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } for (let i = 0; i < 12; i++) { const x = i * 58 + 18; ctx.beginPath(); ctx.moveTo(x, 286); ctx.lineTo(x - (x - 320) * 0.2, H); ctx.stroke(); } ctx.fillStyle = c(CS.GOLD); ctx.fillRect(0, 286, W, 0.8); } // le Château : un dallage de pierre
  else if (glass) VR.darkMosaic(ctx, c, 286); else {
  const pg = ctx.createLinearGradient(0, 286, 0, H); pg.addColorStop(0, c("#3a3530")); pg.addColorStop(1, c("#1a1714")); ctx.fillStyle = pg; ctx.fillRect(0, 286, W, H - 286);
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; for (let x = 0; x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x + (x / 46 % 2) * 20, 286); ctx.lineTo(x + (x / 46 % 2) * 20, H); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, 312); ctx.lineTo(W, 312); ctx.stroke();
  }
  // le corps de l'instrument : un panneau de laiton sombre derrière les molettes
  ctx.fillStyle = c("#1b130d"); ctx.fillRect(374, 34, 250, 252); ctx.strokeStyle = c(castle ? CS.GOLD : glass ? VR.COPPER : "#8a6a2e"); ctx.lineWidth = glass || castle ? 2 : 1.2; ctx.strokeRect(374.5, 34.5, 249, 251); if (castle) { ctx.strokeStyle = c(CS.IRON); ctx.lineWidth = 1; ctx.strokeRect(377.5, 37.5, 243, 245); }
  if (glass) VR.cornerVines(ctx, c, 374, 34, 250, 252); // des rinceaux de cuivre aux quatre coins, hors des molettes
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(330, 140, 46, 20); // le bras qui relie l'oculaire au panneau
  metronome(r, ctx, c, ms); // au mur de gauche : le balancier qui bat le prorahn
  const sys = bookSystem(st), meas = !!(st.found && sys);
  if (meas) { // étape 2 : les molettes portent les indices de l'Âge ; l'oculaire montre son écho
    const sc1 = sc0, m = sc1.m, seen = look(r, sc1.true, beatOf(r), fnvKey(st.key + sys.key)), view = { aim: st.dial, anim: st.anim, stars: st.stars };
    const tangled = needHold(r, sc1); // Guilde, étoile morte : le vrai écho pâlit sous le faux
    let holding = !!(st.hold && st.hold.key === sys.key);
    if (holding && !(m.located || (st.hold.bite && sc1.falseLock && m.found))) { st.hold = null; holding = false; }
    if (holding && ms - st.hold.t0 >= HOLD_BEATS * PULSE_MS) { const bt = st.hold.bite || 0; chart(r, st, sys, sfx, bt); holding = false; } // la pose est faite : ce qui était exposé est gravé (vrai ou faux)
    // étape 3 : l'image courbée (trou noir) et le faux pouls (pulsar, étoile à neutrons), à côté du vrai point pâli ; mode facile : un léger flou (`blur`)
    const more = { sources: [], echo2: null, blur: sc1.blur || 0 };
    if (sc1.lure) more.sources.push({ sig: look(r, sc1.lure, beatOf(r) + 7, fnvKey(sys.key)), period: 1, col: [235, 210, 160], smear: { dt: sc1.true.dt, de: sc1.true.de } });
    if (sc1.beat) { more.sources.push({ sig: { ...sc1.true, s: Math.max(0.15, sc1.true.s) }, period: sc1.fx.beat.period, col: [170, 200, 255], sharp: true }); more.echo2 = { off: SS.echoOffset(sc1.echoDd), ok: sc1.falseLock, period: sc1.fx.beat.period }; }
    const haze = Math.max(0.15, seen.s), zOff = SS.echoOffset(m.dd), mOff = (fnvKey(st.key + sys.key + "|merta") % 1000) / 1000; // la ligne de Me'erta traverse les Âges comme le Zéro : son écho est là aussi, à sa période
    const phase = { sources: [{ key: "echo", period: 1, off: zOff, s: haze }], trace: guild ? (r.phaseTrace || (r.phaseTrace = {})) : null };
    if (guild && st.old) { phase.sources.push({ key: "merta", period: st.old.period, off: mOff, s: haze * 0.85 }); more.echo3 = { off: mOff, period: st.old.period }; }
    if (sc1.beat) phase.sources.push({ key: "beat", period: sc1.fx.beat.period, off: SS.echoOffset(sc1.echoDd), s: haze * 0.9 });
    more.phase = phase;
    // la tourelle de verres (Guilde) et la prédiction des balises : un anneau fantôme, un repère sur la molette et sur le cadran
    const pred = guild && st.triFor === sys.key ? SS.predict(sys, st.systems, st.line) : null;
    if (guild) more.lens = lensOf(st);
    if (pred) { const gp = T.gap(st.dial, { torahn: pred.torahn, elevation: pred.elev }); more.ghost = { dt: gp.dt, de: gp.de }; phase.ghost = SS.echoOffset(st.dial.delay - pred.delay); }
    eyepiece(r, ctx, c, view, seen, tm, ms, { off: zOff, ok: m.delayOk, shift: m.beatShift || 0, pale: tangled ? 0.45 : 1 }, more);
    wheel(r, ctx, c, "torahn", WHEELS.torahn, st.dial.torahn, T.TURN, st.dial.torahn, tm);
    wheel(r, ctx, c, "elev", WHEELS.elev, st.dial.elev + T.ELEV_MAX, 2 * T.ELEV_MAX + 1, T.kiElev(st.dial.elev), tm);
    // le retard se lit en rahnfee (invention de fan, src/beam.js) : le pouls arrive une fraction de battement après le balancier
    divider(ctx, c, 225); // un filet gravé : au-dessus la direction, au-dessous le retard
    beatCounter(r, ctx, c, st); // les battements entiers : le chiffre nu devant les lucarnes
    wheel(r, ctx, c, "delay", DELAY, st.dial.delay, SS.DELAY_MAX + 1, { frac: BEAM.delayDigits(st.dial.delay + (st.dial.beats || 0) * SS.DELAY_TURN, SS.DELAY_UNIT) }, tm, { step: SS.STEP_DELAY, ring: DRING, hub: DHUB, side: 40, valueTip: (st.dial.beats ? t("sys.beats.plus") + " " : "") + lateWords(t, st.dial.delay) });
    if (pred) { // le repère de la prédiction : un petit anneau sur la couronne du retard, et un point près de l'interrupteur des battements
      const qa = -Math.PI / 2 + (pred.delay / (SS.DELAY_MAX + 1)) * Math.PI * 2; ctx.strokeStyle = "rgba(159,230,218,0.95)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(DELAY.x + Math.cos(qa) * (DRING + 4), DELAY.y + Math.sin(qa) * (DRING + 4), 2.6, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.arc(BEATS.x - 11, BEATS.y + (pred.beats ? 8 : -8), 2, 0, 6.283); ctx.stroke();
    }
    systemPlate(r, ctx, c, st, sys);
    if (guild) triLever(r, ctx, c, st, sys); // les balises : seulement dans l'Art de la Guilde (en mode facile, rien ne trompe)
    const rec = st.systems[sys.key], done = !!rec, off = done && (rec.line || 0) !== st.line, shown = look(r, sc1.shown, beatOf(r), fnvKey(st.key + sys.key));
    const line = holding ? t("sys.beat.hold") + " " + "·".repeat(1 + Math.min(HOLD_BEATS - 1, Math.floor((ms - st.hold.t0) / PULSE_MS))) : m.located ? (off ? t("sys.offline") : t("sys.located")) : m.beatWait ? t("sys.beats.wait") : sc1.bentLock ? t("sys.bent.hold") : withTrend(t, bandWords(t, shown.band, guild), guild ? 0 : st.trend);
    ctx.font = "italic 14px serif"; ctx.textAlign = "center"; ctx.fillStyle = m.located && !off && !holding ? "#9fe6da" : "#e9dcb8"; ctx.fillText(line, TEXT_X, 306, 500); ctx.textAlign = "left";
    const sub = holding ? t("sys.beat.hold.sub") : st.note ? t(st.note) : m.located ? (st.guild && aimedKey(st) ? t("guild.sent") : "") : shown.band >= 2 ? (sc1.beat ? t("sys.beat.cross") + " " : sc1.bend ? t("sys.bend.arc") + " " : "") + (guild ? "" : echoWords(t, sc1.echoDd)) : // Guilde : l'écho ne se commente pas, on le lit à l'oculaire et au métronome
       done ? (off ? t("sys.offline.sub") : t("sys.charted")) : "";
    if (sub) { ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(233,220,184,0.8)"; ctx.fillText(sub, TEXT_X, 323, 520); ctx.textAlign = "left"; }
  } else {
    // étape 3 : la ligne de Me'erta, un second pouls plus pâle qui glisse contre l'horloge D'ni (Art de la Guilde seulement)
    const oldSig = lines.old.hidden ? null : look(r, lines.old, beatOf(r) + 3, fnvKey(st.key + "|merta"));
    const trueSig = look(r, lines.true, beatOf(r), fnvKey(st.key)), more1 = { sources: oldSig ? [{ sig: oldSig, period: st.old.period, col: [190, 220, 205] }] : [] };
    if (guild && st.old) more1.phase = { sources: [{ key: "zero", period: 1, off: 0, s: trueSig.s }, { key: "merta", period: st.old.period, off: (fnvKey(st.key + "|merta") % 1000) / 1000, s: oldSig ? oldSig.s : 0 }], trace: r.phaseTrace || (r.phaseTrace = {}) }; // Guilde : le vrai Zéro s'empile à midi, la ligne de Me'erta marche
    if (guild) more1.lens = lensOf(st);
    eyepiece(r, ctx, c, st, trueSig, tm, ms, null, more1);
    wheel(r, ctx, c, "torahn", WHEELS.torahn, st.aim.torahn, T.TURN, st.aim.torahn, tm);
    wheel(r, ctx, c, "elev", WHEELS.elev, st.aim.elev + T.ELEV_MAX, 2 * T.ELEV_MAX + 1, T.kiElev(st.aim.elev), tm);
    // la plaque : vierge tant que le Zéro n'est pas trouvé ; ensuite ses coordonnées gravées en chiffres D'ni (élévation au sens du KI)
    plate(ctx, c, PLATE.x, PLATE.y, PLATE.w, PLATE.h);
    ctx.fillStyle = c("#2a1d13"); ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillText(t("tel.plate.title"), PLATE.x + PLATE.w / 2, PLATE.y + 15); ctx.textAlign = "left";
    if (st.found) { // la plaque grave le Zéro tel que l'instrument le tient (sur la fausse ligne, c'est elle qu'elle grave)
      const ink = c("#1b130d"), z = heldZero(st);
      engravedRow(r, ctx, [z.torahn, T.kiElev(z.elevation)], PLATE.x, PLATE.w, PLATE.y + 20, 14, ink); // la direction et la hauteur (comme au KI)
      engravedRow(r, ctx, [{ frac: BEAM.digitsOf(z.distance) }], PLATE.x, PLATE.w, PLATE.y + 38, 12, ink); // la distance du Zéro, en rahnfee de faisceau
      r.hot.push({ ...PLATE, tip: t("tel.plate.found"), tel: { setZero: true } });
    } else {
      ctx.strokeStyle = rgba(43, 29, 19, 0.35); ctx.lineWidth = 1; for (const x0 of [PLATE.x + 30, PLATE.x + 136]) { ctx.beginPath(); ctx.moveTo(x0, PLATE.y + 44); ctx.lineTo(x0 + 50, PLATE.y + 44); ctx.stroke(); }
      r.hot.push({ ...PLATE, tip: t("tel.plate.blank") });
    }
    // la ligne de mots, sous l'oculaire ; étape 3 : dans l'anneau de la ligne de Me'erta, le pouls tient mais glisse contre l'horloge
    const onOld = lines.old.found && !lines.true.found, tx = st.book ? TEXT_X : W / 2;
    const line = st.found && sig.found ? (onOld ? t("tel.found.old") : t("tel.found")) : withTrend(t, bandWords(t, sig.band, guild), guild ? 0 : st.trend); // Guilde : ce qu'on voit, rien de plus ; facile : il s'avive, il pâlit
    ctx.font = "italic 14px serif"; ctx.textAlign = "center"; ctx.fillStyle = sig.found && !onOld ? "#9fe6da" : "#e9dcb8"; ctx.fillText(line, tx, 306, 500); ctx.textAlign = "left";
    const sub = st.note ? t(st.note) : st.book && !st.found ? t("sys.needzero") : st.found && !sig.found ? t("tel.charted") : "";
    if (sub) { ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(233,220,184,0.75)"; ctx.fillText(sub, tx, 323, 520); ctx.textAlign = "left"; }
  }
  if (guild) turret(r, ctx, c, st);
  if (((r.scene && r.scene.ages) || []).length || st.book) lectern(r, ctx, c, st);
  if (st.found) mapDoor(r, ctx, c, st); // étape 3 : la carte des étoiles, au mur
  { const av = r.available ? r.available() : {}, tr = (k) => t(k); // sur le rebord de la fente : la lampe de la maison, le petit Imageur
    if (av.cabin) PS.houseLamp(r, ctx, c, 330, 286, tm, tr("relto.pass.cabin.tip"));
    if (av.imager) PS.imagerMini(r, ctx, c, 356, 286, tm, tr("relto.pass.imager.tip")); }
  if (r.touch && r.eyeZoom) eyeZoomed(r, ctx);
  // redescendre
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
  ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.fillText("︾", W / 2, BACK.y + 29); ctx.textAlign = "left";
  r.hot.push({ ...BACK, tip: t("tel.back"), go: "island" });
}

/**
 * Mode tactile : l'oculaire agrandi sur toute la gauche de la vue (le métronome et le lutrin dessous), les molettes restent à
 * droite. C'est le seul endroit où la lecture (trace, lueur, écho grossi) demande des pixels. Un toucher sur l'image la rend.
 */
const ZOOM_EYE = { x: 186, y: 151, r: 149 }; // le verre agrandi (×1,3), au-dessus de la ligne de mots
function eyeZoomed(r, ctx) {
  const cv = ctx.canvas; if (!cv || !cv.width || !cv.ownerDocument) return;
  const k = cv.width / W, R = EYE.r, sx = (EYE.x - R) * k, sy = (EYE.y - R) * k, sw = 2 * R * k, Z = ZOOM_EYE;
  const c2 = r._zoomC || (r._zoomC = cv.ownerDocument.createElement("canvas")); c2.width = Math.round(sw); c2.height = Math.round(sw);
  const g = c2.getContext("2d"); if (!g) return; g.clearRect(0, 0, c2.width, c2.height); g.drawImage(cv, sx, sy, sw, sw, 0, 0, c2.width, c2.height);
  ctx.fillStyle = "rgba(8,7,6,0.9)"; ctx.fillRect(0, 0, 372, 298);
  ctx.save(); ctx.beginPath(); ctx.arc(Z.x, Z.y, Z.r, 0, 6.283); ctx.clip(); ctx.drawImage(c2, Z.x - Z.r, Z.y - Z.r, Z.r * 2, Z.r * 2); ctx.restore();
  ctx.strokeStyle = "#b8913f"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(Z.x, Z.y, Z.r + 2, 0, 6.283); ctx.stroke();
  const t = tOf(r); r.hot.push({ x: 0, y: 0, w: 372, h: 298, tip: t("tel.eye.unzoom"), tel: { eyeZoom: true } });
}

/**
 * La plaque du système (étape 2) : vierge tant que le système de l'Âge n'est pas situé ; ensuite sa position GZCS gravée en
 * chiffres D'ni (Torahn, élévation au sens du KI, distance), calculée par l'instrument. Un clic y ramène les molettes.
 */
function systemPlate(r, ctx, c, st, sys) {
  const t = tOf(r), P = SPLATE, got = st.systems[sys.key];
  plate(ctx, c, P.x, P.y, P.w, P.h);
  ctx.fillStyle = c("#2a1d13"); ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillText(t("sys.plate.title"), P.x + P.w / 2, P.y + 14, P.w - 16); ctx.textAlign = "left";
  if (got) {
    const ink = c("#1b130d");
    engravedRow(r, ctx, [got.torahn, T.kiElev(got.elevation)], P.x, P.w, P.y + 20, 12, ink); // la direction (comme au KI)
    engravedRow(r, ctx, [{ frac: BEAM.digitsOf(got.distance) }], P.x, P.w, P.y + 36, 11, ink); // la distance, en rahnfee de faisceau
    if (got.pert && got.pert.length) { ctx.fillStyle = ink; ctx.font = "9px serif"; ctx.textAlign = "center"; ctx.fillText(got.pert.map((p) => PSYM[p.kind] || "").join(" "), P.x + P.w / 2, P.y + P.h - 5); ctx.textAlign = "left"; } // ses perturbateurs, en signes
    r.hot.push({ ...P, tip: t("sys.plate.found"), tel: { setSystem: true } });
    // un coin à gratter : effacer l'étoile (la dégraver) pour la situer à nouveau
    const kx = P.x + P.w - 14, ky = P.y + 4; ctx.strokeStyle = rgba(43, 29, 19, 0.8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(kx + 2, ky + 2); ctx.lineTo(kx + 8, ky + 8); ctx.moveTo(kx + 8, ky + 2); ctx.lineTo(kx + 2, ky + 8); ctx.stroke();
    r.hot.push({ x: kx - 2, y: ky - 2, w: 14, h: 14, tip: t("sys.unchart"), tel: { unchart: true } });
  } else {
    ctx.strokeStyle = rgba(43, 29, 19, 0.35); ctx.lineWidth = 1; for (const x0 of [P.x + 16, P.x + 64, P.x + 112]) { ctx.beginPath(); ctx.moveTo(x0, P.y + 44); ctx.lineTo(x0 + 32, P.y + 44); ctx.stroke(); }
    r.hot.push({ ...P, tip: t("sys.plate.blank") });
  }
}

/**
 * Le métronome (src/metronome.js) : un balancier de laiton au mur de gauche, qui bat le prorahn. Il touche l'une de ses
 * butées à chaque prorahn, au moment où le vrai pouls du Zéro culmine ; la butée touchée luit un instant. Mouvement réduit :
 * le balancier reste au repos, et une petite lampe de chaque côté marque le battement en cours.
 */
const METRO = { x: 30, y: 26, len: 132, w: 54, h: 176 };
function metronome(r, ctx, c, ms) {
  const t = tOf(r), { x, y, len, w, h } = METRO, reduced = !!r.opts.reducedMotion, pos = MET.beatPos(ms), n = Math.floor(pos), ph = pos - n;
  const sw = reduced ? 0 : MET.swing(ms), a = MET.AMPLITUDE * sw, hit = MET.sideOf(n), glow = Math.exp(-ph * 6);
  // le boîtier : une planche sombre cerclée de laiton, au mur
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x - w / 2 + 3, y - 10 + 4, w, h);
  ctx.fillStyle = c("#1e1610"); ctx.fillRect(x - w / 2, y - 10, w, h); ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1.2; ctx.strokeRect(x - w / 2 + 0.5, y - 9.5, w - 1, h - 1);
  // l'arc gradué et les deux butées, au bas de la course
  const by = y + len, ext = Math.sin(MET.AMPLITUDE) * len;
  ctx.strokeStyle = c("#7a5c28"); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, len - 14, Math.PI / 2 - MET.AMPLITUDE - 0.04, Math.PI / 2 + MET.AMPLITUDE + 0.04); ctx.stroke();
  for (let i = -4; i <= 4; i++) { const q = Math.PI / 2 + (i / 4) * MET.AMPLITUDE; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (len - 14), y + Math.sin(q) * (len - 14)); ctx.lineTo(x + Math.cos(q) * (len - (i % 4 ? 18 : 21)), y + Math.sin(q) * (len - (i % 4 ? 18 : 21))); ctx.stroke(); }
  for (const side of [-1, 1]) {
    const px = x + side * (ext + 9), py = by - 2, lit = side === hit ? glow : 0, marked = side === hit && MET.isMarked(n); // battement pair : la butée de droite (hit = 1) ; le coup marqué du gorahn : doré, plus large
    ctx.fillStyle = lit > 0.3 ? mix(c("#c9a24e"), marked ? "#ffe2a0" : "#bff5ea", lit) : c("#c9a24e"); ctx.beginPath(); ctx.arc(px, py, marked ? 3.4 : 2.6, 0, 6.283); ctx.fill();
    if (lit > 0.02) { const R = marked ? 20 : 12, g = ctx.createRadialGradient(px, py, 0, px, py, R); g.addColorStop(0, marked ? rgba(255, 214, 120, 0.95 * lit) : rgba(150, 230, 215, 0.9 * lit)); g.addColorStop(1, marked ? "rgba(255,214,120,0)" : "rgba(150,230,215,0)"); ctx.fillStyle = g; ctx.fillRect(px - R, py - R, R * 2, R * 2); }
  }
  // la tige et la lentille : à l'extrémité exactement quand le vrai pouls culmine
  const bx = x + Math.sin(a) * len, byy = y + Math.cos(a) * len;
  ctx.strokeStyle = c("#b8913f"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, byy); ctx.stroke();
  const lg = ctx.createRadialGradient(bx - 2.5, byy - 3, 1, bx, byy, 8.5); lg.addColorStop(0, c("#f3dca0")); lg.addColorStop(0.6, c("#b8913f")); lg.addColorStop(1, c("#5a4322"));
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(bx, byy, 8.5, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#3a2a14"); ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = c("#e0c27a"); ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#3a2a14"); ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 6.283); ctx.fill(); // le pivot
  if (reduced) { for (const side of [-1, 1]) { ctx.fillStyle = side === hit ? "rgba(150,230,215,0.9)" : "rgba(224,194,122,0.25)"; ctx.beginPath(); ctx.arc(x + side * 9, y + 14, 2.4, 0, 6.283); ctx.fill(); } } // la lampe du battement
  r.hot.push({ x: x - w / 2, y: y - 10, w, h: h - 34, tip: t("tel.metronome") }); // pas sur le bas : le lutrin et ses flèches gardent leurs zones
}

/** Les signes des perturbateurs (plaque, carte) : pulsar, étoile à neutrons, trou noir. */
const PSYM = { pulsar: "✶", neutron_star: "✦", black_hole: "◉" };
const TRI = { x: 474, y: 139, w: 50, h: 14 }; // entre les deux grandes molettes
/**
 * Le levier de triangulation (étape 3) : seulement pour un système perturbé. Tiré, l'instrument interroge les étoiles situées
 * voisines (au moins deux, gravées sur la même ligne) : si elles s'accordent, la déviation et le faux pouls s'effacent.
 */
/** Un filet de laiton gravé en travers du panneau, avec un rivet à chaque bout. */
function divider(ctx, c, y) {
  const x0 = 396, x1 = 602;
  ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + 0.5); ctx.lineTo(x1, y + 0.5); ctx.stroke(); // le sillon
  ctx.strokeStyle = c("#8a6a2e"); ctx.beginPath(); ctx.moveTo(x0, y + 1.5); ctx.lineTo(x1, y + 1.5); ctx.stroke(); // son bord éclairé
  ctx.fillStyle = c("#a8843c"); for (const x of [x0 - 4, x1 + 4]) { ctx.beginPath(); ctx.arc(x, y + 1, 1.8, 0, 6.283); ctx.fill(); }
}
/** Un chiffre D'ni gravé, minuscule : 0 (un point dans le carré) ou 1 (un trait). */
function dniTiny(ctx, x, y, n, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.strokeRect(x - 2.5, y - 2.5, 5, 5);
  ctx.fillStyle = col; if (n) ctx.fillRect(x - 0.4, y - 2.5, 0.8, 5); else { ctx.beginPath(); ctx.arc(x, y, 0.8, 0, 6.283); ctx.fill(); }
}
/**
 * Le battement entier, juste après les fenêtres du retard : un interrupteur à levier sur sa platine (0 en haut, 1 en bas).
 * Un clic le bascule ; levé : le pouls arrive dans ce battement ; baissé : un battement entier plus tard.
 */
const BEATS = { x: 552, y: 254 };
function beatCounter(r, ctx, c, st) {
  const t = tOf(r), { x, y } = BEATS, n = Math.min(1, st.dial.beats || 0), dark = c("#7a5c28"), lit = "#ffe2a0";
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(x - 6, y - 14, 12, 28); ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; ctx.strokeRect(x - 5.5, y - 13.5, 11, 27); // la platine
  ctx.fillStyle = "#05080a"; ctx.fillRect(x - 1.5, y - 6, 3, 12); // la fente
  const ty = n ? y + 9 : y - 9; ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, ty); ctx.stroke(); // le levier
  ctx.fillStyle = c("#e0c27a"); ctx.beginPath(); ctx.arc(x, ty, 2.6, 0, 6.283); ctx.fill(); // son pommeau
  dniTiny(ctx, x + 11, y - 8, 0, n ? dark : lit); dniTiny(ctx, x + 11, y + 8, 1, n ? lit : dark); // 0 et 1, gravés à côté ; celui du levier s'éclaire
  r.hot.push({ x: x - 8, y: y - 16, w: 26, h: 32, tip: t("sys.beats.tip", { n: String(n) }), tel: { axis: "beats", delta: 1 } });
}

function triLever(r, ctx, c, st, sys) {
  if (!sys.perturbed) return;
  const t = tOf(r), on = st.triFor === sys.key, b = SS.beacons(sys, st.systems, st.line), { x, y, w, h } = TRI;
  ctx.fillStyle = c("#2a1d13"); ctx.fillRect(x, y, w, h); ctx.strokeStyle = c("#8a6a2e"); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const kx = on ? x + w - 9 : x + 9; ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(kx, y + h / 2, 4.2, 0, 6.283); ctx.fill(); // le pommeau
  for (let i = 0; i < Math.min(3, b.list.length); i++) { ctx.fillStyle = on ? "#9fe6da" : b.agree || i >= 2 ? "rgba(224,194,122,0.85)" : "rgba(224,194,122,0.85)"; ctx.beginPath(); ctx.arc(x + 22 + i * 7, y + h / 2, 1.8, 0, 6.283); ctx.fill(); } // une petite lampe par balise
  ctx.font = "italic 10px serif"; ctx.fillStyle = "#e0c27a"; ctx.textAlign = "center"; ctx.fillText(t("sys.tri.name"), x + w / 2, y - 3); ctx.textAlign = "left";
  r.hot.push({ x: x - 2, y: y - 14, w: w + 4, h: h + 16, tip: on ? t("sys.tri.on") : t("sys.tri.tip"), tel: { triangulate: true } });
}
/** Au mur de l'observatoire, à droite : un rouleau de parchemin (la carte des étoiles) ; un clic l'ouvre. */
function mapDoor(r, ctx, c, st) {
  const t = tOf(r), x = 600, y = 6, n = Object.keys(st.systems || {}).length; // en haut à droite, au-dessus du panneau
  ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(x - 18, y, 36, 22); ctx.fillStyle = c("#8a6a2e"); ctx.fillRect(x - 21, y - 2, 42, 4); ctx.fillRect(x - 21, y + 21, 42, 4);
  ctx.strokeStyle = c("#7a5c28"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(x, y + 11, 6, 0, 6.283); ctx.stroke();
  ctx.fillStyle = c("#3b2a1b"); for (let i = 0; i < Math.min(5, n); i++) { const a = i * 1.3; ctx.fillRect(x + Math.cos(a) * 9 - 0.8, y + 11 + Math.sin(a) * 6 - 0.8, 1.6, 1.6); }
  ctx.fillStyle = c("#3b2a1b"); ctx.beginPath(); ctx.arc(x, y + 11, 1.4, 0, 6.283); ctx.fill();
  r.hot.push({ x: x - 24, y: y - 6, w: 48, h: 34, tip: t("map.door"), tel: { go: "starmap" } });
}

/**
 * Sur l'île : un petit observatoire au sommet du mont (`lay.mount`) : un tambour de pierre, une coupole de cuivre vert-de-gris
 * fendue, d'où dépasse le tube. Une fenêtre s'allume le soir. Un clic mène à sa vue. Une fois le Zéro trouvé, une petite lueur
 * bat au bout du tube, au rythme du prorahn.
 */
function drawOnIsland(r, ctx, sky, tm) {
  const { x: mx, h } = r.lay.mount, amb = 0.4 + 0.6 * sky.ambient, c = (col) => mix("#05060c", col, amb), bx = r.lay.mount.tx != null ? r.lay.mount.tx : mx - 6, by = r.lay.mount.ty != null ? r.lay.mount.ty + 0.5 : GY - h + 5; // posé sur la terrasse taillée par drawMount
  const night = sky.night == null ? 0 : sky.night, found = state(r).found;
  ctx.save(); ctx.translate(bx, by); ctx.scale(1.3, 1.3); ctx.translate(-bx, -by); // à l'échelle de la cabane
  // (le sommet est aplani en terrasse par le dessin du mont : drawMount(…, terrace))
  const castleD = !!(r.castleOn && r.castleOn()); // le Château : pas de tambour posé dessus, la tour se prolonge jusqu'à la coupole de plomb
  const DR = castleD ? 11.5 : 9.5; // le rayon de la coupole : sous le Château, toute la largeur de la tour
  if (castleD) { const L = require("./relto-castle-out").litStone(sky), sc2 = (h) => c(L(h)), sg = ctx.createLinearGradient(bx - DR, 0, bx + DR, 0); sg.addColorStop(0, sc2("#878090")); sg.addColorStop(0.6, sc2("#5e5866")); sg.addColorStop(1, sc2("#3a3542")); ctx.fillStyle = sg; ctx.fillRect(bx - DR, by - 8, DR * 2, 10);
    ctx.fillStyle = rgba(0, 0, 0, 0.22); for (const y of [by - 4.6, by - 1.2]) ctx.fillRect(bx - DR, y, DR * 2, 0.5);
    ctx.fillStyle = require("./relto-castle-out").winColor(night, 1); ctx.beginPath(); ctx.moveTo(bx + 3, by - 1); ctx.lineTo(bx + 3, by - 5); ctx.quadraticCurveTo(bx + 4.2, by - 6.6, bx + 5.4, by - 5); ctx.lineTo(bx + 5.4, by - 1); ctx.closePath(); ctx.fill(); // une lancette
    ctx.fillStyle = sc2("#a29dab"); ctx.fillRect(bx - DR - 1, by - 9, DR * 2 + 2, 1.4); // la corniche où naît la coupole
  } else {
  // le tambour de pierre
  const sg = ctx.createLinearGradient(bx - 9, 0, bx + 9, 0); sg.addColorStop(0, c("#8d8578")); sg.addColorStop(1, c("#4f4a43")); ctx.fillStyle = sg; ctx.fillRect(bx - 9, by - 8, 18, 8);
  ctx.strokeStyle = c("#3a352f"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(bx - 9, by - 4); ctx.lineTo(bx + 9, by - 4); ctx.stroke();
  ctx.fillStyle = c("#2a2018"); ctx.fillRect(bx - 1.6, by - 5, 3.2, 5); // la porte
  if (night > 0.3) { ctx.fillStyle = rgba(255, 196, 120, 0.5 + 0.4 * night); ctx.fillRect(bx + 4, by - 6.5, 2, 2); } // une fenêtre éclairée le soir
  }
  // la coupole et sa fente (le Château : une coupole de plomb, des nervures d'or)
  const dg = castleD ? ctx.createLinearGradient(bx - DR, by - 8 - DR, bx + DR, by - 8) : ctx.createLinearGradient(bx - 9, by - 18, bx + 9, by - 8); dg.addColorStop(0, c(castleD ? "#6a6e88" : "#9fc3b0")); dg.addColorStop(1, c(castleD ? "#2e3046" : "#4d6f61")); ctx.fillStyle = dg;
  const AH = DR * 1.75; // le Château : une coupole en arc brisé, plus haute que large, comme une flèche renflée
  if (castleD) { ctx.beginPath(); ctx.moveTo(bx - DR, by - 8); ctx.bezierCurveTo(bx - DR, by - 8 - AH * 0.55, bx - DR * 0.35, by - 8 - AH * 0.8, bx, by - 8 - AH); ctx.bezierCurveTo(bx + DR * 0.35, by - 8 - AH * 0.8, bx + DR, by - 8 - AH * 0.55, bx + DR, by - 8); ctx.closePath(); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(bx - DR, by - 8); ctx.arc(bx, by - 8, DR, Math.PI, 0); ctx.closePath(); ctx.fill(); }
  if (castleD) { ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.5; for (const k of [-0.62, 0, 0.62]) { ctx.beginPath(); ctx.moveTo(bx, by - 8 - AH); ctx.bezierCurveTo(bx + k * DR * 0.4, by - 8 - AH * 0.75, bx + k * DR, by - 8 - AH * 0.5, bx + k * DR, by - 8); ctx.stroke(); }
    ctx.fillStyle = c("#1c1a26"); for (let i = 1; i < 4; i++) { const u = i / 4, y = by - 8 - AH * (0.2 + 0.6 * u), w = DR * (1 - u * 0.85); ctx.fillRect(bx - w - 1.1, y, 1.1, 0.9); ctx.fillRect(bx + w, y, 1.1, 0.9); } // des crochets sur les arêtes
    ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(bx, by - 8 - AH); ctx.lineTo(bx, by - 8 - AH - 4); ctx.moveTo(bx - 1.6, by - 8 - AH - 2.6); ctx.lineTo(bx + 1.6, by - 8 - AH - 2.6); ctx.stroke(); } // la croix de faîte
  if (r.glassOn && r.glassOn()) { ctx.strokeStyle = c(VR.COPPER_HI); ctx.lineWidth = 0.5; for (const k of [-0.6, 0.6]) { ctx.beginPath(); ctx.moveTo(bx, by - 17.5); ctx.quadraticCurveTo(bx + k * 8, by - 15, bx + k * 9.2, by - 8); ctx.stroke(); } ctx.beginPath(); ctx.ellipse(bx, by - 8, 6.6, 4.4, 0, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.fillStyle = c(VR.COPPER); ctx.fillRect(bx - 10, by - 8.6, 20, 1.2); } // la Verrière : nervures et bague de cuivre
  ctx.save(); ctx.translate(bx, by - 8); ctx.rotate(0.35); ctx.fillStyle = c("#1a1714"); ctx.fillRect(-1.6, -9.6, 3.2, 9); ctx.restore();
  // le tube qui sort de la fente
  const TL0 = castleD ? 12 : 7.5, TE = TL0 + 1; // le Château : une lunette plus longue, de laiton clair, bagues d'or et pare-buée, qui sort haut de la coupole en arc brisé
  ctx.save(); if (castleD) { ctx.translate(bx + 1.5, by - 17); ctx.rotate(-1.05); } else { ctx.translate(bx + 1, by - 12); ctx.rotate(-1.22); } const g = ctx.createLinearGradient(0, -1.6, 0, 1.6); g.addColorStop(0, c(castleD ? "#f6dc94" : "#e8c97a")); g.addColorStop(1, c(castleD ? "#9a7432" : "#7a5c28")); ctx.fillStyle = g;
  if (castleD) { ctx.fillRect(-2, -1.1, TL0 + 2, 2.2); ctx.fillRect(TL0 - 2.6, -1.6, 3.4, 3.2); ctx.fillStyle = c("#ffe9a8"); for (const x of [1.5, 5, 8.5]) ctx.fillRect(x, -1.3, 0.7, 2.6); ctx.fillStyle = rgba(255, 255, 240, 0.5); ctx.fillRect(-2, -1.1, TL0 + 2, 0.5); ctx.fillStyle = c("#2a2a3a"); ctx.beginPath(); ctx.ellipse(TL0 + 0.8, 0, 0.5, 1.5, 0, 0, 6.283); ctx.fill(); } // le fût, le pare-buée, trois bagues, l'objectif
  else ctx.fillRect(0, -1.2, 7.5, 2.4);
  if (found) { const beat = frac((now(r) - DT.REF) / PULSE_MS), a = 0.35 + 0.5 * Math.exp(-beat * 4) * (0.5 + 0.5 * (sky.night == null ? 0.5 : sky.night)); const gl = ctx.createRadialGradient(TE, 0, 0, TE, 0, 5); gl.addColorStop(0, rgba(160, 235, 220, a)); gl.addColorStop(1, "rgba(160,235,220,0)"); ctx.fillStyle = gl; ctx.fillRect(TE - 5, -5, 10, 10); }
  ctx.restore();
  ctx.restore();
  const t = tOf(r); r.hot.push({ x: bx - 16, y: by - 34, w: 32, h: 36, tip: found ? t("tel.island.found") : t("tel.island"), go: "telescope" });
  void tm;
}

/** L'étoile que tient le télescope du Relto courant (mode Guilde) : l'état ouvert s'il existe, sinon l'état gardé. */
function aimedOf(r) {
  const sc = r.scene || {}, key = T.keyOf(sc.name, sc.seed);
  if (r.telescope && r.telescope.key === key) return r.telescope.guild ? aimedKey(r.telescope) : null;
  return GI.aimedOf(r.opts && r.opts.telescopeGet ? r.opts.telescopeGet(key) : null);
}

module.exports = { coarseBand, drawTelescopeRoom, drawOnIsland, state, act, systemsOf, aimedOf, aimedKey, bookLoad, EYE, WHEELS, PLATE, SPLATE, DELAY, LECTERN, FIELD, PULSE_MS };
