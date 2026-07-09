import {getScrollParent} from '@tryghost/shade/utils';
import {useEffect} from 'react';
import {useVirtualizer} from '@tanstack/react-virtual';
import type {RefObject} from 'react';
import type {VirtualItem} from '@tanstack/react-virtual';

/**
 * The subset of a `@tanstack/react-query` infinite query that the virtual
 * scroll primitive needs in order to page through data. Any hook that returns
 * this shape (e.g. `useInfiniteQuery`) can drive the list.
 */
export interface InfiniteQueryResultLike {
    /** Whether another page of data is available to fetch. */
    hasNextPage?: boolean;
    /** Whether the next page is currently being fetched. */
    isFetchingNextPage?: boolean;
    /** Trigger a fetch of the next page. */
    fetchNextPage: () => void;
}

export interface UseInfiniteVirtualScrollOptions<T> extends InfiniteQueryResultLike {
    /** The currently loaded items. May be shorter than `totalItems` while paging. */
    items: T[];
    /**
     * The number of rows to virtualize. This can exceed `items.length` — the
     * trailing rows render as placeholders and trigger `fetchNextPage`.
     */
    totalItems: number;
    /** Ref to an element inside the scrollable container. */
    parentRef: RefObject<HTMLElement>;
    /** Estimated row height in pixels (default: 100). */
    estimateSize?: (index: number) => number;
    /** Number of rows to render outside the visible window (default: 5). */
    overscan?: number;
    /**
     * Resolve the scrollable element from `parentRef.current`. Defaults to
     * walking up the DOM to the nearest scroll parent.
     */
    getScrollElement?: (element: HTMLElement | null) => HTMLElement | null;
}

export interface VirtualScrollItem<T> {
    virtualItem: VirtualItem;
    key: VirtualItem['key'];
    /**
     * The row's data. Rows virtualized beyond `items.length` are placeholders
     * whose data has not loaded yet — callers must guard on
     * `virtualItem.index > items.length - 1` before reading this. Typed as `T`
     * (rather than `T | undefined`) so post-guard access stays ergonomic,
     * matching indexed-access semantics.
     */
    item: T;
    props: {
        ref: (node: Element | null) => void;
        'data-index': number;
    };
}

/**
 * Virtualizes a (potentially very long) list and automatically fetches the next
 * page of a react-query infinite query as placeholder rows scroll into view.
 *
 * Decoupled from any particular data source — pass the loaded `items`, the
 * `totalItems` count to virtualize, and the infinite-query controls.
 */
export function useInfiniteVirtualScroll<T>({
    items,
    totalItems,
    parentRef,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    estimateSize = () => 100,
    overscan = 5,
    getScrollElement = getScrollParent
}: UseInfiniteVirtualScrollOptions<T>) {
    const virtualizer = useVirtualizer({
        count: totalItems,
        getScrollElement: () => getScrollElement(parentRef.current),
        estimateSize,
        overscan
    });

    const virtualItems = virtualizer.getVirtualItems();

    const spaceBefore =
        virtualItems.length > 0
            ? (virtualItems.at(0)?.start ?? 0) -
              virtualizer.options.scrollMargin
            : 0;
    const spaceAfter =
        virtualItems.length > 0
            ? virtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0)
            : 0;

    const itemsToRender: VirtualScrollItem<T>[] = virtualItems.map(virtualItem => ({
        virtualItem,
        key: virtualItem.key,
        item: items[virtualItem.index],
        props: {
            ref: virtualizer.measureElement,
            'data-index': virtualItem.index
        }
    }));

    // When the final item that is rendered (off screen) lacks data, meaning
    // we render a placeholder, we should start fetching the next page
    const shouldFetchNextPage =
        itemsToRender.at(-1) && !itemsToRender.at(-1)?.item;

    useEffect(() => {
        if (hasNextPage && shouldFetchNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, shouldFetchNextPage, isFetchingNextPage, fetchNextPage]);

    return {
        visibleItems: itemsToRender,
        virtualizer,
        spaceBefore,
        spaceAfter
    };
}
