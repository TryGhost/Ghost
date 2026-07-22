const sinon = require('sinon');
const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');

// Stuff we are testing
const DomainEvents = require('@tryghost/domain-events');
const {URLResourceUpdatedEvent} = require('../../../../../core/shared/events');

const routingEvents = require('../../../../../core/frontend/services/routing/events');
const urlUtils = require('../../../../../core/shared/url-utils');

const SiteMapManager = require('../../../../../core/frontend/services/sitemap/site-map-manager');
const PostGenerator = require('../../../../../core/frontend/services/sitemap/post-map-generator');
const PageGenerator = require('../../../../../core/frontend/services/sitemap/page-map-generator');
const TagGenerator = require('../../../../../core/frontend/services/sitemap/tags-map-generator');
const UserGenerator = require('../../../../../core/frontend/services/sitemap/user-map-generator');
const IndexGenerator = require('../../../../../core/frontend/services/sitemap/site-map-index-generator');

describe('Unit: sitemap/manager', function () {
    let eventsToRemember;

    const makeStubManager = function () {
        let posts;
        let pages;
        let tags;
        let authors;

        posts = new PostGenerator();
        pages = new PageGenerator();
        tags = new TagGenerator();
        authors = new UserGenerator();

        // Eager-shaped url service: every mode builds on first read now,
        // so even the legacy render tests need one injected.
        return new SiteMapManager({
            posts: posts,
            pages: pages,
            tags: tags,
            authors: authors,
            urlService: {
                isLazy: () => false,
                getRoutableResources: async () => [],
                getUrlForResource: () => '/x/'
            },
            // Server events come through the proxy's narrow surface in
            // production; injected here like the url service
            serverEvents: {
                on: (eventName, callback) => {
                    eventsToRemember[eventName] = callback;
                }
            }
        });
    };

    beforeAll(function () {
        eventsToRemember = {};

        // @NOTE: the pattern of faking event call is not great, we should be
        //        ideally tasting on real events instead of faking them
        // router.created / routers.reset are frontend-internal routing events
        sinon.stub(routingEvents, 'on').callsFake(function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        sinon.stub(PostGenerator.prototype, 'getXml');
        sinon.stub(PostGenerator.prototype, 'addUrl');
        sinon.stub(PostGenerator.prototype, 'removeUrl');
        sinon.stub(IndexGenerator.prototype, 'getXml');
    });

    afterAll(function () {
        sinon.restore();
    });

    describe('SiteMapManager', function () {
        let manager;

        beforeAll(function () {
            manager = makeStubManager();
        });

        it('can create a SiteMapManager instance', function () {
            assertExists(manager);
            assert.equal(Object.keys(eventsToRemember).length, 5);
            assertExists(eventsToRemember['url.added']);
            assertExists(eventsToRemember['url.removed']);
            assertExists(eventsToRemember['router.created']);
            assertExists(eventsToRemember['routers.reset']);
            assertExists(eventsToRemember['site.changed']);
        });

        describe('trigger url events', function () {
            it('url.added', function () {
                eventsToRemember['url.added']({
                    url: {
                        relative: '/test/',
                        absolute: 'https://myblog.com/test/'
                    },
                    resource: {
                        config: {
                            type: 'posts'
                        },
                        data: {}
                    }
                });

                sinon.assert.calledOnce(PostGenerator.prototype.addUrl);
            });

            it('url.removed', function () {
                eventsToRemember['url.removed']({
                    url: {
                        relative: '/test/',
                        absolute: 'https://myblog.com/test/'
                    },
                    resource: {
                        config: {
                            type: 'posts'
                        },
                        data: {}
                    }
                });

                sinon.assert.calledOnce(PostGenerator.prototype.removeUrl);
            });

            it('Listens to URLResourceUpdatedEvent event', async function () {
                sinon.stub(PostGenerator.prototype, 'updateURL').resolves(true);
                DomainEvents.dispatch(URLResourceUpdatedEvent.create({
                    id: 'post_id',
                    resourceType: 'posts'
                }));
                await DomainEvents.allSettled();

                sinon.assert.calledOnce(PostGenerator.prototype.updateURL);
            });
        });

        describe('build path: the index is built from routable resources on first read', function () {
            let sandbox;
            let urlService;
            let fetchStub;
            let getUrlForResource;

            function makeManager() {
                return new SiteMapManager({
                    posts: new PostGenerator(),
                    pages: new PageGenerator(),
                    tags: new TagGenerator(),
                    authors: new UserGenerator(),
                    urlService,
                    serverEvents: {
                        on: (eventName, callback) => {
                            eventsToRemember[eventName] = callback;
                        }
                    }
                });
            }

            function emitAboutRouter() {
                eventsToRemember['router.created']({
                    name: 'StaticRoutesRouter',
                    identifier: 'sr1',
                    getRoute: () => 'http://example.com/about/'
                });
            }

            beforeEach(function () {
                sandbox = sinon.createSandbox();
                urlService = {
                    isLazy: sinon.stub().returns(true),
                    getRoutableResources: sinon.stub().resolves([]),
                    getUrlForResource: sinon.stub().returns('http://example.com/x/')
                };
                fetchStub = urlService.getRoutableResources;
                getUrlForResource = urlService.getUrlForResource;

                // The outer suite stubs PostGenerator.addUrl on the prototype for
                // the whole file; reset its history and sandbox-stub the rest so
                // call assertions are scoped to each test.
                sandbox.stub(PageGenerator.prototype, 'addUrl');
                sandbox.stub(TagGenerator.prototype, 'addUrl');
                sandbox.stub(UserGenerator.prototype, 'addUrl');
                PostGenerator.prototype.addUrl.resetHistory();
            });

            afterEach(function () {
                sandbox.restore();
            });

            it('builds once on first read while eager is authoritative, then leaves freshness to the events', async function () {
                // The manager only consults isLazy, so eager-only and
                // compare mode are the same code path here: build once,
                // never invalidate, the per-URL events own freshness.
                urlService.isLazy.returns(false);

                const siteMapManager = makeManager();
                await siteMapManager.getSiteMapXml('posts');
                sinon.assert.calledWith(fetchStub, 'posts', sinon.match({columns: sinon.match.array.contains(['canonical_url'])}));
                sinon.assert.callCount(fetchStub, 4);

                // Deploying compare mode must be a serving no-op: neither
                // site changes nor router registrations trigger rebuilds.
                eventsToRemember['site.changed']();
                emitAboutRouter();
                await siteMapManager.getSiteMapXml('posts');
                sinon.assert.callCount(fetchStub, 4);
            });

            it('builds the index from routable resources, skipping /404/ URLs', async function () {
                fetchStub.withArgs('posts').resolves([
                    {id: 'p1', slug: 'hello'},
                    {id: 'p2', slug: 'orphan'}
                ]);
                fetchStub.withArgs('pages').resolves([{id: 'pg1', slug: 'about'}]);
                fetchStub.withArgs('tags').resolves([{id: 't1', slug: 'food'}]);
                fetchStub.withArgs('authors').resolves([{id: 'u1', slug: 'jane'}]);
                getUrlForResource.callsFake(function (resource) {
                    if (resource.id === 'p2') {
                        return urlUtils.createUrl('/404/', true);
                    }
                    return `http://example.com/${resource.type}/${resource.slug}/`;
                });

                await makeManager().getSiteMapXml('posts');

                sinon.assert.calledWith(PostGenerator.prototype.addUrl, 'http://example.com/posts/hello/', sinon.match({id: 'p1'}));
                sinon.assert.calledWith(PageGenerator.prototype.addUrl, 'http://example.com/pages/about/', sinon.match({id: 'pg1'}));
                sinon.assert.calledWith(TagGenerator.prototype.addUrl, 'http://example.com/tags/food/', sinon.match({id: 't1'}));
                sinon.assert.calledWith(UserGenerator.prototype.addUrl, 'http://example.com/authors/jane/', sinon.match({id: 'u1'}));

                const orphanCalls = PostGenerator.prototype.addUrl.getCalls().filter(call => call.args[1] && call.args[1].id === 'p2');
                assert.equal(orphanCalls.length, 0, 'p2 resolves to /404/ and must not enter the sitemap');

                // Bulk rows must skip the per-call comparison tee: one
                // rebuild on a big site would otherwise capture a stack and
                // queue a background lazy computation per resource.
                sinon.assert.alwaysCalledWith(getUrlForResource, sinon.match.any, sinon.match({skipComparison: true}));
            });

            it('keeps a real resource whose slug is 404, dropping only the exact sentinel', async function () {
                fetchStub.withArgs('tags').resolves([{id: 't404', slug: '404'}]);
                fetchStub.withArgs('posts').resolves([{id: 'p1', slug: 'orphan'}]);
                getUrlForResource.callsFake(function (resource) {
                    if (resource.id === 't404') {
                        return `${urlUtils.urlFor('home', true)}tag/404/`;
                    }
                    return urlUtils.createUrl('/404/', true);
                });

                await makeManager().getSiteMapXml('posts');

                sinon.assert.calledWith(TagGenerator.prototype.addUrl, sinon.match(/\/tag\/404\/$/), sinon.match({id: 't404'}));
                sinon.assert.notCalled(PostGenerator.prototype.addUrl);
            });

            it('shares one build between concurrent readers, whichever method they use', async function () {
                const siteMapManager = makeManager();

                await Promise.all([siteMapManager.getIndexXml(), siteMapManager.getSiteMapXml('posts')]);

                // One build = one fetch per type.
                sinon.assert.callCount(fetchStub, 4);
            });

            it('serves from the built index without refetching', async function () {
                const siteMapManager = makeManager();

                await siteMapManager.getSiteMapXml('posts');
                await siteMapManager.getSiteMapXml('posts');

                sinon.assert.callCount(fetchStub, 4);
            });

            it('rebuilds after site.changed empties the index', async function () {
                const siteMapManager = makeManager();
                await siteMapManager.getSiteMapXml('posts');

                eventsToRemember['site.changed']();
                await siteMapManager.getSiteMapXml('posts');

                sinon.assert.callCount(fetchStub, 8);
            });

            it('resets the generators at the start of every apply so a rebuild holds no dropped resources', async function () {
                sandbox.stub(PostGenerator.prototype, 'reset');
                const siteMapManager = makeManager();
                await siteMapManager.getSiteMapXml('posts');

                eventsToRemember['site.changed']();
                await siteMapManager.getSiteMapXml('posts');

                // Once per build. Without this, a post unpublished between builds
                // would stay in the sitemap forever.
                sinon.assert.calledTwice(PostGenerator.prototype.reset);
            });

            it('replays static/collection route entries into every rebuild', async function () {
                const siteMapManager = makeManager();
                emitAboutRouter();
                PageGenerator.prototype.addUrl.resetHistory();

                await siteMapManager.getSiteMapXml('posts');

                // router.created only fires at boot and routes reload; the entry
                // must survive the apply-phase generator reset.
                sinon.assert.calledWith(PageGenerator.prototype.addUrl, 'http://example.com/about/', sinon.match({id: 'sr1'}));
            });

            it('rebuilds after a router registers, so a reload window cannot pin a routerless index', async function () {
                const siteMapManager = makeManager();
                await siteMapManager.getSiteMapXml('posts');
                sinon.assert.callCount(fetchStub, 4);

                emitAboutRouter();

                await siteMapManager.getSiteMapXml('posts');
                sinon.assert.callCount(fetchStub, 8);
            });

            it('forgets recorded route entries when routers.reset fires', async function () {
                const siteMapManager = makeManager();
                emitAboutRouter();

                eventsToRemember['routers.reset']();
                PageGenerator.prototype.addUrl.resetHistory();
                await siteMapManager.getSiteMapXml('posts');

                // The routers re-register right after a reset and refill the
                // list; a stale entry here would resurrect a deleted route.
                sinon.assert.neverCalledWith(PageGenerator.prototype.addUrl, 'http://example.com/about/', sinon.match({id: 'sr1'}));
            });

            it('fails a read with a 503 when the build is invalidated mid-flight, and rebuilds on the next read', async function () {
                let resolveFirstFetch;
                fetchStub.withArgs('posts')
                    .onFirstCall().returns(new Promise((resolve) => {
                        resolveFirstFetch = () => resolve([]);
                    }))
                    .onSecondCall().resolves([]);

                const siteMapManager = makeManager();
                const reader = siteMapManager.getSiteMapXml('posts');

                eventsToRemember['site.changed']();
                resolveFirstFetch();

                // Never serve pre-invalidation data: a stale 200 would be
                // pinned by the CDN for the full cache maxAge. A 503 is
                // retried by crawlers and stored by nobody.
                await assert.rejects(reader, (err) => {
                    assert.equal(err.statusCode, 503);
                    assert.equal(err.code, 'SITEMAP_BUILD_SUPERSEDED');
                    return true;
                });

                // The next read starts fresh and succeeds.
                await siteMapManager.getSiteMapXml('posts');
                sinon.assert.callCount(fetchStub, 8);
            });

            it('rejects readers when the build fails and retries on the next read', async function () {
                fetchStub.withArgs('tags')
                    .onFirstCall().rejects(new Error('connection lost'))
                    .onSecondCall().resolves([]);

                const siteMapManager = makeManager();

                await assert.rejects(siteMapManager.getSiteMapXml('posts'), /connection lost/);
                await siteMapManager.getSiteMapXml('posts');
            });
        });

        it('fn: getSiteMapXml', async function () {
            PostGenerator.prototype.getXml.resetHistory();
            PostGenerator.prototype.getXml.returns('xml');
            assert.equal(await manager.getSiteMapXml('posts'), 'xml');
            sinon.assert.calledOnce(PostGenerator.prototype.getXml);
        });

        it('fn: getIndexXml', async function () {
            IndexGenerator.prototype.getXml.resetHistory();
            IndexGenerator.prototype.getXml.returns('xml');
            assert.equal(await manager.getIndexXml(), 'xml');
            sinon.assert.calledOnce(IndexGenerator.prototype.getXml);
        });
    });
});
