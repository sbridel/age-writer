"use strict";
const FLW = require("./relto-flower");
const obsidian = require("obsidian");
/** Un écran tactile (Obsidian mobile, ou un pointeur grossier : tablette, téléphone). */
function isTouch() { try { if (obsidian.Platform && obsidian.Platform.isMobile) return true; return !!(typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches); } catch (e) { return false; } }
const M = require("./relto-model");
const { ReltoRenderer } = require("./relto-render");
const sound = require("./sound");
const MAIL = require("./story-mail");
const { setMarkup, esc, leaveFullscreen, leaveFullscreenAsync } = require("./util");
const G = require("./genscene");
const SKY = require("./sky");
const DR = require("./dream");
const IM = require("./imager");
const X = require("./ui-extras");
const DT = require("./dnitime");
const B = require("./relto-books");
const TEL = require("./telescope");
const INS = require("./instruments");
const DC = require("./dniclock");
const SS = require("./starsystem");
const CAL = require("./calibration");
const UW = require("./unwritten");
const ST = require("./story");
const HEAR = require("./story-hear");
const WARD = require("./ward"); /* le cachet et la garde (étape D) */
const STONE = require("./story-stone"); /* le chapitre 17, la pierre (étape E) */
const SLATE = require("./slate"); /* l'ardoise (étape F) */
const DB = require("./relto-descbook");
const LEC = require("./lectern");

const AUDIO_EXT = ["mp3", "ogg", "wav", "m4a", "flac"];

function parseOptions(src) {
  const o = {};
  for (const l of String(src).split("\n")) { const m = l.match(/^\s*(source|time|height|pages|inscription|folders?|exclude|books?|only|dni_time)\s*:\s*(.+?)\s*$/i); if (m) { let k = m[1].toLowerCase(); if (k === "folder") k = "folders"; else if (k === "book" || k === "only") k = "books"; o[k] = m[2]; } }
  return o;
}

const fmOf = (app, f) => (app.metadataCache.getFileCache(f) || {}).frontmatter || {};
const isHub = (app, f) => fmOf(app, f).age_type === "personal_hub";
const isStoryHub = (app, f) => isHub(app, f) && ST.isStory(fmOf(app, f));
/**
 * La réserve (section 19.2 de la fiche de la caverne) d'une note : la clé du Relto histoire dont elle est dans le dossier
 * (nom + graine, comme l'avancement), ou null (le bac à sable).
 */
function storyPoolOfPath(app, path) {
  for (const f of app.vault.getMarkdownFiles()) { if (!isStoryHub(app, f)) continue; const d = ST.dirOf(f.path); if (d && ST.inDirs(path, [d])) return TEL.keyOf(f.basename, M.parseRelto(fmOf(app, f)).seed); }
  return null;
}
/** La réserve d'une scène de Relto : la sienne si c'est un Relto histoire, sinon le bac à sable. */
const poolOfScene = (sc) => (sc && sc.mode === "story" ? TEL.keyOf(sc.name, sc.seed) : null);
/** Les dossiers de tous les Reltos histoire du coffre (leurs Âges et leurs pages ne se mêlent pas à ceux du bac à sable). */
const storyDirsOf = (app) => app.vault.getMarkdownFiles().filter((f) => isStoryHub(app, f)).map((f) => ST.dirOf(f.path)).filter(Boolean);

function findReltoFile(plugin, opt, sourcePath) {
  const { app } = plugin;
  if (opt.source) return app.metadataCache.getFirstLinkpathDest(M.stripLink(opt.source), sourcePath);
  const here = app.vault.getAbstractFileByPath(sourcePath);
  if (here && here.extension === "md" && isHub(app, here)) return here;
  return app.vault.getMarkdownFiles().find((f) => isHub(app, f) && !isStoryHub(app, f)) || null; // sans précision, le Relto du bac à sable
}

const LIB_RE = /```relto-library[ \t]*\r?\n([\s\S]*?)```/g;
/** Pages définies dans des blocs `relto-library` (cache par date de modification). */
async function libraryPages(plugin) {
  const { app } = plugin, cache = (plugin.relLibCache = plugin.relLibCache || new Map()), out = [], problems = [], seen = new Set();
  for (const f of app.vault.getMarkdownFiles()) {
    const c = app.metadataCache.getFileCache(f);
    if (c && !(c.sections || []).some((s) => s.type === "code")) continue;
    let e = cache.get(f.path);
    if (!e || e.mtime !== f.stat.mtime) {
      const text = await app.vault.cachedRead(f), blocks = [...text.matchAll(LIB_RE)].map((m) => m[1]);
      e = { mtime: f.stat.mtime, res: blocks.map((b) => M.parseReltoLibrary(b)) }; cache.set(f.path, e);
    }
    for (const r of e.res) { for (const p of r.pages) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); } problems.push(...r.problems.map((x) => ({ ...x, file: f.path }))); }
  }
  return { pages: out, problems };
}

async function buildScene(plugin, file, opt = {}) {
  const { app } = plugin;
  const relto = { ...M.parseRelto(fmOf(app, file)), name: file.basename };
  { const g = (plugin.ext.telescope || {})[TEL.keyOf(relto.name, relto.seed)]; relto.zeroFound = !!(g && g.found); } // débloque l'horloge D'ni
  // Relto histoire : son dossier, ses Âges, ses pages (récompenses) ; les autres Reltos ne voient rien de ce dossier
  const story = relto.mode === "story", mine = story ? ST.dirOf(file.path) : "", scope = { story, mine, storyDirs: storyDirsOf(app) };
  const pages = [];
  for (const f of app.vault.getMarkdownFiles()) {
    const fm = fmOf(app, f);
    if (fm.relto_page_id && ST.scopePaths(f.path, scope)) { const p = M.parsePage(fm, f.path); if (p) pages.push(p); }
  }
  // une page écrite dans une note l'emporte sur la même page de la bibliothèque (la bibliothèque est celle du bac à sable)
  if (!story) for (const lp of (await libraryPages(plugin)).pages) if (!pages.some((p) => p.id === lp.id)) pages.push(M.libraryPage(lp));
  for (const bp of M.builtinPages({ story })) if (!pages.some((p) => p.id === bp.id)) pages.push(bp); // le télescope : présent d'office, débloqué par le premier Âge
  if (story) for (const rp of ST.rewardPages()) if (!pages.some((p) => p.id === rp.id)) pages.push(rp); // les récompenses des chapitres
  const ages = ST.scopeAges((await plugin.index.list()).filter((a) => a.path !== file.path), scope);
  if (story) { // l'avancement : évalué à chaque lecture de la scène (les Âges du dossier sont ceux d'ici)
    const store = plugin.ext.story || (plugin.ext.story = {}), key = TEL.keyOf(relto.name, relto.seed);
    const axisOf = (id) => { const b = plugin.core && plugin.core.blocks && plugin.core.blocks.get ? plugin.core.blocks.get(id) : null; return b ? b.axis : null; };
    const X = plugin.poolExt ? plugin.poolExt(key) : {}, cv = (X && X.cave) || {}, slab = (cv.slabs || {})[key] || {}; /* la réserve de ce Relto : ce que la machine et la caverne ont vu (chapitres 10 à 13) */
    const cave = { cookedWhite: !!X.cookedWhite, revealed: cv.revealed || 0, colonies: cv.colonies || 0, looked: !!cv.looked, slabOpen: !!slab.open, degree: require("./fresco").lakeDegree(cv.colonies || 0, cv.fedAt || 0, Date.now()) };
    if (STONE.watch(ST.get(store, key), cave.degree, Date.now())) plugin.saveExt(); /* le 17 : le chemin d'en bas s'ouvre ; un jour plus tard, sans la pierre lâchée, le commandement */
    if (STONE.tellCommand(ST.get(store, key))) { plugin.saveExt(); new obsidian.Notice(plugin.t("stone.command"), 12000); }
    const done = ST.evaluate(store, key, { ages, axisOf, zeroFound: relto.zeroFound, tunings: plugin.ext.imagerTunings, guildLock: !!((plugin.ext.imagerTunings || {})["guild:" + key] || {}).lock, cave });
    if (done.length) { for (const c of done) if (c.id === "hear") HEAR.visitFrom(ST.get(store, key), Date.now()); /* la nuit qui vient, la visite */ resetStoryDraw(plugin); /* l'encre du monde étrange (le 14 s'ouvre) */ plugin.saveExt(); for (const c of done) { new obsidian.Notice(plugin.t(c.page || c.id === ST.BOOK_ONE_END ? "story.done" : "story.done.nopage", { title: plugin.lang() === "fr" ? c.title.fr : c.title.en })); markChapterDone(plugin, c, ST.get(store, key)); } }
    relto.storyDone = ST.get(store, key).done.concat(ST.bookOneDone(ST.get(store, key).done) ? ["end"] : []); // « end » : la fin du premier livre (le chapitre 9 ; le second livre continue après)
  }
  // choix des livres : options du bloc (folders / exclude / books) ; à défaut, liste du refuge (relto_books)
  const fm = fmOf(app, file), rules = { folders: opt.folders || fm.relto_folders, exclude: opt.exclude || fm.relto_exclude, books: opt.books || fm.relto_books };
  const { candidates, shown } = M.filterAges(ages, rules);
  const scene = M.buildScene(relto, pages, ages, shown);
  scene.candidates = candidates; scene.shownCount = shown.length; scene.booksFromBlock = !!opt.books; scene.hasWhitelist = Array.isArray(rules.books) || M.parseList(rules.books).length > 0;
  return { scene, relto };
}

async function ensureFolder(app, path) {
  if (!path || app.vault.getAbstractFileByPath(path)) return;
  await app.vault.createFolder(path);
}

/**
 * Nettoyer la carte des étoiles : pour chaque Relto, oublier les noms d'Âges qui ne sont plus sur son étagère (supprimés,
 * renommés hors du coffre, exclus), et les étoiles qui n'avaient que de tels Âges (leur dessin restait sans nom). Les étoiles
 * notées sans livre ne bougent pas. Renvoie { names, stars } (combien de noms et d'étoiles oubliés).
 */
async function cleanStarChart(plugin) {
  const { app } = plugin, tel = plugin.ext.telescope || {}; let names = 0, stars = 0;
  for (const f of app.vault.getMarkdownFiles().filter((x) => isHub(app, x))) {
    const scene = await buildScene(plugin, f), key = TEL.keyOf(scene.name, scene.seed), g = tel[key]; if (!g || !g.systems) continue;
    const known = new Set([...(scene.candidates || []), ...(scene.ages || [])].map((a) => a && a.name).filter(Boolean)); if (!known.size) continue; // étagère vide : on ne touche à rien
    const out = {};
    for (const [k, rec] of Object.entries(g.systems)) {
      const had = rec && Array.isArray(rec.ages) ? rec.ages : [], keep = had.filter((n) => known.has(n));
      names += had.length - keep.length;
      if (had.length && !keep.length) { stars++; continue; } // une étoile dont aucun Âge n'est plus là : oubliée
      out[k] = had.length === keep.length ? rec : { ...rec, ages: keep };
    }
    g.systems = out; if (g.aimedAt && !out[g.aimedAt]) delete g.aimedAt;
  }
  if (names || stars) { await plugin.saveExt(); plugin.refreshLive(); }
  return { names, stars };
}

async function createReltoNote(plugin) {
  const { app, t } = plugin;
  const existing = app.vault.getMarkdownFiles().find((f) => isHub(app, f) && !isStoryHub(app, f)); // le Relto du bac à sable, jamais celui de l'histoire
  if (existing) return existing;
  const folder = (plugin.ext.reltoFolder || "Ages").replace(/^\/+|\/+$/g, "");
  await ensureFolder(app, folder);
  const path = (folder ? folder + "/" : "") + "Relto.md";
  // une graine tirée au hasard : chaque nouveau Relto a son île et son propre Great Zero à chercher
  const body = `---\n${obsidian.stringifyYaml(M.defaultReltoFrontmatter(1 + Math.floor(Math.random() * 99999999)))}---\n# Relto\n\n\`\`\`relto\n\`\`\`\n`;
  const f = app.vault.getAbstractFileByPath(path) instanceof obsidian.TFile ? app.vault.getAbstractFileByPath(path) : await app.vault.create(path, body);
  new obsidian.Notice(t("relto.created"));
  return f;
}

async function openRelto(plugin) {
  const f = await createReltoNote(plugin);
  if (f) await openHubFile(plugin, f);
}

/** L'onglet qui montre déjà cette note (y compris un onglet d'arrière-plan pas encore chargé), ou null. */
function leafShowing(app, path) {
  const ws = app.workspace, leaves = ws.getLeavesOfType ? ws.getLeavesOfType("markdown") : [];
  return leaves.find((l) => { const f = l.view && l.view.file; if (f) return f.path === path; try { const st = l.getViewState(); return !!(st && st.state && st.state.file === path); } catch (e) { return false; } }) || null;
}

/**
 * Ouvrir la note d'un Relto en plein écran (réglage), sans jamais en ouvrir un second onglet : si un onglet la montre déjà, on s'y
 * rend. `leaf` : l'onglet où l'ouvrir sinon (le Livre du Relto s'y remplace par le Relto), à défaut l'onglet actif.
 */
async function openHubFile(plugin, f, leaf = null) {
  const ws = plugin.app.workspace, open = leafShowing(plugin.app, f.path);
  plugin.reltoFullArm = { path: f.path, at: Date.now() }; // le plein écran, à la fin du rendu (ou tout de suite s'il est déjà dessiné)
  if (open) {
    if (leaf && leaf !== open) { try { leaf.detach(); } catch (e) { /* ignore */ } } // le livre s'efface : on est passé de l'autre côté
    if (ws.setActiveLeaf) ws.setActiveLeaf(open, { focus: true });
    if (ws.revealLeaf) await ws.revealLeaf(open);
    const inst = [...plugin.live].find((i) => i.path === f.path && i.full && i.el && i.el.isConnected);
    if (inst) { plugin.reltoFullArm = null; inst.full(); }
    return open;
  }
  const target = leaf || ws.getLeaf(false);
  await target.openFile(f);
  return target;
}

/**
 * Commande à part : lancer l'histoire. Crée (une seule fois) un dossier et un Relto « histoire » à l'intérieur, avec sa propre
 * graine (son île, son Great Zero) et le marqueur `relto_mode: story`, puis l'ouvre. Si un Relto histoire existe déjà, l'ouvre.
 * Dossier et note portent la date et la graine (« Relto Story Mode 2026-10-11 74561208 ») : aucune collision avec le coffre.
 */
async function startStory(plugin) {
  const { app, t } = plugin;
  const existing = app.vault.getMarkdownFiles().find((f) => isStoryHub(app, f));
  if (existing) { new obsidian.Notice(t("story.exists")); await app.workspace.getLeaf(false).openFile(existing); return existing; }
  // Un nom qui ne peut pas entrer en collision avec une note ou un dossier du coffre : « Relto Story Mode », la date du jour et la graine du Relto
  const seed = 1 + Math.floor(Math.random() * 99999999), now = new Date(), pad = (v) => String(v).padStart(2, "0");
  const stamp = `Relto Story Mode ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${seed}`;
  let folder = (plugin.ext.storyFolder || stamp).replace(/^\/+|\/+$/g, ""), k = 1;
  while (!plugin.ext.storyFolder && app.vault.getAbstractFileByPath(folder)) folder = `${stamp} ${++k}`; // un dossier de ce nom existe déjà : jamais d'écrasement
  await ensureFolder(app, folder);
  const name = `Relto Story Mode ${seed}`; let n = 1, path;
  do { path = `${folder}/${name}${n > 1 ? " " + n : ""}.md`; n++; } while (app.vault.getAbstractFileByPath(path));
  const base = path.replace(/^.*\//, "").replace(/\.md$/, "");
  const fm = { ...M.defaultReltoFrontmatter(seed), age_name: base, relto_mode: ST.MODE };
  const f = await app.vault.create(path, `---\n${obsidian.stringifyYaml(fm)}---\n# ${base}\n\n\`\`\`relto\n\`\`\`\n`);
  new obsidian.Notice(t("story.created", { folder }));
  await app.workspace.getLeaf(false).openFile(f);
  return f;
}

/** Ce qui manque au chapitre en cours, en une phrase (vide pour le chapitre final : il ne dit jamais ce qui manque). */
const WHY = { white: "story.why.white", reveal: "story.why.reveal", lake: "story.why.lake", look: "story.why.look", slab: "story.why.slab", hear: "story.why.hear", carry: "story.why.carry", accord: "story.why.accord", stone: "story.why.stone", stonepath: "story.why.stonepath", noage: "story.why.noage", stable: "story.why.stable", pages: "story.why.pages", axes: "story.why.axes", mend: "story.why.mend", program: "story.why.program", physics: "story.why.physics", dry: "story.why.dry", zero: "story.why.zero", lock: "story.why.lock", all: "story.why.all", hardstable: "story.why.hardstable", hardpages: "story.why.hardpages", hardaxes: "story.why.hardaxes" };
const whyText = (plugin, why) => (WHY[why] ? "\n" + plugin.t(WHY[why]) : "");

/** Un chapitre réussi : la note reçoit la propriété `story_chapter: completed` et l'étiquette `completed`, et une fenêtre le dit sans qu'il faille revenir au Relto. */
function markChapterDone(plugin, ch, st) {
  const { app, t } = plugin, lang = plugin.lang() === "fr" ? "fr" : "en";
  // la note du chapitre, et l'Âge qui l'a vraiment réussi (ce n'est pas toujours la même note)
  for (const path of new Set([st.notes && st.notes[ch.id], st.by && st.by[ch.id]].filter(Boolean))) {
    const f = app.vault.getAbstractFileByPath(path);
    if (f) app.fileManager.processFrontMatter(f, (fm) => { fm.story_chapter = "completed"; const tg = Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : []; if (!tg.includes("completed")) tg.push("completed"); fm.tags = tg; }).catch((e) => console.warn("[Age Writer ext] étiquette", e));
  }
  if (!obsidian.Modal) return;
  const preset = ch.page && M.PAGE_PRESETS[ch.page], next = ST.nextChapter(st.done);
  if (ch.id === ST.BOOK_ONE_END) { // la fin du premier livre : la page de la fin se pose d'elle-même sur la table de la cabane
    const hub = app.vault.getMarkdownFiles().find((f) => isStoryHub(app, f));
    if (hub) app.fileManager.processFrontMatter(hub, (fm) => { const a = Array.isArray(fm.relto_pages_active) ? fm.relto_pages_active : []; if (!a.includes(ST.ENDGAME.id)) a.push(ST.ENDGAME.id); fm.relto_pages_active = a; }).then(() => plugin.refreshLive()).catch(() => {});
  }
  class Done extends obsidian.Modal {
    onOpen() {
      const { contentEl } = this; this.titleEl.setText(t("story.pop.title"));
      contentEl.createEl("p", { text: ch.title[lang] });
      if (preset) contentEl.createEl("p", { text: t("story.pop.page", { name: preset.label }) });
      if (ch.id === ST.BOOK_ONE_END) contentEl.createEl("p", { text: t("story.pop.end") });
      if (!next) contentEl.createEl("p", { text: t("story.pop.later") }); /* la suite n'est pas encore écrite */
      const row = contentEl.createDiv({ cls: "modal-button-container" });
      if (next) row.createEl("button", { cls: "mod-cta", text: t("story.pop.next") }).addEventListener("click", () => { this.close(); storyNext(plugin); });
      row.createEl("button", { text: t("story.pop.close") }).addEventListener("click", () => this.close());
    }
    onClose() { this.contentEl.empty(); }
  }
  new Done(app).open();
}

/** Les chapitres déjà réussis dont la note n'a pas encore l'étiquette (réussis avant que l'étiquette existe) la reçoivent. */
function catchUpTags(plugin, hub) {
  const { app } = plugin, relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed));
  for (const id of st.done) for (const path of new Set([st.notes[id], st.by && st.by[id]].filter(Boolean))) {
    const f = app.vault.getAbstractFileByPath(path);
    const tagged = plugin._tagged || (plugin._tagged = new Set());
    if (f && !tagged.has(path) && fmOf(app, f).story_chapter !== "completed") { tagged.add(path); app.fileManager.processFrontMatter(f, (fm) => { fm.story_chapter = "completed"; const tg = Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : []; if (!tg.includes("completed")) tg.push("completed"); fm.tags = tg; }).catch(() => {}); }
  }
}

/** Commande : revoir l'avancement tout de suite (notice du chapitre réussi, étiquettes) et dire ce qui manque encore. */
async function storyCheck(plugin) {
  const { app, t } = plugin, hub = app.vault.getMarkdownFiles().find((f) => isStoryHub(app, f));
  if (!hub) { new obsidian.Notice(t("story.nohub")); return; }
  await storyTick(plugin);
  const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed)), ch = ST.nextChapter(st.done);
  new obsidian.Notice(ch ? t("story.checked", { title: ch.title[plugin.lang() === "fr" ? "fr" : "en"] }) + whyText(plugin, st.why) : t("story.end"), 8000);
}

/**
 * Commande de réparation : remet d'aplomb les notes de chapitre créées par une version plus ancienne, sans rien recommencer.
 * Noms (« Age N » pour un exercice d'écriture, le titre pour une exploration du Relto ; la graine de l'Âge est gardée),
 * propriété `story_kind`, étiquette `completed` des chapitres réussis, ligne « Exercice d'écriture / Exploration du Relto ».
 */
async function storyRepair(plugin) {
  const { app, t } = plugin, hub = app.vault.getMarkdownFiles().find((f) => isStoryHub(app, f));
  if (!hub) { new obsidian.Notice(t("story.nohub")); return; }
  const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed)), lang = plugin.lang() === "fr" ? "fr" : "en";
  let renamed = 0, tagged = 0, lined = 0;
  for (const ch of ST.CHAPTERS) {
    let f = st.notes[ch.id] && app.vault.getAbstractFileByPath(st.notes[ch.id]); if (!(f instanceof obsidian.TFile)) continue;
    const kind = ST.kindOf(ch), taken = new Set(app.vault.getMarkdownFiles().map((x) => x.basename)); taken.delete(f.basename);
    let want = null;
    if (kind === "explore") { if (f.basename !== ST.exploreName(ch, lang, taken) && /^Age \d+$|Relto Story Mode/.test(f.basename)) want = ST.exploreName(ch, lang, taken); }
    else if (!/^Age \d+$/.test(f.basename)) { for (let k = 1; ; k++) if (!taken.has(`Age ${k}`)) { want = `Age ${k}`; break; } }
    if (want) {
      const old = f.basename, path = `${ST.dirOf(f.path)}/${want}.md`;
      try {
        await app.fileManager.renameFile(f, path); f = app.vault.getAbstractFileByPath(path) || f;
        st.notes[ch.id] = f.path; if (st.seen[old]) { st.seen[want] = st.seen[old]; delete st.seen[old]; }
        if (st.by && st.by[ch.id]) st.by[ch.id] = f.path; renamed++;
      } catch (e) { console.warn("[Age Writer ext] réparation", e); }
    }
    const done = st.done.includes(ch.id);
    await app.fileManager.processFrontMatter(f, (fm) => {
      const k = kind === "write" ? "writing-exercise" : "relto-exploration";
      if (fm.story_kind !== k) { fm.story_kind = k; tagged++; }
      if (done) { fm.story_chapter = "completed"; const tg = Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : []; if (!tg.includes("completed")) { tg.push("completed"); tagged++; } fm.tags = tg; }
    }).catch(() => {});
    const label = ST.KIND_LABEL[kind];
    try { await app.vault.process(f, (text) => {
      if (/(Writing exercise|Exercice d'écriture|Relto exploration|Exploration du Relto) ·/.test(text)) return text;
      const out = text.replace(new RegExp(`^> (${ch.title.en}|${ch.title.fr}|Deseekay · ${ch.title.en}|Deseekay · ${ch.title.fr})$`, "m"), `> ${kind === "write" ? "✒" : "✦"} ${label[lang]} · $1`);
      if (out !== text) lined++; return out;
    }); } catch (e) { console.warn("[Age Writer ext] réparation", e); }
  }
  resetStoryDraw(plugin); plugin.index.invalidate(); await plugin.saveExt(); await storyTick(plugin);
  new obsidian.Notice(t("story.repaired", { n: renamed, p: tagged, l: lined }), 8000);
}

/**
 * Prendre un livre sur l'étagère : il se lève, s'ouvre sur son panneau de liaison (en petit) en tournant 3 à 10 pages (selon la graine
 * de l'Âge), puis c'est le joueur qui touche le panneau : on arrive sur la note. Un clic à côté, ou Échap, referme le livre ; sans animation (réglage « mouvement réduit » ou `linkAnim: false`), la note s'ouvre tout de suite.
 */
async function playLinkAnim(plugin, age, host, snd, open) {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || plugin.ext.linkAnim === false || !host || !host.createDiv) { snd(); return open(); }
  let analysis = null, seed = age.name || "", f = plugin.app.vault.getAbstractFileByPath(age.path);
  try { const src = f && plugin.core.extract(await plugin.app.vault.cachedRead(f)); seed = plugin.core.seed(age.path) || seed; analysis = src != null ? plugin.core.analyse(src, { seed }) : null; } catch (e) { analysis = null; }
  // le nombre de pages tournées vient de la graine de l'Âge : de 3 (lentes) à 10 (vite)
  let h = 2166136261; for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const pages = 3 + ((h >>> 0) % 8), gap = Math.round(700 - ((pages - 3) / 7) * 520); // 700 ms entre deux pages pour 3, 180 ms pour 10
  if (window.getComputedStyle(host).position === "static") host.style.position = "relative";
  const ov = host.createDiv({ cls: "age-linkanim" }), book = ov.createDiv({ cls: "age-linkanim__book" });
  let cover = ""; // la couverture du livre de liaison (celle du livre ouvert), si on sait la dessiner
  try { const src = f && plugin.core.extract(await plugin.app.vault.cachedRead(f)); cover = src != null && analysis && plugin.coverFor ? plugin.coverFor(src, analysis, f, false, "linking") : ""; } catch (e) { cover = ""; } /* l'étagère du Relto ne garde que des livres de liaison */
  if (cover) { book.addClass("has-cover"); setMarkup(book, cover); } else book.createDiv({ cls: "age-linkanim__title", text: age.name || f.basename });
  const page = ov.createDiv({ cls: "age-linkanim__page" }), panel = page.createDiv({ cls: "age-linkanim__panel" }); // le panneau est collé sur une page du livre
  if (analysis) { try { plugin.mountGenerated(panel, analysis, age.path); } catch (e) { console.warn("[Age Writer ext] panneau", e); } }
  const sheets = ov.createDiv({ cls: "age-linkanim__sheets" }); // les pages qu'on tourne avant d'arriver sur le panneau
  for (let i = 0; i < pages; i++) { const sh = sheets.createDiv({ cls: "age-linkanim__sheet" }); sh.style.animationDelay = `${i * gap}ms`; sh.style.animationDuration = `${Math.max(380, Math.round(gap * 1.7))}ms`; sh.style.zIndex = String(pages - i); }
  { const r = host.getBoundingClientRect(); if (r.width && r.height) ov.style.setProperty("--page-h", `${Math.round(Math.max(160, Math.min(r.height * 0.9, (r.width * 0.9) / 0.75, 640)))}px`); } // la page tient dans la zone où l'on est (petit mode compris)
  const touch = ov.createDiv({ cls: "age-linkanim__touch" }), timers = [], at = (fn, ms) => timers.push(window.setTimeout(fn, ms));
  const quiet = !plugin.ext.sound, vol = plugin.ext.volume;
  let done = false, ready = false, touched = false;
  const end = () => { done = true; timers.forEach((x) => window.clearTimeout(x)); document.removeEventListener("keydown", onKey, true); ov.remove(); };
  const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); end(); } };
  document.addEventListener("keydown", onKey, true);
  ov.addEventListener("click", () => { if (!touched) end(); }); // un clic à côté ferme le livre, tant qu'on n'a pas touché le panneau
  panel.addEventListener("click", (e) => { // c'est le joueur qui touche le panneau : l'anneau, le son de la liaison, puis la note
    e.stopPropagation(); if (!ready || done) return; ready = false; touched = true;
    const r = ov.getBoundingClientRect(); touch.style.left = `${e.clientX - r.left - 10}px`; touch.style.top = `${e.clientY - r.top - 10}px`;
    ov.addClass("is-touch"); touch.addClass("is-on"); ov.removeClass("is-ready"); snd();
    at(() => { end(); open(); }, 900);
  });
  at(() => { ov.addClass("is-open"); if (!quiet && plugin.ext.soundBook !== false) sound.openSequence(vol, { book: true, clasp: plugin.ext.soundClasp !== false, link: false }); }, 1100); // le livre s'ouvre : son panneau apparaît
  // les pages ne se tournent qu'une fois le son du livre et des clics fini (même durée que dans openSequence)
  const lead = quiet ? 0 : plugin.ext.soundBook !== false ? 1350 : plugin.ext.soundClasp !== false ? 550 : 0, start = 1100 + lead + 250;
  for (let i = 0; i < pages; i++) at(() => { if (!quiet && plugin.ext.soundBook !== false) sound.pageTurn(vol, { quick: i < pages - 1 }); }, start + i * gap); // les pages qu'on tourne : la dernière garde sa traîne
  const flip = Math.max(380, Math.round(gap * 1.7));
  at(() => { ov.addClass("is-flip"); ov.addClass("is-panel"); }, start); // les pages se tournent, et la page de liaison est dessous : pas d'attente entre les deux
  at(() => { ready = true; ov.addClass("is-done"); ov.addClass("is-ready"); }, start + (pages - 1) * gap + flip); // la dernière page est tournée : le panneau attend d'être touché
}

/** Après une modification : revoir l'avancement de l'histoire (une notice quand un chapitre est réussi), sans qu'il faille ouvrir le Relto. */
async function storyTick(plugin) {
  const { app } = plugin, hub = app.vault.getMarkdownFiles().find((f) => isStoryHub(app, f));
  if (!hub) return;
  try { resetStoryDraw(plugin); plugin.index.invalidate(); await buildScene(plugin, hub); resetStoryDraw(plugin); catchUpTags(plugin, hub); } catch (e) { console.warn("[Age Writer ext] histoire", e); }
}

/** Ce que le Relto a de secret : l'atelier découvert, le tiroir ouvert, la pierre prise (par Relto, gardé dans les réglages). */
const relicsOf = (plugin, hub) => {
  if (!hub) return {};
  const relto = { ...M.parseRelto(fmOf(plugin.app, hub)), name: hub.basename }, store = plugin.ext.relics || (plugin.ext.relics = {}), key = TEL.keyOf(relto.name, relto.seed);
  return store[key] || (store[key] = { seen: false, drawer: false, stone: false });
};

/**
 * Le chapitre 14, pour le dessin (src/relto-atelier.js) : l'encrier qui frémit (`hum`, 0 à 1), la pierre sur le bureau (`stone`),
 * la voix du monde étrange (`freq`). Relto histoire seulement. Le cri de la nuit se joue ici, une fois, si l'on est là. Revu toutes les 2 s.
 */
function hearStateOf(plugin, hub, scene) {
  /* l'accord (26 oct. 2026) : les scarabées sont libres, et l'encrier, scarabée lui-même, leur répond parfois : un frémissement de sept secondes, toutes les minute et demie */
  const greet = (now) => { const P = 90000, k = (((now % P) + P) % P) / P; return k < 0.08 ? 0.45 * Math.sin((Math.PI * k) / 0.08) : 0; };
  if (!hub || !scene || scene.mode !== "story") { const any = plugin.bahroSt ? plugin.bahroSt(null) : null; return { hum: any && STONE.endingOf(any) === "accord" ? greet(Date.now()) : 0, stone: false }; }
  const now = Date.now(), cache = (plugin._hearCache = plugin._hearCache || {}), c = cache[hub.path]; if (c && now - c.at < 2000) return c.v;
  const relto = { ...M.parseRelto(fmOf(plugin.app, hub)), name: hub.basename }, st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed));
  if (HEAR.cryNow(st, now)) { plugin.saveExt(); if (plugin.ext.sound && plugin.ext.soundRooms !== false) sound.caveSfx("cry", (plugin.ext.volume == null ? 0.35 : plugin.ext.volume) * 0.5); } /* la nuit de la visite : un cri, au loin */
  const ht = Number(plugin.ext.humTest) || 0, test = now - ht < 60000 ? 1 - 0.7 * ((now - ht) / 60000) : 0; /* le raccourci d'essai : une minute de frémissement, sans toucher à l'histoire */
  const v = { hum: Math.max(HEAR.humOf(st, now), test, STONE.endingOf(st) === "accord" ? greet(now) : 0), stone: HEAR.stoneHere(st, now), freq: (st.hear && st.hear.freq) || (test ? 220 : undefined) };
  cache[hub.path] = { at: now, v }; return v;
}

/** Le courrier du mentor (src/story-mail.js) : l'état à dessiner, l'arrivée d'une lettre, l'ouverture de la note. */
const mailState = (plugin, hub) => {
  if (!hub || !isStoryHub(plugin.app, hub)) return { unread: false, has: false };
  const relto = { ...M.parseRelto(fmOf(plugin.app, hub)), name: hub.basename }, m = (ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed))).mail;
  return { unread: !!(m && m.unread), has: !!(m && m.note) };
};
async function mailTick(plugin, hub) {
  const { app, t } = plugin; if (!hub || !isStoryHub(app, hub)) return false;
  const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, key = TEL.keyOf(relto.name, relto.seed), st = ST.get(plugin.ext.story || (plugin.ext.story = {}), key);
  if (!relto.pagesActive.includes(ST.ENDGAME.id)) return false; // l'atelier existe quand l'encrier est posé
  if (!open) return false;
  const lang = plugin.lang(), l = MAIL.step(st, Date.now(), ST.knownBlocks(st.done, st.hintN), key, lang === "fr" ? "fr" : "en", Math.random, plugin.ext.mailDelay);
  if (!l) { plugin.saveExt(); return false; }
  const dir = ST.dirOf(hub.path), path = (st.mail.note && app.vault.getAbstractFileByPath(st.mail.note)) ? st.mail.note : `${dir}/${lang === "fr" ? "Courrier" : "Mail"}.md`;
  const stamp = new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long" }), block = `\n\n---\n*${stamp}*\n\n${l.text}\n`;
  try { let f = app.vault.getAbstractFileByPath(path); if (f) await app.vault.process(f, (d) => d + block); else f = await app.vault.create(path, `# ${t("story.mail.title")}\n\n${t("story.mail.intro")}${block}`); st.mail.note = path; } catch (e) { console.warn("[Age Writer ext] courrier", e); st.mail.unread = false; st.mail.told.pop(); st.mail.at = Date.now() + 600000; }
  plugin.saveExt(); return true;
}
async function openMail(plugin, hub) {
  const { app } = plugin; if (!hub) return;
  const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed)), f = st.mail && st.mail.note && app.vault.getAbstractFileByPath(st.mail.note);
  if (!f) return;
  await leaveFullscreenAsync(); MAIL.read(st, Date.now(), Math.random, plugin.ext.mailDelay); plugin.saveExt(); await app.workspace.getLeaf(false).openFile(f);
}

/** Noms des notes de l'histoire dont les pages ne sont pas tirées au hasard (tant que l'Imageur n'est pas réussi). Mis en cache : appelé à chaque analyse. */
function storyNoDraw(plugin) {
  if (plugin._noDraw) return plugin._noDraw;
  const set = new Set(), { app } = plugin;
  try {
    for (const hub of app.vault.getMarkdownFiles().filter((f) => isStoryHub(app, f))) {
      const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed));
      if (ST.drawsOn(st.done)) continue;
      const dir = ST.dirOf(hub.path);
      for (const f of app.vault.getMarkdownFiles()) if (f !== hub && ST.inDirs(f.path, [dir])) set.add(f.basename);
    }
  } catch (e) { console.warn("[Age Writer ext] tirage", e); }
  return (plugin._noDraw = set);
}
/** Les blocs connus d'une note de l'histoire (palette du livre) ; null pour toute autre note, ou quand l'apprentissage est fini. */
function storyKnown(plugin, path) {
  const { app } = plugin;
  for (const hub of app.vault.getMarkdownFiles().filter((f) => isStoryHub(app, f))) {
    if (!ST.inDirs(path, [ST.dirOf(hub.path)]) || path === hub.path) continue;
    const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename };
    const st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed)); return ST.knownBlocks(st.done, st.hintN);
  }
  return null;
}
/** La note du chapitre « Modifier ce qui est écrit » : la seule où l'encre sèche vite (ailleurs, un délai court ferait des altérations). */
function storyNotes(plugin) {
  if (plugin._storySet) return plugin._storySet;
  const set = new Set(), { app } = plugin;
  try {
    for (const hub of app.vault.getMarkdownFiles().filter((f) => isStoryHub(app, f))) {
      const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed));
      if (st.notes.alter) set.add(st.notes.alter.replace(/^.*\//, "").replace(/\.md$/, ""));
    }
  } catch (e) { console.warn("[Age Writer ext] histoire", e); }
  return (plugin._storySet = set);
}
/** Les notes dont l'encre ne sèche plus : le monde étrange du chapitre 9, dès que le 14 est ouvert (claude/DESIGN-art-bahro.md §2, sans explication). */
function storyWet(plugin) {
  if (plugin._wetSet) return plugin._wetSet;
  const set = new Set(), { app } = plugin;
  try {
    for (const hub of app.vault.getMarkdownFiles().filter((f) => isStoryHub(app, f))) {
      const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed)), n = HEAR.wetName(st);
      if (n) set.add(n);
    }
  } catch (e) { console.warn("[Age Writer ext] histoire", e); }
  return (plugin._wetSet = set);
}
const resetStoryDraw = (plugin) => { plugin._noDraw = null; plugin._storySet = null; plugin._wetSet = null; };

/** L'avancement du Relto histoire dont le dossier contient cette note (ou null). */
function storyStateOfPath(plugin, path) {
  const { app } = plugin;
  for (const hub of app.vault.getMarkdownFiles().filter((f) => isStoryHub(app, f))) {
    const d = ST.dirOf(hub.path); if (!d || !ST.inDirs(path, [d])) continue;
    const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename };
    return ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed));
  }
  return null;
}
/** Deux voix jouées (diapason de l'Imageur, ou ♪♪ du panneau) : le chapitre 14 les retient si l'une est celle du monde étrange. */
function storyHeard(plugin, a, b, degree, fa, fb) {
  try {
    const st = storyStateOfPath(plugin, a) || storyStateOfPath(plugin, b); if (!st) return;
    if (HEAR.heard(st, a, b, degree, fa, fb, Date.now())) { plugin.saveExt(); clearTimeout(plugin._hearTick); plugin._hearTick = window.setTimeout(() => storyTick(plugin), 400); }
  } catch (e) { console.warn("[Age Writer ext] deux voix", e); }
}
/** La voix du monde étrange seule (le diapason frappé une fois, l'accord de ses cristaux) : l'encrier de l'atelier frémit. */
function storyStruck(plugin, path, freq) {
  try { const st = storyStateOfPath(plugin, path); if (st && HEAR.isStrange(st, path) && HEAR.struck(st, freq, Date.now())) plugin.saveExt(); } catch (e) { console.warn("[Age Writer ext] encrier", e); }
}

/** Un message du mentor en fenêtre (visible aussi en plein écran, contrairement à une notification). */
function storyPopup(plugin, text) {
  if (!obsidian.Modal) { new obsidian.Notice(text); return; }
  class Pop extends obsidian.Modal {
    onOpen() { this.titleEl.setText("Age Writer"); this.contentEl.createEl("p", { text }); const row = this.contentEl.createDiv({ cls: "modal-button-container" }); row.createEl("button", { text: plugin.t("story.pop.close") }).addEventListener("click", () => this.close()); }
    onClose() { this.contentEl.empty(); }
  }
  new Pop(plugin.app).open();
}

/** Une vraie lettre du mentor, sur du parchemin (fenêtre) : `paras` est la liste de ses paragraphes. */
function letterPopup(plugin, paras) {
  if (!obsidian.Modal) { new obsidian.Notice(paras[1] || paras[0]); return; }
  class Letter extends obsidian.Modal {
    onOpen() {
      this.modalEl.addClass("age-letter"); this.titleEl.setText("");
      for (const p of paras) this.contentEl.createEl("p", { text: p, cls: p.startsWith("\u2014") ? "age-letter__sign" : "" });
      this.contentEl.createDiv({ cls: "age-letter__seal" });
      this.contentEl.createDiv({ cls: "modal-button-container" }).createEl("button", { text: plugin.t("story.pop.close") }).addEventListener("click", () => this.close());
    }
    onClose() { this.contentEl.empty(); }
  }
  new Letter(plugin.app).open();
}

/** Chapitre suivant : crée (ou rouvre) la note du prochain chapitre dans le dossier de l'histoire. */
async function storyNext(plugin, opts = {}) {
  const { app, t } = plugin;
  const hub = app.vault.getMarkdownFiles().find((f) => isStoryHub(app, f));
  if (!hub) { storyPopup(plugin, t("story.nohub")); return null; }
  await buildScene(plugin, hub); // évalue l'avancement (un chapitre réussi depuis la dernière fois est compté)
  const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, store = plugin.ext.story || (plugin.ext.story = {});
  const key = TEL.keyOf(relto.name, relto.seed), st = ST.get(store, key), ch = ST.nextChapter(st.done);
  if (!ch) { new obsidian.Notice(t("story.pop.later"), 8000); return null; } /* après le dernier chapitre écrit : la suite n'est pas encore écrite */
  if (ch.id === "carry" && !HEAR.stoneHere(st, Date.now())) { new obsidian.Notice(t("story.wait.night"), 8000); return null; } /* le 15 commence au matin de la visite : pas de lettre avant la pierre */
  if (ST.chapterById(ch.id).book === 2 && ST.bookOneDone(st.done) && !st.bookOneLetter) { /* la fin du premier livre : sa lettre d'abord, une fois ; le second livre s'ouvre à l'appel suivant */
    st.bookOneLetter = true; plugin.saveExt();
    letterPopup(plugin, [t("story.letter.hi"), t("story.end"), t("story.letter.more") + " " + t("atelier.clue"), "\u2014 Adrin Vesparath, seltahn"]); return null;
  }
  const lang = plugin.lang(), dir = ST.dirOf(hub.path), known = !opts.fresh && st.notes[ch.id] && app.vault.getAbstractFileByPath(st.notes[ch.id]);
  if (known) { await leaveFullscreenAsync(); new obsidian.Notice(t("story.reopen") + whyText(plugin, st.why)); await app.workspace.getLeaf(false).openFile(known); return known; }
  // « Age 1 », « Age 2 »… : court ; le nom ne doit exister nulle part dans le coffre (la Loi du Changement et l'avancement sont gardés par nom)
  const taken = new Set(app.vault.getMarkdownFiles().map((x) => x.basename));
  const nameAt = (i) => { for (let k = 1, c = 0; ; k++) { const nm = `Age ${k}`; if (taken.has(nm)) continue; if (c++ === i) return nm; } };
  const analyse = (text, nm) => plugin.core.analyse(text, { seed: nm, draw: ST.drawsOn(st.done) ? undefined : false });
  const name = ST.kindOf(ch) === "explore" ? ST.exploreName(ch, lang, taken) : ST.chapterName(ch, nameAt, analyse), path = `${dir}/${name}.md`;
  await leaveFullscreenAsync(); // la note s'ouvrirait derrière le plein écran
  const f = await app.vault.create(path, ST.chapterNote(ch, lang, path.replace(/^.*\//, "").replace(/\.md$/, "")));
  if (opts.fresh) delete st.seen[ST.chapterName ? (st.notes[ch.id] || "").replace(/^.*\//, "").replace(/\.md$/, "") : ""];
  st.notes[ch.id] = path; resetStoryDraw(plugin); plugin.index.invalidate();
  const w = ST.WORLDS[ch.id];
  if (w && w.fixed) { const a = analyse(w.lines.join("\n"), f.basename); if (a && a.stability < 75) ST.noteSeen(store, key, f.basename); } // seulement s'il est vraiment abîmé
  plugin.saveExt();
  new obsidian.Notice(t(opts.fresh ? "story.restarted" : "story.note", { title: ch.title[lang === "fr" ? "fr" : "en"] }));
  await app.workspace.getLeaf(false).openFile(f);
  return f;
}

/** Relancer le chapitre en cours : une nouvelle note neuve (l'ancienne reste dans le dossier, intacte). */
const storyRestart = (plugin) => storyNext(plugin, { fresh: true });

/** Un indice facultatif sur le chapitre en cours (seulement ceux dont la lettre ne donne pas la recette). */
function storyHint(plugin) {
  const { app, t } = plugin, hub = app.vault.getMarkdownFiles().find((f) => isStoryHub(app, f));
  if (!hub) { new obsidian.Notice(t("story.nohub")); return; }
  const relto = { ...M.parseRelto(fmOf(app, hub)), name: hub.basename }, st = ST.get(plugin.ext.story || (plugin.ext.story = {}), TEL.keyOf(relto.name, relto.seed)), ch = ST.nextChapter(st.done);
  const h = ch && ST.HINTS[ch.id], L = h && h[plugin.lang() === "fr" ? "fr" : "en"];
  if (!L) { new obsidian.Notice(t("story.nohint"), 4000); return; }
  const n = Math.min(L.length - 1, st.hintN && st.hintN[ch.id] != null ? st.hintN[ch.id] + 1 : 0); // chaque appel en dévoile un de plus (le dernier se répète ensuite)
  (st.hintN || (st.hintN = {}))[ch.id] = n; plugin.saveExt();
  const MISS = { sun: "story.miss.sun", stable: "story.miss.stable", reactions: "story.miss.reactions", catalyst: "story.miss.catalyst", beyond: "story.miss.beyond" };
  const miss = n >= 1 && ch.id === "strange" && st.missing && st.missing.length ? "\n" + t("story.miss.head") + " " + st.missing.map((k) => t(MISS[k])).join(" · ") : ""; // le plus proche de tes Âges : ce qui lui manque encore
  new obsidian.Notice(`(${n + 1}/${L.length}) ${L[n]}${miss}`, 14000);
}

class PresetModal extends obsidian.FuzzySuggestModal {
  constructor(app, onChoose, presets) { super(app); this.onChoose = onChoose; this.presets = presets; this.setPlaceholder("Relto page…"); }
  getItems() { return Object.keys(this.presets); }
  getItemText(id) { return `${this.presets[id].label} (${id})`; }
  onChooseItem(id) { this.onChoose(id); }
}

async function createReltoPage(plugin) {
  const { app, t } = plugin;
  const presets = Object.fromEntries(Object.entries(M.PAGE_PRESETS).filter(([, v]) => !v.secret)); // une page secrète ne se crée pas depuis la liste
  for (const lp of (await libraryPages(plugin)).pages) presets[lp.id] = { label: lp.label, effects: lp.effects, unlock: lp.unlock };
  new PresetModal(app, async (id) => {
    const hub = await createReltoNote(plugin);
    const folder = ((plugin.ext.reltoFolder || "Ages").replace(/^\/+|\/+$/g, "") + "/Relto pages");
    await ensureFolder(app, folder.split("/")[0]); await ensureFolder(app, folder);
    let n = 0, path;
    do { path = `${folder}/${id}${n ? " " + (n + 1) : ""}.md`; n++; } while (app.vault.getAbstractFileByPath(path));
    const preset = presets[id];
    const f = await app.vault.create(path, `---\n${obsidian.stringifyYaml(M.pageFrontmatter(id, preset))}---\n# ${preset.label}\n\n${t("relto.pagenote")}\n${id === "page_cat" ? "\n" + t("relto.catnote") + "\n" : id === "page_koi" ? "\n" + t("relto.koinote") + "\n" : id === "page_atelier" ? "\n" + t("atelier.clue") + "\n" : ""}`);
    await app.fileManager.processFrontMatter(hub, (fm) => { const a = Array.isArray(fm.relto_pages_active) ? fm.relto_pages_active : []; fm.relto_pages_active = a.includes(id) ? a : M.attachPage(a, id); });
    new obsidian.Notice(t("relto.pagecreated", { name: preset.label }));
    plugin.refreshLive();
    leaveFullscreen(); app.workspace.getLeaf("tab").openFile(f);
  }, presets).open();
}


/** Ce qu'une page ajoute au Relto, en mots lisibles (et non le nom technique de l'effet). */
const FX_WORDS = {
  en: { vegetation: "trees", waterfall: "a waterfall", fireflies: "fireflies", lanterns: "lanterns", snow: "snow", aurora: "an aurora", mist: "mist", fireworks: "fireworks", mountain: "a mountain", pillars: "standing stones", chimney: "a chimney", gems: "gems", gold: "gold", silver: "silver", koi: "koi", cat: "a cat", rain: "rain", storm: "a storm", birds: "birds", butterflies: "butterflies", moons: "moons", dock: "a dock", bench: "a bench", stalktree: "a stalk tree", cattoys: "the cat's toys", ponddecor: "stones by the pond", islets: "islets", calendar: "the calendar pinnacle", flowers: "flowers", grass: "grass", imager: "the Imager", telescope: "the observatory", dniclock: "the D'ni clock", comet: "comets" },
  fr: { vegetation: "des arbres", waterfall: "une cascade", fireflies: "des lucioles", lanterns: "des lanternes", snow: "de la neige", aurora: "une aurore", mist: "de la brume", fireworks: "des feux d'artifice", mountain: "une montagne", pillars: "des menhirs", chimney: "une cheminée", gems: "des gemmes", gold: "de l'or", silver: "de l'argent", koi: "des koïs", cat: "un chat", rain: "la pluie", storm: "l'orage", birds: "des oiseaux", butterflies: "des papillons", moons: "des lunes", dock: "un ponton", bench: "un banc", stalktree: "un arbre-tige", cattoys: "les jouets du chat", ponddecor: "des pierres au bord du bassin", islets: "des îlots", calendar: "la pierre-calendrier", flowers: "des fleurs", grass: "de l'herbe", imager: "l'Imageur", telescope: "l'observatoire", dniclock: "l'horloge D'ni", comet: "des comètes" },
};
const ASSET_WORDS = {
  en: { conifer: "pines", birch: "birches", palm: "palms", fern: "ferns", ponderosa: "ponderosa pines", maple: "maples", crystal: "crystal trees", blue: "blue", red: "red", yellow: "yellow", white: "white", pink: "pink", lily: "lilies of the valley" },
  fr: { conifer: "pins", birch: "bouleaux", palm: "palmiers", fern: "fougères", ponderosa: "pins ponderosa", maple: "érables", crystal: "arbres de cristal", blue: "bleues", red: "rouges", yellow: "jaunes", white: "blanches", pink: "roses", lily: "muguet" },
};
function fxLabel(a, lang) {
  const L = lang === "fr" ? "fr" : "en", base = FX_WORDS[L][a.type] || String(a.type).replace(/_/g, " "), asset = a.asset ? ASSET_WORDS[L][a.asset] || a.asset : null;
  if (a.type === "vegetation" && asset) return asset;
  return asset ? `${base} (${asset})` : base;
}

async function renderRelto(plugin, source, el, ctx) {
  const { app, t } = plugin, opt = parseOptions(source);
  el.empty();
  const root = el.createDiv({ cls: "age-relto" });
  const file = findReltoFile(plugin, opt, ctx.sourcePath);
  if (!file) {
    root.createDiv({ cls: "age-relto__empty", text: t("relto.none") });
    root.createEl("button", { text: t("relto.create") }).addEventListener("click", async () => {
      const f = await createReltoNote(plugin);
      // le cache des propriétés de la nouvelle note n'est pas prêt tout de suite : on vise le fichier directement
      renderRelto(plugin, `source: [[${f.path}]]\n` + source, el, ctx).catch((e) => console.warn("[Age Writer ext] relto", e));
    });
    return;
  }
  const head = root.createDiv({ cls: "age-relto__head" });
  const title = head.createSpan({ cls: "age-relto__title" }), plate = head.createSpan({ cls: "age-relto__plate" });
  const tabsOn = plugin.ext.reltoTabs !== false, ui0 = (plugin.ext.state.ui = plugin.ext.state.ui || {});
  const tabBar = tabsOn ? root.createDiv({ cls: "age-relto__tabs" }) : null;
  /** Le plein écran, dans la grande vue comme dans la note : dans la note, son conteneur prend le temps du plein écran l'habit de la grande vue. */
  /**
   * Le plein écran mobile : le Relto quitte sa place dans la note et s'accroche directement à la page (un parent d'Obsidian
   * peut être transformé, ce qui décalerait une vue fixée) ; un signet garde sa place pour l'y remettre.
   */
  let fullMark = null;
  const mobileFull = (on) => {
    const d = root.ownerDocument;
    if (on && !fullMark) {
      fullMark = d.createComment("age-relto"); root.parentNode.insertBefore(fullMark, root); d.body.appendChild(root); root.addClass("is-mobilefull");
      const mark = fullMark, watch = window.setInterval(() => { if (fullMark !== mark) { window.clearInterval(watch); return; } if (!mark.isConnected) { window.clearInterval(watch); root.remove(); fullMark = null; } }, 1000); // la note fermée ou redessinée : le Relto en plein écran s'en va avec elle
    }
    else if (!on && fullMark) { root.removeClass("is-mobilefull"); if (fullMark.parentNode) fullMark.parentNode.replaceChild(root, fullMark); else root.remove(); fullMark = null; }
    if (renderer && !renderer.running) renderer.draw(0);
  };
  const toggleFull = () => {
    const big = root.closest(".age-reltoview"), host = big || root.parentElement || root, d = host.ownerDocument;
    try {
      if (isTouch()) { mobileFull(!root.hasClass("is-mobilefull")); return; } // mobile : le navigateur refuse le plein écran ; le Relto se fixe sur tout l'écran (styles.ext.css), et se couche de lui-même en portrait
      if (d.fullscreenElement) { d.exitFullscreen(); return; }
      if (!big) { host.addClass("age-reltoview", "age-reltoview--inline"); const off = () => { if (!d.fullscreenElement) { host.removeClass("age-reltoview", "age-reltoview--inline"); d.removeEventListener("fullscreenchange", off); } }; d.addEventListener("fullscreenchange", off); }
      const p = host.requestFullscreen(); if (p && p.catch) p.catch(() => { if (!big) host.removeClass("age-reltoview", "age-reltoview--inline"); });
    } catch (e) { /* ignore */ }
  };
  const paneView = root.createDiv({ cls: "age-relto__pane age-relto__pane--view" }), panePages = root.createDiv({ cls: "age-relto__pane age-relto__pane--pages" }), paneSet = root.createDiv({ cls: "age-relto__pane age-relto__pane--settings" });
  const controls = paneSet.createDiv({ cls: "age-relto__controls" }), when = document.createElement("div"); when.className = "age-relto__when";
  const clock = when.createSpan({ cls: "age-relto__clock" });
  // heure D'ni (comme le KI) : année, mois, jour, puis gahrtahvo : tahvo : gorahn : prorahn, en chiffres D'ni ; ligne `dni_time: off` pour la masquer
  let dniClock = null;
  // l'heure D'ni voyage sur le faisceau du Great Zero : sans l'horloge D'ni (page débloquée par le Zéro), le Relto ne connaît que
  // la date de sa pierre-calendrier, qui dérive de quelques yahr, et l'heure se tait (src/dniclock.js)
  const zero = { scene: () => null };
  if (plugin.ext.dniClock !== false && !/^(off|no|non|false|0)$/i.test(String(opt.dni_time || ""))) {
    dniClock = when.createSpan({ cls: "age-relto__dnitime" });
    const tickDni = () => {
      const d = DC.reltoDate(zero.scene()), n = (v) => plugin.dni.numberSvg(v, { size: tabsOn ? 24 : 13 });
      const caught = d.synced;
      const vailee = plugin.dni.writes() ? `<i class="age-dni age-relto__vailee" data-latin="${esc(d.name)}" tabindex="0" style="font-family:${esc(plugin.dni.textStack())}">${esc(plugin.dni.textFor(d.name))}</i>` : `<i>${esc(d.name)}</i>`; /* le vailee en lettres D'ni ; au survol, son nom latin */
      setMarkup(dniClock, `${n(d.hahr)}${vailee}${n(d.yahr)}` + (caught ? `<b>${n(d.gahrtahvo)}${n(d.tahvo)}${n(d.gorahn)}${n(d.prorahn)}</b>` : `<b class="age-relto__dnitime-silent">${esc(t("relto.dni.silent"))}</b>`));
      dniClock.toggleClass("is-drifting", !caught); dniClock.setAttr("aria-label", caught ? DT.format(d) : t("relto.dni.silent.tip")); // l'infobulle d'Obsidian (aria-label) seule : `title` en ajoutait une seconde, grise
    };
    // la mise à jour reconstruit les chiffres toutes les ~1,4 s, ce qui fermait l'infobulle avant qu'elle n'apparaisse : on suspend tant que la souris est dessus
    let over = false; dniClock.addEventListener("mouseenter", () => { over = true; }); dniClock.addEventListener("mouseleave", () => { over = false; tickDni(); });
    tickDni(); dniClock.tick = () => { if (!over) tickDni(); };
  }
  const lbl = (k) => { if (tabsOn) controls.createDiv({ cls: "age-relto__lbl", text: t(k) }); };
  lbl("relto.lbl.time");
  // onglet Réglages : chaque réglage sur une ligne (l'heure du ciel : curseur, l'heure lue, ↺ ; le son : ♪, l'ambiance, le volume en fader vertical)
  const rowTime = tabsOn ? controls.createDiv({ cls: "age-relto__row" }) : controls;
  const slider = rowTime.createEl("input", { type: "range", attr: { min: "0", max: "24", step: "0.25" } });
  const skyVal = tabsOn ? rowTime.createSpan({ cls: "age-relto__skyval" }) : null;
  const nowBtn = rowTime.createEl("button", { text: "↺", attr: { title: t("relto.now") } });
  lbl("relto.lbl.sound");
  const rowSound = tabsOn ? controls.createDiv({ cls: "age-relto__row age-relto__row--sound" }) : controls;
  const soundBtn = plugin.ext.sound ? rowSound.createEl("button", { cls: "age-ext__sound", text: "♪" }) : null;
  const mode = () => ["minimal", "zen", "full"].includes(plugin.ext.reltoMode) ? plugin.ext.reltoMode : "zen";
  let modeSel = null, volIn = null;
  if (soundBtn) {
    modeSel = rowSound.createEl("select", { cls: "age-relto__mode", attr: { title: t("relto.soundmode") } });
    const modeLabel = { minimal: t("relto.mode.minimal"), zen: t("relto.mode.zen"), full: t("relto.mode.full") };
    for (const m of ["minimal", "zen", "full"]) modeSel.createEl("option", { value: m, text: modeLabel[m] });
    modeSel.value = mode();
    if (!tabsOn) lbl("relto.lbl.vol");
    const volBox = tabsOn ? rowSound.createDiv({ cls: "age-relto__fader", attr: { title: t("relto.volume") } }) : controls;
    volIn = volBox.createEl("input", { type: "range", cls: "age-relto__vol" + (tabsOn ? " is-vertical" : ""), attr: { min: "0", max: "1", step: "0.05", title: t("relto.volume") } });
    if (tabsOn) { const ic = volBox.createSpan({ cls: "age-relto__fadericon" }); try { obsidian.setIcon(ic, "volume-2"); } catch (e) { /* ignore */ } }
    volIn.value = String(plugin.ext.reltoVolume == null ? 0.6 : plugin.ext.reltoVolume);
  }
  // la clé de l'atelier (raccourci sur la table de la cabane) : un réglage ici aussi, mais seulement une fois l'énigme résolue (sinon il la dévoilerait)
  const keyRow = (tabsOn ? controls.createDiv({ cls: "age-relto__row" }) : controls.createSpan({ cls: "age-relto__keyopt" }));
  const keyLabel = keyRow.createEl("label", { cls: "age-relto__keylabel", attr: { title: t("atelier.key.optd") } });
  const keyBox = keyLabel.createEl("input", { type: "checkbox" }); keyLabel.createSpan({ text: " " + t("atelier.key.opt") });
  keyBox.addEventListener("change", () => { plugin.ext.atelierDirect = keyBox.checked; plugin.saveExt(); if (renderer) renderer.draw(0); });
  const syncKey = () => { const seen = !!(relicsOf(plugin, file) || {}).seen; keyRow.toggleClass("is-hidden", !seen); keyRow.style.display = seen ? "" : "none"; keyBox.checked = plugin.ext.atelierDirect !== false; };
  syncKey();
  const dniName = X.dniText(plugin, head, "", "age-relto__dniname");
  const stage = paneView.createDiv({ cls: "age-relto__stage" });
  const touch = isTouch(); // téléphone, tablette : le Relto se touche au lieu de se survoler (src/relto-render.js, `opts.touch`)
  if (touch) { root.addClass("is-touch"); stage.createDiv({ cls: "age-relto__turn", text: t("relto.turn") }); } // en portrait : tourne ton téléphone (CSS)
  const canvas = stage.createEl("canvas", { cls: "age-relto__canvas" });
  const tipCard = touch ? stage.createDiv({ cls: "age-relto__tipcard is-empty" }) : null; // la carte d'infobulle, sous l'image
  const dniName2 = tabBar ? X.dniText(plugin, tabBar, "", "age-relto__dnioverlay") : null;
  if (opt.inscription) {
    const ins = paneView.createDiv({ cls: "age-relto__inscription" });
    if (!X.dniText(plugin, ins, opt.inscription, "")) { ins.setText(opt.inscription); ins.addClass("is-latin"); }
  }
  paneView.appendChild(when);
  // l'heure et le nom D'ni s'effacent seuls au bout de quelques secondes ; la souris sur la vue les ramène ; un clic sur l'heure les cache
  if (tabsOn) {
    const fadeEls = [when, dniName2].filter(Boolean); let timer = 0, suppressed = false;
    const setFade = (f) => fadeEls.forEach((x) => x.toggleClass("is-faded", f));
    const arm = () => { window.clearTimeout(timer); timer = window.setTimeout(() => setFade(true), 4000); };
    paneView.addEventListener("mouseenter", () => { window.clearTimeout(timer); if (!suppressed) setFade(false); });
    paneView.addEventListener("mouseleave", () => { suppressed = false; arm(); });
    when.addEventListener("click", () => { suppressed = true; window.clearTimeout(timer); setFade(true); });
    arm(); root.__fadeArm = () => { setFade(false); arm(); };
    plugin.register && plugin.register(() => window.clearTimeout(timer));
  }
  const pagesEl = panePages.createDiv({ cls: "age-relto__pages" });
  const booksEl = panePages.createDiv({ cls: "age-relto__books" });
  if (tabBar) {
    // `pages: hide` : un Relto « fini » sans onglet Pages (les pages se gèrent alors dans le livre des pages, sur la table de la cabane)
    const noPages = !!opt.pages && /^(hide|hidden|off|no|non)$/i.test(opt.pages);
    const defs = [["view", "tab.view", "eye"], ...(noPages ? [] : [["pages", "tab.pages", "file-text"]]), ["settings", "tab.settings", "settings"]], btns = {};
    const pick = (k) => { root.setAttr("data-tab", k); try { if (k !== "view") sound.roomStop(); else roomAudio(renderer.view); } catch (e) { /* ignore */ } ui0.reltoTab = k; for (const [id, b] of Object.entries(btns)) b.toggleClass("is-active", id === k); };
    for (const [k, key, ic] of defs) {
      const b = tabBar.createEl("button", { cls: "age-relto__tab" }); btns[k] = b;
      try { obsidian.setIcon(b.createSpan({ cls: "age-relto__tabicon" }), ic); } catch (e) { /* ignore */ }
      b.setAttr("aria-label", t(key)); b.addEventListener("click", () => { pick(k); plugin.saveExt(); if (k === "view") { try { renderer.draw(0); } catch (e) { /* ignore */ } if (root.__fadeArm) root.__fadeArm(); } });
    }
    if (!ctx.big) { const x = tabBar.createEl("button", { cls: "age-relto__tab age-relto__tab--expand" }); try { obsidian.setIcon(x.createSpan({ cls: "age-relto__tabicon" }), "maximize-2"); } catch (e) { /* ignore */ } x.setAttr("aria-label", t("tab.expand")); x.addEventListener("click", () => openReltoView(plugin, file)); } // la grande vue s'ouvre sur ce Relto-ci (celui de l'histoire, le cas échéant)
    { // le plein écran, dans la grande vue comme dans la note : dans la note, son conteneur prend le temps du plein écran l'habit de la grande vue
      const fs = tabBar.createEl("button", { cls: "age-relto__tab age-relto__tab--full" }); try { obsidian.setIcon(fs.createSpan({ cls: "age-relto__tabicon" }), "expand"); } catch (e) { /* ignore */ }
      fs.setAttr("aria-label", t("tab.fullscreen"));
      fs.addEventListener("click", () => toggleFull());
    }
    { // le guide, ouvert sur la rubrique de ce qu'on regarde (télescope, Imageur, chat : leur rubrique ; ailleurs : le refuge)
      const g = tabBar.createEl("button", { cls: "age-relto__tab age-relto__tab--guide" }); try { obsidian.setIcon(g.createSpan({ cls: "age-relto__tabicon" }), "book-open-text"); } catch (e) { /* ignore */ }
      g.setAttr("aria-label", t("tab.guide"));
      g.addEventListener("click", () => { const v = renderer && renderer.view; require("./guide").openGuide(plugin, ["telescope", "imager", "cat", "clock"].includes(v) ? "reltocat" : "relto2", "full", { over: root }); });
    }
    pick(defs.some((d) => d[0] === ui0.reltoTab) ? ui0.reltoTab : "view");
  } else { root.setAttr("data-tab", "all"); }
  // bascule vue de l'île ⇄ vue globale (petit bouton en coin de l'image) ; l'ouverture reste la vue de l'île
  // navigation entre les vues : île, vue globale et sous-vues (cabane, piliers, bosquet, bassin, chat) ; les boutons des vues sans page correspondante sont masqués
  const NAV = [["global", "globe", "relto.v.global"], ["island", "mountain", "relto.v.island"], ["cabin", "home", "relto.v.cabin"], ["imager", "aperture", "relto.v.imager"], ["telescope", "telescope", "relto.v.telescope"], ["clock", "clock", "relto.v.clock"], ["pillars", "landmark", "relto.v.pillars"], ["grove", "trees", "relto.v.grove"], ["pond", "fish", "relto.v.pond"], ["pondplus", "droplets", "relto.v.pondplus"], ["cat", "cat", "relto.v.cat"]]; // du plus loin au plus près : globale, île, cabane, Imageur, puis les vues de détail
  const nav = (tabBar || stage).createDiv({ cls: "age-relto__nav" + (tabBar ? " age-relto__nav--bar" : "") }); if (tabBar) tabBar.insertBefore(nav, tabBar.firstChild);
  // la roue des vues : un seul bouton (l'icône de la vue en cours) ; un clic ouvre, sur l'image, une roue de laiton avec les vues
  // disponibles en cercle (leur nom au moyeu, au survol) ; un clic sur une vue y va et referme la roue (Échap ou un clic ailleurs aussi)
  const navBtns = {}, iconOf = {}, wheelBtn = nav.createEl("button", { cls: "age-relto__viewbtn age-relto__wheelbtn", attr: { "aria-label": t("relto.views") } });
  try { obsidian.setIcon(wheelBtn, "compass"); } catch (e) { /* ignore */ } // la roue garde son icône : la boussole (l'île a son propre bouton)
  const wheel = stage.createDiv({ cls: "age-relto__wheel" }), hub = wheel.createDiv({ cls: "age-relto__wheelhub" });
  const closeWheel = () => { wheel.removeClass("is-open"); wheelBtn.removeClass("is-active"); };
  const openWheel = () => {
    const vis = NAV.map(([v]) => v).filter((v) => !navBtns[v].hasClass("is-hidden")), n = vis.length || 1;
    const R = Math.max(42, Math.min(118, Math.min(stage.clientWidth || 300, stage.clientHeight || 170) / 2 - 24));
    wheel.style.setProperty("--wr", R + "px");
    vis.forEach((v, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; navBtns[v].style.setProperty("--wx", (R * Math.cos(a)).toFixed(1) + "px"); navBtns[v].style.setProperty("--wy", (R * Math.sin(a)).toFixed(1) + "px"); });
    hub.setText(t("relto.views")); wheel.addClass("is-open"); wheelBtn.addClass("is-active");
  };
  wheelBtn.addEventListener("click", (e) => { e.stopPropagation(); if (wheel.hasClass("is-open")) closeWheel(); else openWheel(); });
  for (const [v, ic, key] of NAV) {
    const b = wheel.createEl("button", { cls: "age-relto__viewbtn age-relto__wheelitem" }); navBtns[v] = b; iconOf[v] = ic;
    try { obsidian.setIcon(b, ic); } catch (e) { /* ignore */ }
    b.setAttr("aria-label", t(key));
    b.addEventListener("mouseenter", () => hub.setText(t(key))); b.addEventListener("mouseleave", () => hub.setText(t("relto.views")));
    b.addEventListener("click", (e) => { e.stopPropagation(); renderer.setView(v); closeWheel(); });
  }
  // à côté de la roue, toujours là : l'île, pour y revenir d'un clic (entre la maison, l'Imageur et l'observatoire : les plaques de passage, dans l'image)
  const QUICK = ["island"], quickBtns = {};
  for (const v of QUICK) {
    const [, ic, key] = NAV.find((d) => d[0] === v), b = nav.createEl("button", { cls: "age-relto__viewbtn age-relto__quick" }); quickBtns[v] = b;
    try { obsidian.setIcon(b, ic); } catch (e) { /* ignore */ }
    b.setAttr("aria-label", t(key)); b.addEventListener("click", (e) => { e.stopPropagation(); closeWheel(); renderer.setView(v); });
  }
  // « vous êtes ici » : l'icône de la vue en cours, en surbrillance, après l'île (sur l'île, c'est le bouton île qui s'allume)
  const here = nav.createSpan({ cls: "age-relto__here is-hidden" });
  wheel.addEventListener("click", (e) => { if (e.target === wheel) closeWheel(); }); // un clic sur le fond de la roue la referme
  const offWheel = (e) => { if (!root.isConnected) { root.ownerDocument.removeEventListener("pointerdown", offWheel, true); root.ownerDocument.removeEventListener("keydown", escWheel, true); return; } if (wheel.hasClass("is-open") && !wheel.contains(e.target) && !wheelBtn.contains(e.target)) closeWheel(); };
  const escWheel = (e) => { if (e.key === "Escape" && wheel.hasClass("is-open")) { closeWheel(); e.stopPropagation(); } };
  root.ownerDocument.addEventListener("pointerdown", offWheel, true); root.ownerDocument.addEventListener("keydown", escWheel, true);
  const roomSoundOn = () => !!plugin.ext.sound && plugin.ext.soundRooms !== false;
  const roomVol = () => (plugin.ext.volume == null ? 0.35 : plugin.ext.volume) * 0.7;
  // enregistrements facultatifs de l'utilisateur (réglages > Son > Relto) : lus dans le coffre, décodés une fois
  const roomBufs = (plugin.__roomBufs = plugin.__roomBufs || new Map());
  const roomBuf = async (key) => {
    try {
      const n = String(plugin.ext[key] || "").trim().replace(/^\[\[|\]\]$/g, ""); if (!n) return null;
      const f = app.metadataCache.getFirstLinkpathDest(n, ctx.sourcePath) || app.vault.getAbstractFileByPath(n);
      if (!f || !AUDIO_EXT.includes(String(f.extension).toLowerCase())) return null;
      const id = f.path + ":" + (f.stat ? f.stat.mtime : 0); if (roomBufs.has(id)) return roomBufs.get(id);
      const c = sound.audioContext(); if (!c) return null;
      const buf = await c.decodeAudioData((await app.vault.readBinary(f)).slice(0)); roomBufs.set(id, buf); return buf;
    } catch (e) { console.warn("[Age Writer ext] fichier son", e); return null; }
  };
  const fireLit = () => (renderer.scene ? renderer.scene.additions.find((x) => x.type === "chimney") : null) || null; // le feu ne crépite que si la page cheminée est active
  const humVol = () => { const v = Number(plugin.ext.imagerHumVol); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; };
  let roomSeq = 0;
  const roomAudio = async (v) => {
    const my = ++roomSeq;
    try {
      if (!(roomSoundOn() && (v === "pond" || v === "pondplus" || v === "cat" || v === "lounge" || ((v === "cabin" || v === "atelier" || v === "atelierback") && fireLit()) || (v === "imager" && plugin.ext.soundImagerHum !== false)) && root.getAttribute("data-tab") !== "settings" && root.getAttribute("data-tab") !== "pages")) { sound.roomStop(); return; }
      const tap = v === "lounge" && !!renderer.tapOn, stove = v === "lounge" && !tap; // le salon : le poêle crépite ; le robinet ouvert, l'eau coule
      const bufs = stove ? { main: await roomBuf("roomFireFile"), d: 0.45 } : v === "imager" ? { k: renderer.imagerClarity().atmo, total: renderer.imagerClarity().total, locked: !!(renderer.imager && renderer.imager.settings && renderer.imager.settings.lock) } : v === "cat" ? { main: await roomBuf("roomPurrFile"), meow: await roomBuf("roomMeowFile") } : (v === "cabin" || v === "atelier" || v === "atelierback") ? { main: await roomBuf("roomFireFile"), d: fireLit().density } : tap ? {} : { main: await roomBuf("roomWaterFile") }; // le robinet a son propre son (synthétisé), pas celui du bassin
      if (my !== roomSeq) return; // on a changé de vue pendant le chargement
      sound.roomStart(v === "imager" ? "imager" : v === "cat" ? "cat" : tap ? "tap" : (stove || v === "cabin" || v === "atelier" || v === "atelierback") ? "fire" : "water", roomVol() * (v === "imager" ? humVol() : tap ? 1 : 1), bufs); /* le robinet : ses gains sont déjà bas (un petit filet, pas un geyser) */
    } catch (e) { /* ignore */ }
  };
  const syncView = (v) => { const cur = v || "island"; for (const [id, b] of [...Object.entries(navBtns), ...Object.entries(quickBtns)]) b.toggleClass("is-active", id === cur); here.toggleClass("is-hidden", cur === "island" || !iconOf[cur]); if (iconOf[cur] && cur !== "island") { try { obsidian.setIcon(here, iconOf[cur]); } catch (e) { /* ignore */ } here.setAttr("aria-label", t(NAV.find((d) => d[0] === cur)[2])); }  roomAudio(v); };
  const syncNav = (sc) => { const av = renderer.available(); for (const [id, b] of [...Object.entries(navBtns), ...Object.entries(quickBtns)]) b.toggleClass("is-hidden", !av[id]); syncView(renderer.view); void sc; };
  syncView("island");
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // l'Imageur : lire la note de l'Âge posé sur le lutrin, l'analyser (physique comprise), en tirer le ciel et la vue
  const imagerAge = async (age) => {
    try {
      const f = app.vault.getAbstractFileByPath(age.path); if (!f) return null;
      const src = plugin.core.extract(await app.vault.cachedRead(f)); if (src == null) return null;
      const name = plugin.core.seed(f.path), a = plugin.core.analyse(src, { seed: name }); // la graine (`age_seed` après un renommage)
      const S = G.sceneOf(a, name, plugin.core.blocks), sky = SKY.parseSky(src); if (S) Object.assign(S, sky);
      // étape 2 : le système d'étoile (télescope) et l'orbite de la planète (micromètre de l'Imageur)
      const system = SS.systemOf(a, src, name); // étape 3 : ses perturbateurs font dériver plus vite la calibration
      return { target: IM.targetsOf(a, name), model: S ? G.build(S, 300, 176) : null, system, orbit: CAL.orbitOf(a, name, sky, system.near) };
    } catch (e) { console.warn("[Age Writer ext] imageur", e); return null; }
  };
  // le Rêve (étape 4d) : l'Âge verrouillé sur l'Imageur, son tirage et deux tirages voisins (graine, Great Zero, jour), et ce qu'ils montrent
  const dreamAge = async (age, gz) => {
    try {
      const f = app.vault.getAbstractFileByPath(age.path); if (!f) return null;
      const src = plugin.core.extract(await app.vault.cachedRead(f)); if (src == null) return null;
      const seed = plugin.core.seed(f.path), now = Date.now(), day = DR.dayOf(now, new Date(now).getTimezoneOffset());
      const main = plugin.core.analyse(src, { seed, probe: true }); if (!main) return null;
      const seeds = DR.altSeeds(seed, gz, day), alts = seeds.map((s) => { try { return plugin.core.analyse(src, { seed: s, probe: true }); } catch (e) { return null; } });
      const sky = SKY.parseSky(src), sceneOf = (a, nm) => { if (!a) return null; const S = G.sceneOf(a, nm, plugin.core.blocks); if (!S) return null; Object.assign(S, sky); return G.build(S, 640, 360); };
      const models = [sceneOf(main, seed), ...alts.map((a, k) => sceneOf(a, seeds[k]))]; if (!models[0]) return null;
      const { blockById } = require("./engine/registry"), MUT = require("./mutation"), LF = require("./life");
      const items = DR.contentOf(main, alts.filter(Boolean), { seed, axisOf: (id) => (blockById.get(id) || {}).axis, keystoneOf: MUT.keystoneOf, prose: LF.blightProse }).items;
      return { seed, name: age.name, path: age.path, models: models.map((m) => m || models[0]), items };
    } catch (e) { console.warn("[Age Writer ext] rêve", e); return null; }
  };
  // mode Guilde : un monde que personne n'a écrit (src/unwritten.js), analysé et peint comme un Âge de l'étagère ; son nom
  // (jamais celui d'une note du coffre) est celui qu'aura la note si on le transcrit
  const taken = (nm) => !!app.vault.getMarkdownFiles().some((f) => f.basename === nm);
  const unwrittenDep = () => ({
    analyse: (text, name) => plugin.core.analyse(text, { seed: name }), prose: plugin.core.prose, taken,
    scene: (a, name, text) => { const S = G.sceneOf(a, name, plugin.core.blocks); if (!S) return null; Object.assign(S, SKY.parseSky(text)); return G.build(S, 300, 176); },
  });
  const unwrittenFind = (cry, s) => { try { return UW.find(cry, s, unwrittenDep()); } catch (e) { console.warn("[Age Writer ext] monde non écrit", e); return null; } };
  const onTranscribe = async (u) => {
    try { const f = await plugin.transcribeWorld(u); if (!f) return null; plugin.refreshLive(); return f.basename; } catch (e) { console.warn("[Age Writer ext] transcription", e); return null; }
  };
  // les glyphes des cristaux : le dessin du moteur, en image (une fois par page)
  const glyphImgs = new Map();
  const glyphImage = (id) => {
    if (!id) return null; if (glyphImgs.has(id)) return glyphImgs.get(id);
    let img = null;
    try { img = new Image(); img.onload = () => { if (!renderer.running) renderer.draw(0); }; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" style="color:#e0c27a" color="#e0c27a">${plugin.core.glyphSvg(id, 0, 0, 100, "light")}</svg>`); } catch (e) { img = null; }
    glyphImgs.set(id, img); return img;
  };
  // le livre descriptif monté dans le Relto (src/relto-descbook.js) : le vrai livre du moteur ; un livre vierge crée sa note au premier ajout
  /** Rattache le livre de liaison d'un Âge neuf à l'étagère de ce Relto : s'il a une liste blanche (`relto_books`), l'Âge y entre. */
  const attachToShelf = async (f) => {
    try { await app.fileManager.processFrontMatter(file, (fm) => { if (Array.isArray(fm.relto_books)) { if (!fm.relto_books.includes(f.basename)) fm.relto_books.push(f.basename); } else if (typeof fm.relto_books === "string" && fm.relto_books.trim()) fm.relto_books += ", " + f.basename; }); } catch (e) { /* le Relto n'a pas de liste blanche : l'Âge s'y montre déjà */ }
  };
  // le nom écrit sur la couverture d'un livre vierge (src/relto-descbook.js) devient celui de la note ; nettoyé des caractères interdits dans un chemin, repli sur « Age » si vide
  const createAgeNote = async (line, name) => {
    const base = "Age", clean = String(name || "").trim().replace(/[\\/:*?"<>|#^[\]]/g, "").replace(/\s+/g, " ").slice(0, 100), title = clean || base;
    const body = `# ${title}\n\n\`\`\`age\n${String(line || "").trim()}\n\`\`\`\n`;
    try {
      const inStory = !!(scene && scene.mode === "story"), dir = inStory ? ST.dirOf(file.path) : "";
      let f; if (inStory && dir) { let n = 1, path; do { path = `${dir}/${base}${n > 1 ? " " + n : ""}.md`; n++; } while (app.vault.getAbstractFileByPath(path) || app.vault.getMarkdownFiles().some((x) => x.basename === path.replace(/^.*\//, "").replace(/\.md$/, ""))); f = await app.vault.create(path, body); plugin.index.invalidate(); } // l'histoire garde sa numérotation fixe : le nom tapé n'y vaut pas
      else f = await plugin.createNoteIn(title, body);
      await attachToShelf(f); plugin.refreshLive(); return f;
    } catch (e) { console.warn("[Age Writer ext] livre vierge", e); return null; }
  };
  const onDescMount = (root, path, flip, link) => {
    const f = path ? app.vault.getAbstractFileByPath(path) : null, ctrl = DB.mount(plugin, root, { file: f instanceof obsidian.TFile ? f : null, fr: plugin.lang() === "fr", onCreate: createAgeNote, onFlip: flip, onOpen: (age) => { if (plugin.ext.sound && plugin.ext.soundLink !== false) sound.linkSound(plugin.ext.volume); app.workspace.openLinkText(age.path, "", false); } }); // toucher la vitre : le son de liaison, puis la note s'ouvre (sans l'animation du Relto)
    ctrl.render(); return ctrl;
  };
  // le registre de l'Imageur (src/relto-ledger.js, src/lectern.js) : lit l'Âge posé sur le lutrin, par couches selon le titre d'écrivain
  const onLedger = async (age) => {
    try {
      const f = app.vault.getAbstractFileByPath(age.path); if (!f) return null;
      const src = plugin.core.extract(await app.vault.cachedRead(f)); if (src == null) return null;
      const seed = plugin.core.seed(f.path), a = plugin.core.analyse(src, { seed }); if (!a) return null;
      const fr = plugin.lang() === "fr", tier = plugin.status ? plugin.status.tier() : 0, H = require("./engine/hooks").hooks;
      let prose = ""; try { prose = String(plugin.core.prose(a.resolved, { seed }) || ""); } catch (e) { prose = ""; }
      return LEC.readOut(a, { tier, fr, prose, dosage: H.dosageNote(a.dosage), depth: tier >= 2 ? H.depthNote(src, seed) : "" });
    } catch (e) { console.warn("[Age Writer ext] registre", e); return null; }
  };
  const imagerGet = (path) => (plugin.ext.imagerTunings || {})[path] || null;
  const imagerSet = (path, s) => { plugin.ext.imagerTunings = { ...(plugin.ext.imagerTunings || {}), [path]: s }; plugin.saveExt(); if (s && s.lock) { clearTimeout(plugin._lockTick); plugin._lockTick = window.setTimeout(() => storyTick(plugin), 400); } }; // un verrou tiré peut réussir le chapitre de l'Imageur
  // le télescope : visée et Great Zero trouvé, gardés par Relto (nom + graine), comme les réglages de l'Imageur
  const telescopeGet = (key) => (plugin.ext.telescope || {})[key] || null;
  const telescopeSet = (key, s) => {
    const old = (plugin.ext.telescope || {})[key] || {}, was = !!old.found, nSys = (o) => Object.keys((o && o.systems) || {}).length;
    plugin.ext.telescope = { ...(plugin.ext.telescope || {}), [key]: s }; plugin.saveExt();
    if (s && s.found && !was) refresh().catch((e) => console.warn("[Age Writer ext] relto", e)); // le Zéro trouvé débloque l'horloge D'ni
    if (nSys(s) > nSys(old)) plugin.refreshLive(); // un système situé : les Détails des Âges le disent
  };
  zero.scene = () => scene;
  const onTelescopeSound = (k, s) => { if (roomSoundOn() && sound.telescopeSfx) sound.telescopeSfx(k, s, roomVol()); };
  // le livre de la bibliothèque : les lignes lues dans les notes (relues à l'ouverture et après chaque ajout), et l'écriture sans ouvrir la note
  let libData = { ages: [], relto: [] };
  const libReload = async () => { try { libData = { ages: await B.libraryLines(plugin, "ages"), relto: await B.libraryLines(plugin, "relto") }; } catch (e) { console.warn("[Age Writer ext] library book", e); } renderer._lbData = null; renderer.draw(0); };
  /* la voix que le diapason garde (Imageur, deux voix) : gardée dans la réserve du plugin, par Relto ; le Livre reste dans la fente jusqu'à l'étouffoir */
  const forkGet = () => (plugin.ext.fork && typeof plugin.ext.fork === "object" && plugin.ext.fork[file.path]) || null;
  const forkPut = (v) => { const m = { ...(plugin.ext.fork && typeof plugin.ext.fork === "object" ? plugin.ext.fork : {}) }; if (v) m[file.path] = v; else delete m[file.path]; plugin.ext.fork = m; plugin.saveExt(); };
  const pool = () => poolOfScene(scene); /* la réserve de ce Relto (section 19.2) */
  const storyLater = () => { if (scene && scene.mode === "story") window.setTimeout(() => refresh().catch((e) => console.warn("[Age Writer ext] relto", e)), 300); }; /* un geste de la caverne ou de la machine peut finir un chapitre */
  const renderer = new ReltoRenderer(canvas, plugin.dni, { touch, wheelOk: () => !!root.closest(".age-reltoview") || !!root.ownerDocument.fullscreenElement, rotated: () => touch && root.hasClass("is-mobilefull") && !!(window.matchMedia && window.matchMedia("(orientation: portrait)").matches), onTip: tipCard ? (text, parts) => { /* la carte d'infobulle, au doigt : le texte, et une ligne de valeur en chiffres D'ni (la machine) */
      tipCard.empty(); tipCard.toggleClass("is-empty", !text && !(parts && parts.length));
      if (parts && parts.length) { const line = tipCard.createDiv({ cls: "age-relto__tipdni" }); for (const p of parts) { if (typeof p === "string") line.createSpan({ text: p }); else setMarkup(line.createSpan({ cls: "age-relto__tipnum" }), plugin.dni.numberSvg(p.n, { size: 18 })); } }
      if (text) tipCard.createDiv({ text });
    } : null, atelierDirect: () => plugin.ext.atelierDirect !== false, bookAnim: () => plugin.ext.bookAnim !== false, libraryData: () => libData, onLibraryOpen: () => { libReload(); },
    /* le diapason : frappé une fois, il garde la voix du livre posé, tant qu'on ne le refrappe pas (en Art de la Guilde, trouver un autre monde prend du temps) ; frappé de nouveau sur un autre livre, les deux chantent ensemble */
    /* la machine et la caverne agissent sur la réserve de ce Relto (section 19.2) : le bac à sable, ou celle du Relto histoire */
    caveState: () => (plugin.caveState ? plugin.caveState(pool()) : {}),
    /* le cachet (src/ward.js) : sur le bureau quand la bande du haut des fresques a été vue ; un Livre scellé garde le serpent */
    /* le 17 (src/story-stone.js) : emporter la pierre, la lâcher dans la fissure ; ce qui change ensuite dans la caverne */
    stoneState: () => { if (!scene || scene.mode !== "story" || !pool()) { const any = plugin.bahroSt ? plugin.bahroSt(null) : null; return { scarabs: any ? STONE.endingOf(any) : null }; } /* le bac à sable : seulement les scarabées de la fin prise dans l'histoire */ const st = ST.get(plugin.ext.story || (plugin.ext.story = {}), pool()); return { canTake: STONE.canTake(st), ending: STONE.endingOf(st), scarabs: STONE.endingOf(st), place: STONE.placeOf(st), dark: STONE.chamberDark(st), traces: STONE.tracesOn(st), cut: STONE.frescoCut(st) }; },
    onStoneGive: () => { const pl = pool(); if (!pl) return false; const st = ST.get(plugin.ext.story || (plugin.ext.story = {}), pl); if (!STONE.give(st, Date.now())) return false; plugin.saveExt(); clearTimeout(plugin._stoneTick); plugin._stoneTick = window.setTimeout(() => storyTick(plugin), 7500); return true; },
    onStoneCry: () => { if (plugin.ext.sound && plugin.ext.soundRooms !== false) sound.caveSfx("cry", (plugin.ext.volume == null ? 0.35 : plugin.ext.volume) * 0.6); },
    /* l'ardoise (src/slate.js) : arrivée au matin après le 17, dans le Relto histoire comme au bac à sable ; ce qu'on y trace reste jusqu'au Livre suivant */
    /* le Rehevkor (src/rehevkor.js) : les pages entendues sont celles des chapitres réussis (du Relto histoire ; au bac à sable, de celui dont le 17 est fini) */
    lang: () => (plugin.lang() === "fr" ? "fr" : "en"), lawsDone: () => { const st = plugin.bahroSt ? plugin.bahroSt(pool()) : null; if (st) return st.done || []; const sc0 = scene; if (!sc0 || sc0.mode !== "story" || !pool()) return []; return ST.get(plugin.ext.story || (plugin.ext.story = {}), pool()).done || []; },
    slateState: () => { const pl = pool(), st = plugin.bahroSt ? plugin.bahroSt(pl) : null, now = Date.now(); if (!st || !SLATE.arrived(st, now)) return {}; const X = plugin.poolExt(pl), sl = SLATE.stateOf(X, now); if (SLATE.morningWipe(X, now)) { plugin.saveExt(); new obsidian.Notice(t("slate.wiped"), 8000); } return { here: !sl.sent, strokes: sl.strokes, signs: sl.signs }; },
    onSlateTrace: (strokes) => { const X = plugin.poolExt(pool()), out = SLATE.trace(X, strokes, Date.now()); plugin.saveExt(); return out; },
    onSlateErase: () => { if (SLATE.erase(plugin.poolExt(pool()), Date.now())) plugin.saveExt(); },
    sealState: () => (scene && scene.mode === "story" && plugin.caveState ? { here: WARD.sealHere(plugin.caveState(pool())) } : {}),
    wardOf: (age) => { const pl = pool(); return !!(pl && age && age.path && WARD.isWarded(plugin.poolExt(pl), plugin.core.seed(age.path))); },
    onWard: (age) => { const pl = pool(); if (!pl || !age || !age.path) return ""; const on = WARD.toggle(plugin.poolExt(pl), plugin.core.seed(age.path)); plugin.saveExt(); if (plugin.index) plugin.index.invalidate(); plugin.refreshLive(); return t(on ? "ward.on" : "ward.off", { name: age.name }); },
    ovenState: (now) => (plugin.ovenState ? plugin.ovenState(now, pool()) : {}),
    cellarState: () => (plugin.cellarState ? plugin.cellarState(pool()) : null), /* la cave sous la machine (src/cellar.js) : null tant que la machine n'est pas là */
    onCellar: (act, id, slot) => { const msg = plugin.cellarAct ? plugin.cellarAct(act, id, slot, pool()) : null; if (roomSoundOn() && act !== "take") sound.ovenSfx(act === "lift" ? "take" : act === "sieve" ? "drain" : "click", roomVol()); return msg; },
    onOven: (act, arg) => { const msg = plugin.ovenAct ? plugin.ovenAct(act, arg, pool()) : null; if (act === "tray") storyLater(); if (roomSoundOn()) sound.ovenSfx(act === "door" && !msg ? "start" : act === "tray" ? "take" : act === "drain" ? "drain" : act === "burn" && plugin.ext.oven && plugin.ext.oven.burnt && Date.now() - plugin.ext.oven.burnt.at < 500 ? "burn" : "click", roomVol()); return msg; },
    onCaveDrop: () => { if (plugin.caveDrop && plugin.caveDrop(pool()) && roomSoundOn()) sound.caveSfx("drop", roomVol()); },
    onCaveSeen: () => { if (plugin.caveSeen) plugin.caveSeen(pool()); storyLater(); },
    scopeState: () => (plugin.scopeState ? plugin.scopeState(pool()) : {}),
    onCaveSample: () => { const msg = plugin.caveSample ? plugin.caveSample(pool()) : null; if (roomSoundOn()) sound.ovenSfx("take", roomVol()); return msg; },
    onScopeCrumb: () => { if (roomSoundOn()) sound.ovenSfx("click", roomVol()); },
    onCavePick: (k) => { if (plugin.cavePick) plugin.cavePick(k, pool()); if (roomSoundOn()) sound.ovenSfx("click", roomVol()); },
    onCaveSlab: (i) => { const res = plugin.caveSlab ? plugin.caveSlab(i, scene, pool()) : null; if (res === "open") storyLater(); if (res && roomSoundOn()) sound.slabSfx(res === "open" ? "open" : "notch", roomVol()); return res; }, /* un cran : un raclement bref ; les six justes : la pierre qui bascule, une fois */
    onCaveHatch: () => { if (plugin.caveHatch) plugin.caveHatch(pool()); if (roomSoundOn()) sound.slideStone(roomVol()); },
    onCaveSfx: (kind) => { if (kind === "cry" && pool() && !STONE.tracesOn(ST.get(plugin.ext.story || (plugin.ext.story = {}), pool()))) return; /* le commandement : plus un cri */ if (roomSoundOn()) sound.caveSfx(kind, roomVol()); },
    dreamLast: (age) => (plugin.dreamLast ? plugin.dreamLast(age, pool()) : null),
    onDreamStart: (age) => { if (plugin.dreamMark) plugin.dreamMark(age, pool()); if (roomSoundOn()) sound.caveSfx("cry", roomVol() * 0.4); },
    onDreamAge: (age, gz) => dreamAge(age, gz),
    dreamGuide: () => plugin.ext.dreamGuide || null,
    onDreamGuide: (id) => (plugin.toggleDreamGuide ? plugin.toggleDreamGuide(id) : null),
    onDreamWake: (res) => { if (plugin.dreamWoke) plugin.dreamWoke(res); },
    onForkDamp: () => forkPut(null), onForkKeep: (snap) => { const f = forkGet(); if (f) forkPut({ ...f, snap }); },
    onTwoVoices: (age, target, onLine) => {
      if (!age || !target) return; const GI = require("./imager-guild"), vol = roomVol(), now = Date.now(), held = forkGet();
      if (!held) { forkPut({ name: age.name, path: age.path, target, at: now }); if (roomSoundOn()) sound.twoVoices(target.freq, target.freq, "full", vol * 0.6); onLine(plugin.t("two.fork.ring", { a: age.name }), true); if (scene && scene.mode === "story") storyStruck(plugin, age.path, target.freq); return; }
      const ac = GI.accordOf(held.target, target); if (!ac) return; /* le diapason garde sa voix : on essaie un autre monde, puis un autre ; l'étouffoir seul la lui fait oublier */
      if (scene && scene.mode === "story") storyHeard(plugin, held.path || held.name, age.path || age.name, ac.degree, held.target.freq, target.freq); /* le chapitre 14 */
      if (roomSoundOn()) sound.twoVoices(held.target.freq, target.freq, ac.degree, vol * 0.6);
      onLine(X.twoVoicesLine(plugin.t.bind(plugin), held.name, age.name, ac), false);
    },
    wonders: () => (plugin.wondersShown ? plugin.wondersShown() : plugin.ext.wonders || {}), onForget: (id, gone) => plugin.forgetWonders && plugin.forgetWonders(id, (ok) => { if (ok && gone) gone(); }), onWonder: () => { if (roomSoundOn() && sound.crystalChord) sound.crystalChord([523.25, 659.25, 783.99], 0, roomVol() * 0.5); },
    vaultAges: () => (scene ? (scene.ages || []) : []).map((a) => ({ name: a.name, path: a.path })), onDescMount, onLedger, onLibraryAdd: async (kind, text) => { const res = await B.addLibraryLines(plugin, kind, text); if (res.ok) { if (kind === "relto") plugin.refreshLive(); await libReload(); } return res; }, mailState: () => mailState(plugin, file), statusState: () => { const tier = plugin.status ? plugin.status.tier() : 0; return { tier, korfah: !!(plugin.status && plugin.status.korfah()), title: plugin.t("status.title." + tier) }; }, relicState: () => relicsOf(plugin, file), hearState: () => hearStateOf(plugin, file, scene),
    onKnock: (k) => { if (roomSoundOn()) { if (k === "sword") return sound.jingle(roomVol() * 0.7); if (k === "coffin") { sound.knock(roomVol() * 0.5, { hollow: true }); window.setTimeout(() => sound.slideStone(roomVol() * 0.9), 220); return; } sound.knock(roomVol() * (k === "stone" ? 0.55 : k === "press" ? 0.8 : k === "book" ? 0.9 : 1.6), { hollow: k !== "press" && k !== "stone" }); if (k === "book") window.setTimeout(() => sound.slideStone(roomVol() * 1.5), 250); else if (k === "open") window.setTimeout(() => sound.slideWood(roomVol() * 1.5, { open: true }), 300); } },
    glyphSvg: (id) => { try { return plugin.core.glyphSvg(id, 0, 0, 100, "none"); } catch (e) { return ""; } }, onFlip: () => { if (roomSoundOn()) sound.pageTurn(roomVol() * 1.2, { quick: true }); }, onRelic: (k) => { if (!roomSoundOn()) return; if (k === "open" || k === "close") sound.slideWood(roomVol() * 1.3, { open: k === "open" }); else sound.knock(roomVol() * 0.9, { hollow: false }); }, telescopeGen: () => plugin.telescopeGen || 0, instrumentsMode: () => INS.modeOf(plugin.ext), lensHints: () => plugin.ext.lensHints !== false,hoverFrame: plugin.ext.hoverFrame === true, imagerHum: () => ({ on: plugin.ext.soundImagerHum !== false, vol: humVol() }), onImagerHum: (a) => { if (a.toggle) plugin.ext.soundImagerHum = plugin.ext.soundImagerHum === false; else plugin.ext.imagerHumVol = Math.round(Math.max(0, Math.min(1, humVol() + a.delta * 0.2)) * 10) / 10; if (a.delta && plugin.ext.soundImagerHum === false && plugin.ext.imagerHumVol > 0) plugin.ext.soundImagerHum = true; plugin.saveExt(); roomAudio("imager"); }, notes: plugin.ext.imagerNotes || "words", onImagerAge: imagerAge, unwrittenFind, onTranscribe, imagerGet, imagerSet, glyphImage, t, telescopeGet, telescopeSet, onTelescopeSound, onImagerTune: () => { const cl = renderer.imagerClarity(); if (sound.imagerTune) sound.imagerTune(cl.atmo, cl.total, !!(renderer.imager && renderer.imager.settings && renderer.imager.settings.lock)); }, onImagerSound: (k) => { if (roomSoundOn() && sound.imagerSfx) sound.imagerSfx(k, roomVol()); }, onImagerChord: (fs, beat) => { if (roomSoundOn() && sound.crystalChord) sound.crystalChord(fs, beat, roomVol()); const im = renderer.imager; if (scene && scene.mode === "story" && im && im.age && im.target) storyStruck(plugin, im.age.path, im.target.freq); }, reducedMotion: reduced, onView: (v) => { syncView(v); if ((v === "atelier" || v === "desk") && roomSoundOn()) { const hs = hearStateOf(plugin, file, scene); if (hs.hum > 0 && Number.isFinite(hs.freq)) sound.twoVoices(hs.freq, hs.freq, "full", roomVol() * 0.25 * hs.hum); } /* l'encrier répond à la voix du monde étrange : une seconde voix, très basse */ if (v === "atelier") { const rs = relicsOf(plugin, file); if (!rs.seen) { rs.seen = true; plugin.saveExt(); } syncKey(); } }, onMeow: () => { if (roomSoundOn()) roomBuf("roomMeowFile").then((b) => sound.meow(roomVol() * 1.4, b)); }, onPurr: () => { if (roomSoundOn()) roomBuf("roomPurrFile").then((b) => sound.purr(roomVol(), b)); }, onToy: (k) => { if (!roomSoundOn()) return; if (k === "bell") sound.jingle(roomVol()); else if (k === "mouse") sound.squeak(roomVol()); }, onPageToggle: async (id) => { const on = scene && scene.pagesActive.includes(id); await reltoEdit((l) => (on ? l.filter((x) => x !== id) : M.attachPage(l, id))); plugin.refreshLive(); }, onClasp: () => { if (roomSoundOn()) sound.bookOpen(roomVol() * 0.9, { clicks: true, book: false }); }, onTap: () => roomAudio(renderer.view), onSpecial: (kind) => { if (kind === "reltobook") { require("./relto-book").openInRelto(plugin, canvas.parentElement || root, file, { onHere: () => renderer.setView("island") }); return; } /* le Livre du Relto, pris sur le piédestal : par-dessus le Relto, comme un livre de liaison */ if (kind === "story") storyNext(plugin); else if (kind === "treatise") require("./guide").openGuide(plugin, null, "full", { over: root, book: { title: t("guide.treatise"), dni: plugin.ext.dniText && plugin.dni.hasFont() ? plugin.dni.textFor(t("guide.treatise")) : "", font: plugin.dni.textStack ? plugin.dni.textStack() : "", onFlip: () => { if (roomSoundOn()) sound.pageTurn(roomVol() * 1.2, { quick: true }); } } }); else if (kind === "mail") openMail(plugin, file).then(() => renderer.draw(0)); else if (kind === "surveyor") B.openSurveyorBook(plugin, scene ? scene.ages : []); else if (kind === "glyphs") { if (renderer.available().glyphbook) renderer.setView("glyphbook"); else B.openGlyphBook(plugin, scene ? scene.ages : []); } else if (renderer.available().librarybook) renderer.setView("librarybook"); else B.openLibraryBook(plugin); }, onOpen: (age) => playLinkAnim(plugin, age, canvas.parentElement || document.body, () => { if (plugin.ext.sound && plugin.ext.soundLink !== false) sound.linkSound(plugin.ext.volume); }, () => app.workspace.openLinkText(age.path, "", false)) });
  { const fk = forkGet(); if (fk && fk.name) renderer.forkHeld = { name: fk.name, path: fk.path, snap: fk.snap || null }; } /* le Livre d'hier est encore dans la fente */
  let scene = null, fixed = opt.time != null && !isNaN(Number(opt.time)) ? Number(opt.time) : null;

  const fmt = (h) => { const m = Math.round(Number(h) * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const showSky = (h) => { clock.setText(fmt(h)); if (skyVal) skyVal.setText(fmt(h)); }; // l'heure du ciel se lit aussi à côté du curseur
  const syncClock = () => { const h = renderer.hour(); showSky(h); slider.value = String(h); };
  slider.addEventListener("input", () => { fixed = Number(slider.value); renderer.setHour(fixed); showSky(fixed); if (reduced) renderer.draw(0); });
  nowBtn.addEventListener("click", () => { fixed = null; renderer.setHour(null); syncClock(); if (reduced) renderer.draw(0); });

  const reltoEdit = (fn) => app.fileManager.processFrontMatter(file, (fm) => { const a = Array.isArray(fm.relto_pages_active) ? fm.relto_pages_active.map((x) => M.stripLink(x)) : []; fm.relto_pages_active = fn(a); });

  // le son se règle par SON, plus par page : plusieurs pages qui jouent le même son n'ont qu'un réglage (allumé, volume)
  const soundCfg = (name) => { const ui = (plugin.ext.state.ui = plugin.ext.state.ui || {}); const all = (ui.reltoSoundBy = ui.reltoSoundBy || {}); return (all[name] = all[name] || {}); };
  /** couches du refuge : une entrée par page active, réglable (muet / volume), puis niveau zen. */
  function reltoLayers() {
    const act = scene ? scene.pages.filter((p) => p.state === "active") : [], names = [];
    let L = {};
    for (const p of act) for (const n of p.audio) {
      const c = soundCfg(n); if (c.on === false) continue;
      const v = c.vol == null ? 1 : c.vol, pl = sound.layersForNames([n]);
      for (const k in pl) L[k] = Math.max(L[k] || 0, pl[k] * v);
      if (!names.includes(n)) names.push(n);
    }
    if (!act.length) L = { wind: 0.25, drone: 0.15, pad: 0.2 };
    if (mode() !== "full") L = sound.zenify(L, mode());
    return { layers: L, names };
  }
  const soundFiles = (names) => names.filter((n) => !sound.PRESETS[n]).map((n) => app.metadataCache.getFirstLinkpathDest(n, ctx.sourcePath)).filter((f) => f && AUDIO_EXT.includes(f.extension.toLowerCase()));
  const factor = () => (plugin.ext.reltoVolume == null ? 0.6 : plugin.ext.reltoVolume);
  const liveSound = () => { if (soundBtn && plugin.soundBtn === soundBtn && soundBtn.classList.contains("is-on")) plugin.restartSound(reltoLayers().layers, scene ? scene.name : ""); };

  /** Les familles de pages, dans l'ordre où elles s'affichent (selon ce que la page ajoute au Relto). */
  const PAGE_FAMILIES = [["disguise", ["glasshouse", "castle"]], ["plants", ["vegetation", "flowers", "grass", "stalktree"]], ["water", ["waterfall", "koi", "ponddecor", "dock"]], ["sky", ["aurora", "moons", "comet", "snow", "rain", "storm", "mist", "fireworks"]], ["creatures", ["cat", "cattoys", "marcel", "birds", "butterflies", "fireflies"]], ["stone", ["mountain", "pillars", "islets", "gems", "gold", "silver"]], ["places", ["lanterns", "chimney", "bench"]], ["instruments", ["imager", "telescope", "dniclock", "calendar"]], ["atelier", ["atelier", "inkwell"]]];
  function renderPages() {
    pagesEl.empty();
    const ui = (plugin.ext.state.ui = plugin.ext.state.ui || {});
    let hidden = opt.pages ? /^(hide|hidden|off|no|non)$/i.test(opt.pages) : !!ui.reltoHidden;
    const nAct = scene.pages.filter((p) => p.state === "active").length;
    const label = () => `${tabsOn ? "" : hidden ? "▸ " : "▾ "}${t("relto.pages")} · ${nAct}/${scene.pages.length}`;
    if (tabsOn) hidden = false;
    const head = pagesEl.createEl(tabsOn ? "div" : "button", { cls: "age-relto__pageshead" + (tabsOn ? "" : " age-relto__toggle"), text: label() });
    const body = pagesEl.createDiv({ cls: "age-relto__pagesbody" + (hidden ? " is-hidden" : "") });
    if (!tabsOn) head.addEventListener("click", () => { hidden = !hidden; body.toggleClass("is-hidden", hidden); head.setText(label()); if (!opt.pages) { ui.reltoHidden = hidden; plugin.saveExt(); } });
    if (!scene.pages.length && !scene.missingPages.length) body.createDiv({ cls: "age-relto__hint", text: t("relto.nopages") });
    // rangées par état, chacune repliable (ouverte ou fermée : gardé) ; puis les sons des pages actives, un réglage par son
    const open = (ui.reltoPagesOpen = ui.reltoPagesOpen || { active: true, available: true, locked: false, missing: true, sounds: true });
    const section = (key, title, n) => {
      const d = body.createEl("details", { cls: "age-relto__sec age-relto__sec--" + key }); if (open[key] !== false) d.setAttr("open", "");
      const sm = d.createEl("summary", { cls: "age-relto__sechead" }); sm.createSpan({ text: title }); sm.createSpan({ cls: "age-relto__secn", text: String(n) });
      d.addEventListener("toggle", () => { open[key] = d.open; plugin.saveExt(); });
      return d.createDiv({ cls: "age-relto__secbody" });
    };
    const nameOf = (p) => p.label || String(p.id).replace(/^page_/, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    const whatOf = (p) => p.additions.map((a) => fxLabel(a, plugin.lang())).join(" · ");
    // trois colonnes alignées (la page · ce qu'elle ajoute au Relto, ou pourquoi elle est verrouillée · le bouton), avec leurs titres
    const colHead = (box, cells) => { const h = box.createDiv({ cls: "age-relto__colhead" }); for (const c of cells) h.createSpan({ text: c }); };
    const row = (box, p) => {
      const r = box.createDiv({ cls: `age-relto__page is-${p.state}` });
      if (p.path) { const a = r.createEl("a", { cls: "internal-link age-relto__pname", text: nameOf(p), attr: { title: p.id } }); a.addEventListener("click", (e) => { e.preventDefault(); app.workspace.openLinkText(p.path, "", false); }); }
      else if (p.id === "page_marcel") { // Marcel : son nom doré, en italique, et une petite patte à côté
        const sp = r.createSpan({ cls: "age-relto__pname age-relto__marcel", text: nameOf(p), attr: { title: nameOf(p) } });
        sp.insertAdjacentHTML("beforeend", '<svg class="age-relto__paw" viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="10.6" rx="3.6" ry="3" fill="currentColor"/><ellipse cx="3.6" cy="6.6" rx="1.5" ry="1.9" fill="currentColor"/><ellipse cx="6.4" cy="3.8" rx="1.5" ry="1.9" fill="currentColor"/><ellipse cx="9.6" cy="3.8" rx="1.5" ry="1.9" fill="currentColor"/><ellipse cx="12.4" cy="6.6" rx="1.5" ry="1.9" fill="currentColor"/></svg>');
      }
      else r.createSpan({ cls: "age-relto__pname age-relto__libpage", text: nameOf(p), attr: { title: p.library ? p.id + " (relto-library)" : nameOf(p) } }); // une page intégrée n'a pas de bibliothèque : son nom, rien de plus
      const mid = r.createSpan({ cls: "age-relto__fx" }); mid.setText(p.reason || whatOf(p));
      const act = r.createSpan({ cls: "age-relto__pact" }), listed = scene.pagesActive.includes(p.id);
      if (p.state === "available") act.createEl("button", { cls: "age-relto__pbtn", text: t("relto.attach") }).addEventListener("click", async () => { await reltoEdit((l) => M.attachPage(l, p.id)); plugin.refreshLive(); /* un déguisement détache l'autre */ });
      else if (listed) act.createEl("button", { cls: "age-relto__pbtn", text: t("relto.detach") }).addEventListener("click", async () => { await reltoEdit((l) => l.filter((x) => x !== p.id)); plugin.refreshLive(); });
    };
    /* rangées par famille (habits, arbres et plantes, eau, ciel, bêtes, roche et minerais, lieux, instruments, atelier), chacune repliable */
    const famOf = (p) => { const ty = (p.additions && p.additions[0] && p.additions[0].type) || ""; for (const [f, types] of PAGE_FAMILIES) if (types.includes(ty)) return f; return "other"; };
    const famOpen = (ui.reltoFamOpen = ui.reltoFamOpen || {});
    for (const [key, st] of [["active", "active"], ["available", "available"], ["locked", "locked"]]) {
      const list = scene.pages.filter((p) => p.state === st); if (!list.length) continue;
      const box = section(key, t("relto.state." + st), list.length);
      /* repliées par défaut ; un bouton les déplie ou les replie toutes d'un coup */
      const bar = box.createDiv({ cls: "age-relto__fambar" }), all = bar.createEl("button", { cls: "age-relto__pbtn" }), fams = [];
      const label = () => { all.setText(fams.some((x) => x.d.open) ? t("relto.fam.foldall") : t("relto.fam.unfoldall")); };
      all.addEventListener("click", () => { const open = !fams.some((x) => x.d.open); for (const x of fams) { x.d.open = open; famOpen[x.fk] = open; } label(); plugin.saveExt(); });
      colHead(box, [t("relto.col.page"), st === "locked" ? t("relto.col.why") : t("relto.col.adds"), ""]);
      for (const f of [...PAGE_FAMILIES.map((x) => x[0]), "other"]) {
        const fl = list.filter((p) => famOf(p) === f); if (!fl.length) continue;
        const fk = key + ":" + f, d = box.createEl("details", { cls: "age-relto__fam" }); if (famOpen[fk] === true) d.setAttr("open", ""); fams.push({ d, fk });
        const sm = d.createEl("summary", { cls: "age-relto__famhead" }); const fkey = "relto.fam." + f; sm.createSpan({ text: t(fkey) }); sm.createSpan({ cls: "age-relto__secn", text: String(fl.length) });
        d.addEventListener("toggle", () => { famOpen[fk] = d.open; label(); plugin.saveExt(); });
        for (const p of fl) row(d, p);
      }
      label();
    }
    if (scene.missingPages.length) {
      const box = section("missing", t("relto.state.missing"), scene.missingPages.length);
      for (const id of scene.missingPages) {
        const r = box.createDiv({ cls: "age-relto__page is-missing" }); r.createSpan({ cls: "age-relto__pname", text: id }); r.createSpan({ cls: "age-relto__fx" });
        r.createSpan({ cls: "age-relto__pact" }).createEl("button", { cls: "age-relto__pbtn", text: t("relto.detach") }).addEventListener("click", async () => { await reltoEdit((l) => l.filter((x) => x !== id)); plugin.refreshLive(); });
      }
    }
    // les sons : un par son joué par les pages actives (quelles pages le jouent, au survol et en petit), allumé ou non, et son volume
    const bySound = new Map(); for (const p of scene.pages.filter((q) => q.state === "active")) for (const n of p.audio) { if (!bySound.has(n)) bySound.set(n, []); bySound.get(n).push(nameOf(p)); }
    if (soundBtn && bySound.size) {
      const box = section("sounds", t("relto.sounds"), bySound.size);
      colHead(box, ["", t("relto.col.sound"), t("relto.col.playedby"), t("relto.col.volume")]);
      for (const [n, users] of bySound) {
        const c = soundCfg(n), r = box.createDiv({ cls: "age-relto__snd" + (c.on === false ? " is-muted" : "") });
        const mute = r.createEl("button", { cls: "age-relto__pagesound", text: c.on === false ? "🔇" : "♪", attr: { title: t("relto.pagesound") } });
        r.createSpan({ cls: "age-relto__sndname", text: n.replace(/_/g, " ") });
        r.createSpan({ cls: "age-relto__sndusers", text: users.join(", "), attr: { title: users.join(", ") } });
        const vol = r.createEl("input", { type: "range", cls: "age-relto__pagevol", attr: { min: "0", max: "1", step: "0.05", title: t("relto.pagevol") } });
        vol.value = String(c.vol == null ? 1 : c.vol); vol.disabled = c.on === false;
        mute.addEventListener("click", () => { c.on = c.on === false; mute.setText(c.on === false ? "🔇" : "♪"); r.toggleClass("is-muted", c.on === false); vol.disabled = c.on === false; plugin.saveExt(); liveSound(); });
        vol.addEventListener("change", () => { c.vol = Number(vol.value); plugin.saveExt(); liveSound(); });
      }
    }
    if (scene.unknownStructures && scene.unknownStructures.length) body.createDiv({ cls: "age-relto__hint", text: t("relto.unknownstruct", { list: scene.unknownStructures.join(", ") }) });
    body.createEl("button", { cls: "age-relto__newpage", text: t("relto.newpage") }).addEventListener("click", () => createReltoPage(plugin));
  }

  function renderBooks() {
    booksEl.empty();
    const cand = scene.candidates || [], ui = (plugin.ext.state.ui = plugin.ext.state.ui || {});
    let hidden = tabsOn ? false : ui.reltoBooksHidden !== false;
    const head = booksEl.createEl(tabsOn ? "div" : "button", { cls: "age-relto__pageshead" + (tabsOn ? "" : " age-relto__toggle"), text: "" });
    const body = booksEl.createDiv({ cls: "age-relto__pagesbody" + (hidden ? " is-hidden" : "") });
    const label = () => `${tabsOn ? "" : hidden ? "▸ " : "▾ "}${t("relto.books")} · ${scene.shownCount}/${cand.length}`;
    head.setText(label());
    if (!tabsOn) head.addEventListener("click", () => { hidden = !hidden; ui.reltoBooksHidden = hidden; body.toggleClass("is-hidden", hidden); head.setText(label()); plugin.saveExt(); });
    if (scene.booksFromBlock) body.createDiv({ cls: "age-relto__hint", text: t("relto.booksblock") });
    const shown = new Set((scene.ages || []).map((a) => a.path));
    // null : tout afficher (la propriété disparaît) ; [] : aucun livre ; [noms] : ceux-là
    const setList = async (names) => { await app.fileManager.processFrontMatter(file, (fm) => { if (names) fm.relto_books = names; else delete fm.relto_books; }); plugin.refreshLive(); };
    const special = body.createDiv({ cls: "age-relto__booktools" });
    special.createEl("button", { text: t("books.glyphs") }).addEventListener("click", () => B.openGlyphBook(plugin, scene ? scene.ages : []));
    special.createEl("button", { text: t("books.library") }).addEventListener("click", () => B.openLibraryBook(plugin));
    const tools = body.createDiv({ cls: "age-relto__booktools" });
    tools.createEl("button", { text: t("relto.booksall") }).addEventListener("click", () => setList(null));
    tools.createEl("button", { text: t("relto.booksnone") }).addEventListener("click", () => setList([]));
    if (!cand.length) body.createDiv({ cls: "age-relto__hint", text: t("relto.nobooks") });
    // les livres de l'étagère en pastilles, colorées comme la tranche des livres (stable, instable, mourant) ; pleine : sur l'étagère, en
    // creux : rangée ; un clic l'ajoute ou la retire. Tri par nom ou par stabilité (gardé).
    const sortBy = ui.reltoBooksSort === "stability" ? "stability" : "name";
    const sorter = tools.createDiv({ cls: "age-relto__booksort" }); sorter.createSpan({ text: t("relto.sort") });
    for (const [k, key] of [["name", "relto.sort.name"], ["stability", "relto.sort.stability"]]) { const b = sorter.createEl("button", { cls: k === sortBy ? "is-active" : "", text: t(key) }); b.addEventListener("click", () => { ui.reltoBooksSort = k; plugin.saveExt(); renderBooks(); }); }
    const list = [...cand].sort((x, y) => (sortBy === "stability" ? (Number(y.stability) || 0) - (Number(x.stability) || 0) : 0) || String(x.name).localeCompare(String(y.name)));
    const pills = body.createDiv({ cls: "age-relto__pills" });
    for (const a of list) {
      const on = shown.has(a.path), v = ["stable", "unstable", "dying"].includes(a.verdict) ? a.verdict : "unknown";
      const pill = pills.createEl("button", { cls: `age-relto__pill is-${v}` + (on ? " is-on" : ""), attr: { title: `${a.name} — ${a.verdict || "?"} ${a.stability}%` + (on ? "" : " · " + t("relto.pill.off")) } });
      pill.createSpan({ cls: "age-relto__pillname", text: a.name }); pill.createSpan({ cls: "age-relto__pillpct", text: `${a.stability}%` });
      pill.disabled = !!scene.booksFromBlock;
      pill.addEventListener("click", () => {
        const cur = new Set(shown); if (on) cur.delete(a.path); else cur.add(a.path);
        setList(cand.filter((x) => cur.has(x.path)).map((x) => x.name));
      });
    }
  }

  async function refresh() {
    const built = await buildScene(plugin, file, opt); scene = built.scene;
    root.toggleClass("age-quill", plugin.ext.cursorQuill !== false); // le curseur plume (réglage, activé par défaut)
    try { root.style.setProperty("--age-quill", `url("data:image/svg+xml;base64,${btoa(FLW.quillSvg(scene))}") 3 29, auto`); } catch (e) { /* la plume par défaut (styles.ext.css) */ } // la plume prend la teinte de la fleur de cristal
    scene.pagesActive = built.relto.pagesActive;
    plugin._lastPool = poolOfScene(scene); /* les commandes d'essai agissent sur la réserve du dernier Relto ouvert */
    if (plugin.ovenShown && plugin.ovenShown(poolOfScene(scene)) && Array.isArray(scene.structures) && !scene.structures.includes("oven")) scene.structures = [...scene.structures, "oven"]; /* l'appentis de la machine : il apparaît avec la première récolte */
    renderer.setScene(scene); renderer.setHour(scene.skyCycle === "system_time" ? fixed : null); syncNav(scene);
    if (dniClock) dniClock.tick(); // la scène connue : l'heure D'ni sait si l'horloge est là
    { // la première fois que l'horloge est attachée : l'observatoire diffuse le faisceau dans tout le Relto, le calendrier se recale
      const k = TEL.keyOf(scene.name, scene.seed), seen = (plugin.ext.clockSynced = plugin.ext.clockSynced || {});
      if (DC.synced(scene) && !seen[k]) { seen[k] = true; plugin.saveExt(); new obsidian.Notice(t("relto.dni.synced")); }
      else if (!DC.synced(scene) && seen[k]) { delete seen[k]; plugin.saveExt(); } // horloge retirée ou Zéro oublié : le prochain recalage se verra de nouveau
    }
    slider.disabled = scene.skyCycle !== "system_time"; nowBtn.disabled = slider.disabled;
    title.setText(scene.name); if (dniName) { dniName.setText(plugin.dni.textFor(scene.name)); X.latinOnHover(dniName, scene.name); } if (dniName2) { dniName2.setText(plugin.dni.textFor(scene.name)); X.latinOnHover(dniName2, scene.name); } /* le nom de l'Âge se lit en latin au survol (en plein écran, le titre latin n'est pas visible) */
    setMarkup(plate, plugin.dni.numberSvg(scene.seed, { size: 16 })); plate.setAttr("title", t("num.seed"));
    syncClock(); renderPages(); renderBooks();
    if (reduced) renderer.draw(0); else renderer.start();
  }
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      const { layers, names } = reltoLayers();
      plugin.toggleSound(layers, soundBtn, soundFiles(names), scene ? scene.name : "", factor());
    });
    modeSel.addEventListener("change", () => { plugin.ext.reltoMode = modeSel.value; plugin.saveExt(); liveSound(); });
    volIn.addEventListener("input", () => {
      plugin.ext.reltoVolume = Number(volIn.value); plugin.saveExt();
      if (plugin.soundBtn === soundBtn) { plugin.soundFactor = factor(); plugin.sound.setVolume(); } // seulement si c'est le son du refuge qui joue
    });
  }
  const inst = { refresh, el: root, path: file.path, full: () => { if (!ctx.big && plugin.ext.reltoFullscreen !== false && !root.closest(".popover, .hover-popover") && !root.ownerDocument.fullscreenElement && !isTouch() && Date.now() - (plugin._reltoFullAt || 0) > 1500) { plugin._reltoFullAt = Date.now(); toggleFull(); } } }; // sur téléphone, le plein écran ne vient que du bouton // `full` : le plein écran à l'ouverture (voir entry.js, file-open)
  plugin.live.add(inst);
  // le garde-fou du plugin coupe le son si la note change ou si l'onglet se ferme ; un nouveau rendu du bloc
  // (édition, défilement) ne le coupe pas : le nouveau bouton reprend l'état « en lecture »
  if (soundBtn) {
    soundBtn.dataset.key = "relto:" + file.path;
    const cur = plugin.soundBtn;
    if (cur && cur !== soundBtn && !cur.isConnected && cur.dataset && cur.dataset.key === soundBtn.dataset.key && plugin.sound.playing) { plugin.soundBtn = soundBtn; soundBtn.addClass("is-on"); }
  }
  const child = new obsidian.MarkdownRenderChild(el); child.onunload = () => { try { sound.roomStop(); } catch (e) { /* ignore */ } renderer.stop(); plugin.live.delete(inst); }; ctx.addChild(child);
  await refresh();
  { // ouvrir le Relto (sa note, ou la commande) le met en plein écran (réglage, activé par défaut) : une fois par ouverture, jamais dans un aperçu au survol.
    // Le plein écran exige un geste récent (le clic ou la commande qui a ouvert la note) ; trop tard, le navigateur refuse, sans bruit.
    const arm = plugin.reltoFullArm;
    if (arm && arm.path === file.path && Date.now() - arm.at < 4000) { plugin.reltoFullArm = null; inst.full(); }
  }
  const mailTimer = window.setInterval(() => { if (!root.isConnected) return window.clearInterval(mailTimer); mailTick(plugin, file).then((got) => { if (got && !renderer.running) renderer.draw(0); }).catch(() => {}); }, 20000); // le courrier arrive au hasard, pendant qu'on est là
  const clockTimer = window.setInterval(() => { if (!root.isConnected) return window.clearInterval(clockTimer); if (fixed == null) syncClock(); }, 15000);
  child.register(() => window.clearInterval(clockTimer));
  if (dniClock) { const dniTimer = window.setInterval(() => { if (!root.isConnected) return window.clearInterval(dniTimer); dniClock.tick(); }, 1393); child.register(() => window.clearInterval(dniTimer)); } // un prorahn
}

const RELTO_VIEW = "age-writer-relto";
/** Vue dédiée du Relto, comme la vue livre : s'ouvre dans un onglet principal, image grande. */
class ReltoView extends obsidian.ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return RELTO_VIEW; }
  getDisplayText() { return "Relto"; }
  getIcon() { return "mountain"; }
  async onOpen() { await this.render(); }
  async render() {
    const el = this.contentEl; el.empty(); el.addClass("age-reltoview");
    const mine = this.plugin.reltoViewFile && this.plugin.app.vault.getAbstractFileByPath(this.plugin.reltoViewFile), act = this.plugin.app.workspace.getActiveFile && this.plugin.app.workspace.getActiveFile();
    const file = (mine && isHub(this.plugin.app, mine) ? mine : null) || (act && act.extension === "md" && isHub(this.plugin.app, act) ? act : null) || findReltoFile(this.plugin, {}, "");
    if (file) this.plugin.reltoViewFile = file.path; // la grande vue garde le Relto qu'elle a trouvé : un nouveau rendu (changement de pièce, onglet rouvert) ne retombe pas sur le premier Relto du coffre, qui peut avoir une autre étagère
    await renderRelto(this.plugin, "", el.createDiv(), { sourcePath: file ? file.path : "", big: true, addChild: (c) => { if (typeof this.addChild === "function") this.addChild(c); } });
  }
}
async function openReltoView(plugin, file) {
  const ws = plugin.app.workspace, act = ws.getActiveFile && ws.getActiveFile();
  const target = file && file.path ? file : act && act.extension === "md" && isHub(plugin.app, act) ? act : null; // le Relto d'où l'on vient (note de refuge ou bloc)
  plugin.reltoViewFile = target ? target.path : null;
  const ex = ws.getLeavesOfType ? ws.getLeavesOfType(RELTO_VIEW)[0] : null;
  const leaf = ex || ws.getLeaf("tab");
  if (!ex) await leaf.setViewState({ type: RELTO_VIEW, active: true });
  else if (ex.view && typeof ex.view.render === "function") await ex.view.render();
  if (ws.revealLeaf) ws.revealLeaf(leaf);
}

/** Affichage d'un bloc `relto-library` : pages comprises, erreurs ligne par ligne. */
function renderReltoLibrary(plugin, source, el) {
  const res = M.parseReltoLibrary(source), root = el.createDiv({ cls: "age-library age-relto-library" });
  root.createDiv({ cls: "age-library__summary", text: `${res.pages.length} page${res.pages.length === 1 ? "" : "s"}` + (res.problems.length ? ` · ${res.problems.length} problem${res.problems.length === 1 ? "" : "s"}` : "") });
  for (const p of res.pages) root.createDiv({ cls: "age-relto-library__page", text: `${p.label} (${p.id}) — ` + p.effects.canvas_additions.map((a) => a.type + (a.density != null ? " " + a.density : "")).join(", ") + (p.effects.ambiance_audio ? " · ♪ " + [].concat(p.effects.ambiance_audio).join(", ") : "") });
  if (!res.problems.length) { if (res.pages.length) root.createDiv({ cls: "age-library__ok", text: "Every line was understood." }); return; }
  const box = root.createDiv({ cls: "age-library__problems" });
  for (const x of res.problems.slice(0, 30)) { const r = box.createDiv({ cls: "age-library__problem age-library__problem--error" }); r.createSpan({ cls: "age-library__where", text: `line ${x.line}` }); r.createSpan({ cls: "age-library__message", text: x.message }); r.createEl("code", { text: x.text }); }
}

module.exports = { storyPoolOfPath, poolOfScene, isHubFile: isHub, isStoryHub, openHubFile, leafShowing, cleanStarChart, ReltoView, RELTO_VIEW, openReltoView, renderReltoLibrary, libraryPages, renderRelto, openRelto, startStory, storyRepair, storyCheck, storyNext, storyRestart, storyNoDraw, storyNotes, storyWet, storyHeard, storyStruck, storyKnown, resetStoryDraw, storyHint, storyTick, createReltoNote, createReltoPage, buildScene, parseOptions, findReltoFile };
