// Banc commun des outils de mesure (développement, hors plugin) : le vrai build dans un faux Obsidian (jsdom), un plugin chargé.
// Usage : const H = require("./harness"); const p = new H.Plug(H.app, { dir: "plugins/age", version: "x" }); await p.onload();

const path = require("path"), Module = require("module");
// jsdom : `npm install` (devDependency) ; sinon JSDOM_DIR=…/node_modules
const { JSDOM } = process.env.JSDOM_DIR ? require(process.env.JSDOM_DIR + "/jsdom") : require("jsdom");
const { assemble, minify } = require("../build");

const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom; global.window = window; global.document = window.document; global.navigator = window.navigator;
for (const k of ["HTMLElement", "Element", "Node", "MutationObserver", "Image", "Audio", "IntersectionObserver"]) if (window[k]) global[k] = window[k];
global.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16); global.cancelAnimationFrame = clearTimeout;
global.matchMedia = window.matchMedia = () => ({ matches: false, addEventListener() {} });
global.IntersectionObserver = window.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
const proto = window.HTMLElement.prototype;
proto.empty = function () { this.innerHTML = ""; };
proto.addClass = function (...c) { this.classList.add(...c); }; proto.removeClass = function (...c) { this.classList.remove(...c); };
proto.toggleClass = function (c, on) { this.classList.toggle(c, on); }; proto.setText = function (t) { this.textContent = t; };
proto.setAttr = function (k, v) { this.setAttribute(k, v); };
const mk = (parent, tag, o) => { o = typeof o === "string" ? { cls: o } : o || {}; const e = document.createElement(tag); if (o.cls) e.className = o.cls; if (o.text != null) e.textContent = o.text; if (o.type) e.type = o.type; if (o.attr) for (const [k, v] of Object.entries(o.attr)) e.setAttribute(k, v); parent.appendChild(e); return e; };
proto.createEl = function (t, o) { return mk(this, t, o); }; proto.createDiv = function (o) { return mk(this, "div", o); }; proto.createSpan = function (o) { return mk(this, "span", o); };
// jsdom n'a pas de canvas : on fournit un contexte 2D inerte (Proxy)
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === "canvas" ? null : () => ctx2d)), set: (t, k, v) => ((t[k] = v), true) });
const gradient = { addColorStop() {} };
proto.getContext = function () { return new Proxy({ canvas: this, measureText: () => ({ width: 10 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient, createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4 * 16) }), putImageData() {}, createImageData: () => ({ data: new Uint8ClampedArray(4 * 16) }) }, { get: (t, k) => (k in t ? t[k] : () => undefined), set: (t, k, v) => ((t[k] = v), true) }); };

window.HTMLCanvasElement.prototype.getContext = proto.getContext;
const warns = []; const realWarn = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(" ")); if (process.env.SHOWWARN) realWarn(...a); };
const notices = [];

class TFile { constructor(p, c, mtime = 1) { this.path = p; this.basename = p.replace(/^.*\//, "").replace(/\.md$/, ""); this.extension = "md"; this.parent = { path: "/" }; this.stat = { ctime: 1, mtime }; this.content = c; } }
const files = new Map();
const events = {};
const on = (n) => (ev, cb) => { (events[n + ":" + ev] = events[n + ":" + ev] || []).push(cb); return { ev, cb }; };
const app = {
  vault: { getMarkdownFiles: () => [...files.values()], read: async (f) => f.content, cachedRead: async (f) => f.content, getAbstractFileByPath: (p) => files.get(p) || null,
    process: async (f, fn) => { f.content = fn(f.content); return f.content; }, create: async (p, c) => { const f = new TFile(p, c); files.set(p, f); return f; }, createFolder: async () => {}, on: on("vault"), adapter: { exists: async () => false, read: async () => "{}" }, getResourcePath: (f) => "x://" + f },
  workspace: { onLayoutReady: (f) => f(), getActiveFile: () => null, iterateAllLeaves: () => {}, getLeavesOfType: () => [], on: on("ws"), openLinkText: async () => {}, getLeaf: () => ({ openFile: async () => {} }), getRightLeaf: () => null },
  metadataCache: { getFileCache: () => null, resolvedLinks: {}, on: on("mc"), getFirstLinkpathDest: () => null, getCache: () => ({ links: [] }) },
  fileManager: { processFrontMatter: async () => {} },
};

class Plugin { constructor(a, m) { this.app = a; this.manifest = m; this.cmds = []; this.procs = {}; this.data = null; }
  async loadData() { return this.data; } async saveData(d) { this.data = JSON.parse(JSON.stringify(d)); } addCommand(c) { this.cmds.push(c); } addRibbonIcon() {} addSettingTab() {}
  registerEvent() {} registerMarkdownPostProcessor(f) { this.post = f; } registerView(t, f) { (this.views = this.views || {})[t] = f; } registerMarkdownCodeBlockProcessor(n, f) { this.procs[n] = f; } registerDomEvent() {} registerInterval() {} }
class Setting { constructor(el) { this.el = el; this.settingEl = document.createElement("div"); this.controlEl = document.createElement("div"); this.settingEl.appendChild(this.controlEl); } setName() { return this; } setDesc() { return this; } setHeading() { return this; } addDropdown(f) { f({ addOptions() { return this; }, setValue() { return this; }, onChange() { return this; } }); return this; }
  addToggle(f) { f({ setValue() { return this; }, onChange() { return this; } }); return this; } addText(f) { f({ setValue() { return this; }, onChange() { return this; }, setPlaceholder() { return this; } }); return this; } addSlider(f) { f({ setLimits() { return this; }, setValue() { return this; }, setDynamicTooltip() { return this; }, onChange() { return this; } }); return this; } }
const obsidian = { Plugin, ItemView: class { constructor(leaf) { this.app = leaf && leaf.app; this.contentEl = document.createElement("div"); } }, PluginSettingTab: class { constructor() { this.containerEl = document.createElement("div"); } }, Setting,
  Notice: class { constructor(m) { notices.push(String(m)); this.noticeEl = document.createElement("div"); } hide() {} }, TFile, MarkdownRenderChild: class { constructor(e) { this.containerEl = e; } register() {} registerDomEvent() {} registerInterval() {} }, FuzzySuggestModal: class { constructor(a) { this.app = a; } open() {} }, stringifyYaml: (o) => Object.entries(o).map(([k, v]) => `${k}: ${JSON.stringify(v)}\n`).join("") };

// build + chargement
// Le moteur est désormais dans src/engine : on teste le vrai code. MINIFIED=1 teste la version minifiée (release/).
const built0 = assemble(path.join(__dirname, ".."));
const built = process.env.MINIFIED ? minify(built0) : built0;
const m = new Module("main.js"); m.paths = []; const origReq = Module.prototype.require;
m.require = (n) => (n === "obsidian" ? obsidian : origReq.call(m, n));
m._compile(built, "main.js");
const Plug = m.exports.default;

module.exports = { Plug, app, files, TFile, obsidian, notices, warns };
