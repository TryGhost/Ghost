const logging = require('@tryghost/logging');

module.exports = class ResendClient {
    #config;
    #settings;

    static DEFAULT_BATCH_SIZE = 100;

    constructor({config, settings}) {
        this.#config = config;
        this.#settings = settings;
    }

    #getConfig() {
        const bulkEmailConfig = this.#config.get('bulkEmail');
        const fromConfig = bulkEmailConfig?.resend?.apiKey;
        const fromSettings = this.#settings.get('resend_api_key');
        const apiKey = fromConfig || fromSettings;
        if (!apiKey) {
            return null;
        }
        return {apiKey, source: fromConfig ? 'config' : 'settings'};
    }

    getInstance() {
        const resendConfig = this.#getConfig();
        if (!resendConfig) {
            logging.warn('[ResendClient] No API key found in config (bulkEmail.resend.apiKey) or settings (resend_api_key)');
            return null;
        }
        logging.info(`[ResendClient] Using API key from ${resendConfig.source} (key prefix: ${resendConfig.apiKey.slice(0, 6)}...)`);
        const {Resend} = require('resend');
        return new Resend(resendConfig.apiKey);
    }

    isConfigured() {
        return !!this.#getConfig();
    }

    getBatchSize() {
        return this.#config.get('bulkEmail')?.batchSize ?? ResendClient.DEFAULT_BATCH_SIZE;
    }

    getTargetDeliveryWindow() {
        const val = this.#config.get('bulkEmail')?.targetDeliveryWindow;
        if (val === undefined || !Number.isInteger(parseInt(val)) || parseInt(val) < 0) {
            return 0;
        }
        return parseInt(val);
    }

    // Resend has no suppression management API — these are no-ops
    async removeBounce() {
        return false;
    }

    async removeComplaint() {
        return false;
    }

    async removeUnsubscribe() {
        return false;
    }
};
