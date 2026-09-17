const sinon = require('sinon');
const assert = require('node:assert/strict');
const { setImmediate: yieldToEventLoop } = require('node:timers/promises');
const { assertExists } = require('../../../../utils/assertions');

// Stuff we are testing
const routingEvents = require('../../../../../core/frontend/services/routing/events');
const urlUtils = require('../../../../../core/shared/url-utils').default;

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

    // The index is built from the url service on first read, so even the
    // legacy render tests need one injected.
    return new SiteMapManager({
      posts: posts,
      pages: pages,
      tags: tags,
      authors: authors,
      urlService: {
        getRoutableResources: async () => [],
        getUrlForResource: () => '/x/',
      },
      // Server events come through the proxy's narrow surface in
      // production; injected here like the url service
      serverEvents: {
        on: (eventName, callback) => {
          eventsToRemember[eventName] = callback;
        },
      },
    });
  };

  beforeAll(function () {
    eventsToRemember = {};

    // @NOTE: the pattern of faking event call is not great, we should be
    //        ideally testing on real events instead of faking them
    // RouteRegistered / RoutesReset are frontend-internal routing events
    sinon.stub(routingEvents, 'on').callsFake(function (eventName, callback) {
      eventsToRemember[eventName] = callback;
    });

    sinon.stub(PostGenerator.prototype, 'getXml');
    sinon.stub(PostGenerator.prototype, 'addUrl');
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
      assert.equal(Object.keys(eventsToRemember).length, 3);
      assertExists(eventsToRemember.RouteRegistered);
      assertExists(eventsToRemember.RoutesReset);
      assertExists(eventsToRemember['site.changed']);
    });

    describe('build path: the index is built from routable resources on first read', function () {
      let sandbox;
      let urlService;
      let fetchStub;
      let getUrlForResource;

      function makeManager(options = {}) {
        return new SiteMapManager({
          ...options,
          posts: new PostGenerator(),
          pages: new PageGenerator(),
          tags: new TagGenerator(),
          authors: new UserGenerator(),
          urlService,
          serverEvents: {
            on: (eventName, callback) => {
              eventsToRemember[eventName] = callback;
            },
          },
        });
      }

      // The absolute URL is derived from the domain path the event
      // carries, so the expectation is computed the same way.
      const aboutUrl = urlUtils.createUrl('/about/', true);

      function emitAboutRouter() {
        eventsToRemember.RouteRegistered({
          type: 'StaticRoutesRouter',
          id: 'sr1',
          path: '/about/',
        });
      }

      beforeEach(function () {
        sandbox = sinon.createSandbox();
        urlService = {
          getRoutableResources: sinon.stub().resolves([]),
          getUrlForResource: sinon.stub().returns('http://example.com/x/'),
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

      it('builds the index from routable resources, skipping /404/ URLs', async function () {
        fetchStub.withArgs('posts').resolves([
          { id: 'p1', slug: 'hello' },
          { id: 'p2', slug: 'orphan' },
        ]);
        fetchStub.withArgs('pages').resolves([{ id: 'pg1', slug: 'about' }]);
        fetchStub.withArgs('tags').resolves([{ id: 't1', slug: 'food' }]);
        fetchStub.withArgs('authors').resolves([{ id: 'u1', slug: 'jane' }]);
        getUrlForResource.callsFake(function (resource) {
          if (resource.id === 'p2') {
            return urlUtils.createUrl('/404/', true);
          }
          return `http://example.com/${resource.type}/${resource.slug}/`;
        });

        await makeManager().getSiteMapXml('posts');

        sinon.assert.calledWith(
          PostGenerator.prototype.addUrl,
          'http://example.com/posts/hello/',
          sinon.match({ id: 'p1' }),
        );
        sinon.assert.calledWith(
          PageGenerator.prototype.addUrl,
          'http://example.com/pages/about/',
          sinon.match({ id: 'pg1' }),
        );
        sinon.assert.calledWith(
          TagGenerator.prototype.addUrl,
          'http://example.com/tags/food/',
          sinon.match({ id: 't1' }),
        );
        sinon.assert.calledWith(
          UserGenerator.prototype.addUrl,
          'http://example.com/authors/jane/',
          sinon.match({ id: 'u1' }),
        );

        const orphanCalls = PostGenerator.prototype.addUrl
          .getCalls()
          .filter((call) => call.args[1] && call.args[1].id === 'p2');
        assert.equal(orphanCalls.length, 0, 'p2 resolves to /404/ and must not enter the sitemap');
      });

      it('keeps a real resource whose slug is 404, dropping only the exact sentinel', async function () {
        fetchStub.withArgs('tags').resolves([{ id: 't404', slug: '404' }]);
        fetchStub.withArgs('posts').resolves([{ id: 'p1', slug: 'orphan' }]);
        getUrlForResource.callsFake(function (resource) {
          if (resource.id === 't404') {
            return `${urlUtils.urlFor('home', true)}tag/404/`;
          }
          return urlUtils.createUrl('/404/', true);
        });

        await makeManager().getSiteMapXml('posts');

        sinon.assert.calledWith(
          TagGenerator.prototype.addUrl,
          sinon.match(/\/tag\/404\/$/),
          sinon.match({ id: 't404' }),
        );
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

      it('drops the index generator cache whenever the index is invalidated', async function () {
        const siteMapManager = makeManager();
        await siteMapManager.getIndexXml();

        // Stand in for a rendered index; the real getXml is stubbed here.
        siteMapManager.index.siteMapContent = '<sitemapindex/>';

        eventsToRemember['site.changed']();

        assert.equal(
          siteMapManager.index.siteMapContent,
          null,
          'a cached index would outlive the content it describes',
        );
      });

      it('builds into fresh generators so a rebuild holds no dropped resources', async function () {
        PostGenerator.prototype.addUrl.callThrough();
        try {
          fetchStub
            .withArgs('posts')
            .onFirstCall()
            .resolves([
              { id: 'p1', slug: 'kept' },
              { id: 'p2', slug: 'unpublished' },
            ])
            .onSecondCall()
            .resolves([{ id: 'p1', slug: 'kept' }]);
          const siteMapManager = makeManager();
          await siteMapManager.getSiteMapXml('posts');
          const firstPosts = siteMapManager.posts;

          eventsToRemember['site.changed']();
          await siteMapManager.getSiteMapXml('posts');

          assert.notEqual(siteMapManager.posts, firstPosts);
          assert.deepEqual([...siteMapManager.posts.nodeLookup.keys()], ['p1']);
        } finally {
          PostGenerator.prototype.addUrl.resetBehavior();
        }
      });

      it('swaps the index generator with the generators it counts', async function () {
        const siteMapManager = makeManager();
        await siteMapManager.getIndexXml();
        eventsToRemember['site.changed']();
        await siteMapManager.getIndexXml();

        const { types } = siteMapManager.index;
        assert.equal(types.posts, siteMapManager.posts);
        assert.equal(types.pages, siteMapManager.pages);
        assert.equal(types.tags, siteMapManager.tags);
        assert.equal(types.authors, siteMapManager.authors);
        assert.equal(siteMapManager.users, siteMapManager.authors);
      });

      it('yields during a build without exposing the generators being built', async function () {
        fetchStub.withArgs('posts').resolves([
          { id: 'p1', slug: 'a' },
          { id: 'p2', slug: 'b' },
          { id: 'p3', slug: 'c' },
        ]);
        // A zero slice yields after every resource.
        const siteMapManager = makeManager({ buildSliceMs: 0 });
        const livePosts = siteMapManager.posts;
        const livePages = siteMapManager.pages;
        const reader = siteMapManager.getSiteMapXml('posts');

        await yieldToEventLoop();
        await yieldToEventLoop();
        sinon.assert.called(PostGenerator.prototype.addUrl);
        assert.equal(siteMapManager.posts, livePosts);
        assert.equal(siteMapManager.pages, livePages);

        await reader;
        assert.notEqual(siteMapManager.posts, livePosts);
      });

      it('replays static/collection route entries into every rebuild', async function () {
        const siteMapManager = makeManager();
        emitAboutRouter();
        PageGenerator.prototype.addUrl.resetHistory();

        await siteMapManager.getSiteMapXml('posts');

        // The expectation is computed the same way the subscriber
        // computes it, so anchor its shape: the domain path the event
        // carries has to reach the sitemap absolutised.
        assert.match(aboutUrl, /^https?:\/\/.+\/about\/$/);
        // RouteRegistered only fires at boot and routes reload; the entry
        // must survive the apply-phase generator reset.
        sinon.assert.calledWith(
          PageGenerator.prototype.addUrl,
          aboutUrl,
          sinon.match({ id: 'sr1' }),
        );
      });

      it('rebuilds after a router registers, so a reload window cannot pin a routerless index', async function () {
        const siteMapManager = makeManager();
        await siteMapManager.getSiteMapXml('posts');
        sinon.assert.callCount(fetchStub, 4);

        emitAboutRouter();

        await siteMapManager.getSiteMapXml('posts');
        sinon.assert.callCount(fetchStub, 8);
      });

      it('forgets recorded route entries when RoutesReset fires', async function () {
        const siteMapManager = makeManager();
        emitAboutRouter();

        eventsToRemember.RoutesReset();
        PageGenerator.prototype.addUrl.resetHistory();
        await siteMapManager.getSiteMapXml('posts');

        // The routers re-register right after a reset and refill the
        // list; a stale entry here would resurrect a deleted route.
        sinon.assert.neverCalledWith(
          PageGenerator.prototype.addUrl,
          aboutUrl,
          sinon.match({ id: 'sr1' }),
        );
      });

      it('abandons a build invalidated mid-apply and serves the rebuild instead', async function () {
        fetchStub.withArgs('posts').callsFake(async () => [
          { id: 'p1', slug: 'a' },
          { id: 'p2', slug: 'b' },
        ]);
        const siteMapManager = makeManager({ buildSliceMs: 0 });
        const livePosts = siteMapManager.posts;
        const reader = siteMapManager.getSiteMapXml('posts');

        // Wait for the first yield inside the apply loop, then change the
        // site. A router registering mid-build counts too.
        while (!PostGenerator.prototype.addUrl.called) {
          await yieldToEventLoop();
        }
        assert.equal(fetchStub.callCount, 4);
        emitAboutRouter();

        await reader;
        sinon.assert.callCount(fetchStub, 8);
        assert.notEqual(siteMapManager.posts, livePosts);
        sinon.assert.calledWith(
          PageGenerator.prototype.addUrl,
          aboutUrl,
          sinon.match({ id: 'sr1' }),
        );
      });

      it('fails a read with a 503 when every build attempt is invalidated, and rebuilds on the next read', async function () {
        let keepChanging = true;
        fetchStub.withArgs('posts').callsFake(async () => {
          if (keepChanging) {
            eventsToRemember['site.changed']();
          }
          return [];
        });

        const siteMapManager = makeManager();

        // Never serve pre-invalidation data: a stale 200 would be
        // pinned by the CDN for the full cache maxAge. A 503 is
        // retried by crawlers and stored by nobody.
        await assert.rejects(siteMapManager.getSiteMapXml('posts'), (err) => {
          assert.equal(err.statusCode, 503);
          assert.equal(err.code, 'SITEMAP_BUILD_SUPERSEDED');
          return true;
        });
        sinon.assert.callCount(fetchStub, 12);

        keepChanging = false;
        await siteMapManager.getSiteMapXml('posts');
        sinon.assert.callCount(fetchStub, 16);
      });

      it('rejects readers when the build fails and retries on the next read', async function () {
        fetchStub
          .withArgs('tags')
          .onFirstCall()
          .rejects(new Error('connection lost'))
          .onSecondCall()
          .resolves([]);

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
