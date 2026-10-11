"use strict";
// Les deux livres à part du Relto : le livre des glyphes (lecture) et le livre de la bibliothèque (ouvre la note où l'on écrit).
const obsidian = require("obsidian");
const { setMarkup, leaveFullscreen } = require("./util");

/**
 * Glyphes utilisés dans les Âges donnés (chacun a `glyphs: [id…]`) — pur, sans Obsidian.
 * « Connu » = écrit dans au moins un Âge ; la boucle de jeu pourra plus tard restreindre à « découvert ».
 * @returns {{id:string, name:string, ages:string[]}[]} du plus partagé au moins partagé, puis par nom
 */
function glyphBook(ages) {
  const by = new Map();
  for (const a of ages || []) for (const id of a.glyphs || []) { if (!by.has(id)) by.set(id, []); by.get(id).push(a); }
  return [...by.entries()]
    .map(([id, list]) => ({ id, name: id.replace(/_/g, " "), ages: list.map((x) => x.name), paths: list.map((x) => x.path) }))
    .sort((p, q) => q.ages.length - p.ages.length || p.name.localeCompare(q.name));
}

const RELTO_LIBRARY_TEMPLATE = `# Relto library

Pages written here are added to the Relto's pages (Pages tab), no rebuild. One page per line
in the block below; lines starting with # are comments.

- \`page id: Label | effect density [asset], effect … | audio=preset,preset | unlock=Age:60\`
- effects: vegetation (asset: pine, birch, palm, fern, cactus…), waterfall, fireflies, lanterns, snow, aurora,
  fireworks, mountain, pillars, chimney, mist, gems, gold, silver. Density is 0 to 1.
- \`unlock=[[Some Age]]:60\` makes the page available once that Age reaches 60 % stability.

\`\`\`relto-library
# page lagon: Lagoon | vegetation 0.5 palm, gold 0.6 | audio=river | unlock=[[Some Age]]:60
\`\`\`
`;

const LIB_BLOCK = { ages: "```age-library", relto: "```relto-library" };

/** Ouvre la note de bibliothèque (la crée avec un exemple si elle n'existe pas). kind : "ages" | "relto". */
async function openLibraryNote(plugin, kind) {
  const { app } = plugin, t = plugin.t;
  let file = null;
  if (kind === "ages" && plugin.libraryPaths && plugin.libraryPaths.size) {
    const first = [...plugin.libraryPaths].sort()[0], f = app.vault.getAbstractFileByPath(first);
    if (f) file = f;
  }
  if (!file && kind === "relto") {
    for (const f of app.vault.getMarkdownFiles()) {
      const c = app.metadataCache.getFileCache(f);
      if (c && !(c.sections || []).some((s) => s.type === "code")) continue;
      let text = ""; try { text = await app.vault.cachedRead(f); } catch (e) { continue; }
      if (text.includes(LIB_BLOCK.relto)) { file = f; break; }
    }
  }
  leaveFullscreen();
  if (file) { await app.workspace.getLeaf(false).openFile(file); return file; }
  const name = kind === "ages" ? "Age Library.md" : "Relto Library.md", body = kind === "ages" ? plugin.core.libraryTemplate : RELTO_LIBRARY_TEMPLATE;
  const folder = String((plugin.settings && plugin.settings.libraryFolder) || "").trim().replace(/^\/+|\/+$/g, "");
  if (folder && !app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
  const path = folder ? `${folder}/${name}` : name, ex = app.vault.getAbstractFileByPath(path);
  const f = ex instanceof obsidian.TFile ? ex : await app.vault.create(path, body);
  new obsidian.Notice(t("books.created", { name: path }));
  await app.workspace.getLeaf(false).openFile(f);
  return f;
}

class LibraryChoice extends obsidian.FuzzySuggestModal {
  constructor(plugin) { super(plugin.app); this.plugin = plugin; this.setPlaceholder(plugin.t("books.library")); }
  getItems() { return ["ages", "relto"]; }
  getItemText(k) { return this.plugin.t(k === "ages" ? "books.lib.ages" : "books.lib.relto"); }
  onChooseItem(k) { openLibraryNote(this.plugin, k); }
}

function openLibraryBook(plugin) { new LibraryChoice(plugin).open(); }

/**
 * Les glyphes pas encore appris, tels que la palette de l'histoire les devine : quelques silhouettes pâles par groupe (toujours les mêmes), le reste en « +N ».
 * Vide hors de l'histoire (la palette y montre tout) ; `used` : les glyphes déjà écrits quelque part.
 * @returns {{id:string, axis:string, hint:string}[]} et le nombre de glyphes restés dans l'ombre
 */
function ghostGlyphs(ages, used) {
  const BV = require("./engine/book-view"), H = require("./engine/hooks").hooks, path = (ages || []).map((a) => a.path).find((p) => H.known(p));
  if (!path) return { list: [], more: 0 };
  const known = H.known(path), per = H.ghosts(path), list = []; let more = 0;
  for (const g of BV.paletteGroups()) {
    const hidden = g.items.filter((it) => !known.has(it.id) && !used.has(it.id)).sort((x, y) => BV.hashOf(x.id) - BV.hashOf(y.id)), n = Math.min(per, hidden.length);
    for (const it of hidden.slice(0, n)) list.push({ id: it.id, axis: g.axis, hint: H.ghostTip() + BV.ghostHint(it.id) });
    more += hidden.length - n;
  }
  return { list, more };
}

/** Fenêtre du livre des glyphes : un glyphe par carte, avec les Âges où il apparaît ; en histoire, les glyphes pas encore appris se devinent en pâle à la fin. */
function openGlyphBook(plugin, ages) {
  const t = plugin.t, list = glyphBook(ages), gh = ghostGlyphs(ages, new Set(list.map((g) => g.id)));
  class GlyphBook extends obsidian.Modal {
    onOpen() {
      const { contentEl, modalEl } = this; contentEl.empty(); modalEl.addClass("age-glyphbook-modal");
      contentEl.createEl("h2", { text: t("books.glyphs"), cls: "age-glyphbook__title" });
      if (!list.length) contentEl.createDiv({ cls: "age-relto__hint", text: t("books.noglyphs") });
      else {
        contentEl.createDiv({ cls: "age-relto__hint", text: t("books.glyphcount", { n: list.length, m: (ages || []).length }) });
        const grid = contentEl.createDiv({ cls: "age-glyphbook" });
        for (const g of list) {
          const card = grid.createDiv({ cls: "age-glyphbook__card" });
          const art = card.createDiv({ cls: "age-glyphbook__art" });
          try { setMarkup(art, `<svg viewBox="0 0 100 100" aria-hidden="true">${plugin.core.glyphSvg(g.id, 0, 0, 100, "light")}</svg>`); } catch (e) { /* glyphe sans dessin */ }
          card.createDiv({ cls: "age-glyphbook__name", text: g.name });
          const where = card.createDiv({ cls: "age-glyphbook__where" });
          g.ages.forEach((name, i) => {
            const a = where.createEl("a", { cls: "internal-link", text: name });
            a.addEventListener("click", (e) => { e.preventDefault(); this.close(); leaveFullscreen(); plugin.app.workspace.openLinkText(g.paths[i], "", false); });
          });
        }
      }
      if (gh.list.length) { // pas encore appris : des silhouettes pâles, sans nom, avec de quoi les deviner au survol
        contentEl.createDiv({ cls: "age-relto__hint age-glyphbook__ghosts-title", text: t("books.glyphs.unknown") });
        const grid = contentEl.createDiv({ cls: "age-glyphbook" });
        for (const g of gh.list) {
          const card = grid.createDiv({ cls: "age-glyphbook__card is-ghost", attr: { title: g.hint, "aria-label": g.hint } });
          const art = card.createDiv({ cls: "age-glyphbook__art" });
          try { setMarkup(art, `<svg viewBox="0 0 100 100" aria-hidden="true">${plugin.core.glyphSvg(g.id, 0, 0, 100, "light")}</svg>`); } catch (e) { /* glyphe sans dessin */ }
        }
        if (gh.more > 0) contentEl.createDiv({ cls: "age-relto__hint", text: t("books.glyphs.more", { n: gh.more }) });
      }
    }
    onClose() { this.contentEl.empty(); }
  }
  new GlyphBook(plugin.app).open();
}

/** Le carnet de l'arpenteur (Relto, sur la table) : pour chaque Âge du refuge, ce que chante son ciel, avec ou sans les trois valeurs selon le réglage. */
function openSurveyorBook(plugin, ages) {
  const t = plugin.t, IM = require("./imager"), lang = plugin.lang(), full = plugin.ext.imagerNotes === "full", list = (ages || []).slice(0, 30);
  class SurveyorBook extends obsidian.Modal {
    async onOpen() {
      const { contentEl, modalEl, app } = this; contentEl.empty(); modalEl.addClass("age-glyphbook-modal");
      contentEl.createEl("h2", { text: t("books.surveyor"), cls: "age-glyphbook__title" });
      contentEl.createDiv({ cls: "age-relto__hint", text: t(full ? "books.surveyor.hintfull" : "books.surveyor.hint") });
      if (!list.length) { contentEl.createDiv({ cls: "age-relto__hint", text: t("books.surveyor.none") }); return; }
      const box = contentEl.createDiv({ cls: "age-surveyor" });
      for (const a of list) {
        try {
          const f = app.vault.getAbstractFileByPath(a.path); if (!f) continue;
          const src = plugin.core.extract(await app.vault.cachedRead(f)); if (src == null) continue;
          const name = plugin.core.seed(f.path), tg = IM.targetsOf(plugin.core.analyse(src, { seed: name }), name), hn = IM.hints(tg, lang);
          const card = box.createDiv({ cls: "age-surveyor__card" });
          const link = card.createEl("a", { cls: "internal-link age-surveyor__name", text: a.name || name });
          link.addEventListener("click", (e) => { e.preventDefault(); this.close(); leaveFullscreen(); app.workspace.openLinkText(a.path, "", false); });
          card.createDiv({ cls: "age-det__skyline", text: hn.line });
          if (hn.lightLine) card.createDiv({ cls: "age-det__skyline", text: hn.lightLine });
          if (full) {
            const nums = card.createDiv({ cls: "age-det__skynums" });
            for (const [label, v] of [[t("det.sky.freq"), tg.freq], [t("det.sky.amp"), tg.amp], [t("det.sky.harm"), tg.harm]]) { const c = nums.createSpan({ cls: "age-det__skynum" }); c.createSpan({ cls: "age-det__skylabel", text: label }); setMarkup(c.createSpan(), plugin.dni.numberSvg(v, { size: 16 })); }
            nums.createSpan({ cls: "age-det__skynum", text: tg.pol > 0 ? "+" : "−" });
          }
          { // télescope, étape 2 : le Great Zero vu de cet Âge (mêmes mots que l'onglet Détails)
            const SS = require("./starsystem"), a = plugin.core.analyse(src, { seed: name }), sy = SS.systemOf(a, src, name), fld = a && a.physics && a.physics.w ? a.physics.w.field : null;
            const guild = require("./instruments").isGuild(plugin.ext), w = SS.words(SS.surveyed(sy, guild), lang, { fx: sy.fx, compass: SS.compassOf(fld), easy: !guild }); // étape 3 : ce que l'arpenteur perçoit (Guilde : perturbateurs compris)
            card.createDiv({ cls: "age-det__skyline", text: w.line });
            if (w.pert) card.createDiv({ cls: "age-det__skyline", text: w.pert });
            if (full) { const nums = card.createDiv({ cls: "age-det__skynums" }); for (const [i, [label, v]] of [[t("sys.val.torahn"), w.values.torahn], [t("sys.val.elev"), w.values.elev], [t("sys.val.delay"), w.values.delay]].entries()) { const c = nums.createSpan({ cls: "age-det__skynum" }); c.createSpan({ cls: "age-det__skylabel", text: label }); if (i === 2) { setMarkup(c.createSpan(), plugin.dni.fractionSvg(require("./beam").delayDigits(v, SS.DELAY_UNIT), { size: 16 })); continue; } if (v < 0) c.createSpan({ text: "−" }); setMarkup(c.createSpan(), plugin.dni.numberSvg(Math.abs(v), { size: 16 })); } } // le retard en rahnfee, comme sous la molette
          }
        } catch (e) { console.warn("[Age Writer ext] carnet", e); }
      }
    }
    onClose() { this.contentEl.empty(); }
  }
  new SurveyorBook(plugin.app).open();
}

module.exports = { openSurveyorBook, glyphBook, openGlyphBook, openLibraryBook, openLibraryNote, RELTO_LIBRARY_TEMPLATE };
