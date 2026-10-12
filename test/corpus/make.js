"use strict";
// node test/corpus/make.js            : affiche les écarts avec expected.json
// node test/corpus/make.js --update   : régénère expected.json (à faire dans le commit de la règle qui change un verdict)
const fs = require("fs"), path = require("path");
const ages = require("./ages"), { evaluate } = require("./run-one");
const LEVELS = ["gentle", "balanced", "strict", "extreme"];
const file = path.join(__dirname, "expected.json");
const now = {}; for (const a of ages) { now[a.id] = {}; for (const l of LEVELS) now[a.id][l] = evaluate(a, l); }
if (process.argv.includes("--update")) { fs.writeFileSync(file, JSON.stringify(now, null, 1) + "\n"); console.log(`corpus : ${ages.length} Âges écrits dans expected.json`); }
else module.exports = { now, LEVELS };
