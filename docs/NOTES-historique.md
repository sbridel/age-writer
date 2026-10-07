# Age Writer 1.4 — couche d'extension

Relto, chiffres en base 25, page de garde, loi du Changement, effets de fenêtre, journal d'exploration, mécanismes, solitude, paysages sonores. Le tout est une **couche JavaScript** posée sur ton `main.js` 1.3.0 : le plugin d'origine n'est pas réécrit (les sources TypeScript n'étaient pas disponibles ici).

## Construire

```bash
node build.js chemin/vers/main.js dist
# → dist/main.js, dist/styles.css, dist/manifest.json (1.4.0)
```

`build.js` applique 5 retouches ancrées sur le code minifié (analyse, deux tirages, deux lecteurs de lignes) et récupère 9 identifiants internes. **Si une ancre manque ou apparaît deux fois, la construction s'arrête avec un message** : jamais de patch silencieux. Copier les trois fichiers dans `.obsidian/plugins/age-writer/`, recharger le plugin.

Tests : `node test/integration.js` (build + exécution dans jsdom avec un faux `obsidian`), `node test/law.test.js`, `node test/i18n.test.js`.

## Les chiffres (base 25)

Quatre niveaux, du plus fidèle au plus sûr (réglage *Chiffres* : auto / police / glyphes / dessinés) :

1. **Police installée** sur ton système (famille Dni, détectée) ou fichier `.ttf`/`.otf` dans le coffre (réglage *Police des chiffres*).
2. **Fichier de glyphes local** `dni-numerals.local.json` dans le dossier du plugin (produit par `extract_dni_numerals.py` depuis TA copie de la police).
3. **Dessinés** : cadre + unités 1–4 + cinq/dix/quinze/vingt, géométrie propre au plugin (rien de copié).

Licence de la police fan (« non-profit use only, all rights reserved ») : **aucun contour n'est dans le dépôt ni dans le build**. Les niveaux 1 et 2 ne marchent que chez quelqu'un qui possède déjà la police.

Où ça s'affiche : plaque dans le panneau (numéro d'Âge = hachage du nom mod 25⁴ ; coordonnées ; graine si `seed:` est écrit), plaque du Relto, énigmes, page de garde, pagination du journal. Bloc libre :

````
```dni
1999
Texte rendu dans la police si elle est là
```
````

## Le Relto

Une note avec `age_type: personal_hub`, puis un bloc `relto` n'importe où :

````
```relto
source: Ages/Relto      # facultatif
time: 21.5              # facultatif, sinon heure de l'ordinateur
```
````

```yaml
---
age_type: personal_hub
age_name: Relto
seed: 19991118
environment:
  base_terrain: volcanic_plateau   # mossy_plateau | sand_island | glacier | obsidian_plateau
  surrounding: cloud_sea           # fog_sea | ocean | void | lava_sea
  sky_cycle: system_time           # frozen_dawn | frozen_day | frozen_dusk | frozen_night
structures: [hut, bookshelves, linking_pillars]
relto_pages_active: [page_pine_trees, page_waterfall]
---
```

Une page = une note :

```yaml
---
relto_page_id: page_pine_trees
target_age: Relto
enabled: true
effects:
  canvas_additions:                # vegetation | waterfall | fireflies | lanterns | snow | aurora | mist
    - { type: vegetation, density: 0.7, asset: conifer }   # conifer | birch | palm | fern
  ambiance_audio: wind_in_pines    # wind | waterfall | river | soft_rain | night_crickets | deep_hum | fire_crackle | metal_chimes | thunder
unlock:                            # facultatif
  age: "[[Marais de verre]]"
  min_stability: 60
  ages_count: 3
---
```

États d'une page : **active**, **disponible** (déverrouillée mais pas listée → bouton *Attacher*), **verrouillée** (raison affichée), **désactivée**, **manquante**. Les Âges du coffre deviennent les livres de l'étagère (cliquables), colorés par stabilité. Curseur d'heure : ciel, soleil, lune, étoiles, reflets. Commandes : *Open the Relto*, *Create a Relto page*.

## Le reste

- **Loi du Changement** : une fois l'encre sèche (15 min sans changement, réglable), modifier un Âge coûte 0,06 par élément changé (plafond 0,30 par édition), guérison 0,05/jour. Avertissement : « La géométrie de l'Âge a été altérée. L'instabilité augmente. » (en/fr), ligne dans le panneau, jauge. Un renommage n'est pas une altération. S'ajoute comme un 6ᵉ axe `alteration` (le plus faible domine).
- **Instabilité visible** : sur la fenêtre de liaison, tremblements, ciel qui vire au violet/rouge, textures raturées, fissures, désaturation, selon la stabilité et les contradictions fortes. Contradiction forte → ligne « Fissure spatiale ». Modes : classique / statique / ondulation / balayage / aucun, intensité réglable. `prefers-reduced-motion` respecté.
- **Page de garde** : onglet *Couverture* dans la vue livre ; bordure octogonale à méandres, cartouche, anneau de glyphes, chiffres ; commande *Save the Age cover* (SVG).
- **Thème cuir** : cuir sombre, parchemin, coins en laiton avec rivets (réglage).
- **Journal d'exploration** : commande *Create the exploration journal for this Age* (voix Atrus / Gehn / Miller, en/fr) → bloc `age-journal` qui s'écrit au fil des notes qui renvoient vers l'Âge (extrait de chaque note, croquis de glyphe en marge, altérations, mécanismes).
- **Mécanismes** : écrire `dnie_mechanism: steam_powered_elevator` (ou `puzzle_type: sound_lock`) dans le bloc `age`. 11 mécanismes : ascenseur à vapeur, vanne, télescope, serrure sonore, réseau de fréquences, générateur à vapeur, imageur holofatique, planétaire, écluse, orgue à vent, réseau de lentilles. Chacun a un état (rouillé, envahi…) et une énigme (valeurs en chiffres, fréquences). Réglage *Mécanismes* : « dessinés » = l'Âge en invente selon son contenu.
- **Solitude** : pondère le tirage (ruines ×2,2, flore ×1,3, vent/brume plus fréquents, chasseurs ×0,5 ; « forte » : ruines ×3,5, chasseurs ×0,25). **Change les mondes tirés** par rapport à la 1.3 (réglage *Équilibrée* par défaut ; *Aucune* restitue l'ancien tirage).
- **Sons** : synthèse Web Audio (vent, pins, eau, cascade, pluie, bourdon, résonance métallique, feu, grillons, tonnerre), aucun fichier. **Démarre sur un clic** (bouton ♪).

## Limites à connaître

- **Jamais lancé dans Obsidian.** Testé : build sur une maquette fidèle des ancres, exécution dans jsdom avec un faux `obsidian`, rendus vérifiés dans Chromium, audio dans node-web-audio-api. À tester chez toi : mobile, thèmes clairs, vraies polices.
- Le vocabulaire « Relto », « D'ni » apparaît dans l'interface et les clés YAML : à trancher avec la règle « rien de Myst/Cyan dans le nom, l'identifiant, la description ». `manifest.json` reste neutre.
- Le disclaimer fan (README) reste à écrire ; `gifenc` (MIT) et Tracery : voir la reprise de contexte.

## Ajouts (1.4, suite)

- **Pages repliables** : l'en-tête « ▾ Pages · 8/8 » du Relto se clique pour masquer/afficher la liste ; l'état est mémorisé. Option de bloc : `pages: hide` (ou `show`) pour forcer l'état d'un bloc donné.
- **Texte D'ni** (seulement si une police est installée ; réglage *Noms en écriture D'ni*, actif par défaut) :
  nom du refuge dans l'en-tête du Relto, nom de l'Âge dans la plaque du panneau, titre du journal, couverture (déjà),
  `inscription: texte` dans un bloc `relto` (devise sous l'image), et `` `dni:texte` `` en ligne dans n'importe quelle note (vue de lecture uniquement, pas en Live Preview).
  Sans police, l'inscription et le texte en ligne s'affichent en italique latin : jamais de faux D'ni.

## Ajouts (1.4, saison 3)

- **Pages Relto custom** : bloc `relto-library`, une page par ligne : `page id: Label | effet densité [asset], … | audio=preset,preset | unlock=Âge:60`. Effets : vegetation, waterfall, fireflies, lanterns, snow, aurora, mist, fireworks, mountain (petit mont derrière la cabane), pillars, **chimney**. Nouvelles pages intégrées : feux d'artifice, mont, menhirs, **cheminée** (`page_chimney` : fumée dense, lueur de l'âtre, étincelles, fenêtre éclairée).
- **Refuge zen** : le son du Relto passe par `zenify` : 4 couches max parmi vent, pins, eau, cascade, pluie, bourdon (plafonné), nappe, carillon, **hearth** (feu de cheminée), grillons ; tonnerre→pluie, sifflement→vent, chœur→nappe, métal/pluck→carillon ; pulse, orgue, feux d'artifice et parasites supprimés ; nappe et carillon relevés (ils sont synthétisés très bas). Réglage *Ambiance zen du refuge* (actif).
- **Effet de fenêtre par Âge** : dans le bloc `age`, `fx: static|ripple|sweep|classic|tv|random|off` (aussi `window_fx:` / `link_fx:`). Prioritaire sur le réglage général. `random` = un effet choisi d'après le nom de l'Âge, toujours le même pour lui ; le réglage général propose aussi *Aléatoire (par Âge)*. La ligne est ignorée par le parseur (comme `mechanism:`).
- **Livres-pièges** (ni livre de retour, ni fissure) : la fenêtre vers eux est une **vieille télé** : image floue, noir et blanc, neige, bande qui roule, vignette ; le bouton « ♪ Écouter les parasites » joue la couche `static` (souffle à coupures, bourdonnement 50 Hz). `fx: off` sur l'Âge désactive ; `fx: tv` force l'effet ailleurs. Le bouton ♪ de l'Âge piégé ajoute aussi les parasites.
- **Liaisons incertaines** (réglage *Liaisons incertaines*, actif) : au-delà de 30 % d'instabilité (loi du changement incluse), l'image est coupée par des parasites de plus en plus souvent, et le lien « open ↗ » peut **vaciller** (échec, on réessaie, rafale de parasites) ou **glisser** vers un autre livre du même Âge : à 85 % d'instabilité environ 35 % de vacillements et 24 % d'égarements. Sain (< 30 %) : toujours fiable.
- Tests : `node test/zen.test.js` (zenify, tirage de liaison, `fx:`, page cheminée).

## Ajouts (1.4, saison 4)

- **Son du refuge** : réglage *Ambiance du refuge* = Minimal (nappe ou feu, ≤ 2 couches très légères, pas de cascade), Zen (≤ 4 couches douces, cascade plafonnée très bas), Complet. Menu de niveau + curseur de volume du refuge dans l'en-tête du Relto ; sur chaque page active : bouton ♪/🔇 et curseur de volume propres (mémorisés), appliqués en direct.
- **Livres affichés** (options du bloc `relto`, listes séparées par des virgules) : `folders: Ages/Mondes` (seulement ces dossiers), `exclude: Ages/Test` (jamais ceux-là), `books: Marsh, [[Tower]]` (liste blanche). Sans option : section repliable « Livres » avec cases à cocher, enregistrée dans la note du refuge (`relto_books`) ; « Tout afficher » l'efface. Les pages à déverrouillage comptent toujours tous les Âges, cachés ou non.
- **Livre-piège** (apparence normale tant qu'il n'est pas abîmé ; les parasites ne viennent que des dégâts) : écrire simplement la ligne `trap book` dans le bloc `age` (aussi `trap_book`, `trap: true`, `livre piège` ; `trap: false` l'annule). L'Âge n'a alors ni livre de retour (un `return:` éventuel est ignoré) ni fissure, quoi qu'il contienne ; la ligne est ignorée par le parseur.
- **Guérison** (réglage *Guérison par jour*, 0,05) : la Loi du changement ajoute de l'instabilité quand on modifie un Âge exploré ; chaque jour sans modification, cette instabilité ajoutée diminue de cette valeur (0,05 = 5 points de stabilité regagnés par jour). 0 = les dégâts sont définitifs.
- **Vue livre** : un clic sur la fenêtre de liaison (curseur main, halo au survol) se lie vers l'Âge visé, avec les mêmes règles que « open ↗ » (liaison incertaine comprise). Sons synthétisés : ouverture d'un livre (choc mat, cuir, pages) à l'ouverture de la vue, et son de liaison (souffle qui monte, accord de cristal, grave) à chaque liaison réussie, y compris depuis le Relto. Respecte le réglage *Ambiances sonores* et le volume.
- **Garde-fou son** : l'ambiance s'arrête toute seule si son bouton ♪ disparaît (changement de note, vue fermée, passage en édition) ou n'est plus visible (autre onglet) ; contrôle toutes les 0,7 s et à chaque changement de feuille. Le bloc Relto coupe aussi le son quand il est déchargé.
- **Livre abîmé** : dans le bloc `age`, `damaged_pages = 2` (pages abîmées : la liaison vacille plus souvent) et `removed_pages: 3` (pages arrachées : elle s'égare plus souvent) — `=` ou `:` au choix, `damage_pages` accepté comme ancien nom, lignes ignorées par le parseur. **N'altère que la liaison**, pas la stabilité de l'Âge : pénalité d'instabilité de liaison 0,08 par page abîmée et 0,15 par page arrachée (plafond 0,9), qui dégrade l'image de la fenêtre (parasites, coupures), déclenche le bouton « ♪ Écouter les parasites » dès 0,3 et pèse sur les jets de liaison. Le panneau affiche « Livre de liaison : n page(s) abîmée(s), m arrachée(s) ». Les parasites n'apparaissent plus d'office sur un livre-piège.
- **Son de liaison** (2ᵉ version, calée sur la dernière variante de l'enregistrement de référence, mesurée au spectrogramme) : montée en ~0,9 s, plateau jusqu'à ~2 s, décroissance jusqu'à ~4,8 s ; essaim grave de partiels serrés autour de 57 Hz et de leurs harmoniques (≈ 70 % de l'énergie sous 250 Hz), corps médian 250–600 Hz, souffle large très en retrait (≈ −23 dB), éclat vers 2,5 kHz à ~2 s, ronflement discret vers 380–415 Hz. Les écarts mesurés entre bandes et la forme de l'enveloppe suivent la référence à quelques dB près. Synthèse pure, aucun extrait de l'enregistrement.
- **Variantes du son de liaison** : 5 variantes (A–E) autour de la même idée, comme les enregistrements de référence — durées de 4,2 à 7,2 s, montée lente ou franche, filet de voix tardif (B), longue traîne grave (D), éclat clair marqué (E). Une variante est tirée au hasard à chaque liaison, jamais deux fois la même d'affilée, avec un léger jeu aléatoire (fondamental ±7 %, montée ±8 %, éclat) pour que deux lectures ne soient jamais identiques. Niveaux équilibrés (crête ≈ 0,9 pour toutes).

## Ajouts (1.4, saison 5)

- **Fenêtre génératrice** (`src/genscene.js`) : réglage *Rendu de la fenêtre* (classique / génératif) ou ligne `window_style: generative|classic` (aussi `render:`) dans le bloc `age`, prioritaire. Le descripteur de scène est refait côté extension (`sceneOf(analyse, nom)`, mêmes identifiants que le moteur), sans nouvelle ancre. Paysage tiré de la graine : teinte de ciel, 3 à 5 crêtes en bruit fractal (dunes, pics, volcans selon le monde), type d'arbre, nuages, météo. Dessiné dans un canvas intermédiaire que `LinkFx` utilise comme source ; `fx: off` garde le paysage sans effets. Sans analyse (fenêtre construite à partir d'un simple verdict) ou en export GIF : rendu du moteur.
- **Dégâts procéduraux** (`src/damagefx.js`) : `damaged_pages` → zones persistantes (décalage, séparation des couleurs, image figée, tache d'encre : le décalage de style propre au livre assure quatre styles pour quatre pages) ; `removed_pages` → trous aux bords déchirés dessinés après les teintes (visibles dans un Âge mourant) ; fractures ramifiées tirées de la graine, qui s'allongent avec l'instabilité (remplacent les polylignes fixes). Plafonds : 12 zones, 6 trous, 70 points par fracture. `fx: off` supprime zones et trous.
- **Blocs inconnus peints** (rendu génératif) : `sceneOf(analyse, nom, core.blocks)` ajoute `extras` (8 au plus) pour tout identifiant hors `KNOWN` ; axe et adjectifs lus dans le registre des blocs (axe tiré du nom, mots du nom, si absents). `traits()` : petit lexique anglais + hachage du mot pour les autres (teinte, luminosité, taille, vitesse, pulsation, arêtes). Un dessin par axe : astre à halo/anneau/orbite, dômes ou aiguilles, tiges à bulbe, voiles qui dérivent, lueurs et signes.
- **Profondeur, premier plan, détail** (rendu génératif) : brume d'horizon entre les crêtes ; `reflect()` retourne la moitié haute de l'image dans l'eau (une bande par ligne, ondulée, opacité décroissante ; 0,5 pour l'eau, 0,16 pour la glace) ; `foreground()` : rochers / branche / arche selon la graine (côté tiré aussi) ; `detail()` : pylône, anneau, escalier, antenne, piliers, posé au point le plus dégagé parmi 8 candidats (loin des ruines et des arbres), lumières visibles la nuit seulement.
- **Ciel étendu** (`src/sky.js`) : dix blocs de cosmologie ajoutés **dans le moteur** (3 ancres de plus dans `build.js`, vérifiées au build : liste `Q` des blocs de ciel, règles ciel↔vivant `gt`, banque de phrases `Si`) : `asteroid_belt` (0,07), `asteroid_field` (0,09), `planet_rings` (0,02), `comet` (0,04), `green_sun`/`red_sun`/`white_sun`/`blue_sun`/`orange_sun`/`violet_sun` (catégorie `hue` : modificateurs, le soleil reste implicite ; 0,02 à 0,05). Catégories hors cases du tirage (`Er`) : **jamais tirés au sort**, les mondes tirés ne changent pas. Contradictions : couleur × `starless` forte, couleur × autre couleur moyenne si un seul soleil, corps × `starless` légère ; règles ciel↔vivant : ceinture légère / champ moyen sur ruines et vivants, champ × pont forte, champ × eau légère. Le moteur les reconnaît partout (palette, glyphes de repli, phrases, validation). Données dans `sky.js` (blocs, règles, notes, phrases) injectées dans `__AGEX` à la construction.
- **Rendu des corps célestes** (`genscene.js`, rendu génératif) : ceinture (260 rocs en arc + voile de poussière, éclats), champ (7 blocs irréguliers qui tournent, une chute avec traînée et flash toutes les 40 s), planète à anneaux (moitié arrière / disque ombré / moitié avant), comète (passage de ~45 s toutes les 90 s), soleils colorés (disque, lueur et teinte du jour ; 2 couleurs pour 2 soleils). Mouvements lents sur une horloge continue (`clock`, secondes), pas sur la boucle de 8 s.
- **Jour et année** : lignes `day_length: n` (minutes réelles, 0,2–1440) et `year_length: n` (jours, 1–365) lues par `parseSky`, ignorées du parseur du moteur (`DAY_RE`/`YEAR_RE` dans `AGEX.skip`). `clockPhases` donne la phase du jour et la saison (−1…1) d'après l'horloge ; `paint(g, modèle, t, { day, season, clock })` ; la saison abaisse ou relève l'arc du soleil. Sans `day_length`, comportement inchangé (le jour boucle sur l'animation).
- Tests : `node test/gen.test.js` (493 vérifications : lecture du contenu, 60 scènes × 5 phases sans valeur infinie, déterminisme, plafonds, fractures bornées et croissantes, clé `window_style`) ; intégration : un canvas de paysage en plus avec `window_style: generative`, réglage général pris en compte. Rendus : `npm run visual` → `test/visual/out/gen.html` (12 paysages), `dmg.html` (dégâts).

## Corrections (revue du projet)

- **Son** : changer d'ambiance (Âge → Relto, ou une autre) coupait la nouvelle au bout de ~2 s (l'arrêt en fondu de l'ancienne s'appliquait à la nouvelle) — corrigé. Relancer vite (couper une page, changer de niveau) ne provoque plus d'erreurs ni de notes parasites. Les notes jouées ne s'accumulent plus en mémoire pendant une longue écoute. Une page réglée à 0 ne joue plus fort. Le curseur de volume du refuge enregistre bien sa valeur et n'agit que sur le son du refuge. Les effets ponctuels (livre, liaison, parasites) partagent un seul contexte audio au lieu d'en ouvrir un par clic.
- **Garde-fou du son** : il suit l'onglet et la note où le son a été lancé. Le son s'arrête si la note change, si l'onglet se ferme ou passe à l'arrière-plan ; il ne s'arrête plus quand le bloc est redessiné ou quand on fait défiler une longue note.
- **Fenêtres de liaison** : une fenêtre ne se fige plus quand on revient à elle après avoir fait défiler la note ; une erreur dans une fenêtre n'arrête plus toutes les autres ; l'effet télé floute l'image entière (et coûte beaucoup moins). Le panneau d'un Âge avec image GIF tient compte de son instabilité exacte et des pages abîmées.
- **Relto** : l'animation se met en pause hors de l'écran et quand Obsidian est en arrière-plan ; résolution du canvas plafonnée (moins de calcul). Le bouton « Créer » affiche aussitôt le refuge. « Tout masquer » et décocher le dernier livre n'affichent plus tous les livres (`relto_books: []` = aucun).
- **Bloc age** : `mechanism: Water Valve` ou `mechanism: water_valve, telescope` sont compris ; un mot isolé `trap` ou `trapped` ne transforme plus un Âge en piège (écrire `trap book` ou `trap: yes`) ; `damaged_pages` au-delà de 999 n'apparaît plus comme symbole inconnu (plafonné à 99).
- **relto-library** : `unlock=[[Dossier/Nom|alias]]:60` fonctionne (alias et chemin).
- **Chiffres D'ni** : un très grand nombre dans un bloc `dni` ne gèle plus Obsidian et s'affiche juste (calcul exact au-delà de 16 chiffres). Le réglage de police accepte un nom de famille installée ; vider le réglage revient bien à la police détectée ; la police n'est plus rechargée à chaque touche.
- **Divers** : le son de liaison joue aussi quand les liaisons incertaines sont désactivées ; le bruit de livre joue à chaque nouveau livre ouvert (pas seulement le premier) ; un Âge illisible ne vide plus l'étagère ; les guillemets doublés des messages de la loi du changement ont disparu ; une sauvegarde en attente n'est plus perdue quand on désactive le plugin.
- **Mondes-types** (`src/sky.js`, `WORLD_IDS`) : `frozen_world`, `lava_world`, `desert_world`, `ocean_world`, `jungle_world` (catégorie `world`, axe cosmologique, poids 0,02, jamais tirés). Contradictions mutuelles fortes ; règles monde↔matière dans `WORLD_CLASH` (gravités par bloc) et monde↔vie dans `WORLD_LIFE` ; une note par monde. `sceneOf` calcule `world` (`wd`) et force les drapeaux de décor (glace, lave+chaleur+cendres, sable+chaleur, eau, forêt+brume+pluie+lueurs) ; la banquise (`iceSheet`) et le givre de vitre (`frost`) sont dessinés dès que `ice` est vrai, y compris pour un Âge « Rime » écrit avec `water` + `deep_cold`. Tests : gen.test.js (drapeaux, 5 rendus distincts), integration.js (reconnaissance, stabilité, tensions, prose, jamais tirés). Correctif de test : la prose est tirée au sort, un seul texte par essai.
- **Richesses et cicatrices** (`src/wealth.js`) : 12 blocs de matière ajoutés dans le moteur par une 4e ancre (`blocs de matière` : `var ot=[…,...li]` reçoit `...__AGEX.matter`). Richesses (`gold` 0,09, `silver` 0,06, `gems` 0,07, `rare_ore` 0,08, `pearls` 0,05, `copper` 0,03) : axe géologique ; cicatrices (`scorched_surface`, `poisoned_air`, `barren_soil`, `bitter_water`, `hollowed_ground`, `ashen_sky`) : poids 0. Les poids négatifs du moteur (bibliothèque `weight=-0.03`) auraient suffi, mais sans plafond : la compensation est donc faite dans `adjust` (`applyAmounts`) : 0,03 par cicatrice, plafonnée à 75 % du coût des richesses écrites, sans effet sans richesse.
- **Quantités** (`src/amounts.js`) : lignes `many|much|lots|plenty|beaucoup` (×2), `few|little|peu` (×0,4), `normal` (×1) suivies d'une liste de groupes ou d'identifiants. `parseAmounts` (transporté par `parseSky` jusqu'au rendu), `factorOf` (bloc, puis groupe), `applyAmounts` : coût déplacé de `weight × (facteur − 1)` pour les blocs écrits à poids positif ; `AMOUNT_RE` est dans `skip`. Rendu : `build()` met à l'échelle ruines, arbres, gouttes, nuages, étoiles, lignes d'eau, vent, brume, lueurs, éclats de richesses.
- Rappel : la prose du moteur est tirée au sort ; un test qui vérifie une phrase doit calculer le texte une seule fois.
- **Taille de la fenêtre du bloc age** : réglage `windowSize` (normal / large par défaut / xl). `applyFx` pose `age-ext-vis-large|xl` sur le conteneur (sauf `key === "window"` : livres et Relto) ; `styles.ext.css` élargit `.age-panel__visual` et `.age-panel__window` ; le rendu génératif prend `gen.res` (320 / 440 / 560). Coût mesuré (Chromium sans GPU, scène très chargée) : 3,8 / 5,3 / 7,9 ms par image.
- **window_size / window_width** (ligne du bloc age, `SIZE_RE` dans sky.js, transportée par `parseSky` → `r.sky.size`) : prioritaire sur le réglage ; nombre = largeur en px (200–800), classe `age-ext-vis-custom` + variable CSS `--age-win-w`.
- **Heure D'ni dans le Relto** (`src/dnitime.js`) : `fromDate` convertit l'horloge (hahr = 31 556 925 216 ms ; 10 vailee × 29 yahr × 5 gahrtahvo × 25 × 25 × 25 prorahn par hahr ; repère 21 avril 1991 16 h 54 UTC = hahr 9647). Affichée dans l'en-tête du Relto (chiffres D'ni via `numberSvg`), mise à jour toutes les 1393 ms, masquable par `dni_time: off` ou le réglage `dniClock`. Yahr numérotés à partir de 1 (choix du plugin). Sources consultées : pymoul (DniTime), alahmnat/dni-date-converter (constantes) ; le code est réécrit, pas copié. Non fait : lumière de l'île sur le yahr (`dayPhase` est prêt).

