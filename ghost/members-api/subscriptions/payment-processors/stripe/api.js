const hash = data => require('crypto').createHash('sha256').update(data).digest('hex');

const isActive = x => x.active;
const isNotDeleted = x => !x.deleted;

const getPlanAttr = ({name, amount, interval, currency}, product) => ({
    nickname: name,
    amount,
    interval,
    currency,
    product: product.id,
    billing_scheme: 'per_unit'
});

const getProductAttr = ({name}) => ({name, type: 'service'});
const getCustomerAttr = ({email}) => ({email});

const getPlanHashSeed = (plan, product) => {
    return product.id + plan.interval + plan.currency + plan.amount;
};

const getProductHashSeed = () => 'Ghost Subscription';
const getCustomerHashSeed = member => member.email;

const plans = createApi('plans', isActive, getPlanAttr, getPlanHashSeed);
const products = createApi('products', isActive, getProductAttr, getProductHashSeed);
const customers = createApi('customers', isNotDeleted, getCustomerAttr, getCustomerHashSeed);

function removeSubscription(stripe, member) {
    return customers.get(stripe, member, member.email).then((customer) => {
        // CASE customer has no subscriptions
        if (!customer.subscriptions || customer.subscriptions.total_count === 0) {
            throw new Error('Cannot remove subscription');
        }

        const subscription = customer.subscriptions.data[0];

        return stripe.subscriptions.del(subscription.id);
    });
}

function getSubscription(stripe, member) {
    return customers.get(stripe, member, member.email).then((customer) => {
        // CASE customer has either none or multiple subscriptions
        if (!customer.subscriptions || customer.subscriptions.total_count !== 1) {
            return {};
        }

        const subscription = customer.subscriptions.data[0];

        // CASE subscription has multiple plans
        if (subscription.items.total_count !== 1) {
            return {};
        }

        const plan = subscription.plan;

        return {
            validUntil: subscription.current_period_end,
            plan: plan.nickname,
            status: subscription.status
        };
    }).catch(() => {
        return {};
    });
}

function createSubscription(stripe, member, metadata) {
    return customers.ensure(stripe, member, member.email).then((customer) => {
        if (customer.subscriptions && customer.subscriptions.total_count !== 0) {
            throw new Error('Customer already has a subscription');
        }

        return stripe.customers.createSource(customer.id, {
            source: metadata.stripeToken
        }).then(() => {
            return stripe.subscriptions.create({
                customer: customer.id,
                items: [{plan: metadata.plan.id}]
            });
        });
    });
}
const subscriptions = {
    create: createSubscription,
    get: getSubscription,
    remove: removeSubscription
};

module.exports = {
    plans,
    products,
    customers,
    subscriptions
};

function createGetter(resource, validResult) {
    return function get(stripe, object, idSeed) {
        const id = hash(idSeed);
        return stripe[resource].retrieve(id)
            .then((result) => {
                if (validResult(result)) {
                    return result;
                }
                return get(stripe, object, id);
            }, (err) => {
                err.id_requested = id;
                throw err;
            });
    };
}

function createCreator(resource, getAttrs) {
    return function create(stripe, id, object, ...rest) {
        return stripe[resource].create(
            Object.assign(getAttrs(object, ...rest), {id})
        );
    };
}

function createEnsurer(get, create, generateHashSeed) {
    return function ensure(stripe, object, ...rest) {
        return get(stripe, object, generateHashSeed(object, ...rest))
            .catch((err) => {
                if (err.code !== 'resource_missing') {
                    throw err;
                }
                const id = err.id_requested;
                return create(stripe, id, object, ...rest);
            });
    };
}

function createApi(resource, validResult, getAttrs, generateHashSeed) {
    const get = createGetter(resource, validResult);
    const create = createCreator(resource, getAttrs);
    const ensure = createEnsurer(get, create, generateHashSeed);

    return {
        get, create, ensure
    };
}
