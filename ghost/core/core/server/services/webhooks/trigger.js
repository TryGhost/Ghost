const debug = require('@tryghost/debug')('services:webhooks:trigger');
const logging = require('@tryghost/logging');
const ghostVersion = require('@tryghost/version');
const crypto = require('crypto');

class WebhookTrigger {
    /**
     *
     * @param {Object} options
     * @param {Object} options.models - Ghost models
     * @param {Function} options.payload - Function to generate payload
     * @param {Object} [options.request] - HTTP request handling library
     */
    constructor({models, payload, request}){
        this.models = models;
        this.payload = payload;

        this.request = request ?? require('@tryghost/request');
    }

    getAll(event) {
        return this.models
            .Webhook
            .findAllByEvent(event, {context: {internal: true}});
    }

    update(webhook, data) {
        this.models
            .Webhook
            .edit({
                last_triggered_at: Date.now(),
                last_triggered_status: data.statusCode,
                last_triggered_error: data.error || null
            }, {id: webhook.id, autoRefresh: false})
            .catch(() => {
                logging.warn(`Unable to update "last_triggered" for webhook: ${webhook.id}`);
            });
    }

    destroy(webhook) {
        return this.models
            .Webhook
            .destroy({id: webhook.id}, {context: {internal: true}})
            .catch(() => {
                logging.warn(`Unable to destroy webhook ${webhook.id}.`);
            });
    }

    onSuccess(webhook) {
        return (res) => {
            this.update(webhook, {
                statusCode: res.statusCode
            });
        };
    }

    onError(webhook) {
        return (err) => {
            if (err.statusCode === 410) {
                logging.info(`Webhook destroyed (410 response) for "${webhook.get('event')}" with url "${webhook.get('target_url')}".`);

                return this.destroy(webhook);
            }

            this.update(webhook, {
                statusCode: err.statusCode,
                error: `Request failed: ${err.code || 'unknown'}`
            });

            logging.warn(`Request to ${webhook.get('target_url') || null} failed because of: ${err.code || ''}.`);
        };
    }

    async trigger(event, model) {
        const response = {
            onSuccess: this.onSuccess.bind(this),
            onError: this.onError.bind(this)
        };

        const hooks = await this.getAll(event);

        debug(`${hooks.models.length} webhooks found for ${event}.`);

        for (const webhook of hooks.models) {
            const hookPayload = await this.payload(webhook.get('event'), model);

            const reqPayload = JSON.stringify(hookPayload);
            const url = webhook.get('target_url');
            const secret = webhook.get('secret') || '';

            const headers = {
                'Content-Length': Buffer.byteLength(reqPayload),
                'Content-Type': 'application/json',
                'Content-Version': `v${ghostVersion.safe}`
            };

            if (secret !== '') {
                headers['X-Ghost-Signature'] = `sha256=${crypto.createHmac('sha256', secret).update(reqPayload).digest('hex')}, t=${Date.now()}`;
            }

            const opts = {
                body: reqPayload,
                headers,
                timeout: 2 * 1000,
                retry: process.env.NODE_ENV?.startsWith('test') ? 0 : 5
            };

            logging.info(`Triggering webhook for "${webhook.get('event')}" with url "${url}"`);

            await this.request(url, opts)
                .then(response.onSuccess(webhook))
                .catch(response.onError(webhook));
        }
    }
}

module.exports = WebhookTrigger;
