import {Hono} from 'hono';
import type {FrontendContentReader} from '../content/frontend-reader.js';
import type {SettingsService} from '../settings/service.js';
import type {SubscriptionRepository} from '../subscriptions/repo.js';
import type {NewsletterRepository} from '../newsletters/repo.js';
import {
    buildPagination,
    GHOST_COMPAT_VERSION,
    mapCompatAuthor,
    mapCompatNewsletter,
    mapCompatPost,
    mapCompatTag,
    mapCompatTier,
    singlePagination
} from './mappers.js';
import {slashTolerant} from './router-utils.js';

type ContentApiDependencies = {
    contentReader: FrontendContentReader;
    settingsService: SettingsService;
    subscriptionRepository: SubscriptionRepository;
    newsletterRepository: NewsletterRepository;
    siteUrl: string;
};

type SettingsList = Awaited<ReturnType<SettingsService['listSettings']>>['settings'];

const readSetting = (settings: SettingsList, key: string) => {
    return settings.find((setting) => setting.key === key)?.value;
};

// Ghost reports unset images as null; imported settings store empty strings.
const imageSetting = (settings: SettingsList, key: string) => {
    const value = readSetting(settings, key);
    return typeof value === 'string' && value !== '' ? value : null;
};

const parsePage = (value: string | undefined) => {
    const page = Number(value ?? '1');
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
};

const parseLimit = (value: string | undefined, fallback = 15) => {
    if (value === 'all') {
        return 100;
    }
    const limit = Number(value ?? String(fallback));
    return Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : fallback;
};

// Ghost Content API compat surface (decision #16): the existing public apps
// and headless consumers talk to these paths unmodified.
export const createContentApiRouter = ({
    contentReader,
    settingsService,
    subscriptionRepository,
    newsletterRepository,
    siteUrl
}: ContentApiDependencies) => {
    const router = new Hono();
    const on = slashTolerant(router);

    const browseEntries = async (type: 'post' | 'page', page: number, limit: number) => {
        const {entries, pagination} = await contentReader.listPublished({
            page,
            limit,
            filter: {type}
        });
        const mapped = await Promise.all(entries.map((entry) => mapCompatPost(entry, siteUrl)));
        return {mapped, pagination};
    };

    on.get('/posts/', async (context) => {
        const page = parsePage(context.req.query('page'));
        const limit = parseLimit(context.req.query('limit'));
        const {mapped, pagination} = await browseEntries('post', page, limit);
        return context.json({posts: mapped, meta: buildPagination(pagination)});
    });

    on.get('/posts/slug/:slug/', async (context) => {
        const entry = await contentReader.getEntryBySlug(context.req.param('slug'));
        if (!entry || entry.post.type !== 'post') {
            return context.json({errors: [{message: 'Post not found.', type: 'NotFoundError'}]}, 404);
        }
        return context.json({posts: [await mapCompatPost(entry, siteUrl)]});
    });

    on.get('/pages/', async (context) => {
        const page = parsePage(context.req.query('page'));
        const limit = parseLimit(context.req.query('limit'));
        const {mapped, pagination} = await browseEntries('page', page, limit);
        return context.json({pages: mapped, meta: buildPagination(pagination)});
    });

    on.get('/pages/slug/:slug/', async (context) => {
        const entry = await contentReader.getEntryBySlug(context.req.param('slug'));
        if (!entry || entry.post.type !== 'page') {
            return context.json({errors: [{message: 'Page not found.', type: 'NotFoundError'}]}, 404);
        }
        return context.json({pages: [await mapCompatPost(entry, siteUrl)]});
    });

    on.get('/settings/', async (context) => {
        const {settings} = await settingsService.listSettings();
        const navigation = readSetting(settings, 'site.navigation');
        const secondaryNavigation = readSetting(settings, 'site.secondary_navigation');
        return context.json({
            settings: {
                title: readSetting(settings, 'site.title') ?? 'Ghost',
                description: readSetting(settings, 'site.description') ?? '',
                logo: imageSetting(settings, 'site.logo'),
                icon: imageSetting(settings, 'site.icon'),
                accent_color: readSetting(settings, 'site.accent_color') ?? null,
                cover_image: imageSetting(settings, 'site.cover_image'),
                facebook: readSetting(settings, 'site.facebook') ?? null,
                twitter: readSetting(settings, 'site.twitter') ?? null,
                lang: readSetting(settings, 'site.locale') ?? 'en',
                locale: readSetting(settings, 'site.locale') ?? 'en',
                timezone: readSetting(settings, 'site.timezone') ?? 'Etc/UTC',
                codeinjection_head: readSetting(settings, 'site.codeinjection_head') ?? null,
                codeinjection_foot: readSetting(settings, 'site.codeinjection_foot') ?? null,
                navigation: Array.isArray(navigation) ? navigation : [],
                secondary_navigation: Array.isArray(secondaryNavigation) ? secondaryNavigation : [],
                meta_title: null,
                meta_description: null,
                og_image: null,
                og_title: null,
                og_description: null,
                twitter_image: null,
                twitter_title: null,
                twitter_description: null,
                members_support_address: 'noreply',
                members_enabled: Boolean(readSetting(settings, 'feature.membership') ?? true),
                members_invite_only: (readSetting(settings, 'members.signup_access') ?? 'all') === 'invite',
                allow_self_signup: (readSetting(settings, 'members.signup_access') ?? 'all') === 'all',
                members_signup_access: readSetting(settings, 'members.signup_access') ?? 'all',
                paid_members_enabled: false,
                firstpromoter_account: null,
                portal_button: true,
                portal_name: true,
                portal_plans: ['free'],
                portal_default_plan: 'yearly',
                portal_button_icon: null,
                portal_button_signup_text: 'Subscribe',
                portal_button_style: 'icon-and-text',
                portal_signup_terms_html: null,
                portal_signup_checkbox_required: false,
                comments_enabled: readSetting(settings, 'feature.comments') ? 'all' : 'off',
                recommendations_enabled: false,
                outbound_link_tagging: true,
                default_email_address: 'noreply',
                support_email_address: 'noreply',
                editor_default_email_recipients: 'visibility',
                url: `${siteUrl}/`,
                version: GHOST_COMPAT_VERSION
            },
            meta: {}
        });
    });

    on.get('/tags/', async (context) => {
        const tags = await contentReader.listTags();
        const mapped = tags
            .filter((tag) => tag.visibility === 'public')
            .map((tag) => mapCompatTag(tag, siteUrl));
        return context.json({tags: mapped, meta: singlePagination(mapped.length)});
    });

    on.get('/authors/', async (context) => {
        const authors = await contentReader.listAuthors();
        const mapped = authors.map((author) => mapCompatAuthor(author, siteUrl));
        return context.json({authors: mapped, meta: singlePagination(mapped.length)});
    });

    on.get('/tiers/', async (context) => {
        const plans = await subscriptionRepository.listPlans();
        const tiers = await Promise.all(plans.map(async (plan) => {
            const prices = await subscriptionRepository.getPricesByPlan(plan.id);
            return mapCompatTier(plan, prices);
        }));
        tiers.sort((left, right) => (left.type === 'free' ? -1 : 0) - (right.type === 'free' ? -1 : 0));
        return context.json({tiers, meta: singlePagination(tiers.length)});
    });

    on.get('/newsletters/', async (context) => {
        const newsletters = await newsletterRepository.listNewsletters();
        const mapped = newsletters
            .filter((newsletter) => newsletter.status === 'active')
            .map(mapCompatNewsletter);
        return context.json({newsletters: mapped, meta: singlePagination(mapped.length)});
    });

    return router;
};
