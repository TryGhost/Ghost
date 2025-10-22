import baseDebug from '@tryghost/debug';
const debug = baseDebug('e2e:mailpit-client');

export interface EmailAddress {
    Address: string;
    Name: string
}

export interface EmailMessage {
    ID: string;
    From: EmailAddress;
    To: EmailAddress[];
    Subject: string;
    Created: string;
}

export interface EmailMessageDetailed extends EmailMessage {
    HTML: string;
    Text: string;
}

export interface EmailMessageSearchResult {
    total: number;
    count: number;
    start: number;
    messages: EmailMessage[];
}

export type EmailSearchOptions = {
    limit?: number, timeoutMs?: number, numberOfMessages?: number
}

export interface EmailSearchQuery {
    subject: string;
    from: string;
    to: string;
}

export interface EmailClient {
    getMessages(limit: number): Promise<EmailMessage[]>;
    getMessageDetailed(message: EmailMessage): Promise<EmailMessageDetailed>;
    searchByContent(content: string, options?: EmailSearchOptions): Promise<EmailMessage[]>;
    searchByRecipient(recipient: string): Promise<EmailMessage[]>;
    search(queryOptions: Partial<EmailSearchQuery>, options?: EmailSearchOptions): Promise<EmailMessage[]>;
}

export class MailPit implements EmailClient{
    private readonly apiUrl: string;

    constructor(baseUrl: string = 'http://localhost:8026') {
        this.apiUrl = `${baseUrl}/api/v1`;
    }

    async getMessages(limit: number = 50): Promise<EmailMessage[]> {
        const response = await this.executeApiCall(
            `messages?limit=${limit}`,
            'fetch messages'
        );

        return this.parseMessagesFromResponse(response);
    }

    async getMessageDetailed(message: EmailMessage): Promise<EmailMessageDetailed> {
        const response = await this.executeApiCall(
            `message/${message.ID}`,
            'fetch message'
        );

        return await response.json() as EmailMessageDetailed;
    }

    async searchByRecipient(recipient: string, options?: EmailSearchOptions): Promise<EmailMessage[]> {
        return this.search({to: recipient}, options);
    }

    async searchByContent(content: string, options?: EmailSearchOptions): Promise<EmailMessage[]> {
        return this.search({subject: content}, options);
    }

    async search(queryOptions:Partial<EmailSearchQuery>, options?: EmailSearchOptions): Promise<EmailMessage[]> {
        const defaultOptions = {limit: 50, timeoutMs: 10000, numberOfMessages: null};
        const searchOptions = {...defaultOptions, ...options};

        if (searchOptions.timeoutMs !== null) {
            return await this.searchWithWait(
                () => this.searchByQuery(queryOptions, searchOptions.limit),
                searchOptions.timeoutMs,
                searchOptions.numberOfMessages
            );
        }
        return await this.searchByQuery(queryOptions, searchOptions.limit);
    }

    async searchByQuery(options: Partial<EmailSearchQuery>, limit: number = 50): Promise<EmailMessage[]> {
        const queryString = Object.entries(options)
            .filter((entry): entry is [string, string] => {
                const [, value] = entry;
                return value !== null && value !== undefined && value !== '';
            })
            .map(([key, value]) => `${encodeURIComponent(key)}:${encodeURIComponent(value)}`)
            .join('+');

        const response = await this.executeApiCall(
            `search?query=${queryString}&limit=${limit}`,
            'search messages'
        );

        return await this.parseMessagesFromResponse(response);
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

    private async delay(miliSeconds: number) {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, miliSeconds);
        });
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
        debug(`Found ${data.count} messages`);
        return data.messages;
    }
}
