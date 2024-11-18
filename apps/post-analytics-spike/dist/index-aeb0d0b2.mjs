function Es(e) {
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
var Mr = { exports: {} }, yt = {};
const Ne = React.Children, kr = React.Component, Pr = React.Fragment, xs = React.Profiler, ws = React.PureComponent, Ss = React.StrictMode, Cs = React.Suspense, Os = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, Rs = React.act, yn = React.cloneElement, we = React.createContext, I = React.createElement, Ts = React.createFactory, Ds = React.createRef, F = React, G = React.forwardRef, Ae = React.isValidElement, Is = React.lazy, Ar = React.memo, Ns = React.startTransition, Ms = React.unstable_act, $ = React.useCallback, de = React.useContext, ks = React.useDebugValue, Ps = React.useDeferredValue, z = React.useEffect, $r = React.useId, As = React.useImperativeHandle, $s = React.useInsertionEffect, js = React.useLayoutEffect, bn = React.useMemo, jr = React.useReducer, Fs = React.useRef, ve = React.useState, Ls = React.useSyncExternalStore, Us = React.useTransition, Fr = React.version, qs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: Ne,
  Component: kr,
  Fragment: Pr,
  Profiler: xs,
  PureComponent: ws,
  StrictMode: Ss,
  Suspense: Cs,
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: Os,
  act: Rs,
  cloneElement: yn,
  createContext: we,
  createElement: I,
  createFactory: Ts,
  createRef: Ds,
  default: F,
  forwardRef: G,
  isValidElement: Ae,
  lazy: Is,
  memo: Ar,
  startTransition: Ns,
  unstable_act: Ms,
  useCallback: $,
  useContext: de,
  useDebugValue: ks,
  useDeferredValue: Ps,
  useEffect: z,
  useId: $r,
  useImperativeHandle: As,
  useInsertionEffect: $s,
  useLayoutEffect: js,
  useMemo: bn,
  useReducer: jr,
  useRef: Fs,
  useState: ve,
  useSyncExternalStore: Ls,
  useTransition: Us,
  version: Fr
}, Symbol.toStringTag, { value: "Module" })), Hs = /* @__PURE__ */ Es(qs);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Bs = Hs, zs = Symbol.for("react.element"), Gs = Symbol.for("react.fragment"), Ws = Object.prototype.hasOwnProperty, Vs = Bs.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, Qs = { key: !0, ref: !0, __self: !0, __source: !0 };
function Lr(e, t, n) {
  var r, o = {}, s = null, i = null;
  n !== void 0 && (s = "" + n), t.key !== void 0 && (s = "" + t.key), t.ref !== void 0 && (i = t.ref);
  for (r in t)
    Ws.call(t, r) && !Qs.hasOwnProperty(r) && (o[r] = t[r]);
  if (e && e.defaultProps)
    for (r in t = e.defaultProps, t)
      o[r] === void 0 && (o[r] = t[r]);
  return { $$typeof: zs, type: e, key: s, ref: i, props: o, _owner: Vs.current };
}
yt.Fragment = Gs;
yt.jsx = Lr;
yt.jsxs = Lr;
Mr.exports = yt;
var b = Mr.exports;
function Ks(e, t) {
  typeof e == "function" ? e(t) : e != null && (e.current = t);
}
function Ys(...e) {
  return (t) => e.forEach((n) => Ks(n, t));
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
var bt = G((e, t) => {
  const { children: n, ...r } = e, o = Ne.toArray(n), s = o.find(Js);
  if (s) {
    const i = s.props.children, a = o.map((c) => c === s ? Ne.count(i) > 1 ? Ne.only(null) : Ae(i) ? i.props.children : null : c);
    return /* @__PURE__ */ b.jsx(Vt, { ...r, ref: t, children: Ae(i) ? yn(i, void 0, a) : null });
  }
  return /* @__PURE__ */ b.jsx(Vt, { ...r, ref: t, children: n });
});
bt.displayName = "Slot";
var Vt = G((e, t) => {
  const { children: n, ...r } = e;
  if (Ae(n)) {
    const o = ei(n);
    return yn(n, {
      ...Zs(r, n.props),
      // @ts-ignore
      ref: t ? Ys(t, o) : o
    });
  }
  return Ne.count(n) > 1 ? Ne.only(null) : null;
});
Vt.displayName = "SlotClone";
var Xs = ({ children: e }) => /* @__PURE__ */ b.jsx(b.Fragment, { children: e });
function Js(e) {
  return Ae(e) && e.type === Xs;
}
function Zs(e, t) {
  const n = { ...t };
  for (const r in t) {
    const o = e[r], s = t[r];
    /^on[A-Z]/.test(r) ? o && s ? n[r] = (...a) => {
      s(...a), o(...a);
    } : o && (n[r] = o) : r === "style" ? n[r] = { ...o, ...s } : r === "className" && (n[r] = [o, s].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function ei(e) {
  var r, o;
  let t = (r = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : r.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = (o = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : o.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
function Ur(e) {
  var t, n, r = "";
  if (typeof e == "string" || typeof e == "number")
    r += e;
  else if (typeof e == "object")
    if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++)
        e[t] && (n = Ur(e[t])) && (r && (r += " "), r += n);
    } else
      for (n in e)
        e[n] && (r && (r += " "), r += n);
  return r;
}
function qr() {
  for (var e, t, n = 0, r = "", o = arguments.length; n < o; n++)
    (e = arguments[n]) && (t = Ur(e)) && (r && (r += " "), r += t);
  return r;
}
var N = globalThis && globalThis.__assign || function() {
  return N = Object.assign || function(e) {
    for (var t, n = 1, r = arguments.length; n < r; n++) {
      t = arguments[n];
      for (var o in t)
        Object.prototype.hasOwnProperty.call(t, o) && (e[o] = t[o]);
    }
    return e;
  }, N.apply(this, arguments);
}, Hr = globalThis && globalThis.__rest || function(e, t) {
  var n = {};
  for (var r in e)
    Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var o = 0, r = Object.getOwnPropertySymbols(e); o < r.length; o++)
      t.indexOf(r[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[o]) && (n[r[o]] = e[r[o]]);
  return n;
}, Ut = Symbol("NiceModalId"), vn = {}, je = F.createContext(vn), Br = F.createContext(null), K = {}, We = {}, ti = 0, Fe = function() {
  throw new Error("No dispatch method detected, did you embed your app with NiceModal.Provider?");
}, zr = function() {
  return "_nice_modal_" + ti++;
}, Gr = function(e, t) {
  var n, r, o;
  switch (e === void 0 && (e = vn), t.type) {
    case "nice-modal/show": {
      var s = t.payload, i = s.modalId, a = s.args;
      return N(N({}, e), (n = {}, n[i] = N(N({}, e[i]), {
        id: i,
        args: a,
        // If modal is not mounted, mount it first then make it visible.
        // There is logic inside HOC wrapper to make it visible after its first mount.
        // This mechanism ensures the entering transition.
        visible: !!We[i],
        delayVisible: !We[i]
      }), n));
    }
    case "nice-modal/hide": {
      var i = t.payload.modalId;
      return e[i] ? N(N({}, e), (r = {}, r[i] = N(N({}, e[i]), { visible: !1 }), r)) : e;
    }
    case "nice-modal/remove": {
      var i = t.payload.modalId, c = N({}, e);
      return delete c[i], c;
    }
    case "nice-modal/set-flags": {
      var u = t.payload, i = u.modalId, l = u.flags;
      return N(N({}, e), (o = {}, o[i] = N(N({}, e[i]), l), o));
    }
    default:
      return e;
  }
};
function ni(e) {
  var t;
  return (t = K[e]) === null || t === void 0 ? void 0 : t.comp;
}
function ri(e, t) {
  return {
    type: "nice-modal/show",
    payload: {
      modalId: e,
      args: t
    }
  };
}
function oi(e, t) {
  return {
    type: "nice-modal/set-flags",
    payload: {
      modalId: e,
      flags: t
    }
  };
}
function si(e) {
  return {
    type: "nice-modal/hide",
    payload: {
      modalId: e
    }
  };
}
function ii(e) {
  return {
    type: "nice-modal/remove",
    payload: {
      modalId: e
    }
  };
}
var ne = {}, Me = {}, vt = function(e) {
  return typeof e == "string" ? e : (e[Ut] || (e[Ut] = zr()), e[Ut]);
};
function _n(e, t) {
  var n = vt(e);
  if (typeof e != "string" && !K[n] && _t(n, e), Fe(ri(n, t)), !ne[n]) {
    var r, o, s = new Promise(function(i, a) {
      r = i, o = a;
    });
    ne[n] = {
      resolve: r,
      reject: o,
      promise: s
    };
  }
  return ne[n].promise;
}
function En(e) {
  var t = vt(e);
  if (Fe(si(t)), delete ne[t], !Me[t]) {
    var n, r, o = new Promise(function(s, i) {
      n = s, r = i;
    });
    Me[t] = {
      resolve: n,
      reject: r,
      promise: o
    };
  }
  return Me[t].promise;
}
var Wr = function(e) {
  var t = vt(e);
  Fe(ii(t)), delete ne[t], delete Me[t];
}, ai = function(e, t) {
  Fe(oi(e, t));
};
function Vr(e, t) {
  var n = de(je), r = de(Br), o = null, s = e && typeof e != "string";
  if (e ? o = vt(e) : o = r, !o)
    throw new Error("No modal id found in NiceModal.useModal.");
  var i = o;
  z(function() {
    s && !K[i] && _t(i, e, t);
  }, [s, i, e, t]);
  var a = n[i], c = $(function(g) {
    return _n(i, g);
  }, [i]), u = $(function() {
    return En(i);
  }, [i]), l = $(function() {
    return Wr(i);
  }, [i]), d = $(function(g) {
    var m;
    (m = ne[i]) === null || m === void 0 || m.resolve(g), delete ne[i];
  }, [i]), f = $(function(g) {
    var m;
    (m = ne[i]) === null || m === void 0 || m.reject(g), delete ne[i];
  }, [i]), h = $(function(g) {
    var m;
    (m = Me[i]) === null || m === void 0 || m.resolve(g), delete Me[i];
  }, [i]);
  return bn(function() {
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
var ci = function(e) {
  return function(t) {
    var n, r = t.defaultVisible, o = t.keepMounted, s = t.id, i = Hr(t, ["defaultVisible", "keepMounted", "id"]), a = Vr(s), c = a.args, u = a.show, l = de(je), d = !!l[s];
    z(function() {
      return r && u(), We[s] = !0, function() {
        delete We[s];
      };
    }, [s, u, r]), z(function() {
      o && ai(s, { keepMounted: !0 });
    }, [s, o]);
    var f = (n = l[s]) === null || n === void 0 ? void 0 : n.delayVisible;
    return z(function() {
      f && u(c);
    }, [f, c, u]), d ? F.createElement(
      Br.Provider,
      { value: s },
      F.createElement(e, N({}, i, c))
    ) : null;
  };
}, _t = function(e, t, n) {
  K[e] ? K[e].props = n : K[e] = { comp: t, props: n };
}, ui = function(e) {
  delete K[e];
}, Qr = function() {
  var e = de(je), t = Object.keys(e).filter(function(r) {
    return !!e[r];
  });
  t.forEach(function(r) {
    if (!K[r] && !We[r]) {
      console.warn("No modal found for id: " + r + ". Please check the id or if it is registered or declared via JSX.");
      return;
    }
  });
  var n = t.filter(function(r) {
    return K[r];
  }).map(function(r) {
    return N({ id: r }, K[r]);
  });
  return F.createElement(F.Fragment, null, n.map(function(r) {
    return F.createElement(r.comp, N({ key: r.id, id: r.id }, r.props));
  }));
}, li = function(e) {
  var t = e.children, n = jr(Gr, vn), r = n[0];
  return Fe = n[1], F.createElement(
    je.Provider,
    { value: r },
    t,
    F.createElement(Qr, null)
  );
}, di = function(e) {
  var t = e.children, n = e.dispatch, r = e.modals;
  return !n || !r ? F.createElement(li, null, t) : (Fe = n, F.createElement(
    je.Provider,
    { value: r },
    t,
    F.createElement(Qr, null)
  ));
}, fi = function(e) {
  var t = e.id, n = e.component;
  return z(function() {
    return _t(t, n), function() {
      ui(t);
    };
  }, [t, n]), null;
}, hi = function(e) {
  var t, n = e.modal, r = e.handler, o = r === void 0 ? {} : r, s = Hr(e, ["modal", "handler"]), i = bn(function() {
    return zr();
  }, []), a = typeof n == "string" ? (t = K[n]) === null || t === void 0 ? void 0 : t.comp : n;
  if (!o)
    throw new Error("No handler found in NiceModal.ModalHolder.");
  if (!a)
    throw new Error("No modal found for id: " + n + " in NiceModal.ModalHolder.");
  return o.show = $(function(c) {
    return _n(i, c);
  }, [i]), o.hide = $(function() {
    return En(i);
  }, [i]), F.createElement(a, N({ id: i }, s));
}, pi = function(e) {
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
}, gi = function(e) {
  return {
    visible: e.visible,
    onClose: function() {
      return e.hide();
    },
    afterVisibleChange: function(t) {
      t || e.resolveHide(), !t && !e.keepMounted && e.remove();
    }
  };
}, mi = function(e) {
  return {
    open: e.visible,
    onClose: function() {
      return e.hide();
    },
    onExited: function() {
      e.resolveHide(), !e.keepMounted && e.remove();
    }
  };
}, yi = function(e) {
  return {
    show: e.visible,
    onHide: function() {
      return e.hide();
    },
    onExited: function() {
      e.resolveHide(), !e.keepMounted && e.remove();
    }
  };
}, Kr = {
  Provider: di,
  ModalDef: fi,
  ModalHolder: hi,
  NiceModalContext: je,
  create: ci,
  register: _t,
  getModal: ni,
  show: _n,
  hide: En,
  remove: Wr,
  useModal: Vr,
  reducer: Gr,
  antdModal: pi,
  antdDrawer: gi,
  muiDialog: mi,
  bootstrapDialog: yi
};
let bi = { data: "" }, vi = (e) => typeof window == "object" ? ((e ? e.querySelector("#_goober") : window._goober) || Object.assign((e || document.head).appendChild(document.createElement("style")), { innerHTML: " ", id: "_goober" })).firstChild : e || bi, _i = /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g, Ei = /\/\*[^]*?\*\/|  +/g, Bn = /\n+/g, ue = (e, t) => {
  let n = "", r = "", o = "";
  for (let s in e) {
    let i = e[s];
    s[0] == "@" ? s[1] == "i" ? n = s + " " + i + ";" : r += s[1] == "f" ? ue(i, s) : s + "{" + ue(i, s[1] == "k" ? "" : t) + "}" : typeof i == "object" ? r += ue(i, t ? t.replace(/([^,])+/g, (a) => s.replace(/(^:.*)|([^,])+/g, (c) => /&/.test(c) ? c.replace(/&/g, a) : a ? a + " " + c : c)) : s) : i != null && (s = /^--/.test(s) ? s : s.replace(/[A-Z]/g, "-$&").toLowerCase(), o += ue.p ? ue.p(s, i) : s + ":" + i + ";");
  }
  return n + (t && o ? t + "{" + o + "}" : o) + r;
}, Z = {}, Yr = (e) => {
  if (typeof e == "object") {
    let t = "";
    for (let n in e)
      t += n + Yr(e[n]);
    return t;
  }
  return e;
}, xi = (e, t, n, r, o) => {
  let s = Yr(e), i = Z[s] || (Z[s] = ((c) => {
    let u = 0, l = 11;
    for (; u < c.length; )
      l = 101 * l + c.charCodeAt(u++) >>> 0;
    return "go" + l;
  })(s));
  if (!Z[i]) {
    let c = s !== e ? e : ((u) => {
      let l, d, f = [{}];
      for (; l = _i.exec(u.replace(Ei, "")); )
        l[4] ? f.shift() : l[3] ? (d = l[3].replace(Bn, " ").trim(), f.unshift(f[0][d] = f[0][d] || {})) : f[0][l[1]] = l[2].replace(Bn, " ").trim();
      return f[0];
    })(e);
    Z[i] = ue(o ? { ["@keyframes " + i]: c } : c, n ? "" : "." + i);
  }
  let a = n && Z.g ? Z.g : null;
  return n && (Z.g = Z[i]), ((c, u, l, d) => {
    d ? u.data = u.data.replace(d, c) : u.data.indexOf(c) === -1 && (u.data = l ? c + u.data : u.data + c);
  })(Z[i], t, r, a), i;
}, wi = (e, t, n) => e.reduce((r, o, s) => {
  let i = t[s];
  if (i && i.call) {
    let a = i(n), c = a && a.props && a.props.className || /^go/.test(a) && a;
    i = c ? "." + c : a && typeof a == "object" ? a.props ? "" : ue(a, "") : a === !1 ? "" : a;
  }
  return r + o + (i ?? "");
}, "");
function Et(e) {
  let t = this || {}, n = e.call ? e(t.p) : e;
  return xi(n.unshift ? n.raw ? wi(n, [].slice.call(arguments, 1), t.p) : n.reduce((r, o) => Object.assign(r, o && o.call ? o(t.p) : o), {}) : n, vi(t.target), t.g, t.o, t.k);
}
let Xr, Qt, Kt;
Et.bind({ g: 1 });
let oe = Et.bind({ k: 1 });
function Si(e, t, n, r) {
  ue.p = t, Xr = e, Qt = n, Kt = r;
}
function he(e, t) {
  let n = this || {};
  return function() {
    let r = arguments;
    function o(s, i) {
      let a = Object.assign({}, s), c = a.className || o.className;
      n.p = Object.assign({ theme: Qt && Qt() }, a), n.o = / *go\d+/.test(c), a.className = Et.apply(n, r) + (c ? " " + c : ""), t && (a.ref = i);
      let u = e;
      return e[0] && (u = a.as || e, delete a.as), Kt && u[0] && Kt(a), Xr(u, a);
    }
    return t ? t(o) : o;
  };
}
var Ci = (e) => typeof e == "function", lt = (e, t) => Ci(e) ? e(t) : e, Oi = (() => {
  let e = 0;
  return () => (++e).toString();
})(), Jr = (() => {
  let e;
  return () => {
    if (e === void 0 && typeof window < "u") {
      let t = matchMedia("(prefers-reduced-motion: reduce)");
      e = !t || t.matches;
    }
    return e;
  };
})(), Ri = 20, it = /* @__PURE__ */ new Map(), Ti = 1e3, zn = (e) => {
  if (it.has(e))
    return;
  let t = setTimeout(() => {
    it.delete(e), Se({ type: 4, toastId: e });
  }, Ti);
  it.set(e, t);
}, Di = (e) => {
  let t = it.get(e);
  t && clearTimeout(t);
}, Yt = (e, t) => {
  switch (t.type) {
    case 0:
      return { ...e, toasts: [t.toast, ...e.toasts].slice(0, Ri) };
    case 1:
      return t.toast.id && Di(t.toast.id), { ...e, toasts: e.toasts.map((s) => s.id === t.toast.id ? { ...s, ...t.toast } : s) };
    case 2:
      let { toast: n } = t;
      return e.toasts.find((s) => s.id === n.id) ? Yt(e, { type: 1, toast: n }) : Yt(e, { type: 0, toast: n });
    case 3:
      let { toastId: r } = t;
      return r ? zn(r) : e.toasts.forEach((s) => {
        zn(s.id);
      }), { ...e, toasts: e.toasts.map((s) => s.id === r || r === void 0 ? { ...s, visible: !1 } : s) };
    case 4:
      return t.toastId === void 0 ? { ...e, toasts: [] } : { ...e, toasts: e.toasts.filter((s) => s.id !== t.toastId) };
    case 5:
      return { ...e, pausedAt: t.time };
    case 6:
      let o = t.time - (e.pausedAt || 0);
      return { ...e, pausedAt: void 0, toasts: e.toasts.map((s) => ({ ...s, pauseDuration: s.pauseDuration + o })) };
  }
}, at = [], ct = { toasts: [], pausedAt: void 0 }, Se = (e) => {
  ct = Yt(ct, e), at.forEach((t) => {
    t(ct);
  });
}, Ii = { blank: 4e3, error: 4e3, success: 2e3, loading: 1 / 0, custom: 4e3 }, Ni = (e = {}) => {
  let [t, n] = ve(ct);
  z(() => (at.push(n), () => {
    let o = at.indexOf(n);
    o > -1 && at.splice(o, 1);
  }), [t]);
  let r = t.toasts.map((o) => {
    var s, i;
    return { ...e, ...e[o.type], ...o, duration: o.duration || ((s = e[o.type]) == null ? void 0 : s.duration) || (e == null ? void 0 : e.duration) || Ii[o.type], style: { ...e.style, ...(i = e[o.type]) == null ? void 0 : i.style, ...o.style } };
  });
  return { ...t, toasts: r };
}, Mi = (e, t = "blank", n) => ({ createdAt: Date.now(), visible: !0, type: t, ariaProps: { role: "status", "aria-live": "polite" }, message: e, pauseDuration: 0, ...n, id: (n == null ? void 0 : n.id) || Oi() }), Ve = (e) => (t, n) => {
  let r = Mi(t, e, n);
  return Se({ type: 2, toast: r }), r.id;
}, B = (e, t) => Ve("blank")(e, t);
B.error = Ve("error");
B.success = Ve("success");
B.loading = Ve("loading");
B.custom = Ve("custom");
B.dismiss = (e) => {
  Se({ type: 3, toastId: e });
};
B.remove = (e) => Se({ type: 4, toastId: e });
B.promise = (e, t, n) => {
  let r = B.loading(t.loading, { ...n, ...n == null ? void 0 : n.loading });
  return e.then((o) => (B.success(lt(t.success, o), { id: r, ...n, ...n == null ? void 0 : n.success }), o)).catch((o) => {
    B.error(lt(t.error, o), { id: r, ...n, ...n == null ? void 0 : n.error });
  }), e;
};
var ki = (e, t) => {
  Se({ type: 1, toast: { id: e, height: t } });
}, Pi = () => {
  Se({ type: 5, time: Date.now() });
}, Ai = (e) => {
  let { toasts: t, pausedAt: n } = Ni(e);
  z(() => {
    if (n)
      return;
    let s = Date.now(), i = t.map((a) => {
      if (a.duration === 1 / 0)
        return;
      let c = (a.duration || 0) + a.pauseDuration - (s - a.createdAt);
      if (c < 0) {
        a.visible && B.dismiss(a.id);
        return;
      }
      return setTimeout(() => B.dismiss(a.id), c);
    });
    return () => {
      i.forEach((a) => a && clearTimeout(a));
    };
  }, [t, n]);
  let r = $(() => {
    n && Se({ type: 6, time: Date.now() });
  }, [n]), o = $((s, i) => {
    let { reverseOrder: a = !1, gutter: c = 8, defaultPosition: u } = i || {}, l = t.filter((h) => (h.position || u) === (s.position || u) && h.height), d = l.findIndex((h) => h.id === s.id), f = l.filter((h, g) => g < d && h.visible).length;
    return l.filter((h) => h.visible).slice(...a ? [f + 1] : [0, f]).reduce((h, g) => h + (g.height || 0) + c, 0);
  }, [t]);
  return { toasts: t, handlers: { updateHeight: ki, startPause: Pi, endPause: r, calculateOffset: o } };
}, $i = oe`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`, ji = oe`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`, Fi = oe`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`, Li = he("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(e) => e.primary || "#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${$i} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${ji} 0.15s ease-out forwards;
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
    animation: ${Fi} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`, Ui = oe`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`, qi = he("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${(e) => e.secondary || "#e0e0e0"};
  border-right-color: ${(e) => e.primary || "#616161"};
  animation: ${Ui} 1s linear infinite;
`, Hi = oe`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`, Bi = oe`
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
}`, zi = he("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(e) => e.primary || "#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Hi} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Bi} 0.2s ease-out forwards;
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
`, Gi = he("div")`
  position: absolute;
`, Wi = he("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`, Vi = oe`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`, Qi = he("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Vi} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`, Ki = ({ toast: e }) => {
  let { icon: t, type: n, iconTheme: r } = e;
  return t !== void 0 ? typeof t == "string" ? I(Qi, null, t) : t : n === "blank" ? null : I(Wi, null, I(qi, { ...r }), n !== "loading" && I(Gi, null, n === "error" ? I(Li, { ...r }) : I(zi, { ...r })));
}, Yi = (e) => `
0% {transform: translate3d(0,${e * -200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`, Xi = (e) => `
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e * -150}%,-1px) scale(.6); opacity:0;}
`, Ji = "0%{opacity:0;} 100%{opacity:1;}", Zi = "0%{opacity:1;} 100%{opacity:0;}", ea = he("div")`
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
`, ta = he("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`, na = (e, t) => {
  let n = e.includes("top") ? 1 : -1, [r, o] = Jr() ? [Ji, Zi] : [Yi(n), Xi(n)];
  return { animation: t ? `${oe(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards` : `${oe(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)` };
}, ra = Ar(({ toast: e, position: t, style: n, children: r }) => {
  let o = e.height ? na(e.position || t || "top-center", e.visible) : { opacity: 0 }, s = I(Ki, { toast: e }), i = I(ta, { ...e.ariaProps }, lt(e.message, e));
  return I(ea, { className: e.className, style: { ...o, ...n, ...e.style } }, typeof r == "function" ? r({ icon: s, message: i }) : I(Pr, null, s, i));
});
Si(I);
var oa = ({ id: e, className: t, style: n, onHeightUpdate: r, children: o }) => {
  let s = $((i) => {
    if (i) {
      let a = () => {
        let c = i.getBoundingClientRect().height;
        r(e, c);
      };
      a(), new MutationObserver(a).observe(i, { subtree: !0, childList: !0, characterData: !0 });
    }
  }, [e, r]);
  return I("div", { ref: s, className: t, style: n }, o);
}, sa = (e, t) => {
  let n = e.includes("top"), r = n ? { top: 0 } : { bottom: 0 }, o = e.includes("center") ? { justifyContent: "center" } : e.includes("right") ? { justifyContent: "flex-end" } : {};
  return { left: 0, right: 0, display: "flex", position: "absolute", transition: Jr() ? void 0 : "all 230ms cubic-bezier(.21,1.02,.73,1)", transform: `translateY(${t * (n ? 1 : -1)}px)`, ...r, ...o };
}, ia = Et`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`, Je = 16, aa = ({ reverseOrder: e, position: t = "top-center", toastOptions: n, gutter: r, children: o, containerStyle: s, containerClassName: i }) => {
  let { toasts: a, handlers: c } = Ai(n);
  return I("div", { style: { position: "fixed", zIndex: 9999, top: Je, left: Je, right: Je, bottom: Je, pointerEvents: "none", ...s }, className: i, onMouseEnter: c.startPause, onMouseLeave: c.endPause }, a.map((u) => {
    let l = u.position || t, d = c.calculateOffset(u, { reverseOrder: e, gutter: r, defaultPosition: t }), f = sa(l, d);
    return I(oa, { id: u.id, key: u.id, onHeightUpdate: c.updateHeight, className: u.visible ? ia : "", style: f }, u.type === "custom" ? lt(u.message, u) : o ? o(u) : I(ra, { toast: u, position: l }));
  }));
};
const Zr = F.createContext({ isDirty: !1, setGlobalDirtyState: () => {
} }), ca = ({ children: e }) => {
  const [t, n] = ve([]), r = $((o, s) => {
    n((i) => s && !i.includes(o) ? [...i, o] : !s && i.includes(o) ? i.filter((a) => a !== o) : i);
  }, []);
  return /* @__PURE__ */ b.jsx(Zr.Provider, { value: { isDirty: t.length > 0, setGlobalDirtyState: r }, children: e });
}, hd = () => {
  const e = $r(), { isDirty: t, setGlobalDirtyState: n } = de(Zr);
  z(() => () => n(e, !1), [e, n]);
  const r = $(
    (o) => n(e, o),
    [e, n]
  );
  return {
    isDirty: t,
    setGlobalDirtyState: r
  };
}, ua = we({
  isAnyTextFieldFocused: !1,
  setFocusState: () => {
  },
  fetchKoenigLexical: async () => {
  },
  darkMode: !1
}), la = ({ fetchKoenigLexical: e, darkMode: t, children: n }) => {
  const [r, o] = ve(!1), s = (i) => {
    o(i);
  };
  return /* @__PURE__ */ b.jsx(ua.Provider, { value: { isAnyTextFieldFocused: r, setFocusState: s, fetchKoenigLexical: e, darkMode: t }, children: /* @__PURE__ */ b.jsxs(ca, { children: [
    /* @__PURE__ */ b.jsx(aa, {}),
    /* @__PURE__ */ b.jsx(Kr.Provider, { children: n })
  ] }) });
}, eo = Object.prototype.toString;
function xn(e) {
  switch (eo.call(e)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
      return !0;
    default:
      return Ee(e, Error);
  }
}
function Le(e, t) {
  return eo.call(e) === `[object ${t}]`;
}
function wn(e) {
  return Le(e, "ErrorEvent");
}
function Gn(e) {
  return Le(e, "DOMError");
}
function da(e) {
  return Le(e, "DOMException");
}
function re(e) {
  return Le(e, "String");
}
function to(e) {
  return typeof e == "object" && e !== null && "__sentry_template_string__" in e && "__sentry_template_values__" in e;
}
function no(e) {
  return e === null || to(e) || typeof e != "object" && typeof e != "function";
}
function xt(e) {
  return Le(e, "Object");
}
function wt(e) {
  return typeof Event < "u" && Ee(e, Event);
}
function fa(e) {
  return typeof Element < "u" && Ee(e, Element);
}
function ha(e) {
  return Le(e, "RegExp");
}
function Sn(e) {
  return !!(e && e.then && typeof e.then == "function");
}
function pa(e) {
  return xt(e) && "nativeEvent" in e && "preventDefault" in e && "stopPropagation" in e;
}
function ga(e) {
  return typeof e == "number" && e !== e;
}
function Ee(e, t) {
  try {
    return e instanceof t;
  } catch {
    return !1;
  }
}
function ro(e) {
  return !!(typeof e == "object" && e !== null && (e.__isVue || e._isVue));
}
function Xt(e, t = 0) {
  return typeof e != "string" || t === 0 || e.length <= t ? e : `${e.slice(0, t)}...`;
}
function Wn(e, t) {
  if (!Array.isArray(e))
    return "";
  const n = [];
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    try {
      ro(o) ? n.push("[VueViewModel]") : n.push(String(o));
    } catch {
      n.push("[value cannot be serialized]");
    }
  }
  return n.join(t);
}
function ma(e, t, n = !1) {
  return re(e) ? ha(t) ? t.test(e) : re(t) ? n ? e === t : e.includes(t) : !1 : !1;
}
function St(e, t = [], n = !1) {
  return t.some((r) => ma(e, r, n));
}
function ya(e, t, n = 250, r, o, s, i) {
  if (!s.exception || !s.exception.values || !i || !Ee(i.originalException, Error))
    return;
  const a = s.exception.values.length > 0 ? s.exception.values[s.exception.values.length - 1] : void 0;
  a && (s.exception.values = ba(
    Jt(
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
function Jt(e, t, n, r, o, s, i, a) {
  if (s.length >= n + 1)
    return s;
  let c = [...s];
  if (Ee(r[o], Error)) {
    Vn(i, a);
    const u = e(t, r[o]), l = c.length;
    Qn(u, o, l, a), c = Jt(
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
    if (Ee(u, Error)) {
      Vn(i, a);
      const d = e(t, u), f = c.length;
      Qn(d, `errors[${l}]`, f, a), c = Jt(
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
function Vn(e, t) {
  e.mechanism = e.mechanism || { type: "generic", handled: !0 }, e.mechanism = {
    ...e.mechanism,
    ...e.type === "AggregateError" && { is_exception_group: !0 },
    exception_id: t
  };
}
function Qn(e, t, n, r) {
  e.mechanism = e.mechanism || { type: "generic", handled: !0 }, e.mechanism = {
    ...e.mechanism,
    type: "chained",
    source: t,
    exception_id: n,
    parent_id: r
  };
}
function ba(e, t) {
  return e.map((n) => (n.value && (n.value = Xt(n.value, t)), n));
}
function Ze(e) {
  return e && e.Math == Math ? e : void 0;
}
const S = typeof globalThis == "object" && Ze(globalThis) || // eslint-disable-next-line no-restricted-globals
typeof window == "object" && Ze(window) || typeof self == "object" && Ze(self) || typeof global == "object" && Ze(global) || function() {
  return this;
}() || {};
function Cn() {
  return S;
}
function oo(e, t, n) {
  const r = n || S, o = r.__SENTRY__ = r.__SENTRY__ || {};
  return o[e] || (o[e] = t());
}
const On = Cn(), va = 80;
function so(e, t = {}) {
  if (!e)
    return "<unknown>";
  try {
    let n = e;
    const r = 5, o = [];
    let s = 0, i = 0;
    const a = " > ", c = a.length;
    let u;
    const l = Array.isArray(t) ? t : t.keyAttrs, d = !Array.isArray(t) && t.maxStringLength || va;
    for (; n && s++ < r && (u = _a(n, l), !(u === "html" || s > 1 && i + o.length * c + u.length >= d)); )
      o.push(u), i += u.length, n = n.parentNode;
    return o.reverse().join(a);
  } catch {
    return "<unknown>";
  }
}
function _a(e, t) {
  const n = e, r = [];
  let o, s, i, a, c;
  if (!n || !n.tagName)
    return "";
  if (On.HTMLElement && n instanceof HTMLElement && n.dataset && n.dataset.sentryComponent)
    return n.dataset.sentryComponent;
  r.push(n.tagName.toLowerCase());
  const u = t && t.length ? t.filter((d) => n.getAttribute(d)).map((d) => [d, n.getAttribute(d)]) : null;
  if (u && u.length)
    u.forEach((d) => {
      r.push(`[${d[0]}="${d[1]}"]`);
    });
  else if (n.id && r.push(`#${n.id}`), o = n.className, o && re(o))
    for (s = o.split(/\s+/), c = 0; c < s.length; c++)
      r.push(`.${s[c]}`);
  const l = ["aria-label", "type", "name", "title", "alt"];
  for (c = 0; c < l.length; c++)
    i = l[c], a = n.getAttribute(i), a && r.push(`[${i}="${a}"]`);
  return r.join("");
}
function Ea() {
  try {
    return On.document.location.href;
  } catch {
    return "";
  }
}
function xa(e) {
  if (!On.HTMLElement)
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
const Qe = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, wa = "Sentry Logger ", Zt = [
  "debug",
  "info",
  "warn",
  "error",
  "log",
  "assert",
  "trace"
], dt = {};
function Rn(e) {
  if (!("console" in S))
    return e();
  const t = S.console, n = {}, r = Object.keys(dt);
  r.forEach((o) => {
    const s = dt[o];
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
function Sa() {
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
  return Qe ? Zt.forEach((n) => {
    t[n] = (...r) => {
      e && Rn(() => {
        S.console[n](`${wa}[${n}]:`, ...r);
      });
    };
  }) : Zt.forEach((n) => {
    t[n] = () => {
    };
  }), t;
}
const E = Sa(), Ca = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;
function Oa(e) {
  return e === "http" || e === "https";
}
function Ra(e, t = !1) {
  const { host: n, path: r, pass: o, port: s, projectId: i, protocol: a, publicKey: c } = e;
  return `${a}://${c}${t && o ? `:${o}` : ""}@${n}${s ? `:${s}` : ""}/${r && `${r}/`}${i}`;
}
function Ta(e) {
  const t = Ca.exec(e);
  if (!t) {
    Rn(() => {
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
  return io({ host: s, pass: o, path: c, projectId: u, port: i, protocol: n, publicKey: r });
}
function io(e) {
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
function Da(e) {
  if (!Qe)
    return !0;
  const { port: t, projectId: n, protocol: r } = e;
  return ["protocol", "publicKey", "host", "projectId"].find((i) => e[i] ? !1 : (E.error(`Invalid Sentry Dsn: ${i} missing`), !0)) ? !1 : n.match(/^\d+$/) ? Oa(r) ? t && isNaN(parseInt(t, 10)) ? (E.error(`Invalid Sentry Dsn: Invalid port ${t}`), !1) : !0 : (E.error(`Invalid Sentry Dsn: Invalid protocol ${r}`), !1) : (E.error(`Invalid Sentry Dsn: Invalid projectId ${n}`), !1);
}
function Ia(e) {
  const t = typeof e == "string" ? Ta(e) : io(e);
  if (!(!t || !Da(t)))
    return t;
}
function A(e, t, n) {
  if (!(t in e))
    return;
  const r = e[t], o = n(r);
  typeof o == "function" && ao(o, r), e[t] = o;
}
function ft(e, t, n) {
  try {
    Object.defineProperty(e, t, {
      // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
      value: n,
      writable: !0,
      configurable: !0
    });
  } catch {
    Qe && E.log(`Failed to add non-enumerable property "${t}" to object`, e);
  }
}
function ao(e, t) {
  try {
    const n = t.prototype || {};
    e.prototype = t.prototype = n, ft(e, "__sentry_original__", t);
  } catch {
  }
}
function Tn(e) {
  return e.__sentry_original__;
}
function co(e) {
  if (xn(e))
    return {
      message: e.message,
      name: e.name,
      stack: e.stack,
      ...Yn(e)
    };
  if (wt(e)) {
    const t = {
      type: e.type,
      target: Kn(e.target),
      currentTarget: Kn(e.currentTarget),
      ...Yn(e)
    };
    return typeof CustomEvent < "u" && Ee(e, CustomEvent) && (t.detail = e.detail), t;
  } else
    return e;
}
function Kn(e) {
  try {
    return fa(e) ? so(e) : Object.prototype.toString.call(e);
  } catch {
    return "<unknown>";
  }
}
function Yn(e) {
  if (typeof e == "object" && e !== null) {
    const t = {};
    for (const n in e)
      Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n]);
    return t;
  } else
    return {};
}
function Na(e, t = 40) {
  const n = Object.keys(co(e));
  if (n.sort(), !n.length)
    return "[object has no keys]";
  if (n[0].length >= t)
    return Xt(n[0], t);
  for (let r = n.length; r > 0; r--) {
    const o = n.slice(0, r).join(", ");
    if (!(o.length > t))
      return r === n.length ? o : Xt(o, t);
  }
  return "";
}
function ye(e) {
  return en(e, /* @__PURE__ */ new Map());
}
function en(e, t) {
  if (Ma(e)) {
    const n = t.get(e);
    if (n !== void 0)
      return n;
    const r = {};
    t.set(e, r);
    for (const o of Object.keys(e))
      typeof e[o] < "u" && (r[o] = en(e[o], t));
    return r;
  }
  if (Array.isArray(e)) {
    const n = t.get(e);
    if (n !== void 0)
      return n;
    const r = [];
    return t.set(e, r), e.forEach((o) => {
      r.push(en(o, t));
    }), r;
  }
  return e;
}
function Ma(e) {
  if (!xt(e))
    return !1;
  try {
    const t = Object.getPrototypeOf(e).constructor.name;
    return !t || t === "Object";
  } catch {
    return !0;
  }
}
const qt = "<anonymous>";
function fe(e) {
  try {
    return !e || typeof e != "function" ? qt : e.name || qt;
  } catch {
    return qt;
  }
}
const ut = {}, Xn = {};
function Ce(e, t) {
  ut[e] = ut[e] || [], ut[e].push(t);
}
function Oe(e, t) {
  Xn[e] || (t(), Xn[e] = !0);
}
function Y(e, t) {
  const n = e && ut[e];
  if (n)
    for (const r of n)
      try {
        r(t);
      } catch (o) {
        Qe && E.error(
          `Error while triggering instrumentation handler.
Type: ${e}
Name: ${fe(r)}
Error:`,
          o
        );
      }
}
function ka(e) {
  const t = "console";
  Ce(t, e), Oe(t, Pa);
}
function Pa() {
  "console" in S && Zt.forEach(function(e) {
    e in S.console && A(S.console, e, function(t) {
      return dt[e] = t, function(...n) {
        Y("console", { args: n, level: e });
        const o = dt[e];
        o && o.apply(S.console, n);
      };
    });
  });
}
function X() {
  const e = S, t = e.crypto || e.msCrypto;
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
function uo(e) {
  return e.exception && e.exception.values ? e.exception.values[0] : void 0;
}
function le(e) {
  const { message: t, event_id: n } = e;
  if (t)
    return t;
  const r = uo(e);
  return r ? r.type && r.value ? `${r.type}: ${r.value}` : r.type || r.value || n || "<unknown>" : n || "<unknown>";
}
function tn(e, t, n) {
  const r = e.exception = e.exception || {}, o = r.values = r.values || [], s = o[0] = o[0] || {};
  s.value || (s.value = t || ""), s.type || (s.type = n || "Error");
}
function nn(e, t) {
  const n = uo(e);
  if (!n)
    return;
  const r = { type: "generic", handled: !0 }, o = n.mechanism;
  if (n.mechanism = { ...r, ...o, ...t }, t && "data" in t) {
    const s = { ...o && o.data, ...t.data };
    n.mechanism.data = s;
  }
}
function Aa(e) {
  return Array.isArray(e) ? e : [e];
}
const De = S, $a = 1e3;
let Jn, rn, on;
function ja(e) {
  const t = "dom";
  Ce(t, e), Oe(t, Fa);
}
function Fa() {
  if (!De.document)
    return;
  const e = Y.bind(null, "dom"), t = Zn(e, !0);
  De.document.addEventListener("click", t, !1), De.document.addEventListener("keypress", t, !1), ["EventTarget", "Node"].forEach((n) => {
    const r = De[n] && De[n].prototype;
    !r || !r.hasOwnProperty || !r.hasOwnProperty("addEventListener") || (A(r, "addEventListener", function(o) {
      return function(s, i, a) {
        if (s === "click" || s == "keypress")
          try {
            const c = this, u = c.__sentry_instrumentation_handlers__ = c.__sentry_instrumentation_handlers__ || {}, l = u[s] = u[s] || { refCount: 0 };
            if (!l.handler) {
              const d = Zn(e);
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
function La(e) {
  if (e.type !== rn)
    return !1;
  try {
    if (!e.target || e.target._sentryId !== on)
      return !1;
  } catch {
  }
  return !0;
}
function Ua(e, t) {
  return e !== "keypress" ? !1 : !t || !t.tagName ? !0 : !(t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}
function Zn(e, t = !1) {
  return (n) => {
    if (!n || n._sentryCaptured)
      return;
    const r = qa(n);
    if (Ua(n.type, r))
      return;
    ft(n, "_sentryCaptured", !0), r && !r._sentryId && ft(r, "_sentryId", X());
    const o = n.type === "keypress" ? "input" : n.type;
    La(n) || (e({ event: n, name: o, global: t }), rn = n.type, on = r ? r._sentryId : void 0), clearTimeout(Jn), Jn = De.setTimeout(() => {
      on = void 0, rn = void 0;
    }, $a);
  };
}
function qa(e) {
  try {
    return e.target;
  } catch {
    return null;
  }
}
const sn = Cn();
function Ha() {
  if (!("fetch" in sn))
    return !1;
  try {
    return new Headers(), new Request("http://www.example.com"), new Response(), !0;
  } catch {
    return !1;
  }
}
function er(e) {
  return e && /^function fetch\(\)\s+\{\s+\[native code\]\s+\}$/.test(e.toString());
}
function Ba() {
  if (typeof EdgeRuntime == "string")
    return !0;
  if (!Ha())
    return !1;
  if (er(sn.fetch))
    return !0;
  let e = !1;
  const t = sn.document;
  if (t && typeof t.createElement == "function")
    try {
      const n = t.createElement("iframe");
      n.hidden = !0, t.head.appendChild(n), n.contentWindow && n.contentWindow.fetch && (e = er(n.contentWindow.fetch)), t.head.removeChild(n);
    } catch (n) {
      Qe && E.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", n);
    }
  return e;
}
function za(e) {
  const t = "fetch";
  Ce(t, e), Oe(t, Ga);
}
function Ga() {
  Ba() && A(S, "fetch", function(e) {
    return function(...t) {
      const { method: n, url: r } = Wa(t), o = {
        args: t,
        fetchData: {
          method: n,
          url: r
        },
        startTimestamp: Date.now()
      };
      return Y("fetch", {
        ...o
      }), e.apply(S, t).then(
        (s) => {
          const i = {
            ...o,
            endTimestamp: Date.now(),
            response: s
          };
          return Y("fetch", i), s;
        },
        (s) => {
          const i = {
            ...o,
            endTimestamp: Date.now(),
            error: s
          };
          throw Y("fetch", i), s;
        }
      );
    };
  });
}
function an(e, t) {
  return !!e && typeof e == "object" && !!e[t];
}
function tr(e) {
  return typeof e == "string" ? e : e ? an(e, "url") ? e.url : e.toString ? e.toString() : "" : "";
}
function Wa(e) {
  if (e.length === 0)
    return { method: "GET", url: "" };
  if (e.length === 2) {
    const [n, r] = e;
    return {
      url: tr(n),
      method: an(r, "method") ? String(r.method).toUpperCase() : "GET"
    };
  }
  const t = e[0];
  return {
    url: tr(t),
    method: an(t, "method") ? String(t.method).toUpperCase() : "GET"
  };
}
let et = null;
function Va(e) {
  const t = "error";
  Ce(t, e), Oe(t, Qa);
}
function Qa() {
  et = S.onerror, S.onerror = function(e, t, n, r, o) {
    return Y("error", {
      column: r,
      error: o,
      line: n,
      msg: e,
      url: t
    }), et && !et.__SENTRY_LOADER__ ? et.apply(this, arguments) : !1;
  }, S.onerror.__SENTRY_INSTRUMENTED__ = !0;
}
let tt = null;
function Ka(e) {
  const t = "unhandledrejection";
  Ce(t, e), Oe(t, Ya);
}
function Ya() {
  tt = S.onunhandledrejection, S.onunhandledrejection = function(e) {
    return Y("unhandledrejection", e), tt && !tt.__SENTRY_LOADER__ ? tt.apply(this, arguments) : !0;
  }, S.onunhandledrejection.__SENTRY_INSTRUMENTED__ = !0;
}
const nt = Cn();
function Xa() {
  const e = nt.chrome, t = e && e.app && e.app.runtime, n = "history" in nt && !!nt.history.pushState && !!nt.history.replaceState;
  return !t && n;
}
const He = S;
let rt;
function Ja(e) {
  const t = "history";
  Ce(t, e), Oe(t, Za);
}
function Za() {
  if (!Xa())
    return;
  const e = He.onpopstate;
  He.onpopstate = function(...n) {
    const r = He.location.href, o = rt;
    if (rt = r, Y("history", { from: o, to: r }), e)
      try {
        return e.apply(this, n);
      } catch {
      }
  };
  function t(n) {
    return function(...r) {
      const o = r.length > 2 ? r[2] : void 0;
      if (o) {
        const s = rt, i = String(o);
        rt = i, Y("history", { from: s, to: i });
      }
      return n.apply(this, r);
    };
  }
  A(He.history, "pushState", t), A(He.history, "replaceState", t);
}
const ec = S, Ge = "__sentry_xhr_v3__";
function tc(e) {
  const t = "xhr";
  Ce(t, e), Oe(t, nc);
}
function nc() {
  if (!ec.XMLHttpRequest)
    return;
  const e = XMLHttpRequest.prototype;
  A(e, "open", function(t) {
    return function(...n) {
      const r = Date.now(), o = re(n[0]) ? n[0].toUpperCase() : void 0, s = rc(n[1]);
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
          Y("xhr", c);
        }
      };
      return "onreadystatechange" in this && typeof this.onreadystatechange == "function" ? A(this, "onreadystatechange", function(a) {
        return function(...c) {
          return i(), a.apply(this, c);
        };
      }) : this.addEventListener("readystatechange", i), A(this, "setRequestHeader", function(a) {
        return function(...c) {
          const [u, l] = c, d = this[Ge];
          return d && re(u) && re(l) && (d.request_headers[u.toLowerCase()] = l), a.apply(this, c);
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
      return Y("xhr", o), t.apply(this, n);
    };
  });
}
function rc(e) {
  if (re(e))
    return e;
  try {
    return e.toString();
  } catch {
  }
}
function oc() {
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
function sc(e, t = 100, n = 1 / 0) {
  try {
    return cn("", e, t, n);
  } catch (r) {
    return { ERROR: `**non-serializable** (${r})` };
  }
}
function lo(e, t = 3, n = 100 * 1024) {
  const r = sc(e, t);
  return uc(r) > n ? lo(e, t - 1, n) : r;
}
function cn(e, t, n = 1 / 0, r = 1 / 0, o = oc()) {
  const [s, i] = o;
  if (t == null || // this matches null and undefined -> eqeq not eqeqeq
  ["number", "boolean", "string"].includes(typeof t) && !ga(t))
    return t;
  const a = ic(e, t);
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
      return cn("", h, c - 1, r, o);
    } catch {
    }
  const l = Array.isArray(t) ? [] : {};
  let d = 0;
  const f = co(t);
  for (const h in f) {
    if (!Object.prototype.hasOwnProperty.call(f, h))
      continue;
    if (d >= r) {
      l[h] = "[MaxProperties ~]";
      break;
    }
    const g = f[h];
    l[h] = cn(h, g, c - 1, r, o), d++;
  }
  return i(t), l;
}
function ic(e, t) {
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
    if (ro(t))
      return "[VueViewModel]";
    if (pa(t))
      return "[SyntheticEvent]";
    if (typeof t == "number" && t !== t)
      return "[NaN]";
    if (typeof t == "function")
      return `[Function: ${fe(t)}]`;
    if (typeof t == "symbol")
      return `[${String(t)}]`;
    if (typeof t == "bigint")
      return `[BigInt: ${String(t)}]`;
    const n = ac(t);
    return /^HTML(\w*)Element$/.test(n) ? `[HTMLElement: ${n}]` : `[object ${n}]`;
  } catch (n) {
    return `**non-serializable** (${n})`;
  }
}
function ac(e) {
  const t = Object.getPrototypeOf(e);
  return t ? t.constructor.name : "null prototype";
}
function cc(e) {
  return ~-encodeURI(e).split(/%..|./).length;
}
function uc(e) {
  return cc(JSON.stringify(e));
}
var te;
(function(e) {
  e[e.PENDING = 0] = "PENDING";
  const n = 1;
  e[e.RESOLVED = n] = "RESOLVED";
  const r = 2;
  e[e.REJECTED = r] = "REJECTED";
})(te || (te = {}));
class ae {
  constructor(t) {
    ae.prototype.__init.call(this), ae.prototype.__init2.call(this), ae.prototype.__init3.call(this), ae.prototype.__init4.call(this), this._state = te.PENDING, this._handlers = [];
    try {
      t(this._resolve, this._reject);
    } catch (n) {
      this._reject(n);
    }
  }
  /** JSDoc */
  then(t, n) {
    return new ae((r, o) => {
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
    return new ae((n, r) => {
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
      this._setResult(te.RESOLVED, t);
    };
  }
  /** JSDoc */
  __init2() {
    this._reject = (t) => {
      this._setResult(te.REJECTED, t);
    };
  }
  /** JSDoc */
  __init3() {
    this._setResult = (t, n) => {
      if (this._state === te.PENDING) {
        if (Sn(n)) {
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
      if (this._state === te.PENDING)
        return;
      const t = this._handlers.slice();
      this._handlers = [], t.forEach((n) => {
        n[0] || (this._state === te.RESOLVED && n[1](this._value), this._state === te.REJECTED && n[2](this._value), n[0] = !0);
      });
    };
  }
}
function Ht(e) {
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
const lc = ["fatal", "error", "warning", "log", "info", "debug"];
function dc(e) {
  return e === "warn" ? "warning" : lc.includes(e) ? e : "log";
}
const fo = 1e3;
function Dn() {
  return Date.now() / fo;
}
function fc() {
  const { performance: e } = S;
  if (!e || !e.now)
    return Dn;
  const t = Date.now() - e.now(), n = e.timeOrigin == null ? t : e.timeOrigin;
  return () => (n + e.now()) / fo;
}
const ho = fc();
(() => {
  const { performance: e } = S;
  if (!e || !e.now)
    return;
  const t = 3600 * 1e3, n = e.now(), r = Date.now(), o = e.timeOrigin ? Math.abs(e.timeOrigin + n - r) : t, s = o < t, i = e.timing && e.timing.navigationStart, c = typeof i == "number" ? Math.abs(i + n - r) : t, u = c < t;
  return s || u ? o <= c ? e.timeOrigin : i : r;
})();
const V = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, po = "production";
function hc() {
  return oo("globalEventProcessors", () => []);
}
function un(e, t, n, r = 0) {
  return new ae((o, s) => {
    const i = e[r];
    if (t === null || typeof i != "function")
      o(t);
    else {
      const a = i({ ...t }, n);
      V && i.id && a === null && E.log(`Event processor "${i.id}" dropped event`), Sn(a) ? a.then((c) => un(e, c, n, r + 1).then(o)).then(null, s) : un(e, a, n, r + 1).then(o).then(null, s);
    }
  });
}
function pc(e) {
  const t = ho(), n = {
    sid: X(),
    init: !0,
    timestamp: t,
    started: t,
    duration: 0,
    status: "ok",
    errors: 0,
    ignoreDuration: !1,
    toJSON: () => mc(n)
  };
  return e && Ct(n, e), n;
}
function Ct(e, t = {}) {
  if (t.user && (!e.ipAddress && t.user.ip_address && (e.ipAddress = t.user.ip_address), !e.did && !t.did && (e.did = t.user.id || t.user.email || t.user.username)), e.timestamp = t.timestamp || ho(), t.abnormal_mechanism && (e.abnormal_mechanism = t.abnormal_mechanism), t.ignoreDuration && (e.ignoreDuration = t.ignoreDuration), t.sid && (e.sid = t.sid.length === 32 ? t.sid : X()), t.init !== void 0 && (e.init = t.init), !e.did && t.did && (e.did = `${t.did}`), typeof t.started == "number" && (e.started = t.started), e.ignoreDuration)
    e.duration = void 0;
  else if (typeof t.duration == "number")
    e.duration = t.duration;
  else {
    const n = e.timestamp - e.started;
    e.duration = n >= 0 ? n : 0;
  }
  t.release && (e.release = t.release), t.environment && (e.environment = t.environment), !e.ipAddress && t.ipAddress && (e.ipAddress = t.ipAddress), !e.userAgent && t.userAgent && (e.userAgent = t.userAgent), typeof t.errors == "number" && (e.errors = t.errors), t.status && (e.status = t.status);
}
function gc(e, t) {
  let n = {};
  t ? n = { status: t } : e.status === "ok" && (n = { status: "exited" }), Ct(e, n);
}
function mc(e) {
  return ye({
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
const yc = 1;
function bc(e) {
  const { spanId: t, traceId: n } = e.spanContext(), { data: r, op: o, parent_span_id: s, status: i, tags: a, origin: c } = ht(e);
  return ye({
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
function ht(e) {
  return vc(e) ? e.getSpanJSON() : typeof e.toJSON == "function" ? e.toJSON() : {};
}
function vc(e) {
  return typeof e.getSpanJSON == "function";
}
function _c(e) {
  const { traceFlags: t } = e.spanContext();
  return !!(t & yc);
}
function Ec(e) {
  if (e)
    return xc(e) ? { captureContext: e } : Sc(e) ? {
      captureContext: e
    } : e;
}
function xc(e) {
  return e instanceof _e || typeof e == "function";
}
const wc = [
  "user",
  "level",
  "extra",
  "contexts",
  "tags",
  "fingerprint",
  "requestSession",
  "propagationContext"
];
function Sc(e) {
  return Object.keys(e).some((t) => wc.includes(t));
}
function go(e, t) {
  return Re().captureException(e, Ec(t));
}
function mo(e, t) {
  return Re().captureEvent(e, t);
}
function xe(e, t) {
  Re().addBreadcrumb(e, t);
}
function yo(...e) {
  const t = Re();
  if (e.length === 2) {
    const [n, r] = e;
    return n ? t.withScope(() => (t.getStackTop().scope = n, r(n))) : t.withScope(r);
  }
  return t.withScope(e[0]);
}
function U() {
  return Re().getClient();
}
function Cc() {
  return Re().getScope();
}
function bo(e) {
  return e.transaction;
}
function Oc(e, t, n) {
  const r = t.getOptions(), { publicKey: o } = t.getDsn() || {}, { segment: s } = n && n.getUser() || {}, i = ye({
    environment: r.environment || po,
    release: r.release,
    user_segment: s,
    public_key: o,
    trace_id: e
  });
  return t.emit && t.emit("createDsc", i), i;
}
function Rc(e) {
  const t = U();
  if (!t)
    return {};
  const n = Oc(ht(e).trace_id || "", t, Cc()), r = bo(e);
  if (!r)
    return n;
  const o = r && r._frozenDynamicSamplingContext;
  if (o)
    return o;
  const { sampleRate: s, source: i } = r.metadata;
  s != null && (n.sample_rate = `${s}`);
  const a = ht(r);
  return i && i !== "url" && (n.transaction = a.description), n.sampled = String(_c(r)), t.emit && t.emit("createDsc", n), n;
}
function Tc(e, t) {
  const { fingerprint: n, span: r, breadcrumbs: o, sdkProcessingMetadata: s } = t;
  Dc(e, t), r && Mc(e, r), kc(e, n), Ic(e, o), Nc(e, s);
}
function Dc(e, t) {
  const {
    extra: n,
    tags: r,
    user: o,
    contexts: s,
    level: i,
    // eslint-disable-next-line deprecation/deprecation
    transactionName: a
  } = t, c = ye(n);
  c && Object.keys(c).length && (e.extra = { ...c, ...e.extra });
  const u = ye(r);
  u && Object.keys(u).length && (e.tags = { ...u, ...e.tags });
  const l = ye(o);
  l && Object.keys(l).length && (e.user = { ...l, ...e.user });
  const d = ye(s);
  d && Object.keys(d).length && (e.contexts = { ...d, ...e.contexts }), i && (e.level = i), a && (e.transaction = a);
}
function Ic(e, t) {
  const n = [...e.breadcrumbs || [], ...t];
  e.breadcrumbs = n.length ? n : void 0;
}
function Nc(e, t) {
  e.sdkProcessingMetadata = {
    ...e.sdkProcessingMetadata,
    ...t
  };
}
function Mc(e, t) {
  e.contexts = { trace: bc(t), ...e.contexts };
  const n = bo(t);
  if (n) {
    e.sdkProcessingMetadata = {
      dynamicSamplingContext: Rc(t),
      ...e.sdkProcessingMetadata
    };
    const r = ht(n).description;
    r && (e.tags = { transaction: r, ...e.tags });
  }
}
function kc(e, t) {
  e.fingerprint = e.fingerprint ? Aa(e.fingerprint) : [], t && (e.fingerprint = e.fingerprint.concat(t)), e.fingerprint && !e.fingerprint.length && delete e.fingerprint;
}
const Pc = 100;
class _e {
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
    this._notifyingListeners = !1, this._scopeListeners = [], this._eventProcessors = [], this._breadcrumbs = [], this._attachments = [], this._user = {}, this._tags = {}, this._extra = {}, this._contexts = {}, this._sdkProcessingMetadata = {}, this._propagationContext = nr();
  }
  /**
   * Inherit values from the parent scope.
   * @deprecated Use `scope.clone()` and `new Scope()` instead.
   */
  static clone(t) {
    return t ? t.clone() : new _e();
  }
  /**
   * Clone this scope instance.
   */
  clone() {
    const t = new _e();
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
    }, this._session && Ct(this._session, { user: t }), this._notifyScopeListeners(), this;
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
    if (n instanceof _e) {
      const r = n.getScopeData();
      this._tags = { ...this._tags, ...r.tags }, this._extra = { ...this._extra, ...r.extra }, this._contexts = { ...this._contexts, ...r.contexts }, r.user && Object.keys(r.user).length && (this._user = r.user), r.level && (this._level = r.level), r.fingerprint.length && (this._fingerprint = r.fingerprint), n.getRequestSession() && (this._requestSession = n.getRequestSession()), r.propagationContext && (this._propagationContext = r.propagationContext);
    } else if (xt(n)) {
      const r = t;
      this._tags = { ...this._tags, ...r.tags }, this._extra = { ...this._extra, ...r.extra }, this._contexts = { ...this._contexts, ...r.contexts }, r.user && (this._user = r.user), r.level && (this._level = r.level), r.fingerprint && (this._fingerprint = r.fingerprint), r.requestSession && (this._requestSession = r.requestSession), r.propagationContext && (this._propagationContext = r.propagationContext);
    }
    return this;
  }
  /**
   * @inheritDoc
   */
  clear() {
    return this._breadcrumbs = [], this._tags = {}, this._extra = {}, this._user = {}, this._contexts = {}, this._level = void 0, this._transactionName = void 0, this._fingerprint = void 0, this._requestSession = void 0, this._span = void 0, this._session = void 0, this._notifyScopeListeners(), this._attachments = [], this._propagationContext = nr(), this;
  }
  /**
   * @inheritDoc
   */
  addBreadcrumb(t, n) {
    const r = typeof n == "number" ? n : Pc;
    if (r <= 0)
      return this;
    const o = {
      timestamp: Dn(),
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
    Tc(t, this.getScopeData());
    const o = [
      ...r,
      // eslint-disable-next-line deprecation/deprecation
      ...hc(),
      ...this._eventProcessors
    ];
    return un(o, t, n);
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
    const r = n && n.event_id ? n.event_id : X();
    if (!this._client)
      return E.warn("No client configured on scope - will not capture exception!"), r;
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
    const o = r && r.event_id ? r.event_id : X();
    if (!this._client)
      return E.warn("No client configured on scope - will not capture message!"), o;
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
    const r = n && n.event_id ? n.event_id : X();
    return this._client ? (this._client.captureEvent(t, { ...n, event_id: r }, this), r) : (E.warn("No client configured on scope - will not capture event!"), r);
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
function nr() {
  return {
    traceId: X(),
    spanId: X().substring(16)
  };
}
const Ac = "7.119.2", vo = parseFloat(Ac), $c = 100;
class _o {
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
  constructor(t, n, r, o = vo) {
    this._version = o;
    let s;
    n ? s = n : (s = new _e(), s.setClient(t));
    let i;
    r ? i = r : (i = new _e(), i.setClient(t)), this._stack = [{ scope: s }], t && this.bindClient(t), this._isolationScope = i;
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
    return Sn(r) ? r.then(
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
    const r = this._lastEventId = n && n.event_id ? n.event_id : X(), o = new Error("Sentry syntheticException");
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
    const o = this._lastEventId = r && r.event_id ? r.event_id : X(), s = new Error(t);
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
    const r = n && n.event_id ? n.event_id : X();
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
    const { beforeBreadcrumb: s = null, maxBreadcrumbs: i = $c } = o.getOptions && o.getOptions() || {};
    if (i <= 0)
      return;
    const c = { timestamp: Dn(), ...t }, u = s ? Rn(() => s(c, n)) : c;
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
    const n = rr(this);
    try {
      t(this);
    } finally {
      rr(n);
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
      return V && E.warn(`Cannot retrieve integration ${t.id} from the current Hub`), null;
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
    return V && !r && (this.getClient() ? E.warn(`Tracing extension 'startTransaction' has not been added. Call 'addTracingExtensions' before calling 'init':
Sentry.addTracingExtensions();
Sentry.init({...});
`) : E.warn(
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
    r && gc(r), this._sendSessionUpdate(), n.setSession();
  }
  /**
   * @inheritDoc
   * @deprecated Use top level `startSession` instead.
   */
  startSession(t) {
    const { scope: n, client: r } = this.getStackTop(), { release: o, environment: s = po } = r && r.getOptions() || {}, { userAgent: i } = S.navigator || {}, a = pc({
      release: o,
      environment: s,
      user: n.getUser(),
      ...i && { userAgent: i },
      ...t
    }), c = n.getSession && n.getSession();
    return c && c.status === "ok" && Ct(c, { status: "exited" }), this.endSession(), n.setSession(a), a;
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
    const o = Ot().__SENTRY__;
    if (o && o.extensions && typeof o.extensions[t] == "function")
      return o.extensions[t].apply(this, n);
    V && E.warn(`Extension method ${t} couldn't be found, doing nothing.`);
  }
}
function Ot() {
  return S.__SENTRY__ = S.__SENTRY__ || {
    extensions: {},
    hub: void 0
  }, S;
}
function rr(e) {
  const t = Ot(), n = ln(t);
  return Eo(t, e), n;
}
function Re() {
  const e = Ot();
  if (e.__SENTRY__ && e.__SENTRY__.acs) {
    const t = e.__SENTRY__.acs.getCurrentHub();
    if (t)
      return t;
  }
  return jc(e);
}
function jc(e = Ot()) {
  return (!Fc(e) || // eslint-disable-next-line deprecation/deprecation
  ln(e).isOlderThan(vo)) && Eo(e, new _o()), ln(e);
}
function Fc(e) {
  return !!(e && e.__SENTRY__ && e.__SENTRY__.hub);
}
function ln(e) {
  return oo("hub", () => new _o(), e);
}
function Eo(e, t) {
  if (!e)
    return !1;
  const n = e.__SENTRY__ = e.__SENTRY__ || {};
  return n.hub = t, !0;
}
function Lc(e) {
  const t = e.protocol ? `${e.protocol}:` : "", n = e.port ? `:${e.port}` : "";
  return `${t}//${e.host}${n}${e.path ? `/${e.path}` : ""}/api/`;
}
function Uc(e, t) {
  const n = Ia(e);
  if (!n)
    return "";
  const r = `${Lc(n)}embed/error-page/`;
  let o = `dsn=${Ra(n)}`;
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
function pe(e, t) {
  return Object.assign(
    function(...r) {
      return t(...r);
    },
    { id: e }
  );
}
const qc = [
  /^Script error\.?$/,
  /^Javascript error: Script error\.? on line 0$/,
  /^ResizeObserver loop completed with undelivered notifications.$/,
  /^Cannot redefine property: googletag$/
], Hc = [
  /^.*\/healthcheck$/,
  /^.*\/healthy$/,
  /^.*\/live$/,
  /^.*\/ready$/,
  /^.*\/heartbeat$/,
  /^.*\/health$/,
  /^.*\/healthz$/
], xo = "InboundFilters", Bc = (e = {}) => ({
  name: xo,
  // TODO v8: Remove this
  setupOnce() {
  },
  // eslint-disable-line @typescript-eslint/no-empty-function
  processEvent(t, n, r) {
    const o = r.getOptions(), s = zc(e, o);
    return Gc(t, s) ? null : t;
  }
}), wo = Bc;
pe(
  xo,
  wo
);
function zc(e = {}, t = {}) {
  return {
    allowUrls: [...e.allowUrls || [], ...t.allowUrls || []],
    denyUrls: [...e.denyUrls || [], ...t.denyUrls || []],
    ignoreErrors: [
      ...e.ignoreErrors || [],
      ...t.ignoreErrors || [],
      ...e.disableErrorDefaults ? [] : qc
    ],
    ignoreTransactions: [
      ...e.ignoreTransactions || [],
      ...t.ignoreTransactions || [],
      ...e.disableTransactionDefaults ? [] : Hc
    ],
    ignoreInternal: e.ignoreInternal !== void 0 ? e.ignoreInternal : !0
  };
}
function Gc(e, t) {
  return t.ignoreInternal && Xc(e) ? (V && E.warn(`Event dropped due to being internal Sentry Error.
Event: ${le(e)}`), !0) : Wc(e, t.ignoreErrors) ? (V && E.warn(
    `Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${le(e)}`
  ), !0) : Vc(e, t.ignoreTransactions) ? (V && E.warn(
    `Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${le(e)}`
  ), !0) : Qc(e, t.denyUrls) ? (V && E.warn(
    `Event dropped due to being matched by \`denyUrls\` option.
Event: ${le(
      e
    )}.
Url: ${pt(e)}`
  ), !0) : Kc(e, t.allowUrls) ? !1 : (V && E.warn(
    `Event dropped due to not being matched by \`allowUrls\` option.
Event: ${le(
      e
    )}.
Url: ${pt(e)}`
  ), !0);
}
function Wc(e, t) {
  return e.type || !t || !t.length ? !1 : Yc(e).some((n) => St(n, t));
}
function Vc(e, t) {
  if (e.type !== "transaction" || !t || !t.length)
    return !1;
  const n = e.transaction;
  return n ? St(n, t) : !1;
}
function Qc(e, t) {
  if (!t || !t.length)
    return !1;
  const n = pt(e);
  return n ? St(n, t) : !1;
}
function Kc(e, t) {
  if (!t || !t.length)
    return !0;
  const n = pt(e);
  return n ? St(n, t) : !0;
}
function Yc(e) {
  const t = [];
  e.message && t.push(e.message);
  let n;
  try {
    n = e.exception.values[e.exception.values.length - 1];
  } catch {
  }
  return n && n.value && (t.push(n.value), n.type && t.push(`${n.type}: ${n.value}`)), V && t.length === 0 && E.error(`Could not extract message for event ${le(e)}`), t;
}
function Xc(e) {
  try {
    return e.exception.values[0].type === "SentryError";
  } catch {
  }
  return !1;
}
function Jc(e = []) {
  for (let t = e.length - 1; t >= 0; t--) {
    const n = e[t];
    if (n && n.filename !== "<anonymous>" && n.filename !== "[native code]")
      return n.filename || null;
  }
  return null;
}
function pt(e) {
  try {
    let t;
    try {
      t = e.exception.values[0].stacktrace.frames;
    } catch {
    }
    return t ? Jc(t) : null;
  } catch {
    return V && E.error(`Cannot extract url for event ${le(e)}`), null;
  }
}
let or;
const So = "FunctionToString", sr = /* @__PURE__ */ new WeakMap(), Zc = () => ({
  name: So,
  setupOnce() {
    or = Function.prototype.toString;
    try {
      Function.prototype.toString = function(...e) {
        const t = Tn(this), n = sr.has(U()) && t !== void 0 ? t : this;
        return or.apply(n, e);
      };
    } catch {
    }
  },
  setup(e) {
    sr.set(e, !0);
  }
}), Co = Zc;
pe(
  So,
  Co
);
const M = S;
let dn = 0;
function Oo() {
  return dn > 0;
}
function eu() {
  dn++, setTimeout(() => {
    dn--;
  });
}
function $e(e, t = {}, n) {
  if (typeof e != "function")
    return e;
  try {
    const o = e.__sentry_wrapped__;
    if (o)
      return typeof o == "function" ? o : e;
    if (Tn(e))
      return e;
  } catch {
    return e;
  }
  const r = function() {
    const o = Array.prototype.slice.call(arguments);
    try {
      n && typeof n == "function" && n.apply(this, arguments);
      const s = o.map((i) => $e(i, t));
      return e.apply(this, s);
    } catch (s) {
      throw eu(), yo((i) => {
        i.addEventProcessor((a) => (t.mechanism && (tn(a, void 0, void 0), nn(a, t.mechanism)), a.extra = {
          ...a.extra,
          arguments: o
        }, a)), go(s);
      }), s;
    }
  };
  try {
    for (const o in e)
      Object.prototype.hasOwnProperty.call(e, o) && (r[o] = e[o]);
  } catch {
  }
  ao(r, e), ft(e, "__sentry_wrapped__", r);
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
const ke = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function Ro(e, t) {
  const n = In(e, t), r = {
    type: t && t.name,
    value: ou(t)
  };
  return n.length && (r.stacktrace = { frames: n }), r.type === void 0 && r.value === "" && (r.value = "Unrecoverable error caught"), r;
}
function tu(e, t, n, r) {
  const o = U(), s = o && o.getOptions().normalizeDepth, i = {
    exception: {
      values: [
        {
          type: wt(t) ? t.constructor.name : r ? "UnhandledRejection" : "Error",
          value: su(t, { isUnhandledRejection: r })
        }
      ]
    },
    extra: {
      __serialized__: lo(t, s)
    }
  };
  if (n) {
    const a = In(e, n);
    a.length && (i.exception.values[0].stacktrace = { frames: a });
  }
  return i;
}
function Bt(e, t) {
  return {
    exception: {
      values: [Ro(e, t)]
    }
  };
}
function In(e, t) {
  const n = t.stacktrace || t.stack || "", r = ru(t);
  try {
    return e(n, r);
  } catch {
  }
  return [];
}
const nu = /Minified React error #\d+;/i;
function ru(e) {
  if (e) {
    if (typeof e.framesToPop == "number")
      return e.framesToPop;
    if (nu.test(e.message))
      return 1;
  }
  return 0;
}
function ou(e) {
  const t = e && e.message;
  return t ? t.error && typeof t.error.message == "string" ? t.error.message : t : "No error message";
}
function To(e, t, n, r, o) {
  let s;
  if (wn(t) && t.error)
    return Bt(e, t.error);
  if (Gn(t) || da(t)) {
    const i = t;
    if ("stack" in t)
      s = Bt(e, t);
    else {
      const a = i.name || (Gn(i) ? "DOMError" : "DOMException"), c = i.message ? `${a}: ${i.message}` : a;
      s = ir(e, c, n, r), tn(s, c);
    }
    return "code" in i && (s.tags = { ...s.tags, "DOMException.code": `${i.code}` }), s;
  }
  return xn(t) ? Bt(e, t) : xt(t) || wt(t) ? (s = tu(e, t, n, o), nn(s, {
    synthetic: !0
  }), s) : (s = ir(e, t, n, r), tn(s, `${t}`, void 0), nn(s, {
    synthetic: !0
  }), s);
}
function ir(e, t, n, r) {
  const o = {};
  if (r && n) {
    const s = In(e, n);
    s.length && (o.exception = {
      values: [{ value: t, stacktrace: { frames: s } }]
    });
  }
  if (to(t)) {
    const { __sentry_template_string__: s, __sentry_template_values__: i } = t;
    return o.logentry = {
      message: s,
      params: i
    }, o;
  }
  return o.message = t, o;
}
function su(e, { isUnhandledRejection: t }) {
  const n = Na(e), r = t ? "promise rejection" : "exception";
  return wn(e) ? `Event \`ErrorEvent\` captured as ${r} with message \`${e.message}\`` : wt(e) ? `Event \`${iu(e)}\` (type=${e.type}) captured as ${r}` : `Object captured as ${r} with keys: ${n}`;
}
function iu(e) {
  try {
    const t = Object.getPrototypeOf(e);
    return t ? t.constructor.name : void 0;
  } catch {
  }
}
const ot = 1024, Do = "Breadcrumbs", au = (e = {}) => {
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
    name: Do,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    setup(n) {
      t.console && ka(lu(n)), t.dom && ja(uu(n, t.dom)), t.xhr && tc(du(n)), t.fetch && za(fu(n)), t.history && Ja(hu(n)), t.sentry && n.on && n.on("beforeSendEvent", cu(n));
    }
  };
}, Io = au;
pe(Do, Io);
function cu(e) {
  return function(n) {
    U() === e && xe(
      {
        category: `sentry.${n.type === "transaction" ? "transaction" : "event"}`,
        event_id: n.event_id,
        level: n.level,
        message: le(n)
      },
      {
        event: n
      }
    );
  };
}
function uu(e, t) {
  return function(r) {
    if (U() !== e)
      return;
    let o, s, i = typeof t == "object" ? t.serializeAttribute : void 0, a = typeof t == "object" && typeof t.maxStringLength == "number" ? t.maxStringLength : void 0;
    a && a > ot && (ke && E.warn(
      `\`dom.maxStringLength\` cannot exceed ${ot}, but a value of ${a} was configured. Sentry will use ${ot} instead.`
    ), a = ot), typeof i == "string" && (i = [i]);
    try {
      const u = r.event, l = pu(u) ? u.target : u;
      o = so(l, { keyAttrs: i, maxStringLength: a }), s = xa(l);
    } catch {
      o = "<unknown>";
    }
    if (o.length === 0)
      return;
    const c = {
      category: `ui.${r.name}`,
      message: o
    };
    s && (c.data = { "ui.component_name": s }), xe(c, {
      event: r.event,
      name: r.name,
      global: r.global
    });
  };
}
function lu(e) {
  return function(n) {
    if (U() !== e)
      return;
    const r = {
      category: "console",
      data: {
        arguments: n.args,
        logger: "console"
      },
      level: dc(n.level),
      message: Wn(n.args, " ")
    };
    if (n.level === "assert")
      if (n.args[0] === !1)
        r.message = `Assertion failed: ${Wn(n.args.slice(1), " ") || "console.assert"}`, r.data.arguments = n.args.slice(1);
      else
        return;
    xe(r, {
      input: n.args,
      level: n.level
    });
  };
}
function du(e) {
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
    xe(
      {
        category: "xhr",
        data: l,
        type: "http"
      },
      d
    );
  };
}
function fu(e) {
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
        xe(
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
        xe(
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
function hu(e) {
  return function(n) {
    if (U() !== e)
      return;
    let r = n.from, o = n.to;
    const s = Ht(M.location.href);
    let i = r ? Ht(r) : void 0;
    const a = Ht(o);
    (!i || !i.path) && (i = s), s.protocol === a.protocol && s.host === a.host && (o = a.relative), s.protocol === i.protocol && s.host === i.host && (r = i.relative), xe({
      category: "navigation",
      data: {
        from: r,
        to: o
      }
    });
  };
}
function pu(e) {
  return !!e && !!e.target;
}
const No = "Dedupe", gu = () => {
  let e;
  return {
    name: No,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    processEvent(t) {
      if (t.type)
        return t;
      try {
        if (mu(t, e))
          return ke && E.warn("Event dropped due to being a duplicate of previously captured event."), null;
      } catch {
      }
      return e = t;
    }
  };
}, Mo = gu;
pe(No, Mo);
function mu(e, t) {
  return t ? !!(yu(e, t) || bu(e, t)) : !1;
}
function yu(e, t) {
  const n = e.message, r = t.message;
  return !(!n && !r || n && !r || !n && r || n !== r || !Po(e, t) || !ko(e, t));
}
function bu(e, t) {
  const n = ar(t), r = ar(e);
  return !(!n || !r || n.type !== r.type || n.value !== r.value || !Po(e, t) || !ko(e, t));
}
function ko(e, t) {
  let n = cr(e), r = cr(t);
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
function ar(e) {
  return e.exception && e.exception.values && e.exception.values[0];
}
function cr(e) {
  const t = e.exception;
  if (t)
    try {
      return t.values[0].stacktrace.frames;
    } catch {
      return;
    }
}
const Ao = "GlobalHandlers", vu = (e = {}) => {
  const t = {
    onerror: !0,
    onunhandledrejection: !0,
    ...e
  };
  return {
    name: Ao,
    setupOnce() {
      Error.stackTraceLimit = 50;
    },
    setup(n) {
      t.onerror && (_u(n), ur("onerror")), t.onunhandledrejection && (Eu(n), ur("onunhandledrejection"));
    }
  };
}, $o = vu;
pe(
  Ao,
  $o
);
function _u(e) {
  Va((t) => {
    const { stackParser: n, attachStacktrace: r } = Fo();
    if (U() !== e || Oo())
      return;
    const { msg: o, url: s, line: i, column: a, error: c } = t, u = c === void 0 && re(o) ? Su(o, s, i, a) : jo(
      To(n, c || o, void 0, r, !1),
      s,
      i,
      a
    );
    u.level = "error", mo(u, {
      originalException: c,
      mechanism: {
        handled: !1,
        type: "onerror"
      }
    });
  });
}
function Eu(e) {
  Ka((t) => {
    const { stackParser: n, attachStacktrace: r } = Fo();
    if (U() !== e || Oo())
      return;
    const o = xu(t), s = no(o) ? wu(o) : To(n, o, void 0, r, !0);
    s.level = "error", mo(s, {
      originalException: o,
      mechanism: {
        handled: !1,
        type: "onunhandledrejection"
      }
    });
  });
}
function xu(e) {
  if (no(e))
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
function wu(e) {
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
function Su(e, t, n, r) {
  const o = /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/i;
  let s = wn(e) ? e.message : e, i = "Error";
  const a = s.match(o);
  return a && (i = a[1], s = a[2]), jo({
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
function jo(e, t, n, r) {
  const o = e.exception = e.exception || {}, s = o.values = o.values || [], i = s[0] = s[0] || {}, a = i.stacktrace = i.stacktrace || {}, c = a.frames = a.frames || [], u = isNaN(parseInt(r, 10)) ? void 0 : r, l = isNaN(parseInt(n, 10)) ? void 0 : n, d = re(t) && t.length > 0 ? t : Ea();
  return c.length === 0 && c.push({
    colno: u,
    filename: d,
    function: "?",
    in_app: !0,
    lineno: l
  }), e;
}
function ur(e) {
  ke && E.log(`Global Handler attached: ${e}`);
}
function Fo() {
  const e = U();
  return e && e.getOptions() || {
    stackParser: () => [],
    attachStacktrace: !1
  };
}
const Lo = "HttpContext", Cu = () => ({
  name: Lo,
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
}), Uo = Cu;
pe(Lo, Uo);
const Ou = "cause", Ru = 5, qo = "LinkedErrors", Tu = (e = {}) => {
  const t = e.limit || Ru, n = e.key || Ou;
  return {
    name: qo,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    preprocessEvent(r, o, s) {
      const i = s.getOptions();
      ya(
        // This differs from the LinkedErrors integration in core by using a different exceptionFromError function
        Ro,
        i.stackParser,
        i.maxValueLength,
        n,
        t,
        r,
        o
      );
    }
  };
}, Ho = Tu;
pe(qo, Ho);
const Du = [
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
], Bo = "TryCatch", Iu = (e = {}) => {
  const t = {
    XMLHttpRequest: !0,
    eventTarget: !0,
    requestAnimationFrame: !0,
    setInterval: !0,
    setTimeout: !0,
    ...e
  };
  return {
    name: Bo,
    // TODO: This currently only works for the first client this is setup
    // We may want to adjust this to check for client etc.
    setupOnce() {
      t.setTimeout && A(M, "setTimeout", lr), t.setInterval && A(M, "setInterval", lr), t.requestAnimationFrame && A(M, "requestAnimationFrame", Nu), t.XMLHttpRequest && "XMLHttpRequest" in M && A(XMLHttpRequest.prototype, "send", Mu);
      const n = t.eventTarget;
      n && (Array.isArray(n) ? n : Du).forEach(ku);
    }
  };
}, zo = Iu;
pe(
  Bo,
  zo
);
function lr(e) {
  return function(...t) {
    const n = t[0];
    return t[0] = $e(n, {
      mechanism: {
        data: { function: fe(e) },
        handled: !1,
        type: "instrument"
      }
    }), e.apply(this, t);
  };
}
function Nu(e) {
  return function(t) {
    return e.apply(this, [
      $e(t, {
        mechanism: {
          data: {
            function: "requestAnimationFrame",
            handler: fe(e)
          },
          handled: !1,
          type: "instrument"
        }
      })
    ]);
  };
}
function Mu(e) {
  return function(...t) {
    const n = this;
    return ["onload", "onerror", "onprogress", "onreadystatechange"].forEach((o) => {
      o in n && typeof n[o] == "function" && A(n, o, function(s) {
        const i = {
          mechanism: {
            data: {
              function: o,
              handler: fe(s)
            },
            handled: !1,
            type: "instrument"
          }
        }, a = Tn(s);
        return a && (i.mechanism.data.handler = fe(a)), $e(s, i);
      });
    }), e.apply(this, t);
  };
}
function ku(e) {
  const t = M, n = t[e] && t[e].prototype;
  !n || !n.hasOwnProperty || !n.hasOwnProperty("addEventListener") || (A(n, "addEventListener", function(r) {
    return function(o, s, i) {
      try {
        typeof s.handleEvent == "function" && (s.handleEvent = $e(s.handleEvent, {
          mechanism: {
            data: {
              function: "handleEvent",
              handler: fe(s),
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
        $e(s, {
          mechanism: {
            data: {
              function: "addEventListener",
              handler: fe(s),
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
wo(), Co(), zo(), Io(), $o(), Ho(), Mo(), Uo();
const dr = (e = {}, t = Re()) => {
  if (!M.document) {
    ke && E.error("Global document not defined in showReportDialog call");
    return;
  }
  const { client: n, scope: r } = t.getStackTop(), o = e.dsn || n && n.getDsn();
  if (!o) {
    ke && E.error("DSN not configured for showReportDialog call");
    return;
  }
  r && (e.user = {
    ...r.getUser(),
    ...e.user
  }), e.eventId || (e.eventId = t.lastEventId());
  const s = M.document.createElement("script");
  s.async = !0, s.crossOrigin = "anonymous", s.src = Uc(o, e), e.onLoad && (s.onload = e.onLoad);
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
  a ? a.appendChild(s) : ke && E.error("Not injecting report dialog. No injection point found in HTML");
};
var Go = { exports: {} }, x = {};
/** @license React v16.13.1
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var k = typeof Symbol == "function" && Symbol.for, Nn = k ? Symbol.for("react.element") : 60103, Mn = k ? Symbol.for("react.portal") : 60106, Rt = k ? Symbol.for("react.fragment") : 60107, Tt = k ? Symbol.for("react.strict_mode") : 60108, Dt = k ? Symbol.for("react.profiler") : 60114, It = k ? Symbol.for("react.provider") : 60109, Nt = k ? Symbol.for("react.context") : 60110, kn = k ? Symbol.for("react.async_mode") : 60111, Mt = k ? Symbol.for("react.concurrent_mode") : 60111, kt = k ? Symbol.for("react.forward_ref") : 60112, Pt = k ? Symbol.for("react.suspense") : 60113, Pu = k ? Symbol.for("react.suspense_list") : 60120, At = k ? Symbol.for("react.memo") : 60115, $t = k ? Symbol.for("react.lazy") : 60116, Au = k ? Symbol.for("react.block") : 60121, $u = k ? Symbol.for("react.fundamental") : 60117, ju = k ? Symbol.for("react.responder") : 60118, Fu = k ? Symbol.for("react.scope") : 60119;
function q(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case Nn:
        switch (e = e.type, e) {
          case kn:
          case Mt:
          case Rt:
          case Dt:
          case Tt:
          case Pt:
            return e;
          default:
            switch (e = e && e.$$typeof, e) {
              case Nt:
              case kt:
              case $t:
              case At:
              case It:
                return e;
              default:
                return t;
            }
        }
      case Mn:
        return t;
    }
  }
}
function Wo(e) {
  return q(e) === Mt;
}
x.AsyncMode = kn;
x.ConcurrentMode = Mt;
x.ContextConsumer = Nt;
x.ContextProvider = It;
x.Element = Nn;
x.ForwardRef = kt;
x.Fragment = Rt;
x.Lazy = $t;
x.Memo = At;
x.Portal = Mn;
x.Profiler = Dt;
x.StrictMode = Tt;
x.Suspense = Pt;
x.isAsyncMode = function(e) {
  return Wo(e) || q(e) === kn;
};
x.isConcurrentMode = Wo;
x.isContextConsumer = function(e) {
  return q(e) === Nt;
};
x.isContextProvider = function(e) {
  return q(e) === It;
};
x.isElement = function(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Nn;
};
x.isForwardRef = function(e) {
  return q(e) === kt;
};
x.isFragment = function(e) {
  return q(e) === Rt;
};
x.isLazy = function(e) {
  return q(e) === $t;
};
x.isMemo = function(e) {
  return q(e) === At;
};
x.isPortal = function(e) {
  return q(e) === Mn;
};
x.isProfiler = function(e) {
  return q(e) === Dt;
};
x.isStrictMode = function(e) {
  return q(e) === Tt;
};
x.isSuspense = function(e) {
  return q(e) === Pt;
};
x.isValidElementType = function(e) {
  return typeof e == "string" || typeof e == "function" || e === Rt || e === Mt || e === Dt || e === Tt || e === Pt || e === Pu || typeof e == "object" && e !== null && (e.$$typeof === $t || e.$$typeof === At || e.$$typeof === It || e.$$typeof === Nt || e.$$typeof === kt || e.$$typeof === $u || e.$$typeof === ju || e.$$typeof === Fu || e.$$typeof === Au);
};
x.typeOf = q;
Go.exports = x;
var Lu = Go.exports, Vo = Lu, Uu = {
  $$typeof: !0,
  render: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0
}, qu = {
  $$typeof: !0,
  compare: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0,
  type: !0
}, Qo = {};
Qo[Vo.ForwardRef] = Uu;
Qo[Vo.Memo] = qu;
const Hu = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function Bu(e) {
  const t = e.match(/^([^.]+)/);
  return t !== null && parseInt(t[0]) >= 17;
}
const fr = {
  componentStack: null,
  error: null,
  eventId: null
};
function zu(e, t) {
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
class Pn extends kr {
  constructor(t) {
    super(t), Pn.prototype.__init.call(this), this.state = fr, this._openFallbackReportDialog = !0;
    const n = U();
    n && n.on && t.showDialog && (this._openFallbackReportDialog = !1, n.on("afterSendEvent", (r) => {
      !r.type && r.event_id === this._lastEventId && dr({ ...t.dialogOptions, eventId: this._lastEventId });
    }));
  }
  componentDidCatch(t, { componentStack: n }) {
    const { beforeCapture: r, onError: o, showDialog: s, dialogOptions: i } = this.props;
    yo((a) => {
      if (Bu(Fr) && xn(t)) {
        const u = new Error(t.message);
        u.name = `React ErrorBoundary ${t.name}`, u.stack = n, zu(t, u);
      }
      r && r(a, t, n);
      const c = go(t, {
        captureContext: {
          contexts: { react: { componentStack: n } }
        },
        // If users provide a fallback component we can assume they are handling the error.
        // Therefore, we set the mechanism depending on the presence of the fallback prop.
        mechanism: { handled: !!this.props.fallback }
      });
      o && o(t, n, c), s && (this._lastEventId = c, this._openFallbackReportDialog && dr({ ...i, eventId: c })), this.setState({ error: t, componentStack: n, eventId: c });
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
      t && t(n, r, o), this.setState(fr);
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
      }) : o = t, Ae(o) ? o : (t && Hu && E.warn("fallback did not produce a valid ReactElement"), null);
    }
    return typeof n == "function" ? n() : n;
  }
}
function Gu(e) {
  const t = Object.prototype.toString.call(e);
  return t === "[object Window]" || // In Electron context the Window object serializes to [object global]
  t === "[object global]";
}
function Wu(e) {
  return "nodeType" in e;
}
function Vu(e) {
  var t, n;
  return e ? Gu(e) ? e : Wu(e) && (t = (n = e.ownerDocument) == null ? void 0 : n.defaultView) != null ? t : window : window;
}
var hr;
(function(e) {
  e.DragStart = "dragStart", e.DragMove = "dragMove", e.DragEnd = "dragEnd", e.DragCancel = "dragCancel", e.DragOver = "dragOver", e.RegisterDroppable = "registerDroppable", e.SetDroppableDisabled = "setDroppableDisabled", e.UnregisterDroppable = "unregisterDroppable";
})(hr || (hr = {}));
const Qu = /* @__PURE__ */ Object.freeze({
  x: 0,
  y: 0
});
function Ku(e) {
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
function Yu(e, t, n) {
  const r = Ku(t);
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
const Xu = {
  ignoreTransform: !1
};
function Ko(e, t) {
  t === void 0 && (t = Xu);
  let n = e.getBoundingClientRect();
  if (t.ignoreTransform) {
    const {
      transform: u,
      transformOrigin: l
    } = Vu(e).getComputedStyle(e);
    u && (n = Yu(n, u, l));
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
function pr(e) {
  return Ko(e, {
    ignoreTransform: !0
  });
}
var Ie;
(function(e) {
  e[e.Forward = 1] = "Forward", e[e.Backward = -1] = "Backward";
})(Ie || (Ie = {}));
var gr;
(function(e) {
  e.Click = "click", e.DragStart = "dragstart", e.Keydown = "keydown", e.ContextMenu = "contextmenu", e.Resize = "resize", e.SelectionChange = "selectionchange", e.VisibilityChange = "visibilitychange";
})(gr || (gr = {}));
var Q;
(function(e) {
  e.Space = "Space", e.Down = "ArrowDown", e.Right = "ArrowRight", e.Left = "ArrowLeft", e.Up = "ArrowUp", e.Esc = "Escape", e.Enter = "Enter";
})(Q || (Q = {}));
Q.Space, Q.Enter, Q.Esc, Q.Space, Q.Enter;
var mr;
(function(e) {
  e[e.RightClick = 2] = "RightClick";
})(mr || (mr = {}));
var yr;
(function(e) {
  e[e.Pointer = 0] = "Pointer", e[e.DraggableRect = 1] = "DraggableRect";
})(yr || (yr = {}));
var br;
(function(e) {
  e[e.TreeOrder = 0] = "TreeOrder", e[e.ReversedTreeOrder = 1] = "ReversedTreeOrder";
})(br || (br = {}));
Ie.Backward + "", Ie.Forward + "", Ie.Backward + "", Ie.Forward + "";
var fn;
(function(e) {
  e[e.Always = 0] = "Always", e[e.BeforeDragging = 1] = "BeforeDragging", e[e.WhileDragging = 2] = "WhileDragging";
})(fn || (fn = {}));
var hn;
(function(e) {
  e.Optimized = "optimized";
})(hn || (hn = {}));
fn.WhileDragging, hn.Optimized;
({
  ...Qu
});
var vr;
(function(e) {
  e[e.Uninitialized = 0] = "Uninitialized", e[e.Initializing = 1] = "Initializing", e[e.Initialized = 2] = "Initialized";
})(vr || (vr = {}));
Q.Down, Q.Right, Q.Up, Q.Left;
function Yo(e) {
  var t, n, r = "";
  if (typeof e == "string" || typeof e == "number")
    r += e;
  else if (typeof e == "object")
    if (Array.isArray(e))
      for (t = 0; t < e.length; t++)
        e[t] && (n = Yo(e[t])) && (r && (r += " "), r += n);
    else
      for (t in e)
        e[t] && (r && (r += " "), r += t);
  return r;
}
function Ju() {
  for (var e, t, n = 0, r = ""; n < arguments.length; )
    (e = arguments[n++]) && (t = Yo(e)) && (r && (r += " "), r += t);
  return r;
}
const _r = (e) => typeof e == "boolean" ? "".concat(e) : e === 0 ? "0" : e, Er = Ju, Xo = (e, t) => (n) => {
  var r;
  if ((t == null ? void 0 : t.variants) == null)
    return Er(e, n == null ? void 0 : n.class, n == null ? void 0 : n.className);
  const { variants: o, defaultVariants: s } = t, i = Object.keys(o).map((u) => {
    const l = n == null ? void 0 : n[u], d = s == null ? void 0 : s[u];
    if (l === null)
      return null;
    const f = _r(l) || _r(d);
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
  return Er(e, i, c, n == null ? void 0 : n.class, n == null ? void 0 : n.className);
}, An = "-", Zu = (e) => {
  const t = tl(e), {
    conflictingClassGroups: n,
    conflictingClassGroupModifiers: r
  } = e;
  return {
    getClassGroupId: (i) => {
      const a = i.split(An);
      return a[0] === "" && a.length !== 1 && a.shift(), Jo(a, t) || el(i);
    },
    getConflictingClassGroupIds: (i, a) => {
      const c = n[i] || [];
      return a && r[i] ? [...c, ...r[i]] : c;
    }
  };
}, Jo = (e, t) => {
  var i;
  if (e.length === 0)
    return t.classGroupId;
  const n = e[0], r = t.nextPart.get(n), o = r ? Jo(e.slice(1), r) : void 0;
  if (o)
    return o;
  if (t.validators.length === 0)
    return;
  const s = e.join(An);
  return (i = t.validators.find(({
    validator: a
  }) => a(s))) == null ? void 0 : i.classGroupId;
}, xr = /^\[(.+)\]$/, el = (e) => {
  if (xr.test(e)) {
    const t = xr.exec(e)[1], n = t == null ? void 0 : t.substring(0, t.indexOf(":"));
    if (n)
      return "arbitrary.." + n;
  }
}, tl = (e) => {
  const {
    theme: t,
    prefix: n
  } = e, r = {
    nextPart: /* @__PURE__ */ new Map(),
    validators: []
  };
  return rl(Object.entries(e.classGroups), n).forEach(([s, i]) => {
    pn(i, r, s, t);
  }), r;
}, pn = (e, t, n, r) => {
  e.forEach((o) => {
    if (typeof o == "string") {
      const s = o === "" ? t : wr(t, o);
      s.classGroupId = n;
      return;
    }
    if (typeof o == "function") {
      if (nl(o)) {
        pn(o(r), t, n, r);
        return;
      }
      t.validators.push({
        validator: o,
        classGroupId: n
      });
      return;
    }
    Object.entries(o).forEach(([s, i]) => {
      pn(i, wr(t, s), n, r);
    });
  });
}, wr = (e, t) => {
  let n = e;
  return t.split(An).forEach((r) => {
    n.nextPart.has(r) || n.nextPart.set(r, {
      nextPart: /* @__PURE__ */ new Map(),
      validators: []
    }), n = n.nextPart.get(r);
  }), n;
}, nl = (e) => e.isThemeGetter, rl = (e, t) => t ? e.map(([n, r]) => {
  const o = r.map((s) => typeof s == "string" ? t + s : typeof s == "object" ? Object.fromEntries(Object.entries(s).map(([i, a]) => [t + i, a])) : s);
  return [n, o];
}) : e, ol = (e) => {
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
}, Zo = "!", sl = (e) => {
  const {
    separator: t,
    experimentalParseClassName: n
  } = e, r = t.length === 1, o = t[0], s = t.length, i = (a) => {
    const c = [];
    let u = 0, l = 0, d;
    for (let p = 0; p < a.length; p++) {
      let v = a[p];
      if (u === 0) {
        if (v === o && (r || a.slice(p, p + s) === t)) {
          c.push(a.slice(l, p)), l = p + s;
          continue;
        }
        if (v === "/") {
          d = p;
          continue;
        }
      }
      v === "[" ? u++ : v === "]" && u--;
    }
    const f = c.length === 0 ? a : a.substring(l), h = f.startsWith(Zo), g = h ? f.substring(1) : f, m = d && d > l ? d - l : void 0;
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
}, il = (e) => {
  if (e.length <= 1)
    return e;
  const t = [];
  let n = [];
  return e.forEach((r) => {
    r[0] === "[" ? (t.push(...n.sort(), r), n = []) : n.push(r);
  }), t.push(...n.sort()), t;
}, al = (e) => ({
  cache: ol(e.cacheSize),
  parseClassName: sl(e),
  ...Zu(e)
}), cl = /\s+/, ul = (e, t) => {
  const {
    parseClassName: n,
    getClassGroupId: r,
    getConflictingClassGroupIds: o
  } = t, s = [], i = e.trim().split(cl);
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
    const p = il(l).join(":"), v = d ? p + Zo : p, O = v + m;
    if (s.includes(O))
      continue;
    s.push(O);
    const P = o(m, g);
    for (let D = 0; D < P.length; ++D) {
      const H = P[D];
      s.push(v + H);
    }
    a = u + (a.length > 0 ? " " + a : a);
  }
  return a;
};
function ll() {
  let e = 0, t, n, r = "";
  for (; e < arguments.length; )
    (t = arguments[e++]) && (n = es(t)) && (r && (r += " "), r += n);
  return r;
}
const es = (e) => {
  if (typeof e == "string")
    return e;
  let t, n = "";
  for (let r = 0; r < e.length; r++)
    e[r] && (t = es(e[r])) && (n && (n += " "), n += t);
  return n;
};
function dl(e, ...t) {
  let n, r, o, s = i;
  function i(c) {
    const u = t.reduce((l, d) => d(l), e());
    return n = al(u), r = n.cache.get, o = n.cache.set, s = a, a(c);
  }
  function a(c) {
    const u = r(c);
    if (u)
      return u;
    const l = ul(c, n);
    return o(c, l), l;
  }
  return function() {
    return s(ll.apply(null, arguments));
  };
}
const T = (e) => {
  const t = (n) => n[e] || [];
  return t.isThemeGetter = !0, t;
}, ts = /^\[(?:([a-z-]+):)?(.+)\]$/i, fl = /^\d+\/\d+$/, hl = /* @__PURE__ */ new Set(["px", "full", "screen"]), pl = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, gl = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, ml = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/, yl = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, bl = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, ee = (e) => Pe(e) || hl.has(e) || fl.test(e), se = (e) => Ue(e, "length", Ol), Pe = (e) => !!e && !Number.isNaN(Number(e)), zt = (e) => Ue(e, "number", Pe), Be = (e) => !!e && Number.isInteger(Number(e)), vl = (e) => e.endsWith("%") && Pe(e.slice(0, -1)), y = (e) => ts.test(e), ie = (e) => pl.test(e), _l = /* @__PURE__ */ new Set(["length", "size", "percentage"]), El = (e) => Ue(e, _l, ns), xl = (e) => Ue(e, "position", ns), wl = /* @__PURE__ */ new Set(["image", "url"]), Sl = (e) => Ue(e, wl, Tl), Cl = (e) => Ue(e, "", Rl), ze = () => !0, Ue = (e, t, n) => {
  const r = ts.exec(e);
  return r ? r[1] ? typeof t == "string" ? r[1] === t : t.has(r[1]) : n(r[2]) : !1;
}, Ol = (e) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  gl.test(e) && !ml.test(e)
), ns = () => !1, Rl = (e) => yl.test(e), Tl = (e) => bl.test(e), Dl = () => {
  const e = T("colors"), t = T("spacing"), n = T("blur"), r = T("brightness"), o = T("borderColor"), s = T("borderRadius"), i = T("borderSpacing"), a = T("borderWidth"), c = T("contrast"), u = T("grayscale"), l = T("hueRotate"), d = T("invert"), f = T("gap"), h = T("gradientColorStops"), g = T("gradientColorStopPositions"), m = T("inset"), p = T("margin"), v = T("opacity"), O = T("padding"), P = T("saturate"), D = T("scale"), H = T("sepia"), w = T("skew"), _ = T("space"), C = T("translate"), L = () => ["auto", "contain", "none"], ge = () => ["auto", "hidden", "clip", "visible", "scroll"], me = () => ["auto", y, t], R = () => [y, t], Ke = () => ["", ee, se], Ye = () => ["auto", Pe, y], Un = () => ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"], Xe = () => ["solid", "dashed", "dotted", "double", "none"], qn = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], Lt = () => ["start", "end", "center", "between", "around", "evenly", "stretch"], qe = () => ["", "0", y], Hn = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], J = () => [Pe, y];
  return {
    cacheSize: 500,
    separator: ":",
    theme: {
      colors: [ze],
      spacing: [ee, se],
      blur: ["none", "", ie, y],
      brightness: J(),
      borderColor: [e],
      borderRadius: ["none", "", "full", ie, y],
      borderSpacing: R(),
      borderWidth: Ke(),
      contrast: J(),
      grayscale: qe(),
      hueRotate: J(),
      invert: qe(),
      gap: R(),
      gradientColorStops: [e],
      gradientColorStopPositions: [vl, se],
      inset: me(),
      margin: me(),
      opacity: J(),
      padding: R(),
      saturate: J(),
      scale: J(),
      sepia: qe(),
      skew: J(),
      space: R(),
      translate: R()
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
        columns: [ie]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": Hn()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": Hn()
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
        object: [...Un(), y]
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: ge()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": ge()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": ge()
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
        z: ["auto", Be, y]
      }],
      // Flexbox and Grid
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: me()
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
        grow: qe()
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: qe()
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: ["first", "last", "none", Be, y]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": [ze]
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: ["auto", {
          span: ["full", Be, y]
        }, y]
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": Ye()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": Ye()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": [ze]
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: ["auto", {
          span: [Be, y]
        }, y]
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": Ye()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": Ye()
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
        justify: ["normal", ...Lt()]
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
        content: ["normal", ...Lt(), "baseline"]
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
        "place-content": [...Lt(), "baseline"]
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
        p: [O]
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: [O]
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: [O]
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: [O]
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: [O]
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: [O]
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: [O]
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: [O]
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: [O]
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
        "space-x": [_]
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
        "space-y": [_]
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
          screen: [ie]
        }, ie]
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
        text: ["base", ie, se]
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
        font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black", zt]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [ze]
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
        "line-clamp": ["none", Pe, zt]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: ["none", "tight", "snug", "normal", "relaxed", "loose", ee, y]
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
        "placeholder-opacity": [v]
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
        "text-opacity": [v]
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
        decoration: [...Xe(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: ["auto", "from-font", ee, se]
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": ["auto", ee, y]
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
        indent: R()
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
        "bg-opacity": [v]
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
        bg: [...Un(), xl]
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
        bg: ["auto", "cover", "contain", El]
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
        }, Sl]
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
        "border-opacity": [v]
      }],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...Xe(), "hidden"]
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
        "divide-opacity": [v]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/divide-style
       */
      "divide-style": [{
        divide: Xe()
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
        outline: ["", ...Xe()]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [ee, y]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: [ee, se]
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
        ring: Ke()
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
        "ring-opacity": [v]
      }],
      /**
       * Ring Offset Width
       * @see https://tailwindcss.com/docs/ring-offset-width
       */
      "ring-offset-w": [{
        "ring-offset": [ee, se]
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
        shadow: ["", "inner", "none", ie, Cl]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow-color
       */
      "shadow-color": [{
        shadow: [ze]
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [v]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...qn(), "plus-lighter", "plus-darker"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": qn()
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
        "drop-shadow": ["", "none", ie, y]
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
        saturate: [P]
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
        "backdrop-opacity": [v]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [P]
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
        duration: J()
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
        delay: J()
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
        scale: [D]
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": [D]
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": [D]
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: [Be, y]
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": [C]
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": [C]
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
        "scroll-m": R()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": R()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": R()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": R()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": R()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": R()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": R()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": R()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": R()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": R()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": R()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": R()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": R()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": R()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": R()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": R()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": R()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": R()
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
        stroke: [ee, se, zt]
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
}, Il = /* @__PURE__ */ dl(Dl);
function Te(...e) {
  return Il(qr(e));
}
const Nl = Xo(
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
), rs = G(
  ({ className: e, size: t = 1, asChild: n = !1, ...r }, o) => {
    const s = n ? bt : `h${t}`;
    return /* @__PURE__ */ b.jsx(
      s,
      {
        ref: o,
        className: Te(Nl({ size: t, className: e })),
        ...r
      }
    );
  }
);
rs.displayName = "Heading";
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ml = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), os = (...e) => e.filter((t, n, r) => !!t && t.trim() !== "" && r.indexOf(t) === n).join(" ").trim();
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var kl = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Pl = G(
  ({
    color: e = "currentColor",
    size: t = 24,
    strokeWidth: n = 2,
    absoluteStrokeWidth: r,
    className: o = "",
    children: s,
    iconNode: i,
    ...a
  }, c) => I(
    "svg",
    {
      ref: c,
      ...kl,
      width: t,
      height: t,
      stroke: e,
      strokeWidth: r ? Number(n) * 24 / Number(t) : n,
      className: os("lucide", o),
      ...a
    },
    [
      ...i.map(([u, l]) => I(u, l)),
      ...Array.isArray(s) ? s : [s]
    ]
  )
);
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Al = (e, t) => {
  const n = G(
    ({ className: r, ...o }, s) => I(Pl, {
      ref: s,
      iconNode: t,
      className: os(`lucide-${Ml(e)}`, r),
      ...o
    })
  );
  return n.displayName = `${e}`, n;
};
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const $l = Al("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]), ss = G(({ ...e }, t) => /* @__PURE__ */ b.jsx("nav", { ref: t, "aria-label": "breadcrumb", ...e }));
ss.displayName = "Breadcrumb";
const is = G(({ className: e, ...t }, n) => /* @__PURE__ */ b.jsx(
  "ol",
  {
    ref: n,
    className: Te(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      e
    ),
    ...t
  }
));
is.displayName = "BreadcrumbList";
const as = G(({ className: e, ...t }, n) => /* @__PURE__ */ b.jsx(
  "li",
  {
    ref: n,
    className: Te("inline-flex items-center gap-1.5", e),
    ...t
  }
));
as.displayName = "BreadcrumbItem";
const cs = G(({ asChild: e, className: t, ...n }, r) => {
  const o = e ? bt : "a";
  return /* @__PURE__ */ b.jsx(
    o,
    {
      ref: r,
      className: Te("transition-colors hover:text-foreground", t),
      ...n
    }
  );
});
cs.displayName = "BreadcrumbLink";
const us = G(({ className: e, ...t }, n) => /* @__PURE__ */ b.jsx(
  "span",
  {
    ref: n,
    "aria-current": "page",
    "aria-disabled": "true",
    className: Te("font-normal text-foreground", e),
    role: "link",
    ...t
  }
));
us.displayName = "BreadcrumbPage";
const ls = ({
  children: e,
  className: t,
  ...n
}) => /* @__PURE__ */ b.jsx(
  "li",
  {
    "aria-hidden": "true",
    className: Te("[&>svg]:w-3.5 [&>svg]:h-3.5", t),
    role: "presentation",
    ...n,
    children: e ?? /* @__PURE__ */ b.jsx($l, {})
  }
);
ls.displayName = "BreadcrumbSeparator";
const jl = Xo(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
), ds = G(
  ({ className: e, variant: t, size: n, asChild: r = !1, ...o }, s) => {
    const i = r ? bt : "button";
    return /* @__PURE__ */ b.jsx(
      i,
      {
        ref: s,
        className: Te(jl({ variant: t, size: n, className: e })),
        ...o
      }
    );
  }
);
ds.displayName = "Button";
const Fl = ({ darkMode: e, fetchKoenigLexical: t, className: n, children: r, ...o }) => {
  const s = qr(
    "admin-x-base",
    e && "dark",
    n
  );
  return /* @__PURE__ */ b.jsx("div", { className: s, ...o, children: /* @__PURE__ */ b.jsx(la, { darkMode: e, fetchKoenigLexical: t, children: r }) });
};
class jt {
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
const $n = typeof window > "u" || "Deno" in window;
function W() {
}
function Ll(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function Ul(e) {
  return typeof e == "number" && e >= 0 && e !== 1 / 0;
}
function ql(e, t) {
  return Math.max(e + (t || 0) - Date.now(), 0);
}
function st(e, t, n) {
  return Ft(e) ? typeof t == "function" ? {
    ...n,
    queryKey: e,
    queryFn: t
  } : {
    ...t,
    queryKey: e
  } : e;
}
function ce(e, t, n) {
  return Ft(e) ? [{
    ...t,
    queryKey: e
  }, n] : [e || {}, t];
}
function Sr(e, t) {
  const {
    type: n = "all",
    exact: r,
    fetchStatus: o,
    predicate: s,
    queryKey: i,
    stale: a
  } = e;
  if (Ft(i)) {
    if (r) {
      if (t.queryHash !== jn(i, t.options))
        return !1;
    } else if (!gt(t.queryKey, i))
      return !1;
  }
  if (n !== "all") {
    const c = t.isActive();
    if (n === "active" && !c || n === "inactive" && c)
      return !1;
  }
  return !(typeof a == "boolean" && t.isStale() !== a || typeof o < "u" && o !== t.state.fetchStatus || s && !s(t));
}
function Cr(e, t) {
  const {
    exact: n,
    fetching: r,
    predicate: o,
    mutationKey: s
  } = e;
  if (Ft(s)) {
    if (!t.options.mutationKey)
      return !1;
    if (n) {
      if (be(t.options.mutationKey) !== be(s))
        return !1;
    } else if (!gt(t.options.mutationKey, s))
      return !1;
  }
  return !(typeof r == "boolean" && t.state.status === "loading" !== r || o && !o(t));
}
function jn(e, t) {
  return ((t == null ? void 0 : t.queryKeyHashFn) || be)(e);
}
function be(e) {
  return JSON.stringify(e, (t, n) => gn(n) ? Object.keys(n).sort().reduce((r, o) => (r[o] = n[o], r), {}) : n);
}
function gt(e, t) {
  return fs(e, t);
}
function fs(e, t) {
  return e === t ? !0 : typeof e != typeof t ? !1 : e && t && typeof e == "object" && typeof t == "object" ? !Object.keys(t).some((n) => !fs(e[n], t[n])) : !1;
}
function hs(e, t) {
  if (e === t)
    return e;
  const n = Or(e) && Or(t);
  if (n || gn(e) && gn(t)) {
    const r = n ? e.length : Object.keys(e).length, o = n ? t : Object.keys(t), s = o.length, i = n ? [] : {};
    let a = 0;
    for (let c = 0; c < s; c++) {
      const u = n ? c : o[c];
      i[u] = hs(e[u], t[u]), i[u] === e[u] && a++;
    }
    return r === s && a === r ? e : i;
  }
  return t;
}
function Or(e) {
  return Array.isArray(e) && e.length === Object.keys(e).length;
}
function gn(e) {
  if (!Rr(e))
    return !1;
  const t = e.constructor;
  if (typeof t > "u")
    return !0;
  const n = t.prototype;
  return !(!Rr(n) || !n.hasOwnProperty("isPrototypeOf"));
}
function Rr(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function Ft(e) {
  return Array.isArray(e);
}
function ps(e) {
  return new Promise((t) => {
    setTimeout(t, e);
  });
}
function Tr(e) {
  ps(0).then(e);
}
function Hl() {
  if (typeof AbortController == "function")
    return new AbortController();
}
function Bl(e, t, n) {
  return n.isDataEqual != null && n.isDataEqual(e, t) ? e : typeof n.structuralSharing == "function" ? n.structuralSharing(e, t) : n.structuralSharing !== !1 ? hs(e, t) : t;
}
class zl extends jt {
  constructor() {
    super(), this.setup = (t) => {
      if (!$n && window.addEventListener) {
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
const mn = new zl(), Dr = ["online", "offline"];
class Gl extends jt {
  constructor() {
    super(), this.setup = (t) => {
      if (!$n && window.addEventListener) {
        const n = () => t();
        return Dr.forEach((r) => {
          window.addEventListener(r, n, !1);
        }), () => {
          Dr.forEach((r) => {
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
const mt = new Gl();
function Wl(e) {
  return Math.min(1e3 * 2 ** e, 3e4);
}
function Fn(e) {
  return (e ?? "online") === "online" ? mt.isOnline() : !0;
}
class gs {
  constructor(t) {
    this.revert = t == null ? void 0 : t.revert, this.silent = t == null ? void 0 : t.silent;
  }
}
function Gt(e) {
  return e instanceof gs;
}
function ms(e) {
  let t = !1, n = 0, r = !1, o, s, i;
  const a = new Promise((p, v) => {
    s = p, i = v;
  }), c = (p) => {
    r || (h(new gs(p)), e.abort == null || e.abort());
  }, u = () => {
    t = !0;
  }, l = () => {
    t = !1;
  }, d = () => !mn.isFocused() || e.networkMode !== "always" && !mt.isOnline(), f = (p) => {
    r || (r = !0, e.onSuccess == null || e.onSuccess(p), o == null || o(), s(p));
  }, h = (p) => {
    r || (r = !0, e.onError == null || e.onError(p), o == null || o(), i(p));
  }, g = () => new Promise((p) => {
    o = (v) => {
      const O = r || !d();
      return O && p(v), O;
    }, e.onPause == null || e.onPause();
  }).then(() => {
    o = void 0, r || e.onContinue == null || e.onContinue();
  }), m = () => {
    if (r)
      return;
    let p;
    try {
      p = e.fn();
    } catch (v) {
      p = Promise.reject(v);
    }
    Promise.resolve(p).then(f).catch((v) => {
      var O, P;
      if (r)
        return;
      const D = (O = e.retry) != null ? O : 3, H = (P = e.retryDelay) != null ? P : Wl, w = typeof H == "function" ? H(n, v) : H, _ = D === !0 || typeof D == "number" && n < D || typeof D == "function" && D(n, v);
      if (t || !_) {
        h(v);
        return;
      }
      n++, e.onFail == null || e.onFail(n, v), ps(w).then(() => {
        if (d())
          return g();
      }).then(() => {
        t ? h(v) : m();
      });
    });
  };
  return Fn(e.networkMode) ? m() : g().then(m), {
    promise: a,
    cancel: c,
    continue: () => (o == null ? void 0 : o()) ? a : Promise.resolve(),
    cancelRetry: u,
    continueRetry: l
  };
}
const Ln = console;
function Vl() {
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
    t ? e.push(l) : Tr(() => {
      n(l);
    });
  }, i = (l) => (...d) => {
    s(() => {
      l(...d);
    });
  }, a = () => {
    const l = e;
    e = [], l.length && Tr(() => {
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
const j = Vl();
class ys {
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), Ul(this.cacheTime) && (this.gcTimeout = setTimeout(() => {
      this.optionalRemove();
    }, this.cacheTime));
  }
  updateCacheTime(t) {
    this.cacheTime = Math.max(this.cacheTime || 0, t ?? ($n ? 1 / 0 : 5 * 60 * 1e3));
  }
  clearGcTimeout() {
    this.gcTimeout && (clearTimeout(this.gcTimeout), this.gcTimeout = void 0);
  }
}
class Ql extends ys {
  constructor(t) {
    super(), this.abortSignalConsumed = !1, this.defaultOptions = t.defaultOptions, this.setOptions(t.options), this.observers = [], this.cache = t.cache, this.logger = t.logger || Ln, this.queryKey = t.queryKey, this.queryHash = t.queryHash, this.initialState = t.state || Kl(this.options), this.state = this.initialState, this.scheduleGc();
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
    const r = Bl(this.state.data, t, this.options);
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
    return (n = this.retryer) == null || n.cancel(t), r ? r.then(W).catch(W) : Promise.resolve();
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
    return this.state.isInvalidated || !this.state.dataUpdatedAt || !ql(this.state.dataUpdatedAt, t);
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
    const i = Hl(), a = {
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
        var g, m, p, v;
        (g = (m = this.cache.config).onError) == null || g.call(m, h, this), (p = (v = this.cache.config).onSettled) == null || p.call(v, this.state.data, h, this);
      }
      this.isFetchingOptimistic || this.scheduleGc(), this.isFetchingOptimistic = !1;
    };
    return this.retryer = ms({
      fn: l.fetchFn,
      abort: i == null ? void 0 : i.abort.bind(i),
      onSuccess: (h) => {
        var g, m, p, v;
        if (typeof h > "u") {
          f(new Error(this.queryHash + " data is undefined"));
          return;
        }
        this.setData(h), (g = (m = this.cache.config).onSuccess) == null || g.call(m, h, this), (p = (v = this.cache.config).onSettled) == null || p.call(v, h, this.state.error, this), this.isFetchingOptimistic || this.scheduleGc(), this.isFetchingOptimistic = !1;
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
            fetchStatus: Fn(this.options.networkMode) ? "fetching" : "paused",
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
    this.state = n(this.state), j.batch(() => {
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
function Kl(e) {
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
class Yl extends jt {
  constructor(t) {
    super(), this.config = t || {}, this.queries = [], this.queriesMap = {};
  }
  build(t, n, r) {
    var o;
    const s = n.queryKey, i = (o = n.queryHash) != null ? o : jn(s, n);
    let a = this.get(i);
    return a || (a = new Ql({
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
    j.batch(() => {
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
    const [r] = ce(t, n);
    return typeof r.exact > "u" && (r.exact = !0), this.queries.find((o) => Sr(r, o));
  }
  findAll(t, n) {
    const [r] = ce(t, n);
    return Object.keys(r).length > 0 ? this.queries.filter((o) => Sr(r, o)) : this.queries;
  }
  notify(t) {
    j.batch(() => {
      this.listeners.forEach(({
        listener: n
      }) => {
        n(t);
      });
    });
  }
  onFocus() {
    j.batch(() => {
      this.queries.forEach((t) => {
        t.onFocus();
      });
    });
  }
  onOnline() {
    j.batch(() => {
      this.queries.forEach((t) => {
        t.onOnline();
      });
    });
  }
}
class Xl extends ys {
  constructor(t) {
    super(), this.defaultOptions = t.defaultOptions, this.mutationId = t.mutationId, this.mutationCache = t.mutationCache, this.logger = t.logger || Ln, this.observers = [], this.state = t.state || Jl(), this.setOptions(t.options), this.scheduleGc();
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
      var _;
      return this.retryer = ms({
        fn: () => this.options.mutationFn ? this.options.mutationFn(this.state.variables) : Promise.reject("No mutationFn found"),
        onFail: (C, L) => {
          this.dispatch({
            type: "failed",
            failureCount: C,
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
        retry: (_ = this.options.retry) != null ? _ : 0,
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
        const C = await ((h = (g = this.options).onMutate) == null ? void 0 : h.call(g, this.state.variables));
        C !== this.state.context && this.dispatch({
          type: "loading",
          context: C,
          variables: this.state.variables
        });
      }
      const _ = await t();
      return await ((r = (o = this.mutationCache.config).onSuccess) == null ? void 0 : r.call(o, _, this.state.variables, this.state.context, this)), await ((s = (i = this.options).onSuccess) == null ? void 0 : s.call(i, _, this.state.variables, this.state.context)), await ((a = (c = this.mutationCache.config).onSettled) == null ? void 0 : a.call(c, _, null, this.state.variables, this.state.context, this)), await ((u = (l = this.options).onSettled) == null ? void 0 : u.call(l, _, null, this.state.variables, this.state.context)), this.dispatch({
        type: "success",
        data: _
      }), _;
    } catch (_) {
      try {
        var m, p, v, O, P, D, H, w;
        throw await ((m = (p = this.mutationCache.config).onError) == null ? void 0 : m.call(p, _, this.state.variables, this.state.context, this)), await ((v = (O = this.options).onError) == null ? void 0 : v.call(O, _, this.state.variables, this.state.context)), await ((P = (D = this.mutationCache.config).onSettled) == null ? void 0 : P.call(D, void 0, _, this.state.variables, this.state.context, this)), await ((H = (w = this.options).onSettled) == null ? void 0 : H.call(w, void 0, _, this.state.variables, this.state.context)), _;
      } finally {
        this.dispatch({
          type: "error",
          error: _
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
            isPaused: !Fn(this.options.networkMode),
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
    this.state = n(this.state), j.batch(() => {
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
function Jl() {
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
class Zl extends jt {
  constructor(t) {
    super(), this.config = t || {}, this.mutations = [], this.mutationId = 0;
  }
  build(t, n, r) {
    const o = new Xl({
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
    j.batch(() => {
      this.mutations.forEach((t) => {
        this.remove(t);
      });
    });
  }
  getAll() {
    return this.mutations;
  }
  find(t) {
    return typeof t.exact > "u" && (t.exact = !0), this.mutations.find((n) => Cr(t, n));
  }
  findAll(t) {
    return this.mutations.filter((n) => Cr(t, n));
  }
  notify(t) {
    j.batch(() => {
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
      return j.batch(() => n.reduce((r, o) => r.then(() => o.continue().catch(W)), Promise.resolve()));
    }).then(() => {
      this.resuming = void 0;
    }), this.resuming;
  }
}
function ed() {
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
              var _;
              if ((_ = e.signal) != null && _.aborted)
                m = !0;
              else {
                var C;
                (C = e.signal) == null || C.addEventListener("abort", () => {
                  m = !0;
                });
              }
              return e.signal;
            }
          });
        }, v = e.options.queryFn || (() => Promise.reject("Missing queryFn for queryKey '" + e.options.queryHash + "'")), O = (w, _, C, L) => (g = L ? [_, ...g] : [...g, _], L ? [C, ...w] : [...w, C]), P = (w, _, C, L) => {
          if (m)
            return Promise.reject("Cancelled");
          if (typeof C > "u" && !_ && w.length)
            return Promise.resolve(w);
          const ge = {
            queryKey: e.queryKey,
            pageParam: C,
            meta: e.options.meta
          };
          p(ge);
          const me = v(ge);
          return Promise.resolve(me).then((Ke) => O(w, C, Ke, L));
        };
        let D;
        if (!f.length)
          D = P([]);
        else if (l) {
          const w = typeof u < "u", _ = w ? u : Ir(e.options, f);
          D = P(f, w, _);
        } else if (d) {
          const w = typeof u < "u", _ = w ? u : td(e.options, f);
          D = P(f, w, _, !0);
        } else {
          g = [];
          const w = typeof e.options.getNextPageParam > "u";
          D = (a && f[0] ? a(f[0], 0, f) : !0) ? P([], w, h[0]) : Promise.resolve(O([], h[0], f[0]));
          for (let C = 1; C < f.length; C++)
            D = D.then((L) => {
              if (a && f[C] ? a(f[C], C, f) : !0) {
                const me = w ? h[C] : Ir(e.options, L);
                return P(L, w, me);
              }
              return Promise.resolve(O(L, h[C], f[C]));
            });
        }
        return D.then((w) => ({
          pages: w,
          pageParams: g
        }));
      };
    }
  };
}
function Ir(e, t) {
  return e.getNextPageParam == null ? void 0 : e.getNextPageParam(t[t.length - 1], t);
}
function td(e, t) {
  return e.getPreviousPageParam == null ? void 0 : e.getPreviousPageParam(t[0], t);
}
class nd {
  constructor(t = {}) {
    this.queryCache = t.queryCache || new Yl(), this.mutationCache = t.mutationCache || new Zl(), this.logger = t.logger || Ln, this.defaultOptions = t.defaultOptions || {}, this.queryDefaults = [], this.mutationDefaults = [], this.mountCount = 0;
  }
  mount() {
    this.mountCount++, this.mountCount === 1 && (this.unsubscribeFocus = mn.subscribe(() => {
      mn.isFocused() && (this.resumePausedMutations(), this.queryCache.onFocus());
    }), this.unsubscribeOnline = mt.subscribe(() => {
      mt.isOnline() && (this.resumePausedMutations(), this.queryCache.onOnline());
    }));
  }
  unmount() {
    var t, n;
    this.mountCount--, this.mountCount === 0 && ((t = this.unsubscribeFocus) == null || t.call(this), this.unsubscribeFocus = void 0, (n = this.unsubscribeOnline) == null || n.call(this), this.unsubscribeOnline = void 0);
  }
  isFetching(t, n) {
    const [r] = ce(t, n);
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
    const o = st(t, n, r), s = this.getQueryData(o.queryKey);
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
    const o = this.queryCache.find(t), s = o == null ? void 0 : o.state.data, i = Ll(n, s);
    if (typeof i > "u")
      return;
    const a = st(t), c = this.defaultQueryOptions(a);
    return this.queryCache.build(this, c).setData(i, {
      ...r,
      manual: !0
    });
  }
  setQueriesData(t, n, r) {
    return j.batch(() => this.getQueryCache().findAll(t).map(({
      queryKey: o
    }) => [o, this.setQueryData(o, n, r)]));
  }
  getQueryState(t, n) {
    var r;
    return (r = this.queryCache.find(t, n)) == null ? void 0 : r.state;
  }
  removeQueries(t, n) {
    const [r] = ce(t, n), o = this.queryCache;
    j.batch(() => {
      o.findAll(r).forEach((s) => {
        o.remove(s);
      });
    });
  }
  resetQueries(t, n, r) {
    const [o, s] = ce(t, n, r), i = this.queryCache, a = {
      type: "active",
      ...o
    };
    return j.batch(() => (i.findAll(o).forEach((c) => {
      c.reset();
    }), this.refetchQueries(a, s)));
  }
  cancelQueries(t, n, r) {
    const [o, s = {}] = ce(t, n, r);
    typeof s.revert > "u" && (s.revert = !0);
    const i = j.batch(() => this.queryCache.findAll(o).map((a) => a.cancel(s)));
    return Promise.all(i).then(W).catch(W);
  }
  invalidateQueries(t, n, r) {
    const [o, s] = ce(t, n, r);
    return j.batch(() => {
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
    const [o, s] = ce(t, n, r), i = j.batch(() => this.queryCache.findAll(o).filter((c) => !c.isDisabled()).map((c) => {
      var u;
      return c.fetch(void 0, {
        ...s,
        cancelRefetch: (u = s == null ? void 0 : s.cancelRefetch) != null ? u : !0,
        meta: {
          refetchPage: o.refetchPage
        }
      });
    }));
    let a = Promise.all(i).then(W);
    return s != null && s.throwOnError || (a = a.catch(W)), a;
  }
  fetchQuery(t, n, r) {
    const o = st(t, n, r), s = this.defaultQueryOptions(o);
    typeof s.retry > "u" && (s.retry = !1);
    const i = this.queryCache.build(this, s);
    return i.isStaleByTime(s.staleTime) ? i.fetch(s) : Promise.resolve(i.state.data);
  }
  prefetchQuery(t, n, r) {
    return this.fetchQuery(t, n, r).then(W).catch(W);
  }
  fetchInfiniteQuery(t, n, r) {
    const o = st(t, n, r);
    return o.behavior = ed(), this.fetchQuery(o);
  }
  prefetchInfiniteQuery(t, n, r) {
    return this.fetchInfiniteQuery(t, n, r).then(W).catch(W);
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
    const r = this.queryDefaults.find((o) => be(t) === be(o.queryKey));
    r ? r.defaultOptions = n : this.queryDefaults.push({
      queryKey: t,
      defaultOptions: n
    });
  }
  getQueryDefaults(t) {
    if (!t)
      return;
    const n = this.queryDefaults.find((r) => gt(t, r.queryKey));
    return n == null ? void 0 : n.defaultOptions;
  }
  setMutationDefaults(t, n) {
    const r = this.mutationDefaults.find((o) => be(t) === be(o.mutationKey));
    r ? r.defaultOptions = n : this.mutationDefaults.push({
      mutationKey: t,
      defaultOptions: n
    });
  }
  getMutationDefaults(t) {
    if (!t)
      return;
    const n = this.mutationDefaults.find((r) => gt(t, r.mutationKey));
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
    return !n.queryHash && n.queryKey && (n.queryHash = jn(n.queryKey, n)), typeof n.refetchOnReconnect > "u" && (n.refetchOnReconnect = n.networkMode !== "always"), typeof n.useErrorBoundary > "u" && (n.useErrorBoundary = !!n.suspense), n;
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
const Nr = /* @__PURE__ */ we(void 0), rd = /* @__PURE__ */ we(!1);
function od(e, t) {
  return e || (t && typeof window < "u" ? (window.ReactQueryClientContext || (window.ReactQueryClientContext = Nr), window.ReactQueryClientContext) : Nr);
}
const sd = ({
  client: e,
  children: t,
  context: n,
  contextSharing: r = !1
}) => {
  z(() => (e.mount(), () => {
    e.unmount();
  }), [e]);
  const o = od(n, r);
  return /* @__PURE__ */ I(rd.Provider, {
    value: !n && r
  }, /* @__PURE__ */ I(o.Provider, {
    value: e
  }, t));
}, bs = window.adminXQueryClient || new nd({
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
window.adminXQueryClient || (window.adminXQueryClient = bs);
const vs = we({
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
function id({ children: e, ...t }) {
  return /* @__PURE__ */ b.jsx(Pn, { children: /* @__PURE__ */ b.jsx(sd, { client: bs, children: /* @__PURE__ */ b.jsx(vs.Provider, { value: t, children: e }) }) });
}
const ad = () => de(vs), _s = we({
  route: "",
  updateRoute: () => {
  },
  loadingModal: !1,
  eventTarget: new EventTarget()
});
function cd(e, t) {
  if (!t)
    return null;
  const n = new RegExp(`/${e}/(.*)`), r = t == null ? void 0 : t.match(n);
  return r ? r[1] : null;
}
const ud = (e, t, n, r) => {
  let o = window.location.hash;
  o = o.substring(1);
  const s = `${window.location.protocol}//${window.location.hostname}`, i = new URL(o, s), a = cd(e, i.pathname);
  if (!r || !n)
    return { pathName: a || "" };
  const c = i.searchParams;
  if (a && r && n) {
    const [, u] = Object.entries(r).find(([f]) => Wt(t || "", f)) || [], [l, d] = Object.entries(r).find(([f]) => Wt(a, f)) || [];
    return {
      pathName: a,
      changingModal: d && d !== u,
      modal: l && d ? (
        // we should consider adding '&& modalName !== currentModalName' here, but this breaks tests
        n().then(({ default: f }) => {
          Kr.show(f[d], { pathName: a, params: Wt(a, l), searchParams: c });
        })
      ) : void 0
    };
  }
  return { pathName: "" };
}, Wt = (e, t) => {
  const n = new RegExp("^" + t.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$"), r = e.match(n);
  if (r)
    return r.groups || {};
}, ld = ({ basePath: e, modals: t, children: n }) => {
  const { externalNavigate: r } = ad(), [o, s] = ve(void 0), [i, a] = ve(!1), [c] = ve(new EventTarget()), u = $((l) => {
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
        const { pathName: f, modal: h, changingModal: g } = ud(e, d, t == null ? void 0 : t.load, t == null ? void 0 : t.paths);
        return h && g && (a(!0), h.then(() => a(!1))), f;
      });
    };
    return l(), window.addEventListener("hashchange", l), () => {
      window.removeEventListener("hashchange", l);
    };
  }, []), o === void 0 ? null : /* @__PURE__ */ b.jsx(
    _s.Provider,
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
function pd() {
  return de(_s);
}
const dd = () => (
  // The div below should be converted into an app container component in the design system
  /* @__PURE__ */ b.jsxs("div", { className: "p-8 pt-9", children: [
    /* @__PURE__ */ b.jsxs("header", { children: [
      /* @__PURE__ */ b.jsx(ss, { children: /* @__PURE__ */ b.jsxs(is, { children: [
        /* @__PURE__ */ b.jsx(as, { children: /* @__PURE__ */ b.jsx(cs, { href: "/posts/", children: "Posts" }) }),
        /* @__PURE__ */ b.jsx(ls, {}),
        /* @__PURE__ */ b.jsx(us, { children: "Analytics" })
      ] }) }),
      /* @__PURE__ */ b.jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ b.jsx(rs, { size: 1, children: "Post analytics" }),
        /* @__PURE__ */ b.jsx(ds, { size: "sm", className: "mt-1", children: "It is something!" })
      ] })
    ] }),
    /* @__PURE__ */ b.jsx("div", { className: "mt-8 border rounded-lg border-grey-300 min-h-[500px] flex items-center justify-center text-grey-500", children: "TK" })
  ] })
), fd = {
  paths: {
    "demo-modal": "DemoModal"
  },
  load: async () => import("./modals-227cf2ca.mjs")
}, gd = ({ framework: e, designSystem: t }) => /* @__PURE__ */ b.jsx(id, { ...e, children: /* @__PURE__ */ b.jsx(ld, { basePath: "post-analytics-spike", modals: fd, children: /* @__PURE__ */ b.jsx(Fl, { className: "post-analytics-spike", ...t, children: /* @__PURE__ */ b.jsx(dd, {}) }) }) });
export {
  gd as A,
  Kr as N,
  F as R,
  bt as S,
  I as a,
  hd as b,
  qr as c,
  ve as d,
  z as e,
  G as f,
  pd as g,
  b as j,
  Vr as u
};
//# sourceMappingURL=index-aeb0d0b2.mjs.map
