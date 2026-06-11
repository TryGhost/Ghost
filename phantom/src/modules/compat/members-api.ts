import {Hono} from 'hono';
import type {MemberAuthService} from '../members/service.js';
import {HttpError} from '../../platform/http/errors.js';
import {slashTolerant} from './router-utils.js';

type MembersApiDependencies = {
    memberAuthService: MemberAuthService;
};

// Ghost Members API compat surface (decision #16): portal, comments and
// signup-form talk to /members/api/* unmodified.
export const createMembersApiRouter = ({memberAuthService}: MembersApiDependencies) => {
    const router = new Hono();
    const on = slashTolerant(router);

    // Anonymous visitors get 204, matching Ghost; member sessions arrive in a
    // later slice.
    on.get('/member/', async (context) => {
        return context.body(null, 204);
    });

    on.post('/send-magic-link/', async (context) => {
        const body = await context.req.json<{email?: string; emailType?: string}>().catch(() => ({} as Record<string, never>));
        if (!body.email) {
            return context.json({errors: [{message: 'No email provided', type: 'BadRequestError'}]}, 400);
        }
        const ipAddress = context.req.header('x-forwarded-for') ?? 'unknown';
        try {
            await memberAuthService.requestMagicLink({email: body.email}, ipAddress);
            return context.text('Created.', 201);
        } catch (error) {
            if (error instanceof HttpError) {
                return context.json({errors: [{message: error.message, type: 'BadRequestError'}]}, error.status as 400);
            }
            throw error;
        }
    });

    return router;
};
