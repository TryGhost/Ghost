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

type emailSearchOptions = {
    limit?: number, timeoutMs?: number, numberOfMessages?: number
}

export interface EmailClient {
    getMessages(limit: number): Promise<EmailMessage[]>;
    searchByContent(content: string, options?: emailSearchOptions): Promise<EmailMessage[]>;
    searchByRecipient(recipient: string): Promise<EmailMessage[]>;
    getLatestMessageFor(recipient: string): Promise<EmailMessage | null>;
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

    async searchByRecipient(email: string, options?: emailSearchOptions): Promise<EmailMessage[]> {
        const defaultOptions = {limit: 50, timeoutMs: 10000, numberOfMessages: null};
        const searchOptions = {...defaultOptions, ...options};

        if (searchOptions.timeoutMs) {
            return this.searchWithWait(() => this.searchByQuery(
                email, searchOptions.limit, 'to'), searchOptions.timeoutMs, searchOptions.numberOfMessages
            );
        }
        return this.searchByQuery(email, searchOptions.limit, 'to');
    }

    async searchByContent(content: string, options?: emailSearchOptions): Promise<EmailMessage[]> {
        const defaultOptions = {limit: 50, timeoutMs: 10000, numberOfMessages: null};
        const searchOptions = {...defaultOptions, ...options};

        if (searchOptions.timeoutMs) {
            return this.searchWithWait(() => this.searchByQuery(
                content, searchOptions.limit, 'containing'), searchOptions.timeoutMs, searchOptions.numberOfMessages
            );
        }
        return this.searchByQuery(content, searchOptions.limit, 'containing');
    }

    private async searchByQuery(value: string, limit: number = 50, kind: 'to' | 'from' | 'containing'): Promise<EmailMessage[]> {
        const response = await this.executeApiCall(
            `search?kind=${kind}&query=${encodeURIComponent(value)}&limit=${limit}`,
            'search messages'
        );

        return this.parseMessagesFromResponse(response);
    }

    async getLatestMessageFor(email: string): Promise<EmailMessage | null> {
        const messages = await this.searchByRecipient(email, {numberOfMessages: 1});
        return messages.length > 0 ? messages[0] : null;
    }

    private async searchWithWait(
        searchFn: () => Promise<EmailMessage[]>,
        timeoutMs: number = 10000,
        numberOfMessages: number | null = null
    ): Promise<EmailMessage[]> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const messages = await searchFn();

            if (numberOfMessages === null) {
                if (messages.length > 0) {
                    debug(`Found ${messages.length} messages`);
                    return messages;
                }
            } else {
                if (messages.length === numberOfMessages) {
                    debug(`Found ${messages.length} messages`);
                    return messages;
                }
            }

            await this.delay(500);
        }

        throw new Error(`Timeout after ${timeoutMs}ms waiting for search results`);
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
