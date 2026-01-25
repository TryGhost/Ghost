import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const newsletterTable = sqliteTable('newsletters', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    senderEmail: text('sender_email').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const issueTable = sqliteTable('issues', {
    id: text('id').primaryKey(),
    newsletterId: text('newsletter_id').notNull(),
    subject: text('subject').notNull(),
    status: text('status').notNull(),
    sendAt: integer('send_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const deliveryJobTable = sqliteTable('delivery_jobs', {
    id: text('id').primaryKey(),
    issueId: text('issue_id').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull()
});

export type NewsletterRecord = typeof newsletterTable.$inferSelect;
export type NewNewsletterRecord = typeof newsletterTable.$inferInsert;
export type IssueRecord = typeof issueTable.$inferSelect;
export type NewIssueRecord = typeof issueTable.$inferInsert;
export type DeliveryJobRecord = typeof deliveryJobTable.$inferSelect;
export type NewDeliveryJobRecord = typeof deliveryJobTable.$inferInsert;
