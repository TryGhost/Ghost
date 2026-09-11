import { act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, renderHookWithProviders } from '../../../src/test/test-utils';
import {
  useAddPost,
  useEditPost,
  useEditorPost,
  useImportContentCSV,
  usePost,
} from '../../../src/api/posts';
import { withMockFetch } from '../../utils/mock-fetch';

// The Ember editor's exact include list — writes must re-request everything
const ALL_INCLUDES =
  'tags,authors,authors.roles,email,tiers,newsletter,count.clicks,post_revisions,post_revisions.author';

const requestUrl = (mock: any) => new URL(mock.calls[0][0] as string);

const requestParams = (mock: any) => Object.fromEntries(requestUrl(mock).searchParams.entries());

const requestBody = (mock: any) => JSON.parse(mock.calls[0][1].body as string);

describe('posts api', () => {
  it('reads a single post with both content formats', async () => {
    await withMockFetch(
      {
        json: {
          posts: [{ id: 'post-1', title: 'Hello', slug: 'hello', url: '/hello/' }],
          // the permissions gate fetches the current user through the same mock
          users: [{ id: 'user-1', roles: [] }],
        },
        headers: { 'content-type': 'application/json' },
      },
      async (mock) => {
        const { result } = renderHookWithProviders(() => usePost('post-1'));

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const postsCall = mock.calls.find(([input]: [unknown]) =>
          String(input).includes('/posts/post-1/'),
        );
        const postsUrl = new URL(postsCall[0] as string);
        expect(postsUrl.pathname).toBe('/ghost/api/admin/posts/post-1/');
        expect(Object.fromEntries(postsUrl.searchParams.entries())).toEqual({
          formats: 'mobiledoc,lexical',
        });
      },
    );
  });

  it('reads an editor post with revision history', async () => {
    await withMockFetch(
      {
        json: {
          posts: [{ id: 'post-1', title: 'Hello', slug: 'hello', url: '/hello/' }],
          users: [{ id: 'user-1', roles: [] }],
        },
        headers: { 'content-type': 'application/json' },
      },
      async (mock) => {
        const { result } = renderHookWithProviders(() =>
          useEditorPost('post-1', {
            searchParams: { formats: 'html', include: 'tags' },
          }),
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const postsCall = mock.calls.find(([input]: [unknown]) =>
          String(input).includes('/posts/post-1/'),
        );
        expect(Object.fromEntries(new URL(postsCall[0] as string).searchParams.entries())).toEqual({
          formats: 'mobiledoc,lexical',
          include: ALL_INCLUDES,
        });
      },
    );
  });

  it('preserves explicit params on generic post reads', async () => {
    await withMockFetch(
      {
        json: {
          posts: [{ id: 'post-1', title: 'Hello', slug: 'hello', url: '/hello/' }],
          users: [{ id: 'user-1', roles: [] }],
        },
        headers: { 'content-type': 'application/json' },
      },
      async (mock) => {
        const { result } = renderHookWithProviders(() =>
          usePost('post-1', {
            searchParams: { formats: 'html', include: 'count.positive_feedback' },
          }),
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const postsCall = mock.calls.find(([input]: [unknown]) =>
          String(input).includes('/posts/post-1/'),
        );
        expect(Object.fromEntries(new URL(postsCall[0] as string).searchParams.entries())).toEqual({
          formats: 'html',
          include: 'count.positive_feedback',
        });
      },
    );
  });

  it('imports CSV content via the posts upload endpoint', async () => {
    const file = new File(['title\nHello'], 'posts.csv', { type: 'text/csv' });

    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useImportContentCSV());

      await act(async () => {
        await result.current.mutateAsync({
          file,
          mapping: { Headline: 'title', Body: '', Published: 'published_at' },
        });
      });

      expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/posts/upload/');
      expect(mock.calls[0][1].method).toBe('POST');
      expect(mock.calls[0][1].body).toBeInstanceOf(FormData);
      expect(mock.calls[0][1].body.get('postsfile')).toBe(file);
      expect(mock.calls[0][1].body.get('mapping[Headline]')).toBe('title');
      expect(mock.calls[0][1].body.get('mapping[Body]')).toBe('');
      expect(mock.calls[0][1].body.get('mapping[Published]')).toBe('published_at');
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
      const importPromise = result.current
        .mutateAsync({ file, mapping: { title: 'title' } })
        .catch((error) => error);

      await vi.advanceTimersByTimeAsync(600);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      await expect(importPromise).resolves.toBeInstanceOf(Error);
    } finally {
      globalThis.fetch = originalFetch;
      vi.useRealTimers();
    }
  });

  it('creates a draft through the posts endpoint with the write contract params', async () => {
    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useAddPost());

      await act(async () => {
        await result.current.mutateAsync({
          post: { title: '(Untitled)', status: 'draft', lexical: '{"root":{}}' },
        });
      });

      expect(requestUrl(mock).pathname).toBe('/ghost/api/admin/posts/');
      expect(mock.calls[0][1].method).toBe('POST');
      expect(requestParams(mock)).toEqual({
        formats: 'mobiledoc,lexical',
        include: ALL_INCLUDES,
      });
      expect(requestBody(mock)).toEqual({
        posts: [{ title: '(Untitled)', status: 'draft', lexical: '{"root":{}}' }],
      });
    });
  });

  it('autosaves a draft in the background without forcing a revision', async () => {
    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useEditPost());

      await act(async () => {
        await result.current.mutateAsync({
          post: {
            id: 'post-1',
            title: 'Draft in progress',
            status: 'draft',
            lexical: '{"root":{}}',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        });
      });

      expect(requestUrl(mock).pathname).toBe('/ghost/api/admin/posts/post-1/');
      expect(mock.calls[0][1].method).toBe('PUT');
      expect(requestParams(mock)).toEqual({
        formats: 'mobiledoc,lexical',
        include: ALL_INCLUDES,
      });
      expect(requestBody(mock)).toEqual({
        posts: [
          {
            id: 'post-1',
            title: 'Draft in progress',
            status: 'draft',
            lexical: '{"root":{}}',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      });
    });
  });

  it('forces a revision on explicit saves', async () => {
    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useEditPost());

      await act(async () => {
        await result.current.mutateAsync({
          post: {
            id: 'post-1',
            title: 'Saved',
            status: 'draft',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          options: { saveRevision: true },
        });
      });

      expect(requestParams(mock)).toEqual({
        formats: 'mobiledoc,lexical',
        save_revision: 'true',
        include: ALL_INCLUDES,
      });
    });
  });

  it('publishes to a newsletter segment and strips read-only fields from the payload', async () => {
    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useEditPost());

      // read-only relations come back on fetched posts - they must never be sent back
      const fetchedPost = {
        id: 'post-1',
        title: 'Published',
        status: 'published' as const,
        published_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        email: { email_count: 0, opened_count: 0 },
        newsletter: { id: 'newsletter-1' },
        post_revisions: [{ id: 'revision-1' }],
      };

      await act(async () => {
        await result.current.mutateAsync({
          post: fetchedPost,
          options: { newsletter: 'weekly', emailSegment: 'label:vip' },
        });
      });

      expect(requestParams(mock)).toEqual({
        formats: 'mobiledoc,lexical',
        newsletter: 'weekly',
        email_segment: 'label:vip',
        include: ALL_INCLUDES,
      });
      expect(requestBody(mock)).toEqual({
        posts: [
          {
            id: 'post-1',
            title: 'Published',
            status: 'published',
            published_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      });
    });
  });

  it('publishes to everyone as the all segment', async () => {
    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useEditPost());

      await act(async () => {
        await result.current.mutateAsync({
          post: {
            id: 'post-1',
            status: 'published',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          options: { newsletter: 'weekly', emailSegment: 'status:free,status:-free' },
        });
      });

      expect(requestParams(mock)).toEqual({
        formats: 'mobiledoc,lexical',
        newsletter: 'weekly',
        email_segment: 'all',
        include: ALL_INCLUDES,
      });
    });
  });

  it('requests a mobiledoc conversion with convert_to_lexical', async () => {
    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useEditPost());

      await act(async () => {
        await result.current.mutateAsync({
          post: {
            id: 'post-1',
            status: 'draft',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          options: { convertToLexical: true },
        });
      });

      expect(requestParams(mock)).toEqual({
        formats: 'mobiledoc,lexical',
        convert_to_lexical: 'true',
        include: ALL_INCLUDES,
      });
    });
  });

  it('uploads a mapped CSV ZIP through the posts endpoint', async () => {
    const file = new File(['PK'], 'posts.zip', { type: 'application/zip' });

    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useImportContentCSV());

      await act(async () => {
        await result.current.mutateAsync({ file, mapping: { Headline: 'title' } });
      });

      expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/posts/upload/');
      expect(mock.calls[0][1].body.get('postsfile')).toBe(file);
      expect(mock.calls[0][1].body.get('mapping[Headline]')).toBe('title');
    });
  });
});
