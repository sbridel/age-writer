"use strict";
// Découpage d'un fichier de miaulements en sons séparés (aux silences).
const assert = require("assert");
const { segmentsOf } = require("../src/sound");
const sr = 8000, d = new Float32Array(sr * 6); let n = 0;
const burst = (t0, len, amp) => { for (let i = Math.floor(t0 * sr); i < Math.floor((t0 + len) * sr); i++) d[i] = amp * Math.sin(i * 0.2); };
burst(0.3, 0.6, 0.5); burst(1.8, 0.8, 0.4); burst(3.5, 0.5, 0.6); burst(5.0, 0.03, 0.5); // le dernier est un clic : écarté
const segs = segmentsOf(d, sr); assert.strictEqual(segs.length, 3, "trois sons trouvés, clic écarté (" + segs.length + ")"); n++;
assert(segs[0].start < 0.3 && segs[0].start + segs[0].dur > 0.85, "premier son entier"); n++;
assert(segs[1].start > 0.9 && segs[1].start < 1.8 && segs[1].start + segs[1].dur > 2.55, "deuxième son entier, sans le premier"); n++;
assert(segs.every((s) => s.dur <= 4 && s.peak > 0), "durées plafonnées, niveau mesuré"); n++;
const one = segmentsOf(new Float32Array(sr).fill(0), sr); assert.strictEqual(one.length, 1, "fichier muet : un seul segment de repli"); n++;
const single = new Float32Array(sr * 2); for (let i = 4000; i < 10000; i++) single[i] = 0.5 * Math.sin(i * 0.2);
assert.strictEqual(segmentsOf(single, sr).length, 1, "un seul son : un segment"); n++;
console.log(`✓ meow-seg.test.js (${n} contrôles)`);
