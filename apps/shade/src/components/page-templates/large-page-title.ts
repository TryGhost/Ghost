import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export interface PageChrome {
  /**
   * List pages show their title large above a sticky header that takes it
   * over as the page scrolls (ListPage). The app turns it on where its layout
   * has room for it, e.g. on desktop.
   */
  largeTitles: boolean;
}

const PageChromeContext = createContext<PageChrome>({ largeTitles: false });

/** Sets the page chrome for the page templates below it. */
export const PageChromeProvider = PageChromeContext.Provider;

export function usePageChrome(): PageChrome {
  return useContext(PageChromeContext);
}

/*
 * The large title's space above it and its size grow with the window, its
 * height as much as its width, so a tall screen gets the generous version and
 * a short one stays close to the compact header it replaces.
 *
 * - space: 28px at 600px tall, 100px from 900px
 * - title: 24px at 600px tall, 44px from 900px; and 28px at 800px wide, 44px
 *   from 1380px, whichever is smaller
 */
export const LARGE_PAGE_TITLE_VARIABLES = {
  '--large-title-space': 'clamp(28px, calc(24vh - 116px), 100px)',
  '--large-title-size':
    'min(clamp(24px, calc(6.667vh - 16px), 44px), clamp(28px, calc(2.76vw + 6px), 44px))',
} as React.CSSProperties;

/*
 * The header's own top padding under a large title. Its first row sits 32px
 * above a separator at rest and settles 16px down as the header sticks
 * (styles.css), to 24px clear of whatever is above with 16px below it; the
 * header's height never changes.
 */
const LARGE_TITLE_HEADER_PADDING = 8;

/**
 * How far the page scrolls while the large title hands over to the header:
 * from half of it before the header sticks to half of it after.
 */
export const LARGE_TITLE_HANDOVER = 80;

/**
 * How far the sticky header is pulled up over the large title, so the row it
 * starts with sits level with the title.
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
 * scroll position across LARGE_TITLE_HANDOVER (styles.css). Where the browser
 * ties animations to scrolling itself (scroll-driven animations), it does so
 * in step with the scroll and this does nothing; elsewhere it sets
 * `--large-title-condense` on the list page, from 0 to 1, each frame the page
 * scrolls, directly on the element so scrolling doesn't re-render. Attach
 * `markerRef` to the handover's marker.
 */
export function useLargeTitleCondense() {
  const [marker, markerRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = marker && scrollParent(marker);
    const host = marker?.closest<HTMLElement>('[data-large-title-host]');
    if (
      !marker ||
      !root ||
      !host ||
      typeof ResizeObserver === 'undefined' ||
      (typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: view()'))
    ) {
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

/**
 * Whether the page has scrolled past a marker (where the sticky header sits
 * at rest, so it has stuck). Re-renders only as that flips. Attach `markerRef`
 * to the marker.
 */
export function useScrolledPast() {
  const [marker, markerRef] = useState<HTMLElement | null>(null);
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    if (!marker || typeof IntersectionObserver === 'undefined') {
      setScrolledPast(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const rootTop = entry.rootBounds?.top ?? 0;
        setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < rootTop);
      },
      { root: scrollParent(marker) },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [marker]);

  return { scrolledPast, markerRef };
}
