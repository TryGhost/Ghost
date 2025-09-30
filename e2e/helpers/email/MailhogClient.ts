import baseDebug from '@tryghost/debug';

const debug = baseDebug('e2e:MailhogClient');

// Email address structure used in From and To fields
export interface EmailAddress {
    Relays: string[] | null;
    Mailbox: string;
    Domain: string;
    Params: string;
}

// MIME part structure for multipart messages
export interface MimePart {
    Headers: {
        'Content-Type'?: string[];
        'Content-Transfer-Encoding'?: string[];
        [key: string]: string[] | undefined;
    };
    Body: string;
    MIME?: MimeStructure;
}

// MIME structure for email content
export interface MimeStructure {
    Parts?: MimePart[];
    Headers?: {
        [key: string]: string[];
    };
}

export interface MailhogMessage {
    ID: string;
    From: EmailAddress;
    To: EmailAddress[];
    Content: {
        Headers: {
            [key: string]: string[];
        };
        Body: string;
        Size: number;
        MIME: MimeStructure | null;
    };
    Created: string;
    MIME: MimeStructure | null;
    Raw: {
        From: string;
        To: string[];
        Data: string;
    };
}

export interface MailhogSearchResult {
    total: number;
    count: number;
    start: number;
    items: MailhogMessage[];
}

export class MailhogClient {
    private readonly baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:8026') {
        this.baseUrl = baseUrl;
    }

    /**
     * Get all messages from Mailhog
     */
    async getMessages(limit: number = 50): Promise<MailhogMessage[]> {
        debug('Getting messages from Mailhog');
        const response = await fetch(`${this.baseUrl}/api/v2/messages?limit=${limit}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch messages: ${response.statusText}`);
        }
        const data = await response.json() as MailhogSearchResult;
        debug(`Found ${data.items.length} messages`);
        return data.items;
    }

    /**
     * Search for messages by recipient email
     */
    async searchByRecipient(email: string, limit: number = 50): Promise<MailhogMessage[]> {
        debug(`Searching for messages to ${email}`);
        const response = await fetch(`${this.baseUrl}/api/v2/search?kind=to&query=${encodeURIComponent(email)}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(`Failed to search messages: ${response.statusText}`);
        }
        const data = await response.json() as MailhogSearchResult;
        debug(`Found ${data.items.length} messages for ${email}`);
        return data.items;
    }

    /**
     * Get the latest message for a recipient
     */
    async getLatestMessageFor(email: string): Promise<MailhogMessage | null> {
        const messages = await this.searchByRecipient(email, 1);
        return messages.length > 0 ? messages[0] : null;
    }

    /**
     * Wait for an email to arrive for a specific recipient
     */
    async waitForEmail(email: string, timeoutMs: number = 10000): Promise<MailhogMessage> {
        debug(`Waiting for email to ${email}`);
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            const message = await this.getLatestMessageFor(email);
            if (message) {
                debug(`Email received for ${email}`);
                return message;
            }
            
            // Wait a bit before checking again
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 500);
            });
        }
        
        throw new Error(`Timeout waiting for email to ${email}`);
    }

    /**
     * Extract magic link from a Ghost member signup email
     */
    extractMagicLink(message: MailhogMessage): string | null {
        // Get the decoded plain text content
        const body = this.getPlainTextContent(message);

        // Look for magic link pattern in the email body
        // Ghost magic links typically look like: http://localhost:30000/members/?token=...&action=signup
        const magicLinkRegex = /https?:\/\/[^\s]+\/members\/\?token=[^\s&]+(&action=\w+)?(&r=[^\s]+)?/gi;
        const matches = body.match(magicLinkRegex);

        if (matches && matches.length > 0) {
            const magicLink = matches[0];
            debug(`Found magic link: ${magicLink}`);

            // Validate that the link has required parameters
            if (!magicLink.includes('token=')) {
                debug('Magic link missing token parameter');
                return null;
            }

            if (!magicLink.includes('action=signup')) {
                debug('Magic link missing action=signup parameter');
                return null;
            }

            return magicLink;
        }

        debug('No magic link found in email');
        debug('Email body searched:', body.substring(0, 500));
        return null;
    }

    /**
     * Clear all messages from Mailhog
     */
    async deleteAllMessages(): Promise<void> {
        debug('Deleting all messages from Mailhog');
        const response = await fetch(`${this.baseUrl}/api/v1/messages`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Failed to delete messages: ${response.statusText}`);
        }
        debug('All messages deleted');
    }

    /**
     * Get message content as plain text
     */
    getPlainTextContent(message: MailhogMessage): string {
        // Try to get plain text from MIME parts if available
        if (message.MIME && message.MIME.Parts) {
            for (const part of message.MIME.Parts) {
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
        return message.Content.Body;
    }

    /**
     * Get message content as HTML
     */
    getHtmlContent(message: MailhogMessage): string {
        // Try to get HTML from MIME parts if available
        if (message.MIME && message.MIME.Parts) {
            for (const part of message.MIME.Parts) {
                if (part.Headers && part.Headers['Content-Type'] &&
                    part.Headers['Content-Type'][0].includes('text/html')) {
                    return part.Body;
                }
            }
        }

        // Fall back to main body if it looks like HTML
        const body = message.Content.Body;
        if (body.includes('<html') || body.includes('<body')) {
            return body;
        }

        return '';
    }

    /**
     * Wait for email and extract magic link
     */
    async waitForMagicLink(email: string, timeoutMs: number = 10000): Promise<string> {
        debug(`Waiting for magic link for ${email}`);
        const message = await this.waitForEmail(email, timeoutMs);
        const magicLink = this.extractMagicLink(message);

        if (!magicLink) {
            throw new Error(`No magic link found in email for ${email}`);
        }

        return magicLink;
    }
}