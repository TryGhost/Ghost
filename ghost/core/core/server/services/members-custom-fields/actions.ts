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

// Field-definition changes map to activity-feed events. A field's timeline reads
// added -> edited -> archived -> restored, and a permanent delete (only from the
// archived state) ends it with deleted.
const COMMANDS = {
    create: 'added',
    rename: 'edited',
    archive: 'archived',
    restore: 'restored',
    delete: 'deleted'
} as const satisfies Record<string, 'added' | 'edited' | 'archived' | 'restored' | 'deleted'>;

export type CustomFieldVerb = keyof typeof COMMANDS;

// `details` is stored in the action's `context` column (Ghost's slot for "diffs,
// meta"). We always pass the field's `primary_name` so the log reads as a human
// label, not a bare key — this is what keeps the timeline legible after a hard
// delete, when the row itself is gone.
export type CustomFieldActionDetails = {primary_name: string; previous_name?: string};

export type RecordCustomFieldAction =
    (input: {context: RequestContext; verb: CustomFieldVerb; subject: string; details: CustomFieldActionDetails}) => Promise<void>;

// Best-effort action-log write: a failed action must never fail the command that triggered it.
export async function recordCustomFieldAction(
    {Action, context, verb, subject, details}:
    {Action: ActionRecorder; context: RequestContext; verb: CustomFieldVerb; subject: string; details: CustomFieldActionDetails}
): Promise<void> {
    if (!context.actor) {
        return;
    }
    try {
        await Action.add({
            event: COMMANDS[verb],
            resource_type: 'member_custom_field',
            resource_id: subject,
            actor_type: context.actor.type,
            actor_id: context.actor.id,
            context: details
        }, {autoRefresh: false});
    } catch (err) {
        logging.error(err);
    }
}
