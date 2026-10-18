"use strict";
// Point d'entrée UNIQUEMENT pour les tests visuels : le Livre du Relto (src/relto-book.js) dans un navigateur, avec un faux
// Obsidian (aides DOM, ItemView) et deux Reltos (refuge, histoire). La vitre est le vrai rendu du Relto.
const P = HTMLElement.prototype;
const opt = (el, o) => { if (typeof o === "string") o = { cls: o }; o = o || {}; if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(" ") : o.cls; if (o.text != null) el.textContent = o.text; if (o.attr) for (const k in o.attr) el.setAttribute(k, o.attr[k]); return el; };
P.createEl = function (tag, o) { const el = opt(document.createElement(tag), o); this.appendChild(el); return el; };
P.createDiv = function (o) { return this.createEl("div", o); };
P.createSpan = function (o) { return this.createEl("span", o); };
P.setText = function (s) { this.textContent = s; };
P.addClass = function (...c) { this.classList.add(...c); };
P.removeClass = function (...c) { this.classList.remove(...c); };
P.toggleClass = function (c, on) { this.classList.toggle(c, on); };
P.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };
P.setAttr = function (k, v) { this.setAttribute(k, v); };
window.__obs = {
  ItemView: class { constructor(leaf) { this.leaf = leaf; this.contentEl = document.createElement("div"); } registerDomEvent(el, ev, fn) { el.addEventListener(ev, fn); } },
  Notice: class {}, Modal: class {}, FuzzySuggestModal: class {}, MarkdownRenderChild: class {}, TFile: class {}, Platform: {}, setIcon() {}, stringifyYaml: () => "",
};
const M = require("./relto-model"), R = require("./ui-relto"), RBK = require("./relto-book"), { Dni } = require("./dni"), { makeT } = require("./i18n");

function run(host, lang, hour) {
  const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
  const mk = (p) => ({ path: p, basename: p.replace(/^.*\//, "").replace(/\.md$/, ""), extension: "md" });
  const files = [mk("Ages/Relto.md"), mk("Story/Relto Story Mode 74561208.md")];
  const fm = { "Ages/Relto.md": { age_type: "personal_hub" }, "Story/Relto Story Mode 74561208.md": { age_type: "personal_hub", relto_mode: "story" } };
  const body = { "Ages/Relto.md": "```relto\ninscription: Écris ce que tu ne peux pas dire.\n```", "Story/Relto Story Mode 74561208.md": "```relto\n```" };
  const ages = ["Glass Marsh", "Ash Tower", "Salt Court", "Iron Bay"].map((n, i) => ({ name: n, path: "Ages/" + n + ".md", verdict: "stable", stability: 90, returnTo: i < 2 ? "Relto" : null }));
  const pagesOf = (ids) => ids.map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md"));
  R.buildScene = async (plugin, f) => {
    const story = f.path.startsWith("Story/"), ids = story ? ["page_chimney", "page_lanterns", "page_fireflies", "page_aurora"] : ["page_comets", "page_mountain", "page_pine_trees", "page_mist", "page_cat"];
    const relto = { ...M.parseRelto({ seed: story ? 74561208 : 19991118, structures: ["hut", "bookshelves", "linking_pillars"], relto_pages_active: ids, ...(story ? { relto_mode: "story" } : {}) }), name: f.basename };
    if (story) relto.storyDone = ["rest", "mend", "weather", "laws", "alter"];
    const scene = M.buildScene(relto, pagesOf(ids), story ? ages.slice(0, 2) : ages);
    return { scene, relto };
  };
  const app = { vault: { getMarkdownFiles: () => files, cachedRead: async (f) => body[f.path] || "" }, metadataCache: { getFileCache: (f) => ({ frontmatter: fm[f.path] }) }, workspace: {} };
  const plugin = { app, dni, ext: { leather: true, reltoVisits: { "Ages/Relto.md": Date.now() - 3600e3, "Story/Relto Story Mode 74561208.md": Date.now() - 86400e3 * 2 } }, saveExt() {}, live: new Set(), lang: () => lang, t: makeT(() => lang) };
  const { ReltoRenderer } = require("./relto-render"), Pr = ReltoRenderer.prototype; if (!Pr.__setHour) Pr.__setHour = Pr.setHour;
  Pr.setHour = function () { Pr.__setHour.call(this, hour); }; // une heure fixe pour la capture
  const leaf = {}, v = new RBK.ReltoBookView(leaf, plugin);
  v.contentEl.className = "view-content"; v.contentEl.style.width = "1040px"; host.appendChild(v.contentEl);
  return v;
}
/** Le livre pris sur le piédestal : par-dessus un Relto de 640 × 360 (fermé, puis ouvert). */
async function runOver(host, lang, open) {
  const v = run(document.createElement("div"), lang, 15.5), box = document.createElement("div");
  box.style.cssText = "width:640px;height:360px;position:relative;background:#334;margin:10px"; host.appendChild(box);
  RBK.openInRelto(v.plugin, box, v.plugin.app.vault.getMarkdownFiles()[0], { onHere() {} });
  if (open) { await new Promise((ok) => setTimeout(ok, 50)); box.querySelector(".age-rbook__covercontainer").click(); }
}
module.exports = { run, runOver };
