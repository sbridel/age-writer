"use strict";
// Guide intégré : une fenêtre à rubriques (et une note exportable). Contenu en français et en anglais.
// Blocs : { p: texte } | { code: texte } | { ul: [lignes] } | { h: sous-titre }
const GUIDE = {
  fr: [
    { id: "start", icon: "feather", title: "Écrire un Âge", body: [
      { p: "Un Âge est un monde décrit dans un bloc de code `age`, une page par ligne. Le plugin calcule le reste : description, stabilité, fenêtre de liaison, livre." },
      { code: "```age\nsingle_sun\nwater\nreturn: [[Hub]]\nlink: [[Sunder Reach]]\n```" },
      { h: "Lignes utiles" },
      { ul: ["`link: [[Note]]` : livre de liaison vers un autre Âge (autant que tu veux)", "`return: [[Note]]` : livre de retour", "`seed: 42` : change le tirage ; même note + même graine = même monde", "`panel: [[image.gif]]` : image de fenêtre à toi", "`trap book` : livre-piège (ni retour ni fissure)", "`cover: sober` : sobriété de la couverture (ornate, classic, sober, plain, ou 0 à 1)", "`window_style: generative`, `window_size: xl`, `fx: tv` : rendu de la fenêtre", "`many: ruins` / `few: rain` : quantités", "`damaged_pages = 2`, `removed_pages = 1` : livre abîmé"] },
      { p: "Ce que tu n'écris pas est tiré au sort, toujours de la même façon pour la même note. Les « pages » (single_sun, water, stone…) se choisissent aussi dans la palette de la vue livre." },
    ] },
    { id: "panel", icon: "layout-panel-top", title: "Le bloc Âge", body: [
      { p: "Sous le bloc, trois onglets pour ne pas tout montrer à la fois :" },
      { ul: ["**Texte & glyphes** : la description et les glyphes, avec une petite fenêtre de liaison centrée en compagnie", "**Fenêtre de liaison** : la grande fenêtre ; un clic joue le son de liaison", "**Détails** : le reste (stabilité, mécanismes, journal, bouton « Écouter l'Âge »…)"] },
      { p: "Désactivable : réglage « Onglets dans le bloc Âge » (Fenêtre de liaison)." },
      { p: "**Physique du monde** (onglet Détails) : chaque Âge reçoit une physique simplifiée (étoile, orbite, planète, noyau, air, eau, lumière), choisie pour tenir ce que tu as écrit. Si quelque chose ne tient pas, la fiche explique pourquoi et propose une ligne à écrire (`age: 3.5`) : un clic l'écrit dans le bloc. En mode facile (par défaut), la stabilité ne change pas ; en strict, ce qui ne tient pas coûte. Réglage : Âges & mécanismes › Physique des Âges." },
    ] },
    { id: "book", icon: "book-open", title: "Le livre", body: [
      { p: "Commande « Open this Age as a book » : le livre s'ouvre dans un onglet principal (ou une fenêtre, ou le panneau latéral : réglage « Ouvrir le livre dans »). Il s'ouvre toujours sur la **Couverture**." },
      { ul: ["**Couverture** : générée à partir de l'Âge (marbre, cuir, laiton). Sobriété réglable (réglage « Couvertures des livres » ou ligne `cover:`). « Enregistrer la couverture » l'exporte en SVG", "**Descriptive book** : les pages du monde ; ✓ garde une page tirée, × la retire ; la palette ajoute ou retire des pages", "**Linking book** : trois pages à droite (glyphes + texte, vitre de liaison, liens). Clique la page de droite pour avancer, celle de gauche pour reculer ; un petit bruit de page accompagne"] },
      { p: "Cliquer la vitre ou « open ↗ » t'emmène dans l'Âge visé (liaison parfois incertaine si le livre est abîmé)." },
    ] },
    { id: "relto", icon: "mountain", title: "Le Relto (refuge)", body: [
      { p: "Ton refuge : une île avec cabane, étagère de livres (tes Âges, cliquables), piliers de liaison. Crée-le avec « Create a Relto page » puis place un bloc `relto` dans une note." },
      { code: "```relto\ninscription: ma devise\n```" },
      { h: "Onglets" },
      { ul: ["**Vue** (œil) : l'image, avec l'heure et l'heure D'ni dessous. Cliquer la zone de l'heure la cache ; elle s'efface seule après quelques secondes, sauf si la souris passe dessus", "**Pages** (feuille) : les pages actives, disponibles, verrouillées ; les livres affichés sur l'étagère", "**Réglages** (engrenage) : heure du ciel, ambiance sonore, niveau et volume", "**Agrandir** : ouvre la **vue Relto** dans un onglet principal, image grande"] },
      { h: "Pages du Relto" },
      { p: "Chaque page ajoute un élément et une ambiance : pins, bouleaux, palmes, fougères, cascade, lucioles, lanternes, neige, aurore, feux d'artifice, montagne, menhirs, cheminée, brume, et, sous l'île : **gemmes, or, argent** (filons et cristaux dans la roche). « Nouvelle page » (onglet Pages) en crée une ; un bouton (globe) en coin de l'image bascule vers la **vue globale** du Relto (île, brume, îlots, pont) ; les pages *Rain*, *Storm*, *Birds*, *Butterflies*, *Moon & sun*, *Dock*, *Bench*, *Islets*, *Calendar pinnacle*, *Blue flowers*, *Grass*, *Ponderosa pines*, *Maples* et *Crystal tree* ajoutent leur élément ; deux pages ont des réglages dans leurs propriétés : **Cat** (`cat_name`, `cat_color` : black, white, orange, grey, cream, tabby, calico, tuxedo, siamese ou #rrggbb ; `cat_sleep` : auto, always, never — le soir, il dort sur le tapis de la cabane, près du feu) et **Koi pond** (`koi_rare` : ogon, platinum, ghost) ; on peut aussi écrire ses propres pages dans un bloc `relto-library`." },
      { code: "```relto-library\npage lagon: Lagon | vegetation 0.5 palm, gold 0.6 | audio=river\n```" },
      { p: "Choisir les livres affichés : lignes `folders:`, `exclude:`, `books:` du bloc, ou cases à cocher de l'onglet Pages." },
    ] },
    { id: "sound", icon: "volume-2", title: "Les sons", body: [
      { p: "Tout est synthétisé. Trois gestes, trois sons, chacun réglable :" },
      { ul: ["**Manipuler le livre** (ouvrir la vue livre) : « Son du livre » puis « Clics du fermoir »", "**Se déplacer dans l'Âge** (la note s'ouvre depuis le Relto ou le livre) ou **toucher une vitre** : « Son de liaison » (plusieurs variantes)", "**Tourner une page** du livre de liaison : « Pages tournées »"] },
      { p: "Quand le livre est déjà ouvert, cliquer une vitre ne rejoue que le son de liaison. Les ambiances (Relto, Âge) se lancent avec le bouton ♪." },
    ] },
    { id: "law", icon: "scale", title: "Loi du changement", body: [
      { p: "Écrire un Âge, c'est le fixer. Tant que l'encre est fraîche (15 minutes par défaut), tu peux le retoucher. Après, modifier le monde (ajouter ou retirer une page) l'abîme : son instabilité monte, puis redescend si on le laisse en paix. Espaces, sauts de ligne, majuscules ou renommage ne comptent pas." },
      { p: "Réglages : « Loi du changement », « Minutes avant que l'encre sèche », « Guérison par jour »." },
    ] },
    { id: "settings", icon: "settings", title: "Réglages et commandes", body: [
      { p: "Réglages du plugin, section « Extensions », en six rubriques : Livres & couvertures, Sons, Fenêtre de liaison, D'ni & chiffres, Âges & mécanismes, Dossiers." },
      { ul: ["Open this Age as a book", "Open the Relto / Open the Relto view (large)", "Create a Relto page", "Save this Age's book cover (SVG)", "Create the exploration journal for this Age", "Open the Age Writer guide (cette fenêtre)"] },
      { p: "Projet de fan, sans lien avec Cyan Worlds. Aucune ressource de Myst n'est fournie." },
    ] },
  ],
  en: [
    { id: "start", icon: "feather", title: "Writing an Age", body: [
      { p: "An Age is a world described in an `age` code block, one page per line. The plugin works out the rest: description, stability, linking window, book." },
      { code: "```age\nsingle_sun\nwater\nreturn: [[Hub]]\nlink: [[Sunder Reach]]\n```" },
      { h: "Useful lines" },
      { ul: ["`link: [[Note]]`: a linking book to another Age (as many as you like)", "`return: [[Note]]`: the way home", "`seed: 42`: changes the draw; same note + same seed = same world", "`panel: [[image.gif]]`: your own window image", "`trap book`: a trap (no return, no fissure)", "`cover: sober`: cover sobriety (ornate, classic, sober, plain, or 0 to 1)", "`window_style: generative`, `window_size: xl`, `fx: tv`: window rendering", "`many: ruins` / `few: rain`: quantities", "`damaged_pages = 2`, `removed_pages = 1`: a damaged book"] },
      { p: "Whatever you leave out is drawn at random, always the same way for the same note. Pages (single_sun, water, stone…) can also be picked from the book view palette." },
    ] },
    { id: "panel", icon: "layout-panel-top", title: "The Age block", body: [
      { p: "Three tabs under the block so it doesn't show everything at once:" },
      { ul: ["**Text & glyphs**: the description and glyphs, with a small linking window", "**Linking window**: the big window; a click plays the linking sound", "**Details**: the rest (stability, mechanisms, journal, “Listen to the Age”…)"] },
      { p: "Can be turned off: “Tabs in the Age block” (Linking window)." },
      { p: "**Physics of the world** (Details tab): every Age gets a simplified physics (star, orbit, planet, core, air, water, light), chosen to hold what you wrote. When something does not hold, the sheet explains why and suggests a line to write (`age: 3.5`): one click writes it into the block. In easy mode (the default), stability does not change; in strict mode, what does not hold costs. Setting: Ages & mechanisms › Physics of the Ages." },
    ] },
    { id: "book", icon: "book-open", title: "The book", body: [
      { p: "“Open this Age as a book”: opens in a main tab (or a window, or the side panel: “Open the book in”). It always opens on the **Cover**." },
      { ul: ["**Cover**: generated from the Age (marble, leather, brass). Sobriety adjustable (“Book covers” setting or a `cover:` line). “Save cover” exports an SVG", "**Descriptive book**: the world's pages; ✓ keeps a drawn page, × removes it; the palette adds or removes pages", "**Linking book**: three right-hand pages (glyphs + text, linking panel, links). Click the right page to go forward, the left page to go back; a page-turn rustle plays"] },
      { p: "Clicking the glass or “open ↗” takes you to the Age (the link can be unreliable if the book is damaged)." },
    ] },
    { id: "relto", icon: "mountain", title: "The Relto (refuge)", body: [
      { p: "Your refuge: an island with a hut, a bookshelf (your Ages, clickable) and linking pillars. Create it with “Create a Relto page”, then put a `relto` block in a note." },
      { code: "```relto\ninscription: my motto\n```" },
      { h: "Tabs" },
      { ul: ["**View** (eye): the image, with the time and the D'ni time below. Clicking the time hides it; it also fades by itself after a few seconds unless the mouse is over it", "**Pages** (sheet): active, available and locked pages; the books on the shelf", "**Settings** (cog): sky time, soundscape, level and volume", "**Expand**: opens the dedicated **Relto view** in a main tab, with a large image"] },
      { h: "Relto pages" },
      { p: "Each page adds an element and an ambience: pines, birches, palms, ferns, waterfall, fireflies, lanterns, snow, aurora, fireworks, mountain, pillars, chimney, mist and, under the island: **gems, gold, silver** (veins and crystals in the rock). “New page” (Pages tab) creates one; a globe button in the corner of the image switches to the **global view** of the Relto (island, mist, islets, bridge); the pages *Rain*, *Storm*, *Birds*, *Butterflies*, *Moon & sun*, *Dock*, *Bench*, *Islets*, *Calendar pinnacle*, *Blue flowers*, *Grass*, *Ponderosa pines*, *Maples* and *Crystal tree* add their element; two pages have settings in their properties: **Cat** (`cat_name`, `cat_color`: black, white, orange, grey, cream, tabby, calico, tuxedo, siamese or #rrggbb; `cat_sleep`: auto, always, never — in the evening it sleeps on the cabin rug, by the fire) and **Koi pond** (`koi_rare`: ogon, platinum, ghost); you can also write your own in a `relto-library` block." },
      { code: "```relto-library\npage lagoon: Lagoon | vegetation 0.5 palm, gold 0.6 | audio=river\n```" },
      { p: "Choose the books shown: `folders:`, `exclude:`, `books:` lines, or the checkboxes in the Pages tab." },
    ] },
    { id: "sound", icon: "volume-2", title: "Sounds", body: [
      { p: "Everything is synthesised. Three gestures, three sounds, each adjustable:" },
      { ul: ["**Handling the book** (the book view opens): “Book sound” then “Clasp clicks”", "**Moving into the Age** (the note opens from the Relto or the book) or **touching a glass**: “Linking sound” (several variants)", "**Turning a page** of the linking book: “Page turning”"] },
      { p: "When the book is already open, clicking a glass replays only the linking sound. Ambiences (Relto, Age) start with the ♪ button." },
    ] },
    { id: "law", icon: "scale", title: "Law of change", body: [
      { p: "Writing an Age fixes it. While the ink is fresh (15 minutes by default) you can edit freely. After that, changing the world (adding or removing a page) damages it: instability rises, then slowly heals if left alone. Whitespace, line breaks, capitals or renaming don't count." },
      { p: "Settings: “Law of change”, “Minutes before the ink dries”, “Healing per day”." },
    ] },
    { id: "settings", icon: "settings", title: "Settings & commands", body: [
      { p: "Plugin settings, “Extensions” section, in six pages: Books & covers, Sounds, Linking window, D'ni & numbers, Ages & mechanics, Folders." },
      { ul: ["Open this Age as a book", "Open the Relto / Open the Relto view (large)", "Create a Relto page", "Save this Age's book cover (SVG)", "Create the exploration journal for this Age", "Open the Age Writer guide (this window)"] },
      { p: "A fan project, unrelated to Cyan Worlds. No Myst asset is included." },
    ] },
  ],
};


// Référence complète (français) : toutes les lignes, tous les blocs connus, tous les réglages.
const REF_FR = [
  { id: "lines", icon: "list", title: "Lignes du bloc age", body: [
    { p: "Un bloc `age` contient une page par ligne (un identifiant de bloc) et des lignes spéciales. Les lignes spéciales sont ignorées par le moteur : elles ne comptent pas comme des pages." },
    { ul: [
      "`link: [[Note]]` : livre de liaison vers un autre Âge (plusieurs permis)",
      "`return: [[Note]]` : livre de retour (la voie pour rentrer)",
      "`panel: [[image]]` : image du panneau à la place de la fenêtre peinte",
      "`seed: 42` : change le tirage (même note + même graine = même monde)",
      "`mechanism: steam_powered_elevator` : mécanisme ; aussi `dnie_mechanism:`, `puzzle_type:`, ou une liste séparée par des virgules",
      "`fx: tv` : effet de fenêtre (classic, static, ripple, sweep, tv, random, off) ; aussi `window_fx:`, `link_fx:`",
      "`window_style: generative` (ou `classic`) : rendu de la fenêtre ; aussi `render:`",
      "`window_size: large` (normal, large, xl) ou `window_width: 520` (200 à 800 px)",
      "`day_length: 40` : minutes réelles par jour (0,2 à 1440), rendu génératif ; aussi `day:`",
      "`year_length: 12` : jours par année (1 à 365, demande `day_length`) ; aussi `year:`, `revolution:`",
      "`many: ruins, trees` / `few: rain` / `normal: water` : quantités ; aussi `much`, `lots`, `plenty`, `little`, `beaucoup:`, `peu:`",
      "`cover: sober` : sobriété de la couverture (ornate, classic, sober, plain, ou 0 à 1) ; aussi `couverture:`, `cover_style:`, `sobriety:`",
      "`trap book` : livre-piège (ni retour ni fissure) ; aussi `trap_book`, `trap: true`, `livre piège` ; `trap: false` annule",
      "`damaged_pages = 2` : pages abîmées de la liaison ; `removed_pages: 3` : pages arrachées"] },
    { p: "Un Âge peut aussi s'écrire en propriétés YAML (voir le Relto, onglet « Relto »)." },
  ] },
  { id: "blocks", icon: "layers", title: "Tous les blocs (pages)", body: [
    { p: "Pages que tu peux écrire, par axe de stabilité. Le tirage au sort complète ce que tu laisses ouvert." },
    { h: "Cosmologique" },
    { ul: ["Étoiles : `single_sun`, `twin_suns`, `starless`, `companion_moon`", "Cycle : `steady_cycle`, `erratic_cycle`, `frozen_cycle`", "Orbite : `stable_orbit`, `shifting_orbit`, `chaotic_orbit`, `close_binary_orbit`, `wide_binary_orbit`", "Phénomènes : `auroras`, `recurring_eclipses`, `permanent_veil`, `starfall`"] },
    { h: "Géologique" },
    { p: "`water`, `lava`, `stone`, `sand`, `salt`, `ash`, `iron`, `crystal`, `strange_stone`, `deep_cold`, `pressure`" },
    { p: "Voies de retour : `fissure`, `cave_fissure`, `submarine_fissure`, `no_fissure`" },
    { h: "Météo" },
    { p: "`wind`, `rain`, `fog`, `lightning`, `heat`" },
    { h: "Écologique" },
    { p: "Flore : `spore`, `seed`, `vine`, `fern`, `great_tree` ; faune : `moth`, `grazer`, `burrower`, `hunter`, `drifter`" },
    { h: "Métaphysique (ruines)" },
    { p: "`tablet`, `lamp`, `bridge`, `door`, `book`" },
    { h: "Produits de réactions (non écrits : ils naissent de combinaisons)" },
    { ul: ["Géologie : `obsidian`, `ice`, `glass`, `rust`, `brine`, `silt`, `diamond`, `humming_shard`, `crying_obsidian`, `whispering_obsidian`, `black_ice`, `singing_glass`, `living_rust`, `clouded_diamond`, `fulgurite`", "Météo : `storm`, `thunderstorm`, `marsh_mist`, `dust_storm`, `ash_cloud`, `hail`, `steam`, `rime`, `meltwater`, `spore_cloud`, `charged_crystal`, `whispering_storm`, `waiting_thunder`, `watching_mist`, `black_hail`", "Vie : `moss`, `lichen`, `pale_fungus`, `sapling`, `ironwood`, `cinderbloom`, `glowvine`, `withered_fern`, `charred_grove`, `grove`, `singing_lichen`, `wrong_glowvine`, `lantern_moths`, `herd`, `stalking_pack`, `warren`, `still_drifter`, `whispering_moths`, `watching_herd`, `humming_warren`, `wildfire`", "Ruines : `worn_tablet`, `lit_lamp`, `sealed_door`, `blurred_book`, `fallen_bridge`, `speaking_tablet`"] },
    { p: "Exemples de réactions : eau + lave → obsidienne ; obsidienne + sel → obsidienne qui pleure. Chaînes jusqu'à trois niveaux. `strange_stone` est un catalyseur qui donne des variantes rares." },
  ] },
  { id: "ext", icon: "sparkles", title: "Ciel étendu, mondes-types, richesses", body: [
    { p: "Blocs ajoutés par l'extension : ils comptent dans la stabilité, ont des contradictions et une description, apparaissent dans la palette du livre, mais ne sont **jamais tirés au sort** : tu les écris, ou ils n'existent pas." },
    { h: "Ciel" },
    { ul: ["`asteroid_belt` (−7) : ceinture de petits rocs en arc", "`asteroid_field` (−9) : gros blocs isolés, l'un tombe parfois", "`planet_rings` (−2) : planète à anneaux", "`comet` (−4) : comète à longue queue", "Soleils colorés (modificateurs, −2 à −5) : `green_sun`, `red_sun`, `white_sun`, `blue_sun`, `orange_sun`, `violet_sun` ; `black_sun` (−6) : soleil noir, une naine brune qui chauffe sans éclairer (jour gris et sombre, disque noir cerclé de rouge)"] },
    { p: "Contradictions : une ceinture ou un champ menacent ruines, arbres et eau ; un soleil coloré contredit `starless` et, avec un seul soleil, une autre couleur. Un champ pèse plus qu'une ceinture ; il tombe fort sur un pont." },
    { h: "Mondes-types (−2, ils imposent le décor génératif)" },
    { p: "`frozen_world`, `lava_world`, `desert_world`, `ocean_world`, `jungle_world`. Ils ne créent pas de matière : ils la dessinent. Deux mondes-types se contredisent fortement ; chacun heurte ses contraires (`frozen_world` avec `lava`, `lava_world` avec `ice`…)." },
    { h: "Richesses et cicatrices" },
    { ul: ["Richesses (coût sur l'axe géologique) : `gold` −9, `silver` −6, `gems` −7, `rare_ore` −8, `pearls` −5, `copper` −3", "Cicatrices (sans coût propre) : `scorched_surface`, `poisoned_air`, `barren_soil`, `bitter_water`, `hollowed_ground`, `ashen_sky`"] },
    { p: "Chaque cicatrice rachète 3 points du coût des richesses, jusqu'à 75 % de ce coût : un monde riche n'est jamais gratuit. Sans richesse, les cicatrices ne font rien." },
  ] },
  { id: "phys", icon: "atom", title: "Physique des Âges", body: [
    { p: "Sous les blocs, un petit monde physique : étoile, orbite, planète, chaleur interne, noyau, champ magnétique, air, température, eau, lumière. Ce n'est pas une simulation : des lois simplifiées, calées pour que la Terre, Mars, Vénus et la Lune tombent à peu près juste. Ce que le livre laisse ouvert est tiré de la graine, sous contraintes : le monde cherche une physique qui tient ce que tu as écrit (48 essais, toujours les mêmes pour la même graine)." },
    { h: "Modes (Réglages › Âges & mécanismes)" },
    { ul: ["**Facile** (défaut) : la fiche explique, la stabilité ne change jamais. Les mondes-types (`frozen_world`…) orientent le tirage.", "**Strict** : chaque tension coûte sur son axe (légère 10, moyenne 20, forte 35 points, au plus 45 par axe), multiplié par le curseur « Sévérité de la physique » (0,5 à 2). Les mondes-types n'orientent plus le tirage : ils sont seulement vérifiés.", "**Désactivée** : rien."] },
    { h: "Lignes de valeurs (toutes facultatives)" },
    { ul: ["`mass:` (`masse:`) Terre = 1 · `radius:` (`rayon:`)", "`age:` (`âge:`) en milliards d'années, `500 Ma` accepté", "`orbit:` (`orbite:`, `distance:`) en UA · `insolation:` (`flux:`) Terre = 1 · `star_mass:` (`masse_étoile:`) Soleil = 1", "`rotation:` en heures, `3 j` accepté", "`core:` (`noyau:`) `liquid` / `liquide`, `solid` / `figé`, `none`, ou part de fer 0 à 0,8", "`atmosphere:` (`atmosphère:`, `pression:`) `none`, `thin` / `mince`, `dense` / `épaisse`, ou des bars", "`water:` (`eau:`), `volatiles:`, `albedo:`, `tides:` (`marées:`)", "En nombres, la valeur est fixée ; en mots (`core: liquid`), c'est une affirmation que la physique vérifie. Ces lignes ne sont jamais des taches d'encre."] },
    { h: "Blocs de géophysique (jamais tirés au sort)" },
    { ul: ["`close_orbit` (−5) / `distant_orbit` (−5) : tout près de l'étoile ou loin d'elle (ils se contredisent)", "`young_world` (−6) / `ancient_world` (−4) : moins d'un milliard d'années, intérieur brûlant ; ou 7 à 12, intérieur refroidi (étoile durable exigée)", "`heavy_world` (−5) / `light_world` (−4) : super-Terre (gravité forte, montagnes basses) ou petit monde (gravité faible, air qui fuit)", "`molten_core` (−3) / `dead_core` (−4) : noyau en fusion (champ magnétique) ou mort", "`geysers` (−4) : sources chaudes, demandent eau et chaleur interne", "`rifts` (−5) : failles, plaques en mouvement : intérieur chaud, planète assez grande, eau liquide", "`thick_air` (−3) / `thin_air` (−4) : air épais (≥ 2 bar) ou mince", "`subsurface_ocean` (−4) : océan sous la glace, chauffé d'en bas", "`black_sun` (−6) : soleil noir, une naine brune ; presque toute sa lumière est infrarouge : jour gris et sombre, plantes presque noires, orbite très serrée"] },
    { h: "Couleurs de soleil" },
    { p: "`red_sun` : naine rouge (chauffe plus qu'elle n'éclaire, faces figées fréquentes) ; `orange_sun` ; `white_sun` ; `blue_sun` : étoile géante qui vit trop peu pour l'évolution ; `violet_sun` : étoile chaude riche en ultraviolets (il faut un air épais pour vivre à découvert) ; `green_sun` : étoile solaire à la lumière teintée (feuillages pourpres). Vert et violet n'existent pas pour de vraies étoiles : en strict, ils coûtent un peu d'Art (axe métaphysique)." },
    { h: "Bâtisseurs" },
    { p: "Les ruines (`tablet`, `door`, `bridge`, `lamp`, `book`…) disent que quelqu'un est passé : il a pu apporter ce que la nature n'aurait pas fait à temps (des arbres sous une étoile trop jeune). Elles n'excusent pas la vie impossible (sans lumière, sans air, à une température invivable)." },
    { p: "Le Relto est hors physique : c'est la zone sûre." },
  ] },
  { id: "amounts", icon: "gauge", title: "Quantités, jour et année", body: [
    { p: "Une ligne de quantité met à l'échelle ce qui est déjà écrit. Mots : `many` / `much` / `lots` / `plenty` / `beaucoup` (×2), `few` / `little` / `peu` (×0,4), `normal` (×1). Un bloc en grande quantité coûte le double de son poids, en petite quantité 40 %." },
    { p: "Cibles : groupes `ruins`, `trees`, `water`, `rain`, `fog`, `wind`, `clouds`, `stars`, `moths`, `glow`, `riches`, `scars` (et `ruines`, `arbres`, `eau`, `pluie`, `brume`, `vent`, `étoiles`, `nuages`, `richesses`, `cicatrices`), ou n'importe quel identifiant de bloc (`many: gold`). Une quantité ne crée rien." },
    { p: "`day_length` et `year_length` ne changent que le rendu génératif : le soleil suit l'horloge de l'ordinateur ; l'année fait varier sa hauteur selon la saison." },
  ] },
  { id: "stab", icon: "activity", title: "Stabilité et tirage", body: [
    { p: "Cinq axes : cosmologique, géologique, météo, écologique, métaphysique (plus l'axe `alteration` de la loi du changement). L'Âge prend la stabilité de son axe le plus faible : **≥ 75 % stable**, **40 à 74 % instable**, **< 40 % mourant**." },
    { ul: ["Tout ce que le livre laisse ouvert est tiré (onze cases : étoiles, jour, lune, phénomènes, sol, minéraux, météo, flore, faune, ruines, fissure)", "Même note + même `seed:` → même monde ; renommer la note change son monde", "Les valeurs ordinaires sortent plus souvent ; ce qui contredit ou déclenche une réaction violente est moins probable, jamais impossible (réglage du moteur « force du pli »)", "La fissure n'est pas garantie : sans livre de retour **et** sans fissure, l'Âge est un piège ; avec de l'eau, la fissure est sous-marine", "Réglage « Solitude » : pondère le tirage vers des mondes déserts (aucune / équilibrée / forte)"] },
  ] },
  { id: "window", icon: "app-window", title: "Fenêtre, effets, dégâts", body: [
    { p: "**Rendu** : `classic` (la fenêtre peinte du moteur) ou `generative` (un paysage tiré de la graine : ciel teinté, relief, végétation, météo, reflets, premier plan, un détail habité par Âge). Les blocs inconnus sont peints d'après leur axe et leurs adjectifs." },
    { p: "**Effets** (`fx:` ou réglage) : `classic` (tremblements, ciel qui vire, fractures selon l'instabilité), `static` (neige), `ripple`, `sweep`, `tv` (vieille télé), `random` (un effet par nom d'Âge), `off`. Intensité de 0,2 à 2 ; `prefers-reduced-motion` est respecté." },
    { p: "**Dégâts** (tirés de la graine du livre) : `damaged_pages` = zones décalées, séparation rouge/cyan, figées ou taches d'encre ; `removed_pages` = trous brûlés avec neige ; instabilité forte = fractures ramifiées. Jusqu'à 12 zones et 6 trous ; `fx: off` les supprime." },
    { p: "**Taille** : `window_size` (normal, large, xl) ou `window_width` en px ; le réglage « Taille de la fenêtre » sert par défaut." },
  ] },
  { id: "trap", icon: "triangle-alert", title: "Pièges, livres abîmés, liaisons", body: [
    { ul: ["**Livre-piège** : `trap book`. Ni retour (un `return:` est ignoré) ni fissure ; il a l'air normal", "**Livre abîmé** : `damaged_pages` (+0,08 d'instabilité de liaison chacune) et `removed_pages` (+0,15, plafond 0,9). Ne touche que la liaison, pas la stabilité de l'Âge. Dès 0,3 apparaît « Écouter les parasites »", "**Liaisons incertaines** (réglage) : au-delà de 30 % d'instabilité de liaison, « open ↗ » ou le clic sur la fenêtre peut vaciller (échec, on réessaie) ou glisser (on arrive dans un autre livre du même Âge). À 85 % : 35 % de vacillements et 24 % d'égarements"] },
  ] },
  { id: "relto2", icon: "mountain", title: "Relto : note, pages, options", body: [
    { h: "La note du refuge" },
    { code: "---\nage_type: personal_hub\nage_name: Relto\nseed: 19991118\nenvironment:\n  base_terrain: volcanic_plateau\n  surrounding: cloud_sea\n  sky_cycle: system_time\nstructures: [hut, bookshelves, linking_pillars]\nrelto_pages_active: [page_pine_trees, page_waterfall]\n---" },
    { ul: ["`base_terrain` : volcanic_plateau, mossy_plateau, sand_island, glacier, obsidian_plateau", "`surrounding` : cloud_sea, fog_sea, ocean, void, lava_sea", "`sky_cycle` : system_time, frozen_dawn, frozen_day, frozen_dusk, frozen_night"] },
    { h: "Options du bloc relto" },
    { ul: ["`source: Ages/Relto` : la note du refuge", "`time: 21.5` : heure fixe (sinon l'ordinateur)", "`inscription: texte` : devise sous l'image", "`dni_time: off` : masque l'heure D'ni", "`pages: hide` : replie la liste (mode sans onglets)", "`folders:`, `exclude:`, `books:` : choix des livres de l'étagère (listes séparées par des virgules)", "`relto_books` dans la note : liste enregistrée par les cases à cocher ; `[]` = aucun livre"] },
    { h: "Pages intégrées" },
    { p: "`page_pine_trees`, `page_birches`, `page_palms`, `page_ferns` (végétation : conifer, birch, palm, fern), `page_waterfall`, `page_fireflies`, `page_lanterns`, `page_snow`, `page_aurora`, `page_fireworks`, `page_mountain`, `page_pillars`, `page_chimney`, `page_mist`, et sous l'île : `page_gems`, `page_gold`, `page_silver`." },
    { p: "Types d'effets : vegetation, waterfall, fireflies, lanterns, snow, aurora, mist, fireworks, mountain, pillars, chimney, gems, gold, silver. Ambiances : wind, wind_in_pines, waterfall, river, soft_rain, night_crickets, deep_hum, fire_crackle, hearth, stone_choir, mountain_air, fireworks, metal_chimes, thunder." },
    { h: "Une page = une note" },
    { code: "---\nrelto_page_id: page_pine_trees\ntarget_age: Relto\nenabled: true\neffects:\n  canvas_additions:\n    - { type: vegetation, density: 0.7, asset: conifer }\n  ambiance_audio: wind_in_pines\nunlock:\n  age: \"[[Marais de verre]]\"\n  min_stability: 60\n  ages_count: 3\n---" },
    { p: "États : *active*, *disponible* (bouton Attacher), *verrouillée* (raison affichée), *désactivée*, *manquante*. Bloc `relto-library` : une page par ligne, `page lagon: Lagon | vegetation 0.5 palm, gold 0.6 | audio=river | unlock=[[Marais de verre]]:60`." },
    { h: "Heure D'ni" },
    { p: "Calculée d'après l'horloge de l'ordinateur : année (hahr), mois (vailee), jour (yahr), puis gahrtahvo : tahvo : gorahn : prorahn, en chiffres D'ni. Un prorahn dure environ 1,39 s." },
  ] },
  { id: "dni", icon: "languages", title: "Chiffres et texte D'ni", body: [
    { p: "Nombres en base 25 (numéro d'Âge, coordonnées, graine, énigmes). Réglage « Chiffres » : auto, police, glyphes, dessinés. Niveaux : police installée (famille « Dni ») ou fichier .ttf/.otf du coffre ; fichier de glyphes local `dni-numerals.local.json` ; chiffres dessinés par le plugin (toujours disponibles)." },
    { p: "La police fan n'est ni fournie ni embarquée. Texte D'ni (réglage « Noms en écriture D'ni », police requise) : nom du refuge, plaque d'Âge, titre du journal, couverture, `inscription:`, et `` `dni:texte` `` en ligne. Bloc libre ```` ```dni ````. Sans police : italique latin, jamais de faux D'ni." },
  ] },
  { id: "mech", icon: "cog", title: "Mécanismes et solitude", body: [
    { p: "Onze mécanismes : `steam_powered_elevator`, `water_valve`, `telescope`, `sound_lock`, `frequency_array`, `steam_generator`, `holofatic_imager`, `orrery`, `tide_gate`, `wind_organ`, `lens_array`. Chacun a un état (rouillé, envahi…) et une énigme. Réglage « Mécanismes » : dessinés (l'Âge en invente) ou écrits seulement." },
    { p: "Solitude : aucune (tirage de la 1.3), équilibrée (ruines ×2,2, flore ×1,3, chasseurs ×0,5), forte (ruines ×3,5, chasseurs ×0,25). Changer ce réglage change les mondes tirés pour les cases ouvertes." },
  ] },
  { id: "journal", icon: "notebook-pen", title: "Journal, couverture, cuir", body: [
    { ul: ["**Journal** : commande « Create the exploration journal for this Age » ; un bloc `age-journal` s'écrit au fil des notes qui renvoient à l'Âge. Voix : Atrus, Gehn, Miller (anglais ou français). Dossier réglable", "**Couverture** : onglet du livre, procédurale (marbre, cuir, laiton, glyphes, médaillon), de la plus ornée à la plus nue ; export SVG", "**Thème cuir** : cuir sombre, parchemin, coins en laiton"] },
  ] },
  { id: "snd2", icon: "volume-2", title: "Sons en détail", body: [
    { ul: ["**Livre** : choc mat, cuir, pages (« Son du livre »), puis 2 à 5 clics de fermoir (« Clics du fermoir »)", "**Liaison** : onze variantes (A à K) tirées au hasard, jamais la même deux fois de suite, avec jeu aléatoire de hauteur, glissando, trémolo, écho, accord", "**Page tournée** : froissement de papier synthétisé", "**Parasites** : souffle à coupures et bourdonnement 50 Hz", "**Ambiances** : vent, pins, eau, cascade, pluie, bourdon, résonance métallique, feu, grillons, tonnerre, nappe, carillon ; niveaux minimal / zen / complet", "**Garde-fou** : l'ambiance s'arrête si la note change, si l'onglet se ferme ou passe à l'arrière-plan ; elle continue quand on change d'onglet à l'intérieur du Relto"] },
  ] },
  { id: "lib", icon: "library", title: "Bibliothèque personnelle", body: [
    { code: "```age-library\nblock moonmilk: pale, thick, patient | geological\nproduct curd: soft, white, sour | geological\nreaction moonmilk + salt -> curd (soothing)\nvariant curd -> watching_curd with crystal\n```" },
    { p: "Réutiliser l'identifiant d'un bloc intégré le remplace. Un bloc `age-library` affiche en lecture les erreurs ligne par ligne. Commandes : créer une note de bibliothèque, copier le contenu intégré, recharger. Limite : les blocs de bibliothèque ne sont pas tirés au sort ; ils sont peints d'après leur axe et leurs adjectifs." },
  ] },
  { id: "setref", icon: "sliders-horizontal", title: "Tous les réglages", body: [
    { h: "Livres & couvertures" },
    { ul: ["Thème cuir (oui) · Onglet couverture (oui)", "Ouvrir le livre dans : onglet principal (défaut), fenêtre, panneau latéral", "À l'ouverture d'un livre : couverture (défaut) ou garder l'onglet", "Couvertures : auto, ornée, classique, sobre, nue", "Livre de liaison en 3 pages (oui)"] },
    { h: "Sons" },
    { ul: ["Sons (général) · Volume (0,35)", "Son du livre · Clics du fermoir · Pages tournées · Son de liaison (tous activés)", "Ambiance du refuge : minimal / zen (défaut) / complet · Volume du Relto (0,6)"] },
    { h: "Fenêtre de liaison" },
    { ul: ["Onglets dans le bloc Âge (oui)", "Rendu de la fenêtre : classique / génératif", "Taille : normale / grande (défaut) / très grande", "Effet : classique, statique, ondulation, balayage, aléatoire, aucun · Intensité 0,2 à 2", "Liaisons incertaines (oui)"] },
    { h: "D'ni & chiffres" },
    { ul: ["Langue des extensions : auto, English, Français", "Chiffres : auto / police / glyphes / dessinés · Police des chiffres (nom)", "Afficher les nombres · Noms en écriture D'ni", "Heure D'ni dans le Relto · Relto en onglets"] },
    { h: "Âges & mécanismes" },
    { ul: ["Loi du changement (oui) · Minutes avant que l'encre sèche (15, de 1 à 120) · Guérison par jour (0,05, de 0 à 0,3)", "Mécanismes : dessinés / écrits seulement · Solitude : aucune / équilibrée / forte"] },
    { h: "Dossiers" },
    { ul: ["Dossier des journaux (vide = à côté de la note de l'Âge) · Dossier du refuge (`Ages`)"] },
    { h: "Tirage & bibliothèque (réglages du moteur)" },
    { ul: ["Mise à jour automatique des propriétés · Fenêtre générée · Tirage des cases ouvertes · Force du pli · Dossier de bibliothèque · Image de panneau par défaut"] },
  ] },
  { id: "cmd", icon: "terminal", title: "Commandes et propriétés", body: [
    { ul: ["Update Age data in this note / in every note : écrit les propriétés calculées", "Generate the Age map (canvas) : carte des Âges liés (bleu = aller-retour, orange = sens unique)", "Save this Age's window as a GIF", "Open this Age as a book", "Create / Reload an Age library · Copy the built-in content into a library note", "Open the Relto · Open the Relto view (large) · Create a Relto page", "Save this Age's book cover (SVG)", "Create the exploration journal for this Age", "Open the Age Writer guide"] },
    { p: "Propriétés écrites dans la note : `age_verdict`, `age_stability`, `age_axes`, `age_return`, `age_links`, `age_discovered`, `age_drawn`, `age_home` (utilisables avec Dataview ou Bases)." },
    { p: "Limites connues : mobile et thème clair non testés ; la loi du changement range son état par nom de note ; une note à plusieurs blocs `age` tire un monde par bloc ; pas de rivage (monde entièrement sur l'eau ou à sec) ; le contenu du moteur est en anglais ; pas d'export GIF en rendu génératif." },
  ] },
];

/** Niveaux du guide : « quick » (court) et « full » (référence complète, en français). */
const topics = (lang, level) => (level === "full" ? REF_FR : GUIDE[lang] || GUIDE.en);

/** Texte Markdown du guide (pour l'enregistrer dans une note). */
function toMarkdown(lang, level) {
  const out = [level === "full" ? "# Age Writer — Référence complète" : "# Age Writer — Guide", ""];
  for (const t of topics(lang, level)) {
    out.push("## " + t.title, "");
    for (const b of t.body) {
      if (b.p) out.push(b.p, ""); else if (b.h) out.push("### " + b.h, ""); else if (b.code) out.push("````", b.code, "````", ""); else if (b.ul) out.push(...b.ul.map((x) => "- " + x), "");
    }
  }
  return out.join("\n");
}

// `code` et **gras** → éléments DOM, sans innerHTML
function inline(el, text) {
  for (const part of String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (!part) continue;
    if (part.startsWith("**")) el.createEl("strong", { text: part.slice(2, -2) });
    else if (part[0] === "`") el.createEl("code", { text: part.slice(1, -1) });
    else el.appendText(part);
  }
}

/** Dessine une rubrique dans `host`. */
function renderTopic(host, topic) {
  host.empty();
  host.createEl("h2", { text: topic.title });
  for (const b of topic.body) {
    if (b.p) inline(host.createEl("p"), b.p);
    else if (b.h) host.createEl("h4", { text: b.h });
    else if (b.code) host.createEl("pre", { cls: "age-guide__code" }).createEl("code", { text: b.code });
    else if (b.ul) { const ul = host.createEl("ul"); for (const x of b.ul) inline(ul.createEl("li"), x); }
  }
}

/** Ouvre le guide dans une fenêtre : niveau court ou référence complète, rubriques à gauche, texte à droite. */
function openGuide(plugin, topicId, level0) {
  const obs = require("obsidian"), lang = plugin.lang(), fr = lang === "fr";
  class GuideModal extends obs.Modal {
    onOpen() {
      const { contentEl, modalEl } = this; contentEl.empty(); modalEl.addClass("age-guide-modal");
      let level = level0 === "full" ? "full" : "quick";
      const tabs = contentEl.createDiv({ cls: "age-guide__levels" }), root = contentEl.createDiv({ cls: "age-guide" });
      const nav = root.createDiv({ cls: "age-guide__nav" }), main = root.createDiv({ cls: "age-guide__main" });
      const body = main.createDiv({ cls: "age-guide__body" }), foot = main.createDiv({ cls: "age-guide__foot" });
      const lv = { quick: tabs.createEl("button", { text: fr ? "Guide court" : "Quick guide", cls: "age-guide__level" }), full: tabs.createEl("button", { text: fr ? "Référence complète" : "Full reference (French)", cls: "age-guide__level" }) };
      const draw = (id) => {
        const list = topics(lang, level), rows = {}; nav.empty();
        for (const k of Object.keys(lv)) lv[k].toggleClass("is-active", k === level);
        const show = (tid) => { const t = list.find((x) => x.id === tid) || list[0]; for (const [k, r] of Object.entries(rows)) r.toggleClass("is-active", k === t.id); renderTopic(body, t); body.scrollTop = 0; };
        for (const t of list) {
          const r = nav.createDiv({ cls: "age-guide__item" }); rows[t.id] = r;
          try { obs.setIcon(r.createSpan({ cls: "age-guide__icon" }), t.icon); } catch (e) { /* ignore */ }
          r.createSpan({ text: t.title }); r.addEventListener("click", () => show(t.id));
        }
        show(id);
      };
      for (const k of Object.keys(lv)) lv[k].addEventListener("click", () => { level = k; draw(); });
      foot.createEl("button", { text: fr ? "Enregistrer en note" : "Save as a note" }).addEventListener("click", async () => {
        const path = level === "full" ? "Age Writer — Référence.md" : "Age Writer — Guide.md", ex = plugin.app.vault.getAbstractFileByPath(path);
        const f = ex || await plugin.app.vault.create(path, toMarkdown(lang, level));
        new obs.Notice(fr ? "Enregistré : " + path : "Saved: " + path); this.close(); plugin.app.workspace.getLeaf("tab").openFile(f);
      });
      draw(topicId);
    }
    onClose() { this.contentEl.empty(); }
  }
  new GuideModal(plugin.app).open();
}

module.exports = { GUIDE, topics, toMarkdown, renderTopic, openGuide };
