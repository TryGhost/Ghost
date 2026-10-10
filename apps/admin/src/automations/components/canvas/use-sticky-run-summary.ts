import { useLayoutEffect, useRef, useState } from 'react';
import type { UIEventHandler } from 'react';
import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';

// Reveal the chips within the summary's 16px bottom padding, after the cards
// have left view but before the whole padded summary has scrolled away.
const SUMMARY_REVEAL_INSET_PX = 12;

export function useStickyRunSummary({
  queryScope,
  dateRange,
  hasStickySummary,
}: {
  queryScope: string;
  dateRange: PerformanceDateRange;
  hasStickySummary: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const compactSummaryRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [summaryHidden, setSummaryHidden] = useState(false);
  const [scrollMargin, setScrollMargin] = useState(0);
  const showStickySummary = summaryHidden && hasStickySummary;

  useLayoutEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.inert = summaryHidden;
    }
    if (compactSummaryRef.current) {
      compactSummaryRef.current.inert = !showStickySummary;
    }
  }, [summaryHidden, showStickySummary]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const summaryElement = summaryRef.current;
    const header = headerRef.current;
    const bar = stickyBarRef.current;
    const list = listRef.current;
    if (!scroller || !summaryElement || !header || !bar || !list) {
      return;
    }
    const measure = () => {
      const barHeight = bar.getBoundingClientRect().height;
      // The header follows the bar through each animation frame. Measure its natural
      // height, not its sticky position, when locating the virtualized rows.
      scroller.style.setProperty('--sticky-status-height', `${barHeight}px`);
      // Keep browser focus scrolling clear of the sticky controls.
      scroller.style.scrollPaddingTop = `${barHeight + header.offsetHeight}px`;
      setScrollMargin(summaryElement.offsetHeight + barHeight + header.offsetHeight);
      // Keep a viewport of space below the summary, even with only a few runs.
      // Otherwise shrinking the bar could clamp scrolling across the sticky boundary.
      list.style.minHeight = `${Math.max(0, scroller.clientHeight - barHeight)}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(summaryElement);
    observer.observe(header);
    observer.observe(bar);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setSummaryHidden(false);
  }, [queryScope, dateRange]);

  const onScroll: UIEventHandler<HTMLDivElement> = (event) => {
    const height = summaryRef.current?.offsetHeight ?? 0;
    setSummaryHidden(
      height > 0 && event.currentTarget.scrollTop > height - SUMMARY_REVEAL_INSET_PX,
    );
  };

  return {
    scrollRef,
    summaryRef,
    headerRef,
    stickyBarRef,
    compactSummaryRef,
    listRef,
    summaryHidden,
    showStickySummary,
    scrollMargin,
    onScroll,
  };
}
