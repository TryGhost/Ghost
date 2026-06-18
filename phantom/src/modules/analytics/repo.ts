import {and, desc, eq, lt, sql} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    analyticsAggregateTable,
    analyticsEventTable,
    analyticsSnapshotTable,
    exploreSyncTable,
    type AnalyticsAggregateRecord,
    type AnalyticsEventRecord,
    type AnalyticsSnapshotRecord,
    type ExploreSyncRecord,
    type NewAnalyticsAggregateRecord,
    type NewAnalyticsEventRecord,
    type NewAnalyticsSnapshotRecord,
    type NewExploreSyncRecord
} from './db.js';

export type AnalyticsRepository = {
    createEvent: (event: NewAnalyticsEventRecord) => Promise<AnalyticsEventRecord>;
    listEvents: (filters: {memberId?: string; type?: string; limit: number; cursor?: number}) => Promise<AnalyticsEventRecord[]>;
    countEvents: (filters: {memberId?: string; type?: string; cursor?: number}) => Promise<number>;
    createAggregate: (aggregate: NewAnalyticsAggregateRecord) => Promise<AnalyticsAggregateRecord>;
    createSnapshot: (snapshot: NewAnalyticsSnapshotRecord) => Promise<AnalyticsSnapshotRecord>;
    createExploreSync: (sync: NewExploreSyncRecord) => Promise<ExploreSyncRecord>;
    updateExploreSync: (sync: ExploreSyncRecord) => Promise<ExploreSyncRecord>;
};

export const createAnalyticsRepository = (db: DbClient): AnalyticsRepository => {
    const createEvent = async (event: NewAnalyticsEventRecord) => {
        await db.insert(analyticsEventTable).values(event);
        const rows = await db.select().from(analyticsEventTable).where(eq(analyticsEventTable.id, event.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Analytics event missing after insert');
        }
        return rows[0];
    };

    const listEvents = async (filters: {memberId?: string; type?: string; limit: number; cursor?: number}) => {
        const clauses = [] as ReturnType<typeof eq>[];
        if (filters.memberId) {
            clauses.push(eq(analyticsEventTable.memberId, filters.memberId));
        }
        if (filters.type) {
            clauses.push(eq(analyticsEventTable.type, filters.type));
        }
        if (filters.cursor !== undefined) {
            clauses.push(lt(analyticsEventTable.createdAt, filters.cursor));
        }

        const query = db
            .select()
            .from(analyticsEventTable)
            .limit(filters.limit)
            .orderBy(desc(analyticsEventTable.createdAt));

        if (clauses.length === 0) {
            return query;
        }

        return query.where(and(...clauses));
    };

    const countEvents = async (filters: {memberId?: string; type?: string; cursor?: number}) => {
        const clauses = [] as ReturnType<typeof eq>[];
        if (filters.memberId) {
            clauses.push(eq(analyticsEventTable.memberId, filters.memberId));
        }
        if (filters.type) {
            clauses.push(eq(analyticsEventTable.type, filters.type));
        }
        if (filters.cursor !== undefined) {
            clauses.push(lt(analyticsEventTable.createdAt, filters.cursor));
        }

        const query = db.select({count: sql<number>`count(*)`}).from(analyticsEventTable);
        const rows = clauses.length === 0 ? await query : await query.where(and(...clauses));
        return rows[0]?.count ?? 0;
    };

    const createAggregate = async (aggregate: NewAnalyticsAggregateRecord) => {
        await db.insert(analyticsAggregateTable).values(aggregate);
        const rows = await db.select().from(analyticsAggregateTable).where(eq(analyticsAggregateTable.id, aggregate.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Analytics aggregate missing after insert');
        }
        return rows[0];
    };

    const createSnapshot = async (snapshot: NewAnalyticsSnapshotRecord) => {
        await db.insert(analyticsSnapshotTable).values(snapshot);
        const rows = await db.select().from(analyticsSnapshotTable).where(eq(analyticsSnapshotTable.id, snapshot.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Analytics snapshot missing after insert');
        }
        return rows[0];
    };

    const createExploreSync = async (sync: NewExploreSyncRecord) => {
        await db.insert(exploreSyncTable).values(sync);
        const rows = await db.select().from(exploreSyncTable).where(eq(exploreSyncTable.id, sync.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Explore sync missing after insert');
        }
        return rows[0];
    };

    const updateExploreSync = async (sync: ExploreSyncRecord) => {
        await db
            .update(exploreSyncTable)
            .set({status: sync.status, payload: sync.payload, updatedAt: sync.updatedAt})
            .where(eq(exploreSyncTable.id, sync.id));
        const rows = await db.select().from(exploreSyncTable).where(eq(exploreSyncTable.id, sync.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Explore sync missing after update');
        }
        return rows[0];
    };

    return {
        createEvent,
        listEvents,
        countEvents,
        createAggregate,
        createSnapshot,
        createExploreSync,
        updateExploreSync
    };
};
