import {EmailMessage} from './MailhogClient';
import baseDebug from '@tryghost/debug';
const debug = baseDebug('e2e:email');

export class EmailMessageBodyParts {
    constructor(private readonly message: EmailMessage) {
        this.message = message;
    }

    getPlainTextContent(): string {
        // Try to get plain text from MIME parts if available
        if (this.message.MIME && this.message.MIME.Parts) {
            for (const part of this.message.MIME.Parts) {
                if (part.Headers && part.Headers['Content-Type'] &&
                    part.Headers['Content-Type'][0].includes('text/plain')) {
                    // Check if content is base64 encoded
                    if (part.Headers['Content-Transfer-Encoding'] &&
                        part.Headers['Content-Transfer-Encoding'][0] === 'base64') {
                        try {
                            return Buffer.from(part.Body, 'base64').toString('utf-8');
                        } catch (e) {
                            debug('Failed to decode base64 content:', e);
                        }
                    }
                    return part.Body;
                }
            }
        }

        // Fall back to main body
        return this.message.Content.Body;
    }

    getHtmlContent(): string {
        // Try to get HTML from MIME parts if available
        if (this.message.MIME && this.message.MIME.Parts) {
            for (const part of this.message.MIME.Parts) {
                if (part.Headers && part.Headers['Content-Type'] &&
                    part.Headers['Content-Type'][0].includes('text/html')) {
                    return part.Body;
                }
            }
        }

        // Fall back to main body if it looks like HTML
        const body = this.message.Content.Body;
        if (body.includes('<html') || body.includes('<body')) {
            return body;
        }

        return '';
    }
}
