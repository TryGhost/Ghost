import assert from 'node:assert/strict';
import sinon from 'sinon';
import type emailSuppressionListRoot from '../../../../../core/server/services/email-suppression-list';

const ROOT_PATH = require.resolve('../../../../../core/server/services/email-suppression-list');
const DomainEvents = require(require.resolve('@tryghost/domain-events', { paths: [ROOT_PATH] }));
const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');
const models = require('../../../../../core/server/models');
const MailgunClient = require('../../../../../core/server/lib/mailgun/mailgun-client');
const MailgunEmailSuppressionList = require('../../../../../core/server/services/email-suppression-list/mailgun-email-suppression-list');
const {
  EmailBouncedEvent,
} = require('../../../../../core/server/services/email-service/events/email-bounced-event');
const {
  SpamComplaintEvent,
} = require('../../../../../core/server/services/email-service/events/spam-complaint-event');
const { IncorrectUsageError } = require('@tryghost/errors');

describe('Email suppression list service root', function () {
  let sandbox: sinon.SinonSandbox;
  let originalRoot: NodeJS.Module | undefined;
  let root: typeof emailSuppressionListRoot;
  let subscribe: sinon.SinonStub;

  beforeEach(function () {
    // Only cold-load the root. Restore the cached entry afterwards so retained
    // consumers keep their instance.
    originalRoot = require.cache[ROOT_PATH];
    delete require.cache[ROOT_PATH];
    sandbox = sinon.createSandbox();
    // Capture handlers rather than installing them on the shared bus.
    subscribe = sandbox.stub(DomainEvents, 'subscribe');
    root = require(ROOT_PATH).default;
  });

  afterEach(function () {
    sandbox.restore();
    require.cache[ROOT_PATH] = originalRoot;
  });

  it('subscribes to nothing and throws when the service is read before init', function () {
    sinon.assert.notCalled(subscribe);
    assert.throws(() => root.service, IncorrectUsageError);
  });

  it('builds one provider with the shared model and Mailgun client, then subscribes', async function () {
    await root.init();

    const service = root.service;
    assert.ok(service instanceof MailgunEmailSuppressionList);
    assert.equal(service.Suppression, models.Suppression);
    assert.ok(service.apiClient instanceof MailgunClient);
    assert.deepEqual(
      subscribe.getCalls().map((call) => call.args[0]),
      [EmailBouncedEvent, SpamComplaintEvent],
    );
  });

  it('retains the instance and its subscriptions across repeated init', async function () {
    await root.init();
    const service = root.service;
    await root.init();

    assert.equal(root.service, service);
    sinon.assert.calledTwice(subscribe);
  });

  it('reads the provider configuration from config and settings for each operation', async function () {
    await root.init();
    const getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('bulkEmail').returns(undefined);
    const settings: Record<string, string | undefined> = {};
    sandbox.stub(settingsCache, 'get').callsFake((key: unknown) => settings[key as string]);
    const client = root.service.apiClient;

    assert.equal(client.isConfigured(), false);

    settings.mailgun_api_key = 'key';
    settings.mailgun_domain = 'mg.example.com';
    settings.mailgun_base_url = 'https://api.mailgun.net/v3';
    assert.equal(client.isConfigured(), true);

    getConfig.withArgs('bulkEmail').returns({
      mailgun: { apiKey: 'k', domain: 'd', baseUrl: 'https://api.eu.mailgun.net/v3' },
    });
    delete settings.mailgun_api_key;
    assert.equal(client.isConfigured(), true);
  });

  it('serves reads and removals through the injected model and client', async function () {
    await root.init();
    const service = root.service;
    const created = new Date('2020-01-01T00:00:00Z');
    const findOne = sandbox
      .stub(models.Suppression, 'findOne')
      .resolves({ get: (key: string) => ({ reason: 'spam', created_at: created })[key] });
    const destroy = sandbox.stub(models.Suppression, 'destroy').resolves();
    const removals = (['removeBounce', 'removeComplaint', 'removeUnsubscribe'] as const).map(
      (method) => sandbox.stub(service.apiClient, method).resolves(true),
    );

    const data = await service.getSuppressionData('a@example.com');
    assert.deepEqual(
      { ...data },
      { suppressed: true, info: { reason: 'spam', timestamp: created } },
    );
    sinon.assert.calledOnceWithExactly(findOne, { email: 'a@example.com' });

    assert.equal(await service.removeEmail('a@example.com'), true);
    for (const removal of removals) {
      sinon.assert.calledOnceWithExactly(removal, 'a@example.com');
    }
    sinon.assert.calledOnce(destroy);
  });

  it('deactivates a partial subscription when init fails and subscribes again on retry', async function () {
    const failure = new Error('subscribe failed');
    subscribe.onSecondCall().throws(failure);
    const add = sandbox.stub(models.Suppression, 'add').resolves();
    const dispatch = sandbox.stub(DomainEvents, 'dispatch');

    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root.service, IncorrectUsageError);
    const bounce = EmailBouncedEvent.create({
      email: 'a@example.com',
      memberId: 'member-id',
      emailId: 'email-id',
      emailRecipientId: 'recipient-id',
      error: { code: 605, message: 'suppressed' },
    });
    await subscribe.firstCall.args[1](bounce);
    sinon.assert.notCalled(add);

    await root.init();
    sinon.assert.callCount(subscribe, 4);
    assert.equal(subscribe.getCall(2).args[0], EmailBouncedEvent);
    await subscribe.getCall(2).args[1](bounce);
    sinon.assert.calledOnce(add);
    sinon.assert.calledOnce(dispatch);
  });
});
