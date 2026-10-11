import React from 'react';
import { cn } from '@tryghost/shade/utils';
import {
  ADMIN_FRAME_TOP_BAR_HEIGHT,
  ADMIN_FRAME_TRANSITION,
  AdminFramePanelSlotContext,
} from './admin-frame-panel-slot';

/**
 * How much of the frame shows:
 * - full: the top bar, a bezel down the sides and along the bottom, and the
 *   page in a rounded card inside them
 * - site: only the top bar, over a square, edge-to-edge page (View site)
 * - customize: as full, with View site's Customize panel down the right,
 *   under the top bar, uncovered as the page card pulls away from it
 * - hidden: none of it, for full-screen screens (the editor); the top bar
 *   slides up out of view
 * - off: none of it, without animating (below the desktop breakpoint)
 */
export type AdminFrameMode = 'full' | 'site' | 'customize' | 'hidden' | 'off';

const BEZEL = 10;
const CARD_RADIUS = 10;
/** The width of the panel on the frame's right in customize mode. */
const ADMIN_FRAME_PANEL_WIDTH = 340;

/*
 * When a full-screen screen's top chrome starts in, after the frame starts
 * closing: the frame's ease is front-loaded, so the top bar is mostly out of
 * its way by then.
 */
const TOP_CHROME_ENTRANCE_DELAY = 200;

const FRAME_VARIABLES = [
  '--admin-frame-top',
  '--admin-frame-side',
  '--admin-frame-right',
  '--admin-frame-radius',
];

function frameInsets(mode: AdminFrameMode) {
  const bezels = mode === 'full' || mode === 'customize';
  const side = bezels ? BEZEL : 0;
  return {
    top: bezels || mode === 'site' ? ADMIN_FRAME_TOP_BAR_HEIGHT : 0,
    side,
    right: mode === 'customize' ? ADMIN_FRAME_PANEL_WIDTH + BEZEL : side,
    radius: bezels ? CARD_RADIUS : 0,
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
  const { top, side, right, radius } = frameInsets(mode);
  const topBarRef = React.useRef<HTMLDivElement>(null);
  const [panelSlot, setPanelSlot] = React.useState<HTMLElement | null>(null);

  // Applied through a ref because React 18 has no first-class inert prop.
  // Closed around a full-screen surface, the top bar is out of sight, so out
  // of reach too.
  const topBarInert = locked || mode === 'hidden';
  React.useLayoutEffect(() => {
    if (topBarRef.current) {
      topBarRef.current.inert = topBarInert;
    }
  }, [topBarInert]);

  return (
    <div
      className="relative flex size-full flex-col bg-black motion-reduce:transition-none!"
      data-admin-frame={mode}
      style={
        {
          '--admin-frame-top': `${top}px`,
          '--admin-frame-side': `${side}px`,
          '--admin-frame-right': `${right}px`,
          '--admin-frame-radius': `${radius}px`,
          '--floating-sidebar-offset-top': 'var(--admin-frame-top)',
          '--floating-sidebar-offset-left': 'var(--admin-frame-side)',
          '--floating-sidebar-offset-bottom': 'var(--admin-frame-side)',
          // A full-screen screen's top chrome enters as the top bar leaves
          '--screen-enter-top-delay':
            mode === 'hidden' ? `${TOP_CHROME_ENTRANCE_DELAY}ms` : undefined,
          padding:
            'var(--admin-frame-top) var(--admin-frame-right) var(--admin-frame-side) var(--admin-frame-side)',
          transitionProperty: mode === 'off' ? 'none' : FRAME_VARIABLES.join(', '),
          transitionDuration: `${ADMIN_FRAME_TRANSITION.duration}ms`,
          transitionTimingFunction: ADMIN_FRAME_TRANSITION.easing,
        } as React.CSSProperties
      }
    >
      {mode !== 'off' && (
        // Under the top bar, and first, so the card covers it until it pulls away
        <div
          ref={setPanelSlot}
          className="absolute right-0 bottom-0 isolate flex"
          data-admin-frame-panel-slot=""
          style={{ top: 'var(--admin-frame-top)', width: ADMIN_FRAME_PANEL_WIDTH }}
        />
      )}
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
          (mode === 'full' || mode === 'customize') && 'dark:ring-1 dark:ring-border-glass',
        )}
        style={{ borderRadius: 'var(--admin-frame-radius)' }}
      >
        <AdminFramePanelSlotContext.Provider value={panelSlot}>
          {children}
        </AdminFramePanelSlotContext.Provider>
      </div>
    </div>
  );
}
