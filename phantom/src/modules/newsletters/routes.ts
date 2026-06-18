import {createRoute} from '@hono/zod-openapi';
import type {NewsletterService} from './service.js';
import {
    AutomatedEmailRequestBodySchema,
    AutomatedEmailResponseSchema,
    BatchRetryRequestBodySchema,
    BatchRetryResponseSchema,
    IssueCreateRequestBodySchema,
    IssueCreateResponseSchema,
    IssueDeliveryUpdateRequestBodySchema,
    IssueDeliveryUpdateResponseSchema,
    IssueSendRequestBodySchema,
    IssueSendResponseSchema,
    NewsletterCreateRequestBodySchema,
    NewsletterCreateResponseSchema,
    SuppressionCreateRequestBodySchema,
    SuppressionCreateResponseSchema,
    SuppressionIdParamRequestSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {requireStaffRole} from '../identity/auth.js';
import type {StaffAuthService} from '../identity/service.js';

export const createNewsletterRouter = (service: NewsletterService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const newsletterRoute = createRoute({
        method: 'post',
        path: '/',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: NewsletterCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Newsletter created',
                content: {
                    'application/json': {
                        schema: NewsletterCreateResponseSchema
                    }
                }
            }
        }
    });

    const issueRoute = createRoute({
        method: 'post',
        path: '/issues',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: IssueCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Issue created',
                content: {
                    'application/json': {
                        schema: IssueCreateResponseSchema
                    }
                }
            }
        }
    });

    const deliveryRoute = createRoute({
        method: 'post',
        path: '/issues/deliveries',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: IssueDeliveryUpdateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Delivery updated',
                content: {
                    'application/json': {
                        schema: IssueDeliveryUpdateResponseSchema
                    }
                }
            }
        }
    });

    const suppressionRoute = createRoute({
        method: 'post',
        path: '/suppressions',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: SuppressionCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Suppression created',
                content: {
                    'application/json': {
                        schema: SuppressionCreateResponseSchema
                    }
                }
            }
        }
    });

    const suppressionDeleteRoute = createRoute({
        method: 'delete',
        path: '/suppressions/{id}',
        request: {
            params: SuppressionIdParamRequestSchema
        },
        responses: {
            204: {
                description: 'Suppression deleted'
            }
        }
    });

    const automationRoute = createRoute({
        method: 'post',
        path: '/automations',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: AutomatedEmailRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Automation queued',
                content: {
                    'application/json': {
                        schema: AutomatedEmailResponseSchema
                    }
                }
            }
        }
    });

    const issueSendRoute = createRoute({
        method: 'post',
        path: '/issues/send',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: IssueSendRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Issue sending queued',
                content: {
                    'application/json': {
                        schema: IssueSendResponseSchema
                    }
                }
            }
        }
    });

    const batchRetryRoute = createRoute({
        method: 'post',
        path: '/batches/retry',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: BatchRetryRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Batch retry scheduled',
                content: {
                    'application/json': {
                        schema: BatchRetryResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(newsletterRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.createNewsletter(input);
        return context.json(result);
    });

    router.openapi(issueRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.createIssue(input);
        return context.json(result);
    });

    router.openapi(deliveryRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.recordDeliveryStatus(input);
        return context.json(result);
    });

    router.openapi(suppressionRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.createSuppression(input);
        return context.json(result);
    });

    router.openapi(suppressionDeleteRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const params = context.req.valid('param');
        await service.deleteSuppression(params.id);
        return context.body(null, 204);
    });

    router.openapi(automationRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.queueAutomatedEmail(input);
        return context.json(result);
    });

    router.openapi(issueSendRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.sendIssue(input);
        return context.json(result);
    });

    router.openapi(batchRetryRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.retryBatch(input);
        return context.json(result);
    });

    return router;
};
