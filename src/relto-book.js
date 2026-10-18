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

/** L'emblème du Relto, au médaillon de sa couverture : l'île flottante, la montagne dessus, la cabane devant elle, gravées en traits. */
function hutEmblem(cx, cy, r, col) {
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
    `<path d="${hut}" stroke-width="${sw(1.3)}" fill="#16291e"/><path d="${roof}" stroke-width="${sw(1.4)}"/><path d="${chim}" stroke-width="${sw(1)}"/><path d="${door}" stroke-width="${sw(0.9)}"/>${win}</g>`;
}

/**
 * La couverture du Livre du Relto : un vieux maroquin vert, au grain fin, patiné et taché par l'usage ; un double filet doré
 * le long des bords, un fleuron à chaque coin ; au centre, un ovale doré au fer, une couronne de feuilles, et le médaillon
 * vert sombre cerclé d'or où la montagne et la cabane sont gravées. Sans texte. Dessinée de notre main.
 */
function reltoCoverSvg({ standalone = false } = {}) {
  const W = 300, H = 460, cx = 160, cy = 206, R = 40, u = "rbc", AU = "#d8b65e", AU2 = "#a8862e";
  let s = `<svg ${standalone ? `xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" ` : ""}class="age-cover age-rbook__cover" viewBox="0 0 ${W} ${H}" role="img" aria-label="Relto">`;
  s += `<defs>
<filter id="${u}g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="11" result="bump"/>
<feDiffuseLighting in="bump" surfaceScale="0.7" diffuseConstant="1.08" lighting-color="#ffffff" result="relief"><feDistantLight azimuth="235" elevation="62"/></feDiffuseLighting>
<feComposite in="SourceGraphic" in2="relief" operator="arithmetic" k1="1.02" k2="0" k3="0" k4="0" result="grained"/>
<feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="4" seed="4" result="mottle"/>
<feColorMatrix in="mottle" type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 0 0.05  0 0 0 -1.5 0.70" result="patina"/>
<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="23" result="spots"/>
<feColorMatrix in="spots" type="matrix" values="0 0 0 0 0.22  0 0 0 0 0.17  0 0 0 0 0.09  0 0 0 -11 2.25" result="stains"/>
<feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="3" seed="8" result="fade"/>
<feColorMatrix in="fade" type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.82  0 0 0 0 0.62  0 0 0 -1.6 0.72" result="worn"/>
<feMerge result="all"><feMergeNode in="grained"/><feMergeNode in="patina"/><feMergeNode in="worn"/><feMergeNode in="stains"/></feMerge>
<feComposite in="all" in2="SourceAlpha" operator="in"/>
</filter>
<radialGradient id="${u}l" cx="45%" cy="38%" r="85%"><stop offset="0" stop-color="#7cb27a"/><stop offset="0.6" stop-color="#5f9a62"/><stop offset="1" stop-color="#3d6a42"/></radialGradient>
<radialGradient id="${u}m" cx="40%" cy="34%" r="72%"><stop offset="0" stop-color="#2c4e38"/><stop offset="1" stop-color="#12231a"/></radialGradient>
<linearGradient id="${u}au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d98e"/><stop offset="0.4" stop-color="#c49a45"/><stop offset="0.7" stop-color="#8a6524"/><stop offset="1" stop-color="#e0bd6c"/></linearGradient>
<clipPath id="${u}c"><rect x="6" y="4" width="${W - 10}" height="${H - 8}" rx="9"/></clipPath>
</defs>`;
  s += `<rect x="9" y="8" width="${W - 10}" height="${H - 8}" rx="9" fill="#000" opacity="0.35"/>`; // ombre
  s += `<g clip-path="url(#${u}c)"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#${u}l)" filter="url(#${u}g)"/>`;
  s += `<rect x="6" y="4" width="15" height="${H}" fill="#0b1a0d" opacity="0.2"/><path d="M21.5 4 V${H}" stroke="#0b1a0d" stroke-opacity="0.35" stroke-width="1.4"/><path d="M23 4 V${H}" stroke="#e8f0c8" stroke-opacity="0.15" stroke-width="1"/>`; // le mors
  s += `<rect x="6" y="4" width="${W - 10}" height="${H - 8}" rx="9" fill="none" stroke="#24321a" stroke-opacity="0.45" stroke-width="5"/></g>`; // bords frottés
  // dorures au fer : le double filet, un fleuron à chaque coin (une tige, deux feuilles, un bouton)
  const gold = (d, w = 1) => `<path d="${d}" fill="none" stroke="${AU}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="0.88"/>`;
  const fx0 = 34, fy0 = 18, fx1 = W - 16, fy1 = H - 18;
  s += gold(`M${fx0} ${fy0} H${fx1} V${fy1} H${fx0} Z`, 1.3) + gold(`M${fx0 + 4} ${fy0 + 4} H${fx1 - 4} V${fy1 - 4} H${fx0 + 4} Z`, 0.6);
  const sprig = (x, y, sx, sy) => { // un fleuron : un bouton, deux volutes, une feuille vers le centre
    const T = (a, b) => `${(x + a * sx).toFixed(1)} ${(y + b * sy).toFixed(1)}`;
    return gold(`M${T(2, 2)} C${T(9, 3)} ${T(13, 7)} ${T(15, 15)}`, 1) + gold(`M${T(15, 15)} C${T(19, 13)} ${T(22, 17)} ${T(19, 21)} C${T(16, 21)} ${T(14, 18)} ${T(15, 15)} Z`, 0.9) +
      gold(`M${T(2, 2)} C${T(1, 6)} ${T(5, 9)} ${T(8, 7)}`, 0.9) + gold(`M${T(2, 2)} C${T(6, 1)} ${T(9, 5)} ${T(7, 8)}`, 0.9) + `<circle cx="${T(2, 2).split(" ")[0]}" cy="${T(2, 2).split(" ")[1]}" r="1.8" fill="${AU}" opacity="0.88"/>`;
  };
  s += sprig(fx0 + 8, fy0 + 8, 1, 1) + sprig(fx1 - 8, fy0 + 8, -1, 1) + sprig(fx0 + 8, fy1 - 8, 1, -1) + sprig(fx1 - 8, fy1 - 8, -1, -1);
  // l'ovale central : deux filets, une couronne de feuilles, des points en guise d'inscription (aucune lettre)
  const ox = 62, oy = 76;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${ox}" ry="${oy}" fill="none" stroke="${AU}" stroke-width="1.1" opacity="0.85"/><ellipse cx="${cx}" cy="${cy}" rx="${ox - 9}" ry="${oy - 9}" fill="none" stroke="${AU}" stroke-width="0.7" opacity="0.8"/>`;
  for (let i = 0; i < 36; i++) { const a = (i / 36) * 6.283; s += `<circle cx="${(cx + Math.cos(a) * (ox - 4.5)).toFixed(1)}" cy="${(cy + Math.sin(a) * (oy - 4.5)).toFixed(1)}" r="${i % 9 === 0 ? 1.5 : 0.8}" fill="${AU}" opacity="0.8"/>`; }
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) { // la couronne : deux branches qui montent autour du médaillon
    const a = Math.PI / 2 + side * (0.35 + i * 0.32), lx = cx + Math.cos(a) * (R + 10), ly = cy + Math.sin(a) * (R + 13), ang = (a * 180) / Math.PI + side * 70;
    s += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="4.2" ry="1.7" transform="rotate(${ang.toFixed(0)} ${lx.toFixed(1)} ${ly.toFixed(1)})" fill="none" stroke="${AU}" stroke-width="0.8" opacity="0.85"/>`;
  }
  // le médaillon : cerclé d'or, vert sombre, la montagne et la cabane gravées en or
  s += `<circle cx="${cx}" cy="${cy + 1}" r="${R + 4}" fill="#000" opacity="0.25"/><circle cx="${cx}" cy="${cy}" r="${R + 3}" fill="url(#${u}au)" stroke="#4a3510" stroke-width="0.8"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${u}m)"/><circle cx="${cx}" cy="${cy}" r="${R - 3.5}" fill="none" stroke="${AU2}" stroke-opacity="0.7" stroke-width="0.7"/>`;
  s += hutEmblem(cx, cy - 1, R - 4, AU);
  return s + "</svg>";
}
module.exports.reltoCoverSvg = reltoCoverSvg;
