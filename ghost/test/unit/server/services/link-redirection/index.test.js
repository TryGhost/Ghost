const assert = require('node:assert/strict');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');
const events = require('../../../../../core/server/lib/common/events');
const config = require('../../../../../core/shared/config');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const models = require('../../../../../core/server/models');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;

describe('Link redirection service root', function () {
  const sandbox = sinon.createSandbox();
  const modulePath = require.resolve('../../../../../core/server/services/link-redirection');
  let savedModule;
  let previousListeners;
  let root;
  let getConfig;
  let getAdapter;
  let cache;
  let findOne;
  let dispatch;

  beforeEach(function () {
    // The unit project shares one module registry, so each test loads a fresh
    // wrapper and restores the original for the files that captured it.
    savedModule = require.cache[modulePath];
    delete require.cache[modulePath];
    previousListeners = events.listeners('site.changed');
    getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('hostSettings:linkRedirectsPublicCache:enabled').returns(false);
    const cachedLinks = new Map();
    cache = {
      get: sandbox.stub().callsFake(async (key) => cachedLinks.get(key)),
      set: sandbox.stub().callsFake((key, value) => cachedLinks.set(key, value)),
      reset: sandbox.stub().callsFake(() => cachedLinks.clear()),
    };
    getAdapter = sandbox.stub(adapterManager, 'getAdapter').returns(cache);
    sandbox.stub(urlUtils, 'getSiteUrl').returns('https://publication.example/blog/');
    sandbox
      .stub(urlUtils, 'urlFor')
      .withArgs('home', true)
      .returns('https://publication.example/blog/');
    sandbox
      .stub(urlUtils, 'relativeToAbsolute')
      .callsFake((path) => new URL(path, 'https://publication.example').href);
    sandbox
      .stub(urlUtils, 'absoluteToRelative')
      .callsFake((url) => new URL(url).pathname.replace(/^\/blog/, ''));
    const values = {
      from: '/r/link',
      to: 'https://destination.example/article',
      created_at: new Date('2030-01-01'),
      updated_at: new Date('2030-01-01'),
      automation_action_revision_id: 'automation-revision-id',
    };
    findOne = sandbox.stub(models.Redirect, 'findOne').resolves({
      id: '507f1f77bcf86cd799439011',
      get: (property) => values[property],
    });
    dispatch = sandbox.stub(DomainEvents, 'dispatch');
    root = require('../../../../../core/server/services/link-redirection').default;
  });

  afterEach(function () {
    for (const listener of ownedListeners()) {
      events.removeListener('site.changed', listener);
    }
    sandbox.restore();
    delete require.cache[modulePath];
    if (savedModule) {
      require.cache[modulePath] = savedModule;
    }
  });

  function ownedListeners() {
    return events
      .listeners('site.changed')
      .filter((listener) => !previousListeners.includes(listener));
  }

  async function request() {
    const res = { setHeader: sandbox.stub(), redirect: sandbox.stub() };
    const next = sandbox.stub();
    await root.service.handleRequest(
      { method: 'GET', originalUrl: '/blog/r/link?m=member' },
      res,
      next,
    );
    return { res, next };
  }

  it('rejects service and repository access before init', function () {
    assert.throws(() => root.service, /Link redirection used before init/);
    assert.throws(() => root.extras.linkRedirectRepository(), /Link redirection used before init/);
  });

  it('retains the first service and repository across repeated init', async function () {
    await root.init();
    const service = root.service;
    const linkRedirectRepository = root.extras.linkRedirectRepository();

    await root.init();

    assert.equal(root.service, service);
    assert.equal(root.extras.linkRedirectRepository(), linkRedirectRepository);
  });

  it('does not resolve a cache adapter or listen for site changes when caching is disabled', async function () {
    await root.init();

    sinon.assert.notCalled(getAdapter);
    assert.equal(ownedListeners().length, 0);
  });

  it('redirects a stored link and dispatches its redirect event', async function () {
    await root.init();

    const { res, next } = await request();

    sinon.assert.calledOnceWithExactly(findOne, { from: '/r/link' }, {});
    sinon.assert.calledOnceWithExactly(res.redirect, 'https://destination.example/article');
    sinon.assert.calledOnceWithExactly(res.setHeader, 'X-Robots-Tag', 'noindex, nofollow');
    sinon.assert.notCalled(next);
    sinon.assert.calledOnce(dispatch);
    const { url, link } = dispatch.firstCall.args[0].data;
    assert.equal(url.href, 'https://publication.example/blog/r/link?m=member');
    assert.equal(link.link_id.toHexString(), '507f1f77bcf86cd799439011');
  });

  it('builds slug URLs under the configured site URL', async function () {
    await root.init();
    findOne.resolves(null);

    const url = await root.service.getSlugUrl();

    assert.match(url.href, /^https:\/\/publication\.example\/blog\/r\/[0-9a-f]{8}$/);
  });

  it('resolves the configured cache adapter once and serves repeated requests from it', async function () {
    getConfig.withArgs('hostSettings:linkRedirectsPublicCache:enabled').returns(true);
    await root.init();

    const responses = [await request(), await request()];

    sinon.assert.calledOnceWithExactly(getAdapter, 'cache:linkRedirectsPublic');
    sinon.assert.calledOnce(findOne);
    assert.deepEqual(cache.get.args, [['/r/link'], ['/r/link']]);
    for (const { res, next } of responses) {
      sinon.assert.calledOnceWithExactly(res.redirect, 'https://destination.example/article');
      sinon.assert.notCalled(next);
    }
  });

  it('dispatches the same link identifiers from a database miss and a cache hit', async function () {
    getConfig.withArgs('hostSettings:linkRedirectsPublicCache:enabled').returns(true);
    await root.init();

    await request();
    await request();

    sinon.assert.calledOnce(findOne);
    sinon.assert.calledTwice(dispatch);
    for (const call of dispatch.getCalls()) {
      const { link } = call.args[0].data;
      assert.equal(link.link_id.toHexString(), '507f1f77bcf86cd799439011');
      assert.equal(link.automationActionRevisionId, 'automation-revision-id');
      assert.equal(link.to.href, 'https://destination.example/article');
    }
  });

  it('resets the cache through one site.changed listener', async function () {
    getConfig.withArgs('hostSettings:linkRedirectsPublicCache:enabled').returns(true);
    await root.init();

    const owned = ownedListeners();
    assert.equal(owned.length, 1);
    owned[0]();

    sinon.assert.calledOnce(cache.reset);
  });

  it('publishes nothing when the cache adapter cannot be resolved and allows an explicit retry', async function () {
    getConfig.withArgs('hostSettings:linkRedirectsPublicCache:enabled').returns(true);
    const failure = new Error('Cache unavailable');
    getAdapter.throws(failure);

    await assert.rejects(root.init(), (error) => error === failure);

    assert.throws(() => root.service, /Link redirection used before init/);
    assert.throws(() => root.extras.linkRedirectRepository(), /Link redirection used before init/);
    assert.equal(ownedListeners().length, 0);

    getAdapter.returns(cache);
    await root.init();
    const { res } = await request();

    sinon.assert.calledOnceWithExactly(res.redirect, 'https://destination.example/article');
  });

  it('passes a lookup failure to next without redirecting or dispatching', async function () {
    await root.init();
    const failure = new Error('Redirect lookup failed');
    findOne.rejects(failure);

    const { res, next } = await request();

    sinon.assert.calledOnceWithExactly(next, failure);
    sinon.assert.notCalled(res.redirect);
    sinon.assert.notCalled(dispatch);
  });
});
