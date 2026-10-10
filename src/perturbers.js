"use strict";
/**
 * Télescope, étape 3 : les PERTURBATEURS (pulsar, étoile à neutrons, trou noir).
 *
 * Règle de l'utilisateur : un perturbateur EXISTE dans une région de l'espace, qu'on l'écrive ou non. Il est tiré de la
 * région elle-même (une grille de cases GZCS de `CELL` shahfeetee de côté ; chaque case a une petite chance d'en abriter un,
 * à une place tirée de la case) : deux étoiles voisines peuvent donc partager le même. Écrire `pulsar` dans un Âge ne crée
 * rien : le livre DÉCRIT un monde près d'un pulsar. Si l'étoile de l'Âge en a déjà un près d'elle, rien ne bouge ; sinon
 * le livre décrit une autre étoile, la première (dans un ordre tiré de la clé d'étoile) qui en a un (`placeFor`) : réécrire
 * déplace le monde, comme changer de soleil. Un perturbateur écrit ne contredit donc jamais le ciel.
 *
 * Effets, à l'échelle des étoiles (télescope) :
 *   - pulsar, étoile à neutrons : de FAUX POULS, à leur propre période, se mêlent à celui du Zéro (le pulsar bat plus vite,
 *     l'étoile à neutrons plus lentement) ; l'arpenteur de l'Âge s'y trompe et note un retard faux (`delayErr`, en crans) ;
 *   - trou noir : la lumière du Zéro est COURBÉE ; sa direction vue de l'Âge est fausse d'un angle (`deflect` : torantee et
 *     shahfeetee) ; dans l'oculaire, l'image brillante est déviée, le vrai point reste pâle au bout d'un arc.
 * Un système perturbé se situe tout de même : en cherchant le vrai point pâle, ou par TRIANGULATION depuis les étoiles déjà
 * situées (balises, src/starsystem.js) qui annule déviation et faux pouls.
 *
 * Module pur (sans DOM ni Obsidian) : testé dans test/perturbers.test.js.
 */
const { rng, fnv } = require("./util");

const KINDS = ["pulsar", "neutron_star", "black_hole"];
const CELL = 3000;          // côté d'une case de la grille des régions, en shahfeetee
const CHANCE = 0.25;        // chance qu'une case abrite un perturbateur (environ une étoile sur dix en ressent un)
const SHARE = [["pulsar", 0.45], ["neutron_star", 0.4], ["black_hole", 0.15]];
const REACH = { pulsar: 1900, neutron_star: 1600, black_hole: 2000 }; // portée de l'influence, en shahfeetee
const PERIOD = { pulsar: [0.25, 0.7], neutron_star: [1.6, 3.2] };      // période des faux pouls, en prorahn (le Zéro : 1)
const DEFLECT = { torahn: [900, 4000], elev: [3, 12] };               // déviation du trou noir (au bord de la portée → au plus près)
const DELAY_ERR = [6, 30];                                            // retard mal lu à cause d'un faux pouls, en crans
const ELEV = 90;
/**
 * Le CŒUR CALME : aucune influence de perturbateur à moins de 2 000 shahfeetee du Great Zero (les D'ni ne l'ont pas posé près d'un
 * trou noir). Les étoiles proches, les plus nombreuses, se situent directement : le premier Âge reste mesurable.
 */
const QUIET = 2000;
const TURN = 62500, TAU = Math.PI * 2;
const mod = (v, m) => ((v % m) + m) % m;

function cart(p) { const a = (TAU * p.torahn) / TURN, d = p.distance || 0; return { x: d * Math.sin(a), y: d * Math.cos(a), z: p.elevation || 0 }; }

const COMPANION = 0.25; // une case qui en abrite un a cette chance d'en abriter un second, d'un autre genre (un couple de restes d'étoiles)
const pickKind = (u, not) => { const sh = SHARE.filter(([k]) => k !== not), tot = sh.reduce((a, [, w]) => a + w, 0); let v = u * tot; for (const [k, w] of sh) { if (v < w) return k; v -= w; } return sh[sh.length - 1][0]; };
/**
 * Les perturbateurs d'une case (cx, cy) : aucun, un, parfois deux (un couple). Tirés de la case seule : rien d'écrit n'y
 * change rien. Chacun : { id, kind, x, y, z (GZCS cartésien, shahfeetee), reach, period (faux pouls, en prorahn) }.
 */
function cellBodies(cx, cy) {
  const r = rng((fnv(`perturbateur|${cx}|${cy}`) ^ 0x9e3779b1) >>> 0); r();
  if (r() >= CHANCE) return [];
  const out = [], body = (kind, i) => { const x = (cx + r()) * CELL, y = (cy + r()) * CELL, z = Math.round((r() * 2 - 1) * ELEV), p = PERIOD[kind]; return { id: `${cx},${cy}${i ? "b" : ""}`, kind, x: Math.round(x), y: Math.round(y), z, reach: REACH[kind], period: p ? Math.round((p[0] + r() * (p[1] - p[0])) * 100) / 100 : null }; };
  const k1 = pickKind(r()); out.push(body(k1, 0));
  if (r() < COMPANION) out.push(body(pickKind(r(), k1), 1));
  return out.filter((p) => Math.hypot(p.x, p.y) - p.reach >= QUIET); // le cœur calme : aucune influence près du Great Zero
}
/** Le premier perturbateur d'une case, ou null (commodité). */
function inCell(cx, cy) { return cellBodies(cx, cy)[0] || null; }

/** Les perturbateurs dont la portée atteint la position GZCS `pos` (les plus proches d'abord), avec leur distance `d` et leur force `k` (0 au bord, 1 au centre). */
function near(pos) {
  const c = cart(pos), cx = Math.floor(c.x / CELL), cy = Math.floor(c.y / CELL), out = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of cellBodies(cx + i, cy + j)) {
    const d = Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z);
    if (d <= p.reach) out.push({ ...p, d: Math.round(d), k: Math.round((1 - d / p.reach) * 1000) / 1000 });
  }
  return out.sort((a, b) => a.d - b.d);
}

const kindsNear = (pos) => new Set(near(pos).map((p) => p.kind));

/**
 * Où est l'étoile d'un livre qui ÉCRIT des perturbateurs (`kinds`) : la position de sa clé si elle en a déjà (rien ne
 * bouge : l'écriture décrit), sinon la première position candidate, tirée de la clé, près de laquelle ils sont tous.
 * `posOf(salt)` rend la position candidate (salt 0 = la position d'origine). Renvoie { pos, moved, tries }.
 */
function placeFor(posOf, kinds, salt = "") {
  const want = [...new Set((kinds || []).filter((k) => KINDS.includes(k)))];
  const p0 = posOf(0); if (!want.length) return { pos: p0, moved: false, tries: 0 };
  const okAt = (p) => { const have = kindsNear(p); return want.every((k) => have.has(k)); };
  if (okAt(p0)) return { pos: p0, moved: false, tries: 0 };
  for (let i = 1; i < 400; i++) { const p = posOf(i); if (okAt(p)) return { pos: p, moved: true, tries: i }; } // d'abord, d'autres étoiles tirées de la clé
  // sinon (plusieurs genres à la fois : rare), on cherche autour des perturbateurs eux-mêmes, case par case depuis une case tirée de la clé
  const r = rng((fnv("cherche|" + salt) ^ 0x7a11) >>> 0), c0 = { x: Math.floor((r() * 2 - 1) * 4), y: Math.floor((r() * 2 - 1) * 4) }, offs = Array.from({ length: 40 }, () => [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]);
  for (let ring = 0, n = 400; ring <= 30; ring++) for (let i = -ring; i <= ring; i++) for (let j = -ring; j <= ring; j++) {
    if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
    const p = cellBodies(c0.x + i, c0.y + j).find((b) => b.kind === want[0]); if (!p) continue;
    for (const [ox, oy, oz] of offs) {
      n++; const x = p.x + ox * p.reach * 0.75, y = p.y + oy * p.reach * 0.75, z = Math.max(-100, Math.min(100, Math.round(p.z + oz * 40))), d = Math.round(Math.hypot(x, y));
      if (d < 200 || d > 15000) continue; // dans les bornes des étoiles (SS.SYS_DIST)
      const pos = { torahn: mod(Math.round((Math.atan2(x, y) / TAU) * TURN), TURN), distance: d, elevation: z || 0 };
      if (okAt(pos)) return { pos, moved: true, tries: n };
    }
  }
  return { pos: p0, moved: false, tries: -1 }; // jamais atteint en pratique (testé) : le livre reste où il est
}

/**
 * Les effets des perturbateurs `list` (near()) sur ce qu'on perçoit du Zéro depuis le système `salt` (sa clé) :
 * `deflect` (trou noir : { dt, de, by }) et `beat` (pulsar ou étoile à neutrons, le plus proche : { kind, period, delayErr, by }).
 * Déterministe. `delay` : le vrai retard (le retard faux reste dans les butées de la molette, à au moins 6 crans du vrai).
 */
function effects(list, salt, delay = 100, delayMax = 624) {
  const out = { kinds: [...new Set((list || []).map((p) => p.kind))], deflect: null, beat: null };
  const bh = (list || []).find((p) => p.kind === "black_hole");
  if (bh) {
    const r = rng((fnv(`courbure|${salt}|${bh.id}`) ^ 0x51ced) >>> 0); r();
    const k = Math.max(0, Math.min(1, bh.k)), dt = Math.round(DEFLECT.torahn[0] + k * (DEFLECT.torahn[1] - DEFLECT.torahn[0])), de = Math.round(DEFLECT.elev[0] + k * (DEFLECT.elev[1] - DEFLECT.elev[0]));
    out.deflect = { dt: r() < 0.5 ? -dt : dt, de: r() < 0.5 ? -de : de, by: bh.id };
  }
  const ps = (list || []).find((p) => p.kind === "pulsar" || p.kind === "neutron_star");
  if (ps) {
    const r = rng((fnv(`faux-pouls|${salt}|${ps.id}`) ^ 0xbea7) >>> 0); r();
    const k = Math.max(0, Math.min(1, ps.k)), mag = Math.round(DELAY_ERR[0] + k * (DELAY_ERR[1] - DELAY_ERR[0]));
    let err = r() < 0.5 ? -mag : mag; if (delay + err < 0 || delay + err > delayMax) err = -err;
    out.beat = { kind: ps.kind, period: ps.period, delayErr: err, by: ps.id };
  }
  return out;
}

/** Combien de faux battements pour 25 prorahn (la valeur des notes « complètes », en chiffres D'ni). */
function beatsPer25(period) { return period > 0 ? Math.round(25 / period) : 0; }

/** La position GZCS (cylindre) d'un perturbateur, comme une étoile située. */
function cylOf(p) { return { torahn: mod(Math.round((Math.atan2(p.x, p.y) / TAU) * TURN), TURN), distance: Math.round(Math.hypot(p.x, p.y)), elevation: p.z || 0 }; }

module.exports = { KINDS, CELL, CHANCE, SHARE, REACH, PERIOD, DEFLECT, DELAY_ERR, QUIET, COMPANION, cellBodies, inCell, near, kindsNear, placeFor, effects, beatsPer25, cylOf };
