"use strict";
const { setMarkup } = require("../util");
const obsidian = require("obsidian");
const { AgeSettingTab, DEFAULT_SETTINGS } = require("./settings-tab");
const { setDrawSettings } = require("./resolve");
const { PULL_STRENGTH, DRAW_AMOUNT } = require("./draw");
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
        amount: DRAW_AMOUNT[this.settings.drawAmount] ?? 1,
      }),
      this.addSettingTab(new AgeSettingTab(this.app, this)),
      this.registerView(BOOK_VIEW_TYPE, (leaf) => new BookView(leaf, this)),
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
        this.app.workspace.on("file-open", (file) => {
          file && file.extension === "md" && ((this.currentAgeFile = file), this.refreshBooks());
        }),
      ),
      this.registerMarkdownCodeBlockProcessor("age-library", (source, container, context) => {
        this.renderLibraryPanel(source, container, context.sourcePath);
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
        this.app.vault.on("modify", (file) => {
          file instanceof obsidian.TFile && file.extension === "md" && this.watchLibrary(file);
        }),
      ),
      this.registerEvent(
        this.app.vault.on("delete", (file) => {
          this.libraryPaths.has(file.path) && this.scheduleLibraryReload();
        }),
      ),
      this.registerEvent(
        this.app.vault.on("rename", (file, oldPath) => {
          this.libraryPaths.has(oldPath) && this.scheduleLibraryReload();
        }),
      ),
      this.registerMarkdownCodeBlockProcessor("age", (source, container, context) => {
        this.renderAgePanel(source, container, context.sourcePath);
      }),
      this.addCommand({
        id: "update-age-data",
        name: "Update Age data in this note",
        checkCallback: (checking) => {
          let file = this.app.workspace.getActiveFile();
          return !file || file.extension !== "md" ? !1 : (checking || this.updateOne(file), !0);
        },
      }),
      this.addCommand({
        id: "save-age-window-gif",
        name: "Save this Age's window as a GIF",
        checkCallback: (checking) => {
          let file = this.app.workspace.getActiveFile();
          return !file || file.extension !== "md" ? !1 : (checking || this.saveWindowGif(file), !0);
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
        this.app.vault.on("modify", (file) => {
          file === this.currentAgeFile &&
            (window.clearTimeout(this.bookRefresh),
            (this.bookRefresh = window.setTimeout(() => this.refreshBooks(), 400)));
        }),
      ),
      this.registerEvent(
        this.app.vault.on("modify", (file) => {
          if (
            !this.settings.autoUpdateFrontmatter ||
            !(file instanceof obsidian.TFile) ||
            file.extension !== "md"
          )
            return;
          let pending = this.pendingUpdates.get(file.path);
          (pending !== void 0 && window.clearTimeout(pending),
            this.pendingUpdates.set(
              file.path,
              window.setTimeout(() => {
                (this.pendingUpdates.delete(file.path), this.updateFrontmatter(file));
              }, 2e3),
            ));
        }),
      ));
  }
  async openBook() {
    let file = this.app.workspace.getActiveFile();
    file && file.extension === "md" && (this.currentAgeFile = file);
    let leaf = this.app.workspace.getLeavesOfType(BOOK_VIEW_TYPE)[0] ?? this.app.workspace.getRightLeaf(!1);
    leaf &&
      (await leaf.setViewState({ type: BOOK_VIEW_TYPE, active: !0 }),
      await this.app.workspace.revealLeaf(leaf),
      this.refreshBooks());
  }
  async loadLibrary(notify = !1) {
    let folder = this.settings.libraryFolder.trim().replace(/^\/+|\/+$/g, ""),
      files = this.app.vault
        .getMarkdownFiles()
        .filter((file) => !folder || file.path.startsWith(folder + "/"))
        .sort((fileA, fileB) => fileA.path.localeCompare(fileB.path));
    this.libraryPaths.clear();
    let entries = [];
    for (let file of files) {
      let cache = this.app.metadataCache.getFileCache(file);
      if (cache && !(cache.sections ?? []).some((section) => section.type === "code")) continue;
      let blocks = libraryBlocksIn(await this.app.vault.cachedRead(file));
      if (blocks.length !== 0) {
        this.libraryPaths.add(file.path);
        for (let source of blocks) entries.push({ file: file.path, parsed: parseLibrary(source, file.path) });
      }
    }
    let merged = mergeLibraries(entries);
    (setLibrary(merged.library), (this.libraryProblems = merged.problems), this.redrawEverything());
    let errorCount = merged.problems.filter((problem) => problem.level === "error").length;
    return (
      errorCount > 0 &&
        notify &&
        new obsidian.Notice(
          `Age library: ${errorCount} line${errorCount === 1 ? "" : "s"} couldn't be read. Open the library note to see why.`,
        ),
      merged
    );
  }
  async reportLibrary() {
    let result = await this.loadLibrary(),
      counts = result.counts,
      errors = result.problems.filter((problem) => problem.level === "error"),
      warningCount = result.problems.length - errors.length;
    new obsidian.Notice(
      `Library: ${counts.blocks} block${counts.blocks === 1 ? "" : "s"}, ${counts.products} product${counts.products === 1 ? "" : "s"}, ${counts.reactions} reaction${counts.reactions === 1 ? "" : "s"}, ${counts.variants} variant${counts.variants === 1 ? "" : "s"}.` +
        (errors.length
          ? `  ${errors.length} error${errors.length === 1 ? "" : "s"} \u2014 first: ${errors[0].message}`
          : "") +
        (warningCount ? `  ${warningCount} warning${warningCount === 1 ? "" : "s"}.` : ""),
    );
  }
  scheduleLibraryReload() {
    (window.clearTimeout(this.libraryTimer),
      (this.libraryTimer = window.setTimeout(() => {
        this.loadLibrary();
      }, 600)));
  }
  async watchLibrary(file) {
    let folder = this.settings.libraryFolder.trim().replace(/^\/+|\/+$/g, "");
    (folder && !file.path.startsWith(folder + "/")) ||
      ((this.libraryPaths.has(file.path) ||
        (await this.app.vault.cachedRead(file)).includes("```age-library")) &&
        this.scheduleLibraryReload());
  }
  async createLibraryNote(name, content) {
    let folder = this.settings.libraryFolder.trim().replace(/^\/+|\/+$/g, "");
    folder && !this.app.vault.getAbstractFileByPath(folder) && (await this.app.vault.createFolder(folder));
    let path = folder ? `${folder}/${name}` : name,
      existing = this.app.vault.getAbstractFileByPath(path),
      file = existing instanceof obsidian.TFile ? existing : await this.app.vault.create(path, content);
    (await this.app.workspace.getLeaf(!1).openFile(file),
      new obsidian.Notice(
        existing instanceof obsidian.TFile
          ? `\u201C${name}\u201D already exists \u2014 opened it.`
          : `Created \u201C${name}\u201D.`,
      ));
  }
  applyDrawingSettings() {
    (setDrawSettings({
      draw: this.settings.drawOpenSlots,
      pull: PULL_STRENGTH[this.settings.stabilityPull],
      amount: DRAW_AMOUNT[this.settings.drawAmount] ?? 1,
    }),
      this.redrawEverything());
  }
  redrawEverything() {
    (this.app.workspace.iterateAllLeaves((leaf) => {
      leaf.view instanceof obsidian.MarkdownView &&
        leaf.view.getMode() === "preview" &&
        leaf.view.previewMode.rerender(!0);
    }),
      this.refreshBooks());
  }
  renderLibraryPanel(source, container, sourcePath) {
    let parsed = parseLibrary(source, sourcePath),
      merged = mergeLibraries([{ file: sourcePath, parsed: parsed }], getLibrary()),
      counts = merged.counts,
      panel = container.createDiv({ cls: "age-library" });
    if (
      (panel.createDiv({
        cls: "age-library__summary",
        text: `${counts.blocks} block${counts.blocks === 1 ? "" : "s"} \xB7 ${counts.products} product${counts.products === 1 ? "" : "s"} \xB7 ${counts.reactions} reaction${counts.reactions === 1 ? "" : "s"} \xB7 ${counts.variants} variant${counts.variants === 1 ? "" : "s"}`,
      }),
      merged.problems.length === 0)
    ) {
      panel.createDiv({ cls: "age-library__ok", text: "Every line was understood." });
      return;
    }
    let problemsEl = panel.createDiv({ cls: "age-library__problems" });
    for (let problem of merged.problems.slice(0, 30)) {
      let row = problemsEl.createDiv({ cls: `age-library__problem age-library__problem--${problem.level}` });
      (row.createSpan({ cls: "age-library__where", text: `line ${problem.line}` }),
        row.createSpan({ cls: "age-library__message", text: problem.message }),
        row.createEl("code", { text: problem.text }));
    }
    merged.problems.length > 30 &&
      problemsEl.createDiv({
        cls: "age-library__more",
        text: `\u2026and ${merged.problems.length - 30} more.`,
      });
  }
  refreshBooks() {
    for (let leaf of this.app.workspace.getLeavesOfType(BOOK_VIEW_TYPE))
      leaf.view instanceof BookView && leaf.view.render();
  }
  onunload() {
    (window.clearTimeout(this.bookRefresh), window.clearTimeout(this.libraryTimer));
    for (let timer of this.pendingUpdates.values()) window.clearTimeout(timer);
    this.pendingUpdates.clear();
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async updateFrontmatter(file) {
    let ageSource = extractAge(await this.app.vault.read(file));
    if (ageSource === null) return "no-age";
    let fields = frontmatterFor(analyseAge(ageSource, { seed: noteName(file.path) })),
      existing = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    return FRONTMATTER_KEYS.every((key) => JSON.stringify(fields[key]) === JSON.stringify(existing[key]))
      ? "unchanged"
      : (await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          for (let key of FRONTMATTER_KEYS)
            fields[key] === void 0 ? delete frontmatter[key] : (frontmatter[key] = fields[key]);
        }),
        "updated");
  }
  async updateOne(file) {
    let result = await this.updateFrontmatter(file);
    new obsidian.Notice(
      result === "no-age"
        ? "No age block in this note."
        : result === "updated"
          ? "Age data updated."
          : "Age data already up to date.",
    );
  }
  async updateAll() {
    let updatedCount = 0,
      ageCount = 0;
    for (let file of this.app.vault.getMarkdownFiles()) {
      let result = await this.updateFrontmatter(file);
      (result !== "no-age" && ageCount++, result === "updated" && updatedCount++);
    }
    new obsidian.Notice(`${ageCount} Age${ageCount === 1 ? "" : "s"} found, ${updatedCount} updated.`);
  }
  async generateMap() {
    let ages = new Map();
    for (let file of this.app.vault.getMarkdownFiles()) {
      let ageSource = extractAge(await this.app.vault.cachedRead(file));
      ageSource !== null && ages.set(file.path, analyseAge(ageSource, { seed: noteName(file.path) }));
    }
    if (ages.size === 0) {
      new obsidian.Notice("No Age found in this vault yet.");
      return;
    }
    let nodes = new Map(),
      edges = [],
      missingCount = 0;
    for (let [path, analysis] of ages)
      nodes.set(path, { path: path, verdict: analysis.verdict, root: analysis.stranded });
    for (let [path, analysis] of ages) {
      let targets = [...analysis.links, ...(analysis.returnTo ? [analysis.returnTo] : [])];
      for (let name of targets) {
        let dest = this.app.metadataCache.getFirstLinkpathDest(name, path);
        if (!dest) {
          missingCount++;
          continue;
        }
        (nodes.has(dest.path) || nodes.set(dest.path, { path: dest.path, root: !0 }),
          edges.push({ from: path, to: dest.path }));
      }
    }
    let canvas = buildCanvas([...nodes.values()], edges),
      json = JSON.stringify(canvas, null, "	"),
      existing = this.app.vault.getAbstractFileByPath(MAP_PATH),
      target = existing instanceof obsidian.TFile ? existing : await this.app.vault.create(MAP_PATH, json);
    (existing instanceof obsidian.TFile && (await this.app.vault.modify(existing, json)),
      await this.app.workspace.getLeaf(!1).openFile(target),
      new obsidian.Notice(
        `Map drawn: ${ages.size} Age${ages.size === 1 ? "" : "s"}, ${canvas.edges.length} link${canvas.edges.length === 1 ? "" : "s"}` +
          (missingCount ? ` (${missingCount} pointing at notes that don't exist)` : ""),
      ));
  }
  panelImageSrc(name, sourcePath) {
    if (!name) return null;
    let dest = this.app.metadataCache.getFirstLinkpathDest(name, sourcePath);
    return !(dest instanceof obsidian.TFile) ||
      !AgeWriterPlugin.PANEL_EXTENSIONS.includes(dest.extension.toLowerCase())
      ? null
      : this.app.vault.getResourcePath(dest);
  }
  mountGenerated(container, analysis, path) {
    let canvas = container
      .createDiv({ cls: `age-panel__window age-panel__window--${analysis.verdict}` })
      .createEl("canvas");
    ((canvas.width = WINDOW_W), (canvas.height = WINDOW_H));
    let ctx = canvas.getContext("2d");
    if (!ctx) return;
    let name = path.replace(/^.*\//, "").replace(/\.md$/, ""),
      scene = windowScene(analysis, name),
      still = analysis.verdict === "dying" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ((paintWindow(ctx, scene, still ? 0.3 : 0, WINDOW_W, WINDOW_H), still)) return;
    let lastPaint = 0,
      started = !1,
      frames = 0,
      frame = (time) => {
        if (canvas.isConnected) started = !0;
        else if (started || ++frames > 180) return;
        (time - lastPaint >= 50 &&
          ((lastPaint = time),
          paintWindow(ctx, scene, (time % WINDOW_LOOP_MS) / WINDOW_LOOP_MS, WINDOW_W, WINDOW_H)),
          requestAnimationFrame(frame));
      };
    requestAnimationFrame(frame);
  }
  async saveWindowGif(file) {
    let ageSource = extractAge(await this.app.vault.read(file));
    if (ageSource === null) {
      new obsidian.Notice("No age block in this note.");
      return;
    }
    new obsidian.Notice("Drawing the window\u2026");
    let scene = windowScene(analyseAge(ageSource, { seed: noteName(file.path) }), file.basename),
      gif = await renderWindowGif(scene, (width, height) => {
        let canvas = document.createElement("canvas");
        return ((canvas.width = width), (canvas.height = height), canvas);
      }),
      folder = file.parent && file.parent.path !== "/" ? file.parent.path + "/" : "",
      name = `${file.basename} window.gif`,
      path = folder + name,
      bytes = gif.buffer.slice(gif.byteOffset, gif.byteOffset + gif.byteLength),
      existing = this.app.vault.getAbstractFileByPath(path);
    existing instanceof obsidian.TFile
      ? await this.app.vault.modifyBinary(existing, bytes)
      : await this.app.vault.createBinary(path, bytes);
    let linked = !1;
    (await this.app.vault.process(file, (text) => {
      let updated = setPanelLine(text, name);
      return updated === null ? text : ((linked = !0), updated);
    }),
      new obsidian.Notice(
        linked
          ? `Saved \u201C${name}\u201D and set it as this Age's panel.`
          : `Saved \u201C${name}\u201D. This note already names a panel image, so it was left alone \u2014 use panel: [[${name}]] to switch.`,
      ));
  }
  mountWindow(container, src, verdict) {
    let windowEl = container.createDiv({ cls: `age-panel__window age-panel__window--${verdict}` }),
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (verdict === "dying" || reduced) {
      let canvas = windowEl.createEl("canvas"),
        image = new Image();
      ((image.onload = () => {
        ((canvas.width = image.naturalWidth),
          (canvas.height = image.naturalHeight),
          canvas.getContext("2d")?.drawImage(image, 0, 0));
      }),
        (image.src = src));
    } else windowEl.createEl("img", { attr: { src: src, alt: "linking panel" } });
  }
  renderAgePanel(ageSource, container, sourcePath) {
    let analysis = analyseAge(ageSource, { seed: noteName(sourcePath) }),
      resolved = analysis.resolved,
      journal = describeAge(resolved, { seed: noteName(sourcePath) }),
      panel = container.createDiv({ cls: `age-panel age-panel--${analysis.verdict}` });
    panel.createDiv({ cls: "age-panel__journal" }).setText(journal);
    let visual = panel.createDiv({ cls: "age-panel__visual" }),
      pages = pageList(analysis),
      imageSrc = this.panelImageSrc(resolved.panel ?? this.settings.defaultPanel, sourcePath),
      columns = Math.max(1, Math.min(4, pages.length || 1)),
      rows = Math.max(1, Math.ceil(pages.length / columns)),
      width = columns * (GLYPH_SIZE + GLYPH_GAP) + GLYPH_GAP,
      hasWindow = !!imageSrc || this.settings.generatedWindow,
      height = rows * (GLYPH_SIZE + GLYPH_GAP) + GLYPH_GAP + (hasWindow ? 0 : 40),
      glyphs = "";
    pages.forEach((page, index) => {
      let column = index % columns,
        row = Math.floor(index / columns),
        glyphX = GLYPH_GAP + column * (GLYPH_SIZE + GLYPH_GAP),
        glyphY = GLYPH_GAP + row * (GLYPH_SIZE + GLYPH_GAP);
      ((page.born || page.drawn) &&
        (glyphs += `<rect x="${glyphX - 3}" y="${glyphY - 3}" width="${GLYPH_SIZE + 6}" height="${GLYPH_SIZE + 6}" class="age-panel__born"/>`),
        (glyphs += glyphSvg(page.id, glyphX, glyphY, GLYPH_SIZE, page.severity)));
    });
    let rectClass =
        analysis.verdict === "stable"
          ? " age-panel__linkrect--lit"
          : analysis.verdict === "dying"
            ? " age-panel__linkrect--broken"
            : "",
      rectX = width - 60,
      rectY = height - 32,
      rect = hasWindow
        ? ""
        : `<rect x="${rectX}" y="${rectY}" width="40" height="24" rx="1" class="age-panel__linkrect${rectClass}"/>`;
    (setMarkup(visual, `<svg viewBox="0 0 ${width} ${height}" width="100%">` + glyphs + rect + "</svg>"),
      imageSrc
        ? this.mountWindow(visual, imageSrc, analysis.verdict)
        : this.settings.generatedWindow && this.mountGenerated(visual, analysis, sourcePath));
    let foot = panel.createDiv({ cls: "age-panel__foot" });
    foot
      .createSpan({
        cls: `age-panel__verdict age-panel__verdict--${analysis.verdict}`,
        text: `${analysis.verdict} \xB7 ${analysis.stability}%`,
      })
      .setAttr(
        "title",
        Object.entries(analysis.axisStability).map(([axis, value]) => `${axis} ${value}%`).join(`
`) || "no measurable instability",
      );
    let link = (parent, name) =>
        parent.createEl("a", { cls: "internal-link", text: name, attr: { "data-href": name, href: name } }),
      books = foot.createSpan({ cls: "age-panel__books" }),
      fissureText =
        analysis.fissure === "cave"
          ? "in a cavern"
          : analysis.fissure === "submarine"
            ? "beneath the water"
            : "in the open";
    (analysis.returnTo
      ? (books.createSpan({ text: "return book \u2192 " }),
        link(books, analysis.returnTo),
        analysis.fissure && books.createSpan({ text: `  \xB7  a fissure ${fissureText} leads home too` }))
      : analysis.fissure
        ? books.createSpan({ text: `no return book \u2014 a fissure ${fissureText} leads home` })
        : books.createSpan({
            cls: "age-panel__trapped",
            text: "no return book, and no fissure \u2014 nothing leads home",
          }),
      analysis.links.length &&
        (books.createSpan({ text: "  \xB7  leads to " }),
        analysis.links.forEach((name, index) => {
          (index > 0 && books.createSpan({ text: ", " }), link(books, name));
        })));
    let debug = panel.createDiv({ cls: "age-panel__debug" }),
      costs = Object.entries(resolved.costByAxis)
        .filter(([, cost]) => cost > 0)
        .map(([axis, cost]) => `${axis} ${cost.toFixed(2)}`)
        .join(" \xB7 ");
    debug.setText(costs || "no measurable instability yet");
  }
};

AgeWriterPlugin.PANEL_EXTENSIONS = ["gif", "png", "webp", "apng", "jpg", "jpeg", "svg"];

module.exports = { AgeWriterPlugin, BUILTIN_NOTE_INTRO, GLYPH_GAP, GLYPH_SIZE, MAP_PATH };
