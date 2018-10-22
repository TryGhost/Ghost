const _ = require('lodash');
const common = require('../../lib/common');
const webhooks = require('./index');
let modelAttrs;

// TODO: this can be removed once all events pass a .toJSON object through
modelAttrs = {
    subscriber: ['id', 'name', 'email']
};

// TODO: this works for basic models but we eventually want a full API response
// with embedded models (?include=tags) and so on
function generatePayload(event, model) {
    const modelName = event.split('.')[0];
    const pluralModelName = modelName + 's';
    const action = event.split('.')[1];
    const payload = {};
    let data;

    if (action === 'deleted') {
        data = {};
        modelAttrs[modelName].forEach((key) => {
            if (model._previousAttributes[key] !== undefined) {
                data[key] = model._previousAttributes[key];
            }
        });
    } else {
        data = model.toJSON();
    }

    payload[pluralModelName] = [data];

    return payload;
}

function listener(event, model, options) {
    let payload = {};
    if (model) {
        payload = generatePayload(event, model);
    }
    payload.event = event;

    // avoid triggering webhooks when importing
    if (options && options.importing) {
        return;
    }

    webhooks.trigger(event, payload, options);
}

// TODO: use a wildcard with the new event emitter or use the webhooks API to
// register listeners only for events that have webhooks
function listen() {
    common.events.on('subscriber.added', _.partial(listener, 'subscriber.added'));
    common.events.on('subscriber.deleted', _.partial(listener, 'subscriber.deleted'));
    common.events.on('site.changed', _.partial(listener, 'site.changed'));
}

// Public API
module.exports = listen;
