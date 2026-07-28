const _ = require('lodash');

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

// Registers the webhook dispatch listeners on the model event system. The
// trigger is built by the composition root (index.js) and injected here so
// this module owns only the event-to-trigger wiring.
const registerListeners = ({events, trigger}) => {
    _.each(WEBHOOKS, (event) => {
        // @NOTE: The early exit makes sure the listeners are only registered once.
        //        During testing the "events" instance is kept around with all the
        //        listeners even after a reboot. This method could be removed once
        //        the common/events is refactored into something that starts from a
        //        clean instance on each reboot.
        if (events.hasRegisteredListener(event, 'processWebhookTrigger')) {
            return;
        }

        events.on(event, function processWebhookTrigger(model, options) {
            // CASE: avoid triggering webhooks when importing
            if (options && options.importing) {
                return;
            }

            trigger.trigger(event, model);
        });
    });
};

module.exports = registerListeners;
