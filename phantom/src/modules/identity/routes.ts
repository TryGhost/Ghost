import {createRoute} from '@hono/zod-openapi';
import type {StaffAuthService} from './service.js';
import {LoginRequestBodySchema, LoginResponseSchema, StaffMeResponseSchema} from './contracts.js';
import {HttpError} from '../../platform/http/errors.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {getBearerToken} from './auth.js';

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

const logoutRoute = createRoute({
    method: 'post',
    path: '/logout',
    responses: {
        204: {
            description: 'Session revoked'
        }
    }
});

export const createIdentityRouter = (service: StaffAuthService) => {
    const router = createOpenApiRouter();

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

    router.openapi(logoutRoute, async (context) => {
        const token = getBearerToken(context);
        if (!token) {
            throw new HttpError(401, 'missing_session', 'Missing session token');
        }

        await service.logout(token);
        return context.body(null, 204);
    });

    return router;
};
