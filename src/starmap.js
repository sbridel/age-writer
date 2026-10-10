"use strict";
/**
 * Télescope, étape 3 : la CARTE DES ÉTOILES du joueur, modèle pur (le dessin est dans src/relto-starmap.js).
 *
 * Elle place, vus de dessus (le plan du Great Zero), le Great Zero au centre, le Relto (sa position GZCS, l'inverse du
 * vecteur Relto → Zéro trouvé au télescope) et chaque système situé (sa position GRAVÉE), avec ses Âges et ses
 * perturbateurs : une constellation. Le nord de la carte est la ligne d'origine où l'instrument est calé (`line`) : sur la
 * fausse ligne de Me'erta, le Relto et les étoiles gravées depuis tournent ensemble, si bien qu'à elle seule la carte semble
 * juste ; mais chaque étoile garde un TRAIT vers l'endroit où son Âge voit vraiment le Zéro (`rec.seen`) : sur la vraie
 * ligne, il pointe le Zéro ; sur l'autre, il le manque (`SS.miss`), et deux étoiles gravées sur des lignes différentes se
 * contredisent. Une seule étoile bien située suffit à ancrer la carte (le Relto vient du Zéro, pas des étoiles).
 *
 * Testé dans test/starmap.test.js.
 */
const SS = require("./starsystem");
const T = require("./telescope");

const TAU = Math.PI * 2;
const mod = (v, m) => ((v % m) + m) % m;

/** Du GZCS (Torahn, distance) au plan de la carte : x vers l'est (un quart de tour), y vers le nord (la ligne du Zéro). */
function plane(torahn, distance) { const a = (TAU * mod(torahn, T.TURN)) / T.TURN; return { x: distance * Math.sin(a), y: distance * Math.cos(a) }; }

/**
 * La carte d'un Relto : `zero` (T.greatZero, vecteur Relto → Zéro), `systems` (situés, par clé d'étoile), `line` (où
 * l'instrument est calé). Renvoie { relto, stars: [{ key, x, y, z, name, ages, pert, line, offLine, miss, ray }], scale,
 * anchored, offLine (nombre d'étoiles gravées sur une autre ligne), mixed (des lignes différentes se côtoient) }.
 * `ray` : la direction (unitaire, sur la carte) où cet Âge voit vraiment le Zéro, tracée depuis l'étoile.
 */
function layout(zero, systems, line = 0) {
  const L = Math.round(Number(line) || 0), rp = plane(zero.torahn + T.TURN / 2 + L, zero.distance), stars = [];
  for (const [key, rec] of Object.entries(systems || {})) {
    if (!rec || !Number.isFinite(rec.torahn) || !Number.isFinite(rec.distance)) continue;
    const p = plane(rec.torahn, rec.distance), recLine = Math.round(Number(rec.line) || 0), seen = Number.isFinite(rec.seen) ? rec.seen : mod(rec.torahn + T.TURN / 2, T.TURN);
    const ra = (TAU * seen) / T.TURN, miss = SS.miss({ ...rec, seen: Number.isFinite(rec.seen) ? rec.seen : undefined });
    const ages = Array.isArray(rec.ages) ? rec.ages.slice() : [], name = ages.length ? ages.join(", ") : key.replace(/^.*@(sys:)?/, "").replace(/#.*$/, "").replace(/~.*$/, "");
    const pert = (rec.pert || []).map((q) => ({ kind: q.kind, ...plane(q.torahn, q.distance), z: Number(q.elevation) || 0 }));
    stars.push({ key, x: p.x, y: p.y, z: rec.elevation || 0, distance: rec.distance, name, ages, pert, line: recLine, offLine: recLine !== 0, miss, ray: { x: Math.sin(ra), y: Math.cos(ra) }, tri: !!rec.tri });
  }
  stars.sort((a, b) => a.key < b.key ? -1 : 1);
  const far = Math.max(Math.hypot(rp.x, rp.y), ...stars.map((s) => Math.hypot(s.x, s.y)), ...stars.flatMap((s) => s.pert.map((q) => Math.hypot(q.x, q.y))), 1);
  const lines = new Set(stars.map((s) => s.line));
  return { relto: { ...rp, z: -(zero.elevation || 0) || 0 }, stars, scale: far, anchored: stars.some((s) => !s.offLine), offLine: stars.filter((s) => s.offLine).length, mixed: lines.size > 1, line: L };
}

/**
 * Projeter la carte dans un cadre `box` ({ x, y, w, h }) : fonction (x, y) → [px, py], le nord en haut, l'est à droite.
 * Échelle en racine carrée de la distance (comme une carte de navigateur : les directions sont exactes, les voisines du Zéro
 * ne s'entassent pas, les lointaines restent sur la feuille). `ring(d)` : le rayon à l'écran d'une distance d.
 */
function fit(map, box, margin = 0.1) {
  const R = Math.min(box.w, box.h) * (0.5 - margin), cx = box.x + box.w / 2, cy = box.y + box.h / 2, ring = (d) => R * Math.sqrt(Math.max(0, d) / map.scale);
  return { R, cx, cy, ring, at: (x, y) => { const d = Math.hypot(x, y); if (!d) return [cx, cy]; const k = ring(d) / d; return [cx + x * k, cy - y * k]; } };
}

/**
 * La même carte, vue de biais : le plan du Great Zero incliné comme une table (`tilt` : rapport des axes de ses ellipses), et
 * chaque point à sa hauteur `z` (shahfeetee, au-dessus = positif), à une échelle propre `hz` (px par shahfee). Les distances
 * gardent l'échelle en racine carrée ; les hauteurs, trop petites face aux distances, ont la leur, gravée sur la carte.
 * `at(x, y, z)` → [px, py] ; `ring(d)` : le demi-grand axe de l'ellipse d'une distance d.
 */
function fit3(map, box, { tilt = 0.4, hz = 0.55, zmax = 100 } = {}) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.max(20, Math.min(box.w * 0.46, (box.h / 2 - zmax * hz - 6) / tilt));
  const ring = (d) => R * Math.sqrt(Math.max(0, d) / map.scale);
  return { R, cx, cy, ring, tilt, hz, at: (x, y, z = 0) => { const d = Math.hypot(x, y), k = d ? ring(d) / d : 0; return [cx + x * k, cy - y * k * tilt - (Number(z) || 0) * hz]; } };
}

module.exports = { plane, layout, fit, fit3 };
