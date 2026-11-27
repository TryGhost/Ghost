import { useCallback } from 'react';

/**
 * Fades an element in from the first frame the browser paints after it mounts.
 * A CSS animation would start while the render that mounted it still blocks
 * painting, and could be over before it is ever seen.
 */
export function useRevealOnMount<T extends HTMLElement>(enabled: boolean, durationMs = 150) {
  return useCallback(
    (element: T | null) => {
      if (!element || !enabled || typeof element.animate !== 'function') {
        return;
      }
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      element.style.opacity = '0';
      requestAnimationFrame(() => {
        element.style.opacity = '';
        element.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: durationMs,
          easing: 'ease-in-out',
        });
      });
    },
    [enabled, durationMs],
  );
}
