/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 */
const events = require('../../lib/common/events');
const logging = require('@tryghost/logging');
const models = require('../../models');
const labs = require('../../../shared/labs');
const { limitService: limits } = require('../limits');
const config = require('../../../shared/config');
const SettingsCache = require('../../../shared/settings-cache');
const SettingsBREADService = require('./settings-bread-service');
const { generatePrivateSiteAccessCode } = require('./private-site-access-code');
const { obfuscatedSetting, isSecretSetting, hideValueIfSecret } = require('./settings-utils');
const mail = require('../../lib/mail');
const SingleUseTokenProvider = require('../members/single-use-token-provider');
const urlUtils = require('../../../shared/url-utils').default;

const ObjectId = require('bson-objectid').default;
const settingsHelpers = require('../settings-helpers');
const emailAddressService = require('../email-address');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const MAGIC_LINK_TOKEN_MAX_USAGE_COUNT = 7;

// LEGACY FACADE for the start of settings, which is a shared module now:
// ghost/shared/settings, started by the shared list in ghost/bootstrap/shared.ts.
// `init()` and the three methods below it stay for the tests and tools that
// still call them here; each runs the shared module's code with the same
// instances the shared step hands it.
const {
  loadSettings,
  enforcePublicSiteAccessLimit,
  syncEmailSettings,
  validateSiteUuid,
} = require('../../../../shared/settings/start-settings');
const {
  legacyDependencies,
} = require('../../../../shared/transition/settings/legacy-dependencies');

const given = () => ({
  foundation: { config, logging },
  limits,
  'settings-transition': legacyDependencies(),
});

/**
 * @returns {SettingsBREADService} instance of the PostsService
 */
const getSettingsBREADServiceInstance = () => {
  return new SettingsBREADService({
    SettingsModel: models.Settings,
    settingsCache: SettingsCache,
    labsService: labs,
    limitsService: limits,
    mail,
    singleUseTokenProvider: new SingleUseTokenProvider({
      SingleUseTokenModel: models.SingleUseToken,
      validityPeriod: MAGIC_LINK_TOKEN_VALIDITY,
      validityPeriodAfterUsage: MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE,
      maxUsageCount: MAGIC_LINK_TOKEN_MAX_USAGE_COUNT,
    }),
    urlUtils,
    emailAddressService: emailAddressService,
  });
};

class CalculatedField {
  constructor({ key, type, group, fn, dependents }) {
    this.key = key;
    this.type = type;
    this.group = group;
    this.fn = fn;
    this.dependents = dependents;
  }

  getSetting() {
    return {
      key: this.key,
      type: this.type,
      group: this.group,
      value: this.fn(),
      // @TODO: remove this hack
      id: ObjectId().toHexString(),
      created_at: new Date().toISOString().replace(/\d{3}Z$/, '000Z'),
      updated_at: new Date().toISOString().replace(/\d{3}Z$/, '000Z'),
    };
  }
}

module.exports = {
  /**
   * Initialize the cache, used in boot and in testing
   */
  async init() {
    // The start itself is the shared module's (ghost/shared/settings). The
    // three steps are passed in because tests replace them on this object.
    return loadSettings(given(), {
      enforcePublicSiteAccessLimit: () => this.enforcePublicSiteAccessLimit(),
      calculatedFields: () => this.getCalculatedFields(),
      validateSiteUuid: () => this.validateSiteUuid(),
    });
  },

  /**
   * When the `publicSiteAccess` flag limit is disabled, ensure the site
   * is private and has an access code before the cache is built.
   *
   * @private
   */
  async enforcePublicSiteAccessLimit() {
    return enforcePublicSiteAccessLimit(given());
  },

  /**
   * Generate and persist a new private site access code.
   *
   * The code is always generated server-side. Callers cannot provide their
   * own value, and the write runs with internal context so it can regenerate
   * a read-only access code without opening up generic settings edits.
   *
   * @returns {Promise<*>}
   */
  async regeneratePrivateSiteAccessCode() {
    return await models.Settings.edit(
      [
        {
          key: 'password',
          value: generatePrivateSiteAccessCode(),
        },
      ],
      { context: { internal: true } },
    );
  },

  /**
   * Restore the cache, used during e2e testing only
   */
  reset() {
    SettingsCache.reset(events);
  },

  /**
   *
   */
  getCalculatedFields() {
    const fields = [];

    fields.push(
      new CalculatedField({
        key: 'members_enabled',
        type: 'boolean',
        group: 'members',
        fn: settingsHelpers.isMembersEnabled.bind(settingsHelpers),
        dependents: ['members_signup_access'],
      }),
    );
    fields.push(
      new CalculatedField({
        key: 'members_invite_only',
        type: 'boolean',
        group: 'members',
        fn: settingsHelpers.isMembersInviteOnly.bind(settingsHelpers),
        dependents: ['members_signup_access'],
      }),
    );
    fields.push(
      new CalculatedField({
        key: 'allow_self_signup',
        type: 'boolean',
        group: 'members',
        fn: settingsHelpers.allowSelfSignup.bind(settingsHelpers),
        dependents: ['members_signup_access'],
      }),
    );
    fields.push(
      new CalculatedField({
        key: 'paid_members_enabled',
        type: 'boolean',
        group: 'members',
        fn: settingsHelpers.arePaidMembersEnabled.bind(settingsHelpers),
        dependents: [
          'members_signup_access',
          'stripe_secret_key',
          'stripe_publishable_key',
          'stripe_connect_secret_key',
          'stripe_connect_publishable_key',
        ],
      }),
    );
    fields.push(
      new CalculatedField({
        key: 'firstpromoter_account',
        type: 'string',
        group: 'firstpromoter',
        fn: settingsHelpers.getFirstpromoterId.bind(settingsHelpers),
        dependents: ['firstpromoter', 'firstpromoter_id'],
      }),
    );
    fields.push(
      new CalculatedField({
        key: 'donations_enabled',
        type: 'boolean',
        group: 'donations',
        fn: settingsHelpers.areDonationsEnabled.bind(settingsHelpers),
        dependents: [
          'stripe_secret_key',
          'stripe_publishable_key',
          'stripe_connect_secret_key',
          'stripe_connect_publishable_key',
        ],
      }),
    );

    // E-mail addresses
    fields.push(
      new CalculatedField({
        key: 'default_email_address',
        type: 'string',
        group: 'email',
        fn: settingsHelpers.getDefaultEmailAddress.bind(settingsHelpers),
        dependents: ['labs'],
      }),
    );
    fields.push(
      new CalculatedField({
        key: 'support_email_address',
        type: 'string',
        group: 'email',
        fn: settingsHelpers.getMembersSupportAddress.bind(settingsHelpers),
        dependents: ['labs', 'members_support_address'],
      }),
    );

    // Blocked email domains from member signup, from both config and user settings
    fields.push(
      new CalculatedField({
        key: 'all_blocked_email_domains',
        type: 'string',
        group: 'members',
        fn: settingsHelpers.getAllBlockedEmailDomains.bind(settingsHelpers),
        dependents: ['blocked_email_domains'],
      }),
    );

    // Social web (ActivityPub)
    fields.push(
      new CalculatedField({
        key: 'social_web_enabled',
        type: 'boolean',
        group: 'social_web',
        fn: settingsHelpers.isSocialWebEnabled.bind(settingsHelpers),
        dependents: ['social_web', 'labs', 'is_private'],
      }),
    );

    // Web analytics
    fields.push(
      new CalculatedField({
        key: 'web_analytics_enabled',
        type: 'boolean',
        group: 'analytics',
        fn: settingsHelpers.isWebAnalyticsEnabled.bind(settingsHelpers),
        dependents: ['web_analytics'],
      }),
    );
    fields.push(
      new CalculatedField({
        key: 'web_analytics_configured',
        type: 'boolean',
        group: 'analytics',
        fn: settingsHelpers.isWebAnalyticsConfigured.bind(settingsHelpers),
        dependents: ['web_analytics'],
      }),
    );

    return fields;
  },

  /**
   * Handles email setting synchronization when email has been verified per instance
   *
   * @param {boolean} configValue current email verification value from local config
   */
  async syncEmailSettings(configValue) {
    return syncEmailSettings(given(), configValue);
  },

  /**
   * Validates that the site_uuid setting matches the configured site_uuid
   * This is a safeguard to prevent sites from running with the wrong site_uuid
   * The configured site_uuid is only used once when the site_uuid setting is set in a migration
   * Exits with an error if they differ
   */
  validateSiteUuid() {
    return validateSiteUuid(given());
  },

  obfuscatedSetting,
  isSecretSetting,
  hideValueIfSecret,
  getSettingsBREADServiceInstance,
};
