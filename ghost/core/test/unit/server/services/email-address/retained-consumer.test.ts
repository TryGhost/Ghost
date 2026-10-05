import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { EmailAddressService } from '../../../../../core/server/services/email-address/email-address-service';
import { createModel } from '../email-service/utils';

const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');
const settingsHelpers = require('../../../../../core/server/services/settings-helpers');
const sentry = require('../../../../../core/shared/sentry');
const logging = require('@tryghost/logging');
const EmailRenderer = require('../../../../../core/server/services/email-service/email-renderer');
const SendingService = require('../../../../../core/server/services/email-service/sending-service');
const rootPath = require.resolve('../../../../../core/server/services/email-address');

describe('email-address retained consumers', function () {
  const sandbox = sinon.createSandbox();
  let previousModule: NodeModule | undefined;
  let root: { init(): void; service?: EmailAddressService };
  let getConfig: sinon.SinonStub;
  let getSetting: sinon.SinonStub;

  beforeEach(function () {
    // Isolate independent cases from the shared CommonJS registry. Within each
    // case, keep the same root, implementation and consumers across all changes.
    previousModule = require.cache[rootPath];
    delete require.cache[rootPath];
    root = require(rootPath);
    sandbox.stub(sentry);
    sandbox.stub(logging, 'warn');
    getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('hostSettings:managedEmail:enabled').returns(undefined);
    getConfig.withArgs('hostSettings:managedEmail:sendingDomain').returns(undefined);
    getConfig.withArgs('hostSettings:managedEmail:fallbackDomain').returns(undefined);
    getConfig.withArgs('hostSettings:managedEmail:fallbackAddress').returns(undefined);
    getConfig.withArgs('mail:from').returns('"Default" <noreply@default.example>');
    getSetting = sandbox.stub(settingsCache, 'get').callThrough();
    getSetting.withArgs('title').returns('Publication');
    getSetting.withArgs('members_support_address').returns('help@support.example');
  });

  afterEach(function () {
    sandbox.restore();
    delete require.cache[rootPath];
    if (previousModule) {
      require.cache[rootPath] = previousModule;
    }
  });

  function initialize() {
    root.init();
    assert.ok(root.service);
    return root.service;
  }

  function createRenderer(service: EmailAddressService) {
    // These are the real dependencies retained by EmailServiceWrapper's
    // renderer. Address rendering needs no database or email provider.
    return new EmailRenderer({
      settingsCache,
      settingsHelpers,
      emailAddressService: service,
    });
  }

  it('constructs once and keeps the implementation held by an existing renderer', function () {
    assert.equal(root.service, undefined);
    const service = initialize();
    const renderer = createRenderer(service);
    const newsletter = createModel({ sender_reply_to: 'newsletter' });

    assert.equal(service.managedEmailEnabled, false);
    assert.equal(service.sendingDomain, null);
    assert.equal(service.fallbackDomain, null);
    assert.equal(service.fallbackEmail, null);
    assert.equal(
      renderer.getFromAddress(null, newsletter),
      '"Publication" <noreply@default.example>',
    );

    getConfig.withArgs('mail:from').returns('"Changed" <noreply@changed.example>');
    root.init();

    assert.equal(root.service, service);
    assert.equal(require(rootPath), root);
    assert.equal(
      renderer.getFromAddress(null, newsletter),
      '"Publication" <noreply@changed.example>',
    );
  });

  it('applies managed-email and sending-domain changes to a retained renderer without reinitializing', function () {
    const service = initialize();
    const renderer = createRenderer(service);
    const newsletter = createModel({
      sender_email: 'writer@custom.example',
      sender_reply_to: 'newsletter',
    });
    const requestedFrom = '"Publication" <writer@custom.example>';
    const defaultFrom = '"Publication" <noreply@default.example>';

    assert.equal(renderer.getFromAddress(null, newsletter), requestedFrom);
    assert.equal(renderer.getReplyToAddress(null, newsletter), requestedFrom);

    getConfig.withArgs('hostSettings:managedEmail:enabled').returns(true);
    assert.equal(renderer.getFromAddress(null, newsletter), defaultFrom);
    assert.equal(renderer.getReplyToAddress(null, newsletter), requestedFrom);

    getConfig.withArgs('hostSettings:managedEmail:sendingDomain').returns('custom.example');
    assert.equal(renderer.getFromAddress(null, newsletter), requestedFrom);
    assert.equal(renderer.getReplyToAddress(null, newsletter), null);

    getConfig.withArgs('hostSettings:managedEmail:sendingDomain').returns('changed.example');
    assert.equal(renderer.getFromAddress(null, newsletter), defaultFrom);
    assert.equal(renderer.getReplyToAddress(null, newsletter), requestedFrom);

    getConfig.withArgs('hostSettings:managedEmail:enabled').returns(false);
    assert.equal(renderer.getFromAddress(null, newsletter), requestedFrom);
    assert.equal(renderer.getReplyToAddress(null, newsletter), requestedFrom);
    assert.equal(root.service, service);
  });

  it('reads default and member support addresses through the live settings helpers', function () {
    getConfig.withArgs('hostSettings:managedEmail:enabled').returns(true);
    const service = initialize();
    const renderer = createRenderer(service);
    const newsletter = createModel({
      sender_email: 'writer@custom.example',
      sender_reply_to: 'support',
    });

    assert.equal(
      renderer.getFromAddress(null, newsletter),
      '"Publication" <noreply@default.example>',
    );
    assert.equal(renderer.getReplyToAddress(null, newsletter), 'help@support.example');
    assert.equal(service.getMembersSupportAddress(), 'noreply@default.example');

    getConfig.withArgs('mail:from').returns('"Changed Default" <noreply@changed.example>');
    getSetting.withArgs('members_support_address').returns('help@changed.example');
    assert.deepEqual(service.defaultFromEmail, {
      address: 'noreply@changed.example',
      name: 'Changed Default',
    });
    assert.equal(
      renderer.getFromAddress(null, newsletter),
      '"Publication" <noreply@changed.example>',
    );
    assert.equal(renderer.getReplyToAddress(null, newsletter), 'help@changed.example');
    assert.equal(service.getMembersSupportAddress(), 'noreply@changed.example');

    getConfig.withArgs('hostSettings:managedEmail:sendingDomain').returns('changed.example');
    assert.equal(service.getMembersSupportAddress(), 'help@changed.example');
    getSetting.withArgs('members_support_address').returns('support@changed.example');
    assert.equal(service.getMembersSupportAddress(), 'support@changed.example');
    getSetting.withArgs('members_support_address').returns(null);
    assert.equal(service.getMembersSupportAddress(), 'noreply@changed.example');
    assert.equal(root.service, service);
  });

  it('uses current fallback addresses and domains in a retained sending consumer', async function () {
    getConfig.withArgs('hostSettings:managedEmail:enabled').returns(true);
    getConfig.withArgs('hostSettings:managedEmail:sendingDomain').returns('custom.example');
    getConfig
      .withArgs('hostSettings:managedEmail:fallbackAddress')
      .returns('first@fallback.example');
    getConfig.withArgs('hostSettings:managedEmail:fallbackDomain').returns('fallback.example');
    const service = initialize();
    const renderer = createRenderer(service);
    // Keep the actual address rendering and sending path; only body rendering
    // and the external delivery provider are outside this contract.
    sandbox.stub(renderer, 'renderBody').resolves({
      html: '<p>A newsletter</p>',
      plaintext: 'A newsletter',
      replacements: [],
    });
    const send = sandbox.stub().resolves({ id: 'delivery-id' });
    const sender = new SendingService({
      emailRenderer: renderer,
      emailAddressService: service,
      emailProvider: { send },
    });
    const delivery = {
      post: createModel({ title: 'A newsletter', loaded: [] }),
      newsletter: createModel({
        sender_email: 'writer@custom.example',
        sender_reply_to: 'newsletter',
      }),
      members: [{ email: 'reader@example.com' }],
      emailId: 'email-id',
      segment: null,
    };

    await sender.send(delivery, { useFallbackAddress: true });
    sinon.assert.calledOnce(send);
    assert.equal(send.firstCall.args[0].from, '"Publication" <first@fallback.example>');
    assert.equal(send.firstCall.args[0].replyTo, '"Publication" <writer@custom.example>');
    assert.equal(send.firstCall.args[0].domainOverride, 'fallback.example');

    getConfig
      .withArgs('hostSettings:managedEmail:fallbackAddress')
      .returns('"Fallback" <second@changed.example>');
    getConfig.withArgs('hostSettings:managedEmail:fallbackDomain').returns('changed.example');
    await sender.send(delivery, { useFallbackAddress: true });
    sinon.assert.calledTwice(send);
    assert.equal(send.secondCall.args[0].from, '"Fallback" <second@changed.example>');
    assert.equal(send.secondCall.args[0].replyTo, '"Publication" <writer@custom.example>');
    assert.equal(send.secondCall.args[0].domainOverride, 'changed.example');

    await sender.send(delivery, { useFallbackAddress: false });
    sinon.assert.calledThrice(send);
    assert.equal(send.thirdCall.args[0].from, '"Publication" <writer@custom.example>');
    assert.equal(send.thirdCall.args[0].replyTo, undefined);
    assert.equal(send.thirdCall.args[0].domainOverride, undefined);
    assert.equal(root.service, service);
  });
});
