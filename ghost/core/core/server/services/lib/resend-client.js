const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const errors = require('@tryghost/errors');

const RESEND_BATCH_SIZE = 100;

module.exports = class ResendClient {
    #config;
    #settings;

    static DEFAULT_BATCH_SIZE = 100;

    constructor({config, settings}) {
        this.#config = config;
        this.#settings = settings;
    }

    /**
     * Sends emails via Resend API.
     * Unlike Mailgun, Resend has no server-side variable substitution,
     * so recipientData values are substituted per-email here.
     *
     * @param {Object} message - message with html/plaintext containing %recipient.X% placeholders
     * @param {Object} recipientData - map of email → {id: value}
     * @param {Array} replacements - unused (kept for interface parity with MailgunClient)
     */
    async send(message, recipientData, replacements) { // eslint-disable-line no-unused-vars
        const resendInstance = this.getInstance();
        if (!resendInstance) {
            logging.warn('Resend is not configured');
            return null;
        }

        const entries = Object.entries(recipientData);

        const emails = entries.map(([email, vars]) => {
            // Replace %recipient.X% placeholders with per-recipient values
            let html = message.html;
            let text = message.plaintext;

            if (html) {
                html = html.replace(/%recipient\.([^%]+)%/g, (_, id) => (vars[id] !== undefined ? String(vars[id]) : ''));
            }
            if (text) {
                text = text.replace(/%recipient\.([^%]+)%/g, (_, id) => (vars[id] !== undefined ? String(vars[id]) : ''));
            }

            const headers = {
                'Auto-Submitted': 'auto-generated',
                'X-Auto-Response-Suppress': 'OOF, AutoReply'
            };

            if (message.id) {
                headers['X-Ghost-Email-Id'] = message.id;
            }

            if (vars.list_unsubscribe) {
                headers['List-Unsubscribe'] = `<${vars.list_unsubscribe}>`;
                headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
            }

            const emailObj = {
                from: message.from,
                to: [email],
                subject: message.subject,
                html: html || undefined,
                text: text || undefined,
                headers
            };

            const replyTo = message.replyTo || message.reply_to;
            if (replyTo) {
                emailObj.replyTo = replyTo;
            }

            return emailObj;
        });

        const startTime = Date.now();
        try {
            let lastId;
            for (let i = 0; i < emails.length; i += RESEND_BATCH_SIZE) {
                const batch = emails.slice(i, i + RESEND_BATCH_SIZE);
                let response;
                if (batch.length === 1) {
                    response = await resendInstance.emails.send(batch[0]);
                    if (response?.error) {
                        throw new errors.EmailError({
                            statusCode: response.error.statusCode,
                            message: response.error.message || 'Resend API error',
                            context: response.error.name,
                            code: 'RESEND_API_ERROR'
                        });
                    }
                    lastId = response?.data?.id;
                } else {
                    response = await resendInstance.batch.send(batch);
                    if (response?.error) {
                        throw new errors.EmailError({
                            statusCode: response.error.statusCode,
                            message: response.error.message || 'Resend API error',
                            context: response.error.name,
                            code: 'RESEND_API_ERROR'
                        });
                    }
                    lastId = response?.data?.data?.[0]?.id || response?.data?.[0]?.id;
                }
            }

            metrics.metric('resend-send-mail', {value: Date.now() - startTime, statusCode: 200});
            return {id: lastId || 'resend-batch'};
        } catch (error) {
            logging.error(error);
            metrics.metric('resend-send-mail', {value: Date.now() - startTime, statusCode: error.statusCode || 500});
            return Promise.reject({error, messageData: {to: Object.keys(recipientData)}});
        }
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
