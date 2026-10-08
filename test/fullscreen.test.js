"use strict";
// Plein écran du Relto : les fenêtres modales (livre des glyphes, carnet de l'arpenteur) doivent rester visibles ; ouvrir une note quitte le plein écran.
const assert = require("assert");
const { fitModalToFullscreen, leaveFullscreen } = require("../src/util");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const node = (kids = []) => ({ kids, contains(x) { return x === this || this.kids.includes(x); }, appendChild(x) { this.kids.push(x); }, ownerDocument: null });
const mk = (fullscreenElement) => { const body = node(), modal = node(); const doc = { fullscreenElement, exited: 0, exitFullscreen() { this.exited++; this.fullscreenElement = null; } }; body.ownerDocument = modal.ownerDocument = doc; return { doc, body, modal: { containerEl: modal } }; };

let t = mk(null); fitModalToFullscreen(t.modal); ok(t.body.kids.length === 0, "hors plein écran : la modale reste où Obsidian l'a mise");
const fs = node(); t = mk(fs); t.doc.fullscreenElement = fs; fitModalToFullscreen(t.modal); ok(fs.kids[0] === t.modal.containerEl, "en plein écran : la modale est déplacée dans l'élément plein écran");
fitModalToFullscreen(t.modal); ok(fs.kids.length === 1, "déjà dedans : rien de plus");
fitModalToFullscreen(null); fitModalToFullscreen({}); fitModalToFullscreen({ containerEl: {} }); ok(true, "entrées inattendues : sans erreur");
leaveFullscreen(t.doc); ok(t.doc.exited === 1, "ouvrir une note quitte le plein écran"); leaveFullscreen(t.doc); ok(t.doc.exited === 1, "pas en plein écran : rien");
leaveFullscreen({}); leaveFullscreen(null); ok(true, "sans document : sans erreur");
console.log(`fullscreen.test.js : ${n} vérifications, tout passe`);
