/* eslint-disable @typescript-eslint/no-explicit-any */
// createRenderer end to end over a mini theme + mocked Content API fetch:
// settings load, route resolution, controller fall-through, template
// hierarchy, layouts, helpers (incl. async ghost_head) and Response mapping.
import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'vitest';
import {createRenderer} from '../src/index.ts';
import {teardownTestDeps, DEFAULT_SETTINGS_PAYLOAD, SITE_URL} from './utils/renderer-test-utils.ts';

const THEME = {
    'package.json': JSON.stringify({
        name: 'mini',
        config: {
            posts_per_page: 2,
            card_assets: false,
            custom: {
                color_scheme: {type: 'select', options: ['Light', 'Dark'], default: 'Light'}
            }
        }
    }),
    'default.hbs': '<html><head><title>{{meta_title}}</title>{{{ghost_head}}}</head><body class="{{body_class}}" data-scheme="{{@custom.color_scheme}}">{{{body}}}</body></html>',
    'index.hbs': '{{!< default}}<main>{{#foreach posts}}{{> "card"}}{{/foreach}}</main>{{pagination}}',
    'home.hbs': '{{!< default}}<main class="home">{{#foreach posts}}{{> "card"}}{{/foreach}}</main>',
    'post.hbs': '{{!< default}}{{#post}}<article class="{{post_class}}"><h1>{{title}}</h1>{{content}}</article>{{/post}}',
    'page.hbs': '{{!< default}}{{#post}}<section class="static-page"><h1>{{title}}</h1>{{content}}</section>{{/post}}',
    'partials/card.hbs': '<article class="card"><a href="{{url}}">{{title}}</a></article>',
    // theme partial overriding the core "pagination" helper partial
    'partials/pagination.hbs': '<nav class="theme-pagination">{{page}}/{{pages}}</nav>'
};

const POSTS = [
    {
        id: 'p1',
        uuid: 'aaaaaaaa-0000-0000-0000-000000000001',
        title: 'Welcome',
        slug: 'welcome',
        html: '<p>hello</p>',
        excerpt: 'hello',
        url: `${SITE_URL}welcome/`,
        visibility: 'public',
        published_at: '2024-01-10T00:00:00.000Z',
        updated_at: '2024-01-11T00:00:00.000Z',
        authors: [{name: 'Cameron', slug: 'cameron', url: `${SITE_URL}author/cameron/`}],
        primary_author: {name: 'Cameron', slug: 'cameron', url: `${SITE_URL}author/cameron/`},
        tags: []
    },
    {
        id: 'p2',
        uuid: 'aaaaaaaa-0000-0000-0000-000000000002',
        title: 'Second',
        slug: 'second',
        html: '<p>two</p>',
        excerpt: 'two',
        url: `${SITE_URL}second/`,
        visibility: 'public',
        published_at: '2024-01-09T00:00:00.000Z',
        updated_at: '2024-01-09T00:00:00.000Z',
        authors: [],
        tags: []
    }
];

const PAGE = {
    id: 'g1',
    uuid: 'bbbbbbbb-0000-0000-0000-000000000001',
    title: 'About us',
    slug: 'about',
    html: '<p>about</p>',
    url: `${SITE_URL}about/`,
    visibility: 'public',
    published_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    authors: [],
    tags: [],
    show_title_and_feature_image: true
};

function json(body: any, status = 200): Response {
    return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});
}

function notFound(): Response {
    return json({errors: [{message: 'Resource not found error, cannot read post.', type: 'NotFoundError'}]}, 404);
}

/** Mock of the dev instance's Content API. Records requested URLs. */
function createMockApi() {
    const requests: URL[] = [];
    const fetchImpl: typeof globalThis.fetch = async (input: any) => {
        const url = new URL(typeof input === 'string' ? input : input.url);
        requests.push(url);
        const path = url.pathname;

        if (path === '/ghost/api/content/settings/') {
            return json({settings: {...DEFAULT_SETTINGS_PAYLOAD}});
        }
        if (path === '/ghost/api/content/posts/') {
            const page = parseInt((url.searchParams.get('page') ?? '1'), 10);
            const limit = parseInt((url.searchParams.get('limit') ?? '15'), 10);
            const start = (page - 1) * limit;
            const posts = POSTS.slice(start, start + limit);
            return json({
                posts,
                meta: {pagination: {page, limit, pages: Math.ceil(POSTS.length / limit), total: POSTS.length, next: null, prev: null}}
            });
        }
        const postBySlug = path.match(/^\/ghost\/api\/content\/posts\/slug\/([^/]+)\/$/);
        if (postBySlug) {
            const post = POSTS.find(p => p.slug === postBySlug[1]);
            return post ? json({posts: [structuredClone(post)]}) : notFound();
        }
        const pageBySlug = path.match(/^\/ghost\/api\/content\/pages\/slug\/([^/]+)\/$/);
        if (pageBySlug) {
            return pageBySlug[1] === PAGE.slug ? json({pages: [structuredClone(PAGE)]}) : notFound();
        }
        return notFound();
    };
    return {requests, fetchImpl};
}

async function createTestRenderer(theme: Record<string, string> = THEME) {
    const mock = createMockApi();
    const renderer = await createRenderer({
        siteUrl: SITE_URL,
        contentApiKey: 'testkey',
        theme,
        fetch: mock.fetchImpl
    });
    return {renderer, ...mock};
}

afterEach(function () {
    teardownTestDeps();
});

describe('createRenderer', function () {
    it('renders the home route with the front page template, theme partials and resolved ghost_head', async function () {
        const {renderer, requests} = await createTestRenderer();
        const response = await renderer.render(new Request(SITE_URL));

        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type')!, /text\/html/);

        const html = await response.text();
        // front page template (home.hbs) via the template hierarchy
        assert.match(html, /<main class="home">/);
        // theme partial for the cards
        assert.match(html, /<article class="card"><a href="\/welcome\/">Welcome<\/a><\/article>/);
        // async ghost_head resolved through the placeholder machinery
        assert.doesNotMatch(html, /__aSyNcId__/);
        assert.match(html, /<meta name="generator" content="Ghost 6.0">/);
        assert.match(html, new RegExp(`<link rel="canonical" href="${SITE_URL}">`));
        // body_class from the home context
        assert.match(html, /<body class="home-template/);
        // @custom frame from the theme defaults
        assert.match(html, /data-scheme="Light"/);
        // theme posts_per_page reached the browse call
        const browse = requests.find(u => u.pathname === '/ghost/api/content/posts/')!;
        assert.equal(browse.searchParams.get('limit'), '2');
        assert.equal(browse.searchParams.get('include'), 'authors,tags,tiers');
    });

    it('uses index.hbs (not home.hbs) for paged collection requests and 404s past the last page', async function () {
        const {renderer} = await createTestRenderer();

        // a third post so page 2 exists (posts_per_page is 2)
        POSTS.push({...POSTS[1]!, id: 'p3', uuid: 'aaaaaaaa-0000-0000-0000-000000000003', slug: 'third', title: 'Third', url: `${SITE_URL}third/`});
        try {
            const paged = await renderer.render(new Request(`${SITE_URL}page/2/`));
            assert.equal(paged.status, 200);
            // NOTE: frontPageTemplate applies only to path '/' — paged requests use index
            const pagedHtml = await paged.text();
            assert.match(pagedHtml, /<main>/);
            assert.doesNotMatch(pagedHtml, /<main class="home">/);
            // theme pagination partial overrides the core helper partial
            assert.match(pagedHtml, /<nav class="theme-pagination">2\/2<\/nav>/);
        } finally {
            POSTS.pop();
        }

        const outOfRange = await renderer.render(new Request(`${SITE_URL}page/99/`));
        assert.equal(outOfRange.status, 404);
    });

    // finding 7 — origin page-param middleware semantics
    // (frontend/services/routing/middleware/page-param.js)
    describe('page param', function () {
        it('301s /page/1/ to the unpaged url', async function () {
            const {renderer} = await createTestRenderer();
            const response = await renderer.render(new Request(`${SITE_URL}page/1/?q=x`));
            assert.equal(response.status, 301);
            assert.equal(response.headers.get('location'), '/?q=x');
            assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000');
        });

        it('404s /page/0/ locally without calling the posts API', async function () {
            const {renderer, requests} = await createTestRenderer();
            const response = await renderer.render(new Request(`${SITE_URL}page/0/`));
            assert.equal(response.status, 404);
            const postRequests = requests.filter(u => u.pathname.startsWith('/ghost/api/content/posts'));
            assert.equal(postRequests.length, 0);
        });

        it('404s /tag/:slug/page/0/ locally without calling the API (taxonomy pagination)', async function () {
            const {renderer, requests} = await createTestRenderer();
            const response = await renderer.render(new Request(`${SITE_URL}tag/news/page/0/`));
            assert.equal(response.status, 404);
            // settings load happens at createRenderer; the render itself must
            // produce zero content requests (no posts browse, no tag read)
            const contentRequests = requests.filter(u => u.pathname.startsWith('/ghost/api/content/') && !u.pathname.startsWith('/ghost/api/content/settings/'));
            assert.equal(contentRequests.length, 0);
        });
    });

    it('renders a post route with the post template and @page defaults', async function () {
        const {renderer} = await createTestRenderer();
        const response = await renderer.render(new Request(`${SITE_URL}welcome/`));

        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /<body class="post-template/);
        assert.match(html, /<article class="post no-image">/);
        assert.match(html, /<h1>Welcome<\/h1>/);
        assert.match(html, /<p>hello<\/p>/);
        assert.match(html, new RegExp(`<link rel="canonical" href="${SITE_URL}welcome/">`));
        assert.match(html, /<meta property="og:type" content="article">/);
    });

    it('renders the tier-gated CTA (tiers helper) without throwing', async function () {
        // finding 2 — tier-gated posts carry a tiers array; the content-cta
        // partial calls the `tiers` helper (unregistered → TypeError)
        const gated = {
            ...POSTS[0]!,
            id: 'p9',
            uuid: 'aaaaaaaa-0000-0000-0000-000000000009',
            slug: 'gated',
            url: `${SITE_URL}gated/`,
            html: '',
            access: false,
            visibility: 'tiers',
            tiers: [{name: 'Gold'}, {name: 'Silver'}]
        };
        POSTS.push(gated as any);
        try {
            const {renderer} = await createTestRenderer();
            const response = await renderer.render(new Request(`${SITE_URL}gated/`));
            assert.equal(response.status, 200);
            const html = await response.text();
            assert.match(html, /gh-post-upgrade-cta/);
            assert.match(html, /Gold and Silver/);
        } finally {
            POSTS.pop();
        }
    });

    it('falls through to the static page lookup when the post read 404s', async function () {
        const {renderer, requests} = await createTestRenderer();
        const response = await renderer.render(new Request(`${SITE_URL}about/`));

        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /<section class="static-page"><h1>About us<\/h1>/);
        // posts read attempted first (mount order Collections → StaticPages)
        const paths = requests.map(u => u.pathname);
        assert.ok(paths.indexOf('/ghost/api/content/posts/slug/about/') < paths.indexOf('/ghost/api/content/pages/slug/about/'));
    });

    it('404s unknown slugs after exhausting the candidates', async function () {
        const {renderer} = await createTestRenderer();
        const response = await renderer.render(new Request(`${SITE_URL}missing/`));
        assert.equal(response.status, 404);
    });

    // finding 4 — subdirectory installs: segment-boundary stripping and
    // subdir-prefixed redirect targets (Express mount semantics)
    describe('subdirectory handling', function () {
        const SUBDIR_SITE_URL = 'http://localhost:2368/blog/';

        async function createSubdirRenderer() {
            const mock = createMockApi();
            // the Content API binding builds /blog/ghost/api/... URLs — strip
            // the subdir before delegating to the plain mock
            const fetchImpl: typeof globalThis.fetch = (input: any, init?: any) => {
                const url = new URL(typeof input === 'string' ? input : input.url);
                url.pathname = url.pathname.replace(/^\/blog/, '');
                return mock.fetchImpl(url.toString(), init);
            };
            const renderer = await createRenderer({
                siteUrl: SUBDIR_SITE_URL,
                contentApiKey: 'testkey',
                theme: THEME,
                fetch: fetchImpl,
                settingsPayload: {...DEFAULT_SETTINGS_PAYLOAD, url: SUBDIR_SITE_URL}
            });
            return {renderer, requests: mock.requests};
        }

        it('renders routes under the subdirectory', async function () {
            const {renderer} = await createSubdirRenderer();
            const response = await renderer.render(new Request(`${SUBDIR_SITE_URL}`));
            assert.equal(response.status, 200);
            assert.match(await response.text(), /<main class="home">/);
        });

        it('301s a missing trailing slash to the subdir-prefixed location', async function () {
            const {renderer} = await createSubdirRenderer();
            const response = await renderer.render(new Request('http://localhost:2368/blog/welcome'));
            assert.equal(response.status, 301);
            assert.equal(response.headers.get('location'), '/blog/welcome/');
        });

        it('404s paths that only share the subdir prefix (no mangled strip)', async function () {
            const {renderer} = await createSubdirRenderer();
            const response = await renderer.render(new Request('http://localhost:2368/blogging/'));
            assert.equal(response.status, 404);
        });

        it('never mangles a prefix-sharing path into a broken redirect', async function () {
            const {renderer} = await createSubdirRenderer();
            const response = await renderer.render(new Request('http://localhost:2368/blogging'));
            // outside the mount: 404 (Express mount semantics) — and above
            // all NEVER a Location like "ging/"
            assert.equal(response.status, 404);
            assert.equal(response.headers.get('location'), null);
        });

        it('301s /page/1/ to the subdir-prefixed unpaged url', async function () {
            // finding 7 × finding 4 — the page-1 redirect must re-include the subdir
            const {renderer} = await createSubdirRenderer();
            const response = await renderer.render(new Request('http://localhost:2368/blog/page/1/'));
            assert.equal(response.status, 301);
            assert.equal(response.headers.get('location'), '/blog/');
        });

        it('handles a request to the bare subdir path as the site root', async function () {
            const {renderer} = await createSubdirRenderer();
            const response = await renderer.render(new Request('http://localhost:2368/blog'));
            // Express mount semantics: GET /blog reaches the mounted app with
            // req.url === '/' — served as the front page, no redirect
            assert.equal(response.status, 200);
            assert.match(await response.text(), /<main class="home">/);
        });
    });

    // finding 1 — engine.render throws and resolver ValidationErrors must
    // become error Responses, never rejected render() promises
    describe('render-time failures', function () {
        it('maps a render-time template failure to a 500 Response without leaking the error message', async function () {
            const {renderer} = await createTestRenderer({
                ...THEME,
                // references a partial that does not exist → generic Error at render time
                'post.hbs': '{{!< default}}{{> not-a-real-partial}}'
            });
            const response = await renderer.render(new Request(`${SITE_URL}welcome/`));

            assert.equal(response.status, 500);
            const body = await response.text();
            assert.equal(body, '500 Internal Server Error');
            assert.doesNotMatch(body, /not-a-real-partial/);
        });

        it('maps a missing layout to the origin IncorrectUsageError (400) via the themed error path', async function () {
            // origin oracle rendering/renderer.js:40-48 — ENOENT → IncorrectUsageError
            const {renderer} = await createTestRenderer({
                ...THEME,
                'post.hbs': '{{!< no-such-layout}}<article></article>',
                'error.hbs': '<section class="error-tpl">{{statusCode}}</section>'
            });
            const response = await renderer.render(new Request(`${SITE_URL}welcome/`));

            assert.equal(response.status, 400);
            assert.match(await response.text(), /<section class="error-tpl">400<\/section>/);
        });

        it('turns malformed percent-encoding into a 404 Response instead of rejecting', async function () {
            const {renderer} = await createTestRenderer();
            const response = await renderer.render(new Request(`${SITE_URL}%E0%A4%A/`));

            // resolver ValidationError → router fall-through → 404 (like
            // upstream's 400 for theme traffic — provenance.md match-permalink row)
            assert.equal(response.status, 404);
        });
    });

    // finding 6 — theme error templates must render (error-404 → error →
    // plain-text fallback), mirroring the origin themeErrorRenderer
    describe('theme error templates', function () {
        it('renders the theme error-404 template for unknown urls', async function () {
            const {renderer} = await createTestRenderer({
                ...THEME,
                'error-404.hbs': '{{!< default}}<section class="error-404-tpl"><h1 class="error-code">{{statusCode}}</h1><p class="error-description">{{message}}</p></section>'
            });
            const response = await renderer.render(new Request(`${SITE_URL}missing/`));

            assert.equal(response.status, 404);
            assert.match(response.headers.get('content-type')!, /text\/html/);
            const html = await response.text();
            assert.match(html, /error-404-tpl/);
            assert.match(html, /<h1 class="error-code">404<\/h1>/);
            assert.match(html, /<p class="error-description">Page not found<\/p>/);
        });

        it('falls back through the hierarchy to error.hbs when no error-404 exists', async function () {
            const {renderer} = await createTestRenderer({
                ...THEME,
                'error.hbs': '{{!< default}}<section class="error-tpl">{{statusCode}}</section>'
            });
            const response = await renderer.render(new Request(`${SITE_URL}missing/`));

            assert.equal(response.status, 404);
            assert.match(await response.text(), /<section class="error-tpl">404<\/section>/);
        });

        it('falls back to a plain-text 404 when the theme has no error templates', async function () {
            const {renderer} = await createTestRenderer();
            const response = await renderer.render(new Request(`${SITE_URL}missing/`));

            assert.equal(response.status, 404);
            assert.match(response.headers.get('content-type')!, /text\/plain/);
            assert.equal(await response.text(), '404 Not Found');
        });
    });

    it('301s missing trailing slashes preserving the query string', async function () {
        const {renderer} = await createTestRenderer();
        const response = await renderer.render(new Request(`${SITE_URL}welcome?ref=x`));
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('location'), '/welcome/?ref=x');
        // finding 8 — permanent redirects carry the origin's caching header
        assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000');
    });

    // finding 8 — pretty-urls oracle (server/web/shared/middleware/pretty-urls.js):
    // ONLY .md/.txt extensions skip the trailing-slash redirect
    describe('pretty urls', function () {
        it('301s dotted-but-not-md/txt last segments to the slash form', async function () {
            const {renderer} = await createTestRenderer();
            const response = await renderer.render(new Request(`${SITE_URL}2.0-release-notes`));
            assert.equal(response.status, 301);
            assert.equal(response.headers.get('location'), '/2.0-release-notes/');
            assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000');
        });

        it('404s .md and .txt paths (llms route dropped — documented delta)', async function () {
            const {renderer} = await createTestRenderer();
            for (const path of ['file.txt', 'welcome.md']) {
                const response = await renderer.render(new Request(`${SITE_URL}${path}`));
                assert.equal(response.status, 404, path);
                assert.equal(response.headers.get('location'), null, path);
            }
        });
    });

    it('302s /:slug/edit/ to the admin editor', async function () {
        const {renderer} = await createTestRenderer();
        const response = await renderer.render(new Request(`${SITE_URL}welcome/edit/`));
        assert.equal(response.status, 302);
        assert.equal(response.headers.get('location'), `${SITE_URL}ghost/#/editor/post/p1/`);
    });

    it('normalizes an unslashed siteUrl so ghost_head emits a correct comments-counts URL', async function () {
        // finding 10 — the @tryghost/config-url-helpers contract: getSiteUrl()
        // always ends with '/', so `${getSiteUrl()}members/api/comments/counts/`
        // cannot collapse into 'example.commembers/...'
        const mock = createMockApi();
        const renderer = await createRenderer({
            siteUrl: 'http://localhost:2368', // deliberately no trailing slash
            contentApiKey: 'testkey',
            theme: THEME,
            fetch: mock.fetchImpl,
            settingsPayload: {...DEFAULT_SETTINGS_PAYLOAD, comments_enabled: 'all'}
        });

        assert.equal(renderer.deps.urlUtils.getSiteUrl(), 'http://localhost:2368/');

        const response = await renderer.render(new Request(`${SITE_URL}welcome/`));
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /data-ghost-comments-counts-api="http:\/\/localhost:2368\/members\/api\/comments\/counts\/"/);
    });

    it('keeps sequential renderer instances coherent (hbs singleton re-asserted per render)', async function () {
        // finding 5 — creating renderer B repoints the module-level hbs
        // environment; rendering A afterwards must re-assert A's engine so
        // helper-executed partials (navigation) resolve A's own overrides
        const themeA = {
            'index.hbs': '<main>{{navigation}}</main>',
            'partials/navigation.hbs': '<nav class="nav-a">A</nav>'
        };
        const themeB = {
            'index.hbs': '<main>{{navigation}}</main>',
            'partials/navigation.hbs': '<nav class="nav-b">B</nav>'
        };

        const {renderer: rendererA} = await createTestRenderer(themeA);
        const {renderer: rendererB} = await createTestRenderer(themeB);

        const responseB = await rendererB.render(new Request(SITE_URL));
        assert.match(await responseB.text(), /nav-b/);

        const responseA = await rendererA.render(new Request(SITE_URL));
        const htmlA = await responseA.text();
        assert.match(htmlA, /nav-a/);
        assert.doesNotMatch(htmlA, /nav-b/);
    });

    it('301s stale permalinks to the canonical url', async function () {
        const {renderer} = await createTestRenderer();
        // the mock's POSTS[1].url is /second/ — request it via a stale path that
        // still finds it (simulate by asking for the slug under a dated path is
        // not routable in slice 1, so mutate the entry url instead)
        POSTS[1]!.url = `${SITE_URL}renamed-second/`;
        try {
            const response = await renderer.render(new Request(`${SITE_URL}second/?q=1`));
            assert.equal(response.status, 301);
            assert.equal(response.headers.get('location'), '/renamed-second/?q=1');
            // finding 8 — urlUtils.redirect301 sets the caching header upstream
            assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000');
        } finally {
            POSTS[1]!.url = `${SITE_URL}second/`;
        }
    });
});
