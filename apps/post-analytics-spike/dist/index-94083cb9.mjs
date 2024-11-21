function Ad(e) {
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
var Vs = { exports: {} }, er = {};
const we = React.Children, Xs = React.Component, tn = React.Fragment, Ld = React.Profiler, Cd = React.PureComponent, Td = React.StrictMode, kd = React.Suspense, zd = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, Ed = React.act, It = React.cloneElement, q = React.createContext, c = React.createElement, Pd = React.createFactory, Zd = React.createRef, Y = React, y = React.forwardRef, Tt = React.isValidElement, _d = React.lazy, Fs = React.memo, Od = React.startTransition, Wd = React.unstable_act, L = React.useCallback, re = React.useContext, Ud = React.useDebugValue, Rd = React.useDeferredValue, C = React.useEffect, Hd = React.useId, Gd = React.useImperativeHandle, Yd = React.useInsertionEffect, ko = React.useLayoutEffect, H = React.useMemo, nn = React.useReducer, A = React.useRef, O = React.useState, Bd = React.useSyncExternalStore, Qd = React.useTransition, $s = React.version, qs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: we,
  Component: Xs,
  Fragment: tn,
  Profiler: Ld,
  PureComponent: Cd,
  StrictMode: Td,
  Suspense: kd,
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: zd,
  act: Ed,
  cloneElement: It,
  createContext: q,
  createElement: c,
  createFactory: Pd,
  createRef: Zd,
  default: Y,
  forwardRef: y,
  isValidElement: Tt,
  lazy: _d,
  memo: Fs,
  startTransition: Od,
  unstable_act: Wd,
  useCallback: L,
  useContext: re,
  useDebugValue: Ud,
  useDeferredValue: Rd,
  useEffect: C,
  useId: Hd,
  useImperativeHandle: Gd,
  useInsertionEffect: Yd,
  useLayoutEffect: ko,
  useMemo: H,
  useReducer: nn,
  useRef: A,
  useState: O,
  useSyncExternalStore: Bd,
  useTransition: Qd,
  version: $s
}, Symbol.toStringTag, { value: "Module" })), Jd = /* @__PURE__ */ Ad(qs);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Vd = Jd, Xd = Symbol.for("react.element"), Fd = Symbol.for("react.fragment"), $d = Object.prototype.hasOwnProperty, qd = Vd.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, Kd = { key: !0, ref: !0, __self: !0, __source: !0 };
function Ks(e, t, n) {
  var r, o = {}, i = null, s = null;
  n !== void 0 && (i = "" + n), t.key !== void 0 && (i = "" + t.key), t.ref !== void 0 && (s = t.ref);
  for (r in t)
    $d.call(t, r) && !Kd.hasOwnProperty(r) && (o[r] = t[r]);
  if (e && e.defaultProps)
    for (r in t = e.defaultProps, t)
      o[r] === void 0 && (o[r] = t[r]);
  return { $$typeof: Xd, type: e, key: i, ref: s, props: o, _owner: qd.current };
}
er.Fragment = Fd;
er.jsx = Ks;
er.jsxs = Ks;
Vs.exports = er;
var M = Vs.exports;
function ea(e) {
  var t, n, r = "";
  if (typeof e == "string" || typeof e == "number")
    r += e;
  else if (typeof e == "object")
    if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++)
        e[t] && (n = ea(e[t])) && (r && (r += " "), r += n);
    } else
      for (n in e)
        e[n] && (r && (r += " "), r += n);
  return r;
}
function zo() {
  for (var e, t, n = 0, r = "", o = arguments.length; n < o; n++)
    (e = arguments[n]) && (t = ea(e)) && (r && (r += " "), r += t);
  return r;
}
const e0 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "add"), /* @__PURE__ */ c("line", { x1: 0.75, y1: 12, x2: 23.25, y2: 12, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("line", { x1: 12, y1: 0.75, x2: 12, y2: 23.25, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" })), t0 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PC9kZWZzPjx0aXRsZT5hZGQ8L3RpdGxlPjxsaW5lIHgxPSIwLjc1IiB5MT0iMTIiIHgyPSIyMy4yNSIgeTI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L2xpbmU+PGxpbmUgeDE9IjEyIiB5MT0iMC43NSIgeDI9IjEyIiB5Mj0iMjMuMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41cHgiPjwvbGluZT48L3N2Zz4=", n0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: e0,
  default: t0
}, Symbol.toStringTag, { value: "Module" })), r0 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M13.341093749999999 17.55496875c2.03146875 -0.408375 3.667125 -2.0639062499999996 4.07615625 -4.14796875 0.40903125 2.0840625 2.0442187499999998 3.73959375 4.07578125 4.14796875m0 0.00234375c-2.0315624999999997 0.408375 -3.667125 2.0639062499999996 -4.07615625 4.14796875 -0.40903125 -2.0840625 -2.0443125 -3.73959375 -4.07578125 -4.14796875", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m19.54621875 12.32025 0.56521875 -0.56521875c0.53071875 -0.53071875 0.8272499999999999 -1.25146875 0.8236875 -2.00203125l-0.0271875 -5.777896875000001c-0.00721875 -1.5429374999999999 -1.25625 -2.791940625 -2.7991875 -2.799225l-5.778 -0.027290625c-0.7505625 -0.003553125 -1.4713124999999998 0.293034375 -2.00203125 0.82374375L1.32765 10.97353125c-0.732223125 0.7321875 -0.7322203125000001 1.91934375 0.000009375 2.6516249999999997l7.13105625 7.131c0.732234375 0.73228125 1.9194093749999999 0.73228125 2.6516906249999996 0l0.94190625 -0.94190625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 10, d: "M17.75428125 4.329000000000001c-0.1393125 -0.13935 -0.41803125 -0.139359375 -0.5574375 0 -0.1393125 0.13935 -0.1393125 0.418059375 0 0.557409375", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 10, d: "M17.7553125 4.328221875c0.13940625 0.13935 0.13940625 0.418059375 0 0.55741875 -0.1393125 0.13935 -0.41803125 0.13934062500000002 -0.55734375 -0.000009375", strokeWidth: 1.5 })), o0 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xMy4zNDEwOTM3NDk5OTk5OTkgMTcuNTU0OTY4NzVjMi4wMzE0Njg3NSAtMC40MDgzNzUgMy42NjcxMjUgLTIuMDYzOTA2MjQ5OTk5OTk5NiA0LjA3NjE1NjI1IC00LjE0Nzk2ODc1IDAuNDA5MDMxMjUgMi4wODQwNjI1IDIuMDQ0MjE4NzQ5OTk5OTk5OCAzLjczOTU5Mzc1IDQuMDc1NzgxMjUgNC4xNDc5Njg3NW0wIDAuMDAyMzQzNzVjLTIuMDMxNTYyNDk5OTk5OTk5NyAwLjQwODM3NSAtMy42NjcxMjUgMi4wNjM5MDYyNDk5OTk5OTk2IC00LjA3NjE1NjI1IDQuMTQ3OTY4NzUgLTAuNDA5MDMxMjUgLTIuMDg0MDYyNSAtMi4wNDQzMTI1IC0zLjczOTU5Mzc1IC00LjA3NTc4MTI1IC00LjE0Nzk2ODc1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0xOS41NDYyMTg3NSAxMi4zMjAyNSAwLjU2NTIxODc1IC0wLjU2NTIxODc1YzAuNTMwNzE4NzUgLTAuNTMwNzE4NzUgMC44MjcyNDk5OTk5OTk5OTk5IC0xLjI1MTQ2ODc1IDAuODIzNjg3NSAtMi4wMDIwMzEyNWwtMC4wMjcxODc1IC01Ljc3Nzg5Njg3NTAwMDAwMWMtMC4wMDcyMTg3NSAtMS41NDI5Mzc0OTk5OTk5OTk5IC0xLjI1NjI1IC0yLjc5MTk0MDYyNSAtMi43OTkxODc1IC0yLjc5OTIyNWwtNS43NzggLTAuMDI3MjkwNjI1Yy0wLjc1MDU2MjUgLTAuMDAzNTUzMTI1IC0xLjQ3MTMxMjQ5OTk5OTk5OTggMC4yOTMwMzQzNzUgLTIuMDAyMDMxMjUgMC44MjM3NDM3NUwxLjMyNzY1IDEwLjk3MzUzMTI1Yy0wLjczMjIyMzEyNSAwLjczMjE4NzUgLTAuNzMyMjIwMzEyNTAwMDAwMSAxLjkxOTM0Mzc1IDAuMDAwMDA5Mzc1IDIuNjUxNjI0OTk5OTk5OTk5N2w3LjEzMTA1NjI1IDcuMTMxYzAuNzMyMjM0Mzc1IDAuNzMyMjgxMjUgMS45MTk0MDkzNzQ5OTk5OTk5IDAuNzMyMjgxMjUgMi42NTE2OTA2MjQ5OTk5OTk2IDBsMC45NDE5MDYyNSAtMC45NDE5MDYyNSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGQ9Ik0xNy43NTQyODEyNSA0LjMyOTAwMDAwMDAwMDAwMWMtMC4xMzkzMTI1IC0wLjEzOTM1IC0wLjQxODAzMTI1IC0wLjEzOTM1OTM3NSAtMC41NTc0Mzc1IDAgLTAuMTM5MzEyNSAwLjEzOTM1IC0wLjEzOTMxMjUgMC40MTgwNTkzNzUgMCAwLjU1NzQwOTM3NSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGQ9Ik0xNy43NTUzMTI1IDQuMzI4MjIxODc1YzAuMTM5NDA2MjUgMC4xMzkzNSAwLjEzOTQwNjI1IDAuNDE4MDU5Mzc1IDAgMC41NTc0MTg3NSAtMC4xMzkzMTI1IDAuMTM5MzUgLTAuNDE4MDMxMjUgMC4xMzkzNDA2MjUwMDAwMDAwMiAtMC41NTczNDM3NSAtMC4wMDAwMDkzNzUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", i0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: r0,
  default: o0
}, Symbol.toStringTag, { value: "Module" })), s0 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 10 10", ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M9 1.5H1" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M7.5 5h-5" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M9 8.5H1" })), a0 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAxMCAxMCI+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTkgMS41SDEiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNNy41IDVoLTUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNOSA4LjVIMSI+PC9wYXRoPjwvc3ZnPg==", c0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: s0,
  default: a0
}, Symbol.toStringTag, { value: "Module" })), l0 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 10 10", ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M1 1.5h8" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M1 5h5.5" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M1 8.5h8" })), u0 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAxMCAxMCI+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTEgMS41aDgiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMSA1aDUuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xIDguNWg4Ij48L3BhdGg+PC9zdmc+", d0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: l0,
  default: u0
}, Symbol.toStringTag, { value: "Module" })), g0 = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "m7.152187499999999 4.21875 -6.0375000000000005 6.0365625000000005a1.40625 1.40625 0 0 0 0 1.9884375l6.0375000000000005 6.0375000000000005", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m15.347812499999998 4.21875 6.0375000000000005 6.0365625000000005a1.40625 1.40625 0 0 1 0 1.9884375l-6.0375000000000005 6.0375000000000005", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), M0 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Im03LjE1MjE4NzQ5OTk5OTk5OSA0LjIxODc1IC02LjAzNzUwMDAwMDAwMDAwMDUgNi4wMzY1NjI1MDAwMDAwMDA1YTEuNDA2MjUgMS40MDYyNSAwIDAgMCAwIDEuOTg4NDM3NWw2LjAzNzUwMDAwMDAwMDAwMDUgNi4wMzc1MDAwMDAwMDAwMDA1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Im0xNS4zNDc4MTI0OTk5OTk5OTggNC4yMTg3NSA2LjAzNzUwMDAwMDAwMDAwMDUgNi4wMzY1NjI1MDAwMDAwMDA1YTEuNDA2MjUgMS40MDYyNSAwIDAgMSAwIDEuOTg4NDM3NWwtNi4wMzc1MDAwMDAwMDAwMDA1IDYuMDM3NTAwMDAwMDAwMDAwNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", I0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: g0,
  default: M0
}, Symbol.toStringTag, { value: "Module" })), m0 = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-corner-left"), /* @__PURE__ */ c("path", { d: "M20.16 3.75 4.25 19.66", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m4.25 4.66 0 15 15 0", fillRule: "evenodd", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), p0 = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZS13aWR0aD0iMS41Ij48ZGVmcz48L2RlZnM+PHRpdGxlPmFycm93LWNvcm5lci1sZWZ0PC90aXRsZT48cGF0aCBkPSJNMjAuMTYgMy43NSA0LjI1IDE5LjY2IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PHBhdGggZD0ibTQuMjUgNC42NiAwIDE1IDE1IDAiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjwvc3ZnPg==", f0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: m0,
  default: p0
}, Symbol.toStringTag, { value: "Module" })), b0 = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-corner-right"), /* @__PURE__ */ c("path", { d: "m4 3.75 15.91 15.91", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m4.91 19.66 15 0 0-15", fillRule: "evenodd", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), N0 = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZS13aWR0aD0iMS41Ij48ZGVmcz48L2RlZnM+PHRpdGxlPmFycm93LWNvcm5lci1yaWdodDwvdGl0bGU+PHBhdGggZD0ibTQgMy43NSAxNS45MSAxNS45MSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Im00LjkxIDE5LjY2IDE1IDAgMC0xNSIgZmlsbC1ydWxlPSJldmVub2RkIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PC9zdmc+", j0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: b0,
  default: N0
}, Symbol.toStringTag, { value: "Module" })), y0 = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-down"), /* @__PURE__ */ c("line", { x1: 12, y1: 0.75, x2: 12, y2: 23.25, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("polyline", { points: "1.5 12.75 12 23.25 22.5 12.75", fillRule: "evenodd", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" })), h0 = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+YXJyb3ctZG93bjwvdGl0bGU+PGxpbmUgeDE9IjEyIiB5MT0iMC43NSIgeDI9IjEyIiB5Mj0iMjMuMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41cHgiPjwvbGluZT48cG9seWxpbmUgcG9pbnRzPSIxLjUgMTIuNzUgMTIgMjMuMjUgMjIuNSAxMi43NSIgZmlsbC1ydWxlPSJldmVub2RkIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L3BvbHlsaW5lPjwvc3ZnPg==", v0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: y0,
  default: h0
}, Symbol.toStringTag, { value: "Module" })), w0 = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-left"), /* @__PURE__ */ c("line", { x1: 23.25, y1: 12, x2: 0.75, y2: 12, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("polyline", { points: "11.25 1.5 0.75 12 11.25 22.5", fillRule: "evenodd", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" })), D0 = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+YXJyb3ctbGVmdDwvdGl0bGU+PGxpbmUgeDE9IjIzLjI1IiB5MT0iMTIiIHgyPSIwLjc1IiB5Mj0iMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41cHgiPjwvbGluZT48cG9seWxpbmUgcG9pbnRzPSIxMS4yNSAxLjUgMC43NSAxMiAxMS4yNSAyMi41IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41cHgiPjwvcG9seWxpbmU+PC9zdmc+", S0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: w0,
  default: D0
}, Symbol.toStringTag, { value: "Module" })), x0 = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-right"), /* @__PURE__ */ c("line", { x1: 0.75, y1: 12, x2: 23.25, y2: 12, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("polyline", { points: "12.75 22.5 23.25 12 12.75 1.5", fillRule: "evenodd", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" })), A0 = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+YXJyb3ctcmlnaHQ8L3RpdGxlPjxsaW5lIHgxPSIwLjc1IiB5MT0iMTIiIHgyPSIyMy4yNSIgeTI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L2xpbmU+PHBvbHlsaW5lIHBvaW50cz0iMTIuNzUgMjIuNSAyMy4yNSAxMiAxMi43NSAxLjUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjVweCI+PC9wb2x5bGluZT48L3N2Zz4=", L0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: x0,
  default: A0
}, Symbol.toStringTag, { value: "Module" })), C0 = (e) => /* @__PURE__ */ c("svg", { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", ...e }, /* @__PURE__ */ c("path", { d: "M20.16 20.25L4.25 4.34", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M4.25 19.3398V4.33984H19.25", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" })), T0 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwLjE2IDIwLjI1TDQuMjUgNC4zNCIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTQuMjUgMTkuMzM5OFY0LjMzOTg0SDE5LjI1IiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K", k0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: C0,
  default: T0
}, Symbol.toStringTag, { value: "Module" })), z0 = (e) => /* @__PURE__ */ c("svg", { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", ...e }, /* @__PURE__ */ c("path", { d: "M3.84 20.25L19.75 4.34", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M19.75 19.3398V4.33984H4.75", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" })), E0 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuODQgMjAuMjVMMTkuNzUgNC4zNCIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTE5Ljc1IDE5LjMzOThWNC4zMzk4NEg0Ljc1IiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K", P0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: z0,
  default: E0
}, Symbol.toStringTag, { value: "Module" })), Z0 = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-up"), /* @__PURE__ */ c("line", { x1: 12, y1: 23.25, x2: 12, y2: 0.75, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("polyline", { points: "22.5 11.25 12 0.75 1.5 11.25", fillRule: "evenodd", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" })), _0 = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+YXJyb3ctdXA8L3RpdGxlPjxsaW5lIHgxPSIxMiIgeTE9IjIzLjI1IiB4Mj0iMTIiIHkyPSIwLjc1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L2xpbmU+PHBvbHlsaW5lIHBvaW50cz0iMjIuNSAxMS4yNSAxMiAwLjc1IDEuNSAxMS4yNSIgZmlsbC1ydWxlPSJldmVub2RkIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L3BvbHlsaW5lPjwvc3ZnPg==", O0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: Z0,
  default: _0
}, Symbol.toStringTag, { value: "Module" })), W0 = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M16.171875 11.25A4.921875 4.921875 0 1 1 11.25 6.328125 4.921875 4.921875 0 0 1 16.171875 11.25Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M16.171875 11.25v2.109375a2.8125 2.8125 0 0 0 5.625 0V11.25a10.5459375 10.5459375 0 1 0 -4.21875 8.4375", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), U0 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik0xNi4xNzE4NzUgMTEuMjVBNC45MjE4NzUgNC45MjE4NzUgMCAxIDEgMTEuMjUgNi4zMjgxMjUgNC45MjE4NzUgNC45MjE4NzUgMCAwIDEgMTYuMTcxODc1IDExLjI1WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMTYuMTcxODc1IDExLjI1djIuMTA5Mzc1YTIuODEyNSAyLjgxMjUgMCAwIDAgNS42MjUgMFYxMS4yNWExMC41NDU5Mzc1IDEwLjU0NTkzNzUgMCAxIDAgLTQuMjE4NzUgOC40Mzc1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", R0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: W0,
  default: U0
}, Symbol.toStringTag, { value: "Module" })), H0 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M0.9375 20.0625h1.8403125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M19.723125 20.0625H21.5625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M15.02625 20.0625h1.8403125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M10.3303125 20.0625h1.839375", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M5.6343749999999995 20.0625h1.839375", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m0.9375 16.53 4.790625 -6.511875a3.1565625 3.1565625 0 0 1 3.1753125 -1.2225000000000001l4.685625 0.9590624999999999a3.1565625 3.1565625 0 0 0 3.17625 -1.2215624999999999l4.790625 -6.511875", strokeWidth: 1.5 })), G0 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0wLjkzNzUgMjAuMDYyNWgxLjg0MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTE5LjcyMzEyNSAyMC4wNjI1SDIxLjU2MjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTE1LjAyNjI1IDIwLjA2MjVoMS44NDAzMTI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xMC4zMzAzMTI1IDIwLjA2MjVoMS44MzkzNzUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuNjM0Mzc0OTk5OTk5OTk5NSAyMC4wNjI1aDEuODM5Mzc1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0wLjkzNzUgMTYuNTMgNC43OTA2MjUgLTYuNTExODc1YTMuMTU2NTYyNSAzLjE1NjU2MjUgMCAwIDEgMy4xNzUzMTI1IC0xLjIyMjUwMDAwMDAwMDAwMDFsNC42ODU2MjUgMC45NTkwNjI0OTk5OTk5OTk5YTMuMTU2NTYyNSAzLjE1NjU2MjUgMCAwIDAgMy4xNzYyNSAtMS4yMjE1NjI0OTk5OTk5OTk5bDQuNzkwNjI1IC02LjUxMTg3NSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", Y0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: H0,
  default: G0
}, Symbol.toStringTag, { value: "Module" })), B0 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", id: "Alarm-Bell--Streamline-Streamline--3.0", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "Alarm Bell Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "alarm-bell"), /* @__PURE__ */ c("path", { d: "M10 21.75a2.087 2.087 0 0 0 4.005 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m12 3 0 -2.25", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M12 3a7.5 7.5 0 0 1 7.5 7.5c0 7.046 1.5 8.25 1.5 8.25H3s1.5 -1.916 1.5 -8.25A7.5 7.5 0 0 1 12 3Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), Q0 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IkFsYXJtLUJlbGwtLVN0cmVhbWxpbmUtU3RyZWFtbGluZS0tMy4wIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZXNjPkFsYXJtIEJlbGwgU3RyZWFtbGluZSBJY29uOiBodHRwczovL3N0cmVhbWxpbmVocS5jb208L2Rlc2M+PGRlZnM+PC9kZWZzPjx0aXRsZT5hbGFybS1iZWxsPC90aXRsZT48cGF0aCBkPSJNMTAgMjEuNzVhMi4wODcgMi4wODcgMCAwIDAgNC4wMDUgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJtMTIgMyAwIC0yLjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0xMiAzYTcuNSA3LjUgMCAwIDEgNy41IDcuNWMwIDcuMDQ2IDEuNSA4LjI1IDEuNSA4LjI1SDNzMS41IC0xLjkxNiAxLjUgLTguMjVBNy41IDcuNSAwIDAgMSAxMiAzWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", J0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: B0,
  default: Q0
}, Symbol.toStringTag, { value: "Module" })), V0 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M17.578125 4.21875H2.109375A1.40625 1.40625 0 0 0 0.703125 5.625v8.4375a1.40625 1.40625 0 0 0 1.40625 1.40625h15.46875a1.40625 1.40625 0 0 0 1.40625 -1.40625V5.625a1.40625 1.40625 0 0 0 -1.40625 -1.40625Z", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M3.8671875 7.734375a0.3515625 0.3515625 0 1 1 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M3.8671875 7.734375a0.3515625 0.3515625 0 1 0 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M15.8203125 12.65625a0.3515625 0.3515625 0 0 1 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M15.8203125 12.65625a0.3515625 0.3515625 0 0 0 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M9.84375 12.65625a2.8125 2.8125 0 1 0 0 -5.625 2.8125 2.8125 0 0 0 0 5.625Z", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M21.796875 8.4375v8.4375a1.40625 1.40625 0 0 1 -1.40625 1.40625H4.921875", strokeWidth: 1.5 })), X0 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xNy41NzgxMjUgNC4yMTg3NUgyLjEwOTM3NUExLjQwNjI1IDEuNDA2MjUgMCAwIDAgMC43MDMxMjUgNS42MjV2OC40Mzc1YTEuNDA2MjUgMS40MDYyNSAwIDAgMCAxLjQwNjI1IDEuNDA2MjVoMTUuNDY4NzVhMS40MDYyNSAxLjQwNjI1IDAgMCAwIDEuNDA2MjUgLTEuNDA2MjVWNS42MjVhMS40MDYyNSAxLjQwNjI1IDAgMCAwIC0xLjQwNjI1IC0xLjQwNjI1WiIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgZD0iTTMuODY3MTg3NSA3LjczNDM3NWEwLjM1MTU2MjUgMC4zNTE1NjI1IDAgMSAxIDAgLTAuNzAzMTI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBkPSJNMy44NjcxODc1IDcuNzM0Mzc1YTAuMzUxNTYyNSAwLjM1MTU2MjUgMCAxIDAgMCAtMC43MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik0xNS44MjAzMTI1IDEyLjY1NjI1YTAuMzUxNTYyNSAwLjM1MTU2MjUgMCAwIDEgMCAtMC43MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik0xNS44MjAzMTI1IDEyLjY1NjI1YTAuMzUxNTYyNSAwLjM1MTU2MjUgMCAwIDAgMCAtMC43MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTkuODQzNzUgMTIuNjU2MjVhMi44MTI1IDIuODEyNSAwIDEgMCAwIC01LjYyNSAyLjgxMjUgMi44MTI1IDAgMCAwIDAgNS42MjVaIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0yMS43OTY4NzUgOC40Mzc1djguNDM3NWExLjQwNjI1IDEuNDA2MjUgMCAwIDEgLTEuNDA2MjUgMS40MDYyNUg0LjkyMTg3NSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", F0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: V0,
  default: X0
}, Symbol.toStringTag, { value: "Module" })), $0 = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M12.1875 21.474375a15.9271875 15.9271875 0 0 1 8.3025 -3.646875 1.5 1.5 0 0 0 1.3040625000000001 -1.4878125V2.2171875a1.5121875 1.5121875 0 0 0 -1.7203125 -1.5A16.009687500000002 16.009687500000002 0 0 0 12.1875 4.3125a1.53375 1.53375 0 0 1 -1.875 0A16.009687500000002 16.009687500000002 0 0 0 2.4234375 0.7190625 1.5121875 1.5121875 0 0 0 0.703125 2.2171875v14.1225a1.5 1.5 0 0 0 1.3040625000000001 1.4878125A15.9271875 15.9271875 0 0 1 10.3125 21.474375a1.5309375 1.5309375 0 0 0 1.875 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m11.25 4.629375 0 17.1665625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), q0 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik0xMi4xODc1IDIxLjQ3NDM3NWExNS45MjcxODc1IDE1LjkyNzE4NzUgMCAwIDEgOC4zMDI1IC0zLjY0Njg3NSAxLjUgMS41IDAgMCAwIDEuMzA0MDYyNTAwMDAwMDAwMSAtMS40ODc4MTI1VjIuMjE3MTg3NWExLjUxMjE4NzUgMS41MTIxODc1IDAgMCAwIC0xLjcyMDMxMjUgLTEuNUExNi4wMDk2ODc1MDAwMDAwMDIgMTYuMDA5Njg3NTAwMDAwMDAyIDAgMCAwIDEyLjE4NzUgNC4zMTI1YTEuNTMzNzUgMS41MzM3NSAwIDAgMSAtMS44NzUgMEExNi4wMDk2ODc1MDAwMDAwMDIgMTYuMDA5Njg3NTAwMDAwMDAyIDAgMCAwIDIuNDIzNDM3NSAwLjcxOTA2MjUgMS41MTIxODc1IDEuNTEyMTg3NSAwIDAgMCAwLjcwMzEyNSAyLjIxNzE4NzV2MTQuMTIyNWExLjUgMS41IDAgMCAwIDEuMzA0MDYyNTAwMDAwMDAwMSAxLjQ4NzgxMjVBMTUuOTI3MTg3NSAxNS45MjcxODc1IDAgMCAxIDEwLjMxMjUgMjEuNDc0Mzc1YTEuNTMwOTM3NSAxLjUzMDkzNzUgMCAwIDAgMS44NzUgMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTExLjI1IDQuNjI5Mzc1IDAgMTcuMTY2NTYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", K0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: $0,
  default: q0
}, Symbol.toStringTag, { value: "Module" })), eg = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "m7.152187499999999 4.21875 -6.0375000000000005 6.0365625000000005a1.40625 1.40625 0 0 0 0 1.9884375l6.0375000000000005 6.0375000000000005", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m15.347812499999998 4.21875 6.0375000000000005 6.0365625000000005a1.40625 1.40625 0 0 1 0 1.9884375l-6.0375000000000005 6.0375000000000005", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), tg = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Im03LjE1MjE4NzQ5OTk5OTk5OSA0LjIxODc1IC02LjAzNzUwMDAwMDAwMDAwMDUgNi4wMzY1NjI1MDAwMDAwMDA1YTEuNDA2MjUgMS40MDYyNSAwIDAgMCAwIDEuOTg4NDM3NWw2LjAzNzUwMDAwMDAwMDAwMDUgNi4wMzc1MDAwMDAwMDAwMDA1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Im0xNS4zNDc4MTI0OTk5OTk5OTggNC4yMTg3NSA2LjAzNzUwMDAwMDAwMDAwMDUgNi4wMzY1NjI1MDAwMDAwMDA1YTEuNDA2MjUgMS40MDYyNSAwIDAgMSAwIDEuOTg4NDM3NWwtNi4wMzc1MDAwMDAwMDAwMDA1IDYuMDM3NTAwMDAwMDAwMDAwNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", ng = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: eg,
  default: tg
}, Symbol.toStringTag, { value: "Module" })), rg = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", id: "Layout-Agenda--Streamline-Ultimate", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "Layout Agenda Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "layout-agenda"), /* @__PURE__ */ c("path", { d: "M2.25 0.747h19.5s1.5 0 1.5 1.5v6s0 1.5 -1.5 1.5H2.25s-1.5 0 -1.5 -1.5v-6s0 -1.5 1.5 -1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.25 14.247h19.5s1.5 0 1.5 1.5v6s0 1.5 -1.5 1.5H2.25s-1.5 0 -1.5 -1.5v-6s0 -1.5 1.5 -1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), og = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IkxheW91dC1BZ2VuZGEtLVN0cmVhbWxpbmUtVWx0aW1hdGUiIGhlaWdodD0iMjQiIHdpZHRoPSIyNCI+PGRlc2M+TGF5b3V0IEFnZW5kYSBTdHJlYW1saW5lIEljb246IGh0dHBzOi8vc3RyZWFtbGluZWhxLmNvbTwvZGVzYz48ZGVmcz48L2RlZnM+PHRpdGxlPmxheW91dC1hZ2VuZGE8L3RpdGxlPjxwYXRoIGQ9Ik0yLjI1IDAuNzQ3aDE5LjVzMS41IDAgMS41IDEuNXY2czAgMS41IC0xLjUgMS41SDIuMjVzLTEuNSAwIC0xLjUgLTEuNXYtNnMwIC0xLjUgMS41IC0xLjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTIuMjUgMTQuMjQ3aDE5LjVzMS41IDAgMS41IDEuNXY2czAgMS41IC0xLjUgMS41SDIuMjVzLTEuNSAwIC0xLjUgLTEuNXYtNnMwIC0xLjUgMS41IC0xLjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", ig = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: rg,
  default: og
}, Symbol.toStringTag, { value: "Module" })), sg = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "layout-module-1"), /* @__PURE__ */ c("path", { d: "M2.109375 0.7003125h5.625s1.40625 0 1.40625 1.40625v5.625s0 1.40625 -1.40625 1.40625h-5.625s-1.40625 0 -1.40625 -1.40625v-5.625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.109375 13.356562499999999h5.625s1.40625 0 1.40625 1.40625v5.625s0 1.40625 -1.40625 1.40625h-5.625s-1.40625 0 -1.40625 -1.40625v-5.625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M14.765625 0.7003125h5.625s1.40625 0 1.40625 1.40625v5.625s0 1.40625 -1.40625 1.40625h-5.625s-1.40625 0 -1.40625 -1.40625v-5.625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M14.765625 13.356562499999999h5.625s1.40625 0 1.40625 1.40625v5.625s0 1.40625 -1.40625 1.40625h-5.625s-1.40625 0 -1.40625 -1.40625v-5.625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), ag = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+bGF5b3V0LW1vZHVsZS0xPC90aXRsZT48cGF0aCBkPSJNMi4xMDkzNzUgMC43MDAzMTI1aDUuNjI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2NS42MjVzMCAxLjQwNjI1IC0xLjQwNjI1IDEuNDA2MjVoLTUuNjI1cy0xLjQwNjI1IDAgLTEuNDA2MjUgLTEuNDA2MjV2LTUuNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMi4xMDkzNzUgMTMuMzU2NTYyNDk5OTk5OTk5aDUuNjI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2NS42MjVzMCAxLjQwNjI1IC0xLjQwNjI1IDEuNDA2MjVoLTUuNjI1cy0xLjQwNjI1IDAgLTEuNDA2MjUgLTEuNDA2MjV2LTUuNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMTQuNzY1NjI1IDAuNzAwMzEyNWg1LjYyNXMxLjQwNjI1IDAgMS40MDYyNSAxLjQwNjI1djUuNjI1czAgMS40MDYyNSAtMS40MDYyNSAxLjQwNjI1aC01LjYyNXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1di01LjYyNXMwIC0xLjQwNjI1IDEuNDA2MjUgLTEuNDA2MjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTE0Ljc2NTYyNSAxMy4zNTY1NjI0OTk5OTk5OTloNS42MjVzMS40MDYyNSAwIDEuNDA2MjUgMS40MDYyNXY1LjYyNXMwIDEuNDA2MjUgLTEuNDA2MjUgMS40MDYyNWgtNS42MjVzLTEuNDA2MjUgMCAtMS40MDYyNSAtMS40MDYyNXYtNS42MjVzMCAtMS40MDYyNSAxLjQwNjI1IC0xLjQwNjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", cg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: sg,
  default: ag
}, Symbol.toStringTag, { value: "Module" })), lg = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("path", { d: "M6,13.223,8.45,16.7a1.049,1.049,0,0,0,1.707.051L18,6.828", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M0.750 11.999 A11.250 11.250 0 1 0 23.250 11.999 A11.250 11.250 0 1 0 0.750 11.999 Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), ug = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGQ9Ik02LDEzLjIyMyw4LjQ1LDE2LjdhMS4wNDksMS4wNDksMCwwLDAsMS43MDcuMDUxTDE4LDYuODI4IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PHBhdGggZD0iTTAuNzUwIDExLjk5OSBBMTEuMjUwIDExLjI1MCAwIDEgMCAyMy4yNTAgMTEuOTk5IEExMS4yNTAgMTEuMjUwIDAgMSAwIDAuNzUwIDExLjk5OSBaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PC9zdmc+", dg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: lg,
  default: ug
}, Symbol.toStringTag, { value: "Module" })), gg = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("path", { style: {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, d: "m1.6 14.512 7.065 7.065 13.676-19", fill: "none", strokeLinecap: "round", strokeLinejoin: "round" })), Mg = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlLXdpZHRoPSIxLjUiPgogIDxwYXRoIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlOmN1cnJlbnRDb2xvcjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7IiBkPSJtMS42IDE0LjUxMiA3LjA2NSA3LjA2NSAxMy42NzYtMTkiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=", Ig = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: gg,
  default: Mg
}, Symbol.toStringTag, { value: "Module" })), mg = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-down-1"), /* @__PURE__ */ c("path", { d: "M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px", fillRule: "evenodd" })), pg = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+YXJyb3ctZG93bi0xPC90aXRsZT48cGF0aCBkPSJNMjMuMjUsNy4zMTEsMTIuNTMsMTguMDNhLjc0OS43NDksMCwwLDEtMS4wNiwwTC43NSw3LjMxMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjVweCIgZmlsbC1ydWxlPSJldmVub2RkIj48L3BhdGg+PC9zdmc+", fg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: mg,
  default: pg
}, Symbol.toStringTag, { value: "Module" })), bg = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-left-1"), /* @__PURE__ */ c("path", { d: "M16.25,23.25,5.53,12.53a.749.749,0,0,1,0-1.06L16.25.75", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px", fillRule: "evenodd" })), Ng = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+YXJyb3ctbGVmdC0xPC90aXRsZT48cGF0aCBkPSJNMTYuMjUsMjMuMjUsNS41MywxMi41M2EuNzQ5Ljc0OSwwLDAsMSwwLTEuMDZMMTYuMjUuNzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41cHgiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PC9wYXRoPjwvc3ZnPg==", jg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: bg,
  default: Ng
}, Symbol.toStringTag, { value: "Module" })), yg = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-right-1"), /* @__PURE__ */ c("path", { d: "M5.5.75,16.22,11.47a.749.749,0,0,1,0,1.06L5.5,23.25", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px", fillRule: "evenodd" })), hg = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+YXJyb3ctcmlnaHQtMTwvdGl0bGU+PHBhdGggZD0iTTUuNS43NSwxNi4yMiwxMS40N2EuNzQ5Ljc0OSwwLDAsMSwwLDEuMDZMNS41LDIzLjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjwvcGF0aD48L3N2Zz4=", vg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: yg,
  default: hg
}, Symbol.toStringTag, { value: "Module" })), wg = (e) => /* @__PURE__ */ c("svg", { id: "Regular", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "arrow-up-1"), /* @__PURE__ */ c("path", { d: "M.75,17.189,11.47,6.47a.749.749,0,0,1,1.06,0L23.25,17.189", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px", fillRule: "evenodd" })), Dg = "data:image/svg+xml;base64,PHN2ZyBpZD0iUmVndWxhciIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+YXJyb3ctdXAtMTwvdGl0bGU+PHBhdGggZD0iTS43NSwxNy4xODksMTEuNDcsNi40N2EuNzQ5Ljc0OSwwLDAsMSwxLjA2LDBMMjMuMjUsMTcuMTg5IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjwvcGF0aD48L3N2Zz4=", Sg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: wg,
  default: Dg
}, Symbol.toStringTag, { value: "Module" })), xg = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "close"), /* @__PURE__ */ c("line", { x1: 0.75, y1: 23.249, x2: 23.25, y2: 0.749, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("line", { x1: 23.25, y1: 23.249, x2: 0.75, y2: 0.749, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" })), Ag = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PC9kZWZzPjx0aXRsZT5jbG9zZTwvdGl0bGU+PGxpbmUgeDE9IjAuNzUiIHkxPSIyMy4yNDkiIHgyPSIyMy4yNSIgeTI9IjAuNzQ5IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L2xpbmU+PGxpbmUgeDE9IjIzLjI1IiB5MT0iMjMuMjQ5IiB4Mj0iMC43NSIgeTI9IjAuNzQ5IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L2xpbmU+PC9zdmc+", Lg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: xg,
  default: Ag
}, Symbol.toStringTag, { value: "Module" })), Cg = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", id: "Layout--Streamline-Ultimate", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "Layout Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m1.5 2.99707 0 18.00003c0 0.8284 0.67157 1.5 1.5 1.5l18 0c0.8284 0 1.5 -0.6716 1.5 -1.5l0 -18.00003c0 -0.82843 -0.6716 -1.5 -1.5 -1.5l-18 0c-0.82843 0 -1.5 0.67157 -1.5 1.5Z", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m12.0029 22.4971 0 -21.00003", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m12.0029 11.9971 10 0", strokeWidth: 1.5 })), Tg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IkxheW91dC0tU3RyZWFtbGluZS1VbHRpbWF0ZSIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0Ij48ZGVzYz5MYXlvdXQgU3RyZWFtbGluZSBJY29uOiBodHRwczovL3N0cmVhbWxpbmVocS5jb208L2Rlc2M+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTEuNSAyLjk5NzA3IDAgMTguMDAwMDNjMCAwLjgyODQgMC42NzE1NyAxLjUgMS41IDEuNWwxOCAwYzAuODI4NCAwIDEuNSAtMC42NzE2IDEuNSAtMS41bDAgLTE4LjAwMDAzYzAgLTAuODI4NDMgLTAuNjcxNiAtMS41IC0xLjUgLTEuNWwtMTggMGMtMC44Mjg0MyAwIC0xLjUgMC42NzE1NyAtMS41IDEuNVoiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTEyLjAwMjkgMjIuNDk3MSAwIC0yMS4wMDAwMyIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtMTIuMDAyOSAxMS45OTcxIDEwIDAiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", kg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: Cg,
  default: Tg
}, Symbol.toStringTag, { value: "Module" })), zg = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("path", { d: "M12 1.34C5.66 1.34 0.5 5.59 0.5 10.81a8.58 8.58 0 0 0 3.18 6.54l-2.3 4.59a0.49 0.49 0 0 0 0.09 0.57 0.5 0.5 0 0 0 0.57 0.1l6.15 -2.86a13.44 13.44 0 0 0 3.81 0.54c6.34 0 11.5 -4.25 11.5 -9.48S18.34 1.34 12 1.34Z", fill: "currentColor", strokeWidth: "1.5px" })), Eg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggZD0iTTEyIDEuMzRDNS42NiAxLjM0IDAuNSA1LjU5IDAuNSAxMC44MWE4LjU4IDguNTggMCAwIDAgMy4xOCA2LjU0bC0yLjMgNC41OWEwLjQ5IDAuNDkgMCAwIDAgMC4wOSAwLjU3IDAuNSAwLjUgMCAwIDAgMC41NyAwLjFsNi4xNSAtMi44NmExMy40NCAxMy40NCAwIDAgMCAzLjgxIDAuNTRjNi4zNCAwIDExLjUgLTQuMjUgMTEuNSAtOS40OFMxOC4zNCAxLjM0IDEyIDEuMzRaIiBmaWxsPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41cHgiPgogIDwvcGF0aD4KPC9zdmc+", Pg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: zg,
  default: Eg
}, Symbol.toStringTag, { value: "Module" })), Zg = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px", d: "M12.658 2a9.307 9.307 0 0 0-8.15 4.788 9.326 9.326 0 0 0 .23 9.456L2 22l5.75-2.74a9.32 9.32 0 0 0 13.894-5.372 9.341 9.341 0 0 0-1.532-8.185A9.328 9.328 0 0 0 12.658 2Z" })), _g = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjVweCIgZD0iTTEyLjY1OCAyYTkuMzA3IDkuMzA3IDAgMCAwLTguMTUgNC43ODggOS4zMjYgOS4zMjYgMCAwIDAgLjIzIDkuNDU2TDIgMjJsNS43NS0yLjc0YTkuMzIgOS4zMiAwIDAgMCAxMy44OTQtNS4zNzIgOS4zNDEgOS4zNDEgMCAwIDAtMS41MzItOC4xODVBOS4zMjggOS4zMjggMCAwIDAgMTIuNjU4IDJaIi8+Cjwvc3ZnPg==", Og = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: Zg,
  default: _g
}, Symbol.toStringTag, { value: "Module" })), Wg = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", strokeWidth: "1.5px", ...e }, /* @__PURE__ */ c("g", null, /* @__PURE__ */ c("path", { d: "M21.92,17l1.32-10a.75.75,0,0,0-1.08-.78L17.88,9.56a.74.74,0,0,1-1.09-.16L12.56,3.22a.74.74,0,0,0-1.12,0L7.21,9.4a.74.74,0,0,1-1.09.16L1.84,6.3a.75.75,0,0,0-1.08.78L2.08,17Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("line", { x1: 2.25, y1: 21.03, x2: 21.75, y2: 21.03, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }))), Ug = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjVweCI+PGc+PHBhdGggZD0iTTIxLjkyLDE3bDEuMzItMTBhLjc1Ljc1LDAsMCwwLTEuMDgtLjc4TDE3Ljg4LDkuNTZhLjc0Ljc0LDAsMCwxLTEuMDktLjE2TDEyLjU2LDMuMjJhLjc0Ljc0LDAsMCwwLTEuMTIsMEw3LjIxLDkuNGEuNzQuNzQsMCwwLDEtMS4wOS4xNkwxLjg0LDYuM2EuNzUuNzUsMCwwLDAtMS4wOC43OEwyLjA4LDE3WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxsaW5lIHgxPSIyLjI1IiB5MT0iMjEuMDMiIHgyPSIyMS43NSIgeTI9IjIxLjAzIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L2xpbmU+PC9nPjwvc3ZnPg==", Rg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: Wg,
  default: Ug
}, Symbol.toStringTag, { value: "Module" })), Hg = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "m2.109375 20.390625 18.28125 -18.28125Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M14.765625 17.578125a2.8125 2.8125 0 1 0 5.625 0 2.8125 2.8125 0 1 0 -5.625 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.109375 4.921875a2.8125 2.8125 0 1 0 5.625 0 2.8125 2.8125 0 1 0 -5.625 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), Gg = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Im0yLjEwOTM3NSAyMC4zOTA2MjUgMTguMjgxMjUgLTE4LjI4MTI1WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMTQuNzY1NjI1IDE3LjU3ODEyNWEyLjgxMjUgMi44MTI1IDAgMSAwIDUuNjI1IDAgMi44MTI1IDIuODEyNSAwIDEgMCAtNS42MjUgMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTIuMTA5Mzc1IDQuOTIxODc1YTIuODEyNSAyLjgxMjUgMCAxIDAgNS42MjUgMCAyLjgxMjUgMi44MTI1IDAgMSAwIC01LjYyNSAwWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4K", Yg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: Hg,
  default: Gg
}, Symbol.toStringTag, { value: "Module" })), Bg = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null, /* @__PURE__ */ c("style", null, `
      circle{fill:currentColor}
    `)), /* @__PURE__ */ c("circle", { cx: 3.25, cy: 12, r: 2.6 }), /* @__PURE__ */ c("circle", { cx: 12, cy: 12, r: 2.6 }), /* @__PURE__ */ c("circle", { cx: 20.75, cy: 12, r: 2.6 })), Qg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIGNpcmNsZXtmaWxsOmN1cnJlbnRDb2xvcn0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxjaXJjbGUgY3g9IjMuMjUiIGN5PSIxMiIgcj0iMi42Ii8+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMi42Ii8+CiAgPGNpcmNsZSBjeD0iMjAuNzUiIGN5PSIxMiIgcj0iMi42Ii8+Cjwvc3ZnPg==", Jg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: Bg,
  default: Qg
}, Symbol.toStringTag, { value: "Module" })), Vg = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "m11.2509375 3.515625 0 11.25", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m7.0321875 10.546875 4.21875 4.21875 4.21875 -4.21875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M21.797812500000003 14.765625v1.40625a2.8125 2.8125 0 0 1 -2.8125 2.8125h-15.46875a2.8125 2.8125 0 0 1 -2.8125 -2.8125v-1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), Xg = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Im0xMS4yNTA5Mzc1IDMuNTE1NjI1IDAgMTEuMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTcuMDMyMTg3NSAxMC41NDY4NzUgNC4yMTg3NSA0LjIxODc1IDQuMjE4NzUgLTQuMjE4NzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTIxLjc5NzgxMjUwMDAwMDAwMyAxNC43NjU2MjV2MS40MDYyNWEyLjgxMjUgMi44MTI1IDAgMCAxIC0yLjgxMjUgMi44MTI1aC0xNS40Njg3NWEyLjgxMjUgMi44MTI1IDAgMCAxIC0yLjgxMjUgLTIuODEyNXYtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", Fg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: Vg,
  default: Xg
}, Symbol.toStringTag, { value: "Module" })), $g = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M15.703125 4.21875V1.640625a0.9375 0.9375 0 0 0 -0.9375 -0.9375h-13.125a0.9375 0.9375 0 0 0 -0.9375 0.9375v13.125a0.9375 0.9375 0 0 0 0.9375 0.9375H4.21875", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinejoin: "round", d: "M6.796875 7.734375a0.9375 0.9375 0 0 1 0.9375 -0.9375h13.125a0.9375 0.9375 0 0 1 0.9375 0.9375v13.125a0.9375 0.9375 0 0 1 -0.9375 0.9375h-13.125a0.9375 0.9375 0 0 1 -0.9375 -0.9375v-13.125Z", strokeWidth: 1.5 })), qg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xNS43MDMxMjUgNC4yMTg3NVYxLjY0MDYyNWEwLjkzNzUgMC45Mzc1IDAgMCAwIC0wLjkzNzUgLTAuOTM3NWgtMTMuMTI1YTAuOTM3NSAwLjkzNzUgMCAwIDAgLTAuOTM3NSAwLjkzNzV2MTMuMTI1YTAuOTM3NSAwLjkzNzUgMCAwIDAgMC45Mzc1IDAuOTM3NUg0LjIxODc1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNNi43OTY4NzUgNy43MzQzNzVhMC45Mzc1IDAuOTM3NSAwIDAgMSAwLjkzNzUgLTAuOTM3NWgxMy4xMjVhMC45Mzc1IDAuOTM3NSAwIDAgMSAwLjkzNzUgMC45Mzc1djEzLjEyNWEwLjkzNzUgMC45Mzc1IDAgMCAxIC0wLjkzNzUgMC45Mzc1aC0xMy4xMjVhMC45Mzc1IDAuOTM3NSAwIDAgMSAtMC45Mzc1IC0wLjkzNzV2LTEzLjEyNVoiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", Kg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: $g,
  default: qg
}, Symbol.toStringTag, { value: "Module" })), eM = (e) => /* @__PURE__ */ c("svg", { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", ...e }, /* @__PURE__ */ c("circle", { cx: 6, cy: 12, r: 1.5, fill: "currentColor" }), /* @__PURE__ */ c("circle", { cx: 12, cy: 12, r: 1.5, fill: "currentColor" }), /* @__PURE__ */ c("path", { d: "M19.5 12C19.5 12.8284 18.8284 13.5 18 13.5C17.1716 13.5 16.5 12.8284 16.5 12C16.5 11.1716 17.1716 10.5 18 10.5C18.8284 10.5 19.5 11.1716 19.5 12Z", fill: "currentColor" })), tM = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjEyIiByPSIxLjUiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxLjUiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8cGF0aCBkPSJNMTkuNSAxMkMxOS41IDEyLjgyODQgMTguODI4NCAxMy41IDE4IDEzLjVDMTcuMTcxNiAxMy41IDE2LjUgMTIuODI4NCAxNi41IDEyQzE2LjUgMTEuMTcxNiAxNy4xNzE2IDEwLjUgMTggMTAuNUMxOC44Mjg0IDEwLjUgMTkuNSAxMS4xNzE2IDE5LjUgMTJaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+Cg==", nM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: eM,
  default: tM
}, Symbol.toStringTag, { value: "Module" })), rM = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M10.546875 16.171875a5.625 5.625 0 1 0 11.25 0 5.625 5.625 0 1 0 -11.25 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m18.67875 14.536875 -2.7234374999999997 3.6309375000000004a0.705 0.705 0 0 1 -1.0603125 0.0759375l-1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M7.734375 14.765625h-5.625a1.40625 1.40625 0 0 1 -1.40625 -1.40625v-11.25a1.40625 1.40625 0 0 1 1.40625 -1.40625h16.875a1.40625 1.40625 0 0 1 1.40625 1.40625V8.4375", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m20.0728125 1.21875 -7.635 5.8725000000000005a3.10125 3.10125 0 0 1 -3.781875 0L1.0209375 1.21875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), oM = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik0xMC41NDY4NzUgMTYuMTcxODc1YTUuNjI1IDUuNjI1IDAgMSAwIDExLjI1IDAgNS42MjUgNS42MjUgMCAxIDAgLTExLjI1IDBaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Im0xOC42Nzg3NSAxNC41MzY4NzUgLTIuNzIzNDM3NDk5OTk5OTk5NyAzLjYzMDkzNzUwMDAwMDAwMDRhMC43MDUgMC43MDUgMCAwIDEgLTEuMDYwMzEyNSAwLjA3NTkzNzVsLTEuNDA2MjUgLTEuNDA2MjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTcuNzM0Mzc1IDE0Ljc2NTYyNWgtNS42MjVhMS40MDYyNSAxLjQwNjI1IDAgMCAxIC0xLjQwNjI1IC0xLjQwNjI1di0xMS4yNWExLjQwNjI1IDEuNDA2MjUgMCAwIDEgMS40MDYyNSAtMS40MDYyNWgxNi44NzVhMS40MDYyNSAxLjQwNjI1IDAgMCAxIDEuNDA2MjUgMS40MDYyNVY4LjQzNzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTIwLjA3MjgxMjUgMS4yMTg3NSAtNy42MzUgNS44NzI1MDAwMDAwMDAwMDA1YTMuMTAxMjUgMy4xMDEyNSAwIDAgMSAtMy43ODE4NzUgMEwxLjAyMDkzNzUgMS4yMTg3NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", iM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: rM,
  default: oM
}, Symbol.toStringTag, { value: "Module" })), sM = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "m1.40625 4.453125 19.6875 0 0 14.0625 -19.6875 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m20.7759375 4.96875 -7.635 5.8725000000000005a3.10125 3.10125 0 0 1 -3.781875 0L1.7240625 4.96875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), aM = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Im0xLjQwNjI1IDQuNDUzMTI1IDE5LjY4NzUgMCAwIDE0LjA2MjUgLTE5LjY4NzUgMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTIwLjc3NTkzNzUgNC45Njg3NSAtNy42MzUgNS44NzI1MDAwMDAwMDAwMDA1YTMuMTAxMjUgMy4xMDEyNSAwIDAgMSAtMy43ODE4NzUgMEwxLjcyNDA2MjUgNC45Njg3NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", cM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: sM,
  default: aM
}, Symbol.toStringTag, { value: "Module" })), lM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("path", { d: "M21.796875 12.421875v5.859375a0.9375 0.9375 0 0 1 -0.9375 0.9375H1.640625a0.9375 0.9375 0 0 1 -0.9375 -0.9375V8.671875a0.9375 0.9375 0 0 1 0.9375 -0.9375H8.4375", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M18.125625 13.300312499999999A5.15625 5.15625 0 1 1 21.5625 8.4375", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M14.6878125 8.4375a1.7184375 1.7184375 0 1 0 3.436875 0 1.7184375 1.7184375 0 1 0 -3.436875 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M18.1246875 8.4375A1.719375 1.719375 0 0 0 21.5625 8.4375", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m4.3706249999999995 10.9378125 0 5.077500000000001", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), uM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZWZzPjwvZGVmcz48cGF0aCBkPSJNMjEuNzk2ODc1IDEyLjQyMTg3NXY1Ljg1OTM3NWEwLjkzNzUgMC45Mzc1IDAgMCAxIC0wLjkzNzUgMC45Mzc1SDEuNjQwNjI1YTAuOTM3NSAwLjkzNzUgMCAwIDEgLTAuOTM3NSAtMC45Mzc1VjguNjcxODc1YTAuOTM3NSAwLjkzNzUgMCAwIDEgMC45Mzc1IC0wLjkzNzVIOC40Mzc1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0xOC4xMjU2MjUgMTMuMzAwMzEyNDk5OTk5OTk5QTUuMTU2MjUgNS4xNTYyNSAwIDEgMSAyMS41NjI1IDguNDM3NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMTQuNjg3ODEyNSA4LjQzNzVhMS43MTg0Mzc1IDEuNzE4NDM3NSAwIDEgMCAzLjQzNjg3NSAwIDEuNzE4NDM3NSAxLjcxODQzNzUgMCAxIDAgLTMuNDM2ODc1IDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTE4LjEyNDY4NzUgOC40Mzc1QTEuNzE5Mzc1IDEuNzE5Mzc1IDAgMCAwIDIxLjU2MjUgOC40Mzc1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Im00LjM3MDYyNDk5OTk5OTk5OTUgMTAuOTM3ODEyNSAwIDUuMDc3NTAwMDAwMDAwMDAxIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", dM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: lM,
  default: uM
}, Symbol.toStringTag, { value: "Module" })), gM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", height: 24, width: 24, id: "Alert-Triangle--Streamline-Ultimate", ...e }, /* @__PURE__ */ c("desc", null, "Alert Triangle Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("path", { d: "m23.77 20.57 -10 -19A2 2 0 0 0 12 0.5a2 2 0 0 0 -1.77 1.07l-10 19a2 2 0 0 0 0.06 2A2 2 0 0 0 2 23.5h20a2 2 0 0 0 1.77 -2.93ZM11 8.5a1 1 0 0 1 2 0v6a1 1 0 0 1 -2 0ZM12.05 20a1.53 1.53 0 0 1 -1.52 -1.47A1.48 1.48 0 0 1 12 17a1.53 1.53 0 0 1 1.52 1.47A1.48 1.48 0 0 1 12.05 20Z", fill: "currentColor", strokeWidth: 1 })), MM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0IiBpZD0iQWxlcnQtVHJpYW5nbGUtLVN0cmVhbWxpbmUtVWx0aW1hdGUiPjxkZXNjPkFsZXJ0IFRyaWFuZ2xlIFN0cmVhbWxpbmUgSWNvbjogaHR0cHM6Ly9zdHJlYW1saW5laHEuY29tPC9kZXNjPjxwYXRoIGQ9Im0yMy43NyAyMC41NyAtMTAgLTE5QTIgMiAwIDAgMCAxMiAwLjVhMiAyIDAgMCAwIC0xLjc3IDEuMDdsLTEwIDE5YTIgMiAwIDAgMCAwLjA2IDJBMiAyIDAgMCAwIDIgMjMuNWgyMGEyIDIgMCAwIDAgMS43NyAtMi45M1pNMTEgOC41YTEgMSAwIDAgMSAyIDB2NmExIDEgMCAwIDEgLTIgMFpNMTIuMDUgMjBhMS41MyAxLjUzIDAgMCAxIC0xLjUyIC0xLjQ3QTEuNDggMS40OCAwIDAgMSAxMiAxN2ExLjUzIDEuNTMgMCAwIDEgMS41MiAxLjQ3QTEuNDggMS40OCAwIDAgMSAxMi4wNSAyMFoiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+PC9zdmc+", IM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: gM,
  default: MM
}, Symbol.toStringTag, { value: "Module" })), mM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M18.09646875 20.3938125c0.674625 0 1.219125 -0.54459375 1.219125 -1.21921875V5.666521875c0 -0.325096875 -0.13003125 -0.6420750000000001 -0.36571875 -0.8696531249999999l-2.43825 -2.34075c-0.227625 -0.227578125 -0.5364375 -0.349490625 -0.85340625 -0.349490625H4.4042625c-0.674596875 0 -1.21914375 0.544546875 -1.21914375 1.21914375V19.17459375c0 0.674625 0.544546875 1.21921875 1.21914375 1.21921875H18.09646875Z", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m8.476865625 12.861375 2.774446875 2.77453125 2.77453125 -2.77453125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m11.2490625 15.63534375 0 -8.770715625", strokeWidth: 1.5 })), pM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xOC4wOTY0Njg3NSAyMC4zOTM4MTI1YzAuNjc0NjI1IDAgMS4yMTkxMjUgLTAuNTQ0NTkzNzUgMS4yMTkxMjUgLTEuMjE5MjE4NzVWNS42NjY1MjE4NzVjMCAtMC4zMjUwOTY4NzUgLTAuMTMwMDMxMjUgLTAuNjQyMDc1MDAwMDAwMDAwMSAtMC4zNjU3MTg3NSAtMC44Njk2NTMxMjQ5OTk5OTk5bC0yLjQzODI1IC0yLjM0MDc1Yy0wLjIyNzYyNSAtMC4yMjc1NzgxMjUgLTAuNTM2NDM3NSAtMC4zNDk0OTA2MjUgLTAuODUzNDA2MjUgLTAuMzQ5NDkwNjI1SDQuNDA0MjYyNWMtMC42NzQ1OTY4NzUgMCAtMS4yMTkxNDM3NSAwLjU0NDU0Njg3NSAtMS4yMTkxNDM3NSAxLjIxOTE0Mzc1VjE5LjE3NDU5Mzc1YzAgMC42NzQ2MjUgMC41NDQ1NDY4NzUgMS4yMTkyMTg3NSAxLjIxOTE0Mzc1IDEuMjE5MjE4NzVIMTguMDk2NDY4NzVaIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im04LjQ3Njg2NTYyNSAxMi44NjEzNzUgMi43NzQ0NDY4NzUgMi43NzQ1MzEyNSAyLjc3NDUzMTI1IC0yLjc3NDUzMTI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0xMS4yNDkwNjI1IDE1LjYzNTM0Mzc1IDAgLTguNzcwNzE1NjI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", fM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: mM,
  default: pM
}, Symbol.toStringTag, { value: "Module" })), bM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinejoin: "round", strokeWidth: 2, d: "M17.041 12.025 6.91 22.156 1 23l.844-5.91L11.975 6.96m0-5.067 10.132 10.132" }), /* @__PURE__ */ c("path", { fill: "currentColor", d: "M17.885 1.05a3.581 3.581 0 1 1 5.066 5.065l-3.377 3.377-5.066-5.066 3.377-3.377Z" })), NM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTE3LjA0MSAxMi4wMjUgNi45MSAyMi4xNTYgMSAyM2wuODQ0LTUuOTFMMTEuOTc1IDYuOTZtMC01LjA2NyAxMC4xMzIgMTAuMTMyIi8+CiAgPHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMTcuODg1IDEuMDVhMy41ODEgMy41ODEgMCAxIDEgNS4wNjYgNS4wNjVsLTMuMzc3IDMuMzc3LTUuMDY2LTUuMDY2IDMuMzc3LTMuMzc3WiIvPgo8L3N2Zz4=", jM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: bM,
  default: NM
}, Symbol.toStringTag, { value: "Module" })), yM = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M16.996875 7.265625h-3.99375V5.475a0.9375 0.9375 0 0 1 0.9375 -1.03125h2.8125v-3.75h-4.059375c-3.684375 0 -4.378125 2.8125 -4.378125 4.55625v2.015625h-2.8125v3.75h2.8125v10.78125h4.6875v-10.78125h3.609375Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), hM = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik0xNi45OTY4NzUgNy4yNjU2MjVoLTMuOTkzNzVWNS40NzVhMC45Mzc1IDAuOTM3NSAwIDAgMSAwLjkzNzUgLTEuMDMxMjVoMi44MTI1di0zLjc1aC00LjA1OTM3NWMtMy42ODQzNzUgMCAtNC4zNzgxMjUgMi44MTI1IC00LjM3ODEyNSA0LjU1NjI1djIuMDE1NjI1aC0yLjgxMjV2My43NWgyLjgxMjV2MTAuNzgxMjVoNC42ODc1di0xMC43ODEyNWgzLjYwOTM3NVoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", vM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: yM,
  default: hM
}, Symbol.toStringTag, { value: "Module" })), wM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 10, d: "M6.140625 10.828125c-1.78125 0 -3.28125 1.5 -3.28125 3.28125 0 1.5 0.375 3 1.21875 4.3125l0.65625 1.125c0.84375 1.40625 2.4375 2.25 4.03125 2.25h6.1875c2.625 0 4.6875 -2.0625 4.6875 -4.6875v-6.84375c0 -0.9375 -0.75 -1.6875 -1.6875 -1.6875s-1.6875 0.75 -1.6875 1.6875v-0.9375c0 -0.9375 -0.75 -1.6875 -1.6875 -1.6875s-1.6875 0.75 -1.6875 1.6875v0.28125l0 -0.75c0 -0.9375 -0.75 -1.6875 -1.6875 -1.6875s-1.6875 0.75 -1.6875 1.6875l0 0.215625m0 0.5343749999999999 0 -0.5343749999999999m-3.375 4.753125000000001V2.390625c0 -0.9375 0.75 -1.6875 1.6875 -1.6875s1.6875 0.75 1.6875 1.6875l0 6.684375", strokeWidth: 1.5 })), DM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZD0iTTYuMTQwNjI1IDEwLjgyODEyNWMtMS43ODEyNSAwIC0zLjI4MTI1IDEuNSAtMy4yODEyNSAzLjI4MTI1IDAgMS41IDAuMzc1IDMgMS4yMTg3NSA0LjMxMjVsMC42NTYyNSAxLjEyNWMwLjg0Mzc1IDEuNDA2MjUgMi40Mzc1IDIuMjUgNC4wMzEyNSAyLjI1aDYuMTg3NWMyLjYyNSAwIDQuNjg3NSAtMi4wNjI1IDQuNjg3NSAtNC42ODc1di02Ljg0Mzc1YzAgLTAuOTM3NSAtMC43NSAtMS42ODc1IC0xLjY4NzUgLTEuNjg3NXMtMS42ODc1IDAuNzUgLTEuNjg3NSAxLjY4NzV2LTAuOTM3NWMwIC0wLjkzNzUgLTAuNzUgLTEuNjg3NSAtMS42ODc1IC0xLjY4NzVzLTEuNjg3NSAwLjc1IC0xLjY4NzUgMS42ODc1djAuMjgxMjVsMCAtMC43NWMwIC0wLjkzNzUgLTAuNzUgLTEuNjg3NSAtMS42ODc1IC0xLjY4NzVzLTEuNjg3NSAwLjc1IC0xLjY4NzUgMS42ODc1bDAgMC4yMTU2MjVtMCAwLjUzNDM3NDk5OTk5OTk5OTkgMCAtMC41MzQzNzQ5OTk5OTk5OTk5bS0zLjM3NSA0Ljc1MzEyNTAwMDAwMDAwMVYyLjM5MDYyNWMwIC0wLjkzNzUgMC43NSAtMS42ODc1IDEuNjg3NSAtMS42ODc1czEuNjg3NSAwLjc1IDEuNjg3NSAxLjY4NzVsMCA2LjY4NDM3NSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", SM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: wM,
  default: DM
}, Symbol.toStringTag, { value: "Module" })), xM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "navigation-menu"), /* @__PURE__ */ c("line", { x1: 2.25, y1: 18.003, x2: 21.75, y2: 18.003, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("line", { x1: 2.25, y1: 12.003, x2: 21.75, y2: 12.003, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("line", { x1: 2.25, y1: 6.003, x2: 21.75, y2: 6.003, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" })), AM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PC9kZWZzPjx0aXRsZT5uYXZpZ2F0aW9uLW1lbnU8L3RpdGxlPjxsaW5lIHgxPSIyLjI1IiB5MT0iMTguMDAzIiB4Mj0iMjEuNzUiIHkyPSIxOC4wMDMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41cHgiPjwvbGluZT48bGluZSB4MT0iMi4yNSIgeTE9IjEyLjAwMyIgeDI9IjIxLjc1IiB5Mj0iMTIuMDAzIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L2xpbmU+PGxpbmUgeDE9IjIuMjUiIHkxPSI2LjAwMyIgeDI9IjIxLjc1IiB5Mj0iNi4wMDMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41cHgiPjwvbGluZT48L3N2Zz4=", LM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: xM,
  default: AM
}, Symbol.toStringTag, { value: "Module" })), CM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", id: "Hearts-Card--Streamline-Ultimate.svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "Hearts Card Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("path", { fill: "currentColor", fillRule: "evenodd", d: "M7.284 2.513a6.376 6.376 0 0 0 -4.146 11.22l8.014 7.42a1.25 1.25 0 0 0 1.698 0l8.024 -7.43A6.376 6.376 0 1 0 12 4.599a6.36 6.36 0 0 0 -4.716 -2.086Z", clipRule: "evenodd", strokeWidth: 1 })), TM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IkhlYXJ0cy1DYXJkLS1TdHJlYW1saW5lLVVsdGltYXRlLnN2ZyIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0Ij48ZGVzYz5IZWFydHMgQ2FyZCBTdHJlYW1saW5lIEljb246IGh0dHBzOi8vc3RyZWFtbGluZWhxLmNvbTwvZGVzYz48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcuMjg0IDIuNTEzYTYuMzc2IDYuMzc2IDAgMCAwIC00LjE0NiAxMS4yMmw4LjAxNCA3LjQyYTEuMjUgMS4yNSAwIDAgMCAxLjY5OCAwbDguMDI0IC03LjQzQTYuMzc2IDYuMzc2IDAgMSAwIDEyIDQuNTk5YTYuMzYgNi4zNiAwIDAgMCAtNC43MTYgLTIuMDg2WiIgY2xpcC1ydWxlPSJldmVub2RkIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD48L3N2Zz4=", kM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: CM,
  default: TM
}, Symbol.toStringTag, { value: "Module" })), zM = (e) => /* @__PURE__ */ c("svg", { width: 26, height: 24, viewBox: "0 0 26 24", xmlns: "http://www.w3.org/2000/svg", ...e }, /* @__PURE__ */ c("path", { d: "M23.651 5.357c-.878-1.717-2.269-2.728-4.173-3.034-1.904-.305-3.541.22-4.912 1.577L13 5.329 11.434 3.9c-1.371-1.356-3.009-1.881-4.913-1.575-1.904.306-3.295 1.317-4.172 3.035-1.222 2.42-.867 4.582 1.063 6.486L13 21.75l9.588-9.907c1.93-1.904 2.285-4.066 1.063-6.486z", strokeLinecap: "round", strokeLinejoin: "round", fill: "none", stroke: "currentColor", strokeWidth: 1.5 })), EM = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNiAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMjMuNjUxIDUuMzU3Yy0uODc4LTEuNzE3LTIuMjY5LTIuNzI4LTQuMTczLTMuMDM0LTEuOTA0LS4zMDUtMy41NDEuMjItNC45MTIgMS41NzdMMTMgNS4zMjkgMTEuNDM0IDMuOWMtMS4zNzEtMS4zNTYtMy4wMDktMS44ODEtNC45MTMtMS41NzUtMS45MDQuMzA2LTMuMjk1IDEuMzE3LTQuMTcyIDMuMDM1LTEuMjIyIDIuNDItLjg2NyA0LjU4MiAxLjA2MyA2LjQ4NkwxMyAyMS43NWw5LjU4OC05LjkwN2MxLjkzLTEuOTA0IDIuMjg1LTQuMDY2IDEuMDYzLTYuNDg2eiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjUiIC8+Cjwvc3ZnPg==", PM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: zM,
  default: EM
}, Symbol.toStringTag, { value: "Module" })), ZM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", id: "House-Entrance--Streamline-Streamline--3.0", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "House Entrance Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "house-entrance"), /* @__PURE__ */ c("path", { d: "M22.868 8.947 12 0.747l-10.878 8.2a1.177 1.177 0 0 0 -0.377 0.8v12.522a0.981 0.981 0 0 0 0.978 0.978h6.522V18a3.75 3.75 0 0 1 7.5 0v5.25h6.521a0.982 0.982 0 0 0 0.979 -0.978V9.747a1.181 1.181 0 0 0 -0.377 -0.8Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), _M = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IkhvdXNlLUVudHJhbmNlLS1TdHJlYW1saW5lLVN0cmVhbWxpbmUtLTMuMCIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0Ij48ZGVzYz5Ib3VzZSBFbnRyYW5jZSBTdHJlYW1saW5lIEljb246IGh0dHBzOi8vc3RyZWFtbGluZWhxLmNvbTwvZGVzYz48ZGVmcz48L2RlZnM+PHRpdGxlPmhvdXNlLWVudHJhbmNlPC90aXRsZT48cGF0aCBkPSJNMjIuODY4IDguOTQ3IDEyIDAuNzQ3bC0xMC44NzggOC4yYTEuMTc3IDEuMTc3IDAgMCAwIC0wLjM3NyAwLjh2MTIuNTIyYTAuOTgxIDAuOTgxIDAgMCAwIDAuOTc4IDAuOTc4aDYuNTIyVjE4YTMuNzUgMy43NSAwIDAgMSA3LjUgMHY1LjI1aDYuNTIxYTAuOTgyIDAuOTgyIDAgMCAwIDAuOTc5IC0wLjk3OFY5Ljc0N2ExLjE4MSAxLjE4MSAwIDAgMCAtMC4zNzcgLTAuOFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", OM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: ZM,
  default: _M
}, Symbol.toStringTag, { value: "Module" })), WM = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 20 20", xmlns: "http://www.w3.org/2000/svg", id: "Hyperlink-Circle--Streamline-Ultimate", height: 20, width: 20, ...e }, /* @__PURE__ */ c("desc", null, "Hyperlink Circle Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("path", { d: "M10.426416666666666 16.262500000000003C9.295 18.64975 6.448083333333334 19.675166666666666 4.054333333333333 18.55766666666667H4.054333333333333C1.6670833333333335 17.42625 0.6416666666666667 14.579250000000002 1.75925 12.185500000000001L3.2155 9.090583333333333C4.3465 6.7035 7.193166666666667 5.678 9.586583333333333 6.7955000000000005H9.586583333333333C10.948333333333334 7.437916666666666 11.928416666666667 8.6835 12.232583333333334 10.158083333333334", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M9.573916666666667 3.7375000000000003C10.705333333333334 1.3502500000000002 13.552333333333333 0.3248333333333333 15.946083333333334 1.442416666666667H15.946083333333334C18.33275 2.57375 19.358 5.4199166666666665 18.241166666666665 7.813416666666666L16.784833333333335 10.908333333333333C15.653416666666667 13.295583333333335 12.806500000000002 14.321 10.41275 13.203416666666666H10.41275C9.248583333333334 12.654916666666667 8.354916666666668 11.659916666666666 7.934333333333334 10.443666666666667", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), UM = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAgMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgaWQ9Ikh5cGVybGluay1DaXJjbGUtLVN0cmVhbWxpbmUtVWx0aW1hdGUiIGhlaWdodD0iMjAiIHdpZHRoPSIyMCI+PGRlc2M+SHlwZXJsaW5rIENpcmNsZSBTdHJlYW1saW5lIEljb246IGh0dHBzOi8vc3RyZWFtbGluZWhxLmNvbTwvZGVzYz48cGF0aCBkPSJNMTAuNDI2NDE2NjY2NjY2NjY2IDE2LjI2MjUwMDAwMDAwMDAwM0M5LjI5NSAxOC42NDk3NSA2LjQ0ODA4MzMzMzMzMzMzNCAxOS42NzUxNjY2NjY2NjY2NjYgNC4wNTQzMzMzMzMzMzMzMzMgMTguNTU3NjY2NjY2NjY2NjdINC4wNTQzMzMzMzMzMzMzMzNDMS42NjcwODMzMzMzMzMzMzM1IDE3LjQyNjI1IDAuNjQxNjY2NjY2NjY2NjY2NyAxNC41NzkyNTAwMDAwMDAwMDIgMS43NTkyNSAxMi4xODU1MDAwMDAwMDAwMDFMMy4yMTU1IDkuMDkwNTgzMzMzMzMzMzMzQzQuMzQ2NSA2LjcwMzUgNy4xOTMxNjY2NjY2NjY2NjcgNS42NzggOS41ODY1ODMzMzMzMzMzMzMgNi43OTU1MDAwMDAwMDAwMDA1SDkuNTg2NTgzMzMzMzMzMzMzQzEwLjk0ODMzMzMzMzMzMzMzNCA3LjQzNzkxNjY2NjY2NjY2NiAxMS45Mjg0MTY2NjY2NjY2NjcgOC42ODM1IDEyLjIzMjU4MzMzMzMzMzMzNCAxMC4xNTgwODMzMzMzMzMzMzQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTkuNTczOTE2NjY2NjY2NjY3IDMuNzM3NTAwMDAwMDAwMDAwM0MxMC43MDUzMzMzMzMzMzMzMzQgMS4zNTAyNTAwMDAwMDAwMDAyIDEzLjU1MjMzMzMzMzMzMzMzMyAwLjMyNDgzMzMzMzMzMzMzMzMgMTUuOTQ2MDgzMzMzMzMzMzM0IDEuNDQyNDE2NjY2NjY2NjY3SDE1Ljk0NjA4MzMzMzMzMzMzNEMxOC4zMzI3NSAyLjU3Mzc1IDE5LjM1OCA1LjQxOTkxNjY2NjY2NjY2NjUgMTguMjQxMTY2NjY2NjY2NjY1IDcuODEzNDE2NjY2NjY2NjY2TDE2Ljc4NDgzMzMzMzMzMzMzNSAxMC45MDgzMzMzMzMzMzMzMzNDMTUuNjUzNDE2NjY2NjY2NjY3IDEzLjI5NTU4MzMzMzMzMzMzNSAxMi44MDY1MDAwMDAwMDAwMDIgMTQuMzIxIDEwLjQxMjc1IDEzLjIwMzQxNjY2NjY2NjY2NkgxMC40MTI3NUM5LjI0ODU4MzMzMzMzMzMzNCAxMi42NTQ5MTY2NjY2NjY2NjcgOC4zNTQ5MTY2NjY2NjY2NjggMTEuNjU5OTE2NjY2NjY2NjY2IDcuOTM0MzMzMzMzMzMzMzM0IDEwLjQ0MzY2NjY2NjY2NjY2NyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4K", RM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: WM,
  default: UM
}, Symbol.toStringTag, { value: "Module" })), HM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M18.09553125 20.3938125c0.674625 0 1.21921875 -0.54459375 1.21921875 -1.21921875V5.666521875c0 -0.325096875 -0.13012500000000002 -0.6420750000000001 -0.3658125 -0.8696531249999999l-2.43825 -2.34075c-0.227625 -0.227578125 -0.5364375 -0.349490625 -0.85340625 -0.349490625H4.40334375c-0.6745875 0 -1.21914375 0.544546875 -1.21914375 1.21914375V19.17459375c0 0.674625 0.5445562500000001 1.21921875 1.21914375 1.21921875h13.692187500000001Z", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m8.47595625 9.638625 2.7744187499999997 -2.774559375L14.025 9.638625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m11.248125 6.864684375 0 8.770659375000001", strokeWidth: 1.5 })), GM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xOC4wOTU1MzEyNSAyMC4zOTM4MTI1YzAuNjc0NjI1IDAgMS4yMTkyMTg3NSAtMC41NDQ1OTM3NSAxLjIxOTIxODc1IC0xLjIxOTIxODc1VjUuNjY2NTIxODc1YzAgLTAuMzI1MDk2ODc1IC0wLjEzMDEyNTAwMDAwMDAwMDAyIC0wLjY0MjA3NTAwMDAwMDAwMDEgLTAuMzY1ODEyNSAtMC44Njk2NTMxMjQ5OTk5OTk5bC0yLjQzODI1IC0yLjM0MDc1Yy0wLjIyNzYyNSAtMC4yMjc1NzgxMjUgLTAuNTM2NDM3NSAtMC4zNDk0OTA2MjUgLTAuODUzNDA2MjUgLTAuMzQ5NDkwNjI1SDQuNDAzMzQzNzVjLTAuNjc0NTg3NSAwIC0xLjIxOTE0Mzc1IDAuNTQ0NTQ2ODc1IC0xLjIxOTE0Mzc1IDEuMjE5MTQzNzVWMTkuMTc0NTkzNzVjMCAwLjY3NDYyNSAwLjU0NDU1NjI1MDAwMDAwMDEgMS4yMTkyMTg3NSAxLjIxOTE0Mzc1IDEuMjE5MjE4NzVoMTMuNjkyMTg3NTAwMDAwMDAxWiIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtOC40NzU5NTYyNSA5LjYzODYyNSAyLjc3NDQxODc0OTk5OTk5OTcgLTIuNzc0NTU5Mzc1TDE0LjAyNSA5LjYzODYyNSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtMTEuMjQ4MTI1IDYuODY0Njg0Mzc1IDAgOC43NzA2NTkzNzUwMDAwMDEiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", YM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: HM,
  default: GM
}, Symbol.toStringTag, { value: "Module" })), BM = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", height: 24, width: 24, id: "Information-Circle--Streamline-Ultimate", ...e }, /* @__PURE__ */ c("desc", null, "Information Circle Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("path", { d: "M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0Zm0.25 5a1.5 1.5 0 1 1 -1.5 1.5 1.5 1.5 0 0 1 1.5 -1.5Zm2.25 13.5h-4a1 1 0 0 1 0 -2h0.75a0.25 0.25 0 0 0 0.25 -0.25v-4.5a0.25 0.25 0 0 0 -0.25 -0.25h-0.75a1 1 0 0 1 0 -2h1a2 2 0 0 1 2 2v4.75a0.25 0.25 0 0 0 0.25 0.25h0.75a1 1 0 0 1 0 2Z", fill: "currentcolor", strokeWidth: 1 })), QM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0IiBpZD0iSW5mb3JtYXRpb24tQ2lyY2xlLS1TdHJlYW1saW5lLVVsdGltYXRlIj48ZGVzYz5JbmZvcm1hdGlvbiBDaXJjbGUgU3RyZWFtbGluZSBJY29uOiBodHRwczovL3N0cmVhbWxpbmVocS5jb208L2Rlc2M+PHBhdGggZD0iTTEyIDBhMTIgMTIgMCAxIDAgMTIgMTJBMTIgMTIgMCAwIDAgMTIgMFptMC4yNSA1YTEuNSAxLjUgMCAxIDEgLTEuNSAxLjUgMS41IDEuNSAwIDAgMSAxLjUgLTEuNVptMi4yNSAxMy41aC00YTEgMSAwIDAgMSAwIC0yaDAuNzVhMC4yNSAwLjI1IDAgMCAwIDAuMjUgLTAuMjV2LTQuNWEwLjI1IDAuMjUgMCAwIDAgLTAuMjUgLTAuMjVoLTAuNzVhMSAxIDAgMCAxIDAgLTJoMWEyIDIgMCAwIDEgMiAydjQuNzVhMC4yNSAwLjI1IDAgMCAwIDAuMjUgMC4yNWgwLjc1YTEgMSAwIDAgMSAwIDJaIiBmaWxsPSJjdXJyZW50Y29sb3IiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPjwvc3ZnPg==", JM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: BM,
  default: QM
}, Symbol.toStringTag, { value: "Module" })), VM = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 46 43", ...e }, /* @__PURE__ */ c("title", null, "integration"), /* @__PURE__ */ c("g", { stroke: "currentColor", fill: "none", fillRule: "evenodd", strokeWidth: "1.5px" }, /* @__PURE__ */ c("path", { d: "M-1-3h48v48H-1z", stroke: "none" }), /* @__PURE__ */ c("g", { strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ c("path", { d: "M32.932 6.574c.713.428 1.069 1.057 1.068 1.888v9.278l-11 7.076-11-7.076V8.462c0-.831.355-1.46 1.068-1.888l8.8-5.28c.755-.453 1.51-.453 2.264 0l8.8 5.28zM23 13.816v11" }), /* @__PURE__ */ c("path", { d: "M34 31.416l-11-6.6 11-7.076 10 6.426c.669.435 1.002 1.052 1 1.85v8.124c.002.798-.331 1.415-1 1.85l-8.8 5.66c-.793.51-1.587.51-2.38 0L23 35.34V24.816m11 6.6V42M23 24.816V35.34l-9.8 6.31c-.793.51-1.587.51-2.38 0l-8.8-5.66c-.678-.43-1.018-1.047-1.02-1.85v-8.124c-.002-.798.331-1.415 1-1.85l10-6.426 11 7.076-11 6.6m0 0L1.262 24.974M12 31.416V42m11-28.184L12.282 7.384m21.436 0L23 13.816m21.738 11.158L34 31.416" })))), XM = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDYgNDMiPjx0aXRsZT5pbnRlZ3JhdGlvbjwvdGl0bGU+PGcgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLXdpZHRoPSIxLjVweCI+PHBhdGggZD0iTS0xLTNoNDh2NDhILTF6IiBzdHJva2U9Im5vbmUiPjwvcGF0aD48ZyBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zMi45MzIgNi41NzRjLjcxMy40MjggMS4wNjkgMS4wNTcgMS4wNjggMS44ODh2OS4yNzhsLTExIDcuMDc2LTExLTcuMDc2VjguNDYyYzAtLjgzMS4zNTUtMS40NiAxLjA2OC0xLjg4OGw4LjgtNS4yOGMuNzU1LS40NTMgMS41MS0uNDUzIDIuMjY0IDBsOC44IDUuMjh6TTIzIDEzLjgxNnYxMSI+PC9wYXRoPjxwYXRoIGQ9Ik0zNCAzMS40MTZsLTExLTYuNiAxMS03LjA3NiAxMCA2LjQyNmMuNjY5LjQzNSAxLjAwMiAxLjA1MiAxIDEuODV2OC4xMjRjLjAwMi43OTgtLjMzMSAxLjQxNS0xIDEuODVsLTguOCA1LjY2Yy0uNzkzLjUxLTEuNTg3LjUxLTIuMzggMEwyMyAzNS4zNFYyNC44MTZtMTEgNi42VjQyTTIzIDI0LjgxNlYzNS4zNGwtOS44IDYuMzFjLS43OTMuNTEtMS41ODcuNTEtMi4zOCAwbC04LjgtNS42NmMtLjY3OC0uNDMtMS4wMTgtMS4wNDctMS4wMi0xLjg1di04LjEyNGMtLjAwMi0uNzk4LjMzMS0xLjQxNSAxLTEuODVsMTAtNi40MjYgMTEgNy4wNzYtMTEgNi42bTAgMEwxLjI2MiAyNC45NzRNMTIgMzEuNDE2VjQybTExLTI4LjE4NEwxMi4yODIgNy4zODRtMjEuNDM2IDBMMjMgMTMuODE2bTIxLjczOCAxMS4xNThMMzQgMzEuNDE2Ij48L3BhdGg+PC9nPjwvZz48L3N2Zz4=", FM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: VM,
  default: XM
}, Symbol.toStringTag, { value: "Module" })), $M = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("g", null, /* @__PURE__ */ c("path", { d: "M12.01875 13.603125 14.399999999999999 11.25l1.65 0.440625a1.4625000000000001 1.4625000000000001 0 0 0 1.415625 -0.440625 1.4812500000000002 1.4812500000000002 0 0 0 0.346875 -1.396875l-0.440625 -1.640625 0.7687499999999999 -0.7125 1.65 0.440625A1.4625000000000001 1.4625000000000001 0 0 0 21.20625 7.5 1.4812500000000002 1.4812500000000002 0 0 0 21.5625 6.1125l-0.440625 -1.640625a2.203125 2.203125 0 0 0 -3.121875 -3.121875l-9.103125 9.13125a5.896875 5.896875 0 1 0 3.121875 3.121875Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M3.99375 16.725a1.78125 1.78125 0 1 0 3.5625 0 1.78125 1.78125 0 1 0 -3.5625 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }))), qM = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxnPjxwYXRoIGQ9Ik0xMi4wMTg3NSAxMy42MDMxMjUgMTQuMzk5OTk5OTk5OTk5OTk5IDExLjI1bDEuNjUgMC40NDA2MjVhMS40NjI1MDAwMDAwMDAwMDAxIDEuNDYyNTAwMDAwMDAwMDAwMSAwIDAgMCAxLjQxNTYyNSAtMC40NDA2MjUgMS40ODEyNTAwMDAwMDAwMDAyIDEuNDgxMjUwMDAwMDAwMDAwMiAwIDAgMCAwLjM0Njg3NSAtMS4zOTY4NzVsLTAuNDQwNjI1IC0xLjY0MDYyNSAwLjc2ODc0OTk5OTk5OTk5OTkgLTAuNzEyNSAxLjY1IDAuNDQwNjI1QTEuNDYyNTAwMDAwMDAwMDAwMSAxLjQ2MjUwMDAwMDAwMDAwMDEgMCAwIDAgMjEuMjA2MjUgNy41IDEuNDgxMjUwMDAwMDAwMDAwMiAxLjQ4MTI1MDAwMDAwMDAwMDIgMCAwIDAgMjEuNTYyNSA2LjExMjVsLTAuNDQwNjI1IC0xLjY0MDYyNWEyLjIwMzEyNSAyLjIwMzEyNSAwIDAgMCAtMy4xMjE4NzUgLTMuMTIxODc1bC05LjEwMzEyNSA5LjEzMTI1YTUuODk2ODc1IDUuODk2ODc1IDAgMSAwIDMuMTIxODc1IDMuMTIxODc1WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMy45OTM3NSAxNi43MjVhMS43ODEyNSAxLjc4MTI1IDAgMSAwIDMuNTYyNSAwIDEuNzgxMjUgMS43ODEyNSAwIDEgMCAtMy41NjI1IDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9nPjwvc3ZnPg==", KM = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: $M,
  default: qM
}, Symbol.toStringTag, { value: "Module" })), e1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M6.305625 0.703125h9.84375", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M14.743125000000001 7.734375V0.703125h-7.03125v7.03125L1.3959375 17.451562499999998A2.8125 2.8125 0 0 0 3.75 21.796875h14.95125a2.8125 2.8125 0 0 0 2.3578125 -4.3453124999999995L14.743125000000001 7.734375Z", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M4.9696875 11.953125h12.515625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M13.336875000000001 16.171875h2.8125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M14.743125000000001 14.765625v2.8125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M14.743125000000001 3.515625h-2.8125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M14.743125000000001 6.328125h-2.8125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M6.305625 18.6328125a0.3515625 0.3515625 0 0 1 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M6.305625 18.6328125a0.3515625 0.3515625 0 0 0 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("g", null, /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M9.118125000000001 15.8203125a0.3515625 0.3515625 0 0 1 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M9.118125000000001 15.8203125a0.3515625 0.3515625 0 0 0 0 -0.703125", strokeWidth: 1.5 }))), t1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik02LjMwNTYyNSAwLjcwMzEyNWg5Ljg0Mzc1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xNC43NDMxMjUwMDAwMDAwMDEgNy43MzQzNzVWMC43MDMxMjVoLTcuMDMxMjV2Ny4wMzEyNUwxLjM5NTkzNzUgMTcuNDUxNTYyNDk5OTk5OTk4QTIuODEyNSAyLjgxMjUgMCAwIDAgMy43NSAyMS43OTY4NzVoMTQuOTUxMjVhMi44MTI1IDIuODEyNSAwIDAgMCAyLjM1NzgxMjUgLTQuMzQ1MzEyNDk5OTk5OTk5NUwxNC43NDMxMjUwMDAwMDAwMDEgNy43MzQzNzVaIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00Ljk2OTY4NzUgMTEuOTUzMTI1aDEyLjUxNTYyNSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTMuMzM2ODc1MDAwMDAwMDAxIDE2LjE3MTg3NWgyLjgxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTE0Ljc0MzEyNTAwMDAwMDAwMSAxNC43NjU2MjV2Mi44MTI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xNC43NDMxMjUwMDAwMDAwMDEgMy41MTU2MjVoLTIuODEyNSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTQuNzQzMTI1MDAwMDAwMDAxIDYuMzI4MTI1aC0yLjgxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik02LjMwNTYyNSAxOC42MzI4MTI1YTAuMzUxNTYyNSAwLjM1MTU2MjUgMCAwIDEgMCAtMC43MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik02LjMwNTYyNSAxOC42MzI4MTI1YTAuMzUxNTYyNSAwLjM1MTU2MjUgMCAwIDAgMCAtMC43MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PGc+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik05LjExODEyNTAwMDAwMDAwMSAxNS44MjAzMTI1YTAuMzUxNTYyNSAwLjM1MTU2MjUgMCAwIDEgMCAtMC43MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik05LjExODEyNTAwMDAwMDAwMSAxNS44MjAzMTI1YTAuMzUxNTYyNSAwLjM1MTU2MjUgMCAwIDAgMCAtMC43MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9nPjwvc3ZnPg==", n1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: e1,
  default: t1
}, Symbol.toStringTag, { value: "Module" })), r1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("g", null, /* @__PURE__ */ c("path", { d: "M2.109375 0.703125h8.4375s1.40625 0 1.40625 1.40625v8.4375s0 1.40625 -1.40625 1.40625h-8.4375s-1.40625 0 -1.40625 -1.40625v-8.4375s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M14.765625 10.546875h5.625a1.40625 1.40625 0 0 1 1.40625 1.40625v8.4375a1.40625 1.40625 0 0 1 -1.40625 1.40625h-8.4375a1.40625 1.40625 0 0 1 -1.40625 -1.40625v-5.625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m14.53125 16.875 3.28125 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("g", null, /* @__PURE__ */ c("path", { d: "m6.328125 3.515625 0 1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m3.515625 4.921875 5.625 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M7.734375 4.921875s-1.40625 4.21875 -4.21875 4.21875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M6.328125 7.5a3.675 3.675 0 0 0 2.8125 1.621875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), /* @__PURE__ */ c("path", { d: "M14.53125 18.984375v-3.75a1.640625 1.640625 0 0 1 3.28125 0v3.75", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }))), o1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxnPjxwYXRoIGQ9Ik0yLjEwOTM3NSAwLjcwMzEyNWg4LjQzNzVzMS40MDYyNSAwIDEuNDA2MjUgMS40MDYyNXY4LjQzNzVzMCAxLjQwNjI1IC0xLjQwNjI1IDEuNDA2MjVoLTguNDM3NXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1di04LjQzNzVzMCAtMS40MDYyNSAxLjQwNjI1IC0xLjQwNjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0xNC43NjU2MjUgMTAuNTQ2ODc1aDUuNjI1YTEuNDA2MjUgMS40MDYyNSAwIDAgMSAxLjQwNjI1IDEuNDA2MjV2OC40Mzc1YTEuNDA2MjUgMS40MDYyNSAwIDAgMSAtMS40MDYyNSAxLjQwNjI1aC04LjQzNzVhMS40MDYyNSAxLjQwNjI1IDAgMCAxIC0xLjQwNjI1IC0xLjQwNjI1di01LjYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJtMTQuNTMxMjUgMTYuODc1IDMuMjgxMjUgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48Zz48cGF0aCBkPSJtNi4zMjgxMjUgMy41MTU2MjUgMCAxLjQwNjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Im0zLjUxNTYyNSA0LjkyMTg3NSA1LjYyNSAwIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik03LjczNDM3NSA0LjkyMTg3NXMtMS40MDYyNSA0LjIxODc1IC00LjIxODc1IDQuMjE4NzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTYuMzI4MTI1IDcuNWEzLjY3NSAzLjY3NSAwIDAgMCAyLjgxMjUgMS42MjE4NzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9nPjxwYXRoIGQ9Ik0xNC41MzEyNSAxOC45ODQzNzV2LTMuNzVhMS42NDA2MjUgMS42NDA2MjUgMCAwIDEgMy4yODEyNSAwdjMuNzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9nPjwvc3ZnPg==", i1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: r1,
  default: o1
}, Symbol.toStringTag, { value: "Module" })), s1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "Desktop"), /* @__PURE__ */ c("path", { d: "M21,14.25V4.5A1.5,1.5,0,0,0,19.5,3H4.5A1.5,1.5,0,0,0,3,4.5v9.75Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("path", { d: "M23.121,18.891A1.5,1.5,0,0,1,21.75,21H2.25A1.5,1.5,0,0,1,.879,18.891L3,14.25H21Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("line", { x1: 10.5, y1: 18, x2: 13.5, y2: 18, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" })), a1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PC9kZWZzPjx0aXRsZT5EZXNrdG9wPC90aXRsZT48cGF0aCBkPSJNMjEsMTQuMjVWNC41QTEuNSwxLjUsMCwwLDAsMTkuNSwzSDQuNUExLjUsMS41LDAsMCwwLDMsNC41djkuNzVaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L3BhdGg+PHBhdGggZD0iTTIzLjEyMSwxOC44OTFBMS41LDEuNSwwLDAsMSwyMS43NSwyMUgyLjI1QTEuNSwxLjUsMCwwLDEsLjg3OSwxOC44OTFMMywxNC4yNUgyMVoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41cHgiPjwvcGF0aD48bGluZSB4MT0iMTAuNSIgeTE9IjE4IiB4Mj0iMTMuNSIgeTI9IjE4IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNXB4Ij48L2xpbmU+PC9zdmc+", c1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: s1,
  default: a1
}, Symbol.toStringTag, { value: "Module" })), l1 = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M21.478125 6.5184375 11.90625 1.5675a1.4465625 1.4465625 0 0 0 -1.3275 0L1.00875 6.5184375a0.5765625 0.5765625 0 0 0 0 1.025625l9.5709375 4.950937499999999a1.4465625 1.4465625 0 0 0 1.3275 0L21.478125 7.544062500000001a0.5775 0.5775 0 0 0 0 -1.025625Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m0.7106250000000001 11.953125 9.8690625 4.760625a1.4465625 1.4465625 0 0 0 1.3275 0l9.897187500000001 -4.760625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m0.7106250000000001 16.171875 9.8690625 4.760625a1.4465625 1.4465625 0 0 0 1.3275 0l9.897187500000001 -4.760625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), u1 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik0yMS40NzgxMjUgNi41MTg0Mzc1IDExLjkwNjI1IDEuNTY3NWExLjQ0NjU2MjUgMS40NDY1NjI1IDAgMCAwIC0xLjMyNzUgMEwxLjAwODc1IDYuNTE4NDM3NWEwLjU3NjU2MjUgMC41NzY1NjI1IDAgMCAwIDAgMS4wMjU2MjVsOS41NzA5Mzc1IDQuOTUwOTM3NDk5OTk5OTk5YTEuNDQ2NTYyNSAxLjQ0NjU2MjUgMCAwIDAgMS4zMjc1IDBMMjEuNDc4MTI1IDcuNTQ0MDYyNTAwMDAwMDAxYTAuNTc3NSAwLjU3NzUgMCAwIDAgMCAtMS4wMjU2MjVaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Im0wLjcxMDYyNTAwMDAwMDAwMDEgMTEuOTUzMTI1IDkuODY5MDYyNSA0Ljc2MDYyNWExLjQ0NjU2MjUgMS40NDY1NjI1IDAgMCAwIDEuMzI3NSAwbDkuODk3MTg3NTAwMDAwMDAxIC00Ljc2MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJtMC43MTA2MjUwMDAwMDAwMDAxIDE2LjE3MTg3NSA5Ljg2OTA2MjUgNC43NjA2MjVhMS40NDY1NjI1IDEuNDQ2NTYyNSAwIDAgMCAxLjMyNzUgMGw5Ljg5NzE4NzUwMDAwMDAwMSAtNC43NjA2MjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", d1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: l1,
  default: u1
}, Symbol.toStringTag, { value: "Module" })), g1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", id: "Browser-Page-Layout--Streamline-Ultimate", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "Browser Page Layout Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "browser-page-layout"), /* @__PURE__ */ c("path", { d: "M3 2.25h18s1.5 0 1.5 1.5v16.5s0 1.5 -1.5 1.5H3s-1.5 0 -1.5 -1.5V3.75s0 -1.5 1.5 -1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m1.5 6.75 21 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m9 6.75 0 15", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m9 14.25 13.5 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), M1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IkJyb3dzZXItUGFnZS1MYXlvdXQtLVN0cmVhbWxpbmUtVWx0aW1hdGUiIGhlaWdodD0iMjQiIHdpZHRoPSIyNCI+PGRlc2M+QnJvd3NlciBQYWdlIExheW91dCBTdHJlYW1saW5lIEljb246IGh0dHBzOi8vc3RyZWFtbGluZWhxLmNvbTwvZGVzYz48ZGVmcz48L2RlZnM+PHRpdGxlPmJyb3dzZXItcGFnZS1sYXlvdXQ8L3RpdGxlPjxwYXRoIGQ9Ik0zIDIuMjVoMThzMS41IDAgMS41IDEuNXYxNi41czAgMS41IC0xLjUgMS41SDNzLTEuNSAwIC0xLjUgLTEuNVYzLjc1czAgLTEuNSAxLjUgLTEuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJtMS41IDYuNzUgMjEgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJtOSA2Ljc1IDAgMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTkgMTQuMjUgMTMuNSAwIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", I1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: g1,
  default: M1
}, Symbol.toStringTag, { value: "Module" })), m1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "layout-headline"), /* @__PURE__ */ c("path", { d: "M2.109375 0.7003125h18.28125s1.40625 0 1.40625 1.40625v1.40625s0 1.40625 -1.40625 1.40625H2.109375s-1.40625 0 -1.40625 -1.40625v-1.40625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.109375 9.137812499999999h18.28125s1.40625 0 1.40625 1.40625v1.40625s0 1.40625 -1.40625 1.40625H2.109375s-1.40625 0 -1.40625 -1.40625v-1.40625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.109375 17.5753125h18.28125s1.40625 0 1.40625 1.40625v1.40625s0 1.40625 -1.40625 1.40625H2.109375s-1.40625 0 -1.40625 -1.40625v-1.40625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), p1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+bGF5b3V0LWhlYWRsaW5lPC90aXRsZT48cGF0aCBkPSJNMi4xMDkzNzUgMC43MDAzMTI1aDE4LjI4MTI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2MS40MDYyNXMwIDEuNDA2MjUgLTEuNDA2MjUgMS40MDYyNUgyLjEwOTM3NXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1di0xLjQwNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMi4xMDkzNzUgOS4xMzc4MTI0OTk5OTk5OTloMTguMjgxMjVzMS40MDYyNSAwIDEuNDA2MjUgMS40MDYyNXYxLjQwNjI1czAgMS40MDYyNSAtMS40MDYyNSAxLjQwNjI1SDIuMTA5Mzc1cy0xLjQwNjI1IDAgLTEuNDA2MjUgLTEuNDA2MjV2LTEuNDA2MjVzMCAtMS40MDYyNSAxLjQwNjI1IC0xLjQwNjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0yLjEwOTM3NSAxNy41NzUzMTI1aDE4LjI4MTI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2MS40MDYyNXMwIDEuNDA2MjUgLTEuNDA2MjUgMS40MDYyNUgyLjEwOTM3NXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1di0xLjQwNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", f1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: m1,
  default: p1
}, Symbol.toStringTag, { value: "Module" })), b1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "layout-module-1"), /* @__PURE__ */ c("path", { d: "M2.109375 0.7003125h5.625s1.40625 0 1.40625 1.40625v5.625s0 1.40625 -1.40625 1.40625h-5.625s-1.40625 0 -1.40625 -1.40625v-5.625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.109375 13.356562499999999h5.625s1.40625 0 1.40625 1.40625v5.625s0 1.40625 -1.40625 1.40625h-5.625s-1.40625 0 -1.40625 -1.40625v-5.625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M14.765625 0.7003125h5.625s1.40625 0 1.40625 1.40625v5.625s0 1.40625 -1.40625 1.40625h-5.625s-1.40625 0 -1.40625 -1.40625v-5.625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M14.765625 13.356562499999999h5.625s1.40625 0 1.40625 1.40625v5.625s0 1.40625 -1.40625 1.40625h-5.625s-1.40625 0 -1.40625 -1.40625v-5.625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), N1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+bGF5b3V0LW1vZHVsZS0xPC90aXRsZT48cGF0aCBkPSJNMi4xMDkzNzUgMC43MDAzMTI1aDUuNjI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2NS42MjVzMCAxLjQwNjI1IC0xLjQwNjI1IDEuNDA2MjVoLTUuNjI1cy0xLjQwNjI1IDAgLTEuNDA2MjUgLTEuNDA2MjV2LTUuNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMi4xMDkzNzUgMTMuMzU2NTYyNDk5OTk5OTk5aDUuNjI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2NS42MjVzMCAxLjQwNjI1IC0xLjQwNjI1IDEuNDA2MjVoLTUuNjI1cy0xLjQwNjI1IDAgLTEuNDA2MjUgLTEuNDA2MjV2LTUuNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMTQuNzY1NjI1IDAuNzAwMzEyNWg1LjYyNXMxLjQwNjI1IDAgMS40MDYyNSAxLjQwNjI1djUuNjI1czAgMS40MDYyNSAtMS40MDYyNSAxLjQwNjI1aC01LjYyNXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1di01LjYyNXMwIC0xLjQwNjI1IDEuNDA2MjUgLTEuNDA2MjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTE0Ljc2NTYyNSAxMy4zNTY1NjI0OTk5OTk5OTloNS42MjVzMS40MDYyNSAwIDEuNDA2MjUgMS40MDYyNXY1LjYyNXMwIDEuNDA2MjUgLTEuNDA2MjUgMS40MDYyNWgtNS42MjVzLTEuNDA2MjUgMCAtMS40MDYyNSAtMS40MDYyNXYtNS42MjVzMCAtMS40MDYyNSAxLjQwNjI1IC0xLjQwNjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", j1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: b1,
  default: N1
}, Symbol.toStringTag, { value: "Module" })), y1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M0.78375 9.6103125h1.3031249999999999c1.966875 0 3.855 -0.0684375 5.257499999999999 -1.4465625a7.5 7.5 0 0 0 2.2424999999999997 -5.2190625c0 -3.1734375 4.010624999999999 -1.6875 4.010624999999999 1.14375v3.646875a1.875 1.875 0 0 0 1.875 1.875h4.414687499999999c0.9806250000000001 0 1.8046875 0.7565625 1.8234375 1.7371874999999999 0.061875 3.1275 -0.459375 5.4028125 -1.7240625 7.824375 -0.729375 1.396875 -2.2434374999999998 2.175 -3.8184375000000004 2.1403125C5.2228125 21.065624999999997 6.6384375 19.21875 0.78375 19.21875", strokeWidth: 1.5 })), h1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0wLjc4Mzc1IDkuNjEwMzEyNWgxLjMwMzEyNDk5OTk5OTk5OTljMS45NjY4NzUgMCAzLjg1NSAtMC4wNjg0Mzc1IDUuMjU3NDk5OTk5OTk5OTk5IC0xLjQ0NjU2MjVhNy41IDcuNSAwIDAgMCAyLjI0MjQ5OTk5OTk5OTk5OTcgLTUuMjE5MDYyNWMwIC0zLjE3MzQzNzUgNC4wMTA2MjQ5OTk5OTk5OTkgLTEuNjg3NSA0LjAxMDYyNDk5OTk5OTk5OSAxLjE0Mzc1djMuNjQ2ODc1YTEuODc1IDEuODc1IDAgMCAwIDEuODc1IDEuODc1aDQuNDE0Njg3NDk5OTk5OTk5YzAuOTgwNjI1MDAwMDAwMDAwMSAwIDEuODA0Njg3NSAwLjc1NjU2MjUgMS44MjM0Mzc1IDEuNzM3MTg3NDk5OTk5OTk5OSAwLjA2MTg3NSAzLjEyNzUgLTAuNDU5Mzc1IDUuNDAyODEyNSAtMS43MjQwNjI1IDcuODI0Mzc1IC0wLjcyOTM3NSAxLjM5Njg3NSAtMi4yNDM0Mzc0OTk5OTk5OTk4IDIuMTc1IC0zLjgxODQzNzUwMDAwMDAwMDQgMi4xNDAzMTI1QzUuMjIyODEyNSAyMS4wNjU2MjQ5OTk5OTk5OTcgNi42Mzg0Mzc1IDE5LjIxODc1IDAuNzgzNzUgMTkuMjE4NzUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", v1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: y1,
  default: h1
}, Symbol.toStringTag, { value: "Module" })), w1 = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("path", { d: "M5.25 12.373h-3", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m5.25 15.373-1.5 1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m5.25 9.373-1.5-1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M18.75 12.373h3", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m18.75 15.373 1.5 1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m18.75 9.373 1.5-1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M8.25 9.373v-4.5A3.762 3.762 0 0 1 12 1.123h0a3.761 3.761 0 0 1 3.75 3.75v5.25a3.763 3.763 0 0 1-2.25 3.435 3.709 3.709 0 0 1-1.5.315", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M15.75 14.623v4.5a3.76 3.76 0 0 1-3.75 3.75h0a3.761 3.761 0 0 1-3.75-3.75v-4.5a3.762 3.762 0 0 1 3.75-3.75", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), D1 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGQ9Ik01LjI1IDEyLjM3M2gtMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Im01LjI1IDE1LjM3My0xLjUgMS41IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PHBhdGggZD0ibTUuMjUgOS4zNzMtMS41LTEuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Ik0xOC43NSAxMi4zNzNoMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Im0xOC43NSAxNS4zNzMgMS41IDEuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Im0xOC43NSA5LjM3MyAxLjUtMS41IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PHBhdGggZD0iTTguMjUgOS4zNzN2LTQuNUEzLjc2MiAzLjc2MiAwIDAgMSAxMiAxLjEyM2gwYTMuNzYxIDMuNzYxIDAgMCAxIDMuNzUgMy43NXY1LjI1YTMuNzYzIDMuNzYzIDAgMCAxLTIuMjUgMy40MzUgMy43MDkgMy43MDkgMCAwIDEtMS41LjMxNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Ik0xNS43NSAxNC42MjN2NC41YTMuNzYgMy43NiAwIDAgMS0zLjc1IDMuNzVoMGEzLjc2MSAzLjc2MSAwIDAgMS0zLjc1LTMuNzV2LTQuNWEzLjc2MiAzLjc2MiAwIDAgMSAzLjc1LTMuNzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48L3N2Zz4=", S1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: w1,
  default: D1
}, Symbol.toStringTag, { value: "Module" })), x1 = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M5.315625 21.215625H0.759375V8.15625h4.55625Zm9.459375 -8.803125000000001a2.00625 2.00625 0 0 0 -2.00625 2.00625v6.796875H7.9781249999999995V8.15625h4.790625v1.490625a6.3374999999999995 6.3374999999999995 0 0 1 4.0125 -1.5c2.971875 0 5.034375 2.203125 5.034375 6.3843749999999995v6.684375H16.78125v-6.796875a2.00625 2.00625 0 0 0 -2.00625 -2.015625Zm-9.375 -8.774999999999999a2.34375 2.34375 0 1 1 -2.34375 -2.34375 2.34375 2.34375 0 0 1 2.325 2.34375Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), A1 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik01LjMxNTYyNSAyMS4yMTU2MjVIMC43NTkzNzVWOC4xNTYyNWg0LjU1NjI1Wm05LjQ1OTM3NSAtOC44MDMxMjUwMDAwMDAwMDFhMi4wMDYyNSAyLjAwNjI1IDAgMCAwIC0yLjAwNjI1IDIuMDA2MjV2Ni43OTY4NzVINy45NzgxMjQ5OTk5OTk5OTk1VjguMTU2MjVoNC43OTA2MjV2MS40OTA2MjVhNi4zMzc0OTk5OTk5OTk5OTk1IDYuMzM3NDk5OTk5OTk5OTk5NSAwIDAgMSA0LjAxMjUgLTEuNWMyLjk3MTg3NSAwIDUuMDM0Mzc1IDIuMjAzMTI1IDUuMDM0Mzc1IDYuMzg0Mzc0OTk5OTk5OTk5NXY2LjY4NDM3NUgxNi43ODEyNXYtNi43OTY4NzVhMi4wMDYyNSAyLjAwNjI1IDAgMCAwIC0yLjAwNjI1IC0yLjAxNTYyNVptLTkuMzc1IC04Ljc3NDk5OTk5OTk5OTk5OWEyLjM0Mzc1IDIuMzQzNzUgMCAxIDEgLTIuMzQzNzUgLTIuMzQzNzUgMi4zNDM3NSAyLjM0Mzc1IDAgMCAxIDIuMzI1IDIuMzQzNzVaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", L1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: x1,
  default: A1
}, Symbol.toStringTag, { value: "Module" })), C1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "layout-headline"), /* @__PURE__ */ c("path", { d: "M2.109375 0.7003125h18.28125s1.40625 0 1.40625 1.40625v1.40625s0 1.40625 -1.40625 1.40625H2.109375s-1.40625 0 -1.40625 -1.40625v-1.40625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.109375 9.137812499999999h18.28125s1.40625 0 1.40625 1.40625v1.40625s0 1.40625 -1.40625 1.40625H2.109375s-1.40625 0 -1.40625 -1.40625v-1.40625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.109375 17.5753125h18.28125s1.40625 0 1.40625 1.40625v1.40625s0 1.40625 -1.40625 1.40625H2.109375s-1.40625 0 -1.40625 -1.40625v-1.40625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), T1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+bGF5b3V0LWhlYWRsaW5lPC90aXRsZT48cGF0aCBkPSJNMi4xMDkzNzUgMC43MDAzMTI1aDE4LjI4MTI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2MS40MDYyNXMwIDEuNDA2MjUgLTEuNDA2MjUgMS40MDYyNUgyLjEwOTM3NXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1di0xLjQwNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMi4xMDkzNzUgOS4xMzc4MTI0OTk5OTk5OTloMTguMjgxMjVzMS40MDYyNSAwIDEuNDA2MjUgMS40MDYyNXYxLjQwNjI1czAgMS40MDYyNSAtMS40MDYyNSAxLjQwNjI1SDIuMTA5Mzc1cy0xLjQwNjI1IDAgLTEuNDA2MjUgLTEuNDA2MjV2LTEuNDA2MjVzMCAtMS40MDYyNSAxLjQwNjI1IC0xLjQwNjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0yLjEwOTM3NSAxNy41NzUzMTI1aDE4LjI4MTI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2MS40MDYyNXMwIDEuNDA2MjUgLTEuNDA2MjUgMS40MDYyNUgyLjEwOTM3NXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1di0xLjQwNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", k1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: C1,
  default: T1
}, Symbol.toStringTag, { value: "Module" })), z1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", strokeWidth: "1.5px", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "lock-1"), /* @__PURE__ */ c("rect", { x: 3.75, y: 9.75, width: 16.5, height: 13.5, rx: 1.5, ry: 1.5, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M6.75,9.75V6a5.25,5.25,0,0,1,10.5,0V9.75", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("line", { x1: 12, y1: 15, x2: 12, y2: 18, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), E1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjVweCI+PGRlZnM+PC9kZWZzPjx0aXRsZT5sb2NrLTE8L3RpdGxlPjxyZWN0IHg9IjMuNzUiIHk9IjkuNzUiIHdpZHRoPSIxNi41IiBoZWlnaHQ9IjEzLjUiIHJ4PSIxLjUiIHJ5PSIxLjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcmVjdD48cGF0aCBkPSJNNi43NSw5Ljc1VjZhNS4yNSw1LjI1LDAsMCwxLDEwLjUsMFY5Ljc1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PGxpbmUgeDE9IjEyIiB5MT0iMTUiIHgyPSIxMiIgeTI9IjE4IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L2xpbmU+PC9zdmc+", P1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: z1,
  default: E1
}, Symbol.toStringTag, { value: "Module" })), Z1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", strokeWidth: "1.5px", ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "lock-unlock"), /* @__PURE__ */ c("path", { d: "M.75,9.75V6a5.25,5.25,0,0,1,10.5,0V9.75", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("rect", { x: 6.75, y: 9.75, width: 16.5, height: 13.5, rx: 1.5, ry: 1.5, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("line", { x1: 15, y1: 15, x2: 15, y2: 18, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), _1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjVweCI+PGRlZnM+PC9kZWZzPjx0aXRsZT5sb2NrLXVubG9jazwvdGl0bGU+PHBhdGggZD0iTS43NSw5Ljc1VjZhNS4yNSw1LjI1LDAsMCwxLDEwLjUsMFY5Ljc1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PHJlY3QgeD0iNi43NSIgeT0iOS43NSIgd2lkdGg9IjE2LjUiIGhlaWdodD0iMTMuNSIgcng9IjEuNSIgcnk9IjEuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9yZWN0PjxsaW5lIHgxPSIxNSIgeTE9IjE1IiB4Mj0iMTUiIHkyPSIxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9saW5lPjwvc3ZnPg==", O1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: Z1,
  default: _1
}, Symbol.toStringTag, { value: "Module" })), W1 = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("path", { d: "M0.750 9.812 A9.063 9.063 0 1 0 18.876 9.812 A9.063 9.063 0 1 0 0.750 9.812 Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", transform: "translate(-3.056 4.62) rotate(-23.025)" }), /* @__PURE__ */ c("path", { d: "M16.221 16.22L23.25 23.25", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), U1 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGQ9Ik0wLjc1MCA5LjgxMiBBOS4wNjMgOS4wNjMgMCAxIDAgMTguODc2IDkuODEyIEE5LjA2MyA5LjA2MyAwIDEgMCAwLjc1MCA5LjgxMiBaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMy4wNTYgNC42Mikgcm90YXRlKC0yMy4wMjUpIj48L3BhdGg+PHBhdGggZD0iTTE2LjIyMSAxNi4yMkwyMy4yNSAyMy4yNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjwvc3ZnPg==", R1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: W1,
  default: U1
}, Symbol.toStringTag, { value: "Module" })), H1 = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("path", { d: "M11.25 17.25a6 6 0 1 0 12 0 6 6 0 1 0-12 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m13.008 21.491 8.484-8.483", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M8.25 15.75h-6a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5h18a1.5 1.5 0 0 1 1.5 1.5V9", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m21.411 1.3-8.144 6.264a3.308 3.308 0 0 1-4.034 0L1.089 1.3", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), G1 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGQ9Ik0xMS4yNSAxNy4yNWE2IDYgMCAxIDAgMTIgMCA2IDYgMCAxIDAtMTIgMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48cGF0aCBkPSJtMTMuMDA4IDIxLjQ5MSA4LjQ4NC04LjQ4MyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Ik04LjI1IDE1Ljc1aC02YTEuNSAxLjUgMCAwIDEtMS41LTEuNXYtMTJhMS41IDEuNSAwIDAgMSAxLjUtMS41aDE4YTEuNSAxLjUgMCAwIDEgMS41IDEuNVY5IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PHBhdGggZD0ibTIxLjQxMSAxLjMtOC4xNDQgNi4yNjRhMy4zMDggMy4zMDggMCAwIDEtNC4wMzQgMEwxLjA4OSAxLjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48L3N2Zz4=", Y1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: H1,
  default: G1
}, Symbol.toStringTag, { value: "Module" })), B1 = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M6.328125 14.296875H4.21875a3.515625 3.515625 0 0 1 0 -7.03125h2.109375Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M6.328125 14.296875a20.90625 20.90625 0 0 1 11.593125 3.5100000000000002l1.0631249999999999 0.70875V3.046875l-1.0631249999999999 0.70875A20.90625 20.90625 0 0 1 6.328125 7.265625Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m21.796875 9.375 0 2.8125", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M6.328125 14.296875A6.7865625 6.7865625 0 0 0 8.4375 19.21875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), Q1 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik02LjMyODEyNSAxNC4yOTY4NzVINC4yMTg3NWEzLjUxNTYyNSAzLjUxNTYyNSAwIDAgMSAwIC03LjAzMTI1aDIuMTA5Mzc1WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNNi4zMjgxMjUgMTQuMjk2ODc1YTIwLjkwNjI1IDIwLjkwNjI1IDAgMCAxIDExLjU5MzEyNSAzLjUxMDAwMDAwMDAwMDAwMDJsMS4wNjMxMjQ5OTk5OTk5OTk5IDAuNzA4NzVWMy4wNDY4NzVsLTEuMDYzMTI0OTk5OTk5OTk5OSAwLjcwODc1QTIwLjkwNjI1IDIwLjkwNjI1IDAgMCAxIDYuMzI4MTI1IDcuMjY1NjI1WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJtMjEuNzk2ODc1IDkuMzc1IDAgMi44MTI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik02LjMyODEyNSAxNC4yOTY4NzVBNi43ODY1NjI1IDYuNzg2NTYyNSAwIDAgMCA4LjQzNzUgMTkuMjE4NzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", J1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: B1,
  default: Q1
}, Symbol.toStringTag, { value: "Module" })), V1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("title", null, "Mobile"), /* @__PURE__ */ c("g", null, /* @__PURE__ */ c("rect", { x: 5.25, y: 0.75, width: 13.5, height: 22.5, rx: 3, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }), /* @__PURE__ */ c("line", { x1: 5.25, y1: 17.75, x2: 18.75, y2: 17.75, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }))), X1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHRpdGxlPk1vYmlsZTwvdGl0bGU+PGc+PHJlY3QgeD0iNS4yNSIgeT0iMC43NSIgd2lkdGg9IjEzLjUiIGhlaWdodD0iMjIuNSIgcng9IjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41cHgiPjwvcmVjdD48bGluZSB4MT0iNS4yNSIgeTE9IjE3Ljc1IiB4Mj0iMTguNzUiIHkyPSIxNy43NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjVweCI+PC9saW5lPjwvZz48L3N2Zz4=", F1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: V1,
  default: X1
}, Symbol.toStringTag, { value: "Module" })), $1 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "module-three"), /* @__PURE__ */ c("path", { d: "M2.109375 12.65625H8.4375s1.40625 0 1.40625 1.40625v6.328125s0 1.40625 -1.40625 1.40625H2.109375s-1.40625 0 -1.40625 -1.40625V14.0625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M14.0625 12.65625h6.328125s1.40625 0 1.40625 1.40625v6.328125s0 1.40625 -1.40625 1.40625H14.0625s-1.40625 0 -1.40625 -1.40625V14.0625s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M8.0859375 0.703125h6.328125s1.40625 0 1.40625 1.40625V8.4375s0 1.40625 -1.40625 1.40625h-6.328125s-1.40625 0 -1.40625 -1.40625V2.109375s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), q1 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+bW9kdWxlLXRocmVlPC90aXRsZT48cGF0aCBkPSJNMi4xMDkzNzUgMTIuNjU2MjVIOC40Mzc1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2Ni4zMjgxMjVzMCAxLjQwNjI1IC0xLjQwNjI1IDEuNDA2MjVIMi4xMDkzNzVzLTEuNDA2MjUgMCAtMS40MDYyNSAtMS40MDYyNVYxNC4wNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMTQuMDYyNSAxMi42NTYyNWg2LjMyODEyNXMxLjQwNjI1IDAgMS40MDYyNSAxLjQwNjI1djYuMzI4MTI1czAgMS40MDYyNSAtMS40MDYyNSAxLjQwNjI1SDE0LjA2MjVzLTEuNDA2MjUgMCAtMS40MDYyNSAtMS40MDYyNVYxNC4wNjI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNOC4wODU5Mzc1IDAuNzAzMTI1aDYuMzI4MTI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjVWOC40Mzc1czAgMS40MDYyNSAtMS40MDYyNSAxLjQwNjI1aC02LjMyODEyNXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1VjIuMTA5Mzc1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", K1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: $1,
  default: q1
}, Symbol.toStringTag, { value: "Module" })), eI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "money-bags"), /* @__PURE__ */ c("path", { d: "M14.045 7.988C16.091 9.4 18.75 12.8 18.75 15.863c0 3.107-3.361 5.625-6.75 5.625s-6.75-2.518-6.75-5.625c0-3.063 2.659-6.463 4.705-7.875L8.4 4.281a.9.9 0 0 1 .416-1.27 10.2 10.2 0 0 1 6.363 0 .9.9 0 0 1 .421 1.27Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M9.955 7.988h4.09" }), /* @__PURE__ */ c("path", { d: "M4.5 20.738c-3 0-3.75-3-3.75-5.114a7.512 7.512 0 0 1 3.58-6.136L3.066 7.665a.75.75 0 0 1 .616-1.177H6", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M10.329 17.332a2.225 2.225 0 0 0 1.858.876c1.139 0 2.063-.693 2.063-1.548s-.924-1.546-2.063-1.546-2.062-.693-2.062-1.548.924-1.547 2.062-1.547a2.221 2.221 0 0 1 1.858.875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M12.187 18.208v1.03" }), /* @__PURE__ */ c("path", { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M12.187 10.988v1.031" }), /* @__PURE__ */ c("path", { d: "M19.5 20.738c3 0 3.75-3 3.75-5.114a7.512 7.512 0 0 0-3.58-6.136l1.264-1.823a.75.75 0 0 0-.616-1.177H18", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), tI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxkZWZzPjwvZGVmcz48dGl0bGU+bW9uZXktYmFnczwvdGl0bGU+PHBhdGggZD0iTTE0LjA0NSA3Ljk4OEMxNi4wOTEgOS40IDE4Ljc1IDEyLjggMTguNzUgMTUuODYzYzAgMy4xMDctMy4zNjEgNS42MjUtNi43NSA1LjYyNXMtNi43NS0yLjUxOC02Ljc1LTUuNjI1YzAtMy4wNjMgMi42NTktNi40NjMgNC43MDUtNy44NzVMOC40IDQuMjgxYS45LjkgMCAwIDEgLjQxNi0xLjI3IDEwLjIgMTAuMiAwIDAgMSA2LjM2MyAwIC45LjkgMCAwIDEgLjQyMSAxLjI3WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik05Ljk1NSA3Ljk4OGg0LjA5Ij48L3BhdGg+PHBhdGggZD0iTTQuNSAyMC43MzhjLTMgMC0zLjc1LTMtMy43NS01LjExNGE3LjUxMiA3LjUxMiAwIDAgMSAzLjU4LTYuMTM2TDMuMDY2IDcuNjY1YS43NS43NSAwIDAgMSAuNjE2LTEuMTc3SDYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48cGF0aCBkPSJNMTAuMzI5IDE3LjMzMmEyLjIyNSAyLjIyNSAwIDAgMCAxLjg1OC44NzZjMS4xMzkgMCAyLjA2My0uNjkzIDIuMDYzLTEuNTQ4cy0uOTI0LTEuNTQ2LTIuMDYzLTEuNTQ2LTIuMDYyLS42OTMtMi4wNjItMS41NDguOTI0LTEuNTQ3IDIuMDYyLTEuNTQ3YTIuMjIxIDIuMjIxIDAgMCAxIDEuODU4Ljg3NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xMi4xODcgMTguMjA4djEuMDMiPjwvcGF0aD48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTIuMTg3IDEwLjk4OHYxLjAzMSI+PC9wYXRoPjxwYXRoIGQ9Ik0xOS41IDIwLjczOGMzIDAgMy43NS0zIDMuNzUtNS4xMTRhNy41MTIgNy41MTIgMCAwIDAtMy41OC02LjEzNmwxLjI2NC0xLjgyM2EuNzUuNzUgMCAwIDAtLjYxNi0xLjE3N0gxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjwvc3ZnPg==", nI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: eI,
  default: tI
}, Symbol.toStringTag, { value: "Module" })), rI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "navigation-menu-4"), /* @__PURE__ */ c("path", { d: "M2.109375 0.7059375h18.28125s1.40625 0 1.40625 1.40625v18.28125s0 1.40625 -1.40625 1.40625H2.109375s-1.40625 0 -1.40625 -1.40625v-18.28125s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m6.328125 7.0340625 9.84375 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m6.328125 11.252812500000001 9.84375 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m6.328125 15.471562500000001 9.84375 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), oI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+bmF2aWdhdGlvbi1tZW51LTQ8L3RpdGxlPjxwYXRoIGQ9Ik0yLjEwOTM3NSAwLjcwNTkzNzVoMTguMjgxMjVzMS40MDYyNSAwIDEuNDA2MjUgMS40MDYyNXYxOC4yODEyNXMwIDEuNDA2MjUgLTEuNDA2MjUgMS40MDYyNUgyLjEwOTM3NXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1di0xOC4yODEyNXMwIC0xLjQwNjI1IDEuNDA2MjUgLTEuNDA2MjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTYuMzI4MTI1IDcuMDM0MDYyNSA5Ljg0Mzc1IDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTYuMzI4MTI1IDExLjI1MjgxMjUwMDAwMDAwMSA5Ljg0Mzc1IDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTYuMzI4MTI1IDE1LjQ3MTU2MjUwMDAwMDAwMSA5Ljg0Mzc1IDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", iI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: rI,
  default: oI
}, Symbol.toStringTag, { value: "Module" })), sI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M7.03125 0.703125H2.8125a1.40625 1.40625 0 0 0 -1.40625 1.40625v18.28125a1.40625 1.40625 0 0 0 1.40625 1.40625h4.21875a1.40625 1.40625 0 0 0 1.40625 -1.40625V2.109375A1.40625 1.40625 0 0 0 7.03125 0.703125Z", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m11.025 0.80625 3.9000000000000004 1.6125a1.415625 1.415625 0 0 1 0.7687499999999999 1.875L8.4375 20.390625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m17.8875 5.428125 2.8125 3.121875a1.40625 1.40625 0 0 1 -0.09375 1.9875L8.26875 21.046875", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M1.40625 6.796875H8.4375", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M1.40625 12.890625H8.4375", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M4.86 18.9890625a0.3515625 0.3515625 0 0 1 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M4.86 18.9890625a0.3515625 0.3515625 0 0 0 0 -0.703125", strokeWidth: 1.5 })), aI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik03LjAzMTI1IDAuNzAzMTI1SDIuODEyNWExLjQwNjI1IDEuNDA2MjUgMCAwIDAgLTEuNDA2MjUgMS40MDYyNXYxOC4yODEyNWExLjQwNjI1IDEuNDA2MjUgMCAwIDAgMS40MDYyNSAxLjQwNjI1aDQuMjE4NzVhMS40MDYyNSAxLjQwNjI1IDAgMCAwIDEuNDA2MjUgLTEuNDA2MjVWMi4xMDkzNzVBMS40MDYyNSAxLjQwNjI1IDAgMCAwIDcuMDMxMjUgMC43MDMxMjVaIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0xMS4wMjUgMC44MDYyNSAzLjkwMDAwMDAwMDAwMDAwMDQgMS42MTI1YTEuNDE1NjI1IDEuNDE1NjI1IDAgMCAxIDAuNzY4NzQ5OTk5OTk5OTk5OSAxLjg3NUw4LjQzNzUgMjAuMzkwNjI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0xNy44ODc1IDUuNDI4MTI1IDIuODEyNSAzLjEyMTg3NWExLjQwNjI1IDEuNDA2MjUgMCAwIDEgLTAuMDkzNzUgMS45ODc1TDguMjY4NzUgMjEuMDQ2ODc1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xLjQwNjI1IDYuNzk2ODc1SDguNDM3NSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMS40MDYyNSAxMi44OTA2MjVIOC40Mzc1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBkPSJNNC44NiAxOC45ODkwNjI1YTAuMzUxNTYyNSAwLjM1MTU2MjUgMCAwIDEgMCAtMC43MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik00Ljg2IDE4Ljk4OTA2MjVhMC4zNTE1NjI1IDAuMzUxNTYyNSAwIDAgMCAwIC0wLjcwMzEyNSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", cI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: sI,
  default: aI
}, Symbol.toStringTag, { value: "Module" })), lI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "pencil"), /* @__PURE__ */ c("path", { d: "M22.19 1.81a3.639 3.639 0 0 0-5.17.035l-14.5 14.5L.75 23.25l6.905-1.771 14.5-14.5a3.637 3.637 0 0 0 .035-5.169Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m16.606 2.26 5.134 5.134", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "m2.521 16.344 5.139 5.13", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), uI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxkZWZzPjwvZGVmcz48dGl0bGU+cGVuY2lsPC90aXRsZT48cGF0aCBkPSJNMjIuMTkgMS44MWEzLjYzOSAzLjYzOSAwIDAgMC01LjE3LjAzNWwtMTQuNSAxNC41TC43NSAyMy4yNWw2LjkwNS0xLjc3MSAxNC41LTE0LjVhMy42MzcgMy42MzcgMCAwIDAgLjAzNS01LjE2OVoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48cGF0aCBkPSJtMTYuNjA2IDIuMjYgNS4xMzQgNS4xMzQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48cGF0aCBkPSJtMi41MjEgMTYuMzQ0IDUuMTM5IDUuMTMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48L3N2Zz4=", dI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: lI,
  default: uI
}, Symbol.toStringTag, { value: "Module" })), gI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "picture-sun"), /* @__PURE__ */ c("path", { d: "M2.25.75h19.5s1.5 0 1.5 1.5v19.5s0 1.5-1.5 1.5H2.25s-1.5 0-1.5-1.5V2.25s0-1.5 1.5-1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M13.5 7.5a3 3 0 1 0 6 0 3 3 0 1 0-6 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M3.961 14.959a8.194 8.194 0 0 1 11.694 4.149", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M14.382 16.918a4.449 4.449 0 0 1 5.851-.125", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), MI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxkZWZzPjwvZGVmcz48dGl0bGU+cGljdHVyZS1zdW48L3RpdGxlPjxwYXRoIGQ9Ik0yLjI1Ljc1aDE5LjVzMS41IDAgMS41IDEuNXYxOS41czAgMS41LTEuNSAxLjVIMi4yNXMtMS41IDAtMS41LTEuNVYyLjI1czAtMS41IDEuNS0xLjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48cGF0aCBkPSJNMTMuNSA3LjVhMyAzIDAgMSAwIDYgMCAzIDMgMCAxIDAtNiAwIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PHBhdGggZD0iTTMuOTYxIDE0Ljk1OWE4LjE5NCA4LjE5NCAwIDAgMSAxMS42OTQgNC4xNDkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48cGF0aCBkPSJNMTQuMzgyIDE2LjkxOGE0LjQ0OSA0LjQ0OSAwIDAgMSA1Ljg1MS0uMTI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PC9zdmc+", II = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: gI,
  default: MI
}, Symbol.toStringTag, { value: "Module" })), mI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M21.796875 8.4375a2.8125 2.8125 0 0 1 -2.8125 2.8125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M9.375 7.03125h2.8125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M5.9193750000000005 10.542187499999999a0.3515625 0.3515625 0 0 1 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M5.9193750000000005 10.542187499999999a0.3515625 0.3515625 0 0 0 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M7.40625 4.10625C6.309375 2.11875 3.515625 2.109375 3.515625 2.109375l0.590625 4.10625A7.415625 7.415625 0 0 0 2.4375 9.140625H0.703125v5.625h2.334375a7.903124999999999 7.903124999999999 0 0 0 1.875 2.2218750000000003V19.6875a0.7125 0.7125 0 0 0 0.703125 0.703125H7.03125a0.7125 0.7125 0 0 0 0.703125 -0.703125v-1.1625a8.924999999999999 8.924999999999999 0 0 0 5.625 0V19.6875a0.7125 0.7125 0 0 0 0.703125 0.703125h1.40625a0.7125 0.7125 0 0 0 0.703125 -0.703125v-2.68125a7.445625 7.445625 0 0 0 2.8125 -5.75625c0 -6.0843750000000005 -6.609375 -8.803125000000001 -11.578125 -7.14375Z", strokeWidth: 1.5 })), pI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0yMS43OTY4NzUgOC40Mzc1YTIuODEyNSAyLjgxMjUgMCAwIDEgLTIuODEyNSAyLjgxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTkuMzc1IDcuMDMxMjVoMi44MTI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBkPSJNNS45MTkzNzUwMDAwMDAwMDA1IDEwLjU0MjE4NzQ5OTk5OTk5OWEwLjM1MTU2MjUgMC4zNTE1NjI1IDAgMCAxIDAgLTAuNzAzMTI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBkPSJNNS45MTkzNzUwMDAwMDAwMDA1IDEwLjU0MjE4NzQ5OTk5OTk5OWEwLjM1MTU2MjUgMC4zNTE1NjI1IDAgMCAwIDAgLTAuNzAzMTI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik03LjQwNjI1IDQuMTA2MjVDNi4zMDkzNzUgMi4xMTg3NSAzLjUxNTYyNSAyLjEwOTM3NSAzLjUxNTYyNSAyLjEwOTM3NWwwLjU5MDYyNSA0LjEwNjI1QTcuNDE1NjI1IDcuNDE1NjI1IDAgMCAwIDIuNDM3NSA5LjE0MDYyNUgwLjcwMzEyNXY1LjYyNWgyLjMzNDM3NWE3LjkwMzEyNDk5OTk5OTk5OSA3LjkwMzEyNDk5OTk5OTk5OSAwIDAgMCAxLjg3NSAyLjIyMTg3NTAwMDAwMDAwMDNWMTkuNjg3NWEwLjcxMjUgMC43MTI1IDAgMCAwIDAuNzAzMTI1IDAuNzAzMTI1SDcuMDMxMjVhMC43MTI1IDAuNzEyNSAwIDAgMCAwLjcwMzEyNSAtMC43MDMxMjV2LTEuMTYyNWE4LjkyNDk5OTk5OTk5OTk5OSA4LjkyNDk5OTk5OTk5OTk5OSAwIDAgMCA1LjYyNSAwVjE5LjY4NzVhMC43MTI1IDAuNzEyNSAwIDAgMCAwLjcwMzEyNSAwLjcwMzEyNWgxLjQwNjI1YTAuNzEyNSAwLjcxMjUgMCAwIDAgMC43MDMxMjUgLTAuNzAzMTI1di0yLjY4MTI1YTcuNDQ1NjI1IDcuNDQ1NjI1IDAgMCAwIDIuODEyNSAtNS43NTYyNWMwIC02LjA4NDM3NTAwMDAwMDAwMDUgLTYuNjA5Mzc1IC04LjgwMzEyNTAwMDAwMDAwMSAtMTEuNTc4MTI1IC03LjE0Mzc1WiIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", fI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: mI,
  default: pI
}, Symbol.toStringTag, { value: "Module" })), bI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("path", { d: "M23.14 10.61 2.25 0.16A1.56 1.56 0 0 0 0 1.56v20.88a1.56 1.56 0 0 0 2.25 1.4l20.89 -10.45a1.55 1.55 0 0 0 0 -2.78Z", fill: "currentColor", strokeWidth: 1.5 })), NI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggZD0iTTIzLjE0IDEwLjYxIDIuMjUgMC4xNkExLjU2IDEuNTYgMCAwIDAgMCAxLjU2djIwLjg4YTEuNTYgMS41NiAwIDAgMCAyLjI1IDEuNGwyMC44OSAtMTAuNDVhMS41NSAxLjU1IDAgMCAwIDAgLTIuNzhaIiBmaWxsPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41Ij4KICA8L3BhdGg+Cjwvc3ZnPg==", jI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: bI,
  default: NI
}, Symbol.toStringTag, { value: "Module" })), yI = (e) => /* @__PURE__ */ c("svg", { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", ...e }, /* @__PURE__ */ c("g", { clipPath: "url(#clip0_718_1014)" }, /* @__PURE__ */ c("path", { d: "M16.5261 11.0917C16.3752 10.3419 16.0406 9.6412 15.5523 9.05252C15.064 8.46385 14.4372 8.00556 13.7282 7.71874M10.1882 7.75382C9.17274 8.18744 8.34628 8.97062 7.85872 9.96133C7.37116 10.952 7.25477 12.0847 7.53068 13.1538M9.63714 15.9655C10.3514 16.3922 11.1682 16.6168 12.0002 16.6154C12.749 16.6162 13.4866 16.4344 14.1493 16.0859C14.812 15.7373 15.3797 15.2325 15.8033 14.6151M14.0042 19.5877C15.072 19.3054 16.0682 18.801 16.9277 18.1074C17.7872 17.4139 18.4907 16.5467 18.9922 15.5627C19.4937 14.5786 19.7819 13.4998 19.8379 12.3968C19.8939 11.2938 19.7166 10.1913 19.3174 9.16151M17.1796 6.10613C15.7488 4.84585 13.9069 4.15158 12.0002 4.15382C10.0945 4.15064 8.25339 4.84434 6.8236 6.10428M4.71898 9.07013C4.29776 10.1172 4.10731 11.2428 4.16062 12.3702C4.21393 13.4976 4.50975 14.6002 5.02791 15.6029C5.54606 16.6056 6.27437 17.4847 7.16315 18.1803C8.05193 18.876 9.08027 19.3717 10.1781 19.6338", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }), /* @__PURE__ */ c("path", { d: "M8.23731 22.4216C9.41239 22.8462 10.6789 23.0769 11.9998 23.0769C17.0952 23.0769 21.3875 19.6366 22.6798 14.9511M6.19547 2.5634C4.58338 3.55458 3.25226 4.94244 2.3292 6.59448C1.40614 8.24652 0.921948 10.1076 0.922853 12C0.922853 15.2723 2.34162 18.2132 4.59855 20.2412M22.9373 10.236C22.0918 4.95602 17.517 0.923096 11.9998 0.923096C11.3629 0.923096 10.7379 0.976634 10.1305 1.08002", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" })), /* @__PURE__ */ c("defs", null, /* @__PURE__ */ c("clipPath", { id: "clip0_718_1014" }, /* @__PURE__ */ c("rect", { width: 24, height: 24 })))), hI = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzcxOF8xMDE0KSI+CjxwYXRoIGQ9Ik0xNi41MjYxIDExLjA5MTdDMTYuMzc1MiAxMC4zNDE5IDE2LjA0MDYgOS42NDEyIDE1LjU1MjMgOS4wNTI1MkMxNS4wNjQgOC40NjM4NSAxNC40MzcyIDguMDA1NTYgMTMuNzI4MiA3LjcxODc0TTEwLjE4ODIgNy43NTM4MkM5LjE3Mjc0IDguMTg3NDQgOC4zNDYyOCA4Ljk3MDYyIDcuODU4NzIgOS45NjEzM0M3LjM3MTE2IDEwLjk1MiA3LjI1NDc3IDEyLjA4NDcgNy41MzA2OCAxMy4xNTM4TTkuNjM3MTQgMTUuOTY1NUMxMC4zNTE0IDE2LjM5MjIgMTEuMTY4MiAxNi42MTY4IDEyLjAwMDIgMTYuNjE1NEMxMi43NDkgMTYuNjE2MiAxMy40ODY2IDE2LjQzNDQgMTQuMTQ5MyAxNi4wODU5QzE0LjgxMiAxNS43MzczIDE1LjM3OTcgMTUuMjMyNSAxNS44MDMzIDE0LjYxNTFNMTQuMDA0MiAxOS41ODc3QzE1LjA3MiAxOS4zMDU0IDE2LjA2ODIgMTguODAxIDE2LjkyNzcgMTguMTA3NEMxNy43ODcyIDE3LjQxMzkgMTguNDkwNyAxNi41NDY3IDE4Ljk5MjIgMTUuNTYyN0MxOS40OTM3IDE0LjU3ODYgMTkuNzgxOSAxMy40OTk4IDE5LjgzNzkgMTIuMzk2OEMxOS44OTM5IDExLjI5MzggMTkuNzE2NiAxMC4xOTEzIDE5LjMxNzQgOS4xNjE1MU0xNy4xNzk2IDYuMTA2MTNDMTUuNzQ4OCA0Ljg0NTg1IDEzLjkwNjkgNC4xNTE1OCAxMi4wMDAyIDQuMTUzODJDMTAuMDk0NSA0LjE1MDY0IDguMjUzMzkgNC44NDQzNCA2LjgyMzYgNi4xMDQyOE00LjcxODk4IDkuMDcwMTNDNC4yOTc3NiAxMC4xMTcyIDQuMTA3MzEgMTEuMjQyOCA0LjE2MDYyIDEyLjM3MDJDNC4yMTM5MyAxMy40OTc2IDQuNTA5NzUgMTQuNjAwMiA1LjAyNzkxIDE1LjYwMjlDNS41NDYwNiAxNi42MDU2IDYuMjc0MzcgMTcuNDg0NyA3LjE2MzE1IDE4LjE4MDNDOC4wNTE5MyAxOC44NzYgOS4wODAyNyAxOS4zNzE3IDEwLjE3ODEgMTkuNjMzOCIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHBhdGggZD0iTTguMjM3MzEgMjIuNDIxNkM5LjQxMjM5IDIyLjg0NjIgMTAuNjc4OSAyMy4wNzY5IDExLjk5OTggMjMuMDc2OUMxNy4wOTUyIDIzLjA3NjkgMjEuMzg3NSAxOS42MzY2IDIyLjY3OTggMTQuOTUxMU02LjE5NTQ3IDIuNTYzNEM0LjU4MzM4IDMuNTU0NTggMy4yNTIyNiA0Ljk0MjQ0IDIuMzI5MiA2LjU5NDQ4QzEuNDA2MTQgOC4yNDY1MiAwLjkyMTk0OCAxMC4xMDc2IDAuOTIyODUzIDEyQzAuOTIyODUzIDE1LjI3MjMgMi4zNDE2MiAxOC4yMTMyIDQuNTk4NTUgMjAuMjQxMk0yMi45MzczIDEwLjIzNkMyMi4wOTE4IDQuOTU2MDIgMTcuNTE3IDAuOTIzMDk2IDExLjk5OTggMC45MjMwOTZDMTEuMzYyOSAwLjkyMzA5NiAxMC43Mzc5IDAuOTc2NjM0IDEwLjEzMDUgMS4wODAwMiIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMF83MThfMTAxNCI+CjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=", vI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: yI,
  default: hI
}, Symbol.toStringTag, { value: "Module" })), wI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M8.4375 8.4375a2.8125 2.8125 0 1 1 3.75 2.6521875 1.40625 1.40625 0 0 0 -0.9375 1.3265625v0.943125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M11.25 16.875a0.3515625 0.3515625 0 0 1 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M11.25 16.875a0.3515625 0.3515625 0 0 0 0 -0.703125", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeMiterlimit: 10, d: "M11.25 21.796875c5.8246875000000005 0 10.546875 -4.7221874999999995 10.546875 -10.546875S17.0746875 0.703125 11.25 0.703125 0.703125 5.4253124999999995 0.703125 11.25 5.4253124999999995 21.796875 11.25 21.796875Z", strokeWidth: 1.5 })), DI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik04LjQzNzUgOC40Mzc1YTIuODEyNSAyLjgxMjUgMCAxIDEgMy43NSAyLjY1MjE4NzUgMS40MDYyNSAxLjQwNjI1IDAgMCAwIC0wLjkzNzUgMS4zMjY1NjI1djAuOTQzMTI1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBkPSJNMTEuMjUgMTYuODc1YTAuMzUxNTYyNSAwLjM1MTU2MjUgMCAwIDEgMCAtMC43MDMxMjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik0xMS4yNSAxNi44NzVhMC4zNTE1NjI1IDAuMzUxNTYyNSAwIDAgMCAwIC0wLjcwMzEyNSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNMTEuMjUgMjEuNzk2ODc1YzUuODI0Njg3NTAwMDAwMDAwNSAwIDEwLjU0Njg3NSAtNC43MjIxODc0OTk5OTk5OTk1IDEwLjU0Njg3NSAtMTAuNTQ2ODc1UzE3LjA3NDY4NzUgMC43MDMxMjUgMTEuMjUgMC43MDMxMjUgMC43MDMxMjUgNS40MjUzMTI0OTk5OTk5OTk1IDAuNzAzMTI1IDExLjI1IDUuNDI1MzEyNDk5OTk5OTk5NSAyMS43OTY4NzUgMTEuMjUgMjEuNzk2ODc1WiIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", SI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: wI,
  default: DI
}, Symbol.toStringTag, { value: "Module" })), xI = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M21.796875 14.765625v5.625a1.40625 1.40625 0 0 1 -1.40625 1.40625h-8.4375a1.40625 1.40625 0 0 1 -1.40625 -1.40625v-5.625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M21.796875 14.765625a1.40625 1.40625 0 0 0 -1.40625 -1.40625h-8.4375a1.40625 1.40625 0 0 0 -1.40625 1.40625L15.4265625 17.8125a1.40625 1.40625 0 0 0 1.490625 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M3.1640625 3.8671875a3.1640625 3.1640625 0 1 0 6.328125 0 3.1640625 3.1640625 0 1 0 -6.328125 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M13.0078125 3.1640625a2.4609375 2.4609375 0 1 0 4.921875 0 2.4609375 2.4609375 0 1 0 -4.921875 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M10.73625 10.542187499999999A5.6728125 5.6728125 0 0 0 0.703125 13.359375", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M19.6875 10.546875a4.20375 4.20375 0 0 0 -7.5346875 -2.578125", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), AI = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik0yMS43OTY4NzUgMTQuNzY1NjI1djUuNjI1YTEuNDA2MjUgMS40MDYyNSAwIDAgMSAtMS40MDYyNSAxLjQwNjI1aC04LjQzNzVhMS40MDYyNSAxLjQwNjI1IDAgMCAxIC0xLjQwNjI1IC0xLjQwNjI1di01LjYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMjEuNzk2ODc1IDE0Ljc2NTYyNWExLjQwNjI1IDEuNDA2MjUgMCAwIDAgLTEuNDA2MjUgLTEuNDA2MjVoLTguNDM3NWExLjQwNjI1IDEuNDA2MjUgMCAwIDAgLTEuNDA2MjUgMS40MDYyNUwxNS40MjY1NjI1IDE3LjgxMjVhMS40MDYyNSAxLjQwNjI1IDAgMCAwIDEuNDkwNjI1IDBaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0zLjE2NDA2MjUgMy44NjcxODc1YTMuMTY0MDYyNSAzLjE2NDA2MjUgMCAxIDAgNi4zMjgxMjUgMCAzLjE2NDA2MjUgMy4xNjQwNjI1IDAgMSAwIC02LjMyODEyNSAwWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMTMuMDA3ODEyNSAzLjE2NDA2MjVhMi40NjA5Mzc1IDIuNDYwOTM3NSAwIDEgMCA0LjkyMTg3NSAwIDIuNDYwOTM3NSAyLjQ2MDkzNzUgMCAxIDAgLTQuOTIxODc1IDBaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0xMC43MzYyNSAxMC41NDIxODc0OTk5OTk5OTlBNS42NzI4MTI1IDUuNjcyODEyNSAwIDAgMCAwLjcwMzEyNSAxMy4zNTkzNzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTE5LjY4NzUgMTAuNTQ2ODc1YTQuMjAzNzUgNC4yMDM3NSAwIDAgMCAtNy41MzQ2ODc1IC0yLjU3ODEyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", LI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: xI,
  default: AI
}, Symbol.toStringTag, { value: "Module" })), CI = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", id: "Button-Refresh-Arrows--Streamline-Ultimate.svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "Button Refresh Arrows Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("path", { d: "m5.25 14.248 0 4.5 -4.5 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m18.75 9.748 0 -4.5 4.5 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M19.032 5.245A9.752 9.752 0 0 1 8.246 21", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M4.967 18.751A9.753 9.753 0 0 1 15.754 3", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), TI = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgaWQ9IkJ1dHRvbi1SZWZyZXNoLUFycm93cy0tU3RyZWFtbGluZS1VbHRpbWF0ZS5zdmciIGhlaWdodD0iMjQiIHdpZHRoPSIyNCI+PGRlc2M+QnV0dG9uIFJlZnJlc2ggQXJyb3dzIFN0cmVhbWxpbmUgSWNvbjogaHR0cHM6Ly9zdHJlYW1saW5laHEuY29tPC9kZXNjPjxwYXRoIGQ9Im01LjI1IDE0LjI0OCAwIDQuNSAtNC41IDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTE4Ljc1IDkuNzQ4IDAgLTQuNSA0LjUgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMTkuMDMyIDUuMjQ1QTkuNzUyIDkuNzUyIDAgMCAxIDguMjQ2IDIxIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik00Ljk2NyAxOC43NTFBOS43NTMgOS43NTMgMCAwIDEgMTUuNzU0IDMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", kI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: CI,
  default: TI
}, Symbol.toStringTag, { value: "Module" })), zI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", id: "Share-1--Streamline-Streamline--3.0.svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "Share 1 Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "share-1"), /* @__PURE__ */ c("path", { d: "M17.25 8.25h1.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1 -1.5 1.5H5.25a1.5 1.5 0 0 1 -1.5 -1.5v-12a1.5 1.5 0 0 1 1.5 -1.5h1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m12 0.75 0 10.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M8.25 4.5 12 0.75l3.75 3.75", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), EI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IlNoYXJlLTEtLVN0cmVhbWxpbmUtU3RyZWFtbGluZS0tMy4wLnN2ZyIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0Ij48ZGVzYz5TaGFyZSAxIFN0cmVhbWxpbmUgSWNvbjogaHR0cHM6Ly9zdHJlYW1saW5laHEuY29tPC9kZXNjPjxkZWZzPjwvZGVmcz48dGl0bGU+c2hhcmUtMTwvdGl0bGU+PHBhdGggZD0iTTE3LjI1IDguMjVoMS41YTEuNSAxLjUgMCAwIDEgMS41IDEuNXYxMmExLjUgMS41IDAgMCAxIC0xLjUgMS41SDUuMjVhMS41IDEuNSAwIDAgMSAtMS41IC0xLjV2LTEyYTEuNSAxLjUgMCAwIDEgMS41IC0xLjVoMS41IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Im0xMiAwLjc1IDAgMTAuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNOC4yNSA0LjUgMTIgMC43NWwzLjc1IDMuNzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", PI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: zI,
  default: EI
}, Symbol.toStringTag, { value: "Module" })), ZI = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("path", { d: "M.75,17.251a6.753,6.753,0,0,1,9.4-6.208", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M3.375 4.876 A4.125 4.125 0 1 0 11.625 4.876 A4.125 4.125 0 1 0 3.375 4.876 Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M11.250 17.249 A6.000 6.000 0 1 0 23.250 17.249 A6.000 6.000 0 1 0 11.250 17.249 Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M13.008 21.49L21.492 13.006", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), _I = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGQ9Ik0uNzUsMTcuMjUxYTYuNzUzLDYuNzUzLDAsMCwxLDkuNC02LjIwOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Ik0zLjM3NSA0Ljg3NiBBNC4xMjUgNC4xMjUgMCAxIDAgMTEuNjI1IDQuODc2IEE0LjEyNSA0LjEyNSAwIDEgMCAzLjM3NSA0Ljg3NiBaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PHBhdGggZD0iTTExLjI1MCAxNy4yNDkgQTYuMDAwIDYuMDAwIDAgMSAwIDIzLjI1MCAxNy4yNDkgQTYuMDAwIDYuMDAwIDAgMSAwIDExLjI1MCAxNy4yNDkgWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Ik0xMy4wMDggMjEuNDlMMjEuNDkyIDEzLjAwNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjwvc3ZnPg==", OI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: ZI,
  default: _I
}, Symbol.toStringTag, { value: "Module" })), WI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 14 14", height: 16, width: 16, ...e }, /* @__PURE__ */ c("g", { id: "user-single-neutral--close-geometric-human-person-single-up-user" }, /* @__PURE__ */ c("path", { id: "Union", fill: "currentColor", fillRule: "evenodd", d: "M10.5 3.5C10.5 5.433 8.93295 7 6.99995 7C5.06695 7 3.49995 5.433 3.49995 3.5C3.49995 1.567 5.06695 0 6.99995 0C8.93295 0 10.5 1.567 10.5 3.5ZM0.320435 13.4C1.21244 10.56 3.86563 8.50003 6.99996 8.50003C10.1343 8.50003 12.7875 10.56 13.6795 13.4C13.7751 13.7044 13.537 14 13.2179 14H0.781996C0.462883 14 0.224811 13.7044 0.320435 13.4Z", clipRule: "evenodd" }))), UI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAxNCAxNCIgaGVpZ2h0PSIxNiIgd2lkdGg9IjE2Ij48ZyBpZD0idXNlci1zaW5nbGUtbmV1dHJhbC0tY2xvc2UtZ2VvbWV0cmljLWh1bWFuLXBlcnNvbi1zaW5nbGUtdXAtdXNlciI+PHBhdGggaWQ9IlVuaW9uIiBmaWxsPSJjdXJyZW50Q29sb3IiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTEwLjUgMy41QzEwLjUgNS40MzMgOC45MzI5NSA3IDYuOTk5OTUgN0M1LjA2Njk1IDcgMy40OTk5NSA1LjQzMyAzLjQ5OTk1IDMuNUMzLjQ5OTk1IDEuNTY3IDUuMDY2OTUgMCA2Ljk5OTk1IDBDOC45MzI5NSAwIDEwLjUgMS41NjcgMTAuNSAzLjVaTTAuMzIwNDM1IDEzLjRDMS4yMTI0NCAxMC41NiAzLjg2NTYzIDguNTAwMDMgNi45OTk5NiA4LjUwMDAzQzEwLjEzNDMgOC41MDAwMyAxMi43ODc1IDEwLjU2IDEzLjY3OTUgMTMuNEMxMy43NzUxIDEzLjcwNDQgMTMuNTM3IDE0IDEzLjIxNzkgMTRIMC43ODE5OTZDMC40NjI4ODMgMTQgMC4yMjQ4MTEgMTMuNzA0NCAwLjMyMDQzNSAxMy40WiIgY2xpcC1ydWxlPSJldmVub2RkIj48L3BhdGg+PC9nPjwvc3ZnPg==", RI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: WI,
  default: UI
}, Symbol.toStringTag, { value: "Module" })), HI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", height: 24, width: 24, id: "Check-Circle-1--Streamline-Ultimate", ...e }, /* @__PURE__ */ c("desc", null, "Check Circle 1 Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("path", { d: "M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0Zm6.93 8.2 -6.85 9.29a1 1 0 0 1 -1.43 0.19l-4.89 -3.91a1 1 0 0 1 -0.15 -1.41A1 1 0 0 1 7 12.21l4.08 3.26L17.32 7a1 1 0 0 1 1.39 -0.21 1 1 0 0 1 0.22 1.41Z", fill: "currentcolor", strokeWidth: 1 })), GI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0IiBpZD0iQ2hlY2stQ2lyY2xlLTEtLVN0cmVhbWxpbmUtVWx0aW1hdGUiPjxkZXNjPkNoZWNrIENpcmNsZSAxIFN0cmVhbWxpbmUgSWNvbjogaHR0cHM6Ly9zdHJlYW1saW5laHEuY29tPC9kZXNjPjxwYXRoIGQ9Ik0xMiAwYTEyIDEyIDAgMSAwIDEyIDEyQTEyIDEyIDAgMCAwIDEyIDBabTYuOTMgOC4yIC02Ljg1IDkuMjlhMSAxIDAgMCAxIC0xLjQzIDAuMTlsLTQuODkgLTMuOTFhMSAxIDAgMCAxIC0wLjE1IC0xLjQxQTEgMSAwIDAgMSA3IDEyLjIxbDQuMDggMy4yNkwxNy4zMiA3YTEgMSAwIDAgMSAxLjM5IC0wLjIxIDEgMSAwIDAgMSAwLjIyIDEuNDFaIiBmaWxsPSJjdXJyZW50Y29sb3IiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPjwvc3ZnPg==", YI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: HI,
  default: GI
}, Symbol.toStringTag, { value: "Module" })), BI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M8.437481250000001 17.98875c-0.26370937499999997 0.263625 -0.621328125 0.41175 -0.99421875 0.41175 -0.37288125 0 -0.730509375 -0.148125 -0.99421875 -0.41175l-5.042812499999999 -5.041875c-0.13067812499999998 -0.13059375 -0.23433749999999998 -0.28565625 -0.3050625 -0.45628125 -0.070734375 -0.17071875 -0.10713750000000001 -0.35362499999999997 -0.10713750000000001 -0.53840625 0 -0.1846875 0.036403125 -0.3676875 0.10713750000000001 -0.5383125000000001 0.070725 -0.17071875 0.174384375 -0.32578124999999997 0.3050625 -0.45637500000000003L11.25 1.11376875c0.13059375 -0.13055624999999998 0.28575 -0.2341059375 0.45637500000000003 -0.304723125 0.17071875 -0.07061625 0.35362499999999997 -0.10692 0.5383125000000001 -0.106835625h5.041875c0.3729375 0 0.73059375 0.1481578125 0.9943124999999999 0.4118775 0.26371875 0.263728125 0.4119375 0.6214125 0.4119375 0.9943687499999999v5.042812499999999c-0.00009375 0.372703125 -0.148125 0.730125 -0.4115625 0.99375", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M15.1771875 4.56939375c-0.19415625 0 -0.3515625 -0.15739687500000002 -0.3515625 -0.3515625 0 -0.19415625 0.15740625 -0.3515625 0.3515625 -0.3515625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M15.1771875 4.56939375c0.19415625 0 0.3515625 -0.15739687500000002 0.3515625 -0.3515625 0 -0.19415625 -0.15740625 -0.3515625 -0.3515625 -0.3515625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M15.8803125 21.795937499999997c3.10659375 0 5.625 -2.51840625 5.625 -5.625s-2.51840625 -5.625 -5.625 -5.625 -5.625 2.51840625 -5.625 5.625 2.51840625 5.625 5.625 5.625Z", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m19.858124999999998 12.193125 -7.95375 7.9546874999999995", strokeWidth: 1.5 })), QI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik04LjQzNzQ4MTI1MDAwMDAwMSAxNy45ODg3NWMtMC4yNjM3MDkzNzQ5OTk5OTk5NyAwLjI2MzYyNSAtMC42MjEzMjgxMjUgMC40MTE3NSAtMC45OTQyMTg3NSAwLjQxMTc1IC0wLjM3Mjg4MTI1IDAgLTAuNzMwNTA5Mzc1IC0wLjE0ODEyNSAtMC45OTQyMTg3NSAtMC40MTE3NWwtNS4wNDI4MTI0OTk5OTk5OTkgLTUuMDQxODc1Yy0wLjEzMDY3ODEyNDk5OTk5OTk4IC0wLjEzMDU5Mzc1IC0wLjIzNDMzNzQ5OTk5OTk5OTk4IC0wLjI4NTY1NjI1IC0wLjMwNTA2MjUgLTAuNDU2MjgxMjUgLTAuMDcwNzM0Mzc1IC0wLjE3MDcxODc1IC0wLjEwNzEzNzUwMDAwMDAwMDAxIC0wLjM1MzYyNDk5OTk5OTk5OTk3IC0wLjEwNzEzNzUwMDAwMDAwMDAxIC0wLjUzODQwNjI1IDAgLTAuMTg0Njg3NSAwLjAzNjQwMzEyNSAtMC4zNjc2ODc1IDAuMTA3MTM3NTAwMDAwMDAwMDEgLTAuNTM4MzEyNTAwMDAwMDAwMSAwLjA3MDcyNSAtMC4xNzA3MTg3NSAwLjE3NDM4NDM3NSAtMC4zMjU3ODEyNDk5OTk5OTk5NyAwLjMwNTA2MjUgLTAuNDU2Mzc1MDAwMDAwMDAwMDNMMTEuMjUgMS4xMTM3Njg3NWMwLjEzMDU5Mzc1IC0wLjEzMDU1NjI0OTk5OTk5OTk4IDAuMjg1NzUgLTAuMjM0MTA1OTM3NSAwLjQ1NjM3NTAwMDAwMDAwMDAzIC0wLjMwNDcyMzEyNSAwLjE3MDcxODc1IC0wLjA3MDYxNjI1IDAuMzUzNjI0OTk5OTk5OTk5OTcgLTAuMTA2OTIgMC41MzgzMTI1MDAwMDAwMDAxIC0wLjEwNjgzNTYyNWg1LjA0MTg3NWMwLjM3MjkzNzUgMCAwLjczMDU5Mzc1IDAuMTQ4MTU3ODEyNSAwLjk5NDMxMjQ5OTk5OTk5OTkgMC40MTE4Nzc1IDAuMjYzNzE4NzUgMC4yNjM3MjgxMjUgMC40MTE5Mzc1IDAuNjIxNDEyNSAwLjQxMTkzNzUgMC45OTQzNjg3NDk5OTk5OTk5djUuMDQyODEyNDk5OTk5OTk5Yy0wLjAwMDA5Mzc1IDAuMzcyNzAzMTI1IC0wLjE0ODEyNSAwLjczMDEyNSAtMC40MTE1NjI1IDAuOTkzNzUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik0xNS4xNzcxODc1IDQuNTY5MzkzNzVjLTAuMTk0MTU2MjUgMCAtMC4zNTE1NjI1IC0wLjE1NzM5Njg3NTAwMDAwMDAyIC0wLjM1MTU2MjUgLTAuMzUxNTYyNSAwIC0wLjE5NDE1NjI1IDAuMTU3NDA2MjUgLTAuMzUxNTYyNSAwLjM1MTU2MjUgLTAuMzUxNTYyNSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgZD0iTTE1LjE3NzE4NzUgNC41NjkzOTM3NWMwLjE5NDE1NjI1IDAgMC4zNTE1NjI1IC0wLjE1NzM5Njg3NTAwMDAwMDAyIDAuMzUxNTYyNSAtMC4zNTE1NjI1IDAgLTAuMTk0MTU2MjUgLTAuMTU3NDA2MjUgLTAuMzUxNTYyNSAtMC4zNTE1NjI1IC0wLjM1MTU2MjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTE1Ljg4MDMxMjUgMjEuNzk1OTM3NDk5OTk5OTk3YzMuMTA2NTkzNzUgMCA1LjYyNSAtMi41MTg0MDYyNSA1LjYyNSAtNS42MjVzLTIuNTE4NDA2MjUgLTUuNjI1IC01LjYyNSAtNS42MjUgLTUuNjI1IDIuNTE4NDA2MjUgLTUuNjI1IDUuNjI1IDIuNTE4NDA2MjUgNS42MjUgNS42MjUgNS42MjVaIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0xOS44NTgxMjQ5OTk5OTk5OTggMTIuMTkzMTI1IC03Ljk1Mzc1IDcuOTU0Njg3NDk5OTk5OTk5NSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", JI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: BI,
  default: QI
}, Symbol.toStringTag, { value: "Module" })), VI = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M8.437481250000001 17.98875c-0.26370937499999997 0.263625 -0.621328125 0.41175 -0.99421875 0.41175 -0.37288125 0 -0.730509375 -0.148125 -0.99421875 -0.41175l-5.042812499999999 -5.041875c-0.13067812499999998 -0.13059375 -0.23433749999999998 -0.28565625 -0.3050625 -0.45628125 -0.070734375 -0.17071875 -0.10713750000000001 -0.35362499999999997 -0.10713750000000001 -0.53840625 0 -0.1846875 0.036403125 -0.3676875 0.10713750000000001 -0.5383125000000001 0.070725 -0.17071875 0.174384375 -0.32578124999999997 0.3050625 -0.45637500000000003L11.25 1.11376875c0.13059375 -0.13055624999999998 0.28575 -0.2341059375 0.45637500000000003 -0.304723125 0.17071875 -0.07061625 0.35362499999999997 -0.10692 0.5383125000000001 -0.106835625h5.041875c0.3729375 0 0.73059375 0.1481578125 0.9943124999999999 0.4118775 0.26371875 0.263728125 0.4119375 0.6214125 0.4119375 0.9943687499999999v5.042812499999999c-0.00009375 0.372703125 -0.148125 0.730125 -0.4115625 0.99375", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M15.1771875 4.56939375c-0.19415625 0 -0.3515625 -0.15739687500000002 -0.3515625 -0.3515625 0 -0.19415625 0.15740625 -0.3515625 0.3515625 -0.3515625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", d: "M15.1771875 4.56939375c0.19415625 0 0.3515625 -0.15739687500000002 0.3515625 -0.3515625 0 -0.19415625 -0.15740625 -0.3515625 -0.3515625 -0.3515625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m18.38709375 14.53125 -2.7234374999999997 3.631875c-0.06046875 0.08053125 -0.13753125 0.14709375000000002 -0.22593749999999999 0.19528125000000002 -0.0885 0.0481875 -0.1861875 0.07678125 -0.28668750000000004 0.08390625 -0.10040625 0.007031249999999999 -0.20118750000000002 -0.0075 -0.29559375000000004 -0.04265625 -0.0943125 -0.035250000000000004 -0.18 -0.090375 -0.25115625 -0.16153125000000002l-1.40625 -1.40625", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M15.8803125 21.795937499999997c3.10659375 0 5.625 -2.51840625 5.625 -5.625s-2.51840625 -5.625 -5.625 -5.625 -5.625 2.51840625 -5.625 5.625 2.51840625 5.625 5.625 5.625Z", strokeWidth: 1.5 })), XI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik04LjQzNzQ4MTI1MDAwMDAwMSAxNy45ODg3NWMtMC4yNjM3MDkzNzQ5OTk5OTk5NyAwLjI2MzYyNSAtMC42MjEzMjgxMjUgMC40MTE3NSAtMC45OTQyMTg3NSAwLjQxMTc1IC0wLjM3Mjg4MTI1IDAgLTAuNzMwNTA5Mzc1IC0wLjE0ODEyNSAtMC45OTQyMTg3NSAtMC40MTE3NWwtNS4wNDI4MTI0OTk5OTk5OTkgLTUuMDQxODc1Yy0wLjEzMDY3ODEyNDk5OTk5OTk4IC0wLjEzMDU5Mzc1IC0wLjIzNDMzNzQ5OTk5OTk5OTk4IC0wLjI4NTY1NjI1IC0wLjMwNTA2MjUgLTAuNDU2MjgxMjUgLTAuMDcwNzM0Mzc1IC0wLjE3MDcxODc1IC0wLjEwNzEzNzUwMDAwMDAwMDAxIC0wLjM1MzYyNDk5OTk5OTk5OTk3IC0wLjEwNzEzNzUwMDAwMDAwMDAxIC0wLjUzODQwNjI1IDAgLTAuMTg0Njg3NSAwLjAzNjQwMzEyNSAtMC4zNjc2ODc1IDAuMTA3MTM3NTAwMDAwMDAwMDEgLTAuNTM4MzEyNTAwMDAwMDAwMSAwLjA3MDcyNSAtMC4xNzA3MTg3NSAwLjE3NDM4NDM3NSAtMC4zMjU3ODEyNDk5OTk5OTk5NyAwLjMwNTA2MjUgLTAuNDU2Mzc1MDAwMDAwMDAwMDNMMTEuMjUgMS4xMTM3Njg3NWMwLjEzMDU5Mzc1IC0wLjEzMDU1NjI0OTk5OTk5OTk4IDAuMjg1NzUgLTAuMjM0MTA1OTM3NSAwLjQ1NjM3NTAwMDAwMDAwMDAzIC0wLjMwNDcyMzEyNSAwLjE3MDcxODc1IC0wLjA3MDYxNjI1IDAuMzUzNjI0OTk5OTk5OTk5OTcgLTAuMTA2OTIgMC41MzgzMTI1MDAwMDAwMDAxIC0wLjEwNjgzNTYyNWg1LjA0MTg3NWMwLjM3MjkzNzUgMCAwLjczMDU5Mzc1IDAuMTQ4MTU3ODEyNSAwLjk5NDMxMjQ5OTk5OTk5OTkgMC40MTE4Nzc1IDAuMjYzNzE4NzUgMC4yNjM3MjgxMjUgMC40MTE5Mzc1IDAuNjIxNDEyNSAwLjQxMTkzNzUgMC45OTQzNjg3NDk5OTk5OTk5djUuMDQyODEyNDk5OTk5OTk5Yy0wLjAwMDA5Mzc1IDAuMzcyNzAzMTI1IC0wLjE0ODEyNSAwLjczMDEyNSAtMC40MTE1NjI1IDAuOTkzNzUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIGQ9Ik0xNS4xNzcxODc1IDQuNTY5MzkzNzVjLTAuMTk0MTU2MjUgMCAtMC4zNTE1NjI1IC0wLjE1NzM5Njg3NTAwMDAwMDAyIC0wLjM1MTU2MjUgLTAuMzUxNTYyNSAwIC0wLjE5NDE1NjI1IDAuMTU3NDA2MjUgLTAuMzUxNTYyNSAwLjM1MTU2MjUgLTAuMzUxNTYyNSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgZD0iTTE1LjE3NzE4NzUgNC41NjkzOTM3NWMwLjE5NDE1NjI1IDAgMC4zNTE1NjI1IC0wLjE1NzM5Njg3NTAwMDAwMDAyIDAuMzUxNTYyNSAtMC4zNTE1NjI1IDAgLTAuMTk0MTU2MjUgLTAuMTU3NDA2MjUgLTAuMzUxNTYyNSAtMC4zNTE1NjI1IC0wLjM1MTU2MjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTE4LjM4NzA5Mzc1IDE0LjUzMTI1IC0yLjcyMzQzNzQ5OTk5OTk5OTcgMy42MzE4NzVjLTAuMDYwNDY4NzUgMC4wODA1MzEyNSAtMC4xMzc1MzEyNSAwLjE0NzA5Mzc1MDAwMDAwMDAyIC0wLjIyNTkzNzQ5OTk5OTk5OTk5IDAuMTk1MjgxMjUwMDAwMDAwMDIgLTAuMDg4NSAwLjA0ODE4NzUgLTAuMTg2MTg3NSAwLjA3Njc4MTI1IC0wLjI4NjY4NzUwMDAwMDAwMDA0IDAuMDgzOTA2MjUgLTAuMTAwNDA2MjUgMC4wMDcwMzEyNDk5OTk5OTk5OTkgLTAuMjAxMTg3NTAwMDAwMDAwMDIgLTAuMDA3NSAtMC4yOTU1OTM3NTAwMDAwMDAwNCAtMC4wNDI2NTYyNSAtMC4wOTQzMTI1IC0wLjAzNTI1MDAwMDAwMDAwMDAwNCAtMC4xOCAtMC4wOTAzNzUgLTAuMjUxMTU2MjUgLTAuMTYxNTMxMjUwMDAwMDAwMDJsLTEuNDA2MjUgLTEuNDA2MjUiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTE1Ljg4MDMxMjUgMjEuNzk1OTM3NDk5OTk5OTk3YzMuMTA2NTkzNzUgMCA1LjYyNSAtMi41MTg0MDYyNSA1LjYyNSAtNS42MjVzLTIuNTE4NDA2MjUgLTUuNjI1IC01LjYyNSAtNS42MjUgLTUuNjI1IDIuNTE4NDA2MjUgLTUuNjI1IDUuNjI1IDIuNTE4NDA2MjUgNS42MjUgNS42MjUgNS42MjVaIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", FI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: VI,
  default: XI
}, Symbol.toStringTag, { value: "Module" })), $I = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "type-cursor"), /* @__PURE__ */ c("path", { d: "M2.109375 6.32625h18.28125s1.40625 0 1.40625 1.40625v7.03125s0 1.40625 -1.40625 1.40625H2.109375s-1.40625 0 -1.40625 -1.40625v-7.03125s0 -1.40625 1.40625 -1.40625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m16.171875 17.57625 0 -12.65625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M11.953125 21.795a4.21875 4.21875 0 0 0 4.21875 -4.21875 4.21875 4.21875 0 0 0 4.21875 4.21875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M11.953125 0.70125a4.21875 4.21875 0 0 1 4.21875 4.21875 4.21875 4.21875 0 0 1 4.21875 -4.21875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), qI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+dHlwZS1jdXJzb3I8L3RpdGxlPjxwYXRoIGQ9Ik0yLjEwOTM3NSA2LjMyNjI1aDE4LjI4MTI1czEuNDA2MjUgMCAxLjQwNjI1IDEuNDA2MjV2Ny4wMzEyNXMwIDEuNDA2MjUgLTEuNDA2MjUgMS40MDYyNUgyLjEwOTM3NXMtMS40MDYyNSAwIC0xLjQwNjI1IC0xLjQwNjI1di03LjAzMTI1czAgLTEuNDA2MjUgMS40MDYyNSAtMS40MDYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJtMTYuMTcxODc1IDE3LjU3NjI1IDAgLTEyLjY1NjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0xMS45NTMxMjUgMjEuNzk1YTQuMjE4NzUgNC4yMTg3NSAwIDAgMCA0LjIxODc1IC00LjIxODc1IDQuMjE4NzUgNC4yMTg3NSAwIDAgMCA0LjIxODc1IDQuMjE4NzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTExLjk1MzEyNSAwLjcwMTI1YTQuMjE4NzUgNC4yMTg3NSAwIDAgMSA0LjIxODc1IDQuMjE4NzUgNC4yMTg3NSA0LjIxODc1IDAgMCAxIDQuMjE4NzUgLTQuMjE4NzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", KI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: $I,
  default: qI
}, Symbol.toStringTag, { value: "Module" })), e2 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M22 14.429h-3.445a1.905 1.905 0 0 0-1.543.794l-4.617 7.095a1.622 1.622 0 0 1-2.783-.233 1.597 1.597 0 0 1-.103-1.1l.833-3.142a1.867 1.867 0 0 0-.993-2.164 1.911 1.911 0 0 0-.833-.193h-4.63A1.881 1.881 0 0 1 2.08 13.06v-.011l1.8-6.008v-.016c.733-2.36 1.992-3.97 4.47-3.97 5.933 0 5.594-.684 12.523 2.818.377.188.752.379 1.126.572V16.5" })), t2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiIGQ9Ik0yMiAxNC40MjloLTMuNDQ1YTEuOTA1IDEuOTA1IDAgMCAwLTEuNTQzLjc5NGwtNC42MTcgNy4wOTVhMS42MjIgMS42MjIgMCAwIDEtMi43ODMtLjIzMyAxLjU5NyAxLjU5NyAwIDAgMS0uMTAzLTEuMWwuODMzLTMuMTQyYTEuODY3IDEuODY3IDAgMCAwLS45OTMtMi4xNjQgMS45MTEgMS45MTEgMCAwIDAtLjgzMy0uMTkzaC00LjYzQTEuODgxIDEuODgxIDAgMCAxIDIuMDggMTMuMDZ2LS4wMTFsMS44LTYuMDA4di0uMDE2Yy43MzMtMi4zNiAxLjk5Mi0zLjk3IDQuNDctMy45NyA1LjkzMyAwIDUuNTk0LS42ODQgMTIuNTIzIDIuODE4LjM3Ny4xODguNzUyLjM3OSAxLjEyNi41NzJWMTYuNSIvPgo8L3N2Zz4=", n2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: e2,
  default: t2
}, Symbol.toStringTag, { value: "Module" })), r2 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M2.001 10.571h3.443a1.907 1.907 0 0 0 1.543-.794l4.618-7.095a1.62 1.62 0 0 1 1.992-.537 1.598 1.598 0 0 1 .892 1.871l-.832 3.14a1.867 1.867 0 0 0 .993 2.165c.259.127.544.193.832.194h4.63a1.883 1.883 0 0 1 1.807 2.426v.011l-1.8 6.008v.015c-.733 2.36-1.993 3.97-4.47 3.97-5.933 0-5.593.684-12.524-2.818-.375-.188-.75-.38-1.125-.57v-9.89" })), o2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiIGQ9Ik0yLjAwMSAxMC41NzFoMy40NDNhMS45MDcgMS45MDcgMCAwIDAgMS41NDMtLjc5NGw0LjYxOC03LjA5NWExLjYyIDEuNjIgMCAwIDEgMS45OTItLjUzNyAxLjU5OCAxLjU5OCAwIDAgMSAuODkyIDEuODcxbC0uODMyIDMuMTRhMS44NjcgMS44NjcgMCAwIDAgLjk5MyAyLjE2NWMuMjU5LjEyNy41NDQuMTkzLjgzMi4xOTRoNC42M2ExLjg4MyAxLjg4MyAwIDAgMSAxLjgwNyAyLjQyNnYuMDExbC0xLjggNi4wMDh2LjAxNWMtLjczMyAyLjM2LTEuOTkzIDMuOTctNC40NyAzLjk3LTUuOTMzIDAtNS41OTMuNjg0LTEyLjUyNC0yLjgxOC0uMzc1LS4xODgtLjc1LS4zOC0xLjEyNS0uNTd2LTkuODkiLz4KPC9zdmc+", i2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: r2,
  default: o2
}, Symbol.toStringTag, { value: "Module" })), s2 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "time-reverse"), /* @__PURE__ */ c("path", { d: "m8.5903125 16.5028125 2.8115625 -2.8125 0.0009375 -4.6875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m13.273125 6.4246875 -3.75 -3.046875 4.21875 -2.578125", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M3.4753125 17.4375a9.2221875 9.2221875 0 1 0 6.1068750000000005 -14.0296875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M6.42375 4.6284375a9.346875 9.346875 0 0 0 -2.8528125 2.7525", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.19 10.78125a9.5728125 9.5728125 0 0 0 0.12187500000000001 3.9628125", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), a2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZWZzPjwvZGVmcz48dGl0bGU+dGltZS1yZXZlcnNlPC90aXRsZT48cGF0aCBkPSJtOC41OTAzMTI1IDE2LjUwMjgxMjUgMi44MTE1NjI1IC0yLjgxMjUgMC4wMDA5Mzc1IC00LjY4NzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTEzLjI3MzEyNSA2LjQyNDY4NzUgLTMuNzUgLTMuMDQ2ODc1IDQuMjE4NzUgLTIuNTc4MTI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0zLjQ3NTMxMjUgMTcuNDM3NWE5LjIyMjE4NzUgOS4yMjIxODc1IDAgMSAwIDYuMTA2ODc1MDAwMDAwMDAwNSAtMTQuMDI5Njg3NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNNi40MjM3NSA0LjYyODQzNzVhOS4zNDY4NzUgOS4zNDY4NzUgMCAwIDAgLTIuODUyODEyNSAyLjc1MjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTIuMTkgMTAuNzgxMjVhOS41NzI4MTI1IDkuNTcyODEyNSAwIDAgMCAwLjEyMTg3NTAwMDAwMDAwMDAxIDMuOTYyODEyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", c2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: s2,
  default: a2
}, Symbol.toStringTag, { value: "Module" })), l2 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M18.0576 22.3846H5.94219C5.48317 22.3846 5.04294 22.2023 4.71836 21.8777C4.39377 21.5531 4.21143 21.1129 4.21143 20.6538V5.07692H19.7883V20.6538C19.7883 21.1129 19.606 21.5531 19.2814 21.8777C18.9568 22.2023 18.5166 22.3846 18.0576 22.3846Z" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M9.40381 17.1923V10.2692" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M14.5962 17.1923V10.2692" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M0.75 5.07692H23.25" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M14.5962 1.61539H9.40386C8.94484 1.61539 8.50461 1.79774 8.18003 2.12232C7.85544 2.4469 7.6731 2.88713 7.6731 3.34616V5.07693H16.3269V3.34616C16.3269 2.88713 16.1446 2.4469 15.82 2.12232C15.4954 1.79774 15.0552 1.61539 14.5962 1.61539Z" })), u2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xOC4wNTc2IDIyLjM4NDZINS45NDIxOUM1LjQ4MzE3IDIyLjM4NDYgNS4wNDI5NCAyMi4yMDIzIDQuNzE4MzYgMjEuODc3N0M0LjM5Mzc3IDIxLjU1MzEgNC4yMTE0MyAyMS4xMTI5IDQuMjExNDMgMjAuNjUzOFY1LjA3NjkySDE5Ljc4ODNWMjAuNjUzOEMxOS43ODgzIDIxLjExMjkgMTkuNjA2IDIxLjU1MzEgMTkuMjgxNCAyMS44Nzc3QzE4Ljk1NjggMjIuMjAyMyAxOC41MTY2IDIyLjM4NDYgMTguMDU3NiAyMi4zODQ2WiI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik05LjQwMzgxIDE3LjE5MjNWMTAuMjY5MiI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xNC41OTYyIDE3LjE5MjNWMTAuMjY5MiI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0wLjc1IDUuMDc2OTJIMjMuMjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTQuNTk2MiAxLjYxNTM5SDkuNDAzODZDOC45NDQ4NCAxLjYxNTM5IDguNTA0NjEgMS43OTc3NCA4LjE4MDAzIDIuMTIyMzJDNy44NTU0NCAyLjQ0NjkgNy42NzMxIDIuODg3MTMgNy42NzMxIDMuMzQ2MTZWNS4wNzY5M0gxNi4zMjY5VjMuMzQ2MTZDMTYuMzI2OSAyLjg4NzEzIDE2LjE0NDYgMi40NDY5IDE1LjgyIDIuMTIyMzJDMTUuNDk1NCAxLjc5Nzc0IDE1LjA1NTIgMS42MTUzOSAxNC41OTYyIDEuNjE1MzlaIj48L3BhdGg+PC9zdmc+", d2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: l2,
  default: u2
}, Symbol.toStringTag, { value: "Module" })), g2 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "-0.75 -0.75 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5440625 21.724687499999998 0.703125 0.703125l5.2528125 0L21.796875 21.724687499999998h-5.2528125Z", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m21.0515625 0.703125 -8.3503125 8.954062500000001", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m1.4484374999999998 21.724687499999998 8.34375 -8.9475", strokeWidth: 1.5 })), M2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9Ii0wLjc1IC0wLjc1IDI0IDI0IiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xNi41NDQwNjI1IDIxLjcyNDY4NzQ5OTk5OTk5OCAwLjcwMzEyNSAwLjcwMzEyNWw1LjI1MjgxMjUgMEwyMS43OTY4NzUgMjEuNzI0Njg3NDk5OTk5OTk4aC01LjI1MjgxMjVaIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0yMS4wNTE1NjI1IDAuNzAzMTI1IC04LjM1MDMxMjUgOC45NTQwNjI1MDAwMDAwMDEiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTEuNDQ4NDM3NDk5OTk5OTk5OCAyMS43MjQ2ODc0OTk5OTk5OTggOC4zNDM3NSAtOC45NDc1IiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", I2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: g2,
  default: M2
}, Symbol.toStringTag, { value: "Module" })), m2 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 122.43 122.41", ...e }, /* @__PURE__ */ c("path", { d: "M83.86 54.15v34.13H38.57V54.15H0v68.26h122.43V54.15H83.86zM38.57 0h45.3v34.13h-45.3z" })), p2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjIuNDMgMTIyLjQxIj4KICAgIDxwYXRoIGQ9Ik04My44NiA1NC4xNXYzNC4xM0gzOC41N1Y1NC4xNUgwdjY4LjI2aDEyMi40M1Y1NC4xNUg4My44NnpNMzguNTcgMGg0NS4zdjM0LjEzaC00NS4zeiIvPgo8L3N2Zz4=", f2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: m2,
  default: p2
}, Symbol.toStringTag, { value: "Module" })), b2 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "upload-bottom"), /* @__PURE__ */ c("path", { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "M12.001 15.75v-12" }), /* @__PURE__ */ c("path", { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", d: "m16.501 8.25-4.5-4.5-4.5 4.5" }), /* @__PURE__ */ c("path", { d: "M23.251 15.75v1.5a3 3 0 0 1-3 3h-16.5a3 3 0 0 1-3-3v-1.5", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), N2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxkZWZzPjwvZGVmcz48dGl0bGU+dXBsb2FkLWJvdHRvbTwvdGl0bGU+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTEyLjAwMSAxNS43NXYtMTIiPjwvcGF0aD48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtMTYuNTAxIDguMjUtNC41LTQuNS00LjUgNC41Ij48L3BhdGg+PHBhdGggZD0iTTIzLjI1MSAxNS43NXYxLjVhMyAzIDAgMCAxLTMgM2gtMTYuNWEzIDMgMCAwIDEtMy0zdi0xLjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48L3N2Zz4=", j2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: b2,
  default: N2
}, Symbol.toStringTag, { value: "Module" })), y2 = (e) => /* @__PURE__ */ c("svg", { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", strokeWidth: 1.5, ...e }, /* @__PURE__ */ c("path", { d: "M11.250 17.250 A6.000 6.000 0 1 0 23.250 17.250 A6.000 6.000 0 1 0 11.250 17.250 Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M17.25 14.25L17.25 20.25", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M14.25 17.25L20.25 17.25", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M.75,17.25a6.753,6.753,0,0,1,9.4-6.208", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ c("path", { d: "M3.375 4.875 A4.125 4.125 0 1 0 11.625 4.875 A4.125 4.125 0 1 0 3.375 4.875 Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })), h2 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGQ9Ik0xMS4yNTAgMTcuMjUwIEE2LjAwMCA2LjAwMCAwIDEgMCAyMy4yNTAgMTcuMjUwIEE2LjAwMCA2LjAwMCAwIDEgMCAxMS4yNTAgMTcuMjUwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48cGF0aCBkPSJNMTcuMjUgMTQuMjVMMTcuMjUgMjAuMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48cGF0aCBkPSJNMTQuMjUgMTcuMjVMMjAuMjUgMTcuMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48cGF0aCBkPSJNLjc1LDE3LjI1YTYuNzUzLDYuNzUzLDAsMCwxLDkuNC02LjIwOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPjxwYXRoIGQ9Ik0zLjM3NSA0Ljg3NSBBNC4xMjUgNC4xMjUgMCAxIDAgMTEuNjI1IDQuODc1IEE0LjEyNSA0LjEyNSAwIDEgMCAzLjM3NSA0Ljg3NSBaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+PC9zdmc+", v2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: y2,
  default: h2
}, Symbol.toStringTag, { value: "Module" })), w2 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", id: "Single-Neutral-Actions--Streamline-Ultimate.svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "Single Neutral Actions Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("g", null, /* @__PURE__ */ c("path", { d: "M5.9611 6.2789C5.9611 10.9277 10.9935 13.8332 15.0195 11.5088C16.8879 10.43 18.0389 8.4364 18.0389 6.2789C18.0389 1.6302 13.0065 -1.2753 8.9805 1.0491C7.1121 2.1278 5.9611 4.1214 5.9611 6.2789", fill: "currentColor", strokeWidth: 1 }), /* @__PURE__ */ c("path", { d: "M12 13.5892C6.7337 13.589 2.4649 17.8581 2.4649 23.1243C2.4649 23.4754 2.7495 23.76 3.1005 23.76H20.8995C21.2505 23.76 21.5351 23.4754 21.5351 23.1243C21.5351 17.8581 17.2663 13.589 12 13.5892Z", fill: "currentColor", strokeWidth: 1 }))), D2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IlNpbmdsZS1OZXV0cmFsLUFjdGlvbnMtLVN0cmVhbWxpbmUtVWx0aW1hdGUuc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxkZXNjPlNpbmdsZSBOZXV0cmFsIEFjdGlvbnMgU3RyZWFtbGluZSBJY29uOiBodHRwczovL3N0cmVhbWxpbmVocS5jb208L2Rlc2M+PGc+PHBhdGggZD0iTTUuOTYxMSA2LjI3ODlDNS45NjExIDEwLjkyNzcgMTAuOTkzNSAxMy44MzMyIDE1LjAxOTUgMTEuNTA4OEMxNi44ODc5IDEwLjQzIDE4LjAzODkgOC40MzY0IDE4LjAzODkgNi4yNzg5QzE4LjAzODkgMS42MzAyIDEzLjAwNjUgLTEuMjc1MyA4Ljk4MDUgMS4wNDkxQzcuMTEyMSAyLjEyNzggNS45NjExIDQuMTIxNCA1Ljk2MTEgNi4yNzg5IiBmaWxsPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPjxwYXRoIGQ9Ik0xMiAxMy41ODkyQzYuNzMzNyAxMy41ODkgMi40NjQ5IDE3Ljg1ODEgMi40NjQ5IDIzLjEyNDNDMi40NjQ5IDIzLjQ3NTQgMi43NDk1IDIzLjc2IDMuMTAwNSAyMy43NkgyMC44OTk1QzIxLjI1MDUgMjMuNzYgMjEuNTM1MSAyMy40NzU0IDIxLjUzNTEgMjMuMTI0M0MyMS41MzUxIDE3Ljg1ODEgMTcuMjY2MyAxMy41ODkgMTIgMTMuNTg5MloiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+PC9nPjwvc3ZnPg==", S2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: w2,
  default: D2
}, Symbol.toStringTag, { value: "Module" })), x2 = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M0.703125 14.765625a7.03125 7.03125 0 1 0 14.0625 0 7.03125 7.03125 0 1 0 -14.0625 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M4.921875 13.359375a2.8125 2.8125 0 1 0 5.625 0 2.8125 2.8125 0 1 0 -5.625 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M12.3159375 20.0990625a5.1206249999999995 5.1206249999999995 0 0 0 -9.163124999999999 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M3.515625 4.921875v-2.8125a1.40625 1.40625 0 0 1 1.40625 -1.40625h9.9646875a1.40625 1.40625 0 0 1 0.99375 0.4115625l5.505 5.505a1.40625 1.40625 0 0 1 0.4115625 0.99375V20.390625a1.40625 1.40625 0 0 1 -1.40625 1.40625h-4.21875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M21.796875 7.734375h-5.625a1.40625 1.40625 0 0 1 -1.40625 -1.40625v-5.625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), A2 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik0wLjcwMzEyNSAxNC43NjU2MjVhNy4wMzEyNSA3LjAzMTI1IDAgMSAwIDE0LjA2MjUgMCA3LjAzMTI1IDcuMDMxMjUgMCAxIDAgLTE0LjA2MjUgMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTQuOTIxODc1IDEzLjM1OTM3NWEyLjgxMjUgMi44MTI1IDAgMSAwIDUuNjI1IDAgMi44MTI1IDIuODEyNSAwIDEgMCAtNS42MjUgMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTEyLjMxNTkzNzUgMjAuMDk5MDYyNWE1LjEyMDYyNDk5OTk5OTk5OTUgNS4xMjA2MjQ5OTk5OTk5OTk1IDAgMCAwIC05LjE2MzEyNDk5OTk5OTk5OSAwIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik0zLjUxNTYyNSA0LjkyMTg3NXYtMi44MTI1YTEuNDA2MjUgMS40MDYyNSAwIDAgMSAxLjQwNjI1IC0xLjQwNjI1aDkuOTY0Njg3NWExLjQwNjI1IDEuNDA2MjUgMCAwIDEgMC45OTM3NSAwLjQxMTU2MjVsNS41MDUgNS41MDVhMS40MDYyNSAxLjQwNjI1IDAgMCAxIDAuNDExNTYyNSAwLjk5Mzc1VjIwLjM5MDYyNWExLjQwNjI1IDEuNDA2MjUgMCAwIDEgLTEuNDA2MjUgMS40MDYyNWgtNC4yMTg3NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMjEuNzk2ODc1IDcuNzM0Mzc1aC01LjYyNWExLjQwNjI1IDEuNDA2MjUgMCAwIDEgLTEuNDA2MjUgLTEuNDA2MjV2LTUuNjI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjwvc3ZnPg==", L2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: x2,
  default: A2
}, Symbol.toStringTag, { value: "Module" })), C2 = (e) => /* @__PURE__ */ c("svg", { id: "Single-Neutral--Streamline-Streamline--3.0", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", height: 24, width: 24, ...e }, /* @__PURE__ */ c("desc", null, "Single Neutral Streamline Icon: https://streamlinehq.com"), /* @__PURE__ */ c("defs", null), /* @__PURE__ */ c("title", null, "single-neutral"), /* @__PURE__ */ c("path", { d: "M6.75 6a5.25 5.25 0 1 0 10.5 0 5.25 5.25 0 1 0 -10.5 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.25 23.25a9.75 9.75 0 0 1 19.5 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), T2 = "data:image/svg+xml;base64,PHN2ZyBpZD0iU2luZ2xlLU5ldXRyYWwtLVN0cmVhbWxpbmUtU3RyZWFtbGluZS0tMy4wIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0Ij48ZGVzYz5TaW5nbGUgTmV1dHJhbCBTdHJlYW1saW5lIEljb246IGh0dHBzOi8vc3RyZWFtbGluZWhxLmNvbTwvZGVzYz48ZGVmcz48L2RlZnM+PHRpdGxlPnNpbmdsZS1uZXV0cmFsPC90aXRsZT48cGF0aCBkPSJNNi43NSA2YTUuMjUgNS4yNSAwIDEgMCAxMC41IDAgNS4yNSA1LjI1IDAgMSAwIC0xMC41IDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTIuMjUgMjMuMjVhOS43NSA5Ljc1IDAgMCAxIDE5LjUgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48L3N2Zz4=", k2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: C2,
  default: T2
}, Symbol.toStringTag, { value: "Module" })), z2 = (e) => /* @__PURE__ */ c("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", ...e }, /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M13.313 2.27521C13.1833 2.04051 12.9931 1.84486 12.7622 1.70861C12.5313 1.57235 12.2681 1.50049 12 1.50049C11.7318 1.50049 11.4686 1.57235 11.2377 1.70861C11.0068 1.84486 10.8166 2.04051 10.687 2.27521L0.936968 20.2752C0.810886 20.5036 0.746538 20.7609 0.750276 21.0217C0.754014 21.2825 0.825708 21.5379 0.958282 21.7625C1.09086 21.9872 1.27972 22.1734 1.50625 22.3028C1.73277 22.4321 1.98911 22.5002 2.24997 22.5002H21.75C22.0108 22.5002 22.2672 22.4321 22.4937 22.3028C22.7202 22.1734 22.9091 21.9872 23.0417 21.7625C23.1742 21.5379 23.2459 21.2825 23.2497 21.0217C23.2534 20.7609 23.189 20.5036 23.063 20.2752L13.313 2.27521Z" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M12 15V8.25" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeWidth: 1.5, d: "M12 18.75C11.7929 18.75 11.625 18.5821 11.625 18.375C11.625 18.1679 11.7929 18 12 18" }), /* @__PURE__ */ c("path", { stroke: "currentColor", strokeWidth: 1.5, d: "M12 18.75C12.2071 18.75 12.375 18.5821 12.375 18.375C12.375 18.1679 12.2071 18 12 18" })), E2 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiIGQ9Ik0xMy4zMTMgMi4yNzUyMUMxMy4xODMzIDIuMDQwNTEgMTIuOTkzMSAxLjg0NDg2IDEyLjc2MjIgMS43MDg2MUMxMi41MzEzIDEuNTcyMzUgMTIuMjY4MSAxLjUwMDQ5IDEyIDEuNTAwNDlDMTEuNzMxOCAxLjUwMDQ5IDExLjQ2ODYgMS41NzIzNSAxMS4yMzc3IDEuNzA4NjFDMTEuMDA2OCAxLjg0NDg2IDEwLjgxNjYgMi4wNDA1MSAxMC42ODcgMi4yNzUyMUwwLjkzNjk2OCAyMC4yNzUyQzAuODEwODg2IDIwLjUwMzYgMC43NDY1MzggMjAuNzYwOSAwLjc1MDI3NiAyMS4wMjE3QzAuNzU0MDE0IDIxLjI4MjUgMC44MjU3MDggMjEuNTM3OSAwLjk1ODI4MiAyMS43NjI1QzEuMDkwODYgMjEuOTg3MiAxLjI3OTcyIDIyLjE3MzQgMS41MDYyNSAyMi4zMDI4QzEuNzMyNzcgMjIuNDMyMSAxLjk4OTExIDIyLjUwMDIgMi4yNDk5NyAyMi41MDAySDIxLjc1QzIyLjAxMDggMjIuNTAwMiAyMi4yNjcyIDIyLjQzMjEgMjIuNDkzNyAyMi4zMDI4QzIyLjcyMDIgMjIuMTczNCAyMi45MDkxIDIxLjk4NzIgMjMuMDQxNyAyMS43NjI1QzIzLjE3NDIgMjEuNTM3OSAyMy4yNDU5IDIxLjI4MjUgMjMuMjQ5NyAyMS4wMjE3QzIzLjI1MzQgMjAuNzYwOSAyMy4xODkgMjAuNTAzNiAyMy4wNjMgMjAuMjc1MkwxMy4zMTMgMi4yNzUyMVoiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0iTTEyIDE1VjguMjUiPjwvcGF0aD48cGF0aCBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjUiIGQ9Ik0xMiAxOC43NUMxMS43OTI5IDE4Ljc1IDExLjYyNSAxOC41ODIxIDExLjYyNSAxOC4zNzVDMTEuNjI1IDE4LjE2NzkgMTEuNzkyOSAxOCAxMiAxOCI+PC9wYXRoPjxwYXRoIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0iTTEyIDE4Ljc1QzEyLjIwNzEgMTguNzUgMTIuMzc1IDE4LjU4MjEgMTIuMzc1IDE4LjM3NUMxMi4zNzUgMTguMTY3OSAxMi4yMDcxIDE4IDEyIDE4Ij48L3BhdGg+PC9zdmc+", P2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: z2,
  default: E2
}, Symbol.toStringTag, { value: "Module" })), Z2 = (e) => /* @__PURE__ */ c("svg", { viewBox: "-0.75 -0.75 24 24", xmlns: "http://www.w3.org/2000/svg", height: 24, width: 24, ...e }, /* @__PURE__ */ c("path", { d: "M10.546875 16.171875a5.625 5.625 0 1 0 11.25 0 5.625 5.625 0 1 0 -11.25 0Z", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m18.658125000000002 16.171875 -2.48625 0 0 -2.4853125", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M9.838125 21.703125a10.5478125 10.5478125 0 1 1 11.866875 -11.85375", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M8.7084375 21.4884375C7.2825 19.3959375 6.328125 15.593437499999999 6.328125 11.25S7.2825 3.105 8.7084375 1.0115625", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m0.7265625 10.546875 8.9278125 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M2.8115625 4.921875 19.6875 4.921875", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "m1.92 16.171875 5.814375 0", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }), /* @__PURE__ */ c("path", { d: "M13.7915625 1.0115625a15.9215625 15.9215625 0 0 1 2.15625 6.69", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 })), _2 = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItMC43NSAtMC43NSAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik0xMC41NDY4NzUgMTYuMTcxODc1YTUuNjI1IDUuNjI1IDAgMSAwIDExLjI1IDAgNS42MjUgNS42MjUgMCAxIDAgLTExLjI1IDBaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Im0xOC42NTgxMjUwMDAwMDAwMDIgMTYuMTcxODc1IC0yLjQ4NjI1IDAgMCAtMi40ODUzMTI1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PC9wYXRoPjxwYXRoIGQ9Ik05LjgzODEyNSAyMS43MDMxMjVhMTAuNTQ3ODEyNSAxMC41NDc4MTI1IDAgMSAxIDExLjg2Njg3NSAtMTEuODUzNzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTguNzA4NDM3NSAyMS40ODg0Mzc1QzcuMjgyNSAxOS4zOTU5Mzc1IDYuMzI4MTI1IDE1LjU5MzQzNzQ5OTk5OTk5OSA2LjMyODEyNSAxMS4yNVM3LjI4MjUgMy4xMDUgOC43MDg0Mzc1IDEuMDExNTYyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJtMC43MjY1NjI1IDEwLjU0Njg3NSA4LjkyNzgxMjUgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD48cGF0aCBkPSJNMi44MTE1NjI1IDQuOTIxODc1IDE5LjY4NzUgNC45MjE4NzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0ibTEuOTIgMTYuMTcxODc1IDUuODE0Mzc1IDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTEzLjc5MTU2MjUgMS4wMTE1NjI1YTE1LjkyMTU2MjUgMTUuOTIxNTYyNSAwIDAgMSAyLjE1NjI1IDYuNjkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PC9zdmc+", O2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReactComponent: Z2,
  default: _2
}, Symbol.toStringTag, { value: "Module" })), W2 = /* @__PURE__ */ Object.assign({ "../../assets/icons/add.svg": n0, "../../assets/icons/ai-tagging-spark.svg": i0, "../../assets/icons/align-center.svg": c0, "../../assets/icons/align-left.svg": d0, "../../assets/icons/angle-brackets.svg": I0, "../../assets/icons/arrow-bottom-left.svg": f0, "../../assets/icons/arrow-bottom-right.svg": j0, "../../assets/icons/arrow-down.svg": v0, "../../assets/icons/arrow-left.svg": S0, "../../assets/icons/arrow-right.svg": L0, "../../assets/icons/arrow-top-left.svg": k0, "../../assets/icons/arrow-top-right.svg": P0, "../../assets/icons/arrow-up.svg": O0, "../../assets/icons/at-sign.svg": R0, "../../assets/icons/baseline-chart.svg": Y0, "../../assets/icons/bell.svg": J0, "../../assets/icons/bills.svg": F0, "../../assets/icons/book-open.svg": K0, "../../assets/icons/brackets.svg": ng, "../../assets/icons/card-list.svg": ig, "../../assets/icons/cardview.svg": cg, "../../assets/icons/check-circle.svg": dg, "../../assets/icons/check.svg": Ig, "../../assets/icons/chevron-down.svg": fg, "../../assets/icons/chevron-left.svg": jg, "../../assets/icons/chevron-right.svg": vg, "../../assets/icons/chevron-up.svg": Sg, "../../assets/icons/close.svg": Lg, "../../assets/icons/column-layout.svg": kg, "../../assets/icons/comment-fill.svg": Pg, "../../assets/icons/comment.svg": Og, "../../assets/icons/crown.svg": Rg, "../../assets/icons/discount.svg": Yg, "../../assets/icons/dotdotdot.svg": Jg, "../../assets/icons/download.svg": Fg, "../../assets/icons/duplicate.svg": Kg, "../../assets/icons/ellipsis.svg": nM, "../../assets/icons/email-check.svg": iM, "../../assets/icons/email.svg": cM, "../../assets/icons/emailfield.svg": dM, "../../assets/icons/error-fill.svg": IM, "../../assets/icons/export.svg": fM, "../../assets/icons/eyedropper.svg": jM, "../../assets/icons/facebook.svg": vM, "../../assets/icons/finger-up.svg": SM, "../../assets/icons/hamburger.svg": LM, "../../assets/icons/heart-fill.svg": kM, "../../assets/icons/heart.svg": PM, "../../assets/icons/home.svg": OM, "../../assets/icons/hyperlink-circle.svg": RM, "../../assets/icons/import.svg": YM, "../../assets/icons/info-fill.svg": JM, "../../assets/icons/integration.svg": FM, "../../assets/icons/key.svg": KM, "../../assets/icons/labs-flask.svg": n1, "../../assets/icons/language.svg": i1, "../../assets/icons/laptop.svg": c1, "../../assets/icons/layer.svg": d1, "../../assets/icons/layout-2-col.svg": I1, "../../assets/icons/layout-headline.svg": f1, "../../assets/icons/layout-module-1.svg": j1, "../../assets/icons/like.svg": v1, "../../assets/icons/link-broken.svg": S1, "../../assets/icons/linkedin.svg": L1, "../../assets/icons/listview.svg": k1, "../../assets/icons/lock-locked.svg": P1, "../../assets/icons/lock-unlocked.svg": O1, "../../assets/icons/magnifying-glass.svg": R1, "../../assets/icons/mail-block.svg": Y1, "../../assets/icons/megaphone.svg": J1, "../../assets/icons/mobile.svg": F1, "../../assets/icons/modules-3.svg": K1, "../../assets/icons/money-bags.svg": nI, "../../assets/icons/navigation.svg": iI, "../../assets/icons/palette.svg": cI, "../../assets/icons/pen.svg": dI, "../../assets/icons/picture.svg": II, "../../assets/icons/piggybank.svg": fI, "../../assets/icons/play-fill.svg": jI, "../../assets/icons/portal.svg": vI, "../../assets/icons/question-circle.svg": SI, "../../assets/icons/recepients.svg": LI, "../../assets/icons/reload.svg": kI, "../../assets/icons/share.svg": PI, "../../assets/icons/single-user-block.svg": OI, "../../assets/icons/single-user-fill.svg": RI, "../../assets/icons/success-fill.svg": YI, "../../assets/icons/tags-block.svg": JI, "../../assets/icons/tags-check.svg": FI, "../../assets/icons/textfield.svg": KI, "../../assets/icons/thumbs-down.svg": n2, "../../assets/icons/thumbs-up.svg": i2, "../../assets/icons/time-back.svg": c2, "../../assets/icons/trash.svg": d2, "../../assets/icons/twitter-x.svg": I2, "../../assets/icons/unsplash-logo.svg": f2, "../../assets/icons/upload.svg": j2, "../../assets/icons/user-add.svg": v2, "../../assets/icons/user-fill.svg": S2, "../../assets/icons/user-page.svg": L2, "../../assets/icons/user.svg": k2, "../../assets/icons/warning.svg": P2, "../../assets/icons/world-clock.svg": O2 }), Ei = ({ name: e, size: t = "md", colorClass: n = "", className: r = "" }) => {
  const { ReactComponent: o } = W2[`../../assets/icons/${e}.svg`];
  let i = "", s = {};
  if (typeof t == "number" && (s = {
    width: `${t}px`,
    height: `${t}px`
  }), !i)
    switch (t) {
      case "custom":
        break;
      case "2xs":
        i = "w-2 h-2";
        break;
      case "xs":
        i = "w-3 h-3";
        break;
      case "sm":
        i = "w-4 h-4";
        break;
      case "lg":
        i = "w-8 h-8";
        break;
      case "xl":
        i = "w-10 h-10";
        break;
      default:
        i = "w-5 h-5";
        break;
    }
  return i = zo(
    i,
    n
  ), o ? /* @__PURE__ */ M.jsx(o, { className: `pointer-events-none ${i} ${r}`, style: s }) : null;
};
function U2(e, t) {
  typeof e == "function" ? e(t) : e != null && (e.current = t);
}
function tr(...e) {
  return (t) => e.forEach((n) => U2(n, t));
}
function K(...e) {
  return L(tr(...e), e);
}
var ce = y((e, t) => {
  const { children: n, ...r } = e, o = we.toArray(n), i = o.find(R2);
  if (i) {
    const s = i.props.children, a = o.map((l) => l === i ? we.count(s) > 1 ? we.only(null) : Tt(s) ? s.props.children : null : l);
    return /* @__PURE__ */ M.jsx(Kr, { ...r, ref: t, children: Tt(s) ? It(s, void 0, a) : null });
  }
  return /* @__PURE__ */ M.jsx(Kr, { ...r, ref: t, children: n });
});
ce.displayName = "Slot";
var Kr = y((e, t) => {
  const { children: n, ...r } = e;
  if (Tt(n)) {
    const o = G2(n);
    return It(n, {
      ...H2(r, n.props),
      // @ts-ignore
      ref: t ? tr(t, o) : o
    });
  }
  return we.count(n) > 1 ? we.only(null) : null;
});
Kr.displayName = "SlotClone";
var ta = ({ children: e }) => /* @__PURE__ */ M.jsx(M.Fragment, { children: e });
function R2(e) {
  return Tt(e) && e.type === ta;
}
function H2(e, t) {
  const n = { ...t };
  for (const r in t) {
    const o = e[r], i = t[r];
    /^on[A-Z]/.test(r) ? o && i ? n[r] = (...a) => {
      i(...a), o(...a);
    } : o && (n[r] = o) : r === "style" ? n[r] = { ...o, ...i } : r === "className" && (n[r] = [o, i].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function G2(e) {
  var r, o;
  let t = (r = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : r.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = (o = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : o.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
function na(e) {
  var t, n, r = "";
  if (typeof e == "string" || typeof e == "number")
    r += e;
  else if (typeof e == "object")
    if (Array.isArray(e))
      for (t = 0; t < e.length; t++)
        e[t] && (n = na(e[t])) && (r && (r += " "), r += n);
    else
      for (t in e)
        e[t] && (r && (r += " "), r += t);
  return r;
}
function Y2() {
  for (var e, t, n = 0, r = ""; n < arguments.length; )
    (e = arguments[n++]) && (t = na(e)) && (r && (r += " "), r += t);
  return r;
}
const Pi = (e) => typeof e == "boolean" ? "".concat(e) : e === 0 ? "0" : e, Zi = Y2, nr = (e, t) => (n) => {
  var r;
  if ((t == null ? void 0 : t.variants) == null)
    return Zi(e, n == null ? void 0 : n.class, n == null ? void 0 : n.className);
  const { variants: o, defaultVariants: i } = t, s = Object.keys(o).map((u) => {
    const d = n == null ? void 0 : n[u], g = i == null ? void 0 : i[u];
    if (d === null)
      return null;
    const I = Pi(d) || Pi(g);
    return o[u][I];
  }), a = n && Object.entries(n).reduce((u, d) => {
    let [g, I] = d;
    return I === void 0 || (u[g] = I), u;
  }, {}), l = t == null || (r = t.compoundVariants) === null || r === void 0 ? void 0 : r.reduce((u, d) => {
    let { class: g, className: I, ...m } = d;
    return Object.entries(m).every((p) => {
      let [f, b] = p;
      return Array.isArray(b) ? b.includes({
        ...i,
        ...a
      }[f]) : {
        ...i,
        ...a
      }[f] === b;
    }) ? [
      ...u,
      g,
      I
    ] : u;
  }, []);
  return Zi(e, s, l, n == null ? void 0 : n.class, n == null ? void 0 : n.className);
}, Eo = "-", B2 = (e) => {
  const t = J2(e), {
    conflictingClassGroups: n,
    conflictingClassGroupModifiers: r
  } = e;
  return {
    getClassGroupId: (s) => {
      const a = s.split(Eo);
      return a[0] === "" && a.length !== 1 && a.shift(), ra(a, t) || Q2(s);
    },
    getConflictingClassGroupIds: (s, a) => {
      const l = n[s] || [];
      return a && r[s] ? [...l, ...r[s]] : l;
    }
  };
}, ra = (e, t) => {
  var s;
  if (e.length === 0)
    return t.classGroupId;
  const n = e[0], r = t.nextPart.get(n), o = r ? ra(e.slice(1), r) : void 0;
  if (o)
    return o;
  if (t.validators.length === 0)
    return;
  const i = e.join(Eo);
  return (s = t.validators.find(({
    validator: a
  }) => a(i))) == null ? void 0 : s.classGroupId;
}, _i = /^\[(.+)\]$/, Q2 = (e) => {
  if (_i.test(e)) {
    const t = _i.exec(e)[1], n = t == null ? void 0 : t.substring(0, t.indexOf(":"));
    if (n)
      return "arbitrary.." + n;
  }
}, J2 = (e) => {
  const {
    theme: t,
    prefix: n
  } = e, r = {
    nextPart: /* @__PURE__ */ new Map(),
    validators: []
  };
  return X2(Object.entries(e.classGroups), n).forEach(([i, s]) => {
    eo(s, r, i, t);
  }), r;
}, eo = (e, t, n, r) => {
  e.forEach((o) => {
    if (typeof o == "string") {
      const i = o === "" ? t : Oi(t, o);
      i.classGroupId = n;
      return;
    }
    if (typeof o == "function") {
      if (V2(o)) {
        eo(o(r), t, n, r);
        return;
      }
      t.validators.push({
        validator: o,
        classGroupId: n
      });
      return;
    }
    Object.entries(o).forEach(([i, s]) => {
      eo(s, Oi(t, i), n, r);
    });
  });
}, Oi = (e, t) => {
  let n = e;
  return t.split(Eo).forEach((r) => {
    n.nextPart.has(r) || n.nextPart.set(r, {
      nextPart: /* @__PURE__ */ new Map(),
      validators: []
    }), n = n.nextPart.get(r);
  }), n;
}, V2 = (e) => e.isThemeGetter, X2 = (e, t) => t ? e.map(([n, r]) => {
  const o = r.map((i) => typeof i == "string" ? t + i : typeof i == "object" ? Object.fromEntries(Object.entries(i).map(([s, a]) => [t + s, a])) : i);
  return [n, o];
}) : e, F2 = (e) => {
  if (e < 1)
    return {
      get: () => {
      },
      set: () => {
      }
    };
  let t = 0, n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  const o = (i, s) => {
    n.set(i, s), t++, t > e && (t = 0, r = n, n = /* @__PURE__ */ new Map());
  };
  return {
    get(i) {
      let s = n.get(i);
      if (s !== void 0)
        return s;
      if ((s = r.get(i)) !== void 0)
        return o(i, s), s;
    },
    set(i, s) {
      n.has(i) ? n.set(i, s) : o(i, s);
    }
  };
}, oa = "!", $2 = (e) => {
  const {
    separator: t,
    experimentalParseClassName: n
  } = e, r = t.length === 1, o = t[0], i = t.length, s = (a) => {
    const l = [];
    let u = 0, d = 0, g;
    for (let b = 0; b < a.length; b++) {
      let N = a[b];
      if (u === 0) {
        if (N === o && (r || a.slice(b, b + i) === t)) {
          l.push(a.slice(d, b)), d = b + i;
          continue;
        }
        if (N === "/") {
          g = b;
          continue;
        }
      }
      N === "[" ? u++ : N === "]" && u--;
    }
    const I = l.length === 0 ? a : a.substring(d), m = I.startsWith(oa), p = m ? I.substring(1) : I, f = g && g > d ? g - d : void 0;
    return {
      modifiers: l,
      hasImportantModifier: m,
      baseClassName: p,
      maybePostfixModifierPosition: f
    };
  };
  return n ? (a) => n({
    className: a,
    parseClassName: s
  }) : s;
}, q2 = (e) => {
  if (e.length <= 1)
    return e;
  const t = [];
  let n = [];
  return e.forEach((r) => {
    r[0] === "[" ? (t.push(...n.sort(), r), n = []) : n.push(r);
  }), t.push(...n.sort()), t;
}, K2 = (e) => ({
  cache: F2(e.cacheSize),
  parseClassName: $2(e),
  ...B2(e)
}), em = /\s+/, tm = (e, t) => {
  const {
    parseClassName: n,
    getClassGroupId: r,
    getConflictingClassGroupIds: o
  } = t, i = [], s = e.trim().split(em);
  let a = "";
  for (let l = s.length - 1; l >= 0; l -= 1) {
    const u = s[l], {
      modifiers: d,
      hasImportantModifier: g,
      baseClassName: I,
      maybePostfixModifierPosition: m
    } = n(u);
    let p = !!m, f = r(p ? I.substring(0, m) : I);
    if (!f) {
      if (!p) {
        a = u + (a.length > 0 ? " " + a : a);
        continue;
      }
      if (f = r(I), !f) {
        a = u + (a.length > 0 ? " " + a : a);
        continue;
      }
      p = !1;
    }
    const b = q2(d).join(":"), N = g ? b + oa : b, j = N + f;
    if (i.includes(j))
      continue;
    i.push(j);
    const h = o(f, p);
    for (let v = 0; v < h.length; ++v) {
      const w = h[v];
      i.push(N + w);
    }
    a = u + (a.length > 0 ? " " + a : a);
  }
  return a;
};
function nm() {
  let e = 0, t, n, r = "";
  for (; e < arguments.length; )
    (t = arguments[e++]) && (n = ia(t)) && (r && (r += " "), r += n);
  return r;
}
const ia = (e) => {
  if (typeof e == "string")
    return e;
  let t, n = "";
  for (let r = 0; r < e.length; r++)
    e[r] && (t = ia(e[r])) && (n && (n += " "), n += t);
  return n;
};
function rm(e, ...t) {
  let n, r, o, i = s;
  function s(l) {
    const u = t.reduce((d, g) => g(d), e());
    return n = K2(u), r = n.cache.get, o = n.cache.set, i = a, a(l);
  }
  function a(l) {
    const u = r(l);
    if (u)
      return u;
    const d = tm(l, n);
    return o(l, d), d;
  }
  return function() {
    return i(nm.apply(null, arguments));
  };
}
const F = (e) => {
  const t = (n) => n[e] || [];
  return t.isThemeGetter = !0, t;
}, sa = /^\[(?:([a-z-]+):)?(.+)\]$/i, om = /^\d+\/\d+$/, im = /* @__PURE__ */ new Set(["px", "full", "screen"]), sm = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, am = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, cm = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/, lm = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, um = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, Pe = (e) => St(e) || im.has(e) || om.test(e), Be = (e) => Pt(e, "length", bm), St = (e) => !!e && !Number.isNaN(Number(e)), Or = (e) => Pt(e, "number", St), Qt = (e) => !!e && Number.isInteger(Number(e)), dm = (e) => e.endsWith("%") && St(e.slice(0, -1)), _ = (e) => sa.test(e), Qe = (e) => sm.test(e), gm = /* @__PURE__ */ new Set(["length", "size", "percentage"]), Mm = (e) => Pt(e, gm, aa), Im = (e) => Pt(e, "position", aa), mm = /* @__PURE__ */ new Set(["image", "url"]), pm = (e) => Pt(e, mm, jm), fm = (e) => Pt(e, "", Nm), Jt = () => !0, Pt = (e, t, n) => {
  const r = sa.exec(e);
  return r ? r[1] ? typeof t == "string" ? r[1] === t : t.has(r[1]) : n(r[2]) : !1;
}, bm = (e) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  am.test(e) && !cm.test(e)
), aa = () => !1, Nm = (e) => lm.test(e), jm = (e) => um.test(e), ym = () => {
  const e = F("colors"), t = F("spacing"), n = F("blur"), r = F("brightness"), o = F("borderColor"), i = F("borderRadius"), s = F("borderSpacing"), a = F("borderWidth"), l = F("contrast"), u = F("grayscale"), d = F("hueRotate"), g = F("invert"), I = F("gap"), m = F("gradientColorStops"), p = F("gradientColorStopPositions"), f = F("inset"), b = F("margin"), N = F("opacity"), j = F("padding"), h = F("saturate"), v = F("scale"), w = F("sepia"), S = F("skew"), D = F("space"), x = F("translate"), P = () => ["auto", "contain", "none"], U = () => ["auto", "hidden", "clip", "visible", "scroll"], W = () => ["auto", _, t], E = () => [_, t], R = () => ["", Pe, Be], G = () => ["auto", St, _], ee = () => ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"], Z = () => ["solid", "dashed", "dotted", "double", "none"], ae = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], $ = () => ["start", "end", "center", "between", "around", "evenly", "stretch"], k = () => ["", "0", _], ie = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], X = () => [St, _];
  return {
    cacheSize: 500,
    separator: ":",
    theme: {
      colors: [Jt],
      spacing: [Pe, Be],
      blur: ["none", "", Qe, _],
      brightness: X(),
      borderColor: [e],
      borderRadius: ["none", "", "full", Qe, _],
      borderSpacing: E(),
      borderWidth: R(),
      contrast: X(),
      grayscale: k(),
      hueRotate: X(),
      invert: k(),
      gap: E(),
      gradientColorStops: [e],
      gradientColorStopPositions: [dm, Be],
      inset: W(),
      margin: W(),
      opacity: X(),
      padding: E(),
      saturate: X(),
      scale: X(),
      sepia: k(),
      skew: X(),
      space: E(),
      translate: E()
    },
    classGroups: {
      // Layout
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", "video", _]
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
        columns: [Qe]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": ie()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": ie()
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
        object: [...ee(), _]
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: U()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": U()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": U()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: P()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": P()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": P()
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
        inset: [f]
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": [f]
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": [f]
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: [f]
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: [f]
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: [f]
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: [f]
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: [f]
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: [f]
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
        z: ["auto", Qt, _]
      }],
      // Flexbox and Grid
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: W()
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
        flex: ["1", "auto", "initial", "none", _]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: k()
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: k()
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: ["first", "last", "none", Qt, _]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": [Jt]
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: ["auto", {
          span: ["full", Qt, _]
        }, _]
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": G()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": G()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": [Jt]
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: ["auto", {
          span: [Qt, _]
        }, _]
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": G()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": G()
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
        "auto-cols": ["auto", "min", "max", "fr", _]
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": ["auto", "min", "max", "fr", _]
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: [I]
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": [I]
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": [I]
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: ["normal", ...$()]
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
        content: ["normal", ...$(), "baseline"]
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
        "place-content": [...$(), "baseline"]
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
        p: [j]
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: [j]
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: [j]
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: [j]
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: [j]
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: [j]
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: [j]
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: [j]
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: [j]
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: [b]
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: [b]
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: [b]
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: [b]
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: [b]
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: [b]
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: [b]
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: [b]
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: [b]
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/space
       */
      "space-x": [{
        "space-x": [D]
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
        "space-y": [D]
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
        w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", _, t]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [_, t, "min", "max", "fit"]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [_, t, "none", "full", "min", "max", "fit", "prose", {
          screen: [Qe]
        }, Qe]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: [_, t, "auto", "min", "max", "fit", "svh", "lvh", "dvh"]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": [_, t, "min", "max", "fit", "svh", "lvh", "dvh"]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": [_, t, "min", "max", "fit", "svh", "lvh", "dvh"]
      }],
      /**
       * Size
       * @see https://tailwindcss.com/docs/size
       */
      size: [{
        size: [_, t, "auto", "min", "max", "fit"]
      }],
      // Typography
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", Qe, Be]
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
        font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black", Or]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [Jt]
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
        tracking: ["tighter", "tight", "normal", "wide", "wider", "widest", _]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": ["none", St, Or]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: ["none", "tight", "snug", "normal", "relaxed", "loose", Pe, _]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", _]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["none", "disc", "decimal", _]
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
        "placeholder-opacity": [N]
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
        "text-opacity": [N]
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
        decoration: [...Z(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: ["auto", "from-font", Pe, Be]
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": ["auto", Pe, _]
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
        indent: E()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", _]
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
        content: ["none", _]
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
        "bg-opacity": [N]
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
        bg: [...ee(), Im]
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
        bg: ["auto", "cover", "contain", Mm]
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
        }, pm]
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
        from: [p]
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: [p]
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: [p]
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: [m]
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: [m]
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: [m]
      }],
      // Borders
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: [i]
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": [i]
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": [i]
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": [i]
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": [i]
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": [i]
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": [i]
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": [i]
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": [i]
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": [i]
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": [i]
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": [i]
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": [i]
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": [i]
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": [i]
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
        "border-opacity": [N]
      }],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...Z(), "hidden"]
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
        "divide-opacity": [N]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/divide-style
       */
      "divide-style": [{
        divide: Z()
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
        outline: ["", ...Z()]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [Pe, _]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: [Pe, Be]
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
        ring: R()
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
        "ring-opacity": [N]
      }],
      /**
       * Ring Offset Width
       * @see https://tailwindcss.com/docs/ring-offset-width
       */
      "ring-offset-w": [{
        "ring-offset": [Pe, Be]
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
        shadow: ["", "inner", "none", Qe, fm]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow-color
       */
      "shadow-color": [{
        shadow: [Jt]
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [N]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...ae(), "plus-lighter", "plus-darker"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": ae()
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
        contrast: [l]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": ["", "none", Qe, _]
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
        "hue-rotate": [d]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: [g]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [h]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: [w]
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
        "backdrop-contrast": [l]
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
        "backdrop-hue-rotate": [d]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": [g]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [N]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [h]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": [w]
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
        "border-spacing": [s]
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": [s]
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": [s]
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
        transition: ["none", "all", "", "colors", "opacity", "shadow", "transform", _]
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
        ease: ["linear", "in", "out", "in-out", _]
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
        animate: ["none", "spin", "ping", "pulse", "bounce", _]
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
        scale: [v]
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": [v]
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": [v]
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: [Qt, _]
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": [x]
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": [x]
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": [S]
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": [S]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: ["center", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left", _]
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
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", _]
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
        "scroll-m": E()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": E()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": E()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": E()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": E()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": E()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": E()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": E()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": E()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": E()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": E()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": E()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": E()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": E()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": E()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": E()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": E()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": E()
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
        "will-change": ["auto", "scroll", "contents", "transform", _]
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
        stroke: [Pe, Be, Or]
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
}, hm = /* @__PURE__ */ rm(ym);
function T(...e) {
  return hm(zo(e));
}
const vm = nr(
  "",
  {
    variants: {
      size: {
        pagetitle: "scroll-m-20 text-2xl font-bold tracking-tighter lg:text-3xl",
        1: "scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl",
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
), ca = y(
  ({ className: e, size: t = "pagetitle", asChild: n = !1, ...r }, o) => {
    const i = n ? ce : t === "pagetitle" ? "h1" : `h${t}`;
    return /* @__PURE__ */ M.jsx(
      i,
      {
        ref: o,
        className: T(vm({ size: t, className: e })),
        ...r
      }
    );
  }
);
ca.displayName = "Heading";
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wm = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), la = (...e) => e.filter((t, n, r) => !!t && t.trim() !== "" && r.indexOf(t) === n).join(" ").trim();
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var Dm = {
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
const Sm = y(
  ({
    color: e = "currentColor",
    size: t = 24,
    strokeWidth: n = 2,
    absoluteStrokeWidth: r,
    className: o = "",
    children: i,
    iconNode: s,
    ...a
  }, l) => c(
    "svg",
    {
      ref: l,
      ...Dm,
      width: t,
      height: t,
      stroke: e,
      strokeWidth: r ? Number(n) * 24 / Number(t) : n,
      className: la("lucide", o),
      ...a
    },
    [
      ...s.map(([u, d]) => c(u, d)),
      ...Array.isArray(i) ? i : [i]
    ]
  )
);
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rn = (e, t) => {
  const n = y(
    ({ className: r, ...o }, i) => c(Sm, {
      ref: i,
      iconNode: t,
      className: la(`lucide-${wm(e)}`, r),
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
const xm = rn("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ua = rn("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Am = rn("Circle", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
]);
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Lm = rn("PanelLeft", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M9 3v18", key: "fh3hqa" }]
]);
/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Cm = rn("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]), da = y(({ ...e }, t) => /* @__PURE__ */ M.jsx("nav", { ref: t, "aria-label": "breadcrumb", ...e }));
da.displayName = "Breadcrumb";
const ga = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "ol",
  {
    ref: n,
    className: T(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-neutral-500 sm:gap-2.5 dark:text-neutral-400",
      e
    ),
    ...t
  }
));
ga.displayName = "BreadcrumbList";
const Ma = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "li",
  {
    ref: n,
    className: T("inline-flex items-center gap-1.5", e),
    ...t
  }
));
Ma.displayName = "BreadcrumbItem";
const Ia = y(({ asChild: e, className: t, ...n }, r) => {
  const o = e ? ce : "a";
  return /* @__PURE__ */ M.jsx(
    o,
    {
      ref: r,
      className: T("transition-colors hover:text-neutral-950 dark:hover:text-neutral-50", t),
      ...n
    }
  );
});
Ia.displayName = "BreadcrumbLink";
const ma = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "span",
  {
    ref: n,
    "aria-current": "page",
    "aria-disabled": "true",
    className: T("font-normal text-neutral-950 dark:text-neutral-50", e),
    role: "link",
    ...t
  }
));
ma.displayName = "BreadcrumbPage";
const pa = ({
  children: e,
  className: t,
  ...n
}) => /* @__PURE__ */ M.jsx(
  "li",
  {
    "aria-hidden": "true",
    className: T("[&>svg]:w-3.5 [&>svg]:h-3.5", t),
    role: "presentation",
    ...n,
    children: e ?? /* @__PURE__ */ M.jsx(ua, {})
  }
);
pa.displayName = "BreadcrumbSeparator";
const Tm = nr(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/90",
        destructive: "dark:bg-red-900 dark:hover:bg-red-900/90 bg-red-500 text-neutral-50 hover:bg-red-500/90 dark:text-neutral-50",
        outline: "border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-neutral-50",
        secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800/80",
        ghost: "hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50",
        link: "text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-50"
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
), On = y(
  ({ className: e, variant: t, size: n, asChild: r = !1, ...o }, i) => {
    const s = r ? ce : "button";
    return /* @__PURE__ */ M.jsx(
      s,
      {
        ref: i,
        className: T(Tm({ variant: t, size: n, className: e })),
        ...o
      }
    );
  }
);
On.displayName = "Button";
function z(e, t, { checkForDefaultPrevented: n = !0 } = {}) {
  return function(o) {
    if (e == null || e(o), n === !1 || !o.defaultPrevented)
      return t == null ? void 0 : t(o);
  };
}
function km(e, t = []) {
  let n = [];
  function r(i, s) {
    const a = q(s), l = n.length;
    n = [...n, s];
    const u = (g) => {
      var N;
      const { scope: I, children: m, ...p } = g, f = ((N = I == null ? void 0 : I[e]) == null ? void 0 : N[l]) || a, b = H(() => p, Object.values(p));
      return /* @__PURE__ */ M.jsx(f.Provider, { value: b, children: m });
    };
    u.displayName = i + "Provider";
    function d(g, I) {
      var f;
      const m = ((f = I == null ? void 0 : I[e]) == null ? void 0 : f[l]) || a, p = re(m);
      if (p)
        return p;
      if (s !== void 0)
        return s;
      throw new Error(`\`${g}\` must be used within \`${i}\``);
    }
    return [u, d];
  }
  const o = () => {
    const i = n.map((s) => q(s));
    return function(a) {
      const l = (a == null ? void 0 : a[e]) || i;
      return H(
        () => ({ [`__scope${e}`]: { ...a, [e]: l } }),
        [a, l]
      );
    };
  };
  return o.scopeName = e, [r, zm(o, ...t)];
}
function zm(...e) {
  const t = e[0];
  if (e.length === 1)
    return t;
  const n = () => {
    const r = e.map((o) => ({
      useScope: o(),
      scopeName: o.scopeName
    }));
    return function(i) {
      const s = r.reduce((a, { useScope: l, scopeName: u }) => {
        const g = l(i)[`__scope${u}`];
        return { ...a, ...g };
      }, {});
      return H(() => ({ [`__scope${t.scopeName}`]: s }), [s]);
    };
  };
  return n.scopeName = t.scopeName, n;
}
function Ae(e) {
  const t = A(e);
  return C(() => {
    t.current = e;
  }), H(() => (...n) => {
    var r;
    return (r = t.current) == null ? void 0 : r.call(t, ...n);
  }, []);
}
function on({
  prop: e,
  defaultProp: t,
  onChange: n = () => {
  }
}) {
  const [r, o] = Em({ defaultProp: t, onChange: n }), i = e !== void 0, s = i ? e : r, a = Ae(n), l = L(
    (u) => {
      if (i) {
        const g = typeof u == "function" ? u(e) : u;
        g !== e && a(g);
      } else
        o(u);
    },
    [i, e, o, a]
  );
  return [s, l];
}
function Em({
  defaultProp: e,
  onChange: t
}) {
  const n = O(e), [r] = n, o = A(r), i = Ae(t);
  return C(() => {
    o.current !== r && (i(r), o.current = r);
  }, [r, o, i]), n;
}
ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
ReactDOM.createPortal;
ReactDOM.createRoot;
const Pm = ReactDOM;
ReactDOM.findDOMNode;
const fa = ReactDOM.flushSync;
ReactDOM.hydrate;
ReactDOM.hydrateRoot;
ReactDOM.render;
ReactDOM.unmountComponentAtNode;
ReactDOM.unstable_batchedUpdates;
ReactDOM.unstable_renderSubtreeIntoContainer;
ReactDOM.version;
var Zm = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "span",
  "svg",
  "ul"
], V = Zm.reduce((e, t) => {
  const n = y((r, o) => {
    const { asChild: i, ...s } = r, a = i ? ce : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ M.jsx(a, { ...s, ref: o });
  });
  return n.displayName = `Primitive.${t}`, { ...e, [t]: n };
}, {});
function ba(e, t) {
  e && fa(() => e.dispatchEvent(t));
}
function _m(e, t = []) {
  let n = [];
  function r(i, s) {
    const a = q(s), l = n.length;
    n = [...n, s];
    function u(g) {
      const { scope: I, children: m, ...p } = g, f = (I == null ? void 0 : I[e][l]) || a, b = H(() => p, Object.values(p));
      return /* @__PURE__ */ M.jsx(f.Provider, { value: b, children: m });
    }
    function d(g, I) {
      const m = (I == null ? void 0 : I[e][l]) || a, p = re(m);
      if (p)
        return p;
      if (s !== void 0)
        return s;
      throw new Error(`\`${g}\` must be used within \`${i}\``);
    }
    return u.displayName = i + "Provider", [u, d];
  }
  const o = () => {
    const i = n.map((s) => q(s));
    return function(a) {
      const l = (a == null ? void 0 : a[e]) || i;
      return H(
        () => ({ [`__scope${e}`]: { ...a, [e]: l } }),
        [a, l]
      );
    };
  };
  return o.scopeName = e, [r, Om(o, ...t)];
}
function Om(...e) {
  const t = e[0];
  if (e.length === 1)
    return t;
  const n = () => {
    const r = e.map((o) => ({
      useScope: o(),
      scopeName: o.scopeName
    }));
    return function(i) {
      const s = r.reduce((a, { useScope: l, scopeName: u }) => {
        const g = l(i)[`__scope${u}`];
        return { ...a, ...g };
      }, {});
      return H(() => ({ [`__scope${t.scopeName}`]: s }), [s]);
    };
  };
  return n.scopeName = t.scopeName, n;
}
function Wm(e) {
  const t = e + "CollectionProvider", [n, r] = _m(t), [o, i] = n(
    t,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), s = (m) => {
    const { scope: p, children: f } = m, b = Y.useRef(null), N = Y.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ M.jsx(o, { scope: p, itemMap: N, collectionRef: b, children: f });
  };
  s.displayName = t;
  const a = e + "CollectionSlot", l = Y.forwardRef(
    (m, p) => {
      const { scope: f, children: b } = m, N = i(a, f), j = K(p, N.collectionRef);
      return /* @__PURE__ */ M.jsx(ce, { ref: j, children: b });
    }
  );
  l.displayName = a;
  const u = e + "CollectionItemSlot", d = "data-radix-collection-item", g = Y.forwardRef(
    (m, p) => {
      const { scope: f, children: b, ...N } = m, j = Y.useRef(null), h = K(p, j), v = i(u, f);
      return Y.useEffect(() => (v.itemMap.set(j, { ref: j, ...N }), () => void v.itemMap.delete(j))), /* @__PURE__ */ M.jsx(ce, { [d]: "", ref: h, children: b });
    }
  );
  g.displayName = u;
  function I(m) {
    const p = i(e + "CollectionConsumer", m);
    return Y.useCallback(() => {
      const b = p.collectionRef.current;
      if (!b)
        return [];
      const N = Array.from(b.querySelectorAll(`[${d}]`));
      return Array.from(p.itemMap.values()).sort(
        (v, w) => N.indexOf(v.ref.current) - N.indexOf(w.ref.current)
      );
    }, [p.collectionRef, p.itemMap]);
  }
  return [
    { Provider: s, Slot: l, ItemSlot: g },
    I,
    r
  ];
}
function Um(e, t = []) {
  let n = [];
  function r(i, s) {
    const a = q(s), l = n.length;
    n = [...n, s];
    const u = (g) => {
      var N;
      const { scope: I, children: m, ...p } = g, f = ((N = I == null ? void 0 : I[e]) == null ? void 0 : N[l]) || a, b = H(() => p, Object.values(p));
      return /* @__PURE__ */ M.jsx(f.Provider, { value: b, children: m });
    };
    u.displayName = i + "Provider";
    function d(g, I) {
      var f;
      const m = ((f = I == null ? void 0 : I[e]) == null ? void 0 : f[l]) || a, p = re(m);
      if (p)
        return p;
      if (s !== void 0)
        return s;
      throw new Error(`\`${g}\` must be used within \`${i}\``);
    }
    return [u, d];
  }
  const o = () => {
    const i = n.map((s) => q(s));
    return function(a) {
      const l = (a == null ? void 0 : a[e]) || i;
      return H(
        () => ({ [`__scope${e}`]: { ...a, [e]: l } }),
        [a, l]
      );
    };
  };
  return o.scopeName = e, [r, Rm(o, ...t)];
}
function Rm(...e) {
  const t = e[0];
  if (e.length === 1)
    return t;
  const n = () => {
    const r = e.map((o) => ({
      useScope: o(),
      scopeName: o.scopeName
    }));
    return function(i) {
      const s = r.reduce((a, { useScope: l, scopeName: u }) => {
        const g = l(i)[`__scope${u}`];
        return { ...a, ...g };
      }, {});
      return H(() => ({ [`__scope${t.scopeName}`]: s }), [s]);
    };
  };
  return n.scopeName = t.scopeName, n;
}
var Hm = q(void 0);
function Po(e) {
  const t = re(Hm);
  return e || t || "ltr";
}
function Gm(e, t = globalThis == null ? void 0 : globalThis.document) {
  const n = Ae(e);
  C(() => {
    const r = (o) => {
      o.key === "Escape" && n(o);
    };
    return t.addEventListener("keydown", r, { capture: !0 }), () => t.removeEventListener("keydown", r, { capture: !0 });
  }, [n, t]);
}
var Ym = "DismissableLayer", to = "dismissableLayer.update", Bm = "dismissableLayer.pointerDownOutside", Qm = "dismissableLayer.focusOutside", Wi, Na = q({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set()
}), rr = y(
  (e, t) => {
    const {
      disableOutsidePointerEvents: n = !1,
      onEscapeKeyDown: r,
      onPointerDownOutside: o,
      onFocusOutside: i,
      onInteractOutside: s,
      onDismiss: a,
      ...l
    } = e, u = re(Na), [d, g] = O(null), I = (d == null ? void 0 : d.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, m] = O({}), p = K(t, (D) => g(D)), f = Array.from(u.layers), [b] = [...u.layersWithOutsidePointerEventsDisabled].slice(-1), N = f.indexOf(b), j = d ? f.indexOf(d) : -1, h = u.layersWithOutsidePointerEventsDisabled.size > 0, v = j >= N, w = Xm((D) => {
      const x = D.target, P = [...u.branches].some((U) => U.contains(x));
      !v || P || (o == null || o(D), s == null || s(D), D.defaultPrevented || a == null || a());
    }, I), S = Fm((D) => {
      const x = D.target;
      [...u.branches].some((U) => U.contains(x)) || (i == null || i(D), s == null || s(D), D.defaultPrevented || a == null || a());
    }, I);
    return Gm((D) => {
      j === u.layers.size - 1 && (r == null || r(D), !D.defaultPrevented && a && (D.preventDefault(), a()));
    }, I), C(() => {
      if (d)
        return n && (u.layersWithOutsidePointerEventsDisabled.size === 0 && (Wi = I.body.style.pointerEvents, I.body.style.pointerEvents = "none"), u.layersWithOutsidePointerEventsDisabled.add(d)), u.layers.add(d), Ui(), () => {
          n && u.layersWithOutsidePointerEventsDisabled.size === 1 && (I.body.style.pointerEvents = Wi);
        };
    }, [d, I, n, u]), C(() => () => {
      d && (u.layers.delete(d), u.layersWithOutsidePointerEventsDisabled.delete(d), Ui());
    }, [d, u]), C(() => {
      const D = () => m({});
      return document.addEventListener(to, D), () => document.removeEventListener(to, D);
    }, []), /* @__PURE__ */ M.jsx(
      V.div,
      {
        ...l,
        ref: p,
        style: {
          pointerEvents: h ? v ? "auto" : "none" : void 0,
          ...e.style
        },
        onFocusCapture: z(e.onFocusCapture, S.onFocusCapture),
        onBlurCapture: z(e.onBlurCapture, S.onBlurCapture),
        onPointerDownCapture: z(
          e.onPointerDownCapture,
          w.onPointerDownCapture
        )
      }
    );
  }
);
rr.displayName = Ym;
var Jm = "DismissableLayerBranch", Vm = y((e, t) => {
  const n = re(Na), r = A(null), o = K(t, r);
  return C(() => {
    const i = r.current;
    if (i)
      return n.branches.add(i), () => {
        n.branches.delete(i);
      };
  }, [n.branches]), /* @__PURE__ */ M.jsx(V.div, { ...e, ref: o });
});
Vm.displayName = Jm;
function Xm(e, t = globalThis == null ? void 0 : globalThis.document) {
  const n = Ae(e), r = A(!1), o = A(() => {
  });
  return C(() => {
    const i = (a) => {
      if (a.target && !r.current) {
        let l = function() {
          ja(
            Bm,
            n,
            u,
            { discrete: !0 }
          );
        };
        const u = { originalEvent: a };
        a.pointerType === "touch" ? (t.removeEventListener("click", o.current), o.current = l, t.addEventListener("click", o.current, { once: !0 })) : l();
      } else
        t.removeEventListener("click", o.current);
      r.current = !1;
    }, s = window.setTimeout(() => {
      t.addEventListener("pointerdown", i);
    }, 0);
    return () => {
      window.clearTimeout(s), t.removeEventListener("pointerdown", i), t.removeEventListener("click", o.current);
    };
  }, [t, n]), {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: () => r.current = !0
  };
}
function Fm(e, t = globalThis == null ? void 0 : globalThis.document) {
  const n = Ae(e), r = A(!1);
  return C(() => {
    const o = (i) => {
      i.target && !r.current && ja(Qm, n, { originalEvent: i }, {
        discrete: !1
      });
    };
    return t.addEventListener("focusin", o), () => t.removeEventListener("focusin", o);
  }, [t, n]), {
    onFocusCapture: () => r.current = !0,
    onBlurCapture: () => r.current = !1
  };
}
function Ui() {
  const e = new CustomEvent(to);
  document.dispatchEvent(e);
}
function ja(e, t, n, { discrete: r }) {
  const o = n.originalEvent.target, i = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
  t && o.addEventListener(e, t, { once: !0 }), r ? ba(o, i) : o.dispatchEvent(i);
}
var Wr = 0;
function ya() {
  C(() => {
    const e = document.querySelectorAll("[data-radix-focus-guard]");
    return document.body.insertAdjacentElement("afterbegin", e[0] ?? Ri()), document.body.insertAdjacentElement("beforeend", e[1] ?? Ri()), Wr++, () => {
      Wr === 1 && document.querySelectorAll("[data-radix-focus-guard]").forEach((t) => t.remove()), Wr--;
    };
  }, []);
}
function Ri() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var Ur = "focusScope.autoFocusOnMount", Rr = "focusScope.autoFocusOnUnmount", Hi = { bubbles: !1, cancelable: !0 }, $m = "FocusScope", Zo = y((e, t) => {
  const {
    loop: n = !1,
    trapped: r = !1,
    onMountAutoFocus: o,
    onUnmountAutoFocus: i,
    ...s
  } = e, [a, l] = O(null), u = Ae(o), d = Ae(i), g = A(null), I = K(t, (f) => l(f)), m = A({
    paused: !1,
    pause() {
      this.paused = !0;
    },
    resume() {
      this.paused = !1;
    }
  }).current;
  C(() => {
    if (r) {
      let f = function(h) {
        if (m.paused || !a)
          return;
        const v = h.target;
        a.contains(v) ? g.current = v : Je(g.current, { select: !0 });
      }, b = function(h) {
        if (m.paused || !a)
          return;
        const v = h.relatedTarget;
        v !== null && (a.contains(v) || Je(g.current, { select: !0 }));
      }, N = function(h) {
        if (document.activeElement === document.body)
          for (const w of h)
            w.removedNodes.length > 0 && Je(a);
      };
      document.addEventListener("focusin", f), document.addEventListener("focusout", b);
      const j = new MutationObserver(N);
      return a && j.observe(a, { childList: !0, subtree: !0 }), () => {
        document.removeEventListener("focusin", f), document.removeEventListener("focusout", b), j.disconnect();
      };
    }
  }, [r, a, m.paused]), C(() => {
    if (a) {
      Yi.add(m);
      const f = document.activeElement;
      if (!a.contains(f)) {
        const N = new CustomEvent(Ur, Hi);
        a.addEventListener(Ur, u), a.dispatchEvent(N), N.defaultPrevented || (qm(r5(ha(a)), { select: !0 }), document.activeElement === f && Je(a));
      }
      return () => {
        a.removeEventListener(Ur, u), setTimeout(() => {
          const N = new CustomEvent(Rr, Hi);
          a.addEventListener(Rr, d), a.dispatchEvent(N), N.defaultPrevented || Je(f ?? document.body, { select: !0 }), a.removeEventListener(Rr, d), Yi.remove(m);
        }, 0);
      };
    }
  }, [a, u, d, m]);
  const p = L(
    (f) => {
      if (!n && !r || m.paused)
        return;
      const b = f.key === "Tab" && !f.altKey && !f.ctrlKey && !f.metaKey, N = document.activeElement;
      if (b && N) {
        const j = f.currentTarget, [h, v] = Km(j);
        h && v ? !f.shiftKey && N === v ? (f.preventDefault(), n && Je(h, { select: !0 })) : f.shiftKey && N === h && (f.preventDefault(), n && Je(v, { select: !0 })) : N === j && f.preventDefault();
      }
    },
    [n, r, m.paused]
  );
  return /* @__PURE__ */ M.jsx(V.div, { tabIndex: -1, ...s, ref: I, onKeyDown: p });
});
Zo.displayName = $m;
function qm(e, { select: t = !1 } = {}) {
  const n = document.activeElement;
  for (const r of e)
    if (Je(r, { select: t }), document.activeElement !== n)
      return;
}
function Km(e) {
  const t = ha(e), n = Gi(t, e), r = Gi(t.reverse(), e);
  return [n, r];
}
function ha(e) {
  const t = [], n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (r) => {
      const o = r.tagName === "INPUT" && r.type === "hidden";
      return r.disabled || r.hidden || o ? NodeFilter.FILTER_SKIP : r.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (; n.nextNode(); )
    t.push(n.currentNode);
  return t;
}
function Gi(e, t) {
  for (const n of e)
    if (!e5(n, { upTo: t }))
      return n;
}
function e5(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === "hidden")
    return !0;
  for (; e; ) {
    if (t !== void 0 && e === t)
      return !1;
    if (getComputedStyle(e).display === "none")
      return !0;
    e = e.parentElement;
  }
  return !1;
}
function t5(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function Je(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    const n = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== n && t5(e) && t && e.select();
  }
}
var Yi = n5();
function n5() {
  let e = [];
  return {
    add(t) {
      const n = e[0];
      t !== n && (n == null || n.pause()), e = Bi(e, t), e.unshift(t);
    },
    remove(t) {
      var n;
      e = Bi(e, t), (n = e[0]) == null || n.resume();
    }
  };
}
function Bi(e, t) {
  const n = [...e], r = n.indexOf(t);
  return r !== -1 && n.splice(r, 1), n;
}
function r5(e) {
  return e.filter((t) => t.tagName !== "A");
}
var Le = globalThis != null && globalThis.document ? ko : () => {
}, o5 = qs["useId".toString()] || (() => {
}), i5 = 0;
function Ke(e) {
  const [t, n] = O(o5());
  return Le(() => {
    e || n((r) => r ?? String(i5++));
  }, [e]), e || (t ? `radix-${t}` : "");
}
const s5 = ["top", "right", "bottom", "left"], et = Math.min, Me = Math.max, Wn = Math.round, In = Math.floor, tt = (e) => ({
  x: e,
  y: e
}), a5 = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
}, c5 = {
  start: "end",
  end: "start"
};
function no(e, t, n) {
  return Me(e, et(t, n));
}
function Ue(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function Re(e) {
  return e.split("-")[0];
}
function Zt(e) {
  return e.split("-")[1];
}
function _o(e) {
  return e === "x" ? "y" : "x";
}
function Oo(e) {
  return e === "y" ? "height" : "width";
}
function _t(e) {
  return ["top", "bottom"].includes(Re(e)) ? "y" : "x";
}
function Wo(e) {
  return _o(_t(e));
}
function l5(e, t, n) {
  n === void 0 && (n = !1);
  const r = Zt(e), o = Wo(e), i = Oo(o);
  let s = o === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
  return t.reference[i] > t.floating[i] && (s = Un(s)), [s, Un(s)];
}
function u5(e) {
  const t = Un(e);
  return [ro(e), t, ro(t)];
}
function ro(e) {
  return e.replace(/start|end/g, (t) => c5[t]);
}
function d5(e, t, n) {
  const r = ["left", "right"], o = ["right", "left"], i = ["top", "bottom"], s = ["bottom", "top"];
  switch (e) {
    case "top":
    case "bottom":
      return n ? t ? o : r : t ? r : o;
    case "left":
    case "right":
      return t ? i : s;
    default:
      return [];
  }
}
function g5(e, t, n, r) {
  const o = Zt(e);
  let i = d5(Re(e), n === "start", r);
  return o && (i = i.map((s) => s + "-" + o), t && (i = i.concat(i.map(ro)))), i;
}
function Un(e) {
  return e.replace(/left|right|bottom|top/g, (t) => a5[t]);
}
function M5(e) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...e
  };
}
function va(e) {
  return typeof e != "number" ? M5(e) : {
    top: e,
    right: e,
    bottom: e,
    left: e
  };
}
function Rn(e) {
  return {
    ...e,
    top: e.y,
    left: e.x,
    right: e.x + e.width,
    bottom: e.y + e.height
  };
}
function Qi(e, t, n) {
  let {
    reference: r,
    floating: o
  } = e;
  const i = _t(t), s = Wo(t), a = Oo(s), l = Re(t), u = i === "y", d = r.x + r.width / 2 - o.width / 2, g = r.y + r.height / 2 - o.height / 2, I = r[a] / 2 - o[a] / 2;
  let m;
  switch (l) {
    case "top":
      m = {
        x: d,
        y: r.y - o.height
      };
      break;
    case "bottom":
      m = {
        x: d,
        y: r.y + r.height
      };
      break;
    case "right":
      m = {
        x: r.x + r.width,
        y: g
      };
      break;
    case "left":
      m = {
        x: r.x - o.width,
        y: g
      };
      break;
    default:
      m = {
        x: r.x,
        y: r.y
      };
  }
  switch (Zt(t)) {
    case "start":
      m[s] -= I * (n && u ? -1 : 1);
      break;
    case "end":
      m[s] += I * (n && u ? -1 : 1);
      break;
  }
  return m;
}
const I5 = async (e, t, n) => {
  const {
    placement: r = "bottom",
    strategy: o = "absolute",
    middleware: i = [],
    platform: s
  } = n, a = i.filter(Boolean), l = await (s.isRTL == null ? void 0 : s.isRTL(t));
  let u = await s.getElementRects({
    reference: e,
    floating: t,
    strategy: o
  }), {
    x: d,
    y: g
  } = Qi(u, r, l), I = r, m = {}, p = 0;
  for (let f = 0; f < a.length; f++) {
    const {
      name: b,
      fn: N
    } = a[f], {
      x: j,
      y: h,
      data: v,
      reset: w
    } = await N({
      x: d,
      y: g,
      initialPlacement: r,
      placement: I,
      strategy: o,
      middlewareData: m,
      rects: u,
      platform: s,
      elements: {
        reference: e,
        floating: t
      }
    });
    if (d = j ?? d, g = h ?? g, m = {
      ...m,
      [b]: {
        ...m[b],
        ...v
      }
    }, w && p <= 50) {
      p++, typeof w == "object" && (w.placement && (I = w.placement), w.rects && (u = w.rects === !0 ? await s.getElementRects({
        reference: e,
        floating: t,
        strategy: o
      }) : w.rects), {
        x: d,
        y: g
      } = Qi(u, I, l)), f = -1;
      continue;
    }
  }
  return {
    x: d,
    y: g,
    placement: I,
    strategy: o,
    middlewareData: m
  };
};
async function $t(e, t) {
  var n;
  t === void 0 && (t = {});
  const {
    x: r,
    y: o,
    platform: i,
    rects: s,
    elements: a,
    strategy: l
  } = e, {
    boundary: u = "clippingAncestors",
    rootBoundary: d = "viewport",
    elementContext: g = "floating",
    altBoundary: I = !1,
    padding: m = 0
  } = Ue(t, e), p = va(m), b = a[I ? g === "floating" ? "reference" : "floating" : g], N = Rn(await i.getClippingRect({
    element: (n = await (i.isElement == null ? void 0 : i.isElement(b))) == null || n ? b : b.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(a.floating)),
    boundary: u,
    rootBoundary: d,
    strategy: l
  })), j = g === "floating" ? {
    ...s.floating,
    x: r,
    y: o
  } : s.reference, h = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(a.floating)), v = await (i.isElement == null ? void 0 : i.isElement(h)) ? await (i.getScale == null ? void 0 : i.getScale(h)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  }, w = Rn(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
    rect: j,
    offsetParent: h,
    strategy: l
  }) : j);
  return {
    top: (N.top - w.top + p.top) / v.y,
    bottom: (w.bottom - N.bottom + p.bottom) / v.y,
    left: (N.left - w.left + p.left) / v.x,
    right: (w.right - N.right + p.right) / v.x
  };
}
const Ji = (e) => ({
  name: "arrow",
  options: e,
  async fn(t) {
    const {
      x: n,
      y: r,
      placement: o,
      rects: i,
      platform: s,
      elements: a
    } = t, {
      element: l,
      padding: u = 0
    } = Ue(e, t) || {};
    if (l == null)
      return {};
    const d = va(u), g = {
      x: n,
      y: r
    }, I = Wo(o), m = Oo(I), p = await s.getDimensions(l), f = I === "y", b = f ? "top" : "left", N = f ? "bottom" : "right", j = f ? "clientHeight" : "clientWidth", h = i.reference[m] + i.reference[I] - g[I] - i.floating[m], v = g[I] - i.reference[I], w = await (s.getOffsetParent == null ? void 0 : s.getOffsetParent(l));
    let S = w ? w[j] : 0;
    (!S || !await (s.isElement == null ? void 0 : s.isElement(w))) && (S = a.floating[j] || i.floating[m]);
    const D = h / 2 - v / 2, x = S / 2 - p[m] / 2 - 1, P = et(d[b], x), U = et(d[N], x), W = P, E = S - p[m] - U, R = S / 2 - p[m] / 2 + D, G = no(W, R, E), Z = Zt(o) != null && R != G && i.reference[m] / 2 - (R < W ? P : U) - p[m] / 2 < 0 ? R < W ? W - R : E - R : 0;
    return {
      [I]: g[I] - Z,
      data: {
        [I]: G,
        centerOffset: R - G + Z
      }
    };
  }
}), m5 = function(e) {
  return e === void 0 && (e = {}), {
    name: "flip",
    options: e,
    async fn(t) {
      var n;
      const {
        placement: r,
        middlewareData: o,
        rects: i,
        initialPlacement: s,
        platform: a,
        elements: l
      } = t, {
        mainAxis: u = !0,
        crossAxis: d = !0,
        fallbackPlacements: g,
        fallbackStrategy: I = "bestFit",
        fallbackAxisSideDirection: m = "none",
        flipAlignment: p = !0,
        ...f
      } = Ue(e, t), b = Re(r), N = Re(s) === s, j = await (a.isRTL == null ? void 0 : a.isRTL(l.floating)), h = g || (N || !p ? [Un(s)] : u5(s));
      !g && m !== "none" && h.push(...g5(s, p, m, j));
      const v = [s, ...h], w = await $t(t, f), S = [];
      let D = ((n = o.flip) == null ? void 0 : n.overflows) || [];
      if (u && S.push(w[b]), d) {
        const W = l5(r, i, j);
        S.push(w[W[0]], w[W[1]]);
      }
      if (D = [...D, {
        placement: r,
        overflows: S
      }], !S.every((W) => W <= 0)) {
        var x, P;
        const W = (((x = o.flip) == null ? void 0 : x.index) || 0) + 1, E = v[W];
        if (E)
          return {
            data: {
              index: W,
              overflows: D
            },
            reset: {
              placement: E
            }
          };
        let R = (P = D.filter((G) => G.overflows[0] <= 0).sort((G, ee) => G.overflows[1] - ee.overflows[1])[0]) == null ? void 0 : P.placement;
        if (!R)
          switch (I) {
            case "bestFit": {
              var U;
              const G = (U = D.map((ee) => [ee.placement, ee.overflows.filter((Z) => Z > 0).reduce((Z, ae) => Z + ae, 0)]).sort((ee, Z) => ee[1] - Z[1])[0]) == null ? void 0 : U[0];
              G && (R = G);
              break;
            }
            case "initialPlacement":
              R = s;
              break;
          }
        if (r !== R)
          return {
            reset: {
              placement: R
            }
          };
      }
      return {};
    }
  };
};
function Vi(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width
  };
}
function Xi(e) {
  return s5.some((t) => e[t] >= 0);
}
const p5 = function(e) {
  return e === void 0 && (e = {}), {
    name: "hide",
    options: e,
    async fn(t) {
      const {
        rects: n
      } = t, {
        strategy: r = "referenceHidden",
        ...o
      } = Ue(e, t);
      switch (r) {
        case "referenceHidden": {
          const i = await $t(t, {
            ...o,
            elementContext: "reference"
          }), s = Vi(i, n.reference);
          return {
            data: {
              referenceHiddenOffsets: s,
              referenceHidden: Xi(s)
            }
          };
        }
        case "escaped": {
          const i = await $t(t, {
            ...o,
            altBoundary: !0
          }), s = Vi(i, n.floating);
          return {
            data: {
              escapedOffsets: s,
              escaped: Xi(s)
            }
          };
        }
        default:
          return {};
      }
    }
  };
};
async function f5(e, t) {
  const {
    placement: n,
    platform: r,
    elements: o
  } = e, i = await (r.isRTL == null ? void 0 : r.isRTL(o.floating)), s = Re(n), a = Zt(n), l = _t(n) === "y", u = ["left", "top"].includes(s) ? -1 : 1, d = i && l ? -1 : 1, g = Ue(t, e);
  let {
    mainAxis: I,
    crossAxis: m,
    alignmentAxis: p
  } = typeof g == "number" ? {
    mainAxis: g,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: 0,
    crossAxis: 0,
    alignmentAxis: null,
    ...g
  };
  return a && typeof p == "number" && (m = a === "end" ? p * -1 : p), l ? {
    x: m * d,
    y: I * u
  } : {
    x: I * u,
    y: m * d
  };
}
const b5 = function(e) {
  return e === void 0 && (e = 0), {
    name: "offset",
    options: e,
    async fn(t) {
      const {
        x: n,
        y: r
      } = t, o = await f5(t, e);
      return {
        x: n + o.x,
        y: r + o.y,
        data: o
      };
    }
  };
}, N5 = function(e) {
  return e === void 0 && (e = {}), {
    name: "shift",
    options: e,
    async fn(t) {
      const {
        x: n,
        y: r,
        placement: o
      } = t, {
        mainAxis: i = !0,
        crossAxis: s = !1,
        limiter: a = {
          fn: (b) => {
            let {
              x: N,
              y: j
            } = b;
            return {
              x: N,
              y: j
            };
          }
        },
        ...l
      } = Ue(e, t), u = {
        x: n,
        y: r
      }, d = await $t(t, l), g = _t(Re(o)), I = _o(g);
      let m = u[I], p = u[g];
      if (i) {
        const b = I === "y" ? "top" : "left", N = I === "y" ? "bottom" : "right", j = m + d[b], h = m - d[N];
        m = no(j, m, h);
      }
      if (s) {
        const b = g === "y" ? "top" : "left", N = g === "y" ? "bottom" : "right", j = p + d[b], h = p - d[N];
        p = no(j, p, h);
      }
      const f = a.fn({
        ...t,
        [I]: m,
        [g]: p
      });
      return {
        ...f,
        data: {
          x: f.x - n,
          y: f.y - r
        }
      };
    }
  };
}, j5 = function(e) {
  return e === void 0 && (e = {}), {
    options: e,
    fn(t) {
      const {
        x: n,
        y: r,
        placement: o,
        rects: i,
        middlewareData: s
      } = t, {
        offset: a = 0,
        mainAxis: l = !0,
        crossAxis: u = !0
      } = Ue(e, t), d = {
        x: n,
        y: r
      }, g = _t(o), I = _o(g);
      let m = d[I], p = d[g];
      const f = Ue(a, t), b = typeof f == "number" ? {
        mainAxis: f,
        crossAxis: 0
      } : {
        mainAxis: 0,
        crossAxis: 0,
        ...f
      };
      if (l) {
        const h = I === "y" ? "height" : "width", v = i.reference[I] - i.floating[h] + b.mainAxis, w = i.reference[I] + i.reference[h] - b.mainAxis;
        m < v ? m = v : m > w && (m = w);
      }
      if (u) {
        var N, j;
        const h = I === "y" ? "width" : "height", v = ["top", "left"].includes(Re(o)), w = i.reference[g] - i.floating[h] + (v && ((N = s.offset) == null ? void 0 : N[g]) || 0) + (v ? 0 : b.crossAxis), S = i.reference[g] + i.reference[h] + (v ? 0 : ((j = s.offset) == null ? void 0 : j[g]) || 0) - (v ? b.crossAxis : 0);
        p < w ? p = w : p > S && (p = S);
      }
      return {
        [I]: m,
        [g]: p
      };
    }
  };
}, y5 = function(e) {
  return e === void 0 && (e = {}), {
    name: "size",
    options: e,
    async fn(t) {
      const {
        placement: n,
        rects: r,
        platform: o,
        elements: i
      } = t, {
        apply: s = () => {
        },
        ...a
      } = Ue(e, t), l = await $t(t, a), u = Re(n), d = Zt(n), g = _t(n) === "y", {
        width: I,
        height: m
      } = r.floating;
      let p, f;
      u === "top" || u === "bottom" ? (p = u, f = d === (await (o.isRTL == null ? void 0 : o.isRTL(i.floating)) ? "start" : "end") ? "left" : "right") : (f = u, p = d === "end" ? "top" : "bottom");
      const b = m - l[p], N = I - l[f], j = !t.middlewareData.shift;
      let h = b, v = N;
      if (g) {
        const S = I - l.left - l.right;
        v = d || j ? et(N, S) : S;
      } else {
        const S = m - l.top - l.bottom;
        h = d || j ? et(b, S) : S;
      }
      if (j && !d) {
        const S = Me(l.left, 0), D = Me(l.right, 0), x = Me(l.top, 0), P = Me(l.bottom, 0);
        g ? v = I - 2 * (S !== 0 || D !== 0 ? S + D : Me(l.left, l.right)) : h = m - 2 * (x !== 0 || P !== 0 ? x + P : Me(l.top, l.bottom));
      }
      await s({
        ...t,
        availableWidth: v,
        availableHeight: h
      });
      const w = await o.getDimensions(i.floating);
      return I !== w.width || m !== w.height ? {
        reset: {
          rects: !0
        }
      } : {};
    }
  };
};
function nt(e) {
  return wa(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function Ie(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function Ye(e) {
  var t;
  return (t = (wa(e) ? e.ownerDocument : e.document) || window.document) == null ? void 0 : t.documentElement;
}
function wa(e) {
  return e instanceof Node || e instanceof Ie(e).Node;
}
function He(e) {
  return e instanceof Element || e instanceof Ie(e).Element;
}
function ze(e) {
  return e instanceof HTMLElement || e instanceof Ie(e).HTMLElement;
}
function Fi(e) {
  return typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof Ie(e).ShadowRoot;
}
function sn(e) {
  const {
    overflow: t,
    overflowX: n,
    overflowY: r,
    display: o
  } = je(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && !["inline", "contents"].includes(o);
}
function h5(e) {
  return ["table", "td", "th"].includes(nt(e));
}
function Uo(e) {
  const t = Ro(), n = je(e);
  return n.transform !== "none" || n.perspective !== "none" || (n.containerType ? n.containerType !== "normal" : !1) || !t && (n.backdropFilter ? n.backdropFilter !== "none" : !1) || !t && (n.filter ? n.filter !== "none" : !1) || ["transform", "perspective", "filter"].some((r) => (n.willChange || "").includes(r)) || ["paint", "layout", "strict", "content"].some((r) => (n.contain || "").includes(r));
}
function v5(e) {
  let t = kt(e);
  for (; ze(t) && !or(t); ) {
    if (Uo(t))
      return t;
    t = kt(t);
  }
  return null;
}
function Ro() {
  return typeof CSS > "u" || !CSS.supports ? !1 : CSS.supports("-webkit-backdrop-filter", "none");
}
function or(e) {
  return ["html", "body", "#document"].includes(nt(e));
}
function je(e) {
  return Ie(e).getComputedStyle(e);
}
function ir(e) {
  return He(e) ? {
    scrollLeft: e.scrollLeft,
    scrollTop: e.scrollTop
  } : {
    scrollLeft: e.pageXOffset,
    scrollTop: e.pageYOffset
  };
}
function kt(e) {
  if (nt(e) === "html")
    return e;
  const t = (
    // Step into the shadow DOM of the parent of a slotted node.
    e.assignedSlot || // DOM Element detected.
    e.parentNode || // ShadowRoot detected.
    Fi(e) && e.host || // Fallback.
    Ye(e)
  );
  return Fi(t) ? t.host : t;
}
function Da(e) {
  const t = kt(e);
  return or(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : ze(t) && sn(t) ? t : Da(t);
}
function Hn(e, t) {
  var n;
  t === void 0 && (t = []);
  const r = Da(e), o = r === ((n = e.ownerDocument) == null ? void 0 : n.body), i = Ie(r);
  return o ? t.concat(i, i.visualViewport || [], sn(r) ? r : []) : t.concat(r, Hn(r));
}
function Sa(e) {
  const t = je(e);
  let n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0;
  const o = ze(e), i = o ? e.offsetWidth : n, s = o ? e.offsetHeight : r, a = Wn(n) !== i || Wn(r) !== s;
  return a && (n = i, r = s), {
    width: n,
    height: r,
    $: a
  };
}
function Ho(e) {
  return He(e) ? e : e.contextElement;
}
function xt(e) {
  const t = Ho(e);
  if (!ze(t))
    return tt(1);
  const n = t.getBoundingClientRect(), {
    width: r,
    height: o,
    $: i
  } = Sa(t);
  let s = (i ? Wn(n.width) : n.width) / r, a = (i ? Wn(n.height) : n.height) / o;
  return (!s || !Number.isFinite(s)) && (s = 1), (!a || !Number.isFinite(a)) && (a = 1), {
    x: s,
    y: a
  };
}
const w5 = /* @__PURE__ */ tt(0);
function xa(e) {
  const t = Ie(e);
  return !Ro() || !t.visualViewport ? w5 : {
    x: t.visualViewport.offsetLeft,
    y: t.visualViewport.offsetTop
  };
}
function D5(e, t, n) {
  return t === void 0 && (t = !1), !n || t && n !== Ie(e) ? !1 : t;
}
function ut(e, t, n, r) {
  t === void 0 && (t = !1), n === void 0 && (n = !1);
  const o = e.getBoundingClientRect(), i = Ho(e);
  let s = tt(1);
  t && (r ? He(r) && (s = xt(r)) : s = xt(e));
  const a = D5(i, n, r) ? xa(i) : tt(0);
  let l = (o.left + a.x) / s.x, u = (o.top + a.y) / s.y, d = o.width / s.x, g = o.height / s.y;
  if (i) {
    const I = Ie(i), m = r && He(r) ? Ie(r) : r;
    let p = I.frameElement;
    for (; p && r && m !== I; ) {
      const f = xt(p), b = p.getBoundingClientRect(), N = je(p), j = b.left + (p.clientLeft + parseFloat(N.paddingLeft)) * f.x, h = b.top + (p.clientTop + parseFloat(N.paddingTop)) * f.y;
      l *= f.x, u *= f.y, d *= f.x, g *= f.y, l += j, u += h, p = Ie(p).frameElement;
    }
  }
  return Rn({
    width: d,
    height: g,
    x: l,
    y: u
  });
}
function S5(e) {
  let {
    rect: t,
    offsetParent: n,
    strategy: r
  } = e;
  const o = ze(n), i = Ye(n);
  if (n === i)
    return t;
  let s = {
    scrollLeft: 0,
    scrollTop: 0
  }, a = tt(1);
  const l = tt(0);
  if ((o || !o && r !== "fixed") && ((nt(n) !== "body" || sn(i)) && (s = ir(n)), ze(n))) {
    const u = ut(n);
    a = xt(n), l.x = u.x + n.clientLeft, l.y = u.y + n.clientTop;
  }
  return {
    width: t.width * a.x,
    height: t.height * a.y,
    x: t.x * a.x - s.scrollLeft * a.x + l.x,
    y: t.y * a.y - s.scrollTop * a.y + l.y
  };
}
function x5(e) {
  return Array.from(e.getClientRects());
}
function Aa(e) {
  return ut(Ye(e)).left + ir(e).scrollLeft;
}
function A5(e) {
  const t = Ye(e), n = ir(e), r = e.ownerDocument.body, o = Me(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth), i = Me(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight);
  let s = -n.scrollLeft + Aa(e);
  const a = -n.scrollTop;
  return je(r).direction === "rtl" && (s += Me(t.clientWidth, r.clientWidth) - o), {
    width: o,
    height: i,
    x: s,
    y: a
  };
}
function L5(e, t) {
  const n = Ie(e), r = Ye(e), o = n.visualViewport;
  let i = r.clientWidth, s = r.clientHeight, a = 0, l = 0;
  if (o) {
    i = o.width, s = o.height;
    const u = Ro();
    (!u || u && t === "fixed") && (a = o.offsetLeft, l = o.offsetTop);
  }
  return {
    width: i,
    height: s,
    x: a,
    y: l
  };
}
function C5(e, t) {
  const n = ut(e, !0, t === "fixed"), r = n.top + e.clientTop, o = n.left + e.clientLeft, i = ze(e) ? xt(e) : tt(1), s = e.clientWidth * i.x, a = e.clientHeight * i.y, l = o * i.x, u = r * i.y;
  return {
    width: s,
    height: a,
    x: l,
    y: u
  };
}
function $i(e, t, n) {
  let r;
  if (t === "viewport")
    r = L5(e, n);
  else if (t === "document")
    r = A5(Ye(e));
  else if (He(t))
    r = C5(t, n);
  else {
    const o = xa(e);
    r = {
      ...t,
      x: t.x - o.x,
      y: t.y - o.y
    };
  }
  return Rn(r);
}
function La(e, t) {
  const n = kt(e);
  return n === t || !He(n) || or(n) ? !1 : je(n).position === "fixed" || La(n, t);
}
function T5(e, t) {
  const n = t.get(e);
  if (n)
    return n;
  let r = Hn(e).filter((a) => He(a) && nt(a) !== "body"), o = null;
  const i = je(e).position === "fixed";
  let s = i ? kt(e) : e;
  for (; He(s) && !or(s); ) {
    const a = je(s), l = Uo(s);
    !l && a.position === "fixed" && (o = null), (i ? !l && !o : !l && a.position === "static" && !!o && ["absolute", "fixed"].includes(o.position) || sn(s) && !l && La(e, s)) ? r = r.filter((d) => d !== s) : o = a, s = kt(s);
  }
  return t.set(e, r), r;
}
function k5(e) {
  let {
    element: t,
    boundary: n,
    rootBoundary: r,
    strategy: o
  } = e;
  const s = [...n === "clippingAncestors" ? T5(t, this._c) : [].concat(n), r], a = s[0], l = s.reduce((u, d) => {
    const g = $i(t, d, o);
    return u.top = Me(g.top, u.top), u.right = et(g.right, u.right), u.bottom = et(g.bottom, u.bottom), u.left = Me(g.left, u.left), u;
  }, $i(t, a, o));
  return {
    width: l.right - l.left,
    height: l.bottom - l.top,
    x: l.left,
    y: l.top
  };
}
function z5(e) {
  return Sa(e);
}
function E5(e, t, n) {
  const r = ze(t), o = Ye(t), i = n === "fixed", s = ut(e, !0, i, t);
  let a = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const l = tt(0);
  if (r || !r && !i)
    if ((nt(t) !== "body" || sn(o)) && (a = ir(t)), r) {
      const u = ut(t, !0, i, t);
      l.x = u.x + t.clientLeft, l.y = u.y + t.clientTop;
    } else
      o && (l.x = Aa(o));
  return {
    x: s.left + a.scrollLeft - l.x,
    y: s.top + a.scrollTop - l.y,
    width: s.width,
    height: s.height
  };
}
function qi(e, t) {
  return !ze(e) || je(e).position === "fixed" ? null : t ? t(e) : e.offsetParent;
}
function Ca(e, t) {
  const n = Ie(e);
  if (!ze(e))
    return n;
  let r = qi(e, t);
  for (; r && h5(r) && je(r).position === "static"; )
    r = qi(r, t);
  return r && (nt(r) === "html" || nt(r) === "body" && je(r).position === "static" && !Uo(r)) ? n : r || v5(e) || n;
}
const P5 = async function(e) {
  let {
    reference: t,
    floating: n,
    strategy: r
  } = e;
  const o = this.getOffsetParent || Ca, i = this.getDimensions;
  return {
    reference: E5(t, await o(n), r),
    floating: {
      x: 0,
      y: 0,
      ...await i(n)
    }
  };
};
function Z5(e) {
  return je(e).direction === "rtl";
}
const _5 = {
  convertOffsetParentRelativeRectToViewportRelativeRect: S5,
  getDocumentElement: Ye,
  getClippingRect: k5,
  getOffsetParent: Ca,
  getElementRects: P5,
  getClientRects: x5,
  getDimensions: z5,
  getScale: xt,
  isElement: He,
  isRTL: Z5
};
function O5(e, t) {
  let n = null, r;
  const o = Ye(e);
  function i() {
    clearTimeout(r), n && n.disconnect(), n = null;
  }
  function s(a, l) {
    a === void 0 && (a = !1), l === void 0 && (l = 1), i();
    const {
      left: u,
      top: d,
      width: g,
      height: I
    } = e.getBoundingClientRect();
    if (a || t(), !g || !I)
      return;
    const m = In(d), p = In(o.clientWidth - (u + g)), f = In(o.clientHeight - (d + I)), b = In(u), j = {
      rootMargin: -m + "px " + -p + "px " + -f + "px " + -b + "px",
      threshold: Me(0, et(1, l)) || 1
    };
    let h = !0;
    function v(w) {
      const S = w[0].intersectionRatio;
      if (S !== l) {
        if (!h)
          return s();
        S ? s(!1, S) : r = setTimeout(() => {
          s(!1, 1e-7);
        }, 100);
      }
      h = !1;
    }
    try {
      n = new IntersectionObserver(v, {
        ...j,
        // Handle <iframe>s
        root: o.ownerDocument
      });
    } catch {
      n = new IntersectionObserver(v, j);
    }
    n.observe(e);
  }
  return s(!0), i;
}
function W5(e, t, n, r) {
  r === void 0 && (r = {});
  const {
    ancestorScroll: o = !0,
    ancestorResize: i = !0,
    elementResize: s = typeof ResizeObserver == "function",
    layoutShift: a = typeof IntersectionObserver == "function",
    animationFrame: l = !1
  } = r, u = Ho(e), d = o || i ? [...u ? Hn(u) : [], ...Hn(t)] : [];
  d.forEach((N) => {
    o && N.addEventListener("scroll", n, {
      passive: !0
    }), i && N.addEventListener("resize", n);
  });
  const g = u && a ? O5(u, n) : null;
  let I = -1, m = null;
  s && (m = new ResizeObserver((N) => {
    let [j] = N;
    j && j.target === u && m && (m.unobserve(t), cancelAnimationFrame(I), I = requestAnimationFrame(() => {
      m && m.observe(t);
    })), n();
  }), u && !l && m.observe(u), m.observe(t));
  let p, f = l ? ut(e) : null;
  l && b();
  function b() {
    const N = ut(e);
    f && (N.x !== f.x || N.y !== f.y || N.width !== f.width || N.height !== f.height) && n(), f = N, p = requestAnimationFrame(b);
  }
  return n(), () => {
    d.forEach((N) => {
      o && N.removeEventListener("scroll", n), i && N.removeEventListener("resize", n);
    }), g && g(), m && m.disconnect(), m = null, l && cancelAnimationFrame(p);
  };
}
const U5 = (e, t, n) => {
  const r = /* @__PURE__ */ new Map(), o = {
    platform: _5,
    ...n
  }, i = {
    ...o.platform,
    _c: r
  };
  return I5(e, t, {
    ...o,
    platform: i
  });
}, R5 = (e) => {
  function t(n) {
    return {}.hasOwnProperty.call(n, "current");
  }
  return {
    name: "arrow",
    options: e,
    fn(n) {
      const {
        element: r,
        padding: o
      } = typeof e == "function" ? e(n) : e;
      return r && t(r) ? r.current != null ? Ji({
        element: r.current,
        padding: o
      }).fn(n) : {} : r ? Ji({
        element: r,
        padding: o
      }).fn(n) : {};
    }
  };
};
var Cn = typeof document < "u" ? ko : C;
function Gn(e, t) {
  if (e === t)
    return !0;
  if (typeof e != typeof t)
    return !1;
  if (typeof e == "function" && e.toString() === t.toString())
    return !0;
  let n, r, o;
  if (e && t && typeof e == "object") {
    if (Array.isArray(e)) {
      if (n = e.length, n != t.length)
        return !1;
      for (r = n; r-- !== 0; )
        if (!Gn(e[r], t[r]))
          return !1;
      return !0;
    }
    if (o = Object.keys(e), n = o.length, n !== Object.keys(t).length)
      return !1;
    for (r = n; r-- !== 0; )
      if (!{}.hasOwnProperty.call(t, o[r]))
        return !1;
    for (r = n; r-- !== 0; ) {
      const i = o[r];
      if (!(i === "_owner" && e.$$typeof) && !Gn(e[i], t[i]))
        return !1;
    }
    return !0;
  }
  return e !== e && t !== t;
}
function Ta(e) {
  return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function Ki(e, t) {
  const n = Ta(e);
  return Math.round(t * n) / n;
}
function es(e) {
  const t = A(e);
  return Cn(() => {
    t.current = e;
  }), t;
}
function H5(e) {
  e === void 0 && (e = {});
  const {
    placement: t = "bottom",
    strategy: n = "absolute",
    middleware: r = [],
    platform: o,
    elements: {
      reference: i,
      floating: s
    } = {},
    transform: a = !0,
    whileElementsMounted: l,
    open: u
  } = e, [d, g] = O({
    x: 0,
    y: 0,
    strategy: n,
    placement: t,
    middlewareData: {},
    isPositioned: !1
  }), [I, m] = O(r);
  Gn(I, r) || m(r);
  const [p, f] = O(null), [b, N] = O(null), j = L((Z) => {
    Z != S.current && (S.current = Z, f(Z));
  }, [f]), h = L((Z) => {
    Z !== D.current && (D.current = Z, N(Z));
  }, [N]), v = i || p, w = s || b, S = A(null), D = A(null), x = A(d), P = es(l), U = es(o), W = L(() => {
    if (!S.current || !D.current)
      return;
    const Z = {
      placement: t,
      strategy: n,
      middleware: I
    };
    U.current && (Z.platform = U.current), U5(S.current, D.current, Z).then((ae) => {
      const $ = {
        ...ae,
        isPositioned: !0
      };
      E.current && !Gn(x.current, $) && (x.current = $, fa(() => {
        g($);
      }));
    });
  }, [I, t, n, U]);
  Cn(() => {
    u === !1 && x.current.isPositioned && (x.current.isPositioned = !1, g((Z) => ({
      ...Z,
      isPositioned: !1
    })));
  }, [u]);
  const E = A(!1);
  Cn(() => (E.current = !0, () => {
    E.current = !1;
  }), []), Cn(() => {
    if (v && (S.current = v), w && (D.current = w), v && w) {
      if (P.current)
        return P.current(v, w, W);
      W();
    }
  }, [v, w, W, P]);
  const R = H(() => ({
    reference: S,
    floating: D,
    setReference: j,
    setFloating: h
  }), [j, h]), G = H(() => ({
    reference: v,
    floating: w
  }), [v, w]), ee = H(() => {
    const Z = {
      position: n,
      left: 0,
      top: 0
    };
    if (!G.floating)
      return Z;
    const ae = Ki(G.floating, d.x), $ = Ki(G.floating, d.y);
    return a ? {
      ...Z,
      transform: "translate(" + ae + "px, " + $ + "px)",
      ...Ta(G.floating) >= 1.5 && {
        willChange: "transform"
      }
    } : {
      position: n,
      left: ae,
      top: $
    };
  }, [n, a, G.floating, d.x, d.y]);
  return H(() => ({
    ...d,
    update: W,
    refs: R,
    elements: G,
    floatingStyles: ee
  }), [d, W, R, G, ee]);
}
var G5 = "Arrow", ka = y((e, t) => {
  const { children: n, width: r = 10, height: o = 5, ...i } = e;
  return /* @__PURE__ */ M.jsx(
    V.svg,
    {
      ...i,
      ref: t,
      width: r,
      height: o,
      viewBox: "0 0 30 10",
      preserveAspectRatio: "none",
      children: e.asChild ? n : /* @__PURE__ */ M.jsx("polygon", { points: "0,0 30,0 15,10" })
    }
  );
});
ka.displayName = G5;
var Y5 = ka;
function Go(e, t = []) {
  let n = [];
  function r(i, s) {
    const a = q(s), l = n.length;
    n = [...n, s];
    function u(g) {
      const { scope: I, children: m, ...p } = g, f = (I == null ? void 0 : I[e][l]) || a, b = H(() => p, Object.values(p));
      return /* @__PURE__ */ M.jsx(f.Provider, { value: b, children: m });
    }
    function d(g, I) {
      const m = (I == null ? void 0 : I[e][l]) || a, p = re(m);
      if (p)
        return p;
      if (s !== void 0)
        return s;
      throw new Error(`\`${g}\` must be used within \`${i}\``);
    }
    return u.displayName = i + "Provider", [u, d];
  }
  const o = () => {
    const i = n.map((s) => q(s));
    return function(a) {
      const l = (a == null ? void 0 : a[e]) || i;
      return H(
        () => ({ [`__scope${e}`]: { ...a, [e]: l } }),
        [a, l]
      );
    };
  };
  return o.scopeName = e, [r, B5(o, ...t)];
}
function B5(...e) {
  const t = e[0];
  if (e.length === 1)
    return t;
  const n = () => {
    const r = e.map((o) => ({
      useScope: o(),
      scopeName: o.scopeName
    }));
    return function(i) {
      const s = r.reduce((a, { useScope: l, scopeName: u }) => {
        const g = l(i)[`__scope${u}`];
        return { ...a, ...g };
      }, {});
      return H(() => ({ [`__scope${t.scopeName}`]: s }), [s]);
    };
  };
  return n.scopeName = t.scopeName, n;
}
function Q5(e) {
  const [t, n] = O(void 0);
  return Le(() => {
    if (e) {
      n({ width: e.offsetWidth, height: e.offsetHeight });
      const r = new ResizeObserver((o) => {
        if (!Array.isArray(o) || !o.length)
          return;
        const i = o[0];
        let s, a;
        if ("borderBoxSize" in i) {
          const l = i.borderBoxSize, u = Array.isArray(l) ? l[0] : l;
          s = u.inlineSize, a = u.blockSize;
        } else
          s = e.offsetWidth, a = e.offsetHeight;
        n({ width: s, height: a });
      });
      return r.observe(e, { box: "border-box" }), () => r.unobserve(e);
    } else
      n(void 0);
  }, [e]), t;
}
var Yo = "Popper", [za, sr] = Go(Yo), [J5, Ea] = za(Yo), Pa = (e) => {
  const { __scopePopper: t, children: n } = e, [r, o] = O(null);
  return /* @__PURE__ */ M.jsx(J5, { scope: t, anchor: r, onAnchorChange: o, children: n });
};
Pa.displayName = Yo;
var Za = "PopperAnchor", _a = y(
  (e, t) => {
    const { __scopePopper: n, virtualRef: r, ...o } = e, i = Ea(Za, n), s = A(null), a = K(t, s);
    return C(() => {
      i.onAnchorChange((r == null ? void 0 : r.current) || s.current);
    }), r ? null : /* @__PURE__ */ M.jsx(V.div, { ...o, ref: a });
  }
);
_a.displayName = Za;
var Bo = "PopperContent", [V5, X5] = za(Bo), Oa = y(
  (e, t) => {
    var Ee, Gt, fe, Yt, Ti, ki;
    const {
      __scopePopper: n,
      side: r = "bottom",
      sideOffset: o = 0,
      align: i = "center",
      alignOffset: s = 0,
      arrowPadding: a = 0,
      avoidCollisions: l = !0,
      collisionBoundary: u = [],
      collisionPadding: d = 0,
      sticky: g = "partial",
      hideWhenDetached: I = !1,
      updatePositionStrategy: m = "optimized",
      onPlaced: p,
      ...f
    } = e, b = Ea(Bo, n), [N, j] = O(null), h = K(t, (Bt) => j(Bt)), [v, w] = O(null), S = Q5(v), D = (S == null ? void 0 : S.width) ?? 0, x = (S == null ? void 0 : S.height) ?? 0, P = r + (i !== "center" ? "-" + i : ""), U = typeof d == "number" ? d : { top: 0, right: 0, bottom: 0, left: 0, ...d }, W = Array.isArray(u) ? u : [u], E = W.length > 0, R = {
      padding: U,
      boundary: W.filter($5),
      // with `strategy: 'fixed'`, this is the only way to get it to respect boundaries
      altBoundary: E
    }, { refs: G, floatingStyles: ee, placement: Z, isPositioned: ae, middlewareData: $ } = H5({
      // default to `fixed` strategy so users don't have to pick and we also avoid focus scroll issues
      strategy: "fixed",
      placement: P,
      whileElementsMounted: (...Bt) => W5(...Bt, {
        animationFrame: m === "always"
      }),
      elements: {
        reference: b.anchor
      },
      middleware: [
        b5({ mainAxis: o + x, alignmentAxis: s }),
        l && N5({
          mainAxis: !0,
          crossAxis: !1,
          limiter: g === "partial" ? j5() : void 0,
          ...R
        }),
        l && m5({ ...R }),
        y5({
          ...R,
          apply: ({ elements: Bt, rects: zi, availableWidth: wd, availableHeight: Dd }) => {
            const { width: Sd, height: xd } = zi.reference, Mn = Bt.floating.style;
            Mn.setProperty("--radix-popper-available-width", `${wd}px`), Mn.setProperty("--radix-popper-available-height", `${Dd}px`), Mn.setProperty("--radix-popper-anchor-width", `${Sd}px`), Mn.setProperty("--radix-popper-anchor-height", `${xd}px`);
          }
        }),
        v && R5({ element: v, padding: a }),
        q5({ arrowWidth: D, arrowHeight: x }),
        I && p5({ strategy: "referenceHidden", ...R })
      ]
    }), [k, ie] = Ra(Z), X = Ae(p);
    Le(() => {
      ae && (X == null || X());
    }, [ae, X]);
    const Te = (Ee = $.arrow) == null ? void 0 : Ee.x, Rt = (Gt = $.arrow) == null ? void 0 : Gt.y, Ht = ((fe = $.arrow) == null ? void 0 : fe.centerOffset) !== 0, [gn, st] = O();
    return Le(() => {
      N && st(window.getComputedStyle(N).zIndex);
    }, [N]), /* @__PURE__ */ M.jsx(
      "div",
      {
        ref: G.setFloating,
        "data-radix-popper-content-wrapper": "",
        style: {
          ...ee,
          transform: ae ? ee.transform : "translate(0, -200%)",
          // keep off the page when measuring
          minWidth: "max-content",
          zIndex: gn,
          "--radix-popper-transform-origin": [
            (Yt = $.transformOrigin) == null ? void 0 : Yt.x,
            (Ti = $.transformOrigin) == null ? void 0 : Ti.y
          ].join(" "),
          // hide the content if using the hide middleware and should be hidden
          // set visibility to hidden and disable pointer events so the UI behaves
          // as if the PopperContent isn't there at all
          ...((ki = $.hide) == null ? void 0 : ki.referenceHidden) && {
            visibility: "hidden",
            pointerEvents: "none"
          }
        },
        dir: e.dir,
        children: /* @__PURE__ */ M.jsx(
          V5,
          {
            scope: n,
            placedSide: k,
            onArrowChange: w,
            arrowX: Te,
            arrowY: Rt,
            shouldHideArrow: Ht,
            children: /* @__PURE__ */ M.jsx(
              V.div,
              {
                "data-side": k,
                "data-align": ie,
                ...f,
                ref: h,
                style: {
                  ...f.style,
                  // if the PopperContent hasn't been placed yet (not all measurements done)
                  // we prevent animations so that users's animation don't kick in too early referring wrong sides
                  animation: ae ? void 0 : "none"
                }
              }
            )
          }
        )
      }
    );
  }
);
Oa.displayName = Bo;
var Wa = "PopperArrow", F5 = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
}, Ua = y(function(t, n) {
  const { __scopePopper: r, ...o } = t, i = X5(Wa, r), s = F5[i.placedSide];
  return (
    // we have to use an extra wrapper because `ResizeObserver` (used by `useSize`)
    // doesn't report size as we'd expect on SVG elements.
    // it reports their bounding box which is effectively the largest path inside the SVG.
    /* @__PURE__ */ M.jsx(
      "span",
      {
        ref: i.onArrowChange,
        style: {
          position: "absolute",
          left: i.arrowX,
          top: i.arrowY,
          [s]: 0,
          transformOrigin: {
            top: "",
            right: "0 0",
            bottom: "center 0",
            left: "100% 0"
          }[i.placedSide],
          transform: {
            top: "translateY(100%)",
            right: "translateY(50%) rotate(90deg) translateX(-50%)",
            bottom: "rotate(180deg)",
            left: "translateY(50%) rotate(-90deg) translateX(50%)"
          }[i.placedSide],
          visibility: i.shouldHideArrow ? "hidden" : void 0
        },
        children: /* @__PURE__ */ M.jsx(
          Y5,
          {
            ...o,
            ref: n,
            style: {
              ...o.style,
              // ensures the element can be measured correctly (mostly for if SVG)
              display: "block"
            }
          }
        )
      }
    )
  );
});
Ua.displayName = Wa;
function $5(e) {
  return e !== null;
}
var q5 = (e) => ({
  name: "transformOrigin",
  options: e,
  fn(t) {
    var b, N, j;
    const { placement: n, rects: r, middlewareData: o } = t, s = ((b = o.arrow) == null ? void 0 : b.centerOffset) !== 0, a = s ? 0 : e.arrowWidth, l = s ? 0 : e.arrowHeight, [u, d] = Ra(n), g = { start: "0%", center: "50%", end: "100%" }[d], I = (((N = o.arrow) == null ? void 0 : N.x) ?? 0) + a / 2, m = (((j = o.arrow) == null ? void 0 : j.y) ?? 0) + l / 2;
    let p = "", f = "";
    return u === "bottom" ? (p = s ? g : `${I}px`, f = `${-l}px`) : u === "top" ? (p = s ? g : `${I}px`, f = `${r.floating.height + l}px`) : u === "right" ? (p = `${-l}px`, f = s ? g : `${m}px`) : u === "left" && (p = `${r.floating.width + l}px`, f = s ? g : `${m}px`), { data: { x: p, y: f } };
  }
});
function Ra(e) {
  const [t, n = "center"] = e.split("-");
  return [t, n];
}
var Ha = Pa, Ga = _a, Ya = Oa, Ba = Ua, K5 = "Portal", Qo = y((e, t) => {
  var a;
  const { container: n, ...r } = e, [o, i] = O(!1);
  Le(() => i(!0), []);
  const s = n || o && ((a = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : a.body);
  return s ? Pm.createPortal(/* @__PURE__ */ M.jsx(V.div, { ...r, ref: t }), s) : null;
});
Qo.displayName = K5;
function ep(e, t) {
  return nn((n, r) => t[n][r] ?? n, e);
}
var an = (e) => {
  const { present: t, children: n } = e, r = tp(t), o = typeof n == "function" ? n({ present: r.isPresent }) : we.only(n), i = K(r.ref, np(o));
  return typeof n == "function" || r.isPresent ? It(o, { ref: i }) : null;
};
an.displayName = "Presence";
function tp(e) {
  const [t, n] = O(), r = A({}), o = A(e), i = A("none"), s = e ? "mounted" : "unmounted", [a, l] = ep(s, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  return C(() => {
    const u = mn(r.current);
    i.current = a === "mounted" ? u : "none";
  }, [a]), Le(() => {
    const u = r.current, d = o.current;
    if (d !== e) {
      const I = i.current, m = mn(u);
      e ? l("MOUNT") : m === "none" || (u == null ? void 0 : u.display) === "none" ? l("UNMOUNT") : l(d && I !== m ? "ANIMATION_OUT" : "UNMOUNT"), o.current = e;
    }
  }, [e, l]), Le(() => {
    if (t) {
      let u;
      const d = t.ownerDocument.defaultView ?? window, g = (m) => {
        const f = mn(r.current).includes(m.animationName);
        if (m.target === t && f && (l("ANIMATION_END"), !o.current)) {
          const b = t.style.animationFillMode;
          t.style.animationFillMode = "forwards", u = d.setTimeout(() => {
            t.style.animationFillMode === "forwards" && (t.style.animationFillMode = b);
          });
        }
      }, I = (m) => {
        m.target === t && (i.current = mn(r.current));
      };
      return t.addEventListener("animationstart", I), t.addEventListener("animationcancel", g), t.addEventListener("animationend", g), () => {
        d.clearTimeout(u), t.removeEventListener("animationstart", I), t.removeEventListener("animationcancel", g), t.removeEventListener("animationend", g);
      };
    } else
      l("ANIMATION_END");
  }, [t, l]), {
    isPresent: ["mounted", "unmountSuspended"].includes(a),
    ref: L((u) => {
      u && (r.current = getComputedStyle(u)), n(u);
    }, [])
  };
}
function mn(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
function np(e) {
  var r, o;
  let t = (r = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : r.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = (o = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : o.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
function rp(e) {
  const t = e + "CollectionProvider", [n, r] = Go(t), [o, i] = n(
    t,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), s = (m) => {
    const { scope: p, children: f } = m, b = Y.useRef(null), N = Y.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ M.jsx(o, { scope: p, itemMap: N, collectionRef: b, children: f });
  };
  s.displayName = t;
  const a = e + "CollectionSlot", l = Y.forwardRef(
    (m, p) => {
      const { scope: f, children: b } = m, N = i(a, f), j = K(p, N.collectionRef);
      return /* @__PURE__ */ M.jsx(ce, { ref: j, children: b });
    }
  );
  l.displayName = a;
  const u = e + "CollectionItemSlot", d = "data-radix-collection-item", g = Y.forwardRef(
    (m, p) => {
      const { scope: f, children: b, ...N } = m, j = Y.useRef(null), h = K(p, j), v = i(u, f);
      return Y.useEffect(() => (v.itemMap.set(j, { ref: j, ...N }), () => void v.itemMap.delete(j))), /* @__PURE__ */ M.jsx(ce, { [d]: "", ref: h, children: b });
    }
  );
  g.displayName = u;
  function I(m) {
    const p = i(e + "CollectionConsumer", m);
    return Y.useCallback(() => {
      const b = p.collectionRef.current;
      if (!b)
        return [];
      const N = Array.from(b.querySelectorAll(`[${d}]`));
      return Array.from(p.itemMap.values()).sort(
        (v, w) => N.indexOf(v.ref.current) - N.indexOf(w.ref.current)
      );
    }, [p.collectionRef, p.itemMap]);
  }
  return [
    { Provider: s, Slot: l, ItemSlot: g },
    I,
    r
  ];
}
var Hr = "rovingFocusGroup.onEntryFocus", op = { bubbles: !1, cancelable: !0 }, ar = "RovingFocusGroup", [oo, Qa, ip] = rp(ar), [sp, cr] = Go(
  ar,
  [ip]
), [ap, cp] = sp(ar), Ja = y(
  (e, t) => /* @__PURE__ */ M.jsx(oo.Provider, { scope: e.__scopeRovingFocusGroup, children: /* @__PURE__ */ M.jsx(oo.Slot, { scope: e.__scopeRovingFocusGroup, children: /* @__PURE__ */ M.jsx(lp, { ...e, ref: t }) }) })
);
Ja.displayName = ar;
var lp = y((e, t) => {
  const {
    __scopeRovingFocusGroup: n,
    orientation: r,
    loop: o = !1,
    dir: i,
    currentTabStopId: s,
    defaultCurrentTabStopId: a,
    onCurrentTabStopIdChange: l,
    onEntryFocus: u,
    preventScrollOnEntryFocus: d = !1,
    ...g
  } = e, I = A(null), m = K(t, I), p = Po(i), [f = null, b] = on({
    prop: s,
    defaultProp: a,
    onChange: l
  }), [N, j] = O(!1), h = Ae(u), v = Qa(n), w = A(!1), [S, D] = O(0);
  return C(() => {
    const x = I.current;
    if (x)
      return x.addEventListener(Hr, h), () => x.removeEventListener(Hr, h);
  }, [h]), /* @__PURE__ */ M.jsx(
    ap,
    {
      scope: n,
      orientation: r,
      dir: p,
      loop: o,
      currentTabStopId: f,
      onItemFocus: L(
        (x) => b(x),
        [b]
      ),
      onItemShiftTab: L(() => j(!0), []),
      onFocusableItemAdd: L(
        () => D((x) => x + 1),
        []
      ),
      onFocusableItemRemove: L(
        () => D((x) => x - 1),
        []
      ),
      children: /* @__PURE__ */ M.jsx(
        V.div,
        {
          tabIndex: N || S === 0 ? -1 : 0,
          "data-orientation": r,
          ...g,
          ref: m,
          style: { outline: "none", ...e.style },
          onMouseDown: z(e.onMouseDown, () => {
            w.current = !0;
          }),
          onFocus: z(e.onFocus, (x) => {
            const P = !w.current;
            if (x.target === x.currentTarget && P && !N) {
              const U = new CustomEvent(Hr, op);
              if (x.currentTarget.dispatchEvent(U), !U.defaultPrevented) {
                const W = v().filter((Z) => Z.focusable), E = W.find((Z) => Z.active), R = W.find((Z) => Z.id === f), ee = [E, R, ...W].filter(
                  Boolean
                ).map((Z) => Z.ref.current);
                Fa(ee, d);
              }
            }
            w.current = !1;
          }),
          onBlur: z(e.onBlur, () => j(!1))
        }
      )
    }
  );
}), Va = "RovingFocusGroupItem", Xa = y(
  (e, t) => {
    const {
      __scopeRovingFocusGroup: n,
      focusable: r = !0,
      active: o = !1,
      tabStopId: i,
      ...s
    } = e, a = Ke(), l = i || a, u = cp(Va, n), d = u.currentTabStopId === l, g = Qa(n), { onFocusableItemAdd: I, onFocusableItemRemove: m } = u;
    return C(() => {
      if (r)
        return I(), () => m();
    }, [r, I, m]), /* @__PURE__ */ M.jsx(
      oo.ItemSlot,
      {
        scope: n,
        id: l,
        focusable: r,
        active: o,
        children: /* @__PURE__ */ M.jsx(
          V.span,
          {
            tabIndex: d ? 0 : -1,
            "data-orientation": u.orientation,
            ...s,
            ref: t,
            onMouseDown: z(e.onMouseDown, (p) => {
              r ? u.onItemFocus(l) : p.preventDefault();
            }),
            onFocus: z(e.onFocus, () => u.onItemFocus(l)),
            onKeyDown: z(e.onKeyDown, (p) => {
              if (p.key === "Tab" && p.shiftKey) {
                u.onItemShiftTab();
                return;
              }
              if (p.target !== p.currentTarget)
                return;
              const f = gp(p, u.orientation, u.dir);
              if (f !== void 0) {
                if (p.metaKey || p.ctrlKey || p.altKey || p.shiftKey)
                  return;
                p.preventDefault();
                let N = g().filter((j) => j.focusable).map((j) => j.ref.current);
                if (f === "last")
                  N.reverse();
                else if (f === "prev" || f === "next") {
                  f === "prev" && N.reverse();
                  const j = N.indexOf(p.currentTarget);
                  N = u.loop ? Mp(N, j + 1) : N.slice(j + 1);
                }
                setTimeout(() => Fa(N));
              }
            })
          }
        )
      }
    );
  }
);
Xa.displayName = Va;
var up = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function dp(e, t) {
  return t !== "rtl" ? e : e === "ArrowLeft" ? "ArrowRight" : e === "ArrowRight" ? "ArrowLeft" : e;
}
function gp(e, t, n) {
  const r = dp(e.key, n);
  if (!(t === "vertical" && ["ArrowLeft", "ArrowRight"].includes(r)) && !(t === "horizontal" && ["ArrowUp", "ArrowDown"].includes(r)))
    return up[r];
}
function Fa(e, t = !1) {
  const n = document.activeElement;
  for (const r of e)
    if (r === n || (r.focus({ preventScroll: t }), document.activeElement !== n))
      return;
}
function Mp(e, t) {
  return e.map((n, r) => e[(t + r) % e.length]);
}
var $a = Ja, qa = Xa, Ip = function(e) {
  if (typeof document > "u")
    return null;
  var t = Array.isArray(e) ? e[0] : e;
  return t.ownerDocument.body;
}, yt = /* @__PURE__ */ new WeakMap(), pn = /* @__PURE__ */ new WeakMap(), fn = {}, Gr = 0, Ka = function(e) {
  return e && (e.host || Ka(e.parentNode));
}, mp = function(e, t) {
  return t.map(function(n) {
    if (e.contains(n))
      return n;
    var r = Ka(n);
    return r && e.contains(r) ? r : (console.error("aria-hidden", n, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(n) {
    return !!n;
  });
}, pp = function(e, t, n, r) {
  var o = mp(t, Array.isArray(e) ? e : [e]);
  fn[n] || (fn[n] = /* @__PURE__ */ new WeakMap());
  var i = fn[n], s = [], a = /* @__PURE__ */ new Set(), l = new Set(o), u = function(g) {
    !g || a.has(g) || (a.add(g), u(g.parentNode));
  };
  o.forEach(u);
  var d = function(g) {
    !g || l.has(g) || Array.prototype.forEach.call(g.children, function(I) {
      if (a.has(I))
        d(I);
      else {
        var m = I.getAttribute(r), p = m !== null && m !== "false", f = (yt.get(I) || 0) + 1, b = (i.get(I) || 0) + 1;
        yt.set(I, f), i.set(I, b), s.push(I), f === 1 && p && pn.set(I, !0), b === 1 && I.setAttribute(n, "true"), p || I.setAttribute(r, "true");
      }
    });
  };
  return d(t), a.clear(), Gr++, function() {
    s.forEach(function(g) {
      var I = yt.get(g) - 1, m = i.get(g) - 1;
      yt.set(g, I), i.set(g, m), I || (pn.has(g) || g.removeAttribute(r), pn.delete(g)), m || g.removeAttribute(n);
    }), Gr--, Gr || (yt = /* @__PURE__ */ new WeakMap(), yt = /* @__PURE__ */ new WeakMap(), pn = /* @__PURE__ */ new WeakMap(), fn = {});
  };
}, ec = function(e, t, n) {
  n === void 0 && (n = "data-aria-hidden");
  var r = Array.from(Array.isArray(e) ? e : [e]), o = t || Ip(e);
  return o ? (r.push.apply(r, Array.from(o.querySelectorAll("[aria-live]"))), pp(r, o, n, "aria-hidden")) : function() {
    return null;
  };
}, ke = function() {
  return ke = Object.assign || function(t) {
    for (var n, r = 1, o = arguments.length; r < o; r++) {
      n = arguments[r];
      for (var i in n)
        Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
    }
    return t;
  }, ke.apply(this, arguments);
};
function tc(e, t) {
  var n = {};
  for (var r in e)
    Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var o = 0, r = Object.getOwnPropertySymbols(e); o < r.length; o++)
      t.indexOf(r[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[o]) && (n[r[o]] = e[r[o]]);
  return n;
}
function fp(e, t, n) {
  if (n || arguments.length === 2)
    for (var r = 0, o = t.length, i; r < o; r++)
      (i || !(r in t)) && (i || (i = Array.prototype.slice.call(t, 0, r)), i[r] = t[r]);
  return e.concat(i || Array.prototype.slice.call(t));
}
var Tn = "right-scroll-bar-position", kn = "width-before-scroll-bar", bp = "with-scroll-bars-hidden", Np = "--removed-body-scroll-bar-size";
function jp(e, t) {
  return typeof e == "function" ? e(t) : e && (e.current = t), e;
}
function yp(e, t) {
  var n = O(function() {
    return {
      // value
      value: e,
      // last callback
      callback: t,
      // "memoized" public interface
      facade: {
        get current() {
          return n.value;
        },
        set current(r) {
          var o = n.value;
          o !== r && (n.value = r, n.callback(r, o));
        }
      }
    };
  })[0];
  return n.callback = t, n.facade;
}
function hp(e, t) {
  return yp(t || null, function(n) {
    return e.forEach(function(r) {
      return jp(r, n);
    });
  });
}
function vp(e) {
  return e;
}
function wp(e, t) {
  t === void 0 && (t = vp);
  var n = [], r = !1, o = {
    read: function() {
      if (r)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return n.length ? n[n.length - 1] : e;
    },
    useMedium: function(i) {
      var s = t(i, r);
      return n.push(s), function() {
        n = n.filter(function(a) {
          return a !== s;
        });
      };
    },
    assignSyncMedium: function(i) {
      for (r = !0; n.length; ) {
        var s = n;
        n = [], s.forEach(i);
      }
      n = {
        push: function(a) {
          return i(a);
        },
        filter: function() {
          return n;
        }
      };
    },
    assignMedium: function(i) {
      r = !0;
      var s = [];
      if (n.length) {
        var a = n;
        n = [], a.forEach(i), s = n;
      }
      var l = function() {
        var d = s;
        s = [], d.forEach(i);
      }, u = function() {
        return Promise.resolve().then(l);
      };
      u(), n = {
        push: function(d) {
          s.push(d), u();
        },
        filter: function(d) {
          return s = s.filter(d), n;
        }
      };
    }
  };
  return o;
}
function Dp(e) {
  e === void 0 && (e = {});
  var t = wp(null);
  return t.options = ke({ async: !0, ssr: !1 }, e), t;
}
var nc = function(e) {
  var t = e.sideCar, n = tc(e, ["sideCar"]);
  if (!t)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var r = t.read();
  if (!r)
    throw new Error("Sidecar medium not found");
  return c(r, ke({}, n));
};
nc.isSideCarExport = !0;
function Sp(e, t) {
  return e.useMedium(t), nc;
}
var rc = Dp(), Yr = function() {
}, lr = y(function(e, t) {
  var n = A(null), r = O({
    onScrollCapture: Yr,
    onWheelCapture: Yr,
    onTouchMoveCapture: Yr
  }), o = r[0], i = r[1], s = e.forwardProps, a = e.children, l = e.className, u = e.removeScrollBar, d = e.enabled, g = e.shards, I = e.sideCar, m = e.noIsolation, p = e.inert, f = e.allowPinchZoom, b = e.as, N = b === void 0 ? "div" : b, j = e.gapMode, h = tc(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), v = I, w = hp([n, t]), S = ke(ke({}, h), o);
  return c(
    tn,
    null,
    d && c(v, { sideCar: rc, removeScrollBar: u, shards: g, noIsolation: m, inert: p, setCallbacks: i, allowPinchZoom: !!f, lockRef: n, gapMode: j }),
    s ? It(we.only(a), ke(ke({}, S), { ref: w })) : c(N, ke({}, S, { className: l, ref: w }), a)
  );
});
lr.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
lr.classNames = {
  fullWidth: kn,
  zeroRight: Tn
};
var ts, xp = function() {
  if (ts)
    return ts;
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function Ap() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var t = xp();
  return t && e.setAttribute("nonce", t), e;
}
function Lp(e, t) {
  e.styleSheet ? e.styleSheet.cssText = t : e.appendChild(document.createTextNode(t));
}
function Cp(e) {
  var t = document.head || document.getElementsByTagName("head")[0];
  t.appendChild(e);
}
var Tp = function() {
  var e = 0, t = null;
  return {
    add: function(n) {
      e == 0 && (t = Ap()) && (Lp(t, n), Cp(t)), e++;
    },
    remove: function() {
      e--, !e && t && (t.parentNode && t.parentNode.removeChild(t), t = null);
    }
  };
}, kp = function() {
  var e = Tp();
  return function(t, n) {
    C(function() {
      return e.add(t), function() {
        e.remove();
      };
    }, [t && n]);
  };
}, oc = function() {
  var e = kp(), t = function(n) {
    var r = n.styles, o = n.dynamic;
    return e(r, o), null;
  };
  return t;
}, zp = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, Br = function(e) {
  return parseInt(e || "", 10) || 0;
}, Ep = function(e) {
  var t = window.getComputedStyle(document.body), n = t[e === "padding" ? "paddingLeft" : "marginLeft"], r = t[e === "padding" ? "paddingTop" : "marginTop"], o = t[e === "padding" ? "paddingRight" : "marginRight"];
  return [Br(n), Br(r), Br(o)];
}, Pp = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return zp;
  var t = Ep(e), n = document.documentElement.clientWidth, r = window.innerWidth;
  return {
    left: t[0],
    top: t[1],
    right: t[2],
    gap: Math.max(0, r - n + t[2] - t[0])
  };
}, Zp = oc(), At = "data-scroll-locked", _p = function(e, t, n, r) {
  var o = e.left, i = e.top, s = e.right, a = e.gap;
  return n === void 0 && (n = "margin"), `
  .`.concat(bp, ` {
   overflow: hidden `).concat(r, `;
   padding-right: `).concat(a, "px ").concat(r, `;
  }
  body[`).concat(At, `] {
    overflow: hidden `).concat(r, `;
    overscroll-behavior: contain;
    `).concat([
    t && "position: relative ".concat(r, ";"),
    n === "margin" && `
    padding-left: `.concat(o, `px;
    padding-top: `).concat(i, `px;
    padding-right: `).concat(s, `px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(a, "px ").concat(r, `;
    `),
    n === "padding" && "padding-right: ".concat(a, "px ").concat(r, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(Tn, ` {
    right: `).concat(a, "px ").concat(r, `;
  }
  
  .`).concat(kn, ` {
    margin-right: `).concat(a, "px ").concat(r, `;
  }
  
  .`).concat(Tn, " .").concat(Tn, ` {
    right: 0 `).concat(r, `;
  }
  
  .`).concat(kn, " .").concat(kn, ` {
    margin-right: 0 `).concat(r, `;
  }
  
  body[`).concat(At, `] {
    `).concat(Np, ": ").concat(a, `px;
  }
`);
}, ns = function() {
  var e = parseInt(document.body.getAttribute(At) || "0", 10);
  return isFinite(e) ? e : 0;
}, Op = function() {
  C(function() {
    return document.body.setAttribute(At, (ns() + 1).toString()), function() {
      var e = ns() - 1;
      e <= 0 ? document.body.removeAttribute(At) : document.body.setAttribute(At, e.toString());
    };
  }, []);
}, Wp = function(e) {
  var t = e.noRelative, n = e.noImportant, r = e.gapMode, o = r === void 0 ? "margin" : r;
  Op();
  var i = H(function() {
    return Pp(o);
  }, [o]);
  return c(Zp, { styles: _p(i, !t, o, n ? "" : "!important") });
}, io = !1;
if (typeof window < "u")
  try {
    var bn = Object.defineProperty({}, "passive", {
      get: function() {
        return io = !0, !0;
      }
    });
    window.addEventListener("test", bn, bn), window.removeEventListener("test", bn, bn);
  } catch {
    io = !1;
  }
var ht = io ? { passive: !1 } : !1, Up = function(e) {
  return e.tagName === "TEXTAREA";
}, ic = function(e, t) {
  if (!(e instanceof Element))
    return !1;
  var n = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    n[t] !== "hidden" && // contains scroll inside self
    !(n.overflowY === n.overflowX && !Up(e) && n[t] === "visible")
  );
}, Rp = function(e) {
  return ic(e, "overflowY");
}, Hp = function(e) {
  return ic(e, "overflowX");
}, rs = function(e, t) {
  var n = t.ownerDocument, r = t;
  do {
    typeof ShadowRoot < "u" && r instanceof ShadowRoot && (r = r.host);
    var o = sc(e, r);
    if (o) {
      var i = ac(e, r), s = i[1], a = i[2];
      if (s > a)
        return !0;
    }
    r = r.parentNode;
  } while (r && r !== n.body);
  return !1;
}, Gp = function(e) {
  var t = e.scrollTop, n = e.scrollHeight, r = e.clientHeight;
  return [
    t,
    n,
    r
  ];
}, Yp = function(e) {
  var t = e.scrollLeft, n = e.scrollWidth, r = e.clientWidth;
  return [
    t,
    n,
    r
  ];
}, sc = function(e, t) {
  return e === "v" ? Rp(t) : Hp(t);
}, ac = function(e, t) {
  return e === "v" ? Gp(t) : Yp(t);
}, Bp = function(e, t) {
  return e === "h" && t === "rtl" ? -1 : 1;
}, Qp = function(e, t, n, r, o) {
  var i = Bp(e, window.getComputedStyle(t).direction), s = i * r, a = n.target, l = t.contains(a), u = !1, d = s > 0, g = 0, I = 0;
  do {
    var m = ac(e, a), p = m[0], f = m[1], b = m[2], N = f - b - i * p;
    (p || N) && sc(e, a) && (g += N, I += p), a instanceof ShadowRoot ? a = a.host : a = a.parentNode;
  } while (
    // portaled content
    !l && a !== document.body || // self content
    l && (t.contains(a) || t === a)
  );
  return (d && (o && Math.abs(g) < 1 || !o && s > g) || !d && (o && Math.abs(I) < 1 || !o && -s > I)) && (u = !0), u;
}, Nn = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, os = function(e) {
  return [e.deltaX, e.deltaY];
}, is = function(e) {
  return e && "current" in e ? e.current : e;
}, Jp = function(e, t) {
  return e[0] === t[0] && e[1] === t[1];
}, Vp = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, Xp = 0, vt = [];
function Fp(e) {
  var t = A([]), n = A([0, 0]), r = A(), o = O(Xp++)[0], i = O(oc)[0], s = A(e);
  C(function() {
    s.current = e;
  }, [e]), C(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(o));
      var f = fp([e.lockRef.current], (e.shards || []).map(is), !0).filter(Boolean);
      return f.forEach(function(b) {
        return b.classList.add("allow-interactivity-".concat(o));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(o)), f.forEach(function(b) {
          return b.classList.remove("allow-interactivity-".concat(o));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var a = L(function(f, b) {
    if ("touches" in f && f.touches.length === 2 || f.type === "wheel" && f.ctrlKey)
      return !s.current.allowPinchZoom;
    var N = Nn(f), j = n.current, h = "deltaX" in f ? f.deltaX : j[0] - N[0], v = "deltaY" in f ? f.deltaY : j[1] - N[1], w, S = f.target, D = Math.abs(h) > Math.abs(v) ? "h" : "v";
    if ("touches" in f && D === "h" && S.type === "range")
      return !1;
    var x = rs(D, S);
    if (!x)
      return !0;
    if (x ? w = D : (w = D === "v" ? "h" : "v", x = rs(D, S)), !x)
      return !1;
    if (!r.current && "changedTouches" in f && (h || v) && (r.current = w), !w)
      return !0;
    var P = r.current || w;
    return Qp(P, b, f, P === "h" ? h : v, !0);
  }, []), l = L(function(f) {
    var b = f;
    if (!(!vt.length || vt[vt.length - 1] !== i)) {
      var N = "deltaY" in b ? os(b) : Nn(b), j = t.current.filter(function(w) {
        return w.name === b.type && (w.target === b.target || b.target === w.shadowParent) && Jp(w.delta, N);
      })[0];
      if (j && j.should) {
        b.cancelable && b.preventDefault();
        return;
      }
      if (!j) {
        var h = (s.current.shards || []).map(is).filter(Boolean).filter(function(w) {
          return w.contains(b.target);
        }), v = h.length > 0 ? a(b, h[0]) : !s.current.noIsolation;
        v && b.cancelable && b.preventDefault();
      }
    }
  }, []), u = L(function(f, b, N, j) {
    var h = { name: f, delta: b, target: N, should: j, shadowParent: $p(N) };
    t.current.push(h), setTimeout(function() {
      t.current = t.current.filter(function(v) {
        return v !== h;
      });
    }, 1);
  }, []), d = L(function(f) {
    n.current = Nn(f), r.current = void 0;
  }, []), g = L(function(f) {
    u(f.type, os(f), f.target, a(f, e.lockRef.current));
  }, []), I = L(function(f) {
    u(f.type, Nn(f), f.target, a(f, e.lockRef.current));
  }, []);
  C(function() {
    return vt.push(i), e.setCallbacks({
      onScrollCapture: g,
      onWheelCapture: g,
      onTouchMoveCapture: I
    }), document.addEventListener("wheel", l, ht), document.addEventListener("touchmove", l, ht), document.addEventListener("touchstart", d, ht), function() {
      vt = vt.filter(function(f) {
        return f !== i;
      }), document.removeEventListener("wheel", l, ht), document.removeEventListener("touchmove", l, ht), document.removeEventListener("touchstart", d, ht);
    };
  }, []);
  var m = e.removeScrollBar, p = e.inert;
  return c(
    tn,
    null,
    p ? c(i, { styles: Vp(o) }) : null,
    m ? c(Wp, { gapMode: e.gapMode }) : null
  );
}
function $p(e) {
  for (var t = null; e !== null; )
    e instanceof ShadowRoot && (t = e.host, e = e.host), e = e.parentNode;
  return t;
}
const qp = Sp(rc, Fp);
var cc = y(function(e, t) {
  return c(lr, ke({}, e, { ref: t, sideCar: qp }));
});
cc.classNames = lr.classNames;
const lc = cc;
var so = ["Enter", " "], Kp = ["ArrowDown", "PageUp", "Home"], uc = ["ArrowUp", "PageDown", "End"], ef = [...Kp, ...uc], tf = {
  ltr: [...so, "ArrowRight"],
  rtl: [...so, "ArrowLeft"]
}, nf = {
  ltr: ["ArrowLeft"],
  rtl: ["ArrowRight"]
}, cn = "Menu", [qt, rf, of] = Wm(cn), [mt, dc] = Um(cn, [
  of,
  sr,
  cr
]), ur = sr(), gc = cr(), [sf, pt] = mt(cn), [af, ln] = mt(cn), Mc = (e) => {
  const { __scopeMenu: t, open: n = !1, children: r, dir: o, onOpenChange: i, modal: s = !0 } = e, a = ur(t), [l, u] = O(null), d = A(!1), g = Ae(i), I = Po(o);
  return C(() => {
    const m = () => {
      d.current = !0, document.addEventListener("pointerdown", p, { capture: !0, once: !0 }), document.addEventListener("pointermove", p, { capture: !0, once: !0 });
    }, p = () => d.current = !1;
    return document.addEventListener("keydown", m, { capture: !0 }), () => {
      document.removeEventListener("keydown", m, { capture: !0 }), document.removeEventListener("pointerdown", p, { capture: !0 }), document.removeEventListener("pointermove", p, { capture: !0 });
    };
  }, []), /* @__PURE__ */ M.jsx(Ha, { ...a, children: /* @__PURE__ */ M.jsx(
    sf,
    {
      scope: t,
      open: n,
      onOpenChange: g,
      content: l,
      onContentChange: u,
      children: /* @__PURE__ */ M.jsx(
        af,
        {
          scope: t,
          onClose: L(() => g(!1), [g]),
          isUsingKeyboardRef: d,
          dir: I,
          modal: s,
          children: r
        }
      )
    }
  ) });
};
Mc.displayName = cn;
var cf = "MenuAnchor", Jo = y(
  (e, t) => {
    const { __scopeMenu: n, ...r } = e, o = ur(n);
    return /* @__PURE__ */ M.jsx(Ga, { ...o, ...r, ref: t });
  }
);
Jo.displayName = cf;
var Vo = "MenuPortal", [lf, Ic] = mt(Vo, {
  forceMount: void 0
}), mc = (e) => {
  const { __scopeMenu: t, forceMount: n, children: r, container: o } = e, i = pt(Vo, t);
  return /* @__PURE__ */ M.jsx(lf, { scope: t, forceMount: n, children: /* @__PURE__ */ M.jsx(an, { present: n || i.open, children: /* @__PURE__ */ M.jsx(Qo, { asChild: !0, container: o, children: r }) }) });
};
mc.displayName = Vo;
var Ne = "MenuContent", [uf, Xo] = mt(Ne), pc = y(
  (e, t) => {
    const n = Ic(Ne, e.__scopeMenu), { forceMount: r = n.forceMount, ...o } = e, i = pt(Ne, e.__scopeMenu), s = ln(Ne, e.__scopeMenu);
    return /* @__PURE__ */ M.jsx(qt.Provider, { scope: e.__scopeMenu, children: /* @__PURE__ */ M.jsx(an, { present: r || i.open, children: /* @__PURE__ */ M.jsx(qt.Slot, { scope: e.__scopeMenu, children: s.modal ? /* @__PURE__ */ M.jsx(df, { ...o, ref: t }) : /* @__PURE__ */ M.jsx(gf, { ...o, ref: t }) }) }) });
  }
), df = y(
  (e, t) => {
    const n = pt(Ne, e.__scopeMenu), r = A(null), o = K(t, r);
    return C(() => {
      const i = r.current;
      if (i)
        return ec(i);
    }, []), /* @__PURE__ */ M.jsx(
      Fo,
      {
        ...e,
        ref: o,
        trapFocus: n.open,
        disableOutsidePointerEvents: n.open,
        disableOutsideScroll: !0,
        onFocusOutside: z(
          e.onFocusOutside,
          (i) => i.preventDefault(),
          { checkForDefaultPrevented: !1 }
        ),
        onDismiss: () => n.onOpenChange(!1)
      }
    );
  }
), gf = y((e, t) => {
  const n = pt(Ne, e.__scopeMenu);
  return /* @__PURE__ */ M.jsx(
    Fo,
    {
      ...e,
      ref: t,
      trapFocus: !1,
      disableOutsidePointerEvents: !1,
      disableOutsideScroll: !1,
      onDismiss: () => n.onOpenChange(!1)
    }
  );
}), Fo = y(
  (e, t) => {
    const {
      __scopeMenu: n,
      loop: r = !1,
      trapFocus: o,
      onOpenAutoFocus: i,
      onCloseAutoFocus: s,
      disableOutsidePointerEvents: a,
      onEntryFocus: l,
      onEscapeKeyDown: u,
      onPointerDownOutside: d,
      onFocusOutside: g,
      onInteractOutside: I,
      onDismiss: m,
      disableOutsideScroll: p,
      ...f
    } = e, b = pt(Ne, n), N = ln(Ne, n), j = ur(n), h = gc(n), v = rf(n), [w, S] = O(null), D = A(null), x = K(t, D, b.onContentChange), P = A(0), U = A(""), W = A(0), E = A(null), R = A("right"), G = A(0), ee = p ? lc : tn, Z = p ? { as: ce, allowPinchZoom: !0 } : void 0, ae = (k) => {
      var Ee, Gt;
      const ie = U.current + k, X = v().filter((fe) => !fe.disabled), Te = document.activeElement, Rt = (Ee = X.find((fe) => fe.ref.current === Te)) == null ? void 0 : Ee.textValue, Ht = X.map((fe) => fe.textValue), gn = wf(Ht, ie, Rt), st = (Gt = X.find((fe) => fe.textValue === gn)) == null ? void 0 : Gt.ref.current;
      (function fe(Yt) {
        U.current = Yt, window.clearTimeout(P.current), Yt !== "" && (P.current = window.setTimeout(() => fe(""), 1e3));
      })(ie), st && setTimeout(() => st.focus());
    };
    C(() => () => window.clearTimeout(P.current), []), ya();
    const $ = L((k) => {
      var X, Te;
      return R.current === ((X = E.current) == null ? void 0 : X.side) && Sf(k, (Te = E.current) == null ? void 0 : Te.area);
    }, []);
    return /* @__PURE__ */ M.jsx(
      uf,
      {
        scope: n,
        searchRef: U,
        onItemEnter: L(
          (k) => {
            $(k) && k.preventDefault();
          },
          [$]
        ),
        onItemLeave: L(
          (k) => {
            var ie;
            $(k) || ((ie = D.current) == null || ie.focus(), S(null));
          },
          [$]
        ),
        onTriggerLeave: L(
          (k) => {
            $(k) && k.preventDefault();
          },
          [$]
        ),
        pointerGraceTimerRef: W,
        onPointerGraceIntentChange: L((k) => {
          E.current = k;
        }, []),
        children: /* @__PURE__ */ M.jsx(ee, { ...Z, children: /* @__PURE__ */ M.jsx(
          Zo,
          {
            asChild: !0,
            trapped: o,
            onMountAutoFocus: z(i, (k) => {
              var ie;
              k.preventDefault(), (ie = D.current) == null || ie.focus({ preventScroll: !0 });
            }),
            onUnmountAutoFocus: s,
            children: /* @__PURE__ */ M.jsx(
              rr,
              {
                asChild: !0,
                disableOutsidePointerEvents: a,
                onEscapeKeyDown: u,
                onPointerDownOutside: d,
                onFocusOutside: g,
                onInteractOutside: I,
                onDismiss: m,
                children: /* @__PURE__ */ M.jsx(
                  $a,
                  {
                    asChild: !0,
                    ...h,
                    dir: N.dir,
                    orientation: "vertical",
                    loop: r,
                    currentTabStopId: w,
                    onCurrentTabStopIdChange: S,
                    onEntryFocus: z(l, (k) => {
                      N.isUsingKeyboardRef.current || k.preventDefault();
                    }),
                    preventScrollOnEntryFocus: !0,
                    children: /* @__PURE__ */ M.jsx(
                      Ya,
                      {
                        role: "menu",
                        "aria-orientation": "vertical",
                        "data-state": kc(b.open),
                        "data-radix-menu-content": "",
                        dir: N.dir,
                        ...j,
                        ...f,
                        ref: x,
                        style: { outline: "none", ...f.style },
                        onKeyDown: z(f.onKeyDown, (k) => {
                          const X = k.target.closest("[data-radix-menu-content]") === k.currentTarget, Te = k.ctrlKey || k.altKey || k.metaKey, Rt = k.key.length === 1;
                          X && (k.key === "Tab" && k.preventDefault(), !Te && Rt && ae(k.key));
                          const Ht = D.current;
                          if (k.target !== Ht || !ef.includes(k.key))
                            return;
                          k.preventDefault();
                          const st = v().filter((Ee) => !Ee.disabled).map((Ee) => Ee.ref.current);
                          uc.includes(k.key) && st.reverse(), hf(st);
                        }),
                        onBlur: z(e.onBlur, (k) => {
                          k.currentTarget.contains(k.target) || (window.clearTimeout(P.current), U.current = "");
                        }),
                        onPointerMove: z(
                          e.onPointerMove,
                          Kt((k) => {
                            const ie = k.target, X = G.current !== k.clientX;
                            if (k.currentTarget.contains(ie) && X) {
                              const Te = k.clientX > G.current ? "right" : "left";
                              R.current = Te, G.current = k.clientX;
                            }
                          })
                        )
                      }
                    )
                  }
                )
              }
            )
          }
        ) })
      }
    );
  }
);
pc.displayName = Ne;
var Mf = "MenuGroup", $o = y(
  (e, t) => {
    const { __scopeMenu: n, ...r } = e;
    return /* @__PURE__ */ M.jsx(V.div, { role: "group", ...r, ref: t });
  }
);
$o.displayName = Mf;
var If = "MenuLabel", fc = y(
  (e, t) => {
    const { __scopeMenu: n, ...r } = e;
    return /* @__PURE__ */ M.jsx(V.div, { ...r, ref: t });
  }
);
fc.displayName = If;
var Yn = "MenuItem", ss = "menu.itemSelect", dr = y(
  (e, t) => {
    const { disabled: n = !1, onSelect: r, ...o } = e, i = A(null), s = ln(Yn, e.__scopeMenu), a = Xo(Yn, e.__scopeMenu), l = K(t, i), u = A(!1), d = () => {
      const g = i.current;
      if (!n && g) {
        const I = new CustomEvent(ss, { bubbles: !0, cancelable: !0 });
        g.addEventListener(ss, (m) => r == null ? void 0 : r(m), { once: !0 }), ba(g, I), I.defaultPrevented ? u.current = !1 : s.onClose();
      }
    };
    return /* @__PURE__ */ M.jsx(
      bc,
      {
        ...o,
        ref: l,
        disabled: n,
        onClick: z(e.onClick, d),
        onPointerDown: (g) => {
          var I;
          (I = e.onPointerDown) == null || I.call(e, g), u.current = !0;
        },
        onPointerUp: z(e.onPointerUp, (g) => {
          var I;
          u.current || (I = g.currentTarget) == null || I.click();
        }),
        onKeyDown: z(e.onKeyDown, (g) => {
          const I = a.searchRef.current !== "";
          n || I && g.key === " " || so.includes(g.key) && (g.currentTarget.click(), g.preventDefault());
        })
      }
    );
  }
);
dr.displayName = Yn;
var bc = y(
  (e, t) => {
    const { __scopeMenu: n, disabled: r = !1, textValue: o, ...i } = e, s = Xo(Yn, n), a = gc(n), l = A(null), u = K(t, l), [d, g] = O(!1), [I, m] = O("");
    return C(() => {
      const p = l.current;
      p && m((p.textContent ?? "").trim());
    }, [i.children]), /* @__PURE__ */ M.jsx(
      qt.ItemSlot,
      {
        scope: n,
        disabled: r,
        textValue: o ?? I,
        children: /* @__PURE__ */ M.jsx(qa, { asChild: !0, ...a, focusable: !r, children: /* @__PURE__ */ M.jsx(
          V.div,
          {
            role: "menuitem",
            "data-highlighted": d ? "" : void 0,
            "aria-disabled": r || void 0,
            "data-disabled": r ? "" : void 0,
            ...i,
            ref: u,
            onPointerMove: z(
              e.onPointerMove,
              Kt((p) => {
                r ? s.onItemLeave(p) : (s.onItemEnter(p), p.defaultPrevented || p.currentTarget.focus({ preventScroll: !0 }));
              })
            ),
            onPointerLeave: z(
              e.onPointerLeave,
              Kt((p) => s.onItemLeave(p))
            ),
            onFocus: z(e.onFocus, () => g(!0)),
            onBlur: z(e.onBlur, () => g(!1))
          }
        ) })
      }
    );
  }
), mf = "MenuCheckboxItem", Nc = y(
  (e, t) => {
    const { checked: n = !1, onCheckedChange: r, ...o } = e;
    return /* @__PURE__ */ M.jsx(wc, { scope: e.__scopeMenu, checked: n, children: /* @__PURE__ */ M.jsx(
      dr,
      {
        role: "menuitemcheckbox",
        "aria-checked": Bn(n) ? "mixed" : n,
        ...o,
        ref: t,
        "data-state": Ko(n),
        onSelect: z(
          o.onSelect,
          () => r == null ? void 0 : r(Bn(n) ? !0 : !n),
          { checkForDefaultPrevented: !1 }
        )
      }
    ) });
  }
);
Nc.displayName = mf;
var jc = "MenuRadioGroup", [pf, ff] = mt(
  jc,
  { value: void 0, onValueChange: () => {
  } }
), yc = y(
  (e, t) => {
    const { value: n, onValueChange: r, ...o } = e, i = Ae(r);
    return /* @__PURE__ */ M.jsx(pf, { scope: e.__scopeMenu, value: n, onValueChange: i, children: /* @__PURE__ */ M.jsx($o, { ...o, ref: t }) });
  }
);
yc.displayName = jc;
var hc = "MenuRadioItem", vc = y(
  (e, t) => {
    const { value: n, ...r } = e, o = ff(hc, e.__scopeMenu), i = n === o.value;
    return /* @__PURE__ */ M.jsx(wc, { scope: e.__scopeMenu, checked: i, children: /* @__PURE__ */ M.jsx(
      dr,
      {
        role: "menuitemradio",
        "aria-checked": i,
        ...r,
        ref: t,
        "data-state": Ko(i),
        onSelect: z(
          r.onSelect,
          () => {
            var s;
            return (s = o.onValueChange) == null ? void 0 : s.call(o, n);
          },
          { checkForDefaultPrevented: !1 }
        )
      }
    ) });
  }
);
vc.displayName = hc;
var qo = "MenuItemIndicator", [wc, bf] = mt(
  qo,
  { checked: !1 }
), Dc = y(
  (e, t) => {
    const { __scopeMenu: n, forceMount: r, ...o } = e, i = bf(qo, n);
    return /* @__PURE__ */ M.jsx(
      an,
      {
        present: r || Bn(i.checked) || i.checked === !0,
        children: /* @__PURE__ */ M.jsx(
          V.span,
          {
            ...o,
            ref: t,
            "data-state": Ko(i.checked)
          }
        )
      }
    );
  }
);
Dc.displayName = qo;
var Nf = "MenuSeparator", Sc = y(
  (e, t) => {
    const { __scopeMenu: n, ...r } = e;
    return /* @__PURE__ */ M.jsx(
      V.div,
      {
        role: "separator",
        "aria-orientation": "horizontal",
        ...r,
        ref: t
      }
    );
  }
);
Sc.displayName = Nf;
var jf = "MenuArrow", xc = y(
  (e, t) => {
    const { __scopeMenu: n, ...r } = e, o = ur(n);
    return /* @__PURE__ */ M.jsx(Ba, { ...o, ...r, ref: t });
  }
);
xc.displayName = jf;
var yf = "MenuSub", [pv, Ac] = mt(yf), Xt = "MenuSubTrigger", Lc = y(
  (e, t) => {
    const n = pt(Xt, e.__scopeMenu), r = ln(Xt, e.__scopeMenu), o = Ac(Xt, e.__scopeMenu), i = Xo(Xt, e.__scopeMenu), s = A(null), { pointerGraceTimerRef: a, onPointerGraceIntentChange: l } = i, u = { __scopeMenu: e.__scopeMenu }, d = L(() => {
      s.current && window.clearTimeout(s.current), s.current = null;
    }, []);
    return C(() => d, [d]), C(() => {
      const g = a.current;
      return () => {
        window.clearTimeout(g), l(null);
      };
    }, [a, l]), /* @__PURE__ */ M.jsx(Jo, { asChild: !0, ...u, children: /* @__PURE__ */ M.jsx(
      bc,
      {
        id: o.triggerId,
        "aria-haspopup": "menu",
        "aria-expanded": n.open,
        "aria-controls": o.contentId,
        "data-state": kc(n.open),
        ...e,
        ref: tr(t, o.onTriggerChange),
        onClick: (g) => {
          var I;
          (I = e.onClick) == null || I.call(e, g), !(e.disabled || g.defaultPrevented) && (g.currentTarget.focus(), n.open || n.onOpenChange(!0));
        },
        onPointerMove: z(
          e.onPointerMove,
          Kt((g) => {
            i.onItemEnter(g), !g.defaultPrevented && !e.disabled && !n.open && !s.current && (i.onPointerGraceIntentChange(null), s.current = window.setTimeout(() => {
              n.onOpenChange(!0), d();
            }, 100));
          })
        ),
        onPointerLeave: z(
          e.onPointerLeave,
          Kt((g) => {
            var m, p;
            d();
            const I = (m = n.content) == null ? void 0 : m.getBoundingClientRect();
            if (I) {
              const f = (p = n.content) == null ? void 0 : p.dataset.side, b = f === "right", N = b ? -5 : 5, j = I[b ? "left" : "right"], h = I[b ? "right" : "left"];
              i.onPointerGraceIntentChange({
                area: [
                  // Apply a bleed on clientX to ensure that our exit point is
                  // consistently within polygon bounds
                  { x: g.clientX + N, y: g.clientY },
                  { x: j, y: I.top },
                  { x: h, y: I.top },
                  { x: h, y: I.bottom },
                  { x: j, y: I.bottom }
                ],
                side: f
              }), window.clearTimeout(a.current), a.current = window.setTimeout(
                () => i.onPointerGraceIntentChange(null),
                300
              );
            } else {
              if (i.onTriggerLeave(g), g.defaultPrevented)
                return;
              i.onPointerGraceIntentChange(null);
            }
          })
        ),
        onKeyDown: z(e.onKeyDown, (g) => {
          var m;
          const I = i.searchRef.current !== "";
          e.disabled || I && g.key === " " || tf[r.dir].includes(g.key) && (n.onOpenChange(!0), (m = n.content) == null || m.focus(), g.preventDefault());
        })
      }
    ) });
  }
);
Lc.displayName = Xt;
var Cc = "MenuSubContent", Tc = y(
  (e, t) => {
    const n = Ic(Ne, e.__scopeMenu), { forceMount: r = n.forceMount, ...o } = e, i = pt(Ne, e.__scopeMenu), s = ln(Ne, e.__scopeMenu), a = Ac(Cc, e.__scopeMenu), l = A(null), u = K(t, l);
    return /* @__PURE__ */ M.jsx(qt.Provider, { scope: e.__scopeMenu, children: /* @__PURE__ */ M.jsx(an, { present: r || i.open, children: /* @__PURE__ */ M.jsx(qt.Slot, { scope: e.__scopeMenu, children: /* @__PURE__ */ M.jsx(
      Fo,
      {
        id: a.contentId,
        "aria-labelledby": a.triggerId,
        ...o,
        ref: u,
        align: "start",
        side: s.dir === "rtl" ? "left" : "right",
        disableOutsidePointerEvents: !1,
        disableOutsideScroll: !1,
        trapFocus: !1,
        onOpenAutoFocus: (d) => {
          var g;
          s.isUsingKeyboardRef.current && ((g = l.current) == null || g.focus()), d.preventDefault();
        },
        onCloseAutoFocus: (d) => d.preventDefault(),
        onFocusOutside: z(e.onFocusOutside, (d) => {
          d.target !== a.trigger && i.onOpenChange(!1);
        }),
        onEscapeKeyDown: z(e.onEscapeKeyDown, (d) => {
          s.onClose(), d.preventDefault();
        }),
        onKeyDown: z(e.onKeyDown, (d) => {
          var m;
          const g = d.currentTarget.contains(d.target), I = nf[s.dir].includes(d.key);
          g && I && (i.onOpenChange(!1), (m = a.trigger) == null || m.focus(), d.preventDefault());
        })
      }
    ) }) }) });
  }
);
Tc.displayName = Cc;
function kc(e) {
  return e ? "open" : "closed";
}
function Bn(e) {
  return e === "indeterminate";
}
function Ko(e) {
  return Bn(e) ? "indeterminate" : e ? "checked" : "unchecked";
}
function hf(e) {
  const t = document.activeElement;
  for (const n of e)
    if (n === t || (n.focus(), document.activeElement !== t))
      return;
}
function vf(e, t) {
  return e.map((n, r) => e[(t + r) % e.length]);
}
function wf(e, t, n) {
  const o = t.length > 1 && Array.from(t).every((u) => u === t[0]) ? t[0] : t, i = n ? e.indexOf(n) : -1;
  let s = vf(e, Math.max(i, 0));
  o.length === 1 && (s = s.filter((u) => u !== n));
  const l = s.find(
    (u) => u.toLowerCase().startsWith(o.toLowerCase())
  );
  return l !== n ? l : void 0;
}
function Df(e, t) {
  const { x: n, y: r } = e;
  let o = !1;
  for (let i = 0, s = t.length - 1; i < t.length; s = i++) {
    const a = t[i].x, l = t[i].y, u = t[s].x, d = t[s].y;
    l > r != d > r && n < (u - a) * (r - l) / (d - l) + a && (o = !o);
  }
  return o;
}
function Sf(e, t) {
  if (!t)
    return !1;
  const n = { x: e.clientX, y: e.clientY };
  return Df(n, t);
}
function Kt(e) {
  return (t) => t.pointerType === "mouse" ? e(t) : void 0;
}
var xf = Mc, Af = Jo, Lf = mc, Cf = pc, Tf = $o, kf = fc, zf = dr, Ef = Nc, Pf = yc, Zf = vc, _f = Dc, Of = Sc, Wf = xc, Uf = Lc, Rf = Tc, ei = "DropdownMenu", [Hf, fv] = km(
  ei,
  [dc]
), ue = dc(), [Gf, zc] = Hf(ei), Ec = (e) => {
  const {
    __scopeDropdownMenu: t,
    children: n,
    dir: r,
    open: o,
    defaultOpen: i,
    onOpenChange: s,
    modal: a = !0
  } = e, l = ue(t), u = A(null), [d = !1, g] = on({
    prop: o,
    defaultProp: i,
    onChange: s
  });
  return /* @__PURE__ */ M.jsx(
    Gf,
    {
      scope: t,
      triggerId: Ke(),
      triggerRef: u,
      contentId: Ke(),
      open: d,
      onOpenChange: g,
      onOpenToggle: L(() => g((I) => !I), [g]),
      modal: a,
      children: /* @__PURE__ */ M.jsx(xf, { ...l, open: d, onOpenChange: g, dir: r, modal: a, children: n })
    }
  );
};
Ec.displayName = ei;
var Pc = "DropdownMenuTrigger", Zc = y(
  (e, t) => {
    const { __scopeDropdownMenu: n, disabled: r = !1, ...o } = e, i = zc(Pc, n), s = ue(n);
    return /* @__PURE__ */ M.jsx(Af, { asChild: !0, ...s, children: /* @__PURE__ */ M.jsx(
      V.button,
      {
        type: "button",
        id: i.triggerId,
        "aria-haspopup": "menu",
        "aria-expanded": i.open,
        "aria-controls": i.open ? i.contentId : void 0,
        "data-state": i.open ? "open" : "closed",
        "data-disabled": r ? "" : void 0,
        disabled: r,
        ...o,
        ref: tr(t, i.triggerRef),
        onPointerDown: z(e.onPointerDown, (a) => {
          !r && a.button === 0 && a.ctrlKey === !1 && (i.onOpenToggle(), i.open || a.preventDefault());
        }),
        onKeyDown: z(e.onKeyDown, (a) => {
          r || (["Enter", " "].includes(a.key) && i.onOpenToggle(), a.key === "ArrowDown" && i.onOpenChange(!0), ["Enter", " ", "ArrowDown"].includes(a.key) && a.preventDefault());
        })
      }
    ) });
  }
);
Zc.displayName = Pc;
var Yf = "DropdownMenuPortal", _c = (e) => {
  const { __scopeDropdownMenu: t, ...n } = e, r = ue(t);
  return /* @__PURE__ */ M.jsx(Lf, { ...r, ...n });
};
_c.displayName = Yf;
var Oc = "DropdownMenuContent", Wc = y(
  (e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e, o = zc(Oc, n), i = ue(n), s = A(!1);
    return /* @__PURE__ */ M.jsx(
      Cf,
      {
        id: o.contentId,
        "aria-labelledby": o.triggerId,
        ...i,
        ...r,
        ref: t,
        onCloseAutoFocus: z(e.onCloseAutoFocus, (a) => {
          var l;
          s.current || (l = o.triggerRef.current) == null || l.focus(), s.current = !1, a.preventDefault();
        }),
        onInteractOutside: z(e.onInteractOutside, (a) => {
          const l = a.detail.originalEvent, u = l.button === 0 && l.ctrlKey === !0, d = l.button === 2 || u;
          (!o.modal || d) && (s.current = !0);
        }),
        style: {
          ...e.style,
          "--radix-dropdown-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
          "--radix-dropdown-menu-content-available-width": "var(--radix-popper-available-width)",
          "--radix-dropdown-menu-content-available-height": "var(--radix-popper-available-height)",
          "--radix-dropdown-menu-trigger-width": "var(--radix-popper-anchor-width)",
          "--radix-dropdown-menu-trigger-height": "var(--radix-popper-anchor-height)"
        }
      }
    );
  }
);
Wc.displayName = Oc;
var Bf = "DropdownMenuGroup", Qf = y(
  (e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
    return /* @__PURE__ */ M.jsx(Tf, { ...o, ...r, ref: t });
  }
);
Qf.displayName = Bf;
var Jf = "DropdownMenuLabel", Uc = y(
  (e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
    return /* @__PURE__ */ M.jsx(kf, { ...o, ...r, ref: t });
  }
);
Uc.displayName = Jf;
var Vf = "DropdownMenuItem", Rc = y(
  (e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
    return /* @__PURE__ */ M.jsx(zf, { ...o, ...r, ref: t });
  }
);
Rc.displayName = Vf;
var Xf = "DropdownMenuCheckboxItem", Hc = y((e, t) => {
  const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
  return /* @__PURE__ */ M.jsx(Ef, { ...o, ...r, ref: t });
});
Hc.displayName = Xf;
var Ff = "DropdownMenuRadioGroup", $f = y((e, t) => {
  const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
  return /* @__PURE__ */ M.jsx(Pf, { ...o, ...r, ref: t });
});
$f.displayName = Ff;
var qf = "DropdownMenuRadioItem", Gc = y((e, t) => {
  const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
  return /* @__PURE__ */ M.jsx(Zf, { ...o, ...r, ref: t });
});
Gc.displayName = qf;
var Kf = "DropdownMenuItemIndicator", Yc = y((e, t) => {
  const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
  return /* @__PURE__ */ M.jsx(_f, { ...o, ...r, ref: t });
});
Yc.displayName = Kf;
var eb = "DropdownMenuSeparator", Bc = y((e, t) => {
  const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
  return /* @__PURE__ */ M.jsx(Of, { ...o, ...r, ref: t });
});
Bc.displayName = eb;
var tb = "DropdownMenuArrow", nb = y(
  (e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
    return /* @__PURE__ */ M.jsx(Wf, { ...o, ...r, ref: t });
  }
);
nb.displayName = tb;
var rb = "DropdownMenuSubTrigger", Qc = y((e, t) => {
  const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
  return /* @__PURE__ */ M.jsx(Uf, { ...o, ...r, ref: t });
});
Qc.displayName = rb;
var ob = "DropdownMenuSubContent", Jc = y((e, t) => {
  const { __scopeDropdownMenu: n, ...r } = e, o = ue(n);
  return /* @__PURE__ */ M.jsx(
    Rf,
    {
      ...o,
      ...r,
      ref: t,
      style: {
        ...e.style,
        "--radix-dropdown-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
        "--radix-dropdown-menu-content-available-width": "var(--radix-popper-available-width)",
        "--radix-dropdown-menu-content-available-height": "var(--radix-popper-available-height)",
        "--radix-dropdown-menu-trigger-width": "var(--radix-popper-anchor-width)",
        "--radix-dropdown-menu-trigger-height": "var(--radix-popper-anchor-height)"
      }
    }
  );
});
Jc.displayName = ob;
var ib = Ec, sb = Zc, ab = _c, Vc = Wc, Xc = Uc, Fc = Rc, $c = Hc, qc = Gc, Kc = Yc, el = Bc, tl = Qc, nl = Jc;
const cb = ib, lb = sb, ub = y(({ className: e, inset: t, children: n, ...r }, o) => /* @__PURE__ */ M.jsxs(
  tl,
  {
    ref: o,
    className: T(
      "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-neutral-100 data-[state=open]:bg-neutral-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:focus:bg-neutral-800 dark:data-[state=open]:bg-neutral-800",
      t && "pl-8",
      e
    ),
    ...r,
    children: [
      n,
      /* @__PURE__ */ M.jsx(ua, { className: "ml-auto" })
    ]
  }
));
ub.displayName = tl.displayName;
const db = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  nl,
  {
    ref: n,
    className: T(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border border-neutral-200 bg-white p-1 text-neutral-950 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
      e
    ),
    ...t
  }
));
db.displayName = nl.displayName;
const rl = y(({ className: e, sideOffset: t = 4, ...n }, r) => /* @__PURE__ */ M.jsx(ab, { children: /* @__PURE__ */ M.jsx("div", { className: "shade", children: /* @__PURE__ */ M.jsx(
  Vc,
  {
    ref: r,
    className: T(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border border-neutral-200 bg-white p-1 text-neutral-950 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
      e
    ),
    sideOffset: t,
    ...n
  }
) }) }));
rl.displayName = Vc.displayName;
const zn = y(({ className: e, inset: t, ...n }, r) => /* @__PURE__ */ M.jsx(
  Fc,
  {
    ref: r,
    className: T(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-neutral-100 focus:text-neutral-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:focus:bg-neutral-800 dark:focus:text-neutral-50",
      t && "pl-8",
      e
    ),
    ...n
  }
));
zn.displayName = Fc.displayName;
const gb = y(({ className: e, children: t, checked: n, ...r }, o) => /* @__PURE__ */ M.jsxs(
  $c,
  {
    ref: o,
    checked: n,
    className: T(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-neutral-100 focus:text-neutral-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-neutral-800 dark:focus:text-neutral-50",
      e
    ),
    ...r,
    children: [
      /* @__PURE__ */ M.jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ M.jsx(Kc, { children: /* @__PURE__ */ M.jsx(xm, { className: "h-4 w-4" }) }) }),
      t
    ]
  }
));
gb.displayName = $c.displayName;
const Mb = y(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ M.jsxs(
  qc,
  {
    ref: r,
    className: T(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-neutral-100 focus:text-neutral-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-neutral-800 dark:focus:text-neutral-50",
      e
    ),
    ...n,
    children: [
      /* @__PURE__ */ M.jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ M.jsx(Kc, { children: /* @__PURE__ */ M.jsx(Am, { className: "h-2 w-2 fill-current" }) }) }),
      t
    ]
  }
));
Mb.displayName = qc.displayName;
const Ib = y(({ className: e, inset: t, ...n }, r) => /* @__PURE__ */ M.jsx(
  Xc,
  {
    ref: r,
    className: T(
      "px-2 py-1.5 text-sm font-semibold",
      t && "pl-8",
      e
    ),
    ...n
  }
));
Ib.displayName = Xc.displayName;
const ol = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  el,
  {
    ref: n,
    className: T("-mx-1 my-1 h-px bg-neutral-100 dark:bg-neutral-800", e),
    ...t
  }
));
ol.displayName = el.displayName;
const ao = ({
  className: e,
  ...t
}) => /* @__PURE__ */ M.jsx(
  "span",
  {
    className: T("ml-auto text-xs tracking-widest opacity-60", e),
    ...t
  }
);
ao.displayName = "DropdownMenuShortcut";
function il(e, t = []) {
  let n = [];
  function r(i, s) {
    const a = q(s), l = n.length;
    n = [...n, s];
    const u = (g) => {
      var N;
      const { scope: I, children: m, ...p } = g, f = ((N = I == null ? void 0 : I[e]) == null ? void 0 : N[l]) || a, b = H(() => p, Object.values(p));
      return /* @__PURE__ */ M.jsx(f.Provider, { value: b, children: m });
    };
    u.displayName = i + "Provider";
    function d(g, I) {
      var f;
      const m = ((f = I == null ? void 0 : I[e]) == null ? void 0 : f[l]) || a, p = re(m);
      if (p)
        return p;
      if (s !== void 0)
        return s;
      throw new Error(`\`${g}\` must be used within \`${i}\``);
    }
    return [u, d];
  }
  const o = () => {
    const i = n.map((s) => q(s));
    return function(a) {
      const l = (a == null ? void 0 : a[e]) || i;
      return H(
        () => ({ [`__scope${e}`]: { ...a, [e]: l } }),
        [a, l]
      );
    };
  };
  return o.scopeName = e, [r, mb(o, ...t)];
}
function mb(...e) {
  const t = e[0];
  if (e.length === 1)
    return t;
  const n = () => {
    const r = e.map((o) => ({
      useScope: o(),
      scopeName: o.scopeName
    }));
    return function(i) {
      const s = r.reduce((a, { useScope: l, scopeName: u }) => {
        const g = l(i)[`__scope${u}`];
        return { ...a, ...g };
      }, {});
      return H(() => ({ [`__scope${t.scopeName}`]: s }), [s]);
    };
  };
  return n.scopeName = t.scopeName, n;
}
function pb(e, t) {
  return nn((n, r) => t[n][r] ?? n, e);
}
var ti = (e) => {
  const { present: t, children: n } = e, r = fb(t), o = typeof n == "function" ? n({ present: r.isPresent }) : we.only(n), i = K(r.ref, bb(o));
  return typeof n == "function" || r.isPresent ? It(o, { ref: i }) : null;
};
ti.displayName = "Presence";
function fb(e) {
  const [t, n] = O(), r = A({}), o = A(e), i = A("none"), s = e ? "mounted" : "unmounted", [a, l] = pb(s, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  return C(() => {
    const u = jn(r.current);
    i.current = a === "mounted" ? u : "none";
  }, [a]), Le(() => {
    const u = r.current, d = o.current;
    if (d !== e) {
      const I = i.current, m = jn(u);
      e ? l("MOUNT") : m === "none" || (u == null ? void 0 : u.display) === "none" ? l("UNMOUNT") : l(d && I !== m ? "ANIMATION_OUT" : "UNMOUNT"), o.current = e;
    }
  }, [e, l]), Le(() => {
    if (t) {
      let u;
      const d = t.ownerDocument.defaultView ?? window, g = (m) => {
        const f = jn(r.current).includes(m.animationName);
        if (m.target === t && f && (l("ANIMATION_END"), !o.current)) {
          const b = t.style.animationFillMode;
          t.style.animationFillMode = "forwards", u = d.setTimeout(() => {
            t.style.animationFillMode === "forwards" && (t.style.animationFillMode = b);
          });
        }
      }, I = (m) => {
        m.target === t && (i.current = jn(r.current));
      };
      return t.addEventListener("animationstart", I), t.addEventListener("animationcancel", g), t.addEventListener("animationend", g), () => {
        d.clearTimeout(u), t.removeEventListener("animationstart", I), t.removeEventListener("animationcancel", g), t.removeEventListener("animationend", g);
      };
    } else
      l("ANIMATION_END");
  }, [t, l]), {
    isPresent: ["mounted", "unmountSuspended"].includes(a),
    ref: L((u) => {
      u && (r.current = getComputedStyle(u)), n(u);
    }, [])
  };
}
function jn(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
function bb(e) {
  var r, o;
  let t = (r = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : r.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = (o = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : o.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
var ni = "Tabs", [Nb, bv] = il(ni, [
  cr
]), sl = cr(), [jb, ri] = Nb(ni), al = y(
  (e, t) => {
    const {
      __scopeTabs: n,
      value: r,
      onValueChange: o,
      defaultValue: i,
      orientation: s = "horizontal",
      dir: a,
      activationMode: l = "automatic",
      ...u
    } = e, d = Po(a), [g, I] = on({
      prop: r,
      onChange: o,
      defaultProp: i
    });
    return /* @__PURE__ */ M.jsx(
      jb,
      {
        scope: n,
        baseId: Ke(),
        value: g,
        onValueChange: I,
        orientation: s,
        dir: d,
        activationMode: l,
        children: /* @__PURE__ */ M.jsx(
          V.div,
          {
            dir: d,
            "data-orientation": s,
            ...u,
            ref: t
          }
        )
      }
    );
  }
);
al.displayName = ni;
var cl = "TabsList", ll = y(
  (e, t) => {
    const { __scopeTabs: n, loop: r = !0, ...o } = e, i = ri(cl, n), s = sl(n);
    return /* @__PURE__ */ M.jsx(
      $a,
      {
        asChild: !0,
        ...s,
        orientation: i.orientation,
        dir: i.dir,
        loop: r,
        children: /* @__PURE__ */ M.jsx(
          V.div,
          {
            role: "tablist",
            "aria-orientation": i.orientation,
            ...o,
            ref: t
          }
        )
      }
    );
  }
);
ll.displayName = cl;
var ul = "TabsTrigger", dl = y(
  (e, t) => {
    const { __scopeTabs: n, value: r, disabled: o = !1, ...i } = e, s = ri(ul, n), a = sl(n), l = Il(s.baseId, r), u = ml(s.baseId, r), d = r === s.value;
    return /* @__PURE__ */ M.jsx(
      qa,
      {
        asChild: !0,
        ...a,
        focusable: !o,
        active: d,
        children: /* @__PURE__ */ M.jsx(
          V.button,
          {
            type: "button",
            role: "tab",
            "aria-selected": d,
            "aria-controls": u,
            "data-state": d ? "active" : "inactive",
            "data-disabled": o ? "" : void 0,
            disabled: o,
            id: l,
            ...i,
            ref: t,
            onMouseDown: z(e.onMouseDown, (g) => {
              !o && g.button === 0 && g.ctrlKey === !1 ? s.onValueChange(r) : g.preventDefault();
            }),
            onKeyDown: z(e.onKeyDown, (g) => {
              [" ", "Enter"].includes(g.key) && s.onValueChange(r);
            }),
            onFocus: z(e.onFocus, () => {
              const g = s.activationMode !== "manual";
              !d && !o && g && s.onValueChange(r);
            })
          }
        )
      }
    );
  }
);
dl.displayName = ul;
var gl = "TabsContent", Ml = y(
  (e, t) => {
    const { __scopeTabs: n, value: r, forceMount: o, children: i, ...s } = e, a = ri(gl, n), l = Il(a.baseId, r), u = ml(a.baseId, r), d = r === a.value, g = A(d);
    return C(() => {
      const I = requestAnimationFrame(() => g.current = !1);
      return () => cancelAnimationFrame(I);
    }, []), /* @__PURE__ */ M.jsx(ti, { present: o || d, children: ({ present: I }) => /* @__PURE__ */ M.jsx(
      V.div,
      {
        "data-state": d ? "active" : "inactive",
        "data-orientation": a.orientation,
        role: "tabpanel",
        "aria-labelledby": l,
        hidden: !I,
        id: u,
        tabIndex: 0,
        ...s,
        ref: t,
        style: {
          ...e.style,
          animationDuration: g.current ? "0s" : void 0
        },
        children: I && i
      }
    ) });
  }
);
Ml.displayName = gl;
function Il(e, t) {
  return `${e}-trigger-${t}`;
}
function ml(e, t) {
  return `${e}-content-${t}`;
}
var pl = al, fl = ll, bl = dl, Nl = Ml;
const jl = q("default"), oi = y(({ variant: e = "default", ...t }, n) => /* @__PURE__ */ M.jsx(jl.Provider, { value: e, children: /* @__PURE__ */ M.jsx(pl, { ref: n, ...t }) }));
oi.displayName = pl.displayName;
const yb = {
  default: "bg-neutral-100 dark:bg-neutral-800",
  outline: "border border-neutral-200 dark:border-neutral-800 bg-transparent"
}, ii = y(({ className: e, ...t }, n) => {
  const r = re(jl);
  return /* @__PURE__ */ M.jsx(
    fl,
    {
      ref: n,
      className: T(
        "inline-flex h-10 items-center justify-center rounded-md bg-neutral-100 p-1 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
        yb[r],
        e
      ),
      ...t
    }
  );
});
ii.displayName = fl.displayName;
const de = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  bl,
  {
    ref: n,
    className: T(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-sm dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300 dark:data-[state=active]:bg-neutral-950 dark:data-[state=active]:text-neutral-50",
      e
    ),
    ...t
  }
));
de.displayName = bl.displayName;
const ge = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  Nl,
  {
    ref: n,
    className: T(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300",
      e
    ),
    ...t
  }
));
ge.displayName = Nl.displayName;
const Qr = 768;
function hb() {
  const [e, t] = O(void 0);
  return C(() => {
    const n = window.matchMedia(`(max-width: ${Qr - 1}px)`), r = () => {
      t(window.innerWidth < Qr);
    };
    return n.addEventListener("change", r), t(window.innerWidth < Qr), () => n.removeEventListener("change", r);
  }, []), !!e;
}
const yl = y(
  ({ className: e, type: t, ...n }, r) => /* @__PURE__ */ M.jsx(
    "input",
    {
      ref: r,
      className: T(
        "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-neutral-950 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:file:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300",
        e
      ),
      type: t,
      ...n
    }
  )
);
yl.displayName = "Input";
var vb = "Separator", as = "horizontal", wb = ["horizontal", "vertical"], hl = y((e, t) => {
  const { decorative: n, orientation: r = as, ...o } = e, i = Db(r) ? r : as, a = n ? { role: "none" } : { "aria-orientation": i === "vertical" ? i : void 0, role: "separator" };
  return /* @__PURE__ */ M.jsx(
    V.div,
    {
      "data-orientation": i,
      ...a,
      ...o,
      ref: t
    }
  );
});
hl.displayName = vb;
function Db(e) {
  return wb.includes(e);
}
var vl = hl;
const wl = y(
  ({ className: e, orientation: t = "horizontal", decorative: n = !0, ...r }, o) => /* @__PURE__ */ M.jsx(
    vl,
    {
      ref: o,
      className: T(
        "shrink-0 bg-neutral-200 dark:bg-neutral-800",
        t === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        e
      ),
      decorative: n,
      orientation: t,
      ...r
    }
  )
);
wl.displayName = vl.displayName;
function Sb(e, t) {
  const n = q(t), r = (i) => {
    const { children: s, ...a } = i, l = H(() => a, Object.values(a));
    return /* @__PURE__ */ M.jsx(n.Provider, { value: l, children: s });
  };
  r.displayName = e + "Provider";
  function o(i) {
    const s = re(n);
    if (s)
      return s;
    if (t !== void 0)
      return t;
    throw new Error(`\`${i}\` must be used within \`${e}\``);
  }
  return [r, o];
}
function xb(e, t = []) {
  let n = [];
  function r(i, s) {
    const a = q(s), l = n.length;
    n = [...n, s];
    const u = (g) => {
      var N;
      const { scope: I, children: m, ...p } = g, f = ((N = I == null ? void 0 : I[e]) == null ? void 0 : N[l]) || a, b = H(() => p, Object.values(p));
      return /* @__PURE__ */ M.jsx(f.Provider, { value: b, children: m });
    };
    u.displayName = i + "Provider";
    function d(g, I) {
      var f;
      const m = ((f = I == null ? void 0 : I[e]) == null ? void 0 : f[l]) || a, p = re(m);
      if (p)
        return p;
      if (s !== void 0)
        return s;
      throw new Error(`\`${g}\` must be used within \`${i}\``);
    }
    return [u, d];
  }
  const o = () => {
    const i = n.map((s) => q(s));
    return function(a) {
      const l = (a == null ? void 0 : a[e]) || i;
      return H(
        () => ({ [`__scope${e}`]: { ...a, [e]: l } }),
        [a, l]
      );
    };
  };
  return o.scopeName = e, [r, Ab(o, ...t)];
}
function Ab(...e) {
  const t = e[0];
  if (e.length === 1)
    return t;
  const n = () => {
    const r = e.map((o) => ({
      useScope: o(),
      scopeName: o.scopeName
    }));
    return function(i) {
      const s = r.reduce((a, { useScope: l, scopeName: u }) => {
        const g = l(i)[`__scope${u}`];
        return { ...a, ...g };
      }, {});
      return H(() => ({ [`__scope${t.scopeName}`]: s }), [s]);
    };
  };
  return n.scopeName = t.scopeName, n;
}
function Lb(e, t) {
  return nn((n, r) => t[n][r] ?? n, e);
}
var gr = (e) => {
  const { present: t, children: n } = e, r = Cb(t), o = typeof n == "function" ? n({ present: r.isPresent }) : we.only(n), i = K(r.ref, Tb(o));
  return typeof n == "function" || r.isPresent ? It(o, { ref: i }) : null;
};
gr.displayName = "Presence";
function Cb(e) {
  const [t, n] = O(), r = A({}), o = A(e), i = A("none"), s = e ? "mounted" : "unmounted", [a, l] = Lb(s, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  return C(() => {
    const u = yn(r.current);
    i.current = a === "mounted" ? u : "none";
  }, [a]), Le(() => {
    const u = r.current, d = o.current;
    if (d !== e) {
      const I = i.current, m = yn(u);
      e ? l("MOUNT") : m === "none" || (u == null ? void 0 : u.display) === "none" ? l("UNMOUNT") : l(d && I !== m ? "ANIMATION_OUT" : "UNMOUNT"), o.current = e;
    }
  }, [e, l]), Le(() => {
    if (t) {
      let u;
      const d = t.ownerDocument.defaultView ?? window, g = (m) => {
        const f = yn(r.current).includes(m.animationName);
        if (m.target === t && f && (l("ANIMATION_END"), !o.current)) {
          const b = t.style.animationFillMode;
          t.style.animationFillMode = "forwards", u = d.setTimeout(() => {
            t.style.animationFillMode === "forwards" && (t.style.animationFillMode = b);
          });
        }
      }, I = (m) => {
        m.target === t && (i.current = yn(r.current));
      };
      return t.addEventListener("animationstart", I), t.addEventListener("animationcancel", g), t.addEventListener("animationend", g), () => {
        d.clearTimeout(u), t.removeEventListener("animationstart", I), t.removeEventListener("animationcancel", g), t.removeEventListener("animationend", g);
      };
    } else
      l("ANIMATION_END");
  }, [t, l]), {
    isPresent: ["mounted", "unmountSuspended"].includes(a),
    ref: L((u) => {
      u && (r.current = getComputedStyle(u)), n(u);
    }, [])
  };
}
function yn(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
function Tb(e) {
  var r, o;
  let t = (r = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : r.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = (o = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : o.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
var si = "Dialog", [Dl, Nv] = xb(si), [kb, Ce] = Dl(si), Sl = (e) => {
  const {
    __scopeDialog: t,
    children: n,
    open: r,
    defaultOpen: o,
    onOpenChange: i,
    modal: s = !0
  } = e, a = A(null), l = A(null), [u = !1, d] = on({
    prop: r,
    defaultProp: o,
    onChange: i
  });
  return /* @__PURE__ */ M.jsx(
    kb,
    {
      scope: t,
      triggerRef: a,
      contentRef: l,
      contentId: Ke(),
      titleId: Ke(),
      descriptionId: Ke(),
      open: u,
      onOpenChange: d,
      onOpenToggle: L(() => d((g) => !g), [d]),
      modal: s,
      children: n
    }
  );
};
Sl.displayName = si;
var xl = "DialogTrigger", zb = y(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ce(xl, n), i = K(t, o.triggerRef);
    return /* @__PURE__ */ M.jsx(
      V.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": o.open,
        "aria-controls": o.contentId,
        "data-state": li(o.open),
        ...r,
        ref: i,
        onClick: z(e.onClick, o.onOpenToggle)
      }
    );
  }
);
zb.displayName = xl;
var ai = "DialogPortal", [Eb, Al] = Dl(ai, {
  forceMount: void 0
}), Ll = (e) => {
  const { __scopeDialog: t, forceMount: n, children: r, container: o } = e, i = Ce(ai, t);
  return /* @__PURE__ */ M.jsx(Eb, { scope: t, forceMount: n, children: we.map(r, (s) => /* @__PURE__ */ M.jsx(gr, { present: n || i.open, children: /* @__PURE__ */ M.jsx(Qo, { asChild: !0, container: o, children: s }) })) });
};
Ll.displayName = ai;
var Qn = "DialogOverlay", Cl = y(
  (e, t) => {
    const n = Al(Qn, e.__scopeDialog), { forceMount: r = n.forceMount, ...o } = e, i = Ce(Qn, e.__scopeDialog);
    return i.modal ? /* @__PURE__ */ M.jsx(gr, { present: r || i.open, children: /* @__PURE__ */ M.jsx(Pb, { ...o, ref: t }) }) : null;
  }
);
Cl.displayName = Qn;
var Pb = y(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ce(Qn, n);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ M.jsx(lc, { as: ce, allowPinchZoom: !0, shards: [o.contentRef], children: /* @__PURE__ */ M.jsx(
        V.div,
        {
          "data-state": li(o.open),
          ...r,
          ref: t,
          style: { pointerEvents: "auto", ...r.style }
        }
      ) })
    );
  }
), dt = "DialogContent", Tl = y(
  (e, t) => {
    const n = Al(dt, e.__scopeDialog), { forceMount: r = n.forceMount, ...o } = e, i = Ce(dt, e.__scopeDialog);
    return /* @__PURE__ */ M.jsx(gr, { present: r || i.open, children: i.modal ? /* @__PURE__ */ M.jsx(Zb, { ...o, ref: t }) : /* @__PURE__ */ M.jsx(_b, { ...o, ref: t }) });
  }
);
Tl.displayName = dt;
var Zb = y(
  (e, t) => {
    const n = Ce(dt, e.__scopeDialog), r = A(null), o = K(t, n.contentRef, r);
    return C(() => {
      const i = r.current;
      if (i)
        return ec(i);
    }, []), /* @__PURE__ */ M.jsx(
      kl,
      {
        ...e,
        ref: o,
        trapFocus: n.open,
        disableOutsidePointerEvents: !0,
        onCloseAutoFocus: z(e.onCloseAutoFocus, (i) => {
          var s;
          i.preventDefault(), (s = n.triggerRef.current) == null || s.focus();
        }),
        onPointerDownOutside: z(e.onPointerDownOutside, (i) => {
          const s = i.detail.originalEvent, a = s.button === 0 && s.ctrlKey === !0;
          (s.button === 2 || a) && i.preventDefault();
        }),
        onFocusOutside: z(
          e.onFocusOutside,
          (i) => i.preventDefault()
        )
      }
    );
  }
), _b = y(
  (e, t) => {
    const n = Ce(dt, e.__scopeDialog), r = A(!1), o = A(!1);
    return /* @__PURE__ */ M.jsx(
      kl,
      {
        ...e,
        ref: t,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (i) => {
          var s, a;
          (s = e.onCloseAutoFocus) == null || s.call(e, i), i.defaultPrevented || (r.current || (a = n.triggerRef.current) == null || a.focus(), i.preventDefault()), r.current = !1, o.current = !1;
        },
        onInteractOutside: (i) => {
          var l, u;
          (l = e.onInteractOutside) == null || l.call(e, i), i.defaultPrevented || (r.current = !0, i.detail.originalEvent.type === "pointerdown" && (o.current = !0));
          const s = i.target;
          ((u = n.triggerRef.current) == null ? void 0 : u.contains(s)) && i.preventDefault(), i.detail.originalEvent.type === "focusin" && o.current && i.preventDefault();
        }
      }
    );
  }
), kl = y(
  (e, t) => {
    const { __scopeDialog: n, trapFocus: r, onOpenAutoFocus: o, onCloseAutoFocus: i, ...s } = e, a = Ce(dt, n), l = A(null), u = K(t, l);
    return ya(), /* @__PURE__ */ M.jsxs(M.Fragment, { children: [
      /* @__PURE__ */ M.jsx(
        Zo,
        {
          asChild: !0,
          loop: !0,
          trapped: r,
          onMountAutoFocus: o,
          onUnmountAutoFocus: i,
          children: /* @__PURE__ */ M.jsx(
            rr,
            {
              role: "dialog",
              id: a.contentId,
              "aria-describedby": a.descriptionId,
              "aria-labelledby": a.titleId,
              "data-state": li(a.open),
              ...s,
              ref: u,
              onDismiss: () => a.onOpenChange(!1)
            }
          )
        }
      ),
      /* @__PURE__ */ M.jsxs(M.Fragment, { children: [
        /* @__PURE__ */ M.jsx(Ob, { titleId: a.titleId }),
        /* @__PURE__ */ M.jsx(Ub, { contentRef: l, descriptionId: a.descriptionId })
      ] })
    ] });
  }
), ci = "DialogTitle", zl = y(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ce(ci, n);
    return /* @__PURE__ */ M.jsx(V.h2, { id: o.titleId, ...r, ref: t });
  }
);
zl.displayName = ci;
var El = "DialogDescription", Pl = y(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ce(El, n);
    return /* @__PURE__ */ M.jsx(V.p, { id: o.descriptionId, ...r, ref: t });
  }
);
Pl.displayName = El;
var Zl = "DialogClose", _l = y(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ce(Zl, n);
    return /* @__PURE__ */ M.jsx(
      V.button,
      {
        type: "button",
        ...r,
        ref: t,
        onClick: z(e.onClick, () => o.onOpenChange(!1))
      }
    );
  }
);
_l.displayName = Zl;
function li(e) {
  return e ? "open" : "closed";
}
var Ol = "DialogTitleWarning", [jv, Wl] = Sb(Ol, {
  contentName: dt,
  titleName: ci,
  docsSlug: "dialog"
}), Ob = ({ titleId: e }) => {
  const t = Wl(Ol), n = `\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;
  return C(() => {
    e && (document.getElementById(e) || console.error(n));
  }, [n, e]), null;
}, Wb = "DialogDescriptionWarning", Ub = ({ contentRef: e, descriptionId: t }) => {
  const r = `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${Wl(Wb).contentName}}.`;
  return C(() => {
    var i;
    const o = (i = e.current) == null ? void 0 : i.getAttribute("aria-describedby");
    t && o && (document.getElementById(t) || console.warn(r));
  }, [r, e, t]), null;
}, Rb = Sl, Hb = Ll, Ul = Cl, Rl = Tl, Hl = zl, Gl = Pl, Gb = _l;
const Yb = Rb, Bb = Hb, Yl = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  Ul,
  {
    className: T(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      e
    ),
    ...t,
    ref: n
  }
));
Yl.displayName = Ul.displayName;
const Qb = nr(
  "fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out dark:bg-neutral-950",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
      }
    },
    defaultVariants: {
      side: "right"
    }
  }
), Bl = y(({ side: e = "right", className: t, children: n, ...r }, o) => /* @__PURE__ */ M.jsxs(Bb, { children: [
  /* @__PURE__ */ M.jsx(Yl, {}),
  /* @__PURE__ */ M.jsxs(
    Rl,
    {
      ref: o,
      className: T(Qb({ side: e }), t),
      ...r,
      children: [
        n,
        /* @__PURE__ */ M.jsxs(Gb, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-neutral-100 dark:ring-offset-neutral-950 dark:focus:ring-neutral-300 dark:data-[state=open]:bg-neutral-800", children: [
          /* @__PURE__ */ M.jsx(Cm, { className: "h-4 w-4" }),
          /* @__PURE__ */ M.jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
Bl.displayName = Rl.displayName;
const Jb = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  Hl,
  {
    ref: n,
    className: T("text-lg font-semibold text-neutral-950 dark:text-neutral-50", e),
    ...t
  }
));
Jb.displayName = Hl.displayName;
const Vb = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  Gl,
  {
    ref: n,
    className: T("text-sm text-neutral-500 dark:text-neutral-400", e),
    ...t
  }
));
Vb.displayName = Gl.displayName;
function cs({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ M.jsx(
    "div",
    {
      className: T("animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800", e),
      ...t
    }
  );
}
var Xb = "VisuallyHidden", Ql = y(
  (e, t) => /* @__PURE__ */ M.jsx(
    V.span,
    {
      ...e,
      ref: t,
      style: {
        // See: https://github.com/twbs/bootstrap/blob/master/scss/mixins/_screen-reader.scss
        position: "absolute",
        border: 0,
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        wordWrap: "normal",
        ...e.style
      }
    }
  )
);
Ql.displayName = Xb;
var Fb = Ql, [Mr, yv] = il("Tooltip", [
  sr
]), Ir = sr(), Jl = "TooltipProvider", $b = 700, co = "tooltip.open", [qb, ui] = Mr(Jl), Vl = (e) => {
  const {
    __scopeTooltip: t,
    delayDuration: n = $b,
    skipDelayDuration: r = 300,
    disableHoverableContent: o = !1,
    children: i
  } = e, [s, a] = O(!0), l = A(!1), u = A(0);
  return C(() => {
    const d = u.current;
    return () => window.clearTimeout(d);
  }, []), /* @__PURE__ */ M.jsx(
    qb,
    {
      scope: t,
      isOpenDelayed: s,
      delayDuration: n,
      onOpen: L(() => {
        window.clearTimeout(u.current), a(!1);
      }, []),
      onClose: L(() => {
        window.clearTimeout(u.current), u.current = window.setTimeout(
          () => a(!0),
          r
        );
      }, [r]),
      isPointerInTransitRef: l,
      onPointerInTransitChange: L((d) => {
        l.current = d;
      }, []),
      disableHoverableContent: o,
      children: i
    }
  );
};
Vl.displayName = Jl;
var mr = "Tooltip", [Kb, pr] = Mr(mr), Xl = (e) => {
  const {
    __scopeTooltip: t,
    children: n,
    open: r,
    defaultOpen: o = !1,
    onOpenChange: i,
    disableHoverableContent: s,
    delayDuration: a
  } = e, l = ui(mr, e.__scopeTooltip), u = Ir(t), [d, g] = O(null), I = Ke(), m = A(0), p = s ?? l.disableHoverableContent, f = a ?? l.delayDuration, b = A(!1), [N = !1, j] = on({
    prop: r,
    defaultProp: o,
    onChange: (D) => {
      D ? (l.onOpen(), document.dispatchEvent(new CustomEvent(co))) : l.onClose(), i == null || i(D);
    }
  }), h = H(() => N ? b.current ? "delayed-open" : "instant-open" : "closed", [N]), v = L(() => {
    window.clearTimeout(m.current), m.current = 0, b.current = !1, j(!0);
  }, [j]), w = L(() => {
    window.clearTimeout(m.current), m.current = 0, j(!1);
  }, [j]), S = L(() => {
    window.clearTimeout(m.current), m.current = window.setTimeout(() => {
      b.current = !0, j(!0), m.current = 0;
    }, f);
  }, [f, j]);
  return C(() => () => {
    m.current && (window.clearTimeout(m.current), m.current = 0);
  }, []), /* @__PURE__ */ M.jsx(Ha, { ...u, children: /* @__PURE__ */ M.jsx(
    Kb,
    {
      scope: t,
      contentId: I,
      open: N,
      stateAttribute: h,
      trigger: d,
      onTriggerChange: g,
      onTriggerEnter: L(() => {
        l.isOpenDelayed ? S() : v();
      }, [l.isOpenDelayed, S, v]),
      onTriggerLeave: L(() => {
        p ? w() : (window.clearTimeout(m.current), m.current = 0);
      }, [w, p]),
      onOpen: v,
      onClose: w,
      disableHoverableContent: p,
      children: n
    }
  ) });
};
Xl.displayName = mr;
var lo = "TooltipTrigger", Fl = y(
  (e, t) => {
    const { __scopeTooltip: n, ...r } = e, o = pr(lo, n), i = ui(lo, n), s = Ir(n), a = A(null), l = K(t, a, o.onTriggerChange), u = A(!1), d = A(!1), g = L(() => u.current = !1, []);
    return C(() => () => document.removeEventListener("pointerup", g), [g]), /* @__PURE__ */ M.jsx(Ga, { asChild: !0, ...s, children: /* @__PURE__ */ M.jsx(
      V.button,
      {
        "aria-describedby": o.open ? o.contentId : void 0,
        "data-state": o.stateAttribute,
        ...r,
        ref: l,
        onPointerMove: z(e.onPointerMove, (I) => {
          I.pointerType !== "touch" && !d.current && !i.isPointerInTransitRef.current && (o.onTriggerEnter(), d.current = !0);
        }),
        onPointerLeave: z(e.onPointerLeave, () => {
          o.onTriggerLeave(), d.current = !1;
        }),
        onPointerDown: z(e.onPointerDown, () => {
          u.current = !0, document.addEventListener("pointerup", g, { once: !0 });
        }),
        onFocus: z(e.onFocus, () => {
          u.current || o.onOpen();
        }),
        onBlur: z(e.onBlur, o.onClose),
        onClick: z(e.onClick, o.onClose)
      }
    ) });
  }
);
Fl.displayName = lo;
var eN = "TooltipPortal", [hv, tN] = Mr(eN, {
  forceMount: void 0
}), zt = "TooltipContent", $l = y(
  (e, t) => {
    const n = tN(zt, e.__scopeTooltip), { forceMount: r = n.forceMount, side: o = "top", ...i } = e, s = pr(zt, e.__scopeTooltip);
    return /* @__PURE__ */ M.jsx(ti, { present: r || s.open, children: s.disableHoverableContent ? /* @__PURE__ */ M.jsx(ql, { side: o, ...i, ref: t }) : /* @__PURE__ */ M.jsx(nN, { side: o, ...i, ref: t }) });
  }
), nN = y((e, t) => {
  const n = pr(zt, e.__scopeTooltip), r = ui(zt, e.__scopeTooltip), o = A(null), i = K(t, o), [s, a] = O(null), { trigger: l, onClose: u } = n, d = o.current, { onPointerInTransitChange: g } = r, I = L(() => {
    a(null), g(!1);
  }, [g]), m = L(
    (p, f) => {
      const b = p.currentTarget, N = { x: p.clientX, y: p.clientY }, j = sN(N, b.getBoundingClientRect()), h = aN(N, j), v = cN(f.getBoundingClientRect()), w = uN([...h, ...v]);
      a(w), g(!0);
    },
    [g]
  );
  return C(() => () => I(), [I]), C(() => {
    if (l && d) {
      const p = (b) => m(b, d), f = (b) => m(b, l);
      return l.addEventListener("pointerleave", p), d.addEventListener("pointerleave", f), () => {
        l.removeEventListener("pointerleave", p), d.removeEventListener("pointerleave", f);
      };
    }
  }, [l, d, m, I]), C(() => {
    if (s) {
      const p = (f) => {
        const b = f.target, N = { x: f.clientX, y: f.clientY }, j = (l == null ? void 0 : l.contains(b)) || (d == null ? void 0 : d.contains(b)), h = !lN(N, s);
        j ? I() : h && (I(), u());
      };
      return document.addEventListener("pointermove", p), () => document.removeEventListener("pointermove", p);
    }
  }, [l, d, s, u, I]), /* @__PURE__ */ M.jsx(ql, { ...e, ref: i });
}), [rN, oN] = Mr(mr, { isInside: !1 }), ql = y(
  (e, t) => {
    const {
      __scopeTooltip: n,
      children: r,
      "aria-label": o,
      onEscapeKeyDown: i,
      onPointerDownOutside: s,
      ...a
    } = e, l = pr(zt, n), u = Ir(n), { onClose: d } = l;
    return C(() => (document.addEventListener(co, d), () => document.removeEventListener(co, d)), [d]), C(() => {
      if (l.trigger) {
        const g = (I) => {
          const m = I.target;
          m != null && m.contains(l.trigger) && d();
        };
        return window.addEventListener("scroll", g, { capture: !0 }), () => window.removeEventListener("scroll", g, { capture: !0 });
      }
    }, [l.trigger, d]), /* @__PURE__ */ M.jsx(
      rr,
      {
        asChild: !0,
        disableOutsidePointerEvents: !1,
        onEscapeKeyDown: i,
        onPointerDownOutside: s,
        onFocusOutside: (g) => g.preventDefault(),
        onDismiss: d,
        children: /* @__PURE__ */ M.jsxs(
          Ya,
          {
            "data-state": l.stateAttribute,
            ...u,
            ...a,
            ref: t,
            style: {
              ...a.style,
              "--radix-tooltip-content-transform-origin": "var(--radix-popper-transform-origin)",
              "--radix-tooltip-content-available-width": "var(--radix-popper-available-width)",
              "--radix-tooltip-content-available-height": "var(--radix-popper-available-height)",
              "--radix-tooltip-trigger-width": "var(--radix-popper-anchor-width)",
              "--radix-tooltip-trigger-height": "var(--radix-popper-anchor-height)"
            },
            children: [
              /* @__PURE__ */ M.jsx(ta, { children: r }),
              /* @__PURE__ */ M.jsx(rN, { scope: n, isInside: !0, children: /* @__PURE__ */ M.jsx(Fb, { id: l.contentId, role: "tooltip", children: o || r }) })
            ]
          }
        )
      }
    );
  }
);
$l.displayName = zt;
var Kl = "TooltipArrow", iN = y(
  (e, t) => {
    const { __scopeTooltip: n, ...r } = e, o = Ir(n);
    return oN(
      Kl,
      n
    ).isInside ? null : /* @__PURE__ */ M.jsx(Ba, { ...o, ...r, ref: t });
  }
);
iN.displayName = Kl;
function sN(e, t) {
  const n = Math.abs(t.top - e.y), r = Math.abs(t.bottom - e.y), o = Math.abs(t.right - e.x), i = Math.abs(t.left - e.x);
  switch (Math.min(n, r, o, i)) {
    case i:
      return "left";
    case o:
      return "right";
    case n:
      return "top";
    case r:
      return "bottom";
    default:
      throw new Error("unreachable");
  }
}
function aN(e, t, n = 5) {
  const r = [];
  switch (t) {
    case "top":
      r.push(
        { x: e.x - n, y: e.y + n },
        { x: e.x + n, y: e.y + n }
      );
      break;
    case "bottom":
      r.push(
        { x: e.x - n, y: e.y - n },
        { x: e.x + n, y: e.y - n }
      );
      break;
    case "left":
      r.push(
        { x: e.x + n, y: e.y - n },
        { x: e.x + n, y: e.y + n }
      );
      break;
    case "right":
      r.push(
        { x: e.x - n, y: e.y - n },
        { x: e.x - n, y: e.y + n }
      );
      break;
  }
  return r;
}
function cN(e) {
  const { top: t, right: n, bottom: r, left: o } = e;
  return [
    { x: o, y: t },
    { x: n, y: t },
    { x: n, y: r },
    { x: o, y: r }
  ];
}
function lN(e, t) {
  const { x: n, y: r } = e;
  let o = !1;
  for (let i = 0, s = t.length - 1; i < t.length; s = i++) {
    const a = t[i].x, l = t[i].y, u = t[s].x, d = t[s].y;
    l > r != d > r && n < (u - a) * (r - l) / (d - l) + a && (o = !o);
  }
  return o;
}
function uN(e) {
  const t = e.slice();
  return t.sort((n, r) => n.x < r.x ? -1 : n.x > r.x ? 1 : n.y < r.y ? -1 : n.y > r.y ? 1 : 0), dN(t);
}
function dN(e) {
  if (e.length <= 1)
    return e.slice();
  const t = [];
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    for (; t.length >= 2; ) {
      const i = t[t.length - 1], s = t[t.length - 2];
      if ((i.x - s.x) * (o.y - s.y) >= (i.y - s.y) * (o.x - s.x))
        t.pop();
      else
        break;
    }
    t.push(o);
  }
  t.pop();
  const n = [];
  for (let r = e.length - 1; r >= 0; r--) {
    const o = e[r];
    for (; n.length >= 2; ) {
      const i = n[n.length - 1], s = n[n.length - 2];
      if ((i.x - s.x) * (o.y - s.y) >= (i.y - s.y) * (o.x - s.x))
        n.pop();
      else
        break;
    }
    n.push(o);
  }
  return n.pop(), t.length === 1 && n.length === 1 && t[0].x === n[0].x && t[0].y === n[0].y ? t : t.concat(n);
}
var gN = Vl, MN = Xl, IN = Fl, eu = $l;
const mN = gN, pN = MN, fN = IN, tu = y(({ className: e, sideOffset: t = 4, ...n }, r) => /* @__PURE__ */ M.jsx(
  eu,
  {
    ref: r,
    className: T(
      "z-50 overflow-hidden rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-950 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
      e
    ),
    sideOffset: t,
    ...n
  }
));
tu.displayName = eu.displayName;
const bN = "sidebar:state", NN = 60 * 60 * 24 * 7, jN = "16rem", yN = "18rem", hN = "3rem", vN = "b", nu = q(null);
function fr() {
  const e = re(nu);
  if (!e)
    throw new Error("useSidebar must be used within a SidebarProvider.");
  return e;
}
const ru = y(
  ({
    defaultOpen: e = !0,
    open: t,
    onOpenChange: n,
    className: r,
    style: o,
    children: i,
    ...s
  }, a) => {
    const l = hb(), [u, d] = O(!1), [g, I] = O(e), m = t ?? g, p = L(
      (j) => {
        const h = typeof j == "function" ? j(m) : j;
        n ? n(h) : I(h), document.cookie = `${bN}=${h}; path=/; max-age=${NN}`;
      },
      [n, m]
    ), f = L(() => l ? d((j) => !j) : p((j) => !j), [l, p, d]);
    C(() => {
      const j = (h) => {
        h.key === vN && (h.metaKey || h.ctrlKey) && (h.preventDefault(), f());
      };
      return window.addEventListener("keydown", j), () => window.removeEventListener("keydown", j);
    }, [f]);
    const b = m ? "expanded" : "collapsed", N = H(
      () => ({
        state: b,
        open: m,
        setOpen: p,
        isMobile: l,
        openMobile: u,
        setOpenMobile: d,
        toggleSidebar: f
      }),
      [b, m, p, l, u, d, f]
    );
    return /* @__PURE__ */ M.jsx(nu.Provider, { value: N, children: /* @__PURE__ */ M.jsx(mN, { delayDuration: 0, children: /* @__PURE__ */ M.jsx(
      "div",
      {
        ref: a,
        className: T(
          "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
          r
        ),
        style: {
          "--sidebar-width": jN,
          "--sidebar-width-icon": hN,
          ...o
        },
        ...s,
        children: i
      }
    ) }) });
  }
);
ru.displayName = "SidebarProvider";
const ou = y(
  ({
    side: e = "left",
    variant: t = "sidebar",
    collapsible: n = "offcanvas",
    className: r,
    children: o,
    ...i
  }, s) => {
    const { isMobile: a, state: l, openMobile: u, setOpenMobile: d } = fr();
    return n === "none" ? /* @__PURE__ */ M.jsx(
      "div",
      {
        ref: s,
        className: T(
          "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
          r
        ),
        ...i,
        children: o
      }
    ) : a ? /* @__PURE__ */ M.jsx(Yb, { open: u, onOpenChange: d, ...i, children: /* @__PURE__ */ M.jsx(
      Bl,
      {
        className: "w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
        "data-mobile": "true",
        "data-sidebar": "sidebar",
        side: e,
        style: {
          "--sidebar-width": yN
        },
        children: /* @__PURE__ */ M.jsx("div", { className: "flex h-full w-full flex-col", children: o })
      }
    ) }) : /* @__PURE__ */ M.jsxs(
      "div",
      {
        ref: s,
        className: "group peer hidden text-sidebar-foreground md:block",
        "data-collapsible": l === "collapsed" ? n : "",
        "data-side": e,
        "data-state": l,
        "data-variant": t,
        children: [
          /* @__PURE__ */ M.jsx(
            "div",
            {
              className: T(
                "duration-200 relative h-svh w-[--sidebar-width] bg-transparent transition-[width] ease-linear",
                "group-data-[collapsible=offcanvas]:w-0",
                "group-data-[side=right]:rotate-180",
                t === "floating" || t === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]" : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]"
              )
            }
          ),
          /* @__PURE__ */ M.jsx(
            "div",
            {
              className: T(
                "duration-200 fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] ease-linear md:flex",
                e === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
                // Adjust the padding for floating and inset variants.
                t === "floating" || t === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]" : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
                r
              ),
              ...i,
              children: /* @__PURE__ */ M.jsx(
                "div",
                {
                  className: "flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow",
                  "data-sidebar": "sidebar",
                  children: o
                }
              )
            }
          )
        ]
      }
    );
  }
);
ou.displayName = "Sidebar";
const wN = y(({ className: e, onClick: t, ...n }, r) => {
  const { toggleSidebar: o } = fr();
  return /* @__PURE__ */ M.jsxs(
    On,
    {
      ref: r,
      className: T("h-7 w-7", e),
      "data-sidebar": "trigger",
      size: "icon",
      variant: "ghost",
      onClick: (i) => {
        t == null || t(i), o();
      },
      ...n,
      children: [
        /* @__PURE__ */ M.jsx(Lm, {}),
        /* @__PURE__ */ M.jsx("span", { className: "sr-only", children: "Toggle Sidebar" })
      ]
    }
  );
});
wN.displayName = "SidebarTrigger";
const DN = y(({ className: e, ...t }, n) => {
  const { toggleSidebar: r } = fr();
  return /* @__PURE__ */ M.jsx(
    "button",
    {
      ref: n,
      "aria-label": "Toggle Sidebar",
      className: T(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        e
      ),
      "data-sidebar": "rail",
      tabIndex: -1,
      title: "Toggle Sidebar",
      type: "button",
      onClick: r,
      ...t
    }
  );
});
DN.displayName = "SidebarRail";
const SN = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "main",
  {
    ref: n,
    className: T(
      "relative flex min-h-svh flex-1 flex-col bg-white dark:bg-neutral-950",
      "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
      e
    ),
    ...t
  }
));
SN.displayName = "SidebarInset";
const xN = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  yl,
  {
    ref: n,
    className: T(
      "h-8 w-full bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring dark:bg-neutral-950",
      e
    ),
    "data-sidebar": "input",
    ...t
  }
));
xN.displayName = "SidebarInput";
const AN = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "div",
  {
    ref: n,
    className: T("flex flex-col gap-2 p-2", e),
    "data-sidebar": "header",
    ...t
  }
));
AN.displayName = "SidebarHeader";
const LN = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "div",
  {
    ref: n,
    className: T("flex flex-col gap-2 p-2", e),
    "data-sidebar": "footer",
    ...t
  }
));
LN.displayName = "SidebarFooter";
const CN = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  wl,
  {
    ref: n,
    className: T("mx-2 w-auto bg-sidebar-border", e),
    "data-sidebar": "separator",
    ...t
  }
));
CN.displayName = "SidebarSeparator";
const iu = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "div",
  {
    ref: n,
    className: T(
      "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
      e
    ),
    "data-sidebar": "content",
    ...t
  }
));
iu.displayName = "SidebarContent";
const su = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "div",
  {
    ref: n,
    className: T("relative flex w-full min-w-0 flex-col p-2", e),
    "data-sidebar": "group",
    ...t
  }
));
su.displayName = "SidebarGroup";
const TN = y(({ className: e, asChild: t = !1, ...n }, r) => {
  const o = t ? ce : "div";
  return /* @__PURE__ */ M.jsx(
    o,
    {
      ref: r,
      className: T(
        "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        e
      ),
      "data-sidebar": "group-label",
      ...n
    }
  );
});
TN.displayName = "SidebarGroupLabel";
const kN = y(({ className: e, asChild: t = !1, ...n }, r) => {
  const o = t ? ce : "button";
  return /* @__PURE__ */ M.jsx(
    o,
    {
      ref: r,
      className: T(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        e
      ),
      "data-sidebar": "group-action",
      ...n
    }
  );
});
kN.displayName = "SidebarGroupAction";
const au = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "div",
  {
    ref: n,
    className: T("w-full text-sm", e),
    "data-sidebar": "group-content",
    ...t
  }
));
au.displayName = "SidebarGroupContent";
const cu = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "ul",
  {
    ref: n,
    className: T("flex w-full min-w-0 flex-col gap-1", e),
    "data-sidebar": "menu",
    ...t
  }
));
cu.displayName = "SidebarMenu";
const lu = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "li",
  {
    ref: n,
    className: T("group/menu-item relative", e),
    "data-sidebar": "menu-item",
    ...t
  }
));
lu.displayName = "SidebarMenuItem";
const zN = nr(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline: "bg-white shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))] dark:bg-neutral-950"
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
), Ve = y(
  ({
    asChild: e = !1,
    isActive: t = !1,
    variant: n = "default",
    size: r = "default",
    tooltip: o,
    className: i,
    ...s
  }, a) => {
    const l = e ? ce : "button", { isMobile: u, state: d } = fr(), g = /* @__PURE__ */ M.jsx(
      l,
      {
        ref: a,
        className: T(zN({ variant: n, size: r }), i),
        "data-active": t,
        "data-sidebar": "menu-button",
        "data-size": r,
        ...s
      }
    );
    return o ? (typeof o == "string" && (o = {
      children: o
    }), /* @__PURE__ */ M.jsxs(pN, { children: [
      /* @__PURE__ */ M.jsx(fN, { asChild: !0, children: g }),
      /* @__PURE__ */ M.jsx(
        tu,
        {
          align: "center",
          hidden: d !== "collapsed" || u,
          side: "right",
          ...o
        }
      )
    ] })) : g;
  }
);
Ve.displayName = "SidebarMenuButton";
const EN = y(({ className: e, asChild: t = !1, showOnHover: n = !1, ...r }, o) => {
  const i = t ? ce : "button";
  return /* @__PURE__ */ M.jsx(
    i,
    {
      ref: o,
      className: T(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        n && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        e
      ),
      "data-sidebar": "menu-action",
      ...r
    }
  );
});
EN.displayName = "SidebarMenuAction";
const PN = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "div",
  {
    ref: n,
    className: T(
      "absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[collapsible=icon]:hidden",
      e
    ),
    "data-sidebar": "menu-badge",
    ...t
  }
));
PN.displayName = "SidebarMenuBadge";
const ZN = y(({ className: e, showIcon: t = !1, ...n }, r) => {
  const o = H(() => `${Math.floor(Math.random() * 40) + 50}%`, []);
  return /* @__PURE__ */ M.jsxs(
    "div",
    {
      ref: r,
      className: T("rounded-md h-8 flex gap-2 px-2 items-center", e),
      "data-sidebar": "menu-skeleton",
      ...n,
      children: [
        t && /* @__PURE__ */ M.jsx(
          cs,
          {
            className: "size-4 rounded-md",
            "data-sidebar": "menu-skeleton-icon"
          }
        ),
        /* @__PURE__ */ M.jsx(
          cs,
          {
            className: "h-4 max-w-[--skeleton-width] flex-1",
            "data-sidebar": "menu-skeleton-text",
            style: {
              "--skeleton-width": o
            }
          }
        )
      ]
    }
  );
});
ZN.displayName = "SidebarMenuSkeleton";
const _N = y(({ className: e, ...t }, n) => /* @__PURE__ */ M.jsx(
  "ul",
  {
    ref: n,
    className: T(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[collapsible=icon]:hidden",
      e
    ),
    "data-sidebar": "menu-sub",
    ...t
  }
));
_N.displayName = "SidebarMenuSub";
const ON = y(({ ...e }, t) => /* @__PURE__ */ M.jsx("li", { ref: t, ...e }));
ON.displayName = "SidebarMenuSubItem";
const WN = y(({ asChild: e = !1, size: t = "md", isActive: n, className: r, ...o }, i) => {
  const s = e ? ce : "a";
  return /* @__PURE__ */ M.jsx(
    s,
    {
      ref: i,
      className: T(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        t === "sm" && "text-xs",
        t === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        r
      ),
      "data-active": n,
      "data-sidebar": "menu-sub-button",
      "data-size": t,
      ...o
    }
  );
});
WN.displayName = "SidebarMenuSubButton";
const UN = Y.createContext({ isDirty: !1, setGlobalDirtyState: () => {
} }), RN = ({ children: e }) => {
  const [t, n] = O([]), r = L((o, i) => {
    n((s) => i && !s.includes(o) ? [...s, o] : !i && s.includes(o) ? s.filter((a) => a !== o) : s);
  }, []);
  return /* @__PURE__ */ M.jsx(UN.Provider, { value: { isDirty: t.length > 0, setGlobalDirtyState: r }, children: e });
};
function HN(e) {
  const t = Object.prototype.toString.call(e);
  return t === "[object Window]" || // In Electron context the Window object serializes to [object global]
  t === "[object global]";
}
function GN(e) {
  return "nodeType" in e;
}
function YN(e) {
  var t, n;
  return e ? HN(e) ? e : GN(e) && (t = (n = e.ownerDocument) == null ? void 0 : n.defaultView) != null ? t : window : window;
}
var ls;
(function(e) {
  e.DragStart = "dragStart", e.DragMove = "dragMove", e.DragEnd = "dragEnd", e.DragCancel = "dragCancel", e.DragOver = "dragOver", e.RegisterDroppable = "registerDroppable", e.SetDroppableDisabled = "setDroppableDisabled", e.UnregisterDroppable = "unregisterDroppable";
})(ls || (ls = {}));
const BN = /* @__PURE__ */ Object.freeze({
  x: 0,
  y: 0
});
function QN(e) {
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
function JN(e, t, n) {
  const r = QN(t);
  if (!r)
    return e;
  const {
    scaleX: o,
    scaleY: i,
    x: s,
    y: a
  } = r, l = e.left - s - (1 - o) * parseFloat(n), u = e.top - a - (1 - i) * parseFloat(n.slice(n.indexOf(" ") + 1)), d = o ? e.width / o : e.width, g = i ? e.height / i : e.height;
  return {
    width: d,
    height: g,
    top: u,
    right: l + d,
    bottom: u + g,
    left: l
  };
}
const VN = {
  ignoreTransform: !1
};
function uu(e, t) {
  t === void 0 && (t = VN);
  let n = e.getBoundingClientRect();
  if (t.ignoreTransform) {
    const {
      transform: u,
      transformOrigin: d
    } = YN(e).getComputedStyle(e);
    u && (n = JN(n, u, d));
  }
  const {
    top: r,
    left: o,
    width: i,
    height: s,
    bottom: a,
    right: l
  } = n;
  return {
    top: r,
    left: o,
    width: i,
    height: s,
    bottom: a,
    right: l
  };
}
function us(e) {
  return uu(e, {
    ignoreTransform: !0
  });
}
var Dt;
(function(e) {
  e[e.Forward = 1] = "Forward", e[e.Backward = -1] = "Backward";
})(Dt || (Dt = {}));
var ds;
(function(e) {
  e.Click = "click", e.DragStart = "dragstart", e.Keydown = "keydown", e.ContextMenu = "contextmenu", e.Resize = "resize", e.SelectionChange = "selectionchange", e.VisibilityChange = "visibilitychange";
})(ds || (ds = {}));
var he;
(function(e) {
  e.Space = "Space", e.Down = "ArrowDown", e.Right = "ArrowRight", e.Left = "ArrowLeft", e.Up = "ArrowUp", e.Esc = "Escape", e.Enter = "Enter";
})(he || (he = {}));
he.Space, he.Enter, he.Esc, he.Space, he.Enter;
var gs;
(function(e) {
  e[e.RightClick = 2] = "RightClick";
})(gs || (gs = {}));
var Ms;
(function(e) {
  e[e.Pointer = 0] = "Pointer", e[e.DraggableRect = 1] = "DraggableRect";
})(Ms || (Ms = {}));
var Is;
(function(e) {
  e[e.TreeOrder = 0] = "TreeOrder", e[e.ReversedTreeOrder = 1] = "ReversedTreeOrder";
})(Is || (Is = {}));
Dt.Backward + "", Dt.Forward + "", Dt.Backward + "", Dt.Forward + "";
var uo;
(function(e) {
  e[e.Always = 0] = "Always", e[e.BeforeDragging = 1] = "BeforeDragging", e[e.WhileDragging = 2] = "WhileDragging";
})(uo || (uo = {}));
var go;
(function(e) {
  e.Optimized = "optimized";
})(go || (go = {}));
uo.WhileDragging, go.Optimized;
({
  ...BN
});
var ms;
(function(e) {
  e[e.Uninitialized = 0] = "Uninitialized", e[e.Initializing = 1] = "Initializing", e[e.Initialized = 2] = "Initialized";
})(ms || (ms = {}));
he.Down, he.Right, he.Up, he.Left;
var te = globalThis && globalThis.__assign || function() {
  return te = Object.assign || function(e) {
    for (var t, n = 1, r = arguments.length; n < r; n++) {
      t = arguments[n];
      for (var o in t)
        Object.prototype.hasOwnProperty.call(t, o) && (e[o] = t[o]);
    }
    return e;
  }, te.apply(this, arguments);
}, du = globalThis && globalThis.__rest || function(e, t) {
  var n = {};
  for (var r in e)
    Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var o = 0, r = Object.getOwnPropertySymbols(e); o < r.length; o++)
      t.indexOf(r[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[o]) && (n[r[o]] = e[r[o]]);
  return n;
}, Jr = Symbol("NiceModalId"), di = {}, Ot = Y.createContext(di), gu = Y.createContext(null), De = {}, en = {}, XN = 0, Wt = function() {
  throw new Error("No dispatch method detected, did you embed your app with NiceModal.Provider?");
}, Mu = function() {
  return "_nice_modal_" + XN++;
}, Iu = function(e, t) {
  var n, r, o;
  switch (e === void 0 && (e = di), t.type) {
    case "nice-modal/show": {
      var i = t.payload, s = i.modalId, a = i.args;
      return te(te({}, e), (n = {}, n[s] = te(te({}, e[s]), {
        id: s,
        args: a,
        // If modal is not mounted, mount it first then make it visible.
        // There is logic inside HOC wrapper to make it visible after its first mount.
        // This mechanism ensures the entering transition.
        visible: !!en[s],
        delayVisible: !en[s]
      }), n));
    }
    case "nice-modal/hide": {
      var s = t.payload.modalId;
      return e[s] ? te(te({}, e), (r = {}, r[s] = te(te({}, e[s]), { visible: !1 }), r)) : e;
    }
    case "nice-modal/remove": {
      var s = t.payload.modalId, l = te({}, e);
      return delete l[s], l;
    }
    case "nice-modal/set-flags": {
      var u = t.payload, s = u.modalId, d = u.flags;
      return te(te({}, e), (o = {}, o[s] = te(te({}, e[s]), d), o));
    }
    default:
      return e;
  }
};
function FN(e) {
  var t;
  return (t = De[e]) === null || t === void 0 ? void 0 : t.comp;
}
function $N(e, t) {
  return {
    type: "nice-modal/show",
    payload: {
      modalId: e,
      args: t
    }
  };
}
function qN(e, t) {
  return {
    type: "nice-modal/set-flags",
    payload: {
      modalId: e,
      flags: t
    }
  };
}
function KN(e) {
  return {
    type: "nice-modal/hide",
    payload: {
      modalId: e
    }
  };
}
function ej(e) {
  return {
    type: "nice-modal/remove",
    payload: {
      modalId: e
    }
  };
}
var Oe = {}, Lt = {}, br = function(e) {
  return typeof e == "string" ? e : (e[Jr] || (e[Jr] = Mu()), e[Jr]);
};
function gi(e, t) {
  var n = br(e);
  if (typeof e != "string" && !De[n] && Nr(n, e), Wt($N(n, t)), !Oe[n]) {
    var r, o, i = new Promise(function(s, a) {
      r = s, o = a;
    });
    Oe[n] = {
      resolve: r,
      reject: o,
      promise: i
    };
  }
  return Oe[n].promise;
}
function Mi(e) {
  var t = br(e);
  if (Wt(KN(t)), delete Oe[t], !Lt[t]) {
    var n, r, o = new Promise(function(i, s) {
      n = i, r = s;
    });
    Lt[t] = {
      resolve: n,
      reject: r,
      promise: o
    };
  }
  return Lt[t].promise;
}
var mu = function(e) {
  var t = br(e);
  Wt(ej(t)), delete Oe[t], delete Lt[t];
}, tj = function(e, t) {
  Wt(qN(e, t));
};
function pu(e, t) {
  var n = re(Ot), r = re(gu), o = null, i = e && typeof e != "string";
  if (e ? o = br(e) : o = r, !o)
    throw new Error("No modal id found in NiceModal.useModal.");
  var s = o;
  C(function() {
    i && !De[s] && Nr(s, e, t);
  }, [i, s, e, t]);
  var a = n[s], l = L(function(p) {
    return gi(s, p);
  }, [s]), u = L(function() {
    return Mi(s);
  }, [s]), d = L(function() {
    return mu(s);
  }, [s]), g = L(function(p) {
    var f;
    (f = Oe[s]) === null || f === void 0 || f.resolve(p), delete Oe[s];
  }, [s]), I = L(function(p) {
    var f;
    (f = Oe[s]) === null || f === void 0 || f.reject(p), delete Oe[s];
  }, [s]), m = L(function(p) {
    var f;
    (f = Lt[s]) === null || f === void 0 || f.resolve(p), delete Lt[s];
  }, [s]);
  return H(function() {
    return {
      id: s,
      args: a == null ? void 0 : a.args,
      visible: !!(a != null && a.visible),
      keepMounted: !!(a != null && a.keepMounted),
      show: l,
      hide: u,
      remove: d,
      resolve: g,
      reject: I,
      resolveHide: m
    };
  }, [
    s,
    a == null ? void 0 : a.args,
    a == null ? void 0 : a.visible,
    a == null ? void 0 : a.keepMounted,
    l,
    u,
    d,
    g,
    I,
    m
  ]);
}
var nj = function(e) {
  return function(t) {
    var n, r = t.defaultVisible, o = t.keepMounted, i = t.id, s = du(t, ["defaultVisible", "keepMounted", "id"]), a = pu(i), l = a.args, u = a.show, d = re(Ot), g = !!d[i];
    C(function() {
      return r && u(), en[i] = !0, function() {
        delete en[i];
      };
    }, [i, u, r]), C(function() {
      o && tj(i, { keepMounted: !0 });
    }, [i, o]);
    var I = (n = d[i]) === null || n === void 0 ? void 0 : n.delayVisible;
    return C(function() {
      I && u(l);
    }, [I, l, u]), g ? Y.createElement(
      gu.Provider,
      { value: i },
      Y.createElement(e, te({}, s, l))
    ) : null;
  };
}, Nr = function(e, t, n) {
  De[e] ? De[e].props = n : De[e] = { comp: t, props: n };
}, rj = function(e) {
  delete De[e];
}, fu = function() {
  var e = re(Ot), t = Object.keys(e).filter(function(r) {
    return !!e[r];
  });
  t.forEach(function(r) {
    if (!De[r] && !en[r]) {
      console.warn("No modal found for id: " + r + ". Please check the id or if it is registered or declared via JSX.");
      return;
    }
  });
  var n = t.filter(function(r) {
    return De[r];
  }).map(function(r) {
    return te({ id: r }, De[r]);
  });
  return Y.createElement(Y.Fragment, null, n.map(function(r) {
    return Y.createElement(r.comp, te({ key: r.id, id: r.id }, r.props));
  }));
}, oj = function(e) {
  var t = e.children, n = nn(Iu, di), r = n[0];
  return Wt = n[1], Y.createElement(
    Ot.Provider,
    { value: r },
    t,
    Y.createElement(fu, null)
  );
}, ij = function(e) {
  var t = e.children, n = e.dispatch, r = e.modals;
  return !n || !r ? Y.createElement(oj, null, t) : (Wt = n, Y.createElement(
    Ot.Provider,
    { value: r },
    t,
    Y.createElement(fu, null)
  ));
}, sj = function(e) {
  var t = e.id, n = e.component;
  return C(function() {
    return Nr(t, n), function() {
      rj(t);
    };
  }, [t, n]), null;
}, aj = function(e) {
  var t, n = e.modal, r = e.handler, o = r === void 0 ? {} : r, i = du(e, ["modal", "handler"]), s = H(function() {
    return Mu();
  }, []), a = typeof n == "string" ? (t = De[n]) === null || t === void 0 ? void 0 : t.comp : n;
  if (!o)
    throw new Error("No handler found in NiceModal.ModalHolder.");
  if (!a)
    throw new Error("No modal found for id: " + n + " in NiceModal.ModalHolder.");
  return o.show = L(function(l) {
    return gi(s, l);
  }, [s]), o.hide = L(function() {
    return Mi(s);
  }, [s]), Y.createElement(a, te({ id: s }, i));
}, cj = function(e) {
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
}, lj = function(e) {
  return {
    visible: e.visible,
    onClose: function() {
      return e.hide();
    },
    afterVisibleChange: function(t) {
      t || e.resolveHide(), !t && !e.keepMounted && e.remove();
    }
  };
}, uj = function(e) {
  return {
    open: e.visible,
    onClose: function() {
      return e.hide();
    },
    onExited: function() {
      e.resolveHide(), !e.keepMounted && e.remove();
    }
  };
}, dj = function(e) {
  return {
    show: e.visible,
    onHide: function() {
      return e.hide();
    },
    onExited: function() {
      e.resolveHide(), !e.keepMounted && e.remove();
    }
  };
}, bu = {
  Provider: ij,
  ModalDef: sj,
  ModalHolder: aj,
  NiceModalContext: Ot,
  create: nj,
  register: Nr,
  getModal: FN,
  show: gi,
  hide: Mi,
  remove: mu,
  useModal: pu,
  reducer: Iu,
  antdModal: cj,
  antdDrawer: lj,
  muiDialog: uj,
  bootstrapDialog: dj
};
let gj = { data: "" }, Mj = (e) => typeof window == "object" ? ((e ? e.querySelector("#_goober") : window._goober) || Object.assign((e || document.head).appendChild(document.createElement("style")), { innerHTML: " ", id: "_goober" })).firstChild : e || gj, Ij = /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g, mj = /\/\*[^]*?\*\/|  +/g, ps = /\n+/g, $e = (e, t) => {
  let n = "", r = "", o = "";
  for (let i in e) {
    let s = e[i];
    i[0] == "@" ? i[1] == "i" ? n = i + " " + s + ";" : r += i[1] == "f" ? $e(s, i) : i + "{" + $e(s, i[1] == "k" ? "" : t) + "}" : typeof s == "object" ? r += $e(s, t ? t.replace(/([^,])+/g, (a) => i.replace(/(^:.*)|([^,])+/g, (l) => /&/.test(l) ? l.replace(/&/g, a) : a ? a + " " + l : l)) : i) : s != null && (i = /^--/.test(i) ? i : i.replace(/[A-Z]/g, "-$&").toLowerCase(), o += $e.p ? $e.p(i, s) : i + ":" + s + ";");
  }
  return n + (t && o ? t + "{" + o + "}" : o) + r;
}, Ze = {}, Nu = (e) => {
  if (typeof e == "object") {
    let t = "";
    for (let n in e)
      t += n + Nu(e[n]);
    return t;
  }
  return e;
}, pj = (e, t, n, r, o) => {
  let i = Nu(e), s = Ze[i] || (Ze[i] = ((l) => {
    let u = 0, d = 11;
    for (; u < l.length; )
      d = 101 * d + l.charCodeAt(u++) >>> 0;
    return "go" + d;
  })(i));
  if (!Ze[s]) {
    let l = i !== e ? e : ((u) => {
      let d, g, I = [{}];
      for (; d = Ij.exec(u.replace(mj, "")); )
        d[4] ? I.shift() : d[3] ? (g = d[3].replace(ps, " ").trim(), I.unshift(I[0][g] = I[0][g] || {})) : I[0][d[1]] = d[2].replace(ps, " ").trim();
      return I[0];
    })(e);
    Ze[s] = $e(o ? { ["@keyframes " + s]: l } : l, n ? "" : "." + s);
  }
  let a = n && Ze.g ? Ze.g : null;
  return n && (Ze.g = Ze[s]), ((l, u, d, g) => {
    g ? u.data = u.data.replace(g, l) : u.data.indexOf(l) === -1 && (u.data = d ? l + u.data : u.data + l);
  })(Ze[s], t, r, a), s;
}, fj = (e, t, n) => e.reduce((r, o, i) => {
  let s = t[i];
  if (s && s.call) {
    let a = s(n), l = a && a.props && a.props.className || /^go/.test(a) && a;
    s = l ? "." + l : a && typeof a == "object" ? a.props ? "" : $e(a, "") : a === !1 ? "" : a;
  }
  return r + o + (s ?? "");
}, "");
function jr(e) {
  let t = this || {}, n = e.call ? e(t.p) : e;
  return pj(n.unshift ? n.raw ? fj(n, [].slice.call(arguments, 1), t.p) : n.reduce((r, o) => Object.assign(r, o && o.call ? o(t.p) : o), {}) : n, Mj(t.target), t.g, t.o, t.k);
}
let ju, Mo, Io;
jr.bind({ g: 1 });
let Ge = jr.bind({ k: 1 });
function bj(e, t, n, r) {
  $e.p = t, ju = e, Mo = n, Io = r;
}
function ot(e, t) {
  let n = this || {};
  return function() {
    let r = arguments;
    function o(i, s) {
      let a = Object.assign({}, i), l = a.className || o.className;
      n.p = Object.assign({ theme: Mo && Mo() }, a), n.o = / *go\d+/.test(l), a.className = jr.apply(n, r) + (l ? " " + l : ""), t && (a.ref = s);
      let u = e;
      return e[0] && (u = a.as || e, delete a.as), Io && u[0] && Io(a), ju(u, a);
    }
    return t ? t(o) : o;
  };
}
var Nj = (e) => typeof e == "function", Jn = (e, t) => Nj(e) ? e(t) : e, jj = (() => {
  let e = 0;
  return () => (++e).toString();
})(), yu = (() => {
  let e;
  return () => {
    if (e === void 0 && typeof window < "u") {
      let t = matchMedia("(prefers-reduced-motion: reduce)");
      e = !t || t.matches;
    }
    return e;
  };
})(), yj = 20, En = /* @__PURE__ */ new Map(), hj = 1e3, fs = (e) => {
  if (En.has(e))
    return;
  let t = setTimeout(() => {
    En.delete(e), ft({ type: 4, toastId: e });
  }, hj);
  En.set(e, t);
}, vj = (e) => {
  let t = En.get(e);
  t && clearTimeout(t);
}, mo = (e, t) => {
  switch (t.type) {
    case 0:
      return { ...e, toasts: [t.toast, ...e.toasts].slice(0, yj) };
    case 1:
      return t.toast.id && vj(t.toast.id), { ...e, toasts: e.toasts.map((i) => i.id === t.toast.id ? { ...i, ...t.toast } : i) };
    case 2:
      let { toast: n } = t;
      return e.toasts.find((i) => i.id === n.id) ? mo(e, { type: 1, toast: n }) : mo(e, { type: 0, toast: n });
    case 3:
      let { toastId: r } = t;
      return r ? fs(r) : e.toasts.forEach((i) => {
        fs(i.id);
      }), { ...e, toasts: e.toasts.map((i) => i.id === r || r === void 0 ? { ...i, visible: !1 } : i) };
    case 4:
      return t.toastId === void 0 ? { ...e, toasts: [] } : { ...e, toasts: e.toasts.filter((i) => i.id !== t.toastId) };
    case 5:
      return { ...e, pausedAt: t.time };
    case 6:
      let o = t.time - (e.pausedAt || 0);
      return { ...e, pausedAt: void 0, toasts: e.toasts.map((i) => ({ ...i, pauseDuration: i.pauseDuration + o })) };
  }
}, Pn = [], Zn = { toasts: [], pausedAt: void 0 }, ft = (e) => {
  Zn = mo(Zn, e), Pn.forEach((t) => {
    t(Zn);
  });
}, wj = { blank: 4e3, error: 4e3, success: 2e3, loading: 1 / 0, custom: 4e3 }, Dj = (e = {}) => {
  let [t, n] = O(Zn);
  C(() => (Pn.push(n), () => {
    let o = Pn.indexOf(n);
    o > -1 && Pn.splice(o, 1);
  }), [t]);
  let r = t.toasts.map((o) => {
    var i, s;
    return { ...e, ...e[o.type], ...o, duration: o.duration || ((i = e[o.type]) == null ? void 0 : i.duration) || (e == null ? void 0 : e.duration) || wj[o.type], style: { ...e.style, ...(s = e[o.type]) == null ? void 0 : s.style, ...o.style } };
  });
  return { ...t, toasts: r };
}, Sj = (e, t = "blank", n) => ({ createdAt: Date.now(), visible: !0, type: t, ariaProps: { role: "status", "aria-live": "polite" }, message: e, pauseDuration: 0, ...n, id: (n == null ? void 0 : n.id) || jj() }), un = (e) => (t, n) => {
  let r = Sj(t, e, n);
  return ft({ type: 2, toast: r }), r.id;
}, be = (e, t) => un("blank")(e, t);
be.error = un("error");
be.success = un("success");
be.loading = un("loading");
be.custom = un("custom");
be.dismiss = (e) => {
  ft({ type: 3, toastId: e });
};
be.remove = (e) => ft({ type: 4, toastId: e });
be.promise = (e, t, n) => {
  let r = be.loading(t.loading, { ...n, ...n == null ? void 0 : n.loading });
  return e.then((o) => (be.success(Jn(t.success, o), { id: r, ...n, ...n == null ? void 0 : n.success }), o)).catch((o) => {
    be.error(Jn(t.error, o), { id: r, ...n, ...n == null ? void 0 : n.error });
  }), e;
};
var xj = (e, t) => {
  ft({ type: 1, toast: { id: e, height: t } });
}, Aj = () => {
  ft({ type: 5, time: Date.now() });
}, Lj = (e) => {
  let { toasts: t, pausedAt: n } = Dj(e);
  C(() => {
    if (n)
      return;
    let i = Date.now(), s = t.map((a) => {
      if (a.duration === 1 / 0)
        return;
      let l = (a.duration || 0) + a.pauseDuration - (i - a.createdAt);
      if (l < 0) {
        a.visible && be.dismiss(a.id);
        return;
      }
      return setTimeout(() => be.dismiss(a.id), l);
    });
    return () => {
      s.forEach((a) => a && clearTimeout(a));
    };
  }, [t, n]);
  let r = L(() => {
    n && ft({ type: 6, time: Date.now() });
  }, [n]), o = L((i, s) => {
    let { reverseOrder: a = !1, gutter: l = 8, defaultPosition: u } = s || {}, d = t.filter((m) => (m.position || u) === (i.position || u) && m.height), g = d.findIndex((m) => m.id === i.id), I = d.filter((m, p) => p < g && m.visible).length;
    return d.filter((m) => m.visible).slice(...a ? [I + 1] : [0, I]).reduce((m, p) => m + (p.height || 0) + l, 0);
  }, [t]);
  return { toasts: t, handlers: { updateHeight: xj, startPause: Aj, endPause: r, calculateOffset: o } };
}, Cj = Ge`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`, Tj = Ge`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`, kj = Ge`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`, zj = ot("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(e) => e.primary || "#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Cj} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Tj} 0.15s ease-out forwards;
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
    animation: ${kj} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`, Ej = Ge`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`, Pj = ot("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${(e) => e.secondary || "#e0e0e0"};
  border-right-color: ${(e) => e.primary || "#616161"};
  animation: ${Ej} 1s linear infinite;
`, Zj = Ge`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`, _j = Ge`
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
}`, Oj = ot("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(e) => e.primary || "#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Zj} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${_j} 0.2s ease-out forwards;
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
`, Wj = ot("div")`
  position: absolute;
`, Uj = ot("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`, Rj = Ge`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`, Hj = ot("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Rj} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`, Gj = ({ toast: e }) => {
  let { icon: t, type: n, iconTheme: r } = e;
  return t !== void 0 ? typeof t == "string" ? c(Hj, null, t) : t : n === "blank" ? null : c(Uj, null, c(Pj, { ...r }), n !== "loading" && c(Wj, null, n === "error" ? c(zj, { ...r }) : c(Oj, { ...r })));
}, Yj = (e) => `
0% {transform: translate3d(0,${e * -200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`, Bj = (e) => `
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e * -150}%,-1px) scale(.6); opacity:0;}
`, Qj = "0%{opacity:0;} 100%{opacity:1;}", Jj = "0%{opacity:1;} 100%{opacity:0;}", Vj = ot("div")`
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
`, Xj = ot("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`, Fj = (e, t) => {
  let n = e.includes("top") ? 1 : -1, [r, o] = yu() ? [Qj, Jj] : [Yj(n), Bj(n)];
  return { animation: t ? `${Ge(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards` : `${Ge(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)` };
}, $j = Fs(({ toast: e, position: t, style: n, children: r }) => {
  let o = e.height ? Fj(e.position || t || "top-center", e.visible) : { opacity: 0 }, i = c(Gj, { toast: e }), s = c(Xj, { ...e.ariaProps }, Jn(e.message, e));
  return c(Vj, { className: e.className, style: { ...o, ...n, ...e.style } }, typeof r == "function" ? r({ icon: i, message: s }) : c(tn, null, i, s));
});
bj(c);
var qj = ({ id: e, className: t, style: n, onHeightUpdate: r, children: o }) => {
  let i = L((s) => {
    if (s) {
      let a = () => {
        let l = s.getBoundingClientRect().height;
        r(e, l);
      };
      a(), new MutationObserver(a).observe(s, { subtree: !0, childList: !0, characterData: !0 });
    }
  }, [e, r]);
  return c("div", { ref: i, className: t, style: n }, o);
}, Kj = (e, t) => {
  let n = e.includes("top"), r = n ? { top: 0 } : { bottom: 0 }, o = e.includes("center") ? { justifyContent: "center" } : e.includes("right") ? { justifyContent: "flex-end" } : {};
  return { left: 0, right: 0, display: "flex", position: "absolute", transition: yu() ? void 0 : "all 230ms cubic-bezier(.21,1.02,.73,1)", transform: `translateY(${t * (n ? 1 : -1)}px)`, ...r, ...o };
}, ey = jr`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`, hn = 16, ty = ({ reverseOrder: e, position: t = "top-center", toastOptions: n, gutter: r, children: o, containerStyle: i, containerClassName: s }) => {
  let { toasts: a, handlers: l } = Lj(n);
  return c("div", { style: { position: "fixed", zIndex: 9999, top: hn, left: hn, right: hn, bottom: hn, pointerEvents: "none", ...i }, className: s, onMouseEnter: l.startPause, onMouseLeave: l.endPause }, a.map((u) => {
    let d = u.position || t, g = l.calculateOffset(u, { reverseOrder: e, gutter: r, defaultPosition: t }), I = Kj(d, g);
    return c(qj, { id: u.id, key: u.id, onHeightUpdate: l.updateHeight, className: u.visible ? ey : "", style: I }, u.type === "custom" ? Jn(u.message, u) : o ? o(u) : c($j, { toast: u, position: d }));
  }));
};
const ny = q({
  isAnyTextFieldFocused: !1,
  setFocusState: () => {
  },
  fetchKoenigLexical: async () => {
  },
  darkMode: !1
}), ry = ({ fetchKoenigLexical: e, darkMode: t, children: n }) => {
  const [r, o] = O(!1), i = (s) => {
    o(s);
  };
  return /* @__PURE__ */ M.jsx(ny.Provider, { value: { isAnyTextFieldFocused: r, setFocusState: i, fetchKoenigLexical: e, darkMode: t }, children: /* @__PURE__ */ M.jsxs(RN, { children: [
    /* @__PURE__ */ M.jsx(ty, {}),
    /* @__PURE__ */ M.jsx(bu.Provider, { children: n })
  ] }) });
}, oy = ({ darkMode: e, fetchKoenigLexical: t, className: n, children: r, ...o }) => {
  const i = zo(
    "shade",
    e && "dark",
    n
  );
  return /* @__PURE__ */ M.jsx("div", { className: i, ...o, children: /* @__PURE__ */ M.jsx(ry, { darkMode: e, fetchKoenigLexical: t, children: r }) });
}, hu = Object.prototype.toString;
function Ii(e) {
  switch (hu.call(e)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
      return !0;
    default:
      return gt(e, Error);
  }
}
function Ut(e, t) {
  return hu.call(e) === `[object ${t}]`;
}
function mi(e) {
  return Ut(e, "ErrorEvent");
}
function bs(e) {
  return Ut(e, "DOMError");
}
function iy(e) {
  return Ut(e, "DOMException");
}
function We(e) {
  return Ut(e, "String");
}
function vu(e) {
  return typeof e == "object" && e !== null && "__sentry_template_string__" in e && "__sentry_template_values__" in e;
}
function wu(e) {
  return e === null || vu(e) || typeof e != "object" && typeof e != "function";
}
function yr(e) {
  return Ut(e, "Object");
}
function hr(e) {
  return typeof Event < "u" && gt(e, Event);
}
function sy(e) {
  return typeof Element < "u" && gt(e, Element);
}
function ay(e) {
  return Ut(e, "RegExp");
}
function pi(e) {
  return !!(e && e.then && typeof e.then == "function");
}
function cy(e) {
  return yr(e) && "nativeEvent" in e && "preventDefault" in e && "stopPropagation" in e;
}
function ly(e) {
  return typeof e == "number" && e !== e;
}
function gt(e, t) {
  try {
    return e instanceof t;
  } catch {
    return !1;
  }
}
function Du(e) {
  return !!(typeof e == "object" && e !== null && (e.__isVue || e._isVue));
}
function po(e, t = 0) {
  return typeof e != "string" || t === 0 || e.length <= t ? e : `${e.slice(0, t)}...`;
}
function Ns(e, t) {
  if (!Array.isArray(e))
    return "";
  const n = [];
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    try {
      Du(o) ? n.push("[VueViewModel]") : n.push(String(o));
    } catch {
      n.push("[value cannot be serialized]");
    }
  }
  return n.join(t);
}
function uy(e, t, n = !1) {
  return We(e) ? ay(t) ? t.test(e) : We(t) ? n ? e === t : e.includes(t) : !1 : !1;
}
function vr(e, t = [], n = !1) {
  return t.some((r) => uy(e, r, n));
}
function dy(e, t, n = 250, r, o, i, s) {
  if (!i.exception || !i.exception.values || !s || !gt(s.originalException, Error))
    return;
  const a = i.exception.values.length > 0 ? i.exception.values[i.exception.values.length - 1] : void 0;
  a && (i.exception.values = gy(
    fo(
      e,
      t,
      o,
      s.originalException,
      r,
      i.exception.values,
      a,
      0
    ),
    n
  ));
}
function fo(e, t, n, r, o, i, s, a) {
  if (i.length >= n + 1)
    return i;
  let l = [...i];
  if (gt(r[o], Error)) {
    js(s, a);
    const u = e(t, r[o]), d = l.length;
    ys(u, o, d, a), l = fo(
      e,
      t,
      n,
      r[o],
      o,
      [u, ...l],
      u,
      d
    );
  }
  return Array.isArray(r.errors) && r.errors.forEach((u, d) => {
    if (gt(u, Error)) {
      js(s, a);
      const g = e(t, u), I = l.length;
      ys(g, `errors[${d}]`, I, a), l = fo(
        e,
        t,
        n,
        u,
        o,
        [g, ...l],
        g,
        I
      );
    }
  }), l;
}
function js(e, t) {
  e.mechanism = e.mechanism || { type: "generic", handled: !0 }, e.mechanism = {
    ...e.mechanism,
    ...e.type === "AggregateError" && { is_exception_group: !0 },
    exception_id: t
  };
}
function ys(e, t, n, r) {
  e.mechanism = e.mechanism || { type: "generic", handled: !0 }, e.mechanism = {
    ...e.mechanism,
    type: "chained",
    source: t,
    exception_id: n,
    parent_id: r
  };
}
function gy(e, t) {
  return e.map((n) => (n.value && (n.value = po(n.value, t)), n));
}
function vn(e) {
  return e && e.Math == Math ? e : void 0;
}
const J = typeof globalThis == "object" && vn(globalThis) || // eslint-disable-next-line no-restricted-globals
typeof window == "object" && vn(window) || typeof self == "object" && vn(self) || typeof global == "object" && vn(global) || function() {
  return this;
}() || {};
function fi() {
  return J;
}
function Su(e, t, n) {
  const r = n || J, o = r.__SENTRY__ = r.__SENTRY__ || {};
  return o[e] || (o[e] = t());
}
const bi = fi(), My = 80;
function xu(e, t = {}) {
  if (!e)
    return "<unknown>";
  try {
    let n = e;
    const r = 5, o = [];
    let i = 0, s = 0;
    const a = " > ", l = a.length;
    let u;
    const d = Array.isArray(t) ? t : t.keyAttrs, g = !Array.isArray(t) && t.maxStringLength || My;
    for (; n && i++ < r && (u = Iy(n, d), !(u === "html" || i > 1 && s + o.length * l + u.length >= g)); )
      o.push(u), s += u.length, n = n.parentNode;
    return o.reverse().join(a);
  } catch {
    return "<unknown>";
  }
}
function Iy(e, t) {
  const n = e, r = [];
  let o, i, s, a, l;
  if (!n || !n.tagName)
    return "";
  if (bi.HTMLElement && n instanceof HTMLElement && n.dataset && n.dataset.sentryComponent)
    return n.dataset.sentryComponent;
  r.push(n.tagName.toLowerCase());
  const u = t && t.length ? t.filter((g) => n.getAttribute(g)).map((g) => [g, n.getAttribute(g)]) : null;
  if (u && u.length)
    u.forEach((g) => {
      r.push(`[${g[0]}="${g[1]}"]`);
    });
  else if (n.id && r.push(`#${n.id}`), o = n.className, o && We(o))
    for (i = o.split(/\s+/), l = 0; l < i.length; l++)
      r.push(`.${i[l]}`);
  const d = ["aria-label", "type", "name", "title", "alt"];
  for (l = 0; l < d.length; l++)
    s = d[l], a = n.getAttribute(s), a && r.push(`[${s}="${a}"]`);
  return r.join("");
}
function my() {
  try {
    return bi.document.location.href;
  } catch {
    return "";
  }
}
function py(e) {
  if (!bi.HTMLElement)
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
const dn = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, fy = "Sentry Logger ", bo = [
  "debug",
  "info",
  "warn",
  "error",
  "log",
  "assert",
  "trace"
], Vn = {};
function Ni(e) {
  if (!("console" in J))
    return e();
  const t = J.console, n = {}, r = Object.keys(Vn);
  r.forEach((o) => {
    const i = Vn[o];
    n[o] = t[o], t[o] = i;
  });
  try {
    return e();
  } finally {
    r.forEach((o) => {
      t[o] = n[o];
    });
  }
}
function by() {
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
  return dn ? bo.forEach((n) => {
    t[n] = (...r) => {
      e && Ni(() => {
        J.console[n](`${fy}[${n}]:`, ...r);
      });
    };
  }) : bo.forEach((n) => {
    t[n] = () => {
    };
  }), t;
}
const B = by(), Ny = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;
function jy(e) {
  return e === "http" || e === "https";
}
function yy(e, t = !1) {
  const { host: n, path: r, pass: o, port: i, projectId: s, protocol: a, publicKey: l } = e;
  return `${a}://${l}${t && o ? `:${o}` : ""}@${n}${i ? `:${i}` : ""}/${r && `${r}/`}${s}`;
}
function hy(e) {
  const t = Ny.exec(e);
  if (!t) {
    Ni(() => {
      console.error(`Invalid Sentry Dsn: ${e}`);
    });
    return;
  }
  const [n, r, o = "", i, s = "", a] = t.slice(1);
  let l = "", u = a;
  const d = u.split("/");
  if (d.length > 1 && (l = d.slice(0, -1).join("/"), u = d.pop()), u) {
    const g = u.match(/^\d+/);
    g && (u = g[0]);
  }
  return Au({ host: i, pass: o, path: l, projectId: u, port: s, protocol: n, publicKey: r });
}
function Au(e) {
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
function vy(e) {
  if (!dn)
    return !0;
  const { port: t, projectId: n, protocol: r } = e;
  return ["protocol", "publicKey", "host", "projectId"].find((s) => e[s] ? !1 : (B.error(`Invalid Sentry Dsn: ${s} missing`), !0)) ? !1 : n.match(/^\d+$/) ? jy(r) ? t && isNaN(parseInt(t, 10)) ? (B.error(`Invalid Sentry Dsn: Invalid port ${t}`), !1) : !0 : (B.error(`Invalid Sentry Dsn: Invalid protocol ${r}`), !1) : (B.error(`Invalid Sentry Dsn: Invalid projectId ${n}`), !1);
}
function wy(e) {
  const t = typeof e == "string" ? hy(e) : Au(e);
  if (!(!t || !vy(t)))
    return t;
}
function se(e, t, n) {
  if (!(t in e))
    return;
  const r = e[t], o = n(r);
  typeof o == "function" && Lu(o, r), e[t] = o;
}
function Xn(e, t, n) {
  try {
    Object.defineProperty(e, t, {
      // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
      value: n,
      writable: !0,
      configurable: !0
    });
  } catch {
    dn && B.log(`Failed to add non-enumerable property "${t}" to object`, e);
  }
}
function Lu(e, t) {
  try {
    const n = t.prototype || {};
    e.prototype = t.prototype = n, Xn(e, "__sentry_original__", t);
  } catch {
  }
}
function ji(e) {
  return e.__sentry_original__;
}
function Cu(e) {
  if (Ii(e))
    return {
      message: e.message,
      name: e.name,
      stack: e.stack,
      ...vs(e)
    };
  if (hr(e)) {
    const t = {
      type: e.type,
      target: hs(e.target),
      currentTarget: hs(e.currentTarget),
      ...vs(e)
    };
    return typeof CustomEvent < "u" && gt(e, CustomEvent) && (t.detail = e.detail), t;
  } else
    return e;
}
function hs(e) {
  try {
    return sy(e) ? xu(e) : Object.prototype.toString.call(e);
  } catch {
    return "<unknown>";
  }
}
function vs(e) {
  if (typeof e == "object" && e !== null) {
    const t = {};
    for (const n in e)
      Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n]);
    return t;
  } else
    return {};
}
function Dy(e, t = 40) {
  const n = Object.keys(Cu(e));
  if (n.sort(), !n.length)
    return "[object has no keys]";
  if (n[0].length >= t)
    return po(n[0], t);
  for (let r = n.length; r > 0; r--) {
    const o = n.slice(0, r).join(", ");
    if (!(o.length > t))
      return r === n.length ? o : po(o, t);
  }
  return "";
}
function at(e) {
  return No(e, /* @__PURE__ */ new Map());
}
function No(e, t) {
  if (Sy(e)) {
    const n = t.get(e);
    if (n !== void 0)
      return n;
    const r = {};
    t.set(e, r);
    for (const o of Object.keys(e))
      typeof e[o] < "u" && (r[o] = No(e[o], t));
    return r;
  }
  if (Array.isArray(e)) {
    const n = t.get(e);
    if (n !== void 0)
      return n;
    const r = [];
    return t.set(e, r), e.forEach((o) => {
      r.push(No(o, t));
    }), r;
  }
  return e;
}
function Sy(e) {
  if (!yr(e))
    return !1;
  try {
    const t = Object.getPrototypeOf(e).constructor.name;
    return !t || t === "Object";
  } catch {
    return !0;
  }
}
const Vr = "<anonymous>";
function rt(e) {
  try {
    return !e || typeof e != "function" ? Vr : e.name || Vr;
  } catch {
    return Vr;
  }
}
const _n = {}, ws = {};
function bt(e, t) {
  _n[e] = _n[e] || [], _n[e].push(t);
}
function Nt(e, t) {
  ws[e] || (t(), ws[e] = !0);
}
function Se(e, t) {
  const n = e && _n[e];
  if (n)
    for (const r of n)
      try {
        r(t);
      } catch (o) {
        dn && B.error(
          `Error while triggering instrumentation handler.
Type: ${e}
Name: ${rt(r)}
Error:`,
          o
        );
      }
}
function xy(e) {
  const t = "console";
  bt(t, e), Nt(t, Ay);
}
function Ay() {
  "console" in J && bo.forEach(function(e) {
    e in J.console && se(J.console, e, function(t) {
      return Vn[e] = t, function(...n) {
        Se("console", { args: n, level: e });
        const o = Vn[e];
        o && o.apply(J.console, n);
      };
    });
  });
}
function xe() {
  const e = J, t = e.crypto || e.msCrypto;
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
function Tu(e) {
  return e.exception && e.exception.values ? e.exception.values[0] : void 0;
}
function qe(e) {
  const { message: t, event_id: n } = e;
  if (t)
    return t;
  const r = Tu(e);
  return r ? r.type && r.value ? `${r.type}: ${r.value}` : r.type || r.value || n || "<unknown>" : n || "<unknown>";
}
function jo(e, t, n) {
  const r = e.exception = e.exception || {}, o = r.values = r.values || [], i = o[0] = o[0] || {};
  i.value || (i.value = t || ""), i.type || (i.type = n || "Error");
}
function yo(e, t) {
  const n = Tu(e);
  if (!n)
    return;
  const r = { type: "generic", handled: !0 }, o = n.mechanism;
  if (n.mechanism = { ...r, ...o, ...t }, t && "data" in t) {
    const i = { ...o && o.data, ...t.data };
    n.mechanism.data = i;
  }
}
function Ly(e) {
  return Array.isArray(e) ? e : [e];
}
const wt = J, Cy = 1e3;
let Ds, ho, vo;
function Ty(e) {
  const t = "dom";
  bt(t, e), Nt(t, ky);
}
function ky() {
  if (!wt.document)
    return;
  const e = Se.bind(null, "dom"), t = Ss(e, !0);
  wt.document.addEventListener("click", t, !1), wt.document.addEventListener("keypress", t, !1), ["EventTarget", "Node"].forEach((n) => {
    const r = wt[n] && wt[n].prototype;
    !r || !r.hasOwnProperty || !r.hasOwnProperty("addEventListener") || (se(r, "addEventListener", function(o) {
      return function(i, s, a) {
        if (i === "click" || i == "keypress")
          try {
            const l = this, u = l.__sentry_instrumentation_handlers__ = l.__sentry_instrumentation_handlers__ || {}, d = u[i] = u[i] || { refCount: 0 };
            if (!d.handler) {
              const g = Ss(e);
              d.handler = g, o.call(this, i, g, a);
            }
            d.refCount++;
          } catch {
          }
        return o.call(this, i, s, a);
      };
    }), se(
      r,
      "removeEventListener",
      function(o) {
        return function(i, s, a) {
          if (i === "click" || i == "keypress")
            try {
              const l = this, u = l.__sentry_instrumentation_handlers__ || {}, d = u[i];
              d && (d.refCount--, d.refCount <= 0 && (o.call(this, i, d.handler, a), d.handler = void 0, delete u[i]), Object.keys(u).length === 0 && delete l.__sentry_instrumentation_handlers__);
            } catch {
            }
          return o.call(this, i, s, a);
        };
      }
    ));
  });
}
function zy(e) {
  if (e.type !== ho)
    return !1;
  try {
    if (!e.target || e.target._sentryId !== vo)
      return !1;
  } catch {
  }
  return !0;
}
function Ey(e, t) {
  return e !== "keypress" ? !1 : !t || !t.tagName ? !0 : !(t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}
function Ss(e, t = !1) {
  return (n) => {
    if (!n || n._sentryCaptured)
      return;
    const r = Py(n);
    if (Ey(n.type, r))
      return;
    Xn(n, "_sentryCaptured", !0), r && !r._sentryId && Xn(r, "_sentryId", xe());
    const o = n.type === "keypress" ? "input" : n.type;
    zy(n) || (e({ event: n, name: o, global: t }), ho = n.type, vo = r ? r._sentryId : void 0), clearTimeout(Ds), Ds = wt.setTimeout(() => {
      vo = void 0, ho = void 0;
    }, Cy);
  };
}
function Py(e) {
  try {
    return e.target;
  } catch {
    return null;
  }
}
const wo = fi();
function Zy() {
  if (!("fetch" in wo))
    return !1;
  try {
    return new Headers(), new Request("http://www.example.com"), new Response(), !0;
  } catch {
    return !1;
  }
}
function xs(e) {
  return e && /^function fetch\(\)\s+\{\s+\[native code\]\s+\}$/.test(e.toString());
}
function _y() {
  if (typeof EdgeRuntime == "string")
    return !0;
  if (!Zy())
    return !1;
  if (xs(wo.fetch))
    return !0;
  let e = !1;
  const t = wo.document;
  if (t && typeof t.createElement == "function")
    try {
      const n = t.createElement("iframe");
      n.hidden = !0, t.head.appendChild(n), n.contentWindow && n.contentWindow.fetch && (e = xs(n.contentWindow.fetch)), t.head.removeChild(n);
    } catch (n) {
      dn && B.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", n);
    }
  return e;
}
function Oy(e) {
  const t = "fetch";
  bt(t, e), Nt(t, Wy);
}
function Wy() {
  _y() && se(J, "fetch", function(e) {
    return function(...t) {
      const { method: n, url: r } = Uy(t), o = {
        args: t,
        fetchData: {
          method: n,
          url: r
        },
        startTimestamp: Date.now()
      };
      return Se("fetch", {
        ...o
      }), e.apply(J, t).then(
        (i) => {
          const s = {
            ...o,
            endTimestamp: Date.now(),
            response: i
          };
          return Se("fetch", s), i;
        },
        (i) => {
          const s = {
            ...o,
            endTimestamp: Date.now(),
            error: i
          };
          throw Se("fetch", s), i;
        }
      );
    };
  });
}
function Do(e, t) {
  return !!e && typeof e == "object" && !!e[t];
}
function As(e) {
  return typeof e == "string" ? e : e ? Do(e, "url") ? e.url : e.toString ? e.toString() : "" : "";
}
function Uy(e) {
  if (e.length === 0)
    return { method: "GET", url: "" };
  if (e.length === 2) {
    const [n, r] = e;
    return {
      url: As(n),
      method: Do(r, "method") ? String(r.method).toUpperCase() : "GET"
    };
  }
  const t = e[0];
  return {
    url: As(t),
    method: Do(t, "method") ? String(t.method).toUpperCase() : "GET"
  };
}
let wn = null;
function Ry(e) {
  const t = "error";
  bt(t, e), Nt(t, Hy);
}
function Hy() {
  wn = J.onerror, J.onerror = function(e, t, n, r, o) {
    return Se("error", {
      column: r,
      error: o,
      line: n,
      msg: e,
      url: t
    }), wn && !wn.__SENTRY_LOADER__ ? wn.apply(this, arguments) : !1;
  }, J.onerror.__SENTRY_INSTRUMENTED__ = !0;
}
let Dn = null;
function Gy(e) {
  const t = "unhandledrejection";
  bt(t, e), Nt(t, Yy);
}
function Yy() {
  Dn = J.onunhandledrejection, J.onunhandledrejection = function(e) {
    return Se("unhandledrejection", e), Dn && !Dn.__SENTRY_LOADER__ ? Dn.apply(this, arguments) : !0;
  }, J.onunhandledrejection.__SENTRY_INSTRUMENTED__ = !0;
}
const Sn = fi();
function By() {
  const e = Sn.chrome, t = e && e.app && e.app.runtime, n = "history" in Sn && !!Sn.history.pushState && !!Sn.history.replaceState;
  return !t && n;
}
const Vt = J;
let xn;
function Qy(e) {
  const t = "history";
  bt(t, e), Nt(t, Jy);
}
function Jy() {
  if (!By())
    return;
  const e = Vt.onpopstate;
  Vt.onpopstate = function(...n) {
    const r = Vt.location.href, o = xn;
    if (xn = r, Se("history", { from: o, to: r }), e)
      try {
        return e.apply(this, n);
      } catch {
      }
  };
  function t(n) {
    return function(...r) {
      const o = r.length > 2 ? r[2] : void 0;
      if (o) {
        const i = xn, s = String(o);
        xn = s, Se("history", { from: i, to: s });
      }
      return n.apply(this, r);
    };
  }
  se(Vt.history, "pushState", t), se(Vt.history, "replaceState", t);
}
const Vy = J, Ft = "__sentry_xhr_v3__";
function Xy(e) {
  const t = "xhr";
  bt(t, e), Nt(t, Fy);
}
function Fy() {
  if (!Vy.XMLHttpRequest)
    return;
  const e = XMLHttpRequest.prototype;
  se(e, "open", function(t) {
    return function(...n) {
      const r = Date.now(), o = We(n[0]) ? n[0].toUpperCase() : void 0, i = $y(n[1]);
      if (!o || !i)
        return t.apply(this, n);
      this[Ft] = {
        method: o,
        url: i,
        request_headers: {}
      }, o === "POST" && i.match(/sentry_key/) && (this.__sentry_own_request__ = !0);
      const s = () => {
        const a = this[Ft];
        if (a && this.readyState === 4) {
          try {
            a.status_code = this.status;
          } catch {
          }
          const l = {
            args: [o, i],
            endTimestamp: Date.now(),
            startTimestamp: r,
            xhr: this
          };
          Se("xhr", l);
        }
      };
      return "onreadystatechange" in this && typeof this.onreadystatechange == "function" ? se(this, "onreadystatechange", function(a) {
        return function(...l) {
          return s(), a.apply(this, l);
        };
      }) : this.addEventListener("readystatechange", s), se(this, "setRequestHeader", function(a) {
        return function(...l) {
          const [u, d] = l, g = this[Ft];
          return g && We(u) && We(d) && (g.request_headers[u.toLowerCase()] = d), a.apply(this, l);
        };
      }), t.apply(this, n);
    };
  }), se(e, "send", function(t) {
    return function(...n) {
      const r = this[Ft];
      if (!r)
        return t.apply(this, n);
      n[0] !== void 0 && (r.body = n[0]);
      const o = {
        args: [r.method, r.url],
        startTimestamp: Date.now(),
        xhr: this
      };
      return Se("xhr", o), t.apply(this, n);
    };
  });
}
function $y(e) {
  if (We(e))
    return e;
  try {
    return e.toString();
  } catch {
  }
}
function qy() {
  const e = typeof WeakSet == "function", t = e ? /* @__PURE__ */ new WeakSet() : [];
  function n(o) {
    if (e)
      return t.has(o) ? !0 : (t.add(o), !1);
    for (let i = 0; i < t.length; i++)
      if (t[i] === o)
        return !0;
    return t.push(o), !1;
  }
  function r(o) {
    if (e)
      t.delete(o);
    else
      for (let i = 0; i < t.length; i++)
        if (t[i] === o) {
          t.splice(i, 1);
          break;
        }
  }
  return [n, r];
}
function Ky(e, t = 100, n = 1 / 0) {
  try {
    return So("", e, t, n);
  } catch (r) {
    return { ERROR: `**non-serializable** (${r})` };
  }
}
function ku(e, t = 3, n = 100 * 1024) {
  const r = Ky(e, t);
  return rh(r) > n ? ku(e, t - 1, n) : r;
}
function So(e, t, n = 1 / 0, r = 1 / 0, o = qy()) {
  const [i, s] = o;
  if (t == null || // this matches null and undefined -> eqeq not eqeqeq
  ["number", "boolean", "string"].includes(typeof t) && !ly(t))
    return t;
  const a = eh(e, t);
  if (!a.startsWith("[object "))
    return a;
  if (t.__sentry_skip_normalization__)
    return t;
  const l = typeof t.__sentry_override_normalization_depth__ == "number" ? t.__sentry_override_normalization_depth__ : n;
  if (l === 0)
    return a.replace("object ", "");
  if (i(t))
    return "[Circular ~]";
  const u = t;
  if (u && typeof u.toJSON == "function")
    try {
      const m = u.toJSON();
      return So("", m, l - 1, r, o);
    } catch {
    }
  const d = Array.isArray(t) ? [] : {};
  let g = 0;
  const I = Cu(t);
  for (const m in I) {
    if (!Object.prototype.hasOwnProperty.call(I, m))
      continue;
    if (g >= r) {
      d[m] = "[MaxProperties ~]";
      break;
    }
    const p = I[m];
    d[m] = So(m, p, l - 1, r, o), g++;
  }
  return s(t), d;
}
function eh(e, t) {
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
    if (Du(t))
      return "[VueViewModel]";
    if (cy(t))
      return "[SyntheticEvent]";
    if (typeof t == "number" && t !== t)
      return "[NaN]";
    if (typeof t == "function")
      return `[Function: ${rt(t)}]`;
    if (typeof t == "symbol")
      return `[${String(t)}]`;
    if (typeof t == "bigint")
      return `[BigInt: ${String(t)}]`;
    const n = th(t);
    return /^HTML(\w*)Element$/.test(n) ? `[HTMLElement: ${n}]` : `[object ${n}]`;
  } catch (n) {
    return `**non-serializable** (${n})`;
  }
}
function th(e) {
  const t = Object.getPrototypeOf(e);
  return t ? t.constructor.name : "null prototype";
}
function nh(e) {
  return ~-encodeURI(e).split(/%..|./).length;
}
function rh(e) {
  return nh(JSON.stringify(e));
}
var _e;
(function(e) {
  e[e.PENDING = 0] = "PENDING";
  const n = 1;
  e[e.RESOLVED = n] = "RESOLVED";
  const r = 2;
  e[e.REJECTED = r] = "REJECTED";
})(_e || (_e = {}));
class Xe {
  constructor(t) {
    Xe.prototype.__init.call(this), Xe.prototype.__init2.call(this), Xe.prototype.__init3.call(this), Xe.prototype.__init4.call(this), this._state = _e.PENDING, this._handlers = [];
    try {
      t(this._resolve, this._reject);
    } catch (n) {
      this._reject(n);
    }
  }
  /** JSDoc */
  then(t, n) {
    return new Xe((r, o) => {
      this._handlers.push([
        !1,
        (i) => {
          if (!t)
            r(i);
          else
            try {
              r(t(i));
            } catch (s) {
              o(s);
            }
        },
        (i) => {
          if (!n)
            o(i);
          else
            try {
              r(n(i));
            } catch (s) {
              o(s);
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
    return new Xe((n, r) => {
      let o, i;
      return this.then(
        (s) => {
          i = !1, o = s, t && t();
        },
        (s) => {
          i = !0, o = s, t && t();
        }
      ).then(() => {
        if (i) {
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
      this._setResult(_e.RESOLVED, t);
    };
  }
  /** JSDoc */
  __init2() {
    this._reject = (t) => {
      this._setResult(_e.REJECTED, t);
    };
  }
  /** JSDoc */
  __init3() {
    this._setResult = (t, n) => {
      if (this._state === _e.PENDING) {
        if (pi(n)) {
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
      if (this._state === _e.PENDING)
        return;
      const t = this._handlers.slice();
      this._handlers = [], t.forEach((n) => {
        n[0] || (this._state === _e.RESOLVED && n[1](this._value), this._state === _e.REJECTED && n[2](this._value), n[0] = !0);
      });
    };
  }
}
function Xr(e) {
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
const oh = ["fatal", "error", "warning", "log", "info", "debug"];
function ih(e) {
  return e === "warn" ? "warning" : oh.includes(e) ? e : "log";
}
const zu = 1e3;
function yi() {
  return Date.now() / zu;
}
function sh() {
  const { performance: e } = J;
  if (!e || !e.now)
    return yi;
  const t = Date.now() - e.now(), n = e.timeOrigin == null ? t : e.timeOrigin;
  return () => (n + e.now()) / zu;
}
const Eu = sh();
(() => {
  const { performance: e } = J;
  if (!e || !e.now)
    return;
  const t = 3600 * 1e3, n = e.now(), r = Date.now(), o = e.timeOrigin ? Math.abs(e.timeOrigin + n - r) : t, i = o < t, s = e.timing && e.timing.navigationStart, l = typeof s == "number" ? Math.abs(s + n - r) : t, u = l < t;
  return i || u ? o <= l ? e.timeOrigin : s : r;
})();
const ve = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, Pu = "production";
function ah() {
  return Su("globalEventProcessors", () => []);
}
function xo(e, t, n, r = 0) {
  return new Xe((o, i) => {
    const s = e[r];
    if (t === null || typeof s != "function")
      o(t);
    else {
      const a = s({ ...t }, n);
      ve && s.id && a === null && B.log(`Event processor "${s.id}" dropped event`), pi(a) ? a.then((l) => xo(e, l, n, r + 1).then(o)).then(null, i) : xo(e, a, n, r + 1).then(o).then(null, i);
    }
  });
}
function ch(e) {
  const t = Eu(), n = {
    sid: xe(),
    init: !0,
    timestamp: t,
    started: t,
    duration: 0,
    status: "ok",
    errors: 0,
    ignoreDuration: !1,
    toJSON: () => uh(n)
  };
  return e && wr(n, e), n;
}
function wr(e, t = {}) {
  if (t.user && (!e.ipAddress && t.user.ip_address && (e.ipAddress = t.user.ip_address), !e.did && !t.did && (e.did = t.user.id || t.user.email || t.user.username)), e.timestamp = t.timestamp || Eu(), t.abnormal_mechanism && (e.abnormal_mechanism = t.abnormal_mechanism), t.ignoreDuration && (e.ignoreDuration = t.ignoreDuration), t.sid && (e.sid = t.sid.length === 32 ? t.sid : xe()), t.init !== void 0 && (e.init = t.init), !e.did && t.did && (e.did = `${t.did}`), typeof t.started == "number" && (e.started = t.started), e.ignoreDuration)
    e.duration = void 0;
  else if (typeof t.duration == "number")
    e.duration = t.duration;
  else {
    const n = e.timestamp - e.started;
    e.duration = n >= 0 ? n : 0;
  }
  t.release && (e.release = t.release), t.environment && (e.environment = t.environment), !e.ipAddress && t.ipAddress && (e.ipAddress = t.ipAddress), !e.userAgent && t.userAgent && (e.userAgent = t.userAgent), typeof t.errors == "number" && (e.errors = t.errors), t.status && (e.status = t.status);
}
function lh(e, t) {
  let n = {};
  t ? n = { status: t } : e.status === "ok" && (n = { status: "exited" }), wr(e, n);
}
function uh(e) {
  return at({
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
const dh = 1;
function gh(e) {
  const { spanId: t, traceId: n } = e.spanContext(), { data: r, op: o, parent_span_id: i, status: s, tags: a, origin: l } = Fn(e);
  return at({
    data: r,
    op: o,
    parent_span_id: i,
    span_id: t,
    status: s,
    tags: a,
    trace_id: n,
    origin: l
  });
}
function Fn(e) {
  return Mh(e) ? e.getSpanJSON() : typeof e.toJSON == "function" ? e.toJSON() : {};
}
function Mh(e) {
  return typeof e.getSpanJSON == "function";
}
function Ih(e) {
  const { traceFlags: t } = e.spanContext();
  return !!(t & dh);
}
function mh(e) {
  if (e)
    return ph(e) ? { captureContext: e } : bh(e) ? {
      captureContext: e
    } : e;
}
function ph(e) {
  return e instanceof lt || typeof e == "function";
}
const fh = [
  "user",
  "level",
  "extra",
  "contexts",
  "tags",
  "fingerprint",
  "requestSession",
  "propagationContext"
];
function bh(e) {
  return Object.keys(e).some((t) => fh.includes(t));
}
function Zu(e, t) {
  return jt().captureException(e, mh(t));
}
function _u(e, t) {
  return jt().captureEvent(e, t);
}
function Mt(e, t) {
  jt().addBreadcrumb(e, t);
}
function Ou(...e) {
  const t = jt();
  if (e.length === 2) {
    const [n, r] = e;
    return n ? t.withScope(() => (t.getStackTop().scope = n, r(n))) : t.withScope(r);
  }
  return t.withScope(e[0]);
}
function me() {
  return jt().getClient();
}
function Nh() {
  return jt().getScope();
}
function Wu(e) {
  return e.transaction;
}
function jh(e, t, n) {
  const r = t.getOptions(), { publicKey: o } = t.getDsn() || {}, { segment: i } = n && n.getUser() || {}, s = at({
    environment: r.environment || Pu,
    release: r.release,
    user_segment: i,
    public_key: o,
    trace_id: e
  });
  return t.emit && t.emit("createDsc", s), s;
}
function yh(e) {
  const t = me();
  if (!t)
    return {};
  const n = jh(Fn(e).trace_id || "", t, Nh()), r = Wu(e);
  if (!r)
    return n;
  const o = r && r._frozenDynamicSamplingContext;
  if (o)
    return o;
  const { sampleRate: i, source: s } = r.metadata;
  i != null && (n.sample_rate = `${i}`);
  const a = Fn(r);
  return s && s !== "url" && (n.transaction = a.description), n.sampled = String(Ih(r)), t.emit && t.emit("createDsc", n), n;
}
function hh(e, t) {
  const { fingerprint: n, span: r, breadcrumbs: o, sdkProcessingMetadata: i } = t;
  vh(e, t), r && Sh(e, r), xh(e, n), wh(e, o), Dh(e, i);
}
function vh(e, t) {
  const {
    extra: n,
    tags: r,
    user: o,
    contexts: i,
    level: s,
    // eslint-disable-next-line deprecation/deprecation
    transactionName: a
  } = t, l = at(n);
  l && Object.keys(l).length && (e.extra = { ...l, ...e.extra });
  const u = at(r);
  u && Object.keys(u).length && (e.tags = { ...u, ...e.tags });
  const d = at(o);
  d && Object.keys(d).length && (e.user = { ...d, ...e.user });
  const g = at(i);
  g && Object.keys(g).length && (e.contexts = { ...g, ...e.contexts }), s && (e.level = s), a && (e.transaction = a);
}
function wh(e, t) {
  const n = [...e.breadcrumbs || [], ...t];
  e.breadcrumbs = n.length ? n : void 0;
}
function Dh(e, t) {
  e.sdkProcessingMetadata = {
    ...e.sdkProcessingMetadata,
    ...t
  };
}
function Sh(e, t) {
  e.contexts = { trace: gh(t), ...e.contexts };
  const n = Wu(t);
  if (n) {
    e.sdkProcessingMetadata = {
      dynamicSamplingContext: yh(t),
      ...e.sdkProcessingMetadata
    };
    const r = Fn(n).description;
    r && (e.tags = { transaction: r, ...e.tags });
  }
}
function xh(e, t) {
  e.fingerprint = e.fingerprint ? Ly(e.fingerprint) : [], t && (e.fingerprint = e.fingerprint.concat(t)), e.fingerprint && !e.fingerprint.length && delete e.fingerprint;
}
const Ah = 100;
class lt {
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
    this._notifyingListeners = !1, this._scopeListeners = [], this._eventProcessors = [], this._breadcrumbs = [], this._attachments = [], this._user = {}, this._tags = {}, this._extra = {}, this._contexts = {}, this._sdkProcessingMetadata = {}, this._propagationContext = Ls();
  }
  /**
   * Inherit values from the parent scope.
   * @deprecated Use `scope.clone()` and `new Scope()` instead.
   */
  static clone(t) {
    return t ? t.clone() : new lt();
  }
  /**
   * Clone this scope instance.
   */
  clone() {
    const t = new lt();
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
    }, this._session && wr(this._session, { user: t }), this._notifyScopeListeners(), this;
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
    if (n instanceof lt) {
      const r = n.getScopeData();
      this._tags = { ...this._tags, ...r.tags }, this._extra = { ...this._extra, ...r.extra }, this._contexts = { ...this._contexts, ...r.contexts }, r.user && Object.keys(r.user).length && (this._user = r.user), r.level && (this._level = r.level), r.fingerprint.length && (this._fingerprint = r.fingerprint), n.getRequestSession() && (this._requestSession = n.getRequestSession()), r.propagationContext && (this._propagationContext = r.propagationContext);
    } else if (yr(n)) {
      const r = t;
      this._tags = { ...this._tags, ...r.tags }, this._extra = { ...this._extra, ...r.extra }, this._contexts = { ...this._contexts, ...r.contexts }, r.user && (this._user = r.user), r.level && (this._level = r.level), r.fingerprint && (this._fingerprint = r.fingerprint), r.requestSession && (this._requestSession = r.requestSession), r.propagationContext && (this._propagationContext = r.propagationContext);
    }
    return this;
  }
  /**
   * @inheritDoc
   */
  clear() {
    return this._breadcrumbs = [], this._tags = {}, this._extra = {}, this._user = {}, this._contexts = {}, this._level = void 0, this._transactionName = void 0, this._fingerprint = void 0, this._requestSession = void 0, this._span = void 0, this._session = void 0, this._notifyScopeListeners(), this._attachments = [], this._propagationContext = Ls(), this;
  }
  /**
   * @inheritDoc
   */
  addBreadcrumb(t, n) {
    const r = typeof n == "number" ? n : Ah;
    if (r <= 0)
      return this;
    const o = {
      timestamp: yi(),
      ...t
    }, i = this._breadcrumbs;
    return i.push(o), this._breadcrumbs = i.length > r ? i.slice(-r) : i, this._notifyScopeListeners(), this;
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
      _extra: i,
      _user: s,
      _level: a,
      _fingerprint: l,
      _eventProcessors: u,
      _propagationContext: d,
      _sdkProcessingMetadata: g,
      _transactionName: I,
      _span: m
    } = this;
    return {
      breadcrumbs: t,
      attachments: n,
      contexts: r,
      tags: o,
      extra: i,
      user: s,
      level: a,
      fingerprint: l || [],
      eventProcessors: u,
      propagationContext: d,
      sdkProcessingMetadata: g,
      transactionName: I,
      span: m
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
    hh(t, this.getScopeData());
    const o = [
      ...r,
      // eslint-disable-next-line deprecation/deprecation
      ...ah(),
      ...this._eventProcessors
    ];
    return xo(o, t, n);
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
    const r = n && n.event_id ? n.event_id : xe();
    if (!this._client)
      return B.warn("No client configured on scope - will not capture exception!"), r;
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
    const o = r && r.event_id ? r.event_id : xe();
    if (!this._client)
      return B.warn("No client configured on scope - will not capture message!"), o;
    const i = new Error(t);
    return this._client.captureMessage(
      t,
      n,
      {
        originalException: t,
        syntheticException: i,
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
    const r = n && n.event_id ? n.event_id : xe();
    return this._client ? (this._client.captureEvent(t, { ...n, event_id: r }, this), r) : (B.warn("No client configured on scope - will not capture event!"), r);
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
function Ls() {
  return {
    traceId: xe(),
    spanId: xe().substring(16)
  };
}
const Lh = "7.119.2", Uu = parseFloat(Lh), Ch = 100;
class Ru {
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
  constructor(t, n, r, o = Uu) {
    this._version = o;
    let i;
    n ? i = n : (i = new lt(), i.setClient(t));
    let s;
    r ? s = r : (s = new lt(), s.setClient(t)), this._stack = [{ scope: i }], t && this.bindClient(t), this._isolationScope = s;
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
    return pi(r) ? r.then(
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
    const r = this._lastEventId = n && n.event_id ? n.event_id : xe(), o = new Error("Sentry syntheticException");
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
    const o = this._lastEventId = r && r.event_id ? r.event_id : xe(), i = new Error(t);
    return this.getScope().captureMessage(t, n, {
      originalException: t,
      syntheticException: i,
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
    const r = n && n.event_id ? n.event_id : xe();
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
    const { beforeBreadcrumb: i = null, maxBreadcrumbs: s = Ch } = o.getOptions && o.getOptions() || {};
    if (s <= 0)
      return;
    const l = { timestamp: yi(), ...t }, u = i ? Ni(() => i(l, n)) : l;
    u !== null && (o.emit && o.emit("beforeAddBreadcrumb", u, n), r.addBreadcrumb(u, s));
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
    const n = Cs(this);
    try {
      t(this);
    } finally {
      Cs(n);
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
      return ve && B.warn(`Cannot retrieve integration ${t.id} from the current Hub`), null;
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
    return ve && !r && (this.getClient() ? B.warn(`Tracing extension 'startTransaction' has not been added. Call 'addTracingExtensions' before calling 'init':
Sentry.addTracingExtensions();
Sentry.init({...});
`) : B.warn(
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
    r && lh(r), this._sendSessionUpdate(), n.setSession();
  }
  /**
   * @inheritDoc
   * @deprecated Use top level `startSession` instead.
   */
  startSession(t) {
    const { scope: n, client: r } = this.getStackTop(), { release: o, environment: i = Pu } = r && r.getOptions() || {}, { userAgent: s } = J.navigator || {}, a = ch({
      release: o,
      environment: i,
      user: n.getUser(),
      ...s && { userAgent: s },
      ...t
    }), l = n.getSession && n.getSession();
    return l && l.status === "ok" && wr(l, { status: "exited" }), this.endSession(), n.setSession(a), a;
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
    const o = Dr().__SENTRY__;
    if (o && o.extensions && typeof o.extensions[t] == "function")
      return o.extensions[t].apply(this, n);
    ve && B.warn(`Extension method ${t} couldn't be found, doing nothing.`);
  }
}
function Dr() {
  return J.__SENTRY__ = J.__SENTRY__ || {
    extensions: {},
    hub: void 0
  }, J;
}
function Cs(e) {
  const t = Dr(), n = Ao(t);
  return Hu(t, e), n;
}
function jt() {
  const e = Dr();
  if (e.__SENTRY__ && e.__SENTRY__.acs) {
    const t = e.__SENTRY__.acs.getCurrentHub();
    if (t)
      return t;
  }
  return Th(e);
}
function Th(e = Dr()) {
  return (!kh(e) || // eslint-disable-next-line deprecation/deprecation
  Ao(e).isOlderThan(Uu)) && Hu(e, new Ru()), Ao(e);
}
function kh(e) {
  return !!(e && e.__SENTRY__ && e.__SENTRY__.hub);
}
function Ao(e) {
  return Su("hub", () => new Ru(), e);
}
function Hu(e, t) {
  if (!e)
    return !1;
  const n = e.__SENTRY__ = e.__SENTRY__ || {};
  return n.hub = t, !0;
}
function zh(e) {
  const t = e.protocol ? `${e.protocol}:` : "", n = e.port ? `:${e.port}` : "";
  return `${t}//${e.host}${n}${e.path ? `/${e.path}` : ""}/api/`;
}
function Eh(e, t) {
  const n = wy(e);
  if (!n)
    return "";
  const r = `${zh(n)}embed/error-page/`;
  let o = `dsn=${yy(n)}`;
  for (const i in t)
    if (i !== "dsn" && i !== "onClose")
      if (i === "user") {
        const s = t.user;
        if (!s)
          continue;
        s.name && (o += `&name=${encodeURIComponent(s.name)}`), s.email && (o += `&email=${encodeURIComponent(s.email)}`);
      } else
        o += `&${encodeURIComponent(i)}=${encodeURIComponent(t[i])}`;
  return `${r}?${o}`;
}
function it(e, t) {
  return Object.assign(
    function(...r) {
      return t(...r);
    },
    { id: e }
  );
}
const Ph = [
  /^Script error\.?$/,
  /^Javascript error: Script error\.? on line 0$/,
  /^ResizeObserver loop completed with undelivered notifications.$/,
  /^Cannot redefine property: googletag$/
], Zh = [
  /^.*\/healthcheck$/,
  /^.*\/healthy$/,
  /^.*\/live$/,
  /^.*\/ready$/,
  /^.*\/heartbeat$/,
  /^.*\/health$/,
  /^.*\/healthz$/
], Gu = "InboundFilters", _h = (e = {}) => ({
  name: Gu,
  // TODO v8: Remove this
  setupOnce() {
  },
  // eslint-disable-line @typescript-eslint/no-empty-function
  processEvent(t, n, r) {
    const o = r.getOptions(), i = Oh(e, o);
    return Wh(t, i) ? null : t;
  }
}), Yu = _h;
it(
  Gu,
  Yu
);
function Oh(e = {}, t = {}) {
  return {
    allowUrls: [...e.allowUrls || [], ...t.allowUrls || []],
    denyUrls: [...e.denyUrls || [], ...t.denyUrls || []],
    ignoreErrors: [
      ...e.ignoreErrors || [],
      ...t.ignoreErrors || [],
      ...e.disableErrorDefaults ? [] : Ph
    ],
    ignoreTransactions: [
      ...e.ignoreTransactions || [],
      ...t.ignoreTransactions || [],
      ...e.disableTransactionDefaults ? [] : Zh
    ],
    ignoreInternal: e.ignoreInternal !== void 0 ? e.ignoreInternal : !0
  };
}
function Wh(e, t) {
  return t.ignoreInternal && Bh(e) ? (ve && B.warn(`Event dropped due to being internal Sentry Error.
Event: ${qe(e)}`), !0) : Uh(e, t.ignoreErrors) ? (ve && B.warn(
    `Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${qe(e)}`
  ), !0) : Rh(e, t.ignoreTransactions) ? (ve && B.warn(
    `Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${qe(e)}`
  ), !0) : Hh(e, t.denyUrls) ? (ve && B.warn(
    `Event dropped due to being matched by \`denyUrls\` option.
Event: ${qe(
      e
    )}.
Url: ${$n(e)}`
  ), !0) : Gh(e, t.allowUrls) ? !1 : (ve && B.warn(
    `Event dropped due to not being matched by \`allowUrls\` option.
Event: ${qe(
      e
    )}.
Url: ${$n(e)}`
  ), !0);
}
function Uh(e, t) {
  return e.type || !t || !t.length ? !1 : Yh(e).some((n) => vr(n, t));
}
function Rh(e, t) {
  if (e.type !== "transaction" || !t || !t.length)
    return !1;
  const n = e.transaction;
  return n ? vr(n, t) : !1;
}
function Hh(e, t) {
  if (!t || !t.length)
    return !1;
  const n = $n(e);
  return n ? vr(n, t) : !1;
}
function Gh(e, t) {
  if (!t || !t.length)
    return !0;
  const n = $n(e);
  return n ? vr(n, t) : !0;
}
function Yh(e) {
  const t = [];
  e.message && t.push(e.message);
  let n;
  try {
    n = e.exception.values[e.exception.values.length - 1];
  } catch {
  }
  return n && n.value && (t.push(n.value), n.type && t.push(`${n.type}: ${n.value}`)), ve && t.length === 0 && B.error(`Could not extract message for event ${qe(e)}`), t;
}
function Bh(e) {
  try {
    return e.exception.values[0].type === "SentryError";
  } catch {
  }
  return !1;
}
function Qh(e = []) {
  for (let t = e.length - 1; t >= 0; t--) {
    const n = e[t];
    if (n && n.filename !== "<anonymous>" && n.filename !== "[native code]")
      return n.filename || null;
  }
  return null;
}
function $n(e) {
  try {
    let t;
    try {
      t = e.exception.values[0].stacktrace.frames;
    } catch {
    }
    return t ? Qh(t) : null;
  } catch {
    return ve && B.error(`Cannot extract url for event ${qe(e)}`), null;
  }
}
let Ts;
const Bu = "FunctionToString", ks = /* @__PURE__ */ new WeakMap(), Jh = () => ({
  name: Bu,
  setupOnce() {
    Ts = Function.prototype.toString;
    try {
      Function.prototype.toString = function(...e) {
        const t = ji(this), n = ks.has(me()) && t !== void 0 ? t : this;
        return Ts.apply(n, e);
      };
    } catch {
    }
  },
  setup(e) {
    ks.set(e, !0);
  }
}), Qu = Jh;
it(
  Bu,
  Qu
);
const ne = J;
let Lo = 0;
function Ju() {
  return Lo > 0;
}
function Vh() {
  Lo++, setTimeout(() => {
    Lo--;
  });
}
function Et(e, t = {}, n) {
  if (typeof e != "function")
    return e;
  try {
    const o = e.__sentry_wrapped__;
    if (o)
      return typeof o == "function" ? o : e;
    if (ji(e))
      return e;
  } catch {
    return e;
  }
  const r = function() {
    const o = Array.prototype.slice.call(arguments);
    try {
      n && typeof n == "function" && n.apply(this, arguments);
      const i = o.map((s) => Et(s, t));
      return e.apply(this, i);
    } catch (i) {
      throw Vh(), Ou((s) => {
        s.addEventProcessor((a) => (t.mechanism && (jo(a, void 0, void 0), yo(a, t.mechanism)), a.extra = {
          ...a.extra,
          arguments: o
        }, a)), Zu(i);
      }), i;
    }
  };
  try {
    for (const o in e)
      Object.prototype.hasOwnProperty.call(e, o) && (r[o] = e[o]);
  } catch {
  }
  Lu(r, e), Xn(e, "__sentry_wrapped__", r);
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
const Ct = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function Vu(e, t) {
  const n = hi(e, t), r = {
    type: t && t.name,
    value: qh(t)
  };
  return n.length && (r.stacktrace = { frames: n }), r.type === void 0 && r.value === "" && (r.value = "Unrecoverable error caught"), r;
}
function Xh(e, t, n, r) {
  const o = me(), i = o && o.getOptions().normalizeDepth, s = {
    exception: {
      values: [
        {
          type: hr(t) ? t.constructor.name : r ? "UnhandledRejection" : "Error",
          value: Kh(t, { isUnhandledRejection: r })
        }
      ]
    },
    extra: {
      __serialized__: ku(t, i)
    }
  };
  if (n) {
    const a = hi(e, n);
    a.length && (s.exception.values[0].stacktrace = { frames: a });
  }
  return s;
}
function Fr(e, t) {
  return {
    exception: {
      values: [Vu(e, t)]
    }
  };
}
function hi(e, t) {
  const n = t.stacktrace || t.stack || "", r = $h(t);
  try {
    return e(n, r);
  } catch {
  }
  return [];
}
const Fh = /Minified React error #\d+;/i;
function $h(e) {
  if (e) {
    if (typeof e.framesToPop == "number")
      return e.framesToPop;
    if (Fh.test(e.message))
      return 1;
  }
  return 0;
}
function qh(e) {
  const t = e && e.message;
  return t ? t.error && typeof t.error.message == "string" ? t.error.message : t : "No error message";
}
function Xu(e, t, n, r, o) {
  let i;
  if (mi(t) && t.error)
    return Fr(e, t.error);
  if (bs(t) || iy(t)) {
    const s = t;
    if ("stack" in t)
      i = Fr(e, t);
    else {
      const a = s.name || (bs(s) ? "DOMError" : "DOMException"), l = s.message ? `${a}: ${s.message}` : a;
      i = zs(e, l, n, r), jo(i, l);
    }
    return "code" in s && (i.tags = { ...i.tags, "DOMException.code": `${s.code}` }), i;
  }
  return Ii(t) ? Fr(e, t) : yr(t) || hr(t) ? (i = Xh(e, t, n, o), yo(i, {
    synthetic: !0
  }), i) : (i = zs(e, t, n, r), jo(i, `${t}`, void 0), yo(i, {
    synthetic: !0
  }), i);
}
function zs(e, t, n, r) {
  const o = {};
  if (r && n) {
    const i = hi(e, n);
    i.length && (o.exception = {
      values: [{ value: t, stacktrace: { frames: i } }]
    });
  }
  if (vu(t)) {
    const { __sentry_template_string__: i, __sentry_template_values__: s } = t;
    return o.logentry = {
      message: i,
      params: s
    }, o;
  }
  return o.message = t, o;
}
function Kh(e, { isUnhandledRejection: t }) {
  const n = Dy(e), r = t ? "promise rejection" : "exception";
  return mi(e) ? `Event \`ErrorEvent\` captured as ${r} with message \`${e.message}\`` : hr(e) ? `Event \`${e4(e)}\` (type=${e.type}) captured as ${r}` : `Object captured as ${r} with keys: ${n}`;
}
function e4(e) {
  try {
    const t = Object.getPrototypeOf(e);
    return t ? t.constructor.name : void 0;
  } catch {
  }
}
const An = 1024, Fu = "Breadcrumbs", t4 = (e = {}) => {
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
    name: Fu,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    setup(n) {
      t.console && xy(o4(n)), t.dom && Ty(r4(n, t.dom)), t.xhr && Xy(i4(n)), t.fetch && Oy(s4(n)), t.history && Qy(a4(n)), t.sentry && n.on && n.on("beforeSendEvent", n4(n));
    }
  };
}, $u = t4;
it(Fu, $u);
function n4(e) {
  return function(n) {
    me() === e && Mt(
      {
        category: `sentry.${n.type === "transaction" ? "transaction" : "event"}`,
        event_id: n.event_id,
        level: n.level,
        message: qe(n)
      },
      {
        event: n
      }
    );
  };
}
function r4(e, t) {
  return function(r) {
    if (me() !== e)
      return;
    let o, i, s = typeof t == "object" ? t.serializeAttribute : void 0, a = typeof t == "object" && typeof t.maxStringLength == "number" ? t.maxStringLength : void 0;
    a && a > An && (Ct && B.warn(
      `\`dom.maxStringLength\` cannot exceed ${An}, but a value of ${a} was configured. Sentry will use ${An} instead.`
    ), a = An), typeof s == "string" && (s = [s]);
    try {
      const u = r.event, d = c4(u) ? u.target : u;
      o = xu(d, { keyAttrs: s, maxStringLength: a }), i = py(d);
    } catch {
      o = "<unknown>";
    }
    if (o.length === 0)
      return;
    const l = {
      category: `ui.${r.name}`,
      message: o
    };
    i && (l.data = { "ui.component_name": i }), Mt(l, {
      event: r.event,
      name: r.name,
      global: r.global
    });
  };
}
function o4(e) {
  return function(n) {
    if (me() !== e)
      return;
    const r = {
      category: "console",
      data: {
        arguments: n.args,
        logger: "console"
      },
      level: ih(n.level),
      message: Ns(n.args, " ")
    };
    if (n.level === "assert")
      if (n.args[0] === !1)
        r.message = `Assertion failed: ${Ns(n.args.slice(1), " ") || "console.assert"}`, r.data.arguments = n.args.slice(1);
      else
        return;
    Mt(r, {
      input: n.args,
      level: n.level
    });
  };
}
function i4(e) {
  return function(n) {
    if (me() !== e)
      return;
    const { startTimestamp: r, endTimestamp: o } = n, i = n.xhr[Ft];
    if (!r || !o || !i)
      return;
    const { method: s, url: a, status_code: l, body: u } = i, d = {
      method: s,
      url: a,
      status_code: l
    }, g = {
      xhr: n.xhr,
      input: u,
      startTimestamp: r,
      endTimestamp: o
    };
    Mt(
      {
        category: "xhr",
        data: d,
        type: "http"
      },
      g
    );
  };
}
function s4(e) {
  return function(n) {
    if (me() !== e)
      return;
    const { startTimestamp: r, endTimestamp: o } = n;
    if (o && !(n.fetchData.url.match(/sentry_key/) && n.fetchData.method === "POST"))
      if (n.error) {
        const i = n.fetchData, s = {
          data: n.error,
          input: n.args,
          startTimestamp: r,
          endTimestamp: o
        };
        Mt(
          {
            category: "fetch",
            data: i,
            level: "error",
            type: "http"
          },
          s
        );
      } else {
        const i = n.response, s = {
          ...n.fetchData,
          status_code: i && i.status
        }, a = {
          input: n.args,
          response: i,
          startTimestamp: r,
          endTimestamp: o
        };
        Mt(
          {
            category: "fetch",
            data: s,
            type: "http"
          },
          a
        );
      }
  };
}
function a4(e) {
  return function(n) {
    if (me() !== e)
      return;
    let r = n.from, o = n.to;
    const i = Xr(ne.location.href);
    let s = r ? Xr(r) : void 0;
    const a = Xr(o);
    (!s || !s.path) && (s = i), i.protocol === a.protocol && i.host === a.host && (o = a.relative), i.protocol === s.protocol && i.host === s.host && (r = s.relative), Mt({
      category: "navigation",
      data: {
        from: r,
        to: o
      }
    });
  };
}
function c4(e) {
  return !!e && !!e.target;
}
const qu = "Dedupe", l4 = () => {
  let e;
  return {
    name: qu,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    processEvent(t) {
      if (t.type)
        return t;
      try {
        if (u4(t, e))
          return Ct && B.warn("Event dropped due to being a duplicate of previously captured event."), null;
      } catch {
      }
      return e = t;
    }
  };
}, Ku = l4;
it(qu, Ku);
function u4(e, t) {
  return t ? !!(d4(e, t) || g4(e, t)) : !1;
}
function d4(e, t) {
  const n = e.message, r = t.message;
  return !(!n && !r || n && !r || !n && r || n !== r || !td(e, t) || !ed(e, t));
}
function g4(e, t) {
  const n = Es(t), r = Es(e);
  return !(!n || !r || n.type !== r.type || n.value !== r.value || !td(e, t) || !ed(e, t));
}
function ed(e, t) {
  let n = Ps(e), r = Ps(t);
  if (!n && !r)
    return !0;
  if (n && !r || !n && r || (n = n, r = r, r.length !== n.length))
    return !1;
  for (let o = 0; o < r.length; o++) {
    const i = r[o], s = n[o];
    if (i.filename !== s.filename || i.lineno !== s.lineno || i.colno !== s.colno || i.function !== s.function)
      return !1;
  }
  return !0;
}
function td(e, t) {
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
function Es(e) {
  return e.exception && e.exception.values && e.exception.values[0];
}
function Ps(e) {
  const t = e.exception;
  if (t)
    try {
      return t.values[0].stacktrace.frames;
    } catch {
      return;
    }
}
const nd = "GlobalHandlers", M4 = (e = {}) => {
  const t = {
    onerror: !0,
    onunhandledrejection: !0,
    ...e
  };
  return {
    name: nd,
    setupOnce() {
      Error.stackTraceLimit = 50;
    },
    setup(n) {
      t.onerror && (I4(n), Zs("onerror")), t.onunhandledrejection && (m4(n), Zs("onunhandledrejection"));
    }
  };
}, rd = M4;
it(
  nd,
  rd
);
function I4(e) {
  Ry((t) => {
    const { stackParser: n, attachStacktrace: r } = id();
    if (me() !== e || Ju())
      return;
    const { msg: o, url: i, line: s, column: a, error: l } = t, u = l === void 0 && We(o) ? b4(o, i, s, a) : od(
      Xu(n, l || o, void 0, r, !1),
      i,
      s,
      a
    );
    u.level = "error", _u(u, {
      originalException: l,
      mechanism: {
        handled: !1,
        type: "onerror"
      }
    });
  });
}
function m4(e) {
  Gy((t) => {
    const { stackParser: n, attachStacktrace: r } = id();
    if (me() !== e || Ju())
      return;
    const o = p4(t), i = wu(o) ? f4(o) : Xu(n, o, void 0, r, !0);
    i.level = "error", _u(i, {
      originalException: o,
      mechanism: {
        handled: !1,
        type: "onunhandledrejection"
      }
    });
  });
}
function p4(e) {
  if (wu(e))
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
function f4(e) {
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
function b4(e, t, n, r) {
  const o = /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/i;
  let i = mi(e) ? e.message : e, s = "Error";
  const a = i.match(o);
  return a && (s = a[1], i = a[2]), od({
    exception: {
      values: [
        {
          type: s,
          value: i
        }
      ]
    }
  }, t, n, r);
}
function od(e, t, n, r) {
  const o = e.exception = e.exception || {}, i = o.values = o.values || [], s = i[0] = i[0] || {}, a = s.stacktrace = s.stacktrace || {}, l = a.frames = a.frames || [], u = isNaN(parseInt(r, 10)) ? void 0 : r, d = isNaN(parseInt(n, 10)) ? void 0 : n, g = We(t) && t.length > 0 ? t : my();
  return l.length === 0 && l.push({
    colno: u,
    filename: g,
    function: "?",
    in_app: !0,
    lineno: d
  }), e;
}
function Zs(e) {
  Ct && B.log(`Global Handler attached: ${e}`);
}
function id() {
  const e = me();
  return e && e.getOptions() || {
    stackParser: () => [],
    attachStacktrace: !1
  };
}
const sd = "HttpContext", N4 = () => ({
  name: sd,
  // TODO v8: Remove this
  setupOnce() {
  },
  // eslint-disable-line @typescript-eslint/no-empty-function
  preprocessEvent(e) {
    if (!ne.navigator && !ne.location && !ne.document)
      return;
    const t = e.request && e.request.url || ne.location && ne.location.href, { referrer: n } = ne.document || {}, { userAgent: r } = ne.navigator || {}, o = {
      ...e.request && e.request.headers,
      ...n && { Referer: n },
      ...r && { "User-Agent": r }
    }, i = { ...e.request, ...t && { url: t }, headers: o };
    e.request = i;
  }
}), ad = N4;
it(sd, ad);
const j4 = "cause", y4 = 5, cd = "LinkedErrors", h4 = (e = {}) => {
  const t = e.limit || y4, n = e.key || j4;
  return {
    name: cd,
    // TODO v8: Remove this
    setupOnce() {
    },
    // eslint-disable-line @typescript-eslint/no-empty-function
    preprocessEvent(r, o, i) {
      const s = i.getOptions();
      dy(
        // This differs from the LinkedErrors integration in core by using a different exceptionFromError function
        Vu,
        s.stackParser,
        s.maxValueLength,
        n,
        t,
        r,
        o
      );
    }
  };
}, ld = h4;
it(cd, ld);
const v4 = [
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
], ud = "TryCatch", w4 = (e = {}) => {
  const t = {
    XMLHttpRequest: !0,
    eventTarget: !0,
    requestAnimationFrame: !0,
    setInterval: !0,
    setTimeout: !0,
    ...e
  };
  return {
    name: ud,
    // TODO: This currently only works for the first client this is setup
    // We may want to adjust this to check for client etc.
    setupOnce() {
      t.setTimeout && se(ne, "setTimeout", _s), t.setInterval && se(ne, "setInterval", _s), t.requestAnimationFrame && se(ne, "requestAnimationFrame", D4), t.XMLHttpRequest && "XMLHttpRequest" in ne && se(XMLHttpRequest.prototype, "send", S4);
      const n = t.eventTarget;
      n && (Array.isArray(n) ? n : v4).forEach(x4);
    }
  };
}, dd = w4;
it(
  ud,
  dd
);
function _s(e) {
  return function(...t) {
    const n = t[0];
    return t[0] = Et(n, {
      mechanism: {
        data: { function: rt(e) },
        handled: !1,
        type: "instrument"
      }
    }), e.apply(this, t);
  };
}
function D4(e) {
  return function(t) {
    return e.apply(this, [
      Et(t, {
        mechanism: {
          data: {
            function: "requestAnimationFrame",
            handler: rt(e)
          },
          handled: !1,
          type: "instrument"
        }
      })
    ]);
  };
}
function S4(e) {
  return function(...t) {
    const n = this;
    return ["onload", "onerror", "onprogress", "onreadystatechange"].forEach((o) => {
      o in n && typeof n[o] == "function" && se(n, o, function(i) {
        const s = {
          mechanism: {
            data: {
              function: o,
              handler: rt(i)
            },
            handled: !1,
            type: "instrument"
          }
        }, a = ji(i);
        return a && (s.mechanism.data.handler = rt(a)), Et(i, s);
      });
    }), e.apply(this, t);
  };
}
function x4(e) {
  const t = ne, n = t[e] && t[e].prototype;
  !n || !n.hasOwnProperty || !n.hasOwnProperty("addEventListener") || (se(n, "addEventListener", function(r) {
    return function(o, i, s) {
      try {
        typeof i.handleEvent == "function" && (i.handleEvent = Et(i.handleEvent, {
          mechanism: {
            data: {
              function: "handleEvent",
              handler: rt(i),
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
        Et(i, {
          mechanism: {
            data: {
              function: "addEventListener",
              handler: rt(i),
              target: e
            },
            handled: !1,
            type: "instrument"
          }
        }),
        s
      ]);
    };
  }), se(
    n,
    "removeEventListener",
    function(r) {
      return function(o, i, s) {
        const a = i;
        try {
          const l = a && a.__sentry_wrapped__;
          l && r.call(this, o, l, s);
        } catch {
        }
        return r.call(this, o, a, s);
      };
    }
  ));
}
Yu(), Qu(), dd(), $u(), rd(), ld(), Ku(), ad();
const Os = (e = {}, t = jt()) => {
  if (!ne.document) {
    Ct && B.error("Global document not defined in showReportDialog call");
    return;
  }
  const { client: n, scope: r } = t.getStackTop(), o = e.dsn || n && n.getDsn();
  if (!o) {
    Ct && B.error("DSN not configured for showReportDialog call");
    return;
  }
  r && (e.user = {
    ...r.getUser(),
    ...e.user
  }), e.eventId || (e.eventId = t.lastEventId());
  const i = ne.document.createElement("script");
  i.async = !0, i.crossOrigin = "anonymous", i.src = Eh(o, e), e.onLoad && (i.onload = e.onLoad);
  const { onClose: s } = e;
  if (s) {
    const l = (u) => {
      if (u.data === "__sentry_reportdialog_closed__")
        try {
          s();
        } finally {
          ne.removeEventListener("message", l);
        }
    };
    ne.addEventListener("message", l);
  }
  const a = ne.document.head || ne.document.body;
  a ? a.appendChild(i) : Ct && B.error("Not injecting report dialog. No injection point found in HTML");
};
var gd = { exports: {} }, Q = {};
/** @license React v16.13.1
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var oe = typeof Symbol == "function" && Symbol.for, vi = oe ? Symbol.for("react.element") : 60103, wi = oe ? Symbol.for("react.portal") : 60106, Sr = oe ? Symbol.for("react.fragment") : 60107, xr = oe ? Symbol.for("react.strict_mode") : 60108, Ar = oe ? Symbol.for("react.profiler") : 60114, Lr = oe ? Symbol.for("react.provider") : 60109, Cr = oe ? Symbol.for("react.context") : 60110, Di = oe ? Symbol.for("react.async_mode") : 60111, Tr = oe ? Symbol.for("react.concurrent_mode") : 60111, kr = oe ? Symbol.for("react.forward_ref") : 60112, zr = oe ? Symbol.for("react.suspense") : 60113, A4 = oe ? Symbol.for("react.suspense_list") : 60120, Er = oe ? Symbol.for("react.memo") : 60115, Pr = oe ? Symbol.for("react.lazy") : 60116, L4 = oe ? Symbol.for("react.block") : 60121, C4 = oe ? Symbol.for("react.fundamental") : 60117, T4 = oe ? Symbol.for("react.responder") : 60118, k4 = oe ? Symbol.for("react.scope") : 60119;
function pe(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case vi:
        switch (e = e.type, e) {
          case Di:
          case Tr:
          case Sr:
          case Ar:
          case xr:
          case zr:
            return e;
          default:
            switch (e = e && e.$$typeof, e) {
              case Cr:
              case kr:
              case Pr:
              case Er:
              case Lr:
                return e;
              default:
                return t;
            }
        }
      case wi:
        return t;
    }
  }
}
function Md(e) {
  return pe(e) === Tr;
}
Q.AsyncMode = Di;
Q.ConcurrentMode = Tr;
Q.ContextConsumer = Cr;
Q.ContextProvider = Lr;
Q.Element = vi;
Q.ForwardRef = kr;
Q.Fragment = Sr;
Q.Lazy = Pr;
Q.Memo = Er;
Q.Portal = wi;
Q.Profiler = Ar;
Q.StrictMode = xr;
Q.Suspense = zr;
Q.isAsyncMode = function(e) {
  return Md(e) || pe(e) === Di;
};
Q.isConcurrentMode = Md;
Q.isContextConsumer = function(e) {
  return pe(e) === Cr;
};
Q.isContextProvider = function(e) {
  return pe(e) === Lr;
};
Q.isElement = function(e) {
  return typeof e == "object" && e !== null && e.$$typeof === vi;
};
Q.isForwardRef = function(e) {
  return pe(e) === kr;
};
Q.isFragment = function(e) {
  return pe(e) === Sr;
};
Q.isLazy = function(e) {
  return pe(e) === Pr;
};
Q.isMemo = function(e) {
  return pe(e) === Er;
};
Q.isPortal = function(e) {
  return pe(e) === wi;
};
Q.isProfiler = function(e) {
  return pe(e) === Ar;
};
Q.isStrictMode = function(e) {
  return pe(e) === xr;
};
Q.isSuspense = function(e) {
  return pe(e) === zr;
};
Q.isValidElementType = function(e) {
  return typeof e == "string" || typeof e == "function" || e === Sr || e === Tr || e === Ar || e === xr || e === zr || e === A4 || typeof e == "object" && e !== null && (e.$$typeof === Pr || e.$$typeof === Er || e.$$typeof === Lr || e.$$typeof === Cr || e.$$typeof === kr || e.$$typeof === C4 || e.$$typeof === T4 || e.$$typeof === k4 || e.$$typeof === L4);
};
Q.typeOf = pe;
gd.exports = Q;
var z4 = gd.exports, Id = z4, E4 = {
  $$typeof: !0,
  render: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0
}, P4 = {
  $$typeof: !0,
  compare: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0,
  type: !0
}, md = {};
md[Id.ForwardRef] = E4;
md[Id.Memo] = P4;
const Z4 = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function _4(e) {
  const t = e.match(/^([^.]+)/);
  return t !== null && parseInt(t[0]) >= 17;
}
const Ws = {
  componentStack: null,
  error: null,
  eventId: null
};
function O4(e, t) {
  const n = /* @__PURE__ */ new WeakMap();
  function r(o, i) {
    if (!n.has(o)) {
      if (o.cause)
        return n.set(o, !0), r(o.cause, i);
      o.cause = i;
    }
  }
  r(e, t);
}
class Si extends Xs {
  constructor(t) {
    super(t), Si.prototype.__init.call(this), this.state = Ws, this._openFallbackReportDialog = !0;
    const n = me();
    n && n.on && t.showDialog && (this._openFallbackReportDialog = !1, n.on("afterSendEvent", (r) => {
      !r.type && r.event_id === this._lastEventId && Os({ ...t.dialogOptions, eventId: this._lastEventId });
    }));
  }
  componentDidCatch(t, { componentStack: n }) {
    const { beforeCapture: r, onError: o, showDialog: i, dialogOptions: s } = this.props;
    Ou((a) => {
      if (_4($s) && Ii(t)) {
        const u = new Error(t.message);
        u.name = `React ErrorBoundary ${t.name}`, u.stack = n, O4(t, u);
      }
      r && r(a, t, n);
      const l = Zu(t, {
        captureContext: {
          contexts: { react: { componentStack: n } }
        },
        // If users provide a fallback component we can assume they are handling the error.
        // Therefore, we set the mechanism depending on the presence of the fallback prop.
        mechanism: { handled: !!this.props.fallback }
      });
      o && o(t, n, l), i && (this._lastEventId = l, this._openFallbackReportDialog && Os({ ...s, eventId: l })), this.setState({ error: t, componentStack: n, eventId: l });
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
      t && t(n, r, o), this.setState(Ws);
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
      }) : o = t, Tt(o) ? o : (t && Z4 && B.warn("fallback did not produce a valid ReactElement"), null);
    }
    return typeof n == "function" ? n() : n;
  }
}
class Zr {
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
const xi = typeof window > "u" || "Deno" in window;
function ye() {
}
function W4(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function U4(e) {
  return typeof e == "number" && e >= 0 && e !== 1 / 0;
}
function R4(e, t) {
  return Math.max(e + (t || 0) - Date.now(), 0);
}
function Ln(e, t, n) {
  return _r(e) ? typeof t == "function" ? {
    ...n,
    queryKey: e,
    queryFn: t
  } : {
    ...t,
    queryKey: e
  } : e;
}
function Fe(e, t, n) {
  return _r(e) ? [{
    ...t,
    queryKey: e
  }, n] : [e || {}, t];
}
function Us(e, t) {
  const {
    type: n = "all",
    exact: r,
    fetchStatus: o,
    predicate: i,
    queryKey: s,
    stale: a
  } = e;
  if (_r(s)) {
    if (r) {
      if (t.queryHash !== Ai(s, t.options))
        return !1;
    } else if (!qn(t.queryKey, s))
      return !1;
  }
  if (n !== "all") {
    const l = t.isActive();
    if (n === "active" && !l || n === "inactive" && l)
      return !1;
  }
  return !(typeof a == "boolean" && t.isStale() !== a || typeof o < "u" && o !== t.state.fetchStatus || i && !i(t));
}
function Rs(e, t) {
  const {
    exact: n,
    fetching: r,
    predicate: o,
    mutationKey: i
  } = e;
  if (_r(i)) {
    if (!t.options.mutationKey)
      return !1;
    if (n) {
      if (ct(t.options.mutationKey) !== ct(i))
        return !1;
    } else if (!qn(t.options.mutationKey, i))
      return !1;
  }
  return !(typeof r == "boolean" && t.state.status === "loading" !== r || o && !o(t));
}
function Ai(e, t) {
  return ((t == null ? void 0 : t.queryKeyHashFn) || ct)(e);
}
function ct(e) {
  return JSON.stringify(e, (t, n) => Co(n) ? Object.keys(n).sort().reduce((r, o) => (r[o] = n[o], r), {}) : n);
}
function qn(e, t) {
  return pd(e, t);
}
function pd(e, t) {
  return e === t ? !0 : typeof e != typeof t ? !1 : e && t && typeof e == "object" && typeof t == "object" ? !Object.keys(t).some((n) => !pd(e[n], t[n])) : !1;
}
function fd(e, t) {
  if (e === t)
    return e;
  const n = Hs(e) && Hs(t);
  if (n || Co(e) && Co(t)) {
    const r = n ? e.length : Object.keys(e).length, o = n ? t : Object.keys(t), i = o.length, s = n ? [] : {};
    let a = 0;
    for (let l = 0; l < i; l++) {
      const u = n ? l : o[l];
      s[u] = fd(e[u], t[u]), s[u] === e[u] && a++;
    }
    return r === i && a === r ? e : s;
  }
  return t;
}
function Hs(e) {
  return Array.isArray(e) && e.length === Object.keys(e).length;
}
function Co(e) {
  if (!Gs(e))
    return !1;
  const t = e.constructor;
  if (typeof t > "u")
    return !0;
  const n = t.prototype;
  return !(!Gs(n) || !n.hasOwnProperty("isPrototypeOf"));
}
function Gs(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function _r(e) {
  return Array.isArray(e);
}
function bd(e) {
  return new Promise((t) => {
    setTimeout(t, e);
  });
}
function Ys(e) {
  bd(0).then(e);
}
function H4() {
  if (typeof AbortController == "function")
    return new AbortController();
}
function G4(e, t, n) {
  return n.isDataEqual != null && n.isDataEqual(e, t) ? e : typeof n.structuralSharing == "function" ? n.structuralSharing(e, t) : n.structuralSharing !== !1 ? fd(e, t) : t;
}
class Y4 extends Zr {
  constructor() {
    super(), this.setup = (t) => {
      if (!xi && window.addEventListener) {
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
const To = new Y4(), Bs = ["online", "offline"];
class B4 extends Zr {
  constructor() {
    super(), this.setup = (t) => {
      if (!xi && window.addEventListener) {
        const n = () => t();
        return Bs.forEach((r) => {
          window.addEventListener(r, n, !1);
        }), () => {
          Bs.forEach((r) => {
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
const Kn = new B4();
function Q4(e) {
  return Math.min(1e3 * 2 ** e, 3e4);
}
function Li(e) {
  return (e ?? "online") === "online" ? Kn.isOnline() : !0;
}
class Nd {
  constructor(t) {
    this.revert = t == null ? void 0 : t.revert, this.silent = t == null ? void 0 : t.silent;
  }
}
function $r(e) {
  return e instanceof Nd;
}
function jd(e) {
  let t = !1, n = 0, r = !1, o, i, s;
  const a = new Promise((b, N) => {
    i = b, s = N;
  }), l = (b) => {
    r || (m(new Nd(b)), e.abort == null || e.abort());
  }, u = () => {
    t = !0;
  }, d = () => {
    t = !1;
  }, g = () => !To.isFocused() || e.networkMode !== "always" && !Kn.isOnline(), I = (b) => {
    r || (r = !0, e.onSuccess == null || e.onSuccess(b), o == null || o(), i(b));
  }, m = (b) => {
    r || (r = !0, e.onError == null || e.onError(b), o == null || o(), s(b));
  }, p = () => new Promise((b) => {
    o = (N) => {
      const j = r || !g();
      return j && b(N), j;
    }, e.onPause == null || e.onPause();
  }).then(() => {
    o = void 0, r || e.onContinue == null || e.onContinue();
  }), f = () => {
    if (r)
      return;
    let b;
    try {
      b = e.fn();
    } catch (N) {
      b = Promise.reject(N);
    }
    Promise.resolve(b).then(I).catch((N) => {
      var j, h;
      if (r)
        return;
      const v = (j = e.retry) != null ? j : 3, w = (h = e.retryDelay) != null ? h : Q4, S = typeof w == "function" ? w(n, N) : w, D = v === !0 || typeof v == "number" && n < v || typeof v == "function" && v(n, N);
      if (t || !D) {
        m(N);
        return;
      }
      n++, e.onFail == null || e.onFail(n, N), bd(S).then(() => {
        if (g())
          return p();
      }).then(() => {
        t ? m(N) : f();
      });
    });
  };
  return Li(e.networkMode) ? f() : p().then(f), {
    promise: a,
    cancel: l,
    continue: () => (o == null ? void 0 : o()) ? a : Promise.resolve(),
    cancelRetry: u,
    continueRetry: d
  };
}
const Ci = console;
function J4() {
  let e = [], t = 0, n = (d) => {
    d();
  }, r = (d) => {
    d();
  };
  const o = (d) => {
    let g;
    t++;
    try {
      g = d();
    } finally {
      t--, t || a();
    }
    return g;
  }, i = (d) => {
    t ? e.push(d) : Ys(() => {
      n(d);
    });
  }, s = (d) => (...g) => {
    i(() => {
      d(...g);
    });
  }, a = () => {
    const d = e;
    e = [], d.length && Ys(() => {
      r(() => {
        d.forEach((g) => {
          n(g);
        });
      });
    });
  };
  return {
    batch: o,
    batchCalls: s,
    schedule: i,
    setNotifyFunction: (d) => {
      n = d;
    },
    setBatchNotifyFunction: (d) => {
      r = d;
    }
  };
}
const le = J4();
class yd {
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), U4(this.cacheTime) && (this.gcTimeout = setTimeout(() => {
      this.optionalRemove();
    }, this.cacheTime));
  }
  updateCacheTime(t) {
    this.cacheTime = Math.max(this.cacheTime || 0, t ?? (xi ? 1 / 0 : 5 * 60 * 1e3));
  }
  clearGcTimeout() {
    this.gcTimeout && (clearTimeout(this.gcTimeout), this.gcTimeout = void 0);
  }
}
class V4 extends yd {
  constructor(t) {
    super(), this.abortSignalConsumed = !1, this.defaultOptions = t.defaultOptions, this.setOptions(t.options), this.observers = [], this.cache = t.cache, this.logger = t.logger || Ci, this.queryKey = t.queryKey, this.queryHash = t.queryHash, this.initialState = t.state || X4(this.options), this.state = this.initialState, this.scheduleGc();
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
    const r = G4(this.state.data, t, this.options);
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
    return (n = this.retryer) == null || n.cancel(t), r ? r.then(ye).catch(ye) : Promise.resolve();
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
    return this.state.isInvalidated || !this.state.dataUpdatedAt || !R4(this.state.dataUpdatedAt, t);
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
        var i;
        return (i = this.retryer) == null || i.continueRetry(), this.promise;
      }
    }
    if (t && this.setOptions(t), !this.options.queryFn) {
      const m = this.observers.find((p) => p.options.queryFn);
      m && this.setOptions(m.options);
    }
    const s = H4(), a = {
      queryKey: this.queryKey,
      pageParam: void 0,
      meta: this.meta
    }, l = (m) => {
      Object.defineProperty(m, "signal", {
        enumerable: !0,
        get: () => {
          if (s)
            return this.abortSignalConsumed = !0, s.signal;
        }
      });
    };
    l(a);
    const u = () => this.options.queryFn ? (this.abortSignalConsumed = !1, this.options.queryFn(a)) : Promise.reject("Missing queryFn for queryKey '" + this.options.queryHash + "'"), d = {
      fetchOptions: n,
      options: this.options,
      queryKey: this.queryKey,
      state: this.state,
      fetchFn: u
    };
    if (l(d), (r = this.options.behavior) == null || r.onFetch(d), this.revertState = this.state, this.state.fetchStatus === "idle" || this.state.fetchMeta !== ((o = d.fetchOptions) == null ? void 0 : o.meta)) {
      var g;
      this.dispatch({
        type: "fetch",
        meta: (g = d.fetchOptions) == null ? void 0 : g.meta
      });
    }
    const I = (m) => {
      if ($r(m) && m.silent || this.dispatch({
        type: "error",
        error: m
      }), !$r(m)) {
        var p, f, b, N;
        (p = (f = this.cache.config).onError) == null || p.call(f, m, this), (b = (N = this.cache.config).onSettled) == null || b.call(N, this.state.data, m, this);
      }
      this.isFetchingOptimistic || this.scheduleGc(), this.isFetchingOptimistic = !1;
    };
    return this.retryer = jd({
      fn: d.fetchFn,
      abort: s == null ? void 0 : s.abort.bind(s),
      onSuccess: (m) => {
        var p, f, b, N;
        if (typeof m > "u") {
          I(new Error(this.queryHash + " data is undefined"));
          return;
        }
        this.setData(m), (p = (f = this.cache.config).onSuccess) == null || p.call(f, m, this), (b = (N = this.cache.config).onSettled) == null || b.call(N, m, this.state.error, this), this.isFetchingOptimistic || this.scheduleGc(), this.isFetchingOptimistic = !1;
      },
      onError: I,
      onFail: (m, p) => {
        this.dispatch({
          type: "failed",
          failureCount: m,
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
      retry: d.options.retry,
      retryDelay: d.options.retryDelay,
      networkMode: d.options.networkMode
    }), this.promise = this.retryer.promise, this.promise;
  }
  dispatch(t) {
    const n = (r) => {
      var o, i;
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
            fetchStatus: Li(this.options.networkMode) ? "fetching" : "paused",
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
            dataUpdatedAt: (i = t.dataUpdatedAt) != null ? i : Date.now(),
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
          const s = t.error;
          return $r(s) && s.revert && this.revertState ? {
            ...this.revertState,
            fetchStatus: "idle"
          } : {
            ...r,
            error: s,
            errorUpdateCount: r.errorUpdateCount + 1,
            errorUpdatedAt: Date.now(),
            fetchFailureCount: r.fetchFailureCount + 1,
            fetchFailureReason: s,
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
    this.state = n(this.state), le.batch(() => {
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
function X4(e) {
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
class F4 extends Zr {
  constructor(t) {
    super(), this.config = t || {}, this.queries = [], this.queriesMap = {};
  }
  build(t, n, r) {
    var o;
    const i = n.queryKey, s = (o = n.queryHash) != null ? o : Ai(i, n);
    let a = this.get(s);
    return a || (a = new V4({
      cache: this,
      logger: t.getLogger(),
      queryKey: i,
      queryHash: s,
      options: t.defaultQueryOptions(n),
      state: r,
      defaultOptions: t.getQueryDefaults(i)
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
    le.batch(() => {
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
    const [r] = Fe(t, n);
    return typeof r.exact > "u" && (r.exact = !0), this.queries.find((o) => Us(r, o));
  }
  findAll(t, n) {
    const [r] = Fe(t, n);
    return Object.keys(r).length > 0 ? this.queries.filter((o) => Us(r, o)) : this.queries;
  }
  notify(t) {
    le.batch(() => {
      this.listeners.forEach(({
        listener: n
      }) => {
        n(t);
      });
    });
  }
  onFocus() {
    le.batch(() => {
      this.queries.forEach((t) => {
        t.onFocus();
      });
    });
  }
  onOnline() {
    le.batch(() => {
      this.queries.forEach((t) => {
        t.onOnline();
      });
    });
  }
}
class $4 extends yd {
  constructor(t) {
    super(), this.defaultOptions = t.defaultOptions, this.mutationId = t.mutationId, this.mutationCache = t.mutationCache, this.logger = t.logger || Ci, this.observers = [], this.state = t.state || q4(), this.setOptions(t.options), this.scheduleGc();
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
      var D;
      return this.retryer = jd({
        fn: () => this.options.mutationFn ? this.options.mutationFn(this.state.variables) : Promise.reject("No mutationFn found"),
        onFail: (x, P) => {
          this.dispatch({
            type: "failed",
            failureCount: x,
            error: P
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
        retry: (D = this.options.retry) != null ? D : 0,
        retryDelay: this.options.retryDelay,
        networkMode: this.options.networkMode
      }), this.retryer.promise;
    }, n = this.state.status === "loading";
    try {
      var r, o, i, s, a, l, u, d;
      if (!n) {
        var g, I, m, p;
        this.dispatch({
          type: "loading",
          variables: this.options.variables
        }), await ((g = (I = this.mutationCache.config).onMutate) == null ? void 0 : g.call(I, this.state.variables, this));
        const x = await ((m = (p = this.options).onMutate) == null ? void 0 : m.call(p, this.state.variables));
        x !== this.state.context && this.dispatch({
          type: "loading",
          context: x,
          variables: this.state.variables
        });
      }
      const D = await t();
      return await ((r = (o = this.mutationCache.config).onSuccess) == null ? void 0 : r.call(o, D, this.state.variables, this.state.context, this)), await ((i = (s = this.options).onSuccess) == null ? void 0 : i.call(s, D, this.state.variables, this.state.context)), await ((a = (l = this.mutationCache.config).onSettled) == null ? void 0 : a.call(l, D, null, this.state.variables, this.state.context, this)), await ((u = (d = this.options).onSettled) == null ? void 0 : u.call(d, D, null, this.state.variables, this.state.context)), this.dispatch({
        type: "success",
        data: D
      }), D;
    } catch (D) {
      try {
        var f, b, N, j, h, v, w, S;
        throw await ((f = (b = this.mutationCache.config).onError) == null ? void 0 : f.call(b, D, this.state.variables, this.state.context, this)), await ((N = (j = this.options).onError) == null ? void 0 : N.call(j, D, this.state.variables, this.state.context)), await ((h = (v = this.mutationCache.config).onSettled) == null ? void 0 : h.call(v, void 0, D, this.state.variables, this.state.context, this)), await ((w = (S = this.options).onSettled) == null ? void 0 : w.call(S, void 0, D, this.state.variables, this.state.context)), D;
      } finally {
        this.dispatch({
          type: "error",
          error: D
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
            isPaused: !Li(this.options.networkMode),
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
    this.state = n(this.state), le.batch(() => {
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
function q4() {
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
class K4 extends Zr {
  constructor(t) {
    super(), this.config = t || {}, this.mutations = [], this.mutationId = 0;
  }
  build(t, n, r) {
    const o = new $4({
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
    le.batch(() => {
      this.mutations.forEach((t) => {
        this.remove(t);
      });
    });
  }
  getAll() {
    return this.mutations;
  }
  find(t) {
    return typeof t.exact > "u" && (t.exact = !0), this.mutations.find((n) => Rs(t, n));
  }
  findAll(t) {
    return this.mutations.filter((n) => Rs(t, n));
  }
  notify(t) {
    le.batch(() => {
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
      return le.batch(() => n.reduce((r, o) => r.then(() => o.continue().catch(ye)), Promise.resolve()));
    }).then(() => {
      this.resuming = void 0;
    }), this.resuming;
  }
}
function ev() {
  return {
    onFetch: (e) => {
      e.fetchFn = () => {
        var t, n, r, o, i, s;
        const a = (t = e.fetchOptions) == null || (n = t.meta) == null ? void 0 : n.refetchPage, l = (r = e.fetchOptions) == null || (o = r.meta) == null ? void 0 : o.fetchMore, u = l == null ? void 0 : l.pageParam, d = (l == null ? void 0 : l.direction) === "forward", g = (l == null ? void 0 : l.direction) === "backward", I = ((i = e.state.data) == null ? void 0 : i.pages) || [], m = ((s = e.state.data) == null ? void 0 : s.pageParams) || [];
        let p = m, f = !1;
        const b = (S) => {
          Object.defineProperty(S, "signal", {
            enumerable: !0,
            get: () => {
              var D;
              if ((D = e.signal) != null && D.aborted)
                f = !0;
              else {
                var x;
                (x = e.signal) == null || x.addEventListener("abort", () => {
                  f = !0;
                });
              }
              return e.signal;
            }
          });
        }, N = e.options.queryFn || (() => Promise.reject("Missing queryFn for queryKey '" + e.options.queryHash + "'")), j = (S, D, x, P) => (p = P ? [D, ...p] : [...p, D], P ? [x, ...S] : [...S, x]), h = (S, D, x, P) => {
          if (f)
            return Promise.reject("Cancelled");
          if (typeof x > "u" && !D && S.length)
            return Promise.resolve(S);
          const U = {
            queryKey: e.queryKey,
            pageParam: x,
            meta: e.options.meta
          };
          b(U);
          const W = N(U);
          return Promise.resolve(W).then((R) => j(S, x, R, P));
        };
        let v;
        if (!I.length)
          v = h([]);
        else if (d) {
          const S = typeof u < "u", D = S ? u : Qs(e.options, I);
          v = h(I, S, D);
        } else if (g) {
          const S = typeof u < "u", D = S ? u : tv(e.options, I);
          v = h(I, S, D, !0);
        } else {
          p = [];
          const S = typeof e.options.getNextPageParam > "u";
          v = (a && I[0] ? a(I[0], 0, I) : !0) ? h([], S, m[0]) : Promise.resolve(j([], m[0], I[0]));
          for (let x = 1; x < I.length; x++)
            v = v.then((P) => {
              if (a && I[x] ? a(I[x], x, I) : !0) {
                const W = S ? m[x] : Qs(e.options, P);
                return h(P, S, W);
              }
              return Promise.resolve(j(P, m[x], I[x]));
            });
        }
        return v.then((S) => ({
          pages: S,
          pageParams: p
        }));
      };
    }
  };
}
function Qs(e, t) {
  return e.getNextPageParam == null ? void 0 : e.getNextPageParam(t[t.length - 1], t);
}
function tv(e, t) {
  return e.getPreviousPageParam == null ? void 0 : e.getPreviousPageParam(t[0], t);
}
class nv {
  constructor(t = {}) {
    this.queryCache = t.queryCache || new F4(), this.mutationCache = t.mutationCache || new K4(), this.logger = t.logger || Ci, this.defaultOptions = t.defaultOptions || {}, this.queryDefaults = [], this.mutationDefaults = [], this.mountCount = 0;
  }
  mount() {
    this.mountCount++, this.mountCount === 1 && (this.unsubscribeFocus = To.subscribe(() => {
      To.isFocused() && (this.resumePausedMutations(), this.queryCache.onFocus());
    }), this.unsubscribeOnline = Kn.subscribe(() => {
      Kn.isOnline() && (this.resumePausedMutations(), this.queryCache.onOnline());
    }));
  }
  unmount() {
    var t, n;
    this.mountCount--, this.mountCount === 0 && ((t = this.unsubscribeFocus) == null || t.call(this), this.unsubscribeFocus = void 0, (n = this.unsubscribeOnline) == null || n.call(this), this.unsubscribeOnline = void 0);
  }
  isFetching(t, n) {
    const [r] = Fe(t, n);
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
    const o = Ln(t, n, r), i = this.getQueryData(o.queryKey);
    return i ? Promise.resolve(i) : this.fetchQuery(o);
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
    const o = this.queryCache.find(t), i = o == null ? void 0 : o.state.data, s = W4(n, i);
    if (typeof s > "u")
      return;
    const a = Ln(t), l = this.defaultQueryOptions(a);
    return this.queryCache.build(this, l).setData(s, {
      ...r,
      manual: !0
    });
  }
  setQueriesData(t, n, r) {
    return le.batch(() => this.getQueryCache().findAll(t).map(({
      queryKey: o
    }) => [o, this.setQueryData(o, n, r)]));
  }
  getQueryState(t, n) {
    var r;
    return (r = this.queryCache.find(t, n)) == null ? void 0 : r.state;
  }
  removeQueries(t, n) {
    const [r] = Fe(t, n), o = this.queryCache;
    le.batch(() => {
      o.findAll(r).forEach((i) => {
        o.remove(i);
      });
    });
  }
  resetQueries(t, n, r) {
    const [o, i] = Fe(t, n, r), s = this.queryCache, a = {
      type: "active",
      ...o
    };
    return le.batch(() => (s.findAll(o).forEach((l) => {
      l.reset();
    }), this.refetchQueries(a, i)));
  }
  cancelQueries(t, n, r) {
    const [o, i = {}] = Fe(t, n, r);
    typeof i.revert > "u" && (i.revert = !0);
    const s = le.batch(() => this.queryCache.findAll(o).map((a) => a.cancel(i)));
    return Promise.all(s).then(ye).catch(ye);
  }
  invalidateQueries(t, n, r) {
    const [o, i] = Fe(t, n, r);
    return le.batch(() => {
      var s, a;
      if (this.queryCache.findAll(o).forEach((u) => {
        u.invalidate();
      }), o.refetchType === "none")
        return Promise.resolve();
      const l = {
        ...o,
        type: (s = (a = o.refetchType) != null ? a : o.type) != null ? s : "active"
      };
      return this.refetchQueries(l, i);
    });
  }
  refetchQueries(t, n, r) {
    const [o, i] = Fe(t, n, r), s = le.batch(() => this.queryCache.findAll(o).filter((l) => !l.isDisabled()).map((l) => {
      var u;
      return l.fetch(void 0, {
        ...i,
        cancelRefetch: (u = i == null ? void 0 : i.cancelRefetch) != null ? u : !0,
        meta: {
          refetchPage: o.refetchPage
        }
      });
    }));
    let a = Promise.all(s).then(ye);
    return i != null && i.throwOnError || (a = a.catch(ye)), a;
  }
  fetchQuery(t, n, r) {
    const o = Ln(t, n, r), i = this.defaultQueryOptions(o);
    typeof i.retry > "u" && (i.retry = !1);
    const s = this.queryCache.build(this, i);
    return s.isStaleByTime(i.staleTime) ? s.fetch(i) : Promise.resolve(s.state.data);
  }
  prefetchQuery(t, n, r) {
    return this.fetchQuery(t, n, r).then(ye).catch(ye);
  }
  fetchInfiniteQuery(t, n, r) {
    const o = Ln(t, n, r);
    return o.behavior = ev(), this.fetchQuery(o);
  }
  prefetchInfiniteQuery(t, n, r) {
    return this.fetchInfiniteQuery(t, n, r).then(ye).catch(ye);
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
    const r = this.queryDefaults.find((o) => ct(t) === ct(o.queryKey));
    r ? r.defaultOptions = n : this.queryDefaults.push({
      queryKey: t,
      defaultOptions: n
    });
  }
  getQueryDefaults(t) {
    if (!t)
      return;
    const n = this.queryDefaults.find((r) => qn(t, r.queryKey));
    return n == null ? void 0 : n.defaultOptions;
  }
  setMutationDefaults(t, n) {
    const r = this.mutationDefaults.find((o) => ct(t) === ct(o.mutationKey));
    r ? r.defaultOptions = n : this.mutationDefaults.push({
      mutationKey: t,
      defaultOptions: n
    });
  }
  getMutationDefaults(t) {
    if (!t)
      return;
    const n = this.mutationDefaults.find((r) => qn(t, r.mutationKey));
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
    return !n.queryHash && n.queryKey && (n.queryHash = Ai(n.queryKey, n)), typeof n.refetchOnReconnect > "u" && (n.refetchOnReconnect = n.networkMode !== "always"), typeof n.useErrorBoundary > "u" && (n.useErrorBoundary = !!n.suspense), n;
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
const Js = /* @__PURE__ */ q(void 0), rv = /* @__PURE__ */ q(!1);
function ov(e, t) {
  return e || (t && typeof window < "u" ? (window.ReactQueryClientContext || (window.ReactQueryClientContext = Js), window.ReactQueryClientContext) : Js);
}
const iv = ({
  client: e,
  children: t,
  context: n,
  contextSharing: r = !1
}) => {
  C(() => (e.mount(), () => {
    e.unmount();
  }), [e]);
  const o = ov(n, r);
  return /* @__PURE__ */ c(rv.Provider, {
    value: !n && r
  }, /* @__PURE__ */ c(o.Provider, {
    value: e
  }, t));
}, hd = window.adminXQueryClient || new nv({
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
window.adminXQueryClient || (window.adminXQueryClient = hd);
const vd = q({
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
function sv({ children: e, ...t }) {
  return /* @__PURE__ */ M.jsx(Si, { children: /* @__PURE__ */ M.jsx(iv, { client: hd, children: /* @__PURE__ */ M.jsx(vd.Provider, { value: t, children: e }) }) });
}
const av = () => re(vd), cv = q({
  route: "",
  updateRoute: () => {
  },
  loadingModal: !1,
  eventTarget: new EventTarget()
});
function lv(e, t) {
  if (!t)
    return null;
  const n = new RegExp(`/${e}/(.*)`), r = t == null ? void 0 : t.match(n);
  return r ? r[1] : null;
}
const uv = (e, t, n, r) => {
  let o = window.location.hash;
  o = o.substring(1);
  const i = `${window.location.protocol}//${window.location.hostname}`, s = new URL(o, i), a = lv(e, s.pathname);
  if (!r || !n)
    return { pathName: a || "" };
  const l = s.searchParams;
  if (a && r && n) {
    const [, u] = Object.entries(r).find(([I]) => qr(t || "", I)) || [], [d, g] = Object.entries(r).find(([I]) => qr(a, I)) || [];
    return {
      pathName: a,
      changingModal: g && g !== u,
      modal: d && g ? (
        // we should consider adding '&& modalName !== currentModalName' here, but this breaks tests
        n().then(({ default: I }) => {
          bu.show(I[g], { pathName: a, params: qr(a, d), searchParams: l });
        })
      ) : void 0
    };
  }
  return { pathName: "" };
}, qr = (e, t) => {
  const n = new RegExp("^" + t.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$"), r = e.match(n);
  if (r)
    return r.groups || {};
}, dv = ({ basePath: e, modals: t, children: n }) => {
  const { externalNavigate: r } = av(), [o, i] = O(void 0), [s, a] = O(!1), [l] = O(new EventTarget()), u = L((d) => {
    const g = typeof d == "string" ? { route: d } : d;
    if (g.isExternal) {
      r(g);
      return;
    }
    const I = g.route.replace(/^\//, "");
    I === o || (I ? window.location.hash = `/${e}/${I}` : window.location.hash = `/${e}`), l.dispatchEvent(new CustomEvent("routeChange", { detail: { newPath: I, oldPath: o } }));
  }, [e, l, r, o]);
  return C(() => {
    setTimeout(() => {
      t == null || t.load();
    }, 1e3);
  }, []), C(() => {
    const d = () => {
      i((g) => {
        const { pathName: I, modal: m, changingModal: p } = uv(e, g, t == null ? void 0 : t.load, t == null ? void 0 : t.paths);
        return m && p && (a(!0), m.then(() => a(!1))), I;
      });
    };
    return d(), window.addEventListener("hashchange", d), () => {
      window.removeEventListener("hashchange", d);
    };
  }, []), o === void 0 ? null : /* @__PURE__ */ M.jsx(
    cv.Provider,
    {
      value: {
        route: o,
        updateRoute: u,
        loadingModal: s,
        eventTarget: l
      },
      children: n
    }
  );
}, gv = () => /* @__PURE__ */ M.jsx("div", { className: "flex", children: /* @__PURE__ */ M.jsxs(oi, { orientation: "vertical", defaultValue: "sent", className: "w-full flex", children: [
  /* @__PURE__ */ M.jsxs("div", { className: "flex-1", children: [
    /* @__PURE__ */ M.jsx(ge, { value: "sent", children: "This uses a tab on the left which is semantically correct. We need to implement variants for top and right tabs." }),
    /* @__PURE__ */ M.jsx(ge, { value: "opened", children: "Opened" }),
    /* @__PURE__ */ M.jsx(ge, { value: "clicked", children: "Clicked" }),
    /* @__PURE__ */ M.jsx(ge, { value: "unsubscribed", children: "Unsubscribed" }),
    /* @__PURE__ */ M.jsx(ge, { value: "feedback", children: "Feedback" }),
    /* @__PURE__ */ M.jsx(ge, { value: "spam", children: "Marked as spam" }),
    /* @__PURE__ */ M.jsx(ge, { value: "bounced", children: "Bounced" })
  ] }),
  /* @__PURE__ */ M.jsxs(ii, { className: "w-48 flex flex-col justify-start h-auto", children: [
    /* @__PURE__ */ M.jsx(de, { value: "sent", children: "Sent" }),
    /* @__PURE__ */ M.jsx(de, { value: "opened", children: "Opened" }),
    /* @__PURE__ */ M.jsx(de, { value: "clicked", children: "Clicked" }),
    /* @__PURE__ */ M.jsx(de, { value: "unsubscribed", children: "Unsubscribed" }),
    /* @__PURE__ */ M.jsx(de, { value: "feedback", children: "Feedback" }),
    /* @__PURE__ */ M.jsx(de, { value: "spam", children: "Marked as spam" }),
    /* @__PURE__ */ M.jsx(de, { value: "bounced", children: "Bounced" })
  ] })
] }) }), Mv = () => /* @__PURE__ */ M.jsxs("div", { className: "w-full grid grid-cols-5", children: [
  /* @__PURE__ */ M.jsx("div", { className: "col-span-4", children: "This uses a `sidebar` component which is nicer but not as straightforward to use as tabs" }),
  /* @__PURE__ */ M.jsx(ou, { collapsible: "none", className: "bg-transparent w-full", children: /* @__PURE__ */ M.jsx(iu, { children: /* @__PURE__ */ M.jsx(su, { className: "border-b last:border-none", children: /* @__PURE__ */ M.jsx(au, { className: "gap-0", children: /* @__PURE__ */ M.jsx(cu, { children: /* @__PURE__ */ M.jsxs(lu, { children: [
    /* @__PURE__ */ M.jsx(Ve, { isActive: !0, children: /* @__PURE__ */ M.jsx("span", { children: "Sent" }) }),
    /* @__PURE__ */ M.jsx(Ve, { children: /* @__PURE__ */ M.jsx("span", { children: "Opened" }) }),
    /* @__PURE__ */ M.jsx(Ve, { children: /* @__PURE__ */ M.jsx("span", { children: "Clicked" }) }),
    /* @__PURE__ */ M.jsx(Ve, { children: /* @__PURE__ */ M.jsx("span", { children: "Unsubscribed" }) }),
    /* @__PURE__ */ M.jsx(Ve, { children: /* @__PURE__ */ M.jsx("span", { children: "Feedback" }) }),
    /* @__PURE__ */ M.jsx(Ve, { children: /* @__PURE__ */ M.jsx("span", { children: "Marked as spam" }) }),
    /* @__PURE__ */ M.jsx(Ve, { children: /* @__PURE__ */ M.jsx("span", { children: "Bounced" }) })
  ] }) }) }) }) }) })
] }), Iv = () => (
  // The div below should be converted into an app container component in the design system
  /* @__PURE__ */ M.jsxs("div", { className: "p-8 pt-9", children: [
    /* @__PURE__ */ M.jsxs("header", { children: [
      /* @__PURE__ */ M.jsx(da, { children: /* @__PURE__ */ M.jsxs(ga, { children: [
        /* @__PURE__ */ M.jsx(Ma, { children: /* @__PURE__ */ M.jsx(Ia, { href: "/posts/", children: "Posts" }) }),
        /* @__PURE__ */ M.jsx(pa, {}),
        /* @__PURE__ */ M.jsx(ma, { children: "Analytics" })
      ] }) }),
      /* @__PURE__ */ M.jsxs("div", { className: "flex items-start justify-between mt-2", children: [
        /* @__PURE__ */ M.jsx(ca, { size: "pagetitle", children: "Post analytics" }),
        /* @__PURE__ */ M.jsxs("div", { className: "flex items-center mt-1 gap-2", children: [
          /* @__PURE__ */ M.jsxs(On, { variant: "outline", children: [
            /* @__PURE__ */ M.jsx(Ei, { name: "share" }),
            " Share"
          ] }),
          /* @__PURE__ */ M.jsxs(cb, { children: [
            /* @__PURE__ */ M.jsx(lb, { children: /* @__PURE__ */ M.jsx(On, { variant: "outline", children: /* @__PURE__ */ M.jsx(Ei, { name: "ellipsis" }) }) }),
            /* @__PURE__ */ M.jsxs(rl, { align: "end", className: "min-w-48", children: [
              /* @__PURE__ */ M.jsxs(zn, { children: [
                /* @__PURE__ */ M.jsx("span", { children: "Edit post" }),
                /* @__PURE__ */ M.jsx(ao, { children: "⇧⌘E" })
              ] }),
              /* @__PURE__ */ M.jsxs(zn, { children: [
                /* @__PURE__ */ M.jsx("span", { children: "View in browser" }),
                /* @__PURE__ */ M.jsx(ao, { children: "⇧⌘O" })
              ] }),
              /* @__PURE__ */ M.jsx(ol, {}),
              /* @__PURE__ */ M.jsx(zn, { className: "text-red", children: "Delete" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ M.jsxs(oi, { className: "mt-8", defaultValue: "overview", variant: "outline", children: [
      /* @__PURE__ */ M.jsxs(ii, { className: "grid w-full grid-cols-5", children: [
        /* @__PURE__ */ M.jsx(de, { value: "overview", className: "justify-start", children: "Overview" }),
        /* @__PURE__ */ M.jsx(de, { value: "email", className: "justify-start", children: "Email" }),
        /* @__PURE__ */ M.jsx(de, { value: "web", className: "justify-start", children: "Web" }),
        /* @__PURE__ */ M.jsx(de, { value: "comments", className: "justify-start", children: "Comments" }),
        /* @__PURE__ */ M.jsx(de, { value: "growth", className: "justify-start", children: "Growth" })
      ] }),
      /* @__PURE__ */ M.jsx(ge, { value: "overview", children: "Overview" }),
      /* @__PURE__ */ M.jsx(ge, { value: "email", children: /* @__PURE__ */ M.jsx(gv, {}) }),
      /* @__PURE__ */ M.jsx(ge, { value: "web", children: /* @__PURE__ */ M.jsx(Mv, {}) }),
      /* @__PURE__ */ M.jsx(ge, { value: "comments", children: "Comments" }),
      /* @__PURE__ */ M.jsx(ge, { value: "growth", children: "Growth" })
    ] })
  ] })
), mv = {
  paths: {
    "demo-modal": "DemoModal"
  },
  load: async () => import("./modals-1bb5925f.mjs")
}, vv = ({ framework: e, designSystem: t }) => /* @__PURE__ */ M.jsx(sv, { ...e, children: /* @__PURE__ */ M.jsx(dv, { basePath: "post-analytics-spike", modals: mv, children: /* @__PURE__ */ M.jsx(oy, { className: "post-analytics-spike", ...t, children: /* @__PURE__ */ M.jsx(ru, { children: /* @__PURE__ */ M.jsx("div", { className: "max-w-[1280px] w-full mx-auto", children: /* @__PURE__ */ M.jsx(Iv, {}) }) }) }) }) });
export {
  vv as A,
  bu as N,
  M as j
};
//# sourceMappingURL=index-94083cb9.mjs.map
