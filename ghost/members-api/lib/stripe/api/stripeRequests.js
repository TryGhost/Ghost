const debug = require('ghost-ignition').debug('stripe-request');
const createStripeRequest = require('./createStripeRequest');

const retrieve = createStripeRequest(function (stripe, resource, id, options = {}) {
    debug(`retrieve ${resource} ${id}`);
    return stripe[resource].retrieve(id, options);
});

const list = createStripeRequest(function (stripe, resource, options) {
    debug(`list ${resource} ${JSON.stringify(options)}`);
    return stripe[resource].list(options);
});

const create = createStripeRequest(function (stripe, resource, object) {
    debug(`create ${resource} ${JSON.stringify(object)}`);
    return stripe[resource].create(object);
});

const update = createStripeRequest(function (stripe, resource, id, object) {
    debug(`update ${resource} ${id} ${JSON.stringify(object)}`);
    return stripe[resource].update(id, object);
});

const del = createStripeRequest(function (stripe, resource, id) {
    debug(`delete ${resource} ${id}`);
    return stripe[resource].del(id);
});

module.exports = {
    retrieve,
    list,
    create,
    update,
    del
};
