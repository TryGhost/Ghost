const createStripeRequest = require('./createStripeRequest');

const createSource = createStripeRequest(function (stripe, customerId, stripeToken) {
    return stripe.customers.createSource(customerId, {
        source: stripeToken
    });
});

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
    createSource,
    retrieve,
    create,
    del
};
