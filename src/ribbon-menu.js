"use strict";
/**
 * Le ruban : deux icônes, chacune ouvre un menu (comme les plugins qui rangent leurs commandes sous une seule icône).
 * - **Age Writer** : le Relto, l'Âge ouvert, les livres et le guide, l'histoire, le son.
 * - **Maintenance et essais** : les commandes de débogage, de réparation et d'essai.
 * Chaque entrée est une commande déjà enregistrée : son nom vient de la palette, et une commande qui ne s'applique pas
 * ici (pas d'Âge ouvert, par exemple) est grisée, comme dans la palette.
 */
const MAIN = [
  [["open-relto-book", "book-open"], ["open-relto", "mountain"], ["open-relto-view", "maximize-2"], ["create-relto-page", "file-plus"]],
  [["open-age-book", "book"], ["create-exploration-journal", "notebook-pen"], ["save-age-cover", "image"], ["save-age-window-gif", "film"], ["update-age-data", "refresh-cw"], ["random-age", "dices"], ["generate-age-map", "map"]],
  [["open-guide", "help-circle"], ["open-reference", "library"], ["open-glyph-book", "languages"], ["open-library-book", "book-copy"]],
  [["start-story", "scroll-text"], ["story-hint", "lightbulb"], ["story-check", "check-circle"], ["story-next", "skip-forward"]],
  [["stop-soundscape", "volume-x"]],
];
const DEV = [
  [["mutation-advance", "flask-conical"], ["dni-numerals-report", "binary"]],
  [["story-repair", "wrench"], ["story-restart", "rotate-ccw"], ["keep-world-former-name", "history"], ["forget-great-zero", "telescope"], ["clean-star-chart", "eraser"], ["memories-clear", "trash-2"]],
  [["update-age-data-all", "refresh-ccw"], ["create-age-library", "file-plus-2"], ["export-builtin-library", "copy"], ["reload-age-library", "rotate-cw"]],
  [["toggle-relto-ribbon", "toggle-left"]],
];

/** Le nom d'une commande, sans le préfixe « Age Writer: » que la palette ajoute. */
const shortName = (n) => String(n || "").replace(/^[^:]+:\s*/, "");

/** Peut-on la lancer ici ? Une commande à vérification (`checkCallback`) le dit ; les autres, toujours. */
function usable(cmd) {
  try { if (typeof cmd.checkCallback === "function") return !!cmd.checkCallback(true); } catch (e) { return false; }
  return !(typeof cmd.editorCheckCallback === "function" || typeof cmd.editorCallback === "function") || !!(cmd.app && cmd.app.workspace && cmd.app.workspace.activeEditor);
}

/** Les entrées d'un menu : [{ id, title, icon, disabled }] (sans Obsidian : testable). */
function entriesOf(plugin, groups) {
  const reg = plugin.app && plugin.app.commands && plugin.app.commands.commands ? plugin.app.commands.commands : {}, pid = (plugin.manifest && plugin.manifest.id) || "age-writer";
  return groups.map((g) => g.map(([id, icon]) => { const full = `${pid}:${id}`, cmd = reg[full]; return cmd ? { id: full, title: shortName(cmd.name), icon, disabled: !usable(cmd) } : null; }).filter(Boolean)).filter((g) => g.length);
}

/** Ouvre un menu sous la souris ; `head` : une première entrée qui n'est pas une commande ({ title, icon, run }). */
function show(plugin, evt, groups, head = null) {
  const obs = require("obsidian"), m = new obs.Menu();
  if (head) { m.addItem((it) => it.setTitle(head.title).setIcon(head.icon).onClick(head.run)); m.addSeparator(); }
  entriesOf(plugin, groups).forEach((g, i) => {
    if (i) m.addSeparator();
    for (const e of g) m.addItem((it) => { it.setTitle(e.title).setIcon(e.icon); if (e.disabled && typeof it.setDisabled === "function") it.setDisabled(true); it.onClick(() => plugin.app.commands.executeCommandById(e.id)); });
  });
  if (evt && typeof m.showAtMouseEvent === "function") m.showAtMouseEvent(evt); else if (typeof m.showAtPosition === "function") m.showAtPosition({ x: 40, y: 80 });
}

/** Pose les deux icônes du ruban. `primary` : l'action de la première entrée (le Livre du Relto, ou le dernier Relto visité). */
function install(plugin, primary) {
  if (typeof plugin.addRibbonIcon !== "function") return;
  plugin.addRibbonIcon("mountain", "Age Writer", (evt) => show(plugin, evt, MAIN, { title: plugin.t("relto.ribbon"), icon: "sparkles", run: primary }));
  plugin.addRibbonIcon("wrench", plugin.t("ribbon.dev"), (evt) => show(plugin, evt, DEV));
}

module.exports = { install, entriesOf, MAIN, DEV, shortName };
