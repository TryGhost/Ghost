import logging from '@tryghost/logging';
import type {Notification} from './notification';

export interface AlertEmailReactorDeps {
    sendEmail: (opts: {
        to: string;
        subject: string;
        html: string;
        forceTextContent?: boolean;
    }) => Promise<unknown>;
    fetchAdminEmails: () => Promise<string[]>;
    getSiteUrl: () => string;
}

export function createAlertEmailReactor(
    deps: AlertEmailReactorDeps
): (notification: Notification) => Promise<void> {
    return async (notification) => {
        if (notification.type !== 'alert') {
            return;
        }
        let adminEmails: string[];
        let siteUrl: string;
        try {
            adminEmails = await deps.fetchAdminEmails();
            siteUrl = deps.getSiteUrl();
        } catch (err) {
            logging.error(
                {
                    event: {name: 'notifications.resolve-recipients.error'},
                    err,
                    notificationId: notification.id
                },
                'Failed to resolve recipients for alert email'
            );
            return;
        }
        for (const email of adminEmails) {
            try {
                await deps.sendEmail({
                    to: email,
                    subject: `Action required: Critical alert from Ghost instance ${siteUrl}`,
                    html: notification.message,
                    forceTextContent: true
                });
            } catch (err) {
                logging.error(
                    {
                        event: {name: 'notifications.send-alert-email.error'},
                        err,
                        notificationId: notification.id,
                        recipientEmail: email
                    },
                    'Failed to send notification alert email'
                );
            }
        }
    };
}
