import {useEffect, useRef, useState} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';

const VIRTUAL_LIST_WINDOW_SIZE = 1000;
const VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY = 'ghostVirtualListWindow';

function getVirtualListWindowState({
    totalItems,
    unlockedItemCount
}: {
    totalItems: number;
    unlockedItemCount: number;
}) {
    const visibleItemCount = Math.min(totalItems, unlockedItemCount);

    return {
        visibleItemCount,
        canLoadMore: totalItems > visibleItemCount
    };
}

function getNextUnlockedItemCount(unlockedItemCount: number) {
    return unlockedItemCount + VIRTUAL_LIST_WINDOW_SIZE;
}

function getVirtualListWindowHistoryKey(pathname: string, resetKey: string) {
    return `${pathname}::${resetKey}`;
}

function getStoredUnlockedItemCount(
    historyState: Record<string, unknown> | null | undefined,
    historyKey: string,
    defaultUnlockedItemCount: number = VIRTUAL_LIST_WINDOW_SIZE
) {
    const storedWindows = historyState?.[VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY];

    if (!storedWindows || typeof storedWindows !== 'object') {
        return defaultUnlockedItemCount;
    }

    const storedUnlockedItemCount = (storedWindows as Record<string, unknown>)[historyKey];

    if (typeof storedUnlockedItemCount !== 'number' || !Number.isFinite(storedUnlockedItemCount)) {
        return defaultUnlockedItemCount;
    }

    return Math.max(1, Math.floor(storedUnlockedItemCount));
}

function setStoredUnlockedItemCount(
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
        resetKey
    }: {
        resetKey?: string;
    } = {}
) {
    const {key: locationEntryKey, pathname, search} = useLocation();
    const effectiveResetKey = resetKey ?? search;
    const historyKey = getVirtualListWindowHistoryKey(pathname, effectiveResetKey);
    const [unlockedItemCount, setUnlockedItemCount] = useState(() => {
        return getStoredUnlockedItemCount(getCurrentHistoryState(), historyKey);
    });
    const previousHistoryKeyRef = useRef(historyKey);

    useEffect(() => {
        if (previousHistoryKeyRef.current !== historyKey) {
            previousHistoryKeyRef.current = historyKey;
            setUnlockedItemCount(getStoredUnlockedItemCount(getCurrentHistoryState(), historyKey));
            return;
        }

        setStoredUnlockedItemCount(getCurrentHistoryState(), historyKey, unlockedItemCount);
    }, [historyKey, locationEntryKey, unlockedItemCount]);

    const {visibleItemCount, canLoadMore} = getVirtualListWindowState({
        totalItems,
        unlockedItemCount
    });

    return {
        visibleItemCount,
        canLoadMore,
        loadMore: () => setUnlockedItemCount(current => getNextUnlockedItemCount(current))
    };
}
