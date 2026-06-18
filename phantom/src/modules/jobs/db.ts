import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const jobDefinitionTable = sqliteTable('job_definitions', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    queue: text('queue').notNull(),
    schedule: text('schedule'),
    payload: text('payload').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const jobRunTable = sqliteTable('job_runs', {
    id: text('id').primaryKey(),
    definitionId: text('definition_id'),
    name: text('name').notNull(),
    queue: text('queue').notNull(),
    status: text('status').notNull(),
    payload: text('payload').notNull(),
    queuedAt: integer('queued_at').notNull(),
    startedAt: integer('started_at'),
    finishedAt: integer('finished_at'),
    attempt: integer('attempt').notNull(),
    maxAttempts: integer('max_attempts').notNull(),
    backoffMs: integer('backoff_ms').notNull(),
    error: text('error')
});

export const jobIdempotencyTable = sqliteTable('job_idempotency', {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    payload: text('payload').notNull(),
    createdAt: integer('created_at').notNull()
});

export type JobDefinitionRecord = typeof jobDefinitionTable.$inferSelect;
export type NewJobDefinitionRecord = typeof jobDefinitionTable.$inferInsert;
export type JobRunRecord = typeof jobRunTable.$inferSelect;
export type NewJobRunRecord = typeof jobRunTable.$inferInsert;
export type JobIdempotencyRecord = typeof jobIdempotencyTable.$inferSelect;
export type NewJobIdempotencyRecord = typeof jobIdempotencyTable.$inferInsert;
