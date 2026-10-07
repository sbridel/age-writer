"use strict";
/**
 * Couche physique des Âges — point d'entrée (PROTOTYPE, pas encore branché sur le plugin).
 *
 *   physicsOf(analysis, src, seed)      → le monde physique d'une analyse du moteur
 *   applyPhysics(analysis, phys, mode)  → l'analyse retraitée selon le mode :
 *        "off"     rien (comportement actuel)
 *        "easy"    la physique est calculée et jointe (fiche), la stabilité ne bouge pas
 *        "strict"  chaque tension coûte sur son axe, comme une contradiction du moteur
 *
 * Branchement prévu (non fait) : dans src/entry.js, AGEX.adjust appelle applyPhysics après la loi
 * du changement ; AGEX.skip reconnaît PHYS_RE ; l'onglet « Détails » affiche sheet().
 * Voir docs/DESIGN-physique.md.
 */
const { solve, parsePhysics, PHYS_RE, SEV_COST } = require("./solve");
const { sheet, fmt } = require("./text");

const STABLE_AT = 75, UNSTABLE_AT = 40;
/** Plafond du coût physique par axe : la physique éclaire, elle n'écrase pas un monde à elle seule. */
const AXIS_CAP = 0.45;

/** Tous les symboles présents dans une analyse : ciel, matière écrite ou tirée, et ce qui naît des réactions. */
function idsOfAnalysis(analysis) {
  const r = analysis && analysis.resolved; const ids = new Set();
  if (!r) return ids;
  for (const l of r.lines || []) if (l.entry) ids.add(l.entry.id);
  for (const id of (r.matter && r.matter.written) || []) ids.add(id);
  for (const x of (r.matter && r.matter.reactions) || []) { ids.add(x.result); if (x.shown) ids.add(x.shown); }
  return ids;
}

function physicsOf(analysis, src, seed) {
  return solve({ ids: idsOfAnalysis(analysis), src, seed });
}

/** Tensions déjà comptées par le moteur (même bloc, même axe) : on ne les fait pas payer deux fois. */
function alreadyCounted(analysis, t) {
  const trig = (analysis && analysis.resolved && analysis.resolved.triggered) || [];
  return t.ids.some((id) => trig.some((c) => (c.a === id || c.b === id) && (c.axis || "cosmological") === t.axis));
}

function applyPhysics(analysis, phys, mode = "easy") {
  if (!analysis || !phys || mode === "off") return analysis;
  if (mode !== "strict") return { ...analysis, physics: phys };
  const cost = {};
  const counted = phys.tensions.map((t) => {
    const skip = alreadyCounted(analysis, t);
    if (!skip) cost[t.axis] = Math.min(AXIS_CAP, (cost[t.axis] || 0) + SEV_COST[t.severity]);
    return { ...t, counted: !skip };
  });
  const axisStability = { ...analysis.axisStability };
  for (const [axis, c] of Object.entries(cost)) axisStability[axis] = Math.max(0, (axisStability[axis] != null ? axisStability[axis] : 100) - Math.round(c * 100));
  const values = Object.values(axisStability), stability = values.length ? Math.min(...values) : 100;
  const verdict = stability >= STABLE_AT ? "stable" : stability >= UNSTABLE_AT ? "unstable" : "dying";
  return { ...analysis, axisStability, stability, verdict, physics: { ...phys, tensions: counted, axisCost: cost } };
}

module.exports = { PHYS_RE, AXIS_CAP, idsOfAnalysis, physicsOf, applyPhysics, solve, parsePhysics, sheet, fmt };
