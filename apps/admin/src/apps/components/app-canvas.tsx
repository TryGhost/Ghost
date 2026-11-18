import React, { useLayoutEffect, useRef } from 'react';
import type { Layout } from '@tryghost/app-contracts/bridge';
import { cn } from '@tryghost/shade/utils';
import { AppFooter } from './app-footer';
import { sameLayout } from '@/apps/lib/layout';
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

/**
 * An app's page, framed by `children`, with its footer. `onLayoutChange` gets the page's safe area,
 * clear of the chrome Admin floats over it, as insets from the frame's edges.
 */
export const AppCanvas: React.FC<{
  app: AppIconSource;
  /** Must keep its identity: a new one measures again. */
  onLayoutChange: (layout: Layout) => void;
  placeholder?: React.ReactNode;
  children: React.ReactNode;
}> = ({ app, onLayoutChange, placeholder, children }) => {
  const strip = useRef<HTMLDivElement>(null);
  const endStrip = useRef<HTMLDivElement>(null);
  const footer = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!strip.current || !endStrip.current || !footer.current) {
      return undefined;
    }
    const elements = {
      strip: strip.current,
      endStrip: endStrip.current,
      footer: footer.current,
    };
    let reported: Layout | undefined;
    const measure = () => {
      // Rounded outwards, so the safe area never takes in a fraction of a pixel of Admin's.
      const safeArea = {
        top: 0,
        right: Math.ceil(elements.endStrip.getBoundingClientRect().width),
        bottom: Math.ceil(elements.footer.getBoundingClientRect().height),
        left: Math.ceil(elements.strip.getBoundingClientRect().width),
      };
      const layout = { safeArea };
      if (!sameLayout(reported, layout)) {
        reported = layout;
        onLayoutChange(layout);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of Object.values(elements)) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [onLayoutChange]);

  return (
    // The footer and the placeholder come after the canvas, so they show over it.
    <div className="relative flex size-full flex-col">
      <div className={CANVAS_CLASS_NAME} data-page-backdrop="">
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
