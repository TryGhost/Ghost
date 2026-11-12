import type { GhostLogger } from '@tryghost/logging';
import type { ActionWriter } from '../action-log/models';
import type { Knex } from 'knex';

export interface Actor {
  id: string;
  type: 'user' | 'integration';
}

export interface RequestContext {
  actor: Actor | null;
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
  actionLog,
  logging,
  transacting,
  context,
  verb,
  subject,
}: {
  actionLog: ActionWriter;
  logging: Pick<GhostLogger, 'error'>;
  transacting: Knex.Transaction;
  context: RequestContext;
  verb: GiftLinkVerb;
  subject: string | null;
}): Promise<void> {
  if (!context.actor) {
    return;
  }
  const about = {
    resource_type: 'gift_link',
    resource_id: subject,
    actor_type: context.actor.type,
    actor_id: context.actor.id,
  } as const;
  try {
    await actionLog.write(
      // Only an edit has a name, and the only edit of a gift link is a reset.
      verb === 'reset'
        ? { ...about, event: COMMANDS[verb], context: { action_name: verb } }
        : { ...about, event: COMMANDS[verb] },
      transacting,
    );
  } catch (err) {
    logging.error(err);
    throw err;
  }
}
