import type { GhostLogger } from '@tryghost/logging';
import type { Knex } from 'knex';

export interface Actor {
  id: string;
  type: 'user' | 'integration';
}

export interface RequestContext {
  actor: Actor | null;
}

export interface ActionRecorder {
  add(
    data: Record<string, unknown>,
    options: { transacting: Knex.Transaction; autoRefresh: boolean },
  ): Promise<unknown>;
}

// The history UI only surfaces a verb-specific label (action_name) for 'edited' events; 'added' and
// 'deleted' render as the bare event. So 'reset' maps to 'edited' to read as "reset", while
// 'add'/'remove' read as plain "added"/"deleted".
const COMMANDS = {
  add: 'added',
  reset: 'edited',
  remove: 'deleted',
} as const satisfies Record<string, 'added' | 'edited' | 'deleted'>;

export type GiftLinkVerb = keyof typeof COMMANDS;

export type RecordGiftLinkAction = (
  transacting: Knex.Transaction,
  input: {
    context: RequestContext;
    verb: GiftLinkVerb;
    subject: string | null;
  },
) => Promise<void>;

/**
 * Writes the staff history entry for a gift link command, inside the command's transaction.
 *
 * The entry is part of the change: it is saved when the change is saved and never without it.
 * A failure to write the entry is logged and then thrown, so it fails the command and the
 * change is rolled back with it. Nothing is written for a request that has no actor.
 */
export async function recordGiftLinkAction({
  Action,
  logging,
  transacting,
  context,
  verb,
  subject,
}: {
  Action: ActionRecorder;
  logging: Pick<GhostLogger, 'error'>;
  transacting: Knex.Transaction;
  context: RequestContext;
  verb: GiftLinkVerb;
  subject: string | null;
}): Promise<void> {
  if (!context.actor) {
    return;
  }
  const event = COMMANDS[verb];
  try {
    await Action.add(
      {
        event,
        resource_type: 'gift_link',
        resource_id: subject,
        actor_type: context.actor.type,
        actor_id: context.actor.id,
        ...(event === 'edited' ? { context: { action_name: verb } } : {}),
      },
      { transacting, autoRefresh: false },
    );
  } catch (err) {
    logging.error(err);
    throw err;
  }
}
