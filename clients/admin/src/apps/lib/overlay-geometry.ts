import type { SafeArea } from '@tryghost/app-contracts/bridge';

/** A box in the window, in pixels. */
export interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Admin's card, which clips the app's page. */
export type Card = Box & { radius: number };

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

/** The part of `element` that shows, inside every ancestor that clips it. */
function visibleBox(element: HTMLElement, clips: HTMLElement[]) {
  let { top, right, bottom, left } = element.getBoundingClientRect();
  for (const clip of clips) {
    const box = clip.getBoundingClientRect();
    top = Math.max(top, box.top);
    right = Math.min(right, box.right);
    bottom = Math.min(bottom, box.bottom);
    left = Math.max(left, box.left);
  }
  return { top, right, bottom, left };
}

/**
 * The page's safe area as insets from the window's edges, for the overlay frame, which fills the
 * window. It leaves out what Admin's card clips of the page. Only the page's left and bottom
 * insets carry over: the top and right follow the canvas's visible edges.
 */
export function overlaySafeArea(
  canvas: HTMLElement,
  clips: HTMLElement[],
  pageSafeArea: Pick<SafeArea, 'left' | 'bottom'>,
): SafeArea {
  const box = canvas.getBoundingClientRect();
  const visible = visibleBox(canvas, clips);
  // Without scrollbars, as the overlay frame fills it.
  const { clientWidth, clientHeight } = document.documentElement;
  // Right to the card's edge, as Admin's own sheets go, past the space that centres the page.
  return {
    top: Math.max(0, Math.ceil(visible.top)),
    right: Math.max(0, Math.ceil(clientWidth - visible.right)),
    bottom: Math.max(
      0,
      Math.ceil(clientHeight - Math.min(visible.bottom, box.bottom - pageSafeArea.bottom)),
    ),
    left: Math.max(0, Math.ceil(Math.max(visible.left, box.left + pageSafeArea.left))),
  };
}

const cornerRadius = (element: Element) =>
  parseFloat(getComputedStyle(element).borderTopRightRadius) || 0;

/** The card around `element`: the nearest ancestor that clips it with rounded corners. */
export const cardElement = (element: HTMLElement) =>
  clippingAncestors(element).find((clip) => cornerRadius(clip) > 0);

export function measureCard(element: HTMLElement): Card | undefined {
  const card = cardElement(element);
  if (!card) {
    return undefined;
  }
  const { top, right, bottom, left } = card.getBoundingClientRect();
  return {
    top: Math.floor(top),
    right: Math.ceil(right),
    bottom: Math.ceil(bottom),
    left: Math.floor(left),
    radius: cornerRadius(card),
  };
}

export interface Corners {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

/** Rounds the corners of the overlay's safe area that are also the card's. */
export function cardCorners(
  safeArea: SafeArea,
  viewport: { width: number; height: number },
  card: Card | undefined,
): Corners {
  if (!card) {
    return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
  }
  // The safe area's edges round inwards and the card's outwards, so a shared one can be a pixel
  // apart.
  const near = (a: number, b: number) => Math.abs(a - b) <= 1;
  const top = near(safeArea.top, card.top);
  const bottom = near(viewport.height - safeArea.bottom, card.bottom);
  const left = near(safeArea.left, card.left);
  const right = near(viewport.width - safeArea.right, card.right);
  return {
    topLeft: top && left ? card.radius : 0,
    topRight: top && right ? card.radius : 0,
    bottomRight: bottom && right ? card.radius : 0,
    bottomLeft: bottom && left ? card.radius : 0,
  };
}

/** The overlay frame's `clip-path`: the safe area, inset from the window, with rounded corners. */
export function overlayClipPath(safeArea: SafeArea, corners: Corners): string {
  const radii = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const rounding = radii.some(Boolean) ? ` round ${radii.map((r) => `${r}px`).join(' ')}` : '';
  return `inset(${safeArea.top}px ${safeArea.right}px ${safeArea.bottom}px ${safeArea.left}px${rounding})`;
}
