import { f as Q, j as e, S as le, c as t, R as L, I as ce, u as Z, a as xe, b as Y, d as H, N as B, e as be } from "./index-75b1a95e.mjs";
var me = [
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
], he = me.reduce((r, s) => {
  const a = Q((n, x) => {
    const { asChild: l, ...o } = n, c = l ? le : s;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ e.jsx(c, { ...o, ref: x });
  });
  return a.displayName = `Primitive.${s}`, { ...r, [s]: a };
}, {}), ue = "Separator", q = "horizontal", pe = ["horizontal", "vertical"], ee = Q((r, s) => {
  const { decorative: a, orientation: n = q, ...x } = r, l = fe(n) ? n : q, c = a ? { role: "none" } : { "aria-orientation": l === "vertical" ? l : void 0, role: "separator" };
  return /* @__PURE__ */ e.jsx(
    he.div,
    {
      "data-orientation": l,
      ...c,
      ...x,
      ref: s
    }
  );
});
ee.displayName = ue;
function fe(r) {
  return pe.includes(r);
}
var ke = ee;
const ge = ({ className: r }) => (r || (r = "border-grey-200 dark:border-grey-800"), /* @__PURE__ */ e.jsx(ke, { asChild: !0, decorative: !0, children: /* @__PURE__ */ e.jsx("hr", { className: r }) })), te = t("text-sm font-medium tracking-normal"), ve = t(
  te,
  "text-grey-900 dark:text-grey-500"
), V = ({
  level: r = 1,
  children: s,
  styles: a = "",
  grey: n = !0,
  separator: x,
  useLabelTag: l,
  className: o = "",
  ...c
}) => {
  const p = `${l ? "label" : `h${r}`}`;
  if (a += r === 6 || l ? ` block ${n ? ve : te}` : " ", !l)
    switch (r) {
      case 1:
        a += " md:text-4xl leading-tighter";
        break;
      case 2:
        a += " md:text-3xl";
        break;
      case 3:
        a += " md:text-2xl";
        break;
      case 4:
        a += " md:text-xl";
        break;
      case 5:
        a += " md:text-lg";
        break;
    }
  o = t(
    a,
    !n && "dark:text-white",
    o
  );
  const i = L.createElement(p, { className: o, key: "heading-elem", ...c }, s);
  if (x) {
    const v = !r || r === 1 ? 2 : 1, m = r === 6 ? 2 : 3;
    return /* @__PURE__ */ e.jsxs("div", { className: `gap-${v} mb-${m} flex flex-col`, children: [
      i,
      /* @__PURE__ */ e.jsx(ge, {})
    ] });
  } else
    return i;
}, we = ({ size: r, color: s, delay: a, style: n }) => {
  const [x, l] = L.useState(!a);
  L.useEffect(() => {
    if (a) {
      const c = setTimeout(() => {
        l(!0);
      }, a);
      return () => {
        clearTimeout(c);
      };
    }
  }, [a]);
  let o = "relative mx-0 my-[-0.5] box-border inline-block animate-spin rounded-full before:z-10 before:block before:rounded-full before:content-[''] ";
  switch (r) {
    case "sm":
      o += " h-[16px] w-[16px] border-2 before:mt-[10px] before:h-[3px] before:w-[3px] ";
      break;
    case "md":
      o += " h-[20px] w-[20px] border-2 before:mt-[13px] before:h-[3px] before:w-[3px] ";
      break;
    case "lg":
    default:
      o += " h-[50px] w-[50px] border before:mt-[7px] before:h-[7px] before:w-[7px] ";
      break;
  }
  switch (s) {
    case "light":
      o += " border-white/20 before:bg-white dark:border-black/10 dark:before:bg-black ";
      break;
    case "dark":
    default:
      o += " border-black/10 before:bg-black dark:border-white/20 dark:before:bg-white ";
      break;
  }
  return r === "lg" ? /* @__PURE__ */ e.jsx("div", { className: `flex h-64 items-center justify-center transition-opacity ${x ? "opacity-100" : "opacity-0"}`, style: n, children: /* @__PURE__ */ e.jsx("div", { className: o }) }) : /* @__PURE__ */ e.jsx("div", { className: o });
}, P = L.forwardRef(({
  testId: r,
  size: s = "md",
  label: a = "",
  hideLabel: n = !1,
  icon: x = "",
  iconSize: l,
  iconColorClass: o,
  color: c = "clear",
  fullWidth: p,
  link: i,
  linkWithPadding: v = !1,
  disabled: m,
  unstyled: w = !1,
  className: d = "",
  tag: M = "button",
  loading: S = !1,
  loadingIndicatorColor: f,
  outlineOnMobile: j = !1,
  onClick: y,
  ...R
}, $) => {
  if (c || (c = "clear"), !w) {
    switch (d = t(
      "inline-flex items-center justify-center whitespace-nowrap rounded text-sm transition",
      i && c !== "clear" && c !== "black" || !i && c !== "clear" ? "font-bold" : "font-semibold",
      i ? "" : `${s === "sm" ? "h-7" : "h-[34px]"}`,
      i ? "" : `${s === "sm" || a && x ? "px-3" : "px-4"}`,
      i && v && "-m-1 p-1",
      d
    ), c) {
      case "black":
        d = t(
          i ? "text-black hover:text-grey-800 dark:text-white" : `bg-black text-white dark:bg-white dark:text-black ${!m && "hover:bg-grey-900"}`,
          d
        ), f = "light", o = o || "text-white";
        break;
      case "light-grey":
        d = t(
          i ? "text-grey-800 hover:text-green-400 dark:text-white" : `bg-grey-200 text-black dark:bg-grey-900 dark:text-white ${!m && "hover:!bg-grey-300 dark:hover:!bg-grey-800"}`,
          d
        ), f = "dark";
        break;
      case "grey":
        d = t(
          i ? "text-black hover:text-grey-800 dark:text-white" : `bg-grey-100 text-black dark:bg-grey-900 dark:text-white ${!m && "hover:!bg-grey-300 dark:hover:!bg-grey-800"}`,
          d
        ), f = "dark";
        break;
      case "green":
        d = t(
          i ? " text-green hover:text-green-400" : ` bg-green text-white ${!m && "hover:bg-green-400"}`,
          d
        ), f = "light", o = o || "text-white";
        break;
      case "red":
        d = t(
          i ? "text-red hover:text-red-400" : `bg-red text-white ${!m && "hover:bg-red-400"}`,
          d
        ), f = "light", o = o || "text-white";
        break;
      case "white":
        d = t(
          i ? "text-white hover:text-white dark:text-black dark:hover:text-grey-800" : "bg-white text-black dark:bg-black dark:text-white",
          d
        ), f = "dark";
        break;
      case "outline":
        d = t(
          i ? "text-black hover:text-grey-800 dark:text-white" : `border border-grey-300 bg-transparent text-black dark:border-grey-800 dark:text-white ${!m && "hover:!border-black dark:hover:!border-white"}`,
          d
        ), f = "dark";
        break;
      default:
        d = t(
          i ? " text-black hover:text-grey-800 dark:text-white" : `text-grey-900 dark:text-white dark:hover:bg-grey-900 ${!m && "hover:bg-grey-200 hover:text-black"}`,
          j && !i && "border border-grey-300 hover:border-transparent md:border-transparent",
          d
        ), f = "dark";
        break;
    }
    d = t(
      p && !i && " w-full",
      m ? "opacity-40" : "cursor-pointer",
      d
    );
  }
  const F = a && x && !n ? "mr-1.5" : "";
  let T = "";
  T += a && n ? "sr-only" : "", T += S ? "invisible" : "", l = l || (s === "sm" || a && x ? "sm" : "md");
  const G = /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
    x && /* @__PURE__ */ e.jsx(ce, { className: F, colorClass: o, name: x, size: l }),
    /* @__PURE__ */ e.jsx("span", { className: T, children: a }),
    S && /* @__PURE__ */ e.jsxs("div", { className: "absolute flex", children: [
      /* @__PURE__ */ e.jsx(we, { color: f, size: s }),
      /* @__PURE__ */ e.jsx("span", { className: "sr-only", children: "Loading..." })
    ] })
  ] });
  return L.createElement(M, {
    className: d,
    "data-testid": r,
    disabled: m,
    type: "button",
    onClick: y,
    ref: $,
    ...R
  }, G);
});
P.displayName = "Button";
const ye = ({ size: r = "md", buttons: s, link: a, linkWithPadding: n, clearBg: x = !0, outlineOnMobile: l, className: o }) => {
  let c = t(
    "flex items-center justify-start rounded",
    a ? "gap-4" : "gap-2",
    o
  );
  return a && !x && (c = t(
    "transition-all hover:bg-grey-200 dark:hover:bg-grey-900",
    r === "sm" ? "h-7 px-3" : "h-[34px] px-4",
    l && "border border-grey-300 hover:border-transparent md:border-transparent",
    c
  )), /* @__PURE__ */ e.jsx("div", { className: c, children: s.map(({ key: p, ...i }) => /* @__PURE__ */ e.jsx(P, { link: a, linkWithPadding: n, size: r, ...i }, p)) });
}, je = ({
  shiftY: r,
  footerBgColorClass: s = "bg-white dark:bg-black",
  contentBgColorClass: a = "bg-white dark:bg-black",
  height: n = 96,
  children: x
}) => {
  const l = t(
    "w-100 sticky bottom-[-24px] z-[297] m-0 box-border p-0"
  ), o = r ? `calc(${r} - 24px)` : "-24px", c = `${n + 24}px`, p = t(
    "sticky z-[298] block h-[24px]",
    a
  ), i = "0", v = t(
    "sticky z-[299] mb-[-24px] flex items-center justify-between",
    "h-[96px]",
    s
  ), m = "0", w = `${n}px`, d = "sticky mx-2 block h-[24px] rounded-full shadow-[0_0_0_1px_rgba(0,0,0,.025),0_-8px_16px_-3px_rgba(0,0,0,.08)]", M = r ? `calc(${r} + ${n - 24}px)` : `${n - 24}px`;
  return /* @__PURE__ */ e.jsxs(
    "div",
    {
      className: l,
      style: {
        bottom: o,
        height: c
      },
      children: [
        /* @__PURE__ */ e.jsx(
          "div",
          {
            className: p,
            style: {
              bottom: i
            }
          }
        ),
        /* @__PURE__ */ e.jsx(
          "div",
          {
            className: v,
            style: {
              bottom: m,
              height: w
            },
            children: x
          }
        ),
        /* @__PURE__ */ e.jsx(
          "div",
          {
            className: d,
            style: {
              bottom: M
            }
          }
        )
      ]
    }
  );
};
function J(r, s, a = {}) {
  r ? B.show(Se, {
    title: "Are you sure you want to leave this page?",
    prompt: /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
      /* @__PURE__ */ e.jsx("p", { children: "Hey there! It looks like you didn't save the changes you made." }),
      /* @__PURE__ */ e.jsx("p", { children: "Save before you go!" })
    ] }),
    okLabel: "Leave",
    cancelLabel: "Stay",
    okColor: "red",
    onOk: (n) => {
      s(), n == null || n.remove();
    },
    ...a
  }) : s();
}
const $e = "bg-[rgba(98,109,121,0.2)] backdrop-blur-[3px]", re = ({
  size: r = "md",
  align: s = "center",
  width: a,
  height: n,
  testId: x,
  title: l,
  okLabel: o = "OK",
  okLoading: c = !1,
  cancelLabel: p = "Cancel",
  footer: i,
  header: v,
  leftButtonProps: m,
  buttonsDisabled: w,
  okDisabled: d,
  padding: M = !0,
  onOk: S,
  okColor: f = "black",
  onCancel: j,
  topRightContent: y,
  hideXOnMobile: R = !1,
  afterClose: $,
  children: F,
  backDrop: T = !0,
  backDropClick: G = !0,
  stickyFooter: C = !1,
  stickyHeader: ae = !1,
  scrolling: se = !0,
  dirty: D = !1,
  animate: W = !0,
  formSheet: N = !1,
  enableCMDS: oe = !0
}) => {
  const I = Z(), { setGlobalDirtyState: X } = xe(), [K, ne] = Y(!1);
  H(() => {
    X(D);
  }, [D, X]), H(() => {
    const g = (E) => {
      E.key === "Escape" && (document.activeElement && document.activeElement instanceof HTMLElement && document.activeElement.blur(), setTimeout(() => {
        j ? j() : J(D, () => {
          I.remove(), $ == null || $();
        });
      }), E.stopPropagation());
    };
    return document.addEventListener("keydown", g), () => {
      document.removeEventListener("keydown", g);
    };
  }, [I, D, $, j]), H(() => {
    const g = setTimeout(() => {
      ne(!0);
    }, 250);
    return () => clearTimeout(g);
  }, []), H(() => {
    if (S) {
      const g = (E) => {
        (E.metaKey || E.ctrlKey) && E.key === "s" && (E.preventDefault(), S());
      };
      if (oe)
        return window.addEventListener("keydown", g), () => {
          window.removeEventListener("keydown", g);
        };
    }
  });
  const z = [];
  let O;
  const U = () => {
    J(D, () => {
      I.remove(), $ == null || $();
    });
  };
  i || (p && z.push({
    key: "cancel-modal",
    label: p,
    color: "outline",
    onClick: j || (() => {
      U();
    }),
    disabled: w
  }), o && z.push({
    key: "ok-modal",
    label: o,
    color: f,
    className: "min-w-[80px]",
    onClick: S,
    disabled: w || d,
    loading: c
  }));
  let h = t(
    "relative z-50 flex max-h-[100%] w-full flex-col justify-between overflow-x-hidden bg-white dark:bg-black",
    s === "center" && "mx-auto",
    s === "left" && "mr-auto",
    s === "right" && "ml-auto",
    r !== "bleed" && "rounded",
    N ? "shadow-md" : "shadow-xl",
    W && !N && !K && s === "center" && "animate-modal-in",
    W && !N && !K && s === "right" && "animate-modal-in-from-right",
    N && !K && "animate-modal-in-reverse",
    se ? "overflow-y-auto" : "overflow-y-hidden"
  ), u = t(
    "fixed inset-0 z-[1000] h-[100vh] w-[100vw]"
  ), k = "", b = t(
    !y || y === "close" ? "" : "flex items-center justify-between gap-5"
  );
  switch (ae && (b = t(
    b,
    "sticky top-0 z-[300] -mb-4 bg-white !pb-4 dark:bg-black"
  )), r) {
    case "sm":
      h = t(
        h,
        "max-w-[480px]"
      ), u = t(
        u,
        "p-4 md:p-[8vmin]"
      ), k = "p-8", b = t(
        b,
        "-inset-x-8"
      );
      break;
    case "md":
      h = t(
        h,
        "max-w-[720px]"
      ), u = t(
        u,
        "p-4 md:p-[8vmin]"
      ), k = "p-8", b = t(
        b,
        "-inset-x-8"
      );
      break;
    case "lg":
      h = t(
        h,
        "max-w-[1020px]"
      ), u = t(
        u,
        "p-4 md:p-[4vmin]"
      ), k = "p-7", b = t(
        b,
        "-inset-x-8"
      );
      break;
    case "xl":
      h = t(
        h,
        "max-w-[1240px]0"
      ), u = t(
        u,
        "p-4 md:p-[3vmin]"
      ), k = "p-10", b = t(
        b,
        "-inset-x-10 -top-10"
      );
      break;
    case "full":
      h = t(
        h,
        "h-full"
      ), u = t(
        u,
        "p-4 md:p-[3vmin]"
      ), k = "p-10", b = t(
        b,
        "-inset-x-10"
      );
      break;
    case "bleed":
      h = t(
        h,
        "h-full"
      ), k = "p-10", b = t(
        b,
        "-inset-x-10"
      );
      break;
    default:
      u = t(
        u,
        "p-4 md:p-[8vmin]"
      ), k = "p-8", b = t(
        b,
        "-inset-x-8"
      );
      break;
  }
  M || (k = "p-0"), h = t(
    h
  ), b = t(
    b,
    k,
    "pb-0"
  ), O = t(
    k,
    "py-0"
  ), u = t(
    u,
    "max-[800px]:!pb-20"
  );
  const ie = t(
    `${k} ${C ? "py-6" : ""}`,
    "flex w-full items-center justify-between"
  );
  O = t(
    O,
    (r === "full" || r === "bleed" || n === "full" || typeof n == "number") && "grow"
  );
  const de = (g) => {
    g.target === g.currentTarget && G && U();
  }, _ = {};
  typeof a == "number" ? (_.width = "100%", _.maxWidth = a + "px") : a === "full" && (h = t(
    h,
    "w-full"
  )), typeof n == "number" ? (_.height = "100%", _.maxHeight = n + "px") : n === "full" && (h = t(
    h,
    "h-full"
  ));
  let A;
  return i ? A = i : i === !1 ? O += " pb-0 " : A = /* @__PURE__ */ e.jsxs("div", { className: ie, children: [
    /* @__PURE__ */ e.jsx("div", { children: m && /* @__PURE__ */ e.jsx(P, { ...m }) }),
    /* @__PURE__ */ e.jsx("div", { className: "flex gap-3", children: /* @__PURE__ */ e.jsx(ye, { buttons: z }) })
  ] }), A = C ? /* @__PURE__ */ e.jsx(je, { height: 84, children: A }) : /* @__PURE__ */ e.jsx(e.Fragment, { children: A }), /* @__PURE__ */ e.jsxs("div", { className: u, id: "modal-backdrop", onMouseDown: de, children: [
    /* @__PURE__ */ e.jsx("div", { className: t(
      "pointer-events-none fixed inset-0 z-0",
      T && !N && $e,
      N && "bg-[rgba(98,109,121,0.08)]"
    ) }),
    /* @__PURE__ */ e.jsxs("section", { className: h, "data-testid": x, style: _, children: [
      v === !1 ? "" : !y || y === "close" ? /* @__PURE__ */ e.jsxs("header", { className: b, children: [
        l && /* @__PURE__ */ e.jsx(V, { level: 3, children: l }),
        /* @__PURE__ */ e.jsx("div", { className: `${y !== "close" && "md:!invisible md:!hidden"} ${R && "hidden"} absolute right-6 top-6`, children: /* @__PURE__ */ e.jsx(P, { className: "-m-2 cursor-pointer p-2 opacity-50 hover:opacity-100", icon: "close", iconColorClass: "text-black dark:text-white", size: "sm", testId: "close-modal", unstyled: !0, onClick: U }) })
      ] }) : /* @__PURE__ */ e.jsxs("header", { className: b, children: [
        l && /* @__PURE__ */ e.jsx(V, { level: 3, children: l }),
        y
      ] }),
      /* @__PURE__ */ e.jsx("div", { className: O, children: F }),
      A
    ] })
  ] });
}, Ee = ({
  title: r = "Are you sure?",
  prompt: s,
  cancelLabel: a = "Cancel",
  okLabel: n = "OK",
  okRunningLabel: x = "...",
  okColor: l = "black",
  onCancel: o,
  onOk: c,
  customFooter: p,
  formSheet: i = !0
}) => {
  const v = Z(), [m, w] = Y("");
  return /* @__PURE__ */ e.jsx(
    re,
    {
      backDropClick: !1,
      buttonsDisabled: m === "running",
      cancelLabel: a,
      footer: p,
      formSheet: i,
      okColor: l,
      okLabel: m === "running" ? x : n,
      testId: "confirmation-modal",
      title: r,
      width: 540,
      onCancel: o,
      onOk: async () => {
        w("running");
        try {
          await (c == null ? void 0 : c(v));
        } catch (d) {
          console.error("Unhandled Promise Rejection. Make sure you catch errors in your onOk handler.", d);
        }
        w("");
      },
      children: /* @__PURE__ */ e.jsx("div", { className: "py-4 leading-9", children: s })
    }
  );
}, Se = B.create(Ee), Ne = B.create(() => {
  const { updateRoute: r } = be(), s = B.useModal();
  return /* @__PURE__ */ e.jsx(
    re,
    {
      afterClose: () => {
        r("");
      },
      cancelLabel: "",
      okLabel: "Close",
      size: "sm",
      title: "About",
      onOk: () => {
        r(""), s.remove();
      },
      children: /* @__PURE__ */ e.jsxs("div", { className: "mt-3 flex flex-col gap-4", children: [
        /* @__PURE__ */ e.jsx("p", { children: "You're looking at a React app inside Ghost Admin. It uses common AdminX framework and Design System packages, and works seamlessly with the current Admin's routing." }),
        /* @__PURE__ */ e.jsx("p", { children: "At the moment the look and feel follows the current Admin's style to blend in with existing pages. However the system is built in a very flexible way to allow easy updates in the future." }),
        /* @__PURE__ */ e.jsx(V, { className: "-mb-2 mt-4", level: 5, children: "Contents" }),
        /* @__PURE__ */ e.jsxs("p", { children: [
          "The demo uses a mocked list of members — it's ",
          /* @__PURE__ */ e.jsx("strong", { children: "not" }),
          " ",
          "the actual or future design of members in Ghost Admin. Instead, the pages showcase common design patterns like a list and detail, navigation, modals and toasts."
        ] })
      ] })
    }
  );
}), Me = { DemoModal: Ne };
export {
  Me as default
};
//# sourceMappingURL=modals-c7d7bf3b.mjs.map
