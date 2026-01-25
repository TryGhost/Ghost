import {createRoute} from '@hono/zod-openapi';
import type {PartnerService} from './service.js';
import {
    AccessGrantRequestBodySchema,
    AccessGrantResponseSchema,
    PartnerTokenRequestBodySchema,
    PartnerTokenResponseSchema,
    PartnerValidateRequestBodySchema,
    PartnerValidateResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {requireStaffRole} from '../identity/auth.js';
import type {StaffAuthService} from '../identity/service.js';

export const createPartnersRouter = (service: PartnerService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const createGrantRoute = createRoute({
        method: 'post',
        path: '/grants',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: AccessGrantRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Access grant created',
                content: {
                    'application/json': {
                        schema: AccessGrantResponseSchema
                    }
                }
            }
        }
    });

    const tokenRoute = createRoute({
        method: 'post',
        path: '/tokens',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: PartnerTokenRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Partner token issued',
                content: {
                    'application/json': {
                        schema: PartnerTokenResponseSchema
                    }
                }
            }
        }
    });

    const validateRoute = createRoute({
        method: 'post',
        path: '/validate',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: PartnerValidateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Partner token validated',
                content: {
                    'application/json': {
                        schema: PartnerValidateResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(createGrantRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.createAccessGrant(input);
        return context.json(result);
    });

    router.openapi(tokenRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.issuePartnerToken(input);
        return context.json(result);
    });

    router.openapi(validateRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.validatePartnerToken(input);
        return context.json(result);
    });

    return router;
};
