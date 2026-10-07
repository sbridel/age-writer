"use strict";
/**
 * Loi du Changement : on ne crée pas un monde, on se lie à un monde qui existe.
 * Quand l'encre d'un Âge a séché (il est resté inchangé assez longtemps), le modifier
 * l'abîme : son instabilité monte, puis redescend lentement si on le laisse en paix.
 *
 * L'état est un simple objet sérialisable : { ages: { [nom]: { ids, changedAt, extra, at, log } } }
 */
const { clamp, words } = require("./util");

const DAY = 86400000;
const COST_PER_ELEMENT = 0.06, COST_CAP_PER_EDIT = 0.3;

/** Les lignes inconnues sont comparées sans tenir compte des espaces (même insécables), des caractères invisibles ni de la casse :
 *  un saut de ligne ou une espace de fin n'est pas une modification du monde. */
const squash = (x) => (x[0] === "?" ? "?" + x.slice(1).normalize("NFC").replace(/[\s\u00a0\u200b-\u200d\u2060\ufeff]+/g, " ").trim().toLowerCase() : x);

/** Éléments qui composent le monde résolu (indépendants de la façon dont ils ont été écrits). */
function worldIds(analysis) {
  const r = analysis.resolved, s = new Set();
  for (const l of r.lines) { if (l.entry) s.add(l.entry.id); else if (l.unknown) { const k = squash("?" + l.raw); if (k.length > 1) s.add(k); } }
  for (const id of r.matter.written) s.add(id);
  for (const x of r.matter.reactions) s.add(x.result);
  return [...s].sort();
}

class Law {
  /**
   * @param {object} state  objet persistant (muté)
   * @param {{dryMinutes:()=>number, healPerDay:()=>number, now?:()=>number}} o
   */
  constructor(state, o) {
    this.state = state; if (!this.state.ages) this.state.ages = {};
    this.o = o; this.now = o.now || (() => Date.now());
  }
  get(name) { return this.state.ages[name]; }

  /** Instabilité supplémentaire actuelle (0..1), après guérison. */
  effective(name) {
    const a = this.get(name); if (!a || !(a.extra > 0)) return 0;
    const days = Math.max(0, (this.now() - a.at) / DAY);
    return clamp(a.extra - this.o.healPerDay() * days);
  }

  /**
   * À appeler quand la note d'un Âge est lue/modifiée.
   * @returns {null | {added:string[], removed:string[], cost:number, extra:number, message:string}}
   */
  observe(name, analysis, mtime) {
    const ids = worldIds(analysis), now = this.now();
    let a = this.get(name);
    if (a) a.ids = [...new Set(a.ids.map(squash))].sort(); // états enregistrés avec l'ancienne écriture
    if (!a) { this.state.ages[name] = { ids, changedAt: mtime || now, extra: 0, at: now, log: [] }; return null; }
    const same = ids.length === a.ids.length && ids.every((v, i) => v === a.ids[i]);
    if (same) return null;
    const dry = this.o.dryMinutes();
    const wasDry = dry > 0 && now - a.changedAt >= dry * 60000;
    const added = ids.filter((x) => !a.ids.includes(x)), removed = a.ids.filter((x) => !ids.includes(x));
    let out = null;
    if (wasDry) {
      const cost = Math.min(COST_CAP_PER_EDIT, COST_PER_ELEMENT * (added.length + removed.length));
      const before = this.effective(name);
      a.extra = clamp(before + cost); a.at = now;
      a.log.push({ t: now, added, removed, cost });
      if (a.log.length > 20) a.log.shift();
      out = { added, removed, cost, extra: a.extra };
    }
    a.ids = ids; a.changedAt = now;
    return out;
  }

  /** Un renommage change le monde tiré (la graine vient du nom) : ce n'est pas une altération. */
  rename(oldName, newName, analysis) {
    const a = this.get(oldName); if (!a) return;
    delete this.state.ages[oldName];
    a.ids = worldIds(analysis); a.changedAt = this.now();
    this.state.ages[newName] = a;
  }
  forget(name) { delete this.state.ages[name]; }
  log(name) { const a = this.get(name); return a ? a.log : []; }
}

/** Applique l'altération à une analyse du moteur : un axe « alteration » s'ajoute et peut dominer. */
function adjustAnalysis(r, extra) {
  if (!r || !(extra > 0.001)) return r;
  const v = clamp(Math.round(100 - extra * 100), 0, 100);
  r.axisStability = { ...r.axisStability, alteration: Math.min(v, r.axisStability.alteration ?? 100) };
  const min = Math.min(...Object.values(r.axisStability));
  r.stability = min;
  r.verdict = min >= 75 ? "stable" : min >= 40 ? "unstable" : "dying";
  r.alteration = extra;
  return r;
}

/** « heat » devient « rain » : décrit une modification. */
function describeChange(entry, t) {
  const q = (x) => words(x.replace(/^\?/, "")); // les guillemets viennent des phrases traduites
  const parts = [];
  const n = Math.min(entry.added.length, entry.removed.length);
  for (let i = 0; i < n; i++) parts.push(t("law.became", { a: q(entry.removed[i]), b: q(entry.added[i]) }));
  for (const x of entry.removed.slice(n)) parts.push(t("law.removed", { a: q(x) }));
  for (const x of entry.added.slice(n)) parts.push(t("law.added", { a: q(x) }));
  return parts.join(" ");
}

module.exports = { Law, worldIds, adjustAnalysis, describeChange, COST_PER_ELEMENT };
