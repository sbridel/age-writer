"use strict";
/**
 * L'Imageur en mode « L'Art de la Guilde » (réglage `instrumentsMode` = "guild") : modèle pur, sans DOM ni Obsidian.
 *
 * L'appareil ne contient qu'UN LIVRE VIERGE : on ne choisit pas l'Âge, on le TROUVE par les réglages.
 *   - le télescope donne la cible : visant l'étoile d'un système situé, il renvoie sa lumière (`lightOf`) ; les candidats
 *     sont alors les Âges de cette étoile ; sans cible, tous les Âges de l'étagère (à l'aveugle) ;
 *   - station I : le râtelier offre les glyphes CONNUS (`rackOf` : ceux des Âges de l'étagère, comme le livre des glyphes),
 *     quatre logements ; quatre cristaux dans l'ordre = les premières pages d'un monde. Juste (`exact`) : la planète est
 *     verrouillée et la station III s'éveille ;
 *   - stations II et III : comme en mode facile, contre le monde trouvé ; plusieurs Âges d'une même étoile (même lumière,
 *     mêmes premières pages) : l'atmosphère départage (`choose`).
 * Un réglage qui ne correspond à aucun Âge écrit : la fenêtre reste noire (`unwritten`, un crochet qui renvoie null pour
 * l'instant : les mondes jamais écrits viendront plus tard).
 * L'état gardé (`normalize`, `saved`) est à part de celui du mode facile (par Relto) : quatre logements (identifiants de
 * glyphes ou vides) et les noms dont le livre se souvient. Testé dans test/imager-guild.test.js.
 */
const I = require("./imager");

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

/** Les cristaux justes pour un monde : ses pages dans l'ordre, et rien dans les logements suivants. */
function exact(cry, ids) { return !!ids.length && ids.every((id, i) => cry[i] === id) && cry.slice(ids.length).every((x) => !x); }
/** Justesse des cristaux (0 à 1) : comme en mode facile (bonne place 1, bonne page ailleurs 0,3), moins les cristaux de trop. */
function score(cry, ids) {
  if (!ids.length) return 0;
  let k = 0; ids.forEach((id, i) => { if (cry[i] === id) k += 1; else if (cry[i] && ids.includes(cry[i])) k += 0.3; });
  return Math.max(0, k / ids.length - EXTRA * cry.slice(ids.length).filter(Boolean).length);
}
/** Par logement : juste (`ok`), bonne page mal placée (`half`), pour les lampes du râtelier (rien sans monde). */
function slotsOf(cry, ids) { return cry.map((id, i) => ({ id, ok: !!id && ids[i] === id, half: !!id && ids[i] !== id && ids.includes(id) })); }

/**
 * Le monde que les réglages approchent. `cands` : [{ age, data: { target, system, … } }] (chargés) ; `star` : la clé
 * d'étoile visée au télescope, ou null (à l'aveugle : tous les Âges). Le meilleur : d'abord les cristaux justes, puis la
 * justesse des cristaux, puis l'atmosphère (deux mondes d'une même étoile aux mêmes premières pages), puis le nom.
 * Renvoie { world, planet (cristaux justes), score } ; world null : aucun cristal ne résonne (fenêtre noire).
 */
function choose(cands, cry, settings, now = Date.now(), star = null) {
  const pool = (cands || []).filter((c) => c && c.data && c.data.target && (!star || starOf(c) === star));
  let best = null;
  for (const c of pool) {
    const ids = crystalIds(c), sc = score(cry, ids); if (sc <= 0) continue;
    const ex = exact(cry, ids), atmo = I.sharpness(I.effective(settings, c.data.target, now), c.data.target, now), name = String(c.age && c.age.name);
    const k = { c, ex, sc, atmo, name };
    if (!best || ex > best.ex || (ex === best.ex && (sc > best.sc + 1e-9 || (Math.abs(sc - best.sc) < 1e-9 && (atmo > best.atmo + 1e-9 || (Math.abs(atmo - best.atmo) < 1e-9 && name < best.name)))))) best = k;
  }
  if (!best) return { world: unwritten(cry, star), planet: false, score: 0 };
  return { world: best.c, planet: best.ex, score: best.sc };
}

/**
 * Crochet : un monde jamais écrit que ces réglages feraient apparaître (dans le lore, l'Art relie des mondes qui existent
 * déjà). Pour l'instant : null, la fenêtre reste noire. Plus tard : une scène générative tirée des réglages, reproductible.
 */
function unwritten(cry, star) { return null; }

/** La lumière que le télescope renvoie : celle de l'étoile visée (le premier de ses Âges, par nom), ou null. */
function lightOf(cands, star) {
  if (!star) return null;
  const list = (cands || []).filter((c) => c && c.data && c.data.target && c.data.target.lens && starOf(c) === star).sort((a, b) => String(a.age.name).localeCompare(String(b.age.name)));
  return list.length ? list[0].data.target.lens : null;
}

/** La cible à régler (stations II et III) : celle du monde, avec la justesse des cristaux de ce mode (src/imager.js, `cryScore`). */
function targetOf(world, cry) { return world && world.data && world.data.target ? { ...world.data.target, cryScore: score(cry, crystalIds(world)) } : null; }

/**
 * Le râtelier, geste par geste (comme `place` du mode facile, mais avec des glyphes et des logements vides) : `hand` =
 * null | { id, slot? } ; `target` = { slot } | { rack: id }. Rendre un cristal à sa propre cheville vide son logement.
 */
function place(cry0, hand, target) {
  const cry = normCry(cry0); if (!target) return { cry, hand: null };
  if (!hand) {
    if (target.slot != null) return { cry, hand: cry[target.slot] ? { id: cry[target.slot], slot: target.slot } : null };
    if (target.rack != null) { const at = cry.indexOf(target.rack); return { cry, hand: at >= 0 ? null : { id: target.rack } }; } // un cristal posé laisse sa cheville vide
    return { cry, hand: null };
  }
  if (target.slot != null) {
    if (hand.slot === target.slot) return { cry, hand: null };
    if (hand.slot != null) { const a = cry[hand.slot]; cry[hand.slot] = cry[target.slot]; cry[target.slot] = a; return { cry, hand: null }; }
    const at = cry.indexOf(hand.id); if (at >= 0) cry[at] = cry[target.slot];
    cry[target.slot] = hand.id; return { cry, hand: null };
  }
  if (target.rack != null) {
    if (hand.slot != null && target.rack === hand.id) { cry[hand.slot] = null; return { cry, hand: null }; } // rendu au râtelier
    if (target.rack === hand.id) return { cry, hand: null };
    if (hand.slot != null && !cry.includes(target.rack)) { cry[hand.slot] = target.rack; return { cry, hand: null }; } // échangé contre un autre
    return { cry, hand: cry.includes(target.rack) ? null : { id: target.rack } };
  }
  return { cry, hand: null };
}

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

module.exports = { aimedOf, SLOTS, RACK, EXTRA, normCry, normalize, saved, rackOf, rackPage, pages, exact, score, slotsOf, choose, unwritten, lightOf, targetOf, place, starOf, crystalIds };
