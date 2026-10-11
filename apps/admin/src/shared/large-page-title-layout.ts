import type React from 'react';
import { useEffect, useState } from 'react';

/*
 * A large page title above a list screen's sticky header (admin7Design): the
 * space above it and its size grow with the window, its height as much as its
 * width, so a tall screen gets the generous version and a short one stays
 * close to the compact header it replaces.
 *
 * - space: 28px at 600px tall, 96px from 1000px
 * - title: 24px at 600px tall, 44px from 1000px; and 28px at 800px wide, 44px
 *   from 1380px, whichever is smaller
 */
export const LARGE_PAGE_TITLE_VARIABLES = {
  // 0 at rest, 1 once the header has stuck (useLargeTitleCondense)
  '--large-title-condense': '0',
  '--large-title-space': 'clamp(28px, calc(17vh - 74px), 96px)',
  '--large-title-size':
    'min(clamp(24px, calc(5vh - 6px), 44px), clamp(28px, calc(2.76vw + 6px), 44px))',
} as React.CSSProperties;

// The header's own top padding while under a large title, which keeps its
// row of actions clear of the frame's top bar once it has stuck
export const LARGE_TITLE_HEADER_PADDING = 24;

// How far the page scrolls while the large title hands over to the header
const CONDENSE_DISTANCE = 56;

/**
 * How far the sticky header is pulled up over the large title, so the row of
 * actions it starts with sits level with the title.
 */
export const LARGE_TITLE_HEADER_OVERLAP = `calc(var(--large-title-size) * 0.575 + ${LARGE_TITLE_HEADER_PADDING}px + var(--control-height) / 2)`;

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) {
      return parent;
    }
  }
  return null;
}

/**
 * Hands the large title over to the sticky header as the page scrolls: over
 * the last CONDENSE_DISTANCE before the header sticks, `--large-title-condense`
 * on the list page goes from 0 to 1, for the title, the header's small title
 * and its background to fade by. Follows the scroll position, so stopping
 * halfway stays halfway; set directly on the element, so scrolling doesn't
 * re-render. Attach `markerRef` to where the header sits at rest.
 */
export function useLargeTitleCondense() {
  const [marker, markerRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = marker && scrollParent(marker);
    const host = marker?.closest<HTMLElement>('[data-list-page="list-page"]');
    if (!marker || !root || !host) {
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = marker.getBoundingClientRect().top - root.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, 1 - distance / CONDENSE_DISTANCE));
      host.style.setProperty('--large-title-condense', progress.toFixed(3));
    };
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };
    update();
    root.addEventListener('scroll', schedule, { passive: true });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(root);
    return () => {
      root.removeEventListener('scroll', schedule);
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [marker]);

  return { markerRef };
}
