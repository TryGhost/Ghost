import { useLayoutEffect, useRef, useState } from 'react';

// The sidebar owns scrolling: changing the list starts at its first row without
// bringing a summary the reader already scrolled past back into view.
export const usePerformanceScroll = (hasOpened: boolean, listRequestId: string) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);
  const boundaryRef = useRef(0);
  const offsetRef = useRef(0);
  const listTop = () => {
    const scroll = scrollRef.current;
    const list = listRef.current;
    return scroll && list
      ? list.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop
      : 0;
  };
  const onScroll = () => {
    const scroll = scrollRef.current;
    if (!scroll) {
      return;
    }
    const boundary = listTop();
    if (collapsedRef.current && boundary !== boundaryRef.current) {
      // A summary resize can clamp scrolling before ResizeObserver runs.
      // That is a layout change, not a request to reveal the summary.
      boundaryRef.current = boundary;
      scroll.scrollTop = boundary + offsetRef.current;
      return;
    }
    const top = scroll.scrollTop;
    boundaryRef.current = boundary;
    offsetRef.current = Math.max(0, top - boundary);
    const next = top > 0 && top >= boundary - 1;
    collapsedRef.current = next;
    setCollapsed(next);
  };
  const showSummary = () => {
    collapsedRef.current = false;
    setCollapsed(false);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const summary = summaryRef.current;
    const list = listRef.current;
    if (!hasOpened || !scroll || !summary || !list) {
      return;
    }
    const measure = () => {
      // Even empty/error results need enough space to keep the summary above
      // the viewport. Otherwise the browser clamps scrollTop and drops the chips.
      list.style.minHeight = `${scroll.clientHeight}px`;
      const boundary = listTop();
      if (
        collapsedRef.current &&
        (boundary !== boundaryRef.current || scroll.scrollTop < boundary)
      ) {
        // Date controls and loading/error text can resize the summary without
        // the reader scrolling. Preserve the position relative to the list.
        scroll.scrollTop = boundary + offsetRef.current;
      }
      boundaryRef.current = boundary;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroll);
    observer.observe(summary);
    return () => observer.disconnect();
  }, [hasOpened]);

  useLayoutEffect(() => {
    boundaryRef.current = listTop();
    offsetRef.current = 0;
    scrollRef.current?.scrollTo({ top: collapsedRef.current ? boundaryRef.current : 0 });
  }, [hasOpened, listRequestId]);

  return { scrollRef, summaryRef, listRef, collapsed, onScroll, showSummary };
};
