import assert from 'node:assert/strict';
import sinon from 'sinon';

const { startGhost, configUtils } = require('../utils/e2e-framework');
// Required, so that these are the application and the roots the server uses.
const application: typeof import('../../bootstrap/app').default =
  require('../../bootstrap/app').default;
const giftLinks = require('../../core/server/services/gift-links').default;
const tagsPublic = require('../../core/server/services/tags-public').default;
const staff = require('../../core/server/services/staff').default;
const memberAttribution = require('../../core/server/services/member-attribution').default;
const events = require('../../core/server/lib/common/events');
const adapterManager = require('../../core/server/services/adapter-manager').default;
const MemoryCache = require('../../core/server/adapters/cache/MemoryCache');
const sentry = require('../../core/shared/sentry');

const boot = () => startGhost({ backend: true, frontend: false, server: false });

// What the service definitions do in a real Ghost, started more than once in
// one process as the test suites do. The rules themselves are covered in
// test/unit/foundry/services.test.ts.
describe('Service definitions in a booted Ghost', function () {
  const sandbox = sinon.createSandbox();

  beforeAll(function () {
    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
  });

  afterEach(async function () {
    await application.stop();
    sandbox.restore();
    await configUtils.restore();
  });

  it('builds a service on first use, and gives the next boot its own', async function () {
    await boot();
    const first = giftLinks.service;
    assert.equal(giftLinks.service, first);
    assert.equal(application.services.get(giftLinks), first);

    await boot();
    const second = giftLinks.service;

    assert.notEqual(second, first);
    assert.equal(giftLinks.service, second);
  });

  it('refuses a service once Ghost has stopped', async function () {
    await boot();
    assert.ok(giftLinks.service);

    await application.stop();

    assert.throws(() => giftLinks.service, {
      name: 'IncorrectUsageError',
      message: /^Gift Links was used while Ghost is not started/,
    });
  });

  it('delivers an event published before anything used the service, building it then', async function () {
    configUtils.set('hostSettings:tagsPublicCache:enabled', true);
    const cache = new MemoryCache();
    const getAdapter = sandbox.stub(adapterManager, 'getAdapter').callThrough();
    getAdapter.withArgs('cache:tagsPublic').returns(cache);
    await boot();
    cache.set('key', 'value');
    assert.equal(getAdapter.withArgs('cache:tagsPublic').callCount, 0, 'boot built Tags Public');

    events.emit('site.changed');

    assert.equal(getAdapter.withArgs('cache:tagsPublic').callCount, 1);
    assert.deepEqual(cache.keys(), []);
    assert.equal(tagsPublic.service.cache, cache);
  });

  it('does not keep what one boot stubbed for the next', async function () {
    await boot();
    const stubbed = { fetchResource: async () => null };
    const real = memberAttribution.service;
    sandbox.stub(memberAttribution, 'service').get(() => stubbed);
    assert.equal(staff.service.memberAttributionService, stubbed);

    sandbox.restore();
    await boot();

    assert.notEqual(staff.service.memberAttributionService, stubbed);
    assert.equal(staff.service.memberAttributionService, memberAttribution.service);
    // Member attribution still holds its instance for the life of the process.
    assert.equal(memberAttribution.service, real);
  });
});
