import logging from '@tryghost/logging';

export interface Actor {
    id: string;
    type: 'user' | 'integration';
}

export interface RequestContext {
    actor: Actor | null;
}

export interface ActionRecorder {
    add(data: Record<string, unknown>, options: {autoRefresh: boolean}): Promise<unknown>;
}

// The history UI only surfaces a verb-specific label (action_name) for 'edited' events; 'added' and
// 'deleted' render as the bare event. So 'reset' maps to 'edited' to read as "reset", while
// 'add'/'remove' read as plain "added"/"deleted".
const COMMANDS = {
    add: 'added',
    reset: 'edited',
    remove: 'deleted'
} as const satisfies Record<string, 'added' | 'edited' | 'deleted'>;

export type GiftLinkVerb = keyof typeof COMMANDS;

export type RecordGiftLinkAction =
    (input: {context: RequestContext; verb: GiftLinkVerb; subject: string | null}) => Promise<void>;

// Best-effort action-log write: a failed action must never fail the command that triggered it.
export async function recordGiftLinkAction(
    {Action, context, verb, subject}:
    {Action: ActionRecorder; context: RequestContext; verb: GiftLinkVerb; subject: string | null}
): Promise<void> {
    if (!context.actor) {
        return;
    }
    const event = COMMANDS[verb];
    try {
        await Action.add({
            event,
            resource_type: 'gift_link',
            resource_id: subject,
            actor_type: context.actor.type,
            actor_id: context.actor.id,
            ...(event === 'edited' ? {context: {action_name: verb}} : {})
        }, {autoRefresh: false});
    } catch (err) {
        logging.error(err);
    }
}
