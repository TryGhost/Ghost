const assert = require('node:assert/strict');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');
const events = require('../../../../../core/server/lib/common/events');
const config = require('../../../../../core/shared/config');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const models = require('../../../../../core/server/models');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const root = require('../../../../../core/server/services/link-redirection').default;
const { openServices } = require('../../../../utils/services');
const { listening } = require('../../../../../bootstrap/services');

// Opening the services registers every root that declares listeners, and other roots listen for
// site.changed too. They are made inert, so that only this root reacts to an event.
function silenceOtherRoots(sandbox) {
  for (const named of listening) {
    const other = named();
    if (other !== root) {
      sandbox.stub(other, 'create').returns({});
      for (const listener of other.listeners) {
        sandbox.stub(listener, 'handle');
      }
    }
  }
}

describe('Link redirection service root', function () {
  const sandbox = sinon.createSandbox();
  let getConfig;
  let getAdapter;
  let cache;
  let findOne;
  let dispatch;

  beforeEach(function () {
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
    silenceOtherRoots(sandbox);
    openServices();
  });

  afterEach(function () {
    sandbox.restore();
  });

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

  it('keeps one service, and hands link tracking the repository that service was built with', function () {
    const service = root.service;
    const linkRedirectRepository = root.extras.linkRedirectRepository();

    assert.equal(typeof linkRedirectRepository.resetCache, 'function');
    assert.equal(root.service, service);
    assert.equal(root.extras.linkRedirectRepository(), linkRedirectRepository);
  });

  it('does not resolve a cache adapter or reset a cache on site changes when caching is disabled', function () {
    assert.ok(root.service);

    events.emit('site.changed');

    sinon.assert.notCalled(getAdapter);
    sinon.assert.notCalled(cache.reset);
  });

  it('redirects a stored link and dispatches its redirect event', async function () {
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
    findOne.resolves(null);

    const url = await root.service.getSlugUrl();

    assert.match(url.href, /^https:\/\/publication\.example\/blog\/r\/[0-9a-f]{8}$/);
  });

  it('resolves the configured cache adapter once and serves repeated requests from it', async function () {
    getConfig.withArgs('hostSettings:linkRedirectsPublicCache:enabled').returns(true);
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

  it('resets the cache once for each site.changed event', async function () {
    getConfig.withArgs('hostSettings:linkRedirectsPublicCache:enabled').returns(true);
    await request();
    await request();
    sinon.assert.calledOnce(findOne);

    events.emit('site.changed');

    sinon.assert.calledOnce(cache.reset);
    await request();
    sinon.assert.calledTwice(findOne);
  });

  it('builds the service for a site.changed event that arrives before its first use', function () {
    getConfig.withArgs('hostSettings:linkRedirectsPublicCache:enabled').returns(true);

    events.emit('site.changed');

    sinon.assert.calledOnceWithExactly(getAdapter, 'cache:linkRedirectsPublic');
    sinon.assert.calledOnce(cache.reset);
    assert.ok(root.service);
    sinon.assert.calledOnce(getAdapter);
  });

  it('fails the first use when the cache adapter cannot be resolved, and builds on a later use', async function () {
    getConfig.withArgs('hostSettings:linkRedirectsPublicCache:enabled').returns(true);
    const failure = new Error('Cache unavailable');
    getAdapter.throws(failure);

    assert.throws(
      () => root.service,
      (error) => error === failure,
    );
    assert.throws(
      () => root.extras.linkRedirectRepository(),
      (error) => error === failure,
    );

    getAdapter.returns(cache);
    const { res } = await request();

    sinon.assert.calledOnceWithExactly(res.redirect, 'https://destination.example/article');
  });

  it('passes a lookup failure to next without redirecting or dispatching', async function () {
    const failure = new Error('Redirect lookup failed');
    findOne.rejects(failure);

    const { res, next } = await request();

    sinon.assert.calledOnceWithExactly(next, failure);
    sinon.assert.notCalled(res.redirect);
    sinon.assert.notCalled(dispatch);
  });
});
