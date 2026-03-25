import {useEffect, useState} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';

export const VIRTUAL_LIST_WINDOW_SIZE = 1000;

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
    const {search} = useLocation();
    const effectiveResetKey = resetKey ?? search;
    const [unlockedItemCount, setUnlockedItemCount] = useState(windowSize);

    useEffect(() => {
        setUnlockedItemCount(windowSize);
    }, [effectiveResetKey, windowSize]);

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
