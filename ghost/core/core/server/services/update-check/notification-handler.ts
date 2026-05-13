import {z} from 'zod';
import type {NotificationInput} from '../notifications/service';

const UpdateCheckMessage = z.object({
    id: z.string(),
    content: z.string(),
    type: z.string().default('info'),
    dismissible: z.boolean().default(true),
    top: z.boolean().default(false)
});

export const UpdateCheckNotification = z.object({
    custom: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
    version: z.string().optional(),
    messages: z.array(UpdateCheckMessage).default([])
});

export type UpdateCheckNotification = z.input<typeof UpdateCheckNotification>;

export interface UpdateCheckHandlerOptions {
    notificationGroups?: string[];
}

const NOTIFICATION_TYPES = ['info', 'alert', 'warn'] as const;
type NotificationType = (typeof NOTIFICATION_TYPES)[number];

function safeType(value: string): NotificationType {
    return NOTIFICATION_TYPES.includes(value as NotificationType)
        ? (value as NotificationType)
        : 'info';
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
        type: safeType(m.type),
        custom: isCustom,
        dismissible: m.dismissible,
        top: m.top
    }));
}
