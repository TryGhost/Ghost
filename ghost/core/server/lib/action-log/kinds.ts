/**
 * The kinds of resource whose actions services built without Bookshelf log, keyed by the
 * `resource_type` they store.
 *
 * - `table` is where a `resource_id` of that kind points. Resource types and tables don't
 *   correspond one to one (a gift link's entry points at its post), so it can't be derived
 *   from the schema. The `Action` model builds a read model per kind from it, so
 *   `include=resource` loads every kind that can be logged.
 * - `actionNames` are the names the kind may give an action, such as "reset", for a change
 *   that reads as more than its event.
 *
 * Bookshelf models log their own actions and aren't listed here.
 */
export const ACTION_KINDS = {
  app_installation: {
    table: 'app_installations',
    actionNames: ['installed', 'uninstalled', 'changes_approved'],
  },
  gift_link: {
    table: 'posts',
    actionNames: ['reset'],
  },
  member_custom_field: {
    table: 'members_metafields',
    actionNames: ['archived', 'restored', 'reordered'],
  },
  stripe_checkout_config: {
    table: 'stripe_checkout_config',
    actionNames: [],
  },
} as const satisfies Record<string, { table: string; actionNames: readonly string[] }>;

export type ActionKind = keyof typeof ACTION_KINDS;

/** Every action is a resource being added, edited or deleted; its name says how. */
export type ActionEvent = 'added' | 'edited' | 'deleted';

export type ActionName<K extends ActionKind> = (typeof ACTION_KINDS)[K]['actionNames'][number];
