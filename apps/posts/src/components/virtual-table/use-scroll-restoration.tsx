import {getScrollParent} from './get-scroll-parent';
import {useEffect, useRef, useState} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';

const scrollPositions = new Map<string, number>();
const SCROLL_RESTORATION_HISTORY_STATE_KEY = 'ghostVirtualListScrollPosition';
const SCROLL_POSITION_PERSIST_INTERVAL_MS = 150;
const IMMEDIATE_SCROLL_POSITION_DELTA_PX = 500;

function getCurrentHistoryState() {
    if (typeof window === 'undefined') {
        return undefined;
    }

    return window.history.state;
}

function getHistoryEntryKey(historyState: Record<string, unknown> | null | undefined) {
    const entryKey = historyState?.key;

    if (typeof entryKey === 'string' || typeof entryKey === 'number') {
        return String(entryKey);
    }

    const entryIndex = historyState?.idx;

    if (typeof entryIndex === 'number') {
        return String(entryIndex);
    }

    return undefined;
}

function getEntryScopedScrollPositionKey(
    historyState: Record<string, unknown> | null | undefined,
    locationKey: string
) {
    const entryKey = getHistoryEntryKey(historyState);

    if (!entryKey) {
        return undefined;
    }

    return `${entryKey}::${locationKey}`;
}

function getStoredScrollPosition(
    historyState: Record<string, unknown> | null | undefined,
    key: string
) {
    const storedPositions = historyState?.[SCROLL_RESTORATION_HISTORY_STATE_KEY];

    if (!storedPositions || typeof storedPositions !== 'object') {
        return undefined;
    }

    const storedPosition = (storedPositions as Record<string, unknown>)[key];

    if (typeof storedPosition !== 'number') {
        return undefined;
    }

    return storedPosition;
}

function setStoredScrollPosition(
    historyState: Record<string, unknown> | null | undefined,
    key: string,
    position: number
) {
    if (typeof window === 'undefined') {
        return;
    }

    const storedPositions = historyState?.[SCROLL_RESTORATION_HISTORY_STATE_KEY];
    const nextState = {
        ...(historyState ?? {}),
        [SCROLL_RESTORATION_HISTORY_STATE_KEY]: {
            ...(storedPositions && typeof storedPositions === 'object' ? storedPositions : {}),
            [key]: position
        }
    };

    window.history.replaceState(nextState, '');
}

interface UseScrollRestorationOptions {
    /** Reference to the element whose scroll parent should be tracked */
    parentRef: React.RefObject<HTMLElement>;
    /** Whether scroll restoration is enabled (default: true) */
    enabled?: boolean;
    /** Whether data is currently loading. Restoration will be deferred until loading is false */
    isLoading?: boolean;
}

/**
 * Hook to automatically save and restore scroll position when navigating.
 * Works with the infinite virtual scroll by using the same parentRef to find the scrollable container.
 * Includes retry logic to handle virtual scrolling measurement delays.
 * 
 * Usage:
 * ```tsx
 * const parentRef = useRef<HTMLDivElement>(null);
 * useScrollRestoration({ parentRef, isLoading });
 * useInfiniteVirtualScroll({ parentRef, ... });
 * ```
 */
export function useScrollRestoration({parentRef, enabled = true, isLoading = false}: UseScrollRestorationOptions) {
    const location = useLocation();
    const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);
    const previousPathRef = useRef<string | null>(null);
    const latestScrollPositionRef = useRef(0);
    const lastPersistedAtRef = useRef(0);
    const lastPersistedPositionRef = useRef(0);
    const pendingPersistTimeoutRef = useRef<number | null>(null);
    const restoreTimeoutIdsRef = useRef<Set<number>>(new Set());
    const key = location.pathname + location.search;

    // Find the scroll container once the parent element is mounted
    useEffect(() => {
        if (!enabled || !parentRef.current) {
            return;
        }

        const container = getScrollParent(parentRef.current);
        setScrollContainer(container);
    }, [enabled, parentRef]);

    // Save scroll position when user scrolls
    useEffect(() => {
        if (!enabled || !scrollContainer) {
            return;
        }

        const sourceHistoryState = getCurrentHistoryState();
        const sourceHistoryEntryKey = getHistoryEntryKey(sourceHistoryState);
        const entryScopedScrollPositionKey = getEntryScopedScrollPositionKey(sourceHistoryState, key);

        const clearPendingPersist = () => {
            if (pendingPersistTimeoutRef.current === null) {
                return;
            }

            window.clearTimeout(pendingPersistTimeoutRef.current);
            pendingPersistTimeoutRef.current = null;
        };

        const persistScrollPosition = (position: number) => {
            if (entryScopedScrollPositionKey) {
                scrollPositions.set(entryScopedScrollPositionKey, position);
            }

            const currentHistoryState = getCurrentHistoryState();
            const currentHistoryEntryKey = getHistoryEntryKey(currentHistoryState);

            if (currentHistoryEntryKey === sourceHistoryEntryKey) {
                setStoredScrollPosition(currentHistoryState, key, position);
            }

            lastPersistedAtRef.current = Date.now();
            lastPersistedPositionRef.current = position;
        };

        const flushScrollPosition = ({persistToHistory = true}: {persistToHistory?: boolean} = {}) => {
            clearPendingPersist();

            if (!persistToHistory) {
                const position = latestScrollPositionRef.current;

                if (entryScopedScrollPositionKey) {
                    scrollPositions.set(entryScopedScrollPositionKey, position);
                }

                lastPersistedAtRef.current = Date.now();
                lastPersistedPositionRef.current = position;
                return;
            }

            persistScrollPosition(latestScrollPositionRef.current);
        };

        const queuePersistScrollPosition = () => {
            const now = Date.now();
            const hasLargePositionChange =
                Math.abs(latestScrollPositionRef.current - lastPersistedPositionRef.current) >= IMMEDIATE_SCROLL_POSITION_DELTA_PX;

            if (hasLargePositionChange || now - lastPersistedAtRef.current >= SCROLL_POSITION_PERSIST_INTERVAL_MS) {
                clearPendingPersist();
                persistScrollPosition(latestScrollPositionRef.current);
                return;
            }

            if (pendingPersistTimeoutRef.current !== null) {
                return;
            }

            pendingPersistTimeoutRef.current = window.setTimeout(() => {
                pendingPersistTimeoutRef.current = null;
                persistScrollPosition(latestScrollPositionRef.current);
            }, SCROLL_POSITION_PERSIST_INTERVAL_MS);
        };

        const handleScroll = () => {
            latestScrollPositionRef.current = scrollContainer.scrollTop;
            queuePersistScrollPosition();
        };
        const handlePageHide = () => {
            flushScrollPosition();
        };

        latestScrollPositionRef.current = scrollContainer.scrollTop;
        scrollContainer.addEventListener('scroll', handleScroll);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            flushScrollPosition({persistToHistory: false});
            scrollContainer.removeEventListener('scroll', handleScroll);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [enabled, key, scrollContainer]);

    // Restore scroll position when location changes and data has loaded
    useEffect(() => {
        const historyState = getCurrentHistoryState();
        const entryScopedScrollPositionKey = getEntryScopedScrollPositionKey(historyState, key);
        const savedPosition =
            (entryScopedScrollPositionKey ? scrollPositions.get(entryScopedScrollPositionKey) : undefined) ??
            getStoredScrollPosition(historyState, key);

        if (!enabled || !scrollContainer || isLoading) {
            return;
        }

        // Only restore if we're navigating to a different location and have a saved position
        if (savedPosition !== undefined && previousPathRef.current !== key) {
            previousPathRef.current = key;

            // Delay to ensure content is rendered and scroll height is correct
            // For virtual scrolling, we may need multiple attempts as the virtualizer measures items
            let attempts = 0;
            const maxAttempts = 20;

            const clearRestoreTimeouts = () => {
                for (const timeoutId of restoreTimeoutIdsRef.current) {
                    window.clearTimeout(timeoutId);
                }

                restoreTimeoutIdsRef.current.clear();
            };

            const scheduleRestore = (callback: () => void, delay: number) => {
                const timeoutId = window.setTimeout(() => {
                    restoreTimeoutIdsRef.current.delete(timeoutId);
                    callback();
                }, delay);

                restoreTimeoutIdsRef.current.add(timeoutId);
            };
            
            const attemptRestore = () => {
                attempts += 1;
                
                if (!scrollContainer) {
                    return;
                }

                const currentScroll = scrollContainer.scrollTop;
                const scrollHeight = scrollContainer.scrollHeight;
                const clientHeight = scrollContainer.clientHeight;
                const maxScroll = scrollHeight - clientHeight;

                // Check if we can actually scroll to the saved position
                if (savedPosition > maxScroll && attempts < maxAttempts) {
                    // Content hasn't fully rendered yet, try again
                    scheduleRestore(attemptRestore, 100);
                    return;
                }

                // Restore the position
                if (Math.abs(savedPosition - currentScroll) > 5) {
                    const targetPosition = Math.min(savedPosition, maxScroll);
                    scrollContainer.scrollTop = targetPosition;
                }
            };

            scheduleRestore(attemptRestore, 150);
            return () => clearRestoreTimeouts();
        }

        previousPathRef.current = key;
    }, [enabled, key, scrollContainer, isLoading]);
}
