"use strict";
/**
 * Le Livre du Relto : le livre « à la ceinture » (comme dans Uru). Une double page par Relto du coffre (toute note
 * `age_type: personal_hub`) : à gauche le texte (nom, inscription, étagère, histoire, heure là-bas, retours, dernière visite),
 * à droite la vitre de liaison, l'île vivante à l'heure du moment. Toucher la vitre : le son de liaison, puis le Relto
 * (dans l'onglet du livre, ou dans l'onglet qui le montre déjà).
 * Le bouton du ruban ouvre ce livre, ou (réglage `reltoRibbon: "last"`) mène droit au dernier Relto visité.
 */
const obsidian = require("obsidian");
const R = require("./ui-relto");
const { ReltoRenderer } = require("./relto-render");
const DC = require("./dniclock");
const DT = require("./dnitime");
const ST = require("./story");
const sound = require("./sound");

const RELTO_BOOK_VIEW = "age-writer-relto-book";
const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Les Reltos du coffre, dans l'ordre du livre : le refuge d'abord, puis l'histoire, puis les autres par nom. */
function hubsOf(plugin) {
  const { app } = plugin, rank = (f) => (R.isStoryHub(app, f) ? 1 : 0);
  return app.vault.getMarkdownFiles().filter((f) => R.isHubFile(app, f)).sort((a, b) => rank(a) - rank(b) || a.path.localeCompare(b.path));
}

/** Le dernier Relto visité (gardé à chaque ouverture d'une note de Relto), s'il existe encore. */
function lastHub(plugin) {
  const v = plugin.ext.reltoVisits || {}, hubs = hubsOf(plugin);
  let best = null;
  for (const f of hubs) if (v[f.path] && (!best || v[f.path] > v[best.path])) best = f;
  return best;
}

/** À noter quand une note de Relto s'ouvre (src/entry.js, `file-open`). */
function noteVisit(plugin, f) {
  plugin.ext.reltoVisits = { ...(plugin.ext.reltoVisits || {}), [f.path]: Date.now() };
  plugin.saveExt();
}

const hhmm = (h) => { const m = Math.round(Number(h) * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

/** « aujourd'hui, 14:02 », « hier », « il y a 3 jours », « pas encore ». */
function visitText(t, at, now = Date.now()) {
  if (!at) return t("rbook.never");
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  if (at >= d0.getTime()) { const d = new Date(at); return t("rbook.today", { h: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }); }
  const days = Math.ceil((d0.getTime() - at) / 86400000);
  return days <= 1 ? t("rbook.yesterday") : t("rbook.days", { n: days });
}

/** L'inscription du bloc `relto` de la note (ligne `inscription:`), ou "". */
async function inscriptionOf(app, f) {
  try {
    const txt = await app.vault.cachedRead(f), b = txt.match(/```relto[ \t]*\r?\n([\s\S]*?)```/), m = b && b[1].match(/^\s*inscription\s*:\s*(.+?)\s*$/im);
    return m ? m[1] : "";
  } catch (e) { return ""; }
}

/**
 * La vitre vivante d'un Relto : son île, à l'heure du moment, dessinée par le moteur du Relto (seulement quand elle est à l'écran).
 * Le canvas ne reçoit aucun geste (rien ne s'y clique) : c'est la vitre entière qui se touche. Renvoie { renderer, scene, box } ;
 * `renderer.stop()` quand la page tourne ou que le livre se ferme.
 */
async function mountGlass(plugin, host, file) {
  const { scene } = await R.buildScene(plugin, file);
  const box = host.createDiv({ cls: "age-rbook__glass" });
  const canvas = box.createEl("canvas", { cls: "age-rbook__canvas" });
  const reduced = reducedMotion();
  const renderer = new ReltoRenderer(canvas, plugin.dni, { reducedMotion: reduced, t: plugin.t, instrumentsMode: () => plugin.ext.instrumentsMode || "easy" });
  renderer.setScene(scene); renderer.setHour(null);
  if (reduced) renderer.draw(0); else renderer.start();
  return { renderer, scene, box };
}

/** Passer de l'autre côté : le son de liaison, puis le Relto (le livre laisse sa place). */
async function linkTo(plugin, f, leaf) {
  if (plugin.ext.sound && plugin.ext.soundLink !== false) { try { sound.linkSound(plugin.ext.volume); } catch (e) { /* ignore */ } }
  await R.openHubFile(plugin, f, leaf);
}

class ReltoBookView extends obsidian.ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.idx = null; this.glass = null; }
  getViewType() { return RELTO_BOOK_VIEW; }
  getDisplayText() { return this.plugin.t("rbook.title"); }
  getIcon() { return "book"; }
  async onOpen() {
    this.contentEl.setAttr("tabindex", "0");
    this.registerDomEvent(this.contentEl, "keydown", (e) => { if (e.key === "ArrowLeft") this.turn(-1); else if (e.key === "ArrowRight") this.turn(1); });
    await this.render();
  }
  async onClose() { this.stopGlass(); }
  stopGlass() { if (this.glass) { try { this.glass.renderer.stop(); } catch (e) { /* ignore */ } this.glass = null; } }

  turn(d) {
    const n = hubsOf(this.plugin).length, i = (this.idx || 0) + d;
    if (i < 0 || i >= n) return;
    this.idx = i;
    if (this.plugin.ext.sound && this.plugin.ext.soundPage !== false) { try { sound.pageTurn(this.plugin.ext.volume, { quick: true }); } catch (e) { /* ignore */ } }
    this.render();
  }

  async render() {
    const { plugin } = this, { app, t } = plugin, el = this.contentEl;
    let hubs = hubsOf(plugin);
    if (!hubs.length) { await R.createReltoNote(plugin); hubs = hubsOf(plugin); } // pas encore de Relto : le refuge est créé, comme le faisait le bouton
    if (this.idx == null) { const last = lastHub(plugin); this.idx = Math.max(0, last ? hubs.findIndex((f) => f.path === last.path) : 0); }
    this.idx = Math.min(Math.max(0, this.idx), hubs.length - 1);
    const f = hubs[this.idx]; if (!f) return;
    this.stopGlass(); el.empty();
    const book = el.createDiv({ cls: "age-book age-rbook" }); book.toggleClass("age-book--leather", plugin.ext.leather !== false);
    const spread = book.createDiv({ cls: "age-book__spread age-rbook__spread" });
    if (plugin.ext.leather !== false) for (const c of ["tl", "tr", "bl", "br"]) spread.createDiv({ cls: `age-book__corner age-book__corner--${c}` });
    const left = spread.createDiv({ cls: "age-book__page age-book__page--left age-rbook__text" });
    spread.createDiv({ cls: "age-book__gutter" });
    const right = spread.createDiv({ cls: "age-book__page age-book__page--right age-rbook__right" });

    // à droite : la vitre (montée d'abord : la scène sert aussi au texte)
    right.createDiv({ cls: "age-book__heading", text: t("rbook.hip") });
    let glass = null;
    try { glass = await mountGlass(plugin, right, f); } catch (e) { console.warn("[Age Writer ext] livre du Relto", e); }
    if (!el.contains(right)) { if (glass) glass.renderer.stop(); return; } // une autre page a été tournée entre-temps
    this.glass = glass;
    const sc = glass ? glass.scene : null, name = f.basename;
    if (glass) {
      glass.box.addClass("is-clickable"); glass.box.setAttr("aria-label", t("rbook.through", { name }));
      glass.box.addEventListener("click", () => linkTo(plugin, f, this.leaf));
    }
    right.createDiv({ cls: "age-book__caption", text: t("rbook.through", { name }) });
    const open = right.createEl("a", { cls: "age-book__open age-rbook__open", text: t("rbook.open") });
    open.addEventListener("click", (e) => { e.preventDefault(); linkTo(plugin, f, this.leaf); });

    // à gauche : le texte
    const story = R.isStoryHub(app, f);
    left.createDiv({ cls: "age-book__heading", text: t(story ? "rbook.kind.story" : "rbook.kind") });
    left.createDiv({ cls: "age-rbook__name", text: name });
    const ins = await inscriptionOf(app, f);
    if (ins) left.createDiv({ cls: "age-rbook__ins", text: `« ${ins} »` });
    const rows = left.createDiv({ cls: "age-rbook__rows" }), row = (k, v) => { const r = rows.createDiv({ cls: "age-rbook__row" }); r.createSpan({ cls: "age-rbook__k", text: k }); r.createSpan({ cls: "age-rbook__v", text: v }); };
    if (sc) {
      if (story) {
        const done = (sc.storyDone || []).filter((x) => x !== "end"), cur = ST.nextChapter(done);
        row(t("rbook.story"), cur ? t("rbook.story.v", { n: ST.CHAPTERS.indexOf(cur) + 1, total: ST.CHAPTERS.length, title: plugin.lang() === "fr" ? cur.title.fr : cur.title.en }) : t("rbook.story.end"));
      }
      row(t("rbook.shelf"), t("rbook.shelf.v", { ages: (sc.ages || []).length, pages: (sc.pages || []).filter((p) => p.state === "active").length }));
      let when = hhmm(glass.renderer.hour());
      try { const d = DC.reltoDate(sc); when += " · " + (d.synced ? DT.format(d) : `${d.hahr} · ${d.name} ${d.yahr}`); } catch (e) { /* l'heure seule */ }
      row(t("rbook.time"), when);
      if (sc.returning > 0) row(t("rbook.returning"), sc.returning === 1 ? t("rbook.returning.one") : t("rbook.returning.v", { n: sc.returning }));
    }
    row(t("rbook.visit"), visitText(t, (plugin.ext.reltoVisits || {})[f.path]));

    // tourner les pages (plusieurs Reltos)
    if (hubs.length > 1) {
      const nav = book.createDiv({ cls: "age-book__leafnav age-rbook__nav" });
      const prev = nav.createEl("button", { cls: "age-rbook__turn", text: "‹" }); prev.setAttr("aria-label", t("rbook.prev")); prev.disabled = this.idx === 0;
      prev.addEventListener("click", () => this.turn(-1));
      hubs.forEach((h, i) => { const d = nav.createSpan({ cls: "age-book__dot" + (i === this.idx ? " is-on" : "") }); d.setAttr("aria-label", h.basename); d.addEventListener("click", () => { if (i !== this.idx) this.turn(i - this.idx); }); });
      const next = nav.createEl("button", { cls: "age-rbook__turn", text: "›" }); next.setAttr("aria-label", t("rbook.next")); next.disabled = this.idx === hubs.length - 1;
      next.addEventListener("click", () => this.turn(1));
    }
  }
}

/** Ouvrir le Livre du Relto : jamais deux onglets (le livre déjà ouvert est rouvert sur le dernier Relto visité). */
async function openReltoBook(plugin) {
  const ws = plugin.app.workspace, ex = ws.getLeavesOfType ? ws.getLeavesOfType(RELTO_BOOK_VIEW)[0] : null;
  const leaf = ex || ws.getLeaf(false);
  if (!ex) await leaf.setViewState({ type: RELTO_BOOK_VIEW, active: true });
  else if (ex.view && ex.view.render) { ex.view.idx = null; await ex.view.render(); }
  if (ws.setActiveLeaf) ws.setActiveLeaf(leaf, { focus: true });
  if (ws.revealLeaf) await ws.revealLeaf(leaf);
}

/** Le bouton du ruban : le livre (par défaut), ou droit au dernier Relto visité. */
async function ribbon(plugin) {
  if (plugin.ext.reltoRibbon === "last") {
    const f = lastHub(plugin) || (await R.createReltoNote(plugin));
    if (f) await R.openHubFile(plugin, f);
    return;
  }
  await openReltoBook(plugin);
}

/** La commande qui bascule le bouton du ruban entre les deux gestes. */
function toggleRibbon(plugin) {
  plugin.ext.reltoRibbon = plugin.ext.reltoRibbon === "last" ? "book" : "last";
  plugin.saveExt();
  new obsidian.Notice(plugin.t(plugin.ext.reltoRibbon === "last" ? "rbook.ribbon.last" : "rbook.ribbon.book"));
}

module.exports = { RELTO_BOOK_VIEW, ReltoBookView, openReltoBook, ribbon, toggleRibbon, hubsOf, lastHub, noteVisit, visitText, mountGlass };
