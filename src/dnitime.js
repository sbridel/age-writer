"use strict";
/**
 * Heure D'ni : conversion de l'heure de l'ordinateur en date et heure D'ni, comme l'horloge du KI.
 *
 * Structure (base 25) :  1 hahr (année) = 10 vailee × 29 yahr ; 1 yahr = 5 gahrtahvo ; 1 gahrtahvo = 25 tahvo ;
 * 1 tahvo = 25 gorahn ; 1 gorahn = 25 prorahn. Un hahr dure 31 556 925 216 ms (une année tropique) : un yahr ≈ 30 h 14 min,
 * un gahrtahvo ≈ 6 h 3 min, un tahvo ≈ 14,5 min, un gorahn ≈ 35 s, un prorahn ≈ 1,39 s.
 * Point de départ : le 21 avril 1991, 16 h 54 UTC = début du hahr 9647 (convention des horloges D'ni de la communauté).
 * Les noms des mois suivent la numération D'ni (fa, bro, sahn, tar, vot, vofo, vobro, vosahn, votar, novoo).
 * Le numéro du yahr compte à partir de 1 (convention du plugin).
 */
const REF = Date.UTC(1991, 3, 21, 16, 54, 0), REF_HAHR = 9647, MS_PER_HAHR = 31556925216;
const PRO_PER_YAHR = 5 * 25 * 25 * 25, PRO_PER_VAILEE = 29 * PRO_PER_YAHR, PRO_PER_HAHR = 10 * PRO_PER_VAILEE;
const VAILEE = ["Leefo", "Leebro", "Leesahn", "Leetar", "Leevot", "Leevofo", "Leevobro", "Leevosahn", "Leevotar", "Leenovoo"];

/** `date` : Date ou millisecondes. Renvoie { hahr, vailee (1–10), name, yahr (1–29), gahrtahvo (0–4), tahvo, gorahn, prorahn (0–24) }. */
function fromDate(date = Date.now()) {
  const ms = date instanceof Date ? date.getTime() : Number(date), delta = ms - REF;
  const years = Math.floor(delta / MS_PER_HAHR), within = delta - years * MS_PER_HAHR;
  const pro = Math.min(PRO_PER_HAHR - 1, Math.floor((within / MS_PER_HAHR) * PRO_PER_HAHR));
  const vailee = Math.floor(pro / PRO_PER_VAILEE), r1 = pro % PRO_PER_VAILEE, yahr = Math.floor(r1 / PRO_PER_YAHR), r2 = r1 % PRO_PER_YAHR;
  const gahrtahvo = Math.floor(r2 / 15625), r3 = r2 % 15625, tahvo = Math.floor(r3 / 625), r4 = r3 % 625;
  return { hahr: REF_HAHR + years, vailee: vailee + 1, name: VAILEE[vailee], yahr: yahr + 1, gahrtahvo, tahvo, gorahn: Math.floor(r4 / 25), prorahn: r4 % 25 };
}

/** Lecture simple : « 9682 · Leefo 12 · 3:14:7:21 ». */
function format(d) { return `${d.hahr} · ${d.name} ${d.yahr} · ${d.gahrtahvo}:${d.tahvo}:${d.gorahn}:${d.prorahn}`; }

/** Phase du jour D'ni (0 au début du yahr, 1 à la fin) : de quoi faire tourner le ciel sur le yahr plutôt que sur le jour terrestre. */
function dayPhase(date = Date.now()) { const d = fromDate(date); return (d.gahrtahvo * 15625 + d.tahvo * 625 + d.gorahn * 25 + d.prorahn) / PRO_PER_YAHR; }

/** Numéro du jour D'ni (yahr, 290 par hahr) depuis le point de départ : le même pour tout le monde au même instant (météo vivante). */
function dayNumber(date = Date.now()) { const ms = date instanceof Date ? date.getTime() : Number(date); return Math.floor(((ms - REF) / MS_PER_HAHR) * 290); }

module.exports = { fromDate, format, dayPhase, dayNumber, VAILEE, REF, REF_HAHR, MS_PER_HAHR, PRO_PER_HAHR };
