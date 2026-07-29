import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {UnsplashProvider} from '../../src/api/UnsplashProvider';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: {'Content-Type': 'application/json', ...(init.headers || {})},
        ...init
    });
}

describe('UnsplashProvider search race', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('aborts an in-flight search so a newer query is not dropped', async () => {
        let resolveGerm: ((value: Response) => void) | undefined;
        const germPromise = new Promise<Response>((resolve) => {
            resolveGerm = resolve;
        });

        const fetchMock = vi.mocked(fetch);
        fetchMock
            .mockImplementationOnce((_url, init) => {
                // Keep "Germ" pending until after "Germany" starts.
                return new Promise((resolve, reject) => {
                    const signal = init?.signal;
                    if (signal) {
                        signal.addEventListener('abort', () => {
                            reject(new DOMException('Aborted', 'AbortError'));
                        });
                    }
                    void germPromise.then(resolve).catch(reject);
                });
            })
            .mockImplementationOnce(() => Promise.resolve(jsonResponse({
                results: [{id: 'germany-photo', width: 100, height: 100}]
            })));

        const provider = new UnsplashProvider({Authorization: 'Client-ID test'});

        const germSearch = provider.searchPhotos('Germ');
        // Let the first fetch start before kicking off the second search.
        await Promise.resolve();

        const germanySearch = provider.searchPhotos('Germany');
        const germanyResults = await germanySearch;

        expect(germanyResults).toEqual([{id: 'germany-photo', width: 100, height: 100}]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(String(fetchMock.mock.calls[1][0])).toContain('query=Germany');

        // Completing the aborted "Germ" request must not throw or overwrite state.
        resolveGerm?.(jsonResponse({results: [{id: 'germ-photo', width: 50, height: 50}]}));
        await expect(germSearch).resolves.toEqual([]);
    });
});
