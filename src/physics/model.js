"use strict";
/**
 * Couche physique des Âges : les LOIS, en fonctions pures.
 *
 * Ce n'est pas une simulation. Chaque loi est une version simplifiée d'une relation réelle,
 * choisie pour donner des causes et des effets lisibles, et calée pour que la Terre, Mars,
 * Vénus et la Lune retombent à peu près sur leurs vraies valeurs (voir test/physics.test.js).
 *
 * Unités relatives : Terre = 1 (masse, rayon, gravité, chaleur interne, flux reçu),
 * Soleil = 1 (masse, luminosité), distances en UA, âges en milliards d'années (Ga),
 * températures en kelvins, pressions en bars, rotation en heures.
 */

const T_SUN = 5778; // K
const T_EQ_EARTH_FACTOR = 278.6; // T_eq = 278,6 K · S^¼ · (1 − A)^¼  → Terre (A = 0,3) : 255 K
const EARTH_TAU = 0.836; // épaisseur optique « grise » qui fait passer la Terre de 255 K à 288 K
const WATER_TRIPLE_BAR = 0.00612; // point triple de l'eau (611,7 Pa) : sous cette pression, l'eau ne peut pas être liquide
const R_OVER_L = 8.314 / 40650; // Clausius-Clapeyron, eau

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------------------------------------
// L1 — Étoiles
// ---------------------------------------------------------------------------------------------

/** Relation masse-luminosité de la séquence principale (par morceaux, Soleil = 1). */
function starLuminosity(mass) {
  if (mass <= 0) return 0;
  if (mass < 0.43) return 0.23 * Math.pow(mass, 2.3);
  if (mass < 2) return Math.pow(mass, 4);
  return 1.4 * Math.pow(mass, 3.5);
}

/** Rayon de séquence principale (Soleil = 1) : ~M^0,8 sous une masse solaire, ~M^0,57 au-dessus. */
function starRadius(mass) {
  return mass <= 1 ? Math.pow(mass, 0.8) : Math.pow(mass, 0.57);
}

/** Température de surface (K), déduite de L = 4πR²σT⁴. */
function starTemperature(mass) {
  const L = starLuminosity(mass), R = starRadius(mass);
  return mass > 0 ? T_SUN * Math.pow(L / (R * R), 0.25) : 0;
}

/** Durée de vie sur la séquence principale (Ga) : le carburant (∝ M) divisé par la dépense (∝ L). */
function starLifetime(mass) {
  return mass > 0 ? (10 * mass) / starLuminosity(mass) : Infinity;
}

/**
 * Naine brune (le « soleil noir ») : trop légère pour brûler l'hydrogène, elle rayonne la chaleur de sa
 * formation et se refroidit lentement. Rayon ~0,1 R☉ quelle que soit sa masse ; 1 300 à 2 000 K selon la
 * masse (0,04 à 0,075 M☉) ; presque toute sa lumière est infrarouge : à l'œil, un disque sombre et rougeoyant.
 */
function brownDwarf(mass) {
  const T = 1300 + clamp((mass - 0.04) / 0.035, 0, 1) * 700, R = 0.1;
  return { T, L: R * R * Math.pow(T / T_SUN, 4), life: Infinity };
}

/** Part de la lumière d'un corps noir à T (K) entre deux longueurs d'onde (µm), par intégration numérique de Planck. */
const PLANCK_CACHE = new Map();
function planckFraction(T, a, b) {
  if (!(T > 0)) return 0;
  const key = `${Math.round(T / 25)}|${a}|${b}`; const hit = PLANCK_CACHE.get(key); if (hit != null) return hit;
  const c2 = 14388; // h·c / k, en µm·K
  const lo = Math.log(0.05), hi = Math.log(100), N = 240;
  let part = 0, total = 0;
  for (let i = 0; i < N; i++) {
    const l = Math.exp(lo + ((i + 0.5) / N) * (hi - lo)), dl = (l * (hi - lo)) / N;
    const v = dl / (Math.pow(l, 5) * (Math.exp(c2 / (l * T)) - 1));
    total += v; if (l >= a && l <= b) part += v;
  }
  const f = total > 0 ? part / total : 0; PLANCK_CACHE.set(key, f); return f;
}
/** Lumière visible (0,4–0,7 µm, celle des plantes) et ultraviolette (0,1–0,4 µm) d'une étoile, rapportées au Soleil. */
const visibleRatio = (T) => planckFraction(T, 0.4, 0.7) / planckFraction(T_SUN, 0.4, 0.7);
const uvRatio = (T) => planckFraction(T, 0.1, 0.4) / planckFraction(T_SUN, 0.1, 0.4);

// ---------------------------------------------------------------------------------------------
// L2 — Orbite et rotation
// ---------------------------------------------------------------------------------------------

/** Flux reçu (Terre = 1) à `a` UA d'une source de luminosité `L`. */
function insolation(L, a) {
  return a > 0 ? L / (a * a) : 0;
}

/** Distance (UA) qui donne le flux `S` autour d'une source de luminosité `L`. */
function distanceFor(L, S) {
  return S > 0 && L > 0 ? Math.sqrt(L / S) : Infinity;
}

/** Période orbitale (jours), 3ᵉ loi de Kepler. */
function orbitalPeriodDays(a, starMass) {
  return starMass > 0 && isFinite(a) ? 365.25 * Math.sqrt((a * a * a) / starMass) : Infinity;
}

/**
 * Temps de verrouillage par marée (Ga), ∝ a⁶ / M★². La constante est calée pour que la Terre
 * autour du Soleil ne se verrouille jamais (≈ 20 000 Ga) et qu'une planète tempérée autour d'une
 * naine rouge de 0,3 M☉ ou moins se verrouille en moins d'un milliard d'années (à 0,5 M☉, il en faut ~20).
 */
function tidalLockTime(a, starMass) {
  if (!(starMass > 0) || !isFinite(a)) return Infinity;
  return (2e4 * Math.pow(a, 6)) / (starMass * starMass);
}

/** Zone habitable (flux reçu) : bord intérieur = emballement de l'effet de serre, bord extérieur = effet de serre maximal. */
const HABITABLE = { inner: 1.1, outer: 0.36 };

// ---------------------------------------------------------------------------------------------
// L3 — Planète : masse, rayon, gravité
// ---------------------------------------------------------------------------------------------

/** Rayon d'une planète rocheuse (Zeng et al. 2016) : R = (1,07 − 0,21·CMF) · M^(1/3,7). CMF = part du noyau de fer. */
function planetRadius(mass, coreFraction = 0.33) {
  const k = (1.07 - 0.21 * coreFraction) / (1.07 - 0.21 * 0.33); // normalisé : Terre = 1
  return k * Math.pow(mass, 1 / 3.7);
}
const gravity = (mass, radius) => mass / (radius * radius);
const escapeVelocity = (mass, radius) => Math.sqrt(mass / radius); // Terre = 1 (11,2 km/s)
const density = (mass, radius) => mass / (radius * radius * radius); // Terre = 1 (5,5 g/cm³)

// ---------------------------------------------------------------------------------------------
// L4 — Intérieur : chaleur, volcanisme, noyau, champ magnétique
// ---------------------------------------------------------------------------------------------

/**
 * Chaleur interne (Terre aujourd'hui = 1).
 *   - la radioactivité décroît : ~3,6 fois plus de chaleur à la naissance d'un monde qu'au bout de 4,5 Ga ;
 *   - un petit corps perd sa chaleur plus vite (rapport surface / volume) : la Lune s'est figée, Mars presque ;
 *   - la marée (lune proche, géante voisine, étoile très proche) ajoute sa propre chaleur.
 * Calé : Terre 1, Vénus ≈ 0,9, Mars ≈ 0,25, Lune ≈ 0,05.
 */
const COOLING = 0.066;
function internalHeat(mass, radius, ageGa, tidal = 0) {
  const decay = Math.exp(-(ageGa - 4.5) / 3.5);
  const keep = Math.min(1.3, Math.exp(-ageGa * COOLING * (1 / radius - 1)));
  return Math.sqrt(mass) * decay * keep + tidal;
}
/** Âge (Ga) auquel la chaleur radiogénique d'une planète tombe à `h` (inverse de internalHeat, marée comprise). */
function ageForHeatLevel(mass, radius, h, tidal = 0) {
  const need = h - tidal;
  if (need <= 0) return Infinity;
  const den = 1 / 3.5 + COOLING * (1 / radius - 1);
  if (den <= 0) return Infinity;
  return (4.5 / 3.5 - Math.log(need / Math.sqrt(mass))) / den;
}

/** Seuils (en chaleur interne) : volcanisme actif, tectonique des plaques, noyau encore liquide, océan de magma. */
const HEAT = { volcanism: 0.5, tectonics: 0.7, liquidCore: 0.4, magmaOcean: 3 };

/**
 * Dynamo (champ magnétique global), intensité relative (Terre = 1) : il faut un noyau liquide qui
 * brasse, donc de la chaleur ; une rotation lente l'affaiblit (Mercure, 59 jours par tour, n'a
 * qu'un champ de 1 % du terrestre). Vénus sort sans champ du modèle, comme dans la réalité, mais
 * la vraie raison y est débattue (l'état de son noyau plus que sa rotation) : simplification.
 */
function dynamo(heat, rotationHours, coreFraction) {
  if (heat < HEAT.liquidCore) return 0;
  const spin = clamp(Math.sqrt(24 / Math.max(rotationHours, 4)), 0.05, 2);
  return clamp(spin * (coreFraction / 0.33) * Math.min(1.5, heat), 0, 3);
}
/** Seuil d'un « vrai » bouclier magnétique (en dessous : champ faible, aurores pâles). */
const FIELD_SHIELD = 0.2;

// ---------------------------------------------------------------------------------------------
// L5 — Atmosphère : rétention, pression, effet de serre
// ---------------------------------------------------------------------------------------------

/** Température d'équilibre (K) : flux reçu S (Terre = 1), albédo A ; sans étoile, la seule chaleur interne. */
function equilibriumTemperature(S, albedo, heat = 1) {
  const fromStar = T_EQ_EARTH_FACTOR * Math.pow(Math.max(0, S) * (1 - albedo), 0.25);
  const fromInside = 35 * Math.pow(Math.max(heat, 0), 0.25); // 0,087 W/m² terrestres → ~35 K
  return Math.pow(Math.pow(fromStar, 4) + Math.pow(fromInside, 4), 0.25);
}

/**
 * Part de l'atmosphère conservée (0..1). Le gaz s'échappe d'autant plus que la gravité est faible
 * (vitesse de libération) et la haute atmosphère chaude ; le vent de l'étoile l'arrache, sauf si un
 * champ magnétique le dévie. Calé : Terre ≈ 0,98, Vénus ≈ 0,6, Mars ≈ 0,15, Lune ≈ 0.
 */
function retention(vesc, Teq, S, field) {
  const keep = (vesc * vesc * 255) / Math.max(Teq, 40);
  const wind = Math.sqrt(Math.max(S, 0)) * (field > 0.2 ? 0.3 : 1);
  if (wind === 0) return 1;
  const x = wind / Math.max(keep, 1e-6);
  return Math.exp(-(x / 2) * (x / 2));
}

/**
 * Pression de surface (bars) : volatils disponibles × dégazage (volcanisme) × rétention.
 * Le régime de l'eau décide du sort du gaz carbonique des volcans :
 *   "liquid"  la pluie et les océans l'enfouissent dans les roches (cycle des carbonates) : rien de plus ;
 *   "ice"     plus de pluie pour l'enfouir : il s'accumule un peu (×3) — c'est ainsi qu'une Terre gelée se réchauffe ;
 *   "dry"     ni océan ni glace (eau en vapeur, ou pas d'eau) : il s'accumule sans frein (effet Vénus, jusqu'à ×150).
 */
function surfacePressure({ volatiles, heat, keep, regime = "liquid" }) {
  const outgas = Math.sqrt(clamp(heat, 0.05, 4)); // un intérieur deux fois plus chaud ne dégaze pas deux fois plus
  let P = volatiles * outgas * keep;
  if (heat >= HEAT.volcanism) {
    if (regime === "ice") P *= 3;
    else if (regime === "dry") P *= clamp(100 * heat, 1, 150);
  }
  return P;
}

/** Effet de serre « gris » : T_surface⁴ = T_eq⁴ · (1 + ¾τ), avec τ ∝ P^1,2 (calé sur la Terre, Mars et Vénus). */
function greenhouse(Teq, P) {
  const tau = EARTH_TAU * Math.pow(Math.max(P, 0), 1.2);
  return { tau, Ts: Teq * Math.pow(1 + 0.75 * tau, 0.25) };
}

// ---------------------------------------------------------------------------------------------
// L6 — Eau
// ---------------------------------------------------------------------------------------------

/** Température d'ébullition (K) à la pression P (bars), Clausius-Clapeyron (jamais sous le point triple). */
function boilingPoint(P) {
  if (P <= WATER_TRIPLE_BAR) return 273.16;
  return Math.max(273.16, 1 / (1 / 373.15 - R_OVER_L * Math.log(P / 1.013)));
}

/** Part de l'air qui reste gazeux : sous ~60 K, l'azote et ses voisins gèlent et tombent en neige. */
function airFreeze(Teq) {
  if (Teq >= 60) return 1;
  return clamp(Math.pow((Teq - 20) / 40, 2), 0, 1);
}

/** État de l'eau en surface : "liquid", "ice", "vapor" (ou "none" s'il n'y en a pas). */
function waterState(Ts, P, inventory) {
  if (!(inventory > 0)) return "none";
  if (P < WATER_TRIPLE_BAR) return Ts < 273 ? "ice" : "vapor"; // trop peu d'air : la glace se sublime, l'eau ne coule pas
  if (Ts < 273) return "ice";
  if (Ts >= boilingPoint(P)) return "vapor";
  return "liquid";
}

module.exports = {
  T_SUN, WATER_TRIPLE_BAR, HABITABLE, HEAT, clamp,
  starLuminosity, starRadius, starTemperature, starLifetime, brownDwarf, planckFraction, visibleRatio, uvRatio,
  insolation, distanceFor, orbitalPeriodDays, tidalLockTime,
  planetRadius, gravity, escapeVelocity, density,
  internalHeat, ageForHeatLevel, dynamo, FIELD_SHIELD, airFreeze,
  equilibriumTemperature, retention, surfacePressure, greenhouse,
  boilingPoint, waterState,
};
