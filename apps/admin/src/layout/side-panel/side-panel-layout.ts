import { useSyncExternalStore } from 'react';

/**
 * From this window width the panel docks beside the page, which gets narrower.
 * On a narrower window it floats over the page's bottom-right corner instead.
 */
const DOCK_MIN_WIDTH = 1600;

/** The docked panel's width, and the room around its content (see SidePanel). */
const PANEL_WIDTH = 400;
export const PANEL_CONTENT_PADDING = 8;
/**
 * The widest the docked panel grows: its content's frame stays narrower than
 * 640px, where the Help app switches to a wider layout of its own.
 */
const PANEL_MAX_WIDTH = 639 + 2 * PANEL_CONTENT_PADDING;
/** The widest a page gets: its 1280px content column and a 40px gutter either side. */
const PAGE_FULL_WIDTH = 1360;

/**
 * The docked panel's width, as CSS. A window wider than the navigation, a
 * full-width page and the panel leaves room beside the page, which the panel
 * takes. `frameSides` is the Admin 7 frame's bezels beside the page and the
 * panel, in px.
 */
export function sidePanelWidth(frameSides: number): string {
  const spare = `calc(100vw - var(--side-panel-navigation-width) - ${PAGE_FULL_WIDTH + frameSides}px)`;
  return `clamp(${PANEL_WIDTH}px, ${spare}, ${PANEL_MAX_WIDTH}px)`;
}

const hasRoomToDock = () => window.innerWidth >= DOCK_MIN_WIDTH;

const subscribeToResize = (onChange: () => void) => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};

/** Whether the window is wide enough for the panel to dock beside the page. */
export function useSidePanelDocked(): boolean {
  return useSyncExternalStore(subscribeToResize, hasRoomToDock);
}
