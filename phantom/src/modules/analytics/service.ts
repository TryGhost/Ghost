import {randomUUID} from 'node:crypto';
import type {AnalyticsRepository} from './repo.js';
import type {
    AnalyticsEventCreateRequest,
    AnalyticsEventListRequest,
    AnalyticsEventListResponse
} from './contracts.js';

export type AnalyticsService = {
    recordEvent: (input: AnalyticsEventCreateRequest) => Promise<void>;
    listEvents: (input: AnalyticsEventListRequest) => Promise<AnalyticsEventListResponse>;
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
        const filters: {memberId?: string; type?: string; limit: number; offset: number} = {
            limit: input.limit,
            offset: input.offset
        };
        if (input.memberId) {
            filters.memberId = input.memberId;
        }
        if (input.type) {
            filters.type = input.type;
        }

        const events = await repository.listEvents(filters);

        return {
            events: events.map((event) => ({
                id: event.id,
                memberId: event.memberId,
                type: event.type,
                createdAt: event.createdAt
            }))
        };
    };

    return {
        recordEvent,
        listEvents
    };
};
