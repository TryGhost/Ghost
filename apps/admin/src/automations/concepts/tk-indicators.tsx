import React, { useEffect, useRef, useState } from 'react';
import { findBodyTks } from './tk';

// NY-1715 exploration only — never merge. A stand-in for Koenig's TKPlugin, which the email
// editor doesn't load yet (NY-1736): a "TK" in the right margin beside each paragraph that
// holds one, placed and styled as Koenig places its own. Hovering it highlights the paragraph's
// TKs in Koenig's lime; clicking selects them in turn. Everything is drawn over the editor,
// so Koenig's content is never touched.

// Koenig: 56px out from the right of the text (unless marginRight says otherwise), 4px below
// the top of the paragraph.
const MARGIN_RIGHT = -56;
const TOP_OFFSET = 4;
// Koenig's tkHighlighted: bg-lime-500 (dark: lime-800) with 4px above and below.
const HIGHLIGHT_PADDING_Y = 4;

type Indicator = { top: number };
type Rect = { top: number; left: number; width: number; height: number };

const findTkRanges = (block: Element): Range[] => {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    // Cards keep their own editors; Koenig marks the card itself, which this skips.
    if (node.parentElement?.closest('[data-kg-card]')) {
      continue;
    }
    for (const tk of findBodyTks(node.textContent ?? '')) {
      const range = document.createRange();
      range.setStart(node, tk.start);
      range.setEnd(node, tk.end);
      ranges.push(range);
    }
  }
  return ranges;
};

const TkIndicators: React.FC<{ container: HTMLElement | null; marginRight?: number }> = ({
  container,
  marginRight = MARGIN_RIGHT,
}) => {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [highlight, setHighlight] = useState<Rect[]>([]);
  const rangesRef = useRef<Range[][]>([]);
  const nextRangeRef = useRef<number[]>([]);

  useEffect(() => {
    // Koenig's own root, the container's first child, so drawing the indicators (the
    // container's later children) never sets this off again.
    const editorRoot = container?.firstElementChild;
    if (!container || !editorRoot) {
      return;
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const editable = editorRoot.querySelector<HTMLElement>('[contenteditable="true"]');
        const containerTop = container.getBoundingClientRect().top;
        const blocks = editable ? [...editable.children] : [];
        const found = blocks
          .map((block) => ({ block, ranges: findTkRanges(block) }))
          .filter(({ ranges }) => ranges.length > 0);
        rangesRef.current = found.map(({ ranges }) => ranges);
        const next = found.map(({ block }) => ({
          top: block.getBoundingClientRect().top - containerTop + TOP_OFFSET,
        }));
        setIndicators((current) =>
          JSON.stringify(current) === JSON.stringify(next) ? current : next,
        );
      });
    };
    measure();
    const mutations = new MutationObserver(measure);
    mutations.observe(editorRoot, { childList: true, subtree: true, characterData: true });
    const resizes = new ResizeObserver(measure);
    resizes.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resizes.disconnect();
    };
  }, [container]);

  const showHighlight = (index: number) => {
    if (!container) {
      return;
    }
    const origin = container.getBoundingClientRect();
    setHighlight(
      (rangesRef.current[index] ?? []).flatMap((range) =>
        [...range.getClientRects()].map((rect) => ({
          top: rect.top - origin.top - HIGHLIGHT_PADDING_Y,
          left: rect.left - origin.left,
          width: rect.width,
          height: rect.height + HIGHLIGHT_PADDING_Y * 2,
        })),
      ),
    );
  };

  // Like Koenig: the first click selects the paragraph's first TK, each further click the next.
  const selectNext = (index: number) => {
    const ranges = rangesRef.current[index];
    const editable = container?.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!ranges?.length || !editable) {
      return;
    }
    const position = (nextRangeRef.current[index] ?? 0) % ranges.length;
    nextRangeRef.current[index] = position + 1;
    editable.focus({ preventScroll: true });
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(ranges[position].cloneRange());
  };

  return (
    <>
      {highlight.map((rect, index) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute -z-10 bg-[#b5ff18] dark:bg-[#3f6212]"
          style={rect}
        />
      ))}
      {indicators.map((indicator, index) => (
        <button
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          aria-label="Select TK reminder"
          className="absolute cursor-pointer p-1 text-sm font-medium text-gray-600"
          data-testid="tk-indicator"
          style={{ top: indicator.top, right: marginRight }}
          type="button"
          onClick={() => selectNext(index)}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => showHighlight(index)}
          onMouseLeave={() => setHighlight([])}
        >
          TK
        </button>
      ))}
    </>
  );
};

export default TkIndicators;
