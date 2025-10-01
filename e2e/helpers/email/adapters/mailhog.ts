import baseDebug from '@tryghost/debug';
import {EmailAdapter} from '../adapter';
import {EmailMessage, EmailAddress, EmailContent} from '../types';

const debug = baseDebug('e2e:MailhogAdapter');

// Mailhog-specific types (internal to this adapter)
interface MailhogEmailAddress {
    Mailbox: string;
    Domain: string;
    Params: string;
}

interface MailhogMimePart {
    Headers: {
        'Content-Type'?: string[];
        'Content-Transfer-Encoding'?: string[];
        [key: string]: string[] | undefined;
    };
    Body: string;
    MIME?: MailhogMimeStructure;
}

interface MailhogMimeStructure {
    Parts?: MailhogMimePart[];
    Headers?: {
        [key: string]: string[];
    };
}

interface MailhogEmailMessage {
    ID: string;
    From: MailhogEmailAddress;
    To: MailhogEmailAddress[];
    Content: {
        Headers: {
            [key: string]: string[];
        };
        Body: string;
        Size: number;
        MIME: MailhogMimeStructure | null;
    };
    Created: string;
    MIME: MailhogMimeStructure | null;
    Raw: {
        From: string;
        To: string[];
        Data: string;
    };
}

interface MailhogSearchResult {
    total: number;
    count: number;
    start: number;
    items: MailhogEmailMessage[];
}

/**
 * Mailhog email adapter implementation
 * Transforms Mailhog-specific responses to domain models
 */
export class MailhogAdapter implements EmailAdapter {
    private readonly apiUrl: string;

    constructor(baseUrl: string = 'http://localhost:8026') {
        this.apiUrl = `${baseUrl}/api/v2`;
    }

    async getMessages(limit: number = 50): Promise<EmailMessage[]> {
        const response = await this.executeApiCall(
            `messages?limit=${limit}`,
            'fetch messages'
        );

        const mailhogMessages = await this.parseMessagesFromResponse(response);
        return mailhogMessages.map(msg => this.transformToEmailMessage(msg));
    }

    async searchByRecipient(email: string, limit: number = 50): Promise<EmailMessage[]> {
        const response = await this.executeApiCall(
            `search?kind=to&query=${encodeURIComponent(email)}&limit=${limit}`,
            'search messages'
        );

        const mailhogMessages = await this.parseMessagesFromResponse(response);
        return mailhogMessages.map(msg => this.transformToEmailMessage(msg));
    }

    async getLatestMessageFor(email: string): Promise<EmailMessage | null> {
        const messages = await this.searchByRecipient(email, 1);
        return messages.length > 0 ? messages[0] : null;
    }

    async deleteAllMessages(): Promise<void> {
        await this.executeApiCall(
            'messages',
            'delete all messages',
            'DELETE'
        );
    }

    async waitForEmail(email: string, timeoutMs: number = 10000): Promise<EmailMessage> {
        debug(`Waiting for email to ${email}`);
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const message = await this.getLatestMessageFor(email);

            if (message) {
                debug(`Email received for ${email}`);
                return message;
            }

            await this.delay(500);
        }

        throw new Error(`Timeout waiting for email to ${email}`);
    }

    private async executeApiCall(endpoint: string, callType: string, method: string = 'GET'): Promise<Response> {
        debug(`${callType} through ${endpoint}`);
        const response = await fetch(`${this.apiUrl}/${endpoint}`, {method: method});
        if (!response.ok) {
            throw new Error(`Failed to ${callType}: ${response.statusText}`);
        }

        debug(`${callType} through ${endpoint} succeeded`);
        return response;
    }

    private async parseMessagesFromResponse(response: Response): Promise<MailhogEmailMessage[]> {
        const data = await response.json() as MailhogSearchResult;
        debug(`Found ${data.items.length} messages`);
        return data.items;
    }

    private async delay(miliSeconds: number) {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, miliSeconds);
        });
    }

    /**
     * Transform Mailhog-specific message to domain EmailMessage
     */
    private transformToEmailMessage(mailhogMessage: MailhogEmailMessage): EmailMessage {
        return {
            id: mailhogMessage.ID,
            from: this.transformEmailAddress(mailhogMessage.From),
            to: mailhogMessage.To.map(addr => this.transformEmailAddress(addr)),
            subject: this.extractSubject(mailhogMessage),
            content: this.extractContent(mailhogMessage),
            headers: mailhogMessage.Content.Headers,
            createdAt: new Date(mailhogMessage.Created),
            rawData: mailhogMessage.Raw.Data
        };
    }

    /**
     * Transform Mailhog email address to domain EmailAddress
     */
    private transformEmailAddress(mailhogAddress: MailhogEmailAddress): EmailAddress {
        const email = `${mailhogAddress.Mailbox}@${mailhogAddress.Domain}`;
        return {email};
    }

    /**
     * Extract subject from Mailhog message headers
     */
    private extractSubject(mailhogMessage: MailhogEmailMessage): string {
        const subjectHeader = mailhogMessage.Content.Headers.Subject;
        return subjectHeader ? subjectHeader[0] : '';
    }

    /**
     * Extract text and HTML content from Mailhog MIME structure
     */
    private extractContent(mailhogMessage: MailhogEmailMessage): EmailContent {
        return {
            text: this.extractPlainText(mailhogMessage),
            html: this.extractHtml(mailhogMessage)
        };
    }

    /**
     * Extract plain text content from MIME parts
     */
    private extractPlainText(mailhogMessage: MailhogEmailMessage): string {
        if (mailhogMessage.MIME && mailhogMessage.MIME.Parts) {
            for (const part of mailhogMessage.MIME.Parts) {
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
        return mailhogMessage.Content.Body;
    }

    /**
     * Extract HTML content from MIME parts
     */
    private extractHtml(mailhogMessage: MailhogEmailMessage): string {
        if (mailhogMessage.MIME && mailhogMessage.MIME.Parts) {
            for (const part of mailhogMessage.MIME.Parts) {
                if (part.Headers && part.Headers['Content-Type'] &&
                    part.Headers['Content-Type'][0].includes('text/html')) {
                    return part.Body;
                }
            }
        }

        // Fall back to main body if it looks like HTML
        const body = mailhogMessage.Content.Body;
        if (body.includes('<html') || body.includes('<body')) {
            return body;
        }

        return '';
    }
}
