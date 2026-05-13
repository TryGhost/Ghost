import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import type {Notification} from './notification';

const TEMPLATE_SUBJECTS: Record<string, string> = {
    'critical-update': 'Critical Ghost security update'
};

export interface AlertEmailReactorDeps {
    sendEmail: (opts: {
        to: string;
        subject: string;
        html: string;
        text?: string;
        forceTextContent?: boolean;
    }) => Promise<unknown>;
    fetchAdminEmails: () => Promise<string[]>;
    getSiteUrl: () => string;
    renderTemplate: (opts: {
        template: string;
        data: Record<string, unknown>;
    }) => Promise<{html: string; text?: string}>;
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
                if (notification.template) {
                    await sendTemplated(deps, notification, email, siteUrl);
                } else {
                    await sendPlaintext(deps, notification, email, siteUrl);
                }
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

async function sendTemplated(
    deps: AlertEmailReactorDeps,
    notification: Notification,
    recipient: string,
    siteUrl: string
): Promise<void> {
    const template = notification.template!;
    const subject = TEMPLATE_SUBJECTS[template];
    if (!subject) {
        throw new errors.InternalServerError({
            message: `Unknown notification template: ${template}`
        });
    }
    const {html, text} = await deps.renderTemplate({
        template,
        data: {
            ...notification.variables,
            siteUrl,
            recipientEmail: recipient
        }
    });
    await deps.sendEmail({
        to: recipient,
        subject,
        html,
        ...(text ? {text} : {})
    });
}

async function sendPlaintext(
    deps: AlertEmailReactorDeps,
    notification: Notification,
    recipient: string,
    siteUrl: string
): Promise<void> {
    await deps.sendEmail({
        to: recipient,
        subject: `Action required: Critical alert from Ghost instance ${siteUrl}`,
        html: notification.message,
        forceTextContent: true
    });
}
