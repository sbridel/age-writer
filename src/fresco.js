"use strict";
/**
 * Les fresques de la caverne, le code et la dalle (claude/DESIGN-reve-et-caverne-bahro.md, section 13, étape 4c ; retouchés
 * le 25 oct., claude/DESIGN-art-bahro.md §11). Pur : ce qui se peint, dans quel ordre, ce que la lumière en laisse voir, le code du Relto. Le dessin est
 * dans src/relto-fresco.js.
 *
 * - Les fresques racontent le joueur en pictogrammes : un signe par Âge écrit (deux à quatre éléments tirés de ce qu'il a
 *   écrit, à défaut de son nom), un par merveille vue. **Le plus récent près de l'eau, le plus ancien en haut** : cinq bandes
 *   pour le joueur, la sixième, tout en haut, pour l'histoire des Bahro.
 * - Chaque révélation (un éclair blanc vu d'en bas) éclaire une bande de plus : à la n-ième, n bandes.
 * - Le lac a des degrés (section 14 B) : 0 noir, 1 une lueur, 2 la bande du bas se voit sans éclair, 3 la caverne rendue
 *   à sa lumière (tout ce qui a été révélé se voit sans éclair).
 * - Le code : six glyphes tirés du nom et de la graine du Relto (donc de son Great Zero) ; deux de plus par révélation ; à
 *   chaque éclair, le long de la veine, tout ce qui est déjà trouvé (on lit à partir de la main, en remontant). Le plugin ne
 *   l'écrit nulle part.
 * - La dalle, dans la chambre des souvenirs (on lit le code en bas, on l'entre là-haut) : six pierres autour d'une vasque,
 *   chacune sur un anneau de six glyphes ; un clic = un cran. Les six justes : elle s'ouvre et le reste.
 */
const { fnv } = require("./util");
const DAY = 86400000, BANDS = 6, PLAYER_BANDS = 5, PER_BAND = 7, CODE_LEN = 6, RING = 6;

/** Les dix-huit éléments d'Âge (les signes de la planche). */
const ELEMENTS = ["water", "fire", "tree", "mountain", "sun", "moon", "rain", "beast", "bird", "fish", "stone", "grass", "cloud", "wind", "snow", "lava", "cave", "island"];
/** Ce que les blocs écrits évoquent (dans l'ordre : le premier qui convient). */
const WORDS = [
  [/lava|magma|volcan/, "lava"], [/water|ocean|sea|lake|river|pond|marsh|swamp|tide|wave/, "water"], [/fire|ember|ash|cinder|heat|flame|burn/, "fire"],
  [/tree|forest|wood|oak|pine|fern|jungle|vine|root/, "tree"], [/mountain|hill|peak|cliff|ridge|canyon|mesa/, "mountain"], [/sun|aurora|light/, "sun"],
  [/moon|night|star/, "moon"], [/rain|drizzle|storm|thunder|acid/, "rain"], [/bird|wing|feather/, "bird"], [/fish|koi|eel|reef|coral/, "fish"],
  [/beast|grazer|herd|wolf|deer|animal|creature|moth|insect|predator/, "beast"], [/stone|rock|granite|basalt|crystal|iron|gold|silver|copper|salt|sand|desert/, "stone"],
  [/grass|meadow|moss|flower|petal|bloom|spore|garden/, "grass"], [/cloud|fog|mist|haze|smoke/, "cloud"], [/wind|breeze|gust|air/, "wind"],
  [/snow|ice|glacier|frost|frozen|cold/, "snow"], [/cave|cavern|vault|under|deep/, "cave"], [/island|archipelago|islet|atoll/, "island"],
];
/** Les merveilles de la face écrite, en éléments (les composites ont leur scène dans la planche ; 2.5 : la Pluie qui reste aussi). */
const WRITTEN_SIGNS = { held_water: ["water", "stone"], petal_rain: ["rain", "grass"], scented_mist: ["cloud", "grass"], crystal_rain: ["rain", "stone"], spore_cloud: ["cloud", "grass"], glowvine: ["tree", "sun"], lantern_moths: ["beast", "fire"], cinderbloom: ["grass", "fire"], ironwood: ["tree", "stone"], humming_shard: ["stone", "wind"], singing_glass: ["stone", "wind"], speaking_tablet: ["stone", "bird"], charged_crystal: ["stone", "rain"], fulgurite: ["rain", "stone"] };
/** Les merveilles qui ont leur scène (dix-sept, puis la Pluie qui reste en 2.5). */
const WONDER_SCENES = ["unfinished_horizon", "orphan_colour", "breathing_mirrors", "visiting_weight", "wind_learned", "reading_rain", "ceiling_sea", "fit_through_moths", "mosaic", "ringed_ground", "drinking_roots", "living_mist", "day_aurora", "blooming_ice", "rust_held_bridge", "many_one", "early_echo", "lingering_rain"];
/** L'histoire des Bahro, tout en haut (avant le joueur) : l'enchaîné, le serpent, le signe répété (celui de la pierre), l'œil, le cri, les mains. */
const BAHRO_ROW = ["chained", "serpent", "stonesign", "eye", "stonesign", "cry", "chained", "hands", "stonesign"];

const unit = (s, k) => (fnv(String(s) + "|" + k) % 100000) / 100000;

/** Le signe d'un Âge : deux à quatre éléments, le premier au centre (le plus gros). Tiré de ce qu'il a écrit, puis de son nom. */
function ageSign(age) {
  const name = (age && age.name) || "", out = [];
  for (const id of (age && age.glyphs) || []) { const w = WORDS.find(([re]) => re.test(String(id))); if (w && !out.includes(w[1])) out.push(w[1]); if (out.length >= 4) break; }
  const want = 2 + Math.floor(unit(name, "n") * 3);
  for (let k = 0; out.length < want && k < 40; k++) { const e = ELEMENTS[Math.floor(unit(name, "e" + k) * ELEMENTS.length)]; if (!out.includes(e)) out.push(e); }
  return out.slice(0, 4);
}

/**
 * Ce qui se peint, du plus ancien au plus récent : { kind: "age"|"wonder", id, parts?, at }. Les Âges sans date
 * gardent l'ordre de la liste, avant ceux qui en ont une.
 */
function itemsOf(ages, wonders) {
  const out = [];
  (ages || []).forEach((a, i) => out.push({ kind: "age", id: a.name || a.path || String(i), parts: ageSign(a), at: a.born > 0 ? a.born : i - 1e6 }));
  for (const [id, v] of Object.entries(wonders || {})) {
    if (WONDER_SCENES.includes(id)) out.push({ kind: "wonder", id, at: (v && v.at) || 0 });
    else if (WRITTEN_SIGNS[id]) out.push({ kind: "age", id, parts: WRITTEN_SIGNS[id], at: (v && v.at) || 0 });
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * Les bandes du joueur, de la plus basse (0, près de l'eau : le plus récent) à la plus haute (4). Sept signes par bande ;
 * au-delà de trente-cinq, on garde le premier, le dernier, et un pas régulier entre eux (rien ne s'efface : la paroi
 * resserre).
 */
function bandsOf(items) {
  const cap = PLAYER_BANDS * PER_BAND; let list = (items || []).slice();
  if (list.length > cap) list = Array.from({ length: cap }, (_, i) => list[Math.round((i * (list.length - 1)) / (cap - 1))]);
  const recent = list.reverse(), bands = [];
  for (let b = 0; b < PLAYER_BANDS; b++) bands.push(recent.slice(b * PER_BAND, (b + 1) * PER_BAND));
  return bands;
}

/** Le degré du lac (section 14 B) : 0 noir ; 1 une colonie ; 2 une trentaine nourries ces jours-ci ; 3 deux cents nourries. */
function lakeDegree(colonies, fedAt, now) {
  const n = Math.max(0, colonies || 0); if (!n) return 0;
  const fresh = fedAt > 0 && now - fedAt < 3 * DAY;
  return fresh && n >= 200 ? 3 : fresh && n >= 30 ? 2 : 1;
}

/** Combien de bandes se voient : pendant l'éclair, celles déjà révélées ; sans éclair, selon le degré du lac. */
function bandsLit(revealed, degree, flash) {
  const n = Math.min(BANDS, Math.max(0, revealed || 0));
  if (flash) return Math.max(n, degree >= 2 ? 1 : 0);
  return degree >= 3 ? Math.max(1, n) : degree >= 2 ? 1 : 0;
}

/** Le code du Relto : six éléments distincts (indices dans ELEMENTS), tirés de son nom et de sa graine. */
function codeOf(name, seed) {
  const key = String(name == null || name === "" ? "Relto" : name).trim().toLowerCase() + "#" + ((Number(seed) || 0) >>> 0), out = [];
  for (let k = 0; out.length < CODE_LEN && k < 200; k++) { const i = fnv(key + "|code|" + k) % ELEMENTS.length; if (!out.includes(i)) out.push(i); }
  return out;
}
/** Combien de glyphes du code sont trouvés : deux par révélation. */
const glyphsFound = (revealed) => Math.min(CODE_LEN, 2 * Math.max(0, revealed || 0));

/**
 * L'anneau de la pierre `i` : six éléments, dont le bon ; et sa position de départ (jamais la bonne). Le reste de l'anneau
 * est pris parmi les autres glyphes du code d'abord (on ne peut pas deviner une pierre en cherchant l'intrus).
 */
function ringOf(code, i, key) {
  const want = code[i], ring = [want], pool = code.filter((x) => x !== want).concat(ELEMENTS.map((_, j) => j).filter((j) => !code.includes(j)));
  for (let k = 0; ring.length < RING && k < 400; k++) { const c = pool[fnv(key + "|ring|" + i + "|" + k) % Math.min(pool.length, 10)]; if (!ring.includes(c)) ring.push(c); }
  for (let k = ring.length - 1; k > 0; k--) { const j = fnv(key + "|mix|" + i + "|" + k) % (k + 1); [ring[k], ring[j]] = [ring[j], ring[k]]; }
  const right = ring.indexOf(want), start = (right + 1 + (fnv(key + "|start|" + i) % (RING - 1))) % RING;
  return { ring, start };
}

/** La dalle d'un Relto : les anneaux, le glyphe que montre chaque pierre, et si les six sont justes. */
function slabOf(name, seed, turns) {
  const code = codeOf(name, seed), key = String(name || "Relto").toLowerCase() + "#" + ((Number(seed) || 0) >>> 0);
  const stones = code.map((_, i) => { const { ring, start } = ringOf(code, i, key), t = Math.max(0, (turns && turns[i]) || 0); return ring[(start + t) % RING]; });
  return { code, stones, right: stones.every((s, i) => s === code[i]) };
}

module.exports = { DAY, BANDS, PLAYER_BANDS, PER_BAND, CODE_LEN, RING, ELEMENTS, WONDER_SCENES, WRITTEN_SIGNS, BAHRO_ROW, ageSign, itemsOf, bandsOf, lakeDegree, bandsLit, codeOf, glyphsFound, ringOf, slabOf };
