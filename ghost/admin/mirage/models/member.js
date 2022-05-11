import {Model, hasMany} from 'miragejs';

export default Model.extend({
    labels: hasMany(),
    emailRecipients: hasMany(),
    tiers: hasMany(),
    newsletters: hasMany(),
    subscriptions: hasMany()
});
