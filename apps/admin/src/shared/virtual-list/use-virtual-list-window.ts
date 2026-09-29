import { readListReturnState, rememberListReturnState } from './list-return-state';
import { useEffect, useState } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';

const DEFAULT_VIRTUAL_LIST_WINDOW_SIZE = 1000;
const VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY = 'ghostVirtualListWindow';

function getVirtualListWindowState({
  totalItems,
  unlockedItemCount,
}: {
  totalItems: number;
  unlockedItemCount: number;
}) {
  const visibleItemCount = Math.min(totalItems, unlockedItemCount);

  return {
    visibleItemCount,
    canLoadMore: totalItems > visibleItemCount,
  };
}

function getNextUnlockedItemCount(unlockedItemCount: number, windowSize: number) {
  return unlockedItemCount + windowSize;
}

function getVirtualListWindowHistoryKey(pathname: string, resetKey: string) {
  return `${pathname}::${resetKey}`;
}

function getStoredUnlockedItemCount(
  historyState: Record<string, unknown> | null | undefined,
  historyKey: string,
  defaultUnlockedItemCount: number,
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
  unlockedItemCount: number,
) {
  if (typeof window === 'undefined') {
    return;
  }

  const storedWindows = historyState?.[VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY];
  const nextState = {
    ...(historyState ?? {}),
    [VIRTUAL_LIST_WINDOW_HISTORY_STATE_KEY]: {
      ...(storedWindows && typeof storedWindows === 'object' ? storedWindows : {}),
      [historyKey]: unlockedItemCount,
    },
  };

  window.history.replaceState(nextState, '');
}

function getCurrentHistoryState(): Record<string, unknown> | null | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  // `window.history.state` is typed `any`; it is a structured-clone value we
  // only ever read from defensively, so narrow it to a generic record.
  return window.history.state as Record<string, unknown> | null;
}

export interface UseVirtualListWindowOptions {
  /**
   * When this key changes the unlocked window resets to a single page.
   * Defaults to the current `location.search`, so changing filters/queries
   * resets the window. Pass a stable key to survive query changes.
   */
  resetKey?: string;
  /**
   * Number of rows unlocked per page, and the initial window size
   * (default: 1000).
   */
  windowSize?: number;
}

export interface UseVirtualListWindowResult {
  /** How many rows should currently be shown (capped at the unlocked window). */
  visibleItemCount: number;
  /** Whether there are more rows to reveal beyond the current window. */
  canLoadMore: boolean;
  /** Reveal the next window of rows. */
  loadMore: () => void;
}

/**
 * Caps how many rows of a (possibly huge) list are rendered at once, unlocking
 * another window on demand. The unlocked size is persisted per history entry so
 * that navigating back restores the previously expanded window.
 *
 * Fully data-source agnostic — the caller owns `totalItems` and decides how the
 * returned `visibleItemCount` maps onto its data.
 */
export function useVirtualListWindow(
  totalItems: number,
  { resetKey, windowSize = DEFAULT_VIRTUAL_LIST_WINDOW_SIZE }: UseVirtualListWindowOptions = {},
): UseVirtualListWindowResult {
  const { key: locationEntryKey, pathname, search } = useLocation();
  const effectiveResetKey = resetKey ?? search;
  const historyKey = getVirtualListWindowHistoryKey(pathname, effectiveResetKey);
  const readUnlockedItemCount = () =>
    getStoredUnlockedItemCount(
      getCurrentHistoryState(),
      historyKey,
      readListReturnState(getCurrentHistoryState(), pathname + search)?.unlockedItemCount ??
        windowSize,
    );
  const [windowState, setWindowState] = useState(() => ({
    historyKey,
    entryKey: locationEntryKey,
    unlockedItemCount: readUnlockedItemCount(),
  }));
  let { unlockedItemCount } = windowState;

  // Commit the new window together with navigation. Resetting it in an effect
  // lets the virtualizer measure old rows after scroll restoration, which can
  // move a fresh sidebar entry back down the list.
  if (
    windowState.historyKey !== historyKey ||
    (resetKey === undefined && windowState.entryKey !== locationEntryKey)
  ) {
    unlockedItemCount = readUnlockedItemCount();
    setWindowState({ historyKey, entryKey: locationEntryKey, unlockedItemCount });
  }

  useEffect(() => {
    setStoredUnlockedItemCount(getCurrentHistoryState(), historyKey, unlockedItemCount);
    rememberListReturnState(pathname + search, { unlockedItemCount });
  }, [historyKey, locationEntryKey, unlockedItemCount, pathname, search]);

  const { visibleItemCount, canLoadMore } = getVirtualListWindowState({
    totalItems,
    unlockedItemCount,
  });

  return {
    visibleItemCount,
    canLoadMore,
    loadMore: () =>
      setWindowState((current) => ({
        ...current,
        unlockedItemCount: getNextUnlockedItemCount(current.unlockedItemCount, windowSize),
      })),
  };
}
