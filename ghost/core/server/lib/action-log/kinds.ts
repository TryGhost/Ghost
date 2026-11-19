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
 * A kind can be one that a Bookshelf model logs too: the segments service logs an edit of the
 * setting it stores segments in, as a settings save does through the Settings model. Bookshelf
 * models still log their own actions through their actions plugin, and a kind that only they log
 * isn't listed here. The `Action` model lists Bookshelf models before these read models, so it
 * loads a kind's resource through the kind's Bookshelf model when there is one.
 */
export const ACTION_KINDS = {
  app_installation: {
    table: 'app_installations',
    verbs: ['installed', 'uninstalled', 'changes_approved'],
  },
  gift_link: {
    table: 'posts',
    verbs: ['added', 'edited', 'deleted'],
  },
  member_custom_field: {
    table: 'members_metafields',
    verbs: ['added', 'edited', 'archived', 'restored', 'deleted'],
  },
  setting: {
    table: 'settings',
    verbs: ['edited'],
  },
  stripe_checkout_config: {
    table: 'stripe_checkout_config',
    verbs: ['edited'],
  },
} as const satisfies Record<string, { table: string; verbs: readonly string[] }>;

export type ActionKind = keyof typeof ACTION_KINDS;

export type ActionVerb<K extends ActionKind> = (typeof ACTION_KINDS)[K]['verbs'][number];
