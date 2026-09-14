import logging from '@tryghost/logging';

export interface Actor {
  id: string;
  type: 'user' | 'integration';
}

export interface RequestContext {
  actor: Actor | null;
}

/**
 * Who is acting, read off an API frame's context.
 *
 * Here rather than in each endpoint, because two resources now record metafield history
 * and a second reading of the same shape is a second chance to disagree about it. An
 * integration and a user are both actors; a request that is neither — a webhook, a job —
 * has none, and the history says so rather than guessing.
 */
export function actingContext(context: unknown): RequestContext {
  const frame = (context ?? {}) as { user?: string; integration?: { id: string } };
  if (frame.integration) {
    return { actor: { id: frame.integration.id, type: 'integration' } };
  }
  if (frame.user) {
    return { actor: { id: frame.user, type: 'user' } };
  }
  return { actor: null };
}

export interface ActionRecorder {
  add(data: Record<string, unknown>, options: { autoRefresh: boolean }): Promise<unknown>;
}

// Field-definition changes map to activity-feed events. A field's timeline reads
// added -> edited -> archived -> restored, and a permanent delete (only from the
// archived state) ends it with deleted.
const COMMANDS = {
  create: 'added',
  rename: 'edited',
  reorder: 'edited',
  archive: 'archived',
  restore: 'restored',
  delete: 'deleted',
} as const satisfies Record<string, 'added' | 'edited' | 'archived' | 'restored' | 'deleted'>;

export type MetafieldVerb = keyof typeof COMMANDS;

// `details` is stored in the action's `context` column (Ghost's slot for "diffs,
// meta").
//
// A change to one field always passes its `primary_name` so the log reads as a human
// label, not a bare key — this is what keeps the timeline legible after a hard delete,
// when the row itself is gone. `key` rides alongside it because the key is how a field
// is addressed publicly — its id never leaves the API.
//
// A reorder names no field: it carries the count and the word the feed reads it by.
export type MetafieldActionDetails =
  | { primary_name: string; key: string; previous_name?: string }
  | { action_name: 'reordered'; count: number };

// `subject` is the field's row id, or null for an act that belongs to no single field.
export type RecordMetafieldAction = (input: {
  context: RequestContext;
  verb: MetafieldVerb;
  subject: string | null;
  details: MetafieldActionDetails;
}) => Promise<void>;

// Best-effort action-log write: a failed action must never fail the command that triggered it.
export async function recordMetafieldAction({
  Action,
  context,
  verb,
  subject,
  details,
}: {
  Action: ActionRecorder;
  context: RequestContext;
  verb: MetafieldVerb;
  subject: string | null;
  details: MetafieldActionDetails;
}): Promise<void> {
  if (!context.actor) {
    return;
  }
  try {
    await Action.add(
      {
        event: COMMANDS[verb],
        resource_type: 'member_custom_field',
        // The field's id: this column holds 24 characters, and a key minted from
        // a publisher-chosen name is bounded by the far wider key column, so only
        // the id fits every field. Null where the act had no single field.
        resource_id: subject,
        actor_type: context.actor.type,
        actor_id: context.actor.id,
        context: details,
      },
      { autoRefresh: false },
    );
  } catch (err) {
    logging.error(
      {
        event: { name: 'members.metafields.action_log_failed' },
        err,
        verb,
        subject,
        actorType: context.actor.type,
        actorId: context.actor.id,
      },
      'Failed to record a member metafield action',
    );
  }
}
