"use strict";
// Index des Âges du coffre (mis en cache par date de modification) : verdict, stabilité, liens.
const WX = require("./weather");
/** Le nombre de lignes de météo programmées (`rain: sometimes, dawn`) d'un bloc `age`. */
const weatherPrograms = (src) => { try { const w = WX.parseWeather(src); return w ? Object.keys(w).length : 0; } catch (e) { return 0; } };
/** Le nombre de valeurs physiques écrites (`mass: 0.8`, `age: 3.5`…) d'un bloc `age`. */
const physicsLines = (src) => { try { return Object.keys(require("./physics/index").parsePhysics(src).params || {}).length; } catch (e) { return 0; } };
/** Les réactions de l'Âge, en abrégé : { a, b, shown, type, catalyzed } (le chapitre final regarde celles qui sont bénignes). */
const reactionsOf = (a) => { try { return ((a.resolved && a.resolved.matter && a.resolved.matter.reactions) || []).map((r) => ({ a: r.a, b: r.b, shown: r.shown, type: r.type, catalyzed: !!r.catalyzed })); } catch (e) { return []; } };
class AgeIndex {
  constructor(plugin) { this.p = plugin; this.cache = new Map(); }
  invalidate() { this.cache.clear(); }

  async list() {
    const { app } = this.p, core = this.p.core, out = [], bucket = Math.floor(Date.now() / 3600000);
    const files = app.vault.getMarkdownFiles().filter((f) => { const c = app.metadataCache.getFileCache(f); return !c || (c.sections || []).some((s) => s.type === "code"); });
    /* porter : toutes les sources d'abord, puis les analyses ; sans quoi un Âge lu avant sa source garde un fragment « en attente » jusqu'à l'heure suivante (26 oct. 2026, le chapitre 16 ne se validait pas) */
    const srcs = new Map();
    for (const f of files) {
      const hit = this.cache.get(f.path); if (hit && hit.mtime === f.stat.mtime && hit.bucket === bucket) continue;
      let src = null; try { src = core.extract(await app.vault.cachedRead(f)); } catch (e) { /* illisible */ }
      srcs.set(f.path, src); if (src !== null && this.p.carrySource) this.p.carrySource(f, src);
    }
    for (const f of files) {
      let hit = this.cache.get(f.path);
      if (!hit || hit.mtime !== f.stat.mtime || hit.bucket !== bucket) {
        hit = { mtime: f.stat.mtime, bucket, info: null };
        const src = srcs.has(f.path) ? srcs.get(f.path) : null;
        if (src !== null) try {
          const a = core.analyse(src, { seed: core.seed(f.path), physics: this.p.physicsMode && this.p.physicsMode() === "strict" }); // en facile la physique ne change rien à la stabilité : inutile de la calculer pour toute la bibliothèque
          const back = a.returnTo ? app.metadataCache.getFirstLinkpathDest(a.returnTo, f.path) : null;
          hit.info = { name: f.basename, path: f.path, born: f.stat.ctime || 0, verdict: a.verdict, stability: a.stability, sick: !!(a.scars || (a.resolved && a.resolved.scars) || []).some((x) => x && x.id === "blight"), returnTo: back ? back.basename : a.returnTo || null, links: a.links, glyphs: [...new Set(core.glyphs(a).filter((g) => g.written && !g.blot).map((g) => g.id))], programmed: weatherPrograms(src), physics: physicsLines(src), reactions: reactionsOf(a), carried: (a.carry && a.carry.fragments && a.carry.fragments.length) || 0, contra: (a.carry && a.carry.fragments ? a.carry.fragments.filter((x) => x.contra).length : 0), loop: !!(a.carry && a.carry.loop), carryFrom: [...new Set(((a.carry && a.carry.fragments) || []).map((x) => x.from))] };
        } catch (e) { console.warn("[Age Writer ext] index " + f.path, e); } // un Âge illisible ne vide pas l'étagère
        this.cache.set(f.path, hit);
      }
      if (hit.info) { hit.info.altered = this.p.law && this.p.law.get(f.basename) ? (this.p.law.get(f.basename).log || []).length : 0; out.push(hit.info); } // les modifications faites après séchage (Loi du Changement)
    }
    return out;
  }
}
module.exports = { AgeIndex };
