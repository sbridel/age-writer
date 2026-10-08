"use strict";
const obsidian = require("obsidian");
const M = require("./relto-model");
const { ReltoRenderer } = require("./relto-render");
const sound = require("./sound");
const { setMarkup, esc } = require("./util");
const G = require("./genscene");
const SKY = require("./sky");
const IM = require("./imager");
const X = require("./ui-extras");
const DT = require("./dnitime");
const B = require("./relto-books");

const AUDIO_EXT = ["mp3", "ogg", "wav", "m4a", "flac"];

function parseOptions(src) {
  const o = {};
  for (const l of String(src).split("\n")) { const m = l.match(/^\s*(source|time|height|pages|inscription|folders?|exclude|books?|only|dni_time)\s*:\s*(.+?)\s*$/i); if (m) { let k = m[1].toLowerCase(); if (k === "folder") k = "folders"; else if (k === "book" || k === "only") k = "books"; o[k] = m[2]; } }
  return o;
}

const fmOf = (app, f) => (app.metadataCache.getFileCache(f) || {}).frontmatter || {};
const isHub = (app, f) => fmOf(app, f).age_type === "personal_hub";

function findReltoFile(plugin, opt, sourcePath) {
  const { app } = plugin;
  if (opt.source) return app.metadataCache.getFirstLinkpathDest(M.stripLink(opt.source), sourcePath);
  const here = app.vault.getAbstractFileByPath(sourcePath);
  if (here && here.extension === "md" && isHub(app, here)) return here;
  return app.vault.getMarkdownFiles().find((f) => isHub(app, f)) || null;
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
  const pages = [];
  for (const f of app.vault.getMarkdownFiles()) {
    const fm = fmOf(app, f);
    if (fm.relto_page_id) { const p = M.parsePage(fm, f.path); if (p) pages.push(p); }
  }
  // une page écrite dans une note l'emporte sur la même page de la bibliothèque
  for (const lp of (await libraryPages(plugin)).pages) if (!pages.some((p) => p.id === lp.id)) pages.push(M.libraryPage(lp));
  const ages = (await plugin.index.list()).filter((a) => a.path !== file.path);
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

async function createReltoNote(plugin) {
  const { app, t } = plugin;
  const existing = app.vault.getMarkdownFiles().find((f) => isHub(app, f));
  if (existing) return existing;
  const folder = (plugin.ext.reltoFolder || "Ages").replace(/^\/+|\/+$/g, "");
  await ensureFolder(app, folder);
  const path = (folder ? folder + "/" : "") + "Relto.md";
  const body = `---\n${obsidian.stringifyYaml(M.defaultReltoFrontmatter())}---\n# Relto\n\n\`\`\`relto\n\`\`\`\n`;
  const f = app.vault.getAbstractFileByPath(path) instanceof obsidian.TFile ? app.vault.getAbstractFileByPath(path) : await app.vault.create(path, body);
  new obsidian.Notice(t("relto.created"));
  return f;
}

async function openRelto(plugin) {
  const f = await createReltoNote(plugin);
  await plugin.app.workspace.getLeaf(false).openFile(f);
}

class PresetModal extends obsidian.FuzzySuggestModal {
  constructor(app, onChoose, presets) { super(app); this.onChoose = onChoose; this.presets = presets; this.setPlaceholder("Relto page…"); }
  getItems() { return Object.keys(this.presets); }
  getItemText(id) { return `${this.presets[id].label} (${id})`; }
  onChooseItem(id) { this.onChoose(id); }
}

async function createReltoPage(plugin) {
  const { app, t } = plugin;
  const presets = { ...M.PAGE_PRESETS };
  for (const lp of (await libraryPages(plugin)).pages) presets[lp.id] = { label: lp.label, effects: lp.effects, unlock: lp.unlock };
  new PresetModal(app, async (id) => {
    const hub = await createReltoNote(plugin);
    const folder = ((plugin.ext.reltoFolder || "Ages").replace(/^\/+|\/+$/g, "") + "/Relto pages");
    await ensureFolder(app, folder.split("/")[0]); await ensureFolder(app, folder);
    let n = 0, path;
    do { path = `${folder}/${id}${n ? " " + (n + 1) : ""}.md`; n++; } while (app.vault.getAbstractFileByPath(path));
    const preset = presets[id];
    const f = await app.vault.create(path, `---\n${obsidian.stringifyYaml(M.pageFrontmatter(id, preset))}---\n# ${preset.label}\n\n${t("relto.pagenote")}\n${id === "page_cat" ? "\n" + t("relto.catnote") + "\n" : id === "page_koi" ? "\n" + t("relto.koinote") + "\n" : ""}`);
    await app.fileManager.processFrontMatter(hub, (fm) => { const a = Array.isArray(fm.relto_pages_active) ? fm.relto_pages_active : []; if (!a.includes(id)) a.push(id); fm.relto_pages_active = a; });
    new obsidian.Notice(t("relto.pagecreated", { name: preset.label }));
    plugin.refreshLive();
    app.workspace.getLeaf("tab").openFile(f);
  }, presets).open();
}

const effectSummary = (p) => [...p.additions.map((a) => a.type + (a.asset ? ` (${a.asset})` : "")), ...p.audio.map((a) => "♪ " + a)].join(" · ");

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
  const paneView = root.createDiv({ cls: "age-relto__pane age-relto__pane--view" }), panePages = root.createDiv({ cls: "age-relto__pane age-relto__pane--pages" }), paneSet = root.createDiv({ cls: "age-relto__pane age-relto__pane--settings" });
  const controls = paneSet.createDiv({ cls: "age-relto__controls" }), when = document.createElement("div"); when.className = "age-relto__when";
  const clock = when.createSpan({ cls: "age-relto__clock" });
  // heure D'ni (comme le KI) : année, mois, jour, puis gahrtahvo : tahvo : gorahn : prorahn, en chiffres D'ni ; ligne `dni_time: off` pour la masquer
  let dniClock = null;
  if (plugin.ext.dniClock !== false && !/^(off|no|non|false|0)$/i.test(String(opt.dni_time || ""))) {
    dniClock = when.createSpan({ cls: "age-relto__dnitime" });
    const tickDni = () => {
      const d = DT.fromDate(), n = (v) => plugin.dni.numberSvg(v, { size: tabsOn ? 24 : 13 });
      setMarkup(dniClock, `${n(d.hahr)}<i>${esc(d.name)}</i>${n(d.yahr)}<b>${n(d.gahrtahvo)}${n(d.tahvo)}${n(d.gorahn)}${n(d.prorahn)}</b>`);
      dniClock.setAttr("aria-label", DT.format(d)); // l'infobulle d'Obsidian (aria-label) seule : `title` en ajoutait une seconde, grise
    };
    // la mise à jour reconstruit les chiffres toutes les ~1,4 s, ce qui fermait l'infobulle avant qu'elle n'apparaisse : on suspend tant que la souris est dessus
    let over = false; dniClock.addEventListener("mouseenter", () => { over = true; }); dniClock.addEventListener("mouseleave", () => { over = false; tickDni(); });
    tickDni(); dniClock.tick = () => { if (!over) tickDni(); };
  }
  const lbl = (k) => { if (tabsOn) controls.createDiv({ cls: "age-relto__lbl", text: t(k) }); };
  lbl("relto.lbl.time");
  const slider = controls.createEl("input", { type: "range", attr: { min: "0", max: "24", step: "0.25" } });
  const nowBtn = controls.createEl("button", { text: "↺", attr: { title: t("relto.now") } });
  lbl("relto.lbl.sound");
  const soundBtn = plugin.ext.sound ? controls.createEl("button", { cls: "age-ext__sound", text: "♪" }) : null;
  const mode = () => ["minimal", "zen", "full"].includes(plugin.ext.reltoMode) ? plugin.ext.reltoMode : "zen";
  let modeSel = null, volIn = null;
  if (soundBtn) {
    modeSel = controls.createEl("select", { cls: "age-relto__mode", attr: { title: t("relto.soundmode") } });
    const modeLabel = { minimal: t("relto.mode.minimal"), zen: t("relto.mode.zen"), full: t("relto.mode.full") };
    for (const m of ["minimal", "zen", "full"]) modeSel.createEl("option", { value: m, text: modeLabel[m] });
    modeSel.value = mode();
    lbl("relto.lbl.vol");
    volIn = controls.createEl("input", { type: "range", cls: "age-relto__vol", attr: { min: "0", max: "1", step: "0.05", title: t("relto.volume") } });
    volIn.value = String(plugin.ext.reltoVolume == null ? 0.6 : plugin.ext.reltoVolume);
  }
  const dniName = X.dniText(plugin, head, "", "age-relto__dniname");
  const stage = paneView.createDiv({ cls: "age-relto__stage" });
  const canvas = stage.createEl("canvas", { cls: "age-relto__canvas" });
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
    const defs = [["view", "tab.view", "eye"], ["pages", "tab.pages", "file-text"], ["settings", "tab.settings", "settings"]], btns = {};
    const pick = (k) => { root.setAttr("data-tab", k); try { if (k !== "view") sound.roomStop(); else roomAudio(renderer.view); } catch (e) { /* ignore */ } ui0.reltoTab = k; for (const [id, b] of Object.entries(btns)) b.toggleClass("is-active", id === k); };
    for (const [k, key, ic] of defs) {
      const b = tabBar.createEl("button", { cls: "age-relto__tab" }); btns[k] = b;
      try { obsidian.setIcon(b.createSpan({ cls: "age-relto__tabicon" }), ic); } catch (e) { /* ignore */ }
      b.setAttr("aria-label", t(key)); b.addEventListener("click", () => { pick(k); plugin.saveExt(); if (k === "view") { try { renderer.draw(0); } catch (e) { /* ignore */ } if (root.__fadeArm) root.__fadeArm(); } });
    }
    if (!ctx.big) { const x = tabBar.createEl("button", { cls: "age-relto__tab age-relto__tab--expand" }); try { obsidian.setIcon(x.createSpan({ cls: "age-relto__tabicon" }), "maximize-2"); } catch (e) { /* ignore */ } x.setAttr("aria-label", t("tab.expand")); x.addEventListener("click", () => openReltoView(plugin)); }
    if (ctx.big) {
      const fs = tabBar.createEl("button", { cls: "age-relto__tab age-relto__tab--full" }); try { obsidian.setIcon(fs.createSpan({ cls: "age-relto__tabicon" }), "expand"); } catch (e) { /* ignore */ }
      fs.setAttr("aria-label", t("tab.fullscreen"));
      fs.addEventListener("click", () => { const host = root.closest(".age-reltoview") || root, d = host.ownerDocument; try { if (d.fullscreenElement) d.exitFullscreen(); else host.requestFullscreen(); } catch (e) { /* ignore */ } });
    }
    pick(defs.some((d) => d[0] === ui0.reltoTab) ? ui0.reltoTab : "view");
  } else { root.setAttr("data-tab", "all"); }
  // bascule vue de l'île ⇄ vue globale (petit bouton en coin de l'image) ; l'ouverture reste la vue de l'île
  // navigation entre les vues : île, vue globale et sous-vues (cabane, piliers, bosquet, bassin, chat) ; les boutons des vues sans page correspondante sont masqués
  const NAV = [["global", "globe", "relto.v.global"], ["island", "mountain", "relto.v.island"], ["cabin", "home", "relto.v.cabin"], ["imager", "aperture", "relto.v.imager"], ["pillars", "landmark", "relto.v.pillars"], ["grove", "trees", "relto.v.grove"], ["pond", "fish", "relto.v.pond"], ["pondplus", "droplets", "relto.v.pondplus"], ["cat", "cat", "relto.v.cat"]]; // du plus loin au plus près : globale, île, cabane, Imageur, puis les vues de détail
  const nav = (tabBar || stage).createDiv({ cls: "age-relto__nav" + (tabBar ? " age-relto__nav--bar" : "") }); if (tabBar) tabBar.insertBefore(nav, tabBar.firstChild);
  const navBtns = {};
  for (const [v, ic, key] of NAV) {
    const b = nav.createEl("button", { cls: "age-relto__viewbtn" }); navBtns[v] = b;
    try { obsidian.setIcon(b, ic); } catch (e) { /* ignore */ }
    b.setAttr("aria-label", t(key)); b.addEventListener("click", () => renderer.setView(v));
  }
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
      if (!(roomSoundOn() && (v === "pond" || v === "pondplus" || v === "cat" || (v === "cabin" && fireLit()) || (v === "imager" && plugin.ext.soundImagerHum !== false)) && root.getAttribute("data-tab") !== "settings" && root.getAttribute("data-tab") !== "pages")) { sound.roomStop(); return; }
      const bufs = v === "imager" ? { k: renderer.imagerClarity().atmo, total: renderer.imagerClarity().total, locked: !!(renderer.imager && renderer.imager.settings && renderer.imager.settings.lock) } : v === "cat" ? { main: await roomBuf("roomPurrFile"), meow: await roomBuf("roomMeowFile") } : v === "cabin" ? { main: await roomBuf("roomFireFile"), d: fireLit().density } : { main: await roomBuf("roomWaterFile") };
      if (my !== roomSeq) return; // on a changé de vue pendant le chargement
      sound.roomStart(v === "imager" ? "imager" : v === "cat" ? "cat" : v === "cabin" ? "fire" : "water", roomVol() * (v === "imager" ? humVol() : 1), bufs);
    } catch (e) { /* ignore */ }
  };
  const syncView = (v) => { for (const [id, b] of Object.entries(navBtns)) b.toggleClass("is-active", id === (v || "island")); roomAudio(v); };
  const syncNav = (sc) => { const av = renderer.available(); for (const [id, b] of Object.entries(navBtns)) b.toggleClass("is-hidden", !av[id]); syncView(renderer.view); void sc; };
  syncView("island");
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // l'Imageur : lire la note de l'Âge posé sur le lutrin, l'analyser (physique comprise), en tirer le ciel et la vue
  const imagerAge = async (age) => {
    try {
      const f = app.vault.getAbstractFileByPath(age.path); if (!f) return null;
      const src = plugin.core.extract(await app.vault.cachedRead(f)); if (src == null) return null;
      const name = plugin.core.base(f.path), a = plugin.core.analyse(src, { seed: name });
      const S = G.sceneOf(a, name, plugin.core.blocks); if (S) Object.assign(S, SKY.parseSky(src));
      return { target: IM.targetsOf(a, name), model: S ? G.build(S, 300, 176) : null };
    } catch (e) { console.warn("[Age Writer ext] imageur", e); return null; }
  };
  // les glyphes des cristaux : le dessin du moteur, en image (une fois par page)
  const glyphImgs = new Map();
  const glyphImage = (id) => {
    if (!id) return null; if (glyphImgs.has(id)) return glyphImgs.get(id);
    let img = null;
    try { img = new Image(); img.onload = () => { if (!renderer.running) renderer.draw(0); }; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" style="color:#e0c27a" color="#e0c27a">${plugin.core.glyphSvg(id, 0, 0, 100, "light")}</svg>`); } catch (e) { img = null; }
    glyphImgs.set(id, img); return img;
  };
  const imagerGet = (path) => (plugin.ext.imagerTunings || {})[path] || null;
  const imagerSet = (path, s) => { plugin.ext.imagerTunings = { ...(plugin.ext.imagerTunings || {}), [path]: s }; plugin.saveExt(); };
  const renderer = new ReltoRenderer(canvas, plugin.dni, { hoverFrame: plugin.ext.hoverFrame === true, imagerHum: () => ({ on: plugin.ext.soundImagerHum !== false, vol: humVol() }), onImagerHum: (a) => { if (a.toggle) plugin.ext.soundImagerHum = plugin.ext.soundImagerHum === false; else plugin.ext.imagerHumVol = Math.round(Math.max(0, Math.min(1, humVol() + a.delta * 0.2)) * 10) / 10; if (a.delta && plugin.ext.soundImagerHum === false && plugin.ext.imagerHumVol > 0) plugin.ext.soundImagerHum = true; plugin.saveExt(); roomAudio("imager"); }, notes: plugin.ext.imagerNotes || "words", onImagerAge: imagerAge, imagerGet, imagerSet, glyphImage, onImagerTune: () => { const cl = renderer.imagerClarity(); if (sound.imagerTune) sound.imagerTune(cl.atmo, cl.total, !!(renderer.imager && renderer.imager.settings && renderer.imager.settings.lock)); }, onImagerSound: (k) => { if (roomSoundOn() && sound.imagerSfx) sound.imagerSfx(k, roomVol()); }, reducedMotion: reduced, onView: syncView, onMeow: () => { if (roomSoundOn()) roomBuf("roomMeowFile").then((b) => sound.meow(roomVol() * 1.4, b)); }, onPurr: () => { if (roomSoundOn()) roomBuf("roomPurrFile").then((b) => sound.purr(roomVol(), b)); }, onToy: (k) => { if (!roomSoundOn()) return; if (k === "bell") sound.jingle(roomVol()); else if (k === "mouse") sound.squeak(roomVol()); }, onSpecial: (kind) => { if (kind === "surveyor") B.openSurveyorBook(plugin, scene ? scene.ages : []); else if (kind === "glyphs") B.openGlyphBook(plugin, scene ? scene.ages : []); else B.openLibraryBook(plugin); }, onOpen: (age) => { if (plugin.ext.sound && plugin.ext.soundLink !== false) sound.linkSound(plugin.ext.volume); app.workspace.openLinkText(age.path, "", false); } });
  let scene = null, fixed = opt.time != null && !isNaN(Number(opt.time)) ? Number(opt.time) : null;

  const fmt = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  const syncClock = () => { const h = renderer.hour(); clock.setText(fmt(h)); slider.value = String(h); };
  slider.addEventListener("input", () => { fixed = Number(slider.value); renderer.setHour(fixed); clock.setText(fmt(fixed)); if (reduced) renderer.draw(0); });
  nowBtn.addEventListener("click", () => { fixed = null; renderer.setHour(null); syncClock(); if (reduced) renderer.draw(0); });

  const reltoEdit = (fn) => app.fileManager.processFrontMatter(file, (fm) => { const a = Array.isArray(fm.relto_pages_active) ? fm.relto_pages_active.map((x) => M.stripLink(x)) : []; fm.relto_pages_active = fn(a); });

  const soundCfg = (id) => { const ui = (plugin.ext.state.ui = plugin.ext.state.ui || {}); const all = (ui.reltoSound = ui.reltoSound || {}); return (all[id] = all[id] || {}); };
  /** couches du refuge : une entrée par page active, réglable (muet / volume), puis niveau zen. */
  function reltoLayers() {
    const act = scene ? scene.pages.filter((p) => p.state === "active") : [], names = [];
    let L = {};
    for (const p of act) {
      const c = soundCfg(p.id); if (c.on === false) continue;
      const v = c.vol == null ? 1 : c.vol, pl = sound.layersForNames(p.audio);
      for (const k in pl) L[k] = Math.max(L[k] || 0, pl[k] * v);
      for (const n of p.audio) if (!names.includes(n)) names.push(n);
    }
    if (!act.length) L = { wind: 0.25, drone: 0.15, pad: 0.2 };
    if (mode() !== "full") L = sound.zenify(L, mode());
    return { layers: L, names };
  }
  const soundFiles = (names) => names.filter((n) => !sound.PRESETS[n]).map((n) => app.metadataCache.getFirstLinkpathDest(n, ctx.sourcePath)).filter((f) => f && AUDIO_EXT.includes(f.extension.toLowerCase()));
  const factor = () => (plugin.ext.reltoVolume == null ? 0.6 : plugin.ext.reltoVolume);
  const liveSound = () => { if (soundBtn && plugin.soundBtn === soundBtn && soundBtn.classList.contains("is-on")) plugin.restartSound(reltoLayers().layers, scene ? scene.name : ""); };

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
    for (const p of scene.pages) {
      const row = body.createDiv({ cls: `age-relto__page is-${p.state}` });
      row.createSpan({ cls: "age-relto__chip", text: t("relto.state." + p.state) });
      if (p.path) { const a = row.createEl("a", { cls: "internal-link", text: p.id }); a.addEventListener("click", (e) => { e.preventDefault(); app.workspace.openLinkText(p.path, "", false); }); }
      else row.createSpan({ cls: "age-relto__libpage", text: p.label ? `${p.label} (${p.id})` : p.id, attr: { title: "relto-library" } });
      row.createSpan({ cls: "age-relto__fx", text: effectSummary(p) });
      if (soundBtn && p.state === "active" && p.audio.length) {
        const c = soundCfg(p.id), mute = row.createEl("button", { cls: "age-relto__pagesound" + (c.on === false ? " is-muted" : ""), text: c.on === false ? "🔇" : "♪", attr: { title: t("relto.pagesound") } });
        const vol = row.createEl("input", { type: "range", cls: "age-relto__pagevol", attr: { min: "0", max: "1", step: "0.05", title: t("relto.pagevol") } });
        vol.value = String(c.vol == null ? 1 : c.vol); vol.disabled = c.on === false;
        mute.addEventListener("click", () => { c.on = c.on === false; mute.setText(c.on === false ? "🔇" : "♪"); mute.toggleClass("is-muted", c.on === false); vol.disabled = c.on === false; plugin.saveExt(); liveSound(); });
        vol.addEventListener("change", () => { c.vol = Number(vol.value); plugin.saveExt(); liveSound(); });
      }
      if (p.reason) row.createSpan({ cls: "age-relto__reason", text: p.reason });
      const listed = scene.pagesActive.includes(p.id);
      if (p.state === "available") row.createEl("button", { text: t("relto.attach") }).addEventListener("click", async () => { await reltoEdit((l) => [...l, p.id]); plugin.refreshLive(); });
      else if (listed) row.createEl("button", { text: t("relto.detach") }).addEventListener("click", async () => { await reltoEdit((l) => l.filter((x) => x !== p.id)); plugin.refreshLive(); });
    }
    for (const id of scene.missingPages) {
      const row = body.createDiv({ cls: "age-relto__page is-missing" });
      row.createSpan({ cls: "age-relto__chip", text: t("relto.state.missing") }); row.createSpan({ text: id });
      row.createEl("button", { text: t("relto.detach") }).addEventListener("click", async () => { await reltoEdit((l) => l.filter((x) => x !== id)); plugin.refreshLive(); });
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
    for (const a of cand) {
      const row = body.createEl("label", { cls: "age-relto__book" }), cb = row.createEl("input", { type: "checkbox" });
      cb.checked = shown.has(a.path); cb.disabled = !!scene.booksFromBlock;
      row.createSpan({ text: a.name }); row.createSpan({ cls: "age-relto__reason", text: `${a.verdict} ${a.stability}%` });
      cb.addEventListener("change", () => {
        const cur = new Set(shown); if (cb.checked) cur.add(a.path); else cur.delete(a.path);
        setList(cand.filter((x) => cur.has(x.path)).map((x) => x.name));
      });
    }
  }

  async function refresh() {
    const built = await buildScene(plugin, file, opt); scene = built.scene;
    scene.pagesActive = built.relto.pagesActive;
    renderer.setScene(scene); renderer.setHour(scene.skyCycle === "system_time" ? fixed : null); syncNav(scene);
    slider.disabled = scene.skyCycle !== "system_time"; nowBtn.disabled = slider.disabled;
    title.setText(scene.name); if (dniName) dniName.setText(plugin.dni.textFor(scene.name)); if (dniName2) dniName2.setText(plugin.dni.textFor(scene.name));
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
  const inst = { refresh, el: root };
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
    const file = findReltoFile(this.plugin, {}, "");
    await renderRelto(this.plugin, "", el.createDiv(), { sourcePath: file ? file.path : "", big: true, addChild: (c) => { if (typeof this.addChild === "function") this.addChild(c); } });
  }
}
async function openReltoView(plugin) {
  const ws = plugin.app.workspace;
  const ex = ws.getLeavesOfType ? ws.getLeavesOfType(RELTO_VIEW)[0] : null;
  const leaf = ex || ws.getLeaf("tab");
  if (!ex) await leaf.setViewState({ type: RELTO_VIEW, active: true });
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

module.exports = { ReltoView, RELTO_VIEW, openReltoView, renderReltoLibrary, libraryPages, renderRelto, openRelto, createReltoNote, createReltoPage, buildScene, parseOptions, findReltoFile };
