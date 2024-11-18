function Ci(t) {
  if (t.__esModule)
    return t;
  var e = t.default;
  if (typeof e == "function") {
    var n = function r() {
      return this instanceof r ? Reflect.construct(e, arguments, this.constructor) : e.apply(this, arguments);
    };
    n.prototype = e.prototype;
  } else
    n = {};
  return Object.defineProperty(n, "__esModule", { value: !0 }), Object.keys(t).forEach(function(r) {
    var i = Object.getOwnPropertyDescriptor(t, r);
    Object.defineProperty(n, r, i.get ? i : {
      enumerable: !0,
      get: function() {
        return t[r];
      }
    });
  }), n;
}
var Zn = { exports: {} }, Ye = {};
const Ti = React.Children, er = React.Component, tr = React.Fragment, Di = React.Profiler, Ri = React.PureComponent, Ii = React.StrictMode, Mi = React.Suspense, Ni = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, Pi = React.act, $i = React.cloneElement, he = React.createContext, C = React.createElement, Fi = React.createFactory, Ai = React.createRef, P = React, ki = React.forwardRef, nr = React.isValidElement, ji = React.lazy, rr = React.memo, Li = React.startTransition, Ui = React.unstable_act, M = React.useCallback, ne = React.useContext, qi = React.useDebugValue, Hi = React.useDeferredValue, j = React.useEffect, ir = React.useId, Bi = React.useImperativeHandle, Gi = React.useInsertionEffect, zi = React.useLayoutEffect, Qt = React.useMemo, sr = React.useReducer, Qi = React.useRef, ue = React.useState, Wi = React.useSyncExternalStore, Ki = React.useTransition, or = React.version, Vi = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: Ti,
  Component: er,
  Fragment: tr,
  Profiler: Di,
  PureComponent: Ri,
  StrictMode: Ii,
  Suspense: Mi,
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: Ni,
  act: Pi,
  cloneElement: $i,
  createContext: he,
  createElement: C,
  createFactory: Fi,
  createRef: Ai,
  default: P,
  forwardRef: ki,
  isValidElement: nr,
  lazy: ji,
  memo: rr,
  startTransition: Li,
  unstable_act: Ui,
  useCallback: M,
  useContext: ne,
  useDebugValue: qi,
  useDeferredValue: Hi,
  useEffect: j,
  useId: ir,
  useImperativeHandle: Bi,
  useInsertionEffect: Gi,
  useLayoutEffect: zi,
  useMemo: Qt,
  useReducer: sr,
  useRef: Qi,
  useState: ue,
  useSyncExternalStore: Wi,
  useTransition: Ki,
  version: or
}, Symbol.toStringTag, { value: "Module" })), Yi = /* @__PURE__ */ Ci(Vi);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Xi = Yi, Ji = Symbol.for("react.element"), Zi = Symbol.for("react.fragment"), es = Object.prototype.hasOwnProperty, ts = Xi.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, ns = { key: !0, ref: !0, __self: !0, __source: !0 };
function ar(t, e, n) {
  var r, i = {}, s = null, o = null;
  n !== void 0 && (s = "" + n), e.key !== void 0 && (s = "" + e.key), e.ref !== void 0 && (o = e.ref);
  for (r in e)
    es.call(e, r) && !ns.hasOwnProperty(r) && (i[r] = e[r]);
  if (t && t.defaultProps)
    for (r in e = t.defaultProps, e)
      i[r] === void 0 && (i[r] = e[r]);
  return { $$typeof: Ji, type: t, key: s, ref: o, props: i, _owner: ts.current };
}
Ye.Fragment = Zi;
Ye.jsx = ar;
Ye.jsxs = ar;
Zn.exports = Ye;
var D = Zn.exports;
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
function cr(t) {
  var e, n, r = "";
  if (typeof t == "string" || typeof t == "number")
    r += t;
  else if (typeof t == "object")
    if (Array.isArray(t)) {
      var i = t.length;
      for (e = 0; e < i; e++)
        t[e] && (n = cr(t[e])) && (r && (r += " "), r += n);
    } else
      for (n in t)
        t[n] && (r && (r += " "), r += n);
  return r;
}
function rs() {
  for (var t, e, n = 0, r = "", i = arguments.length; n < i; n++)
    (t = arguments[n]) && (e = cr(t)) && (r && (r += " "), r += e);
  return r;
}
var O = globalThis && globalThis.__assign || function() {
  return O = Object.assign || function(t) {
    for (var e, n = 1, r = arguments.length; n < r; n++) {
      e = arguments[n];
      for (var i in e)
        Object.prototype.hasOwnProperty.call(e, i) && (t[i] = e[i]);
    }
    return t;
  }, O.apply(this, arguments);
}, ur = globalThis && globalThis.__rest || function(t, e) {
  var n = {};
  for (var r in t)
    Object.prototype.hasOwnProperty.call(t, r) && e.indexOf(r) < 0 && (n[r] = t[r]);
  if (t != null && typeof Object.getOwnPropertySymbols == "function")
    for (var i = 0, r = Object.getOwnPropertySymbols(t); i < r.length; i++)
      e.indexOf(r[i]) < 0 && Object.prototype.propertyIsEnumerable.call(t, r[i]) && (n[r[i]] = t[r[i]]);
  return n;
}, vt = Symbol("NiceModalId"), Wt = {}, we = P.createContext(Wt), lr = P.createContext(null), B = {}, De = {}, is = 0, Oe = function() {
  throw new Error("No dispatch method detected, did you embed your app with NiceModal.Provider?");
}, dr = function() {
  return "_nice_modal_" + is++;
}, fr = function(t, e) {
  var n, r, i;
  switch (t === void 0 && (t = Wt), e.type) {
    case "nice-modal/show": {
      var s = e.payload, o = s.modalId, a = s.args;
      return O(O({}, t), (n = {}, n[o] = O(O({}, t[o]), {
        id: o,
        args: a,
        // If modal is not mounted, mount it first then make it visible.
        // There is logic inside HOC wrapper to make it visible after its first mount.
        // This mechanism ensures the entering transition.
        visible: !!De[o],
        delayVisible: !De[o]
      }), n));
    }
    case "nice-modal/hide": {
      var o = e.payload.modalId;
      return t[o] ? O(O({}, t), (r = {}, r[o] = O(O({}, t[o]), { visible: !1 }), r)) : t;
    }
    case "nice-modal/remove": {
      var o = e.payload.modalId, c = O({}, t);
      return delete c[o], c;
    }
    case "nice-modal/set-flags": {
      var u = e.payload, o = u.modalId, l = u.flags;
      return O(O({}, t), (i = {}, i[o] = O(O({}, t[o]), l), i));
    }
    default:
      return t;
  }
};
function ss(t) {
  var e;
  return (e = B[t]) === null || e === void 0 ? void 0 : e.comp;
}
function os(t, e) {
  return {
    type: "nice-modal/show",
    payload: {
      modalId: t,
      args: e
    }
  };
}
function as(t, e) {
  return {
    type: "nice-modal/set-flags",
    payload: {
      modalId: t,
      flags: e
    }
  };
}
function cs(t) {
  return {
    type: "nice-modal/hide",
    payload: {
      modalId: t
    }
  };
}
function us(t) {
  return {
    type: "nice-modal/remove",
    payload: {
      modalId: t
    }
  };
}
var V = {}, be = {}, Xe = function(t) {
  return typeof t == "string" ? t : (t[vt] || (t[vt] = dr()), t[vt]);
};
function Kt(t, e) {
  var n = Xe(t);
  if (typeof t != "string" && !B[n] && Je(n, t), Oe(os(n, e)), !V[n]) {
    var r, i, s = new Promise(function(o, a) {
      r = o, i = a;
    });
    V[n] = {
      resolve: r,
      reject: i,
      promise: s
    };
  }
  return V[n].promise;
}
function Vt(t) {
  var e = Xe(t);
  if (Oe(cs(e)), delete V[e], !be[e]) {
    var n, r, i = new Promise(function(s, o) {
      n = s, r = o;
    });
    be[e] = {
      resolve: n,
      reject: r,
      promise: i
    };
  }
  return be[e].promise;
}
var hr = function(t) {
  var e = Xe(t);
  Oe(us(e)), delete V[e], delete be[e];
}, ls = function(t, e) {
  Oe(as(t, e));
};
function pr(t, e) {
  var n = ne(we), r = ne(lr), i = null, s = t && typeof t != "string";
  if (t ? i = Xe(t) : i = r, !i)
    throw new Error("No modal id found in NiceModal.useModal.");
  var o = i;
  j(function() {
    s && !B[o] && Je(o, t, e);
  }, [s, o, t, e]);
  var a = n[o], c = M(function(p) {
    return Kt(o, p);
  }, [o]), u = M(function() {
    return Vt(o);
  }, [o]), l = M(function() {
    return hr(o);
  }, [o]), d = M(function(p) {
    var _;
    (_ = V[o]) === null || _ === void 0 || _.resolve(p), delete V[o];
  }, [o]), f = M(function(p) {
    var _;
    (_ = V[o]) === null || _ === void 0 || _.reject(p), delete V[o];
  }, [o]), h = M(function(p) {
    var _;
    (_ = be[o]) === null || _ === void 0 || _.resolve(p), delete be[o];
  }, [o]);
  return Qt(function() {
    return {
      id: o,
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
    o,
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
var ds = function(t) {
  return function(e) {
    var n, r = e.defaultVisible, i = e.keepMounted, s = e.id, o = ur(e, ["defaultVisible", "keepMounted", "id"]), a = pr(s), c = a.args, u = a.show, l = ne(we), d = !!l[s];
    j(function() {
      return r && u(), De[s] = !0, function() {
        delete De[s];
      };
    }, [s, u, r]), j(function() {
      i && ls(s, { keepMounted: !0 });
    }, [s, i]);
    var f = (n = l[s]) === null || n === void 0 ? void 0 : n.delayVisible;
    return j(function() {
      f && u(c);
    }, [f, c, u]), d ? P.createElement(
      lr.Provider,
      { value: s },
      P.createElement(t, O({}, o, c))
    ) : null;
  };
}, Je = function(t, e, n) {
  B[t] ? B[t].props = n : B[t] = { comp: e, props: n };
}, fs = function(t) {
  delete B[t];
}, mr = function() {
  var t = ne(we), e = Object.keys(t).filter(function(r) {
    return !!t[r];
  });
  e.forEach(function(r) {
    if (!B[r] && !De[r]) {
      console.warn("No modal found for id: " + r + ". Please check the id or if it is registered or declared via JSX.");
      return;
    }
  });
  var n = e.filter(function(r) {
    return B[r];
  }).map(function(r) {
    return O({ id: r }, B[r]);
  });
  return P.createElement(P.Fragment, null, n.map(function(r) {
    return P.createElement(r.comp, O({ key: r.id, id: r.id }, r.props));
  }));
}, hs = function(t) {
  var e = t.children, n = sr(fr, Wt), r = n[0];
  return Oe = n[1], P.createElement(
    we.Provider,
    { value: r },
    e,
    P.createElement(mr, null)
  );
}, ps = function(t) {
  var e = t.children, n = t.dispatch, r = t.modals;
  return !n || !r ? P.createElement(hs, null, e) : (Oe = n, P.createElement(
    we.Provider,
    { value: r },
    e,
    P.createElement(mr, null)
  ));
}, ms = function(t) {
  var e = t.id, n = t.component;
  return j(function() {
    return Je(e, n), function() {
      fs(e);
    };
  }, [e, n]), null;
}, gs = function(t) {
  var e, n = t.modal, r = t.handler, i = r === void 0 ? {} : r, s = ur(t, ["modal", "handler"]), o = Qt(function() {
    return dr();
  }, []), a = typeof n == "string" ? (e = B[n]) === null || e === void 0 ? void 0 : e.comp : n;
  if (!i)
    throw new Error("No handler found in NiceModal.ModalHolder.");
  if (!a)
    throw new Error("No modal found for id: " + n + " in NiceModal.ModalHolder.");
  return i.show = M(function(c) {
    return Kt(o, c);
  }, [o]), i.hide = M(function() {
    return Vt(o);
  }, [o]), P.createElement(a, O({ id: o }, s));
}, ys = function(t) {
  return {
    visible: t.visible,
    onOk: function() {
      return t.hide();
    },
    onCancel: function() {
      return t.hide();
    },
    afterClose: function() {
      t.resolveHide(), t.keepMounted || t.remove();
    }
  };
}, _s = function(t) {
  return {
    visible: t.visible,
    onClose: function() {
      return t.hide();
    },
    afterVisibleChange: function(e) {
      e || t.resolveHide(), !e && !t.keepMounted && t.remove();
    }
  };
}, vs = function(t) {
  return {
    open: t.visible,
    onClose: function() {
      return t.hide();
    },
    onExited: function() {
      t.resolveHide(), !t.keepMounted && t.remove();
    }
  };
}, bs = function(t) {
  return {
    show: t.visible,
    onHide: function() {
      return t.hide();
    },
    onExited: function() {
      t.resolveHide(), !t.keepMounted && t.remove();
    }
  };
}, gr = {
  Provider: ps,
  ModalDef: ms,
  ModalHolder: gs,
  NiceModalContext: we,
  create: ds,
  register: Je,
  getModal: ss,
  show: Kt,
  hide: Vt,
  remove: hr,
  useModal: pr,
  reducer: fr,
  antdModal: ys,
  antdDrawer: _s,
  muiDialog: vs,
  bootstrapDialog: bs
};
let Es = { data: "" }, Ss = (t) => typeof window == "object" ? ((t ? t.querySelector("#_goober") : window._goober) || Object.assign((t || document.head).appendChild(document.createElement("style")), { innerHTML: " ", id: "_goober" })).firstChild : t || Es, ws = /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g, Os = /\/\*[^]*?\*\/|  +/g, pn = /\n+/g, ee = (t, e) => {
  let n = "", r = "", i = "";
  for (let s in t) {
    let o = t[s];
    s[0] == "@" ? s[1] == "i" ? n = s + " " + o + ";" : r += s[1] == "f" ? ee(o, s) : s + "{" + ee(o, s[1] == "k" ? "" : e) + "}" : typeof o == "object" ? r += ee(o, e ? e.replace(/([^,])+/g, (a) => s.replace(/(^:.*)|([^,])+/g, (c) => /&/.test(c) ? c.replace(/&/g, a) : a ? a + " " + c : c)) : s) : o != null && (s = /^--/.test(s) ? s : s.replace(/[A-Z]/g, "-$&").toLowerCase(), i += ee.p ? ee.p(s, o) : s + ":" + o + ";");
  }
  return n + (e && i ? e + "{" + i + "}" : i) + r;
}, W = {}, yr = (t) => {
  if (typeof t == "object") {
    let e = "";
    for (let n in t)
      e += n + yr(t[n]);
    return e;
  }
  return t;
}, xs = (t, e, n, r, i) => {
  let s = yr(t), o = W[s] || (W[s] = ((c) => {
    let u = 0, l = 11;
    for (; u < c.length; )
      l = 101 * l + c.charCodeAt(u++) >>> 0;
    return "go" + l;
  })(s));
  if (!W[o]) {
    let c = s !== t ? t : ((u) => {
      let l, d, f = [{}];
      for (; l = ws.exec(u.replace(Os, "")); )
        l[4] ? f.shift() : l[3] ? (d = l[3].replace(pn, " ").trim(), f.unshift(f[0][d] = f[0][d] || {})) : f[0][l[1]] = l[2].replace(pn, " ").trim();
      return f[0];
    })(t);
    W[o] = ee(i ? { ["@keyframes " + o]: c } : c, n ? "" : "." + o);
  }
  let a = n && W.g ? W.g : null;
  return n && (W.g = W[o]), ((c, u, l, d) => {
    d ? u.data = u.data.replace(d, c) : u.data.indexOf(c) === -1 && (u.data = l ? c + u.data : u.data + c);
  })(W[o], e, r, a), o;
}, Cs = (t, e, n) => t.reduce((r, i, s) => {
  let o = e[s];
  if (o && o.call) {
    let a = o(n), c = a && a.props && a.props.className || /^go/.test(a) && a;
    o = c ? "." + c : a && typeof a == "object" ? a.props ? "" : ee(a, "") : a === !1 ? "" : a;
  }
  return r + i + (o ?? "");
}, "");
function Ze(t) {
  let e = this || {}, n = t.call ? t(e.p) : t;
  return xs(n.unshift ? n.raw ? Cs(n, [].slice.call(arguments, 1), e.p) : n.reduce((r, i) => Object.assign(r, i && i.call ? i(e.p) : i), {}) : n, Ss(e.target), e.g, e.o, e.k);
}
let _r, xt, Ct;
Ze.bind({ g: 1 });
let X = Ze.bind({ k: 1 });
function Ts(t, e, n, r) {
  ee.p = e, _r = t, xt = n, Ct = r;
}
function ie(t, e) {
  let n = this || {};
  return function() {
    let r = arguments;
    function i(s, o) {
      let a = Object.assign({}, s), c = a.className || i.className;
      n.p = Object.assign({ theme: xt && xt() }, a), n.o = / *go\d+/.test(c), a.className = Ze.apply(n, r) + (c ? " " + c : ""), e && (a.ref = o);
      let u = t;
      return t[0] && (u = a.as || t, delete a.as), Ct && u[0] && Ct(a), _r(u, a);
    }
    return e ? e(i) : i;
  };
}
var Ds = (t) => typeof t == "function", Be = (t, e) => Ds(t) ? t(e) : t, Rs = (() => {
  let t = 0;
  return () => (++t).toString();
})(), vr = (() => {
  let t;
  return () => {
    if (t === void 0 && typeof window < "u") {
      let e = matchMedia("(prefers-reduced-motion: reduce)");
      t = !e || e.matches;
    }
    return t;
  };
})(), Is = 20, Le = /* @__PURE__ */ new Map(), Ms = 1e3, mn = (t) => {
  if (Le.has(t))
    return;
  let e = setTimeout(() => {
    Le.delete(t), pe({ type: 4, toastId: t });
  }, Ms);
  Le.set(t, e);
}, Ns = (t) => {
  let e = Le.get(t);
  e && clearTimeout(e);
}, Tt = (t, e) => {
  switch (e.type) {
    case 0:
      return { ...t, toasts: [e.toast, ...t.toasts].slice(0, Is) };
    case 1:
      return e.toast.id && Ns(e.toast.id), { ...t, toasts: t.toasts.map((s) => s.id === e.toast.id ? { ...s, ...e.toast } : s) };
    case 2:
      let { toast: n } = e;
      return t.toasts.find((s) => s.id === n.id) ? Tt(t, { type: 1, toast: n }) : Tt(t, { type: 0, toast: n });
    case 3:
      let { toastId: r } = e;
      return r ? mn(r) : t.toasts.forEach((s) => {
        mn(s.id);
      }), { ...t, toasts: t.toasts.map((s) => s.id === r || r === void 0 ? { ...s, visible: !1 } : s) };
    case 4:
      return e.toastId === void 0 ? { ...t, toasts: [] } : { ...t, toasts: t.toasts.filter((s) => s.id !== e.toastId) };
    case 5:
      return { ...t, pausedAt: e.time };
    case 6:
      let i = e.time - (t.pausedAt || 0);
      return { ...t, pausedAt: void 0, toasts: t.toasts.map((s) => ({ ...s, pauseDuration: s.pauseDuration + i })) };
  }
}, Ue = [], qe = { toasts: [], pausedAt: void 0 }, pe = (t) => {
  qe = Tt(qe, t), Ue.forEach((e) => {
    e(qe);
  });
}, Ps = { blank: 4e3, error: 4e3, success: 2e3, loading: 1 / 0, custom: 4e3 }, $s = (t = {}) => {
  let [e, n] = ue(qe);
  j(() => (Ue.push(n), () => {
    let i = Ue.indexOf(n);
    i > -1 && Ue.splice(i, 1);
  }), [e]);
  let r = e.toasts.map((i) => {
    var s, o;
    return { ...t, ...t[i.type], ...i, duration: i.duration || ((s = t[i.type]) == null ? void 0 : s.duration) || (t == null ? void 0 : t.duration) || Ps[i.type], style: { ...t.style, ...(o = t[i.type]) == null ? void 0 : o.style, ...i.style } };
  });
  return { ...e, toasts: r };
}, Fs = (t, e = "blank", n) => ({ createdAt: Date.now(), visible: !0, type: e, ariaProps: { role: "status", "aria-live": "polite" }, message: t, pauseDuration: 0, ...n, id: (n == null ? void 0 : n.id) || Rs() }), Re = (t) => (e, n) => {
  let r = Fs(e, t, n);
  return pe({ type: 2, toast: r }), r.id;
}, k = (t, e) => Re("blank")(t, e);
k.error = Re("error");
k.success = Re("success");
k.loading = Re("loading");
k.custom = Re("custom");
k.dismiss = (t) => {
  pe({ type: 3, toastId: t });
};
k.remove = (t) => pe({ type: 4, toastId: t });
k.promise = (t, e, n) => {
  let r = k.loading(e.loading, { ...n, ...n == null ? void 0 : n.loading });
  return t.then((i) => (k.success(Be(e.success, i), { id: r, ...n, ...n == null ? void 0 : n.success }), i)).catch((i) => {
    k.error(Be(e.error, i), { id: r, ...n, ...n == null ? void 0 : n.error });
  }), t;
};
var As = (t, e) => {
  pe({ type: 1, toast: { id: t, height: e } });
}, ks = () => {
  pe({ type: 5, time: Date.now() });
}, js = (t) => {
  let { toasts: e, pausedAt: n } = $s(t);
  j(() => {
    if (n)
      return;
    let s = Date.now(), o = e.map((a) => {
      if (a.duration === 1 / 0)
        return;
      let c = (a.duration || 0) + a.pauseDuration - (s - a.createdAt);
      if (c < 0) {
        a.visible && k.dismiss(a.id);
        return;
      }
      return setTimeout(() => k.dismiss(a.id), c);
    });
    return () => {
      o.forEach((a) => a && clearTimeout(a));
    };
  }, [e, n]);
  let r = M(() => {
    n && pe({ type: 6, time: Date.now() });
  }, [n]), i = M((s, o) => {
    let { reverseOrder: a = !1, gutter: c = 8, defaultPosition: u } = o || {}, l = e.filter((h) => (h.position || u) === (s.position || u) && h.height), d = l.findIndex((h) => h.id === s.id), f = l.filter((h, p) => p < d && h.visible).length;
    return l.filter((h) => h.visible).slice(...a ? [f + 1] : [0, f]).reduce((h, p) => h + (p.height || 0) + c, 0);
  }, [e]);
  return { toasts: e, handlers: { updateHeight: As, startPause: ks, endPause: r, calculateOffset: i } };
}, Ls = X`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`, Us = X`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`, qs = X`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`, Hs = ie("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(t) => t.primary || "#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ls} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Us} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${(t) => t.secondary || "#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${qs} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`, Bs = X`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`, Gs = ie("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${(t) => t.secondary || "#e0e0e0"};
  border-right-color: ${(t) => t.primary || "#616161"};
  animation: ${Bs} 1s linear infinite;
`, zs = X`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`, Qs = X`
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
}`, Ws = ie("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(t) => t.primary || "#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${zs} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Qs} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${(t) => t.secondary || "#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`, Ks = ie("div")`
  position: absolute;
`, Vs = ie("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`, Ys = X`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`, Xs = ie("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Ys} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`, Js = ({ toast: t }) => {
  let { icon: e, type: n, iconTheme: r } = t;
  return e !== void 0 ? typeof e == "string" ? C(Xs, null, e) : e : n === "blank" ? null : C(Vs, null, C(Gs, { ...r }), n !== "loading" && C(Ks, null, n === "error" ? C(Hs, { ...r }) : C(Ws, { ...r })));
}, Zs = (t) => `
0% {transform: translate3d(0,${t * -200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`, eo = (t) => `
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${t * -150}%,-1px) scale(.6); opacity:0;}
`, to = "0%{opacity:0;} 100%{opacity:1;}", no = "0%{opacity:1;} 100%{opacity:0;}", ro = ie("div")`
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
`, io = ie("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`, so = (t, e) => {
  let n = t.includes("top") ? 1 : -1, [r, i] = vr() ? [to, no] : [Zs(n), eo(n)];
  return { animation: e ? `${X(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards` : `${X(i)} 0.4s forwards cubic-bezier(.06,.71,.55,1)` };
}, oo = rr(({ toast: t, position: e, style: n, children: r }) => {
  let i = t.height ? so(t.position || e || "top-center", t.visible) : { opacity: 0 }, s = C(Js, { toast: t }), o = C(io, { ...t.ariaProps }, Be(t.message, t));
  return C(ro, { className: t.className, style: { ...i, ...n, ...t.style } }, typeof r == "function" ? r({ icon: s, message: o }) : C(tr, null, s, o));
});
Ts(C);
var ao = ({ id: t, className: e, style: n, onHeightUpdate: r, children: i }) => {
  let s = M((o) => {
    if (o) {
      let a = () => {
        let c = o.getBoundingClientRect().height;
        r(t, c);
      };
      a(), new MutationObserver(a).observe(o, { subtree: !0, childList: !0, characterData: !0 });
    }
  }, [t, r]);
  return C("div", { ref: s, className: e, style: n }, i);
}, co = (t, e) => {
  let n = t.includes("top"), r = n ? { top: 0 } : { bottom: 0 }, i = t.includes("center") ? { justifyContent: "center" } : t.includes("right") ? { justifyContent: "flex-end" } : {};
  return { left: 0, right: 0, display: "flex", position: "absolute", transition: vr() ? void 0 : "all 230ms cubic-bezier(.21,1.02,.73,1)", transform: `translateY(${e * (n ? 1 : -1)}px)`, ...r, ...i };
}, uo = Ze`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`, Me = 16, lo = ({ reverseOrder: t, position: e = "top-center", toastOptions: n, gutter: r, children: i, containerStyle: s, containerClassName: o }) => {
  let { toasts: a, handlers: c } = js(n);
  return C("div", { style: { position: "fixed", zIndex: 9999, top: Me, left: Me, right: Me, bottom: Me, pointerEvents: "none", ...s }, className: o, onMouseEnter: c.startPause, onMouseLeave: c.endPause }, a.map((u) => {
    let l = u.position || e, d = c.calculateOffset(u, { reverseOrder: t, gutter: r, defaultPosition: e }), f = co(l, d);
    return C(ao, { id: u.id, key: u.id, onHeightUpdate: c.updateHeight, className: u.visible ? uo : "", style: f }, u.type === "custom" ? Be(u.message, u) : i ? i(u) : C(oo, { toast: u, position: l }));
  }));
};
const br = P.createContext({ isDirty: !1, setGlobalDirtyState: () => {
} }), fo = ({ children: t }) => {
  const [e, n] = ue([]), r = M((i, s) => {
    n((o) => s && !o.includes(i) ? [...o, i] : !s && o.includes(i) ? o.filter((a) => a !== i) : o);
  }, []);
  return /* @__PURE__ */ D.jsx(br.Provider, { value: { isDirty: e.length > 0, setGlobalDirtyState: r }, children: t });
}, Nu = () => {
  const t = ir(), { isDirty: e, setGlobalDirtyState: n } = ne(br);
  j(() => () => n(t, !1), [t, n]);
  const r = M(
    (i) => n(t, i),
    [t, n]
  );
  return {
    isDirty: e,
    setGlobalDirtyState: r
  };
}, ho = he({
  isAnyTextFieldFocused: !1,
  setFocusState: () => {
  },
  fetchKoenigLexical: async () => {
  },
  darkMode: !1
}), po = ({ fetchKoenigLexical: t, darkMode: e, children: n }) => {
  const [r, i] = ue(!1), s = (o) => {
    i(o);
  };
  return /* @__PURE__ */ D.jsx(ho.Provider, { value: { isAnyTextFieldFocused: r, setFocusState: s, fetchKoenigLexical: t, darkMode: e }, children: /* @__PURE__ */ D.jsxs(fo, { children: [
    /* @__PURE__ */ D.jsx(lo, {}),
    /* @__PURE__ */ D.jsx(gr.Provider, { children: n })
  ] }) });
}, Er = Object.prototype.toString;
function Yt(t) {
  switch (Er.call(t)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
      return !0;
    default:
      return de(t, Error);
  }
}
function xe(t, e) {
  return Er.call(t) === `[object ${e}]`;
}
function Xt(t) {
  return xe(t, "ErrorEvent");
}
function gn(t) {
  return xe(t, "DOMError");
}
function mo(t) {
  return xe(t, "DOMException");
}
function Y(t) {
  return xe(t, "String");
}
function Sr(t) {
  return typeof t == "object" && t !== null && "__sentry_template_string__" in t && "__sentry_template_values__" in t;
}
function wr(t) {
  return t === null || Sr(t) || typeof t != "object" && typeof t != "function";
}
function et(t) {
  return xe(t, "Object");
}
function tt(t) {
  return typeof Event < "u" && de(t, Event);
}
function go(t) {
  return typeof Element < "u" && de(t, Element);
}
function yo(t) {
  return xe(t, "RegExp");
}
function Jt(t) {
  return !!(t && t.then && typeof t.then == "function");
}
function _o(t) {
  return et(t) && "nativeEvent" in t && "preventDefault" in t && "stopPropagation" in t;
}
function vo(t) {
  return typeof t == "number" && t !== t;
}
function de(t, e) {
  try {
    return t instanceof e;
  } catch {
    return !1;
  }
}
function Or(t) {
  return !!(typeof t == "object" && t !== null && (t.__isVue || t._isVue));
}
function Dt(t, e = 0) {
  return typeof t != "string" || e === 0 || t.length <= e ? t : `${t.slice(0, e)}...`;
}
function yn(t, e) {
  if (!Array.isArray(t))
    return "";
  const n = [];
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    try {
      Or(i) ? n.push("[VueViewModel]") : n.push(String(i));
    } catch {
      n.push("[value cannot be serialized]");
    }
  }
  return n.join(e);
}
function bo(t, e, n = !1) {
  return Y(t) ? yo(e) ? e.test(t) : Y(e) ? n ? t === e : t.includes(e) : !1 : !1;
}
function nt(t, e = [], n = !1) {
  return e.some((r) => bo(t, r, n));
}
function Eo(t, e, n = 250, r, i, s, o) {
  if (!s.exception || !s.exception.values || !o || !de(o.originalException, Error))
    return;
  const a = s.exception.values.length > 0 ? s.exception.values[s.exception.values.length - 1] : void 0;
  a && (s.exception.values = So(
    Rt(
      t,
      e,
      i,
      o.originalException,
      r,
      s.exception.values,
      a,
      0
    ),
    n
  ));
}
function Rt(t, e, n, r, i, s, o, a) {
  if (s.length >= n + 1)
    return s;
  let c = [...s];
  if (de(r[i], Error)) {
    _n(o, a);
    const u = t(e, r[i]), l = c.length;
    vn(u, i, l, a), c = Rt(
      t,
      e,
      n,
      r[i],
      i,
      [u, ...c],
      u,
      l
    );
  }
  return Array.isArray(r.errors) && r.errors.forEach((u, l) => {
    if (de(u, Error)) {
      _n(o, a);
      const d = t(e, u), f = c.length;
      vn(d, `errors[${l}]`, f, a), c = Rt(
        t,
        e,
        n,
        u,
        i,
        [d, ...c],
        d,
        f
      );
    }
  }), c;
}
function _n(t, e) {
  t.mechanism = t.mechanism || { type: "generic", handled: !0 }, t.mechanism = {
    ...t.mechanism,
    ...t.type === "AggregateError" && { is_exception_group: !0 },
    exception_id: e
  };
}
function vn(t, e, n, r) {
  t.mechanism = t.mechanism || { type: "generic", handled: !0 }, t.mechanism = {
    ...t.mechanism,
    type: "chained",
    source: e,
    exception_id: n,
    parent_id: r
  };
}
function So(t, e) {
  return t.map((n) => (n.value && (n.value = Dt(n.value, e)), n));
}
function Ne(t) {
  return t && t.Math == Math ? t : void 0;
}
const v = typeof globalThis == "object" && Ne(globalThis) || // eslint-disable-next-line no-restricted-globals
typeof window == "object" && Ne(window) || typeof self == "object" && Ne(self) || typeof global == "object" && Ne(global) || function() {
  return this;
}() || {};
function Zt() {
  return v;
}
function xr(t, e, n) {
  const r = n || v, i = r.__SENTRY__ = r.__SENTRY__ || {};
  return i[t] || (i[t] = e());
}
const en = Zt(), wo = 80;
function Cr(t, e = {}) {
  if (!t)
    return "<unknown>";
  try {
    let n = t;
    const r = 5, i = [];
    let s = 0, o = 0;
    const a = " > ", c = a.length;
    let u;
    const l = Array.isArray(e) ? e : e.keyAttrs, d = !Array.isArray(e) && e.maxStringLength || wo;
    for (; n && s++ < r && (u = Oo(n, l), !(u === "html" || s > 1 && o + i.length * c + u.length >= d)); )
      i.push(u), o += u.length, n = n.parentNode;
    return i.reverse().join(a);
  } catch {
    return "<unknown>";
  }
}
function Oo(t, e) {
  const n = t, r = [];
  let i, s, o, a, c;
  if (!n || !n.tagName)
    return "";
  if (en.HTMLElement && n instanceof HTMLElement && n.dataset && n.dataset.sentryComponent)
    return n.dataset.sentryComponent;
  r.push(n.tagName.toLowerCase());
  const u = e && e.length ? e.filter((d) => n.getAttribute(d)).map((d) => [d, n.getAttribute(d)]) : null;
  if (u && u.length)
    u.forEach((d) => {
      r.push(`[${d[0]}="${d[1]}"]`);
    });
  else if (n.id && r.push(`#${n.id}`), i = n.className, i && Y(i))
    for (s = i.split(/\s+/), c = 0; c < s.length; c++)
      r.push(`.${s[c]}`);
  const l = ["aria-label", "type", "name", "title", "alt"];
  for (c = 0; c < l.length; c++)
    o = l[c], a = n.getAttribute(o), a && r.push(`[${o}="${a}"]`);
  return r.join("");
}
function xo() {
  try {
    return en.document.location.href;
  } catch {
    return "";
  }
}
function Co(t) {
  if (!en.HTMLElement)
    return null;
  let e = t;
  const n = 5;
  for (let r = 0; r < n; r++) {
    if (!e)
      return null;
    if (e instanceof HTMLElement && e.dataset.sentryComponent)
      return e.dataset.sentryComponent;
    e = e.parentNode;
  }
  return null;
}
const Ie = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, To = "Sentry Logger ", It = [
  "debug",
  "info",
  "warn",
  "error",
  "log",
  "assert",
  "trace"
], Ge = {};
function tn(t) {
  if (!("console" in v))
    return t();
  const e = v.console, n = {}, r = Object.keys(Ge);
  r.forEach((i) => {
    const s = Ge[i];
    n[i] = e[i], e[i] = s;
  });
  try {
    return t();
  } finally {
    r.forEach((i) => {
      e[i] = n[i];
    });
  }
}
function Do() {
  let t = !1;
  const e = {
    enable: () => {
      t = !0;
    },
    disable: () => {
      t = !1;
    },
    isEnabled: () => t
  };
  return Ie ? It.forEach((n) => {
    e[n] = (...r) => {
      t && tn(() => {
        v.console[n](`${To}[${n}]:`, ...r);
      });
    };
  }) : It.forEach((n) => {
    e[n] = () => {
    };
  }), e;
}
const g = Do(), Ro = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;
function Io(t) {
  return t === "http" || t === "https";
}
function Mo(t, e = !1) {
  const { host: n, path: r, pass: i, port: s, projectId: o, protocol: a, publicKey: c } = t;
  return `${a}://${c}${e && i ? `:${i}` : ""}@${n}${s ? `:${s}` : ""}/${r && `${r}/`}${o}`;
}
function No(t) {
  const e = Ro.exec(t);
  if (!e) {
    tn(() => {
      console.error(`Invalid Sentry Dsn: ${t}`);
    });
    return;
  }
  const [n, r, i = "", s, o = "", a] = e.slice(1);
  let c = "", u = a;
  const l = u.split("/");
  if (l.length > 1 && (c = l.slice(0, -1).join("/"), u = l.pop()), u) {
    const d = u.match(/^\d+/);
    d && (u = d[0]);
  }
  return Tr({ host: s, pass: i, path: c, projectId: u, port: o, protocol: n, publicKey: r });
}
function Tr(t) {
  return {
    protocol: t.protocol,
    publicKey: t.publicKey || "",
    pass: t.pass || "",
    host: t.host,
    port: t.port || "",
    path: t.path || "",
    projectId: t.projectId
  };
}
function Po(t) {
  if (!Ie)
    return !0;
  const { port: e, projectId: n, protocol: r } = t;
  return ["protocol", "publicKey", "host", "projectId"].find((o) => t[o] ? !1 : (g.error(`Invalid Sentry Dsn: ${o} missing`), !0)) ? !1 : n.match(/^\d+$/) ? Io(r) ? e && isNaN(parseInt(e, 10)) ? (g.error(`Invalid Sentry Dsn: Invalid port ${e}`), !1) : !0 : (g.error(`Invalid Sentry Dsn: Invalid protocol ${r}`), !1) : (g.error(`Invalid Sentry Dsn: Invalid projectId ${n}`), !1);
}
function $o(t) {
  const e = typeof t == "string" ? No(t) : Tr(t);
  if (!(!e || !Po(e)))
    return e;
}
function R(t, e, n) {
  if (!(e in t))
    return;
  const r = t[e], i = n(r);
  typeof i == "function" && Dr(i, r), t[e] = i;
}
function ze(t, e, n) {
  try {
    Object.defineProperty(t, e, {
      // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
      value: n,
      writable: !0,
      configurable: !0
    });
  } catch {
    Ie && g.log(`Failed to add non-enumerable property "${e}" to object`, t);
  }
}
function Dr(t, e) {
  try {
    const n = e.prototype || {};
    t.prototype = e.prototype = n, ze(t, "__sentry_original__", e);
  } catch {
  }
}
function nn(t) {
  return t.__sentry_original__;
}
function Rr(t) {
  if (Yt(t))
    return {
      message: t.message,
      name: t.name,
      stack: t.stack,
      ...En(t)
    };
  if (tt(t)) {
    const e = {
      type: t.type,
      target: bn(t.target),
      currentTarget: bn(t.currentTarget),
      ...En(t)
    };
    return typeof CustomEvent < "u" && de(t, CustomEvent) && (e.detail = t.detail), e;
  } else
    return t;
}
function bn(t) {
  try {
    return go(t) ? Cr(t) : Object.prototype.toString.call(t);
  } catch {
    return "<unknown>";
  }
}
function En(t) {
  if (typeof t == "object" && t !== null) {
    const e = {};
    for (const n in t)
      Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n]);
    return e;
  } else
    return {};
}
function Fo(t, e = 40) {
  const n = Object.keys(Rr(t));
  if (n.sort(), !n.length)
    return "[object has no keys]";
  if (n[0].length >= e)
    return Dt(n[0], e);
  for (let r = n.length; r > 0; r--) {
    const i = n.slice(0, r).join(", ");
    if (!(i.length > e))
      return r === n.length ? i : Dt(i, e);
  }
  return "";
}
function ae(t) {
  return Mt(t, /* @__PURE__ */ new Map());
}
function Mt(t, e) {
  if (Ao(t)) {
    const n = e.get(t);
    if (n !== void 0)
      return n;
    const r = {};
    e.set(t, r);
    for (const i of Object.keys(t))
      typeof t[i] < "u" && (r[i] = Mt(t[i], e));
    return r;
  }
  if (Array.isArray(t)) {
    const n = e.get(t);
    if (n !== void 0)
      return n;
    const r = [];
    return e.set(t, r), t.forEach((i) => {
      r.push(Mt(i, e));
    }), r;
  }
  return t;
}
function Ao(t) {
  if (!et(t))
    return !1;
  try {
    const e = Object.getPrototypeOf(t).constructor.name;
    return !e || e === "Object";
  } catch {
    return !0;
  }
}
const bt = "<anonymous>";
function re(t) {
  try {
    return !t || typeof t != "function" ? bt : t.name || bt;
  } catch {
    return bt;
  }
}
const He = {}, Sn = {};
function me(t, e) {
  He[t] = He[t] || [], He[t].push(e);
}
function ge(t, e) {
  Sn[t] || (e(), Sn[t] = !0);
}
function G(t, e) {
  const n = t && He[t];
  if (n)
    for (const r of n)
      try {
        r(e);
      } catch (i) {
        Ie && g.error(
          `Error while triggering instrumentation handler.
Type: ${t}
Name: ${re(r)}
Error:`,
          i
        );
      }
}
function ko(t) {
  const e = "console";
  me(e, t), ge(e, jo);
}
function jo() {
  "console" in v && It.forEach(function(t) {
    t in v.console && R(v.console, t, function(e) {
      return Ge[t] = e, function(...n) {
        G("console", { args: n, level: t });
        const i = Ge[t];
        i && i.apply(v.console, n);
      };
    });
  });
}
function z() {
  const t = v, e = t.crypto || t.msCrypto;
  let n = () => Math.random() * 16;
  try {
    if (e && e.randomUUID)
      return e.randomUUID().replace(/-/g, "");
    e && e.getRandomValues && (n = () => {
      const r = new Uint8Array(1);
      return e.getRandomValues(r), r[0];
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
function Ir(t) {
  return t.exception && t.exception.values ? t.exception.values[0] : void 0;
}
function te(t) {
  const { message: e, event_id: n } = t;
  if (e)
    return e;
  const r = Ir(t);
  return r ? r.type && r.value ? `${r.type}: ${r.value}` : r.type || r.value || n || "<unknown>" : n || "<unknown>";
}
function Nt(t, e, n) {
  const r = t.exception = t.exception || {}, i = r.values = r.values || [], s = i[0] = i[0] || {};
  s.value || (s.value = e || ""), s.type || (s.type = n || "Error");
}
function Pt(t, e) {
  const n = Ir(t);
  if (!n)
    return;
  const r = { type: "generic", handled: !0 }, i = n.mechanism;
  if (n.mechanism = { ...r, ...i, ...e }, e && "data" in e) {
    const s = { ...i && i.data, ...e.data };
    n.mechanism.data = s;
  }
}
function Lo(t) {
  return Array.isArray(t) ? t : [t];
}
const _e = v, Uo = 1e3;
let wn, $t, Ft;
function qo(t) {
  const e = "dom";
  me(e, t), ge(e, Ho);
}
function Ho() {
  if (!_e.document)
    return;
  const t = G.bind(null, "dom"), e = On(t, !0);
  _e.document.addEventListener("click", e, !1), _e.document.addEventListener("keypress", e, !1), ["EventTarget", "Node"].forEach((n) => {
    const r = _e[n] && _e[n].prototype;
    !r || !r.hasOwnProperty || !r.hasOwnProperty("addEventListener") || (R(r, "addEventListener", function(i) {
      return function(s, o, a) {
        if (s === "click" || s == "keypress")
          try {
            const c = this, u = c.__sentry_instrumentation_handlers__ = c.__sentry_instrumentation_handlers__ || {}, l = u[s] = u[s] || { refCount: 0 };
            if (!l.handler) {
              const d = On(t);
              l.handler = d, i.call(this, s, d, a);
            }
            l.refCount++;
          } catch {
          }
        return i.call(this, s, o, a);
      };
    }), R(
      r,
      "removeEventListener",
      function(i) {
        return function(s, o, a) {
          if (s === "click" || s == "keypress")
            try {
              const c = this, u = c.__sentry_instrumentation_handlers__ || {}, l = u[s];
              l && (l.refCount--, l.refCount <= 0 && (i.call(this, s, l.handler, a), l.handler = void 0, delete u[s]), Object.keys(u).length === 0 && delete c.__sentry_instrumentation_handlers__);
            } catch {
            }
          return i.call(this, s, o, a);
        };
      }
    ));
  });
}
function Bo(t) {
  if (t.type !== $t)
    return !1;
  try {
    if (!t.target || t.target._sentryId !== Ft)
      return !1;
  } catch {
  }
  return !0;
}
function Go(t, e) {
  return t !== "keypress" ? !1 : !e || !e.tagName ? !0 : !(e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.isContentEditable);
}
function On(t, e = !1) {
  return (n) => {
    if (!n || n._sentryCaptured)
      return;
    const r = zo(n);
    if (Go(n.type, r))
      return;
    ze(n, "_sentryCaptured", !0), r && !r._sentryId && ze(r, "_sentryId", z());
    const i = n.type === "keypress" ? "input" : n.type;
    Bo(n) || (t({ event: n, name: i, global: e }), $t = n.type, Ft = r ? r._sentryId : void 0), clearTimeout(wn), wn = _e.setTimeout(() => {
      Ft = void 0, $t = void 0;
    }, Uo);
  };
}
function zo(t) {
  try {
    return t.target;
  } catch {
    return null;
  }
}
const At = Zt();
function Qo() {
  if (!("fetch" in At))
    return !1;
  try {
    return new Headers(), new Request("http://www.example.com"), new Response(), !0;
  } catch {
    return !1;
  }
}
function xn(t) {
  return t && /^function fetch\(\)\s+\{\s+\[native code\]\s+\}$/.test(t.toString());
}
function Wo() {
  if (typeof EdgeRuntime == "string")
    return !0;
  if (!Qo())
    return !1;
  if (xn(At.fetch))
    return !0;
  let t = !1;
  const e = At.document;
  if (e && typeof e.createElement == "function")
    try {
      const n = e.createElement("iframe");
      n.hidden = !0, e.head.appendChild(n), n.contentWindow && n.contentWindow.fetch && (t = xn(n.contentWindow.fetch)), e.head.removeChild(n);
    } catch (n) {
      Ie && g.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", n);
    }
  return t;
}
function Ko(t) {
  const e = "fetch";
  me(e, t), ge(e, Vo);
}
function Vo() {
  Wo() && R(v, "fetch", function(t) {
    return function(...e) {
      const { method: n, url: r } = Yo(e), i = {
        args: e,
        fetchData: {
          method: n,
          url: r
        },
        startTimestamp: Date.now()
      };
      return G("fetch", {
        ...i
      }), t.apply(v, e).then(
        (s) => {
          const o = {
            ...i,
            endTimestamp: Date.now(),
            response: s
          };
          return G("fetch", o), s;
        },
        (s) => {
          const o = {
            ...i,
            endTimestamp: Date.now(),
            error: s
          };
          throw G("fetch", o), s;
        }
      );
    };
  });
}
function kt(t, e) {
  return !!t && typeof t == "object" && !!t[e];
}
function Cn(t) {
  return typeof t == "string" ? t : t ? kt(t, "url") ? t.url : t.toString ? t.toString() : "" : "";
}
function Yo(t) {
  if (t.length === 0)
    return { method: "GET", url: "" };
  if (t.length === 2) {
    const [n, r] = t;
    return {
      url: Cn(n),
      method: kt(r, "method") ? String(r.method).toUpperCase() : "GET"
    };
  }
  const e = t[0];
  return {
    url: Cn(e),
    method: kt(e, "method") ? String(e.method).toUpperCase() : "GET"
  };
}
let Pe = null;
function Xo(t) {
  const e = "error";
  me(e, t), ge(e, Jo);
}
function Jo() {
  Pe = v.onerror, v.onerror = function(t, e, n, r, i) {
    return G("error", {
      column: r,
      error: i,
      line: n,
      msg: t,
      url: e
    }), Pe && !Pe.__SENTRY_LOADER__ ? Pe.apply(this, arguments) : !1;
  }, v.onerror.__SENTRY_INSTRUMENTED__ = !0;
}
let $e = null;
function Zo(t) {
  const e = "unhandledrejection";
  me(e, t), ge(e, ea);
}
function ea() {
  $e = v.onunhandledrejection, v.onunhandledrejection = function(t) {
    return G("unhandledrejection", t), $e && !$e.__SENTRY_LOADER__ ? $e.apply(this, arguments) : !0;
  }, v.onunhandledrejection.__SENTRY_INSTRUMENTED__ = !0;
}
const Fe = Zt();
function ta() {
  const t = Fe.chrome, e = t && t.app && t.app.runtime, n = "history" in Fe && !!Fe.history.pushState && !!Fe.history.replaceState;
  return !e && n;
}
const Ce = v;
let Ae;
function na(t) {
  const e = "history";
  me(e, t), ge(e, ra);
}
function ra() {
  if (!ta())
    return;
  const t = Ce.onpopstate;
  Ce.onpopstate = function(...n) {
    const r = Ce.location.href, i = Ae;
    if (Ae = r, G("history", { from: i, to: r }), t)
      try {
        return t.apply(this, n);
      } catch {
      }
  };
  function e(n) {
    return function(...r) {
      const i = r.length > 2 ? r[2] : void 0;
      if (i) {
        const s = Ae, o = String(i);
        Ae = o, G("history", { from: s, to: o });
      }
      return n.apply(this, r);
    };
  }
  R(Ce.history, "pushState", e), R(Ce.history, "replaceState", e);
}
const ia = v, Te = "__sentry_xhr_v3__";
function sa(t) {
  const e = "xhr";
  me(e, t), ge(e, oa);
}
function oa() {
  if (!ia.XMLHttpRequest)
    return;
  const t = XMLHttpRequest.prototype;
  R(t, "open", function(e) {
    return function(...n) {
      const r = Date.now(), i = Y(n[0]) ? n[0].toUpperCase() : void 0, s = aa(n[1]);
      if (!i || !s)
        return e.apply(this, n);
      this[Te] = {
        method: i,
        url: s,
        request_headers: {}
      }, i === "POST" && s.match(/sentry_key/) && (this.__sentry_own_request__ = !0);
      const o = () => {
        const a = this[Te];
        if (a && this.readyState === 4) {
          try {
            a.status_code = this.status;
          } catch {
          }
          const c = {
            args: [i, s],
            endTimestamp: Date.now(),
            startTimestamp: r,
            xhr: this
          };
          G("xhr", c);
        }
      };
      return "onreadystatechange" in this && typeof this.onreadystatechange == "function" ? R(this, "onreadystatechange", function(a) {
        return function(...c) {
          return o(), a.apply(this, c);
        };
      }) : this.addEventListener("readystatechange", o), R(this, "setRequestHeader", function(a) {
        return function(...c) {
          const [u, l] = c, d = this[Te];
          return d && Y(u) && Y(l) && (d.request_headers[u.toLowerCase()] = l), a.apply(this, c);
        };
      }), e.apply(this, n);
    };
  }), R(t, "send", function(e) {
    return function(...n) {
      const r = this[Te];
      if (!r)
        return e.apply(this, n);
      n[0] !== void 0 && (r.body = n[0]);
      const i = {
        args: [r.method, r.url],
        startTimestamp: Date.now(),
        xhr: this
      };
      return G("xhr", i), e.apply(this, n);
    };
  });
}
function aa(t) {
  if (Y(t))
    return t;
  try {
    return t.toString();
  } catch {
  }
}
function ca() {
  const t = typeof WeakSet == "function", e = t ? /* @__PURE__ */ new WeakSet() : [];
  function n(i) {
    if (t)
      return e.has(i) ? !0 : (e.add(i), !1);
    for (let s = 0; s < e.length; s++)
      if (e[s] === i)
        return !0;
    return e.push(i), !1;
  }
  function r(i) {
    if (t)
      e.delete(i);
    else
      for (let s = 0; s < e.length; s++)
        if (e[s] === i) {
          e.splice(s, 1);
          break;
        }
  }
  return [n, r];
}
function ua(t, e = 100, n = 1 / 0) {
  try {
    return jt("", t, e, n);
  } catch (r) {
    return { ERROR: `**non-serializable** (${r})` };
  }
}
function Mr(t, e = 3, n = 100 * 1024) {
  const r = ua(t, e);
  return ha(r) > n ? Mr(t, e - 1, n) : r;
}
function jt(t, e, n = 1 / 0, r = 1 / 0, i = ca()) {
  const [s, o] = i;
  if (e == null || // this matches null and undefined -> eqeq not eqeqeq
  ["number", "boolean", "string"].includes(typeof e) && !vo(e))
    return e;
  const a = la(t, e);
  if (!a.startsWith("[object "))
    return a;
  if (e.__sentry_skip_normalization__)
    return e;
  const c = typeof e.__sentry_override_normalization_depth__ == "number" ? e.__sentry_override_normalization_depth__ : n;
  if (c === 0)
    return a.replace("object ", "");
  if (s(e))
    return "[Circular ~]";
  const u = e;
  if (u && typeof u.toJSON == "function")
    try {
      const h = u.toJSON();
      return jt("", h, c - 1, r, i);
    } catch {
    }
  const l = Array.isArray(e) ? [] : {};
  let d = 0;
  const f = Rr(e);
  for (const h in f) {
    if (!Object.prototype.hasOwnProperty.call(f, h))
      continue;
    if (d >= r) {
      l[h] = "[MaxProperties ~]";
      break;
    }
    const p = f[h];
    l[h] = jt(h, p, c - 1, r, i), d++;
  }
  return o(e), l;
}
function la(t, e) {
  try {
    if (t === "domain" && e && typeof e == "object" && e._events)
      return "[Domain]";
    if (t === "domainEmitter")
      return "[DomainEmitter]";
    if (typeof global < "u" && e === global)
      return "[Global]";
    if (typeof window < "u" && e === window)
      return "[Window]";
    if (typeof document < "u" && e === document)
      return "[Document]";
    if (Or(e))
      return "[VueViewModel]";
    if (_o(e))
      return "[SyntheticEvent]";
    if (typeof e == "number" && e !== e)
      return "[NaN]";
    if (typeof e == "function")
      return `[Function: ${re(e)}]`;
    if (typeof e == "symbol")
      return `[${String(e)}]`;
    if (typeof e == "bigint")
      return `[BigInt: ${String(e)}]`;
    const n = da(e);
    return /^HTML(\w*)Element$/.test(n) ? `[HTMLElement: ${n}]` : `[object ${n}]`;
  } catch (n) {
    return `**non-serializable** (${n})`;
  }
}
function da(t) {
  const e = Object.getPrototypeOf(t);
  return e ? e.constructor.name : "null prototype";
}
function fa(t) {
  return ~-encodeURI(t).split(/%..|./).length;
}
function ha(t) {
  return fa(JSON.stringify(t));
}
var K;
(function(t) {
  t[t.PENDING = 0] = "PENDING";
  const n = 1;
  t[t.RESOLVED = n] = "RESOLVED";
  const r = 2;
  t[t.REJECTED = r] = "REJECTED";
})(K || (K = {}));
class J {
  constructor(e) {
    J.prototype.__init.call(this), J.prototype.__init2.call(this), J.prototype.__init3.call(this), J.prototype.__init4.call(this), this._state = K.PENDING, this._handlers = [];
    try {
      e(this._resolve, this._reject);
    } catch (n) {
      this._reject(n);
    }
  }
  /** JSDoc */
  then(e, n) {
    return new J((r, i) => {
      this._handlers.push([
        !1,
        (s) => {
          if (!e)
            r(s);
          else
            try {
              r(e(s));
            } catch (o) {
              i(o);
            }
        },
        (s) => {
          if (!n)
            i(s);
          else
            try {
              r(n(s));
            } catch (o) {
              i(o);
            }
        }
      ]), this._executeHandlers();
    });
  }
  /** JSDoc */
  catch(e) {
    return this.then((n) => n, e);
  }
  /** JSDoc */
  finally(e) {
    return new J((n, r) => {
      let i, s;
      return this.then(
        (o) => {
          s = !1, i = o, e && e();
        },
        (o) => {
          s = !0, i = o, e && e();
        }
      ).then(() => {
        if (s) {
          r(i);
          return;
        }
        n(i);
      });
    });
  }
  /** JSDoc */
  __init() {
    this._resolve = (e) => {
      this._setResult(K.RESOLVED, e);
    };
  }
  /** JSDoc */
  __init2() {
    this._reject = (e) => {
      this._setResult(K.REJECTED, e);
    };
  }
  /** JSDoc */
  __init3() {
    this._setResult = (e, n) => {
      if (this._state === K.PENDING) {
        if (Jt(n)) {
          n.then(this._resolve, this._reject);
          return;
        }
        this._state = e, this._value = n, this._executeHandlers();
      }
    };
  }
  /** JSDoc */
  __init4() {
    this._executeHandlers = () => {
      if (this._state === K.PENDING)
        return;
      const e = this._handlers.slice();
      this._handlers = [], e.forEach((n) => {
        n[0] || (this._state === K.RESOLVED && n[1](this._value), this._state === K.REJECTED && n[2](this._value), n[0] = !0);
      });
    };
  }
}
function Et(t) {
  if (!t)
    return {};
  const e = t.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);
  if (!e)
    return {};
  const n = e[6] || "", r = e[8] || "";
  return {
    host: e[4],
    path: e[5],
    protocol: e[2],
    search: n,
    hash: r,
    relative: e[5] + n + r
    // everything minus origin
  };
}
const pa = ["fatal", "error", "warning", "log", "info", "debug"];
function ma(t) {
  return t === "warn" ? "warning" : pa.includes(t) ? t : "log";
}
const Nr = 1e3;
function rn() {
  return Date.now() / Nr;
}
function ga() {
  const { performance: t } = v;
  if (!t || !t.now)
    return rn;
  const e = Date.now() - t.now(), n = t.timeOrigin == null ? e : t.timeOrigin;
  return () => (n + t.now()) / Nr;
}
const Pr = ga();
(() => {
  const { performance: t } = v;
  if (!t || !t.now)
    return;
  const e = 3600 * 1e3, n = t.now(), r = Date.now(), i = t.timeOrigin ? Math.abs(t.timeOrigin + n - r) : e, s = i < e, o = t.timing && t.timing.navigationStart, c = typeof o == "number" ? Math.abs(o + n - r) : e, u = c < e;
  return s || u ? i <= c ? t.timeOrigin : o : r;
})();
const q = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, $r = "production";
function ya() {
  return xr("globalEventProcessors", () => []);
}
function Lt(t, e, n, r = 0) {
  return new J((i, s) => {
    const o = t[r];
    if (e === null || typeof o != "function")
      i(e);
    else {
      const a = o({ ...e }, n);
      q && o.id && a === null && g.log(`Event processor "${o.id}" dropped event`), Jt(a) ? a.then((c) => Lt(t, c, n, r + 1).then(i)).then(null, s) : Lt(t, a, n, r + 1).then(i).then(null, s);
    }
  });
}
function _a(t) {
  const e = Pr(), n = {
    sid: z(),
    init: !0,
    timestamp: e,
    started: e,
    duration: 0,
    status: "ok",
    errors: 0,
    ignoreDuration: !1,
    toJSON: () => ba(n)
  };
  return t && rt(n, t), n;
}
function rt(t, e = {}) {
  if (e.user && (!t.ipAddress && e.user.ip_address && (t.ipAddress = e.user.ip_address), !t.did && !e.did && (t.did = e.user.id || e.user.email || e.user.username)), t.timestamp = e.timestamp || Pr(), e.abnormal_mechanism && (t.abnormal_mechanism = e.abnormal_mechanism), e.ignoreDuration && (t.ignoreDuration = e.ignoreDuration), e.sid && (t.sid = e.sid.length === 32 ? e.sid : z()), e.init !== void 0 && (t.init = e.init), !t.did && e.did && (t.did = `${e.did}`), typeof e.started == "number" && (t.started = e.started), t.ignoreDuration)
    t.duration = void 0;
  else if (typeof e.duration == "number")
    t.duration = e.duration;
  else {
    const n = t.timestamp - t.started;
    t.duration = n >= 0 ? n : 0;
  }
  e.release && (t.release = e.release), e.environment && (t.environment = e.environment), !t.ipAddress && e.ipAddress && (t.ipAddress = e.ipAddress), !t.userAgent && e.userAgent && (t.userAgent = e.userAgent), typeof e.errors == "number" && (t.errors = e.errors), e.status && (t.status = e.status);
}
function va(t, e) {
  let n = {};
  e ? n = { status: e } : t.status === "ok" && (n = { status: "exited" }), rt(t, n);
}
function ba(t) {
  return ae({
    sid: `${t.sid}`,
    init: t.init,
    // Make sure that sec is converted to ms for date constructor
    started: new Date(t.started * 1e3).toISOString(),
    timestamp: new Date(t.timestamp * 1e3).toISOString(),
    status: t.status,
    errors: t.errors,
    did: typeof t.did == "number" || typeof t.did == "string" ? `${t.did}` : void 0,
    duration: t.duration,
    abnormal_mechanism: t.abnormal_mechanism,
    attrs: {
      release: t.release,
      environment: t.environment,
      ip_address: t.ipAddress,
      user_agent: t.userAgent
    }
  });
}
const Ea = 1;
function Sa(t) {
  const { spanId: e, traceId: n } = t.spanContext(), { data: r, op: i, parent_span_id: s, status: o, tags: a, origin: c } = Qe(t);
  return ae({
    data: r,
    op: i,
    parent_span_id: s,
    span_id: e,
    status: o,
    tags: a,
    trace_id: n,
    origin: c
  });
}
function Qe(t) {
  return wa(t) ? t.getSpanJSON() : typeof t.toJSON == "function" ? t.toJSON() : {};
}
function wa(t) {
  return typeof t.getSpanJSON == "function";
}
function Oa(t) {
  const { traceFlags: e } = t.spanContext();
  return !!(e & Ea);
}
function xa(t) {
  if (t)
    return Ca(t) ? { captureContext: t } : Da(t) ? {
      captureContext: t
    } : t;
}
function Ca(t) {
  return t instanceof le || typeof t == "function";
}
const Ta = [
  "user",
  "level",
  "extra",
  "contexts",
  "tags",
  "fingerprint",
  "requestSession",
  "propagationContext"
];
function Da(t) {
  return Object.keys(t).some((e) => Ta.includes(e));
}
function Fr(t, e) {
  return ye().captureException(t, xa(e));
}
function Ar(t, e) {
  return ye().captureEvent(t, e);
}
function fe(t, e) {
  ye().addBreadcrumb(t, e);
}
function kr(...t) {
  const e = ye();
  if (t.length === 2) {
    const [n, r] = t;
    return n ? e.withScope(() => (e.getStackTop().scope = n, r(n))) : e.withScope(r);
  }
  return e.withScope(t[0]);
}
function $() {
  return ye().getClient();
}
function Ra() {
  return ye().getScope();
}
function jr(t) {
  return t.transaction;
}
function Ia(t, e, n) {
  const r = e.getOptions(), { publicKey: i } = e.getDsn() || {}, { segment: s } = n && n.getUser() || {}, o = ae({
    environment: r.environment || $r,
    release: r.release,
    user_segment: s,
    public_key: i,
    trace_id: t
  });
  return e.emit && e.emit("createDsc", o), o;
}
function Ma(t) {
  const e = $();
  if (!e)
    return {};
  const n = Ia(Qe(t).trace_id || "", e, Ra()), r = jr(t);
  if (!r)
    return n;
  const i = r && r._frozenDynamicSamplingContext;
  if (i)
    return i;
  const { sampleRate: s, source: o } = r.metadata;
  s != null && (n.sample_rate = `${s}`);
  const a = Qe(r);
  return o && o !== "url" && (n.transaction = a.description), n.sampled = String(Oa(r)), e.emit && e.emit("createDsc", n), n;
}
function Na(t, e) {
  const { fingerprint: n, span: r, breadcrumbs: i, sdkProcessingMetadata: s } = e;
  Pa(t, e), r && Aa(t, r), ka(t, n), $a(t, i), Fa(t, s);
}
function Pa(t, e) {
  const {
    extra: n,
    tags: r,
    user: i,
    contexts: s,
    level: o,
    // eslint-disable-next-line deprecation/deprecation
    transactionName: a
  } = e, c = ae(n);
  c && Object.keys(c).length && (t.extra = { ...c, ...t.extra });
  const u = ae(r);
  u && Object.keys(u).length && (t.tags = { ...u, ...t.tags });
  const l = ae(i);
  l && Object.keys(l).length && (t.user = { ...l, ...t.user });
  const d = ae(s);
  d && Object.keys(d).length && (t.contexts = { ...d, ...t.contexts }), o && (t.level = o), a && (t.transaction = a);
}
function $a(t, e) {
  const n = [...t.breadcrumbs || [], ...e];
  t.breadcrumbs = n.length ? n : void 0;
}
function Fa(t, e) {
  t.sdkProcessingMetadata = {
    ...t.sdkProcessingMetadata,
    ...e
  };
}
function Aa(t, e) {
  t.contexts = { trace: Sa(e), ...t.contexts };
  const n = jr(e);
  if (n) {
    t.sdkProcessingMetadata = {
      dynamicSamplingContext: Ma(e),
      ...t.sdkProcessingMetadata
    };
    const r = Qe(n).description;
    r && (t.tags = { transaction: r, ...t.tags });
  }
}
function ka(t, e) {
  t.fingerprint = t.fingerprint ? Lo(t.fingerprint) : [], e && (t.fingerprint = t.fingerprint.concat(e)), t.fingerprint && !t.fingerprint.length && delete t.fingerprint;
}
const ja = 100;
class le {
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
    this._notifyingListeners = !1, this._scopeListeners = [], this._eventProcessors = [], this._breadcrumbs = [], this._attachments = [], this._user = {}, this._tags = {}, this._extra = {}, this._contexts = {}, this._sdkProcessingMetadata = {}, this._propagationContext = Tn();
  }
  /**
   * Inherit values from the parent scope.
   * @deprecated Use `scope.clone()` and `new Scope()` instead.
   */
  static clone(e) {
    return e ? e.clone() : new le();
  }
  /**
   * Clone this scope instance.
   */
  clone() {
    const e = new le();
    return e._breadcrumbs = [...this._breadcrumbs], e._tags = { ...this._tags }, e._extra = { ...this._extra }, e._contexts = { ...this._contexts }, e._user = this._user, e._level = this._level, e._span = this._span, e._session = this._session, e._transactionName = this._transactionName, e._fingerprint = this._fingerprint, e._eventProcessors = [...this._eventProcessors], e._requestSession = this._requestSession, e._attachments = [...this._attachments], e._sdkProcessingMetadata = { ...this._sdkProcessingMetadata }, e._propagationContext = { ...this._propagationContext }, e._client = this._client, e;
  }
  /** Update the client on the scope. */
  setClient(e) {
    this._client = e;
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
  addScopeListener(e) {
    this._scopeListeners.push(e);
  }
  /**
   * @inheritDoc
   */
  addEventProcessor(e) {
    return this._eventProcessors.push(e), this;
  }
  /**
   * @inheritDoc
   */
  setUser(e) {
    return this._user = e || {
      email: void 0,
      id: void 0,
      ip_address: void 0,
      segment: void 0,
      username: void 0
    }, this._session && rt(this._session, { user: e }), this._notifyScopeListeners(), this;
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
  setRequestSession(e) {
    return this._requestSession = e, this;
  }
  /**
   * @inheritDoc
   */
  setTags(e) {
    return this._tags = {
      ...this._tags,
      ...e
    }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setTag(e, n) {
    return this._tags = { ...this._tags, [e]: n }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setExtras(e) {
    return this._extra = {
      ...this._extra,
      ...e
    }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setExtra(e, n) {
    return this._extra = { ...this._extra, [e]: n }, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setFingerprint(e) {
    return this._fingerprint = e, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setLevel(e) {
    return this._level = e, this._notifyScopeListeners(), this;
  }
  /**
   * Sets the transaction name on the scope for future events.
   */
  setTransactionName(e) {
    return this._transactionName = e, this._notifyScopeListeners(), this;
  }
  /**
   * @inheritDoc
   */
  setContext(e, n) {
    return n === null ? delete this._contexts[e] : this._contexts[e] = n, this._notifyScopeListeners(), this;
  }
  /**
   * Sets the Span on the scope.
   * @param span Span
   * @deprecated Instead of setting a span on a scope, use `startSpan()`/`startSpanManual()` instead.
   */
  setSpan(e) {
    return this._span = e, this._notifyScopeListeners(), this;
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
    const e = this._span;
    return e && e.transaction;
  }
  /**
   * @inheritDoc
   */
  setSession(e) {
    return e ? this._session = e : delete this._session, this._notifyScopeListeners(), this;
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
  update(e) {
    if (!e)
      return this;
    const n = typeof e == "function" ? e(this) : e;
    if (n instanceof le) {
      const r = n.getScopeData();
      this._tags = { ...this._tags, ...r.tags }, this._extra = { ...this._extra, ...r.extra }, this._contexts = { ...this._contexts, ...r.contexts }, r.user && Object.keys(r.user).length && (this._user = r.user), r.level && (this._level = r.level), r.fingerprint.length && (this._fingerprint = r.fingerprint), n.getRequestSession() && (this._requestSession = n.getRequestSession()), r.propagationContext && (this._propagationContext = r.propagationContext);
    } else if (et(n)) {
      const r = e;
      this._tags = { ...this._tags, ...r.tags }, this._extra = { ...this._extra, ...r.extra }, this._contexts = { ...this._contexts, ...r.contexts }, r.user && (this._user = r.user), r.level && (this._level = r.level), r.fingerprint && (this._fingerprint = r.fingerprint), r.requestSession && (this._requestSession = r.requestSession), r.propagationContext && (this._propagationContext = r.propagationContext);
    }
    return this;
  }
  /**
   * @inheritDoc
   */
  clear() {
    return this._breadcrumbs = [], this._tags = {}, this._extra = {}, this._user = {}, this._contexts = {}, this._level = void 0, this._transactionName = void 0, this._fingerprint = void 0, this._requestSession = void 0, this._span = void 0, this._session = void 0, this._notifyScopeListeners(), this._attachments = [], this._propagationContext = Tn(), this;
  }
  /**
   * @inheritDoc
   */
  addBreadcrumb(e, n) {
    const r = typeof n == "number" ? n : ja;
    if (r <= 0)
      return this;
    const i = {
      timestamp: rn(),
      ...e
    }, s = this._breadcrumbs;
    return s.push(i), this._breadcrumbs = s.length > r ? s.slice(-r) : s, this._notifyScopeListeners(), this;
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
  addAttachment(e) {
    return this._attachments.push(e), this;
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
      _breadcrumbs: e,
      _attachments: n,
      _contexts: r,
      _tags: i,
      _extra: s,
      _user: o,
      _level: a,
      _fingerprint: c,
      _eventProcessors: u,
      _propagationContext: l,
      _sdkProcessingMetadata: d,
      _transactionName: f,
      _span: h
    } = this;
    return {
      breadcrumbs: e,
      attachments: n,
      contexts: r,
      tags: i,
      extra: s,
      user: o,
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
  applyToEvent(e, n = {}, r = []) {
    Na(e, this.getScopeData());
    const i = [
      ...r,
      // eslint-disable-next-line deprecation/deprecation
      ...ya(),
      ...this._eventProcessors
    ];
    return Lt(i, e, n);
  }
  /**
   * Add data which will be accessible during event processing but won't get sent to Sentry
   */
  setSDKProcessingMetadata(e) {
    return this._sdkProcessingMetadata = { ...this._sdkProcessingMetadata, ...e }, this;
  }
  /**
   * @inheritDoc
   */
  setPropagationContext(e) {
    return this._propagationContext = e, this;
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
  captureException(e, n) {
    const r = n && n.event_id ? n.event_id : z();
    if (!this._client)
      return g.warn("No client configured on scope - will not capture exception!"), r;
    const i = new Error("Sentry syntheticException");
    return this._client.captureException(
      e,
      {
        originalException: e,
        syntheticException: i,
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
  captureMessage(e, n, r) {
    const i = r && r.event_id ? r.event_id : z();
    if (!this._client)
      return g.warn("No client configured on scope - will not capture message!"), i;
    const s = new Error(e);
    return this._client.captureMessage(
      e,
      n,
      {
        originalException: e,
        syntheticException: s,
        ...r,
        event_id: i
      },
      this
    ), i;
  }
  /**
   * Captures a manually created event for this scope and sends it to Sentry.
   *
   * @param exception The event to capture.
   * @param hint Optional additional data to attach to the Sentry event.
   * @returns the id of the captured event.
   */
  captureEvent(e, n) {
    const r = n && n.event_id ? n.event_id : z();
    return this._client ? (this._client.captureEvent(e, { ...n, event_id: r }, this), r) : (g.warn("No client configured on scope - will not capture event!"), r);
  }
  /**
   * This will be called on every set call.
   */
  _notifyScopeListeners() {
    this._notifyingListeners || (this._notifyingListeners = !0, this._scopeListeners.forEach((e) => {
      e(this);
    }), this._notifyingListeners = !1);
  }
}
function Tn() {
  return {
    traceId: z(),
    spanId: z().substring(16)
  };
}
const La = "7.119.2", Lr = parseFloat(La), Ua = 100;
class Ur {
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
  constructor(e, n, r, i = Lr) {
    this._version = i;
    let s;
    n ? s = n : (s = new le(), s.setClient(e));
    let o;
    r ? o = r : (o = new le(), o.setClient(e)), this._stack = [{ scope: s }], e && this.bindClient(e), this._isolationScope = o;
  }
  /**
   * Checks if this hub's version is older than the given version.
   *
   * @param version A version number to compare to.
   * @return True if the given version is newer; otherwise false.
   *
   * @deprecated This will be removed in v8.
   */
  isOlderThan(e) {
    return this._version < e;
  }
  /**
   * This binds the given client to the current scope.
   * @param client An SDK client (client) instance.
   *
   * @deprecated Use `initAndBind()` directly, or `setCurrentClient()` and/or `client.init()` instead.
   */
  bindClient(e) {
    const n = this.getStackTop();
    n.client = e, n.scope.setClient(e), e && e.setupIntegrations && e.setupIntegrations();
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `withScope` instead.
   */
  pushScope() {
    const e = this.getScope().clone();
    return this.getStack().push({
      // eslint-disable-next-line deprecation/deprecation
      client: this.getClient(),
      scope: e
    }), e;
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
  withScope(e) {
    const n = this.pushScope();
    let r;
    try {
      r = e(n);
    } catch (i) {
      throw this.popScope(), i;
    }
    return Jt(r) ? r.then(
      (i) => (this.popScope(), i),
      (i) => {
        throw this.popScope(), i;
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
  captureException(e, n) {
    const r = this._lastEventId = n && n.event_id ? n.event_id : z(), i = new Error("Sentry syntheticException");
    return this.getScope().captureException(e, {
      originalException: e,
      syntheticException: i,
      ...n,
      event_id: r
    }), r;
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use  `Sentry.captureMessage()` instead.
   */
  captureMessage(e, n, r) {
    const i = this._lastEventId = r && r.event_id ? r.event_id : z(), s = new Error(e);
    return this.getScope().captureMessage(e, n, {
      originalException: e,
      syntheticException: s,
      ...r,
      event_id: i
    }), i;
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `Sentry.captureEvent()` instead.
   */
  captureEvent(e, n) {
    const r = n && n.event_id ? n.event_id : z();
    return e.type || (this._lastEventId = r), this.getScope().captureEvent(e, { ...n, event_id: r }), r;
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
  addBreadcrumb(e, n) {
    const { scope: r, client: i } = this.getStackTop();
    if (!i)
      return;
    const { beforeBreadcrumb: s = null, maxBreadcrumbs: o = Ua } = i.getOptions && i.getOptions() || {};
    if (o <= 0)
      return;
    const c = { timestamp: rn(), ...e }, u = s ? tn(() => s(c, n)) : c;
    u !== null && (i.emit && i.emit("beforeAddBreadcrumb", u, n), r.addBreadcrumb(u, o));
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setUser()` instead.
   */
  setUser(e) {
    this.getScope().setUser(e), this.getIsolationScope().setUser(e);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setTags()` instead.
   */
  setTags(e) {
    this.getScope().setTags(e), this.getIsolationScope().setTags(e);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setExtras()` instead.
   */
  setExtras(e) {
    this.getScope().setExtras(e), this.getIsolationScope().setExtras(e);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setTag()` instead.
   */
  setTag(e, n) {
    this.getScope().setTag(e, n), this.getIsolationScope().setTag(e, n);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setExtra()` instead.
   */
  setExtra(e, n) {
    this.getScope().setExtra(e, n), this.getIsolationScope().setExtra(e, n);
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.setContext()` instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setContext(e, n) {
    this.getScope().setContext(e, n), this.getIsolationScope().setContext(e, n);
  }
  /**
   * @inheritDoc
   *
   * @deprecated Use `getScope()` directly.
   */
  configureScope(e) {
    const { scope: n, client: r } = this.getStackTop();
    r && e(n);
  }
  /**
   * @inheritDoc
   */
  // eslint-disable-next-line deprecation/deprecation
  run(e) {
    const n = Dn(this);
    try {
      e(this);
    } finally {
      Dn(n);
    }
  }
  /**
   * @inheritDoc
   * @deprecated Use `Sentry.getClient().getIntegrationByName()` instead.
   */
  getIntegration(e) {
    const n = this.getClient();
    if (!n)
      return null;
    try {
      return n.getIntegration(e);
    } catch {
      return q && g.warn(`Cannot retrieve integration ${e.id} from the current Hub`), null;
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
  startTransaction(e, n) {
    const r = this._callExtensionMethod("startTransaction", e, n);
    return q && !r && (this.getClient() ? g.warn(`Tracing extension 'startTransaction' has not been added. Call 'addTracingExtensions' before calling 'init':
Sentry.addTracingExtensions();
Sentry.init({...});
`) : g.warn(
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
  captureSession(e = !1) {
    if (e)
      return this.endSession();
    this._sendSessionUpdate();
  }
  /**
   * @inheritDoc
   * @deprecated Use top level `endSession` instead.
   */
  endSession() {
    const n = this.getStackTop().scope, r = n.getSession();
    r && va(r), this._sendSessionUpdate(), n.setSession();
  }
  /**
   * @inheritDoc
   * @deprecated Use top level `startSession` instead.
   */
  startSession(e) {
    const { scope: n, client: r } = this.getStackTop(), { release: i, environment: s = $r } = r && r.getOptions() || {}, { userAgent: o } = v.navigator || {}, a = _a({
      release: i,
      environment: s,
      user: n.getUser(),
      ...o && { userAgent: o },
      ...e
    }), c = n.getSession && n.getSession();
    return c && c.status === "ok" && rt(c, { status: "exited" }), this.endSession(), n.setSession(a), a;
  }
  /**
   * Returns if default PII should be sent to Sentry and propagated in ourgoing requests
   * when Tracing is used.
   *
   * @deprecated Use top-level `getClient().getOptions().sendDefaultPii` instead. This function
   * only unnecessarily increased API surface but only wrapped accessing the option.
   */
  shouldSendDefaultPii() {
    const e = this.getClient(), n = e && e.getOptions();
    return !!(n && n.sendDefaultPii);
  }
  /**
   * Sends the current Session on the scope
   */
  _sendSessionUpdate() {
    const { scope: e, client: n } = this.getStackTop(), r = e.getSession();
    r && n && n.captureSession && n.captureSession(r);
  }
  /**
   * Calls global extension method and binding current instance to the function call
   */
  // @ts-expect-error Function lacks ending return statement and return type does not include 'undefined'. ts(2366)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _callExtensionMethod(e, ...n) {
    const i = it().__SENTRY__;
    if (i && i.extensions && typeof i.extensions[e] == "function")
      return i.extensions[e].apply(this, n);
    q && g.warn(`Extension method ${e} couldn't be found, doing nothing.`);
  }
}
function it() {
  return v.__SENTRY__ = v.__SENTRY__ || {
    extensions: {},
    hub: void 0
  }, v;
}
function Dn(t) {
  const e = it(), n = Ut(e);
  return qr(e, t), n;
}
function ye() {
  const t = it();
  if (t.__SENTRY__ && t.__SENTRY__.acs) {
    const e = t.__SENTRY__.acs.getCurrentHub();
    if (e)
      return e;
  }
  return qa(t);
}
function qa(t = it()) {
  return (!Ha(t) || // eslint-disable-next-line deprecation/deprecation
  Ut(t).isOlderThan(Lr)) && qr(t, new Ur()), Ut(t);
}
function Ha(t) {
  return !!(t && t.__SENTRY__ && t.__SENTRY__.hub);
}
function Ut(t) {
  return xr("hub", () => new Ur(), t);
}
function qr(t, e) {
  if (!t)
    return !1;
  const n = t.__SENTRY__ = t.__SENTRY__ || {};
  return n.hub = e, !0;
}
function Ba(t) {
  const e = t.protocol ? `${t.protocol}:` : "", n = t.port ? `:${t.port}` : "";
  return `${e}//${t.host}${n}${t.path ? `/${t.path}` : ""}/api/`;
}
function Ga(t, e) {
  const n = $o(t);
  if (!n)
    return "";
  const r = `${Ba(n)}embed/error-page/`;
  let i = `dsn=${Mo(n)}`;
  for (const s in e)
    if (s !== "dsn" && s !== "onClose")
      if (s === "user") {
        const o = e.user;
        if (!o)
          continue;
        o.name && (i += `&name=${encodeURIComponent(o.name)}`), o.email && (i += `&email=${encodeURIComponent(o.email)}`);
      } else
        i += `&${encodeURIComponent(s)}=${encodeURIComponent(e[s])}`;
  return `${r}?${i}`;
}
function se(t, e) {
  return Object.assign(
    function(...r) {
      return e(...r);
    },
    { id: t }
  );
}
const za = [
  /^Script error\.?$/,
  /^Javascript error: Script error\.? on line 0$/,
  /^ResizeObserver loop completed with undelivered notifications.$/,
  /^Cannot redefine property: googletag$/
], Qa = [
  /^.*\/healthcheck$/,
  /^.*\/healthy$/,
  /^.*\/live$/,
  /^.*\/ready$/,
  /^.*\/heartbeat$/,
  /^.*\/health$/,
  /^.*\/healthz$/
], Hr = "InboundFilters", Wa = (t = {}) => ({
  name: Hr,
  // TODO v8: Remove this
  setupOnce() {
  },
  // eslint-disable-line @typescript-eslint/no-empty-function
  processEvent(e, n, r) {
    const i = r.getOptions(), s = Ka(t, i);
    return Va(e, s) ? null : e;
  }
}), Br = Wa;
se(
  Hr,
  Br
);
function Ka(t = {}, e = {}) {
  return {
    allowUrls: [...t.allowUrls || [], ...e.allowUrls || []],
    denyUrls: [...t.denyUrls || [], ...e.denyUrls || []],
    ignoreErrors: [
      ...t.ignoreErrors || [],
      ...e.ignoreErrors || [],
      ...t.disableErrorDefaults ? [] : za
    ],
    ignoreTransactions: [
      ...t.ignoreTransactions || [],
      ...e.ignoreTransactions || [],
      ...t.disableTransactionDefaults ? [] : Qa
    ],
    ignoreInternal: t.ignoreInternal !== void 0 ? t.ignoreInternal : !0
  };
}
function Va(t, e) {
  return e.ignoreInternal && tc(t) ? (q && g.warn(`Event dropped due to being internal Sentry Error.
Event: ${te(t)}`), !0) : Ya(t, e.ignoreErrors) ? (q && g.warn(
    `Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${te(t)}`
  ), !0) : Xa(t, e.ignoreTransactions) ? (q && g.warn(
    `Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${te(t)}`
  ), !0) : Ja(t, e.denyUrls) ? (q && g.warn(
    `Event dropped due to being matched by \`denyUrls\` option.
Event: ${te(
      t
    )}.
Url: ${We(t)}`
  ), !0) : Za(t, e.allowUrls) ? !1 : (q && g.warn(
    `Event dropped due to not being matched by \`allowUrls\` option.
Event: ${te(
      t
    )}.
Url: ${We(t)}`
  ), !0);
}
function Ya(t, e) {
  return t.type || !e || !e.length ? !1 : ec(t).some((n) => nt(n, e));
}
function Xa(t, e) {
  if (t.type !== "transaction" || !e || !e.length)
    return !1;
  const n = t.transaction;
  return n ? nt(n, e) : !1;
}
function Ja(t, e) {
  if (!e || !e.length)
    return !1;
  const n = We(t);
  return n ? nt(n, e) : !1;
}
function Za(t, e) {
  if (!e || !e.length)
    return !0;
  const n = We(t);
  return n ? nt(n, e) : !0;
}
function ec(t) {
  const e = [];
  t.message && e.push(t.message);
  let n;
  try {
    n = t.exception.values[t.exception.values.length - 1];
  } catch {
  }
  return n && n.value && (e.push(n.value), n.type && e.push(`${n.type}: ${n.value}`)), q && e.length === 0 && g.error(`Could not extract message for event ${te(t)}`), e;
}
function tc(t) {
  try {
    return t.exception.values[0].type === "SentryError";
  } catch {
  }
  return !1;
}
function nc(t = []) {
  for (let e = t.length - 1; e >= 0; e--) {
    const n = t[e];
    if (n && n.filename !== "<anonymous>" && n.filename !== "[native code]")
      return n.filename || null;
  }
  return null;
}
function We(t) {
  try {
    let e;
    try {
      e = t.exception.values[0].stacktrace.frames;
    } catch {
    }
    return e ? nc(e) : null;
  } catch {
    return q && g.error(`Cannot extract url for event ${te(t)}`), null;
  }
}
let Rn;
const Gr = "FunctionToString", In = /* @__PURE__ */ new WeakMap(), rc = () => ({
  name: Gr,
  setupOnce() {
    Rn = Function.prototype.toString;
    try {
      Function.prototype.toString = function(...t) {
        const e = nn(this), n = In.has($()) && e !== void 0 ? e : this;
        return Rn.apply(n, t);
      };
    } catch {
    }
  },
  setup(t) {
    In.set(t, !0);
  }
}), zr = rc;
se(
  Gr,
  zr
);
const x = v;
let qt = 0;
function Qr() {
  return qt > 0;
}
function ic() {
  qt++, setTimeout(() => {
    qt--;
  });
}
function Se(t, e = {}, n) {
  if (typeof t != "function")
    return t;
  try {
    const i = t.__sentry_wrapped__;
    if (i)
      return typeof i == "function" ? i : t;
    if (nn(t))
      return t;
  } catch {
    return t;
  }
  const r = function() {
    const i = Array.prototype.slice.call(arguments);
    try {
      n && typeof n == "function" && n.apply(this, arguments);
      const s = i.map((o) => Se(o, e));
      return t.apply(this, s);
    } catch (s) {
      throw ic(), kr((o) => {
        o.addEventProcessor((a) => (e.mechanism && (Nt(a, void 0, void 0), Pt(a, e.mechanism)), a.extra = {
          ...a.extra,
          arguments: i
        }, a)), Fr(s);
      }), s;
    }
  };
  try {
    for (const i in t)
      Object.prototype.hasOwnProperty.call(t, i) && (r[i] = t[i]);
  } catch {
  }
  Dr(r, t), ze(t, "__sentry_wrapped__", r);
  try {
    Object.getOwnPropertyDescriptor(r, "name").configurable && Object.defineProperty(r, "name", {
      get() {
        return t.name;
      }
    });
  } catch {
  }
  return r;
}
const Ee = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function Wr(t, e) {
  const n = sn(t, e), r = {
    type: e && e.name,
    value: cc(e)
  };
  return n.length && (r.stacktrace = { frames: n }), r.type === void 0 && r.value === "" && (r.value = "Unrecoverable error caught"), r;
}
function sc(t, e, n, r) {
  const i = $(), s = i && i.getOptions().normalizeDepth, o = {
    exception: {
      values: [
        {
          type: tt(e) ? e.constructor.name : r ? "UnhandledRejection" : "Error",
          value: uc(e, { isUnhandledRejection: r })
        }
      ]
    },
    extra: {
      __serialized__: Mr(e, s)
    }
  };
  if (n) {
    const a = sn(t, n);
    a.length && (o.exception.values[0].stacktrace = { frames: a });
  }
  return o;
}
function St(t, e) {
  return {
    exception: {
      values: [Wr(t, e)]
    }
  };
}
function sn(t, e) {
  const n = e.stacktrace || e.stack || "", r = ac(e);
  try {
    return t(n, r);
  } catch {
  }
  return [];
}
const oc = /Minified React error #\d+;/i;
function ac(t) {
  if (t) {
    if (typeof t.framesToPop == "number")
      return t.framesToPop;
    if (oc.test(t.message))
      return 1;
  }
  return 0;
}
function cc(t) {
  const e = t && t.message;
  return e ? e.error && typeof e.error.message == "string" ? e.error.message : e : "No error message";
}
function Kr(t, e, n, r, i) {
  let s;
  if (Xt(e) && e.error)
    return St(t, e.error);
  if (gn(e) || mo(e)) {
    const o = e;
    if ("stack" in e)
      s = St(t, e);
    else {
      const a = o.name || (gn(o) ? "DOMError" : "DOMException"), c = o.message ? `${a}: ${o.message}` : a;
      s = Mn(t, c, n, r), Nt(s, c);
    }
    return "code" in o && (s.tags = { ...s.tags, "DOMException.code": `${o.code}` }), s;
  }
  return Yt(e) ? St(t, e) : et(e) || tt(e) ? (s = sc(t, e, n, i), Pt(s, {
    synthetic: !0
  }), s) : (s = Mn(t, e, n, r), Nt(s, `${e}`, void 0), Pt(s, {
    synthetic: !0
  }), s);
}
function Mn(t, e, n, r) {
  const i = {};
  if (r && n) {
    const s = sn(t, n);
    s.length && (i.exception = {
      values: [{ value: e, stacktrace: { frames: s } }]
    });
  }
  if (Sr(e)) {
    const { __sentry_template_string__: s, __sentry_template_values__: o } = e;
    return i.logentry = {
      message: s,
      params: o
    }, i;
  }
  return i.message = e, i;
}
function uc(t, { isUnhandledRejection: e }) {
  const n = Fo(t), r = e ? "promise rejection" : "exception";
  return Xt(t) ? `Event \`ErrorEvent\` captured as ${r} with message \`${t.message}\`` : tt(t) ? `Event \`${lc(t)}\` (type=${t.type}) captured as ${r}` : `Object captured as ${r} with keys: ${n}`;
}
function lc(t) {
  try {
    const e = Object.getPrototypeOf(t);
    return e ? e.constructor.name : void 0;
  } catch {
  }
}
const ke = 1024, Vr = "Breadcrumbs", dc = (t = {}) => {
  const e = {
    console: !0,
    dom: !0,
    fetch: !0,
    history: !0,
    sentry: !0,
    xhr: !0,
    ...t
  };
  return {
    name: Vr,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    setup(n) {
      e.console && ko(pc(n)), e.dom && qo(hc(n, e.dom)), e.xhr && sa(mc(n)), e.fetch && Ko(gc(n)), e.history && na(yc(n)), e.sentry && n.on && n.on("beforeSendEvent", fc(n));
    }
  };
}, Yr = dc;
se(Vr, Yr);
function fc(t) {
  return function(n) {
    $() === t && fe(
      {
        category: `sentry.${n.type === "transaction" ? "transaction" : "event"}`,
        event_id: n.event_id,
        level: n.level,
        message: te(n)
      },
      {
        event: n
      }
    );
  };
}
function hc(t, e) {
  return function(r) {
    if ($() !== t)
      return;
    let i, s, o = typeof e == "object" ? e.serializeAttribute : void 0, a = typeof e == "object" && typeof e.maxStringLength == "number" ? e.maxStringLength : void 0;
    a && a > ke && (Ee && g.warn(
      `\`dom.maxStringLength\` cannot exceed ${ke}, but a value of ${a} was configured. Sentry will use ${ke} instead.`
    ), a = ke), typeof o == "string" && (o = [o]);
    try {
      const u = r.event, l = _c(u) ? u.target : u;
      i = Cr(l, { keyAttrs: o, maxStringLength: a }), s = Co(l);
    } catch {
      i = "<unknown>";
    }
    if (i.length === 0)
      return;
    const c = {
      category: `ui.${r.name}`,
      message: i
    };
    s && (c.data = { "ui.component_name": s }), fe(c, {
      event: r.event,
      name: r.name,
      global: r.global
    });
  };
}
function pc(t) {
  return function(n) {
    if ($() !== t)
      return;
    const r = {
      category: "console",
      data: {
        arguments: n.args,
        logger: "console"
      },
      level: ma(n.level),
      message: yn(n.args, " ")
    };
    if (n.level === "assert")
      if (n.args[0] === !1)
        r.message = `Assertion failed: ${yn(n.args.slice(1), " ") || "console.assert"}`, r.data.arguments = n.args.slice(1);
      else
        return;
    fe(r, {
      input: n.args,
      level: n.level
    });
  };
}
function mc(t) {
  return function(n) {
    if ($() !== t)
      return;
    const { startTimestamp: r, endTimestamp: i } = n, s = n.xhr[Te];
    if (!r || !i || !s)
      return;
    const { method: o, url: a, status_code: c, body: u } = s, l = {
      method: o,
      url: a,
      status_code: c
    }, d = {
      xhr: n.xhr,
      input: u,
      startTimestamp: r,
      endTimestamp: i
    };
    fe(
      {
        category: "xhr",
        data: l,
        type: "http"
      },
      d
    );
  };
}
function gc(t) {
  return function(n) {
    if ($() !== t)
      return;
    const { startTimestamp: r, endTimestamp: i } = n;
    if (i && !(n.fetchData.url.match(/sentry_key/) && n.fetchData.method === "POST"))
      if (n.error) {
        const s = n.fetchData, o = {
          data: n.error,
          input: n.args,
          startTimestamp: r,
          endTimestamp: i
        };
        fe(
          {
            category: "fetch",
            data: s,
            level: "error",
            type: "http"
          },
          o
        );
      } else {
        const s = n.response, o = {
          ...n.fetchData,
          status_code: s && s.status
        }, a = {
          input: n.args,
          response: s,
          startTimestamp: r,
          endTimestamp: i
        };
        fe(
          {
            category: "fetch",
            data: o,
            type: "http"
          },
          a
        );
      }
  };
}
function yc(t) {
  return function(n) {
    if ($() !== t)
      return;
    let r = n.from, i = n.to;
    const s = Et(x.location.href);
    let o = r ? Et(r) : void 0;
    const a = Et(i);
    (!o || !o.path) && (o = s), s.protocol === a.protocol && s.host === a.host && (i = a.relative), s.protocol === o.protocol && s.host === o.host && (r = o.relative), fe({
      category: "navigation",
      data: {
        from: r,
        to: i
      }
    });
  };
}
function _c(t) {
  return !!t && !!t.target;
}
const Xr = "Dedupe", vc = () => {
  let t;
  return {
    name: Xr,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    processEvent(e) {
      if (e.type)
        return e;
      try {
        if (bc(e, t))
          return Ee && g.warn("Event dropped due to being a duplicate of previously captured event."), null;
      } catch {
      }
      return t = e;
    }
  };
}, Jr = vc;
se(Xr, Jr);
function bc(t, e) {
  return e ? !!(Ec(t, e) || Sc(t, e)) : !1;
}
function Ec(t, e) {
  const n = t.message, r = e.message;
  return !(!n && !r || n && !r || !n && r || n !== r || !ei(t, e) || !Zr(t, e));
}
function Sc(t, e) {
  const n = Nn(e), r = Nn(t);
  return !(!n || !r || n.type !== r.type || n.value !== r.value || !ei(t, e) || !Zr(t, e));
}
function Zr(t, e) {
  let n = Pn(t), r = Pn(e);
  if (!n && !r)
    return !0;
  if (n && !r || !n && r || (n = n, r = r, r.length !== n.length))
    return !1;
  for (let i = 0; i < r.length; i++) {
    const s = r[i], o = n[i];
    if (s.filename !== o.filename || s.lineno !== o.lineno || s.colno !== o.colno || s.function !== o.function)
      return !1;
  }
  return !0;
}
function ei(t, e) {
  let n = t.fingerprint, r = e.fingerprint;
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
function Nn(t) {
  return t.exception && t.exception.values && t.exception.values[0];
}
function Pn(t) {
  const e = t.exception;
  if (e)
    try {
      return e.values[0].stacktrace.frames;
    } catch {
      return;
    }
}
const ti = "GlobalHandlers", wc = (t = {}) => {
  const e = {
    onerror: !0,
    onunhandledrejection: !0,
    ...t
  };
  return {
    name: ti,
    setupOnce() {
      Error.stackTraceLimit = 50;
    },
    setup(n) {
      e.onerror && (Oc(n), $n("onerror")), e.onunhandledrejection && (xc(n), $n("onunhandledrejection"));
    }
  };
}, ni = wc;
se(
  ti,
  ni
);
function Oc(t) {
  Xo((e) => {
    const { stackParser: n, attachStacktrace: r } = ii();
    if ($() !== t || Qr())
      return;
    const { msg: i, url: s, line: o, column: a, error: c } = e, u = c === void 0 && Y(i) ? Dc(i, s, o, a) : ri(
      Kr(n, c || i, void 0, r, !1),
      s,
      o,
      a
    );
    u.level = "error", Ar(u, {
      originalException: c,
      mechanism: {
        handled: !1,
        type: "onerror"
      }
    });
  });
}
function xc(t) {
  Zo((e) => {
    const { stackParser: n, attachStacktrace: r } = ii();
    if ($() !== t || Qr())
      return;
    const i = Cc(e), s = wr(i) ? Tc(i) : Kr(n, i, void 0, r, !0);
    s.level = "error", Ar(s, {
      originalException: i,
      mechanism: {
        handled: !1,
        type: "onunhandledrejection"
      }
    });
  });
}
function Cc(t) {
  if (wr(t))
    return t;
  const e = t;
  try {
    if ("reason" in e)
      return e.reason;
    if ("detail" in e && "reason" in e.detail)
      return e.detail.reason;
  } catch {
  }
  return t;
}
function Tc(t) {
  return {
    exception: {
      values: [
        {
          type: "UnhandledRejection",
          // String() is needed because the Primitive type includes symbols (which can't be automatically stringified)
          value: `Non-Error promise rejection captured with value: ${String(t)}`
        }
      ]
    }
  };
}
function Dc(t, e, n, r) {
  const i = /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/i;
  let s = Xt(t) ? t.message : t, o = "Error";
  const a = s.match(i);
  return a && (o = a[1], s = a[2]), ri({
    exception: {
      values: [
        {
          type: o,
          value: s
        }
      ]
    }
  }, e, n, r);
}
function ri(t, e, n, r) {
  const i = t.exception = t.exception || {}, s = i.values = i.values || [], o = s[0] = s[0] || {}, a = o.stacktrace = o.stacktrace || {}, c = a.frames = a.frames || [], u = isNaN(parseInt(r, 10)) ? void 0 : r, l = isNaN(parseInt(n, 10)) ? void 0 : n, d = Y(e) && e.length > 0 ? e : xo();
  return c.length === 0 && c.push({
    colno: u,
    filename: d,
    function: "?",
    in_app: !0,
    lineno: l
  }), t;
}
function $n(t) {
  Ee && g.log(`Global Handler attached: ${t}`);
}
function ii() {
  const t = $();
  return t && t.getOptions() || {
    stackParser: () => [],
    attachStacktrace: !1
  };
}
const si = "HttpContext", Rc = () => ({
  name: si,
  // TODO v8: Remove this
  setupOnce() {
  },
  // eslint-disable-line @typescript-eslint/no-empty-function
  preprocessEvent(t) {
    if (!x.navigator && !x.location && !x.document)
      return;
    const e = t.request && t.request.url || x.location && x.location.href, { referrer: n } = x.document || {}, { userAgent: r } = x.navigator || {}, i = {
      ...t.request && t.request.headers,
      ...n && { Referer: n },
      ...r && { "User-Agent": r }
    }, s = { ...t.request, ...e && { url: e }, headers: i };
    t.request = s;
  }
}), oi = Rc;
se(si, oi);
const Ic = "cause", Mc = 5, ai = "LinkedErrors", Nc = (t = {}) => {
  const e = t.limit || Mc, n = t.key || Ic;
  return {
    name: ai,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    preprocessEvent(r, i, s) {
      const o = s.getOptions();
      Eo(
        // This differs from the LinkedErrors integration in core by using a different exceptionFromError function
        Wr,
        o.stackParser,
        o.maxValueLength,
        n,
        e,
        r,
        i
      );
    }
  };
}, ci = Nc;
se(ai, ci);
const Pc = [
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
], ui = "TryCatch", $c = (t = {}) => {
  const e = {
    XMLHttpRequest: !0,
    eventTarget: !0,
    requestAnimationFrame: !0,
    setInterval: !0,
    setTimeout: !0,
    ...t
  };
  return {
    name: ui,
    // TODO: This currently only works for the first client this is setup
    // We may want to adjust this to check for client etc.
    setupOnce() {
      e.setTimeout && R(x, "setTimeout", Fn), e.setInterval && R(x, "setInterval", Fn), e.requestAnimationFrame && R(x, "requestAnimationFrame", Fc), e.XMLHttpRequest && "XMLHttpRequest" in x && R(XMLHttpRequest.prototype, "send", Ac);
      const n = e.eventTarget;
      n && (Array.isArray(n) ? n : Pc).forEach(kc);
    }
  };
}, li = $c;
se(
  ui,
  li
);
function Fn(t) {
  return function(...e) {
    const n = e[0];
    return e[0] = Se(n, {
      mechanism: {
        data: { function: re(t) },
        handled: !1,
        type: "instrument"
      }
    }), t.apply(this, e);
  };
}
function Fc(t) {
  return function(e) {
    return t.apply(this, [
      Se(e, {
        mechanism: {
          data: {
            function: "requestAnimationFrame",
            handler: re(t)
          },
          handled: !1,
          type: "instrument"
        }
      })
    ]);
  };
}
function Ac(t) {
  return function(...e) {
    const n = this;
    return ["onload", "onerror", "onprogress", "onreadystatechange"].forEach((i) => {
      i in n && typeof n[i] == "function" && R(n, i, function(s) {
        const o = {
          mechanism: {
            data: {
              function: i,
              handler: re(s)
            },
            handled: !1,
            type: "instrument"
          }
        }, a = nn(s);
        return a && (o.mechanism.data.handler = re(a)), Se(s, o);
      });
    }), t.apply(this, e);
  };
}
function kc(t) {
  const e = x, n = e[t] && e[t].prototype;
  !n || !n.hasOwnProperty || !n.hasOwnProperty("addEventListener") || (R(n, "addEventListener", function(r) {
    return function(i, s, o) {
      try {
        typeof s.handleEvent == "function" && (s.handleEvent = Se(s.handleEvent, {
          mechanism: {
            data: {
              function: "handleEvent",
              handler: re(s),
              target: t
            },
            handled: !1,
            type: "instrument"
          }
        }));
      } catch {
      }
      return r.apply(this, [
        i,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Se(s, {
          mechanism: {
            data: {
              function: "addEventListener",
              handler: re(s),
              target: t
            },
            handled: !1,
            type: "instrument"
          }
        }),
        o
      ]);
    };
  }), R(
    n,
    "removeEventListener",
    function(r) {
      return function(i, s, o) {
        const a = s;
        try {
          const c = a && a.__sentry_wrapped__;
          c && r.call(this, i, c, o);
        } catch {
        }
        return r.call(this, i, a, o);
      };
    }
  ));
}
Br(), zr(), li(), Yr(), ni(), ci(), Jr(), oi();
const An = (t = {}, e = ye()) => {
  if (!x.document) {
    Ee && g.error("Global document not defined in showReportDialog call");
    return;
  }
  const { client: n, scope: r } = e.getStackTop(), i = t.dsn || n && n.getDsn();
  if (!i) {
    Ee && g.error("DSN not configured for showReportDialog call");
    return;
  }
  r && (t.user = {
    ...r.getUser(),
    ...t.user
  }), t.eventId || (t.eventId = e.lastEventId());
  const s = x.document.createElement("script");
  s.async = !0, s.crossOrigin = "anonymous", s.src = Ga(i, t), t.onLoad && (s.onload = t.onLoad);
  const { onClose: o } = t;
  if (o) {
    const c = (u) => {
      if (u.data === "__sentry_reportdialog_closed__")
        try {
          o();
        } finally {
          x.removeEventListener("message", c);
        }
    };
    x.addEventListener("message", c);
  }
  const a = x.document.head || x.document.body;
  a ? a.appendChild(s) : Ee && g.error("Not injecting report dialog. No injection point found in HTML");
};
var di = { exports: {} }, y = {};
/** @license React v16.13.1
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var T = typeof Symbol == "function" && Symbol.for, on = T ? Symbol.for("react.element") : 60103, an = T ? Symbol.for("react.portal") : 60106, st = T ? Symbol.for("react.fragment") : 60107, ot = T ? Symbol.for("react.strict_mode") : 60108, at = T ? Symbol.for("react.profiler") : 60114, ct = T ? Symbol.for("react.provider") : 60109, ut = T ? Symbol.for("react.context") : 60110, cn = T ? Symbol.for("react.async_mode") : 60111, lt = T ? Symbol.for("react.concurrent_mode") : 60111, dt = T ? Symbol.for("react.forward_ref") : 60112, ft = T ? Symbol.for("react.suspense") : 60113, jc = T ? Symbol.for("react.suspense_list") : 60120, ht = T ? Symbol.for("react.memo") : 60115, pt = T ? Symbol.for("react.lazy") : 60116, Lc = T ? Symbol.for("react.block") : 60121, Uc = T ? Symbol.for("react.fundamental") : 60117, qc = T ? Symbol.for("react.responder") : 60118, Hc = T ? Symbol.for("react.scope") : 60119;
function F(t) {
  if (typeof t == "object" && t !== null) {
    var e = t.$$typeof;
    switch (e) {
      case on:
        switch (t = t.type, t) {
          case cn:
          case lt:
          case st:
          case at:
          case ot:
          case ft:
            return t;
          default:
            switch (t = t && t.$$typeof, t) {
              case ut:
              case dt:
              case pt:
              case ht:
              case ct:
                return t;
              default:
                return e;
            }
        }
      case an:
        return e;
    }
  }
}
function fi(t) {
  return F(t) === lt;
}
y.AsyncMode = cn;
y.ConcurrentMode = lt;
y.ContextConsumer = ut;
y.ContextProvider = ct;
y.Element = on;
y.ForwardRef = dt;
y.Fragment = st;
y.Lazy = pt;
y.Memo = ht;
y.Portal = an;
y.Profiler = at;
y.StrictMode = ot;
y.Suspense = ft;
y.isAsyncMode = function(t) {
  return fi(t) || F(t) === cn;
};
y.isConcurrentMode = fi;
y.isContextConsumer = function(t) {
  return F(t) === ut;
};
y.isContextProvider = function(t) {
  return F(t) === ct;
};
y.isElement = function(t) {
  return typeof t == "object" && t !== null && t.$$typeof === on;
};
y.isForwardRef = function(t) {
  return F(t) === dt;
};
y.isFragment = function(t) {
  return F(t) === st;
};
y.isLazy = function(t) {
  return F(t) === pt;
};
y.isMemo = function(t) {
  return F(t) === ht;
};
y.isPortal = function(t) {
  return F(t) === an;
};
y.isProfiler = function(t) {
  return F(t) === at;
};
y.isStrictMode = function(t) {
  return F(t) === ot;
};
y.isSuspense = function(t) {
  return F(t) === ft;
};
y.isValidElementType = function(t) {
  return typeof t == "string" || typeof t == "function" || t === st || t === lt || t === at || t === ot || t === ft || t === jc || typeof t == "object" && t !== null && (t.$$typeof === pt || t.$$typeof === ht || t.$$typeof === ct || t.$$typeof === ut || t.$$typeof === dt || t.$$typeof === Uc || t.$$typeof === qc || t.$$typeof === Hc || t.$$typeof === Lc);
};
y.typeOf = F;
di.exports = y;
var Bc = di.exports, hi = Bc, Gc = {
  $$typeof: !0,
  render: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0
}, zc = {
  $$typeof: !0,
  compare: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0,
  type: !0
}, pi = {};
pi[hi.ForwardRef] = Gc;
pi[hi.Memo] = zc;
const Qc = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function Wc(t) {
  const e = t.match(/^([^.]+)/);
  return e !== null && parseInt(e[0]) >= 17;
}
const kn = {
  componentStack: null,
  error: null,
  eventId: null
};
function Kc(t, e) {
  const n = /* @__PURE__ */ new WeakMap();
  function r(i, s) {
    if (!n.has(i)) {
      if (i.cause)
        return n.set(i, !0), r(i.cause, s);
      i.cause = s;
    }
  }
  r(t, e);
}
class un extends er {
  constructor(e) {
    super(e), un.prototype.__init.call(this), this.state = kn, this._openFallbackReportDialog = !0;
    const n = $();
    n && n.on && e.showDialog && (this._openFallbackReportDialog = !1, n.on("afterSendEvent", (r) => {
      !r.type && r.event_id === this._lastEventId && An({ ...e.dialogOptions, eventId: this._lastEventId });
    }));
  }
  componentDidCatch(e, { componentStack: n }) {
    const { beforeCapture: r, onError: i, showDialog: s, dialogOptions: o } = this.props;
    kr((a) => {
      if (Wc(or) && Yt(e)) {
        const u = new Error(e.message);
        u.name = `React ErrorBoundary ${e.name}`, u.stack = n, Kc(e, u);
      }
      r && r(a, e, n);
      const c = Fr(e, {
        captureContext: {
          contexts: { react: { componentStack: n } }
        },
        // If users provide a fallback component we can assume they are handling the error.
        // Therefore, we set the mechanism depending on the presence of the fallback prop.
        mechanism: { handled: !!this.props.fallback }
      });
      i && i(e, n, c), s && (this._lastEventId = c, this._openFallbackReportDialog && An({ ...o, eventId: c })), this.setState({ error: e, componentStack: n, eventId: c });
    });
  }
  componentDidMount() {
    const { onMount: e } = this.props;
    e && e();
  }
  componentWillUnmount() {
    const { error: e, componentStack: n, eventId: r } = this.state, { onUnmount: i } = this.props;
    i && i(e, n, r);
  }
  __init() {
    this.resetErrorBoundary = () => {
      const { onReset: e } = this.props, { error: n, componentStack: r, eventId: i } = this.state;
      e && e(n, r, i), this.setState(kn);
    };
  }
  render() {
    const { fallback: e, children: n } = this.props, r = this.state;
    if (r.error) {
      let i;
      return typeof e == "function" ? i = e({
        error: r.error,
        componentStack: r.componentStack,
        resetError: this.resetErrorBoundary,
        eventId: r.eventId
      }) : i = e, nr(i) ? i : (e && Qc && g.warn("fallback did not produce a valid ReactElement"), null);
    }
    return typeof n == "function" ? n() : n;
  }
}
function Vc(t) {
  const e = Object.prototype.toString.call(t);
  return e === "[object Window]" || // In Electron context the Window object serializes to [object global]
  e === "[object global]";
}
function Yc(t) {
  return "nodeType" in t;
}
function Xc(t) {
  var e, n;
  return t ? Vc(t) ? t : Yc(t) && (e = (n = t.ownerDocument) == null ? void 0 : n.defaultView) != null ? e : window : window;
}
var jn;
(function(t) {
  t.DragStart = "dragStart", t.DragMove = "dragMove", t.DragEnd = "dragEnd", t.DragCancel = "dragCancel", t.DragOver = "dragOver", t.RegisterDroppable = "registerDroppable", t.SetDroppableDisabled = "setDroppableDisabled", t.UnregisterDroppable = "unregisterDroppable";
})(jn || (jn = {}));
const Jc = /* @__PURE__ */ Object.freeze({
  x: 0,
  y: 0
});
function Zc(t) {
  if (t.startsWith("matrix3d(")) {
    const e = t.slice(9, -1).split(/, /);
    return {
      x: +e[12],
      y: +e[13],
      scaleX: +e[0],
      scaleY: +e[5]
    };
  } else if (t.startsWith("matrix(")) {
    const e = t.slice(7, -1).split(/, /);
    return {
      x: +e[4],
      y: +e[5],
      scaleX: +e[0],
      scaleY: +e[3]
    };
  }
  return null;
}
function eu(t, e, n) {
  const r = Zc(e);
  if (!r)
    return t;
  const {
    scaleX: i,
    scaleY: s,
    x: o,
    y: a
  } = r, c = t.left - o - (1 - i) * parseFloat(n), u = t.top - a - (1 - s) * parseFloat(n.slice(n.indexOf(" ") + 1)), l = i ? t.width / i : t.width, d = s ? t.height / s : t.height;
  return {
    width: l,
    height: d,
    top: u,
    right: c + l,
    bottom: u + d,
    left: c
  };
}
const tu = {
  ignoreTransform: !1
};
function mi(t, e) {
  e === void 0 && (e = tu);
  let n = t.getBoundingClientRect();
  if (e.ignoreTransform) {
    const {
      transform: u,
      transformOrigin: l
    } = Xc(t).getComputedStyle(t);
    u && (n = eu(n, u, l));
  }
  const {
    top: r,
    left: i,
    width: s,
    height: o,
    bottom: a,
    right: c
  } = n;
  return {
    top: r,
    left: i,
    width: s,
    height: o,
    bottom: a,
    right: c
  };
}
function Ln(t) {
  return mi(t, {
    ignoreTransform: !0
  });
}
var ve;
(function(t) {
  t[t.Forward = 1] = "Forward", t[t.Backward = -1] = "Backward";
})(ve || (ve = {}));
var Un;
(function(t) {
  t.Click = "click", t.DragStart = "dragstart", t.Keydown = "keydown", t.ContextMenu = "contextmenu", t.Resize = "resize", t.SelectionChange = "selectionchange", t.VisibilityChange = "visibilitychange";
})(Un || (Un = {}));
var H;
(function(t) {
  t.Space = "Space", t.Down = "ArrowDown", t.Right = "ArrowRight", t.Left = "ArrowLeft", t.Up = "ArrowUp", t.Esc = "Escape", t.Enter = "Enter";
})(H || (H = {}));
H.Space, H.Enter, H.Esc, H.Space, H.Enter;
var qn;
(function(t) {
  t[t.RightClick = 2] = "RightClick";
})(qn || (qn = {}));
var Hn;
(function(t) {
  t[t.Pointer = 0] = "Pointer", t[t.DraggableRect = 1] = "DraggableRect";
})(Hn || (Hn = {}));
var Bn;
(function(t) {
  t[t.TreeOrder = 0] = "TreeOrder", t[t.ReversedTreeOrder = 1] = "ReversedTreeOrder";
})(Bn || (Bn = {}));
ve.Backward + "", ve.Forward + "", ve.Backward + "", ve.Forward + "";
var Ht;
(function(t) {
  t[t.Always = 0] = "Always", t[t.BeforeDragging = 1] = "BeforeDragging", t[t.WhileDragging = 2] = "WhileDragging";
})(Ht || (Ht = {}));
var Bt;
(function(t) {
  t.Optimized = "optimized";
})(Bt || (Bt = {}));
Ht.WhileDragging, Bt.Optimized;
({
  ...Jc
});
var Gn;
(function(t) {
  t[t.Uninitialized = 0] = "Uninitialized", t[t.Initializing = 1] = "Initializing", t[t.Initialized = 2] = "Initialized";
})(Gn || (Gn = {}));
H.Down, H.Right, H.Up, H.Left;
const nu = ({ darkMode: t, fetchKoenigLexical: e, className: n, children: r, ...i }) => {
  const s = rs(
    "admin-x-base",
    t && "dark",
    n
  );
  return /* @__PURE__ */ D.jsx("div", { className: s, ...i, children: /* @__PURE__ */ D.jsx(po, { darkMode: t, fetchKoenigLexical: e, children: r }) });
};
class mt {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set(), this.subscribe = this.subscribe.bind(this);
  }
  subscribe(e) {
    const n = {
      listener: e
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
const ln = typeof window > "u" || "Deno" in window;
function U() {
}
function ru(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function iu(t) {
  return typeof t == "number" && t >= 0 && t !== 1 / 0;
}
function su(t, e) {
  return Math.max(t + (e || 0) - Date.now(), 0);
}
function je(t, e, n) {
  return gt(t) ? typeof e == "function" ? {
    ...n,
    queryKey: t,
    queryFn: e
  } : {
    ...e,
    queryKey: t
  } : t;
}
function Z(t, e, n) {
  return gt(t) ? [{
    ...e,
    queryKey: t
  }, n] : [t || {}, e];
}
function zn(t, e) {
  const {
    type: n = "all",
    exact: r,
    fetchStatus: i,
    predicate: s,
    queryKey: o,
    stale: a
  } = t;
  if (gt(o)) {
    if (r) {
      if (e.queryHash !== dn(o, e.options))
        return !1;
    } else if (!Ke(e.queryKey, o))
      return !1;
  }
  if (n !== "all") {
    const c = e.isActive();
    if (n === "active" && !c || n === "inactive" && c)
      return !1;
  }
  return !(typeof a == "boolean" && e.isStale() !== a || typeof i < "u" && i !== e.state.fetchStatus || s && !s(e));
}
function Qn(t, e) {
  const {
    exact: n,
    fetching: r,
    predicate: i,
    mutationKey: s
  } = t;
  if (gt(s)) {
    if (!e.options.mutationKey)
      return !1;
    if (n) {
      if (ce(e.options.mutationKey) !== ce(s))
        return !1;
    } else if (!Ke(e.options.mutationKey, s))
      return !1;
  }
  return !(typeof r == "boolean" && e.state.status === "loading" !== r || i && !i(e));
}
function dn(t, e) {
  return ((e == null ? void 0 : e.queryKeyHashFn) || ce)(t);
}
function ce(t) {
  return JSON.stringify(t, (e, n) => Gt(n) ? Object.keys(n).sort().reduce((r, i) => (r[i] = n[i], r), {}) : n);
}
function Ke(t, e) {
  return gi(t, e);
}
function gi(t, e) {
  return t === e ? !0 : typeof t != typeof e ? !1 : t && e && typeof t == "object" && typeof e == "object" ? !Object.keys(e).some((n) => !gi(t[n], e[n])) : !1;
}
function yi(t, e) {
  if (t === e)
    return t;
  const n = Wn(t) && Wn(e);
  if (n || Gt(t) && Gt(e)) {
    const r = n ? t.length : Object.keys(t).length, i = n ? e : Object.keys(e), s = i.length, o = n ? [] : {};
    let a = 0;
    for (let c = 0; c < s; c++) {
      const u = n ? c : i[c];
      o[u] = yi(t[u], e[u]), o[u] === t[u] && a++;
    }
    return r === s && a === r ? t : o;
  }
  return e;
}
function Wn(t) {
  return Array.isArray(t) && t.length === Object.keys(t).length;
}
function Gt(t) {
  if (!Kn(t))
    return !1;
  const e = t.constructor;
  if (typeof e > "u")
    return !0;
  const n = e.prototype;
  return !(!Kn(n) || !n.hasOwnProperty("isPrototypeOf"));
}
function Kn(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function gt(t) {
  return Array.isArray(t);
}
function _i(t) {
  return new Promise((e) => {
    setTimeout(e, t);
  });
}
function Vn(t) {
  _i(0).then(t);
}
function ou() {
  if (typeof AbortController == "function")
    return new AbortController();
}
function au(t, e, n) {
  return n.isDataEqual != null && n.isDataEqual(t, e) ? t : typeof n.structuralSharing == "function" ? n.structuralSharing(t, e) : n.structuralSharing !== !1 ? yi(t, e) : e;
}
class cu extends mt {
  constructor() {
    super(), this.setup = (e) => {
      if (!ln && window.addEventListener) {
        const n = () => e();
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
      var e;
      (e = this.cleanup) == null || e.call(this), this.cleanup = void 0;
    }
  }
  setEventListener(e) {
    var n;
    this.setup = e, (n = this.cleanup) == null || n.call(this), this.cleanup = e((r) => {
      typeof r == "boolean" ? this.setFocused(r) : this.onFocus();
    });
  }
  setFocused(e) {
    this.focused !== e && (this.focused = e, this.onFocus());
  }
  onFocus() {
    this.listeners.forEach(({
      listener: e
    }) => {
      e();
    });
  }
  isFocused() {
    return typeof this.focused == "boolean" ? this.focused : typeof document > "u" ? !0 : [void 0, "visible", "prerender"].includes(document.visibilityState);
  }
}
const zt = new cu(), Yn = ["online", "offline"];
class uu extends mt {
  constructor() {
    super(), this.setup = (e) => {
      if (!ln && window.addEventListener) {
        const n = () => e();
        return Yn.forEach((r) => {
          window.addEventListener(r, n, !1);
        }), () => {
          Yn.forEach((r) => {
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
      var e;
      (e = this.cleanup) == null || e.call(this), this.cleanup = void 0;
    }
  }
  setEventListener(e) {
    var n;
    this.setup = e, (n = this.cleanup) == null || n.call(this), this.cleanup = e((r) => {
      typeof r == "boolean" ? this.setOnline(r) : this.onOnline();
    });
  }
  setOnline(e) {
    this.online !== e && (this.online = e, this.onOnline());
  }
  onOnline() {
    this.listeners.forEach(({
      listener: e
    }) => {
      e();
    });
  }
  isOnline() {
    return typeof this.online == "boolean" ? this.online : typeof navigator > "u" || typeof navigator.onLine > "u" ? !0 : navigator.onLine;
  }
}
const Ve = new uu();
function lu(t) {
  return Math.min(1e3 * 2 ** t, 3e4);
}
function fn(t) {
  return (t ?? "online") === "online" ? Ve.isOnline() : !0;
}
class vi {
  constructor(e) {
    this.revert = e == null ? void 0 : e.revert, this.silent = e == null ? void 0 : e.silent;
  }
}
function wt(t) {
  return t instanceof vi;
}
function bi(t) {
  let e = !1, n = 0, r = !1, i, s, o;
  const a = new Promise((b, w) => {
    s = b, o = w;
  }), c = (b) => {
    r || (h(new vi(b)), t.abort == null || t.abort());
  }, u = () => {
    e = !0;
  }, l = () => {
    e = !1;
  }, d = () => !zt.isFocused() || t.networkMode !== "always" && !Ve.isOnline(), f = (b) => {
    r || (r = !0, t.onSuccess == null || t.onSuccess(b), i == null || i(), s(b));
  }, h = (b) => {
    r || (r = !0, t.onError == null || t.onError(b), i == null || i(), o(b));
  }, p = () => new Promise((b) => {
    i = (w) => {
      const A = r || !d();
      return A && b(w), A;
    }, t.onPause == null || t.onPause();
  }).then(() => {
    i = void 0, r || t.onContinue == null || t.onContinue();
  }), _ = () => {
    if (r)
      return;
    let b;
    try {
      b = t.fn();
    } catch (w) {
      b = Promise.reject(w);
    }
    Promise.resolve(b).then(f).catch((w) => {
      var A, L;
      if (r)
        return;
      const I = (A = t.retry) != null ? A : 3, oe = (L = t.retryDelay) != null ? L : lu, E = typeof oe == "function" ? oe(n, w) : oe, m = I === !0 || typeof I == "number" && n < I || typeof I == "function" && I(n, w);
      if (e || !m) {
        h(w);
        return;
      }
      n++, t.onFail == null || t.onFail(n, w), _i(E).then(() => {
        if (d())
          return p();
      }).then(() => {
        e ? h(w) : _();
      });
    });
  };
  return fn(t.networkMode) ? _() : p().then(_), {
    promise: a,
    cancel: c,
    continue: () => (i == null ? void 0 : i()) ? a : Promise.resolve(),
    cancelRetry: u,
    continueRetry: l
  };
}
const hn = console;
function du() {
  let t = [], e = 0, n = (l) => {
    l();
  }, r = (l) => {
    l();
  };
  const i = (l) => {
    let d;
    e++;
    try {
      d = l();
    } finally {
      e--, e || a();
    }
    return d;
  }, s = (l) => {
    e ? t.push(l) : Vn(() => {
      n(l);
    });
  }, o = (l) => (...d) => {
    s(() => {
      l(...d);
    });
  }, a = () => {
    const l = t;
    t = [], l.length && Vn(() => {
      r(() => {
        l.forEach((d) => {
          n(d);
        });
      });
    });
  };
  return {
    batch: i,
    batchCalls: o,
    schedule: s,
    setNotifyFunction: (l) => {
      n = l;
    },
    setBatchNotifyFunction: (l) => {
      r = l;
    }
  };
}
const N = du();
class Ei {
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), iu(this.cacheTime) && (this.gcTimeout = setTimeout(() => {
      this.optionalRemove();
    }, this.cacheTime));
  }
  updateCacheTime(e) {
    this.cacheTime = Math.max(this.cacheTime || 0, e ?? (ln ? 1 / 0 : 5 * 60 * 1e3));
  }
  clearGcTimeout() {
    this.gcTimeout && (clearTimeout(this.gcTimeout), this.gcTimeout = void 0);
  }
}
class fu extends Ei {
  constructor(e) {
    super(), this.abortSignalConsumed = !1, this.defaultOptions = e.defaultOptions, this.setOptions(e.options), this.observers = [], this.cache = e.cache, this.logger = e.logger || hn, this.queryKey = e.queryKey, this.queryHash = e.queryHash, this.initialState = e.state || hu(this.options), this.state = this.initialState, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  setOptions(e) {
    this.options = {
      ...this.defaultOptions,
      ...e
    }, this.updateCacheTime(this.options.cacheTime);
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.cache.remove(this);
  }
  setData(e, n) {
    const r = au(this.state.data, e, this.options);
    return this.dispatch({
      data: r,
      type: "success",
      dataUpdatedAt: n == null ? void 0 : n.updatedAt,
      manual: n == null ? void 0 : n.manual
    }), r;
  }
  setState(e, n) {
    this.dispatch({
      type: "setState",
      state: e,
      setStateOptions: n
    });
  }
  cancel(e) {
    var n;
    const r = this.promise;
    return (n = this.retryer) == null || n.cancel(e), r ? r.then(U).catch(U) : Promise.resolve();
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
    return this.observers.some((e) => e.options.enabled !== !1);
  }
  isDisabled() {
    return this.getObserversCount() > 0 && !this.isActive();
  }
  isStale() {
    return this.state.isInvalidated || !this.state.dataUpdatedAt || this.observers.some((e) => e.getCurrentResult().isStale);
  }
  isStaleByTime(e = 0) {
    return this.state.isInvalidated || !this.state.dataUpdatedAt || !su(this.state.dataUpdatedAt, e);
  }
  onFocus() {
    var e;
    const n = this.observers.find((r) => r.shouldFetchOnWindowFocus());
    n && n.refetch({
      cancelRefetch: !1
    }), (e = this.retryer) == null || e.continue();
  }
  onOnline() {
    var e;
    const n = this.observers.find((r) => r.shouldFetchOnReconnect());
    n && n.refetch({
      cancelRefetch: !1
    }), (e = this.retryer) == null || e.continue();
  }
  addObserver(e) {
    this.observers.includes(e) || (this.observers.push(e), this.clearGcTimeout(), this.cache.notify({
      type: "observerAdded",
      query: this,
      observer: e
    }));
  }
  removeObserver(e) {
    this.observers.includes(e) && (this.observers = this.observers.filter((n) => n !== e), this.observers.length || (this.retryer && (this.abortSignalConsumed ? this.retryer.cancel({
      revert: !0
    }) : this.retryer.cancelRetry()), this.scheduleGc()), this.cache.notify({
      type: "observerRemoved",
      query: this,
      observer: e
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
  fetch(e, n) {
    var r, i;
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
    if (e && this.setOptions(e), !this.options.queryFn) {
      const h = this.observers.find((p) => p.options.queryFn);
      h && this.setOptions(h.options);
    }
    const o = ou(), a = {
      queryKey: this.queryKey,
      pageParam: void 0,
      meta: this.meta
    }, c = (h) => {
      Object.defineProperty(h, "signal", {
        enumerable: !0,
        get: () => {
          if (o)
            return this.abortSignalConsumed = !0, o.signal;
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
    if (c(l), (r = this.options.behavior) == null || r.onFetch(l), this.revertState = this.state, this.state.fetchStatus === "idle" || this.state.fetchMeta !== ((i = l.fetchOptions) == null ? void 0 : i.meta)) {
      var d;
      this.dispatch({
        type: "fetch",
        meta: (d = l.fetchOptions) == null ? void 0 : d.meta
      });
    }
    const f = (h) => {
      if (wt(h) && h.silent || this.dispatch({
        type: "error",
        error: h
      }), !wt(h)) {
        var p, _, b, w;
        (p = (_ = this.cache.config).onError) == null || p.call(_, h, this), (b = (w = this.cache.config).onSettled) == null || b.call(w, this.state.data, h, this);
      }
      this.isFetchingOptimistic || this.scheduleGc(), this.isFetchingOptimistic = !1;
    };
    return this.retryer = bi({
      fn: l.fetchFn,
      abort: o == null ? void 0 : o.abort.bind(o),
      onSuccess: (h) => {
        var p, _, b, w;
        if (typeof h > "u") {
          f(new Error(this.queryHash + " data is undefined"));
          return;
        }
        this.setData(h), (p = (_ = this.cache.config).onSuccess) == null || p.call(_, h, this), (b = (w = this.cache.config).onSettled) == null || b.call(w, h, this.state.error, this), this.isFetchingOptimistic || this.scheduleGc(), this.isFetchingOptimistic = !1;
      },
      onError: f,
      onFail: (h, p) => {
        this.dispatch({
          type: "failed",
          failureCount: h,
          error: p
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
  dispatch(e) {
    const n = (r) => {
      var i, s;
      switch (e.type) {
        case "failed":
          return {
            ...r,
            fetchFailureCount: e.failureCount,
            fetchFailureReason: e.error
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
            fetchMeta: (i = e.meta) != null ? i : null,
            fetchStatus: fn(this.options.networkMode) ? "fetching" : "paused",
            ...!r.dataUpdatedAt && {
              error: null,
              status: "loading"
            }
          };
        case "success":
          return {
            ...r,
            data: e.data,
            dataUpdateCount: r.dataUpdateCount + 1,
            dataUpdatedAt: (s = e.dataUpdatedAt) != null ? s : Date.now(),
            error: null,
            isInvalidated: !1,
            status: "success",
            ...!e.manual && {
              fetchStatus: "idle",
              fetchFailureCount: 0,
              fetchFailureReason: null
            }
          };
        case "error":
          const o = e.error;
          return wt(o) && o.revert && this.revertState ? {
            ...this.revertState,
            fetchStatus: "idle"
          } : {
            ...r,
            error: o,
            errorUpdateCount: r.errorUpdateCount + 1,
            errorUpdatedAt: Date.now(),
            fetchFailureCount: r.fetchFailureCount + 1,
            fetchFailureReason: o,
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
            ...e.state
          };
      }
    };
    this.state = n(this.state), N.batch(() => {
      this.observers.forEach((r) => {
        r.onQueryUpdate(e);
      }), this.cache.notify({
        query: this,
        type: "updated",
        action: e
      });
    });
  }
}
function hu(t) {
  const e = typeof t.initialData == "function" ? t.initialData() : t.initialData, n = typeof e < "u", r = n ? typeof t.initialDataUpdatedAt == "function" ? t.initialDataUpdatedAt() : t.initialDataUpdatedAt : 0;
  return {
    data: e,
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
class pu extends mt {
  constructor(e) {
    super(), this.config = e || {}, this.queries = [], this.queriesMap = {};
  }
  build(e, n, r) {
    var i;
    const s = n.queryKey, o = (i = n.queryHash) != null ? i : dn(s, n);
    let a = this.get(o);
    return a || (a = new fu({
      cache: this,
      logger: e.getLogger(),
      queryKey: s,
      queryHash: o,
      options: e.defaultQueryOptions(n),
      state: r,
      defaultOptions: e.getQueryDefaults(s)
    }), this.add(a)), a;
  }
  add(e) {
    this.queriesMap[e.queryHash] || (this.queriesMap[e.queryHash] = e, this.queries.push(e), this.notify({
      type: "added",
      query: e
    }));
  }
  remove(e) {
    const n = this.queriesMap[e.queryHash];
    n && (e.destroy(), this.queries = this.queries.filter((r) => r !== e), n === e && delete this.queriesMap[e.queryHash], this.notify({
      type: "removed",
      query: e
    }));
  }
  clear() {
    N.batch(() => {
      this.queries.forEach((e) => {
        this.remove(e);
      });
    });
  }
  get(e) {
    return this.queriesMap[e];
  }
  getAll() {
    return this.queries;
  }
  find(e, n) {
    const [r] = Z(e, n);
    return typeof r.exact > "u" && (r.exact = !0), this.queries.find((i) => zn(r, i));
  }
  findAll(e, n) {
    const [r] = Z(e, n);
    return Object.keys(r).length > 0 ? this.queries.filter((i) => zn(r, i)) : this.queries;
  }
  notify(e) {
    N.batch(() => {
      this.listeners.forEach(({
        listener: n
      }) => {
        n(e);
      });
    });
  }
  onFocus() {
    N.batch(() => {
      this.queries.forEach((e) => {
        e.onFocus();
      });
    });
  }
  onOnline() {
    N.batch(() => {
      this.queries.forEach((e) => {
        e.onOnline();
      });
    });
  }
}
class mu extends Ei {
  constructor(e) {
    super(), this.defaultOptions = e.defaultOptions, this.mutationId = e.mutationId, this.mutationCache = e.mutationCache, this.logger = e.logger || hn, this.observers = [], this.state = e.state || gu(), this.setOptions(e.options), this.scheduleGc();
  }
  setOptions(e) {
    this.options = {
      ...this.defaultOptions,
      ...e
    }, this.updateCacheTime(this.options.cacheTime);
  }
  get meta() {
    return this.options.meta;
  }
  setState(e) {
    this.dispatch({
      type: "setState",
      state: e
    });
  }
  addObserver(e) {
    this.observers.includes(e) || (this.observers.push(e), this.clearGcTimeout(), this.mutationCache.notify({
      type: "observerAdded",
      mutation: this,
      observer: e
    }));
  }
  removeObserver(e) {
    this.observers = this.observers.filter((n) => n !== e), this.scheduleGc(), this.mutationCache.notify({
      type: "observerRemoved",
      mutation: this,
      observer: e
    });
  }
  optionalRemove() {
    this.observers.length || (this.state.status === "loading" ? this.scheduleGc() : this.mutationCache.remove(this));
  }
  continue() {
    var e, n;
    return (e = (n = this.retryer) == null ? void 0 : n.continue()) != null ? e : this.execute();
  }
  async execute() {
    const e = () => {
      var m;
      return this.retryer = bi({
        fn: () => this.options.mutationFn ? this.options.mutationFn(this.state.variables) : Promise.reject("No mutationFn found"),
        onFail: (S, Q) => {
          this.dispatch({
            type: "failed",
            failureCount: S,
            error: Q
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
        retry: (m = this.options.retry) != null ? m : 0,
        retryDelay: this.options.retryDelay,
        networkMode: this.options.networkMode
      }), this.retryer.promise;
    }, n = this.state.status === "loading";
    try {
      var r, i, s, o, a, c, u, l;
      if (!n) {
        var d, f, h, p;
        this.dispatch({
          type: "loading",
          variables: this.options.variables
        }), await ((d = (f = this.mutationCache.config).onMutate) == null ? void 0 : d.call(f, this.state.variables, this));
        const S = await ((h = (p = this.options).onMutate) == null ? void 0 : h.call(p, this.state.variables));
        S !== this.state.context && this.dispatch({
          type: "loading",
          context: S,
          variables: this.state.variables
        });
      }
      const m = await e();
      return await ((r = (i = this.mutationCache.config).onSuccess) == null ? void 0 : r.call(i, m, this.state.variables, this.state.context, this)), await ((s = (o = this.options).onSuccess) == null ? void 0 : s.call(o, m, this.state.variables, this.state.context)), await ((a = (c = this.mutationCache.config).onSettled) == null ? void 0 : a.call(c, m, null, this.state.variables, this.state.context, this)), await ((u = (l = this.options).onSettled) == null ? void 0 : u.call(l, m, null, this.state.variables, this.state.context)), this.dispatch({
        type: "success",
        data: m
      }), m;
    } catch (m) {
      try {
        var _, b, w, A, L, I, oe, E;
        throw await ((_ = (b = this.mutationCache.config).onError) == null ? void 0 : _.call(b, m, this.state.variables, this.state.context, this)), await ((w = (A = this.options).onError) == null ? void 0 : w.call(A, m, this.state.variables, this.state.context)), await ((L = (I = this.mutationCache.config).onSettled) == null ? void 0 : L.call(I, void 0, m, this.state.variables, this.state.context, this)), await ((oe = (E = this.options).onSettled) == null ? void 0 : oe.call(E, void 0, m, this.state.variables, this.state.context)), m;
      } finally {
        this.dispatch({
          type: "error",
          error: m
        });
      }
    }
  }
  dispatch(e) {
    const n = (r) => {
      switch (e.type) {
        case "failed":
          return {
            ...r,
            failureCount: e.failureCount,
            failureReason: e.error
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
            context: e.context,
            data: void 0,
            failureCount: 0,
            failureReason: null,
            error: null,
            isPaused: !fn(this.options.networkMode),
            status: "loading",
            variables: e.variables
          };
        case "success":
          return {
            ...r,
            data: e.data,
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
            error: e.error,
            failureCount: r.failureCount + 1,
            failureReason: e.error,
            isPaused: !1,
            status: "error"
          };
        case "setState":
          return {
            ...r,
            ...e.state
          };
      }
    };
    this.state = n(this.state), N.batch(() => {
      this.observers.forEach((r) => {
        r.onMutationUpdate(e);
      }), this.mutationCache.notify({
        mutation: this,
        type: "updated",
        action: e
      });
    });
  }
}
function gu() {
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
class yu extends mt {
  constructor(e) {
    super(), this.config = e || {}, this.mutations = [], this.mutationId = 0;
  }
  build(e, n, r) {
    const i = new mu({
      mutationCache: this,
      logger: e.getLogger(),
      mutationId: ++this.mutationId,
      options: e.defaultMutationOptions(n),
      state: r,
      defaultOptions: n.mutationKey ? e.getMutationDefaults(n.mutationKey) : void 0
    });
    return this.add(i), i;
  }
  add(e) {
    this.mutations.push(e), this.notify({
      type: "added",
      mutation: e
    });
  }
  remove(e) {
    this.mutations = this.mutations.filter((n) => n !== e), this.notify({
      type: "removed",
      mutation: e
    });
  }
  clear() {
    N.batch(() => {
      this.mutations.forEach((e) => {
        this.remove(e);
      });
    });
  }
  getAll() {
    return this.mutations;
  }
  find(e) {
    return typeof e.exact > "u" && (e.exact = !0), this.mutations.find((n) => Qn(e, n));
  }
  findAll(e) {
    return this.mutations.filter((n) => Qn(e, n));
  }
  notify(e) {
    N.batch(() => {
      this.listeners.forEach(({
        listener: n
      }) => {
        n(e);
      });
    });
  }
  resumePausedMutations() {
    var e;
    return this.resuming = ((e = this.resuming) != null ? e : Promise.resolve()).then(() => {
      const n = this.mutations.filter((r) => r.state.isPaused);
      return N.batch(() => n.reduce((r, i) => r.then(() => i.continue().catch(U)), Promise.resolve()));
    }).then(() => {
      this.resuming = void 0;
    }), this.resuming;
  }
}
function _u() {
  return {
    onFetch: (t) => {
      t.fetchFn = () => {
        var e, n, r, i, s, o;
        const a = (e = t.fetchOptions) == null || (n = e.meta) == null ? void 0 : n.refetchPage, c = (r = t.fetchOptions) == null || (i = r.meta) == null ? void 0 : i.fetchMore, u = c == null ? void 0 : c.pageParam, l = (c == null ? void 0 : c.direction) === "forward", d = (c == null ? void 0 : c.direction) === "backward", f = ((s = t.state.data) == null ? void 0 : s.pages) || [], h = ((o = t.state.data) == null ? void 0 : o.pageParams) || [];
        let p = h, _ = !1;
        const b = (E) => {
          Object.defineProperty(E, "signal", {
            enumerable: !0,
            get: () => {
              var m;
              if ((m = t.signal) != null && m.aborted)
                _ = !0;
              else {
                var S;
                (S = t.signal) == null || S.addEventListener("abort", () => {
                  _ = !0;
                });
              }
              return t.signal;
            }
          });
        }, w = t.options.queryFn || (() => Promise.reject("Missing queryFn for queryKey '" + t.options.queryHash + "'")), A = (E, m, S, Q) => (p = Q ? [m, ...p] : [...p, m], Q ? [S, ...E] : [...E, S]), L = (E, m, S, Q) => {
          if (_)
            return Promise.reject("Cancelled");
          if (typeof S > "u" && !m && E.length)
            return Promise.resolve(E);
          const yt = {
            queryKey: t.queryKey,
            pageParam: S,
            meta: t.options.meta
          };
          b(yt);
          const _t = w(yt);
          return Promise.resolve(_t).then((xi) => A(E, S, xi, Q));
        };
        let I;
        if (!f.length)
          I = L([]);
        else if (l) {
          const E = typeof u < "u", m = E ? u : Xn(t.options, f);
          I = L(f, E, m);
        } else if (d) {
          const E = typeof u < "u", m = E ? u : vu(t.options, f);
          I = L(f, E, m, !0);
        } else {
          p = [];
          const E = typeof t.options.getNextPageParam > "u";
          I = (a && f[0] ? a(f[0], 0, f) : !0) ? L([], E, h[0]) : Promise.resolve(A([], h[0], f[0]));
          for (let S = 1; S < f.length; S++)
            I = I.then((Q) => {
              if (a && f[S] ? a(f[S], S, f) : !0) {
                const _t = E ? h[S] : Xn(t.options, Q);
                return L(Q, E, _t);
              }
              return Promise.resolve(A(Q, h[S], f[S]));
            });
        }
        return I.then((E) => ({
          pages: E,
          pageParams: p
        }));
      };
    }
  };
}
function Xn(t, e) {
  return t.getNextPageParam == null ? void 0 : t.getNextPageParam(e[e.length - 1], e);
}
function vu(t, e) {
  return t.getPreviousPageParam == null ? void 0 : t.getPreviousPageParam(e[0], e);
}
class bu {
  constructor(e = {}) {
    this.queryCache = e.queryCache || new pu(), this.mutationCache = e.mutationCache || new yu(), this.logger = e.logger || hn, this.defaultOptions = e.defaultOptions || {}, this.queryDefaults = [], this.mutationDefaults = [], this.mountCount = 0;
  }
  mount() {
    this.mountCount++, this.mountCount === 1 && (this.unsubscribeFocus = zt.subscribe(() => {
      zt.isFocused() && (this.resumePausedMutations(), this.queryCache.onFocus());
    }), this.unsubscribeOnline = Ve.subscribe(() => {
      Ve.isOnline() && (this.resumePausedMutations(), this.queryCache.onOnline());
    }));
  }
  unmount() {
    var e, n;
    this.mountCount--, this.mountCount === 0 && ((e = this.unsubscribeFocus) == null || e.call(this), this.unsubscribeFocus = void 0, (n = this.unsubscribeOnline) == null || n.call(this), this.unsubscribeOnline = void 0);
  }
  isFetching(e, n) {
    const [r] = Z(e, n);
    return r.fetchStatus = "fetching", this.queryCache.findAll(r).length;
  }
  isMutating(e) {
    return this.mutationCache.findAll({
      ...e,
      fetching: !0
    }).length;
  }
  getQueryData(e, n) {
    var r;
    return (r = this.queryCache.find(e, n)) == null ? void 0 : r.state.data;
  }
  ensureQueryData(e, n, r) {
    const i = je(e, n, r), s = this.getQueryData(i.queryKey);
    return s ? Promise.resolve(s) : this.fetchQuery(i);
  }
  getQueriesData(e) {
    return this.getQueryCache().findAll(e).map(({
      queryKey: n,
      state: r
    }) => {
      const i = r.data;
      return [n, i];
    });
  }
  setQueryData(e, n, r) {
    const i = this.queryCache.find(e), s = i == null ? void 0 : i.state.data, o = ru(n, s);
    if (typeof o > "u")
      return;
    const a = je(e), c = this.defaultQueryOptions(a);
    return this.queryCache.build(this, c).setData(o, {
      ...r,
      manual: !0
    });
  }
  setQueriesData(e, n, r) {
    return N.batch(() => this.getQueryCache().findAll(e).map(({
      queryKey: i
    }) => [i, this.setQueryData(i, n, r)]));
  }
  getQueryState(e, n) {
    var r;
    return (r = this.queryCache.find(e, n)) == null ? void 0 : r.state;
  }
  removeQueries(e, n) {
    const [r] = Z(e, n), i = this.queryCache;
    N.batch(() => {
      i.findAll(r).forEach((s) => {
        i.remove(s);
      });
    });
  }
  resetQueries(e, n, r) {
    const [i, s] = Z(e, n, r), o = this.queryCache, a = {
      type: "active",
      ...i
    };
    return N.batch(() => (o.findAll(i).forEach((c) => {
      c.reset();
    }), this.refetchQueries(a, s)));
  }
  cancelQueries(e, n, r) {
    const [i, s = {}] = Z(e, n, r);
    typeof s.revert > "u" && (s.revert = !0);
    const o = N.batch(() => this.queryCache.findAll(i).map((a) => a.cancel(s)));
    return Promise.all(o).then(U).catch(U);
  }
  invalidateQueries(e, n, r) {
    const [i, s] = Z(e, n, r);
    return N.batch(() => {
      var o, a;
      if (this.queryCache.findAll(i).forEach((u) => {
        u.invalidate();
      }), i.refetchType === "none")
        return Promise.resolve();
      const c = {
        ...i,
        type: (o = (a = i.refetchType) != null ? a : i.type) != null ? o : "active"
      };
      return this.refetchQueries(c, s);
    });
  }
  refetchQueries(e, n, r) {
    const [i, s] = Z(e, n, r), o = N.batch(() => this.queryCache.findAll(i).filter((c) => !c.isDisabled()).map((c) => {
      var u;
      return c.fetch(void 0, {
        ...s,
        cancelRefetch: (u = s == null ? void 0 : s.cancelRefetch) != null ? u : !0,
        meta: {
          refetchPage: i.refetchPage
        }
      });
    }));
    let a = Promise.all(o).then(U);
    return s != null && s.throwOnError || (a = a.catch(U)), a;
  }
  fetchQuery(e, n, r) {
    const i = je(e, n, r), s = this.defaultQueryOptions(i);
    typeof s.retry > "u" && (s.retry = !1);
    const o = this.queryCache.build(this, s);
    return o.isStaleByTime(s.staleTime) ? o.fetch(s) : Promise.resolve(o.state.data);
  }
  prefetchQuery(e, n, r) {
    return this.fetchQuery(e, n, r).then(U).catch(U);
  }
  fetchInfiniteQuery(e, n, r) {
    const i = je(e, n, r);
    return i.behavior = _u(), this.fetchQuery(i);
  }
  prefetchInfiniteQuery(e, n, r) {
    return this.fetchInfiniteQuery(e, n, r).then(U).catch(U);
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
  setDefaultOptions(e) {
    this.defaultOptions = e;
  }
  setQueryDefaults(e, n) {
    const r = this.queryDefaults.find((i) => ce(e) === ce(i.queryKey));
    r ? r.defaultOptions = n : this.queryDefaults.push({
      queryKey: e,
      defaultOptions: n
    });
  }
  getQueryDefaults(e) {
    if (!e)
      return;
    const n = this.queryDefaults.find((r) => Ke(e, r.queryKey));
    return n == null ? void 0 : n.defaultOptions;
  }
  setMutationDefaults(e, n) {
    const r = this.mutationDefaults.find((i) => ce(e) === ce(i.mutationKey));
    r ? r.defaultOptions = n : this.mutationDefaults.push({
      mutationKey: e,
      defaultOptions: n
    });
  }
  getMutationDefaults(e) {
    if (!e)
      return;
    const n = this.mutationDefaults.find((r) => Ke(e, r.mutationKey));
    return n == null ? void 0 : n.defaultOptions;
  }
  defaultQueryOptions(e) {
    if (e != null && e._defaulted)
      return e;
    const n = {
      ...this.defaultOptions.queries,
      ...this.getQueryDefaults(e == null ? void 0 : e.queryKey),
      ...e,
      _defaulted: !0
    };
    return !n.queryHash && n.queryKey && (n.queryHash = dn(n.queryKey, n)), typeof n.refetchOnReconnect > "u" && (n.refetchOnReconnect = n.networkMode !== "always"), typeof n.useErrorBoundary > "u" && (n.useErrorBoundary = !!n.suspense), n;
  }
  defaultMutationOptions(e) {
    return e != null && e._defaulted ? e : {
      ...this.defaultOptions.mutations,
      ...this.getMutationDefaults(e == null ? void 0 : e.mutationKey),
      ...e,
      _defaulted: !0
    };
  }
  clear() {
    this.queryCache.clear(), this.mutationCache.clear();
  }
}
const Jn = /* @__PURE__ */ he(void 0), Eu = /* @__PURE__ */ he(!1);
function Su(t, e) {
  return t || (e && typeof window < "u" ? (window.ReactQueryClientContext || (window.ReactQueryClientContext = Jn), window.ReactQueryClientContext) : Jn);
}
const wu = ({
  client: t,
  children: e,
  context: n,
  contextSharing: r = !1
}) => {
  j(() => (t.mount(), () => {
    t.unmount();
  }), [t]);
  const i = Su(n, r);
  return /* @__PURE__ */ C(Eu.Provider, {
    value: !n && r
  }, /* @__PURE__ */ C(i.Provider, {
    value: t
  }, e));
}, Si = window.adminXQueryClient || new bu({
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
window.adminXQueryClient || (window.adminXQueryClient = Si);
const wi = he({
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
function Ou({ children: t, ...e }) {
  return /* @__PURE__ */ D.jsx(un, { children: /* @__PURE__ */ D.jsx(wu, { client: Si, children: /* @__PURE__ */ D.jsx(wi.Provider, { value: e, children: t }) }) });
}
const xu = () => ne(wi), Oi = he({
  route: "",
  updateRoute: () => {
  },
  loadingModal: !1,
  eventTarget: new EventTarget()
});
function Cu(t, e) {
  if (!e)
    return null;
  const n = new RegExp(`/${t}/(.*)`), r = e == null ? void 0 : e.match(n);
  return r ? r[1] : null;
}
const Tu = (t, e, n, r) => {
  let i = window.location.hash;
  i = i.substring(1);
  const s = `${window.location.protocol}//${window.location.hostname}`, o = new URL(i, s), a = Cu(t, o.pathname);
  if (!r || !n)
    return { pathName: a || "" };
  const c = o.searchParams;
  if (a && r && n) {
    const [, u] = Object.entries(r).find(([f]) => Ot(e || "", f)) || [], [l, d] = Object.entries(r).find(([f]) => Ot(a, f)) || [];
    return {
      pathName: a,
      changingModal: d && d !== u,
      modal: l && d ? (
        // we should consider adding '&& modalName !== currentModalName' here, but this breaks tests
        n().then(({ default: f }) => {
          gr.show(f[d], { pathName: a, params: Ot(a, l), searchParams: c });
        })
      ) : void 0
    };
  }
  return { pathName: "" };
}, Ot = (t, e) => {
  const n = new RegExp("^" + e.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$"), r = t.match(n);
  if (r)
    return r.groups || {};
}, Du = ({ basePath: t, modals: e, children: n }) => {
  const { externalNavigate: r } = xu(), [i, s] = ue(void 0), [o, a] = ue(!1), [c] = ue(new EventTarget()), u = M((l) => {
    const d = typeof l == "string" ? { route: l } : l;
    if (d.isExternal) {
      r(d);
      return;
    }
    const f = d.route.replace(/^\//, "");
    f === i || (f ? window.location.hash = `/${t}/${f}` : window.location.hash = `/${t}`), c.dispatchEvent(new CustomEvent("routeChange", { detail: { newPath: f, oldPath: i } }));
  }, [t, c, r, i]);
  return j(() => {
    setTimeout(() => {
      e == null || e.load();
    }, 1e3);
  }, []), j(() => {
    const l = () => {
      s((d) => {
        const { pathName: f, modal: h, changingModal: p } = Tu(t, d, e == null ? void 0 : e.load, e == null ? void 0 : e.paths);
        return h && p && (a(!0), h.then(() => a(!1))), f;
      });
    };
    return l(), window.addEventListener("hashchange", l), () => {
      window.removeEventListener("hashchange", l);
    };
  }, []), i === void 0 ? null : /* @__PURE__ */ D.jsx(
    Oi.Provider,
    {
      value: {
        route: i,
        updateRoute: u,
        loadingModal: o,
        eventTarget: c
      },
      children: n
    }
  );
};
function Pu() {
  return ne(Oi);
}
const Ru = () => /* @__PURE__ */ D.jsx("div", { children: /* @__PURE__ */ D.jsx("h1", { children: "Post analytics" }) }), Iu = {
  paths: {
    "demo-modal": "DemoModal"
  },
  load: async () => import("./modals-6ff42da2.mjs")
}, $u = ({ framework: t, designSystem: e }) => /* @__PURE__ */ D.jsx(Ou, { ...t, children: /* @__PURE__ */ D.jsx(Du, { basePath: "post-analytics-spike", modals: Iu, children: /* @__PURE__ */ D.jsx(nu, { className: "post-analytics-spike", ...e, children: /* @__PURE__ */ D.jsx(Ru, {}) }) }) });
export {
  $u as A,
  Ti as C,
  gr as N,
  P as R,
  rs as a,
  C as b,
  $i as c,
  Nu as d,
  ue as e,
  ki as f,
  j as g,
  Pu as h,
  nr as i,
  D as j,
  pr as u
};
//# sourceMappingURL=index-dba6ef57.mjs.map
