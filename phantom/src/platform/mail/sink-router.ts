import {Hono} from 'hono';
import type {MemoryMailbox, StoredMailMessage} from './memory.js';

// Mailpit-compatible read API over the in-memory mailbox, mounted only in
// e2e mode: the vendored Mailpit client from ghost's e2e suite points here
// instead of a real SMTP catcher.
export const createMailSinkRouter = (mailbox: MemoryMailbox) => {
    const router = new Hono();

    const wireMessage = (message: StoredMailMessage) => ({
        ID: message.id,
        From: {Address: message.from, Name: message.fromName ?? ''},
        To: [{Address: message.to, Name: message.toName ?? ''}],
        Subject: message.subject,
        Created: new Date(message.createdAt).toISOString()
    });

    const wireList = (messages: StoredMailMessage[]) => ({
        total: messages.length,
        count: messages.length,
        start: 0,
        messages: messages.map(wireMessage)
    });

    router.get('/api/v1/messages', (context) => {
        const limit = Number(context.req.query('limit') ?? '50') || 50;
        return context.json(wireList(mailbox.list(limit)));
    });

    router.get('/api/v1/message/:id', (context) => {
        const message = mailbox.get(context.req.param('id'));
        if (!message) {
            return context.json({error: 'not found'}, 404);
        }
        return context.json({
            ...wireMessage(message),
            HTML: message.html,
            Text: message.text
        });
    });

    // Mailpit search queries arrive as `to:addr+subject:words`.
    router.get('/api/v1/search', (context) => {
        const limit = Number(context.req.query('limit') ?? '50') || 50;
        const raw = context.req.query('query') ?? '';
        const query: {to?: string; from?: string; subject?: string} = {};
        for (const clause of raw.split(/[+\s]/)) {
            const separator = clause.indexOf(':');
            if (separator === -1) {
                continue;
            }
            const key = clause.slice(0, separator);
            const value = decodeURIComponent(clause.slice(separator + 1)).replace(/^"|"$/g, '');
            if (key === 'to' || key === 'from' || key === 'subject') {
                query[key] = value;
            }
        }
        return context.json(wireList(mailbox.search(query, limit)));
    });

    return router;
};
