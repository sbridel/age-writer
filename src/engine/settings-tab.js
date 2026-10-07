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
};

const AgeSettingTab = class extends obsidian.PluginSettingTab {
  constructor(t, i) {
    super(t, i);
    this.plugin = i;
  }
  display() {
    let { containerEl: t } = this;
    t.empty();
    let i = getLibrary(),
      r = this.plugin.libraryProblems,
      s = r.filter((a) => a.level === "error").length;
    (t
      .createDiv({ cls: "setting-item-description" })
      .setText(
        `Age Writer v${this.plugin.manifest.version} \u2014 library: ${i.blocks.filter((a) => a.writable).length} blocks, ${i.blocks.filter((a) => !a.writable).length} products, ${i.reactions.length} reactions, ${i.variants.length} variants` +
          (s
            ? ` \xB7 ${s} line${s === 1 ? "" : "s"} couldn't be read`
            : r.length
              ? ` \xB7 ${r.length} warning${r.length === 1 ? "" : "s"}`
              : " \xB7 no problems"),
      ),
      new obsidian.Setting(t)
        .setName("Update Age data automatically")
        .setDesc(
          "When a note with an age block is saved, write its verdict, stability and links into the note's properties (age_verdict, age_stability, age_axes, age_return, age_links, age_discovered), so Dataview can query them. Off by default: the commands do the same on demand.",
        )
        .addToggle((a) =>
          a.setValue(this.plugin.settings.autoUpdateFrontmatter).onChange(async (c) => {
            ((this.plugin.settings.autoUpdateFrontmatter = c), await this.plugin.saveSettings());
          }),
        ),
      new obsidian.Setting(t)
        .setName("Draw the linking panel from the Age")
        .setDesc(
          "When an Age has no panel image, paint its window from what the Age holds: its sky, weather, ground and what stands on it, animated. Turn off to get the small plain rectangle instead.",
        )
        .addToggle((a) =>
          a.setValue(this.plugin.settings.generatedWindow).onChange(async (c) => {
            ((this.plugin.settings.generatedWindow = c), await this.plugin.saveSettings());
          }),
        ),
      new obsidian.Setting(t)
        .setName("Let the book draw what it leaves open")
        .setDesc(
          "A book that doesn't say how many suns it has, or what its day is like, still leads somewhere: the destination fills those in, at random but always the same way for the same note (rename the note, or write a seed: line, to land elsewhere). Turn off to get a plain single sun and steady day instead.",
        )
        .addToggle((a) =>
          a.setValue(this.plugin.settings.drawOpenSlots).onChange(async (c) => {
            ((this.plugin.settings.drawOpenSlots = c),
              await this.plugin.saveSettings(),
              this.plugin.applyDrawingSettings());
          }),
        ),
      new obsidian.Setting(t)
        .setName("How much a clash steers the draw")
        .setDesc(
          "What is drawn is made less likely when it would clash with what you wrote (a plant under a sky with no sun), never impossible. None: ignore clashes. Strong: nearly always avoid them.",
        )
        .addDropdown((a) =>
          a
            .addOptions({ none: "None", gentle: "Gentle", moderate: "Moderate", strong: "Strong" })
            .setValue(this.plugin.settings.stabilityPull)
            .onChange(async (c) => {
              ((this.plugin.settings.stabilityPull = c),
                await this.plugin.saveSettings(),
                this.plugin.applyDrawingSettings());
            }),
        ),
      new obsidian.Setting(t)
        .setName("Library folder")
        .setDesc(
          "Notes holding an age-library block add their own blocks, reactions and variants to the built-in ones. Leave empty to read every note in the vault, or name a folder (e.g. Ages/Library) to read only that one.",
        )
        .addText((a) =>
          a
            .setPlaceholder("(whole vault)")
            .setValue(this.plugin.settings.libraryFolder)
            .onChange(async (c) => {
              ((this.plugin.settings.libraryFolder = c.trim()),
                await this.plugin.saveSettings(),
                this.plugin.loadLibrary());
            }),
        ),
      new obsidian.Setting(t)
        .setName("Default linking panel image")
        .setDesc(
          "A GIF (or any image) from your vault, shown in the linking panel of every Age that doesn't name its own with a `panel: [[file.gif]]` line. File name or path, e.g. linking-panel.gif. Leave empty to keep the small drawn panel.",
        )
        .addText((a) =>
          a
            .setPlaceholder("linking-panel.gif")
            .setValue(this.plugin.settings.defaultPanel)
            .onChange(async (c) => {
              ((this.plugin.settings.defaultPanel = c.trim()), await this.plugin.saveSettings());
            }),
        ));
  }
};

module.exports = { AgeSettingTab, DEFAULT_SETTINGS };
