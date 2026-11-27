import * as React from 'react';
import { getFloatingSidebarTiming } from '@/components/ui/floating-sidebar-metrics';

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

const SLIDING_ATTRIBUTE = 'data-ghost-safe-area-sliding';

const PAGE_COLUMN_SELECTOR =
  '.max-w-page, [data-list-page=list-page], [data-detail-page=detail-page]';

const HORIZONTAL = ['left', 'right'] as const;

function horizontalInsets(document: Document, style: string | null) {
  const probe = document.createElement('div');
  probe.setAttribute('style', style ?? '');
  const [left, right] = HORIZONTAL.map((side) =>
    probe.style.getPropertyValue(`--ghost-safe-area-inset-${side}`),
  );
  return left === '' && right === '' ? undefined : { left, right };
}

function pageStart(app: HTMLElement) {
  const column = app.querySelector(PAGE_COLUMN_SELECTOR);
  if (column) {
    return column.getBoundingClientRect().left;
  }
  const view = app.ownerDocument.defaultView;
  const padding = view ? parseFloat(view.getComputedStyle(app).paddingLeft) || 0 : 0;
  return app.getBoundingClientRect().left + padding;
}

/**
 * When the safe area's left and right insets jump, as Admin's navigation pins and unpins, slides
 * `app` from where it showed to its new place with the navigation's timing. Not with reduced
 * motion, nor the first time the insets are set.
 */
export function useSafeAreaSlide(app: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const element = app.current;
    const document = element?.ownerDocument;
    const view = document?.defaultView;
    if (!element || !document || !view || typeof element.animate !== 'function') {
      return undefined;
    }
    const root = document.documentElement;
    let slide: Animation | undefined;
    const stop = () => {
      slide?.cancel();
      slide = undefined;
      root.removeAttribute(SLIDING_ATTRIBUTE);
    };
    const observer = new view.MutationObserver((records) => {
      const was = horizontalInsets(document, records[0].oldValue);
      const now = horizontalInsets(document, root.getAttribute('style'));
      if (!was || !now || (was.left === now.left && was.right === now.right)) {
        return;
      }
      if (view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        stop();
        return;
      }
      // Measured at the old insets before stopping a slide in flight, so it starts from mid-slide
      for (const side of HORIZONTAL) {
        element.style.setProperty(`--ghost-safe-area-inset-${side}`, was[side]);
      }
      const before = pageStart(element);
      for (const side of HORIZONTAL) {
        element.style.removeProperty(`--ghost-safe-area-inset-${side}`);
      }
      stop();
      const from = before - pageStart(element);
      if (Math.abs(from) < 0.5) {
        return;
      }
      if (root.scrollWidth <= root.clientWidth) {
        root.setAttribute(SLIDING_ATTRIBUTE, '');
      }
      // Margins, not a transform: a transform makes a containing block, which would move what's
      // fixed to the window along with the app.
      const style = view.getComputedStyle(element);
      const [left, right] = [parseFloat(style.marginLeft), parseFloat(style.marginRight)];
      const { duration, easing } = getFloatingSidebarTiming();
      const animation = element.animate(
        [
          { marginLeft: `${left + from}px`, marginRight: `${right - from}px` },
          { marginLeft: `${left}px`, marginRight: `${right}px` },
        ],
        { duration, easing },
      );
      // Starts in this frame, in step with the navigation, rather than the next.
      animation.startTime = document.timeline.currentTime;
      animation.onfinish = () => {
        if (slide === animation) {
          slide = undefined;
          root.removeAttribute(SLIDING_ATTRIBUTE);
        }
      };
      slide = animation;
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['style'],
      attributeOldValue: true,
    });
    return () => {
      observer.disconnect();
      stop();
    };
  }, [app]);
}
