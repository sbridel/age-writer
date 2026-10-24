"use strict";
// Point d'entrée UNIQUEMENT pour les tests visuels dans un navigateur (non inclus dans main.js).
const { Dni } = require("./dni");
const M = require("./relto-model");
const { ReltoRenderer } = require("./relto-render");
/* la machine du Relto, à quelques moments (src/relto-oven.js) */
const OVEN_SET = { levers: [2, 0, 1, 0], column: ["ash", "silt", "ash"], time: 40, temp: 20, press: 44 }, OVEN_RUN = { ...OVEN_SET, column: [] }, OVEN_STOCK = { ash: 7, humus: 3, silt: 2, peat: 5 }, OVEN_SHELF = { white: 4, amber: 2, grey: 1 };
const OVEN_STATES = {
  set: { oven: OVEN_SET, phase: null, stock: OVEN_STOCK, pellets: OVEN_SHELF },
  cook: { oven: OVEN_RUN, phase: { phase: "cooking", k: 0.5, left: 300000, kind: "white", n: 3 }, stock: { ash: 5, humus: 3, silt: 1, peat: 5 }, pellets: OVEN_SHELF },
  done: { oven: OVEN_RUN, phase: { phase: "done", kind: "white", n: 3 }, stock: { ash: 5, humus: 3, silt: 1, peat: 5 }, pellets: OVEN_SHELF },
  grey: { oven: OVEN_RUN, phase: { phase: "done", kind: "grey", n: 4 }, stock: { ash: 5, humus: 3, silt: 1, peat: 5 }, pellets: OVEN_SHELF },
  get burn() { return { oven: { ...OVEN_SET, burnt: { at: Date.now() - 700, kind: "grey" } }, phase: null, stock: OVEN_STOCK, pellets: OVEN_SHELF }; },
  dust: { oven: { ...OVEN_RUN, press: 4 }, phase: { phase: "done", kind: "dust", n: 3 }, stock: { ash: 5, humus: 3, silt: 1, peat: 5 }, pellets: OVEN_SHELF },
};
function renderMany(host, ages) {
  host = host || document.body;
  const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
  const variants = [
    { h: 13, t: 3.1, env: {}, pages: [], view: "cavetop", now: 1800000000000, cave: { good: 2, amber: 5, bad: 1, pick: "amber", drop: null }, label: "CAVE top / three kinds in the niche, amber chosen" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "cavebottom", now: 1800000000000, cave: { good: 2, amber: 4, bad: 1, colonies: 40, fedAt: 1799990000000, drop: { at: 1799999935500, q: "amber" } }, label: "CAVE bottom / an amber pellet feeds the lake, forty colonies" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "cavebottom", now: 1800000000000, cave: { good: 2, colonies: 40, fedAt: 1799000000000, drop: null }, label: "CAVE bottom / the lake, neglected: embers" },
    { h: 13, t: 3.1, env: {}, pages: ["page_gold", "page_silver", "page_gems"], view: "cavetop", now: 1800000000000, cave: { good: 7, bad: 2, drop: null }, label: "CAVE top / gold, silver and gems in the rock" },
    { h: 21, t: 3.1, env: {}, pages: ["page_gold", "page_silver", "page_gems"], view: "cavebottom", now: 1800000000000, cave: { good: 6, bad: 2, drop: { at: 1799999935500, q: "good" } }, label: "CAVE bottom / the ores light up in the glow" },
    { h: 21, t: 3.1, env: {}, pages: ["page_glasshouse"], view: "vault", label: "VAULT glasshouse / the bronze trapdoor" },
    { h: 13, t: 3.1, env: {}, pages: [], view: "cavetop", now: 1800000000000, cave: { good: 7, bad: 2, drop: null, shut: true }, label: "CAVE top / the hatch shut" },
    { h: 14, t: 3.1, env: {}, pages: [], oven: "cook", label: "ISLAND oven day / the lean-to against the cabin, its chimney smoking" },
    { h: 23, t: 3.1, env: {}, pages: ["page_castle"], oven: "cook", label: "ISLAND oven castle night / the forge against the chapel" },
    { h: 21, t: 3.1, env: {}, pages: ["page_glasshouse"], oven: "cook", label: "ISLAND oven glasshouse dusk / the glass annex" },
    { h: 14, t: 3.1, env: {}, pages: [], view: "oven", oven: "set", label: "OVEN day / set for a white batch: hoppers, levers, sliders, the press" },
    { h: 14, t: 3.1, env: {}, pages: ["page_glasshouse"], view: "oven", oven: "cook", label: "OVEN glasshouse / cooking" },
    { h: 23, t: 3.1, env: {}, pages: ["page_castle"], view: "oven", oven: "done", label: "OVEN castle night / three white capsules on the tray" },
    { h: 21, t: 3.1, env: {}, pages: ["page_glasshouse"], view: "oven", oven: "grey", label: "OVEN glasshouse / a grey batch: the drain lever is up" },
    { h: 14, t: 3.1, env: {}, pages: [], view: "oven", oven: "burn", label: "OVEN / a grey pellet thrown into the fire smokes green" },
    { h: 14, t: 3.1, env: {}, pages: [], view: "oven", oven: "dust", label: "OVEN / not pressed enough: it crumbled" },
    { h: 23, t: 68, env: {}, pages: ["page_comets", "page_mountain", "page_pine_trees", "page_mist"], label: "ISLAND night / comet" },
    { h: 13, t: 81.5, env: {}, pages: ["page_comets", "page_mountain", "page_pine_trees"], label: "ISLAND day / comet (faded)" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "cavetop", now: 1800000000000, cave: { good: 7, bad: 2, drop: null }, label: "CAVE top / the hole, the shelf of pellets, the button" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "cavetop", now: 1800000000000, cave: { good: 6, bad: 2, drop: { at: 1799999999200, q: "good" } }, label: "CAVE top / a pellet falls" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "cavebottom", now: 1800000000000, cave: { good: 6, bad: 2, drop: { at: 1799999970000, q: "good" } }, label: "CAVE bottom / the dark, waiting" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "cavebottom", now: 1800000000000, cave: { good: 6, bad: 2, drop: { at: 1799999935500, q: "good" } }, label: "CAVE bottom / the glow, the paintings, the Bahro" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "cavebottom", now: 1800000000000, cave: { good: 6, bad: 2, drop: { at: 1799999938800, q: "good" } }, label: "CAVE bottom / the glow rising" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "cavebottom", now: 1800000000000, cave: { good: 6, bad: 1, drop: { at: 1799999937000, q: "bad" } }, label: "CAVE bottom / a grey pellet floats and fumes" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "vault", label: "VAULT / the cellar under the trapdoor" },
    { h: 14, t: 3.1, env: {}, pages: [], view: "hall", label: "HALL day / before the first harvest: the bricked-up arch" },
    { h: 14, t: 3.1, env: {}, pages: [], view: "hall", oven: "set", label: "HALL day / the forge door at the end" },
    { h: 23, t: 3.1, env: {}, pages: [], view: "hall", oven: "cook", label: "HALL night / it is cooking: the glow under the door" },
    { h: 21, t: 3.1, env: {}, pages: ["page_glasshouse"], view: "hall", oven: "cook", label: "HALL glasshouse dusk / the glass door, the fire behind" },
    { h: 23, t: 3.1, env: {}, pages: ["page_castle"], view: "hall", oven: "cook", label: "HALL castle night / the pointed arch, the judas, the mirror that reflects no one" },
    { h: 15, t: 3.1, env: {}, pages: ["page_castle"], view: "hall", label: "HALL castle day / bricked" },
    { h: 21, t: 3.1, env: {}, pages: ["page_castle"], view: "vault", label: "VAULT castle / the crypt" },
    { h: 14, t: 3.1, env: {}, pages: [], view: "memories", memSel: "day_aurora", wonders: { breathing_mirrors: { at: 1, age: "Ash Tower" }, mosaic: { at: 2, age: "Pale Garden", gone: true }, day_aurora: { at: 3, age: "Ember Row" }, ringed_ground: { at: 4, age: "Moth Hall" }, petal_rain: { at: 5, age: "Glass Marsh" }, living_mist: { at: 6, age: "Salt Court" }, ceiling_sea: { at: 7, age: "Sunken Stair" } }, label: "MEMORIES / the chamber: one orb per wonder seen" },
    { h: 21, t: 3.1, env: {}, pages: [], view: "lounge", wonders: { breathing_mirrors: { at: 1, age: "Ash Tower" }, mosaic: { at: 2, age: "Pale Garden" }, day_aurora: { at: 3, age: "Ember Row" }, ringed_ground: { at: 4, age: "Moth Hall" }, petal_rain: { at: 5, age: "Glass Marsh" }, living_mist: { at: 6, age: "Salt Court" }, ceiling_sea: { at: 7, age: "Sunken Stair" } }, label: "LOUNGE / the orb near the ceiling leads to the chamber" },
    { h: 20.6, t: 70, env: {}, pages: ["page_comets", "page_islets", "page_calendar"], view: "global", label: "GLOBAL dusk / comet" },
    { h: 15, t: 3.1, env: {}, pages: ["page_telescope", "page_mountain", "page_pine_trees", "page_koi"], label: "ISLAND day / observatory on the mountain" },
    { h: 21.5, t: 3.1, env: {}, pages: ["page_telescope", "page_mountain", "page_waterfall"], label: "ISLAND dusk / observatory on the mountain" },
    { h: 21.5, t: 3.1, env: {}, zero: true, pages: ["page_telescope", "page_mountain", "page_dni_clock", "page_calendar", "page_dock"], label: "ISLAND dusk / D'ni clock and calendar pinnacle" },
    { h: 15, t: 3.1, env: {}, zero: true, pages: ["page_dni_clock", "page_calendar", "page_islets", "page_dock"], view: "global", label: "GLOBAL day / D'ni clock" },
    { h: 23, t: 3.1, env: {}, zero: true, now: 1791591000000, pages: ["page_castle", "page_calendar", "page_dock"], view: "calendar", label: "CALENDAR castle night / the stele's crockets on the arch, joined D'ni numerals, the red moon" },
    { h: 23, t: 3.1, env: {}, zero: true, now: 1791591000000, pages: ["page_calendar", "page_dock"], view: "calendar", label: "CALENDAR night / joined D'ni numerals" },
    { h: 21.5, t: 3.1, env: {}, zero: true, now: 1791591000000, pages: ["page_dni_clock", "page_calendar", "page_dock"], view: "clock", label: "CLOCK dusk / the armillary sphere up close, calendar pinnacle far off" },
    { h: 13, t: 3.1, env: {}, zero: true, now: "tahvo+1s", pages: ["page_dni_clock"], view: "clock", label: "CLOCK day / one second after a new tahvo: its digit glows" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", step2: "near", label: "TELESCOPE step 2 / an Age's book on the lectern, wheels near its clues" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", step2: "located", label: "TELESCOPE step 2 / the Age's star charted" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", step2: "far", label: "TELESCOPE far world / a whole beat late: the counter on 1, the marked stroke" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", step2: "located", hoverTip: /^The pulse comes/, label: "RAHNFEE / Delay wheel read in rahnfee, its words on hover" },
    { h: 14, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", step2: "located", hoverTip: /^Torahn, elevation \(above the plane reads negative\); below/, label: "RAHNFEE / day: Star of the Age plate, distance in rahnfee" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "starmap", step3: "map", hoverFrac: true, label: "RAHNFEE / star chart tooltip, distance along the beam" },
    { h: 15, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain", "page_imager"], view: "imager", step2: "imager", two: "Glass Marsh and Ash Tower sound well together: a third apart, beyond an octave.", label: "IMAGER two voices / the ♪♪ plate under the lectern, the accord on its ribbon" },
    { h: 15, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain", "page_imager"], view: "imager", step2: "imager", label: "IMAGER step 2 / sync micrometer, in sync: local time and KIPS" },
    { h: 15, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain", "page_imager"], view: "imager", step2: "imager", lens: true, label: "IMAGER lens hint / off by a few notches" },
    { h: 15, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain", "page_imager"], view: "imager", step2: "imager", cry: true, label: "IMAGER crystals / two right (lit), a decoy, an empty socket" },
    { h: 15, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain", "page_imager"], view: "imager", step2: "imager-off", label: "IMAGER step 2 / star charted, not yet in sync" },
    { h: 15, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain", "page_imager"], view: "imager", unwritten: "en", label: "IMAGER guild / a world no one has written, in the blank book (Transcribe)" },
    { h: 15, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain", "page_imager"], view: "imager", unwritten: "en", ghost: true, label: "IMAGER guild / the telescope holds a star: its glyphs show through the blank book, backwards" },
    { h: 15, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain", "page_imager"], view: "imager", unwritten: "fr", label: "IMAGEUR Guilde / un monde que personne n'a écrit, transcrit (FR)" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", step3: "bent", label: "TELESCOPE step 3 / black hole: the bent image, the pale true point" },
    { h: 22, t: 3.45, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", step3: "pulsar", label: "TELESCOPE step 3 / pulsar: a second, faster beat" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", step3: "oldline", label: "TELESCOPE step 3 / the old line (Me'erta) beside the true Zero" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "starmap", step3: "map", label: "STAR MAP / a constellation, a black hole, a pulsar" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "starmap", step3: "mapold", label: "STAR MAP / the old line: stars that miss the Zero" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "starmap", step3: "mapmoved0", label: "STAR MAP / today's stars: a rewritten Age only at its new star" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "starmap", step3: "mapmoved1", label: "STAR MAP / the wanderings of a rewritten Age" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", aim: "far", label: "TELESCOPE night / far" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", aim: [6, -3], at: 0.04, label: "METRONOME / easy: true pulse at its peak, pendulum at its extreme" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", step3: "oldline", at: 0.5, label: "METRONOME / guild: pendulum mid-swing, the old line drifting" },
    { h: 14, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", aim: [6, -3], at: 0.04, reduced: true, label: "METRONOME / day, reduced motion: pendulum at rest, beat lamp" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", aim: [14, -9], label: "TELESCOPE night / near (14, −9)" },
    { h: 14, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain"], view: "telescope", aim: [1, 0], found: true, label: "TELESCOPE day / found" },
    { h: 15, t: 3.3, env: {}, pages: ["page_koi", "page_cat", "page_pond_decor", "page_flowers"], view: "pondplus", label: "POND+ day" },
    { h: 21.5, t: 3.3, env: {}, pages: ["page_koi", "page_cat", "page_pond_decor", "page_flowers"], view: "pondplus", label: "POND+ dusk" },
    { h: 14, t: 3.3, env: {}, pages: ["page_koi", "page_cat", "page_cat_toys", "page_flowers"], tune: { color: "tabby", name: "Mochi" }, view: "cat", label: "CAT toys" },
    { h: 15, t: 3.1, env: {}, pages: ["page_chimney", "page_mountain", "page_waterfall", "page_koi", "page_cat", "page_stalk_tree", "page_bench", "page_pillars", "page_pine_trees", "page_flowers", "page_lanterns"], label: "ISLAND day / everything" },
    { h: 21.5, t: 3.1, env: {}, pages: ["page_chimney", "page_mountain", "page_waterfall", "page_koi", "page_cat", "page_stalk_tree", "page_bench", "page_pillars", "page_pine_trees", "page_flowers", "page_lanterns"], label: "ISLAND dusk / everything" },
    { h: 21, t: 3.3, env: {}, pages: ["page_mountain", "page_waterfall", "page_koi", "page_cat", "page_flowers"], view: "pond", label: "POND dusk" },
    { h: 14, t: 3.3, env: {}, pages: ["page_koi", "page_cat", "page_flowers"], tune: { color: "black", name: "Petit Loup" }, view: "cat", label: "CAT day" },
    { h: 15, t: 3.3, env: {}, pages: ["page_pine_trees", "page_maples", "page_ponderosa", "page_crystal_tree", "page_birches", "page_stalk_tree", "page_flowers", "page_butterflies", "page_grass"], view: "grove", label: "GROVE day" },
    { h: 14, t: 3.3, env: {}, pages: ["page_chimney"], view: "lounge", label: "LOUNGE day / the kitchen, the sofa, the Relto book on its pedestal" },
    { h: 22.5, t: 3.3, env: {}, pages: ["page_chimney"], view: "lounge", label: "LOUNGE night / the lantern, the stove, a candle by the book" },
    { h: 15, t: 3.3, env: {}, pages: ["page_chimney"], view: "lounge", tap: true, label: "LOUNGE tap open / the water runs into the sink" },
    { h: 22.5, t: 3.3, env: {}, pages: ["page_castle"], view: "lounge", label: "LOUNGE castle night / stone, velvet, the red moon" },
    { h: 14, t: 3.3, env: {}, pages: ["page_glasshouse"], view: "lounge", label: "LOUNGE glasshouse day / glass, copper, mosaic" },
    { h: 22, t: 3.3, env: {}, pages: ["page_castle", "page_telescope", "page_mountain", "page_chimney"], view: "cabin", label: "CABIN castle night / the door's pinacle behind the small bookcase" },
    { h: 20.5, t: 3.3, env: {}, pages: ["page_chimney", "page_koi", "page_cat"], view: "cabin", label: "CABIN dusk / chimney" },
    { h: 13, t: 2.1, env: {}, pages: [], view: "cabin", label: "CABIN day / cold hearth" },
    { h: 13, t: 2.1, env: {}, pages: ["page_imager", "page_telescope", "page_mountain"], view: "cabin", label: "CABIN / passages: the Imager on the table, the spyglass on the window sill (observatory)" },
    { h: 22, t: 3.3, env: {}, pages: ["page_telescope", "page_mountain", "page_imager"], view: "telescope", aim: [1, 0], found: true, label: "TELESCOPE / passages: the house lamp and the little Imager on the slit sill" },
    { h: 22, t: 2.6, env: {}, pages: [], view: "pillars", label: "PILLARS night" },
    { h: 14, t: 2.6, env: {}, pages: ["page_pine_trees", "page_koi", "page_cat", "page_flowers"], label: "ISLAND day / shelf moved inside" },
    { h: 15, t: 3.1, env: {}, pages: ["page_pine_trees", "page_birches", "page_ponderosa", "page_maples", "page_crystal_tree", "page_islets", "page_calendar", "page_dock"], hover: [548, 150], label: "ISLAND day / 5 essences + pont du calendrier" },
    { h: 15, t: 3.1, env: {}, pages: ["page_islets", "page_calendar", "page_dock", "page_bench", "page_pine_trees"], label: "ISLAND day / islets+calendar+dock+bench" },
    { h: 15, t: 3.1, env: {}, pages: ["page_islets", "page_calendar", "page_dock", "page_bench", "page_pine_trees", "page_koi", "page_cat"], view: "global", label: "GLOBAL day / islets+calendar" },
    { h: 21.5, t: 4.1, env: {}, pages: ["page_islets", "page_calendar", "page_moons", "page_ponderosa", "page_maples", "page_crystal_tree"], label: "ISLAND dusk / moons + trees" },
    { h: 21.5, t: 4.1, env: {}, pages: ["page_islets", "page_calendar", "page_moons", "page_storm"], view: "global", label: "GLOBAL dusk / storm" },
    { h: 13, t: 2.7, env: {}, pages: ["page_rain", "page_birds", "page_butterflies", "page_flowers", "page_grass"], label: "ISLAND day / rain birds butterflies flowers grass" },
    { h: 13, t: 2.7, env: {}, pages: [], view: "global", label: "GLOBAL base (aucune page)" },
    { h: 14, t: 3.7, env: {}, pages: ["page_pine_trees", "page_ferns", "page_koi", "page_cat"], label: "day / trees + koi + cat (rien ne masque)" },
    { h: 21, t: 6.2, env: {}, pages: ["page_pine_trees", "page_koi", "page_cat", "page_lanterns"], label: "dusk / trees + koi + cat" },
    { h: 14, t: 2.2, env: {}, pages: ["page_koi", "page_cat"], label: "day / koi + cat (orange)" },
    { h: 22, t: 5.1, env: {}, pages: ["page_koi", "page_cat"], tune: { color: "black", name: "Nuit" }, label: "night / koi + black cat" },
    { h: 11, t: 3.3, env: {}, pages: ["page_cat"], tune: { color: "calico", name: "Pixel" }, label: "day / calico cat" },
    { h: 11, t: 3.3, env: {}, pages: ["page_cat"], tune: { color: "siamese", name: "Lune" }, label: "day / siamese cat" },
    { h: 11, t: 3.3, env: {}, pages: ["page_koi"], tuneKoi: "platinum", label: "day / platinum koi" },
    { h: 11, t: 3.3, env: {}, pages: ["page_koi"], tuneKoi: "ghost", label: "day / ghost koi" },
    { h: 14, t: 2.2, env: {}, pages: ["page_gold", "page_silver", "page_gems"], label: "day / gold+silver+gems" },
    { h: 23, t: 4.4, env: {}, pages: ["page_gold", "page_silver", "page_gems"], label: "night / gold+silver+gems" },
    { h: 22, t: 3.1, env: {}, pages: ["page_chimney", "page_fireflies"], label: "night / chimney" },
    { h: 14, t: 5.2, env: {}, pages: ["page_chimney"], label: "day / chimney" },
    { h: 18.5, t: 7.7, env: {}, pages: ["page_chimney", "page_snow"], label: "dusk / chimney + snow" },
    { h: 22.5, t: 2.4, env: { surrounding: "ocean" }, pages: ["page_fireworks", "page_lanterns"], label: "night / ocean / fireworks t=2.4" },
    { h: 22.5, t: 6.3, env: { surrounding: "ocean" }, pages: ["page_fireworks"], label: "night / ocean / fireworks t=6.3" },
    { h: 23, t: 9.1, env: {}, pages: ["page_fireworks", "page_pillars"], label: "night / fireworks+pillars t=9.1" },
    { h: 11, env: { base_terrain: "mossy_plateau" }, pages: ["page_mountain", "page_pine_trees"], label: "day / mount+pines" },
    { h: 13, env: { base_terrain: "volcanic_plateau" }, pages: ["page_mountain"], label: "day / volcanic / mount only" },
    { h: 21.2, env: { base_terrain: "obsidian_plateau" }, pages: ["page_pillars", "page_mountain", "page_aurora"], label: "dusk-night / pillars+mountains+aurora" },
    { h: 6.8, env: { surrounding: "fog_sea" }, pages: ["page_mountain", "page_pillars", "page_mist"], label: "dawn / mountains+pillars+mist" },
    { h: 0.5, env: {}, pages: ["page_fireworks", "page_pillars", "page_fireflies"], label: "midnight / fireworks+pillars+fireflies" },
    { h: 15, env: { base_terrain: "glacier" }, pages: ["page_mountain", "page_snow"], label: "day / glacier / mountains+snow" },
  ];
  variants.forEach((v, i) => {
    const relto = M.parseRelto({ seed: 19991118, environment: v.env, structures: ["hut", "bookshelves", "linking_pillars"], relto_pages_active: v.pages });
    relto.zeroFound = !!v.zero; // l'horloge D'ni se débloque avec le Great Zero
    const pages = v.pages.map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md"));
    if (v.tune) for (const pg of pages) for (const a of pg.additions) if (a.type === "cat") Object.assign(a, v.tune);
    if (v.tuneKoi) for (const pg of pages) for (const a of pg.additions) if (a.type === "koi") a.rare = v.tuneKoi;
    const scene = M.buildScene(relto, pages, ages);
    if (v.oven) scene.structures = [...scene.structures, "oven"]; /* the machine lean-to */
    const c = document.createElement("canvas"); const d = document.createElement("div"); d.textContent = v.label; host.appendChild(d); host.appendChild(c);
    c.style.width = "640px"; document.body.appendChild(host);
    const r = new ReltoRenderer(c, dni, { tipDelay: 0, ...(v.oven ? { ovenState: () => OVEN_STATES[v.oven] } : {}), ...(v.cave ? { caveState: () => v.cave } : {}), ...(v.two ? { onTwoVoices: () => {} } : {}), ...(v.wonders ? { wonders: () => v.wonders } : {}), ...(v.reduced ? { reducedMotion: true } : v.unwritten ? unwrittenOpts(v.unwritten) : {}) }); r.setScene(scene); r.setHour(v.h); if (v.view) r.view = v.view; if (v.memSel) r.memSel = v.memSel; if (v.two) r.twoLine = { text: v.two, at: Date.now() }; if (v.tap) r.tapOn = true;
    if (v.now) { const DC = require("./dniclock"); if (v.now === "tahvo+1s") { const ms = 1791591000000, tv = DC.rings(ms).find((q) => q.key === "tahvo"); r.nowOverride = ms - tv.elapsed + 1000; } else r.nowOverride = v.now; } // l'horloge D'ni à un instant fixe
    if (v.ghost) ghostView(r); else if (v.unwritten) unwrittenView(r, v.unwritten);
    if (v.step2) step2(r, v.step2);
    if (v.cry && r.imager) { const C = r.imager.target.crystals, ok = C.options.indexOf(C.ids[0]), ok2 = C.options.indexOf(C.ids[2]), bad = C.options.findIndex((id) => !C.ids.includes(id)); r.imager.station = "cry"; r.imager.settings = { ...r.imager.settings, cry: [ok, bad, -1, ok2], lock: false }; } // les cristaux : deux justes (allumés), un leurre, un logement vide
    if (v.lens && r.imager) { r.imager.station = "lens"; const st = r.imager.settings; r.imager.settings = { ...st, r: Math.max(0, st.r - 5), b: Math.min(24, st.b + 2), iris: Math.min(24, st.iris + 4), lock: false }; } // aide aux lentilles
    if (v.step3) step3(r, v.step3);
    if (v.aim) { const TL = require("./relto-telescope"), st = TL.state(r), z = st.zero; st.aim = v.aim === "far" ? { torahn: (z.torahn + 30000) % 62500, elev: 0 } : { torahn: (z.torahn - v.aim[0] * 100 + 62500) % 62500, elev: z.elevation - v.aim[1] }; st.found = !!v.found; } if (v.at != null) r.nowOverride = require("./metronome").peakAt(1.29e9 + (v.step3 ? 9 : 0) + v.at); // un instant choisi dans le battement (0 : le sommet du vrai pouls)
    if (v.hover) r.hover = { x: v.hover[0] - 24, y: v.hover[1], w: 48, h: 48, tip: "Calendar pinnacle — Leevot 19" }; r.draw(v.t || 3.7);
    if (v.hoverTip || v.hoverFrac) { const h = r.hot.find((q) => (v.hoverFrac ? q.frac : v.hoverTip.test(q.tip || ""))); if (h) { r.hover = h; r.draw(v.t || 3.7); } } // le rahnfee : une infobulle ouverte
  });
}
/** Étape 2 du télescope : un Âge sur le lutrin (observatoire) ou dans l'Imageur, son étoile située, le micromètre synchronisé. */
function step2(r, mode) {
  const { analyseAgeBase } = require("./engine/analysis"), P = require("./physics/index"), { hooks } = require("./engine/hooks"), SS = require("./starsystem"), CAL = require("./calibration"), IM = require("./imager"), SKY = require("./sky"), G = require("./genscene"), TL = require("./relto-telescope"), T = require("./telescope");
  hooks.skip = (l) => P.isPhysicsLine(l) || SS.SYSTEM_RE.test(l);
  let src = "single_sun\norange_sun\nwater\nfern\nhills\nrotation: 30\nsystem: Kerath"; const name = "Glass Marsh";
  if (mode === "far") for (let i = 0; i < 300; i++) { const s2 = src.replace("Kerath", "Far" + i); if (SS.farBeats(SS.starKey(analyseAgeBase(s2, { seed: name }), s2, name))) { src = s2; break; } } // un monde lointain
  const a0 = analyseAgeBase(src, { seed: name }), a = P.applyPhysics(a0, P.physicsOf(a0, src, name), "easy");
  const sys = SS.systemOf(a, src, name), orbit = CAL.orbitOf(a, name, SKY.parseSky(src)), MET = require("./metronome"), now = mode === "far" ? MET.peakAt(Math.round(MET.beatPos(1.8e12) / MET.GORAHN) * MET.GORAHN) + 60 : 1.8e12; // le lointain : à un coup marqué
  r.nowOverride = now;
  const st = TL.state(r); st.found = true; st.at = { torahn: st.zero.torahn, elev: st.zero.elevation };
  const age = r.scene.ages[0], data = { target: IM.targetsOf(a, name), model: (() => { const S = G.sceneOf(a, name); return S ? G.build(S, 300, 176) : null; })(), system: sys, orbit };
  const c = sys.clue;
  if (mode === "far") { st.book = { idx: 0, age, data, loading: false }; st.dial = { torahn: c.torahn, elev: c.elevation, delay: c.delay, beats: 1 }; return; } // au coup marqué : le balancier doré, l'écho fort
  if (mode === "near" || mode === "located") {
    st.book = { idx: 0, age, data, loading: false };
    st.dial = mode === "near" ? { torahn: (c.torahn + 700) % T.TURN, elev: c.elevation - 3, delay: c.delay + 6 } : { torahn: c.torahn, elev: c.elevation, delay: c.delay };
    if (mode === "located") st.systems = { [sys.key]: SS.record(sys, st.zero, st.dial, now) };
    return;
  }
  st.systems = { [sys.key]: SS.record(sys, st.zero, { torahn: c.torahn, elev: c.elevation, delay: c.delay }, now) };
  const tg = data.target, set = IM.normalize({ pol: tg.pol, freq: tg.freq, amp: tg.amp, harm: tg.harm, phase: IM.phaseAt(tg, now) + 1, r: tg.lens.r, g: tg.lens.g, b: tg.lens.b, iris: tg.lens.iris, cry: tg.crystals.ids.map((id) => tg.crystals.options.indexOf(id)).concat([7, 6, 5, 4]).slice(0, 4),
    ...(mode === "imager" ? { sync: CAL.orbitAt(orbit, now), syncAt: now - 2 * 86400000, sysKey: sys.key } : { sync: CAL.orbitAt(orbit, now) + 2.5 }) });
  r.imager = { idx: 0, station: null, hand: null, age, target: data.target, model: data.model, view: !!data.model, settings: set, loading: null, empty: false, system: sys, orbit };
}

/** Mode Guilde : un monde que personne n'a écrit (src/unwritten.js), trouvé à l'aveugle, l'image formée dans le livre vierge. */
let UWD = null;
function unwrittenDeps() {
  if (UWD) return UWD;
  const { analyseAgeBase } = require("./engine/analysis"), P = require("./physics/index"), { hooks } = require("./engine/hooks"), SS = require("./starsystem"), SKY = require("./sky"), G = require("./genscene"), { describeAge } = require("./engine/prose");
  hooks.skip = (l) => P.isPhysicsLine(l) || SS.SYSTEM_RE.test(l) || SKY.DAY_RE.test(l);
  const A = (src, name) => { const a = analyseAgeBase(src, { seed: name }); return P.applyPhysics(a, P.physicsOf(a, src, name), "easy"); };
  UWD = { analyse: A, prose: describeAge, scene: (a, name, text) => { const S = G.sceneOf(a, name); if (!S) return null; Object.assign(S, SKY.parseSky(text)); return G.build(S, 300, 176); } };
  return UWD;
}
function unwrittenOpts(lang) {
  const UW = require("./unwritten"), { makeT } = require("./i18n");
  return { instrumentsMode: () => "guild", t: makeT(() => lang), unwrittenFind: (cry, s) => UW.find(cry, s, unwrittenDeps()) };
}
function ghostView(r) {
  const st = r.imagerState(); st.loading = null; st.sig = st.sig || "";
  st.cands = [{ age: { name: "Brume" }, data: { system: { key: "kerath" }, target: { crystals: { ids: ["water", "fern", "great_tree", "rain"] } } } }];
  r.imagerFind = () => { st.star = "kerath"; st.world = null; st.planet = false; st.target = null; };
  r.imagerFind();
}
function unwrittenView(r, lang) {
  const UW = require("./unwritten"), IM = require("./imager"), { rng } = require("./util"), now = 1.8e12;
  r.nowOverride = now;
  // des réglages à l'aveugle qui tombent sur un monde : de l'eau, des fougères, un ciel du jour
  const GLY = ["water", "fern", "great_tree", "wind", "rain", "fog", "single_sun", "steady_cycle", "stone", "sand", "vine", "moth", "lamp", "bridge"], q = rng(lang === "fr" ? 31 : 11);
  let hit = null;
  for (let i = 0; i < 6000 && !hit; i++) {
    const pool = GLY.slice(), cry = []; for (let j = 0; j < 4; j++) cry.push(pool.splice(Math.floor(q() * pool.length), 1)[0]);
    const st = UW.STARS[2 + Math.floor(q() * 5)], s = { r: st.rgb[0], g: st.rgb[1], b: st.rgb[2], iris: 7 + Math.floor(q() * 10), freq: 8 + Math.floor(q() * 10), amp: 8 + Math.floor(q() * 6) };
    if (!cry.includes("water")) continue;
    const w = UW.find(cry, s, unwrittenDeps()); if (w && w.data.model && w.unwritten.words) hit = { cry, s, w };
  }
  const st = r.imagerState(); st.loading = null; st.cands = []; st.sig = st.sig || "";
  const tg = hit.w.data.target;
  st.g = { ...st.g, cry: hit.cry.slice() };
  st.settings = IM.normalize({ ...hit.s, freq: tg.freq, amp: tg.amp, harm: tg.harm, pol: tg.pol, phase: IM.phaseAt(tg, now), r: tg.lens.r, g: tg.lens.g, b: tg.lens.b, iris: tg.lens.iris });
  r.imagerFind();
  if (lang === "fr") st.transcribed = { key: hit.w.unwritten.key, name: hit.w.unwritten.name };
  const T = require("./relto-imager").TRANSCRIBE;
  if (lang !== "fr") r.hover = { ...T, tip: r.imagerTr()("guild.transcribe.tip") }; // en français : sans infobulle, pour lire la légende sous le livre
}

/** Étape 3 : un système perturbé sur le lutrin, la ligne ancienne, la carte des étoiles (avec ou sans le piège). */
function step3(r, mode) {
  const SS = require("./starsystem"), PB = require("./perturbers"), TL = require("./relto-telescope"), T = require("./telescope");
  const now = 1.8e12; r.nowOverride = now; r.opts.instrumentsMode = "guild"; // l'Art de la Guilde : leurres, faux pouls, ligne ancienne
  const st = TL.state(r); st.found = true; st.at = { torahn: st.zero.torahn, elev: st.zero.elevation };
  const find = (f, pre) => { for (let i = 0; i < 5000; i++) { const k = pre + i, p = SS.placeSystem(k, []), fx = PB.effects(p.near, p.key, SS.delayOf(p.pos), SS.DELAY_MAX); if (f(p, fx)) return { key: p.key, pos: p.pos, near: p.near, fx }; } return null; };
  const full = (s) => ({ ...s, ...SS.perceive(s) });
  if (mode === "bent" || mode === "pulsar") {
    const s = full(find((p, fx) => (mode === "bent" ? fx.deflect && !fx.beat : fx.beat && fx.beat.kind === "pulsar" && !fx.deflect), "single_sun@v"));
    st.book = { idx: 0, age: r.scene.ages[0], data: { system: s }, loading: false };
    st.dial = mode === "bent" ? { torahn: (s.clue.torahn + (s.seen.torahn > s.clue.torahn ? 900 : -900) + T.TURN) % T.TURN, elev: s.clue.elevation + 3, delay: s.clue.delay } : { torahn: (s.clue.torahn + 300) % T.TURN, elev: s.clue.elevation - 2, delay: s.seen.delay + 3 };
    return;
  }
  if (mode === "oldline") { st.found = false; st.at = null; const o = st.old; st.aim = { torahn: (Math.round((st.zero.torahn + o.torahn) / 2 / 100) * 100) % T.TURN, elev: Math.round((st.zero.elevation + o.elevation) / 2) }; if (Math.abs(o.L) > 3000) st.aim.torahn = (st.zero.torahn + Math.sign(o.L) * 1500 + T.TURN) % T.TURN; return; }
  // la carte : des étoiles d'Ages du shelf, une perturbée par un trou noir, une par un pulsar
  const names = r.scene.ages.map((a) => a.name), systems = {}, add = (s, line, ages) => { const c = SS.zeroSeenFrom(s.pos); systems[s.key] = SS.record(s, st.zero, { torahn: c.torahn, elev: c.elevation, delay: c.delay }, now, { line, ages }); };
  const L = mode === "mapold" ? st.old.L : 0;
  add({ key: "a@sys:kerath", pos: SS.position("a@sys:kerath"), near: [] }, 0, names.slice(0, 2));
  add({ key: "b@x", pos: SS.position("b@x"), near: [] }, L, [names[2]]);
  add({ key: "c@x", pos: SS.position("c@x2"), near: [] }, L, [names[3]]);
  const bh = find((p, fx) => fx.deflect && !fx.beat, "single_sun@m"), ps = find((p, fx) => fx.beat && fx.beat.kind === "pulsar", "single_sun@n");
  add(bh, mode === "mapold" ? 0 : 0, [names[4]]); add(ps, L, [names[5], names[6]]);
  st.systems = systems; st.line = mode === "mapold" ? L : 0;
  if (/^mapmoved/.test(mode)) { // un Âge récrit a changé d'étoile : il est gravé à son ancienne étoile (a) et à la nouvelle (b)
    systems["b@x"] = { ...systems["b@x"], ages: [...systems["b@x"].ages, names[0]] };
    r.mapCur = { scene: r.scene, ready: true, map: new Map([[names[0], "b@x"], [names[1], "a@sys:kerath"], [names[2], "b@x"]]) };
    r.mapPage = mode === "mapmoved1" ? 1 : 0;
  }
}

module.exports = { renderMany };
