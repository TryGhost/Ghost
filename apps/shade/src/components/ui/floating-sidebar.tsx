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
 *   the content
 *
 * The icon is one element throughout: filling the circle while closed, it
 * shrinks and glides into its place in the header row as the circle opens.
 *
 * Use it inside a SidebarProvider in place of `Sidebar`, with the usual menu
 * primitives (SidebarGroup, SidebarMenu…) in the body. It is a desktop
 * component; render the `Sidebar` sheet on mobile.
 *
 * It only moves itself and its gap, which changes width at once as it pins and
 * unpins. Content that should glide to its new place, or keep clear of the
 * closed circle, does so itself with the metrics and timing exported below
 * (`FLOATING_SIDEBAR_INSET`, `getFloatingSidebarGapWidth`,
 * `getFloatingSidebarTiming`…), driven by the same `pinned` it passes in.
 */

/**
 * Capsule morph: a gentle overshoot so it grows a touch past size and settles
 * back (about 2.8% past its target, ~7px as the circle opens to the panel's
 * width). Its width, radius and shadow take it; its height eases in without
 * overshoot, as the body unfurls.
 */
export const FLOATING_SIDEBAR_BUMP = 'cubic-bezier(0.34, 1.29, 0.5, 1)';
/** Body unfurl, capsule height and content slide: a decelerating ease without overshoot. */
export const FLOATING_SIDEBAR_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
/** How long the capsule morphs and the content slides, in milliseconds. */
export const FLOATING_SIDEBAR_DURATION = 520;
/** The plain morph (`morphStyle="ease"`): an ease-out without overshoot, for the capsule and the content slide alike. */
export const FLOATING_SIDEBAR_EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';
/** How long the plain morph takes, in milliseconds. */
export const FLOATING_SIDEBAR_EASE_DURATION = 450;

/** How the capsule morphs between states; see `morphStyle`. */
type FloatingSidebarMorphStyle = 'bump' | 'ease';

interface FloatingSidebarTiming {
  /** How long the morph takes, in milliseconds. */
  duration: number;
  /**
   * What moves with the capsule: its height, the icon, and content sliding in
   * step with a pin change. A decelerating ease without overshoot.
   */
  easing: string;
  /** The capsule's own shape (width, radius, shadow): the bump overshoots. */
  shapeEasing: string;
}

/**
 * The timing of a morph in `morphStyle`, for content that animates in step
 * with the capsule as it pins and unpins.
 */
export function getFloatingSidebarTiming(
  morphStyle: FloatingSidebarMorphStyle = 'bump',
): FloatingSidebarTiming {
  return morphStyle === 'ease'
    ? {
        duration: FLOATING_SIDEBAR_EASE_DURATION,
        easing: FLOATING_SIDEBAR_EASE,
        shapeEasing: FLOATING_SIDEBAR_EASE,
      }
    : {
        duration: FLOATING_SIDEBAR_DURATION,
        easing: FLOATING_SIDEBAR_SPRING,
        shapeEasing: FLOATING_SIDEBAR_BUMP,
      };
}

/**
 * The capsule's distance from the viewport's top and left edges, and the gap
 * between the pinned panel and the content, in pixels.
 */
export const FLOATING_SIDEBAR_INSET = 16;
/** The closed circle's outer diameter, its 1px border included, in pixels. */
export const FLOATING_SIDEBAR_CLOSED_SIZE = 50;
/**
 * The room the closed circle takes from the content's top-left corner (inset +
 * diameter + inset), for content to keep clear of it while unpinned.
 */
export const FLOATING_SIDEBAR_CLOSED_FOOTPRINT =
  FLOATING_SIDEBAR_INSET + FLOATING_SIDEBAR_CLOSED_SIZE + FLOATING_SIDEBAR_INSET;
/** The open and pinned panel's default width (`openWidth`), in pixels. */
export const FLOATING_SIDEBAR_OPEN_WIDTH = 290;

/**
 * The width of the gap that offsets the content beside the sidebar: the pinned
 * panel and the inset either side of it, or 0 unless pinned.
 */
export function getFloatingSidebarGapWidth(
  pinned: boolean,
  openWidth: number = FLOATING_SIDEBAR_OPEN_WIDTH,
): number {
  return pinned ? FLOATING_SIDEBAR_INSET + openWidth + FLOATING_SIDEBAR_INSET : 0;
}

const UNFURL_DURATION = '450ms';
// Forgiving, so a pointer drifting off the panel doesn't close it.
const CLOSE_DELAY = 400;
// How long the pointer stays still to count as at rest (see `armHoverOnRest`).
const REST_DELAY = 100;
// After the morph's duration, when it's taken as finished though no
// transitionend came (e.g. a height that didn't change)
const MORPH_END_GRACE = 100;
const INSET = FLOATING_SIDEBAR_INSET;
const CLOSED_SIZE = FLOATING_SIDEBAR_CLOSED_SIZE;
const OPEN_RADIUS = 6;
// Below this width the open header row tightens to match smaller page titles.
const NARROW_QUERY = '(max-width: 1379px)';
/**
 * The closed circle is `CLOSED_SIZE` across: its visible diameter inside a 1px
 * border (a light outline that all but disappears on a light page).
 *
 * - circleIcon: the icon centred in it, cropped round, a little larger than
 *   the header row's icon
 * - icon: the icon in the open and pinned header row, which is `padding`
 *   around it, as tall as it is from the panel's top and left
 * - gap: between the header row's icon and the header beside it
 */
const SIZES = {
  regular: { circleIcon: 32, icon: 28, gap: 10 },
  narrow: { circleIcon: 32, icon: 24, gap: 8 },
};
// Around the header row's icon, and the body's side padding, so the search
// field and nav rows line up with the icon.
const PADDING = 20;
const PIN_BUTTON_SIZE = 28;
// Puts the pin glyph PADDING from the panel's right edge.
const PIN_BUTTON_RIGHT = 14;
/*
 * The capsule floats within the viewport, less any chrome framing the page
 * around it: `--floating-sidebar-offset-top`, `-left` and `-bottom` (0 unless
 * set on an ancestor) move its corner and shorten its panel by that much.
 */
const OFFSET_TOP = 'var(--floating-sidebar-offset-top, 0px)';
const OFFSET_LEFT = 'var(--floating-sidebar-offset-left, 0px)';
const OFFSET_BOTTOM = 'var(--floating-sidebar-offset-bottom, 0px)';
// Pinned, and the most it grows to open.
const PANEL_HEIGHT = `calc(100vh - ${OFFSET_TOP} - ${OFFSET_BOTTOM} - ${INSET * 2}px)`;

/** Frosted body: a faint tint so the capsule reads as a surface, a light-catching outline and a backdrop blur. */
const GLASS = 'border border-border-glass bg-surface-glass backdrop-blur-md backdrop-saturate-150';

/** Floating: inset highlights, a hairline outline and a layered drop shadow. */
const SHADOW_FLOAT = 'var(--shadow-glass-floating)';

/** Pinned: only a 1px outline; the other layers fade out so the panel reads as anchored. */
const SHADOW_PINNED = 'var(--shadow-glass-docked)';

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

/**
 * Reads the capsule's height just before React applies a pin change to the
 * DOM, which by the time layout effects run is gone. Renders nothing.
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

/** Specular sheen: a top-edge highlight that fades quickly so the body stays translucent. */
function GlassHighlight() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ borderRadius: 'inherit', background: 'var(--surface-glass-highlight)' }}
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
   * How the capsule morphs: `bump` (the default) grows a touch past size and
   * settles back; `ease` moves on a plain ease-out, without overshoot (e.g.
   * for a pin the screen makes, sequenced with other motion). It applies to
   * the transitions that start while it's set, so keep it until
   * `onPinnedMorphEnd`. Content moving in step takes the same timing from
   * `getFloatingSidebarTiming`.
   */
  morphStyle?: FloatingSidebarMorphStyle;
  /**
   * Called with the new `pinned` state once the capsule has finished morphing
   * to it (at once without transitions); not if `pinned` changes again first.
   */
  onPinnedMorphEnd?: (pinned: boolean) => void;
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
   * Hovering doesn't open the panel until the pointer first comes to rest,
   * for a sidebar that reappears under a pointer on its way somewhere (e.g.
   * back from a full-screen screen); resting over it then opens it. Read as
   * it mounts.
   */
  armHoverOnRest?: boolean;
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
      morphStyle = 'bump',
      onPinnedMorphEnd,
      icon,
      label,
      header,
      children,
      bodyClassName,
      openWidth = FLOATING_SIDEBAR_OPEN_WIDTH,
      disabled = false,
      animate = true,
      hotZone = true,
      armHoverOnRest = false,
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
    const headerHeight = PADDING + sizes.icon + PADDING;
    // Moves the icon from its place in the header row to the circle's centre
    const closedIconOffset = (CLOSED_SIZE - 2 - sizes.circleIcon) / 2 - PADDING;

    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const capsuleRef = React.useRef<HTMLDivElement>(null);
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
        // Still over the capsule, though its mouseleave said otherwise (e.g.
        // it morphed under the pointer): it closes once the pointer leaves it.
        if (wrapper?.matches(':hover')) {
          hover.current.capsule = true;
          hover.current.any = true;
          return;
        }
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
    // With `armHoverOnRest`, the pointer passes over it freely until it stops
    const [waitsForRest] = React.useState(armHoverOnRest);
    const waitingForRest = React.useRef(waitsForRest);
    const restTimer = React.useRef<number | undefined>(undefined);
    const updateHover = React.useCallback(
      (parts: Partial<Record<'capsule' | 'zone', boolean>>) => {
        const state = hover.current;
        Object.assign(state, parts);
        const any = state.capsule || state.zone;
        if (waitingForRest.current) {
          return;
        }
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
    // content beneath it still scrolls and responds to the pointer. The
    // pointer's moves also keep the capsule's hover true to where it is: its
    // mouseenter and mouseleave can be missed or misfire as it morphs under a
    // pointer (e.g. landing open from pinned), and the panel mustn't close
    // while the pointer is over it.
    React.useEffect(() => {
      if (disabled) {
        return;
      }
      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === 'touch') {
          return;
        }
        const target = event.target instanceof Element ? event.target : null;
        // Popups opened from the panel (in portals) keep the capsule's hover as it was
        const overOverlay = Boolean(target?.closest(OVERLAY_SELECTOR));
        const parts: Partial<Record<'capsule' | 'zone', boolean>> = {};
        if (!overOverlay && target) {
          parts.capsule = Boolean(wrapperRef.current?.contains(target));
        }
        if (hotZone) {
          parts.zone = !overOverlay && event.clientX < hotZoneWidth(window.innerWidth);
        }
        updateHover(parts);
        if (waitingForRest.current) {
          window.clearTimeout(restTimer.current);
          restTimer.current = window.setTimeout(() => {
            waitingForRest.current = false;
            hoverArmed.current = true;
            const state = hover.current;
            state.any = state.capsule || state.zone;
            if (state.any) {
              show();
            }
          }, REST_DELAY);
        }
      };
      const onPointerLeave = () => updateHover({ capsule: false, zone: false });
      document.addEventListener('pointermove', onPointerMove);
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
      return () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.documentElement.removeEventListener('pointerleave', onPointerLeave);
        window.clearTimeout(restTimer.current);
        hover.current.zone = false;
      };
    }, [disabled, hotZone, show, updateHover]);

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
    // lay the content out again on every frame. Content that should glide to
    // its new place slides itself, in step with the morph (see
    // `getFloatingSidebarTiming`).
    const gapWidth = getFloatingSidebarGapWidth(pinned, openWidth);

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
    // The capsule's shape, and what moves with it (its height, the icon)
    const {
      duration: morphDuration,
      easing: glideEasing,
      shapeEasing,
    } = getFloatingSidebarTiming(morphStyle);
    // The capsule's transitions: its height glides rather than bumps, as the
    // body it holds unfurls without overshoot (a bump on a panel this tall
    // would overshoot by tens of pixels)
    const capsuleTransitions: Array<[property: string, easing: string]> = morph
      ? [
          ['width', shapeEasing],
          ['height', glideEasing],
          ['border-radius', shapeEasing],
          ['box-shadow', shapeEasing],
        ]
      : [];

    // Reports the end of the morph a pin change starts: the capsule's height
    // transition ending, or its duration passing without one.
    const onPinnedMorphEndRef = React.useRef(onPinnedMorphEnd);
    React.useLayoutEffect(() => {
      onPinnedMorphEndRef.current = onPinnedMorphEnd;
    });
    const pendingMorph = React.useRef<{ pinned: boolean; timer: number } | null>(null);
    const finishMorph = React.useCallback(() => {
      const pending = pendingMorph.current;
      if (!pending) {
        return;
      }
      window.clearTimeout(pending.timer);
      pendingMorph.current = null;
      onPinnedMorphEndRef.current?.(pending.pinned);
    }, []);
    const previousPinned = React.useRef(pinned);
    React.useLayoutEffect(() => {
      if (previousPinned.current === pinned) {
        return;
      }
      previousPinned.current = pinned;
      window.clearTimeout(pendingMorph.current?.timer);
      pendingMorph.current = null;
      if (!morph) {
        onPinnedMorphEndRef.current?.(pinned);
        return;
      }
      const timer = window.setTimeout(finishMorph, morphDuration + MORPH_END_GRACE);
      pendingMorph.current = { pinned, timer };
    }, [finishMorph, morph, morphDuration, pinned]);
    React.useEffect(() => () => window.clearTimeout(pendingMorph.current?.timer), []);

    // Floating open, the body scrolls once it has unfurled (a panel taller
    // than the viewport); while unfurling it's clipped.
    const [unfurled, setUnfurled] = React.useState(expanded);
    React.useEffect(() => {
      if (pinned || !expanded || !morph) {
        setUnfurled(expanded);
      }
    }, [expanded, morph, pinned]);

    // The floating open capsule's height (`auto`) on screen before the pin change
    const heightBefore = React.useRef<number | null>(null);
    const measureBeforePin = React.useCallback(() => {
      const capsule = capsuleRef.current;
      heightBefore.current =
        capsule?.style.height === 'auto' ? capsule.getBoundingClientRect().height : null;
    }, []);

    // Pinning the floating open panel, its height transitions from `auto`,
    // which interpolate-size resolves anew on every frame: should the body's
    // content grow meanwhile (e.g. another navigation rendered into it), the
    // start would leap past the pinned height and the capsule jump to it. It
    // starts from the height it had on screen instead.
    const capsuleTransitionsRef = React.useRef(capsuleTransitions);
    React.useLayoutEffect(() => {
      capsuleTransitionsRef.current = capsuleTransitions;
    });
    React.useLayoutEffect(() => {
      const from = heightBefore.current;
      heightBefore.current = null;
      const capsule = capsuleRef.current;
      const transitions = capsuleTransitionsRef.current;
      if (from === null || !capsule || !transitions.length) {
        return;
      }
      const { height, transitionProperty, transitionTimingFunction } = capsule.style;
      const others = transitions.filter(([property]) => property !== 'height');
      capsule.style.transitionProperty = others.map(([property]) => property).join(', ');
      capsule.style.transitionTimingFunction = others.map(([, easing]) => easing).join(', ');
      capsule.style.height = `${from}px`;
      // Lands the start height without a transition, the others starting theirs
      void getComputedStyle(capsule).height;
      capsule.style.transitionProperty = transitionProperty;
      capsule.style.transitionTimingFunction = transitionTimingFunction;
      capsule.style.height = height;
    }, [pinned]);

    // The body fills the pinned capsule, and keeps filling it while it shrinks
    // after unpinning, so the footer rides its bottom edge rather than jumping
    // up; by the end the capsule hugs the body, so letting go doesn't show.
    const [filled, setFilled] = React.useState(pinned);
    React.useEffect(() => {
      if (pinned || !morph) {
        setFilled(pinned);
        return;
      }
      const timer = window.setTimeout(() => setFilled(false), morphDuration);
      return () => window.clearTimeout(timer);
    }, [morph, morphDuration, pinned]);

    const state = pinned ? 'pinned' : open ? 'open' : 'closed';

    return (
      <div ref={ref} className="shrink-0 text-foreground" data-state={state} role="navigation">
        {/* Offsets the content while pinned */}
        <div aria-hidden="true" className="h-full" data-sidebar="gap" style={{ width: gapWidth }} />
        <BeforePinCommit pinned={pinned} onBeforeCommit={measureBeforePin} />
        {/* The capsule plus, while floating open, a hover buffer to its right */}
        <div
          ref={wrapperRef}
          className={cn('fixed z-40 flex items-stretch', className)}
          style={{
            top: `calc(${OFFSET_TOP} + ${INSET}px)`,
            left: `calc(${OFFSET_LEFT} + ${INSET}px)`,
            ...style,
          }}
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
            updateHover({ capsule: true });
          }}
          onMouseLeave={(event) => {
            onMouseLeave?.(event);
            updateHover({ capsule: false });
          }}
          {...props}
        >
          <div
            ref={capsuleRef}
            className={cn(
              'relative flex shrink-0 flex-col overflow-hidden [interpolate-size:allow-keywords]',
              GLASS,
            )}
            data-sidebar="sidebar"
            data-slot="floating-sidebar"
            data-state={state}
            style={{
              width: expanded ? openWidth : CLOSED_SIZE,
              // Open, `auto` (not undefined) so interpolate-size can transition it
              height: pinned ? PANEL_HEIGHT : expanded ? 'auto' : CLOSED_SIZE,
              maxHeight: PANEL_HEIGHT,
              // The width's bump dips a little below the circle as it closes;
              // it mustn't squeeze it, clipping the icon
              minWidth: CLOSED_SIZE,
              borderRadius: expanded ? OPEN_RADIUS : CLOSED_SIZE / 2,
              boxShadow: pinned ? SHADOW_PINNED : SHADOW_FLOAT,
              transitionProperty: morph
                ? capsuleTransitions.map(([property]) => property).join(', ')
                : 'none',
              transitionDuration: `${morphDuration}ms`,
              transitionTimingFunction: capsuleTransitions.map(([, easing]) => easing).join(', '),
            }}
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget && event.propertyName === 'height') {
                finishMorph();
              }
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
                    transitionDuration: `${morphDuration}ms`,
                    transitionTimingFunction: glideEasing,
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
                  'absolute z-10 flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-[opacity,color,background-color] duration-200 hover:bg-interactive-hover hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden',
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
export type { FloatingSidebarMorphStyle, FloatingSidebarProps, FloatingSidebarTiming };
