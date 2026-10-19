/** A breadcrumb carries only list state, never another entry's router key/index. */
interface ListReturnState {
  path: string;
  scrollPosition?: number;
  unlockedItemCount?: number;
}

const lastListStates = new Map<string, ListReturnState>();

function normalizePath(path: string): string {
  const [pathname, search] = path.split('?');
  const params = new URLSearchParams(search);
  params.sort();
  return `${pathname.replace(/\/$/, '')}?${params.toString()}`;
}

export function rememberListReturnState(path: string, state: Omit<ListReturnState, 'path'>): void {
  const key = normalizePath(path);
  lastListStates.set(key, { ...lastListStates.get(key), ...state, path: key });
}

export function getListReturnNavigationState(path: string) {
  const state = lastListStates.get(normalizePath(path));
  return state ? { listReturn: { ...state } } : undefined;
}

export function readListReturnState(
  historyState: Record<string, unknown> | null | undefined,
  path: string,
): Omit<ListReturnState, 'path'> | undefined {
  const userState = historyState?.usr;
  if (!userState || typeof userState !== 'object' || !('listReturn' in userState)) {
    return undefined;
  }
  const state = userState.listReturn;
  if (
    !state ||
    typeof state !== 'object' ||
    !('path' in state) ||
    state.path !== normalizePath(path)
  ) {
    return undefined;
  }
  const finiteNumber = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
  return {
    scrollPosition: finiteNumber('scrollPosition' in state ? state.scrollPosition : undefined),
    unlockedItemCount: finiteNumber(
      'unlockedItemCount' in state ? state.unlockedItemCount : undefined,
    ),
  };
}
