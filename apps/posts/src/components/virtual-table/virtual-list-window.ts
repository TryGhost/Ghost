import {useEffect, useState} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';

export const VIRTUAL_LIST_WINDOW_SIZE = 1000;
export const VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY = 'ghostVirtualListWindow';

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
    return unlockedItemCount + windowSize;
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

    if (typeof storedUnlockedItemCount !== 'number') {
        return defaultUnlockedItemCount;
    }

    return storedUnlockedItemCount;
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
    const {pathname, search} = useLocation();
    const effectiveResetKey = resetKey ?? search;
    const historyKey = getVirtualListWindowHistoryKey(pathname, effectiveResetKey);
    const [unlockedItemCount, setUnlockedItemCount] = useState(() => {
        return getStoredUnlockedItemCount(getCurrentHistoryState(), historyKey, windowSize);
    });

    useEffect(() => {
        setUnlockedItemCount(getStoredUnlockedItemCount(getCurrentHistoryState(), historyKey, windowSize));
    }, [historyKey, windowSize]);

    useEffect(() => {
        setStoredUnlockedItemCount(getCurrentHistoryState(), historyKey, unlockedItemCount);
    }, [historyKey, unlockedItemCount]);

    const {visibleItemCount, canFetchMore} = getVirtualListWindowState({
        totalItems,
        unlockedItemCount
    });

    return {
        visibleItemCount,
        canFetchMore,
        fetchMore: () => setUnlockedItemCount(current => getNextUnlockedItemCount(current, windowSize))
    };
}
