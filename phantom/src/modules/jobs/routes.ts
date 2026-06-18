import {createRoute} from '@hono/zod-openapi';
import type {JobsService} from './service.js';
import {
    JobDefinitionCreateRequestSchema,
    JobDefinitionCreateResponseSchema,
    JobDefinitionListResponseSchema,
    JobEnqueueRequestSchema,
    JobEnqueueResponseSchema,
    JobRunIdParamSchema,
    JobRunListResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import type {StaffAuthService} from '../identity/service.js';
import {requireStaffRole} from '../identity/auth.js';

export const createJobsRouter = (service: JobsService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const listDefinitionsRoute = createRoute({
        method: 'get',
        path: '/definitions',
        responses: {
            200: {
                description: 'Job definitions',
                content: {
                    'application/json': {
                        schema: JobDefinitionListResponseSchema
                    }
                }
            }
        }
    });

    const createDefinitionRoute = createRoute({
        method: 'post',
        path: '/definitions',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: JobDefinitionCreateRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Job definition created',
                content: {
                    'application/json': {
                        schema: JobDefinitionCreateResponseSchema
                    }
                }
            }
        }
    });

    const listRunsRoute = createRoute({
        method: 'get',
        path: '/runs',
        responses: {
            200: {
                description: 'Job runs',
                content: {
                    'application/json': {
                        schema: JobRunListResponseSchema
                    }
                }
            }
        }
    });

    const getRunRoute = createRoute({
        method: 'get',
        path: '/runs/{id}',
        request: {
            params: JobRunIdParamSchema
        },
        responses: {
            200: {
                description: 'Job run',
                content: {
                    'application/json': {
                        schema: JobEnqueueResponseSchema
                    }
                }
            }
        }
    });

    const enqueueRoute = createRoute({
        method: 'post',
        path: '/enqueue',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: JobEnqueueRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Job enqueued',
                content: {
                    'application/json': {
                        schema: JobEnqueueResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(listDefinitionsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.listDefinitions();
        return context.json(result);
    });

    router.openapi(createDefinitionRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.createDefinition(input);
        return context.json(result);
    });

    router.openapi(listRunsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.listRuns();
        return context.json(result);
    });

    router.openapi(getRunRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        const result = await service.getRun(params.id);
        return context.json(result);
    });

    router.openapi(enqueueRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.enqueueJob(input);
        return context.json(result);
    });

    return router;
};
