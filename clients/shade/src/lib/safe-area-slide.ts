import * as React from 'react';
import { getFloatingSidebarTiming } from '@/components/ui/floating-sidebar-metrics';

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
