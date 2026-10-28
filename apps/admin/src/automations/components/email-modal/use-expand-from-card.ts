import { useCallback, useEffect, useRef } from 'react';

// The editor panel grows out of the email card it was opened from and shrinks back into it on
// close. The panel keeps its final size throughout; a clip-path reveals it from the card's
// outline, so the editor never reflows mid-animation.

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

const findCard = (stepId: string) =>
  document
    .querySelector(`.react-flow__node[data-id="${CSS.escape(stepId)}"]`)
    ?.querySelector<HTMLElement>('[role="article"]') ?? null;

// The panel clipped to the card's outline, `progress` of the way there. A clip only shows what's
// inside the panel, so a card partly outside the panel's area also moves the panel over to it.
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

// EASING as a function, for the shrink, which runs frame by frame.
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

export const useExpandFromCard = (stepId: string | undefined) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // The card is hidden while the editor stands in for it, so their outlines never overlap.
  const hiddenCardRef = useRef<HTMLElement | null>(null);
  const showCard = useCallback(() => {
    if (hiddenCardRef.current) {
      hiddenCardRef.current.style.visibility = '';
      hiddenCardRef.current = null;
    }
  }, []);
  useEffect(() => showCard, [showCard]);

  const hasOpenedRef = useRef(false);
  const isClosingRef = useRef(false);

  // A callback ref, as the dialog portals its content a commit later; it runs before paint, so
  // the full-size panel never flashes.
  const setPanel = useCallback(
    (panel: HTMLDivElement | null) => {
      panelRef.current = panel;
      if (!panel || hasOpenedRef.current) {
        return;
      }
      hasOpenedRef.current = true;
      const card = stepId ? findCard(stepId) : null;
      if (!card || prefersReducedMotion()) {
        return;
      }
      card.style.visibility = 'hidden';
      hiddenCardRef.current = card;
      const total = DURATION + SETTLE_DURATION;
      const start = cardFrame(panel.getBoundingClientRect(), card);
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
    [stepId],
  );

  // Runs `done` once the panel has shrunk back into the card, or straight away without motion.
  const close = useCallback(
    (done: () => void) => {
      const panel = panelRef.current;
      const card = stepId ? findCard(stepId) : null;
      if (!panel || !card || prefersReducedMotion()) {
        done();
        return;
      }
      if (isClosingRef.current) {
        return;
      }
      isClosingRef.current = true;
      for (const child of panel.children) {
        child.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: CONTENT_FADE_OUT,
          easing: 'ease-in',
          fill: 'forwards',
        });
      }
      // Frame by frame, re-measuring the card, as a reopening sidebar moves it during the shrink.
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
          // Swap in the same frame: the editor unmounts a few frames later, via the router.
          panel.style.visibility = 'hidden';
          showCard();
          done();
        }
      };
      requestAnimationFrame(step);
    },
    [showCard, stepId],
  );

  return { panelRef: setPanel, close };
};
