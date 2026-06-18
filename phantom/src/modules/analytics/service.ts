import {randomUUID} from 'node:crypto';
import type {AnalyticsRepository} from './repo.js';
import type {
    AnalyticsAggregateCreateRequest,
    AnalyticsAggregateResponse,
    AnalyticsEventCreateRequest,
    AnalyticsEventListRequest,
    AnalyticsEventListResponse,
    AnalyticsSnapshotCreateRequest,
    AnalyticsSnapshotResponse,
    ExploreSyncRequest,
    ExploreSyncResponse
} from './contracts.js';

export type AnalyticsService = {
    recordEvent: (input: AnalyticsEventCreateRequest) => Promise<void>;
    listEvents: (input: AnalyticsEventListRequest) => Promise<AnalyticsEventListResponse>;
    recordAggregate: (input: AnalyticsAggregateCreateRequest) => Promise<AnalyticsAggregateResponse>;
    createSnapshot: (input: AnalyticsSnapshotCreateRequest) => Promise<AnalyticsSnapshotResponse>;
    syncExplore: (input: ExploreSyncRequest) => Promise<ExploreSyncResponse>;
};

export const createAnalyticsService = (repository: AnalyticsRepository): AnalyticsService => {
    const recordEvent = async (input: AnalyticsEventCreateRequest) => {
        await repository.createEvent({
            id: randomUUID(),
            memberId: input.memberId,
            type: input.type,
            createdAt: Date.now()
        });
    };

    const listEvents = async (input: AnalyticsEventListRequest) => {
        const filters: {memberId?: string; type?: string; limit: number; cursor?: number} = {
            limit: input.limit
        };
        if (input.memberId) {
            filters.memberId = input.memberId;
        }
        if (input.type) {
            filters.type = input.type;
        }
        if (input.cursor !== undefined) {
            filters.cursor = input.cursor;
        }

        const events = await repository.listEvents(filters);
        const nextCursor = events.length > 0 ? events[events.length - 1]?.createdAt ?? null : null;
        let remaining = 0;
        if (nextCursor) {
            const countFilters: Parameters<AnalyticsRepository['countEvents']>[0] = {cursor: nextCursor};
            if (filters.memberId) {
                countFilters.memberId = filters.memberId;
            }
            if (filters.type) {
                countFilters.type = filters.type;
            }
            remaining = await repository.countEvents(countFilters);
        }

        return {
            events: events.map((event) => ({
                id: event.id,
                memberId: event.memberId,
                type: event.type,
                createdAt: event.createdAt
            })),
            nextCursor,
            remaining
        };
    };

    const recordAggregate = async (input: AnalyticsAggregateCreateRequest) => {
        const aggregate = await repository.createAggregate({
            id: randomUUID(),
            type: input.type,
            windowStart: input.windowStart,
            windowEnd: input.windowEnd,
            total: input.total,
            metadata: JSON.stringify(input.metadata ?? {}),
            createdAt: Date.now()
        });

        return {
            aggregate: {
                id: aggregate.id,
                type: aggregate.type,
                windowStart: aggregate.windowStart,
                windowEnd: aggregate.windowEnd,
                total: aggregate.total,
                metadata: JSON.parse(aggregate.metadata) as Record<string, unknown>,
                createdAt: aggregate.createdAt
            }
        };
    };

    const createSnapshot = async (input: AnalyticsSnapshotCreateRequest) => {
        const snapshot = await repository.createSnapshot({
            id: randomUUID(),
            lastEventAt: input.lastEventAt,
            payload: JSON.stringify(input.payload),
            createdAt: Date.now()
        });

        return {
            snapshot: {
                id: snapshot.id,
                lastEventAt: snapshot.lastEventAt,
                payload: JSON.parse(snapshot.payload) as Record<string, unknown>,
                createdAt: snapshot.createdAt
            }
        };
    };

    const syncExplore = async (input: ExploreSyncRequest) => {
        const now = Date.now();
        const sync = await repository.createExploreSync({
            id: randomUUID(),
            status: 'queued',
            payload: JSON.stringify(input.payload),
            createdAt: now,
            updatedAt: now
        });

        const updated = await repository.updateExploreSync({
            ...sync,
            status: 'sent',
            updatedAt: Date.now()
        });

        const status: 'queued' | 'sent' | 'failed' = updated.status === 'failed'
            ? 'failed'
            : updated.status === 'sent'
                ? 'sent'
                : 'queued';
        return {
            sync: {
                id: updated.id,
                status,
                payload: JSON.parse(updated.payload) as Record<string, unknown>,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt
            }
        };
    };

    return {
        recordEvent,
        listEvents,
        recordAggregate,
        createSnapshot,
        syncExplore
    };
};
