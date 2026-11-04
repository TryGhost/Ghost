import React, { useLayoutEffect, useRef } from 'react';
import type { Layout } from '@tryghost/app-contracts/bridge';
import { cn } from '@tryghost/shade/utils';
import { AppFooter } from './app-footer';
import { sameLayout } from '@/apps/lib/layout';
import { clippingAncestors } from '@/apps/lib/overlay-clip';
import type { AppIconSource } from './app-icon';

/*
 * The canvas reaches past the page's own box to the edges of Admin's scrolling content area, by
 * the `--page-bleed-*` Admin's layout sets beside its navigation. As a page backdrop it also takes
 * the content area beneath Admin 7's pinned navigation, so the app's page shows through its glass,
 * and it holds still while the page slides as the navigation pins and unpins.
 */
const CANVAS_CLASS_NAME = cn(
  'absolute inset-y-0',
  'right-[calc(-1*var(--page-bleed-end,0px))] left-[calc(-1*var(--page-bleed-start,0px))]',
);

/*
 * The strip along the canvas's left edge that Admin's navigation reaches over: the pinned
 * navigation's gap, or, unpinned, the closed circle's footprint (`--page-safe-start`), which is
 * also where hovering opens the navigation. Admin keeps the pointer there, over the app's page,
 * so that still works. Its width is the safe area's left inset.
 */
const CHROME_STRIP_CLASS_NAME =
  'absolute inset-y-0 left-0 w-[max(var(--page-bleed-start,0px),var(--page-safe-start,0px))]';

/*
 * Along the canvas's right edge, the space Admin keeps clear to match the circle's footprint,
 * so the safe area is centred as Admin's own pages are (`--page-safe-end`). No chrome is there,
 * so the pointer goes through to the app's page. Its width is the safe area's right inset.
 */
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
 * An app's page, framed by `children`, with its footer. The page runs beneath the chrome Admin
 * floats over it: the footer, along its bottom, and Admin 7's navigation, along its left. The rest
 * is the page's safe area, which keeps as clear of the right edge as of the left beside the
 * unpinned navigation, as Admin's own pages do. `onLayoutChange` gets it whenever it changes: as
 * insets from the frame's edges, and from the window's, for the overlay frame, which covers the
 * window. Beneath the docked side panel as it widens, Admin's card clips the page, which keeps its
 * layout, as Admin's own pages do: only the overlay's safe area leaves out what the card clips.
 * `placeholder`, such as a loading indicator, shows over the safe area.
 *
 * The canvas holds still as the page slides while the navigation pins, so the insets don't change
 * mid-slide.
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
      // The window's size without its scrollbars, which the overlay frame, fixed to it, fills.
      const { clientWidth, clientHeight } = document.documentElement;
      const layout = {
        safeArea,
        // To the card's right edge, where Admin's own sheets stop, past the space kept clear
        // there to centre the page.
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
    // Pinning the navigation resizes the strip, and the footer wraps as the page narrows. The
    // card narrows as the side panel widens, and resizing the window, or scrolling what holds the
    // page, can move the page without resizing it.
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
    // The footer and the placeholder come after the canvas, so they show over it. Presses go
    // through the placeholder to the page.
    <div className="relative flex size-full flex-col">
      <div ref={canvas} className={CANVAS_CLASS_NAME} data-page-backdrop="">
        {children}
        <div ref={strip} className={CHROME_STRIP_CLASS_NAME} aria-hidden />
        <div ref={endStrip} className={END_STRIP_CLASS_NAME} aria-hidden />
      </div>
      <div className="pointer-events-none relative min-h-0 flex-1">{placeholder}</div>
      {/* Across the canvas's bleed on the right too, so the strip beside the footer is Admin's. */}
      <div
        ref={footer}
        className="@container/app-footer relative mr-[calc(-1*var(--page-bleed-end,0px))] shrink-0 pr-[var(--page-bleed-end,0px)]"
      >
        <AppFooter app={app} />
      </div>
    </div>
  );
};
