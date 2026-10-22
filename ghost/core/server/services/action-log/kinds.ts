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
