"use strict";
/**
 * L'Imageur en mode « L'Art de la Guilde » (réglage `instrumentsMode` = "guild") : modèle pur, sans DOM ni Obsidian.
 *
 * L'appareil ne contient qu'UN LIVRE VIERGE : on ne choisit pas l'Âge, on le TROUVE par les réglages.
 *   - le télescope donne la cible : visant l'étoile d'un système situé, il renvoie sa lumière (`lightOf`) ; les candidats
 *     sont alors les Âges de cette étoile ; sans cible, tous les Âges de l'étagère (à l'aveugle) ;
 *   - station I : le râtelier offre les glyphes CONNUS (`rackOf` : ceux des Âges de l'étagère, comme le livre des glyphes),
 *     quatre logements ; quatre cristaux, dans n'importe quel ordre = les pages d'un monde (écrites, puis tirées). Juste (`exact`) : la planète est
 *     verrouillée et la station III s'éveille ;
 *   - stations II et III : comme en mode facile, contre le monde trouvé ; plusieurs Âges d'une même étoile (même lumière,
 *     mêmes premières pages) : l'atmosphère départage (`choose`).
 * Un réglage qui ne correspond exactement à aucun Âge écrit tombe parfois sur un monde que personne n'a écrit (`unwritten`,
 * src/unwritten.js) : seulement à l'aveugle (aucune étoile tenue au télescope), quatre cristaux posés ; sinon la fenêtre
 * reste noire. Un Âge écrit dont les cristaux sont justes l'emporte toujours.
 * L'état gardé (`normalize`, `saved`) est à part de celui du mode facile (par Relto) : quatre logements (identifiants de
 * glyphes ou vides) et les noms dont le livre se souvient. Testé dans test/imager-guild.test.js.
 */
const I = require("./imager");
const { fnv } = require("./util");

const SLOTS = 4, RACK = 8; // quatre logements ; huit chevilles par rangée du râtelier (au-delà : des rangées, ‹ ›)
const EXTRA = 0.25;        // un cristal de trop (au-delà des pages du monde) brouille d'autant

const isId = (v) => typeof v === "string" && /^[a-z0-9_]+$/i.test(v);

/** Les logements : quatre identifiants de glyphe ou null ; un cristal n'est qu'à un endroit. */
function normCry(c) {
  const src = Array.isArray(c) ? c : [], out = [];
  for (let i = 0; i < SLOTS; i++) { const v = isId(src[i]) ? src[i] : null; out.push(v && !out.includes(v) ? v : null); }
  return out;
}
/** L'état propre au mode Guilde : `cry` (les logements), `seen` (les mondes dont le livre se souvient), `page` (la rangée). */
function normalize(g) {
  const o = g && typeof g === "object" ? g : {};
  const seen = [...new Set((Array.isArray(o.seen) ? o.seen : []).filter((x) => typeof x === "string" && x))].sort();
  return { cry: normCry(o.gcry || o.cry), seen, page: Math.max(0, Math.floor(+o.page) || 0), lockOn: o.lock && typeof o.lockOn === "string" ? o.lockOn : null,
    syncFor: typeof o.syncFor === "string" ? o.syncFor : null };
}
/** Ce qu'on garde : le réglage commun (src/imager.js) plus les logements, la mémoire du livre et le monde que tient le verrou. */
function saved(settings, g) { return { ...settings, gcry: g.cry.slice(), seen: g.seen.slice(), ...(settings.lock && g.lockOn ? { lockOn: g.lockOn } : {}), ...(g.syncFor ? { syncFor: g.syncFor } : {}) }; }

/**
 * Le râtelier : les glyphes connus, ceux qu'écrivent les Âges de l'étagère (`ages[].glyphs`, comme le livre des glyphes),
 * plus les pages des cristaux des candidats chargés (un Âge sans page écrite résonne sur ses premières pages tirées).
 * Ordre alphabétique : le râtelier ne dit rien de plus que le livre.
 */
function rackOf(ages, cands = []) {
  const ids = new Set();
  for (const a of ages || []) for (const id of a.glyphs || []) if (isId(id)) ids.add(id);
  for (const c of cands || []) for (const id of crystalIds(c)) if (isId(id)) ids.add(id);
  return [...ids].sort((a, b) => a.replace(/_/g, " ").localeCompare(b.replace(/_/g, " ")));
}
const pages = (rack) => Math.max(1, Math.ceil(rack.length / RACK));
/** Les cristaux d'une rangée `page` du râtelier. */
function rackPage(rack, page) { const p = Math.min(Math.max(0, page), pages(rack) - 1); return rack.slice(p * RACK, p * RACK + RACK); }

const crystalIds = (c) => (c && c.data && c.data.target && c.data.target.crystals ? c.data.target.crystals.ids : []);
const starOf = (c) => (c && c.data && c.data.system ? c.data.system.key : null);

/** Les cristaux justes pour un monde : exactement ses pages, dans n'importe quel ordre (un ensemble), et rien de plus. */
function exact(cry, ids) { const on = (cry || []).filter(Boolean); return !!ids.length && on.length === ids.length && ids.every((id) => on.includes(id)); }
/** Justesse des cristaux (0 à 1) : chaque page du monde posée compte, l'ordre non ; un cristal faux brouille d'autant. */
function score(cry, ids) {
  if (!ids.length) return 0;
  const on = (cry || []).filter(Boolean), ok = ids.filter((id) => on.includes(id)).length, wrong = on.filter((x) => !ids.includes(x)).length;
  return Math.max(0, ok / ids.length - EXTRA * wrong);
}
/** Par logement : juste (`ok`) si la page est du monde (l'ordre ne compte plus) ; `half` n'existe plus (toujours faux). */
function slotsOf(cry, ids) { return cry.map((id) => ({ id, ok: !!id && ids.includes(id), half: false })); }

/**
 * Le monde que les réglages approchent. `cands` : [{ age, data: { target, system, … } }] (chargés) ; `star` : la clé
 * d'étoile visée au télescope, ou null (à l'aveugle : tous les Âges). Le meilleur : d'abord les cristaux justes, puis la
 * justesse des cristaux, puis l'atmosphère (deux mondes d'une même étoile aux mêmes premières pages), puis le nom.
 * Renvoie { world, planet (cristaux justes), score } ; world null : aucun cristal ne résonne (fenêtre noire).
 */
function choose(cands, cry, settings, now = Date.now(), star = null, finder = null) {
  const pool = (cands || []).filter((c) => c && c.data && c.data.target && (!star || starOf(c) === star));
  let best = null;
  for (const c of pool) {
    const ids = crystalIds(c), sc = score(cry, ids); if (sc <= 0) continue;
    const ex = exact(cry, ids), atmo = I.sharpness(I.effective(settings, c.data.target, now), c.data.target, now), name = String(c.age && c.age.name);
    const k = { c, ex, sc, atmo, name };
    if (!best || ex > best.ex || (ex === best.ex && (sc > best.sc + 1e-9 || (Math.abs(sc - best.sc) < 1e-9 && (atmo > best.atmo + 1e-9 || (Math.abs(atmo - best.atmo) < 1e-9 && name < best.name)))))) best = k;
  }
  if (best && best.ex) return { world: best.c, planet: true, score: best.sc }; // un Âge écrit, cristaux justes : il l'emporte toujours
  const u = unwritten(cry, star, settings, finder);
  if (u) return { world: u, planet: true, score: 1, unwritten: true }; // ses premières pages sont ces cristaux : la planète est tenue
  if (!best) return { world: null, planet: false, score: 0 };
  return { world: best.c, planet: false, score: best.sc };
}

/** Les quatre logements sont-ils garnis ? (le régulateur cherche alors, même sans monde tenu) */
const full = (cry) => Array.isArray(cry) && cry.length >= SLOTS && cry.slice(0, SLOTS).every((x) => isId(x));

/**
 * Un monde jamais écrit que ces réglages font apparaître (dans le lore, l'Art relie des mondes qui existent déjà) : à
 * l'aveugle seulement (`star` null : le télescope ne tient aucune étoile, la lumière vient des lentilles), quatre cristaux
 * posés. `finder(cry, settings)` (src/unwritten.js, `find`, avec le moteur ; mis en cache par le rendu) renvoie un candidat
 * comme ceux de l'étagère, ou null. Sans `finder` : null.
 */
function unwritten(cry, star, settings, finder) { return !star && full(cry) && typeof finder === "function" ? finder(cry.slice(0, SLOTS), settings) || null : null; }

/** La lumière que le télescope renvoie : celle de l'étoile visée (le premier de ses Âges, par nom), ou null. */
function lightOf(cands, star) {
  if (!star) return null;
  const list = (cands || []).filter((c) => c && c.data && c.data.target && c.data.target.lens && starOf(c) === star).sort((a, b) => String(a.age.name).localeCompare(String(b.age.name)));
  return list.length ? list[0].data.target.lens : null;
}

/** La cible à régler (stations II et III) : celle du monde, avec la justesse des cristaux de ce mode (src/imager.js, `cryScore`). */
function targetOf(world, cry) { return world && world.data && world.data.target ? { ...world.data.target, cryScore: score(cry, crystalIds(world)) } : null; }

/**
 * Le râtelier, d'un clic (comme `place` du mode facile, mais avec des glyphes) : `target` = { slot } | { rack: id } ;
 * logements pleins : rien ne bouge (`full`). `hand` reste null (gardé pour la signature).
 */
function place(cry0, hand, target) {
  // d'un clic : un glyphe du râtelier va dans le premier logement libre (déjà posé : il revient) ; un logement cliqué se vide
  const cry = normCry(cry0); if (!target) return { cry, hand: null };
  if (target.slot != null) { cry[target.slot] = null; return { cry, hand: null }; }
  if (target.rack != null) {
    const at = cry.indexOf(target.rack); if (at >= 0) { cry[at] = null; return { cry, hand: null }; }
    const free = cry.indexOf(null); if (free < 0) return { cry, hand: null, full: true };
    cry[free] = target.rack; return { cry, hand: null };
  }
  return { cry, hand: null };
}

// ---- l'accord des cristaux ---------------------------------------------------------------------------------------
/**
 * Chaque cristal a sa note (d'après son glyphe : une pentatonique sur deux octaves à partir du la 220) ; quatre posés
 * sonnent ensemble. `beatOf` : 0 quand le monde est tenu (l'accord est posé), sinon d'autant plus de battement que les
 * cristaux sont loin du monde le plus proche (sa justesse `cryScore`). On ne dit pas lequel est faux : l'oreille compare
 * avec l'accord que note l'arpenteur (le ♪ de l'onglet Détails).
 */
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
function noteOf(id) { return 220 * Math.pow(2, PENTA[fnv(String(id)) % PENTA.length] / 12); }
function chordOf(ids) { return [...new Set((ids || []).filter(isId))].map(noteOf).sort((a, b) => a - b); }
function beatOf(planet, target) { return planet ? 0 : Math.max(0.25, 1 - ((target && target.cryScore) || 0)); }

// ---- le lien avec le télescope ------------------------------------------------------------------------------------
/**
 * L'étoile que le télescope tient, telle qu'il la garde (`tel` = ext.telescope[relto]) : `aimedAt`, si le Zéro est trouvé
 * et l'étoile encore gravée. Le télescope l'écrit (src/relto-telescope.js, `aimedKey`) : un livre sur son lutrin, son étoile
 * située, les molettes sur ses indices.
 */
function aimedOf(tel) {
  const k = tel && tel.found && typeof tel.aimedAt === "string" ? tel.aimedAt : null;
  return k && tel.systems && tel.systems[k] && Number.isFinite(tel.systems[k].at) ? k : null;
}

module.exports = { aimedOf, SLOTS, RACK, EXTRA, normCry, normalize, saved, rackOf, rackPage, pages, exact, score, slotsOf, choose, unwritten, full, lightOf, targetOf, place, starOf, crystalIds, noteOf, chordOf, beatOf };
