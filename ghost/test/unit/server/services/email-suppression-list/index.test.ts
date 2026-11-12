import assert from 'node:assert/strict';
import sinon from 'sinon';

const ROOT_PATH = require.resolve('../../../../../core/server/services/email-suppression-list');
const SERVICE_PATH =
  require.resolve('../../../../../core/server/services/email-suppression-list/service');
const DomainEvents = require(require.resolve('@tryghost/domain-events', { paths: [ROOT_PATH] }));
const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');
const models = require('../../../../../core/server/models');
const MailgunClient = require('../../../../../core/server/lib/mailgun/mailgun-client');
const MailgunEmailSuppressionList = require('../../../../../core/server/services/email-suppression-list/mailgun-email-suppression-list');

describe('Email suppression list service root', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('exports the eager instance from service.js as the root', function () {
    const root = require(ROOT_PATH);

    assert.equal(root, require(SERVICE_PATH));
    assert.ok(root instanceof MailgunEmailSuppressionList);
    assert.equal(root.Suppression, models.Suppression);
    assert.ok(root.apiClient instanceof MailgunClient);
    // Retained across requires: consumers capture this one object.
    assert.equal(require(ROOT_PATH), root);
  });

  it('reads the provider configuration from config and settings for each operation', function () {
    const root = require(ROOT_PATH);
    const getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('bulkEmail').returns(undefined);
    const settings: Record<string, string | undefined> = {};
    sandbox.stub(settingsCache, 'get').callsFake((key: unknown) => settings[key as string]);

    assert.equal(root.apiClient.isConfigured(), false);

    settings.mailgun_api_key = 'key';
    settings.mailgun_domain = 'mg.example.com';
    settings.mailgun_base_url = 'https://api.mailgun.net/v3';
    assert.equal(root.apiClient.isConfigured(), true);

    getConfig
      .withArgs('bulkEmail')
      .returns({ mailgun: { apiKey: 'k', domain: 'd', baseUrl: 'https://api.eu.mailgun.net/v3' } });
    delete settings.mailgun_api_key;
    assert.equal(root.apiClient.isConfigured(), true);
  });

  describe('a freshly evaluated root', function () {
    let originalRoot: NodeJS.Module | undefined;
    let originalService: NodeJS.Module | undefined;

    beforeEach(function () {
      // Only cold-load the root and service. Restore the cached entries afterwards
      // so retained consumers keep their instance.
      originalRoot = require.cache[ROOT_PATH];
      originalService = require.cache[SERVICE_PATH];
      delete require.cache[ROOT_PATH];
      delete require.cache[SERVICE_PATH];
    });

    afterEach(function () {
      require.cache[ROOT_PATH] = originalRoot;
      require.cache[SERVICE_PATH] = originalService;
    });

    it('subscribes to nothing until init', function () {
      const subscribe = sandbox.stub(DomainEvents, 'subscribe');

      const root = require(ROOT_PATH);

      assert.notEqual(root, originalRoot?.exports);
      sinon.assert.notCalled(subscribe);
    });

    it('serves reads and removals before init through the injected model and client', async function () {
      const root = require(ROOT_PATH);
      const created = new Date('2020-01-01T00:00:00Z');
      const findOne = sandbox
        .stub(models.Suppression, 'findOne')
        .resolves({ get: (key: string) => ({ reason: 'spam', created_at: created })[key] });
      const destroy = sandbox.stub(models.Suppression, 'destroy').resolves();
      const removals = (['removeBounce', 'removeComplaint', 'removeUnsubscribe'] as const).map(
        (method) => sandbox.stub(root.apiClient, method).resolves(true),
      );

      const data = await root.getSuppressionData('a@example.com');
      assert.deepEqual(
        { ...data },
        { suppressed: true, info: { reason: 'spam', timestamp: created } },
      );
      sinon.assert.calledOnceWithExactly(findOne, { email: 'a@example.com' });

      assert.equal(await root.removeEmail('a@example.com'), true);
      for (const removal of removals) {
        sinon.assert.calledOnceWithExactly(removal, 'a@example.com');
      }
      sinon.assert.calledOnce(destroy);
    });
  });
});
