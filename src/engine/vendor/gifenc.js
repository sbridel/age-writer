"use strict";
/* Bibliothèque tierce (gifenc, MIT / Tracery) — reprise telle quelle du moteur 1.3.0. */
const st = module.exports;
var Rt = Object.defineProperty,
  Qi = (e) => Rt(e, "__esModule", { value: !0 }),
  er = (e, o) => {
    for (var t in o) Rt(e, t, { get: o[t], enumerable: !0 });
  };
Qi(st);
er(st, {
  GIFEncoder: () => Dt,
  applyPalette: () => cr,
  default: () => wr,
  nearestColor: () => ur,
  nearestColorIndex: () => Et,
  nearestColorIndexWithDistance: () => Bt,
  prequantize: () => lr,
  quantize: () => or,
  snapColorsToPalette: () => hr,
});
var tr = {
  signature: "GIF",
  version: "89a",
  trailer: 59,
  extensionIntroducer: 33,
  applicationExtensionLabel: 255,
  graphicControlExtensionLabel: 249,
  imageSeparator: 44,
  signatureSize: 3,
  versionSize: 3,
  globalColorTableFlagMask: 128,
  colorResolutionMask: 112,
  sortFlagMask: 8,
  globalColorTableSizeMask: 7,
  applicationIdentifierSize: 8,
  applicationAuthCodeSize: 3,
  disposalMethodMask: 28,
  userInputFlagMask: 2,
  transparentColorFlagMask: 1,
  localColorTableFlagMask: 128,
  interlaceFlagMask: 64,
  idSortFlagMask: 32,
  localColorTableSizeMask: 7,
};
function $t(e = 256) {
  let o = 0,
    t = new Uint8Array(e);
  return {
    get buffer() {
      return t.buffer;
    },
    reset() {
      o = 0;
    },
    bytesView() {
      return t.subarray(0, o);
    },
    bytes() {
      return t.slice(0, o);
    },
    writeByte(r) {
      (i(o + 1), (t[o] = r), o++);
    },
    writeBytes(r, s = 0, n = r.length) {
      i(o + n);
      for (let a = 0; a < n; a++) t[o++] = r[a + s];
    },
    writeBytesView(r, s = 0, n = r.byteLength) {
      (i(o + n), t.set(r.subarray(s, s + n), o), (o += n));
    },
  };
  function i(r) {
    var s = t.length;
    if (s >= r) return;
    var n = 1024 * 1024;
    ((r = Math.max(r, (s * (s < n ? 2 : 1.125)) >>> 0)), s != 0 && (r = Math.max(r, 256)));
    let a = t;
    ((t = new Uint8Array(r)), o > 0 && t.set(a.subarray(0, o), 0));
  }
}
var it = 12,
  At = 5003,
  ir = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535];
function rr(
  e,
  o,
  t,
  i,
  r = $t(512),
  s = new Uint8Array(256),
  n = new Int32Array(At),
  a = new Int32Array(At),
) {
  let c = n.length,
    g = Math.max(2, i);
  (s.fill(0), a.fill(0), n.fill(-1));
  let h = 0,
    u = 0,
    l = g + 1,
    d = l,
    f = !1,
    m = d,
    k = (1 << m) - 1,
    w = 1 << (l - 1),
    x = w + 1,
    A = w + 2,
    $ = 0,
    F = t[0],
    M = 0;
  for (let y = c; y < 65536; y *= 2) ++M;
  ((M = 8 - M), r.writeByte(g), p(w));
  let T = t.length;
  for (let y = 1; y < T; y++)
    e: {
      let b = t[y],
        v = (b << it) + F,
        _ = (b << M) ^ F;
      if (n[_] === v) {
        F = a[_];
        break e;
      }
      let P = _ === 0 ? 1 : c - _;
      for (; n[_] >= 0;)
        if (((_ -= P), _ < 0 && (_ += c), n[_] === v)) {
          F = a[_];
          break e;
        }
      (p(F), (F = b), A < 1 << it ? ((a[_] = A++), (n[_] = v)) : (n.fill(-1), (A = w + 2), (f = !0), p(w)));
    }
  return (p(F), p(x), r.writeByte(0), r.bytesView());
  function p(y) {
    for (h &= ir[u], u > 0 ? (h |= y << u) : (h = y), u += m; u >= 8;)
      ((s[$++] = h & 255),
        $ >= 254 && (r.writeByte($), r.writeBytesView(s, 0, $), ($ = 0)),
        (h >>= 8),
        (u -= 8));
    if (
      ((A > k || f) &&
        (f ? ((m = d), (k = (1 << m) - 1), (f = !1)) : (++m, (k = m === it ? 1 << m : (1 << m) - 1))),
      y == x)
    ) {
      for (; u > 0;)
        ((s[$++] = h & 255),
          $ >= 254 && (r.writeByte($), r.writeBytesView(s, 0, $), ($ = 0)),
          (h >>= 8),
          (u -= 8));
      $ > 0 && (r.writeByte($), r.writeBytesView(s, 0, $), ($ = 0));
    }
  }
}
var nr = rr;
function Pt(e, o, t) {
  return ((e << 8) & 63488) | ((o << 2) & 992) | (t >> 3);
}
function Lt(e, o, t, i) {
  return (e >> 4) | (o & 240) | ((t & 240) << 4) | ((i & 240) << 8);
}
function Ct(e, o, t) {
  return ((e >> 4) << 8) | (o & 240) | (t >> 4);
}
function Le(e, o, t) {
  return e < o ? o : e > t ? t : e;
}
function we(e) {
  return e * e;
}
function Tt(e, o, t) {
  var i = 0,
    r = 1e100;
  let s = e[o],
    n = s.cnt,
    a = s.ac,
    c = s.rc,
    g = s.gc,
    h = s.bc;
  for (var u = s.fw; u != 0; u = e[u].fw) {
    let d = e[u],
      f = d.cnt,
      m = (n * f) / (n + f);
    if (!(m >= r)) {
      var l = 0;
      (t && ((l += m * we(d.ac - a)), l >= r)) ||
        ((l += m * we(d.rc - c)),
        !(l >= r) &&
          ((l += m * we(d.gc - g)), !(l >= r) && ((l += m * we(d.bc - h)), !(l >= r) && ((r = l), (i = u)))));
    }
  }
  ((s.err = r), (s.nn = i));
}
function rt() {
  return { ac: 0, rc: 0, gc: 0, bc: 0, cnt: 0, nn: 0, fw: 0, bk: 0, tm: 0, mtm: 0, err: 0 };
}
function sr(e, o) {
  let t = o === "rgb444" ? 4096 : 65536,
    i = new Array(t),
    r = e.length;
  if (o === "rgba4444")
    for (let s = 0; s < r; ++s) {
      let n = e[s],
        a = (n >> 24) & 255,
        c = (n >> 16) & 255,
        g = (n >> 8) & 255,
        h = n & 255,
        u = Lt(h, g, c, a),
        l = u in i ? i[u] : (i[u] = rt());
      ((l.rc += h), (l.gc += g), (l.bc += c), (l.ac += a), l.cnt++);
    }
  else if (o === "rgb444")
    for (let s = 0; s < r; ++s) {
      let n = e[s],
        a = (n >> 16) & 255,
        c = (n >> 8) & 255,
        g = n & 255,
        h = Ct(g, c, a),
        u = h in i ? i[h] : (i[h] = rt());
      ((u.rc += g), (u.gc += c), (u.bc += a), u.cnt++);
    }
  else
    for (let s = 0; s < r; ++s) {
      let n = e[s],
        a = (n >> 16) & 255,
        c = (n >> 8) & 255,
        g = n & 255,
        h = Pt(g, c, a),
        u = h in i ? i[h] : (i[h] = rt());
      ((u.rc += g), (u.gc += c), (u.bc += a), u.cnt++);
    }
  return i;
}
function or(e, o, t = {}) {
  let {
    format: i = "rgb565",
    clearAlpha: r = !0,
    clearAlphaColor: s = 0,
    clearAlphaThreshold: n = 0,
    oneBitAlpha: a = !1,
  } = t;
  if (!e || !e.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
  if (!(e instanceof Uint8Array) && !(e instanceof Uint8ClampedArray))
    throw new Error("quantize() expected RGBA Uint8Array data");
  let c = new Uint32Array(e.buffer),
    g = t.useSqrt !== !1,
    h = i === "rgba4444",
    u = sr(c, i),
    l = u.length,
    d = l - 1,
    f = new Uint32Array(l + 1);
  for (var m = 0, w = 0; w < l; ++w) {
    let E = u[w];
    if (E != null) {
      var k = 1 / E.cnt;
      (h && (E.ac *= k), (E.rc *= k), (E.gc *= k), (E.bc *= k), (u[m++] = E));
    }
  }
  we(o) / m < 0.022 && (g = !1);
  for (var w = 0; w < m - 1; ++w)
    ((u[w].fw = w + 1), (u[w + 1].bk = w), g && (u[w].cnt = Math.sqrt(u[w].cnt)));
  g && (u[w].cnt = Math.sqrt(u[w].cnt));
  var x, A, $;
  for (w = 0; w < m; ++w) {
    Tt(u, w, !1);
    var F = u[w].err;
    for (A = ++f[0]; A > 1 && (($ = A >> 1), !(u[(x = f[$])].err <= F)); A = $) f[A] = x;
    f[A] = w;
  }
  var M = m - o;
  for (w = 0; w < M;) {
    for (var T; ;) {
      var p = f[1];
      if (((T = u[p]), T.tm >= T.mtm && u[T.nn].mtm <= T.tm)) break;
      T.mtm == d ? (p = f[1] = f[f[0]--]) : (Tt(u, p, !1), (T.tm = w));
      var F = u[p].err;
      for (
        A = 1;
        ($ = A + A) <= f[0] && ($ < f[0] && u[f[$]].err > u[f[$ + 1]].err && $++, !(F <= u[(x = f[$])].err));
        A = $
      )
        f[A] = x;
      f[A] = p;
    }
    var y = u[T.nn],
      b = T.cnt,
      v = y.cnt,
      k = 1 / (b + v);
    (h && (T.ac = k * (b * T.ac + v * y.ac)),
      (T.rc = k * (b * T.rc + v * y.rc)),
      (T.gc = k * (b * T.gc + v * y.gc)),
      (T.bc = k * (b * T.bc + v * y.bc)),
      (T.cnt += y.cnt),
      (T.mtm = ++w),
      (u[y.bk].fw = y.fw),
      (u[y.fw].bk = y.bk),
      (y.mtm = d));
  }
  let _ = [];
  var P = 0;
  for (w = 0; ; ++P) {
    let R = Le(Math.round(u[w].rc), 0, 255),
      E = Le(Math.round(u[w].gc), 0, 255),
      z = Le(Math.round(u[w].bc), 0, 255),
      U = 255;
    h &&
      ((U = Le(Math.round(u[w].ac), 0, 255)),
      a && (U = U <= (typeof a == "number" ? a : 127) ? 0 : 255),
      r && U <= n && ((R = E = z = s), (U = 0)));
    let ee = h ? [R, E, z, U] : [R, E, z];
    if ((ar(_, ee) || _.push(ee), (w = u[w].fw) == 0)) break;
  }
  return _;
}
function ar(e, o) {
  for (let t = 0; t < e.length; t++) {
    let i = e[t],
      r = i[0] === o[0] && i[1] === o[1] && i[2] === o[2],
      s = i.length >= 4 && o.length >= 4 ? i[3] === o[3] : !0;
    if (r && s) return !0;
  }
  return !1;
}
function Ee(e, o) {
  var t = 0,
    i;
  for (i = 0; i < e.length; i++) {
    let r = e[i] - o[i];
    t += r * r;
  }
  return t;
}
function Ce(e, o) {
  return o > 1 ? Math.round(e / o) * o : e;
}
function lr(e, { roundRGB: o = 5, roundAlpha: t = 10, oneBitAlpha: i = null } = {}) {
  let r = new Uint32Array(e.buffer);
  for (let s = 0; s < r.length; s++) {
    let n = r[s],
      a = (n >> 24) & 255,
      c = (n >> 16) & 255,
      g = (n >> 8) & 255,
      h = n & 255;
    ((a = Ce(a, t)),
      i && (a = a <= (typeof i == "number" ? i : 127) ? 0 : 255),
      (h = Ce(h, o)),
      (g = Ce(g, o)),
      (c = Ce(c, o)),
      (r[s] = (a << 24) | (c << 16) | (g << 8) | (h << 0)));
  }
}
function cr(e, o, t = "rgb565") {
  if (!e || !e.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
  if (!(e instanceof Uint8Array) && !(e instanceof Uint8ClampedArray))
    throw new Error("quantize() expected RGBA Uint8Array data");
  if (o.length > 256) throw new Error("applyPalette() only works with 256 colors or less");
  let i = new Uint32Array(e.buffer),
    r = i.length,
    s = t === "rgb444" ? 4096 : 65536,
    n = new Uint8Array(r),
    a = new Array(s),
    c = t === "rgba4444";
  if (t === "rgba4444")
    for (let g = 0; g < r; g++) {
      let h = i[g],
        u = (h >> 24) & 255,
        l = (h >> 16) & 255,
        d = (h >> 8) & 255,
        f = h & 255,
        m = Lt(f, d, l, u),
        k = m in a ? a[m] : (a[m] = dr(f, d, l, u, o));
      n[g] = k;
    }
  else {
    let g = t === "rgb444" ? Ct : Pt;
    for (let h = 0; h < r; h++) {
      let u = i[h],
        l = (u >> 16) & 255,
        d = (u >> 8) & 255,
        f = u & 255,
        m = g(f, d, l),
        k = m in a ? a[m] : (a[m] = gr(f, d, l, o));
      n[h] = k;
    }
  }
  return n;
}
function dr(e, o, t, i, r) {
  let s = 0,
    n = 1e100;
  for (let a = 0; a < r.length; a++) {
    let c = r[a],
      g = c[3],
      h = le(g - i);
    if (h > n) continue;
    let u = c[0];
    if (((h += le(u - e)), h > n)) continue;
    let l = c[1];
    if (((h += le(l - o)), h > n)) continue;
    let d = c[2];
    ((h += le(d - t)), !(h > n) && ((n = h), (s = a)));
  }
  return s;
}
function gr(e, o, t, i) {
  let r = 0,
    s = 1e100;
  for (let n = 0; n < i.length; n++) {
    let a = i[n],
      c = a[0],
      g = le(c - e);
    if (g > s) continue;
    let h = a[1];
    if (((g += le(h - o)), g > s)) continue;
    let u = a[2];
    ((g += le(u - t)), !(g > s) && ((s = g), (r = n)));
  }
  return r;
}
function hr(e, o, t = 5) {
  if (!e.length || !o.length) return;
  let i = e.map((n) => n.slice(0, 3)),
    r = t * t,
    s = e[0].length;
  for (let n = 0; n < o.length; n++) {
    let a = o[n];
    a.length < s ? (a = [a[0], a[1], a[2], 255]) : a.length > s ? (a = a.slice(0, 3)) : (a = a.slice());
    let c = Bt(i, a.slice(0, 3), Ee),
      g = c[0],
      h = c[1];
    h > 0 && h <= r && (e[g] = a);
  }
}
function le(e) {
  return e * e;
}
function Et(e, o, t = Ee) {
  let i = 1 / 0,
    r = -1;
  for (let s = 0; s < e.length; s++) {
    let n = e[s],
      a = t(o, n);
    a < i && ((i = a), (r = s));
  }
  return r;
}
function Bt(e, o, t = Ee) {
  let i = 1 / 0,
    r = -1;
  for (let s = 0; s < e.length; s++) {
    let n = e[s],
      a = t(o, n);
    a < i && ((i = a), (r = s));
  }
  return [r, i];
}
function ur(e, o, t = Ee) {
  return e[Et(e, o, t)];
}
function Dt(e = {}) {
  let { initialCapacity: o = 4096, auto: t = !0 } = e,
    i = $t(o),
    r = 5003,
    s = new Uint8Array(256),
    n = new Int32Array(r),
    a = new Int32Array(r),
    c = !1;
  return {
    reset() {
      (i.reset(), (c = !1));
    },
    finish() {
      i.writeByte(tr.trailer);
    },
    bytes() {
      return i.bytes();
    },
    bytesView() {
      return i.bytesView();
    },
    get buffer() {
      return i.buffer;
    },
    get stream() {
      return i;
    },
    writeHeader: g,
    writeFrame(h, u, l, d = {}) {
      let {
          transparent: f = !1,
          transparentIndex: m = 0,
          delay: k = 0,
          palette: w = null,
          repeat: x = 0,
          colorDepth: A = 8,
          dispose: $ = -1,
        } = d,
        F = !1;
      if (
        (t ? c || ((F = !0), g(), (c = !0)) : (F = !!d.first),
        (u = Math.max(0, Math.floor(u))),
        (l = Math.max(0, Math.floor(l))),
        F)
      ) {
        if (!w) throw new Error("First frame must include a { palette } option");
        (fr(i, u, l, w, A), Mt(i, w), x >= 0 && br(i, x));
      }
      let M = Math.round(k / 10);
      pr(i, $, M, f, m);
      let T = !!w && !F;
      (mr(i, u, l, T ? w : null), T && Mt(i, w), yr(i, h, u, l, A, s, n, a));
    },
  };
  function g() {
    It(i, "GIF89a");
  }
}
function pr(e, o, t, i, r) {
  (e.writeByte(33), e.writeByte(249), e.writeByte(4), r < 0 && ((r = 0), (i = !1)));
  var s, n;
  (i ? ((s = 1), (n = 2)) : ((s = 0), (n = 0)),
    o >= 0 && (n = o & 7),
    (n <<= 2),
    e.writeByte(0 | n | 0 | s),
    ne(e, t),
    e.writeByte(r || 0),
    e.writeByte(0));
}
function fr(e, o, t, i, r = 8) {
  let a = nt(i.length) - 1,
    c = 128 | ((r - 1) << 4) | 0 | a,
    g = 0,
    h = 0;
  (ne(e, o), ne(e, t), e.writeBytes([c, g, h]));
}
function br(e, o) {
  (e.writeByte(33),
    e.writeByte(255),
    e.writeByte(11),
    It(e, "NETSCAPE2.0"),
    e.writeByte(3),
    e.writeByte(1),
    ne(e, o),
    e.writeByte(0));
}
function Mt(e, o) {
  let t = 1 << nt(o.length);
  for (let i = 0; i < t; i++) {
    let r = [0, 0, 0];
    (i < o.length && (r = o[i]), e.writeByte(r[0]), e.writeByte(r[1]), e.writeByte(r[2]));
  }
}
function mr(e, o, t, i) {
  if ((e.writeByte(44), ne(e, 0), ne(e, 0), ne(e, o), ne(e, t), i)) {
    let n = nt(i.length) - 1;
    e.writeByte(128 | n);
  } else e.writeByte(0);
}
function yr(e, o, t, i, r = 8, s, n, a) {
  nr(t, i, o, r, e, s, n, a);
}
function ne(e, o) {
  (e.writeByte(o & 255), e.writeByte((o >> 8) & 255));
}
function It(e, o) {
  for (var t = 0; t < o.length; t++) e.writeByte(o.charCodeAt(t));
}
function nt(e) {
  return Math.max(Math.ceil(Math.log2(e)), 1);
}
var wr = Dt;
