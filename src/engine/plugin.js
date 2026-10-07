"use strict";
const obsidian = require("obsidian");
const { AgeSettingTab, DEFAULT_SETTINGS } = require("./settings-tab");
const { setDrawSettings } = require("./resolve");
const { PULL_STRENGTH } = require("./draw");
const { BOOK_VIEW_TYPE, BookView } = require("./book-view");
const {
  LIBRARY_TEMPLATE,
  libraryBlocksIn,
  mergeLibraries,
  parseLibrary,
  serializeLibrary,
} = require("./library");
const { builtinLibrary, getLibrary, setLibrary } = require("./registry");
const {
  FRONTMATTER_KEYS,
  analyseAge,
  extractAge,
  frontmatterFor,
  noteName,
  pageList,
} = require("./analysis");
const { buildCanvas } = require("./age-map");
const { WINDOW_H, WINDOW_LOOP_MS, WINDOW_W, paintWindow, windowScene } = require("./scene");
const { renderWindowGif } = require("./gif");
const { setPanelLine } = require("./age-text");
const { describeAge } = require("./prose");
const { glyphSvg } = require("./glyphs");

const GLYPH_SIZE = 64;

const GLYPH_GAP = 12;

const MAP_PATH = "Age Map.canvas";

const BUILTIN_NOTE_INTRO = `# Age library \u2014 the built-in content

Everything the plugin ships with, written out so you can change it. Edit a word here and it
replaces the built-in one; reuse an id to change a block, write a reaction for a pair that
already reacts to replace it. Note that deleting a line does **not** remove the built-in \u2014
built-ins always load; a line here can only replace or add.
`;

const AgeWriterPlugin = class AgeWriterPlugin extends obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.pendingUpdates = new Map();
    this.libraryPaths = new Set();
    this.libraryProblems = [];
    this.currentAgeFile = null;
  }
  async onload() {
    (await this.loadSettings(),
      setDrawSettings({
        draw: this.settings.drawOpenSlots,
        pull: PULL_STRENGTH[this.settings.stabilityPull],
      }),
      this.addSettingTab(new AgeSettingTab(this.app, this)),
      this.registerView(BOOK_VIEW_TYPE, (t) => new BookView(t, this)),
      (this.currentAgeFile = this.app.workspace.getActiveFile()),
      this.addRibbonIcon("book-open", "Open this Age as a book", () => {
        this.openBook();
      }),
      this.addCommand({
        id: "open-age-book",
        name: "Open this Age as a book",
        callback: () => {
          this.openBook();
        },
      }),
      this.registerEvent(
        this.app.workspace.on("file-open", (t) => {
          t && t.extension === "md" && ((this.currentAgeFile = t), this.refreshBooks());
        }),
      ),
      this.registerMarkdownCodeBlockProcessor("age-library", (t, i, r) => {
        this.renderLibraryPanel(t, i, r.sourcePath);
      }),
      this.addCommand({
        id: "create-age-library",
        name: "Create an Age library note",
        callback: () => {
          this.createLibraryNote("Age Library.md", LIBRARY_TEMPLATE);
        },
      }),
      this.addCommand({
        id: "export-builtin-library",
        name: "Copy the built-in content into a library note (to edit it)",
        callback: () => {
          this.createLibraryNote(
            "Age Library - built-in.md",
            BUILTIN_NOTE_INTRO + "\n```age-library\n" + serializeLibrary(builtinLibrary()) + "\n```\n",
          );
        },
      }),
      this.addCommand({
        id: "reload-age-library",
        name: "Reload the Age library",
        callback: () => {
          this.reportLibrary();
        },
      }),
      this.app.workspace.onLayoutReady(() => {
        this.loadLibrary(!0);
      }),
      this.registerEvent(
        this.app.vault.on("modify", (t) => {
          t instanceof obsidian.TFile && t.extension === "md" && this.watchLibrary(t);
        }),
      ),
      this.registerEvent(
        this.app.vault.on("delete", (t) => {
          this.libraryPaths.has(t.path) && this.scheduleLibraryReload();
        }),
      ),
      this.registerEvent(
        this.app.vault.on("rename", (t, i) => {
          this.libraryPaths.has(i) && this.scheduleLibraryReload();
        }),
      ),
      this.registerMarkdownCodeBlockProcessor("age", (t, i, r) => {
        this.renderAgePanel(t, i, r.sourcePath);
      }),
      this.addCommand({
        id: "update-age-data",
        name: "Update Age data in this note",
        checkCallback: (t) => {
          let i = this.app.workspace.getActiveFile();
          return !i || i.extension !== "md" ? !1 : (t || this.updateOne(i), !0);
        },
      }),
      this.addCommand({
        id: "save-age-window-gif",
        name: "Save this Age's window as a GIF",
        checkCallback: (t) => {
          let i = this.app.workspace.getActiveFile();
          return !i || i.extension !== "md" ? !1 : (t || this.saveWindowGif(i), !0);
        },
      }),
      this.addCommand({
        id: "update-age-data-all",
        name: "Update Age data in every note",
        callback: () => {
          this.updateAll();
        },
      }),
      this.addCommand({
        id: "generate-age-map",
        name: "Generate the Age map (canvas)",
        callback: () => {
          this.generateMap();
        },
      }),
      this.registerEvent(
        this.app.vault.on("modify", (t) => {
          t === this.currentAgeFile &&
            (window.clearTimeout(this.bookRefresh),
            (this.bookRefresh = window.setTimeout(() => this.refreshBooks(), 400)));
        }),
      ),
      this.registerEvent(
        this.app.vault.on("modify", (t) => {
          if (!this.settings.autoUpdateFrontmatter || !(t instanceof obsidian.TFile) || t.extension !== "md")
            return;
          let i = this.pendingUpdates.get(t.path);
          (i !== void 0 && window.clearTimeout(i),
            this.pendingUpdates.set(
              t.path,
              window.setTimeout(() => {
                (this.pendingUpdates.delete(t.path), this.updateFrontmatter(t));
              }, 2e3),
            ));
        }),
      ));
  }
  async openBook() {
    let t = this.app.workspace.getActiveFile();
    t && t.extension === "md" && (this.currentAgeFile = t);
    let i = this.app.workspace.getLeavesOfType(BOOK_VIEW_TYPE)[0] ?? this.app.workspace.getRightLeaf(!1);
    i &&
      (await i.setViewState({ type: BOOK_VIEW_TYPE, active: !0 }),
      await this.app.workspace.revealLeaf(i),
      this.refreshBooks());
  }
  async loadLibrary(t = !1) {
    let i = this.settings.libraryFolder.trim().replace(/^\/+|\/+$/g, ""),
      r = this.app.vault
        .getMarkdownFiles()
        .filter((c) => !i || c.path.startsWith(i + "/"))
        .sort((c, g) => c.path.localeCompare(g.path));
    this.libraryPaths.clear();
    let s = [];
    for (let c of r) {
      let g = this.app.metadataCache.getFileCache(c);
      if (g && !(g.sections ?? []).some((u) => u.type === "code")) continue;
      let h = libraryBlocksIn(await this.app.vault.cachedRead(c));
      if (h.length !== 0) {
        this.libraryPaths.add(c.path);
        for (let u of h) s.push({ file: c.path, parsed: parseLibrary(u, c.path) });
      }
    }
    let n = mergeLibraries(s);
    (setLibrary(n.library), (this.libraryProblems = n.problems), this.redrawEverything());
    let a = n.problems.filter((c) => c.level === "error").length;
    return (
      a > 0 &&
        t &&
        new obsidian.Notice(
          `Age library: ${a} line${a === 1 ? "" : "s"} couldn't be read. Open the library note to see why.`,
        ),
      n
    );
  }
  async reportLibrary() {
    let t = await this.loadLibrary(),
      i = t.counts,
      r = t.problems.filter((n) => n.level === "error"),
      s = t.problems.length - r.length;
    new obsidian.Notice(
      `Library: ${i.blocks} block${i.blocks === 1 ? "" : "s"}, ${i.products} product${i.products === 1 ? "" : "s"}, ${i.reactions} reaction${i.reactions === 1 ? "" : "s"}, ${i.variants} variant${i.variants === 1 ? "" : "s"}.` +
        (r.length ? `  ${r.length} error${r.length === 1 ? "" : "s"} \u2014 first: ${r[0].message}` : "") +
        (s ? `  ${s} warning${s === 1 ? "" : "s"}.` : ""),
    );
  }
  scheduleLibraryReload() {
    (window.clearTimeout(this.libraryTimer),
      (this.libraryTimer = window.setTimeout(() => {
        this.loadLibrary();
      }, 600)));
  }
  async watchLibrary(t) {
    let i = this.settings.libraryFolder.trim().replace(/^\/+|\/+$/g, "");
    (i && !t.path.startsWith(i + "/")) ||
      ((this.libraryPaths.has(t.path) || (await this.app.vault.cachedRead(t)).includes("```age-library")) &&
        this.scheduleLibraryReload());
  }
  async createLibraryNote(t, i) {
    let r = this.settings.libraryFolder.trim().replace(/^\/+|\/+$/g, "");
    r && !this.app.vault.getAbstractFileByPath(r) && (await this.app.vault.createFolder(r));
    let s = r ? `${r}/${t}` : t,
      n = this.app.vault.getAbstractFileByPath(s),
      a = n instanceof obsidian.TFile ? n : await this.app.vault.create(s, i);
    (await this.app.workspace.getLeaf(!1).openFile(a),
      new obsidian.Notice(
        n instanceof obsidian.TFile
          ? `\u201C${t}\u201D already exists \u2014 opened it.`
          : `Created \u201C${t}\u201D.`,
      ));
  }
  applyDrawingSettings() {
    (setDrawSettings({ draw: this.settings.drawOpenSlots, pull: PULL_STRENGTH[this.settings.stabilityPull] }),
      this.redrawEverything());
  }
  redrawEverything() {
    (this.app.workspace.iterateAllLeaves((t) => {
      t.view instanceof obsidian.MarkdownView &&
        t.view.getMode() === "preview" &&
        t.view.previewMode.rerender(!0);
    }),
      this.refreshBooks());
  }
  renderLibraryPanel(t, i, r) {
    let s = parseLibrary(t, r),
      n = mergeLibraries([{ file: r, parsed: s }], getLibrary()),
      a = n.counts,
      c = i.createDiv({ cls: "age-library" });
    if (
      (c.createDiv({
        cls: "age-library__summary",
        text: `${a.blocks} block${a.blocks === 1 ? "" : "s"} \xB7 ${a.products} product${a.products === 1 ? "" : "s"} \xB7 ${a.reactions} reaction${a.reactions === 1 ? "" : "s"} \xB7 ${a.variants} variant${a.variants === 1 ? "" : "s"}`,
      }),
      n.problems.length === 0)
    ) {
      c.createDiv({ cls: "age-library__ok", text: "Every line was understood." });
      return;
    }
    let g = c.createDiv({ cls: "age-library__problems" });
    for (let h of n.problems.slice(0, 30)) {
      let u = g.createDiv({ cls: `age-library__problem age-library__problem--${h.level}` });
      (u.createSpan({ cls: "age-library__where", text: `line ${h.line}` }),
        u.createSpan({ cls: "age-library__message", text: h.message }),
        u.createEl("code", { text: h.text }));
    }
    n.problems.length > 30 &&
      g.createDiv({ cls: "age-library__more", text: `\u2026and ${n.problems.length - 30} more.` });
  }
  refreshBooks() {
    for (let t of this.app.workspace.getLeavesOfType(BOOK_VIEW_TYPE))
      t.view instanceof BookView && t.view.render();
  }
  onunload() {
    (window.clearTimeout(this.bookRefresh), window.clearTimeout(this.libraryTimer));
    for (let t of this.pendingUpdates.values()) window.clearTimeout(t);
    this.pendingUpdates.clear();
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async updateFrontmatter(t) {
    let i = extractAge(await this.app.vault.read(t));
    if (i === null) return "no-age";
    let r = frontmatterFor(analyseAge(i, { seed: noteName(t.path) })),
      s = this.app.metadataCache.getFileCache(t)?.frontmatter ?? {};
    return FRONTMATTER_KEYS.every((n) => JSON.stringify(r[n]) === JSON.stringify(s[n]))
      ? "unchanged"
      : (await this.app.fileManager.processFrontMatter(t, (n) => {
          for (let a of FRONTMATTER_KEYS) r[a] === void 0 ? delete n[a] : (n[a] = r[a]);
        }),
        "updated");
  }
  async updateOne(t) {
    let i = await this.updateFrontmatter(t);
    new obsidian.Notice(
      i === "no-age"
        ? "No age block in this note."
        : i === "updated"
          ? "Age data updated."
          : "Age data already up to date.",
    );
  }
  async updateAll() {
    let t = 0,
      i = 0;
    for (let r of this.app.vault.getMarkdownFiles()) {
      let s = await this.updateFrontmatter(r);
      (s !== "no-age" && i++, s === "updated" && t++);
    }
    new obsidian.Notice(`${i} Age${i === 1 ? "" : "s"} found, ${t} updated.`);
  }
  async generateMap() {
    let t = new Map();
    for (let h of this.app.vault.getMarkdownFiles()) {
      let u = extractAge(await this.app.vault.cachedRead(h));
      u !== null && t.set(h.path, analyseAge(u, { seed: noteName(h.path) }));
    }
    if (t.size === 0) {
      new obsidian.Notice("No Age found in this vault yet.");
      return;
    }
    let i = new Map(),
      r = [],
      s = 0;
    for (let [h, u] of t) i.set(h, { path: h, verdict: u.verdict, root: u.stranded });
    for (let [h, u] of t) {
      let l = [...u.links, ...(u.returnTo ? [u.returnTo] : [])];
      for (let d of l) {
        let f = this.app.metadataCache.getFirstLinkpathDest(d, h);
        if (!f) {
          s++;
          continue;
        }
        (i.has(f.path) || i.set(f.path, { path: f.path, root: !0 }), r.push({ from: h, to: f.path }));
      }
    }
    let n = buildCanvas([...i.values()], r),
      a = JSON.stringify(n, null, "	"),
      c = this.app.vault.getAbstractFileByPath(MAP_PATH),
      g = c instanceof obsidian.TFile ? c : await this.app.vault.create(MAP_PATH, a);
    (c instanceof obsidian.TFile && (await this.app.vault.modify(c, a)),
      await this.app.workspace.getLeaf(!1).openFile(g),
      new obsidian.Notice(
        `Map drawn: ${t.size} Age${t.size === 1 ? "" : "s"}, ${n.edges.length} link${n.edges.length === 1 ? "" : "s"}` +
          (s ? ` (${s} pointing at notes that don't exist)` : ""),
      ));
  }
  panelImageSrc(t, i) {
    if (!t) return null;
    let r = this.app.metadataCache.getFirstLinkpathDest(t, i);
    return !(r instanceof obsidian.TFile) || !AgeWriterPlugin.PANEL_EXTENSIONS.includes(r.extension.toLowerCase())
      ? null
      : this.app.vault.getResourcePath(r);
  }
  mountGenerated(t, i, r) {
    let n = t.createDiv({ cls: `age-panel__window age-panel__window--${i.verdict}` }).createEl("canvas");
    ((n.width = WINDOW_W), (n.height = WINDOW_H));
    let a = n.getContext("2d");
    if (!a) return;
    let c = r.replace(/^.*\//, "").replace(/\.md$/, ""),
      g = windowScene(i, c),
      h = i.verdict === "dying" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ((paintWindow(a, g, h ? 0.3 : 0, WINDOW_W, WINDOW_H), h)) return;
    let u = 0,
      l = !1,
      d = 0,
      f = (m) => {
        if (n.isConnected) l = !0;
        else if (l || ++d > 180) return;
        (m - u >= 50 &&
          ((u = m), paintWindow(a, g, (m % WINDOW_LOOP_MS) / WINDOW_LOOP_MS, WINDOW_W, WINDOW_H)),
          requestAnimationFrame(f));
      };
    requestAnimationFrame(f);
  }
  async saveWindowGif(t) {
    let i = extractAge(await this.app.vault.read(t));
    if (i === null) {
      new obsidian.Notice("No age block in this note.");
      return;
    }
    new obsidian.Notice("Drawing the window\u2026");
    let r = windowScene(analyseAge(i, { seed: noteName(t.path) }), t.basename),
      s = await renderWindowGif(r, (l, d) => {
        let f = document.createElement("canvas");
        return ((f.width = l), (f.height = d), f);
      }),
      n = t.parent && t.parent.path !== "/" ? t.parent.path + "/" : "",
      a = `${t.basename} window.gif`,
      c = n + a,
      g = s.buffer.slice(s.byteOffset, s.byteOffset + s.byteLength),
      h = this.app.vault.getAbstractFileByPath(c);
    h instanceof obsidian.TFile
      ? await this.app.vault.modifyBinary(h, g)
      : await this.app.vault.createBinary(c, g);
    let u = !1;
    (await this.app.vault.process(t, (l) => {
      let d = setPanelLine(l, a);
      return d === null ? l : ((u = !0), d);
    }),
      new obsidian.Notice(
        u
          ? `Saved \u201C${a}\u201D and set it as this Age's panel.`
          : `Saved \u201C${a}\u201D. This note already names a panel image, so it was left alone \u2014 use panel: [[${a}]] to switch.`,
      ));
  }
  mountWindow(t, i, r) {
    let s = t.createDiv({ cls: `age-panel__window age-panel__window--${r}` }),
      n = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (r === "dying" || n) {
      let a = s.createEl("canvas"),
        c = new Image();
      ((c.onload = () => {
        ((a.width = c.naturalWidth), (a.height = c.naturalHeight), a.getContext("2d")?.drawImage(c, 0, 0));
      }),
        (c.src = i));
    } else s.createEl("img", { attr: { src: i, alt: "linking panel" } });
  }
  renderAgePanel(t, i, r) {
    let s = analyseAge(t, { seed: noteName(r) }),
      n = s.resolved,
      a = describeAge(n),
      c = i.createDiv({ cls: `age-panel age-panel--${s.verdict}` });
    c.createDiv({ cls: "age-panel__journal" }).setText(a);
    let h = c.createDiv({ cls: "age-panel__visual" }),
      u = pageList(s),
      l = this.panelImageSrc(n.panel ?? this.settings.defaultPanel, r),
      d = Math.max(1, Math.min(4, u.length || 1)),
      f = Math.max(1, Math.ceil(u.length / d)),
      m = d * (GLYPH_SIZE + GLYPH_GAP) + GLYPH_GAP,
      k = !!l || this.settings.generatedWindow,
      w = f * (GLYPH_SIZE + GLYPH_GAP) + GLYPH_GAP + (k ? 0 : 40),
      x = "";
    u.forEach((R, E) => {
      let z = E % d,
        U = Math.floor(E / d),
        ee = GLYPH_GAP + z * (GLYPH_SIZE + GLYPH_GAP),
        et = GLYPH_GAP + U * (GLYPH_SIZE + GLYPH_GAP);
      ((R.born || R.drawn) &&
        (x += `<rect x="${ee - 3}" y="${et - 3}" width="${GLYPH_SIZE + 6}" height="${GLYPH_SIZE + 6}" class="age-panel__born"/>`),
        (x += glyphSvg(R.id, ee, et, GLYPH_SIZE, R.severity)));
    });
    let A =
        s.verdict === "stable"
          ? " age-panel__linkrect--lit"
          : s.verdict === "dying"
            ? " age-panel__linkrect--broken"
            : "",
      $ = m - 60,
      F = w - 32,
      M = k ? "" : `<rect x="${$}" y="${F}" width="40" height="24" rx="1" class="age-panel__linkrect${A}"/>`;
    ((h.innerHTML = `<svg viewBox="0 0 ${m} ${w}" width="100%">` + x + M + "</svg>"),
      l ? this.mountWindow(h, l, s.verdict) : this.settings.generatedWindow && this.mountGenerated(h, s, r));
    let T = c.createDiv({ cls: "age-panel__foot" });
    T.createSpan({
      cls: `age-panel__verdict age-panel__verdict--${s.verdict}`,
      text: `${s.verdict} \xB7 ${s.stability}%`,
    }).setAttr(
      "title",
      Object.entries(s.axisStability).map(([R, E]) => `${R} ${E}%`).join(`
`) || "no measurable instability",
    );
    let y = (R, E) => R.createEl("a", { cls: "internal-link", text: E, attr: { "data-href": E, href: E } }),
      b = T.createSpan({ cls: "age-panel__books" }),
      v =
        s.fissure === "cave"
          ? "in a cavern"
          : s.fissure === "submarine"
            ? "beneath the water"
            : "in the open";
    (s.returnTo
      ? (b.createSpan({ text: "return book \u2192 " }),
        y(b, s.returnTo),
        s.fissure && b.createSpan({ text: `  \xB7  a fissure ${v} leads home too` }))
      : s.fissure
        ? b.createSpan({ text: `no return book \u2014 a fissure ${v} leads home` })
        : b.createSpan({
            cls: "age-panel__trapped",
            text: "no return book, and no fissure \u2014 nothing leads home",
          }),
      s.links.length &&
        (b.createSpan({ text: "  \xB7  leads to " }),
        s.links.forEach((R, E) => {
          (E > 0 && b.createSpan({ text: ", " }), y(b, R));
        })));
    let _ = c.createDiv({ cls: "age-panel__debug" }),
      P = Object.entries(n.costByAxis)
        .filter(([, R]) => R > 0)
        .map(([R, E]) => `${R} ${E.toFixed(2)}`)
        .join(" \xB7 ");
    _.setText(P || "no measurable instability yet");
  }
};

AgeWriterPlugin.PANEL_EXTENSIONS = ["gif", "png", "webp", "apng", "jpg", "jpeg", "svg"];

module.exports = { AgeWriterPlugin, BUILTIN_NOTE_INTRO, GLYPH_GAP, GLYPH_SIZE, MAP_PATH };
