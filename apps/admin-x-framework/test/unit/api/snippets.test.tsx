import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../src/utils/errors';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import {
  useAddSnippet,
  useBrowseSnippets,
  useDeleteSnippet,
  useEditSnippet,
} from '../../../src/api/snippets';
import { withMockFetch } from '../../utils/mock-fetch';

const { mockSonnerError } = vi.hoisted(() => ({
  mockSonnerError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mockSonnerError,
    dismiss: vi.fn(),
  },
}));

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

const duplicateSnippetResponse = {
  errors: [
    {
      code: 'VALIDATION',
      context: 'Snippet already exists.',
      details: null,
      ghostErrorCode: null,
      help: null,
      id: 'snippet-error-id',
      message: 'Validation error, cannot save snippet.',
      property: null,
      type: 'ValidationError',
    },
  ],
};

const mockErrorFetch = {
  json: duplicateSnippetResponse,
  headers: { 'content-type': 'application/json' },
  ok: false,
  status: 422,
};

const findCall = (mock: { calls: unknown[][] }, path: string) =>
  mock.calls.find((call) => String(call[0]).includes(path));

describe('snippets api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('keeps the formats param when a caller passes its own search params', async () => {
    await withMockFetch(okResponse({ snippets: [existingSnippet] }), async (mock) => {
      const { result } = renderHookWithProviders(() =>
        useBrowseSnippets({ searchParams: { filter: 'name:foo' } }),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual({ snippets: [existingSnippet] });
      });

      const url = new URL(String(findCall(mock, '/snippets/')![0]));
      expect(url.searchParams.get('filter')).toBe('name:foo');
      expect(url.searchParams.get('formats')).toBe('mobiledoc,lexical');
    });
  });

  it('rejects duplicate creates with a validation error without reporting', async () => {
    await withMockFetch(mockErrorFetch, async () => {
      const { result } = renderHookWithProviders(() => useAddSnippet());

      await act(async () => {
        await expect(
          result.current.mutateAsync({ name: 'Existing snippet', mobiledoc: '{}' }),
        ).rejects.toBeInstanceOf(ValidationError);
      });

      expect(mockSonnerError).not.toHaveBeenCalled();
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

  // The edit schema requires name and mobiledoc on every item, so edits send the full record
  it('edits a snippet with the full record and requests both formats back', async () => {
    await withMockFetch(okResponse({ snippets: [existingSnippet] }), async (mock) => {
      const { result } = renderHookWithProviders(() => useEditSnippet());

      await act(async () => {
        await result.current.mutateAsync({
          id: 'snippet-1',
          name: 'Existing snippet',
          mobiledoc: '{}',
          lexical: '{"nodes":[]}',
        });
      });

      const call = findCall(mock, '/snippets/snippet-1/')!;
      const url = new URL(String(call[0]));
      expect(url.pathname).toBe('/ghost/api/admin/snippets/snippet-1/');
      expect(url.searchParams.get('formats')).toBe('mobiledoc,lexical');

      const options = call[1] as RequestInit;
      expect(options.method).toBe('PUT');
      expect(JSON.parse(options.body as string)).toEqual({
        snippets: [
          { id: 'snippet-1', name: 'Existing snippet', mobiledoc: '{}', lexical: '{"nodes":[]}' },
        ],
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
