/**
 * The kinds of resource whose actions services built without Bookshelf log, keyed by the
 * `resource_type` they store.
 *
 * - `table` is where a `resource_id` of that kind points. Resource types and tables don't
 *   correspond one to one (a gift link's entry points at its post), so it can't be derived
 *   from the schema. The `Action` model builds a read model per kind from it, so
 *   `include=resource` loads every kind that can be logged.
 * - `verbs` are the `event` values the kind may store.
 *
 * Bookshelf models log their own actions and aren't listed here.
 */
export const ACTION_KINDS = {
  app_installation: {
    table: 'app_installations',
    verbs: ['added', 'edited', 'deleted'],
  },
  gift_link: {
    table: 'posts',
    verbs: ['added', 'edited', 'deleted'],
  },
  member_custom_field: {
    table: 'members_metafields',
    verbs: ['added', 'edited', 'archived', 'restored', 'deleted'],
  },
  stripe_checkout_config: {
    table: 'stripe_checkout_config',
    verbs: ['edited'],
  },
} as const satisfies Record<string, { table: string; verbs: readonly string[] }>;

export type ActionKind = keyof typeof ACTION_KINDS;

export type ActionVerb<K extends ActionKind> = (typeof ACTION_KINDS)[K]['verbs'][number];
