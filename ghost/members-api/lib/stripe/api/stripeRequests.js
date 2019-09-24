const createStripeRequest = require('./createStripeRequest');

const retrieve = createStripeRequest(function (stripe, resource, id) {
    return stripe[resource].retrieve(id);
});

const create = createStripeRequest(function (stripe, resource, object) {
    return stripe[resource].create(object);
});

const del = createStripeRequest(function (stripe, resource, id) {
    return stripe[resource].del(id);
});

module.exports = {
    retrieve,
    create,
    del
};
