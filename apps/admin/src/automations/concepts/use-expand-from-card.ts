import { useCallback, useEffect, useRef } from 'react';

// NY-1715 concept A2: the editor panel grows out of the email card it was
// opened from, and shrinks back into it on close. The panel is laid out at its
// final size the whole time; a clip-path reveals it from the card's outline, so
// the editor never reflows mid-animation — the same approach as the email
// analytics sheet, on a gentle ease-in-out, with a slight overshoot that eases
// back once the panel reaches full size. The editor's content stays hidden until
// the panel is nearly in place, so only the empty surface grows.

const DURATION = 200;
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const OVERSHOOT_SCALE = 1.006;
const SETTLE_DURATION = 120;
// Content fades in over the end of the growth and the settle, and out before shrinking.
const CONTENT_FADE_IN_DELAY = DURATION * 0.75;
const CONTENT_FADE_OUT = 80;
const RADIUS = '12px';
const FULL = `inset(0px 0px 0px 0px round ${RADIUS})`;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// The scrim is the panel's sibling; it fades rather than growing with the panel.
const findScrim = (panel: HTMLElement) =>
  panel.parentElement?.querySelector<HTMLElement>('[data-email-editor-scrim]') ?? null;

// A3: while writing, the automation header slides away and the canvas nodes fade
// (styles in concept-switcher.tsx, keyed off this attribute on the editor root).
export const CANVAS_CLEARED_ATTRIBUTE = 'data-ny1715-canvas-cleared';
const setCanvasCleared = (cleared: boolean) => {
  const editor = document.querySelector('[data-testid="automation-editor"]');
  if (cleared) {
    editor?.setAttribute(CANVAS_CLEARED_ATTRIBUTE, '');
  } else {
    editor?.removeAttribute(CANVAS_CLEARED_ATTRIBUTE);
  }
};

const findCard = (stepId: string) =>
  document
    .querySelector(`.react-flow__node[data-id="${CSS.escape(stepId)}"]`)
    ?.querySelector<HTMLElement>('[role="article"]') ?? null;

// The panel turned into the card's outline, `progress` of the way from the full panel. A
// clip can only show what's inside the panel, so a card that sits partly outside the panel's
// own area (far left or right on the canvas) also needs the panel moved over to it: the
// panel slides just far enough for the card to fit, then clips down to it. `panelRect` is
// the panel's resting position, without that slide.
const cardFrame = (panelRect: DOMRect, card: HTMLElement, progress = 1) => {
  const p = panelRect;
  const c = card.getBoundingClientRect();
  const dx = Math.max(0, c.right - p.right) + Math.min(0, c.left - p.left);
  const dy = Math.max(0, c.bottom - p.bottom) + Math.min(0, c.top - p.top);
  const inset = (value: number) => `${value * progress}px`;
  return {
    clipPath: `inset(${inset(c.top - (p.top + dy))} ${inset(p.right + dx - c.right)} ${inset(p.bottom + dy - c.bottom)} ${inset(c.left - (p.left + dx))} round ${RADIUS})`,
    translate: `translate(${dx * progress}px, ${dy * progress}px)`,
  };
};

// EASING as a function, for the shrink below, which runs frame by frame.
const easeStandard = (x: number) => {
  // Solve the curve's x for t by bisection, then return its y.
  const bezier = (t: number, a: number, b: number) =>
    3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (bezier(mid, 0.4, 0.2) < x) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return bezier((low + high) / 2, 0, 1);
};

export const useExpandFromCard = ({
  enabled,
  stepId,
  clearsCanvas = false,
}: {
  enabled: boolean;
  stepId: string | undefined;
  clearsCanvas?: boolean;
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // The card the editor grew out of is hidden while the editor stands in for it, so the two
  // never show at once (a doubled outline and shadow as they overlap). It reappears the
  // moment the editor lands back on it, or whenever the editor goes away.
  const hiddenCardRef = useRef<HTMLElement | null>(null);
  const showCard = useCallback(() => {
    if (hiddenCardRef.current) {
      hiddenCardRef.current.style.visibility = '';
      hiddenCardRef.current = null;
    }
  }, []);
  useEffect(() => showCard, [showCard]);

  // The canvas comes back however the editor goes away, including the browser's Back.
  useEffect(() => {
    if (!enabled || !clearsCanvas) {
      return;
    }
    setCanvasCleared(true);
    return () => setCanvasCleared(false);
  }, [clearsCanvas, enabled]);

  const hasOpenedRef = useRef(false);
  const isClosingRef = useRef(false);

  // A callback ref, because the dialog portals its content in a later commit than this
  // hook's own render. It runs before paint, so the full-size panel never flashes.
  const setPanel = useCallback(
    (panel: HTMLDivElement | null) => {
      panelRef.current = panel;
      if (!panel || hasOpenedRef.current) {
        return;
      }
      hasOpenedRef.current = true;
      if (!enabled || prefersReducedMotion()) {
        return;
      }
      const total = DURATION + SETTLE_DURATION;
      findScrim(panel)?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: total,
        easing: 'ease-out',
      });
      const card = stepId ? findCard(stepId) : null;
      if (!card) {
        return;
      }
      card.style.visibility = 'hidden';
      hiddenCardRef.current = card;
      // Grow to full size slightly overscaled, then settle back to 1.
      const start = cardFrame(panel.getBoundingClientRect(), card);
      panel.animate(
        [
          {
            clipPath: start.clipPath,
            transform: `${start.translate} scale(1)`,
            easing: EASING,
          },
          {
            clipPath: FULL,
            transform: `translate(0px, 0px) scale(${OVERSHOOT_SCALE})`,
            offset: DURATION / total,
            easing: 'ease-in-out',
          },
          { clipPath: FULL, transform: 'translate(0px, 0px) scale(1)' },
        ],
        { duration: total },
      );
      for (const child of panel.children) {
        child.animate([{ opacity: 0 }, { opacity: 1 }], {
          delay: CONTENT_FADE_IN_DELAY,
          duration: total - CONTENT_FADE_IN_DELAY,
          easing: 'ease-out',
          fill: 'backwards',
        });
      }
    },
    [enabled, stepId],
  );

  // Runs `done` after shrinking back into the card, or straight away when there's nothing to animate.
  const close = useCallback(
    (done: () => void) => {
      const panel = panelRef.current;
      const card = stepId ? findCard(stepId) : null;
      if (!enabled || !panel || !card || prefersReducedMotion()) {
        done();
        return;
      }
      if (isClosingRef.current) {
        return;
      }
      isClosingRef.current = true;
      if (clearsCanvas) {
        setCanvasCleared(false);
      }
      findScrim(panel)?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: DURATION,
        easing: EASING,
        fill: 'forwards',
      });
      for (const child of panel.children) {
        child.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: CONTENT_FADE_OUT,
          easing: 'ease-in',
          fill: 'forwards',
        });
      }
      // Frame by frame rather than a fixed animation, re-measuring the card each time: in D
      // the sidebar reopens alongside, so the canvas (and the card) moves while this runs.
      const startsAt = performance.now() + CONTENT_FADE_OUT / 2;
      const panelRect = panel.getBoundingClientRect();
      const step = (now: number) => {
        const progress = Math.min(1, Math.max(0, (now - startsAt) / DURATION));
        const frame = cardFrame(panelRect, card, easeStandard(progress));
        panel.style.clipPath = frame.clipPath;
        panel.style.transform = frame.translate;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Swap in the same frame: closing unmounts the editor a few frames later (it goes
          // through the router), and until then it would sit over the card, with the card's
          // shadow showing round its edge.
          panel.style.visibility = 'hidden';
          showCard();
          done();
        }
      };
      requestAnimationFrame(step);
    },
    [clearsCanvas, enabled, showCard, stepId],
  );

  return { panelRef: setPanel, close };
};
