const errors = require('@tryghost/errors');
const sinon = require('sinon');
const assert = require('assert/strict');
const nock = require('nock');
const MailgunClient = require('@tryghost/mailgun-client');

// Helper services
const configUtils = require('./configUtils');
const WebhookMockReceiver = require('@tryghost/webhook-mock-receiver');
const EmailMockReceiver = require('@tryghost/email-mock-receiver');
const {snapshotManager} = require('@tryghost/express-test').snapshot;

let mocks = {};
let emailCount = 0;

// Mockable services
const mailService = require('../../core/server/services/mail/index');
const originalMailServiceSendMail = mailService.GhostMailer.prototype.sendMail;
const labs = require('../../core/shared/labs');
const events = require('../../core/server/lib/common/events');
const settingsCache = require('../../core/shared/settings-cache');
const dns = require('dns');
const dnsPromises = dns.promises;
const StripeMocker = require('./stripe-mocker');

let fakedLabsFlags = {};
let allowedNetworkDomains = [];
const originalLabsIsSet = labs.isSet;
const stripeMocker = new StripeMocker();

/**
 * Stripe Mocks
 */

const disableStripe = async () => {
    // This must be required _after_ startGhost has been called, because the models will
    // not have been loaded otherwise. Consider moving the dependency injection of models
    // into the init method of the Stripe service.
    const stripeService = require('../../core/server/services/stripe');
    await stripeService.disconnect();
};

const disableNetwork = () => {
    nock.disableNetConnect();

    // externalRequest does dns lookup; stub to make sure we don't fail with fake domain names
    if (!dnsPromises.lookup.restore) {
        sinon.stub(dnsPromises, 'lookup').callsFake(() => {
            return Promise.resolve({address: '123.123.123.123', family: 4});
        });
    }

    if (!dns.resolveMx.restore) {
        // without this, Node will try and resolve the domain name but local DNS
        // resolvers can take a while to timeout, which causes the tests to timeout
        // `nodemailer-direct-transport` calls `dns.resolveMx`, so if we stub that
        // function and return an empty array, we can avoid any real DNS lookups
        sinon.stub(dns, 'resolveMx').yields(null, []);
    }

    // Allow localhost
    // Multiple enableNetConnect with different hosts overwrite each other, so we need to add one and use the allowedNetworkDomains variable
    nock.enableNetConnect((host) => {
        if (host.includes('127.0.0.1')) {
            return true;
        }
        for (const h of allowedNetworkDomains) {
            if (host.includes(h)) {
                return true;
            }
        }
        return false;
    });
};

const allowStripe = () => {
    disableNetwork();
    allowedNetworkDomains.push('stripe.com');
};

const mockGeojs = () => {
    disableNetwork();

    nock(/get\.geojs\.io/)
        .persist()
        .get('/v1/ip/geo/127.0.0.1.json')
        .reply(200, {
            latitude: 'nil',
            longitude: 'nil',
            organization_name: 'Unknown',
            ip: '127.0.0.1',
            asn: 64512,
            organization: 'AS64512 Unknown',
            area_code: '0'
        }, {
            'Response-Type': 'application/json'
        });
};

const mockStripe = () => {
    disableNetwork();
    stripeMocker.reset();
    stripeMocker.stub();
};

const mockSlack = () => {
    disableNetwork();

    nock(/hooks.slack.com/)
        .persist()
        .post('/')
        .reply(200, 'ok');
};

/**
 * Email Mocks & Assertions
 */

/**
 * @param {String|Object} response
 */
const mockMail = (response = 'Mail is disabled') => {
    const mockMailReceiver = new EmailMockReceiver({
        snapshotManager: snapshotManager,
        sendResponse: response
    });

    mailService.GhostMailer.prototype.sendMail = mockMailReceiver.send.bind(mockMailReceiver);
    mocks.mail = sinon.spy(mailService.GhostMailer.prototype, 'sendMail');
    mocks.mockMailReceiver = mockMailReceiver;

    return mockMailReceiver;
};

/**
 * A reference to the send method when MailGun is mocked (required for some tests)
 */
let mailgunCreateMessageStub;

const mockMailgun = (customStubbedSend) => {
    mockSetting('mailgun_api_key', 'test');
    mockSetting('mailgun_domain', 'example.com');
    mockSetting('mailgun_base_url', 'test');

    mailgunCreateMessageStub = customStubbedSend ? sinon.stub().callsFake(customStubbedSend) : sinon.fake.resolves({
        id: `<${new Date().getTime()}.${0}.5817@samples.mailgun.org>`
    });

    // We need to stub the Mailgun client before starting Ghost
    sinon.stub(MailgunClient.prototype, 'getInstance').returns({
        // @ts-ignore
        messages: {
            create: async function () {
                return await mailgunCreateMessageStub.call(this, ...arguments);
            }
        }
    });
};

const mockWebhookRequests = () => {
    mocks.webhookMockReceiver = new WebhookMockReceiver({snapshotManager});

    return mocks.webhookMockReceiver;
};

/**
 * @deprecated use emailMockReceiver.assertSentEmailCount(count) instead
 * @param {Number} count number of emails sent
 */
const sentEmailCount = (count) => {
    if (!mocks.mail) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot assert on mail when mail has not been mocked'
        });
    }

    mocks.mockMailReceiver.assertSentEmailCount(count);
};

const sentEmail = (matchers) => {
    if (!mocks.mail) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot assert on mail when mail has not been mocked'
        });
    }

    let spyCall = mocks.mail.getCall(emailCount);

    assert.notEqual(spyCall, null, 'Expected at least ' + (emailCount + 1) + ' emails sent.');

    // We increment here so that the messaging has an index of 1, whilst getting the call has an index of 0
    emailCount += 1;

    sinon.assert.called(mocks.mail);

    Object.keys(matchers).forEach((key) => {
        let value = matchers[key];

        // We use assert, rather than sinon.assert.calledWith, as we end up with much better error messaging
        assert.notEqual(spyCall.args[0][key], undefined, `Expected email to have property ${key}`);

        if (value instanceof RegExp) {
            assert.match(spyCall.args[0][key], value, `Expected Email ${emailCount} to have ${key} that matches ${value}, got ${spyCall.args[0][key]}`);
            return;
        }

        assert.equal(spyCall.args[0][key], value, `Expected Email ${emailCount} to have ${key} of ${value}`);
    });

    return spyCall.args[0];
};

/**
 * Events Mocks & Assertions
 */

const mockEvents = () => {
    mocks.events = sinon.stub(events, 'emit');
};

const emittedEvent = (name) => {
    sinon.assert.calledWith(mocks.events, name);
};

/**
 * Settings Mocks
 */

let fakedSettings = {};
const originalSettingsGetter = settingsCache.get;

const fakeSettingsGetter = (setting) => {
    if (fakedSettings.hasOwnProperty(setting)) {
        return fakedSettings[setting];
    }

    return originalSettingsGetter(setting);
};

const mockSetting = (key, value) => {
    if (!mocks.settings) {
        mocks.settings = sinon.stub(settingsCache, 'get').callsFake(fakeSettingsGetter);
    }

    fakedSettings[key] = value;
};

/**
 * Labs Mocks
 */

const fakeLabsIsSet = (flag) => {
    if (fakedLabsFlags.hasOwnProperty(flag)) {
        return fakedLabsFlags[flag];
    }

    return originalLabsIsSet(flag);
};

const mockLabsEnabled = (flag, alpha = true) => {
    // We assume we should enable alpha experiments unless explicitly told not to!
    if (!alpha) {
        configUtils.set('enableDeveloperExperiments', true);
    }

    if (!mocks.labs) {
        mocks.labs = sinon.stub(labs, 'isSet').callsFake(fakeLabsIsSet);
    }

    fakedLabsFlags[flag] = true;
};

const mockLabsDisabled = (flag, alpha = true) => {
    // We assume we should enable alpha experiments unless explicitly told not to!
    if (!alpha) {
        configUtils.set('enableDeveloperExperiments', true);
    }

    if (!mocks.labs) {
        mocks.labs = sinon.stub(labs, 'isSet').callsFake(fakeLabsIsSet);
    }

    fakedLabsFlags[flag] = false;
};

const restore = () => {
    // eslint-disable-next-line no-console
    configUtils.restore().catch(console.error);
    sinon.restore();
    mocks = {};
    fakedLabsFlags = {};
    fakedSettings = {};
    emailCount = 0;
    allowedNetworkDomains = [];
    nock.cleanAll();
    nock.enableNetConnect();
    stripeMocker.reset();

    if (mocks.webhookMockReceiver) {
        mocks.webhookMockReceiver.reset();
    }

    mailService.GhostMailer.prototype.sendMail = originalMailServiceSendMail;

    // Disable network again after restoring sinon
    disableNetwork();
};

module.exports = {
    mockEvents,
    mockMail,
    disableStripe,
    mockStripe,
    mockSlack,
    allowStripe,
    mockGeojs,
    mockMailgun,
    mockLabsEnabled,
    mockLabsDisabled,
    mockWebhookRequests,
    mockSetting,
    disableNetwork,
    restore,
    stripeMocker,
    assert: {
        sentEmailCount,
        sentEmail,
        emittedEvent
    },
    getMailgunCreateMessageStub: () => mailgunCreateMessageStub
};
