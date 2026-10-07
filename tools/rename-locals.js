#!/usr/bin/env node
"use strict";
/**
 * Renomme les variables locales (paramètres, let/const) d'un module du moteur, sans changer le comportement.
 *   node tools/rename-locals.js <fichier.js> <renommages.json> [--dry]
 * renommages.json : { "fonction": { "e": "age", "o@57": "options" } }
 *   - clé de fonction : nom d'une fonction/const fléchée de premier niveau, ou "Classe.méthode".
 *   - "ancien" : renomme toutes les variables de ce nom DÉCLARÉES dans cette fonction (y compris les callbacks internes)
 *     qui n'ont pas de règle plus précise ; "ancien@LIGNE" : seulement celle déclarée à cette ligne du fichier.
 * Contrôles : le nouveau nom ne doit entrer en collision ni avec une variable visible, ni avec une autre déclarée
 * dans la zone où l'ancienne est utilisée ; sinon le fichier n'est pas modifié et l'erreur dit pourquoi.
 * Outil de développement (nécessite @babel/parser et @babel/traverse : npm i --no-save @babel/parser @babel/traverse).
 */
const fs = require("fs");
let parser, traverse;
try { parser = require("@babel/parser"); traverse = require("@babel/traverse").default; }
catch (e) { parser = require("/tmp/claude-0/dm/node_modules/@babel/parser"); traverse = require("/tmp/claude-0/dm/node_modules/@babel/traverse").default; }

const [, , file, mapFile, flag] = process.argv;
const src = fs.readFileSync(file, "utf8");
const MAP = JSON.parse(fs.readFileSync(mapFile, "utf8"));
const ast = parser.parse(src, { sourceType: "script" });
const edits = new Map(), errors = [], used = new Set();

function keyOf(p) {
  const n = p.node;
  if (p.isFunctionDeclaration() && p.parentPath.isProgram()) return n.id.name;
  if (p.isClassMethod()) { const c = p.parentPath.parentPath; const cn = c.node.id ? c.node.id.name : (c.parentPath.node.id && c.parentPath.node.id.name); return cn + "." + (n.key.name || "constructor"); }
  if ((p.isArrowFunctionExpression() || p.isFunctionExpression()) && p.parentPath.isVariableDeclarator() && p.parentPath.parentPath.parentPath.isProgram()) return p.parentPath.node.id.name;
  return null;
}
function ownerKey(path) { // clé de la fonction « clé » la plus proche (en remontant)
  for (let p = path; p; p = p.parentPath) { if (p.isFunction()) { const k = keyOf(p); if (k) return k; } }
  return null;
}
traverse(ast, {
  Scopable(path) {
    const sc = path.scope; if (sc.path !== path) return;
    for (const [name, b] of Object.entries(sc.bindings)) {
      if (b.kind === "module") continue;
      const key = ownerKey(sc.path.isFunction() && keyOf(sc.path) ? sc.path : sc.path);
      if (!key || !MAP[key]) continue;
      const line = b.identifier.loc.start.line;
      const rules = MAP[key];
      const nw = rules[name + "@" + line] ?? rules[name];
      if (!nw || nw === name) continue;
      used.add(key + ":" + (rules[name + "@" + line] ? name + "@" + line : name));
      // collisions
      let bad = null;
      if (sc.hasBinding(nw, { noGlobals: true }) && sc.getBinding(nw) !== b) bad = "déjà visible";
      sc.path.traverse({ Scopable(q) { if (q.scope !== sc && q.scope.hasOwnBinding(nw)) { const inner = q.scope; // collision seulement si l'ancien nom est utilisé là-dedans
            if (b.referencePaths.some((r) => r.scope === inner || r.findParent((x) => x === inner.path)) || b.constantViolations.some((r) => r.scope === inner)) bad = "masqué par une déclaration interne"; } } });
      if (!bad && sc.hasOwnBinding(nw) && sc.getBinding(nw) !== b) bad = "déjà déclaré ici";
      if (bad) { errors.push(`${key}: ${name}@${line} → ${nw} : ${bad}`); continue; }
      const ids = [b.identifier, ...b.referencePaths.map((r) => r.node)];
      for (const cv of b.constantViolations) { const f = (n) => { if (!n) return; if (n.type === "Identifier" && n.name === name) ids.push(n); else if (n.type === "AssignmentExpression") f(n.left); else if (n.type === "UpdateExpression") f(n.argument); else if (n.type === "ObjectPattern") n.properties.forEach((pp) => f(pp.value || pp.argument)); else if (n.type === "ArrayPattern") n.elements.forEach(f); else if (n.type === "AssignmentPattern") f(n.left); else if (n.type === "VariableDeclaration") n.declarations.forEach((d) => f(d.id)); else if (n.type === "VariableDeclarator") f(n.id); else if (n.type === "FunctionDeclaration") f(n.id); }; f(cv.node); }
      for (const id of ids) edits.set(id.start, { s: id.start, e: id.end, old: name, nw });
    }
  },
  ObjectProperty(p) { if (p.node.shorthand && p.node.value.type === "Identifier") p.node.__sh = p.node.key.name; },
});
// raccourcis d'objet {a} → {a: nouveau}
traverse(ast, { ObjectProperty(p) { if (p.node.shorthand && p.node.value.type === "Identifier") { const e = edits.get(p.node.value.start); if (e && !e.nw.includes(":")) e.nw = p.node.key.name + ": " + e.nw; } } });
for (const k of Object.keys(MAP)) for (const r of Object.keys(MAP[k])) if (!used.has(k + ":" + r) && !errors.some((x) => x.startsWith(k + ": " + r))) errors.push(`${k}: règle « ${r} » sans effet (aucune variable de ce nom déclarée dans cette fonction)`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
let out = src;
for (const e of [...edits.values()].sort((a, b) => b.s - a.s)) { if (out.slice(e.s, e.e) !== e.old) throw new Error("décalage " + e.old); out = out.slice(0, e.s) + e.nw + out.slice(e.e); }
new (require("vm").Script)(out);
if (flag === "--dry") console.log(edits.size + " remplacements (essai à blanc)"); else { fs.writeFileSync(file + ".tmp", out); fs.renameSync(file + ".tmp", file); console.log(edits.size + " remplacements dans " + file); }
