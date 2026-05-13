import {z} from 'zod';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
    noPermissionToDismissNotif: 'You do not have permission to dismiss this notification.'
};

export const Notification = z.object({
    id: z.string().min(1),
    custom: z.boolean().default(false),
    message: z.string(),
    type: z.enum(['info', 'alert', 'warn']).default('info'),
    dismissible: z.boolean().default(true),
    top: z.boolean().optional(),
    createdAtVersion: z.string(),
    addedAt: z.coerce.date(),
    seenBy: z.array(z.string()).default([]),
    template: z.string().optional(),
    variables: z.record(z.string(), z.string()).default({})
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
