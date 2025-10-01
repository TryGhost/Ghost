import baseDebug from '@tryghost/debug';

const debug = baseDebug('e2e:MailhogClient');

// Email address structure used in From and To fields
export interface EmailAddress {
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

export interface EmailMessageSearchResult {
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
    private readonly apiUrl: string;

    constructor(baseUrl: string = 'http://localhost:8026') {
        this.apiUrl = `${baseUrl}/api/v2`;
    }

    async getMessages(limit: number = 50): Promise<EmailMessage[]> {
        const response = await this.executeApiCall(
            `messages?limit=${limit}`,
            'fetch messages'
        );

        return this.parseMessagesFromResponse(response);
    }

    async searchByRecipient(email: string, limit: number = 50): Promise<EmailMessage[]> {
        const response = await this.executeApiCall(
            `search?kind=to&query=${encodeURIComponent(email)}&limit=${limit}`,
            'search messages'
        );

        return this.parseMessagesFromResponse(response);
    }

    async getLatestMessageFor(email: string): Promise<EmailMessage | null> {
        const messages = await this.searchByRecipient(email, 1);
        return messages.length > 0 ? messages[0] : null;
    }

    async deleteAllMessages(): Promise<void> {
        await this.executeApiCall(
            `messages`,
            'delete all messages',
            'DELETE');
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

    private async parseMessagesFromResponse(response: Response): Promise<EmailMessage[]> {
        const data = await response.json() as EmailMessageSearchResult;
        debug(`Found ${data.items.length} messages`);
        return data.items;
    }

    private async delay(miliSeconds: number) {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, miliSeconds);
        });
    }
}
