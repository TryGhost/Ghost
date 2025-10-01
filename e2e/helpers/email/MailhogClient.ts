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

export interface EmailMessage {
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
    items: EmailMessage[];
}

export interface EmailClient {
    getMessages(limit: number): Promise<EmailMessage[]>;
    searchByRecipient(recipient: string): Promise<EmailMessage[]>;
    getLatestMessageFor(recipient: string): Promise<EmailMessage | null>;
    waitForEmail(email: string): Promise<EmailMessage>;
    deleteAllMessages(): Promise<void>;
}

export class MailhogClient implements EmailClient{
    private readonly baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:8026') {
        this.baseUrl = baseUrl;
    }

    async getMessages(limit: number = 50): Promise<EmailMessage[]> {
        debug('Getting messages from Mailhog');
        const response = await fetch(`${this.baseUrl}/api/v2/messages?limit=${limit}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch messages: ${response.statusText}`);
        }
        const data = await response.json() as MailhogSearchResult;
        debug(`Found ${data.items.length} messages`);
        return data.items;
    }

    async searchByRecipient(email: string, limit: number = 50): Promise<EmailMessage[]> {
        debug(`Searching for messages to ${email}`);
        const response = await fetch(`${this.baseUrl}/api/v2/search?kind=to&query=${encodeURIComponent(email)}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(`Failed to search messages: ${response.statusText}`);
        }
        const data = await response.json() as MailhogSearchResult;
        debug(`Found ${data.items.length} messages for ${email}`);
        return data.items;
    }

    async getLatestMessageFor(email: string): Promise<EmailMessage | null> {
        const messages = await this.searchByRecipient(email, 1);
        return messages.length > 0 ? messages[0] : null;
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

            // Wait a bit before checking again
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 500);
            });
        }

        throw new Error(`Timeout waiting for email to ${email}`);
    }

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
}
