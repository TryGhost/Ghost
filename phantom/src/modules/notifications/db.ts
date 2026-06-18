import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const notificationTable = sqliteTable('notifications', {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    status: text('status').notNull(),
    createdBy: text('created_by'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export type NotificationRecord = typeof notificationTable.$inferSelect;
export type NewNotificationRecord = typeof notificationTable.$inferInsert;
