"use strict";
// 2.10.12 : Ahyoheek, le jeu des trois signes (src/ahyoheek.js) — les règles, la fin de partie, le rang, les adversaires.
const assert = require("assert");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const AH = require("../src/ahyoheek");
const seq = (a) => { let i = 0; return () => a[i++ % a.length]; }; /* un hasard réglé d'avance */
const mul = (s) => { let x = s >>> 0; return () => ((x = Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9 >>> 0) % 100000) / 100000; };
ok(AH.beats("beetle", "pen") && AH.beats("pen", "page") && AH.beats("page", "beetle"), "scarabée > plume > livre > scarabée");
ok(!AH.beats("pen", "beetle") && !AH.beats("beetle", "beetle"), "rien ne bat son vainqueur, ni lui-même");
ok(AH.beaterOf("pen") === "beetle" && AH.beaterOf("beetle") === "page", "qui bat quoi");
ok(AH.levelOf("rank", 0) === "easy" && AH.levelOf("rank", 3) === "mid" && AH.levelOf("rank", 6) === "hard" && AH.levelOf("hard", 0) === "hard", "le niveau, fixé ou d'après le rang");
let G = AH.newGame({ n: 9, rnd: mul(1) }); ok(G.opp.length === 4, "quatre adversaires au plus (cinq places)");
G = AH.newGame({ n: 0, rnd: mul(1) }); ok(G.opp.length === 2, "deux par défaut");
G = AH.newGame({ n: 4, rnd: mul(2) }); ok(new Set(G.opp.map((o) => o.char)).size === 4, "des caractères tous différents");
/* une manche comptée à la main : moi la plume, eux deux le livre → +2 pour moi, −1 pour eux */
G = AH.newGame({ n: 2, level: "easy", rnd: mul(3) }); G.opp.forEach((o) => { o.char = "faithful"; o.fav = "page"; });
AH.play(G, "pen", seq([0.1])); ok(G.me.pts === 2 && G.opp.every((o) => o.pts === -1), "les points : +1 par joueur battu, −1 par joueur qui me bat");
ok(G.winners.join() === "0" && G.me.won.pen === 1 && G.phase === "reveal", "le meilleur total positif gagne la manche, et son signe");
ok(!AH.play(G, "pen"), "on ne rejoue pas avant la suite");
AH.next(G); ok(G.phase === "choose" && G.me.play === null && G.said.k === "choose", "la suite : on choisit de nouveau");
/* tout le monde le même signe : personne */
G = AH.newGame({ n: 1, level: "easy", rnd: mul(4) }); G.opp[0].char = "faithful"; G.opp[0].fav = "beetle";
AH.play(G, "beetle", seq([0.1])); ok(G.winners.length === 0 && G.said.k === "nobody", "égalité de signes : personne ne gagne");
/* trois plumes : la partie est à moi, le rang monte, une seule fois */
G = AH.newGame({ n: 2, level: "easy", rnd: mul(5) }); G.opp.forEach((o) => { o.char = "faithful"; o.fav = "page"; });
for (let i = 0; i < 3; i++) { AH.play(G, "pen", seq([0.1])); AH.next(G); }
ok(G.phase === "won" && G.end.i === 0 && G.end.why.k === "three" && G.end.why.sign === "pen", "trois d'un même signe : la partie");
ok(AH.rankAfter(G, 2) === 3, "gagnée : un cran de plus"); ok(AH.rankAfter({ phase: "won", end: { i: 1 } }, 0) === 0, "perdue au rang zéro : on reste à zéro");
ok(AH.rankAfter({ phase: "choose" }, 4) === 4, "partie pas finie : le rang ne bouge pas");
/* deux joueurs arrivent à trois dans la même manche, à égalité de total : manches décisives entre eux seuls */
G = AH.newGame({ n: 2, level: "easy", rnd: mul(6) }); G.me.won = { pen: 2 }; G.opp[0].won = { pen: 2 }; G.opp[1].won = {};
G.opp[0].char = "faithful"; G.opp[0].fav = "pen"; G.opp[1].char = "faithful"; G.opp[1].fav = "page";
AH.play(G, "pen", seq([0.1])); ok(G.pending && G.pending.sudden && G.pending.sudden.join() === "0,1", "égalité parfaite : manche décisive annoncée");
AH.next(G); ok(G.sudden.join() === "0,1" && G.phase === "choose" && G.said.k === "sudden", "manche décisive : on rechoisit");
G.opp[0].fav = "page"; AH.play(G, "beetle", seq([0.1])); ok(G.phase === "won" && G.end.i === 1 && G.end.why.k === "sudden", "la manche décisive départage");
/* le plus d'objets en tout départage sans manche décisive */
G = AH.newGame({ n: 2, level: "easy", rnd: mul(7) }); G.me.won = { pen: 2, beetle: 1 }; G.opp[0].won = { pen: 2 }; G.opp.forEach((o) => { o.char = "faithful"; }); G.opp[0].fav = "pen"; G.opp[1].fav = "page";
AH.play(G, "pen", seq([0.1])); AH.next(G); ok(G.phase === "won" && G.end.i === 0 && G.end.why.k === "total", "trois chacun : le plus d'objets en tout");
/* difficile : il pare le signe qui me ferait gagner */
G = AH.newGame({ n: 1, level: "hard", rnd: mul(8) }); G.me.won = { beetle: 2 }; G.hist = ["pen", "page"]; G.opp[0].char = "faithful"; G.opp[0].fav = "pen";
ok(AH.oppPlay(G, G.opp[0], seq([0.6])) === "page", "difficile : il voit mes deux scarabées et joue le livre");
/* des parties entières au hasard finissent toujours, et proprement */
for (let s = 0; s < 60; s++) { const r = mul(100 + s), g = AH.newGame({ n: 1 + (s % 4), level: ["easy", "mid", "hard"][s % 3], rnd: r }); let k = 0;
  while (g.phase !== "won" && k++ < 400) { if (g.phase === "choose") AH.play(g, AH.SIGNS[Math.floor(r() * 3)], r); else AH.next(g); }
  ok(g.phase === "won" && g.end.i >= 0 && g.end.i <= g.opp.length, "une partie au hasard finit (graine " + s + ")"); }
/* inviter ou renvoyer un joueur ne change pas la figurine des autres */
{ const Y = require("../src/relto-ahyoheek"); let mem = { seats: [1, 2] }; const r = { opts: { ahyState: () => mem, onAhyoheek: (v) => { mem = v; } }, ahy: {} };
  r.ahy.G = AH.newGame({ n: 2, rnd: mul(7) }); const [c1, c2] = r.ahy.G.opp.map((o) => o.char);
  Y.act(r, { seat: 3 }); const after = r.ahy.G.opp.map((o) => o.char);
  ok(after[0] === c1 && after[1] === c2 && new Set(after).size === 3, "un joueur qui arrive ne change pas les autres");
  /* toucher un siège pris : sa guilde passe à la suivante libre ; après la dernière, il se vide ; les autres ne bougent pas */
  const seen = [c1]; let n = 0; while (mem.seats.includes(1) && n++ < 10) { Y.act(r, { seat: 1 }); if (mem.seats.includes(1)) { const o = r.ahy.G.opp, i = mem.seats.indexOf(1); seen.push(o[i].char); ok(o.filter((x, j) => j !== i).every((x) => x.char !== o[i].char), "une guilde libre"); } }
  ok(!mem.seats.includes(1) && new Set(seen).size === seen.length, "le siège a fait le tour des guildes libres, puis s'est vidé");
  ok(r.ahy.G.opp[0].char === c2 && r.ahy.G.opp[1].char === after[2], "un joueur qui part ne change pas les autres");
  /* ma guilde : jamais tirée pour un adversaire ; celui qui la portait en prend une autre */
  const theirs = r.ahy.G.opp[0].char, guild = require("../src/guild-symbols").OF[theirs]; let k2 = 0; while (mem.me !== guild && k2++ < 8) Y.act(r, { me: true });
  ok(mem.me === guild && r.ahy.G.opp.every((o) => o.char !== theirs), "ma guilde n'est plus à un adversaire");
  Y.act(r, { wait: true }); ok(r.ahy.G.opp.every((o) => o.char !== theirs) && r.ahy.G.opp[1].char === after[2], "une partie neuve garde les places et ma guilde"); }
/* le mesureur : il joue ce qui bat le signe le plus sorti */
{ const G = AH.newGame({ n: 1, level: "easy", rnd: mul(3) }); G.opp[0].char = "measurer"; G.tally = { pen: 5, page: 1 };
  ok(AH.oppPlay(G, G.opp[0], seq([0.9, 0.1])) === "beetle", "le mesureur bat la plume, la plus sortie"); }
ok(AH.newGame({ n: 4, exclude: ["wary"], rnd: mul(5) }).opp.every((o) => o.char !== "wary"), "un caractère exclu n'est pas tiré");
console.log("ahyoheek : " + n + " OK");
