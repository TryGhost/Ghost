/// <reference types="vitest/globals" />

const originalFetch = globalThis.fetch;

export const withMockFetch = async (
    {json = {}, headers = {}, status = 200, ok = true}: {json?: unknown; headers?: Record<string, string>; status?: number; ok?: boolean},
    callback: (mock: any) => void | Promise<void>
) => {
    const mockFetch = vi.fn<typeof globalThis.fetch>(input => Promise.resolve({
        url: String(input ?? ''),
        json: () => Promise.resolve(json),
        text: () => Promise.resolve(JSON.stringify(json)),
        headers: new Headers(headers),
        status,
        ok
    } as Response));

    globalThis.fetch = mockFetch as any;  

    try {
        await callback(mockFetch.mock);
    } finally {
        globalThis.fetch = originalFetch;
    }
};
