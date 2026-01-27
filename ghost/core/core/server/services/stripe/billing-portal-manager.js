const CONFIGURATION_ID_SETTING = 'stripe_billing_portal_configuration_id';

const DEFAULT_FEATURES = {
    invoice_history: {
        enabled: true
    },
    payment_method_update: {
        enabled: true
    },
    subscription_cancel: {
        enabled: true
    }
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
    constructor({api, models, settingsCache}) {
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
            await this.SettingsModel.edit([{
                key: 'stripe_billing_portal_configuration_id',
                value: configurationId
            }]);
        }
    }

    /**
     * Setup the Stripe Billing Portal Configuration.
     * - If no configuration exists, create a new one
     * - If a configuration exists, update it with current settings
     * - If update fails (resource_missing), create a new one
     * @param {string|null} id
     * @returns {Promise<string>}
     */
    async createOrUpdateConfiguration(id) {
        if (!id) {
            const configuration = await this.api.createBillingPortalConfiguration(this.getConfigurationOptions());
            return configuration.id;
        }

        try {
            const configuration = await this.api.updateBillingPortalConfiguration(id, this.getConfigurationOptions(true));
            return configuration.id;
        } catch (err) {
            if (err && typeof err === 'object' && 'code' in err && err.code === 'resource_missing') {
                const configuration = await this.api.createBillingPortalConfiguration(this.getConfigurationOptions());
                return configuration.id;
            }
            throw err;
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
                default_return_url: this.siteUrl
            };
        } else {
            return {
                business_profile: {
                    headline: `Manage your ${this.settingsCache.get('title')} subscription`
                },
                features: DEFAULT_FEATURES,
                default_return_url: this.siteUrl
            };
        }
    }
}

module.exports = {
    BillingPortalManager
};
