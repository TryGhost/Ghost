import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const analyticsEventTable = sqliteTable('analytics_events', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    type: text('type').notNull(),
    createdAt: integer('created_at').notNull()
});

export type AnalyticsEventRecord = typeof analyticsEventTable.$inferSelect;
export type NewAnalyticsEventRecord = typeof analyticsEventTable.$inferInsert;
