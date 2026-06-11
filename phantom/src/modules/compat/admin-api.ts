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
import {buildPagination, compatSlugify, GHOST_COMPAT_VERSION, mapAdminPost, mapCompatNewsletter, mapCompatTag, mapCompatTier, resolveEntryHtml, singlePagination} from './mappers.js';
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
    // Host-managed settings (billing, force upgrade) surfaced via /config/.
    hostSettings?: Record<string, unknown>;
    // Outbound mail (password resets, invites); absent in minimal setups.
    mailer?: {send: (message: {to: string; from: string; subject: string; html: string; text: string}) => Promise<void>};
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

// Parses the admin's NQL browse filter: `+`-joined `key:value` clauses where
// value may be `[a,b]`. Covers the posts screen filter dropdowns (type, tag,
// visibility, author, featured); unknown clauses are ignored.
type BrowseFilter = {
    statuses: string[] | null;
    tagSlug?: string;
    authorSlug?: string;
    visibilities?: string[];
    featured?: boolean;
};

const parseBrowseFilter = (filter: string | undefined): BrowseFilter => {
    const parsed: BrowseFilter = {statuses: null};
    if (!filter) {
        return parsed;
    }
    for (const clause of filter.split('+')) {
        const separator = clause.indexOf(':');
        if (separator === -1) {
            continue;
        }
        const key = clause.slice(0, separator).trim();
        const raw = clause.slice(separator + 1).trim();
        const values = (raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : raw)
            .split(',').map((entry) => entry.trim()).filter(Boolean);
        if (values.length === 0) {
            continue;
        }
        switch (key) {
        case 'status':
            parsed.statuses = values;
            break;
        case 'tag':
            parsed.tagSlug = values[0]!;
            break;
        case 'authors':
        case 'author':
            parsed.authorSlug = values[0]!;
            break;
        case 'visibility':
            parsed.visibilities = values;
            break;
        case 'featured':
            parsed.featured = values[0] === 'true';
            break;
        default:
            break;
        }
    }
    return parsed;
};

const parseBrowseOrder = (order: string | undefined) => {
    return order === 'published_at asc' || order === 'published_at desc' ||
        order === 'updated_at asc' || order === 'updated_at desc'
        ? order
        : undefined;
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
    siteUrl,
    hostSettings = {},
    mailer
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
        staff: {id: string; name: string; email: string; status: string; accessibility?: string | null; createdAt?: number; updatedAt?: number},
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
        accessibility: (overrides.accessibility as string | null | undefined) ?? staff.accessibility ?? null,
        status: staff.status,
        meta_title: null,
        meta_description: null,
        tour: null,
        last_seen: new Date().toISOString(),
        // The shell compares changelog dates against when the user joined.
        created_at: new Date(staff.createdAt ?? 0).toISOString(),
        updated_at: new Date(staff.updatedAt ?? 0).toISOString(),
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
        // The session DTO is trimmed; the full record carries persisted UI
        // state (accessibility).
        const record = await staffRepository.getStaffById(staff.id) ?? staff;
        const roles = await staffAuthService.getStaffRoles(staff.id);
        return context.json({users: [buildUserPayload(record, roles)]});
    });

    on.get('/config/', async (context) => {
        return context.json({
            config: {
                version: GHOST_COMPAT_VERSION,
                environment: 'development',
                database: 'sqlite3',
                mail: 'SMTP',
                // The editor builds draft preview URLs as {blogUrl}/p/{uuid}.
                blogUrl: siteUrl,
                useGravatar: false,
                labs: {},
                clientExtensions: {},
                enableDeveloperExperiments: false,
                stripeDirect: false,
                mailgunIsConfigured: false,
                emailAnalytics: false,
                hostSettings,
                tenor: {googleApiKey: null},
                pintura: {},
                signupForm: {url: '', version: ''},
                security: {},
                editor: {url: '', version: ''}
            }
        });
    });

    const buildAdminSettings = (settings: SettingsList) => {
        const value = (key: string, fallback: unknown = null) => readSetting(settings, key) ?? fallback;
        return [
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
            {key: 'is_private', value: Boolean(value('site.is_private', false))},
            {key: 'password', value: value('site.password', '')},
            {key: 'shared_views', value: JSON.stringify(value('site.shared_views', []))},
            {key: 'labs', value: JSON.stringify(value('labs.flags', {}))},
            // Gates the shell's Network nav item; Ghost 6 defaults the
            // social web to enabled.
            {key: 'social_web_enabled', value: Boolean(value('social_web.enabled', true))},
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
            {key: 'announcement_content', value: value('announcement.content')},
            {key: 'announcement_visibility', value: JSON.stringify(value('announcement.visibility', []))},
            {key: 'announcement_background', value: value('announcement.background', 'dark')}
        ];
    };

    on.get('/settings/', authed(async (context) => {
        const {settings} = await settingsService.listSettings();
        return context.json({settings: buildAdminSettings(settings), meta: {}});
    }));

    // Wire settings key → native settings key, with the wire value decoded
    // where the wire carries JSON-as-string. Keys phantom doesn't model yet
    // are skipped: the settings app saves whole groups at once and a hard
    // error would block the keys we do support.
    const WIRE_SETTINGS_WRITES: Record<string, {key: string; decode?: (value: unknown) => unknown}> = {
        title: {key: 'site.title'},
        description: {key: 'site.description'},
        logo: {key: 'site.logo'},
        icon: {key: 'site.icon'},
        cover_image: {key: 'site.cover_image'},
        accent_color: {key: 'site.accent_color'},
        locale: {key: 'site.locale'},
        timezone: {key: 'site.timezone'},
        facebook: {key: 'site.facebook'},
        twitter: {key: 'site.twitter'},
        codeinjection_head: {key: 'site.codeinjection_head'},
        codeinjection_foot: {key: 'site.codeinjection_foot'},
        navigation: {key: 'site.navigation', decode: (value) => (typeof value === 'string' ? JSON.parse(value) : value)},
        shared_views: {key: 'site.shared_views', decode: (value) => (typeof value === 'string' ? JSON.parse(value) : value)},
        secondary_navigation: {key: 'site.secondary_navigation', decode: (value) => (typeof value === 'string' ? JSON.parse(value) : value)},
        active_theme: {key: 'theme.active'},
        is_private: {key: 'site.is_private'},
        password: {key: 'site.password'},
        announcement_content: {key: 'announcement.content'},
        announcement_visibility: {key: 'announcement.visibility', decode: (value) => (typeof value === 'string' ? JSON.parse(value) : value)},
        announcement_background: {key: 'announcement.background'},
        labs: {key: 'labs.flags', decode: (value) => (typeof value === 'string' ? JSON.parse(value) : value)},
        social_web_enabled: {key: 'social_web.enabled'},
        members_signup_access: {key: 'members.signup_access'},
        default_content_visibility: {key: 'members.default_content_visibility'}
    };

    const settingsUpdateHandler = authed(async (context: Context) => {
        const body = await context.req.json<{settings?: Array<{key?: string; value?: unknown}>}>().catch(() => ({} as Record<string, never>));
        const updates: Array<{key: string; value: unknown}> = [];
        for (const entry of body.settings ?? []) {
            const mapping = entry.key ? WIRE_SETTINGS_WRITES[entry.key] : undefined;
            if (!mapping) {
                continue;
            }
            let decoded = entry.value;
            if (mapping.decode) {
                try {
                    decoded = mapping.decode(entry.value);
                } catch {
                    return context.json({errors: [{message: `Invalid value for setting ${entry.key}`, type: 'ValidationError'}]}, 422);
                }
            }
            updates.push({key: mapping.key, value: decoded});
        }
        try {
            if (updates.length > 0) {
                await settingsService.updateSettings({settings: updates} as Parameters<SettingsService['updateSettings']>[0]);
            }
        } catch (error) {
            if (error instanceof HttpError) {
                return context.json({errors: [{message: error.message, type: 'ValidationError'}]}, 422);
            }
            throw error;
        }
        const {settings} = await settingsService.listSettings();
        return context.json({settings: buildAdminSettings(settings), meta: {}});
    });
    router.put('/settings/', settingsUpdateHandler);
    router.put('/settings', settingsUpdateHandler);

    // Staff password reset: POST issues the email (always 200 to avoid
    // account enumeration), PUT consumes the token and changes the password.
    on.post('/authentication/password_reset/', async (context) => {
        const body = await context.req.json<{password_reset?: Array<{email?: string}>}>().catch(() => ({} as Record<string, never>));
        const email = body.password_reset?.[0]?.email;
        if (!email) {
            return context.json({errors: [{message: 'Email is required', type: 'ValidationError'}]}, 422);
        }
        const result = await staffAuthService.requestPasswordReset({email});
        if (result.issued && result.resetToken && mailer) {
            // Ghost admin decodes the URL token as base64("expires|email|hash")
            // to prefill the email; wrap the raw token the same way.
            const wireToken = Buffer.from(`${result.resetToken.expiresAt}|${email}|${result.resetToken.token}`).toString('base64');
            const resetUrl = `${siteUrl}/ghost/reset/${encodeURIComponent(wireToken)}/`;
            await mailer.send({
                to: email,
                from: `noreply@${new URL(siteUrl).hostname}`,
                subject: 'Reset Password',
                text: `A request has been made to reset the password for your account.\n\n${resetUrl}\n\nIf you did not ask for your password to be reset, ignore this email.`,
                html: `<p>A request has been made to reset the password for your account.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>${resetUrl}</p>`
            });
        }
        return context.json({password_reset: [{message: 'Check your email for further instructions.'}]});
    });

    const passwordResetConfirmHandler = async (context: Context) => {
        const body = await context.req.json<{password_reset?: Array<{token?: string; newPassword?: string; ne2Password?: string}>}>().catch(() => ({} as Record<string, never>));
        const wire = body.password_reset?.[0];
        if (!wire?.token || !wire.newPassword || wire.newPassword !== wire.ne2Password) {
            return context.json({errors: [{message: 'Invalid password reset', type: 'ValidationError'}]}, 422);
        }
        let email = '';
        let rawToken = '';
        try {
            const decoded = Buffer.from(decodeURIComponent(wire.token), 'base64').toString('utf8').split('|');
            email = decoded[1] ?? '';
            rawToken = decoded[2] ?? '';
        } catch {
            return context.json({errors: [{message: 'Invalid password reset token', type: 'ValidationError'}]}, 422);
        }
        try {
            await staffAuthService.resetPassword({token: rawToken, password: wire.newPassword});
            // The admin expects the reset to leave it signed in (no legacy
            // emailVerificationToken round trip).
            const login = await staffAuthService.login({email, password: wire.newPassword}, context.req.header('x-forwarded-for') ?? 'unknown');
            if ('session' in login && login.session) {
                setCookie(context, SESSION_COOKIE, login.session.id, {
                    path: '/ghost',
                    httpOnly: true,
                    sameSite: 'Lax'
                });
            }
        } catch (error) {
            if (error instanceof HttpError) {
                return context.json({errors: [{message: error.message, type: 'UnauthorizedError'}]}, error.status as 400);
            }
            throw error;
        }
        return context.json({password_reset: [{message: 'Password changed successfully.'}]});
    };
    router.put('/authentication/password_reset/', passwordResetConfirmHandler);
    router.put('/authentication/password_reset', passwordResetConfirmHandler);

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
        // UI state (custom views, night shift) lives in the accessibility
        // JSON blob and must survive reloads.
        if ('accessibility' in submitted && (typeof submitted.accessibility === 'string' || submitted.accessibility === null)) {
            await staffRepository.updateStaffAccessibility(staff.id, submitted.accessibility, Date.now());
        }
        const updated = await staffRepository.getStaffById(staff.id) ?? staff;
        const roles = await staffAuthService.getStaffRoles(staff.id);
        return context.json({users: [buildUserPayload(updated, roles, submitted)]});
    });
    router.put('/users/:id/', usersUpdateHandler);
    router.put('/users/:id', usersUpdateHandler);

    type MemberWithLabels = {member: Awaited<ReturnType<MemberRepository['listMembers']>>[number]; labels: Awaited<ReturnType<MemberRepository['listLabels']>>};

    const mapMember = ({member, labels}: MemberWithLabels) => ({
        id: member.id,
        uuid: member.id,
        email: member.email,
        name: member.name ?? null,
        note: member.note ?? null,
        status: member.status,
        geolocation: member.geolocation ?? null,
        subscribed: true,
        email_count: 0,
        email_opened_count: 0,
        email_open_rate: null,
        last_seen_at: member.lastSeenAt ? new Date(member.lastSeenAt).toISOString() : null,
        created_at: new Date(member.createdAt).toISOString(),
        updated_at: new Date(member.updatedAt).toISOString(),
        labels: labels.map((label) => ({
            id: label.id,
            name: label.name,
            slug: label.slug,
            created_at: new Date(label.createdAt).toISOString(),
            updated_at: new Date(label.updatedAt).toISOString()
        })),
        newsletters: [],
        subscriptions: [],
        attribution: null,
        avatar_image: null,
        comped: false
    });

    // Members filter NQL subset: `label:VIP` / `label:[VIP]` (repeated
    // labels AND together), `email:'x@y.com'`, `name:~'Alice'` (contains).
    const parseMemberFilter = (filter: string | undefined): {email?: string; emailContains?: string; labelSlugs?: string[]; nameContains?: string} => {
        if (!filter) {
            return {};
        }
        const parsed: {email?: string; emailContains?: string; labelSlugs?: string[]; nameContains?: string} = {};
        const labelSlugs: string[] = [];
        for (const label of filter.matchAll(/label:(\[([^\]]+)\]|'([^']+)'|([^+\s]+))/g)) {
            const value = label[2] ?? label[3] ?? label[4];
            if (value) {
                labelSlugs.push(compatSlugify(value.split(',')[0]!.trim()));
            }
        }
        if (labelSlugs.length > 0) {
            parsed.labelSlugs = labelSlugs;
        }
        const emailContains = /email:~'([^']+)'/.exec(filter);
        if (emailContains?.[1]) {
            parsed.emailContains = emailContains[1];
        } else {
            const email = /email:(?:'([^']+)'|([^+\s]+))/.exec(filter);
            if (email) {
                const value = email[1] ?? email[2];
                if (value) {
                    parsed.email = value;
                }
            }
        }
        const name = /name:~'([^']+)'/.exec(filter);
        if (name?.[1]) {
            parsed.nameContains = name[1];
        }
        return parsed;
    };

    const memberWithLabels = async (member: Awaited<ReturnType<MemberRepository['listMembers']>>[number]) => {
        const labelsByMember = await memberRepository.getLabelsForMembers([member.id]);
        return mapMember({member, labels: labelsByMember.get(member.id) ?? []});
    };

    // Wire labels arrive as strings or {name} objects; they upsert by slug.
    const resolveWireLabels = async (raw: unknown): Promise<string[] | undefined> => {
        if (!Array.isArray(raw)) {
            return undefined;
        }
        const labelIds: string[] = [];
        for (const entry of raw) {
            const name = typeof entry === 'string' ? entry : asWireString((entry as Record<string, unknown>)?.name);
            if (!name) {
                continue;
            }
            const now = Date.now();
            const label = await memberRepository.upsertLabel({
                id: crypto.randomUUID(),
                name,
                slug: compatSlugify(name),
                createdAt: now,
                updatedAt: now
            });
            labelIds.push(label.id);
        }
        return labelIds;
    };

    on.get('/members/', authed(async (context) => {
        const limit = Math.min(Number(context.req.query('limit') ?? '15') || 15, 100);
        const page = Number(context.req.query('page') ?? '1') || 1;
        const search = context.req.query('search');
        const filter = {
            ...parseMemberFilter(context.req.query('filter')),
            ...(search ? {search} : {})
        };
        const [members, total] = await Promise.all([
            memberRepository.listMembers({limit, offset: (page - 1) * limit, filter}),
            memberRepository.countFilteredMembers(filter)
        ]);
        const labelsByMember = await memberRepository.getLabelsForMembers(members.map((member) => member.id));
        const pages = Math.max(1, Math.ceil(total / limit));
        return context.json({
            members: members.map((member) => mapMember({member, labels: labelsByMember.get(member.id) ?? []})),
            meta: {
                pagination: {
                    page,
                    limit,
                    pages,
                    total,
                    next: page < pages ? page + 1 : null,
                    prev: page > 1 ? page - 1 : null
                }
            }
        });
    }));

    const isValidEmail = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    const invalidEmailError = (context: Context) => context.json({
        errors: [{
            message: 'Validation error, cannot save member.',
            context: 'Invalid Email.',
            type: 'ValidationError'
        }]
    }, 422);

    on.post('/members/', authed(async (context) => {
        const body = await context.req.json<{members?: Array<Record<string, unknown>>}>().catch(() => ({} as Record<string, never>));
        const wire = body.members?.[0];
        const email = asWireString(wire?.email);
        if (!wire || !email) {
            return context.json({errors: [{message: 'Email is required', type: 'ValidationError'}]}, 422);
        }
        if (!isValidEmail(email)) {
            return invalidEmailError(context);
        }
        if (await memberRepository.getMemberByEmail(email)) {
            return context.json({errors: [{message: 'Member already exists. Attempting to add member with existing email address', type: 'ValidationError'}]}, 422);
        }
        const now = Date.now();
        const member = await memberRepository.createMember({
            id: crypto.randomUUID(),
            email,
            status: 'free',
            name: asWireString(wire.name) ?? null,
            note: asWireString(wire.note) ?? null,
            geolocation: asWireString(wire.geolocation) ?? null,
            createdAt: parseWireDate(wire.created_at) ?? now,
            updatedAt: now
        });
        const labelIds = await resolveWireLabels(wire.labels);
        if (labelIds && labelIds.length > 0) {
            await memberRepository.setMemberLabels(member.id, labelIds);
        }
        return context.json({members: [await memberWithLabels(member)]}, 201);
    }));

    // CSV export behind the actions menu; `filter`/`search` narrow the set
    // exactly like the browse endpoint.
    on.get('/members/upload/', authed(async (context) => {
        const search = context.req.query('search');
        const filter = {
            ...parseMemberFilter(context.req.query('filter')),
            ...(search ? {search} : {})
        };
        const members = await memberRepository.listMembers({limit: 100000, offset: 0, filter});
        const labelsByMember = await memberRepository.getLabelsForMembers(members.map((member) => member.id));
        const csvField = (value: string | null | undefined) => {
            const text = value ?? '';
            return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        };
        const header = 'id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id';
        const rows = members.map((member) => [
            member.id,
            csvField(member.email),
            csvField(member.name),
            csvField(member.note),
            'true',
            'false',
            '',
            new Date(member.createdAt).toISOString(),
            '',
            csvField((labelsByMember.get(member.id) ?? []).map((label) => label.name).join(',')),
            '',
            ''
        ].join(','));
        const today = new Date().toISOString().slice(0, 10);
        return new Response([header, ...rows].join('\n'), {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="ghost.members.${today}.csv"`
            }
        });
    }));

    // Bulk actions from the members actions menu. Unsubscribe succeeds as a
    // no-op: phantom has no per-member newsletter subscription state yet.
    const memberBulkHandler = authed(async (context: Context) => {
        const search = context.req.query('search');
        const filter = {
            ...parseMemberFilter(context.req.query('filter')),
            ...(search ? {search} : {})
        };
        const body = await context.req.json<{bulk?: {action?: string; meta?: {label?: {id?: string; name?: string}}}}>().catch(() => ({} as Record<string, never>));
        const action = body.bulk?.action;
        if (!action) {
            return context.json({errors: [{message: 'Bulk action required', type: 'ValidationError'}]}, 422);
        }
        const members = await memberRepository.listMembers({limit: 100000, offset: 0, filter});
        let successful = members.length;
        if (action === 'addLabel' || action === 'removeLabel') {
            const labelName = body.bulk?.meta?.label?.name;
            const labelId = body.bulk?.meta?.label?.id;
            let label = null;
            if (labelName) {
                const now = Date.now();
                label = await memberRepository.upsertLabel({
                    id: crypto.randomUUID(),
                    name: labelName,
                    slug: compatSlugify(labelName),
                    createdAt: now,
                    updatedAt: now
                });
            } else if (labelId) {
                label = (await memberRepository.listLabels()).find((entry) => entry.id === labelId) ?? null;
            }
            if (!label) {
                return context.json({errors: [{message: 'Label not found', type: 'ValidationError'}]}, 422);
            }
            const labelsByMember = await memberRepository.getLabelsForMembers(members.map((member) => member.id));
            for (const member of members) {
                const current = (labelsByMember.get(member.id) ?? []).map((entry) => entry.id);
                const next = action === 'addLabel'
                    ? [...new Set([...current, label.id])]
                    : current.filter((id) => id !== label.id);
                await memberRepository.setMemberLabels(member.id, next);
            }
        } else if (action !== 'unsubscribe') {
            successful = 0;
        }
        return context.json({bulk: {action, meta: {stats: {successful, unsuccessful: 0}, errors: [], unsuccessfulData: []}}});
    });
    router.put('/members/bulk/', memberBulkHandler);
    router.put('/members/bulk', memberBulkHandler);

    on.get('/members/:id/', authed(async (context) => {
        const member = await memberRepository.getMemberById(context.req.param('id'));
        if (!member) {
            return notFoundJson(context, 'Member');
        }
        return context.json({members: [await memberWithLabels(member)]});
    }));

    const memberUpdateHandler = authed(async (context: Context) => {
        const member = await memberRepository.getMemberById(context.req.param('id'));
        if (!member) {
            return notFoundJson(context, 'Member');
        }
        const body = await context.req.json<{members?: Array<Record<string, unknown>>}>().catch(() => ({} as Record<string, never>));
        const wire = body.members?.[0] ?? {};
        const wireEmail = asWireString(wire.email);
        if (wireEmail !== undefined && !isValidEmail(wireEmail)) {
            return invalidEmailError(context);
        }
        const updated = await memberRepository.updateMember({
            ...member,
            email: asWireString(wire.email) ?? member.email,
            name: 'name' in wire ? asWireString(wire.name) ?? null : member.name,
            note: 'note' in wire ? asWireString(wire.note) ?? null : member.note,
            updatedAt: Date.now()
        });
        const labelIds = await resolveWireLabels(wire.labels);
        if (labelIds) {
            await memberRepository.setMemberLabels(updated.id, labelIds);
        }
        return context.json({members: [await memberWithLabels(updated)]});
    });
    router.put('/members/:id/', memberUpdateHandler);
    router.put('/members/:id', memberUpdateHandler);

    const memberDeleteHandler = authed(async (context: Context) => {
        const id = context.req.param('id');
        if (id === undefined) {
            // Bulk deletion: ?all=true wipes the directory (also the e2e
            // harness reset), ?filter= deletes the filtered set.
            if (context.req.query('all') === 'true') {
                const {total} = await memberRepository.countMembers();
                await memberRepository.deleteAllMembers();
                return context.json({meta: {stats: {successful: total}}});
            }
            const filterQuery = context.req.query('filter');
            if (filterQuery) {
                const filter = parseMemberFilter(filterQuery);
                const members = await memberRepository.listMembers({limit: 100000, offset: 0, filter});
                for (const member of members) {
                    await memberRepository.deleteMember(member.id);
                }
                return context.json({meta: {stats: {successful: members.length}}});
            }
        }
        if (!id) {
            return context.json({errors: [{message: 'Member id required', type: 'ValidationError'}]}, 422);
        }
        const member = await memberRepository.getMemberById(id);
        if (!member) {
            return notFoundJson(context, 'Member');
        }
        await memberRepository.deleteMember(id);
        return context.body(null, 204);
    });
    router.delete('/members/:id/', memberDeleteHandler);
    router.delete('/members/:id', memberDeleteHandler);
    router.delete('/members/', memberDeleteHandler);
    router.delete('/members', memberDeleteHandler);

    on.get('/labels/', authed(async (context) => {
        const labels = await memberRepository.listLabels();
        return context.json({
            labels: labels.map((label) => ({
                id: label.id,
                name: label.name,
                slug: label.slug,
                created_at: new Date(label.createdAt).toISOString(),
                updated_at: new Date(label.updatedAt).toISOString(),
                count: {members: 0}
            })),
            meta: singlePagination(labels.length)
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
        // public surfaces; the status tabs and filter dropdowns arrive as an
        // NQL filter plus an order param.
        const browse = parseBrowseFilter(context.req.query('filter'));
        const {entries, pagination} = await contentReader.listPublished({
            page,
            limit,
            filter: {
                type: 'post',
                ...(browse.statuses ? {statuses: browse.statuses} : {status: 'all'}),
                ...(browse.tagSlug ? {tagSlug: browse.tagSlug} : {}),
                ...(browse.authorSlug ? {authorSlug: browse.authorSlug} : {}),
                ...(browse.visibilities ? {visibilities: browse.visibilities} : {}),
                ...(browse.featured !== undefined ? {featured: browse.featured} : {})
            },
            ...(parseBrowseOrder(context.req.query('order')) ? {order: parseBrowseOrder(context.req.query('order'))!} : {})
        });
        const posts = await Promise.all(entries.map((entry) => mapAdminPost(entry, siteUrl)));
        return context.json({posts, meta: buildPagination(pagination)});
    });

    on.get('/pages/', authed(async (context) => {
        const page = Number(context.req.query('page') ?? '1') || 1;
        const rawLimit = context.req.query('limit');
        const limit = rawLimit === 'all' ? 100 : Math.min(Number(rawLimit ?? '15') || 15, 100);
        const browse = parseBrowseFilter(context.req.query('filter'));
        const {entries, pagination} = await contentReader.listPublished({
            page,
            limit,
            filter: {
                type: 'page',
                ...(browse.statuses ? {statuses: browse.statuses} : {status: 'all'})
            },
            ...(parseBrowseOrder(context.req.query('order')) ? {order: parseBrowseOrder(context.req.query('order'))!} : {})
        });
        const pages = await Promise.all(entries.map((entry) => mapAdminPost(entry, siteUrl)));
        return context.json({pages, meta: buildPagination(pagination)});
    }));

    on.get('/tags/', authed(async (context) => {
        const visibilityFilter = context.req.query('filter');
        const tags = await contentReader.listTagsWithCounts();
        const filtered = visibilityFilter?.includes('visibility:internal')
            ? tags.filter(({tag}) => tag.visibility === 'internal')
            : visibilityFilter?.includes('visibility:public')
                ? tags.filter(({tag}) => tag.visibility === 'public')
                : tags;
        filtered.sort((left, right) => left.tag.name.localeCompare(right.tag.name));

        const rawLimit = context.req.query('limit');
        const limit = rawLimit && rawLimit !== 'all' ? Math.max(Number(rawLimit) || 15, 1) : null;
        const page = Math.max(Number(context.req.query('page') ?? '1') || 1, 1);
        const sliced = limit === null
            ? filtered
            : filtered.slice((page - 1) * limit, page * limit);
        const meta = limit === null
            ? singlePagination(filtered.length)
            : buildPagination({
                page,
                limit,
                pages: Math.max(Math.ceil(filtered.length / limit), 1),
                total: filtered.length,
                next: page * limit < filtered.length ? page + 1 : null,
                prev: page > 1 ? page - 1 : null
            });
        return context.json({
            tags: sliced.map(({tag, postCount}) => ({
                ...mapCompatTag(tag, siteUrl),
                count: {posts: postCount}
            })),
            meta
        });
    }));


    // --- Editor surface: read, create and save posts/pages ---

    // Posts arrive with tags as [{id} | {name, slug}]; the content service
    // links by slug.
    const resolveWireTags = async (wire: WirePost): Promise<string[] | undefined> => {
        if (!Array.isArray(wire.tags)) {
            return undefined;
        }
        const tags = await contentReader.listTags();
        const bySlug = new Map(tags.map((tag) => [tag.slug, tag]));
        const byId = new Map(tags.map((tag) => [tag.id, tag]));
        const slugs: string[] = [];
        for (const entry of wire.tags as Array<Record<string, unknown>>) {
            if (typeof entry !== 'object' || entry === null) {
                continue;
            }
            const id = asWireString(entry.id);
            const slug = asWireString(entry.slug);
            const name = asWireString(entry.name);
            if (id && byId.has(id)) {
                slugs.push(byId.get(id)!.slug);
            } else if (slug) {
                slugs.push(slug);
            } else if (name) {
                slugs.push(bySlug.has(name) ? name : name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
            }
        }
        return slugs;
    };

    const wireToCreateInput = (wire: WirePost, type: 'post' | 'page') => ({
        title: asWireString(wire.title)?.trim() || '(Untitled)',
        type,
        ...(asWireString(wire.slug) ? {slug: asWireString(wire.slug)} : {}),
        status: wireStatus(wire.status) ?? 'draft',
        ...(parseWireDate(wire.published_at) !== undefined ? {publishedAt: parseWireDate(wire.published_at)} : {}),
        ...(typeof wire.featured === 'boolean' ? {featured: wire.featured} : {}),
        ...(wire.visibility === 'public' || wire.visibility === 'members' || wire.visibility === 'paid' ? {visibility: wire.visibility as 'public' | 'members' | 'paid'} : {}),
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
            ...(typeof wire.featured === 'boolean' ? {featured: wire.featured} : {}),
            ...(wire.visibility === 'public' || wire.visibility === 'members' || wire.visibility === 'paid' ? {visibility: wire.visibility as 'public' | 'members' | 'paid'} : {}),
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
                const tags = await resolveWireTags(wire);
                const input = {...wireToCreateInput(wire, type), ...(tags ? {tags} : {})};
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
                const tags = await resolveWireTags(wire);
                const input = {...wireToUpdateInput(wire), ...(tags ? {tags} : {})};
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

        const deleteHandler = authed(async (context, staff) => {
            const id = context.req.param('id');
            const existing = await contentReader.getEntryById(id);
            if (!existing || existing.post.type !== type) {
                return notFoundJson(context, key === 'posts' ? 'Post' : 'Page');
            }
            await contentService.deletePost(id, staff.id);
            return context.body(null, 204);
        });
        router.delete(`/${key}/:id/`, deleteHandler);
        router.delete(`/${key}/:id`, deleteHandler);
    };

    registerEntryRoutes('posts', 'post');
    registerEntryRoutes('pages', 'page');

    // The editor's preview modal runs an email size check on open and the
    // Email tab renders from this; a 404 crashes the whole modal.
    on.get('/email_previews/posts/:id/', authed(async (context) => {
        const entry = await contentReader.getEntryById(context.req.param('id'));
        if (!entry) {
            return notFoundJson(context, 'Post');
        }
        const html = await resolveEntryHtml(entry);
        return context.json({
            email_previews: [{
                html: `<!DOCTYPE html><html><body data-testid="email-preview-body"><h1>${entry.post.title}</h1>${html ?? ''}</body></html>`,
                subject: entry.post.title,
                plaintext: entry.post.customExcerpt ?? entry.post.title
            }]
        });
    }));

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

    const mapAdminTag = async (tagId: string) => {
        const tags = await contentReader.listTagsWithCounts();
        const match = tags.find(({tag}) => tag.id === tagId);
        if (!match) {
            return null;
        }
        return {...mapCompatTag(match.tag, siteUrl), count: {posts: match.postCount}};
    };

    on.get('/tags/slug/:slug/', authed(async (context) => {
        const tag = await contentReader.getTagBySlug(context.req.param('slug'));
        if (!tag) {
            return context.json({errors: [{message: 'Tag not found.', type: 'NotFoundError'}]}, 404);
        }
        const mapped = await mapAdminTag(tag.id);
        return context.json({tags: [mapped]});
    }));

    on.post('/tags/', authed(async (context) => {
        const body = await context.req.json<{tags?: Array<Record<string, unknown>>}>().catch(() => ({} as Record<string, never>));
        const wire = body.tags?.[0];
        if (!wire || typeof wire.name !== 'string') {
            return context.json({errors: [{message: 'Name is required', type: 'ValidationError'}]}, 422);
        }
        try {
            const created = await contentService.createTag({
                name: wire.name,
                ...(typeof wire.slug === 'string' ? {slug: wire.slug} : {}),
                ...(typeof wire.description === 'string' ? {description: wire.description} : {})
            });
            const mapped = await mapAdminTag(created.tag.id);
            return context.json({tags: [mapped]}, 201);
        } catch (error) {
            if (error instanceof HttpError) {
                return context.json({errors: [{message: error.message, type: 'ValidationError'}]}, error.status as 422);
            }
            throw error;
        }
    }));

    const tagUpdateHandler = authed(async (context: Context) => {
        const body = await context.req.json<{tags?: Array<Record<string, unknown>>}>().catch(() => ({} as Record<string, never>));
        const wire = body.tags?.[0] ?? {};
        try {
            const updated = await contentService.updateTag(context.req.param('id'), {
                ...(typeof wire.name === 'string' ? {name: wire.name} : {}),
                ...(typeof wire.slug === 'string' ? {slug: wire.slug} : {}),
                ...(wire.description !== undefined ? {description: typeof wire.description === 'string' ? wire.description : null} : {})
            });
            const mapped = await mapAdminTag(updated.tag.id);
            return context.json({tags: [mapped]});
        } catch (error) {
            if (error instanceof HttpError) {
                return context.json({errors: [{message: error.message, type: error.status === 404 ? 'NotFoundError' : 'ValidationError'}]}, error.status as 404);
            }
            throw error;
        }
    });
    router.put('/tags/:id/', tagUpdateHandler);
    router.put('/tags/:id', tagUpdateHandler);

    const tagDeleteHandler = authed(async (context: Context) => {
        try {
            await contentService.deleteTag(context.req.param('id'));
            return context.body(null, 204);
        } catch (error) {
            if (error instanceof HttpError) {
                return context.json({errors: [{message: error.message, type: 'NotFoundError'}]}, error.status as 404);
            }
            throw error;
        }
    });
    router.delete('/tags/:id/', tagDeleteHandler);
    router.delete('/tags/:id', tagDeleteHandler);

    return router;
};
