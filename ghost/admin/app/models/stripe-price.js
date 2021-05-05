import EmberObject from '@ember/object';

export default EmberObject.extend({
    id: 'ID in Ghost',
    stripe_price_id: 'ID of the Stripe Price',
    stripe_product_id: 'ID of the Stripe Product the Stripe Price is associated with',
    nickname: 'price nickname e.g. "Monthly"',
    description: 'price description e.g. "Full Access"',
    amount: 'amount in smallest denomination e.g. cents, so value for 5 dollars would be 500',
    currency: 'e.g. usd',
    type: 'either one_time or recurring',
    interval: 'will be `null` if type is one_time, otherwise how often price charges e.g "month", "year"'
});
