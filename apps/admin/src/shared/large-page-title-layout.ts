import type React from 'react';
import { useEffect, useState } from 'react';

/*
 * A large page title above a list screen's sticky header (admin7Design): the
 * space above it and its size grow with the window, its height as much as its
 * width, so a tall screen gets the generous version and a short one stays
 * close to the compact header it replaces.
 *
 * - space: 28px at 600px tall, 100px from 900px (the Admin 7 vision's)
 * - title: 24px at 600px tall, 44px from 900px; and 28px at 800px wide, 44px
 *   from 1380px, whichever is smaller
 */
export const LARGE_PAGE_TITLE_VARIABLES = {
  // 0 at rest, 1 once the header has stuck (useLargeTitleCondense)
  '--large-title-condense': '0',
  '--large-title-space': 'clamp(28px, calc(24vh - 116px), 100px)',
  '--large-title-size':
    'min(clamp(24px, calc(6.667vh - 16px), 44px), clamp(28px, calc(2.76vw + 6px), 44px))',
} as React.CSSProperties;

/*
 * The header's own top padding while under a large title. Its first row sits
 * 32px above a separator at rest and settles 16px down as the header sticks
 * (index.css), to 24px clear of the frame's top bar with 16px below it; the
 * header's height never changes.
 */
export const LARGE_TITLE_HEADER_PADDING = 8;

/**
 * How far the page scrolls while the large title hands over to the header:
 * from half of it before the header sticks to half of it after.
 */
export const LARGE_TITLE_HANDOVER = 80;

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
 * Hands the large title over to the sticky header as the page scrolls, by the
 * scroll position across LARGE_TITLE_HANDOVER (index.css). Where the browser
 * ties animations to scrolling itself (scroll-driven animations), it does so
 * in step with the scroll and this does nothing; elsewhere it sets
 * `--large-title-condense` on the list page, from 0 to 1, each frame the page
 * scrolls, set directly on the element so scrolling doesn't re-render. Attach
 * `markerRef` to the handover's marker (LargePageTitle).
 */
export function useLargeTitleCondense() {
  const [marker, markerRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = marker && scrollParent(marker);
    const host = marker?.closest<HTMLElement>('[data-large-title-host]');
    if (!marker || !root || !host || CSS.supports('animation-timeline: view()')) {
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const past = root.getBoundingClientRect().top - marker.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, past / LARGE_TITLE_HANDOVER));
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
