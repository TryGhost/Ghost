import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    jobDefinitionTable,
    jobIdempotencyTable,
    jobRunTable,
    type JobDefinitionRecord,
    type JobIdempotencyRecord,
    type JobRunRecord,
    type NewJobDefinitionRecord,
    type NewJobIdempotencyRecord,
    type NewJobRunRecord
} from './db.js';

export type JobsRepository = {
    listDefinitions: () => Promise<JobDefinitionRecord[]>;
    getDefinitionById: (id: string) => Promise<JobDefinitionRecord | null>;
    createDefinition: (definition: NewJobDefinitionRecord) => Promise<JobDefinitionRecord>;
    listRuns: () => Promise<JobRunRecord[]>;
    getRunById: (id: string) => Promise<JobRunRecord | null>;
    createRun: (run: NewJobRunRecord) => Promise<JobRunRecord>;
    createIdempotency: (record: NewJobIdempotencyRecord) => Promise<JobIdempotencyRecord>;
    getIdempotencyByKey: (key: string) => Promise<JobIdempotencyRecord | null>;
};

export const createJobsRepository = (db: DbClient): JobsRepository => {
    const listDefinitions = async () => db.select().from(jobDefinitionTable);

    const getDefinitionById = async (id: string) => {
        const rows = await db.select().from(jobDefinitionTable).where(eq(jobDefinitionTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createDefinition = async (definition: NewJobDefinitionRecord) => {
        await db.insert(jobDefinitionTable).values(definition);
        const rows = await db
            .select()
            .from(jobDefinitionTable)
            .where(eq(jobDefinitionTable.id, definition.id))
            .limit(1);
        if (!rows[0]) {
            throw new Error('Job definition missing after insert');
        }
        return rows[0];
    };

    const listRuns = async () => db.select().from(jobRunTable);

    const getRunById = async (id: string) => {
        const rows = await db.select().from(jobRunTable).where(eq(jobRunTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createRun = async (run: NewJobRunRecord) => {
        await db.insert(jobRunTable).values(run);
        const rows = await db.select().from(jobRunTable).where(eq(jobRunTable.id, run.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Job run missing after insert');
        }
        return rows[0];
    };

    const createIdempotency = async (record: NewJobIdempotencyRecord) => {
        await db.insert(jobIdempotencyTable).values(record);
        const rows = await db
            .select()
            .from(jobIdempotencyTable)
            .where(eq(jobIdempotencyTable.id, record.id))
            .limit(1);
        if (!rows[0]) {
            throw new Error('Idempotency record missing after insert');
        }
        return rows[0];
    };

    const getIdempotencyByKey = async (key: string) => {
        const rows = await db.select().from(jobIdempotencyTable).where(eq(jobIdempotencyTable.key, key)).limit(1);
        return rows[0] ?? null;
    };

    return {
        listDefinitions,
        getDefinitionById,
        createDefinition,
        listRuns,
        getRunById,
        createRun,
        createIdempotency,
        getIdempotencyByKey
    };
};
