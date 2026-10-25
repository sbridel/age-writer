"use strict";
/*
 * Le chapitre 14 du mode histoire (claude/DESIGN-art-bahro.md §2), modèle pur : ce que le Relto histoire retient des deux voix
 * jouées, l'encrier qui frémit, l'encre qui ne sèche plus sur le monde étrange, la nuit qui passe et ce qu'on trouve au matin.
 * L'état vit dans l'avancement du Relto (`ext.story[clé].hear`) ; rien ici ne dépend d'Obsidian.
 */
const DAY = 86400000;
/** Combien de temps l'encrier frémit fort après la voix du monde étrange, puis la force qui lui reste tant que le chapitre n'est pas fini. */
const HUM_MS = 10 * 60000, HUM_LOW = 0.3;
/** L'heure du matin (heure locale) : ce qui est venu la nuit est là. La nuit commence à NIGHT_FROM. */
const MORNING = 6, NIGHT_FROM = 22;
/** Les degrés qui comptent pour « s'accorder » : à la tierce au moins (unisson, octave, tierce, sixte ; src/imager-guild.js, accordOf). */
const AGREE = new Set(["full", "good"]);
const KEEP = 12;

/** L'état du chapitre dans l'avancement d'un Relto (le crée au besoin). */
function stateOf(st) {
  const h = st.hear && typeof st.hear === "object" ? st.hear : (st.hear = {});
  if (!Array.isArray(h.heard)) h.heard = [];
  return h;
}

/** Le monde étrange du chapitre 9 : l'Âge qui l'a réussi, à défaut la note du chapitre. */
const strangeOf = (st) => (st && ((st.by && st.by.strange) || (st.notes && st.notes.strange))) || null;

/** Le second livre est-il fini (le 14 est ouvert) ? */
const open = (st) => !!st && Array.isArray(st.done) && st.done.includes("slab");
const doneHear = (st) => !!st && Array.isArray(st.done) && st.done.includes("hear");

/** Même Âge ? Par chemin, ou par nom de note quand l'un des deux n'a que son nom. */
const base = (p) => String(p || "").replace(/^.*\//, "").replace(/\.md$/i, "");
const same = (a, b) => !!a && !!b && (a === b || base(a) === base(b));

/**
 * Deux voix jouées (le diapason de l'Imageur, ou ♪♪ dans le panneau d'un Âge). `a`, `b` : chemins (ou noms) ; `degree` : le degré
 * de l'accord ; `fa`, `fb` : les fréquences (pour la seconde voix de l'encrier). Retient la paire si l'un des deux est le monde
 * étrange, et fait frémir l'encrier. Renvoie vrai si l'état a changé.
 */
function heard(st, a, b, degree, fa, fb, now) {
  const s = strangeOf(st); if (!open(st) || doneHear(st) || !s) return false;
  const ia = same(a, s), ib = same(b, s); if (!ia && !ib) return false;
  const h = stateOf(st);
  h.heard.push({ a: String(a || ""), b: String(b || ""), degree: String(degree || ""), at: now });
  if (h.heard.length > KEEP) h.heard.splice(0, h.heard.length - KEEP);
  struck(st, ia ? fa : fb, now);
  return true;
}
/** La voix du monde étrange seule (le diapason frappé une fois, l'accord de ses cristaux) : l'encrier frémit. */
function struck(st, freq, now) {
  if (!open(st) || doneHear(st)) return false;
  const h = stateOf(st); h.inkAt = now; if (Number.isFinite(freq)) h.freq = freq;
  return true;
}
/** Est-ce le monde étrange ? (pour l'accord des cristaux, qui ne connaît que l'Âge posé sur l'Imageur) */
const isStrange = (st, path) => same(path, strangeOf(st));

/**
 * Le chapitre est-il réussi ? Les deux voix entre le monde étrange et un autre Âge du dossier (`ages` : les Âges de ce Relto), à la
 * tierce au moins. Renvoie le chemin de l'Âge qui a répondu, ou null.
 */
function answered(st, ages) {
  const s = strangeOf(st); if (!s) return null;
  const h = st && st.hear; if (!h || !Array.isArray(h.heard)) return null;
  const mine = (ages || []).filter((x) => !same(x.path, s));
  for (const e of h.heard) {
    if (!AGREE.has(e.degree)) continue;
    const other = same(e.a, s) ? e.b : same(e.b, s) ? e.a : null; if (!other || same(other, s)) continue;
    const hit = mine.find((x) => same(x.path, other) || same(x.name, other)); if (hit) return hit.path;
  }
  return null;
}

/** La force du frémissement de l'encrier (0 à 1) : fort juste après, puis faible jusqu'à la fin du chapitre, rien ensuite. */
function humOf(st, now) {
  const h = st && st.hear; if (!h || !(h.inkAt > 0) || doneHear(st) || !open(st)) return 0;
  const dt = now - h.inkAt; if (dt < 0) return HUM_LOW;
  return dt < HUM_MS ? 1 - (1 - HUM_LOW) * (dt / HUM_MS) : HUM_LOW;
}

/** Le premier matin après `at` (heure locale) : la date où ce qui est venu la nuit est là. Avant MORNING h, c'est ce matin même. */
function morningAfter(at) {
  const d = new Date(at), m = new Date(d.getFullYear(), d.getMonth(), d.getDate(), MORNING, 0, 0, 0);
  if (m.getTime() <= at) m.setDate(m.getDate() + 1);
  return m.getTime();
}
/** La nuit d'avant ce matin-là commence à NIGHT_FROM h la veille (ou tout de suite, si le chapitre a fini dans la nuit). */
function nightBefore(morning, at) { const d = new Date(morning); d.setDate(d.getDate() - 1); d.setHours(NIGHT_FROM, 0, 0, 0); return Math.max(at, d.getTime()); }

/** Le chapitre vient d'être réussi : la visite est attendue pour la nuit qui vient. */
function visitFrom(st, now) { const h = stateOf(st); if (!(h.visit > 0)) h.visit = now; }
/** La pierre est-elle sur le bureau ? (le matin après la réussite du chapitre) */
const stoneHere = (st, now) => { const h = st && st.hear; return !!h && h.visit > 0 && now >= morningAfter(h.visit); };
/** Le cri, une seule fois, si l'on est là pendant la nuit de la visite. Renvoie vrai quand il faut le jouer (et le retient). */
function cryNow(st, now) {
  const h = st && st.hear; if (!h || !(h.visit > 0) || h.cried) return false;
  const m = morningAfter(h.visit); if (now >= m || now < nightBefore(m, h.visit)) return false;
  h.cried = now; return true;
}

/** L'encre ne sèche plus sur le monde étrange dès que le 14 est ouvert (sans explication). Le nom de sa note, ou null. */
const wetName = (st) => (open(st) && strangeOf(st) ? base(strangeOf(st)) : null);

module.exports = { DAY, HUM_MS, HUM_LOW, MORNING, NIGHT_FROM, AGREE, stateOf, strangeOf, open, same, heard, struck, isStrange, answered, humOf, morningAfter, nightBefore, visitFrom, stoneHere, cryNow, wetName };
