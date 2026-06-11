import {Hono, type Context} from 'hono';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import type {AppConfig} from '../platform/config/config.js';
import type {FrontendContentReader, FrontendEntry} from '../modules/content/frontend-reader.js';
import type {AuthorProfileRecord, TagRecord} from '../modules/content/db.js';
import type {SettingsService} from '../modules/settings/service.js';
import {createRouteMatcher} from './routing/matcher.js';
import {createThemeStore} from './themes/store.js';
import {createRenderer} from './rendering/renderer.js';
import {renderLexicalHtml} from './rendering/lexical.js';
import type {ThemeBundle} from './themes/types.js';

type FrontendDependencies = {
    config: AppConfig;
    contentReader: FrontendContentReader;
    settingsService: SettingsService;
};

type SettingsList = Awaited<ReturnType<SettingsService['listSettings']>>['settings'];

const readSetting = (settings: SettingsList, key: string) => {
    return settings.find((setting) => setting.key === key)?.value;
};

// Unset images are stored as empty strings by imports; themes expect null.
const imageSetting = (settings: SettingsList, key: string) => {
    const value = readSetting(settings, key);
    return typeof value === 'string' && value !== '' ? value : null;
};

const toNavigation = (value: unknown): Array<{label: string; url: string}> => {
    if (Array.isArray(value)) {
        return value.filter((item): item is {label: string; url: string} => {
            return typeof item === 'object' && item !== null
                && typeof (item as {label?: unknown}).label === 'string'
                && typeof (item as {url?: unknown}).url === 'string';
        });
    }
    if (typeof value === 'string') {
        try {
            return toNavigation(JSON.parse(value));
        } catch {
            return [];
        }
    }
    return [];
};

const buildSiteContext = (settings: SettingsList, config: AppConfig) => {
    return {
        title: (readSetting(settings, 'site.title') as string | undefined) ?? 'Ghost',
        description: (readSetting(settings, 'site.description') as string | null | undefined) ?? null,
        locale: (readSetting(settings, 'site.locale') as string | undefined) ?? 'en',
        timezone: (readSetting(settings, 'site.timezone') as string | undefined) ?? 'Etc/UTC',
        url: `http://localhost:${config.port}`,
        cover_image: imageSetting(settings, 'site.cover_image'),
        logo: imageSetting(settings, 'site.logo'),
        icon: imageSetting(settings, 'site.icon'),
        accent_color: (readSetting(settings, 'site.accent_color') as string | null | undefined) ?? null,
        navigation: toNavigation(readSetting(settings, 'site.navigation')),
        secondary_navigation: toNavigation(readSetting(settings, 'site.secondary_navigation')),
        facebook: (readSetting(settings, 'site.facebook') as string | null | undefined) ?? null,
        twitter: (readSetting(settings, 'site.twitter') as string | null | undefined) ?? null,
        codeinjection_head: (readSetting(settings, 'site.codeinjection_head') as string | null | undefined) ?? null,
        codeinjection_foot: (readSetting(settings, 'site.codeinjection_foot') as string | null | undefined) ?? null,
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
    settings: SettingsList,
    themeConfig: Record<string, unknown> | undefined
) => {
    const defaults = extractCustomDefaults(themeConfig);
    return {
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

const toIso = (value: number | null) => {
    return value === null ? null : new Date(value).toISOString();
};

const mapTag = (tag: TagRecord) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description ?? null,
    feature_image: tag.featureImage ?? null,
    visibility: tag.visibility ?? 'public',
    url: `/tag/${tag.slug}/`
});

const mapAuthor = (author: AuthorProfileRecord) => ({
    id: author.id,
    name: author.name,
    slug: author.slug,
    bio: author.bio ?? null,
    profile_image: author.profileImage ?? null,
    cover_image: author.coverImage ?? null,
    website: author.website ?? null,
    location: author.location ?? null,
    url: `/author/${author.slug}/`
});

const mapEntry = async (entry: FrontendEntry, member: {status?: string} | null = null) => {
    const {post, tags, authors} = entry;
    let html = post.html ?? '';
    if (!html && post.lexical) {
        try {
            html = await renderLexicalHtml(JSON.parse(post.lexical) as Record<string, unknown>);
        } catch {
            html = '';
        }
    }
    const access = isAccessAllowed(post.visibility, member);
    const excerpt = access ? (post.customExcerpt ?? toExcerpt(html, 30)) : (post.customExcerpt ?? '');
    const mappedTags = tags.map(mapTag);
    const mappedAuthors = authors.map(mapAuthor);

    return {
        id: post.id,
        uuid: post.uuid ?? null,
        title: post.title,
        slug: post.slug,
        type: post.type,
        url: `/${post.slug}/`,
        html: access ? html : '',
        excerpt,
        featured: Boolean(post.featured),
        visibility: post.visibility ?? 'public',
        access,
        custom_excerpt: post.customExcerpt ?? null,
        feature_image: post.featureImage ?? null,
        feature_image_alt: post.featureImageAlt ?? null,
        feature_image_caption: post.featureImageCaption ?? null,
        codeinjection_head: post.codeinjectionHead ?? null,
        codeinjection_foot: post.codeinjectionFoot ?? null,
        canonical_url: post.canonicalUrl ?? null,
        published_at: toIso(post.publishedAt),
        created_at: toIso(post.createdAt),
        updated_at: toIso(post.updatedAt),
        primary_tag: mappedTags[0] ?? null,
        primary_author: mappedAuthors[0] ?? null,
        tags: mappedTags,
        authors: mappedAuthors,
        comments: null
    };
};

const pickTemplate = (bundle: ThemeBundle, candidates: string[]) => {
    for (const candidate of candidates) {
        if (candidate && bundle.templates[candidate]) {
            return candidate;
        }
    }
    throw new Error(`No template found among: ${candidates.join(', ')}`);
};

export const createFrontendRouter = ({
    config,
    contentReader,
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
    // Prefer the admin build vendored into phantom (yarn admin:sync); fall
    // back to ghost/core's build output for monorepo development.
    const adminRoots = [
        path.resolve(process.cwd(), 'content', 'admin'),
        path.resolve(process.cwd(), '..', 'ghost', 'core', 'core', 'built', 'admin')
    ];

    const adminContentType = (assetPath: string) => {
        const extension = path.extname(assetPath).toLowerCase();
        const types: Record<string, string> = {
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.mjs': 'application/javascript; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.ico': 'image/x-icon',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.mp4': 'video/mp4',
            '.map': 'application/json'
        };
        return types[extension] ?? 'application/octet-stream';
    };

    const readAsset = async (assetPath: string, contentType: string) => {
        try {
            const body = await fs.readFile(assetPath);
            return {body, contentType};
        } catch {
            return null;
        }
    };

    // Containment guard: request paths may carry `..` segments; anything that
    // resolves outside the root is rejected.
    const resolveWithin = (root: string, relativePath: string) => {
        const resolved = path.resolve(root, relativePath);
        return resolved.startsWith(root + path.sep) ? resolved : null;
    };

    const getPublicAsset = async (assetPath: string) => {
        const fullPath = resolveWithin(publicRoot, assetPath);
        if (!fullPath) {
            return null;
        }
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

        // Unimplemented API paths must fail as JSON, not fall through to the
        // admin HTML: API clients treat an HTML 200 as a parse error.
        if (context.req.path.startsWith('/ghost/api/')) {
            return context.json({errors: [{message: 'Resource not found', type: 'NotFoundError'}]}, 404);
        }

        // The unmodified Ember admin build is served under /ghost/ (decision
        // #16). Embedded React apps (stats, posts, admin-x-settings, ...) are
        // resolved from apps/<name>/dist when the admin build doesn't bundle
        // them — the same files asset-delivery would copy.
        if (context.req.path.startsWith('/ghost/assets/')) {
            const assetPath = context.req.path.replace('/ghost/assets/', '');
            const contentType = adminContentType(assetPath);
            let asset = null;
            for (const adminRoot of adminRoots) {
                const contained = resolveWithin(path.resolve(adminRoot, 'assets'), assetPath);
                asset = contained ? await readAsset(contained, contentType) : null;
                if (asset) {
                    break;
                }
            }
            if (!asset) {
                const [appName, ...rest] = assetPath.split('/');
                if (appName && rest.length > 0 && /^[a-z0-9-]+$/.test(appName)) {
                    const appDist = path.resolve(process.cwd(), '..', 'apps', appName, 'dist');
                    const contained = resolveWithin(appDist, rest.join('/'));
                    asset = contained ? await readAsset(contained, contentType) : null;
                }
            }
            if (!asset) {
                return context.text('Not Found', 404);
            }
            return new Response(asset.body, {status: 200, headers: {'Content-Type': asset.contentType}});
        }
        // The shell's asset URLs are relative ("./assets/..."), so it only
        // boots at /ghost/ — at bare /ghost they resolve to /assets/ and 404.
        // Mirror Ghost core and bounce to the canonical trailing-slash URL
        // (the fragment survives redirects client-side).
        if (context.req.path === '/ghost') {
            return context.redirect('/ghost/', 302);
        }
        // Deep links like /ghost/members/import are server-side URLs only on
        // first navigation; the admin router lives behind the hash. Mirror
        // Ghost core: 302 to /ghost/#/<path> (no trailing slash) and only
        // serve the shell HTML at /ghost/ itself.
        if (context.req.path.startsWith('/ghost/') && context.req.path !== '/ghost/') {
            const hashPath = context.req.path.slice('/ghost/'.length).replace(/\/+$/, '');
            return context.redirect(`/ghost/#/${hashPath}`, 302);
        }
        if (context.req.path === '/ghost/') {
            for (const adminRoot of adminRoots) {
                const asset = await readAsset(path.resolve(adminRoot, 'index.html'), 'text/html; charset=utf-8');
                if (asset) {
                    return new Response(asset.body, {status: 200, headers: {'Content-Type': asset.contentType}});
                }
            }
            return context.text('Admin build not found', 404);
        }

        const route = matcher.matchRoute(context.req.path);
        if (!route) {
            return context.text('Not Found', 404);
        }

        const settingsResponse = await settingsService.listSettings();
        const bundle = await themeStore.getActiveBundle();
        const site = buildSiteContext(settingsResponse.settings, config);
        const custom = buildCustomContext(settingsResponse.settings, bundle.theme.config as Record<string, unknown> | undefined);
        const base = {site, custom, member: null};

        if (route.type === 'collection' || route.type === 'tag' || route.type === 'author') {
            const filter = route.type === 'tag'
                ? {type: 'post' as const, tagSlug: route.slug}
                : route.type === 'author'
                    ? {type: 'post' as const, authorSlug: route.slug}
                    : {type: 'post' as const};

            let archive: Record<string, unknown> = {};
            let templateCandidates: string[];
            let contextNames: string[];
            let metaTitle = site.title;

            if (route.type === 'tag') {
                const tag = await contentReader.getTagBySlug(route.slug);
                if (!tag) {
                    return context.text('Not Found', 404);
                }
                archive = {tag: mapTag(tag)};
                templateCandidates = [`tag-${tag.slug}`, 'tag', 'index'];
                contextNames = ['tag'];
                metaTitle = `${tag.name} - ${site.title}`;
            } else if (route.type === 'author') {
                const author = await contentReader.getAuthorBySlug(route.slug);
                if (!author) {
                    return context.text('Not Found', 404);
                }
                archive = {author: mapAuthor(author)};
                templateCandidates = [`author-${author.slug}`, 'author', 'index'];
                contextNames = ['author'];
                metaTitle = `${author.name} - ${site.title}`;
            } else {
                templateCandidates = route.page === 1 ? ['home', 'index'] : ['index'];
                contextNames = route.page === 1 ? ['home', 'index'] : ['index', 'paged'];
            }

            const {entries, pagination} = await contentReader.listPublished({
                page: route.page,
                limit: 10,
                filter
            });
            if (route.page > 1 && entries.length === 0) {
                return context.text('Not Found', 404);
            }
            const posts = await Promise.all(entries.map((entry) => mapEntry(entry, null)));
            const data = {
                ...base,
                ...archive,
                context: contextNames,
                posts,
                pagination,
                meta_title: metaTitle,
                meta_description: site.description,
                canonical_url: `${site.url}${context.req.path === '/' ? '/' : context.req.path}`
            };
            const html = renderer.render({template: pickTemplate(bundle, templateCandidates), data}, bundle);
            return context.html(html);
        }

        const entry = await contentReader.getEntryBySlug(route.slug);
        if (!entry) {
            return context.text('Not Found', 404);
        }
        const post = await mapEntry(entry, null);
        const isPage = entry.post.type === 'page';
        const templateCandidates = [
            entry.post.customTemplate ?? '',
            ...(isPage ? [`page-${entry.post.slug}`, 'page', 'post'] : ['post'])
        ];
        const data = {
            ...base,
            context: [isPage ? 'page' : 'post'],
            post,
            page: isPage ? post : undefined,
            meta_title: entry.post.title,
            meta_description: site.description,
            canonical_url: `${site.url}/${entry.post.slug}/`
        };
        const html = renderer.render({template: pickTemplate(bundle, templateCandidates), data}, bundle);
        return context.html(html);
    });

    return router;
};
