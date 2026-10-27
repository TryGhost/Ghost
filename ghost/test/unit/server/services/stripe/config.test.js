const assert = require('node:assert/strict');
const { assertExists } = require('../../../../utils/assertions');
const sinon = require('sinon');
const UrlUtils = require('@tryghost/url-utils');
const logging = require('@tryghost/logging');

const configUtils = require('../../../../utils/config-utils');

const { getConfig } = require('../../../../../core/server/services/stripe/config');

function createSettingsHelpersMock() {
  return {
    getActiveStripeKeys: sinon.stub().returns({
      secretKey: 'direct_secret',
      publicKey: 'direct_publishable',
    }),
  };
}

function createUrlUtilsMock() {
  return new UrlUtils({
    getSubdir: configUtils.config.getSubdir,
    getSiteUrl: configUtils.config.getSiteUrl,
    getAdminUrl: configUtils.config.getAdminUrl,
    slugs: ['ghost', 'rss', 'amp'],
    redirectCacheMaxAge: 31536000,
    baseApiPath: '/ghost/api',
  });
}

describe('Stripe - config', function () {
  const ignoreCustomerConfigKey = 'stripeWebhookCustomerIgnoreList';

  beforeEach(function () {
    configUtils.set({
      url: 'http://domain.tld/subdir',
      admin: { url: 'http://sub.domain.tld' },
    });
  });

  afterEach(async function () {
    configUtils.set(ignoreCustomerConfigKey, null);
    configUtils.set('stripeWebhookUrl', null);
    await configUtils.restore();
  });

  it('Returns null if Stripe not connected', function () {
    configUtils.set({
      stripeDirect: false,
      url: 'http://site.com/subdir',
    });
    const settingsHelpers = {
      getActiveStripeKeys: sinon.stub().returns(null),
    };
    const config = getConfig({ settingsHelpers, config: configUtils.config, urlUtils: {} });

    assert.equal(config, null);
  });

  it('Includes the subdirectory in the webhookHandlerUrl', function () {
    configUtils.set({
      url: 'http://site.com/subdir',
    });
    const settingsHelpers = createSettingsHelpersMock();
    const fakeUrlUtils = createUrlUtilsMock();

    const config = getConfig({
      settingsHelpers,
      config: configUtils.config,
      urlUtils: fakeUrlUtils,
    });

    assert.equal(config.secretKey, 'direct_secret');
    assert.equal(config.publicKey, 'direct_publishable');
    assert.equal(config.webhookHandlerUrl, 'http://site.com/subdir/members/webhooks/stripe/');

    assertExists(config.checkoutSessionSuccessUrl);
    assertExists(config.checkoutSessionCancelUrl);
    assertExists(config.checkoutSetupSessionSuccessUrl);
    assertExists(config.checkoutSetupSessionCancelUrl);
    assertExists(config.billingPortalReturnUrl);
  });

  describe('webhook mode', function () {
    let webhookSecretEnv;

    beforeEach(function () {
      webhookSecretEnv = process.env.WEBHOOK_SECRET;
      delete process.env.WEBHOOK_SECRET;
      sinon.stub(logging, 'warn');
    });

    afterEach(function () {
      sinon.restore();
      if (webhookSecretEnv === undefined) {
        delete process.env.WEBHOOK_SECRET;
      } else {
        process.env.WEBHOOK_SECRET = webhookSecretEnv;
      }
    });

    function getWebhookConfig() {
      return getConfig({
        settingsHelpers: createSettingsHelpersMock(),
        config: configUtils.config,
        urlUtils: createUrlUtilsMock(),
      });
    }

    it('Falls back to a placeholder secret outside production', function () {
      configUtils.set({ env: 'development' });

      const config = getWebhookConfig();

      assert.equal(config.webhookSecret, 'DEFAULT_WEBHOOK_SECRET');
      assert.equal(config.ephemeralWebhook, false);
      sinon.assert.calledOnce(logging.warn);
    });

    it('Uses the WEBHOOK_SECRET environment variable outside production', function () {
      configUtils.set({ env: 'development' });
      process.env.WEBHOOK_SECRET = 'whsec_from_stripe_listen';

      const config = getWebhookConfig();

      assert.equal(config.webhookSecret, 'whsec_from_stripe_listen');
      assert.equal(config.ephemeralWebhook, false);
    });

    it('Registers an ephemeral remote webhook outside production when opted in', function () {
      configUtils.set({ env: 'development', stripeRemoteWebhooks: true });
      process.env.WEBHOOK_SECRET = 'whsec_from_stripe_listen';

      const config = getWebhookConfig();

      assert.equal(config.webhookSecret, undefined);
      assert.equal(config.ephemeralWebhook, true);
      sinon.assert.notCalled(logging.warn);
    });

    it('Never treats a production webhook as ephemeral', function () {
      configUtils.set({ env: 'production', stripeRemoteWebhooks: true });

      const config = getWebhookConfig();

      assert.equal(config.webhookSecret, undefined);
      assert.equal(config.ephemeralWebhook, false);
    });
  });

  it('Lets config point the webhook handler at another origin', function () {
    configUtils.set({
      url: 'http://site.com/subdir',
      stripeWebhookUrl: 'https://tunnel.example/members/webhooks/stripe/',
    });

    const config = getConfig({
      settingsHelpers: createSettingsHelpersMock(),
      config: configUtils.config,
      urlUtils: createUrlUtilsMock(),
    });

    assert.equal(config.webhookHandlerUrl, 'https://tunnel.example/members/webhooks/stripe/');
    assert.equal(config.siteUrl, 'http://site.com/subdir/');
  });

  it('Parses Stripe webhook customer ignore list from config', function () {
    configUtils.set(ignoreCustomerConfigKey, ['cust_123', ' cust_456 ']);
    const settingsHelpers = createSettingsHelpersMock();
    const fakeUrlUtils = createUrlUtilsMock();

    const config = getConfig({
      settingsHelpers,
      config: configUtils.config,
      urlUtils: fakeUrlUtils,
    });

    assert.deepEqual(config.webhookCustomerIgnoreList, ['cust_123', 'cust_456']);
  });
});
