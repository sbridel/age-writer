# Changelog

All notable changes to Age Writer, newest first. Each version is also on the [Releases](https://github.com/sbridel/age-writer/releases) page. A more detailed developer log, in French, is kept in [`docs/NOTES-historique.md`](docs/NOTES-historique.md).

## 2.2.1 — Fixes (2026-10-28)

### Fixed
- **Rings hold again after the accord**: two Ages that carry each other form their ring again once the story has ended in the accord. Seen from inside the loop, the other Age's line back to you counted as an ink blot, which dropped it below 75 and made the accord refuse it.
- **What's new now shows after an update**: 2.2.0 took everyone who updated for a new install, so the window and the Guild letter never appeared. They appear once with this update (the **What's new** command always shows them).

## 2.2.0 — Where you arrive (2026-10-28)

### Added
- **Linking points**: every Book links to a place of its own, chosen by its mark (its name, `seed:` or `age_seed`) among what the world allows, and always the same: on level ground, down in a hollow, on the edge of a height with the valley below in layers, on a slope, under cover (a forest edge or a ruined arch), or at the mouth of a cave whose rock is the world's own. Sometimes something of the world stands very close: a trunk, a broken column, a boulder. The Imager and the library show the same place.
- **The sky moves with the place**: the place faces a direction, and the sun crosses, rises or sets accordingly; the moon has its own month and real phases, and a full moon lights the ground; the landscape takes the colour of its star, and plants adapt to it.
- **Weather has a side**: a storm comes from the west, so it stands on the right, on the left, overhead or as a wall on the horizon depending on where the place faces; it hides the sun, casts its shadow on its side and rains only beneath it. Rain without a storm sometimes falls far away, with a piece of rainbow when the sun is low behind you.
- **What's new**: after an update, a window lists the changes once (never on a first install), and a letter from the Guild waits on the Relto cabin table. A **What's new** command shows them at any time; a setting turns the window off.

### Changed
- **Descriptive Books**: a line added that contradicts nothing is free, even once the ink has dried, and no longer redraws the landscape. Removing, changing a value or contradicting is still an alteration. The place now comes from the Book's mark, so **every existing window changes once** with this update.
- **Extreme climates**: a world without a sun shows what lights it (its nebula, lava, glowing life, crystals); a black sun keeps a tone of its own; ice has tabular icebergs and sastrugi.
- **The Imager's periscope** turns with the place: each direction looks elsewhere, and the sun and moons follow their course as seen from that side.
- **Wonders** that barely showed are now visible at the window's size, among them the trees made of the metal they drank.
- Touch-ups: every tree has its own build; canyons, striped buttes and cave stalactites redrawn.
- Guide: where you arrive, the moving sky, weather, the Descriptive Books rule, the new setting and command.

## 2.1.0 — More worlds (2026-10-28)

### Added
- **Four soils that follow the genesis**: `clay` (with lava, fired clay), `chalk` (with acid, karst; it wants water and an old enough world), `basalt` (with deep cold, basalt columns), `granite` (an old world with moving plates). Basalt and clay feed the harvest with silt of the Age's kind; granite gives quartz silt. Earth and chalk are two new soil families (and two new places to carry).
- **Crystal trees and crystal flowers**: a great tree or flowers meeting crystal, on a world old enough. Their colour follows the Age's seed.
- **The linking window shows many more worlds**: a face for each soil (salt flats, black sand and distant basalt columns, grey, ochre or rosy granite domes, chalk cliffs, earth), water as a river or a lake when it does not dominate, relief in the middle distance, ridges, clouds and low flora that follow the climate, water chemistry (acid, brine, glacial, mirror), ruins and standing stones with their own style, and the Relto's trees in the window (with ginkgo, mushroom trees, stalk trees, crystal trees). Blocks that had no picture now have one; what cannot be seen from a window leaves only a sign.
- **Young worlds**: a world too young for trees shows Prototaxites; a tree written there stands grey and half-formed.

### Changed
- **What physics refuses is drawn poorly**: a written block the physics refuses is pale and faded, more so as the tension is heavier; refused grazers are gaunt, and a skeleton lies in the grass when the refusal is strong. The window no longer invents contradictions: no green without light, no river on lava, no ice floes in hot water, trees in their climate, land beasts only on land.
- Water makes the ground only when it strictly dominates; otherwise it is a river or a lake on another soil.
- Peat burns to ash in a wildfire.
- **Guide** read through against the code: the window, the new soils, the tuning fork (slot, recall, damper), the study key's setting, the settings that were missing, the cave tests, the eight scars, `year_length` versus `tilt:`, ground made by life, seasons in the laws of life, stained-glass light.

## 2.0.0 — Seasons, and the end of the story (2026-10-26)

### Added
- **The story ends.** A third book of four chapters closes the story, with its letters, its rewards and a choice at the end. What it teaches, and what each ending leaves in the Relto, is left for you to find. Test shortcuts in the maintenance menu jump to its first and last chapters.
- **Seasons.** With physics on, a tilted axis (`tilt:`) gives an Age its seasons: the Details tab says how hot or cold each one gets and which season it is today there; the window shows it (winter snow on the ground and crests, rain turned to snow below zero, spring petals, a higher summer sun, red autumn leaves). Life is judged on its hardest season and on what waits it out (seeds, spores, burrowers that hibernate); a role held only one season is a light tension, *migration*. A shortcut turns the seasons for testing.
- **The cellar under the machine.** The harvest now goes down by season into labelled jars; a sieve sorts the good grain into sealed jars, the rest goes to the compost, which makes potting soil; a lift brings a jar up to its hopper.
- **Matters have a genesis**: volcanic or hearth ash, quartz or volcanic silt. The sieve keeps them apart, and the recipes care.
- **The Imager's tuning fork keeps a world**: a slot holds the book you struck, a click recalls it with its settings, a felt damper releases it. Noon beads on the tube tell two half-turns apart.
- **Stained glass casts its light**: in the Castle and the Glasshouse, the cabin and writing-room windows lay their colours on the floor by day, long and slanted in the morning, short at noon, warm in the evening.

### Changed
- **One binding for every book** in the Relto: tight rows of muted leather with their own raised bands, plain, simple or ornate; descriptive books more ornate, linking books sober. No cover says stable or unstable any more: wear tells.
- **The book of the laws** fits as many laws as a page holds, with rubricated titles, lapis numbers and red initials.
- **The Guild's Art**: every telescope engraving and every Imager sync needs a three-beat exposure.
- In the Castle, the hidden panel is a walnut panel of the same wainscot. The vault's trapdoor is real wood in a stone frame; the cave's lake has an uneven shore.
- The Relto's animation keeps a steadier pace (snow no longer judders).
- The Details tab shows the life, dosage and carried lines again (only the raw costs are hidden).

## 1.50.2 — The guide (2026-10-25)

### Changed
- **Guide**: the `pellet` block you write is a capsule of nutrients for that world, and has nothing to do with the Relto's machine (Ages give its ingredients, not pellets).
- **Guide, spoilers**: the hidden section now covers what lies beneath the island, the second book of the story, and an easter egg. It stays behind its checkbox.

## 1.50.1 — Touch-ups beneath the island (2026-10-25)

### Changed
- **Beneath the island**: the light reads better when the lake is alive, the sounds of stone are shorter and quieter, and a few things have moved to where they belong. What and where is left for you to find.

## 1.50.0 — Beneath the island (2026-10-24)

### Added
- **The hallway**: from the main room or the lounge, the chevron at the bottom steps back into a narrow hallway. At its end, the door of the machine's room (walled up until the first harvest, a glow beneath it while something cooks); a window on the island's sky, coats and boots, a lantern, a mirror and a bench. In the Castle, the mirror reflects no one.
- **The cave goes deeper.** What the light shows, and what a living lake opens, is left for you to find.
- **The story goes on**: a second book of exploration chapters opens after the ninth chapter, with its letters and its rewards.
- **Two reserves**: each story Relto keeps its own harvest, machine, pellets and cave, filled only by the Ages of its folder; ordinary Reltos share one.
- Maintenance menu: **Cave: tests** (reset the lake, give colonies, let them sleep or gorge them, and a few more).

### Changed
- **Pellet quality comes from the ingredients**: a measure is rich if its Age was stable and healthy on the day it gave it, poor otherwise; you can see it in the hoppers and the mixing column. A batch made only of rich measures gives a clean pellet (a white light that lasts longer, an amber that leaves two colonies); one poor measure, and it is approximate. The sliders decide the kind, the press decides whether it sinks.
- **Instrument tooltips**: in easy mode, the machine's sliders and press show their value in D'ni numerals, with what the setting does; with the Guild's Art, only the value, in D'ni numerals. On a phone, the tooltip card draws them too.
- In the Castle, the way down from the cellar is a stone trapdoor with an iron ring.
- The bottom chevron (step back) is larger and easier to aim at.

## 1.49.0 — The machine and the cave (2026-10-24)

### Added
- **The harvest**: some Ages give, once a day when read, a measure of ash, loam (humus), silt (born of water on ash) or peat — only if written (or born of what is written) and something grows. The Details tab says what the Age gave today.
- **The machine**, in a lean-to that appears against the cabin with the first harvest (stone, a forge in the Castle's chapel stone, a glass half-dome in the Glasshouse): four glass hoppers, a mixing column, two bare sliders (time, temperature), a press with its gauge, a five-hollow tray. Cooking takes real time; one measure, one pellet. The recipes are not given: you learn them by failing. Settings can be set notch by notch (click, Shift, drag, wheel; the value in the tooltip).
- **The cave**, under the island (a crack in the cellar, the crypt stairs in the Castle): a hole ringed with cut stones, a niche for the pellets, a stone to press. A pellet falls for a minute; be down by the water before it arrives.
- **Glowing algae**: an Age whose written pellet feeds what grows sees its water glow at night.
- **The lake**: amber pellets now sit in the cave niche too; click a kind to choose what the stone drops. An amber pellet does not flash: it feeds the pool, and leaves a glowing colony that never goes away — bright when fed lately, embers when neglected.
- In the cave, a **chain** closes or opens the stone hatch over the crack (back to the dark). With the Gold, Silver and Gemstones pages, **veins and stones in the cave walls** catch the daylight, or the glow.
- **Getting rid of pellets**: a drain lever to the right of the tray sends a finished batch through a floor grate, past the shelf; click a pile on the shelf to throw one pellet into the fire (not while cooking; each kind has its own smoke: pale, amber, and green for grey).
- Maintenance menu: **Machine: tests** (fill the hoppers, give five pellets of a colour, finish the batch now, empty everything).

### Changed
- The pellet's sentence in the description follows the law of life (it dissolves and feeds, it burns the roots, or it waits).
- **The Glasshouse, from outside**: opaque art nouveau stained glass (sea green and soft orange), a cast-glass dome, a mosaic wall the full width of the dome with copper pilasters, cornice and base; you no longer see through it.
- **The Relto's pages panel**: pages are grouped by family (disguises, trees and plants, water, sky, creatures, rock and ores…), folded by default, with a **Fold all / Unfold all** button.
- Four wonders redrawn: the breathing mirrors, the reading rain, what the rust holds, the ceiling sea.
- The cellar: no more names written under the niches (each book still says it in its tooltip); the way down is a **trapdoor** (wood and iron, bronze in the Glasshouse; the crypt stairs in the Castle); in the Glasshouse, a round grilled oculus (seven spiral iron rays with buds, a copper ring, black behind) instead of a skylight, copper tympanums, two red flower lamps by the lectern; every niche bears its number in D'ni.

## 1.48.1 — The book and the wrench (2026-10-23)

### Changed
- The Age Writer icon in the ribbon is a book; the mountain, which is the Relto, marks the menu's first entry (open the Relto).
- **"Maintenance tools" setting** (off by default): the wrench icon only shows when it is on, so a player only sees the book. The commands stay in the palette.
- The full reference's **Commands** topic describes both menus, section by section, with a word on the less obvious commands.

## 1.48.0 — Two menus (2026-10-23)

### Changed
- **The ribbon has two icons, each opening a menu**, instead of two buttons. The mountain, **Age Writer**: its first entry keeps the old gesture (the Relto book, or the last Relto visited), then the Relto, the open Age (book, journal, cover, GIF, data, random Age, map), the books and the guide, the story, the sound. The wrench, **maintenance and tests**: mutation test, D'ni numerals report, repairs (story chapter, former world, Great Zero, star chart, chamber of memories), the library, the Relto button setting. A command that does not apply here is greyed out, as in the palette; every command stays in the palette too.

## 1.47.1 — Names (2026-10-23)

### Changed
- The wonders and their catalogue carry their own name in the guide and the notes; nothing in the plugin borrows a character's name from the lore any more. No change to play.

## 1.47.0 — Wonders (2026-10-23)

### Added
- **The catalogue of wonders**: seventeen wonders, none of them written, each obeying another law. Most grow from a union that mutation ties on a pair from the catalogue (breathing mirrors from water and lava, the visiting weight, what the wind learned, the reading rain, the ceiling sea, the ones that fit through, the mosaic, the rings, what the roots drank, the day aurora, the blooming ice, what the rust holds, the many-one, the early echo, the unfinished, the orphan colour); one, the living mist, grows from fog and spores you write. The notice, the Symbiosis line and the description name it; the window draws it; it leaves if the union falls.
- **New rules** so that the catalogue has pairs to tie: moths + heat (singed moths), gold, silver or copper beside plants (tarnished growth), both at a very small cost; fog + spores (the living mist); auroras × ash cloud; grazers on a lava world; the sickness of the living can be tied (the mosaic).
- **The chamber of memories**: every wonder seen once (tied or written) floats in a glass orb with its own living window; you enter through the orb near the lounge ceiling. Click an orb to hear it and let it go (with a confirmation; a wonder still alive comes back); command "Empty the chamber of memories". An orb follows its Age's renaming, and turns pale when the Age no longer exists.
- **Two voices at the Imager**: a tuning fork on the console. Strike it, it keeps the sky's voice; find another world and strike it again: the two skies sing together and the accord shows on the screen. Works in both instrument modes.

### Fixed
- A renamed Age escaped the law: the law of change, the fissure (wear and condemnation), the writer's status and its symbioses looked it up under its old seed. They now find it under its note's name. A renamed Age that was recently altered or whose fissure was widening gets its penalty back.

## 1.46.1 — Not every world mutates (2026-10-22)

### Changed
- **Mutation is no longer systematic.** Only some Ages can mutate (about one in three, decided once and for all by their name). Even then it is never certain: when the pressure is full there is one chance in fifteen, otherwise it starts again (about two months on average). When a fissure is eating the Age, the world defends itself: one chance in four each day, and the union chosen is the one that helps most. Otherwise a union prefers a pair from The catalogue of wonders. The rare event still applies to every Age; the test command still forces a union.

### Fixed
- The accord and mutation tests now run with the rest of the suite.

## 1.46.0 — Two voices (2026-10-22)

### Added
- **Two voices** (Art of the Guild): in an Age's Details tab, the ♪♪ button plays its sky beside another Age's, or its own. Each voice comes from the length of the day; the interval is said in words (unison, octave, third, tritone…) and heard: a purr when they sound as one, a chirp when they agree, a growl when they clash; opposed polarities are noted.
- **Mutation and symbiosis**: an Age that stays under 75 % builds pressure over about four days; when full, two of its elements that contradict each other (a sky clash, or a harmful reaction such as water and lava) bind together. The union supports the world on its axis (15 points at most per Age, halving with each further union, four at most), never lowers stability, and holds as long as both elements are written; remove one and it falls, put it back and it resumes. Nothing wears out with time. A stable Age does not mutate, except, very rarely, once. A notice tells when a union forms; the unions are listed under stability in the Details tab, with the blocks named as you write them.
- Command **"Mutation: advance four days on the open Age (test)"**: to try it without waiting; it says why nothing binds (a stable Age, nothing left free).

### Changed
- **The Details tab is an accordion**: stability stays on top, then *The world* (chain of causes, why, what does not hold; the figures folded), *The sky* (the Imager and the telescope side by side, values aligned) and *The Age*. One part open at a time; the one you opened stays open when the panel redraws.
- Changing "Way of the instruments" redraws open panels at once.

## 1.45.0 — Joined numerals (2026-10-21)

### Added
- **D'ni numerals are joined**: beyond 24, the digits of a number share their vertical posts, as in D'ni writing. With a font, the plugin measures where each glyph's posts sit and places the boxes on each other; a digit the font lacks is recomposed from its two halves (12 = the glyphs 10 and 2 overlaid). Procedural numerals and local glyph files are joined too.
- **D'ni text reads in Latin on hover** (or on touch): `dni:…` inline, `dni` blocks, the names on Age sheets and in the journal, the Age's name over the Relto. The vailee's name is now written in D'ni letters when a font is there (status bar with Latin on hover, calendar stele, clock plinth).
- **The Relto book, cared for**: it stays closed while you hear the book and its clasps, then the cover opens like a page turns; under it a marbled endpaper with an ex libris, a half-title page that turns to the first spread, a garnet ribbon bookmark; no page numbers. The book taken from the shelf is drawn at the scale of the page that opens.
- **The Castle's moon** is now a photograph of the full Moon (a free image, 13 KB, greyscale), softened and tinted at runtime; the stele's crockets sit on its arch.
- **The tap** of the lounge has its own, gentler voice (a thin trickle, no sprinkler, no geyser).
- Command **"D'ni numerals: diagnostic report"**: mode, font, missing digits, measured posts.

### Fixed
- The 12 was looked for on `"`, which no D'ni font has: it is on `@` (Shift+2 on a US keyboard, like 10 = `)`, 11 = `!`). The year 9682 (15·12·7) was drawn with a procedural 12 in the middle of font digits.
- Numerals in SVG (status bar, sheets, journal) no longer have their bars clipped: the box grows to the measured ink.
- Relto in full screen: the motto is hidden (it sat under the time line); the Age's D'ni name is centred on the whole bar.
- The numeral-font setting says whether the font was found.

## 1.44.2 — Cleaner styles (2026-10-19)

### Fixed
- **Styles**: the Relto book no longer uses `display: contents` (only partly supported by Obsidian) nor `!important`; the reduced-motion rule now overrides the page animations by its own selectors. Nothing changes on screen.

## 1.44.1 — The tap's own voice (2026-10-18)

### Fixed
- **The tap has its own sound**: a thin stream falling into an enamel basin (a moving trickle, a light hiss, the low ring of the basin, small close bubbles), no longer the pond's lapping.
- **The Relto book on the pedestal**: a click beside the open book puts it down again. The book no longer fills the whole scene; the Relto shows around it.

## 1.44.0 — Running water (2026-10-18)

### Added
- **The tap runs**: in the lounge, click the sink and the old brass tap opens; a thin stream of water falls into the basin, rings widen in it, and the sound of the room turns from the crackling stove to running water. Click again to close it. The water keeps running if you leave and come back.

### Changed
- **The Relto book on the pedestal opens inside the Relto**, like the linking books of the shelf: no new tab, the full screen stays. It arrives closed; a click opens it (book and clasp sounds) on the page of the Relto you are in, and the pages turn as in the book's tab. The glass of the Relto you are in plays the linking sound and brings you back outside, on the island; the glass of another Relto takes you there. A click beside the book, or Escape, puts it down.

## 1.43.0 — The lounge (2026-10-18)

### Added
- **The lounge**: the other side of the cabin. Turn around from the edges of the cabin view (a pale arrow on each side). A small kitchen corner (an enamel sink under an old brass wall tap, a wood stove with a steaming pot and a kettle, a shelf of jars, copper pans), a great arched window over the sea of clouds and, under it, a deep sofa you could sleep on; on the right, the Relto book rests closed on a carved pedestal: click it to open the book. At night the lantern lights the sofa, the stove glows and a candle burns by the book. The Castle and the Glasshouse dress it too (stone, walnut and crimson velvet under a pointed window and an iron chandelier; glass, copper, green velvet, a fan of stained glass and a hanging glass lamp).

### Changed
- **The Relto book turns like a book**: click the right page to go forward, the left one to go back (or swipe; the arrow keys too). The page folds down onto the spine and the next one rises. A dog-eared corner says a page can be turned, and each page has its number; before the first Relto, the book closes on its cover. No more buttons, and nothing around the glass: no title, no caption, no link. The glass alone is touched (Enter from the keyboard).

### Fixed
- **The Castle**: in the cabin, the right pinnacle of the gothic door no longer runs over the small bookcase.

## 1.42.0 — The Relto book (2026-10-18)

### Added
- **The Relto book**: the mountain icon in the ribbon now opens a closed green book with a gold-tooled binding, a garnet medallion engraved with the island, the mountain and the hut. Opening it (a click, or Enter) plays the book and clasp sounds, then turns to a double page for each Relto in the vault: the text on the left (name, inscription, story chapter, shelf, time there in D'ni, Ages linking back, last visit), the linking glass on the right with the island alive at the hour of the day. Touch the glass to link: the Relto opens in full screen. A "Cover" button brings you back to the closed book, and the Cover tab setting applies.
- **Setting "The Relto button opens"**: the Relto book (default), or straight to the last Relto visited, as before. A command, "Relto button: switch between the Relto book and the last Relto visited", flips between the two. The "Open the Relto" command stays direct.
- A book whose `return:` line points to a Relto no longer says "not an Age": it reads "Relto · home", and its glass shows the island.

### Fixed
- Clicking the Relto from another note no longer opens a second tab of the same Relto: the existing tab is reached instead.

## 1.41.5 — Gargoyles on the corners (2026-10-18)

### Fixed
- **The astronomer's tower**: its two gargoyles no longer float beside the wall. Each now juts from a corner of the tower, just under the gallery, a small crouching beast on its corbel, wings folded, jaws open.

## 1.41.4 — The Castle beyond the keep (2026-10-18)

### Changed
- **Behind the keep**, the old mountain's mass is no longer a regular row of teeth: two layers of uneven towers rise from it, with pepper-pot roofs, thin spires, broken-pitched roofs, chipped battlements, turrets corbelled out from their flanks, a tiered tower and a spire that leans, its tip broken off.
- **A tall rose-window tower** stands at the back, its rose dark by day and burning at night, under a belfry with corner pinnacles and a short spire; two tiny turrets are tied to it, one on a footbridge, one hanging from a slender arm on its strut. It lights up on the side the sun is on.
- The visitor by the fire has been redrawn.

### Fixed
- The lancets of the low curtain wall below the keep no longer run over the pale coping.

## 1.41.3 — The Castle under slate (2026-10-17)

### Changed
- **Slate roofs.** Every roof of the Castle (keep, towers, curtain wall, chapel, hanging towers) is now blue-black slate, with courses, a ridge catching the light and a dark eave; it barely lightens by day, so the towers stand out against the pale stone.
- **The great spire** grows out of its tower in stages instead of sitting on it like a hat: a belfry with two lancets, a cornice, four corner pinnacles, gables at its foot, then the spire itself, narrower than the tower, in verdigris copper (the Castle's one touch of colour) with scales, a dormer, crockets, a ball and a cross. The other spires and pepper-pot roofs now rest on cornices.
- **The giant bat** is redrawn: in profile, head first in the direction it flies, scalloped wings beating.
- **The pond, under the Castle**: the cliff becomes the keep's wall (quoins, a lit lancet), the water leaps from a gargoyle's mouth and falls in an arc into a stone basin with a coping and two carved posts; the overflow leaves through a stone spout, past a row of blind arches.
- **The crypt**: the niches fit within the walls, the coffin is larger, and the lamp's glow stays on the book.
- The visitor by the fire has curled up to sleep.

### Fixed
- Under the Castle's island, blind arches, gilded arches, gems and buttresses no longer spill over the edge into the void.

## 1.41.2 — Things that walk the Castle at night (2026-10-17)

### Added
- **Under the Castle, at night**, a giant bat now and then crosses the red moon, slow wings and red eyes.
- **A stone coffin in the crypt**, its lid not quite shut, a red light breathing underneath. Best not to wake whoever sleeps in it.
- It is said that, on some nights, a visitor keeps watch by the fire.

### Changed
- **The astronomer's tower** grows into its observatory instead of carrying it like a hut: corner pinnacles, a gallery on machicolations, buttresses, traceried lancets, and a pointed lead dome with golden ribs and a cross; a longer brass spyglass comes out of its slit.
- **More rooms take on the disguise**, under the Castle and under the Glasshouse: the furniture of the far room, the vault (a rib-vaulted crypt; a mosaic hall under a copper glass roof), the doors (a flamboyant gothic front door under the Castle; an art nouveau door of iridescent wood under the Glasshouse).
- **Gold, silver and gems** are set into the Castle's masonry (gilded keystones, jewelled cabochons) instead of being drawn over the stone.
- **The keep**: a flying buttress that rests on something, a small turret that stands on its own cornice, nothing floating.

### Fixed
- A piece of furniture looked open while it was shut, so the first click seemed to do the opposite.
- Castle, far view: the stone footbridges reach their islets.
- Castle, the Imager: the window above the narrow door sits clear of it.

## 1.41.1 — The Castle at dusk (2026-10-17)

Just in time for Halloween: attach the Castle, wait for nightfall, and watch the red moon rise over your Relto.

### Changed
- **The Castle takes the daylight.** By day its stone lightens to a soft bluish grey and is lit on the side of the sun (left in the morning, right in the afternoon); at dusk it sinks back to charcoal, and the red night is unchanged.
- **A deeper green under the Castle**: the courtyard lawn, the grass, the tufts and the trees take a deeper, colder green, the garden of an old castle. Flowers, koi and the cat keep their colours.
- **The far view**: the pale rock pinnacles around the island become distant towers.

## 1.41.0 — The Castle (2026-10-17)

### Added
- **The Castle, a second disguise for the Relto** (`page_castle`, in the sandbox book of pages): romantic gothic, in the spirit of Symphony of the Night. Attach it and the whole island becomes a castle; detach it and everything comes back. Only one disguise at a time: attaching the Castle detaches the Glasshouse, and the other way round. Not in the story mode.
  - **Outside**: the old mountain becomes the mass of the castle, bristling with gables, battlements and thin spires, in the middle of the island and crowned by the keep (a rose window, an arcaded gallery, a portal with archivolts, an openwork spire); the observatory sits on the astronomer's tower. A long crenellated range runs along its foot, and a curtain wall closes the courtyard. The rock becomes vaulted foundations under a rampart, the cabin a small chapel of old mossy stone with its bell-cote, the islets hanging pieces of the castle joined by stone footbridges, the linking pillars and standing stones steles, the waterfall a gargoyle. The grass, flowers, trees, koi and cat stay as they are.
  - **The red night**: the day stays the day; at dusk the sky turns blood red, and at night a great red moon rises, bats cross the sky and a low crimson mist drifts under the island. Every window and close-up shows the same sky.
  - **Inside**: dressed stone above walnut panelling, a herringbone parquet, pointed-arch doors and stained glass, wrought iron, velvet and old gold, candlelight; every room takes it on, the Imager, the observatory and the writing room included.
  - **The calendar and the D'ni clock**: a granite stele with its number in gold, a paved terrace for the clock; their close-ups follow.
  - The far view shows the same castle, smaller.
- Nothing you click moves, except the observatory, which follows the keep to the middle of the island.

## 1.40.0 — Lawn and lily of the valley (2026-10-15)

### Added
- **A lawn with the Grass page.** The top of the island becomes green grass, with light streaks and a fringe falling over the rock; the tufts grow out of it. The open-air close-ups (grove, pond, cat) share the same ground. Without the page, the ground keeps the terrain's colour.
- **A Lily of the valley page** (`page_lily_of_the_valley`): scattered clumps, two blade-like leaves, an arching stem and small white hanging bells.

### Changed
- **Glasshouse, volcanic plateau**: the lava fissure of the mountain is drawn whole, rising from behind the dome with a branch and a glow, instead of a short stub peeking over the glass.

## 1.39.1 — The panel closes again (2026-10-15)

### Fixed
- **Leaving a room puts its mechanisms back.** Since 1.36.0, the small bookcase of the cabin stayed pushed aside, the hidden panel stayed open, the desk drawer stayed out, the message on screen stayed and the fade between views was gone. All back as before.
- **The skylight's numerals are all the same size** (0 to 24).

## 1.39.0 — The calendar up close (2026-10-15)

### Added
- **The calendar pinnacle opens up close.** Click it, on the island or in the far view: the whole D'ni date is engraved on the stone (hahr, the name of the vailee, the yahr large, and below it gahrtahvo, tahvo, gorahn, prorahn), following the real time. Plain stone, or under the Glasshouse a copper-framed stained-glass slab with the engraving glowing amber.

### Fixed
- **The yahr no longer spills off the pinnacle**: with two digits they stack on the shaft.
- **Glasshouse, the Imager**: the side panes exist only in the overview and no longer overlap the spyglass shelf or the gauge.
- **Glasshouse pavilion**: the two bays sit clear below the dome.
- **The skylight** of the writing room loses its little buds (they read as zeros), and its close-up has a thinner band.

## 1.38.0 — The skylight (2026-10-15)

### Added
- **The round window of the writing room can be looked at up close.** Click it: the sky of the hour (and the comet, if one passes) fills a round frame, ringed by a brass band engraved with the D'ni numerals 0 to 24, in order, with no caption. A reading plate for learning the digits. Under the Glasshouse the band is copper with the stained glass enlarged; without it, plain brass around the simple window.

## 1.37.1 — The same door outside (2026-10-15)

### Fixed
- **The Glasshouse door seen from the island** now matches the one inside: two leaves under a round arch, a clear oval in each, small flowers, iridescent wood. It had kept the earlier amber ogive with a sun.

## 1.37.0 — The Glasshouse (2026-10-15)

### Added
- **The Glasshouse, an art nouveau disguise for the whole Relto.** A new page in the sandbox book of pages (detached by default, absent from the story mode). Attached, the cabin becomes a pavilion of sea-green and amber glass under a copper dome crowned by a small lantern (the chimney smoke rises from it). Inside: ogival stained glass with flower patterns (iris, lily, poppy, tulip, ginkgo, fern), a mosaic floor, ornate rugs, a double door in leaded glass, furniture with whiplash legs and copper trims, lamps with leaded-glass shades whose light takes their colours. Every room changes its clothes, the Imager (a rose window where the aurora shines through) and the observatory included; the D'ni clock stays open to the sky. Only the envelope changes: nothing you click moves, grows or hides, and a test checks it room by room.

## 1.36.1 — The echo without words (2026-10-14)

### Changed
- **The Art of the Guild no longer comments on the echo.** At step 2 of the telescope, the line under the eyepiece used to say whether the echo came before or after the pulse ("less delay", "more delay"): an aid, not something you see. In the Guild's way it is gone; you read the echo at the eyepiece and the metronome. The easy way keeps its line.

## 1.36.0 — The chart that turns (2026-10-14)

### Added
- **The star chart scrolls and turns.** Under the magnifier, drag the parchment to move it (mouse or one finger). A brass compass rose in the bottom-right corner turns the chart around the Zero: drag around it, or click it (Shift-click turns back), one sixteenth of a turn at a time; Shift-drag or right-drag on the chart turns it freely, and two fingers on a phone. Plumb lines and names stay upright; N, E, S, W keep their quarter of the sky; ◎ gives back the whole sky with north up. The chart always reopens with north up.

## 1.35.0 — The Treatise of the Art (2026-10-14)

### Added
- **A book in the Relto opens the guide.** On the long table of the loft, in the sandbox, lies a thick volume under a brass clasp: the Treatise of the Art. Before the Grand Master title the clasp does not give (a dry click, a sentence); from then on the book opens the whole reference, dressed as a book (parchment, the title in D'ni, a page sound at each topic), over the Relto. The guide button in the bar and the ribbon icon stay, as shortcuts outside the fiction.

## 1.34.0 — A guide you can search (2026-10-14)

### Added
- **Search in the guide**: a field at the top of the contents keeps only the topics that contain the words (accents and capitals do not matter) and highlights every match; the text opens on the first. The spoilers' text is never searched, only their title. While searching, previous / next turn among the topics found.
- **A mini-contents in long topics**: a topic with four subheadings or more opens on a row of links, one per subheading (nineteen for the telescope topic).
- **← and →** turn the topics.

### Changed
- **The contents follows the open topic**: opened from the Relto deep in the list, it scrolls to it.
- **A larger guide window** on a computer (1100 px wide, 80% of the screen's height).

## 1.33.1 — Buttons that fit (2026-10-14)

- The guide's previous / next buttons no longer let their text run out on a phone: a small “Previous” / “Next” above the topic's title, which wraps.

## 1.33.0 — The guide on a phone (2026-10-14)

### Added
- **A mountain icon in the ribbon opens the Relto** (on a phone, in the left menu).
- **A guide button in the Relto's bar** (an open book): it opens the full reference on the topic of what you are looking at (the telescope, the Imager, the cat or the clock: their topic; elsewhere, the refuge). In full screen, the guide comes in front of the Relto.
- **Previous / next topic** buttons under each topic of the guide, to read it straight through.

### Changed
- **The guide on a narrow screen**: the contents and the text take turns. It opens on the contents, one topic per line; pick a topic to read it, and “‹ Contents” brings the list back.

## 1.32.6 — A better French guide (2026-10-14)

### Changed
- **French guide reread**: clumsy or approximate wording rewritten in natural French (dosing, physics values, telescope, phone, star chart, spoilers), and one sentence whose meaning was reversed (when the telescope page unlocks).
- **Guide, both languages**: mobile is no longer listed as unsupported; the phone paragraph now describes the portrait full screen; the Relto is created by “Open the Relto”; the settings have seven pages.

## 1.32.5 — Fewer words for the Guild (2026-10-14)

### Changed
- **Art of the Guild: the telescope's words say only three things** (nothing, something, very close) instead of six steps. Watching the words change no longer guides you notch by notch; you read the glass, the pulse and the pendulum. Easy mode is unchanged.

## 1.32.4 — Let him sleep (2026-10-13)

- A sleeping cat keeps his eyes closed.

## 1.32.3 — A paw (2026-10-13)

- In the Pages tab, a built-in page's tooltip is now just its name (it no longer claims to come from a Relto library). And a paw, for one of them.

## 1.32.2 — A new cover every day (2026-10-13)

- The armchair of the writing room gets a new cover every day: bordeaux leather, bottle-green velvet, ochre, midnight blue, grey tweed or tobacco leather, the same all day long.

## 1.32.1 — A cat (2026-10-13)

- A cat, for those who know how to find him.

## 1.32.0 — A star chart that breathes (2026-10-13)

### Added
- **Names on hover.** Star names are written when you hover (or touch) a star; the **Aa** button on the right edge of the parchment shows them all. The Relto keeps its name.
- **A magnifier**: a click on the parchment magnifies around that point (×2, then ×4, then back to the whole chart).
- **Regions of the sky**: N, E, S, W look at one quarter of the sky, around its stars; ◎ gives back the whole sky.

### Changed
- **The scale adapts to your stars**: a logarithmic curve set by their typical distance spreads the stars near the Zero apart and keeps the farthest at the edge; directions stay true.
- Labels avoid the line of the instrument too.

## 1.31.0 — Hands that take, tooltips that fit (2026-10-13)

### Added
- **A drawn open hand, and a hand that grips**, in the style of the pointing hand: over what you take or touch with your whole hand (a wheel, a glass on its rail, a book on the shelf, a linking panel); the hand closes while you turn. With the quill cursor (setting), as before.

### Changed
- **Long tooltips wrap** onto two or three lines instead of running off the picture; the lens turret's tooltip is short ("Turret of lenses: Both — click: Bare glass"), the guide explains each glass.
- On a phone in full screen, the Pages and Settings tabs no longer show the Relto's name and header, which pushed everything aside.

## 1.30.9 — A column of buttons in full screen on a phone (2026-10-13)

### Changed
- On a phone in full screen, the Relto's buttons stand in one column along the left edge of the picture, close together, and the picture takes the rest of the screen. Nothing changes outside full screen or with a mouse.

## 1.30.8 — Bigger Relto buttons on a phone (2026-10-13)

### Changed
- On a phone or tablet, the Relto's icon bar puts all its buttons on the left, larger (44 px, the size of a finger) and always fully visible (there is no hover to light them). Nothing changes with a mouse.

## 1.30.7 — One pane at a time in full screen on a phone (2026-10-13)

### Fixed
- On a phone in full screen, the Pages and Settings tabs showed on top of the picture and spilled over the icon bar, which could no longer be touched: you were stuck. As on the desktop, full screen now shows one pane at a time (the view, the pages or the settings), and the icon bar always stays above, touchable.

## 1.30.6 — A click no longer turns a wheel by itself (2026-10-13)

### Fixed
- Since 1.30.3, pressing a wheel started turning it at once: near the centre of the hub, the slightest tremor of the click turned it a few notches, and the aim slid away from the star. A wheel now turns only once the pointer has really moved (a few pixels), and the very centre of the hub never turns it.

## 1.30.5 — Stylesheet clean-up (2026-10-13)

### Fixed
- The stylesheet no longer uses `!important` (the smaller Relto hour on a narrow screen now relies on more precise selectors). Nothing changes on screen.

## 1.30.4 — The whole Relto lies down (2026-10-13)

### Fixed
- On a phone held upright in full screen, only the picture lay down: the icon bar stayed upright, sideways once the phone was turned. The whole Relto now lies down by a quarter turn, icon bar included.

## 1.30.3 — Wheels you turn with the mouse (2026-10-13)

### Added
- **Turn a wheel by dragging, with the mouse too**: press a wheel and turn around its centre (a fine notch every 8° at the hub, a coarse one every 20° at the rim). The cursor becomes a grabbing hand over anything that turns.
- **The scroll wheel** over a wheel turns it one fine notch (Shift: a coarse one), in the large view and in full screen; in a note, the scroll wheel still scrolls the note.
- **At the Imager, drag a glass along its rail** (and the iris lever along its arc), with the mouse or a finger.

### Fixed
- On a phone, the descriptive books of the vault were misplaced when the Relto lay sideways in full screen; they now sit on the picture, and move when the phone turns.
- On a phone, each notch of an Imager rail, of the iris arc and each crystal slot asked for a first touch to read it: a rail, the iris and the crystal slots are now read once, then act at each touch.

## 1.30.2 — The Relto shows again on a phone (2026-10-13)

### Fixed
- On a phone, the Relto could vanish: opening it went straight to the new full screen (setting *Open the Relto in full screen*), and inside Obsidian mobile's panels that view could land off screen. On a phone, full screen now only comes from its button, and the full-screen Relto hangs directly on the page, out of Obsidian's panels; leaving it puts it back in its note.

## 1.30.1 — Full screen on a phone, a book that fits (2026-10-13)

### Fixed
- **Full screen works on a phone.** Phone browsers refuse true full screen, so the button did nothing. The Relto now fixes itself over the whole screen, the icon bar on top, the tooltip card over the bottom of the picture. Held upright, the picture lies down by a quarter turn: turn the phone and the Relto fills it, even with auto-rotate locked.
- **The Age's book on a narrow screen**: one page above the other, the tabs wrap instead of being cut off.
- In a note on a phone, the D'ni hour and the tooltip card are smaller, the portrait hint is one line (it also offers full screen), and the picture is no longer dimmed.

## 1.30.0 — Age Writer on a phone: a Relto you touch (2026-10-13)

Age Writer now installs on Obsidian mobile. Writing Ages works as on the desktop; the Relto is played with a finger. Nothing changes with a mouse.

### Added
- **Touch to read, touch again to act.** The first touch frames a thing and shows what it is in a card under the picture; the second acts. A wheel you have read then acts at every touch (both halves and its hub). Doors, books and going down act at once; touching empty space lets go.
- **Wheels you turn with a finger.** Put a finger on a wheel you have read and turn around its centre: a fine notch every 8° at the hub, a coarse one every 20° at the rim (a short vibration on Android). The Imager's knobs, periscope crank and micrometer turn the same way.
- **Larger targets**: a zone within a finger's width answers.
- **The telescope's eyepiece magnifies** at a touch (the wheels stay on the right); another touch gives it back.
- In portrait, a line asks to turn the phone sideways. The full-screen button makes the Relto take all of Obsidian's room (browsers on phones refuse true full screen).
- A guide section, "On a phone or tablet".

## 1.29.0 — A telescope that shows everything: a turret of lenses, a pose time, beacons that predict, a plate that bites (2026-10-13)

The observatory's Art of the Guild is rebuilt on one principle: the glass shows everything that arrives, the plate engraves what you expose, the beacons say what you should see. The instrument no longer knows what is false; the astronomer does. Easy mode is unchanged.

### Added
- **A turret of lenses** on the eyepiece barrel (a brass knob, lower right; a click turns it, Relto keeps the choice): *bare glass* (the sky, the point, the crosshair), *echo glass* (the echo rings magnified ×3.4), *phase plate* (the default: the dial and its trace), or *both*.
- **The phase dial keeps a trace.** Each pulse leaves a mark where it is born, fading in about eight beats. The Zero's echo piles up in one sharp point; the Me'erta line (now present on every Age, as it crosses matter and Ages like the Zero) marches round the dial; a pulsar crawls, a neutron star jumps. The true beat does not drift. Turning the wheel blurs the trace, which forms again.
- **The plate bites.** Hold the exposure on the false beat (right direction, false delay) and the star is engraved at the wrong distance. The map does not show it; the Imager cannot hold the planet, and the Details tab says so. Scratch the plate, or expose again on the true delay.

### Changed
- **Beacons predict instead of filtering.** With two charted stars nearby, the lever marks where the Zero should appear from here: a ghost ring in the eyepiece, a mark on the Delay wheel, near the whole-beat switch and on the dial. Nothing is taken from the glass; the bent light and the false beat stay. The prediction has its own error of a few notches, and inherits the error of a star engraved wrong. Out of the field, there is no arrow: when you are close (within two eyepiece radii) the predicted light spills onto the rim of the glass, beating with the pulse.
- **Pose time.** Near a false beat the plate always needs three still beats of exposure ("Exposing the plate: hold still"); the beacons no longer exempt it.
- The telescope no longer says "the echo follows the false beat".

## 1.28.0 — Drawn pages in plain sight, a cavern you look into, a moon you tune, a telescope you must read (2026-10-13)

### Added
- **Drawn pages shown where they cost.** In the stability details ("What does not hold"), a clash that touches a page the Age drew now names it ("Drawn by the Age, not written in your note: erratic cycle") before the generic advice. *Keep it (write it)* writes it into the note; for a one-value box (stars, cycle, ground, fissure) a button writes each other value instead, and the box closes.
- **A cavern you look into.** In a `cavern_world` the window shows the inside: a closed vault with stalactites, rock sides and distant pillars in the haze, black pools. The only light is the Age's own: cold algae (`glow_algae`) glow blue-green and tremble in the water, luminous vine green, lava orange. Other worlds are unchanged.
- **A moon you tune**: `moon: small`, `large`, `distant` or `close` (two words allowed, `lune:` too). A small or distant moon no longer steadies the axis, so an erratic cycle becomes possible again, and its tide weakens; a large or close one heats the interior more. A distant moon needs a planet that can hold it (Hill sphere at least Earth's), otherwise a light clash with hints. The window draws the moon smaller or larger.
- **Telescope, Art of the Guild.** The pendulum is linked to the instrument: on each beat the eyepiece crosshair glows (gold on the marked stroke), and a **phase dial** engraved in the glass shows where the amber echo is born against the tick (right of noon: more delay; left: less; on noon: set).

### Changed
- Near a dead star (pulsar, neutron star) and not triangulated, the Art of the Guild no longer lets a sweep chart the star: the true echo is paler, the false beat has the same colour and size as the true one, and you must hold the wheel on the true delay for three beats ("Two beats tangle in the echo: hold still"). Only the true beat does not drift. Triangulation lifts it; Easy mode is unchanged.
- The advice for the erratic cycle clash offers `moon: small`, then `steady_cycle`, then removing the moon (it used to promise a "small and distant" moon that did not exist).

### Fixed
- The guide no longer says that × removes a drawn page: × only takes out a written page; a drawn page is closed by writing its box's value.

## 1.27.4 — A book you open, a quill in the Relto (2026-10-12)

### Added
- **The book of the vault opens closed, on its cover.** A blank book: you write its name on the leather (Enter or the right edge opens it), and that name becomes the note's, instead of "Age", "Age 2"… An Age's book shows its own cover. Turning back from the first spread closes the book.
- **A quill and a drawn hand in the Relto.** The pointer is a quill, tinted like the crystal flower of the study (`flower_color` changes it too); what you can click shows a hand drawn in ink, on the canvas, in the books and on the linking animation. Setting *Quill cursor in the Relto* (on by default).
- **The Relto opens in full screen** when you open its note or run *Open the Relto*. Escape leaves it. Setting *Open the Relto in full screen* (on by default).
- **The star chart keeps the history of rewritten Ages.** The first chart shows today's stars, each Age only at its current star; then one chart per Age that changed stars, "The wanderings of …": its former stars, pale, then today's, joined by a dotted path. ‹ › at the top of the parchment.
- **The cat can sleep at a fixed place in the study**: `cat_sleep: atelier armchair`, `atelier rug` or `atelier bed` (`atelier` alone: the place changes every half hour).

### Changed
- In the vault's book, the linking panel opens the book (right page, the left one blank), and the linking books with the fissure sentence close it, alone on the last page. "No linking book written. Add link: [[Name]]…" became a sentence in the book's own voice.
- The sentence about the glass (clear, wavering, silent) moved under the description, small, with the axes.
- "Draw again" is a pair of ink dice, centred; "write it" is centred, away from the edge where you turn the page. The sentence about drawn pages is in French when the interface is.
- On the star chart, the Great Zero is in the blue of the telescope's signal and the line of the instrument in indigo.

### Fixed
- In the large Relto view, the vault no longer shows every book again after going out to the island and back.

## 1.27.3 — README up to date (2026-10-12)

### Changed
- README (English and French): the note on languages is accurate again (the *Language of the extensions* setting; block names and generated descriptions stay in English; guide, story letters and journal in both languages), and the recent changes are a short list per version, up to 1.27.

## 1.27.2 — The star chart shows only the chosen books (2026-10-12)

### Fixed
- The star chart now shows only the Ages chosen for the shelf (names and stars), like the shelf and the vault. An Age you untick is hidden, not forgotten: its star and name stay engraved and come back when you tick it again. The *clean* command still forgets only Ages that no longer exist (deleted, renamed, excluded).

## 1.27.1 — The vault shows only the chosen books (2026-10-12)

### Fixed
- The vault of descriptive books now shows only the books chosen for the shelf (the pills of the Pages tab, or the `books:` line of the block), not every Age of the folders. With *Hide all*, the vault is empty, like the shelf.
- A line of the book with an unknown symbol is now underlined plainly instead of with a wavy line, which Obsidian's catalogue reports as only partly supported.

## 1.27.0 — The sickness of the living, and reading the world (2026-10-12)

### Added
- **Coherence buys capacity.** Every axis still carries six things for free, but each law of that axis your Age brings into play and keeps adds two more, up to sixteen: the loop of life and death, the large resting on the small, flowers with a pollinator, plankton with light, the ground that bears its tree, weather that follows from itself, a sky that agrees with itself. A rich world that holds together now stays stable at every rigour (a coherent 21-line world: 82% everywhere, where balanced and strict used to drop it to 70% and 58%). A world with a lot of everything still cannot. Take away what keeps a law and the capacity falls: the depth line sees it.
- **Scars the world keeps from its draw.** A light clash that touches a drawn page no longer costs anything. A medium or strong one no longer costs its full price: the world forms anyway, but keeps a scar, one per axis, that says what went wrong, *light*, *normal* or *deep*. It costs a little, eases the riches' cost a little (more when deep, always within 75%), shows in the book, the description and the window, and heals when you remove the clashing page or write your own value in its slot. Clashes between pages you wrote stay whole. Two new scars: `held_rain` (weather) and `mute_ruins` (ruins).
- **Retouching follows depth.** Once the ink is dry, changing an Age that rested deep costs less, and one that held by a thread costs more; the notice says so. This is the *balance* family of the rigour, which now acts: nothing changes at gentle rigour.
- **The sickness of the living.** When a role that feeds (the plants, or what returns the dead to the soil) is held by a single species and animals depend on it, the chain holds by a pair and falls sick: a light scar (normal if several animals depend on it), a sentence in the description, the panel and the ledger, yellowed patches in the window. Never at gentle rigour; at balanced the seed decides (about one such world in three); from strict up it is certain. A second species in the role cures it. Pages the draw brings count too: a drawn grazer on a lone plant can make it sick. The sickness never tips a stable world: its cost stops at 75%; an Age already unstable sinks as before.
- **Reading the world.** A light fault (the sickness of the living, a light scar from the draw) costs its points from the first reading, but the world names its cause only with time: a sign, then a symptom, then the cause. Balanced: 1 and 3 days; strict: 2 and 7; extreme: 3 and 14; gentle: at once. A Master skips the sign; a Grand Master sees the cause with the symptom. New setting *Reading the world* (slow, normal, immediate). Stability never waits: only the words do. The window and the book always show everything.

### Changed
- Every point the extension takes now has a sentence. `many: gold` says so in the description ("There is far too much gold here"); the panel no longer cuts the sickness off its life line (everything that costs is told, only free notes are capped); and when a fissure wears an unstable world down, the panel says it ("Duration · the fissure opens and the world crumbles"). A new test checks it on the whole corpus at the four rigours.
- Reference corpus: three Ages added for the sickness of the living; at strict and extreme, four existing ones now carry it (their verdicts do not change).
- The guide and the README say that stability is recalculated each time an Age is read: when the rules evolve, an existing Age may gain or lose a few points (mostly at higher rigours); its text, pages and draw never change.

## 1.26.0 — Life, soil, caverns and writing from the Relto (2026-10-12)

### Added
- **Life and soil.** New blocks you can write: micro-life (`plankton`, `microbial_mat`, `mycelium`), three shrubs (`berry_shrub`, `thorn_bush`, `heath_shrub`), fauna by habitat (`shoal`, `raptor`, `deep_hunter`, `cave_stalker`, `carrion_beetle`, `bee`) and ground born of life (`earth`, `humus`, `peat`). Some things are only ever produced: mycelium and water give mushrooms, wind, spores and fog give a living mist, a spore in silt gives soil bacteria, bees make the flowers hum. `hunter` stays the all-round carnivore. The mushroom has two rare variants: it glows when `strange_stone` is in the Age, and sings when a `crystal` is.
- **Laws of life.** Under the costs, one line now says what the life of an Age lacks: the loop must close (something returns the dead to the soil), the large rests on the small, flowers want a pollinator, a big tree needs ground that can bear it, plankton needs light and a mat needs heat or chemistry. The sentence is always there; it costs stability only from balanced rigour up (Soil and Life families), and never in gentle.
- **A writer's title.** An Age that stays stable for seven days in a row earns you a title, by the rigour it held under: Scribe (gentle), Seasoned Seltahn (balanced), Master (strict, with at least three law families ticked), Grand Master (extreme). The first Age to hold seven days is also marked once. The title never goes back down, and nothing is locked by it; changing the rigour, or falling below stable, restarts the count.
- **Write an Age from the Relto.** A blank book on the cabin table opens a real book inside the Relto: the linking window first, then pages of glyphs drawn in ink on parchment (an empty slot opens a binder you leaf through to pick a glyph), then the description, then a free page that lists what is written and takes a typed line (a line the engine does not understand is refused). The note is created with the first line and its linking book joins the shelf at once.
- **The ledger**, on the Imager next to the lectern: it reads the Age on the lectern, by layers that grow with your writer's title (description and the gravest tension for an Apprentice, up to the costs in points for a Grand Master). The side panel is unchanged.
- **The vault of descriptive books.** An iron hatch in the cabin floor (in front of the fireplace) leads to a stone room whose niches each keep up to five descriptive books, in alphabetical order, to reopen, read and correct. The blank book stands on a lectern in the middle. Each Age is one note and two books (descriptive and linking): delete the note and both disappear. A linking book now has its own look: a dark binding with a brass clasp.
- **A world under rock.** New world type `cavern_world`: no sun, no `rain`, `lightning` or `wind` (strong contradictions). The cold, the heat and the light of the outside get in only in part, by the vault: the thicker the rock written on the ground (`stone`, `iron`, `crystal`) and the smaller the world (`size:`), the less gets in. A loose vault under a large world is tired, and says so; from balanced rigour up that costs a little. New blocks for it: `glow_algae` (a cold algae that glows in the water, a lamp for the caverns) and `pellet` (a capsule of nutrients: a little feeds what grows, too much burns it).

## 1.25.1 — README wording (2026-10-11)

### Changed
- README: no more template-like text (a `<version>` token, "coming soon"), as flagged by the plugin catalogue check.

## 1.25.0 — Rigour of the laws (2026-10-11)

### Added
- **Turning pages in the books** (setting, on by default). Turn it off and the book of glyphs and the library book change their double page at once, without the page-turning animation. A system set to reduce motion already did so.
- **Rigour of the laws** (setting): gentle (default), balanced, strict (you tick which laws count) and extreme. Gentle changes no Age for the worse: only what lightens an Age counts. Soil, life and balance are ready for the coming updates.
- **Dosing, by extent.** A clash between the sky and the matter now costs in proportion to how much they touch: the quantity (`few:`, `many:`) × the size of the world (new line `size: small | medium | large`) × the number of biomes. `few: water` in a desert world is a pond rather than a lake (`water: few` works too); a small world forgives more. A panel line shows what the dosing changed.
- **How deeply an Age rests.** Under the costs, one sentence: each line is removed in turn, and if the Age falls without one of them, it holds by a thread. No number is shown.

### Changed
- **The book of glyphs shows every glyph in the sandbox Relto**: the ones you have not written yet appear faded, with their name; the ones you have written keep the Ages where they appear. (In the story, the unlearned ones are still only guessed.)
- **Cleaner stylesheet** (Obsidian's compatibility check): no more `!important`, `clip-path` or `display: contents`. The brass corners of the books and the cut corner of the panel are now drawn with gradients, the Relto's page and sound lists keep their columns with fixed widths, and the theme overrides use more specific selectors instead.
- **The cat is never in two rooms at once**: with `cat_sleep: always` (or at night), a cat asleep by the fire in the cabin no longer shows up in the study as well.
- **Weather that follows from itself is no longer held against an Age**: rain and wind making a storm, a storm and lightning making thunder, and water on iron making rust cost almost nothing now. Rain with wind and lightning used to be unstable; it is stable.
- **Everything has a budget** (balanced rigour and above): more than six things written on one axis cost a little extra each, gently at first.

## 1.24.0 — Story mode (2026-10-11)

### Added
- **Story mode.** A mentor, Adrin Vesparath, sends short letters (English and French) and sets nine chapters, each with a Writers' Guild course sheet that fades as you revise, a hint ladder, and a reward for your Relto. The story Relto has its own folder, apart from the sandbox, and the book only offers the blocks you have learned. Commands: “Start the story”, “Story: next chapter / restart the current chapter / check progress now / hint / repair chapter notes”.
- **Spoilers page in the full reference.** A new last part, hidden behind a tick box, covers what the Relto keeps secret.
- **The book of glyphs is a real book.** In the cabin, a click opens a book on the canvas: pages that turn (‹ ›, or the table of contents), the glyphs grouped by type, each with its drawing and the Ages where it appears, then a page of the **reactions** you have seen (type and catalyst). In a story Relto, glyphs not yet learned show as pale silhouettes with a hint on hover.
- **The library book is a real book too**, in two parts: *Library of Ages* and *Library of the Relto*. Each lists the entries already written and ends with a blank page where you write new ones directly (one per line); each line is checked, refused with its reason if it does not parse, and otherwise added to the library note without ever opening it.

### Changed
- Tooltips of glyphs you have not learned yet show only the hint ("Heavy, bitter"), not the obvious "a glyph you have not learned yet" (kept only when there is no hint).
- **Reference and README laid out for reading**: the Relto sections (observatory, Imager, Art of the Guild, weather, pages and effects) are split into short paragraphs, sub-headings and lists, in both languages, with no change to the content.

### Fixed
- The Imager's periscope, looking up: only a sun high in the sky shows overhead. A low sun stays at the horizon of the front view instead of appearing in all four directions.

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
- **Two ways to play the instruments** (setting *Instruments*): **easy** (default) — the observatory says "It brightens / It fades", the signal barely shimmers, no false pulses, dead stars only blur the image; **the Art of the Guild** — the 1.19 behaviour, plus the Imager's blank book.
- **The observatory metronome:** a brass pendulum beats the prorahn; the true pulse peaks as it touches a stop, to the eye and to the ear.
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
- **Dead stars and the star chart.** `pulsar`, `neutron_star` and `black_hole` exist in the sky even when unwritten (writing them only describes them): false beats, bent directions, triangulation from charted stars. The observatory's star chart reveals more. Ages without a magnetic field have fewer compass words and drift faster.
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
