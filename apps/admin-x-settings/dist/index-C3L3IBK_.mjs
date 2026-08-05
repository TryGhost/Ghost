import { cd as ye, ce as Ye, cf as Te, cg as Ue, ch as sO, ci as q, cj as lO, ck as Ve, cl as nO, cm as o, cn as oO, co as QO, cp as cO, cq as j, cr as DO, cs as uO, ct as _, cu as JO, cv as Re, cw as ve, cx as MO, cy as _e, cz as LO, cA as We, cB as qe, cC as X, cD as C, cE as je } from "./index-CyOb0xKt.mjs";
class A {
  /// @internal
  constructor(O, t, a, i, s, r, l, n, Q, $ = 0, c) {
    this.p = O, this.stack = t, this.state = a, this.reducePos = i, this.pos = s, this.score = r, this.buffer = l, this.bufferBase = n, this.curContext = Q, this.lookAhead = $, this.parent = c;
  }
  /// @internal
  toString() {
    return `[${this.stack.filter((O, t) => t % 3 == 0).concat(this.state)}]@${this.pos}${this.score ? "!" + this.score : ""}`;
  }
  // Start an empty stack
  /// @internal
  static start(O, t, a = 0) {
    let i = O.parser.context;
    return new A(O, [], t, a, a, 0, [], 0, i ? new SO(i, i.start) : null, 0, null);
  }
  /// The stack's current [context](#lr.ContextTracker) value, if
  /// any. Its type will depend on the context tracker's type
  /// parameter, or it will be `null` if there is no context
  /// tracker.
  get context() {
    return this.curContext ? this.curContext.context : null;
  }
  // Push a state onto the stack, tracking its start position as well
  // as the buffer base at that point.
  /// @internal
  pushState(O, t) {
    this.stack.push(this.state, t, this.bufferBase + this.buffer.length), this.state = O;
  }
  // Apply a reduce action
  /// @internal
  reduce(O) {
    var t;
    let a = O >> 19, i = O & 65535, { parser: s } = this.p, r = s.dynamicPrecedence(i);
    if (r && (this.score += r), a == 0) {
      this.pushState(s.getGoto(this.state, i, !0), this.reducePos), i < s.minRepeatTerm && this.storeNode(i, this.reducePos, this.reducePos, 4, !0), this.reduceContext(i, this.reducePos);
      return;
    }
    let l = this.stack.length - (a - 1) * 3 - (O & 262144 ? 6 : 0), n = l ? this.stack[l - 2] : this.p.ranges[0].from, Q = this.reducePos - n;
    Q >= 2e3 && !(!((t = this.p.parser.nodeSet.types[i]) === null || t === void 0) && t.isAnonymous) && (n == this.p.lastBigReductionStart ? (this.p.bigReductionCount++, this.p.lastBigReductionSize = Q) : this.p.lastBigReductionSize < Q && (this.p.bigReductionCount = 1, this.p.lastBigReductionStart = n, this.p.lastBigReductionSize = Q));
    let $ = l ? this.stack[l - 1] : 0, c = this.bufferBase + this.buffer.length - $;
    if (i < s.minRepeatTerm || O & 131072) {
      let h = s.stateFlag(
        this.state,
        1
        /* StateFlag.Skipped */
      ) ? this.pos : this.reducePos;
      this.storeNode(i, n, h, c + 4, !0);
    }
    if (O & 262144)
      this.state = this.stack[l];
    else {
      let h = this.stack[l - 3];
      this.state = s.getGoto(h, i, !0);
    }
    for (; this.stack.length > l; )
      this.stack.pop();
    this.reduceContext(i, n);
  }
  // Shift a value into the buffer
  /// @internal
  storeNode(O, t, a, i = 4, s = !1) {
    if (O == 0 && (!this.stack.length || this.stack[this.stack.length - 1] < this.buffer.length + this.bufferBase)) {
      let r = this, l = this.buffer.length;
      if (l == 0 && r.parent && (l = r.bufferBase - r.parent.bufferBase, r = r.parent), l > 0 && r.buffer[l - 4] == 0 && r.buffer[l - 1] > -1) {
        if (t == a)
          return;
        if (r.buffer[l - 2] >= t) {
          r.buffer[l - 2] = a;
          return;
        }
      }
    }
    if (!s || this.pos == a)
      this.buffer.push(O, t, a, i);
    else {
      let r = this.buffer.length;
      if (r > 0 && this.buffer[r - 4] != 0)
        for (; r > 0 && this.buffer[r - 2] > a; )
          this.buffer[r] = this.buffer[r - 4], this.buffer[r + 1] = this.buffer[r - 3], this.buffer[r + 2] = this.buffer[r - 2], this.buffer[r + 3] = this.buffer[r - 1], r -= 4, i > 4 && (i -= 4);
      this.buffer[r] = O, this.buffer[r + 1] = t, this.buffer[r + 2] = a, this.buffer[r + 3] = i;
    }
  }
  // Apply a shift action
  /// @internal
  shift(O, t, a) {
    let i = this.pos;
    if (O & 131072)
      this.pushState(O & 65535, this.pos);
    else if (O & 262144)
      this.pos = a, this.shiftContext(t, i), t <= this.p.parser.maxNode && this.buffer.push(t, i, a, 4);
    else {
      let s = O, { parser: r } = this.p;
      (a > this.pos || t <= r.maxNode) && (this.pos = a, r.stateFlag(
        s,
        1
        /* StateFlag.Skipped */
      ) || (this.reducePos = a)), this.pushState(s, i), this.shiftContext(t, i), t <= r.maxNode && this.buffer.push(t, i, a, 4);
    }
  }
  // Apply an action
  /// @internal
  apply(O, t, a) {
    O & 65536 ? this.reduce(O) : this.shift(O, t, a);
  }
  // Add a prebuilt (reused) node into the buffer.
  /// @internal
  useNode(O, t) {
    let a = this.p.reused.length - 1;
    (a < 0 || this.p.reused[a] != O) && (this.p.reused.push(O), a++);
    let i = this.pos;
    this.reducePos = this.pos = i + O.length, this.pushState(t, i), this.buffer.push(
      a,
      i,
      this.reducePos,
      -1
      /* size == -1 means this is a reused value */
    ), this.curContext && this.updateContext(this.curContext.tracker.reuse(this.curContext.context, O, this, this.p.stream.reset(this.pos - O.length)));
  }
  // Split the stack. Due to the buffer sharing and the fact
  // that `this.stack` tends to stay quite shallow, this isn't very
  // expensive.
  /// @internal
  split() {
    let O = this, t = O.buffer.length;
    for (; t > 0 && O.buffer[t - 2] > O.reducePos; )
      t -= 4;
    let a = O.buffer.slice(t), i = O.bufferBase + t;
    for (; O && i == O.bufferBase; )
      O = O.parent;
    return new A(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, a, i, this.curContext, this.lookAhead, O);
  }
  // Try to recover from an error by 'deleting' (ignoring) one token.
  /// @internal
  recoverByDelete(O, t) {
    let a = O <= this.p.parser.maxNode;
    a && this.storeNode(O, this.pos, t, 4), this.storeNode(0, this.pos, t, a ? 8 : 4), this.pos = this.reducePos = t, this.score -= 190;
  }
  /// Check if the given term would be able to be shifted (optionally
  /// after some reductions) on this stack. This can be useful for
  /// external tokenizers that want to make sure they only provide a
  /// given token when it applies.
  canShift(O) {
    for (let t = new Ce(this); ; ) {
      let a = this.p.parser.stateSlot(
        t.state,
        4
        /* ParseState.DefaultReduce */
      ) || this.p.parser.hasAction(t.state, O);
      if (a == 0)
        return !1;
      if (!(a & 65536))
        return !0;
      t.reduce(a);
    }
  }
  // Apply up to Recover.MaxNext recovery actions that conceptually
  // inserts some missing token or rule.
  /// @internal
  recoverByInsert(O) {
    if (this.stack.length >= 300)
      return [];
    let t = this.p.parser.nextStates(this.state);
    if (t.length > 8 || this.stack.length >= 120) {
      let i = [];
      for (let s = 0, r; s < t.length; s += 2)
        (r = t[s + 1]) != this.state && this.p.parser.hasAction(r, O) && i.push(t[s], r);
      if (this.stack.length < 120)
        for (let s = 0; i.length < 8 && s < t.length; s += 2) {
          let r = t[s + 1];
          i.some((l, n) => n & 1 && l == r) || i.push(t[s], r);
        }
      t = i;
    }
    let a = [];
    for (let i = 0; i < t.length && a.length < 4; i += 2) {
      let s = t[i + 1];
      if (s == this.state)
        continue;
      let r = this.split();
      r.pushState(s, this.pos), r.storeNode(0, r.pos, r.pos, 4, !0), r.shiftContext(t[i], this.pos), r.score -= 200, a.push(r);
    }
    return a;
  }
  // Force a reduce, if possible. Return false if that can't
  // be done.
  /// @internal
  forceReduce() {
    let { parser: O } = this.p, t = O.stateSlot(
      this.state,
      5
      /* ParseState.ForcedReduce */
    );
    if (!(t & 65536))
      return !1;
    if (!O.validAction(this.state, t)) {
      let a = t >> 19, i = t & 65535, s = this.stack.length - a * 3;
      if (s < 0 || O.getGoto(this.stack[s], i, !1) < 0) {
        let r = this.findForcedReduction();
        if (r == null)
          return !1;
        t = r;
      }
      this.storeNode(0, this.pos, this.pos, 4, !0), this.score -= 100;
    }
    return this.reducePos = this.pos, this.reduce(t), !0;
  }
  /// Try to scan through the automaton to find some kind of reduction
  /// that can be applied. Used when the regular ForcedReduce field
  /// isn't a valid action. @internal
  findForcedReduction() {
    let { parser: O } = this.p, t = [], a = (i, s) => {
      if (!t.includes(i))
        return t.push(i), O.allActions(i, (r) => {
          if (!(r & 393216)) if (r & 65536) {
            let l = (r >> 19) - s;
            if (l > 1) {
              let n = r & 65535, Q = this.stack.length - l * 3;
              if (Q >= 0 && O.getGoto(this.stack[Q], n, !1) >= 0)
                return l << 19 | 65536 | n;
            }
          } else {
            let l = a(r, s + 1);
            if (l != null)
              return l;
          }
        });
    };
    return a(this.state, 0);
  }
  /// @internal
  forceAll() {
    for (; !this.p.parser.stateFlag(
      this.state,
      2
      /* StateFlag.Accepting */
    ); )
      if (!this.forceReduce()) {
        this.storeNode(0, this.pos, this.pos, 4, !0);
        break;
      }
    return this;
  }
  /// Check whether this state has no further actions (assumed to be a direct descendant of the
  /// top state, since any other states must be able to continue
  /// somehow). @internal
  get deadEnd() {
    if (this.stack.length != 3)
      return !1;
    let { parser: O } = this.p;
    return O.data[O.stateSlot(
      this.state,
      1
      /* ParseState.Actions */
    )] == 65535 && !O.stateSlot(
      this.state,
      4
      /* ParseState.DefaultReduce */
    );
  }
  /// Restart the stack (put it back in its start state). Only safe
  /// when this.stack.length == 3 (state is directly below the top
  /// state). @internal
  restart() {
    this.state = this.stack[0], this.stack.length = 0;
  }
  /// @internal
  sameState(O) {
    if (this.state != O.state || this.stack.length != O.stack.length)
      return !1;
    for (let t = 0; t < this.stack.length; t += 3)
      if (this.stack[t] != O.stack[t])
        return !1;
    return !0;
  }
  /// Get the parser used by this stack.
  get parser() {
    return this.p.parser;
  }
  /// Test whether a given dialect (by numeric ID, as exported from
  /// the terms file) is enabled.
  dialectEnabled(O) {
    return this.p.parser.dialect.flags[O];
  }
  shiftContext(O, t) {
    this.curContext && this.updateContext(this.curContext.tracker.shift(this.curContext.context, O, this, this.p.stream.reset(t)));
  }
  reduceContext(O, t) {
    this.curContext && this.updateContext(this.curContext.tracker.reduce(this.curContext.context, O, this, this.p.stream.reset(t)));
  }
  /// @internal
  emitContext() {
    let O = this.buffer.length - 1;
    (O < 0 || this.buffer[O] != -3) && this.buffer.push(this.curContext.hash, this.pos, this.pos, -3);
  }
  /// @internal
  emitLookAhead() {
    let O = this.buffer.length - 1;
    (O < 0 || this.buffer[O] != -4) && this.buffer.push(this.lookAhead, this.pos, this.pos, -4);
  }
  updateContext(O) {
    if (O != this.curContext.context) {
      let t = new SO(this.curContext.tracker, O);
      t.hash != this.curContext.hash && this.emitContext(), this.curContext = t;
    }
  }
  /// @internal
  setLookAhead(O) {
    O > this.lookAhead && (this.emitLookAhead(), this.lookAhead = O);
  }
  /// @internal
  close() {
    this.curContext && this.curContext.tracker.strict && this.emitContext(), this.lookAhead > 0 && this.emitLookAhead();
  }
}
class SO {
  constructor(O, t) {
    this.tracker = O, this.context = t, this.hash = O.strict ? O.hash(t) : 0;
  }
}
var dO;
(function(e) {
  e[e.Insert = 200] = "Insert", e[e.Delete = 190] = "Delete", e[e.Reduce = 100] = "Reduce", e[e.MaxNext = 4] = "MaxNext", e[e.MaxInsertStackDepth = 300] = "MaxInsertStackDepth", e[e.DampenInsertStackDepth = 120] = "DampenInsertStackDepth", e[e.MinBigReduction = 2e3] = "MinBigReduction";
})(dO || (dO = {}));
class Ce {
  constructor(O) {
    this.start = O, this.state = O.state, this.stack = O.stack, this.base = this.stack.length;
  }
  reduce(O) {
    let t = O & 65535, a = O >> 19;
    a == 0 ? (this.stack == this.start.stack && (this.stack = this.stack.slice()), this.stack.push(this.state, 0, 0), this.base += 3) : this.base -= (a - 1) * 3;
    let i = this.start.p.parser.getGoto(this.stack[this.base - 3], t, !0);
    this.state = i;
  }
}
class E {
  constructor(O, t, a) {
    this.stack = O, this.pos = t, this.index = a, this.buffer = O.buffer, this.index == 0 && this.maybeNext();
  }
  static create(O, t = O.bufferBase + O.buffer.length) {
    return new E(O, t, t - O.bufferBase);
  }
  maybeNext() {
    let O = this.stack.parent;
    O != null && (this.index = this.stack.bufferBase - O.bufferBase, this.stack = O, this.buffer = O.buffer);
  }
  get id() {
    return this.buffer[this.index - 4];
  }
  get start() {
    return this.buffer[this.index - 3];
  }
  get end() {
    return this.buffer[this.index - 2];
  }
  get size() {
    return this.buffer[this.index - 1];
  }
  next() {
    this.index -= 4, this.pos -= 4, this.index == 0 && this.maybeNext();
  }
  fork() {
    return new E(this.stack, this.pos, this.index);
  }
}
function R(e, O = Uint16Array) {
  if (typeof e != "string")
    return e;
  let t = null;
  for (let a = 0, i = 0; a < e.length; ) {
    let s = 0;
    for (; ; ) {
      let r = e.charCodeAt(a++), l = !1;
      if (r == 126) {
        s = 65535;
        break;
      }
      r >= 92 && r--, r >= 34 && r--;
      let n = r - 32;
      if (n >= 46 && (n -= 46, l = !0), s += n, l)
        break;
      s *= 46;
    }
    t ? t[i++] = s : t = new O(s);
  }
  return t;
}
class z {
  constructor() {
    this.start = -1, this.value = -1, this.end = -1, this.extended = -1, this.lookAhead = 0, this.mask = 0, this.context = 0;
  }
}
const gO = new z();
class ze {
  /// @internal
  constructor(O, t) {
    this.input = O, this.ranges = t, this.chunk = "", this.chunkOff = 0, this.chunk2 = "", this.chunk2Pos = 0, this.next = -1, this.token = gO, this.rangeIndex = 0, this.pos = this.chunkPos = t[0].from, this.range = t[0], this.end = t[t.length - 1].to, this.readNext();
  }
  /// @internal
  resolveOffset(O, t) {
    let a = this.range, i = this.rangeIndex, s = this.pos + O;
    for (; s < a.from; ) {
      if (!i)
        return null;
      let r = this.ranges[--i];
      s -= a.from - r.to, a = r;
    }
    for (; t < 0 ? s > a.to : s >= a.to; ) {
      if (i == this.ranges.length - 1)
        return null;
      let r = this.ranges[++i];
      s += r.from - a.to, a = r;
    }
    return s;
  }
  /// @internal
  clipPos(O) {
    if (O >= this.range.from && O < this.range.to)
      return O;
    for (let t of this.ranges)
      if (t.to > O)
        return Math.max(O, t.from);
    return this.end;
  }
  /// Look at a code unit near the stream position. `.peek(0)` equals
  /// `.next`, `.peek(-1)` gives you the previous character, and so
  /// on.
  ///
  /// Note that looking around during tokenizing creates dependencies
  /// on potentially far-away content, which may reduce the
  /// effectiveness incremental parsing—when looking forward—or even
  /// cause invalid reparses when looking backward more than 25 code
  /// units, since the library does not track lookbehind.
  peek(O) {
    let t = this.chunkOff + O, a, i;
    if (t >= 0 && t < this.chunk.length)
      a = this.pos + O, i = this.chunk.charCodeAt(t);
    else {
      let s = this.resolveOffset(O, 1);
      if (s == null)
        return -1;
      if (a = s, a >= this.chunk2Pos && a < this.chunk2Pos + this.chunk2.length)
        i = this.chunk2.charCodeAt(a - this.chunk2Pos);
      else {
        let r = this.rangeIndex, l = this.range;
        for (; l.to <= a; )
          l = this.ranges[++r];
        this.chunk2 = this.input.chunk(this.chunk2Pos = a), a + this.chunk2.length > l.to && (this.chunk2 = this.chunk2.slice(0, l.to - a)), i = this.chunk2.charCodeAt(0);
      }
    }
    return a >= this.token.lookAhead && (this.token.lookAhead = a + 1), i;
  }
  /// Accept a token. By default, the end of the token is set to the
  /// current stream position, but you can pass an offset (relative to
  /// the stream position) to change that.
  acceptToken(O, t = 0) {
    let a = t ? this.resolveOffset(t, -1) : this.pos;
    if (a == null || a < this.token.start)
      throw new RangeError("Token end out of bounds");
    this.token.value = O, this.token.end = a;
  }
  getChunk() {
    if (this.pos >= this.chunk2Pos && this.pos < this.chunk2Pos + this.chunk2.length) {
      let { chunk: O, chunkPos: t } = this;
      this.chunk = this.chunk2, this.chunkPos = this.chunk2Pos, this.chunk2 = O, this.chunk2Pos = t, this.chunkOff = this.pos - this.chunkPos;
    } else {
      this.chunk2 = this.chunk, this.chunk2Pos = this.chunkPos;
      let O = this.input.chunk(this.pos), t = this.pos + O.length;
      this.chunk = t > this.range.to ? O.slice(0, this.range.to - this.pos) : O, this.chunkPos = this.pos, this.chunkOff = 0;
    }
  }
  readNext() {
    return this.chunkOff >= this.chunk.length && (this.getChunk(), this.chunkOff == this.chunk.length) ? this.next = -1 : this.next = this.chunk.charCodeAt(this.chunkOff);
  }
  /// Move the stream forward N (defaults to 1) code units. Returns
  /// the new value of [`next`](#lr.InputStream.next).
  advance(O = 1) {
    for (this.chunkOff += O; this.pos + O >= this.range.to; ) {
      if (this.rangeIndex == this.ranges.length - 1)
        return this.setDone();
      O -= this.range.to - this.pos, this.range = this.ranges[++this.rangeIndex], this.pos = this.range.from;
    }
    return this.pos += O, this.pos >= this.token.lookAhead && (this.token.lookAhead = this.pos + 1), this.readNext();
  }
  setDone() {
    return this.pos = this.chunkPos = this.end, this.range = this.ranges[this.rangeIndex = this.ranges.length - 1], this.chunk = "", this.next = -1;
  }
  /// @internal
  reset(O, t) {
    if (t ? (this.token = t, t.start = O, t.lookAhead = O + 1, t.value = t.extended = -1) : this.token = gO, this.pos != O) {
      if (this.pos = O, O == this.end)
        return this.setDone(), this;
      for (; O < this.range.from; )
        this.range = this.ranges[--this.rangeIndex];
      for (; O >= this.range.to; )
        this.range = this.ranges[++this.rangeIndex];
      O >= this.chunkPos && O < this.chunkPos + this.chunk.length ? this.chunkOff = O - this.chunkPos : (this.chunk = "", this.chunkOff = 0), this.readNext();
    }
    return this;
  }
  /// @internal
  read(O, t) {
    if (O >= this.chunkPos && t <= this.chunkPos + this.chunk.length)
      return this.chunk.slice(O - this.chunkPos, t - this.chunkPos);
    if (O >= this.chunk2Pos && t <= this.chunk2Pos + this.chunk2.length)
      return this.chunk2.slice(O - this.chunk2Pos, t - this.chunk2Pos);
    if (O >= this.range.from && t <= this.range.to)
      return this.input.read(O, t);
    let a = "";
    for (let i of this.ranges) {
      if (i.from >= t)
        break;
      i.to > O && (a += this.input.read(Math.max(i.from, O), Math.min(i.to, t)));
    }
    return a;
  }
}
class k {
  constructor(O, t) {
    this.data = O, this.id = t;
  }
  token(O, t) {
    let { parser: a } = t.p;
    FO(this.data, O, t, this.id, a.data, a.tokenPrecTable);
  }
}
k.prototype.contextual = k.prototype.fallback = k.prototype.extend = !1;
class N {
  constructor(O, t, a) {
    this.precTable = t, this.elseToken = a, this.data = typeof O == "string" ? R(O) : O;
  }
  token(O, t) {
    let a = O.pos, i = 0;
    for (; ; ) {
      let s = O.next < 0, r = O.resolveOffset(1, 1);
      if (FO(this.data, O, t, 0, this.data, this.precTable), O.token.value > -1)
        break;
      if (this.elseToken == null)
        return;
      if (s || i++, r == null)
        break;
      O.reset(r, O.token);
    }
    i && (O.reset(a, O.token), O.acceptToken(this.elseToken, i));
  }
}
N.prototype.contextual = k.prototype.fallback = k.prototype.extend = !1;
class Z {
  /// Create a tokenizer. The first argument is the function that,
  /// given an input stream, scans for the types of tokens it
  /// recognizes at the stream's position, and calls
  /// [`acceptToken`](#lr.InputStream.acceptToken) when it finds
  /// one.
  constructor(O, t = {}) {
    this.token = O, this.contextual = !!t.contextual, this.fallback = !!t.fallback, this.extend = !!t.extend;
  }
}
function FO(e, O, t, a, i, s) {
  let r = 0, l = 1 << a, { dialect: n } = t.p.parser;
  O: for (; l & e[r]; ) {
    let Q = e[r + 1];
    for (let p = r + 3; p < Q; p += 2)
      if ((e[p + 1] & l) > 0) {
        let f = e[p];
        if (n.allows(f) && (O.token.value == -1 || O.token.value == f || Ge(f, O.token.value, i, s))) {
          O.acceptToken(f);
          break;
        }
      }
    let $ = O.next, c = 0, h = e[r + 2];
    if (O.next < 0 && h > c && e[Q + h * 3 - 3] == 65535 && e[Q + h * 3 - 3] == 65535) {
      r = e[Q + h * 3 - 1];
      continue O;
    }
    for (; c < h; ) {
      let p = c + h >> 1, f = Q + p + (p << 1), S = e[f], d = e[f + 1] || 65536;
      if ($ < S)
        h = p;
      else if ($ >= d)
        c = p + 1;
      else {
        r = e[f + 2], O.advance();
        continue O;
      }
    }
    break;
  }
}
function XO(e, O, t) {
  for (let a = O, i; (i = e[a]) != 65535; a++)
    if (i == t)
      return a - O;
  return -1;
}
function Ge(e, O, t, a) {
  let i = XO(t, a, O);
  return i < 0 || XO(t, a, e) < i;
}
const P = typeof process < "u" && process.env && /\bparse\b/.test(process.env.LOG);
let M = null;
var PO;
(function(e) {
  e[e.Margin = 25] = "Margin";
})(PO || (PO = {}));
function mO(e, O, t) {
  let a = e.cursor(lO.IncludeAnonymous);
  for (a.moveTo(O); ; )
    if (!(t < 0 ? a.childBefore(O) : a.childAfter(O)))
      for (; ; ) {
        if ((t < 0 ? a.to < O : a.from > O) && !a.type.isError)
          return t < 0 ? Math.max(0, Math.min(
            a.to - 1,
            O - 25
            /* Safety.Margin */
          )) : Math.min(e.length, Math.max(
            a.from + 1,
            O + 25
            /* Safety.Margin */
          ));
        if (t < 0 ? a.prevSibling() : a.nextSibling())
          break;
        if (!a.parent())
          return t < 0 ? 0 : e.length;
      }
}
class Ie {
  constructor(O, t) {
    this.fragments = O, this.nodeSet = t, this.i = 0, this.fragment = null, this.safeFrom = -1, this.safeTo = -1, this.trees = [], this.start = [], this.index = [], this.nextFragment();
  }
  nextFragment() {
    let O = this.fragment = this.i == this.fragments.length ? null : this.fragments[this.i++];
    if (O) {
      for (this.safeFrom = O.openStart ? mO(O.tree, O.from + O.offset, 1) - O.offset : O.from, this.safeTo = O.openEnd ? mO(O.tree, O.to + O.offset, -1) - O.offset : O.to; this.trees.length; )
        this.trees.pop(), this.start.pop(), this.index.pop();
      this.trees.push(O.tree), this.start.push(-O.offset), this.index.push(0), this.nextStart = this.safeFrom;
    } else
      this.nextStart = 1e9;
  }
  // `pos` must be >= any previously given `pos` for this cursor
  nodeAt(O) {
    if (O < this.nextStart)
      return null;
    for (; this.fragment && this.safeTo <= O; )
      this.nextFragment();
    if (!this.fragment)
      return null;
    for (; ; ) {
      let t = this.trees.length - 1;
      if (t < 0)
        return this.nextFragment(), null;
      let a = this.trees[t], i = this.index[t];
      if (i == a.children.length) {
        this.trees.pop(), this.start.pop(), this.index.pop();
        continue;
      }
      let s = a.children[i], r = this.start[t] + a.positions[i];
      if (r > O)
        return this.nextStart = r, null;
      if (s instanceof q) {
        if (r == O) {
          if (r < this.safeFrom)
            return null;
          let l = r + s.length;
          if (l <= this.safeTo) {
            let n = s.prop(sO.lookAhead);
            if (!n || l + n < this.fragment.to)
              return s;
          }
        }
        this.index[t]++, r + s.length >= Math.max(this.safeFrom, O) && (this.trees.push(s), this.start.push(r), this.index.push(0));
      } else
        this.index[t]++, this.nextStart = r + s.length;
    }
  }
}
class Ae {
  constructor(O, t) {
    this.stream = t, this.tokens = [], this.mainToken = null, this.actions = [], this.tokens = O.tokenizers.map((a) => new z());
  }
  getActions(O) {
    let t = 0, a = null, { parser: i } = O.p, { tokenizers: s } = i, r = i.stateSlot(
      O.state,
      3
      /* ParseState.TokenizerMask */
    ), l = O.curContext ? O.curContext.hash : 0, n = 0;
    for (let Q = 0; Q < s.length; Q++) {
      if (!(1 << Q & r))
        continue;
      let $ = s[Q], c = this.tokens[Q];
      if (!(a && !$.fallback) && (($.contextual || c.start != O.pos || c.mask != r || c.context != l) && (this.updateCachedToken(c, $, O), c.mask = r, c.context = l), c.lookAhead > c.end + 25 && (n = Math.max(c.lookAhead, n)), c.value != 0)) {
        let h = t;
        if (c.extended > -1 && (t = this.addActions(O, c.extended, c.end, t)), t = this.addActions(O, c.value, c.end, t), !$.extend && (a = c, t > h))
          break;
      }
    }
    for (; this.actions.length > t; )
      this.actions.pop();
    return n && O.setLookAhead(n), !a && O.pos == this.stream.end && (a = new z(), a.value = O.p.parser.eofTerm, a.start = a.end = O.pos, t = this.addActions(O, a.value, a.end, t)), this.mainToken = a, this.actions;
  }
  getMainToken(O) {
    if (this.mainToken)
      return this.mainToken;
    let t = new z(), { pos: a, p: i } = O;
    return t.start = a, t.end = Math.min(a + 1, i.stream.end), t.value = a == i.stream.end ? i.parser.eofTerm : 0, t;
  }
  updateCachedToken(O, t, a) {
    let i = this.stream.clipPos(a.pos);
    if (t.token(this.stream.reset(i, O), a), O.value > -1) {
      let { parser: s } = a.p;
      for (let r = 0; r < s.specialized.length; r++)
        if (s.specialized[r] == O.value) {
          let l = s.specializers[r](this.stream.read(O.start, O.end), a);
          if (l >= 0 && a.p.parser.dialect.allows(l >> 1)) {
            l & 1 ? O.extended = l >> 1 : O.value = l >> 1;
            break;
          }
        }
    } else
      O.value = 0, O.end = this.stream.clipPos(i + 1);
  }
  putAction(O, t, a, i) {
    for (let s = 0; s < i; s += 3)
      if (this.actions[s] == O)
        return i;
    return this.actions[i++] = O, this.actions[i++] = t, this.actions[i++] = a, i;
  }
  addActions(O, t, a, i) {
    let { state: s } = O, { parser: r } = O.p, { data: l } = r;
    for (let n = 0; n < 2; n++)
      for (let Q = r.stateSlot(
        s,
        n ? 2 : 1
        /* ParseState.Actions */
      ); ; Q += 3) {
        if (l[Q] == 65535)
          if (l[Q + 1] == 1)
            Q = b(l, Q + 2);
          else {
            i == 0 && l[Q + 1] == 2 && (i = this.putAction(b(l, Q + 2), t, a, i));
            break;
          }
        l[Q] == t && (i = this.putAction(b(l, Q + 1), t, a, i));
      }
    return i;
  }
}
var ZO;
(function(e) {
  e[e.Distance = 5] = "Distance", e[e.MaxRemainingPerStep = 3] = "MaxRemainingPerStep", e[e.MinBufferLengthPrune = 500] = "MinBufferLengthPrune", e[e.ForceReduceLimit = 10] = "ForceReduceLimit", e[e.CutDepth = 15e3] = "CutDepth", e[e.CutTo = 9e3] = "CutTo", e[e.MaxLeftAssociativeReductionCount = 300] = "MaxLeftAssociativeReductionCount", e[e.MaxStackCount = 12] = "MaxStackCount";
})(ZO || (ZO = {}));
class Ee {
  constructor(O, t, a, i) {
    this.parser = O, this.input = t, this.ranges = i, this.recovering = 0, this.nextStackID = 9812, this.minStackPos = 0, this.reused = [], this.stoppedAt = null, this.lastBigReductionStart = -1, this.lastBigReductionSize = 0, this.bigReductionCount = 0, this.stream = new ze(t, i), this.tokens = new Ae(O, this.stream), this.topTerm = O.top[1];
    let { from: s } = i[0];
    this.stacks = [A.start(this, O.top[0], s)], this.fragments = a.length && this.stream.end - s > O.bufferLength * 4 ? new Ie(a, O.nodeSet) : null;
  }
  get parsedPos() {
    return this.minStackPos;
  }
  // Move the parser forward. This will process all parse stacks at
  // `this.pos` and try to advance them to a further position. If no
  // stack for such a position is found, it'll start error-recovery.
  //
  // When the parse is finished, this will return a syntax tree. When
  // not, it returns `null`.
  advance() {
    let O = this.stacks, t = this.minStackPos, a = this.stacks = [], i, s;
    if (this.bigReductionCount > 300 && O.length == 1) {
      let [r] = O;
      for (; r.forceReduce() && r.stack.length && r.stack[r.stack.length - 2] >= this.lastBigReductionStart; )
        ;
      this.bigReductionCount = this.lastBigReductionSize = 0;
    }
    for (let r = 0; r < O.length; r++) {
      let l = O[r];
      for (; ; ) {
        if (this.tokens.mainToken = null, l.pos > t)
          a.push(l);
        else {
          if (this.advanceStack(l, a, O))
            continue;
          {
            i || (i = [], s = []), i.push(l);
            let n = this.tokens.getMainToken(l);
            s.push(n.value, n.end);
          }
        }
        break;
      }
    }
    if (!a.length) {
      let r = i && Be(i);
      if (r)
        return this.stackToTree(r);
      if (this.parser.strict)
        throw P && i && console.log("Stuck with token " + (this.tokens.mainToken ? this.parser.getName(this.tokens.mainToken.value) : "none")), new SyntaxError("No parse at " + t);
      this.recovering || (this.recovering = 5);
    }
    if (this.recovering && i) {
      let r = this.stoppedAt != null && i[0].pos > this.stoppedAt ? i[0] : this.runRecovery(i, s, a);
      if (r)
        return this.stackToTree(r.forceAll());
    }
    if (this.recovering) {
      let r = this.recovering == 1 ? 1 : this.recovering * 3;
      if (a.length > r)
        for (a.sort((l, n) => n.score - l.score); a.length > r; )
          a.pop();
      a.some((l) => l.reducePos > t) && this.recovering--;
    } else if (a.length > 1) {
      O: for (let r = 0; r < a.length - 1; r++) {
        let l = a[r];
        for (let n = r + 1; n < a.length; n++) {
          let Q = a[n];
          if (l.sameState(Q) || l.buffer.length > 500 && Q.buffer.length > 500)
            if ((l.score - Q.score || l.buffer.length - Q.buffer.length) > 0)
              a.splice(n--, 1);
            else {
              a.splice(r--, 1);
              continue O;
            }
        }
      }
      a.length > 12 && a.splice(
        12,
        a.length - 12
        /* Rec.MaxStackCount */
      );
    }
    this.minStackPos = a[0].pos;
    for (let r = 1; r < a.length; r++)
      a[r].pos < this.minStackPos && (this.minStackPos = a[r].pos);
    return null;
  }
  stopAt(O) {
    if (this.stoppedAt != null && this.stoppedAt < O)
      throw new RangeError("Can't move stoppedAt forward");
    this.stoppedAt = O;
  }
  // Returns an updated version of the given stack, or null if the
  // stack can't advance normally. When `split` and `stacks` are
  // given, stacks split off by ambiguous operations will be pushed to
  // `split`, or added to `stacks` if they move `pos` forward.
  advanceStack(O, t, a) {
    let i = O.pos, { parser: s } = this, r = P ? this.stackID(O) + " -> " : "";
    if (this.stoppedAt != null && i > this.stoppedAt)
      return O.forceReduce() ? O : null;
    if (this.fragments) {
      let Q = O.curContext && O.curContext.tracker.strict, $ = Q ? O.curContext.hash : 0;
      for (let c = this.fragments.nodeAt(i); c; ) {
        let h = this.parser.nodeSet.types[c.type.id] == c.type ? s.getGoto(O.state, c.type.id) : -1;
        if (h > -1 && c.length && (!Q || (c.prop(sO.contextHash) || 0) == $))
          return O.useNode(c, h), P && console.log(r + this.stackID(O) + ` (via reuse of ${s.getName(c.type.id)})`), !0;
        if (!(c instanceof q) || c.children.length == 0 || c.positions[0] > 0)
          break;
        let p = c.children[0];
        if (p instanceof q && c.positions[0] == 0)
          c = p;
        else
          break;
      }
    }
    let l = s.stateSlot(
      O.state,
      4
      /* ParseState.DefaultReduce */
    );
    if (l > 0)
      return O.reduce(l), P && console.log(r + this.stackID(O) + ` (via always-reduce ${s.getName(
        l & 65535
        /* Action.ValueMask */
      )})`), !0;
    if (O.stack.length >= 15e3)
      for (; O.stack.length > 9e3 && O.forceReduce(); )
        ;
    let n = this.tokens.getActions(O);
    for (let Q = 0; Q < n.length; ) {
      let $ = n[Q++], c = n[Q++], h = n[Q++], p = Q == n.length || !a, f = p ? O : O.split();
      if (f.apply($, c, h), P && console.log(r + this.stackID(f) + ` (via ${$ & 65536 ? `reduce of ${s.getName(
        $ & 65535
        /* Action.ValueMask */
      )}` : "shift"} for ${s.getName(c)} @ ${i}${f == O ? "" : ", split"})`), p)
        return !0;
      f.pos > i ? t.push(f) : a.push(f);
    }
    return !1;
  }
  // Advance a given stack forward as far as it will go. Returns the
  // (possibly updated) stack if it got stuck, or null if it moved
  // forward and was given to `pushStackDedup`.
  advanceFully(O, t) {
    let a = O.pos;
    for (; ; ) {
      if (!this.advanceStack(O, null, null))
        return !1;
      if (O.pos > a)
        return bO(O, t), !0;
    }
  }
  runRecovery(O, t, a) {
    let i = null, s = !1;
    for (let r = 0; r < O.length; r++) {
      let l = O[r], n = t[r << 1], Q = t[(r << 1) + 1], $ = P ? this.stackID(l) + " -> " : "";
      if (l.deadEnd && (s || (s = !0, l.restart(), P && console.log($ + this.stackID(l) + " (restarted)"), this.advanceFully(l, a))))
        continue;
      let c = l.split(), h = $;
      for (let p = 0; c.forceReduce() && p < 10 && (P && console.log(h + this.stackID(c) + " (via force-reduce)"), !this.advanceFully(c, a)); p++)
        P && (h = this.stackID(c) + " -> ");
      for (let p of l.recoverByInsert(n))
        P && console.log($ + this.stackID(p) + " (via recover-insert)"), this.advanceFully(p, a);
      this.stream.end > l.pos ? (Q == l.pos && (Q++, n = 0), l.recoverByDelete(n, Q), P && console.log($ + this.stackID(l) + ` (via recover-delete ${this.parser.getName(n)})`), bO(l, a)) : (!i || i.score < l.score) && (i = l);
    }
    return i;
  }
  // Convert the stack's buffer to a syntax tree.
  stackToTree(O) {
    return O.close(), q.build({
      buffer: E.create(O),
      nodeSet: this.parser.nodeSet,
      topID: this.topTerm,
      maxBufferLength: this.parser.bufferLength,
      reused: this.reused,
      start: this.ranges[0].from,
      length: O.pos - this.ranges[0].from,
      minRepeatType: this.parser.minRepeatTerm
    });
  }
  stackID(O) {
    let t = (M || (M = /* @__PURE__ */ new WeakMap())).get(O);
    return t || M.set(O, t = String.fromCodePoint(this.nextStackID++)), t + O;
  }
}
function bO(e, O) {
  for (let t = 0; t < O.length; t++) {
    let a = O[t];
    if (a.pos == e.pos && a.sameState(e)) {
      O[t].score < e.score && (O[t] = e);
      return;
    }
  }
  O.push(e);
}
class Ne {
  constructor(O, t, a) {
    this.source = O, this.flags = t, this.disabled = a;
  }
  allows(O) {
    return !this.disabled || this.disabled[O] == 0;
  }
}
const L = (e) => e;
class KO {
  /// Define a context tracker.
  constructor(O) {
    this.start = O.start, this.shift = O.shift || L, this.reduce = O.reduce || L, this.reuse = O.reuse || L, this.hash = O.hash || (() => 0), this.strict = O.strict !== !1;
  }
}
class y extends ye {
  /// @internal
  constructor(O) {
    if (super(), this.wrappers = [], O.version != 14)
      throw new RangeError(`Parser version (${O.version}) doesn't match runtime version (14)`);
    let t = O.nodeNames.split(" ");
    this.minRepeatTerm = t.length;
    for (let l = 0; l < O.repeatNodeCount; l++)
      t.push("");
    let a = Object.keys(O.topRules).map((l) => O.topRules[l][1]), i = [];
    for (let l = 0; l < t.length; l++)
      i.push([]);
    function s(l, n, Q) {
      i[l].push([n, n.deserialize(String(Q))]);
    }
    if (O.nodeProps)
      for (let l of O.nodeProps) {
        let n = l[0];
        typeof n == "string" && (n = sO[n]);
        for (let Q = 1; Q < l.length; ) {
          let $ = l[Q++];
          if ($ >= 0)
            s($, n, l[Q++]);
          else {
            let c = l[Q + -$];
            for (let h = -$; h > 0; h--)
              s(l[Q++], n, c);
            Q++;
          }
        }
      }
    this.nodeSet = new Ye(t.map((l, n) => Te.define({
      name: n >= this.minRepeatTerm ? void 0 : l,
      id: n,
      props: i[n],
      top: a.indexOf(n) > -1,
      error: n == 0,
      skipped: O.skippedNodes && O.skippedNodes.indexOf(n) > -1
    }))), O.propSources && (this.nodeSet = this.nodeSet.extend(...O.propSources)), this.strict = !1, this.bufferLength = Ue;
    let r = R(O.tokenData);
    this.context = O.context, this.specializerSpecs = O.specialized || [], this.specialized = new Uint16Array(this.specializerSpecs.length);
    for (let l = 0; l < this.specializerSpecs.length; l++)
      this.specialized[l] = this.specializerSpecs[l].term;
    this.specializers = this.specializerSpecs.map(xO), this.states = R(O.states, Uint32Array), this.data = R(O.stateData), this.goto = R(O.goto), this.maxTerm = O.maxTerm, this.tokenizers = O.tokenizers.map((l) => typeof l == "number" ? new k(r, l) : l), this.topRules = O.topRules, this.dialects = O.dialects || {}, this.dynamicPrecedences = O.dynamicPrecedences || null, this.tokenPrecTable = O.tokenPrec, this.termNames = O.termNames || null, this.maxNode = this.nodeSet.types.length - 1, this.dialect = this.parseDialect(), this.top = this.topRules[Object.keys(this.topRules)[0]];
  }
  createParse(O, t, a) {
    let i = new Ee(this, O, t, a);
    for (let s of this.wrappers)
      i = s(i, O, t, a);
    return i;
  }
  /// Get a goto table entry @internal
  getGoto(O, t, a = !1) {
    let i = this.goto;
    if (t >= i[0])
      return -1;
    for (let s = i[t + 1]; ; ) {
      let r = i[s++], l = r & 1, n = i[s++];
      if (l && a)
        return n;
      for (let Q = s + (r >> 1); s < Q; s++)
        if (i[s] == O)
          return n;
      if (l)
        return -1;
    }
  }
  /// Check if this state has an action for a given terminal @internal
  hasAction(O, t) {
    let a = this.data;
    for (let i = 0; i < 2; i++)
      for (let s = this.stateSlot(
        O,
        i ? 2 : 1
        /* ParseState.Actions */
      ), r; ; s += 3) {
        if ((r = a[s]) == 65535)
          if (a[s + 1] == 1)
            r = a[s = b(a, s + 2)];
          else {
            if (a[s + 1] == 2)
              return b(a, s + 2);
            break;
          }
        if (r == t || r == 0)
          return b(a, s + 1);
      }
    return 0;
  }
  /// @internal
  stateSlot(O, t) {
    return this.states[O * 6 + t];
  }
  /// @internal
  stateFlag(O, t) {
    return (this.stateSlot(
      O,
      0
      /* ParseState.Flags */
    ) & t) > 0;
  }
  /// @internal
  validAction(O, t) {
    return !!this.allActions(O, (a) => a == t ? !0 : null);
  }
  /// @internal
  allActions(O, t) {
    let a = this.stateSlot(
      O,
      4
      /* ParseState.DefaultReduce */
    ), i = a ? t(a) : void 0;
    for (let s = this.stateSlot(
      O,
      1
      /* ParseState.Actions */
    ); i == null; s += 3) {
      if (this.data[s] == 65535)
        if (this.data[s + 1] == 1)
          s = b(this.data, s + 2);
        else
          break;
      i = t(b(this.data, s + 1));
    }
    return i;
  }
  /// Get the states that can follow this one through shift actions or
  /// goto jumps. @internal
  nextStates(O) {
    let t = [];
    for (let a = this.stateSlot(
      O,
      1
      /* ParseState.Actions */
    ); ; a += 3) {
      if (this.data[a] == 65535)
        if (this.data[a + 1] == 1)
          a = b(this.data, a + 2);
        else
          break;
      if (!(this.data[a + 2] & 1)) {
        let i = this.data[a + 1];
        t.some((s, r) => r & 1 && s == i) || t.push(this.data[a], i);
      }
    }
    return t;
  }
  /// Configure the parser. Returns a new parser instance that has the
  /// given settings modified. Settings not provided in `config` are
  /// kept from the original parser.
  configure(O) {
    let t = Object.assign(Object.create(y.prototype), this);
    if (O.props && (t.nodeSet = this.nodeSet.extend(...O.props)), O.top) {
      let a = this.topRules[O.top];
      if (!a)
        throw new RangeError(`Invalid top rule name ${O.top}`);
      t.top = a;
    }
    return O.tokenizers && (t.tokenizers = this.tokenizers.map((a) => {
      let i = O.tokenizers.find((s) => s.from == a);
      return i ? i.to : a;
    })), O.specializers && (t.specializers = this.specializers.slice(), t.specializerSpecs = this.specializerSpecs.map((a, i) => {
      let s = O.specializers.find((l) => l.from == a.external);
      if (!s)
        return a;
      let r = Object.assign(Object.assign({}, a), { external: s.to });
      return t.specializers[i] = xO(r), r;
    })), O.contextTracker && (t.context = O.contextTracker), O.dialect && (t.dialect = this.parseDialect(O.dialect)), O.strict != null && (t.strict = O.strict), O.wrap && (t.wrappers = t.wrappers.concat(O.wrap)), O.bufferLength != null && (t.bufferLength = O.bufferLength), t;
  }
  /// Tells you whether any [parse wrappers](#lr.ParserConfig.wrap)
  /// are registered for this parser.
  hasWrappers() {
    return this.wrappers.length > 0;
  }
  /// Returns the name associated with a given term. This will only
  /// work for all terms when the parser was generated with the
  /// `--names` option. By default, only the names of tagged terms are
  /// stored.
  getName(O) {
    return this.termNames ? this.termNames[O] : String(O <= this.maxNode && this.nodeSet.types[O].name || O);
  }
  /// The eof term id is always allocated directly after the node
  /// types. @internal
  get eofTerm() {
    return this.maxNode + 1;
  }
  /// The type of top node produced by the parser.
  get topNode() {
    return this.nodeSet.types[this.top[1]];
  }
  /// @internal
  dynamicPrecedence(O) {
    let t = this.dynamicPrecedences;
    return t == null ? 0 : t[O] || 0;
  }
  /// @internal
  parseDialect(O) {
    let t = Object.keys(this.dialects), a = t.map(() => !1);
    if (O)
      for (let s of O.split(" ")) {
        let r = t.indexOf(s);
        r >= 0 && (a[r] = !0);
      }
    let i = null;
    for (let s = 0; s < t.length; s++)
      if (!a[s])
        for (let r = this.dialects[t[s]], l; (l = this.data[r++]) != 65535; )
          (i || (i = new Uint8Array(this.maxTerm + 1)))[l] = 1;
    return new Ne(O, a, i);
  }
  /// Used by the output of the parser generator. Not available to
  /// user code. @hide
  static deserialize(O) {
    return new y(O);
  }
}
function b(e, O) {
  return e[O] | e[O + 1] << 16;
}
function Be(e) {
  let O = null;
  for (let t of e) {
    let a = t.p.stoppedAt;
    (t.pos == t.p.stream.end || a != null && t.pos > a) && t.p.parser.stateFlag(
      t.state,
      2
      /* StateFlag.Accepting */
    ) && (!O || O.score < t.score) && (O = t);
  }
  return O;
}
function xO(e) {
  if (e.external) {
    let O = e.extend ? 1 : 0;
    return (t, a) => e.external(t, a) << 1 | O;
  }
  return e.get;
}
const De = 55, Je = 1, Me = 56, Le = 2, Fe = 57, Ke = 3, wO = 4, He = 5, pO = 6, HO = 7, Oe = 8, ee = 9, te = 10, Ot = 11, et = 12, tt = 13, F = 58, at = 14, it = 15, kO = 59, ae = 21, rt = 23, ie = 24, st = 25, iO = 27, re = 28, lt = 29, nt = 32, ot = 35, Qt = 37, ct = 38, ut = 0, pt = 1, $t = {
  area: !0,
  base: !0,
  br: !0,
  col: !0,
  command: !0,
  embed: !0,
  frame: !0,
  hr: !0,
  img: !0,
  input: !0,
  keygen: !0,
  link: !0,
  meta: !0,
  param: !0,
  source: !0,
  track: !0,
  wbr: !0,
  menuitem: !0
}, ht = {
  dd: !0,
  li: !0,
  optgroup: !0,
  option: !0,
  p: !0,
  rp: !0,
  rt: !0,
  tbody: !0,
  td: !0,
  tfoot: !0,
  th: !0,
  tr: !0
}, yO = {
  dd: { dd: !0, dt: !0 },
  dt: { dd: !0, dt: !0 },
  li: { li: !0 },
  option: { option: !0, optgroup: !0 },
  optgroup: { optgroup: !0 },
  p: {
    address: !0,
    article: !0,
    aside: !0,
    blockquote: !0,
    dir: !0,
    div: !0,
    dl: !0,
    fieldset: !0,
    footer: !0,
    form: !0,
    h1: !0,
    h2: !0,
    h3: !0,
    h4: !0,
    h5: !0,
    h6: !0,
    header: !0,
    hgroup: !0,
    hr: !0,
    menu: !0,
    nav: !0,
    ol: !0,
    p: !0,
    pre: !0,
    section: !0,
    table: !0,
    ul: !0
  },
  rp: { rp: !0, rt: !0 },
  rt: { rp: !0, rt: !0 },
  tbody: { tbody: !0, tfoot: !0 },
  td: { td: !0, th: !0 },
  tfoot: { tbody: !0 },
  th: { td: !0, th: !0 },
  thead: { tbody: !0, tfoot: !0 },
  tr: { tr: !0 }
};
function ft(e) {
  return e == 45 || e == 46 || e == 58 || e >= 65 && e <= 90 || e == 95 || e >= 97 && e <= 122 || e >= 161;
}
let YO = null, TO = null, UO = 0;
function rO(e, O) {
  let t = e.pos + O;
  if (UO == t && TO == e) return YO;
  let a = e.peek(O), i = "";
  for (; ft(a); )
    i += String.fromCharCode(a), a = e.peek(++O);
  return TO = e, UO = t, YO = i ? i.toLowerCase() : a == St || a == dt ? void 0 : null;
}
const se = 60, B = 62, $O = 47, St = 63, dt = 33, gt = 45;
function VO(e, O) {
  this.name = e, this.parent = O;
}
const Xt = [pO, te, HO, Oe, ee], Pt = new KO({
  start: null,
  shift(e, O, t, a) {
    return Xt.indexOf(O) > -1 ? new VO(rO(a, 1) || "", e) : e;
  },
  reduce(e, O) {
    return O == ae && e ? e.parent : e;
  },
  reuse(e, O, t, a) {
    let i = O.type.id;
    return i == pO || i == Qt ? new VO(rO(a, 1) || "", e) : e;
  },
  strict: !1
}), mt = new Z((e, O) => {
  if (e.next != se) {
    e.next < 0 && O.context && e.acceptToken(F);
    return;
  }
  e.advance();
  let t = e.next == $O;
  t && e.advance();
  let a = rO(e, 0);
  if (a === void 0) return;
  if (!a) return e.acceptToken(t ? it : at);
  let i = O.context ? O.context.name : null;
  if (t) {
    if (a == i) return e.acceptToken(Ot);
    if (i && ht[i]) return e.acceptToken(F, -2);
    if (O.dialectEnabled(ut)) return e.acceptToken(et);
    for (let s = O.context; s; s = s.parent) if (s.name == a) return;
    e.acceptToken(tt);
  } else {
    if (a == "script") return e.acceptToken(HO);
    if (a == "style") return e.acceptToken(Oe);
    if (a == "textarea") return e.acceptToken(ee);
    if ($t.hasOwnProperty(a)) return e.acceptToken(te);
    i && yO[i] && yO[i][a] ? e.acceptToken(F, -1) : e.acceptToken(pO);
  }
}, { contextual: !0 }), Zt = new Z((e) => {
  for (let O = 0, t = 0; ; t++) {
    if (e.next < 0) {
      t && e.acceptToken(kO);
      break;
    }
    if (e.next == gt)
      O++;
    else if (e.next == B && O >= 2) {
      t >= 3 && e.acceptToken(kO, -2);
      break;
    } else
      O = 0;
    e.advance();
  }
});
function bt(e) {
  for (; e; e = e.parent)
    if (e.name == "svg" || e.name == "math") return !0;
  return !1;
}
const xt = new Z((e, O) => {
  if (e.next == $O && e.peek(1) == B) {
    let t = O.dialectEnabled(pt) || bt(O.context);
    e.acceptToken(t ? He : wO, 2);
  } else e.next == B && e.acceptToken(wO, 1);
});
function hO(e, O, t) {
  let a = 2 + e.length;
  return new Z((i) => {
    for (let s = 0, r = 0, l = 0; ; l++) {
      if (i.next < 0) {
        l && i.acceptToken(O);
        break;
      }
      if (s == 0 && i.next == se || s == 1 && i.next == $O || s >= 2 && s < a && i.next == e.charCodeAt(s - 2))
        s++, r++;
      else if (s == a && i.next == B) {
        l > r ? i.acceptToken(O, -r) : i.acceptToken(t, -(r - 2));
        break;
      } else if ((i.next == 10 || i.next == 13) && l) {
        i.acceptToken(O, 1);
        break;
      } else
        s = r = 0;
      i.advance();
    }
  });
}
const wt = hO("script", De, Je), kt = hO("style", Me, Le), yt = hO("textarea", Fe, Ke), Yt = nO({
  "Text RawText IncompleteTag IncompleteCloseTag": o.content,
  "StartTag StartCloseTag SelfClosingEndTag EndTag": o.angleBracket,
  TagName: o.tagName,
  "MismatchedCloseTag/TagName": [o.tagName, o.invalid],
  AttributeName: o.attributeName,
  "AttributeValue UnquotedAttributeValue": o.attributeValue,
  Is: o.definitionOperator,
  "EntityReference CharacterReference": o.character,
  Comment: o.blockComment,
  ProcessingInst: o.processingInstruction,
  DoctypeDecl: o.documentMeta
}), Tt = y.deserialize({
  version: 14,
  states: ",xOVO!rOOO!ZQ#tO'#CrO!`Q#tO'#C{O!eQ#tO'#DOO!jQ#tO'#DRO!oQ#tO'#DTO!tOaO'#CqO#PObO'#CqO#[OdO'#CqO$kO!rO'#CqOOO`'#Cq'#CqO$rO$fO'#DUO$zQ#tO'#DWO%PQ#tO'#DXOOO`'#Dl'#DlOOO`'#DZ'#DZQVO!rOOO%UQ&rO,59^O%aQ&rO,59gO%lQ&rO,59jO%wQ&rO,59mO&SQ&rO,59oOOOa'#D_'#D_O&_OaO'#CyO&jOaO,59]OOOb'#D`'#D`O&rObO'#C|O&}ObO,59]OOOd'#Da'#DaO'VOdO'#DPO'bOdO,59]OOO`'#Db'#DbO'jO!rO,59]O'qQ#tO'#DSOOO`,59],59]OOOp'#Dc'#DcO'vO$fO,59pOOO`,59p,59pO(OQ#|O,59rO(TQ#|O,59sOOO`-E7X-E7XO(YQ&rO'#CtOOQW'#D['#D[O(hQ&rO1G.xOOOa1G.x1G.xOOO`1G/Z1G/ZO(sQ&rO1G/ROOOb1G/R1G/RO)OQ&rO1G/UOOOd1G/U1G/UO)ZQ&rO1G/XOOO`1G/X1G/XO)fQ&rO1G/ZOOOa-E7]-E7]O)qQ#tO'#CzOOO`1G.w1G.wOOOb-E7^-E7^O)vQ#tO'#C}OOOd-E7_-E7_O){Q#tO'#DQOOO`-E7`-E7`O*QQ#|O,59nOOOp-E7a-E7aOOO`1G/[1G/[OOO`1G/^1G/^OOO`1G/_1G/_O*VQ,UO,59`OOQW-E7Y-E7YOOOa7+$d7+$dOOO`7+$u7+$uOOOb7+$m7+$mOOOd7+$p7+$pOOO`7+$s7+$sO*bQ#|O,59fO*gQ#|O,59iO*lQ#|O,59lOOO`1G/Y1G/YO*qO7[O'#CwO+SOMhO'#CwOOQW1G.z1G.zOOO`1G/Q1G/QOOO`1G/T1G/TOOO`1G/W1G/WOOOO'#D]'#D]O+eO7[O,59cOOQW,59c,59cOOOO'#D^'#D^O+vOMhO,59cOOOO-E7Z-E7ZOOQW1G.}1G.}OOOO-E7[-E7[",
  stateData: ",c~O!_OS~OUSOVPOWQOXROYTO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O|_O!eZO~OgaO~OgbO~OgcO~OgdO~OgeO~O!XfOPmP![mP~O!YiOQpP![pP~O!ZlORsP![sP~OUSOVPOWQOXROYTOZqO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O!eZO~O![rO~P#gO!]sO!fuO~OgvO~OgwO~OS|OT}OiyO~OS!POT}OiyO~OS!ROT}OiyO~OS!TOT}OiyO~OS}OT}OiyO~O!XfOPmX![mX~OP!WO![!XO~O!YiOQpX![pX~OQ!ZO![!XO~O!ZlORsX![sX~OR!]O![!XO~O![!XO~P#gOg!_O~O!]sO!f!aO~OS!bO~OS!cO~Oj!dOShXThXihX~OS!fOT!gOiyO~OS!hOT!gOiyO~OS!iOT!gOiyO~OS!jOT!gOiyO~OS!gOT!gOiyO~Og!kO~Og!lO~Og!mO~OS!nO~Ol!qO!a!oO!c!pO~OS!rO~OS!sO~OS!tO~Ob!uOc!uOd!uO!a!wO!b!uO~Ob!xOc!xOd!xO!c!wO!d!xO~Ob!uOc!uOd!uO!a!{O!b!uO~Ob!xOc!xOd!xO!c!{O!d!xO~OT~cbd!ey|!e~",
  goto: "%q!aPPPPPPPPPPPPPPPPPPPPP!b!hP!nPP!zP!}#Q#T#Z#^#a#g#j#m#s#y!bP!b!bP$P$V$m$s$y%P%V%]%cPPPPPPPP%iX^OX`pXUOX`pezabcde{!O!Q!S!UR!q!dRhUR!XhXVOX`pRkVR!XkXWOX`pRnWR!XnXXOX`pQrXR!XpXYOX`pQ`ORx`Q{aQ!ObQ!QcQ!SdQ!UeZ!e{!O!Q!S!UQ!v!oR!z!vQ!y!pR!|!yQgUR!VgQjVR!YjQmWR![mQpXR!^pQtZR!`tS_O`ToXp",
  nodeNames: "⚠ StartCloseTag StartCloseTag StartCloseTag EndTag SelfClosingEndTag StartTag StartTag StartTag StartTag StartTag StartCloseTag StartCloseTag StartCloseTag IncompleteTag IncompleteCloseTag Document Text EntityReference CharacterReference InvalidEntity Element OpenTag TagName Attribute AttributeName Is AttributeValue UnquotedAttributeValue ScriptText CloseTag OpenTag StyleText CloseTag OpenTag TextareaText CloseTag OpenTag CloseTag SelfClosingTag Comment ProcessingInst MismatchedCloseTag CloseTag DoctypeDecl",
  maxTerm: 68,
  context: Pt,
  nodeProps: [
    ["closedBy", -10, 1, 2, 3, 7, 8, 9, 10, 11, 12, 13, "EndTag", 6, "EndTag SelfClosingEndTag", -4, 22, 31, 34, 37, "CloseTag"],
    ["openedBy", 4, "StartTag StartCloseTag", 5, "StartTag", -4, 30, 33, 36, 38, "OpenTag"],
    ["group", -10, 14, 15, 18, 19, 20, 21, 40, 41, 42, 43, "Entity", 17, "Entity TextContent", -3, 29, 32, 35, "TextContent Entity"],
    ["isolate", -11, 22, 30, 31, 33, 34, 36, 37, 38, 39, 42, 43, "ltr", -3, 27, 28, 40, ""]
  ],
  propSources: [Yt],
  skippedNodes: [0],
  repeatNodeCount: 9,
  tokenData: "!<p!aR!YOX$qXY,QYZ,QZ[$q[]&X]^,Q^p$qpq,Qqr-_rs3_sv-_vw3}wxHYx}-_}!OH{!O!P-_!P!Q$q!Q![-_![!]Mz!]!^-_!^!_!$S!_!`!;x!`!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4U-_4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!Z$|caPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr$qrs&}sv$qvw+Pwx(tx!^$q!^!_*V!_!a&X!a#S$q#S#T&X#T;'S$q;'S;=`+z<%lO$q!R&bXaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&Xq'UVaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}P'pTaPOv'kw!^'k!_;'S'k;'S;=`(P<%lO'kP(SP;=`<%l'kp([S!dpOv(Vx;'S(V;'S;=`(h<%lO(Vp(kP;=`<%l(Vq(qP;=`<%l&}a({WaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t`)jT!b`Or)esv)ew;'S)e;'S;=`)y<%lO)e`)|P;=`<%l)ea*SP;=`<%l(t!Q*^V!b`!dpOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!Q*vP;=`<%l*V!R*|P;=`<%l&XW+UYlWOX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+PW+wP;=`<%l+P!Z+}P;=`<%l$q!a,]`aP!b`!dp!_^OX&XXY,QYZ,QZ]&X]^,Q^p&Xpq,Qqr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!_-ljiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q[/ebiSlWOX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+PS0rXiSqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0mS1bP;=`<%l0m[1hP;=`<%l/^!V1vciSaP!b`!dpOq&Xqr1krs&}sv1kvw0mwx(tx!P1k!P!Q&X!Q!^1k!^!_*V!_!a&X!a#s1k#s$f&X$f;'S1k;'S;=`3R<%l?Ah1k?Ah?BY&X?BY?Mn1k?MnO&X!V3UP;=`<%l1k!_3[P;=`<%l-_!Z3hV!ahaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}!_4WiiSlWd!ROX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst>]tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^/^!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!Z5zblWOX5uXZ7SZ[5u[^7S^p5uqr5urs7Sst+Ptw5uwx7Sx!]5u!]!^7w!^!a7S!a#S5u#S#T7S#T;'S5u;'S;=`8n<%lO5u!R7VVOp7Sqs7St!]7S!]!^7l!^;'S7S;'S;=`7q<%lO7S!R7qOb!R!R7tP;=`<%l7S!Z8OYlWb!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!Z8qP;=`<%l5u!_8{iiSlWOX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst/^tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^:j!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!_:sbiSlWb!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!V<QciSOp7Sqr;{rs7Sst0mtw;{wx7Sx!P;{!P!Q7S!Q!];{!]!^=]!^!a7S!a#s;{#s$f7S$f;'S;{;'S;=`>P<%l?Ah;{?Ah?BY7S?BY?Mn;{?MnO7S!V=dXiSb!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!V>SP;=`<%l;{!_>YP;=`<%l8t!_>dhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^/^!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!Z@TalWOX@OXZAYZ[@O[^AY^p@Oqr@OrsAYsw@OwxAYx!]@O!]!^Az!^!aAY!a#S@O#S#TAY#T;'S@O;'S;=`Bq<%lO@O!RA]UOpAYq!]AY!]!^Ao!^;'SAY;'S;=`At<%lOAY!RAtOc!R!RAwP;=`<%lAY!ZBRYlWc!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!ZBtP;=`<%l@O!_COhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^Dj!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!_DsbiSlWc!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!VFQbiSOpAYqrE{rsAYswE{wxAYx!PE{!P!QAY!Q!]E{!]!^GY!^!aAY!a#sE{#s$fAY$f;'SE{;'S;=`G|<%l?AhE{?Ah?BYAY?BY?MnE{?MnOAY!VGaXiSc!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!VHPP;=`<%lE{!_HVP;=`<%lBw!ZHcW!cxaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t!aIYliSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OKQ!O!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!aK_kiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!`&X!`!aMS!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!TM_XaP!b`!dp!fQOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!aNZ!ZiSgQaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OMz!O!PMz!P!Q$q!Q![Mz![!]Mz!]!^-_!^!_*V!_!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f$}-_$}%OMz%O%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4UMz4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Je-_$Je$JgMz$Jg$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!a!$PP;=`<%lMz!R!$ZY!b`!dpOq*Vqr!$yrs(Vsv*Vwx)ex!a*V!a!b!4t!b;'S*V;'S;=`*s<%lO*V!R!%Q]!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!%y!O!f*V!f!g!']!g#W*V#W#X!0`#X;'S*V;'S;=`*s<%lO*V!R!&QX!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!&m!O;'S*V;'S;=`*s<%lO*V!R!&vV!b`!dp!ePOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!'dX!b`!dpOr*Vrs(Vsv*Vwx)ex!q*V!q!r!(P!r;'S*V;'S;=`*s<%lO*V!R!(WX!b`!dpOr*Vrs(Vsv*Vwx)ex!e*V!e!f!(s!f;'S*V;'S;=`*s<%lO*V!R!(zX!b`!dpOr*Vrs(Vsv*Vwx)ex!v*V!v!w!)g!w;'S*V;'S;=`*s<%lO*V!R!)nX!b`!dpOr*Vrs(Vsv*Vwx)ex!{*V!{!|!*Z!|;'S*V;'S;=`*s<%lO*V!R!*bX!b`!dpOr*Vrs(Vsv*Vwx)ex!r*V!r!s!*}!s;'S*V;'S;=`*s<%lO*V!R!+UX!b`!dpOr*Vrs(Vsv*Vwx)ex!g*V!g!h!+q!h;'S*V;'S;=`*s<%lO*V!R!+xY!b`!dpOr!+qrs!,hsv!+qvw!-Swx!.[x!`!+q!`!a!/j!a;'S!+q;'S;=`!0Y<%lO!+qq!,mV!dpOv!,hvx!-Sx!`!,h!`!a!-q!a;'S!,h;'S;=`!.U<%lO!,hP!-VTO!`!-S!`!a!-f!a;'S!-S;'S;=`!-k<%lO!-SP!-kO|PP!-nP;=`<%l!-Sq!-xS!dp|POv(Vx;'S(V;'S;=`(h<%lO(Vq!.XP;=`<%l!,ha!.aX!b`Or!.[rs!-Ssv!.[vw!-Sw!`!.[!`!a!.|!a;'S!.[;'S;=`!/d<%lO!.[a!/TT!b`|POr)esv)ew;'S)e;'S;=`)y<%lO)ea!/gP;=`<%l!.[!R!/sV!b`!dp|POr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!0]P;=`<%l!+q!R!0gX!b`!dpOr*Vrs(Vsv*Vwx)ex#c*V#c#d!1S#d;'S*V;'S;=`*s<%lO*V!R!1ZX!b`!dpOr*Vrs(Vsv*Vwx)ex#V*V#V#W!1v#W;'S*V;'S;=`*s<%lO*V!R!1}X!b`!dpOr*Vrs(Vsv*Vwx)ex#h*V#h#i!2j#i;'S*V;'S;=`*s<%lO*V!R!2qX!b`!dpOr*Vrs(Vsv*Vwx)ex#m*V#m#n!3^#n;'S*V;'S;=`*s<%lO*V!R!3eX!b`!dpOr*Vrs(Vsv*Vwx)ex#d*V#d#e!4Q#e;'S*V;'S;=`*s<%lO*V!R!4XX!b`!dpOr*Vrs(Vsv*Vwx)ex#X*V#X#Y!+q#Y;'S*V;'S;=`*s<%lO*V!R!4{Y!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!a!4t!a!b!:]!b;'S!4t;'S;=`!;r<%lO!4tq!5pV!dpOv!5kvx!6Vx!a!5k!a!b!7W!b;'S!5k;'S;=`!8V<%lO!5kP!6YTO!a!6V!a!b!6i!b;'S!6V;'S;=`!7Q<%lO!6VP!6lTO!`!6V!`!a!6{!a;'S!6V;'S;=`!7Q<%lO!6VP!7QOyPP!7TP;=`<%l!6Vq!7]V!dpOv!5kvx!6Vx!`!5k!`!a!7r!a;'S!5k;'S;=`!8V<%lO!5kq!7yS!dpyPOv(Vx;'S(V;'S;=`(h<%lO(Vq!8YP;=`<%l!5ka!8bX!b`Or!8]rs!6Vsv!8]vw!6Vw!a!8]!a!b!8}!b;'S!8];'S;=`!:V<%lO!8]a!9SX!b`Or!8]rs!6Vsv!8]vw!6Vw!`!8]!`!a!9o!a;'S!8];'S;=`!:V<%lO!8]a!9vT!b`yPOr)esv)ew;'S)e;'S;=`)y<%lO)ea!:YP;=`<%l!8]!R!:dY!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!`!4t!`!a!;S!a;'S!4t;'S;=`!;r<%lO!4t!R!;]V!b`!dpyPOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!;uP;=`<%l!4t!V!<TXjSaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X",
  tokenizers: [wt, kt, yt, xt, mt, Zt, 0, 1, 2, 3, 4, 5],
  topRules: { Document: [0, 16] },
  dialects: { noMatch: 0, selfClosing: 515 },
  tokenPrec: 517
});
function le(e, O) {
  let t = /* @__PURE__ */ Object.create(null);
  for (let a of e.getChildren(ie)) {
    let i = a.getChild(st), s = a.getChild(iO) || a.getChild(re);
    i && (t[O.read(i.from, i.to)] = s ? s.type.id == iO ? O.read(s.from + 1, s.to - 1) : O.read(s.from, s.to) : "");
  }
  return t;
}
function RO(e, O) {
  let t = e.getChild(rt);
  return t ? O.read(t.from, t.to) : " ";
}
function K(e, O, t) {
  let a;
  for (let i of t)
    if (!i.attrs || i.attrs(a || (a = le(e.node.parent.firstChild, O))))
      return { parser: i.parser };
  return null;
}
function ne(e = [], O = []) {
  let t = [], a = [], i = [], s = [];
  for (let l of e)
    (l.tag == "script" ? t : l.tag == "style" ? a : l.tag == "textarea" ? i : s).push(l);
  let r = O.length ? /* @__PURE__ */ Object.create(null) : null;
  for (let l of O) (r[l.name] || (r[l.name] = [])).push(l);
  return Ve((l, n) => {
    let Q = l.type.id;
    if (Q == lt) return K(l, n, t);
    if (Q == nt) return K(l, n, a);
    if (Q == ot) return K(l, n, i);
    if (Q == ae && s.length) {
      let $ = l.node, c = $.firstChild, h = c && RO(c, n), p;
      if (h) {
        for (let f of s)
          if (f.tag == h && (!f.attrs || f.attrs(p || (p = le(c, n))))) {
            let S = $.lastChild, d = S.type.id == ct ? S.from : $.to;
            if (d > c.to)
              return { parser: f.parser, overlay: [{ from: c.to, to: d }] };
          }
      }
    }
    if (r && Q == ie) {
      let $ = l.node, c;
      if (c = $.firstChild) {
        let h = r[n.read(c.from, c.to)];
        if (h) for (let p of h) {
          if (p.tagName && p.tagName != RO($.parent, n)) continue;
          let f = $.lastChild;
          if (f.type.id == iO) {
            let S = f.from + 1, d = f.lastChild, w = f.to - (d && d.isError ? 0 : 1);
            if (w > S) return { parser: p.parser, overlay: [{ from: S, to: w }] };
          } else if (f.type.id == re)
            return { parser: p.parser, overlay: [{ from: f.from, to: f.to }] };
        }
      }
    }
    return null;
  });
}
const Ut = 96, vO = 1, Vt = 97, Rt = 98, _O = 2, oe = [
  9,
  10,
  11,
  12,
  13,
  32,
  133,
  160,
  5760,
  8192,
  8193,
  8194,
  8195,
  8196,
  8197,
  8198,
  8199,
  8200,
  8201,
  8202,
  8232,
  8233,
  8239,
  8287,
  12288
], vt = 58, _t = 40, Qe = 95, Wt = 91, G = 45, qt = 46, jt = 35, Ct = 37;
function D(e) {
  return e >= 65 && e <= 90 || e >= 97 && e <= 122 || e >= 161;
}
function zt(e) {
  return e >= 48 && e <= 57;
}
const Gt = new Z((e, O) => {
  for (let t = !1, a = 0, i = 0; ; i++) {
    let { next: s } = e;
    if (D(s) || s == G || s == Qe || t && zt(s))
      !t && (s != G || i > 0) && (t = !0), a === i && s == G && a++, e.advance();
    else {
      t && e.acceptToken(s == _t ? Vt : a == 2 && O.canShift(_O) ? _O : Rt);
      break;
    }
  }
}), It = new Z((e) => {
  if (oe.includes(e.peek(-1))) {
    let { next: O } = e;
    (D(O) || O == Qe || O == jt || O == qt || O == Wt || O == vt || O == G) && e.acceptToken(Ut);
  }
}), At = new Z((e) => {
  if (!oe.includes(e.peek(-1))) {
    let { next: O } = e;
    if (O == Ct && (e.advance(), e.acceptToken(vO)), D(O)) {
      do
        e.advance();
      while (D(e.next));
      e.acceptToken(vO);
    }
  }
}), Et = nO({
  "AtKeyword import charset namespace keyframes media supports": o.definitionKeyword,
  "from to selector": o.keyword,
  NamespaceName: o.namespace,
  KeyframeName: o.labelName,
  KeyframeRangeName: o.operatorKeyword,
  TagName: o.tagName,
  ClassName: o.className,
  PseudoClassName: o.constant(o.className),
  IdName: o.labelName,
  "FeatureName PropertyName": o.propertyName,
  AttributeName: o.attributeName,
  NumberLiteral: o.number,
  KeywordQuery: o.keyword,
  UnaryQueryOp: o.operatorKeyword,
  "CallTag ValueName": o.atom,
  VariableName: o.variableName,
  Callee: o.operatorKeyword,
  Unit: o.unit,
  "UniversalSelector NestingSelector": o.definitionOperator,
  MatchOp: o.compareOperator,
  "ChildOp SiblingOp, LogicOp": o.logicOperator,
  BinOp: o.arithmeticOperator,
  Important: o.modifier,
  Comment: o.blockComment,
  ColorLiteral: o.color,
  "ParenthesizedContent StringLiteral": o.string,
  ":": o.punctuation,
  "PseudoOp #": o.derefOperator,
  "; ,": o.separator,
  "( )": o.paren,
  "[ ]": o.squareBracket,
  "{ }": o.brace
}), Nt = { __proto__: null, lang: 32, "nth-child": 32, "nth-last-child": 32, "nth-of-type": 32, "nth-last-of-type": 32, dir: 32, "host-context": 32, url: 60, "url-prefix": 60, domain: 60, regexp: 60, selector: 134 }, Bt = { __proto__: null, "@import": 114, "@media": 138, "@charset": 142, "@namespace": 146, "@keyframes": 152, "@supports": 164 }, Dt = { __proto__: null, not: 128, only: 128 }, Jt = y.deserialize({
  version: 14,
  states: "9bQYQ[OOO#_Q[OOP#fOWOOOOQP'#Cd'#CdOOQP'#Cc'#CcO#kQ[O'#CfO$_QXO'#CaO$fQ[O'#ChO$qQ[O'#DPO$vQ[O'#DTOOQP'#Ej'#EjO${QdO'#DeO%gQ[O'#DrO${QdO'#DtO%xQ[O'#DvO&TQ[O'#DyO&]Q[O'#EPO&kQ[O'#EROOQS'#Ei'#EiOOQS'#EU'#EUQYQ[OOO&rQXO'#CdO'gQWO'#DaO'lQWO'#EpO'wQ[O'#EpQOQWOOP(RO#tO'#C_POOO)C@X)C@XOOQP'#Cg'#CgOOQP,59Q,59QO#kQ[O,59QO(^Q[O'#EXO(xQWO,58{O)QQ[O,59SO$qQ[O,59kO$vQ[O,59oO(^Q[O,59sO(^Q[O,59uO(^Q[O,59vO)]Q[O'#D`OOQS,58{,58{OOQP'#Ck'#CkOOQO'#C}'#C}OOQP,59S,59SO)dQWO,59SO)iQWO,59SOOQP'#DR'#DROOQP,59k,59kOOQO'#DV'#DVO)nQ`O,59oOOQS'#Cp'#CpO${QdO'#CqO)vQvO'#CsO+TQtO,5:POOQO'#Cx'#CxO)iQWO'#CwO+iQWO'#CyOOQS'#Em'#EmOOQO'#Dh'#DhO+nQ[O'#DoO+|QWO'#EqO&]Q[O'#DmO,[QWO'#DpOOQO'#Er'#ErO({QWO,5:^O,aQpO,5:`OOQS'#Dx'#DxO,iQWO,5:bO,nQ[O,5:bOOQO'#D{'#D{O,vQWO,5:eO,{QWO,5:kO-TQWO,5:mOOQS-E8S-E8SO${QdO,59{O-]Q[O'#EZO-jQWO,5;[O-jQWO,5;[POOO'#ET'#ETP-uO#tO,58yPOOO,58y,58yOOQP1G.l1G.lO.lQXO,5:sOOQO-E8V-E8VOOQS1G.g1G.gOOQP1G.n1G.nO)dQWO1G.nO)iQWO1G.nOOQP1G/V1G/VO.yQ`O1G/ZO/dQXO1G/_O/zQXO1G/aO0bQXO1G/bO0xQWO,59zO0}Q[O'#DOO1UQdO'#CoOOQP1G/Z1G/ZO${QdO1G/ZO1]QpO,59]OOQS,59_,59_O${QdO,59aO1eQWO1G/kOOQS,59c,59cO1jQ!bO,59eO1rQWO'#DhO1}QWO,5:TO2SQWO,5:ZO&]Q[O,5:VO&]Q[O'#E[O2[QWO,5;]O2gQWO,5:XO(^Q[O,5:[OOQS1G/x1G/xOOQS1G/z1G/zOOQS1G/|1G/|O2xQWO1G/|O2}QdO'#D|OOQS1G0P1G0POOQS1G0V1G0VOOQS1G0X1G0XO3YQtO1G/gOOQO,5:u,5:uO3pQ[O,5:uOOQO-E8X-E8XO3}QWO1G0vPOOO-E8R-E8RPOOO1G.e1G.eOOQP7+$Y7+$YOOQP7+$u7+$uO${QdO7+$uOOQS1G/f1G/fO4YQXO'#EoO4aQWO,59jO4fQtO'#EVO5ZQdO'#ElO5eQWO,59ZO5jQpO7+$uOOQS1G.w1G.wOOQS1G.{1G.{OOQS7+%V7+%VO5rQWO1G/PO${QdO1G/oOOQO1G/u1G/uOOQO1G/q1G/qO5wQWO,5:vOOQO-E8Y-E8YO6VQXO1G/vOOQS7+%h7+%hO6^QYO'#CsOOQO'#EO'#EOO6iQ`O'#D}OOQO'#D}'#D}O6tQWO'#E]O6|QdO,5:hOOQS,5:h,5:hO7XQtO'#EYO${QdO'#EYO8VQdO7+%ROOQO7+%R7+%ROOQO1G0a1G0aO8jQpO<<HaO8rQWO,5;ZOOQP1G/U1G/UOOQS-E8T-E8TO${QdO'#EWO8zQWO,5;WOOQT1G.u1G.uOOQP<<Ha<<HaOOQS7+$k7+$kO9SQdO7+%ZOOQO7+%b7+%bOOQO,5:i,5:iO3QQdO'#E^O6tQWO,5:wOOQS,5:w,5:wOOQS-E8Z-E8ZOOQS1G0S1G0SO9ZQtO,5:tOOQS-E8W-E8WOOQO<<Hm<<HmOOQPAN={AN={O:XQdO,5:rOOQO-E8U-E8UOOQO<<Hu<<HuOOQO,5:x,5:xOOQO-E8[-E8[OOQS1G0c1G0c",
  stateData: ":k~O#WOS#XQQ~OUYOXYO]VO^VOtWOxXO!YaO!ZZO!g[O!i]O!k^O!n_O!t`O#URO#_TO~OQfOUYOXYO]VO^VOtWOxXO!YaO!ZZO!g[O!i]O!k^O!n_O!t`O#UeO#_TO~O#R#dP~P!ZO#XjO~O#UlO~O]qO^qOpoOtrOxsO|tO!PvO#SuO#_nO~O!RwO~P#pO`}O#TzO#UyO~O#U!OO~O#U!QO~OQ!ZOb!TOf!ZOh!ZOn!YO#T!WO#U!SO#b!UO~Ob!]O!b!_O!e!`O#U![O!R#eP~Oh!eOn!YO#U!dO~Oh!gO#U!gO~Ob!]O!b!_O!e!`O#U![O~O!W#eP~P%gO]WX]!UX^WXpWXtWXxWX|WX!PWX!RWX#SWX#_WX~O]!lO~O!W!mO#R#dX!Q#dX~O#R#dX!Q#dX~P!ZO#Y!pO#Z!pO#[!rO~OUYOXYO]VO^VOtWOxXO#URO#_TO~OpoO!RwO~O`!yO#TzO#UyO~O!Q#dP~P!ZOb#QO~Ob#RO~Ov#SOz#TO~OP#VObgXjgX!WgX!bgX!egX#UgXagXQgXfgXhgXngXpgX!VgX#RgX#TgX#bgXvgX!QgX~Ob!]Oj#WO!b!_O!e!`O#U![O!W#eP~Ob#ZO~Ob!]O!b!_O!e!`O#U#[O~Op#`O!`#_O!R#eX!W#eX~Ob#cO~Oj#WO!W#eO~O!W#fO~Oh#gOn!YO~O!R#hO~O!RwO!`#_O~O!RwO!W#kO~O!W!}X#R!}X!Q!}X~P!ZO!W!mO#R#da!Q#da~O#Y!pO#Z!pO#[#rO~O]qO^qOtrOxsO|tO!PvO#SuO#_nO~Op!{a!R!{aa!{a~P.QOv#tOz#uO~O]qO^qOtrOxsO#_nO~Op{i|{i!P{i!R{i#S{ia{i~P/ROp}i|}i!P}i!R}i#S}ia}i~P/ROp!Oi|!Oi!P!Oi!R!Oi#S!Oia!Oi~P/RO!Q#vO~Oa#cP~P(^Oa#`P~P${Oa#}Oj#WO~O!W$PO~Oh$QOo$QO~O]!^Xa![X!`![X~O]$RO~Oa$SO!`#_O~Op#`O!R#ea!W#ea~O!`#_Op!aa!R!aa!W!aaa!aa~O!W$XO~O!Q$`O#U$ZO#b$YO~Oj#WOp$bO!V$dO!W!Ti#R!Ti!Q!Ti~P${O!W!}a#R!}a!Q!}a~P!ZO!W!mO#R#di!Q#di~Oa#cX~P#pOa$hO~Oj#WOQ!yXa!yXb!yXf!yXh!yXn!yXp!yX#T!yX#U!yX#b!yX~Op$jOa#`X~P${Oa$lO~Oj#WOv$mO~Oa$nO~O!`#_Op#Oa!R#Oa!W#Oa~Oa$pO~P.QOP#VOpgX!RgX~O#b$YOp!qX!R!qX~Op$rO!RwO~O!Q$vO#U$ZO#b$YO~Oj#WOQ!|Xb!|Xf!|Xh!|Xn!|Xp!|X!V!|X!W!|X#R!|X#T!|X#U!|X#b!|X!Q!|X~Op$bO!V$yO!W!Tq#R!Tq!Q!Tq~P${Oj#WOv$zO~OpoOa#ca~Op$jOa#`a~Oa$}O~P${Oj#WOQ!|ab!|af!|ah!|an!|ap!|a!V!|a!W!|a#R!|a#T!|a#U!|a#b!|a!Q!|a~Oa!zap!za~P${O#Wo#X#bj!P#b~",
  goto: "-Y#gPPP#hP#kP#t$TP#t$d#tPP$jPPP$p$y$yP%]P$yP$y%w&ZPPP&s&y#tP'PP#tP'VP#tP#t#tPPP']'r(PPP#kPP(W(W(b(WP(WP(W(WP#kP#kP#kP(e#kP(h(k(n(u#kP#kP(z)Q)a)o)u*P*V*a*g*mPPPPPPPPPP*s*|P+i+lP,b,e,k,tRkQ_bOPdhw!m#nkYOPdhotuvw!m#Q#c#nkSOPdhotuvw!m#Q#c#nQmTR!snQ{VR!wqQ!w}Q#Y!XR#s!yq!ZZ]!T!l#R#T#W#l#u#z$R$b$c$j$o${p!ZZ]!T!l#R#T#W#l#u#z$R$b$c$j$o${U$]#h$_$rR$q$[q!XZ]!T!l#R#T#W#l#u#z$R$b$c$j$o${p!ZZ]!T!l#R#T#W#l#u#z$R$b$c$j$o${Q!e^R#g!fQ|VR!xqQ!w|R#s!xQ!PWR!zrQ!RXR!{sQxUQ!vpQ#d!bQ#j!iQ#k!jQ$t$^R%Q$sSgPwQ!ohQ#m!mR$e#nZfPhw!m#na!a[`a!V!]!_#_#`R#]!]R!f^R!h_R#i!hS$^#h$_R%O$rV$[#h$_$rQ!qjR#q!qQdOShPwU!kdh#nR#n!mQ#z#RU$i#z$o${Q$o$RR${$jQ$k#zR$|$kQpUS!up$gR$g#wQ$c#lR$x$cQ!ngS#o!n#pR#p!oQ#a!^R$V#aQ$_#hR$u$_Q$s$^R%P$s_cOPdhw!m#n^UOPdhw!m#nQ!toQ!|tQ!}uQ#OvQ#w#QR$W#cR#{#RQ!VZQ!c]Q#U!TQ#l!l[#y#R#z$R$j$o${Q#|#TQ$O#WS$a#l$cQ$f#uR$w$bR#x#QQiPR#PwQ!b[Q!jaR#X!VU!^[a!VQ!i`Q#^!]Q#b!_Q$T#_R$U#`",
  nodeNames: "⚠ Unit VariableName Comment StyleSheet RuleSet UniversalSelector TagSelector TagName NestingSelector ClassSelector ClassName PseudoClassSelector : :: PseudoClassName PseudoClassName ) ( ArgList ValueName ParenthesizedValue ColorLiteral NumberLiteral StringLiteral BinaryExpression BinOp CallExpression Callee CallLiteral CallTag ParenthesizedContent , PseudoClassName ArgList IdSelector # IdName ] AttributeSelector [ AttributeName MatchOp ChildSelector ChildOp DescendantSelector SiblingSelector SiblingOp } { Block Declaration PropertyName Important ; ImportStatement AtKeyword import KeywordQuery FeatureQuery FeatureName BinaryQuery LogicOp UnaryQuery UnaryQueryOp ParenthesizedQuery SelectorQuery selector MediaStatement media CharsetStatement charset NamespaceStatement namespace NamespaceName KeyframesStatement keyframes KeyframeName KeyframeList KeyframeSelector KeyframeRangeName SupportsStatement supports AtRule Styles",
  maxTerm: 114,
  nodeProps: [
    ["openedBy", 17, "(", 48, "{"],
    ["closedBy", 18, ")", 49, "}"]
  ],
  propSources: [Et],
  skippedNodes: [0, 3, 85],
  repeatNodeCount: 10,
  tokenData: "J^~R!^OX$}X^%u^p$}pq%uqr)Xrs.Rst/utu6duv$}vw7^wx7oxy9^yz9oz{9t{|:_|}?Q}!O?c!O!P@Q!P!Q@i!Q![Ab![!]B]!]!^CX!^!_$}!_!`Cj!`!aC{!a!b$}!b!cDw!c!}$}!}#OFa#O#P$}#P#QFr#Q#R6d#R#T$}#T#UGT#U#c$}#c#dHf#d#o$}#o#pH{#p#q6d#q#rI^#r#sIo#s#y$}#y#z%u#z$f$}$f$g%u$g#BY$}#BY#BZ%u#BZ$IS$}$IS$I_%u$I_$I|$}$I|$JO%u$JO$JT$}$JT$JU%u$JU$KV$}$KV$KW%u$KW&FU$}&FU&FV%u&FV;'S$};'S;=`JW<%lO$}`%QSOy%^z;'S%^;'S;=`%o<%lO%^`%cSo`Oy%^z;'S%^;'S;=`%o<%lO%^`%rP;=`<%l%^~%zh#W~OX%^X^'f^p%^pq'fqy%^z#y%^#y#z'f#z$f%^$f$g'f$g#BY%^#BY#BZ'f#BZ$IS%^$IS$I_'f$I_$I|%^$I|$JO'f$JO$JT%^$JT$JU'f$JU$KV%^$KV$KW'f$KW&FU%^&FU&FV'f&FV;'S%^;'S;=`%o<%lO%^~'mh#W~o`OX%^X^'f^p%^pq'fqy%^z#y%^#y#z'f#z$f%^$f$g'f$g#BY%^#BY#BZ'f#BZ$IS%^$IS$I_'f$I_$I|%^$I|$JO'f$JO$JT%^$JT$JU'f$JU$KV%^$KV$KW'f$KW&FU%^&FU&FV'f&FV;'S%^;'S;=`%o<%lO%^l)[UOy%^z#]%^#]#^)n#^;'S%^;'S;=`%o<%lO%^l)sUo`Oy%^z#a%^#a#b*V#b;'S%^;'S;=`%o<%lO%^l*[Uo`Oy%^z#d%^#d#e*n#e;'S%^;'S;=`%o<%lO%^l*sUo`Oy%^z#c%^#c#d+V#d;'S%^;'S;=`%o<%lO%^l+[Uo`Oy%^z#f%^#f#g+n#g;'S%^;'S;=`%o<%lO%^l+sUo`Oy%^z#h%^#h#i,V#i;'S%^;'S;=`%o<%lO%^l,[Uo`Oy%^z#T%^#T#U,n#U;'S%^;'S;=`%o<%lO%^l,sUo`Oy%^z#b%^#b#c-V#c;'S%^;'S;=`%o<%lO%^l-[Uo`Oy%^z#h%^#h#i-n#i;'S%^;'S;=`%o<%lO%^l-uS!V[o`Oy%^z;'S%^;'S;=`%o<%lO%^~.UWOY.RZr.Rrs.ns#O.R#O#P.s#P;'S.R;'S;=`/o<%lO.R~.sOh~~.vRO;'S.R;'S;=`/P;=`O.R~/SXOY.RZr.Rrs.ns#O.R#O#P.s#P;'S.R;'S;=`/o;=`<%l.R<%lO.R~/rP;=`<%l.Rn/zYtQOy%^z!Q%^!Q![0j![!c%^!c!i0j!i#T%^#T#Z0j#Z;'S%^;'S;=`%o<%lO%^l0oYo`Oy%^z!Q%^!Q![1_![!c%^!c!i1_!i#T%^#T#Z1_#Z;'S%^;'S;=`%o<%lO%^l1dYo`Oy%^z!Q%^!Q![2S![!c%^!c!i2S!i#T%^#T#Z2S#Z;'S%^;'S;=`%o<%lO%^l2ZYf[o`Oy%^z!Q%^!Q![2y![!c%^!c!i2y!i#T%^#T#Z2y#Z;'S%^;'S;=`%o<%lO%^l3QYf[o`Oy%^z!Q%^!Q![3p![!c%^!c!i3p!i#T%^#T#Z3p#Z;'S%^;'S;=`%o<%lO%^l3uYo`Oy%^z!Q%^!Q![4e![!c%^!c!i4e!i#T%^#T#Z4e#Z;'S%^;'S;=`%o<%lO%^l4lYf[o`Oy%^z!Q%^!Q![5[![!c%^!c!i5[!i#T%^#T#Z5[#Z;'S%^;'S;=`%o<%lO%^l5aYo`Oy%^z!Q%^!Q![6P![!c%^!c!i6P!i#T%^#T#Z6P#Z;'S%^;'S;=`%o<%lO%^l6WSf[o`Oy%^z;'S%^;'S;=`%o<%lO%^d6gUOy%^z!_%^!_!`6y!`;'S%^;'S;=`%o<%lO%^d7QSzSo`Oy%^z;'S%^;'S;=`%o<%lO%^b7cSXQOy%^z;'S%^;'S;=`%o<%lO%^~7rWOY7oZw7owx.nx#O7o#O#P8[#P;'S7o;'S;=`9W<%lO7o~8_RO;'S7o;'S;=`8h;=`O7o~8kXOY7oZw7owx.nx#O7o#O#P8[#P;'S7o;'S;=`9W;=`<%l7o<%lO7o~9ZP;=`<%l7on9cSb^Oy%^z;'S%^;'S;=`%o<%lO%^~9tOa~n9{UUQjWOy%^z!_%^!_!`6y!`;'S%^;'S;=`%o<%lO%^n:fWjW!PQOy%^z!O%^!O!P;O!P!Q%^!Q![>T![;'S%^;'S;=`%o<%lO%^l;TUo`Oy%^z!Q%^!Q![;g![;'S%^;'S;=`%o<%lO%^l;nYo`#b[Oy%^z!Q%^!Q![;g![!g%^!g!h<^!h#X%^#X#Y<^#Y;'S%^;'S;=`%o<%lO%^l<cYo`Oy%^z{%^{|=R|}%^}!O=R!O!Q%^!Q![=j![;'S%^;'S;=`%o<%lO%^l=WUo`Oy%^z!Q%^!Q![=j![;'S%^;'S;=`%o<%lO%^l=qUo`#b[Oy%^z!Q%^!Q![=j![;'S%^;'S;=`%o<%lO%^l>[[o`#b[Oy%^z!O%^!O!P;g!P!Q%^!Q![>T![!g%^!g!h<^!h#X%^#X#Y<^#Y;'S%^;'S;=`%o<%lO%^n?VSp^Oy%^z;'S%^;'S;=`%o<%lO%^l?hWjWOy%^z!O%^!O!P;O!P!Q%^!Q![>T![;'S%^;'S;=`%o<%lO%^n@VU#_QOy%^z!Q%^!Q![;g![;'S%^;'S;=`%o<%lO%^~@nTjWOy%^z{@}{;'S%^;'S;=`%o<%lO%^~AUSo`#X~Oy%^z;'S%^;'S;=`%o<%lO%^lAg[#b[Oy%^z!O%^!O!P;g!P!Q%^!Q![>T![!g%^!g!h<^!h#X%^#X#Y<^#Y;'S%^;'S;=`%o<%lO%^bBbU]QOy%^z![%^![!]Bt!];'S%^;'S;=`%o<%lO%^bB{S^Qo`Oy%^z;'S%^;'S;=`%o<%lO%^nC^S!W^Oy%^z;'S%^;'S;=`%o<%lO%^dCoSzSOy%^z;'S%^;'S;=`%o<%lO%^bDQU|QOy%^z!`%^!`!aDd!a;'S%^;'S;=`%o<%lO%^bDkS|Qo`Oy%^z;'S%^;'S;=`%o<%lO%^bDzWOy%^z!c%^!c!}Ed!}#T%^#T#oEd#o;'S%^;'S;=`%o<%lO%^bEk[!YQo`Oy%^z}%^}!OEd!O!Q%^!Q![Ed![!c%^!c!}Ed!}#T%^#T#oEd#o;'S%^;'S;=`%o<%lO%^bFfSxQOy%^z;'S%^;'S;=`%o<%lO%^lFwSv[Oy%^z;'S%^;'S;=`%o<%lO%^bGWUOy%^z#b%^#b#cGj#c;'S%^;'S;=`%o<%lO%^bGoUo`Oy%^z#W%^#W#XHR#X;'S%^;'S;=`%o<%lO%^bHYS!`Qo`Oy%^z;'S%^;'S;=`%o<%lO%^bHiUOy%^z#f%^#f#gHR#g;'S%^;'S;=`%o<%lO%^fIQS!RUOy%^z;'S%^;'S;=`%o<%lO%^nIcS!Q^Oy%^z;'S%^;'S;=`%o<%lO%^fItU!PQOy%^z!_%^!_!`6y!`;'S%^;'S;=`%o<%lO%^`JZP;=`<%l$}",
  tokenizers: [It, At, Gt, 1, 2, 3, 4, new N("m~RRYZ[z{a~~g~aO#Z~~dP!P!Qg~lO#[~~", 28, 102)],
  topRules: { StyleSheet: [0, 4], Styles: [1, 84] },
  specialized: [{ term: 97, get: (e) => Nt[e] || -1 }, { term: 56, get: (e) => Bt[e] || -1 }, { term: 98, get: (e) => Dt[e] || -1 }],
  tokenPrec: 1169
});
let H = null;
function OO() {
  if (!H && typeof document == "object" && document.body) {
    let { style: e } = document.body, O = [], t = /* @__PURE__ */ new Set();
    for (let a in e)
      a != "cssText" && a != "cssFloat" && typeof e[a] == "string" && (/[A-Z]/.test(a) && (a = a.replace(/[A-Z]/g, (i) => "-" + i.toLowerCase())), t.has(a) || (O.push(a), t.add(a)));
    H = O.sort().map((a) => ({ type: "property", label: a }));
  }
  return H || [];
}
const WO = /* @__PURE__ */ [
  "active",
  "after",
  "any-link",
  "autofill",
  "backdrop",
  "before",
  "checked",
  "cue",
  "default",
  "defined",
  "disabled",
  "empty",
  "enabled",
  "file-selector-button",
  "first",
  "first-child",
  "first-letter",
  "first-line",
  "first-of-type",
  "focus",
  "focus-visible",
  "focus-within",
  "fullscreen",
  "has",
  "host",
  "host-context",
  "hover",
  "in-range",
  "indeterminate",
  "invalid",
  "is",
  "lang",
  "last-child",
  "last-of-type",
  "left",
  "link",
  "marker",
  "modal",
  "not",
  "nth-child",
  "nth-last-child",
  "nth-last-of-type",
  "nth-of-type",
  "only-child",
  "only-of-type",
  "optional",
  "out-of-range",
  "part",
  "placeholder",
  "placeholder-shown",
  "read-only",
  "read-write",
  "required",
  "right",
  "root",
  "scope",
  "selection",
  "slotted",
  "target",
  "target-text",
  "valid",
  "visited",
  "where"
].map((e) => ({ type: "class", label: e })), qO = /* @__PURE__ */ [
  "above",
  "absolute",
  "activeborder",
  "additive",
  "activecaption",
  "after-white-space",
  "ahead",
  "alias",
  "all",
  "all-scroll",
  "alphabetic",
  "alternate",
  "always",
  "antialiased",
  "appworkspace",
  "asterisks",
  "attr",
  "auto",
  "auto-flow",
  "avoid",
  "avoid-column",
  "avoid-page",
  "avoid-region",
  "axis-pan",
  "background",
  "backwards",
  "baseline",
  "below",
  "bidi-override",
  "blink",
  "block",
  "block-axis",
  "bold",
  "bolder",
  "border",
  "border-box",
  "both",
  "bottom",
  "break",
  "break-all",
  "break-word",
  "bullets",
  "button",
  "button-bevel",
  "buttonface",
  "buttonhighlight",
  "buttonshadow",
  "buttontext",
  "calc",
  "capitalize",
  "caps-lock-indicator",
  "caption",
  "captiontext",
  "caret",
  "cell",
  "center",
  "checkbox",
  "circle",
  "cjk-decimal",
  "clear",
  "clip",
  "close-quote",
  "col-resize",
  "collapse",
  "color",
  "color-burn",
  "color-dodge",
  "column",
  "column-reverse",
  "compact",
  "condensed",
  "contain",
  "content",
  "contents",
  "content-box",
  "context-menu",
  "continuous",
  "copy",
  "counter",
  "counters",
  "cover",
  "crop",
  "cross",
  "crosshair",
  "currentcolor",
  "cursive",
  "cyclic",
  "darken",
  "dashed",
  "decimal",
  "decimal-leading-zero",
  "default",
  "default-button",
  "dense",
  "destination-atop",
  "destination-in",
  "destination-out",
  "destination-over",
  "difference",
  "disc",
  "discard",
  "disclosure-closed",
  "disclosure-open",
  "document",
  "dot-dash",
  "dot-dot-dash",
  "dotted",
  "double",
  "down",
  "e-resize",
  "ease",
  "ease-in",
  "ease-in-out",
  "ease-out",
  "element",
  "ellipse",
  "ellipsis",
  "embed",
  "end",
  "ethiopic-abegede-gez",
  "ethiopic-halehame-aa-er",
  "ethiopic-halehame-gez",
  "ew-resize",
  "exclusion",
  "expanded",
  "extends",
  "extra-condensed",
  "extra-expanded",
  "fantasy",
  "fast",
  "fill",
  "fill-box",
  "fixed",
  "flat",
  "flex",
  "flex-end",
  "flex-start",
  "footnotes",
  "forwards",
  "from",
  "geometricPrecision",
  "graytext",
  "grid",
  "groove",
  "hand",
  "hard-light",
  "help",
  "hidden",
  "hide",
  "higher",
  "highlight",
  "highlighttext",
  "horizontal",
  "hsl",
  "hsla",
  "hue",
  "icon",
  "ignore",
  "inactiveborder",
  "inactivecaption",
  "inactivecaptiontext",
  "infinite",
  "infobackground",
  "infotext",
  "inherit",
  "initial",
  "inline",
  "inline-axis",
  "inline-block",
  "inline-flex",
  "inline-grid",
  "inline-table",
  "inset",
  "inside",
  "intrinsic",
  "invert",
  "italic",
  "justify",
  "keep-all",
  "landscape",
  "large",
  "larger",
  "left",
  "level",
  "lighter",
  "lighten",
  "line-through",
  "linear",
  "linear-gradient",
  "lines",
  "list-item",
  "listbox",
  "listitem",
  "local",
  "logical",
  "loud",
  "lower",
  "lower-hexadecimal",
  "lower-latin",
  "lower-norwegian",
  "lowercase",
  "ltr",
  "luminosity",
  "manipulation",
  "match",
  "matrix",
  "matrix3d",
  "medium",
  "menu",
  "menutext",
  "message-box",
  "middle",
  "min-intrinsic",
  "mix",
  "monospace",
  "move",
  "multiple",
  "multiple_mask_images",
  "multiply",
  "n-resize",
  "narrower",
  "ne-resize",
  "nesw-resize",
  "no-close-quote",
  "no-drop",
  "no-open-quote",
  "no-repeat",
  "none",
  "normal",
  "not-allowed",
  "nowrap",
  "ns-resize",
  "numbers",
  "numeric",
  "nw-resize",
  "nwse-resize",
  "oblique",
  "opacity",
  "open-quote",
  "optimizeLegibility",
  "optimizeSpeed",
  "outset",
  "outside",
  "outside-shape",
  "overlay",
  "overline",
  "padding",
  "padding-box",
  "painted",
  "page",
  "paused",
  "perspective",
  "pinch-zoom",
  "plus-darker",
  "plus-lighter",
  "pointer",
  "polygon",
  "portrait",
  "pre",
  "pre-line",
  "pre-wrap",
  "preserve-3d",
  "progress",
  "push-button",
  "radial-gradient",
  "radio",
  "read-only",
  "read-write",
  "read-write-plaintext-only",
  "rectangle",
  "region",
  "relative",
  "repeat",
  "repeating-linear-gradient",
  "repeating-radial-gradient",
  "repeat-x",
  "repeat-y",
  "reset",
  "reverse",
  "rgb",
  "rgba",
  "ridge",
  "right",
  "rotate",
  "rotate3d",
  "rotateX",
  "rotateY",
  "rotateZ",
  "round",
  "row",
  "row-resize",
  "row-reverse",
  "rtl",
  "run-in",
  "running",
  "s-resize",
  "sans-serif",
  "saturation",
  "scale",
  "scale3d",
  "scaleX",
  "scaleY",
  "scaleZ",
  "screen",
  "scroll",
  "scrollbar",
  "scroll-position",
  "se-resize",
  "self-start",
  "self-end",
  "semi-condensed",
  "semi-expanded",
  "separate",
  "serif",
  "show",
  "single",
  "skew",
  "skewX",
  "skewY",
  "skip-white-space",
  "slide",
  "slider-horizontal",
  "slider-vertical",
  "sliderthumb-horizontal",
  "sliderthumb-vertical",
  "slow",
  "small",
  "small-caps",
  "small-caption",
  "smaller",
  "soft-light",
  "solid",
  "source-atop",
  "source-in",
  "source-out",
  "source-over",
  "space",
  "space-around",
  "space-between",
  "space-evenly",
  "spell-out",
  "square",
  "start",
  "static",
  "status-bar",
  "stretch",
  "stroke",
  "stroke-box",
  "sub",
  "subpixel-antialiased",
  "svg_masks",
  "super",
  "sw-resize",
  "symbolic",
  "symbols",
  "system-ui",
  "table",
  "table-caption",
  "table-cell",
  "table-column",
  "table-column-group",
  "table-footer-group",
  "table-header-group",
  "table-row",
  "table-row-group",
  "text",
  "text-bottom",
  "text-top",
  "textarea",
  "textfield",
  "thick",
  "thin",
  "threeddarkshadow",
  "threedface",
  "threedhighlight",
  "threedlightshadow",
  "threedshadow",
  "to",
  "top",
  "transform",
  "translate",
  "translate3d",
  "translateX",
  "translateY",
  "translateZ",
  "transparent",
  "ultra-condensed",
  "ultra-expanded",
  "underline",
  "unidirectional-pan",
  "unset",
  "up",
  "upper-latin",
  "uppercase",
  "url",
  "var",
  "vertical",
  "vertical-text",
  "view-box",
  "visible",
  "visibleFill",
  "visiblePainted",
  "visibleStroke",
  "visual",
  "w-resize",
  "wait",
  "wave",
  "wider",
  "window",
  "windowframe",
  "windowtext",
  "words",
  "wrap",
  "wrap-reverse",
  "x-large",
  "x-small",
  "xor",
  "xx-large",
  "xx-small"
].map((e) => ({ type: "keyword", label: e })).concat(/* @__PURE__ */ [
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "grey",
  "green",
  "greenyellow",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen"
].map((e) => ({ type: "constant", label: e }))), Mt = /* @__PURE__ */ [
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "b",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "form",
  "header",
  "hgroup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "meter",
  "nav",
  "ol",
  "output",
  "p",
  "pre",
  "ruby",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul"
].map((e) => ({ type: "type", label: e })), x = /^(\w[\w-]*|-\w[\w-]*|)$/, Lt = /^-(-[\w-]*)?$/;
function Ft(e, O) {
  var t;
  if ((e.name == "(" || e.type.isError) && (e = e.parent || e), e.name != "ArgList")
    return !1;
  let a = (t = e.parent) === null || t === void 0 ? void 0 : t.firstChild;
  return (a == null ? void 0 : a.name) != "Callee" ? !1 : O.sliceString(a.from, a.to) == "var";
}
const jO = /* @__PURE__ */ new JO(), Kt = ["Declaration"];
function Ht(e) {
  for (let O = e; ; ) {
    if (O.type.isTop)
      return O;
    if (!(O = O.parent))
      return e;
  }
}
function ce(e, O, t) {
  if (O.to - O.from > 4096) {
    let a = jO.get(O);
    if (a)
      return a;
    let i = [], s = /* @__PURE__ */ new Set(), r = O.cursor(lO.IncludeAnonymous);
    if (r.firstChild())
      do
        for (let l of ce(e, r.node, t))
          s.has(l.label) || (s.add(l.label), i.push(l));
      while (r.nextSibling());
    return jO.set(O, i), i;
  } else {
    let a = [], i = /* @__PURE__ */ new Set();
    return O.cursor().iterate((s) => {
      var r;
      if (t(s) && s.matchContext(Kt) && ((r = s.node.nextSibling) === null || r === void 0 ? void 0 : r.name) == ":") {
        let l = e.sliceString(s.from, s.to);
        i.has(l) || (i.add(l), a.push({ label: l, type: "variable" }));
      }
    }), a;
  }
}
const Oa = (e) => (O) => {
  let { state: t, pos: a } = O, i = _(t).resolveInner(a, -1), s = i.type.isError && i.from == i.to - 1 && t.doc.sliceString(i.from, i.to) == "-";
  if (i.name == "PropertyName" || (s || i.name == "TagName") && /^(Block|Styles)$/.test(i.resolve(i.to).name))
    return { from: i.from, options: OO(), validFor: x };
  if (i.name == "ValueName")
    return { from: i.from, options: qO, validFor: x };
  if (i.name == "PseudoClassName")
    return { from: i.from, options: WO, validFor: x };
  if (e(i) || (O.explicit || s) && Ft(i, t.doc))
    return {
      from: e(i) || s ? i.from : a,
      options: ce(t.doc, Ht(i), e),
      validFor: Lt
    };
  if (i.name == "TagName") {
    for (let { parent: n } = i; n; n = n.parent)
      if (n.name == "Block")
        return { from: i.from, options: OO(), validFor: x };
    return { from: i.from, options: Mt, validFor: x };
  }
  if (!O.explicit)
    return null;
  let r = i.resolve(a), l = r.childBefore(a);
  return l && l.name == ":" && r.name == "PseudoClassSelector" ? { from: a, options: WO, validFor: x } : l && l.name == ":" && r.name == "Declaration" || r.name == "ArgList" ? { from: a, options: qO, validFor: x } : r.name == "Block" || r.name == "Styles" ? { from: a, options: OO(), validFor: x } : null;
}, ea = /* @__PURE__ */ Oa((e) => e.name == "VariableName"), J = /* @__PURE__ */ oO.define({
  name: "css",
  parser: /* @__PURE__ */ Jt.configure({
    props: [
      /* @__PURE__ */ QO.add({
        Declaration: /* @__PURE__ */ j()
      }),
      /* @__PURE__ */ cO.add({
        "Block KeyframeList": DO
      })
    ]
  }),
  languageData: {
    commentTokens: { block: { open: "/*", close: "*/" } },
    indentOnInput: /^\s*\}$/,
    wordChars: "-"
  }
});
function ta() {
  return new uO(J, J.data.of({ autocomplete: ea }));
}
const aa = 303, CO = 1, ia = 2, ra = 304, sa = 306, la = 307, na = 3, oa = 4, Qa = [
  9,
  10,
  11,
  12,
  13,
  32,
  133,
  160,
  5760,
  8192,
  8193,
  8194,
  8195,
  8196,
  8197,
  8198,
  8199,
  8200,
  8201,
  8202,
  8232,
  8233,
  8239,
  8287,
  12288
], ue = 125, ca = 59, zO = 47, ua = 42, pa = 43, $a = 45, ha = new KO({
  start: !1,
  shift(e, O) {
    return O == na || O == oa || O == sa ? e : O == la;
  },
  strict: !1
}), fa = new Z((e, O) => {
  let { next: t } = e;
  (t == ue || t == -1 || O.context) && e.acceptToken(ra);
}, { contextual: !0, fallback: !0 }), Sa = new Z((e, O) => {
  let { next: t } = e, a;
  Qa.indexOf(t) > -1 || t == zO && ((a = e.peek(1)) == zO || a == ua) || t != ue && t != ca && t != -1 && !O.context && e.acceptToken(aa);
}, { contextual: !0 }), da = new Z((e, O) => {
  let { next: t } = e;
  if ((t == pa || t == $a) && (e.advance(), t == e.next)) {
    e.advance();
    let a = !O.context && O.canShift(CO);
    e.acceptToken(a ? CO : ia);
  }
}, { contextual: !0 }), ga = nO({
  "get set async static": o.modifier,
  "for while do if else switch try catch finally return throw break continue default case": o.controlKeyword,
  "in of await yield void typeof delete instanceof": o.operatorKeyword,
  "let var const function class extends": o.definitionKeyword,
  "import export from": o.moduleKeyword,
  "with debugger as new": o.keyword,
  TemplateString: o.special(o.string),
  super: o.atom,
  BooleanLiteral: o.bool,
  this: o.self,
  null: o.null,
  Star: o.modifier,
  VariableName: o.variableName,
  "CallExpression/VariableName TaggedTemplateExpression/VariableName": o.function(o.variableName),
  VariableDefinition: o.definition(o.variableName),
  Label: o.labelName,
  PropertyName: o.propertyName,
  PrivatePropertyName: o.special(o.propertyName),
  "CallExpression/MemberExpression/PropertyName": o.function(o.propertyName),
  "FunctionDeclaration/VariableDefinition": o.function(o.definition(o.variableName)),
  "ClassDeclaration/VariableDefinition": o.definition(o.className),
  PropertyDefinition: o.definition(o.propertyName),
  PrivatePropertyDefinition: o.definition(o.special(o.propertyName)),
  UpdateOp: o.updateOperator,
  LineComment: o.lineComment,
  BlockComment: o.blockComment,
  Number: o.number,
  String: o.string,
  Escape: o.escape,
  ArithOp: o.arithmeticOperator,
  LogicOp: o.logicOperator,
  BitOp: o.bitwiseOperator,
  CompareOp: o.compareOperator,
  RegExp: o.regexp,
  Equals: o.definitionOperator,
  Arrow: o.function(o.punctuation),
  ": Spread": o.punctuation,
  "( )": o.paren,
  "[ ]": o.squareBracket,
  "{ }": o.brace,
  "InterpolationStart InterpolationEnd": o.special(o.brace),
  ".": o.derefOperator,
  ", ;": o.separator,
  "@": o.meta,
  TypeName: o.typeName,
  TypeDefinition: o.definition(o.typeName),
  "type enum interface implements namespace module declare": o.definitionKeyword,
  "abstract global Privacy readonly override": o.modifier,
  "is keyof unique infer": o.operatorKeyword,
  JSXAttributeValue: o.attributeValue,
  JSXText: o.content,
  "JSXStartTag JSXStartCloseTag JSXSelfCloseEndTag JSXEndTag": o.angleBracket,
  "JSXIdentifier JSXNameSpacedName": o.tagName,
  "JSXAttribute/JSXIdentifier JSXAttribute/JSXNameSpacedName": o.attributeName,
  "JSXBuiltin/JSXIdentifier": o.standard(o.tagName)
}), Xa = { __proto__: null, export: 14, as: 19, from: 27, default: 30, async: 35, function: 36, extends: 46, this: 50, true: 58, false: 58, null: 70, void: 74, typeof: 78, super: 96, new: 130, delete: 146, yield: 155, await: 159, class: 164, public: 221, private: 221, protected: 221, readonly: 223, instanceof: 242, satisfies: 245, in: 246, const: 248, import: 280, keyof: 335, unique: 339, infer: 345, is: 381, abstract: 401, implements: 403, type: 405, let: 408, var: 410, using: 413, interface: 419, enum: 423, namespace: 429, module: 431, declare: 435, global: 439, for: 458, of: 467, while: 470, with: 474, do: 478, if: 482, else: 484, switch: 488, case: 494, try: 500, catch: 504, finally: 508, return: 512, throw: 516, break: 520, continue: 524, debugger: 528 }, Pa = { __proto__: null, async: 117, get: 119, set: 121, declare: 181, public: 183, private: 183, protected: 183, static: 185, abstract: 187, override: 189, readonly: 195, accessor: 197, new: 385 }, ma = { __proto__: null, "<": 137 }, Za = y.deserialize({
  version: 14,
  states: "$6tO`QUOOO%TQUOOO'WQWOOP(eOSOOO*sQ(CjO'#CfO*zOpO'#CgO+YO!bO'#CgO+hO07`O'#DZO-yQUO'#DaO.ZQUO'#DlO%TQUO'#DvO0_QUO'#EOOOQ(CY'#EW'#EWO0xQSO'#ETOOQO'#Ei'#EiOOQO'#Ic'#IcO1QQSO'#GkO1]QSO'#EhO1bQSO'#EhO3dQ(CjO'#JdO6TQ(CjO'#JeO6qQSO'#FWO6vQ#tO'#FoOOQ(CY'#F`'#F`O7RO&jO'#F`O7aQ,UO'#FvO8wQSO'#FuOOQ(CY'#Je'#JeOOQ(CW'#Jd'#JdO8|QSO'#GoOOQQ'#KP'#KPO9XQSO'#IPO9^Q(C[O'#IQOOQQ'#JQ'#JQOOQQ'#IU'#IUQ`QUOOO%TQUO'#DnO9fQUO'#DzO9mQUO'#D|O9SQSO'#GkO9tQ,UO'#ClO:SQSO'#EgO:_QSO'#ErO:dQ,UO'#F_O;RQSO'#GkOOQO'#KQ'#KQO;WQSO'#KQO;fQSO'#GsO;fQSO'#GtO;fQSO'#GvO9SQSO'#GyO<]QSO'#G|O=tQSO'#CbO>UQSO'#HYO>^QSO'#H`O>^QSO'#HbO`QUO'#HdO>^QSO'#HfO>^QSO'#HiO>cQSO'#HoO>hQ(C]O'#HuO%TQUO'#HwO>sQ(C]O'#HyO?OQ(C]O'#H{O9^Q(C[O'#H}O?ZQ(CjO'#CfO@]QWO'#DfQOQSOOO%TQUO'#D|O@sQSO'#EPO9tQ,UO'#EgOAOQSO'#EgOAZQ`O'#F_OOQQ'#Cd'#CdOOQ(CW'#Dk'#DkOOQ(CW'#Jh'#JhO%TQUO'#JhOOQO'#Jl'#JlOOQO'#I`'#I`OBZQWO'#E`OOQ(CW'#E_'#E_OCVQ(C`O'#E`OCaQWO'#ESOOQO'#Jk'#JkOCuQWO'#JlOESQWO'#ESOCaQWO'#E`PEaO?MpO'#C`POOO)CDo)CDoOOOO'#IV'#IVOElOpO,59ROOQ(CY,59R,59ROOOO'#IW'#IWOEzO!bO,59RO%TQUO'#D]OOOO'#IY'#IYOFYO07`O,59uOOQ(CY,59u,59uOFhQUO'#IZOF{QSO'#JfOH}QbO'#JfO+vQUO'#JfOIUQSO,59{OIlQSO'#EiOIyQSO'#JtOJUQSO'#JsOJUQSO'#JsOJ^QSO,5;VOJcQSO'#JrOOQ(CY,5:W,5:WOJjQUO,5:WOLkQ(CjO,5:bOM[QSO,5:jOMuQ(C[O'#JqOM|QSO'#JpO8|QSO'#JpONbQSO'#JpONjQSO,5;UONoQSO'#JpO!!wQbO'#JeOOQ(CY'#Cf'#CfO%TQUO'#EOO!#gQ`O,5:oOOQO'#Jm'#JmOOQO-E<a-E<aO9SQSO,5=VO!#}QSO,5=VO!$SQUO,5;SO!&VQ,UO'#EdO!'jQSO,5;SO!)SQ,UO'#DpO!)ZQUO'#DuO!)eQWO,5;]O!)mQWO,5;]O%TQUO,5;]OOQQ'#FO'#FOOOQQ'#FQ'#FQO%TQUO,5;^O%TQUO,5;^O%TQUO,5;^O%TQUO,5;^O%TQUO,5;^O%TQUO,5;^O%TQUO,5;^O%TQUO,5;^O%TQUO,5;^O%TQUO,5;^O%TQUO,5;^OOQQ'#FU'#FUO!){QUO,5;oOOQ(CY,5;t,5;tOOQ(CY,5;u,5;uO!,OQSO,5;uOOQ(CY,5;v,5;vO%TQUO'#IgO!,WQ(C[O,5<cO!&VQ,UO,5;^O!,uQ,UO,5;^O%TQUO,5;rO!,|Q#tO'#FeO!-yQ#tO'#JxO!-eQ#tO'#JxO!.QQ#tO'#JxOOQO'#Jx'#JxO!.fQ#tO,5;}OOOO,5<Z,5<ZO!.wQUO'#FqOOOO'#If'#IfO7RO&jO,5;zO!/OQ#tO'#FsOOQ(CY,5;z,5;zO!/oQ7[O'#CrOOQ(CY'#Cv'#CvO!0SQSO'#CvO!0XO07`O'#CzO!0uQ,UO,5<`O!0|QSO,5<bO!2cQMhO'#GQO!2pQSO'#GRO!2uQSO'#GRO!2zQMhO'#GVO!3yQWO'#GZO!4lQ7[O'#J_OOQ(CY'#J_'#J_O!4vQSO'#J^O!5UQSO'#J]O!5^QSO'#CqOOQ(CY'#Ct'#CtOOQ(CY'#DO'#DOOOQ(CY'#DQ'#DQO0{QSO'#DSO!'oQ,UO'#FxO!'oQ,UO'#FzO!5fQSO'#F|O!5kQSO'#F}O!2uQSO'#GTO!'oQ,UO'#GYO!5pQSO'#EjO!6_QSO,5<aOOQ(CW'#Co'#CoO!6gQSO'#EkO!7aQWO'#ElOOQ(CW'#Jr'#JrO!7hQ(C[O'#KRO9^Q(C[O,5=ZO`QUO,5>kOOQQ'#JY'#JYOOQQ,5>l,5>lOOQQ-E<S-E<SO!9jQ(CjO,5:YO!<WQ(CjO,5:fO%TQUO,5:fO!>qQ(CjO,5:hOOQO,5@l,5@lO!?bQ,UO,5=VO!?pQ(C[O'#JZO8wQSO'#JZO!@RQ(C[O,59WO!@^QWO,59WO!@fQ,UO,59WO9tQ,UO,59WO!@qQSO,5;SO!@yQSO'#HXO!A[QSO'#KUO%TQUO,5;wO!7[QWO,5;yO!AdQSO,5=rO!AiQSO,5=rO!AnQSO,5=rO9^Q(C[O,5=rO;fQSO,5=bOOQO'#Cr'#CrO!A|QWO,5=_O!BUQ,UO,5=`O!BaQSO,5=bO!BfQ`O,5=eO!BnQSO'#KQO>cQSO'#HOO9SQSO'#HQO!BsQSO'#HQO9tQ,UO'#HSO!BxQSO'#HSOOQQ,5=h,5=hO!B}QSO'#HTO!CVQSO'#ClO!C[QSO,58|O!CfQSO,58|O!EkQUO,58|OOQQ,58|,58|O!E{Q(C[O,58|O%TQUO,58|O!HWQUO'#H[OOQQ'#H]'#H]OOQQ'#H^'#H^O`QUO,5=tO!HnQSO,5=tO`QUO,5=zO`QUO,5=|O!HsQSO,5>OO`QUO,5>QO!HxQSO,5>TO!H}QUO,5>ZOOQQ,5>a,5>aO%TQUO,5>aO9^Q(C[O,5>cOOQQ,5>e,5>eO!MXQSO,5>eOOQQ,5>g,5>gO!MXQSO,5>gOOQQ,5>i,5>iO!M^QWO'#DXO%TQUO'#JhO!M{QWO'#JhO!NjQWO'#DgO!N{QWO'#DgO##^QUO'#DgO##eQSO'#JgO##mQSO,5:QO##rQSO'#EmO#$QQSO'#JuO#$YQSO,5;WO#$_QWO'#DgO#$lQWO'#EROOQ(CY,5:k,5:kO%TQUO,5:kO#$sQSO,5:kO>cQSO,5;RO!@^QWO,5;RO!@fQ,UO,5;RO9tQ,UO,5;RO#${QSO,5@SO#%QQ!LQO,5:oOOQO-E<^-E<^O#&WQ(C`O,5:zOCaQWO,5:nO#&bQWO,5:nOCaQWO,5:zO!@RQ(C[O,5:nOOQ(CW'#Ec'#EcOOQO,5:z,5:zO%TQUO,5:zO#&oQ(C[O,5:zO#&zQ(C[O,5:zO!@^QWO,5:nOOQO,5;Q,5;QO#'YQ(C[O,5:zPOOO'#IT'#ITP#'nO?MpO,58zPOOO,58z,58zOOOO-E<T-E<TOOQ(CY1G.m1G.mOOOO-E<U-E<UO#'yQ`O,59wOOOO-E<W-E<WOOQ(CY1G/a1G/aO#(OQbO,5>uO+vQUO,5>uOOQO,5>{,5>{O#(YQUO'#IZOOQO-E<X-E<XO#(gQSO,5@QO#(oQbO,5@QO#(vQSO,5@_OOQ(CY1G/g1G/gO%TQUO,5@`O#)OQSO'#IaOOQO-E<_-E<_O#(vQSO,5@_OOQ(CW1G0q1G0qOOQ(CY1G/r1G/rOOQ(CY1G0U1G0UO%TQUO,5@]O#)dQ(C[O,5@]O#)uQ(C[O,5@]O#)|QSO,5@[O8|QSO,5@[O#*UQSO,5@[O#*dQSO'#IdO#)|QSO,5@[OOQ(CW1G0p1G0pO!)eQWO,5:qO!)pQWO,5:qOOQO,5:s,5:sO#+UQSO,5:sO#+^Q,UO1G2qO9SQSO1G2qOOQ(CY1G0n1G0nO#+lQ(CjO1G0nO#,qQ(ChO,5;OOOQ(CY'#GP'#GPO#-_Q(CjO'#J_O!$SQUO1G0nO#/gQ,UO'#JiO#/qQSO,5:[O#/vQbO'#JjO%TQUO'#JjO#0QQSO,5:aOOQ(CY'#DX'#DXOOQ(CY1G0w1G0wO%TQUO1G0wOOQ(CY1G1a1G1aO#0VQSO1G0wO#2nQ(CjO1G0xO#2uQ(CjO1G0xO#5`Q(CjO1G0xO#5gQ(CjO1G0xO#7qQ(CjO1G0xO#8XQ(CjO1G0xO#;RQ(CjO1G0xO#;YQ(CjO1G0xO#=sQ(CjO1G0xO#=zQ(CjO1G0xO#?rQ(CjO1G0xO#BrQ$IUO'#CfO#DpQ$IUO1G1ZO#DwQ$IUO'#JeO!,RQSO1G1aO#EXQ(CjO,5?ROOQ(CW-E<e-E<eO#E{Q(CjO1G0xOOQ(CY1G0x1G0xO#HWQ(CjO1G1^O#HzQ#tO,5<RO#ISQ#tO,5<SO#I[Q#tO'#FjO#IsQSO'#FiOOQO'#Jy'#JyOOQO'#Ie'#IeO#IxQ#tO1G1iOOQ(CY1G1i1G1iOOOO1G1t1G1tO#JZQ$IUO'#JdO#JeQSO,5<]O!){QUO,5<]OOOO-E<d-E<dOOQ(CY1G1f1G1fO#JjQWO'#JxOOQ(CY,5<_,5<_O#JrQWO,5<_OOQ(CY,59b,59bO!&VQ,UO'#C|OOOO'#IX'#IXO#JwO07`O,59fOOQ(CY,59f,59fO%TQUO1G1zO!5kQSO'#IiO#KSQ,UO,5<sOOQ(CY,5<p,5<pOOQO'#Gf'#GfO!'oQ,UO,5=POOQO'#Gh'#GhO!'oQ,UO,5=RO!&VQ,UO,5=TOOQO1G1|1G1|O#KZQ`O'#CoO#KnQ`O,5<lO#KuQSO'#J|O9SQSO'#J|O#LTQSO,5<nO!'oQ,UO,5<mO#LYQSO'#GSO#LeQSO,5<mO#LjQ`O'#GPO#LwQ`O'#J}O#MRQSO'#J}O!&VQ,UO'#J}O#MWQSO,5<qO#M]QWO'#G[O!3tQWO'#G[O#MnQSO'#G^O#MsQSO'#G`O!2uQSO'#GcO#MxQ(C[O'#IkO#NTQWO,5<uOOQ(CY,5<u,5<uO#N[QWO'#G[O#NjQWO'#G]O#NrQWO'#G]OOQ(CY,5=U,5=UO!'oQ,UO,5?xO!'oQ,UO,5?xO#NwQSO'#IlO$ SQSO,5?wO$ [QSO,59]O$ {Q,UO,59nOOQ(CY,59n,59nO$!nQ,UO,5<dO$#aQ,UO,5<fO@TQSO,5<hOOQ(CY,5<i,5<iO$#kQSO,5<oO$#pQ,UO,5<tO$$QQSO'#JpO!$SQUO1G1{O$$VQSO1G1{O8|QSO'#JsO8|QSO'#EmO%TQUO'#EmO8|QSO'#InO$$[Q(C[O,5@mOOQQ1G2u1G2uOOQQ1G4V1G4VOOQ(CY1G/t1G/tO!,OQSO1G/tO$&aQ(CjO1G0QOOQQ1G2q1G2qO!&VQ,UO1G2qO%TQUO1G2qO$'QQSO1G2qO$']Q,UO'#EdOOQ(CW,5?u,5?uO$'gQ(C[O,5?uOOQQ1G.r1G.rO!@RQ(C[O1G.rO!@^QWO1G.rO!@fQ,UO1G.rO$'xQSO1G0nO$'}QSO'#CfO$(YQSO'#KVO$(bQSO,5=sO$(gQSO'#KVO$(lQSO'#KVO$(wQSO'#ItO$)VQSO,5@pO$)_QbO1G1cOOQ(CY1G1e1G1eO9SQSO1G3^O@TQSO1G3^O$)fQSO1G3^O$)kQSO1G3^OOQQ1G3^1G3^O!BaQSO1G2|O!&VQ,UO1G2yO$)pQSO1G2yOOQQ1G2z1G2zO!&VQ,UO1G2zO$)uQSO1G2zO$)}QWO'#GxOOQQ1G2|1G2|O!3tQWO'#IpO!BfQ`O1G3POOQQ1G3P1G3POOQQ,5=j,5=jO$*VQ,UO,5=lO9SQSO,5=lO#MsQSO,5=nO8wQSO,5=nO!@^QWO,5=nO!@fQ,UO,5=nO9tQ,UO,5=nO$*eQSO'#KTO$*pQSO,5=oOOQQ1G.h1G.hO$*uQ(C[O1G.hO@TQSO1G.hO$+QQSO1G.hO9^Q(C[O1G.hO$-VQbO,5@rO$-gQSO,5@rO8|QSO,5@rO$-rQUO,5=vO$-yQSO,5=vOOQQ1G3`1G3`O`QUO1G3`OOQQ1G3f1G3fOOQQ1G3h1G3hO>^QSO1G3jO$.OQUO1G3lO$2SQUO'#HkOOQQ1G3o1G3oO$2aQSO'#HqO>cQSO'#HsOOQQ1G3u1G3uO$2iQUO1G3uO9^Q(C[O1G3{OOQQ1G3}1G3}OOQ(CW'#GW'#GWO9^Q(C[O1G4PO9^Q(C[O1G4RO$6pQSO,5@SO!){QUO,5;XO8|QSO,5;XO>cQSO,5:RO!){QUO,5:RO!@^QWO,5:RO$6uQ$IUO,5:ROOQO,5;X,5;XO$7PQWO'#I[O$7gQSO,5@ROOQ(CY1G/l1G/lO$7oQWO'#IbO$7yQSO,5@aOOQ(CW1G0r1G0rO!N{QWO,5:ROOQO'#I_'#I_O$8RQWO,5:mOOQ(CY,5:m,5:mO#$vQSO1G0VOOQ(CY1G0V1G0VO%TQUO1G0VOOQ(CY1G0m1G0mO>cQSO1G0mO!@^QWO1G0mO!@fQ,UO1G0mOOQ(CW1G5n1G5nO!@RQ(C[O1G0YOOQO1G0f1G0fO%TQUO1G0fO$8YQ(C[O1G0fO$8eQ(C[O1G0fO!@^QWO1G0YOCaQWO1G0YO$8sQ(C[O1G0fOOQO1G0Y1G0YO$9XQ(CjO1G0fPOOO-E<R-E<RPOOO1G.f1G.fOOOO1G/c1G/cO$9cQ`O,5<cO$9kQbO1G4aOOQO1G4g1G4gO%TQUO,5>uO$9uQSO1G5lO$9}QSO1G5yO$:VQbO1G5zO8|QSO,5>{O$:aQ(CjO1G5wO%TQUO1G5wO$:qQ(C[O1G5wO$;SQSO1G5vO$;SQSO1G5vO8|QSO1G5vO$;[QSO,5?OO8|QSO,5?OOOQO,5?O,5?OO$;pQSO,5?OO$$QQSO,5?OOOQO-E<b-E<bOOQO1G0]1G0]OOQO1G0_1G0_O!,RQSO1G0_OOQQ7+(]7+(]O!&VQ,UO7+(]O%TQUO7+(]O$<OQSO7+(]O$<ZQ,UO7+(]O$<iQ(CjO,59nO$>qQ(CjO,5<dO$@|Q(CjO,5<fO$CXQ(CjO,5<tOOQ(CY7+&Y7+&YO$EjQ(CjO7+&YO$F^Q,UO'#I]O$FhQSO,5@TOOQ(CY1G/v1G/vO$FpQUO'#I^O$F}QSO,5@UO$GVQbO,5@UOOQ(CY1G/{1G/{O$GaQSO7+&cOOQ(CY7+&c7+&cO$GfQ$IUO,5:bO%TQUO7+&uO$GpQ$IUO,5:YO$G}Q$IUO,5:fO$HXQ$IUO,5:hOOQ(CY7+&{7+&{OOQO1G1m1G1mOOQO1G1n1G1nO$HcQ#tO,5<UO!){QUO,5<TOOQO-E<c-E<cOOQ(CY7+'T7+'TOOOO7+'`7+'`OOOO1G1w1G1wO$HnQSO1G1wOOQ(CY1G1y1G1yO$HsQ`O,59hOOOO-E<V-E<VOOQ(CY1G/Q1G/QO$HzQ(CjO7+'fOOQ(CY,5?T,5?TO$InQ`O,5?TOOQ(CY1G2_1G2_P!&VQ,UO'#IiPOQ(CY-E<g-E<gO$J^Q,UO1G2kO$KPQ,UO1G2mO$KZQ`O1G2oOOQ(CY1G2W1G2WO$KbQSO'#IhO$KpQSO,5@hO$KpQSO,5@hO$KxQSO,5@hO$LTQSO,5@hOOQO1G2Y1G2YO$LcQ,UO1G2XO!'oQ,UO1G2XO$LsQMhO'#IjO$MTQSO,5@iO!&VQ,UO,5@iO$M]Q`O,5@iOOQ(CY1G2]1G2]OOQ(CW,5<v,5<vOOQ(CW,5<w,5<wO$$QQSO,5<wOCQQSO,5<wO!@^QWO,5<vOOQO'#G_'#G_O$MgQSO,5<xOOQ(CW,5<z,5<zO$$QQSO,5<}OOQO,5?V,5?VOOQO-E<i-E<iOOQ(CY1G2a1G2aO!3tQWO,5<vO$MoQSO,5<wO#MnQSO,5<xO!3tQWO,5<wO$MzQ,UO1G5dO$NUQ,UO1G5dOOQO,5?W,5?WOOQO-E<j-E<jOOQO1G.w1G.wO!7[QWO,59pO%TQUO,59pO$NcQSO1G2SO!'oQ,UO1G2ZO$NhQ(CjO7+'gOOQ(CY7+'g7+'gO!$SQUO7+'gO% [QSO,5;XOOQ(CW,5?Y,5?YOOQ(CW-E<l-E<lOOQ(CY7+%`7+%`O% aQ`O'#KOO#$vQSO7+(]O% kQbO7+(]O$<RQSO7+(]O% rQ(ChO'#CfO%!VQ(ChO,5<{O%!wQSO,5<{OOQ(CW1G5a1G5aOOQQ7+$^7+$^O!@RQ(C[O7+$^O!@^QWO7+$^O!$SQUO7+&YO%!|QSO'#IsO%#bQSO,5@qOOQO1G3_1G3_O9SQSO,5@qO%#bQSO,5@qO%#jQSO,5@qOOQO,5?`,5?`OOQO-E<r-E<rOOQ(CY7+&}7+&}O%#oQSO7+(xO9^Q(C[O7+(xO9SQSO7+(xO@TQSO7+(xOOQQ7+(h7+(hO%#tQ(ChO7+(eO!&VQ,UO7+(eO%$OQ`O7+(fOOQQ7+(f7+(fO!&VQ,UO7+(fO%$VQSO'#KSO%$bQSO,5=dOOQO,5?[,5?[OOQO-E<n-E<nOOQQ7+(k7+(kO%%qQWO'#HROOQQ1G3W1G3WO!&VQ,UO1G3WO%TQUO1G3WO%%xQSO1G3WO%&TQ,UO1G3WO9^Q(C[O1G3YO#MsQSO1G3YO8wQSO1G3YO!@^QWO1G3YO!@fQ,UO1G3YO%&cQSO'#IrO%&nQSO,5@oO%&vQWO,5@oOOQ(CW1G3Z1G3ZOOQQ7+$S7+$SO@TQSO7+$SO9^Q(C[O7+$SO%'RQSO7+$SO%TQUO1G6^O%TQUO1G6_O%'WQ(C[O1G6^O%'bQUO1G3bO%'iQSO1G3bO%'nQUO1G3bOOQQ7+(z7+(zO9^Q(C[O7+)UO`QUO7+)WOOQQ'#KY'#KYOOQQ'#Iu'#IuO%'uQUO,5>VOOQQ,5>V,5>VO%TQUO'#HlO%(SQSO'#HnOOQQ,5>],5>]O8|QSO,5>]OOQQ,5>_,5>_OOQQ7+)a7+)aOOQQ7+)g7+)gOOQQ7+)k7+)kOOQQ7+)m7+)mO%(XQWO1G5nO%(mQ$IUO1G0sO%(wQSO1G0sOOQO1G/m1G/mO%)SQ$IUO1G/mO>cQSO1G/mO!){QUO'#DgOOQO,5>v,5>vOOQO-E<Y-E<YOOQO,5>|,5>|OOQO-E<`-E<`O!@^QWO1G/mOOQO-E<]-E<]OOQ(CY1G0X1G0XOOQ(CY7+%q7+%qO#$vQSO7+%qOOQ(CY7+&X7+&XO>cQSO7+&XO!@^QWO7+&XOOQO7+%t7+%tO$9XQ(CjO7+&QOOQO7+&Q7+&QO%TQUO7+&QO%)^Q(C[O7+&QO!@RQ(C[O7+%tO!@^QWO7+%tO%)iQ(C[O7+&QO%)wQ(CjO7++cO%TQUO7++cO%*XQSO7++bO%*XQSO7++bOOQO1G4j1G4jO8|QSO1G4jO%*aQSO1G4jOOQO7+%y7+%yO#$vQSO<<KwO% kQbO<<KwO%*oQSO<<KwOOQQ<<Kw<<KwO!&VQ,UO<<KwO%TQUO<<KwO%*wQSO<<KwO%+SQ(CjO1G2kO%-_Q(CjO1G2mO%/jQ(CjO1G2XO%1{Q,UO,5>wOOQO-E<Z-E<ZO%2VQbO,5>xO%TQUO,5>xOOQO-E<[-E<[O%2aQSO1G5pOOQ(CY<<I}<<I}O%2iQ$IUO1G0nO%4sQ$IUO1G0xO%4zQ$IUO1G0xO%7OQ$IUO1G0xO%7VQ$IUO1G0xO%8zQ$IUO1G0xO%9bQ$IUO1G0xO%;uQ$IUO1G0xO%;|Q$IUO1G0xO%>QQ$IUO1G0xO%>XQ$IUO1G0xO%@PQ$IUO1G0xO%@dQ(CjO<<JaO%AiQ$IUO1G0xO%C_Q$IUO'#J_O%EbQ$IUO1G1^O%EoQ$IUO1G0QO!){QUO'#FlOOQO'#Jz'#JzOOQO1G1p1G1pO%EyQSO1G1oO%FOQ$IUO,5?ROOOO7+'c7+'cOOOO1G/S1G/SOOQ(CY1G4o1G4oO!'oQ,UO7+(ZO%FYQSO,5?SO9SQSO,5?SOOQO-E<f-E<fO%FhQSO1G6SO%FhQSO1G6SO%FpQSO1G6SO%F{Q,UO7+'sO%G]Q`O,5?UO%GgQSO,5?UO!&VQ,UO,5?UOOQO-E<h-E<hO%GlQ`O1G6TO%GvQSO1G6TOOQ(CW1G2c1G2cO$$QQSO1G2cOOQ(CW1G2b1G2bO%HOQSO1G2dO!&VQ,UO1G2dOOQ(CW1G2i1G2iO!@^QWO1G2bOCQQSO1G2cO%HTQSO1G2dO%H]QSO1G2cO!'oQ,UO7++OOOQ(CY1G/[1G/[O%HhQSO1G/[OOQ(CY7+'n7+'nO%HmQ,UO7+'uO%H}Q(CjO<<KROOQ(CY<<KR<<KRO%IqQSO1G0sO!&VQ,UO'#ImO%IvQSO,5@jO!&VQ,UO1G2gOOQQ<<Gx<<GxO!@RQ(C[O<<GxO%JOQ(CjO<<ItOOQ(CY<<It<<ItOOQO,5?_,5?_O%JrQSO,5?_O$(lQSO,5?_OOQO-E<q-E<qO%JwQSO1G6]O%JwQSO1G6]O9SQSO1G6]O@TQSO<<LdOOQQ<<Ld<<LdO%KPQSO<<LdO9^Q(C[O<<LdOOQQ<<LP<<LPO%#tQ(ChO<<LPOOQQ<<LQ<<LQO%$OQ`O<<LQO%KUQWO'#IoO%KaQSO,5@nO!){QUO,5@nOOQQ1G3O1G3OO%KiQUO'#JhOOQO'#Iq'#IqO9^Q(C[O'#IqO%KsQWO,5=mOOQQ,5=m,5=mO%KzQWO'#E`O%L`QSO7+(rO%LeQSO7+(rOOQQ7+(r7+(rO!&VQ,UO7+(rO%TQUO7+(rO%LmQSO7+(rOOQQ7+(t7+(tO9^Q(C[O7+(tO#MsQSO7+(tO8wQSO7+(tO!@^QWO7+(tO%LxQSO,5?^OOQO-E<p-E<pOOQO'#HU'#HUO%MTQSO1G6ZO9^Q(C[O<<GnOOQQ<<Gn<<GnO@TQSO<<GnO%M]QSO7++xO%MbQSO7++yO%TQUO7++xO%TQUO7++yOOQQ7+(|7+(|O%MgQSO7+(|O%MlQUO7+(|O%MsQSO7+(|OOQQ<<Lp<<LpOOQQ<<Lr<<LrOOQQ-E<s-E<sOOQQ1G3q1G3qO%MxQSO,5>WOOQQ,5>Y,5>YO%M}QSO1G3wO8|QSO7+&_O!){QUO7+&_OOQO7+%X7+%XO%NSQ$IUO1G5zO>cQSO7+%XOOQ(CY<<I]<<I]OOQ(CY<<Is<<IsO>cQSO<<IsOOQO<<Il<<IlO$9XQ(CjO<<IlO%TQUO<<IlOOQO<<I`<<I`O!@RQ(C[O<<I`O%N^Q(C[O<<IlO%NiQ(CjO<<N}O%NyQSO<<N|OOQO7+*U7+*UO8|QSO7+*UOOQQANAcANAcO& RQSOANAcO!&VQ,UOANAcO#$vQSOANAcO% kQbOANAcO%TQUOANAcO& ZQ(CjO7+'sO&#lQ(CjO7+'uO&%}QbO1G4dO&&XQ$IUO7+&YO&&fQ$IUO,59nO&(iQ$IUO,5<dO&*lQ$IUO,5<fO&,oQ$IUO,5<tO&.eQ$IUO7+'fO&.rQ$IUO7+'gO&/PQSO,5<WOOQO7+'Z7+'ZO&/UQ,UO<<KuOOQO1G4n1G4nO&/]QSO1G4nO&/hQSO1G4nO&/vQSO7++nO&/vQSO7++nO!&VQ,UO1G4pO&0OQ`O1G4pO&0YQSO7++oOOQ(CW7+'}7+'}O$$QQSO7+(OO&0bQ`O7+(OOOQ(CW7+'|7+'|O$$QQSO7+'}O&0iQSO7+(OO!&VQ,UO7+(OOCQQSO7+'}O&0nQ,UO<<NjOOQ(CY7+$v7+$vO&0xQ`O,5?XOOQO-E<k-E<kO&1SQ(ChO7+(ROOQQAN=dAN=dO9SQSO1G4yOOQO1G4y1G4yO&1dQSO1G4yO&1iQSO7++wO&1iQSO7++wO9^Q(C[OANBOO@TQSOANBOOOQQANBOANBOOOQQANAkANAkOOQQANAlANAlO&1qQSO,5?ZOOQO-E<m-E<mO&1|Q$IUO1G6YO&4^QbO'#CfOOQO,5?],5?]OOQO-E<o-E<oOOQQ1G3X1G3XO%KiQUO,5<xOOQQ<<L^<<L^O!&VQ,UO<<L^O%L`QSO<<L^O&4hQSO<<L^O%TQUO<<L^OOQQ<<L`<<L`O9^Q(C[O<<L`O#MsQSO<<L`O8wQSO<<L`O&4pQWO1G4xO&4{QSO7++uOOQQAN=YAN=YO9^Q(C[OAN=YOOQQ<= d<= dOOQQ<= e<= eO&5TQSO<= dO&5YQSO<= eOOQQ<<Lh<<LhO&5_QSO<<LhO&5dQUO<<LhOOQQ1G3r1G3rO>cQSO7+)cO&5kQSO<<IyO&5vQ$IUO<<IyOOQO<<Hs<<HsOOQ(CYAN?_AN?_OOQOAN?WAN?WO$9XQ(CjOAN?WOOQOAN>zAN>zO%TQUOAN?WOOQO<<Mp<<MpOOQQG26}G26}O!&VQ,UOG26}O#$vQSOG26}O&6QQSOG26}O% kQbOG26}O&6YQ$IUO<<JaO&6gQ$IUO1G2XO&8]Q$IUO1G2kO&:`Q$IUO1G2mO&<cQ$IUO<<KRO&<pQ$IUO<<ItOOQO1G1r1G1rO!'oQ,UOANAaOOQO7+*Y7+*YO&<}QSO7+*YO&=YQSO<= YO&=bQ`O7+*[OOQ(CW<<Kj<<KjO$$QQSO<<KjOOQ(CW<<Ki<<KiO&=lQ`O<<KjO$$QQSO<<KiOOQO7+*e7+*eO9SQSO7+*eO&=sQSO<= cOOQQG27jG27jO9^Q(C[OG27jO!){QUO1G4uO&={QSO7++tO%L`QSOANAxOOQQANAxANAxO!&VQ,UOANAxO&>TQSOANAxOOQQANAzANAzO9^Q(C[OANAzO#MsQSOANAzOOQO'#HV'#HVOOQO7+*d7+*dOOQQG22tG22tOOQQANEOANEOOOQQANEPANEPOOQQANBSANBSO&>]QSOANBSOOQQ<<L}<<L}O!){QUOAN?eOOQOG24rG24rO$9XQ(CjOG24rO#$vQSOLD,iOOQQLD,iLD,iO!&VQ,UOLD,iO&>bQSOLD,iO&>jQ$IUO7+'sO&@`Q$IUO7+'uO&BUQ,UOG26{OOQO<<Mt<<MtOOQ(CWANAUANAUO$$QQSOANAUOOQ(CWANATANATOOQO<<NP<<NPOOQQLD-ULD-UO&BfQ$IUO7+*aOOQQG27dG27dO%L`QSOG27dO!&VQ,UOG27dOOQQG27fG27fO9^Q(C[OG27fOOQQG27nG27nO&BpQ$IUOG25POOQOLD*^LD*^OOQQ!$(!T!$(!TO#$vQSO!$(!TO!&VQ,UO!$(!TO&BzQ(CjOG26{OOQ(CWG26pG26pOOQQLD-OLD-OO%L`QSOLD-OOOQQLD-QLD-QOOQQ!)9Eo!)9EoO#$vQSO!)9EoOOQQ!$(!j!$(!jOOQQ!.K;Z!.K;ZO&E]Q$IUOG26{O!){QUO'#DvO0xQSO'#ETO&GRQbO'#JdO!){QUO'#DnO&GYQUO'#DzO&GaQbO'#CfO&IwQbO'#CfO!){QUO'#D|O&JXQUO,5;SO!){QUO,5;^O!){QUO,5;^O!){QUO,5;^O!){QUO,5;^O!){QUO,5;^O!){QUO,5;^O!){QUO,5;^O!){QUO,5;^O!){QUO,5;^O!){QUO,5;^O!){QUO,5;^O!){QUO'#IgO&L[QSO,5<cO&LdQ,UO,5;^O&MwQ,UO,5;^O!){QUO,5;rO0{QSO'#DSO0{QSO'#DSO!&VQ,UO'#FxO&LdQ,UO'#FxO!&VQ,UO'#FzO&LdQ,UO'#FzO!&VQ,UO'#GYO&LdQ,UO'#GYO!){QUO,5:fO!){QUO,5@`O&JXQUO1G0nO&NOQ$IUO'#CfO!){QUO1G1zO!&VQ,UO,5=PO&LdQ,UO,5=PO!&VQ,UO,5=RO&LdQ,UO,5=RO!&VQ,UO,5<mO&LdQ,UO,5<mO&JXQUO1G1{O!){QUO7+&uO!&VQ,UO1G2XO&LdQ,UO1G2XO!&VQ,UO1G2ZO&LdQ,UO1G2ZO&JXQUO7+'gO&JXQUO7+&YO!&VQ,UOANAaO&LdQ,UOANAaO&NYQSO'#EhO&N_QSO'#EhO&NgQSO'#FWO&NlQSO'#ErO&NqQSO'#JtO&N|QSO'#JrO' XQSO,5;SO' ^Q,UO,5<`O' eQSO'#GRO' jQSO'#GRO' oQSO,5<aO' wQSO,5;SO'!PQ$IUO1G1ZO'!WQSO,5<mO'!]QSO,5<mO'!bQSO,5<oO'!gQSO,5<oO'!lQSO1G1{O'!qQSO1G0nO'!vQ,UO<<KuO'!}Q,UO<<KuO7aQ,UO'#FvO8wQSO'#FuOAOQSO'#EgO!){QUO,5;oO!2uQSO'#GRO!2uQSO'#GRO!2uQSO'#GTO!2uQSO'#GTO!'oQ,UO7+(ZO!'oQ,UO7+(ZO$KZQ`O1G2oO$KZQ`O1G2oO!&VQ,UO,5=TO!&VQ,UO,5=T",
  stateData: "'$W~O'nOS'oOSROS'pRQ~OPYOQYOV!UO^qOayObxOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!XXO!ctO!hZO!kYO!lYO!mYO!ouO!qvO!twO!x]O#p!OO$Q{O$UfO%`|O%b!PO%d}O%e}O%f}O%i!QO%k!RO%n!SO%o!SO%q!TO%}!VO&T!WO&V!XO&X!YO&Z!ZO&^![O&d!]O&j!^O&l!_O&n!`O&p!aO&r!bO'uSO'wTO'zUO(SVO(b[O(oiO~OPYOQYOa!iOb!hOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!X!dO!ctO!hZO!kYO!lYO!mYO!ouO!q!fO!t!gO$Q!jO$UfO'u!cO'wTO'zUO(SVO(b[O(oiO~O^!uOl!mO|!nO![!wO!]!tO!^!tO!x9qO!|!oO!}!oO#O!vO#P!oO#Q!oO#T!xO#U!xO'v!kO'wTO'zUO(V!lO(b!rO~O'p!yO~OPYXXYX^YXkYXyYXzYX|YX!VYX!eYX!fYX!hYX!lYX#XYX#dcX#gYX#hYX#iYX#jYX#kYX#lYX#mYX#nYX#oYX#qYX#sYX#uYX#vYX#{YX'lYX(SYX(cYX(jYX(kYX~O!a$zX~P(jO[!{O'w!}O'x!{O'y!}O~O[#OO'y!}O'z!}O'{#OO~Oq#QO!O#RO(T#RO(U#TO~OPYOQYOa!iOb!hOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!X!dO!ctO!hZO!kYO!lYO!mYO!ouO!q!fO!t!gO$Q!jO$UfO'u9uO'wTO'zUO(SVO(b[O(oiO~O!U#XO!V#UO!S(YP!S(gP~P+vO!W#aO~P`OPYOQYOa!iOb!hOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!X!dO!ctO!hZO!kYO!lYO!mYO!ouO!q!fO!t!gO$Q!jO$UfO'wTO'zUO(SVO(b[O(oiO~Oi#kO!U#gO!x]O#b#jO#c#gO'u9vO!g(dP~P.bO!h#mO'u#lO~O!t#qO!x]O%`#rO~O#d#sO~O!a#tO#d#sO~OP$[OX$cOk$POy#xOz#yO|#zO!V$`O!e$RO!f#vO!h#wO!l$[O#g#}O#h$OO#i$OO#j$OO#k$QO#l$RO#m$RO#n$bO#o$RO#q$SO#s$UO#u$WO#v$XO(SVO(c$YO(j#{O(k#|O~O^(WX'l(WX'j(WX!g(WX!S(WX!X(WX%a(WX!a(WX~P1jO#X$dO#{$dOP(XXX(XXk(XXy(XXz(XX|(XX!V(XX!e(XX!h(XX!l(XX#g(XX#h(XX#i(XX#j(XX#k(XX#l(XX#m(XX#n(XX#o(XX#q(XX#s(XX#u(XX#v(XX(S(XX(c(XX(j(XX(k(XX!X(XX%a(XX~O^(XX!f(XX'l(XX'j(XX!S(XX!g(XXo(XX!a(XX~P4QO#X$dO~O$W$fO$Y$eO$a$kO~O!X$lO$UfO$d$mO$f$oO~Oi%ROk$sOl$rOm$rOs%SOu%TOw%UO|$zO!X${O!c%ZO!h$wO#c%[O$Q%XO$m%VO$o%WO$r%YO'u$qO'wTO'zUO(O%QO(S$tOd(PP~O!h%]O~O|%`O!X%aO'u%_O~O!a%eO~O^%fO'l%fO~O'v!kO~P%TO%f%mO~P%TO!h%]O'u%_O'v!kO(O%QO~Ob%tO!h%]O'u%_O~O#o$RO~Oy%yO!X%vO!h%xO%b%|O'u%_O'v!kO'wTO'zUO](xP~O!t#qO~O%k&OO|(tX!X(tX'u(tX~O'u&PO~O!q&UO#p!OO%b!PO%d}O%e}O%f}O%i!QO%k!RO%n!SO%o!SO~Oa&ZOb&YO!t&WO%`&XO%s&VO~P;kOa&^ObxO!X&]O!q&UO!twO!x]O#p!OO%`|O%d}O%e}O%f}O%i!QO%k!RO%n!SO%o!SO%q!TO~O_&aO#X&dO%b&_O'v!kO~P<pO!h&eO!q&iO~O!h#mO~O!XXO~O^%fO'k&qO'l%fO~O^%fO'k&tO'l%fO~O^%fO'k&vO'l%fO~O'jYX!SYXoYX!gYX&RYX!XYX%aYX!aYX~P(jO!['TO!]&|O!^&|O'v!kO'wTO'zUO~Ol&zO|&yO!U&}O(V&xO!W(ZP!W(iP~P?wOg'WO!X'UO'u%_O~Ob']O!h%]O'u%_O~Oy%yO!h%xO~Ol!mO|!nO!x9qO!|!oO!}!oO#P!oO#Q!oO'v!kO'wTO'zUO(V!lO(b!rO~O!['cO!]'bO!^'bO#O!oO#T'dO#U'dO~PAcO^%fO!a#tO!h%]O'l%fO(O%QO(c'fO~O!l'jO#X'hO~PBqOl!mO|!nO'wTO'zUO(V!lO(b!rO~O!XXOl(`X|(`X![(`X!](`X!^(`X!x(`X!|(`X!}(`X#O(`X#P(`X#Q(`X#T(`X#U(`X'v(`X'w(`X'z(`X(V(`X(b(`X~O!]'bO!^'bO'v!kO~PCaO'q'nO'r'nO's'pO~O[!{O'w'rO'x!{O'y'rO~O[#OO'y'rO'z'rO'{#OO~Oq#QO!O#RO(T#RO(U'vO~O!U'xO!S&}X!S'TX!V&}X!V'TX~P+vO!V'zO!S(YX~OP$[OX$cOk$POy#xOz#yO|#zO!V'zO!e$RO!f#vO!h#wO!l$[O#g#}O#h$OO#i$OO#j$OO#k$QO#l$RO#m$RO#n$bO#o$RO#q$SO#s$UO#u$WO#v$XO(SVO(c$YO(j#{O(k#|O~O!S(YX~PGTO!S(PO~O!S(fX!V(fX!a(fX!g(fX(c(fX~O#X(fX#d#]X!W(fX~PIZO#X(QO!S(hX!V(hX~O!V(RO!S(gX~O!S(UO~O#X$dO~PIZO!W(VO~P`Oy#xOz#yO|#zO!f#vO!h#wO(SVOP!jaX!jak!ja!V!ja!e!ja!l!ja#g!ja#h!ja#i!ja#j!ja#k!ja#l!ja#m!ja#n!ja#o!ja#q!ja#s!ja#u!ja#v!ja(c!ja(j!ja(k!ja~O^!ja'l!ja'j!ja!S!ja!g!jao!ja!X!ja%a!ja!a!ja~PJqO!g(WO~O!a#tO#X(XO(c'fO!V(eX^(eX'l(eX~O!g(eX~PMaO|%`O!X%aO!x]O#b(^O#c(]O'u%_O~O!V(_O!g(dX~O!g(aO~O|%`O!X%aO#c(]O'u%_O~OP(XXX(XXk(XXy(XXz(XX|(XX!V(XX!e(XX!f(XX!h(XX!l(XX#g(XX#h(XX#i(XX#j(XX#k(XX#l(XX#m(XX#n(XX#o(XX#q(XX#s(XX#u(XX#v(XX(S(XX(c(XX(j(XX(k(XX~O!a#tO!g(XX~PN}Oy(bOz(cO!f#vO!h#wO!x!wa|!wa~O!t!wa%`!wa!X!wa#b!wa#c!wa'u!wa~P!#RO!t(gO~OPYOQYOa!iOb!hOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!XXO!ctO!hZO!kYO!lYO!mYO!ouO!q!fO!t!gO$Q!jO$UfO'u!cO'wTO'zUO(SVO(b[O(oiO~Oi%ROk$sOl$rOm$rOs%SOu%TOw:ZO|$zO!X${O!c;eO!h$wO#c:aO$Q%XO$m:]O$o:_O$r%YO'u(kO'wTO'zUO(O%QO(S$tO~O#d(mO~Oi%ROk$sOl$rOm$rOs%SOu%TOw%UO|$zO!X${O!c%ZO!h$wO#c%[O$Q%XO$m%VO$o%WO$r%YO'u(kO'wTO'zUO(O%QO(S$tO~Od(]P~P!'oO!U(qO!g(^P~P%TO(V(sO(b[O~O|(uO!h#wO(V(sO(b[O~OP9pOQ9pOa;aOb!hOikOk9pOlkOmkOskOu9pOw9pO|WO!QkO!RkO!X!dO!c9sO!hZO!k9pO!l9pO!m9pO!o9tO!q9wO!t!gO$Q!jO$UfO'u)TO'wTO'zUO(SVO(b[O(o;_O~Oz)WO!h#wO~O!V$`O^$ka'l$ka'j$ka!g$ka!S$ka!X$ka%a$ka!a$ka~O#p)[O~P!&VOy)_O!a)^O!X$XX$T$XX$W$XX$Y$XX$a$XX~O!a)^O!X(lX$T(lX$W(lX$Y(lX$a(lX~Oy)_O~P!-eOy)_O!X(lX$T(lX$W(lX$Y(lX$a(lX~O!X)aO$T)eO$W)`O$Y)`O$a)fO~O!U)iO~P!){O$W$fO$Y$eO$a)mO~Og$sXy$sX|$sX!f$sX(j$sX(k$sX~OdfXd$sXgfX!VfX#XfX~P!/ZOl)oO~Oq)pO(T)qO(U)sO~Og)|Oy)uO|)vO(j)xO(k)zO~Od)tO~P!0dOd)}O~Oi%ROk$sOl$rOm$rOs%SOu%TOw:ZO|$zO!X${O!c;eO!h$wO#c:aO$Q%XO$m:]O$o:_O$r%YO'wTO'zUO(O%QO(S$tO~O!U*RO'u*OO!g(pP~P!1RO#d*TO~O!h*UO~O!U*ZO'u*WO!S(qP~P!1ROk*gO|*_O![*eO!]*^O!^*^O!h*UO#T*fO%W*aO'v!kO(V!lO~O!W*dO~P!3XO!f#vOg(RXy(RX|(RX(j(RX(k(RX!V(RX#X(RX~Od(RX#y(RX~P!4QOg*jO#X*iOd(QX!V(QX~O!V*kOd(PX~O'u&POd(PP~O!h*rO~O'u(kO~Oi*vO|%`O!U#gO!X%aO!x]O#b#jO#c#gO'u%_O!g(dP~O!a#tO#d*wO~O|%`O!U*yO!V(RO!X%aO'u%_O!S(gP~Ol'QO|*{O!U*zO'wTO'zUO(V(sO~O!W(iP~P!6{O!V*|O^(uX'l(uX~OP$[OX$cOk$POy#xOz#yO|#zO!e$RO!f#vO!h#wO!l$[O#g#}O#h$OO#i$OO#j$OO#k$QO#l$RO#m$RO#n$bO#o$RO#q$SO#s$UO#u$WO#v$XO(SVO(c$YO(j#{O(k#|O~O^!ba!V!ba'l!ba'j!ba!S!ba!g!bao!ba!X!ba%a!ba!a!ba~P!7sOy#xOz#yO|#zO!f#vO!h#wO(SVOP!naX!nak!na!V!na!e!na!l!na#g!na#h!na#i!na#j!na#k!na#l!na#m!na#n!na#o!na#q!na#s!na#u!na#v!na(c!na(j!na(k!na~O^!na'l!na'j!na!S!na!g!nao!na!X!na%a!na!a!na~P!:^Oy#xOz#yO|#zO!f#vO!h#wO(SVOP!paX!pak!pa!V!pa!e!pa!l!pa#g!pa#h!pa#i!pa#j!pa#k!pa#l!pa#m!pa#n!pa#o!pa#q!pa#s!pa#u!pa#v!pa(c!pa(j!pa(k!pa~O^!pa'l!pa'j!pa!S!pa!g!pao!pa!X!pa%a!pa!a!pa~P!<wOg+VO!X'UO%a+UO(O%QO~O!a+XO^'}X!X'}X'l'}X!V'}X~O^%fO!XXO'l%fO~O!h%]O(O%QO~O!h%]O'u%_O(O%QO~O!a#tO#d(mO~O%b+eO'u+aO'wTO'zUO!W(yP~O!V+fO](xX~OX+jO~O]+kO~O!X%vO'u%_O'v!kO](xP~O#X+pO(O%QO~Og+sO!X${O(O%QO~O!X+uO~Oy+wO!XXO~O%f%mO~O!t+|O~Ob,RO~O'u#lO!W(wP~Ob%tO~O%b!PO'u&PO~P<pOX,XO],WO~OPYOQYOayObxOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!ctO!hZO!kYO!lYO!mYO!ouO!twO!x]O$UfO%`|O'wTO'zUO(SVO(b[O(oiO~O!X!dO!q!fO$Q!jO'u!cO~P!CnO],WO^%fO'l%fO~OPYOQYOa!iOb!hOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!X!dO!ctO!hZO!kYO!lYO!mYO!ouO!t!gO$Q!jO$UfO'u!cO'wTO'zUO(SVO(b[O(oiO~O^,^O!qvO#p}O%d}O%e}O%f}O~P!FWO!h&eO~O&T,dO~O!X,fO~O&f,hO&h,iOP&caQ&caV&ca^&caa&cab&cai&cak&cal&cam&cas&cau&caw&ca|&ca!Q&ca!R&ca!X&ca!c&ca!h&ca!k&ca!l&ca!m&ca!o&ca!q&ca!t&ca!x&ca#p&ca$Q&ca$U&ca%`&ca%b&ca%d&ca%e&ca%f&ca%i&ca%k&ca%n&ca%o&ca%q&ca%}&ca&T&ca&V&ca&X&ca&Z&ca&^&ca&d&ca&j&ca&l&ca&n&ca&p&ca&r&ca'j&ca'u&ca'w&ca'z&ca(S&ca(b&ca(o&ca!W&ca&[&ca_&ca&a&ca~O'u,nO~O!V{X!V!_X!W{X!W!_X!a{X!a!_X!h!_X#X{X(O!_X~O!a,sO#X,rO!V#aX!V([X!W#aX!W([X!a([X!h([X(O([X~O!a,uO!h%]O(O%QO!V!ZX!W!ZX~Ol!mO|!nO'wTO'zUO(V!lO~OP9pOQ9pOa;aOb!hOikOk9pOlkOmkOskOu9pOw9pO|WO!QkO!RkO!X!dO!c9sO!hZO!k9pO!l9pO!m9pO!o9tO!q9wO!t!gO$Q!jO$UfO'wTO'zUO(SVO(b[O(o;_O~O'u:fO~P# ^O!V,yO!W(ZX~O!W,{O~O!a,sO#X,rO!V#aX!W#aX~O!V,|O!W(iX~O!W-OO~O!]-PO!^-PO'v!kO~P!N{O!W-SO~P'WOg-VO!X'UO~O!S-[O~Ol!wa![!wa!]!wa!^!wa!|!wa!}!wa#O!wa#P!wa#Q!wa#T!wa#U!wa'v!wa'w!wa'z!wa(V!wa(b!wa~P!#RO!l-aO#X-_O~PBqO!]-cO!^-cO'v!kO~PCaO^%fO#X-_O'l%fO~O^%fO!a#tO#X-_O'l%fO~O^%fO!a#tO!l-aO#X-_O'l%fO(c'fO~O'q'nO'r'nO's-hO~Oo-iO~O!S&}a!V&}a~P!7sO!U-mO!S&}X!V&}X~P%TO!V'zO!S(Ya~O!S(Ya~PGTO!V(RO!S(ga~O|%`O!U-qO!X%aO'u%_O!S'TX!V'TX~O#X-sO!V(ea!g(ea^(ea'l(ea~O!a#tO~P#)dO!V(_O!g(da~O|%`O!X%aO#c-wO'u%_O~Oi-|O|%`O!U-yO!X%aO!x]O#b-{O#c-yO'u%_O!V'WX!g'WX~Oz.QO!h#wO~Og.TO!X'UO%a.SO(O%QO~O^#[i!V#[i'l#[i'j#[i!S#[i!g#[io#[i!X#[i%a#[i!a#[i~P!7sOg;kOy)uO|)vO(j)xO(k)zO~O#d#Wa^#Wa#X#Wa'l#Wa!V#Wa!g#Wa!X#Wa!S#Wa~P#,`O#d(RXP(RXX(RX^(RXk(RXz(RX!e(RX!h(RX!l(RX#g(RX#h(RX#i(RX#j(RX#k(RX#l(RX#m(RX#n(RX#o(RX#q(RX#s(RX#u(RX#v(RX'l(RX(S(RX(c(RX!g(RX!S(RX'j(RXo(RX!X(RX%a(RX!a(RX~P!4QO!V.^Od(]X~P!0dOd.`O~O!V.aO!g(^X~P!7sO!g.dO~O!S.fO~OP$[Oy#xOz#yO|#zO!f#vO!h#wO!l$[O(SVOX#fi^#fik#fi!V#fi!e#fi#h#fi#i#fi#j#fi#k#fi#l#fi#m#fi#n#fi#o#fi#q#fi#s#fi#u#fi#v#fi'l#fi(c#fi(j#fi(k#fi'j#fi!S#fi!g#fio#fi!X#fi%a#fi!a#fi~O#g#fi~P#0[O#g#}O~P#0[OP$[Oy#xOz#yO|#zO!f#vO!h#wO!l$[O#g#}O#h$OO#i$OO#j$OO(SVOX#fi^#fi!V#fi!e#fi#k#fi#l#fi#m#fi#n#fi#o#fi#q#fi#s#fi#u#fi#v#fi'l#fi(c#fi(j#fi(k#fi'j#fi!S#fi!g#fio#fi!X#fi%a#fi!a#fi~Ok#fi~P#2|Ok$PO~P#2|OP$[Ok$POy#xOz#yO|#zO!f#vO!h#wO!l$[O#g#}O#h$OO#i$OO#j$OO#k$QO(SVO^#fi!V#fi#q#fi#s#fi#u#fi#v#fi'l#fi(c#fi(j#fi(k#fi'j#fi!S#fi!g#fio#fi!X#fi%a#fi!a#fi~OX#fi!e#fi#l#fi#m#fi#n#fi#o#fi~P#5nOX$cO!e$RO#l$RO#m$RO#n$bO#o$RO~P#5nOP$[OX$cOk$POy#xOz#yO|#zO!e$RO!f#vO!h#wO!l$[O#g#}O#h$OO#i$OO#j$OO#k$QO#l$RO#m$RO#n$bO#o$RO#q$SO(SVO^#fi!V#fi#s#fi#u#fi#v#fi'l#fi(c#fi(k#fi'j#fi!S#fi!g#fio#fi!X#fi%a#fi!a#fi~O(j#fi~P#8oO(j#{O~P#8oOP$[OX$cOk$POy#xOz#yO|#zO!e$RO!f#vO!h#wO!l$[O#g#}O#h$OO#i$OO#j$OO#k$QO#l$RO#m$RO#n$bO#o$RO#q$SO#s$UO(SVO(j#{O^#fi!V#fi#u#fi#v#fi'l#fi(c#fi'j#fi!S#fi!g#fio#fi!X#fi%a#fi!a#fi~O(k#fi~P#;aO(k#|O~P#;aOP$[OX$cOk$POy#xOz#yO|#zO!e$RO!f#vO!h#wO!l$[O#g#}O#h$OO#i$OO#j$OO#k$QO#l$RO#m$RO#n$bO#o$RO#q$SO#s$UO#u$WO(SVO(j#{O(k#|O~O^#fi!V#fi#v#fi'l#fi(c#fi'j#fi!S#fi!g#fio#fi!X#fi%a#fi!a#fi~P#>ROPYXXYXkYXyYXzYX|YX!eYX!fYX!hYX!lYX#XYX#dcX#gYX#hYX#iYX#jYX#kYX#lYX#mYX#nYX#oYX#qYX#sYX#uYX#vYX#{YX(SYX(cYX(jYX(kYX!VYX!WYX~O#yYX~P#@lOP$[OX:XOk9{Oy#xOz#yO|#zO!e9}O!f#vO!h#wO!l$[O#g9yO#h9zO#i9zO#j9zO#k9|O#l9}O#m9}O#n:WO#o9}O#q:OO#s:QO#u:SO#v:TO(SVO(c$YO(j#{O(k#|O~O#y.hO~P#ByO#X:YO#{:YO#y(XX!W(XX~PN}O^'Za!V'Za'l'Za'j'Za!g'Za!S'Zao'Za!X'Za%a'Za!a'Za~P!7sOP#fiX#fi^#fik#fiz#fi!V#fi!e#fi!f#fi!h#fi!l#fi#g#fi#h#fi#i#fi#j#fi#k#fi#l#fi#m#fi#n#fi#o#fi#q#fi#s#fi#u#fi#v#fi'l#fi(S#fi(c#fi'j#fi!S#fi!g#fio#fi!X#fi%a#fi!a#fi~P#,`O^#zi!V#zi'l#zi'j#zi!S#zi!g#zio#zi!X#zi%a#zi!a#zi~P!7sO$W.mO$Y.mO~O$W.nO$Y.nO~O!a)^O#X.oO!X$^X$T$^X$W$^X$Y$^X$a$^X~O!U.pO~O!X)aO$T.rO$W)`O$Y)`O$a.sO~O!V:UO!W(WX~P#ByO!W.tO~O!a)^O$a(lX~O$a.vO~Oq)pO(T)qO(U.yO~O!S.}O~P!&VO!VcX!acX!gcX!g$sX(ccX~P!/ZO!g/TO~P#,`O!V/UO!a#tO(c'fO!g(pX~O!g/ZO~O!U*RO'u%_O!g(pP~O#d/]O~O!S$sX!V$sX!a$zX~P!/ZO!V/^O!S(qX~P#,`O!a/`O~O!S/bO~Ok/fO!a#tO!h%]O(O%QO(c'fO~O'u/hO~O!a+XO~O^%fO!V/lO'l%fO~O!W/nO~P!3XO!]/oO!^/oO'v!kO(V!lO~O|/qO(V!lO~O#T/rO~O'u&POd'`X!V'`X~O!V*kOd(Pa~Od/wO~Oy/xOz/xO|/yOgva(jva(kva!Vva#Xva~Odva#yva~P$ aOy)uO|)vOg$la(j$la(k$la!V$la#X$la~Od$la#y$la~P$!VOy)uO|)vOg$na(j$na(k$na!V$na#X$na~Od$na#y$na~P$!xO#d/{O~Od$|a!V$|a#X$|a#y$|a~P!0dO!a#tO~O#d0OO~O!V*|O^(ua'l(ua~Oy#xOz#yO|#zO!f#vO!h#wO(SVOP!niX!nik!ni!V!ni!e!ni!l!ni#g!ni#h!ni#i!ni#j!ni#k!ni#l!ni#m!ni#n!ni#o!ni#q!ni#s!ni#u!ni#v!ni(c!ni(j!ni(k!ni~O^!ni'l!ni'j!ni!S!ni!g!nio!ni!X!ni%a!ni!a!ni~P$$gOg.TO!X'UO%a.SO~Oi0YO'u0XO~P!1UO!a+XO^'}a!X'}a'l'}a!V'}a~O#d0`O~OXYX!VcX!WcX~O!V0aO!W(yX~O!W0cO~OX0dO~O'u+aO'wTO'zUO~O!X%vO'u%_O]'hX!V'hX~O!V+fO](xa~O!g0iO~P!7sOX0lO~O]0mO~O#X0pO~Og0sO!X${O~O(V(sO!W(vP~Og0|O!X0yO%a0{O(O%QO~OX1WO!V1UO!W(wX~O!W1XO~O]1ZO^%fO'l%fO~O'u#lO'wTO'zUO~O#X$dO#{$dOP(XXX(XXk(XXy(XXz(XX|(XX!V(XX!e(XX!h(XX!l(XX#g(XX#h(XX#i(XX#j(XX#k(XX#l(XX#m(XX#n(XX#q(XX#s(XX#u(XX#v(XX(S(XX(c(XX(j(XX(k(XX~O#o1^O&R1_O^(XX!f(XX~P$+]O#X$dO#o1^O&R1_O~O^1aO~P%TO^1cO~O&[1fOP&YiQ&YiV&Yi^&Yia&Yib&Yii&Yik&Yil&Yim&Yis&Yiu&Yiw&Yi|&Yi!Q&Yi!R&Yi!X&Yi!c&Yi!h&Yi!k&Yi!l&Yi!m&Yi!o&Yi!q&Yi!t&Yi!x&Yi#p&Yi$Q&Yi$U&Yi%`&Yi%b&Yi%d&Yi%e&Yi%f&Yi%i&Yi%k&Yi%n&Yi%o&Yi%q&Yi%}&Yi&T&Yi&V&Yi&X&Yi&Z&Yi&^&Yi&d&Yi&j&Yi&l&Yi&n&Yi&p&Yi&r&Yi'j&Yi'u&Yi'w&Yi'z&Yi(S&Yi(b&Yi(o&Yi!W&Yi_&Yi&a&Yi~O_1lO!W1jO&a1kO~P`O!XXO!h1nO~O&h,iOP&ciQ&ciV&ci^&cia&cib&cii&cik&cil&cim&cis&ciu&ciw&ci|&ci!Q&ci!R&ci!X&ci!c&ci!h&ci!k&ci!l&ci!m&ci!o&ci!q&ci!t&ci!x&ci#p&ci$Q&ci$U&ci%`&ci%b&ci%d&ci%e&ci%f&ci%i&ci%k&ci%n&ci%o&ci%q&ci%}&ci&T&ci&V&ci&X&ci&Z&ci&^&ci&d&ci&j&ci&l&ci&n&ci&p&ci&r&ci'j&ci'u&ci'w&ci'z&ci(S&ci(b&ci(o&ci!W&ci&[&ci_&ci&a&ci~O!S1tO~O!V!Za!W!Za~P#ByOl!mO|!nO!U1zO(V!lO!V'OX!W'OX~P?wO!V,yO!W(Za~O!V'UX!W'UX~P!6{O!V,|O!W(ia~O!W2RO~P'WO^%fO#X2[O'l%fO~O^%fO!a#tO#X2[O'l%fO~O^%fO!a#tO!l2`O#X2[O'l%fO(c'fO~O^%fO'l%fO~P!7sO!V$`Oo$ka~O!S&}i!V&}i~P!7sO!V'zO!S(Yi~O!V(RO!S(gi~O!S(hi!V(hi~P!7sO!V(ei!g(ei^(ei'l(ei~P!7sO#X2bO!V(ei!g(ei^(ei'l(ei~O!V(_O!g(di~O|%`O!X%aO!x]O#b2gO#c2fO'u%_O~O|%`O!X%aO#c2fO'u%_O~Og2nO!X'UO%a2mO~Og2nO!X'UO%a2mO(O%QO~O#dvaPvaXva^vakva!eva!fva!hva!lva#gva#hva#iva#jva#kva#lva#mva#nva#ova#qva#sva#uva#vva'lva(Sva(cva!gva!Sva'jvaova!Xva%ava!ava~P$ aO#d$laP$laX$la^$lak$laz$la!e$la!f$la!h$la!l$la#g$la#h$la#i$la#j$la#k$la#l$la#m$la#n$la#o$la#q$la#s$la#u$la#v$la'l$la(S$la(c$la!g$la!S$la'j$lao$la!X$la%a$la!a$la~P$!VO#d$naP$naX$na^$nak$naz$na!e$na!f$na!h$na!l$na#g$na#h$na#i$na#j$na#k$na#l$na#m$na#n$na#o$na#q$na#s$na#u$na#v$na'l$na(S$na(c$na!g$na!S$na'j$nao$na!X$na%a$na!a$na~P$!xO#d$|aP$|aX$|a^$|ak$|az$|a!V$|a!e$|a!f$|a!h$|a!l$|a#g$|a#h$|a#i$|a#j$|a#k$|a#l$|a#m$|a#n$|a#o$|a#q$|a#s$|a#u$|a#v$|a'l$|a(S$|a(c$|a!g$|a!S$|a'j$|a#X$|ao$|a!X$|a%a$|a!a$|a~P#,`O^#[q!V#[q'l#[q'j#[q!S#[q!g#[qo#[q!X#[q%a#[q!a#[q~P!7sOd'PX!V'PX~P!'oO!V.^Od(]a~O!U2vO!V'QX!g'QX~P%TO!V.aO!g(^a~O!V.aO!g(^a~P!7sO!S2yO~O#y!ja!W!ja~PJqO#y!ba!V!ba!W!ba~P#ByO#y!na!W!na~P!:^O#y!pa!W!pa~P!<wO!X3]O$UfO$_3^O~O!W3bO~Oo3cO~P#,`O^$hq!V$hq'l$hq'j$hq!S$hq!g$hqo$hq!X$hq%a$hq!a$hq~P!7sO!S3dO~P#,`Oy)uO|)vO(k)zOg%Xi(j%Xi!V%Xi#X%Xi~Od%Xi#y%Xi~P$IuOy)uO|)vOg%Zi(j%Zi(k%Zi!V%Zi#X%Zi~Od%Zi#y%Zi~P$JhO(c$YO~P#,`O!U3gO'u%_O!V'[X!g'[X~O!V/UO!g(pa~O!V/UO!a#tO!g(pa~O!V/UO!a#tO(c'fO!g(pa~Od$ui!V$ui#X$ui#y$ui~P!0dO!U3oO'u*WO!S'^X!V'^X~P!1RO!V/^O!S(qa~O!V/^O!S(qa~P#,`O!a#tO#o3wO~Ok3zO!a#tO(c'fO~Od(Qi!V(Qi~P!0dO#X3}Od(Qi!V(Qi~P!0dO!g4QO~O^$iq!V$iq'l$iq'j$iq!S$iq!g$iqo$iq!X$iq%a$iq!a$iq~P!7sO!S4UO~O!V4VO!X(rX~P#,`O!f#vO~P4QO^$sX!X$sX%UYX'l$sX!V$sX~P!/ZO%U4XO^hXghXyhX|hX!XhX'lhX(jhX(khX!VhX~O%U4XO~O%b4`O'u+aO'wTO'zUO!V'gX!W'gX~O!V0aO!W(ya~OX4dO~O]4eO~O^%fO'l%fO~P#,`O!X${O~P#,`O!V4mO#X4oO!W(vX~O!W4pO~Ol!mO|4qO![!wO!]!tO!^!tO!x9qO!|!oO!}!oO#O!oO#P!oO#Q!oO#T4vO#U!xO'v!kO'wTO'zUO(V!lO(b!rO~O!W4uO~P%$gOg4{O!X0yO%a4zO~Og4{O!X0yO%a4zO(O%QO~O'u#lO!V'fX!W'fX~O!V1UO!W(wa~O'wTO'zUO(V5UO~O]5YO~O#o5]O&R5^O~PMaO!g5_O~P%TO^5aO~O^5aO~P%TO_1lO!W5fO&a1kO~P`O!a5hO~O!a5jO!V([i!W([i!a([i!h([i(O([i~O!V#ai!W#ai~P#ByO#X5kO!V#ai!W#ai~O!V!Zi!W!Zi~P#ByO^%fO#X5tO'l%fO~O^%fO!a#tO#X5tO'l%fO~O!V(eq!g(eq^(eq'l(eq~P!7sO!V(_O!g(dq~O|%`O!X%aO#c5{O'u%_O~O!X'UO%a6OO~Og6RO!X'UO%a6OO~O#d%XiP%XiX%Xi^%Xik%Xiz%Xi!e%Xi!f%Xi!h%Xi!l%Xi#g%Xi#h%Xi#i%Xi#j%Xi#k%Xi#l%Xi#m%Xi#n%Xi#o%Xi#q%Xi#s%Xi#u%Xi#v%Xi'l%Xi(S%Xi(c%Xi!g%Xi!S%Xi'j%Xio%Xi!X%Xi%a%Xi!a%Xi~P$IuO#d%ZiP%ZiX%Zi^%Zik%Ziz%Zi!e%Zi!f%Zi!h%Zi!l%Zi#g%Zi#h%Zi#i%Zi#j%Zi#k%Zi#l%Zi#m%Zi#n%Zi#o%Zi#q%Zi#s%Zi#u%Zi#v%Zi'l%Zi(S%Zi(c%Zi!g%Zi!S%Zi'j%Zio%Zi!X%Zi%a%Zi!a%Zi~P$JhO#d$uiP$uiX$ui^$uik$uiz$ui!V$ui!e$ui!f$ui!h$ui!l$ui#g$ui#h$ui#i$ui#j$ui#k$ui#l$ui#m$ui#n$ui#o$ui#q$ui#s$ui#u$ui#v$ui'l$ui(S$ui(c$ui!g$ui!S$ui'j$ui#X$uio$ui!X$ui%a$ui!a$ui~P#,`Od'Pa!V'Pa~P!0dO!V'Qa!g'Qa~P!7sO!V.aO!g(^i~O#y#[i!V#[i!W#[i~P#ByOP$[Oy#xOz#yO|#zO!f#vO!h#wO!l$[O(SVOX#fik#fi!e#fi#h#fi#i#fi#j#fi#k#fi#l#fi#m#fi#n#fi#o#fi#q#fi#s#fi#u#fi#v#fi#y#fi(c#fi(j#fi(k#fi!V#fi!W#fi~O#g#fi~P%2vO#g9yO~P%2vOP$[Oy#xOz#yO|#zO!f#vO!h#wO!l$[O#g9yO#h9zO#i9zO#j9zO(SVOX#fi!e#fi#k#fi#l#fi#m#fi#n#fi#o#fi#q#fi#s#fi#u#fi#v#fi#y#fi(c#fi(j#fi(k#fi!V#fi!W#fi~Ok#fi~P%5ROk9{O~P%5ROP$[Ok9{Oy#xOz#yO|#zO!f#vO!h#wO!l$[O#g9yO#h9zO#i9zO#j9zO#k9|O(SVO#q#fi#s#fi#u#fi#v#fi#y#fi(c#fi(j#fi(k#fi!V#fi!W#fi~OX#fi!e#fi#l#fi#m#fi#n#fi#o#fi~P%7^OX:XO!e9}O#l9}O#m9}O#n:WO#o9}O~P%7^OP$[OX:XOk9{Oy#xOz#yO|#zO!e9}O!f#vO!h#wO!l$[O#g9yO#h9zO#i9zO#j9zO#k9|O#l9}O#m9}O#n:WO#o9}O#q:OO(SVO#s#fi#u#fi#v#fi#y#fi(c#fi(k#fi!V#fi!W#fi~O(j#fi~P%9xO(j#{O~P%9xOP$[OX:XOk9{Oy#xOz#yO|#zO!e9}O!f#vO!h#wO!l$[O#g9yO#h9zO#i9zO#j9zO#k9|O#l9}O#m9}O#n:WO#o9}O#q:OO#s:QO(SVO(j#{O#u#fi#v#fi#y#fi(c#fi!V#fi!W#fi~O(k#fi~P%<TO(k#|O~P%<TOP$[OX:XOk9{Oy#xOz#yO|#zO!e9}O!f#vO!h#wO!l$[O#g9yO#h9zO#i9zO#j9zO#k9|O#l9}O#m9}O#n:WO#o9}O#q:OO#s:QO#u:SO(SVO(j#{O(k#|O~O#v#fi#y#fi(c#fi!V#fi!W#fi~P%>`O^#wy!V#wy'l#wy'j#wy!S#wy!g#wyo#wy!X#wy%a#wy!a#wy~P!7sOg;lOy)uO|)vO(j)xO(k)zO~OP#fiX#fik#fiz#fi!e#fi!f#fi!h#fi!l#fi#g#fi#h#fi#i#fi#j#fi#k#fi#l#fi#m#fi#n#fi#o#fi#q#fi#s#fi#u#fi#v#fi#y#fi(S#fi(c#fi!V#fi!W#fi~P%AWO!f#vOP(RXX(RXg(RXk(RXy(RXz(RX|(RX!e(RX!h(RX!l(RX#g(RX#h(RX#i(RX#j(RX#k(RX#l(RX#m(RX#n(RX#o(RX#q(RX#s(RX#u(RX#v(RX#y(RX(S(RX(c(RX(j(RX(k(RX!V(RX!W(RX~O#y#zi!V#zi!W#zi~P#ByO#y!ni!W!ni~P$$gO!W6_O~O!V'Za!W'Za~P#ByO!a#tO(c'fO!V'[a!g'[a~O!V/UO!g(pi~O!V/UO!a#tO!g(pi~Od$uq!V$uq#X$uq#y$uq~P!0dO!S'^a!V'^a~P#,`O!a6fO~O!V/^O!S(qi~P#,`O!V/^O!S(qi~O!S6jO~O!a#tO#o6oO~Ok6pO!a#tO(c'fO~O!S6rO~Od$wq!V$wq#X$wq#y$wq~P!0dO^$iy!V$iy'l$iy'j$iy!S$iy!g$iyo$iy!X$iy%a$iy!a$iy~P!7sO!a5jO~O!V4VO!X(ra~O^#[y!V#[y'l#[y'j#[y!S#[y!g#[yo#[y!X#[y%a#[y!a#[y~P!7sOX6wO~O!V0aO!W(yi~O]6}O~O(V(sO!V'cX!W'cX~O!V4mO!W(va~OikO'u7UO~P.bO!W7XO~P%$gOl!mO|7YO'wTO'zUO(V!lO(b!rO~O!X0yO~O!X0yO%a7[O~Og7_O!X0yO%a7[O~OX7dO!V'fa!W'fa~O!V1UO!W(wi~O!g7hO~O!g7iO~O!g7lO~O!g7lO~P%TO^7nO~O!a7oO~O!g7pO~O!V(hi!W(hi~P#ByO^%fO#X7xO'l%fO~O!V(ey!g(ey^(ey'l(ey~P!7sO!V(_O!g(dy~O!X'UO%a7{O~O#d$uqP$uqX$uq^$uqk$uqz$uq!V$uq!e$uq!f$uq!h$uq!l$uq#g$uq#h$uq#i$uq#j$uq#k$uq#l$uq#m$uq#n$uq#o$uq#q$uq#s$uq#u$uq#v$uq'l$uq(S$uq(c$uq!g$uq!S$uq'j$uq#X$uqo$uq!X$uq%a$uq!a$uq~P#,`O#d$wqP$wqX$wq^$wqk$wqz$wq!V$wq!e$wq!f$wq!h$wq!l$wq#g$wq#h$wq#i$wq#j$wq#k$wq#l$wq#m$wq#n$wq#o$wq#q$wq#s$wq#u$wq#v$wq'l$wq(S$wq(c$wq!g$wq!S$wq'j$wq#X$wqo$wq!X$wq%a$wq!a$wq~P#,`O!V'Qi!g'Qi~P!7sO#y#[q!V#[q!W#[q~P#ByOy/xOz/xO|/yOPvaXvagvakva!eva!fva!hva!lva#gva#hva#iva#jva#kva#lva#mva#nva#ova#qva#sva#uva#vva#yva(Sva(cva(jva(kva!Vva!Wva~Oy)uO|)vOP$laX$lag$lak$laz$la!e$la!f$la!h$la!l$la#g$la#h$la#i$la#j$la#k$la#l$la#m$la#n$la#o$la#q$la#s$la#u$la#v$la#y$la(S$la(c$la(j$la(k$la!V$la!W$la~Oy)uO|)vOP$naX$nag$nak$naz$na!e$na!f$na!h$na!l$na#g$na#h$na#i$na#j$na#k$na#l$na#m$na#n$na#o$na#q$na#s$na#u$na#v$na#y$na(S$na(c$na(j$na(k$na!V$na!W$na~OP$|aX$|ak$|az$|a!e$|a!f$|a!h$|a!l$|a#g$|a#h$|a#i$|a#j$|a#k$|a#l$|a#m$|a#n$|a#o$|a#q$|a#s$|a#u$|a#v$|a#y$|a(S$|a(c$|a!V$|a!W$|a~P%AWO#y$hq!V$hq!W$hq~P#ByO#y$iq!V$iq!W$iq~P#ByO!W8VO~O#y8WO~P!0dO!a#tO!V'[i!g'[i~O!a#tO(c'fO!V'[i!g'[i~O!V/UO!g(pq~O!S'^i!V'^i~P#,`O!V/^O!S(qq~O!S8^O~P#,`O!S8^O~Od(Qy!V(Qy~P!0dO!V'aa!X'aa~P#,`O^%Tq!X%Tq'l%Tq!V%Tq~P#,`OX8cO~O!V0aO!W(yq~O#X8gO!V'ca!W'ca~O!V4mO!W(vi~P#ByOPYXXYXkYXyYXzYX|YX!SYX!VYX!eYX!fYX!hYX!lYX#XYX#dcX#gYX#hYX#iYX#jYX#kYX#lYX#mYX#nYX#oYX#qYX#sYX#uYX#vYX#{YX(SYX(cYX(jYX(kYX~O!a%RX#o%RX~P&2WO!X0yO%a8kO~O'wTO'zUO(V8pO~O!V1UO!W(wq~O!g8sO~O!g8tO~O!g8uO~O!g8uO~P%TO#X8xO!V#ay!W#ay~O!V#ay!W#ay~P#ByO!X'UO%a8}O~O#y#wy!V#wy!W#wy~P#ByOP$uiX$uik$uiz$ui!e$ui!f$ui!h$ui!l$ui#g$ui#h$ui#i$ui#j$ui#k$ui#l$ui#m$ui#n$ui#o$ui#q$ui#s$ui#u$ui#v$ui#y$ui(S$ui(c$ui!V$ui!W$ui~P%AWOy)uO|)vO(k)zOP%XiX%Xig%Xik%Xiz%Xi!e%Xi!f%Xi!h%Xi!l%Xi#g%Xi#h%Xi#i%Xi#j%Xi#k%Xi#l%Xi#m%Xi#n%Xi#o%Xi#q%Xi#s%Xi#u%Xi#v%Xi#y%Xi(S%Xi(c%Xi(j%Xi!V%Xi!W%Xi~Oy)uO|)vOP%ZiX%Zig%Zik%Ziz%Zi!e%Zi!f%Zi!h%Zi!l%Zi#g%Zi#h%Zi#i%Zi#j%Zi#k%Zi#l%Zi#m%Zi#n%Zi#o%Zi#q%Zi#s%Zi#u%Zi#v%Zi#y%Zi(S%Zi(c%Zi(j%Zi(k%Zi!V%Zi!W%Zi~O#y$iy!V$iy!W$iy~P#ByO#y#[y!V#[y!W#[y~P#ByO!a#tO!V'[q!g'[q~O!V/UO!g(py~O!S'^q!V'^q~P#,`O!S9UO~P#,`O!V0aO!W(yy~O!V4mO!W(vq~O!X0yO%a9]O~O!g9`O~O!X'UO%a9eO~OP$uqX$uqk$uqz$uq!e$uq!f$uq!h$uq!l$uq#g$uq#h$uq#i$uq#j$uq#k$uq#l$uq#m$uq#n$uq#o$uq#q$uq#s$uq#u$uq#v$uq#y$uq(S$uq(c$uq!V$uq!W$uq~P%AWOP$wqX$wqk$wqz$wq!e$wq!f$wq!h$wq!l$wq#g$wq#h$wq#i$wq#j$wq#k$wq#l$wq#m$wq#n$wq#o$wq#q$wq#s$wq#u$wq#v$wq#y$wq(S$wq(c$wq!V$wq!W$wq~P%AWOd%]!Z!V%]!Z#X%]!Z#y%]!Z~P!0dO!V'cq!W'cq~P#ByO!V#a!Z!W#a!Z~P#ByO#d%]!ZP%]!ZX%]!Z^%]!Zk%]!Zz%]!Z!V%]!Z!e%]!Z!f%]!Z!h%]!Z!l%]!Z#g%]!Z#h%]!Z#i%]!Z#j%]!Z#k%]!Z#l%]!Z#m%]!Z#n%]!Z#o%]!Z#q%]!Z#s%]!Z#u%]!Z#v%]!Z'l%]!Z(S%]!Z(c%]!Z!g%]!Z!S%]!Z'j%]!Z#X%]!Zo%]!Z!X%]!Z%a%]!Z!a%]!Z~P#,`OP%]!ZX%]!Zk%]!Zz%]!Z!e%]!Z!f%]!Z!h%]!Z!l%]!Z#g%]!Z#h%]!Z#i%]!Z#j%]!Z#k%]!Z#l%]!Z#m%]!Z#n%]!Z#o%]!Z#q%]!Z#s%]!Z#u%]!Z#v%]!Z#y%]!Z(S%]!Z(c%]!Z!V%]!Z!W%]!Z~P%AWOo(WX~P1jO'v!kO~P!){O!ScX!VcX#XcX~P&2WOPYXXYXkYXyYXzYX|YX!VYX!VcX!eYX!fYX!hYX!lYX#XYX#XcX#dcX#gYX#hYX#iYX#jYX#kYX#lYX#mYX#nYX#oYX#qYX#sYX#uYX#vYX#{YX(SYX(cYX(jYX(kYX~O!acX!gYX!gcX(ccX~P&GnOP9pOQ9pOa;aOb!hOikOk9pOlkOmkOskOu9pOw9pO|WO!QkO!RkO!XXO!c9sO!hZO!k9pO!l9pO!m9pO!o9tO!q9wO!t!gO$Q!jO$UfO'u)TO'wTO'zUO(SVO(b[O(o;_O~O!V:UO!W$ka~Oi%ROk$sOl$rOm$rOs%SOu%TOw:[O|$zO!X${O!c;fO!h$wO#c:bO$Q%XO$m:^O$o:`O$r%YO'u(kO'wTO'zUO(O%QO(S$tO~O#p)[O~P&LdO!WYX!WcX~P&GnO#d9xO~O!a#tO#d9xO~O#X:YO~O#o9}O~O#X:dO!V(hX!W(hX~O#X:YO!V(fX!W(fX~O#d:eO~Od:gO~P!0dO#d:lO~O#d:mO~O!a#tO#d:nO~O!a#tO#d:eO~O#y:oO~P#ByO#d:pO~O#d:qO~O#d:rO~O#d:sO~O#d:tO~O#d:uO~O#y:vO~P!0dO#y:wO~P!0dO$U~!f!|!}#P#Q#T#b#c#n(o$m$o$r%U%`%a%b%i%k%n%o%q%s~'pR$U(o#h!R'n'v#il#g#jky'o(V'o'u$W$Y$W~",
  goto: "$&a(}PPPP)OP)RP)cP*r.uPPPP5UPP5kP;f>mP?QP?QPPP?QP@rP?QP?QP?QP@vPP@{PAfPF]PPPFaPPPPFaIaPPPIgJbPFaPLoPPPPN}FaPPPFaPFaP!#]FaP!&p!'r!'{P!(n!(r!(nPPPPP!+|!'rPP!,j!-dP!0WFaFa!0]!3f!7z!7z!;oPPP!;vFaPPPPPPPPPPP!?SP!@ePPFa!ArPFaPFaFaFaFaPFa!CUPP!F]P!I`P!Id!In!Ir!IrP!FYP!Iv!IvP!LyP!L}FaFa!MT#!V?QP?QP?Q?QP##a?Q?Q#%]?Q#'l?Q#)b?Q?Q#*O#+|#+|#,Q#,Y#+|#,bP#+|P?Q#,z?Q#.T?Q?Q5UPPP#/aPPP#/y#/yP#/yP#0`#/yPP#0fP#0]P#0]#0x#0]#1d#1j5R)R#1m)RP#1t#1t#1tP)RP)RP)RP)RPP)RP#1z#1}P#1})RP#2RP#2UP)RP)RP)RP)RP)RP)R)RPP#2[#2b#2l#2r#2x#3O#3U#3d#3j#3p#3z#4Q#4[#4k#4q#5b#5t#5z#6Q#6`#6u#8W#8f#8l#8r#8x#9O#9Y#9`#9f#9p#:S#:YPPPPPPPPPP#:`PPPPPPP#;S#>ZP#?j#?q#?yPPPP#DX#F}#Me#Mh#Mk#Nd#Ng#Nj#Nq#NyPP$ P$ T$ {$!z$#O$#dPP$#h$#n$#rP$#u$#y$#|$$r$%Y$%p$%t$%w$%z$&Q$&T$&X$&]R!zRmqOXs!Y#b%e&h&j&k&m,a,f1f1iY!tQ'U-R0y4tQ%kuQ%sxQ%z{Q&`!US&|!d,yQ'[!hS'b!q!wS*^${*cQ+_%tQ+l%|Q,Q&YQ-P'TQ-Z']Q-c'cQ/o*eQ1T,RR:c9t$|dOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$`$d%e%k%x&a&d&h&j&k&m&q&y'W'h'x'z(Q(X(m(q(u)t*w*{,^,a,f-V-_-m-s.a.h/y0O0`0|1^1_1a1c1f1i1k2[2b2v4q4{5]5^5a5t7Y7_7n7xS#o]9q!r)V$Z$l&})i,r,u.p1z3]4o5k8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bQ*n%UQ+d%vQ,S&]Q,Z&eQ.W:ZQ0V+VQ0Z+XQ0f+eQ1],XQ2j.TQ4_0aQ5S1UQ6Q2nQ6W:[Q6y4`R8O6R&zkOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$Z$`$d$l%e%k%x&a&d&e&h&j&k&m&q&y&}'W'h'x'z(Q(X(m(q(u)i)t*w*{+V,^,a,f,r,u-V-_-m-s.T.a.h.p/y0O0`0|1^1_1a1c1f1i1k1z2[2b2n2v3]4o4q4{5]5^5a5k5t6R7Y7_7n7x8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bt!mQ!q!t!w!x&|'T'U'b'c'd,y-P-R-c0y4t4v$^$ri#t#v$b$c$w$z%V%W%[)p)v)y){)|*T*Z*i*j+U+X+p+s.S.^/O/]/^/`/{0p0s0{2m3e3o3w3}4V4X4z6O6f6o7[7{8W8k8}9]9e:W:X:]:^:_:`:a:b:h:i:j:k:l:m:p:q:r:s:v:w;_;g;h;k;lQ%}{Q&z!dS'Q%a,|Q+d%vQ/z*rQ0f+eQ0k+kQ1[,WQ1],XQ4_0aQ4h0mQ5V1WQ5W1ZQ6y4`Q6|4eQ7g5YQ8f6}R8q7dpnOXs!U!Y#b%e&_&h&j&k&m,a,f1f1iR,U&a&t^OPXYstuvy!Y!_!f!i!n#Q#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$Z$`$d$l%e%k%x&a&d&e&h&j&k&m&q&y'W'h'z(Q(X(m(q(u)i)t*w*{+V,^,a,f,r,u-V-_-m-s.T.a.h.p/y0O0`0|1^1_1a1c1f1i1k1z2[2b2n2v3]4o4q4{5]5^5a5k5t6R7Y7_7n7x8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;a;b[#ZWZ#U#X&}'x!S%bm#f#g#j%]%`(R(](^(_*y*z*|,],s-q-w-x-y-{1n2f2g5j5{Q%nwQ%rxS%w{%|Q&T!SQ'X!gQ'Z!hQ(f#qS*Q$w*US+^%s%tQ+b%vQ+{&WQ,P&YS-Y'[']Q.V(gQ/Y*RQ0_+_Q0e+eQ0g+fQ0j+jQ1O+|S1S,Q,RQ2W-ZQ3f/UQ4^0aQ4b0dQ4g0lQ5R1TQ6c3gQ6x4`Q6{4dQ8b6wR9W8cv$yi#v%V%W%[)y){*T*i*j.^/]/{3e3}8W;_;g;h!S%px!h!s%r%s%t&{'Z'[']'a'k*]+^+_,v-Y-Z-b/g0_2P2W2_3yQ+W%nQ+q&QQ+t&RQ,O&YQ.U(fQ0}+{U1R,P,Q,RQ2o.VQ4|1OS5Q1S1TQ7c5R#O;c#t$b$c$w$z)p)v)|*Z+U+X+p+s.S/O/^/`0p0s0{2m3o3w4V4X4z6O6f6o7[7{8k8}9]9e:]:_:a:h:j:l:p:r:v;k;lg;d:W:X:^:`:b:i:k:m:q:s:wW%Oi%Q*k;_S&Q!P&_Q&R!QQ&S!RR+o&O$_$}i#t#v$b$c$w$z%V%W%[)p)v)y){)|*T*Z*i*j+U+X+p+s.S.^/O/]/^/`/{0p0s0{2m3e3o3w3}4V4X4z6O6f6o7[7{8W8k8}9]9e:W:X:]:^:_:`:a:b:h:i:j:k:l:m:p:q:r:s:v:w;_;g;h;k;lT)q$t)rV*o%U:Z:[U'Q!d%a,|S(t#x#yQ+i%yS.O(b(cQ0t+uQ4O/xR7R4m&zkOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$Z$`$d$l%e%k%x&a&d&e&h&j&k&m&q&y&}'W'h'x'z(Q(X(m(q(u)i)t*w*{+V,^,a,f,r,u-V-_-m-s.T.a.h.p/y0O0`0|1^1_1a1c1f1i1k1z2[2b2n2v3]4o4q4{5]5^5a5k5t6R7Y7_7n7x8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;b$i$_c#W#c%i%j%l'w'}(i(p(x(y(z({(|(})O)P)Q)R)S)U)X)])g+S+h,w-f-k-p-r.].c.g.i.j.k.z/|1u1x2Y2a2u2z2{2|2}3O3P3Q3R3S3T3U3V3W3Z3[3a4S4[5m5s5x6U6V6[6]7T7r7v8P8T8U8z9Y9a9r;UT#RV#S&{kOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$Z$`$d$l%e%k%x&a&d&e&h&j&k&m&q&y&}'W'h'x'z(Q(X(m(q(u)i)t*w*{+V,^,a,f,r,u-V-_-m-s.T.a.h.p/y0O0`0|1^1_1a1c1f1i1k1z2[2b2n2v3]4o4q4{5]5^5a5k5t6R7Y7_7n7x8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bQ'O!dR1{,yv!mQ!d!q!t!w!x&|'T'U'b'c'd,y-P-R-c0y4t4vS*]${*cS/g*^*eQ/p*fQ0v+wQ3y/oR3|/rlqOXs!Y#b%e&h&j&k&m,a,f1f1iQ&o!]Q'l!vS(h#s9xQ+[%qQ+y&TQ+z&VQ-W'YQ-e'eS.[(m:eS/}*w:nQ0]+]Q0x+xQ1m,hQ1o,iQ1w,tQ2U-XQ2X-]S4T0O:tQ4Y0^S4]0`:uQ5l1yQ5p2VQ5u2^Q6v4ZQ7s5nQ7t5qQ7w5vR8w7p$d$^c#W#c%j%l'w'}(i(p(x(y(z({(|(})O)P)Q)R)S)U)X)])g+S+h,w-f-k-p-r.].c.g.j.k.z/|1u1x2Y2a2u2z2{2|2}3O3P3Q3R3S3T3U3V3W3Z3[3a4S4[5m5s5x6U6V6[6]7T7r7v8P8T8U8z9Y9a9r;US(e#n'_U*h$|(l3YS+R%i.iQ2k0VQ5}2jQ7}6QR9O8O$d$]c#W#c%j%l'w'}(i(p(x(y(z({(|(})O)P)Q)R)S)U)X)])g+S+h,w-f-k-p-r.].c.g.j.k.z/|1u1x2Y2a2u2z2{2|2}3O3P3Q3R3S3T3U3V3W3Z3[3a4S4[5m5s5x6U6V6[6]7T7r7v8P8T8U8z9Y9a9r;US(d#n'_S(v#y$^S+Q%i.iS.P(c(eQ.l)WQ0S+RR2h.Q&zkOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$Z$`$d$l%e%k%x&a&d&e&h&j&k&m&q&y&}'W'h'x'z(Q(X(m(q(u)i)t*w*{+V,^,a,f,r,u-V-_-m-s.T.a.h.p/y0O0`0|1^1_1a1c1f1i1k1z2[2b2n2v3]4o4q4{5]5^5a5k5t6R7Y7_7n7x8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bS#o]9qQ&j!WQ&k!XQ&m!ZQ&n![R1e,dQ'V!gQ+T%nQ-U'XS.R(f+WQ2S-TW2l.U.V0U0WQ5o2TU5|2i2k2oS7z5}6PS8|7|7}S9c8{9OQ9k9dR9n9lU!uQ'U-RT4r0y4t!O_OXZ`s!U!Y#b#f%]%e&_&a&h&j&k&m(_,a,f-x1f1i]!oQ!q'U-R0y4tT#o]9q%WzOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$`$d%e%k%x&a&d&e&h&j&k&m&q&y'W'h'x'z(Q(X(m(q(u)t*w*{+V,^,a,f-V-_-m-s.T.a.h/y0O0`0|1^1_1a1c1f1i1k2[2b2n2v4q4{5]5^5a5t6R7Y7_7n7xS(t#x#yS.O(b(c!s:{$Z$l&})i,r,u.p1z3]4o5k8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bY!sQ'U-R0y4tQ'a!qS'k!t!wS'm!x4vS-b'b'cQ-d'dR2_-cQ'j!sS(Z#e1`S-a'a'mQ/X*QQ/e*]Q2`-dQ3k/YS3t/f/pQ6b3fS6m3z3|Q8Y6cR8a6pQ#ubQ'i!sS(Y#e1`S([#k*vQ*x%^Q+Y%oQ+`%uU-`'a'j'mQ-t(ZQ/W*QQ/d*]Q/j*`Q0[+ZQ1P+}S2]-a-dQ2e-|S3j/X/YS3s/e/pQ3v/iQ3x/kQ5O1QQ5w2`Q6a3fQ6e3kS6i3t3|Q6n3{Q7a5PS8X6b6cQ8]6jQ8_6mQ8n7bQ9S8YQ9T8^Q9V8aQ9_8oQ9g9UQ;O:yQ;Z;SR;[;TV!uQ'U-R%WaOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$`$d%e%k%x&a&d&e&h&j&k&m&q&y'W'h'x'z(Q(X(m(q(u)t*w*{+V,^,a,f-V-_-m-s.T.a.h/y0O0`0|1^1_1a1c1f1i1k2[2b2n2v4q4{5]5^5a5t6R7Y7_7n7xS#uy!i!r:x$Z$l&})i,r,u.p1z3]4o5k8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bR;O;a%WbOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$`$d%e%k%x&a&d&e&h&j&k&m&q&y'W'h'x'z(Q(X(m(q(u)t*w*{+V,^,a,f-V-_-m-s.T.a.h/y0O0`0|1^1_1a1c1f1i1k2[2b2n2v4q4{5]5^5a5t6R7Y7_7n7xQ%^j!S%ox!h!s%r%s%t&{'Z'[']'a'k*]+^+_,v-Y-Z-b/g0_2P2W2_3yS%uy!iQ+Z%pQ+}&YW1Q,O,P,Q,RU5P1R1S1TS7b5Q5RQ8o7c!r:y$Z$l&})i,r,u.p1z3]4o5k8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bQ;S;`R;T;a$zeOPXYstuv!Y!_!f!n#Q#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$`$d%e%k%x&a&d&h&j&k&m&q&y'W'h'z(Q(X(m(q(u)t*w*{+V,^,a,f-V-_-m-s.T.a.h/y0O0`0|1^1_1a1c1f1i1k2[2b2n2v4q4{5]5^5a5t6R7Y7_7n7xY#`WZ#U#X'x!S%bm#f#g#j%]%`(R(](^(_*y*z*|,],s-q-w-x-y-{1n2f2g5j5{Q,[&e!p:z$Z$l)i,r,u.p1z3]4o5k8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bR:}&}S'R!d%aR1},|$|dOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$`$d%e%k%x&a&d&h&j&k&m&q&y'W'h'x'z(Q(X(m(q(u)t*w*{,^,a,f-V-_-m-s.a.h/y0O0`0|1^1_1a1c1f1i1k2[2b2v4q4{5]5^5a5t7Y7_7n7x!r)V$Z$l&})i,r,u.p1z3]4o5k8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bQ,Z&eQ0V+VQ2j.TQ6Q2nR8O6R!f$Tc#W%i'w'}(i(p)P)Q)R)S)X)]+h-f-k-p-r.].c.z/|2Y2a2u3W4S4[5s5x6U7v8z9r!T:P)U)g,w.i1u1x2z3S3T3U3V3Z3a5m6V6[6]7T7r8P8T8U9Y9a;U!b$Vc#W%i'w'}(i(p)R)S)X)]+h-f-k-p-r.].c.z/|2Y2a2u3W4S4[5s5x6U7v8z9r!P:R)U)g,w.i1u1x2z3U3V3Z3a5m6V6[6]7T7r8P8T8U9Y9a;U!^$Zc#W%i'w'}(i(p)X)]+h-f-k-p-r.].c.z/|2Y2a2u3W4S4[5s5x6U7v8z9rQ3e/Sz;b)U)g,w.i1u1x2z3Z3a5m6V6[6]7T7r8P8T8U9Y9a;UQ;g;iR;h;j&zkOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$Z$`$d$l%e%k%x&a&d&e&h&j&k&m&q&y&}'W'h'x'z(Q(X(m(q(u)i)t*w*{+V,^,a,f,r,u-V-_-m-s.T.a.h.p/y0O0`0|1^1_1a1c1f1i1k1z2[2b2n2v3]4o4q4{5]5^5a5k5t6R7Y7_7n7x8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bS$mh$nR3^.o'RgOPWXYZhstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$Z$`$d$l$n%e%k%x&a&d&e&h&j&k&m&q&y&}'W'h'x'z(Q(X(m(q(u)i)t*w*{+V,^,a,f,r,u-V-_-m-s.T.a.h.o.p/y0O0`0|1^1_1a1c1f1i1k1z2[2b2n2v3]4o4q4{5]5^5a5k5t6R7Y7_7n7x8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bT$if$oQ$gfS)`$j)dR)l$oT$hf$oT)b$j)d'RhOPWXYZhstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$Z$`$d$l$n%e%k%x&a&d&e&h&j&k&m&q&y&}'W'h'x'z(Q(X(m(q(u)i)t*w*{+V,^,a,f,r,u-V-_-m-s.T.a.h.o.p/y0O0`0|1^1_1a1c1f1i1k1z2[2b2n2v3]4o4q4{5]5^5a5k5t6R7Y7_7n7x8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;bT$mh$nQ$phR)k$n%WjOPWXYZstuv!Y!_!f!n#Q#U#X#b#m#s#w#z#}$O$P$Q$R$S$T$U$V$W$X$`$d%e%k%x&a&d&e&h&j&k&m&q&y'W'h'x'z(Q(X(m(q(u)t*w*{+V,^,a,f-V-_-m-s.T.a.h/y0O0`0|1^1_1a1c1f1i1k2[2b2n2v4q4{5]5^5a5t6R7Y7_7n7x!s;`$Z$l&})i,r,u.p1z3]4o5k8g8x9p9s9t9w9x9y9z9{9|9}:O:P:Q:R:S:T:U:Y:c:d:e:g:n:o:t:u;b#alOPXZs!Y!_!n#Q#b#m#z$l%e&a&d&e&h&j&k&m&q&y'W(u)i*{+V,^,a,f-V.T.p/y0|1^1_1a1c1f1i1k2n3]4q4{5]5^5a6R7Y7_7nv$|i#v%V%W%[)y){*T*i*j.^/]/{3e3}8W;_;g;h#O(l#t$b$c$w$z)p)v)|*Z+U+X+p+s.S/O/^/`0p0s0{2m3o3w4V4X4z6O6f6o7[7{8k8}9]9e:]:_:a:h:j:l:p:r:v;k;lQ*s%YQ.{)ug3Y:W:X:^:`:b:i:k:m:q:s:wv$xi#v%V%W%[)y){*T*i*j.^/]/{3e3}8W;_;g;hQ*V$yS*`${*cQ*t%ZQ/k*a#O;Q#t$b$c$w$z)p)v)|*Z+U+X+p+s.S/O/^/`0p0s0{2m3o3w4V4X4z6O6f6o7[7{8k8}9]9e:]:_:a:h:j:l:p:r:v;k;lf;R:W:X:^:`:b:i:k:m:q:s:wQ;V;cQ;W;dQ;X;eR;Y;fv$|i#v%V%W%[)y){*T*i*j.^/]/{3e3}8W;_;g;h#O(l#t$b$c$w$z)p)v)|*Z+U+X+p+s.S/O/^/`0p0s0{2m3o3w4V4X4z6O6f6o7[7{8k8}9]9e:]:_:a:h:j:l:p:r:v;k;lg3Y:W:X:^:`:b:i:k:m:q:s:wloOXs!Y#b%e&h&j&k&m,a,f1f1iQ*Y$zQ,o&tQ,p&vR3n/^$^$}i#t#v$b$c$w$z%V%W%[)p)v)y){)|*T*Z*i*j+U+X+p+s.S.^/O/]/^/`/{0p0s0{2m3e3o3w3}4V4X4z6O6f6o7[7{8W8k8}9]9e:W:X:]:^:_:`:a:b:h:i:j:k:l:m:p:q:r:s:v:w;_;g;h;k;lQ+r&RQ0r+tQ4k0qR7Q4lT*b${*cS*b${*cT4s0y4tS/i*_4qT3{/q7YQ+Y%oQ/j*`Q0[+ZQ1P+}Q5O1QQ7a5PQ8n7bR9_8on)y$u(n*u/[/s/t2s3l4R6`6q9R;P;];^!Y:h(j)Z*P*X.Z.w.|/S/a0T0o0q2r3m3q4j4l6S6T6g6k6s6u8[8`9f;i;j]:i3X6Z8Q9P9Q9op){$u(n*u/Q/[/s/t2s3l4R6`6q9R;P;];^![:j(j)Z*P*X.Z.w.|/S/a0T0o0q2p2r3m3q4j4l6S6T6g6k6s6u8[8`9f;i;j_:k3X6Z8Q8R9P9Q9opnOXs!U!Y#b%e&_&h&j&k&m,a,f1f1iQ&[!TR,^&epnOXs!U!Y#b%e&_&h&j&k&m,a,f1f1iR&[!TQ+v&SR0n+oqnOXs!U!Y#b%e&_&h&j&k&m,a,f1f1iQ0z+{S4y0}1OU7Z4w4x4|S8j7]7^S9Z8i8lQ9h9[R9m9iQ&c!UR,V&_R5V1WS%w{%|R0g+fQ&h!VR,a&iR,g&nT1g,f1iR,k&oQ,j&oR1p,kQ'o!yR-g'oQsOQ#bXT%hs#bQ!|TR'q!|Q#PUR's#PQ)r$tR.x)rQ#SVR'u#SQ#VWU'{#V'|-nQ'|#WR-n'}Q,z'OR1|,zQ._(nR2t._Q.b(pS2w.b2xR2x.cQ-R'UR2Q-RY!qQ'U-R0y4tR'`!qS#]W%`U(S#](T-oQ(T#^R-o(OQ,}'RR2O,}r`OXs!U!Y#b%e&_&a&h&j&k&m,a,f1f1iS#fZ%]U#p`#f-xR-x(_Q(`#hQ-u([W-}(`-u2c5yQ2c-vR5y2dQ)d$jR.q)dQ$nhR)j$nQ$acU)Y$a-j:VQ-j9rR:V)gQ/V*QW3h/V3i6d8ZU3i/W/X/YS6d3j3kR8Z6e#o)w$u(j(n)Z*P*X*p*q*u.X.Y.Z.w.|/Q/R/S/[/a/s/t0T0o0q2p2q2r2s3X3l3m3q4R4j4l6S6T6X6Y6Z6`6g6k6q6s6u8Q8R8S8[8`9P9Q9R9f9o;P;];^;i;jQ/_*XU3p/_3r6hQ3r/aR6h3qQ*c${R/m*cQ*l%PR/v*lQ4W0TR6t4WQ*}%cR0R*}Q4n0tS7S4n8hR8h7TQ+x&TR0w+xQ4t0yR7W4tQ1V,SS5T1V7eR7e5VQ0b+bW4a0b4c6z8dQ4c0eQ6z4bR8d6{Q+g%wR0h+gQ1i,fR5e1iWrOXs#bQ&l!YQ+P%eQ,`&hQ,b&jQ,c&kQ,e&mQ1d,aS1g,f1iR5d1fQ%gpQ&p!^Q&s!`Q&u!aQ&w!bQ'g!sQ+O%dQ+[%qQ+n%}Q,U&cQ,m&rW-^'a'i'j'mQ-e'eQ/l*bQ0]+]S1Y,V,YQ1q,lQ1r,oQ1s,pQ2X-]W2Z-`-a-d-fQ4Y0^Q4f0kQ4i0oQ4}1PQ5X1[Q5c1eU5r2Y2]2`Q5u2^Q6v4ZQ7O4hQ7P4jQ7V4sQ7`5OQ7f5WS7u5s5wQ7w5vQ8e6|Q8m7aQ8r7gQ8y7vQ9X8fQ9^8nQ9b8zR9j9_Q%qxQ'Y!hQ'e!sU+]%r%s%tQ,t&{U-X'Z'[']S-]'a'kQ/c*]S0^+^+_Q1y,vS2V-Y-ZQ2^-bQ3u/gQ4Z0_Q5n2PQ5q2WQ5v2_R6l3yS$vi;_R*m%QU%Pi%Q;_R/u*kQ$uiS(j#t+XQ(n#vS)Z$b$cQ*P$wQ*X$zQ*p%VQ*q%WQ*u%[Q.X:]Q.Y:_Q.Z:aQ.w)pS.|)v/OQ/Q)yQ/R){Q/S)|Q/[*TQ/a*ZQ/s*iQ/t*jh0T+U.S0{2m4z6O7[7{8k8}9]9eQ0o+pQ0q+sQ2p:hQ2q:jQ2r:lQ2s.^S3X:W:XQ3l/]Q3m/^Q3q/`Q4R/{Q4j0pQ4l0sQ6S:pQ6T:rQ6X:^Q6Y:`Q6Z:bQ6`3eQ6g3oQ6k3wQ6q3}Q6s4VQ6u4XQ8Q:mQ8R:iQ8S:kQ8[6fQ8`6oQ9P:qQ9Q:sQ9R8WQ9f:vQ9o:wQ;P;_Q;];gQ;^;hQ;i;kR;j;llpOXs!Y#b%e&h&j&k&m,a,f1f1iQ!ePS#dZ#mQ&r!_U'^!n4q7YQ't#QQ(w#zQ)h$lS,Y&a&dQ,_&eQ,l&qQ,q&yQ-T'WQ.e(uQ.u)iQ0P*{Q0W+VQ1b,^Q2T-VQ2k.TQ3`.pQ4P/yQ4x0|Q5Z1^Q5[1_Q5`1aQ5b1cQ5g1kQ5}2nQ6^3]Q7^4{Q7j5]Q7k5^Q7m5aQ7}6RQ8l7_R8v7n#UcOPXZs!Y!_!n#b#m#z%e&a&d&e&h&j&k&m&q&y'W(u*{+V,^,a,f-V.T/y0|1^1_1a1c1f1i1k2n4q4{5]5^5a6R7Y7_7nQ#WWQ#cYQ%itQ%juS%lv!fS'w#U'zQ'}#XQ(i#sQ(p#wQ(x#}Q(y$OQ(z$PQ({$QQ(|$RQ(}$SQ)O$TQ)P$UQ)Q$VQ)R$WQ)S$XQ)U$ZQ)X$`Q)]$dW)g$l)i.p3]Q+S%kQ+h%xS,w&}1zQ-f'hS-k'x-mQ-p(QQ-r(XQ.](mQ.c(qQ.g9pQ.i9sQ.j9tQ.k9wQ.z)tQ/|*wQ1u,rQ1x,uQ2Y-_Q2a-sQ2u.aQ2z9xQ2{9yQ2|9zQ2}9{Q3O9|Q3P9}Q3Q:OQ3R:PQ3S:QQ3T:RQ3U:SQ3V:TQ3W.hQ3Z:YQ3[:cQ3a:UQ4S0OQ4[0`Q5m:dQ5s2[Q5x2bQ6U2vQ6V:eQ6[:gQ6]:nQ7T4oQ7r5kQ7v5tQ8P:oQ8T:tQ8U:uQ8z7xQ9Y8gQ9a8xQ9r#QR;U;bR#YWR'P!dY!sQ'U-R0y4tS&{!d,yQ'a!qS'k!t!wS'm!x4vS,v&|'TS-b'b'cQ-d'dQ2P-PR2_-cR(o#vR(r#wQ!eQT-Q'U-R]!pQ!q'U-R0y4tQ#n]R'_9qT#iZ%]S#hZ%]S%cm,]U([#f#g#jS-v(](^Q-z(_Q0Q*|Q2d-wU2e-x-y-{S5z2f2gR7y5{`#[W#U#X%`'x(R*y-qr#eZm#f#g#j%](](^(_*|-w-x-y-{2f2g5{Q1`,]Q1v,sQ5i1nQ7q5jT:|&}*zT#_W%`S#^W%`S'y#U(RS(O#X*yS,x&}*zT-l'x-qT'S!d%aQ$jfR)n$oT)c$j)dR3_.oT*S$w*UR*[$zQ0U+UQ2i.SQ4w0{Q6P2mQ7]4zQ7|6OQ8i7[Q8{7{Q9[8kQ9d8}Q9i9]R9l9elqOXs!Y#b%e&h&j&k&m,a,f1f1iQ&b!UR,U&_rmOXs!T!U!Y#b%e&_&h&j&k&m,a,f1f1iR,]&eT%dm,]R0u+uR,T&]Q%{{R+m%|R+c%vT&f!V&iT&g!V&iT1h,f1i",
  nodeNames: "⚠ ArithOp ArithOp LineComment BlockComment Script ExportDeclaration export Star as VariableName String Escape from ; default FunctionDeclaration async function VariableDefinition > TypeParamList TypeDefinition extends ThisType this LiteralType ArithOp Number BooleanLiteral TemplateType InterpolationEnd Interpolation InterpolationStart NullType null VoidType void TypeofType typeof MemberExpression . ?. PropertyName [ TemplateString Escape Interpolation super RegExp ] ArrayExpression Spread , } { ObjectExpression Property async get set PropertyDefinition Block : NewExpression new TypeArgList CompareOp < ) ( ArgList UnaryExpression delete LogicOp BitOp YieldExpression yield AwaitExpression await ParenthesizedExpression ClassExpression class ClassBody MethodDeclaration Decorator @ MemberExpression PrivatePropertyName CallExpression declare Privacy static abstract override PrivatePropertyDefinition PropertyDeclaration readonly accessor Optional TypeAnnotation Equals StaticBlock FunctionExpression ArrowFunction ParamList ParamList ArrayPattern ObjectPattern PatternProperty Privacy readonly Arrow MemberExpression BinaryExpression ArithOp ArithOp ArithOp ArithOp BitOp CompareOp instanceof satisfies in const CompareOp BitOp BitOp BitOp LogicOp LogicOp ConditionalExpression LogicOp LogicOp AssignmentExpression UpdateOp PostfixExpression CallExpression TaggedTemplateExpression DynamicImport import ImportMeta JSXElement JSXSelfCloseEndTag JSXStartTag JSXSelfClosingTag JSXIdentifier JSXBuiltin JSXIdentifier JSXNamespacedName JSXMemberExpression JSXSpreadAttribute JSXAttribute JSXAttributeValue JSXEscape JSXEndTag JSXOpenTag JSXFragmentTag JSXText JSXEscape JSXStartCloseTag JSXCloseTag PrefixCast ArrowFunction TypeParamList SequenceExpression KeyofType keyof UniqueType unique ImportType InferredType infer TypeName ParenthesizedType FunctionSignature ParamList NewSignature IndexedType TupleType Label ArrayType ReadonlyType ObjectType MethodType PropertyType IndexSignature PropertyDefinition CallSignature TypePredicate is NewSignature new UnionType LogicOp IntersectionType LogicOp ConditionalType ParameterizedType ClassDeclaration abstract implements type VariableDeclaration let var using TypeAliasDeclaration InterfaceDeclaration interface EnumDeclaration enum EnumBody NamespaceDeclaration namespace module AmbientDeclaration declare GlobalDeclaration global ClassDeclaration ClassBody AmbientFunctionDeclaration ExportGroup VariableName VariableName ImportDeclaration ImportGroup ForStatement for ForSpec ForInSpec ForOfSpec of WhileStatement while WithStatement with DoStatement do IfStatement if else SwitchStatement switch SwitchBody CaseLabel case DefaultLabel TryStatement try CatchClause catch FinallyClause finally ReturnStatement return ThrowStatement throw BreakStatement break ContinueStatement continue DebuggerStatement debugger LabeledStatement ExpressionStatement SingleExpression SingleClassItem",
  maxTerm: 366,
  context: ha,
  nodeProps: [
    ["group", -26, 6, 14, 16, 62, 199, 203, 207, 208, 210, 213, 216, 226, 228, 234, 236, 238, 240, 243, 249, 255, 257, 259, 261, 263, 265, 266, "Statement", -32, 10, 11, 25, 28, 29, 35, 45, 48, 49, 51, 56, 64, 72, 76, 78, 80, 81, 103, 104, 113, 114, 131, 134, 136, 137, 138, 139, 141, 142, 162, 163, 165, "Expression", -23, 24, 26, 30, 34, 36, 38, 166, 168, 170, 171, 173, 174, 175, 177, 178, 179, 181, 182, 183, 193, 195, 197, 198, "Type", -3, 84, 96, 102, "ClassItem"],
    ["openedBy", 31, "InterpolationStart", 50, "[", 54, "{", 69, "(", 143, "JSXStartTag", 155, "JSXStartTag JSXStartCloseTag"],
    ["closedBy", 33, "InterpolationEnd", 44, "]", 55, "}", 70, ")", 144, "JSXSelfCloseEndTag JSXEndTag", 160, "JSXEndTag"]
  ],
  propSources: [ga],
  skippedNodes: [0, 3, 4, 269],
  repeatNodeCount: 33,
  tokenData: "$>y(CSR!bOX%ZXY+gYZ-yZ[+g[]%Z]^.c^p%Zpq+gqr/mrs3cst:_tu>PuvBavwDxwxGgxyMvyz! Qz{!![{|!%O|}!&]}!O!%O!O!P!'g!P!Q!1w!Q!R#0t!R![#3T![!]#@T!]!^#Aa!^!_#Bk!_!`#GS!`!a#In!a!b#N{!b!c$$z!c!}>P!}#O$&U#O#P$'`#P#Q$,w#Q#R$.R#R#S>P#S#T$/`#T#o$0j#o#p$4z#p#q$5p#q#r$7Q#r#s$8^#s$f%Z$f$g+g$g#BY>P#BY#BZ$9h#BZ$IS>P$IS$I_$9h$I_$I|>P$I|$I}$<s$I}$JO$<s$JO$JT>P$JT$JU$9h$JU$KV>P$KV$KW$9h$KW&FU>P&FU&FV$9h&FV;'S>P;'S;=`BZ<%l?HT>P?HT?HU$9h?HUO>P(n%d_$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&j&hT$d&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c&j&zP;=`<%l&c'|'U]$d&j'{!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!b(SU'{!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}!b(iP;=`<%l'}'|(oP;=`<%l&}'[(y]$d&j'xpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(rp)wU'xpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)rp*^P;=`<%l)r'[*dP;=`<%l(r#S*nX'xp'{!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g#S+^P;=`<%l*g(n+dP;=`<%l%Z(CS+rq$d&j'xp'{!b'n(;dOX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p$f%Z$f$g+g$g#BY%Z#BY#BZ+g#BZ$IS%Z$IS$I_+g$I_$JT%Z$JT$JU+g$JU$KV%Z$KV$KW+g$KW&FU%Z&FU&FV+g&FV;'S%Z;'S;=`+a<%l?HT%Z?HT?HU+g?HUO%Z(CS.ST'y#S$d&j'o(;dO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c(CS.n_$d&j'xp'{!b'o(;dOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#`/x`$d&j!l$Ip'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S1V`#q$Id$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`2X!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S2d_#q$Id$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$2b3l_'w$(n$d&j'{!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k*r4r_$d&j'{!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k)`5vX$d&jOr5qrs6cs!^5q!^!_6y!_#o5q#o#p6y#p;'S5q;'S;=`7h<%lO5q)`6jT$_#t$d&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c#t6|TOr6yrs7]s;'S6y;'S;=`7b<%lO6y#t7bO$_#t#t7eP;=`<%l6y)`7kP;=`<%l5q*r7w]$_#t$d&j'{!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}%W8uZ'{!bOY8pYZ6yZr8prs9hsw8pwx6yx#O8p#O#P6y#P;'S8p;'S;=`:R<%lO8p%W9oU$_#t'{!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}%W:UP;=`<%l8p*r:[P;=`<%l4k#%|:hg$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}st%Ztu<Puw%Zwx(rx!^%Z!^!_*g!_!c%Z!c!}<P!}#O%Z#O#P&c#P#R%Z#R#S<P#S#T%Z#T#o<P#o#p*g#p$g%Z$g;'S<P;'S;=`=y<%lO<P#%|<[i$d&j(b!L^'xp'{!bOY%ZYZ&cZr%Zrs&}st%Ztu<Puw%Zwx(rx!Q%Z!Q![<P![!^%Z!^!_*g!_!c%Z!c!}<P!}#O%Z#O#P&c#P#R%Z#R#S<P#S#T%Z#T#o<P#o#p*g#p$g%Z$g;'S<P;'S;=`=y<%lO<P#%|=|P;=`<%l<P(CS>`k$d&j'xp'{!b(V!LY'u&;d$W#tOY%ZYZ&cZr%Zrs&}st%Ztu>Puw%Zwx(rx}%Z}!O@T!O!Q%Z!Q![>P![!^%Z!^!_*g!_!c%Z!c!}>P!}#O%Z#O#P&c#P#R%Z#R#S>P#S#T%Z#T#o>P#o#p*g#p$g%Z$g;'S>P;'S;=`BZ<%lO>P+d@`k$d&j'xp'{!b$W#tOY%ZYZ&cZr%Zrs&}st%Ztu@Tuw%Zwx(rx}%Z}!O@T!O!Q%Z!Q![@T![!^%Z!^!_*g!_!c%Z!c!}@T!}#O%Z#O#P&c#P#R%Z#R#S@T#S#T%Z#T#o@T#o#p*g#p$g%Z$g;'S@T;'S;=`BT<%lO@T+dBWP;=`<%l@T(CSB^P;=`<%l>P%#SBl`$d&j'xp'{!b#i$IdOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#SCy_$d&j#{$Id'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%DfETa(k%<v$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sv%ZvwFYwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#SFe`$d&j#u$Id'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$2bGp_'z$)`$d&j'xpOYHoYZIuZrHorsIuswHowxKVx!^Ho!^!_LX!_#OHo#O#PIu#P#oHo#o#pLX#p;'SHo;'S;=`Mp<%lOHo*QHv_$d&j'xpOYHoYZIuZrHorsIuswHowxKVx!^Ho!^!_LX!_#OHo#O#PIu#P#oHo#o#pLX#p;'SHo;'S;=`Mp<%lOHo)`IzX$d&jOwIuwx6cx!^Iu!^!_Jg!_#oIu#o#pJg#p;'SIu;'S;=`KP<%lOIu#tJjTOwJgwx7]x;'SJg;'S;=`Jy<%lOJg#tJ|P;=`<%lJg)`KSP;=`<%lIu*QK`]$_#t$d&j'xpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(r$fL^Z'xpOYLXYZJgZrLXrsJgswLXwxMPx#OLX#O#PJg#P;'SLX;'S;=`Mj<%lOLX$fMWU$_#t'xpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)r$fMmP;=`<%lLX*QMsP;=`<%lHo(*QNR_!h(!b$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z!'l! ]_!gM|$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'+h!!ib$d&j'xp'{!b'v#)d#j$IdOY%ZYZ&cZr%Zrs&}sw%Zwx(rxz%Zz{!#q{!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S!#|`$d&j'xp'{!b#g$IdOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&-O!%Z`$d&j'xp'{!bk&%`OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&C[!&h_!V&;l$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS!'rc$d&j'xp'{!by'<nOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!(}!P!Q%Z!Q![!+g![!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z!'d!)Wa$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!*]!P!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z!'d!*h_!UMt$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l!+rg$d&j'xp'{!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!+g![!^%Z!^!_*g!_!g%Z!g!h!-Z!h#O%Z#O#P&c#P#R%Z#R#S!+g#S#X%Z#X#Y!-Z#Y#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l!-dg$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx{%Z{|!.{|}%Z}!O!.{!O!Q%Z!Q![!0a![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!0a#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l!/Uc$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!0a![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!0a#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l!0lc$d&j'xp'{!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!0a![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!0a#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS!2Sf$d&j'xp'{!b#h$IdOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}xz!3hz{#$s{!P!3h!P!Q#&Y!Q!^!3h!^!_!Mh!_!`#-x!`!a#/_!a!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h(r!3sb$d&j'xp'{!b!RSOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}x!P!3h!P!Q!Kh!Q!^!3h!^!_!Mh!_!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h(Q!5U`$d&j'{!b!RSOY!4{YZ&cZw!4{wx!6Wx!P!4{!P!Q!=o!Q!^!4{!^!_!?g!_!}!4{!}#O!Bn#O#P!<w#P#o!4{#o#p!?g#p;'S!4{;'S;=`!Cw<%lO!4{&n!6_^$d&j!RSOY!6WYZ&cZ!P!6W!P!Q!7Z!Q!^!6W!^!_!8g!_!}!6W!}#O!;U#O#P!<w#P#o!6W#o#p!8g#p;'S!6W;'S;=`!=i<%lO!6W&n!7ba$d&j!RSO!^&c!_#Z&c#Z#[!7Z#[#]&c#]#^!7Z#^#a&c#a#b!7Z#b#g&c#g#h!7Z#h#i&c#i#j!7Z#j#m&c#m#n!7Z#n#o&c#p;'S&c;'S;=`&w<%lO&cS!8lX!RSOY!8gZ!P!8g!P!Q!9X!Q!}!8g!}#O!9p#O#P!:o#P;'S!8g;'S;=`!;O<%lO!8gS!9^U!RS#Z#[!9X#]#^!9X#a#b!9X#g#h!9X#i#j!9X#m#n!9XS!9sVOY!9pZ#O!9p#O#P!:Y#P#Q!8g#Q;'S!9p;'S;=`!:i<%lO!9pS!:]SOY!9pZ;'S!9p;'S;=`!:i<%lO!9pS!:lP;=`<%l!9pS!:rSOY!8gZ;'S!8g;'S;=`!;O<%lO!8gS!;RP;=`<%l!8g&n!;Z[$d&jOY!;UYZ&cZ!^!;U!^!_!9p!_#O!;U#O#P!<P#P#Q!6W#Q#o!;U#o#p!9p#p;'S!;U;'S;=`!<q<%lO!;U&n!<UX$d&jOY!;UYZ&cZ!^!;U!^!_!9p!_#o!;U#o#p!9p#p;'S!;U;'S;=`!<q<%lO!;U&n!<tP;=`<%l!;U&n!<|X$d&jOY!6WYZ&cZ!^!6W!^!_!8g!_#o!6W#o#p!8g#p;'S!6W;'S;=`!=i<%lO!6W&n!=lP;=`<%l!6W(Q!=xi$d&j'{!b!RSOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#Z&}#Z#[!=o#[#]&}#]#^!=o#^#a&}#a#b!=o#b#g&}#g#h!=o#h#i&}#i#j!=o#j#m&}#m#n!=o#n#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!f!?nZ'{!b!RSOY!?gZw!?gwx!8gx!P!?g!P!Q!@a!Q!}!?g!}#O!Ap#O#P!:o#P;'S!?g;'S;=`!Bh<%lO!?g!f!@hb'{!b!RSOY'}Zw'}x#O'}#P#Z'}#Z#[!@a#[#]'}#]#^!@a#^#a'}#a#b!@a#b#g'}#g#h!@a#h#i'}#i#j!@a#j#m'}#m#n!@a#n;'S'};'S;=`(f<%lO'}!f!AuX'{!bOY!ApZw!Apwx!9px#O!Ap#O#P!:Y#P#Q!?g#Q;'S!Ap;'S;=`!Bb<%lO!Ap!f!BeP;=`<%l!Ap!f!BkP;=`<%l!?g(Q!Bu^$d&j'{!bOY!BnYZ&cZw!Bnwx!;Ux!^!Bn!^!_!Ap!_#O!Bn#O#P!<P#P#Q!4{#Q#o!Bn#o#p!Ap#p;'S!Bn;'S;=`!Cq<%lO!Bn(Q!CtP;=`<%l!Bn(Q!CzP;=`<%l!4{'`!DW`$d&j'xp!RSOY!C}YZ&cZr!C}rs!6Ws!P!C}!P!Q!EY!Q!^!C}!^!_!GQ!_!}!C}!}#O!JX#O#P!<w#P#o!C}#o#p!GQ#p;'S!C};'S;=`!Kb<%lO!C}'`!Eci$d&j'xp!RSOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#Z(r#Z#[!EY#[#](r#]#^!EY#^#a(r#a#b!EY#b#g(r#g#h!EY#h#i(r#i#j!EY#j#m(r#m#n!EY#n#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(rt!GXZ'xp!RSOY!GQZr!GQrs!8gs!P!GQ!P!Q!Gz!Q!}!GQ!}#O!IZ#O#P!:o#P;'S!GQ;'S;=`!JR<%lO!GQt!HRb'xp!RSOY)rZr)rs#O)r#P#Z)r#Z#[!Gz#[#])r#]#^!Gz#^#a)r#a#b!Gz#b#g)r#g#h!Gz#h#i)r#i#j!Gz#j#m)r#m#n!Gz#n;'S)r;'S;=`*Z<%lO)rt!I`X'xpOY!IZZr!IZrs!9ps#O!IZ#O#P!:Y#P#Q!GQ#Q;'S!IZ;'S;=`!I{<%lO!IZt!JOP;=`<%l!IZt!JUP;=`<%l!GQ'`!J`^$d&j'xpOY!JXYZ&cZr!JXrs!;Us!^!JX!^!_!IZ!_#O!JX#O#P!<P#P#Q!C}#Q#o!JX#o#p!IZ#p;'S!JX;'S;=`!K[<%lO!JX'`!K_P;=`<%l!JX'`!KeP;=`<%l!C}(r!Ksk$d&j'xp'{!b!RSOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#Z%Z#Z#[!Kh#[#]%Z#]#^!Kh#^#a%Z#a#b!Kh#b#g%Z#g#h!Kh#h#i%Z#i#j!Kh#j#m%Z#m#n!Kh#n#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#W!Mq]'xp'{!b!RSOY!MhZr!Mhrs!?gsw!Mhwx!GQx!P!Mh!P!Q!Nj!Q!}!Mh!}#O#!U#O#P!:o#P;'S!Mh;'S;=`##U<%lO!Mh#W!Nse'xp'{!b!RSOY*gZr*grs'}sw*gwx)rx#O*g#P#Z*g#Z#[!Nj#[#]*g#]#^!Nj#^#a*g#a#b!Nj#b#g*g#g#h!Nj#h#i*g#i#j!Nj#j#m*g#m#n!Nj#n;'S*g;'S;=`+Z<%lO*g#W#!]Z'xp'{!bOY#!UZr#!Urs!Apsw#!Uwx!IZx#O#!U#O#P!:Y#P#Q!Mh#Q;'S#!U;'S;=`##O<%lO#!U#W##RP;=`<%l#!U#W##XP;=`<%l!Mh(r##e`$d&j'xp'{!bOY##[YZ&cZr##[rs!Bnsw##[wx!JXx!^##[!^!_#!U!_#O##[#O#P!<P#P#Q!3h#Q#o##[#o#p#!U#p;'S##[;'S;=`#$g<%lO##[(r#$jP;=`<%l##[(r#$pP;=`<%l!3h(CS#%Qb$d&j'xp'{!b'p(;d!RSOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}x!P!3h!P!Q!Kh!Q!^!3h!^!_!Mh!_!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h(CS#&e_$d&j'xp'{!bR(;dOY#&YYZ&cZr#&Yrs#'dsw#&Ywx#*tx!^#&Y!^!_#,s!_#O#&Y#O#P#(f#P#o#&Y#o#p#,s#p;'S#&Y;'S;=`#-r<%lO#&Y(Bb#'m]$d&j'{!bR(;dOY#'dYZ&cZw#'dwx#(fx!^#'d!^!_#)w!_#O#'d#O#P#(f#P#o#'d#o#p#)w#p;'S#'d;'S;=`#*n<%lO#'d(AO#(mX$d&jR(;dOY#(fYZ&cZ!^#(f!^!_#)Y!_#o#(f#o#p#)Y#p;'S#(f;'S;=`#)q<%lO#(f(;d#)_SR(;dOY#)YZ;'S#)Y;'S;=`#)k<%lO#)Y(;d#)nP;=`<%l#)Y(AO#)tP;=`<%l#(f(<v#*OW'{!bR(;dOY#)wZw#)wwx#)Yx#O#)w#O#P#)Y#P;'S#)w;'S;=`#*h<%lO#)w(<v#*kP;=`<%l#)w(Bb#*qP;=`<%l#'d(Ap#*}]$d&j'xpR(;dOY#*tYZ&cZr#*trs#(fs!^#*t!^!_#+v!_#O#*t#O#P#(f#P#o#*t#o#p#+v#p;'S#*t;'S;=`#,m<%lO#*t(<U#+}W'xpR(;dOY#+vZr#+vrs#)Ys#O#+v#O#P#)Y#P;'S#+v;'S;=`#,g<%lO#+v(<U#,jP;=`<%l#+v(Ap#,pP;=`<%l#*t(=h#,|Y'xp'{!bR(;dOY#,sZr#,srs#)wsw#,swx#+vx#O#,s#O#P#)Y#P;'S#,s;'S;=`#-l<%lO#,s(=h#-oP;=`<%l#,s(CS#-uP;=`<%l#&Y%#W#.Vb$d&j#{$Id'xp'{!b!RSOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}x!P!3h!P!Q!Kh!Q!^!3h!^!_!Mh!_!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h+h#/lb$T#t$d&j'xp'{!b!RSOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}x!P!3h!P!Q!Kh!Q!^!3h!^!_!Mh!_!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h$/l#1Pp$d&j'xp'{!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!+g!P!Q%Z!Q![#3T![!^%Z!^!_*g!_!g%Z!g!h!-Z!h#O%Z#O#P&c#P#R%Z#R#S#3T#S#U%Z#U#V#6_#V#X%Z#X#Y!-Z#Y#b%Z#b#c#5T#c#d#9g#d#l%Z#l#m#<i#m#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#3`k$d&j'xp'{!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!+g!P!Q%Z!Q![#3T![!^%Z!^!_*g!_!g%Z!g!h!-Z!h#O%Z#O#P&c#P#R%Z#R#S#3T#S#X%Z#X#Y!-Z#Y#b%Z#b#c#5T#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#5`_$d&j'xp'{!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#6hd$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#7v!R!S#7v!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#7v#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#8Rf$d&j'xp'{!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#7v!R!S#7v!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#7v#S#b%Z#b#c#5T#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#9pc$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#:{!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#:{#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#;We$d&j'xp'{!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#:{!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#:{#S#b%Z#b#c#5T#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#<rg$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#>Z![!^%Z!^!_*g!_!c%Z!c!i#>Z!i#O%Z#O#P&c#P#R%Z#R#S#>Z#S#T%Z#T#Z#>Z#Z#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#>fi$d&j'xp'{!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#>Z![!^%Z!^!_*g!_!c%Z!c!i#>Z!i#O%Z#O#P&c#P#R%Z#R#S#>Z#S#T%Z#T#Z#>Z#Z#b%Z#b#c#5T#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%Gh#@b_!a$b$d&j#y%<f'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z)[#Al_^l$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS#Bz^(O!*v!e'.r'xp'{!b$U)d(oSOY*gZr*grs'}sw*gwx)rx!P*g!P!Q#Cv!Q!^*g!^!_#Dl!_!`#F^!`#O*g#P;'S*g;'S;=`+Z<%lO*g(n#DPX$f&j'xp'{!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g$Kh#DuZ#k$Id'xp'{!bOY*gZr*grs'}sw*gwx)rx!_*g!_!`#Eh!`#O*g#P;'S*g;'S;=`+Z<%lO*g$Kh#EqX#{$Id'xp'{!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g$Kh#FgX#l$Id'xp'{!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g%Gh#G_a#X%?x$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`!a#Hd!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#W#Ho_#d$Ih$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%Gh#I}adBf#l$Id$a#|$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`#KS!`!a#L^!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S#K__#l$Id$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S#Lia#k$Id$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`!a#Mn!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S#My`#k$Id$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'+h$ Wc(c$Ip$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P$!c!P!^%Z!^!_*g!_!a%Z!a!b$#m!b#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'+`$!n_z'#p$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S$#x`$d&j#v$Id'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#&^$%V_!x!Ln$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(@^$&a_|(8n$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(n$'eZ$d&jO!^$(W!^!_$(n!_#i$(W#i#j$(s#j#l$(W#l#m$*f#m#o$(W#o#p$(n#p;'S$(W;'S;=`$,q<%lO$(W(n$(_T[#S$d&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c#S$(sO[#S(n$(x[$d&jO!Q&c!Q![$)n![!^&c!_!c&c!c!i$)n!i#T&c#T#Z$)n#Z#o&c#o#p$,U#p;'S&c;'S;=`&w<%lO&c(n$)sZ$d&jO!Q&c!Q![$*f![!^&c!_!c&c!c!i$*f!i#T&c#T#Z$*f#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$*kZ$d&jO!Q&c!Q![$+^![!^&c!_!c&c!c!i$+^!i#T&c#T#Z$+^#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$+cZ$d&jO!Q&c!Q![$(W![!^&c!_!c&c!c!i$(W!i#T&c#T#Z$(W#Z#o&c#p;'S&c;'S;=`&w<%lO&c#S$,XR!Q![$,b!c!i$,b#T#Z$,b#S$,eS!Q![$,b!c!i$,b#T#Z$,b#q#r$(n(n$,tP;=`<%l$(W!2r$-S_!S!+S$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S$.^`#s$Id$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&,v$/k_$d&j'xp'{!b(S&%WOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS$0yk$d&j'xp'{!b(V!LY'u&;d$Y#tOY%ZYZ&cZr%Zrs&}st%Ztu$0juw%Zwx(rx}%Z}!O$2n!O!Q%Z!Q![$0j![!^%Z!^!_*g!_!c%Z!c!}$0j!}#O%Z#O#P&c#P#R%Z#R#S$0j#S#T%Z#T#o$0j#o#p*g#p$g%Z$g;'S$0j;'S;=`$4t<%lO$0j+d$2yk$d&j'xp'{!b$Y#tOY%ZYZ&cZr%Zrs&}st%Ztu$2nuw%Zwx(rx}%Z}!O$2n!O!Q%Z!Q![$2n![!^%Z!^!_*g!_!c%Z!c!}$2n!}#O%Z#O#P&c#P#R%Z#R#S$2n#S#T%Z#T#o$2n#o#p*g#p$g%Z$g;'S$2n;'S;=`$4n<%lO$2n+d$4qP;=`<%l$2n(CS$4wP;=`<%l$0j!5p$5TX!X!3l'xp'{!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g%Df$5{a(j%<v$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p#q$#m#q;'S%Z;'S;=`+a<%lO%Z%#`$7__!W$I`o`$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(r$8i_!mS$d&j'xp'{!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS$9y|$d&j'xp'{!b'n(;d(V!LY'u&;d$W#tOX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}st%Ztu>Puw%Zwx(rx}%Z}!O@T!O!Q%Z!Q![>P![!^%Z!^!_*g!_!c%Z!c!}>P!}#O%Z#O#P&c#P#R%Z#R#S>P#S#T%Z#T#o>P#o#p*g#p$f%Z$f$g+g$g#BY>P#BY#BZ$9h#BZ$IS>P$IS$I_$9h$I_$JT>P$JT$JU$9h$JU$KV>P$KV$KW$9h$KW&FU>P&FU&FV$9h&FV;'S>P;'S;=`BZ<%l?HT>P?HT?HU$9h?HUO>P(CS$=Uk$d&j'xp'{!b'o(;d(V!LY'u&;d$W#tOY%ZYZ&cZr%Zrs&}st%Ztu>Puw%Zwx(rx}%Z}!O@T!O!Q%Z!Q![>P![!^%Z!^!_*g!_!c%Z!c!}>P!}#O%Z#O#P&c#P#R%Z#R#S>P#S#T%Z#T#o>P#o#p*g#p$g%Z$g;'S>P;'S;=`BZ<%lO>P",
  tokenizers: [Sa, da, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, fa, new N("$S~RRtu[#O#Pg#S#T#|~_P#o#pb~gOq~~jVO#i!P#i#j!U#j#l!P#l#m!q#m;'S!P;'S;=`#v<%lO!P~!UO!O~~!XS!Q![!e!c!i!e#T#Z!e#o#p#Z~!hR!Q![!q!c!i!q#T#Z!q~!tR!Q![!}!c!i!}#T#Z!}~#QR!Q![!P!c!i!P#T#Z!P~#^R!Q![#g!c!i#g#T#Z#g~#jS!Q![#g!c!i#g#T#Z#g#q#r!P~#yP;=`<%l!P~$RO(U~~", 141, 327), new N("j~RQYZXz{^~^O'r~~aP!P!Qd~iO's~~", 25, 309)],
  topRules: { Script: [0, 5], SingleExpression: [1, 267], SingleClassItem: [2, 268] },
  dialects: { jsx: 12794, ts: 12796 },
  dynamicPrecedences: { 76: 1, 78: 1, 163: 1, 191: 1 },
  specialized: [{ term: 313, get: (e) => Xa[e] || -1 }, { term: 329, get: (e) => Pa[e] || -1 }, { term: 67, get: (e) => ma[e] || -1 }],
  tokenPrec: 12820
}), ba = [
  /* @__PURE__ */ X("function ${name}(${params}) {\n	${}\n}", {
    label: "function",
    detail: "definition",
    type: "keyword"
  }),
  /* @__PURE__ */ X("for (let ${index} = 0; ${index} < ${bound}; ${index}++) {\n	${}\n}", {
    label: "for",
    detail: "loop",
    type: "keyword"
  }),
  /* @__PURE__ */ X("for (let ${name} of ${collection}) {\n	${}\n}", {
    label: "for",
    detail: "of loop",
    type: "keyword"
  }),
  /* @__PURE__ */ X("do {\n	${}\n} while (${})", {
    label: "do",
    detail: "loop",
    type: "keyword"
  }),
  /* @__PURE__ */ X("while (${}) {\n	${}\n}", {
    label: "while",
    detail: "loop",
    type: "keyword"
  }),
  /* @__PURE__ */ X(`try {
	\${}
} catch (\${error}) {
	\${}
}`, {
    label: "try",
    detail: "/ catch block",
    type: "keyword"
  }),
  /* @__PURE__ */ X("if (${}) {\n	${}\n}", {
    label: "if",
    detail: "block",
    type: "keyword"
  }),
  /* @__PURE__ */ X(`if (\${}) {
	\${}
} else {
	\${}
}`, {
    label: "if",
    detail: "/ else block",
    type: "keyword"
  }),
  /* @__PURE__ */ X(`class \${name} {
	constructor(\${params}) {
		\${}
	}
}`, {
    label: "class",
    detail: "definition",
    type: "keyword"
  }),
  /* @__PURE__ */ X('import {${names}} from "${module}"\n${}', {
    label: "import",
    detail: "named",
    type: "keyword"
  }),
  /* @__PURE__ */ X('import ${name} from "${module}"\n${}', {
    label: "import",
    detail: "default",
    type: "keyword"
  })
], GO = /* @__PURE__ */ new JO(), pe = /* @__PURE__ */ new Set([
  "Script",
  "Block",
  "FunctionExpression",
  "FunctionDeclaration",
  "ArrowFunction",
  "MethodDeclaration",
  "ForStatement"
]);
function U(e) {
  return (O, t) => {
    let a = O.node.getChild("VariableDefinition");
    return a && t(a, e), !0;
  };
}
const xa = ["FunctionDeclaration"], wa = {
  FunctionDeclaration: /* @__PURE__ */ U("function"),
  ClassDeclaration: /* @__PURE__ */ U("class"),
  ClassExpression: () => !0,
  EnumDeclaration: /* @__PURE__ */ U("constant"),
  TypeAliasDeclaration: /* @__PURE__ */ U("type"),
  NamespaceDeclaration: /* @__PURE__ */ U("namespace"),
  VariableDefinition(e, O) {
    e.matchContext(xa) || O(e, "variable");
  },
  TypeDefinition(e, O) {
    O(e, "type");
  },
  __proto__: null
};
function $e(e, O) {
  let t = GO.get(O);
  if (t)
    return t;
  let a = [], i = !0;
  function s(r, l) {
    let n = e.sliceString(r.from, r.to);
    a.push({ label: n, type: l });
  }
  return O.cursor(lO.IncludeAnonymous).iterate((r) => {
    if (i)
      i = !1;
    else if (r.name) {
      let l = wa[r.name];
      if (l && l(r, s) || pe.has(r.name))
        return !1;
    } else if (r.to - r.from > 8192) {
      for (let l of $e(e, r.node))
        a.push(l);
      return !1;
    }
  }), GO.set(O, a), a;
}
const IO = /^[\w$\xa1-\uffff][\w$\d\xa1-\uffff]*$/, he = [
  "TemplateString",
  "String",
  "RegExp",
  "LineComment",
  "BlockComment",
  "VariableDefinition",
  "TypeDefinition",
  "Label",
  "PropertyDefinition",
  "PropertyName",
  "PrivatePropertyDefinition",
  "PrivatePropertyName",
  ".",
  "?."
];
function ka(e) {
  let O = _(e.state).resolveInner(e.pos, -1);
  if (he.indexOf(O.name) > -1)
    return null;
  let t = O.name == "VariableName" || O.to - O.from < 20 && IO.test(e.state.sliceDoc(O.from, O.to));
  if (!t && !e.explicit)
    return null;
  let a = [];
  for (let i = O; i; i = i.parent)
    pe.has(i.name) && (a = a.concat($e(e.state.doc, i)));
  return {
    options: a,
    from: t ? O.from : e.pos,
    validFor: IO
  };
}
const m = /* @__PURE__ */ oO.define({
  name: "javascript",
  parser: /* @__PURE__ */ Za.configure({
    props: [
      /* @__PURE__ */ QO.add({
        IfStatement: /* @__PURE__ */ j({ except: /^\s*({|else\b)/ }),
        TryStatement: /* @__PURE__ */ j({ except: /^\s*({|catch\b|finally\b)/ }),
        LabeledStatement: ve,
        SwitchBody: (e) => {
          let O = e.textAfter, t = /^\s*\}/.test(O), a = /^\s*(case|default)\b/.test(O);
          return e.baseIndent + (t ? 0 : a ? 1 : 2) * e.unit;
        },
        Block: /* @__PURE__ */ Re({ closing: "}" }),
        ArrowFunction: (e) => e.baseIndent + e.unit,
        "TemplateString BlockComment": () => null,
        "Statement Property": /* @__PURE__ */ j({ except: /^{/ }),
        JSXElement(e) {
          let O = /^\s*<\//.test(e.textAfter);
          return e.lineIndent(e.node.from) + (O ? 0 : e.unit);
        },
        JSXEscape(e) {
          let O = /\s*\}/.test(e.textAfter);
          return e.lineIndent(e.node.from) + (O ? 0 : e.unit);
        },
        "JSXOpenTag JSXSelfClosingTag"(e) {
          return e.column(e.node.from) + e.unit;
        }
      }),
      /* @__PURE__ */ cO.add({
        "Block ClassBody SwitchBody EnumBody ObjectExpression ArrayExpression ObjectType": DO,
        BlockComment(e) {
          return { from: e.from + 2, to: e.to - 2 };
        }
      })
    ]
  }),
  languageData: {
    closeBrackets: { brackets: ["(", "[", "{", "'", '"', "`"] },
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
    indentOnInput: /^\s*(?:case |default:|\{|\}|<\/)$/,
    wordChars: "$"
  }
}), fe = {
  test: (e) => /^JSX/.test(e.name),
  facet: /* @__PURE__ */ _e({ commentTokens: { block: { open: "{/*", close: "*/}" } } })
}, Se = /* @__PURE__ */ m.configure({ dialect: "ts" }, "typescript"), de = /* @__PURE__ */ m.configure({
  dialect: "jsx",
  props: [/* @__PURE__ */ MO.add((e) => e.isTop ? [fe] : void 0)]
}), ge = /* @__PURE__ */ m.configure({
  dialect: "jsx ts",
  props: [/* @__PURE__ */ MO.add((e) => e.isTop ? [fe] : void 0)]
}, "typescript"), ya = /* @__PURE__ */ "break case const continue default delete export extends false finally in instanceof let new return static super switch this throw true typeof var yield".split(" ").map((e) => ({ label: e, type: "keyword" }));
function Ya(e = {}) {
  let O = e.jsx ? e.typescript ? ge : de : e.typescript ? Se : m;
  return new uO(O, [
    m.data.of({
      autocomplete: We(he, qe(ba.concat(ya)))
    }),
    m.data.of({
      autocomplete: ka
    }),
    e.jsx ? Ra : []
  ]);
}
function Ta(e) {
  for (; ; ) {
    if (e.name == "JSXOpenTag" || e.name == "JSXSelfClosingTag" || e.name == "JSXFragmentTag")
      return e;
    if (e.name == "JSXEscape" || !e.parent)
      return null;
    e = e.parent;
  }
}
function AO(e, O, t = e.length) {
  for (let a = O == null ? void 0 : O.firstChild; a; a = a.nextSibling)
    if (a.name == "JSXIdentifier" || a.name == "JSXBuiltin" || a.name == "JSXNamespacedName" || a.name == "JSXMemberExpression")
      return e.sliceString(a.from, Math.min(a.to, t));
  return "";
}
function Ua(e) {
  return e && (e.name == "JSXEndTag" || e.name == "JSXSelfCloseEndTag");
}
const Va = typeof navigator == "object" && /* @__PURE__ */ /Android\b/.test(navigator.userAgent), Ra = /* @__PURE__ */ LO.inputHandler.of((e, O, t, a) => {
  if ((Va ? e.composing : e.compositionStarted) || e.state.readOnly || O != t || a != ">" && a != "/" || !m.isActiveAt(e.state, O, -1))
    return !1;
  let { state: i } = e, s = i.changeByRange((r) => {
    var l;
    let { head: n } = r, Q = _(i).resolveInner(n, -1), $;
    if (Q.name == "JSXStartTag" && (Q = Q.parent), !(Q.name == "JSXAttributeValue" && Q.to > n)) {
      if (a == ">" && Q.name == "JSXFragmentTag")
        return { range: C.cursor(n + 1), changes: { from: n, insert: "></>" } };
      if (a == "/" && Q.name == "JSXFragmentTag") {
        let c = Q.parent, h = c == null ? void 0 : c.parent;
        if (c.from == n - 1 && ((l = h.lastChild) === null || l === void 0 ? void 0 : l.name) != "JSXEndTag" && ($ = AO(i.doc, h == null ? void 0 : h.firstChild, n))) {
          let p = `/${$}>`;
          return { range: C.cursor(n + p.length), changes: { from: n, insert: p } };
        }
      } else if (a == ">") {
        let c = Ta(Q);
        if (c && !Ua(c.lastChild) && i.sliceDoc(n, n + 2) != "</" && ($ = AO(i.doc, c, n)))
          return { range: C.cursor(n + 1), changes: { from: n, insert: `></${$}>` } };
      }
    }
    return { range: r };
  });
  return s.changes.empty ? !1 : (e.dispatch(s, { userEvent: "input.type", scrollIntoView: !0 }), !0);
}), V = ["_blank", "_self", "_top", "_parent"], eO = ["ascii", "utf-8", "utf-16", "latin1", "latin1"], tO = ["get", "post", "put", "delete"], aO = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"], g = ["true", "false"], u = {}, va = {
  a: {
    attrs: {
      href: null,
      ping: null,
      type: null,
      media: null,
      target: V,
      hreflang: null
    }
  },
  abbr: u,
  address: u,
  area: {
    attrs: {
      alt: null,
      coords: null,
      href: null,
      target: null,
      ping: null,
      media: null,
      hreflang: null,
      type: null,
      shape: ["default", "rect", "circle", "poly"]
    }
  },
  article: u,
  aside: u,
  audio: {
    attrs: {
      src: null,
      mediagroup: null,
      crossorigin: ["anonymous", "use-credentials"],
      preload: ["none", "metadata", "auto"],
      autoplay: ["autoplay"],
      loop: ["loop"],
      controls: ["controls"]
    }
  },
  b: u,
  base: { attrs: { href: null, target: V } },
  bdi: u,
  bdo: u,
  blockquote: { attrs: { cite: null } },
  body: u,
  br: u,
  button: {
    attrs: {
      form: null,
      formaction: null,
      name: null,
      value: null,
      autofocus: ["autofocus"],
      disabled: ["autofocus"],
      formenctype: aO,
      formmethod: tO,
      formnovalidate: ["novalidate"],
      formtarget: V,
      type: ["submit", "reset", "button"]
    }
  },
  canvas: { attrs: { width: null, height: null } },
  caption: u,
  center: u,
  cite: u,
  code: u,
  col: { attrs: { span: null } },
  colgroup: { attrs: { span: null } },
  command: {
    attrs: {
      type: ["command", "checkbox", "radio"],
      label: null,
      icon: null,
      radiogroup: null,
      command: null,
      title: null,
      disabled: ["disabled"],
      checked: ["checked"]
    }
  },
  data: { attrs: { value: null } },
  datagrid: { attrs: { disabled: ["disabled"], multiple: ["multiple"] } },
  datalist: { attrs: { data: null } },
  dd: u,
  del: { attrs: { cite: null, datetime: null } },
  details: { attrs: { open: ["open"] } },
  dfn: u,
  div: u,
  dl: u,
  dt: u,
  em: u,
  embed: { attrs: { src: null, type: null, width: null, height: null } },
  eventsource: { attrs: { src: null } },
  fieldset: { attrs: { disabled: ["disabled"], form: null, name: null } },
  figcaption: u,
  figure: u,
  footer: u,
  form: {
    attrs: {
      action: null,
      name: null,
      "accept-charset": eO,
      autocomplete: ["on", "off"],
      enctype: aO,
      method: tO,
      novalidate: ["novalidate"],
      target: V
    }
  },
  h1: u,
  h2: u,
  h3: u,
  h4: u,
  h5: u,
  h6: u,
  head: {
    children: ["title", "base", "link", "style", "meta", "script", "noscript", "command"]
  },
  header: u,
  hgroup: u,
  hr: u,
  html: {
    attrs: { manifest: null }
  },
  i: u,
  iframe: {
    attrs: {
      src: null,
      srcdoc: null,
      name: null,
      width: null,
      height: null,
      sandbox: ["allow-top-navigation", "allow-same-origin", "allow-forms", "allow-scripts"],
      seamless: ["seamless"]
    }
  },
  img: {
    attrs: {
      alt: null,
      src: null,
      ismap: null,
      usemap: null,
      width: null,
      height: null,
      crossorigin: ["anonymous", "use-credentials"]
    }
  },
  input: {
    attrs: {
      alt: null,
      dirname: null,
      form: null,
      formaction: null,
      height: null,
      list: null,
      max: null,
      maxlength: null,
      min: null,
      name: null,
      pattern: null,
      placeholder: null,
      size: null,
      src: null,
      step: null,
      value: null,
      width: null,
      accept: ["audio/*", "video/*", "image/*"],
      autocomplete: ["on", "off"],
      autofocus: ["autofocus"],
      checked: ["checked"],
      disabled: ["disabled"],
      formenctype: aO,
      formmethod: tO,
      formnovalidate: ["novalidate"],
      formtarget: V,
      multiple: ["multiple"],
      readonly: ["readonly"],
      required: ["required"],
      type: [
        "hidden",
        "text",
        "search",
        "tel",
        "url",
        "email",
        "password",
        "datetime",
        "date",
        "month",
        "week",
        "time",
        "datetime-local",
        "number",
        "range",
        "color",
        "checkbox",
        "radio",
        "file",
        "submit",
        "image",
        "reset",
        "button"
      ]
    }
  },
  ins: { attrs: { cite: null, datetime: null } },
  kbd: u,
  keygen: {
    attrs: {
      challenge: null,
      form: null,
      name: null,
      autofocus: ["autofocus"],
      disabled: ["disabled"],
      keytype: ["RSA"]
    }
  },
  label: { attrs: { for: null, form: null } },
  legend: u,
  li: { attrs: { value: null } },
  link: {
    attrs: {
      href: null,
      type: null,
      hreflang: null,
      media: null,
      sizes: ["all", "16x16", "16x16 32x32", "16x16 32x32 64x64"]
    }
  },
  map: { attrs: { name: null } },
  mark: u,
  menu: { attrs: { label: null, type: ["list", "context", "toolbar"] } },
  meta: {
    attrs: {
      content: null,
      charset: eO,
      name: ["viewport", "application-name", "author", "description", "generator", "keywords"],
      "http-equiv": ["content-language", "content-type", "default-style", "refresh"]
    }
  },
  meter: { attrs: { value: null, min: null, low: null, high: null, max: null, optimum: null } },
  nav: u,
  noscript: u,
  object: {
    attrs: {
      data: null,
      type: null,
      name: null,
      usemap: null,
      form: null,
      width: null,
      height: null,
      typemustmatch: ["typemustmatch"]
    }
  },
  ol: {
    attrs: { reversed: ["reversed"], start: null, type: ["1", "a", "A", "i", "I"] },
    children: ["li", "script", "template", "ul", "ol"]
  },
  optgroup: { attrs: { disabled: ["disabled"], label: null } },
  option: { attrs: { disabled: ["disabled"], label: null, selected: ["selected"], value: null } },
  output: { attrs: { for: null, form: null, name: null } },
  p: u,
  param: { attrs: { name: null, value: null } },
  pre: u,
  progress: { attrs: { value: null, max: null } },
  q: { attrs: { cite: null } },
  rp: u,
  rt: u,
  ruby: u,
  samp: u,
  script: {
    attrs: {
      type: ["text/javascript"],
      src: null,
      async: ["async"],
      defer: ["defer"],
      charset: eO
    }
  },
  section: u,
  select: {
    attrs: {
      form: null,
      name: null,
      size: null,
      autofocus: ["autofocus"],
      disabled: ["disabled"],
      multiple: ["multiple"]
    }
  },
  slot: { attrs: { name: null } },
  small: u,
  source: { attrs: { src: null, type: null, media: null } },
  span: u,
  strong: u,
  style: {
    attrs: {
      type: ["text/css"],
      media: null,
      scoped: null
    }
  },
  sub: u,
  summary: u,
  sup: u,
  table: u,
  tbody: u,
  td: { attrs: { colspan: null, rowspan: null, headers: null } },
  template: u,
  textarea: {
    attrs: {
      dirname: null,
      form: null,
      maxlength: null,
      name: null,
      placeholder: null,
      rows: null,
      cols: null,
      autofocus: ["autofocus"],
      disabled: ["disabled"],
      readonly: ["readonly"],
      required: ["required"],
      wrap: ["soft", "hard"]
    }
  },
  tfoot: u,
  th: { attrs: { colspan: null, rowspan: null, headers: null, scope: ["row", "col", "rowgroup", "colgroup"] } },
  thead: u,
  time: { attrs: { datetime: null } },
  title: u,
  tr: u,
  track: {
    attrs: {
      src: null,
      label: null,
      default: null,
      kind: ["subtitles", "captions", "descriptions", "chapters", "metadata"],
      srclang: null
    }
  },
  ul: { children: ["li", "script", "template", "ul", "ol"] },
  var: u,
  video: {
    attrs: {
      src: null,
      poster: null,
      width: null,
      height: null,
      crossorigin: ["anonymous", "use-credentials"],
      preload: ["auto", "metadata", "none"],
      autoplay: ["autoplay"],
      mediagroup: ["movie"],
      muted: ["muted"],
      controls: ["controls"]
    }
  },
  wbr: u
}, Xe = {
  accesskey: null,
  class: null,
  contenteditable: g,
  contextmenu: null,
  dir: ["ltr", "rtl", "auto"],
  draggable: ["true", "false", "auto"],
  dropzone: ["copy", "move", "link", "string:", "file:"],
  hidden: ["hidden"],
  id: null,
  inert: ["inert"],
  itemid: null,
  itemprop: null,
  itemref: null,
  itemscope: ["itemscope"],
  itemtype: null,
  lang: ["ar", "bn", "de", "en-GB", "en-US", "es", "fr", "hi", "id", "ja", "pa", "pt", "ru", "tr", "zh"],
  spellcheck: g,
  autocorrect: g,
  autocapitalize: g,
  style: null,
  tabindex: null,
  title: null,
  translate: ["yes", "no"],
  rel: ["stylesheet", "alternate", "author", "bookmark", "help", "license", "next", "nofollow", "noreferrer", "prefetch", "prev", "search", "tag"],
  role: /* @__PURE__ */ "alert application article banner button cell checkbox complementary contentinfo dialog document feed figure form grid gridcell heading img list listbox listitem main navigation region row rowgroup search switch tab table tabpanel textbox timer".split(" "),
  "aria-activedescendant": null,
  "aria-atomic": g,
  "aria-autocomplete": ["inline", "list", "both", "none"],
  "aria-busy": g,
  "aria-checked": ["true", "false", "mixed", "undefined"],
  "aria-controls": null,
  "aria-describedby": null,
  "aria-disabled": g,
  "aria-dropeffect": null,
  "aria-expanded": ["true", "false", "undefined"],
  "aria-flowto": null,
  "aria-grabbed": ["true", "false", "undefined"],
  "aria-haspopup": g,
  "aria-hidden": g,
  "aria-invalid": ["true", "false", "grammar", "spelling"],
  "aria-label": null,
  "aria-labelledby": null,
  "aria-level": null,
  "aria-live": ["off", "polite", "assertive"],
  "aria-multiline": g,
  "aria-multiselectable": g,
  "aria-owns": null,
  "aria-posinset": null,
  "aria-pressed": ["true", "false", "mixed", "undefined"],
  "aria-readonly": g,
  "aria-relevant": null,
  "aria-required": g,
  "aria-selected": ["true", "false", "undefined"],
  "aria-setsize": null,
  "aria-sort": ["ascending", "descending", "none", "other"],
  "aria-valuemax": null,
  "aria-valuemin": null,
  "aria-valuenow": null,
  "aria-valuetext": null
}, Pe = /* @__PURE__ */ "beforeunload copy cut dragstart dragover dragleave dragenter dragend drag paste focus blur change click load mousedown mouseenter mouseleave mouseup keydown keyup resize scroll unload".split(" ").map((e) => "on" + e);
for (let e of Pe)
  Xe[e] = null;
class v {
  constructor(O, t) {
    this.tags = { ...va, ...O }, this.globalAttrs = { ...Xe, ...t }, this.allTags = Object.keys(this.tags), this.globalAttrNames = Object.keys(this.globalAttrs);
  }
}
v.default = /* @__PURE__ */ new v();
function Y(e, O, t = e.length) {
  if (!O)
    return "";
  let a = O.firstChild, i = a && a.getChild("TagName");
  return i ? e.sliceString(i.from, Math.min(i.to, t)) : "";
}
function T(e, O = !1) {
  for (; e; e = e.parent)
    if (e.name == "Element")
      if (O)
        O = !1;
      else
        return e;
  return null;
}
function me(e, O, t) {
  let a = t.tags[Y(e, T(O))];
  return (a == null ? void 0 : a.children) || t.allTags;
}
function fO(e, O) {
  let t = [];
  for (let a = T(O); a && !a.type.isTop; a = T(a.parent)) {
    let i = Y(e, a);
    if (i && a.lastChild.name == "CloseTag")
      break;
    i && t.indexOf(i) < 0 && (O.name == "EndTag" || O.from >= a.firstChild.to) && t.push(i);
  }
  return t;
}
const Ze = /^[:\-\.\w\u00b7-\uffff]*$/;
function EO(e, O, t, a, i) {
  let s = /\s*>/.test(e.sliceDoc(i, i + 5)) ? "" : ">", r = T(t, t.name == "StartTag" || t.name == "TagName");
  return {
    from: a,
    to: i,
    options: me(e.doc, r, O).map((l) => ({ label: l, type: "type" })).concat(fO(e.doc, t).map((l, n) => ({
      label: "/" + l,
      apply: "/" + l + s,
      type: "type",
      boost: 99 - n
    }))),
    validFor: /^\/?[:\-\.\w\u00b7-\uffff]*$/
  };
}
function NO(e, O, t, a) {
  let i = /\s*>/.test(e.sliceDoc(a, a + 5)) ? "" : ">";
  return {
    from: t,
    to: a,
    options: fO(e.doc, O).map((s, r) => ({ label: s, apply: s + i, type: "type", boost: 99 - r })),
    validFor: Ze
  };
}
function _a(e, O, t, a) {
  let i = [], s = 0;
  for (let r of me(e.doc, t, O))
    i.push({ label: "<" + r, type: "type" });
  for (let r of fO(e.doc, t))
    i.push({ label: "</" + r + ">", type: "type", boost: 99 - s++ });
  return { from: a, to: a, options: i, validFor: /^<\/?[:\-\.\w\u00b7-\uffff]*$/ };
}
function Wa(e, O, t, a, i) {
  let s = T(t), r = s ? O.tags[Y(e.doc, s)] : null, l = r && r.attrs ? Object.keys(r.attrs) : [], n = r && r.globalAttrs === !1 ? l : l.length ? l.concat(O.globalAttrNames) : O.globalAttrNames;
  return {
    from: a,
    to: i,
    options: n.map((Q) => ({ label: Q, type: "property" })),
    validFor: Ze
  };
}
function qa(e, O, t, a, i) {
  var s;
  let r = (s = t.parent) === null || s === void 0 ? void 0 : s.getChild("AttributeName"), l = [], n;
  if (r) {
    let Q = e.sliceDoc(r.from, r.to), $ = O.globalAttrs[Q];
    if (!$) {
      let c = T(t), h = c ? O.tags[Y(e.doc, c)] : null;
      $ = (h == null ? void 0 : h.attrs) && h.attrs[Q];
    }
    if ($) {
      let c = e.sliceDoc(a, i).toLowerCase(), h = '"', p = '"';
      /^['"]/.test(c) ? (n = c[0] == '"' ? /^[^"]*$/ : /^[^']*$/, h = "", p = e.sliceDoc(i, i + 1) == c[0] ? "" : c[0], c = c.slice(1), a++) : n = /^[^\s<>='"]*$/;
      for (let f of $)
        l.push({ label: f, apply: h + f + p, type: "constant" });
    }
  }
  return { from: a, to: i, options: l, validFor: n };
}
function be(e, O) {
  let { state: t, pos: a } = O, i = _(t).resolveInner(a, -1), s = i.resolve(a);
  for (let r = a, l; s == i && (l = i.childBefore(r)); ) {
    let n = l.lastChild;
    if (!n || !n.type.isError || n.from < n.to)
      break;
    s = i = l, r = n.from;
  }
  return i.name == "TagName" ? i.parent && /CloseTag$/.test(i.parent.name) ? NO(t, i, i.from, a) : EO(t, e, i, i.from, a) : i.name == "StartTag" || i.name == "IncompleteTag" ? EO(t, e, i, a, a) : i.name == "StartCloseTag" || i.name == "IncompleteCloseTag" ? NO(t, i, a, a) : i.name == "OpenTag" || i.name == "SelfClosingTag" || i.name == "AttributeName" ? Wa(t, e, i, i.name == "AttributeName" ? i.from : a, a) : i.name == "Is" || i.name == "AttributeValue" || i.name == "UnquotedAttributeValue" ? qa(t, e, i, i.name == "Is" ? a : i.from, a) : O.explicit && (s.name == "Element" || s.name == "Text" || s.name == "Document") ? _a(t, e, i, a) : null;
}
function Ia(e) {
  return be(v.default, e);
}
function ja(e) {
  let { extraTags: O, extraGlobalAttributes: t } = e, a = t || O ? new v(O, t) : v.default;
  return (i) => be(a, i);
}
const Ca = /* @__PURE__ */ m.parser.configure({ top: "SingleExpression" }), xe = [
  {
    tag: "script",
    attrs: (e) => e.type == "text/typescript" || e.lang == "ts",
    parser: Se.parser
  },
  {
    tag: "script",
    attrs: (e) => e.type == "text/babel" || e.type == "text/jsx",
    parser: de.parser
  },
  {
    tag: "script",
    attrs: (e) => e.type == "text/typescript-jsx",
    parser: ge.parser
  },
  {
    tag: "script",
    attrs(e) {
      return /^(importmap|speculationrules|application\/(.+\+)?json)$/i.test(e.type);
    },
    parser: Ca
  },
  {
    tag: "script",
    attrs(e) {
      return !e.type || /^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^module$|^$/i.test(e.type);
    },
    parser: m.parser
  },
  {
    tag: "style",
    attrs(e) {
      return (!e.lang || e.lang == "css") && (!e.type || /^(text\/)?(x-)?(stylesheet|css)$/i.test(e.type));
    },
    parser: J.parser
  }
], we = /* @__PURE__ */ [
  {
    name: "style",
    parser: /* @__PURE__ */ J.parser.configure({ top: "Styles" })
  }
].concat(/* @__PURE__ */ Pe.map((e) => ({ name: e, parser: m.parser }))), ke = /* @__PURE__ */ oO.define({
  name: "html",
  parser: /* @__PURE__ */ Tt.configure({
    props: [
      /* @__PURE__ */ QO.add({
        Element(e) {
          let O = /^(\s*)(<\/)?/.exec(e.textAfter);
          return e.node.to <= e.pos + O[0].length ? e.continue() : e.lineIndent(e.node.from) + (O[2] ? 0 : e.unit);
        },
        "OpenTag CloseTag SelfClosingTag"(e) {
          return e.column(e.node.from) + e.unit;
        },
        Document(e) {
          if (e.pos + /\s*/.exec(e.textAfter)[0].length < e.node.to)
            return e.continue();
          let O = null, t;
          for (let a = e.node; ; ) {
            let i = a.lastChild;
            if (!i || i.name != "Element" || i.to != a.to)
              break;
            O = a = i;
          }
          return O && !((t = O.lastChild) && (t.name == "CloseTag" || t.name == "SelfClosingTag")) ? e.lineIndent(O.from) + e.unit : null;
        }
      }),
      /* @__PURE__ */ cO.add({
        Element(e) {
          let O = e.firstChild, t = e.lastChild;
          return !O || O.name != "OpenTag" ? null : { from: O.to, to: t.name == "CloseTag" ? t.from : e.to };
        }
      }),
      /* @__PURE__ */ je.add({
        "OpenTag CloseTag": (e) => e.getChild("TagName")
      })
    ]
  }),
  languageData: {
    commentTokens: { block: { open: "<!--", close: "-->" } },
    indentOnInput: /^\s*<\/\w+\W$/,
    wordChars: "-_"
  }
}), I = /* @__PURE__ */ ke.configure({
  wrap: /* @__PURE__ */ ne(xe, we)
});
function Aa(e = {}) {
  let O = "", t;
  e.matchClosingTags === !1 && (O = "noMatch"), e.selfClosingTags === !0 && (O = (O ? O + " " : "") + "selfClosing"), (e.nestedLanguages && e.nestedLanguages.length || e.nestedAttributes && e.nestedAttributes.length) && (t = ne((e.nestedLanguages || []).concat(xe), (e.nestedAttributes || []).concat(we)));
  let a = t ? ke.configure({ wrap: t, dialect: O }) : O ? I.configure({ dialect: O }) : I;
  return new uO(a, [
    I.data.of({ autocomplete: ja(e) }),
    e.autoCloseTags !== !1 ? za : [],
    Ya().support,
    ta().support
  ]);
}
const BO = /* @__PURE__ */ new Set(/* @__PURE__ */ "area base br col command embed frame hr img input keygen link meta param source track wbr menuitem".split(" ")), za = /* @__PURE__ */ LO.inputHandler.of((e, O, t, a, i) => {
  if (e.composing || e.state.readOnly || O != t || a != ">" && a != "/" || !I.isActiveAt(e.state, O, -1))
    return !1;
  let s = i(), { state: r } = s, l = r.changeByRange((n) => {
    var Q, $, c;
    let h = r.doc.sliceString(n.from - 1, n.to) == a, { head: p } = n, f = _(r).resolveInner(p, -1), S;
    if (h && a == ">" && f.name == "EndTag") {
      let d = f.parent;
      if ((($ = (Q = d.parent) === null || Q === void 0 ? void 0 : Q.lastChild) === null || $ === void 0 ? void 0 : $.name) != "CloseTag" && (S = Y(r.doc, d.parent, p)) && !BO.has(S)) {
        let w = p + (r.doc.sliceString(p, p + 1) === ">" ? 1 : 0), W = `</${S}>`;
        return { range: n, changes: { from: p, to: w, insert: W } };
      }
    } else if (h && a == "/" && f.name == "IncompleteCloseTag") {
      let d = f.parent;
      if (f.from == p - 2 && ((c = d.lastChild) === null || c === void 0 ? void 0 : c.name) != "CloseTag" && (S = Y(r.doc, d, p)) && !BO.has(S)) {
        let w = p + (r.doc.sliceString(p, p + 1) === ">" ? 1 : 0), W = `${S}>`;
        return {
          range: C.cursor(p + W.length, -1),
          changes: { from: p, to: w, insert: W }
        };
      }
    }
    return { range: n };
  });
  return l.changes.empty ? !1 : (e.dispatch([
    s,
    r.update(l, {
      userEvent: "input.complete",
      scrollIntoView: !0
    })
  ]), !0);
});
export {
  za as autoCloseTags,
  Aa as html,
  Ia as htmlCompletionSource,
  ja as htmlCompletionSourceWith,
  I as htmlLanguage
};
//# sourceMappingURL=index-C3L3IBK_.mjs.map
