const sinon = require('sinon');
const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');

// Stuff we are testing
const DomainEvents = require('@tryghost/domain-events');
const {URLResourceUpdatedEvent} = require('../../../../../core/shared/events');

const events = require('../../../../../core/server/lib/common/events');

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

        return new SiteMapManager({posts: posts, pages: pages, tags: tags, authors: authors});
    };

    before(function () {
        eventsToRemember = {};

        // @NOTE: the pattern of faking event call is not great, we should be
        //        ideally tasting on real events instead of faking them
        sinon.stub(events, 'on').callsFake(function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        sinon.stub(PostGenerator.prototype, 'getXml');
        sinon.stub(PostGenerator.prototype, 'addUrl');
        sinon.stub(PostGenerator.prototype, 'removeUrl');
        sinon.stub(IndexGenerator.prototype, 'getXml');
    });

    after(function () {
        sinon.restore();
    });

    describe('SiteMapManager', function () {
        let manager;

        before(function () {
            manager = makeStubManager();
        });

        it('can create a SiteMapManager instance', function () {
            assertExists(manager);
            assert.equal(Object.keys(eventsToRemember).length, 4);
            assertExists(eventsToRemember['url.added']);
            assertExists(eventsToRemember['url.removed']);
            assertExists(eventsToRemember['router.created']);
            assertExists(eventsToRemember['routers.reset']);
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

        it('fn: getSiteMapXml', function () {
            PostGenerator.prototype.getXml.returns('xml');
            assert.equal(manager.getSiteMapXml('posts'), 'xml');
            sinon.assert.calledOnce(PostGenerator.prototype.getXml);
        });

        it('fn: getIndexXml', function () {
            IndexGenerator.prototype.getXml.returns('xml');
            assert.equal(manager.getIndexXml(), 'xml');
            sinon.assert.calledOnce(IndexGenerator.prototype.getXml);
        });
    });

    describe('SiteMapManager (lazyRouting mode)', function () {
        let lazyEvents;

        before(function () {
            lazyEvents = {};
            // Replace the events.on stub for this block so we can capture
            // subscriptions made by a manager constructed with lazyRouting on.
            events.on.restore();
            sinon.stub(events, 'on').callsFake((eventName, callback) => {
                lazyEvents[eventName] = callback;
            });

            new SiteMapManager({
                posts: new PostGenerator(),
                pages: new PageGenerator(),
                tags: new TagGenerator(),
                authors: new UserGenerator(),
                lazyRouting: true
            });
        });

        it('skips url.added and url.removed event subscriptions', function () {
            assert.equal(lazyEvents['url.added'], undefined);
            assert.equal(lazyEvents['url.removed'], undefined);
        });

        it('still subscribes to router.created and routers.reset', function () {
            assertExists(lazyEvents['router.created']);
            assertExists(lazyEvents['routers.reset']);
        });

        it('ensurePopulatedFromDatabase is a no-op when lazyRouting is off', async function () {
            const eagerManager = new SiteMapManager({
                posts: new PostGenerator(),
                pages: new PageGenerator(),
                tags: new TagGenerator(),
                authors: new UserGenerator(),
                lazyRouting: false
            });
            // Should resolve without touching the DB.
            await eagerManager.ensurePopulatedFromDatabase();
        });
    });

    // The lazy populate path is the only mechanism that fills the sitemap when
    // url.added/url.removed events do not fire. These tests exercise it as a
    // unit: stub the model layer + the URL facade and assert addUrl is called
    // for the right resources.
    describe('_populateFromDatabase', function () {
        let sandbox;
        let fetchAll;
        let getUrlForResource;

        const models = require('../../../../../core/server/models');
        const urlServiceModule = require('../../../../../core/server/services/url');

        // The outer suite stubs PostGenerator.prototype.addUrl globally, so
        // we can't (re)stub it on a fresh instance. Reset the shared post
        // stub and use a per-test sandbox for everything else so a partial
        // beforeEach failure can't leak stubs across cases.
        beforeEach(function () {
            sandbox = sinon.createSandbox();
            // The lazy sitemap populate goes through raw_knex.fetchAll —
            // the same fast path the eager URL service uses
            // (services/url/resources.js). All four resource types route
            // through this single static method, discriminated by
            // `modelName` and `filter` in the options.
            fetchAll = sandbox.stub(models.Base.Model.raw_knex, 'fetchAll');
            fetchAll.resolves([]);

            sandbox.stub(PageGenerator.prototype, 'addUrl');
            sandbox.stub(TagGenerator.prototype, 'addUrl');
            sandbox.stub(UserGenerator.prototype, 'addUrl');
            PostGenerator.prototype.addUrl.resetHistory();

            // Method-level stub on the singleton facade method the sitemap
            // actually reads. Sandbox.restore() puts it back even if a sibling
            // beforeEach throws partway.
            getUrlForResource = sandbox.stub(urlServiceModule.facade, 'getUrlForResource');
        });

        afterEach(function () {
            sandbox.restore();
        });

        function makeLazyManager() {
            return new SiteMapManager({
                posts: new PostGenerator(),
                pages: new PageGenerator(),
                tags: new TagGenerator(),
                authors: new UserGenerator(),
                lazyRouting: true
            });
        }

        const postsMatcher = sinon.match({modelName: 'Post', filter: 'status:published+type:post'});
        const pagesMatcher = sinon.match({modelName: 'Post', filter: 'status:published+type:page'});
        const tagsMatcher = sinon.match({modelName: 'Tag'});
        const authorsMatcher = sinon.match({modelName: 'User'});

        it('feeds non-/404/ URLs into the per-type generators', async function () {
            fetchAll.withArgs(postsMatcher).resolves([{id: 'p1', slug: 'hello', type: 'post'}]);
            fetchAll.withArgs(pagesMatcher).resolves([{id: 'pg1', slug: 'about', type: 'page'}]);
            fetchAll.withArgs(tagsMatcher).resolves([{id: 't1', slug: 'food'}]);
            fetchAll.withArgs(authorsMatcher).resolves([{id: 'u1', slug: 'jane'}]);

            getUrlForResource.callsFake((resource) => {
                if (resource.id === 'p1') {
                    return 'http://example.com/hello/';
                }
                if (resource.id === 'pg1') {
                    return 'http://example.com/about/';
                }
                if (resource.id === 't1') {
                    return 'http://example.com/tag/food/';
                }
                if (resource.id === 'u1') {
                    return 'http://example.com/author/jane/';
                }
                return '/404/';
            });

            const manager = makeLazyManager();
            await manager.ensurePopulatedFromDatabase();

            sinon.assert.calledWith(PostGenerator.prototype.addUrl, 'http://example.com/hello/', sinon.match({id: 'p1'}));
            sinon.assert.calledWith(PageGenerator.prototype.addUrl, 'http://example.com/about/', sinon.match({id: 'pg1'}));
            sinon.assert.calledWith(TagGenerator.prototype.addUrl, 'http://example.com/tag/food/', sinon.match({id: 't1'}));
            sinon.assert.calledWith(UserGenerator.prototype.addUrl, 'http://example.com/author/jane/', sinon.match({id: 'u1'}));
        });

        it('preloads tags+authors for posts so primary_tag permalinks resolve', async function () {
            getUrlForResource.returns('http://example.com/x/');

            await makeLazyManager().ensurePopulatedFromDatabase();

            // Sites using `/:primary_tag/:slug/` permalinks need
            // `primary_tag` populated on the resource. raw_knex.fetchAll
            // attaches relations listed in withRelated and runs Post.toJSON
            // per row; toJSON's computed primary_tag/primary_author fields
            // only fire when the underlying tags/authors relation is loaded,
            // so `withRelated: ['tags', 'authors']` is the load-bearing key
            // here.
            sinon.assert.calledWith(fetchAll, sinon.match({
                modelName: 'Post',
                filter: 'status:published+type:post',
                withRelated: ['tags', 'authors']
            }));
        });

        it('excludes heavy post body columns from the fetch so a large site does not OOM', async function () {
            getUrlForResource.returns('http://example.com/x/');

            await makeLazyManager().ensurePopulatedFromDatabase();

            // The sitemap only needs slug + dates + the primary_tag/author
            // computed fields. Without `exclude`, raw_knex.fetchAll falls
            // through to `SELECT *` and loads multi-MB mobiledoc/lexical/
            // html/plaintext columns for every post into memory at once.
            // Mirrors the eager URL service's exclude list at
            // services/url/config.js.
            sinon.assert.calledWith(fetchAll, sinon.match({
                modelName: 'Post',
                filter: 'status:published+type:post',
                exclude: sinon.match.array
                    .contains(['mobiledoc', 'lexical', 'html', 'plaintext'])
            }));
            sinon.assert.calledWith(fetchAll, sinon.match({
                modelName: 'Post',
                filter: 'status:published+type:page',
                exclude: sinon.match.array
                    .contains(['mobiledoc', 'lexical', 'html', 'plaintext'])
            }));
        });

        it('queries tags and authors with visibility:public + shouldHavePosts to mirror the eager URL service', async function () {
            getUrlForResource.returns('http://example.com/x/');

            await makeLazyManager().ensurePopulatedFromDatabase();

            // shouldHavePosts at the raw_knex layer is the gate that the
            // TagPublic/Author scoped models used to apply. Without it,
            // tags/users with no published posts would appear in the
            // sitemap (and in particular staff User accounts could be
            // exposed by author-slug guessing).
            sinon.assert.calledWith(fetchAll, sinon.match({
                modelName: 'Tag',
                filter: 'visibility:public',
                shouldHavePosts: {joinTo: 'tag_id', joinTable: 'posts_tags'}
            }));
            sinon.assert.calledWith(fetchAll, sinon.match({
                modelName: 'User',
                filter: 'visibility:public',
                shouldHavePosts: {joinTo: 'author_id', joinTable: 'posts_authors'}
            }));
        });

        it('skips resources whose URL would be /404/', async function () {
            fetchAll.withArgs(postsMatcher).resolves([
                {id: 'p1', slug: 'good', type: 'post'},
                {id: 'p2', slug: 'orphan', type: 'post'}
            ]);

            getUrlForResource.callsFake((resource) => {
                return resource.id === 'p1' ? 'http://example.com/good/' : '/404/';
            });

            const manager = makeLazyManager();
            await manager.ensurePopulatedFromDatabase();

            sinon.assert.calledWith(PostGenerator.prototype.addUrl, 'http://example.com/good/', sinon.match({id: 'p1'}));
            const p2Calls = PostGenerator.prototype.addUrl.getCalls().filter(c => c.args[1] && c.args[1].id === 'p2');
            assert.equal(p2Calls.length, 0, 'p2 should be skipped because its URL is /404/');
        });

        it('a settled stale populate does not clobber a successor populate handle', async function () {
            // T1 starts populate (slow), T1 awaits DB.
            // routers.reset fires → _populating cleared, generation bumped.
            // T2 starts populate (also slow) → owns _populating now.
            // T1 finally settles. Bug: T1's `.then` would set _populating=null,
            // orphaning T2 and letting a T3 race in alongside T2.
            // Fix: only clear _populating if it still points to T1's promise.
            let unblockT1;
            let unblockT2;
            fetchAll.withArgs(postsMatcher)
                .onFirstCall().returns(new Promise((resolve) => {
                    unblockT1 = () => resolve([]);
                }))
                .onSecondCall().returns(new Promise((resolve) => {
                    unblockT2 = () => resolve([]);
                }));
            getUrlForResource.returns('http://example.com/x/');

            const manager = makeLazyManager();

            const t1 = manager.ensurePopulatedFromDatabase();
            const resetHandlers = events.on
                .getCalls()
                .filter(c => c.args[0] === 'routers.reset')
                .map(c => c.args[1]);
            resetHandlers.forEach(handler => handler());

            const t2 = manager.ensurePopulatedFromDatabase();
            assertExists(manager._populating, 'T2 must own the populate handle after reset');
            const t2Handle = manager._populating;

            // T1 settles before T2. The buggy version null'd _populating here.
            unblockT1();
            await t1;
            assert.equal(
                manager._populating,
                t2Handle,
                'T1 settling must not clobber T2\'s in-flight populate handle'
            );

            unblockT2();
            await t2;
        });

        it('routers.reset during a populate cancels the populate via the generation token', async function () {
            // The posts fetchAll call hangs until we explicitly resolve it,
            // simulating a slow DB load that races with a routes.yaml reload.
            let unblockPopulate;
            fetchAll.withArgs(postsMatcher)
                .returns(new Promise((resolve) => {
                    unblockPopulate = () => resolve([]);
                }));
            getUrlForResource.returns('http://example.com/x/');

            const manager = makeLazyManager();

            const inFlight = manager.ensurePopulatedFromDatabase();
            // The outer suite has stubbed events.on; the manager registered
            // its routers.reset handler via that stub. Locate and invoke it.
            const resetHandlers = events.on
                .getCalls()
                .filter(c => c.args[0] === 'routers.reset')
                .map(c => c.args[1]);
            resetHandlers.forEach(handler => handler());

            unblockPopulate();
            await inFlight;

            // Behavioural assertion: a subsequent ensurePopulatedFromDatabase
            // must re-issue the DB queries because the previous populate's
            // result was invalidated by the routers.reset. (Asserting on the
            // private `_populated` flag would couple to internal state.)
            const callsBefore = fetchAll.callCount;
            await manager.ensurePopulatedFromDatabase();
            assert.ok(
                fetchAll.callCount > callsBefore,
                'A reset mid-populate must invalidate the in-flight result so the next call re-queries'
            );
        });
    });
});
