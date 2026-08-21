import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, renderHookWithProviders } from '../../../src/test/test-utils';
import { useImportContentCSV } from '../../../src/api/posts';
import { withMockFetch } from '../../utils/mock-fetch';

describe('posts api', () => {
  it('imports CSV content via the posts upload endpoint', async () => {
    const file = new File(['title\nHello'], 'posts.csv', { type: 'text/csv' });

    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useImportContentCSV());

      await act(async () => {
        await result.current.mutateAsync(file);
      });

      expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/posts/upload/');
      expect(mock.calls[0][1].method).toBe('POST');
      expect(mock.calls[0][1].body).toBeInstanceOf(FormData);
      expect(mock.calls[0][1].body.get('postsfile')).toBe(file);
      expect(mock.calls[0][1].headers).not.toHaveProperty('content-type');
    });
  });

  it('does not retry content CSV import uploads after transient network failures', async () => {
    const queryClient = createTestQueryClient();
    const file = new File(['title\nHello'], 'posts.csv', { type: 'text/csv' });
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.reject(new TypeError('Network failed')),
    );

    vi.useFakeTimers();
    globalThis.fetch = mockFetch as typeof globalThis.fetch;

    try {
      const { result } = renderHookWithProviders(() => useImportContentCSV(), { queryClient });
      const importPromise = result.current.mutateAsync(file).catch((error) => error);

      await vi.advanceTimersByTimeAsync(600);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      await expect(importPromise).resolves.toBeInstanceOf(Error);
    } finally {
      globalThis.fetch = originalFetch;
      vi.useRealTimers();
    }
  });
});
