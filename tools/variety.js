// Variété des mondes (outil de développement, hors plugin) : combien de mondes stables ont l'air différents, ce que le portage ajoute,
// et jusqu'où le Rêve mène. Même harnais que test/integration.js (build réel, faux Obsidian). Usage : node tools/variety.js [N] [graine]
const fs = require("fs"), path = require("path"), Module = require("module");
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

const G = require("../src/genscene"), SKY = require("../src/sky"), REG = require("../src/engine/registry"), CARRY = require("../src/carry"), DREAM = require("../src/dream");
const N = Number(process.argv[2]) || 3000, SEED0 = Number(process.argv[3]) || 7;
const rnd = (() => { let s = SEED0 >>> 0 || 1; return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296); })();
const pick = (a) => a[Math.floor(rnd() * a.length)], chance = (p) => rnd() < p, some = (a, lo, hi) => { const n = lo + Math.floor(rnd() * (hi - lo + 1)), out = new Set(); while (out.size < Math.min(n, a.length)) out.add(pick(a)); return [...out]; };
const ALL = (Array.isArray(REG.BUILTIN_BLOCKS) ? REG.BUILTIN_BLOCKS : Object.values(REG.BUILTIN_BLOCKS)).filter((b) => b.writable !== false);
const AX = (ax) => ALL.filter((b) => b.axis === ax).map((b) => b.id), CAT = (c) => SKY.SKY_BLOCKS.filter((b) => b.category === c).map((b) => b.id);
const GEO = AX("geological"), ECO = AX("ecological"), WX = AX("weather"), META = AX("metaphysical"), COSMO = AX("cosmological");

/** Un Âge au hasard, façon joueur : un ciel, un sol, de la vie, un peu de temps ; rarement l'étrange. */
function randomAge() {
  const L = [];
  L.push(rnd() < 0.7 ? "single_sun" : rnd() < 0.67 ? "twin_suns" : "starless");
  const cy = rnd(); if (cy < 0.7) L.push("steady_cycle"); else if (cy < 0.8) L.push("frozen_cycle"); else if (cy < 0.9) L.push("erratic_cycle");
  for (const [id, p] of [["companion_moon", 0.3], ["auroras", 0.15], ["recurring_eclipses", 0.08], ["permanent_veil", 0.04], ["starfall", 0.06], ["chaotic_orbit", 0.04]]) if (chance(p)) L.push(id);
  if (chance(0.25)) L.push(pick(CAT("hue"))); if (chance(0.2)) L.push(pick(CAT("world"))); if (chance(0.15)) L.push(pick(CAT("belt"))); if (chance(0.03)) L.push(pick(CAT("remnant")));
  L.push(...some(CAT("terrain"), 0, 2), ...some(GEO, 1, 3), ...some(ECO, 0, 5), ...some(WX, 0, 2));
  if (META.length && chance(0.12)) L.push(pick(META)); if (COSMO.length && chance(0.04)) L.push(pick(COSMO));
  L.push("rotation: " + pick([12, 24, 24, 48]));
  if (chance(0.5)) L.push("tilt: " + pick([15, 30]));
  return [...new Set(L.filter(Boolean))];
}

/** Ce que l'œil voit dans la fenêtre, à deux grains : la famille (ce qu'un joueur nommerait) et le détail (ce qu'on distingue côte à côte). */
const WXV = ["storm", "rain", "snow", "fog", "dust", "ash", "hail", "drizzle", "tornado", "rainbow", "crystalRain", "acidRain", "ashRain", "steam", "petals", "glaze", "lightning", "wind"];
function looks(S) {
  const ground = S.world || (S.lava ? "lava" : S.ice ? "ice" : S.sand ? "sand" : S.water ? "water" : "land"), relief = S.terrain || "flat";
  const veg = S.trees >= 5 ? "jungle" : S.trees ? "trees" : S.grass || S.flowers ? "meadow" : S.glow ? "glow" : "bare";
  const sun = S.suns === 0 ? "nosun" : S.suns + "sun" + ((S.sunHues || []).length ? "-" + S.sunHues.map((h) => (Array.isArray(h) ? h.join("") : String(h))).join("") : "") + (S.blackDisc ? "-black" : "");
  const orn = [S.moon || (S.moons > 0) ? "moon" : "", S.rings ? "rings" : "", S.belt || "", S.auroras ? "aurora" : "", S.eclipses ? "eclipse" : "", S.veil ? "veil" : "", (S.remnants || []).length ? "remnant" : "", S.comet ? "comet" : ""].filter(Boolean);
  const wx = WXV.filter((k) => S[k]), mainWx = ["storm", "snow", "ash", "dust", "fog", "rain", "hail", "tornado"].find((k) => S[k]) || (wx.length ? "light" : "clear");
  const special = [...(S.wonders || []), ...(S.loop ? ["ring:" + (S.loopFam || "")] : []), ...((S.seams || []).some((f) => f.contra) ? ["upturned:" + (S.seams.find((f) => f.contra).what)] : [])];
  const fam = [ground, relief === "flat" ? "flat" : "relief", S.water ? "w" : "", veg, sun.replace(/-.*/, ""), orn.length ? "orn" : "", mainWx, special.length ? special.map((x) => x.split(":")[0]).sort().join("+") : ""].join("|");
  const fine = [ground, relief, S.water ? "water" : "", S.ice ? "ice" : "", S.lava ? "lava" : "", veg, S.burnt ? "burnt" : "", sun, orn.sort().join("+"), S.cycle, wx.sort().join("+"), special.sort().join("+"), (S.seams || []).length ? "seam" : ""].join("|");
  const kind = [ground, veg === "bare" ? "bare" : "green", sun.replace(/-.*/, ""), special.length ? "special" : ""].join("|"); /* ce qu'un joueur nommerait : « un désert nu à deux soleils » */
  return { kind, fam, fine };
}
/** Chao1 : ce qu'on a vu, plus ce qu'on n'a sans doute pas encore vu (les familles vues une fois, au carré, sur deux fois celles vues deux fois). */
const chao1 = (counts) => { const v = [...counts.values()], f1 = v.filter((x) => x === 1).length, f2 = v.filter((x) => x === 2).length; return Math.round(v.length + (f2 ? (f1 * f1) / (2 * f2) : (f1 * (f1 - 1)) / 2)); };
const tally = (list, key) => { const m = new Map(); for (const x of list) m.set(x[key], (m.get(x[key]) || 0) + 1); return m; };

(async () => {
  const p = new Plug(app, { dir: "plugins/age", version: "variety" }); await p.onload();
  const an = (f) => p.core.analyse(p.core.extract(f.content), { seed: p.core.seed(f.path) });
  const sceneOf = (a, f) => { const S = G.sceneOf(a, p.core.seed(f.path), p.core.blocks); if (S) Object.assign(S, SKY.parseSky(p.core.extract(f.content))); return S; };
  const mkFile = (name, lines) => { const pth = `Var/${name}.md`, f = new TFile(pth, "```age\n" + lines.join("\n") + "\n```\n"); files.set(pth, f); return f; };
  const t0 = Date.now(), all = [], stable = [];
  for (let i = 0; i < N; i++) {
    const lines = randomAge(), f = mkFile("V" + i, lines), a = an(f), S = sceneOf(a, f); if (!S) continue;
    const row = { i, f, lines, st: a.stability, ...looks(S) }; all.push(row); if (a.stability >= 75) stable.push(row);
    if ((i + 1) % (process.env.EVERY ? Number(process.env.EVERY) : 500) === 0) process.stdout.write(`  ${i + 1}/${N} (${stable.length} stables, ${((Date.now() - t0) / (i + 1)).toFixed(0)} ms par Âge)\n`);
  }
  const famC = tally(stable, "fam"), fineC = tally(stable, "fine"), kindC = tally(stable, "kind");
  const curve = []; for (const k of [100, 250, 500, 1000, 2000, 4000, 8000].filter((k) => k <= stable.length).concat([stable.length])) { const sub = stable.slice(0, k); curve.push({ k, kind: new Set(sub.map((x) => x.kind)).size, fam: new Set(sub.map((x) => x.fam)).size, fine: new Set(sub.map((x) => x.fine)).size }); }
  const out = { N, seed: SEED0, secs: Math.round((Date.now() - t0) / 1000), stable: stable.length, stableShare: +(stable.length / Math.max(1, all.length)).toFixed(3),
    kinds: { seen: kindC.size, chao1: chao1(kindC) }, families: { seen: famC.size, chao1: chao1(famC) }, fine: { seen: fineC.size, chao1: chao1(fineC) }, curve,
    commonFamilies: [...famC.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12), grounds: [...tally(stable.map((x) => ({ g: x.fam.split("|")[0] })), "g").entries()].sort((a, b) => b[1] - a[1]) };

  /* le portage : au bac à sable après le 17 (une fin prise dans l'histoire), des paires source → receveur parmi les stables */
  p.ext.story = { "variety#1": { done: [], seen: {}, notes: {}, stone: { ending: "accord" } } };
  const src = stable.slice(0, 400); for (const r of src) { p.carrySource(r.f, p.core.extract(r.f.content)); p.law.observe(r.f.basename, an(r.f), r.f.stat.mtime); }
  p.index.invalidate(); await p.index.list();
  const famSet = new Set(stable.map((x) => x.fam)), fineSet = new Set(stable.map((x) => x.fine)), carried = [], M = Math.min(1500, src.length * 3); let held = 0, tried = 0;
  for (let k = 0; k < M; k++) {
    const R = pick(src), Sx = pick(src); if (R === Sx) continue; tried++;
    const contra = chance(0.35), what = contra ? pick(CARRY.PLACES) : pick(CARRY.WHATS);
    let lines = R.lines.slice(); if (contra) lines = lines.map((l) => (/^rotation:/.test(l) ? "rotation: " + (Number((Sx.lines.find((x) => /^rotation:/.test(x)) || "rotation: 24").split(":")[1]) * 2) : l)); /* à contre-sens : à l'octave de la source */
    const f = mkFile("C" + k, [...lines, `carry: ${what} from ${Sx.f.basename}${contra ? " as sky" : ""}`]), a = an(f), S = sceneOf(a, f);
    if (!S || !(a.carry && a.carry.fragments && a.carry.fragments.length)) continue; if (a.stability < 75) continue; held++;
    carried.push({ ...looks(S), contra });
  }
  /* l'anneau : deux Âges qui se portent l'un l'autre, même ciel écrit, même jour */
  let rings = 0; const ringFam = new Set(), pairs = [], SKYL = /^(single_sun|twin_suns|starless|steady_cycle|frozen_cycle|erratic_cycle|rotation:)/;
  for (let k = 0; k < 200; k++) {
    const A = pick(src), B = pick(src); if (A === B) continue;
    const isSky = (l) => SKYL.test(l) || p.blockAxis(l.trim()) === "cosmological", sky = A.lines.filter(isSky), body = (r) => r.lines.filter((l) => !isSky(l));
    const fa = mkFile("RA" + k, [...sky, ...body(A), `carry: ${pick(CARRY.PLACES)} from RB${k}`]), fb = mkFile("RB" + k, [...sky, ...body(B), `carry: ${pick(CARRY.PLACES)} from RA${k}`]);
    for (const f of [fa, fb]) { p.carrySource(f, p.core.extract(f.content)); p.law.observe(f.basename, an(f), f.stat.mtime); } pairs.push(fa);
  }
  p.index.invalidate(); await p.index.list();
  for (const fa of pairs) { const a = an(fa), S = sceneOf(a, fa); if (!S || !S.loop || a.stability < 75) continue; rings++; const L = looks(S); ringFam.add(L.fam); carried.push({ ...L, ring: true }); }
  out.carry = { tried, held, rings, newFamilies: new Set(carried.map((x) => x.fam).filter((x) => !famSet.has(x))).size, newFine: new Set(carried.map((x) => x.fine).filter((x) => !fineSet.has(x))).size,
    upturnedFamilies: new Set(carried.filter((x) => x.contra).map((x) => x.fam)).size, ringFamilies: ringFam.size, newKinds: new Set(carried.map((x) => x.kind).filter((x) => !kindC.has(x))).size };

  /* le Rêve : depuis quelques mondes de départ, on adopte ce que le rêve montre (un possible = un bloc de plus), trois rêves de suite */
  const starts = stable.slice(0, 40), reached = new Set(), DAY0 = 20000; let steps = 0;
  for (const s0 of starts) {
    let frontier = [s0.lines]; reached.add(s0.fam);
    for (let d = 0; d < 3; d++) { const next = [];
      for (const lines of frontier) {
        const f = mkFile("D" + steps++, lines), a = an(f), seed = p.core.seed(f.path), alts = DREAM.altSeeds(seed, 1, DAY0 + d).map((s2) => p.core.analyse(p.core.extract(f.content), { seed: s2 }));
        for (const it of DREAM.possiblesIn(a, alts)) { const nl = [...lines, it.id], g = mkFile("D" + steps++, nl), b = an(g), S = sceneOf(b, g); if (S && b.stability >= 75) { reached.add(looks(S).fam); next.push(nl); } }
      }
      frontier = next.slice(0, 6); }
  }
  out.dream = { starts: starts.length, familiesReached: reached.size, shareOfSeen: +(reached.size / famC.size).toFixed(3), newVsBaseline: [...reached].filter((x) => !famSet.has(x)).length };
  out.secs = Math.round((Date.now() - t0) / 1000);
  const file = path.join(process.env.OUT || ".", `variety-${N}-${SEED0}.json`); fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ ...out, commonFamilies: out.commonFamilies.slice(0, 6) }, null, 1)); console.log("→ " + file);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
