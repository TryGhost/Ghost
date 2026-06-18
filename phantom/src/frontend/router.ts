import {Hono, type Context} from 'hono';
import {getCookie, setCookie, deleteCookie} from 'hono/cookie';
import {createHash} from 'node:crypto';
import type {AppConfig} from '../platform/config/config.js';
import type {FileStore} from '../platform/files/store.js';
import type {ThemeBundleProvider} from './themes/bundles.js';
import type {FrontendContentReader, FrontendEntry} from '../modules/content/frontend-reader.js';
import type {AuthorProfileRecord, TagRecord} from '../modules/content/db.js';
import type {SettingsService} from '../modules/settings/service.js';
import type {MemberAuthService} from '../modules/members/service.js';
import {createRouteMatcher} from './routing/matcher.js';
import {createThemeStore} from './themes/store.js';
import {createRenderer} from './rendering/renderer.js';
import {renderLexicalHtml} from './rendering/lexical.js';
import type {ThemeBundle} from './themes/types.js';

type FrontendDependencies = {
    config: AppConfig;
    contentReader: FrontendContentReader;
    settingsService: SettingsService;
    memberAuthService?: MemberAuthService;
    fileStore: FileStore;
    themeBundles: ThemeBundleProvider;
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
        url: config.siteUrl,
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
        announcement_content: (readSetting(settings, 'announcement.content') as string | null | undefined) ?? null,
        announcement_visibility: (readSetting(settings, 'announcement.visibility') as string[] | undefined) ?? [],
        announcement_background: (readSetting(settings, 'announcement.background') as string | undefined) ?? 'dark',
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
        // posts_meta default: themes hide titles when this is false.
        show_title_and_feature_image: true,
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
    settingsService,
    memberAuthService,
    fileStore,
    themeBundles
}: FrontendDependencies) => {
    const router = new Hono();
    const matcher = createRouteMatcher();
    const renderer = createRenderer();
    const themeStore = createThemeStore({config, settingsService, bundles: themeBundles, fileStore});

    // The attribution script in ghost/core is unbundled source (require +
    // ES-module dep); compose a browser-runnable bundle once.
    let memberAttributionBundle: string | null = null;
    const getMemberAttributionBundle = async () => {
        if (memberAttributionBundle) {
            return memberAttributionBundle;
        }
        const [dep, script] = await Promise.all([
            fileStore.readText('attribution/url-attribution.js'),
            fileStore.readText('attribution/member-attribution.js')
        ]);
        if (!dep || !script) {
            throw new Error('Member attribution sources not found');
        }
        const depInline = dep.replaceAll('export function', 'function');
        const scriptInline = script
            .replace("const urlAttribution = require('../utils/url-attribution');", '')
            .replace('const parseReferrerData = urlAttribution.parseReferrerData;', '')
            .replace('const getReferrer = urlAttribution.getReferrer;', '');
        memberAttributionBundle = `(function () {\n${depInline}\n${scriptInline}\n})();`;
        return memberAttributionBundle;
    };

    const extensionOf = (assetPath: string) => {
        const dotIndex = assetPath.lastIndexOf('.');
        return dotIndex === -1 ? '' : assetPath.slice(dotIndex).toLowerCase();
    };

    const adminContentType = (assetPath: string) => {
        const extension = extensionOf(assetPath);
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

    // Traversal containment lives in the file store: keys with `..` segments
    // are rejected before any lookup happens.
    const readAsset = async (key: string, contentType: string) => {
        const body = await fileStore.read(key);
        return body ? {body, contentType} : null;
    };

    const getPublicAsset = async (assetPath: string) => {
        const body = await fileStore.read(`public/${assetPath}`);
        if (!body) {
            return null;
        }
        const extension = extensionOf(assetPath);
        const contentType = extension === '.css'
            ? 'text/css; charset=utf-8'
            : extension === '.js'
                ? 'application/javascript; charset=utf-8'
                : extension === '.ico'
                    ? 'image/x-icon'
                    : 'application/octet-stream';
        return {body, contentType};
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
            const bundle = await getMemberAttributionBundle().catch(() => null);
            if (!bundle) {
                return context.text('Not Found', 404);
            }
            return new Response(bundle, {
                status: 200,
                headers: {
                    'Content-Type': 'application/javascript; charset=utf-8'
                }
            });
        }
        if (assetPath === 'announcement-bar.min.js') {
            const asset = await readAsset('announcement-bar/announcement-bar.min.js', 'application/javascript; charset=utf-8');
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

    // --- Private mode (site access control) ---
    // The access-code cookie is a hash of the site password, so flipping the
    // password (or disabling private mode) invalidates existing sessions.
    const PRIVATE_COOKIE = 'phantom-private';
    const privateHash = (password: string) => createHash('sha256').update(`phantom-private:${password}`).digest('hex');

    const readPrivateState = async () => {
        const {settings} = await settingsService.listSettings();
        const isPrivate = Boolean(readSetting(settings, 'site.is_private'));
        const password = (readSetting(settings, 'site.password') as string | undefined) ?? '';
        return {settings, isPrivate, password};
    };

    const hasPrivateAccess = (context: Context, password: string) => {
        return getCookie(context, PRIVATE_COOKIE) === privateHash(password);
    };

    // Trimmed port of ghost/core's private-blogging view: same structure,
    // headings and labels so the upstream e2e selectors hold.
    const renderPrivatePage = (site: {title: string; description: string | null; url: string}, options: {selfSignup: boolean; error?: string; returnTo: string}) => {
        const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
        const action = `/private/?r=${encodeURIComponent(options.returnTo)}`;
        const accessForm = `
            <form class="gh-signin gh-private-signin gh-private-access-form" method="post" action="${action}" novalidate="novalidate">
                <div class="gh-private-signup-fields">
                    <div class="form-group gh-private-access-input-wrap${options.error ? ' error' : ''}">
                        <input class="gh-input gh-private-signup-input" type="password" name="password" placeholder="Access code" data-1p-ignore="true">
                        ${options.error ? `<p class="main-error">${escape(options.error)}</p>` : ''}
                    </div>
                    <button class="gh-btn gh-private-signup-btn" type="submit"><span>Enter &rarr;</span></button>
                </div>
            </form>`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${escape(site.title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div class="gh-app">
        <main class="gh-main" role="main">
            <section class="gh-flow-content private">
                <header>
                    <h1>${escape(site.title)}</h1>
                    ${site.description ? `<p class="gh-private-description">${escape(site.description)}</p>` : ''}
                </header>
                ${options.selfSignup ? '' : accessForm}
            </section>
            ${options.selfSignup ? `
            <dialog class="gh-private-dialog" id="access" aria-labelledby="private-access-title"${options.error ? ' data-auto-open="true"' : ''}>
                <div class="gh-private-dialog-panel">
                    <header class="gh-private-dialog-header">
                        <h2 id="private-access-title">Enter access code</h2>
                    </header>
                    ${accessForm}
                </div>
            </dialog>` : ''}
            <div class="gh-private-trigger-wrap">
                <div class="gh-private-footer-links">
                    ${options.selfSignup ? '<a class="gh-private-trigger" href="#access" data-ghost-private-trigger>Enter access code</a>' : ''}
                    <a href="${escape(site.url)}/ghost/">Site owner login</a>
                </div>
            </div>
        </main>
    </div>
    <script>
        document.querySelectorAll('[data-ghost-private-trigger]').forEach(function (trigger) {
            trigger.addEventListener('click', function (event) {
                event.preventDefault();
                document.getElementById('access').showModal();
            });
        });
        var dialog = document.querySelector('dialog[data-auto-open="true"]');
        if (dialog) {
            dialog.showModal();
        }
    </script>
</body>
</html>`;
    };

    const privateReturnTo = (context: Context) => {
        const raw = context.req.query('r') ?? '/';
        return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
    };

    const privatePageHandler = async (context: Context) => {
        const {settings, isPrivate, password} = await readPrivateState();
        if (!isPrivate) {
            return context.redirect('/', 302);
        }
        if (hasPrivateAccess(context, password)) {
            return context.redirect(privateReturnTo(context), 302);
        }
        const site = buildSiteContext(settings, config);
        const selfSignup = ((readSetting(settings, 'members.signup_access') as string | undefined) ?? 'all') === 'all';
        return context.html(renderPrivatePage(site, {selfSignup, returnTo: privateReturnTo(context)}));
    };
    router.get('/private/', privatePageHandler);
    router.get('/private', privatePageHandler);

    const privateSubmitHandler = async (context: Context) => {
        const {settings, isPrivate, password} = await readPrivateState();
        if (!isPrivate) {
            return context.redirect('/', 302);
        }
        const form = await context.req.parseBody();
        const submitted = typeof form.password === 'string' ? form.password : '';
        if (password && submitted === password) {
            setCookie(context, PRIVATE_COOKIE, privateHash(password), {path: '/', httpOnly: true, sameSite: 'Lax'});
            return context.redirect(privateReturnTo(context), 302);
        }
        deleteCookie(context, PRIVATE_COOKIE, {path: '/'});
        const site = buildSiteContext(settings, config);
        const selfSignup = ((readSetting(settings, 'members.signup_access') as string | undefined) ?? 'all') === 'all';
        return context.html(renderPrivatePage(site, {selfSignup, error: 'Wrong access code, please try again', returnTo: privateReturnTo(context)}), 401);
    };
    router.post('/private/', privateSubmitHandler);
    router.post('/private', privateSubmitHandler);

    // Magic-link landing: /members/?token=... verifies the token, starts a
    // member session and bounces to the site root (mirroring Ghost).
    const MEMBER_SESSION_COOKIE = 'phantom-members-session';
    const memberLandingHandler = async (context: Context) => {
        const token = context.req.query('token');
        if (!token || !memberAuthService) {
            return context.redirect('/', 302);
        }
        try {
            const {session} = await memberAuthService.verifyMagicLink({token});
            setCookie(context, MEMBER_SESSION_COOKIE, session.id, {
                path: '/',
                httpOnly: true,
                sameSite: 'Lax',
                expires: new Date(session.expiresAt)
            });
        } catch {
            // Expired or reused links still land on the site, just signed out.
        }
        return context.redirect('/', 302);
    };
    router.get('/members/', memberLandingHandler);
    router.get('/members', memberLandingHandler);

    // POST is accepted alongside GET: the settings apps preview unsaved
    // changes by POSTing site URLs with an x-ghost-preview header.
    router.on(['GET', 'POST'], '*', async (context) => {
        if (context.req.path.startsWith('/assets/')) {
            return serveAsset(context, '/assets/');
        }
        if (context.req.path.startsWith('/content/themes/assets/')) {
            return serveAsset(context, '/content/themes/assets/');
        }
        if (context.req.path.startsWith('/ghost/assets/portal/')) {
            const asset = await readAsset('portal/portal.min.js', 'application/javascript; charset=utf-8');
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
            const asset = await readAsset('sodo-search/sodo-search.min.js', 'application/javascript; charset=utf-8');
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
            let asset = await readAsset(`admin/assets/${assetPath}`, contentType);
            if (!asset) {
                const [appName, ...rest] = assetPath.split('/');
                if (appName && rest.length > 0 && /^[a-z0-9-]+$/.test(appName)) {
                    asset = await readAsset(`apps/${appName}/${rest.join('/')}`, contentType);
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
            const asset = await readAsset('admin/index.html', 'text/html; charset=utf-8');
            if (asset) {
                return new Response(asset.body, {status: 200, headers: {'Content-Type': asset.contentType}});
            }
            return context.text('Admin build not found', 404);
        }

        // Draft/scheduled previews: /p/<uuid> renders the entry regardless of
        // status — the editor's preview modal iframes this same-origin.
        const previewUuid = /^\/p\/([0-9a-zA-Z-]+)\/?$/.exec(context.req.path)?.[1] ?? null;

        const route = matcher.matchRoute(context.req.path);
        if (!route && !previewUuid) {
            return context.text('Not Found', 404);
        }

        const settingsResponse = await settingsService.listSettings();

        // Private sites funnel everything public through /private/ until the
        // access-code cookie matches the current password.
        if (readSetting(settingsResponse.settings, 'site.is_private')) {
            const password = (readSetting(settingsResponse.settings, 'site.password') as string | undefined) ?? '';
            if (!hasPrivateAccess(context, password)) {
                return context.redirect(`/private/?r=${encodeURIComponent(context.req.path)}`, 302);
            }
        }

        const bundle = await themeStore.getActiveBundle();
        const previewHeader = context.req.method === 'POST' ? context.req.header('x-ghost-preview') : undefined;
        const site = {
            ...buildSiteContext(settingsResponse.settings, config),
            ...(previewHeader ? {_preview: previewHeader} : {})
        };
        const custom = buildCustomContext(settingsResponse.settings, bundle.theme.config as Record<string, unknown> | undefined);

        // Signed-in members render with @member (themes gate Account links
        // and gated content on it).
        let member: Record<string, unknown> | null = null;
        const memberSessionId = getCookie(context, MEMBER_SESSION_COOKIE);
        if (memberSessionId && memberAuthService) {
            try {
                const verified = await memberAuthService.verifySession({sessionId: memberSessionId});
                member = {
                    uuid: verified.member.id,
                    email: verified.member.email,
                    name: null,
                    firstname: null,
                    paid: verified.member.status === 'paid',
                    subscriptions: []
                };
            } catch {
                member = null;
            }
        }
        const base = {site, custom, member};

        const renderEntryResponse = async (entry: NonNullable<Awaited<ReturnType<typeof contentReader.getEntryBySlug>>>) => {
            const post = await mapEntry(entry, null);
            const isPage = entry.post.type === 'page';
            const templateCandidates = [
                entry.post.customTemplate ?? '',
                ...(isPage ? [`page-${entry.post.slug}`, 'page', 'post'] : ['post'])
            ];
            // Themes use {{#get "posts"}} for read-more sections; rendering is
            // synchronous, so recent published posts are fetched up front.
            const recent = await contentReader.listPublished({page: 1, limit: 20, filter: {type: 'post'}});
            const recentPosts = await Promise.all(recent.entries.map((other) => mapEntry(other, null)));
            const data = {
                ...base,
                context: [isPage ? 'page' : 'post'],
                post,
                page: isPage ? post : undefined,
                posts: recentPosts,
                meta_title: entry.post.title,
                meta_description: entry.post.customExcerpt || site.description,
                canonical_url: `${site.url}/${entry.post.slug}/`
            };
            const html = renderer.render({template: pickTemplate(bundle, templateCandidates), data}, bundle);
            return context.html(html);
        };

        if (previewUuid) {
            const entry = await contentReader.getEntryByUuid(previewUuid);
            if (!entry) {
                return context.text('Not Found', 404);
            }
            return renderEntryResponse(entry);
        }
        if (!route) {
            return context.text('Not Found', 404);
        }

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
        return renderEntryResponse(entry);
    });

    return router;
};
