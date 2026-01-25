import {and, eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {analyticsEventTable, type AnalyticsEventRecord, type NewAnalyticsEventRecord} from './db.js';

export type AnalyticsRepository = {
    createEvent: (event: NewAnalyticsEventRecord) => Promise<AnalyticsEventRecord>;
    listEvents: (filters: {memberId?: string; type?: string; limit: number; offset: number}) => Promise<AnalyticsEventRecord[]>;
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

    const listEvents = async (filters: {memberId?: string; type?: string; limit: number; offset: number}) => {
        const clauses = [] as ReturnType<typeof eq>[];
        if (filters.memberId) {
            clauses.push(eq(analyticsEventTable.memberId, filters.memberId));
        }
        if (filters.type) {
            clauses.push(eq(analyticsEventTable.type, filters.type));
        }

        const query = db
            .select()
            .from(analyticsEventTable)
            .limit(filters.limit)
            .offset(filters.offset);

        if (clauses.length === 0) {
            return query;
        }

        return query.where(and(...clauses));
    };

    return {
        createEvent,
        listEvents
    };
};
