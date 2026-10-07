"use strict";
/* Bibliothèque tierce (gifenc, MIT / Tracery) — reprise telle quelle du moteur 1.3.0. */
const En = module.exports,
  _i = module;
var Y = (function () {
  var e = Math.random,
    o = function (d) {
      e = d;
    },
    t = function (l, d, f) {
      ((this.errors = []),
        f.raw === void 0 && (this.errors.push("Empty input for node"), (f.raw = "")),
        l instanceof Y.Grammar
          ? ((this.grammar = l), (this.parent = null), (this.depth = 0), (this.childIndex = 0))
          : ((this.grammar = l.grammar),
            (this.parent = l),
            (this.depth = l.depth + 1),
            (this.childIndex = d)),
        (this.raw = f.raw),
        (this.type = f.type),
        (this.isExpanded = !1),
        this.grammar || this.errors.push("No grammar specified for this node " + this));
    };
  ((t.prototype.toString = function () {
    return "Node('" + this.raw + "' " + this.type + " d:" + this.depth + ")";
  }),
    (t.prototype.expandChildren = function (l, d) {
      if (((this.children = []), (this.finishedText = ""), (this.childRule = l), this.childRule !== void 0)) {
        var f = Y.parse(l);
        f.errors.length > 0 && (this.errors = this.errors.concat(f.errors));
        for (var m = 0; m < f.length; m++)
          ((this.children[m] = new t(this, m, f[m])),
            d || this.children[m].expand(d),
            (this.finishedText += this.children[m].finishedText));
      } else this.errors.push("No child rule provided, can't expand children");
    }),
    (t.prototype.expand = function (l) {
      if (!this.isExpanded)
        switch (((this.isExpanded = !0), (this.expansionErrors = []), this.type)) {
          case -1:
            this.expandChildren(this.raw, l);
            break;
          case 0:
            this.finishedText = this.raw;
            break;
          case 1:
            ((this.preactions = []), (this.postactions = []));
            var d = Y.parseTag(this.raw);
            ((this.symbol = d.symbol), (this.modifiers = d.modifiers));
            for (var f = 0; f < d.preactions.length; f++)
              this.preactions[f] = new i(this, d.preactions[f].raw);
            for (var f = 0; f < d.postactions.length; f++);
            for (var f = 0; f < this.preactions.length; f++)
              this.preactions[f].type === 0 && this.postactions.push(this.preactions[f].createUndo());
            for (var f = 0; f < this.preactions.length; f++) this.preactions[f].activate();
            this.finishedText = this.raw;
            var m = this.grammar.selectRule(this.symbol, this, this.errors);
            this.expandChildren(m, l);
            for (var f = 0; f < this.modifiers.length; f++) {
              var k = this.modifiers[f],
                w = [];
              if (k.indexOf("(") > 0) {
                var x = /\(([^)]+)\)/,
                  A = x.exec(this.modifiers[f]);
                if (!(!A || A.length < 2)) {
                  var w = A[1].split(",");
                  k = this.modifiers[f].substring(0, k.indexOf("("));
                }
              }
              var $ = this.grammar.modifiers[k];
              $
                ? (this.finishedText = $(this.finishedText, w))
                : (this.errors.push("Missing modifier " + k), (this.finishedText += "((." + k + "))"));
            }
            for (var f = 0; f < this.postactions.length; f++) this.postactions[f].activate();
            break;
          case 2:
            ((this.action = new i(this, this.raw)), this.action.activate(), (this.finishedText = ""));
            break;
        }
    }),
    (t.prototype.clearEscapeChars = function () {
      this.finishedText = this.finishedText
        .replace(/\\\\/g, "DOUBLEBACKSLASH")
        .replace(/\\/g, "")
        .replace(/DOUBLEBACKSLASH/g, "\\");
    }));
  function i(l, d) {
    this.node = l;
    var f = d.split(":");
    ((this.target = f[0]),
      f.length === 1
        ? (this.type = 2)
        : ((this.rule = f[1]), this.rule === "POP" ? (this.type = 1) : (this.type = 0)));
  }
  ((i.prototype.createUndo = function () {
    return this.type === 0 ? new i(this.node, this.target + ":POP") : null;
  }),
    (i.prototype.activate = function () {
      var l = this.node.grammar;
      switch (this.type) {
        case 0:
          ((this.ruleSections = this.rule.split(",")), (this.finishedRules = []), (this.ruleNodes = []));
          for (var d = 0; d < this.ruleSections.length; d++) {
            var f = new t(l, 0, { type: -1, raw: this.ruleSections[d] });
            (f.expand(), this.finishedRules.push(f.finishedText));
          }
          l.pushRules(this.target, this.finishedRules, this);
          break;
        case 1:
          l.popRules(this.target);
          break;
        case 2:
          l.flatten(this.target, !0);
          break;
      }
    }),
    (i.prototype.toText = function () {
      switch (this.type) {
        case 0:
          return this.target + ":" + this.rule;
        case 1:
          return this.target + ":POP";
        case 2:
          return "((some function))";
        default:
          return "((Unknown Action))";
      }
    }));
  function r(l, d) {
    ((this.raw = d),
      (this.grammar = l),
      (this.falloff = 1),
      Array.isArray(d)
        ? (this.defaultRules = d)
        : (typeof d == "string" || d instanceof String) && (this.defaultRules = [d]));
  }
  ((r.prototype.selectRule = function (l) {
    if (this.conditionalRule) {
      var d = this.grammar.expand(this.conditionalRule, !0);
      if (this.conditionalValues[d]) {
        var f = this.conditionalValues[d].selectRule(l);
        if (f != null) return f;
      }
    }
    if (this.ranking)
      for (var m = 0; m < this.ranking.length; m++) {
        var f = this.ranking.selectRule();
        if (f != null) return f;
      }
    if (this.defaultRules !== void 0) {
      var k = 0,
        w = this.distribution;
      switch ((w || (w = this.grammar.distribution), w)) {
        case "shuffle":
          ((!this.shuffledDeck || this.shuffledDeck.length === 0) &&
            (this.shuffledDeck = s(
              Array.apply(null, { length: this.defaultRules.length }).map(Number.call, Number),
              this.falloff,
            )),
            (k = this.shuffledDeck.pop()));
          break;
        case "weighted":
          l.push("Weighted distribution not yet implemented");
          break;
        case "falloff":
          l.push("Falloff distribution not yet implemented");
          break;
        default:
          k = Math.floor(Math.pow(e(), this.falloff) * this.defaultRules.length);
          break;
      }
      return (
        this.defaultUses || (this.defaultUses = []),
        (this.defaultUses[k] = ++this.defaultUses[k] || 1),
        this.defaultRules[k]
      );
    }
    return (l.push("No default rules defined for " + this), null);
  }),
    (r.prototype.clearState = function () {
      this.defaultUses && (this.defaultUses = []);
    }));
  function s(l, d) {
    for (var f = l.length, m, k; f !== 0;)
      ((k = Math.floor(e() * f)), (f -= 1), (m = l[f]), (l[f] = l[k]), (l[k] = m));
    return l;
  }
  var n = function (l, d, f) {
    ((this.key = d),
      (this.grammar = l),
      (this.rawRules = f),
      (this.baseRules = new r(this.grammar, f)),
      this.clearState());
  };
  ((n.prototype.clearState = function () {
    ((this.stack = [this.baseRules]), (this.uses = []), this.baseRules.clearState());
  }),
    (n.prototype.pushRules = function (l) {
      var d = new r(this.grammar, l);
      this.stack.push(d);
    }),
    (n.prototype.popRules = function () {
      this.stack.pop();
    }),
    (n.prototype.selectRule = function (l, d) {
      return (
        this.uses.push({ node: l }),
        this.stack.length === 0
          ? (d.push("The rule stack for '" + this.key + "' is empty, too many pops?"), "((" + this.key + "))")
          : this.stack[this.stack.length - 1].selectRule()
      );
    }),
    (n.prototype.getActiveRules = function () {
      return this.stack.length === 0 ? null : this.stack[this.stack.length - 1].selectRule();
    }),
    (n.prototype.rulesToJSON = function () {
      return JSON.stringify(this.rawRules);
    }));
  var a = function (l, d) {
    ((this.modifiers = {}), this.loadFromRawObj(l));
  };
  ((a.prototype.clearState = function () {
    for (var l = Object.keys(this.symbols), d = 0; d < l.length; d++) this.symbols[l[d]].clearState();
  }),
    (a.prototype.addModifiers = function (l) {
      for (var d in l) l.hasOwnProperty(d) && (this.modifiers[d] = l[d]);
    }),
    (a.prototype.loadFromRawObj = function (l) {
      if (((this.raw = l), (this.symbols = {}), (this.subgrammars = []), this.raw))
        for (var d in this.raw) this.raw.hasOwnProperty(d) && (this.symbols[d] = new n(this, d, this.raw[d]));
    }),
    (a.prototype.createRoot = function (l) {
      var d = new t(this, 0, { type: -1, raw: l });
      return d;
    }),
    (a.prototype.expand = function (l, d) {
      var f = this.createRoot(l);
      return (f.expand(), d || f.clearEscapeChars(), f);
    }),
    (a.prototype.flatten = function (l, d) {
      var f = this.expand(l, d);
      return f.finishedText;
    }),
    (a.prototype.toJSON = function () {
      for (var l = Object.keys(this.symbols), d = [], f = 0; f < l.length; f++) {
        var m = l[f];
        d.push(' "' + m + '" : ' + this.symbols[m].rulesToJSON());
      }
      return (
        `{
` +
        d.join(`,
`) +
        `
}`
      );
    }),
    (a.prototype.pushRules = function (l, d, f) {
      this.symbols[l] === void 0
        ? ((this.symbols[l] = new n(this, l, d)), f && (this.symbols[l].isDynamic = !0))
        : this.symbols[l].pushRules(d);
    }),
    (a.prototype.popRules = function (l) {
      (this.symbols[l] || this.errors.push("Can't pop: no symbol for key " + l), this.symbols[l].popRules());
    }),
    (a.prototype.selectRule = function (l, d, f) {
      if (this.symbols[l]) {
        var m = this.symbols[l].selectRule(d, f);
        return m;
      }
      for (var k = 0; k < this.subgrammars.length; k++)
        if (this.subgrammars[k].symbols[l]) return this.subgrammars[k].symbols[l].selectRule();
      return (f.push("No symbol for '" + l + "'"), "((" + l + "))");
    }),
    (Y = {
      createGrammar: function (l) {
        return new a(l);
      },
      parseTag: function (l) {
        for (
          var d = { symbol: void 0, preactions: [], postactions: [], modifiers: [] },
            f = Y.parse(l),
            m = void 0,
            k = 0;
          k < f.length;
          k++
        )
          if (f[k].type === 0)
            if (m === void 0) m = f[k].raw;
            else throw "multiple main sections in " + l;
          else d.preactions.push(f[k]);
        if (m !== void 0) {
          var w = m.split(".");
          ((d.symbol = w[0]), (d.modifiers = w.slice(1)));
        }
        return d;
      },
      parse: function (l) {
        var d = 0,
          f = !1,
          m = [],
          k = !1,
          w = [],
          x = 0,
          A = "",
          $ = void 0;
        if (l === null) {
          var m = [];
          return ((m.errors = w), m);
        }
        function F(p, y, b) {
          y - p < 1 && (b === 1 && w.push(p + ": empty tag"), b === 2 && w.push(p + ": empty action"));
          var v;
          ($ !== void 0 ? (v = A + "\\" + l.substring($ + 1, y)) : (v = l.substring(p, y)),
            m.push({ type: b, raw: v }),
            ($ = void 0),
            (A = ""));
        }
        for (var M = 0; M < l.length; M++)
          if (k) k = !1;
          else {
            var T = l.charAt(M);
            switch (T) {
              case "[":
                (d === 0 && !f && (x < M && F(x, M, 0), (x = M + 1)), d++);
                break;
              case "]":
                (d--, d === 0 && !f && (F(x, M, 2), (x = M + 1)));
                break;
              case "#":
                d === 0 && (f ? (F(x, M, 1), (x = M + 1)) : (x < M && F(x, M, 0), (x = M + 1)), (f = !f));
                break;
              case "\\":
                ((k = !0), (A = A + l.substring(x, M)), (x = M + 1), ($ = M));
                break;
            }
          }
        return (
          x < l.length && F(x, l.length, 0),
          f && w.push("Unclosed tag"),
          d > 0 && w.push("Too many ["),
          d < 0 && w.push("Too many ]"),
          (m = m.filter(function (p) {
            return !(p.type === 0 && p.raw.length === 0);
          })),
          (m.errors = w),
          m
        );
      },
    }));
  function c(l) {
    var d = l.toLowerCase();
    return d === "a" || d === "e" || d === "i" || d === "o" || d === "u";
  }
  function g(l) {
    return (l >= "a" && l <= "z") || (l >= "A" && l <= "Z") || (l >= "0" && l <= "9");
  }
  function h(l) {
    return l.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  }
  var u = {
    replace: function (l, d) {
      return l.replace(new RegExp(h(d[0]), "g"), d[1]);
    },
    capitalizeAll: function (l) {
      for (var d = "", f = !0, m = 0; m < l.length; m++)
        g(l.charAt(m))
          ? f
            ? ((d += l.charAt(m).toUpperCase()), (f = !1))
            : (d += l.charAt(m))
          : ((f = !0), (d += l.charAt(m)));
      return d;
    },
    capitalize: function (l) {
      return l.charAt(0).toUpperCase() + l.substring(1);
    },
    a: function (l) {
      if (l.length > 0) {
        if (l.charAt(0).toLowerCase() === "u" && l.length > 2 && l.charAt(2).toLowerCase() === "i")
          return "a " + l;
        if (c(l.charAt(0))) return "an " + l;
      }
      return "a " + l;
    },
    firstS: function (l) {
      console.log(l);
      var d = l.split(" "),
        f = u.s(d[0]) + " " + d.slice(1).join(" ");
      return (console.log(f), f);
    },
    s: function (l) {
      switch (l.charAt(l.length - 1)) {
        case "s":
          return l + "es";
        case "h":
          return l + "es";
        case "x":
          return l + "es";
        case "y":
          return c(l.charAt(l.length - 2)) ? l + "s" : l.substring(0, l.length - 1) + "ies";
        default:
          return l + "s";
      }
    },
    ed: function (l) {
      switch (l.charAt(l.length - 1)) {
        case "s":
          return l + "ed";
        case "e":
          return l + "d";
        case "h":
          return l + "ed";
        case "x":
          return l + "ed";
        case "y":
          return c(l.charAt(l.length - 2)) ? l + "d" : l.substring(0, l.length - 1) + "ied";
        default:
          return l + "ed";
      }
    },
  };
  return (
    (Y.baseEngModifiers = u),
    (Y.TraceryNode = t),
    (Y.Grammar = a),
    (Y.Symbol = n),
    (Y.RuleSet = r),
    (Y.setRng = o),
    Y
  );
})();
_i.exports = Y;
