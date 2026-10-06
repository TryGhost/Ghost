import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import {
  useAddAppInstallation,
  useApproveAppInstallation,
  usePreviewAppInstallation,
} from '../../../src/api/app-installations';
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
  it('previews a manifest by its URL', async () => {
    await withMockFetch(okResponse({ app_installation_previews: [] }), async (mock) => {
      const { result } = renderHookWithProviders(() => usePreviewAppInstallation());

      await act(async () => {
        await result.current.mutateAsync(MANIFEST_URL);
      });

      expect(requestOf(mock)).toEqual({
        path: '/ghost/api/admin/apps/installations/preview/',
        method: 'POST',
        body: { app_installation_previews: [{ manifest_url: MANIFEST_URL }] },
      });
    });
  });

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
        });
      });

      expect(requestOf(mock)).toEqual({
        path: '/ghost/api/admin/apps/installations/installation-1/',
        method: 'PUT',
        body: { app_installations: [{ manifest_url: MANIFEST_URL, digest: 'abc' }] },
      });
    });
  });
});
