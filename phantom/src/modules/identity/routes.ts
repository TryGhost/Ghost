import {OpenAPIHono, createRoute} from '@hono/zod-openapi';
import type {Context} from 'hono';
import type {StaffAuthService} from './service.js';
import {LoginRequestBodySchema, LoginResponseSchema, StaffMeResponseSchema} from './contracts.js';
import {HttpError} from '../../platform/http/errors.js';

const getBearerToken = (context: Context) => {
    const header = context.req.header('authorization');
    if (!header) {
        return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token;
};

const loginRoute = createRoute({
    method: 'post',
    path: '/login',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: LoginRequestBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Staff login response',
            content: {
                'application/json': {
                    schema: LoginResponseSchema
                }
            }
        }
    }
});

const meRoute = createRoute({
    method: 'get',
    path: '/me',
    responses: {
        200: {
            description: 'Current staff profile',
            content: {
                'application/json': {
                    schema: StaffMeResponseSchema
                }
            }
        }
    }
});

export const createIdentityRouter = (service: StaffAuthService) => {
    const router = new OpenAPIHono();

    router.openapi(loginRoute, async (context) => {
        const input = context.req.valid('json');
        const ipAddress = context.req.header('x-forwarded-for') ?? 'unknown';
        const result = await service.login(input, ipAddress);

        return context.json(result);
    });

    router.openapi(meRoute, async (context) => {
        const token = getBearerToken(context);
        if (!token) {
            throw new HttpError(401, 'missing_session', 'Missing session token');
        }

        const staff = await service.getStaffBySession(token);
        return context.json({staff});
    });

    return router;
};
