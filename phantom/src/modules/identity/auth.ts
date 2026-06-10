import type {Context, MiddlewareHandler} from 'hono';
import {HttpError} from '../../platform/http/errors.js';
import type {StaffAuthService} from './service.js';

export const getBearerToken = (context: Context) => {
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

export const createStaffSessionGuard = (service: StaffAuthService): MiddlewareHandler => {
    return async (context, next) => {
        const token = getBearerToken(context);
        if (!token) {
            throw new HttpError(401, 'missing_session', 'Missing session token');
        }

        const staff = await service.getStaffBySession(token);
        context.set('staff', staff);

        await next();
    };
};

export const requireStaffRole = async (context: Context, service: StaffAuthService, roles: string[]) => {
    const token = getBearerToken(context);
    if (!token) {
        throw new HttpError(401, 'missing_session', 'Missing session token');
    }

    const staff = await service.getStaffBySession(token);
    const staffRoles = await service.getStaffRoles(staff.id);
    const allowed = staffRoles.some((role: string) => roles.includes(role));

    if (!allowed) {
        throw new HttpError(403, 'forbidden', 'Insufficient role');
    }

    return staff;
};

export const requireIntegrationToken = async (context: Context, service: StaffAuthService) => {
    const token = getBearerToken(context);
    if (!token) {
        throw new HttpError(401, 'missing_token', 'Missing integration token');
    }

    return service.getIntegrationTokenByToken(token);
};
