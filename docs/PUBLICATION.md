# Publier Age Writer — état et liste de contrôle

> Préparé le 8 oct. 2026 (1.16.1, branche `textes`). Ce qui est **fait** est déjà dans le dépôt ; ce qui reste demande une décision de l'auteur ou une action hors de la session (GitHub, Obsidian, Reddit).

## Fait

- **Plus aucun `innerHTML`** dans le code du plugin : les 17 poses de balisage (SVG des glyphes, chiffres D'ni, couverture, horloge D'ni) passent par `setMarkup` (`src/util.js`) : `DOMParser` sur un document inerte, retrait des `<script>`, `<iframe>`, `<object>`, `<embed>`, `<foreignObject>`, des attributs `on*` et des liens `javascript:`, puis import des nœuds. Test : `test/markup.test.js`. C'est le premier point que relèvent les relecteurs des plugins communautaires.
- **`manifest.json` à la racine** suit maintenant la version de `package.json` à chaque build (il restait en 1.3.0 : le catalogue lit ce fichier-là) ; **`versions.json`** est créé et tenu à jour (version → `minAppVersion`).
- **`NOTICE`** et **`LICENSES/`** : mentions et textes de licence du code tiers (gifenc, MIT ; Tracery, Apache 2.0 pour le dépôt d'origine, ISC déclaré par le paquet npm `tracery-grammar` : on joint le texte le plus exigeant), avertissement « projet de fan » et marques de Cyan Worlds.
- Vérifications déjà en place : pas de `console.log`, pas de raccourci clavier par défaut, `this.app` partout (pas d'`app` global), pas de `detachLeavesOfType` au déchargement, pas d'API Node/Electron (`fs`, `path`…) dans le plugin, titres de réglages en `setHeading()`, écriture de note par `vault.process`, aucun accès réseau.
- README (anglais et français) : section « Inside the fiction / Dans la fiction », avertissement « projet de fan » en tête.

## À décider par l'auteur

1. **La licence du projet** (fichier `LICENSE`). Proposition : **MIT** (simple, compatible avec gifenc et Tracery, la plus courante pour les plugins Obsidian). Le titulaire : le nom sous lequel tu veux signer (pseudonyme possible). Sans licence, le code n'est pas réutilisable par d'autres, même si le dépôt est public.
2. **La description du manifest** (lue dans le catalogue, 250 caractères au plus, sans « Obsidian » ni Myst). Actuelle : *« Write an Age as a sequence of symbols in a code block; get a rendered panel with a stability reading and generated prose. »* Proposition plus parlante : *« Write a world in a few lines of a code block: get its description, its stability, a living window onto it, a book to link through, and a refuge where your worlds are shelved. »*
3. **Le vocabulaire de l'interface** : « Relto », « D'ni », « Linking book » apparaissent dans l'interface et les clés YAML. Le nom, l'identifiant et la description restent neutres (c'est le plus important). Garder ces mots dans l'interface est défendable (projet de fan déclaré), mais c'est à toi de trancher.
4. **Rendre le dépôt public** (il est privé) : nécessaire pour le catalogue.

## À faire hors de la session

- [ ] Essayer la 1.17.0 dans Obsidian **sur ordinateur, en thème clair d'abord** (c'est celui de l'auteur), puis sombre. Mobile : hors périmètre, `isDesktopOnly: true` dans le manifest (le plugin est pensé pour la souris : zones cliquables fines, sons, canvas animés).
- [ ] Fusionner les PR (#2 dans `physique`, puis #1 dans `main`).
- [x] **Release automatique** (`.github/workflows/release.yml`, sur le modèle de celui de Carnet du Poète) : quand la version de `package.json` change sur `main` (ou par le bouton « Run workflow »), GitHub construit le plugin, lance les tests et le lint, vérifie que `manifest.json` annonce la même version, **atteste la provenance** de `main.js`, `manifest.json` et `styles.css` (`actions/attest-build-provenance`), puis crée le tag (la version, sans `v`) et la release avec ces trois fichiers et la section du journal des changements comme notes. Si la version a déjà son tag, rien ne se passe. Différence avec Carnet du Poète : ici les fichiers ne sont pas dans le dépôt, ils sont construits par le workflow (donc l'attestation certifie qu'ils viennent bien de ce code).
  - L'attestation ne marche que sur un **dépôt public** (ou GitHub Enterprise Cloud) : tant que le dépôt est privé, l'étape est sautée et la release se crée quand même.
  - En fusionnant #1 dans `main` (avec #2 déjà dedans), la release **1.16.1** se créera seule. Les anciennes versions (1.6.3 → 1.16.0) n'auront pas de release : ce n'est pas nécessaire.
  - Pour une prochaine version : changer `version` dans `package.json` (le build met `manifest.json` et `versions.json` à jour), ajouter sa section `## x.y.z` dans `docs/NOTES-historique.md`, fusionner dans `main`.
- [x] **Tests à chaque push et à chaque PR** (`.github/workflows/ci.yml`) : build, tests (lisible et minifié), lint.
- [ ] Vérifier dans GitHub, onglet *Settings → Actions → General*, que les workflows ont le droit d'écrire (« Read and write permissions ») si la création de release échoue faute de droits.
- [ ] Proposer le plugin au catalogue : PR sur `obsidianmd/obsidian-releases` qui ajoute à `community-plugins.json` : `{ "id": "age-writer", "name": "Age Writer", "author": "…", "description": "…", "repo": "sbridel/age-writer" }`. La relecture automatique puis humaine prend de quelques jours à quelques semaines.
- [ ] Supprimer la branche parasite `claude/initial-import`.

## Points que la relecture pourrait encore soulever

- **Styles posés en JavaScript** (13 `el.style.… =` / `setProperty`, surtout pour des tailles et positions calculées : largeur de fenêtre, curseurs, plein écran). Les relecteurs préfèrent les classes CSS ; les valeurs calculées sont en général acceptées. À revoir si la relecture le demande.
- **Taille** : `main.js` fait environ 560 Ko minifié (moteur, physique, rendus, sons). C'est gros pour un plugin mais pas bloquant ; le temps de chargement a été mesuré plus tôt.
- **Code tiers recopié** (`src/engine/vendor/`) : déclaré dans `NOTICE`.

## Brouillon du post (r/myst, puis r/ObsidianMD)

Ton du teaser de ce matin, adapté à une sortie. Les captures à joindre : la fenêtre d'un Âge au rivage, une nuit avec ses lunes, le Relto de nuit, le chat endormi dans la cabane, l'onglet Détails avec la physique.

```
I built an Obsidian plugin for writing Ages, Mystcraft-style — Age Writer

You write an Age in a few lines of a code block: a sun, water, stone, a tree. The plugin reads it back like a Descriptive Book would: a description, a stability (stable, unstable, dying), and a living linking window onto the world — its own sky, shore, night and moons. What you leave unwritten is drawn from the dark, always the same way for the same book. Rewrite a world you've already explored and you damage it.

Worlds follow a simplified physics (star, orbit, core, air, water, light). Easy mode explains what doesn't hold; strict mode makes it cost stability, and suggests the line you could write to fix it.

Your Ages stand on a shelf in your Relto: a floating island with a cabin, a pond, a cat who sleeps by the fire in the evening. Pages you earn by writing change the island.

Everything is local: no network, no AI at runtime, every picture is drawn by code and every sound is synthesized.

Fan project, not affiliated with Cyan Worlds. [link to the repository]
```

N'écrire « open source » que lorsque le dépôt est public **et** a une licence.
