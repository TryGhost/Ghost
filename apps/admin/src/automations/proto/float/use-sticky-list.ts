import {useEffect, useRef, useState} from 'react';

// The left pane's sticky search + table scroll behaviour, shared by every panel
// variant so the interaction can't drift between them as the variants diverge.
//
// Returns refs to wire onto four elements and a `stuck` flag:
//   scrollRef      the scroll container
//   sentinelRef    a 1px marker directly above the sticky bar
//   stickyBlockRef wraps the sticky bar + the table beneath it
//   stickyBarRef   the bar itself
export function useStickyList() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const stickyBlockRef = useRef<HTMLDivElement>(null);
    const stickyBarRef = useRef<HTMLDivElement>(null);
    const [stuck, setStuck] = useState(false);

    // When the sentinel just above the bar scrolls out the top of the container,
    // the bar has stuck — the cards above have scrolled off, so the collapsed
    // filter chips can take their place. The -12px top rootMargin gives the
    // trigger a small dead-zone: when a filter shrinks the table and the scroll
    // clamps back to the boundary, the sentinel stays just outside it, so we don't
    // flicker back to unstuck (which would drop the chips).
    useEffect(() => {
        const root = scrollRef.current;
        const sentinel = sentinelRef.current;
        if (!root || !sentinel) {
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => setStuck(!entry.isIntersecting),
            {root, rootMargin: '-12px 0px 0px 0px', threshold: 0}
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    // Reserve at least a viewport of height for the sticky bar + table block, set
    // from JS so it's reliable (a CSS percentage min-height can fail to resolve
    // inside a flex scroll container). Without it, filtering to a few rows shrinks
    // the content so far that the scroll collapses past the sentinel and unsticks
    // the search + chips; with it, the scroll clamps to the block's top — headers
    // just under the sticky bar — instead.
    useEffect(() => {
        const root = scrollRef.current;
        const block = stickyBlockRef.current;
        if (!root || !block) {
            return;
        }
        const apply = () => {
            block.style.minHeight = `${root.clientHeight}px`;
        };
        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(root);
        return () => observer.disconnect();
    }, []);

    // Dock the sortable table header directly beneath the sticky bar. The bar's
    // height changes when the chips expand, so rather than a hardcoded offset we
    // measure its live height and expose it as --stick-top on the block; the
    // header cells sticky-pin at top: var(--stick-top). offsetHeight is integer px
    // and the observer fires through the chip expand/collapse animation, so the
    // header tracks the bar flush in every state.
    useEffect(() => {
        const bar = stickyBarRef.current;
        const block = stickyBlockRef.current;
        if (!bar || !block) {
            return;
        }
        const apply = () => {
            block.style.setProperty('--stick-top', `${bar.offsetHeight}px`);
        };
        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(bar);
        return () => observer.disconnect();
    }, []);

    return {scrollRef, sentinelRef, stickyBlockRef, stickyBarRef, stuck};
}
