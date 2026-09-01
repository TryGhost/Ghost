import { act, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import { useAddPage, useEditPage, usePage } from '../../../src/api/pages';
import { withMockFetch } from '../../utils/mock-fetch';

// The Ember editor's exact include list — page writes re-request it too
const ALL_INCLUDES =
  'tags,authors,authors.roles,email,tiers,newsletter,count.clicks,post_revisions,post_revisions.author';

const requestUrl = (mock: any) => new URL(mock.calls[0][0] as string);

const requestParams = (mock: any) => Object.fromEntries(requestUrl(mock).searchParams.entries());

const requestBody = (mock: any) => JSON.parse(mock.calls[0][1].body as string);

describe('pages api', () => {
  it('reads a single page', async () => {
    await withMockFetch(
      {
        json: {
          pages: [{ id: 'page-1', title: 'About', slug: 'about', url: '/about/' }],
          // the permissions gate fetches the current user through the same mock
          users: [{ id: 'user-1', roles: [] }],
        },
        headers: { 'content-type': 'application/json' },
      },
      async (mock) => {
        const { result } = renderHookWithProviders(() => usePage('page-1'));

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const pagesCall = mock.calls.find(([input]: [unknown]) =>
          String(input).includes('/pages/'),
        );
        const pagesUrl = new URL(pagesCall[0] as string);
        expect(pagesUrl.pathname).toBe('/ghost/api/admin/pages/page-1/');
        expect(Object.fromEntries(pagesUrl.searchParams.entries())).toEqual({
          formats: 'mobiledoc,lexical',
        });
      },
    );
  });

  it('creates a page through the pages endpoint with the write contract params', async () => {
    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useAddPage());

      await act(async () => {
        await result.current.mutateAsync({
          page: { title: '(Untitled)', status: 'draft', lexical: '{"root":{}}' },
        });
      });

      expect(requestUrl(mock).pathname).toBe('/ghost/api/admin/pages/');
      expect(mock.calls[0][1].method).toBe('POST');
      expect(requestParams(mock)).toEqual({
        formats: 'mobiledoc,lexical',
        include: ALL_INCLUDES,
      });
      expect(requestBody(mock)).toEqual({
        pages: [{ title: '(Untitled)', status: 'draft', lexical: '{"root":{}}' }],
      });
    });
  });

  it('saves a page with a revision and without email delivery params', async () => {
    await withMockFetch({}, async (mock) => {
      const { result } = renderHookWithProviders(() => useEditPage());

      await act(async () => {
        await result.current.mutateAsync({
          page: {
            id: 'page-1',
            title: 'About',
            status: 'draft',
            lexical: '{"root":{}}',
            show_title_and_feature_image: false,
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          options: { saveRevision: true },
        });
      });

      expect(requestUrl(mock).pathname).toBe('/ghost/api/admin/pages/page-1/');
      expect(mock.calls[0][1].method).toBe('PUT');
      expect(requestParams(mock)).toEqual({
        formats: 'mobiledoc,lexical',
        save_revision: 'true',
        include: ALL_INCLUDES,
      });
      // pages keep show_title_and_feature_image - it's a page-only field
      expect(requestBody(mock)).toEqual({
        pages: [
          {
            id: 'page-1',
            title: 'About',
            status: 'draft',
            lexical: '{"root":{}}',
            show_title_and_feature_image: false,
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      });
    });
  });
});
