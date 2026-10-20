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

// The panel clipped down to the card's outline.
const cardClip = (panel: HTMLElement, card: HTMLElement) => {
  const p = panel.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  return `inset(${c.top - p.top}px ${p.right - c.right}px ${p.bottom - c.bottom}px ${c.left - p.left}px round ${RADIUS})`;
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
      // Grow to full size slightly overscaled, then settle back to 1.
      panel.animate(
        [
          { clipPath: cardClip(panel, card), transform: 'scale(1)', easing: EASING },
          {
            clipPath: FULL,
            transform: `scale(${OVERSHOOT_SCALE})`,
            offset: DURATION / total,
            easing: 'ease-in-out',
          },
          { clipPath: FULL, transform: 'scale(1)' },
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
      const shrink = panel.animate([{ clipPath: FULL }, { clipPath: cardClip(panel, card) }], {
        delay: CONTENT_FADE_OUT / 2,
        duration: DURATION,
        easing: EASING,
        fill: 'forwards',
      });
      shrink.finished.then(done, done);
    },
    [clearsCanvas, enabled, stepId],
  );

  return { panelRef: setPanel, close };
};
