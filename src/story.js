"use strict";
// Mode histoire — fondation. Un Relto « histoire » (propriété `relto_mode: story`) vit dans son propre dossier, séparé du
// bac à sable : son étagère et le décompte de ses Âges se limitent à ce dossier, les Âges de ce dossier n'apparaissent pas dans
// les autres Reltos, ses pages sont les récompenses des chapitres, et son avancement est gardé par Relto (même clé que
// l'état du télescope : nom + graine). Modèle pur : aucune dépendance à Obsidian, testable seul.
const M = require("./relto-model");
const HEAR = require("./story-hear");
const { STABLE_AT } = require("./engine/analysis");
const { SKY_ENTRIES } = require("./engine/data/sky");
const { BUILTIN_BLOCKS } = require("./engine/registry");

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
  { id: "weather", page: "page_fireflies", title: { en: "A day that changes", fr: "Un jour qui change" } },
  { id: "laws", page: "page_aurora", title: { en: "The laws of a world", fr: "Les lois du monde" } },
  { id: "alter", page: "page_mountain", title: { en: "Changing what is written", fr: "Modifier ce qui est écrit" } },
  { id: "zero", page: "page_imager", title: { en: "Looking up", fr: "Lever les yeux" } },
  { id: "imager", page: "page_comets", title: { en: "Listening to the sky", fr: "Écouter le ciel" } },
  { id: "hard", page: "page_koi", title: { en: "The difficult world", fr: "Le monde difficile" } },
  { id: "strange", page: null, title: { en: "A strange and marvellous world", fr: "Un monde étrange et merveilleux" } }, // la récompense est la page de la fin
  /* le second livre (claude/DESIGN-reve-et-caverne-bahro.md, section 19) : la machine et la caverne ; le mentor découvre avec l'apprenti */
  { id: "give", page: "page_gold", book: 2, title: { en: "What a world gives", fr: "Ce que donne un monde" } },
  { id: "descend", page: "page_silver", book: 2, title: { en: "Going down", fr: "Descendre" } },
  { id: "lake", page: "page_gems", book: 2, title: { en: "The lake", fr: "Le lac" } },
  { id: "slab", page: null, book: 2, title: { en: "The slab", fr: "La dalle" } }, // pas de page : la dalle ouverte est le prix
  /* la seconde série (claude/DESIGN-art-bahro.md §2) : entendre, porter, l'accord, la pierre ; le prix est une page du livre des lois, pas une page du Relto */
  { id: "hear", page: null, law: 21, book: 3, title: { en: "Hearing", fr: "Entendre" } },
];
/** Le dernier chapitre du premier livre : sa fin (la page de l'encrier, la lettre du tiroir) reste la sienne. */
const BOOK_ONE_END = "strange";
const bookOneDone = (done) => (done || []).includes(BOOK_ONE_END);

/** Un indice facultatif, en mots, sans nommer de blocs (commande « Story: hint ») : seulement pour les chapitres dont la lettre ne dit pas la recette. */
const HINTS = {
  give: { // la recette n'est jamais dite : trois indices en mots, sans un chiffre (section 19.6)
    en: [
      "Light comes from what has burned, pressed hard; what feeds comes from what has rotted, pressed lightly.",
      "What gives light wants only the mineral, a little more ash than silt; a gentle fire, a long cooking.",
      "Read your failures: dust means it was not pressed enough; grey means the mix or the fire is wrong. Change one thing at a time.",
    ],
    fr: [
      "La lumière vient de ce qui a brûlé, pressé fort ; ce qui nourrit vient de ce qui a pourri, pressé peu.",
      "Ce qui éclaire ne veut que du minéral, un peu plus de cendres que de limon ; un feu doux, une longue cuisson.",
      "Lis tes ratés : une poussière, c'est qu'on n'a pas assez pressé ; un gris, c'est le mélange ou le feu. Ne change qu'une chose à la fois.",
    ],
  },
  strange: { // trois indices, de plus en plus précis (chaque appel à la commande en dévoile un de plus) ; les deux premiers ne nomment aucun bloc
    en: [
      "Some matters, set side by side, answer each other, and what they make is rarer than either. A strange stone changes what they answer. Not every sun is gold. And a world that has only earth and sky has never known what is written on a tablet.",
      "What is asked: a sun that is violet; something beyond sky and ground, as a tablet speaks; at least three gentle products born of matters that answer each other, one of them only with the strange stone's help; and a world that holds with margin (80% at least).",
      "The master's own world, if you must: violet_sun, steady_cycle, strange_stone, tablet, rain, drizzle, deep_cold. Try it, then make it yours.",
    ],
    fr: [
      "Certaines matières, posées côte à côte, se répondent, et ce qu'elles font est plus rare que chacune. Une pierre étrange change ce qu'elles répondent. Tous les soleils ne sont pas dorés. Et un monde qui n'a que la terre et le ciel n'a jamais su ce qu'une tablette dit.",
      "Ce qui est demandé : un soleil violet ; quelque chose au-delà du ciel et du sol, comme parle une tablette ; au moins trois produits doux nés de matières qui se répondent, dont un seulement avec l'aide de la pierre étrange ; et un monde qui tient avec de la marge (80 % au moins).",
      "Le monde du maître lui-même, s'il le faut : violet_sun, steady_cycle, strange_stone, tablet, rain, drizzle, deep_cold. Essaie-le, puis fais-le tien.",
    ],
  },
};

/** La page finale (pour l'instant : un encrier posé sur la table). Le nom reste neutre. */
const ENDGAME = { id: "page_endgame", label: "Inkwell", effects: { canvas_additions: [{ type: "inkwell", density: 1 }] } };

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
    if (!ages.length) return { ok: false, why: "noage" };
    if (!stable.length) return { ok: false, why: "stable" };
    const rich = stable.filter((a) => (a.glyphs || []).length >= 4);
    if (!rich.length) return { ok: false, why: "pages" };
    const full = rich.find((a) => { const ax = axesOf(a.glyphs, ctx.axisOf); return ax.has("cosmological") && ax.has("geological") && ax.has("ecological"); });
    return full ? { ok: true, why: "", path: full.path } : { ok: false, why: "axes" };
  }
  if (chapter.id === "mend") {
    // « corriger sans casser » : un Âge vu abîmé est maintenant stable
    const seen = (ctx && ctx.seen) || {};
    const m = stable.find((a) => seen[a.name]);
    return m ? { ok: true, why: "", path: m.path } : { ok: false, why: "mend" };
  }
  if (chapter.id === "weather") {
    // « un jour qui change » : un monde stable dont la météo suit une ligne programmée (rain: sometimes, dawn)
    if (!stable.length) return { ok: false, why: "stable" };
    const w = stable.find((a) => a.programmed > 0);
    return w ? { ok: true, why: "", path: w.path } : { ok: false, why: "program" };
  }
  if (chapter.id === "laws") {
    // « les lois du monde » : un monde stable qui écrit au moins deux valeurs physiques (mass: 0.8, age: 3.5…)
    if (!stable.length) return { ok: false, why: "stable" };
    const l = stable.find((a) => a.physics >= 2);
    return l ? { ok: true, why: "", path: l.path } : { ok: false, why: "physics" };
  }
  if (chapter.id === "zero") return ctx && ctx.zeroFound ? { ok: true, why: "" } : { ok: false, why: "zero" }; // « lever les yeux » : le Great Zero de ce Relto est trouvé
  if (chapter.id === "strange") {
    const win = ages.find((a) => strangeOk(a, ctx.axisOf)); if (win) return { ok: true, why: "", path: win.path };
    const miss = ages.map((a) => strangeMissing(a, ctx.axisOf)).sort((x, y) => x.length - y.length)[0]; // l'Âge le plus proche
    return { ok: false, why: "strange", missing: miss || ["sun", "stable", "reactions", "beyond"] };
  } // aucun message d'échec : le chapitre reste ouvert
  if (chapter.id === "hard") {
    // « le monde difficile » : tout ensemble, et qui tient (marge de 5) : huit pages au moins, quatre axes, une météo programmée, deux valeurs physiques
    const unmet = (a) => [a.stability >= STABLE_AT + 5 ? "" : "hardstable", (a.glyphs || []).length >= 8 ? "" : "hardpages", axesOf(a.glyphs, ctx.axisOf).size >= 4 ? "" : "hardaxes", a.programmed >= 1 ? "" : "program", a.physics >= 2 ? "" : "physics"].filter(Boolean);
    const good = ages.find((a) => !unmet(a).length);
    if (good) return { ok: true, why: "", path: good.path };
    if (!ages.length) return { ok: false, why: "noage" };
    const best = ages.reduce((m, a) => (unmet(a).length < unmet(m).length || (unmet(a).length === unmet(m).length && a.stability > m.stability) ? a : m)); // l'Âge le plus proche : on dit ce qui lui manque, d'abord
    return { ok: false, why: unmet(best)[0] };
  }
  if (chapter.id === "imager") { // « écouter le ciel » : l'Imageur est réglé et verrouillé sur l'un des Âges du dossier
    const tun = (ctx && ctx.tunings) || {};
    const k = ages.find((a) => tun[a.path] && tun[a.path].lock);
    if (k) return { ok: true, why: "", path: k.path };
    // l'Imageur de la Guilde (livre vierge) garde son verrou par Relto, pas par Âge : un verrou tenu sur l'un des Âges du dossier compte
    return ctx && ctx.guildLock && ages.length ? { ok: true, why: "" } : { ok: false, why: "lock" };
  }
  if (chapter.id === "give") { const c = (ctx && ctx.cave) || {}; return c.cookedWhite ? { ok: true, why: "" } : { ok: false, why: "white" }; } // un granulé blanc cuit dans ce Relto
  if (chapter.id === "descend") { const c = (ctx && ctx.cave) || {}; return c.revealed > 0 ? { ok: true, why: "" } : { ok: false, why: "reveal" }; } // une révélation vue d'en bas
  if (chapter.id === "lake") { const c = (ctx && ctx.cave) || {}; return !(c.colonies > 0) ? { ok: false, why: "lake" } : c.looked ? { ok: true, why: "" } : { ok: false, why: "look" }; } // le lac vit, et une goutte a été regardée
  if (chapter.id === "slab") { const c = (ctx && ctx.cave) || {}; return c.slabOpen ? { ok: true, why: "" } : { ok: false, why: "slab" }; } // la dalle ouverte (le Rêve viendra avec l'étape 4d)
  if (chapter.id === "hear") { const p = HEAR.answered((ctx && ctx.st) || {}, ages); return p ? { ok: true, why: "", path: p } : { ok: false, why: "hear" }; } /* les deux voix entre le monde étrange et un Âge qui s'accorde avec lui, à la tierce au moins */
  if (chapter.id === "alter") {
    // « modifier ce qui est écrit » : la note du chapitre a été modifiée après séchage de l'encre (Loi du Changement), et le monde tient encore
    const mine = ages.find((a) => a.path === ((ctx && ctx.notes) || {}).alter);
    if (!mine || !(mine.altered >= 1)) return { ok: false, why: "dry" };
    return mine.stability >= STABLE_AT ? { ok: true, why: "", path: mine.path } : { ok: false, why: "stable" };
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
    const r = check(c, { ...ctx, seen: st.seen, notes: st.notes, st });
    if (!r.ok) { st.why = r.why; st.missing = r.missing || null; break; }
    // (st.why : ce qui manque au chapitre en cours, une clé dont le plugin fait une phrase)
    if (r.path) (st.by || (st.by = {}))[c.id] = r.path; // l'Âge qui a réussi le chapitre (il reçoit l'étiquette)
    st.done.push(c.id); newly.push(c); st.why = ""; st.missing = null;
  }
  return newly;
}

/** Le mentor : un personnage inventé, qui écrit de courtes lettres. */
const MENTOR = "Adrin Vesparath"; // un clin d’œil à Adrian Vesper, en D’ni

const reactionsOfAnalysis = (a) => ((a && a.resolved && a.resolved.matter && a.resolved.matter.reactions) || []).map((r) => ({ shown: r.shown, type: r.type, catalyzed: !!r.catalyzed }));
const blockAxis = (id) => { try { const b = require("./engine/registry").blockById.get(id); return b ? b.axis : null; } catch (e) { return null; } };
// « Étrange » : des produits rares nés de réactions bénignes (pas de réaction violente, corrosive ou qui ronge)
const BENIGN = new Set(["transmuting", "crystallizing", "awakening", "soothing"]);
const benign = (rx) => (rx || []).filter((r) => BENIGN.has(r.type));
/** Le monde final : soleil violet, stable avec de la marge, au moins trois produits bénins dont un obtenu avec le catalyseur, et l'axe métaphysique. */
/** Ce qui manque encore à un monde pour le chapitre final (clés : sun, stable, reactions, catalyst, beyond). */
function strangeMissing(a, axisOf) {
  const rx = benign(a.reactions), glyphs = a.glyphs || [], out = [];
  if (!glyphs.includes("violet_sun")) out.push("sun");
  if (!(a.stability >= STABLE_AT + 5)) out.push("stable");
  if (rx.length < 3) out.push("reactions"); else if (!rx.some((r) => r.catalyzed)) out.push("catalyst");
  if (!axesOf(glyphs, axisOf).has("metaphysical")) out.push("beyond");
  return out;
}
function strangeOk(a, axisOf) {
  const rx = benign(a.reactions), glyphs = a.glyphs || [];
  return glyphs.includes("violet_sun") && a.stability >= STABLE_AT + 5 && rx.length >= 3 && rx.some((r) => r.catalyzed) && axesOf(glyphs, axisOf).has("metaphysical");
}

/** Le prochain chapitre à faire (le premier non réussi), ou null quand l'histoire est finie (pour l'instant). */
const nextChapter = (done) => CHAPTERS.find((c) => !(done || []).includes(c.id)) || null;

// Les mondes de départ : le chapitre 1 donne une seule page (water) ; le chapitre 2 donne un monde abîmé (lava de trop) et son remède.
const WORLDS = {
  rest: { lines: ["water"] },
  mend: { lines: ["single_sun", "steady_cycle", "water", "lava"], fixed: ["single_sun", "steady_cycle", "water"] },
  strange: { lines: ["steady_cycle", "water"], ref: ["violet_sun", "steady_cycle", "strange_stone", "tablet", "rain", "drizzle", "deep_cold"], strange: true }, // `ref` : un monde qui répond (pour choisir un nom qui le permet)
  hard: { lines: ["single_sun", "steady_cycle"], ref: ["single_sun", "steady_cycle", "water", "sand", "fern", "grass", "rain", "fog"] }, // `ref` : un monde qui répond à tout (pour choisir un nom qui le laisse tenir)
  zero: { lines: [] },
  imager: { lines: [] },
  alter: { lines: ["single_sun", "steady_cycle", "water", "sand", "fern"], stable: true, margin: 15 }, // une marge large : la modification elle-même coûte (Loi du Changement)
  laws: { lines: ["single_sun", "steady_cycle", "water", "salt"], stable: true },
  weather: { lines: ["single_sun", "steady_cycle", "water", "rain"], stable: true }, // le monde de départ doit tenir : seule la météo reste à écrire
  give: { lines: ["single_sun", "steady_cycle", "water"], stable: true }, // un monde qui tient ; ce qu'il donnera reste à écrire
  descend: { lines: [] },
  lake: { lines: [] },
  slab: { lines: [] },
  hear: { lines: [] },
};

/**
 * Le nom de la note d'un chapitre. Le moteur tire des pages supplémentaires selon le nom : pour le chapitre « corriger », on
 * cherche un nom pour lequel le monde abîmé est bien instable ET le monde corrigé bien stable (sinon le chapitre serait injuste).
 * `analyse(texte, nom)` → { stability }.
 */
function chapterName(chapter, nameAt, analyse) {
  // `nameAt` : un nom de base (les variantes : « X 2 », « X 3 »…) ou une fonction i → nom (le Âge 1, Âge 2… du Relto histoire)
  const at = (i) => (typeof nameAt === "function" ? nameAt(i) : i ? `${nameAt} ${i + 1}` : nameAt), base = at(0);
  const w = WORLDS[chapter.id];
  if (w && w.stable && analyse) { // un monde de départ qui tient avec de la marge, pour ce nom
    for (let i = 0; i < 80; i++) { const nm = at(i), a = analyse(w.lines.join("\n"), nm); if (a && a.stability >= STABLE_AT + (w.margin || 5)) return nm; }
    return base;
  }
  if (w && w.ref && analyse) { // un nom pour lequel une solution existe, avec de la marge
    for (let i = 0; i < 120; i++) {
      const nm = at(i), a = analyse(w.ref.join("\n"), nm); if (!a) continue;
      const ok = w.strange ? strangeOk({ glyphs: w.ref, stability: a.stability, reactions: reactionsOfAnalysis(a) }, (id) => { const b = blockAxis(id); return b; }) : a.stability >= STABLE_AT + 5;
      if (ok) return nm;
    }
    return base;
  }
  if (!w || !w.fixed || !analyse) return base;
  const st = (lines, nm) => { const a = analyse(lines.join("\n"), nm); return a && Number.isFinite(a.stability) ? a.stability : null; };
  for (let i = 0; i < 80; i++) {
    const nm = at(i), bad = st(w.lines, nm), good = st(w.fixed, nm);
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
  laws: {
    en: ["A world is also a weight and an age.", "Look at what the book answers under your block: water and salt, set side by side, already answer each other. Now give this world its laws. Under the pages, write two values, one per line, with a colon: how heavy the world is, and how old.", "Add `mass: 0.8` and `age: 3.5` to the block, and keep the world stable."],
    fr: ["Un monde, c'est aussi un poids et un âge.", "Regarde ce que le livre répond sous ton bloc : l'eau et le sel, posés côte à côte, se répondent déjà. Donne maintenant ses lois à ce monde. Sous les pages, écris deux valeurs, une par ligne, avec deux-points : le poids du monde, et son âge.", "Ajoute `mass: 0.8` et `age: 3.5` au bloc, et garde le monde stable."],
  },
  alter: {
    en: ["Ink needs time to dry.", "Until it has, you may change a book as you like. Afterwards, every change is paid for: a world is not rewritten, it is bound to. Wait for the ink of this book to dry (two minutes for this book; the small line by the tabs counts it down), then change one thing in it, and see that it holds.", "Once the ink is dry, add or remove a single page, and keep the world stable."],
    fr: ["L'encre a besoin de temps pour sécher.", "Tant qu'elle n'a pas séché, tu peux changer un livre à ta guise. Ensuite, chaque changement se paie : on ne réécrit pas un monde, on s'y lie. Attends que l'encre de ce livre soit sèche (deux minutes pour ce livre ; la petite ligne près des onglets les décompte), puis change une seule chose, et vois qu'il tient.", "Une fois l'encre sèche, ajoute ou retire une seule page, et garde le monde stable."],
  },
  zero: {
    en: ["A writer who only looks down at the page never learns where the page is.", "Every Relto hides its own Great Zero, the reference all linking is measured from. The cabin has a summit, and on it a small observatory. Place the Mountains page, let the telescope follow, and look up. Find your Zero.", "Find your Relto's Great Zero with the telescope."],
    fr: ["Un écrivain qui ne regarde que sa page n'apprend jamais où se trouve la page.", "Chaque Relto cache son propre Great Zero, la référence dont se mesure toute liaison. La cabane a un sommet, et sur le sommet un petit observatoire. Pose la page des Montagnes, laisse venir le télescope, et lève les yeux. Trouve ton Zéro.", "Trouve le Great Zero de ton Relto avec le télescope."],
  },
  imager: {
    en: ["Every Age hums. Most writers never hear it.", "The cabin has a machine of brass and crystal, and it listens. The Great Zero told you where; now learn to hear. Choose one of your Ages, tune the machine until its image is clear, and fix the tuning so it holds.", "Tune the Imager on one of your Ages until the image is sharp, then lock it with the lever."],
    fr: ["Chaque Âge bourdonne. La plupart des écrivains ne l'entendent jamais.", "La cabane a une machine de laiton et de cristal, et elle écoute. Le Great Zero t'a dit où ; apprends maintenant à entendre. Choisis l'un de tes Âges, règle la machine jusqu'à ce que l'image soit nette, et fixe le réglage pour qu'il tienne.", "Règle l'Imageur sur l'un de tes Âges jusqu'à ce que l'image soit nette, puis verrouille-le avec le levier."],
  },
  hard: {
    en: ["You have learned each part. Now the whole.", "Write me a difficult world: one that has everything at once, a sky and the ground under it, something alive, days that change, and laws of its own. Every part you add makes the others harder to keep. It must still hold.", "Write a stable world of at least eight pages, covering four of the five axes, with a programmed weather line (`rain: sometimes, dawn`) and two physical values (`mass`, `age`)."],
    fr: ["Tu connais chaque partie. Voici le tout.", "Écris-moi un monde difficile : un monde qui a tout à la fois, un ciel et la terre dessous, du vivant, des jours qui changent, et ses propres lois. Chaque partie que tu ajoutes rend les autres plus dures à tenir. Il doit pourtant tenir.", "Écris un monde stable d'au moins huit pages, qui couvre quatre des cinq axes, avec une ligne de météo programmée (`rain: sometimes, dawn`) et deux valeurs physiques (`mass`, `age`)."],
  },
  strange: {
    en: ["Last of all, a thing I cannot teach.", "Write me a world nobody would expect, and that holds anyway.", ""],
    fr: ["Enfin, une chose que je ne peux pas t'enseigner.", "Écris-moi un monde que personne n'attendrait, et qui tienne quand même.", ""],
  },
  give: {
    en: ["I thought I had taught you everything. I was wrong: there is a door I have never opened.", "Against the cabin there is a lean-to, and in it a machine I found there long before you came. It does not bake bread. It waits for what worlds give: some grounds, when something grows in them, leave a measure every day. Write a world that gives, and learn what the machine makes of it. I never knew how to set it. Perhaps you will.", "Write a world that gives. Cook, fail, start again, until a white pellet comes out of the oven."],
    fr: ["Je croyais t'avoir tout appris. Je me trompais : il reste une porte que je n'ai jamais ouverte.", "Contre la cabane, il y a un appentis, et dedans une machine que j'ai trouvée là bien avant toi. Elle ne cuit pas le pain. Elle attend ce que donnent les mondes : certains sols, quand quelque chose y pousse, en laissent une mesure chaque jour. Écris un monde qui donne, et apprends ce que la machine en fait. Je n'ai jamais su la régler. Toi, peut-être.", "Écris un monde qui donne. Cuis, rate, recommence, jusqu'à ce qu'un granulé blanc sorte du four."],
  },
  descend: {
    en: ["The white pellet glows, even in a drawer. I did not dare keep it near me.", "Under the cellar there is a trapdoor. I have always felt it cold under my feet, and I never lifted it. They say there is a shaft below, and at the bottom of the shaft it is dark as before writing. Go down. What you see there, you will tell me.", "Drop a white pellet down the shaft, and be at the bottom when it touches the water."],
    fr: ["Le granulé blanc luit, même dans le tiroir. Je n'ai pas osé le garder près de moi.", "Sous le cellier, il y a une trappe. Je l'ai toujours sentie froide sous mes pieds, et je ne l'ai jamais soulevée. On dit qu'en bas il y a un puits, et qu'au fond du puits il fait noir comme avant l'écriture. Descends. Ce que tu y verras, tu me le raconteras.", "Lâche un granulé blanc dans le puits, et sois en bas quand il touche l'eau."],
  },
  lake: {
    en: ["You write that there are paintings, down there. I did not sleep.", "They last only a moment, you say, then the dark comes back. But the water at the bottom: is it dead, or only hungry? There is a microscope on your desk; I never understood what it was for. Perhaps this. Feed the water, and look at what lives in it.", "Bring the lake to life, then look at a drop of its water under the microscope in the writing room."],
    fr: ["Tu m'écris qu'il y a des peintures, en bas. Je n'en ai pas dormi.", "Elles ne restent qu'un instant, dis-tu, puis le noir revient. Mais l'eau du fond : est-elle morte, ou seulement affamée ? Il y a sur ton bureau un microscope dont je n'ai jamais compris l'usage. Peut-être est-ce celui-là. Nourris l'eau, et regarde ce qui y vit.", "Fais vivre le lac, puis regarde une goutte de son eau au microscope de l'atelier."],
  },
  slab: {
    en: ["The signs along the vein, the ones you described to me: I looked for them in all my books. They are not there.", "They are not words of the Guild. Someone else writes, down there, and has for longer than we have. You tell me a slab rose from the water in the room where you keep your memories, the evening you first went down. Perhaps it is waiting for those signs. What you read below, carry it up there. Open it, and tell me what its water shows.", "Remember the signs, and open the slab."],
    fr: ["Les signes de la veine, ceux que tu m'as décrits : je les ai cherchés dans tous mes livres. Ils n'y sont pas.", "Ce ne sont pas des mots de la Guilde. Quelqu'un d'autre écrit, là-dessous, et depuis plus longtemps que nous. Tu me dis qu'une dalle est sortie de l'eau dans la chambre où tu gardes tes souvenirs, le soir de ta première descente. Elle attend peut-être ces signes. Ce que tu as lu en bas, rapporte-le là-haut. Ouvre-la, et dis-moi ce que montre son eau.", "Retiens les signes, et ouvre la dalle."],
  },
  hear: {
    en: ["Your ink does not dry. I saw it on the seal of that strange world you wrote me: it stays wet, and your changes cost you nothing. Neither did mine, long ago, on a single Book. I never knew why.", "I must confess something. The eighteen laws I taught you are the Guild's; the book counts twenty-five, and the other pages I cannot read. I was told they are not read: they are heard. So listen. Set that world on the Imager and play its chord. Then look, among your Ages, for the one that answers it; if none does, write it a day that agrees with that one's.", "Play the two voices between the strange world and an Age that agrees with it."],
    fr: ["Ton encre ne sèche pas. Je l'ai vu sur la pastille de ce monde étrange que tu m'as écrit : elle reste humide, et tes retouches ne te coûtent rien. La mienne non plus, autrefois, sur un seul Livre. Je n'ai jamais su pourquoi.", "Il faut que je t'avoue une chose. Les dix-huit lois que je t'ai apprises sont celles de la Guilde ; le livre en compte vingt-cinq, et les autres pages, je ne sais pas les lire. On m'a dit qu'elles ne se lisent pas : qu'elles s'entendent. Alors écoute. Pose ce monde sur l'Imageur et joue son accord. Puis cherche, parmi tes Âges, celui qui lui répond ; s'il n'en est aucun, écris-lui un jour qui s'accorde au sien.", "Joue les deux voix entre le monde étrange et un Âge qui s'accorde avec lui."],
  },
  weather: {
    en: ["A world that never changes is a painting. Let us make it a day.", "Here the rain falls without end. Teach it manners: let it fall only sometimes, and only at dawn. A line can carry a frequency and a moment, after a colon.", "Rewrite the rain line as `rain: sometimes, dawn`, and keep the world stable."],
    fr: ["Un monde qui ne change jamais est un tableau. Faisons-en un jour.", "Ici la pluie tombe sans fin. Apprends-lui les manières : qu'elle ne tombe que parfois, et seulement à l'aube. Une ligne peut porter une fréquence et un moment, après deux-points.", "Récris la ligne de pluie ainsi : `rain: sometimes, dawn`, et garde le monde stable."],
  },
};

/**
 * La feuille de cours : ce que la Guilde des Writers fait apprendre dans le chapitre (les noms des blocs, à connaître par cœur
 * plutôt qu'à chercher dans la référence). [bloc, sens en anglais, sens en français]. Pas de feuille pour les épreuves (le monde
 * difficile, le monde étrange) : il faut alors savoir.
 */
const COURSE = {
  rest: [["single_sun", "one sun: the plain sky", "un seul soleil : le ciel simple"], ["steady_cycle", "day and night that keep their rhythm", "un jour et une nuit qui gardent leur rythme"], ["water", "water: ground that flows", "l'eau : une terre qui coule"], ["sand", "dry, shifting ground", "un sol sec et mouvant"], ["stone", "heavy, patient ground", "un sol lourd et patient"], ["fern", "something alive, in the damp", "du vivant, dans l'humide"], ["grass", "something alive, low and restless", "du vivant, bas et remuant"], ["moss", "something alive, soft and quiet", "du vivant, doux et silencieux"]],
  mend: [["lava", "searing, molten ground", "un sol brûlant, en fusion"], ["ice", "pale, brittle ground: cold", "un sol pâle et cassant : le froid"], ["twin_suns", "two suns: a heavier sky", "deux soleils : un ciel plus lourd"]],
  weather: [["rain", "steady rain", "une pluie continue"], ["drizzle", "fine rain, silver and hushed", "une bruine fine, argentée"], ["fog", "thick, pale, muffling", "épaisse, pâle, étouffante"], ["snow", "white and soundless", "blanche et sans bruit"], ["storm", "churning, dark, loud", "tourmentée, sombre, bruyante"], ["wind", "restless, thin, cold", "agité, mince, froid"]],
  give: [["ash", "what is left of fire: a pale powder", "ce qui reste du feu : une poudre pâle"], ["humus", "loam: dark earth that crumbles", "le terreau : une terre sombre qui s'émiette"], ["silt", "silt: it is not written, it is born of water on ash", "le limon : il ne s'écrit pas, il naît de l'eau sur les cendres"], ["peat", "red-brown, fibrous ground, slow to rot", "un sol brun-roux, fibreux, lent à pourrir"]],
  laws: [["salt", "bitter, bright ground", "un sol amer et brillant"], ["mass", "a value, written with a colon: how heavy the world is", "une valeur, écrite avec deux-points : le poids du monde"], ["age", "a value, written with a colon: how old the world is", "une valeur, écrite avec deux-points : l'âge du monde"]],
};
const AXIS_WORD = { cosmological: { en: "sky", fr: "ciel" }, geological: { en: "ground", fr: "sol" }, ecological: { en: "living", fr: "vivant" }, weather: { en: "weather", fr: "météo" }, metaphysical: { en: "beyond", fr: "au-delà" } };
function courseSheet(id, lang) {
  const rows = COURSE[id]; if (!rows) return "";
  const l = lang === "fr" ? "fr" : "en", ax = (b) => { const x = (BUILTIN_BLOCKS.find((q) => q.id === b) || SKY_ENTRIES.find((q) => q.id === b) || {}).axis; return AXIS_WORD[x] ? AXIS_WORD[x][l] : "—"; };
  return `\n\n---\n**${l === "fr" ? "Feuille de cours · Guilde des Writers" : "Course sheet · the Writers' Guild"}**\n${l === "fr" ? "À savoir par cœur : c'est ainsi qu'on les écrit." : "To know by heart: this is how they are written."}\n\n| ${l === "fr" ? "Mot" : "Word"} | ${l === "fr" ? "Famille" : "Kind"} | ${l === "fr" ? "Sens" : "Meaning"} |\n|---|---|---|\n${rows.map((r) => `| \`${r[0]}\` | ${COURSE_NOAXIS.has(r[0]) ? "—" : ax(r[0])} | ${r[l === "fr" ? 2 : 1]} |`).join("\n")}\n`;
}
/** La feuille s'efface : en révision, le mot n'est plus donné qu'à moitié (niveau 1 : l'initiale et la longueur), puis plus du tout (niveau 2). */
const REVIEW = { alter: { level: 1, ids: ["sand", "fern", "rain", "salt"] }, zero: { level: 2, ids: ["lava", "ice", "snow", "grass"] }, imager: { level: 2, ids: ["storm", "fog", "moss", "stone"] } };
function reviewSheet(id, lang) {
  const rv = REVIEW[id]; if (!rv) return "";
  const l = lang === "fr" ? "fr" : "en", all = Object.values(COURSE).flat(), rows = rv.ids.map((w) => all.find((r) => r[0] === w)).filter(Boolean);
  const hint = (w) => (rv.level === 1 ? `\`${w[0]}${"_".repeat(w.length - 1)}\`` : "?");
  return `\n\n---\n**${l === "fr" ? "Révision · Guilde des Writers" : "Review · the Writers' Guild"}**\n${l === "fr" ? "Retrouve le mot, de mémoire." : "Find the word, from memory."}\n\n| ${l === "fr" ? "Mot" : "Word"} | ${l === "fr" ? "Sens" : "Meaning"} |\n|---|---|\n${rows.map((r) => `| ${hint(r[0])} | ${r[l === "fr" ? 2 : 1]} |`).join("\n")}\n`;
}
const COURSE_NOAXIS = new Set(["mass", "age"]);

/** Le texte d'une note de chapitre : titre, lettre du mentor, ce qu'il faut faire, et le bloc `age` de départ. */
/** Un chapitre d'écriture (un Âge à écrire) ou d'exploration (le Relto seul : télescope, Imageur). */
const kindOf = (chapter) => (["zero", "imager", "descend", "lake", "slab", "hear"].includes(chapter.id) ? "explore" : "write");
const KIND_LABEL = { write: { en: "Writing exercise", fr: "Exercice d'écriture" }, explore: { en: "Relto exploration", fr: "Exploration du Relto" } };
/** Le nom de la note d'une exploration : le titre du chapitre (jamais « Age N », qui est réservé aux Âges à écrire). `taken` : noms déjà pris. */
function exploreName(chapter, lang, taken) {
  const base = chapter.title[lang === "fr" ? "fr" : "en"].replace(/[\\/:*?"<>|#^\[\]]/g, ""); let nm = base, k = 1;
  while (taken && taken.has(nm)) nm = `${base} ${++k}`;
  return nm;
}

function chapterNote(chapter, lang, name) {
  const l = lang === "fr" ? "fr" : "en", w = WORLDS[chapter.id] || { lines: [] }, L = LETTERS[chapter.id][l];
  const title = (chapter.id === "mend" ? "Deseekay · " : "") + chapter.title[l]; // deseekay : « énigme », en D'ni
  const kind = kindOf(chapter);
  return `---\nstory_kind: ${kind === "write" ? "writing-exercise" : "relto-exploration"}\n---\n# ${name}\n\n> ${kind === "write" ? "✒" : "✦"} ${KIND_LABEL[kind][l]} · ${title}\n\n${L[0]}\n\n${L[1]}\n\n${L[2] ? `**${l === "fr" ? "À faire" : "To do"}** — ${L[2]}\n\n` : ""}— ${MENTOR}, seltahn${courseSheet(chapter.id, l)}${reviewSheet(chapter.id, l)}${w.lines.length ? `\n\n\`\`\`age\n${w.lines.join("\n")}\n\`\`\`` : ""}\n`;
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
  // la page de la fin : une pièce d'écriture posée sur la table, qui s'ouvre quand tous les chapitres sont faits
  const p = M.libraryPage({ id: ENDGAME.id, label: ENDGAME.label, effects: ENDGAME.effects, unlock: null });
  out.push({ ...p, library: false, builtin: true, story: true, unlock: { age: null, minStability: 40, agesCount: null, page: null, zero: false, story: "end", storyTitle: "the last chapter" } });
  return out;
}

/** Le moteur tire-t-il des pages au hasard dans les Âges de l'histoire ? Pas avant l'Imageur : il faut écrire ses glyphes soi-même. */
const drawsOn = (done) => (done || []).includes("imager");

/**
 * Les blocs que la palette du livre montre dans un Âge de l'histoire : ce que la Guilde a fait apprendre jusqu'au chapitre en cours
 * (feuilles de cours et mondes de départ), jusqu'au dernier chapitre : un glyphe qu'on n'a pas appris s'écrit à la main, il n'est pas dans la palette.
 */
function knownBlocks(done, hintN) {
  const set = new Set(), cur = nextChapter(done), upto = cur ? CHAPTERS.findIndex((c) => c.id === cur.id) : CHAPTERS.length - 1;
  for (const c of CHAPTERS.slice(0, upto + 1)) { for (const r of COURSE[c.id] || []) set.add(r[0]); for (const b of (WORLDS[c.id] || {}).lines || []) set.add(b); }
  // le dernier indice (le monde du maître) donne ses mots : ils entrent dans la palette
  if (hintN && hintN.strange >= 2) for (const b of WORLDS.strange.ref) set.add(b);
  return set;
}

module.exports = { BOOK_ONE_END, bookOneDone, KIND_LABEL, kindOf, exploreName, knownBlocks, REVIEW, reviewSheet, COURSE, courseSheet, drawsOn, MODE, CHAPTERS, isStory, chapterById, dirOf, inDirs, scopeAges, scopePaths, get, noteSeen, axesOf, check, evaluate, rewardPages, ENDGAME, strangeOk, HINTS, MENTOR, WORLDS, nextChapter, chapterName, chapterNote };
