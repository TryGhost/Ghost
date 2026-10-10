import React from 'react';

/*
 * The floating sidebar's body, which swaps the main navigation for the
 * Settings navigation and back. The capsule's header stays put; in the body,
 * the outgoing rows leave together (to the left going in to Settings, to the
 * right coming back) while the incoming rows swipe in one after another from
 * the other side.
 *
 * The two navigations share one grid cell at the body's fixed width, so
 * neither reflows: the one that's away is hidden at once, and a copy of it,
 * taken just before the commit that swaps them, plays its exit over the top.
 * The Settings navigation is rendered by Settings itself, portalled into the
 * slot here, and unmounts as Settings is left, so the copy is all there is of
 * it by then.
 *
 * The swap plays at once, alongside whatever the capsule does meanwhile (e.g.
 * growing to full height from the closed circle, which clips the incoming
 * rows until it has opened up around them).
 */

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
const ROW_SELECTOR =
  '[data-sidebar=header], [data-sidebar=menu-item], [data-sidebar=footer], [data-nav-row]';
const GHOST_ATTRIBUTE = 'data-sidebar-body-ghost';
const OUT_DURATION = 260;
const OUT_TRAVEL = 48;
// Of the exit's eased progress
const OUT_FADE_END = 0.6;
const IN_DURATION = 300;
const IN_TRAVEL = 24;
// After the outgoing rows have begun to fade; at once when none are leaving
const IN_DELAY = 40;
const IN_STAGGER = 18;
const IN_MAX_DELAY = 300;
const REDUCED_DURATION = 150;
// Settings' navigation can render a little after the swap (its code loads
// separately); how long the incoming rows are waited for.
const MAX_ROW_WAIT = 1000;
// Below this the capsule is the closed circle (or nearly): its body isn't on
// screen, so nothing leaves.
const OPEN_WIDTH_THRESHOLD = 200;

interface SwapSnapshot {
  /** A copy of the outgoing navigation; null while it wasn't on screen. */
  ghost: HTMLElement | null;
  /** The outgoing navigation's opacity. */
  opacity: number;
  scrollOffsets: Array<[number, number]>;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** The capsule around the body is the closed circle (or nearly): the body isn't on screen. */
function capsuleClosed(element: Element): boolean {
  const capsule = element.closest('[data-slot=floating-sidebar]');
  return (capsule?.getBoundingClientRect().width ?? 0) < OPEN_WIDTH_THRESHOLD;
}

/** The rows of a navigation that animate, skipping rows nested in another. */
function topLevelRows(pane: Element): HTMLElement[] {
  return Array.from(pane.querySelectorAll<HTMLElement>(ROW_SELECTOR)).filter((row) => {
    const parentRow = row.parentElement?.closest(ROW_SELECTOR);
    return !parentRow || !pane.contains(parentRow);
  });
}

interface BodySwapTransitionProps {
  /** The Settings navigation is showing (the swap has played, or is playing). */
  settings: boolean;
  mainRef: React.RefObject<HTMLElement>;
  settingsRef: React.RefObject<HTMLElement>;
}

/** Plays the swap as `settings` changes. Renders nothing. */
class BodySwapTransition extends React.Component<BodySwapTransitionProps> {
  private animations: Animation[] = [];
  private ghost: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private timer: number | undefined;

  getSnapshotBeforeUpdate(previous: Readonly<BodySwapTransitionProps>): SwapSnapshot | null {
    if (previous.settings === this.props.settings) {
      return null;
    }
    const outgoing = (previous.settings ? previous.settingsRef : previous.mainRef).current;
    if (!outgoing) {
      return null;
    }
    const opacity = Number(getComputedStyle(outgoing).opacity);
    if (capsuleClosed(outgoing) || !(opacity > 0)) {
      return { ghost: null, opacity: 0, scrollOffsets: [] };
    }

    const ghost = outgoing.cloneNode(true) as HTMLElement;
    const scrollOffsets: Array<[number, number]> = [];
    outgoing.querySelectorAll('*').forEach((element, index) => {
      if (element.scrollTop > 0) {
        scrollOffsets.push([index, element.scrollTop]);
      }
    });
    return { ghost, opacity, scrollOffsets };
  }

  componentDidUpdate(
    _previous: Readonly<BodySwapTransitionProps>,
    _state: unknown,
    snapshot: SwapSnapshot | null,
  ) {
    if (!snapshot) {
      return;
    }
    // Interrupting a swap in flight: its exit and entrances give way to this one
    this.stop();
    const incoming = (this.props.settings ? this.props.settingsRef : this.props.mainRef).current;
    if (!incoming || typeof incoming.animate !== 'function') {
      return;
    }
    const reduceMotion = prefersReducedMotion();
    // Out to the left going in to Settings, the new rows in from the right
    const direction = this.props.settings ? -1 : 1;
    if (snapshot.ghost) {
      this.playOut(incoming, snapshot.ghost, snapshot, direction, reduceMotion);
    }
    this.playIn(incoming, direction, reduceMotion, snapshot.ghost ? IN_DELAY : 0);
  }

  componentWillUnmount() {
    this.stop();
  }

  private playOut(
    incoming: HTMLElement,
    ghost: HTMLElement,
    snapshot: { opacity: number; scrollOffsets: Array<[number, number]> },
    direction: number,
    reduceMotion: boolean,
  ) {
    ghost.setAttribute(GHOST_ATTRIBUTE, '');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    // Over the pane it copies, which shares the incoming pane's grid cell
    ghost.style.cssText = 'position:absolute;inset:0;z-index:20;pointer-events:none;';
    incoming.parentElement?.append(ghost);
    this.ghost = ghost;

    // Restored once in the document, where the copies can scroll
    const copies = ghost.querySelectorAll('*');
    for (const [index, scrollTop] of snapshot.scrollOffsets) {
      const copy = copies[index];
      if (copy) {
        copy.scrollTop = scrollTop;
      }
    }
    ghost.querySelectorAll('[id], [data-testid]').forEach((element) => {
      element.removeAttribute('id');
      element.removeAttribute('data-testid');
    });

    const opacity = Math.min(1, snapshot.opacity);
    const animation = ghost.animate(
      reduceMotion
        ? [{ opacity }, { opacity: 0 }]
        : [
            { opacity, transform: 'none' },
            // Gone before the incoming rows have much opacity, so the two
            // don't show through each other; it keeps travelling regardless
            { opacity: 0, offset: OUT_FADE_END },
            { opacity: 0, transform: `translateX(${OUT_TRAVEL * direction}px)` },
          ],
      {
        duration: reduceMotion ? REDUCED_DURATION : OUT_DURATION,
        easing: EASE_DRAWER,
        fill: 'forwards',
      },
    );
    this.animations.push(animation);
    void animation.finished
      .then(() => {
        if (this.ghost === ghost) {
          ghost.remove();
          this.ghost = null;
        }
      })
      .catch(() => {});
  }

  private playIn(incoming: HTMLElement, direction: number, reduceMotion: boolean, delay: number) {
    // Applied as soon as the rows are in the DOM (here, before the swap's
    // first paint, or in the observer's microtask once Settings renders its
    // navigation), so they never show before their entrance.
    const animateRows = () => {
      const rows = topLevelRows(incoming);
      if (rows.length === 0) {
        return false;
      }
      rows.forEach((row, index) => {
        this.animations.push(
          row.animate(
            reduceMotion
              ? [{ opacity: 0 }, { opacity: 1 }]
              : [
                  { opacity: 0, transform: `translateX(${-IN_TRAVEL * direction}px)` },
                  { opacity: 1, transform: 'none' },
                ],
            reduceMotion
              ? { duration: REDUCED_DURATION, easing: 'ease-out', fill: 'backwards' }
              : {
                  duration: IN_DURATION,
                  delay: Math.min(delay + index * IN_STAGGER, IN_MAX_DELAY),
                  easing: EASE_OUT,
                  fill: 'backwards',
                },
          ),
        );
      });
      return true;
    };

    if (animateRows()) {
      return;
    }
    const observer = new MutationObserver(() => {
      if (animateRows()) {
        this.stopWaiting();
      }
    });
    observer.observe(incoming, { childList: true, subtree: true });
    this.observer = observer;
    this.timer = window.setTimeout(() => this.stopWaiting(), MAX_ROW_WAIT);
  }

  private stopWaiting() {
    this.observer?.disconnect();
    this.observer = null;
    window.clearTimeout(this.timer);
    this.timer = undefined;
  }

  private stop() {
    this.stopWaiting();
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
    this.ghost?.remove();
    this.ghost = null;
  }

  render() {
    return null;
  }
}

const HIDDEN_PANE: React.CSSProperties = { opacity: 0, pointerEvents: 'none' };

interface SidebarBodySwapProps {
  /** Shows the Settings navigation in place of the main navigation. */
  settings: boolean;
  /** Receives the element the Settings navigation renders into. */
  settingsSlotRef?: (element: HTMLElement | null) => void;
  /** The main navigation. */
  children: React.ReactNode;
}

export function SidebarBodySwap({ settings, settingsSlotRef, children }: SidebarBodySwapProps) {
  const mainRef = React.useRef<HTMLDivElement>(null);
  const settingsRef = React.useRef<HTMLDivElement>(null);

  // The navigation that's away is hidden and out of reach (its copy plays the
  // exit). Hidden with opacity rather than visibility, which its rows (menu
  // buttons transition `all`) would inherit through a transition, lingering.
  React.useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.inert = settings;
    }
    if (settingsRef.current) {
      settingsRef.current.inert = !settings;
    }
  }, [settings]);

  return (
    // Spans the body's padding, so the rows travel out to the capsule's edges
    // (which clip them) and the Settings navigation scrolls to its bottom edge.
    <div className="relative -mx-5 -mb-4 grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)]">
      <div
        ref={mainRef}
        aria-hidden={settings || undefined}
        className="col-start-1 row-start-1 flex min-h-0 flex-col px-5 pb-4"
        style={settings ? HIDDEN_PANE : undefined}
      >
        {children}
      </div>
      <div
        ref={settingsRef}
        aria-hidden={!settings || undefined}
        className="col-start-1 row-start-1 flex min-h-0 flex-col"
        style={settings ? undefined : HIDDEN_PANE}
      >
        <div ref={settingsSlotRef} className="flex min-h-0 flex-1 flex-col" />
      </div>
      <BodySwapTransition mainRef={mainRef} settings={settings} settingsRef={settingsRef} />
    </div>
  );
}
