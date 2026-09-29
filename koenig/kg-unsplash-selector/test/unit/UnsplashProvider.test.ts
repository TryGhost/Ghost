import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UnsplashProvider } from '../../src/api/UnsplashProvider';
import { fixturePhotos } from '../../src/api/unsplashFixtures';

type PendingFetch = {
  url: string;
  signal?: AbortSignal;
  respond: (body: unknown) => void;
};

describe('UnsplashProvider', () => {
  let pending: PendingFetch[];
  let provider: UnsplashProvider;

  beforeEach(() => {
    pending = [];

    // Each call stays in flight until the test responds to it, and rejects
    // like the real fetch when its signal is aborted
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options: RequestInit) => {
        return new Promise<Response>((resolve, reject) => {
          const signal = options.signal ?? undefined;
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
          pending.push({
            url,
            signal,
            respond: (body) => resolve(new Response(JSON.stringify(body), { status: 200 })),
          });
        });
      }),
    );

    provider = new UnsplashProvider({
      Authorization: 'Client-ID test',
      'Accept-Version': 'v1',
      'Content-Type': 'application/json',
      'App-Pragma': 'no-cache',
      'X-Unsplash-Cache': true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs a newer search while an older one is still in flight', async () => {
    const partialSearch = provider.searchPhotos('Germ');
    const fullSearch = provider.searchPhotos('Germany');

    expect(pending.map(({ url }) => new URL(url).searchParams.get('query'))).toEqual([
      'Germ',
      'Germany',
    ]);
    expect(pending[0].signal?.aborted).toBe(true);

    pending[1].respond({ results: [fixturePhotos[0]] });

    expect(await partialSearch).toEqual([]);
    expect(await fullSearch).toEqual([fixturePhotos[0]]);
    expect(provider.ERROR).toBeNull();
    expect(provider.searchIsRunning()).toBe(false);
  });

  it('runs a search while the initial photos are still loading', async () => {
    const initialLoad = provider.fetchPhotos();
    const search = provider.searchPhotos('mobile');

    expect(pending).toHaveLength(2);
    expect(pending[0].signal?.aborted).toBe(true);

    pending[1].respond({ results: [fixturePhotos[1]] });

    expect(await initialLoad).toEqual([]);
    expect(await search).toEqual([fixturePhotos[1]]);
  });

  it('encodes the search term in the request URL', async () => {
    const search = provider.searchPhotos('cats & dogs #1');

    expect(new URL(pending[0].url).searchParams.get('query')).toBe('cats & dogs #1');

    pending[0].respond({ results: [] });
    await search;
  });

  it('does not load the next page while a search is in flight', async () => {
    provider.PAGINATION = { next: 'https://api.unsplash.com/photos?page=2' };
    const search = provider.searchPhotos('mobile');

    expect(await provider.fetchNextPage()).toBeNull();
    expect(pending).toHaveLength(1);

    pending[0].respond({ results: [] });
    await search;
    expect(provider.REQUEST_IS_RUNNING).toBe(false);
  });
});
