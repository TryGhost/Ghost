import React, { useEffect, useRef } from 'react';
import { Box } from '@tryghost/shade/primitives';

function getScrollParent(element: HTMLElement): HTMLElement {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) {
      return parent;
    }
  }
  return document.documentElement;
}

// A rail taller than the scrollport moves with the page until its bottom (scrolling
// down) or top (scrolling up) is in view, then sticks, so the page keeps one scrollbar.
function useStickyRail() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = ref.current;
    if (!rail) {
      return;
    }
    const scroller = getScrollParent(rail);
    const header = rail
      .closest('[data-list-page="list-page"]')
      ?.querySelector<HTMLElement>('[data-list-page="header"]');
    const scrollTarget = scroller === document.documentElement ? window : scroller;
    let maxTop = header?.offsetHeight ?? 0;
    let top = maxTop;
    let lastScroll = scroller.scrollTop;

    const update = () => {
      const nextMaxTop = header?.offsetHeight ?? 0;
      if (top === maxTop) {
        top = nextMaxTop;
      }
      maxTop = nextMaxTop;
      const minTop = Math.min(maxTop, scroller.clientHeight - rail.offsetHeight);
      const scroll = scroller.scrollTop;
      top = Math.min(maxTop, Math.max(minTop, top - (scroll - lastScroll)));
      lastScroll = scroll;
      rail.style.top = `${top}px`;
    };

    scrollTarget.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    observer.observe(scroller);
    if (header) {
      observer.observe(header);
    }
    update();

    return () => {
      scrollTarget.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  return ref;
}

const CommentsAnalyticsRail: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useStickyRail();

  return (
    <aside className="w-[400px] shrink-0 border-l border-border-default">
      <Box ref={ref} className="sticky top-0" paddingX="xl" paddingY="sm">
        {children}
      </Box>
    </aside>
  );
};

export default CommentsAnalyticsRail;
