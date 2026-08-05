import { f as N, l as z, d as H, b as m, o as L, cF as B, g, n as G, j as r, cG as M, H as O, m as V } from "./index-CyOb0xKt.mjs";
const I = [
  "[&_.cm-editor]:bg-transparent",
  "[&_.cm-editor]:border-transparent",
  "[&_.cm-scroller]:font-mono",
  "[&_.cm-scroller]:border-transparent",
  "[&_.cm-activeLine]:bg-transparent",
  "[&_.cm-activeLineGutter]:bg-transparent",
  "[&_.cm-gutters]:bg-grey-75 dark:[&_.cm-gutters]:bg-grey-950",
  "[&_.cm-gutters]:text-grey-600 dark:[&_.cm-gutters]:text-grey-500",
  "[&_.cm-gutters]:border-grey-500 dark:[&_.cm-gutters]:border-grey-800",
  "[&_.cm-cursor]:border-grey-900 dark:[&_.cm-cursor]:border-grey-75",
  "dark:[&_.cm-tooltip-autocomplete.cm-tooltip_ul_li:not([aria-selected])]:bg-grey-975"
].join(" "), T = N(function({
  title: t,
  value: b,
  height: s = "200px",
  error: o,
  hint: a,
  clearBg: f = !0,
  extensions: c,
  onChange: x,
  onFocus: n,
  onBlur: l,
  className: p,
  ..._
}, y) {
  const v = z(), d = H(null), [h, j] = m(100), [u, w] = L.useState(null), [R, k] = m({
    crosshairCursor: !1
  }), { setFocusState: i } = B(), F = (e) => {
    n == null || n(e), i(!0);
  }, C = (e) => {
    l == null || l(e), i(!1);
  };
  g(() => {
    Promise.all(c).then(w), k((e) => ({ setup: e, searchKeymap: !1 }));
  }, [c]), g(() => {
    const e = new ResizeObserver(([S]) => {
      j(S.contentRect.width);
    });
    return e.observe(d.current), () => e.disconnect();
  }, []);
  const E = G(
    "peer order-2 w-full max-w-full overflow-hidden rounded-sm border",
    f ? "bg-transparent" : "bg-grey-75",
    o ? "border-red" : "border-grey-500 dark:border-grey-800",
    t && "mt-2",
    s === "full" && "h-full",
    I,
    p
  );
  return /* @__PURE__ */ r.jsxs(r.Fragment, { children: [
    /* @__PURE__ */ r.jsx("div", { ref: d }),
    u && /* @__PURE__ */ r.jsxs("div", { className: s === "full" ? "h-full" : "", style: { width: h }, children: [
      /* @__PURE__ */ r.jsx(
        M,
        {
          ref: y,
          basicSetup: R,
          className: E,
          extensions: u,
          height: s === "full" ? "100%" : s,
          value: b,
          onBlur: C,
          onChange: x,
          onFocus: F,
          ..._
        }
      ),
      t && /* @__PURE__ */ r.jsx(O, { className: "order-1 !text-grey-700 peer-focus:!text-black", htmlFor: v, useLabelTag: !0, children: t }),
      a && /* @__PURE__ */ r.jsx(V, { className: "order-3", color: o ? "red" : "", children: a })
    ] })
  ] });
});
export {
  T as default
};
//# sourceMappingURL=code-editor-view-OQMFR6xI.mjs.map
