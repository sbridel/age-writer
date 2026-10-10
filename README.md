# Age Writer

[Français](README.fr.md) · **English**

An Obsidian plugin for writing worlds. You write an **Age** (a world) in an `age` block, one page per line, and the plugin works out the rest: description, stability, a painted and animated linking window, a flippable book with its cover, a map of linked worlds, and a refuge (the **Relto**) where your Ages are shelved. Everything is local: no network, no AI at runtime, every sound is synthesized and every picture is procedural.

The founding idea: you don't **create** a world, you **link** to a world that already exists. What you write describes it; what you leave open is drawn by lot, always the same way for the same note. And if you rewrite a world you've already explored, you damage it.

> **This product contains trademarks and/or copyrighted works of Cyan. All rights reserved by Cyan. This product is not official and is not endorsed by Cyan.**
>
> Fan project made under Cyan's Fan-Made Content Policy. Not affiliated with or endorsed by Cyan Worlds. No Myst asset (font, image, sound) is included. Free and non-commercial.
>
> Inspired by the Myst series (and the Mystcraft idea of linking to a world rather than creating one). A tribute: the names borrowed from the Myst universe (Age, Relto, D'ni, linking book, Descriptive Book…) are an homage and a source of inspiration, not a reproduction. The code, the pictures, the sounds and the texts are original. Licence: MIT.

## Inside the fiction

Age Writer is built to be **diegetic**: almost everything it shows is something that happens *in the world*, not a feature of an app. You are not filling in a form; you are a Writer at a desk, and your vault is a library of Descriptive Books.

- **Your note is a Descriptive Book.** Each line of the `age` block is a phrase of the Art. The text under the block is what the book says back once written: *"The sun burns white, leaving no corner kind."* Nothing in it is a label or a field name.
- **What you leave unwritten is not empty.** The dark fills it, and the book tells you so: *"Unwritten, it was drawn from the dark: a pale companion trails the main star."* Same note, same world, every time: you link to a world that exists, you don't roll a new one.
- **Stability is how well the Art holds**, not a score. An Age is *stable*, *unstable* or *dying*; contradictions read as the world's own unease (*"a frozen world does not thaw for what is written upon it"*).
- **Worlds have physics.** The core cools, the air escapes a small world, a red dwarf locks one face in night. When something doesn't hold, the explanation is about the world (*"a molten core, but the interior has cooled"*), and the fix is offered as a line of Art you could write (`age: 3.5`).
- **You look through a linking panel.** Each Age has its own living window: its sky, its relief, its shore, the branch or reeds at the edge of the frame, its weather and its light at this hour. Click it and you hear the link.
- **Books behave like books.** A cover drawn from the Age, a clasp that clicks, pages that turn. A trap book looks like any other. Damaged or torn pages make the link uncertain. Rewriting a world you have already explored **damages it** (the law of change): the Art remembers.
- **Numbers are D'ni.** Age numbers, seeds, puzzles and the Relto clock are written in base 25; the Relto keeps D'ni time.
- **Home is a place.** The Relto is your Age: an island, a cabin, a shelf where your Ages stand as books coloured by their stability. Pages you earn by writing (a stable Age, a number of Ages) change the island. In the evening the cat sleeps on the rug by the fire. No physics applies here: it is the one place where nothing pushes back.
- **The journal is written, not logged.** Exploring an Age leaves entries in a voice, alongside the notes that mention it.

Two places step outside the fiction on purpose: the **Details** tab (stability per axis, causes, numbers: read it as a Guild surveyor's notes on your book) and the **Settings**. Everything else tries to stay in the world.

**Status.** Released, desktop only, sandbox mode (see [What's next](#15-whats-next)). The current version is the one in [`manifest.json`](manifest.json) and on the [Releases](https://github.com/sbridel/age-writer/releases) page; what changed in each version is in [`CHANGELOG.md`](CHANGELOG.md) (a more detailed developer log, in French, is in [`docs/NOTES-historique.md`](docs/NOTES-historique.md)).

Recent additions: **the Art of the Guild** (setting *Instruments*: a blank book in the Imager that you tune until a world appears, sometimes one no one has written; a pendulum metronome in the observatory to tell the true pulse from false ones), the **D'ni clock** that wakes once your Relto's Great Zero is found, the **observatory** and its star chart (locate your Ages' stars, dead stars, King Me'erta's false line), a redrawn **optical bench** with optional lens hints, and **living weather** (`drizzle: often, dawn`). Details in [`CHANGELOG.md`](CHANGELOG.md).
---

## Contents

1. [Installation](#1-installation)
2. [Quick start](#2-quick-start)
3. [Writing an Age](#3-writing-an-age)
4. [The Age block: three tabs](#4-the-age-block-three-tabs)
5. [The book](#5-the-book)
6. [The Relto](#6-the-relto)
   - [Tabs](#tabs)
   - [Navigation and sub-views](#navigation-and-sub-views)
   - [The Imager](#the-imager)
   - [The telescope](#the-telescope)
   - [The Relto's two special books](#the-reltos-two-special-books)
   - [The global view](#the-global-view)
   - [Scenery, sky and wildlife pages](#scenery-sky-and-wildlife-pages)
   - [Koi pond and cat](#koi-pond-and-cat)
   - [Built-in pages](#built-in-pages)
7. [Sounds](#7-sounds)
8. [The world](#8-the-world)
9. [Window, effects, traps](#9-window-effects-traps)
10. [D'ni, mechanisms, journal](#10-dni-mechanisms-journal)
11. [Settings](#11-settings)
12. [Built-in guide](#12-built-in-guide)
13. [Commands](#13-commands)
14. [Known limitations](#14-known-limitations)
15. [What's next](#15-whats-next)
16. [Development](#16-development)
17. [Licences and credits](#17-licences-and-credits)

---

## 1. Installation

- **From Obsidian** (once the plugin is listed in the community directory): *Settings → Community plugins → Browse*, search for **Age Writer**, install, enable.
- **By hand**: download `main.js`, `styles.css` and `manifest.json` from the latest [release](https://github.com/sbridel/age-writer/releases), copy them to `.obsidian/plugins/age-writer/` in your vault, then enable **Age Writer** in *Settings → Community plugins*.

The interface follows Obsidian's language (English or French). The world's content (block names, generated descriptions) is in English. The plugin's settings are in its settings tab, under the "Extensions" heading.
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
4. Run **Open the Relto**: it creates your refuge note (an island, a cabin, a shelf with your Ages as books).
5. Run **Generate a random Age** for a ready-made world (and read the *Age Writer — Welcome* note created on first launch: an annotated example).
6. If you don't know what to write: **Open the Age Writer full reference**, part *What you write*: every block, every line, with examples.

---

## 3. Writing an Age

An `age` code block holds three kinds of lines:

- **a block, alone on its line**, written as is: `water`, `twin_suns`, `great_tree`. Each one is a page of the book;
- **a key and a value**: `seed: 42`, `link: [[Sunder Reach]]`, `mass: 0.8`;
- **a list**: `many: ruins, trees`.

`stars: twin_suns` is not a valid line (it is an **ink blot**): write `twin_suns` alone. Anything the plugin doesn't recognise is an ink blot and costs stability.

The special lines:

| Line | Effect |
|---|---|
| `link: [[Sunder Reach]]` | linking book to another Age (several allowed) |
| `return: [[Hub]]` | return book |
| `panel: [[lagoon.png]]` | your own window image |
| `seed: 42` | changes the draw (same note + same seed = same world) |
| `cover: sober` | cover sobriety: `ornate`, `classic`, `sober`, `plain`, or 0 to 1 |
| `window_style: generative` | window rendering (`generative` or `classic`) |
| `window_size: xl` / `window_width: 520` | window size |
| `fx: tv` | window effect: `classic`, `static`, `ripple`, `sweep`, `tv`, `random`, `off` |
| `day_length: 40`, `year_length: 12` | day length (real minutes) and year length (days), generative rendering |
| `moons: 3` | number of moons in the generative window (0 to 5; `companion_moon` gives one) |
| `many: ruins` / `few: rain` / `normal: water` | quantities |
| `rain: sometimes, dawn` | living weather: how often (`always`, `often`, `sometimes`, `rarely`, `1/10`, `30%`) and when (`dawn`, `morning`, `noon`, `afternoon`, `dusk`, `night`) |
| `mass: 0.8`, `age: 3.5`, `orbit: 1.2`… | physics values (all optional; the reference gives a typical value and what each one means) |
| `mechanism: orrery` | the Age's mechanism |
| `trap book` | trap book (neither return nor crack) |
| `damaged_pages = 2`, `removed_pages = 1` | damaged linking book |

Special lines are not pages. Every block you can write, by axis, with its cost, and every alias, is in the **full reference** built into the plugin.

---

## 4. The Age block: three tabs

So as not to show everything at once, the panel below the block has three tabs (setting *Tabs in the Age block*):

- **Text & glyphs**: description and glyphs, with a small centred linking window;
- **Linking window**: the big window; a click plays the linking sound;
- **Details**: stability per axis, **physics of the world** (sheet, chain of causes, what does not hold, clickable suggestions), D'ni numbers, mechanisms, "Listen to the Age" button.

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

A **navigation bar** sits in the band above the picture: **island** (opening view), **global view**, **cabin**, **linking pillars**, **grove**, **pond**, **pond ++** and **cat**. You can also click things directly in the island view (the cabin, the pillars, the pond, the cat…). Which buttons are available depends on the active pages.

- **Island layout**: cabin, pond, pillars, cat, stalk tree, bench and standing stones are placed by a deterministic layout so that big elements never overlap. If not everything fits, the least important ones stay in their sub-views.
- **Cabin interior**: fireplace (lit when the *chimney* page is active, otherwise "Cold hearth"), a 3×10 shelf of your Ages (each book clickable), a table with the glyph book and the library book, a door back to the island.
- **Linking pillars**: the linking window lights up when Ages lead back to this Relto.
- **Grove, pond, cat, pond ++**: close-up views. *Pond ++* (page *page_pond_decor*) shows the pond almost full frame with lilies, a stone lantern, a bamboo spout, reeds, pebbles and seaweed, dragonflies by day and fireflies at dusk. Cat toys (page *page_cat_toys*): rolling yarn ball, squeaking mouse, jingle ball, feather wand, cardboard box; click a toy.

### The Imager

The page *Imager* (`page_imager`) adds a machine to the Relto, inspired by the imagers of the Myst series: a cold stone chamber (nav button, or the small brass device glowing on the cabin table). Put an Age's book on the **lectern** (‹ › to change book) and tune the machine to that Age until it appears, alive, on the **screen** (a little crystal projects it there). It is a machine, not a panel with tabs: every control has its own place. Below the screen, a workbench with **three stations**, each with its lamp (lit when that setting is right); click a station to come closer, the arrow at the bottom to step back (the screen stays in view up close):

- **I. Crystal rack** — the Age's resonance: its **written pages, in the order of the book** (the first four). Eight engraved crystals stand on a rack (the Age's pages and decoys); **take one and set it** in one of four sockets (the one already there goes back to the rack, or the two swap). A crystal glows sea-green when it is right, flickers amber when the page belongs to the Age but sits in the wrong place. Wrong crystals make the image **double**.
- **II. Optical bench** — the colour of the Age's **star light**: a red, a green and a blue glass **slide on their rails** (click where you want them, 0 to 24), and an **iris** with leaves and a lever on its arc, set by how much light the world receives (a close, bright star closes it; a far one opens it). A **comparator** shows the star's light on the left, your beam on the right. Wrong glass **tints** the image. With *Lens hints* on (default), a line of words under the screen says what your eye reads in the comparator: which colour is too strong or missing, whether your beam is too bright or too dim.
- **III. Regulator** — the Age's **sky**: polarity switch and four knobs (frequency, amplitude, harmonics, phase), a **cathode tube** with the sky's wide pale trace and your bright one, a voltmeter. Frequency comes from the **day length**, amplitude from the **air pressure**, harmonics from the **aurorae and magnetic field**, polarity from the direction of the field. The **phase drifts** with the clock at the pace of the Age's own day (a tidally locked world barely drifts). Out of tune, the screen is **snow**.

**The lock.** On the right, a big lever under a lamp: red, amber when the image is clear enough, green once it holds. Pull it on a clear image and the machine **follows the Age by itself** (the drifting phase, the jumps of an erratic cycle); the controls are then held, and the book wears a small brass tag on the cabin shelf. Pull it again to let go.

**The periscope.** Once locked, the crank left of the screen **turns the view** (four directions, each with its own landscape under the same sky; the rose shows where you look) and the lever right of it **tilts** it: up to the **zenith** (the whole sky, its stars, moons, aurorae, the canopy if there are trees), back to the horizon, or **under the water** when the Age has some (light rays, kelp, coral, fish, sunken ruins, acid pits, lava vents, pearls, and the glow of an underwater **fissure**: the way home; under the ice when it is frozen). The view slides as you turn.

Values are shown in D'ni numerals. The Details tab's surveyor's note is set by *Surveyor's notes (Imager)*: full, words only (default) or off. The pale frame around clickable zones is off by default (*Frame around clickable zones*). The **clarity gauge** reads the three settings together, and the drone's **beats slow down** as the atmosphere comes in tune; a crystalline fifth sounds when the whole image holds; glass, rails, crank and lock each have their sound. Clues stay in the fiction: each Age's **Details** tab carries a surveyor's note (how its sky hums, what its star's light looks like, and the fixed values in D'ni numerals); the phase is never written down, and the crystals are the pages of the book itself. Your tuning, the lock and the periscope are kept per Age. Once the Age's star is charted at the telescope, a sync micrometer calibrates the Imager on that world: a sharper image, the hour over there and its KIPS coordinates (see [The telescope](#the-telescope)).

**The Art of the Guild.** Everything above is the easy way (the default). In the demanding way (setting *Instruments*: *The Art of the Guild*), the Imager holds a single **blank book**, fixed in place, its window black: you do not choose the Age, you find it with the settings. The **telescope** gives the target: lay an Age's book on the observatory's lectern, with its star charted and the three wheels on its clues, and the instrument holds that star and sends its light down to the Imager; the comparator of station II shows it on the left (without it, the left half stays dark: you can still tune blind, from the surveyor's words). **Station I** offers crystals for the glyphs you know (those written in the shelf's Ages, as in the book of glyphs; rows of eight); four crystals in order are the first pages of a world. When they match an Age (among those of the held star, or among all of them), they **lock a planet** and wake **station III**: only then does the sky's trace appear on the cathode tube. Several Ages around one star (`system:`) share its light: crystals and atmosphere tell them apart. Tune the lenses and the atmosphere, sync the planet if its star is charted, and the image forms: the blank book **remembers**, the Age's name is inscribed on its page. The lock and periscope work as before. Partial settings give the usual signs (a doubled image, a tint, snow) without naming the world; settings that match no written Age usually leave the window black. The guild state is kept per Relto, apart from the easy mode's per-Age tunings.

**Worlds no one has written.** The Art does not create a world, it links to one that already exists, so sometimes you still fall on one. Tuning **blind** (the telescope holds no star), set four crystals that match no written Age: station III no longer sleeps, it *searches* (frequency and amplitude still matter). If the lenses name a plausible star (the white-to-red light of an ordinary sun, within a few notches), the day is neither frozen nor wild and the air is breathable, and if the book judges a world with these four pages, in this order, alive (not dying), then about one time in three the window forms a world no one has written. It is reproducible: the same crystals, the same star light and the same notch ranges of iris, frequency and amplitude always show the same world, or nothing; phase, harmonics and polarity are tuned afterwards without changing it. Bring it into focus (sharpness works as for written Ages; there is no sync, local time or KIPS) and the book shows it without a name: “a world no one has written”, with a few words of its description in pale ink, and a strange, beating tone (with the close-up room sounds) and a line: “The book shows a world no one has written.” Click **Transcribe this world** under the book: a new note is created where *Generate a random Age* puts its notes (never overwriting), with a generated name and an `age` block holding exactly its four pages, its star and sky as value lines (`star_mass:`, `insolation:`, `rotation:`, `atmosphere:`) and its `seed:`. Opened, it is the same world; from then on it is a written Age like any other (it joins the shelf, and the book will remember its name). A written Age whose pages match always wins.

### The telescope

The page *Telescope* (`page_telescope`) is always in the book of pages, **locked until you write your first Age and attach the *Mountains* page**. Attach it and a small observatory stands on the summit: a stone drum and a verdigris dome, its slit open and the tube showing (a window lights up at night); click it to look through. Each Relto hides its own **Great Zero**, drawn from the Relto's name and seed: nothing is stored, and two Reltos never share it. Two wheels aim the telescope: **Torahn** (the angle, clockwise from the Great Zero line, in torantee: a full turn is 62,500) and **Elevation** (height from the Great Zero plane, in shahfeetee; as on the KI, above the plane reads negative); the rim moves 25 notches, the hub one notch (100 torantee or 1 shahfee). The values are engraved under each wheel in D'ni numerals. These are the units of the D'ni Great Zero Coordinate System (GZCS); the third coordinate, the distance from the Zero (in shahfeetee), is measured when you chart an Age's star (below). There is no distance readout: in the eyepiece a pulse, beating with the D'ni prorahn, is a diffuse uneven glow from afar, then a point of light that steadies as you come closer; a line of words says what you see, and a soft tone follows each turn; while you look, the pulse also beats softly in your ear, skipping beats from afar and steady up close (with the close-up room sounds). In the default **easy** way, after each turn the line of words adds “It brightens.” or “It fades.”, and the signal barely shimmers. In **the Art of the Guild** (setting *Way of the instruments*), nothing tells you whether you are getting closer: the signal shimmers from one beat to the next, so watch a few beats before you judge, and compare for yourself. Bring the point into the small ring and the Zero is **found**: it is engraved on the plate, stays found, and a faint light pulses at the end of the telescope on the island. Click the plate to set the wheels back on it. Finding the Zero unlocks the **D'ni clock** page (`page_dni_clock`): a brass armillary sphere on its own pillar in the mist, its hour ring turning with the D'ni day. Once it is attached, the observatory spreads the Zero's beam through the whole Relto: the D'ni hour appears and the calendar sets itself right. Until then the Relto only knows the date by its calendar pinnacle, which drifts by a few yahr, and the hour is silent. (That the beam carries D'ni time is this plugin's own extension of the lore.)

**The metronome.** On the observatory's left wall hangs a small brass pendulum, set by hand, that beats the prorahn mechanically (“A D'ni pendulum, set by hand: it counts the prorahn, it does not know the hour”). It strikes one side, then the other, once per prorahn, and the stop it touches glows for an instant: the true Zero's pulse always peaks exactly then. Anything else slides against it: the old line of Me'erta (about 1.06 prorahn) drifts a little further from the swing beat after beat, and a pulsar's or a neutron star's false beat is plainly off. With the close-up room sounds you hear it too: a dry wooden tick per swing, distinct from the pulse's note, so you can hear the two come apart. With reduced motion the pendulum stays at rest and a small lamp on each side marks the beat.

**Two ways of playing.** *Way of the instruments* (Ages & mechanisms) sets the telescope and the Imager together. **Easy** (default): the warmer/colder words, a faint shimmer, the old line never appears, and dead stars only blur the image a little (no false beat, no bent direction, no false delay; the surveyor's notes tell the truth and only say the light “comes a little blurred”). **The Art of the Guild**: everything below, traps included. The rewards are the same (the Zero, the D'ni clock, charted stars, the hour over there, KIPS).

**Charting an Age's star (step 2). The telescope works at the scale of star systems; the Imager then finds the planet. Every Age's star has a real place in the GZCS (Torahn, distance and elevation from the Great Zero), drawn from its star blocks (how many suns, their colours, a binary orbit) and a star seed: by default each Age has its own star; write the same `system: Kerath` line in several Ages that share the same star blocks and they share one system, charted together. Change an Age's star and its system moves: rewriting moves the world. The Age's **Details** tab adds to its surveyor's note what one perceives of the Great Zero **from that Age**: its direction (compass words, north being the Zero line), its height above or below the horizon, how late its pulse arrives (the distance) and how faint it is; with *Surveyor's notes* set to full, the three telescope settings in D'ni numerals; off, nothing. Once your Relto's Zero is found, lay an Age's book on the **lectern** at the foot of the instrument (‹ › to choose; empty lectern: back to your own Zero). The two wheels now aim where the Zero appears seen from that Age, and a third, small wheel sets the pulse's **Delay** (in notches of 25 shahfeetee of travel). In the eyepiece the same pulse guides you, and an amber ring, the Age's **echo**, beats before or after it until the delay is right (“The echo comes after the pulse: more delay”). Within the tolerance (200 torantee, 2 shahfeetee, one notch of delay), the star is **charted**: the instrument itself subtracts (Relto → Zero) minus (Age → Zero), and the plate *Star of the Age* engraves its GZCS position. No arithmetic by hand. A star must be charted from a Relto whose Zero is found; forgetting the Zero forgets the stars too.

**Calibrating the Imager.** Calibration is a bonus: the Imager works exactly as before without it. With the Age's star charted, a small **sync micrometer** appears beside the screen, under a window with a hairline: turn it (rim five notches, hub half a notch) until the world crosses the hairline. In sync, the image sharpens (the closer your tuning already is, the more), the screen tells **the hour over there** (“Over there, it is dawn”, then the Age's own day divided like a D'ni yahr, in D'ni numerals), and its **KIPS** coordinates show KI-style; the Details tab says the hour too, and the number plate shows KIPS instead of “uncharted”. Until then, the Age's hour stays uncertain: time is gained by knowing where you are. The calibration **drifts**: intact for a real week, it then wears off over the next week (the image softens, the hour becomes uncertain again, the micrometer slips off the hairline); sync again to make it new. If the Age's star is rewritten after syncing, its Details tab says that “the signal has changed”.

**Dead stars (step 3; their traps in the Art of the Guild only).** Some regions of space hold a **pulsar**, a **neutron star** or a **black hole**, whether you write them or not: they belong to the region (about one star in ten feels one, nearby stars share them, and none lies close to the Great Zero, so your nearest Ages stay easy to chart). Writing `pulsar`, `neutron_star` or `black_hole` only *describes* what is there: the book then names a world whose star has one nearby (if the star you wrote has none, the world is placed by a star that does; rewriting moves the world). They show in the generative window's sky. At the telescope they make a star hard to chart: a pulsar or a neutron star adds a **false beat** at its own period (faster or slower than the Zero's), so the surveyor's delay is wrong and the echo can lock onto the false beat (“The echo follows the false beat, not the Zero's”); a black hole **bends** the Zero's light, so the surveyor's direction is wrong, and in the eyepiece a bright image will not hold while the true point is the pale end of an arc. The surveyor's notes say it in words (“A second, faster beat crosses the Zero's”; “The Zero's light comes bent, smeared into an arc”), and with full notes add the false beats per 25 prorahn and the distance of each dead star. Such a star can still be charted by looking past the lure, or **indirectly**: once two charted stars lie nearby (within 6,000 shahfeetee), pull the **Beacons** lever between the wheels: “The charted stars agree”, and the bent light and false beat fall away.

**The old line (step 3; the Art of the Guild only).** Before you find the Zero, a second, paler pulse may catch your eye, slipping against the D'ni clock: an old origin line, King Me'erta's, never decreed. Bring it into the ring and the instrument settles on it: its plate engraves *that* line, and every star charted afterwards is turned by the same angle (the hour over there and the KIPS are wrong with it). Nothing says so outright, but it shows: on the **star chart** the lead line from each star misses the Zero (“?”), two stars engraved on different lines leave the chart unclosed, Ages of one `system:` disagree with a re-charted one, beacons engraved on different lines disagree, and the Details tab says the star “was engraved on an old line”. To fix it, aim the true Zero again (the instrument settles on it; the old line will not take it back), then bring each star into the ring again to re-engrave it, or scratch it off its plate (the small cross).

**The star chart (step 3).** The parchment roll at the top right of the observatory unrolls a chart: the Great Zero as a compass rose at the centre, your Relto, and every charted star system (a constellation, each star joined to its nearest neighbour), with its Ages (first name drawn, all of them on hover) and its dead stars in cinnabar. North is the line the instrument holds; distances go by square root so near and far fit on one sheet. One well-charted Age is enough to anchor it. Ink on paper: it reads the same in light and dark themes.

**Drift and magnetic north (step 3).** The calibration drift depends on the Age's physics: a world without a magnetic field (a dead core, or one that barely spins) has no north, so its surveyor gives rough bearings (four compass words, or eight with a weak field) and its calibration wears twice as fast (1.4 times with a weak field); near a dead star it wears faster still (×1.5 by a black hole, ×1.3 by a pulsar or neutron star; at most ×4). The Details tab says why.

**About distances.** The coordinates are those of the Great Zero Coordinate System, in shahfeetee — but for the Ages they are **shahfeetee of the beam**: the length of the path the pulse travels through the Art to reach the Zero, not a distance through space. It is the Cavern's unit, measuring something else, so it has no equivalent in kilometres: a value of 15,000 means far along the beam, nothing more. The Art links worlds across universes, not across the sky; the Great Zero is the reference for that linking.

### The Relto's two special books

At the foot of the cabin shelf, two books look different from the Ages (also in the **Pages** tab, and by commands):

- **Book of glyphs** (turquoise, diamond): a click opens the list of glyphs *used* in the Ages on the shelf, with their drawing and the Ages where they appear (click = open the Age). For now "known" = written in an Age; the future game loop may limit it to discovered glyphs. Command: *Open the book of glyphs*.
- **Library book** (red, clasp): a click offers *Blocks, reactions and Age variants* (`age-library`) or *Relto pages* (`relto-library`). The plugin opens the existing library note, or creates it with a commented example (`Age Library.md`, `Relto Library.md`, in the library folder if set). Command: *Open a library note*.

A Relto page's syntax accepts `page lagoon: Lagoon | vegetation 0.5 palm` or `page_lagoon: Lagoon | vegetation 0.5 palm`.

### The global view

A small button (globe) at the top left toggles between the **island view** (opening view) and the **global view**: the Relto seen from afar, the island at the centre in the sea of mist, rock pinnacles emerging. Pages add their elements there: **islets** (page *Islets*), the rope **bridge** joining them, the **calendar pinnacle** (page *Calendar pinnacle*, which carries the D'ni day), the sky (moon, comet, rain, storm, birds, aurora, snow). A click on the island ("Your Relto") returns to the island view.

### Scenery, sky and wildlife pages

| Page | What it adds |
|---|---|
| *Rain*, *Storm* | rain; storm with spaced lightning and a darkened sky (`rain`, `storm`, density 0 to 1) |
| *Birds*, *Butterflies* | birds crossing the sky (mostly by day); butterflies fluttering around the island |
| *Moon & sun* | a large moon and its small companion, visible by day too |
| *Comets* | now and then a comet slowly crosses the sky (a pass lasts 40 to 60 s), bluish-white head and long soft tail; mostly at night, faint by day. `comet` density = how often (from about every 8 minutes at 0 to about every minute at 1); also in the global view |
| *Dock* | a dock in the mist, right of the island, with a boat and a lantern at night (becomes a rope **bridge** to the pinnacle when the *Calendar pinnacle* page is active, and a second bridge leads to the *D'ni clock* when it stands in the mist) |
| *Bench* | a wooden bench |
| *Islets* | floating islets behind the island (density = number) |
| *Calendar pinnacle* | a standing stone on an islet that shows the D'ni day (a few yahr off until the D'ni clock sets it right) |
| *D'ni clock* | a brass armillary sphere on its own pillar in the mist; unlocked by finding the Great Zero, it brings the D'ni hour (see [The telescope](#the-telescope)). Click it to see it up close: four rings carry the vailee, yahr, gahrtahvo and tahvo, each turning at its own pace with its engraved D'ni numerals, read under the index at the top; a digit glows briefly when its unit changes; the plinth bears the date and hour in D'ni numerals and the vailee's name |
| *Blue flowers* | low flowers along the ground (`asset`: blue, red, yellow, white, pink) |
| *Grass* | tall grass along the ground |
| *Ponderosa pines*, *Maples*, *Crystal tree* | background trees (`vegetation` with `asset` ponderosa, maple, crystal) |
| *Stalk tree* | a single stalk tree (`page_stalk_tree`) |
| *Flying lanterns* | lanterns floating up into the sky |

Each page is a preset ("New page"), and all these effects can also be written in a `relto-library` block, for example `page rain: Rain | rain 0.9, birds 0.4 | audio=soft_rain`.

### Koi pond and cat

- **Koi pond** (page *Koi pond*): a cross-section pond right of the cabin, with swimming carp. Koi patterns are **procedurally generated** (kohaku, sanke, showa, tancho, asagi, orange, yamabuki), deterministic from the Relto seed. A **rare koi** joins them: `koi_rare` in the page note's properties is `ogon` (gold), `platinum` or `ghost`. With no value, the variety is drawn from the Relto seed. `koi_name` names the rare koi (default "Ogon", "Platinum" or "Ghost"). A click on the koi (or the cat) shows its name for a moment.
- **Cat** (page *Cat*): sits left of the cabin, blinks, flicks its tail and sleeps at night. In the page note, `cat_name` gives its name (shown on hover) and `cat_color` its coat: `black`, `white`, `orange`, `grey`, `cream`, `tabby`, `calico`, `tuxedo`, `siamese`, or a `#rrggbb` code.
- **The cat sleeps by the fire.** In the evening and at night (more often when the *Chimney fire* page is lit, sometimes in rain or snow), it is no longer outside: it sleeps curled up on the rug in the cabin, breathing, one ear twitching. A click makes it purr (your *Purr sound file* if set). The "cat" view then leads to the cabin. The draw changes every half hour, from the Relto seed. `cat_sleep` in the page note (or `sleep=` in a library line): `auto` (default), `always` (always by the fire) or `never` (always outside).
- In a `relto-library` block: `page cat: Cat | cat color=black name="Little Wolf" sleep=auto` and `page pond: Pond | koi 0.8 rare=platinum` (`koi` density sets the number of carp).

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
- **Living weather**: a weather line can carry a frequency and times of day, `drizzle: often, dawn` or `fog: 1/10, night` (`always`, `often`, `sometimes`, `rarely`, a fraction or a percentage; `dawn`, `morning`, `noon`, `afternoon`, `dusk`, `night`). In the generative window it comes and goes with the sun, fading in and out; the draw depends on the Age's seed and the D'ni day (or the Age's own day with `day_length:`), so everyone sees the same weather on the same day. For stability it counts exactly like the bare line; a bare `rain` stays rain all the time. New blocks: `drizzle`, `snow`, `rainbow`, `tornado`, `flowers`; new products: `scented_mist` (fog + flowers), `petal_rain` (wind + flowers), `glaze` (drizzle + deep_cold), `crystal_rain`, `ash_rain`, `acid_rain` (drizzle + crystal / ash / acid).

---

## 9. Window, effects, traps

- **Rendering**: `classic` (the engine's painted window) or `generative` (landscape drawn from the seed: sky, relief, vegetation, weather, reflections, foreground (picked from the Age: branch, vines, reeds, leaves, column, icicles, rocks, arch or none), one inhabited detail). When an Age has **water and land** (sand, stone or ruins, plants, lava, ice), the window shows a **shoreline**: a beach, rocks, a grassy bank with reeds, a black lava coast that steams where it meets the water, or an ice shelf with floes; the shore runs down one side, lies far off under the horizon, or is where you stand. Shape and framing come from the seed. `ocean_world` keeps the open sea, `desert_world` and `lava_world` stay dry, `frozen_world` stays ice. With the **physics layer** on (easy or strict), the window also shows the world that was computed: the sun takes the colour of its star's temperature (a red dwarf glows orange-red, a hot star blue-white) and its size from the star's radius and distance; thin air darkens the sky (stars by day when there is almost none, no clouds); thick air turns it milky and hazy; a light world has tall, sharp mountains, a heavy one low, broad hills; a tidally locked world keeps its sun still, at a height that depends on where you stand; little visible light makes a dull day. A sun colour you wrote yourself always wins. Three more blocks, never drawn: `kelp` (a kelp forest swaying under the water), `coral` (a bright reef in warm shallows), `acid` (bubbling pools; it eats stone into hollowed ground, iron into rust, water into bitter water, coral into salt). **Each Age has its own night**: two to four constellations drawn from the seed (some faintly joined), sometimes a nebula or a band of stars, and its moons (`companion_moon`, or `moons: 3` for up to five, each with its own size, tint, phase and pace).
- **Effects**: static, ripple, sweep, old TV… depending on instability; `prefers-reduced-motion` is respected.
- **Damage**: `damaged_pages` (shifted zones, colour separation, frozen, ink stains), `removed_pages` (burnt holes), fractures as instability rises. Drawn from the book's seed.
- **Trap book**: `trap book`. It looks normal.
- **Uncertain links** (setting): above 30% link instability, the link may flicker or slide to another book of the same Age.

---

## 10. D'ni, mechanisms, journal

- **D'ni numerals** in base 25 (Age number, seed, puzzles, clock). Levels: installed font (not provided), local glyph file, numerals drawn by the plugin. **D'ni time** in the Relto from the computer's clock.
- **Mechanisms**: eleven (steam-powered elevator, water valve, telescope, sound lock, frequency array, steam generator, holofatic imager, orrery, tide gate, wind organ, lens array; not to be confused with the Relto's telescope page), each with a state and a puzzle.
- **Solitude**: weights the draw toward deserted worlds.
- **Exploration journal**: an `age-journal` block written as you go through linked notes; voices inspired by various characters from the games.
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
| Ages & mechanisms | law of change, ink, healing, mechanisms, solitude, physics of the Ages (easy / strict / off) and its severity, way of the instruments (easy / the Art of the Guild) |
| Folders | journals, refuge |
| Draw & library | engine settings: automatic properties, drawn window, open-slot draw, fold strength, library folder, default panel image |

Notable defaults: leather and cover on; book in a main tab, opened on the cover; cover "auto"; large window; ink 15 min; healing 0.05 per day; Relto ambience zen; volume 0.35; Relto in tabs on; instruments easy.

---

## 12. Built-in guide

Two levels, in a window with sections, in English and French (both exportable as notes):

- **Short guide**: writing an Age, the block, the book, the Relto, sounds, the law of change, settings;
- **Full reference**, in four parts: **Settings** (settings and commands), **What you write** (the three kinds of lines, every block by axis with its cost, the physics values with a typical value and what they mean, quantities, weather and window lines), **What the Age generates by itself** (reactions, stability, the draw), **Relto** (the refuge note, pages, cat, Imager, telescope).
---

## 13. Commands

| Command | Role |
|---|---|
| Open this Age as a book | book view |
| Open the Relto · Open the Relto view (large) | refuge in a note · dedicated view |
| Create a Relto page | creates a refuge page |
| Generate a random Age | a coherent, stable random world as a new note in the refuge folder |
| Open the Age Writer guide · full reference | short guide · full reference |
| Save this Age's book cover (SVG) | cover as SVG |
| Create the exploration journal for this Age | journal |
| Save this Age's window as a GIF | window export |
| Generate the Age map (canvas) | map of linked Ages (blue = round trip, orange = one way) |
| Update Age data in this note / in every note | writes `age_verdict`, `age_stability`, `age_axes`, `age_return`, `age_links`, `age_discovered`, `age_drawn`, `age_home` |
| Create / Reload an Age library · Copy the built-in content | personal library |
| Open the book of glyphs · Open a library note | the Relto's special books |
| Stop the soundscape | stops the ambience |
| Forget the Great Zero (aim the telescope again) | the telescope loses the Great Zero (every Relto): blank plate, silent D'ni hour, search again |

---

## 14. Known limitations

- **Desktop only**: the plugin is built for mouse, sound and animated canvases, so it is not available on mobile.
- **Tested mostly by machine**: automated tests (jsdom, fake `AudioContext`, Chromium renders, integration against the real `main.js`) plus hands-on use in Obsidian, on desktop with the light theme first. The dark theme and other themes get less testing, so tell me if something looks off.
- **State by note name**: the law of change ties its state to the note name.
- **Several `age` blocks in one note**: each block draws its own world.
- **GIF export** doesn't include the generative rendering.
- **Vocabulary**: the words "Relto" and "D'ni" are kept from the Myst universe, in the interface and in the YAML keys. The guide and the full reference are available in English and French.

---

## 15. What's next

This is **sandbox mode**: you write worlds, explore them, tune the Imager and furnish your refuge at your own pace, with nothing to win or lose. A **game mode** is coming soon (goals, discoveries, consequences), and **more to come!** Ideas and bug reports are welcome in the repository's Issues.

---

## 16. Development

Since 1.7.0, **all the code is readable**: the original engine (1.3.0, whose TypeScript sources were lost) was de-minified, renamed and split into modules in `src/engine/` (`registry`, `rules`, `draw`, `resolve`, `prose`, `glyphs`, `analysis`, `book-view`, `settings-tab`, `plugin`…). The old regex patches on minified code are gone: the touch points with the extension are real calls to `src/engine/hooks.js`. The original 1.3.0 `main.js` is kept as is in `legacy/` (provenance).

The build produces **two versions of the same code**:
- `dist/`: **readable** (unminified), for reading, debugging, tracing an error;
- `release/`: **minified**, the one you install or publish.

```sh
npm install          # once (jsdom, eslint, esbuild: development only)
npm run build        # src/ → dist/ (readable) + release/ (minified)
npm test             # all tests, on the readable build then on the minified one
npm run lint
npm run equiv -- legacy/main-1.3.0.min.js    # non-regression: 600 random Ages, old build vs new
node test/visual/make.js            # render pages in test/visual/out/
npm run zip          # release/age-writer-<version>.zip (plugin) + -src.zip (sources); version = package.json
```

In `src/`: `main.js` (entry point: assembles engine + extension), `engine/` (the engine), then the extension layer: `entry.js` (book and block patches), `ui-extras.js` (panel and tabs), `ui-relto.js` (Relto, dedicated view, navigation), `relto-render.js` (canvas), `relto-rooms.js` (cabin, pillars, pond, pond ++, cat, grove), `relto-model.js` (pages, island layout), `relto-scenery.js`, `relto-global.js`, `relto-books.js`, `cover.js` (covers), `sound.js` (sounds, room sounds), `linkfx.js` and `genscene.js` (window), `law.js` (law of change), `mech.js` (special lines), `physics/` (physics of the Ages: laws, block requirements, constrained draw, sheet; design in `docs/DESIGN-physique.md`), `geophys.js` (geophysics blocks), `weather.js` (living weather), `relto-imager.js` (the Imager), `imager-guild.js` (its blank book, the Art of the Guild) and `unwritten.js` (worlds no one has written), `telescope.js`, `starsystem.js`, `perturbers.js`, `calibration.js`, `starmap.js`, `relto-telescope.js` and `relto-starmap.js` (the telescope: Great Zero, Ages' stars, dead stars, the old line, Imager calibration, star chart), `settings-ui.js` (settings), `guide.js`, `guide-ref-en.js`, `guide-ref-fr.js` (guide and full reference), `i18n.js`. Details: [`docs/DEV.md`](docs/DEV.md) (in French).

---

## 17. Licences and credits

- **Project licence**: [MIT](LICENSE), © Sébastien Wallachia.
- Third-party code and its licences are listed in [`NOTICE`](NOTICE); the licence texts are in [`LICENSES/`](LICENSES/).
- **gifenc** (MIT, © 2017 Matt DesLauriers): GIF export, bundled in the engine.
- **Tracery** (© Kate Compton; npm package `tracery-grammar` declared ISC, original repository Apache 2.0): the grammar used for the prose, bundled in the engine.
- **D'ni font**: not provided; everyone uses their own copy, under its licence.
- Fan project, not affiliated with or endorsed by Cyan Worlds.
