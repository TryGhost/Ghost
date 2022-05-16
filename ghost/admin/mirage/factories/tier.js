import {Factory} from 'miragejs';

export default Factory.extend({
    name(i) { return `Tier ${i}`; },
    description(i) { return `Description for tier ${i}`; },
    active: true,
    slug(i) { return `tier-${i}`;},
    type: 'paid',
    visibility: 'none',
    currency: 'usd',
    monthly_price: 500,
    yearly_price: 5000
});
