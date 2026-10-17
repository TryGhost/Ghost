import logging from '@tryghost/logging';
import { readFrameIdentity } from '../../lib/frame-identity';

export interface Actor {
  id: string;
  type: 'user' | 'integration';
}

export interface RequestContext {
  actor: Actor | null;
}

/**
 * Who is acting, narrowed from the shared reading of an API frame's context.
 *
 * An integration and a user are both actors, and an integration's key names the
 * integration before any user. Whether a user came by session or staff token makes no
 * difference to a gift link's history, so that is not recorded.
 */
export function actingContext(context: unknown): RequestContext {
  const { userId, integrationId } = readFrameIdentity(context);
  if (integrationId) {
    return { actor: { id: integrationId, type: 'integration' } };
  }
  if (userId) {
    return { actor: { id: userId, type: 'user' } };
  }
  return { actor: null };
}

export interface ActionRecorder {
  add(data: Record<string, unknown>, options: { autoRefresh: boolean }): Promise<unknown>;
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

export type RecordGiftLinkAction = (input: {
  context: RequestContext;
  verb: GiftLinkVerb;
  subject: string | null;
}) => Promise<void>;

// Best-effort action-log write: a failed action must never fail the command that triggered it.
export async function recordGiftLinkAction({
  Action,
  context,
  verb,
  subject,
}: {
  Action: ActionRecorder;
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
      { autoRefresh: false },
    );
  } catch (err) {
    logging.error(err);
  }
}
