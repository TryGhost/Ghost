
export type RouteMatch =
    | {type: 'collection'; page: number}
    | {type: 'entry'; slug: string};

type CacheEntry = {
    value: RouteMatch | null;
    expiresAt: number;
};

const CACHE_TTL_MS = 10_000;

export const createRouteMatcher = () => {
    const cache = new Map<string, CacheEntry>();
    const collectionRegex = /^\/page\/(\d+)\/?$/;
    const entryRegex = /^\/([^/]+)\/?$/;

    const getCached = (path: string) => {
        const entry = cache.get(path);
        if (!entry) {
            return null;
        }
        if (entry.expiresAt < Date.now()) {
            cache.delete(path);
            return null;
        }
        return entry.value;
    };

    const setCached = (path: string, value: RouteMatch | null) => {
        cache.set(path, {value, expiresAt: Date.now() + CACHE_TTL_MS});
    };

    const matchRoute = (path: string) => {
        const cached = getCached(path);
        if (cached !== null) {
            return cached;
        }

        if (path === '/' || path === '') {
            const value = {type: 'collection', page: 1} as const;
            setCached(path, value);
            return value;
        }

        const collectionMatch = collectionRegex.exec(path);
        if (collectionMatch) {
            const page = Number(collectionMatch[1]);
            const value = {type: 'collection', page: Number.isNaN(page) ? 1 : page} as const;
            setCached(path, value);
            return value;
        }

        const entryMatch = entryRegex.exec(path);
        if (entryMatch && entryMatch[1]) {
            const value = {type: 'entry', slug: entryMatch[1]} as const;
            setCached(path, value);
            return value;
        }

        setCached(path, null);
        return null;
    };

    return {matchRoute};
};
