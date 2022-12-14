import EmberObject from '@ember/object';

export default EmberObject.extend({
    customer: 'customer_id',
    subscription: 'subscription_id',
    plan: 'plan_id',
    status: 'subscription status',
    name: 'plan nickname e.g. "Monthly"',
    interval: 'how often plan charges e.g "month", "year"',
    amount: 'amount in smallest denomination e.g. cents, so value for 5 dollars would be 500',
    currency: 'e.g. usd',
    last4: 'last four digits of card OR null',
    validUntil: 'epoch timestamp of when current interval ends IN SECONDS'
});
