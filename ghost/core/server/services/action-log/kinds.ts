import { z } from 'zod';

/** The kinds of action the action log logs from change events, rather than from a Bookshelf model. */
export const ActionKind = z.enum([
  'app_installation',
  'gift_link',
  'member_custom_field',
  'stripe_checkout_config',
]);
export type ActionKind = z.infer<typeof ActionKind>;

/**
 * The table that each kind's `resource_id` refers to.
 *
 * The Action model uses this to load an action's resource. Every kind must have a table here,
 * which the compiler checks, so every kind that can be logged can also be loaded.
 */
export const ACTION_KIND_TABLES = {
  app_installation: 'app_installations',
  gift_link: 'posts',
  member_custom_field: 'members_metafields',
  stripe_checkout_config: 'stripe_checkout_config',
} as const satisfies Record<ActionKind, string>;

/**
 * The names each kind gives its actions, beside the verb, for what the verb alone doesn't say.
 * A kind's log can only use its own names, and anything reading a kind's actions, such as an
 * app's history, matches on the same ones. Every kind must have an entry, which the compiler
 * checks.
 */
export type ActionName<K extends ActionKind> = {
  app_installation: 'installed' | 'changes_approved' | 'uninstalled';
  gift_link: 'reset';
  member_custom_field: 'archived' | 'restored' | 'reordered';
  stripe_checkout_config: never;
}[K];
