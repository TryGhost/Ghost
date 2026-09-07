import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withMockFetch } from '../../../utils/mock-fetch';
import { restoreLocation, stubLocation } from '../../../utils/stub-location';

const unauthorized = {
  json: { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
  headers: { 'content-type': 'application/json' },
  status: 401,
  ok: false,
};

const optedOut = { defaultErrorHandler: false, requestOptions: { sessionExpiryRedirect: false } };

const readCurrentUser = (mock: { calls: unknown[][] }) =>
  mock.calls.some(([url]) => String(url).includes('/users/me/'));

// The redirect-once guard is module state, so each test re-imports a fresh
// hooks module. test-utils is re-imported alongside it, otherwise its
// FrameworkProvider comes from the previous registry and its context is a
// different object than the one the hooks module reads.
const loadModules = async () => {
  const [{ createInfiniteQuery, createQuery, createQueryWithId }, testUtils] = await Promise.all([
    import('../../../../src/utils/api/hooks'),
    import('../../../../src/test/test-utils'),
  ]);

  return {
    useTestQuery: createQuery<unknown>({ dataType: 'test', path: '/test/' }),
    useTestInfiniteQuery: createInfiniteQuery<unknown>({
      dataType: 'test-infinite',
      path: '/test/',
      returnData: (originalData) => originalData,
    }),
    useTestQueryWithId: createQueryWithId<unknown>({
      dataType: 'test-with-id',
      path: (id) => `/test/${id}/`,
    }),
    createTestQueryClient: testUtils.createTestQueryClient,
    renderHookWithProviders: testUtils.renderHookWithProviders,
  };
};

describe('permission read session expiry', () => {
  beforeEach(() => {
    vi.resetModules();
    stubLocation();
  });

  afterEach(() => {
    restoreLocation();
  });

  it('redirects on an expired session when a query omits the opt-out', async () => {
    const { useTestQuery, createTestQueryClient, renderHookWithProviders } = await loadModules();

    await withMockFetch(unauthorized, async (mock) => {
      const { result } = renderHookWithProviders(
        () => useTestQuery({ defaultErrorHandler: false }),
        { queryClient: createTestQueryClient() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      await waitFor(() => expect(readCurrentUser(mock)).toBe(true));

      expect(window.location.replace).toHaveBeenCalledExactlyOnceWith('/ghost/');
    });
  });

  it('leaves an expired session to the caller when a query opts out', async () => {
    const { useTestQuery, createTestQueryClient, renderHookWithProviders } = await loadModules();

    await withMockFetch(unauthorized, async (mock) => {
      const { result } = renderHookWithProviders(() => useTestQuery(optedOut), {
        queryClient: createTestQueryClient(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      await waitFor(() => expect(readCurrentUser(mock)).toBe(true));

      expect(window.location.replace).not.toHaveBeenCalled();
    });
  });

  it('leaves an expired session to the caller when an infinite query opts out', async () => {
    const { useTestInfiniteQuery, createTestQueryClient, renderHookWithProviders } =
      await loadModules();

    await withMockFetch(unauthorized, async (mock) => {
      const { result } = renderHookWithProviders(() => useTestInfiniteQuery(optedOut), {
        queryClient: createTestQueryClient(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      await waitFor(() => expect(readCurrentUser(mock)).toBe(true));

      expect(window.location.replace).not.toHaveBeenCalled();
    });
  });

  it('leaves an expired session to the caller when a query by id opts out', async () => {
    const { useTestQueryWithId, createTestQueryClient, renderHookWithProviders } =
      await loadModules();

    await withMockFetch(unauthorized, async (mock) => {
      const { result } = renderHookWithProviders(() => useTestQueryWithId('abc123', optedOut), {
        queryClient: createTestQueryClient(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      await waitFor(() => expect(readCurrentUser(mock)).toBe(true));

      expect(window.location.replace).not.toHaveBeenCalled();
    });
  });
});
