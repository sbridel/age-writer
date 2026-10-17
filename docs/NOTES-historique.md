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


## 1.15.3 — mondes-types et décompte des contradictions (8 oct. 2026)

- **Bug** : `src/sky.js` (`WORLD_CLASH`) rangeait 14 tensions des mondes-types sur l'axe `"meteorological"`, inconnu du moteur (qui dit `"weather"`). Le coût tombait dans un axe inexistant (`NaN`) et disparaissait : `desert_world` + `rain`, `frozen_world` + `heat`, `lava_world` + `deep_cold`… ne coûtaient rien. Corrigé (`"weather"`).
- **Décision de l'auteur : toutes les pénalités comptent.** `findContradictions` (`src/engine/rules.js`) ne gardait qu'une règle ciel ↔ matière par phrase de description (`note`) ; or toutes les règles d'un monde-type, d'une ceinture d'astéroïdes ou du ciel sans étoile partagent la même phrase : seule la première comptait. Désormais chaque règle compte. Option `{ onePerNote: true }` pour l'ancien décompte : **le tirage des pages** (`draw.js`, `clashCostFor`) l'utilise, pour que les mondes déjà tirés gardent exactement les mêmes pages. La description (`prose.js`) ne répète pas une phrase partagée.
- Effet mesuré sur 3 000 Âges (mondes-types, ciels étendus, matière) : pages tirées identiques (0 différence), rien d'autre ne change que la stabilité ; 346 Âges (11,5 %) changent de stabilité, en moyenne −9,8 points, 105 changent de verdict, au plus −76 points (beaucoup de règles cumulées, par ex. un champ d'astéroïdes au-dessus de nombreuses ruines). `tools/equiv.js` contre la 1.15.2 : 30 différences sur 600, toutes de stabilité (attendu).
- Test : `test/world-clash.test.js`.

## 1.16.0 — physique des Âges (8 oct. 2026, nuit ; branche `physique`)

- **Branchement** (`src/entry.js`) : `AGEX.skip` ignore les lignes de valeur lisibles (`isPhysicsLine` : `mass: 2`, `âge: 500 Ma`, `core: liquide` ; « water: partout » reste une ligne inconnue) ; `AGEX.adjust` → `applyPhysicsTo` (cache par mode, graine, symboles, texte ; 1 500 entrées) après loi, quantités, dégâts. Loi du changement et index (en facile) sans calcul physique (`{ physics: false }`). La loi oublie sans frais les anciennes lignes inconnues devenues physiques (option `ignored`).
- **Réglages** : `physics` (easy par défaut / strict / off), `physicsSeverity` (0,5–2, multiplie barème et plafond). Strict : les mondes-types n'orientent plus le tirage (seulement vérifiés).
- **Détails retravaillé** (`ui-extras.js`) : stabilité par axe en barres (remplace la ligne brute des coûts), physique du monde (chaîne des causes, fiche, pourquoi, ce qui ne tient pas), pistes cliquables (`writePhysicsLine` → `vault.process`, `physics/edit.js` : garde le mot de l'auteur, CRLF, encadrés).
- **Soleil noir** (`black_sun`) : naine brune 1 300–2 000 K, presque tout en infrarouge ; jour gris et sombre (fenêtre générative désaturée, disque noir cerclé de rouge), plantes noires (exemptées de la tension de lumière), orbite très serrée, marée. Glyphe dessiné.
- **Lumière des étoiles** : part visible et ultraviolette par intégration de Planck ; lumière au sol = flux × part visible ; exigence `uvShield` ; soleil violet = étoile chaude riche en UV ; vert = feuillages pourpres ; chaque étoile garde sa couleur ; verrouillage par marée automatique.
- **13 blocs de géophysique** (`src/geophys.js`, jamais tirés) : `close_orbit`, `distant_orbit`, `young_world`, `ancient_world`, `heavy_world`, `light_world` (ciel ; contradictions fortes deux à deux), `molten_core`, `dead_core`, `geysers`, `rifts`, `thick_air`, `thin_air`, `subsurface_ocean` (matière).
- Vérifié : 300 Âges identiques en facile et désactivé ; `equiv` contre la 1.15.3 : 0 différence ; deux relectures indépendantes (lois, code ; branchement) corrigées.

## 1.16.1 — descriptions sans redites, chat au coin du feu (8 oct. 2026, journée ; branche `textes`, issue de `physique`)

- **Prose** (`src/engine/prose.js`, réécrite autour des mêmes banques de phrases) : connecteurs par famille (monde, soleils, corps, orbite, temps, ceintures, phénomènes), tous adverbiaux (ils vont devant une proposition comme devant un groupe nominal ; « so » et « that » supprimés), jamais deux fois par description et jamais en écho d'un mot de la phrase ; lecture dans l'ordre monde → soleils → corps → orbite → temps → phénomènes ; deux images courtes parfois liées par « ; » ; une couleur de soleil remplace l'étoile unique ajoutée d'office ; réactions en quatre tournures (« A meets B and… », « Where A meets B, it… », « A, meeting B, … », « Against B, A … ») ; adjectifs à la première mention seulement, puis « the … », un adjectif ne sert qu'une fois ; ce qui ne réagit pas est regroupé par deux ou trois ; débuts de phrase répétés évités (notes des contradictions, note du tirage).
- **Reproductible** : graine = nom de la note (+ `seed:` + contenu) ; Tracery reçoit le générateur le temps d'une description (`setRng`), `Math.random` n'est plus touché. Appelants : panneau (`plugin.js`), livre (`book-view.js`), journal (`ui-extras.js`).
- Mesure (`node tools/prose-report.js 300`) : débuts de phrase répétés 55 % → 4 % des descriptions ; tournures de 4 mots répétées 66 % → 3 % ; « adj, adj nom verbe » 5,3 → 0,3 par description ; 132 → 110 mots. `tools/equiv.js --no-prose` contre la 1.16.0 : 0 différence (analyses, glyphes, SVG) ; la prose diffère partout (attendu). Test : `test/prose.test.js`.
- La prose reste **en anglais seulement** (aucune version française n'existait) ; une prose française serait un chantier à part (banques de phrases, accords).
- **Chat endormi** (`relto-render.js` `catAsleep`, `drawSleepingCat` ; `relto-rooms.js`) : le soir et la nuit (85 % avec l'âtre allumé, 50 % sans), parfois par pluie, orage ou neige (55 %), en fin d'après-midi près du feu (30 %), rarement en plein jour (6 %) ; tirage par demi-heure d'après la graine du Relto. Endormi, il disparaît de l'île et dort roulé en boule sur le tapis de la cabane (respiration, oreille qui frémit, queue enroulée, lueur de l'âtre, deux « z ») ; un clic : « purr… » et un ronron bref (`sound.purr`, fichier *Purr sound file* s'il est réglé) ; la vue « chat » mène à la cabane. `cat_sleep` (propriété de la page) / `sleep=` (bibliothèque) : auto, always, never. Sans cabane, il reste dehors. Paupières claires sur un pelage sombre.
- **Correctif** : l'étagère de la cabane dessinait un 4e rayon sur le plancher (y = 295), visible devant le tapis.
- **Rivages** (`src/genscene.js` : `shoreOf`, `buildShore`, `shoreLand`, `shoreEdge` ; demande de l'auteur : « ce qui rend la fenêtre unique ») : un Âge qui a de l'eau et de la terre (hors `ocean_world`, `frozen_world`, `desert_world`, `lava_world`) partage la bande du bas entre l'eau et une rive. Nature : lave (côte noire, bord rougeoyant, vapeur), sable (plage, sable mouillé), glace (banquise, glaçons), pierre/métal/ruines (rochers), plantes/bêtes (berge herbeuse, roseaux). Cadrage tiré de la graine : `side` 55 % (la rive sur un côté), `far` 25 % (rive lointaine sous l'horizon), `near` 20 % (on se tient sur la rive). Écume animée sur deux lignes, ombre de berge ; le reflet et la fissure sous-marine sont découpés à l'eau. Graine propre (`seed ^ 0x5407e`) : rien d'autre ne change dans l'image. Les Âges avec eau seule, ou terre seule, sont inchangés. Retiré des limites connues (README, guide). Tests dans `test/gen.test.js` (natures, trois cadrages, déterminisme, valeurs finies).
- **Premiers plans** (`genscene.js` : `foregroundWeights`, `buildForeground`, `foreground` ; remarque de l'auteur : « la branche revient trop souvent sans variation ») : 9 types au lieu de 3, tirés avec des poids qui suivent l'Âge (roseaux seulement près de l'eau, stalactites seulement s'il gèle, branches et feuilles avec des arbres, lianes en jungle ou dans le brouillard, colonne et arche avec des ruines, rochers sur sable ou lave, « rien » parfois). La branche est **générée** : ramification récursive depuis un bord (2 ou 3 rameaux par nœud, 4 niveaux), courbure et longueur tirées, les bouts bougent plus que la base ; style selon l'Âge (calcinée si brûlé, enneigée s'il gèle, feuillue en jungle, mousse pendante s'il y a du brouillard, sinon feuillue, aiguilles, nue ou en fleurs). Graine propre (`seed ^ 0xf06e`) : le reste de l'image ne bouge pas. Tests dans `gen.test.js` (neuf types, conditions, formes toutes différentes).
- **Correctif Relto** (remarque de l'auteur) : le ruisseau de la montagne passait par-dessus les arbres. `drawWaterfall(ctx, t, part)` en deux temps : le ruisseau (`stream`) est dessiné juste après la montagne, derrière les arbres ; les éclaboussures sur le bassin et la chute sous l'île (`fall`) restent devant.
- **Physique visible dans la fenêtre** (`genscene.js` : `physLook`, `blackbody` ; le monde vient de `analysis.physics.w`, présent en facile et strict) : couleur du soleil = corps noir à la température de l'étoile (si aucune couleur n'est écrite), taille du disque ∝ √L / T² / a (0,6 à 1,7 ×) ; air mince (P < 0,5 bar) : ciel assombri, étoiles de jour, plus de nuages sous 0,07 bar ; air épais (P > 1,5 bar) : ciel laiteux, brume sur le relief ; relief × g^-½ (0,6 à 1,55) ; verrouillage par marée : cycle figé si le cycle n'est pas écrit, soleil immobile à une hauteur et une place tirées de la graine (aussi pour `frozen_cycle`, qui le mettait toujours au ras de l'horizon) ; lumière au sol < 0,35 : jour terne ; surface > 45 °C : air qui tremble. Mesure sur 400 Âges : 18 % figés, 20 % d'air mince, 38 % d'air épais (dont une partie à peine visible). Tests dans `gen.test.js`.
- **Nuit propre à chaque Âge** (`genscene.js` : `buildNight`, `nightSky` ; graine `seed ^ 0x57a5`) : 2 à 4 constellations (4 à 7 étoiles plus brillantes, teinte chaude, froide ou blanche, reliées d'un trait très pâle une fois sur deux), une nébuleuse (35 %, couleurs mêlées en mode « lighter »), une bande d'étoiles inclinée (40 %) ; lunes : `companion_moon` = une, ligne `moons: N` / `lunes: N` (0 à 5, `sky.js` `MOONS_RE`, ignorée par le moteur via `AGEX.skip`), chaque lune avec sa taille, sa teinte, sa phase et sa vitesse ; en cycle figé, les lunes restent à leur place. Tests dans `gen.test.js` et `integration.js`.
- **Blocs `kelp`, `coral`, `acid`** (`src/sea.js`, nés de l'essai de l'Âge Ethanoic) : branchés dans le registre du moteur (poids 0,02 / 0,03 / 0,05 ; jamais tirés), phrases de présence, réactions de l'acide (pierre → `hollowed_ground`, fer → `rust`, eau → `bitter_water`, corail → `salt`, type corrosif), exigences physiques (varech : eau liquide, lumière, vie simple ; corail : en plus un climat chaud ; acide : volcanisme), dessin (`seaLife` : varech qui ondule depuis le fond, corail en branches, éventails ou boules, flaques d'acide qui bouillonnent et fument ; découpés à l'eau ou à la terre quand il y a un rivage). Guide (référence) complété.
- **Préparation de la publication** (`docs/PUBLICATION.md`) : `innerHTML` remplacé partout par `setMarkup` (DOMParser + nettoyage, `test/markup.test.js`) ; `manifest.json` racine synchronisé avec `package.json` au build et `versions.json` créé ; `NOTICE` et `LICENSES/` (gifenc MIT, Tracery Apache 2.0 / ISC) ; README « Licences et mentions » à jour. Restent : choix de la licence du projet, description du manifest, dépôt public, release et PR au catalogue.
- **Corrections après relecture indépendante** (rendu) : la lumière d'un monde figé suit la hauteur de son soleil immobile ; les lunes d'un monde figé se placent à l'opposé du soleil ; corail et flaques d'acide se placent près de la ligne d'eau, du bon côté (`seaSpot`, jamais découpés) ; pas de varech ni de corail sur la glace seule ; « peu d'étoiles » éteint bande et nébuleuse et pâlit les constellations ; `moons:` au-delà de 5 vaut 5 (au lieu d'être ignoré ou inconnu) ; la première lune garde son croissant d'avant.
- **Workflows GitHub** : `.github/workflows/release.yml` (montée de version sur `main` → build, tests, lint, attestation de provenance des trois fichiers si le dépôt est public, tag sans « v » et release avec la section du journal) et `.github/workflows/ci.yml` (tests sur chaque push hors `main` et chaque PR). Vérifiés en local sur un clone propre (`npm ci`, build, tests, lint, extraction des notes).

## 1.17.0 — l'Imageur du Relto : cristaux, lentilles, atmosphère (8 oct. 2026, journée ; branche `textes`)

- Idée de l'auteur, d'après la machine de l'Âge de Rime (remake de Myst) : une machine du Relto pour **voir** un Âge, avec un réglage complexe. Maquette jouable validée par l'auteur (« c'est trop bien »), puis ce chantier.
- **Modèle** (`src/imager.js`, pur, `test/imager.test.js`) : cibles tirées du ciel de l'Âge — fréquence = 12 + 6·log2(24 h / jour de l'Âge), amplitude = 12 + 4·log2(pression en bar), harmonique = 8 si aurores + 6 × champ magnétique (0 à 2), polarité = graine ; tout de 0 à 24 (chiffres D'ni). Phase : un tour (25) par jour de l'Âge, sur l'horloge réelle ; presque immobile pour un monde figé ; sauts toutes les deux heures pour un cycle erratique. Netteté = 1 − (2·Δf + 1,2·Δa + 0,8·Δh)/24 − 1,4·écart de phase, × 0,35 si la polarité est inversée. Sans physique (mode désactivé), des valeurs tirées des blocs (cycle, `thin_air`/`thick_air`, `dead_core`, `auroras`).
- **Sous-vue** (`src/relto-imager.js`, vue `imager` de `relto-render.js`, page `page_imager`, effet `imager`) : chambre de pierre froide avec une fente d'aurore, lutrin (livre ouvert avec la vue de l'Âge en miniature, ‹ › pour changer), écran des ondes, cristal hexagonal où la fenêtre générative de l'Âge apparaît (flou, saturation, teinte, neige et lignes selon la netteté ; peinte à l'heure de l'Âge), jauge à aiguille et voyant, levier, quatre molettes avec valeurs D'ni ; accès par le bouton de navigation ou l'appareil sur la table de la cabane. Données d'un Âge : `ui-relto.js` lit la note, l'analyse (physique comprise) et construit la scène ; réglages gardés par chemin dans `ext.imagerTunings`.
- **Son** (`sound.js` : `roomStart("imager")`, `imagerTune`) : deux bourdons graves dont l'écart suit le désaccord (battements de ~9 Hz au pire, aucun à l'accord), une quinte cristalline quand l'image tient ; mis à jour à chaque cran et une fois par seconde (la phase dérive).
- **Indices** (onglet Détails, `ui-extras.js`) : note de l'arpenteur (une phrase : hauteur, force, seconde voix, nord) et les trois valeurs fixes en chiffres D'ni ; jamais la phase.
- À venir : étape 2 (lentilles, couleur de l'étoile), étape 3 (cristaux, glyphes), autres vues (sous l'eau, de nuit, de près).
- **Étapes 2 et 3, et l'écran** (demande de l'auteur : « je voudrais que le rendu soit sur un écran, je ne comprends pas ce cube blanc ») : l'Âge apparaît sur un **écran** rectangulaire (cadre de laiton rivé, verre bombé, reflet, lignes de balayage), projeté par un petit cristal posé devant ; l'ancien cristal hexagonal disparaît. Trois plaques I / II / III choisissent le réglage (voyant allumé quand il est juste) ; l'instrument rond montre la rosace (I), le champ partagé (II) ou les ondes (III).
  - **I. Cristaux** (`crystalsOf`, `crystalScore`) : les pages écrites de l'Âge dans l'ordre du livre (`pageList`, quatre au plus ; à défaut, les premières tirées), huit choix (pages et leurres) mêlés par la graine ; un emplacement juste vaut 1, une bonne page mal placée 0,3. Faux : image dédoublée. Glyphes dessinés par le moteur, passés en images (`ui-relto.js`, `glyphImage`).
  - **II. Lentilles** (`lensOf`, `lensScore`) : couleur d'une couleur de soleil écrite, sinon corps noir à la température de l'étoile (naine brune 1 500 K ; sans étoile, lueur froide), ramenée à 0–24 (la plus forte composante à 24) ; iris = 12 − 5·log2(flux reçu). Justesse = 1 − Σ|Δ couleur|/40 − 0,7·|Δ iris|/24. Faux : image teintée (« multiply ») et assombrie.
  - Netteté finale = cristaux × lentilles × atmosphère ; le bourdon bat selon l'atmosphère, la quinte sonne quand le tout tient ; l'onglet Détails ajoute la lumière de l'étoile et les quatre valeurs des lentilles.
- **Une machine, pas des onglets ; le verrou ; le périscope** (demande de l'auteur : « le pupitre a 3 volets mais les boutons sont les mêmes, une fusion analogique/digital » ; « une fois un âge récupéré, un verrouillage pour le suivre, et différentes fenêtres pour explorer l'âge », réponse à la vue sous-marine) :
  - **Postes** (`relto-imager.js` réécrit) : vue d'ensemble (lutrin, écran, manivelle et levier du périscope, jauge, verrou, établi aux trois postes avec leur lampe) et trois **gros plans** (`st.station`), l'écran réduit en haut à droite, « reculer » en bas. I : **râtelier** de huit cristaux gravés et plaque à quatre logements (`imager.place` : prendre, poser, échanger ; un cristal n'est qu'à un endroit, `normalize` corrige les anciens réglages) ; II : **banc optique** — trois verres qui coulissent sur des rails à 25 crans (un clic = la valeur, `imager.set`), iris à lamelles et levier sur un arc, comparateur à deux demi-champs ; III : **régulateur** — tube cathodique (trace large du ciel, trace vive du réglage), inverseur, quatre boutons, voltmètre (l'atmosphère seule).
  - **Verrou** (`imager.toggleLock`, `canLock`, `effective`, seuil `LOCK_AT` = 0,9) : verrouillé, la phase suit le ciel (`effective` remplace la phase par `phaseAt`), les commandes ne bougent plus (`turn`, `set`, `place`), le livre porte une étiquette de laiton dans la cabane (« held by the Imager ») ; relâché, la phase reste celle du ciel à cet instant, le périscope revient de face. Lampe rouge / ambre / verte.
  - **Périscope** (`src/genviews.js`) : `heading(m0, k)` — quatre directions, chacune un décor tiré d'une graine dérivée, avec la palette, la lumière et l'heure de la vue de face (`m.sunFrom`, `m.noSun` : le soleil, les anneaux, la comète et les lunes ne se dessinent que de face) ; `paintZenith` — tout le ciel vu d'en dessous (étoiles, bande, nébuleuse, constellations, lunes, aurores en voiles, anneaux, ceinture, soleil près du centre s'il est haut, nuages, pluie qui tombe vers soi, éclairs, canopée s'il y a des arbres, lueurs du glowvine), tourné avec l'azimut ; `paintUnder` — sous la surface (ou sous la glace) : rayons, reflets sur le fond, varech en deux plans, corail en branches, éventails et cerveaux, creux d'acide et bulles jaunes, cheminées de lave, perles, éclats de richesses, ruine engloutie, ombre d'un chasseur, bancs de poissons (lumineux de nuit avec glowvine), neige marine, bulles, et la **fissure sous-marine** qui luit ; fond tiré de la graine et de la direction. `genscene.skyState` sorti de `paint` (même rendu, vérifié par `tools/equiv.js` et les tests). La vue glisse quand on tourne (de côté) ou qu'on incline (de haut en bas), 0,7 s, sauf mouvement réduit.
  - **Sons** (`sound.imagerSfx`) : verrou (choc et tintement), levier qui coince, cristal soulevé ou posé, verre qui glisse, cran, manivelle à cliquet, page.
  - Tests : `imager.test.js` (46), `relto-scenes.test.js` (101 : postes, râtelier, rails, verrou, suivi sur six heures, périscope, étiquette), `gen.test.js` (directions, zénith, sous l'eau).

- **Âge d'exemple et Âge au hasard** (demande de l'auteur : « comment tu mettrais un âge d'exemple ? une commande qui génère un âge random ? ») : `src/ageseed.js` (pur). `randomAge(seed, lang, {check, taken})` choisit un archétype (mer, deux soleils, glace, feu, vert) dont les pages ne se contredisent pas, 2 à 3 décors, une rareté une fois sur deux (lunes, aurores, varech, éclipses…), un nom tiré d'un petit lexique ; le moteur (`check`) écarte les tirages instables (jusqu'à 16 voisins) et `taken` les noms pris. Commande **Generate a random Age** (`entry.js`, `randomAge`, note dans le dossier du refuge, ouverte aussitôt). Premier lancement (`welcomeOnce`, drapeau `state.welcomed`) : note « Age Writer — Bienvenue » (Âge fait main : eau, sable, varech, deux lunes, aurores, pluie) + Notice avec bouton « Ouvrir » ; rien dans un coffre qui a déjà des Âges. Piège trouvé : le tirage du moteur ajoute des pages aux cases ouvertes selon le NOM de la note ; l'exemple écrit donc la météo (`rain`) pour rester stable sous les noms `…`, `… 2`, `… 3`. Tests : `ageseed.test.js` (3 000 vérifications : 600 graines, jamais de contradiction, stable avec le filtre, jamais mourant en physique stricte) + intégration (commande, bienvenue, coffre non vide).

- **Retouches après le premier essai de l'auteur (8 oct., soir)** : (1) le chiffre D'ni **12** s'affichait « " » : dans `FONT_CHARS` le 12 est le guillemet, et la police de l'auteur ne le dessine pas (le navigateur prend alors une police de secours) ; c'est la valeur de départ de tous les boutons de l'Imageur. `Dni.glyphMissing(v)` compare la largeur du caractère dans la police et dans `serif` / `sans-serif` : identique → absent → tracé procédural pour ce chiffre (canvas et SVG). (2) **Cadre blanc des zones cliquables** : réglage `hoverFrame`, désactivé par défaut (l'infobulle et le pointeur restent). (3) **Notes de l'arpenteur** (onglet Détails) : réglage `imagerNotes` = `full` / `words` (défaut : la phrase, sans chiffres) / `off`. (4) **Référence complète en anglais** : `src/guide-ref-en.js` (miroir de `REF_FR`, structure vérifiée par `test/polish.test.js`). Tests : `polish.test.js` (10).
- **Carnet de l'arpenteur** (demande de l'auteur : « un carnet dans la maison ») : un carnet à plat sur la table de la cabane (avec la page Imageur ; caché si les notes sont sur « Aucune »). Un clic ouvre `openSurveyorBook` (`relto-books.js`) : pour chaque Âge de l'étagère, ce que bourdonne son ciel en mots (+ les trois valeurs en chiffres D'ni si le réglage est « Complètes »). Test : cabane (zone `special: "surveyor"`, réglage off/words) dans `relto-scenes.test.js`.
- **Bourdon de l'Imageur adouci et réglable** (retour de l'auteur : « trop le bzzz ») : sinus, filtre à 380 Hz, gain 0,1, battements ≤ 4 Hz, presque effacé verrouillé (`imagerTune(k, total, locked)`) ; réglage `soundImagerHum` (section Sons) pour le couper (les sons ponctuels restent).
- **Plaque du bourdon dans la salle de l'Imageur** (demande de l'auteur) : sur la console en vue d'ensemble, en bas à droite dans les gros plans : haut-parleur (clic = couper/rétablir, réglage `soundImagerHum`), « − » / « + » (cinq crans, `imagerHumVol`, multiplie le volume de la salle). Zones `imager: { hum: { toggle | delta } }`, options `imagerHum` / `onImagerHum`. Test dans `relto-scenes.test.js`.

- **1.17.1 — première page du livre de liaison vide** (remarque de l'auteur sur un Âge au hasard) : cette page montre, à travers la vitre, l'Âge visé par un livre de liaison (`link:`) ; sans `link:` elle est vide. Les Âges au hasard reçoivent maintenant un `link: [[…]]` vers un Âge existant du coffre ; la page vide explique quoi faire (`leaf.none`) au lieu d'afficher « — » ; la note de bienvenue explique la ligne `link:`.
- **1.17.1 (suite)** : (a) sans livre de liaison, la première page du livre de liaison montre les **symboles de l'Âge lui-même** et sa première phrase (au lieu d'une page vide) ; (b) le **son du livre** ne se joue plus à chaque note : `noteHasAge` — seulement pour une note qui contient un bloc `age`.
- **Ordre des icônes du Relto** (demande de l'auteur) : globale, île, cabane, Imageur, puis piliers, bosquet, bassin, bassin de près, chat (`NAV` dans `ui-relto.js`).

- **1.17.2 — retours du contrôle automatique d'Obsidian** (avertissements seulement) : `eslint.config.js` → `eslint.config.mjs` (import ESM, plus de `require`) ; CSS : plus de `!important` (la spécificité suffit), plus de `:has` (classe `age-panel--stab` posée par `ui-extras`), plus de `display: contents` (chaque ligne de la jauge est sa propre grille), soulignement pointillé → bordure, barré ondulé → barré simple. Restent, volontairement : `clip-path` (coins du livre et du panneau) et ses masques — avertissement « partiellement pris en charge », fonctionne dans Obsidian.

## 1.17.4 — limites connues mises à jour (8 oct. 2026)

- README : section « Limites connues » simplifiée (ordinateur seulement, tests, état par nom de note, blocs multiples, export GIF, vocabulaire). Aucun changement de code.

## 1.17.5 — voix du journal (8 oct. 2026)

- Texte seulement : les voix du journal d'exploration sont décrites comme « inspirées de divers personnages des jeux » (README, guides) au lieu de nommer trois personnages. Les identifiants internes (`atrus`, `gehn`, `miller`) ne changent pas.

## 1.17.6 — politique de contenu de fans de Cyan (8 oct. 2026)

- Avertissement exact exigé par Cyan (point 5 de leur politique) affiché en tête des README, dans `NOTICE` et dans le guide ; mention « gratuit et non commercial ».
- README : l'ouverture décrit le plugin sans citer Myst ; le crédit à Myst/Mystcraft passe dans le bandeau d'hommage (point 10 : ne pas promouvoir avec l'IP de Cyan).

## 1.18.0 — terrains, rivières et lieux (8 oct. 2026)

- **Blocs de terrain** (`src/terrain.js`) : `plains`, `hills`, `mountains`, `canyon` règlent le nombre, la hauteur et l'allure des chaînes de la fenêtre générative ; `river`, `delta`, `lake`, `marsh` allument l'eau et le rivage (le marais ajoute de la brume). Ils se contredisent entre eux (plaines contre montagnes : forte) et jurent avec `desert_world` et `lava_world`. Dans le registre du ciel (axe cosmologique), jamais tirés au sort.
- **Lieux et habitants** (`src/places.js`) : `library`, `ruined_library`, `garden` (traces de bâtisseurs) et `spiders` (tisseuses de soie farouches devant la lumière, qui ont besoin de proies).
- Physique : exigences des nouveaux blocs (montagnes : tectonique ; rivière, delta, lac, marais : eau liquide ; collines, canyon, delta : érosion).
- Guide (EN/FR) et README à jour (107 blocs écrivables au lieu de 92) ; `test/terrain.test.js`.
- **Release automatique** : le titre est « version — description courte » (en-tête de cette section) et le corps est cette section seule, sans pied de page ; sans section, la liste des commits depuis la version précédente (`tools/release-notes.js`, `test/release-notes.test.js`).
- Les Âges existants ne changent pas : 600 Âges comparés à la 1.17.6, 0 différence.

## 1.18.1 — crevasses et fin des Âges (8 oct. 2026)

- **Crevasse** (`src/crevasse.js`) : la fissure n'est plus une ligne mais une faille aux bords dentelés, dont l'ouverture donne sur le vide étoilé (étoiles qui scintillent, voie lactée de biais, lèvres éclairées) ; bouche ovale dans le fond sous l'eau. Sous l'eau, la fissure n'apparaît plus que dans une direction du périscope sur quatre (au lieu des quatre).
- **Les fissures s'ouvrent avec le temps** : une fissure à l'air libre ou sous l'eau passe du fil de lumière à la crevasse en `fissureDays` jours (réglage, 7 par défaut, 0 = toujours ouverte) depuis la création du livre. Les fissures de grotte sont toujours des crevasses et n'ajoutent jamais d'instabilité.
- **Une fissure n'abîme qu'un monde déjà instable** (< 75) : jusqu'à 50 points retirés selon son ouverture. Un monde stable n'en souffre pas.
- **Condamnation, en demi-vie** : un monde instable consume sa marge de vie d'autant plus vite qu'il est instable (14 jours à 74 %, divisé par deux tous les 10 points ; quelques heures vers 10 %) et que la fissure est ouverte ; stable, la marge se reconstitue (elle double chaque jour). Marge épuisée : condamné, définitivement (« beyond repair »). Une absence ne compte que pour deux jours.
- **La fin d'un Âge en direct** : un Âge condamné s'effondre et propose « Brûler le livre » (onglet Détails). La fin dure 30 secondes dans toutes les vues de l'Âge (livre, liaison, Imageur, sous l'eau, zénith) : la terre tremble, le sol se fend, le soleil devient supernova, tout blanchit puis noircit ; il reste le vide et des cendres. L'Âge est alors détruit : son livre ne se lie plus et sa couverture est calcinée (suie, bords rongés, braises).
- **Plein écran** : en mode « fenêtre séparée », le livre s'ouvre en onglet quand Obsidian est en plein écran (une fenêtre séparée restait invisible derrière).
- Tests : `law.test.js`, `gen.test.js`, `cover.test.js` complétés.

## 1.18.2 — livres visibles en plein écran (9 oct. 2026)

- **Plein écran du Relto** : le livre des glyphes, le carnet de l'arpenteur, le livre de la bibliothèque et les autres fenêtres modales étaient ouverts derrière le Relto, invisibles. Elles sont désormais déplacées dans l'élément plein écran juste après leur ouverture (`Modal.open` enveloppé au chargement, remis à l'arrêt) ; ouvrir une note depuis ces livres quitte d'abord le plein écran.
- Tests : `test/fullscreen.test.js`.

## 1.18.3 — l'altération suit les valeurs physiques (9 oct. 2026)

- **Les valeurs physiques altèrent l'Âge en proportion du changement** (`physChange` dans `src/law.js`) : une fois l'encre sèche, changer `rotation: 24` en `rotation: 500` coûte plus que 24 → 30. Le coût se mesure sur l'étendue permise de la valeur (échelle logarithmique pour celles qui s'étalent sur des ordres de grandeur) : 0,6 pour toute l'étendue, borné à 0,3 par modification ; écrire ou effacer une ligne coûte un élément (0,06) ; un changement inférieur à 0,5 % ne compte pas et ne déplace pas la référence. La valeur de départ d'un ancien état sert de référence, sans frais.
- **Une ligne de valeur commencée** (`spin :` en cours de frappe) n'est plus une ligne inconnue : elle ne coûtait pas seulement une valeur, elle comptait deux fois (apparue, puis retirée) — 12 % pour une frappe.
- **Notes de l'arpenteur** : « mots seulement » n'affiche plus les valeurs D'ni dans l'onglet Détails (la classe qui les cachait n'avait pas de règle CSS) ; les valeurs ne sont créées qu'en mode « complètes ».
- **Le livre des pages** (`src/relto-pagebook.js`) : un grand livre ouvert posé sur la table de la cabane (la table s'élargit) ; un clic l'ouvre en gros plan (vue `book`). Chaque page est le dessin à l'encre de ce qu'elle ajoute à l'île (6 par page, 12 par double page, flèches pour tourner) ; page éclairée avec un sceau rouge = attachée, pâle = disponible, cadenas = verrouillée (raison dans l'infobulle). Un clic attache ou détache (`relto_pages_active`), l'île change en direct.
- Tests : `law.test.js`, `physics.test.js`, `relto-scenes.test.js`.

## 1.19.0 — météo vivante, observatoire et Great Zero (10 oct. 2026)

- **Référence intégrée refaite** (EN/FR) : quatre parties (Réglages / Ce que tu écris / Ce que l'Âge génère seul / Relto), les trois sortes de lignes avec un exemple chacune, un tableau des valeurs physiques (valeur type et sens), la référence française dans `src/guide-ref-fr.js` ; `test/reference.test.js` vérifie que chaque bloc écrivable y est cité.
- **Météo vivante** (`src/weather.js`) : `rain: sometimes, dawn`, `drizzle: often, dawn`, `fog: 1/10, night` ; fréquence en mots, fraction ou pourcentage, moments du jour ; tirage reproductible (graine + jour), fondus avec le soleil de la fenêtre générative, une phrase dans la description. Nouveaux blocs `drizzle`, `snow`, `rainbow`, `tornado`, `flowers` ; produits `scented_mist`, `petal_rain`, `glaze`, `crystal_rain`, `ash_rain`, `acid_rain`. Pour la stabilité, une ligne programmée compte comme la ligne nue.
- **L'observatoire et le Great Zero** (`src/telescope.js`, `src/relto-telescope.js`) : page *Telescope* (premier Âge écrit + page *Montagnes*), un petit observatoire sur le sommet aplani. Chaque Relto cache son Great Zero ; on le cherche au pouls, en unités du GZCS (Torahn en torantee, élévation en shahfeetee, signe du KI), sans « chaud / froid » : le signal scintille d'un battement à l'autre et bat aussi à l'oreille. Commande *Forget the Great Zero (aim the telescope again)*.
- **L'horloge D'ni** (`src/dniclock.js`) : page débloquée par le Zéro, une sphère armillaire sur son pilier ; attachée, l'heure D'ni s'affiche et le calendrier se recale. Sans elle, la pierre-calendrier dérive de quelques yahr et l'heure se tait. La page *Dock* y mène par un pont de cordes.
- **Situer les Âges** (`src/starsystem.js`, `src/calibration.js`) : l'étoile de chaque Âge a une position GZCS (`system:` réunit des Âges) ; les notes de l'arpenteur disent d'où vient le pouls ; au lutrin de l'observatoire on situe l'étoile, puis la synchro de l'Imageur trouve la planète : image plus nette, heure locale, coordonnées KIPS. La calibration dérive après une semaine.
- **Étoiles mortes, ligne de Me'erta, carte** : `pulsar`, `neutron_star`, `black_hole` existent dans le ciel même non écrits (les écrire les décrit) ; faux battements, direction courbée, triangulation par balises. Une ligne ancienne peut piéger la calibration ; la carte des étoiles de l'observatoire le révèle. Sans champ magnétique, moins de mots de boussole et une dérive plus rapide.
- **Comètes dans le Relto** (effet `comet`, page `page_comets`) et **vrais glyphes** pour les 29 blocs de ciel étendu qui partageaient un hexagone générique.
- README (EN/FR) assainis : plus de version figée, historique laissé à ce journal, installation et syntaxe clarifiées.
- Les Âges existants gardent leur analyse, leurs pages et leur texte (600 Âges comparés à la 1.18.3 : seuls les glyphes du ciel étendu changent de dessin).

## 1.20.0 — l'Art de la Guilde : livre vierge, métronome, horloge D'ni (10 oct. 2026)

- **Deux façons de jouer les instruments** (réglage *Instruments*, `src/instruments.js`) : **facile** (défaut) — l'observatoire dit « Il s'avive / Il pâlit », le signal scintille peu, ni ligne de Me'erta ni faux pouls, les étoiles mortes brouillent seulement un peu l'image ; **l'Art de la Guilde** — le comportement de la 1.19, plus le livre vierge de l'Imageur.
- **Le métronome de l'observatoire** (`src/metronome.js`) : un balancier de laiton bat le prorahn ; le vrai pouls culmine quand il touche une butée, la ligne de Me'erta glisse contre lui, à l'œil et à l'oreille.
- **L'Imageur au livre vierge** (Art de la Guilde, `src/imager-guild.js`) : on ne choisit plus l'Âge. Le télescope tenu sur une étoile située envoie sa lumière au comparateur ; les cristaux (glyphes connus) verrouillent une planète et éveillent la station III ; quand l'image tient, le nom de l'Âge s'inscrit dans le livre.
- **Les mondes jamais écrits** (`src/unwritten.js`) : réglé à l'aveugle, le livre vierge forme parfois un monde que personne n'a écrit (reproductible selon les réglages) ; *Transcrire ce monde* en fait une note d'Âge.
- **L'horloge D'ni enrichie** (`src/relto-clock.js`) : quatre anneaux (vailee, yahr, gahrtahvo, tahvo) dont le chiffre luit quand il change ; vue rapprochée d'un clic sur la sphère, date et heure en chiffres D'ni.
- **Aide aux lentilles** (réglage, activé par défaut) : au banc optique, une ligne de mots dit quelle couleur est en trop ou manque et si le faisceau est trop vif ou trop sombre.
- **Correctif** : les coordonnées gravées des plaques *Great Zero* et *Star of the Age* ne débordent plus avec une police D'ni large.

## 1.20.1 — un banc optique redessiné (10 oct. 2026)

- **Banc optique de l'Imageur** (station II, `src/relto-imager.js`) : la lampe, à droite, envoie un rayon le long de chaque rail ; blanc jusqu'au verre, il prend ensuite la couleur du verre, d'autant plus vive que le verre est avancé. Les verres sont des disques teintés dans une monture de laiton, sur un chariot, leur valeur gravée dessous ; les rails sont gradués du sombre au saturé ; un prisme, à gauche, rassemble les trois rayons et envoie leur mélange au comparateur. Seul le dessin change.
- **Aide aux lentilles** : une seule ligne, sous le cadre de l'écran, resserrée si besoin ; elle ne déborde plus sur l'écran.

## 1.21.0 — le rahnfee, une unité du faisceau (10 oct. 2026)

- **Le rahnfee** (`src/beam.js`) : la longueur que parcourt le pouls du Great Zero le long du faisceau en un prorahn, 25³ = 15 625 shahfeetee de faisceau (pluriel *rahnfeetee*). Unité de fan, bâtie sur le prorahn et le shahfee, pas un mot D'ni attesté ; aucune conversion en kilomètres.
- **Notation sans virgule** (`src/dni.js`) : chaque place (25ᵉ, 625ᵉ, 15 625ᵉ de rahnfee) est gravée dans sa propre lucarne, comme les cadrans d'un instrument d'arpenteur ; un entier non nul se grave nu devant. Les instruments le disent aussi en mots (« environ un demi-battement »).
- **La molette du retard** lit en rahnfee, comme un retard sur le métronome ; mêmes mécanismes et tolérances.
- **Distances en rahnfee** : plaque *Star of the Age* (deux lignes), plaque *Great Zero* (nouvelle ligne : la distance du Zéro), distance KIPS (onglet Détails, Imageur), notes complètes de l'arpenteur, infobulles de la carte stellaire. Les élévations restent en shahfeetee ; les données enregistrées ne changent pas.
- Légende KIPS de l'Imageur raccourcie.

## 1.22.0 — des fils à plomb sur la carte des étoiles (10 oct. 2026)

- **Les hauteurs sur la carte des étoiles** (`src/relto-starmap.js`, `fit3` dans `src/starmap.js`) : le plan du Great Zero est vu de biais, comme une table ; chaque étoile, étoile morte et le Relto pend à un fil à plomb depuis son pied sur le plan, plein au-dessus, pointillé dessous. Les hauteurs ont leur propre échelle, gravée dans un coin (exagération déclarée, à la manière des coupes de cartographe) ; l'infobulle de chaque étoile dit sa hauteur en mots.
- Infobulles du télescope : plus de mention du KI (la convention de signe reste expliquée) ; celle de la plaque *Great Zero* nomme sa ligne de distance.

## 1.23.0 — un Relto fini (11 oct. 2026)

- **Les mondes lointains** (`src/starsystem.js`) : une étoile sur six est au-delà d'un rahnfee entier, son pouls arrive un battement plus tard ; un interrupteur à levier (0 / 1) à côté du retard ; une fois par gorahn le Great Zero frappe plus fort (coup doré du balancier). Facile : les notes le disent, un mauvais battement ne situe rien ; Guilde : l'étoile est gravée un rahnfee de travers et l'Imageur ne tient pas sa planète.
- **L'encre qui sèche** : fraîche, sombre et luisante, puis mate et brune en 15 minutes (livre, onglet *Texte & glyphes*).
- **`grass`**, et **`meadow`** ← `grass` + `flowers` (réaction ; `meadow` ne s'écrit pas).
- **Les cristaux de l'Imageur refaits** : un clic pose, un clic reprend ; un ensemble, l'ordre ne compte plus ; pages écrites complétées par les pages tirées, jusqu'à quatre ; teinte, forme et glyphe. Guilde : les quatre s'allument ensemble seulement s'ils sont tous justes ; une note par cristal, l'accord des quatre posé ou qui bat ; ♪ dans la note de l'arpenteur ; glyphes de l'étoile tenue en transparence dans le livre vierge.
- **Le Relto** : roue des vues (boussole) + bouton île + « vous êtes ici » ; passages par des objets (longue-vue, lampe de la maison, petit Imageur) ; plein écran depuis la note ; onglet Pages regroupé (sons réglés une fois chacun, pastilles de livres) ; réglages compacts ; `pages: hide` retire l'onglet ; fenêtre générative par défaut ; graine propre pour chaque nouveau Relto ; panneau de l'observatoire réordonné (plaque, molettes, filet, retard).
- **Renommer un Âge garde son monde** (`age_seed`) ; commande pour rendre son monde à un Âge renommé avant.
- **Carte des étoiles** : noms posés en dernier avec halo ; plus d'étoiles ni de noms d'Âges disparus ; commande *Clean the star chart*.
- **Correctifs** : périscope (fissure, tornade, arc-en-ciel, astres morts, ruines, structure : de face seulement), couronne du soleil noir derrière les crêtes, grotte redessinée, nom D'ni sous les icônes en panneau étroit.

## 1.24.0 — le mode histoire (11 oct. 2026)

- **Le mode histoire** (`src/story.js`) : un mentor, Adrin Vesparath, écrit de courtes lettres (EN/FR) et confie neuf chapitres, chacun avec une feuille de cours de la Guilde des Writers (qui s'efface en révision), trois niveaux d'indices et une récompense pour le Relto. Le Relto d'histoire vit dans son propre dossier, séparé du bac à sable ; le livre ne propose que les blocs appris. Commandes « Start the story » et « Story: … » (chapitre suivant, reprise, vérification, indices, réparation des notes).
- **Le livre des glyphes et le livre de la bibliothèque** sont de vrais livres sur le canevas (pages qui tournent, entrées déjà écrites, page blanche pour en ajouter sans quitter le Relto).
- **La référence complète et le README aérés**, avec une dernière partie « Spoilers » cachée derrière une case à cocher (absente de l'export en note).
- Infobulles des glyphes non appris : seulement l'indice. Périscope : seul un soleil haut se voit au zénith.
- Pages du Relto : nouveaux préréglages pour le bac à sable.

## 1.25.0 — la rigueur des lois (11 oct. 2026)

- **Rigueur des lois** (`src/rigor.js`, réglage) : doux (par défaut), équilibré, strict (on coche les familles : physique, sol, vie, étendue, équilibre, sous forme de pastilles) et extrême. En doux, rien de nouveau ne coûte de stabilité : sur 3 000 Âges tirés au hasard, aucun n'est moins stable qu'avant. Sol, vie et équilibre sont prêts pour les mises à jour à venir.
- **Dosage par l'étendue** (`src/dosage.js`) : une contradiction coûte selon la quantité (`few:`, `many:`) × la taille du monde (`size: small | medium | large`) × le nombre de biomes. Le temps qui s'enchaîne (pluie + vent = orage, orage + éclair = tonnerre, eau sur fer = rouille) ne pèse presque plus. Budget de richesse par axe (équilibré et au-delà).
- **Profondeur d'un équilibre** (`src/depth.js`) : on retire chaque ligne tour à tour ; une phrase sous les coûts dit si l'Âge tient sur le fil, tenu ou profond. Aucun chiffre.
- **Livre des glyphes** : en bac à sable, tous les glyphes sont montrés (pâles si pas écrits). **Chat** : plus dans deux pièces à la fois.
- **Scorecard d'Obsidian** : plus de `!important`, de `clip-path`, de `display: contents` ni de `column-gap` ; la langue vient de `moment.locale()` et non de `localStorage`.

## 1.25.1 — le README sans texte de gabarit (11 oct. 2026)

- README (EN et FR) : plus de jeton `<version>` ni de « coming soon », relevés par la vérification du catalogue (« README contains unfilled placeholder text »). « Vault Enumeration » n'est qu'une information : le plugin liste les notes pour retrouver les Âges.

## 1.26.0 — vie, sol, cavernes et écriture depuis le Relto (12 oct. 2026)

- Tranches 2, 3 et 4 : vie et sol (blocs, lois de la vie), titre d'écrivain, monde sous roche (`cavern_world`, `glow_algae`, `pellet`).
- **Écrire un Âge depuis le Relto** : livre vierge → vrai livre (fenêtre de liaison, glyphes à l'encre, description, page libre), classeur de glyphes, registre de l'Imageur, coffre de livres descriptifs (trappe de fer, niches de cinq livres, décors dans les niches vides), livres de liaison à l'aspect propre. Un Âge = une note = deux livres.
- Essai d'un bruit de trappe : abandonné (rien ne sonnait juste).


## 1.27.0 — la maladie du vivant et la lecture du monde (12 oct. 2026)

- Tranche 4 close : 4 bis (capacité, cicatrices, retouches, déjà dans la ligne de 1.26 à l'état codé), **4 ter** (maladie du vivant : `pillars`/`blightOf` dans `src/life.js`, cicatrice écologique, taxe légère/normale), **4 quater** (Observation, `src/observe.js` : signe, symptôme, cause ; réglage *Lecture du monde*).
- **Plancher à 75 %** : le coût de la maladie s'arrête à 75 sur l'axe écologique quand le monde tenait sans elle (3 000 mondes mesurés, 1 056 malades : aucun ne passe de stable à instable).
- Test « une phrase par point perdu » (`test/sentences.test.js`) : plus aucun trou connu. `many: X` se dit dans la description ; le panneau ne coupe plus les notes de vie qui coûtent ; la fissure qui ronge un monde instable a sa ligne (`strained`).
- Corpus : 37 Âges (trois pour la maladie).

## 1.27.1 — le coffre ne montre que les livres choisis (12 oct. 2026)

- Le coffre des livres descriptifs lisait `scene.candidates` (tous les Âges des dossiers) au lieu de `scene.ages` (ceux de la liste blanche : pastilles de l'onglet Pages, `books:` du bloc) : `vaultAges` dans `src/ui-relto.js`. Même liste que l'étagère ; « Tout masquer » vide aussi le coffre.
- La carte des étoiles et sa commande de nettoyage continuent de lire `candidates` (un Âge décoché garde son étoile) : laissé tel quel en attendant la décision de l'auteur.
- CSS : `text-decoration: underline wavy` (ligne au symbole inconnu dans le livre ouvert) devient `underline`, signalé « partiellement pris en charge » par le scorecard d'Obsidian (`src/styles.ext.css`).

## 1.27.2 — la carte des étoiles ne montre que les livres choisis (12 oct. 2026)

- `drawStarMap` (`src/relto-starmap.js`) ne lit plus que `scene.ages` : un Âge décoché disparaît de la carte (nom et étoile s'il était seul), mais la gravure reste dans `telescope[key].systems` ; le recocher le ramène.
- `cleanStarChart` (`src/ui-relto.js`) lit toujours `candidates ∪ ages` : il n'oublie que les Âges absents (supprimés, renommés, exclus), jamais les simples décochés.

## 1.27.3 — README à jour (12 oct. 2026)

- README.md et README.fr.md : la phrase sur les langues (réglage *Langue des extensions*, noms de blocs et descriptions générées en anglais) et la section « Recent changes / Nouveautés récentes » en liste par version jusqu'à la 1.27.

## 1.27.4 — un livre qu'on ouvre, une plume dans le Relto (12 oct. 2026)

- Livre du coffre (`src/relto-descbook.js`) : plan couverture → vitre (page droite, gauche vierge) → glyphes → description → page libre → livres de liaison seuls en dernière page (le moteur `linking` peint la vitre dans une page jetée). Couverture : `plugin.coverFor` pour un Âge ; pour un livre vierge, un cartouche où l'on écrit le nom (`state.name`), passé à `createAgeNote(line, name)` (`src/ui-relto.js`, nettoyé, repli « Age » ; l'histoire garde sa numérotation). Message « rien n'est lié » réécrit ; phrase de la vitre au colophon ; dés à l'encre (`DICE`) pour retirer ; phrase du tirage localisée.
- Curseurs : plume (SVG 32×32 avec largeur/hauteur explicites, sinon Chromium l'ignore), teintée par `flowerTone`/`quillSvg` (`src/relto-flower.js`) via `--age-quill` ; main dessinée `--age-hand` (canevas : style en ligne `var(--age-hand, pointer)` sur toutes les zones cliquables ; livres, animation de liaison et leurs descendants). Réglage `cursorQuill`.
- Plein écran à l'ouverture : `file-open` d'une note Relto (ou la commande) arme `reltoFullArm`, consommé par l'instance déjà dessinée ou à la fin du rendu (`toggleFull`, le même que le bouton). Réglage `reltoFullscreen`. Limite : il faut un geste récent.
- Grande vue : `ReltoView.render` garde `plugin.reltoViewFile` (le coffre reprenait tous les livres après un aller-retour vers l'île).
- Carte des étoiles (`src/relto-starmap.js`) : rose du Zéro au bleu du signal, ligne de l'instrument en indigo ; étoile actuelle de chaque Âge lue par `onImagerAge` (en arrière-plan, `r.mapCur`) ; page 0 = aujourd'hui, puis une page par Âge déplacé avec son chemin ; `noteAge` garde `when[nom]` (`src/relto-telescope.js`). Rendus `mapmoved0/1` dans `test/visual`.
- Chat : `catSleep()` lit `cat_sleep` en mots (où, quand, place fixe dans l'atelier).

## 1.28.0 — pages tirées visibles, caverne vue de l'intérieur, lune réglable, télescope à lire (13 oct. 2026)

- Pages tirées (`src/ui-extras.js`, `drawnBox`) : une tension dont `x.ids` touche une page de `analysis.drawn` affiche la page tirée avant les conseils ; ✓ = `addLine` ; case `pick: "one"` de `DRAW_SLOTS` (étoiles, cycle, sol, fissure) : un bouton par autre option. Le guide ne dit plus que × retire une page tirée (× ne retire que les écrites).
- Caverne (`src/genscene.js`, `buildCave`/`paintCavern`, graine propre `0xca7e5`) : `paint` y court-circuite le ciel (voûte, flancs, piliers, vasques, lumières par `S.algae`/`S.glow`/`S.lava`). `S.algae` ajouté à `sceneOf`. Visuel : `test/visual/entry-worlds.js` (variantes cavern*).
- Lune réglable (`src/sky.js`, `MOON_RE`/`moonOf`, `moonScale` dans `parseSky`) ; physique : `set.moonSize/moonDist` dans `solve` (petite ou lointaine → `moon:false` pour `axisChaos`, marée 0,01 ; grande ou proche → 0,06), règle `GLOBAL.moonReach` (sphère de Hill ≥ celle de la Terre). `MOON_RE` ajouté à `AGEX.skip`.
- Télescope (`src/relto-telescope.js`) : en Guilde, étoile morte non triangulée → `needHold` : le vrai retard ne grave rien avant `HOLD_BEATS` = 3 battements immobiles (`st.hold`, effacé au moindre geste) ; le vrai écho pâlit (`echo.pale`) ; croisée qui luit à chaque battement ; `phaseDial` (arc gradué, éclair à midi, un point par écho, faux pouls de même couleur et taille).
- Piège qui mord (gravure fausse si on tient sur le faux point) : envisagé, mis de côté jusqu'à quelques jours de jeu.

## 1.29.0 — télescope : tourelle de verres, temps de pose, balises qui prédisent, plaque qui mord (13 oct. 2026)

Principe : la lunette montre tout ; la plaque grave ce qu'on expose ; les balises disent ce qu'on devrait voir. Note : `claude/DESIGN-telescope-lunette-et-plaque.md` (projet). Manière facile inchangée.
- Tourelle (`src/relto-telescope.js`, `LENSES`, `lensOf`, `turret`, `TURRET`) : bouton sur le fût de l'oculaire, `{ lens: 1 }` tourne plaque → les deux → nu → écho ; gardé dans l'état (`lens`, omis si « plate »). `eyepiece` : `rings` (verre d'écho ou les deux, rayons × `ZOOM` = 3,4) et `dial` (plaque ou les deux).
- Trace du cadran (`phaseDial`, `r.phaseTrace`, `TRACE_BEATS` = 8) ; Me'erta à l'étape 2 (`echo3`, son `hear("merta")`).
- Pose : `needHold(r, sc)` = Guilde et faux pouls, triangulé ou non ; texte « Pose de la plaque ».
- Balises (`SS.predict`) : `scopeOf` passe toujours `tri: false` ; la prédiction (erreur propre : retard 2–4 crans, Torahn 260–460 torantee, hauteur 3–4 ; une balise mordue décale le retard de `bite/2`) donne `more.ghost` (anneau pointillé), `phase.ghost` (repère au cadran), repères sur la molette du retard et près de l'interrupteur. Hors du champ : lueur au bord (halo + liseré, bat au pouls) seulement à moins de `GHOST_REACH` = 2 rayons d'oculaire (60 crans).
- Piège qui mord : pose sur `falseLock` avec direction juste → `st.hold.bite` → `SS.record(…, { bite })` (`distance` + `bite` × 25 shahfeetee, `rec.bite`). `beacons()` porte `bite`. Imageur (`relto-render.js` `imagerCal`) et Détails (`ui-extras.js`, `sys.state.bite`) : la planète glisse. Regravé dès qu'on situe sur le vrai retard (ou gratter).
- Lore (guide) : la plaque de phase est du verre de l'Imageur, marqué un instant puis oublieux.
- Tests : `test/perturbers.test.js` (tourelle, prédiction, morsure, réparation).

## 1.30.0 — mode téléphone : le Relto au doigt (13 oct. 2026)

Note : `claude/DESIGN-mode-telephone.md` (projet). Souris inchangée : tout est sous `opts.touch`.
- `manifest.json` : `isDesktopOnly: false`. Détection (`src/ui-relto.js`, `isTouch`) : `Platform.isMobile`, ou pointeur grossier sans pointeur fin ; classe `is-touch`.
- `src/relto-render.js` : `touchHold` (premier toucher : tenir, cadre et infobulle ; second : agir ; passages immédiats), `holdKey` (une molette entière = une zone via `wc`), `hit` élargi (`TOUCH_REACH` = 14), `onDown`/`onDragMove` (glisser autour de `wc` : 8° fin, 20° gros, `navigator.vibrate`), `dragged` ignore le clic de fin, `tipOut`/`opts.onTip` (carte d'infobulle en DOM), `tipDelay` 0.
- `wc` sur les molettes du télescope (`wheel`), les boutons (11°), la manivelle (90°) et le micromètre de l'Imageur.
- Télescope : toucher l'oculaire → `r.eyeZoom` (`eyeZoomed`, ×1,3 en cercle à gauche, copie du canvas).
- CSS : bandeau `.age-relto__turn` en portrait, `.age-relto__tipcard`, `touch-action: none` sur le canvas tactile. Plein écran mobile : la classe `age-reltoview--inline` au lieu de `requestFullscreen`.
- Pas faits : boutons × (surcouches fermées d'un toucher à côté), balayage des livres (ils ont des flèches), mise en page portrait.
- Tests : `test/touch.test.js` (23 contrôles).

## 1.30.1 — mobile : plein écran et livre étroit (13 oct. 2026)

- Plein écran mobile (`src/ui-relto.js`, `toggleFull`) : la classe `is-mobilefull` sur `.age-relto` (position fixe, `z-index` 1000, encoches `env(safe-area-inset-*)`) au lieu de `age-reltoview--inline`, qui n'avait de styles que sous `:fullscreen`. En portrait, `.age-relto__stage` tourne d'un quart de tour (`rotate(90deg)`, `transform-origin: 0 0`, sous la barre d'icônes) ; `opts.rotated` fait lire le doigt dans l'image redressée (`toLogical`).
- Livre de l'Âge : `.age-book` devient un conteneur ; sous 560 px, `.age-book__spread` en colonne, gouttière horizontale, onglets qui passent à la ligne, page blanche des feuillets masquée.
- Relto dans une note : `@container (max-width: 600px)` réduit l'heure ; carte d'infobulle et bandeau portrait plus discrets ; plus d'assombrissement en portrait.
- Tests : `test/touch.test.js` (25 contrôles, dont la lecture couchée).

## 1.30.2 — le Relto réapparaît sur téléphone (13 oct. 2026)

- `inst.full` (plein écran à l'ouverture) ne joue plus sur un écran tactile : en 1.30.1 il posait `is-mobilefull` dès l'ouverture, et la vue fixée, prise dans un parent transformé d'Obsidian mobile, sortait de l'écran.
- `mobileFull` (`src/ui-relto.js`) : en plein écran mobile, `.age-relto` est déplacé dans `document.body` (un commentaire garde sa place), remis à sa place à la sortie ; si la note se ferme ou se redessine, il s'en va avec elle (contrôle toutes les secondes).

## 1.30.3 — molettes à la souris, Imageur au doigt (13 oct. 2026)

- Souris (`src/relto-render.js`) : `onDown` démarre le glissement autour de `wc` sans « tenir » d'abord (bouton principal) ; `pointermove` va à `onDragMove` pendant un glissement ; curseur `grab`/`grabbing` sur les molettes et les rails. `onWheel` (`WHEEL_STEP` = 90, `deltaMode` normalisé, Maj = gros cran) seulement si `opts.wheelOk` (grande vue, plein écran) ; sinon la roulette fait défiler la note.
- Rails de l'Imageur : `this.slide` (glisser le verre cran par cran), souris et doigt. `holdKey` regroupe les zones d'un même réglage de l'Imageur (`value`, `slot`, `rack`).
- Livre descriptif (`src/relto-descview.js`) : couché en portrait plein écran (`opts.rotated`), placé d'après `offsetLeft/Top/Width/Height` du canevas ; se replace au `resize`/`orientationchange`.
- Guide : « Les molettes à la souris ». Tests : `test/touch.test.js` (41 contrôles).

## 1.30.4 — tout le Relto se couche (13 oct. 2026)

- Plein écran mobile en portrait : la rotation passe de `.age-relto__stage` à `.age-relto.is-mobilefull` entier (`width: 100dvh`, `height: 100vw`, `left: 100vw`, `rotate(90deg)`) ; la barre d'icônes se couche avec l'image ; l'image prend `(100vw − 48 px) × 16/9`.

## 1.30.5 — feuille de style sans !important (13 oct. 2026)

- `src/styles.ext.css` : l'heure du Relto sur écran étroit (`@container (max-width: 600px)`) passe par `.age-relto[data-tab] …` et `.age-reltoview .age-relto[data-tab] …` au lieu de `!important` (avertissement du lint CSS). Rendu inchangé.

## 1.30.6 — zone morte des molettes (13 oct. 2026)

- `onDragMove` (`src/relto-render.js`) : `DRAG_START` = 3 unités de déplacement avant que la molette tourne (`d.on`) ; à moins de `DRAG_CORE` = 4 unités du centre, l'angle n'est pas compté. En 1.30.3–1.30.5, le tremblement d'un clic près du centre du moyeu tournait la molette de quelques crans (l'étoile « bougeait »).

## 1.30.7 — plein écran mobile : un volet à la fois (13 oct. 2026)

- `src/styles.ext.css` : sous `.age-relto.is-mobilefull[data-tab=…]`, les règles du plein écran du PC (un seul volet visible : vue, pages ou réglages) ; la barre d'icônes en `z-index: 3` avec un fond ; le Relto en `z-index: 10000` (au-dessus des boutons flottants d'Obsidian mobile). En 1.30.1–1.30.6, l'onglet Pages s'étalait sur l'image et sur la barre : plus moyen d'en sortir.
- Le bouton « retour » du téléphone ramène Obsidian en arrière ; la note quittée, le Relto en plein écran s'en va avec elle (contrôle de 1.30.2).

## 1.30.8 — barre d'icônes au doigt (13 oct. 2026)

- `src/styles.ext.css`, sous `.age-relto.is-touch` : la barre (`.age-relto__tabs`) aligne tout à gauche (navigation puis onglets), boutons de 44 px, icônes de 22 px, opacité pleine (pas de survol). Souris inchangée.

## 1.30.9 — plein écran mobile : la colonne de boutons (13 oct. 2026)

- `src/styles.ext.css`, sous `.age-relto.is-mobilefull` : disposition en ligne (`flex-direction: row`), la barre `.age-relto__tabs` en colonne de 56 px sur le bord gauche (navigation puis onglets, sans le nom D'ni), l'image dans le reste (`100dvh × 16/9` en paysage, `100vw × 16/9` couchée en portrait).

## 1.31.0 — mains dessinées, infobulles à la ligne (13 oct. 2026)

- Curseurs (`src/styles.ext.css`) : `--age-grab` (main ouverte) et `--age-grabbing` (main qui serre), SVG 32 × 32 dans le style de `--age-hand`, point actif (16, 16), posés sur `.age-relto.age-quill`. `src/relto-render.js` : molettes (`wc`), rails de l'Imageur et livres de l'étagère (`h.book`) en `var(--age-grab, grab)`, `--age-grabbing` pendant qu'on tourne ou glisse. Fenêtre de liaison (`.age-book__window.is-clickable`) et panneau de l'animation de liaison (`.age-linkanim.is-ready .age-linkanim__panel`) : main ouverte.
- Infobulles du canevas (`drawHover`) : passage à la ligne au-delà de `TIP_MAX` = 300 unités (la fraction en rahnfee seulement sur une ligne). `tel.lens.tip` raccourci (FR/EN).
- Plein écran mobile : `.age-relto__head` masqué (onglets Pages et Réglages).

## 1.32.0 — carte des étoiles : noms au survol, loupe, régions, échelle adaptative (13 oct. 2026)

- `src/starmap.js` : `layout` donne `d0` (le quart de la distance médiane, au moins 100) ; `radial(map, d)` : `log1p(d/d0) / log1p(scale/d0)` (adaptative) ou la racine carrée ; `fit3` l'utilise.
- `src/relto-starmap.js` : noms au survol (`r.hover.starKey`) ou tous (`r.mapNames`, bouton « Aa ») ; loupe `r.mapZoom` (`k`, `fx`, `fy`) appliquée à `P.at`/`ring`/`hz` autour du centre du cadre, clip sous le titre ; boutons N/E/S/O (centre des étoiles du quart, ×2,2) et ◎ ; `act(r, a, x, y)` appelé par `onClick` (`h.mapAct`). La légende de la ligne de l'instrument compte parmi les places prises. `setView` range la loupe en quittant la carte.
- Guide FR/EN ; tests : `test/touch.test.js` (56 contrôles).

## 1.32.1 — un chat (13 oct. 2026)

- Un chat de plus, pour qui sait le trouver (`page_marcel`, page intégrée secrète ; voir `src/relto-model.js` et les fonctions `marcel*` de `src/relto-render.js` ; tests : `test/marcel.test.js`). Rien dans le guide.
- L'index des Âges note la maladie du vivant (`sick`).

## 1.32.2 — la housse du jour (13 oct. 2026)

- `src/relto-atelier.js` : `COVERS` (six étoffes sourdes : dossier, assise, couleur de camouflage) et `coverOf(r, now)` (date locale et graine du Relto). Le fauteuil de l'atelier change de housse chaque jour ; ce qui s'y camoufle suit la housse. Tests : `test/marcel.test.js` (29 contrôles).

## 1.32.3 — une patte (13 oct. 2026)

- Onglet Pages (`src/ui-relto.js`) : l'infobulle d'une page intégrée est son nom (plus « (relto-library) », réservé aux pages d'une bibliothèque). La page de Marcel : nom doré en italique, une petite patte en SVG (`.age-relto__marcel`, `.age-relto__paw`).

## 1.32.4 — le laisser dormir (13 oct. 2026)

- `marcelCamo` ne donne plus `eyes` : endormi dans le fauteuil, il garde les yeux fermés (l'ouverture d'une demi-seconde faisait bizarre).

## 1.32.5 — moins de mots pour la Guilde (14 oct. 2026)

- `src/relto-telescope.js` : `coarseBand` (0 → rien, 1–3 → quelque chose, 4–5 → tout près) ; `bandWords(t, b, guild)` l'applique en Art de la Guilde (étape du Zéro et étape d'un Âge). Guide FR/EN et réglage mis à jour. Test : `test/touch.test.js`.

## 1.32.6 — un guide français relu (14 oct. 2026)

- `src/guide-ref-fr.js`, `src/guide.js` : relecture du français (calques, tournures approximatives, « Pile à droite de midi » → marques empilées, « revise » → vise de nouveau, condition de déverrouillage du télescope qui disait l'inverse). FR/EN : plus de « bureau seulement », plein écran en portrait décrit, « Open the Relto » crée le refuge, sept pages de réglages.

## 1.33.0 — le guide au téléphone (14 oct. 2026)

- `src/entry.js` : `addRibbonIcon("mountain", …)` ouvre le Relto (clé `relto.ribbon`).
- `src/ui-relto.js` : bouton `age-relto__tab--guide` (icône `book-open-text`, clé `tab.guide`) ; ouvre `openGuide(plugin, "reltocat" | "relto2", "full", { over: root })` selon la vue.
- `src/guide.js` : `openGuide(…, opts)` ; sur écran étroit (≤ 640 px), classe `is-toc` : sommaire et texte se relaient, bouton « ‹ Sommaire » ; boutons rubrique précédente / suivante (`age-guide__steps`) ; `opts.over` : en plein écran du navigateur, la fenêtre est déplacée dans l'élément plein écran, et `age-guide-over` (z-index 10050) la pose devant le Relto plein écran mobile (10000).
- Guide FR/EN : l'icône du ruban et le bouton guide. Test : `test/integration.js` (le bouton guide existe, hors du compte des onglets).

## 1.33.1 — des boutons qui tiennent (14 oct. 2026)

- `src/guide.js`, `src/styles.ext.css` : boutons précédent / suivant en deux lignes (`age-guide__stepword` au-dessus, `age-guide__steptitle` qui passe à la ligne) ; hauteur libre, `white-space: normal` (les boutons d'Obsidian mobile ont une hauteur fixe et ne coupent pas le texte d'un `inline-flex`).

## 1.34.0 — un guide où l'on cherche (14 oct. 2026)

- `src/guide.js` : `fold` (minuscule, sans accent, un caractère pour un) et `topicText` (titre et corps, sauf le corps des spoilers) ; champ `age-guide__search` dans `age-guide__side` ; filtrage par la classe `is-out` (pas `hidden` : `display: flex` l'emporterait) ; `highlight` entoure les correspondances de `mark.age-guide__hit` et le texte défile jusqu'à la première ; `reveal` fait défiler le sommaire jusqu'à la rubrique ouverte ; ← → (écouteur `keydown` sur le document, retiré à la fermeture, ignoré dans un champ) ; précédent / suivant parmi les rubriques visibles.
- `renderTopic` : mini-sommaire `age-guide__mini` dès quatre sous-titres (pas pour une rubrique à case spoiler) ; `age-guide__body` positionné, `offsetTop` y mène.
- `src/styles.ext.css` : fenêtre `min(1100px, 94vw)`, `height: 80vh`. Guide FR/EN (rubrique Commandes). Test : `test/reference.test.js` (repli, recherche du rahnfee et du pulsar, secrets hors recherche).

## 1.35.0 — le Traité de l'Art (14 oct. 2026)

- `src/relto-atelier.js` (`drawLoft`) : le volume à `(548, 318)`, en bac à sable (`sc.mode !== "story"`) ; `statusState().tier >= 4` ouvre le fermoir (languette qui pend, halo) et pose `special: "treatise"` ; sinon `flash` + `clasp: true`. Clés `atelier.loft.treatise`, `.shut`, `.clasp`, `guide.treatise`.
- `src/relto-render.js` : un `flash` à `clasp` appelle `opts.onClasp` (clics de fermoir, `sound.bookOpen` sans le livre).
- `src/ui-relto.js` : `onSpecial("treatise")` → `openGuide(plugin, null, "full", { over: root, book: { title, dni, font, onFlip } })`.
- `src/guide.js` : `opts.book` : classe `age-guide-modal--book`, en-tête (titre en D'ni si police, titre latin), `onFlip` à chaque rubrique tournée après la première. CSS parchemin dans `styles.ext.css`. Test : `test/treatise.test.js` (6 contrôles).

## 1.36.0 — la carte qui tourne (14 oct. 2026)

Note : `claude/DESIGN-carte-defiler-tourner.md` (projet).
- `src/starmap.js` : `fit3(…, { turn })` tourne le plan avant de le coucher (`rot`, sens horaire ; les hauteurs ne tournent pas) ; `turnPoint` tourne un point de l'écran autour du Zéro sur le plan redressé (le point visé de la loupe).
- `src/relto-starmap.js` : `r.mapTurn` (radians, jamais enregistré) ; ligne de l'instrument, rose du Zéro et traits de plomb tournés ; `brassRose` (coin bas droit, zone `wc` de `kind: "map"`, crans de π/8, clic +1, Maj + clic −1) ; `turnTo` (la loupe suit son point), `pan` (borné au parchemin), `angleAt` ; ◎ remet aussi le nord ; la légende de la ligne ne s'écrit pas sous la rose.
- `src/relto-render.js` : `mapDown` / `mapMove` / `mapUp` (`mapGest` : `pan` sous la loupe, partout sauf les boutons, sans tenir au doigt ; `spin` au bouton droit ou Maj + glisser ; `twist` à deux doigts, `mapPtrs`) ; `contextmenu` avalé sur la carte ; `wheelAct(…, "map")` ; quitter la carte remet le nord.
- i18n `map.drag`, `map.rose`, `map.all` ; guide FR/EN (rubrique de la carte). Tests : `test/touch.test.js` (87 contrôles).

## 1.36.1 — l'écho sans mots (14 oct. 2026)

- `src/relto-telescope.js` (étape 2, ligne sous l'oculaire) : en Art de la Guilde, `echoWords` n'est plus ajouté (« l'écho vient avant / après le pouls : moins / plus de retard » était une aide, pas ce qu'on voit) ; les faits de l'instrument restent (pose, second battement, lumière courbée, « l'instrument tient cette étoile »). Facile inchangé. Guide FR/EN (rubrique du métronome). Test : `test/touch.test.js` (89 contrôles).

## 1.37.0 — la Verrière (15 oct. 2026)

Note : `claude/DESIGN-verriere-art-nouveau.md` (projet). Une page de déguisement art nouveau ; seulement l'enveloppe.
- `src/relto-model.js` : `page_glasshouse` (effet `glasshouse`, `sandbox: true`), page intégrée (`BUILTIN_PAGES`) ; `builtinPages({ story })` la retire d'un Relto d'histoire.
- `src/relto-glass.js` (nouveau) : ogives, verres (`glassTones`), sept motifs au plomb (`motif` : coup de fouet, iris, lys, pavot, ginkgo, tulipe, fougère), panneaux, lianes, pots, murs et sol de la cabane (sol en cache), fenêtre et porte (trois dessins, `setDoorStyle` ; par défaut la porte à deux battants en plein cintre), œil-de-bœuf, taches de lumière, salle de l'Imageur (rosace d'aurore), mosaïque sombre, rinceaux d'angle, liane de pilier, meubles, fenêtre ronde, lampes à coupole de verre (`tiffanyLamp`, `lampGlow`, `lampPool` : la flaque colorée teinte aussi ce qui est posé), tapis ouvragés, trappe de bronze et d'argent.
- Branchements : `relto-render.js` (`glassOn`, `drawGlasshouse` : pavillon et lanternon ; la fumée de la cheminée sort du lanternon), `relto-global.js`, `relto-rooms.js` (cabane), `relto-imager.js`, `relto-telescope.js`, `relto-scenery.js` et `relto-clock.js` (horloge), et les autres pièces (`relto-atelier*.js`, `relto-vault.js`).
- Test : `test/glasshouse.test.js` (46 contrôles : zones cliquables identiques avec et sans la page, quinze vues, trois heures). `test/treatise.test.js` est enfin dans la suite.

## 1.37.1 — la même porte dehors (15 oct. 2026)

- `src/relto-render.js` (`drawGlasshouse`) : la porte du pavillon, vue de l'île, devient celle de dedans (deux battants en plein cintre, ovales de verre clair, petites fleurs, bois irisé, deux poignées) au lieu de l'ogive ambre à soleil. Zone cliquable inchangée (`test/glasshouse.test.js`).

## 1.38.0 — la lucarne (15 oct. 2026)

- Nouvelle vue `roundwindow` (`src/relto-roundwindow.js`) : le hublot de l'atelier en gros plan. Ciel de l'heure, comète (`cometWindow`), nuage ; autour, une bague de laiton gravée des vingt-cinq chiffres D'ni 0 à 24 (0 en haut, sens horaire, pied vers le centre), sans légende ni indication d'heure : une planche de lecture, pas un cadran. Le 0 y est toujours visible (c'est un chiffre, rien à voir avec le Grand Zéro).
- Sous la Verrière : bague de cuivre, vitrail agrandi (`roundWindowRing`, 12 cellules), un bourgeon entre chaque chiffre. Sans : laiton, croisillons, graduations.
- `relto-atelier.js` : nouvelle zone cliquable sur le hublot (`go: "roundwindow"`), dans les deux modes (exception voulue à « la Verrière ne change que l'enveloppe » : c'est une fonction à part entière). `relto-render.js` : `ROOMS`, `available()` (comme l'atelier), groupe du chat ; `i18n.js` : `atelier.window.tip/back`.
- Test : `test/glasshouse.test.js` (zones identiques avec et sans la page dans la vue ; chiffres 0..24 tous et seuls ; un seul cliquable, le retour).

## 1.39.0 — le calendrier de près (15 oct. 2026)

- Nouvelle vue `calendar` (`src/relto-calendar.js`) : le pilier en gros plan, la date D'ni complète (hahr, nom du vailee, yahr en grand ; dessous gahrtahvo · tahvo · gorahn · prorahn), à l'heure réelle (`DC.reltoDate`), sans légende. Normale : dalle de pierre et mousse, gravure sombre. Sous la Verrière : vitrail en ogive cerclé de cuivre, plombs, rinceaux, gravure ambre. Cliquable depuis l'île (`relto-scenery.js`) et la vue globale (`relto-global.js`) dans les deux modes ; `calFrom` ramène d'où l'on vient (`setView`). `available().calendar` = page calendrier.
- `relto-scenery.js` : `pillarNumber` empile les chiffres d'un nombre à deux chiffres sur le fût du pilier (le yahr 25 « 10 » débordait) ; utilisé aussi par la vue globale.
- Imageur sous la Verrière (`relto-glass.js`, `imagerRoom`) : les deux vitraux (12–38 × 66–142 et 620–638) ne vivent que dans la vue d'ensemble et ne chevauchent plus l'étagère de la longue-vue (x ≥ 48) ni le boîtier de la jauge (jusqu'à 615). Un `git checkout` malheureux les avait défaits un moment : remis.
- Pavillon de la Verrière (`drawGlasshouse`) : baies à y0+7, sous la coupole.
- Lucarne : `roundWindowRing(…, buds)` ; sans bourgeons dans la vue rapprochée et à l'atelier (on les lisait comme des zéros) ; bande de chiffres plus fine (R_OUT 148).
- Tests : `test/glasshouse.test.js` (calendrier : zones identiques, cliquable depuis l'île et le global, retour).

## 1.39.1 — le panneau se referme (15 oct. 2026)

- Régression de la 1.36.0 corrigée (`relto-render.js`, `setView`) : en ajoutant la remise à zéro de la carte, un commentaire `//` posé en milieu de ligne avait avalé la fin (`flash`, `fadeAt`, `deskUI`, et la remise en place de `panelAt` / `shelf` / `shelfOpen` / `bookAt` en quittant la cabane). Les commentaires en milieu de ligne sont maintenant en `/* */`. Test : `test/touch.test.js` (quitter la cabane remet la bibliothèque et le panneau ; changer de vue referme le tiroir et efface le message) ; il échoue sans le correctif.
- Lucarne : les 25 glyphes à la même taille (18), bande R_OUT 148.
- README : « Nouveautés récentes » condensées par familles de versions.

## 1.40.0 — pelouse et muguet (15 oct. 2026)

- Pelouse : `relto-render.js` (`GRASS`, `lawn()`, `groundTop()`) ; la page Herbe seule fait du dessus de l'île une pelouse (dégradé vert, reflets, frange sur le bord de la roche) ; `relto-rooms.js` : sol des vues en plein air (bassins, chat, bosquet) via `r.groundTop()`. La calotte de la montagne ne change pas.
- Muguet : `page_lily_of_the_valley` (`relto-model.js`, asset `lily` dans `ASSETS.flowers`) ; `relto-scenery.js` `lilies()` (touffes éparses, deux feuilles en lame, tige arquée, 3 à 5 clochettes) ; mots « lilies of the valley » / « muguet » (`ui-relto.js`) ; listes de pages du guide (EN/FR).
- Lave sous la Verrière (`drawMount`) : la fissure du plateau volcanique (`T.glow`) entière, qui remonte derrière la coupole (branche, lueur, cœur chaud) ; elle dépassait d'un bout au-dessus du verre, plus bas que l'ancien toit. Sans la Verrière : inchangée.
- Tests : `test/glasshouse.test.js` (pelouse avec la page Herbe seule ; page muguet ; zones identiques avec et sans la Verrière).

## 1.41.0 — le Château (17 oct. 2026)

Note : `claude/DESIGN-chateau-gothique.md` (projet), maquette (artefact). Second déguisement, gothique romantique (esprit Symphony of the Night) ; seulement l'enveloppe, sauf l'observatoire.
- `src/relto-model.js` : `page_castle` (effet `castle`, `sandbox: true`, page intégrée) ; `DISGUISES` et `attachPage(list, id)` : un seul déguisement à la fois (attacher l'un détache l'autre) ; `ui-relto.js` passe par `attachPage` sur les trois chemins d'attache. `relto-render.js` : `castleOn()` ; `glassOn()` est faux quand le Château est là.
- Dedans (`src/relto-castle.js`, nouveau) : pierre appareillée sur lambris de noyer, parquet en point de Hongrie (perspective douce, en cache ; `setFloorStyle` garde « bâtons » et « panneaux », inutilisés), portes et fenêtres en arc brisé, vitraux, fer forgé, velours, or, chandelles ; cabane (`relto-rooms.js`), atelier, bureau, mezzanine et escalier en hélice (`relto-atelier.js`), fond de l'atelier (tenture violette à lys, baldaquin vert bouteille, couvre-lit ivoire : `relto-atelier-back.js`), lucarne (bague de pierre cerclée d'or), Imageur, salle du télescope, trappe (`relto-vault.js`).
- Dehors (`src/relto-castle-out.js`, nouveau) : `keep` reprend la maquette dans son repère (sol à y = 208), posée par une mise à l'échelle sur la tour de l'astronome (x = 354 → `M.tx`) et haussée ; derrière, la silhouette exacte de l'ancienne montagne (les trois béziers de `drawMount`) hérissée de pignons, créneaux et flèches ; devant, le corps de logis crénelé et ses deux tours rondes ; la courtine et ses tours d'angle. `setScene` : sous le Château, `lay.mount.x = 306` (le château au milieu de l'île ; l'observatoire suit, sa zone cliquable aussi : seule exception à « rien ne bouge »). `terraceOf(M)` reproduit la terrasse de `drawMount`.
- Chapelle (`chapel`, réduite de `CHAPEL_K` = 0,72 autour de son pied, zone cliquable inchangée) : pignon de vieille pierre grise et brune, mousse, rose, clocheton et cloche, portail à voussures, lancettes, contreforts à pinacles ; `chimneyAt` suit la réduction ; la lueur de l'âtre (`drawChimney`) sort du portail, faible le jour.
- Îlots : `castleIslet` (cinq formes sur cul-de-lampe ; `low` : un bastion bas derrière le calendrier et l'horloge) ; `corbel` sous le calendrier et l'horloge ; passerelles de pierre (`stoneBridge`) vers les tours d'angle de la courtine ; ponts de corde, banc, piliers de liaison et menhirs en pierre ; la cascade sort d'une gargouille ; `foundations` et `parapet` pour la roche.
- Nuit rouge : `redNight(sky)` (de `night` 0,2 à 0,7 : haut `#14060e`, bas `#5e1a20`, `sky.red`), appliquée dans `draw()` ; `bloodMoon` (lune pleine, halo, mers, chauves-souris), `bloodFog` (nappes sous l'île), `cloudColor` cramoisi, `drawGrade` rouge au lieu de bleu, brume rase de la cour. Les vues rapprochées et la vue globale reçoivent le même ciel ; leurs nuées blanches s'effacent.
- Calendrier : `calendarStele` (granit sombre, filet et fleuron d'or, nombre en or) sur l'île, dans la vue globale et au fond de l'horloge ; gros plan : socle appareillé. Horloge (`relto-clock.js`) : terrasse dallée sur cul-de-lampe, fût en pierre du château, tours au loin.
- Vue globale (`relto-global.js`, `castleIsland`) : l'île de près, réduite (0,4) : soubassements, château, chapelle, stèles, arbres, gargouille.
- Tests : `test/golden.test.js` (nouveau : empreinte de tous les appels du canvas sur 150 vues sans le Château ; `GOLDEN_WRITE=1` pour la régénérer quand c'est voulu) ; `test/castle.test.js` (139 contrôles : zones cliquables identiques avec et sans le Château dans vingt vues à trois heures, sauf l'observatoire ; un seul déguisement ; jamais en histoire ; nuit rouge). Les tests de vues construisent une scène avec un Âge écrit, sinon le télescope reste verrouillé et la vue retombe sur l'île.
- Leçon gardée : jamais de `//` en milieu de ligne (deux fois du code avalé) ; `/* */`.

## 1.41.1 — le Château au crépuscule (17 oct. 2026)

Pour Halloween : attacher le Château, attendre la nuit, regarder la lune rouge se lever sur le Relto.
- Pierre au jour (`relto-castle-out.js`, `daylight`, `litStone`) : à midi elle s'éclaircit vers `#b8bccb` (34 % au plus, suivant `ambient`, nul la nuit rouge) ; `keep` retourne ses dégradés l'après-midi (la face éclairée suit le soleil). Appliquée au donjon, à la masse, au corps de logis, à la courtine, aux îlots (île et global), aux soubassements et à l'enceinte. La chapelle garde sa vieille pierre.
- Vert sous le Château (`relto-render.js`) : `GRASS_CASTLE` pour la pelouse, `deep()` pour le sol sans page Herbe et les touffes, `groundTop()` ; brins de `SC.grass` (paramètre `castle`) ; arbres (`drawPlants`, mélange vers `#10201a` à 35 %).
- Vue globale (`relto-global.js`, `spire`) : sous le Château, les pinacles de roche deviennent des tours lointaines (poivrière, deux fenêtres, pierre au jour).
- Tests : golden inchangé (rien ne bouge sans le Château) ; `test/castle.test.js` 139 contrôles.

## 1.41.2 — ce qui hante le Château la nuit (17 oct. 2026)

- Nuit rouge : `giantBat` (`relto-castle-out.js`), toutes les 52 s pendant 8 s, alternant le sens, devant la lune ; appelée par `bloodMoon`.
- Hôtes du Château (zones `extra: true`, ignorées par la comparaison des zones avec et sans le Château ; présents seulement sous lui : trois contrôles dans `test/castle.test.js`) : le cercueil de la crypte (`relto-vault.js`, son `coffin`), et d'autres que les tests nomment. `ui-relto.js` : sons `coffin`, `sword` (via `onKnock`) ; `h.sfx` et `h.wolf` dans `onClick` ; `onMove` garde `pointer`.
- `test/castle.test.js` : les zones se comparent sur leurs rectangles et leurs actions, plus sur leurs textes (un objet peut changer d'habit au même endroit).
- Tour de l'astronome (`keep`) : contreforts à ressauts, lancettes à meneau et larmier, galerie sur mâchicoulis, deux pinacles d'angle et leurs gargouilles ; plus de plate-forme quand l'observatoire est là. Observatoire (`relto-telescope.js`, `drawOnIsland`) sous le Château : plus de tambour beige, la tour monte jusqu'à une corniche ; coupole en arc brisé (`AH = DR · 1,75`) de toute la largeur de la tour, nervures d'or, croix ; lunette plus longue (12), bagues, pare-buée ; la fente suit son axe. Sans le Château : inchangé (golden).
- Donjon : arc-boutant de la tourelle cachée derrière la tour ronde au fût de la grande flèche ; la petite flèche derrière le pignon devient une tourelle (fût appareillé, corniche sur consoles, lucarne) ; le corps collé à la tour ronde ; plus d'arcs-boutants sans appui.
- Minerais sous le Château (`castleOre`) : or et argent aux clés et cernes des arcs aveugles, gemmes en cabochons sertis ; `drawOre` ne dessine plus de veines par-dessus les soubassements.
- Pièces : armoire fermée au départ (`op = 1` sans `wardAt`) ; lit, armoire, horloge en Château (gâbles, pinacles, lancettes, pentures) et en Verrière (coup de fouet, vitraux, cuivre) ; coffre en crypte (ashlar, ogives, niches en arc brisé, lutrin de noyer, chandeliers) et en salle de mosaïque (verrière, niches à lunettes, lampe) ; porte d'entrée flamboyante (`flamboyantDoor`) ; porte de l'atelier en Verrière (`atelierDoor`) ; lancette de l'Imageur recentrée au-dessus de la porte.
- Vue globale : passerelles posées au bord des culs-de-lampe.
- Golden régénéré pour les seules vues voulues (chambre, coffre et atelier de la Verrière, chambre normale).

## 1.41.3 — le Château sous l'ardoise (17 oct. 2026)

- Ardoise (`relto-castle-out.js`, `slateRoof`, `SLATE3`) : un toit (x0, by) → (ax, ay) → (x1, by), pan à l'ombre du côté opposé au soleil, rangs, arête claire, égout sombre ; dans `keep`, couleur `cs` (à peine éclaircie le jour : 12 % vers `#8a93b8`, au lieu des 34 % de la pierre). Appliquée à tous les toits du donjon, de la courtine, de la chapelle et des îlots (`isletTower`, `castleIslet`).
- Grande flèche (`keep`) : fût, étage de beffroi (deux baies, frise de quadrilobes), corniche ; gâbles, quatre clochetons d'angle à crochets ; flèche en vert-de-gris (`cv`), plus étroite que la tour, arêtes, rangs d'écailles arrondies, lucarne, crochets ; boule et croix. Retournée l'après-midi (`sg`). Petite flèche : deux clochetons aux angles de sa corniche ; corniches sous la poivrière de la tour isolée et de la tourelle collée à la grande flèche. Maquettes faites à part avant de coder.
- Chauve-souris géante (`giantBat`) : de profil, petit corps, deux oreilles, œil jaune ; ailes à plat (x le long du corps, z vers la pointe) relevées de `th` et vues un peu d'en haut (l'aile proche dessous, la lointaine dessus), trois doigts, bord festonné.
- Hôtes du Château (zones `extra: true`) : redessinés d'une seule silhouette en courbes, les volumes peints de l'intérieur par découpe et dégradés (pas de bord net) ; la leçon de six essais : la silhouette d'abord, les volumes ensuite, et chaque pièce posée sur une autre.
- Vue du bassin (`relto-rooms.js`, `drawPondRoom`) sous le Château : face de l'île appareillée, bandeau, arcs aveugles qui évitent la chute ; falaise devenue mur (appareil, chaînes d'angle, lancette) ; gargouille sur console d'où l'eau jaillit et retombe en arc dans le bassin (plus de ruisseau ni de filet sur le gazon) ; goulotte du trop-plein. `drawKoi` sous le Château : margelle et deux bornes taillées (île et vue rapprochée).
- Soubassements (`foundations`, `castleOre`) : `inside` / `fits` (point dans le contour de l'île) ; un arc, un arc doré, une gemme ou un contrefort que le bord couperait n'est pas dessiné. `drawOre` passe `geo.outline`.
- Coffre : alcôves dans le mur (corniche, lanterneau au centre), rang du bas sur socle, cercueil agrandi, lueur de la lampe Tiffany limitée au livre.
- Tests : golden inchangé ; `test/castle.test.js` inchangé (zones identiques).

