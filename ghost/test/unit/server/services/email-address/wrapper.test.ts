import assert from 'node:assert/strict';
import sinon from 'sinon';

const config = require('../../../../../core/shared/config');
const settingsHelpers = require('../../../../../core/server/services/settings-helpers');
const EmailAddressServiceWrapper = require('../../../../../core/server/services/email-address/email-address-service-wrapper');

// How consumers choose addresses from these values is covered by the
// EmailAddressService, EmailRenderer and SendingService tests. This file covers
// the wrapper: it builds one service whose dependencies are read on every use.
describe('EmailAddressServiceWrapper', function () {
  const sandbox = sinon.createSandbox();
  let getConfig: sinon.SinonStub;
  let getDefaultEmail: sinon.SinonStub;
  let getMembersSupportAddress: sinon.SinonStub;

  beforeEach(function () {
    getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('hostSettings:managedEmail:enabled').returns(undefined);
    getConfig.withArgs('hostSettings:managedEmail:sendingDomain').returns(undefined);
    getConfig.withArgs('hostSettings:managedEmail:fallbackDomain').returns(undefined);
    getConfig.withArgs('hostSettings:managedEmail:fallbackAddress').returns(undefined);
    getDefaultEmail = sandbox
      .stub(settingsHelpers, 'getDefaultEmail')
      .returns({ address: 'noreply@first.example', name: 'First' });
    getMembersSupportAddress = sandbox
      .stub(settingsHelpers, 'getMembersSupportAddress')
      .returns('support@first.example');
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('constructs the service once and keeps it on repeated init', function () {
    const wrapper = new EmailAddressServiceWrapper();
    assert.equal(wrapper.service, undefined);

    wrapper.init();
    const service = wrapper.service;
    assert.ok(service);

    getConfig.withArgs('hostSettings:managedEmail:enabled').returns(true);
    wrapper.init();

    assert.equal(wrapper.service, service);
  });

  it('reports missing managed-email config as disabled with no domains or fallback address', function () {
    const wrapper = new EmailAddressServiceWrapper();
    wrapper.init();

    assert.equal(wrapper.service.managedEmailEnabled, false);
    assert.equal(wrapper.service.sendingDomain, null);
    assert.equal(wrapper.service.fallbackDomain, null);
    assert.equal(wrapper.service.fallbackEmail, null);
  });

  it('reads current managed-email config on every use', function () {
    const wrapper = new EmailAddressServiceWrapper();
    wrapper.init();
    const service = wrapper.service;

    getConfig.withArgs('hostSettings:managedEmail:enabled').returns(true);
    getConfig.withArgs('hostSettings:managedEmail:sendingDomain').returns('first.example');
    getConfig.withArgs('hostSettings:managedEmail:fallbackDomain').returns('fallback.example');
    getConfig
      .withArgs('hostSettings:managedEmail:fallbackAddress')
      .returns('"Fallback" <first@fallback.example>');

    assert.equal(service.managedEmailEnabled, true);
    assert.equal(service.sendingDomain, 'first.example');
    assert.equal(service.fallbackDomain, 'fallback.example');
    assert.deepEqual(service.fallbackEmail, {
      address: 'first@fallback.example',
      name: 'Fallback',
    });

    getConfig.withArgs('hostSettings:managedEmail:enabled').returns(false);
    getConfig.withArgs('hostSettings:managedEmail:sendingDomain').returns('second.example');
    getConfig.withArgs('hostSettings:managedEmail:fallbackDomain').returns('changed.example');
    getConfig
      .withArgs('hostSettings:managedEmail:fallbackAddress')
      .returns('second@changed.example');

    assert.equal(service.managedEmailEnabled, false);
    assert.equal(service.sendingDomain, 'second.example');
    assert.equal(service.fallbackDomain, 'changed.example');
    assert.equal(service.fallbackEmail?.address, 'second@changed.example');
    assert.equal(wrapper.service, service);
  });

  it('reads the default and members support addresses from settings helpers on every use', function () {
    const wrapper = new EmailAddressServiceWrapper();
    wrapper.init();
    const service = wrapper.service;

    assert.deepEqual(service.defaultFromEmail, { address: 'noreply@first.example', name: 'First' });
    assert.equal(service.getMembersSupportAddress(), 'support@first.example');

    getDefaultEmail.returns({ address: 'noreply@second.example', name: 'Second' });
    getMembersSupportAddress.returns('support@second.example');

    assert.deepEqual(service.defaultFromEmail, {
      address: 'noreply@second.example',
      name: 'Second',
    });
    assert.equal(service.getMembersSupportAddress(), 'support@second.example');
    assert.equal(wrapper.service, service);
  });
});
