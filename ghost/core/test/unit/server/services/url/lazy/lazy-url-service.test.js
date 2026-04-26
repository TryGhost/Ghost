const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const events = require('../../../../../../core/server/lib/common/events');
const LazyUrlService = require('../../../../../../core/server/services/url/lazy/service');

const fixtures = {
    posts: [
        {id: 'p1', slug: 'first-post', published_at: '2026-01-01T00:00:00Z', featured: false, type: 'post', visibility: 'public', status: 'published'},
        {id: 'p2', slug: 'featured-post', published_at: '2026-02-01T00:00:00Z', featured: true, type: 'post', visibility: 'public', status: 'published'}
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

function makeResources(seed = fixtures) {
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

describe('Unit: services/url/lazy/LazyUrlService', function () {
    let resources;
    let service;
    let clock;

    beforeEach(async function () {
        clock = sinon.useFakeTimers();
        resources = makeResources();
        service = new LazyUrlService({resourcesFactory: () => resources});
        await service.init();
    });

    afterEach(function () {
        // Drop event listeners installed by init()
        service.reset();
        events.removeAllListeners();
        clock.restore();
        sinon.restore();
    });

    function registerDefaults() {
        service.onRouterAddedType('static-pages', null, 'pages', '/:slug/');
        service.onRouterAddedType('post-collection', null, 'posts', '/:slug/');
        service.onRouterAddedType('tag', null, 'tags', '/tag/:slug/');
        service.onRouterAddedType('author', null, 'authors', '/author/:slug/');
        // Tolerance window for boot recompute
        clock.tick(150);
    }

    describe('hasFinished()', function () {
        it('starts false until the boot recompute completes', function () {
            assert.equal(service.hasFinished(), false);
            registerDefaults();
            assert.equal(service.hasFinished(), true);
        });
    });

    describe('getUrlByResourceId()', function () {
        beforeEach(registerDefaults);

        it('returns the computed URL for an owned resource', function () {
            assert.equal(service.getUrlByResourceId('p1'), '/first-post/');
            assert.equal(service.getUrlByResourceId('pg1'), '/about/');
            assert.equal(service.getUrlByResourceId('t1'), '/tag/news/');
        });

        it('returns /404/ for an unknown resource id', function () {
            assert.equal(service.getUrlByResourceId('nonexistent'), '/404/');
        });

        it('honors the absolute option via urlUtils.createUrl', function () {
            const url = service.getUrlByResourceId('p1', {absolute: true});
            assert.match(url, /^https?:\/\//, `expected absolute URL, got ${url}`);
            assert.match(url, /\/first-post\/$/);
        });
    });

    describe('getResource()', function () {
        beforeEach(registerDefaults);

        it('returns the resource at a given URL', function () {
            const r = service.getResource('/first-post/');
            assert.equal(r.data.id, 'p1');
        });

        it('returns null when no generator matches the URL', function () {
            assert.equal(service.getResource('/totally/unknown/path/'), null);
        });

        it('respects generator priority order on overlapping matches', function () {
            // Both 'pages' and 'posts' generators have permalink /:slug/
            // Pages was registered first in registerDefaults, so for slug 'about'
            // (a page), pages wins.
            const r = service.getResource('/about/');
            assert.equal(r.data.id, 'pg1');
            assert.equal(r.config.type, 'pages');
        });

        it('throws URLSERVICE_NOT_READY before init+register completes', function () {
            // Create a fresh service that hasn't been registered yet
            const fresh = new LazyUrlService({resourcesFactory: () => makeResources()});
            return fresh.init().then(() => {
                assert.equal(fresh.hasFinished(), false);
                try {
                    fresh.getResource('/anything/');
                    throw new Error('expected throw');
                } catch (err) {
                    assert.equal(errors.utils.isGhostError(err), true);
                    assert.equal(err.code, 'URLSERVICE_NOT_READY');
                }
            });
        });
    });

    describe('getResourceById()', function () {
        beforeEach(registerDefaults);

        it('returns the resource by id', function () {
            const r = service.getResourceById('p1');
            assert.equal(r.data.id, 'p1');
        });

        it('throws URLSERVICE_RESOURCE_NOT_FOUND for unknown ids', function () {
            try {
                service.getResourceById('nope');
                throw new Error('expected throw');
            } catch (err) {
                assert.equal(err.code, 'URLSERVICE_RESOURCE_NOT_FOUND');
            }
        });
    });

    describe('owns()', function () {
        beforeEach(registerDefaults);

        it('returns true when the named router currently owns the resource', function () {
            assert.equal(service.owns('post-collection', 'p1'), true);
        });

        it('returns false when a different router owns the resource', function () {
            assert.equal(service.owns('tag', 'p1'), false);
        });

        it('returns false for unknown router ids', function () {
            assert.equal(service.owns('made-up-router', 'p1'), false);
        });
    });

    describe('getPermalinkByUrl()', function () {
        beforeEach(registerDefaults);

        it('returns the permalink template for the matching generator', function () {
            assert.equal(service.getPermalinkByUrl('/first-post/'), '/:slug/');
            assert.equal(service.getPermalinkByUrl('/tag/news/'), '/tag/:slug/');
        });

        it('returns null when no generator matches', function () {
            assert.equal(service.getPermalinkByUrl('/no/match/'), null);
        });
    });

    describe('filter-based ownership', function () {
        it('routes featured posts to a featured-only generator', function () {
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');
            service.onRouterAddedType('post-collection', null, 'posts', '/:slug/');
            clock.tick(150);

            assert.equal(service.getUrlByResourceId('p2'), '/featured/featured-post/');
            assert.equal(service.getUrlByResourceId('p1'), '/first-post/');
        });
    });

    describe('model-event path (queue stub)', function () {
        let added;
        let removed;

        beforeEach(function () {
            added = [];
            removed = [];
            events.on('url.added', obj => added.push(obj));
            events.on('url.removed', obj => removed.push(obj));
            registerDefaults();
            // Drain the boot-recompute events so the per-event assertions
            // below only see the change we deliberately drive.
            added.length = 0;
            removed.length = 0;
        });

        it('reflects an ownership flip when a resource gains a generator-matching property', async function () {
            // To get featured-priority routing we need the featured generator
            // registered BEFORE the catch-all. Build a fresh service so
            // ordering is under our control.
            clock.restore();
            clock = sinon.useFakeTimers();
            service.reset();
            events.removeAllListeners();
            events.on('url.added', obj => added.push(obj));
            events.on('url.removed', obj => removed.push(obj));
            added.length = 0;
            removed.length = 0;

            resources = makeResources();
            service = new LazyUrlService({resourcesFactory: () => resources});
            await service.init();
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');
            service.onRouterAddedType('post-collection', null, 'posts', '/:slug/');
            clock.tick(150);

            // Drain the boot events
            added.length = 0;
            removed.length = 0;

            // Fire the simulated model event for p1 transitioning to featured
            const p1 = resources.getByIdAndType('posts', 'p1');
            p1.data.featured = true;
            service.queue.start({event: 'added', eventData: {type: 'posts', id: 'p1'}});

            assert.equal(service.getUrlByResourceId('p1'), '/featured/first-post/');
            assert.deepEqual(removed.map(r => r.url), ['/first-post/']);
            assert.deepEqual(added.map(a => a.url.relative), ['/featured/first-post/']);
        });

        it('treats a post leaving the cache (e.g. unpublished) as a removal', function () {
            // Simulate Resources dropping the row from its cache (this is what
            // _onResourceRemoved does at resources.js:411 before our listener fires)
            resources.data.posts = resources.data.posts.filter(r => r.data.id !== 'p1');

            // Fire the model-removal event
            events.emit('post.unpublished', {id: 'p1', _previousAttributes: {id: 'p1'}});

            assert.equal(service.getUrlByResourceId('p1'), '/404/');
            assert.equal(removed.length, 1);
            assert.equal(removed[0].url, '/first-post/');
        });

        it('emits no events when an update does not change the resource URL', function () {
            // Simulate an "update" that doesn't change anything routing-relevant
            service.queue.start({event: 'added', eventData: {type: 'posts', id: 'p1'}});

            assert.equal(added.length, 0);
            assert.equal(removed.length, 0);
        });

        it('forwards getResource through the slug index after a model event', function () {
            // Add a brand new post into Resources directly
            resources.data.posts.push({
                data: {id: 'p99', slug: 'fresh-post', published_at: '2026-04-26T00:00:00Z', featured: false, type: 'post', visibility: 'public', status: 'published'},
                config: {type: 'posts', reserved: false},
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
            });
            service.queue.start({event: 'added', eventData: {type: 'posts', id: 'p99'}});

            // Forward lookup via the slug index
            const r = service.getResource('/fresh-post/');
            assert.ok(r);
            assert.equal(r.data.id, 'p99');
        });
    });

    describe('listener idempotency', function () {
        it('does not double-bind remove listeners on a second init()', async function () {
            // Capture how many post.unpublished listeners exist after one init
            const baseCount = events.listenerCount('post.unpublished');

            // A second init() is a realistic scenario after softReset()
            service.softReset();
            await service.init();

            assert.equal(events.listenerCount('post.unpublished'), baseCount,
                'expected listener count to stay stable across init cycles');
        });
    });

    describe('debounced recompute', function () {
        it('coalesces a burst of router registrations into one recompute', function () {
            const recomputeSpy = sinon.spy(service, '_recomputeAllUrls');

            service.onRouterAddedType('a', null, 'posts', '/a/:slug/');
            clock.tick(50);
            service.onRouterAddedType('b', null, 'posts', '/b/:slug/');
            clock.tick(50);
            service.onRouterAddedType('c', null, 'posts', '/c/:slug/');
            clock.tick(150);

            // Each onRouterAddedType resets the debounce timer; only the
            // last one's tolerance expiry actually fires the recompute.
            assert.equal(recomputeSpy.callCount, 1);
        });
    });

    describe('url.added / url.removed event re-emission', function () {
        let added;
        let removed;

        beforeEach(function () {
            added = [];
            removed = [];
            events.on('url.added', obj => added.push(obj));
            events.on('url.removed', obj => removed.push(obj));
        });

        it('emits url.added for each owned resource on initial recompute', function () {
            registerDefaults();
            const urls = added.map(o => o.url.relative).sort();
            // Every fixture is owned by exactly one generator
            assert.deepEqual(urls, [
                '/about/',
                '/author/jane-doe/',
                '/featured-post/',
                '/first-post/',
                '/tag/news/'
            ].sort());
        });

        it('emits url.added with absolute and relative variants', function () {
            registerDefaults();
            const first = added.find(o => o.url.relative === '/first-post/');
            assert.ok(first);
            assert.match(first.url.absolute, /\/first-post\/$/);
            assert.equal(first.resource.data.id, 'p1');
            assert.equal(first.resource.config.type, 'posts');
        });
    });
});
