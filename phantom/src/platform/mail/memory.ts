import {randomUUID} from 'node:crypto';

export type MailMessage = {
    to: string;
    toName?: string;
    from: string;
    fromName?: string;
    subject: string;
    html: string;
    text: string;
};

export type StoredMailMessage = MailMessage & {
    id: string;
    createdAt: number;
};

export type MailProvider = {
    send: (message: MailMessage) => Promise<void>;
};

export type MemoryMailbox = {
    provider: MailProvider;
    list: (limit?: number) => StoredMailMessage[];
    get: (id: string) => StoredMailMessage | null;
    search: (query: {to?: string; from?: string; subject?: string}, limit?: number) => StoredMailMessage[];
    clear: () => void;
};

// Dev/test mail adapter: keeps sent mail in memory so the e2e harness can
// assert on it through the Mailpit-compatible sink. Real providers (SMTP,
// Mailgun, workers email) implement the same MailProvider surface.
export const createMemoryMailbox = (): MemoryMailbox => {
    const messages: StoredMailMessage[] = [];

    const provider: MailProvider = {
        send: async (message) => {
            messages.unshift({...message, id: randomUUID(), createdAt: Date.now()});
        }
    };

    const list = (limit = 50) => messages.slice(0, limit);

    const get = (id: string) => messages.find((message) => message.id === id) ?? null;

    const search = (query: {to?: string; from?: string; subject?: string}, limit = 50) => {
        const matches = messages.filter((message) => {
            if (query.to && !message.to.toLowerCase().includes(query.to.toLowerCase())) {
                return false;
            }
            if (query.from && !message.from.toLowerCase().includes(query.from.toLowerCase())) {
                return false;
            }
            if (query.subject && !message.subject.toLowerCase().includes(query.subject.toLowerCase())) {
                return false;
            }
            return true;
        });
        return matches.slice(0, limit);
    };

    const clear = () => {
        messages.length = 0;
    };

    return {provider, list, get, search, clear};
};
