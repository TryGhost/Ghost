import { vi } from 'vitest';

/** The react-query result fields the views read, in the combinations react-query produces. */
export type QueryState<T> = {
  data: T | undefined;
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

export function loadingQuery<T>(): QueryState<T> {
  return { data: undefined, error: null, isError: false, isLoading: true, refetch: vi.fn() };
}

export function loadedQuery<T>(data: T): QueryState<T> {
  return { data, error: null, isError: false, isLoading: false, refetch: vi.fn() };
}

export function failedQuery<T>(error: unknown): QueryState<T> {
  return { data: undefined, error, isError: true, isLoading: false, refetch: vi.fn() };
}

/** A refetch that failed after an earlier success keeps the cached data. */
export function refetchFailedQuery<T>(data: T, error: unknown): QueryState<T> {
  return { data, error, isError: true, isLoading: false, refetch: vi.fn() };
}
