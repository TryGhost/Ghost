import {and, eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    exportJobTable,
    fixtureRunTable,
    importJobTable,
    migrationRunTable,
    metricsConfigTable,
    nullableMigrationTable,
    tokenCleanupTable,
    updateCheckTable,
    type ExportJobRecord,
    type FixtureRunRecord,
    type ImportJobRecord,
    type MetricsConfigRecord,
    type MigrationRunRecord,
    type NewExportJobRecord,
    type NewFixtureRunRecord,
    type NewImportJobRecord,
    type NewMetricsConfigRecord,
    type NewMigrationRunRecord,
    type NewNullableMigrationRecord,
    type NewTokenCleanupRecord,
    type NewUpdateCheckRecord,
    type NullableMigrationRecord,
    type TokenCleanupRecord,
    type UpdateCheckRecord
} from './db.js';

export type OperationsRepository = {
    createExportJob: (job: NewExportJobRecord) => Promise<ExportJobRecord>;
    createImportJob: (job: NewImportJobRecord) => Promise<ImportJobRecord>;
    createMigrationRun: (run: NewMigrationRunRecord) => Promise<MigrationRunRecord>;
    getMigrationRun: (version: string, action: string) => Promise<MigrationRunRecord | null>;
    createFixtureRun: (run: NewFixtureRunRecord) => Promise<FixtureRunRecord>;
    createNullableMigration: (migration: NewNullableMigrationRecord) => Promise<NullableMigrationRecord>;
    createUpdateCheck: (check: NewUpdateCheckRecord) => Promise<UpdateCheckRecord>;
    createTokenCleanup: (cleanup: NewTokenCleanupRecord) => Promise<TokenCleanupRecord>;
    upsertMetricsConfig: (config: NewMetricsConfigRecord) => Promise<MetricsConfigRecord>;
    getMetricsConfig: () => Promise<MetricsConfigRecord | null>;
};

export const createOperationsRepository = (db: DbClient): OperationsRepository => {
    const createExportJob = async (job: NewExportJobRecord) => {
        await db.insert(exportJobTable).values(job);
        const rows = await db.select().from(exportJobTable).where(eq(exportJobTable.id, job.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Export job missing after insert');
        }
        return rows[0];
    };

    const createImportJob = async (job: NewImportJobRecord) => {
        await db.insert(importJobTable).values(job);
        const rows = await db.select().from(importJobTable).where(eq(importJobTable.id, job.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Import job missing after insert');
        }
        return rows[0];
    };

    const createMigrationRun = async (run: NewMigrationRunRecord) => {
        await db.insert(migrationRunTable).values(run);
        const rows = await db.select().from(migrationRunTable).where(eq(migrationRunTable.id, run.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Migration run missing after insert');
        }
        return rows[0];
    };

    const getMigrationRun = async (version: string, action: string) => {
        const rows = await db
            .select()
            .from(migrationRunTable)
            .where(and(eq(migrationRunTable.version, version), eq(migrationRunTable.action, action)))
            .limit(1);
        return rows[0] ?? null;
    };

    const createFixtureRun = async (run: NewFixtureRunRecord) => {
        await db
            .insert(fixtureRunTable)
            .values(run)
            .onConflictDoUpdate({target: fixtureRunTable.id, set: {status: run.status, createdAt: run.createdAt}});
        const rows = await db.select().from(fixtureRunTable).where(eq(fixtureRunTable.id, run.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Fixture run missing after insert');
        }
        return rows[0];
    };

    const createNullableMigration = async (migration: NewNullableMigrationRecord) => {
        await db.insert(nullableMigrationTable).values(migration);
        const rows = await db.select().from(nullableMigrationTable).where(eq(nullableMigrationTable.id, migration.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Nullable migration missing after insert');
        }
        return rows[0];
    };

    const createUpdateCheck = async (check: NewUpdateCheckRecord) => {
        await db.insert(updateCheckTable).values(check);
        const rows = await db.select().from(updateCheckTable).where(eq(updateCheckTable.id, check.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Update check missing after insert');
        }
        return rows[0];
    };

    const createTokenCleanup = async (cleanup: NewTokenCleanupRecord) => {
        await db.insert(tokenCleanupTable).values(cleanup);
        const rows = await db.select().from(tokenCleanupTable).where(eq(tokenCleanupTable.id, cleanup.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Token cleanup missing after insert');
        }
        return rows[0];
    };

    const upsertMetricsConfig = async (config: NewMetricsConfigRecord) => {
        await db
            .insert(metricsConfigTable)
            .values(config)
            .onConflictDoUpdate({target: metricsConfigTable.id, set: config});
        const rows = await db.select().from(metricsConfigTable).where(eq(metricsConfigTable.id, config.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Metrics config missing after upsert');
        }
        return rows[0];
    };

    const getMetricsConfig = async () => {
        const rows = await db.select().from(metricsConfigTable).limit(1);
        return rows[0] ?? null;
    };

    return {
        createExportJob,
        createImportJob,
        createMigrationRun,
        getMigrationRun,
        createFixtureRun,
        createNullableMigration,
        createUpdateCheck,
        createTokenCleanup,
        upsertMetricsConfig,
        getMetricsConfig
    };
};
