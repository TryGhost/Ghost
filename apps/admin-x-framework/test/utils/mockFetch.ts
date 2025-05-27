/// <reference types="vitest/globals" />

const originalFetch = global.fetch;

type FetchArgs = Parameters<typeof global.fetch>;

export const withMockFetch = async (
    {json = {}, headers = {}, status = 200, ok = true}: {json?: unknown; headers?: Record<string, string>; status?: number; ok?: boolean},
    callback: (mock: any) => void | Promise<void>
) => {
    const mockFetch = vi.fn<FetchArgs, Promise<Response>>(() => Promise.resolve({
        json: () => Promise.resolve(json),
        headers: new Headers(headers),
        status,
        ok
    } as Response));

    global.fetch = mockFetch as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    await callback(mockFetch.mock);

    global.fetch = originalFetch;
};
