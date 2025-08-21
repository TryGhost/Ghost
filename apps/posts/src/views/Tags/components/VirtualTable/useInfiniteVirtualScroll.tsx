import {getScrollParent} from './getScrollParent';
import {useEffect} from 'react';
import {useVirtualizer} from '@tanstack/react-virtual';

export function useInfiniteVirtualScroll<T>({
    items,
    totalItems,
    parentRef,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    estimateSize = () => 100,
    overscan = 5
}: {
    items: T[];
    totalItems: number;
    parentRef: React.RefObject<HTMLElement>;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    estimateSize?: (index: number) => number;
    overscan?: number;
}) {
    const virtualizer = useVirtualizer({
        count: totalItems,
        getScrollElement: () => getScrollParent(parentRef.current),
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

    const itemsToRender = virtualItems.map(virtualItem => ({
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
