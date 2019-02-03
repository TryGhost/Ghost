const _ = require('lodash');
const common = require('../../lib/common');
const trigger = require('./trigger');

const WEBHOOKS = [
    'subscriber.added',
    'subscriber.deleted',
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

    'post.tag.attached',
    'post.tag.detached',
    'page.tag.attached',
    'page.tag.detached'
];

const listen = () => {
    _.each(WEBHOOKS, (event) => {
        common.events.on(event, (model, options) => {
            // CASE: avoid triggering webhooks when importing
            if (options && options.importing) {
                return;
            }

            trigger(event, model);
        });
    });
};

module.exports = listen;
