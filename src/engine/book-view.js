"use strict";
const { setMarkup } = require("../util");
const obsidian = require("obsidian");
const { SKY_ENTRIES } = require("./data/sky");
const { blockList } = require("./registry");
const { analyseAge, extractAge, homeMessage, noteName, pageList } = require("./analysis");
const { addLine, removeLine, setSeedLine, writtenLines } = require("./age-text");
const { describeAge } = require("./prose");
const { glyphSvg } = require("./glyphs");

const AXIS_LABELS = {
  cosmological: "Sky",
  geological: "Matter",
  weather: "Weather",
  ecological: "Living things",
  metaphysical: "Ruins",
};

const PALETTE_AXES = ["cosmological", "geological", "weather", "ecological", "metaphysical"];

const unscore = (text) => text.replace(/_/g, " ");

function paletteGroups() {
  let groups = new Map(),
    add = (axis, id) => {
      (groups.has(axis) || groups.set(axis, []), groups.get(axis).push({ id: id, label: unscore(id) }));
    };
  for (let entry of SKY_ENTRIES) add(entry.axis, entry.id);
  for (let block of blockList) block.writable && add(block.axis, block.id);
  return PALETTE_AXES.filter((axis) => groups.has(axis)).map((axis) => ({
    axis: axis,
    label: AXIS_LABELS[axis],
    items: groups.get(axis),
  }));
}

const BOOK_VIEW_TYPE = "age-writer-book";

const CHIPS_PER_SPREAD = 6;

const AXIS_COLORS = {
  cosmological: "#b8934a",
  geological: "#9a5238",
  ecological: "#4a7a6a",
  metaphysical: "#6a4a8a",
  weather: "#4a6a9a",
};

const CHIP_TILTS = [-4, 3, -2, 5, -3, 2];

const BookView = class extends obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.mode = "descriptive";
    this.spread = 0;
    this.shownPath = null;
    this.selectedBook = null;
    this.paletteOpen = !0;
    this.proseCache = new Map();
  }
  getViewType() {
    return BOOK_VIEW_TYPE;
  }
  getDisplayText() {
    return "Age book";
  }
  getIcon() {
    return "book-open";
  }
  async onOpen() {
    await this.render();
  }
  async render() {
    let container = this.contentEl,
      scrollTop = container.scrollTop;
    (container.empty(), container.addClass("age-book"));
    let file = this.plugin.currentAgeFile;
    if (!file)
      return this.message(container, "Open a note that holds an age block, then open this view again.");
    let text = await this.app.vault.cachedRead(file),
      ageSource = extractAge(text);
    if (ageSource === null) return this.message(container, `\u201C${file.basename}\u201D has no age block.`);
    this.shownPath !== file.path &&
      ((this.shownPath = file.path), (this.spread = 0), (this.selectedBook = null));
    let analysis = analyseAge(ageSource, { seed: noteName(file.path) }),
      head = container.createDiv({ cls: "age-book__head" });
    (head.createSpan({ cls: "age-book__title", text: file.basename }),
      head.createSpan({
        cls: `age-panel__verdict age-panel__verdict--${analysis.verdict}`,
        text: `${analysis.verdict} \xB7 ${analysis.stability}%`,
      }));
    let tabs = head.createDiv({ cls: "age-book__tabs" });
    for (let [mode, label] of [
      ["descriptive", "Descriptive book"],
      ["linking", "Linking book"],
    ])
      tabs
        .createEl("button", { text: label, cls: this.mode === mode ? "is-active" : "" })
        .addEventListener("click", () => {
          ((this.mode = mode), this.render());
        });
    let spreadEl = container.createDiv({ cls: "age-book__spread" }),
      leftPage = spreadEl.createDiv({ cls: "age-book__page age-book__page--left" });
    spreadEl.createDiv({ cls: "age-book__gutter" });
    let rightPage = spreadEl.createDiv({ cls: "age-book__page age-book__page--right" });
    (this.mode === "descriptive"
      ? (this.descriptive(leftPage, rightPage, analysis, ageSource, file),
        this.palette(container, file, writtenLines(text)))
      : await this.linking(leftPage, rightPage, analysis, file),
      (container.scrollTop = scrollTop));
  }
  message(container, text) {
    container.createDiv({ cls: "age-book__empty", text: text });
  }
  proseFor(path, source, analysis) {
    let cached = this.proseCache.get(path);
    if (cached && cached.source === source) return cached.text;
    let text = describeAge(analysis.resolved, { seed: noteName(path) });
    return (this.proseCache.set(path, { source: source, text: text }), text);
  }
  descriptive(leftPage, rightPage, analysis, ageSource, file) {
    let pages = pageList(analysis, !0),
      spreadCount = Math.max(1, Math.ceil(pages.length / CHIPS_PER_SPREAD));
    this.spread = Math.min(this.spread, spreadCount - 1);
    let visible = pages.slice(this.spread * CHIPS_PER_SPREAD, (this.spread + 1) * CHIPS_PER_SPREAD),
      chipsEl = leftPage.createDiv({ cls: "age-book__chips" });
    if (
      (visible.forEach((page, index) =>
        this.chip(chipsEl, page, CHIP_TILTS[index % CHIP_TILTS.length], file),
      ),
      spreadCount > 1)
    ) {
      let nav = leftPage.createDiv({ cls: "age-book__nav" }),
        prevButton = nav.createEl("button", { text: "\u25C0" });
      ((prevButton.disabled = this.spread === 0),
        prevButton.addEventListener("click", () => {
          (this.spread--, this.render());
        }),
        nav.createSpan({
          text: `${this.spread * CHIPS_PER_SPREAD + 1}\u2013${this.spread * CHIPS_PER_SPREAD + visible.length} of ${pages.length}`,
        }));
      let nextButton = nav.createEl("button", { text: "\u25B6" });
      ((nextButton.disabled = this.spread >= spreadCount - 1),
        nextButton.addEventListener("click", () => {
          (this.spread++, this.render());
        }));
    }
    if (
      (rightPage.createDiv({ cls: "age-book__prose", text: this.proseFor(file.path, ageSource, analysis) }),
      rightPage.createDiv({
        cls: "age-book__colophon",
        text: Object.entries(analysis.axisStability)
          .map(([axis, stability]) => `${axis} ${stability}%`)
          .join(" \xB7 "),
      }),
      analysis.drawn.length > 0)
    ) {
      let drawnCount = analysis.drawn.length,
        drawnEl = rightPage.createDiv({ cls: "age-book__drawn" });
      drawnEl.createSpan({
        text: `${drawnCount} page${drawnCount === 1 ? "" : "s"} drawn by the book, which left ${drawnCount === 1 ? "it" : "them"} open. `,
      });
      let redrawButton = drawnEl.createEl("button", { text: "Draw again" });
      (redrawButton.setAttr("title", "write a new seed: line, so the open pages land somewhere else"),
        redrawButton.addEventListener("click", () => {
          this.redraw(file);
        }));
    }
  }
  async redraw(file) {
    let seed = String(1e3 + Math.floor(Math.random() * 9e3));
    await this.app.vault.process(file, (text) => setSeedLine(text, seed) ?? text);
  }
  chip(container, page, tilt, file) {
    let chipEl = container.createDiv({
      cls: "age-book__chip" + (page.born || page.drawn ? " is-born" : "") + (page.blot ? " is-blot" : ""),
    });
    chipEl.style.transform = `rotate(${tilt}deg)`;
    let label = page.id.replace(/_/g, " ");
    chipEl.setAttr(
      "title",
      page.blot
        ? "an unreadable page"
        : page.drawn
          ? `${label} \u2014 drawn by the book, which said nothing of it${page.chance !== void 0 ? ` (about ${Math.round(page.chance * 100)}% likely)` : ""}`
          : label,
    );
    let tab = chipEl.createDiv({ cls: "age-book__tab" });
    if (
      ((tab.style.background = page.blot ? "#3a2f22" : AXIS_COLORS[page.axis ?? "cosmological"]),
      setMarkup(chipEl.createDiv({ cls: "age-book__chip-art" }), page.blot
        ? '<svg viewBox="0 0 100 100"><polygon points="22,50 34,30 58,24 80,38 74,66 50,78 30,70" fill="currentColor" opacity="0.8"/><polygon points="40,40 58,36 64,52 48,60" fill="currentColor" opacity="0.5"/></svg>'
        : `<svg viewBox="0 0 100 100">${glyphSvg(page.id, 0, 0, 100, page.severity)}</svg>`),
      page.drawn)
    ) {
      let button = chipEl.createEl("button", { cls: "age-book__keep", text: "\u2713" });
      (button.setAttr("title", "keep this page \u2014 write it into the book"),
        button.addEventListener("click", (event) => {
          (event.stopPropagation(), this.togglePage(file, page.id));
        }));
    }
    if (page.written && !page.blot) {
      let button = chipEl.createEl("button", { cls: "age-book__pull", text: "\xD7" });
      (button.setAttr("title", "take this page out"),
        button.addEventListener("click", (event) => {
          (event.stopPropagation(), this.togglePage(file, page.id));
        }));
    }
  }
  async togglePage(file, id) {
    await this.app.vault.process(file, (text) =>
      writtenLines(text).has(id) ? (removeLine(text, id) ?? text) : (addLine(text, id) ?? text),
    );
  }
  palette(container, file, written) {
    let details = container.createEl("details", { cls: "age-book__palette" });
    (this.paletteOpen && details.setAttr("open", ""),
      details.addEventListener("toggle", () => {
        this.paletteOpen = details.open;
      }),
      details.createEl("summary", { text: "Add or remove a page" }));
    for (let group of paletteGroups()) {
      details.createDiv({ cls: "age-book__palette-heading", text: group.label });
      let grid = details.createDiv({ cls: "age-book__palette-grid" });
      for (let item of group.items) {
        let isWritten = written.has(item.id),
          swatch = grid.createEl("button", { cls: "age-book__swatch" + (isWritten ? " is-written" : "") });
        (swatch.setAttr(
          "title",
          isWritten ? `${item.label} \u2014 in the book (click to take it out)` : item.label,
        ),
          (swatch.style.borderBottomColor = AXIS_COLORS[group.axis]),
          setMarkup(swatch, `<svg viewBox="0 0 100 100">${glyphSvg(item.id, 0, 0, 100)}</svg>`),
          swatch.addEventListener("click", () => {
            this.togglePage(file, item.id);
          }));
      }
    }
  }
  async linking(leftPage, rightPage, analysis, file) {
    let entries = [];
    analysis.returnTo && entries.push({ name: analysis.returnTo, role: "return" });
    for (let linkName of analysis.links)
      linkName !== analysis.returnTo && entries.push({ name: linkName, role: "leads to" });
    let books = [];
    for (let entry of entries) books.push(await this.look(entry.name, entry.role, file));
    let selected = books.find((book) => book.name === this.selectedBook) ?? books[0];
    (selected ? this.glimpse(leftPage, selected) : this.ownGlass(leftPage, analysis, file),
      rightPage.createDiv({ cls: "age-book__heading", text: "Linking books" }));
    let booksEl = rightPage.createDiv({ cls: "age-book__books" });
    books.length === 0 &&
      booksEl.createDiv({
        cls: "age-book__none",
        text: "No linking book written. Add  link: [[Name]]  or  return: [[Name]]  to the age block.",
      });
    for (let book of books) this.bookRow(booksEl, book, book === selected, file);
    let homeText = homeMessage(analysis);
    homeText &&
      rightPage.createDiv({
        cls: "age-book__none" + (analysis.trapped ? " is-trapped" : ""),
        text: homeText,
      });
  }
  async look(name, role, file) {
    let dest = this.app.metadataCache.getFirstLinkpathDest(name, file.path),
      base = { name: name, role: role, file: dest, analysis: null, source: null, comesBack: !1 };
    if (!dest) return base;
    let ageSource = extractAge(await this.app.vault.cachedRead(dest));
    if (ageSource === null) return base;
    let analysis = analyseAge(ageSource, { seed: noteName(dest.path) }),
      comesBack = [...analysis.links, ...(analysis.returnTo ? [analysis.returnTo] : [])].some(
        (link) => this.app.metadataCache.getFirstLinkpathDest(link, dest.path)?.path === file.path,
      );
    return { ...base, analysis: analysis, source: ageSource, comesBack: comesBack };
  }
  bookRow(container, book, selected, file) {
    let row = container.createDiv({ cls: "age-book__book" + (selected ? " is-selected" : "") });
    (row.addEventListener("click", () => {
      ((this.selectedBook = book.name), this.render());
    }),
      row.createSpan({ cls: "age-book__role", text: book.role }),
      row.createSpan({ cls: "age-book__bookname", text: book.name }));
    let note = row.createSpan({ cls: "age-book__destnote" });
    (book.file
      ? book.analysis
        ? (note.setText(
            `${book.analysis.verdict} ${book.analysis.stability}% \xB7 ${book.comesBack ? "\u2194 comes back" : "\u2192 one-way"}`,
          ),
          note.addClass(`age-panel__verdict--${book.analysis.verdict}`))
        : note.setText("not an Age")
      : (note.setText("no such note"), note.addClass("is-missing")),
      book.file &&
        row
          .createEl("a", { cls: "age-book__open", text: "open \u2197" })
          .addEventListener("click", (event) => {
            (event.stopPropagation(), this.app.workspace.openLinkText(book.name, file.path, !1));
          }));
  }
  glimpse(container, book) {
    if (!book.file || !book.analysis || !book.source) {
      (this.dullGlass(container),
        container.createDiv({
          cls: "age-book__caption",
          text: book.file
            ? "This book leads to an ordinary note, not an Age."
            : "This book leads nowhere yet.",
        }));
      return;
    }
    let analysis = book.analysis,
      windowEl = container.createDiv({ cls: "age-book__window" }),
      src = this.plugin.panelImageSrc(
        analysis.resolved.panel ?? this.plugin.settings.defaultPanel,
        book.file.path,
      );
    src
      ? this.plugin.mountWindow(windowEl, src, analysis.verdict)
      : this.plugin.settings.generatedWindow
        ? this.plugin.mountGenerated(windowEl, analysis, book.file.path)
        : setMarkup(windowEl, this.drawnGlass(analysis.verdict));
    let pages = pageList(analysis).slice(0, 8),
      size = 34,
      gap = 8,
      strip = container.createDiv({ cls: "age-book__strip" });
    setMarkup(
      strip,
      `<svg viewBox="0 0 ${pages.length * (size + gap)} ${size}" width="100%">` +
        pages.map((page, index) => glyphSvg(page.id, index * (size + gap), 0, size, page.severity)).join("") +
        "</svg>",
    );
    let firstSentence = this.proseFor(book.file.path, book.source, analysis).split(/(?<=[.!?])\s/)[0] ?? "";
    (container.createDiv({
      cls: "age-book__glimpse",
      text: firstSentence.length > 170 ? firstSentence.slice(0, 167) + "\u2026" : firstSentence,
    }),
      container.createDiv({
        cls: "age-book__caption",
        text: `Through the glass: ${book.file.basename} \xB7 ${analysis.verdict}${analysis.verdict === "dying" ? " \u2014 the glass is cracked" : ""}`,
      }));
  }
  ownGlass(container, analysis, file) {
    let windowEl = container.createDiv({ cls: "age-book__window" }),
      src = this.plugin.panelImageSrc(
        analysis.resolved.panel ?? this.plugin.settings.defaultPanel,
        file.path,
      );
    (src
      ? this.plugin.mountWindow(windowEl, src, analysis.verdict)
      : this.plugin.settings.generatedWindow
        ? this.plugin.mountGenerated(windowEl, analysis, file.path)
        : setMarkup(windowEl, this.drawnGlass(analysis.verdict)),
      container.createDiv({
        cls: "age-book__caption",
        text:
          analysis.verdict === "dying"
            ? "The glass has stopped answering."
            : analysis.verdict === "unstable"
              ? "The glass wavers."
              : "The glass is clear.",
      }));
  }
  dullGlass(container) {
    setMarkup(container.createDiv({ cls: "age-book__window" }), this.drawnGlass("dying"));
  }
  drawnGlass(verdict) {
    return `<svg viewBox="0 0 160 96"><rect x="8" y="8" width="144" height="80" rx="1" class="age-panel__linkrect${verdict === "stable" ? " age-panel__linkrect--lit" : verdict === "dying" ? " age-panel__linkrect--broken" : ""}"/></svg>`;
  }
};

module.exports = {
  AXIS_COLORS,
  AXIS_LABELS,
  BOOK_VIEW_TYPE,
  BookView,
  CHIPS_PER_SPREAD,
  CHIP_TILTS,
  PALETTE_AXES,
  paletteGroups,
  unscore,
};
