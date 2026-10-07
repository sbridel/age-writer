# Age Writer — reprise de contexte (v1.7.0) — À LIRE EN PREMIER

> Remplace toutes les reprises précédentes (1.4 à 1.6).
> Reste valable pour le moteur d'origine : `age-writer-reprise-de-contexte.md` (symboles, tirage, réactions, bibliothèque 1.3).
> Détail des fonctions : `v1.7/README.md` (à jour) et `v1.4/NOTES-v1.4.md` (historique des fonctions et corrections).
> Guide technique : `v1.4/DEV.md` (à jour en 1.7 : moteur, hooks, modules, recettes, tests, pièges).

## 0. Prompt de démarrage
> Je reprends Age Writer (plugin Obsidian, JS pur, Projet « ObsidianCraft »). Lis `REPRISE-v1.7.md`, puis `v1.7/RESTORE.md`
> (comment reconstruire les sources depuis le Projet) et `v1.4/DEV.md`. Je parle français ; réponds en français.

## 1. Qui, quoi
- **Auteur** : Alucard, poète francophone, plugins Obsidian en JS pur. Réponses toujours en français.
- **Projet** : « Age Writer » (Projet claude.ai « ObsidianCraft »), inspiré de Mystcraft/Myst. On écrit un Âge dans un bloc `age`, le plugin calcule description, stabilité, fenêtre de liaison, livre, Relto (refuge).
- **Architecture (depuis la 1.7.0)** : plus de patch sur du minifié. Le moteur 1.3.0 a été dé-minifié, renommé et découpé en modules lisibles dans `src/engine/` (registry, rules, draw, resolve, prose, glyphs, analysis, book-view, plugin…). Les anciens ancrages regex sont devenus de vrais appels à `src/engine/hooks.js` (`adjust`, `w`, `written`, `skip`). `src/main.js` assemble moteur + extension. Le `main.js` 1.3.0 d'origine est gardé dans `legacy/` (provenance seulement). Les sources TypeScript d'origine restent perdues, mais plus rien n'est illisible.
- **Deux builds** : `dist/` lisible (non minifié, pour déboguer), `release/` minifié (esbuild, pour installer/publier). `npm test` tourne sur les deux.
- **Non-régression prouvée** : `npm run equiv -- <ancien main.js>` compare 600 Âges au hasard (analyse, glyphes, SVG, texte) entre ancien et nouveau build : 0 différence entre la 1.6.3 livrée et la 1.7.0.
- **Sources complètes** : `v1.7/SOURCES-A-src.txt` (src, moteur compris), `v1.7/SOURCES-B-build-test.txt` (build, tests, tools, docs), `v1.7/legacy/main-1.3.0.min.js`. `v1.7/RESTORE.md` explique la reconstruction.
- **Livrable** : `age-writer-1.7.0-complet.zip` (plugin/age-writer/ minifié, plugin-lisible/, sources/, README). Version dans `package.json`, reportée dans le manifest au build.

## 2. 1.7.0 : dé-minification (7 oct. 2026, soir)
- Moteur dé-minifié (≈190 noms renommés par analyse de portée, 17 modules, `engine/vendor/` pour gifenc et Tracery), ancrages remplacés par des hooks, build à deux sorties, tests sur les deux, `legacy/` pour la provenance. Aucun changement visible pour l'utilisateur.
- Dette restante : les paramètres locaux des fonctions du moteur gardent leurs noms courts (`e`, `o`, `t`…) ; à renommer au fil des retouches.

## 2b. De 1.4.6 à 1.6.3 (même journée)
- **Sons** : 3 bascules indépendantes (son du livre, clic du fermoir, son de liaison). Sémantique : manipuler le livre (ouvrir la vue) ≠ entrer dans l'Âge / toucher un panneau de liaison. Depuis la vue Linking Book, seul le son de liaison joue (`openSequence(..., {book, clasp, link})`, `__quietUntil`).
- **Livre de liaison** : spread à deux pages, **3 feuillets sur la page de droite** (glyphes+texte / fenêtre de liaison / liens), clic page droite = suivant, gauche = précédent, points de navigation, bruit de page (`pageTurn`), sans titre de page, taille ~960×700. Attention : `view.leaf` est pris par Obsidian → utiliser `view.leafPage`.
- **Couverture** plus grande et responsive.
- **Loi du changement** : normalisation `squash` (espaces/casse/sauts de ligne ne comptent plus comme altération).
- **Relto** : 3 onglets discrets en icônes hors de l'image (Vue / Pages / Réglages), nom D'ni dans la bande noire du haut, horloge + heure D'ni qui disparaît au clic et s'efface après ~4 s sauf survol, vue dédiée `age-writer-relto` (commande *open-relto-view*) + vrai plein écran, le son du Relto persiste d'un onglet à l'autre (`watchSound` regarde `.age-relto[data-tab]`), texte de réglages hors de l'image. Pages **gems / or / argent** (souterrain, `drawOre`), plaque de seed retirée du rocher.
- **Réglages** façon Cursor-Smith (API `Setting` classique avec navigation maison par sections à icônes ; **pas** la nouvelle API `getSettingDefinitions`, dit honnêtement à l'auteur). Réglages d'origine du moteur rangés dans « Tirage & bibliothèque » (ex-« Moteur d'origine 1.3 », nom moqué par l'auteur).
- **Guide intégré** (`src/guide.js`) : court + référence approfondie (toutes options, tous blocs), fr/en, modale ; commandes *open-guide*, *open-reference*.
- README à jour + avis honnête sur le niveau du plugin ; manifest passé à 1.6.3.

## 3. Pièges rencontrés (à ne pas refaire)
- `createDiv` n'existe pas en JS pur hors Obsidian → `document.createElement`.
- Règles CSS `:fullscreen` plus spécifiques que `[data-tab]` → règles de masquage explicites.
- Un test d'intégration a failli être livré rouge (classe `--expand` réutilisée) → toujours lancer `npm run test:real` + eslint avant le zip.
- `project_write` exige un `local_path` dans le dossier de travail ; le Projet ne stocke que du texte (pas de zip).
- Harnais visuel : `node test/visual/make.js` + Playwright (`/opt/pw-browsers/chromium`).

## 4. Vérifié / non vérifié
- ✅ Build sur le vrai `main.js` 1.3.0, `npm test`, `npm run test:real`, eslint, rendus Chromium ; essais de l'auteur dans Obsidian à chaque livraison.
- ⚠️ Jamais testé : mobile, thème clair, police D'ni dans le coffre (fichier). Lumière de l'île du Relto = heure de l'ordinateur (pas le yahr D'ni). Numérotation des jours (yahr) = convention du plugin, à comparer au KI d'Uru.

## 5. Décisions durables
- Couche d'extension plutôt que réécriture ; chaque ajout protégé (s'il échoue, le plugin d'origine continue).
- Aucun asset des jeux ni police D'ni embarquée : tout est dessiné/synthétisé (à garder vrai). Son démarre toujours sur clic.
- Pages abîmées/arrachées n'altèrent que la liaison. Livre-piège d'apparence normale. Solitude *Équilibrée* par défaut change les mondes tirés vs 1.3 (*Aucune* = tirage 1.3).
- Projet de fan non officiel (disclaimer prêt). Pas de monétisation tant que le projet porte ces noms. Rééquilibrage global des gains sonores refusé par l'auteur.

## 6. En attente
### Publication (checklist inchangée)
- [ ] `LICENSE` (ex. MIT) + `NOTICE` pour `gifenc` (MIT) et Tracery (licence à vérifier ou remplacer).
- [ ] README public avec « fan project, sans lien avec Cyan Worlds ni approbation ».
- [ ] Nom/identifiant/description/mots-clés : « Age Writer » seul, Myst seulement en texte.
- [ ] Vocabulaire de l'interface : « Relto », « D'ni », « Descriptive/Linking book » → mots neutres par défaut, noms Myst en option ?
- [ ] Passe sur les règles de relecture des plugins communautaires (`innerHTML` pour les SVG).
- [ ] Post Reddit (r/myst puis r/ObsidianMD), texte et 13 captures prêts hors Projet (anciens zips) ; avant de poster : vrai bloc `age` d'exemple (ex. Rime), vrai lien GitHub, « open source » seulement si dépôt public + licence, recapturer l'UI 1.6.
### Idées proposées, non décidées
- Renommer les variables locales du moteur (lisibilité fine) ; fusionner `sky.js`/`wealth.js` de l'extension dans `engine/data/` (ce sont désormais des données du moteur).
- Boucle de jeu (explorer un Âge → progression → pages du Relto, journal comme carnet).
- Lumière du Relto sur le yahr D'ni ; `moons:`/`tilt:` ; export GIF du rendu génératif ; son de liaison par fichier (`link_sound:`) ; voix de journal pour richesses/cicatrices.
- Conseil donné : une à deux semaines d'usage réel sans nouvelle fonction.

## 7. Contenu du Projet claude.ai (après nettoyage)
`REPRISE-v1.7.md` (ce fichier) · `age-writer-reprise-de-contexte.md` (moteur 1.3) · `v1.4/DEV.md` · `v1.4/NOTES-v1.4.md` · `v1.7/` (README, RESTORE, sources, legacy).
