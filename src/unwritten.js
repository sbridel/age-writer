"use strict";
/**
 * Les mondes jamais écrits (Imageur au livre vierge, mode « L'Art de la Guilde ») : modèle pur, sans DOM ni Obsidian.
 *
 * Dans le lore, l'Art ne crée pas un monde : il en RELIE un qui existe déjà. Des réglages qui ne correspondent à aucun Âge
 * écrit tombent donc parfois quand même sur un monde, que personne n'a encore décrit. Ici :
 *   - la CLÉ des réglages (`keyOf`) : les quatre cristaux dans l'ordre, l'étoile que dit la lumière des lentilles (la plus
 *     proche d'une petite palette d'étoiles de la séquence principale, `STARS`, à `STAR_TOL` près), l'iris (le flux reçu),
 *     la fréquence (la durée du jour) et l'amplitude (la pression), chacun par paliers de cinq crans (`BIN`). Ni la phase,
 *     ni l'harmonique, ni la polarité : on les accorde ensuite, sans que le monde change ;
 *   - un monde n'apparaît que si la clé est COHÉRENTE (`plausible` : quatre cristaux, une étoile reconnue, un jour et un air
 *     dans les plages), si le hasard tiré de la clé le veut (`CHANCE`), puis si le moteur le juge (`find`) : pas de tache
 *     d'encre, pas mourant, ses premières pages sont exactement ces cristaux dans cet ordre, la physique n'y voit aucune
 *     tension forte, et son propre ciel retombe dans la même clé (on peut l'accorder sans le perdre) ;
 *   - le bloc (`linesOf`) : les quatre pages, puis l'étoile et le ciel en lignes de valeurs (`star_mass:`, `insolation:`,
 *     `rotation:`, `atmosphere:` ; ce ne sont pas des pages) et `seed:` tirée de la clé ; le nom (`nameOf`) aussi : des
 *     syllabes à la manière d'Atrus, jamais le nom d'un Âge des jeux (`AVOID`).
 * Mêmes réglages → même monde, ou rien. Un Âge écrit qui répond exactement l'emporte toujours (src/imager-guild.js, `choose`).
 * Testé dans test/unwritten.test.js.
 */
const { fnv, rng } = require("./util");
const { starTemperature } = require("./physics/model");
const { blackbody } = require("./genscene");
const { pageList } = require("./engine/analysis");
const IM = require("./imager");

const SLOTS = 4;
const BIN = 5;           // paliers des réglages : 0–4, 5–9, 10–14, 15–19, 20–24 (le centre : 2, 7, 12, 17, 22)
const STAR_TOL = 6;      // écart toléré entre la lumière réglée et une étoile de la palette (somme des trois verres)
const CHANCE = 0.35;     // parmi les réglages cohérents et vivants, la part qui tombe sur un monde
const MASSES = [0.2, 0.35, 0.5, 0.7, 0.85, 1, 1.3, 1.7, 2.5]; // naines rouges → étoiles blanc bleuté
const scale = (rgb) => { const m = Math.max(1, ...rgb); return rgb.map((c) => Math.round((24 * c) / m)); };
/** La palette : la couleur (trois verres de 0 à 24) de chaque masse d'étoile, comme la physique la calcule. */
const STARS = MASSES.map((mass) => ({ mass, rgb: scale(blackbody(starTemperature(mass))) }));

const binOf = (v) => Math.max(0, Math.min(4, Math.floor((Number(v) || 0) / BIN)));
const center = (b) => b * BIN + 2;
const r3 = (x) => Math.round(x * 1000) / 1000;
/** Les valeurs physiques au centre d'un palier (l'inverse des formules de src/imager.js, `targetsOf` et `lensOf`). */
const hoursOf = (fb) => r3(24 / Math.pow(2, (center(fb) - 12) / 6));      // fréquence → durée du jour (h)
const pressureOf = (ab) => r3(Math.pow(2, (center(ab) - 12) / 4));        // amplitude → pression (bar)
const fluxOf = (ib) => r3(Math.pow(2, (12 - center(ib)) / 5));            // iris → flux reçu (Terre = 1)

/** L'étoile que dit la lumière réglée : l'indice dans `STARS`, ou -1 si aucune n'est assez proche. */
function starOf(s) {
  let best = -1, d0 = Infinity;
  STARS.forEach((st, i) => { const d = Math.abs(s.r - st.rgb[0]) + Math.abs(s.g - st.rgb[1]) + Math.abs(s.b - st.rgb[2]); if (d < d0 - 1e-9) { d0 = d; best = i; } });
  return d0 <= STAR_TOL ? best : -1;
}
const isId = (v) => typeof v === "string" && /^[a-z0-9_]+$/i.test(v);

/** La clé des réglages, ou null si quatre cristaux ne sont pas posés. `cry` : quatre identifiants ; `s` : le réglage commun. */
function keyOf(cry, s) {
  if (!Array.isArray(cry) || cry.length < SLOTS || !cry.slice(0, SLOTS).every(isId) || new Set(cry.slice(0, SLOTS)).size < SLOTS || !s) return null;
  return `${cry.slice(0, SLOTS).slice().sort().join(",")}|s${starOf(s)}|i${binOf(s.iris)}|f${binOf(s.freq)}|a${binOf(s.amp)}`;
}
/** La clé décomposée. */
function parseKey(key) {
  const m = /^([^|]+)\|s(-?\d+)\|i(\d)\|f(\d)\|a(\d)$/.exec(String(key || "")); if (!m) return null;
  return { cry: m[1].split(","), star: +m[2], iris: +m[3], freq: +m[4], amp: +m[5] };
}
/**
 * Une étoile et un ciel plausibles, l'un avec l'autre : une étoile reconnue ; un jour ni figé ni fou (palier de fréquence
 * 1 à 4 : de 38 h à 6 h environ) ; de l'air (palier d'amplitude 1 à 3 : 0,4 à 2,4 bar) ; et pas d'air épais sous une
 * étoile qui brûle (le flux le plus fort, palier d'iris 0, avec le palier d'air le plus dense).
 */
function plausible(k) {
  return !!k && k.star >= 0 && k.freq >= 1 && k.amp >= 1 && k.amp <= 3 && !(k.iris === 0 && k.amp === 3);
}
/** Le hasard tiré de la clé : mêmes réglages, même réponse. */
const roll = (key) => (fnv("monde-non-ecrit|" + key) % 10000) / 10000;
const lucky = (key) => roll(key) < CHANCE;
/** La graine du monde (ligne `seed:`), tirée de la clé. */
const seedOf = (key) => 1 + (fnv("graine-non-ecrite|" + key) % 999983);

/** Les lignes du bloc `age` qui décrivent ce monde (sans `seed:`). */
function linesOf(key) {
  const k = parseKey(key); if (!k || k.star < 0) return null;
  return [...k.cry, `star_mass: ${STARS[k.star].mass}`, `insolation: ${fluxOf(k.iris)}`, `rotation: ${hoursOf(k.freq)}`, `atmosphere: ${pressureOf(k.amp)}`];
}
/** Le texte du bloc `age` complet (lignes + `seed:`). */
const blockOf = (key) => { const l = linesOf(key); return l ? [...l, "seed: " + seedOf(key)].join("\n") : null; };

// ---- le nom ---------------------------------------------------------------------------------------------------------
const ON = ["k", "t", "r", "sh", "ts", "d", "l", "m", "n", "v", "y", "z", "gh", "kh", "b", "p", "th", "j", "h", "s"];
const NU = ["a", "e", "i", "o", "u", "ah", "ee", "oh", "oo", "ai", "eh"];
const CODA = ["n", "r", "l", "th", "sh", "t", "k", "m", "s", "v"];
/** Les noms des Âges des jeux (et quelques lieux, personnes) : un monde jamais écrit n'en porte jamais un. */
const AVOID = ["myst", "riven", "channelwood", "stoneship", "mechanical", "selenitic", "dunny", "dni", "teledahn", "kadish", "kadishtolesa", "gahreesen", "ederkemo", "edergira", "ederdelin", "edertsogal", "ahnonay", "ercana", "minkata", "negilahn", "dereno", "payiferen", "tetsonot", "laki", "jalak", "aegura", "relto", "tomahna", "haven", "spire", "serenia", "amateria", "narayan", "edanna", "voltaic", "jnanin", "releeshahn", "todelmer", "noloben", "tay", "terahnee", "kahlo", "kveer", "rudenna", "bevin", "uru", "ahra", "ahrah", "kirel", "nexus", "garrison", "ashem", "tsogal", "delin", "kemo", "gira", "taygahn", "rehevkor", "yeesha", "atrus", "catherine", "sirrus", "achenar", "gehn", "saavedro", "esher", "veovis", "aitrus", "kerath", "tegahn", "ronay", "nahfahsh", "korahn", "tomahn", "eder", "trebivdil", "chiso", "neferu", "kodama", "gemedet", "eedolorahn", "rehnay"];
const AVOID_SET = new Set(AVOID);
const plain = (s) => String(s).toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
/** Vrai si le nom est (ou commence par) le nom d'un Âge des jeux. */
const reserved = (name) => { const p = plain(name); return AVOID_SET.has(p) || AVOID.some((a) => a.length >= 4 && p.startsWith(a)); };
/** Deux ou trois syllabes ; une seule finale fermée (la dernière, le plus souvent), une apostrophe de temps en temps, comme « Ko'ahl ». */
function draw(r) {
  const n = r() < 0.6 ? 2 : 3, syl = [];
  for (let i = 0; i < n; i++) {
    const on = i === 0 && r() < 0.15 ? "" : ON[Math.floor(r() * ON.length)], nu = NU[Math.floor(r() * NU.length)];
    syl.push(on + nu + (i === n - 1 ? (r() < 0.7 ? CODA[Math.floor(r() * CODA.length)] : "") : ""));
  }
  const ap = n === 3 && r() < 0.3 ? 1 + Math.floor(r() * 2) : -1;
  const w = syl.map((x, i) => (i === ap ? "'" : "") + x).join("").replace(/([aeiou])\1\1+/g, "$1$1");
  return w.charAt(0).toUpperCase() + w.slice(1);
}
/**
 * Le nom d'un monde jamais écrit, tiré de sa graine : même graine, même nom. `taken(nom)` (facultatif) écarte des noms
 * déjà pris (on tire alors le suivant, toujours dans le même ordre). Jamais le nom d'un Âge des jeux.
 */
function nameOf(seed, taken = null) {
  const r = rng((Number(seed) ^ 0x6d2b79f5) >>> 0); r(); r();
  let last = null;
  for (let k = 0; k < 64; k++) {
    const w = draw(r); if (w.length < 4 || w.length > 11 || /[aeiou]{3}|(.)\1\1/.test(w.replace("'", "")) || reserved(w)) continue;
    last = w; if (!taken || !taken(w)) return w;
  }
  return last || "Nahreth";
}

// ---- le monde ------------------------------------------------------------------------------------------------------
/** Les premières pages d'une analyse, comme les cristaux de l'Imageur les lisent (src/imager.js, `crystalsOf`). */
const firstPages = (a) => IM.crystalsOf(a, "").ids;

/**
 * Le jugement de l'Art sur une clé, sans le hasard : la clé est cohérente et le moteur y voit un monde vivant (pas de tache
 * d'encre, pas mourant, ses premières pages sont ces cristaux dans cet ordre, aucune tension physique forte, et son ciel
 * retombe dans la même clé). Renvoie { a, name, seed, lines, text, target } ou null. Le moteur lit les pages du ciel avant
 * la matière : des cristaux qui posent la matière d'abord ne tombent jamais sur un monde.
 */
function judge(key, dep = {}) {
  const k = parseKey(key); if (!plausible(k) || typeof dep.analyse !== "function") return null;
  const lines = linesOf(key), seed = seedOf(key), name = nameOf(seed, dep.taken), text = [...lines, "seed: " + seed].join("\n"); // le nom que portera la note (jamais celui d'une note du coffre) : c'est aussi la graine du tirage
  let a = null; try { a = dep.analyse(text, name); } catch (e) { a = null; }
  if (!a || !a.resolved || a.verdict === "dying") return null;
  if ((a.resolved.lines || []).some((l) => l.unknown) || pageList(a, true).some((p) => p.blot)) return null; // une tache d'encre : ce n'est pas un monde
  if (firstPages(a).join(",") !== k.cry.join(",")) return null;
  if (a.physics && (a.physics.tensions || []).some((t) => t.severity === "strong")) return null;
  const target = IM.targetsOf(a, name);
  if (keyOf(k.cry, { ...target.lens, freq: target.freq, amp: target.amp }) !== key) return null; // accordé sur lui, on ne le perd pas
  return { a, name, seed, lines, text, target };
}

/**
 * Le monde jamais écrit que ces réglages font apparaître, ou null. `dep` : { analyse(src, name), prose?(resolved, opts),
 * scene?(analysis, name, text) → modèle génératif (src/genscene.js, `build(sceneOf(…))`), taken?(name) → vrai si une note
 * porte déjà ce nom }. Renvoie un candidat comme ceux de
 * l'étagère : { age: { name, path, unwritten }, data: { target, model, system: null, orbit: null }, unwritten: { key, seed,
 * name, lines, text, words, verdict } }. Le nom ne s'affiche pas : c'est celui qu'aura la note si on le transcrit (le
 * moteur tire les pages ouvertes avec le nom de la note : changer de nom change le tirage).
 */
function find(cry, s, dep = {}, key0 = null) {
  const key = key0 || keyOf(cry, s); // `key0` : une clé déjà connue (la transcription retire le même monde)
  if (!key || !lucky(key)) return null; // le hasard d'abord : il ne coûte rien, et la réponse est la même (les deux doivent dire oui)
  const j = judge(key, dep); if (!j) return null;
  const { a, name, seed, lines, text, target } = j;
  let model = null; try { model = dep.scene ? dep.scene(a, name, text) : null; } catch (e) { model = null; }
  let words = ""; try { words = dep.prose ? String(dep.prose(a.resolved, { seed: name }) || "") : ""; } catch (e) { words = ""; }
  return { age: { name, path: "unwritten:" + key, unwritten: true }, data: { target, model, system: null, orbit: null },
    unwritten: { key, seed, name, lines, text, words: snippet(words), verdict: a.verdict } };
}
/** Quelques mots de la description (le début de sa première phrase, sans la formule du tirage « …: »), pour la page du livre. */
function snippet(text, n = 6) {
  let s = String(text || "").split(/(?<=[.!?])\s/)[0].replace(/[.!?]+$/, "");
  const c = s.indexOf(": "); if (c >= 0 && c < s.length - 8) s = s.slice(c + 2);
  const w = s.split(/\s+/).filter(Boolean); if (!w.length) return "";
  const out = w.slice(0, n).join(" ").replace(/[,;:]+$/, ""); return out.charAt(0).toUpperCase() + out.slice(1) + (w.length > n ? "…" : "");
}

/** La note de transcription : { name, body }. `intro` : la phrase d'explication (dans la langue de l'utilisateur). */
function noteOf(u, intro = "") {
  const block = "```age\n" + u.lines.join("\n") + "\nseed: " + u.seed + "\n```";
  return { name: u.name, body: `# ${u.name}\n\n${intro ? intro + "\n\n" : ""}${block}\n` };
}

module.exports = { SLOTS, BIN, STAR_TOL, CHANCE, STARS, AVOID, keyOf, parseKey, plausible, roll, lucky, seedOf, linesOf, blockOf, nameOf, reserved, starOf, judge, find, snippet, noteOf, hoursOf, pressureOf, fluxOf };
