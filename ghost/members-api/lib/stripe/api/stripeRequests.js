const createStripeRequest = require('./createStripeRequest');

const retrieve = createStripeRequest(function (stripe, resource, id) {
    return stripe[resource].retrieve(id);
});

const list = createStripeRequest(function (stripe, resource, options) {
    return stripe[resource].list(options);
});

const create = createStripeRequest(function (stripe, resource, object) {
    return stripe[resource].create(object);
});

const update = createStripeRequest(function (stripe, resource, id, object) {
    return stripe[resource].update(id, object);
});

const del = createStripeRequest(function (stripe, resource, id) {
    return stripe[resource].del(id);
});

module.exports = {
    retrieve,
    list,
    create,
    update,
    del
};
