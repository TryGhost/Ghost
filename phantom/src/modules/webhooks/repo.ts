import {and, eq, lte} from 'drizzle-orm';
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
    updateWebhook: (webhook: WebhookRecord) => Promise<WebhookRecord>;
    deleteWebhook: (id: string) => Promise<void>;
    getWebhookById: (id: string) => Promise<WebhookRecord | null>;
    listWebhooksByEvent: (event: string) => Promise<WebhookRecord[]>;
    listWebhooksByIntegration: (integrationId: string) => Promise<WebhookRecord[]>;
    createOutbox: (message: NewOutboxRecord) => Promise<OutboxRecord>;
    updateOutbox: (message: OutboxRecord) => Promise<void>;
    getOutboxById: (id: string) => Promise<OutboxRecord | null>;
    listPendingOutbox: (now: number, limit: number) => Promise<OutboxRecord[]>;
    deleteOutbox: (id: string) => Promise<void>;
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

    const listWebhooksByIntegration = async (integrationId: string) => {
        return db.select().from(webhookTable).where(eq(webhookTable.integrationId, integrationId));
    };

    const getWebhookById = async (id: string) => {
        const rows = await db.select().from(webhookTable).where(eq(webhookTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const updateWebhook = async (webhook: WebhookRecord) => {
        await db
            .update(webhookTable)
            .set({
                event: webhook.event,
                targetUrl: webhook.targetUrl
            })
            .where(eq(webhookTable.id, webhook.id));
        const rows = await db.select().from(webhookTable).where(eq(webhookTable.id, webhook.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Webhook missing after update');
        }
        return rows[0];
    };

    const deleteWebhook = async (id: string) => {
        await db.delete(webhookTable).where(eq(webhookTable.id, id));
    };

    const createOutbox = async (message: NewOutboxRecord) => {
        await db.insert(outboxTable).values(message);
        const rows = await db.select().from(outboxTable).where(eq(outboxTable.id, message.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Outbox message missing after insert');
        }
        return rows[0];
    };

    const updateOutbox = async (message: OutboxRecord) => {
        await db
            .update(outboxTable)
            .set({
                status: message.status,
                attempt: message.attempt,
                maxAttempts: message.maxAttempts,
                nextAttemptAt: message.nextAttemptAt,
                lastError: message.lastError
            })
            .where(eq(outboxTable.id, message.id));
    };

    const getOutboxById = async (id: string) => {
        const rows = await db.select().from(outboxTable).where(eq(outboxTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const listPendingOutbox = async (now: number, limit: number) => {
        return db
            .select()
            .from(outboxTable)
            .where(and(eq(outboxTable.status, 'pending'), lte(outboxTable.nextAttemptAt, now)))
            .limit(limit);
    };

    const deleteOutbox = async (id: string) => {
        await db.delete(outboxTable).where(eq(outboxTable.id, id));
    };

    return {
        createWebhook,
        updateWebhook,
        deleteWebhook,
        getWebhookById,
        listWebhooksByEvent,
        listWebhooksByIntegration,
        createOutbox,
        updateOutbox,
        getOutboxById,
        listPendingOutbox,
        deleteOutbox
    };
};
