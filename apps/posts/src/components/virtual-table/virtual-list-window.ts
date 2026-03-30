import {useEffect, useRef, useState} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';

export const VIRTUAL_LIST_WINDOW_SIZE = 1000;
export const VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY = 'ghostVirtualListWindow';

export function getSafeVirtualListWindowSize(windowSize: number = VIRTUAL_LIST_WINDOW_SIZE) {
    const normalizedWindowSize = Number.isFinite(windowSize) ? Math.floor(windowSize) : VIRTUAL_LIST_WINDOW_SIZE;

    return Math.max(1, normalizedWindowSize);
}

export function getVirtualListWindowState({
    totalItems,
    unlockedItemCount
}: {
    totalItems: number;
    unlockedItemCount: number;
}) {
    const visibleItemCount = Math.min(totalItems, unlockedItemCount);

    return {
        visibleItemCount,
        canFetchMore: totalItems > visibleItemCount
    };
}

export function getNextUnlockedItemCount(
    unlockedItemCount: number,
    windowSize: number = VIRTUAL_LIST_WINDOW_SIZE
) {
    return unlockedItemCount + getSafeVirtualListWindowSize(windowSize);
}

export function getVirtualListWindowHistoryKey(pathname: string, resetKey: string) {
    return `${pathname}::${resetKey}`;
}

export function getStoredUnlockedItemCount(
    historyState: Record<string, unknown> | null | undefined,
    historyKey: string,
    defaultUnlockedItemCount: number
) {
    const storedWindows = historyState?.[VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY];

    if (!storedWindows || typeof storedWindows !== 'object') {
        return defaultUnlockedItemCount;
    }

    const storedUnlockedItemCount = (storedWindows as Record<string, unknown>)[historyKey];

    if (typeof storedUnlockedItemCount !== 'number' || !Number.isFinite(storedUnlockedItemCount)) {
        return defaultUnlockedItemCount;
    }

    return getSafeVirtualListWindowSize(storedUnlockedItemCount);
}

export function setStoredUnlockedItemCount(
    historyState: Record<string, unknown> | null | undefined,
    historyKey: string,
    unlockedItemCount: number
) {
    if (typeof window === 'undefined') {
        return;
    }

    const storedWindows = historyState?.[VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY];
    const nextState = {
        ...(historyState ?? {}),
        [VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY]: {
            ...(storedWindows && typeof storedWindows === 'object' ? storedWindows : {}),
            [historyKey]: unlockedItemCount
        }
    };

    window.history.replaceState(nextState, '');
}

function getCurrentHistoryState() {
    if (typeof window === 'undefined') {
        return undefined;
    }

    return window.history.state;
}

export function useVirtualListWindow(
    totalItems: number,
    {
        resetKey,
        windowSize = VIRTUAL_LIST_WINDOW_SIZE
    }: {
        resetKey?: string;
        windowSize?: number;
    } = {}
) {
    const {key: locationEntryKey, pathname, search} = useLocation();
    const safeWindowSize = getSafeVirtualListWindowSize(windowSize);
    const effectiveResetKey = resetKey ?? search;
    const historyKey = getVirtualListWindowHistoryKey(pathname, effectiveResetKey);
    const [unlockedItemCount, setUnlockedItemCount] = useState(() => {
        return getStoredUnlockedItemCount(getCurrentHistoryState(), historyKey, safeWindowSize);
    });
    const previousHistoryKeyRef = useRef(historyKey);

    useEffect(() => {
        if (previousHistoryKeyRef.current !== historyKey) {
            previousHistoryKeyRef.current = historyKey;
            setUnlockedItemCount(getStoredUnlockedItemCount(getCurrentHistoryState(), historyKey, safeWindowSize));
            return;
        }

        setStoredUnlockedItemCount(getCurrentHistoryState(), historyKey, unlockedItemCount);
    }, [historyKey, locationEntryKey, safeWindowSize, unlockedItemCount]);

    const {visibleItemCount, canFetchMore} = getVirtualListWindowState({
        totalItems,
        unlockedItemCount
    });

    return {
        visibleItemCount,
        canFetchMore,
        fetchMore: () => setUnlockedItemCount(current => getNextUnlockedItemCount(current, safeWindowSize))
    };
}
