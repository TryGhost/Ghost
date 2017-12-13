var _ = require('lodash'),
    common = require('../lib/common'),
    api = require('../api'),
    modelAttrs;

// TODO: this can be removed once all events pass a .toJSON object through
modelAttrs = {
    subscriber: ['id', 'name', 'email']
};

// TODO: this works for basic models but we eventually want a full API response
// with embedded models (?include=tags) and so on
function generatePayload(event, model) {
    var modelName = event.split('.')[0],
        pluralModelName = modelName + 's',
        action = event.split('.')[1],
        payload = {},
        data;

    if (action === 'deleted') {
        data = {};
        modelAttrs[modelName].forEach(function (key) {
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
    var payload = generatePayload(event, model);

    // avoid triggering webhooks when importing
    if (options && options.importing) {
        return;
    }

    api.webhooks.trigger(event, payload, options);
}

// TODO: use a wildcard with the new event emitter or use the webhooks API to
// register listeners only for events that have webhooks
function listen() {
    common.events.on('subscriber.added', _.partial(listener, 'subscriber.added'));
    common.events.on('subscriber.deleted', _.partial(listener, 'subscriber.deleted'));
}

// Public API
module.exports = {
    listen: listen
};
