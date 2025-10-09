import {EmailMessage} from './MailhogClient';
import baseDebug from '@tryghost/debug';
const debug = baseDebug('e2e:email');

export class EmailMessageBody {
    constructor(private readonly message: EmailMessage) {
        this.message = message;
    }

    getTextContent(): string {
        if (this.areMimePartsAvailable()) {
            for (const part of this.getMimeParts()) {
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
        return this.getMainBody('plain');
    }

    getHtmlContent(): string {
        if (this.areMimePartsAvailable()) {
            for (const part of this.getMimeParts()) {
                if (part.Headers && part.Headers['Content-Type'] &&
                    part.Headers['Content-Type'][0].includes('text/html')) {
                    return part.Body;
                }
            }
        }

        // Fall back to main body
        return this.getMainBody('html');
    }

    private getMainBody(type: 'html' | 'plain'): string {
        const body = this.message.Content.Body;
        if (type === 'plain') {
            return body;
        }

        if (body.includes('<html') || body.includes('<body')) {
            return body;
        }

        return '';
    }

    private getMimeParts() {
        return this.message.MIME?.Parts ?? [];
    }

    private areMimePartsAvailable() {
        const result = this.message.MIME && this.message.MIME.Parts;
        if (result === null || result === undefined) {
            return false;
        }

        return true;
    }
}
