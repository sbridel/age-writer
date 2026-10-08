"use strict";
/**
 * Écrire une piste dans le bloc `age` d'une note : `setLineInAgeBlock(texte de la note, contenu du bloc, clé, valeur)`.
 * Le bloc visé est celui dont le contenu est `blockSrc` (au blanc près), y compris dans une citation ou un encadré
 * (`> ```age`). La ligne de même clé est remplacée en gardant le mot de l'auteur (`âge:` reste `âge:`), sinon la
 * ligne est ajoutée à la fin du bloc. Les fins de ligne de la note (LF ou CRLF) sont gardées.
 * Renvoie le nouveau texte, ou `null` si le bloc n'a pas été trouvé (la note a changé entre-temps).
 */
const { KEYS, PHYS_RE } = require("./solve");

const norm = (s) => String(s).replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
/** Nombre écrit dans le bloc : au plus quatre chiffres significatifs, point décimal (comme le reste du bloc). */
const asLine = (v) => { const t = Number(Number(v).toPrecision(4)); return t >= 100 ? String(Math.round(t)) : String(t); };

function setLineInAgeBlock(text, blockSrc, key, value) {
  const eol = /\r\n/.test(text) ? "\r\n" : "\n";
  const lines = String(text).split(/\r?\n/), want = norm(blockSrc);
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^(\s*(?:>\s?)*)```age\s*$/); if (!open) continue;
    const prefix = open[1], strip = (l) => (l.startsWith(prefix) ? l.slice(prefix.length) : l.replace(/^\s*(?:>\s?)*/, ""));
    let j = i + 1; while (j < lines.length && !/^```\s*$/.test(strip(lines[j]).trim())) j++;
    if (j >= lines.length) return null;
    const body = lines.slice(i + 1, j).map(strip);
    if (norm(body.join("\n")) !== want) { i = j; continue; }
    const k = body.findIndex((l) => { const x = l.match(PHYS_RE); return x && KEYS[x[1].toLowerCase()] === key; });
    if (k >= 0) {
      const word = body[k].match(PHYS_RE)[1], indent = body[k].match(/^\s*/)[0];
      lines[i + 1 + k] = prefix + `${indent}${word}: ${asLine(value)}`;
    } else lines.splice(j, 0, prefix + `${key}: ${asLine(value)}`);
    return lines.join(eol);
  }
  return null;
}

module.exports = { setLineInAgeBlock, asLine };
