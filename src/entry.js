"use strict";
/**
 * Point d'entrée de la couche d'extension. `build(Base, core, AGEX)` renvoie la classe de plugin
 * étendue : elle hérite du plugin Age Writer existant et y ajoute, sans le modifier,
 * le Relto, les chiffres D'ni, la loi du Changement, les effets de fenêtre, la page de garde,
 * le journal, les mécanismes, la solitude et les paysages sonores.
 * Tout ajout est protégé : si une extension échoue, le plugin d'origine continue de fonctionner.
 */
const obsidian = require("obsidian");
const { Dni } = require("./dni");
const { setMarkup, fitModalToFullscreen } = require("./util");
const { Law, adjustAnalysis, fissureStrain, strainable, forceAlteration, describeChange, worldIds } = require("./law");
const { solitudeFactor, COVER_RE, parseCover, KEY_RE, FX_RE, STYLE_RE, TRAP_RE, DMG_RE, parseFx, parseStyle, parseTrap, parseDamage, applyDamage } = require("./mech");
const { Soundscape, staticBurst, openSequence, linkSound, pageTurn } = require("./sound");
const { coverSvg } = require("./cover");
const fx = require("./linkfx");
const { sceneOf, HOOKS: GEN_HOOKS } = require("./genscene");
const { DAY_RE, YEAR_RE, SIZE_RE, MOONS_RE, parseSky } = require("./sky");
const { AMOUNT_RE, parseAmounts, applyAmounts } = require("./amounts");
const { rollLink } = fx;
const { makeT } = require("./i18n");
const { AgeIndex } = require("./index");
const X = require("./ui-extras");
const R = require("./ui-relto");
const RB = require("./relto-books");
const G = require("./guide");
const PH = require("./physics/index");
const AS = require("./ageseed");
const WX = require("./weather");
const { addExtSettings, DEFAULTS } = require("./settings-ui");

module.exports = function build(Base, core, AGEX) {
  const { Notice, TFile, MarkdownRenderChild, FuzzySuggestModal } = obsidian;
  const guard = (label, fn) => { try { return fn(); } catch (e) { console.warn(`[Age Writer ext] ${label}`, e); } };

  class VoiceModal extends FuzzySuggestModal {
    constructor(app, onChoose) { super(app); this.onChoose = onChoose; }
    getItems() { return ["atrus", "gehn", "miller"]; }
    getItemText(v) { return v[0].toUpperCase() + v.slice(1); }
    onChooseItem(v) { this.onChoose(v); }
  }

  return class AgeWriterExt extends Base {
    // ---- ouverture du livre : panneau latéral (origine), onglet principal ou fenêtre séparée -------
    async openBook() {
      const ws = this.app.workspace, f = ws.getActiveFile(), TYPE = "age-writer-book", mode = (this.ext && this.ext.bookOpen) || "tab";
      if (mode === "side") { await super.openBook(); if (this.ext.bookStart !== "keep") for (const l of ws.getLeavesOfType(TYPE)) if (l.view && "mode" in l.view) l.view.mode = "cover"; this.refreshBooks(); return; }
      if (f && f.extension === "md") this.currentAgeFile = f;
      let leaf = ws.getLeavesOfType(TYPE)[0];
      // un livre resté dans la colonne latérale (disposition enregistrée) est refermé : il serait ré-utilisé à la place
      if (leaf && leaf.getRoot && leaf.getRoot() !== ws.rootSplit && mode === "tab") { leaf.detach(); leaf = null; }
      // une fenêtre séparée n'apparaît pas par-dessus une fenêtre en plein écran : dans ce cas le livre s'ouvre en onglet
      const full = (() => { try { const w = window, d = w.document, s = w.screen; return !!d.fullscreenElement || (w.outerWidth >= s.width && w.outerHeight >= s.height); } catch { return false; } })();
      if (!leaf) leaf = mode === "window" && !full && typeof ws.openPopoutLeaf === "function" ? ws.openPopoutLeaf() : ws.getLeaf("tab");
      await leaf.setViewState({ type: TYPE, active: true });
      await ws.revealLeaf(leaf);
      if (this.ext.bookStart !== "keep" && leaf.view && "mode" in leaf.view) leaf.view.mode = "cover"; // rouvrir le livre = revenir à sa couverture
      this.refreshBooks();
    }

    // ---- cycle de vie -------------------------------------------------------------------
    async onload() {
      await super.onload();
      this.core = core;
      const saved = this.settings.ext || {};
      this.ext = this.settings.ext = { ...DEFAULTS, ...saved, state: { ...(saved.state || {}), law: { ages: {}, ...((saved.state || {}).law || {}) } } };
      if (saved.openSound && saved.soundBook === undefined) { const m = saved.openSound; this.ext.soundLink = m === "openseq"; if (m === "off") { this.ext.soundBook = false; this.ext.soundClasp = false; } delete this.ext.openSound; } // ancien menu → trois interrupteurs
      this.t = makeT(() => this.lang());
      this.physCache = new Map();
      this.live = new Set(); this.lawTimers = new Map(); this.fileAudios = []; this.soundBtn = null;
      this.index = new AgeIndex(this);
      this.law = new Law(this.ext.state.law, { dryMinutes: () => this.ext.inkDry, healPerDay: () => this.ext.heal, ignored: (raw) => PH.isPhysicsLine(raw) || PH.isPhysicsStub(raw) });
      guard("modal plein écran", () => { // les fenêtres modales (livre des glyphes, carnet de l'arpenteur…) restent visibles quand le Relto est en plein écran
        const mp = obsidian.Modal && obsidian.Modal.prototype, orig = mp && mp.open; if (!orig) return;
        const self = this; mp.open = function (...a) { const r = orig.apply(this, a); fitModalToFullscreen(this); return r; };
        self.register(() => { mp.open = orig; });
      });
      GEN_HOOKS.doom = (name) => this.law.doom(name);
      GEN_HOOKS.opening = (name) => this.law.opening(name, this.ext.fissureDays); // les fissures s'ouvrent avec le temps
      this.dni = new Dni({ getMode: () => this.ext.numerals, adapter: this.app.vault.adapter, pluginDir: this.manifest.dir, getVaultFont: () => this.ext.vaultFont });
      this.soundFactor = 1; this.sound = new Soundscape(() => this.ext.volume * (this.soundFactor == null ? 1 : this.soundFactor));

      // crochets du moteur (voir build.js) : altération de la stabilité, poids de la solitude
      AGEX.adjust = (r, o, srcText) => {
        let out = guard("adjust", () => (this.ext.law && o && o.seed ? adjustAnalysis(r, this.law.effective(o.seed)) : r)) || r;
        // livre-piège déclaré : ni livre de retour, ni fissure
        if (srcText && parseTrap(srcText)) out = { ...out, returnTo: null, stranded: true, fissure: null, trapped: true, home: "none" };
        if (srcText) out = guard("quantités", () => applyAmounts(out, parseAmounts(srcText), this.core && this.core.blocks)) || out;
        if (srcText) out = applyDamage(out, parseDamage(srcText));
        if (srcText) { const wx = guard("météo", () => WX.parseWeather(srcText)); if (wx) out = { ...out, weather: wx, resolved: out.resolved ? { ...out.resolved, weather: wx } : out.resolved }; } // météo vivante : lue par la fenêtre (sceneOf) et la description, sans effet sur la stabilité
        if (srcText) out = guard("physique", () => this.applyPhysicsTo(out, srcText, o)) || out;
        if (this.ext.law && o && o.seed) out = guard("fissure", () => { // la fissure grandit : elle abîme un monde instable, et le condamne s'il n'est pas corrigé à temps
          const op = this.law.opening(o.seed, this.ext.fissureDays), bad = strainable(out);
          if (this.law.tend(o.seed, bad ? out.stability : 100, op)) { out.condemned = true; return bad || out.fissure === "open" || out.fissure === "submarine" ? forceAlteration(out, 10) : out; }
          return fissureStrain(out, op);
        }) || out;
        return out;
      };
      AGEX.norm = (line) => guard("météo", () => WX.normalize(line)) || line; // `rain: sometimes, dawn` : pour le moteur, c'est `rain`
      AGEX.skip = (line) => PH.isPhysicsLine(line) || PH.isPhysicsStub(line) || KEY_RE.test(line) || FX_RE.test(line) || STYLE_RE.test(line) || DAY_RE.test(line) || MOONS_RE.test(line) || YEAR_RE.test(line) || SIZE_RE.test(line) || AMOUNT_RE.test(line) || TRAP_RE.test(line) || DMG_RE.test(line) || COVER_RE.test(line);
      // livre-piège : « pas de fissure » est une réponse donnée d'avance, le tirage n'en dessine pas une que le pied de bloc nierait
      AGEX.written = (set) => { if (!AGEX.src || !guard("trap draw", () => parseTrap(AGEX.src))) return set; const s = new Set(set); s.add("no_fissure"); return s; };
      AGEX.w = (slot, opt) => { const f = guard("solitude", () => solitudeFactor(this.ext.solitude, slot, opt.id)); return opt.weight * (f == null ? 1 : f); };

      guard("fonts", () => this.dni.init().then(() => this.redrawEverything()));
      guard("book", () => this.patchBook());
      guard("settings", () => this.patchSettings());
      this.registerProcessors();
      this.registerCommands();
      this.registerEvents();
      this.app.workspace.onLayoutReady(() => { guard("scan", () => this.initialScan()); window.setTimeout(() => guard("welcome", () => this.welcomeOnce()), 2500); });
    }

    onunload() {
      this.stopSound(); this.live.clear(); for (const t of this.lawTimers.values()) clearTimeout(t); clearTimeout(this.liveTimer);
      // une sauvegarde en attente (réglages, état de la loi, pages repliées…) ne doit pas être perdue
      if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = 0; guard("save", () => this.saveSettings()); }
      super.onunload();
    }

    // ---- couche physique (src/physics) --------------------------------------------------------
    physicsMode() { const m = this.ext && this.ext.physics; return m === "off" || m === "strict" ? m : "easy"; }
    /** Retraite une analyse selon le mode physique. Le monde physique est mis en cache (texte du bloc, graine, symboles, mode). */
    applyPhysicsTo(r, srcText, o) {
      const mode = this.physicsMode(); if (mode === "off" || !r || !r.resolved || (o && o.physics === false)) return r;
      const seed = (o && o.seed) || "", ids = [...PH.idsOfAnalysis(r)].sort().join(",");
      const key = `${mode}|${seed}|${ids}|${srcText}`;
      let ph = this.physCache.get(key);
      if (!ph) {
        ph = PH.physicsOf(r, srcText, seed, mode); this.physCache.set(key, ph);
        if (this.physCache.size > 1500) this.physCache.delete(this.physCache.keys().next().value);
      }
      return PH.applyPhysics(r, ph, mode, { severity: Number(this.ext.physicsSeverity) || 1 });
    }
    /** Une piste cliquée dans la fiche : écrit (ou remplace) la ligne `clé: valeur` dans le bloc age de la note. */
    async writePhysicsLine(path, src, key, value) {
      const f = this.app.vault.getAbstractFileByPath(path); if (!(f instanceof TFile)) return;
      let missed = false;
      const edit = (text) => { const out = PH.setLineInAgeBlock(text, src, key, value); if (out == null) { missed = true; return text; } return out; };
      if (typeof this.app.vault.process === "function") await this.app.vault.process(f, edit);
      else await this.app.vault.modify(f, edit(await this.app.vault.read(f)));
      new Notice(missed ? this.t("phys.notfound") : this.t("phys.written", { line: `${key}: ${PH.asLine(value)}` }));
    }

    lang() {
      const v = this.ext && this.ext.lang;
      if (v === "en" || v === "fr") return v;
      let l = "en"; try { l = (window.localStorage.getItem("language") || navigator.language || "en"); } catch (e) { /* ignore */ }
      return String(l).toLowerCase().startsWith("fr") ? "fr" : "en";
    }

    saveExt() { clearTimeout(this.saveTimer); this.saveTimer = window.setTimeout(() => { this.saveTimer = 0; this.saveSettings(); }, 2500); }
    refreshLive() {
      clearTimeout(this.liveTimer);
      this.liveTimer = window.setTimeout(() => { for (const i of [...this.live]) { if (i.el && !i.el.isConnected) continue; guard("live", () => i.refresh()); } }, 700);
    }

    // ---- remplacements de méthodes du plugin d'origine ---------------------------------------
    renderAgePanel(src, el, path) {
      const name = core.base(path), analysis = guard("analyse", () => core.analyse(src, { seed: name }));
      this.fxCtx = { mode: parseFx(src), style: parseStyle(src), sky: parseSky(src), seed: String(path), analysis };
      try { super.renderAgePanel(src, el, path); } finally { this.fxCtx = null; }
      guard("panel", () => {
        if (!this.law || !analysis) return;
        const panel = el.querySelector(":scope > .age-panel") || el.lastElementChild; if (!panel) return;
        X.renderExtras(this, panel, { src, analysis, name, path });
        if (this.ext.panelTabs !== false) X.tabifyPanel(this, panel);
      });
    }
    mountGenerated(parent, analysis, path) { super.mountGenerated(parent, analysis, path); this.applyFx(parent, analysis, path); }
    mountWindow(parent, src, verdict) { super.mountWindow(parent, src, verdict); this.applyFx(parent, { verdict }, "window"); }

    /** Effet à appliquer : `fx:` de l'Âge, sinon le réglage général. */
    resolveFx(analysis) {
      const cx = this.fxCtx || {}, a = cx.analysis || analysis || {};
      let mode = cx.mode;
      if (!mode) mode = this.ext.panelFx;
      return { mode, a, seed: cx.seed, style: cx.style || this.ext.windowStyle, sky: cx.sky || {} };
    }

    applyFx(parent, analysis, key) {
      guard("fx", () => {
        if (!this.ext) return;
        const r = this.resolveFx(analysis);
        const gen = r.style === "gen" ? sceneOf(r.a, String(r.seed || key).replace(/^.*\//, "").replace(/\.md$/i, ""), core.blocks) : null; // fenêtre génératrice (si l'analyse est connue)
        if (gen) Object.assign(gen, r.sky); // durée du jour et de l'année (lignes day_length / year_length)
        const size = r.sky.size || this.ext.windowSize || "large"; // la ligne window_size / window_width du bloc passe avant le réglage ; les livres et le Relto gardent leur taille
        if (key !== "window") {
          parent.classList.remove("age-ext-vis-large", "age-ext-vis-xl", "age-ext-vis-custom"); parent.style.removeProperty("--age-win-w");
          if (typeof size === "number") { parent.classList.add("age-ext-vis-custom"); parent.style.setProperty("--age-win-w", size + "px"); } else if (size !== "normal") parent.classList.add("age-ext-vis-" + size);
          if (gen) { const r0 = typeof size === "number" ? Math.min(720, Math.max(240, size)) : size === "xl" ? 560 : size === "large" ? 440 : 320; gen.res = this.ext.panelTabs !== false ? Math.max(r0, 560) : r0; } // l'onglet « fenêtre de liaison » l'affiche en grand
        } else if (gen) gen.res = 480; // vitre du livre de liaison, agrandie
        if (r.mode === "off" && !gen) return;
        const win = parent.lastElementChild; if (!win || !win.classList.contains("age-panel__window")) return;
        const source = win.querySelector("img") || win.querySelector("canvas"); if (!source) return;
        fx.attach(win, source, {
          unrest: fx.unrestOf(r.a), triggered: (r.a.resolved && r.a.resolved.triggered) || [], seed: r.seed || String(key),
          mode: r.mode, gen, dmg: r.a.damage || null, strength: this.ext.fxStrength, uncertain: this.ext.uncertainLinks !== false,
          reduced: typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
        });
      });
    }

    // ---- vue livre : thème cuir, page de garde, mécanismes ---------------------------------------
    patchBook() {
      const plugin = this, proto = core.BookView.prototype, orig = proto.render;
      this.patchLinks(proto);
      proto.render = async function () {
        // un livre qui s'ouvre (nouvel Âge dans la vue) s'ouvre sur sa couverture, sauf réglage contraire
        const p = plugin.currentAgeFile && plugin.currentAgeFile.path, opening = !!p && this.__openedPath !== p;
        if (opening && plugin.ext && plugin.ext.bookStart !== "keep") this.mode = "cover";
        const cover = this.mode === "cover";
        if (cover) this.mode = "descriptive";
        await orig.call(this);
        if (opening) { this.__openedPath = p; const isAge = await plugin.noteHasAge(plugin.currentAgeFile); if (isAge && plugin.ext && plugin.ext.sound && !(this.__quietUntil > Date.now())) openSequence(plugin.ext.volume, { book: plugin.ext.soundBook !== false, clasp: plugin.ext.soundClasp !== false, link: false }); }
        if (cover) this.mode = "cover";
        try { await plugin.extendBook(this, cover); } catch (e) { console.warn("[Age Writer ext] book", e); }
      };
    }

    /** Fenêtre vers un autre Âge : effet propre à l'Âge visé (fx:), clic = liaison ; livre abîmé = parasites et lien incertain. */
    patchLinks(proto) {
      const plugin = this, origGlimpse = proto.glimpse, origRow = proto.bookRow, origOwn = proto.ownGlass;
      // vitre de l'Âge lui-même (livre sans liaison) : son analyse et sa graine, pour l'instabilité et « random »
      if (origOwn) proto.ownGlass = function (t, a, file) {
        plugin.fxCtx = a ? { mode: null, analysis: a, seed: file && file.path } : null;
        try { return origOwn.call(this, t, a, file); } finally { plugin.fxCtx = null; }
      };
      if (origGlimpse) proto.glimpse = function (t, i) {
        const view = this;
        plugin.fxCtx = i && i.analysis ? { mode: parseFx(i.source), style: parseStyle(i.source), sky: parseSky(i.source), analysis: i.analysis, seed: i.file && i.file.path, glimpse: true } : null;
        try { origGlimpse.call(this, t, i); } finally { plugin.fxCtx = null; }
        guard("window click", () => {
          const win = t.querySelector(".age-book__window"); if (!win || !i || !i.file) return;
          win.addClass("is-clickable"); win.setAttr("title", plugin.t("link.touch"));
          win.addEventListener("click", () => {
            view.__quietUntil = Date.now() + 4000;
            const rows = [...view.contentEl.querySelectorAll(".age-book__book")], row = rows.find((r) => r.__item === i) || rows.find((r) => r.__item && r.__item.name === i.name);
            const a = row && row.querySelector(".age-book__open");
            if (a) a.click(); else { if (plugin.ext.sound && plugin.ext.soundLink !== false) linkSound(plugin.ext.volume); plugin.app.workspace.openLinkText(i.name, plugin.currentAgeFile ? plugin.currentAgeFile.path : "", false); }
          });
        });
        guard("trap ui", () => {
          // parasites : seulement si le livre est abîmé (un écran entièrement brouillé, personne n'y toucherait)
          if (!(i && i.analysis && fx.unrestOf(i.analysis) >= 0.3) || !plugin.ext.sound) return;
          const win = t.querySelector(".age-book__window"); if (!win) return;
          const btn = t.createEl("button", { cls: "age-ext__sound age-ext__sound--static", text: "♪ " + plugin.t("sound.static") });
          btn.addEventListener("click", () => plugin.toggleSound({ static: 0.7 }, btn, [], i.name));
        });
      };
      if (origRow) proto.bookRow = function (t, i, sel, srcFile) {
        origRow.call(this, t, i, sel, srcFile);
        guard("uncertain link", () => {
          const row = t.lastElementChild; if (!row || !i || !i.analysis || !i.file) return;
          row.__item = i; const view = this;
          row.addEventListener("click", (e) => {
            const a = e.target && e.target.closest ? e.target.closest(".age-book__open") : null;
            if (!a) return;
            if (plugin.law.destroyed(i.name)) { e.stopImmediatePropagation(); e.preventDefault(); row.addClass("is-flicker"); window.setTimeout(() => row.removeClass("is-flicker"), 700); new Notice(plugin.t("doom.gone")); return; } // le livre est brûlé : rien ne s'ouvre plus
            view.__quietUntil = Date.now() + 4000; // déjà dans le livre : pas de bruit d'ouverture
            if (plugin.ext.uncertainLinks === false) { if (plugin.ext.sound && plugin.ext.soundLink !== false) linkSound(plugin.ext.volume); return; }
            const others = [...view.contentEl.querySelectorAll(".age-book__book")].map((r) => r.__item).filter((x) => x && x.file && x.file !== i.file);
            const res = rollLink(fx.unrestOf(i.analysis), Math.random(), others.length, i.analysis.damage);
            if (res.kind === "ok") { if (plugin.ext.sound && plugin.ext.soundLink !== false) linkSound(plugin.ext.volume); return; }
            e.stopImmediatePropagation(); e.preventDefault();
            row.addClass("is-flicker"); window.setTimeout(() => row.removeClass("is-flicker"), 700);
            if (plugin.ext.sound) staticBurst(plugin.ext.volume * 0.8);
            if (res.kind === "astray") {
              const o = others[res.pick % others.length];
              new Notice(plugin.t("link.astray", { a: i.name, b: o.name }));
              plugin.app.workspace.openLinkText(o.name, srcFile.path, false);
            } else new Notice(plugin.t("link.flicker"));
          }, true);
        });
      };
    }

    coverFor(src, analysis, file, standalone) {
      const name = file.basename, seed = /^\s*seed\s*:\s*(\d+)\s*$/im.exec(src);
      return coverSvg({
        name, number: X.ageNumber(name), seedNumber: seed ? Number(seed[1]) : null, dni: this.dni, standalone,
        glyph: (id, x, y, s) => core.glyphSvg(id, x, y, s, "none"), glyphIds: core.glyphs(analysis).filter((g) => !g.blot).map((g) => g.id), world: guard("cover world", () => worldIds(analysis)) || [], sobriety: parseCover(src) ?? ({ ornate: 0.05, classic: 0.35, sober: 0.7, plain: 1 })[this.ext.coverStyle],
        verdict: analysis.verdict, burnt: !!(this.law && this.law.destroyed(name)), label: this.t("book.descriptive"),
      });
    }

    /** La note contient-elle un bloc `age` ? (le livre ne s'ouvre en musique que pour un Âge, pas pour n'importe quelle note) */
    async noteHasAge(file) { try { return !!file && core.extract(await this.app.vault.cachedRead(file)) !== null; } catch (e) { return false; } }

    async extendBook(view, cover) {
      const el = view.contentEl, spread = el.querySelector(".age-book__spread"); if (!spread || !this.law) return;
      const ext = this.ext, t = this.t, file = this.currentAgeFile; if (!file) return;
      el.toggleClass("age-book--leather", !!ext.leather);
      el.setAttr("data-age-mode", cover ? "cover" : view.mode); // le livre de liaison est plus haut (voir styles.ext.css)
      if (ext.leather && !spread.querySelector(".age-book__corner")) for (const c of ["tl", "tr", "bl", "br"]) spread.createDiv({ cls: `age-book__corner age-book__corner--${c}` });
      const src = core.extract(await this.app.vault.cachedRead(file)); if (src === null) return;
      const analysis = core.analyse(src, { seed: core.base(file.path) });
      const tabs = el.querySelector(".age-book__tabs");
      if (tabs && ext.coverTab) {
        const b = tabs.createEl("button", { text: t("book.cover"), cls: cover ? "is-active" : "" });
        tabs.insertBefore(b, tabs.firstChild); // couverture, livre descriptif, livre de liaison
        b.addEventListener("click", () => { view.mode = "cover"; view.render(); });
        if (cover) tabs.querySelectorAll("button").forEach((x) => { if (x !== b) x.removeClass("is-active"); });
      }
      if (cover) {
        const pal = el.querySelector(".age-book__palette"); if (pal) pal.remove();
        spread.empty(); spread.addClass("is-cover"); if (ext.leather) for (const c of ["tl", "tr", "bl", "br"]) spread.createDiv({ cls: `age-book__corner age-book__corner--${c}` });
        setMarkup(spread.createDiv({ cls: "age-book__covercontainer" }), this.coverFor(src, analysis, file, false));
        const act = el.createDiv({ cls: "age-book__coveractions" });
        act.createEl("button", { text: t("book.savecover") }).addEventListener("click", () => this.saveCover(file));
      } else if (view.mode === "descriptive") {
        const right = spread.querySelector(".age-book__page--right");
        if (right) X.renderExtras(this, right, { src, analysis, name: file.basename, compact: true });
      } else if (view.mode === "linking" && ext.linkLeaves !== false) this.leafLinking(view, spread, { src, analysis, file });
    }

    // Livre de liaison en trois pages « de gauche », une seule visible : glyphes + texte, vitre, liens.
    leafLinking(view, spread, own) {
      const L = spread.querySelector(".age-book__page--left"), R = spread.querySelector(".age-book__page--right"); if (!L || !R || spread.querySelector(".age-book__leaf")) return;
      const mk = (cls) => { const d = document.createElement("div"); d.className = cls; return d; }, t = this.t, ext = this.ext, leaf = (name) => { return mk("age-book__leaf age-book__leaf--" + name); };
      const pick = (sel, host) => host.querySelector(":scope > " + sel);
      const l0 = leaf("glyphs"), l1 = leaf("window"), l2 = leaf("links");
      for (const sel of [".age-book__strip", ".age-book__glimpse"]) { const n = pick(sel, L); if (n) l0.appendChild(n); }
      for (const sel of [".age-book__window", ".age-book__caption"]) { const n = pick(sel, L); if (n) l1.appendChild(n); }
      while (R.firstChild) l2.appendChild(R.firstChild);
      if (!l0.firstChild && own) { // pas de livre de liaison : la page montre les symboles de l'Âge lui-même et sa première phrase
        guard("symboles", () => {
          const pages = core.glyphs(own.analysis).slice(0, 8), size = 34, gap = 8;
          if (pages.length) {
            const strip = l0.createDiv({ cls: "age-book__strip" });
            setMarkup(strip, `<svg viewBox="0 0 ${pages.length * (size + gap)} ${size}" width="100%">` + pages.map((p, i) => core.glyphSvg(p.id, i * (size + gap), 0, size, p.severity)).join("") + "</svg>");
            const first = String(view.proseFor(own.file.path, own.src, own.analysis) || "").split(/(?<=[.!?])\s/)[0] || "";
            if (first) l0.createDiv({ cls: "age-book__glimpse", text: first.length > 170 ? first.slice(0, 167) + "…" : first });
          }
        });
      }
      if (!l0.firstChild) l0.createDiv({ cls: "age-book__none", text: t("leaf.none") });
      L.empty(); L.addClass("is-blank"); R.empty(); R.appendChild(l0); R.appendChild(l1); R.appendChild(l2); spread.addClass("is-leaves");
      const leaves = [l0, l1, l2], titles = [t("leaf.glyphs"), t("leaf.window"), t("leaf.links")];
      const nav = mk("age-book__leafnav"), dots = [0, 1, 2].map(() => { const d = document.createElement("span"); d.className = "age-book__dot"; nav.appendChild(d); return d; });
      R.appendChild(nav);
      const show = (i, sound) => {
        i = Math.max(0, Math.min(2, i)); const changed = i !== view.leafPage; view.leafPage = i;
        leaves.forEach((x, k) => x.toggleClass("is-shown", k === i));
        dots.forEach((d, k) => d.toggleClass("is-on", k === i));
        L.toggleClass("can-prev", i > 0); R.toggleClass("can-next", i < 2); L.setAttr("title", i > 0 ? titles[i - 1] : ""); R.setAttr("title", i < 2 ? titles[i + 1] : "");
        if (changed && armed && sound && ext.sound && ext.soundPage !== false) pageTurn(ext.volume);
      };
      let armed = false; show(view.leafPage || 0); armed = true;
      // on tourne les pages en cliquant la page de droite (suivante) ou de gauche (précédente), sans toucher aux contrôles
      const inert = (e) => e.target && e.target.closest && e.target.closest("a, button, .age-book__window, .age-book__book");
      R.addEventListener("click", (e) => { if (!inert(e)) show(view.leafPage + 1, true); });
      L.addEventListener("click", (e) => { if (!inert(e)) show(view.leafPage - 1, true); });
    }

    async saveCover(file) {
      const src = core.extract(await this.app.vault.read(file)); if (src === null) return new Notice(this.t("cover.noage"));
      const analysis = core.analyse(src, { seed: core.base(file.path) }), svg = this.coverFor(src, analysis, file, true);
      const dir = file.parent && file.parent.path !== "/" ? file.parent.path + "/" : "", path = `${dir}${file.basename} cover.svg`;
      const ex = this.app.vault.getAbstractFileByPath(path);
      if (ex instanceof TFile) await this.app.vault.modify(ex, svg); else await this.app.vault.create(path, svg);
      new Notice(this.t("cover.saved", { path }));
    }

    // ---- réglages ---------------------------------------------------------------------------------
    patchSettings() {
      const plugin = this, proto = core.SettingsTab.prototype, orig = proto.display;
      proto.display = function () { orig.call(this); guard("settings ui", () => addExtSettings(plugin, this.containerEl)); };
    }

    // ---- blocs de code, commandes, événements -----------------------------------------------------
    registerProcessors() {
      const live = (src, el, ctx, run) => {
        const inst = { refresh: () => run(), el }; this.live.add(inst);
        const c = new MarkdownRenderChild(el); c.onunload = () => this.live.delete(inst); ctx.addChild(c); return run();
      };
      this.registerMarkdownCodeBlockProcessor("relto", (src, el, ctx) => Promise.resolve(guard("relto", () => R.renderRelto(this, src, el, ctx))).catch((e) => console.warn("[Age Writer ext] relto", e)));
      this.registerMarkdownCodeBlockProcessor("relto-library", (src, el) => { guard("relto-library", () => R.renderReltoLibrary(this, src, el)); });
      this.registerMarkdownCodeBlockProcessor("age-journal", (src, el, ctx) => live(src, el, ctx, () => X.renderJournal(this, src, el, ctx).catch((e) => console.warn("[Age Writer ext] journal", e))));
      // texte D'ni en ligne : `dni:Atrus` (vue de lecture)
      this.registerMarkdownPostProcessor((el) => guard("dni inline", () => {
        for (const c of Array.from(el.querySelectorAll("code"))) {
          if (c.closest("pre")) continue;
          const m = /^dni:\s*(.+)$/i.exec(c.textContent || ""); if (!m) continue;
          const span = document.createElement("span"); span.className = "age-dni age-dni--inline"; span.textContent = this.ext.dniText && this.dni.hasFont() ? this.dni.textFor(m[1]) : m[1];
          if (this.ext.dniText && this.dni.hasFont()) span.style.fontFamily = this.dni.textStack(); else span.classList.add("is-latin");
          c.replaceWith(span);
        }
      }));
      this.registerMarkdownCodeBlockProcessor("dni", (src, el) => { guard("dni", () => X.renderDniBlock(this, src, el)); });
    }

    registerCommands() {
      this.addCommand({ id: "open-relto", name: "Open the Relto", callback: () => R.openRelto(this) });
      this.addCommand({ id: "open-guide", name: "Open the Age Writer guide", callback: () => G.openGuide(this) });
      this.addCommand({ id: "open-reference", name: "Open the Age Writer full reference", callback: () => G.openGuide(this, null, "full") });
      this.addCommand({ id: "open-relto-view", name: "Open the Relto view (large)", callback: () => R.openReltoView(this) });
      if (typeof this.registerView === "function") this.registerView(R.RELTO_VIEW, (leaf) => new R.ReltoView(leaf, this));
      this.addCommand({ id: "open-glyph-book", name: "Open the book of glyphs", callback: async () => { const ages = (await this.index.list()).filter((a) => a.glyphs && a.glyphs.length); RB.openGlyphBook(this, ages); } });
      this.addCommand({ id: "open-library-book", name: "Open a library note (Age blocks / Relto pages)", callback: () => RB.openLibraryBook(this) });
      this.addCommand({ id: "create-relto-page", name: "Create a Relto page", callback: () => R.createReltoPage(this) });
      this.addCommand({
        id: "create-exploration-journal", name: "Create the exploration journal for this Age",
        checkCallback: (check) => { const f = this.app.workspace.getActiveFile(); if (!f || f.extension !== "md") return false; if (!check) this.createJournal(f); return true; },
      });
      this.addCommand({
        id: "save-age-cover", name: "Save this Age's book cover (SVG)",
        checkCallback: (check) => { const f = this.app.workspace.getActiveFile(); if (!f || f.extension !== "md") return false; if (!check) this.saveCover(f); return true; },
      });
      this.addCommand({ id: "random-age", name: "Generate a random Age", callback: () => this.randomAge() });
      this.addCommand({ id: "stop-soundscape", name: "Stop the soundscape", callback: () => this.stopSound() });
    }

    /** Crée une note dans le dossier du refuge (créé au besoin) sans écraser : « Nom », « Nom 2 »… */
    async createNoteIn(name, body) {
      const { vault } = this.app, folder = (this.ext.reltoFolder || "Ages").replace(/^\/+|\/+$/g, "");
      if (folder && !vault.getAbstractFileByPath(folder)) await vault.createFolder(folder);
      let n = 1, path;
      do { path = `${folder ? folder + "/" : ""}${name}${n > 1 ? " " + n : ""}.md`; n++; } while (vault.getAbstractFileByPath(path));
      return vault.create(path, body);
    }

    /** Commande « Generate a random Age » : un monde tiré au hasard, cohérent et stable, ouvert aussitôt. */
    async randomAge() {
      const lang = this.lang(), names = new Set(this.app.vault.getMarkdownFiles().map((f) => f.basename));
      const check = (lines, name) => { const a = core.analyse(lines.join("\n"), { seed: name }); return !a || a.verdict === "stable"; };
      const ages = (await this.index.list()).filter((a) => a.name), link = ages.length ? ages[Math.floor(Math.random() * ages.length)].name : null; // un livre de liaison vers un Âge du coffre
      const note = AS.randomNote((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, lang, { check, taken: (nm) => names.has(nm), link });
      const f = await this.createNoteIn(note.name, note.body);
      new Notice(this.t("random.created", { name: f.basename }));
      await this.app.workspace.getLeaf(false).openFile(f);
      this.refreshLive();
    }

    /** Premier lancement : une note de bienvenue avec un Âge d'exemple (une seule fois, jamais chez un coffre qui a déjà des Âges). */
    async welcomeOnce() {
      const st = this.ext.state; if (st.welcomed) return;
      st.welcomed = true; this.saveExt();
      const has = (await this.index.list()).length > 0; if (has) return;
      const w = AS.welcomeNote(this.lang()), f = await this.createNoteIn(w.title, w.body);
      const n = new Notice("", 15000); n.noticeEl.empty();
      n.noticeEl.createSpan({ text: this.t("welcome.notice") + " " });
      n.noticeEl.createEl("button", { text: this.t("welcome.open") }).addEventListener("click", () => { n.hide(); this.app.workspace.getLeaf(false).openFile(f); });
      this.refreshLive();
    }

    async createJournal(file) {
      const src = core.extract(await this.app.vault.read(file));
      if (src === null) return new Notice(this.t("journal.noageblock"));
      new VoiceModal(this.app, async (voice) => {
        const folder = (this.ext.journalFolder || "").replace(/^\/+|\/+$/g, "") || (file.parent && file.parent.path !== "/" ? file.parent.path : "");
        if (folder && !this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
        const path = `${folder ? folder + "/" : ""}Journal — ${file.basename}.md`;
        const ex = this.app.vault.getAbstractFileByPath(path);
        const f = ex instanceof TFile ? ex : await this.app.vault.create(path, `---\n${obsidian.stringifyYaml({ journal_of: `[[${file.basename}]]`, journal_voice: voice })}---\n# Journal — ${file.basename}\n\n\`\`\`age-journal\nage: [[${file.basename}]]\nvoice: ${voice}\n\`\`\`\n`);
        await this.app.workspace.getLeaf(false).openFile(f);
      }).open();
    }

    registerEvents() {
      const { vault, metadataCache } = this.app;
      this.registerEvent(vault.on("modify", (f) => {
        if (!(f instanceof TFile) || f.extension !== "md") return;
        clearTimeout(this.lawTimers.get(f.path));
        this.lawTimers.set(f.path, window.setTimeout(() => { this.lawTimers.delete(f.path); this.observeFile(f); }, 1500));
        this.refreshLive();
      }));
      this.registerEvent(vault.on("rename", (f, old) => guard("rename", () => this.onRename(f, old))));
      this.registerEvent(vault.on("delete", (f) => { if (f instanceof TFile) { this.law.forget(f.basename); this.saveExt(); } }));
      this.registerEvent(metadataCache.on("changed", () => this.refreshLive()));
      const recheck = () => window.setTimeout(() => this.checkSound && this.checkSound(), 150);
      this.registerEvent(this.app.workspace.on("active-leaf-change", recheck));
      this.registerEvent(this.app.workspace.on("layout-change", recheck));
    }

    // ---- loi du Changement -------------------------------------------------------------------------
    async observeFile(f) {
      if (!this.ext.law) return;
      const src = core.extract(await this.app.vault.read(f)); if (src === null) return;
      const ev = this.law.observe(f.basename, core.analyse(src, { seed: f.basename, physics: false }), f.stat.mtime, guard("valeurs physiques", () => PH.parsePhysics(src).params));
      this.saveExt();
      if (ev) {
        new Notice(`${this.t("law.warning")}\n${describeChange(ev, this.t)}`, 9000);
        this.redrawEverything();
      }
    }

    async onRename(f, old) {
      if (!(f instanceof TFile) || f.extension !== "md") return;
      const oldName = old.replace(/^.*\//, "").replace(/\.md$/i, "");
      const src = core.extract(await this.app.vault.read(f));
      if (src === null) this.law.forget(oldName); else this.law.rename(oldName, f.basename, core.analyse(src, { seed: f.basename, physics: false }), guard("valeurs physiques", () => PH.parsePhysics(src).params));
      this.saveExt();
    }

    async initialScan() {
      let n = 0;
      for (const f of this.app.vault.getMarkdownFiles()) {
        const c = this.app.metadataCache.getFileCache(f);
        if (c && !(c.sections || []).some((s) => s.type === "code")) continue;
        const src = core.extract(await this.app.vault.cachedRead(f)); if (src === null) continue;
        if (!this.law.get(f.basename)) this.law.observe(f.basename, core.analyse(src, { seed: f.basename, physics: false }), f.stat.mtime);
        if (++n % 25 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      this.saveExt();
    }

    // ---- son ---------------------------------------------------------------------------------------
    async toggleSound(layers, btn, files = [], seed = "", factor = 1) {
      this.soundFactor = factor;
      const wasOn = btn.classList.contains("is-on");
      this.stopSound();
      if (wasOn) return;
      let ok = true;
      if (Object.keys(layers).length) ok = await this.sound.start(layers, { seed });
      for (const f of files) { try { const a = new Audio(this.app.vault.getResourcePath(f)); a.loop = true; a.volume = this.ext.volume; await a.play(); this.fileAudios.push(a); ok = true; } catch (e) { /* fichier illisible */ } }
      if (!ok) return void new Notice(this.t("sound.unavailable"));
      btn.addClass("is-on"); this.soundBtn = btn; this.watchSound();
    }
    /** Garde-fou : le son s'arrête si son bouton disparaît (autre note, vue fermée, mode d'affichage) ou n'est plus visible (autre onglet). */
    watchSound() {
      clearInterval(this.soundWatch);
      // la feuille (onglet) et la note où le son a été lancé : on coupe si la note change, si la feuille est
      // fermée ou cachée (autre onglet). Le bouton peut disparaître un instant (vue de lecture qui décharge
      // les sections lointaines, nouveau rendu du bloc) sans que le son s'arrête.
      const btn = this.soundBtn, leafEl = btn && btn.closest(".workspace-leaf");
      let leaf = null; this.app.workspace.iterateAllLeaves((l) => { if (!leaf && leafEl && l.containerEl === leafEl) leaf = l; });
      const fileOf = (l) => (l && l.view && l.view.file ? l.view.file.path : null), file = fileOf(leaf);
      // le bouton posé sur la vitre est caché quand un autre onglet du bloc est ouvert : on juge la visibilité du bloc entier, pas du bouton
      const hidden = (el) => { try { const x = (el.closest && el.closest(".age-panel[data-tab], .age-relto[data-tab]")) || el; return typeof x.checkVisibility === "function" && !x.checkVisibility(); } catch (e) { return false; } };
      const gone = () => {
        const b = this.soundBtn; if (!b) return true;
        if (b.isConnected && !hidden(b)) return false;
        if (!leaf || !leafEl || !file) return true;              // hors d'une note (vue livre…) : bouton parti = son parti
        if (!leafEl.isConnected || hidden(leafEl)) return true;  // onglet fermé ou caché
        return fileOf(leaf) !== file;                            // autre note dans le même onglet
      };
      this.checkSound = () => { if ((this.sound && this.sound.playing || this.fileAudios.length) && gone()) this.stopSound(); };
      this.soundWatch = window.setInterval(this.checkSound, 700);
    }
    /** Relance l'ambiance en cours avec d'autres couches (page coupée, volume, niveau zen). */
    restartSound(layers, seed) { if (this.sound && this.sound.playing) this.sound.start(layers, { seed }); }
    stopSound() {
      clearInterval(this.soundWatch);
      this.sound && this.sound.stop(); for (const a of this.fileAudios) a.pause(); this.fileAudios = [];
      if (this.soundBtn) { this.soundBtn.removeClass("is-on"); this.soundBtn = null; }
    }
  };
};
