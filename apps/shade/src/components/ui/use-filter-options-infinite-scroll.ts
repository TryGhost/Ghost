import {useCallback, useEffect, useRef} from 'react';

export interface FilterOptionsInfiniteScrollSource {
    hasMore: boolean;
    isInitialLoad: boolean;
    isLoadingMore: boolean;
    isSearching: boolean;
    loadMore: () => void;
}

interface UseFilterOptionsInfiniteScrollOptions {
    optionSource: FilterOptionsInfiniteScrollSource;
    optionsCount: number;
    resetKey: string;
}

export function useFilterOptionsInfiniteScroll({
    optionSource,
    optionsCount,
    resetKey
}: UseFilterOptionsInfiniteScrollOptions) {
    const {
        hasMore,
        isInitialLoad,
        isLoadingMore,
        isSearching,
        loadMore
    } = optionSource;
    const observerRef = useRef<IntersectionObserver | null>(null);
    // Tracks the optionsCount at which we last triggered onLoadMore, so we don't
    // fire repeatedly while the same page of results is still in view.
    const requestedOptionsCountRef = useRef<number | null>(null);

    useEffect(() => {
        requestedOptionsCountRef.current = null;
    }, [resetKey]);

    const requestLoadMoreIfReady = useCallback(() => {
        if (
            hasMore &&
            !isInitialLoad &&
            !isLoadingMore &&
            !isSearching &&
            optionsCount > 0 &&
            requestedOptionsCountRef.current !== optionsCount
        ) {
            requestedOptionsCountRef.current = optionsCount;
            loadMore();
        }
    }, [hasMore, isInitialLoad, isLoadingMore, isSearching, loadMore, optionsCount]);

    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;

        if (!node || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const root = node.closest('[data-slot="command-list"]');
        observerRef.current = new IntersectionObserver((entries) => {
            const [entry] = entries;

            if (entry?.isIntersecting) {
                requestLoadMoreIfReady();
            }
        }, {
            root,
            rootMargin: '0px 0px 48px 0px'
        });

        observerRef.current.observe(node);
    }, [requestLoadMoreIfReady]);

    useEffect(() => {
        return () => {
            observerRef.current?.disconnect();
            observerRef.current = null;
        };
    }, []);

    return sentinelRef;
}
