import * as React from 'react';
import { getFloatingSidebarTiming } from '@/components/ui/floating-sidebar-metrics';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

const BOUNDARY_ATTRIBUTE = 'data-ghost-safe-area';

/**
 * Whether a Ghost app's SDK has set the safe area on `<html>` of the document `container` is in,
 * or this one. It sets `--ghost-safe-area-inset-*` there as inline styles, which read without
 * working out the page's styles.
 */
export function hasSafeArea(container?: HTMLElement): boolean {
  // Rendered without a document, such as on a server, there's no app around it yet.
  if (!container && typeof globalThis.document === 'undefined') {
    return false;
  }
  const root = (container?.ownerDocument ?? globalThis.document).documentElement;
  return SIDES.some(
    (side) => root.style.getPropertyValue(`--ghost-safe-area-inset-${side}`) !== '',
  );
}

const following = new WeakSet<Document>();

/**
 * Has open popups in `document` follow its safe area. Radix repositions a popup as the window
 * scrolls or resizes, not as its boundary changes, so this scrolls the window, in name only, each
 * time the app SDK changes the variables. Not a resize, which closes an open Select.
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
 * In a Ghost app, Admin's chrome floats over the edges of the app's page, and the app SDK sets how
 * far it reaches in as `--ghost-safe-area-inset-*` on `<html>`. Returns an invisible element
 * covering that safe area in the document a popup opens in, which is the one `container` is in,
 * so the popup can keep inside it as it keeps inside the window. It follows the variables as they
 * change, and so do popups that are open. Anywhere the variables aren't set, there's none.
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
 * The props that keep a Radix popup inside a Ghost app's safe area: its collision boundary, unless
 * the caller gave one, and `data-safe-area`, for styles that size it to the room that leaves.
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

/**
 * The page column a slide keeps in one piece, as Admin's own pages do: the outermost of the
 * columns Shade's page templates lay out.
 */
const PAGE_COLUMN_SELECTOR =
  '.max-w-page, [data-list-page=list-page], [data-detail-page=detail-page]';

const HORIZONTAL = ['left', 'right'] as const;

/** The safe area's left and right insets in an inline style, or undefined where it sets none. */
function horizontalInsets(document: Document, style: string | null) {
  const probe = document.createElement('div');
  probe.setAttribute('style', style ?? '');
  const [left, right] = HORIZONTAL.map((side) =>
    probe.style.getPropertyValue(`--ghost-safe-area-inset-${side}`),
  );
  return left === '' && right === '' ? undefined : { left, right };
}

/** Where `app`'s page starts on screen: its page column's left edge, or else its content's. */
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
 * As Admin's navigation pins and unpins, the app SDK moves the safe area's left and right edges at
 * once. Has `app`, padded by them, move with them as Admin's own pages do: it lays out once at the
 * new insets, then slides there from where it showed, in step with the navigation and with its
 * timing, its page column in one piece. What's fixed to the window, such as a backdrop filling it
 * or a toolbar along its edge, holds still, wherever it is in the app. Nothing slides where the
 * variables aren't set, the first time they're set, or with reduced motion.
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
      // Where the page showed, at the insets it had and partway through a slide in flight
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
      // Slid towards an edge, the page mustn't make the window scroll sideways for the while.
      if (root.scrollWidth <= root.clientWidth) {
        root.setAttribute(SLIDING_ATTRIBUTE, '');
      }
      // Opposite margins move the app's box without changing its width, so its content keeps its
      // layout. A transform, or anything else that makes a containing block, would trap what's
      // fixed to the window inside the app and move it too.
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
      // From the frame in progress, as the navigation's own slide started with the frame that
      // changed the safe area, rather than waiting a frame to start.
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
