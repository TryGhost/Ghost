import {z} from 'zod';
import logging from '@tryghost/logging';
import {NotificationTypes, type NotificationType} from '../notifications/notification';
import type {NotificationInput} from '../notifications/service';

const UpdateCheckMessage = z.object({
    id: z.string(),
    content: z.string(),
    type: z.string().default('info'),
    dismissible: z.boolean().default(true),
    top: z.boolean().default(false)
});

export const UpdateCheckNotification = z.object({
    custom: z.boolean().default(false),
    version: z.string().optional(),
    messages: z.array(UpdateCheckMessage).default([])
});

export type UpdateCheckNotification = z.input<typeof UpdateCheckNotification>;

export interface UpdateCheckHandlerOptions {
    notificationGroups?: string[];
}

// Map upstream's documented `info|error|warning` severity scale onto Ghost's
// internal `info|alert|warn` enum. Unknown values default to `info` but get
// logged so we notice upstream introducing a new severity rather than silently
// downgrading it.
const TYPE_ALIASES: Record<string, NotificationType> = {
    error: 'alert',
    warning: 'warn'
};

function mapType(value: string): NotificationType {
    if (NotificationTypes.includes(value as NotificationType)) {
        return value as NotificationType;
    }
    const aliased = TYPE_ALIASES[value];
    if (aliased) {
        return aliased;
    }
    logging.warn(
        {
            event: {name: 'updatecheck.handler.unknown-type'},
            receivedType: value
        },
        'UpdateCheck delivered an unrecognised notification type; defaulting to info'
    );
    return 'info';
}

export function toNotificationInputs(
    input: UpdateCheckNotification,
    options: UpdateCheckHandlerOptions = {}
): NotificationInput[] {
    const parsed = UpdateCheckNotification.safeParse(input);
    if (!parsed.success) {
        return [];
    }
    const notification = parsed.data;

    if (notification.messages.length === 0) {
        return [];
    }

    if (notification.custom) {
        const groups = (options.notificationGroups ?? []).concat(['all']);
        const wireVersion = notification.version;
        const matched = wireVersion
            ? groups.some(g => Boolean(wireVersion.match(new RegExp(g))))
            : false;
        if (!matched) {
            return [];
        }
    }

    const isCustom = !!notification.custom;
    return notification.messages.map((m): NotificationInput => ({
        id: m.id,
        message: m.content,
        type: mapType(m.type),
        custom: isCustom,
        dismissible: m.dismissible,
        top: m.top
    }));
}
