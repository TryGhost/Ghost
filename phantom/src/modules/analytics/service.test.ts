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
                .slice(filters.offset, filters.offset + filters.limit);
        }
    };
};

describe('analytics service', () => {
    it('records and lists events', async () => {
        const repository = createRepository();
        const service = createAnalyticsService(repository);

        await service.recordEvent({memberId: 'member', type: 'signup'});
        const result = await service.listEvents({memberId: 'member', type: 'signup', limit: 10, offset: 0});

        expect(result.events.length).toBe(1);
    });
});
