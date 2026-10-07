"use strict";
// Index des Âges du coffre (mis en cache par date de modification) : verdict, stabilité, liens.
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
          const a = core.analyse(src, { seed: core.base(f.path) });
          const back = a.returnTo ? app.metadataCache.getFirstLinkpathDest(a.returnTo, f.path) : null;
          hit.info = { name: f.basename, path: f.path, verdict: a.verdict, stability: a.stability, returnTo: back ? back.basename : a.returnTo || null, links: a.links };
        } catch (e) { console.warn("[Age Writer ext] index " + f.path, e); } // un Âge illisible ne vide pas l'étagère
        this.cache.set(f.path, hit);
      }
      if (hit.info) out.push(hit.info);
    }
    return out;
  }
}
module.exports = { AgeIndex };
