import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    outboxTable,
    webhookTable,
    type NewOutboxRecord,
    type NewWebhookRecord,
    type OutboxRecord,
    type WebhookRecord
} from './db.js';

export type WebhookRepository = {
    createWebhook: (webhook: NewWebhookRecord) => Promise<WebhookRecord>;
    listWebhooksByEvent: (event: string) => Promise<WebhookRecord[]>;
    createOutbox: (message: NewOutboxRecord) => Promise<OutboxRecord>;
};

export const createWebhookRepository = (db: DbClient): WebhookRepository => {
    const createWebhook = async (webhook: NewWebhookRecord) => {
        await db.insert(webhookTable).values(webhook);
        const rows = await db.select().from(webhookTable).where(eq(webhookTable.id, webhook.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Webhook missing after insert');
        }
        return rows[0];
    };

    const listWebhooksByEvent = async (event: string) => {
        return db.select().from(webhookTable).where(eq(webhookTable.event, event));
    };

    const createOutbox = async (message: NewOutboxRecord) => {
        await db.insert(outboxTable).values(message);
        const rows = await db.select().from(outboxTable).where(eq(outboxTable.id, message.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Outbox message missing after insert');
        }
        return rows[0];
    };

    return {
        createWebhook,
        listWebhooksByEvent,
        createOutbox
    };
};
