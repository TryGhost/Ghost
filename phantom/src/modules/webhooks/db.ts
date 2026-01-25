import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const webhookTable = sqliteTable('webhooks', {
    id: text('id').primaryKey(),
    integrationId: text('integration_id').notNull(),
    event: text('event').notNull(),
    targetUrl: text('target_url').notNull(),
    createdAt: integer('created_at').notNull()
});

export const outboxTable = sqliteTable('outbox_messages', {
    id: text('id').primaryKey(),
    event: text('event').notNull(),
    payload: text('payload').notNull(),
    createdAt: integer('created_at').notNull(),
    status: text('status').notNull()
});

export type WebhookRecord = typeof webhookTable.$inferSelect;
export type NewWebhookRecord = typeof webhookTable.$inferInsert;
export type OutboxRecord = typeof outboxTable.$inferSelect;
export type NewOutboxRecord = typeof outboxTable.$inferInsert;
