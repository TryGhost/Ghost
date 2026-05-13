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
        const adminEmails = await deps.fetchAdminEmails();
        const siteUrl = deps.getSiteUrl();
        for (const email of adminEmails) {
            try {
                await deps.sendEmail({
                    to: email,
                    subject: `Action required: Critical alert from Ghost instance ${siteUrl}`,
                    html: notification.message,
                    forceTextContent: true
                });
            } catch (err) {
                logging.error(err);
            }
        }
    };
}
