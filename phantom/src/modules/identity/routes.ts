import {Hono} from 'hono';
import type {Context} from 'hono';
import type {StaffAuthService} from './service.js';
import {LoginRequestSchema} from './contracts.js';
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

export const createIdentityRouter = (service: StaffAuthService) => {
    const router = new Hono();

    router.post('/login', async (context) => {
        const body = await context.req.json();
        const input = LoginRequestSchema.parse(body);
        const ipAddress = context.req.header('x-forwarded-for') ?? 'unknown';
        const result = await service.login(input, ipAddress);

        return context.json(result);
    });

    router.get('/me', async (context) => {
        const token = getBearerToken(context);
        if (!token) {
            throw new HttpError(401, 'missing_session', 'Missing session token');
        }

        const staff = await service.getStaffBySession(token);
        return context.json({staff});
    });

    return router;
};
