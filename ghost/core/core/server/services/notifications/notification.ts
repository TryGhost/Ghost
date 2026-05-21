import {z} from 'zod';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
    noPermissionToDismissNotif: 'You do not have permission to dismiss this notification.'
};

export const NotificationTypes = ['info', 'alert', 'warn'] as const;
export type NotificationType = (typeof NotificationTypes)[number];

export const Notification = z.object({
    id: z.string().min(1),
    // Defaults to `true` so a caller that forgets to set `custom` does not
    // accidentally mark a notification as a release-channel one — that flag
    // triggers existing-release replacement at the service layer.
    custom: z.boolean().default(true),
    message: z.string(),
    type: z.enum(NotificationTypes).default('info'),
    dismissible: z.boolean().default(true),
    top: z.boolean().optional(),
    createdAtVersion: z.string(),
    addedAt: z.coerce.date(),
    seenBy: z.array(z.string()).default([])
});

export type Notification = z.infer<typeof Notification>;

export function dismiss(notification: Notification, userId: string): Notification {
    if (!notification.dismissible) {
        throw new errors.NoPermissionError({
            message: tpl(messages.noPermissionToDismissNotif)
        });
    }
    if (notification.seenBy.includes(userId)) {
        return notification;
    }
    return {...notification, seenBy: [...notification.seenBy, userId]};
}
