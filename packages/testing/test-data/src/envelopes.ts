/**
 * Ghost Admin API response envelopes.
 *
 * `browseResponse` takes the FULL result set, slices the requested page out of
 * it and derives the pagination meta (`total`, `pages`, `next`/`prev`) itself,
 * wrapping the page in the list shape `{<resource>: [...], meta: {pagination}}`.
 */
export interface Pagination {
    page: number;
    limit: number | "all";
    pages: number;
    total: number;
    next: number | null;
    prev: number | null;
}

export type BrowseResponse<K extends string, T> = Record<K, T[]> & {meta: {pagination: Pagination}};

export interface BrowseResponseOptions {
    page?: number;
    limit?: number | "all";
}

export function browseResponse<K extends string, T>(
    resourceKey: K,
    allEntities: T[],
    {page = 1, limit = 15}: BrowseResponseOptions = {}
): BrowseResponse<K, T> {
    const total = allEntities.length;
    const pages = limit === "all" ? 1 : Math.max(1, Math.ceil(total / limit));
    const entities = limit === "all" ? allEntities : allEntities.slice((page - 1) * limit, page * limit);

    return {
        [resourceKey]: entities,
        meta: {
            pagination: {
                page,
                limit,
                pages,
                total,
                next: page < pages ? page + 1 : null,
                prev: page > 1 ? page - 1 : null
            }
        }
    } as BrowseResponse<K, T>;
}
