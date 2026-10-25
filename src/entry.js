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
const { setMarkup, fitModalToFullscreen, rescueModals } = require("./util");
const { Law, adjustAnalysis, fissureStrain, strainable, forceAlteration, describeChange, worldIds, retouchFactor } = require("./law");
const { solitudeFactor, COVER_RE, parseCover, KEY_RE, FX_RE, STYLE_RE, TRAP_RE, DMG_RE, parseFx, parseStyle, parseTrap, parseDamage, applyDamage } = require("./mech");
const { Soundscape, staticBurst, openSequence, linkSound, pageTurn } = require("./sound");
const { coverSvg } = require("./cover");
const fx = require("./linkfx");
const { sceneOf, HOOKS: GEN_HOOKS } = require("./genscene");
const { DAY_RE, YEAR_RE, SIZE_RE, MOONS_RE, MOON_RE, parseSky } = require("./sky");
const { AMOUNT_RE, parseAmounts, applyAmounts } = require("./amounts");
const HV = require("./harvest"); /* la récolte pour la machine du Relto, et les granulés cuits (étape 4a′) */
const { rollLink } = fx;
const { makeT } = require("./i18n");
const { AgeIndex } = require("./index");
const X = require("./ui-extras");
const R = require("./ui-relto");
const RBK = require("./relto-book");
const RB = require("./relto-books");
const G = require("./guide");
const PH = require("./physics/index");
const AS = require("./ageseed");
const UW = require("./unwritten");
const WX = require("./weather");
const DFR = require("./descriptors-fr");
const MUT = require("./mutation");
const CAT = require("./wonders");
const DR = require("./dream");
const AT = require("./engine/age-text");
const DOSE = require("./dosage");
const LIFE = require("./life");
const RG = require("./rigor");
const OB = require("./observe");
const STAT = require("./status");
const CARRY = require("./carry");
const DEPTH = require("./depth");
const { SYSTEM_RE } = require("./starsystem");
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

  /** La machine, pour essayer (menu de la clé) : remplir les trémies, donner des granulés, finir la cuisson, vider. */
  class OvenTestModal extends FuzzySuggestModal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    getItems() { return ["fill", "poor", "white", "amber", "grey", "finish", "empty"]; }
    getItemText(v) { const k = "oven.test." + v; return this.plugin.t(k); }
    onChooseItem(v) { const msg = this.plugin.ovenTest(v); if (msg) new Notice(msg); }
  }

  /** La caverne, pour essayer (menu de la clé) : remettre le lac à zéro, des colonies, les endormir, les gaver ; chaque essai remplit le flacon. */
  class CaveTestModal extends FuzzySuggestModal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    getItems() { return ["reset", "few", "many", "asleep", "gorge", "flask", "reveal", "lit", "slab", "dream", "ink", "night", "slate", "slateback"]; }
    getItemText(v) { const k = "cave.test." + v; return this.plugin.t(k); }
    onChooseItem(v) { const msg = this.plugin.caveTest(v); if (msg) new Notice(msg); }
  }

  /** Le nom d'origine d'un Âge renommé : les noms gravés à l'observatoire qui ne sont plus ceux d'une note, ou ce qu'on tape (classe créée à la demande). */
  const formerNameModal = (app, cands, placeholder, onChoose) => {
    class FormerNameModal extends obsidian.SuggestModal {
      constructor() { super(app); this.setPlaceholder(placeholder); }
      getSuggestions(q) { const v = String(q || "").trim(), c = cands.filter((n) => n.toLowerCase().includes(v.toLowerCase())); return v && !c.includes(v) ? [v, ...c] : c; }
      renderSuggestion(v, el) { el.setText(v); }
      onChooseSuggestion(v) { onChoose(v); }
    }
    return new FormerNameModal();
  };

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
      // la note du chapitre « Modifier ce qui est écrit » : l'encre y sèche en 2 min au plus (ailleurs, un délai court ferait des altérations)
      this.law = new Law(this.ext.state.law, { dryMinutes: (name) => (R.storyWet(this).has(name) ? 0 : R.storyNotes(this).has(name) ? Math.min(2, this.ext.inkDry) : this.ext.inkDry), /* le monde étrange de l'histoire : son encre ne sèche plus (chapitre 14) */ healPerDay: () => this.ext.heal, ignored: (raw) => PH.isPhysicsLine(raw) || PH.isPhysicsStub(raw) });
      this.status = new STAT.Status(this.ext.state.status || (this.ext.state.status = {})); // le statut d'écrivain : le titre et les jours tenus par Âge
      guard("modal plein écran", () => { // les fenêtres modales (livre des glyphes, carnet de l'arpenteur…) restent visibles quand le Relto est en plein écran
        const mp = obsidian.Modal && obsidian.Modal.prototype, orig = mp && mp.open; if (!orig) return;
        const self = this; mp.open = function (...a) { const r = orig.apply(this, a); fitModalToFullscreen(this); return r; };
        self.register(() => { mp.open = orig; });
        self.registerDomEvent(document, "fullscreenchange", () => rescueModals(document)); // sortie du plein écran : aucune fenêtre ne doit rester coincée (elle bloquerait les clics)
      });
      GEN_HOOKS.doom = (name) => this.law.doom(name);
      GEN_HOOKS.opening = (name) => this.law.opening(name, this.ext.fissureDays); // les fissures s'ouvrent avec le temps
      this.dni = new Dni({ getMode: () => this.ext.numerals, adapter: this.app.vault.adapter, pluginDir: this.manifest.dir, getVaultFont: () => this.ext.vaultFont, getDniText: () => this.ext.dniText });
      this.soundFactor = 1; this.sound = new Soundscape(() => this.ext.volume * (this.soundFactor == null ? 1 : this.soundFactor));

      // crochets du moteur (voir build.js) : altération de la stabilité, poids de la solitude
      AGEX.adjust = (r, o, srcText) => {
        /* la loi et le statut connaissent un Âge sous le nom de sa note ; l'analyse, sous sa graine (`age_seed` après un renommage) */
        const key = o && o.seed ? guard("graine", () => this.ageNameOfSeed(o.seed)) || o.seed : null;
        let out = guard("adjust", () => (this.ext.law && key ? adjustAnalysis(r, this.law.effective(key)) : r)) || r;
        // livre-piège déclaré : ni livre de retour, ni fissure
        if (srcText && parseTrap(srcText)) out = { ...out, returnTo: null, stranded: true, fissure: null, trapped: true, home: "none" };
        if (srcText) out = guard("quantités", () => applyAmounts(out, parseAmounts(srcText), this.core && this.core.blocks, { weights: RG.weightsOf(this.ext), size: DOSE.worldSize(srcText), seed: o && o.seed })) || out;
        if (o && o.seed && !o.probe) out = guard("observation", () => this.observeFaults(o.seed, out)) || out; // loi 4 : la phrase des fautes légères mûrit (src/observe.js)
        if (srcText) out = applyDamage(out, parseDamage(srcText));
        if (srcText) { const wx = guard("météo", () => WX.parseWeather(srcText)); if (wx) out = { ...out, weather: wx, resolved: out.resolved ? { ...out.resolved, weather: wx } : out.resolved }; } // météo vivante : lue par la fenêtre (sceneOf) et la description, sans effet sur la stabilité
        if (srcText) out = guard("physique", () => this.applyPhysicsTo(out, srcText, o)) || out;
        if (o && o.seed) out = guard("portage", () => this.carryAdjust(out, o, srcText, key)) || out; /* porter (src/carry.js) : la couture, la dissonance, la source malade ; et la couture d'une source dont on porte */
        if (this.ext.law && o && o.seed) out = guard("symbiose", () => this.symbiosesOf(o.seed, out, !o.probe)) || out;
        if (o && o.seed && !o.probe && !(this.ext.law && this.law.get(key))) guard("merveilles", () => this.seeWonders(o.seed, out)); /* la face écrite se voit aussi sans la loi */ // la mutation et la symbiose (src/mutation.js) : les unions nouées soutiennent le monde ; le temps en noue d'autres
        if (this.ext.law && o && o.seed && !o.probe) out = guard("fissure", () => { // (un essai de retrait, `probe`, ne touche pas à l'état de la loi) // la fissure grandit : elle abîme un monde instable, et le condamne s'il n'est pas corrigé à temps
          const op = this.law.opening(key, this.ext.fissureDays), bad = strainable(out);
          if (this.law.tend(key, bad ? out.stability : 100, op)) { out.condemned = true; return bad || out.fissure === "open" || out.fissure === "submarine" ? forceAlteration(out, 10) : out; }
          return fissureStrain(out, op);
        }) || out;
        if (o && o.seed && !o.probe) guard("statut", () => this.statusWatch(key, out.stability));
        if (o && o.seed) out = guard("ardoise", () => this.slateAdjust(out, o)) || out; /* l'ardoise (src/slate.js) : ce qu'ils ont apporté aujourd'hui dans cet Âge */
        if (o && o.seed) out = guard("récolte", () => { /* un Âge qui écrit cendres, terreau, limon ou tourbe, et où quelque chose pousse, en donne une mesure par jour (lu, pas un essai) */
          const mt = (out.resolved && out.resolved.matter) || {}, gives = HV.givesOf(mt.written || [], PH.idsOfAnalysis(out), (mt.reactions || []).map((x) => (x && x.result) || x)); if (!gives.length) return out;
          const pool = this.poolOfAge(o.seed); if (!this.poolOpen(pool)) return out; /* un Âge d'un Relto histoire remplit la réserve de ce Relto, à partir du chapitre 10 */
          const X = this.poolExt(pool), now = this.law.now(), act = out.slateAct, hv = act && act.fertile ? require("./slate").harvestOf(gives, act.effect) : { list: gives, richFor: {} }; /* l'accord : la sorte du jour change (la brume : le terreau compte riche) ; le commandement n'engendre rien */
          const r0 = HV.richOf(out), richArg = Object.keys(hv.richFor).length ? Object.fromEntries(hv.list.map((id) => [id, !!(hv.richFor[id] || r0)])) : r0;
          if (!o.probe && HV.gather(X, key, hv.list, now, richArg)) this.saveExt(); /* riche ou pauvre : ce qu'est l'Âge à la première lecture du jour */
          const today = HV.gatheredToday(X, key, now);
          return { ...out, harvest: { gives: hv.list, today, rich: today ? HV.richToday(X, key, now) : r0, slate: hv.list.join() !== gives.join() || Object.keys(hv.richFor).length > 0 } };
        }) || out;
        return out;
      };
      // la graine d'un Âge renommé : sa propriété `age_seed` (posée au renommage), pour qu'il garde son monde et son étoile
      this.renamedSeeds = new Map(); // chemin → graine, posée au renommage (le cache des propriétés suit un peu plus tard)
      AGEX.seedName = (path) => { if (this.renamedSeeds.has(path)) return this.renamedSeeds.get(path); const f = this.app.vault.getAbstractFileByPath(path), fm = f ? (this.app.metadataCache.getFileCache(f) || {}).frontmatter : null; const v = fm && fm.age_seed; return v != null && String(v).trim() ? String(v).trim() : null; };
      AGEX.known = (path) => guard("palette", () => R.storyKnown(this, path)) || null;
      AGEX.ghosts = (path) => (R.storyKnown(this, path) ? 4 : 0);
      AGEX.ghostTip = () => this.t("story.ghost");
      AGEX.ghostWord = (word) => (this.lang() === "fr" ? DFR.tr(word) : word); // indices des glyphes non appris : dans la langue de l'interface
      AGEX.dosageNote = (d) => DOSE.note(d, this.lang() === "fr");
      AGEX.fissureNote = () => (this.lang() === "fr" ? "Durée · la fissure s'ouvre et le monde s'effrite" : "Duration · the fissure opens and the world crumbles");
      AGEX.lifeNote = (l) => LIFE.note(l, this.lang() === "fr");
      AGEX.symbiosisNote = (list) => guard("symbiose", () => this.symbiosisLine(list)) || "";
      this._carrySrc = new Map(); this._carryCache = new Map(); this._carryStack = []; this._carriedFrom = new Map();
      AGEX.expand = (text, o) => guard("portage", () => this.carryExpand(text, o)) || null;
      AGEX.carryNote = (c) => guard("portage", () => this.carryLine(c)) || "";
      this.depthCache = new Map();
      // la profondeur de l'équilibre : le test par retrait, à l'affichage du panneau (jamais à chaque frappe), mis en cache par texte, graine et rigueur
      AGEX.depthNote = (text, seed) => guard("profondeur", () => {
        if (CARRY.parseAll(text).length && this.carryOpen(seed)) return this.t("carry.depth"); /* un monde porté est toujours sur le fil (loi 1) */
        const key = `${RG.levelOf(this.ext)}|${RG.familiesOf(this.ext).join(",")}|${this.ext.physics}|${seed}|${text}`;
        let d = this.depthCache.get(key);
        if (d === undefined) {
          d = DEPTH.depthOf(text, (s) => core.analyse(s, { seed, draw: false, probe: true }), (l) => AGEX.skip(l)) || null;
          this.depthCache.set(key, d); if (this.depthCache.size > 300) this.depthCache.delete(this.depthCache.keys().next().value);
        }
        return DEPTH.note(d, this.lang() === "fr");
      }) || "";
      AGEX.ghostSky = (category, phrase) => (this.lang() === "fr" ? DFR.skyPhrase(category) : phrase);
      AGEX.noDraw = (seed) => seed != null && R.storyNoDraw(this).has(String(seed));
      AGEX.norm = (line) => guard("météo", () => WX.normalize(line)) || line; // `rain: sometimes, dawn` : pour le moteur, c'est `rain`
      AGEX.skip = (line) => PH.isPhysicsLine(line) || PH.isPhysicsStub(line) || KEY_RE.test(line) || FX_RE.test(line) || STYLE_RE.test(line) || DAY_RE.test(line) || MOONS_RE.test(line) || MOON_RE.test(line) || YEAR_RE.test(line) || SIZE_RE.test(line) || DOSE.WORLD_SIZE_RE.test(line) || AMOUNT_RE.test(line) || TRAP_RE.test(line) || DMG_RE.test(line) || COVER_RE.test(line) || SYSTEM_RE.test(line); // `system: Kerath` : la graine d'étoile partagée (télescope, étape 2)
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
      let mode = this.physicsMode(); if (mode === "off" || !r || !r.resolved || (o && o.physics === false)) return r;
      // la rigueur (src/rigor.js) : la famille « physique » fait payer la physique, même en mode facile, au poids qui lui revient
      const wPhys = RG.weightsOf(this.ext).physics; if (mode === "easy" && wPhys > 0) mode = "strict";
      const seed = (o && o.seed) || "", ids = [...PH.idsOfAnalysis(r)].sort().join(",");
      const key = `${mode}|${seed}|${ids}|${srcText}`;
      let ph = this.physCache.get(key);
      if (!ph) {
        ph = PH.physicsOf(r, srcText, seed, mode); this.physCache.set(key, ph);
        if (this.physCache.size > 1500) this.physCache.delete(this.physCache.keys().next().value);
      }
      // le mode « strict » du réglage Physique garde plein poids ; sinon la sévérité est multipliée par le poids de la rigueur
      return PH.applyPhysics(r, ph, mode, { severity: (Number(this.ext.physicsSeverity) || 1) * (this.physicsMode() === "strict" ? 1 : wPhys) });
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

    // ---- porter (src/carry.js ; claude/DESIGN-art-bahro.md §12) ------------------------------------------------
    /** La ligne `carry:` est-elle comprise pour cet Âge ? Dans un Relto histoire, quand la pierre de liaison est sur le bureau ; ailleurs, pas encore. */
    carryOpen(seed) {
      const pool = this.poolOfAge(seed); if (!pool) return !!this.bahroSt(null); /* le bac à sable : l'Art Bahro s'y ouvre après le 17 (§2) */
      return require("./story-hear").stoneHere(require("./story").get(this.ext.story || (this.ext.story = {}), pool), Date.now());
    }
    /**
     * L'état d'histoire qui décide de l'Art Bahro pour une réserve : celui de ce Relto histoire ; pour le bac à sable (pool null), celui d'un Relto
     * histoire dont le 17 est fini (sa fin vaut pour le bac à sable), ou null. (claude/DESIGN-art-bahro.md §2, §16)
     */
    bahroSt(pool) {
      const store = this.ext.story || (this.ext.story = {});
      if (pool) return require("./story").get(store, pool);
      for (const [k, v] of Object.entries(store)) if (v && v.stone && v.stone.ending) return require("./story").get(store, k);
      return null;
    }
    /** Ce que l'Âge a : de l'eau, du feu, quelque chose qui vit (l'intention de l'ardoise doit découler de lui, loi 11). */
    slateHas(a) {
      const { BIOMES } = require("./dosage"), ids = PH.idsOfAnalysis(a), has = (list) => list.some((id) => ids.has(id));
      return { water: has(BIOMES.water), fire: has(BIOMES.fire), living: [...ids].some((id) => this.blockAxis(id) === "ecological") };
    }
    /** L'acte du jour dans cet Âge (une intention envoyée, ou un don de l'accord), posé sur l'analyse pour la fenêtre et l'onglet Détails. */
    slateAdjust(out, o) {
      const pool = this.poolOfAge(o.seed), st = this.bahroSt(pool), SL = require("./slate"), now = this.law ? this.law.now() : Date.now();
      if (!st || !st.stone || !st.stone.ending) return out;
      let act = SL.actOf(this.poolExt(pool), o.seed, st.stone.ending, now);
      if (!act && st.stone.ending === "accord") { const g = SL.giftFor(pool || "sandbox", o.seed, this.slateHas(out), now); if (g) act = { effect: g, fertile: true, gift: true }; } /* un don, sans qu'on ait rien demandé */
      return act ? { ...out, slateAct: act } : out;
    }
    /** Un Livre s'ouvre : si l'ardoise attend, elle part pour cet Âge (le prochain Livre de ce Relto qu'on ouvre ; §16). */
    async slateOnOpen(f) {
      const now = Date.now(), seed = this.core.seed(f.path), pool = this.poolOfAge(seed), st = this.bahroSt(pool), SL = require("./slate");
      if (!st || !SL.arrived(st, now)) return;
      const X = this.poolExt(pool), sl = SL.stateOf(X, now); if (sl.sent || !SL.effectOf(sl.signs)) return;
      const text = this.core.extract(await this.app.vault.cachedRead(f)); if (text == null) return; /* une note sans bloc age n'est pas un Livre */
      const a = this.core.analyse(text, { seed, probe: true, draw: false }), warded = require("./ward").isWarded(this.wardExt(seed), seed);
      const out = SL.send(X, { seed, name: f.basename, warded, has: this.slateHas(a) }, st.stone.ending, now);
      if (out === "none" || out === "wait") return;
      this.saveExt(); if (out !== "stay") { this.index.invalidate(); this.refreshLive(); }
      new Notice(this.t(["slate.sent", out].join("."), { name: f.basename }), 8000);
    }
    /** La réserve du Relto d'un Âge, où vivent sa garde et ses fragments retenus (src/ward.js), ou null hors d'un Relto histoire. */
    wardExt(seed) { const pool = this.poolOfAge(seed); return pool ? this.poolExt(pool) : null; }
    /** L'index donne le texte des Âges qu'il lit : une source se relit sans attendre une lecture du disque. */
    carrySource(f, src) { if (this._carrySrc) this._carrySrc.set(f.path, { mtime: f.stat ? f.stat.mtime : 0, src }); }
    /** Le texte d'une source, s'il est connu ; sinon il est lu (une fois) et les vues se redessinent quand il arrive. */
    carryText(f) {
      const hit = this._carrySrc.get(f.path), mtime = f.stat ? f.stat.mtime : 0;
      if (hit && hit.mtime === mtime) return hit.src;
      if (!this._carryReading) this._carryReading = new Set();
      if (!this._carryReading.has(f.path)) {
        this._carryReading.add(f.path);
        this.app.vault.cachedRead(f).then((t) => { this._carrySrc.set(f.path, { mtime, src: this.core.extract(t) }); this._carryReading.delete(f.path); clearTimeout(this._carryTick); this._carryTick = window.setTimeout(() => { this.index.invalidate(); this.refreshLive(); }, 300); }).catch(() => this._carryReading.delete(f.path));
      }
      return hit ? hit.src : null;
    }
    /** La note d'une source, d'après son nom : le lien d'Obsidian, sinon la note de ce nom (d'abord dans le dossier de l'Âge qui porte). */
    carryFind(name, seed) {
      let f = null; try { f = this.app.metadataCache.getFirstLinkpathDest(name, this.agePathOfSeed(seed) || ""); } catch (e) { f = null; }
      if (f && f.extension === "md") return f;
      const n = String(name).trim().toLowerCase(), here = String(this.agePathOfSeed(seed) || "").replace(/[^/]*$/, ""), all = this.app.vault.getMarkdownFiles().filter((x) => x.basename.toLowerCase() === n);
      return all.find((x) => here && x.path.startsWith(here)) || all[0] || null;
    }
    /** L'axe d'un bloc (ciel, sol, vivant…), pour découper un fragment. */
    blockAxis(id) { const b = this.core && this.core.blocks && this.core.blocks.get ? this.core.blocks.get(id) : null; if (b && b.axis) return b.axis; if (!this._skyAxis) this._skyAxis = new Map(require("./engine/data/sky").SKY_ENTRIES.map((e) => [e.id, e.axis])); return this._skyAxis.get(id) || null; }
    /** La voix d'un Âge (src/imager.js) : son jour ; la physique facile est calculée au besoin (l'index la saute). */
    carryVoice(a, text, seed) {
      const w = a && a.physics ? a : guard("voix", () => PH.applyPhysics(a, PH.physicsOf(a, text, seed, "easy"), "easy")) || a;
      const f = require("./imager").targetsOf(w, seed).freq;
      return a && a.slateAct && a.slateAct.effect === "time" && Number.isFinite(f) ? f * 2 : f; /* l'ardoise, le temps : ce jour-là, la voix de l'Âge sonne à l'autre octave */
    }
    /**
     * Le texte que lit le moteur (hooks.expand) : chaque ligne `carry:` comprise devient son fragment, relu dans la source (il respire).
     * Une ligne refusée reste telle quelle, parmi celles que le moteur ne comprend pas, et le panneau dit pourquoi en une phrase.
     */
    carryExpand(text, o) {
      const lines = CARRY.parseAll(text); if (!lines.length || !o || !o.seed || !this.carryOpen(o.seed)) return null;
      const core = this.core, me = guard("graine", () => this.ageNameOfSeed(o.seed)) || String(o.seed), chain = [...this._carryStack, me];
      const info = { fragments: [], refused: [], lines: lines.map((l) => l.raw), ids: [], loop: false }, done = [], lifeTaken = new Set();
      /* la voix de cet Âge, sans ce qu'il porte : son jour à lui (l'accord se juge entre deux Âges d'origine ; le contre-sens demande l'octave) */
      const own = text.split("\n").filter((l) => !CARRY.isCarryLine(l)).join("\n"), ok0 = `own|${o.seed}|${own}`;
      let ownFreq = this._carryCache.get(ok0);
      if (ownFreq == null) { const a0 = core.analyse(own, { seed: o.seed, probe: true, draw: false }); ownFreq = this.carryVoice(a0, own, o.seed); this._carryCache.set(ok0, ownFreq); }
      info.ownFreq = ownFreq;
      const X0 = this.wardExt(o.seed), WARD = require("./ward"), meWarded = WARD.isWarded(X0, o.seed); /* un Livre gardé : rien n'en sort, rien n'y entre (§4) */
      const pool0 = this.poolOfAge(o.seed), end17 = pool0 ? require("./story-stone").endingOf(require("./story").get(this.ext.story || (this.ext.story = {}), pool0)) : null; /* après le 17 (§7) : l'accord refuse le triton et la source qui ne tient pas ; le commandement copie */
      for (const c of lines) {
        const refuse = (why) => info.refused.push({ raw: c.raw, why, what: c.what, from: c.from });
        if (!c.known || (c.contra && c.what === "sky")) { refuse("what"); continue; }
        const f = this.carryFind(c.from, o.seed); if (!f) { refuse("missing"); continue; }
        const g = CARRY.guardOf(chain, f.basename); if (g) { refuse(g); continue; }
        const useKept = (k, flag) => { done.push({ index: c.index, what: k.what, contra: !!k.contra, ids: k.ids }); info.fragments.push({ ...k, contra: !!k.contra, loop: false, from: f.basename, [flag]: true });
          for (const id of k.ids) if (!info.ids.includes(id)) info.ids.push(id);
          const byK = this._carriedFrom.get(f.basename) || new Map(); byK.set(me, CARRY.axisOf(k.what)); this._carriedFrom.set(f.basename, byK); };
        if (meWarded || WARD.isWarded(this.wardExt(core.seed(f.path)), core.seed(f.path))) { /* le sceau : ce qui était déjà porté reste tel quel (encre sèche, loi 15), il ne respire plus ; rien de neuf n'entre */
          const k = X0 && WARD.kept(X0, o.seed, c.raw); if (!k) { refuse("ward"); continue; }
          useKept(k, "kept"); continue; }
        if (this.ext.law && !this.law.get(f.basename)) { refuse("untouched"); continue; } /* on ne porte que d'un Livre ouvert (une note déjà lue ; §12.2) */
        if (end17 === "command" && X0) { const k = WARD.kept(X0, o.seed, c.raw); if (k) { useKept(k, "copied"); continue; } } /* le commandement : copié une fois, sûr et stérile ; il ne respire pas */
        const src = this.carryText(f); if (src == null) { refuse("pending"); continue; }
        const seed = core.seed(f.path), ck = `${f.path}|${f.stat ? f.stat.mtime : 0}|${chain.length}|${Math.floor(Date.now() / 60000)}`;
        let a = this._carryCache.get(ck);
        if (!a) {
          this._carryStack.push(me);
          try { a = core.analyse(src, { seed, probe: true, draw: false }); } finally { this._carryStack.pop(); }
          a = { a, freq: this.carryVoice(a, src, seed) }; this._carryCache.set(ck, a); if (this._carryCache.size > 200) this._carryCache.delete(this._carryCache.keys().next().value);
        }
        if (c.contra) { const ac = require("./imager-guild").accordOf({ freq: ownFreq }, { freq: a.freq }); if (!ac || !ac.octave) { refuse("octave"); continue; } } /* la clause de Torus : à contre-sens, seulement à l'octave */
        if (end17 === "accord") { /* l'accord : ils peuvent refuser (la contrainte rendait tout facile) */
          if (!(a.a.stability >= 75)) { refuse("sick17"); continue; }
          const ac3 = require("./imager-guild").accordOf({ freq: ownFreq }, { freq: a.freq }); if (ac3 && ac3.degree === "clash") { refuse("tritone"); continue; } }
        const life = c.what !== "sky" && !lifeTaken.has(f.path);
        const ids = CARRY.fragmentOf(a.a, c.what, (id) => this.blockAxis(id), { life }); if (!ids.length) { refuse("empty"); continue; }
        if (life) lifeTaken.add(f.path);
        const loop = CARRY.carriesFrom(src, me); if (loop) info.loop = true; /* deux Âges qui se portent l'un l'autre : la boucle */
        done.push({ index: c.index, what: c.what, contra: c.contra, ids });
        const frag = { what: c.what, contra: c.contra, loop, from: f.basename, path: f.path, ids, srcStability: a.a.stability, srcFreq: a.freq, ...(end17 === "command" ? { copied: true } : {}) }; info.fragments.push(frag);
        if (X0 && WARD.keep(X0, o.seed, c.raw, frag)) this.saveExt(); /* retenu : si un sceau tombe ensuite, ce fragment reste tel quel */
        for (const id of ids) if (!info.ids.includes(id)) info.ids.push(id);
        const by = this._carriedFrom.get(f.basename) || new Map(); by.set(me, CARRY.axisOf(c.what)); this._carriedFrom.set(f.basename, by); /* la couture, chez la source aussi (la source perd un lieu, jamais un ciel, même à contre-sens) */
      }
      const out = done.length ? CARRY.expandText(text, done, (id) => this.blockAxis(id), (l) => AGEX.norm(l.trim())) : text;
      return { text: out, info };
    }
    /** Les prix du portage, dans l'analyse (hooks.adjust) ; l'accord de chaque fragment se dit en mots, jamais en chiffre. */
    carryAdjust(out, o, srcText, key) {
      let r = out; const c = o.carry ? { ...o.carry, fragments: o.carry.fragments.map((f) => ({ ...f })) } : null;
      if (c && c.fragments.length) {
        const rf = Number.isFinite(c.ownFreq) ? c.ownFreq : this.carryVoice(r, srcText, o.seed), GI = require("./imager-guild");
        for (const f of c.fragments) { const ac = GI.accordOf({ freq: rf }, { freq: f.srcFreq }); f.degree = ac ? ac.degree : "rub"; f.interval = ac ? ac.name : ""; f.beyond = !!(ac && ac.octaves && ac.name !== "octave"); }
        r = CARRY.applyCosts(r, c.fragments, null);
      }
      const by = key ? this._carriedFrom.get(key) : null, takenBy = by ? [...by.keys()] : [];
      if (takenBy.length) { const seams = {}; for (const axis of by.values()) seams[axis] = (seams[axis] || 0) + 1; r = CARRY.applyCosts(r, [], seams); }
      if (c || takenBy.length) r = { ...r, carry: { ...(c || { fragments: [], refused: [], lines: [], ids: [] }), takenBy } };
      return r;
    }
    /** La ligne du panneau : ce que l'Âge porte, l'accord de chaque fragment, ce qui est refusé, et ce qu'on a pris chez lui. */
    carryLine(c) {
      if (!c) return "";
      const t = this.t, out = [], what = (w) => t(["carry.what", w].join(".")), deg = (d) => t(["carry.deg", d || "rub"].join("."));
      for (const f of c.fragments || []) out.push(t(f.contra ? "carry.frag.contra" : "carry.frag", { what: what(f.what), from: f.from, deg: deg(f.degree) }) + (f.srcStability < 75 ? " " + t("carry.sick") : "") + (f.kept ? " " + t("carry.kept", { from: f.from }) : "") + (f.copied ? " " + t("carry.copied", { from: f.from }) : ""));
      if (c.loop) out.push(t("carry.loop"));
      for (const x of c.refused || []) if (x.why !== "pending") out.push(t(["carry.why", x.why].join("."), { from: x.from, what: x.what }));
      if ((c.takenBy || []).length) out.push(t("carry.taken", { names: c.takenBy.join(", ") }));
      return out.length ? t("carry.head") + " " + out.join(" ") : "";
    }

    // ---- la mutation et la symbiose (src/mutation.js) ------------------------------------------------
    /** Le nom d'un élément dans une phrase : son premier mot descripteur, dans la langue de l'interface. */
    /** Le nom d'un bloc dans les phrases de la mutation : celui qu'on écrit dans le livre (`water`, `frozen_world`), choix de l'auteur (22 oct.). */
    wordOf(id) { return String(id || ""); }
    /** Applique les unions d'un Âge ; si `live` (pas un essai), le temps passe : la pression monte ou retombe, une union peut se nouer. */
    symbiosesOf(seed, r, live) {
      const a = this.law.get(seed) || this.law.get(guard("graine", () => this.ageNameOfSeed(seed)) || ""); if (!a) return r; /* un Âge renommé : la loi le connaît sous son nom actuel, l'analyse sous sa graine */
      if (live && this.ext.mutation !== false) {
        const born = MUT.tick(a, MUT.applySymbioses(r, a, this.law.now()), seed, this.law.now(), { danger: (a.dose || 0) > 0 && !a.condemned }); /* rongé par la fissure : le monde se défend */
        if (born) {
          this.saveExt(); const w = CAT.compositeOf(born);
          new Notice(this.t(born.rare ? "mut.rare" : "mut.born", { name: seed, a: this.wordOf(born.a), b: this.wordOf(born.b) }) + (w ? " " + this.t("mut.wonder", { w: CAT.nameOf(w, this.lang() === "fr") }) : ""), 12000);
        }
      }
      const out = MUT.applySymbioses(r, a, this.law.now());
      if (live) guard("merveilles", () => this.seeWonders(seed, out));
      return out;
    }
    /**
     * Le nom actuel de la note d'un Âge, d'après sa graine (un Âge renommé garde son ancien nom en `age_seed`), ou null s'il n'existe
     * plus. Table refaite au renommage et à la suppression.
     */
    ageNameOfSeed(seed) {
      if (!seed) return null;
      const all = this.app.vault.getMarkdownFiles();
      if (!this._seedNames || this._seedCount !== all.length) { /* une note créée ou supprimée depuis : la table se refait */
        const map = new Map();
        const paths = new Map(); this._seedCount = all.length;
        for (const f of all) { const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter, s = fm && fm.age_seed != null && String(fm.age_seed).trim() ? String(fm.age_seed).trim() : f.basename; if (!map.has(s) || s === f.basename) { map.set(s, f.basename); paths.set(s, f.path); } }
        this._seedNames = map; this._seedPaths = paths;
      }
      return this._seedNames.get(String(seed)) || null;
    }
    /** La note d'un Âge, d'après sa graine (le même parcours que son nom). */
    agePathOfSeed(seed) { if (!seed) return null; this.ageNameOfSeed(seed); return (this._seedPaths && this._seedPaths.get(String(seed))) || null; }
    /** La réserve d'un Âge (section 19.2) : celle du Relto histoire dont il est dans le dossier, ou le bac à sable (null). */
    poolOfAge(seed) { const p = this.agePathOfSeed(seed); return p ? guard("réserve", () => R.storyPoolOfPath(this.app, p)) || null : null; }
    /** Les souvenirs de la chambre, avec le nom actuel de leur Âge et `gone` s'il n'existe plus. */
    wondersShown() {
      const box = this.ext.wonders && typeof this.ext.wonders === "object" ? this.ext.wonders : {}, out = {};
      for (const [id, v] of Object.entries(box)) { const name = guard("souvenir", () => this.ageNameOfSeed(v && v.age)); out[id] = { ...v, age: name || (v && v.age) || "", gone: !name }; }
      return out;
    }
    /** Laisser partir un souvenir (après confirmation) ; `id` absent : toute la chambre. Une merveille encore là reviendra quand on la reverra. */
    forgetWonders(id, done) {
      const fr = this.lang() === "fr", all = id == null, plugin = this;
      const name = all ? "" : CAT.nameOf(id, fr);
      class Ask extends obsidian.Modal {
        onOpen() {
          this.contentEl.createEl("p", { text: all ? plugin.t("mem.clear.ask") : plugin.t("mem.forget.ask", { w: name }) });
          const row = this.contentEl.createDiv({ cls: "modal-button-container" });
          const yes = row.createEl("button", { cls: "mod-warning", text: all ? plugin.t("mem.clear.yes") : plugin.t("mem.forget.yes") });
          const no = row.createEl("button", { text: plugin.t("mem.no") });
          yes.addEventListener("click", () => { if (plugin.ext.wonders) { if (all) plugin.ext.wonders = {}; else delete plugin.ext.wonders[id]; plugin.saveExt(); } this.close(); if (done) done(true); });
          no.addEventListener("click", () => { this.close(); if (done) done(false); });
        }
        onClose() { this.contentEl.empty(); }
      }
      new Ask(this.app).open();
    }
    /** L'appentis de la machine se montre dès que la récolte a commencé (un Âge a donné une première mesure). */
    /**
     * Les réserves (section 19.2) : la récolte, la machine, les granulés et la caverne existent une fois pour le bac à sable
     * (`ext` lui-même : les données d'avant restent là) et une fois par Relto histoire (`ext.storyPools[clé]`, clé = nom +
     * graine, comme l'avancement de l'histoire). `pool` : la clé d'un Relto histoire, ou rien (le bac à sable).
     */
    poolExt(pool) {
      if (!pool) return this.ext;
      const all = this.ext.storyPools && typeof this.ext.storyPools === "object" ? this.ext.storyPools : (this.ext.storyPools = {});
      return all[pool] && typeof all[pool] === "object" ? all[pool] : (all[pool] = {});
    }
    /** La réserve du Relto où l'on a été en dernier (les commandes d'essai agissent sur elle). */
    lastPool() { return this._lastPool || null; }
    /** Dans un Relto histoire, la machine attend le chapitre 10 : la lettre du 9 doit avoir été reçue (section 19.3). */
    poolOpen(pool) { if (!pool) return true; const st = this.ext.story && this.ext.story[pool]; return !!(st && Array.isArray(st.done) && st.done.includes("strange")); }
    /** L'appentis de la machine se montre dès que la récolte a commencé (un Âge a donné une première mesure), dans cette réserve. */
    ovenShown(pool) { const X = this.poolExt(pool); return this.poolOpen(pool) && !!(X.harvest && typeof X.harvest === "object"); }
    /** La machine (src/oven.js) : les réglages, la fournée, les trémies, l'étagère ; une fournée finie depuis longtemps attend sur le plateau. */
    ovenState(now, pool) { const X = this.poolExt(pool), OV = require("./oven"), t = now || Date.now(), o = OV.stateOf(X); const h = HV.stateOf(X); return { oven: o, phase: OV.phaseOf(o, t), stock: h.stock, rich: h.rich, pellets: HV.pelletsOf(X) }; }
    /** Un geste sur la machine : "add" (i : une mesure dans la colonne), "empty" (vider la colonne), "time" / "temp" / "press" (valeur), "door" (cuire), "tray" (prendre la fournée), "drain" (la vidanger), "burn" (arg : jeter au feu une capsule de l'étagère). Renvoie un message à montrer, ou null. */
    ovenAct(act, arg, pool) {
      const X = this.poolExt(pool), OV = require("./oven"), now = Date.now(), t = (k, v) => { const s = this.t ? this.t(k) : k; return v ? s.replace("{what}", v) : s; };
      if (act === "door") { const why = OV.start(X, now); if (why === "busy") return t("oven.door.busy"); if (why === "empty") return t("oven.door.empty"); if (why === "notime") return t("oven.door.notime"); this.saveExt(); return null; }
      if (act === "tray") { const got = OV.collect(X, now); if (!got) return null; if (got.kind === "white") X.cookedWhite = true; /* le chapitre 10 */ this.saveExt(); return got.kind === "dust" ? t("oven.took.dust") : got.kind === "white" || got.kind === "amber" ? t(["oven", "q", got.kind, got.fine ? "fine" : "plain"].join(".")) : null; }
      if (act === "drain") { const got = OV.drain(X, now); if (!got) return null; this.saveExt(); return t("oven.drained"); }
      if (act === "burn") { const why = OV.burn(X, arg, now); if (why === "busy") return t("oven.burn.busy"); if (why) return null; this.saveExt(); return t(arg === "grey" ? "oven.burnt.grey" : arg === "amber" ? "oven.burnt.amber" : "oven.burnt"); }
      const res = OV.set(X, act, arg, now);
      if (res === true) this.saveExt();
      if (res === "full") return t("oven.add.full");
      if (res === "max") return t("oven.add.max");
      if (typeof res === "string" && res.startsWith("none:")) { const ing = "oven.ing." + res.slice(5); return t("oven.add.none", t(ing)); }
      return null;
    }
    /** Les essais de la machine : "fill" (neuf mesures de chaque), "white" / "amber" / "grey" (cinq granulés), "finish" (la fournée sort), "empty" (tout à zéro). */
    ovenTest(v) {
      const X = this.poolExt(this.lastPool()), OV = require("./oven"), h = HV.stateOf(X), P = HV.pelletsOf(X), o = OV.stateOf(X), t = (k) => (this.t ? this.t(k) : k);
      if (v === "fill") for (const id of HV.INGREDIENTS) { h.stock[id] = Math.max(h.stock[id], 9); h.rich[id] = h.stock[id]; }
      else if (v === "poor") for (const id of HV.INGREDIENTS) { h.stock[id] = Math.max(h.stock[id], 9); h.rich[id] = 0; } /* des Âges abîmés : tout ce qui est dans les trémies est pauvre */
      else if (v === "white" || v === "amber" || v === "grey") P[v] += 5;
      else if (v === "finish") { if (!o.batch) return t("oven.test.nobatch"); o.batch.at = Date.now() - o.batch.dur - 1; }
      else if (v === "empty") { for (const id of HV.INGREDIENTS) { h.stock[id] = 0; h.rich[id] = 0; } P.white = P.amber = P.grey = 0; P.fine = { white: 0, amber: 0 }; o.column = []; o.colRich = []; o.levers = [0, 0, 0, 0]; o.batch = null; }
      this.saveExt();
      const k = "oven.test." + v; return t("oven.test.done") + " " + t(k) + (v === "fill" || v === "poor" ? " " + t("oven.test.reopen") : "");
    }
    /** La caverne Bahro (src/relto-cave.js) : les granulés de l'étagère, le granulé qui tombe ; un granulé perdu (personne en bas) s'en va sans bruit. */
    caveState(pool) {
      const X = this.poolExt(pool), P = HV.pelletsOf(X), cv = (X.cave = X.cave && typeof X.cave === "object" ? X.cave : { drop: null, revealed: 0 }), CV = require("./relto-cave");
      if (cv.drop && Date.now() > cv.drop.at + CV.FALL_MS + CV.LIGHT_MS) { if (cv.drop.q === "amber" && !cv.drop.fed) { cv.colonies = (cv.colonies || 0) + (cv.drop.fine ? 2 : 1); cv.fedAt = cv.drop.at + CV.FALL_MS; require("./scope").logFeed(cv, cv.fedAt); } cv.drop = null; this.saveExt(); } /* un ambré nourrit le bassin, qu'on soit en bas ou non */
      const pick = cv.pick && P[cv.pick] > 0 ? cv.pick : P.white > 0 ? "white" : P.amber > 0 ? "amber" : P.grey > 0 ? "grey" : null;
      return { good: P.white, amber: P.amber, bad: P.grey, pick, drop: cv.drop, revealed: cv.revealed || 0, shut: !!cv.shut, colonies: cv.colonies || 0, fedAt: cv.fedAt || 0, slabs: cv.slabs || {}, fine: { ...(P.fine || {}) } }; /* le blanc : l'éclair ; l'ambré : le lac ; le gris : rien */
    }
    /** Choisir dans la niche la sorte de granulé que le bouton lâchera ("white", "amber", "grey"). */
    cavePick(kind, pool) { const X = this.poolExt(pool); this.caveState(pool); if (["white", "amber", "grey"].includes(kind)) { X.cave.pick = kind; this.saveExt(); } }
    /** La chaîne de la trappe : ferme ou rouvre la fente du plafond (la caverne retourne au noir). */
    caveHatch(pool) { const X = this.poolExt(pool); this.caveState(pool); X.cave.shut = !X.cave.shut; this.saveExt(); }
    /** Le bouton : lâche un granulé (un bon s'il y en a, sinon un gris). Renvoie sa qualité, ou null. */
    caveDrop(pool) {
      const X = this.poolExt(pool), st = this.caveState(pool); if (st.drop) return null;
      const P = HV.pelletsOf(X), kind = st.pick; if (!kind) return null; const q = kind === "white" ? "good" : kind === "amber" ? "amber" : "bad";
      const fine = !!(P.fine && P.fine[kind] > 0); if (fine) P.fine[kind] -= 1; /* le bouton lâche d'abord le meilleur */
      P[kind] -= 1; HV.pelletsOf(X); X.cave.drop = { at: Date.now(), q, fine, seen: false }; this.saveExt(); return q;
    }
    /** On était en bas quand la lueur est montée : une révélation de plus (l'étape 4c y lira le code). */
    caveSeen(pool) { const X = this.poolExt(pool), cv = X.cave; if (!cv || !cv.drop || cv.drop.seen) return; cv.drop.seen = true; if (cv.drop.q === "amber") { cv.drop.fed = true; cv.colonies = (cv.colonies || 0) + (cv.drop.fine ? 2 : 1); cv.fedAt = Date.now(); require("./scope").logFeed(cv, cv.fedAt); } else cv.revealed = (cv.revealed || 0) + 1; this.saveExt(); } /* l'ambré : une colonie de plus ; le blanc : une révélation */
    /**
     * La dalle aux yeux (étape 4c) : tourner la pierre `i` d'un cran, sur la dalle du Relto `rel` ({ name, seed }). Il faut
     * l'avoir vue à la lumière (une révélation). Les six justes : elle s'ouvre et le reste. Renvoie "turn", "open" ou null.
     */
    caveSlab(i, rel, pool) {
      const X = this.poolExt(pool), cv = (this.caveState(pool), X.cave), FC = require("./fresco"); if (!(cv.revealed > 0) || !(i >= 0 && i < FC.CODE_LEN)) return null;
      const name = (rel && rel.name) || "Relto", seed = (rel && rel.seed) || 0, key = require("./telescope").keyOf(name, seed), slabs = (cv.slabs = cv.slabs && typeof cv.slabs === "object" ? cv.slabs : {});
      const s = (slabs[key] = slabs[key] && typeof slabs[key] === "object" ? slabs[key] : { turns: [0, 0, 0, 0, 0, 0] }); if (s.open) return null;
      s.turns = Array.from({ length: FC.CODE_LEN }, (_, k) => (s.turns && s.turns[k]) || 0); s.turns[i] = (s.turns[i] + 1) % FC.RING;
      if (FC.slabOf(name, seed, s.turns).right) { s.open = true; s.openedAt = Date.now(); }
      this.saveExt(); return s.open ? "open" : "turn";
    }
    /** Le flacon du microscope : on le remplit au bassin ; il garde l'eau de ce jour-là (src/scope.js). Renvoie un message. */
    caveSample(pool) { const X = this.poolExt(pool); this.caveState(pool); require("./scope").sample(X.cave, Date.now()); this.saveExt(); return this.t ? this.t("cave.sampled") : "cave.sampled"; }
    /** Ce que lit le microscope : le flacon, et les granulés de l'étagère (pour les coupelles). */
    scopeState(pool) {
      const X = this.poolExt(pool), cv = X.cave && typeof X.cave === "object" ? X.cave : {};
      if (cv.flask && cv.flask.colonies > 0 && !cv.looked) { cv.looked = true; this.saveExt(); } /* une goutte vivante regardée (le chapitre 12) */
      return { flask: cv.flask || null, pellets: HV.pelletsOf(X) };
    }
    /** Les essais de la caverne (menu de la clé) : "reset" (le lac à zéro), "few" / "many" (des colonies nourries), "asleep" (oubliées depuis une semaine), "gorge" (trois ambrés dans l'heure), "flask" (remplir le flacon). */
    caveTest(v) {
      const pool = this.lastPool(), X = this.poolExt(pool), SC = require("./scope"), cv = (this.caveState(pool), X.cave), now = Date.now(), t = (k) => (this.t ? this.t(k) : k);
      if (v === "ink" || v === "night") { /* le chapitre 14, pour essayer sans attendre : la clé de la réserve est celle de l'avancement du Relto histoire */
        if (!pool) return t("cave.test.nostory");
        const HEAR = require("./story-hear"), h = HEAR.stateOf(require("./story").get(this.ext.story || (this.ext.story = {}), pool));
        if (v === "ink") { h.inkAt = now; if (!Number.isFinite(h.freq)) h.freq = 12; } else { h.visit = now - HEAR.DAY - 1000; h.cried = h.cried || now; }
        this._hearCache = null; this.saveExt(); return t("oven.test.done") + " " + t(["cave.test", v].join("."));
      }
      if (v === "slate" || v === "slateback") { /* l'ardoise, pour essayer sans refaire l'histoire : le 17 fini dans l'accord, depuis hier ; ou l'ardoise revenue, effacée */
        if (!pool) return t("cave.test.nostory");
        const st = require("./story").get(this.ext.story || (this.ext.story = {}), pool);
        if (v === "slate") { st.stone = st.stone && st.stone.ending ? st.stone : { ending: "accord", endedAt: now - 2 * 86400000 }; if (!st.done.includes("stone")) st.done.push("stone"); }
        else delete X.slate;
        this.saveExt(); this.refreshLive(); return t("oven.test.done") + " " + t(["cave.test", v].join("."));
      }
      if (v === "reset") { cv.colonies = 0; cv.fedAt = 0; cv.feeds = []; cv.revealed = 0; cv.flask = null; cv.drop = null; cv.slabs = {}; }
      else if (v === "reveal") { cv.revealed = (cv.revealed || 0) + 1; this.saveExt(); return t("oven.test.done") + " " + t("cave.test.reveal"); }
      else if (v === "slab") { cv.slabs = {}; this.saveExt(); return t("oven.test.done") + " " + t("cave.test.slab"); }
      else if (v === "dream") { delete X.dreams; this.saveExt(); return t("oven.test.done") + " " + t("cave.test.dream"); } /* on peut rêver à nouveau aujourd'hui */
      else if (v === "lit") { if (!(cv.revealed > 0)) cv.revealed = 1; cv.drop = { at: now - require("./relto-cave").FALL_MS - 200, q: "good", fine: true, seen: true }; this.saveExt(); return t("oven.test.done") + " " + t("cave.test.lit"); }
      else if (v === "few" || v === "many") { cv.colonies = v === "few" ? 3 : 200; cv.fedAt = now - 3600000; cv.feeds = [now - 3600000]; }
      else if (v === "asleep") { if (!(cv.colonies > 0)) cv.colonies = 30; cv.fedAt = now - 7 * SC.DAY; cv.feeds = [cv.fedAt]; }
      else if (v === "gorge") { if (!(cv.colonies > 0)) cv.colonies = 12; for (let i = 3; i >= 1; i--) SC.logFeed(cv, now - i * 600000); cv.fedAt = now - 600000; }
      if (v !== "reset") SC.sample(cv, now);
      this.saveExt();
      const k = "cave.test." + v; return t("oven.test.done") + " " + t(k);
    }
    // ---- le Rêve (étape 4d ; src/dream.js) -------------------------------------------------------------
    /** La clé d'un Âge pour le compte des rêves : sa graine (un Âge renommé garde la sienne). */
    dreamKey(age) { return age ? String(guard("graine", () => core.seed(age.path)) || age.path || age.name) : ""; }
    /** Le jour du dernier rêve de cet Âge, dans la réserve du Relto (bac à sable ou Relto histoire), ou null. */
    dreamLast(age, pool) { const X = this.poolExt(pool), v = X.dreams && X.dreams[this.dreamKey(age)]; return typeof v === "number" ? v : null; }
    /** Un rêve est compté dès qu'on entre : un par Âge et par jour. */
    dreamMark(age, pool) { const X = this.poolExt(pool), now = Date.now(); (X.dreams = X.dreams && typeof X.dreams === "object" ? X.dreams : {})[this.dreamKey(age)] = DR.dayOf(now, new Date(now).getTimezoneOffset()); this.saveExt(); }
    /** Emporter un orbe en rêve (ou le reposer) : un seul guide à la fois ; il revient dans la chambre au réveil. */
    toggleDreamGuide(id) { const back = this.ext.dreamGuide === id; this.ext.dreamGuide = back ? null : id; this.saveExt(); return this.t(back ? "dream.guide.left" : "dream.guide.taken"); }
    /** Adopter une chose vue en rêve : écrire son bloc, retirer la ligne qui cause la faute, ou garder la phrase sur l'orbe. Seulement au clic. */
    async dreamAdopt(path, it, text) {
      try {
        if (it.line && it.line.face) { const w = this.ext.wonders && this.ext.wonders[it.line.face]; if (!w) return false; w.face = text; this.saveExt(); return true; }
        const f = this.app.vault.getAbstractFileByPath(path); if (!(f instanceof TFile) || !it.line) return false;
        let done = false; const edit = (txt) => { const out = it.line.add ? AT.addLine(txt, it.line.add) : it.line.remove ? AT.removeLine(txt, it.line.remove) : null; if (out == null || out === txt) return txt; done = true; return out; };
        if (typeof this.app.vault.process === "function") await this.app.vault.process(f, edit); else await this.app.vault.modify(f, edit(await this.app.vault.read(f)));
        return done;
      } catch (e) { console.warn("[Age Writer ext] rêve, adopter", e); return false; }
    }
    /** Le réveil : le guide reprend sa place ; sans guide rien ne reste ; avec lui, le panneau propose une ligne par chose regardée. */
    dreamWoke(res) {
      if (!res) return;
      if (this.ext.dreamGuide) { this.ext.dreamGuide = null; this.saveExt(); }
      if (!res.data) return;
      if (!res.guided) return void new Notice(this.t("dream.woke.alone"));
      if (!res.seen || !res.seen.length) return void new Notice(this.t("dream.woke.nothing"));
      const plugin = this, t = (k, v) => plugin.t(k, v), fr = this.lang() === "fr";
      const textOf = (it) => (it.kind === "fault" ? it.text : it.kind === "possible" ? t("dream.possible", { b: it.id }) : t("dream.wonder", { w: CAT.nameOf(it.id, fr), a: it.a, b: it.b, k: it.keystone || it.a }));
      class Panel extends obsidian.Modal {
        onOpen() {
          const el = this.contentEl; el.addClass("age-dream-panel");
          el.createEl("h3", { text: t("dream.panel.title", { a: res.data.name }) });
          el.createEl("p", { cls: "age-dream-panel__intro", text: t("dream.panel.intro") });
          for (const it of res.seen) {
            const row = el.createDiv({ cls: "age-dream-panel__row" }), text = textOf(it);
            row.createDiv({ cls: "age-dream-panel__kind", text: t(["dream", "panel", it.kind].join(".")) });
            row.createDiv({ cls: "age-dream-panel__text", text });
            const act = !it.line ? null : it.line.add ? t("dream.panel.add", { b: it.line.add }) : it.line.remove ? t("dream.panel.remove", { b: it.line.remove }) : it.line.face ? t("dream.panel.face") : null;
            if (!act) continue;
            const btn = row.createEl("button", { text: act });
            btn.addEventListener("click", async () => { btn.disabled = true; const ok = await plugin.dreamAdopt(res.data.path, it, text); if (ok) btn.setText(t("dream.panel.done")); else btn.disabled = false; });
          }
          const bar = el.createDiv({ cls: "modal-button-container" }); bar.createEl("button", { text: t("dream.panel.close") }).addEventListener("click", () => this.close());
        }
        onClose() { this.contentEl.empty(); }
      }
      new Panel(this.app).open();
    }
    /** La chambre des souvenirs : chaque merveille vue une fois (nouée ou écrite) y entre, avec l'Âge et la date ; rien ne s'en efface. */
    seeWonders(seed, r) {
      const ids = CAT.wondersOf(r); if (!ids.length) return;
      const box = this.ext.wonders && typeof this.ext.wonders === "object" ? this.ext.wonders : (this.ext.wonders = {});
      let fresh = false;
      for (const id of ids) if (!box[id]) { box[id] = { at: this.law.now(), age: String(seed) }; fresh = true; }
      if (fresh) this.saveExt();
    }
    /** Commande d'essai : l'Âge ouvert reçoit d'un coup la pression de quatre jours ; s'il a une contradiction libre, une union se noue. */
    async advanceMutation() {
      const f = this.app.workspace.getActiveFile(); let src = null;
      try { src = f ? core.extract(await this.app.vault.read(f)) : null; } catch (e) { src = null; }
      if (src === null) return new Notice(this.t("mut.test.noage"));
      const seed = core.seed(f.path);
      if (!this.law.get(seed)) guard("loi", () => this.law.observe(seed, core.analyse(src, { seed, physics: false }), f.stat ? f.stat.mtime : this.law.now())); /* un Âge pas encore suivi par la loi : on le fait entrer */
      const a = this.law.get(seed);
      if (!a) return new Notice(this.t("mut.test.noage"));
      const r = core.analyse(src, { seed, probe: true });
      if (!r || r.stability >= 75) return new Notice(this.t("mut.test.stable", { n: r ? r.stability : "?" }), 9000);
      if (!MUT.pickPair(r, a)) return new Notice(this.t("mut.test.nothing"), 9000);
      const m = MUT.stateOf(a); m.pressure = 1; m.at = this.law.now(); m.force = true; /* l'essai noue à coup sûr, même un Âge qui ne sait pas muter */
      core.analyse(src, { seed }); /* une lecture vivante : la pression est pleine, l'union se noue (et sa notice) */
      this.saveExt(); this.refreshLive();
    }
    /** La ligne du panneau : chaque union, ce qui la tient, si elle est tombée ou fanée. */
    symbiosisLine(list) {
      if (!Array.isArray(list) || !list.length) return "";
      const parts = list.map((s) => {
        const o = { a: this.wordOf(s.a), b: this.wordOf(s.b), k: this.wordOf(s.keystone || s.a) };
        const old = s.since > 0 && this.law.now() - s.since > 90 * MUT.DAY; /* après trois mois, une vieille union : du sens, pas de l'entretien */
        const w = s.active && s.composite ? " " + this.t("mut.gives", { w: CAT.nameOf(s.composite, this.lang() === "fr") }) : "";
        return (!s.active ? this.t("mut.fallen", o) : old ? this.t("mut.old", o) : this.t("mut.held", o)) + w;
      });
      return this.t("mut.head") + " " + parts.join(" ");
    }

    /** Le statut d'écrivain : un Âge qui reste stable sept jours donne un titre ; on l'annonce une fois (le Korfah d'abord, puis le palier). */
    statusWatch(name, stability) {
      const up = this.status.watch(name, stability, this.ext); if (!up) return;
      this.saveExt();
      if (up.korfah) new Notice(this.t("status.korfah"), 12000);
      new Notice(this.t("status.up", { title: this.t("status.title." + up.tier) }), 9000);
    }

    lang() {
      const v = this.ext && this.ext.lang;
      if (v === "en" || v === "fr") return v;
      let l = "en"; try { l = ((window.moment && window.moment.locale && window.moment.locale()) || navigator.language || "en"); } catch (e) { /* ignore */ }
      return String(l).toLowerCase().startsWith("fr") ? "fr" : "en";
    }

    saveExt() { clearTimeout(this.saveTimer); this.saveTimer = window.setTimeout(() => { this.saveTimer = 0; this.saveSettings(); }, 2500); }
    refreshLive() {
      clearTimeout(this.liveTimer);
      this.liveTimer = window.setTimeout(() => { for (const i of [...this.live]) { if (i.el && !i.el.isConnected) continue; guard("live", () => i.refresh()); } }, 700);
    }

    // ---- remplacements de méthodes du plugin d'origine ---------------------------------------
    renderAgePanel(src, el, path) {
      const name = core.base(path), analysis = guard("analyse", () => core.analyse(src, { seed: core.seed(path) })); // la graine : `age_seed` si l'Âge a été renommé
      this.fxCtx = { mode: parseFx(src), style: parseStyle(src), sky: parseSky(src), seed: String(path), analysis };
      try { super.renderAgePanel(src, el, path); } finally { this.fxCtx = null; }
      guard("panel", () => {
        if (!this.law || !analysis) return;
        const panel = el.querySelector(":scope > .age-panel") || el.lastElementChild; if (!panel) return;
        X.renderExtras(this, panel, { src, analysis, name, path });
        if (this.ext.panelTabs !== false) X.tabifyPanel(this, panel);
        X.inkFresh(this, panel, name, [panel.querySelector(".age-panel__journal"), panel.querySelector(".age-panel__visual")]); // l'encre qui sèche
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
        const gen = r.style === "gen" ? sceneOf(r.a, core.seed(String(r.seed || key)), core.blocks) : null; // fenêtre génératrice (si l'analyse est connue)
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
      const isHubBook = (i) => !!(i && i.file && !i.analysis && R.isHubFile(plugin.app, i.file)); // un livre qui mène à un Relto (return: [[Relto]]) : pas un Âge, mais le refuge
      if (origGlimpse) proto.glimpse = function (t, i) {
        const view = this;
        if (isHubBook(i)) { // la vitre montre l'île vivante, comme le Livre du Relto ; la toucher, c'est rentrer
          const win = t.createDiv({ cls: "age-book__window age-rbook__inbook is-clickable" }); win.setAttr("title", plugin.t("link.touch"));
          RBK.mountGlass(plugin, win, i.file).catch((e) => console.warn("[Age Writer ext] vitre du Relto", e));
          t.createDiv({ cls: "age-book__caption", text: plugin.t("rbook.homeglass", { name: i.file.basename }) });
          win.addEventListener("click", () => { view.__quietUntil = Date.now() + 4000; if (plugin.ext.sound && plugin.ext.soundLink !== false) linkSound(plugin.ext.volume); R.openHubFile(plugin, i.file); });
          return;
        }
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
        if (isHubBook(i)) guard("hub row", () => { // « not an Age » → « Relto · refuge » ; ouvrir = rentrer, sans second onglet
          const row = t.lastElementChild; if (!row) return;
          const note = row.querySelector(".age-book__destnote"); if (note) note.setText(plugin.t("rbook.home"));
          const view = this;
          row.addEventListener("click", (e) => {
            const a = e.target && e.target.closest ? e.target.closest(".age-book__open") : null; if (!a) return;
            e.stopImmediatePropagation(); e.preventDefault(); view.__quietUntil = Date.now() + 4000;
            if (plugin.ext.sound && plugin.ext.soundLink !== false) linkSound(plugin.ext.volume);
            R.openHubFile(plugin, i.file);
          }, true);
        });
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
        name, number: X.ageNumber(core.seed(file.path)), seedNumber: seed ? Number(seed[1]) : null, dni: this.dni, standalone,
        glyph: (id, x, y, s) => core.glyphSvg(id, x, y, s, "none"), glyphIds: core.glyphs(analysis).filter((g) => !g.blot).map((g) => g.id), world: guard("cover world", () => worldIds(analysis)) || [], sobriety: parseCover(src) ?? ({ ornate: 0.05, classic: 0.35, sober: 0.7, plain: 1 })[this.ext.coverStyle],
        verdict: analysis.verdict, burnt: !!(this.law && this.law.destroyed(name)), label: this.t("book.descriptive"),
        ward: !!guard("garde", () => require("./ward").isWarded(this.wardExt(core.seed(file.path)), core.seed(file.path))), /* un Livre gardé : le serpent au médaillon */
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
      const analysis = core.analyse(src, { seed: core.seed(file.path) });
      guard("encre", () => X.inkFresh(this, el, file.basename, [el.querySelector(".age-book__prose"), el.querySelector(".age-book__chips")]));
      const tabs = el.querySelector(".age-book__tabs");
      if (tabs && !tabs.querySelector(".age-book__close")) {
        const x = tabs.createEl("button", { cls: "age-book__close", text: "✕ " + t("book.close"), attr: { title: t("book.close.tip") } });
        x.addEventListener("click", () => {
          const ws = this.app.workspace, back = this.bookFromLeaf && this.bookFromLeaf.view && this.bookFromLeaf.getRoot ? this.bookFromLeaf : null;
          view.leaf.detach();
          const target = back && back.getRoot() ? back : ws.getMostRecentLeaf();
          if (target) ws.setActiveLeaf(target, { focus: true });
        });
      }
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
        if (right) X.renderExtras(this, right, { src, analysis, name: file.basename, path: file.path, compact: true });
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
      const analysis = core.analyse(src, { seed: core.seed(file.path) }), svg = this.coverFor(src, analysis, file, true);
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
          if (this.ext.dniText && this.dni.hasFont()) { span.style.fontFamily = this.dni.textStack(); X.latinOnHover(span, m[1]); } else span.classList.add("is-latin");
          c.replaceWith(span);
        }
      }));
      this.registerMarkdownCodeBlockProcessor("dni", (src, el) => { guard("dni", () => X.renderDniBlock(this, src, el)); });
    }

    registerCommands() {
      this.addCommand({ id: "open-relto", name: "Open the Relto", callback: () => R.openRelto(this) });
      require("./ribbon-menu").install(this, () => RBK.ribbon(this)); /* le ruban : deux icônes à menu (Age Writer ; maintenance et essais) ; la première entrée garde l'ancien geste : le Livre du Relto, ou le dernier Relto visité (réglage) */
      if (typeof this.registerView === "function") this.registerView(RBK.RELTO_BOOK_VIEW, (leaf) => new RBK.ReltoBookView(leaf, this));
      this.addCommand({ id: "open-relto-book", name: "Open the Relto book", callback: () => RBK.openReltoBook(this) });
      this.addCommand({ id: "toggle-relto-ribbon", name: "Relto button: switch between the Relto book and the last Relto visited", callback: () => RBK.toggleRibbon(this) });
      this.addCommand({ id: "memories-clear", name: this.t("mem.clear.cmd"), callback: () => this.forgetWonders(null, (ok) => { if (ok) this.refreshLive(); }) });
      this.addCommand({ id: "cave-test", name: this.t("cave.test.cmd"), callback: () => new CaveTestModal(this.app, this).open() }); /* le lac, pour essayer le microscope sans attendre des jours */
      this.addCommand({ id: "oven-test", name: this.t("oven.test.cmd"), callback: () => new OvenTestModal(this.app, this).open() }); /* pour essayer la machine et la caverne sans attendre les récoltes */
      this.addCommand({ id: "mutation-advance", name: this.t("mut.test.cmd"), callback: () => this.advanceMutation() }); /* pour essayer : quatre jours de pression d'un coup sur l'Âge ouvert */
      this.addCommand({ id: "dni-numerals-report", name: "D'ni numerals: diagnostic report", callback: () => { const r = this.dni ? this.dni.report() : "no numerals module"; console.log("[Age Writer] D'ni numerals\n" + r); new Notice(r, 15000); } });
      this.addCommand({ id: "start-story", name: "Start the story (create or open the story Relto)", callback: () => R.startStory(this) });
    this.addCommand({ id: "story-hint", name: "Story: a hint for the current chapter", callback: () => R.storyHint(this) });
    this.addCommand({ id: "story-repair", name: "Story: repair chapter notes (names, properties)", callback: () => R.storyRepair(this) });
    this.addCommand({ id: "story-check", name: "Story: check progress now", callback: () => R.storyCheck(this) });
    this.addCommand({ id: "story-restart", name: "Story: restart the current chapter (fresh note)", callback: () => R.storyRestart(this) });
    this.addCommand({ id: "story-next", name: "Story: next chapter (create or reopen its note)", callback: () => R.storyNext(this) });
      this.addCommand({ id: "clean-star-chart", name: "Clean the star chart (forget the stars of Ages no longer on the Relto's shelf)", callback: async () => { try { const n = await R.cleanStarChart(this); new obsidian.Notice(n.names || n.stars ? this.t("map.clean.done", { stars: String(n.stars), names: String(n.names) }) : this.t("map.clean.none")); } catch (e) { console.warn("[Age Writer ext] carte", e); } } });
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
      // refaire la synchro du télescope : oublie le Great Zero trouvé (et la visée) de tous les Reltos ; l'heure D'ni se tait de nouveau
      this.addCommand({ id: "keep-world-former-name", name: "Give this Age back the world of its former name", callback: () => this.keepFormerWorld() });
      this.addCommand({ id: "forget-great-zero", name: "Forget the Great Zero (aim the telescope again)", callback: () => this.forgetGreatZero() });
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

    /**
     * Transcrire un monde que personne n'a écrit (Imageur au livre vierge, src/unwritten.js) : une note dans le dossier où
     * « Generate a random Age » met les siennes, avec exactement les lignes qui le décrivent et sa graine. Le nom de la note est
     * aussi la graine du tirage : s'il est déjà pris, on retire le monde sous le nom suivant (même clé, mêmes pages) ; jamais
     * d'écrasement (`createNoteIn` ajoute un suffixe en dernier recours). Renvoie le fichier, ou null.
     */
    async transcribeWorld(u) {
      if (!u || !Array.isArray(u.lines) || !u.key) return null;
      const names = new Set(this.app.vault.getMarkdownFiles().map((f) => f.basename));
      let w = u;
      if (names.has(u.name)) { const again = UW.find(UW.parseKey(u.key).cry, null, { analyse: (text, name) => core.analyse(text, { seed: name }), taken: (nm) => names.has(nm) }, u.key); if (again) w = again.unwritten; }
      const note = UW.noteOf(w, this.t("unwritten.intro"));
      const f = await this.createNoteIn(note.name, note.body);
      new Notice(this.t("random.created", { name: f.basename }));
      return f;
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
        this.lawTimers.set(f.path, window.setTimeout(() => { this.lawTimers.delete(f.path); this.observeFile(f); R.storyTick(this); }, 1500));
        this.refreshLive();
      }));
      this.registerEvent(vault.on("rename", (f, old) => guard("rename", () => { R.resetStoryDraw(this); this.onRename(f, old); })));
      this.registerEvent(vault.on("create", () => R.resetStoryDraw(this)));
      if (this.app.metadataCache && this.app.metadataCache.on) this.registerEvent(this.app.metadataCache.on("resolved", () => { this._seedNames = null; })); /* les graines se lisent dans les propriétés : refaire la table quand elles sont lues */
      this.registerEvent(vault.on("delete", (f) => { this._seedNames = null; R.resetStoryDraw(this); if (f instanceof TFile) { this.law.forget(f.basename); this.status.forget(f.basename); this.saveExt(); } }));
      this.registerEvent(metadataCache.on("changed", () => this.refreshLive()));
      this.registerEvent(this.app.workspace.on("file-open", (f) => { if (f instanceof TFile && f.extension === "md" && !R.isHubFile(this.app, f)) guard("ardoise", () => { this.slateOnOpen(f).catch(() => {}); }); })); /* l'ardoise part pour le prochain Livre qu'on ouvre */
      this.registerEvent(this.app.workspace.on("file-open", (f) => { // ouvrir la note d'un Relto : le plein écran (src/ui-relto.js) ; si le Relto est déjà dessiné, tout de suite, sinon à la fin de son rendu
        if (!f || !R.isHubFile(this.app, f)) return;
        RBK.noteVisit(this, f); // le dernier Relto visité : là où mène le bouton du ruban (réglage), et la ligne « dernière visite » du Livre du Relto
        const inst = [...this.live].find((i) => i.path === f.path && i.full && i.el && i.el.isConnected);
        if (inst) { this.reltoFullArm = null; inst.full(); } else this.reltoFullArm = { path: f.path, at: Date.now() };
      }));
      const recheck = () => window.setTimeout(() => this.checkSound && this.checkSound(), 150);
      this.registerEvent(this.app.workspace.on("active-leaf-change", recheck));
      this.registerEvent(this.app.workspace.on("layout-change", recheck));
    }

    // ---- loi 4, Observation (src/observe.js) ---------------------------------------------------------
    /** Donne aux fautes légères de l'Âge leur étape (signe, symptôme, cause), d'après le jour où elles sont apparues. */
    observeFaults(seed, out) {
      const keys = OB.faultsOf(out).map((f) => f.key);
      if (!keys.length && !(this.ext.state.law.faults && this.ext.state.law.faults[seed])) return out;
      const { seen, changed } = this.law.faults(seed, keys);
      if (changed) this.saveExt();
      return OB.apply(out, seen, this.law.now(), { rigor: RG.levelOf(this.ext), speed: this.ext.worldReading, tier: this.status ? this.status.tier() : 0 });
    }

    // ---- loi du Changement -------------------------------------------------------------------------
    async observeFile(f) {
      if (!this.ext.law) return;
      const src = core.extract(await this.app.vault.read(f)); if (src === null) return;
      const seed = core.seed(f.path), prev = (this.lastAgeSrc || (this.lastAgeSrc = new Map())).get(f.path);
      // la profondeur de l'Âge tel qu'il était avant la retouche (le test par retrait), lue seulement si la retouche compte
      const retouch = () => guard("retouche", () => {
        const wb = RG.weightsOf(this.ext).balance; if (!(wb > 0)) return null;
        const d = DEPTH.depthOf(prev != null ? prev : src, (s) => core.analyse(s, { seed, draw: false, probe: true }), (l) => AGEX.skip(l));
        return d ? { k: retouchFactor(d.state, wb), depth: d.state } : null;
      });
      const ev = this.law.observe(f.basename, core.analyse(src, { seed, physics: false }), f.stat.mtime, guard("valeurs physiques", () => PH.parsePhysics(src).params), { retouch });
      this.lastAgeSrc.set(f.path, src);
      this.saveExt();
      if (ev) {
        const how = ev.k > 1 ? "\n" + this.t("law.thread") : ev.k < 1 ? "\n" + this.t("law.deep") : "";
        new Notice(`${this.t("law.warning")}\n${describeChange(ev, this.t)}${how}`, 9000);
        this.redrawEverything();
      }
    }

    async onRename(f, old) {
      if (!(f instanceof TFile) || f.extension !== "md") return;
      this._seedNames = null; /* la chambre des souvenirs suit le nouveau nom */
      const oldName = old.replace(/^.*\//, "").replace(/\.md$/i, "");
      const src = core.extract(await this.app.vault.read(f));
      if (src === null) { this.law.forget(oldName); this.status.forget(oldName); this.saveExt(); return; }
      // un Âge renommé garde son monde : son ancienne graine devient sa propriété `age_seed` (sauf s'il en a déjà une)
      const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter, had = fm && fm.age_seed != null && String(fm.age_seed).trim() ? String(fm.age_seed).trim() : null;
      const seed = had || core.seed(old) || oldName;
      this.renamedSeeds.set(f.path, seed);
      if (!had) await guard("age_seed", () => this.app.fileManager.processFrontMatter(f, (p) => { if (p.age_seed == null || !String(p.age_seed).trim()) p.age_seed = seed; }));
      this.status.rename(oldName, f.basename);
      this.law.rename(oldName, f.basename, core.analyse(src, { seed, physics: false }), guard("valeurs physiques", () => PH.parsePhysics(src).params));
      guard("renommage", () => this.renameEverywhere(old, f.path, oldName, f.basename));
      this.saveExt(); this.refreshLive();
    }

    /** Commande : un Âge renommé avant que le plugin ne garde les graines retrouve le monde de son ancien nom (propriété `age_seed`), sans altération. */
    async keepFormerWorld() {
      const f = this.app.workspace.getActiveFile(); if (!(f instanceof TFile) || f.extension !== "md") { new Notice(this.t("seed.noage")); return; }
      const src = core.extract(await this.app.vault.read(f)); if (src === null) { new Notice(this.t("seed.noage")); return; }
      const notes = new Set(this.app.vault.getMarkdownFiles().map((x) => x.basename)), cands = new Set();
      for (const st of Object.values(this.ext.telescope || {})) for (const rec of Object.values((st && st.systems) || {})) for (const n of (rec && rec.ages) || []) if (!notes.has(n)) cands.add(n);
      formerNameModal(this.app, [...cands].sort(), this.t("seed.prompt"), async (former) => {
        const seed = String(former).trim(); if (!seed) return;
        this.renamedSeeds.set(f.path, seed);
        await guard("age_seed", () => this.app.fileManager.processFrontMatter(f, (p) => { p.age_seed = seed; }));
        this.law.rename(f.basename, f.basename, core.analyse(src, { seed, physics: false }), guard("valeurs physiques", () => PH.parsePhysics(src).params)); // le monde retrouvé n'est pas une altération
        guard("renommage", () => this.renameEverywhere(f.path, f.path, seed, f.basename));
        this.saveExt(); this.refreshLive(); new Notice(this.t("seed.done", { name: f.basename, former: seed }));
      }).open();
    }

    /** Après un renommage : les noms gravés à l'observatoire (systèmes situés, tous les Reltos) et les réglages de l'Imageur suivent le nouveau nom. */
    renameEverywhere(oldPath, newPath, oldName, newName) {
      for (const st of Object.values(this.ext.telescope || {})) {
        if (!st || !st.systems) continue;
        for (const rec of Object.values(st.systems)) if (rec && Array.isArray(rec.ages) && rec.ages.includes(oldName)) rec.ages = [...new Set(rec.ages.map((n) => (n === oldName ? newName : n)))].sort();
        if (st.book === oldPath) st.book = newPath;
      }
      const tun = this.ext.imagerTunings; if (tun && tun[oldPath] && !tun[newPath]) { tun[newPath] = tun[oldPath]; delete tun[oldPath]; }
    }

    async initialScan() {
      let n = 0;
      for (const f of this.app.vault.getMarkdownFiles()) {
        const c = this.app.metadataCache.getFileCache(f);
        if (c && !(c.sections || []).some((s) => s.type === "code")) continue;
        const src = core.extract(await this.app.vault.cachedRead(f)); if (src === null) continue;
        (this.lastAgeSrc || (this.lastAgeSrc = new Map())).set(f.path, src); // l'Âge tel qu'il est : sa profondeur comptera à la prochaine retouche
        if (!this.law.get(f.basename)) this.law.observe(f.basename, core.analyse(src, { seed: core.seed(f.path), physics: false }), f.stat.mtime);
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
    /** Commande de débogage et de resynchro : le Great Zero de chaque Relto redevient inconnu (visée remise à l'origine). */
  forgetGreatZero() {
    const tel = this.ext.telescope || {}, had = Object.values(tel).some((g) => g && g.found);
    this.ext.telescope = {}; this.telescopeGen = (this.telescopeGen || 0) + 1; this.saveExt(); this.redrawEverything(); // les vues ouvertes relisent l'état (gen)
    new Notice(this.t(had ? "tel.forgot" : "tel.forgot.none"));
  }
  stopSound() {
      clearInterval(this.soundWatch);
      this.sound && this.sound.stop(); for (const a of this.fileAudios) a.pause(); this.fileAudios = [];
      if (this.soundBtn) { this.soundBtn.removeClass("is-on"); this.soundBtn = null; }
    }
  };
};
