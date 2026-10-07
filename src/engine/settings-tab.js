"use strict";
const obsidian = require("obsidian");
const { getLibrary } = require("./registry");

const DEFAULT_SETTINGS = {
  autoUpdateFrontmatter: !1,
  defaultPanel: "",
  generatedWindow: !0,
  libraryFolder: "",
  drawOpenSlots: !0,
  stabilityPull: "moderate",
  drawAmount: "normal",
};

const AgeSettingTab = class extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    let { containerEl: container } = this;
    container.empty();
    let library = getLibrary(),
      problems = this.plugin.libraryProblems,
      errorCount = problems.filter((problem) => problem.level === "error").length;
    (container
      .createDiv({ cls: "setting-item-description" })
      .setText(
        `Age Writer v${this.plugin.manifest.version} \u2014 library: ${library.blocks.filter((block) => block.writable).length} blocks, ${library.blocks.filter((block) => !block.writable).length} products, ${library.reactions.length} reactions, ${library.variants.length} variants` +
          (errorCount
            ? ` \xB7 ${errorCount} line${errorCount === 1 ? "" : "s"} couldn't be read`
            : problems.length
              ? ` \xB7 ${problems.length} warning${problems.length === 1 ? "" : "s"}`
              : " \xB7 no problems"),
      ),
      new obsidian.Setting(container)
        .setName("Update Age data automatically")
        .setDesc(
          "When a note with an age block is saved, write its verdict, stability and links into the note's properties (age_verdict, age_stability, age_axes, age_return, age_links, age_discovered), so Dataview can query them. Off by default: the commands do the same on demand.",
        )
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.autoUpdateFrontmatter).onChange(async (enabled) => {
            ((this.plugin.settings.autoUpdateFrontmatter = enabled), await this.plugin.saveSettings());
          }),
        ),
      new obsidian.Setting(container)
        .setName("Draw the linking panel from the Age")
        .setDesc(
          "When an Age has no panel image, paint its window from what the Age holds: its sky, weather, ground and what stands on it, animated. Turn off to get the small plain rectangle instead.",
        )
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.generatedWindow).onChange(async (enabled) => {
            ((this.plugin.settings.generatedWindow = enabled), await this.plugin.saveSettings());
          }),
        ),
      new obsidian.Setting(container)
        .setName("Let the book draw what it leaves open")
        .setDesc(
          "A book that doesn't say how many suns it has, or what its day is like, still leads somewhere: the destination fills those in, at random but always the same way for the same note (rename the note, or write a seed: line, to land elsewhere). Turn off to get a plain single sun and steady day instead.",
        )
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.drawOpenSlots).onChange(async (enabled) => {
            ((this.plugin.settings.drawOpenSlots = enabled),
              await this.plugin.saveSettings(),
              this.plugin.applyDrawingSettings());
          }),
        ),
      new obsidian.Setting(container)
        .setName("How much the book draws")
        .setDesc(
          "How many open slots get filled. Normal: as before. Little: most open slots stay empty (good for an Age you have already written in detail). A lot: more winds, rains, ruins and the like. The same note still lands the same way.",
        )
        .addDropdown((dropdown) =>
          dropdown
            .addOptions({ few: "Little", normal: "Normal", many: "A lot" })
            .setValue(this.plugin.settings.drawAmount)
            .onChange(async (amount) => {
              ((this.plugin.settings.drawAmount = amount),
                await this.plugin.saveSettings(),
                this.plugin.applyDrawingSettings());
            }),
        ),
      new obsidian.Setting(container)
        .setName("How much a clash steers the draw")
        .setDesc(
          "What is drawn is made less likely when it would clash with what you wrote (a plant under a sky with no sun), never impossible. None: ignore clashes. Strong: nearly always avoid them.",
        )
        .addDropdown((dropdown) =>
          dropdown
            .addOptions({ none: "None", gentle: "Gentle", moderate: "Moderate", strong: "Strong" })
            .setValue(this.plugin.settings.stabilityPull)
            .onChange(async (pull) => {
              ((this.plugin.settings.stabilityPull = pull),
                await this.plugin.saveSettings(),
                this.plugin.applyDrawingSettings());
            }),
        ),
      new obsidian.Setting(container)
        .setName("Library folder")
        .setDesc(
          "Notes holding an age-library block add their own blocks, reactions and variants to the built-in ones. Leave empty to read every note in the vault, or name a folder (e.g. Ages/Library) to read only that one.",
        )
        .addText((text) =>
          text
            .setPlaceholder("(whole vault)")
            .setValue(this.plugin.settings.libraryFolder)
            .onChange(async (folder) => {
              ((this.plugin.settings.libraryFolder = folder.trim()),
                await this.plugin.saveSettings(),
                this.plugin.loadLibrary());
            }),
        ),
      new obsidian.Setting(container)
        .setName("Default linking panel image")
        .setDesc(
          "A GIF (or any image) from your vault, shown in the linking panel of every Age that doesn't name its own with a `panel: [[file.gif]]` line. File name or path, e.g. linking-panel.gif. Leave empty to keep the small drawn panel.",
        )
        .addText((text) =>
          text
            .setPlaceholder("linking-panel.gif")
            .setValue(this.plugin.settings.defaultPanel)
            .onChange(async (path) => {
              ((this.plugin.settings.defaultPanel = path.trim()), await this.plugin.saveSettings());
            }),
        ));
  }
};

module.exports = { AgeSettingTab, DEFAULT_SETTINGS };
