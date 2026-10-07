"use strict";
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

const unscore = (e) => e.replace(/_/g, " ");

function paletteGroups() {
  let e = new Map(),
    o = (t, i) => {
      (e.has(t) || e.set(t, []), e.get(t).push({ id: i, label: unscore(i) }));
    };
  for (let t of SKY_ENTRIES) o(t.axis, t.id);
  for (let t of blockList) t.writable && o(t.axis, t.id);
  return PALETTE_AXES.filter((t) => e.has(t)).map((t) => ({
    axis: t,
    label: AXIS_LABELS[t],
    items: e.get(t),
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
  constructor(t, i) {
    super(t);
    this.plugin = i;
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
    let t = this.contentEl,
      i = t.scrollTop;
    (t.empty(), t.addClass("age-book"));
    let r = this.plugin.currentAgeFile;
    if (!r) return this.message(t, "Open a note that holds an age block, then open this view again.");
    let s = await this.app.vault.cachedRead(r),
      n = extractAge(s);
    if (n === null) return this.message(t, `\u201C${r.basename}\u201D has no age block.`);
    this.shownPath !== r.path && ((this.shownPath = r.path), (this.spread = 0), (this.selectedBook = null));
    let a = analyseAge(n, { seed: noteName(r.path) }),
      c = t.createDiv({ cls: "age-book__head" });
    (c.createSpan({ cls: "age-book__title", text: r.basename }),
      c.createSpan({
        cls: `age-panel__verdict age-panel__verdict--${a.verdict}`,
        text: `${a.verdict} \xB7 ${a.stability}%`,
      }));
    let g = c.createDiv({ cls: "age-book__tabs" });
    for (let [d, f] of [
      ["descriptive", "Descriptive book"],
      ["linking", "Linking book"],
    ])
      g.createEl("button", { text: f, cls: this.mode === d ? "is-active" : "" }).addEventListener(
        "click",
        () => {
          ((this.mode = d), this.render());
        },
      );
    let h = t.createDiv({ cls: "age-book__spread" }),
      u = h.createDiv({ cls: "age-book__page age-book__page--left" });
    h.createDiv({ cls: "age-book__gutter" });
    let l = h.createDiv({ cls: "age-book__page age-book__page--right" });
    (this.mode === "descriptive"
      ? (this.descriptive(u, l, a, n, r), this.palette(t, r, writtenLines(s)))
      : await this.linking(u, l, a, r),
      (t.scrollTop = i));
  }
  message(t, i) {
    t.createDiv({ cls: "age-book__empty", text: i });
  }
  proseFor(t, i, r) {
    let s = this.proseCache.get(t);
    if (s && s.source === i) return s.text;
    let n = describeAge(r.resolved);
    return (this.proseCache.set(t, { source: i, text: n }), n);
  }
  descriptive(t, i, r, s, n) {
    let a = pageList(r, !0),
      c = Math.max(1, Math.ceil(a.length / CHIPS_PER_SPREAD));
    this.spread = Math.min(this.spread, c - 1);
    let g = a.slice(this.spread * CHIPS_PER_SPREAD, (this.spread + 1) * CHIPS_PER_SPREAD),
      h = t.createDiv({ cls: "age-book__chips" });
    if ((g.forEach((u, l) => this.chip(h, u, CHIP_TILTS[l % CHIP_TILTS.length], n)), c > 1)) {
      let u = t.createDiv({ cls: "age-book__nav" }),
        l = u.createEl("button", { text: "\u25C0" });
      ((l.disabled = this.spread === 0),
        l.addEventListener("click", () => {
          (this.spread--, this.render());
        }),
        u.createSpan({
          text: `${this.spread * CHIPS_PER_SPREAD + 1}\u2013${this.spread * CHIPS_PER_SPREAD + g.length} of ${a.length}`,
        }));
      let d = u.createEl("button", { text: "\u25B6" });
      ((d.disabled = this.spread >= c - 1),
        d.addEventListener("click", () => {
          (this.spread++, this.render());
        }));
    }
    if (
      (i.createDiv({ cls: "age-book__prose", text: this.proseFor(n.path, s, r) }),
      i.createDiv({
        cls: "age-book__colophon",
        text: Object.entries(r.axisStability)
          .map(([u, l]) => `${u} ${l}%`)
          .join(" \xB7 "),
      }),
      r.drawn.length > 0)
    ) {
      let u = r.drawn.length,
        l = i.createDiv({ cls: "age-book__drawn" });
      l.createSpan({
        text: `${u} page${u === 1 ? "" : "s"} drawn by the book, which left ${u === 1 ? "it" : "them"} open. `,
      });
      let d = l.createEl("button", { text: "Draw again" });
      (d.setAttr("title", "write a new seed: line, so the open pages land somewhere else"),
        d.addEventListener("click", () => {
          this.redraw(n);
        }));
    }
  }
  async redraw(t) {
    let i = String(1e3 + Math.floor(Math.random() * 9e3));
    await this.app.vault.process(t, (r) => setSeedLine(r, i) ?? r);
  }
  chip(t, i, r, s) {
    let n = t.createDiv({
      cls: "age-book__chip" + (i.born || i.drawn ? " is-born" : "") + (i.blot ? " is-blot" : ""),
    });
    n.style.transform = `rotate(${r}deg)`;
    let a = i.id.replace(/_/g, " ");
    n.setAttr(
      "title",
      i.blot
        ? "an unreadable page"
        : i.drawn
          ? `${a} \u2014 drawn by the book, which said nothing of it${i.chance !== void 0 ? ` (about ${Math.round(i.chance * 100)}% likely)` : ""}`
          : a,
    );
    let c = n.createDiv({ cls: "age-book__tab" });
    if (
      ((c.style.background = i.blot ? "#3a2f22" : AXIS_COLORS[i.axis ?? "cosmological"]),
      (n.createDiv({ cls: "age-book__chip-art" }).innerHTML = i.blot
        ? '<svg viewBox="0 0 100 100"><polygon points="22,50 34,30 58,24 80,38 74,66 50,78 30,70" fill="currentColor" opacity="0.8"/><polygon points="40,40 58,36 64,52 48,60" fill="currentColor" opacity="0.5"/></svg>'
        : `<svg viewBox="0 0 100 100">${glyphSvg(i.id, 0, 0, 100, i.severity)}</svg>`),
      i.drawn)
    ) {
      let g = n.createEl("button", { cls: "age-book__keep", text: "\u2713" });
      (g.setAttr("title", "keep this page \u2014 write it into the book"),
        g.addEventListener("click", (h) => {
          (h.stopPropagation(), this.togglePage(s, i.id));
        }));
    }
    if (i.written && !i.blot) {
      let g = n.createEl("button", { cls: "age-book__pull", text: "\xD7" });
      (g.setAttr("title", "take this page out"),
        g.addEventListener("click", (h) => {
          (h.stopPropagation(), this.togglePage(s, i.id));
        }));
    }
  }
  async togglePage(t, i) {
    await this.app.vault.process(t, (r) =>
      writtenLines(r).has(i) ? (removeLine(r, i) ?? r) : (addLine(r, i) ?? r),
    );
  }
  palette(t, i, r) {
    let s = t.createEl("details", { cls: "age-book__palette" });
    (this.paletteOpen && s.setAttr("open", ""),
      s.addEventListener("toggle", () => {
        this.paletteOpen = s.open;
      }),
      s.createEl("summary", { text: "Add or remove a page" }));
    for (let n of paletteGroups()) {
      s.createDiv({ cls: "age-book__palette-heading", text: n.label });
      let a = s.createDiv({ cls: "age-book__palette-grid" });
      for (let c of n.items) {
        let g = r.has(c.id),
          h = a.createEl("button", { cls: "age-book__swatch" + (g ? " is-written" : "") });
        (h.setAttr("title", g ? `${c.label} \u2014 in the book (click to take it out)` : c.label),
          (h.style.borderBottomColor = AXIS_COLORS[n.axis]),
          (h.innerHTML = `<svg viewBox="0 0 100 100">${glyphSvg(c.id, 0, 0, 100)}</svg>`),
          h.addEventListener("click", () => {
            this.togglePage(i, c.id);
          }));
      }
    }
  }
  async linking(t, i, r, s) {
    let n = [];
    r.returnTo && n.push({ name: r.returnTo, role: "return" });
    for (let u of r.links) u !== r.returnTo && n.push({ name: u, role: "leads to" });
    let a = [];
    for (let u of n) a.push(await this.look(u.name, u.role, s));
    let c = a.find((u) => u.name === this.selectedBook) ?? a[0];
    (c ? this.glimpse(t, c) : this.ownGlass(t, r, s),
      i.createDiv({ cls: "age-book__heading", text: "Linking books" }));
    let g = i.createDiv({ cls: "age-book__books" });
    a.length === 0 &&
      g.createDiv({
        cls: "age-book__none",
        text: "No linking book written. Add  link: [[Name]]  or  return: [[Name]]  to the age block.",
      });
    for (let u of a) this.bookRow(g, u, u === c, s);
    let h = homeMessage(r);
    h && i.createDiv({ cls: "age-book__none" + (r.trapped ? " is-trapped" : ""), text: h });
  }
  async look(t, i, r) {
    let s = this.app.metadataCache.getFirstLinkpathDest(t, r.path),
      n = { name: t, role: i, file: s, analysis: null, source: null, comesBack: !1 };
    if (!s) return n;
    let a = extractAge(await this.app.vault.cachedRead(s));
    if (a === null) return n;
    let c = analyseAge(a, { seed: noteName(s.path) }),
      g = [...c.links, ...(c.returnTo ? [c.returnTo] : [])].some(
        (h) => this.app.metadataCache.getFirstLinkpathDest(h, s.path)?.path === r.path,
      );
    return { ...n, analysis: c, source: a, comesBack: g };
  }
  bookRow(t, i, r, s) {
    let n = t.createDiv({ cls: "age-book__book" + (r ? " is-selected" : "") });
    (n.addEventListener("click", () => {
      ((this.selectedBook = i.name), this.render());
    }),
      n.createSpan({ cls: "age-book__role", text: i.role }),
      n.createSpan({ cls: "age-book__bookname", text: i.name }));
    let a = n.createSpan({ cls: "age-book__destnote" });
    (i.file
      ? i.analysis
        ? (a.setText(
            `${i.analysis.verdict} ${i.analysis.stability}% \xB7 ${i.comesBack ? "\u2194 comes back" : "\u2192 one-way"}`,
          ),
          a.addClass(`age-panel__verdict--${i.analysis.verdict}`))
        : a.setText("not an Age")
      : (a.setText("no such note"), a.addClass("is-missing")),
      i.file &&
        n.createEl("a", { cls: "age-book__open", text: "open \u2197" }).addEventListener("click", (g) => {
          (g.stopPropagation(), this.app.workspace.openLinkText(i.name, s.path, !1));
        }));
  }
  glimpse(t, i) {
    if (!i.file || !i.analysis || !i.source) {
      (this.dullGlass(t),
        t.createDiv({
          cls: "age-book__caption",
          text: i.file ? "This book leads to an ordinary note, not an Age." : "This book leads nowhere yet.",
        }));
      return;
    }
    let r = i.analysis,
      s = t.createDiv({ cls: "age-book__window" }),
      n = this.plugin.panelImageSrc(r.resolved.panel ?? this.plugin.settings.defaultPanel, i.file.path);
    n
      ? this.plugin.mountWindow(s, n, r.verdict)
      : this.plugin.settings.generatedWindow
        ? this.plugin.mountGenerated(s, r, i.file.path)
        : (s.innerHTML = this.drawnGlass(r.verdict));
    let a = pageList(r).slice(0, 8),
      c = 34,
      g = 8,
      h = t.createDiv({ cls: "age-book__strip" });
    h.innerHTML =
      `<svg viewBox="0 0 ${a.length * (c + g)} ${c}" width="100%">` +
      a.map((l, d) => glyphSvg(l.id, d * (c + g), 0, c, l.severity)).join("") +
      "</svg>";
    let u = this.proseFor(i.file.path, i.source, r).split(/(?<=[.!?])\s/)[0] ?? "";
    (t.createDiv({ cls: "age-book__glimpse", text: u.length > 170 ? u.slice(0, 167) + "\u2026" : u }),
      t.createDiv({
        cls: "age-book__caption",
        text: `Through the glass: ${i.file.basename} \xB7 ${r.verdict}${r.verdict === "dying" ? " \u2014 the glass is cracked" : ""}`,
      }));
  }
  ownGlass(t, i, r) {
    let s = t.createDiv({ cls: "age-book__window" }),
      n = this.plugin.panelImageSrc(i.resolved.panel ?? this.plugin.settings.defaultPanel, r.path);
    (n
      ? this.plugin.mountWindow(s, n, i.verdict)
      : this.plugin.settings.generatedWindow
        ? this.plugin.mountGenerated(s, i, r.path)
        : (s.innerHTML = this.drawnGlass(i.verdict)),
      t.createDiv({
        cls: "age-book__caption",
        text:
          i.verdict === "dying"
            ? "The glass has stopped answering."
            : i.verdict === "unstable"
              ? "The glass wavers."
              : "The glass is clear.",
      }));
  }
  dullGlass(t) {
    t.createDiv({ cls: "age-book__window" }).innerHTML = this.drawnGlass("dying");
  }
  drawnGlass(t) {
    return `<svg viewBox="0 0 160 96"><rect x="8" y="8" width="144" height="80" rx="1" class="age-panel__linkrect${t === "stable" ? " age-panel__linkrect--lit" : t === "dying" ? " age-panel__linkrect--broken" : ""}"/></svg>`;
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
