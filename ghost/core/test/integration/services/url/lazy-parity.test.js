const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const events = require('../../../../core/server/lib/common/events');

const LazyUrlService = require('../../../../core/server/services/url/lazy/service');
const EagerUrlService = rewire('../../../../core/server/services/url/url-service');

/**
 * Build a Resources-shaped mock that both URL service implementations can
 * consume. The lazy service expects: getAllByType, getByIdAndType,
 * fetchResources, initEventListeners, reset, softReset, releaseAll. The
 * eager service expects: data, getAllByType, getByIdAndType, fetchResources,
 * initEventListeners, reset, softReset, releaseAll.
 */
function makeResources(seed) {
    const data = {};
    for (const [type, rows] of Object.entries(seed)) {
        data[type] = rows.map(row => ({
            data: row,
            config: {type, reserved: false},
            reserve() {
                this.config.reserved = true;
            },
            release() {
                this.config.reserved = false;
            },
            isReserved() {
                return this.config.reserved;
            },
            removeAllListeners() {},
            addListener() {}
        }));
    }
    return {
        data,
        getByIdAndType(type, id) {
            return data[type]?.find(r => r.data.id === id);
        },
        getAllByType(type) {
            return data[type] || [];
        },
        getAll() {
            return data;
        },
        fetchResources: sinon.stub().resolves(),
        initEventListeners: sinon.stub(),
        reset: sinon.stub(),
        softReset: sinon.stub(),
        releaseAll() {
            for (const rows of Object.values(data)) {
                for (const r of rows) {
                    r.release();
                }
            }
        }
    };
}

const FIXTURES = {
    posts: [
        {id: 'p1', slug: 'first-post', published_at: '2026-01-01T00:00:00Z', featured: false, type: 'post', visibility: 'public', status: 'published'},
        {id: 'p2', slug: 'featured-post', published_at: '2026-02-01T00:00:00Z', featured: true, type: 'post', visibility: 'public', status: 'published'},
        {id: 'p3', slug: 'tagged-post', published_at: '2026-03-01T00:00:00Z', featured: false, type: 'post', visibility: 'public', status: 'published', tags: [{slug: 'news'}]}
    ],
    pages: [
        {id: 'pg1', slug: 'about', published_at: '2025-12-01T00:00:00Z', type: 'page', visibility: 'public', status: 'published'}
    ],
    tags: [
        {id: 't1', slug: 'news', visibility: 'public'}
    ],
    authors: [
        {id: 'a1', slug: 'jane-doe', visibility: 'public'}
    ]
};

const ROUTES = [
    // identifier, filter, resourceType, permalink
    ['static-pages', null, 'pages', '/:slug/'],
    ['featured', 'featured:true', 'posts', '/featured/:slug/'],
    ['post-collection', null, 'posts', '/:slug/'],
    ['tag', null, 'tags', '/tag/:slug/'],
    ['author', null, 'authors', '/author/:slug/']
];

async function bootLazy(seed) {
    const resources = makeResources(seed);
    const svc = new LazyUrlService({resourcesFactory: () => resources, toleranceMs: 5});
    await svc.init();
    for (const [identifier, filter, type, permalink] of ROUTES) {
        svc.onRouterAddedType(identifier, filter, type, permalink);
    }
    // Wait for tolerance window (5ms) to elapse, plus a bit
    await new Promise((resolve) => {
        setTimeout(resolve, 30);
    });
    return svc;
}

async function bootEager(seed) {
    const resources = makeResources(seed);
    const svc = new EagerUrlService();
    // Replace internal Resources with our mock; keep the real Queue/Urls so
    // the queue tolerance + ownership flow runs unchanged.
    svc.resources = resources;
    // The Queue triggers an 'init' event when started; UrlGenerators call
    // resources.getAllByType in their _onInit handler. We don't await
    // resources.fetchResources because our mock doesn't need it.
    for (const [identifier, filter, type, permalink] of ROUTES) {
        svc.onRouterAddedType(identifier, filter, type, permalink);
    }
    svc.queue.start({event: 'init', tolerance: 5, requiredSubscriberCount: 1});
    // Wait for the queue to drain
    await new Promise((resolve) => {
        const check = () => {
            if (svc.hasFinished()) {
                resolve();
            } else {
                setTimeout(check, 5);
            }
        };
        check();
    });
    return svc;
}

describe('Integration: lazy URL service parity with eager', function () {
    let lazy;
    let eager;

    beforeEach(async function () {
        lazy = await bootLazy(FIXTURES);
        eager = await bootEager(FIXTURES);
    });

    afterEach(function () {
        lazy.reset();
        eager.reset();
        events.removeAllListeners();
        sinon.restore();
    });

    describe('getUrlByResourceId', function () {
        it('matches eager output for every fixture id', function () {
            const allIds = Object.values(FIXTURES).flat().map(r => r.id);
            for (const id of allIds) {
                assert.equal(
                    lazy.getUrlByResourceId(id),
                    eager.getUrlByResourceId(id),
                    `URL mismatch for resource ${id}`
                );
            }
        });

        it('matches eager /404/ behavior for unknown ids', function () {
            assert.equal(lazy.getUrlByResourceId('nonexistent'), '/404/');
            assert.equal(eager.getUrlByResourceId('nonexistent'), '/404/');
        });

        it('matches eager output with absolute=true', function () {
            for (const id of ['p1', 'p2', 'pg1', 't1', 'a1']) {
                assert.equal(
                    lazy.getUrlByResourceId(id, {absolute: true}),
                    eager.getUrlByResourceId(id, {absolute: true}),
                    `Absolute URL mismatch for ${id}`
                );
            }
        });
    });

    describe('getResource', function () {
        it('matches eager output for known URLs', function () {
            const probes = [
                '/first-post/',
                '/featured/featured-post/',
                '/tagged-post/',
                '/about/',
                '/tag/news/',
                '/author/jane-doe/'
            ];
            for (const url of probes) {
                const lazyRes = lazy.getResource(url);
                const eagerRes = eager.getResource(url);
                assert.equal(
                    lazyRes ? lazyRes.data.id : null,
                    eagerRes ? eagerRes.data.id : null,
                    `getResource(${url}) id mismatch`
                );
                assert.equal(
                    lazyRes ? lazyRes.config.type : null,
                    eagerRes ? eagerRes.config.type : null,
                    `getResource(${url}) type mismatch`
                );
            }
        });

        it('returns null from both for unmatchable URLs', function () {
            assert.equal(lazy.getResource('/no/such/url/'), null);
            assert.equal(eager.getResource('/no/such/url/'), null);
        });
    });

    describe('owns', function () {
        it('matches eager ownership for every (router, resource) pair', function () {
            const allIds = Object.values(FIXTURES).flat().map(r => r.id);
            for (const [identifier] of ROUTES) {
                for (const id of allIds) {
                    assert.equal(
                        lazy.owns(identifier, id),
                        eager.owns(identifier, id),
                        `owns(${identifier}, ${id}) mismatch`
                    );
                }
            }
        });
    });

    describe('getPermalinkByUrl', function () {
        it('returns the same permalink template for known URLs', function () {
            const probes = ['/first-post/', '/featured/featured-post/', '/tag/news/', '/about/'];
            for (const url of probes) {
                assert.equal(
                    lazy.getPermalinkByUrl(url),
                    eager.getPermalinkByUrl(url),
                    `getPermalinkByUrl(${url}) mismatch`
                );
            }
        });
    });

    describe('round-trip', function () {
        it('every (id → URL → resource) cycle returns the same id', function () {
            const allIds = Object.values(FIXTURES).flat().map(r => r.id);
            for (const id of allIds) {
                const lazyUrl = lazy.getUrlByResourceId(id);
                if (lazyUrl === '/404/') {
                    continue;
                }
                const lazyResource = lazy.getResource(lazyUrl);
                assert.ok(lazyResource, `lazy: getResource(${lazyUrl}) returned null`);
                assert.equal(lazyResource.data.id, id, `lazy round-trip mismatch for ${id}`);

                const eagerUrl = eager.getUrlByResourceId(id);
                const eagerResource = eager.getResource(eagerUrl);
                assert.ok(eagerResource, `eager: getResource(${eagerUrl}) returned null`);
                assert.equal(eagerResource.data.id, id, `eager round-trip mismatch for ${id}`);
            }
        });
    });
});
