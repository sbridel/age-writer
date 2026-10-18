"use strict";
// Génère les pages de rendu visuel (test/visual/out/*.html), à ouvrir dans un navigateur ou à capturer avec Chromium headless.
//   node test/visual/make.js            → relto.html, fx.html, cover.html
const fs = require("fs"), path = require("path");
const { bundle } = require("../../tools/bundle");
const SRC = path.join(__dirname, "../../src"), OUT = path.join(__dirname, "out");
const pack = (entry) => bundle(SRC, entry, { outerRequire: "function(n){throw new Error('no '+n)}", extra: { [entry]: path.join(__dirname, entry + ".js") } });
const page = (bg, body) => `<!doctype html><meta charset=utf-8><body style="margin:0;background:${bg};color:#ccc;font:12px sans-serif">${body}</body>`;
fs.mkdirSync(OUT, { recursive: true });

const ages = [["Glass Marsh", "stable", 96, "Relto"], ["Ash Tower", "unstable", 58], ["Dead Orchard", "dying", 22], ["Salt Court", "stable", 88, "Relto"], ["Iron Bay", "stable", 91], ["The Quiet Lens", "unstable", 61], ["Moth Hall", "stable", 80], ["Cold Pillar", "stable", 77], ["Sunken Stair", "stable", 93], ["Ember Row", "unstable", 49], ["Pale Garden", "stable", 98], ["Rust Choir", "unstable", 67]]
  .map(([name, verdict, stability, returnTo]) => ({ name, path: "Ages/" + name + ".md", verdict, stability, returnTo }));
fs.writeFileSync(path.join(OUT, "relto.html"), page("#111", `<div id=o></div><script>window.X=${pack("entry-relto")};X.renderMany(document.getElementById('o'),${JSON.stringify(ages)});document.title='done'</script>`));
fs.writeFileSync(path.join(OUT, "fx.html"), page("#111", `<div id=o></div><script>window.X=${pack("entry-fx")};X.run(document.getElementById('o'))</script>`));
fs.writeFileSync(path.join(OUT, "cover.html"), page("#222", `<div id=o></div><script>window.X=${pack("entry-cover")};X.run(document.getElementById('o'))</script>`));
fs.writeFileSync(path.join(OUT, "gen.html"), page("#111", `<div id=o></div><script>window.X=${pack("entry-gen")};X.run(document.getElementById('o'))</script>`));
const css = ["styles.css", "styles.ext.css"].map((f) => fs.readFileSync(path.join(SRC, f), "utf8")).join("\n");
const rbook = bundle(SRC, "entry-rbook", { outerRequire: "function(n){if(n==='obsidian')return window.__obs;throw new Error('no '+n)}", extra: { "entry-rbook": path.join(__dirname, "entry-rbook.js") } });
fs.writeFileSync(path.join(OUT, "rbook.html"), page("#1e1e1e", `<style>${css}</style><div id=o></div><script>window.X=${rbook};(async()=>{const o=document.getElementById('o');const a=X.run(o,'en',15.5);await a.onOpen();const b=X.run(o,'fr',22.5);b.book.idx=1;b.book.cover=false;await b.onOpen();document.title='done'})()</script>`));
fs.writeFileSync(path.join(OUT, "rbook-over.html"), page("#1e1e1e", `<style>${css}</style><div id=o></div><script>window.X=${rbook};(async()=>{const o=document.getElementById('o');await X.runOver(o,'fr',false);await X.runOver(o,'fr',true);setTimeout(()=>document.title='done',1500)})()</script>`));
fs.writeFileSync(path.join(OUT, "dmg.html"), page("#111", `<div id=o></div><script>window.X=${pack("entry-dmg")};X.run(document.getElementById('o'))</script>`));
console.log("écrit : " + ["relto", "fx", "cover", "gen", "dmg", "rbook"].map((n) => path.join("test/visual/out", n + ".html")).join(", "));
