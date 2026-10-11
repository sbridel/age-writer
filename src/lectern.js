"use strict";
/**
 * Le lutrin du Relto (claude/PLAN-ecrire-au-relto.md) : ce qu'on lit d'un Âge qu'on vient d'écrire, selon son titre d'écrivain.
 * Même analyse que le panneau, mais montrée par couches : un Apprenti voit la description, le verdict en mots et l'alerte la plus grave ;
 * chaque titre ajoute une couche. Le panneau classique reste complet. Le filtre ne change ni la stabilité ni les règles. Fonctions pures.
 *
 *   tier 0 Apprenti        description, verdict en mots, glyphes reconnus, UNE alerte (la plus grave)
 *   tier 1 Scribe          toutes les alertes (contradictions, lois de la vie et du sol, voûte), lignes inconnues
 *   tier 2 Seltahn aguerri le dosage en mots, la profondeur
 *   tier 3 Maître          la famille de chaque alerte, l'étendue, la charge, les réactions et leurs ingrédients
 *   tier 4 Grand Maître    tout, avec les coûts par axe en points
 */
const LF = require("./life");
const SEV = { strong: 3, medium: 2, light: 1 };
const SOIL_NOTES = ["weakGround", "noEarth", "tiredVault"];

const VERDICT = {
  en: { stable: "It holds.", unstable: "It wavers.", dying: "It is dying." },
  fr: { stable: "Il tient.", unstable: "Il vacille.", dying: "Il se meurt." },
};
const LABEL = {
  en: { unknown: "Not understood", family: { physics: "physics", soil: "soil", life: "life", extent: "extent", balance: "balance" }, react: "from", cost: "cost", points: "points", alert: "tension" },
  fr: { unknown: "Non compris", family: { physics: "physique", soil: "sol", life: "vie", extent: "étendue", balance: "équilibre" }, react: "de", cost: "coût", points: "points", alert: "tension" },
};

const idsOf = (a) => [...new Set((a && a.resolved && a.resolved.lines ? a.resolved.lines : []).filter((l) => l.entry && !l.unknown).map((l) => l.entry.id))];

/** Les alertes d'un Âge, de la plus grave à la moins grave : { text, rank, fam }. */
function alertsOf(a, fr) {
  const out = [], L = LABEL[fr ? "fr" : "en"];
  for (const c of (a && a.resolved && a.resolved.triggered) || []) {
    const note = Array.isArray(c.note) ? c.note[0] : c.note;
    out.push({ text: note || `${L.alert} : ${c.a} / ${c.b}`, rank: SEV[c.severity] || 1, fam: "physics", key: c.a + "|" + c.b });
  }
  for (const n of (a && a.life && a.life.notes) || []) {
    const t = LF.TEXT[n.id] || (n.id.startsWith("vault") ? null : null); if (!t) continue;
    out.push({ text: t[fr ? 1 : 0], rank: n.cost > 0 ? 2 : 1, fam: SOIL_NOTES.includes(n.id) ? "soil" : "life", key: "life|" + n.id });
  }
  // une même phrase de monde-type peut revenir pour plusieurs blocs : on ne la dit qu'une fois
  const seen = new Set(), uniq = out.filter((x) => (seen.has(x.text) ? false : (seen.add(x.text), true)));
  return uniq.sort((x, y) => y.rank - x.rank);
}

/**
 * @param a   l'analyse (avec `life` et `dosage` si présents)
 * @param o   { tier 0..4, fr, prose: la description, dosage: la ligne du dosage, depth: la phrase de profondeur }
 * @returns { verdict, prose, glyphs: [id], lines: [{ kind, text, fam? }] } ; jamais un chiffre avant le Grand Maître
 */
function readOut(a, o) {
  if (!a) return null;
  const fr = !!(o && o.fr), tier = Math.max(0, Math.min(4, (o && o.tier) | 0)), L = LABEL[fr ? "fr" : "en"], lines = [];
  const alerts = alertsOf(a, fr);
  const shown = tier >= 1 ? alerts : alerts.slice(0, 1);
  for (const x of shown) lines.push({ kind: "alert", text: x.text, fam: tier >= 3 ? x.fam : undefined });
  if (tier >= 1) {
    const unk = ((a.resolved && a.resolved.lines) || []).filter((l) => l.unknown).map((l) => l.raw).filter(Boolean);
    if (unk.length) lines.push({ kind: "unknown", text: `${L.unknown} : ${unk.slice(0, 4).join(", ")}` });
  }
  if (tier >= 2) {
    if (o && o.dosage) lines.push({ kind: "dose", text: o.dosage });
    if (o && o.depth) lines.push({ kind: "depth", text: o.depth });
  }
  if (tier >= 3) {
    for (const re of ((a.resolved && a.resolved.matter && a.resolved.matter.reactions) || []).slice(0, 6)) if (re && re.result && re.a && re.b) lines.push({ kind: "reaction", text: `${re.result} ← ${re.a} + ${re.b}` });
    const rich = Object.keys((a.dosage && a.dosage.richness) || {});
    if (rich.length) lines.push({ kind: "balance", text: rich.join(", "), fam: "balance" });
  }
  if (tier >= 4) {
    const pts = Object.entries(a.axisStability || {}).filter(([, v]) => v < 100).map(([k, v]) => `${k} −${100 - v}`);
    if (pts.length) lines.push({ kind: "cost", text: `${L.cost} (${L.points}) : ${pts.join(" · ")}` });
  }
  return { verdict: VERDICT[fr ? "fr" : "en"][a.verdict] || "", prose: String((o && o.prose) || ""), glyphs: idsOf(a), lines, tier, familyLabel: L.family };
}

module.exports = { SEV, VERDICT, LABEL, alertsOf, readOut };
