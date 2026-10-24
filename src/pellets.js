"use strict";
/**
 * Les granulés pour la caverne (claude/DESIGN-reve-et-caverne-bahro.md, étape 4a). Pur.
 *
 * Deux usages du même granulé, bien séparés : le bloc `pellet` écrit dans un Âge nourrit sa vie (src/life.js : « le
 * granulé se dissout lentement et nourrit ce qui pousse autour ») ; et un Âge qui le nourrit bien **en cuit un de plus,
 * par jour, pour le Relto** : celui qu'on lâchera dans le puits de la caverne.
 *
 * La recette, c'est l'Âge (les proportions de Noloben deviennent celles du sol) : un granulé est **bon** quand quelque
 * chose pousse, qu'il n'est pas trop dosé, et que le sol écrit est **solide, fertile et humide à la fois, sans qu'une
 * qualité écrase les autres**. Trop dosé (`many: pellet`, il brûle les racines) : un granulé **raté**, qui flottera et
 * fumera en vert. Sol déséquilibré, rien qui pousse, pas de granulé écrit : rien. On ne dit jamais la recette.
 */
const LF = require("./life");
const DAY = 86400000;

/** La qualité du granulé qu'un Âge cuit : "good", "bad" ou null. `present` : ses blocs ; `factor(id)` : la quantité écrite (1 par défaut). */
function qualityOf(present, factor = () => 1) {
  if (!present || !present.has("pellet")) return null;
  if (!LF.ROLES.producer.some((id) => present.has(id))) return null; /* rien ne pousse : le granulé ne se dissout pas */
  if (factor("pellet") > 1) return "bad"; /* trop dosé : il brûle les racines, et le granulé qu'il cuit est raté */
  const soils = Object.keys(LF.SOIL).filter((id) => present.has(id)); if (!soils.length) return null;
  const sum = soils.reduce((a, id) => ({ sol: a.sol + LF.SOIL[id].sol, fer: a.fer + LF.SOIL[id].fer, hum: a.hum + LF.SOIL[id].hum }), { sol: 0, fer: 0, hum: 0 });
  const v = [sum.sol, sum.fer, sum.hum], lo = Math.min(...v), hi = Math.max(...v);
  return lo >= 2 && hi <= lo * 2 ? "good" : null; /* solide, fertile, humide, et aucune qualité ne vaut plus du double d'une autre */
}

/** L'état des granulés (créé à la demande) : { good, bad, last: { [Âge]: jour } }. */
function stateOf(ext) {
  if (!ext.pellets || typeof ext.pellets !== "object") ext.pellets = { good: 0, bad: 0, last: {} };
  if (!ext.pellets.last || typeof ext.pellets.last !== "object") ext.pellets.last = {};
  return ext.pellets;
}

/**
 * Un Âge est lu (pas un essai) : s'il cuit un granulé et n'en a pas déjà cuit aujourd'hui, il va sur l'étagère.
 * Renvoie "good", "bad" ou null (rien de neuf aujourd'hui). Jamais rétroactif : un jour sans lecture ne cuit rien.
 */
function cook(ext, age, quality, now) {
  if (!quality || !age) return null;
  const st = stateOf(ext), day = Math.floor(now / DAY);
  if (st.last[age] === day) return null;
  st.last[age] = day; st[quality] = (st[quality] || 0) + 1;
  return quality;
}
/** A-t-il cuit aujourd'hui ? (la ligne de l'onglet Détails) "good", "bad" ou null. */
function cookedToday(ext, age, quality, now) { const st = ext && ext.pellets; return st && st.last && st.last[age] === Math.floor(now / DAY) ? quality : null; }

module.exports = { qualityOf, stateOf, cook, cookedToday, DAY };
