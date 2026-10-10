"use strict";
// Mode histoire — fondation. Un Relto « histoire » (propriété `relto_mode: story`) vit dans son propre dossier, séparé du
// bac à sable : son étagère et le décompte de ses Âges se limitent à ce dossier, les Âges de ce dossier n'apparaissent pas dans
// les autres Reltos, ses pages sont les récompenses des chapitres, et son avancement est gardé par Relto (même clé que
// l'état du télescope : nom + graine). Modèle pur : aucune dépendance à Obsidian, testable seul.
const M = require("./relto-model");
const { STABLE_AT } = require("./engine/analysis");
const { SKY_ENTRIES } = require("./engine/data/sky");

const MODE = "story";
// Les pages du ciel de base (soleils, cycle, lune, phénomènes) ne sont pas dans le registre des blocs : leur axe est dans SKY_ENTRIES.
const SKY_AXIS = new Map(SKY_ENTRIES.map((e) => [e.id, e.axis]));

/**
 * Les chapitres, dans l'ordre. `page` : la page du Relto que le chapitre donne (un préréglage de `relto-model`).
 * Un chapitre réussi débloque la suivante ; rien n'oblige à les faire, le bac à sable reste ouvert.
 */
const CHAPTERS = [
  { id: "rest", page: "page_chimney", title: { en: "A world to rest in", fr: "Un monde où se reposer" } },
  { id: "mend", page: "page_lanterns", title: { en: "Mending without breaking", fr: "Corriger sans casser" } },
];

/** Cette note de refuge est-elle un Relto histoire ? (propriétés de la note) */
const isStory = (fm) => !!fm && fm.relto_mode === MODE;

const chapterById = (id) => CHAPTERS.find((c) => c.id === id) || null;

/** Dossier d'un chemin de note (« a/b/c.md » → « a/b » ; une note à la racine → chaîne vide). */
const dirOf = (path) => { const s = String(path || ""), i = s.lastIndexOf("/"); return i < 0 ? "" : s.slice(0, i); };

/** Le chemin est-il dans l'un de ces dossiers (ou dans un de leurs sous-dossiers) ? Un dossier vide ne compte pas. */
const inDirs = (path, dirs) => {
  const p = String(path || "").toLowerCase();
  return (dirs || []).some((d) => { const q = String(d || "").toLowerCase().replace(/\/+$/, ""); return q !== "" && (p === q || p.startsWith(q + "/")); });
};

/**
 * Âges visibles d'un Relto : un Relto histoire ne voit que ceux de son dossier ; les autres Reltos ne voient aucun Âge d'un
 * dossier histoire. `storyDirs` : les dossiers de tous les Reltos histoire du coffre ; `mine` : celui de ce Relto (histoire seulement).
 */
function scopeAges(ages, { story, mine, storyDirs }) {
  const list = ages || [];
  if (story) return mine ? list.filter((a) => inDirs(a.path, [mine])) : list;
  return list.filter((a) => !inDirs(a.path, storyDirs));
}

/** Même règle pour les pages écrites dans des notes (les récompenses, elles, sont virtuelles : `rewardPages`). */
const scopePaths = (path, { story, mine, storyDirs }) => (story ? (mine ? inDirs(path, [mine]) : true) : !inDirs(path, storyDirs));

/** L'avancement d'un Relto : { done: [ids des chapitres réussis], seen: { nom d'Âge: 1 } }. Le crée au besoin ; `store` = `ext.story`. */
function get(store, key) {
  const e = store[key] && typeof store[key] === "object" ? store[key] : (store[key] = {});
  if (!Array.isArray(e.done)) e.done = [];
  if (!e.seen || typeof e.seen !== "object") e.seen = {};
  if (!e.notes || typeof e.notes !== "object") e.notes = {}; // chapitre → chemin de sa note
  return e;
}

/** Retient qu'un Âge a été vu sous le seuil de stabilité (un chapitre l'écrit abîmé exprès : il pourra le voir réparé). */
function noteSeen(store, key, name) { get(store, key).seen[String(name)] = 1; }

/** Les axes (ciel, terre/eau, vivant…) que couvrent des blocs écrits ; `axisOf(id)` renvoie l'axe d'un bloc (ou rien). */
const axesOf = (ids, axisOf) => new Set((ids || []).map((id) => (axisOf && axisOf(id)) || SKY_AXIS.get(id)).filter(Boolean));

/**
 * Le chapitre est-il réussi ? `ctx` : { ages (déjà limités au dossier), axisOf, seen }.
 * Renvoie { ok, why } ; `why` est la clé de ce qui manque (pour un indice), vide si réussi.
 */
function check(chapter, ctx) {
  const ages = (ctx && ctx.ages) || [], stable = ages.filter((a) => a.stability >= STABLE_AT);
  if (chapter.id === "rest") {
    // « un monde où se reposer » : stable, au moins quatre pages, un ciel, une terre ou de l'eau, un vivant
    if (!stable.length) return { ok: false, why: "stable" };
    const rich = stable.filter((a) => (a.glyphs || []).length >= 4);
    if (!rich.length) return { ok: false, why: "pages" };
    const full = rich.some((a) => { const ax = axesOf(a.glyphs, ctx.axisOf); return ax.has("cosmological") && ax.has("geological") && ax.has("ecological"); });
    return full ? { ok: true, why: "" } : { ok: false, why: "axes" };
  }
  if (chapter.id === "mend") {
    // « corriger sans casser » : un Âge vu abîmé est maintenant stable
    const seen = (ctx && ctx.seen) || {};
    return stable.some((a) => seen[a.name]) ? { ok: true, why: "" } : { ok: false, why: "mend" };
  }
  return { ok: false, why: "unknown" };
}

/**
 * Évalue les chapitres dans l'ordre et marque les réussis ; s'arrête au premier qui ne l'est pas.
 * Renvoie la liste des chapitres réussis à cet appel (vide le plus souvent).
 */
function evaluate(store, key, ctx) {
  const st = get(store, key), newly = [];
  for (const c of CHAPTERS) {
    if (st.done.includes(c.id)) continue;
    if (!check(c, { ...ctx, seen: st.seen }).ok) break;
    st.done.push(c.id); newly.push(c);
  }
  return newly;
}

/** Le mentor : un personnage inventé, qui écrit de courtes lettres. */
const MENTOR = "Adrin Vesparath"; // un clin d’œil à Adrian Vesper, en D’ni

/** Le prochain chapitre à faire (le premier non réussi), ou null quand l'histoire est finie (pour l'instant). */
const nextChapter = (done) => CHAPTERS.find((c) => !(done || []).includes(c.id)) || null;

// Les mondes de départ : le chapitre 1 donne une seule page (water) ; le chapitre 2 donne un monde abîmé (lava de trop) et son remède.
const WORLDS = {
  rest: { lines: ["water"] },
  mend: { lines: ["single_sun", "steady_cycle", "water", "lava"], fixed: ["single_sun", "steady_cycle", "water"] },
};

/**
 * Le nom de la note d'un chapitre. Le moteur tire des pages supplémentaires selon le nom : pour le chapitre « corriger », on
 * cherche un nom pour lequel le monde abîmé est bien instable ET le monde corrigé bien stable (sinon le chapitre serait injuste).
 * `analyse(texte, nom)` → { stability }.
 */
function chapterName(chapter, base, analyse) {
  const w = WORLDS[chapter.id];
  if (!w || !w.fixed || !analyse) return base;
  const st = (lines, nm) => { const a = analyse(lines.join("\n"), nm); return a && Number.isFinite(a.stability) ? a.stability : null; };
  for (let i = 0; i < 80; i++) {
    const nm = i ? `${base} ${i + 1}` : base, bad = st(w.lines, nm), good = st(w.fixed, nm);
    if (bad !== null && good !== null && bad < STABLE_AT && good >= STABLE_AT) return nm;
  }
  return base;
}

const LETTERS = {
  rest: {
    en: ["Come in. The cabin is yours; I only ask one thing of you.", "Write me a world where someone could rest: a sky that keeps its rhythm, ground or water under it, and something alive. At least four pages, and it must hold.", "Open the block below, add pages, and watch what the stability says."],
    fr: ["Entre. La cabane est à toi ; je ne te demande qu'une chose.", "Écris-moi un monde où l'on pourrait se reposer : un ciel qui garde son rythme, de la terre ou de l'eau dessous, et du vivant. Quatre pages au moins, et il doit tenir.", "Ouvre le bloc ci-dessous, ajoute des pages, et regarde ce que dit la stabilité."],
  },
  mend: {
    en: ["Well done. Now the harder half of the craft.", "I wrote this world in a hurry, and something in it is wrong. Find what, and mend it. Take out as little as you can: a world is not mended by emptying it.", "The world must end up stable."],
    fr: ["Bien joué. Voici maintenant la moitié la plus difficile du métier.", "J'ai écrit ce monde trop vite, et quelque chose y cloche. Trouve quoi, et corrige-le. Retire le moins possible : on ne répare pas un monde en le vidant.", "Le monde doit finir stable."],
  },
};

/** Le texte d'une note de chapitre : titre, lettre du mentor, ce qu'il faut faire, et le bloc `age` de départ. */
function chapterNote(chapter, lang, name) {
  const l = lang === "fr" ? "fr" : "en", w = WORLDS[chapter.id] || { lines: [] }, L = LETTERS[chapter.id][l];
  const title = chapter.title[l];
  return `# ${name}\n\n> ${title}\n\n${L[0]}\n\n${L[1]}\n\n**${l === "fr" ? "À faire" : "To do"}** — ${L[2]}\n\n— ${MENTOR}, seltahn\n\n\`\`\`age\n${w.lines.join("\n")}\n\`\`\`\n`;
}

/**
 * Les pages que donnent les chapitres, sous la forme d'une page du livre des pages (sans note) : verrouillées tant que le
 * chapitre n'est pas réussi, puis disponibles. Elles n'existent que dans un Relto histoire.
 */
function rewardPages() {
  const out = [];
  for (const c of CHAPTERS) {
    const preset = M.PAGE_PRESETS[c.page]; if (!preset) continue;
    const p = M.libraryPage({ id: c.page, label: preset.label, effects: preset.effects, unlock: null });
    out.push({ ...p, library: false, builtin: true, story: true, unlock: { age: null, minStability: 40, agesCount: null, page: null, zero: false, story: c.id, storyTitle: c.title.en } });
  }
  return out;
}

module.exports = { MODE, CHAPTERS, isStory, chapterById, dirOf, inDirs, scopeAges, scopePaths, get, noteSeen, axesOf, check, evaluate, rewardPages, MENTOR, WORLDS, nextChapter, chapterName, chapterNote };
