import * as React from 'react';
import { Pin } from 'lucide-react';

import { cn } from '@/lib/utils';

/*
 * A floating "liquid glass" sidebar: one capsule that morphs between three
 * states.
 *
 * - closed: a circle around an icon (e.g. the site icon)
 * - open: hovering the circle, the left-edge hot zone, focusing or clicking it
 *   grows the circle into a panel floating over the content, the header
 *   fading in beside the icon and the body unfurling beneath it
 * - pinned: the panel is docked at full height and a gap beside it offsets
 *   the content, which slides to its new place (see `contentRef`)
 *
 * The icon is one element throughout: filling the circle while closed, it
 * shrinks and glides into its place in the header row as the circle opens.
 *
 * Use it inside a SidebarProvider in place of `Sidebar`, with the usual menu
 * primitives (SidebarGroup, SidebarMenu…) in the body. It is a desktop
 * component; render the `Sidebar` sheet on mobile.
 */

/** Capsule morph: a gentle overshoot so it grows a touch past size and settles back. */
export const FLOATING_SIDEBAR_BUMP = 'cubic-bezier(0.34, 1.45, 0.5, 1)';
/** Body unfurl and content slide: a decelerating ease without overshoot. */
export const FLOATING_SIDEBAR_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
/** How long the capsule morphs and the content slides, in milliseconds. */
export const FLOATING_SIDEBAR_DURATION = 520;

const MORPH_DURATION = `${FLOATING_SIDEBAR_DURATION}ms`;
const UNFURL_DURATION = '450ms';
// Forgiving, so a pointer drifting off the panel doesn't close it.
const CLOSE_DELAY = 250;
// Distance from the viewport's top and left edges, and the gap between the
// pinned panel and the content.
const INSET = 16;
const DEFAULT_OPEN_WIDTH = 290;
const OPEN_RADIUS = 6;
// Below this width the open header row tightens to match smaller page titles.
const NARROW_QUERY = '(max-width: 1379px)';
/**
 * - circle: the closed circle's visible diameter, inside its 1px border (a
 *   light outline that all but disappears on a light page)
 * - circleIcon: the icon centred in it, cropped round, a little larger than
 *   the header row's icon
 * - icon: the icon in the open and pinned header row, which is `padding`
 *   around it, as tall as it is from the panel's top and left
 * - gap: between the header row's icon and the header beside it
 */
const SIZES = {
  regular: { circle: 48, circleIcon: 32, icon: 28, gap: 10 },
  narrow: { circle: 48, circleIcon: 32, icon: 24, gap: 8 },
};
// Around the header row's icon, and the body's side padding, so the search
// field and nav rows line up with the icon.
const PADDING = 20;
const PIN_BUTTON_SIZE = 28;
// Puts the pin glyph PADDING from the panel's right edge.
const PIN_BUTTON_RIGHT = 14;
// Pinned, and the most it grows to open.
const PANEL_HEIGHT = `calc(100vh - ${INSET * 2}px)`;

/** Frosted body: a faint tint so the capsule reads as a surface, a light-catching outline and a backdrop blur. */
const GLASS =
  'border border-white/70 bg-[rgba(248,248,248,0.5)] backdrop-blur-md backdrop-saturate-150 dark:border-white/10 dark:bg-[rgba(32,32,34,0.55)]';

/** Floating: inset highlights, a hairline outline and a layered drop shadow. Six layers, matching the pinned shadow 1:1 so the two interpolate. */
const SHADOW_FLOAT =
  'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,255,255,0.12), 0 0 0 0.5px rgba(0,0,0,0.06), 0 40px 60px -15px rgba(0,0,0,0.18), 0 12px 24px -8px rgba(0,0,0,0.1), 0 3px 8px rgba(0,0,0,0.04)';

/** Pinned: only a 1px outline; the other layers fade out so the panel reads as anchored. */
const SHADOW_PINNED =
  'inset 0 1px 0 rgba(255,255,255,0), inset 0 -1px 0 rgba(255,255,255,0), 0 0 0 1px rgba(0,0,0,0.06), 0 8px 24px -10px rgba(0,0,0,0), 0 4px 12px -4px rgba(0,0,0,0), 0 2px 6px rgba(0,0,0,0)';

// Popups opened from the panel render in portals: the panel stays open under
// them, and the hot zone ignores the pointer over them.
const POPUP_TRIGGER_SELECTOR = '[aria-haspopup][aria-expanded=true]';
const OVERLAY_SELECTOR =
  '[role=dialog], [role=alertdialog], [role=menu], [role=listbox], [data-radix-popper-content-wrapper]';

/** The left-edge strip that opens the panel: the page gutter beside centred content, within limits. */
function hotZoneWidth(viewportWidth: number): number {
  return Math.min(160, Math.max(40, (viewportWidth - 1280) / 2 + 40));
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(
    () => typeof window !== 'undefined' && (window.matchMedia?.(query).matches ?? false),
  );

  React.useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) {
      return;
    }
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** The horizontal offset an animation in flight has moved an element by. */
function translateX(element: HTMLElement): number {
  const { transform } = getComputedStyle(element);
  return transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).m41 : 0;
}

/**
 * Reads the content's position just before React applies a pin change to the
 * DOM: the "first" of the content slide, which by the time layout effects run
 * is gone. Renders nothing.
 */
class BeforePinCommit extends React.Component<{ gapWidth: number; onBeforeCommit: () => void }> {
  getSnapshotBeforeUpdate(previous: Readonly<{ gapWidth: number }>) {
    if (previous.gapWidth !== this.props.gapWidth) {
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

/** Specular sheen: a top-edge highlight that fades quickly so the body stays translucent. */
function GlassHighlight() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 dark:opacity-30"
      style={{
        borderRadius: 'inherit',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 18%, rgba(255,255,255,0) 85%, rgba(255,255,255,0.06) 100%)',
      }}
    />
  );
}

interface FloatingSidebarProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Docked beside the content, rather than a circle that opens over it. */
  pinned: boolean;
  /** Shows the pin button when provided. */
  onPinnedChange?: (pinned: boolean) => void;
  /**
   * Pinned by the screen rather than by the user (e.g. a screen whose
   * navigation lives in the sidebar): the pin button fades out, keeping its
   * place so the header doesn't reflow.
   */
  pinLocked?: boolean;
  /**
   * The content beside the sidebar, offset by the gap while pinned (e.g. the
   * SidebarInset). Pinning and unpinning move the gap at once and slide the
   * content from its old place with a transform, so it lays out once rather
   * than on every frame (see `contentAnchor`).
   *
   * The closed circle's footprint is set on it as CSS variables, so the
   * content can keep clear of the circle while unpinned:
   * `--floating-sidebar-inset` (its distance from the viewport's top and left
   * edges), `--floating-sidebar-size` (its outer diameter, border included) and
   * `--floating-sidebar-footprint` (inset + diameter + inset). The gap's
   * current width is set too, as `--floating-sidebar-gap` (0 unless pinned),
   * so the content can reach back beneath the pinned panel.
   */
  contentRef?: React.RefObject<HTMLElement>;
  /**
   * The element that slides, when not `contentRef` itself: e.g. the page inside
   * a scrolling content element, so the scrollport (which clips) holds still
   * and content reaching beneath the panel never shows an edge.
   */
  slideRef?: React.RefObject<HTMLElement>;
  /**
   * A selector for the element in the content whose left edge the slide keeps
   * continuous (e.g. the centred page column): it glides from where it was to
   * where it lands, however its padding changes. Without a match the content
   * slides by half the gap's change, which suits content centred beside it.
   */
  contentAnchor?: string;
  /**
   * A selector for elements in the sliding content that hold still while it
   * slides (e.g. a full-bleed backdrop spanning the viewport in both states):
   * they're slid back by as much as the content slides. They mustn't have a
   * transform of their own.
   */
  contentStatic?: string;
  /** Centred in the closed circle, and kept in place as it grows (e.g. the site icon). */
  icon: React.ReactNode;
  /** The circle's accessible name (e.g. the site title). */
  label: string;
  /** Beside the icon in the open and pinned panel's header row (e.g. the site title); hidden while closed. */
  header: React.ReactNode;
  /** Unfurls beneath the header when open or pinned. */
  children: React.ReactNode;
  bodyClassName?: string;
  /** The open and pinned panel's width. */
  openWidth?: number;
  /** Stops the panel opening (and closes it), e.g. while the page is locked. */
  disabled?: boolean;
  /**
   * Enables transitions. Leave it false until the pinned state has loaded, so
   * a stored state lands without morphing. Transitions also wait a frame after
   * mounting.
   */
  animate?: boolean;
  /** Opens the panel when the pointer enters the left edge of the screen. */
  hotZone?: boolean;
  /**
   * Changing it (e.g. to the route's path) cancels a pending close: a layout
   * shift inside the panel can fire a mouseleave though the pointer never left.
   */
  resetKey?: unknown;
  pinLabel?: string;
  unpinLabel?: string;
}

/**
 * The outer element (forwarded ref) holds the gap that offsets the content
 * while pinned; `className` and other props land on the fixed wrapper around
 * the capsule, like Shade's `Sidebar`.
 */
const FloatingSidebar = React.forwardRef<HTMLDivElement, FloatingSidebarProps>(
  (
    {
      pinned,
      onPinnedChange,
      pinLocked = false,
      contentRef,
      slideRef,
      contentAnchor,
      contentStatic,
      icon,
      label,
      header,
      children,
      bodyClassName,
      openWidth = DEFAULT_OPEN_WIDTH,
      disabled = false,
      animate = true,
      hotZone = true,
      resetKey,
      pinLabel = 'Pin sidebar',
      unpinLabel = 'Unpin sidebar',
      className,
      style,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const narrow = useMediaQuery(NARROW_QUERY);
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const sizes = narrow ? SIZES.narrow : SIZES.regular;
    // The closed capsule, border included
    const closedSize = sizes.circle + 2;
    const headerHeight = PADDING + sizes.icon + PADDING;
    // Moves the icon from its place in the header row to the circle's centre
    const closedIconOffset = (sizes.circle - sizes.circleIcon) / 2 - PADDING;

    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const headerRef = React.useRef<HTMLDivElement>(null);
    const bodyRef = React.useRef<HTMLDivElement>(null);
    const pinButtonRef = React.useRef<HTMLButtonElement>(null);

    // Hover intent: opens at once, closes after a delay so the pointer can
    // travel between the hot zone and the panel.
    const [open, setOpen] = React.useState(false);
    const closeTimer = React.useRef<number | undefined>(undefined);
    const cancel = React.useCallback(() => {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }, []);
    const show = React.useCallback(() => {
      cancel();
      if (!disabled) {
        setOpen(true);
      }
    }, [cancel, disabled]);
    const hide = React.useCallback(() => {
      cancel();
      setOpen(false);
    }, [cancel]);
    const scheduleClose = React.useCallback(() => {
      cancel();
      const tryClose = () => {
        const wrapper = wrapperRef.current;
        if (wrapper?.querySelector(POPUP_TRIGGER_SELECTOR)) {
          closeTimer.current = window.setTimeout(tryClose, CLOSE_DELAY);
          return;
        }
        closeTimer.current = undefined;
        // Keyboard users close it by tabbing out or with Escape.
        const active = document.activeElement;
        if (active && wrapper?.contains(active) && active.matches(':focus-visible')) {
          return;
        }
        setOpen(false);
      };
      closeTimer.current = window.setTimeout(tryClose, CLOSE_DELAY);
    }, [cancel]);

    React.useEffect(() => cancel, [cancel]);
    React.useEffect(() => {
      if (disabled) {
        hide();
      }
    }, [disabled, hide]);
    React.useEffect(() => {
      cancel();
    }, [resetKey, cancel]);

    // The capsule and the hot zone act as one hover target. It only arms once
    // the pointer has been outside it: the sidebar can appear under a resting
    // pointer (e.g. back from the editor, whose close button sits where the
    // circle is), and that shouldn't open it.
    const hover = React.useRef({ capsule: false, zone: false, any: false });
    const hoverArmed = React.useRef(false);
    const updateHover = React.useCallback(
      (part: 'capsule' | 'zone', value: boolean) => {
        const state = hover.current;
        state[part] = value;
        const any = state.capsule || state.zone;
        if (!hoverArmed.current) {
          hoverArmed.current = !any;
          return;
        }
        if (any === state.any) {
          return;
        }
        state.any = any;
        if (any) {
          show();
        } else {
          scheduleClose();
        }
      },
      [scheduleClose, show],
    );

    // The hot zone tracks the pointer rather than covering the page, so the
    // content beneath it still scrolls and responds to the pointer.
    React.useEffect(() => {
      if (!hotZone || disabled) {
        return;
      }
      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === 'touch') {
          return;
        }
        const overOverlay =
          event.target instanceof Element && Boolean(event.target.closest(OVERLAY_SELECTOR));
        updateHover('zone', !overOverlay && event.clientX < hotZoneWidth(window.innerWidth));
      };
      const onPointerLeave = () => updateHover('zone', false);
      document.addEventListener('pointermove', onPointerMove);
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
      return () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.documentElement.removeEventListener('pointerleave', onPointerLeave);
        hover.current.zone = false;
      };
    }, [disabled, hotZone, updateHover]);

    // Escape closes the floating panel, returning focus to the circle.
    const restoringFocus = React.useRef(false);
    React.useEffect(() => {
      if (!open || pinned) {
        return;
      }
      const onKeyDown = (event: KeyboardEvent) => {
        const wrapper = wrapperRef.current;
        if (
          event.key !== 'Escape' ||
          event.defaultPrevented ||
          wrapper?.querySelector(POPUP_TRIGGER_SELECTOR)
        ) {
          return;
        }
        const focusWasWithin = Boolean(wrapper?.contains(document.activeElement));
        hide();
        if (focusWasWithin) {
          restoringFocus.current = true;
          triggerRef.current?.focus();
          restoringFocus.current = false;
        }
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }, [hide, open, pinned]);

    // Pinned, the panel is always open; `open` alone shows the pin button.
    const expanded = open || pinned;

    // The header, pin button and body are clipped away while closed, so they
    // must not be reachable; the circle itself takes focus. A locked pin
    // button is hidden in every state.
    React.useLayoutEffect(() => {
      for (const element of [headerRef.current, bodyRef.current]) {
        if (element) {
          element.inert = !expanded;
        }
      }
      if (pinButtonRef.current) {
        pinButtonRef.current.inert = !expanded || pinLocked;
      }
    }, [expanded, pinLocked]);

    // The gap changes width at once, never through a transition: that would
    // lay the content out again on every frame. The content slides instead,
    // from where it was (or had got to, mid-slide) to its new place.
    const gapWidth = pinned ? INSET + openWidth + INSET : 0;

    // The circle's footprint, for the content to keep clear of it, and the
    // gap, for content reaching beneath the pinned panel. Set before the slide
    // below measures where the content lands.
    React.useLayoutEffect(() => {
      const content = contentRef?.current;
      if (!content) {
        return;
      }
      const footprint = {
        '--floating-sidebar-inset': `${INSET}px`,
        '--floating-sidebar-size': `${closedSize}px`,
        '--floating-sidebar-footprint': `${INSET + closedSize + INSET}px`,
        '--floating-sidebar-gap': `${gapWidth}px`,
      };
      for (const [name, value] of Object.entries(footprint)) {
        content.style.setProperty(name, value);
      }
      return () => {
        for (const name of Object.keys(footprint)) {
          content.style.removeProperty(name);
        }
      };
    }, [contentRef, closedSize, gapWidth]);

    // Transitions start a frame after mounting (and after `animate`), so the
    // first paint and a stored pinned state never morph.
    const [ready, setReady] = React.useState(false);
    React.useEffect(() => {
      if (!animate) {
        setReady(false);
        return;
      }
      const frame = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(frame);
    }, [animate]);
    const morph = ready && !reducedMotion;

    // Floating open, the body scrolls once it has unfurled (a panel taller
    // than the viewport); while unfurling it's clipped.
    const [unfurled, setUnfurled] = React.useState(expanded);
    React.useEffect(() => {
      if (pinned || !expanded || !morph) {
        setUnfurled(expanded);
      }
    }, [expanded, morph, pinned]);

    const previousGapWidth = React.useRef(gapWidth);
    // The content's slide, then the counter-slides holding its static parts still
    const slide = React.useRef<Animation[]>([]);
    // The anchor's left edge on screen before the pin change, mid-slide included
    const anchorBefore = React.useRef<number | null>(null);
    const findAnchor = React.useCallback(
      () => (contentAnchor ? (contentRef?.current?.querySelector(contentAnchor) ?? null) : null),
      [contentAnchor, contentRef],
    );
    const measureBeforePin = React.useCallback(() => {
      anchorBefore.current = findAnchor()?.getBoundingClientRect().left ?? null;
    }, [findAnchor]);
    React.useLayoutEffect(() => {
      const shift = gapWidth - previousGapWidth.current;
      previousGapWidth.current = gapWidth;
      const before = anchorBefore.current;
      anchorBefore.current = null;
      const content = slideRef?.current ?? contentRef?.current;
      if (!shift || !content) {
        return;
      }
      const inFlight = slide.current;
      const inFlightOffset = inFlight.length ? translateX(content) : 0;
      for (const animation of inFlight) {
        animation.cancel();
      }
      slide.current = [];
      if (!morph || typeof content.animate !== 'function') {
        return;
      }
      // Measured once the slide in flight is cancelled: where it lands
      const after = before === null ? null : findAnchor()?.getBoundingClientRect().left;
      const from =
        before === null || after === undefined || after === null
          ? inFlightOffset - shift / 2
          : before - after;
      // Leaves nothing behind once finished (no fill): a transform left on the
      // content would trap its fixed descendants.
      const timing = { duration: FLOATING_SIDEBAR_DURATION, easing: FLOATING_SIDEBAR_SPRING };
      const animations = [
        content.animate([{ transform: `translateX(${from}px)` }, { transform: 'none' }], timing),
      ];
      // Started together, with the same timing, the two cancel out on every frame.
      if (contentStatic) {
        for (const element of content.querySelectorAll<HTMLElement>(contentStatic)) {
          animations.push(
            element.animate(
              [{ transform: `translateX(${-from}px)` }, { transform: 'none' }],
              timing,
            ),
          );
        }
      }
      animations[0].onfinish = () => {
        if (slide.current === animations) {
          slide.current = [];
        }
      };
      slide.current = animations;
    }, [contentRef, contentStatic, findAnchor, gapWidth, morph, slideRef]);
    React.useEffect(() => {
      const current = slide;
      return () => {
        for (const animation of current.current) {
          animation.cancel();
        }
      };
    }, []);

    // The body fills the pinned capsule, and keeps filling it while it shrinks
    // after unpinning, so the footer rides its bottom edge rather than jumping
    // up; by the end the capsule hugs the body, so letting go doesn't show.
    const [filled, setFilled] = React.useState(pinned);
    React.useEffect(() => {
      if (pinned || !morph) {
        setFilled(pinned);
        return;
      }
      const timer = window.setTimeout(() => setFilled(false), FLOATING_SIDEBAR_DURATION);
      return () => window.clearTimeout(timer);
    }, [morph, pinned]);

    const state = pinned ? 'pinned' : open ? 'open' : 'closed';

    return (
      <div ref={ref} className="shrink-0 text-foreground" data-state={state} role="navigation">
        {/* Offsets the content while pinned */}
        <div aria-hidden="true" className="h-full" data-sidebar="gap" style={{ width: gapWidth }} />
        <BeforePinCommit gapWidth={gapWidth} onBeforeCommit={measureBeforePin} />
        {/* The capsule plus, while floating open, a hover buffer to its right */}
        <div
          ref={wrapperRef}
          className={cn('fixed z-40 flex items-stretch', className)}
          style={{ top: INSET, left: INSET, ...style }}
          onBlur={(event) => {
            onBlur?.(event);
            const next = event.relatedTarget;
            if (
              open &&
              next instanceof Node &&
              !event.currentTarget.contains(next) &&
              !wrapperRef.current?.querySelector(POPUP_TRIGGER_SELECTOR)
            ) {
              hide();
            }
          }}
          onFocus={(event) => {
            onFocus?.(event);
            if (!restoringFocus.current && event.target.matches(':focus-visible')) {
              show();
            }
          }}
          onMouseEnter={(event) => {
            onMouseEnter?.(event);
            updateHover('capsule', true);
          }}
          onMouseLeave={(event) => {
            onMouseLeave?.(event);
            updateHover('capsule', false);
          }}
          {...props}
        >
          <div
            className={cn(
              'relative flex shrink-0 flex-col overflow-hidden [interpolate-size:allow-keywords]',
              GLASS,
            )}
            data-sidebar="sidebar"
            data-slot="floating-sidebar"
            data-state={state}
            style={{
              width: expanded ? openWidth : closedSize,
              // Open, `auto` (not undefined) so interpolate-size can transition it
              height: pinned ? PANEL_HEIGHT : expanded ? 'auto' : closedSize,
              maxHeight: PANEL_HEIGHT,
              // The bump's undershoot mustn't squeeze the circle as it closes,
              // clipping the icon
              minWidth: closedSize,
              minHeight: closedSize,
              borderRadius: expanded ? OPEN_RADIUS : closedSize / 2,
              boxShadow: pinned ? SHADOW_PINNED : SHADOW_FLOAT,
              transitionProperty: morph ? 'width, height, border-radius, box-shadow' : 'none',
              transitionDuration: MORPH_DURATION,
              transitionTimingFunction: FLOATING_SIDEBAR_BUMP,
            }}
          >
            <GlassHighlight />

            {/* Laid out open in every state (the closed capsule clips it), so
                the morph never reflows it */}
            <div
              className="flex shrink-0 items-center"
              data-slot="floating-sidebar-header"
              style={{
                width: openWidth - 2,
                height: headerHeight,
                gap: sizes.gap,
                paddingLeft: PADDING,
                paddingRight: onPinnedChange
                  ? PIN_BUTTON_RIGHT + PIN_BUTTON_SIZE + sizes.gap
                  : PADDING,
              }}
            >
              {/* The circle's focus target: focusing or clicking it opens the
                  panel. Pinned, it's only the icon. It holds the icon's place
                  in the row. */}
              <button
                ref={triggerRef}
                aria-expanded={pinned ? undefined : open}
                aria-hidden={pinned || undefined}
                aria-label={label}
                className={cn(
                  'group relative shrink-0 outline-none',
                  pinned ? 'cursor-default' : 'cursor-pointer',
                )}
                data-slot="floating-sidebar-trigger"
                style={{ width: sizes.icon, height: sizes.icon }}
                tabIndex={pinned ? -1 : 0}
                type="button"
                onClick={show}
              >
                {/* The icon at its closed size (crisp where it rests longest),
                    scaled down into the row while open; closed, moved to the
                    circle's centre and cropped round */}
                <span
                  className="absolute top-0 left-0 overflow-hidden group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-focus-ring group-focus-visible:outline-solid [&>*]:size-full [&>*]:object-cover"
                  data-slot="floating-sidebar-icon"
                  style={{
                    width: sizes.circleIcon,
                    height: sizes.circleIcon,
                    transformOrigin: '0 0',
                    // From the row's icon place to the circle's centre, in the
                    // header row's coordinates (it starts inside the border)
                    transform: expanded
                      ? `translate(0px, 0px) scale(${sizes.icon / sizes.circleIcon})`
                      : `translate(${closedIconOffset}px, ${closedIconOffset}px) scale(1)`,
                    borderRadius: expanded ? '22%' : '50%',
                    transitionProperty: morph ? 'transform, border-radius' : 'none',
                    transitionDuration: MORPH_DURATION,
                    transitionTimingFunction: FLOATING_SIDEBAR_SPRING,
                  }}
                >
                  {icon}
                </span>
              </button>
              {/* Fades and slides in as the capsule grows, out as it shrinks */}
              <div
                ref={headerRef}
                className="flex min-w-0 flex-1 items-center gap-2"
                style={{
                  opacity: expanded ? 1 : 0,
                  transform: expanded ? 'none' : 'translateX(-8px)',
                  transitionProperty: morph ? 'opacity, transform' : 'none',
                  transitionDuration: expanded ? '320ms' : '160ms',
                  transitionDelay: expanded ? '90ms' : '0ms',
                  transitionTimingFunction: FLOATING_SIDEBAR_SPRING,
                }}
              >
                {header}
              </div>
            </div>

            {/* Anchored to the capsule, so it tracks the right edge as the width animates */}
            {onPinnedChange && (
              <button
                ref={pinButtonRef}
                aria-hidden={pinLocked || undefined}
                aria-label={pinned ? unpinLabel : pinLabel}
                className={cn(
                  'absolute z-10 flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-[opacity,color,background-color] duration-200 hover:bg-black/5 hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden dark:hover:bg-white/10',
                  // Follows the hover state, not pinning, so it hides when the
                  // pointer leaves a pinned panel too
                  open && !pinLocked
                    ? 'pointer-events-auto opacity-100 delay-75'
                    : 'pointer-events-none opacity-0',
                )}
                data-slot="floating-sidebar-pin"
                style={{ top: (headerHeight - PIN_BUTTON_SIZE) / 2, right: PIN_BUTTON_RIGHT }}
                type="button"
                onClick={() => onPinnedChange(!pinned)}
              >
                <Pin
                  className="size-4"
                  strokeWidth={1.75}
                  style={{
                    transform: pinned ? 'rotate(45deg)' : 'rotate(0deg)',
                    transitionProperty: reducedMotion ? 'none' : 'transform',
                    transitionDuration: '300ms',
                    transitionTimingFunction: FLOATING_SIDEBAR_SPRING,
                  }}
                />
              </button>
            )}

            {/* Unfurls through grid rows 0fr → 1fr, whatever the body's
                height. One structure in every state, so pinning and unpinning
                animate it rather than swap its layout. */}
            <div
              ref={bodyRef}
              className={cn('grid min-h-0', filled && 'flex-1')}
              data-slot="floating-sidebar-body"
              style={{
                gridTemplateRows: expanded ? '1fr' : '0fr',
                transitionProperty: morph ? 'grid-template-rows' : 'none',
                transitionDuration: UNFURL_DURATION,
                transitionTimingFunction: FLOATING_SIDEBAR_SPRING,
              }}
              onTransitionEnd={(event) => {
                if (
                  event.target === event.currentTarget &&
                  event.propertyName === 'grid-template-rows'
                ) {
                  setUnfurled(expanded);
                }
              }}
            >
              {/* Filling the capsule, the body scrolls within itself (e.g. a
                  scrolling SidebarContent above a footer) */}
              <div
                className={cn(
                  'min-h-0',
                  filled
                    ? 'flex flex-col overflow-hidden'
                    : unfurled
                      ? 'overflow-y-auto overscroll-contain'
                      : 'overflow-hidden',
                )}
              >
                {/* The open width, so the content doesn't reflow as the capsule grows */}
                <div
                  className={cn(
                    'flex flex-col pt-2 pb-4 transition-opacity duration-200',
                    filled && 'min-h-0 flex-1',
                    expanded ? 'opacity-100 delay-75' : 'opacity-0',
                    bodyClassName,
                  )}
                  style={{ width: openWidth - 2, paddingLeft: PADDING, paddingRight: PADDING }}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>
          {expanded && !pinned && <div aria-hidden="true" className="w-12 shrink-0" />}
        </div>
      </div>
    );
  },
);
FloatingSidebar.displayName = 'FloatingSidebar';

export { FloatingSidebar };
export type { FloatingSidebarProps };
