"use strict";
/**
 * Point d'entrée du plugin Age Writer (ce que charge Obsidian).
 * Assemble le moteur (src/engine/) et la couche d'extension (src/entry.js et modules voisins) :
 * la classe exportée est le plugin d'origine étendu.
 */
const { AgeWriterPlugin } = require("./engine/plugin");
const { hooks } = require("./engine/hooks");
const { analyseAge, extractAge, noteName, pageList } = require("./engine/analysis");
const { glyphSvg } = require("./engine/glyphs");
const { describeAge } = require("./engine/prose");
const { blockById } = require("./engine/registry");
const { BookView } = require("./engine/book-view");
const { AgeSettingTab } = require("./engine/settings-tab");
const { LIBRARY_TEMPLATE } = require("./engine/library");

// Ce que la couche d'extension utilise du moteur.
const core = {
  analyse: analyseAge, extract: extractAge, base: noteName, glyphSvg, prose: describeAge,
  glyphs: pageList, blocks: blockById, libraryTemplate: LIBRARY_TEMPLATE, BookView, SettingsTab: AgeSettingTab,
};

module.exports = { __esModule: true, default: require("./entry")(AgeWriterPlugin, core, hooks) };
