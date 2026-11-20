import React, { useEffect, useRef } from 'react';

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
    const scrollTarget = scroller === document.documentElement ? window : scroller;
    let top = 0;
    let lastScroll = scroller.scrollTop;

    const update = () => {
      const minTop = Math.min(0, scroller.clientHeight - rail.offsetHeight);
      const scroll = scroller.scrollTop;
      top = Math.min(0, Math.max(minTop, top - (scroll - lastScroll)));
      lastScroll = scroll;
      rail.style.top = `${top}px`;
    };

    scrollTarget.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    observer.observe(scroller);
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
    <aside className="w-[400px] shrink-0 border-l border-border">
      <div ref={ref} className="sticky top-0 p-6">
        {children}
      </div>
    </aside>
  );
};

export default CommentsAnalyticsRail;
