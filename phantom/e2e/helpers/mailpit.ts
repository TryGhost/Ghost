// Slim port of /e2e/helpers/services/email/mail-pit.ts, pointed at phantom's
// Mailpit-compatible in-memory mail sink (/__mail__) instead of a real
// Mailpit container.
export interface EmailAddress {
    Address: string;
    Name: string;
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

export type EmailSearchOptions = {
    limit?: number;
    timeoutMs?: number | null;
    numberOfMessages?: number | null;
};

export interface EmailSearchQuery {
    subject: string;
    from: string;
    to: string;
}

export class MailPit {
    private readonly apiUrl: string;

    constructor(baseUrl: string) {
        this.apiUrl = `${baseUrl.replace(/\/$/, '')}/__mail__/api/v1`;
    }

    async getMessages(limit: number = 50): Promise<EmailMessage[]> {
        const response = await this.executeApiCall(`messages?limit=${limit}`);
        return this.parseMessagesFromResponse(response);
    }

    async getMessageDetailed(message: EmailMessage): Promise<EmailMessageDetailed> {
        const response = await this.executeApiCall(`message/${message.ID}`);
        return await response.json() as EmailMessageDetailed;
    }

    async searchByRecipient(recipient: string, options?: EmailSearchOptions): Promise<EmailMessage[]> {
        return this.search({to: recipient}, options);
    }

    async searchByContent(content: string, options?: EmailSearchOptions): Promise<EmailMessage[]> {
        return this.search({subject: content}, options);
    }

    async search(queryOptions: Partial<EmailSearchQuery>, options?: EmailSearchOptions): Promise<EmailMessage[]> {
        const searchOptions = {limit: 50, timeoutMs: 10000 as number | null, numberOfMessages: null as number | null, ...options};
        if (searchOptions.timeoutMs !== null) {
            return this.searchWithWait(
                () => this.searchByQuery(queryOptions, searchOptions.limit),
                searchOptions.timeoutMs,
                searchOptions.numberOfMessages
            );
        }
        return this.searchByQuery(queryOptions, searchOptions.limit);
    }

    private async searchByQuery(options: Partial<EmailSearchQuery>, limit: number = 50): Promise<EmailMessage[]> {
        const queryString = Object.entries(options)
            .filter((entry): entry is [string, string] => Boolean(entry[1]))
            .map(([key, value]) => `${encodeURIComponent(key)}:${encodeURIComponent(value)}`)
            .join('+');
        const response = await this.executeApiCall(`search?query=${queryString}&limit=${limit}`);
        return this.parseMessagesFromResponse(response);
    }

    private async searchWithWait(
        searchFn: () => Promise<EmailMessage[]>,
        timeoutMs: number,
        numberOfMessages: number | null
    ): Promise<EmailMessage[]> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const messages = await searchFn();
            if (numberOfMessages === null ? messages.length > 0 : messages.length === numberOfMessages) {
                return messages;
            }
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 250);
            });
        }
        throw new Error(`Timeout after ${timeoutMs}ms waiting for search results`);
    }

    private async executeApiCall(endpoint: string): Promise<Response> {
        const response = await fetch(`${this.apiUrl}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`Mail sink call failed: ${response.statusText}`);
        }
        return response;
    }

    private async parseMessagesFromResponse(response: Response): Promise<EmailMessage[]> {
        const data = await response.json() as {messages: EmailMessage[]};
        return data.messages;
    }
}

// Vendored from /e2e/helpers/services/email/utils.ts
export function extractMagicLink(emailMessageBody: string, expectedActionInUrl: 'signup' | 'signin' = 'signup'): string {
    const magicLinkRegex = /https?:\/\/[^\s]+\/members\/\?token=[^\s&]+(&action=\w+)?(&r=[^\s]+)?/gi;
    const matches = emailMessageBody.match(magicLinkRegex);

    if (matches && matches.length > 0) {
        const magicLink = matches[0]!;
        if (!magicLink.includes('token=')) {
            throw new Error('Magic link missing token parameter');
        }
        if (!magicLink.includes(`action=${expectedActionInUrl}`)) {
            throw new Error(`Magic link missing action=${expectedActionInUrl} parameter`);
        }
        return magicLink;
    }

    throw new Error('No magic link found in email');
}

export function extractPasswordResetLink(message: EmailMessageDetailed): string {
    const html = message.HTML || '';
    const match = html.match(/href="([^"]*\/ghost\/reset\/[^"]+)"/);
    if (!match) {
        throw new Error('No reset URL found in email HTML');
    }
    return match[1]!;
}

export function extractInviteLink(message: EmailMessageDetailed): string {
    const html = message.HTML || '';
    const match = html.match(/href="([^"]*\/ghost\/signup\/[^"]+)"/);
    if (!match) {
        throw new Error('No invite URL found in email HTML');
    }
    return match[1]!;
}
