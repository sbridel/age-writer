"use strict";
/**
 * 2.5 (E), le monde se relit (lois 14 Durée, 13 Niches, 11 Enchaînement) : le Livre ne change pas, sa lecture oui.
 * Une horloge par Âge, la propriété `age_written:` de sa note (posée au premier rendu, seulement quand une succession a lieu).
 *
 *   scar     le bois brûlé par la lave (`charred_grove`) : une cicatrice qui se referme (brûlé → jeunes pousses → bois)
 *   regime   le feu de la foudre (`wildfire`) : un régime ; ça brûle, ça repousse, ça rebrûle, par cycles
 *   bare     un sol nu sous un vent qui porte des spores : il se couvre (lichen → mousse → herbe)
 *
 * La vitesse suit le verdict (décision de l'auteur, 31 oct.) : stable, six semaines ; instable, deux fois plus lent, et ça s'arrête
 * à mi-chemin ; mourant, rien ne repousse et le brûlé gagne. Rien ne coûte, rien n'est ajouté à l'analyse : la fenêtre, la fiche
 * et une phrase de la description disent où en est le monde. Fonctions pures.
 */
const DAY = 86400000, WEEKS6 = 42, CYCLE = 56, BURN = 7;
const GREEN = ["seed", "sapling", "fern", "vine", "great_tree", "grove", "ironwood", "grass", "meadow", "flowers", "moss", "lichen", "singing_lichen", "garden", "berry_shrub", "thorn_bush", "heath_shrub", "jungle_world", "crystal_tree"];
const GROUND = ["stone", "sand", "salt", "ash", "basalt", "granite", "chalk", "clay", "silt", "earth", "hills", "mountains", "plains", "canyon"];
const NO_LAND = ["ocean_world", "lava_world", "cavern_world", "frozen_world"];
const clamp = (x) => Math.max(0, Math.min(1, x));

/** La sorte de succession d'un Âge, d'après ce qui est là (`ids` : écrit, tiré, né), ou null. `age` : l'âge du monde (Ga), si la physique le connaît. */
function kindOf(ids, age) {
  const has = (l) => l.some((id) => ids.has(id));
  if (ids.has("charred_grove")) return "scar";
  if (ids.has("wildfire")) return "regime";
  const spores = ids.has("spore_cloud") || (ids.has("wind") && ids.has("spore"));
  if (spores && !has(GREEN) && has(GROUND) && !has(NO_LAND) && !(age != null && age < 0.3)) return "bare";
  return null;
}

/** La date de l'horloge (`age_written:`), lue d'une valeur de propriété ; null si illisible. */
function dateOf(v) { if (v == null || v === "") return null; const t = Date.parse(String(v)); return Number.isFinite(t) ? t : null; }

/**
 * Où en est le monde, `days` jours après l'écriture. Renvoie { kind, t, burning, spread, stage } :
 * t, la repousse (0 rien, 1 refermé) ; burning, le feu est là ; spread, le brûlé qui gagne (monde mourant) ; stage, le stade du sol nu.
 */
function stateOf(kind, verdict, days) {
  if (!kind) return null; days = Math.max(0, days || 0);
  const dying = verdict === "dying", slow = verdict === "unstable", grow = (d) => (dying ? 0 : slow ? Math.min(0.5, d / (WEEKS6 * 2)) : clamp(d / WEEKS6));
  if (kind === "regime") {
    if (dying) return { kind, t: 0, burning: days % CYCLE < BURN, spread: clamp(days / WEEKS6), stage: null };
    const d = days % CYCLE; return { kind, t: d < BURN ? 0 : grow(d - BURN), burning: d < BURN, spread: 0, stage: null };
  }
  const t = grow(days);
  if (kind === "scar") return { kind, t, burning: false, spread: dying ? clamp(days / WEEKS6) : 0, stage: null };
  return { kind, t, burning: false, spread: 0, stage: t <= 0 ? "bare" : t < 1 / 3 ? "lichen" : t < 2 / 3 ? "moss" : "grass" };
}

/** La phrase de la description (anglais : la description l'est) : elle mûrit avec le monde. */
function phraseOf(s) {
  if (!s) return "";
  if (s.kind === "bare") return { bare: "the bare ground waits; the wind brings spores and nothing has taken yet", lichen: "a grey lichen is creeping over the bare stone, where the wind left its spores", moss: "moss has followed the lichen, soft cushions in the cracks of the stone", grass: "grass has come after the moss, and the bare ground is bare no longer" }[s.stage];
  if (s.burning) return "the lightning has set the wood alight again; it will grow back, and burn again";
  if (s.spread > 0) return s.spread < 0.5 ? "nothing grows back in the burnt wood, and the black is spreading" : "the black has spread through the whole wood; nothing grows back";
  if (s.t <= 0) return "the burnt wood stands black and still";
  if (s.t < 0.5) return "green shoots are coming up between the burnt trunks";
  if (s.t < 1) return s.kind === "regime" ? "the burnt wood is growing back, until the next lightning" : "the young trees are closing over the burnt wood";
  return s.kind === "regime" ? "the wood has grown back, until the next lightning" : "the wood has closed over its burn; only the oldest trunks remember it";
}

/** La ligne de la fiche Détails (FR ou EN). */
function noteOf(s, fr) {
  if (!s) return "";
  if (s.kind === "bare") return fr ? { bare: "Le sol nu attend : le vent apporte des spores, rien n'a encore pris.", lichen: "Le lichen gagne la pierre nue.", moss: "La mousse a suivi le lichen.", grass: "L'herbe a suivi la mousse : le sol n'est plus nu." }[s.stage] : { bare: "The bare ground waits: the wind brings spores, nothing has taken yet.", lichen: "Lichen is creeping over the bare stone.", moss: "Moss has followed the lichen.", grass: "Grass has followed the moss: the ground is bare no longer." }[s.stage];
  if (s.burning) return fr ? "La foudre a rallumé le bois : il repoussera, et brûlera encore." : "The lightning has set the wood alight again: it will grow back, and burn again.";
  if (s.spread > 0) return fr ? "Rien ne repousse dans le bois brûlé, et le noir gagne." : "Nothing grows back in the burnt wood, and the black is spreading.";
  if (s.t <= 0) return fr ? "Le bois brûlé se tient noir et immobile." : "The burnt wood stands black and still."; /* jamais de chiffre : tout se dit en phrases */
  if (s.t < 0.5) return fr ? "Des pousses vertes montent entre les troncs brûlés." : "Green shoots are coming up between the burnt trunks.";
  if (s.t < 1) return fr ? "Les jeunes arbres se referment sur le brûlé." : "The young trees are closing over the burn.";
  return fr ? (s.kind === "regime" ? "Le bois a repoussé, jusqu'à la prochaine foudre." : "Le bois s'est refermé sur sa brûlure.") : (s.kind === "regime" ? "The wood has grown back, until the next lightning." : "The wood has closed over its burn.");
}

const daysSince = (written, now) => (written == null ? 0 : Math.max(0, (now - written) / DAY));
module.exports = { DAY, WEEKS6, CYCLE, BURN, kindOf, dateOf, stateOf, phraseOf, noteOf, daysSince };
