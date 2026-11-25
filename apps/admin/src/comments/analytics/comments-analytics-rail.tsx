import React, { useEffect, useRef } from 'react';
import { Box, Stack } from '@tryghost/shade/primitives';
import { getScrollParent } from '@tryghost/shade/utils';

const CommentsAnalyticsRail: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const column = columnRef.current;
    const spacer = spacerRef.current;
    const rail = railRef.current;
    if (!column || !spacer || !rail) {
      return;
    }
    const scroller = getScrollParent(column) ?? document.documentElement;
    const scrollTarget = scroller === document.documentElement ? window : scroller;
    const header = column
      .closest('[data-list-page="list-page"]')
      ?.querySelector<HTMLElement>('[data-list-page="header"]');
    let lastScroll = scroller.scrollTop;
    let direction: 'up' | 'down' = 'down';

    // Keep the current position in normal flow before switching sticky edges.
    // CSS then does all movement and pinning until the next direction change.
    const anchor = () => {
      const height = rail.offsetHeight;
      const headerHeight = header?.offsetHeight ?? 0;
      const viewportHeight = scroller.clientHeight;
      const fits = height <= viewportHeight - headerHeight;
      const offset =
        fits || scroller.scrollTop === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                rail.getBoundingClientRect().top - column.getBoundingClientRect().top,
                column.clientHeight - height,
              ),
            );

      spacer.style.height = `${offset}px`;
      rail.style.top =
        direction === 'down' || fits
          ? `${Math.min(headerHeight, viewportHeight - height)}px`
          : 'auto';
      rail.style.bottom =
        direction === 'up' && !fits ? `${viewportHeight - headerHeight - height}px` : 'auto';
    };

    const onScroll = () => {
      const scroll = Math.max(0, scroller.scrollTop);
      if (scroll === lastScroll) {
        return;
      }
      const nextDirection = scroll > lastScroll ? 'down' : 'up';
      lastScroll = scroll;
      if (nextDirection !== direction || scroll === 0) {
        direction = nextDirection;
        anchor();
      }
    };

    anchor();
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(anchor);
    observer.observe(rail);
    // The virtual list's column height changes during scrolling; it doesn't
    // affect the sticky edges and must not trigger re-anchoring.
    observer.observe(scroller);
    if (header) {
      observer.observe(header);
    }
    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <aside aria-label="Comment analytics" className="w-[420px] shrink-0">
      <Stack ref={columnRef} className="h-full" gap="none">
        <Box ref={spacerRef} aria-hidden="true" className="shrink-0" />
        <Box ref={railRef} className="sticky bottom-0 shrink-0 pt-0 pr-0" padding="xl">
          {children}
        </Box>
      </Stack>
    </aside>
  );
};

export default CommentsAnalyticsRail;
