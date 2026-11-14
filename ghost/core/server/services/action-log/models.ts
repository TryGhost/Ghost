import type { Knex } from 'knex';
import { z } from 'zod';

/** An action stored with no context. */
const none = z.null();

/** What is stored with an action about one custom field, so History can name the field. */
const customField = z.strictObject({
  primary_name: z.string(),
  key: z.string(),
  previous_name: z.string().optional(),
  member_access: z.string().optional(),
  previous_member_access: z.string().optional(),
});

/** What is stored with an action about an app, so History still names it once it is gone. */
const appInstallation = z.strictObject({
  primary_name: z.string(),
  app_id: z.string(),
  from_manifest_id: z.string().optional(),
  to_manifest_id: z.string().optional(),
});

/**
 * The kinds of resource a service logs actions about, each stored as an action's
 * `resource_type`. A kind is declared once, here, and everything else follows from it.
 *
 * - `table` is where an action's `resource_id` points. A kind and its table do not correspond
 *   one to one (a gift link's action points at its post), so it cannot be derived. The `Action`
 *   model builds a read model from it, so the actions API can include the resource.
 * - `events` are the events the kind may store, each with the context stored alongside it.
 *   Admin's History reads an action's name, its resource's name and a count from the context,
 *   so a wrong or missing key there is an action that reads wrongly.
 *
 * A Bookshelf model that logs its own actions has no kind here: its resource type is its table
 * name without the final "s", its events are added, edited and deleted, and its read model is the
 * model itself.
 */
export const ACTION_KINDS = {
  gift_link: {
    table: 'posts',
    events: {
      added: none,
      // History only shows a name for an edit, so a reset is an edit named "reset".
      edited: z.strictObject({ action_name: z.literal('reset') }),
      deleted: none,
    },
  },
  member_custom_field: {
    table: 'members_metafields',
    events: {
      added: customField,
      // An edit of one field, or a reorder of all of them, which is about no single field.
      edited: z.union([
        customField,
        z.strictObject({ action_name: z.literal('reordered'), count: z.number() }),
      ]),
      archived: customField,
      restored: customField,
      deleted: customField,
    },
  },
  app_installation: {
    table: 'app_installations',
    events: {
      installed: appInstallation,
      uninstalled: appInstallation,
      changes_approved: appInstallation,
    },
  },
  stripe_checkout_config: {
    table: 'stripe_checkout_config',
    events: { edited: z.strictObject({ primary_name: z.string() }) },
  },
  // About no resource: an act on the whole site, such as resetting every staff user's
  // authentication.
  security_action: {
    table: 'users',
    events: {
      edited: z.strictObject({
        action_name: z.literal('reset_authentication'),
        api_keys_rotated: z.number(),
        users_locked: z.number(),
      }),
    },
  },
} as const satisfies Record<string, { table: string; events: Record<string, z.ZodType> }>;

type Kinds = typeof ACTION_KINDS;
type ActionKind = keyof Kinds;
type ActionEvent<Kind extends ActionKind> = keyof Kinds[Kind]['events'];
type ActionContext<
  Kind extends ActionKind,
  Event extends ActionEvent<Kind>,
> = Kinds[Kind]['events'][Event] extends z.ZodType ? z.infer<Kinds[Kind]['events'][Event]> : never;

/**
 * An action to store, as its row: one of the events its kind declares, with exactly the context
 * that event is stored with. An action Admin's History could not read does not compile.
 */
export type NewAction = {
  [Kind in ActionKind]: {
    [Event in ActionEvent<Kind>]: {
      resource_type: Kind;
      event: Event;
      /** The resource the action is about, or null for an action about no single resource. */
      resource_id: string | null;
      actor_type: 'user' | 'integration';
      actor_id: string;
    } & (ActionContext<Kind, Event> extends null
      ? { context?: undefined }
      : { context: ActionContext<Kind, Event> });
  }[ActionEvent<Kind>];
}[ActionKind];

/**
 * What a service that logs actions is given: the action log's `write`. Given the transaction of
 * the command the action records as `executor`, the action is saved or rolled back with the
 * command's change. Given none, it is written in a transaction of its own.
 */
export interface ActionWriter {
  write(action: NewAction, executor?: Knex): Promise<void>;
}

/**
 * A stored action as the `Action` model returns it: what a staff user or integration did to a
 * resource, and when. `actor` and `resource` are present when they were asked for, and empty
 * when the user, integration or resource has since been deleted.
 */
export const Action = z.object({
  id: z.string(),
  /** The resource the action is about, or null for an action about no single resource. */
  resource_id: z.string().nullable(),
  resource_type: z.string(),
  actor_id: z.string(),
  actor_type: z.string(),
  event: z.string(),
  /** JSON text, or null for an action stored with no context. */
  context: z.string().nullable(),
  created_at: z.date(),
  /** A user has a profile image, an integration an icon. */
  actor: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      profile_image: z.string().nullable(),
      icon_image: z.string().nullable(),
    })
    .partial()
    .optional(),
  /** Which of these a resource has depends on its kind: a post has a title, a tag a name. */
  resource: z
    .object({
      id: z.string(),
      title: z.string().nullable(),
      slug: z.string().nullable(),
      name: z.string().nullable(),
      feature_image: z.string().nullable(),
    })
    .partial()
    .optional(),
});
export type Action = z.infer<typeof Action>;
