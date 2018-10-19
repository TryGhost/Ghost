const _ = require('lodash');
const common = require('../../lib/common');
const models = require('../../models');
const pipeline = require('../../../server/lib/promise/pipeline');
const request = require('../../../server/lib/request');

function updateWebhookTriggerData(id, data) {
    models.Webhook.edit(data, {id: id}).catch(() => {
        common.logging.warn(`Unable to update last_triggered for webhook: ${id}`);
    });
}

function makeRequests(webhooksCollection, payload, options) {
    _.each(webhooksCollection.models, (webhook) => {
        const event = webhook.get('event');
        const targetUrl = webhook.get('target_url');
        const webhookId = webhook.get('id');
        const reqPayload = JSON.stringify(payload);

        common.logging.info('webhook.trigger', event, targetUrl);
        const triggeredAt = Date.now();
        request(targetUrl, {
            body: reqPayload,
            headers: {
                'Content-Length': Buffer.byteLength(reqPayload),
                'Content-Type': 'application/json'
            },
            timeout: 2 * 1000,
            retries: 5
        }).then((res) => {
            updateWebhookTriggerData(webhookId, {
                last_triggered_at: triggeredAt,
                last_triggered_status: res.statusCode
            });
        }).catch((err) => {
            // when a webhook responds with a 410 Gone response we should remove the hook
            if (err.statusCode === 410) {
                common.logging.info('webhook.destroy (410 response)', event, targetUrl);
                return models.Webhook.destroy({id: webhookId}, options).catch(() => {
                    common.logging.warn(`Unable to destroy webhook ${webhookId}`);
                });
            }
            let lastTriggeredError = err.statusCode ? '' : `Failed to send request to ${targetUrl}`;
            updateWebhookTriggerData(webhookId, {
                last_triggered_at: triggeredAt,
                last_triggered_status: err.statusCode,
                last_triggered_error: lastTriggeredError
            });

            common.logging.error(new common.errors.GhostError({
                err: err,
                context: {
                    id: webhookId,
                    event: event,
                    target_url: targetUrl,
                    payload: payload
                }
            }));
        });
    });
}

function trigger(event, payload, options) {
    let tasks;

    function doQuery(options) {
        return models.Webhook.findAllByEvent(event, options);
    }

    tasks = [
        doQuery,
        _.partialRight(makeRequests, payload, options)
    ];

    return pipeline(tasks, options);
}

module.exports = trigger;
