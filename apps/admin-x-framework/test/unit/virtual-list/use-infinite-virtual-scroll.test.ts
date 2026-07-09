import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';

import {useInfiniteVirtualScroll} from '../../../src/virtual-list/use-infinite-virtual-scroll';

class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

function createParentRef() {
    const scrollElement = document.createElement('div');
    const parentElement = document.createElement('div');
    scrollElement.appendChild(parentElement);
    document.body.appendChild(scrollElement);

    // jsdom reports zero dimensions, so give the virtualizer a measurable
    // viewport (react-virtual reads offsetWidth/offsetHeight) to compute a
    // visible range from.
    Object.defineProperty(scrollElement, 'offsetWidth', {configurable: true, value: 400});
    Object.defineProperty(scrollElement, 'offsetHeight', {configurable: true, value: 600});

    return {
        scrollElement,
        parentRef: {current: parentElement} as React.RefObject<HTMLElement>
    };
}

describe('useInfiniteVirtualScroll', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    it('virtualizes only a window of the total rows', () => {
        const {scrollElement, parentRef} = createParentRef();
        const items = Array.from({length: 50}, (_, index) => ({id: index}));

        const {result} = renderHook(() => useInfiniteVirtualScroll({
            items,
            totalItems: 50,
            parentRef,
            hasNextPage: false,
            isFetchingNextPage: false,
            fetchNextPage: vi.fn(),
            getScrollElement: () => scrollElement
        }));

        expect(result.current.visibleItems.length).toBeGreaterThan(0);
        expect(result.current.visibleItems.length).toBeLessThan(50);
        expect(result.current.visibleItems[0].item).toEqual({id: 0});
    });

    it('fetches the next page when trailing placeholder rows (rows without data) render', () => {
        const {scrollElement, parentRef} = createParentRef();
        const fetchNextPage = vi.fn();

        renderHook(() => useInfiniteVirtualScroll({
            items: [],
            totalItems: 20,
            parentRef,
            hasNextPage: true,
            isFetchingNextPage: false,
            fetchNextPage,
            getScrollElement: () => scrollElement
        }));

        expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });

    it('does not fetch the next page when there is no next page', () => {
        const {scrollElement, parentRef} = createParentRef();
        const fetchNextPage = vi.fn();

        renderHook(() => useInfiniteVirtualScroll({
            items: [],
            totalItems: 20,
            parentRef,
            hasNextPage: false,
            isFetchingNextPage: false,
            fetchNextPage,
            getScrollElement: () => scrollElement
        }));

        expect(fetchNextPage).not.toHaveBeenCalled();
    });

    it('does not fetch the next page while a fetch is already in flight', () => {
        const {scrollElement, parentRef} = createParentRef();
        const fetchNextPage = vi.fn();

        renderHook(() => useInfiniteVirtualScroll({
            items: [],
            totalItems: 20,
            parentRef,
            hasNextPage: true,
            isFetchingNextPage: true,
            fetchNextPage,
            getScrollElement: () => scrollElement
        }));

        expect(fetchNextPage).not.toHaveBeenCalled();
    });
});
