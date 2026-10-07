# Age Writer — addendum à la reprise de contexte (v1.4.0)

> Remplacé par `REPRISE-v1.4.md` (reprise complète et autonome de la v1.4).

À lire avec `age-writer-reprise-de-contexte.md` (v1.3.0, inchangé). Détail des fonctions : `NOTES-v1.4.md`.
Guide technique : `DEV.md`.

## Ce qui change
- **Architecture** : la 1.4 n'est pas une réécriture des sources TypeScript (absentes). C'est une **couche JavaScript** (`src/*.js`, classe `AgeWriterExt extends` le plugin d'origine) que `build.js` greffe sur le `main.js` 1.3.0 rangé dans `base/`, avec 5 retouches ancrées (vérifiées au build) et 9 identifiants récupérés. Chaque ajout est protégé : s'il échoue, le plugin d'origine continue.
- **Projet** : `npm run build | test | test:real | lint | visual | zip | deploy` (voir `README.md`). Plus aucune dépendance à un dossier temporaire.
- **Ajouts** : Relto (pages, déverrouillage, `relto-library`, choix des livres, cheminée, son zen/minimal, volume par page), chiffres base 25 (police → fichier local → dessinés), texte D'ni, page de garde SVG, thème cuir, effets de fenêtre (classique, statique, ondulation, balayage, télé, aléatoire, `fx:` par Âge), loi du Changement (axe `alteration`), `trap book`, `damaged_pages` / `removed_pages` (liaison seule), liaisons incertaines, clic sur la vitre pour se lier, sons de livre et de liaison (5 variantes), journal d'exploration, 11 mécanismes + énigmes, solitude, sons Web Audio avec garde-fou.
- **Décisions** : aucun contour de la police fan n'est livré ; le son démarre sur clic ; un renommage n'est pas une altération ; la solitude *Équilibrée* par défaut **change les mondes tirés** (*Aucune* = tirage 1.3) ; le son de liaison est une synthèse calée sur une référence, sans extrait.

## Vérifié / non vérifié
- ✅ Build sur le vrai `main.js` 1.3.0 et sur une maquette ; tests jsdom (intégration), cycle de vie du son (faux AudioContext), loi, i18n (en/fr), clés du bloc age, eslint ; rendus Chromium ; audio hors ligne (node-web-audio-api).
- ✅ Essais ponctuels dans Obsidian par l'auteur à chaque livraison.
- ⚠️ Non testé : mobile, thème clair, police D'ni installée dans Obsidian.

## En attente
- Publication : LICENSE, README public + disclaimer fan, mentions gifenc et Tracery, nom/description neutres.
- Trancher le vocabulaire de l'interface (Relto, D'ni, Descriptive/Linking book).
