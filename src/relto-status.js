"use strict";
// Le statut d'écrivain, vu de l'atelier : une plaque de laiton au bureau qui porte le titre, et un objet de plus à chaque palier (premier jet à corriger).
// L'atelier est un lieu secret du jeu : rien de ceci n'est décrit dans la documentation publique, sauf le titre.
const { rgba } = require("./util");

/** @param st { tier, korfah, title } (voir `statusState` de ui-relto) ; `c` : le filtre de lumière de la pièce ; `TRr` : la traduction */
function drawStatus(r, ctx, c, TRr, t, st) {
  const tier = st.tier | 0, hot = (x, y, w, h, tip, flash) => r.hot.push({ x, y, w, h, tip, flash });
  const ink = rgba(40, 28, 14, 0.8);
  // la plaque, posée de biais sur le plateau, deux vis aux bouts
  { const x = 238, y = 196, w = 140, h = 22; ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-0.025);
    ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, c("#d8b45e")); g.addColorStop(0.5, c("#b98f3c")); g.addColorStop(1, c("#8a6a2a")); ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = c("#f0d58a"); ctx.lineWidth = 0.8; ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
    for (const sx of [-w / 2 + 7, w / 2 - 7]) { ctx.fillStyle = c("#6d5220"); ctx.beginPath(); ctx.arc(sx, 0, 2.2, 0, 6.283); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(sx - 1.6, -1); ctx.lineTo(sx + 1.6, 1); ctx.stroke(); }
    ctx.font = "italic 12px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = ink; let s = String(st.title || ""); while (s.length > 3 && ctx.measureText(s).width > w - 30) s = s.slice(0, -2) + "…";
    ctx.fillText(s, 0, 1); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.restore();
    hot(x, y - 2, w, h + 6, TRr("atelier.plaque.tip"), TRr("status.flash." + tier)); }
  // le cahier : vierge pour l'Apprenti, une première page copiée dès Scribe
  { const x = 150, y = 206, w = 40, h = 28; ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(x + 2, y + 3, w, h);
    ctx.fillStyle = c("#5b3a26"); ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(x, y, w, h);
    if (tier >= 1) { ctx.strokeStyle = rgba(60, 45, 25, 0.6); ctx.lineWidth = 0.8; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + 5, y + 6 + k * 4.5); ctx.lineTo(x + w - 5 - (k % 3) * 4, y + 6 + k * 4.5); ctx.stroke(); } }
    hot(x - 2, y - 2, w + 4, h + 4, TRr("atelier.notebook.tip"), TRr(tier >= 1 ? "status.notebook.page" : "status.notebook.blank")); }
  // le Korfah : un premier livre, une fois, sur le plateau
  if (st.korfah) { const x = 198, y = 214, w = 30, h = 20; ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(x + 2, y + 3, w, h); ctx.fillStyle = c("#3f5a3a"); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = c("#c9a24e"); ctx.fillRect(x + 3, y, 2, h); ctx.fillStyle = rgba(233, 220, 184, 0.6); ctx.fillRect(x + 10, y + 7, 14, 1.4); ctx.fillRect(x + 10, y + 11, 10, 1.4);
    hot(x, y, w, h, TRr("status.firstbook.tip"), TRr("status.firstbook.flash")); }
  // Seltahn aguerri : le sceau de la Guilde et une plume de laiton
  if (tier >= 2) { const x = 392, y = 214; ctx.fillStyle = c("#8e2b27"); ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = c("#b98f3c"); ctx.fillRect(x + 8, y - 3, 12, 6); ctx.fillStyle = c("#7a5c2a"); ctx.fillRect(x + 17, y - 5, 3, 10);
    ctx.strokeStyle = c("#d8b45e"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 24, y + 8); ctx.lineTo(x + 64, y + 2); ctx.stroke(); ctx.strokeStyle = c("#f0d58a"); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 24, y + 7); ctx.lineTo(x + 62, y + 2); ctx.stroke();
    hot(x - 8, y - 8, 76, 26, TRr("status.seal.tip"), TRr("status.seal.flash")); }
  // Maître : un livre plus grand, relié
  if (tier >= 3) { const x = 102, y = 204, w = 38, h = 30; ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x + 2, y + 3, w, h); ctx.fillStyle = c("#4a1f1f"); ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.2; ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7); ctx.fillStyle = c("#c9a24e"); ctx.fillRect(x, y, 4, h); ctx.beginPath(); ctx.arc(x + w / 2 + 2, y + h / 2, 3, 0, 6.283); ctx.fill();
    hot(x, y, w, h, TRr("status.bound.tip"), TRr("status.bound.flash")); }
  // Grand Maître : la boucle. Le cahier vierge de l'Apprenti réapparaît pour un autre, avec une page d'Âge recopiée en exemple et la seconde plume en travers.
  if (tier >= 4) { const x = 150, y = 240, w = 40, h = 24; ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(x + 2, y + 3, w, h); ctx.fillStyle = c("#5b3a26"); ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.translate(x + 8, y + 5); ctx.rotate(-0.05); ctx.fillStyle = c("#f2e8c8"); ctx.fillRect(0, 0, 22, 16); ctx.strokeStyle = rgba(60, 45, 25, 0.6); ctx.lineWidth = 0.7; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(3, 4 + k * 4); ctx.lineTo(19 - k * 2, 4 + k * 4); ctx.stroke(); } ctx.restore();
    ctx.strokeStyle = c("#d8b45e"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y + h + 2); ctx.lineTo(x + w + 6, y + 6); ctx.stroke();
    hot(x - 2, y - 2, w + 8, h + 8, TRr("status.apprentice.tip"), TRr("status.apprentice.flash")); }
}
module.exports = { drawStatus };
