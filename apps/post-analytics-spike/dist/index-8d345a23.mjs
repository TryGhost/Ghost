function ds(e) {
  if (e.__esModule)
    return e;
  var t = e.default;
  if (typeof t == "function") {
    var n = function r() {
      return this instanceof r ? Reflect.construct(t, arguments, this.constructor) : t.apply(this, arguments);
    };
    n.prototype = t.prototype;
  } else
    n = {};
  return Object.defineProperty(n, "__esModule", { value: !0 }), Object.keys(e).forEach(function(r) {
    var o = Object.getOwnPropertyDescriptor(e, r);
    Object.defineProperty(n, r, o.get ? o : {
      enumerable: !0,
      get: function() {
        return e[r];
      }
    });
  }), n;
}
var Ir = { exports: {} }, gt = {};
const De = React.Children, Mr = React.Component, Nr = React.Fragment, fs = React.Profiler, hs = React.PureComponent, ps = React.StrictMode, gs = React.Suspense, ms = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, ys = React.act, gn = React.cloneElement, we = React.createContext, N = React.createElement, bs = React.createFactory, vs = React.createRef, j = React, mt = React.forwardRef, Pe = React.isValidElement, _s = React.lazy, Pr = React.memo, Es = React.startTransition, ws = React.unstable_act, $ = React.useCallback, le = React.useContext, xs = React.useDebugValue, Ss = React.useDeferredValue, z = React.useEffect, kr = React.useId, Cs = React.useImperativeHandle, Os = React.useInsertionEffect, Rs = React.useLayoutEffect, mn = React.useMemo, Ar = React.useReducer, Ts = React.useRef, be = React.useState, Ds = React.useSyncExternalStore, Is = React.useTransition, $r = React.version, Ms = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: De,
  Component: Mr,
  Fragment: Nr,
  Profiler: fs,
  PureComponent: hs,
  StrictMode: ps,
  Suspense: gs,
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: ms,
  act: ys,
  cloneElement: gn,
  createContext: we,
  createElement: N,
  createFactory: bs,
  createRef: vs,
  default: j,
  forwardRef: mt,
  isValidElement: Pe,
  lazy: _s,
  memo: Pr,
  startTransition: Es,
  unstable_act: ws,
  useCallback: $,
  useContext: le,
  useDebugValue: xs,
  useDeferredValue: Ss,
  useEffect: z,
  useId: kr,
  useImperativeHandle: Cs,
  useInsertionEffect: Os,
  useLayoutEffect: Rs,
  useMemo: mn,
  useReducer: Ar,
  useRef: Ts,
  useState: be,
  useSyncExternalStore: Ds,
  useTransition: Is,
  version: $r
}, Symbol.toStringTag, { value: "Module" })), Ns = /* @__PURE__ */ ds(Ms);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ps = Ns, ks = Symbol.for("react.element"), As = Symbol.for("react.fragment"), $s = Object.prototype.hasOwnProperty, Fs = Ps.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, js = { key: !0, ref: !0, __self: !0, __source: !0 };
function Fr(e, t, n) {
  var r, o = {}, s = null, i = null;
  n !== void 0 && (s = "" + n), t.key !== void 0 && (s = "" + t.key), t.ref !== void 0 && (i = t.ref);
  for (r in t)
    $s.call(t, r) && !js.hasOwnProperty(r) && (o[r] = t[r]);
  if (e && e.defaultProps)
    for (r in t = e.defaultProps, t)
      o[r] === void 0 && (o[r] = t[r]);
  return { $$typeof: ks, type: e, key: s, ref: i, props: o, _owner: Fs.current };
}
gt.Fragment = As;
gt.jsx = Fr;
gt.jsxs = Fr;
Ir.exports = gt;
var D = Ir.exports;
function Ls(e, t) {
  typeof e == "function" ? e(t) : e != null && (e.current = t);
}
function Us(...e) {
  return (t) => e.forEach((n) => Ls(n, t));
}
ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
ReactDOM.createPortal;
ReactDOM.createRoot;
ReactDOM;
ReactDOM.findDOMNode;
ReactDOM.flushSync;
ReactDOM.hydrate;
ReactDOM.hydrateRoot;
ReactDOM.render;
ReactDOM.unmountComponentAtNode;
ReactDOM.unstable_batchedUpdates;
ReactDOM.unstable_renderSubtreeIntoContainer;
ReactDOM.version;
var jr = mt((e, t) => {
  const { children: n, ...r } = e, o = De.toArray(n), s = o.find(Hs);
  if (s) {
    const i = s.props.children, a = o.map((c) => c === s ? De.count(i) > 1 ? De.only(null) : Pe(i) ? i.props.children : null : c);
    return /* @__PURE__ */ D.jsx(Bt, { ...r, ref: t, children: Pe(i) ? gn(i, void 0, a) : null });
  }
  return /* @__PURE__ */ D.jsx(Bt, { ...r, ref: t, children: n });
});
jr.displayName = "Slot";
var Bt = mt((e, t) => {
  const { children: n, ...r } = e;
  if (Pe(n)) {
    const o = zs(n);
    return gn(n, {
      ...Gs(r, n.props),
      // @ts-ignore
      ref: t ? Us(t, o) : o
    });
  }
  return De.count(n) > 1 ? De.only(null) : null;
});
Bt.displayName = "SlotClone";
var qs = ({ children: e }) => /* @__PURE__ */ D.jsx(D.Fragment, { children: e });
function Hs(e) {
  return Pe(e) && e.type === qs;
}
function Gs(e, t) {
  const n = { ...t };
  for (const r in t) {
    const o = e[r], s = t[r];
    /^on[A-Z]/.test(r) ? o && s ? n[r] = (...a) => {
      s(...a), o(...a);
    } : o && (n[r] = o) : r === "style" ? n[r] = { ...o, ...s } : r === "className" && (n[r] = [o, s].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function zs(e) {
  var r, o;
  let t = (r = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : r.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = (o = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : o.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
function Lr(e) {
  var t, n, r = "";
  if (typeof e == "string" || typeof e == "number")
    r += e;
  else if (typeof e == "object")
    if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++)
        e[t] && (n = Lr(e[t])) && (r && (r += " "), r += n);
    } else
      for (n in e)
        e[n] && (r && (r += " "), r += n);
  return r;
}
function Ur() {
  for (var e, t, n = 0, r = "", o = arguments.length; n < o; n++)
    (e = arguments[n]) && (t = Lr(e)) && (r && (r += " "), r += t);
  return r;
}
var I = globalThis && globalThis.__assign || function() {
  return I = Object.assign || function(e) {
    for (var t, n = 1, r = arguments.length; n < r; n++) {
      t = arguments[n];
      for (var o in t)
        Object.prototype.hasOwnProperty.call(t, o) && (e[o] = t[o]);
    }
    return e;
  }, I.apply(this, arguments);
}, qr = globalThis && globalThis.__rest || function(e, t) {
  var n = {};
  for (var r in e)
    Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var o = 0, r = Object.getOwnPropertySymbols(e); o < r.length; o++)
      t.indexOf(r[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[o]) && (n[r[o]] = e[r[o]]);
  return n;
}, jt = Symbol("NiceModalId"), yn = {}, Ae = j.createContext(yn), Hr = j.createContext(null), Q = {}, ze = {}, Bs = 0, $e = function() {
  throw new Error("No dispatch method detected, did you embed your app with NiceModal.Provider?");
}, Gr = function() {
  return "_nice_modal_" + Bs++;
}, zr = function(e, t) {
  var n, r, o;
  switch (e === void 0 && (e = yn), t.type) {
    case "nice-modal/show": {
      var s = t.payload, i = s.modalId, a = s.args;
      return I(I({}, e), (n = {}, n[i] = I(I({}, e[i]), {
        id: i,
        args: a,
        // If modal is not mounted, mount it first then make it visible.
        // There is logic inside HOC wrapper to make it visible after its first mount.
        // This mechanism ensures the entering transition.
        visible: !!ze[i],
        delayVisible: !ze[i]
      }), n));
    }
    case "nice-modal/hide": {
      var i = t.payload.modalId;
      return e[i] ? I(I({}, e), (r = {}, r[i] = I(I({}, e[i]), { visible: !1 }), r)) : e;
    }
    case "nice-modal/remove": {
      var i = t.payload.modalId, c = I({}, e);
      return delete c[i], c;
    }
    case "nice-modal/set-flags": {
      var u = t.payload, i = u.modalId, l = u.flags;
      return I(I({}, e), (o = {}, o[i] = I(I({}, e[i]), l), o));
    }
    default:
      return e;
  }
};
function Ws(e) {
  var t;
  return (t = Q[e]) === null || t === void 0 ? void 0 : t.comp;
}
function Vs(e, t) {
  return {
    type: "nice-modal/show",
    payload: {
      modalId: e,
      args: t
    }
  };
}
function Qs(e, t) {
  return {
    type: "nice-modal/set-flags",
    payload: {
      modalId: e,
      flags: t
    }
  };
}
function Ks(e) {
  return {
    type: "nice-modal/hide",
    payload: {
      modalId: e
    }
  };
}
function Ys(e) {
  return {
    type: "nice-modal/remove",
    payload: {
      modalId: e
    }
  };
}
var te = {}, Ie = {}, yt = function(e) {
  return typeof e == "string" ? e : (e[jt] || (e[jt] = Gr()), e[jt]);
};
function bn(e, t) {
  var n = yt(e);
  if (typeof e != "string" && !Q[n] && bt(n, e), $e(Vs(n, t)), !te[n]) {
    var r, o, s = new Promise(function(i, a) {
      r = i, o = a;
    });
    te[n] = {
      resolve: r,
      reject: o,
      promise: s
    };
  }
  return te[n].promise;
}
function vn(e) {
  var t = yt(e);
  if ($e(Ks(t)), delete te[t], !Ie[t]) {
    var n, r, o = new Promise(function(s, i) {
      n = s, r = i;
    });
    Ie[t] = {
      resolve: n,
      reject: r,
      promise: o
    };
  }
  return Ie[t].promise;
}
var Br = function(e) {
  var t = yt(e);
  $e(Ys(t)), delete te[t], delete Ie[t];
}, Xs = function(e, t) {
  $e(Qs(e, t));
};
function Wr(e, t) {
  var n = le(Ae), r = le(Hr), o = null, s = e && typeof e != "string";
  if (e ? o = yt(e) : o = r, !o)
    throw new Error("No modal id found in NiceModal.useModal.");
  var i = o;
  z(function() {
    s && !Q[i] && bt(i, e, t);
  }, [s, i, e, t]);
  var a = n[i], c = $(function(g) {
    return bn(i, g);
  }, [i]), u = $(function() {
    return vn(i);
  }, [i]), l = $(function() {
    return Br(i);
  }, [i]), d = $(function(g) {
    var m;
    (m = te[i]) === null || m === void 0 || m.resolve(g), delete te[i];
  }, [i]), f = $(function(g) {
    var m;
    (m = te[i]) === null || m === void 0 || m.reject(g), delete te[i];
  }, [i]), h = $(function(g) {
    var m;
    (m = Ie[i]) === null || m === void 0 || m.resolve(g), delete Ie[i];
  }, [i]);
  return mn(function() {
    return {
      id: i,
      args: a == null ? void 0 : a.args,
      visible: !!(a != null && a.visible),
      keepMounted: !!(a != null && a.keepMounted),
      show: c,
      hide: u,
      remove: l,
      resolve: d,
      reject: f,
      resolveHide: h
    };
  }, [
    i,
    a == null ? void 0 : a.args,
    a == null ? void 0 : a.visible,
    a == null ? void 0 : a.keepMounted,
    c,
    u,
    l,
    d,
    f,
    h
  ]);
}
var Js = function(e) {
  return function(t) {
    var n, r = t.defaultVisible, o = t.keepMounted, s = t.id, i = qr(t, ["defaultVisible", "keepMounted", "id"]), a = Wr(s), c = a.args, u = a.show, l = le(Ae), d = !!l[s];
    z(function() {
      return r && u(), ze[s] = !0, function() {
        delete ze[s];
      };
    }, [s, u, r]), z(function() {
      o && Xs(s, { keepMounted: !0 });
    }, [s, o]);
    var f = (n = l[s]) === null || n === void 0 ? void 0 : n.delayVisible;
    return z(function() {
      f && u(c);
    }, [f, c, u]), d ? j.createElement(
      Hr.Provider,
      { value: s },
      j.createElement(e, I({}, i, c))
    ) : null;
  };
}, bt = function(e, t, n) {
  Q[e] ? Q[e].props = n : Q[e] = { comp: t, props: n };
}, Zs = function(e) {
  delete Q[e];
}, Vr = function() {
  var e = le(Ae), t = Object.keys(e).filter(function(r) {
    return !!e[r];
  });
  t.forEach(function(r) {
    if (!Q[r] && !ze[r]) {
      console.warn("No modal found for id: " + r + ". Please check the id or if it is registered or declared via JSX.");
      return;
    }
  });
  var n = t.filter(function(r) {
    return Q[r];
  }).map(function(r) {
    return I({ id: r }, Q[r]);
  });
  return j.createElement(j.Fragment, null, n.map(function(r) {
    return j.createElement(r.comp, I({ key: r.id, id: r.id }, r.props));
  }));
}, ei = function(e) {
  var t = e.children, n = Ar(zr, yn), r = n[0];
  return $e = n[1], j.createElement(
    Ae.Provider,
    { value: r },
    t,
    j.createElement(Vr, null)
  );
}, ti = function(e) {
  var t = e.children, n = e.dispatch, r = e.modals;
  return !n || !r ? j.createElement(ei, null, t) : ($e = n, j.createElement(
    Ae.Provider,
    { value: r },
    t,
    j.createElement(Vr, null)
  ));
}, ni = function(e) {
  var t = e.id, n = e.component;
  return z(function() {
    return bt(t, n), function() {
      Zs(t);
    };
  }, [t, n]), null;
}, ri = function(e) {
  var t, n = e.modal, r = e.handler, o = r === void 0 ? {} : r, s = qr(e, ["modal", "handler"]), i = mn(function() {
    return Gr();
  }, []), a = typeof n == "string" ? (t = Q[n]) === null || t === void 0 ? void 0 : t.comp : n;
  if (!o)
    throw new Error("No handler found in NiceModal.ModalHolder.");
  if (!a)
    throw new Error("No modal found for id: " + n + " in NiceModal.ModalHolder.");
  return o.show = $(function(c) {
    return bn(i, c);
  }, [i]), o.hide = $(function() {
    return vn(i);
  }, [i]), j.createElement(a, I({ id: i }, s));
}, oi = function(e) {
  return {
    visible: e.visible,
    onOk: function() {
      return e.hide();
    },
    onCancel: function() {
      return e.hide();
    },
    afterClose: function() {
      e.resolveHide(), e.keepMounted || e.remove();
    }
  };
}, si = function(e) {
  return {
    visible: e.visible,
    onClose: function() {
      return e.hide();
    },
    afterVisibleChange: function(t) {
      t || e.resolveHide(), !t && !e.keepMounted && e.remove();
    }
  };
}, ii = function(e) {
  return {
    open: e.visible,
    onClose: function() {
      return e.hide();
    },
    onExited: function() {
      e.resolveHide(), !e.keepMounted && e.remove();
    }
  };
}, ai = function(e) {
  return {
    show: e.visible,
    onHide: function() {
      return e.hide();
    },
    onExited: function() {
      e.resolveHide(), !e.keepMounted && e.remove();
    }
  };
}, Qr = {
  Provider: ti,
  ModalDef: ni,
  ModalHolder: ri,
  NiceModalContext: Ae,
  create: Js,
  register: bt,
  getModal: Ws,
  show: bn,
  hide: vn,
  remove: Br,
  useModal: Wr,
  reducer: zr,
  antdModal: oi,
  antdDrawer: si,
  muiDialog: ii,
  bootstrapDialog: ai
};
let ci = { data: "" }, ui = (e) => typeof window == "object" ? ((e ? e.querySelector("#_goober") : window._goober) || Object.assign((e || document.head).appendChild(document.createElement("style")), { innerHTML: " ", id: "_goober" })).firstChild : e || ci, li = /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g, di = /\/\*[^]*?\*\/|  +/g, qn = /\n+/g, ce = (e, t) => {
  let n = "", r = "", o = "";
  for (let s in e) {
    let i = e[s];
    s[0] == "@" ? s[1] == "i" ? n = s + " " + i + ";" : r += s[1] == "f" ? ce(i, s) : s + "{" + ce(i, s[1] == "k" ? "" : t) + "}" : typeof i == "object" ? r += ce(i, t ? t.replace(/([^,])+/g, (a) => s.replace(/(^:.*)|([^,])+/g, (c) => /&/.test(c) ? c.replace(/&/g, a) : a ? a + " " + c : c)) : s) : i != null && (s = /^--/.test(s) ? s : s.replace(/[A-Z]/g, "-$&").toLowerCase(), o += ce.p ? ce.p(s, i) : s + ":" + i + ";");
  }
  return n + (t && o ? t + "{" + o + "}" : o) + r;
}, J = {}, Kr = (e) => {
  if (typeof e == "object") {
    let t = "";
    for (let n in e)
      t += n + Kr(e[n]);
    return t;
  }
  return e;
}, fi = (e, t, n, r, o) => {
  let s = Kr(e), i = J[s] || (J[s] = ((c) => {
    let u = 0, l = 11;
    for (; u < c.length; )
      l = 101 * l + c.charCodeAt(u++) >>> 0;
    return "go" + l;
  })(s));
  if (!J[i]) {
    let c = s !== e ? e : ((u) => {
      let l, d, f = [{}];
      for (; l = li.exec(u.replace(di, "")); )
        l[4] ? f.shift() : l[3] ? (d = l[3].replace(qn, " ").trim(), f.unshift(f[0][d] = f[0][d] || {})) : f[0][l[1]] = l[2].replace(qn, " ").trim();
      return f[0];
    })(e);
    J[i] = ce(o ? { ["@keyframes " + i]: c } : c, n ? "" : "." + i);
  }
  let a = n && J.g ? J.g : null;
  return n && (J.g = J[i]), ((c, u, l, d) => {
    d ? u.data = u.data.replace(d, c) : u.data.indexOf(c) === -1 && (u.data = l ? c + u.data : u.data + c);
  })(J[i], t, r, a), i;
}, hi = (e, t, n) => e.reduce((r, o, s) => {
  let i = t[s];
  if (i && i.call) {
    let a = i(n), c = a && a.props && a.props.className || /^go/.test(a) && a;
    i = c ? "." + c : a && typeof a == "object" ? a.props ? "" : ce(a, "") : a === !1 ? "" : a;
  }
  return r + o + (i ?? "");
}, "");
function vt(e) {
  let t = this || {}, n = e.call ? e(t.p) : e;
  return fi(n.unshift ? n.raw ? hi(n, [].slice.call(arguments, 1), t.p) : n.reduce((r, o) => Object.assign(r, o && o.call ? o(t.p) : o), {}) : n, ui(t.target), t.g, t.o, t.k);
}
let Yr, Wt, Vt;
vt.bind({ g: 1 });
let re = vt.bind({ k: 1 });
function pi(e, t, n, r) {
  ce.p = t, Yr = e, Wt = n, Vt = r;
}
function fe(e, t) {
  let n = this || {};
  return function() {
    let r = arguments;
    function o(s, i) {
      let a = Object.assign({}, s), c = a.className || o.className;
      n.p = Object.assign({ theme: Wt && Wt() }, a), n.o = / *go\d+/.test(c), a.className = vt.apply(n, r) + (c ? " " + c : ""), t && (a.ref = i);
      let u = e;
      return e[0] && (u = a.as || e, delete a.as), Vt && u[0] && Vt(a), Yr(u, a);
    }
    return t ? t(o) : o;
  };
}
var gi = (e) => typeof e == "function", ct = (e, t) => gi(e) ? e(t) : e, mi = (() => {
  let e = 0;
  return () => (++e).toString();
})(), Xr = (() => {
  let e;
  return () => {
    if (e === void 0 && typeof window < "u") {
      let t = matchMedia("(prefers-reduced-motion: reduce)");
      e = !t || t.matches;
    }
    return e;
  };
})(), yi = 20, ot = /* @__PURE__ */ new Map(), bi = 1e3, Hn = (e) => {
  if (ot.has(e))
    return;
  let t = setTimeout(() => {
    ot.delete(e), xe({ type: 4, toastId: e });
  }, bi);
  ot.set(e, t);
}, vi = (e) => {
  let t = ot.get(e);
  t && clearTimeout(t);
}, Qt = (e, t) => {
  switch (t.type) {
    case 0:
      return { ...e, toasts: [t.toast, ...e.toasts].slice(0, yi) };
    case 1:
      return t.toast.id && vi(t.toast.id), { ...e, toasts: e.toasts.map((s) => s.id === t.toast.id ? { ...s, ...t.toast } : s) };
    case 2:
      let { toast: n } = t;
      return e.toasts.find((s) => s.id === n.id) ? Qt(e, { type: 1, toast: n }) : Qt(e, { type: 0, toast: n });
    case 3:
      let { toastId: r } = t;
      return r ? Hn(r) : e.toasts.forEach((s) => {
        Hn(s.id);
      }), { ...e, toasts: e.toasts.map((s) => s.id === r || r === void 0 ? { ...s, visible: !1 } : s) };
    case 4:
      return t.toastId === void 0 ? { ...e, toasts: [] } : { ...e, toasts: e.toasts.filter((s) => s.id !== t.toastId) };
    case 5:
      return { ...e, pausedAt: t.time };
    case 6:
      let o = t.time - (e.pausedAt || 0);
      return { ...e, pausedAt: void 0, toasts: e.toasts.map((s) => ({ ...s, pauseDuration: s.pauseDuration + o })) };
  }
}, st = [], it = { toasts: [], pausedAt: void 0 }, xe = (e) => {
  it = Qt(it, e), st.forEach((t) => {
    t(it);
  });
}, _i = { blank: 4e3, error: 4e3, success: 2e3, loading: 1 / 0, custom: 4e3 }, Ei = (e = {}) => {
  let [t, n] = be(it);
  z(() => (st.push(n), () => {
    let o = st.indexOf(n);
    o > -1 && st.splice(o, 1);
  }), [t]);
  let r = t.toasts.map((o) => {
    var s, i;
    return { ...e, ...e[o.type], ...o, duration: o.duration || ((s = e[o.type]) == null ? void 0 : s.duration) || (e == null ? void 0 : e.duration) || _i[o.type], style: { ...e.style, ...(i = e[o.type]) == null ? void 0 : i.style, ...o.style } };
  });
  return { ...t, toasts: r };
}, wi = (e, t = "blank", n) => ({ createdAt: Date.now(), visible: !0, type: t, ariaProps: { role: "status", "aria-live": "polite" }, message: e, pauseDuration: 0, ...n, id: (n == null ? void 0 : n.id) || mi() }), Be = (e) => (t, n) => {
  let r = wi(t, e, n);
  return xe({ type: 2, toast: r }), r.id;
}, G = (e, t) => Be("blank")(e, t);
G.error = Be("error");
G.success = Be("success");
G.loading = Be("loading");
G.custom = Be("custom");
G.dismiss = (e) => {
  xe({ type: 3, toastId: e });
};
G.remove = (e) => xe({ type: 4, toastId: e });
G.promise = (e, t, n) => {
  let r = G.loading(t.loading, { ...n, ...n == null ? void 0 : n.loading });
  return e.then((o) => (G.success(ct(t.success, o), { id: r, ...n, ...n == null ? void 0 : n.success }), o)).catch((o) => {
    G.error(ct(t.error, o), { id: r, ...n, ...n == null ? void 0 : n.error });
  }), e;
};
var xi = (e, t) => {
  xe({ type: 1, toast: { id: e, height: t } });
}, Si = () => {
  xe({ type: 5, time: Date.now() });
}, Ci = (e) => {
  let { toasts: t, pausedAt: n } = Ei(e);
  z(() => {
    if (n)
      return;
    let s = Date.now(), i = t.map((a) => {
      if (a.duration === 1 / 0)
        return;
      let c = (a.duration || 0) + a.pauseDuration - (s - a.createdAt);
      if (c < 0) {
        a.visible && G.dismiss(a.id);
        return;
      }
      return setTimeout(() => G.dismiss(a.id), c);
    });
    return () => {
      i.forEach((a) => a && clearTimeout(a));
    };
  }, [t, n]);
  let r = $(() => {
    n && xe({ type: 6, time: Date.now() });
  }, [n]), o = $((s, i) => {
    let { reverseOrder: a = !1, gutter: c = 8, defaultPosition: u } = i || {}, l = t.filter((h) => (h.position || u) === (s.position || u) && h.height), d = l.findIndex((h) => h.id === s.id), f = l.filter((h, g) => g < d && h.visible).length;
    return l.filter((h) => h.visible).slice(...a ? [f + 1] : [0, f]).reduce((h, g) => h + (g.height || 0) + c, 0);
  }, [t]);
  return { toasts: t, handlers: { updateHeight: xi, startPause: Si, endPause: r, calculateOffset: o } };
}, Oi = re`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`, Ri = re`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`, Ti = re`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`, Di = fe("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(e) => e.primary || "#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Oi} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Ri} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${(e) => e.secondary || "#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${Ti} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`, Ii = re`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`, Mi = fe("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${(e) => e.secondary || "#e0e0e0"};
  border-right-color: ${(e) => e.primary || "#616161"};
  animation: ${Ii} 1s linear infinite;
`, Ni = re`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`, Pi = re`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`, ki = fe("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(e) => e.primary || "#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ni} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Pi} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${(e) => e.secondary || "#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`, Ai = fe("div")`
  position: absolute;
`, $i = fe("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`, Fi = re`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`, ji = fe("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Fi} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`, Li = ({ toast: e }) => {
  let { icon: t, type: n, iconTheme: r } = e;
  return t !== void 0 ? typeof t == "string" ? N(ji, null, t) : t : n === "blank" ? null : N($i, null, N(Mi, { ...r }), n !== "loading" && N(Ai, null, n === "error" ? N(Di, { ...r }) : N(ki, { ...r })));
}, Ui = (e) => `
0% {transform: translate3d(0,${e * -200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`, qi = (e) => `
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e * -150}%,-1px) scale(.6); opacity:0;}
`, Hi = "0%{opacity:0;} 100%{opacity:1;}", Gi = "0%{opacity:1;} 100%{opacity:0;}", zi = fe("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`, Bi = fe("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`, Wi = (e, t) => {
  let n = e.includes("top") ? 1 : -1, [r, o] = Xr() ? [Hi, Gi] : [Ui(n), qi(n)];
  return { animation: t ? `${re(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards` : `${re(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)` };
}, Vi = Pr(({ toast: e, position: t, style: n, children: r }) => {
  let o = e.height ? Wi(e.position || t || "top-center", e.visible) : { opacity: 0 }, s = N(Li, { toast: e }), i = N(Bi, { ...e.ariaProps }, ct(e.message, e));
  return N(zi, { className: e.className, style: { ...o, ...n, ...e.style } }, typeof r == "function" ? r({ icon: s, message: i }) : N(Nr, null, s, i));
});
pi(N);
var Qi = ({ id: e, className: t, style: n, onHeightUpdate: r, children: o }) => {
  let s = $((i) => {
    if (i) {
      let a = () => {
        let c = i.getBoundingClientRect().height;
        r(e, c);
      };
      a(), new MutationObserver(a).observe(i, { subtree: !0, childList: !0, characterData: !0 });
    }
  }, [e, r]);
  return N("div", { ref: s, className: t, style: n }, o);
}, Ki = (e, t) => {
  let n = e.includes("top"), r = n ? { top: 0 } : { bottom: 0 }, o = e.includes("center") ? { justifyContent: "center" } : e.includes("right") ? { justifyContent: "flex-end" } : {};
  return { left: 0, right: 0, display: "flex", position: "absolute", transition: Xr() ? void 0 : "all 230ms cubic-bezier(.21,1.02,.73,1)", transform: `translateY(${t * (n ? 1 : -1)}px)`, ...r, ...o };
}, Yi = vt`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`, Ye = 16, Xi = ({ reverseOrder: e, position: t = "top-center", toastOptions: n, gutter: r, children: o, containerStyle: s, containerClassName: i }) => {
  let { toasts: a, handlers: c } = Ci(n);
  return N("div", { style: { position: "fixed", zIndex: 9999, top: Ye, left: Ye, right: Ye, bottom: Ye, pointerEvents: "none", ...s }, className: i, onMouseEnter: c.startPause, onMouseLeave: c.endPause }, a.map((u) => {
    let l = u.position || t, d = c.calculateOffset(u, { reverseOrder: e, gutter: r, defaultPosition: t }), f = Ki(l, d);
    return N(Qi, { id: u.id, key: u.id, onHeightUpdate: c.updateHeight, className: u.visible ? Yi : "", style: f }, u.type === "custom" ? ct(u.message, u) : o ? o(u) : N(Vi, { toast: u, position: l }));
  }));
};
const Jr = j.createContext({ isDirty: !1, setGlobalDirtyState: () => {
} }), Ji = ({ children: e }) => {
  const [t, n] = be([]), r = $((o, s) => {
    n((i) => s && !i.includes(o) ? [...i, o] : !s && i.includes(o) ? i.filter((a) => a !== o) : i);
  }, []);
  return /* @__PURE__ */ D.jsx(Jr.Provider, { value: { isDirty: t.length > 0, setGlobalDirtyState: r }, children: e });
}, Zl = () => {
  const e = kr(), { isDirty: t, setGlobalDirtyState: n } = le(Jr);
  z(() => () => n(e, !1), [e, n]);
  const r = $(
    (o) => n(e, o),
    [e, n]
  );
  return {
    isDirty: t,
    setGlobalDirtyState: r
  };
}, Zi = we({
  isAnyTextFieldFocused: !1,
  setFocusState: () => {
  },
  fetchKoenigLexical: async () => {
  },
  darkMode: !1
}), ea = ({ fetchKoenigLexical: e, darkMode: t, children: n }) => {
  const [r, o] = be(!1), s = (i) => {
    o(i);
  };
  return /* @__PURE__ */ D.jsx(Zi.Provider, { value: { isAnyTextFieldFocused: r, setFocusState: s, fetchKoenigLexical: e, darkMode: t }, children: /* @__PURE__ */ D.jsxs(Ji, { children: [
    /* @__PURE__ */ D.jsx(Xi, {}),
    /* @__PURE__ */ D.jsx(Qr.Provider, { children: n })
  ] }) });
}, Zr = Object.prototype.toString;
function _n(e) {
  switch (Zr.call(e)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
      return !0;
    default:
      return _e(e, Error);
  }
}
function Fe(e, t) {
  return Zr.call(e) === `[object ${t}]`;
}
function En(e) {
  return Fe(e, "ErrorEvent");
}
function Gn(e) {
  return Fe(e, "DOMError");
}
function ta(e) {
  return Fe(e, "DOMException");
}
function ne(e) {
  return Fe(e, "String");
}
function eo(e) {
  return typeof e == "object" && e !== null && "__sentry_template_string__" in e && "__sentry_template_values__" in e;
}
function to(e) {
  return e === null || eo(e) || typeof e != "object" && typeof e != "function";
}
function _t(e) {
  return Fe(e, "Object");
}
function Et(e) {
  return typeof Event < "u" && _e(e, Event);
}
function na(e) {
  return typeof Element < "u" && _e(e, Element);
}
function ra(e) {
  return Fe(e, "RegExp");
}
function wn(e) {
  return !!(e && e.then && typeof e.then == "function");
}
function oa(e) {
  return _t(e) && "nativeEvent" in e && "preventDefault" in e && "stopPropagation" in e;
}
function sa(e) {
  return typeof e == "number" && e !== e;
}
function _e(e, t) {
  try {
    return e instanceof t;
  } catch {
    return !1;
  }
}
function no(e) {
  return !!(typeof e == "object" && e !== null && (e.__isVue || e._isVue));
}
function Kt(e, t = 0) {
  return typeof e != "string" || t === 0 || e.length <= t ? e : `${e.slice(0, t)}...`;
}
function zn(e, t) {
  if (!Array.isArray(e))
    return "";
  const n = [];
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    try {
      no(o) ? n.push("[VueViewModel]") : n.push(String(o));
    } catch {
      n.push("[value cannot be serialized]");
    }
  }
  return n.join(t);
}
function ia(e, t, n = !1) {
  return ne(e) ? ra(t) ? t.test(e) : ne(t) ? n ? e === t : e.includes(t) : !1 : !1;
}
function wt(e, t = [], n = !1) {
  return t.some((r) => ia(e, r, n));
}
function aa(e, t, n = 250, r, o, s, i) {
  if (!s.exception || !s.exception.values || !i || !_e(i.originalException, Error))
    return;
  const a = s.exception.values.length > 0 ? s.exception.values[s.exception.values.length - 1] : void 0;
  a && (s.exception.values = ca(
    Yt(
      e,
      t,
      o,
      i.originalException,
      r,
      s.exception.values,
      a,
      0
    ),
    n
  ));
}
function Yt(e, t, n, r, o, s, i, a) {
  if (s.length >= n + 1)
    return s;
  let c = [...s];
  if (_e(r[o], Error)) {
    Bn(i, a);
    const u = e(t, r[o]), l = c.length;
    Wn(u, o, l, a), c = Yt(
      e,
      t,
      n,
      r[o],
      o,
      [u, ...c],
      u,
      l
    );
  }
  return Array.isArray(r.errors) && r.errors.forEach((u, l) => {
    if (_e(u, Error)) {
      Bn(i, a);
      const d = e(t, u), f = c.length;
      Wn(d, `errors[${l}]`, f, a), c = Yt(
        e,
        t,
        n,
        u,
        o,
        [d, ...c],
        d,
        f
      );
    }
  }), c;
}
function Bn(e, t) {
  e.mechanism = e.mechanism || { type: "generic", handled: !0 }, e.mechanism = {
    ...e.mechanism,
    ...e.type === "AggregateError" && { is_exception_group: !0 },
    exception_id: t
  };
}
function Wn(e, t, n, r) {
  e.mechanism = e.mechanism || { type: "generic", handled: !0 }, e.mechanism = {
    ...e.mechanism,
    type: "chained",
    source: t,
    exception_id: n,
    parent_id: r
  };
}
function ca(e, t) {
  return e.map((n) => (n.value && (n.value = Kt(n.value, t)), n));
}
function Xe(e) {
  return e && e.Math == Math ? e : void 0;
}
const x = typeof globalThis == "object" && Xe(globalThis) || // eslint-disable-next-line no-restricted-globals
typeof window == "object" && Xe(window) || typeof self == "object" && Xe(self) || typeof global == "object" && Xe(global) || function() {
  return this;
}() || {};
function xn() {
  return x;
}
function ro(e, t, n) {
  const r = n || x, o = r.__SENTRY__ = r.__SENTRY__ || {};
  return o[e] || (o[e] = t());
}
const Sn = xn(), ua = 80;
function oo(e, t = {}) {
  if (!e)
    return "<unknown>";
  try {
    let n = e;
    const r = 5, o = [];
    let s = 0, i = 0;
    const a = " > ", c = a.length;
    let u;
    const l = Array.isArray(t) ? t : t.keyAttrs, d = !Array.isArray(t) && t.maxStringLength || ua;
    for (; n && s++ < r && (u = la(n, l), !(u === "html" || s > 1 && i + o.length * c + u.length >= d)); )
      o.push(u), i += u.length, n = n.parentNode;
    return o.reverse().join(a);
  } catch {
    return "<unknown>";
  }
}
function la(e, t) {
  const n = e, r = [];
  let o, s, i, a, c;
  if (!n || !n.tagName)
    return "";
  if (Sn.HTMLElement && n instanceof HTMLElement && n.dataset && n.dataset.sentryComponent)
    return n.dataset.sentryComponent;
  r.push(n.tagName.toLowerCase());
  const u = t && t.length ? t.filter((d) => n.getAttribute(d)).map((d) => [d, n.getAttribute(d)]) : null;
  if (u && u.length)
    u.forEach((d) => {
      r.push(`[${d[0]}="${d[1]}"]`);
    });
  else if (n.id && r.push(`#${n.id}`), o = n.className, o && ne(o))
    for (s = o.split(/\s+/), c = 0; c < s.length; c++)
      r.push(`.${s[c]}`);
  const l = ["aria-label", "type", "name", "title", "alt"];
  for (c = 0; c < l.length; c++)
    i = l[c], a = n.getAttribute(i), a && r.push(`[${i}="${a}"]`);
  return r.join("");
}
function da() {
  try {
    return Sn.document.location.href;
  } catch {
    return "";
  }
}
function fa(e) {
  if (!Sn.HTMLElement)
    return null;
  let t = e;
  const n = 5;
  for (let r = 0; r < n; r++) {
    if (!t)
      return null;
    if (t instanceof HTMLElement && t.dataset.sentryComponent)
      return t.dataset.sentryComponent;
    t = t.parentNode;
  }
  return null;
}
const We = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, ha = "Sentry Logger ", Xt = [
  "debug",
  "info",
  "warn",
  "error",
  "log",
  "assert",
  "trace"
], ut = {};
function Cn(e) {
  if (!("console" in x))
    return e();
  const t = x.console, n = {}, r = Object.keys(ut);
  r.forEach((o) => {
    const s = ut[o];
    n[o] = t[o], t[o] = s;
  });
  try {
    return e();
  } finally {
    r.forEach((o) => {
      t[o] = n[o];
    });
  }
}
function pa() {
  let e = !1;
  const t = {
    enable: () => {
      e = !0;
    },
    disable: () => {
      e = !1;
    },
    isEnabled: () => e
  };
  return We ? Xt.forEach((n) => {
    t[n] = (...r) => {
      e && Cn(() => {
        x.console[n](`${ha}[${n}]:`, ...r);
      });
    };
  }) : Xt.forEach((n) => {
    t[n] = () => {
    };
  }), t;
}
const _ = pa(), ga = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;
function ma(e) {
  return e === "http" || e === "https";
}
function ya(e, t = !1) {
  const { host: n, path: r, pass: o, port: s, projectId: i, protocol: a, publicKey: c } = e;
  return `${a}://${c}${t && o ? `:${o}` : ""}@${n}${s ? `:${s}` : ""}/${r && `${r}/`}${i}`;
}
function ba(e) {
  const t = ga.exec(e);
  if (!t) {
    Cn(() => {
      console.error(`Invalid Sentry Dsn: ${e}`);
    });
    return;
  }
  const [n, r, o = "", s, i = "", a] = t.slice(1);
  let c = "", u = a;
  const l = u.split("/");
  if (l.length > 1 && (c = l.slice(0, -1).join("/"), u = l.pop()), u) {
    const d = u.match(/^\d+/);
    d && (u = d[0]);
  }
  return so({ host: s, pass: o, path: c, projectId: u, port: i, protocol: n, publicKey: r });
}
function so(e) {
  return {
    protocol: e.protocol,
    publicKey: e.publicKey || "",
    pass: e.pass || "",
    host: e.host,
    port: e.port || "",
    path: e.path || "",
    projectId: e.projectId
  };
}
function va(e) {
  if (!We)
    return !0;
  const { port: t, projectId: n, protocol: r } = e;
  return ["protocol", "publicKey", "host", "projectId"].find((i) => e[i] ? !1 : (_.error(`Invalid Sentry Dsn: ${i} missing`), !0)) ? !1 : n.match(/^\d+$/) ? ma(r) ? t && isNaN(parseInt(t, 10)) ? (_.error(`Invalid Sentry Dsn: Invalid port ${t}`), !1) : !0 : (_.error(`Invalid Sentry Dsn: Invalid protocol ${r}`), !1) : (_.error(`Invalid Sentry Dsn: Invalid projectId ${n}`), !1);
}
function _a(e) {
  const t = typeof e == "string" ? ba(e) : so(e);
  if (!(!t || !va(t)))
    return t;
}
function A(e, t, n) {
  if (!(t in e))
    return;
  const r = e[t], o = n(r);
  typeof o == "function" && io(o, r), e[t] = o;
}
function lt(e, t, n) {
  try {
    Object.defineProperty(e, t, {
      // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
      value: n,
      writable: !0,
      configurable: !0
    });
  } catch {
    We && _.log(`Failed to add non-enumerable property "${t}" to object`, e);
  }
}
function io(e, t) {
  try {
    const n = t.prototype || {};
    e.prototype = t.prototype = n, lt(e, "__sentry_original__", t);
  } catch {
  }
}
function On(e) {
  return e.__sentry_original__;
}
function ao(e) {
  if (_n(e))
    return {
      message: e.message,
      name: e.name,
      stack: e.stack,
      ...Qn(e)
    };
  if (Et(e)) {
    const t = {
      type: e.type,
      target: Vn(e.target),
      currentTarget: Vn(e.currentTarget),
      ...Qn(e)
    };
    return typeof CustomEvent < "u" && _e(e, CustomEvent) && (t.detail = e.detail), t;
  } else
    return e;
}
function Vn(e) {
  try {
    return na(e) ? oo(e) : Object.prototype.toString.call(e);
  } catch {
    return "<unknown>";
  }
}
function Qn(e) {
  if (typeof e == "object" && e !== null) {
    const t = {};
    for (const n in e)
      Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n]);
    return t;
  } else
    return {};
}
function Ea(e, t = 40) {
  const n = Object.keys(ao(e));
  if (n.sort(), !n.length)
    return "[object has no keys]";
  if (n[0].length >= t)
    return Kt(n[0], t);
  for (let r = n.length; r > 0; r--) {
    const o = n.slice(0, r).join(", ");
    if (!(o.length > t))
      return r === n.length ? o : Kt(o, t);
  }
  return "";
}
function me(e) {
  return Jt(e, /* @__PURE__ */ new Map());
}
function Jt(e, t) {
  if (wa(e)) {
    const n = t.get(e);
    if (n !== void 0)
      return n;
    const r = {};
    t.set(e, r);
    for (const o of Object.keys(e))
      typeof e[o] < "u" && (r[o] = Jt(e[o], t));
    return r;
  }
  if (Array.isArray(e)) {
    const n = t.get(e);
    if (n !== void 0)
      return n;
    const r = [];
    return t.set(e, r), e.forEach((o) => {
      r.push(Jt(o, t));
    }), r;
  }
  return e;
}
function wa(e) {
  if (!_t(e))
    return !1;
  try {
    const t = Object.getPrototypeOf(e).constructor.name;
    return !t || t === "Object";
  } catch {
    return !0;
  }
}
const Lt = "<anonymous>";
function de(e) {
  try {
    return !e || typeof e != "function" ? Lt : e.name || Lt;
  } catch {
    return Lt;
  }
}
const at = {}, Kn = {};
function Se(e, t) {
  at[e] = at[e] || [], at[e].push(t);
}
function Ce(e, t) {
  Kn[e] || (t(), Kn[e] = !0);
}
function K(e, t) {
  const n = e && at[e];
  if (n)
    for (const r of n)
      try {
        r(t);
      } catch (o) {
        We && _.error(
          `Error while triggering instrumentation handler.
Type: ${e}
Name: ${de(r)}
Error:`,
          o
        );
      }
}
function xa(e) {
  const t = "console";
  Se(t, e), Ce(t, Sa);
}
function Sa() {
  "console" in x && Xt.forEach(function(e) {
    e in x.console && A(x.console, e, function(t) {
      return ut[e] = t, function(...n) {
        K("console", { args: n, level: e });
        const o = ut[e];
        o && o.apply(x.console, n);
      };
    });
  });
}
function Y() {
  const e = x, t = e.crypto || e.msCrypto;
  let n = () => Math.random() * 16;
  try {
    if (t && t.randomUUID)
      return t.randomUUID().replace(/-/g, "");
    t && t.getRandomValues && (n = () => {
      const r = new Uint8Array(1);
      return t.getRandomValues(r), r[0];
    });
  } catch {
  }
  return ([1e7] + 1e3 + 4e3 + 8e3 + 1e11).replace(
    /[018]/g,
    (r) => (
      // eslint-disable-next-line no-bitwise
      (r ^ (n() & 15) >> r / 4).toString(16)
    )
  );
}
function co(e) {
  return e.exception && e.exception.values ? e.exception.values[0] : void 0;
}
function ue(e) {
  const { message: t, event_id: n } = e;
  if (t)
    return t;
  const r = co(e);
  return r ? r.type && r.value ? `${r.type}: ${r.value}` : r.type || r.value || n || "<unknown>" : n || "<unknown>";
}
function Zt(e, t, n) {
  const r = e.exception = e.exception || {}, o = r.values = r.values || [], s = o[0] = o[0] || {};
  s.value || (s.value = t || ""), s.type || (s.type = n || "Error");
}
function en(e, t) {
  const n = co(e);
  if (!n)
    return;
  const r = { type: "generic", handled: !0 }, o = n.mechanism;
  if (n.mechanism = { ...r, ...o, ...t }, t && "data" in t) {
    const s = { ...o && o.data, ...t.data };
    n.mechanism.data = s;
  }
}
function Ca(e) {
  return Array.isArray(e) ? e : [e];
}
const Re = x, Oa = 1e3;
let Yn, tn, nn;
function Ra(e) {
  const t = "dom";
  Se(t, e), Ce(t, Ta);
}
function Ta() {
  if (!Re.document)
    return;
  const e = K.bind(null, "dom"), t = Xn(e, !0);
  Re.document.addEventListener("click", t, !1), Re.document.addEventListener("keypress", t, !1), ["EventTarget", "Node"].forEach((n) => {
    const r = Re[n] && Re[n].prototype;
    !r || !r.hasOwnProperty || !r.hasOwnProperty("addEventListener") || (A(r, "addEventListener", function(o) {
      return function(s, i, a) {
        if (s === "click" || s == "keypress")
          try {
            const c = this, u = c.__sentry_instrumentation_handlers__ = c.__sentry_instrumentation_handlers__ || {}, l = u[s] = u[s] || { refCount: 0 };
            if (!l.handler) {
              const d = Xn(e);
              l.handler = d, o.call(this, s, d, a);
            }
            l.refCount++;
          } catch {
          }
        return o.call(this, s, i, a);
      };
    }), A(
      r,
      "removeEventListener",
      function(o) {
        return function(s, i, a) {
          if (s === "click" || s == "keypress")
            try {
              const c = this, u = c.__sentry_instrumentation_handlers__ || {}, l = u[s];
              l && (l.refCount--, l.refCount <= 0 && (o.call(this, s, l.handler, a), l.handler = void 0, delete u[s]), Object.keys(u).length === 0 && delete c.__sentry_instrumentation_handlers__);
            } catch {
            }
          return o.call(this, s, i, a);
        };
      }
    ));
  });
}
function Da(e) {
  if (e.type !== tn)
    return !1;
  try {
    if (!e.target || e.target._sentryId !== nn)
      return !1;
  } catch {
  }
  return !0;
}
function Ia(e, t) {
  return e !== "keypress" ? !1 : !t || !t.tagName ? !0 : !(t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}
function Xn(e, t = !1) {
  return (n) => {
    if (!n || n._sentryCaptured)
      return;
    const r = Ma(n);
    if (Ia(n.type, r))
      return;
    lt(n, "_sentryCaptured", !0), r && !r._sentryId && lt(r, "_sentryId", Y());
    const o = n.type === "keypress" ? "input" : n.type;
    Da(n) || (e({ event: n, name: o, global: t }), tn = n.type, nn = r ? r._sentryId : void 0), clearTimeout(Yn), Yn = Re.setTimeout(() => {
      nn = void 0, tn = void 0;
    }, Oa);
  };
}
function Ma(e) {
  try {
    return e.target;
  } catch {
    return null;
  }
}
const rn = xn();
function Na() {
  if (!("fetch" in rn))
    return !1;
  try {
    return new Headers(), new Request("http://www.example.com"), new Response(), !0;
  } catch {
    return !1;
  }
}
function Jn(e) {
  return e && /^function fetch\(\)\s+\{\s+\[native code\]\s+\}$/.test(e.toString());
}
function Pa() {
  if (typeof EdgeRuntime == "string")
    return !0;
  if (!Na())
    return !1;
  if (Jn(rn.fetch))
    return !0;
  let e = !1;
  const t = rn.document;
  if (t && typeof t.createElement == "function")
    try {
      const n = t.createElement("iframe");
      n.hidden = !0, t.head.appendChild(n), n.contentWindow && n.contentWindow.fetch && (e = Jn(n.contentWindow.fetch)), t.head.removeChild(n);
    } catch (n) {
      We && _.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", n);
    }
  return e;
}
function ka(e) {
  const t = "fetch";
  Se(t, e), Ce(t, Aa);
}
function Aa() {
  Pa() && A(x, "fetch", function(e) {
    return function(...t) {
      const { method: n, url: r } = $a(t), o = {
        args: t,
        fetchData: {
          method: n,
          url: r
        },
        startTimestamp: Date.now()
      };
      return K("fetch", {
        ...o
      }), e.apply(x, t).then(
        (s) => {
          const i = {
            ...o,
            endTimestamp: Date.now(),
            response: s
          };
          return K("fetch", i), s;
        },
        (s) => {
          const i = {
            ...o,
            endTimestamp: Date.now(),
            error: s
          };
          throw K("fetch", i), s;
        }
      );
    };
  });
}
function on(e, t) {
  return !!e && typeof e == "object" && !!e[t];
}
function Zn(e) {
  return typeof e == "string" ? e : e ? on(e, "url") ? e.url : e.toString ? e.toString() : "" : "";
}
function $a(e) {
  if (e.length === 0)
    return { method: "GET", url: "" };
  if (e.length === 2) {
    const [n, r] = e;
    return {
      url: Zn(n),
      method: on(r, "method") ? String(r.method).toUpperCase() : "GET"
    };
  }
  const t = e[0];
  return {
    url: Zn(t),
    method: on(t, "method") ? String(t.method).toUpperCase() : "GET"
  };
}
let Je = null;
function Fa(e) {
  const t = "error";
  Se(t, e), Ce(t, ja);
}
function ja() {
  Je = x.onerror, x.onerror = function(e, t, n, r, o) {
    return K("error", {
      column: r,
      error: o,
      line: n,
      msg: e,
      url: t
    }), Je && !Je.__SENTRY_LOADER__ ? Je.apply(this, arguments) : !1;
  }, x.onerror.__SENTRY_INSTRUMENTED__ = !0;
}
let Ze = null;
function La(e) {
  const t = "unhandledrejection";
  Se(t, e), Ce(t, Ua);
}
function Ua() {
  Ze = x.onunhandledrejection, x.onunhandledrejection = function(e) {
    return K("unhandledrejection", e), Ze && !Ze.__SENTRY_LOADER__ ? Ze.apply(this, arguments) : !0;
  }, x.onunhandledrejection.__SENTRY_INSTRUMENTED__ = !0;
}
const et = xn();
function qa() {
  const e = et.chrome, t = e && e.app && e.app.runtime, n = "history" in et && !!et.history.pushState && !!et.history.replaceState;
  return !t && n;
}
const Ue = x;
let tt;
function Ha(e) {
  const t = "history";
  Se(t, e), Ce(t, Ga);
}
function Ga() {
  if (!qa())
    return;
  const e = Ue.onpopstate;
  Ue.onpopstate = function(...n) {
    const r = Ue.location.href, o = tt;
    if (tt = r, K("history", { from: o, to: r }), e)
      try {
        return e.apply(this, n);
      } catch {
      }
  };
  function t(n) {
    return function(...r) {
      const o = r.length > 2 ? r[2] : void 0;
      if (o) {
        const s = tt, i = String(o);
        tt = i, K("history", { from: s, to: i });
      }
      return n.apply(this, r);
    };
  }
  A(Ue.history, "pushState", t), A(Ue.history, "replaceState", t);
}
const za = x, Ge = "__sentry_xhr_v3__";
function Ba(e) {
  const t = "xhr";
  Se(t, e), Ce(t, Wa);
}
function Wa() {
  if (!za.XMLHttpRequest)
    return;
  const e = XMLHttpRequest.prototype;
  A(e, "open", function(t) {
    return function(...n) {
      const r = Date.now(), o = ne(n[0]) ? n[0].toUpperCase() : void 0, s = Va(n[1]);
      if (!o || !s)
        return t.apply(this, n);
      this[Ge] = {
        method: o,
        url: s,
        request_headers: {}
      }, o === "POST" && s.match(/sentry_key/) && (this.__sentry_own_request__ = !0);
      const i = () => {
        const a = this[Ge];
        if (a && this.readyState === 4) {
          try {
            a.status_code = this.status;
          } catch {
          }
          const c = {
            args: [o, s],
            endTimestamp: Date.now(),
            startTimestamp: r,
            xhr: this
          };
          K("xhr", c);
        }
      };
      return "onreadystatechange" in this && typeof this.onreadystatechange == "function" ? A(this, "onreadystatechange", function(a) {
        return function(...c) {
          return i(), a.apply(this, c);
        };
      }) : this.addEventListener("readystatechange", i), A(this, "setRequestHeader", function(a) {
        return function(...c) {
          const [u, l] = c, d = this[Ge];
          return d && ne(u) && ne(l) && (d.request_headers[u.toLowerCase()] = l), a.apply(this, c);
        };
      }), t.apply(this, n);
    };
  }), A(e, "send", function(t) {
    return function(...n) {
      const r = this[Ge];
      if (!r)
        return t.apply(this, n);
      n[0] !== void 0 && (r.body = n[0]);
      const o = {
        args: [r.method, r.url],
        startTimestamp: Date.now(),
        xhr: this
      };
      return K("xhr", o), t.apply(this, n);
    };
  });
}
function Va(e) {
  if (ne(e))
    return e;
  try {
    return e.toString();
  } catch {
  }
}
function Qa() {
  const e = typeof WeakSet == "function", t = e ? /* @__PURE__ */ new WeakSet() : [];
  function n(o) {
    if (e)
      return t.has(o) ? !0 : (t.add(o), !1);
    for (let s = 0; s < t.length; s++)
      if (t[s] === o)
        return !0;
    return t.push(o), !1;
  }
  function r(o) {
    if (e)
      t.delete(o);
    else
      for (let s = 0; s < t.length; s++)
        if (t[s] === o) {
          t.splice(s, 1);
          break;
        }
  }
  return [n, r];
}
function Ka(e, t = 100, n = 1 / 0) {
  try {
    return sn("", e, t, n);
  } catch (r) {
    return { ERROR: `**non-serializable** (${r})` };
  }
}
function uo(e, t = 3, n = 100 * 1024) {
  const r = Ka(e, t);
  return Za(r) > n ? uo(e, t - 1, n) : r;
}
function sn(e, t, n = 1 / 0, r = 1 / 0, o = Qa()) {
  const [s, i] = o;
  if (t == null || // this matches null and undefined -> eqeq not eqeqeq
  ["number", "boolean", "string"].includes(typeof t) && !sa(t))
    return t;
  const a = Ya(e, t);
  if (!a.startsWith("[object "))
    return a;
  if (t.__sentry_skip_normalization__)
    return t;
  const c = typeof t.__sentry_override_normalization_depth__ == "number" ? t.__sentry_override_normalization_depth__ : n;
  if (c === 0)
    return a.replace("object ", "");
  if (s(t))
    return "[Circular ~]";
  const u = t;
  if (u && typeof u.toJSON == "function")
    try {
      const h = u.toJSON();
      return sn("", h, c - 1, r, o);
    } catch {
    }
  const l = Array.isArray(t) ? [] : {};
  let d = 0;
  const f = ao(t);
  for (const h in f) {
    if (!Object.prototype.hasOwnProperty.call(f, h))
      continue;
    if (d >= r) {
      l[h] = "[MaxProperties ~]";
      break;
    }
    const g = f[h];
    l[h] = sn(h, g, c - 1, r, o), d++;
  }
  return i(t), l;
}
function Ya(e, t) {
  try {
    if (e === "domain" && t && typeof t == "object" && t._events)
      return "[Domain]";
    if (e === "domainEmitter")
      return "[DomainEmitter]";
    if (typeof global < "u" && t === global)
      return "[Global]";
    if (typeof window < "u" && t === window)
      return "[Window]";
    if (typeof document < "u" && t === document)
      return "[Document]";
    if (no(t))
      return "[VueViewModel]";
    if (oa(t))
      return "[SyntheticEvent]";
    if (typeof t == "number" && t !== t)
      return "[NaN]";
    if (typeof t == "function")
      return `[Function: ${de(t)}]`;
    if (typeof t == "symbol")
      return `[${String(t)}]`;
    if (typeof t == "bigint")
      return `[BigInt: ${String(t)}]`;
    const n = Xa(t);
    return /^HTML(\w*)Element$/.test(n) ? `[HTMLElement: ${n}]` : `[object ${n}]`;
  } catch (n) {
    return `**non-serializable** (${n})`;
  }
}
function Xa(e) {
  const t = Object.getPrototypeOf(e);
  return t ? t.constructor.name : "null prototype";
}
function Ja(e) {
  return ~-encodeURI(e).split(/%..|./).length;
}
function Za(e) {
  return Ja(JSON.stringify(e));
}
var ee;
(function(e) {
  e[e.PENDING = 0] = "PENDING";
  const n = 1;
  e[e.RESOLVED = n] = "RESOLVED";
  const r = 2;
  e[e.REJECTED = r] = "REJECTED";
})(ee || (ee = {}));
class ie {
  constructor(t) {
    ie.prototype.__init.call(this), ie.prototype.__init2.call(this), ie.prototype.__init3.call(this), ie.prototype.__init4.call(this), this._state = ee.PENDING, this._handlers = [];
    try {
      t(this._resolve, this._reject);
    } catch (n) {
      this._reject(n);
    }
  }
  /** JSDoc */
  then(t, n) {
    return new ie((r, o) => {
      this._handlers.push([
        !1,
        (s) => {
          if (!t)
            r(s);
          else
            try {
              r(t(s));
            } catch (i) {
              o(i);
            }
        },
        (s) => {
          if (!n)
            o(s);
          else
            try {
              r(n(s));
            } catch (i) {
              o(i);
            }
        }
      ]), this._executeHandlers();
    });
  }
  /** JSDoc */
  catch(t) {
    return this.then((n) => n, t);
  }
  /** JSDoc */
  finally(t) {
    return new ie((n, r) => {
      let o, s;
      return this.then(
        (i) => {
          s = !1, o = i, t && t();
        },
        (i) => {
          s = !0, o = i, t && t();
        }
      ).then(() => {
        if (s) {
          r(o);
          return;
        }
        n(o);
      });
    });
  }
  /** JSDoc */
  __init() {
    this._resolve = (t) => {
      this._setResult(ee.RESOLVED, t);
    };
  }
  /** JSDoc */
  __init2() {
    this._reject = (t) => {
      this._setResult(ee.REJECTED, t);
    };
  }
  /** JSDoc */
  __init3() {
    this._setResult = (t, n) => {
      if (this._state === ee.PENDING) {
        if (wn(n)) {
          n.then(this._resolve, this._reject);
          return;
        }
        this._state = t, this._value = n, this._executeHandlers();
      }
    };
  }
  /** JSDoc */
  __init4() {
    this._executeHandlers = () => {
      if (this._state === ee.PENDING)
        return;
      const t = this._handlers.slice();
      this._handlers = [], t.forEach((n) => {
        n[0] || (this._state === ee.RESOLVED && n[1](this._value), this._state === ee.REJECTED && n[2](this._value), n[0] = !0);
      });
    };
  }
}
function Ut(e) {
  if (!e)
    return {};
  const t = e.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);
  if (!t)
    return {};
  const n = t[6] || "", r = t[8] || "";
  return {
    host: t[4],
    path: t[5],
    protocol: t[2],
    search: n,
    hash: r,
    relative: t[5] + n + r
    // everything minus origin
  };
}
const ec = ["fatal", "error", "warning", "log", "info", "debug"];
function tc(e) {
  return e === "warn" ? "warning" : ec.includes(e) ? e : "log";
}
const lo = 1e3;
function Rn() {
  return Date.now() / lo;
}
function nc() {
  const { performance: e } = x;
  if (!e || !e.now)
    return Rn;
  const t = Date.now() - e.now(), n = e.timeOrigin == null ? t : e.timeOrigin;
  return () => (n + e.now()) / lo;
}
const fo = nc();
(() => {
  const { performance: e } = x;
  if (!e || !e.now)
    return;
  const t = 3600 * 1e3, n = e.now(), r = Date.now(), o = e.timeOrigin ? Math.abs(e.timeOrigin + n - r) : t, s = o < t, i = e.timing && e.timing.navigationStart, c = typeof i == "number" ? Math.abs(i + n - r) : t, u = c < t;
  return s || u ? o <= c ? e.timeOrigin : i : r;
})();
const W = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, ho = "production";
function rc() {
  return ro("globalEventProcessors", () => []);
}
function an(e, t, n, r = 0) {
  return new ie((o, s) => {
    const i = e[r];
    if (t === null || typeof i != "function")
      o(t);
    else {
      const a = i({ ...t }, n);
      W && i.id && a === null && _.log(`Event processor "${i.id}" dropped event`), wn(a) ? a.then((c) => an(e, c, n, r + 1).then(o)).then(null, s) : an(e, a, n, r + 1).then(o).then(null, s);
    }
  });
}
function oc(e) {
  const t = fo(), n = {
    sid: Y(),
    init: !0,
    timestamp: t,
    started: t,
    duration: 0,
    status: "ok",
    errors: 0,
    ignoreDuration: !1,
    toJSON: () => ic(n)
  };
  return e && xt(n, e), n;
}
function xt(e, t = {}) {
  if (t.user && (!e.ipAddress && t.user.ip_address && (e.ipAddress = t.user.ip_address), !e.did && !t.did && (e.did = t.user.id || t.user.email || t.user.username)), e.timestamp = t.timestamp || fo(), t.abnormal_mechanism && (e.abnormal_mechanism = t.abnormal_mechanism), t.ignoreDuration && (e.ignoreDuration = t.ignoreDuration), t.sid && (e.sid = t.sid.length === 32 ? t.sid : Y()), t.init !== void 0 && (e.init = t.init), !e.did && t.did && (e.did = `${t.did}`), typeof t.started == "number" && (e.started = t.started), e.ignoreDuration)
    e.duration = void 0;
  else if (typeof t.duration == "number")
    e.duration = t.duration;
  else {
    const n = e.timestamp - e.started;
    e.duration = n >= 0 ? n : 0;
  }
  t.release && (e.release = t.release), t.environment && (e.environment = t.environment), !e.ipAddress && t.ipAddress && (e.ipAddress = t.ipAddress), !e.userAgent && t.userAgent && (e.userAgent = t.userAgent), typeof t.errors == "number" && (e.errors = t.errors), t.status && (e.status = t.status);
}
function sc(e, t) {
  let n = {};
  t ? n = { status: t } : e.status === "ok" && (n = { status: "exited" }), xt(e, n);
}
function ic(e) {
  return me({
    sid: `${e.sid}`,
    init: e.init,
    // Make sure that sec is converted to ms for date constructor
    started: new Date(e.started * 1e3).toISOString(),
    timestamp: new Date(e.timestamp * 1e3).toISOString(),
    status: e.status,
    errors: e.errors,
    did: typeof e.did == "number" || typeof e.did == "string" ? `${e.did}` : void 0,
    duration: e.duration,
    abnormal_mechanism: e.abnormal_mechanism,
    attrs: {
      release: e.release,
      environment: e.environment,
      ip_address: e.ipAddress,
      user_agent: e.userAgent
    }
  });
}
const ac = 1;
function cc(e) {
  const { spanId: t, traceId: n } = e.spanContext(), { data: r, op: o, parent_span_id: s, status: i, tags: a, origin: c } = dt(e);
  return me({
    data: r,
    op: o,
    parent_span_id: s,
    span_id: t,
    status: i,
    tags: a,
    trace_id: n,
    origin: c
  });
}
function dt(e) {
  return uc(e) ? e.getSpanJSON() : typeof e.toJSON == "function" ? e.toJSON() : {};
}
function uc(e) {
  return typeof e.getSpanJSON == "function";
}
function lc(e) {
  const { traceFlags: t } = e.spanContext();
  return !!(t & ac);
}
function dc(e) {
  if (e)
    return fc(e) ? { captureContext: e } : pc(e) ? {
      captureContext: e
    } : e;
}
function fc(e) {
  return e instanceof ve || typeof e == "function";
}
const hc = [
  "user",
  "level",
  "extra",
  "contexts",
  "tags",
  "fingerprint",
  "requestSession",
  "propagationContext"
];
function pc(e) {
  return Object.keys(e).some((t) => hc.includes(t));
}
function po(e, t) {
  return Oe().captureException(e, dc(t));
}
function go(e, t) {
  return Oe().captureEvent(e, t);
}
function Ee(e, t) {
  Oe().addBreadcrumb(e, t);
}
function mo(...e) {
  const t = Oe();
  if (e.length === 2) {
    const [n, r] = e;
    return n ? t.withScope(() => (t.getStackTop().scope = n, r(n))) : t.withScope(r);
  }
  return t.withScope(e[0]);
}
function U() {
  return Oe().getClient();
}
function gc() {
  return Oe().getScope();
}
function yo(e) {
  return e.transaction;
}
function mc(e, t, n) {
  const r = t.getOptions(), { publicKey: o } = t.getDsn() || {}, { segment: s } = n && n.getUser() || {}, i = me({
    environment: r.environment || ho,
    release: r.release,
    user_segment: s,
    public_key: o,
    trace_id: e
  });
  return t.emit && t.emit("createDsc", i), i;
}
function yc(e) {
  const t = U();
  if (!t)
    return {};
  const n = mc(dt(e).trace_id || "", t, gc()), r = yo(e);
  if (!r)
    return n;
  const o = r && r._frozenDynamicSamplingContext;
  if (o)
    return o;
  const { sampleRate: s, source: i } = r.metadata;
  s != null && (n.sample_rate = `${s}`);
  const a = dt(r);
  return i && i !== "url" && (n.transaction = a.description), n.sampled = String(lc(r)), t.emit && t.emit("createDsc", n), n;
}
function bc(e, t) {
  const { fingerprint: n, span: r, breadcrumbs: o, sdkProcessingMetadata: s } = t;
  vc(e, t), r && wc(e, r), xc(e, n), _c(e, o), Ec(e, s);
}
function vc(e, t) {
  const {
    extra: n,
    tags: r,
    user: o,
    contexts: s,
    level: i,
    // eslint-disable-next-line deprecation/deprecation
    transactionName: a
  } = t, c = me(n);
  c && Object.keys(c).length && (e.extra = { ...c, ...e.extra });
  const u = me(r);
  u && Object.keys(u).length && (e.tags = { ...u, ...e.tags });
  const l = me(o);
  l && Object.keys(l).length && (e.user = { ...l, ...e.user });
  const d = me(s);
  d && Object.keys(d).length && (e.contexts = { ...d, ...e.contexts }), i && (e.level = i), a && (e.transaction = a);
}
function _c(e, t) {
  const n = [...e.breadcrumbs || [], ...t];
  e.breadcrumbs = n.length ? n : void 0;
}
function Ec(e, t) {
  e.sdkProcessingMetadata = {
    ...e.sdkProcessingMetadata,
    ...t
  };
}
function wc(e, t) {
  e.contexts = { trace: cc(t), ...e.contexts };
  const n = yo(t);
  if (n) {
    e.sdkProcessingMetadata = {
      dynamicSamplingContext: yc(t),
      ...e.sdkProcessingMetadata
    };
    const r = dt(n).description;
    r && (e.tags = { transaction: r, ...e.tags });
  }
}
function xc(e, t) {
  e.fingerprint = e.fingerprint ? Ca(e.fingerprint) : [], t && (e.fingerprint = e.fingerprint.concat(t)), e.fingerprint && !e.fingerprint.length && delete e.fingerprint;
}
const Sc = 100;
class ve {
  /** Flag if notifying is happening. */
  /** Callback for client to receive scope changes. */
  /** Callback list that will be called after {@link applyToEvent}. */
  /** Array of breadcrumbs. */
  /** User */
  /** Tags */
  /** Extra */
  /** Contexts */
  /** Attachments */
  /** Propagation Context for distributed tracing */
  /**
   * A place to stash data which is needed at some point in the SDK's event processing pipeline but which shouldn't get
   * sent to Sentry
   */
  /** Fingerprint */
  /** Severity */
  // eslint-disable-next-line deprecation/deprecation
  /**
   * Transaction Name
   */
  /** Span */
  /** Session */
  /** Request Mode Session Status */
  /** The client on this scope */
  // NOTE: Any field which gets added here should get added not only to the constructor but also to the `clone` method.
  constructor() {
    this._notifyingListeners = !1, this._scopeListeners = [], this._eventProcessors = [], this._breadcrumbs = [], this._attachments = [], this._user = {}, this._tags = {}, this._extra = {}, this._contexts = {}, this._sdkProcessingMetadata = {}, this._propagationContext = er();
  }
  /**
   * Inherit values from the parent scope.
   * @deprecated Use `scope.clone()` and `new Scope()` instead.
   */
  static clone(t) {
    return t ? t.clone() : new ve();
  }
  /**
   * Clone this scope instance.
   */
  clone() {
    const t = new ve();
    return t._breadcrumbs = [...this._breadcrumbs], t._tags = { ...this._tags }, t._extra = { ...this._extra }, t._contexts = { ...this._contexts }, t._user = this._user, t._level = this._level, t._span = this._span, t._session = this._session, t._transactionName = this._transactionName, t._fingerprint = this._fingerprint, t._eventProcessors = [...this._eventProcessors], t._requestSession = this._requestSession, t._attachments = [...this._attachments], t._sdkProcessingMetadata = { ...this._sdkProcessingMetadata }, t._propagationContext = { ...this._propagationContext }, t._client = this._client, t;
  }
  /** Update the client on the scope. */
  setClient(t) {
    this._client = t;
  }
  /**
   * Get the client assigned to this scope.
   *
   * It is generally recommended to use the global function `Sentry.getClient()` instead, unless you know what you are doing.
   */
  getClient() {
    return this._client;
  }
  /**
   * Add internal on change listener. Used for sub SDKs that need to store the scope.
   * @hidden
   */
  addScopeListener(t) {
    this._scopeListeners.push(t);
  }
  /**
   * @inheritDoc
   */
  addEventProcessor(t) {
    return this._eventProcessors.push(t), this;
  }
  /**
   * @inheritDoc
   */
  setUser(t) {
    return this._user = t || {
      email: void 0,
      id: void 0,
      ip_address: void 0,
      segment: void 0,
      username: void 0
    }, this._session && xt(this._session, { user: t }), this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  getUser() {
    return this._user;
  }
  /**
   * @inheritDoc
   */
  getRequestSession() {
    return this._requestSession;
  }
  /**
   * @inheritDoc
   */
  setRequestSession(t) {
    return this._requestSession = t, this;
  }
  /**
   * @inheritDoc
   */
  setTags(t) {
    return this._tags = {
      ...this._tags,
      ...t
    }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setTag(t, n) {
    return this._tags = { ...this._tags, [t]: n }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setExtras(t) {
    return this._extra = {
      ...this._extra,
      ...t
    }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setExtra(t, n) {
    return this._extra = { ...this._extra, [t]: n }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setFingerprint(t) {
    return this._fingerprint = t, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setLevel(t) {
    return this._level = t, this._notifyScopeListeners(), this;
  }
  /**
   * Sets the transaction name on the scope for future events.
   */
  setTransactionName(t) {
    return this._transactionName = t, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setContext(t, n) {
    return n === null ? delete this._contexts[t] : this._contexts[t] = n, this._notifyScopeListeners(), this;
  }
  /**
   * Sets the Span on the scope.
   * @param span Span
   * @deprecated Instead of setting a span on a scope, use `startSpan()`/`startSpanManual()` instead.
   */
  setSpan(t) {
    return this._span = t, this._notifyScopeListeners(), this;
  }
  /**
   * Returns the `Span` if there is one.
   * @deprecated Use `getActiveSpan()` instead.
   */
  getSpan() {
    return this._span;
  }
  /**
   * Returns the `Transaction` attached to the scope (if there is one).
   * @deprecated You should not rely on the transaction, but just use `startSpan()` APIs instead.
   */
  getTransaction() {
    const t = this._span;
    return t && t.transaction;
  }
  /**
   * @inheritDoc
   */
  setSession(t) {
    return t ? this._session = t : delete this._session, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  getSession() {
    return this._session;
  }
  /**
   * @inheritDoc
   */
  update(t) {
    if (!t)
      return this;
    const n = typeof t == "function" ? t(this) : t;
    if (n instanceof ve) {
      const r = n.getScopeData();
      this._tags = { ...this._tags, ...r.tags }, this._extra = { ...this._extra, ...r.extra }, this._contexts = { ...this._contexts, ...r.contexts }, r.user && Object.keys(r.user).length && (this._user = r.user), r.level && (this._level = r.level), r.fingerprint.length && (this._fingerprint = r.fingerprint), n.getRequestSession() && (this._requestSession = n.getRequestSession()), r.propagationContext && (this._propagationContext = r.propagationContext);
    } else if (_t(n)) {
      const r = t;
      this._tags = { ...this._tags, ...r.tags }, this._extra = { ...this._extra, ...r.extra }, this._contexts = { ...this._contexts, ...r.contexts }, r.user && (this._user = r.user), r.level && (this._level = r.level), r.fingerprint && (this._fingerprint = r.fingerprint), r.requestSession && (this._requestSession = r.requestSession), r.propagationContext && (this._propagationContext = r.propagationContext);
    }
    return this;
  }
  /**
   * @inheritDoc
   */
  clear() {
    return this._breadcrumbs = [], this._tags = {}, this._extra = {}, this._user = {}, this._contexts = {}, this._level = void 0, this._transactionName = void 0, this._fingerprint = void 0, this._requestSession = void 0, this._span = void 0, this._session = void 0, this._notifyScopeListeners(), this._attachments = [], this._propagationContext = er(), this;
  }
  /**
   * @inheritDoc
   */
  addBreadcrumb(t, n) {
    const r = typeof n == "number" ? n : Sc;
    if (r <= 0)
      return this;
    const o = {
      timestamp: Rn(),
      ...t
    }, s = this._breadcrumbs;
    return s.push(o), this._breadcrumbs = s.length > r ? s.slice(-r) : s, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  getLastBreadcrumb() {
    return this._breadcrumbs[this._breadcrumbs.length - 1];
  }
  /**
   * @inheritDoc
   */
  clearBreadcrumbs() {
    return this._breadcrumbs = [], this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  addAttachment(t) {
    return this._attachments.push(t), this;
  }
  /**
   * @inheritDoc
   * @deprecated Use `getScopeData()` instead.
   */
  getAttachments() {
    return this.getScopeData().attachments;
  }
  /**
   * @inheritDoc
   */
  clearAttachments() {
    return this._attachments = [], this;
  }
  /** @inheritDoc */
  getScopeData() {
    const {
      _breadcrumbs: t,
      _attachments: n,
      _contexts: r,
      _tags: o,
      _extra: s,
      _user: i,
      _level: a,
      _fingerprint: c,
      _eventProcessors: u,
      _propagationContext: l,
      _sdkProcessingMetadata: d,
      _transactionName: f,
      _span: h
    } = this;
    return {
      breadcrumbs: t,
      attachments: n,
      contexts: r,
      tags: o,
      extra: s,
      user: i,
      level: a,
      fingerprint: c || [],
      eventProcessors: u,
      propagationContext: l,
      sdkProcessingMetadata: d,
      transactionName: f,
      span: h
    };
  }
  /**
   * Applies data from the scope to the event and runs all event processors on it.
   *
   * @param event Event
   * @param hint Object containing additional information about the original exception, for use by the event processors.
   * @hidden
   * @deprecated Use `applyScopeDataToEvent()` directly
   */
  applyToEvent(t, n = {}, r = []) {
    bc(t, this.getScopeData());
    const o = [
      ...r,
      // eslint-disable-next-line deprecation/deprecation
      ...rc(),
      ...this._eventProcessors
    ];
    return an(o, t, n);
  }
  /**
   * Add data which will be accessible during event processing but won't get sent to Sentry
   */
  setSDKProcessingMetadata(t) {
    return this._sdkProcessingMetadata = { ...this._sdkProcessingMetadata, ...t }, this;
  }
  /**
   * @inheritDoc
   */
  setPropagationContext(t) {
    return this._propagationContext = t, this;
  }
  /**
   * @inheritDoc
   */
  getPropagationContext() {
    return this._propagationContext;
  }
  /**
   * Capture an exception for this scope.
   *
   * @param exception The exception to capture.
   * @param hint Optinal additional data to attach to the Sentry event.
   * @returns the id of the captured Sentry event.
   */
  captureException(t, n) {
    const r = n && n.event_id ? n.event_id : Y();
    if (!this._client)
      return _.warn("No client configured on scope - will not capture exception!"), r;
    const o = new Error("Sentry syntheticException");
    return this._client.captureException(
      t,
      {
        originalException: t,
        syntheticException: o,
        ...n,
        event_id: r
      },
      this
    ), r;
  }
  /**
   * Capture a message for this scope.
   *
   * @param message The message to capture.
   * @param level An optional severity level to report the message with.
   * @param hint Optional additional data to attach to the Sentry event.
   * @returns the id of the captured message.
   */
  captureMessage(t, n, r) {
    const o = r && r.event_id ? r.event_id : Y();
    if (!this._client)
      return _.warn("No client configured on scope - will not capture message!"), o;
    const s = new Error(t);
    return this._client.captureMessage(
      t,
      n,
      {
        originalException: t,
        syntheticException: s,
        ...r,
        event_id: o
      },
      this
    ), o;
  }
  /**
   * Captures a manually created event for this scope and sends it to Sentry.
   *
   * @param exception The event to capture.
   * @param hint Optional additional data to attach to the Sentry event.
   * @returns the id of the captured event.
   */
  captureEvent(t, n) {
    const r = n && n.event_id ? n.event_id : Y();
    return this._client ? (this._client.captureEvent(t, { ...n, event_id: r }, this), r) : (_.warn("No client configured on scope - will not capture event!"), r);
  }
  /**
   * This will be called on every set call.
   */
  _notifyScopeListeners() {
    this._notifyingListeners || (this._notifyingListeners = !0, this._scopeListeners.forEach((t) => {
      t(this);
    }), this._notifyingListeners = !1);
  }
}
function er() {
  return {
    traceId: Y(),
    spanId: Y().substring(16)
  };
}
const Cc = "7.119.2", bo = parseFloat(Cc), Oc = 100;
class vo {
  /** Is a {@link Layer}[] containing the client and scope */
  /** Contains the last event id of a captured event.  */
  /**
   * Creates a new instance of the hub, will push one {@link Layer} into the
   * internal stack on creation.
   *
   * @param client bound to the hub.
   * @param scope bound to the hub.
   * @param version number, higher number means higher priority.
   *
   * @deprecated Instantiation of Hub objects is deprecated and the constructor will be removed in version 8 of the SDK.
   *
   * If you are currently using the Hub for multi-client use like so:
   *
   * ```
   * // OLD
   * const hub = new Hub();
   * hub.bindClient(client);
   * makeMain(hub)
   * ```
   *
   * instead initialize the client as follows:
   *
   * ```
   * // NEW
   * Sentry.withIsolationScope(() => {
   *    Sentry.setCurrentClient(client);
   *    client.init();
   * });
   * ```
   *
   * If you are using the Hub to capture events like so:
   *
   * ```
   * // OLD
   * const client = new Client();
   * const hub = new Hub(client);
   * hub.captureException()
   * ```
   *
   * instead capture isolated events as follows:
   *
   * ```
   * // NEW
   * const client = new Client();
   * const scope = new Scope();
   * scope.setClient(client);
   * scope.captureException();
   * ```
   */
  constructor(t, n, r, o = bo) {
    this._version = o;
    let s;
    n ? s = n : (s = new ve(), s.setClient(t));
    let i;
    r ? i = r : (i = new ve(), i.setClient(t)), this._stack = [{ scope: s }], t && this.bindClient(t), this._isolationScope = i;
  }
  /**
   * Checks if this hub's version is older than the given version.
   *
   * @param version A version number to compare to.
   * @return True if the given version is newer; otherwise false.
   *
   * @deprecated This will be removed in v8.
   */
  isOlderThan(t) {
    return this._version < t;
  }
  /**
   * This binds the given client to the current scope.
   * @param client An SDK client (client) instance.
   *
   * @deprecated Use `initAndBind()` directly, or `setCurrentClient()` and/or `client.init()` instead.
   */
  bindClient(t) {
    const n = this.getStackTop();
    n.client = t, n.scope.setClient(t), t && t.setupIntegrations && t.setupIntegrations();
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `withScope` instead.
   */
  pushScope() {
    const t = this.getScope().clone();
    return this.getStack().push({
      // eslint-disable-next-line deprecation/deprecation
      client: this.getClient(),
      scope: t
    }), t;
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `withScope` instead.
   */
  popScope() {
    return this.getStack().length <= 1 ? !1 : !!this.getStack().pop();
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `Sentry.withScope()` instead.
   */
  withScope(t) {
    const n = this.pushScope();
    let r;
    try {
      r = t(n);
    } catch (o) {
      throw this.popScope(), o;
    }
    return wn(r) ? r.then(
      (o) => (this.popScope(), o),
      (o) => {
        throw this.popScope(), o;
      }
    ) : (this.popScope(), r);
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `Sentry.getClient()` instead.
   */
  getClient() {
    return this.getStackTop().client;
  }
  /**
   * Returns the scope of the top stack.
   *
   * @deprecated Use `Sentry.getCurrentScope()` instead.
   */
  getScope() {
    return this.getStackTop().scope;
  }
  /**
   * @deprecated Use `Sentry.getIsolationScope()` instead.
   */
  getIsolationScope() {
    return this._isolationScope;
  }
  /**
   * Returns the scope stack for domains or the process.
   * @deprecated This will be removed in v8.
   */
  getStack() {
    return this._stack;
  }
  /**
   * Returns the topmost scope layer in the order domain > local > process.
   * @deprecated This will be removed in v8.
   */
  getStackTop() {
    return this._stack[this._stack.length - 1];
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `Sentry.captureException()` instead.
   */
  captureException(t, n) {
    const r = this._lastEventId = n && n.event_id ? n.event_id : Y(), o = new Error("Sentry syntheticException");
    return this.getScope().captureException(t, {
      originalException: t,
      syntheticException: o,
      ...n,
      event_id: r
    }), r;
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use  `Sentry.captureMessage()` instead.
   */
  captureMessage(t, n, r) {
    const o = this._lastEventId = r && r.event_id ? r.event_id : Y(), s = new Error(t);
    return this.getScope().captureMessage(t, n, {
      originalException: t,
      syntheticException: s,
      ...r,
      event_id: o
    }), o;
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `Sentry.captureEvent()` instead.
   */
  captureEvent(t, n) {
    const r = n && n.event_id ? n.event_id : Y();
    return t.type || (this._lastEventId = r), this.getScope().captureEvent(t, { ...n, event_id: r }), r;
  }
  /**
   * @inheritDoc
   *
   * @deprecated This will be removed in v8.
   */
  lastEventId() {
    return this._lastEventId;
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `Sentry.addBreadcrumb()` instead.
   */
  addBreadcrumb(t, n) {
    const { scope: r, client: o } = this.getStackTop();
    if (!o)
      return;
    const { beforeBreadcrumb: s = null, maxBreadcrumbs: i = Oc } = o.getOptions && o.getOptions() || {};
    if (i <= 0)
      return;
    const c = { timestamp: Rn(), ...t }, u = s ? Cn(() => s(c, n)) : c;
    u !== null && (o.emit && o.emit("beforeAddBreadcrumb", u, n), r.addBreadcrumb(u, i));
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setUser()` instead.
   */
  setUser(t) {
    this.getScope().setUser(t), this.getIsolationScope().setUser(t);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setTags()` instead.
   */
  setTags(t) {
    this.getScope().setTags(t), this.getIsolationScope().setTags(t);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setExtras()` instead.
   */
  setExtras(t) {
    this.getScope().setExtras(t), this.getIsolationScope().setExtras(t);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setTag()` instead.
   */
  setTag(t, n) {
    this.getScope().setTag(t, n), this.getIsolationScope().setTag(t, n);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setExtra()` instead.
   */
  setExtra(t, n) {
    this.getScope().setExtra(t, n), this.getIsolationScope().setExtra(t, n);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setContext()` instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setContext(t, n) {
    this.getScope().setContext(t, n), this.getIsolationScope().setContext(t, n);
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `getScope()` directly.
   */
  configureScope(t) {
    const { scope: n, client: r } = this.getStackTop();
    r && t(n);
  }
  /**
   * @inheritDoc
   */
  // eslint-disable-next-line deprecation/deprecation
  run(t) {
    const n = tr(this);
    try {
      t(this);
    } finally {
      tr(n);
    }
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.getClient().getIntegrationByName()` instead.
   */
  getIntegration(t) {
    const n = this.getClient();
    if (!n)
      return null;
    try {
      return n.getIntegration(t);
    } catch {
      return W && _.warn(`Cannot retrieve integration ${t.id} from the current Hub`), null;
    }
  }
  /**
   * Starts a new `Transaction` and returns it. This is the entry point to manual tracing instrumentation.
   *
   * A tree structure can be built by adding child spans to the transaction, and child spans to other spans. To start a
   * new child span within the transaction or any span, call the respective `.startChild()` method.
   *
   * Every child span must be finished before the transaction is finished, otherwise the unfinished spans are discarded.
   *
   * The transaction must be finished with a call to its `.end()` method, at which point the transaction with all its
   * finished child spans will be sent to Sentry.
   *
   * @param context Properties of the new `Transaction`.
   * @param customSamplingContext Information given to the transaction sampling function (along with context-dependent
   * default values). See {@link Options.tracesSampler}.
   *
   * @returns The transaction which was just started
   *
   * @deprecated Use `startSpan()`, `startSpanManual()` or `startInactiveSpan()` instead.
   */
  startTransaction(t, n) {
    const r = this._callExtensionMethod("startTransaction", t, n);
    return W && !r && (this.getClient() ? _.warn(`Tracing extension 'startTransaction' has not been added. Call 'addTracingExtensions' before calling 'init':
Sentry.addTracingExtensions();
Sentry.init({...});
`) : _.warn(
      "Tracing extension 'startTransaction' is missing. You should 'init' the SDK before calling 'startTransaction'"
    )), r;
  }
  /**
   * @inheritDoc
   * @deprecated Use `spanToTraceHeader()` instead.
   */
  traceHeaders() {
    return this._callExtensionMethod("traceHeaders");
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use top level `captureSession` instead.
   */
  captureSession(t = !1) {
    if (t)
      return this.endSession();
    this._sendSessionUpdate();
  }
  /**
   * @inheritDoc
   * @deprecated Use top level `endSession` instead.
   */
  endSession() {
    const n = this.getStackTop().scope, r = n.getSession();
    r && sc(r), this._sendSessionUpdate(), n.setSession();
  }
  /**
   * @inheritDoc
   * @deprecated Use top level `startSession` instead.
   */
  startSession(t) {
    const { scope: n, client: r } = this.getStackTop(), { release: o, environment: s = ho } = r && r.getOptions() || {}, { userAgent: i } = x.navigator || {}, a = oc({
      release: o,
      environment: s,
      user: n.getUser(),
      ...i && { userAgent: i },
      ...t
    }), c = n.getSession && n.getSession();
    return c && c.status === "ok" && xt(c, { status: "exited" }), this.endSession(), n.setSession(a), a;
  }
  /**
   * Returns if default PII should be sent to Sentry and propagated in ourgoing requests
   * when Tracing is used.
   *
   * @deprecated Use top-level `getClient().getOptions().sendDefaultPii` instead. This function
   * only unnecessarily increased API surface but only wrapped accessing the option.
   */
  shouldSendDefaultPii() {
    const t = this.getClient(), n = t && t.getOptions();
    return !!(n && n.sendDefaultPii);
  }
  /**
   * Sends the current Session on the scope
   */
  _sendSessionUpdate() {
    const { scope: t, client: n } = this.getStackTop(), r = t.getSession();
    r && n && n.captureSession && n.captureSession(r);
  }
  /**
   * Calls global extension method and binding current instance to the function call
   */
  // @ts-expect-error Function lacks ending return statement and return type does not include 'undefined'. ts(2366)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _callExtensionMethod(t, ...n) {
    const o = St().__SENTRY__;
    if (o && o.extensions && typeof o.extensions[t] == "function")
      return o.extensions[t].apply(this, n);
    W && _.warn(`Extension method ${t} couldn't be found, doing nothing.`);
  }
}
function St() {
  return x.__SENTRY__ = x.__SENTRY__ || {
    extensions: {},
    hub: void 0
  }, x;
}
function tr(e) {
  const t = St(), n = cn(t);
  return _o(t, e), n;
}
function Oe() {
  const e = St();
  if (e.__SENTRY__ && e.__SENTRY__.acs) {
    const t = e.__SENTRY__.acs.getCurrentHub();
    if (t)
      return t;
  }
  return Rc(e);
}
function Rc(e = St()) {
  return (!Tc(e) || // eslint-disable-next-line deprecation/deprecation
  cn(e).isOlderThan(bo)) && _o(e, new vo()), cn(e);
}
function Tc(e) {
  return !!(e && e.__SENTRY__ && e.__SENTRY__.hub);
}
function cn(e) {
  return ro("hub", () => new vo(), e);
}
function _o(e, t) {
  if (!e)
    return !1;
  const n = e.__SENTRY__ = e.__SENTRY__ || {};
  return n.hub = t, !0;
}
function Dc(e) {
  const t = e.protocol ? `${e.protocol}:` : "", n = e.port ? `:${e.port}` : "";
  return `${t}//${e.host}${n}${e.path ? `/${e.path}` : ""}/api/`;
}
function Ic(e, t) {
  const n = _a(e);
  if (!n)
    return "";
  const r = `${Dc(n)}embed/error-page/`;
  let o = `dsn=${ya(n)}`;
  for (const s in t)
    if (s !== "dsn" && s !== "onClose")
      if (s === "user") {
        const i = t.user;
        if (!i)
          continue;
        i.name && (o += `&name=${encodeURIComponent(i.name)}`), i.email && (o += `&email=${encodeURIComponent(i.email)}`);
      } else
        o += `&${encodeURIComponent(s)}=${encodeURIComponent(t[s])}`;
  return `${r}?${o}`;
}
function he(e, t) {
  return Object.assign(
    function(...r) {
      return t(...r);
    },
    { id: e }
  );
}
const Mc = [
  /^Script error\.?$/,
  /^Javascript error: Script error\.? on line 0$/,
  /^ResizeObserver loop completed with undelivered notifications.$/,
  /^Cannot redefine property: googletag$/
], Nc = [
  /^.*\/healthcheck$/,
  /^.*\/healthy$/,
  /^.*\/live$/,
  /^.*\/ready$/,
  /^.*\/heartbeat$/,
  /^.*\/health$/,
  /^.*\/healthz$/
], Eo = "InboundFilters", Pc = (e = {}) => ({
  name: Eo,
  // TODO v8: Remove this
  setupOnce() {
  },
  // eslint-disable-line @typescript-eslint/no-empty-function
  processEvent(t, n, r) {
    const o = r.getOptions(), s = kc(e, o);
    return Ac(t, s) ? null : t;
  }
}), wo = Pc;
he(
  Eo,
  wo
);
function kc(e = {}, t = {}) {
  return {
    allowUrls: [...e.allowUrls || [], ...t.allowUrls || []],
    denyUrls: [...e.denyUrls || [], ...t.denyUrls || []],
    ignoreErrors: [
      ...e.ignoreErrors || [],
      ...t.ignoreErrors || [],
      ...e.disableErrorDefaults ? [] : Mc
    ],
    ignoreTransactions: [
      ...e.ignoreTransactions || [],
      ...t.ignoreTransactions || [],
      ...e.disableTransactionDefaults ? [] : Nc
    ],
    ignoreInternal: e.ignoreInternal !== void 0 ? e.ignoreInternal : !0
  };
}
function Ac(e, t) {
  return t.ignoreInternal && qc(e) ? (W && _.warn(`Event dropped due to being internal Sentry Error.
Event: ${ue(e)}`), !0) : $c(e, t.ignoreErrors) ? (W && _.warn(
    `Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${ue(e)}`
  ), !0) : Fc(e, t.ignoreTransactions) ? (W && _.warn(
    `Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${ue(e)}`
  ), !0) : jc(e, t.denyUrls) ? (W && _.warn(
    `Event dropped due to being matched by \`denyUrls\` option.
Event: ${ue(
      e
    )}.
Url: ${ft(e)}`
  ), !0) : Lc(e, t.allowUrls) ? !1 : (W && _.warn(
    `Event dropped due to not being matched by \`allowUrls\` option.
Event: ${ue(
      e
    )}.
Url: ${ft(e)}`
  ), !0);
}
function $c(e, t) {
  return e.type || !t || !t.length ? !1 : Uc(e).some((n) => wt(n, t));
}
function Fc(e, t) {
  if (e.type !== "transaction" || !t || !t.length)
    return !1;
  const n = e.transaction;
  return n ? wt(n, t) : !1;
}
function jc(e, t) {
  if (!t || !t.length)
    return !1;
  const n = ft(e);
  return n ? wt(n, t) : !1;
}
function Lc(e, t) {
  if (!t || !t.length)
    return !0;
  const n = ft(e);
  return n ? wt(n, t) : !0;
}
function Uc(e) {
  const t = [];
  e.message && t.push(e.message);
  let n;
  try {
    n = e.exception.values[e.exception.values.length - 1];
  } catch {
  }
  return n && n.value && (t.push(n.value), n.type && t.push(`${n.type}: ${n.value}`)), W && t.length === 0 && _.error(`Could not extract message for event ${ue(e)}`), t;
}
function qc(e) {
  try {
    return e.exception.values[0].type === "SentryError";
  } catch {
  }
  return !1;
}
function Hc(e = []) {
  for (let t = e.length - 1; t >= 0; t--) {
    const n = e[t];
    if (n && n.filename !== "<anonymous>" && n.filename !== "[native code]")
      return n.filename || null;
  }
  return null;
}
function ft(e) {
  try {
    let t;
    try {
      t = e.exception.values[0].stacktrace.frames;
    } catch {
    }
    return t ? Hc(t) : null;
  } catch {
    return W && _.error(`Cannot extract url for event ${ue(e)}`), null;
  }
}
let nr;
const xo = "FunctionToString", rr = /* @__PURE__ */ new WeakMap(), Gc = () => ({
  name: xo,
  setupOnce() {
    nr = Function.prototype.toString;
    try {
      Function.prototype.toString = function(...e) {
        const t = On(this), n = rr.has(U()) && t !== void 0 ? t : this;
        return nr.apply(n, e);
      };
    } catch {
    }
  },
  setup(e) {
    rr.set(e, !0);
  }
}), So = Gc;
he(
  xo,
  So
);
const M = x;
let un = 0;
function Co() {
  return un > 0;
}
function zc() {
  un++, setTimeout(() => {
    un--;
  });
}
function ke(e, t = {}, n) {
  if (typeof e != "function")
    return e;
  try {
    const o = e.__sentry_wrapped__;
    if (o)
      return typeof o == "function" ? o : e;
    if (On(e))
      return e;
  } catch {
    return e;
  }
  const r = function() {
    const o = Array.prototype.slice.call(arguments);
    try {
      n && typeof n == "function" && n.apply(this, arguments);
      const s = o.map((i) => ke(i, t));
      return e.apply(this, s);
    } catch (s) {
      throw zc(), mo((i) => {
        i.addEventProcessor((a) => (t.mechanism && (Zt(a, void 0, void 0), en(a, t.mechanism)), a.extra = {
          ...a.extra,
          arguments: o
        }, a)), po(s);
      }), s;
    }
  };
  try {
    for (const o in e)
      Object.prototype.hasOwnProperty.call(e, o) && (r[o] = e[o]);
  } catch {
  }
  io(r, e), lt(e, "__sentry_wrapped__", r);
  try {
    Object.getOwnPropertyDescriptor(r, "name").configurable && Object.defineProperty(r, "name", {
      get() {
        return e.name;
      }
    });
  } catch {
  }
  return r;
}
const Me = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function Oo(e, t) {
  const n = Tn(e, t), r = {
    type: t && t.name,
    value: Qc(t)
  };
  return n.length && (r.stacktrace = { frames: n }), r.type === void 0 && r.value === "" && (r.value = "Unrecoverable error caught"), r;
}
function Bc(e, t, n, r) {
  const o = U(), s = o && o.getOptions().normalizeDepth, i = {
    exception: {
      values: [
        {
          type: Et(t) ? t.constructor.name : r ? "UnhandledRejection" : "Error",
          value: Kc(t, { isUnhandledRejection: r })
        }
      ]
    },
    extra: {
      __serialized__: uo(t, s)
    }
  };
  if (n) {
    const a = Tn(e, n);
    a.length && (i.exception.values[0].stacktrace = { frames: a });
  }
  return i;
}
function qt(e, t) {
  return {
    exception: {
      values: [Oo(e, t)]
    }
  };
}
function Tn(e, t) {
  const n = t.stacktrace || t.stack || "", r = Vc(t);
  try {
    return e(n, r);
  } catch {
  }
  return [];
}
const Wc = /Minified React error #\d+;/i;
function Vc(e) {
  if (e) {
    if (typeof e.framesToPop == "number")
      return e.framesToPop;
    if (Wc.test(e.message))
      return 1;
  }
  return 0;
}
function Qc(e) {
  const t = e && e.message;
  return t ? t.error && typeof t.error.message == "string" ? t.error.message : t : "No error message";
}
function Ro(e, t, n, r, o) {
  let s;
  if (En(t) && t.error)
    return qt(e, t.error);
  if (Gn(t) || ta(t)) {
    const i = t;
    if ("stack" in t)
      s = qt(e, t);
    else {
      const a = i.name || (Gn(i) ? "DOMError" : "DOMException"), c = i.message ? `${a}: ${i.message}` : a;
      s = or(e, c, n, r), Zt(s, c);
    }
    return "code" in i && (s.tags = { ...s.tags, "DOMException.code": `${i.code}` }), s;
  }
  return _n(t) ? qt(e, t) : _t(t) || Et(t) ? (s = Bc(e, t, n, o), en(s, {
    synthetic: !0
  }), s) : (s = or(e, t, n, r), Zt(s, `${t}`, void 0), en(s, {
    synthetic: !0
  }), s);
}
function or(e, t, n, r) {
  const o = {};
  if (r && n) {
    const s = Tn(e, n);
    s.length && (o.exception = {
      values: [{ value: t, stacktrace: { frames: s } }]
    });
  }
  if (eo(t)) {
    const { __sentry_template_string__: s, __sentry_template_values__: i } = t;
    return o.logentry = {
      message: s,
      params: i
    }, o;
  }
  return o.message = t, o;
}
function Kc(e, { isUnhandledRejection: t }) {
  const n = Ea(e), r = t ? "promise rejection" : "exception";
  return En(e) ? `Event \`ErrorEvent\` captured as ${r} with message \`${e.message}\`` : Et(e) ? `Event \`${Yc(e)}\` (type=${e.type}) captured as ${r}` : `Object captured as ${r} with keys: ${n}`;
}
function Yc(e) {
  try {
    const t = Object.getPrototypeOf(e);
    return t ? t.constructor.name : void 0;
  } catch {
  }
}
const nt = 1024, To = "Breadcrumbs", Xc = (e = {}) => {
  const t = {
    console: !0,
    dom: !0,
    fetch: !0,
    history: !0,
    sentry: !0,
    xhr: !0,
    ...e
  };
  return {
    name: To,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    setup(n) {
      t.console && xa(eu(n)), t.dom && Ra(Zc(n, t.dom)), t.xhr && Ba(tu(n)), t.fetch && ka(nu(n)), t.history && Ha(ru(n)), t.sentry && n.on && n.on("beforeSendEvent", Jc(n));
    }
  };
}, Do = Xc;
he(To, Do);
function Jc(e) {
  return function(n) {
    U() === e && Ee(
      {
        category: `sentry.${n.type === "transaction" ? "transaction" : "event"}`,
        event_id: n.event_id,
        level: n.level,
        message: ue(n)
      },
      {
        event: n
      }
    );
  };
}
function Zc(e, t) {
  return function(r) {
    if (U() !== e)
      return;
    let o, s, i = typeof t == "object" ? t.serializeAttribute : void 0, a = typeof t == "object" && typeof t.maxStringLength == "number" ? t.maxStringLength : void 0;
    a && a > nt && (Me && _.warn(
      `\`dom.maxStringLength\` cannot exceed ${nt}, but a value of ${a} was configured. Sentry will use ${nt} instead.`
    ), a = nt), typeof i == "string" && (i = [i]);
    try {
      const u = r.event, l = ou(u) ? u.target : u;
      o = oo(l, { keyAttrs: i, maxStringLength: a }), s = fa(l);
    } catch {
      o = "<unknown>";
    }
    if (o.length === 0)
      return;
    const c = {
      category: `ui.${r.name}`,
      message: o
    };
    s && (c.data = { "ui.component_name": s }), Ee(c, {
      event: r.event,
      name: r.name,
      global: r.global
    });
  };
}
function eu(e) {
  return function(n) {
    if (U() !== e)
      return;
    const r = {
      category: "console",
      data: {
        arguments: n.args,
        logger: "console"
      },
      level: tc(n.level),
      message: zn(n.args, " ")
    };
    if (n.level === "assert")
      if (n.args[0] === !1)
        r.message = `Assertion failed: ${zn(n.args.slice(1), " ") || "console.assert"}`, r.data.arguments = n.args.slice(1);
      else
        return;
    Ee(r, {
      input: n.args,
      level: n.level
    });
  };
}
function tu(e) {
  return function(n) {
    if (U() !== e)
      return;
    const { startTimestamp: r, endTimestamp: o } = n, s = n.xhr[Ge];
    if (!r || !o || !s)
      return;
    const { method: i, url: a, status_code: c, body: u } = s, l = {
      method: i,
      url: a,
      status_code: c
    }, d = {
      xhr: n.xhr,
      input: u,
      startTimestamp: r,
      endTimestamp: o
    };
    Ee(
      {
        category: "xhr",
        data: l,
        type: "http"
      },
      d
    );
  };
}
function nu(e) {
  return function(n) {
    if (U() !== e)
      return;
    const { startTimestamp: r, endTimestamp: o } = n;
    if (o && !(n.fetchData.url.match(/sentry_key/) && n.fetchData.method === "POST"))
      if (n.error) {
        const s = n.fetchData, i = {
          data: n.error,
          input: n.args,
          startTimestamp: r,
          endTimestamp: o
        };
        Ee(
          {
            category: "fetch",
            data: s,
            level: "error",
            type: "http"
          },
          i
        );
      } else {
        const s = n.response, i = {
          ...n.fetchData,
          status_code: s && s.status
        }, a = {
          input: n.args,
          response: s,
          startTimestamp: r,
          endTimestamp: o
        };
        Ee(
          {
            category: "fetch",
            data: i,
            type: "http"
          },
          a
        );
      }
  };
}
function ru(e) {
  return function(n) {
    if (U() !== e)
      return;
    let r = n.from, o = n.to;
    const s = Ut(M.location.href);
    let i = r ? Ut(r) : void 0;
    const a = Ut(o);
    (!i || !i.path) && (i = s), s.protocol === a.protocol && s.host === a.host && (o = a.relative), s.protocol === i.protocol && s.host === i.host && (r = i.relative), Ee({
      category: "navigation",
      data: {
        from: r,
        to: o
      }
    });
  };
}
function ou(e) {
  return !!e && !!e.target;
}
const Io = "Dedupe", su = () => {
  let e;
  return {
    name: Io,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    processEvent(t) {
      if (t.type)
        return t;
      try {
        if (iu(t, e))
          return Me && _.warn("Event dropped due to being a duplicate of previously captured event."), null;
      } catch {
      }
      return e = t;
    }
  };
}, Mo = su;
he(Io, Mo);
function iu(e, t) {
  return t ? !!(au(e, t) || cu(e, t)) : !1;
}
function au(e, t) {
  const n = e.message, r = t.message;
  return !(!n && !r || n && !r || !n && r || n !== r || !Po(e, t) || !No(e, t));
}
function cu(e, t) {
  const n = sr(t), r = sr(e);
  return !(!n || !r || n.type !== r.type || n.value !== r.value || !Po(e, t) || !No(e, t));
}
function No(e, t) {
  let n = ir(e), r = ir(t);
  if (!n && !r)
    return !0;
  if (n && !r || !n && r || (n = n, r = r, r.length !== n.length))
    return !1;
  for (let o = 0; o < r.length; o++) {
    const s = r[o], i = n[o];
    if (s.filename !== i.filename || s.lineno !== i.lineno || s.colno !== i.colno || s.function !== i.function)
      return !1;
  }
  return !0;
}
function Po(e, t) {
  let n = e.fingerprint, r = t.fingerprint;
  if (!n && !r)
    return !0;
  if (n && !r || !n && r)
    return !1;
  n = n, r = r;
  try {
    return n.join("") === r.join("");
  } catch {
    return !1;
  }
}
function sr(e) {
  return e.exception && e.exception.values && e.exception.values[0];
}
function ir(e) {
  const t = e.exception;
  if (t)
    try {
      return t.values[0].stacktrace.frames;
    } catch {
      return;
    }
}
const ko = "GlobalHandlers", uu = (e = {}) => {
  const t = {
    onerror: !0,
    onunhandledrejection: !0,
    ...e
  };
  return {
    name: ko,
    setupOnce() {
      Error.stackTraceLimit = 50;
    },
    setup(n) {
      t.onerror && (lu(n), ar("onerror")), t.onunhandledrejection && (du(n), ar("onunhandledrejection"));
    }
  };
}, Ao = uu;
he(
  ko,
  Ao
);
function lu(e) {
  Fa((t) => {
    const { stackParser: n, attachStacktrace: r } = Fo();
    if (U() !== e || Co())
      return;
    const { msg: o, url: s, line: i, column: a, error: c } = t, u = c === void 0 && ne(o) ? pu(o, s, i, a) : $o(
      Ro(n, c || o, void 0, r, !1),
      s,
      i,
      a
    );
    u.level = "error", go(u, {
      originalException: c,
      mechanism: {
        handled: !1,
        type: "onerror"
      }
    });
  });
}
function du(e) {
  La((t) => {
    const { stackParser: n, attachStacktrace: r } = Fo();
    if (U() !== e || Co())
      return;
    const o = fu(t), s = to(o) ? hu(o) : Ro(n, o, void 0, r, !0);
    s.level = "error", go(s, {
      originalException: o,
      mechanism: {
        handled: !1,
        type: "onunhandledrejection"
      }
    });
  });
}
function fu(e) {
  if (to(e))
    return e;
  const t = e;
  try {
    if ("reason" in t)
      return t.reason;
    if ("detail" in t && "reason" in t.detail)
      return t.detail.reason;
  } catch {
  }
  return e;
}
function hu(e) {
  return {
    exception: {
      values: [
        {
          type: "UnhandledRejection",
          // String() is needed because the Primitive type includes symbols (which can't be automatically stringified)
          value: `Non-Error promise rejection captured with value: ${String(e)}`
        }
      ]
    }
  };
}
function pu(e, t, n, r) {
  const o = /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/i;
  let s = En(e) ? e.message : e, i = "Error";
  const a = s.match(o);
  return a && (i = a[1], s = a[2]), $o({
    exception: {
      values: [
        {
          type: i,
          value: s
        }
      ]
    }
  }, t, n, r);
}
function $o(e, t, n, r) {
  const o = e.exception = e.exception || {}, s = o.values = o.values || [], i = s[0] = s[0] || {}, a = i.stacktrace = i.stacktrace || {}, c = a.frames = a.frames || [], u = isNaN(parseInt(r, 10)) ? void 0 : r, l = isNaN(parseInt(n, 10)) ? void 0 : n, d = ne(t) && t.length > 0 ? t : da();
  return c.length === 0 && c.push({
    colno: u,
    filename: d,
    function: "?",
    in_app: !0,
    lineno: l
  }), e;
}
function ar(e) {
  Me && _.log(`Global Handler attached: ${e}`);
}
function Fo() {
  const e = U();
  return e && e.getOptions() || {
    stackParser: () => [],
    attachStacktrace: !1
  };
}
const jo = "HttpContext", gu = () => ({
  name: jo,
  // TODO v8: Remove this
  setupOnce() {
  },
  // eslint-disable-line @typescript-eslint/no-empty-function
  preprocessEvent(e) {
    if (!M.navigator && !M.location && !M.document)
      return;
    const t = e.request && e.request.url || M.location && M.location.href, { referrer: n } = M.document || {}, { userAgent: r } = M.navigator || {}, o = {
      ...e.request && e.request.headers,
      ...n && { Referer: n },
      ...r && { "User-Agent": r }
    }, s = { ...e.request, ...t && { url: t }, headers: o };
    e.request = s;
  }
}), Lo = gu;
he(jo, Lo);
const mu = "cause", yu = 5, Uo = "LinkedErrors", bu = (e = {}) => {
  const t = e.limit || yu, n = e.key || mu;
  return {
    name: Uo,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    preprocessEvent(r, o, s) {
      const i = s.getOptions();
      aa(
        // This differs from the LinkedErrors integration in core by using a different exceptionFromError function
        Oo,
        i.stackParser,
        i.maxValueLength,
        n,
        t,
        r,
        o
      );
    }
  };
}, qo = bu;
he(Uo, qo);
const vu = [
  "EventTarget",
  "Window",
  "Node",
  "ApplicationCache",
  "AudioTrackList",
  "BroadcastChannel",
  "ChannelMergerNode",
  "CryptoOperation",
  "EventSource",
  "FileReader",
  "HTMLUnknownElement",
  "IDBDatabase",
  "IDBRequest",
  "IDBTransaction",
  "KeyOperation",
  "MediaController",
  "MessagePort",
  "ModalWindow",
  "Notification",
  "SVGElementInstance",
  "Screen",
  "SharedWorker",
  "TextTrack",
  "TextTrackCue",
  "TextTrackList",
  "WebSocket",
  "WebSocketWorker",
  "Worker",
  "XMLHttpRequest",
  "XMLHttpRequestEventTarget",
  "XMLHttpRequestUpload"
], Ho = "TryCatch", _u = (e = {}) => {
  const t = {
    XMLHttpRequest: !0,
    eventTarget: !0,
    requestAnimationFrame: !0,
    setInterval: !0,
    setTimeout: !0,
    ...e
  };
  return {
    name: Ho,
    // TODO: This currently only works for the first client this is setup
    // We may want to adjust this to check for client etc.
    setupOnce() {
      t.setTimeout && A(M, "setTimeout", cr), t.setInterval && A(M, "setInterval", cr), t.requestAnimationFrame && A(M, "requestAnimationFrame", Eu), t.XMLHttpRequest && "XMLHttpRequest" in M && A(XMLHttpRequest.prototype, "send", wu);
      const n = t.eventTarget;
      n && (Array.isArray(n) ? n : vu).forEach(xu);
    }
  };
}, Go = _u;
he(
  Ho,
  Go
);
function cr(e) {
  return function(...t) {
    const n = t[0];
    return t[0] = ke(n, {
      mechanism: {
        data: { function: de(e) },
        handled: !1,
        type: "instrument"
      }
    }), e.apply(this, t);
  };
}
function Eu(e) {
  return function(t) {
    return e.apply(this, [
      ke(t, {
        mechanism: {
          data: {
            function: "requestAnimationFrame",
            handler: de(e)
          },
          handled: !1,
          type: "instrument"
        }
      })
    ]);
  };
}
function wu(e) {
  return function(...t) {
    const n = this;
    return ["onload", "onerror", "onprogress", "onreadystatechange"].forEach((o) => {
      o in n && typeof n[o] == "function" && A(n, o, function(s) {
        const i = {
          mechanism: {
            data: {
              function: o,
              handler: de(s)
            },
            handled: !1,
            type: "instrument"
          }
        }, a = On(s);
        return a && (i.mechanism.data.handler = de(a)), ke(s, i);
      });
    }), e.apply(this, t);
  };
}
function xu(e) {
  const t = M, n = t[e] && t[e].prototype;
  !n || !n.hasOwnProperty || !n.hasOwnProperty("addEventListener") || (A(n, "addEventListener", function(r) {
    return function(o, s, i) {
      try {
        typeof s.handleEvent == "function" && (s.handleEvent = ke(s.handleEvent, {
          mechanism: {
            data: {
              function: "handleEvent",
              handler: de(s),
              target: e
            },
            handled: !1,
            type: "instrument"
          }
        }));
      } catch {
      }
      return r.apply(this, [
        o,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ke(s, {
          mechanism: {
            data: {
              function: "addEventListener",
              handler: de(s),
              target: e
            },
            handled: !1,
            type: "instrument"
          }
        }),
        i
      ]);
    };
  }), A(
    n,
    "removeEventListener",
    function(r) {
      return function(o, s, i) {
        const a = s;
        try {
          const c = a && a.__sentry_wrapped__;
          c && r.call(this, o, c, i);
        } catch {
        }
        return r.call(this, o, a, i);
      };
    }
  ));
}
wo(), So(), Go(), Do(), Ao(), qo(), Mo(), Lo();
const ur = (e = {}, t = Oe()) => {
  if (!M.document) {
    Me && _.error("Global document not defined in showReportDialog call");
    return;
  }
  const { client: n, scope: r } = t.getStackTop(), o = e.dsn || n && n.getDsn();
  if (!o) {
    Me && _.error("DSN not configured for showReportDialog call");
    return;
  }
  r && (e.user = {
    ...r.getUser(),
    ...e.user
  }), e.eventId || (e.eventId = t.lastEventId());
  const s = M.document.createElement("script");
  s.async = !0, s.crossOrigin = "anonymous", s.src = Ic(o, e), e.onLoad && (s.onload = e.onLoad);
  const { onClose: i } = e;
  if (i) {
    const c = (u) => {
      if (u.data === "__sentry_reportdialog_closed__")
        try {
          i();
        } finally {
          M.removeEventListener("message", c);
        }
    };
    M.addEventListener("message", c);
  }
  const a = M.document.head || M.document.body;
  a ? a.appendChild(s) : Me && _.error("Not injecting report dialog. No injection point found in HTML");
};
var zo = { exports: {} }, E = {};
/** @license React v16.13.1
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var P = typeof Symbol == "function" && Symbol.for, Dn = P ? Symbol.for("react.element") : 60103, In = P ? Symbol.for("react.portal") : 60106, Ct = P ? Symbol.for("react.fragment") : 60107, Ot = P ? Symbol.for("react.strict_mode") : 60108, Rt = P ? Symbol.for("react.profiler") : 60114, Tt = P ? Symbol.for("react.provider") : 60109, Dt = P ? Symbol.for("react.context") : 60110, Mn = P ? Symbol.for("react.async_mode") : 60111, It = P ? Symbol.for("react.concurrent_mode") : 60111, Mt = P ? Symbol.for("react.forward_ref") : 60112, Nt = P ? Symbol.for("react.suspense") : 60113, Su = P ? Symbol.for("react.suspense_list") : 60120, Pt = P ? Symbol.for("react.memo") : 60115, kt = P ? Symbol.for("react.lazy") : 60116, Cu = P ? Symbol.for("react.block") : 60121, Ou = P ? Symbol.for("react.fundamental") : 60117, Ru = P ? Symbol.for("react.responder") : 60118, Tu = P ? Symbol.for("react.scope") : 60119;
function q(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case Dn:
        switch (e = e.type, e) {
          case Mn:
          case It:
          case Ct:
          case Rt:
          case Ot:
          case Nt:
            return e;
          default:
            switch (e = e && e.$$typeof, e) {
              case Dt:
              case Mt:
              case kt:
              case Pt:
              case Tt:
                return e;
              default:
                return t;
            }
        }
      case In:
        return t;
    }
  }
}
function Bo(e) {
  return q(e) === It;
}
E.AsyncMode = Mn;
E.ConcurrentMode = It;
E.ContextConsumer = Dt;
E.ContextProvider = Tt;
E.Element = Dn;
E.ForwardRef = Mt;
E.Fragment = Ct;
E.Lazy = kt;
E.Memo = Pt;
E.Portal = In;
E.Profiler = Rt;
E.StrictMode = Ot;
E.Suspense = Nt;
E.isAsyncMode = function(e) {
  return Bo(e) || q(e) === Mn;
};
E.isConcurrentMode = Bo;
E.isContextConsumer = function(e) {
  return q(e) === Dt;
};
E.isContextProvider = function(e) {
  return q(e) === Tt;
};
E.isElement = function(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Dn;
};
E.isForwardRef = function(e) {
  return q(e) === Mt;
};
E.isFragment = function(e) {
  return q(e) === Ct;
};
E.isLazy = function(e) {
  return q(e) === kt;
};
E.isMemo = function(e) {
  return q(e) === Pt;
};
E.isPortal = function(e) {
  return q(e) === In;
};
E.isProfiler = function(e) {
  return q(e) === Rt;
};
E.isStrictMode = function(e) {
  return q(e) === Ot;
};
E.isSuspense = function(e) {
  return q(e) === Nt;
};
E.isValidElementType = function(e) {
  return typeof e == "string" || typeof e == "function" || e === Ct || e === It || e === Rt || e === Ot || e === Nt || e === Su || typeof e == "object" && e !== null && (e.$$typeof === kt || e.$$typeof === Pt || e.$$typeof === Tt || e.$$typeof === Dt || e.$$typeof === Mt || e.$$typeof === Ou || e.$$typeof === Ru || e.$$typeof === Tu || e.$$typeof === Cu);
};
E.typeOf = q;
zo.exports = E;
var Du = zo.exports, Wo = Du, Iu = {
  $$typeof: !0,
  render: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0
}, Mu = {
  $$typeof: !0,
  compare: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0,
  type: !0
}, Vo = {};
Vo[Wo.ForwardRef] = Iu;
Vo[Wo.Memo] = Mu;
const Nu = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function Pu(e) {
  const t = e.match(/^([^.]+)/);
  return t !== null && parseInt(t[0]) >= 17;
}
const lr = {
  componentStack: null,
  error: null,
  eventId: null
};
function ku(e, t) {
  const n = /* @__PURE__ */ new WeakMap();
  function r(o, s) {
    if (!n.has(o)) {
      if (o.cause)
        return n.set(o, !0), r(o.cause, s);
      o.cause = s;
    }
  }
  r(e, t);
}
class Nn extends Mr {
  constructor(t) {
    super(t), Nn.prototype.__init.call(this), this.state = lr, this._openFallbackReportDialog = !0;
    const n = U();
    n && n.on && t.showDialog && (this._openFallbackReportDialog = !1, n.on("afterSendEvent", (r) => {
      !r.type && r.event_id === this._lastEventId && ur({ ...t.dialogOptions, eventId: this._lastEventId });
    }));
  }
  componentDidCatch(t, { componentStack: n }) {
    const { beforeCapture: r, onError: o, showDialog: s, dialogOptions: i } = this.props;
    mo((a) => {
      if (Pu($r) && _n(t)) {
        const u = new Error(t.message);
        u.name = `React ErrorBoundary ${t.name}`, u.stack = n, ku(t, u);
      }
      r && r(a, t, n);
      const c = po(t, {
        captureContext: {
          contexts: { react: { componentStack: n } }
        },
        // If users provide a fallback component we can assume they are handling the error.
        // Therefore, we set the mechanism depending on the presence of the fallback prop.
        mechanism: { handled: !!this.props.fallback }
      });
      o && o(t, n, c), s && (this._lastEventId = c, this._openFallbackReportDialog && ur({ ...i, eventId: c })), this.setState({ error: t, componentStack: n, eventId: c });
    });
  }
  componentDidMount() {
    const { onMount: t } = this.props;
    t && t();
  }
  componentWillUnmount() {
    const { error: t, componentStack: n, eventId: r } = this.state, { onUnmount: o } = this.props;
    o && o(t, n, r);
  }
  __init() {
    this.resetErrorBoundary = () => {
      const { onReset: t } = this.props, { error: n, componentStack: r, eventId: o } = this.state;
      t && t(n, r, o), this.setState(lr);
    };
  }
  render() {
    const { fallback: t, children: n } = this.props, r = this.state;
    if (r.error) {
      let o;
      return typeof t == "function" ? o = t({
        error: r.error,
        componentStack: r.componentStack,
        resetError: this.resetErrorBoundary,
        eventId: r.eventId
      }) : o = t, Pe(o) ? o : (t && Nu && _.warn("fallback did not produce a valid ReactElement"), null);
    }
    return typeof n == "function" ? n() : n;
  }
}
function Au(e) {
  const t = Object.prototype.toString.call(e);
  return t === "[object Window]" || // In Electron context the Window object serializes to [object global]
  t === "[object global]";
}
function $u(e) {
  return "nodeType" in e;
}
function Fu(e) {
  var t, n;
  return e ? Au(e) ? e : $u(e) && (t = (n = e.ownerDocument) == null ? void 0 : n.defaultView) != null ? t : window : window;
}
var dr;
(function(e) {
  e.DragStart = "dragStart", e.DragMove = "dragMove", e.DragEnd = "dragEnd", e.DragCancel = "dragCancel", e.DragOver = "dragOver", e.RegisterDroppable = "registerDroppable", e.SetDroppableDisabled = "setDroppableDisabled", e.UnregisterDroppable = "unregisterDroppable";
})(dr || (dr = {}));
const ju = /* @__PURE__ */ Object.freeze({
  x: 0,
  y: 0
});
function Lu(e) {
  if (e.startsWith("matrix3d(")) {
    const t = e.slice(9, -1).split(/, /);
    return {
      x: +t[12],
      y: +t[13],
      scaleX: +t[0],
      scaleY: +t[5]
    };
  } else if (e.startsWith("matrix(")) {
    const t = e.slice(7, -1).split(/, /);
    return {
      x: +t[4],
      y: +t[5],
      scaleX: +t[0],
      scaleY: +t[3]
    };
  }
  return null;
}
function Uu(e, t, n) {
  const r = Lu(t);
  if (!r)
    return e;
  const {
    scaleX: o,
    scaleY: s,
    x: i,
    y: a
  } = r, c = e.left - i - (1 - o) * parseFloat(n), u = e.top - a - (1 - s) * parseFloat(n.slice(n.indexOf(" ") + 1)), l = o ? e.width / o : e.width, d = s ? e.height / s : e.height;
  return {
    width: l,
    height: d,
    top: u,
    right: c + l,
    bottom: u + d,
    left: c
  };
}
const qu = {
  ignoreTransform: !1
};
function Qo(e, t) {
  t === void 0 && (t = qu);
  let n = e.getBoundingClientRect();
  if (t.ignoreTransform) {
    const {
      transform: u,
      transformOrigin: l
    } = Fu(e).getComputedStyle(e);
    u && (n = Uu(n, u, l));
  }
  const {
    top: r,
    left: o,
    width: s,
    height: i,
    bottom: a,
    right: c
  } = n;
  return {
    top: r,
    left: o,
    width: s,
    height: i,
    bottom: a,
    right: c
  };
}
function fr(e) {
  return Qo(e, {
    ignoreTransform: !0
  });
}
var Te;
(function(e) {
  e[e.Forward = 1] = "Forward", e[e.Backward = -1] = "Backward";
})(Te || (Te = {}));
var hr;
(function(e) {
  e.Click = "click", e.DragStart = "dragstart", e.Keydown = "keydown", e.ContextMenu = "contextmenu", e.Resize = "resize", e.SelectionChange = "selectionchange", e.VisibilityChange = "visibilitychange";
})(hr || (hr = {}));
var V;
(function(e) {
  e.Space = "Space", e.Down = "ArrowDown", e.Right = "ArrowRight", e.Left = "ArrowLeft", e.Up = "ArrowUp", e.Esc = "Escape", e.Enter = "Enter";
})(V || (V = {}));
V.Space, V.Enter, V.Esc, V.Space, V.Enter;
var pr;
(function(e) {
  e[e.RightClick = 2] = "RightClick";
})(pr || (pr = {}));
var gr;
(function(e) {
  e[e.Pointer = 0] = "Pointer", e[e.DraggableRect = 1] = "DraggableRect";
})(gr || (gr = {}));
var mr;
(function(e) {
  e[e.TreeOrder = 0] = "TreeOrder", e[e.ReversedTreeOrder = 1] = "ReversedTreeOrder";
})(mr || (mr = {}));
Te.Backward + "", Te.Forward + "", Te.Backward + "", Te.Forward + "";
var ln;
(function(e) {
  e[e.Always = 0] = "Always", e[e.BeforeDragging = 1] = "BeforeDragging", e[e.WhileDragging = 2] = "WhileDragging";
})(ln || (ln = {}));
var dn;
(function(e) {
  e.Optimized = "optimized";
})(dn || (dn = {}));
ln.WhileDragging, dn.Optimized;
({
  ...ju
});
var yr;
(function(e) {
  e[e.Uninitialized = 0] = "Uninitialized", e[e.Initializing = 1] = "Initializing", e[e.Initialized = 2] = "Initialized";
})(yr || (yr = {}));
V.Down, V.Right, V.Up, V.Left;
function Ko(e) {
  var t, n, r = "";
  if (typeof e == "string" || typeof e == "number")
    r += e;
  else if (typeof e == "object")
    if (Array.isArray(e))
      for (t = 0; t < e.length; t++)
        e[t] && (n = Ko(e[t])) && (r && (r += " "), r += n);
    else
      for (t in e)
        e[t] && (r && (r += " "), r += t);
  return r;
}
function Hu() {
  for (var e, t, n = 0, r = ""; n < arguments.length; )
    (e = arguments[n++]) && (t = Ko(e)) && (r && (r += " "), r += t);
  return r;
}
const br = (e) => typeof e == "boolean" ? "".concat(e) : e === 0 ? "0" : e, vr = Hu, Gu = (e, t) => (n) => {
  var r;
  if ((t == null ? void 0 : t.variants) == null)
    return vr(e, n == null ? void 0 : n.class, n == null ? void 0 : n.className);
  const { variants: o, defaultVariants: s } = t, i = Object.keys(o).map((u) => {
    const l = n == null ? void 0 : n[u], d = s == null ? void 0 : s[u];
    if (l === null)
      return null;
    const f = br(l) || br(d);
    return o[u][f];
  }), a = n && Object.entries(n).reduce((u, l) => {
    let [d, f] = l;
    return f === void 0 || (u[d] = f), u;
  }, {}), c = t == null || (r = t.compoundVariants) === null || r === void 0 ? void 0 : r.reduce((u, l) => {
    let { class: d, className: f, ...h } = l;
    return Object.entries(h).every((g) => {
      let [m, p] = g;
      return Array.isArray(p) ? p.includes({
        ...s,
        ...a
      }[m]) : {
        ...s,
        ...a
      }[m] === p;
    }) ? [
      ...u,
      d,
      f
    ] : u;
  }, []);
  return vr(e, i, c, n == null ? void 0 : n.class, n == null ? void 0 : n.className);
}, Pn = "-", zu = (e) => {
  const t = Wu(e), {
    conflictingClassGroups: n,
    conflictingClassGroupModifiers: r
  } = e;
  return {
    getClassGroupId: (i) => {
      const a = i.split(Pn);
      return a[0] === "" && a.length !== 1 && a.shift(), Yo(a, t) || Bu(i);
    },
    getConflictingClassGroupIds: (i, a) => {
      const c = n[i] || [];
      return a && r[i] ? [...c, ...r[i]] : c;
    }
  };
}, Yo = (e, t) => {
  var i;
  if (e.length === 0)
    return t.classGroupId;
  const n = e[0], r = t.nextPart.get(n), o = r ? Yo(e.slice(1), r) : void 0;
  if (o)
    return o;
  if (t.validators.length === 0)
    return;
  const s = e.join(Pn);
  return (i = t.validators.find(({
    validator: a
  }) => a(s))) == null ? void 0 : i.classGroupId;
}, _r = /^\[(.+)\]$/, Bu = (e) => {
  if (_r.test(e)) {
    const t = _r.exec(e)[1], n = t == null ? void 0 : t.substring(0, t.indexOf(":"));
    if (n)
      return "arbitrary.." + n;
  }
}, Wu = (e) => {
  const {
    theme: t,
    prefix: n
  } = e, r = {
    nextPart: /* @__PURE__ */ new Map(),
    validators: []
  };
  return Qu(Object.entries(e.classGroups), n).forEach(([s, i]) => {
    fn(i, r, s, t);
  }), r;
}, fn = (e, t, n, r) => {
  e.forEach((o) => {
    if (typeof o == "string") {
      const s = o === "" ? t : Er(t, o);
      s.classGroupId = n;
      return;
    }
    if (typeof o == "function") {
      if (Vu(o)) {
        fn(o(r), t, n, r);
        return;
      }
      t.validators.push({
        validator: o,
        classGroupId: n
      });
      return;
    }
    Object.entries(o).forEach(([s, i]) => {
      fn(i, Er(t, s), n, r);
    });
  });
}, Er = (e, t) => {
  let n = e;
  return t.split(Pn).forEach((r) => {
    n.nextPart.has(r) || n.nextPart.set(r, {
      nextPart: /* @__PURE__ */ new Map(),
      validators: []
    }), n = n.nextPart.get(r);
  }), n;
}, Vu = (e) => e.isThemeGetter, Qu = (e, t) => t ? e.map(([n, r]) => {
  const o = r.map((s) => typeof s == "string" ? t + s : typeof s == "object" ? Object.fromEntries(Object.entries(s).map(([i, a]) => [t + i, a])) : s);
  return [n, o];
}) : e, Ku = (e) => {
  if (e < 1)
    return {
      get: () => {
      },
      set: () => {
      }
    };
  let t = 0, n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  const o = (s, i) => {
    n.set(s, i), t++, t > e && (t = 0, r = n, n = /* @__PURE__ */ new Map());
  };
  return {
    get(s) {
      let i = n.get(s);
      if (i !== void 0)
        return i;
      if ((i = r.get(s)) !== void 0)
        return o(s, i), i;
    },
    set(s, i) {
      n.has(s) ? n.set(s, i) : o(s, i);
    }
  };
}, Xo = "!", Yu = (e) => {
  const {
    separator: t,
    experimentalParseClassName: n
  } = e, r = t.length === 1, o = t[0], s = t.length, i = (a) => {
    const c = [];
    let u = 0, l = 0, d;
    for (let p = 0; p < a.length; p++) {
      let b = a[p];
      if (u === 0) {
        if (b === o && (r || a.slice(p, p + s) === t)) {
          c.push(a.slice(l, p)), l = p + s;
          continue;
        }
        if (b === "/") {
          d = p;
          continue;
        }
      }
      b === "[" ? u++ : b === "]" && u--;
    }
    const f = c.length === 0 ? a : a.substring(l), h = f.startsWith(Xo), g = h ? f.substring(1) : f, m = d && d > l ? d - l : void 0;
    return {
      modifiers: c,
      hasImportantModifier: h,
      baseClassName: g,
      maybePostfixModifierPosition: m
    };
  };
  return n ? (a) => n({
    className: a,
    parseClassName: i
  }) : i;
}, Xu = (e) => {
  if (e.length <= 1)
    return e;
  const t = [];
  let n = [];
  return e.forEach((r) => {
    r[0] === "[" ? (t.push(...n.sort(), r), n = []) : n.push(r);
  }), t.push(...n.sort()), t;
}, Ju = (e) => ({
  cache: Ku(e.cacheSize),
  parseClassName: Yu(e),
  ...zu(e)
}), Zu = /\s+/, el = (e, t) => {
  const {
    parseClassName: n,
    getClassGroupId: r,
    getConflictingClassGroupIds: o
  } = t, s = [], i = e.trim().split(Zu);
  let a = "";
  for (let c = i.length - 1; c >= 0; c -= 1) {
    const u = i[c], {
      modifiers: l,
      hasImportantModifier: d,
      baseClassName: f,
      maybePostfixModifierPosition: h
    } = n(u);
    let g = !!h, m = r(g ? f.substring(0, h) : f);
    if (!m) {
      if (!g) {
        a = u + (a.length > 0 ? " " + a : a);
        continue;
      }
      if (m = r(f), !m) {
        a = u + (a.length > 0 ? " " + a : a);
        continue;
      }
      g = !1;
    }
    const p = Xu(l).join(":"), b = d ? p + Xo : p, C = b + m;
    if (s.includes(C))
      continue;
    s.push(C);
    const k = o(m, g);
    for (let T = 0; T < k.length; ++T) {
      const H = k[T];
      s.push(b + H);
    }
    a = u + (a.length > 0 ? " " + a : a);
  }
  return a;
};
function tl() {
  let e = 0, t, n, r = "";
  for (; e < arguments.length; )
    (t = arguments[e++]) && (n = Jo(t)) && (r && (r += " "), r += n);
  return r;
}
const Jo = (e) => {
  if (typeof e == "string")
    return e;
  let t, n = "";
  for (let r = 0; r < e.length; r++)
    e[r] && (t = Jo(e[r])) && (n && (n += " "), n += t);
  return n;
};
function nl(e, ...t) {
  let n, r, o, s = i;
  function i(c) {
    const u = t.reduce((l, d) => d(l), e());
    return n = Ju(u), r = n.cache.get, o = n.cache.set, s = a, a(c);
  }
  function a(c) {
    const u = r(c);
    if (u)
      return u;
    const l = el(c, n);
    return o(c, l), l;
  }
  return function() {
    return s(tl.apply(null, arguments));
  };
}
const R = (e) => {
  const t = (n) => n[e] || [];
  return t.isThemeGetter = !0, t;
}, Zo = /^\[(?:([a-z-]+):)?(.+)\]$/i, rl = /^\d+\/\d+$/, ol = /* @__PURE__ */ new Set(["px", "full", "screen"]), sl = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, il = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, al = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/, cl = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, ul = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, Z = (e) => Ne(e) || ol.has(e) || rl.test(e), oe = (e) => je(e, "length", yl), Ne = (e) => !!e && !Number.isNaN(Number(e)), Ht = (e) => je(e, "number", Ne), qe = (e) => !!e && Number.isInteger(Number(e)), ll = (e) => e.endsWith("%") && Ne(e.slice(0, -1)), y = (e) => Zo.test(e), se = (e) => sl.test(e), dl = /* @__PURE__ */ new Set(["length", "size", "percentage"]), fl = (e) => je(e, dl, es), hl = (e) => je(e, "position", es), pl = /* @__PURE__ */ new Set(["image", "url"]), gl = (e) => je(e, pl, vl), ml = (e) => je(e, "", bl), He = () => !0, je = (e, t, n) => {
  const r = Zo.exec(e);
  return r ? r[1] ? typeof t == "string" ? r[1] === t : t.has(r[1]) : n(r[2]) : !1;
}, yl = (e) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  il.test(e) && !al.test(e)
), es = () => !1, bl = (e) => cl.test(e), vl = (e) => ul.test(e), _l = () => {
  const e = R("colors"), t = R("spacing"), n = R("blur"), r = R("brightness"), o = R("borderColor"), s = R("borderRadius"), i = R("borderSpacing"), a = R("borderWidth"), c = R("contrast"), u = R("grayscale"), l = R("hueRotate"), d = R("invert"), f = R("gap"), h = R("gradientColorStops"), g = R("gradientColorStopPositions"), m = R("inset"), p = R("margin"), b = R("opacity"), C = R("padding"), k = R("saturate"), T = R("scale"), H = R("sepia"), w = R("skew"), v = R("space"), S = R("translate"), L = () => ["auto", "contain", "none"], pe = () => ["auto", "hidden", "clip", "visible", "scroll"], ge = () => ["auto", y, t], O = () => [y, t], Ve = () => ["", Z, oe], Qe = () => ["auto", Ne, y], jn = () => ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"], Ke = () => ["solid", "dashed", "dotted", "double", "none"], Ln = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], Ft = () => ["start", "end", "center", "between", "around", "evenly", "stretch"], Le = () => ["", "0", y], Un = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], X = () => [Ne, y];
  return {
    cacheSize: 500,
    separator: ":",
    theme: {
      colors: [He],
      spacing: [Z, oe],
      blur: ["none", "", se, y],
      brightness: X(),
      borderColor: [e],
      borderRadius: ["none", "", "full", se, y],
      borderSpacing: O(),
      borderWidth: Ve(),
      contrast: X(),
      grayscale: Le(),
      hueRotate: X(),
      invert: Le(),
      gap: O(),
      gradientColorStops: [e],
      gradientColorStopPositions: [ll, oe],
      inset: ge(),
      margin: ge(),
      opacity: X(),
      padding: O(),
      saturate: X(),
      scale: X(),
      sepia: Le(),
      skew: X(),
      space: O(),
      translate: O()
    },
    classGroups: {
      // Layout
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", "video", y]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       */
      container: ["container"],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [se]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": Un()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": Un()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: [...jn(), y]
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: pe()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": pe()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": pe()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: L()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": L()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": L()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Top / Right / Bottom / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: [m]
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": [m]
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": [m]
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: [m]
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: [m]
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: [m]
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: [m]
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: [m]
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: [m]
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: ["auto", qe, y]
      }],
      // Flexbox and Grid
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: ge()
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["wrap", "wrap-reverse", "nowrap"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: ["1", "auto", "initial", "none", y]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: Le()
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: Le()
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: ["first", "last", "none", qe, y]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": [He]
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: ["auto", {
          span: ["full", qe, y]
        }, y]
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": Qe()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": Qe()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": [He]
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: ["auto", {
          span: [qe, y]
        }, y]
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": Qe()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": Qe()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": ["auto", "min", "max", "fr", y]
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": ["auto", "min", "max", "fr", y]
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: [f]
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": [f]
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": [f]
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: ["normal", ...Ft()]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": ["start", "end", "center", "stretch"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", "start", "end", "center", "stretch"]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...Ft(), "baseline"]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: ["start", "end", "center", "baseline", "stretch"]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", "start", "end", "center", "stretch", "baseline"]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": [...Ft(), "baseline"]
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": ["start", "end", "center", "baseline", "stretch"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", "start", "end", "center", "stretch"]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: [C]
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: [C]
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: [C]
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: [C]
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: [C]
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: [C]
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: [C]
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: [C]
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: [C]
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: [p]
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: [p]
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: [p]
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: [p]
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: [p]
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: [p]
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: [p]
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: [p]
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: [p]
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/space
       */
      "space-x": [{
        "space-x": [v]
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/space
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/space
       */
      "space-y": [{
        "space-y": [v]
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/space
       */
      "space-y-reverse": ["space-y-reverse"],
      // Sizing
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", y, t]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [y, t, "min", "max", "fit"]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [y, t, "none", "full", "min", "max", "fit", "prose", {
          screen: [se]
        }, se]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: [y, t, "auto", "min", "max", "fit", "svh", "lvh", "dvh"]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": [y, t, "min", "max", "fit", "svh", "lvh", "dvh"]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": [y, t, "min", "max", "fit", "svh", "lvh", "dvh"]
      }],
      /**
       * Size
       * @see https://tailwindcss.com/docs/size
       */
      size: [{
        size: [y, t, "auto", "min", "max", "fit"]
      }],
      // Typography
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", se, oe]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black", Ht]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [He]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractons"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: ["tighter", "tight", "normal", "wide", "wider", "widest", y]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": ["none", Ne, Ht]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: ["none", "tight", "snug", "normal", "relaxed", "loose", Z, y]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", y]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["none", "disc", "decimal", y]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: [e]
      }],
      /**
       * Placeholder Opacity
       * @see https://tailwindcss.com/docs/placeholder-opacity
       */
      "placeholder-opacity": [{
        "placeholder-opacity": [b]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: [e]
      }],
      /**
       * Text Opacity
       * @see https://tailwindcss.com/docs/text-opacity
       */
      "text-opacity": [{
        "text-opacity": [b]
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...Ke(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: ["auto", "from-font", Z, oe]
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": ["auto", Z, y]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: [e]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: O()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", y]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", y]
      }],
      // Backgrounds
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Opacity
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/background-opacity
       */
      "bg-opacity": [{
        "bg-opacity": [b]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: [...jn(), hl]
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: ["no-repeat", {
          repeat: ["", "x", "y", "round", "space"]
        }]
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: ["auto", "cover", "contain", fl]
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
        }, gl]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: [e]
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: [g]
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: [g]
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: [g]
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: [h]
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: [h]
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: [h]
      }],
      // Borders
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: [s]
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": [s]
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": [s]
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": [s]
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": [s]
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": [s]
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": [s]
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": [s]
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": [s]
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": [s]
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": [s]
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": [s]
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": [s]
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": [s]
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": [s]
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: [a]
      }],
      /**
       * Border Width X
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": [a]
      }],
      /**
       * Border Width Y
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": [a]
      }],
      /**
       * Border Width Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": [a]
      }],
      /**
       * Border Width End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": [a]
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": [a]
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": [a]
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": [a]
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": [a]
      }],
      /**
       * Border Opacity
       * @see https://tailwindcss.com/docs/border-opacity
       */
      "border-opacity": [{
        "border-opacity": [b]
      }],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...Ke(), "hidden"]
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/divide-width
       */
      "divide-x": [{
        "divide-x": [a]
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/divide-width
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/divide-width
       */
      "divide-y": [{
        "divide-y": [a]
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/divide-width
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Divide Opacity
       * @see https://tailwindcss.com/docs/divide-opacity
       */
      "divide-opacity": [{
        "divide-opacity": [b]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/divide-style
       */
      "divide-style": [{
        divide: Ke()
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: [o]
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": [o]
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": [o]
      }],
      /**
       * Border Color S
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": [o]
      }],
      /**
       * Border Color E
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": [o]
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": [o]
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": [o]
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": [o]
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": [o]
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: [o]
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: ["", ...Ke()]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [Z, y]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: [Z, oe]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: [e]
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/ring-width
       */
      "ring-w": [{
        ring: Ve()
      }],
      /**
       * Ring Width Inset
       * @see https://tailwindcss.com/docs/ring-width
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/ring-color
       */
      "ring-color": [{
        ring: [e]
      }],
      /**
       * Ring Opacity
       * @see https://tailwindcss.com/docs/ring-opacity
       */
      "ring-opacity": [{
        "ring-opacity": [b]
      }],
      /**
       * Ring Offset Width
       * @see https://tailwindcss.com/docs/ring-offset-width
       */
      "ring-offset-w": [{
        "ring-offset": [Z, oe]
      }],
      /**
       * Ring Offset Color
       * @see https://tailwindcss.com/docs/ring-offset-color
       */
      "ring-offset-color": [{
        "ring-offset": [e]
      }],
      // Effects
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: ["", "inner", "none", se, ml]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow-color
       */
      "shadow-color": [{
        shadow: [He]
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [b]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...Ln(), "plus-lighter", "plus-darker"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": Ln()
      }],
      // Filters
      /**
       * Filter
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: ["", "none"]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: [n]
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [r]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [c]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": ["", "none", se, y]
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: [u]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [l]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: [d]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [k]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: [H]
      }],
      /**
       * Backdrop Filter
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": ["", "none"]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": [n]
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [r]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [c]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": [u]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [l]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": [d]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [b]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [k]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": [H]
      }],
      // Tables
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": [i]
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": [i]
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": [i]
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // Transitions and Animation
      /**
       * Tranisition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["none", "all", "", "colors", "opacity", "shadow", "transform", y]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: X()
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "in", "out", "in-out", y]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: X()
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", "spin", "ping", "pulse", "bounce", y]
      }],
      // Transforms
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: ["", "gpu", "none"]
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: [T]
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": [T]
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": [T]
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: [qe, y]
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": [S]
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": [S]
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": [w]
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": [w]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: ["center", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left", y]
      }],
      // Interactivity
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: ["auto", e]
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", y]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: [e]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["none", "auto"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "y", "x", ""]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": O()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": O()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": O()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": O()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": O()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": O()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": O()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": O()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": O()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": O()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": O()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": O()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": O()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": O()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": O()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": O()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": O()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": O()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", y]
      }],
      // SVG
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: [e, "none"]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [Z, oe, Ht]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: [e, "none"]
      }],
      // Accessibility
      /**
       * Screen Readers
       * @see https://tailwindcss.com/docs/screen-readers
       */
      sr: ["sr-only", "not-sr-only"],
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      size: ["w", "h"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    }
  };
}, El = /* @__PURE__ */ nl(_l);
function wl(...e) {
  return El(Ur(e));
}
const xl = Gu(
  "",
  {
    variants: {
      size: {
        1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
        2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        3: "text-2xl font-semibold tracking-tight",
        4: "text-xl font-semibold tracking-tight",
        5: "text-lg font-semibold tracking-tight",
        6: "text-base font-semibold tracking-tight"
      }
    },
    defaultVariants: {
      size: 1
    }
  }
), ts = mt(
  ({ className: e, size: t = 1, asChild: n = !1, ...r }, o) => {
    const s = n ? jr : `h${t}`;
    return /* @__PURE__ */ D.jsx(
      s,
      {
        ref: o,
        className: wl(xl({ size: t, className: e })),
        ...r
      }
    );
  }
);
ts.displayName = "Heading";
const Sl = ({ darkMode: e, fetchKoenigLexical: t, className: n, children: r, ...o }) => {
  const s = Ur(
    "admin-x-base",
    e && "dark",
    n
  );
  return /* @__PURE__ */ D.jsx("div", { className: s, ...o, children: /* @__PURE__ */ D.jsx(ea, { darkMode: e, fetchKoenigLexical: t, children: r }) });
};
class At {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set(), this.subscribe = this.subscribe.bind(this);
  }
  subscribe(t) {
    const n = {
      listener: t
    };
    return this.listeners.add(n), this.onSubscribe(), () => {
      this.listeners.delete(n), this.onUnsubscribe();
    };
  }
  hasListeners() {
    return this.listeners.size > 0;
  }
  onSubscribe() {
  }
  onUnsubscribe() {
  }
}
const kn = typeof window > "u" || "Deno" in window;
function B() {
}
function Cl(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function Ol(e) {
  return typeof e == "number" && e >= 0 && e !== 1 / 0;
}
function Rl(e, t) {
  return Math.max(e + (t || 0) - Date.now(), 0);
}
function rt(e, t, n) {
  return $t(e) ? typeof t == "function" ? {
    ...n,
    queryKey: e,
    queryFn: t
  } : {
    ...t,
    queryKey: e
  } : e;
}
function ae(e, t, n) {
  return $t(e) ? [{
    ...t,
    queryKey: e
  }, n] : [e || {}, t];
}
function wr(e, t) {
  const {
    type: n = "all",
    exact: r,
    fetchStatus: o,
    predicate: s,
    queryKey: i,
    stale: a
  } = e;
  if ($t(i)) {
    if (r) {
      if (t.queryHash !== An(i, t.options))
        return !1;
    } else if (!ht(t.queryKey, i))
      return !1;
  }
  if (n !== "all") {
    const c = t.isActive();
    if (n === "active" && !c || n === "inactive" && c)
      return !1;
  }
  return !(typeof a == "boolean" && t.isStale() !== a || typeof o < "u" && o !== t.state.fetchStatus || s && !s(t));
}
function xr(e, t) {
  const {
    exact: n,
    fetching: r,
    predicate: o,
    mutationKey: s
  } = e;
  if ($t(s)) {
    if (!t.options.mutationKey)
      return !1;
    if (n) {
      if (ye(t.options.mutationKey) !== ye(s))
        return !1;
    } else if (!ht(t.options.mutationKey, s))
      return !1;
  }
  return !(typeof r == "boolean" && t.state.status === "loading" !== r || o && !o(t));
}
function An(e, t) {
  return ((t == null ? void 0 : t.queryKeyHashFn) || ye)(e);
}
function ye(e) {
  return JSON.stringify(e, (t, n) => hn(n) ? Object.keys(n).sort().reduce((r, o) => (r[o] = n[o], r), {}) : n);
}
function ht(e, t) {
  return ns(e, t);
}
function ns(e, t) {
  return e === t ? !0 : typeof e != typeof t ? !1 : e && t && typeof e == "object" && typeof t == "object" ? !Object.keys(t).some((n) => !ns(e[n], t[n])) : !1;
}
function rs(e, t) {
  if (e === t)
    return e;
  const n = Sr(e) && Sr(t);
  if (n || hn(e) && hn(t)) {
    const r = n ? e.length : Object.keys(e).length, o = n ? t : Object.keys(t), s = o.length, i = n ? [] : {};
    let a = 0;
    for (let c = 0; c < s; c++) {
      const u = n ? c : o[c];
      i[u] = rs(e[u], t[u]), i[u] === e[u] && a++;
    }
    return r === s && a === r ? e : i;
  }
  return t;
}
function Sr(e) {
  return Array.isArray(e) && e.length === Object.keys(e).length;
}
function hn(e) {
  if (!Cr(e))
    return !1;
  const t = e.constructor;
  if (typeof t > "u")
    return !0;
  const n = t.prototype;
  return !(!Cr(n) || !n.hasOwnProperty("isPrototypeOf"));
}
function Cr(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function $t(e) {
  return Array.isArray(e);
}
function os(e) {
  return new Promise((t) => {
    setTimeout(t, e);
  });
}
function Or(e) {
  os(0).then(e);
}
function Tl() {
  if (typeof AbortController == "function")
    return new AbortController();
}
function Dl(e, t, n) {
  return n.isDataEqual != null && n.isDataEqual(e, t) ? e : typeof n.structuralSharing == "function" ? n.structuralSharing(e, t) : n.structuralSharing !== !1 ? rs(e, t) : t;
}
class Il extends At {
  constructor() {
    super(), this.setup = (t) => {
      if (!kn && window.addEventListener) {
        const n = () => t();
        return window.addEventListener("visibilitychange", n, !1), window.addEventListener("focus", n, !1), () => {
          window.removeEventListener("visibilitychange", n), window.removeEventListener("focus", n);
        };
      }
    };
  }
  onSubscribe() {
    this.cleanup || this.setEventListener(this.setup);
  }
  onUnsubscribe() {
    if (!this.hasListeners()) {
      var t;
      (t = this.cleanup) == null || t.call(this), this.cleanup = void 0;
    }
  }
  setEventListener(t) {
    var n;
    this.setup = t, (n = this.cleanup) == null || n.call(this), this.cleanup = t((r) => {
      typeof r == "boolean" ? this.setFocused(r) : this.onFocus();
    });
  }
  setFocused(t) {
    this.focused !== t && (this.focused = t, this.onFocus());
  }
  onFocus() {
    this.listeners.forEach(({
      listener: t
    }) => {
      t();
    });
  }
  isFocused() {
    return typeof this.focused == "boolean" ? this.focused : typeof document > "u" ? !0 : [void 0, "visible", "prerender"].includes(document.visibilityState);
  }
}
const pn = new Il(), Rr = ["online", "offline"];
class Ml extends At {
  constructor() {
    super(), this.setup = (t) => {
      if (!kn && window.addEventListener) {
        const n = () => t();
        return Rr.forEach((r) => {
          window.addEventListener(r, n, !1);
        }), () => {
          Rr.forEach((r) => {
            window.removeEventListener(r, n);
          });
        };
      }
    };
  }
  onSubscribe() {
    this.cleanup || this.setEventListener(this.setup);
  }
  onUnsubscribe() {
    if (!this.hasListeners()) {
      var t;
      (t = this.cleanup) == null || t.call(this), this.cleanup = void 0;
    }
  }
  setEventListener(t) {
    var n;
    this.setup = t, (n = this.cleanup) == null || n.call(this), this.cleanup = t((r) => {
      typeof r == "boolean" ? this.setOnline(r) : this.onOnline();
    });
  }
  setOnline(t) {
    this.online !== t && (this.online = t, this.onOnline());
  }
  onOnline() {
    this.listeners.forEach(({
      listener: t
    }) => {
      t();
    });
  }
  isOnline() {
    return typeof this.online == "boolean" ? this.online : typeof navigator > "u" || typeof navigator.onLine > "u" ? !0 : navigator.onLine;
  }
}
const pt = new Ml();
function Nl(e) {
  return Math.min(1e3 * 2 ** e, 3e4);
}
function $n(e) {
  return (e ?? "online") === "online" ? pt.isOnline() : !0;
}
class ss {
  constructor(t) {
    this.revert = t == null ? void 0 : t.revert, this.silent = t == null ? void 0 : t.silent;
  }
}
function Gt(e) {
  return e instanceof ss;
}
function is(e) {
  let t = !1, n = 0, r = !1, o, s, i;
  const a = new Promise((p, b) => {
    s = p, i = b;
  }), c = (p) => {
    r || (h(new ss(p)), e.abort == null || e.abort());
  }, u = () => {
    t = !0;
  }, l = () => {
    t = !1;
  }, d = () => !pn.isFocused() || e.networkMode !== "always" && !pt.isOnline(), f = (p) => {
    r || (r = !0, e.onSuccess == null || e.onSuccess(p), o == null || o(), s(p));
  }, h = (p) => {
    r || (r = !0, e.onError == null || e.onError(p), o == null || o(), i(p));
  }, g = () => new Promise((p) => {
    o = (b) => {
      const C = r || !d();
      return C && p(b), C;
    }, e.onPause == null || e.onPause();
  }).then(() => {
    o = void 0, r || e.onContinue == null || e.onContinue();
  }), m = () => {
    if (r)
      return;
    let p;
    try {
      p = e.fn();
    } catch (b) {
      p = Promise.reject(b);
    }
    Promise.resolve(p).then(f).catch((b) => {
      var C, k;
      if (r)
        return;
      const T = (C = e.retry) != null ? C : 3, H = (k = e.retryDelay) != null ? k : Nl, w = typeof H == "function" ? H(n, b) : H, v = T === !0 || typeof T == "number" && n < T || typeof T == "function" && T(n, b);
      if (t || !v) {
        h(b);
        return;
      }
      n++, e.onFail == null || e.onFail(n, b), os(w).then(() => {
        if (d())
          return g();
      }).then(() => {
        t ? h(b) : m();
      });
    });
  };
  return $n(e.networkMode) ? m() : g().then(m), {
    promise: a,
    cancel: c,
    continue: () => (o == null ? void 0 : o()) ? a : Promise.resolve(),
    cancelRetry: u,
    continueRetry: l
  };
}
const Fn = console;
function Pl() {
  let e = [], t = 0, n = (l) => {
    l();
  }, r = (l) => {
    l();
  };
  const o = (l) => {
    let d;
    t++;
    try {
      d = l();
    } finally {
      t--, t || a();
    }
    return d;
  }, s = (l) => {
    t ? e.push(l) : Or(() => {
      n(l);
    });
  }, i = (l) => (...d) => {
    s(() => {
      l(...d);
    });
  }, a = () => {
    const l = e;
    e = [], l.length && Or(() => {
      r(() => {
        l.forEach((d) => {
          n(d);
        });
      });
    });
  };
  return {
    batch: o,
    batchCalls: i,
    schedule: s,
    setNotifyFunction: (l) => {
      n = l;
    },
    setBatchNotifyFunction: (l) => {
      r = l;
    }
  };
}
const F = Pl();
class as {
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), Ol(this.cacheTime) && (this.gcTimeout = setTimeout(() => {
      this.optionalRemove();
    }, this.cacheTime));
  }
  updateCacheTime(t) {
    this.cacheTime = Math.max(this.cacheTime || 0, t ?? (kn ? 1 / 0 : 5 * 60 * 1e3));
  }
  clearGcTimeout() {
    this.gcTimeout && (clearTimeout(this.gcTimeout), this.gcTimeout = void 0);
  }
}
class kl extends as {
  constructor(t) {
    super(), this.abortSignalConsumed = !1, this.defaultOptions = t.defaultOptions, this.setOptions(t.options), this.observers = [], this.cache = t.cache, this.logger = t.logger || Fn, this.queryKey = t.queryKey, this.queryHash = t.queryHash, this.initialState = t.state || Al(this.options), this.state = this.initialState, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  setOptions(t) {
    this.options = {
      ...this.defaultOptions,
      ...t
    }, this.updateCacheTime(this.options.cacheTime);
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.cache.remove(this);
  }
  setData(t, n) {
    const r = Dl(this.state.data, t, this.options);
    return this.dispatch({
      data: r,
      type: "success",
      dataUpdatedAt: n == null ? void 0 : n.updatedAt,
      manual: n == null ? void 0 : n.manual
    }), r;
  }
  setState(t, n) {
    this.dispatch({
      type: "setState",
      state: t,
      setStateOptions: n
    });
  }
  cancel(t) {
    var n;
    const r = this.promise;
    return (n = this.retryer) == null || n.cancel(t), r ? r.then(B).catch(B) : Promise.resolve();
  }
  destroy() {
    super.destroy(), this.cancel({
      silent: !0
    });
  }
  reset() {
    this.destroy(), this.setState(this.initialState);
  }
  isActive() {
    return this.observers.some((t) => t.options.enabled !== !1);
  }
  isDisabled() {
    return this.getObserversCount() > 0 && !this.isActive();
  }
  isStale() {
    return this.state.isInvalidated || !this.state.dataUpdatedAt || this.observers.some((t) => t.getCurrentResult().isStale);
  }
  isStaleByTime(t = 0) {
    return this.state.isInvalidated || !this.state.dataUpdatedAt || !Rl(this.state.dataUpdatedAt, t);
  }
  onFocus() {
    var t;
    const n = this.observers.find((r) => r.shouldFetchOnWindowFocus());
    n && n.refetch({
      cancelRefetch: !1
    }), (t = this.retryer) == null || t.continue();
  }
  onOnline() {
    var t;
    const n = this.observers.find((r) => r.shouldFetchOnReconnect());
    n && n.refetch({
      cancelRefetch: !1
    }), (t = this.retryer) == null || t.continue();
  }
  addObserver(t) {
    this.observers.includes(t) || (this.observers.push(t), this.clearGcTimeout(), this.cache.notify({
      type: "observerAdded",
      query: this,
      observer: t
    }));
  }
  removeObserver(t) {
    this.observers.includes(t) && (this.observers = this.observers.filter((n) => n !== t), this.observers.length || (this.retryer && (this.abortSignalConsumed ? this.retryer.cancel({
      revert: !0
    }) : this.retryer.cancelRetry()), this.scheduleGc()), this.cache.notify({
      type: "observerRemoved",
      query: this,
      observer: t
    }));
  }
  getObserversCount() {
    return this.observers.length;
  }
  invalidate() {
    this.state.isInvalidated || this.dispatch({
      type: "invalidate"
    });
  }
  fetch(t, n) {
    var r, o;
    if (this.state.fetchStatus !== "idle") {
      if (this.state.dataUpdatedAt && n != null && n.cancelRefetch)
        this.cancel({
          silent: !0
        });
      else if (this.promise) {
        var s;
        return (s = this.retryer) == null || s.continueRetry(), this.promise;
      }
    }
    if (t && this.setOptions(t), !this.options.queryFn) {
      const h = this.observers.find((g) => g.options.queryFn);
      h && this.setOptions(h.options);
    }
    const i = Tl(), a = {
      queryKey: this.queryKey,
      pageParam: void 0,
      meta: this.meta
    }, c = (h) => {
      Object.defineProperty(h, "signal", {
        enumerable: !0,
        get: () => {
          if (i)
            return this.abortSignalConsumed = !0, i.signal;
        }
      });
    };
    c(a);
    const u = () => this.options.queryFn ? (this.abortSignalConsumed = !1, this.options.queryFn(a)) : Promise.reject("Missing queryFn for queryKey '" + this.options.queryHash + "'"), l = {
      fetchOptions: n,
      options: this.options,
      queryKey: this.queryKey,
      state: this.state,
      fetchFn: u
    };
    if (c(l), (r = this.options.behavior) == null || r.onFetch(l), this.revertState = this.state, this.state.fetchStatus === "idle" || this.state.fetchMeta !== ((o = l.fetchOptions) == null ? void 0 : o.meta)) {
      var d;
      this.dispatch({
        type: "fetch",
        meta: (d = l.fetchOptions) == null ? void 0 : d.meta
      });
    }
    const f = (h) => {
      if (Gt(h) && h.silent || this.dispatch({
        type: "error",
        error: h
      }), !Gt(h)) {
        var g, m, p, b;
        (g = (m = this.cache.config).onError) == null || g.call(m, h, this), (p = (b = this.cache.config).onSettled) == null || p.call(b, this.state.data, h, this);
      }
      this.isFetchingOptimistic || this.scheduleGc(), this.isFetchingOptimistic = !1;
    };
    return this.retryer = is({
      fn: l.fetchFn,
      abort: i == null ? void 0 : i.abort.bind(i),
      onSuccess: (h) => {
        var g, m, p, b;
        if (typeof h > "u") {
          f(new Error(this.queryHash + " data is undefined"));
          return;
        }
        this.setData(h), (g = (m = this.cache.config).onSuccess) == null || g.call(m, h, this), (p = (b = this.cache.config).onSettled) == null || p.call(b, h, this.state.error, this), this.isFetchingOptimistic || this.scheduleGc(), this.isFetchingOptimistic = !1;
      },
      onError: f,
      onFail: (h, g) => {
        this.dispatch({
          type: "failed",
          failureCount: h,
          error: g
        });
      },
      onPause: () => {
        this.dispatch({
          type: "pause"
        });
      },
      onContinue: () => {
        this.dispatch({
          type: "continue"
        });
      },
      retry: l.options.retry,
      retryDelay: l.options.retryDelay,
      networkMode: l.options.networkMode
    }), this.promise = this.retryer.promise, this.promise;
  }
  dispatch(t) {
    const n = (r) => {
      var o, s;
      switch (t.type) {
        case "failed":
          return {
            ...r,
            fetchFailureCount: t.failureCount,
            fetchFailureReason: t.error
          };
        case "pause":
          return {
            ...r,
            fetchStatus: "paused"
          };
        case "continue":
          return {
            ...r,
            fetchStatus: "fetching"
          };
        case "fetch":
          return {
            ...r,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: (o = t.meta) != null ? o : null,
            fetchStatus: $n(this.options.networkMode) ? "fetching" : "paused",
            ...!r.dataUpdatedAt && {
              error: null,
              status: "loading"
            }
          };
        case "success":
          return {
            ...r,
            data: t.data,
            dataUpdateCount: r.dataUpdateCount + 1,
            dataUpdatedAt: (s = t.dataUpdatedAt) != null ? s : Date.now(),
            error: null,
            isInvalidated: !1,
            status: "success",
            ...!t.manual && {
              fetchStatus: "idle",
              fetchFailureCount: 0,
              fetchFailureReason: null
            }
          };
        case "error":
          const i = t.error;
          return Gt(i) && i.revert && this.revertState ? {
            ...this.revertState,
            fetchStatus: "idle"
          } : {
            ...r,
            error: i,
            errorUpdateCount: r.errorUpdateCount + 1,
            errorUpdatedAt: Date.now(),
            fetchFailureCount: r.fetchFailureCount + 1,
            fetchFailureReason: i,
            fetchStatus: "idle",
            status: "error"
          };
        case "invalidate":
          return {
            ...r,
            isInvalidated: !0
          };
        case "setState":
          return {
            ...r,
            ...t.state
          };
      }
    };
    this.state = n(this.state), F.batch(() => {
      this.observers.forEach((r) => {
        r.onQueryUpdate(t);
      }), this.cache.notify({
        query: this,
        type: "updated",
        action: t
      });
    });
  }
}
function Al(e) {
  const t = typeof e.initialData == "function" ? e.initialData() : e.initialData, n = typeof t < "u", r = n ? typeof e.initialDataUpdatedAt == "function" ? e.initialDataUpdatedAt() : e.initialDataUpdatedAt : 0;
  return {
    data: t,
    dataUpdateCount: 0,
    dataUpdatedAt: n ? r ?? Date.now() : 0,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchMeta: null,
    isInvalidated: !1,
    status: n ? "success" : "loading",
    fetchStatus: "idle"
  };
}
class $l extends At {
  constructor(t) {
    super(), this.config = t || {}, this.queries = [], this.queriesMap = {};
  }
  build(t, n, r) {
    var o;
    const s = n.queryKey, i = (o = n.queryHash) != null ? o : An(s, n);
    let a = this.get(i);
    return a || (a = new kl({
      cache: this,
      logger: t.getLogger(),
      queryKey: s,
      queryHash: i,
      options: t.defaultQueryOptions(n),
      state: r,
      defaultOptions: t.getQueryDefaults(s)
    }), this.add(a)), a;
  }
  add(t) {
    this.queriesMap[t.queryHash] || (this.queriesMap[t.queryHash] = t, this.queries.push(t), this.notify({
      type: "added",
      query: t
    }));
  }
  remove(t) {
    const n = this.queriesMap[t.queryHash];
    n && (t.destroy(), this.queries = this.queries.filter((r) => r !== t), n === t && delete this.queriesMap[t.queryHash], this.notify({
      type: "removed",
      query: t
    }));
  }
  clear() {
    F.batch(() => {
      this.queries.forEach((t) => {
        this.remove(t);
      });
    });
  }
  get(t) {
    return this.queriesMap[t];
  }
  getAll() {
    return this.queries;
  }
  find(t, n) {
    const [r] = ae(t, n);
    return typeof r.exact > "u" && (r.exact = !0), this.queries.find((o) => wr(r, o));
  }
  findAll(t, n) {
    const [r] = ae(t, n);
    return Object.keys(r).length > 0 ? this.queries.filter((o) => wr(r, o)) : this.queries;
  }
  notify(t) {
    F.batch(() => {
      this.listeners.forEach(({
        listener: n
      }) => {
        n(t);
      });
    });
  }
  onFocus() {
    F.batch(() => {
      this.queries.forEach((t) => {
        t.onFocus();
      });
    });
  }
  onOnline() {
    F.batch(() => {
      this.queries.forEach((t) => {
        t.onOnline();
      });
    });
  }
}
class Fl extends as {
  constructor(t) {
    super(), this.defaultOptions = t.defaultOptions, this.mutationId = t.mutationId, this.mutationCache = t.mutationCache, this.logger = t.logger || Fn, this.observers = [], this.state = t.state || jl(), this.setOptions(t.options), this.scheduleGc();
  }
  setOptions(t) {
    this.options = {
      ...this.defaultOptions,
      ...t
    }, this.updateCacheTime(this.options.cacheTime);
  }
  get meta() {
    return this.options.meta;
  }
  setState(t) {
    this.dispatch({
      type: "setState",
      state: t
    });
  }
  addObserver(t) {
    this.observers.includes(t) || (this.observers.push(t), this.clearGcTimeout(), this.mutationCache.notify({
      type: "observerAdded",
      mutation: this,
      observer: t
    }));
  }
  removeObserver(t) {
    this.observers = this.observers.filter((n) => n !== t), this.scheduleGc(), this.mutationCache.notify({
      type: "observerRemoved",
      mutation: this,
      observer: t
    });
  }
  optionalRemove() {
    this.observers.length || (this.state.status === "loading" ? this.scheduleGc() : this.mutationCache.remove(this));
  }
  continue() {
    var t, n;
    return (t = (n = this.retryer) == null ? void 0 : n.continue()) != null ? t : this.execute();
  }
  async execute() {
    const t = () => {
      var v;
      return this.retryer = is({
        fn: () => this.options.mutationFn ? this.options.mutationFn(this.state.variables) : Promise.reject("No mutationFn found"),
        onFail: (S, L) => {
          this.dispatch({
            type: "failed",
            failureCount: S,
            error: L
          });
        },
        onPause: () => {
          this.dispatch({
            type: "pause"
          });
        },
        onContinue: () => {
          this.dispatch({
            type: "continue"
          });
        },
        retry: (v = this.options.retry) != null ? v : 0,
        retryDelay: this.options.retryDelay,
        networkMode: this.options.networkMode
      }), this.retryer.promise;
    }, n = this.state.status === "loading";
    try {
      var r, o, s, i, a, c, u, l;
      if (!n) {
        var d, f, h, g;
        this.dispatch({
          type: "loading",
          variables: this.options.variables
        }), await ((d = (f = this.mutationCache.config).onMutate) == null ? void 0 : d.call(f, this.state.variables, this));
        const S = await ((h = (g = this.options).onMutate) == null ? void 0 : h.call(g, this.state.variables));
        S !== this.state.context && this.dispatch({
          type: "loading",
          context: S,
          variables: this.state.variables
        });
      }
      const v = await t();
      return await ((r = (o = this.mutationCache.config).onSuccess) == null ? void 0 : r.call(o, v, this.state.variables, this.state.context, this)), await ((s = (i = this.options).onSuccess) == null ? void 0 : s.call(i, v, this.state.variables, this.state.context)), await ((a = (c = this.mutationCache.config).onSettled) == null ? void 0 : a.call(c, v, null, this.state.variables, this.state.context, this)), await ((u = (l = this.options).onSettled) == null ? void 0 : u.call(l, v, null, this.state.variables, this.state.context)), this.dispatch({
        type: "success",
        data: v
      }), v;
    } catch (v) {
      try {
        var m, p, b, C, k, T, H, w;
        throw await ((m = (p = this.mutationCache.config).onError) == null ? void 0 : m.call(p, v, this.state.variables, this.state.context, this)), await ((b = (C = this.options).onError) == null ? void 0 : b.call(C, v, this.state.variables, this.state.context)), await ((k = (T = this.mutationCache.config).onSettled) == null ? void 0 : k.call(T, void 0, v, this.state.variables, this.state.context, this)), await ((H = (w = this.options).onSettled) == null ? void 0 : H.call(w, void 0, v, this.state.variables, this.state.context)), v;
      } finally {
        this.dispatch({
          type: "error",
          error: v
        });
      }
    }
  }
  dispatch(t) {
    const n = (r) => {
      switch (t.type) {
        case "failed":
          return {
            ...r,
            failureCount: t.failureCount,
            failureReason: t.error
          };
        case "pause":
          return {
            ...r,
            isPaused: !0
          };
        case "continue":
          return {
            ...r,
            isPaused: !1
          };
        case "loading":
          return {
            ...r,
            context: t.context,
            data: void 0,
            failureCount: 0,
            failureReason: null,
            error: null,
            isPaused: !$n(this.options.networkMode),
            status: "loading",
            variables: t.variables
          };
        case "success":
          return {
            ...r,
            data: t.data,
            failureCount: 0,
            failureReason: null,
            error: null,
            status: "success",
            isPaused: !1
          };
        case "error":
          return {
            ...r,
            data: void 0,
            error: t.error,
            failureCount: r.failureCount + 1,
            failureReason: t.error,
            isPaused: !1,
            status: "error"
          };
        case "setState":
          return {
            ...r,
            ...t.state
          };
      }
    };
    this.state = n(this.state), F.batch(() => {
      this.observers.forEach((r) => {
        r.onMutationUpdate(t);
      }), this.mutationCache.notify({
        mutation: this,
        type: "updated",
        action: t
      });
    });
  }
}
function jl() {
  return {
    context: void 0,
    data: void 0,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: !1,
    status: "idle",
    variables: void 0
  };
}
class Ll extends At {
  constructor(t) {
    super(), this.config = t || {}, this.mutations = [], this.mutationId = 0;
  }
  build(t, n, r) {
    const o = new Fl({
      mutationCache: this,
      logger: t.getLogger(),
      mutationId: ++this.mutationId,
      options: t.defaultMutationOptions(n),
      state: r,
      defaultOptions: n.mutationKey ? t.getMutationDefaults(n.mutationKey) : void 0
    });
    return this.add(o), o;
  }
  add(t) {
    this.mutations.push(t), this.notify({
      type: "added",
      mutation: t
    });
  }
  remove(t) {
    this.mutations = this.mutations.filter((n) => n !== t), this.notify({
      type: "removed",
      mutation: t
    });
  }
  clear() {
    F.batch(() => {
      this.mutations.forEach((t) => {
        this.remove(t);
      });
    });
  }
  getAll() {
    return this.mutations;
  }
  find(t) {
    return typeof t.exact > "u" && (t.exact = !0), this.mutations.find((n) => xr(t, n));
  }
  findAll(t) {
    return this.mutations.filter((n) => xr(t, n));
  }
  notify(t) {
    F.batch(() => {
      this.listeners.forEach(({
        listener: n
      }) => {
        n(t);
      });
    });
  }
  resumePausedMutations() {
    var t;
    return this.resuming = ((t = this.resuming) != null ? t : Promise.resolve()).then(() => {
      const n = this.mutations.filter((r) => r.state.isPaused);
      return F.batch(() => n.reduce((r, o) => r.then(() => o.continue().catch(B)), Promise.resolve()));
    }).then(() => {
      this.resuming = void 0;
    }), this.resuming;
  }
}
function Ul() {
  return {
    onFetch: (e) => {
      e.fetchFn = () => {
        var t, n, r, o, s, i;
        const a = (t = e.fetchOptions) == null || (n = t.meta) == null ? void 0 : n.refetchPage, c = (r = e.fetchOptions) == null || (o = r.meta) == null ? void 0 : o.fetchMore, u = c == null ? void 0 : c.pageParam, l = (c == null ? void 0 : c.direction) === "forward", d = (c == null ? void 0 : c.direction) === "backward", f = ((s = e.state.data) == null ? void 0 : s.pages) || [], h = ((i = e.state.data) == null ? void 0 : i.pageParams) || [];
        let g = h, m = !1;
        const p = (w) => {
          Object.defineProperty(w, "signal", {
            enumerable: !0,
            get: () => {
              var v;
              if ((v = e.signal) != null && v.aborted)
                m = !0;
              else {
                var S;
                (S = e.signal) == null || S.addEventListener("abort", () => {
                  m = !0;
                });
              }
              return e.signal;
            }
          });
        }, b = e.options.queryFn || (() => Promise.reject("Missing queryFn for queryKey '" + e.options.queryHash + "'")), C = (w, v, S, L) => (g = L ? [v, ...g] : [...g, v], L ? [S, ...w] : [...w, S]), k = (w, v, S, L) => {
          if (m)
            return Promise.reject("Cancelled");
          if (typeof S > "u" && !v && w.length)
            return Promise.resolve(w);
          const pe = {
            queryKey: e.queryKey,
            pageParam: S,
            meta: e.options.meta
          };
          p(pe);
          const ge = b(pe);
          return Promise.resolve(ge).then((Ve) => C(w, S, Ve, L));
        };
        let T;
        if (!f.length)
          T = k([]);
        else if (l) {
          const w = typeof u < "u", v = w ? u : Tr(e.options, f);
          T = k(f, w, v);
        } else if (d) {
          const w = typeof u < "u", v = w ? u : ql(e.options, f);
          T = k(f, w, v, !0);
        } else {
          g = [];
          const w = typeof e.options.getNextPageParam > "u";
          T = (a && f[0] ? a(f[0], 0, f) : !0) ? k([], w, h[0]) : Promise.resolve(C([], h[0], f[0]));
          for (let S = 1; S < f.length; S++)
            T = T.then((L) => {
              if (a && f[S] ? a(f[S], S, f) : !0) {
                const ge = w ? h[S] : Tr(e.options, L);
                return k(L, w, ge);
              }
              return Promise.resolve(C(L, h[S], f[S]));
            });
        }
        return T.then((w) => ({
          pages: w,
          pageParams: g
        }));
      };
    }
  };
}
function Tr(e, t) {
  return e.getNextPageParam == null ? void 0 : e.getNextPageParam(t[t.length - 1], t);
}
function ql(e, t) {
  return e.getPreviousPageParam == null ? void 0 : e.getPreviousPageParam(t[0], t);
}
class Hl {
  constructor(t = {}) {
    this.queryCache = t.queryCache || new $l(), this.mutationCache = t.mutationCache || new Ll(), this.logger = t.logger || Fn, this.defaultOptions = t.defaultOptions || {}, this.queryDefaults = [], this.mutationDefaults = [], this.mountCount = 0;
  }
  mount() {
    this.mountCount++, this.mountCount === 1 && (this.unsubscribeFocus = pn.subscribe(() => {
      pn.isFocused() && (this.resumePausedMutations(), this.queryCache.onFocus());
    }), this.unsubscribeOnline = pt.subscribe(() => {
      pt.isOnline() && (this.resumePausedMutations(), this.queryCache.onOnline());
    }));
  }
  unmount() {
    var t, n;
    this.mountCount--, this.mountCount === 0 && ((t = this.unsubscribeFocus) == null || t.call(this), this.unsubscribeFocus = void 0, (n = this.unsubscribeOnline) == null || n.call(this), this.unsubscribeOnline = void 0);
  }
  isFetching(t, n) {
    const [r] = ae(t, n);
    return r.fetchStatus = "fetching", this.queryCache.findAll(r).length;
  }
  isMutating(t) {
    return this.mutationCache.findAll({
      ...t,
      fetching: !0
    }).length;
  }
  getQueryData(t, n) {
    var r;
    return (r = this.queryCache.find(t, n)) == null ? void 0 : r.state.data;
  }
  ensureQueryData(t, n, r) {
    const o = rt(t, n, r), s = this.getQueryData(o.queryKey);
    return s ? Promise.resolve(s) : this.fetchQuery(o);
  }
  getQueriesData(t) {
    return this.getQueryCache().findAll(t).map(({
      queryKey: n,
      state: r
    }) => {
      const o = r.data;
      return [n, o];
    });
  }
  setQueryData(t, n, r) {
    const o = this.queryCache.find(t), s = o == null ? void 0 : o.state.data, i = Cl(n, s);
    if (typeof i > "u")
      return;
    const a = rt(t), c = this.defaultQueryOptions(a);
    return this.queryCache.build(this, c).setData(i, {
      ...r,
      manual: !0
    });
  }
  setQueriesData(t, n, r) {
    return F.batch(() => this.getQueryCache().findAll(t).map(({
      queryKey: o
    }) => [o, this.setQueryData(o, n, r)]));
  }
  getQueryState(t, n) {
    var r;
    return (r = this.queryCache.find(t, n)) == null ? void 0 : r.state;
  }
  removeQueries(t, n) {
    const [r] = ae(t, n), o = this.queryCache;
    F.batch(() => {
      o.findAll(r).forEach((s) => {
        o.remove(s);
      });
    });
  }
  resetQueries(t, n, r) {
    const [o, s] = ae(t, n, r), i = this.queryCache, a = {
      type: "active",
      ...o
    };
    return F.batch(() => (i.findAll(o).forEach((c) => {
      c.reset();
    }), this.refetchQueries(a, s)));
  }
  cancelQueries(t, n, r) {
    const [o, s = {}] = ae(t, n, r);
    typeof s.revert > "u" && (s.revert = !0);
    const i = F.batch(() => this.queryCache.findAll(o).map((a) => a.cancel(s)));
    return Promise.all(i).then(B).catch(B);
  }
  invalidateQueries(t, n, r) {
    const [o, s] = ae(t, n, r);
    return F.batch(() => {
      var i, a;
      if (this.queryCache.findAll(o).forEach((u) => {
        u.invalidate();
      }), o.refetchType === "none")
        return Promise.resolve();
      const c = {
        ...o,
        type: (i = (a = o.refetchType) != null ? a : o.type) != null ? i : "active"
      };
      return this.refetchQueries(c, s);
    });
  }
  refetchQueries(t, n, r) {
    const [o, s] = ae(t, n, r), i = F.batch(() => this.queryCache.findAll(o).filter((c) => !c.isDisabled()).map((c) => {
      var u;
      return c.fetch(void 0, {
        ...s,
        cancelRefetch: (u = s == null ? void 0 : s.cancelRefetch) != null ? u : !0,
        meta: {
          refetchPage: o.refetchPage
        }
      });
    }));
    let a = Promise.all(i).then(B);
    return s != null && s.throwOnError || (a = a.catch(B)), a;
  }
  fetchQuery(t, n, r) {
    const o = rt(t, n, r), s = this.defaultQueryOptions(o);
    typeof s.retry > "u" && (s.retry = !1);
    const i = this.queryCache.build(this, s);
    return i.isStaleByTime(s.staleTime) ? i.fetch(s) : Promise.resolve(i.state.data);
  }
  prefetchQuery(t, n, r) {
    return this.fetchQuery(t, n, r).then(B).catch(B);
  }
  fetchInfiniteQuery(t, n, r) {
    const o = rt(t, n, r);
    return o.behavior = Ul(), this.fetchQuery(o);
  }
  prefetchInfiniteQuery(t, n, r) {
    return this.fetchInfiniteQuery(t, n, r).then(B).catch(B);
  }
  resumePausedMutations() {
    return this.mutationCache.resumePausedMutations();
  }
  getQueryCache() {
    return this.queryCache;
  }
  getMutationCache() {
    return this.mutationCache;
  }
  getLogger() {
    return this.logger;
  }
  getDefaultOptions() {
    return this.defaultOptions;
  }
  setDefaultOptions(t) {
    this.defaultOptions = t;
  }
  setQueryDefaults(t, n) {
    const r = this.queryDefaults.find((o) => ye(t) === ye(o.queryKey));
    r ? r.defaultOptions = n : this.queryDefaults.push({
      queryKey: t,
      defaultOptions: n
    });
  }
  getQueryDefaults(t) {
    if (!t)
      return;
    const n = this.queryDefaults.find((r) => ht(t, r.queryKey));
    return n == null ? void 0 : n.defaultOptions;
  }
  setMutationDefaults(t, n) {
    const r = this.mutationDefaults.find((o) => ye(t) === ye(o.mutationKey));
    r ? r.defaultOptions = n : this.mutationDefaults.push({
      mutationKey: t,
      defaultOptions: n
    });
  }
  getMutationDefaults(t) {
    if (!t)
      return;
    const n = this.mutationDefaults.find((r) => ht(t, r.mutationKey));
    return n == null ? void 0 : n.defaultOptions;
  }
  defaultQueryOptions(t) {
    if (t != null && t._defaulted)
      return t;
    const n = {
      ...this.defaultOptions.queries,
      ...this.getQueryDefaults(t == null ? void 0 : t.queryKey),
      ...t,
      _defaulted: !0
    };
    return !n.queryHash && n.queryKey && (n.queryHash = An(n.queryKey, n)), typeof n.refetchOnReconnect > "u" && (n.refetchOnReconnect = n.networkMode !== "always"), typeof n.useErrorBoundary > "u" && (n.useErrorBoundary = !!n.suspense), n;
  }
  defaultMutationOptions(t) {
    return t != null && t._defaulted ? t : {
      ...this.defaultOptions.mutations,
      ...this.getMutationDefaults(t == null ? void 0 : t.mutationKey),
      ...t,
      _defaulted: !0
    };
  }
  clear() {
    this.queryCache.clear(), this.mutationCache.clear();
  }
}
const Dr = /* @__PURE__ */ we(void 0), Gl = /* @__PURE__ */ we(!1);
function zl(e, t) {
  return e || (t && typeof window < "u" ? (window.ReactQueryClientContext || (window.ReactQueryClientContext = Dr), window.ReactQueryClientContext) : Dr);
}
const Bl = ({
  client: e,
  children: t,
  context: n,
  contextSharing: r = !1
}) => {
  z(() => (e.mount(), () => {
    e.unmount();
  }), [e]);
  const o = zl(n, r);
  return /* @__PURE__ */ N(Gl.Provider, {
    value: !n && r
  }, /* @__PURE__ */ N(o.Provider, {
    value: e
  }, t));
}, cs = window.adminXQueryClient || new Hl({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: !1,
      staleTime: 5 * (60 * 1e3),
      // 5 mins
      cacheTime: 10 * (60 * 1e3),
      // 10 mins
      // We have custom retry logic for specific errors in fetchApi()
      retry: !1,
      networkMode: "always"
    }
  }
});
window.adminXQueryClient || (window.adminXQueryClient = cs);
const us = we({
  ghostVersion: "",
  externalNavigate: () => {
  },
  unsplashConfig: {
    Authorization: "",
    "Accept-Version": "",
    "Content-Type": "",
    "App-Pragma": "",
    "X-Unsplash-Cache": !0
  },
  sentryDSN: null,
  onUpdate: () => {
  },
  onInvalidate: () => {
  },
  onDelete: () => {
  }
});
function Wl({ children: e, ...t }) {
  return /* @__PURE__ */ D.jsx(Nn, { children: /* @__PURE__ */ D.jsx(Bl, { client: cs, children: /* @__PURE__ */ D.jsx(us.Provider, { value: t, children: e }) }) });
}
const Vl = () => le(us), ls = we({
  route: "",
  updateRoute: () => {
  },
  loadingModal: !1,
  eventTarget: new EventTarget()
});
function Ql(e, t) {
  if (!t)
    return null;
  const n = new RegExp(`/${e}/(.*)`), r = t == null ? void 0 : t.match(n);
  return r ? r[1] : null;
}
const Kl = (e, t, n, r) => {
  let o = window.location.hash;
  o = o.substring(1);
  const s = `${window.location.protocol}//${window.location.hostname}`, i = new URL(o, s), a = Ql(e, i.pathname);
  if (!r || !n)
    return { pathName: a || "" };
  const c = i.searchParams;
  if (a && r && n) {
    const [, u] = Object.entries(r).find(([f]) => zt(t || "", f)) || [], [l, d] = Object.entries(r).find(([f]) => zt(a, f)) || [];
    return {
      pathName: a,
      changingModal: d && d !== u,
      modal: l && d ? (
        // we should consider adding '&& modalName !== currentModalName' here, but this breaks tests
        n().then(({ default: f }) => {
          Qr.show(f[d], { pathName: a, params: zt(a, l), searchParams: c });
        })
      ) : void 0
    };
  }
  return { pathName: "" };
}, zt = (e, t) => {
  const n = new RegExp("^" + t.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$"), r = e.match(n);
  if (r)
    return r.groups || {};
}, Yl = ({ basePath: e, modals: t, children: n }) => {
  const { externalNavigate: r } = Vl(), [o, s] = be(void 0), [i, a] = be(!1), [c] = be(new EventTarget()), u = $((l) => {
    const d = typeof l == "string" ? { route: l } : l;
    if (d.isExternal) {
      r(d);
      return;
    }
    const f = d.route.replace(/^\//, "");
    f === o || (f ? window.location.hash = `/${e}/${f}` : window.location.hash = `/${e}`), c.dispatchEvent(new CustomEvent("routeChange", { detail: { newPath: f, oldPath: o } }));
  }, [e, c, r, o]);
  return z(() => {
    setTimeout(() => {
      t == null || t.load();
    }, 1e3);
  }, []), z(() => {
    const l = () => {
      s((d) => {
        const { pathName: f, modal: h, changingModal: g } = Kl(e, d, t == null ? void 0 : t.load, t == null ? void 0 : t.paths);
        return h && g && (a(!0), h.then(() => a(!1))), f;
      });
    };
    return l(), window.addEventListener("hashchange", l), () => {
      window.removeEventListener("hashchange", l);
    };
  }, []), o === void 0 ? null : /* @__PURE__ */ D.jsx(
    ls.Provider,
    {
      value: {
        route: o,
        updateRoute: u,
        loadingModal: i,
        eventTarget: c
      },
      children: n
    }
  );
};
function ed() {
  return le(ls);
}
const Xl = () => /* @__PURE__ */ D.jsx("div", { children: /* @__PURE__ */ D.jsx(ts, { size: 1, children: "Post analytics — Spike Lee" }) }), Jl = {
  paths: {
    "demo-modal": "DemoModal"
  },
  load: async () => import("./modals-890e6b55.mjs")
}, td = ({ framework: e, designSystem: t }) => /* @__PURE__ */ D.jsx(Wl, { ...e, children: /* @__PURE__ */ D.jsx(Yl, { basePath: "post-analytics-spike", modals: Jl, children: /* @__PURE__ */ D.jsx(Sl, { className: "post-analytics-spike", ...t, children: /* @__PURE__ */ D.jsx(Xl, {}) }) }) });
export {
  td as A,
  Qr as N,
  j as R,
  jr as S,
  N as a,
  Zl as b,
  Ur as c,
  be as d,
  z as e,
  mt as f,
  ed as g,
  D as j,
  Wr as u
};
//# sourceMappingURL=index-8d345a23.mjs.map
