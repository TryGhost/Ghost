import {Hono, type Context} from 'hono';
import {getCookie, setCookie, deleteCookie} from 'hono/cookie';
import type {FrontendContentReader} from '../content/frontend-reader.js';
import type {ContentService} from '../content/service.js';
import type {StaffRepository} from '../identity/repo.js';
import type {NewsletterRepository} from '../newsletters/repo.js';
import type {SettingsService} from '../settings/service.js';
import type {StaffAuthService} from '../identity/service.js';
import type {SubscriptionRepository} from '../subscriptions/repo.js';
import type {MemberRepository} from '../members/repo.js';
import {HttpError} from '../../platform/http/errors.js';
import {buildPagination, compatSlugify, GHOST_COMPAT_VERSION, mapAdminPost, mapCompatNewsletter, mapCompatTag, mapCompatTier, singlePagination} from './mappers.js';
import {slashTolerant} from './router-utils.js';

type AdminApiDependencies = {
    contentReader: FrontendContentReader;
    contentService: ContentService;
    settingsService: SettingsService;
    staffAuthService: StaffAuthService;
    staffRepository: StaffRepository;
    subscriptionRepository: SubscriptionRepository;
    memberRepository: MemberRepository;
    newsletterRepository: NewsletterRepository;
    siteUrl: string;
};

type WirePost = Record<string, unknown>;

const asWireString = (value: unknown) => (typeof value === 'string' ? value : undefined);

class MalformedLexicalError extends Error {}

const parseWireLexical = (value: unknown): Record<string, unknown> | undefined => {
    if (typeof value !== 'string' || !value.trim()) {
        return undefined;
    }
    try {
        return JSON.parse(value) as Record<string, unknown>;
    } catch {
        throw new MalformedLexicalError('Invalid lexical payload');
    }
};

const nullableWireString = (wire: WirePost, key: string): string | null | undefined => {
    if (!(key in wire)) {
        return undefined;
    }
    const value = wire[key];
    return typeof value === 'string' ? value : null;
};

const parseWireDate = (value: unknown): number | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
};

const wireStatus = (value: unknown): 'draft' | 'published' | 'scheduled' | undefined => {
    return value === 'draft' || value === 'published' || value === 'scheduled' ? value : undefined;
};

type SettingsList = Awaited<ReturnType<SettingsService['listSettings']>>['settings'];

const SESSION_COOKIE = 'ghost-admin-api-session';

const readSetting = (settings: SettingsList, key: string) => {
    return settings.find((setting) => setting.key === key)?.value;
};

// Ghost reports unset images as null; imported settings store empty strings.
const imageSetting = (settings: SettingsList, key: string) => {
    const value = readSetting(settings, key);
    return typeof value === 'string' && value !== '' ? value : null;
};

// Supports the admin's NQL status clauses: `status:draft` and
// `status:[published,sent]`. Anything else means no status restriction.
const parseStatusFilter = (filter: string | undefined): string[] | null => {
    if (!filter) {
        return null;
    }
    const match = /status:(\[([^\]]+)\]|[a-z]+)/.exec(filter);
    if (!match) {
        return null;
    }
    const value = match[2] ?? match[1];
    if (!value) {
        return null;
    }
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
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
    contentService,
    settingsService,
    staffAuthService,
    staffRepository,
    subscriptionRepository,
    memberRepository,
    newsletterRepository,
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

    type Staff = NonNullable<Awaited<ReturnType<typeof requireStaff>>>;
    const authed = (handler: (context: Context, staff: Staff) => Response | Promise<Response>) => {
        return async (context: Context) => {
            const staff = await requireStaff(context);
            if (!staff) {
                return notAuthorized(context);
            }
            return handler(context, staff);
        };
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
                logo: imageSetting(settings, 'site.logo'),
                icon: imageSetting(settings, 'site.icon'),
                cover_image: imageSetting(settings, 'site.cover_image'),
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

    const buildUserPayload = (
        staff: {id: string; name: string; email: string; status: string},
        roles: string[],
        overrides: Record<string, unknown> = {}
    ) => ({
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
        accessibility: (overrides.accessibility as string | undefined) ?? null,
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
    });

    on.get('/users/me/', async (context) => {
        const staff = await requireStaff(context);
        if (!staff) {
            return notAuthorized(context);
        }
        const roles = await staffAuthService.getStaffRoles(staff.id);
        return context.json({users: [buildUserPayload(staff, roles)]});
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

    on.get('/notifications/', authed(async (context) => {
        return context.json({notifications: [], meta: {}});
    }));

    on.get('/themes/active/', authed(async (context) => {
        const {settings} = await settingsService.listSettings();
        const active = (readSetting(settings, 'theme.active') as string | undefined) ?? 'source';
        return context.json({
            themes: [{
                name: active,
                package: {name: active, version: '1.0.0'},
                active: true,
                templates: []
            }]
        });
    }));

    // The admin saves user state (accessibility flags, last seen) right
    // after boot; acknowledge with the stored user. Field persistence
    // arrives with the staff-profile work.
    const usersUpdateHandler = authed(async (context: Context, staff) => {
        // Only self-updates are supported; updating other staff would echo
        // the wrong identity back.
        if (context.req.param('id') !== staff.id) {
            return context.json({errors: [{message: 'Updating other users is not supported yet', type: 'NoPermissionError'}]}, 403);
        }
        const body = await context.req.json<{users?: Array<Record<string, unknown>>}>().catch(() => ({} as Record<string, never>));
        const submitted = body.users?.[0] ?? {};
        const roles = await staffAuthService.getStaffRoles(staff.id);
        return context.json({users: [buildUserPayload(staff, roles, submitted)]});
    });
    router.put('/users/:id/', usersUpdateHandler);
    router.put('/users/:id', usersUpdateHandler);

    on.get('/members/', authed(async (context) => {
        const limit = Math.min(Number(context.req.query('limit') ?? '15') || 15, 100);
        const page = Number(context.req.query('page') ?? '1') || 1;
        const [members, counts] = await Promise.all([
            memberRepository.listMembers({limit, offset: (page - 1) * limit}),
            memberRepository.countMembers()
        ]);
        const pages = Math.max(1, Math.ceil(counts.total / limit));
        return context.json({
            members: members.map((member) => ({
                id: member.id,
                uuid: member.id,
                email: member.email,
                name: null,
                note: null,
                status: member.status,
                geolocation: null,
                subscribed: true,
                email_count: 0,
                email_opened_count: 0,
                email_open_rate: null,
                created_at: new Date(member.createdAt).toISOString(),
                updated_at: new Date(member.updatedAt).toISOString(),
                labels: [],
                newsletters: [],
                subscriptions: [],
                avatar_image: null,
                comped: false
            })),
            meta: {
                pagination: {
                    page,
                    limit,
                    pages,
                    total: counts.total,
                    next: page < pages ? page + 1 : null,
                    prev: page > 1 ? page - 1 : null
                }
            }
        });
    }));

    // Stats surface: phantom has no Tinybird pipeline yet, so the stats app
    // gets a null token and empty series — its designed empty states render
    // instead of a load error. Member counts are real.
    on.get('/tinybird/token/', authed(async (context) => {
        return context.json({tinybird: {token: null, exp: null}});
    }));

    on.get('/stats/member_count/', authed(async (context) => {
        const counts = await memberRepository.countMembers();
        return context.json({
            stats: [{
                date: new Date().toISOString().slice(0, 10),
                paid: counts.paid,
                free: counts.free,
                comped: 0,
                paid_subscribed: 0,
                paid_canceled: 0
            }],
            meta: {totals: {paid: counts.paid, free: counts.free, comped: 0}}
        });
    }));

    on.get('/stats/mrr/', authed(async (context) => {
        return context.json({stats: [], meta: {totals: []}});
    }));

    on.get('/stats/subscriptions/', authed(async (context) => {
        return context.json({stats: [], meta: {totals: []}});
    }));

    on.get('/stats/top-posts-views/', authed(async (context) => {
        return context.json({stats: []});
    }));

    on.get('/stats/posts/:id/stats/', authed(async (context) => {
        return context.json({stats: []});
    }));

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
        // public surfaces; the status tabs arrive as an NQL filter.
        const statuses = parseStatusFilter(context.req.query('filter'));
        const {entries, pagination} = await contentReader.listPublished({
            page,
            limit,
            filter: statuses ? {type: 'post', statuses} : {type: 'post', status: 'all'}
        });
        const posts = await Promise.all(entries.map((entry) => mapAdminPost(entry, siteUrl)));
        return context.json({posts, meta: buildPagination(pagination)});
    });

    on.get('/pages/', authed(async (context) => {
        const page = Number(context.req.query('page') ?? '1') || 1;
        const rawLimit = context.req.query('limit');
        const limit = rawLimit === 'all' ? 100 : Math.min(Number(rawLimit ?? '15') || 15, 100);
        const statuses = parseStatusFilter(context.req.query('filter'));
        const {entries, pagination} = await contentReader.listPublished({
            page,
            limit,
            filter: statuses ? {type: 'page', statuses} : {type: 'page', status: 'all'}
        });
        const pages = await Promise.all(entries.map((entry) => mapAdminPost(entry, siteUrl)));
        return context.json({pages, meta: buildPagination(pagination)});
    }));

    on.get('/tags/', authed(async (context) => {
        const visibilityFilter = context.req.query('filter');
        const tags = await contentReader.listTagsWithCounts();
        const filtered = visibilityFilter?.includes('visibility:public')
            ? tags.filter(({tag}) => tag.visibility === 'public')
            : tags;
        filtered.sort((left, right) => left.tag.name.localeCompare(right.tag.name));
        return context.json({
            tags: filtered.map(({tag, postCount}) => ({
                ...mapCompatTag(tag, siteUrl),
                count: {posts: postCount}
            })),
            meta: singlePagination(filtered.length)
        });
    }));


    // --- Editor surface: read, create and save posts/pages ---

    const wireToCreateInput = (wire: WirePost, type: 'post' | 'page') => ({
        title: asWireString(wire.title)?.trim() || '(Untitled)',
        type,
        ...(asWireString(wire.slug) ? {slug: asWireString(wire.slug)} : {}),
        status: wireStatus(wire.status) ?? 'draft',
        ...(parseWireDate(wire.published_at) !== undefined ? {publishedAt: parseWireDate(wire.published_at)} : {}),
        lexical: parseWireLexical(wire.lexical) ?? {root: {children: [], direction: null, format: '', indent: 0, type: 'root', version: 1}},
        ...(asWireString(wire.custom_excerpt) ? {customExcerpt: asWireString(wire.custom_excerpt)} : {}),
        ...(asWireString(wire.feature_image) ? {featureImage: asWireString(wire.feature_image)} : {})
    });

    const wireToUpdateInput = (wire: WirePost) => {
        const lexical = parseWireLexical(wire.lexical);
        const publishedAt = parseWireDate(wire.published_at);
        const title = asWireString(wire.title)?.trim();
        const customExcerpt = nullableWireString(wire, 'custom_excerpt');
        const featureImage = nullableWireString(wire, 'feature_image');
        return {
            ...(title ? {title} : {}),
            ...(asWireString(wire.slug) ? {slug: asWireString(wire.slug)} : {}),
            ...(wireStatus(wire.status) ? {status: wireStatus(wire.status)} : {}),
            ...(publishedAt !== undefined ? {publishedAt} : {}),
            ...(lexical ? {lexical} : {}),
            ...(customExcerpt !== undefined ? {customExcerpt} : {}),
            ...(featureImage !== undefined ? {featureImage} : {})
        };
    };

    const notFoundJson = (context: Context, resource: string) => {
        return context.json({errors: [{message: `${resource} not found.`, type: 'NotFoundError'}]}, 404);
    };

    const respondWithEntry = async (context: Context, id: string, key: 'posts' | 'pages', status: 200 | 201 = 200) => {
        const entry = await contentReader.getEntryById(id);
        if (!entry) {
            return notFoundJson(context, key === 'posts' ? 'Post' : 'Page');
        }
        return context.json({[key]: [await mapAdminPost(entry, siteUrl)]}, status);
    };

    const registerEntryRoutes = (key: 'posts' | 'pages', type: 'post' | 'page') => {
        on.get(`/${key}/:id/`, authed(async (context) => {
            const entry = await contentReader.getEntryById(context.req.param('id'));
            if (!entry || entry.post.type !== type) {
                return notFoundJson(context, key === 'posts' ? 'Post' : 'Page');
            }
            return context.json({[key]: [await mapAdminPost(entry, siteUrl)]});
        }));

        on.post(`/${key}/`, authed(async (context, staff) => {
            const body = await context.req.json<{posts?: WirePost[]; pages?: WirePost[]}>().catch(() => ({} as Record<string, never>));
            const wire = (key === 'posts' ? body.posts : body.pages)?.[0];
            if (!wire) {
                return context.json({errors: [{message: 'No resource provided', type: 'ValidationError'}]}, 422);
            }
            try {
                const input = wireToCreateInput(wire, type);
                const created = await contentService.createPost(input, staff.id);
                return respondWithEntry(context, created.post.id, key, 201);
            } catch (error) {
                if (error instanceof MalformedLexicalError) {
                    return context.json({errors: [{message: error.message, type: 'ValidationError'}]}, 422);
                }
                if (error instanceof HttpError) {
                    return context.json({errors: [{message: error.message, type: 'ValidationError'}]}, error.status as 422);
                }
                throw error;
            }
        }));

        const updateHandler = authed(async (context, staff) => {
            const id = context.req.param('id');
            const existing = await contentReader.getEntryById(id);
            if (!existing || existing.post.type !== type) {
                return notFoundJson(context, key === 'posts' ? 'Post' : 'Page');
            }
            const body = await context.req.json<{posts?: WirePost[]; pages?: WirePost[]}>().catch(() => ({} as Record<string, never>));
            const wire = (key === 'posts' ? body.posts : body.pages)?.[0];
            if (!wire) {
                return context.json({errors: [{message: 'No resource provided', type: 'ValidationError'}]}, 422);
            }
            // Ghost rejects saves based on a stale copy so concurrent edits
            // are not silently overwritten.
            const clientUpdatedAt = parseWireDate(wire.updated_at);
            if (clientUpdatedAt !== undefined && clientUpdatedAt !== existing.post.updatedAt) {
                return context.json({
                    errors: [{
                        message: 'Saving failed! Someone else is editing this post.',
                        type: 'UpdateCollisionError'
                    }]
                }, 409);
            }
            try {
                const input = wireToUpdateInput(wire);
                await contentService.updatePost(id, input, staff.id);
                return respondWithEntry(context, id, key);
            } catch (error) {
                if (error instanceof MalformedLexicalError) {
                    return context.json({errors: [{message: error.message, type: 'ValidationError'}]}, 422);
                }
                if (error instanceof HttpError) {
                    return context.json({errors: [{message: error.message, type: 'ValidationError'}]}, error.status as 422);
                }
                throw error;
            }
        });
        router.put(`/${key}/:id/`, updateHandler);
        router.put(`/${key}/:id`, updateHandler);
    };

    registerEntryRoutes('posts', 'post');
    registerEntryRoutes('pages', 'page');

    on.get('/slugs/:type/:slug/', authed(async (context) => {
        const base = compatSlugify(decodeURIComponent(context.req.param('slug')));
        let candidate = base;
        let suffix = 2;
        while (await contentReader.isSlugTaken(candidate)) {
            candidate = `${base}-${suffix}`;
            suffix += 1;
        }
        return context.json({slugs: [{slug: candidate}]});
    }));

    on.get('/users/', authed(async (context) => {
        const staffAccounts = await staffRepository.listStaff();
        const users = await Promise.all(staffAccounts.map(async (account) => {
            const roles = await staffAuthService.getStaffRoles(account.id);
            return buildUserPayload(account, roles);
        }));
        return context.json({users, meta: singlePagination(users.length)});
    }));

    // Minimal search index for the admin's command palette.
    on.get('/search-index/posts/', authed(async (context) => {
        const {entries} = await contentReader.listPublished({page: 1, limit: 100, filter: {type: 'post', status: 'all'}});
        return context.json({posts: entries.map(({post}) => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            status: post.status,
            published_at: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
            visibility: post.visibility,
            url: `${siteUrl}/${post.slug}/`
        }))});
    }));

    on.get('/search-index/pages/', authed(async (context) => {
        const {entries} = await contentReader.listPublished({page: 1, limit: 100, filter: {type: 'page', status: 'all'}});
        return context.json({pages: entries.map(({post}) => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            status: post.status,
            published_at: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
            visibility: post.visibility,
            url: `${siteUrl}/${post.slug}/`
        }))});
    }));

    on.get('/search-index/tags/', authed(async (context) => {
        const tags = await contentReader.listTags();
        return context.json({tags: tags.map((tag) => ({
            id: tag.id,
            slug: tag.slug,
            name: tag.name,
            url: `${siteUrl}/tag/${tag.slug}/`
        }))});
    }));

    on.get('/search-index/users/', authed(async (context) => {
        const staffAccounts = await staffRepository.listStaff();
        return context.json({users: staffAccounts.map((account) => ({
            id: account.id,
            slug: account.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: account.name,
            url: `${siteUrl}/author/${account.id}/`,
            profile_image: null
        }))});
    }));

    // Editor sidebar collections phantom has no data for yet.
    on.get('/offers/', authed(async (context) => {
        return context.json({offers: [], meta: singlePagination(0)});
    }));
    on.get('/labels/', authed(async (context) => {
        return context.json({labels: [], meta: singlePagination(0)});
    }));
    on.get('/snippets/', authed(async (context) => {
        return context.json({snippets: [], meta: singlePagination(0)});
    }));
    on.get('/comments/', authed(async (context) => {
        return context.json({comments: [], meta: singlePagination(0)});
    }));
    on.get('/newsletters/', authed(async (context) => {
        const newsletters = await newsletterRepository.listNewsletters();
        return context.json({newsletters: newsletters.map(mapCompatNewsletter), meta: singlePagination(newsletters.length)});
    }));

    return router;
};
