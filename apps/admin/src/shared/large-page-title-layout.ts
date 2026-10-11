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
  '--large-title-space': 'clamp(28px, calc(17vh - 74px), 96px)',
  '--large-title-size':
    'min(clamp(24px, calc(5vh - 6px), 44px), clamp(28px, calc(2.76vw + 6px), 44px))',
} as React.CSSProperties;

// The header's own top padding while under a large title
export const LARGE_TITLE_HEADER_PADDING = 12;

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
 * Whether the page has scrolled past a marker (e.g. where the sticky header
 * sits at rest, so it has stuck). Attach `markerRef` to the marker.
 */
export function useScrolledPast() {
  const [marker, markerRef] = useState<HTMLElement | null>(null);
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    if (!marker) {
      return;
    }
    const root = scrollParent(marker);
    const observer = new IntersectionObserver(
      ([entry]) => {
        const rootTop = entry.rootBounds?.top ?? 0;
        setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < rootTop);
      },
      { root },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [marker]);

  return { scrolledPast, markerRef };
}
