import {Hono, type Context} from 'hono';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import type {AppConfig} from '../platform/config/config.js';
import type {ContentService} from '../modules/content/service.js';
import type {SettingsService} from '../modules/settings/service.js';
import {createRouteMatcher} from './routing/matcher.js';
import {createThemeStore} from './themes/store.js';
import {createRenderer} from './rendering/renderer.js';
import {renderLexicalHtml} from './rendering/lexical.js';

type FrontendDependencies = {
    config: AppConfig;
    contentService: ContentService;
    settingsService: SettingsService;
};

const readSetting = (settings: Awaited<ReturnType<SettingsService['listSettings']>>['settings'], key: string) => {
    return settings.find((setting) => setting.key === key)?.value;
};

const buildSiteContext = (settings: Awaited<ReturnType<SettingsService['listSettings']>>['settings'], config: AppConfig) => {
    return {
        title: (readSetting(settings, 'site.title') as string | undefined) ?? 'Ghost',
        description: (readSetting(settings, 'site.description') as string | null | undefined) ?? null,
        locale: (readSetting(settings, 'site.locale') as string | undefined) ?? 'en',
        url: `http://localhost:${config.port}`,
        cover_image: (readSetting(settings, 'site.cover_image') as string | null | undefined) ?? null,
        logo: (readSetting(settings, 'site.logo') as string | null | undefined) ?? null,
        icon: (readSetting(settings, 'site.icon') as string | null | undefined) ?? null,
        accent_color: (readSetting(settings, 'site.accent_color') as string | null | undefined) ?? null,
        facebook: 'https://www.facebook.com/ghost',
        twitter: '@ghost',
        members_enabled: Boolean(readSetting(settings, 'feature.membership')),
        members_invite_only: false,
        comments_enabled: Boolean(readSetting(settings, 'feature.comments')),
        date: new Date().toDateString()
    };
};

const extractCustomDefaults = (themeConfig: Record<string, unknown> | undefined) => {
    const custom = themeConfig?.custom as Record<string, {default?: unknown}> | undefined;
    if (!custom) {
        return {};
    }
    return Object.fromEntries(
        Object.entries(custom)
            .filter(([, value]) => Object.prototype.hasOwnProperty.call(value ?? {}, 'default'))
            .map(([key, value]) => [key, value?.default])
    );
};

const buildCustomContext = (
    settings: Awaited<ReturnType<SettingsService['listSettings']>>['settings'],
    themeConfig: Record<string, unknown> | undefined
) => {
    const defaults = extractCustomDefaults(themeConfig);
    return {
        site_background_color: '#ffffff',
        header_and_footer_color: 'Background color',
        navigation_layout: 'Logo in the middle',
        title_font: 'Modern sans-serif',
        body_font: 'Modern sans-serif',
        header_style: 'Landing',
        post_feed_style: 'List',
        show_publish_date: true,
        show_images_in_feed: true,
        show_author: true,
        show_related_articles: true,
        show_post_metadata: true,
        enable_drop_caps_on_posts: false,
        background_image: true,
        show_featured_posts: false,
        show_publication_info_sidebar: false,
        ...defaults,
        ...((readSetting(settings, 'theme.custom') as Record<string, unknown> | undefined) ?? {})
    };
};

const toExcerpt = (html: string, words = 30) => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) {
        return '';
    }
    return text.split(' ').slice(0, words).join(' ');
};

const isAccessAllowed = (visibility: string | undefined, member: {status?: string} | null) => {
    if (visibility === 'members') {
        return Boolean(member);
    }
    if (visibility === 'paid') {
        return member?.status === 'paid';
    }
    return true;
};

const mapPost = (
    post: {
        id: string;
        title: string;
        slug: string;
        visibility?: string;
        customExcerpt?: string | null | undefined;
        featureImage?: string | null | undefined;
        featureImageAlt?: string | null | undefined;
        featureImageCaption?: string | null | undefined;
    },
    html = '',
    member: {status?: string} | null = null
) => {
    const access = isAccessAllowed(post.visibility, member);
    const excerpt = access
        ? toExcerpt(html, 30)
        : (post.customExcerpt ?? '');
    return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        url: `/${post.slug}/`,
        html: access ? html : '',
        excerpt,
        featured: false,
        visibility: post.visibility ?? 'public',
        access,
        custom_excerpt: post.customExcerpt ?? null,
        feature_image: post.featureImage ?? null,
        feature_image_alt: post.featureImageAlt ?? null,
        feature_image_caption: post.featureImageCaption ?? null,
        published_at: null,
        created_at: null,
        updated_at: null,
        primary_tag: null,
        tags: [],
        authors: [],
        comments: null
    };
};

export const createFrontendRouter = ({
    config,
    contentService,
    settingsService
}: FrontendDependencies) => {
    const router = new Hono();
    const matcher = createRouteMatcher();
    const renderer = createRenderer();
    const themeStore = createThemeStore({config, settingsService});
    const publicRoot = path.resolve(process.cwd(), '..', 'ghost', 'core', 'content', 'public');
    const portalAsset = path.resolve(process.cwd(), '..', 'apps', 'portal', 'umd', 'portal.min.js');
    const sodoSearchAsset = path.resolve(process.cwd(), '..', 'apps', 'sodo-search', 'umd', 'sodo-search.min.js');
    const memberAttributionAsset = path.resolve(process.cwd(), '..', 'ghost', 'core', 'core', 'frontend', 'src', 'member-attribution', 'member-attribution.js');

    const readAsset = async (assetPath: string, contentType: string) => {
        try {
            const body = await fs.readFile(assetPath);
            return {body, contentType};
        } catch {
            return null;
        }
    };

    const getPublicAsset = async (assetPath: string) => {
        const fullPath = path.resolve(publicRoot, assetPath);
        try {
            const body = await fs.readFile(fullPath);
            const extension = path.extname(assetPath).toLowerCase();
            const contentType = extension === '.css'
                ? 'text/css; charset=utf-8'
                : extension === '.js'
                    ? 'application/javascript; charset=utf-8'
                    : extension === '.ico'
                        ? 'image/x-icon'
                        : 'application/octet-stream';
            return {body, contentType};
        } catch {
            return null;
        }
    };

    const serveAsset = async (context: Context, prefix: string) => {
        const assetPath = context.req.path.replace(prefix, '').replace(/^\//, '');
        if (!assetPath) {
            return context.text('Not Found', 404);
        }
        const asset = await themeStore.getAsset(assetPath);
        if (!asset) {
            return context.text('Not Found', 404);
        }
        return new Response(asset.body, {
            status: 200,
            headers: {
                'Content-Type': asset.contentType
            }
        });
    };

    router.get('/assets/*', (context) => serveAsset(context, '/assets/'));
    router.get('/content/themes/assets/*', (context) => serveAsset(context, '/content/themes/assets/'));
    router.get('/public/*', async (context) => {
        const assetPath = context.req.path.replace('/public/', '');
        if (!assetPath) {
            return context.text('Not Found', 404);
        }
        if (assetPath === 'member-attribution.min.js') {
            const asset = await readAsset(memberAttributionAsset, 'application/javascript; charset=utf-8');
            if (!asset) {
                return context.text('Not Found', 404);
            }
            return new Response(asset.body, {
                status: 200,
                headers: {
                    'Content-Type': asset.contentType
                }
            });
        }
        const asset = await getPublicAsset(assetPath);
        if (!asset) {
            return context.text('Not Found', 404);
        }
        return new Response(asset.body, {
            status: 200,
            headers: {
                'Content-Type': asset.contentType
            }
        });
    });

    router.get('*', async (context) => {
        if (context.req.path.startsWith('/assets/')) {
            return serveAsset(context, '/assets/');
        }
        if (context.req.path.startsWith('/content/themes/assets/')) {
            return serveAsset(context, '/content/themes/assets/');
        }
        if (context.req.path.startsWith('/ghost/assets/portal/')) {
            const asset = await readAsset(portalAsset, 'application/javascript; charset=utf-8');
            if (!asset) {
                return context.text('Not Found', 404);
            }
            return new Response(asset.body, {
                status: 200,
                headers: {
                    'Content-Type': asset.contentType
                }
            });
        }
        if (context.req.path.startsWith('/ghost/assets/sodo-search/')) {
            if (context.req.path.endsWith('main.css')) {
                return new Response('', {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/css; charset=utf-8'
                    }
                });
            }
            const asset = await readAsset(sodoSearchAsset, 'application/javascript; charset=utf-8');
            if (!asset) {
                return context.text('Not Found', 404);
            }
            return new Response(asset.body, {
                status: 200,
                headers: {
                    'Content-Type': asset.contentType
                }
            });
        }
        if (context.req.path.startsWith('/public/')) {
            const assetPath = context.req.path.replace('/public/', '');
            const asset = await getPublicAsset(assetPath);
            if (!asset) {
                return context.text('Not Found', 404);
            }
            return new Response(asset.body, {
                status: 200,
                headers: {
                    'Content-Type': asset.contentType
                }
            });
        }
        const route = matcher.matchRoute(context.req.path);
        if (!route) {
            return context.text('Not Found', 404);
        }

        const settingsResponse = await settingsService.listSettings();
        const bundle = await themeStore.getActiveBundle();
        const site = buildSiteContext(settingsResponse.settings, config);
        const custom = buildCustomContext(settingsResponse.settings, bundle.theme.config as Record<string, unknown> | undefined);

        if (route.type === 'collection') {
            const {posts, pagination} = await contentService.listPublishedPosts({
                page: route.page,
                limit: 10
            });
            const postHtml = await Promise.all(
                posts.map((post) => renderLexicalHtml(post.lexical))
            );
            const data = {
                site,
                custom,
                member: null,
                context: ['home', 'index'],
                posts: posts.map((post, index) => mapPost(post, postHtml[index] ?? '', null)),
                pagination,
                meta_title: site.title,
                meta_description: site.description,
                canonical_url: site.url
            };
            const html = renderer.render({template: 'index', data}, bundle);
            return context.html(html);
        }

        if (route.type === 'entry') {
            const postResponse = await contentService.getPostBySlug(route.slug);
            const postHtml = await renderLexicalHtml(postResponse.post.lexical);
            const data = {
                site,
                custom,
                member: null,
                context: ['post'],
                post: mapPost(postResponse.post, postHtml, null),
                meta_title: postResponse.post.title,
                meta_description: site.description,
                canonical_url: `${site.url}${postResponse.post.slug ? `/${postResponse.post.slug}/` : '/'}`
            };
            const html = renderer.render({template: 'post', data}, bundle);
            return context.html(html);
        }

        return context.text('Not Found', 404);
    });

    return router;
};
