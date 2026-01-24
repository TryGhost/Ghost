import {createRoute} from '@hono/zod-openapi';
import type {MemberAuthService} from './service.js';
import {
    MagicLinkRequestBodySchema,
    MagicLinkResponseSchema,
    MagicLinkVerifyBodySchema,
    MagicLinkVerifyResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';

const magicLinkRoute = createRoute({
    method: 'post',
    path: '/magic-link',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: MagicLinkRequestBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Magic link issued',
            content: {
                'application/json': {
                    schema: MagicLinkResponseSchema
                }
            }
        }
    }
});

const magicLinkVerifyRoute = createRoute({
    method: 'post',
    path: '/magic-link/verify',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: MagicLinkVerifyBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Magic link verified',
            content: {
                'application/json': {
                    schema: MagicLinkVerifyResponseSchema
                }
            }
        }
    }
});

export const createMembersRouter = (service: MemberAuthService) => {
    const router = createOpenApiRouter();

    router.openapi(magicLinkRoute, async (context) => {
        const input = context.req.valid('json');
        const ipAddress = context.req.header('x-forwarded-for') ?? 'unknown';
        const result = await service.requestMagicLink(input, ipAddress);
        return context.json({issued: result.issued});
    });

    router.openapi(magicLinkVerifyRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.verifyMagicLink(input);
        return context.json(result);
    });

    return router;
};
