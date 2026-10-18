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

/** L'emblème frappé au médaillon du Livre du Relto : l'île flottante, ses deux pierres de liaison et l'anneau entre elles, au fer doré. */
function islandEmblem(cx, cy, r, col) {
  const k = r / 34, P = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${(cx + x * k).toFixed(1)} ${(cy + y * k).toFixed(1)}`).join(" ");
  const island = P([[-26, 2], [-20, 0], [-8, 1], [4, -1], [16, 1], [26, 0], [22, 7], [14, 14], [9, 22], [3, 29], [-2, 22], [-9, 15], [-18, 9]]) + " Z";
  const pill = (x) => P([[x - 2.6, 0], [x - 2.6, -15], [x - 1, -17.5], [x + 1, -17.5], [x + 2.6, -15], [x + 2.6, 0]]) + " Z";
  const ring = `<ellipse cx="${(cx + 9 * k).toFixed(1)}" cy="${(cy - 9 * k).toFixed(1)}" rx="${(3.6 * k).toFixed(1)}" ry="${(5 * k).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${(1.1 * k).toFixed(2)}"/>`;
  const hut = P([[-17, 0], [-17, -7], [-12.5, -11.5], [-8, -7], [-8, 0]]);
  const strata = [P([[-14, 8], [6, 7]]), P([[-6, 16], [8, 15]])].map((d) => `<path d="${d}" stroke="${col}" stroke-opacity="0.55" stroke-width="${(0.8 * k).toFixed(2)}" fill="none"/>`).join("");
  return `<g fill="none" stroke="${col}" stroke-width="${(1.3 * k).toFixed(2)}" stroke-linejoin="round" opacity="0.92"><path d="${island}"/><path d="${hut}"/><path d="${pill(2)}"/><path d="${pill(16)}"/></g>${ring}${strata}`;
}
module.exports.islandEmblem = islandEmblem;

/**
 * La couverture du Livre du Relto : un livre de voyage, pas un livre d'Âge. Cuir grenu vert-olive, sans laiton, coins arrondis
 * par l'usage ; au centre un médaillon vert sombre, serti, où l'île est gravée en vert pâle. Aucun texte. Dessinée de notre main.
 */
function reltoCoverSvg({ standalone = false } = {}) {
  const W = 300, H = 460, cx = W / 2, cy = 160, R = 54, u = "rbc";
  let s = `<svg ${standalone ? `xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" ` : ""}class="age-cover age-rbook__cover" viewBox="0 0 ${W} ${H}" role="img" aria-label="Relto">`;
  s += `<defs>
<filter id="${u}g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="grain"/>
<feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="3" result="mottle"/>
<feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.05  0 0 0 0 0  0 0 0 -1.6 0.92" result="pits"/>
<feColorMatrix in="mottle" type="matrix" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.02  0 0 0 -1.1 0.75" result="dark"/>
<feMerge result="all"><feMergeNode in="SourceGraphic"/><feMergeNode in="dark"/><feMergeNode in="pits"/></feMerge>
<feComposite in="all" in2="SourceAlpha" operator="in"/>
</filter>
<radialGradient id="${u}l" cx="45%" cy="38%" r="75%"><stop offset="0" stop-color="#a7a35c"/><stop offset="0.6" stop-color="#8a8646"/><stop offset="1" stop-color="#5c5a2c"/></radialGradient>
<radialGradient id="${u}m" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#2d4e39"/><stop offset="1" stop-color="#14261b"/></radialGradient>
<linearGradient id="${u}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9b67a"/><stop offset="0.5" stop-color="#6d6a36"/><stop offset="1" stop-color="#3e3c1d"/></linearGradient>
<clipPath id="${u}c"><rect x="6" y="4" width="${W - 10}" height="${H - 8}" rx="14"/></clipPath>
</defs>`;
  s += `<rect x="9" y="8" width="${W - 10}" height="${H - 8}" rx="14" fill="#000" opacity="0.35"/>`; // ombre
  s += `<g clip-path="url(#${u}c)"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#${u}l)" filter="url(#${u}g)"/>`;
  s += `<rect x="6" y="4" width="16" height="${H}" fill="#000" opacity="0.18"/><rect x="22" y="4" width="2" height="${H}" fill="#000" opacity="0.18"/>`; // le pli du dos
  s += `<rect x="6" y="4" width="${W - 10}" height="${H - 8}" rx="14" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="6"/></g>`; // bords usés
  // le médaillon serti : un anneau de cuir repoussé, le disque vert, l'île gravée
  s += `<circle cx="${cx + 1.5}" cy="${cy + 2}" r="${R + 7}" fill="#000" opacity="0.3"/><circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="url(#${u}r)" filter="url(#${u}g)"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${u}m)" stroke="#0c1810" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${R - 5}" fill="none" stroke="#7fa585" stroke-opacity="0.45" stroke-width="1"/>`;
  s += `<g opacity="0.95">${islandEmblem(cx, cy - 2, R - 12, "#9cc39b")}</g>`;
  return s + "</svg>";
}
module.exports.reltoCoverSvg = reltoCoverSvg;
