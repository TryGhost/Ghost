import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const analyticsEventTable = sqliteTable('analytics_events', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    type: text('type').notNull(),
    createdAt: integer('created_at').notNull()
});

export const analyticsAggregateTable = sqliteTable('analytics_aggregates', {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    windowStart: integer('window_start').notNull(),
    windowEnd: integer('window_end').notNull(),
    total: integer('total').notNull(),
    metadata: text('metadata').notNull(),
    createdAt: integer('created_at').notNull()
});

export const analyticsSnapshotTable = sqliteTable('analytics_snapshots', {
    id: text('id').primaryKey(),
    lastEventAt: integer('last_event_at').notNull(),
    payload: text('payload').notNull(),
    createdAt: integer('created_at').notNull()
});

export const exploreSyncTable = sqliteTable('explore_syncs', {
    id: text('id').primaryKey(),
    status: text('status').notNull(),
    payload: text('payload').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export type AnalyticsEventRecord = typeof analyticsEventTable.$inferSelect;
export type NewAnalyticsEventRecord = typeof analyticsEventTable.$inferInsert;
export type AnalyticsAggregateRecord = typeof analyticsAggregateTable.$inferSelect;
export type NewAnalyticsAggregateRecord = typeof analyticsAggregateTable.$inferInsert;
export type AnalyticsSnapshotRecord = typeof analyticsSnapshotTable.$inferSelect;
export type NewAnalyticsSnapshotRecord = typeof analyticsSnapshotTable.$inferInsert;
export type ExploreSyncRecord = typeof exploreSyncTable.$inferSelect;
export type NewExploreSyncRecord = typeof exploreSyncTable.$inferInsert;
