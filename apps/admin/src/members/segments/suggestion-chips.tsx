import { Button } from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SegmentSuggestion } from './segment-suggestions';

/**
 * The suggestions, on one line that scrolls sideways when they don't fit, its scrollbar hidden.
 * An edge with more behind it fades out, so the row says there is more without a scrollbar: the
 * end at first, and the start too once scrolled. The fade is a mask, so it fades into whatever
 * is behind, in either theme.
 */
export function SuggestionChips({
  suggestions,
  onPick,
  className,
}: {
  suggestions: SegmentSuggestion[];
  onPick: (suggestion: SegmentSuggestion) => void;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) {
      return;
    }
    const start = row.scrollLeft > 1;
    const end = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
    setEdges((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  }, []);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) {
      return;
    }
    // Called once as it starts observing, and whenever the builder widens or narrows.
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    // A mouse wheel only turns up and down, and the row only scrolls sideways: over the row, the
    // wheel scrolls it along, so a mouse without a sideways wheel reaches every suggestion. At
    // either end the wheel is left to scroll the page. A trackpad's sideways swipe is the
    // browser's own. Listened to directly, as React's wheel events can't be cancelled.
    const scrollAlong = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      const atStart = row.scrollLeft <= 0;
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) {
        return;
      }
      event.preventDefault();
      row.scrollLeft += event.deltaY;
    };
    row.addEventListener('wheel', scrollAlong, { passive: false });
    return () => {
      observer.disconnect();
      row.removeEventListener('wheel', scrollAlong);
    };
  }, [measure]);

  const fade = 'transparent, black 32px';
  const mask =
    edges.start && edges.end
      ? `linear-gradient(to right, ${fade}, black calc(100% - 32px), transparent)`
      : edges.start
        ? `linear-gradient(to right, ${fade})`
        : edges.end
          ? 'linear-gradient(to right, black calc(100% - 32px), transparent)'
          : undefined;

  return (
    <div
      ref={rowRef}
      aria-label="Suggestions"
      // Room above and below for a focused chip's ring, which the scrolling row would clip.
      className={cn(
        '-m-1 flex [scrollbar-width:none] gap-2 overflow-x-auto p-1 [&::-webkit-scrollbar]:hidden',
        className,
      )}
      data-testid="segment-suggestions"
      role="group"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
      onScroll={measure}
    >
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.name}
          className="shrink-0"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onPick(suggestion)}
        >
          {/* A plus, "add this", as "New segment" has, so a chip doesn't read as a filter
              already applied. */}
          <LucideIcon.Plus />
          {suggestion.name}
        </Button>
      ))}
    </div>
  );
}
