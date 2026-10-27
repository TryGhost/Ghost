import type { Query } from '@tanstack/react-query';

/**
 * The `search-index/*` lists are cached under the data type of the resource
 * they list, so invalidating that resource reaches them too. A query that holds
 * one of them carries this meta, which lets a mutation leave them out.
 */
export const searchIndexQueryMeta = { searchIndex: true } as const;

/** Whether a cached query holds one of the `search-index/*` lists. */
export function isSearchIndexQuery(query: Query): boolean {
  return query.meta?.searchIndex === true;
}
