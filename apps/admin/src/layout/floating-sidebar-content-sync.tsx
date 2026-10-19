import React from 'react';
import {
  FLOATING_SIDEBAR_CLOSED_FOOTPRINT,
  FLOATING_SIDEBAR_CLOSED_SIZE,
  FLOATING_SIDEBAR_INSET,
  getFloatingSidebarGapWidth,
  getFloatingSidebarTiming,
  type FloatingSidebarMorphStyle,
} from '@tryghost/shade/components';

/*
 * Keeps the content beside the admin7Design floating sidebar in step with it.
 *
 * - The capsule's metrics are set on the content as CSS variables, so the
 *   page chrome can keep clear of the closed circle while unpinned and reach
 *   back beneath the pinned panel: `--floating-sidebar-inset` (its distance
 *   from the viewport's top and left edges), `--floating-sidebar-size` (the
 *   circle's outer diameter, border included), `--floating-sidebar-footprint`
 *   (inset + diameter + inset) and `--floating-sidebar-gap` (the gap's width,
 *   0 unless pinned).
 * - Pinning and unpinning move the sidebar's gap at once, so the page lays out
 *   once rather than on every frame; the page then slides from its old place
 *   with a transform, in step with the capsule's morph, keeping the page
 *   column's left edge continuous however its padding changes.
 */

/**
 * The page column the slide keeps continuous (the first match: the
 * outermost). Without one (e.g. Settings) the page slides by half the gap's
 * change, which suits content centred beside it.
 */
const PAGE_COLUMN_SELECTOR =
  '.max-w-page, [data-list-page=list-page], [data-detail-page=detail-page], .gh-canvas, .gh-main-width';

/**
 * Full-bleed page backdrops (e.g. the member map): they span the scrollport
 * whether pinned or not, so they hold still while the page slides, slid back by
 * as much. They mustn't have a transform of their own.
 */
const PAGE_BACKDROP_SELECTOR = '[data-page-backdrop]';

/** The horizontal offset an animation in flight has moved an element by. */
function translateX(element: HTMLElement): number {
  const { transform } = getComputedStyle(element);
  return transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).m41 : 0;
}

/**
 * Calls `onBeforeCommit` just before React applies a pin change to the DOM:
 * the "first" of the slide, which by the time layout effects run is gone.
 * Renders nothing.
 */
class BeforePinCommit extends React.Component<{ pinned: boolean; onBeforeCommit: () => void }> {
  getSnapshotBeforeUpdate(previous: Readonly<{ pinned: boolean }>) {
    if (previous.pinned !== this.props.pinned) {
      this.props.onBeforeCommit();
    }
    return null;
  }

  // React requires it alongside getSnapshotBeforeUpdate
  componentDidUpdate() {}

  render() {
    return null;
  }
}

interface FloatingSidebarContentSyncProps {
  /** The `pinned` the sidebar is given. */
  pinned: boolean;
  /** The sidebar's `animate`: no slide until it's set, and for a frame after. */
  animate: boolean;
  /** The sidebar's `morphStyle`, whose timing the slide takes. */
  morphStyle: FloatingSidebarMorphStyle;
  /**
   * The content beside the sidebar, offset by its gap (the SidebarInset): it
   * carries the variables, and finds the page column and backdrops.
   */
  contentRef: React.RefObject<HTMLElement>;
  /**
   * The element that slides: the page inside the scrolling content, so the
   * scrollport (which clips) holds still and content reaching beneath the
   * panel never shows an edge.
   */
  slideRef: React.RefObject<HTMLElement>;
}

/**
 * Render it alongside the floating sidebar, after the content (so its refs are
 * attached when it first sets the variables), with the same `pinned`. Renders
 * nothing.
 */
export function FloatingSidebarContentSync({
  pinned,
  animate,
  morphStyle,
  contentRef,
  slideRef,
}: FloatingSidebarContentSyncProps) {
  const gapWidth = getFloatingSidebarGapWidth(pinned);
  const { duration, easing } = getFloatingSidebarTiming(morphStyle);

  // Like the capsule's transitions: a frame after mounting (and after
  // `animate`), so the first paint and a stored pinned state never slide.
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    if (!animate) {
      setReady(false);
      return;
    }
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  // The page column's left edge on screen before the pin change, mid-slide included
  const anchorBefore = React.useRef<number | null>(null);
  const findAnchor = React.useCallback(
    () => contentRef.current?.querySelector(PAGE_COLUMN_SELECTOR) ?? null,
    [contentRef],
  );
  const measureBeforePin = React.useCallback(() => {
    anchorBefore.current = findAnchor()?.getBoundingClientRect().left ?? null;
  }, [findAnchor]);

  // The variables are set before the slide measures where the page lands.
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }
    const variables = {
      '--floating-sidebar-inset': `${FLOATING_SIDEBAR_INSET}px`,
      '--floating-sidebar-size': `${FLOATING_SIDEBAR_CLOSED_SIZE}px`,
      '--floating-sidebar-footprint': `${FLOATING_SIDEBAR_CLOSED_FOOTPRINT}px`,
      '--floating-sidebar-gap': `${gapWidth}px`,
    };
    for (const [name, value] of Object.entries(variables)) {
      content.style.setProperty(name, value);
    }
    return () => {
      for (const name of Object.keys(variables)) {
        content.style.removeProperty(name);
      }
    };
  }, [contentRef, gapWidth]);

  const previousGapWidth = React.useRef(gapWidth);
  // The page's slide, then the counter-slides holding its backdrops still
  const slide = React.useRef<Animation[]>([]);
  React.useLayoutEffect(() => {
    const shift = gapWidth - previousGapWidth.current;
    previousGapWidth.current = gapWidth;
    const before = anchorBefore.current;
    anchorBefore.current = null;
    const page = slideRef.current;
    if (!shift || !page) {
      return;
    }
    const inFlight = slide.current;
    const inFlightOffset = inFlight.length ? translateX(page) : 0;
    for (const animation of inFlight) {
      animation.cancel();
    }
    slide.current = [];
    if (
      !ready ||
      typeof page.animate !== 'function' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    // Measured once the slide in flight is cancelled: where it lands
    const after = before === null ? null : findAnchor()?.getBoundingClientRect().left;
    const from =
      before === null || after === undefined || after === null
        ? inFlightOffset - shift / 2
        : before - after;
    // Leaves nothing behind once finished (no fill): a transform left on the
    // page would trap its fixed descendants.
    const timing = { duration, easing };
    const animations = [
      page.animate([{ transform: `translateX(${from}px)` }, { transform: 'none' }], timing),
    ];
    // Started together, with the same timing, the two cancel out on every frame.
    for (const backdrop of page.querySelectorAll<HTMLElement>(PAGE_BACKDROP_SELECTOR)) {
      animations.push(
        backdrop.animate([{ transform: `translateX(${-from}px)` }, { transform: 'none' }], timing),
      );
    }
    animations[0].onfinish = () => {
      if (slide.current === animations) {
        slide.current = [];
      }
    };
    slide.current = animations;
  }, [duration, easing, findAnchor, gapWidth, ready, slideRef]);
  React.useEffect(() => {
    const current = slide;
    return () => {
      for (const animation of current.current) {
        animation.cancel();
      }
    };
  }, []);

  return <BeforePinCommit pinned={pinned} onBeforeCommit={measureBeforePin} />;
}
