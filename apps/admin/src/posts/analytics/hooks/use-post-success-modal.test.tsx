import { HttpResponse, http } from 'msw';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { test as baseTest, beforeEach, describe, expect, vi } from 'vitest';
import { post, type Post } from '@tryghost/test-data';
import type { QueryClient } from '@tanstack/react-query';
import type { SetupServer } from 'msw/node';
import { serverFixture } from '@test-utils/fixtures/msw';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import { usePostSuccessModal } from '@/posts/analytics/hooks/use-post-success-modal';

const { mockUseFeatureFlag } = vi.hoisted(() => ({
  mockUseFeatureFlag: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/hooks', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/hooks')>(
    '@tryghost/admin-x-framework/hooks',
  );
  return {
    ...actual,
    useFeatureFlag: (flag: string) => mockUseFeatureFlag(flag) as boolean,
  };
});

// Mock the shared analytics data hook (not HTTP)
vi.mock('@/shared/analytics/use-analytics-data', () => ({
  useAnalyticsData: vi.fn(),
}));
const mockUseAnalyticsData = vi.mocked(
  await import('@/shared/analytics/use-analytics-data'),
).useAnalyticsData;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const POSTS_API_URL = '/ghost/api/admin/posts/*';

const buildPost = (overrides: Partial<Post> = {}) => post({ id: 'post-123', ...overrides });

function mockPosts(server: SetupServer, posts: Post[]) {
  server.use(http.get(POSTS_API_URL, () => HttpResponse.json({ posts })));
}

const test = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
}>({
  ...serverFixture,
  ...queryClientFixtures,
});

describe('usePostSuccessModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(false);

    // Default mocks
    mockUseAnalyticsData.mockReturnValue({
      site: {
        title: 'Test Site',
        icon: 'https://example.com/icon.png',
      },
    } as unknown as ReturnType<typeof mockUseAnalyticsData>);

    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('initializes with modal closed and no data', ({ server, wrapper }) => {
    mockPosts(server, []);

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.post).toBeUndefined();
    expect(result.current.postCount).toBe(null);
    expect(result.current.showPostCount).toBe(false);
    expect(result.current.modalProps).toBe(null);
  });

  test('does not open modal when localStorage is empty', ({ server, wrapper }) => {
    mockPosts(server, []);
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    expect(result.current.isModalOpen).toBe(false);
  });

  test('handles invalid JSON in localStorage gracefully', ({ server, wrapper }) => {
    mockPosts(server, []);
    mockLocalStorage.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    expect(result.current.isModalOpen).toBe(false);
  });

  test('ignores localStorage errors gracefully', ({ server, wrapper }) => {
    mockPosts(server, []);
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('LocalStorage error');
    });

    expect(() => {
      renderHook(() => usePostSuccessModal(), { wrapper });
    }).not.toThrow();
  });

  test('creates modal props when post data is available', async ({ server, wrapper }) => {
    const testPost = buildPost({
      title: 'Test Post',
      url: 'https://example.com/test-post',
      feature_image: 'https://example.com/image.jpg',
      published_at: '2023-12-01T12:00:00Z',
      authors: [{ name: 'John Doe' }],
      email: { email_count: 100, opened_count: 30 },
      newsletter: { id: 'newsletter-123', name: 'Weekly Newsletter' },
    });

    mockPosts(server, [testPost]);

    // Simulate localStorage containing published post data
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(result.current.post).toEqual(testPost);
      expect(result.current.isModalOpen).toBe(true);
    });
  });

  test('opens modal when localStorage contains valid post data', async ({ server, wrapper }) => {
    const testPost = buildPost({
      title: 'Published Post',
    });

    mockPosts(server, [testPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(result.current.isModalOpen).toBe(true);
    });
  });

  test('cleans up localStorage when modal opens', async ({ server, wrapper }) => {
    const testPost = buildPost({
      title: 'Test Post',
    });

    mockPosts(server, [testPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    // Wait for the modal to open (localStorage data consumed)
    await waitFor(() => {
      expect(result.current.isModalOpen).toBe(true);
    });

    // Behavior test: localStorage data should be consumed and not trigger again
    // Clear the localStorage mock and verify subsequent renders don't trigger
    mockLocalStorage.getItem.mockReturnValue(null);

    // Close modal - should close properly
    act(() => {
      result.current.closeModal();
    });

    expect(result.current.isModalOpen).toBe(false);
  });

  test('handles post count response', async ({ server, wrapper }) => {
    // Conditional handler: count endpoint vs regular post data endpoint
    server.use(
      http.get(POSTS_API_URL, ({ request }) => {
        const url = new URL(request.url);
        const fields = url.searchParams.get('fields');

        if (fields === 'id') {
          // Post count endpoint
          return HttpResponse.json({
            meta: {
              pagination: {
                total: 42,
              },
            },
          });
        }

        // Regular post data endpoint
        return HttpResponse.json({ posts: [] });
      }),
    );

    // Simulate localStorage containing published post data
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(result.current.postCount).toBe(42);
      expect(result.current.showPostCount).toBe(true);
    });
  });

  test('closes modal correctly', ({ server, wrapper }) => {
    mockPosts(server, []);

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    result.current.closeModal();

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.postCount).toBe(null);
  });

  test('handles email-only posts', async ({ server, wrapper }) => {
    const testPost = buildPost({
      title: 'Email Only Post',
      email_only: true,
      email: { email_count: 50, opened_count: 15 },
    });

    mockPosts(server, [testPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(result.current.post?.email_only).toBe(true);
    });
  });

  test('handles multiple authors', async ({ server, wrapper }) => {
    const testPost = buildPost({
      title: 'Test Post',
      authors: [{ name: 'John Doe' }, { name: 'Jane Smith' }, { name: 'Bob Johnson' }],
    });

    mockPosts(server, [testPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(result.current.post?.authors).toHaveLength(3);
    });
  });

  test('handles posts without authors', async ({ server, wrapper }) => {
    const testPost = buildPost({
      title: 'Test Post',
    });

    mockPosts(server, [testPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(result.current.post?.authors).toBeUndefined();
    });
  });

  test('creates modal props with correct email data for different subscriber counts', async ({
    server,
    wrapper,
  }) => {
    // Test single subscriber - behavior: modal props should be created
    const singleSubscriberPost = buildPost({
      title: 'Single Subscriber Post',
      email: { email_count: 1, opened_count: 0 },
      newsletter: { id: 'newsletter-123', name: 'Test Newsletter' },
    });

    mockPosts(server, [singleSubscriberPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result: singleResult } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(singleResult.current.modalProps).toBeTruthy();
      expect(singleResult.current.modalProps?.emailOnly).toBeFalsy();
      expect(singleResult.current.modalProps?.description).toBeTruthy();
    });

    // Test multiple subscribers - behavior: modal props should be created
    const multipleSubscribersPost = buildPost({
      id: 'post-456',
      title: 'Multiple Subscribers Post',
      email: { email_count: 100, opened_count: 30 },
      newsletter: { id: 'newsletter-123', name: 'Test Newsletter' },
    });

    mockPosts(server, [multipleSubscribersPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-456',
        type: 'post',
      }),
    );

    const { result: multipleResult } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(multipleResult.current.modalProps).toBeTruthy();
      expect(multipleResult.current.modalProps?.emailOnly).toBeFalsy();
      expect(multipleResult.current.modalProps?.description).toBeTruthy();
    });
  });

  test('creates appropriate modal props for different post types', async ({ server, wrapper }) => {
    // Test email-only post - behavior: should set emailOnly flag
    const emailOnlyPost = buildPost({
      id: 'email-post',
      title: 'Email Only Post',
      email_only: true,
      email: { email_count: 50, opened_count: 15 },
    });

    mockPosts(server, [emailOnlyPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'email-post',
        type: 'post',
      }),
    );

    const { result: emailResult } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(emailResult.current.modalProps?.emailOnly).toBe(true);
      expect(emailResult.current.modalProps?.description).toBeTruthy();
    });

    // Test published post with email - behavior: should not be emailOnly
    const publishedPost = buildPost({
      id: 'published-post',
      title: 'Published Post',
      email: { email_count: 100, opened_count: 30 },
    });

    mockPosts(server, [publishedPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'published-post',
        type: 'post',
      }),
    );

    const { result: publishedResult } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(publishedResult.current.modalProps?.emailOnly).toBeFalsy();
      expect(publishedResult.current.modalProps?.description).toBeTruthy();
    });

    // Test published post without email - behavior: should not be emailOnly
    const publishedOnlyPost = buildPost({
      id: 'published-only',
      title: 'Published Only Post',
    });

    mockPosts(server, [publishedOnlyPost]);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'published-only',
        type: 'post',
      }),
    );

    const { result: publishedOnlyResult } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(publishedOnlyResult.current.modalProps?.emailOnly).toBeFalsy();
      expect(publishedOnlyResult.current.modalProps?.description).toBeTruthy();
    });
  });

  test('uses in-progress copy for a post and email when improved sending UI is enabled', async ({
    server,
    wrapper,
  }) => {
    mockUseFeatureFlag.mockReturnValue(true);
    mockPosts(server, [
      buildPost({
        email: { email_count: 100, opened_count: 0 },
        newsletter: { id: 'newsletter-123', name: 'Weekly Newsletter' },
      }),
    ]);
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ id: 'post-123', type: 'post' }));

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => expect(result.current.modalProps).toBeTruthy());
    render(result.current.modalProps?.description);
    expect(
      screen.getByText(/Your post was published on your site and is being sent to/),
    ).toBeTruthy();
  });

  test('uses in-progress copy for an email-only send when improved sending UI is enabled', async ({
    server,
    wrapper,
  }) => {
    mockUseFeatureFlag.mockReturnValue(true);
    mockPosts(server, [
      buildPost({
        email_only: true,
        email: { email_count: 50, opened_count: 0 },
      }),
    ]);
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ id: 'post-123', type: 'post' }));

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => expect(result.current.modalProps).toBeTruthy());
    render(result.current.modalProps?.description);
    expect(screen.getByText(/Your email is being sent to/)).toBeTruthy();
  });

  test('handles loading state', ({ server, wrapper }) => {
    mockPosts(server, []);

    // Without localStorage data, no API calls are made
    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    expect(result.current.post).toBeUndefined();
  });

  test('handles error state', ({ server, wrapper }) => {
    // Test when the mocked API returns an error
    server.use(
      http.get(POSTS_API_URL, () => HttpResponse.json({ error: 'API Error' }, { status: 500 })),
    );

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    expect(result.current.post).toBeUndefined();
  });

  test('handles empty posts response', async ({ server, wrapper }) => {
    // Empty posts array
    mockPosts(server, []);

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: 'post-123',
        type: 'post',
      }),
    );

    const { result } = renderHook(() => usePostSuccessModal(), { wrapper });

    await waitFor(() => {
      expect(result.current.post).toBeUndefined();
    });
  });
});
