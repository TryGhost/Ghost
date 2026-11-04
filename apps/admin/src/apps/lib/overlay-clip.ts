import type { SafeArea } from '@tryghost/app-contracts/bridge';

/**
 * Set on `<html>` while an app's overlay shows. Admin's chrome that floats over the app's page,
 * such as the side panel as a window or the minimized bar, hides while it's set, as the overlay
 * would draw over it. Admin 7's unpinned navigation stays: it opens over the page only while the
 * pointer is over it, so under the overlay it's only ever closing, which it does beneath the
 * overlay, as it does beneath Admin's own dialogs.
 */
export const APP_OVERLAY_ATTRIBUTE = 'data-app-overlay';

/** A box in the window, in pixels. */
export interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * The elements around `element` that clip what's inside them, nearest first, such as Admin's
 * card, which clips the app's page as the docked side panel widens over it.
 */
export function clippingAncestors(element: HTMLElement): HTMLElement[] {
  const clips: HTMLElement[] = [];
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent);
    if (overflowX !== 'visible' || overflowY !== 'visible') {
      clips.push(parent);
    }
  }
  return clips;
}

/** How far each corner of the safe area is rounded: only those that are corners of Admin's card. */
export interface Corners {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

/**
 * The overlay frame's `clip-path`: the app's safe area, with the corners that are Admin's card's
 * rounded as the card's are. The frame covers the whole window, so the safe area is in the
 * window's coordinates.
 */
export function overlayClipPath(safeArea: SafeArea, corners: Corners): string {
  const radii = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const rounding = radii.some(Boolean) ? ` round ${radii.map((r) => `${r}px`).join(' ')}` : '';
  return `inset(${safeArea.top}px ${safeArea.right}px ${safeArea.bottom}px ${safeArea.left}px${rounding})`;
}
