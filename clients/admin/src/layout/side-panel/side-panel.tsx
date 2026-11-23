import React from 'react';
import { FLOATING_SIDEBAR_INSET, getFloatingSidebarTiming } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import { PANEL_CONTENT_PADDING } from './side-panel-layout';
import { type SidePanelSize, sidePanelStore } from './side-panel-store';
import { useSidePanel } from './use-side-panel';

// The panel opens, closes and resizes as the Admin 7 navigation pins and
// unpins, on the easing the page slides beside it with (`ease-emphasized`).
// The navigation's overshoot isn't taken: docked, the panel's width moves the
// page, which would wobble.
const { duration: MOTION_DURATION, easing: MOTION_EASING } = getFloatingSidebarTiming();
// MOTION_DURATION as a class, which Tailwind can't read from a constant
const MOTION_DURATION_CLASS = 'duration-[520ms]';

// The window expands and collapses faster, as it grows in two directions from
// its corner, and on the navigation's plain ease-out: the emphasized easing
// does most of its moving at once, which over this distance reads as a lurch.
const WINDOW_RESIZE_DURATION = 160;
const WINDOW_RESIZE_EASING = getFloatingSidebarTiming('ease').easing;

// Docked, the panel's default width is set by the layout (see sidePanelWidth).
// Expanded, it stops `--side-panel-full-clear` short of the window's left edge.
const DEFAULT_WIDTH = 'w-(--side-panel-width)';
const FULL_WIDTH = 'w-[calc(100%-var(--side-panel-full-clear))]';
// In the Admin 7 frame the bezel beside the page is the card's margin, inside
// the panel's width, so the card keeps its corners and its distance from the
// page until it has closed
const FRAMED_DEFAULT_WIDTH = 'w-[calc(var(--side-panel-width)_+_var(--admin-frame-side))]';

// Below the docking width the panel is a window over the page's bottom-right
// corner, held off the frame's edges (none in classic Admin) as far as the
// Admin 7 navigation is on the page's other side, with its corners.
const WINDOW_WIDTH = 440;
const WINDOW_HEIGHT = 680;
const WINDOW_RADIUS_CLASS = 'rounded-[6px]';
const WINDOW_SIDE = `calc(var(--admin-frame-side, 0px) + ${FLOATING_SIDEBAR_INSET}px)`;
const WINDOW_TOP = `calc(var(--admin-frame-top, 0px) + ${FLOATING_SIDEBAR_INSET}px)`;
const WINDOW_FULL_HEIGHT = `calc(100vh - ${WINDOW_TOP} - ${WINDOW_SIDE})`;

// Minimized, the panel is a bar in the window's corner, which its content
// fills: the content draws the bar and asks to be restored. It's offered only
// as a window, and shrinks into the bar from it. A bar stays one on a window
// widened past the docking width, and swaps for the docked panel at once.
const MINIMIZED_WIDTH = 320;
const MINIMIZED_HEIGHT = 56;
const MINIMIZE_DURATION = 160;
const MINIMIZE_EASING = WINDOW_RESIZE_EASING;

const FLOATING_SIZE: Record<SidePanelSize, { width: string; height: string }> = {
  default: {
    width: `${WINDOW_WIDTH}px`,
    height: `min(${WINDOW_HEIGHT}px, ${WINDOW_FULL_HEIGHT})`,
  },
  // Expanded, its left edge is `--side-panel-float-clear` in from the frame's
  full: {
    width: `calc(100vw - var(--side-panel-float-clear) - var(--admin-frame-side, 0px) - ${WINDOW_SIDE})`,
    height: WINDOW_FULL_HEIGHT,
  },
  minimized: {
    width: `${MINIMIZED_WIDTH}px`,
    height: `${MINIMIZED_HEIGHT}px`,
  },
};

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

interface SidePanelProps {
  /** False hides open content without closing it. */
  visible: boolean;
  framed: boolean;
  /** Beside the page, which gets narrower, or a window over it (see useSidePanelDocked). */
  docked: boolean;
  /** Makes the panel inert, as the navigation and page are while the unpaid-subscription takeover shows. */
  locked: boolean;
  /** Moves focus somewhere sensible when closing, if what had focus before opening has gone. */
  onReturnFocusLost?: () => void;
}

export function SidePanel({ visible, framed, docked, locked, onReturnFocusLost }: SidePanelProps) {
  const { state, close } = useSidePanel();
  const shown = visible && state.open;
  const minimized = state.size === 'minimized';
  // Over the page, as a window or the minimized bar, rather than beside it
  const floating = !docked || minimized;
  const floatingSize = floating ? FLOATING_SIZE[state.size] : null;
  const regionRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    sidePanelStore.setAvailable(visible);
  }, [visible]);

  React.useLayoutEffect(() => {
    sidePanelStore.setMinimizable(!docked);
  }, [docked]);

  // The panel animates when it's opened, closed or resized, and not when a
  // route hides or shows it. A screen change has a transition of its own, and
  // the page beside the panel would otherwise be laid out again on every
  // frame of the panel's: the editor opens at its full width, as it does with
  // the panel closed. Reading the width while transitions are off settles it
  // there, so none starts once they're back on.
  const lastVisible = React.useRef(visible);
  React.useLayoutEffect(() => {
    const region = regionRef.current;
    if (!region || lastVisible.current === visible) {
      return;
    }
    lastVisible.current = visible;
    region.style.transition = 'none';
    void region.offsetWidth;
    region.style.transition = '';
  }, [visible]);

  // The panel's size follows the window's. Left on while the window is being
  // resized, its transitions trail behind content already at its new size,
  // which shows cropped and then jumps, so the panel follows it directly.
  React.useEffect(() => {
    const region = regionRef.current;
    if (!region) {
      return;
    }
    let settled: number | undefined;
    const onResize = () => {
      region.style.transition = 'none';
      window.clearTimeout(settled);
      settled = window.setTimeout(() => {
        region.style.transition = '';
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(settled);
      region.style.transition = '';
    };
  }, []);

  // The content doesn't follow the panel's edge as it expands or collapses,
  // which would lay it out again on every frame: it takes its new size at
  // once, against the right edge, and stays out of sight while the panel does
  // most of its moving, fading in as it settles.
  const lastSize = React.useRef(state.size);
  React.useLayoutEffect(() => {
    const region = regionRef.current;
    const content = contentRef.current;
    if (!region || !content || lastSize.current === state.size) {
      return;
    }
    const previousSize = lastSize.current;
    lastSize.current = state.size;
    if (!shown || prefersReducedMotion()) {
      return;
    }
    const toOrFromBar = previousSize === 'minimized' || minimized;
    let duration = MOTION_DURATION;
    let easing = '';
    if (toOrFromBar) {
      duration = MINIMIZE_DURATION;
      easing = MINIMIZE_EASING;
    } else if (!docked) {
      duration = WINDOW_RESIZE_DURATION;
      easing = WINDOW_RESIZE_EASING;
    }
    if (docked && toOrFromBar) {
      // Between beside the page and over it there's nothing to animate from,
      // so the panel takes its new place at once and the content fades in
      region.style.transition = 'none';
      void region.offsetWidth;
      region.style.transition = '';
    } else {
      // Before anything reads the panel's styles, which starts its transition
      region.style.transitionDuration = `${duration}ms`;
      region.style.transitionTimingFunction = easing;
    }
    // Floating, the content is sized in its styles
    if (docked && state.size === 'full') {
      // The width the panel is growing to: the row it's in, less what it
      // stops short of and the bezel beside it
      const style = getComputedStyle(region);
      const width =
        (region.parentElement?.clientWidth ?? 0) -
        parseFloat(style.getPropertyValue('--side-panel-full-clear')) -
        (framed ? parseFloat(style.getPropertyValue('--admin-frame-side')) || 0 : 0);
      if (width > 0) {
        content.style.width = `${width}px`;
      }
    }
    const fade =
      typeof content.animate === 'function'
        ? content.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], {
            duration,
            easing: 'ease-out',
          })
        : null;
    const settle = () => {
      region.style.transitionDuration = '';
      region.style.transitionTimingFunction = '';
      content.style.width = '';
    };
    const timer = window.setTimeout(settle, duration + 50);
    return () => {
      window.clearTimeout(timer);
      settle();
      fade?.cancel();
    };
  }, [state.size, shown, docked, framed, minimized]);

  // Docked, the content slides in and out with the panel, by as much as the
  // panel has narrowed, so the two move as one.
  const lastOpen = React.useRef(state.open);
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || lastOpen.current === state.open) {
      return;
    }
    lastOpen.current = state.open;
    if (floating || !visible || typeof content.animate !== 'function' || prefersReducedMotion()) {
      return;
    }
    const bezel = framed
      ? parseFloat(getComputedStyle(content).getPropertyValue('--admin-frame-side')) || 0
      : 0;
    const width = content.offsetWidth;
    if (!state.open) {
      // Expanded, the content is as wide as the panel, so it would narrow with
      // it as well as slide. Held at its width, it only slides.
      content.style.width = `${width}px`;
    }
    const away = `translateX(${width + bezel}px)`;
    const slide = content.animate(
      state.open
        ? [{ transform: away }, { transform: 'translateX(0)' }]
        : [{ transform: 'translateX(0)' }, { transform: away }],
      // Held once it has left, until the panel has closed over it
      { duration: MOTION_DURATION, easing: MOTION_EASING, fill: 'forwards' },
    );
    return () => {
      slide.cancel();
      content.style.width = '';
    };
  }, [state.open, floating, visible, framed]);

  // The layout can swap this panel for a new one, e.g. when the Admin 7 frame
  // appears once the Labs config loads. This cleanup has to run before the new
  // panel marks itself available, or the panel stays unavailable. Layout effect
  // cleanups run before new layout effects, but a useEffect cleanup runs after.
  React.useLayoutEffect(
    () => () => {
      sidePanelStore.setAvailable(false);
      sidePanelStore.reset();
    },
    [],
  );

  // The content is a node from outside React. Moving a node in the DOM can reset
  // it (an iframe reloads, for one), so it's only inserted when it changes.
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }
    if (!state.element) {
      content.replaceChildren();
    } else if (content.firstChild !== state.element) {
      content.replaceChildren(state.element);
    }
  }, [state.element]);

  // The content takes focus itself if it wants it. Closing returns focus to
  // where it was before opening, as the content it was in is hidden, or, if
  // that has gone with a screen change, wherever the layout sends it.
  const returnFocusRef = React.useRef<Element | null>(null);
  React.useLayoutEffect(() => {
    const region = regionRef.current;
    if (!region || !state.element) {
      return;
    }
    if (state.open) {
      if (!region.contains(document.activeElement)) {
        returnFocusRef.current = document.activeElement;
      }
      return;
    }
    const returnFocus = returnFocusRef.current;
    returnFocusRef.current = null;
    const focusWasWithin =
      region.contains(document.activeElement) || document.activeElement === document.body;
    if (!focusWasWithin || !(returnFocus instanceof HTMLElement)) {
      return;
    }
    if (returnFocus.isConnected) {
      returnFocus.focus({ preventScroll: true });
    } else {
      onReturnFocusLost?.();
    }
  }, [state.open, state.element, onReturnFocusLost]);

  // Minimized, the panel is tucked away, so an Escape meant for the page leaves it be
  React.useEffect(() => {
    if (!shown || locked || minimized) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      // Radix marks the Escape that dismissed a dialog or menu
      if (event.key === 'Escape' && !event.defaultPrevented) {
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shown, locked, minimized, close]);

  // Applied through a ref because React 18 has no first-class inert prop.
  React.useLayoutEffect(() => {
    if (regionRef.current) {
      regionRef.current.inert = locked;
    }
  }, [locked]);

  return (
    // No role or name: the content brings its own semantics. Docked, as a
    // window and as the bar, the panel has the same nesting, so moving between
    // them keeps the content.
    <div
      ref={regionRef}
      className={cn(
        'flex overflow-hidden ease-emphasized motion-reduce:transition-none',
        MOTION_DURATION_CLASS,
        !floating
          ? cn(
              'h-full shrink-0',
              !framed && 'bg-background',
              // Visible as soon as it opens, so it can take focus, and hidden once it has closed
              shown
                ? cn(
                    'transition-[width]',
                    state.size === 'full' &&
                      cn(
                        FULL_WIDTH,
                        // Default width under an app's overlay, so some of the app's page shows
                        framed
                          ? '[html[data-app-overlay]_&]:w-[calc(var(--side-panel-width)_+_var(--admin-frame-side))]'
                          : '[html[data-app-overlay]_&]:w-(--side-panel-width)',
                      ),
                    state.size === 'default' && (framed ? FRAMED_DEFAULT_WIDTH : DEFAULT_WIDTH),
                    !framed && 'border-l border-border',
                  )
                : 'invisible w-0 transition-[width,visibility]',
            )
          : cn(
              'fixed z-30 origin-bottom-right bg-background shadow-xl ring-1 ring-border',
              '[html[data-app-overlay]_&]:invisible',
              WINDOW_RADIUS_CLASS,
              // It grows from its corner as it opens, and goes at once as it closes,
              // as the bar does: shrinking into the corner would read as minimizing
              shown
                ? 'transition-[width,height,opacity,scale]'
                : 'pointer-events-none invisible scale-[0.3] opacity-0 transition-none',
            ),
      )}
      data-side-panel={shown ? state.size : 'closed'}
      data-side-panel-layout={docked ? 'docked' : 'window'}
      style={
        floatingSize
          ? ({
              right: WINDOW_SIDE,
              bottom: WINDOW_SIDE,
              ...floatingSize,
              // The content's size, as variables rather than set on the
              // content, which the resize effect clears as it settles
              '--side-panel-content-width': floatingSize.width,
              '--side-panel-content-height': floatingSize.height,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className={cn(
          'flex h-full min-w-0 flex-1 justify-end',
          floating && 'items-end',
          !floating &&
            framed &&
            'ml-(--admin-frame-side) overflow-hidden rounded-(--admin-frame-radius) bg-background dark:ring-1 dark:ring-border-glass dark:ring-inset',
        )}
      >
        {/* At the size it's heading for while the panel animates, so the content doesn't reflow,
            and against the corner where it ends up as the panel opens, closes or resizes */}
        <div
          ref={contentRef}
          className={cn(
            'shrink-0 *:size-full',
            floating && 'h-(--side-panel-content-height) w-(--side-panel-content-width)',
            !floating && cn('h-full', state.size === 'full' ? 'w-full' : DEFAULT_WIDTH),
          )}
          style={{ padding: minimized ? 0 : PANEL_CONTENT_PADDING }}
        />
      </div>
    </div>
  );
}
