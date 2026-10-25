"use strict";
/*
 * Les saisons dans la fenêtre de liaison (docs/DESIGN-physique.md §12 bis, palier 3). Modèle pur, sans dessin.
 * La physique donne l'amplitude été/hiver (src/physics/model.js, seasonAmplitude) ; ici on dit **quel jour de son année** un Âge vit
 * aujourd'hui, et ce que ce jour fait au décor : la neige, la vigueur du vivant, la floraison, la chute des feuilles.
 * Seuil (choix du 25 oct. 2026) : rien en dessous des saisons *marquées* (8 K) ; un monde figé par marée ou sans étoile n'en a pas.
 * Le jour de l'année : date réelle + décalage tiré de la graine, l'année de l'Âge comptée en jours réels (un monde lent est lent).
 */
const { fnv, clamp, frac } = require("./util");
const DAY = 86400000, TAU = Math.PI * 2;
/** Le seuil d'amplitude (K) au-dessus duquel les saisons se voient. */
const MIN_AMP = 8;

/** La phase de l'année (0 = plein hiver, 0,25 = printemps, 0,5 = plein été, 0,75 = automne) d'un Âge aujourd'hui. */
function phaseOf(key, now, yearDays) {
  const y = Number.isFinite(yearDays) && yearDays > 1 ? yearDays : 365.25, off = (fnv("season|" + String(key)) >>> 0) / 4294967296;
  return frac(now / DAY / y + off);
}
/** Une cloche autour de `c`, de largeur `w`, sur le cercle de l'année. */
const bell = (u, c, w) => { let d = Math.abs(frac(u - c + 0.5) - 0.5); return clamp(1 - d / w); };
/** Le nom de la saison, pour la fiche et le journal. */
const nameOf = (u) => (u < 0.125 || u >= 0.875 ? "winter" : u < 0.375 ? "spring" : u < 0.625 ? "summer" : "autumn");

/**
 * Ce que la saison fait au décor, ou null quand l'Âge n'a pas de saisons visibles.
 * @param w l'état physique (w.Ts, w.seasonAmp, w.locked, w.stars, w.water, w.P) ; @param u la phase de l'année
 */
function lookOf(w, u) {
  if (!w || u == null || !(w.seasonAmp >= MIN_AMP) || w.locked || w.stars === 0) return null;
  u = frac(u);
  const c = Math.cos(TAU * u), T = w.Ts - w.seasonAmp * c; /* c = 1 en plein hiver */
  const k = 0.6 + 0.4 * clamp((w.seasonAmp - MIN_AMP) / 12); /* la force du contraste : pleine à 20 K */
  const wet = w.water === "liquid" || w.water === "ice", air = Number.isFinite(w.P) ? w.P > 0.005 : true;
  return {
    u, name: nameOf(u), T, k,
    cold: clamp(c) * k, warm: clamp(-c) * k,
    snow: wet && air ? clamp((273.15 - T) / 8) * k : 0, /* la neige tient quand le jour reste sous zéro */
    vig: clamp(0.5 - 0.5 * c), /* la vigueur du vivant : nulle au cœur de l'hiver */
    bloom: bell(u, 0.25, 0.1) * k, fall: bell(u, 0.75, 0.1) * k,
    sun: 0.5 - 0.5 * c, /* le soleil plus haut l'été */
  };
}

/** La récolte et la saison (palier 3) : une saison **favorise** une matière sans en interdire aucune — elle compte riche ce jour-là.
 *  Printemps : le terreau ; été : les cendres ; automne : la tourbe et le limon ; hiver : rien de plus. Renvoie { id: true } pour les matières données. */
const FAVOURS = { spring: ["humus"], summer: ["ash"], autumn: ["peat", "silt"], winter: [] };
function richFor(gives, season) {
  const out = {}; if (!season) return out;
  for (const id of FAVOURS[season.name] || []) if ((gives || []).includes(id)) out[id] = true;
  return out;
}

module.exports = { MIN_AMP, DAY, FAVOURS, phaseOf, lookOf, nameOf, richFor };
