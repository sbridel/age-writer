# Age Writer — reprise de contexte (v1.4.0)

> Plugin Obsidian. Tu écris un « Âge » (un monde) dans un bloc `age`, une page par ligne ; le plugin calcule
> le reste. Tout est local : pas de réseau, pas d'IA à l'exécution.
> La v1.4 ajoute une **couche d'extension** (refuge Relto, chiffres D'ni, loi du changement, effets, sons…)
> greffée sur le moteur 1.3.0. Ce document remplace l'addendum ; la reprise v1.3
> (`age-writer-reprise-de-contexte.md`) reste valable pour le moteur (symboles, tirage, réactions, bibliothèque).

## 1. Où on en est

- **Auteur** : Alucard, poète francophone, développe en JavaScript pur. Réponses en français.
- **Historique** : mod Minecraft (reprise de Mystcraft) → plugin Obsidian v1.0–1.3 (TypeScript, sources
  livrées) → **v1.4 en couche JavaScript** sur le `main.js` 1.3.0 minifié, car les sources TS n'étaient pas
  disponibles dans la session.
- **État** : toutes les fonctions demandées sont livrées. L'auteur l'essaie dans son Obsidian à chaque
  livraison. Une revue complète du code a corrigé une vingtaine de bugs et réorganisé le projet.
- **Dernière livraison** : `age-writer-1.4.0.zip` (plugin) et `age-writer-1.4.0-src.zip` (projet complet).

## 2. Ce qui existe en 1.4 (en plus du moteur 1.3)

### Bloc `age` — nouvelles lignes (ignorées par le moteur, jamais « symbole inconnu »)

| Ligne | Effet |
|---|---|
| `mechanism: water_valve` (ou `dnie_mechanism:`, `puzzle:`, `puzzle_type:` ; espaces, majuscules et virgules acceptés) | mécanisme abandonné + énigme (11 : ascenseur à vapeur, vanne, télescope, serrure sonore, réseau de fréquences, générateur à vapeur, imageur holofatique, planétaire, écluse, orgue à vent, réseau de lentilles) |
| `fx: classic \| static \| ripple \| sweep \| tv \| random \| off` (ou `window_fx:`, `link_fx:`) | effet de la fenêtre de liaison pour cet Âge ; `random` = un effet fixe tiré du nom de l'Âge |
| `trap book` (ou `trap_book`, `trap: yes`, `livre piège` ; `trap: false` annule) | livre-piège : ni livre de retour (un `return:` est ignoré) ni fissure. **Apparence normale** tant qu'il n'est pas abîmé |
| `damaged_pages = 2`, `removed_pages: 3` (`=` ou `:` ; `damage_pages` accepté) | pages abîmées / arrachées : **n'altèrent que la liaison**, pas la stabilité de l'Âge (pénalité 0,08 / 0,15 par page, plafond 0,9) |

### Fenêtre de liaison
- Effets : classique, statique, ondulation, balayage, télé (floue, noir et blanc, neige), aléatoire par Âge,
  aucun ; intensité réglable ; `prefers-reduced-motion` respecté.
- L'instabilité dégrade l'image : tremblements, ciel violet puis rouge, ratures, fissures, désaturation.
- **Liaisons incertaines** (réglage) : au-delà de 30 % d'instabilité de liaison, coupures de l'image par des
  parasites, bouton « ♪ Écouter les parasites », et le lien peut **vaciller** (échec) ou **s'égarer** vers un
  autre livre du même Âge. Les pages abîmées font vaciller, les pages arrachées font s'égarer.
- **Vue livre** : un clic sur la vitre lie à l'Âge visé (mêmes règles que « open ↗ »).

### Relto (refuge)
- Note avec `age_type: personal_hub` (créée par la commande *Open the Relto*) + bloc `relto`.
- Frontmatter : `age_name`, `seed`, `environment` (`base_terrain` : volcanic/mossy/obsidian plateau, sand_island,
  glacier ; `surrounding` : cloud_sea, fog_sea, ocean, void, lava_sea ; `sky_cycle` : system_time ou
  frozen_dawn/day/dusk/night), `structures` (hut, bookshelves, linking_pillars), `relto_pages_active`,
  `relto_books`.
- Rendu canvas : île flottante, cabane, étagère (un livre par Âge, cliquable), piliers, ciel selon l'heure.
- **Pages** (14 intégrées) : pins, bouleaux, palmiers, fougères, cascade, lucioles, lanternes, neige, aurore,
  feux d'artifice, petit mont derrière la cabane, menhirs, **cheminée**, brume. Une page = une note avec
  `relto_page_id`, `effects: { canvas_additions, ambiance_audio }`, `unlock: { age, min_stability, ages_count }`.
- **Pages custom** : bloc `relto-library`, une par ligne :
  `page id: Label | effet densité [asset], … | audio=preset,preset | unlock=[[Âge]]:60`
  (effets : vegetation, waterfall, fireflies, lanterns, snow, aurora, mist, fireworks, mountain, pillars, chimney).
- **Options du bloc `relto`** : `source:`, `time:`, `pages: hide|show`, `inscription:` (devise, en D'ni si
  police), `folders:`, `exclude:`, `books:` (choix des livres). Sinon section repliable « Livres » à cases
  (`relto_books` ; `[]` = aucun).
- **Son du refuge** : niveaux Minimal / Zen / Complet, volume du refuge, ♪/🔇 et volume par page.

### Chiffres et écriture D'ni
- Base 25 réelle (exacte au-delà de 16 chiffres). Ordre : police installée (Dni Script…) → fichier local
  `dni-numerals.local.json` → chiffres dessinés. Aucun contour de police fan n'est livré.
- Texte D'ni (si police installée) : noms d'Âges et du refuge, journal, couverture, `inscription:`,
  `` `dni:texte` `` en ligne, bloc `dni`. Le texte est passé en minuscules (la police l'exige).

### Loi du changement
- Une fois l'encre sèche (15 min), modifier un Âge exploré coûte 0,06 par élément (plafond 0,30 par
  édition) ; axe `alteration` (le plus faible domine) ; **guérison** 0,05 par jour. Un renommage n'est pas
  une altération. Avertissement en notice + ligne dans le panneau.

### Autres
- **Page de garde** SVG (onglet *Cover*, commande d'export), **thème cuir** des livres.
- **Journal d'exploration** (voix Atrus / Gehn / Miller, en/fr), bloc `age-journal`, s'écrit à partir des
  notes qui citent l'Âge.
- **Solitude** : pondère le tirage (plus de ruines et de nature, moins d'habitants). *Équilibrée* par
  défaut **change les mondes tirés** par rapport à la 1.3 (*Aucune* = tirage 1.3).
- **Sons** (Web Audio, aucun fichier, démarrage sur clic) : 20 couches (vent, pins, eau, cascade, pluie,
  bourdon, métal, feu, grillons, tonnerre, nappe, carillon, pluck, chœur, pulsation, orgue, sifflement,
  cheminée, parasites, feux d'artifice), gamme et fondamentale propres à chaque Âge ; 16 préréglages.
  Effets : ouverture de livre, **son de liaison en 5 variantes** (calées sur des enregistrements de
  référence, synthèse pure), rafale de parasites. **Garde-fou** : le son s'arrête si la note change, si
  l'onglet se ferme ou passe à l'arrière-plan.

## 3. Commandes et réglages (extension)

**Commandes** : *Open the Relto* · *Create a Relto page* · *Create the exploration journal for this Age* ·
*Save this Age's book cover (SVG)* · *Stop the soundscape* (plus celles de la 1.3).

**Réglages** (section « Extensions ») : langue · chiffres (auto/police/fichier/dessinés) · police (fichier
du coffre ou nom de famille) · afficher les nombres · noms en D'ni · effet de fenêtre + intensité ·
liaisons incertaines · loi du changement · minutes avant que l'encre sèche · guérison par jour · thème
cuir · onglet couverture · mécanismes (dessinés / écrits) · solitude · ambiances sonores · ambiance du
refuge + volume du refuge · volume · dossier des journaux · dossier du refuge.

## 4. Décisions prises (1.4)

- Couche d'extension plutôt que réécriture ; chaque ajout est protégé : s'il échoue, le plugin d'origine
  continue.
- Le son démarre toujours sur un clic ; au refuge, mode zen par défaut (refuge = calme).
- Le petit mont est **derrière la cabane** (pas une chaîne de montagnes).
- Livre-piège : apparence **normale** ; les parasites ne viennent que des dégâts (personne ne toucherait
  un écran brouillé).
- Pages abîmées/arrachées : **la liaison seulement**, nommées `damaged_pages` / `removed_pages`.
- Son de liaison : plusieurs variantes jouées au hasard, jamais deux fois de suite la même.
- Un mot isolé `trap` ne fait pas un piège (il faut `trap book` ou `trap: yes`).
- Le rééquilibrage global des gains des couches a été **refusé** par l'auteur ; seul le mode zen relève
  la nappe et le carillon.

## 5. Vérifié / non vérifié

- ✅ Build sur le vrai `main.js` 1.3.0 (5 ancrages, 9 identifiants) ; `npm run test:real` : loi, i18n
  (en/fr, 59 clés), sons/effets/clés du bloc age/livres, cycle de vie audio (faux AudioContext),
  intégration jsdom sur maquette et sur le vrai moteur ; eslint propre ; rendus Chromium ; audio hors ligne.
- ✅ Essais ponctuels de l'auteur dans Obsidian à chaque livraison.
- ⚠️ Pas encore essayées dans Obsidian : les corrections de la revue (son, garde-fou, fenêtres,
  Relto). Jamais testé : mobile, thème clair, police D'ni installée dans Obsidian.

## 6. En attente

### Proposé à l'auteur (pas encore décidé)
1. Une à deux semaines d'usage réel **sans nouvelle fonction** ; noter ce qui gêne ou ne sert pas.
2. **Fermer la boucle de jeu** : explorer un Âge (l'ouvrir, le citer dans une note) fait avancer une
   progression qui débloque les pages du Relto ; journal comme carnet de voyage ; réparation d'un livre
   rendue visible ; pièges subis notés au journal. Proposition : un schéma de la boucle à valider avant
   de coder.
3. **Reprendre le moteur en sources lisibles**, progressivement (symboles, tirage, prose), pour sortir de
   la greffe sur le minifié.
4. **Publication** (voir ci-dessous) ; passe sur les règles de relecture des plugins communautaires
   (`innerHTML` utilisé pour les SVG).
- Déconseillé pour l'instant : nouvelles pages, sons ou effets.

### Publication (inchangé depuis la 1.3)
- [ ] `LICENSE` (licence et titulaire à choisir).
- [ ] README avec « projet de fan, sans lien avec Cyan Worlds ni approbation de leur part ».
- [ ] Mentions `gifenc` (MIT) et Tracery (licence à vérifier ou remplacer).
- [ ] Rien de Myst/Riven/Uru/Cyan/D'ni dans le nom, l'identifiant, la description, les mots-clés.
- [ ] **Vocabulaire de l'interface** : « Relto », « D'ni », « Descriptive/Linking book » apparaissent dans
  l'interface et les clés YAML → mots neutres par défaut, noms Myst en option ?
- [ ] Brouillons Reddit (r/ObsidianMD, r/Myst) prêts depuis la 1.3, pas postés.

## 7. Limites connues

- Tout repose sur le `main.js` 1.3.0 minifié : une autre version de la base casse les ancrages (le build
  s'arrête en nommant l'ancre).
- Loi du changement rangée par **nom de note** : deux Âges homonymes partagent leur état.
- Étagère du Relto : 30 livres affichés au plus (« +N » au-delà).
- Vue de lecture : une section très loin de l'écran est détachée par Obsidian ; animations et son le
  tolèrent jusqu'à 2 minutes.
- Limites du moteur 1.3 toujours valables (bibliothèque ni tirée ni peinte, pas de rivage, contenu du
  moteur en anglais).

## 8. Pour reprendre le code

```text
base/            main.js, styles.css, manifest.json de la 1.3.0 (jamais modifiés)
src/             couche d'extension (entry, settings-ui, i18n, ui-extras, ui-relto, relto-model,
                 relto-render, linkfx, sound, dni, law, mech, journal, cover, index, util, styles.ext.css)
build.js         ancrages vérifiés + assemblage → dist/
tools/           bundle.js (mini-bundler), package.js (zips), deploy.js (copie dans un coffre)
test/            run.js, *.test.js, integration.js (+ fixture-main.js), visual/ (pages de rendu)
docs/            DEV.md (guide technique), NOTES-v1.4.md (fonctions + corrections), cette reprise
```

```bash
npm install                                  # jsdom, eslint (dev seulement)
npm run build                                # → dist/
npm run test:real                            # tous les tests, y compris sur le vrai moteur
npm run lint
npm run zip                                  # → release/age-writer-<v>.zip (+ -src.zip)
AGE_VAULT=/chemin/du/coffre npm run deploy   # build + copie dans .obsidian/plugins/age-writer/
```

Version : `package.json` (reportée dans le manifest au build). Détails (ancrages, recettes pour ajouter une
page, un son, un effet, une clé du bloc age) : `docs/DEV.md`.

## 9. Fichiers

| Fichier | Statut |
|---|---|
| `age-writer-1.4.0.zip` | plugin à installer (`main.js`, `styles.css`, `manifest.json`) |
| `age-writer-1.4.0-src.zip` | projet complet (sources, base 1.3.0, tests, docs) |
| Projet claude.ai : `v1.4/DEV.md`, `v1.4/NOTES-v1.4.md`, `v1.4/ADDENDUM-reprise-v1.4.md`, cette reprise | documentation |
| `main.js`, `manifest.json`, `styles.css` (racine du projet claude.ai) | la base 1.3.0 |
| `age-writer-reprise-de-contexte.md` | reprise v1.3 (moteur) |
