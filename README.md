# Age Writer

[Français](README.fr.md) · **English**

An Obsidian plugin inspired by Mystcraft and the Myst series. You write an **Age** (a world) in an `age` block, one page per line, and the plugin works out the rest: description, stability, a painted and animated linking window, a flippable book with its cover, a map of linked worlds, and a refuge (the **Relto**) where your Ages are shelved. Everything is local: no network, no AI at runtime, every sound is synthesized and every picture is procedural.

The founding idea: in Mystcraft you don't **create** a world, you **link** to a world that already exists. What you write describes it; what you leave open is drawn by lot, always the same way for the same note. And if you rewrite a world you've already explored, you damage it.

> Fan project, not affiliated with or endorsed by Cyan Worlds. No Myst asset (font, image, sound) is included.

**Version 1.15.2.** The engine (derived from 1.3.0) is available as readable sources in `src/engine/`. `manifest.json` announces `1.15.2`. Highlights of the latest releases (full history in [`docs/NOTES-historique.md`](docs/NOTES-historique.md)):

- **1.15.x**: the cabin plays a crackling **fireplace** when the *chimney* page is active (soft rumble, wood crackles; a cold hearth is silent). Optional "fireplace sound file" setting to use a real recording.
- **1.14.x**: pond, purr and meow sounds can come from **real recordings** in your vault (Settings > Sound > Relto; ogg, mp3 or wav; empty = synthesized). Files are not shipped: use royalty-free sounds (CC0 or a licence that allows your use; check each sound's page). A meow file containing **several meows** is split at the silences and one is played at a time. **Northern lights** are only visible at night, in the Relto and in Ages. New pages: **page_cat_toys** and **page_pond_decor** (the close-up "Pond, close up" view with lilies, stone lantern, bamboo spout, reeds, dragonflies by day, fireflies at dusk).
- **1.13.x**: **procedural koi patterns** (kohaku, sanke, showa, tancho, asagi, orange, yamabuki); synthesized close-up sounds; **island layout** (cabin, pond, linking pillars, cat, stalk tree, bench and standing stones are placed side by side without overlapping; what doesn't fit stays in the sub-views); **navigation buttons** in the top bar (island, global view, cabin, pillars, grove, pond, cat); bigger **mountain** with a **stream** down to the pond and off the island; *page_stalk_tree*; flying **lanterns**.
- **1.12.0**: first **point-and-click sub-views**: click the cabin to see its **interior** (fireplace, big shelf of Ages, glyph book and library book on the table, door back out); click the pillars for the **linking pillars** view.
- **1.11.x**: a **global view** of the Relto and **14 new pages** (rain, storm, birds, butterflies, moon & sun, dock, bench, islets, calendar pinnacle, blue flowers, grass, ponderosa pines, maples, crystal tree).

---

## Contents

1. [Installation](#1-installation)
2. [Quick start](#2-quick-start)
3. [Writing an Age](#3-writing-an-age)
4. [The Age block: three tabs](#4-the-age-block-three-tabs)
5. [The book](#5-the-book)
6. [The Relto](#6-the-relto)
7. [Sounds](#7-sounds)
8. [The world: stability, drawing, law of change](#8-the-world)
9. [Window, effects, traps](#9-window-effects-traps)
10. [D'ni, mechanisms, journal](#10-dni-mechanisms-journal)
11. [Settings](#11-settings)
12. [Built-in guide](#12-built-in-guide)
13. [Commands](#13-commands)
14. [Known limitations](#14-known-limitations)
15. [Development](#15-development)
16. [Licences and credits](#16-licences-and-credits)

---

## 1. Installation

Manual, for now:

1. Get `main.js`, `styles.css`, `manifest.json` (build them, see §15).
2. Copy them to `<vault>/.obsidian/plugins/age-writer/`.
3. In Obsidian: *Settings → Community plugins*, reload, enable **Age Writer**.

The extension's settings live in the plugin's settings tab, under the "Extensions" heading. The interface language follows Obsidian's (English or French). The engine's content (block names, generated descriptions) is in English.

---

## 2. Quick start

1. Write an `age` block in a note:

````
```age
single_sun
water
return: [[Hub]]
link: [[Sunder Reach]]
```
````

2. Below the block, the panel appears (tabs *Text & glyphs*, *Linking window*, *Details*).
3. Run **Open this Age as a book**: the book opens in a tab, on its cover.
4. Run **Create a Relto page**, then put a `relto` block in a note: your refuge, with your Ages on the shelf.
5. If you get lost: **Open the Age Writer guide** (short guide) or **Open the Age Writer full reference**.

---

## 3. Writing an Age

An `age` code block, one page per line (a block identifier), plus special lines.

| Line | Effect |
|---|---|
| `link: [[Note]]` | linking book to another Age (several allowed) |
| `return: [[Note]]` | return book |
| `panel: [[image]]` | your own window image |
| `seed: 42` | changes the draw (same note + same seed = same world) |
| `cover: sober` | cover sobriety: `ornate`, `classic`, `sober`, `plain`, or 0 to 1 |
| `window_style: generative` | window rendering (`generative` or `classic`) |
| `window_size: xl` / `window_width: 520` | window size |
| `fx: tv` | window effect: `classic`, `static`, `ripple`, `sweep`, `tv`, `random`, `off` |
| `day_length: 40`, `year_length: 12` | day length (real minutes) and year length (days), generative rendering |
| `many: ruins` / `few: rain` / `normal: water` | quantities |
| `mechanism: orrery` | the Age's mechanism |
| `trap book` | trap book (neither return nor crack) |
| `damaged_pages = 2`, `removed_pages = 1` | damaged linking book |

Special lines are ignored by the engine: they don't count as pages. The complete list of blocks (92 identifiers, by axis) and all aliases is in the **full reference** built into the plugin.

---

## 4. The Age block: three tabs

So as not to show everything at once, the panel below the block has three tabs (setting *Tabs in the Age block*):

- **Text & glyphs**: description and glyphs, with a small centred linking window;
- **Linking window**: the big window; a click plays the linking sound;
- **Details**: stability, mechanisms, journal, "Listen to the Age" button.

---

## 5. The book

Command **Open this Age as a book**. It opens in a main tab (or a window, or the side panel: setting *Open the book in*), always on the **Cover**.

- **Cover**: generated from the Age (marble, leather, ribbed spine, corners or rivets, medallion or cartouche, wear according to the verdict). Adjustable sobriety, from very ornate to bare; SVG export.
- **Descriptive book**: the world's pages; ✓ keeps a drawn page, × removes it; a palette adds or removes pages.
- **Linking book**: three pages on the right (glyphs + text, linking pane, links). Turn pages by clicking the right page (next) or the left page (previous), with a page-turn sound.

Clicking the pane or "open ↗" links you to the target Age (sometimes uncertainly if the book is damaged).

---

## 6. The Relto

Your refuge: an island with a cabin, a shelf of books (your Ages, clickable and coloured by stability), linking pillars, and **pages** that add elements and moods. A `relto` block in a note displays it.

### Tabs

A thin row of discreet icons above the picture:

| Tab | Content |
|---|---|
| **View** (eye) | the picture; below it, the time and D'ni time in large type. Clicking the time hides it; it fades by itself after a few seconds unless the mouse is over the view. The D'ni name is shown small, at the top, in the black band |
| **Pages** | active, available and locked pages; books shown on the shelf |
| **Settings** | sky time, ambience, level, volume |
| **Enlarge** | opens the **Relto view** in a main tab (also: command *Open the Relto view (large)*) |

In the Relto view, a **fullscreen** icon puts the picture on the whole screen; the icon bar and time float above it and fade. Esc to leave. Relto sound keeps playing when you switch tabs.

### Navigation and sub-views

Since 1.13 a **navigation bar** sits in the band above the picture: **island** (opening view), **global view**, **cabin**, **linking pillars**, **grove**, **pond**, **pond ++** and **cat**. You can also click things directly in the island view (the cabin, the pillars, the pond, the cat…). Which buttons are available depends on the active pages.

- **Island layout**: cabin, pond, pillars, cat, stalk tree, bench and standing stones are placed by a deterministic layout so that big elements never overlap. If not everything fits, the least important ones stay in their sub-views.
- **Cabin interior**: fireplace (lit when the *chimney* page is active, otherwise "Cold hearth"), a 3×10 shelf of your Ages (each book clickable), a table with the glyph book and the library book, a door back to the island.
- **Linking pillars**: the linking window lights up when Ages lead back to this Relto.
- **Grove, pond, cat, pond ++**: close-up views. *Pond ++* (page *page_pond_decor*) shows the pond almost full frame with lilies, a stone lantern, a bamboo spout, reeds, pebbles and seaweed, dragonflies by day and fireflies at dusk. Cat toys (page *page_cat_toys*): rolling yarn ball, squeaking mouse, jingle ball, feather wand, cardboard box; click a toy.

### The Relto's two special books

At the foot of the shelf (in the cabin since 1.12), two books look different from the Ages (also in the **Pages** tab, and by commands):

- **Book of glyphs** (turquoise, diamond): a click opens the list of glyphs *used* in the Ages on the shelf, with their drawing and the Ages where they appear (click = open the Age). For now "known" = written in an Age; the future game loop may limit it to discovered glyphs. Command: *Open the book of glyphs*.
- **Library book** (red, clasp): a click offers *Blocks, reactions and Age variants* (`age-library`) or *Relto pages* (`relto-library`). The plugin opens the existing library note, or creates it with a commented example (`Age Library.md`, `Relto Library.md`, in the library folder if set). Command: *Open a library note*.

A Relto page's syntax accepts `page lagoon: …` or `page_lagoon: …`.

### The global view

A small button (globe) at the top left toggles between the **island view** (opening view) and the **global view**: the Relto seen from afar, the island at the centre in the sea of mist, rock pinnacles emerging. Pages add their elements there: **islets** (page *Islets*), the rope **bridge** joining them, the **calendar pinnacle** (page *Calendar pinnacle*, which carries the D'ni day), the sky (moon, rain, storm, birds, aurora, snow). A click on the island ("Your Relto") returns to the island view.

### Scenery, sky and wildlife pages

| Page | What it adds |
|---|---|
| *Rain*, *Storm* | rain; storm with spaced lightning and a darkened sky (`rain`, `storm`, density 0 to 1) |
| *Birds*, *Butterflies* | birds crossing the sky (mostly by day); butterflies fluttering around the island |
| *Moon & sun* | a large moon and its small companion, visible by day too |
| *Dock* | a dock in the mist, right of the island, with a boat and a lantern at night (becomes a rope **bridge** to the pinnacle when the *Calendar pinnacle* page is active) |
| *Bench* | a wooden bench |
| *Islets* | floating islets behind the island (density = number) |
| *Calendar pinnacle* | a standing stone on an islet that shows the D'ni day |
| *Blue flowers* | low flowers along the ground (`asset`: blue, red, yellow, white, pink) |
| *Grass* | tall grass along the ground |
| *Ponderosa pines*, *Maples*, *Crystal tree* | background trees (`vegetation` with `asset` ponderosa, maple, crystal) |
| *Stalk tree* | a single stalk tree (`page_stalk_tree`) |
| *Flying lanterns* | lanterns floating up into the sky |

Each page is a preset ("New page"), and all these effects can also be written in a `relto-library` block, for example `page rain: Rain | rain 0.9, birds 0.4 | audio=soft_rain`.

### Koi pond and cat

- **Koi pond** (page *Koi pond*): a cross-section pond right of the cabin, with swimming carp. Koi patterns are **procedurally generated** (kohaku, sanke, showa, tancho, asagi, orange, yamabuki), deterministic from the Relto seed. A **rare koi** joins them: `koi_rare` in the page note's properties is `ogon` (gold), `platinum` or `ghost`. With no value, the variety is drawn from the Relto seed. `koi_name` names the rare koi (default "Ogon", "Platinum" or "Ghost"). A click on the koi (or the cat) shows its name for a moment.
- **Cat** (page *Cat*): sits left of the cabin, blinks, flicks its tail and sleeps at night. In the page note, `cat_name` gives its name (shown on hover) and `cat_color` its coat: `black`, `white`, `orange`, `grey`, `cream`, `tabby`, `calico`, `tuxedo`, `siamese`, or a `#rrggbb` code.
- In a `relto-library` block: `page cat: Cat | cat color=black name="Little Wolf"` and `page pond: Pond | koi 0.8 rare=platinum` (`koi` density sets the number of carp).

Trees (pines, birches, palms) are tall and drawn in the background, behind the cabin, shelf, cat and pond, and they avoid the exact spot of the cat, the pond and the two special books: nothing hides them.

### Built-in pages

Pines, birches, palms, ferns, waterfall, fireflies, lanterns, snow, aurora, fireworks, mountain, menhirs, chimney, mist, and under the island: **gems, gold, silver** (veins and crystals in the rock, glittering). The mountain is bigger and carries the source of a **stream** that runs down to the pond and falls off the island. "New page" creates a page; you can also write them by hand (one note per page) or in a `relto-library` block:

````
```relto-library
page lagoon: Lagoon | vegetation 0.5 palm, gold 0.6 | audio=river | unlock=[[Glass Marsh]]:60
```
````

The shelf's books are chosen with the checkboxes in the Pages tab, or with the block's `folders:`, `exclude:`, `books:` options.

---

## 7. Sounds

Everything is synthesized (Web Audio). Three gestures, three sounds, each adjustable separately:

| Gesture | Sound | Setting |
|---|---|---|
| Handling the book (the book view opens) | thud, leather, pages; then 2 to 5 clasp clicks | *Book sound*, *Clasp clicks* |
| Moving into the Age (the note opens) or touching a window | linking sound, eleven variants drawn at random | *Linking sound* |
| Turning a linking-book page | paper rustle | *Turned pages* |

When the book is already open, clicking a window only replays the linking sound. Ambiences (Relto, Age) start with the ♪ button; levels minimal / zen / full.

**Close-up views** have their own sounds (setting *Close-up view sounds*): a very light trickle at the pond, a purr and meow at the cat (click the cat to make it meow), a crackling fire in the cabin when the chimney page is active. They can come from **real recordings** in your vault: *Settings > Sound > Relto*, "Pond / Purr / Meow / Fireplace sound file" (ogg, mp3 or wav; empty = synthesized). A file with several meows is split at the silences. Files are not provided with the plugin.

---

## 8. The world

- **Stability**: five axes (cosmological, geological, weather, ecological, metaphysical) plus the `alteration` axis. The Age takes the stability of its weakest axis: ≥ 75% stable, 40–74% unstable, < 40% dying.
- **Drawing**: what the book leaves open is drawn, always the same for the same note. A vague book lands on a stable world about 96% of the time.
- **Crack**: about half of worlds have none. With no return book **and** no crack, the Age is a trap.
- **Law of change**: while the ink is fresh (15 min by default) you can retouch. After that, changing the world (adding or removing a page) damages it (0.06 instability per element, capped at 0.30), then it slowly heals. Spaces, line breaks, case and renaming don't count.
- **Extended sky** (belt and asteroid field, rings, comet, coloured suns), **world types** (frozen, lava, desert, ocean, jungle), **riches and scars** (gold, silver, gems… offset by scars up to 75%): see the full reference.
- **Aurora** is only visible at night, in Ages as in the Relto (it rises at dusk and fades at dawn).

---

## 9. Window, effects, traps

- **Rendering**: `classic` (the engine's painted window) or `generative` (landscape drawn from the seed: sky, relief, vegetation, weather, reflections, foreground, one inhabited detail).
- **Effects**: static, ripple, sweep, old TV… depending on instability; `prefers-reduced-motion` is respected.
- **Damage**: `damaged_pages` (shifted zones, colour separation, frozen, ink stains), `removed_pages` (burnt holes), fractures as instability rises. Drawn from the book's seed.
- **Trap book**: `trap book`. It looks normal.
- **Uncertain links** (setting): above 30% link instability, the link may flicker or slide to another book of the same Age.

---

## 10. D'ni, mechanisms, journal

- **D'ni numerals** in base 25 (Age number, seed, puzzles, clock). Levels: installed font (not provided), local glyph file, numerals drawn by the plugin. **D'ni time** in the Relto from the computer's clock.
- **Mechanisms**: eleven (steam elevator, sluice, telescope, sound lock, frequency array, generator, holographic imager, orrery, lock, wind organ, lens array), each with a state and a puzzle.
- **Solitude**: weights the draw toward deserted worlds.
- **Exploration journal**: an `age-journal` block written as you go through linked notes; Atrus, Gehn or Miller voice.
- **Personal library**: `age-library` blocks define your own blocks, products, reactions and variants.

---

## 11. Settings

In the plugin's settings tab: a **Guide** card (Guide and Reference buttons) then seven sections, each with an icon, a description and its current value.

| Section | Content |
|---|---|
| Books & covers | leather, cover tab, where the book opens, open on cover, cover sobriety, 3-page book |
| Sounds | sounds (general), volume, book sound, clasp clicks, turned pages, linking sound, Relto ambience and volume, close-up view sounds and optional recordings |
| Linking window | Age block tabs, rendering, size, effect, intensity, uncertain links |
| D'ni & numerals | language, numerals, font, numbers, D'ni names, D'ni time, Relto in tabs |
| Ages & mechanisms | law of change, ink, healing, mechanisms, solitude |
| Folders | journals, refuge |
| Draw & library | engine settings: automatic properties, drawn window, open-slot draw, fold strength, library folder, default panel image |

Notable defaults: leather and cover on; book in a main tab, opened on the cover; cover "auto"; large window; ink 15 min; healing 0.05 per day; Relto ambience zen; volume 0.35; Relto in tabs on.

---

## 12. Built-in guide

Two levels, in a window with sections (and exportable as notes):

- **Short guide**: writing an Age, the block, the book, the Relto, sounds, the law of change, settings;
- **Full reference** (in French): all lines and aliases, the 92 blocks by axis, extended sky, quantities, stability, window, traps, Relto (YAML note, pages, options), D'ni, mechanisms, journal, sounds, library, all settings, commands, properties, limitations.

---

## 13. Commands

| Command | Role |
|---|---|
| Open this Age as a book | book view |
| Open the Relto · Open the Relto view (large) | refuge in a note · dedicated view |
| Create a Relto page | creates a refuge page |
| Open the Age Writer guide · full reference | short guide · full reference |
| Save this Age's book cover (SVG) | cover as SVG |
| Create the exploration journal for this Age | journal |
| Save this Age's window as a GIF | window export |
| Generate the Age map (canvas) | map of linked Ages (blue = round trip, orange = one way) |
| Update Age data in this note / in every note | writes `age_verdict`, `age_stability`, `age_axes`, `age_return`, `age_links`, `age_discovered`, `age_drawn`, `age_home` |
| Create / Reload an Age library · Copy the built-in content | personal library |
| Open the book of glyphs · Open a library note | the Relto's special books |
| Stop the soundscape | stops the ambience |

---

## 14. Known limitations

- **Real Obsidian**: the plugin is tested by automated tests (jsdom, fake AudioContext, Chromium renders, integration against the real `main.js`), but not systematically inside Obsidian itself. Mobile and light theme are untested.
- Close-up view sounds have been tuned by ear in a few iterations; recordings from your vault are the fallback if the synthesized ones don't suit you.
- Settings use Obsidian's classic components, with hand-made section navigation (not the recent settings API).
- The law of change stores its state by **note name**.
- A note with several `age` blocks: each block draws its own world.
- The world is entirely on water or entirely dry: no shoreline.
- Generative rendering doesn't apply to GIF export.
- The engine's content is in English; the full reference is in French only.
- The vocabulary "Relto", "D'ni" appears in the interface and YAML keys.

---

## 15. Development

Since 1.7.0, **all the code is readable**: the original engine (1.3.0, whose TypeScript sources were lost) was de-minified, renamed and split into modules in `src/engine/` (`registry`, `rules`, `draw`, `resolve`, `prose`, `glyphs`, `analysis`, `book-view`, `settings-tab`, `plugin`…). The old regex patches on minified code are gone: the touch points with the extension are real calls to `src/engine/hooks.js`. The original 1.3.0 `main.js` is kept as is in `legacy/` (provenance).

The build produces **two versions of the same code**:
- `dist/`: **readable** (unminified), for reading, debugging, tracing an error;
- `release/`: **minified**, the one you install or publish.

```sh
npm install          # once (jsdom, eslint, esbuild: development only)
npm run build        # src/ → dist/ (readable) + release/ (minified)
npm test             # all tests, on the readable build then on the minified one
npm run lint
npm run equiv -- <old main.js>      # non-regression: 600 random Ages, old build vs new
node test/visual/make.js            # render pages in test/visual/out/
npm run zip          # release/age-writer-<v>.zip (plugin) + -src.zip (sources)
```

In `src/`: `main.js` (entry point: assembles engine + extension), `engine/` (the engine), then the extension layer: `entry.js` (book and block patches), `ui-extras.js` (panel and tabs), `ui-relto.js` (Relto, dedicated view, navigation), `relto-render.js` (canvas), `relto-rooms.js` (cabin, pillars, pond, pond ++, cat, grove), `relto-model.js` (pages, island layout), `relto-scenery.js`, `relto-global.js`, `relto-books.js`, `cover.js` (covers), `sound.js` (sounds, room sounds), `linkfx.js` and `genscene.js` (window), `law.js` (law of change), `mech.js` (special lines), `settings-ui.js` (settings), `guide.js` (guide), `i18n.js`. Details: [`docs/DEV.md`](docs/DEV.md) (in French).

---

## 16. Licences and credits

To complete before publication:

- **Project licence**: to be chosen (`LICENSE` file).
- **gifenc** (MIT, © Matt DesLauriers): GIF export, bundled in the engine.
- **Tracery** (`tracery-grammar`, ISC, © Kate Compton): prose, bundled in the original engine; licence text to be attached, or replace it.
- **D'ni font**: not provided; everyone uses their own copy, under its licence.
- Fan project, not affiliated with or endorsed by Cyan Worlds.
