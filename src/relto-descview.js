"use strict";
// La vue « livre descriptif » du Relto : un cadre de livre sur le canevas, et par-dessus le vrai livre du moteur (src/relto-descbook.js, HTML).
// `r.descTarget` : le chemin de la note à ouvrir, ou null pour un livre vierge. Le livre est monté à l'entrée dans la vue et démonté à la sortie.
const { mix, rgba } = require("./util");

const W = 640, H = 360, X0 = 30, Y0 = 22, BW = 580, BH = 316;

function drawDescBook(r, ctx, sc, sky, t) {
  const tr = r.imagerTr ? r.imagerTr() : (k) => k, amb = 0.7 + 0.3 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  ctx.fillStyle = c("#2a1c12"); ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 9) { ctx.fillStyle = rgba(0, 0, 0, 0.1 + 0.06 * ((y / 9) % 3)); ctx.fillRect(0, y, W, 1.2); }
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(X0 + 4, Y0 + 6, BW, BH); ctx.fillStyle = c("#3d3a2a"); ctx.fillRect(X0, Y0, BW, BH);
  ctx.strokeStyle = c("#d8c07a"); ctx.lineWidth = 1.2; ctx.strokeRect(X0 + 5.5, Y0 + 5.5, BW - 11, BH - 11);
  require("./relto-atelier").backButton(r, ctx, tr("glyphbook.close"), r.bookFrom || "cabin");
  const fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1), g = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 420); g.addColorStop(0, rgba(255, 190, 90, 0.07 * fl)); g.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  mountOverlay(r);
}

/** Pose (une fois) l'élément HTML qui porte le livre, au-dessus du cadre ; il suit la taille du canevas en pourcentages. */
function mountOverlay(r) {
  let ui = r.dbUI; if (ui && ui.root) { ui.root.style.display = "block"; return; }
  const parent = r.canvas.parentElement; if (!parent || !r.opts.onDescMount || typeof document === "undefined") return;
  ui = r.dbUI = { root: null, ctrl: null };
  const root = document.createElement("div"); root.className = "age-relto-descbook";
  const s = root.style; s.position = "absolute"; s.left = ((X0 + 10) / W) * 100 + "%"; s.top = ((Y0 + 10) / H) * 100 + "%"; s.width = ((BW - 20) / W) * 100 + "%"; s.height = ((BH - 20) / H) * 100 + "%"; s.pointerEvents = "auto"; s.boxSizing = "border-box";
  for (const ev of ["keydown", "keyup", "keypress", "mousedown", "click", "wheel"]) root.addEventListener(ev, (e) => e.stopPropagation());
  parent.appendChild(root); ui.root = root;
  try { ui.ctrl = r.opts.onDescMount(root, r.descTarget || null); } catch (e) { console.warn("[Age Writer ext] livre descriptif", e); }
}

/** À la sortie de la vue : le livre est démonté (il se remonte à jour à la prochaine entrée). */
function unmount(r) {
  const ui = r.dbUI; if (!ui) return;
  try { if (ui.ctrl && ui.ctrl.dispose) ui.ctrl.dispose(); } catch (e) { /* ignore */ }
  if (ui.root) ui.root.remove(); r.dbUI = null;
}

module.exports = { drawDescBook, unmount, mountOverlay };
