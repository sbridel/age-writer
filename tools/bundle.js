"use strict";
// Mini-bundler : assemble les modules CommonJS de src/ (sous-dossiers compris) dans une seule chaîne JS.
// require("./x") / require("../x") sont résolus dans le paquet, relativement au module qui les appelle ;
// tout le reste (ex. "obsidian") passe au require extérieur.
// `extra` : modules supplémentaires { nom: chemin } (ex. points d'entrée des tests visuels, hors de src/).
const fs = require("fs"), path = require("path");

function walk(dir, rel = "") {
  const out = [];
  for (const f of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? rel + "/" + f.name : f.name;
    if (f.isDirectory()) out.push(...walk(dir, r));
    else if (f.name.endsWith(".js")) out.push([r.replace(/\.js$/, ""), path.join(dir, r)]);
  }
  return out;
}

function bundle(srcDir, entry, { outerRequire = "require", extra = {} } = {}) {
  const files = walk(srcDir);
  for (const [name, p] of Object.entries(extra)) files.push([name, p]);
  const mods = files.map(([name, p]) => `${JSON.stringify(name)}:function(module,exports,require){\n${fs.readFileSync(p, "utf8")}\n}`);
  return `(function(outer){\nvar defs={${mods.join(",\n")}},cache={};\n` +
    `function norm(from,n){ var parts=from.split("/").slice(0,-1).concat(n.split("/")),o=[]; for(var i=0;i<parts.length;i++){ var s=parts[i]; if(s===""||s===".")continue; if(s==="..")o.pop(); else o.push(s);} return o.join("/"); }\n` +
    `function load(id){ if(!cache[id]){ var m={exports:{}}; cache[id]=m; defs[id](m,m.exports,function(n){ if(n.charAt(0)!==".")return outer(n); var t=norm(id,n); if(!defs[t])throw new Error("module introuvable : "+n+" (depuis "+id+")"); return load(t); }); } return cache[id].exports; }\n` +
    `return load(${JSON.stringify(entry)});\n})(${outerRequire})`;
}
module.exports = { bundle };
