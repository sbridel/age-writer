# Changelog

All notable changes to Age Writer, newest first. Each version is also on the [Releases](https://github.com/sbridel/age-writer/releases) page. A more detailed developer log, in French, is kept in [`docs/NOTES-historique.md`](docs/NOTES-historique.md).

## Unreleased

### Added
- **The rahnfee**, a unit of the beam: the length the Great Zero's pulse travels along the beam in one prorahn, 25³ = 15,625 shahfeetee of the beam (plural *rahnfeetee*). It is a fan-made unit, built from prorahn and shahfee; not an attested D'ni word. Lengths are written in D'ni numerals without a decimal point: each place (25th, 625th, 15,625th of a rahnfee) is engraved in its own small window, like the dials of a surveyor's instrument, and the instruments also say it in words. No kilometre conversion.

### Changed
- **The Delay wheel** reads in rahnfee, as a lateness behind the metronome: its engraved value is the delay as a fraction of a rahnfee, and its tooltip says it in words ("The pulse comes about half a beat after the pendulum."). Same mechanics and tolerances; the echo words are unchanged.
- **Distances along the beam in rahnfee:** the *Star of the Age* plate (now in two rows: Torahn and elevation, then distance), the KIPS distance (Details tab and Imager), the surveyor's full notes (delay and dead stars) and the star chart tooltips. The *Great Zero* plate gains a second row: the Zero's distance in rahnfee. Elevations stay in shahfeetee. Saved data is unchanged (still in shahfeetee).
- The surveyor's delay words speak in fractions of a beat ("its pulse arrives about a third of a beat late"); the bands are unchanged.

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
