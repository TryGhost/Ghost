import logging from '@tryghost/logging';
import {sanitizeEmailHtml} from './sanitize-email-html';

const TEMPLATE = 'notification';

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

interface RenderedEmail {
    html: string;
    text?: string;
}

export interface AlertEmailReactorDeps {
    sendEmail: (options: SendEmailOptions) => Promise<unknown>;
    generateEmailContent: (options: {template: string; data: Record<string, unknown>}) => Promise<RenderedEmail>;
    getAdminEmails: () => Promise<string[]>;
    getSiteUrl: () => string;
}

interface AddedNotification {
    id?: string;
    type?: string;
    message?: string;
}

/**
 * Builds the reaction that emails admins when an alert notification is added.
 * Returned as a function so the notification service can call it after a
 * notification is persisted without knowing what the reaction does.
 *
 * Failures are logged and swallowed: a notification is already stored by the
 * time this runs, so a mail problem must not fail the write that triggered it.
 */
export function createAlertEmailReactor(deps: AlertEmailReactorDeps) {
    return async function maybeSendEmail(notification: AddedNotification): Promise<void> {
        if (notification.type !== 'alert') {
            return;
        }

        let recipients: string[];
        let siteUrl: string;
        try {
            recipients = await deps.getAdminEmails();
            siteUrl = deps.getSiteUrl();
        } catch (err) {
            logging.error({
                err,
                event: {name: 'notifications.alert-email.resolve-recipients-failed'},
                notificationId: notification.id
            }, 'Could not resolve recipients for notification alert email');
            return;
        }

        const message = sanitizeEmailHtml(typeof notification.message === 'string' ? notification.message : '');

        for (const to of recipients) {
            try {
                const {html, text} = await deps.generateEmailContent({
                    template: TEMPLATE,
                    data: {message, siteUrl, recipientEmail: to}
                });
                await deps.sendEmail({
                    to,
                    subject: `Ghost notification from ${siteUrl}`,
                    html,
                    ...(text ? {text} : {})
                });
            } catch (err) {
                logging.error({
                    err,
                    event: {name: 'notifications.alert-email.send-failed'},
                    notificationId: notification.id,
                    recipientEmail: to
                }, 'Could not send notification alert email');
            }
        }
    };
}
