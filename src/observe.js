"use strict";
/**
 * Loi 4, Observation (claude/DESIGN-observation.md, 3.1) : un Âge se connaît en le lisant. Une faute se voit selon sa grandeur :
 * la grande tout de suite, la petite avec le temps ou le regard. Le coût se dit toujours ; c'est la cause qui mûrit.
 *
 *   signe     la famille seulement (« une tension dans le vivant »)
 *   symptôme  ce qui se voit, sans nommer le bloc dans le panneau
 *   cause     la phrase entière, avec le bloc
 *
 * L'horloge part du jour où la faute EXISTE (on juge le monde, pas le joueur ; src/law.js, `faults`).
 * La rigueur règle la vitesse (en douce, tout est immédiat) ; le titre accélère (Maître : pas de signe ; Grand Maître : la cause au délai du symptôme) ;
 * le réglage « Lecture du monde » : lente (délais doublés), normale, immédiate.
 * Ne mûrissent que les fautes légères : la maladie du vivant et les cicatrices tirées légères. Stabilité, verdict, coûts : jamais touchés.
 * La fenêtre et le livre disent toujours tout (ce sont les yeux) ; seule la parole mûrit. Fonctions pures.
 */
const { words } = require("./util");

const DAY = 86400000;
/** Jours avant le symptôme, puis avant la cause, selon la rigueur (le signe est là dès l'écriture). */
const DELAYS = { balanced: [1, 3], strict: [2, 7], extreme: [3, 14] };
const SPEED = { slow: 2, normal: 1, immediate: 0 };
const STAGES = ["sign", "symptom", "cause"];

/** [jours avant le symptôme, jours avant la cause], ou null si tout est immédiat. `o` : { rigor, speed, tier }. */
function delays(o) {
  const base = DELAYS[o && o.rigor], k = SPEED[(o && o.speed) || "normal"] ?? 1;
  if (!base || !(k > 0)) return null;
  const [s, c] = base.map((d) => d * k), tier = (o && o.tier) | 0;
  if (tier >= 4) return [0, s]; // Grand Maître : il voit la cause dès le symptôme
  if (tier >= 3) return [0, c]; // Maître : il saute le signe
  return [s, c];
}
/** L'étape d'une faute née à `firstAt` (millisecondes), vue à `now`. */
function stageOf(firstAt, now, o) {
  const d = delays(o); if (!d) return "cause";
  const days = Math.max(0, (now - (firstAt == null ? now : firstAt)) / DAY);
  return days >= d[1] ? "cause" : days >= d[0] ? "symptom" : "sign";
}

/** Le signe d'une cicatrice tirée, par axe : la famille, sans le bloc ni la cause (description, en anglais comme le moteur). */
const SIGN = {
  geological: "something in the ground is not as it should be",
  ecological: "something in the living is not as it should be",
  weather: "the sky is holding something back",
  metaphysical: "something here has gone quiet",
  cosmological: "the sky is not quite right",
};
/** Les fautes qui mûrissent : [{ key, scar }]. La maladie, et les cicatrices tirées légères. */
function faultsOf(r) {
  const out = [];
  for (const x of (r && r.scars) || []) {
    if (x.id === "blight") out.push({ key: x.key || "blight", scar: x });
    else if (x.level === "light") out.push({ key: `scar:${x.id}:${(x.from || []).map((f) => f.a + "+" + f.b).sort().join(",")}`, scar: x });
  }
  return out;
}

/**
 * Donne à chaque faute son étape : les cicatrices (description, lutrin) et la note de la vie (panneau, lutrin). Rend une copie.
 * @param seen { [clé]: première fois vue (millisecondes) } ; @param o { rigor, speed, tier }
 */
function apply(r, seen, now, o) {
  const faults = faultsOf(r); if (!faults.length) return r;
  const LF = require("./life");
  const stage = new Map(faults.map((f) => [f.scar, stageOf(seen && seen[f.key], now, o)]));
  const scars = r.scars.map((x) => {
    const st = stage.get(x); if (!st) return x;
    if (x.id === "blight") return { ...x, stage: st, prose: LF.blightProse({ ...x, stage: st }) };
    return { ...x, stage: st, ...(st === "sign" ? { prose: SIGN[x.axis] || SIGN.geological } : {}) };
  });
  const bl = scars.find((x) => x.id === "blight");
  const life = r.life && bl ? { ...r.life, notes: r.life.notes.map((n) => (n.id === "blight" ? { ...n, stage: bl.stage } : n)) } : r.life;
  return { ...r, scars, resolved: { ...r.resolved, scars }, ...(life ? { life } : {}) };
}

/** Ce que le lutrin dit d'une cicatrice (Maître et au-dessus) selon son étape ; null : rien encore (le signe ne nomme pas). */
function scarLine(x, lv) {
  const st = x.stage || "cause";
  if (st === "sign") return null;
  const head = `${x.id} (${lv[x.level] || x.level})`;
  if (st === "symptom") return head;
  if (x.id === "blight") return `${head} ← ${x.host}`;
  const f = (x.from || [])[0];
  return f ? `${head} ← ${words(f.a)} + ${words(f.b)}` : head;
}

module.exports = { DAY, DELAYS, SPEED, STAGES, SIGN, delays, stageOf, faultsOf, apply, scarLine };
