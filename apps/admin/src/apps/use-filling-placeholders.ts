import { type RefObject, useLayoutEffect, useRef, useState } from 'react';

interface FillingPlaceholders {
  /** The space to fill: the grid's scrollable parent. */
  areaRef: RefObject<HTMLDivElement>;
  gridRef: RefObject<HTMLDivElement>;
  /** The first real card, whose height the placeholders copy. */
  cardRef: RefObject<HTMLDivElement>;
  placeholderCount: number;
  cardHeight: number | undefined;
  cardWidth: number | undefined;
  /** The grid's current column count. */
  columns: number;
  /** The grid's row gap in pixels. */
  rowGap: number;
}

/**
 * Works out how many placeholder cards pad a grid of `itemCount` real cards
 * so that its rows reach the bottom of the available area, remeasuring as the
 * area, the grid's column count, or the card size changes.
 */
export function useFillingPlaceholders(itemCount: number): FillingPlaceholders {
  const areaRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [placeholderCount, setPlaceholderCount] = useState(0);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const [cardWidth, setCardWidth] = useState<number | undefined>(undefined);
  const [columns, setColumns] = useState(1);
  const [rowGap, setRowGap] = useState(0);

  useLayoutEffect(() => {
    const area = areaRef.current;
    const grid = gridRef.current;
    const card = cardRef.current;
    if (!area || !grid || !card || typeof ResizeObserver === 'undefined') {
      return;
    }

    const measure = () => {
      const gridStyle = getComputedStyle(grid);
      const columnCount = gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      const gap = parseFloat(gridStyle.rowGap) || 0;
      const { height, width } = card.getBoundingClientRect();
      if (!height) {
        return;
      }
      const rows = Math.max(1, Math.ceil((area.clientHeight + gap) / (height + gap)));
      setCardHeight(height);
      setCardWidth(width);
      setColumns(columnCount);
      setRowGap(gap);
      setPlaceholderCount(Math.max(0, rows * columnCount - itemCount));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    observer.observe(card);
    return () => observer.disconnect();
  }, [itemCount]);

  return { areaRef, gridRef, cardRef, placeholderCount, cardHeight, cardWidth, columns, rowGap };
}
