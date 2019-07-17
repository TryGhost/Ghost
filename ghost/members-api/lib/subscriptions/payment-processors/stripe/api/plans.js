const createDeterministicApi = require('./createDeterministicApi');

const isActive = x => x.active;
const getPlanAttr = ({name, amount, interval, currency}, product) => ({
    nickname: name,
    amount,
    interval,
    currency,
    product: product.id,
    billing_scheme: 'per_unit'
});
const getPlanHashSeed = (plan, product) => {
    return product.id + plan.interval + plan.currency + plan.amount;
};

module.exports = createDeterministicApi(
    'plans',
    isActive,
    getPlanAttr,
    getPlanHashSeed
);
