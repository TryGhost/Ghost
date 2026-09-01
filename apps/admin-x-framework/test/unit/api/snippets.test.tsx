import { act, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import {
  useAddSnippet,
  useBrowseSnippets,
  useDeleteSnippet,
  useEditSnippet,
} from '../../../src/api/snippets';
import { withMockFetch } from '../../utils/mock-fetch';

const existingSnippet = {
  id: 'snippet-1',
  name: 'Existing snippet',
  mobiledoc: '{}',
  lexical: '{"nodes":[]}',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

const okResponse = (json: unknown) => ({
  json,
  headers: { 'content-type': 'application/json' },
  ok: true,
  status: 200,
});

const findCall = (mock: { calls: unknown[][] }, path: string) =>
  mock.calls.find((call) => String(call[0]).includes(path));

describe('snippets api', () => {
  it('browses all snippets in both formats', async () => {
    await withMockFetch(okResponse({ snippets: [existingSnippet] }), async (mock) => {
      const { result } = renderHookWithProviders(() => useBrowseSnippets());

      await waitFor(() => {
        expect(result.current.data).toEqual({ snippets: [existingSnippet] });
      });

      const call = findCall(mock, '/snippets/');
      const url = new URL(String(call![0]));
      expect(url.pathname).toBe('/ghost/api/admin/snippets/');
      expect(url.searchParams.get('limit')).toBe('all');
      expect(url.searchParams.get('formats')).toBe('mobiledoc,lexical');
    });
  });

  it('adds a snippet and requests both formats back', async () => {
    await withMockFetch(okResponse({ snippets: [existingSnippet] }), async (mock) => {
      const { result } = renderHookWithProviders(() => useAddSnippet());

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Existing snippet',
          lexical: '{"nodes":[]}',
          mobiledoc: '{}',
        });
      });

      const call = findCall(mock, '/snippets/')!;
      const url = new URL(String(call[0]));
      expect(url.pathname).toBe('/ghost/api/admin/snippets/');
      expect(url.searchParams.get('formats')).toBe('mobiledoc,lexical');

      const options = call[1] as RequestInit;
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body as string)).toEqual({
        snippets: [{ name: 'Existing snippet', lexical: '{"nodes":[]}', mobiledoc: '{}' }],
      });
    });
  });

  it('edits a snippet by id and requests both formats back', async () => {
    await withMockFetch(okResponse({ snippets: [existingSnippet] }), async (mock) => {
      const { result } = renderHookWithProviders(() => useEditSnippet());

      await act(async () => {
        await result.current.mutateAsync({ id: 'snippet-1', lexical: '{"nodes":[]}' });
      });

      const call = findCall(mock, '/snippets/snippet-1/')!;
      const url = new URL(String(call[0]));
      expect(url.pathname).toBe('/ghost/api/admin/snippets/snippet-1/');
      expect(url.searchParams.get('formats')).toBe('mobiledoc,lexical');

      const options = call[1] as RequestInit;
      expect(options.method).toBe('PUT');
      expect(JSON.parse(options.body as string)).toEqual({
        snippets: [{ id: 'snippet-1', lexical: '{"nodes":[]}' }],
      });
    });
  });

  it('deletes a snippet by id', async () => {
    await withMockFetch(okResponse({}), async (mock) => {
      const { result } = renderHookWithProviders(() => useDeleteSnippet());

      await act(async () => {
        await result.current.mutateAsync('snippet-1');
      });

      const call = findCall(mock, '/snippets/snippet-1/')!;
      expect(String(call[0])).toBe('http://localhost:3000/ghost/api/admin/snippets/snippet-1/');
      expect((call[1] as RequestInit).method).toBe('DELETE');
    });
  });
});
