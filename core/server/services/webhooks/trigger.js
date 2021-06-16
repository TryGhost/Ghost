const _ = require('lodash');
const debug = require('@tryghost/debug')('services:webhooks:trigger');
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const models = require('../../models');
const payload = require('./payload');

const webhooks = {
    getAll(event) {
        return models
            .Webhook
            .findAllByEvent(event, {context: {internal: true}});
    },

    update(webhook, data) {
        models
            .Webhook
            .edit({
                last_triggered_at: Date.now(),
                last_triggered_status: data.statusCode,
                last_triggered_error: data.error || null
            }, {id: webhook.id})
            .catch(() => {
                logging.warn(`Unable to update "last_triggered" for webhook: ${webhook.id}`);
            });
    },

    destroy(webhook) {
        return models
            .Webhook
            .destroy({id: webhook.id}, {context: {internal: true}})
            .catch(() => {
                logging.warn(`Unable to destroy webhook ${webhook.id}.`);
            });
    }
};

const response = {
    onSuccess(webhook) {
        return (res) => {
            webhooks.update(webhook, {
                statusCode: res.statusCode
            });
        };
    },

    onError(webhook) {
        return (err) => {
            if (err.statusCode === 410) {
                logging.info(`Webhook destroyed (410 response) for "${webhook.get('event')}" with url "${webhook.get('target_url')}".`);

                return webhooks.destroy(webhook);
            }

            webhooks.update(webhook, {
                statusCode: err.statusCode,
                error: `Request failed: ${err.code || 'unknown'}`
            });

            logging.warn(`Request to ${webhook.get('target_url') || null} failed because of: ${err.code || ''}.`);
        };
    }
};

module.exports = (event, model) => {
    webhooks.getAll(event)
        .then((hooks) => {
            debug(`${hooks.models.length} webhooks found for ${event}.`);

            _.each(hooks.models, (webhook) => {
                payload(webhook.get('event'), model)
                    .then((hookPayload) => {
                        const reqPayload = JSON.stringify(hookPayload);
                        const url = webhook.get('target_url');
                        const opts = {
                            body: reqPayload,
                            headers: {
                                'Content-Length': Buffer.byteLength(reqPayload),
                                'Content-Type': 'application/json'
                            },
                            timeout: 2 * 1000,
                            retry: 5
                        };

                        logging.info(`Triggering webhook for "${webhook.get('event')}" with url "${url}"`);

                        request(url, opts)
                            .then(response.onSuccess(webhook))
                            .catch(response.onError(webhook));
                    });
            });
        });
};
