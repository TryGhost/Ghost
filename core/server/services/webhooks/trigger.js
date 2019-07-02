const _ = require('lodash');
const debug = require('ghost-ignition').debug('services:webhooks:trigger');
const common = require('../../lib/common');
const request = require('../../../server/lib/request');
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
                common.logging.warn(`Unable to update "last_triggered" for webhook: ${webhook.id}`);
            });
    },

    destroy(webhook) {
        return models
            .Webhook
            .destroy({id: webhook.id}, {context: {internal: true}})
            .catch(() => {
                common.logging.warn(`Unable to destroy webhook ${webhook.id}.`);
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
                common.logging.info(`Webhook destroyed (410 response) for "${webhook.get('event')}" with url "${webhook.get('target_url')}".`);

                return webhooks.destroy(webhook);
            }

            webhooks.update(webhook, {
                statusCode: err.statusCode,
                error: `Request failed: ${err.code || 'unknown'}`
            });

            common.logging.warn(`Request to ${webhook.get('target_url') || null} failed because of: ${err.code || ''}.`);
        };
    }
};

module.exports = (event, model) => {
    webhooks.getAll(event)
        .then((webhooks) => {
            debug(`${webhooks.models.length} webhooks found for ${event}.`);

            _.each(webhooks.models, (webhook) => {
                payload(webhook.get('event'), model)
                    .then((payload) => {
                        const reqPayload = JSON.stringify(payload);
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

                        common.logging.info(`Trigger Webhook for  "${webhook.get('event')}" with url "${url}".`);

                        request(url, opts)
                            .then(response.onSuccess(webhook))
                            .catch(response.onError(webhook));
                    });
            });
        });
};
