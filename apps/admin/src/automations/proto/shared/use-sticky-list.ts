import { useEffect, useRef, useState } from 'react';

// The left pane's sticky search + table scroll behaviour, shared by every panel
// variant so the interaction can't drift between them as the variants diverge.
//
// Returns refs to wire onto four elements and a `stuck` flag:
//   scrollRef      the scroll container
//   sentinelRef    a 1px marker directly above the sticky bar — the boundary
//   stickyBlockRef wraps the sticky bar + the table beneath it
//   stickyBarRef   the bar itself
//
// THE MODEL: stuckness changes only when the user scrolls. Content changing
// size never flips it — it gets compensated instead.
//
// The first version derived `stuck` from an IntersectionObserver on the
// sentinel, which is the textbook build — and it decayed as the panel grew,
// because the interactions the stuck bar hosts all MUTATE the geometry the
// observer watches. Filtering from the stuck chips shrinks the table, and the
// browser's scroll clamp swept the sentinel through the observer mid-relayout.
// Clearing a filter re-expands the summary card over a 200ms animation, which
// physically pushes the sentinel down into the viewport while the scroll
// position holds still — the observer honestly reported "boundary visible" and
// dropped the bar the user was interacting with. Each new filter behaviour
// added a new way for the bar to dismiss itself.
//
// So the observer is gone. `stuck` is computed from the sentinel's position
// only in response to SCROLL events, and a ResizeObserver over the container's
// children handles mutations the other way round: while stuck, if content
// growth above the boundary would push it back into view, the scroll position
// is moved down to hold the boundary where the user left it. Reading the bar
// as "the cards have been scrolled away" stays true because the compensation
// keeps them scrolled away; unsticking is something only the user's own
// scroll-up can do.
export function useStickyList(active = true) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stickyBlockRef = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  // Mirrors `stuck` for the ResizeObserver callback, which would otherwise
  // close over the value from the render it was created in.
  const stuckRef = useRef(false);

  // `active` is for panes that mount and unmount this block — Exploration hides
  // it behind a tab. Every listener attaches to elements that go away with it,
  // so the tab's state re-runs the wiring against the elements that exist now.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    const block = stickyBlockRef.current;
    if (!active || !root || !sentinel || !block) {
      return;
    }

    // Scroll anchoring OFF, set here in JS so every panel that takes this hook
    // gets it and no build step can drop it. Anchoring is the browser guessing
    // what you were reading and re-scrolling to keep it still; in these panes
    // the guess is poisoned — filtering replaces the table rows wholesale
    // under a sticky bar, and Chrome's compensation walked the scroll UP (by
    // the height of the removed rows, then frame-by-frame through the chip
    // collapse animation) until the bar unstuck itself. Intermittently, too,
    // depending on which anchor node it picked — the worst kind of bug to
    // chase. This hook manages scroll deliberately; anchoring has no job here.
    root.style.overflowAnchor = 'none';

    // Freshly mounted means freshly scrolled to the top, whatever the last
    // instance had concluded before it was taken away.
    stuckRef.current = false;
    setStuck(false);

    // Where the boundary sits relative to the container's top edge, in px.
    // Negative or near-zero: scrolled past — the bar is stuck.
    const boundaryTop = () =>
      sentinel.getBoundingClientRect().top - root.getBoundingClientRect().top;

    // The 12px dead-zone the old observer had, kept for the same reason: when a
    // clamp or a settling animation leaves the boundary hovering a few pixels
    // inside the edge, that isn't the user asking for the cards back.
    const readStuck = () => boundaryTop() < 12;

    const update = () => {
      const next = readStuck();
      stuckRef.current = next;
      setStuck(next);
    };

    // Scroll is the ONE input allowed to change stuckness in both directions.
    const onScroll = () => update();
    root.addEventListener('scroll', onScroll, { passive: true });

    // Content changes are compensated, not interpreted. While stuck, growth
    // above the boundary (the summary card re-expanding as a filter clears)
    // would push the boundary into view — scrolling down by exactly that
    // overshoot holds it at the edge, so the bar stays where the user is
    // working. Shrinkage needs nothing: it moves the boundary further out of
    // view, and the browser's own clamp plus the min-height below keep the
    // block in place. Observing the container's CHILDREN catches every
    // mutation inside the pane, including each frame of the 200ms collapse
    // animations, without the hook having to know which regions can resize.
    const onContentResize = () => {
      if (stuckRef.current) {
        const overshoot = boundaryTop() + 1;
        if (overshoot > 0) {
          root.scrollTop += overshoot;
        }
      }
      update();
    };
    const contentObserver = new ResizeObserver(onContentResize);
    for (const child of Array.from(root.children)) {
      contentObserver.observe(child);
    }

    // Reserve at least a viewport of height for the sticky bar + table block,
    // set from JS so it's reliable (a CSS percentage min-height can fail to
    // resolve inside a flex scroll container). Without it, filtering to a few
    // rows shrinks the content so far that the scroll can't stay past the
    // boundary at all; with it, the clamp lands exactly on the block's top —
    // headers just under the sticky bar. Re-applied when the container
    // resizes, which also covers the filter row appearing in the strip above
    // and changing the pane's height.
    const applyMinHeight = () => {
      block.style.minHeight = `${root.clientHeight}px`;
      onContentResize();
    };
    applyMinHeight();
    const rootObserver = new ResizeObserver(applyMinHeight);
    rootObserver.observe(root);

    return () => {
      root.removeEventListener('scroll', onScroll);
      contentObserver.disconnect();
      rootObserver.disconnect();
    };
  }, [active]);

  // Dock the sortable table header directly beneath the sticky bar. The bar's
  // height changes when the chips expand, so rather than a hardcoded offset we
  // measure its live height and expose it as --stick-top on the block; the
  // header cells sticky-pin at top: var(--stick-top). offsetHeight is integer px
  // and the observer fires through the chip expand/collapse animation, so the
  // header tracks the bar flush in every state.
  useEffect(() => {
    const bar = stickyBarRef.current;
    const block = stickyBlockRef.current;
    if (!active || !bar || !block) {
      return;
    }
    const apply = () => {
      block.style.setProperty('--stick-top', `${bar.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [active]);

  return { scrollRef, sentinelRef, stickyBlockRef, stickyBarRef, stuck };
}
