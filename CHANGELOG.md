# Changelog

All notable changes to Age Writer, newest first. Each version is also on the [Releases](https://github.com/sbridel/age-writer/releases) page. A more detailed developer log, in French, is kept in [`docs/NOTES-historique.md`](docs/NOTES-historique.md).

## 1.23.0 — A finished Relto (2026-10-11)

### Added
- **Far worlds and the wrong beat.** About one star in six lies beyond a whole rahnfee: its pulse arrives a whole beat late. A lever switch beside the Delay wheel sets the whole beat (up 0, down 1); once a gorahn the Great Zero strikes harder (the pendulum's stroke glows gold), and with the switch right the echo's strong beat comes back on that marked stroke. Easy way: the surveyor's notes say it, and a wrong beat charts nothing. Art of the Guild: a wrong beat charts the star a rahnfee off and the Imager cannot hold its planet. Stars already charted keep their engraving.
- **The ink dries before your eyes.** In the book (descriptive pages: text and glyphs) and in the Age block's *Text & glyphs* tab, freshly written ink is dark and glistening, a glint slides over it, and it slowly turns matte and brown over the drying time (15 minutes by default). Hovering the text or glyphs says how many minutes are left to change the Age freely, or that the ink is dry.
- **`grass`**: green land that the wind combs in long waves across the linking window; a grassy shore by water, sometimes tall grass in the foreground. Written with `flowers`, it grows into a **meadow** (`meadow` ← `grass` + `flowers`): taller grass to the horizon, with flowers moving through it.

### Changed
- Getting around the Relto: next to the wheel of views (which keeps its own compass icon), the island is always one click away, and the icon of the view you are in shines beside it ("you are here"). And the house, the Imager and the observatory lead to one another through objects in the rooms, like the little Imager on the house table: a brass spyglass on the house's window sill and on a bracket in the Imager's chamber (up to the observatory), the house lamp and a little Imager on the sill of the observatory's slit. The Imager's door now leads back to the house.
- Full screen is also offered in the note itself, not only in the large view.
- The observatory's instrument panel is laid out top to bottom: the plate, the two big wheels, then, under an engraved divider, the delay row (wheel, reading, and the whole-beat switch: a lever, up for 0, down for 1).
- **The Imager's crystals, reworked.** One click puts a crystal in the first free socket, one click takes it back. The order no longer matters: the right crystals are a set. An Age's crystals are its written pages, completed by the pages its world drew, up to four (an Age with a single written line now has four crystals too). Each crystal has its look: a tint from its domain (sky violet, earth amber, water and weather blue, life green, the rest pale), a shape of its own (prism, needle, geode, lens), its glyph engraved. Easy way: a right crystal lights up wherever it stands. Art of the Guild: the four light up together, and only once all are right. In the Art of the Guild each crystal also has its note: placing one sounds it, and the four sound as a chord, steady when the world is held, beating the more the further the set is from the nearest world (it never says which crystal is wrong). The surveyor's note in the Details tab gets a ♪ that plays the Age's own chord, to compare by ear. And when the telescope holds a star, its glyphs show through the blank book's left page, faint and backwards.
- The Pages tab says in words what each page adds ("a waterfall", "stones by the pond", "ponderosa pines") instead of the effect's technical name; its buttons and the Books buttons are lighter.
- The Relto's tooltips wait a moment (about half a second) before showing, so you can see what a control covers; the Imager's sync micrometer shows its tooltip below the knob, leaving the hairline window visible.
- **Renaming an Age keeps its world.** The plugin writes the former name as the note's property `age_seed`; the drawn world, the star, its charted position and the Imager's tuning stay the same, and the names engraved at the observatory follow the new name. Delete `age_seed` to draw a new world. For an Age renamed earlier: command *Give this Age back the world of its former name*.
- **The generative window is now the default** in the Age block and the book: the same world the Imager shows. The original painted window is still there (setting *Window rendering*: classic, or `window_style: classic` in an age block). Existing installs keep their saved choice.
- **A tidier Pages tab:** pages grouped by state (active, available, locked), each group folding away, with readable names; the sounds have their own group, **one setting per sound** (on/off and volume) for every page that plays it, instead of a button and a slider on each page. Earlier per-page sound settings are not carried over. The columns are aligned and titled (page · what it adds, or why it is locked · the button). The books for the shelf are colour pills like the books' spines (green stable, amber unstable, red dying): filled when on the shelf, hollow when put away, a click toggles; sort by name or by stability.
- **The cave fissure** is now a rocky mound with a dark, jagged mouth (it used to look like a hut); its crevasse glows inside the mouth and no longer spills out of it.
- `pages: hide` in the `relto` block now removes the Pages tab, for a finished Relto (attach and detach pages in the book of pages, in the cabin); without tabs it still collapses the list.
- A new Relto gets a seed of its own: its own island and its own Great Zero to find (until now every new Relto started with the same seed, so the same Zero). Existing Reltos are unchanged.
- The star chart writes its names last, with a halo of paper so lines crossing them do not hide them; when a star is crowded, its name sits a little further away, joined to it by a fine line.
- **The wheel of views:** the row of view icons above the Relto becomes a single button (a compass); it opens a brass wheel over the picture with every available view, its name at the hub on hover.
- **A compact Settings tab:** the sky time on one line, with the hour it shows and ↺; the sound on one line, with a vertical volume fader.

### Fixed
- The star chart no longer draws the star of an Age that is no longer on the Relto's shelf (its name was already hidden, its drawing stayed). New command *Clean the star chart*: forgets for good, in every Relto, the names of such Ages and the stars that had only them.
- The Imager's periscope: what is unique in an Age is now on one side only, the one the linking window faces. Turning no longer shows the same tornado, rainbow, dead star (pulsar, neutron star, black hole), ruins (unless the book writes many) or odd structure in every direction.
- The star chart no longer shows names of Ages that no longer exist (renamed before this version, or deleted); the engraving itself is kept.
- A black sun's red corona no longer shows through the mountains: the ridges hide it as they hide the disc.
- The Imager's periscope no longer shows the Age's fissure in every direction: it is on one side only, the one seen from the front.
- In a narrow panel, the Relto's D'ni name no longer slides under the view icons (it goes on its own line above).

## 1.22.0 — Plumb lines on the star chart (2026-10-10)

### Added
- **Heights on the star chart.** The plane of the Great Zero is now seen at a slant, like a table, and every star, dead star and your Relto hangs on a plumb line from its foot on the plane: solid above it, dotted below. Heights have their own scale, engraved in a corner (next to the distances they would be invisible); each star's tooltip says how high it stands ("high above the plane").

### Changed
- The *Great Zero* plate's tooltip names its new distance row.
- The telescope's tooltips no longer mention the KI (the sign convention is still explained: above the plane reads negative).

## 1.21.0 — The rahnfee, a unit of the beam (2026-10-10)

### Added
- **The rahnfee**, a unit of the beam: the length the Great Zero's pulse travels along the beam in one prorahn, 25³ = 15,625 shahfeetee of the beam (plural *rahnfeetee*). It is a fan-made unit, built from prorahn and shahfee; not an attested D'ni word. Lengths are written in D'ni numerals without a decimal point: each place (25th, 625th, 15,625th of a rahnfee) is engraved in its own small window, like the dials of a surveyor's instrument, and the instruments also say it in words. No kilometre conversion.

### Changed
- **The Delay wheel** reads in rahnfee, as a lateness behind the metronome: its engraved value is the delay as a fraction of a rahnfee, and its tooltip says it in words ("The pulse comes about half a beat after the pendulum."). Same mechanics and tolerances; the echo words are unchanged.
- **Distances along the beam in rahnfee:** the *Star of the Age* plate (now in two rows: Torahn and elevation, then distance), the KIPS distance (Details tab and Imager), the surveyor's full notes (delay and dead stars) and the star chart tooltips. The *Great Zero* plate gains a second row: the Zero's distance in rahnfee. Elevations stay in shahfeetee. Saved data is unchanged (still in shahfeetee).
- The surveyor's delay words speak in fractions of a beat ("its pulse arrives about a third of a beat late"); the bands are unchanged.
- The Imager's KIPS caption is shorter.

## 1.20.1 — A redrawn optical bench (2026-10-10)

### Changed
- **The Imager's optical bench:** the lamp now sits on the right and sends a beam along each rail; white up to the glass, it then takes the glass's colour, brighter the further the glass is moved. The glasses are tinted discs in brass mounts on carriages, with their value engraved below; the rails are graded from dark to saturated; a prism on the left gathers the three beams and sends their mix to the comparator. Only the drawing changes.

### Fixed
- The lens hint is a single line below the screen frame and no longer overlaps the screen.

## 1.20.0 — The Art of the Guild: blank book, metronome, D'ni clock (2026-10-10)

### Added
- **Two ways to play the instruments** (setting *Instruments*): **easy** (default) — the observatory says "It brightens / It fades", the signal barely shimmers, no Me'erta line or false pulses, dead stars only blur the image; **the Art of the Guild** — the 1.19 behaviour, plus the Imager's blank book.
- **The observatory metronome:** a brass pendulum beats the prorahn; the true pulse peaks as it touches a stop, while the Me'erta line slides against it, to the eye and to the ear.
- **The blank-book Imager** (Art of the Guild): you no longer choose the Age. The telescope, held on a located star, sends its light to the comparator; the crystals (known glyphs) lock a planet and wake station III; once the image holds, the Age's name is inscribed in the book.
- **Worlds no one has written:** tuning blind, the blank book sometimes forms an unwritten world (reproducible from the settings); *Transcribe this world* turns it into an Age note.
- **The D'ni clock, richer:** four rings (vailee, yahr, gahrtahvo, tahvo) whose digit glows when it changes; a close-up view from a click on the sphere, with date and time in D'ni numerals.
- **Lens hints** (setting, on by default): at the optical bench, a line of words says which colour is too strong or missing and whether the beam is too bright or too dim.

### Fixed
- The engraved coordinates of the *Great Zero* and *Star of the Age* plates no longer run off the edge with a wide D'ni font.

## 1.19.0 — Living weather, the observatory and the Great Zero (2026-10-10)

### Added
- **Living weather.** A weather line can say how often and when: `rain: sometimes, dawn`, `drizzle: often, dawn`, `fog: 1/10, night`. Frequency as a word, a fraction or a percentage; times of day `dawn` to `night`. The draw is reproducible (Age seed + day), fades in and out with the sun of the generative window, and adds a sentence to the description. New blocks `drizzle`, `snow`, `rainbow`, `tornado`, `flowers`; new reactions `scented_mist`, `petal_rain`, `glaze`, `crystal_rain`, `ash_rain`, `acid_rain`.
- **The observatory and the Great Zero.** The *Telescope* page (needs a first Age and the *Mountains* page) puts a small observatory on the levelled summit. Every Relto hides its own Great Zero; you find it by its pulse, in the units of the D'ni Great Zero Coordinate System (Torahn in torantee, elevation in shahfeetee, KI sign convention). No "warmer / colder" hint: the signal shimmers from beat to beat and also beats softly in your ear.
- **The D'ni clock.** A page unlocked by finding the Great Zero: a brass armillary sphere on its own pillar in the mist. Once attached, the observatory spreads the Zero's beam through the Relto: the D'ni hour appears and the calendar sets itself right. Until then the calendar pinnacle drifts by a few yahr and the hour is silent. The *Dock* page adds a rope bridge to it.
- **Locating the Ages.** Every Age's star has a position in the Great Zero Coordinate System (`system:` groups Ages around one star). The surveyor's notes say where the pulse comes from; at the observatory's lectern you locate the star, then the Imager's sync micrometer finds the planet: a sharper image, the Age's local time and its KIPS coordinates. Calibration drifts after a real week.
- **Dead stars, the old line, the star chart.** `pulsar`, `neutron_star` and `black_hole` exist in the sky even when unwritten (writing them only describes them): false beats, bent directions, triangulation from charted stars. King Me'erta's never-decreed line can trap the calibration; the observatory's star chart reveals it. Ages without a magnetic field have fewer compass words and drift faster.
- **Comets in the Relto** (`comet` effect, *Comets* page).
- **Real glyphs** for the 29 extended-sky blocks that used to share a generic hexagon.
- Command *Forget the Great Zero (aim the telescope again)*.
- Pages can require another page (`unlock.page`) or the Great Zero (`unlock.great_zero`).

### Changed
- **The built-in reference is rebuilt** (English and French) in four parts: Settings / What you write / What the Age generates by itself / Relto. It shows the three kinds of lines with an example each, and a table of every physics value with a typical value and what it means.
- **READMEs cleaned up:** no hard-coded version, clearer installation and syntax.

Existing Ages keep their analysis, pages and text (600 random Ages compared with 1.18.3: only the drawings of the extended-sky glyphs differ).

## 1.18.3 — Alteration follows physics values (2026-10-09)

### Changed
- Once the ink is dry, changing a physics value alters the Age in proportion to the change (a log scale for values spanning orders of magnitude), instead of a flat cost.

### Added
- **The book of pages:** a large open book on the cabin table; each page is an ink drawing of what it adds to the island, and a click attaches or detaches it.

### Fixed
- A half-typed value line no longer counts twice as an unknown line.
- "Words only" surveyor's notes no longer show the D'ni values.

## 1.18.2 — Books visible in full screen (2026-10-09)

### Fixed
- In the Relto's full screen, the glyph book, the surveyor's notebook, the library book and other dialogs opened hidden behind it.

## 1.18.1 — Crevasses and the end of Ages (2026-10-08)

### Added
- The fissure becomes a jagged crevasse opening onto the starry void, and fissures widen over time (setting, 7 days by default).
- An unstable world wears down over days (faster the more unstable it is); a doomed Age collapses live and offers to burn its book.

### Changed
- A fissure only harms a world that is already unstable.

## 1.18.0 — Terrain, rivers and places (2026-10-08)

### Added
- Terrain blocks `plains`, `hills`, `mountains`, `canyon` and water blocks `river`, `delta`, `lake`, `marsh`.
- Places and inhabitants: `library`, `ruined_library`, `garden`, `spiders`.
- Automatic GitHub releases with notes taken from the change log.

## 1.17.x — The Imager (2026-10-08)

### Added
- **The Imager**, a machine in the Relto: put an Age's book on the lectern and tune it in three stations (crystals, lenses, atmosphere) until the Age appears on the screen; once locked, a periscope turns, looks up at the zenith or goes under the water.
- The surveyor's notebook on the cabin table; a ready-made example Age and the *Generate a random Age* command.
- Journal voices; Cyan's fan content policy notice.

### Fixed
- Obsidian review warnings (lint config, CSS), the first linking-book page when an Age has no link.

## 1.16.x — Physics of the Ages (2026-10-08)

### Added
- **A simplified physics under every Age** (star, orbit, planet, internal heat, core, magnetic field, air, temperature, water, light) and a reworked *Details* tab: stability per axis, chain of causes, what doesn't hold, and suggested lines. Easy (default) or strict mode.
- Value lines (`mass:`, `age:`, `orbit:`, `core:`…) and geophysics blocks (`black_sun`, `close_orbit`, `young_world`, `molten_core`…).
- Shorelines and varied foregrounds in the generative window; each Age's own night sky; `kelp`, `coral`, `acid`.
- The cat sleeps by the fire in the evening.

### Changed
- Descriptions rewritten without repetition, and reproducible.

## 1.15.3 — World types and clash counting (2026-10-08)

### Fixed
- World-type clashes with the weather cost nothing (misnamed axis); every sky ↔ matter clash now counts.

## Earlier (1.4 – 1.15)

Linking books, the Relto (pages, rooms, koi pond, cat, global view, sounds), D'ni numerals and time, the law of change, trap and damaged books, uncertain links, the generative window, extended sky, world types, riches and scars, quantities, window sizes and effects. See [`docs/NOTES-historique.md`](docs/NOTES-historique.md) for details.
