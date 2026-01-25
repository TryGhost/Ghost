import {createRoute} from '@hono/zod-openapi';
import type {AnalyticsService} from './service.js';
import {
    AnalyticsEventCreateRequestBodySchema,
    AnalyticsEventListRequestSchema,
    AnalyticsEventListResponseSchema
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

    return router;
};
