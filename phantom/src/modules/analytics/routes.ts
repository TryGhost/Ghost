import {createRoute} from '@hono/zod-openapi';
import type {AnalyticsService} from './service.js';
import {
    AnalyticsAggregateCreateRequestBodySchema,
    AnalyticsAggregateResponseSchema,
    AnalyticsEventCreateRequestBodySchema,
    AnalyticsEventListRequestSchema,
    AnalyticsEventListResponseSchema,
    AnalyticsSnapshotCreateRequestBodySchema,
    AnalyticsSnapshotResponseSchema,
    ExploreSyncRequestBodySchema,
    ExploreSyncResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';

export const createAnalyticsRouter = (service: AnalyticsService) => {
    const router = createOpenApiRouter();

    const createRouteDef = createRoute({
        method: 'post',
        path: '/events',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: AnalyticsEventCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            204: {
                description: 'Event recorded'
            }
        }
    });

    const listRoute = createRoute({
        method: 'get',
        path: '/events',
        request: {
            query: AnalyticsEventListRequestSchema
        },
        responses: {
            200: {
                description: 'Event list',
                content: {
                    'application/json': {
                        schema: AnalyticsEventListResponseSchema
                    }
                }
            }
        }
    });

    const aggregateRoute = createRoute({
        method: 'post',
        path: '/aggregates',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: AnalyticsAggregateCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Aggregate recorded',
                content: {
                    'application/json': {
                        schema: AnalyticsAggregateResponseSchema
                    }
                }
            }
        }
    });

    const snapshotRoute = createRoute({
        method: 'post',
        path: '/snapshots',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: AnalyticsSnapshotCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Snapshot created',
                content: {
                    'application/json': {
                        schema: AnalyticsSnapshotResponseSchema
                    }
                }
            }
        }
    });

    const exploreRoute = createRoute({
        method: 'post',
        path: '/explore/sync',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: ExploreSyncRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Explore synced',
                content: {
                    'application/json': {
                        schema: ExploreSyncResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(createRouteDef, async (context) => {
        const input = context.req.valid('json');
        await service.recordEvent(input);
        return context.body(null, 204);
    });

    router.openapi(listRoute, async (context) => {
        const input = context.req.valid('query');
        const result = await service.listEvents(input);
        return context.json(result);
    });

    router.openapi(aggregateRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.recordAggregate(input);
        return context.json(result);
    });

    router.openapi(snapshotRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.createSnapshot(input);
        return context.json(result);
    });

    router.openapi(exploreRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.syncExplore(input);
        return context.json(result);
    });

    return router;
};
