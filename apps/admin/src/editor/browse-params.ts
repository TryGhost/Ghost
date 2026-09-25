/**
 * Browse search params the editor reads from more than one place. A query's
 * cache key is the serialized URL, so key order here is what shares the entry.
 */

/** Every paid tier, archived ones included: the access, preview and publish tier pickers. */
export const PAID_TIERS_SEARCH_PARAMS = { filter: 'type:paid', limit: 'all' } as const;

/**
 * Every newsletter, archived ones included. The preview narrows to active ones
 * in the client rather than asking for a second, differently filtered list.
 */
export const NEWSLETTERS_SEARCH_PARAMS = { limit: 'all' } as const;
