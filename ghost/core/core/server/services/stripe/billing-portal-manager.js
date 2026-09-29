const logging = require('@tryghost/logging');

const CONFIGURATION_ID_SETTING = 'stripe_billing_portal_configuration_id';

const DEFAULT_FEATURES = {
  invoice_history: {
    enabled: true,
  },
  payment_method_update: {
    enabled: true,
  },
  subscription_cancel: {
    enabled: false,
  },
};

class BillingPortalManager {
  /** @type {object} */
  SettingsModel;
  /** @type {object} */
  settingsCache;
  /** @type {object} */
  api;
  /** @type {string|null} */
  siteUrl = null;
  /** @type {boolean} */
  configured = false;

  /**
   * @param {object} deps
   * @param {object} deps.api
   * @param {object} deps.models
   * @param {object} deps.models.Settings
   * @param {object} deps.settingsCache
   */
  constructor({ api, models, settingsCache }) {
    this.SettingsModel = models.Settings;
    this.settingsCache = settingsCache;
    this.api = api;
    this.configured = false;
  }

  /**
   * Configures the billing portal manager, passing in additional dependencies
   * in a different stage of the Stripe service lifecycle.
   * @param {object} config
   * @param {string} config.siteUrl
   */
  configure(config) {
    this.siteUrl = config.siteUrl;
    this.configured = true;
  }

  /**
   * Starts the Billing Portal Manager by ensuring a configuration exists in Stripe.
   */
  async start() {
    if (!this.configured) {
      // Must be called after configure(config)
      return;
    }

    const existingId = this.settingsCache.get(CONFIGURATION_ID_SETTING);
    const configurationId = await this.createOrUpdateConfiguration(existingId);

    if (configurationId !== existingId) {
      await this.SettingsModel.edit([
        {
          key: 'stripe_billing_portal_configuration_id',
          value: configurationId,
        },
      ]);
    }
  }

  /**
   * Setup the Stripe Billing Portal Configuration.
   * - If no configuration exists, create a new one
   * - If a configuration exists, update it with current settings
   * - If the configuration is missing or cannot be modified, create a new one
   * @param {string|null} id
   * @returns {Promise<string>}
   */
  async createOrUpdateConfiguration(id) {
    if (!id) {
      const configuration = await this.api.createBillingPortalConfiguration(
        this.getConfigurationOptions(),
      );
      return configuration.id;
    }

    try {
      const configuration = await this.api.updateBillingPortalConfiguration(
        id,
        this.getConfigurationOptions(true),
      );
      return configuration.id;
    } catch (err) {
      const isMissing = err?.code === 'resource_missing';
      // Stripe does not provide an error code for default or other-application configurations.
      const isUnmodifiable =
        err?.type === 'StripeInvalidRequestError' &&
        typeof err.message === 'string' &&
        err.message.startsWith('You cannot make any changes to a PortalConfiguration');

      if (isMissing || isUnmodifiable) {
        try {
          const configuration = await this.api.createBillingPortalConfiguration(
            this.getConfigurationOptions(),
          );
          return configuration.id;
        } catch (createError) {
          if (isMissing) {
            throw createError;
          }

          // Keep startup working if replacement of an existing configuration fails.
          logging.error('Failed to replace the billing portal configuration', { err: createError });
          return id;
        }
      }

      logging.error('Failed to update the billing portal configuration', {
        err,
      });

      return id;
    }
  }

  /**
   * Get the configuration options for the Stripe Billing Portal.
   * @param {boolean} [updateOnly=false]
   * @returns {object}
   */
  getConfigurationOptions(updateOnly = false) {
    if (updateOnly) {
      return {
        features: DEFAULT_FEATURES,
        default_return_url: this.siteUrl,
      };
    } else {
      return {
        business_profile: {
          headline: `Subscription & payment details`,
        },
        features: DEFAULT_FEATURES,
        default_return_url: this.siteUrl,
      };
    }
  }
}

module.exports = {
  BillingPortalManager,
};
