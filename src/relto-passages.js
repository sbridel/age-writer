"use strict";
// Les passages entre la maison, l'Imageur et l'observatoire : de petits objets qu'on clique, dans la pièce même, comme l'Imageur
// posé sur la table de la maison. Une longue-vue de laiton mène à l'observatoire ; le petit appareil au cristal, à l'Imageur ;
// la lampe de la maison, à la maison. Chaque objet pousse sa zone (`go`) ; un objet n'est dessiné que si sa pièce existe.
const { rgba } = require("./util");

/** L'Imageur en miniature : un socle de laiton, une tige, un cristal qui luit (le même que sur la table de la maison). */
function imagerMini(r, ctx, c, x, y, t, tip) {
  ctx.fillStyle = c("#6b5126"); ctx.fillRect(x - 9, y - 6, 18, 6); ctx.fillRect(x - 2, y - 20, 4, 14);
  ctx.fillStyle = rgba(127, 214, 200, 0.55 + 0.25 * Math.sin(t * 2)); ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + 6, y - 27); ctx.lineTo(x, y - 19); ctx.lineTo(x - 6, y - 27); ctx.closePath(); ctx.fill();
  const ig = ctx.createRadialGradient(x, y - 27, 0, x, y - 27, 18); ig.addColorStop(0, "rgba(127,214,200,0.35)"); ig.addColorStop(1, "rgba(127,214,200,0)"); ctx.fillStyle = ig; ctx.fillRect(x - 18, y - 45, 36, 36);
  r.hot.push({ x: x - 12, y: y - 38, w: 24, h: 38, tip, go: "imager" });
}

/** Une longue-vue de laiton sur un petit trépied, pointée vers le haut ; un reflet glisse sur le tube. */
function spyglass(r, ctx, c, x, y, t, tip) {
  ctx.strokeStyle = c("#3b2a1b"); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x - 6, y); ctx.moveTo(x, y - 9); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 9); ctx.lineTo(x + 1, y); ctx.stroke(); // le trépied
  ctx.save(); ctx.translate(x, y - 10); ctx.rotate(-0.55);
  const g = ctx.createLinearGradient(0, -3, 0, 3); g.addColorStop(0, c("#e0c27a")); g.addColorStop(0.5, c("#a8843c")); g.addColorStop(1, c("#5a4322"));
  ctx.fillStyle = g; ctx.fillRect(-10, -2.2, 14, 4.4); ctx.fillRect(4, -2.8, 10, 5.6); // le tube, puis l'objectif plus large
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(-12, -1.6, 2, 3.2); ctx.fillRect(3.5, -2.8, 1, 5.6); // l'oculaire, la bague
  ctx.fillStyle = rgba(255, 236, 190, 0.35 + 0.25 * Math.sin(t * 1.3)); ctx.fillRect(-8 + ((t * 6) % 18), -1.8, 2, 1.2); // le reflet
  ctx.restore();
  r.hot.push({ x: x - 16, y: y - 24, w: 34, h: 26, tip, go: "telescope" });
}

/** La lampe de la maison : une petite lanterne à flamme chaude (la même lueur que la chandelle de la table). */
function houseLamp(r, ctx, c, x, y, t, tip) {
  const f = 0.8 + 0.15 * Math.sin(t * 7) + 0.05 * Math.sin(t * 13);
  const glow = ctx.createRadialGradient(x, y - 11, 0, x, y - 11, 20 * f); glow.addColorStop(0, "rgba(255,196,120,0.35)"); glow.addColorStop(1, "rgba(255,196,120,0)"); ctx.fillStyle = glow; ctx.fillRect(x - 22, y - 33, 44, 44);
  ctx.fillStyle = c("#3b2a1b"); ctx.fillRect(x - 6, y - 3, 12, 3); ctx.fillRect(x - 5, y - 20, 10, 2); // le pied, le chapeau
  ctx.strokeStyle = c("#3b2a1b"); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 23, 3, Math.PI, 0); ctx.stroke(); // l'anse
  ctx.fillStyle = rgba(255, 226, 170, 0.25); ctx.fillRect(x - 4.5, y - 18, 9, 15); // le verre
  ctx.strokeStyle = c("#5a4322"); ctx.strokeRect(x - 4.5, y - 18, 9, 15);
  ctx.fillStyle = rgba(255, 190, 90, 0.9); ctx.beginPath(); ctx.ellipse(x, y - 9, 1.8, 3.6 * f, 0, 0, 6.283); ctx.fill(); // la flamme
  r.hot.push({ x: x - 9, y: y - 27, w: 18, h: 27, tip, go: "cabin" });
}

module.exports = { imagerMini, spyglass, houseLamp };
