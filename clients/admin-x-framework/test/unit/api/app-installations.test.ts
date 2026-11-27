import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import {
  useAddAppInstallation,
  useApproveAppInstallation,
  useCreateAppToken,
  useStartAppSession,
} from '../../../src/api/app-installations';
import { ServerUnreachableError, TimeoutError } from '../../../src/utils/errors';
import { withMockFetch } from '../../utils/mock-fetch';

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';

const okResponse = (json: unknown) => ({
  json,
  headers: { 'content-type': 'application/json' },
  ok: true,
  status: 200,
});

const requestOf = (mock: { calls: unknown[][] }) => {
  const [url, options] = mock.calls[0] as [string, RequestInit];
  return {
    path: new URL(url).pathname,
    method: options.method,
    body: JSON.parse(options.body as string) as unknown,
  };
};

describe('app installations api', () => {
  it('installs the manifest that was reviewed', async () => {
    await withMockFetch(okResponse({ app_installations: [] }), async (mock) => {
      const { result } = renderHookWithProviders(() => useAddAppInstallation());

      await act(async () => {
        await result.current.mutateAsync({ manifest_url: MANIFEST_URL, digest: 'abc' });
      });

      expect(requestOf(mock)).toEqual({
        path: '/ghost/api/admin/apps/installations/',
        method: 'POST',
        body: { app_installations: [{ manifest_url: MANIFEST_URL, digest: 'abc' }] },
      });
    });
  });

  it('approves the reviewed manifest for an installation', async () => {
    await withMockFetch(okResponse({ app_installations: [] }), async (mock) => {
      const { result } = renderHookWithProviders(() => useApproveAppInstallation());

      await act(async () => {
        await result.current.mutateAsync({
          id: 'installation-1',
          manifest_url: MANIFEST_URL,
          digest: 'abc',
          revision: 2,
        });
      });

      expect(requestOf(mock)).toEqual({
        path: '/ghost/api/admin/apps/installations/installation-1/',
        method: 'PUT',
        body: { app_installations: [{ manifest_url: MANIFEST_URL, digest: 'abc', revision: 2 }] },
      });
    });
  });

  it('starts a session of an installation, with nothing in the body', async () => {
    await withMockFetch(okResponse({ app_sessions: [] }), async (mock) => {
      const { result } = renderHookWithProviders(() => useStartAppSession());

      await act(async () => {
        await result.current.mutateAsync('installation-1');
      });

      const [url, options] = mock.calls[0] as [string, RequestInit];
      expect(new URL(url).pathname).toBe(
        '/ghost/api/admin/apps/installations/installation-1/sessions/',
      );
      expect(options.method).toBe('POST');
      expect(options.body).toBeUndefined();
    });
  });

  describe('renewing an app session token', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('sends the revision the session started with', async () => {
      await withMockFetch(okResponse({ app_tokens: [] }), async (mock) => {
        const { result } = renderHookWithProviders(() => useCreateAppToken());

        await act(async () => {
          await result.current.mutateAsync({ id: 'installation-1', revision: 3 });
        });

        expect(requestOf(mock)).toEqual({
          path: '/ghost/api/admin/apps/installations/installation-1/tokens/',
          method: 'POST',
          body: { app_tokens: [{ revision: 3 }] },
        });
      });
    });

    it('gives up after 10 seconds without an answer', async () => {
      vi.useFakeTimers();
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      );
      const { result } = renderHookWithProviders(() => useCreateAppToken());

      const renewing = result.current.mutateAsync({ id: 'installation-1', revision: 3 });
      const rejection = expect(renewing).rejects.toBeInstanceOf(TimeoutError);
      await vi.advanceTimersByTimeAsync(10_000);

      await rejection;
    });

    it('fails at once when Ghost can’t be reached, leaving retries to the token holder', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Offline'));
      const { result } = renderHookWithProviders(() => useCreateAppToken());

      await expect(
        result.current.mutateAsync({ id: 'installation-1', revision: 3 }),
      ).rejects.toBeInstanceOf(ServerUnreachableError);
      expect(fetchSpy).toHaveBeenCalledOnce();
    });
  });
});
