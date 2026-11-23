import React, { useLayoutEffect, useRef } from 'react';
import type { Layout } from '@tryghost/app-contracts/bridge';
import { cn } from '@tryghost/shade/utils';
import { AppFooter } from './app-footer';
import { sameLayout } from '@/apps/lib/layout';
import { clippingAncestors } from '@/apps/lib/overlay-clip';
import type { AppIconSource } from './app-icon';

/*
 * Bleeds to the content area's edges, so the page shows through the pinned navigation's glass.
 * As a page backdrop it holds still as the navigation pins, so the insets don't change mid-slide.
 */
const CANVAS_CLASS_NAME = cn(
  'absolute inset-y-0',
  'right-[calc(-1*var(--page-bleed-end,0px))] left-[calc(-1*var(--page-bleed-start,0px))]',
);

/*
 * Where Admin's navigation reaches over the page: the safe area's left inset. It takes the
 * pointer, so hovering there still opens the unpinned navigation.
 */
const CHROME_STRIP_CLASS_NAME =
  'absolute inset-y-0 left-0 w-[max(var(--page-bleed-start,0px),var(--page-safe-start,0px))]';

/* Kept clear to centre the safe area, as Admin's own pages are: the safe area's right inset. */
const END_STRIP_CLASS_NAME =
  'pointer-events-none absolute inset-y-0 right-0 w-(--page-safe-end,0px)';

/** The part of `element` that shows, inside every ancestor that clips it. */
function visibleBox(element: HTMLElement, clips: HTMLElement[]) {
  let { top, right, bottom, left } = element.getBoundingClientRect();
  for (const clip of clips) {
    const box = clip.getBoundingClientRect();
    top = Math.max(top, box.top);
    right = Math.min(right, box.right);
    bottom = Math.min(bottom, box.bottom);
    left = Math.max(left, box.left);
  }
  return { top, right, bottom, left };
}

/**
 * An app's page, framed by `children`, with its footer. `onLayoutChange` gets the page's safe area,
 * clear of the chrome Admin floats over it, from the frame's edges and from the window's. Only the
 * overlay's safe area leaves out what Admin's card clips.
 */
export const AppCanvas: React.FC<{
  app: AppIconSource;
  /** Must keep its identity: a new one measures again. */
  onLayoutChange: (layout: Layout) => void;
  placeholder?: React.ReactNode;
  children: React.ReactNode;
}> = ({ app, onLayoutChange, placeholder, children }) => {
  const canvas = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const endStrip = useRef<HTMLDivElement>(null);
  const footer = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!canvas.current || !strip.current || !endStrip.current || !footer.current) {
      return undefined;
    }
    const elements = {
      canvas: canvas.current,
      strip: strip.current,
      endStrip: endStrip.current,
      footer: footer.current,
    };
    const clips = clippingAncestors(elements.canvas);
    let reported: Layout | undefined;
    const measure = () => {
      // Rounded outwards, so the safe area never takes in a fraction of a pixel of Admin's.
      const safeArea = {
        top: 0,
        right: Math.ceil(elements.endStrip.getBoundingClientRect().width),
        bottom: Math.ceil(elements.footer.getBoundingClientRect().height),
        left: Math.ceil(elements.strip.getBoundingClientRect().width),
      };
      const box = elements.canvas.getBoundingClientRect();
      const visible = visibleBox(elements.canvas, clips);
      // Without scrollbars, as the overlay frame fills it.
      const { clientWidth, clientHeight } = document.documentElement;
      const layout = {
        safeArea,
        // Right to the card's edge, as Admin's own sheets go, past the space that centres the page.
        overlaySafeArea: {
          top: Math.max(0, Math.ceil(visible.top)),
          right: Math.max(0, Math.ceil(clientWidth - visible.right)),
          bottom: Math.max(
            0,
            Math.ceil(clientHeight - Math.min(visible.bottom, box.bottom - safeArea.bottom)),
          ),
          left: Math.max(0, Math.ceil(Math.max(visible.left, box.left + safeArea.left))),
        },
      };
      if (!sameLayout(reported, layout)) {
        reported = layout;
        onLayoutChange(layout);
      }
    };
    measure();
    // Resizing the window, or scrolling what holds the page, can move it without resizing it.
    const observer = new ResizeObserver(measure);
    for (const element of [...Object.values(elements), ...clips]) {
      observer.observe(element);
    }
    window.addEventListener('resize', measure);
    for (const clip of clips) {
      clip.addEventListener('scroll', measure, { passive: true });
    }
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      for (const clip of clips) {
        clip.removeEventListener('scroll', measure);
      }
    };
  }, [onLayoutChange]);

  return (
    // The footer and the placeholder come after the canvas, so they show over it.
    <div className="relative flex size-full flex-col">
      <div ref={canvas} className={CANVAS_CLASS_NAME} data-page-backdrop="">
        {children}
        <div ref={strip} className={CHROME_STRIP_CLASS_NAME} aria-hidden />
        <div ref={endStrip} className={END_STRIP_CLASS_NAME} aria-hidden />
      </div>
      <div className="pointer-events-none relative min-h-0 flex-1">{placeholder}</div>
      {/* Across the right bleed too, so the strip beside the footer is Admin's. */}
      <div
        ref={footer}
        className="@container/app-footer relative mr-[calc(-1*var(--page-bleed-end,0px))] shrink-0 pr-[var(--page-bleed-end,0px)]"
      >
        <AppFooter app={app} />
      </div>
    </div>
  );
};
