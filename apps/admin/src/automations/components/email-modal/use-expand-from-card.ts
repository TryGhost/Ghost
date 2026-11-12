import { useCallback, useEffect, useRef } from 'react';

// Grows the editor panel out of its email card and shrinks it back on close. The panel stays
// full size and a clip-path reveals it, so the editor never reflows mid-animation.

const DURATION = 200;
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const OVERSHOOT_SCALE = 1.006;
const SETTLE_DURATION = 120;
const CONTENT_FADE_IN_DELAY = DURATION * 0.75;
const CONTENT_FADE_OUT = 80;
const RADIUS = '12px';
const FULL = `inset(0px 0px 0px 0px round ${RADIUS})`;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// The clip-path and translate that place the panel over the card, `progress` of the way there.
// A clip can't reach past the panel's bounds, so a card outside them is reached by translating.
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

// EASING as a JS function, for the frame-by-frame shrink.
const easeStandard = (x: number) => {
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

export const useExpandFromCard = (getEmailCardElement: () => HTMLElement | null) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const animationsRef = useRef<Animation[]>([]);
  const cancelAnimations = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
  }, []);

  // Hide the card while the editor stands in for it.
  const hiddenCardRef = useRef<{ element: HTMLElement; visibility: string } | null>(null);
  const showCard = useCallback(() => {
    if (hiddenCardRef.current) {
      const { element, visibility } = hiddenCardRef.current;
      element.style.visibility = visibility;
      hiddenCardRef.current = null;
    }
  }, []);
  useEffect(
    () => () => {
      cancelAnimations();
      showCard();
    },
    [cancelAnimations, showCard],
  );

  const hasOpenedRef = useRef(false);
  const isClosingRef = useRef(false);

  // A callback ref because the dialog portals its content a commit later. It runs before
  // paint, so the full-size panel never flashes.
  const setPanel = useCallback(
    (panel: HTMLDivElement | null) => {
      panelRef.current = panel;
      if (!panel) {
        cancelAnimations();
        showCard();
        hasOpenedRef.current = false;
        isClosingRef.current = false;
        return;
      }
      if (hasOpenedRef.current) {
        return;
      }
      hasOpenedRef.current = true;
      const card = getEmailCardElement();
      if (!card || prefersReducedMotion()) {
        return;
      }
      hiddenCardRef.current = { element: card, visibility: card.style.visibility };
      card.style.visibility = 'hidden';
      const total = DURATION + SETTLE_DURATION;
      const start = cardFrame(panel.getBoundingClientRect(), card);
      animationsRef.current.push(
        panel.animate(
          [
            { clipPath: start.clipPath, transform: `${start.translate} scale(1)`, easing: EASING },
            {
              clipPath: FULL,
              transform: `translate(0px, 0px) scale(${OVERSHOOT_SCALE})`,
              offset: DURATION / total,
              easing: 'ease-in-out',
            },
            { clipPath: FULL, transform: 'translate(0px, 0px) scale(1)' },
          ],
          { duration: total },
        ),
      );
      for (const child of panel.children) {
        animationsRef.current.push(
          child.animate([{ opacity: 0 }, { opacity: 1 }], {
            delay: CONTENT_FADE_IN_DELAY,
            duration: total - CONTENT_FADE_IN_DELAY,
            easing: 'ease-out',
            fill: 'backwards',
          }),
        );
      }
    },
    [cancelAnimations, getEmailCardElement, showCard],
  );

  // Runs `done` once the panel has shrunk back into the card, or straight away without motion.
  const close = useCallback(
    (done: () => void) => {
      if (isClosingRef.current) {
        return;
      }
      isClosingRef.current = true;
      const panel = panelRef.current;
      const card = getEmailCardElement();
      // Cancel only animations this hook owns, leaving Koenig's animations alone.
      cancelAnimations();
      if (!panel || !card || prefersReducedMotion()) {
        showCard();
        done();
        return;
      }
      for (const child of panel.children) {
        animationsRef.current.push(
          child.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: CONTENT_FADE_OUT,
            easing: 'ease-in',
            fill: 'forwards',
          }),
        );
      }
      // Runs frame by frame so it can re-measure the card, which a reopening sidebar moves.
      const startsAt = performance.now() + CONTENT_FADE_OUT / 2;
      const panelRect = panel.getBoundingClientRect();
      const step = (now: number) => {
        const progress = Math.min(1, Math.max(0, (now - startsAt) / DURATION));
        const frame = cardFrame(panelRect, card, easeStandard(progress));
        panel.style.clipPath = frame.clipPath;
        panel.style.transform = frame.translate;
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step);
        } else {
          frameRef.current = null;
          // Swap in the same frame: the editor unmounts a few frames later, via the router.
          panel.style.visibility = 'hidden';
          showCard();
          done();
        }
      };
      frameRef.current = requestAnimationFrame(step);
    },
    [cancelAnimations, getEmailCardElement, showCard],
  );

  return { panelRef: setPanel, close };
};
