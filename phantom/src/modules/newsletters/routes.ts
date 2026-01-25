import {createRoute} from '@hono/zod-openapi';
import type {NewsletterService} from './service.js';
import {
    IssueCreateRequestBodySchema,
    IssueCreateResponseSchema,
    NewsletterCreateRequestBodySchema,
    NewsletterCreateResponseSchema
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

    return router;
};
