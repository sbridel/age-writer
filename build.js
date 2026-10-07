#!/usr/bin/env node
"use strict";
/**
 * Construit la version étendue du plugin à partir du main.js d'origine (1.3.0, dans base/).
 *   npm run build                                   → base/main.js → dist/
 *   node build.js [chemin/vers/main.js] [sortie]     → autre base, autre dossier
 * Lit à côté de main.js : styles.css et manifest.json (version reprise de package.json). N'écrase jamais l'original.
 * Chaque point d'ancrage est vérifié : une ancre absente ou ambiguë arrête la construction avec un message clair.
 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const { bundle } = require("./tools/bundle");
const SKY = require("./src/sky"), WEALTH = require("./src/wealth");

function build(srcJs, { log = () => {} } = {}) {
  let js = srcJs;
  const found = {};
  const once = (name, re, fn) => {
    const m = [...js.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))];
    if (m.length !== 1) throw new Error(`Ancre « ${name} » : ${m.length} correspondance(s), 1 attendue. Le main.js n'a pas la forme attendue (version différente ?).`);
    js = js.slice(0, m[0].index) + fn(m[0], found) + js.slice(m[0].index + m[0][0].length);
    log(`  ok  ${name}`);
  };
  const grab = (name, re, key) => {
    const m = [...js.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))];
    if (m.length !== 1) throw new Error(`Identifiant « ${name} » : ${m.length} correspondance(s), 1 attendue.`);
    found[key] = m[0][1]; log(`  id  ${name} = ${m[0][1]}`);
  };

  if (!js.startsWith('"use strict";')) throw new Error('main.js ne commence pas par "use strict";');
  if (js.includes("__AGEX")) throw new Error("main.js contient déjà l'extension : partez du fichier d'origine.");

  // 1. loi du Changement : l'analyse d'un Âge passe par AGEX.adjust
  once("analyse()", /function (\w+)\((\w),(\w)\)\{let (\w)=(\w+)\(\2,\3\),(\w)=\{\};for\(let\[(\w),(\w)\]of Object\.entries\(\4\.costByAxis\)\)/,
    (m, f) => { const [all, N, e, o] = m; f.analyse = N; return `function ${N}(${e},${o}){__AGEX.src=${e};try{return __AGEX.adjust(__orig_${N}(${e},${o}),${o},${e})}finally{__AGEX.src=null}}function __orig_${N}(${e},${o}){${all.slice(all.indexOf("{") + 1)}`; });

  // 2. solitude : poids du tirage
  once("tirage « one »", /(\w+)\.options\.map\((\w)=>(\w)\(\2\)\?\2\.weight\*(\w)\(\2\.id\):0\)/,
    (m) => `${m[1]}.options.map(${m[2]}=>${m[3]}(${m[2]})?__AGEX.w(${m[1]}.name,${m[2]})*${m[4]}(${m[2]}.id):0)`);
  once("tirage « each »", /for\(let (\w) of (\w)\.options\)\{let (\w)=(\w)\(\);if\((\w)\.has\(\1\.id\)\)continue;let (\w)=\1\.weight\*(\w)\(\1\.id\);/,
    (m) => `for(let ${m[1]} of ${m[2]}.options){let ${m[3]}=${m[4]}();if(${m[5]}.has(${m[1]}.id))continue;let ${m[6]}=__AGEX.w(${m[2]}.name,${m[1]})*${m[7]}(${m[1]}.id);`);

  // 2b. livre-piège : la fissure est « répondue » avant le tirage (sinon le moteur en tire une que le pied de bloc nie ensuite)
  once("tirage : questions déjà répondues", /\(\{written:(\w+),seed:/, (m) => `({written:__AGEX.written(${m[1]}),seed:`);

  // 3. les lignes de mécanisme ne sont ni des symboles inconnus ni des pages
  once("analyseur : lignes de mécanisme", /(\w)===""\|\|(\w)\.startsWith\("#"\)\)continue;let (\w)=\2\.match\(\/\^seed\\s\*:/,
    (m) => `${m[1]}===""||${m[2]}.startsWith("#")||__AGEX.skip(${m[2]}))continue;let ${m[3]}=${m[2]}.match(/^seed\\s*:`);
  once("écrivain de pages : lignes de mécanisme", /!\/\^\(link\|return\|panel\|seed\)\\s\*:\/i\.test\((\w)\)&&/,
    (m) => `${m[0]}!__AGEX.skip(${m[1]})&&`);

  // 3b. ciel étendu : blocs (non tirés), règles ciel↔vivant, phrases de description
  once("blocs de ciel", /proseTag:"#starfall#"\}\],qt=/, () => 'proseTag:"#starfall#"},...__AGEX.sky],qt=');
  once("règles ciel↔vivant", /gt\.push\(\.\.\.\$r\);/, () => "gt.push(...$r);gt.push(...__AGEX.rules);");
  once("blocs de matière", /var (\w+)=\[\.\.\.Vt,\.\.\.Kt,\.\.\.Qt,\.\.\.ii,\.\.\.si,\.\.\.li\]/, (m) => `var ${m[1]}=[...Vt,...Kt,...Qt,...ii,...si,...li,...__AGEX.matter]`);
  once("phrases de ciel", /var Si=\{lone_star:/, () => "var Si={...__AGEX.prose,lone_star:");

  // 4. identifiants exposés à l'extension
  grab("extract", /function (\w+)\(e\)\{let o=\[\.\.\.e\.matchAll\(\/```age\[ \\t\]\*/, "extract");
  grab("base (nom de fichier)", /function (\w+)\(e\)\{return e\.replace\(\/\^\.\*\\\/\/,""\)\.replace\(\/\\\.md\$\/i,""\)\}/, "base");
  grab("glyphSvg", /function (\w+)\(e,o,t,i,r="none"\)\{let s=i\/100/, "glyphSvg");
  grab("prose", /function (\w+)\(e\)\{let o=\w+\.createGrammar\(/, "prose");
  grab("glyphs", /function (\w+)\(e,o=!1\)\{let t=e\.resolved,i=new Map;/, "glyphs");
  grab("blocks (Map)", /(\w+)=new Map,\w+=new Set,\w+=\(e,o\)=>\[e,o\]\.sort\(\)\.join\("\+"\)/, "blocks");
  grab("BookView", /(\w+)=class extends \w+\.ItemView\{/, "BookView");
  grab("SettingsTab", /(\w+)=class extends \w+\.PluginSettingTab\{/, "SettingsTab");

  // 5. la classe exportée devient la classe étendue
  once("export par défaut", /\(\w+,\{default:\(\)=>(\w+)\}\);module\.exports=/, (m, f) => { f.base_class = m[1]; return m[0].replace(`default:()=>${m[1]}`, "default:()=>__AGEX_CLASS"); });

  // les blocs et règles de ciel sont des données : posées dans __AGEX avant tout le reste (le moteur les lit en s'initialisant)
  const skyData = `matter:${JSON.stringify(WEALTH.MATTER_BLOCKS)},sky:${JSON.stringify(SKY.SKY_BLOCKS)},rules:(function(){var N=${JSON.stringify(SKY.NOTES)};return ${JSON.stringify(SKY.SKY_RULES)}.map(function(r){return{sky:r.sky,with:r.with,severity:r.severity,axis:r.axis,note:N[r.note]}})})(),prose:${JSON.stringify(SKY.SKY_PROSE)}`;
  js = `"use strict";var __AGEX={src:null,written:function(s){return s},adjust:function(r){return r},w:function(s,o){return o.weight},skip:function(){return false},${skyData}};` + js.slice('"use strict";'.length);
  return { js, found };
}

function assemble(srcJs, srcDir, opts = {}) {
  const { js, found } = build(srcJs, opts);
  const f = found;
  const core = `{analyse:${f.analyse},extract:${f.extract},base:${f.base},glyphSvg:${f.glyphSvg},prose:${f.prose},glyphs:${f.glyphs},blocks:${f.blocks},BookView:${f.BookView},SettingsTab:${f.SettingsTab}}`;
  const code = bundle(path.join(srcDir, "src"), "entry");
  const tail = `\n/* ---- extension (Relto, chiffres, loi du changement, journal, mécanismes, sons) ---- */\nvar __AGEX_CLASS=(${code})(${f.base_class},${core},__AGEX);\n`;
  return js.replace(/\s*$/, "\n") + tail;
}

if (require.main === module) {
  // node build.js [main.js d'origine = base/main.js] [dossier de sortie = dist]
  const here = __dirname;
  const [, , input = path.join(here, "base", "main.js"), out = path.join(here, "dist")] = process.argv;
  const dir = path.dirname(path.resolve(input));
  const version = JSON.parse(fs.readFileSync(path.join(here, "package.json"), "utf8")).version;
  try {
    console.log("Ancrages :");
    const result = assemble(fs.readFileSync(input, "utf8"), here, { log: (s) => console.log(s) });
    new vm.Script(result, { filename: "main.js" }); // erreur de syntaxe ⇒ arrêt
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "main.js"), result);
    const cssIn = path.join(dir, "styles.css");
    const css = (fs.existsSync(cssIn) ? fs.readFileSync(cssIn, "utf8") : "") + "\n" + fs.readFileSync(path.join(here, "src", "styles.ext.css"), "utf8");
    fs.writeFileSync(path.join(out, "styles.css"), css);
    const mIn = path.join(dir, "manifest.json");
    const man = fs.existsSync(mIn) ? JSON.parse(fs.readFileSync(mIn, "utf8")) : { id: "age-writer", name: "Age Writer", minAppVersion: "1.0.0", author: "", isDesktopOnly: false, description: "" };
    man.version = version;
    fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(man, null, 2) + "\n");
    console.log(`\nÉcrit dans ${path.relative(process.cwd(), out) || "."}/ : main.js (${(result.length / 1024).toFixed(0)} Ko), styles.css, manifest.json (v${version}).`);
  } catch (e) { console.error("\nÉCHEC : " + e.message); process.exit(1); }
}
module.exports = { build, assemble };
