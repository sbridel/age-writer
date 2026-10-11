"use strict";
/**
 * Le livre descriptif dans le Relto : le VRAI livre du moteur (src/engine/book-view.js) monté dans un cadre posé sur le canevas, pas un redessin.
 *   - la palette « Add or remove a page » devient un porte-document à côté du livre (CSS, `age-book--relto`) ;
 *   - une dernière page libre montre ce qui est écrit (une ligne par ligne, on peut en retirer ou en reprendre une) et sert à écrire une ligne ;
 *   - un livre vierge n'a pas encore de note : elle se crée au premier ajout (`o.onCreate`) et le livre bascule dessus.
 * Il n'y a aucun bouton « supprimer l'Âge » : retirer une ligne n'est pas supprimer la note.
 */
const BV = require("./engine/book-view");
const { analyseAge, extractAge, seedName } = require("./engine/analysis");
const { addLine, removeLine, writtenLines } = require("./engine/age-text");

const BLANK = "```age\n```";
const STUB = { path: "", basename: "" };
const LABEL = {
  en: { title: "A blank book", free: "free page", written: "Written in this book", none: "Nothing written yet.", ph: "Write a line…", add: "Write the page", bad: "Not understood: {w}", pull: "take this line out", edit: "take this line back to rewrite it", name: "name it in your vault" },
  fr: { title: "Un livre vierge", free: "page libre", written: "Écrit dans ce livre", none: "Rien d'écrit pour l'instant.", ph: "Écris une ligne…", add: "Écrire la page", bad: "Pas compris : {w}", pull: "retirer cette ligne", edit: "reprendre cette ligne pour la récrire", name: "à nommer dans ton coffre" },
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
 * @returns { render(), setFile(f), dispose(), file() }
 */
function mount(plugin, root, o) {
  const L = LABEL[o.fr ? "fr" : "en"], app = plugin.app, state = { file: o.file || null, text: BLANK };
  const host = Object.create(BV.BookView.prototype);
  Object.assign(host, {
    app, contentEl: root, mode: "descriptive", spread: 0, shownPath: null, selectedBook: null, paletteOpen: true, proseCache: new Map(),
    plugin: Object.create(plugin, { currentAgeFile: { get: () => state.file || STUB } }),
  });
  const textOf = async () => (state.file ? app.vault.cachedRead(state.file) : BLANK);

  host.togglePage = async function (file, id) {
    if (!state.file) { await create(id); return; }
    await BV.BookView.prototype.togglePage.call(this, state.file, id);
  };
  async function create(line) {
    const f = await o.onCreate(line); if (!f) return;
    state.file = f; host.shownPath = null; await host.render();
  }
  async function submit(inp, msg, editing) {
    const line = inp.value.trim(); if (!line) return;
    const text = state.file ? await app.vault.cachedRead(state.file) : BLANK, base = editing ? (removeLine(text, editing) || text) : text, res = understood(base, line);
    if (!res.ok) { msg.setText(L.bad.replace("{w}", line)); return; }
    if (!state.file) { await create(line); return; }
    await app.vault.process(state.file, (t) => { const b = editing ? (removeLine(t, editing) || t) : t; return addLine(b, line) || b; });
  }
  host.free = {
    label: L.free,
    page(left, file, src, analysis) {
      left.createDiv({ cls: "age-book__heading", text: L.written });
      const box = left.createDiv({ cls: "age-book__lines" }), rows = linesOf(src, analysis);
      if (!rows.length) box.createDiv({ cls: "age-book__none", text: L.none });
      let editing = null;
      const inp = left.createEl("input", { cls: "age-book__line-input", attr: { type: "text", placeholder: L.ph, list: "age-book-words", spellcheck: "false" } });
      const dl = left.createEl("datalist", { attr: { id: "age-book-words" } });
      for (const g of BV.paletteGroups()) for (const it of g.items) dl.createEl("option", { attr: { value: it.id } });
      const msg = left.createDiv({ cls: "age-book__line-msg" });
      for (const r of rows) {
        const row = box.createDiv({ cls: "age-book__line" + (r.unknown ? " is-unknown" : "") });
        const txt = row.createSpan({ cls: "age-book__line-text", text: r.text, attr: { title: L.edit } });
        txt.addEventListener("click", () => { inp.value = r.text; editing = r.text; inp.focus(); });
        if (state.file) row.createEl("button", { cls: "age-book__pull age-book__pull--line", text: "×", attr: { title: L.pull } }).addEventListener("click", async () => { await app.vault.process(state.file, (t) => removeLine(t, r.text) || t); });
      }
      const go = left.createEl("button", { cls: "age-book__line-go", text: L.add });
      go.addEventListener("click", () => { submit(inp, msg, editing); });
      inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); submit(inp, msg, editing); } });
    },
  };

  host.render = async function () {
    const container = this.contentEl, scrollTop = container.scrollTop; container.empty(); container.addClass("age-book"); container.addClass("age-book--relto");
    const file = state.file || STUB, text = await textOf(); state.text = text;
    const ageSource = extractAge(text) || "";
    if (this.shownPath !== file.path) { this.shownPath = file.path; this.spread = 0; this.selectedBook = null; }
    const analysis = analyseAge(ageSource, { seed: seedName(file.path || "Age") }), head = container.createDiv({ cls: "age-book__head" });
    head.createSpan({ cls: "age-book__title", text: state.file ? file.basename : L.title });
    if (state.file) head.createSpan({ cls: `age-panel__verdict age-panel__verdict--${analysis.verdict}`, text: `${analysis.verdict} · ${analysis.stability}%` });
    if (state.file) {
      const tabs = head.createDiv({ cls: "age-book__tabs" });
      for (const [mode, label] of [["descriptive", "Descriptive book"], ["linking", "Linking book"]]) tabs.createEl("button", { text: label, cls: this.mode === mode ? "is-active" : "" }).addEventListener("click", () => { this.mode = mode; this.render(); });
    } else this.mode = "descriptive";
    const spreadEl = container.createDiv({ cls: "age-book__spread" }), leftPage = spreadEl.createDiv({ cls: "age-book__page age-book__page--left" });
    spreadEl.createDiv({ cls: "age-book__gutter" });
    const rightPage = spreadEl.createDiv({ cls: "age-book__page age-book__page--right" });
    if (this.mode === "descriptive") { this.descriptive(leftPage, rightPage, analysis, ageSource, file); this.palette(container, file, writtenLines(text)); }
    else await this.linking(leftPage, rightPage, analysis, file);
    container.scrollTop = scrollTop;
  };

  // la note change (une ligne ajoutée par la palette, par la page libre, ou dans l'éditeur) : le livre se relit
  let timer = null;
  const ref = app.vault.on("modify", (f) => { if (state.file && f && f.path === state.file.path) { clearTimeout(timer); timer = setTimeout(() => { host.render(); }, 60); } });
  return {
    render: () => host.render(),
    setFile: (f) => { state.file = f || null; host.shownPath = null; host.mode = "descriptive"; host.spread = 0; return host.render(); },
    file: () => state.file,
    turnTo: (n) => { host.spread = n; return host.render(); },
    dispose: () => { clearTimeout(timer); try { app.vault.offref(ref); } catch (e) { /* ignore */ } },
  };
}

module.exports = { mount, linesOf, understood, BLANK, LABEL };
