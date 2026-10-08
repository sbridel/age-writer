"use strict";
/**
 * Écrire une piste dans le bloc `age` d'une note : `setLineInAgeBlock(texte de la note, contenu du bloc, clé, valeur)`.
 * Le bloc visé est celui dont le contenu est `blockSrc` (au blanc près) ; la ligne de même clé (alias compris :
 * `âge:` et `age:` sont la même) est remplacée, sinon la ligne est ajoutée à la fin du bloc. Renvoie le nouveau
 * texte, ou `null` si le bloc n'a pas été trouvé (la note a changé entre-temps).
 */
const { KEYS, PHYS_RE } = require("./solve");

const CANON = { insolation: "insolation", orbit: "orbit", age: "age", mass: "mass", atmosphere: "atmosphere", water: "water", rotation: "rotation" };
const norm = (s) => String(s).replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
/** Nombre écrit à la main : deux chiffres significatifs, point décimal (comme le reste du bloc). */
const asLine = (v) => { const t = Number(Number(v).toPrecision(2)); return t >= 100 ? String(Math.round(t)) : String(t); };

function setLineInAgeBlock(text, blockSrc, key, value) {
  const canon = CANON[key] || key, want = norm(blockSrc);
  const re = /(```age[ \t]*\r?\n)([\s\S]*?)(```)/g;
  let m;
  while ((m = re.exec(text))) {
    if (norm(m[2]) !== want) continue;
    const body = m[2].replace(/\r/g, "");
    const lines = body.split("\n");
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    const line = `${canon}: ${asLine(value)}`;
    const k = lines.findIndex((l) => { const x = l.match(PHYS_RE); return x && KEYS[x[1].toLowerCase()] === canon; });
    if (k >= 0) lines[k] = line; else lines.push(line);
    const nb = lines.join("\n") + "\n";
    return text.slice(0, m.index) + m[1] + nb + m[3] + text.slice(m.index + m[0].length);
  }
  return null;
}

module.exports = { setLineInAgeBlock, asLine };
