import type { SafeArea } from '@tryghost/app-contracts/bridge';

/**
 * Set on `<html>` while an app's overlay shows, so Admin's chrome that floats over the app's page
 * hides from beneath it. Admin 7's unpinned navigation needn't: under the overlay it only closes.
 */
export const APP_OVERLAY_ATTRIBUTE = 'data-app-overlay';

/** A box in the window, in pixels. */
export interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The elements around `element` that clip what's inside them, nearest first. */
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

export interface Corners {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

/** The overlay frame's `clip-path`: the safe area, inset from the window, with rounded corners. */
export function overlayClipPath(safeArea: SafeArea, corners: Corners): string {
  const radii = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const rounding = radii.some(Boolean) ? ` round ${radii.map((r) => `${r}px`).join(' ')}` : '';
  return `inset(${safeArea.top}px ${safeArea.right}px ${safeArea.bottom}px ${safeArea.left}px${rounding})`;
}
