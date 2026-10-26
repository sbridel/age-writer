// Test d'intégration : main.js factice (extraits fidèles) → build → exécution dans jsdom avec un faux "obsidian".
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
let fail = 0; const REAL = true; const ok = (c, msg) => { if (!REAL && /analyseur \(pas|hook adjust/.test(msg)) return console.log("  --  (réservé au vrai main.js) " + msg); console.log((c ? "  ok  " : "  KO  ") + msg); if (!c) fail++; };

(async () => {
  const A = (c) => "# note\n```age\n" + c + "\n```\n";
  files.set("Ages/Alpha.md", new TFile("Ages/Alpha.md", A("water\nsingle_sun\ndnie_mechanism: steam_powered_elevator\nseed: 4242")));
  const p = new Plug(app, { dir: "plugins/age", version: "1.4.0" });
  await p.onload();
  ok(p.ext && p.ext.panelFx === "classic", "réglages par défaut fusionnés");
  ok(p.ext.instrumentsMode === "easy", "instruments : mode facile par défaut");
  { /* les deux réserves (section 19.2) : le bac à sable et chaque Relto histoire ont leur récolte, leur machine, leur caverne */
    const SK = "histoire#7";
    ok(p.poolExt(null) === p.ext && p.poolExt(SK) !== p.ext && p.poolExt(SK) === p.poolExt(SK), "réserves : le bac à sable est ext, un Relto histoire a la sienne");
    p.ext.harvest = { stock: { ash: 3, humus: 0, silt: 0, peat: 0 } }; p.ovenAct("add", 0, null);
    ok(p.ext.harvest.stock.ash === 2 && !(p.poolExt(SK).harvest && p.poolExt(SK).harvest.stock.ash), "une mesure versée au bac à sable ne touche pas la réserve de l'histoire");
    p.ovenAct("empty", null, null);
    p.caveState(SK); p.poolExt(SK).cave.revealed = 2; ok((p.caveState(null).revealed || 0) === 0 && p.caveState(SK).revealed === 2, "les révélations de l'histoire restent à l'histoire");
    ok(p.poolOpen(null) && !p.poolOpen(SK), "dans un Relto histoire, la machine attend le chapitre 10");
    p.ext.story = p.ext.story || {}; p.ext.story[SK] = { done: ["strange"] }; ok(p.poolOpen(SK), "la lettre du 9 reçue : la machine s'ouvre");
    p._lastPool = SK; p.ovenTest("white"); ok(p.poolExt(SK).pellets.white === 5 && !(p.ext.pellets && p.ext.pellets.white >= 5), "les essais agissent sur la réserve du dernier Relto ouvert");
    p._lastPool = null; delete p.ext.storyPools; delete p.ext.story[SK]; delete p.ext.harvest; delete p.ext.cave; delete p.ext.oven; delete p.ext.pellets;
  }
  { /* le Rêve (étape 4d) : un par Âge et par jour ; le guide ; adopter n'écrit qu'au clic, et ce qu'on a choisi */
    const age = { name: "Alpha", path: "Ages/Alpha.md" }, SK = "histoire#9";
    ok(p.dreamLast(age, null) === null, "rêve : jamais rêvé");
    p.dreamMark(age, null); ok(typeof p.dreamLast(age, null) === "number" && p.dreamLast(age, SK) === null, "rêve : compté dans la réserve du Relto, pas ailleurs");
    p.ext.wonders = { mosaic: { at: 1, age: "4242" } };
    ok(/suivra|follow/.test(p.toggleDreamGuide("mosaic")) && p.ext.dreamGuide === "mosaic" && /place/.test(p.toggleDreamGuide("mosaic")) && !p.ext.dreamGuide, "rêve : emporter l'orbe, le reposer");
    const before = files.get("Ages/Alpha.md").content;
    ok(await p.dreamAdopt("Ages/Alpha.md", { line: { add: "fern" } }, "") && /\nfern\n/.test(files.get("Ages/Alpha.md").content), "rêve : adopter un possible écrit son bloc");
    ok(await p.dreamAdopt("Ages/Alpha.md", { line: { remove: "fern" } }, "") && files.get("Ages/Alpha.md").content === before, "rêve : retirer la ligne qui cause une faute");
    ok(!(await p.dreamAdopt("Ages/Alpha.md", { line: { remove: "nothing_here" } }, "")), "rêve : rien à retirer, rien ne change");
    ok(await p.dreamAdopt("", { line: { face: "mosaic" } }, "it holds") && p.ext.wonders.mosaic.face === "it holds", "rêve : la phrase d'une merveille va sur son orbe");
    p.ext.dreamGuide = "mosaic"; const n0 = notices.length; p.dreamWoke({ data: { name: "Alpha" }, guided: false, seen: [] });
    ok(!p.ext.dreamGuide && notices.length === n0 + 1, "rêve : au réveil le guide reprend sa place ; sans guide, une phrase, rien d'autre");
    { const src = p.core.extract(files.get("Ages/Alpha.md").content), seeds = ["4242~a", "4242~b"], main = p.core.analyse(src, { seed: "4242", probe: true }), alts = seeds.map((s2) => p.core.analyse(src, { seed: s2, probe: true }));
      ok(main && alts.every((x) => x && x.resolved && Array.isArray(x.resolved.drawn)) && !p.ext.harvest, "rêve : les tirages voisins s'analysent sans rien récolter ni toucher à la loi"); }
    delete p.ext.dreams; delete p.ext.wonders;
  }
  ok(["age-journal", "relto", "dni"].every((n) => p.procs[n]), "blocs relto / age-journal / dni enregistrés");
  ok(["open-relto", "create-relto-page", "create-exploration-journal", "save-age-cover", "stop-soundscape"].every((id) => p.cmds.some((c) => c.id === id)), "commandes enregistrées");

  // hooks du moteur : ligne de mécanisme ignorée par l'analyseur (pas d'« encre »)
  const res = p.core.analyse("water\ndnie_mechanism: steam_powered_elevator", { seed: "Alpha" });
  ok(!res.resolved.lines.some((l) => l.unknown), "ligne dnie_mechanism ignorée par l'analyseur (pas de symbole inconnu)");
  const trapA = p.core.analyse("water\ntrap book\nreturn: [[Home]]", { seed: "T" });
  ok(trapA.trapped === true && !trapA.returnTo && trapA.fissure === null, "« trap book » : Âge piège (return ignoré), la ligne n'est pas un élément");
  if (REAL) ok(!(trapA.resolved.lines || []).some((l) => /trap/i.test(l.text || l.raw || "")) && !trapA.resolved.lines.some((l) => l.unknown), "ligne trap book ignorée par le parseur");
  if (REAL) {
    // livre-piège : aucune fissure tirée au hasard (le pied de bloc dit « pas de fissure », le texte et la vitre doivent s'accorder)
    const fis = (src, n) => { let hit = 0; for (let k = 0; k < n; k++) { const r = p.core.analyse(src, { seed: "S" + k }).resolved; if ([...(r.drawn || []).map((d) => d.id), ...r.matter.written].some((id) => /fissure/.test(id))) hit++; } return hit; };
    ok(fis("water\nstone", 200) > 0, "(contrôle) sans piège, le tirage ajoute des fissures");
    ok(fis("water\nstone\ntrap book", 200) === 0, "« trap book » : aucune fissure tirée au hasard");
  }
  const dmgA = p.core.analyse("water\ndamaged_pages = 2\nremoved_pages: 3", { seed: "D" }), dmgB = p.core.analyse("water", { seed: "D" });
  ok(dmgA.damage && dmgA.damage.damaged === 2 && dmgA.damage.removed === 3 && dmgA.stability === dmgB.stability, "damaged_pages / removed_pages : la stabilité de l'Âge ne change pas, seule la liaison");
  if (REAL) ok(!dmgA.resolved.lines.some((l) => l.unknown), "lignes damaged_pages / removed_pages ignorées par le parseur");
  const bad = p.core.analyse("water\nxyz_inconnu", { seed: "Beta" });
  ok(bad.stability < 100, "un vrai symbole inconnu coûte toujours de la stabilité");

  // ciel étendu (vrai moteur) : blocs pesant sur la stabilité, jamais tirés au sort
  if (REAL) {
    const SK = require("../src/sky"), A2 = (src, seed = "S") => p.core.analyse(src, { seed });
    const ids = SK.SKY_BLOCKS.map((b) => b.id), clean = A2("single_sun\nasteroid_belt");
    ok(!clean.resolved.lines.some((l) => l.unknown), "ciel étendu : asteroid_belt est reconnu (pas un symbole inconnu)");
    ok(ids.every((id) => !A2("single_sun\n" + id).resolved.lines.some((l) => l.unknown)), "ciel étendu : les " + ids.length + " blocs sont reconnus");
    ok(A2("single_sun\nasteroid_belt").stability < A2("single_sun").stability, "ciel étendu : une ceinture coûte de la stabilité");
    const sev = (src) => (A2(src).resolved.triggered || []).map((t) => t.severity).join();
    ok(/light/.test(sev("single_sun\nasteroid_belt\ntablet")), "ciel étendu : ceinture + ruines = tension légère (" + sev("single_sun\nasteroid_belt\ntablet") + ")");
    ok(/medium/.test(sev("single_sun\nasteroid_field\nlamp")), "ciel étendu : champ + lampe = tension moyenne");
    ok(/strong/.test(sev("single_sun\nasteroid_field\nbridge")), "ciel étendu : champ + pont = tension forte");
    ok(/light/.test(sev("single_sun\nasteroid_belt\ngreat_tree")) && /medium/.test(sev("single_sun\nasteroid_field\ngreat_tree")), "ciel étendu : la vie sous les pierres");
    ok(A2("single_sun\nasteroid_belt\ntablet").stability > A2("single_sun\nasteroid_field\nbridge\ntablet").stability, "ciel étendu : plus gros, plus instable");
    ok(/strong/.test(sev("green_sun\nstarless")), "ciel étendu : soleil vert sans soleil = contradiction forte");
    ok(/medium/.test(sev("green_sun\nred_sun")) && !/medium|strong/.test(sev("twin_suns\ngreen_sun\nred_sun")), "ciel étendu : deux couleurs, un seul soleil = tension ; deux soleils = accord");
    ok(sev("single_sun\ngreen_sun") === "", "ciel étendu : un soleil vert seul est paisible");
    ok(A2("green_sun").resolved.lines.some((l) => l.autoFilled && l.entry && l.entry.id === "single_sun"), "ciel étendu : le soleil coloré est un modificateur, le soleil reste implicite");
    const txt = p.core.prose(A2("single_sun\nasteroid_belt").resolved); ok(SK.SKY_PROSE.asteroid_belt.some((x) => txt.toLowerCase().includes(x.toLowerCase())), "ciel étendu : phrase de description de la ceinture");
    const said = (id, src) => { const t = p.core.prose(A2(src).resolved).toLowerCase(); return SK.SKY_PROSE[id].some((x) => t.includes(x.toLowerCase())); }; // la prose est tirée au sort : un seul texte par essai
    ok(said("green_sun", "green_sun"), "ciel étendu : phrase du soleil vert");
    // jamais tirés : 300 livres vagues
    let leak = 0; for (let i = 0; i < 300; i++) { const a = A2("water\nseed", "w" + i); const all = [...a.resolved.lines.map((l) => l.entry && l.entry.id), ...a.resolved.drawn.map((d) => d.id)]; if (all.some((id) => ids.includes(id))) leak++; }
    ok(leak === 0, "ciel étendu : jamais tiré au sort (" + leak + "/300)");
    let g = null; try { g = p.core.glyphs(A2("single_sun\nasteroid_belt\ngreen_sun\nplanet_rings\ncomet")); } catch (e) { g = e; }
    ok(Array.isArray(g) && g.some((x) => x.id === "asteroid_belt"), "ciel étendu : glyphes des nouveaux blocs" + (g instanceof Error ? " : " + g.message : ""));
    // mondes-types
    const WS = SK.WORLD_IDS;
    ok(WS.every((id) => !A2("single_sun\n" + id).resolved.lines.some((l) => l.unknown)), "mondes-types : tous sont reconnus");
    ok(WS.every((id) => A2("single_sun\n" + id).stability < A2("single_sun").stability), "mondes-types : chacun pèse sur la stabilité");
    ok(/strong/.test(sev("single_sun\nfrozen_world\nlava")) && /strong/.test(sev("single_sun\nlava_world\ndeep_cold\nwater")), "mondes-types : glace × lave, lave × froid = tension forte");
    ok(/medium/.test(sev("single_sun\ndesert_world\nwater")) && /medium/.test(sev("single_sun\nocean_world\nsand")), "mondes-types : désert × eau, océan × sable = tension moyenne");
    ok(/strong/.test(sev("single_sun\nfrozen_world\nlava_world")), "mondes-types : deux mondes = contradiction forte");
    ok(sev("single_sun\nfrozen_world\nstone") === "" && sev("single_sun\nocean_world\nwater") === "", "mondes-types : un monde cohérent est paisible");
    ok(WS.every((id) => said(id, "single_sun\n" + id)), "mondes-types : phrase de description");
    let wleak = 0; for (let i = 0; i < 300; i++) { const a = A2("water\nseed", "w" + i); if ([...a.resolved.lines.map((l) => l.entry && l.entry.id), ...a.resolved.drawn.map((d) => d.id)].some((id) => WS.includes(id))) wleak++; }
    ok(wleak === 0, "mondes-types : jamais tirés au sort (" + wleak + "/300)");
    // richesses et cicatrices, quantités
    const WTH = require("../src/wealth"), geoOf = (src) => A2("single_sun\nstone\n" + src).axisStability.geological;
    ok([...WTH.RICH_IDS, ...WTH.SCAR_IDS].every((id) => !A2("single_sun\n" + id).resolved.lines.some((l) => l.unknown) && A2("single_sun\n" + id).resolved.matter.written.includes(id)), "richesses : les douze blocs sont écrits et reconnus");
    ok(geoOf("gold") < geoOf("") && geoOf("gold\nsilver") < geoOf("gold"), "richesses : l'or et l'argent coûtent de la stabilité");
    ok(geoOf("gold\nscorched_surface") > geoOf("gold") && geoOf("gold\nscorched_surface\npoisoned_air") > geoOf("gold\nscorched_surface"), "cicatrices : chacune compense en partie");
    ok(geoOf("gold\nscorched_surface\npoisoned_air\nbarren_soil\nbitter_water\nashen_sky") < geoOf(""), "compensation partielle : jamais gratuite");
    ok(geoOf("scorched_surface\npoisoned_air") === geoOf(""), "cicatrices seules : aucun effet");
    ok(geoOf("gold\nmany: gold") < geoOf("gold") && geoOf("gold\nfew: gold") > geoOf("gold") && geoOf("gold\nnormal: gold") === geoOf("gold"), "quantité d'or : beaucoup coûte plus, peu coûte moins");
    ok(["many: ruins", "few: trees", "beaucoup: ruines et eau", "normal: rain"].every((l) => A2("single_sun\n" + l).resolved.lines.every((x) => !x.unknown)), "lignes de quantité : pas des symboles inconnus");
    const met = (l) => A2("single_sun\ndoor\ntablet" + l).axisStability.metaphysical;
    ok(met("\nmany: ruins") < met("") && met("\nfew: ruins") > met(""), "beaucoup de ruines pèse, peu de ruines allège");
    ok(/gold/.test(JSON.stringify(A2("single_sun\ngold").resolved.matter.written)) && p.core.prose(A2("single_sun\ngold").resolved).toLowerCase().includes("veins of gold"), "or : phrase de description");
    let rleak = 0; for (let i = 0; i < 300; i++) { const a = A2("water\nseed", "w" + i); if ((a.resolved.matter.written || []).some((id) => [...WTH.RICH_IDS, ...WTH.SCAR_IDS].includes(id)) || a.resolved.drawn.some((d) => [...WTH.RICH_IDS, ...WTH.SCAR_IDS].includes(d.id))) rleak++; }
    ok(rleak === 0, "richesses et cicatrices : jamais tirées au sort (" + rleak + "/300)");
    let gl = null; try { gl = p.core.glyphs(A2("single_sun\ngold\nscorched_surface")); } catch (e) { gl = e; }
    ok(Array.isArray(gl), "richesses : glyphes" + (gl instanceof Error ? " : " + gl.message : ""));
    ok(!/^\s*(day_length|year_length)/.test("") && p.core.analyse("single_sun\nday_length: 40\nyear_length: 12", { seed: "T" }).resolved.lines.every((l) => !l.unknown), "ciel étendu : day_length / year_length ne sont pas des symboles inconnus");
    ok(p.core.analyse("single_sun\nmoons: 3\nlunes: 2", { seed: "T" }).resolved.lines.every((l) => !l.unknown), "moons: / lunes: ne sont pas des symboles inconnus");
    // météo vivante (plugin réel) : la ligne programmée est de la pluie pour le moteur, le programme suit l'analyse jusqu'à la fenêtre
    const wxA = p.core.analyse("single_sun\nrain: sometimes, dawn\ndrizzle: often, dawn\nflowers\nfog", { seed: "Jardin" }), wxB = p.core.analyse("single_sun\nrain\ndrizzle\nflowers\nfog", { seed: "Jardin" });
    ok(wxA.resolved.lines.every((l) => !l.unknown) && wxA.resolved.matter.written.includes("rain") && wxA.resolved.matter.written.includes("drizzle"), "météo vivante : `rain: sometimes, dawn` n'est pas un symbole inconnu");
    ok(wxA.stability === wxB.stability && wxA.weather && wxA.weather.rain[0].slots[0] === "dawn" && !wxB.weather, "météo vivante : même stabilité qu'en lignes nues, programme joint à l'analyse");
    ok(wxA.resolved.matter.reactions.some((r) => r.result === "scented_mist"), "météo vivante : brume + fleurs = brume parfumée");
    ok(/at dawn, (more often than not|some days)/i.test(p.core.prose(wxA.resolved, { seed: "Jardin" })) && !/at dawn/i.test(p.core.prose(wxB.resolved, { seed: "Jardin" })), "météo vivante : la description dit le moment (et seulement si la ligne le dit)");
    const wxS = require("../src/genscene").sceneOf(wxA, "Jardin", p.core.blocks); ok(wxS && wxS.weather === wxA.weather && wxS.drizzle && wxS.scent, "météo vivante : la fenêtre générative reçoit le programme");
  }

  // panneau d'un Âge
  const el = document.createElement("div"); document.body.appendChild(el);
  const src = "water\nsingle_sun\ndnie_mechanism: steam_powered_elevator\nseed: 4242";
  p.renderAgePanel(src, el, "Ages/Alpha.md");
  ok(true, "renderAgePanel sans exception");
  // la doublure de base ne crée pas de .age-panel : on le simule pour tester l'ajout
  const host = document.createElement("div"); host.innerHTML = '<div class="age-panel"></div>'; document.body.appendChild(host);
  p.renderAgePanel(src, host, "Ages/Alpha.md");
  ok(!!host.querySelector(".age-ext__plate svg"), "plaque de chiffres affichée");
  ok(!!host.querySelector(".age-ext__mech"), "mécanisme écrit affiché");
  ok(!!host.querySelector(".age-ext__sound"), "bouton son présent");
  ok(!!host.querySelector(".age-det--stab .age-det__bar") && !!host.querySelector(".age-det--phys .age-det__sheet dd"), "Détails : stabilité par axe et fiche physique");

  // télescope, étape 2 : les notes de l'arpenteur disent le Great Zero vu de l'Âge ; situé + synchronisé : l'heure là-bas, KIPS
  {
    const SS = require("../src/starsystem"), CAL = require("../src/calibration"), TEL = require("../src/telescope");
    const sSrc = "water\nsingle_sun\nsystem: Kerath\nseed: 4242", mk = () => { const h = document.createElement("div"); h.innerHTML = '<div class="age-panel"></div>'; document.body.appendChild(h); p.renderAgePanel(sSrc, h, "Ages/Alpha.md"); return h; };
    ok(p.core.analyse(sSrc, { seed: "Alpha" }).resolved.lines.every((l) => !l.unknown), "`system: Kerath` n'est pas une tache d'encre");
    const was = p.ext.imagerNotes, wasTel = p.ext.telescope, wasTun = p.ext.imagerTunings;
    p.ext.imagerNotes = "words"; let h = mk(); const star = h.querySelector(".age-det__star");
    ok(star && /Great Zero shows to the/.test(star.textContent) && !star.querySelector(".age-det__skynums svg") && !/\d/.test(star.querySelector(".age-det__skyline").textContent), "Détails, mots seulement : le Great Zero vu de l'Âge, sans chiffre");
    ok(!star.querySelector(".age-det__time") && /uncharted/.test(h.querySelector(".age-ext__plate").textContent), "pas de Zéro trouvé : ni état, ni heure ; plaque « uncharted » (plus de coordonnées tirées du nom)");
    p.ext.imagerNotes = "full"; h = mk(); ok(h.querySelectorAll(".age-det__star .age-det__skynums .age-det__skynum").length === 3, "Détails, notes complètes : Torahn, élévation, retard en chiffres D'ni");
    p.ext.imagerNotes = "off"; h = mk(); ok(!h.querySelector(".age-det__star .age-det__skyline"), "notes aucune : rien du Great Zero");
    p.ext.imagerNotes = "words";
    const a = p.core.analyse(sSrc, { seed: "Alpha" }), sys = SS.systemOf(a, sSrc, "Alpha"), zero = TEL.greatZero("Relto", 1), now = Date.now();
    p.ext.telescope = { "relto#1": { torahn: 0, elev: 0, found: true } }; h = mk();
    ok(/not charted yet/.test(h.querySelector(".age-det__star").textContent), "Zéro trouvé, étoile non située : le lutrin de l'observatoire est suggéré");
    p.ext.telescope = { "relto#1": { torahn: 0, elev: 0, found: true, systems: { [sys.key]: SS.record(sys, zero, { torahn: sys.clue.torahn, elev: sys.clue.elevation, delay: sys.clue.delay }, now) } } }; h = mk();
    ok(/is charted from your Relto/.test(h.querySelector(".age-det__star").textContent) && /uncertain: sync the Imager/.test(h.querySelector(".age-det__time").textContent), "étoile située, pas synchronisé : l'heure là-bas reste incertaine");
    const o = CAL.orbitOf(a, "Alpha", require("../src/sky").parseSky(sSrc));
    p.ext.imagerTunings = { "Ages/Alpha.md": { sync: CAL.orbitAt(o, now), syncAt: now, sysKey: sys.key } }; h = mk();
    ok(/^Over there, it is /.test(h.querySelector(".age-det__time").textContent) && h.querySelector(".age-det__time.is-certain .age-det__timenum svg") && /KIPS/.test(h.querySelector(".age-ext__plate").textContent), "synchronisé : « Over there, it is … » en chiffres D'ni, et les coordonnées KIPS");
    p.ext.imagerTunings = { "Ages/Alpha.md": { sync: 3, syncAt: now - 12 * 86400000, sysKey: sys.key } }; h = mk();
    ok(/should be/.test(h.querySelector(".age-det__time").textContent) && h.querySelector(".age-det__time.is-drift"), "douze jours plus tard : l'heure devient incertaine (dérive)");
    p.ext.imagerTunings = { "Ages/Alpha.md": { sync: 3, syncAt: now, sysKey: "autre@etoile" } }; h = mk();
    ok(/signal has changed/.test(h.querySelector(".age-det__star").textContent) && /uncertain/.test(h.querySelector(".age-det__time").textContent), "étoile réécrite depuis la synchro : « le signal a changé »");
    p.ext.imagerNotes = was; p.ext.telescope = wasTel; p.ext.imagerTunings = wasTun;
  }

  // couche physique (1.16) : facile n'altère rien, strict coûte, lignes de valeurs ignorées par le moteur, pistes écrites dans le bloc
  {
    const lava = "lava\nash\nmass: 0.2\nage: 9";
    const was = p.ext.physics; p.ext.physics = "off"; const off = p.core.analyse(lava, { seed: "Braise" });
    p.ext.physics = "easy"; const easy = p.core.analyse(lava, { seed: "Braise" });
    ok(!off.resolved.lines.some((l) => l.unknown), "mass: / age: ne sont pas des symboles inconnus");
    ok(p.core.analyse("single_sun\nwater\nwater: everywhere, to the horizon", { seed: "Mer" }).resolved.lines.filter((l) => l.unknown).length === 1, "une ligne « water: » sans valeur lisible reste une ligne inconnue (comme avant)");
    ok(easy.stability === off.stability && JSON.stringify(easy.axisStability) === JSON.stringify(off.axisStability) && easy.physics && !off.physics, "mode facile : stabilité inchangée, fiche jointe");
    ok(easy.physics.tensions.some((t) => t.id === "volcanism"), "mode facile : la tension est expliquée");
    p.ext.physics = "strict"; p.ext.physicsSeverity = 1; const strict = p.core.analyse(lava, { seed: "Braise" });
    ok(strict.axisStability.geological === off.axisStability.geological - 20, "mode strict : −20 sur l'axe géologique");
    p.ext.physicsSeverity = 2; ok(p.core.analyse(lava, { seed: "Braise" }).axisStability.geological === off.axisStability.geological - 40, "sévérité 2 : −40");
    p.ext.physicsSeverity = 1; p.ext.physics = was;
    { // 300 Âges au hasard : en facile, rien ne bouge par rapport à « désactivée » (seules la fiche et la saison du jour s'ajoutent)
      const SY = ["single_sun", "twin_suns", "starless", "water", "lava", "rain", "fern", "great_tree", "grazer", "desert_world", "frozen_world", "auroras", "tablet", "sand", "wind", "deep_cold", "asteroid_field", "gold"];
      let x = 9, diff = 0; const r = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 300; i++) {
        const src = Array.from({ length: 1 + Math.floor(r() * 6) }, () => SY[Math.floor(r() * SY.length)]).join("\n");
        p.ext.physics = "off"; const a = p.core.analyse(src, { seed: "R" + i }); p.ext.physics = "easy"; const b = p.core.analyse(src, { seed: "R" + i });
        const { physics, season, seasonU, ...rest } = b; void season; void seasonU; if (rest.harvest) rest.harvest = { ...rest.harvest, season: false, counts: null }; const a0 = a.harvest ? { ...a, harvest: { ...a.harvest, counts: null } } : a; /* la saison ajoute une mesure à ce qu'elle favorise : seulement avec la physique */ /* la saison du jour vient avec la physique (src/seasons.js) : sans elle, pas de saison, et la récolte n'en est pas favorisée */
        if (!physics || JSON.stringify(rest) !== JSON.stringify(a0)) diff++;
      }
      ok(diff === 0, `mode facile : 300 Âges identiques au mode désactivé (${diff} différence(s))`);
    }
    p.ext.physics = was;
    files.set("Ages/Braise.md", new TFile("Ages/Braise.md", "# Braise\n```age\n" + lava + "\n```\nfin\n"));
    const prevProc = app.vault.process; app.vault.process = async (f, fn) => { f.content = fn(f.content); return f.content; };
    await p.writePhysicsLine("Ages/Braise.md", lava, "age", 3.5);
    ok(/```age\nlava\nash\nmass: 0.2\nage: 3.5\n```\nfin/.test(files.get("Ages/Braise.md").content), "piste cliquée : la ligne age: est remplacée dans le bloc");
    await p.writePhysicsLine("Ages/Braise.md", "autre bloc", "age", 1);
    ok(notices.some((n) => /changé|changed/.test(n)), "bloc introuvable : rien d'écrit, une notice le dit");
    if (process.env.DUMP) for (const [mode, sv] of [["easy", "lava\nash\nwater\nfern\nmass: 0.2\nage: 9"], ["strict", "black_sun\nwater\nfern\nlight_world\nauroras\nrifts"]]) {
      p.ext.physics = mode; const h2 = document.createElement("div"); h2.innerHTML = '<div class="age-panel"></div>'; document.body.appendChild(h2);
      p.renderAgePanel(sv, h2, "Ages/Braise.md"); const pn = h2.querySelector(".age-panel"); if (pn) pn.dataset.tab = "details";
      fs.writeFileSync(process.env.DUMP + "-details-" + mode + ".html", h2.outerHTML); p.ext.physics = was;
    }
    app.vault.process = prevProc;
  }

  // fenêtre génératrice : `window_style: generative` ajoute un canvas de paysage (un de plus que le rendu classique), jamais d'erreur
  {
    const an = p.core.analyse(src, { seed: "Alpha" }), count = (style, dmg) => {
      const parent = document.createElement("div"), win = parent.appendChild(document.createElement("div")); win.className = "age-panel__window"; const cv = win.appendChild(document.createElement("canvas")); cv.width = 240; cv.height = 144;
      let n = 0; const orig = document.createElement.bind(document); document.createElement = (t, ...a) => { if (t === "canvas") n++; return orig(t, ...a); };
      p.fxCtx = { mode: "classic", style, seed: "Ages/Alpha.md", analysis: dmg ? { ...an, damage: dmg } : an };
      try { p.applyFx(parent, an, "Ages/Alpha.md"); } finally { p.fxCtx = null; document.createElement = orig; }
      return { n, linkfx: !!win.querySelector(".age-linkfx"), hidden: cv.style.opacity === "0" };
    };
    const c = count("classic"), g = count("gen"), gd = count("gen", { damaged: 3, removed: 1 });
    ok(c.linkfx && c.hidden, "fenêtre classique : superposition posée");
    ok(g.linkfx && g.hidden && g.n === c.n + 1, "fenêtre génératrice : un canvas de paysage en plus (" + g.n + " vs " + c.n + ")");
    ok(gd.linkfx, "fenêtre génératrice + pages abîmées/arrachées sans erreur");
    // taille de la fenêtre dans le bloc age : classes sur le conteneur, résolution du rendu génératif
    const tabsWas = p.ext.panelTabs; p.ext.panelTabs = false; // sans onglets : la résolution suit le réglage de taille
    const sized = (size, key = "Ages/Alpha.md") => {
      const parent = document.createElement("div"), win = parent.appendChild(document.createElement("div")); win.className = "age-panel__window"; const cv = win.appendChild(document.createElement("canvas")); cv.width = 240; cv.height = 144;
      const old = p.ext.windowSize; p.ext.windowSize = size; p.fxCtx = { mode: "classic", style: "gen", seed: "Ages/Alpha.md", analysis: an };
      try { p.applyFx(parent, an, key); } finally { p.fxCtx = null; p.ext.windowSize = old; }
      return { cls: [...parent.classList], w: Math.max(0, ...[...win.querySelectorAll("canvas")].map((c) => c.width)) };
    };
    ok(sized("normal").cls.length === 0 && sized("large").cls.includes("age-ext-vis-large") && sized("xl").cls.includes("age-ext-vis-xl"), "taille de la fenêtre : classes du conteneur");
    ok(sized("large").w === 440 && sized("xl").w === 560 && sized("normal").w === 320, "taille de la fenêtre : résolution du rendu génératif (" + sized("large").w + ")");
    const blk = (line) => { const parent = document.createElement("div"), win = parent.appendChild(document.createElement("div")); win.className = "age-panel__window"; win.appendChild(document.createElement("canvas")).width = 240;
      p.ext.windowSize = "normal"; p.fxCtx = { mode: "classic", style: "gen", seed: "Ages/Alpha.md", sky: require("../src/sky").parseSky(line), analysis: an };
      try { p.applyFx(parent, an, "Ages/Alpha.md"); } finally { p.fxCtx = null; p.ext.windowSize = "large"; } return { parent, w: Math.max(0, ...[...win.querySelectorAll("canvas")].map((c) => c.width)) }; };
    ok(blk("window_size: xl").parent.classList.contains("age-ext-vis-xl") && blk("window_size: xl").w === 560, "ligne window_size : prioritaire sur le réglage");
    const bw = blk("window_width: 600"); ok(bw.parent.classList.contains("age-ext-vis-custom") && bw.parent.style.getPropertyValue("--age-win-w") === "600px" && bw.w === 600, "ligne window_width : largeur en pixels");
    p.ext.panelTabs = true; ok(sized("normal").w >= 560, "avec onglets : rendu génératif assez net pour la grande vitre (" + sized("normal").w + ")"); p.ext.panelTabs = tabsWas;
    if (REAL) ok(["window_size: large", "window_width: 520"].every((l) => p.core.analyse("water\n" + l, { seed: "Z" }).resolved.lines.every((x) => !x.unknown)), "les lignes de taille ne sont pas des symboles inconnus");
    ok(sized("xl", "window").cls.length === 0, "taille de la fenêtre : les livres et le Relto gardent la leur");
    p.ext.windowStyle = "gen"; const gs = count(undefined); ok(gs.n === c.n + 1, "réglage général « génératif » pris en compte"); p.ext.windowStyle = "classic";
    ok(!/generative|window_style/.test(JSON.stringify(p.core.analyse("water\nwindow_style: generative", { seed: "Z" }).resolved.lines.filter((l) => l.unknown))), "la ligne window_style n'est pas un symbole inconnu");
  }

  // loi du changement : l'encre sèche puis on modifie
  const f = files.get("Ages/Alpha.md");
  p.ext.law = true; await p.observeFile(f);
  const t0 = Date.now(); p.law.now = () => t0 + 40 * 60000;
  f.content = A("water\nlava\nsingle_sun\nseed: 4242"); f.stat.mtime = t0 + 40 * 60000;
  await p.observeFile(f);
  ok(notices.some((n) => n.includes("The geometry of the Age has been altered")), "avertissement de la loi du Changement (en)");
  ok(p.law.effective("Alpha") > 0, "instabilité supplémentaire enregistrée");
  const after = p.core.analyse("single_sun", { seed: "Alpha" }); p.ext.law = false; const plain = p.core.analyse("single_sun", { seed: "Alpha" }); p.ext.law = true;
  ok(plain.axisStability.alteration === undefined && after.axisStability.alteration < 100, "axe « alteration » ajouté seulement à l'Âge altéré");
  ok(after.stability < plain.stability, "la stabilité de l'Âge altéré baisse via le hook adjust");
  p.ext.lang = "fr"; notices.length = 0; p.law.now = () => t0 + 90 * 60000;
  f.content = A("water\nsand\nsingle_sun"); await p.observeFile(f);
  ok(notices.some((n) => n.includes("La géométrie de l'Âge a été altérée")), "avertissement en français");

  // loi 4, Observation : une maladie du vivant en strict, vue au signe, puis à la cause une semaine plus tard ; la stabilité ne bouge pas
  { const rgWas = p.ext.rigor, tObs = Date.now(), sick = "single_sun\nsteady_cycle\nwater\ngrass\ngrazer\ncarrion_beetle";
    p.ext.rigor = "strict"; p.law.now = () => tObs;
    const s1 = p.core.analyse(sick, { seed: "xe" }), b1 = (s1.scars || []).find((x) => x.id === "blight");
    ok(b1 && b1.stage === "sign" && !/grass/.test(b1.prose), "Observation : la maladie se dit d'abord par un signe");
    ok(p.ext.state.law.faults && p.ext.state.law.faults.xe, "Observation : la date de la faute est gardée, par graine");
    p.law.now = () => tObs + 8 * 86400000;
    const s2 = p.core.analyse(sick, { seed: "xe" }), b2 = (s2.scars || []).find((x) => x.id === "blight");
    ok(b2 && b2.stage === "cause" && /grass/.test(b2.prose) && s2.stability === s1.stability, "Observation : huit jours après, la cause est nommée, au même prix");
    ok(!(p.core.analyse(sick, { seed: "xe", probe: true }).scars || []).some((x) => x.stage), "un essai de retrait ne touche pas à l'Observation");
    p.ext.rigor = rgWas; delete p.ext.state.law.faults.xe; p.law.now = () => t0 + 90 * 60000; }

  // solitude : les poids changent
  p.ext.solitude = "strong";
  const draw = (lvl) => { p.ext.solitude = lvl; let n = 0; for (let i = 0; i < 60; i++) n += p.core.analyse("water", { seed: "S" + i }).resolved.lines.filter((l) => l.entry && l.entry.id === "tablet").length; return n; };
  ok(typeof draw("off") === "number", "tirage avec solitude sans exception");

  // Relto (aucune note) → bouton de création ; puis avec une note
  const r1 = document.createElement("div"); await p.procs.relto("", r1, { sourcePath: "x.md", addChild() {} });
  ok(!!r1.querySelector(".age-relto__empty"), "bloc relto sans note : message + bouton");
  files.set("Ages/Relto.md", new TFile("Ages/Relto.md", "---\nage_type: personal_hub\n---\n"));
  p.app.metadataCache.getFileCache = (ff) => (ff.path === "Ages/Relto.md" ? { frontmatter: { age_type: "personal_hub", age_name: "Relto", seed: 1999, environment: { base_terrain: "volcanic_plateau", surrounding: "cloud_sea", sky_cycle: "system_time" }, structures: ["hut"], relto_pages_active: [] } } : null);
  const r2 = document.createElement("div"); await p.procs.relto("", r2, { sourcePath: "x.md", addChild() {} });
  ok(!!r2.querySelector(".age-relto__canvas"), "bloc relto avec note : canvas rendu");

  // pages repliables + inscription + texte D'ni inline
  ok(!!r2.querySelector(".age-relto__dnitime svg"), "Relto : date D'ni affichée (année, mois, jour)");
  ok(!!r2.querySelector(".age-relto__dnitime-silent"), "Relto : avant le Great Zero, l'heure D'ni se tait (la date reste)");
  { // l'horloge D'ni : attachée, elle reste muette sans le Zéro ; avec le Zéro, l'heure s'affiche et la date se recale
    const gfc = p.app.metadataCache.getFileCache, withClock = (ff) => { const c = gfc(ff); return c && c.frontmatter && c.frontmatter.age_type === "personal_hub" ? { frontmatter: { ...c.frontmatter, relto_pages_active: ["page_dni_clock"] } } : c; };
    p.app.metadataCache.getFileCache = withClock;
    const rl = document.createElement("div"); await p.procs.relto("", rl, { sourcePath: "x.md", addChild() {} });
    ok(!!rl.querySelector(".age-relto__dnitime-silent"), "Relto : horloge attachée mais Zéro introuvé : verrouillée, l'heure se tait");
    const tel0 = p.ext.telescope; p.ext.telescope = new Proxy({}, { get: () => ({ found: true }) });
    const rz = document.createElement("div"); await p.procs.relto("", rz, { sourcePath: "x.md", addChild() {} }); p.ext.telescope = tel0; p.app.metadataCache.getFileCache = gfc;
    ok(!rz.querySelector(".age-relto__dnitime-silent") && rz.querySelectorAll(".age-relto__dnitime b svg").length >= 4, "Relto : Zéro trouvé et horloge D'ni attachée, l'heure s'affiche"); }
  { const roff = document.createElement("div"); await p.procs.relto("dni_time: off", roff, { sourcePath: "x.md", addChild() {} }); ok(!roff.querySelector(".age-relto__dnitime"), "Relto : dni_time: off masque l'heure D'ni");
    p.ext.dniClock = false; const rset = document.createElement("div"); await p.procs.relto("", rset, { sourcePath: "x.md", addChild() {} }); p.ext.dniClock = true; ok(!rset.querySelector(".age-relto__dnitime"), "Relto : réglage désactivé = pas d'heure D'ni"); }
  p.ext.reltoTabs = false; // panneau d'origine (repliables)
  const r3 = document.createElement("div"); await p.procs.relto("pages: hide\ninscription: Alucard", r3, { sourcePath: "x.md", addChild() {} });
  if (process.env.DBG) console.log(r3.innerHTML.slice(-600));
  ok(r3.querySelector(".age-relto__pagesbody.is-hidden") && /▸/.test(r3.querySelector(".age-relto__toggle").textContent), "pages masquées par l'option pages: hide");
  r3.querySelector(".age-relto__toggle").click(); ok(!r3.querySelector(".age-relto__pagesbody").classList.contains("is-hidden"), "clic : la liste se déplie");
  ok(!!r3.querySelector(".age-relto__inscription"), "inscription affichée (repli latin sans police)");
  const r4 = document.createElement("div"); await p.procs.relto("", r4, { sourcePath: "x.md", addChild() {} }); r4.querySelector(".age-relto__toggle").click();
  const r5 = document.createElement("div"); await p.procs.relto("", r5, { sourcePath: "x.md", addChild() {} });
  ok(r5.querySelector(".age-relto__pagesbody").classList.contains("is-hidden"), "l'état replié est mémorisé");
  ok(!!r5.querySelector(".age-relto__books") && /Books|Livres/.test(r5.querySelector(".age-relto__books .age-relto__toggle").textContent), "section Livres présente");
  const r6 = document.createElement("div"); await p.procs.relto("folders: Nulle part", r6, { sourcePath: "x.md", addChild() {} });
  ok(/· 0\/0/.test(r6.querySelector(".age-relto__books .age-relto__toggle").textContent), "folders: filtre les livres");
  p.ext.reltoTabs = true;
  // ---- mode histoire : un Relto à part, avec son dossier, ses Âges et ses pages-récompenses
  { const gfcS = p.app.metadataCache.getFileCache, cmd = p.cmds.find((c) => c.id === "start-story");
    const fmOfNote = (src) => { const m = {}; for (const l of src.split("---")[1].trim().split("\n")) { const i = l.indexOf(":"); try { m[l.slice(0, i)] = JSON.parse(l.slice(i + 1)); } catch (e) { /* ligne non JSON */ } } return m; };
    ok(!!cmd, "mode histoire : commande « Start the story » enregistrée");
    const before = [...files.keys()]; await cmd.callback();
    const made = [...files.keys()].filter((k) => !before.includes(k));
    ok(made.length === 1 && /^[^/]+\/[^/]+\.md$/.test(made[0]), "mode histoire : la commande crée un Relto dans son propre dossier (" + made[0] + ")");
    const sf = files.get(made[0]), sfm = fmOfNote(sf.content), dir = made[0].replace(/\/[^/]+$/, "");
    ok(sfm.relto_mode === "story" && sfm.age_type === "personal_hub" && Number(sfm.seed) > 0, "mode histoire : marqueur relto_mode, refuge, graine propre");
    ok(new RegExp("^Relto Story Mode \\d{4}-\\d{2}-\\d{2} " + sfm.seed + "$").test(dir) && sf.basename === "Relto Story Mode " + sfm.seed, "mode histoire : dossier et note nommés d'après la date et la graine (aucune collision possible)");
    p.app.metadataCache.getFileCache = (ff) => (ff.path === sf.path ? { frontmatter: sfm } : gfcS(ff));
    const age = (name, lns, where) => { const path = (where ? where + "/" : "") + name + ".md", f = new TFile(path, "```age\n" + lns.join("\n") + "\n```\n"); files.set(path, f); return f; };
    const inside = age("Premier", ["single_sun", "steady_cycle", "water", "lava"], dir), outside = age("Dehors", ["single_sun", "steady_cycle", "water", "sand"], "");
    p.index.invalidate();
    const show = async (src) => { const el = document.createElement("div"); await p.procs.relto("", el, { sourcePath: src, addChild() {} }); return el; };
    const row = (e, label) => [...e.querySelectorAll(".age-relto__page")].find((r) => r.textContent.includes(label));
    const shelf = (e) => [...e.querySelectorAll(".age-relto__pillname")].map((x) => x.textContent);
    let el = await show(sf.path);
    ok(row(el, "Chimney fire") && /is-locked/.test(row(el, "Chimney fire").className), "mode histoire : la page du premier chapitre est verrouillée au départ");
    { p.reltoViewFile = null; p.app.workspace.getActiveFile = () => sf; const rv = p.views["age-writer-relto"]({ app: p.app }); await rv.onOpen();
      const names = [...rv.contentEl.querySelectorAll(".age-relto__pillname")].map((x) => x.textContent).join();
      ok(names === "Premier", "mode histoire : la grande vue ouverte depuis la note de l'histoire montre le Relto de l'histoire (" + names + ")");
      p.app.workspace.getActiveFile = () => null; p.reltoViewFile = null; }
    ok(row(el, "Inkwell") && /is-locked/.test(row(el, "Inkwell").className), "mode histoire : la page finale est verrouillée au départ");
    ok(shelf(el).join() === "Premier", "mode histoire : l'étagère ne montre que les Âges du dossier de l'histoire");
    inside.content = "```age\nsingle_sun\nsteady_cycle\nwater\nsand\nfern\n```\n"; inside.stat.mtime++; p.index.invalidate(); notices.length = 0;
    el = await show(sf.path);
    ok(notices.some((n) => /Chapter complete|Chapitre réussi/.test(n)), "mode histoire : un monde stable avec ciel, eau et vivant réussit le chapitre (notice)");
    ok(row(el, "Chimney fire") && /is-available/.test(row(el, "Chimney fire").className), "mode histoire : la page du chapitre devient disponible");
    ok(Object.values(p.ext.story || {}).some((s) => s.done.includes("rest")), "mode histoire : l'avancement est gardé par Relto");
    { const nx = p.cmds.find((c) => c.id === "story-next"); ok(!!nx, "mode histoire : commande « Story: next chapter » enregistrée");
      const b0 = [...files.keys()]; notices.length = 0; await nx.callback();
      const c2 = [...files.keys()].filter((k) => !b0.includes(k));
      ok(c2.length === 1 && c2[0].startsWith(dir + "/") && /Corriger sans casser|Mending without breaking/.test(files.get(c2[0]).content) && files.get(c2[0]).content.includes("lava"), "chapitre suivant : la note du chapitre 2 est créée dans le dossier de l'histoire (" + c2[0] + ")");
      ok(Object.values(p.ext.story).some((s) => s.notes.mend === c2[0] && s.seen[files.get(c2[0]).basename]), "chapitre suivant : note retenue, monde vu abîmé");
      const b1 = files.size; notices.length = 0; await nx.callback(); ok(files.size === b1, "chapitre suivant : relancer rouvre la même note");
      files.get(c2[0]).content = files.get(c2[0]).content.replace("\nlava\n", "\n"); files.get(c2[0]).stat.mtime++; p.index.invalidate(); notices.length = 0;
      el = await show(sf.path);
      ok(row(el, "Lanterns") && /is-available/.test(row(el, "Lanterns").className), "chapitre 2 réussi : la page des lanternes est disponible");
      { const b2 = [...files.keys()]; notices.length = 0; await nx.callback();
        const c3 = [...files.keys()].filter((k) => !b2.includes(k));
        ok(c3.length === 1 && c3[0].startsWith(dir + "/") && /Un jour qui change|A day that changes/.test(files.get(c3[0]).content) && /\nrain\n/.test(files.get(c3[0]).content), "chapitre 3 : la note de la météo est créée, avec une pluie continue");
        ok(/\/Age \d+\.md$/.test(c3[0]), "chapitre 3 : la note s'appelle « Age N » (court, sans la graine)");
        notices.length = 0; await nx.callback(); ok(notices.some((n) => /Not yet|Pas encore/.test(n)), "chapitre rouvert : une phrase dit ce qui manque");
        { const src3 = p.core.extract(files.get(c3[0]).content), nm3 = files.get(c3[0]).basename;
          ok(JSON.stringify(p.core.analyse(src3, { seed: nm3 })) === JSON.stringify(p.core.analyse(src3, { seed: nm3, draw: false })), "histoire : aucune page tirée au hasard dans un Âge de l'histoire (avant l'Imageur)");
          const rs = p.cmds.find((c) => c.id === "story-restart"); ok(!!rs, "commande « Story: restart the current chapter » enregistrée");
          const stW = Object.values(p.ext.story).find((x) => x.notes.weather === c3[0]), b5 = [...files.keys()]; notices.length = 0; await rs.callback();
          const c3b = [...files.keys()].filter((q) => !b5.includes(q));
          ok(c3b.length === 1 && stW.notes.weather === c3b[0] && files.has(c3[0]) && /\nrain\n/.test(files.get(c3b[0]).content), "relancer le chapitre : une note neuve, l'ancienne reste");
          files.delete(c3b[0]); stW.notes.weather = c3[0]; }
        { const rp = p.cmds.find((c) => c.id === "story-repair"); ok(!!rp, "commande « Story: repair chapter notes » enregistrée"); notices.length = 0; await rp.callback(); ok(notices.some((n) => /repaired|réparées/.test(n)), "réparation : s'exécute et le dit"); }
        ok(row(el, "Inkwell") && /is-locked/.test(row(el, "Inkwell").className), "la page finale reste fermée tant qu'un chapitre manque");
        files.get(c3[0]).content = files.get(c3[0]).content.replace("\nrain\n", "\nrain: sometimes, dawn\n"); files.get(c3[0]).stat.mtime++; p.index.invalidate(); notices.length = 0;
        el = await show(sf.path);
        ok(row(el, "Fireflies") && /is-available/.test(row(el, "Fireflies").className), "chapitre 3 réussi : la page des lucioles est disponible");
        ok(row(el, "Inkwell") && /is-locked/.test(row(el, "Inkwell").className), "la page finale reste fermée tant qu'un chapitre manque (4e)");
        const b3 = [...files.keys()]; notices.length = 0; await nx.callback();
        const c4 = [...files.keys()].filter((k) => !b3.includes(k));
        ok(c4.length === 1 && /Les lois du monde|The laws of a world/.test(files.get(c4[0]).content), "chapitre 4 : la note des lois est créée");
        files.get(c4[0]).content = files.get(c4[0]).content.replace("\n```\n", "\nmass: 0.8\nage: 3.5\n```\n"); files.get(c4[0]).stat.mtime++; p.index.invalidate(); notices.length = 0;
        el = await show(sf.path);
        ok(row(el, "Aurora") && /is-available/.test(row(el, "Aurora").className), "chapitre 4 réussi : la page de l'aurore est disponible");
        ok(row(el, "Inkwell") && /is-locked/.test(row(el, "Inkwell").className), "la page finale reste fermée tant qu'un chapitre manque (5e)");
        const b4 = [...files.keys()]; notices.length = 0; await nx.callback();
        const c5 = [...files.keys()].filter((k) => !b4.includes(k)), f5 = files.get(c5[0]);
        ok(c5.length === 1 && /Modifier ce qui est écrit|Changing what is written/.test(files.get(c5[0]).content), "chapitre 5 : la note de la Loi du Changement est créée");
        p.ext.law = true; await p.observeFile(f5); const tN = Date.now(); p.law.now = () => tN + 40 * 60000; // l'encre a séché
        el = await show(sf.path); ok(row(el, "Mountains") && /is-locked/.test(row(el, "Mountains").className), "chapitre 5 : sans modification, la page reste fermée");
        f5.content = f5.content.replace("\nfern\n", "\nfern\nmoss\n"); f5.stat.mtime++; await p.observeFile(f5); p.index.invalidate();
        el = await show(sf.path);
        ok(row(el, "Mountains") && /is-available/.test(row(el, "Mountains").className), "chapitre 5 réussi : une modification après séchage, le monde tient (page des montagnes)");
        ok(row(el, "Inkwell") && /is-locked/.test(row(el, "Inkwell").className), "la page finale reste fermée tant qu'un chapitre manque (6e)");
        const b5 = [...files.keys()]; notices.length = 0; await nx.callback();
        const c6 = [...files.keys()].filter((k) => !b5.includes(k));
        ok(c6.length === 1 && /Lever les yeux|Looking up/.test(files.get(c6[0]).content) && !/```age/.test(files.get(c6[0]).content), "chapitre 6 : la note du Great Zero est créée");
        p.ext.telescope = { ...(p.ext.telescope || {}), [sf.basename.toLowerCase().trim() + "#" + sfm.seed]: { found: true } };
        el = await show(sf.path);
        ok(row(el, "Imager") && /is-available/.test(row(el, "Imager").className), "chapitre 6 réussi : le Great Zero trouvé, la page de l'Imageur est disponible");
        ok(row(el, "Inkwell") && /is-locked/.test(row(el, "Inkwell").className), "la page finale reste fermée tant qu'un chapitre manque (7e)");
        const b6 = [...files.keys()]; notices.length = 0; await nx.callback();
        const c7 = [...files.keys()].filter((k) => !b6.includes(k));
        ok(c7.length === 1 && /Écouter le ciel|Listening to the sky/.test(files.get(c7[0]).content), "chapitre 7 : la note de l'Imageur est créée");
        p.ext.imagerTunings = { ...(p.ext.imagerTunings || {}), [c4[0]]: { lock: true } };
        el = await show(sf.path);
        ok(row(el, "Comets") && /is-available/.test(row(el, "Comets").className), "chapitre 7 réussi : l'Imageur verrouillé sur un Âge, la page des comètes est disponible");
        ok(row(el, "Inkwell") && /is-locked/.test(row(el, "Inkwell").className), "la page finale reste fermée tant qu'un chapitre manque (9e)");
        const b7 = [...files.keys()]; notices.length = 0; await nx.callback();
        const c9 = [...files.keys()].filter((k) => !b7.includes(k));
        ok(c9.length === 1 && /Le monde difficile|The difficult world/.test(files.get(c9[0]).content), "chapitre 9 : la note du monde difficile est créée");
        files.get(c9[0]).content = files.get(c9[0]).content.replace(/```age\n[\s\S]*?\n```/, "```age\nsingle_sun\nsteady_cycle\nwater\nsand\nfern\ngrass\nrain: sometimes, dawn\nfog\nmass: 0.8\nage: 3.5\n```"); files.get(c9[0]).stat.mtime++; p.index.invalidate();
        el = await show(sf.path);
        ok(row(el, "Koi") && /is-available/.test(row(el, "Koi").className), "chapitre 9 réussi : le monde difficile écrit, la page du bassin est disponible");
        ok(row(el, "Inkwell") && /is-locked/.test(row(el, "Inkwell").className), "la page finale reste fermée tant qu'un chapitre manque (10e)");
        const b9 = [...files.keys()]; notices.length = 0; await nx.callback();
        const c10 = [...files.keys()].filter((k) => !b9.includes(k));
        ok(c10.length === 1 && /Un monde étrange et merveilleux|A strange and marvellous world/.test(files.get(c10[0]).content) && !/violet/.test(files.get(c10[0]).content), "chapitre 10 : la note du monde étrange est créée, sans recette");
        notices.length = 0; await p.cmds.find((c) => c.id === "story-hint").callback(); ok(notices.some((n) => /pierre étrange|strange stone/.test(n)), "chapitre 10 : l'indice facultatif parle en mots");
        files.get(c10[0]).content = files.get(c10[0]).content.replace(/```age\n[\s\S]*?\n```/, "```age\n" + require("../src/story").WORLDS.strange.ref.join("\n") + "\n```"); files.get(c10[0]).stat.mtime++; p.index.invalidate();
        el = await show(sf.path);
        ok(row(el, "Inkwell") && /is-available/.test(row(el, "Inkwell").className), "fin de l'histoire : la page finale (l'encrier) est disponible");
        notices.length = 0; await nx.callback(); ok(notices.some((n) => /ending has not yet been written|la fin n.est pas encore/.test(n)), "fin des chapitres : la commande le dit"); p.law.now = () => Date.now(); files.delete(c3[0]); files.delete(c4[0]); files.delete(c5[0]); files.delete(c6[0]); files.delete(c7[0]); files.delete(c9[0]); files.delete(c10[0]); delete p.ext.imagerTunings[c4[0]]; delete p.ext.telescope[sf.basename.toLowerCase().trim() + "#" + sfm.seed]; }
      files.delete(c2[0]); }
    const sb = await show("x.md"), sbn = shelf(sb);
    ok(sbn.includes("Dehors") && !sbn.includes("Premier"), "mode histoire : sans précision, le Relto du bac à sable, qui ne voit pas les Âges de l'histoire");
    ok(!row(sb, "Chimney fire") && !row(sb, "Lanterns"), "mode histoire : les pages-récompenses n'existent pas dans le bac à sable");
    const n0 = files.size; notices.length = 0; await cmd.callback();
    ok(files.size === n0 && notices.some((n) => /already exists|existe déjà/.test(n)), "mode histoire : relancer la commande rouvre le Relto histoire sans en créer un autre");
    { /* porter (src/carry.js ; DESIGN-art-bahro §12) : compris seulement quand la pierre de liaison est sur le bureau ; le fragment respire ; les refus se disent */
      const SKc = sf.basename.toLowerCase().trim() + "#" + sfm.seed, srcA = age("Source Ciel", ["twin_suns", "steady_cycle", "water", "fern", "rotation: 24"], dir), recv = age("Porteur", ["single_sun", "steady_cycle", "sand", "grass", "rotation: 24", "carry: sky from Source Ciel"], dir), far = age("Jamais Lu", ["single_sun", "steady_cycle", "stone"], dir);
      const an = (f) => p.core.analyse(p.core.extract(f.content), { seed: p.core.seed(f.path) });
      p.ext.story = p.ext.story || {}; p.ext.story[SKc] = { done: ["slab"], seen: {}, notes: {} }; p.index.invalidate();
      await p.index.list();
      let r = an(recv);
      ok(!r.carry && (r.resolved.lines || []).some((l) => l.unknown && /carry/.test(l.raw)), "porter : sans la pierre, la ligne est de celles que le moteur ne comprend pas");
      p.ext.story[SKc].hear = { heard: [], visit: Date.now() - 3 * 86400000 };
      p.law.observe("Source Ciel", an(srcA), srcA.stat.mtime);
      r = an(recv);
      ok(r.carry && r.carry.fragments.length === 1 && r.carry.fragments[0].from === "Source Ciel", "porter : la pierre sur le bureau, le ciel de la source est porté");
      ok((r.resolved.lines || []).some((l) => l.entry && l.entry.id === "twin_suns") && !(r.resolved.lines || []).some((l) => l.entry && l.entry.id === "single_sun"), "porter : le ciel porté remplace le ciel écrit");
      ok(r.carry.fragments[0].degree === "full" && r.axisStability.cosmological <= 95, "porter : deux jours de 24 h sonnent à l'unisson ; la couture se paie quand même");
      ok(/Carried|Porté/.test(p.carryLine(r.carry)), "porter : la ligne du panneau le dit");
      const back = an(srcA); ok(back.carry && back.carry.takenBy.includes("Porteur") && back.axisStability.cosmological < 100, "porter : la source porte une couture, plus petite");
      srcA.content = "```age\nred_sun\nsteady_cycle\nwater\nfern\n```\n"; srcA.stat.mtime++; p.carrySource(srcA, p.core.extract(srcA.content));
      r = an(recv); ok((r.resolved.lines || []).some((l) => l.entry && l.entry.id === "red_sun"), "porter : la source change, le fragment change (il respire)");
      { /* la garde (src/ward.js ; DESIGN-art-bahro §4) : le serpent sur la source ; ce qui était porté reste tel quel, rien de neuf ne sort */
        const WARD = require("../src/ward"), sSeed = p.core.seed(srcA.path), X = p.wardExt(sSeed);
        ok(X && !WARD.isWarded(X, sSeed), "garde : la réserve du Relto histoire, aucun Livre gardé");
        WARD.toggle(X, sSeed);
        srcA.content = "```age\ntwin_suns\nsteady_cycle\nwater\nfern\n```\n"; srcA.stat.mtime++; p.carrySource(srcA, p.core.extract(srcA.content));
        r = an(recv); const has = (id) => (r.resolved.lines || []).some((l) => l.entry && l.entry.id === id);
        ok(r.carry.fragments.length === 1 && r.carry.fragments[0].kept && has("red_sun") && !has("twin_suns"), "garde : la source scellée change, le fragment reste tel qu'il était (encre sèche)");
        ok(/no longer breathes|ne respire plus/.test(p.carryLine(r.carry)), "garde : le panneau dit qu'il ne respire plus");
        const fresh = age("Porteur Neuf", ["single_sun", "steady_cycle", "sand", "rotation: 24", "carry: sky from Source Ciel"], dir);
        ok(((an(fresh).carry || {}).refused || []).some((x) => x.why === "ward"), "garde : rien de neuf ne sort d'un Livre gardé");
        WARD.toggle(X, sSeed); r = an(recv);
        ok(!r.carry.fragments[0].kept && (r.resolved.lines || []).some((l) => l.entry && l.entry.id === "twin_suns"), "garde levée : le fragment respire de nouveau");
        files.delete(fresh.path); }
      { /* après le 17 (src/story-stone.js ; DESIGN-art-bahro §7) : l'accord refuse la source qui ne tient pas ; le commandement copie, sans respirer */
        const sick = age("Source Malade", ["single_sun", "frozen_cycle", "lava", "snow", "fern", "water", "acid", "rotation: 24"], dir); p.carrySource(sick, p.core.extract(sick.content)); p.law.observe("Source Malade", an(sick), sick.stat.mtime);
        const taker = age("Preneur", ["single_sun", "steady_cycle", "sand", "grass", "rotation: 24", "carry: sky from Source Malade"], dir);
        const sickSt = an(sick).stability, before = an(taker);
        ok(sickSt < 75 && before.carry.fragments.length === 1, "avant le 17 : on porte même depuis un monde qui ne tient pas (" + sickSt + ")");
        p.ext.story[SKc].stone = { ending: "accord", endedAt: Date.now() }; taker.stat.mtime++;
        const after = an(taker); ok(!after.carry.fragments.length && (after.carry.refused || []).some((x) => x.why === "sick17"), "l'accord : ils ne portent plus depuis un monde qui tombe");
        p.ext.story[SKc].stone = { ending: "command", endedAt: Date.now() }; recv.stat.mtime++;
        r = an(recv); ok(r.carry.fragments.length === 1 && r.carry.fragments[0].copied && /not breathe|ne respire pas/.test(p.carryLine(r.carry)), "le commandement : copié, pas lié");
        srcA.content = "```age\nred_sun\nsteady_cycle\nwater\nfern\n```\n"; srcA.stat.mtime++; p.carrySource(srcA, p.core.extract(srcA.content));
        r = an(recv); ok((r.resolved.lines || []).some((l) => l.entry && l.entry.id === "twin_suns") && !(r.resolved.lines || []).some((l) => l.entry && l.entry.id === "red_sun"), "le commandement : la source change, la copie ne bouge pas");
        delete p.ext.story[SKc].stone; files.delete(sick.path); files.delete(taker.path); }
      { /* l'ardoise (src/slate.js ; DESIGN-art-bahro §16) : tracée, elle part au prochain Livre ouvert ; il y pleut ce jour-là ; la récolte change dans l'accord */
        const SL = require("../src/slate"), G = require("../src/genscene"), DAY = SL.DAY, now = Date.now();
        p.ext.story[SKc].stone = { ending: "accord", endedAt: now - 2 * DAY };
        const wet = age("Cendres Mouillees", ["single_sun", "steady_cycle", "water", "ash", "grass", "rotation: 24"], dir), dry = age("Sable Sec", ["single_sun", "steady_cycle", "sand", "rotation: 24"], dir);
        const X = p.poolExt(p.poolOfAge(p.core.seed(wet.path))), rain = SL.strokesOf("rain").map((st) => st.map(([x, y]) => [300 + x * 8, 170 + y * 8]));
        ok(X && SL.arrived(p.bahroSt(p.poolOfAge(p.core.seed(wet.path))), now), "l'ardoise : arrivée au matin après le 17");
        ok(SL.trace(X, rain, now).effect === "rain", "l'ardoise : la pluie tracée, reconnue");
        const before = an(wet);  ok(!before.slateAct && (before.harvest || {}).gives.includes("ash"), "avant : pas d'acte, l'Âge donne des cendres");
        await p.slateOnOpen(dry); ok(X.slate.sent && X.slate.sent.outcome === "refused", "l'accord : la pluie sur un monde sans eau ne découle de rien, refusée (" + JSON.stringify(X.slate.sent) + ")");
        X.slate.sent = null; SL.trace(X, rain, now);
        await p.slateOnOpen(wet); ok(X.slate.sent && X.slate.sent.outcome === "done" && X.slate.sent.name === "Cendres Mouillees", "le prochain Livre ouvert : l'ardoise part pour lui");
        const after = an(wet); ok(after.slateAct && after.slateAct.effect === "rain" && after.slateAct.fertile, "il pleut aujourd'hui dans cet Âge");
        ok(G.sceneOf(after, "Cendres Mouillees").rain, "la fenêtre : la pluie");
        ok(after.harvest.gives.includes("silt") && !after.harvest.gives.includes("ash") && after.harvest.slate, "l'accord : la pluie sur les cendres donne du limon (" + after.harvest.gives.join() + ")");
        p.ext.story[SKc].stone.ending = "command"; const cmd = an(wet);
        ok(cmd.slateAct && !cmd.slateAct.fertile && cmd.harvest.gives.includes("ash") && G.sceneOf(cmd, "Cendres Mouillees").rain, "le commandement : la pluie peinte, la récolte inchangée");
        delete p.ext.story[SKc].stone; delete X.slate; files.delete(wet.path); files.delete(dry.path); }
      { /* les raccourcis de test (commande « cave-test ») : sauter au 17, le commandement sans attendre un jour, faire tourner les saisons */
        const st = p.ext.story[SKc], keepDone = (st.done || []).slice(), keepPool = p._lastPool, ST = require("../src/story"), STONE = require("../src/story-stone");
        p._lastPool = SKc; p.caveTest("to17");
        ok(STONE.current(st) && !st.done.includes("stone") && ST.CHAPTERS.slice(0, ST.CHAPTERS.findIndex((c) => c.id === "stone")).every((c) => st.done.includes(c.id)), "raccourci : le 17 devient le chapitre en cours");
        p.caveTest("command"); ok(STONE.watch(st, 0, Date.now()) && STONE.endingOf(st) === "command", "raccourci : le chemin ouvert hier, la pierre restée au bureau → le commandement");
        delete st.stone; st.done = keepDone; p._lastPool = keepPool;
        const sea = age("Quatre Saisons", ["single_sun", "water", "fern", "seed", "insolation: 0.88", "atmosphere: 1", "mass: 1", "rotation: 24", "tilt: 30"], dir);
        for (const extra of [[], ["burrower", "stone"]]) { /* l'Âge du scénario de test (claude/TEST-paquet-2.0.md §2) : la graine est le nom de la note + la ligne seed:, les deux fixés ; la migration, puis le fouisseur qui tient le rôle */
          const z = age("Saisons Essai", ["single_sun", "water", "grass", "flowers", "great_tree", "fern", "seed", "grazer", "hunter", "spore", "insolation: 0.88", "atmosphere: 1", "mass: 1", "rotation: 24", "tilt: 30", "seed: 1", ...extra], dir), az = an(z), sh = require("../src/physics").sheet(az.physics, "fr"), ids = sh.tensions.map((x) => x.id), facts = sh.facts.join(" ");
          if (extra.length) ok(!ids.includes("herdWinter") && /hibernent/.test(facts) && /le rôle tient toute l'année/.test(facts), "scénario : avec un fouisseur, plus de migration ; la fiche le dit");
          else ok(ids.includes("herdWinter") && /graines et en bourgeons/.test(facts) && az.season, "scénario : l'Âge tempéré a ses saisons, la migration, et la dormance des verts dite");
          files.delete(z.path); }
        { /* la cave sous la machine (src/cellar.js) : la récolte y descend par saison ; tamis, compost, monte-charge, par le plugin */
          const CL = require("../src/cellar"), keep = p.ext.seasonForce; p.ext.seasonForce = 2; /* l'été */
          const z = age("Cave Essai", ["single_sun", "water", "lava", "ash", "humus", "peat", "fern", "seed", "grass", "insolation: 0.88", "atmosphere: 1", "mass: 1", "rotation: 24", "tilt: 30", "seed: 1"], "Mondes"), pl = p.poolOfAge(p.core.seed(z.path)), X = p.poolExt(pl);
          const before = (X.harvest && X.harvest.stock && X.harvest.stock.ash) || 0, nBefore = (CL.jarOf(X, "ash", "summer") || { n: 0 }).n, vBefore = ((CL.jarOf(X, "ash", "summer") || { by: {} }).by.volcanic || { n: 0 }).n, za = an(z);
          const jar = CL.jarOf(X, "ash", "summer");
          ok(za.harvest.sorts.ash === "volcanic" && za.harvest.sorts.silt === "volcanic" && za.harvest.counts.ash === 2 && za.harvest.counts.humus === 1 && !za.harvest.noGenesis, "la lave : cendre et limon volcaniques ; l'été favorise les cendres, deux mesures (" + JSON.stringify(za.harvest.counts) + ")");
          ok(jar.n === nBefore + 2 && jar.by.volcanic.n === vBefore + 2, "les deux mesures de cendre volcanique descendent dans le bocal d'été");
          ok(jar && jar.n >= 1 && jar.rich >= 1 && ((X.harvest.stock.ash || 0) === before), "la récolte d'été descend dans le bocal « cendres · été » (riche : l'été favorise les cendres), pas dans la trémie");
          ok(p.cellarState(pl) && p.cellarState(pl).jars.ash.summer.n === jar.n, "la cave existe dès que l'appentis est là");
          p.cellarAct("sieve", "ash", "spring", pl); ok(/vide|empty/i.test(p.cellarAct("sieve", "ash", "spring", pl)), "un bocal vide au tamis : une phrase");
          const msgS = p.cellarAct("sieve", "ash", "summer", pl); ok(CL.jarOf(X, "ash", "good:volcanic").n >= 1 && CL.jarOf(X, "ash", "summer").n === 0 && /bon grain|good grain|Tout passe|Everything passes/.test(msgS), "le tamis : le bon grain au bocal scellé (" + msgS + ")");
          const nGood = CL.jarOf(X, "ash", "good:volcanic").n, msgL = p.cellarAct("lift", "ash", "good:volcanic", pl);
          ok(X.harvest.stock.ash === before + nGood && /trémie|hopper/.test(msgL), "le monte-charge : le bon grain monte dans la trémie des cendres (" + msgL + ")");
          CL.store(X, "peat", "winter", false); CL.store(X, "peat", "winter", false); CL.store(X, "peat", "winter", false); const c0 = CL.stateOf(X).compost, h0 = CL.jarOf(X, "humus", "none").n;
          const msgC = p.cellarAct("compost", "peat", "winter", pl); ok(CL.jarOf(X, "humus", "none").n === h0 + Math.floor((c0 + 3) / 3) && /compost/i.test(msgC), "le compost : trois mauvaises mesures font un terreau (" + msgC + ")");
          ok(p.ovenTest("cellar") && CL.totals(X).silt > 0 && CL.jarOf(X, "silt", "summer").by.quartz && CL.jarOf(X, "silt", "summer").by.volcanic, "l'essai : remplir la cave, les sortes mêlées");
          p.ext.seasonForce = 0; /* l'hiver : rien de favorisé */
          const hb = (CL.jarOf(X, "ash", "winter").by.hearth || { n: 0, rich: 0 }), hb0 = { n: hb.n, rich: hb.rich };
          const z2 = age("Cendre Seule", ["single_sun", "water", "ash", "fern", "seed", "many: ash", "insolation: 0.88", "atmosphere: 1", "mass: 1", "rotation: 24", "tilt: 30", "seed: 1"], "Mondes"), h2 = an(z2).harvest; 
          ok(h2 && h2.noGenesis && h2.counts.ash === 2 && h2.sorts.silt === "quartz", "une cendre sans volcan ni feu : sans genèse (pauvre) ; « many: ash » : deux mesures ; le limon d'un monde sans volcan est de quartz (" + JSON.stringify(h2 && h2.counts) + ")");
          const w2 = CL.jarOf(X, "ash", "winter").by.hearth; ok(w2 && w2.n === hb0.n + 2 && w2.rich === hb0.rich, "la cendre sans genèse descend pauvre (deux mesures, aucune riche)");
          const z3 = age("Roche Eau", ["single_sun", "water", "stone", "fern", "seed", "insolation: 0.88", "atmosphere: 1", "mass: 1", "rotation: 24", "tilt: 30", "seed: 1"], "Mondes"), h3 = an(z3).harvest;
          ok(h3 && h3.gives.includes("silt") && h3.sorts.silt === "quartz", "l'eau qui broie la pierre : un limon de quartz");
          files.delete(z2.path); files.delete(z3.path);
          { /* la lecture de l'index (sans physique, en mode facile) récolte la première : la saison et ses mesures doivent y être quand même */
            p.ext.seasonForce = 2; const zi = age("Index Ete", ["single_sun", "water", "lava", "ash", "fern", "seed", "grass", "many: ash", "insolation: 0.88", "atmosphere: 1", "mass: 1", "rotation: 24", "tilt: 30", "seed: 1"], "Mondes"), si = (CL.jarOf(X, "ash", "summer").by.volcanic || { n: 0 }).n, ni = (CL.jarOf(X, "ash", "none").by.volcanic || { n: 0 }).n;
            const srcI = p.core.extract(zi.content); const ai = p.core.analyse(srcI, { seed: p.core.seed(zi.path), physics: false }); void ai;
            ok((CL.jarOf(X, "ash", "summer").by.volcanic || { n: 0 }).n === si + 3 && (CL.jarOf(X, "ash", "none").by.volcanic || { n: 0 }).n === ni, "lue d'abord par l'index (sans physique) : la cendre d'été va au bocal d'été, trois mesures (une, la quantité, l'été)");
            files.delete(zi.path); }
          p.ext.seasonForce = keep; files.delete(z.path); }
        { /* l'Âge de récolte du scénario : chaque saison favorise sa matière (src/seasons.js, richFor) */
          const z = age("Recolte Saisons", ["single_sun", "water", "lava", "ash", "humus", "peat", "fern", "seed", "grass", "insolation: 0.88", "atmosphere: 1", "mass: 1", "rotation: 24", "tilt: 30", "seed: 1"], "Mondes"), keep = p.ext.seasonForce, got = {};
          for (const f of [0, 1, 2, 3]) { p.ext.seasonForce = f; z.stat.mtime++; const h = an(z).harvest || {}; got[["winter", "spring", "summer", "autumn"][f]] = { gives: (h.gives || []).join(","), season: !!h.season }; }
          ok(got.winter.season === false && got.spring.season && got.summer.season && got.autumn.season && /ash/.test(got.summer.gives) && /humus/.test(got.spring.gives) && /peat/.test(got.autumn.gives), "scénario : la récolte, favorisée au printemps, en été, en automne ; rien de plus l'hiver (" + JSON.stringify(got) + ")");
          p.ext.seasonForce = keep; files.delete(z.path); }
        { const z = age("Air Mince", ["single_sun", "fern", "seed", "insolation: 1.6", "atmosphere: 0.3", "mass: 1", "rotation: 24", "tilt: 45", "seed: 1"], dir), tz = require("../src/physics").sheet(an(z).physics, "fr").tensions.find((x) => x.id === "winterGreen");
          ok(tz && /l'été monte/.test(tz.why) && /tilt: \d/.test(tz.fix.join(" ")), "scénario : l'air mince, l'été qui cuit, la piste qui redresse l'axe"); files.delete(z.path); }
        const s0 = an(sea).season; p.caveTest("season"); sea.stat.mtime++; const s1 = an(sea).season;
        ok(s1 && s1.name === "winter" && s1.u === 0 && p.ext.seasonForce === 0, "raccourci : la première fois, tous les Âges au cœur de l'hiver (" + (s1 && s1.name) + ")");
        const seen = [s1.name]; for (let k = 0; k < 4; k++) { const msg = p.caveTest("season"); sea.stat.mtime++; seen.push(an(sea).season.name); if (k === 0) ok(/printemps|spring/.test(msg), "raccourci : la notice dit la saison posée (" + msg + ")"); }
        ok(seen.join(",") === "winter,spring,summer,autumn,winter", "raccourci : hiver, printemps, été, automne, et on recommence (" + seen.join(",") + ")");
        p.caveTest("seasonreset"); sea.stat.mtime++; ok(p.ext.seasonForce === null && an(sea).season.name === s0.name, "raccourci : retour au calendrier vrai");
        files.delete(sea.path); }
      recv.content = "```age\nsingle_sun\nsteady_cycle\nsand\ncarry: sky from Jamais Lu\ncarry: moor from Source Ciel\ncarry: sky from Personne\ncarry: desert from Source Ciel\n```\n"; recv.stat.mtime++;
      r = an(recv); const why = (r.carry.refused || []).map((x) => x.why).join();
      ok(why === "untouched,what,missing,empty", "porter : jamais ouvert, mot inconnu, Livre absent, rien à donner (" + why + ")");
      const loop = age("Boucle", ["single_sun", "steady_cycle", "water", "carry: sky from Boucle"], dir); p.law.observe("Boucle", an(loop), loop.stat.mtime);
      ok((an(loop).carry.refused || [])[0].why === "cycle", "porter : un monde ne se porte pas lui-même");
      { /* à contre-sens : seulement à l'octave (24 h ici, 12 h là-bas) ; la boucle : deux Âges qui se portent l'un l'autre */
        const day = age("Face Jour", ["single_sun", "steady_cycle", "water", "fern", "rotation: 24", "carry: forest from Face Nuit as sky"], dir), night = age("Face Nuit", ["single_sun", "steady_cycle", "grass", "fern", "stone", "rotation: 12", "carry: water from Face Jour"], dir), odd = age("Face Autre", ["single_sun", "steady_cycle", "grass", "fern", "rotation: 17"], dir);
        for (const f of [day, night, odd]) { p.carrySource(f, p.core.extract(f.content)); p.law.observe(f.basename, an(f), f.stat.mtime); }
        const rd = an(day), fr = (rd.carry && rd.carry.fragments) || [];
        ok(fr.length === 1 && fr[0].contra && fr[0].degree === "full", "contre-sens : à l'octave, la forêt de l'autre face est posée à la place du ciel (" + JSON.stringify((rd.carry || {}).refused) + ")");
        ok((rd.resolved.lines || []).some((l) => l.entry && l.entry.id === "single_sun" && !l.autoFilled) && !(rd.resolved.lines || []).some((l) => l.autoFilled && ["stars", "cycle", "moon", "phenomena"].includes(l.slot)), "contre-sens : le ciel écrit reste, et le livre n'en tire pas par-dessus");
        ok(rd.carry.loop && /each other|l'un l'autre/.test(p.carryLine(rd.carry)), "la boucle : les deux faces se portent l'une l'autre, et le panneau le dit");
        { /* le chapitre 16 doit pouvoir se gagner : un monde de départ sans ciel, un lieu à contre-sens à l'octave et un second fragment, et il tient (26 oct. 2026) */
          const c16 = age("Accord Essai", ["water", "fern", "moss", "rotation: 24", "carry: forest from Face Nuit as sky", "carry: stone from Face Nuit"], dir); p.carrySource(c16, p.core.extract(c16.content)); p.law.observe(c16.basename, an(c16), c16.stat.mtime);
          const r16 = an(c16), f16 = (r16.carry && r16.carry.fragments) || [];
          ok(f16.length === 2 && f16.some((f) => f.contra) && r16.stability >= 75, "chapitre 16 : deux fragments dont un à contre-sens, et le monde tient (" + r16.stability + " %, " + JSON.stringify((r16.carry || {}).refused) + ")");
          files.delete(c16.path); }
        day.content = day.content.replace("Face Nuit as sky", "Face Autre as sky"); day.stat.mtime++; p.carrySource(day, p.core.extract(day.content));
        const ro = an(day); ok((ro.carry.refused || []).some((x) => x.why === "octave"), "contre-sens : hors de l'octave, refusé en une phrase");
        { /* l'index lit toutes les sources avant d'analyser : un Âge lu avant sa source porte quand même (le chapitre 16 se valide sans attendre l'heure suivante) */
          const carrier = age("Porteur Avant", ["water", "fern", "carry: water from Source Apres"], dir), srcA2 = age("Source Apres", ["single_sun", "steady_cycle", "water", "fern"], dir);
          p.law.observe(srcA2.basename, an(srcA2), srcA2.stat.mtime); p._carrySrc.delete(srcA2.path); p.index.invalidate();
          const it = (await p.index.list()).find((x) => x.name === "Porteur Avant");
          ok(it && it.carried === 1, "index : la source lue après l'Âge qui porte, le fragment est compté quand même (" + (it && it.carried) + ")");
          files.delete(carrier.path); files.delete(srcA2.path); p.index.invalidate(); }
        for (const f of [day, night, odd]) files.delete(f.path); }
      const ids = require("../src/law").worldIds(an(recv)); ok(ids.some((x) => x.startsWith("carry|")) && !ids.some((x) => /^\?carry/.test(x)), "porter : la loi du changement voit la ligne, pas le fragment");
      for (const f of [srcA, recv, far, loop]) files.delete(f.path); delete p.ext.story[SKc]; p.index.invalidate(); }
    p.app.metadataCache.getFileCache = gfcS; for (const f of [sf, inside, outside]) files.delete(f.path); delete p.ext.story; p.index.invalidate(); }
  { const rt = document.createElement("div"); await p.procs.relto("", rt, { sourcePath: "x.md", addChild() {} });
    const root = rt.querySelector(".age-relto"), tb = [...rt.querySelectorAll(".age-relto__tab:not(.age-relto__tab--expand):not(.age-relto__tab--full):not(.age-relto__tab--guide)")];
    ok(tb.length === 3 && root.getAttribute("data-tab") === "view", "Relto en onglets : Vue / Pages / Réglages, Vue d'abord");
    ok(rt.querySelectorAll(".age-relto__tab--guide").length === 1, "Relto : un bouton ouvre le guide");
    ok(!!rt.querySelector(".age-relto__pane--view .age-relto__canvas") && !!rt.querySelector(".age-relto__pane--view .age-relto__when .age-relto__clock") && !!rt.querySelector(".age-relto__pane--view .age-relto__dnitime"), "onglet Vue : image + date/heure dessous");
    ok(!!rt.querySelector(".age-relto__pane--pages .age-relto__pages") && !!rt.querySelector(".age-relto__pane--settings input[type=range]"), "Pages dans l'onglet Pages ; curseurs dans Réglages");
    tb[1].click(); ok(root.getAttribute("data-tab") === "pages", "clic sur l'onglet Pages");
    ok(!!rt.querySelector(".age-relto__tab--expand"), "bouton « grande vue » dans le Relto en bloc");
    const rv = p.views["age-writer-relto"]({ app: p.app }); await rv.onOpen();
    ok(!!rv.contentEl.querySelector(".age-relto__canvas") && !!rv.contentEl.querySelector(".age-relto__tab--full") && !rv.contentEl.querySelector(".age-relto__tab--expand") && rv.contentEl.classList.contains("age-reltoview"), "vue Relto dédiée : canvas, bouton plein écran, sans bouton d'agrandissement"); }
  p.ext.reltoTabs = false;
  ok(!!r5.querySelector(".age-relto__mode") && !!r5.querySelector(".age-relto__vol"), "niveau + volume du refuge");
  p.ext.reltoTabs = true;
  { const b = document.createElement("button"); document.body.appendChild(b); b.classList.add("is-on"); p.soundBtn = b; p.sound.playing = true; p.watchSound(); b.remove(); p.checkSound();
    ok(p.sound.playing === false && p.soundBtn === null, "garde-fou : le son s'arrête quand son bouton disparaît (changement de note)"); }
  const inl = document.createElement("p"); inl.innerHTML = "voici <code>dni:Atrus</code> et <code>autre</code>"; p.post(inl);
  ok(inl.querySelectorAll(".age-dni--inline").length === 1 && inl.querySelectorAll("code").length === 1, "inline `dni:` converti, autre code intact");

  // bloc dni et journal
  const d = document.createElement("div"); p.procs.dni("42\nbonjour", d, {}); ok(d.querySelectorAll(".age-dniblock__row").length === 2, "bloc dni : 2 lignes");
  const jr = document.createElement("div"); await p.procs["age-journal"]("age: [[Alpha]]\nvoice: atrus", jr, { sourcePath: "J.md", addChild() {} });
  p.app.metadataCache.getFirstLinkpathDest = (n) => files.get("Ages/" + n + ".md") || null;
  const jr2 = document.createElement("div"); await p.procs["age-journal"]("age: [[Alpha]]\nvoice: atrus", jr2, { sourcePath: "J.md", addChild() {} });
  ok(jr2.querySelectorAll(".age-journal__entry").length >= 3, "journal : entrées générées");

  // livre : onglet couverture, coins cuir
  p.currentAgeFile = f; p.ext.law = true;
  const Re = p.core.BookView, view = new Re({ app }, p);
  view.contentEl.innerHTML = '<div class="age-book__tabs"><button>Descriptive</button></div><div class="age-book__spread"><div class="age-book__page age-book__page--right"></div></div>';
  view.mode = "cover"; await view.render();
  ok(view.contentEl.classList.contains("age-book--leather") && view.contentEl.querySelectorAll(".age-book__corner").length === 4, "thème cuir : 4 coins");
  ok(!!view.contentEl.querySelector(".age-book__covercontainer svg"), "page de garde SVG générée");
  ok(view.mode === "cover", "le mode « cover » est conservé après le rendu");
  ok(/cover|couverture/i.test(view.contentEl.querySelector(".age-book__tabs").firstElementChild.textContent) && view.contentEl.getAttribute("data-age-mode") === "cover", "onglet Couverture en premier ; mode posé sur la vue (hauteur du livre de liaison)");
  view.contentEl.innerHTML = '<div class="age-book__tabs"></div><div class="age-book__spread"><div class="age-book__page age-book__page--right"></div></div>'; view.mode = "descriptive"; await view.render();
  ok(!!view.contentEl.querySelector(".age-book__page--right .age-ext"), "extras dans la page de droite (mode descriptif)");
  // à l'ouverture d'un livre (nouvel Âge dans la vue) on tombe sur la couverture, sauf réglage « garder »
  { const was = p.ext.bookStart;
    view.__openedPath = null; view.mode = "linking"; p.ext.bookStart = "cover"; await view.render();
    ok(view.mode === "cover", "ouverture d'un livre : on tombe sur la couverture");
    view.mode = "linking"; await view.render(); ok(view.mode === "linking", "même Âge : l'onglet choisi est conservé");
    view.__openedPath = null; view.mode = "linking"; p.ext.bookStart = "keep"; await view.render(); ok(view.mode === "linking", "réglage « garder » : l'onglet courant reste");
    { view.contentEl.innerHTML = '<div class="age-book__tabs"></div><div class="age-book__spread"><div class="age-book__page age-book__page--left"><div class="age-book__window"></div><div class="age-book__strip"></div><div class="age-book__glimpse">x</div><div class="age-book__caption">c</div></div><div class="age-book__gutter"></div><div class="age-book__page age-book__page--right"><div class="age-book__heading">h</div><div class="age-book__books"></div></div></div>'; view.mode = "linking"; await view.render(); const lv = view.contentEl.querySelectorAll(".age-book__leaf");
      ok(lv.length === 3 && view.contentEl.querySelectorAll(".age-book__leaf.is-shown").length === 1, "livre de liaison : 3 pages, une seule visible");
      ok(lv[0].parentElement.classList.contains("age-book__page--right") && view.contentEl.querySelectorAll(".age-book__dot").length === 3, "pages écrites à droite, repères en points");
      view.contentEl.querySelector(".age-book__page--right").click();
      ok(view.leafPage === 1 && lv[1].classList.contains("is-shown"), "clic page droite : page suivante");
      view.contentEl.querySelector(".age-book__page--left").click(); ok(view.leafPage === 0, "clic page gauche : page précédente"); }
    p.ext.bookStart = was; }
  await p.saveCover(f); ok([...files.keys()].some((k) => /cover.*\.svg|Cover/i.test(k)) || notices.some((n) => /cover|couverture/i.test(n)), "saveCover : fichier ou notice");
  { // Âge au hasard + Âge d'exemple
    const before = files.size, cmd = p.cmds.find((c) => c.id === "random-age"); ok(!!cmd, "commande « Generate a random Age » enregistrée");
    await cmd.callback(); const made = [...files.keys()].slice(before);
    ok(made.length === 1 && /```age\n[\s\S]*seed: \d+/.test(files.get(made[0]).content) && notices.some((x) => /Nouvel Âge|New Age/.test(x)), "Âge au hasard : une note créée avec son bloc et sa graine, une notice");
    // un monde que personne n'a écrit (Imageur au livre vierge), transcrit : même dossier, bloc exact, jamais d'écrasement
    const u = { key: "single_sun,water,fern,wind|s5|i2|f2|a2", seed: 4711, name: "Tahvoreth", lines: ["single_sun", "water", "fern", "wind", "star_mass: 1", "insolation: 1", "rotation: 24", "atmosphere: 1"] };
    const b1 = files.size, f1 = await p.transcribeWorld(u), made1 = [...files.keys()].slice(b1);
    ok(made1.length === 1 && f1 && files.get(made1[0]).content.includes("```age\n" + u.lines.join("\n") + "\nseed: 4711\n```") && /Tahvoreth/.test(made1[0]), "monde transcrit : une note, le bloc exact (lignes + seed)");
    const ra = p.core.analyse(p.core.extract(files.get(made1[0]).content), { seed: f1.basename });
    ok(ra.resolved.seed === "4711" && !ra.resolved.lines.some((l) => l.unknown), "relu : même graine, aucune tache d'encre");
    const f2 = await p.transcribeWorld(u);
    ok(f2 && f2.path !== f1.path && files.get(f1.path).content === files.get(made1[0]).content, "transcrit deux fois : une autre note, la première intacte");
    const live = p.index.list; p.index.list = async () => []; p.ext.state.welcomed = false;
    const b2 = files.size; await p.welcomeOnce(); const w = [...files.keys()].slice(b2);
    ok(w.length === 1 && /Bienvenue|Welcome/.test(w[0]) && p.ext.state.welcomed, "premier lancement : note de bienvenue créée, une seule fois");
    await p.welcomeOnce(); ok(files.size === b2 + 1, "pas de seconde note de bienvenue");
    p.index.list = async () => [{}]; p.ext.state.welcomed = false; const b3 = files.size; await p.welcomeOnce(); ok(files.size === b3 && p.ext.state.welcomed, "coffre qui a déjà des Âges : rien créé");
    p.index.list = live;
    const plain = new TFile("Plain.md", "juste une note, sans Âge"), agef = new TFile("Un Âge.md", "```age\nsingle_sun\n```");
    ok(await p.noteHasAge(plain) === false && await p.noteHasAge(agef) === true && await p.noteHasAge(null) === false, "le livre ne s'ouvre en musique que pour une note qui contient un Âge"); }
  if (process.env.DUMP) { fs.writeFileSync(process.env.DUMP + "-cover.html", view.contentEl.outerHTML); view.mode = "cover"; await view.render(); fs.writeFileSync(process.env.DUMP + "-cover.html", view.contentEl.outerHTML); fs.writeFileSync(process.env.DUMP + "-panel.html", host.outerHTML); }
  // réglages
  const st = new p.core.SettingsTab(app, p); st.display(); ok(!!st.containerEl.querySelector(".age-ext-settings"), "réglages de l'extension ajoutés à l'onglet d'origine");

  // un Âge renommé : la loi le connaît sous le nom de sa note, l'analyse sous sa graine (`age_seed`) ; la pénalité s'applique quand même
  {
    const src = "single_sun\nwater\nlava\nfern", gfc = p.app.metadataCache.getFileCache, law0 = p.ext.law;
    files.set("Ages/Nouveau.md", new TFile("Ages/Nouveau.md", "```age\n" + src + "\n```\n"));
    p.app.metadataCache.getFileCache = (f) => (f.path === "Ages/Nouveau.md" ? { frontmatter: { age_seed: "Ancien" }, sections: [{ type: "code" }] } : gfc(f));
    p._seedNames = null; p.ext.law = true;
    ok(p.ageNameOfSeed("Ancien") === "Nouveau", "renommage : la graine retrouve le nom actuel de la note");
    p.law.observe("Nouveau", p.core.analyse(src, { seed: "Ancien", physics: false }), Date.now());
    const la = p.law.get("Nouveau"); la.extra = 0.6; la.at = p.law.now();
    const hit = p.core.analyse(src, { seed: "Ancien", probe: true }).stability; la.extra = 0; const free = p.core.analyse(src, { seed: "Ancien", probe: true }).stability;
    ok(hit < free, `renommage : la loi du changement s'applique à l'Âge renommé (${hit} < ${free})`);
    p.law.forget("Nouveau"); files.delete("Ages/Nouveau.md"); p.app.metadataCache.getFileCache = gfc; p._seedNames = null; p.ext.law = law0;
  }

  // désactivation propre
  p.onunload(); ok(true, "onunload sans exception");
  const extWarns = warns.filter((w) => w.includes("Age Writer ext"));
  ok(extWarns.length === 0, "aucun avertissement interne" + (extWarns.length ? " : " + extWarns.slice(0, 5).join(" | ") : ""));
  console.warn = realWarn;
  console.log(fail ? `\n${fail} échec(s)` : "\ntout passe"); process.exit(fail ? 1 : 0);
})().catch((e) => { console.warn = realWarn; console.error(e); process.exit(1); });
