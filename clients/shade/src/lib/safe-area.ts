import * as React from 'react';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

const BOUNDARY_ATTRIBUTE = 'data-ghost-safe-area';

/**
 * Whether the app SDK has set `--ghost-safe-area-inset-*` on the `<html>` of `container`'s
 * document, or this one. It sets them inline, so reading them needs no style recalculation.
 */
export function hasSafeArea(container?: HTMLElement): boolean {
  if (!container && typeof globalThis.document === 'undefined') {
    return false;
  }
  const root = (container?.ownerDocument ?? globalThis.document).documentElement;
  return SIDES.some(
    (side) => root.style.getPropertyValue(`--ghost-safe-area-inset-${side}`) !== '',
  );
}

function subscribeToRootStyle(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  return () => observer.disconnect();
}

export function useHasSafeArea(): boolean {
  return React.useSyncExternalStore(
    subscribeToRootStyle,
    () => hasSafeArea(),
    () => false,
  );
}

/**
 * Centres a dialog on the window, moved only as far as it must to stay inside the safe area.
 * One wider than the safe area is centred on it instead.
 */
export const SAFE_AREA_DIALOG_X =
  'w-[calc(100%_-_var(--ghost-safe-area-inset-left,0px)_-_var(--ghost-safe-area-inset-right,0px))] translate-x-[calc(-50%_+_clamp(min(var(--ghost-safe-area-inset-left,0px)_-_50vw_+_50%,(var(--ghost-safe-area-inset-left,0px)_-_var(--ghost-safe-area-inset-right,0px))/2),0px,max(50vw_-_var(--ghost-safe-area-inset-right,0px)_-_50%,(var(--ghost-safe-area-inset-left,0px)_-_var(--ghost-safe-area-inset-right,0px))/2)))]';

/** Keeps a dialog no taller than the safe area, scrolling inside it. */
export const SAFE_AREA_DIALOG_HEIGHT =
  'max-h-[calc(100dvh_-_var(--ghost-safe-area-inset-top,0px)_-_var(--ghost-safe-area-inset-bottom,0px)_-_1rem)] overflow-y-auto';

const following = new WeakSet<Document>();

/**
 * Radix repositions popups on window scroll or resize, not when their boundary changes, so this
 * fires a synthetic scroll whenever the insets change. Not a resize: that closes an open Select.
 */
function followSafeArea(document: Document) {
  const view = document.defaultView;
  if (!view || following.has(document)) {
    return;
  }
  following.add(document);
  new view.MutationObserver(() => view.dispatchEvent(new view.Event('scroll'))).observe(
    document.documentElement,
    { attributes: true, attributeFilter: ['style'] },
  );
}

/**
 * An invisible element covering the safe area in `container`'s document, for popups to use as
 * their collision boundary. Undefined where the safe area isn't set.
 */
export function safeAreaBoundary(container?: HTMLElement): HTMLElement | undefined {
  if (!hasSafeArea(container)) {
    return undefined;
  }
  const document = container?.ownerDocument ?? globalThis.document;
  followSafeArea(document);
  const parent = container ?? document.body;
  let boundary = parent.querySelector<HTMLElement>(`:scope > [${BOUNDARY_ATTRIBUTE}]`);
  if (!boundary) {
    boundary = document.createElement('div');
    boundary.setAttribute(BOUNDARY_ATTRIBUTE, '');
    boundary.setAttribute('aria-hidden', 'true');
    boundary.style.cssText = [
      'position: fixed',
      ...SIDES.map((side) => `${side}: var(--ghost-safe-area-inset-${side}, 0px)`),
      'visibility: hidden',
      'pointer-events: none',
    ].join('; ');
    parent.append(boundary);
  }
  return boundary;
}

/**
 * Props that keep a Radix popup inside the safe area: its collision boundary, unless the caller
 * gave one, and `data-safe-area` for styles that size it to fit.
 */
export function safeAreaCollision(
  collisionBoundary: Element | null | Array<Element | null> | undefined,
  container?: HTMLElement,
) {
  const boundary = safeAreaBoundary(container);
  return {
    collisionBoundary: collisionBoundary ?? boundary,
    'data-safe-area': boundary ? '' : undefined,
  };
}
