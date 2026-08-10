const errors = require('@tryghost/errors');
const sinon = require('sinon');
const assert = require('node:assert/strict');
const nock = require('nock');

// nock 14 can't intercept the Stripe SDK's default NodeHttpClient (it flushes
// the request body on a socket 'connect' event the mocked socket never emits,
// so every Stripe call hangs). Force the fetch-based client, which nock 14 can
// intercept. Runs when the vitest setup files (test/utils/vitest-setup*.ts)
// require this module, before Ghost boots.
const {Stripe} = require('stripe');
Stripe.createNodeHttpClient = () => Stripe.createFetchHttpClient();

// Helper services
const configUtils = require('./config-utils');
const WebhookMockReceiver = require('@tryghost/webhook-mock-receiver');
const EmailMockReceiver = require('@tryghost/email-mock-receiver');
const {snapshotManager} = require('@tryghost/express-test').snapshot;

let mocks = {};
let emailCount = 0;

// Mockable services
const MailgunClient = require('../../core/server/services/lib/mailgun-client');
const mailService = require('../../core/server/services/mail/index');
const originalMailServiceSendMail = mailService.GhostMailer.prototype.sendMail;
const labs = require('../../core/shared/labs');
const events = require('../../core/server/lib/common/events');
const settingsCache = require('../../core/shared/settings-cache');
const limitService = require('../../core/server/services/limits');
const dns = require('dns');
const dnsPromises = dns.promises;
const StripeMocker = require('./stripe-mocker');

let fakedLabsFlags = {};
let allowedNetworkDomains = [];
const originalLabsIsSet = labs.isSet;
const stripeMocker = new StripeMocker();

// The image-size cache holds a bound copy of getImageSizeFromUrl, captured once
// here so disableNetwork can swap in a no-op (external image lookups are
// nock-blocked in tests, so the real fetch only produces "Unknown Request
// error." log noise) and allowImageSize can put the real method back.
let realCachedImageSizeFromUrl = null;

const WEBMENTION_MOCK_HOST = 'ghost.org';

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

const imageSizeNoop = () => Promise.resolve();

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

    // External image dimension lookups are nock-blocked in tests, so the real
    // fetch always fails and logs "Unknown Request error." on every render.
    // Replace the cache's bound lookup with a wrapper that resolves undefined
    // for external URLs only (same outcome as the blocked fetch — dimensions
    // omitted — but no log). Locally stored images never touch the network —
    // getImageSizeFromUrl's own isLocalImage check just reads local file
    // storage — so those still delegate to the real lookup; no-op'ing them too
    // would silently drop dimensions from every locally-hosted test image.
    // The image lib is required lazily because it's only loaded once Ghost has
    // booted, after which disableNetwork runs in every afterEach.
    const imageLib = require('../../core/server/lib/image');
    const cachedImageSize = imageLib.cachedImageSizeFromUrl;
    // Capture the real method once, on the first call only.
    if (!realCachedImageSizeFromUrl) {
        realCachedImageSizeFromUrl = cachedImageSize.getImageSizeFromUrl;
    }
    // Use a plain function (not a sinon stub) so it survives per-test sinon.restore().
    cachedImageSize.getImageSizeFromUrl = (imagePath) => {
        if (imageLib.imageSize.storageUtils.isLocalImage(imagePath)) {
            return realCachedImageSizeFromUrl(imagePath);
        }
        return imageSizeNoop();
    };
};

/**
 * DB-lane only — do not call this from disableNetwork(). disableNetwork() is
 * shared with the unit-test lane (test/utils/vitest-setup.ts calls it directly
 * in every test's beforeAll/afterEach), and several unit tests register their
 * own nock mocks against ghost.org/example.com and expect to be the only
 * interceptor for that host (oembed-service.test.js, external-media-inliner
 * tests). nock 14 matches the first-registered interceptor for a host and
 * persisted interceptors are never consumed, so a catch-all registered here
 * would shadow those tests' own mocks and never be evicted.
 *
 * Fixture/example post content (fixtures.json, golden-post.json) links to real
 * ghost.org subdomains, and several individual DB-lane tests use example.com
 * (the RFC 2606 reserved placeholder domain) as a stand-in external link.
 * Publishing that content triggers real webmention discovery
 * (mention-sending-service.js), which fetches every external link —
 * nock-blocked here, so the real fetch throws and mention-discovery-service.js
 * error-logs it on every publish. Reply with a plain page (no rel="webmention"
 * link/header) instead of blocking the connection: same "no endpoint found"
 * outcome discovery would reach for a real site that doesn't support
 * webmentions, without eating a real connection error. Tests that exercise
 * webmention discovery/sending itself (e2e-server/services/mentions.test.js)
 * use entirely different hosts (otherghostsite.com/endpoint.com) so
 * aren't affected either way. (nock 14's RegExp basePath matching doesn't
 * cover subdomains reliably, so this is an explicit list — grep test content
 * for new domains if this list goes stale.)
 */
const mockWebmentionDiscoveryDomains = () => {
    // Check nock's actual live state rather than tracking a module-level flag: a
    // handful of DB-lane test files (webhook-request, themes, webmentions,
    // milestones, mentions) call nock.cleanAll() directly, bypassing restore() —
    // a flag reset only in restore() would go stale and skip re-registering here
    // even though the interceptors were just wiped, silently letting the
    // webmention noise these mocks suppress return for the rest of the worker.
    if (nock.activeMocks().some(mock => mock.includes(`https://${WEBMENTION_MOCK_HOST}:`))) {
        return;
    }

    for (const host of ['ghost.org', 'www.ghost.org', 'koenig.ghost.org', 'main.ghost.org', 'forum.ghost.org', 'static.ghost.org', 'docs.ghost.org', 'help.ghost.org', 'api.ghost.org', 'themes.ghost.org', 'marketplace.ghost.org', 'example.com', 'www.example.com']) {
        nock(`https://${host}`)
            .persist()
            .get(/.*/)
            .reply(200, '<html><body></body></html>', {'content-type': 'text/html'});
    }
};

/**
 * Restore the real image-size cache lookup so tests that exercise the lookup
 * mechanism itself (and stub its internals) run against the real chain.
 */
const allowImageSize = () => {
    if (realCachedImageSizeFromUrl) {
        const imageLib = require('../../core/server/lib/image');
        imageLib.cachedImageSizeFromUrl.getImageSizeFromUrl = realCachedImageSizeFromUrl;
    }
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

const sentEmailCount = (expectedCount) => {
    if (!mocks.mail) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot assert on mail when mail has not been mocked'
        });
    }

    assert.equal(mocks.mail.callCount, expectedCount, `Expected ${expectedCount} emails to be sent, but ${mocks.mail.callCount} were sent.`);
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

const mockLimitService = (limit, options) => {
    if (!mocks.limitService) {
        mocks.limitService = {
            isLimited: sinon.stub(limitService, 'isLimited'),
            isDisabled: sinon.stub(limitService, 'isDisabled'),
            checkWouldGoOverLimit: sinon.stub(limitService, 'checkWouldGoOverLimit'),
            errorIfWouldGoOverLimit: sinon.stub(limitService, 'errorIfWouldGoOverLimit'),
            limitsExisted: !!limitService.limits,
            originalEntries: new Map(),
            mockedLimits: new Set() // Track which limits we've mocked
        };
    }

    mocks.limitService.isLimited.withArgs(limit).returns(options.isLimited);
    mocks.limitService.isDisabled.withArgs(limit).returns(options.isDisabled);
    mocks.limitService.checkWouldGoOverLimit.withArgs(limit).resolves(options.wouldGoOverLimit);

    // Mock the limits property for checking allowlist
    if (!limitService.limits) {
        limitService.limits = {};
    }
    if (!mocks.limitService.originalEntries.has(limit)) {
        mocks.limitService.originalEntries.set(
            limit,
            Object.prototype.hasOwnProperty.call(limitService.limits, limit) ? limitService.limits[limit] : undefined
        );
    }
    limitService.limits[limit] = {
        allowlist: options.allowlist || []
    };
    mocks.limitService.mockedLimits.add(limit); // Track this limit

    // If errorIfWouldGoOverLimit is true, reject with HostLimitError
    if (options.errorIfWouldGoOverLimit === true) {
        mocks.limitService.errorIfWouldGoOverLimit.withArgs(limit).rejects(
            new errors.HostLimitError({
                message: `Upgrade to use ${limit} feature.`
            })
        );
    } else {
        // Otherwise, resolve normally
        mocks.limitService.errorIfWouldGoOverLimit.withArgs(limit).resolves();
    }
};

const restoreLimitService = () => {
    if (mocks.limitService) {
        if (mocks.limitService.isLimited && mocks.limitService.isLimited.restore) {
            mocks.limitService.isLimited.restore();
        }
        if (mocks.limitService.checkWouldGoOverLimit && mocks.limitService.checkWouldGoOverLimit.restore) {
            mocks.limitService.checkWouldGoOverLimit.restore();
        }
        if (mocks.limitService.errorIfWouldGoOverLimit && mocks.limitService.errorIfWouldGoOverLimit.restore) {
            mocks.limitService.errorIfWouldGoOverLimit.restore();
        }
        if (mocks.limitService.isDisabled && mocks.limitService.isDisabled.restore) {
            mocks.limitService.isDisabled.restore();
        }

        if (limitService.limits && mocks.limitService.originalEntries) {
            for (const [limit, original] of mocks.limitService.originalEntries) {
                if (original === undefined) {
                    delete limitService.limits[limit];
                } else {
                    limitService.limits[limit] = original;
                }
            }
        }

        if (!mocks.limitService.limitsExisted &&
            limitService.limits && Object.keys(limitService.limits).length === 0) {
            limitService.limits = undefined;
        }

        delete mocks.limitService;
    }
};

const restore = () => {
    // eslint-disable-next-line no-console
    configUtils.restore().catch(console.error);

    restoreLimitService();

    sinon.restore();
    mocks = {};
    fakedLabsFlags = {};
    fakedSettings = {};
    emailCount = 0;
    allowedNetworkDomains = [];
    nock.cleanAll();
    nock.enableNetConnect();
    stripeMocker.reset();

    mailService.GhostMailer.prototype.sendMail = originalMailServiceSendMail;

    // Disable network again after restoring sinon
    disableNetwork();
    mockWebmentionDiscoveryDomains();
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
    mockLimitService,
    restoreLimitService,
    disableNetwork,
    mockWebmentionDiscoveryDomains,
    allowImageSize,
    restore,
    stripeMocker,
    assert: {
        sentEmail,
        sentEmailCount,
        emittedEvent
    },
    getMailgunCreateMessageStub: () => mailgunCreateMessageStub
};
