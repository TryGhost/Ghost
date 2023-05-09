import _ from "react";
var i = { exports: {} }, n = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var u = _, d = Symbol.for("react.element"), m = Symbol.for("react.fragment"), x = Object.prototype.hasOwnProperty, c = u.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, y = { key: !0, ref: !0, __self: !0, __source: !0 };
function f(o, e, s) {
  var r, t = {}, p = null, l = null;
  s !== void 0 && (p = "" + s), e.key !== void 0 && (p = "" + e.key), e.ref !== void 0 && (l = e.ref);
  for (r in e)
    x.call(e, r) && !y.hasOwnProperty(r) && (t[r] = e[r]);
  if (o && o.defaultProps)
    for (r in e = o.defaultProps, e)
      t[r] === void 0 && (t[r] = e[r]);
  return { $$typeof: d, type: o, key: p, ref: l, props: t, _owner: c.current };
}
n.Fragment = m;
n.jsx = f;
n.jsxs = f;
i.exports = n;
var a = i.exports;
function O() {
  return /* @__PURE__ */ a.jsx("h1", { className: "text-3xl font-bold underline", children: "Hello world!" });
}
export {
  O as AdminXApp
};
//# sourceMappingURL=admin-x-settings.js.map
