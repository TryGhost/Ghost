export type RouteMatch =
    | {type: 'collection'; page: number}
    | {type: 'tag'; slug: string; page: number}
    | {type: 'author'; slug: string; page: number}
    | {type: 'entry'; slug: string};

type CacheEntry = {
    value: RouteMatch | null;
    expiresAt: number;
};

const CACHE_TTL_MS = 10_000;
// Bounds memory under URL scanning: unique 404 paths would otherwise
// accumulate one cache entry each.
const CACHE_MAX_ENTRIES = 1_000;

export const createRouteMatcher = () => {
    const cache = new Map<string, CacheEntry>();
    const collectionRegex = /^\/page\/(\d+)\/?$/;
    const taxonomyRegex = /^\/(tag|author)\/([^/]+?)(?:\/page\/(\d+))?\/?$/;
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
        if (cache.size >= CACHE_MAX_ENTRIES) {
            cache.clear();
        }
        cache.set(path, {value, expiresAt: Date.now() + CACHE_TTL_MS});
    };

    const resolveRoute = (path: string): RouteMatch | null => {
        if (path === '/' || path === '') {
            return {type: 'collection', page: 1};
        }

        const collectionMatch = collectionRegex.exec(path);
        if (collectionMatch) {
            const page = Number(collectionMatch[1]);
            return {type: 'collection', page: Number.isNaN(page) ? 1 : page};
        }

        const taxonomyMatch = taxonomyRegex.exec(path);
        if (taxonomyMatch && taxonomyMatch[2]) {
            const page = taxonomyMatch[3] ? Number(taxonomyMatch[3]) : 1;
            return {
                type: taxonomyMatch[1] === 'tag' ? 'tag' : 'author',
                slug: taxonomyMatch[2],
                page: Number.isNaN(page) ? 1 : page
            };
        }

        const entryMatch = entryRegex.exec(path);
        if (entryMatch && entryMatch[1]) {
            return {type: 'entry', slug: entryMatch[1]};
        }

        return null;
    };

    const matchRoute = (path: string) => {
        const cached = getCached(path);
        if (cached !== null) {
            return cached;
        }
        const value = resolveRoute(path);
        setCached(path, value);
        return value;
    };

    return {matchRoute};
};
