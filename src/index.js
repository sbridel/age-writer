"use strict";
// Index des Âges du coffre (mis en cache par date de modification) : verdict, stabilité, liens.
const WX = require("./weather");
/** Le nombre de lignes de météo programmées (`rain: sometimes, dawn`) d'un bloc `age`. */
const weatherPrograms = (src) => { try { const w = WX.parseWeather(src); return w ? Object.keys(w).length : 0; } catch (e) { return 0; } };
class AgeIndex {
  constructor(plugin) { this.p = plugin; this.cache = new Map(); }
  invalidate() { this.cache.clear(); }

  async list() {
    const { app } = this.p, core = this.p.core, out = [], bucket = Math.floor(Date.now() / 3600000);
    for (const f of app.vault.getMarkdownFiles()) {
      const c = app.metadataCache.getFileCache(f);
      if (c && !(c.sections || []).some((s) => s.type === "code")) continue;
      let hit = this.cache.get(f.path);
      if (!hit || hit.mtime !== f.stat.mtime || hit.bucket !== bucket) {
        hit = { mtime: f.stat.mtime, bucket, info: null };
        let src = null; try { src = core.extract(await app.vault.cachedRead(f)); } catch (e) { /* illisible */ }
        if (src !== null) try {
          const a = core.analyse(src, { seed: core.seed(f.path), physics: this.p.physicsMode && this.p.physicsMode() === "strict" }); // en facile la physique ne change rien à la stabilité : inutile de la calculer pour toute la bibliothèque
          const back = a.returnTo ? app.metadataCache.getFirstLinkpathDest(a.returnTo, f.path) : null;
          hit.info = { name: f.basename, path: f.path, verdict: a.verdict, stability: a.stability, returnTo: back ? back.basename : a.returnTo || null, links: a.links, glyphs: [...new Set(core.glyphs(a).filter((g) => g.written && !g.blot).map((g) => g.id))], programmed: weatherPrograms(src) };
        } catch (e) { console.warn("[Age Writer ext] index " + f.path, e); } // un Âge illisible ne vide pas l'étagère
        this.cache.set(f.path, hit);
      }
      if (hit.info) out.push(hit.info);
    }
    return out;
  }
}
module.exports = { AgeIndex };
