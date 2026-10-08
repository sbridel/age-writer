"use strict";
/**
 * Couche physique des Âges — point d'entrée.
 *
 *   physicsOf(analysis, src, seed)      → le monde physique d'une analyse du moteur
 *   applyPhysics(analysis, phys, mode)  → l'analyse retraitée selon le mode :
 *        "off"     rien (comportement actuel)
 *        "easy"    la physique est calculée et jointe (fiche), la stabilité ne bouge pas
 *        "strict"  chaque tension coûte sur son axe, comme une contradiction du moteur
 *
 * Branché en 1.16.0 : src/entry.js (AGEX.adjust → applyPhysicsTo, AGEX.skip → isPhysicsLine),
 * src/ui-extras.js (section « Physique du monde » de l'onglet Détails, via sheet()).
 * Voir docs/DESIGN-physique.md.
 */
const { solve, parsePhysics, PHYS_RE, SEV_COST, isPhysicsLine, isPhysicsStub } = require("./solve");
const { sheet, fmt, plain } = require("./text");
const { setLineInAgeBlock, asLine } = require("./edit");
const { verdictOf } = require("../engine/analysis");
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

function physicsOf(analysis, src, seed, mode = "easy") {
  return solve({ ids: idsOfAnalysis(analysis), src, seed, mode });
}

/**
 * Tension déjà comptée par le moteur : TOUS les blocs qui la portent sont déjà dans une contradiction
 * du moteur sur le même axe (sinon, un bloc nouveau la rend neuve). On ne la fait pas payer deux fois.
 */
function alreadyCounted(analysis, t) {
  const trig = (analysis && analysis.resolved && analysis.resolved.triggered) || [];
  return t.ids.length > 0 && t.ids.every((id) => trig.some((c) => (c.a === id || c.b === id) && (c.axis || "cosmological") === t.axis));
}

/**
 * `severity` (réglage « sévérité de la physique », 0,5 à 2) multiplie le barème et le plafond :
 * 1 = 10 / 20 / 35 points par tension légère / moyenne / forte, au plus 45 points par axe.
 */
function applyPhysics(analysis, phys, mode = "easy", { severity = 1 } = {}) {
  if (!analysis || !phys || mode === "off") return analysis;
  if (mode !== "strict") return { ...analysis, physics: phys };
  const cost = {}, k = Math.max(0, severity), cap = AXIS_CAP * k;
  const counted = phys.tensions.map((t) => {
    const skip = alreadyCounted(analysis, t);
    const c = SEV_COST[t.severity] * k;
    if (!skip) cost[t.axis] = Math.min(cap, (cost[t.axis] || 0) + c);
    return { ...t, counted: !skip, points: skip ? 0 : Math.round(c * 100) };
  });
  const axisStability = { ...analysis.axisStability };
  for (const [axis, c] of Object.entries(cost)) axisStability[axis] = Math.max(0, (axisStability[axis] != null ? axisStability[axis] : 100) - Math.round(c * 100));
  const values = Object.values(axisStability), stability = values.length ? Math.min(...values) : 100;
  const verdict = verdictOf(stability);
  return { ...analysis, axisStability, stability, verdict, physics: { ...phys, tensions: counted, axisCost: cost } };
}

module.exports = { isPhysicsLine, isPhysicsStub, PHYS_RE, AXIS_CAP, idsOfAnalysis, physicsOf, applyPhysics, solve, parsePhysics, sheet, fmt, plain, setLineInAgeBlock, asLine };
