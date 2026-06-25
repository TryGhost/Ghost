import logging from '@tryghost/logging';

export interface Actor {
    id: string;
    type: 'user' | 'integration';
}

export interface RequestContext {
    actor: Actor | null;
}

// The history UI keys its icons and filters off these three events.
export type ActionEvent = 'added' | 'edited' | 'deleted';

// actionName refines the label, but the history UI only surfaces it for 'edited' events; 'added' and
// 'deleted' show the bare event.
export interface ActionEntry {
    event: ActionEvent;
    resourceType: string;
    resourceId: string | null;
    actionName?: string;
    actor: Actor;
}

export type LogAction = (entry: ActionEntry) => Promise<void>;

interface ActionRecorder {
    add(data: Record<string, unknown>, options: {autoRefresh: boolean}): Promise<unknown>;
}

export function actionLogger(Action: ActionRecorder): LogAction {
    return async (entry) => {
        try {
            await Action.add({
                event: entry.event,
                resource_type: entry.resourceType,
                resource_id: entry.resourceId,
                actor_type: entry.actor.type,
                actor_id: entry.actor.id,
                ...(entry.actionName ? {context: {action_name: entry.actionName}} : {})
            }, {autoRefresh: false});
        } catch (err) {
            logging.error(err);
        }
    };
}
