import {describe, expect, it} from 'vitest';
import {createAnalyticsService} from './service.js';
import type {AnalyticsRepository} from './repo.js';

const createRepository = (): AnalyticsRepository => {
    const events: {id: string; memberId: string; type: string; createdAt: number}[] = [];

    return {
        createEvent: async (event) => {
            const record = event as {id: string; memberId: string; type: string; createdAt: number};
            events.push(record);
            return record;
        },
        listEvents: async (filters) => {
            return events
                .filter((event) => (filters.memberId ? event.memberId === filters.memberId : true))
                .filter((event) => (filters.type ? event.type === filters.type : true))
                .filter((event) => (filters.cursor ? event.createdAt < filters.cursor : true))
                .slice(0, filters.limit);
        },
        countEvents: async (filters) => {
            return events
                .filter((event) => (filters.memberId ? event.memberId === filters.memberId : true))
                .filter((event) => (filters.type ? event.type === filters.type : true))
                .filter((event) => (filters.cursor ? event.createdAt < filters.cursor : true))
                .length;
        },
        createAggregate: async () => ({
            id: 'agg',
            type: 'test',
            windowStart: 0,
            windowEnd: 1,
            total: 0,
            metadata: '{}',
            createdAt: 0
        }),
        createSnapshot: async () => ({
            id: 'snap',
            lastEventAt: 0,
            payload: '{}',
            createdAt: 0
        }),
        createExploreSync: async () => ({
            id: 'sync',
            status: 'queued',
            payload: '{}',
            createdAt: 0,
            updatedAt: 0
        }),
        updateExploreSync: async (sync) => sync
    };
};

describe('analytics service', () => {
    it('records and lists events', async () => {
        const repository = createRepository();
        const service = createAnalyticsService(repository);

        await service.recordEvent({memberId: 'member', type: 'signup'});
        const result = await service.listEvents({memberId: 'member', type: 'signup', limit: 10});

        expect(result.events.length).toBe(1);
    });
});
