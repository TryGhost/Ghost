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

        const paged = await renderer.render(new Request(`${SITE_URL}page/1/`));
        assert.equal(paged.status, 200);
        // NOTE: frontPageTemplate applies only to path '/' — page/1 uses index
        const pagedHtml = await paged.text();
        assert.match(pagedHtml, /<main>/);
        assert.doesNotMatch(pagedHtml, /<main class="home">/);
        // theme pagination partial overrides the core helper partial
        assert.match(pagedHtml, /<nav class="theme-pagination">1\/1<\/nav>/);

        const outOfRange = await renderer.render(new Request(`${SITE_URL}page/99/`));
        assert.equal(outOfRange.status, 404);
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

    it('301s missing trailing slashes preserving the query string', async function () {
        const {renderer} = await createTestRenderer();
        const response = await renderer.render(new Request(`${SITE_URL}welcome?ref=x`));
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('location'), '/welcome/?ref=x');
    });

    it('302s /:slug/edit/ to the admin editor', async function () {
        const {renderer} = await createTestRenderer();
        const response = await renderer.render(new Request(`${SITE_URL}welcome/edit/`));
        assert.equal(response.status, 302);
        assert.equal(response.headers.get('location'), `${SITE_URL}ghost/#/editor/post/p1/`);
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
        } finally {
            POSTS[1]!.url = `${SITE_URL}second/`;
        }
    });
});
