import {Hono, type Context} from 'hono';
import {getCookie, setCookie, deleteCookie} from 'hono/cookie';
import type {FrontendContentReader} from '../content/frontend-reader.js';
import type {SettingsService} from '../settings/service.js';
import type {StaffAuthService} from '../identity/service.js';
import type {SubscriptionRepository} from '../subscriptions/repo.js';
import {HttpError} from '../../platform/http/errors.js';
import {buildPagination, GHOST_COMPAT_VERSION, mapAdminPost, mapCompatTier, singlePagination} from './mappers.js';
import {slashTolerant} from './router-utils.js';

type AdminApiDependencies = {
    contentReader: FrontendContentReader;
    settingsService: SettingsService;
    staffAuthService: StaffAuthService;
    subscriptionRepository: SubscriptionRepository;
    siteUrl: string;
};

type SettingsList = Awaited<ReturnType<SettingsService['listSettings']>>['settings'];

const SESSION_COOKIE = 'ghost-admin-api-session';

const readSetting = (settings: SettingsList, key: string) => {
    return settings.find((setting) => setting.key === key)?.value;
};

const notAuthorized = (context: Context) => {
    return context.json({
        errors: [{
            message: 'Authorization failed',
            context: 'Unable to determine the authenticated user or integration.',
            type: 'NoPermissionError'
        }]
    }, 401);
};

// Ghost Admin API compat surface (decision #16): the unmodified Ember admin
// boots against these paths with cookie sessions.
export const createAdminApiRouter = ({
    contentReader,
    settingsService,
    staffAuthService,
    subscriptionRepository,
    siteUrl
}: AdminApiDependencies) => {
    const router = new Hono();
    const on = slashTolerant(router);

    const requireStaff = async (context: Context) => {
        const sessionId = getCookie(context, SESSION_COOKIE);
        if (!sessionId) {
            return null;
        }
        try {
            return await staffAuthService.getStaffBySession(sessionId);
        } catch {
            return null;
        }
    };

    // The signin route checks whether initial setup has completed; an
    // imported site always has an owner.
    on.get('/authentication/setup/', async (context) => {
        return context.json({setup: [{status: true, title: null, name: null, email: null}]});
    });

    on.get('/site/', async (context) => {
        const {settings} = await settingsService.listSettings();
        return context.json({
            site: {
                title: readSetting(settings, 'site.title') ?? 'Ghost',
                description: readSetting(settings, 'site.description') ?? '',
                logo: readSetting(settings, 'site.logo') ?? null,
                icon: readSetting(settings, 'site.icon') ?? null,
                cover_image: readSetting(settings, 'site.cover_image') ?? null,
                accent_color: readSetting(settings, 'site.accent_color') ?? null,
                locale: readSetting(settings, 'site.locale') ?? 'en',
                url: `${siteUrl}/`,
                version: GHOST_COMPAT_VERSION,
                allow_external_signup: false
            }
        });
    });

    on.post('/session/', async (context) => {
        const body = await context.req.json<{username?: string; password?: string}>().catch(() => ({} as Record<string, never>));
        if (!body.username || !body.password) {
            return context.json({errors: [{message: 'Missing credentials', type: 'ValidationError'}]}, 422);
        }
        const ipAddress = context.req.header('x-forwarded-for') ?? 'unknown';
        try {
            const result = await staffAuthService.login({email: body.username, password: body.password}, ipAddress);
            if (!('session' in result) || !result.session) {
                return context.json({errors: [{message: 'Two factor verification required', type: 'Needs2FAError'}]}, 403);
            }
            setCookie(context, SESSION_COOKIE, result.session.id, {
                path: '/ghost',
                httpOnly: true,
                sameSite: 'Lax'
            });
            return context.body(null, 201);
        } catch (error) {
            if (error instanceof HttpError) {
                return context.json({errors: [{message: error.message, type: 'UnauthorizedError'}]}, error.status as 401);
            }
            throw error;
        }
    });

    on.delete('/session/', async (context) => {
        const sessionId = getCookie(context, SESSION_COOKIE);
        if (sessionId) {
            await staffAuthService.logout(sessionId).catch(() => undefined);
            deleteCookie(context, SESSION_COOKIE, {path: '/ghost'});
        }
        return context.body(null, 204);
    });

    on.get('/users/me/', async (context) => {
        const staff = await requireStaff(context);
        if (!staff) {
            return notAuthorized(context);
        }
        const roles = await staffAuthService.getStaffRoles(staff.id);
        return context.json({
            users: [{
                id: staff.id,
                name: staff.name,
                slug: staff.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                email: staff.email,
                profile_image: null,
                cover_image: null,
                bio: null,
                website: null,
                location: null,
                facebook: null,
                twitter: null,
                accessibility: null,
                status: staff.status,
                meta_title: null,
                meta_description: null,
                tour: null,
                last_seen: new Date().toISOString(),
                created_at: new Date(0).toISOString(),
                updated_at: new Date(0).toISOString(),
                url: `${siteUrl}/author/${staff.id}/`,
                roles: roles.map((role) => ({
                    id: role,
                    name: role,
                    description: null,
                    created_at: new Date(0).toISOString(),
                    updated_at: new Date(0).toISOString()
                }))
            }]
        });
    });

    on.get('/config/', async (context) => {
        return context.json({
            config: {
                version: GHOST_COMPAT_VERSION,
                environment: 'development',
                database: 'sqlite3',
                mail: 'SMTP',
                useGravatar: false,
                labs: {},
                clientExtensions: {},
                enableDeveloperExperiments: false,
                stripeDirect: false,
                mailgunIsConfigured: false,
                emailAnalytics: false,
                hostSettings: {},
                tenor: {googleApiKey: null},
                pintura: {},
                signupForm: {url: '', version: ''},
                security: {},
                editor: {url: '', version: ''}
            }
        });
    });

    on.get('/settings/', async (context) => {
        const staff = await requireStaff(context);
        if (!staff) {
            return notAuthorized(context);
        }
        const {settings} = await settingsService.listSettings();
        const value = (key: string, fallback: unknown = null) => readSetting(settings, key) ?? fallback;
        const adminSettings = [
            {key: 'title', value: value('site.title', 'Ghost')},
            {key: 'description', value: value('site.description', '')},
            {key: 'logo', value: value('site.logo')},
            {key: 'icon', value: value('site.icon')},
            {key: 'cover_image', value: value('site.cover_image')},
            {key: 'accent_color', value: value('site.accent_color')},
            {key: 'locale', value: value('site.locale', 'en')},
            {key: 'timezone', value: value('site.timezone', 'Etc/UTC')},
            {key: 'codeinjection_head', value: value('site.codeinjection_head')},
            {key: 'codeinjection_foot', value: value('site.codeinjection_foot')},
            {key: 'facebook', value: value('site.facebook')},
            {key: 'twitter', value: value('site.twitter')},
            {key: 'navigation', value: JSON.stringify(value('site.navigation', []))},
            {key: 'secondary_navigation', value: JSON.stringify(value('site.secondary_navigation', []))},
            {key: 'meta_title', value: null},
            {key: 'meta_description', value: null},
            {key: 'active_theme', value: value('theme.active', 'source')},
            {key: 'unsplash', value: true},
            {key: 'labs', value: '{}'},
            {key: 'members_signup_access', value: value('members.signup_access', 'all')},
            {key: 'default_content_visibility', value: value('members.default_content_visibility', 'public')},
            {key: 'members_support_address', value: 'noreply'},
            {key: 'members_enabled', value: Boolean(value('feature.membership', true))},
            {key: 'paid_members_enabled', value: false},
            {key: 'comments_enabled', value: value('feature.comments') ? 'all' : 'off'},
            {key: 'portal_button', value: true},
            {key: 'portal_name', value: true},
            {key: 'portal_plans', value: '["free"]'},
            {key: 'portal_button_style', value: 'icon-and-text'},
            {key: 'announcement_content', value: null},
            {key: 'announcement_visibility', value: '[]'},
            {key: 'announcement_background', value: 'dark'}
        ];
        return context.json({settings: adminSettings, meta: {}});
    });

    on.get('/tiers/', async (context) => {
        const staff = await requireStaff(context);
        if (!staff) {
            return notAuthorized(context);
        }
        const plans = await subscriptionRepository.listPlans();
        const tiers = await Promise.all(plans.map(async (plan) => {
            return mapCompatTier(plan, await subscriptionRepository.getPricesByPlan(plan.id));
        }));
        return context.json({tiers, meta: singlePagination(tiers.length)});
    });

    on.get('/posts/', async (context) => {
        const staff = await requireStaff(context);
        if (!staff) {
            return notAuthorized(context);
        }
        const page = Number(context.req.query('page') ?? '1') || 1;
        const rawLimit = context.req.query('limit');
        const limit = rawLimit === 'all' ? 100 : Math.min(Number(rawLimit ?? '15') || 15, 100);
        // Admin browse includes drafts and scheduled posts, unlike the
        // public surfaces.
        const {entries, pagination} = await contentReader.listPublished({
            page,
            limit,
            filter: {type: 'post', status: 'all'}
        });
        const posts = await Promise.all(entries.map((entry) => mapAdminPost(entry, siteUrl)));
        return context.json({posts, meta: buildPagination(pagination)});
    });

    return router;
};
