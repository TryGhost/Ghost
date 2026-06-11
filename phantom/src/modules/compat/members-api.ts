import {Hono} from 'hono';
import {getCookie, deleteCookie} from 'hono/cookie';
import type {MemberAuthService} from '../members/service.js';
import type {FrontendContentReader} from '../content/frontend-reader.js';
import {resolveAttribution, type UrlHistoryEntry} from '../members/attribution.js';
import {HttpError} from '../../platform/http/errors.js';
import {slashTolerant} from './router-utils.js';

type MembersApiDependencies = {
    memberAuthService: MemberAuthService;
    contentReader?: FrontendContentReader;
    siteUrl?: string;
};

const MEMBER_SESSION_COOKIE = 'phantom-members-session';

// Ghost Members API compat surface (decision #16): portal, comments and
// signup-form talk to /members/api/* unmodified.
export const createMembersApiRouter = ({memberAuthService, contentReader, siteUrl}: MembersApiDependencies) => {
    const router = new Hono();
    const on = slashTolerant(router);

    // Anonymous visitors get 204, matching Ghost; sessions started by the
    // magic-link landing return the signed-in member.
    on.get('/member/', async (context) => {
        const sessionId = getCookie(context, MEMBER_SESSION_COOKIE);
        if (!sessionId) {
            return context.body(null, 204);
        }
        try {
            const {member} = await memberAuthService.verifySession({sessionId});
            return context.json({
                uuid: member.id,
                email: member.email,
                name: null,
                firstname: null,
                avatar_image: null,
                subscribed: true,
                subscriptions: [],
                paid: member.status === 'paid',
                created_at: new Date(member.createdAt).toISOString(),
                enable_comment_notifications: true,
                email_suppression: {suppressed: false, info: null},
                newsletters: [],
                unsubscribe_url: ''
            });
        } catch {
            return context.body(null, 204);
        }
    });

    on.delete('/session/', async (context) => {
        deleteCookie(context, MEMBER_SESSION_COOKIE, {path: '/'});
        return context.body(null, 204);
    });

    // Anti-bot handshake: portal fetches a token and echoes it back in
    // send-magic-link. Phantom accepts any echoed token for now.
    on.get('/integrity-token/', async (context) => {
        return context.text(crypto.randomUUID(), 200);
    });

    on.post('/send-magic-link/', async (context) => {
        const body = await context.req.json<{email?: string; name?: string; emailType?: string; urlHistory?: UrlHistoryEntry[]}>().catch(() => ({} as Record<string, never>));
        if (!body.email) {
            return context.json({errors: [{message: 'No email provided', type: 'BadRequestError'}]}, 400);
        }
        const ipAddress = context.req.header('x-forwarded-for') ?? 'unknown';
        // Signup attribution: resolve the portal's url history into the
        // converting page + referrer source before issuing the link.
        let attribution: Record<string, string> | undefined;
        if (Array.isArray(body.urlHistory) && body.urlHistory.length > 0) {
            const resolved = await resolveAttribution(body.urlHistory, async (path) => {
                const slug = path.replaceAll('/', '');
                if (!slug || !contentReader) {
                    return null;
                }
                const entry = await contentReader.getEntryBySlug(slug);
                return entry ? {title: entry.post.title, type: entry.post.type} : null;
            }, siteUrl);
            attribution = {
                ...(resolved.source ? {source: resolved.source} : {}),
                ...(resolved.medium ? {medium: resolved.medium} : {}),
                ...(resolved.referrerUrl ? {referrer: resolved.referrerUrl} : {}),
                ...(resolved.url ? {url: resolved.url} : {}),
                ...(resolved.title ? {title: resolved.title} : {}),
                ...(resolved.type ? {type: resolved.type} : {})
            };
        }
        try {
            await memberAuthService.requestMagicLink({
                email: body.email,
                ...(body.name ? {name: body.name} : {}),
                ...(attribution && Object.keys(attribution).length > 0 ? {attribution} : {})
            }, ipAddress);
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
