"use strict";
// Mini-bundler : assemble les modules CommonJS de src/ dans une seule chaîne JS.
// require("./x") est résolu dans le paquet ; tout le reste (ex. "obsidian") passe au require extérieur.
// `extra` : modules supplémentaires { nom: chemin } (ex. points d'entrée des tests visuels, hors de src/).
const fs = require("fs"), path = require("path");

function bundle(srcDir, entry, { outerRequire = "require", extra = {} } = {}) {
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".js")).map((f) => [f.replace(/\.js$/, ""), path.join(srcDir, f)]);
  for (const [name, p] of Object.entries(extra)) files.push([name, p]);
  const mods = files.map(([name, p]) => `${JSON.stringify("./" + name)}:function(module,exports,require){\n${fs.readFileSync(p, "utf8")}\n}`);
  return `(function(outer){\nvar defs={${mods.join(",\n")}},cache={};\n` +
    `function req(n){ if(defs[n]){ if(!cache[n]){ var m={exports:{}}; cache[n]=m; defs[n](m,m.exports,req);} return cache[n].exports;} return outer(n); }\n` +
    `return req(${JSON.stringify("./" + entry)});\n})(${outerRequire})`;
}
module.exports = { bundle };
