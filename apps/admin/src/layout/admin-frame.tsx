import React from 'react';
import { cn } from '@tryghost/shade/utils';

/**
 * How much of the frame shows:
 * - full: the top bar, a bezel down the sides and along the bottom, and the
 *   page in a rounded card inside them
 * - site: only the top bar, over a square, edge-to-edge page (View site)
 * - hidden: none of it, for full-screen screens (the editor); the top bar
 *   slides up out of view
 * - off: none of it, without animating (below the desktop breakpoint)
 */
export type AdminFrameMode = 'full' | 'site' | 'hidden' | 'off';

const ADMIN_FRAME_TOP_BAR_HEIGHT = 44;
const BEZEL = 10;
const CARD_RADIUS = 10;

/** The frame's timing, for motion choreographed with it. */
const ADMIN_FRAME_TRANSITION = {
  duration: 520,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

/*
 * When a full-screen screen's top chrome starts in, after the frame starts
 * closing: the frame's ease is front-loaded, so the top bar is mostly out of
 * its way by then.
 */
const TOP_CHROME_ENTRANCE_DELAY = 200;

const FRAME_VARIABLES = ['--admin-frame-top', '--admin-frame-side', '--admin-frame-radius'];

function frameInsets(mode: AdminFrameMode) {
  return {
    top: mode === 'full' || mode === 'site' ? ADMIN_FRAME_TOP_BAR_HEIGHT : 0,
    side: mode === 'full' ? BEZEL : 0,
    radius: mode === 'full' ? CARD_RADIUS : 0,
  };
}

interface AdminFrameProps {
  mode: AdminFrameMode;
  topBar: React.ReactNode;
  /** Dims the top bar and takes it out of reach (e.g. while the page is locked). */
  locked?: boolean;
  children: React.ReactNode;
}

/*
 * The insets are registered custom properties (see index.css), so they
 * transition as lengths: the padding that makes the bezels, the card's
 * corners, the top bar's slide and the floating sidebar's offset all read
 * them, and move in step.
 */
export function AdminFrame({ mode, topBar, locked = false, children }: AdminFrameProps) {
  const { top, side, radius } = frameInsets(mode);
  const topBarRef = React.useRef<HTMLDivElement>(null);

  // Applied through a ref because React 18 has no first-class inert prop
  React.useLayoutEffect(() => {
    if (topBarRef.current) {
      topBarRef.current.inert = locked;
    }
  }, [locked]);

  return (
    <div
      className="relative flex size-full flex-col bg-black motion-reduce:transition-none!"
      data-admin-frame={mode}
      style={
        {
          '--admin-frame-top': `${top}px`,
          '--admin-frame-side': `${side}px`,
          '--admin-frame-radius': `${radius}px`,
          '--floating-sidebar-offset-top': 'var(--admin-frame-top)',
          '--floating-sidebar-offset-left': 'var(--admin-frame-side)',
          '--floating-sidebar-offset-bottom': 'var(--admin-frame-side)',
          // A full-screen screen's top chrome enters as the top bar leaves
          '--screen-enter-top-delay':
            mode === 'hidden' ? `${TOP_CHROME_ENTRANCE_DELAY}ms` : undefined,
          padding: 'var(--admin-frame-top) var(--admin-frame-side) var(--admin-frame-side)',
          transitionProperty: mode === 'off' ? 'none' : FRAME_VARIABLES.join(', '),
          transitionDuration: `${ADMIN_FRAME_TRANSITION.duration}ms`,
          transitionTimingFunction: ADMIN_FRAME_TRANSITION.easing,
        } as React.CSSProperties
      }
    >
      {mode !== 'off' && (
        <div
          ref={topBarRef}
          className={cn('absolute inset-x-0 top-0 transition-opacity', locked && 'opacity-40')}
          style={{
            height: ADMIN_FRAME_TOP_BAR_HEIGHT,
            // Rides the top inset, so it slides away as the frame closes
            transform: `translateY(calc(var(--admin-frame-top) - ${ADMIN_FRAME_TOP_BAR_HEIGHT}px))`,
          }}
        >
          {topBar}
        </div>
      )}
      <div
        className={cn(
          'relative min-h-0 flex-1 overflow-hidden bg-background',
          // On a dark page the card's edge would melt into the frame
          mode === 'full' && 'dark:ring-1 dark:ring-border-glass',
        )}
        style={{ borderRadius: 'var(--admin-frame-radius)' }}
      >
        {children}
      </div>
    </div>
  );
}
