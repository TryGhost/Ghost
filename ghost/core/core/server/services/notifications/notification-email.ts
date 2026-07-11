import {sanitizeEmailHtml} from './sanitize-email-html';

interface Mailer {
    send(options: {to: string; subject: string; html: string; text?: string}): Promise<unknown>;
}

interface GenerateEmailContent {
    (options: {template: string; data: Record<string, unknown>}): Promise<{html: string; text?: string}>;
}

export interface NotificationEmailDeps {
    mailer: Mailer;
    generateEmailContent: GenerateEmailContent;
    getSiteUrl: () => string;
}

export interface NotificationEmailMessage {
    /**
     * Resolved recipient addresses. The service does not decide who receives
     * the email; callers compose recipients via a separate audience helper.
     */
    to: string[];
    subject: string;
    /**
     * Untrusted HTML content. Sanitised before being rendered into the shell,
     * so the email cannot ship scripts, event handlers or unsafe links even
     * if the upstream source is compromised.
     */
    content: string;
}

/**
 * Renders a notification email in the shared shell and sends it to each
 * recipient. Recipient resolution is a separate concern handled by the caller.
 */
export class NotificationEmailService {
    private readonly mailer: Mailer;
    private readonly generateEmailContent: GenerateEmailContent;
    private readonly getSiteUrl: () => string;

    constructor(deps: NotificationEmailDeps) {
        this.mailer = deps.mailer;
        this.generateEmailContent = deps.generateEmailContent;
        this.getSiteUrl = deps.getSiteUrl;
    }

    async send({to, subject, content}: NotificationEmailMessage): Promise<void> {
        if (!to.length) {
            return;
        }
        const message = sanitizeEmailHtml(content);
        const siteUrl = this.getSiteUrl();
        for (const recipient of to) {
            const {html, text} = await this.generateEmailContent({
                template: 'notification',
                data: {message, siteUrl, recipientEmail: recipient}
            });
            await this.mailer.send({
                to: recipient,
                subject,
                html,
                ...(text ? {text} : {})
            });
        }
    }
}
