"use strict";
/**
 * Le livre descriptif dans le Relto : un vrai livre qu'on feuillette (reliure de cuir, pages de parchemin), monté dans un cadre posé sur le canevas.
 *   page de liaison (la fenêtre de l'Âge, comme le panneau de liaison) → pages de glyphes (traits d'encre sur parchemin, l'encre se dépose) →
 *   description → page libre où l'on écrit. Un emplacement vide « + » ouvre un classeur qu'on feuillette pour choisir un glyphe.
 * Le moteur (src/engine/book-view.js) fournit la liaison, la description et les lignes ; ici tout le reste est neuf.
 * Un livre vierge n'a pas encore de note : elle se crée au premier ajout (`o.onCreate`) et le livre bascule dessus.
 * Il n'y a aucun bouton « supprimer l'Âge » : retirer une ligne n'est pas supprimer la note.
 */
const BV = require("./engine/book-view");
const { analyseAge, extractAge, seedName, pageList } = require("./engine/analysis");
const { addLine, removeLine, writtenLines } = require("./engine/age-text");
const { glyphSvg } = require("./engine/glyphs");
const { hooks } = require("./engine/hooks");
const { setMarkup } = require("./util");

const PER_PAGE = 6, PER_SPREAD = 12, BINDER_PER = 14;
const BLANK = "```age\n```";
const STUB = { path: "", basename: "" };
const LABEL = {
  en: { title: "A blank book", free: "free page", wtitle: "Write in the book…", wsub: "straight into the Age's note", wh1: "a word the book knows: moss, rain…", wh2: "a setting: seed: 12, size: large", wph: "One entry per line…", wgo: "write it", link: "linking", glyphs: "glyphs", desc: "description", binder: "Glyph binder", tab: "Binder", close: "Close the binder", add_slot: "Add a glyph", take: "take this glyph out", drawn: "drawn by the book", more: "{n} not yet learned", say: "Write a line", say_hint: "A line the palette has no glyph for: a setting (seed: 12, size: large…) or a word the engine knows.", prev: "previous page", next: "next page", written: "Written in this book", none: "Nothing written yet.", ph: "Write a line…", add: "Write the page", bad: "Not understood: {w}", pull: "take this line out", edit: "take this line back to rewrite it", name: "name it in your vault" },
  fr: { title: "Un livre vierge", free: "page libre", wtitle: "Écrire dans le livre…", wsub: "directement dans la note de l'Âge", wh1: "un mot que le livre connaît : moss, rain…", wh2: "un réglage : seed: 12, size: large", wph: "Une entrée par ligne…", wgo: "l'écrire", link: "liaison", glyphs: "glyphes", desc: "description", binder: "Classeur des glyphes", tab: "Classeur", close: "Fermer le classeur", add_slot: "Ajouter un glyphe", take: "retirer ce glyphe", drawn: "tracé par le livre", more: "{n} pas encore appris", say: "Écrire une ligne", say_hint: "Une ligne que la palette n'a pas en glyphe : un réglage (seed: 12, size: large…) ou un mot que le moteur connaît.", prev: "page précédente", next: "page suivante", written: "Écrit dans ce livre", none: "Rien d'écrit pour l'instant.", ph: "Écris une ligne…", add: "Écrire la page", bad: "Pas compris : {w}", pull: "retirer cette ligne", edit: "reprendre cette ligne pour la récrire", name: "à nommer dans ton coffre" },
};

/** Les lignes du bloc `age` (hors lignes vides et commentaires), avec ce que le moteur en comprend. */
function linesOf(src, analysis) {
  const unknown = new Set(((analysis && analysis.resolved && analysis.resolved.lines) || []).filter((l) => l.unknown).map((l) => (l.raw || "").trim()));
  return String(src || "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((text) => ({ text, unknown: unknown.has(text) }));
}

/** Une ligne se comprend-elle ? (les lignes de réglage et de liaison, que le moteur ignore, se comprennent toujours.) */
function understood(text, line) {
  const next = addLine(text, line); if (next == null) return { ok: false, next: null };
  const src = extractAge(next) || "", a = analyseAge(src, { seed: "x" });
  const hit = ((a && a.resolved && a.resolved.lines) || []).find((l) => (l.raw || "").trim() === line);
  return { ok: !(hit && hit.unknown), next };
}

/**
 * @param plugin  le plugin
 * @param root    l'élément qui reçoit le livre
 * @param o       { file: TFile | null, fr: boolean, onCreate(line) → Promise<TFile> }
 * @returns { render(), setFile(f), dispose(), file(), turnTo(n) }
 */
function mount(plugin, root, o) {
  const L = LABEL[o.fr ? "fr" : "en"], app = plugin.app, state = { file: o.file || null, text: BLANK };
  const host = Object.create(BV.BookView.prototype);
  Object.assign(host, {
    app, contentEl: root, mode: "linking", spread: 0, shownPath: null, selectedBook: null, proseCache: new Map(), binder: null, seen: new Map(), draft: "", msg: "",
    plugin: Object.create(plugin, { currentAgeFile: { get: () => state.file || STUB } }),
  });
 /** La taille d'une page : un livre se règle sur la hauteur du cadre, toutes les pages à la même taille (portrait, trois sur quatre), le texte à l'échelle. */
  const fit = () => {
    const w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
    const fs = Math.max(9, Math.round(h / 34)), ph = Math.max(60, Math.min(h - fs * 2.6 - 40, (w - 50) / 1.5));
    root.style.fontSize = fs + "px"; root.style.setProperty("--ph", Math.round(ph) + "px");
  };
  root.addEventListener("age-fit", fit);
  const flip = () => { try { if (o.onFlip) o.onFlip(); } catch (e) { /* ignore */ } };
  const textOf = async () => (state.file ? app.vault.cachedRead(state.file) : BLANK);

  async function create(line) {
    const f = await o.onCreate(line); if (!f) return;
    state.file = f; host.shownPath = null; host.spread = 1; await host.render(); // la note vient d'être créée : le livre s'ouvre sur ses pages de glyphes
  }
  host.togglePage = async function (file, id) {
    if (!state.file) { await create(id); return; }
    await BV.BookView.prototype.togglePage.call(this, state.file, id);
  };
  /** Écrit chaque ligne du brouillon que le moteur comprend ; les autres restent dans le brouillon, signalées. */
  async function submitAll() {
    const lines = host.draft.split("\n").map((l) => l.trim()).filter(Boolean); if (!lines.length) return;
    let text = state.file ? await app.vault.cachedRead(state.file) : BLANK; const ok = [], bad = [];
    for (const ln of lines) { const res = understood(text, ln); if (res.ok) { text = res.next; ok.push(ln); } else bad.push(ln); }
    host.draft = bad.join("\n"); host.msg = bad.length ? L.bad.replace("{w}", bad.join(", ")) : "";
    if (!ok.length) { await host.render(); return; }
    let rest = ok;
    if (!state.file) { await create(ok[0]); rest = ok.slice(1); if (!state.file) return; }
    if (rest.length) await app.vault.process(state.file, (t) => { let b = t; for (const ln of rest) b = addLine(b, ln) || b; return b; });
    else await host.render();
  }

  const ink = (parent, id, severity) => setMarkup(parent.createDiv({ cls: "age-dbook__ink" }), `<svg viewBox="0 0 100 100">${glyphSvg(id, 0, 0, 100, severity)}</svg>`);

  /** Deux pages de glyphes : quatre emplacements chacune ; le dernier emplacement vide, « + », ouvre le classeur. */
  function glyphSpread(left, right, pages, idx, seen, file) {
    const slots = pages.slice(idx * PER_SPREAD, (idx + 1) * PER_SPREAD), total = pages.length, plusAt = total - idx * PER_SPREAD;
    [left, right].forEach((pg, side) => {
      const grid = pg.createDiv({ cls: "age-dbook__glyphs" });
      for (let k = 0; k < PER_PAGE; k++) {
        const n = side * PER_PAGE + k, page = slots[n];
        if (page) {
          const cell = grid.createDiv({ cls: "age-dbook__cell" + (page.born || page.drawn ? " is-drawn" : "") + (seen.has(page.id) ? "" : " is-fresh"), attr: { title: page.drawn ? `${page.id.replace(/_/g, " ")} — ${L.drawn}` : page.id.replace(/_/g, " ") } });
          if (page.blot) setMarkup(cell.createDiv({ cls: "age-dbook__ink" }), '<svg viewBox="0 0 100 100"><polygon points="22,50 34,30 58,24 80,38 74,66 50,78 30,70" fill="currentColor" opacity="0.8"/></svg>'); else ink(cell, page.id, page.severity);
          if (!page.drawn && !page.blot && state.file) cell.createEl("button", { cls: "age-dbook__take", text: "×", attr: { title: L.take } }).addEventListener("click", (e) => { e.stopPropagation(); host.togglePage(file, page.id); });
        } else if (n === plusAt) {
          const cell = grid.createDiv({ cls: "age-dbook__cell age-dbook__cell--plus", attr: { title: L.add_slot } }); cell.createSpan({ text: "+" });
          cell.addEventListener("click", () => { host.binder = host.binder || { g: 0, p: 0 }; host.render(); });
        } else grid.createDiv({ cls: "age-dbook__cell age-dbook__cell--empty" });
      }
    });
  }

  /** Le classeur : des onglets par famille, des feuilles de glyphes qu'on feuillette ; toucher un glyphe l'ajoute, toucher un glyphe écrit le retire. */
  function binderEl(container, file, written) {
    const b = host.binder, known = hooks.known(file.path), groups = [];
    for (const g of BV.paletteGroups()) {
      const items = g.items.filter((it) => !known || known.has(it.id) || written.has(it.id)), hidden = known ? g.items.filter((it) => !known.has(it.id) && !written.has(it.id)) : [];
      if (items.length || hidden.length) groups.push({ ...g, items, hidden });
    }
    if (!groups.length) return;
    b.g = Math.min(b.g, groups.length - 1); const g = groups[b.g], pages = Math.max(1, Math.ceil(g.items.length / BINDER_PER)); b.p = Math.min(b.p, pages - 1);
    const el = container.createDiv({ cls: "age-dbook__binder", attr: { "aria-label": L.binder } });
    const tabs = el.createDiv({ cls: "age-dbook__tabs" });
    groups.forEach((gr, i) => { const t = tabs.createEl("button", { cls: "age-dbook__tabbtn" + (i === b.g ? " is-on" : ""), text: gr.label }); t.style.borderTopColor = BV.AXIS_COLORS[gr.axis]; t.addEventListener("click", () => { b.g = i; b.p = 0; host.render(); }); });
    tabs.createEl("button", { cls: "age-dbook__close", text: "×", attr: { title: L.close } }).addEventListener("click", () => { host.binder = null; host.render(); });
    const sheet = el.createDiv({ cls: "age-dbook__sheet" }), grid = sheet.createDiv({ cls: "age-dbook__bgrid" });
    for (const it of g.items.slice(b.p * BINDER_PER, (b.p + 1) * BINDER_PER)) {
      const on = written.has(it.id), cell = grid.createEl("button", { cls: "age-dbook__bcell" + (on ? " is-on" : ""), attr: { title: on ? `${it.label} — ${L.take}` : it.label } });
      setMarkup(cell, `<svg viewBox="0 0 100 100">${glyphSvg(it.id, 0, 0, 100)}</svg>`);
      cell.addEventListener("click", () => { host.togglePage(file, it.id); });
    }
    if (b.p === pages - 1 && g.hidden.length) sheet.createDiv({ cls: "age-dbook__more", text: L.more.replace("{n}", String(g.hidden.length)) });
    const nav = el.createDiv({ cls: "age-dbook__bnav" });
    const prev = nav.createEl("button", { text: "◀", attr: { title: L.prev } }); prev.disabled = b.p === 0; prev.addEventListener("click", () => { b.p--; flip(); host.render(); });
    nav.createSpan({ text: `${g.label} · ${b.p + 1}/${pages}` });
    const next = nav.createEl("button", { text: "▶", attr: { title: L.next } }); next.disabled = b.p >= pages - 1; next.addEventListener("click", () => { b.p++; flip(); host.render(); });
  }

  host.render = async function () {
    fit(); const container = this.contentEl; container.empty(); container.addClass("age-book"); container.addClass("age-dbook");
    const file = state.file || STUB, text = await textOf(); state.text = text;
    const ageSource = extractAge(text) || "", analysis = analyseAge(ageSource, { seed: seedName(file.path || "Age") });
    if (this.shownPath !== file.path) { this.shownPath = file.path; this.selectedBook = null; if (!this.seen.has(file.path)) this.seen.set(file.path, new Set(pageList(analysis, true).map((p) => p.id))); }
    const seen = this.seen.get(file.path) || new Set(), pages = state.file ? pageList(analysis, true) : [];
    const gCount = Math.max(1, Math.ceil((pages.length + 1) / PER_SPREAD)), plan = [];
    if (state.file) plan.push({ k: "link", label: L.link });
    for (let i = 0; i < gCount; i++) plan.push({ k: "glyphs", i, label: `${i * PER_SPREAD + 1}–${Math.min(pages.length, (i + 1) * PER_SPREAD)}`.replace(/^1–0$/, L.glyphs) });
    if (state.file) plan.push({ k: "desc", label: L.desc });
    plan.push({ k: "free", label: L.free });
    this.spread = Math.max(0, Math.min(this.spread, plan.length - 1)); const cur = plan[this.spread];

    const head = container.createDiv({ cls: "age-dbook__head" });
    head.createSpan({ cls: "age-dbook__title", text: state.file ? file.basename : L.title });
    if (state.file) head.createSpan({ cls: `age-panel__verdict age-panel__verdict--${analysis.verdict}`, text: `${analysis.verdict} · ${analysis.stability}%` });
    const spreadEl = container.createDiv({ cls: "age-book__spread age-dbook__spread" }), left = spreadEl.createDiv({ cls: "age-book__page age-book__page--left" });
    spreadEl.createDiv({ cls: "age-book__gutter" }); const right = spreadEl.createDiv({ cls: "age-book__page age-book__page--right" });
    if (cur.k === "link") await this.linking(left, right, analysis, file);
    else if (cur.k === "glyphs") { glyphSpread(left, right, pages, cur.i, seen, file); for (const p of pages) seen.add(p.id); }
    else if (cur.k === "desc") {
      const sentences = this.proseFor(file.path, ageSource, analysis).split(/(?<=[.!?])\s+/).filter(Boolean), lp = left.createDiv({ cls: "age-book__prose", text: sentences.join(" ") }), rp = right.createDiv({ cls: "age-book__prose" });
      let moved = []; // le texte coule d'une page à l'autre : ce qui ne tient pas sur la page de gauche passe sur celle de droite
      while (sentences.length > 1 && left.scrollHeight > left.clientHeight + 1) { moved.unshift(sentences.pop()); lp.textContent = sentences.join(" "); }
      rp.textContent = moved.join(" ");
      right.createDiv({ cls: "age-book__colophon", text: Object.entries(analysis.axisStability).map(([axis, st]) => `${axis} ${st}%`).join(" · ") });
      if (analysis.drawn.length > 0) { const n = analysis.drawn.length, d = right.createDiv({ cls: "age-book__drawn" }); d.createSpan({ text: `${n} page${n === 1 ? "" : "s"} drawn by the book, which left ${n === 1 ? "it" : "them"} open. ` }); d.createEl("button", { text: "Draw again" }).addEventListener("click", () => { this.redraw(file); }); }
    } else {
      left.createDiv({ cls: "age-book__heading", text: L.written });
      const box = left.createDiv({ cls: "age-book__lines" }), rows = linesOf(ageSource, analysis);
      if (!rows.length) box.createDiv({ cls: "age-book__none", text: L.none });
      for (const r of rows) {
        const row = box.createDiv({ cls: "age-book__line" + (r.unknown ? " is-unknown" : "") });
        row.createSpan({ cls: "age-book__line-text", text: r.text, attr: { title: L.edit } }).addEventListener("click", async () => { // reprendre la ligne : elle quitte la note et passe au brouillon, pour être récrite
          this.draft = (this.draft ? this.draft + "\n" : "") + r.text; if (state.file) await app.vault.process(state.file, (t) => removeLine(t, r.text) || t); else this.render(); });
        if (state.file) row.createEl("button", { cls: "age-book__pull age-book__pull--line", text: "×", attr: { title: L.pull } }).addEventListener("click", async () => { await app.vault.process(state.file, (t) => removeLine(t, r.text) || t); });
      }
      right.addClass("age-dbook__write");
      right.createDiv({ cls: "age-dbook__wtitle", text: L.wtitle }); right.createDiv({ cls: "age-dbook__wsub", text: L.wsub });
      right.createDiv({ cls: "age-dbook__whint", text: L.wh1 }); right.createDiv({ cls: "age-dbook__whint", text: L.wh2 });
      const ta = right.createEl("textarea", { cls: "age-dbook__ruled", attr: { placeholder: L.wph, spellcheck: "false", rows: "6" } }); ta.value = this.draft;
      ta.addEventListener("input", () => { this.draft = ta.value; });
      ta.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitAll(); } });
      right.createDiv({ cls: "age-book__line-msg", text: this.msg || "" });
      right.createEl("button", { cls: "age-dbook__quiet", text: L.wgo }).addEventListener("click", () => { submitAll(); });
    }
    spreadEl.createEl("button", { cls: "age-dbook__folder" + (this.binder ? " is-open" : ""), text: L.tab, attr: { title: L.binder } }).addEventListener("click", () => { this.binder = this.binder || { g: 0, p: 0 }; flip(); this.render(); }); // l'onglet du classeur : toujours là, de n'importe quelle page
    // on tourne la page en touchant son bord extérieur (un coin replié y invite) ; le bas du livre ne dit que la page où l'on est
    if (this.spread > 0) spreadEl.createDiv({ cls: "age-dbook__turn age-dbook__turn--prev", attr: { title: L.prev } }).addEventListener("click", () => { this.spread--; this.msg = ""; flip(); this.render(); });
    if (this.spread < plan.length - 1) spreadEl.createDiv({ cls: "age-dbook__turn age-dbook__turn--next", attr: { title: L.next } }).addEventListener("click", () => { this.spread++; this.msg = ""; flip(); this.render(); });
    if (this.binder) binderEl(container, file, writtenLines(text));
  };

  // la note change (une ligne ajoutée par le classeur, par la page libre, ou dans l'éditeur) : le livre se relit
  let timer = null;
  const ref = app.vault.on("modify", (f) => { if (state.file && f && f.path === state.file.path) { clearTimeout(timer); timer = setTimeout(() => { host.render(); }, 60); } });
  return {
    render: () => host.render(),
    setFile: (f) => { state.file = f || null; host.shownPath = null; host.spread = f ? 0 : 0; host.binder = null; return host.render(); },
    file: () => state.file,
    turnTo: (n) => { host.spread = n; return host.render(); },
    dispose: () => { root.removeEventListener("age-fit", fit); clearTimeout(timer); try { app.vault.offref(ref); } catch (e) { /* ignore */ } },
  };
}

module.exports = { mount, linesOf, understood, BLANK, LABEL };
