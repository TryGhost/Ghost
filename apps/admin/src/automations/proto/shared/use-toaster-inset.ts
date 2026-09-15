import { useEffect, type RefObject } from 'react';

// Keeps the app's toasts over the canvas, out from under a left-hand pane, for as
// long as the screen that calls this is mounted.
//
// WHY IT'S A GLOBAL REACH-AROUND. Shade mounts ONE Toaster for the whole admin from
// ShadeProvider, portalled to the body at bottom-left. It takes no per-screen
// configuration, and a screen-local Toaster would mean two of them splitting toasts
// between them. So a screen that needs its toasts somewhere else has to say so from
// outside — there's no supported route.
//
// MEASURED, NOT CALCULATED. This takes a ref to the element the toasts should sit
// over — the canvas region — and reads its left edge. The first version added the
// pane's width to sonner's default offset and hardcoded the sum, which was wrong
// twice over: it's a magic number that silently rots the moment the pane is resized
// or the screen gains a sidebar, and it assumes the pane is the only thing between
// the viewport edge and the canvas. getBoundingClientRect() already knows all of
// that, and it keeps knowing it.
//
// A ResizeObserver on the element catches the pane opening and closing, since that
// changes the canvas's width. Its left edge is what we actually want, and the
// observer doesn't fire on position-only changes — but nothing here moves the canvas
// without also resizing it, and a scroll/resize listener for a case that can't arise
// would be machinery pretending to be general.
//
// HOW IT'S APPLIED. sonner positions its container from its own stylesheet —
// `[data-sonner-toaster][data-x-position=left] { left: var(--offset-left) }` — and
// sets the variable inline, rewriting that inline style on every toast. So an inline
// override doesn't survive. A stylesheet rule with `!important` does: it beats both
// sonner's rule and its inline variable, and it holds across re-renders because it
// isn't on the element at all.
//
// Both the desktop and the ≤600px mobile rules are overridden, since sonner swaps to
// `--mobile-offset-left` under that width and an un-overridden mobile rule would put
// the toast back under the pane on a narrow window.
//
// This is a prototype accommodation, not a pattern. The real fix is for the Toaster
// to know what's under it — an offset on ShadeProvider, or a Toaster that reads a CSS
// variable a screen can set. Worth raising if the pane survives review.
export const useToasterInset = (ref: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }
    const style = document.createElement('style');
    style.dataset.protoToasterInset = '';
    document.head.append(style);

    const apply = () => {
      // The canvas's own left edge, plus the gutter sonner would have used against
      // the viewport — so the toast sits inside the canvas the way it sits inside the
      // window everywhere else.
      const left = Math.round(target.getBoundingClientRect().left) + 24;
      style.textContent =
        `[data-sonner-toaster][data-x-position='left']{` +
        `left:${left}px!important;` +
        // Matched to the pane's width transition so the toast travels with the edge
        // it's clearing rather than jumping once that edge has arrived.
        `transition:left 420ms cubic-bezier(0.22,0.61,0.36,1);}` +
        `@media (max-width:600px){[data-sonner-toaster][data-x-position='left']{left:${left}px!important;}}`;
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(target);
    return () => {
      observer.disconnect();
      style.remove();
    };
  }, [ref]);
};
