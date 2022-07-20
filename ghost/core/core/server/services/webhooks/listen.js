const _ = require('lodash');
const limitService = require('../../services/limits');
const logging = require('@tryghost/logging');
const WebhookTrigger = require('./trigger');
const models = require('../../models');
const payload = require('./payload');

// The webhook system is fundamentally built on top of our model event system
const events = require('../../lib/common/events');

const WEBHOOKS = [
    'site.changed',

    'post.added',
    'post.deleted',
    'post.edited',
    'post.published',
    'post.published.edited',
    'post.unpublished',
    'post.scheduled',
    'post.unscheduled',
    'post.rescheduled',

    'page.added',
    'page.deleted',
    'page.edited',
    'page.published',
    'page.published.edited',
    'page.unpublished',
    'page.scheduled',
    'page.unscheduled',
    'page.rescheduled',

    'tag.added',
    'tag.edited',
    'tag.deleted',

    'member.added',
    'member.deleted',
    'member.edited',

    'post.tag.attached',
    'post.tag.detached',
    'page.tag.attached',
    'page.tag.detached'
];

const listen = async () => {
    if (limitService.isLimited('customIntegrations')) {
        // NOTE: using "checkWouldGoOverLimit" instead of "checkIsOverLimit" here because flag limits don't have
        //       a concept of measuring if the limit has been surpassed
        const overLimit = await limitService.checkWouldGoOverLimit('customIntegrations');

        if (overLimit) {
            logging.info(`Skipped subscribing webhooks to events. The "customIntegrations" plan limit is enabled."`);
            return;
        }
    }

    const webhookTrigger = new WebhookTrigger({models, payload});
    _.each(WEBHOOKS, (event) => {
        events.on(event, (model, options) => {
            // CASE: avoid triggering webhooks when importing
            if (options && options.importing) {
                return;
            }

            webhookTrigger.trigger(event, model);
        });
    });
};

module.exports = listen;
