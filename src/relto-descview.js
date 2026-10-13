"use strict";
// La vue « livre descriptif » du Relto : un cadre de livre sur le canevas, et par-dessus le vrai livre du moteur (src/relto-descbook.js, HTML).
// `r.descTarget` : le chemin de la note à ouvrir, ou null pour un livre vierge. Le livre est monté à l'entrée dans la vue et démonté à la sortie.
const { mix, rgba } = require("./util");

const W = 640, H = 360;

function drawDescBook(r, ctx, sc, sky, t) {
  const tr = r.imagerTr ? r.imagerTr() : (k) => k, amb = 0.7 + 0.3 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  ctx.fillStyle = c("#2a1c12"); ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 9) { ctx.fillStyle = rgba(0, 0, 0, 0.1 + 0.06 * ((y / 9) % 3)); ctx.fillRect(0, y, W, 1.2); }
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
  const s = root.style; s.position = "absolute"; s.pointerEvents = "auto"; s.boxSizing = "border-box";
  const place = () => { // le livre est centré dans l'écran (marges égales de chaque côté) ; des pixels mesurés, jamais des pourcentages
    const cv = r.canvas;
    if (r.opts.rotated && r.opts.rotated()) { // plein écran mobile en portrait : l'image est couchée ; les mesures à l'écran sont tournées, on prend celles de la mise en page
      const k0 = cv.offsetWidth / W, mx0 = 56 * k0, my0 = 12 * k0; if (!cv.offsetWidth) return;
      s.left = cv.offsetLeft + mx0 + "px"; s.top = cv.offsetTop + my0 + "px"; s.width = cv.offsetWidth - 2 * mx0 + "px"; s.height = cv.offsetHeight - 2 * my0 + "px";
      root.dispatchEvent(new Event("age-fit")); return;
    }
    const cr = cv.getBoundingClientRect(), op = root.offsetParent || parent, pr = op.getBoundingClientRect(); if (!cr.width || !cr.height) return;
    const k = cr.width / W, mx = 56 * k, my = 12 * k, par = ((r.canvas.closest && r.canvas.closest(".age-reltoview")) || parent).getBoundingClientRect(); // à l'horizontale, centré sur la vue du Relto quand elle a sa propre fenêtre (le canevas peut y être plus étroit), sur le cadre du canevas quand le Relto est incrusté dans une note
    s.left = par.left - pr.left - (op.clientLeft || 0) + (op.scrollLeft || 0) + mx + "px"; s.top = cr.top - pr.top - (op.clientTop || 0) + (op.scrollTop || 0) + my + "px"; s.width = par.width - 2 * mx + "px"; s.height = cr.height - 2 * my + "px";
    root.dispatchEvent(new Event("age-fit"));
  };
  place(); if (typeof ResizeObserver !== "undefined") { ui.ro = new ResizeObserver(place); ui.ro.observe(r.canvas); }
  if (typeof window !== "undefined" && window.addEventListener) { ui.onTurn = () => window.setTimeout(place, 120); window.addEventListener("resize", ui.onTurn); window.addEventListener("orientationchange", ui.onTurn); } // le téléphone tourné : le livre se replace
  for (const ev of ["keydown", "keyup", "keypress", "mousedown", "click", "wheel"]) root.addEventListener(ev, (e) => e.stopPropagation());
  parent.appendChild(root); ui.root = root;
  try { ui.ctrl = r.opts.onDescMount(root, r.descTarget || null, () => { if (r.opts.onFlip) r.opts.onFlip(); }); } catch (e) { console.warn("[Age Writer ext] livre descriptif", e); }
}

/** À la sortie de la vue : le livre est démonté (il se remonte à jour à la prochaine entrée). */
function unmount(r) {
  const ui = r.dbUI; if (!ui) return;
  try { if (ui.ro) ui.ro.disconnect(); if (ui.onTurn) { window.removeEventListener("resize", ui.onTurn); window.removeEventListener("orientationchange", ui.onTurn); } if (ui.ctrl && ui.ctrl.dispose) ui.ctrl.dispose(); } catch (e) { /* ignore */ }
  if (ui.root) ui.root.remove(); r.dbUI = null;
}

module.exports = { drawDescBook, unmount, mountOverlay };
