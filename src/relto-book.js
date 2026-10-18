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
const { setMarkup } = require("./util");

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
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.idx = null; this.glass = null; this.cover = plugin.ext.coverTab !== false; } // le livre s'ouvre sur sa couverture (réglage « Cover tab » des livres)
  getViewType() { return RELTO_BOOK_VIEW; }
  getDisplayText() { return this.plugin.t("rbook.title"); }
  getIcon() { return "book"; }
  async onOpen() {
    this.contentEl.setAttr("tabindex", "0");
    this.registerDomEvent(this.contentEl, "keydown", (e) => {
      if (this.cover) { if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { e.preventDefault(); this.openCover(); } return; }
      if (e.key === "ArrowLeft") this.turn(-1); else if (e.key === "ArrowRight") this.turn(1);
    });
    await this.render();
  }
  async onClose() { this.stopGlass(); }
  stopGlass() { if (this.glass) { try { this.glass.renderer.stop(); } catch (e) { /* ignore */ } this.glass = null; } }

  /**
   * Tourner une page, comme dans un livre : la page s'abaisse sur la reliure, la suivante se relève. Avant le premier Relto, le
   * livre se referme sur sa couverture (réglage « Cover tab ») ; après le dernier, rien.
   */
  turn(d) {
    if (this.turning) return;
    const n = hubsOf(this.plugin).length, i = (this.idx || 0) + d, e = this.plugin.ext;
    const toCover = i < 0 && e.coverTab !== false;
    if (!toCover && (i < 0 || i >= n)) { const sp = this.contentEl.querySelector(".age-rbook__spread"); if (sp) { sp.removeClass("is-nudge"); void sp.offsetWidth; sp.addClass("is-nudge"); } return; } // le bout du livre : la page résiste
    if (e.sound && e.soundPage !== false) { try { sound.pageTurn(e.volume, { quick: true }); } catch (err) { /* ignore */ } }
    const sp = this.contentEl.querySelector(".age-rbook__spread"), reduced = reducedMotion();
    const go = () => { this.turning = false; if (toCover) { this.cover = true; this.anim = 0; } else { this.idx = i; this.anim = d; } this.render(); };
    if (!sp || reduced) return go();
    this.turning = true; sp.addClass(d > 0 ? "is-flip-fwd" : "is-flip-back");
    window.setTimeout(go, 190);
  }

  /** Ouvrir la couverture : le son du livre et du fermoir (réglages), puis la page du dernier Relto visité. */
  openCover() {
    const e = this.plugin.ext;
    if (e.sound && e.soundBook !== false) { try { sound.openSequence(e.volume, { book: true, clasp: e.soundClasp !== false, link: false }); } catch (err) { /* ignore */ } }
    this.cover = false; this.anim = 1; this.render(); // la première page se relève
  }

  /** La couverture : le livre fermé, qu'on ouvre d'un clic (ou Entrée). */
  renderCover() {
    const { plugin } = this, el = this.contentEl;
    this.stopGlass(); el.empty();
    const book = el.createDiv({ cls: "age-book age-rbook" }); book.toggleClass("age-book--leather", plugin.ext.leather !== false);
    const spread = book.createDiv({ cls: "age-book__spread age-rbook__spread is-cover" });
    const c = spread.createDiv({ cls: "age-book__covercontainer age-rbook__covercontainer is-clickable" });
    setMarkup(c, reltoCoverSvg({ medal: "garnet" })); c.setAttr("aria-label", plugin.t("book.open")); c.setAttr("title", plugin.t("book.open"));
    c.addEventListener("click", () => this.openCover());
  }

  async render() {
    if (this.cover) return this.renderCover();
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
    let glass = null;
    try { glass = await mountGlass(plugin, right, f); } catch (e) { console.warn("[Age Writer ext] livre du Relto", e); }
    if (!el.contains(right)) { if (glass) glass.renderer.stop(); return; } // une autre page a été tournée entre-temps
    this.glass = glass;
    const sc = glass ? glass.scene : null, name = f.basename;
    if (glass) {
      glass.box.addClass("is-clickable"); glass.box.setAttr("aria-label", t("rbook.through", { name }));
      glass.box.addEventListener("click", () => linkTo(plugin, f, this.leaf));
    }
    // ni légende ni lien sous la vitre : c'est la vitre qu'on touche (Entrée aussi, quand elle a le focus)
    if (glass) { glass.box.setAttr("tabindex", "0"); glass.box.setAttr("role", "link"); glass.box.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); linkTo(plugin, f, this.leaf); } }); }

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

    // tourner les pages : la page de gauche ramène en arrière (puis à la couverture), celle de droite avance ; au doigt, glisser
    left.createDiv({ cls: "age-rbook__folio", text: String(2 * this.idx + 1) }); right.createDiv({ cls: "age-rbook__folio", text: String(2 * this.idx + 2) });
    const back = this.idx > 0 || plugin.ext.coverTab !== false, fwd = this.idx < hubs.length - 1;
    left.toggleClass("is-turnable", back); right.toggleClass("is-turnable", fwd);
    left.setAttr("title", back ? (this.idx > 0 ? t("rbook.prev") : t("book.cover")) : "");
    right.setAttr("title", fwd ? t("rbook.next") : "");
    left.addEventListener("click", (e) => { if (e.target.closest("a, button")) return; this.turn(-1); });
    right.addEventListener("click", (e) => { if (e.target.closest(".age-rbook__glass, a, button")) return; this.turn(1); });
    let x0 = null;
    spread.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") x0 = e.clientX; });
    spread.addEventListener("pointerup", (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60) this.turn(dx < 0 ? 1 : -1); });
    if (this.anim) { spread.addClass(this.anim > 0 ? "is-flip-in-fwd" : "is-flip-in-back"); this.anim = 0; }
  }
}

/** Ouvrir le Livre du Relto : jamais deux onglets (le livre déjà ouvert est rouvert sur le dernier Relto visité). */
async function openReltoBook(plugin) {
  const ws = plugin.app.workspace, ex = ws.getLeavesOfType ? ws.getLeavesOfType(RELTO_BOOK_VIEW)[0] : null;
  const leaf = ex || ws.getLeaf(false);
  if (!ex) await leaf.setViewState({ type: RELTO_BOOK_VIEW, active: true });
  else if (ex.view && ex.view.render) { ex.view.idx = null; ex.view.cover = plugin.ext.coverTab !== false; await ex.view.render(); } // rouvert : de nouveau fermé, sur le dernier Relto visité
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

/** L'emblème du Relto, au médaillon de sa couverture : l'île flottante, la montagne dessus, la cabane devant elle, gravées en traits. */
function hutEmblem(cx, cy, r, col, bg = "#16291e") {
  const k = r / 34, P = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${(cx + x * k).toFixed(1)} ${(cy + y * k).toFixed(1)}`).join(" ");
  const sw = (w) => (w * k).toFixed(2), G = 6; // G : le sol de l'île
  const island = P([[-29, G], [-24, G - 1], [-12, G], [0, G - 1], [12, G], [24, G - 1], [29, G], [25, G + 6], [17, G + 11], [10, G + 18], [3, G + 26], [-3, G + 19], [-11, G + 13], [-20, G + 8]]) + " Z";
  const strata = [P([[-18, G + 6], [8, G + 5]]), P([[-8, G + 13], [9, G + 12]])];
  const mount = P([[-24, G], [-15, G - 12], [-10, G - 9], [-1, G - 28], [5, G - 21], [8, G - 24], [21, G]]); // deux sommets
  const snow = P([[-5, G - 20], [-1, G - 28], [3, G - 22]]);
  const hx = -6, hut = P([[hx - 7, G], [hx - 7, G - 9], [hx, G - 15], [hx + 7, G - 9], [hx + 7, G]]), roof = P([[hx - 9, G - 7.6], [hx, G - 16.4], [hx + 9, G - 7.6]]);
  const door = P([[hx - 3, G], [hx - 3, G - 5.5], [hx, G - 5.5], [hx, G]]), chim = P([[hx + 3, G - 12], [hx + 3, G - 15.5], [hx + 5, G - 15.5], [hx + 5, G - 10.5]]);
  const win = `<rect x="${(cx + (hx + 2) * k).toFixed(1)}" y="${(cy + (G - 7) * k).toFixed(1)}" width="${(2.6 * k).toFixed(1)}" height="${(2.6 * k).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${sw(0.8)}"/>`;
  return `<g fill="none" stroke="${col}" stroke-linejoin="round" stroke-linecap="round"><path d="${island}" stroke-width="${sw(1.3)}"/>${strata.map((d) => `<path d="${d}" stroke-width="${sw(0.8)}" opacity="0.6"/>`).join("")}` +
    `<path d="${mount}" stroke-width="${sw(1.2)}" opacity="0.9"/><path d="${snow}" stroke-width="${sw(0.9)}" opacity="0.6"/>` +
    `<path d="${hut}" stroke-width="${sw(1.3)}" fill="${bg}"/><path d="${roof}" stroke-width="${sw(1.4)}"/><path d="${chim}" stroke-width="${sw(1)}"/><path d="${door}" stroke-width="${sw(0.9)}"/>${win}</g>`;
}

/** Les teintes du médaillon de la couverture : grenat (complémentaire du vert) ou bleu-vert profond (analogue). */
const MEDALS = { garnet: ["#6a1d27", "#2c0910", "#c79a8a"], teal: ["#1d4a50", "#0a1f24", "#8fb8b4"] };

/**
 * La couverture du Livre du Relto : un vieux maroquin vert forêt très sombre, au grain fin, usé aux bords et aux coins ;
 * un double filet doré le long des bords, un fleuron à chaque coin ; au centre, un ovale doré au fer, une couronne de
 * feuilles, et le médaillon cerclé d'or où l'île du Relto (sa montagne, sa cabane) est gravée. Sans texte. De notre main.
 */
function reltoCoverSvg({ standalone = false, medal = "garnet" } = {}) {
  const W = 300, H = 460, fx0 = 34, fy0 = 18, fx1 = W - 16, fy1 = H - 18, cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2, R = 40, // tout le décor central est centré dans le cadre doré
    u = "rbc" + medal, AU = "#d4b25a", AU2 = "#a8862e", M = MEDALS[medal] || MEDALS.garnet;
  let s = `<svg ${standalone ? `xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" ` : ""}class="age-cover age-rbook__cover" viewBox="0 0 ${W} ${H}" role="img" aria-label="Relto">`;
  s += `<defs>
<filter id="${u}g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="11" result="bump"/>
<feDiffuseLighting in="bump" surfaceScale="0.8" diffuseConstant="1.12" lighting-color="#ffffff" result="relief"><feDistantLight azimuth="235" elevation="60"/></feDiffuseLighting>
<feComposite in="SourceGraphic" in2="relief" operator="arithmetic" k1="1.04" k2="0" k3="0" k4="0" result="grained"/>
<feTurbulence type="fractalNoise" baseFrequency="0.01 0.014" numOctaves="4" seed="4" result="mottle"/>
<feColorMatrix in="mottle" type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.05  0 0 0 0 0.02  0 0 0 -1.4 0.62" result="patina"/>
<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="23" result="spots"/>
<feColorMatrix in="spots" type="matrix" values="0 0 0 0 0.04  0 0 0 0 0.05  0 0 0 0 0.02  0 0 0 -11 2.3" result="stains"/>
<feMerge result="all"><feMergeNode in="grained"/><feMergeNode in="patina"/><feMergeNode in="stains"/></feMerge>
<feComposite in="all" in2="SourceAlpha" operator="in"/>
</filter>
<filter id="${u}w" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="soft"/>
<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="31" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.6 -1.05" result="nm"/>
<feComposite in="soft" in2="nm" operator="in"/>
</filter>
<radialGradient id="${u}l" cx="45%" cy="36%" r="85%"><stop offset="0" stop-color="#16301d"/><stop offset="0.6" stop-color="#0e2215"/><stop offset="1" stop-color="#06110a"/></radialGradient>
<radialGradient id="${u}m" cx="40%" cy="34%" r="72%"><stop offset="0" stop-color="${M[0]}"/><stop offset="1" stop-color="${M[1]}"/></radialGradient>
<linearGradient id="${u}au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d98e"/><stop offset="0.4" stop-color="#c49a45"/><stop offset="0.7" stop-color="#8a6524"/><stop offset="1" stop-color="#e0bd6c"/></linearGradient>
<clipPath id="${u}c"><rect x="6" y="4" width="${W - 10}" height="${H - 8}" rx="9"/></clipPath>
</defs>`;
  s += `<rect x="9" y="8" width="${W - 10}" height="${H - 8}" rx="9" fill="#000" opacity="0.4"/>`; // ombre
  s += `<g clip-path="url(#${u}c)"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#${u}l)" filter="url(#${u}g)"/>`;
  // l'usure : là où la main frotte, les bords, les coins, le mors ; le cuir s'éclaircit par plaques irrégulières
  const wear = "#4a6646";
  s += `<g filter="url(#${u}w)" opacity="0.38"><rect x="6" y="4" width="${W - 10}" height="${H - 8}" rx="9" fill="none" stroke="${wear}" stroke-width="16"/>` +
    [[8, 6], [W - 6, 6], [8, H - 6], [W - 6, H - 6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="${wear}"/>`).join("") +
    `<rect x="16" y="4" width="10" height="${H}" fill="${wear}"/><ellipse cx="${W - 30}" cy="${H * 0.55}" rx="22" ry="70" fill="${wear}" opacity="0.5"/></g>`;
  s += `<rect x="6" y="4" width="15" height="${H}" fill="#000" opacity="0.25"/><path d="M21.5 4 V${H}" stroke="#000" stroke-opacity="0.45" stroke-width="1.4"/><path d="M23 4 V${H}" stroke="#cfe0b8" stroke-opacity="0.12" stroke-width="1"/>`; // le mors
  s += `<rect x="6" y="4" width="${W - 10}" height="${H - 8}" rx="9" fill="none" stroke="#050b07" stroke-opacity="0.5" stroke-width="3"/></g>`;
  // dorures au fer
  const gold = (d, w = 1, fill = "none") => `<path d="${d}" fill="${fill}" stroke="${AU}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
  // le cadre : un filet gras, une roulette de petits losanges et de points, un filet maigre
  s += gold(`M${fx0} ${fy0} H${fx1} V${fy1} H${fx0} Z`, 1.6) + gold(`M${fx0 + 9} ${fy0 + 9} H${fx1 - 9} V${fy1 - 9} H${fx0 + 9} Z`, 0.7);
  const roll = (x0, y0, x1, y1) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 7); let r = ""; for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; r += i % 2 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="0.8" fill="${AU}" opacity="0.85"/>` : `<path d="M${x.toFixed(1)} ${(y - 2.2).toFixed(1)} L${(x + 2.2).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y + 2.2).toFixed(1)} L${(x - 2.2).toFixed(1)} ${y.toFixed(1)} Z" fill="${AU}" opacity="0.85"/>`; } return r; };
  const q = 4.5; s += roll(fx0 + q, fy0 + q, fx1 - q, fy0 + q) + roll(fx0 + q, fy1 - q, fx1 - q, fy1 - q) + roll(fx0 + q, fy0 + q + 7, fx0 + q, fy1 - q - 7) + roll(fx1 - q, fy0 + q + 7, fx1 - q, fy1 - q - 7);
  // le dos : cinq nerfs dorés, un petit fleuron dans chaque entre-nerf, un filet le long du mors ; et un filet doré au bord des plats
  const nerfs = [44, 128, 230, 332, 416];
  for (const y of nerfs) s += `<rect x="6" y="${y - 3}" width="16" height="6" fill="#000" opacity="0.3"/>` + gold(`M7 ${y - 3} H21 M7 ${y + 3} H21`, 0.9) + gold(`M7 ${y} H21`, 0.5);
  for (let k = 0; k < nerfs.length - 1; k++) { const y = (nerfs[k] + nerfs[k + 1]) / 2; s += gold(`M14 ${y - 5} L17 ${y} L14 ${y + 5} L11 ${y} Z`, 0.7, AU) + `<circle cx="14" cy="${y - 9}" r="0.9" fill="${AU}" opacity="0.85"/><circle cx="14" cy="${y + 9}" r="0.9" fill="${AU}" opacity="0.85"/>`; }
  s += gold(`M8 10 V${H - 10} M20.5 10 V${H - 10}`, 0.6) + `<rect x="8.5" y="6.5" width="${W - 15}" height="${H - 13}" rx="7.5" fill="none" stroke="${AU}" stroke-width="0.7" opacity="0.6"/>`;
  // un fleuron à chaque coin : un bouton, deux volutes pleines, une feuille pleine vers le centre
  const fleuron = (x, y, sx, sy) => {
    const T = (a, b) => `${(x + a * sx).toFixed(1)} ${(y + b * sy).toFixed(1)}`;
    return gold(`M${T(3, 3)} C${T(10, 4)} ${T(14, 8)} ${T(16, 15)}`, 1.4) +
      gold(`M${T(15, 15)} C${T(21, 14)} ${T(25, 19)} ${T(27, 27)} C${T(19, 25)} ${T(15, 21)} ${T(15, 15)} Z`, 0.8, AU) + // la feuille
      gold(`M${T(3, 3)} C${T(1, 8)} ${T(5, 12)} ${T(9, 10)} C${T(10, 8)} ${T(8, 7)} ${T(7, 8.5)}`, 1.4) + // volute basse
      gold(`M${T(3, 3)} C${T(8, 1)} ${T(12, 5)} ${T(10, 9)} C${T(8, 10)} ${T(7, 8)} ${T(8.5, 7)}`, 1.4) + // volute haute
      `<circle cx="${T(3, 3).split(" ")[0]}" cy="${T(3, 3).split(" ")[1]}" r="2.4" fill="${AU}" opacity="0.9"/>` +
      `<circle cx="${T(11, 16).split(" ")[0]}" cy="${T(11, 16).split(" ")[1]}" r="1.2" fill="${AU}" opacity="0.9"/><circle cx="${T(16, 11).split(" ")[0]}" cy="${T(16, 11).split(" ")[1]}" r="1.2" fill="${AU}" opacity="0.9"/>`;
  };
  const fi = 14; s += fleuron(fx0 + fi, fy0 + fi, 1, 1) + fleuron(fx1 - fi, fy0 + fi, -1, 1) + fleuron(fx0 + fi, fy1 - fi, 1, -1) + fleuron(fx1 - fi, fy1 - fi, -1, -1);
  // l'ovale central : deux filets et un rang de points (aucune lettre)
  const ox = 62, oy = 76;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${ox}" ry="${oy}" fill="none" stroke="${AU}" stroke-width="1.1" opacity="0.85"/><ellipse cx="${cx}" cy="${cy}" rx="${ox - 9}" ry="${oy - 9}" fill="none" stroke="${AU}" stroke-width="0.7" opacity="0.8"/>`;
  for (let i = 0; i < 36; i++) { const a = (i / 36) * 6.283; s += `<circle cx="${(cx + Math.cos(a) * (ox - 4.5)).toFixed(1)}" cy="${(cy + Math.sin(a) * (oy - 4.5)).toFixed(1)}" r="${i % 9 === 0 ? 1.5 : 0.8}" fill="${AU}" opacity="0.8"/>`; }
  // la couronne : deux branches de laurier nouées en bas, qui montent de part et d'autre du médaillon
  const rr = R + 12, leaf = (x, y, ang, len) => { // une feuille pointue, pleine, avec sa nervure
    const c = Math.cos(ang), sn = Math.sin(ang), px = -sn, py = c, L = (a, b) => `${(x + c * a + px * b).toFixed(1)} ${(y + sn * a + py * b).toFixed(1)}`;
    return `<path d="M${L(0, 0)} Q${L(len * 0.5, len * 0.32)} ${L(len, 0)} Q${L(len * 0.5, -len * 0.32)} ${L(0, 0)} Z" fill="${AU}" opacity="0.85"/><path d="M${L(len * 0.1, 0)} L${L(len * 0.85, 0)}" stroke="#1a1408" stroke-width="0.5" opacity="0.6"/>`;
  };
  for (const side of [-1, 1]) {
    const a0 = Math.PI / 2 + side * 0.28, a1 = Math.PI / 2 + side * 2.55, pts = [];
    for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * (i / 24); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * (rr + 4)]); }
    s += `<path d="M${pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L")}" fill="none" stroke="${AU}" stroke-width="1" opacity="0.85"/>`;
    for (let i = 1, k = 0; i <= 22; i += 2, k++) { // les feuilles, en alternance dehors / dedans, pointées vers le haut ; la branche de droite est le miroir de celle de gauche
      const [x, y] = pts[i], [x2, y2] = pts[i + 1], dir = Math.atan2(y2 - y, x2 - x), out = (k % 2 ? 1 : -1) * 0.7 * side;
      s += leaf(x, y, dir + out, 12);
    }
    const [ex, ey] = pts[24]; s += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="1.6" fill="${AU}" opacity="0.9"/>`; // une baie au bout
  }
  { const ny = cy + rr + 5; s += gold(`M${cx} ${ny} C${cx - 4} ${ny - 6} ${cx - 11} ${ny - 3} ${cx - 8} ${ny + 2} C${cx - 6} ${ny + 4} ${cx - 2} ${ny + 2} ${cx} ${ny}`, 1) + gold(`M${cx} ${ny} C${cx + 4} ${ny - 6} ${cx + 11} ${ny - 3} ${cx + 8} ${ny + 2} C${cx + 6} ${ny + 4} ${cx + 2} ${ny + 2} ${cx} ${ny}`, 1) + gold(`M${cx - 1} ${ny} L${cx - 5} ${ny + 8} M${cx + 1} ${ny} L${cx + 5} ${ny + 8}`, 1) + `<circle cx="${cx}" cy="${ny}" r="1.8" fill="${AU}" opacity="0.9"/>`; } // le nœud : deux boucles, deux pans
  // le médaillon : cerclé d'or, l'île du Relto gravée en or
  s += `<circle cx="${cx}" cy="${cy + 1.5}" r="${R + 6}" fill="#000" opacity="0.3"/><circle cx="${cx}" cy="${cy}" r="${R + 4}" fill="url(#${u}au)" stroke="#4a3510" stroke-width="0.8"/><circle cx="${cx}" cy="${cy}" r="${R + 2}" fill="none" stroke="#5a4214" stroke-opacity="0.7" stroke-width="0.6"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${u}m)"/><circle cx="${cx}" cy="${cy}" r="${R - 3.5}" fill="none" stroke="${AU2}" stroke-opacity="0.7" stroke-width="0.7"/>`;
  s += hutEmblem(cx, cy - 5, R - 4, AU, M[1]); // l'emblème est plus long vers le bas (la pointe de l'île) : remonté pour être centré à l'œil
  return s + "</svg>";
}
module.exports.reltoCoverSvg = reltoCoverSvg;
