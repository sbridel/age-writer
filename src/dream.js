"use strict";
/**
 * Le Rêve (claude/DESIGN-reve-et-caverne-bahro.md, sections 5, 14 C et 20 ; étape 4d). Pur : ni DOM, ni coffre, ni horloge.
 *
 * La dalle ouverte, un clic sur sa vasque, et l'on voit l'Âge posé sur l'Imageur « de l'autre côté ». Trois sortes de choses
 * s'y trouvent, et rien n'est dit d'abord :
 *   - **les fautes mûries** (loi 4) : les fautes légères que l'Observation fait mûrir (src/observe.js, `faultsOf`), montrées
 *     à leur dernière étape, la cause ; rien de plus que ce que la rigueur finirait par dire ;
 *   - **les possibles** : le monde tiré avec une autre graine (celle de l'Âge, le Great Zero du joueur, le jour) ; les pages que
 *     ce tirage-là choisit et que le vrai n'a pas choisies. Ce qui est écrit ne change pas ; ce qui est laissé au hasard ondule ;
 *   - **l'autre face des merveilles** : le couple qui tient chacune (les deux éléments et la clef de voûte).
 * Adopter (avec un guide) : une faute → retirer la ligne écrite qui la cause ; un possible → écrire son bloc ; une merveille →
 * sa phrase va sur son orbe. Le plugin ne fait rien de tout cela sans le clic du joueur.
 */
const { fnv } = require("./util");
const OB = require("./observe");
const CAT = require("./wonders");
const DAY = 86400000;
/** Combien de choses un rêve montre au plus, par sorte : l'image reste lisible. */
const MAX = { fault: 4, possible: 3, wonder: 3 };
/** Combien de temps dure un rêve avant de s'éteindre seul (ms). */
const LENGTH = 60000;
/** Combien de tirages voisins le rêve fait glisser l'un dans l'autre. */
const ALTS = 2;

/** Le jour d'un instant, à l'heure locale (`tzMin` : décalage en minutes, comme `Date#getTimezoneOffset`). */
const dayOf = (now, tzMin = 0) => Math.floor((now - tzMin * 60000) / DAY);

/**
 * Peut-on rêver ? null si oui, sinon la raison : "closed" (la dalle n'est pas ouverte), "noage" (aucun Âge verrouillé sur
 * l'Imageur), "done" (cet Âge a déjà été rêvé aujourd'hui). `o` : { open, age (chemin ou graine), last (jour du dernier rêve de
 * cet Âge), day }.
 */
function gate(o) {
  if (!o || !o.open) return "closed";
  if (!o.age) return "noage";
  if (o.last != null && o.last === o.day) return "done";
  return null;
}

/** Les graines des tirages voisins : celle de l'Âge, le Great Zero du joueur et le jour. Le rêve change chaque jour, et il est le sien. */
function altSeeds(seed, gz, day, n = ALTS) {
  const out = [];
  for (let k = 0; k < n; k++) out.push(`${seed}~${(fnv(`${seed}|${gz == null ? "" : gz}|${day}|${k}`) >>> 0).toString(36)}`);
  return out;
}

/** Les pages écrites d'une analyse (des identifiants de blocs). */
function writtenOf(a) {
  const res = a && a.resolved, out = new Set();
  for (const id of (res && res.matter && res.matter.written) || []) out.add(id);
  for (const l of (res && res.lines) || []) if (l && l.entry && !l.autoFilled) out.add(l.entry.id);
  return out;
}
/** Les pages tirées d'une analyse. */
function drawnOf(a) {
  const d = (a && a.resolved && a.resolved.drawn) || (a && a.drawn) || [];
  return d.map((p) => (p && p.id) || p).filter(Boolean);
}

/** Les fautes mûries : à leur dernière étape. `prose(x)` (facultatif) donne la phrase d'une maladie (src/life.js). */
function faultsIn(a, prose) {
  const written = writtenOf(a), out = [];
  for (const f of OB.faultsOf(a && a.scars ? a : a && a.resolved ? a.resolved : a)) {
    const x = f.scar, from = (x.from || [])[0];
    const cause = from ? [from.a, from.b].find((id) => written.has(id)) || null : null; /* la ligne écrite qui fait le clash */
    const text = x.id === "blight" ? (prose ? prose({ ...x, stage: "cause" }) : x.prose) : x.prose;
    out.push({ kind: "fault", key: "f:" + f.key, id: x.id, axis: x.axis || (x.id === "blight" ? "ecological" : "geological"), level: x.level, text: text || OB.scarLine({ ...x, stage: "cause" }, {}) || x.id, pair: from ? [from.a, from.b] : null, line: cause ? { remove: cause } : null });
  }
  return out.slice(0, MAX.fault);
}

/** Les possibles : ce que les tirages voisins choisissent et que le vrai tirage n'a pas choisi (ni l'écrit). `axisOf(id)`. */
function possiblesIn(a, alts, axisOf) {
  const keep = new Set([...writtenOf(a), ...drawnOf(a)]), seen = new Set(), out = [];
  (alts || []).forEach((alt, k) => {
    for (const id of drawnOf(alt)) {
      if (keep.has(id) || seen.has(id)) continue; seen.add(id);
      out.push({ kind: "possible", key: "p:" + id, id, alt: k, axis: (axisOf && axisOf(id)) || "geological", line: { add: id } });
    }
  });
  return out.slice(0, MAX.possible);
}

/** L'autre face des merveilles : chaque composite noué et chaque merveille de la face écrite, avec le couple qui la tient. */
function wondersIn(a, keystoneOf) {
  const out = [], seen = new Set();
  for (const c of (a && a.composites) || []) {
    if (!c || seen.has(c.id)) continue; seen.add(c.id);
    const cat = CAT.BY_ID.get(c.id), ks = keystoneOf ? keystoneOf({ a: c.a, b: c.b }) : c.a;
    out.push({ kind: "wonder", key: "w:" + c.id, id: c.id, axis: (cat && cat.axis) || "cosmological", a: c.a, b: c.b, keystone: ks, line: { face: c.id } });
  }
  for (const x of (a && a.resolved && a.resolved.matter && a.resolved.matter.reactions) || []) {
    if (!x || !CAT.WRITTEN.some((w) => (w.id || w[0]) === x.result) || seen.has(x.result)) continue; seen.add(x.result);
    out.push({ kind: "wonder", key: "w:" + x.result, id: x.result, axis: "ecological", a: x.a, b: x.b, keystone: x.a, line: { face: x.result } });
  }
  return out.slice(0, MAX.wonder);
}

/** Où une chose se tient dans l'image (640 × 360), selon son axe : le ciel en haut, le sol en bas ; déterministe. */
const BAND = { cosmological: [40, 110], weather: [70, 140], meteorological: [70, 140], ecological: [190, 250], metaphysical: [170, 230], geological: [250, 310] };
function spotOf(item, seed) {
  const [y0, y1] = BAND[item.axis] || BAND.geological, h = fnv(`${seed}|${item.key}`) >>> 0;
  return { x: 70 + (h % 500), y: y0 + ((h >>> 9) % Math.max(1, y1 - y0)) };
}

/**
 * Le contenu d'un rêve : `main` l'analyse de l'Âge, `alts` celles des tirages voisins (même ordre que `altSeeds`).
 * `o` : { seed, axisOf, keystoneOf, prose }. Rend { items: [{ kind, key, …, x, y }] } ; deux choses ne se recouvrent pas.
 */
function contentOf(main, alts, o = {}) {
  const items = [...faultsIn(main, o.prose), ...possiblesIn(main, alts, o.axisOf), ...wondersIn(main, o.keystoneOf)];
  const placed = [];
  for (const it of items) {
    let p = spotOf(it, o.seed || ""), tries = 0;
    while (placed.some((q) => Math.abs(q.x - p.x) < 60 && Math.abs(q.y - p.y) < 34) && tries++ < 8) p = { x: 70 + ((p.x - 70 + 137) % 500), y: p.y };
    placed.push(p); Object.assign(it, p);
  }
  return { items };
}

/** Ce que le guide permet : un orbe de la chambre des souvenirs, du même Âge que le rêve (on ne rapporte que ce qu'on a vécu là). */
function guided(guide, wonders, ageSeed) {
  if (!guide || !wonders) return false;
  const w = wonders[guide]; return !!(w && ageSeed != null && String(w.age) === String(ageSeed));
}

/** La poussée d'un tirage voisin dans l'image, de 0 à 1 : chacun vient à son tour, lentement, puis repart (période 24 s). */
function altWeight(k, t, n = ALTS) {
  const P = 24, ph = ((t / P + k / n) % 1 + 1) % 1, s = Math.sin(ph * Math.PI);
  return s * s * 0.6;
}

module.exports = { DAY, MAX, LENGTH, ALTS, dayOf, gate, altSeeds, writtenOf, drawnOf, faultsIn, possiblesIn, wondersIn, spotOf, contentOf, guided, altWeight };
