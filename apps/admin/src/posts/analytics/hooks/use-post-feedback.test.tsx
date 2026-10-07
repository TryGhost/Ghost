import { test as baseTest, describe, expect } from 'vitest';
import { HttpResponse, http } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import type { SetupServer } from 'msw/node';
import { serverFixture } from '@test-utils/fixtures/msw';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import { usePostFeedback } from '@/posts/analytics/hooks/use-post-feedback';

const FEEDBACK_API_URL = '/ghost/api/admin/feedback/*';

const test = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
}>({
  ...serverFixture,
  ...queryClientFixtures,
});

describe('usePostFeedback', () => {
  const testPostId = 'post-123';

  test('returns empty feedback array when no feedback exists', async ({ server, wrapper }) => {
    server.use(http.get(FEEDBACK_API_URL, () => HttpResponse.json({ feedback: [] })));

    const { result } = renderHook(() => usePostFeedback(testPostId), { wrapper });

    await waitFor(() => {
      expect(result.current.feedback).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  test('returns feedback data when successful', async ({ server, wrapper }) => {
    const mockFeedback = [
      { id: '1', score: 1 },
      { id: '2', score: 0 },
    ];

    server.use(http.get(FEEDBACK_API_URL, () => HttpResponse.json({ feedback: mockFeedback })));

    const { result } = renderHook(() => usePostFeedback(testPostId), { wrapper });

    await waitFor(() => {
      expect(result.current.feedback).toHaveLength(2);
      expect(result.current.feedback[0]).toMatchObject({ id: '1', score: 1 });
      expect(result.current.feedback[1]).toMatchObject({ id: '2', score: 0 });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  test('handles positive feedback filter', async ({ server, wrapper }) => {
    server.use(
      http.get(FEEDBACK_API_URL, () =>
        HttpResponse.json({
          feedback: [
            { id: '1', score: 1 },
            { id: '3', score: 1 },
          ],
        }),
      ),
    );

    const { result } = renderHook(() => usePostFeedback(testPostId, 1), { wrapper });

    await waitFor(() => {
      expect(result.current.feedback).toHaveLength(2);
      expect(result.current.feedback[0]).toMatchObject({ id: '1', score: 1 });
      expect(result.current.feedback[1]).toMatchObject({ id: '3', score: 1 });
    });
  });

  test('handles negative feedback filter', async ({ server, wrapper }) => {
    const negativeFeedback = [{ id: '2', score: 0, message: 'Not helpful' }];

    server.use(
      http.get(FEEDBACK_API_URL, ({ request }) => {
        if (new URL(request.url).searchParams.get('score') === '0') {
          return HttpResponse.json({ feedback: negativeFeedback });
        }
        return HttpResponse.json({ feedback: [] });
      }),
    );

    const { result } = renderHook(() => usePostFeedback(testPostId, 0), { wrapper });

    await waitFor(() => {
      expect(result.current.feedback).toEqual(negativeFeedback);
    });
  });

  test('handles server errors gracefully', async ({ server, wrapper }) => {
    server.use(
      http.get(FEEDBACK_API_URL, () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => usePostFeedback(testPostId), { wrapper });

    await waitFor(() => {
      expect(result.current.feedback).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeDefined();
    });
  });
});
