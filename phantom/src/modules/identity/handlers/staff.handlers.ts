import type {Context} from 'hono';
import {LoginRequestSchema} from '../contracts/staff.contracts.js';
import type {StaffAuthService} from '../service/staff-auth.service.js';
import {HttpError} from '../../../platform/http/errors.js';

export type StaffHandlers = {
    login: (context: Context) => Promise<Response>;
    me: (context: Context) => Promise<Response>;
};

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

export const createStaffHandlers = (service: StaffAuthService): StaffHandlers => {
    const login = async (context: Context) => {
        const body = await context.req.json();
        const input = LoginRequestSchema.parse(body);
        const ipAddress = context.req.header('x-forwarded-for') ?? 'unknown';
        const result = await service.login(input, ipAddress);

        return context.json(result);
    };

    const me = async (context: Context) => {
        const token = getBearerToken(context);
        if (!token) {
            throw new HttpError(401, 'missing_session', 'Missing session token');
        }

        const staff = await service.getStaffBySession(token);
        return context.json({staff});
    };

    return {
        login,
        me
    };
};
